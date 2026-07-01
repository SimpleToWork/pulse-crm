"use client";
import { useMemo } from "react";
import type { Company } from "@/lib/types";
import { OPEN_STAGES } from "@/lib/types";
import { initials, colorFor, moneyK } from "@/lib/format";
import { useLiveCompanies, useLiveContacts, useLiveDeals } from "@/lib/store";
import DataTable, { type Column } from "@/components/DataTable";

export default function CompaniesView() {
  const companies = useLiveCompanies();
  const contacts = useLiveContacts();
  const deals = useLiveDeals();

  // per-company aggregates, computed once
  const { contactCount, openValue } = useMemo(() => {
    const cc: Record<string, number> = {}, ov: Record<string, number> = {};
    for (const c of contacts) if (c.companyId) cc[c.companyId] = (cc[c.companyId] || 0) + 1;
    for (const d of deals) if (d.companyId && OPEN_STAGES.includes(d.stage)) ov[d.companyId] = (ov[d.companyId] || 0) + (+d.value! || 0);
    return { contactCount: cc, openValue: ov };
  }, [contacts, deals]);

  const columns: Column<Company>[] = useMemo(() => [
    { key: "name", label: "Company", type: "text", get: (c) => c.name || "",
      cell: (c) => (
        <div className="cellname">
          <span className="ava" style={{ borderRadius: 8, background: colorFor(c.name) }}>{initials(c.name)}</span>{c.name}
        </div>
      ) },
    { key: "industry", label: "Industry", type: "text", get: (c) => c.industry || "", cell: (c) => <span className="muted">{c.industry || "—"}</span> },
    { key: "size", label: "Size", type: "text", get: (c) => c.size || "", cell: (c) => <span className="muted">{c.size || "—"}</span> },
    { key: "contacts", label: "Contacts", type: "number", get: (c) => contactCount[c.id] || 0, cell: (c) => contactCount[c.id] || 0 },
    { key: "openDeals", label: "Open deals", type: "number", get: (c) => openValue[c.id] || 0, cell: (c) => moneyK(openValue[c.id] || 0) },
    { key: "owner", label: "Owner", type: "text", get: (c) => c.owner || "",
      cell: (c) => c.owner ? <span className="ava" style={{ width: 24, height: 24, fontSize: 10, background: colorFor(c.owner) }}>{initials(c.owner)}</span> : <span className="faint">—</span> },
    { key: "createdBy", label: "Created by", type: "text", get: (c) => c.createdBy || "", cell: (c) => <span className="muted" style={{ fontSize: 12 }}>{c.createdBy || "—"}</span> },
  ], [contactCount, openValue]);

  return (
    <>
      <div className="pagehead">
        <div><h1>Companies</h1><div className="sub">{companies.length.toLocaleString()} companies</div></div>
        <button className="btn primary">+ New company</button>
      </div>
      <DataTable rows={companies} columns={columns} rowKey={(c) => c.id}
        defaultCompare={(a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)} />
    </>
  );
}
