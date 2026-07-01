"use client";
import { useMemo } from "react";
import type { Contact } from "@/lib/types";
import { initials, colorFor, fmtDate, STATUS_COLOR } from "@/lib/format";
import { useLiveContacts, useCompaniesData } from "@/lib/store";
import DataTable, { type Column } from "@/components/DataTable";

const contactName = (c: Contact) => `${c.firstName || ""} ${c.lastName || ""}`.trim();

export default function ContactsView() {
  const contacts = useLiveContacts();
  const companies = useCompaniesData();
  const coName = useMemo(() => {
    const m = new Map(companies.map((c) => [c.id, c.name]));
    return (id?: string | null) => (id ? m.get(id) || "" : "");
  }, [companies]);

  const columns: Column<Contact>[] = useMemo(() => [
    { key: "name", label: "Name", type: "text", get: (c) => contactName(c),
      cell: (c) => (
        <div className="cellname">
          <span className="ava" style={{ background: colorFor(contactName(c)) }}>{initials(contactName(c))}</span>
          <div><div>{contactName(c) || "—"}</div><div className="faint" style={{ fontSize: 11.5 }}>{c.title || ""}</div></div>
        </div>
      ) },
    { key: "company", label: "Company", type: "text", get: (c) => coName(c.companyId), cell: (c) => coName(c.companyId) || "—" },
    { key: "email", label: "Email", type: "text", get: (c) => c.email || "", cell: (c) => <span className="muted">{c.email || "—"}</span> },
    { key: "status", label: "Status", type: "text", get: (c) => c.status || "Lead",
      cell: (c) => <span className="chip"><span className="dot" style={{ background: STATUS_COLOR[c.status || "Lead"] || "#94a3b8" }} />{c.status || "Lead"}</span> },
    { key: "owner", label: "Owner", type: "text", get: (c) => c.owner || "",
      cell: (c) => c.owner ? <span className="ava" style={{ width: 24, height: 24, fontSize: 10, background: colorFor(c.owner) }}>{initials(c.owner)}</span> : <span className="faint">—</span> },
    { key: "lastContacted", label: "Last contacted", type: "date", get: (c) => c.lastContacted ?? null,
      cell: (c) => c.lastContacted ? <span className="muted">{fmtDate(c.lastContacted)}</span> : <span className="faint">Never</span> },
    { key: "createdBy", label: "Created by", type: "text", get: (c) => c.createdBy || "",
      cell: (c) => c.createdBy ? <span className="muted" style={{ fontSize: 12 }}>{c.createdBy}</span> : <span className="faint">—</span> },
  ], [coName]);

  return (
    <>
      <div className="pagehead">
        <div><h1>Contacts</h1><div className="sub">{contacts.length.toLocaleString()} people in your CRM</div></div>
        <button className="btn primary">+ New contact</button>
      </div>
      <DataTable rows={contacts} columns={columns} rowKey={(c) => c.id}
        defaultCompare={(a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)} />
    </>
  );
}
