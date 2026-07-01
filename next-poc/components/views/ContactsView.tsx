"use client";
import { useMemo, useState } from "react";
import type { Contact, ColType, ColFilter } from "@/lib/types";
import { xfPass, xfDistinct } from "@/lib/xf";
import { initials, colorFor, fmtDate, STATUS_COLOR } from "@/lib/format";
import { useLiveContacts, useCompaniesData } from "@/lib/store";
import FilterDropdown from "@/components/FilterDropdown";
import Pager from "@/components/Pager";

const contactName = (c: Contact) => `${c.firstName || ""} ${c.lastName || ""}`.trim();

interface Ctx { companyName: (id?: string | null) => string; }
interface Column {
  key: string; label: string; type: ColType;
  get: (c: Contact, ctx: Ctx) => unknown;
  cell: (c: Contact, ctx: Ctx) => React.ReactNode;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Name", type: "text",
    get: (c) => contactName(c),
    cell: (c) => (
      <div className="cellname">
        <span className="ava" style={{ background: colorFor(contactName(c)) }}>{initials(contactName(c))}</span>
        <div><div>{contactName(c) || "—"}</div><div className="faint" style={{ fontSize: 11.5 }}>{c.title || ""}</div></div>
      </div>
    ) },
  { key: "company", label: "Company", type: "text", get: (c, ctx) => ctx.companyName(c.companyId), cell: (c, ctx) => ctx.companyName(c.companyId) || "—" },
  { key: "email", label: "Email", type: "text", get: (c) => c.email || "", cell: (c) => <span className="muted">{c.email || "—"}</span> },
  { key: "status", label: "Status", type: "text", get: (c) => c.status || "Lead",
    cell: (c) => <span className="chip"><span className="dot" style={{ background: STATUS_COLOR[c.status || "Lead"] || "#94a3b8" }} />{c.status || "Lead"}</span> },
  { key: "owner", label: "Owner", type: "text", get: (c) => c.owner || "",
    cell: (c) => c.owner ? <span className="ava" style={{ width: 24, height: 24, fontSize: 10, background: colorFor(c.owner) }}>{initials(c.owner)}</span> : <span className="faint">—</span> },
  { key: "lastContacted", label: "Last contacted", type: "date", get: (c) => c.lastContacted ?? null,
    cell: (c) => c.lastContacted ? <span className="muted">{fmtDate(c.lastContacted)}</span> : <span className="faint">Never</span> },
  { key: "createdBy", label: "Created by", type: "text", get: (c) => c.createdBy || "",
    cell: (c) => c.createdBy ? <span className="muted" style={{ fontSize: 12 }}>{c.createdBy}</span> : <span className="faint">—</span> },
];

export default function ContactsView() {
  const contacts = useLiveContacts();
  const companies = useCompaniesData();
  const [filters, setFilters] = useState<Record<string, ColFilter>>({});
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(50);

  const ctx: Ctx = useMemo(() => {
    const m = new Map(companies.map((c) => [c.id, c.name]));
    return { companyName: (id) => (id ? m.get(id) || "" : "") };
  }, [companies]);

  const filtered = useMemo(() => {
    let rows = contacts.filter((c) => COLUMNS.every((col) => xfPass(col.get(c, ctx), filters[col.key], col.type)));
    if (sort) {
      const col = COLUMNS.find((c) => c.key === sort.col)!;
      rows = [...rows].sort((x, y) => {
        const av = col.get(x, ctx), bv = col.get(y, ctx);
        let cmp: number;
        if (col.type === "text") { const a = String(av || "").toLowerCase(), b = String(bv || "").toLowerCase(); cmp = a < b ? -1 : a > b ? 1 : 0; }
        else cmp = ((av as number) || 0) - ((bv as number) || 0);
        return sort.dir === "asc" ? cmp : -cmp;
      });
    } else rows = [...rows].sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
    return rows;
  }, [contacts, ctx, filters, sort]);

  const pages = per ? Math.max(1, Math.ceil(filtered.length / per)) : 1;
  const curPage = Math.min(page, pages);
  const pageRows = per ? filtered.slice((curPage - 1) * per, curPage * per) : filtered;

  const applyFilter = (key: string, f: ColFilter) => { setFilters((p) => ({ ...p, [key]: f })); setPage(1); };
  const toggleSort = (key: string) => setSort((s) => (s?.col === key ? { col: key, dir: s.dir === "asc" ? "desc" : "asc" } : { col: key, dir: "asc" }));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Contacts</h1>
          <div className="sub">{contacts.length.toLocaleString()} people in your CRM</div>
        </div>
        <button className="btn primary">+ New contact</button>
      </div>
      <div className="card tablecard">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const sorted = sort?.col === col.key;
                return (
                  <th key={col.key} className={"sortable" + (sorted ? " sorted" : "")} onClick={() => toggleSort(col.key)}>
                    {col.label}
                    <span className="sort-ind">{sorted ? (sort!.dir === "asc" ? "↑" : "↓") : "↕"}</span>
                    <FilterDropdown
                      type={col.type}
                      filter={filters[col.key]}
                      getDistinct={() => xfDistinct(contacts, (c) => col.get(c, ctx), col.type)}
                      onApply={(f) => applyFilter(col.key, f)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <tr key={c.id}>{COLUMNS.map((col) => <td key={col.key}>{col.cell(c, ctx)}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <Pager total={filtered.length} page={curPage} per={per} onPage={setPage} onPer={(n) => { setPer(n); setPage(1); }} />
      </div>
    </>
  );
}
