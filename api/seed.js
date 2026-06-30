// PulseCRM — one-shot Firestore seed endpoint.
//
// Protected by SEED_SECRET env var. Call once after setting up Firebase:
//
//   curl -X POST https://pulse-crm-blush.vercel.app/api/seed \
//        -H "Content-Type: application/json" \
//        -d '{"secret":"YOUR_SEED_SECRET","force":false}'
//
// Required Vercel env vars:
//   FIREBASE_SERVICE_ACCOUNT  — full JSON of your Firebase service account key (paste as-is)
//   SEED_SECRET               — any string you choose; guards this endpoint
//
// Idempotent by default (skips if >=75 companies already exist). Pass "force":true to re-seed.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── constants (must match index.html) ──────────────────────────────────────
const STAGES = ["New Lead","Contacted","Qualified","Proposal Sent","Negotiation","Won","Lost"];
const STAGE_PROB = {"New Lead":10,"Contacted":25,"Qualified":45,"Proposal Sent":65,"Negotiation":80,"Won":100,"Lost":0};
const PRIORITIES = ["low","medium","high"];
const SOURCES = ["Website","Referral","Cold outreach","Event","LinkedIn","Inbound"];
const CONTACT_STATUSES = ["Lead","Lead","Lead","Qualified","Qualified","Customer","Customer","Churned"];

