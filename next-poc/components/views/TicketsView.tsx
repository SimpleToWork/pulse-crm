"use client";
import { useMemo } from "react";
import type { Ticket } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { useLiveTickets, useCompaniesData, useStore } from "@/lib/store";
import DataTable, { type Column } from "@/components/DataTable";

const TK_STATUS_LABEL: Record<string, string> = { open: "Open", "in-progress": "In Progress", resolved: "Resolved", closed: "Closed" };
const TK_STATUS_COLOR: Record<string, string> = { open: "#0ea5e9", "in-progress": "#d97706", resolved: "#16a34a", closed: "#94a3b8" };
const TK_PRIO_COLOR: Record<string, string> = { urgent: "#7c3aed", high: "#dc2626", medium: "#d97706", low: "#94a3b8" };

export default function TicketsView() {
  const tickets = useLiveTickets();
  const companies = useCompaniesData();
  const openDrawer = useStore((s) => s.openDrawer);
  const coName = useMemo(() => {
    const m = new Map(companies.map((c) => [c.id, c.name]));
    return (id?: string | null) => (id ? m.get(id) || "" : "");
  }, [companies]);
  const open = tickets.filter((t) => t.status === "open" || t.status === "in-progress").length;

  const columns: Column<Ticket>[] = useMemo(() => [
    { key: "subject", label: "Subject", type: "text", get: (t) => t.subject || "",
      cell: (t) => <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.subject || "—"}</div><div className="faint" style={{ fontSize: 11.5 }}>{t.type || ""}</div></div> },
    { key: "status", label: "Status", type: "text", get: (t) => TK_STATUS_LABEL[t.status] || t.status,
      cell: (t) => <span className="chip"><span className="dot" style={{ background: TK_STATUS_COLOR[t.status] || "#94a3b8" }} />{TK_STATUS_LABEL[t.status] || t.status}</span> },
    { key: "priority", label: "Priority", type: "text", get: (t) => t.priority || "",
      cell: (t) => <span className="chip" style={{ borderColor: (TK_PRIO_COLOR[t.priority || ""] || "#94a3b8") + "44", color: TK_PRIO_COLOR[t.priority || ""] || "var(--muted)" }}>{t.priority || "—"}</span> },
    { key: "company", label: "Company", type: "text", get: (t) => coName(t.companyId), cell: (t) => coName(t.companyId) || <span className="faint">—</span> },
    { key: "owner", label: "Owner", type: "text", get: (t) => t.owner || "", cell: (t) => <span className="muted">{t.owner || "—"}</span> },
    { key: "createdAt", label: "Created", type: "date", get: (t) => t.createdAt ?? null, cell: (t) => <span className="muted" style={{ fontSize: 12 }}>{fmtDate(t.createdAt)}</span> },
  ], [coName]);

  return (
    <>
      <div className="pagehead">
        <div><h1>Support Tickets</h1><div className="sub">{tickets.length} tickets · {open} open</div></div>
        <button className="btn primary" onClick={() => openDrawer("ticket")}>+ New ticket</button>
      </div>
      <DataTable rows={tickets} columns={columns} rowKey={(t) => t.id}
        onRowClick={(t) => openDrawer("ticket", t.id)}
        defaultCompare={(a, b) => (b.createdAt || 0) - (a.createdAt || 0)} />
    </>
  );
}
