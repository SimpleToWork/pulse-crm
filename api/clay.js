// PulseCRM — native Clay ingestion API.
//
// Clay is push-only (no public "read my table" API), so the native integration
// is Clay's *HTTP API action* calling this endpoint per enriched row. This is a
// first-class, authenticated ingestion API (vs the legacy /api/clay-import batch
// webhook): Bearer-key auth, single-row OR batch, upsert with dedupe.
//
// Clay HTTP API action setup:
//   Method:  POST
//   URL:     https://merchantsbi-crm.com/api/clay
//   Headers: Authorization: Bearer <CLAY_INGEST_KEY>
//   Body:    the row's fields as JSON (send one row per call), or {rows:[...]}
//
// Env vars (Vercel → project → Settings → Environment Variables):
//   CLAY_INGEST_KEY        — the bearer token Clay must send (you choose it)
//   FIREBASE_PROJECT_ID    — pulse-crm-60582
//   FIREBASE_CLIENT_EMAIL  — service account email
//   FIREBASE_PRIVATE_KEY   — service account private key (newlines as \n)

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Normalize a service-account private key pasted into an env var: strip any
// wrapping quotes and convert escaped \n (single or double) into real newlines.
function normalizeKey(raw) {
  let k = (raw || "").trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
}

function initAdmin() {
  if (getApps().length) return getFirestore();
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizeKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });
  return getFirestore();
}

const str = (v) => (v == null ? "" : String(v).trim());

// Pull the first non-empty value across a set of aliases (case/spacing tolerant).
function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.replace(/_/g, " ")] ?? null;
    if (v != null && str(v) !== "") return str(v);
  }
  return "";
}

