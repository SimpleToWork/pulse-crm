import type { Contact, Company, Deal, Task, Ticket, Template } from "./types";
import { STAGES, PRIORITIES } from "./types";

const TEMPLATES: Template[] = [
  { id: "tm1", name: "Intro outreach", category: "Welcome Email", subject: "Great connecting", body: "Hi {{firstName}},\n\nThanks for taking the time today. Here's a quick recap of how PulseCRM can help {{company}}…\n\nBest,\n{{me}}" },
  { id: "tm2", name: "Proposal cover", category: "Proposal", subject: "Your proposal", body: "Hi {{firstName}},\n\nAttached is the proposal we discussed. Highlights:\n• …\n• …\n\nHappy to walk through it live." },
  { id: "tm3", name: "Post-call recap", category: "Meeting Recap", body: "Thanks for the call! Recap:\n• Goals: …\n• Next steps: …\n• Timeline: …" },
  { id: "tm4", name: "Next steps", category: "Next Steps", body: "Hi {{firstName}}, to move forward:\n1. …\n2. …\nLet me know if that works." },
  { id: "tm5", name: "Gentle follow-up", category: "Follow-Up", subject: "Circling back", body: "Hi {{firstName}}, just floating this back to the top of your inbox — any thoughts?" },
  { id: "tm6", name: "Renewal reminder", category: "Follow-Up", body: "Hi {{firstName}}, your renewal is coming up on {{date}}. Let's find time to review results." },
  { id: "tm7", name: "Onboarding welcome", category: "Welcome Email", body: "Welcome aboard, {{firstName}}! Here's how to get started with your team…" },
  { id: "tm8", name: "Lost deal check-in", category: "Other", body: "Hi {{firstName}}, no worries on the timing — I'll check back next quarter. Door's always open." },
];

const FIRST = ["Sarah","Emma","Mia","Tom","Liam","Noah","Olivia","Ava","Ethan","Sophia","Jack","Isla","Leo","Aria","Max","Zoe","Owen","Ruby","Finn","Nora","Cole","Ivy","Reid","Jade","Blake","Luna","Chase","Elle","Dean","Faye"];
const LAST = ["Chen","Rossi","Okafor","Nguyen","Park","Silva","Kane","Reyes","Haddad","Novak","Berg","Malik","Costa","Frost","Vance","Ito","Roy","Bauer","Cruz","Wolfe","Dunn","Shah","Lund","Pena","Voss"];
const COMPANIES = ["Acme Logistics","Cedar Education","Mesa Retail","Westgate Legal","Gable Architecture","Redwood Timber","Bright Path EdTech","LightSpeed Commerce","Stride Fitness","Granite Construction","Quantum Computing","Apex Systems","Lattice Analytics","Northwind Traders","Harbor Health","Summit Freight","Vertex Media","Cobalt Finance","Delta Foods","Orbit Software","Pine Valley Farms","Ironclad Security","Maple Retail","Solstice Energy","Tidal Marine","Zenith Labs","Copper Mountain","Fable Toys","Meridian Bank","Nova Robotics"];
const SIZES = ["1-10","11-50","51-200","201-500","500+"];
const STATUS = ["Lead","Lead","Lead","Qualified","Qualified","Customer","Churned","Inactive"];
const OWNERS = ["Ricky Schweky","Joe Harari","Gabe Lesser","Nathan Mosseri"];
const TITLES = ["VP Sales","CFO","Procurement Mgr","Director","Account Exec","CEO","Sales Manager","Founder","Head of Ops","Marketing Lead"];
const DEAL_SUFFIX = ["Annual plan","Q3 contract","Add-on seats","Expansion","Renewal","Pilot","Enterprise upgrade","Platform license"];
const TICKET_SUBJ = ["Login issue","Billing discrepancy","Feature request","Data import stuck","API errors","Onboarding help","Report not loading","Sync failure","Permission error","Slow dashboard"];
const TICKET_TYPES = ["Bug","Billing","Feature","How-to","Outage"];
const TICKET_STATUS = ["open","open","in-progress","resolved","closed"];
const TICKET_PRIO = ["urgent","high","medium","low"];
const TASK_TITLES = ["Follow up call","Send proposal","Schedule demo","Review contract","Check in","Prepare quote","Update CRM notes","Send onboarding docs"];