const FIRST_NAMES = [
  "Sarah","James","Maria","David","Priya","Tom","Lena","Marcus","Nina","Carlos",
  "Emma","Raj","Olivia","Ben","Zoe","Liam","Ava","Noah","Isabella","Ethan",
  "Sophia","Mason","Mia","Logan","Charlotte","Lucas","Amelia","Oliver","Harper","Elijah",
  "Evelyn","Aiden","Abigail","Jackson","Emily","Sebastian","Elizabeth","Mateo","Mila","Jack",
  "Ella","Owen","Luna","Samuel","Camila","Daniel","Sofia","Henry","Aria","Alexander",
  "Scarlett","Michael","Penelope","William","Riley","Matthew","Layla","Anthony","Zoey","Mark",
  "Nora","Patrick","Lily","Christopher","Eleanor","Joshua","Hannah","Andrew","Lillian","Ryan",
  "Addison","Nathan","Aubrey","Justin","Ellie","Brian","Stella","Kevin","Natalie","George",
  "Zoe","Tyler","Victoria","Brandon","Claire","Adam","Bella","Eric","Aurora","Jordan",
  "Ariana","Derek","Savannah","Alan","Audrey","Sean","Brooklyn","Jesse","Leah","Victor"
];
const LAST_NAMES = [
  "Chen","Okafor","Rossi","Park","Nguyen","Bauer","Klein","Reyes","Ito","Mendez",
  "Walsh","Patel","Brooks","Hayes","Stein","Ford","Morrison","Campbell","Rivera","Carter",
  "Mitchell","Robinson","Lewis","Anderson","Thompson","Jackson","White","Harris","Martin","Garcia",
  "Martinez","Davis","Wilson","Johnson","Taylor","Thomas","Jones","Brown","Lee","Williams",
  "Clark","Rodriguez","Lewis","Walker","Hall","Allen","Young","King","Wright","Scott",
  "Torres","Flores","Green","Adams","Nelson","Baker","Hill","Ramirez","Sanchez","Murphy",
  "Cox","Cooper","Richardson","Howard","Ward","Collins","Stewart","Morales","Rogers","Reed",
  "Bailey","Bell","Simmons","Foster","Gonzales","Bryant","Patterson","Hughes","Griffin","Diaz",
  "Watkins","Jenkins","Perry","Long","Butler","Sanders","Price","Barnes","Henderson","Ross",
  "Coleman","Powell","Wood","James","Ruiz","Watson","Brooks","Kelly","Murray","Fisher"
];
const JOB_TITLES = [
  "VP Sales","Operations Lead","CEO","CTO","Procurement Manager","Marketing Director",
  "Founder","Head of IT","CFO","COO","Director of Business Development","Account Executive",
  "Sales Manager","General Manager","President","Chief Revenue Officer","VP of Operations",
  "Head of Partnerships","Director of Finance","Chief Marketing Officer","Senior Sales Rep",
  "Regional Sales Manager","Enterprise Account Manager","Business Development Manager",
  "Director of Strategy","Managing Director","Partner","Principal","Head of Sales",
  "VP of Product","Head of Customer Success","Director of Procurement"
];
const INDUSTRIES = [
  "SaaS","Logistics","Retail","Healthcare","Marketing","Finance","Manufacturing",
  "Real Estate","Legal","Education","Construction","Food & Beverage","Automotive",
  "Energy","Telecommunications","Insurance","Consulting","Technology","Media","Non-profit"
];
const COMPANY_SIZES = ["1-10","11-50","51-200","201-500","500+"];
const CITIES = [
  "New York, NY","Los Angeles, CA","Chicago, IL","Houston, TX","Phoenix, AZ",
  "Philadelphia, PA","San Antonio, TX","San Diego, CA","Dallas, TX","San Jose, CA",
  "Austin, TX","Jacksonville, FL","Fort Worth, TX","Columbus, OH","Charlotte, NC",
  "San Francisco, CA","Indianapolis, IN","Seattle, WA","Denver, CO","Boston, MA",
  "Nashville, TN","Oklahoma City, OK","El Paso, TX","Las Vegas, NV","Louisville, KY",
  "Memphis, TN","Portland, OR","Baltimore, MD","Milwaukee, WI","Albuquerque, NM",
  "Miami, FL","Minneapolis, MN","Atlanta, GA","Detroit, MI","Raleigh, NC",
  "Kansas City, MO","Pittsburgh, PA","Sacramento, CA","Salt Lake City, UT","Tampa, FL"
];
const DEAL_TYPES = [
  "Annual plan","Pilot program","Enterprise upgrade","Renewal","Expansion",
  "New logo","Add-on seats","Platform migration","Strategic partnership","SLA agreement",
  "Professional services","Implementation package","Training bundle","Support contract",
  "Custom integration","Data migration","Consulting retainer","Managed services",
  "Technology assessment","Digital transformation"
];
const REPS = ["Ricky Schweky","Joe Harari","Gabe Lesser","Nathan Mosseri"];
const DEAL_NOTE_TEMPLATES = [
  "Champion is {contact}. Strong internal support, budget confirmed.",
  "Decision expected by end of quarter. Legal review in progress.",
  "Pilot phase completed successfully. Moving to full deployment discussion.",
  "Competitor involved: evaluating vs. alternative solution.",
  "Referred by existing customer. High-intent inbound.",
  "Long sales cycle — multiple stakeholders need to align.",
  "Executive sponsor confirmed. Procurement process initiated.",
  "Technical evaluation passed. Awaiting budget approval.",
  "Contract redlines received. Legal reviewing.",
  "Strong champion but budget cycle misaligned — revisiting next quarter.",
  "",""
];
const PREFIXES = [
  "Acme","Apex","Atlas","Bolt","Bridge","Cascade","Cedar","Crest","Crown","Delta",
  "Echo","Ember","Empire","Envoy","Falcon","Fern","Forge","Frost","Granite","Harbor",
  "Haven","Helix","Horizon","Iris","Jade","Jasper","Keystone","Kite","Lark","Lumen",
  "Lynx","Maple","Meridian","Mesa","Metro","Mira","Mosaic","Nova","Nexus","Obsidian",
  "Onyx","Orbit","Pacific","Peak","Pillar","Pine","Pinnacle","Pixel","Pivot","Prism",
  "Quill","Quorum","Ridge","Ripple","Riven","Rocket","Root","Route","Sage","Sequoia",
  "Shield","Shore","Signal","Slate","Solaris","Spark","Sphere","Spiral","Summit","Swift",
  "Timber","Titan","Tundra","Uplift","Vantage"
];
const SUFFIXES = [
  "Solutions","Technologies","Group","Partners","Ventures","Industries","Labs","Systems",
  "Dynamics","Services","Consulting","Analytics","Digital","Innovations","Networks"
];