// Extract a bare domain from a website URL or email.
function domainOf(raw) {
  const s = str(raw).toLowerCase();
  if (!s) return "";
  if (s.includes("@")) return s.split("@")[1] || "";
  try {
    return new URL(s.includes("://") ? s : "https://" + s).hostname.replace(/^www\./, "");
  } catch {
    return s.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function normalizeStatus(raw) {
  const s = str(raw).toLowerCase();
  if (!s) return "Lead";
  if (s.includes("customer") || s.includes("client")) return "Customer";
  if (s.includes("qualified")) return "Qualified";
  if (s.includes("churn")) return "Churned";
  if (s.includes("inactive") || s.includes("cold")) return "Inactive";
  return "Lead";
}

function parseTags(raw) {
  return str(raw).split(/[,;|]+/).map((t) => t.trim()).filter(Boolean);
}

function mapRow(row) {
  const fullName = pick(row, "full_name", "name", "Name", "Full Name");
  const firstName = pick(row, "first_name", "firstName", "First Name") || fullName.split(" ")[0] || "";
  const lastName = pick(row, "last_name", "lastName", "Last Name") || fullName.split(" ").slice(1).join(" ") || "";
  const email = pick(row, "email", "Email", "work_email", "Work Email", "personal_email");
  const website = pick(row, "company_website", "Company Website", "website", "Website", "company_domain", "domain", "Domain");
  return {
    contact: {
      firstName, lastName,
      email: email || null,
      phone: pick(row, "phone", "Phone", "mobile", "phone_number") || null,
      title: pick(row, "title", "Title", "job_title", "Job Title", "role") || null,
      linkedinUrl: pick(row, "linkedin_url", "LinkedIn URL", "linkedin", "LinkedIn") || null,
      status: normalizeStatus(pick(row, "status", "Status", "lead_status")),
      source: pick(row, "source", "Source", "lead_source") || "Clay",
      owner: pick(row, "owner", "Owner", "assigned_to") || null,
      tags: parseTags(pick(row, "tags", "Tags", "labels", "Labels")),
      notes: pick(row, "notes", "Notes", "summary", "bio") || null,
      clayRowId: pick(row, "id", "clay_id", "row_id") || null,
    },
    company: {
      name: pick(row, "company_name", "Company Name", "company", "Company", "organization", "Organization"),
      website: website || null,
      domain: domainOf(website || email),
      industry: pick(row, "industry", "Industry", "company_industry") || null,
    },
  };
}

// First non-deleted doc from a single-field equality query (avoids needing a
// composite index for the extra deletedAt==null filter).
async function findLive(coll, field, value) {
  if (!value) return null;
  const snap = await coll.where(field, "==", value).limit(5).get();
  return snap.docs.find((d) => !d.get("deletedAt")) || null;
}

// Upsert a company matched by domain (falls back to exact name).
async function upsertCompany(db, co) {
  if (!co.name && !co.domain) return null;
  const coll = db.collection("companies");
  let existing = (co.domain && (await findLive(coll, "domain", co.domain))) || null;
  if (!existing && co.name) existing = await findLive(coll, "name", co.name);
  const now = Date.now();
  if (existing) {
    const patch = { updatedAt: now };
    if (co.domain && !existing.get("domain")) patch.domain = co.domain;
    if (co.website && !existing.get("website")) patch.website = co.website;
    if (co.industry && !existing.get("industry")) patch.industry = co.industry;
    await existing.ref.update(patch);
    return existing.id;
  }
  const ref = await coll.add({
    name: co.name || co.domain, domain: co.domain || null, website: co.website || null,
    industry: co.industry || null, createdAt: now, updatedAt: now, createdBy: "clay", deletedAt: null,
  });
  return ref.id;
}

// Upsert a contact matched by email (falls back to Clay row id).
async function upsertContact(db, c, companyId) {
  if (!c.firstName && !c.lastName && !c.email) return { skipped: true };
  const coll = db.collection("contacts");
  let existing = (c.email && (await findLive(coll, "email", c.email))) || null;
  if (!existing && c.clayRowId) existing = await findLive(coll, "_clayRowId", c.clayRowId);
  const now = Date.now();
  const payload = {
    firstName: c.firstName || "", lastName: c.lastName || "", email: c.email || null,
    phone: c.phone || null, title: c.title || null, linkedinUrl: c.linkedinUrl || null,
    status: c.status || "Lead", source: c.source || "Clay", owner: c.owner || null,
    tags: c.tags || [], notes: c.notes || null, _clayRowId: c.clayRowId || null,
    updatedAt: now,
  };
  if (companyId) payload.companyId = companyId;
  if (existing) { await existing.ref.update(payload); return { updated: true, id: existing.id }; }
  const ref = await coll.add({ ...payload, companyId: companyId || null, createdAt: now, createdBy: "clay", deletedAt: null, lastContacted: null });
  return { created: true, id: ref.id };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Bearer-key auth
  const key = process.env.CLAY_INGEST_KEY;
  if (!key) return res.status(503).json({ error: "Ingestion not configured (set CLAY_INGEST_KEY)." });
  const auth = req.headers["authorization"] || "";
  const incoming = auth.startsWith("Bearer ") ? auth.slice(7) : (req.headers["x-api-key"] || "");
  if (incoming !== key) return res.status(401).json({ error: "Invalid or missing API key." });

  const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter((k) => !process.env[k]);
  if (missing.length) return res.status(503).json({ error: `Missing env vars: ${missing.join(", ")}` });

  // TEMP diagnostic (no secret values leaked) — POST {"diag":true}
  if (req.body && req.body.diag === true) {
    const pk = normalizeKey(process.env.FIREBASE_PRIVATE_KEY);
    const email = process.env.FIREBASE_CLIENT_EMAIL || "";
    return res.status(200).json({
      diag: true,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      clientEmailMasked: email.slice(0, 6) + "…@" + (email.split("@")[1] || "?"),
      emailProjectMatches: email.includes(process.env.FIREBASE_PROJECT_ID || "\0"),
      keyLen: pk.length,
      keyBeginsOK: pk.startsWith("-----BEGIN PRIVATE KEY-----"),
      keyEndsOK: pk.trimEnd().endsWith("-----END PRIVATE KEY-----"),
      keyRealNewlines: (pk.match(/\n/g) || []).length,
      keyHasLiteralBackslashN: /\\n/.test(pk),
    });
  }

  // Accept a single row object, an array, or {rows:[...]}
  const body = req.body || {};
  const rows = Array.isArray(body) ? body : Array.isArray(body.rows) ? body.rows : [body];
  if (!rows.length || (rows.length === 1 && Object.keys(rows[0]).length === 0)) {
    return res.status(400).json({ error: "No row data. Send the row's fields as JSON, or {rows:[...]}." });
  }

  let db;
  try { db = initAdmin(); } catch (e) { return res.status(500).json({ error: "Firebase init failed: " + e.message }); }

  const summary = { received: rows.length, created: 0, updated: 0, skipped: 0, errors: 0 };
  const results = [];
  for (const row of rows) {
    try {
      const { contact, company } = mapRow(row);
      const companyId = await upsertCompany(db, company);
      const r = await upsertContact(db, contact, companyId);
      if (r.skipped) summary.skipped++;
      else if (r.created) summary.created++;
      else if (r.updated) summary.updated++;
      results.push({ ...r, companyId });
    } catch (e) {
      summary.errors++;
      results.push({ error: e.message });
    }
  }
  return res.status(200).json({ ok: true, ...summary, results });
}
