"use client";
import { useMemo, useState } from "react";
import type { Deal } from "@/lib/types";
import { OPEN_STAGES } from "@/lib/types";
import { money, moneyK, fmtDate, STAGE_COLOR } from "@/lib/format";
import { useLiveDeals, useCompaniesData, useStore } from "@/lib/store";
import DataTable, { type Column } from "@/components/DataTable";
import DealsBoard from "./DealsBoard";

export default function DealsView() {
  const deals = useLiveDeals();
  const companies = useCompaniesData();
  const openDrawer = useStore((s) => s.openDrawer);
  const [view, setView] = useState<"board" | "list">("board");

  const coName = useMemo(() => {
    const m = new Map(companies.map((c) => [c.id, c.name]));
    return (id?: string | null) => (id ? m.get(id) || "" : "");
  }, [companies]);

  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const inPlay = open.reduce((s, d) => s + (+d.value! || 0), 0);

  const columns: Column<Deal>[] = useMemo(() => [
    { key: "name", label: "Deal", type: "text", get: (d) => d.name || "", cell: (d) => <span style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</span> },
    { key: "company", label: "Company", type: "text", get: (d) => coName(d.companyId), cell: (d) => coName(d.companyId) || "—" },
    { key: "stage", label: "Stage", type: "text", get: (d) => d.stage,
      cell: (d) => <span className="chip"><span className="dot" style={{ background: STAGE_COLOR[d.stage] || "#94a3b8" }} />{d.stage}</span> },
    { key: "value", label: "Value", type: "number", get: (d) => +d.value! || 0, cell: (d) => <span style={{ fontWeight: 600 }}>{money(d.value)}</span> },
    { key: "priority", label: "Priority", type: "text", get: (d) => d.priority || "low", cell: (d) => <span className={"prio " + (d.priority || "low")}>{d.priority || "low"}</span> },
    { key: "expectedClose", label: "Close date", type: "date", get: (d) => d.expectedClose ?? null, cell: (d) => <span className="muted">{fmtDate(d.expectedClose)}</span> },
    { key: "owner", label: "Owner", type: "text", get: (d) => d.owner || "", cell: (d) => <span className="muted">{d.owner || "—"}</span> },
    { key: "createdAt", label: "Created", type: "date", get: (d) => d.createdAt ?? null, cell: (d) => <span className="muted" style={{ fontSize: 12 }}>{fmtDate(d.createdAt)}</span> },
  ], [coName]);

  return (
    <>
      <div className="pagehead">
        <div><h1>Deals</h1><div className="sub">{deals.length} total · {open.length} open · {moneyK(inPlay)} in play</div></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="viewtoggle">
            <button className={view === "board" ? "on" : ""} onClick={() => setView("board")}>Board</button>
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
          </div>
          <button className="btn primary" onClick={() => openDrawer("deal")}>+ New deal</button>
        </div>
      </div>
      {view === "board"
        ? <DealsBoard deals={deals} coName={coName} />
        : <DataTable rows={deals} columns={columns} rowKey={(d) => d.id} onRowClick={(d) => openDrawer("deal", d.id)} defaultCompare={(a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)} />}
    </>
  );
}
