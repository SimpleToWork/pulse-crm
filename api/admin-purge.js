// TEMPORARY admin purge — soft-deletes all live records in the given collections.
// Key-protected (Bearer CLAY_INGEST_KEY) and requires body {"confirm":"WIPE"}.
// Soft delete only: sets deletedAt, so records are hidden from the app but
// recoverable. Remove this file after use.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const ALLOWED = ["contacts", "companies", "deals", "tasks", "tickets", "activities", "templates", "quotes", "products"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.CLAY_INGEST_KEY;
  const auth = req.headers["authorization"] || "";
  const incoming = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!key || incoming !== key) return res.status(401).json({ error: "Invalid or missing API key." });

  const { collections, confirm } = req.body || {};
  if (confirm !== "WIPE") return res.status(400).json({ error: 'body confirm:"WIPE" required' });
  const colls = (Array.isArray(collections) && collections.length ? collections : []).filter((c) => ALLOWED.includes(c));
  if (!colls.length) return res.status(400).json({ error: `collections must be a subset of: ${ALLOWED.join(", ")}` });

  let db;
  try { db = initAdmin(); } catch (e) { return res.status(500).json({ error: "Firebase init failed: " + e.message }); }

  const now = Date.now();
  const out = {};
  for (const coll of colls) {
    let total = 0;
    // Records created by the app carry deletedAt:null; setting it non-null
    // removes them from this query, so the loop terminates.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snap = await db.collection(coll).where("deletedAt", "==", null).limit(400).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { deletedAt: now }));
      await batch.commit();
      total += snap.size;
      if (snap.size < 400) break;
    }
    out[coll] = total;
  }
  return res.status(200).json({ ok: true, softDeleted: out });
}
