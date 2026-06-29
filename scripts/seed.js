#!/usr/bin/env node
/**
 * PulseCRM — Firestore seed script
 *
 * Populates the database with:
 *   • 75  companies
 *   • 500 contacts
 *   •  90 deals (open pipeline + historical Won/Lost)
 *
 * SETUP
 * -----
 * 1. Install deps (one-time):
 *      npm install --save-dev firebase-admin
 *
 * 2. Download a service-account key from Firebase console:
 *      Firebase project → Project settings → Service accounts → Generate new private key
 *    Save it as  scripts/serviceAccountKey.json  (already git-ignored)
 *
 * 3. Run:
 *      GOOGLE_APPLICATION_CREDENTIALS=scripts/serviceAccountKey.json \
 *        node scripts/seed.js
 *
 *    Or set FIREBASE_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS in your shell.
 *
 * The script is idempotent for companies (skips if >=75 already exist) but
 * will re-seed contacts and deals on top of existing data if you run it twice.
 * Use --force to always write fresh data regardless.
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// ─── initialise ──────────────────────────────────────────────────────────────
if (!getApps().length) {
  const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "pulse-crm-60582";
  initializeApp({ credential: cert(require("./serviceAccountKey.json")), projectId: PROJECT_ID });
}
const db = getFirestore();

// ─── constants (must match index.html) ───────────────────────────────────────
const STAGES = ["New Lead","Contacted","Qualified","Proposal Sent","Negotiation","Won","Lost"];
const STAGE_PROB = {"New Lead":10,"Contacted":25,"Qualified":45,"Proposal Sent":65,"Negotiation":80,"Won":100,"Lost":0};
const PRIORITIES = ["low","medium","high"];
const SOURCES = ["Website","Referral","Cold outreach","Event","LinkedIn","Inbound"];
const CONTACT_STATUSES = ["Lead","Lead","Lead","Qualified","Qualified","Customer","Customer","Churned"];

// ─── seed data pools ──────────────────────────────────────────────────────────
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
  "",""  // some deals have no notes
];

// ─── deterministic pseudo-random (seeded) ────────────────────────────────────
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
const pickN = (arr, n) => {
  const copy = [...arr]; const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(r() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};
const between = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));

// ─── helpers ──────────────────────────────────────────────────────────────────
const DAY = 864e5;
const now = Date.now();
const daysAgo  = d => now - d * DAY;
const daysAhead = d => now + d * DAY;

function companyDomain(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) + ".com";
}
function emailFor(first, last, domain) {
  const variants = [
    `${first}.${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}@${domain}`,
  ];
  return variants[Math.floor(r() * variants.length)].toLowerCase();
}
function phone() {
  return `(${between(200,999)}) ${between(200,999)}-${between(1000,9999)}`;
}
function batchWrite(ops) {
  // Firestore batch limit is 500 — split and commit in chunks
  const chunks = [];
  for (let i = 0; i < ops.length; i += 499) chunks.push(ops.slice(i, i + 499));
  return Promise.all(chunks.map(chunk => {
    const batch = db.batch();
    chunk.forEach(({ ref, data }) => batch.set(ref, data));
    return batch.commit();
  }));
}

// ─── generate companies ───────────────────────────────────────────────────────
function buildCompanies() {
  const prefixes = [
    "Acme","Apex","Atlas","Bolt","Bridge","Cascade","Cedar","Crest","Crown","Delta",
    "Echo","Ember","Empire","Envoy","Falcon","Fern","Forge","Frost","Granite","Harbor",
    "Haven","Helix","Horizon","Iris","Jade","Jasper","Keystone","Kite","Lark","Lumen",
    "Lynx","Maple","Meridian","Mesa","Metro","Mira","Mosaic","Nova","Nexus","Obsidian",
    "Onyx","Orbit","Pacific","Peak","Pillar","Pine","Pinnacle","Pixel","Pivot","Prism",
    "Quill","Quorum","Ridge","Ripple","Riven","Rocket","Root","Route","Sage","Sequoia",
    "Shield","Shore","Signal","Slate","Solaris","Spark","Sphere","Spiral","Summit","Swift",
    "Timber","Titan","Tundra","Uplift","Vantage"
  ];
  const suffixes = [
    "Solutions","Technologies","Group","Partners","Ventures","Industries","Labs","Systems",
    "Dynamics","Services","Consulting","Analytics","Digital","Innovations","Networks"
  ];

  return prefixes.slice(0, 75).map((prefix, i) => {
    const industry = INDUSTRIES[i % INDUSTRIES.length];
    const name = `${prefix} ${suffixes[i % suffixes.length]}`;
    const domain = companyDomain(name);
    const created = daysAgo(between(90, 730));
    return {
      name,
      industry,
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

// ─── generate contacts ────────────────────────────────────────────────────────
function buildContacts(companies) {
  return Array.from({ length: 500 }, (_, i) => {
    const company = companies[i % companies.length];
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const domain = companyDomain(company.name);
    const status = CONTACT_STATUSES[i % CONTACT_STATUSES.length];
    const created = daysAgo(between(10, 540));
    const lastContacted = i % 8 === 0 ? null : daysAgo(between(0, 60));
    return {
      firstName,
      lastName,
      email: emailFor(firstName, lastName, domain),
      phone: phone(),
      title: JOB_TITLES[i % JOB_TITLES.length],
      companyId: company._id,   // resolved after Firestore write
      status,
      source: SOURCES[i % SOURCES.length],
      owner: REPS[i % REPS.length],
      tags: i % 5 === 0 ? ["priority"] : i % 7 === 0 ? ["newsletter"] : i % 11 === 0 ? ["vip","priority"] : [],
      lastContacted,
      notes: i % 9 === 0 ? "Met at trade show. Interested in enterprise tier." : i % 13 === 0 ? "Referred by existing customer." : "",
      createdAt: created,
      updatedAt: created + between(0, 14) * DAY,
      deletedAt: null,
      createdBy: REPS[i % REPS.length],
    };
  });
}

// ─── generate deals ───────────────────────────────────────────────────────────
function buildDeals(companies, contacts) {
  // Stage distribution for 90 deals:
  //   New Lead       10  (open)
  //   Contacted      12  (open)
  //   Qualified      13  (open)
  //   Proposal Sent  12  (open)
  //   Negotiation     8  (open)
  //   Won            18  (closed — historical)
  //   Lost           17  (closed — historical)
  const stageCounts = {
    "New Lead": 10, "Contacted": 12, "Qualified": 13,
    "Proposal Sent": 12, "Negotiation": 8, "Won": 18, "Lost": 17,
  };
  const deals = [];
  let idx = 0;

  for (const [stage, count] of Object.entries(stageCounts)) {
    const isClosed = stage === "Won" || stage === "Lost";
    for (let n = 0; n < count; n++, idx++) {
      const company = companies[(idx * 3) % companies.length];
      const contact = contacts[(idx * 7) % contacts.length];
      const dealType = DEAL_TYPES[idx % DEAL_TYPES.length];
      const baseName = `${company.name} — ${dealType}`;
      // Value: vary by stage — won/lost deals can have higher variance (historical range)
      const baseValues = [5000,8500,12000,15000,24000,32000,45000,60000,75000,90000,120000,18000,22000,38000,50000];
      const value = baseValues[idx % baseValues.length] + between(0, 4999);
      // Close dates: open deals → future; closed deals → past
      let expectedClose, closedAt;
      if (isClosed) {
        closedAt = daysAgo(between(7, 365));
        expectedClose = closedAt - between(0, 30) * DAY;
      } else {
        closedAt = null;
        expectedClose = daysAhead(between(7, 120));
      }
      const created = isClosed
        ? closedAt - between(30, 180) * DAY
        : daysAgo(between(5, 90));
      const noteTemplate = DEAL_NOTE_TEMPLATES[idx % DEAL_NOTE_TEMPLATES.length];
      const notes = noteTemplate.replace("{contact}", `${contact.firstName} ${contact.lastName}`);
      deals.push({
        name: baseName,
        companyId: company._id,
        contactId: contact._id,
        value,
        stage,
        probability: STAGE_PROB[stage],
        priority: PRIORITIES[idx % PRIORITIES.length],
        source: SOURCES[idx % SOURCES.length],
        owner: REPS[idx % REPS.length],
        notes,
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

// ─── main ─────────────────────────────────────────────────────────────────────
async function seed() {
  const force = process.argv.includes("--force");

  // Guard: skip if already seeded (unless --force)
  if (!force) {
    const snap = await db.collection("companies").limit(80).get();
    if (snap.size >= 75) {
      console.log(`⏭  Already seeded (${snap.size} companies found). Use --force to re-seed.`);
      return;
    }
  }

  console.log("🌱 Seeding PulseCRM...");

  // ── companies ──
  console.log("  Building 75 companies...");
  const companyDocs = buildCompanies();
  const companyRefs = companyDocs.map(() => db.collection("companies").doc());
  companyDocs.forEach((doc, i) => { doc._id = companyRefs[i].id; });
  await batchWrite(companyRefs.map((ref, i) => {
    const { _id, ...data } = companyDocs[i]; return { ref, data };
  }));
  console.log(`  ✓ ${companyDocs.length} companies written`);

  // ── contacts ──
  console.log("  Building 500 contacts...");
  const contactDocs = buildContacts(companyDocs);
  const contactRefs = contactDocs.map(() => db.collection("contacts").doc());
  contactDocs.forEach((doc, i) => { doc._id = contactRefs[i].id; });
  await batchWrite(contactRefs.map((ref, i) => {
    const { _id, ...data } = contactDocs[i]; return { ref, data };
  }));
  console.log(`  ✓ ${contactDocs.length} contacts written`);

  // ── deals ──
  console.log("  Building 90 deals...");
  const dealDocs = buildDeals(companyDocs, contactDocs);
  const dealRefs = dealDocs.map(() => db.collection("deals").doc());
  dealDocs.forEach((doc, i) => { doc._id = dealRefs[i].id; });
  await batchWrite(dealRefs.map((ref, i) => {
    const { _id, ...data } = dealDocs[i]; return { ref, data };
  }));
  console.log(`  ✓ ${dealDocs.length} deals written`);

  // ── summary ──
  const won = dealDocs.filter(d => d.stage === "Won");
  const lost = dealDocs.filter(d => d.stage === "Lost");
  const open = dealDocs.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const totalValue = dealDocs.reduce((s, d) => s + d.value, 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);

  console.log("\n✅ Seed complete!");
  console.log(`   Companies : ${companyDocs.length}`);
  console.log(`   Contacts  : ${contactDocs.length}`);
  console.log(`   Deals     : ${dealDocs.length} total`);
  console.log(`               ${open.length} open pipeline`);
  console.log(`               ${won.length} won  (historical)`);
  console.log(`               ${lost.length} lost (historical)`);
  console.log(`   Pipeline  : $${open.reduce((s,d)=>s+d.value,0).toLocaleString()} open`);
  console.log(`   Won rev   : $${wonValue.toLocaleString()}`);
  console.log(`   Total val : $${totalValue.toLocaleString()}`);
}

seed().catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); });
