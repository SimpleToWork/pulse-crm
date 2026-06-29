// Clay ETL Connector — webhook endpoint
// Clay calls POST /api/clay-import with a JSON payload:
//   { rows: [...], table_name: "...", secret: "..." }
//
// Each row is a flat object with field names from the Clay table.
// Supported field mappings are documented in the README and the Settings UI.
//
// Environment variables required:
//   CLAY_WEBHOOK_SECRET   — shared secret to verify Clay sends (set in Clay + Vercel env)
//   FIREBASE_PROJECT_ID   — e.g. pulse-crm-60582
//   FIREBASE_CLIENT_EMAIL — service account email
//   FIREBASE_PRIVATE_KEY  — service account private key (newlines as \n)

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return getFirestore();
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
  return getFirestore();
}

// Map a Clay row to a PulseCRM contact record.
// Clay field names vary by table — we try a generous set of aliases.
function mapContact(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.replace(/_/g, " ")] ?? null;
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return null;
  };

  const firstName =
    get("first_name", "firstName", "First Name", "firstname") ||
    (get("full_name", "name", "Name") || "").split(" ")[0] ||
    "";
  const rawLast = get("last_name", "lastName", "Last Name", "lastname");
  const lastName =
    rawLast ||
    (get("full_name", "name", "Name") || "").split(" ").slice(1).join(" ") ||
    "";

  return {
    firstName,
    lastName,
    email: get("email", "Email", "work_email", "Work Email", "personal_email"),
    phone: get("phone", "Phone", "mobile", "Mobile", "phone_number"),
    title: get("title", "Title", "job_title", "Job Title", "role", "Role"),
    linkedinUrl: get("linkedin_url", "LinkedIn URL", "linkedin", "LinkedIn"),
    status: normalizeStatus(get("status", "Status", "lead_status", "Lead Status")),
    source: get("source", "Source", "lead_source", "Lead Source") || "Clay",
    owner: get("owner", "Owner", "assigned_to", "Assigned To"),
    tags: parseTags(get("tags", "Tags", "label", "Label", "labels", "Labels")),
    notes: get("notes", "Notes", "summary", "Summary", "bio", "Bio"),
    _companyName: get(
      "company_name",
      "Company Name",
      "company",
      "Company",
      "organization",
      "Organization"
    ),
    _companyWebsite: get(
      "company_website",
      "Company Website",
      "website",
      "Website",
      "domain",
      "Domain"
    ),
    _companyIndustry: get("industry", "Industry", "company_industry", "Company Industry"),
    _clayRowId: get("id", "clay_id", "row_id") || null,
  };
}

function normalizeStatus(raw) {
  if (!raw) return "Lead";
  const s = raw.toLowerCase();
  if (s.includes("customer") || s.includes("client")) return "Customer";
  if (s.includes("qualified")) return "Qualified";
  if (s.includes("churn")) return "Churned";
  if (s.includes("inactive") || s.includes("cold")) return "Inactive";
  return "Lead";
}

function parseTags(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

async function upsertCompany(db, name, extra = {}) {
  if (!name) return null;
  const coll = db.collection("companies");
  const snap = await coll
    .where("name", "==", name)
    .where("deletedAt", "==", null)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  const ref = await coll.add({
    name,
    website: extra.website || null,
    industry: extra.industry || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: "clay-etl",
    deletedAt: null,
  });
  return ref.id;
}

async function upsertContact(db, data) {
  if (!data.firstName && !data.lastName && !data.email) return { skipped: true };
  const coll = db.collection("contacts");

  // Dedup by email (if present) or clay row id
  let existing = null;
  if (data.email) {
    const snap = await coll
      .where("email", "==", data.email)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();
    if (!snap.empty) existing = snap.docs[0];
  }
  if (!existing && data._clayRowId) {
    const snap = await coll
      .where("_clayRowId", "==", data._clayRowId)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();
    if (!snap.empty) existing = snap.docs[0];
  }

  const payload = {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email || null,
    phone: data.phone || null,
    title: data.title || null,
    linkedinUrl: data.linkedinUrl || null,
    status: data.status || "Lead",
    source: data.source || "Clay",
    owner: data.owner || null,
    tags: data.tags || [],
    notes: data.notes || null,
    companyId: data.companyId || null,
    _clayRowId: data._clayRowId || null,
    updatedAt: Date.now(),
  };

  if (existing) {
    await existing.ref.update(payload);
    return { updated: true, id: existing.id };
  }
  const ref = await coll.add({
    ...payload,
    createdAt: Date.now(),
    createdBy: "clay-etl",
    deletedAt: null,
    lastContacted: null,
  });
  return { created: true, id: ref.id };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-clay-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Secret verification (optional but recommended — set CLAY_WEBHOOK_SECRET in Vercel env)
  const secret = process.env.CLAY_WEBHOOK_SECRET;
  if (secret) {
    const incoming =
      req.headers["x-clay-secret"] || req.body?.secret || "";
    if (incoming !== secret) {
      return res.status(401).json({ error: "Invalid webhook secret" });
    }
  }

  const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    return res
      .status(503)
      .json({ error: `Missing env vars: ${missing.join(", ")}` });
  }

  const { rows } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows[] array required" });
  }

  let db;
  try {
    db = initAdmin();
  } catch (e) {
    return res.status(500).json({ error: "Firebase init failed: " + e.message });
  }

  const results = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      const mapped = mapContact(row);

      // Resolve or create company first
      let companyId = null;
      if (mapped._companyName) {
        companyId = await upsertCompany(db, mapped._companyName, {
          website: mapped._companyWebsite,
          industry: mapped._companyIndustry,
        });
      }

      const result = await upsertContact(db, { ...mapped, companyId });
      if (result.skipped) results.skipped++;
      else if (result.created) results.created++;
      else if (result.updated) results.updated++;
    } catch (e) {
      results.errors++;
    }
  }

  // Log a summary activity record
  try {
    const total = results.created + results.updated;
    if (total > 0) {
      await db.collection("activities").add({
        type: "contact",
        text: `Clay ETL: imported ${total} record${total !== 1 ? "s" : ""} (${results.created} new, ${results.updated} updated)`,
        relatedType: null,
        relatedId: null,
        actor: "clay-etl",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: "clay-etl",
        deletedAt: null,
      });
    }
  } catch (_) {}

  res.status(200).json({
    ok: true,
    received: rows.length,
    ...results,
  });
}