function rng(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

export interface DemoData { contacts: Contact[]; companies: Company[]; deals: Deal[]; tasks: Task[]; tickets: Ticket[]; templates: Template[]; }

export function makeDemo(n = 500): DemoData {
  const r = rng(42);
  const now = Date.now(), DAY = 864e5;
  const companies: Company[] = COMPANIES.map((name, i) => ({
    id: "co" + i, name, industry: ["SaaS","Retail","Legal","Education","Finance","Manufacturing"][i % 6],
    size: SIZES[i % SIZES.length], owner: OWNERS[i % OWNERS.length], createdBy: pick(r, OWNERS),
    createdAt: now - Math.floor(r() * 500) * DAY, updatedAt: now - Math.floor(r() * 40) * DAY, deletedAt: null,
  }));

  const contacts: Contact[] = [];
  for (let i = 0; i < n; i++) {
    const first = pick(r, FIRST), last = pick(r, LAST), co = pick(r, companies);
    contacts.push({
      id: "c" + i, firstName: first, lastName: last, title: pick(r, TITLES),
      email: `${first}.${last}`.toLowerCase() + "@" + co.name.toLowerCase().replace(/[^a-z]/g, "") + ".com",
      companyId: co.id, status: pick(r, STATUS), owner: pick(r, OWNERS),
      lastContacted: r() < 0.25 ? null : now - Math.floor(r() * 120) * DAY,
      createdBy: pick(r, OWNERS), createdAt: now - Math.floor(r() * 400) * DAY, updatedAt: now - Math.floor(r() * 40) * DAY, deletedAt: null,
    });
  }

  const deals: Deal[] = [];
  const stageCounters: Record<string, number> = {};
  for (let i = 0; i < 120; i++) {
    const co = pick(r, companies), stage = pick(r, STAGES as unknown as string[]);
    stageCounters[stage] = (stageCounters[stage] || 0) + 1;
    deals.push({
      id: "d" + i, name: `${co.name} — ${pick(r, DEAL_SUFFIX)}`, companyId: co.id,
      stage, value: (Math.floor(r() * 40) + 3) * 1000, priority: pick(r, PRIORITIES as unknown as string[]),
      owner: pick(r, OWNERS), expectedClose: r() < 0.2 ? null : now + (Math.floor(r() * 120) - 30) * DAY,
      order: stageCounters[stage], createdBy: pick(r, OWNERS),
      createdAt: now - Math.floor(r() * 200) * DAY, updatedAt: now - Math.floor(r() * 30) * DAY, deletedAt: null,
    });
  }

  const tasks: Task[] = [];
  for (let i = 0; i < 60; i++) {
    tasks.push({
      id: "t" + i, title: pick(r, TASK_TITLES), priority: pick(r, PRIORITIES as unknown as string[]),
      status: r() < 0.35 ? "done" : "open", due: r() < 0.15 ? null : now + (Math.floor(r() * 40) - 15) * DAY,
      owner: pick(r, OWNERS), createdBy: pick(r, OWNERS),
      createdAt: now - Math.floor(r() * 60) * DAY, updatedAt: now - Math.floor(r() * 10) * DAY, deletedAt: null,
    });
  }

  const tickets: Ticket[] = [];
  for (let i = 0; i < 40; i++) {
    const co = pick(r, companies);
    tickets.push({
      id: "tk" + i, subject: pick(r, TICKET_SUBJ), status: pick(r, TICKET_STATUS), priority: pick(r, TICKET_PRIO),
      type: pick(r, TICKET_TYPES), companyId: co.id, contactId: pick(r, contacts).id, owner: pick(r, OWNERS),
      createdAt: now - Math.floor(r() * 45) * DAY, updatedAt: now - Math.floor(r() * 5) * DAY, deletedAt: null,
    });
  }

  const now2 = now;
  const templates: Template[] = TEMPLATES.map((t) => ({ ...t, createdAt: now2, updatedAt: now2, deletedAt: null }));
  return { contacts, companies, deals, tasks, tickets, templates };
}