// ─── deterministic pseudo-random ────────────────────────────────────────────
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}
const rng = seededRand(20240628);
const r = () => rng();
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const between = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));

const DAY = 864e5;
const getNow = () => Date.now();

function companyDomain(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) + ".com";
}
function emailFor(first, last, domain) {
  const v = [`${first}.${last}@${domain}`, `${first[0]}${last}@${domain}`, `${first}@${domain}`];
  return v[Math.floor(r() * v.length)].toLowerCase();
}
function phone() {
  return `(${between(200,999)}) ${between(200,999)}-${between(1000,9999)}`;
}

function buildCompanies(now) {
  return PREFIXES.slice(0, 75).map((prefix, i) => {
    const name = `${prefix} ${SUFFIXES[i % SUFFIXES.length]}`;
    const domain = companyDomain(name);
    const created = now - between(90, 730) * DAY;
    return {
      name,
      industry: INDUSTRIES[i % INDUSTRIES.length],
      size: COMPANY_SIZES[i % COMPANY_SIZES.length],
      location: CITIES[i % CITIES.length],
      website: `https://www.${domain}`,
      owner: REPS[i % REPS.length],
      notes: i % 7 === 0 ? "Key strategic account — priority relationship." : "",
      createdAt: created,
      updatedAt: created + between(0, 30) * DAY,
      deletedAt: null,
    };
  });
}

function buildContacts(companies, now) {
  return Array.from({ length: 500 }, (_, i) => {
    const company = companies[i % companies.length];
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const domain = companyDomain(company.name);
    const created = now - between(10, 540) * DAY;
    return {
      firstName,
      lastName,
      email: emailFor(firstName, lastName, domain),
      phone: phone(),
      title: JOB_TITLES[i % JOB_TITLES.length],
      companyId: company._id,
      status: CONTACT_STATUSES[i % CONTACT_STATUSES.length],
      source: SOURCES[i % SOURCES.length],
      owner: REPS[i % REPS.length],
      tags: i % 5 === 0 ? ["priority"] : i % 7 === 0 ? ["newsletter"] : i % 11 === 0 ? ["vip","priority"] : [],
      lastContacted: i % 8 === 0 ? null : now - between(0, 60) * DAY,
      notes: i % 9 === 0 ? "Met at trade show. Interested in enterprise tier." : i % 13 === 0 ? "Referred by existing customer." : "",
      createdAt: created,
      updatedAt: created + between(0, 14) * DAY,
      deletedAt: null,
      createdBy: REPS[i % REPS.length],
    };
  });
}

function buildDeals(companies, contacts, now) {
  const stageCounts = {
    "New Lead":10,"Contacted":12,"Qualified":13,
    "Proposal Sent":12,"Negotiation":8,"Won":18,"Lost":17
  };
  const baseValues = [5000,8500,12000,15000,24000,32000,45000,60000,75000,90000,120000,18000,22000,38000,50000];
  const deals = [];
  let idx = 0;
  for (const [stage, count] of Object.entries(stageCounts)) {
    const isClosed = stage === "Won" || stage === "Lost";
    for (let n = 0; n < count; n++, idx++) {
      const company = companies[(idx * 3) % companies.length];
      const contact = contacts[(idx * 7) % contacts.length];
      let expectedClose, closedAt, created;
      if (isClosed) {
        closedAt = now - between(7, 365) * DAY;
        expectedClose = closedAt - between(0, 30) * DAY;
        created = closedAt - between(30, 180) * DAY;
      } else {
        closedAt = null;
        expectedClose = now + between(7, 120) * DAY;
        created = now - between(5, 90) * DAY;
      }
      const noteTemplate = DEAL_NOTE_TEMPLATES[idx % DEAL_NOTE_TEMPLATES.length];
      deals.push({
        name: `${company.name} — ${DEAL_TYPES[idx % DEAL_TYPES.length]}`,
        companyId: company._id,
        contactId: contact._id,
        value: baseValues[idx % baseValues.length] + between(0, 4999),
        stage,
        probability: STAGE_PROB[stage],
        priority: PRIORITIES[idx % PRIORITIES.length],
        source: SOURCES[idx % SOURCES.length],
        owner: REPS[idx % REPS.length],
        notes: noteTemplate.replace("{contact}", `${contact.firstName} ${contact.lastName}`),
        expectedClose,
        closedAt,
        order: idx,
        createdAt: created,
        updatedAt: created + between(0, 20) * DAY,
        deletedAt: null,
        createdBy: REPS[idx % REPS.length],
      });
    }
  }
  return deals;
}

