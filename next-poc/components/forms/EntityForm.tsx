"use client";
import { useMemo, useState } from "react";
import { STAGES, PRIORITIES } from "@/lib/types";
import { useStore, useCompaniesData, type DrawerState } from "@/lib/store";
import { dbAdd, dbUpdate, dbRemove } from "@/lib/db";
import Drawer from "@/components/Drawer";

type FieldType = "text" | "email" | "textarea" | "number" | "date" | "select" | "company";
interface Field { k: string; l: string; t: FieldType; opts?: string[]; }
interface FormDef { coll: string; noun: string; title: string; fields: Field[]; }

const FORMS: Record<string, FormDef> = {
  contact: { coll: "contacts", noun: "Contact", title: "contact", fields: [
    { k: "firstName", l: "First name", t: "text" }, { k: "lastName", l: "Last name", t: "text" },
    { k: "title", l: "Title", t: "text" }, { k: "email", l: "Email", t: "email" }, { k: "phone", l: "Phone", t: "text" },
    { k: "companyId", l: "Company", t: "company" },
    { k: "status", l: "Status", t: "select", opts: ["Lead", "Qualified", "Customer", "Churned", "Inactive"] },
    { k: "owner", l: "Owner", t: "text" }, { k: "lastContacted", l: "Last contacted", t: "date" } ] },
  company: { coll: "companies", noun: "Company", title: "company", fields: [
    { k: "name", l: "Company name", t: "text" }, { k: "industry", l: "Industry", t: "text" },
    { k: "size", l: "Size", t: "select", opts: ["1-10", "11-50", "51-200", "201-500", "500+"] }, { k: "owner", l: "Owner", t: "text" } ] },
  deal: { coll: "deals", noun: "Deal", title: "deal", fields: [
    { k: "name", l: "Deal name", t: "text" }, { k: "companyId", l: "Company", t: "company" },
    { k: "stage", l: "Stage", t: "select", opts: [...STAGES] }, { k: "value", l: "Value ($)", t: "number" },
    { k: "priority", l: "Priority", t: "select", opts: [...PRIORITIES] }, { k: "owner", l: "Owner", t: "text" },
    { k: "expectedClose", l: "Expected close", t: "date" } ] },
  task: { coll: "tasks", noun: "Task", title: "task", fields: [
    { k: "title", l: "Task", t: "text" }, { k: "priority", l: "Priority", t: "select", opts: [...PRIORITIES] },
    { k: "status", l: "Status", t: "select", opts: ["open", "done"] }, { k: "due", l: "Due date", t: "date" }, { k: "owner", l: "Owner", t: "text" } ] },
  ticket: { coll: "tickets", noun: "Ticket", title: "ticket", fields: [
    { k: "subject", l: "Subject", t: "text" }, { k: "type", l: "Type", t: "text" },
    { k: "status", l: "Status", t: "select", opts: ["open", "in-progress", "resolved", "closed"] },
    { k: "priority", l: "Priority", t: "select", opts: ["urgent", "high", "medium", "low"] },
    { k: "companyId", l: "Company", t: "company" }, { k: "owner", l: "Owner", t: "text" } ] },
  template: { coll: "templates", noun: "Template", title: "template", fields: [
    { k: "name", l: "Name", t: "text" },
    { k: "category", l: "Category", t: "select", opts: ["Welcome Email", "Proposal", "Meeting Recap", "Next Steps", "Follow-Up", "Other"] },
    { k: "subject", l: "Subject", t: "text" }, { k: "body", l: "Body", t: "textarea" } ] },
};

const toDateInput = (ts: any) => (ts ? new Date(ts).toISOString().slice(0, 10) : "");
const fromDateInput = (s: string) => (s ? new Date(s + "T00:00:00").getTime() : null);

// Always mounted in the shell; remounts a fresh form per drawer-open via the key.
export default function EntityForm() {
  const drawer = useStore((s) => s.drawer);
  if (!drawer || !FORMS[drawer.type]) return null;
  return <FormInner key={drawer.type + ":" + (drawer.id || "new")} drawer={drawer} />;
}

function FormInner({ drawer }: { drawer: DrawerState }) {
  const closeDrawer = useStore((s) => s.closeDrawer);
  const collections = useStore((s) => s.collections);
  const companies = useCompaniesData();

  const def = FORMS[drawer.type];
  const record = useMemo(() => {
    const existing = drawer.id ? (collections[def.coll] || []).find((x) => x.id === drawer.id) : null;
    return existing || drawer.defaults || {};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    def.fields.forEach((f) => { o[f.k] = f.t === "date" ? toDateInput(record[f.k]) : (record[f.k] ?? ""); });
    return o;
  });

  const set = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));
  const save = async () => {
    const patch: Record<string, any> = {};
    def.fields.forEach((f) => {
      if (f.t === "date") patch[f.k] = fromDateInput(form[f.k]);
      else if (f.t === "number") patch[f.k] = form[f.k] === "" ? 0 : +form[f.k];
      else patch[f.k] = form[f.k] ?? "";
    });
    if (def.coll === "deals" && !patch.stage) patch.stage = "New Lead";
    if (def.coll === "tasks" && !patch.status) patch.status = "open";
    if (drawer.id) await dbUpdate(def.coll, drawer.id, patch);
    else await dbAdd(def.coll, patch);
    closeDrawer();
  };
  const del = async () => { if (drawer.id) { await dbRemove(def.coll, drawer.id, def.noun); closeDrawer(); } };

  return (
    <Drawer title={(drawer.id ? "Edit " : "New ") + def.title} onClose={closeDrawer} onSave={save} onDelete={drawer.id ? del : undefined}>
      {def.fields.map((f) => (
        <div className="qb-field" key={f.k}>
          <label>{f.l}</label>
          {f.t === "select" ? (
            <select value={form[f.k] || ""} onChange={(e) => set(f.k, e.target.value)}>
              <option value="">—</option>
              {f.opts!.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.t === "company" ? (
            <select value={form[f.k] || ""} onChange={(e) => set(f.k, e.target.value)}>
              <option value="">—</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : f.t === "textarea" ? (
            <textarea value={form[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} rows={4} />
          ) : (
            <input type={f.t === "number" ? "number" : f.t === "date" ? "date" : f.t === "email" ? "email" : "text"}
              value={form[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} />
          )}
        </div>
      ))}
    </Drawer>
  );
}
