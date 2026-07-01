import type { Contact, Company } from "./types";

const FIRST = ["Sarah","Emma","Mia","Tom","Liam","Noah","Olivia","Ava","Ethan","Sophia","Jack","Isla","Leo","Aria","Max","Zoe","Owen","Ruby","Finn","Nora","Cole","Ivy","Reid","Jade","Blake","Luna","Chase","Elle","Dean","Faye"];
const LAST = ["Chen","Rossi","Okafor","Nguyen","Park","Silva","Kane","Reyes","Haddad","Novak","Berg","Malik","Costa","Frost","Vance","Ito","Roy","Bauer","Cruz","Wolfe","Dunn","Shah","Lund","Pena","Voss"];
const COMPANIES = ["Acme Logistics","Cedar Education","Mesa Retail","Westgate Legal","Gable Architecture","Redwood Timber","Bright Path EdTech","LightSpeed Commerce","Stride Fitness","Granite Construction","Quantum Computing","Apex Systems","Lattice Analytics","Northwind Traders","Harbor Health","Summit Freight","Vertex Media","Cobalt Finance","Delta Foods","Orbit Software","Pine Valley Farms","Ironclad Security","Maple Retail","Solstice Energy","Tidal Marine","Zenith Labs","Copper Mountain","Fable Toys","Meridian Bank","Nova Robotics"];
const STATUS = ["Lead","Lead","Lead","Qualified","Qualified","Customer","Churned","Inactive"];
const OWNERS = ["Ricky Schweky","Joe Harari","Gabe Lesser","Nathan Mosseri"];
const TITLES = ["VP Sales","CFO","Procurement Mgr","Director","Account Exec","CEO","Sales Manager","Founder","Head of Ops","Marketing Lead"];

// Deterministic pseudo-random so the demo is stable across reloads.
function rng(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

export function makeDemo(n = 500): { contacts: Contact[]; companies: Company[] } {
  const r = rng(42);
  const now = Date.now(), DAY = 864e5;
  const companies: Company[] = COMPANIES.map((name, i) => ({ id: "co" + i, name, industry: ["SaaS","Retail","Legal","Education","Finance","Manufacturing"][i % 6] }));
  const contacts: Contact[] = [];
  for (let i = 0; i < n; i++) {
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const co = companies[Math.floor(r() * companies.length)];
    const status = STATUS[Math.floor(r() * STATUS.length)];
    const contacted = r() < 0.25 ? null : now - Math.floor(r() * 120) * DAY;
    contacts.push({
      id: "c" + i,
      firstName: first, lastName: last,
      title: TITLES[Math.floor(r() * TITLES.length)],
      email: `${first}.${last}`.toLowerCase() + "@" + co.name.toLowerCase().replace(/[^a-z]/g, "") + ".com",
      companyId: co.id,
      status,
      owner: OWNERS[Math.floor(r() * OWNERS.length)],
      lastContacted: contacted,
      createdBy: OWNERS[Math.floor(r() * OWNERS.length)],
      createdAt: now - Math.floor(r() * 400) * DAY,
      updatedAt: now - Math.floor(r() * 40) * DAY,
      deletedAt: null,
    });
  }
  return { contacts, companies };
}