async function batchWrite(db, ops) {
  const chunks = [];
  for (let i = 0; i < ops.length; i += 499) chunks.push(ops.slice(i, i + 499));
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }
}

function initFirebase() {
  if (getApps().length) return getFirestore();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var not set");
  const serviceAccount = typeof raw === "string" ? JSON.parse(raw) : raw;
  initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const secret = process.env.SEED_SECRET;
  if (!secret) return res.status(503).json({ error: "SEED_SECRET env var not configured" });

  const { secret: provided, force = false, caller = "api/seed" } = req.body || {};
  if (provided !== secret) return res.status(401).json({ error: "Invalid secret" });

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT env var not set" });
  }

  let db;
  try {
    db = initFirebase();
  } catch (e) {
    return res.status(500).json({ error: `Firebase init failed: ${e.message}` });
  }

  // Guard: skip if already seeded
  if (!force) {
    const snap = await db.collection("companies").limit(80).get();
    if (snap.size >= 75) {
      return res.status(200).json({
        skipped: true,
        message: `Already seeded (${snap.size} companies). POST with "force":true to re-seed.`
      });
    }
  }

  const now = getNow();

  // Seed-run attribution — stamped on every generated record for traceability.
  // seedRunId ties all records from this invocation together; seedSource identifies
  // the origin path (api/seed vs ui/reseed); caller is the triggering actor.
  const seedRunId = `${now}-api`;
  const seedMeta = {
    seedSource: "api/seed",
    seedRunId,
    seededAt: now,
    seededBy: caller,
  };

  // Build companies
  const companyDocs = buildCompanies(now);
  const companyRefs = companyDocs.map(() => db.collection("companies").doc());
  companyDocs.forEach((doc, i) => { doc._id = companyRefs[i].id; });
  await batchWrite(db, companyRefs.map((ref, i) => {
    const { _id, ...data } = companyDocs[i]; return { ref, data: { ...data, ...seedMeta } };
  }));

  // Build contacts
  const contactDocs = buildContacts(companyDocs, now);
  const contactRefs = contactDocs.map(() => db.collection("contacts").doc());
  contactDocs.forEach((doc, i) => { doc._id = contactRefs[i].id; });
  await batchWrite(db, contactRefs.map((ref, i) => {
    const { _id, ...data } = contactDocs[i]; return { ref, data: { ...data, ...seedMeta } };
  }));

  // Build deals
  const dealDocs = buildDeals(companyDocs, contactDocs, now);
  const dealRefs = dealDocs.map(() => db.collection("deals").doc());
  dealDocs.forEach((doc, i) => { doc._id = dealRefs[i].id; });
  await batchWrite(db, dealRefs.map((ref, i) => {
    const { _id, ...data } = dealDocs[i]; return { ref, data: { ...data, ...seedMeta } };
  }));

  const won = dealDocs.filter(d => d.stage === "Won");
  const lost = dealDocs.filter(d => d.stage === "Lost");
  const open = dealDocs.filter(d => d.stage !== "Won" && d.stage !== "Lost");

  return res.status(200).json({
    ok: true,
    seedRunId,
    companies: companyDocs.length,
    contacts: contactDocs.length,
    deals: {
      total: dealDocs.length,
      open: open.length,
      won: won.length,
      lost: lost.length,
      openValue: open.reduce((s, d) => s + d.value, 0),
      wonValue: won.reduce((s, d) => s + d.value, 0),
    }
  });
}
