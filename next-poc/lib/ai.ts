import type { Contact, Company, Deal, Task, Ticket } from "./types";
import { OPEN_STAGES } from "./types";
import { money, fmtDate } from "./format";

export const AI_SYSTEM =
  "You are the PulseCRM AI assistant for a sales team. STRICT PRIVACY: use ONLY the workspace snapshot provided in the prompt. Never invent contacts, deals, or numbers that are not present, and never reference any other organization's data. Be concise, concrete, and sales-focused. Use plain text (no markdown headers).";

const cName = (c: Contact) => `${c.firstName || ""} ${c.lastName || ""}`.trim();

// Scoped snapshot of the signed-in workspace — the only data the model may use.
export function workspaceContext(d: { contacts: Contact[]; companies: Company[]; deals: Deal[]; tasks: Task[]; tickets: Ticket[] }): string {
  const coName = new Map(d.companies.map((c) => [c.id, c.name]));
  const open = d.deals.filter((x) => OPEN_STAGES.includes(x.stage));
  const openTk = d.tickets.filter((t) => t.status === "open" || t.status === "in-progress");
  return [
    "PulseCRM workspace snapshot (the ONLY data you may use):",
    `Contacts (${d.contacts.length}): ` + d.contacts.slice(0, 40).map((c) => {
      const days = c.lastContacted ? Math.floor((Date.now() - c.lastContacted) / 864e5) : null;
      return `${cName(c)} [${c.status || "Lead"}] ${coName.get(c.companyId || "") || ""}${days === null ? " (never contacted)" : days === 0 ? " (today)" : ` (${days}d ago)`}`;
    }).join("; "),
    `Companies (${d.companies.length}): ` + d.companies.slice(0, 25).map((c) => c.name + (c.industry ? ` (${c.industry})` : "")).join("; "),
    `Open deals (${open.length}): ` + open.slice(0, 40).map((x) => `"${x.name}" ${money(x.value)} @ ${x.stage} (${coName.get(x.companyId || "") || "?"}) prio:${x.priority || "med"} close:${fmtDate(x.expectedClose)}`).join("; "),
    `Open tasks (${d.tasks.filter((t) => t.status !== "done").length}): ` + d.tasks.filter((t) => t.status !== "done").slice(0, 30).map((t) => `${t.title} (due ${fmtDate(t.due)})`).join("; "),
    `Open support tickets (${openTk.length}): ` + openTk.slice(0, 20).map((t) => `"${t.subject}" [${t.status}] prio:${t.priority} type:${t.type}`).join("; "),
  ].join("\n");
}

export async function askAI(userPrompt: string, context: string): Promise<string> {
  const prompt = `${context}\n\nTask: ${userPrompt}`;
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system: AI_SYSTEM }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "AI request failed");
  return data.text as string;
}
