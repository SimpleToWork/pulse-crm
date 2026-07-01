"use client";
import { useMemo } from "react";
import { STAGES, OPEN_STAGES } from "@/lib/types";
import { money, moneyK, fmtDate, STAGE_COLOR } from "@/lib/format";
import { useLiveContacts, useLiveDeals, useLiveTasks } from "@/lib/store";
import { Bars } from "@/components/charts";

export default function DashboardView() {
  const contacts = useLiveContacts();
  const deals = useLiveDeals();
  const tasks = useLiveTasks();

  const m = useMemo(() => {
    const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
    const openVal = open.reduce((s, d) => s + (+d.value! || 0), 0);
    const wonVal = deals.filter((d) => d.stage === "Won").reduce((s, d) => s + (+d.value! || 0), 0);
    const openTasks = tasks.filter((t) => t.status !== "done");
    const overdue = openTasks.filter((t) => t.due && t.due < Date.now());
    const byStage = STAGES.filter((s) => s !== "Lost").map((stage) => ({
      label: stage, value: deals.filter((d) => d.stage === stage).reduce((s, d) => s + (+d.value! || 0), 0), color: STAGE_COLOR[stage],
    }));
    const byStageV = byStage.map((b) => ({ ...b, display: moneyK(b.value) }));
    return { open, openVal, wonVal, openTasks, overdue, byStageV };
  }, [deals, tasks]);

  const closingSoon = [...deals.filter((d) => OPEN_STAGES.includes(d.stage) && d.expectedClose)]
    .sort((a, b) => (a.expectedClose! - b.expectedClose!)).slice(0, 6);
  const dueTasks = [...m.openTasks.filter((t) => t.due)].sort((a, b) => a.due! - b.due!).slice(0, 6);

  return (
    <>
      <div className="pagehead"><div><h1>Dashboard</h1><div className="sub">Your pipeline at a glance</div></div></div>
      <div className="stats">
        <div className="card stat"><div className="lbl">Open pipeline</div><div className="val">{moneyK(m.openVal)}</div><div className="delta">{m.open.length} open deals</div></div>
        <div className="card stat"><div className="lbl">Won</div><div className="val">{moneyK(m.wonVal)}</div><div className="delta">{deals.filter((d) => d.stage === "Won").length} deals</div></div>
        <div className="card stat"><div className="lbl">Contacts</div><div className="val">{contacts.length.toLocaleString()}</div></div>
        <div className="card stat"><div className="lbl">Open tasks</div><div className="val">{m.openTasks.length}</div><div className="delta">{m.overdue.length} overdue</div></div>
      </div>
      <div className="card panel">
        <div className="panel-head"><h2>Pipeline by stage</h2></div>
        <Bars data={m.byStageV} />
      </div>
      <div className="grid2">
        <div className="card panel">
          <div className="panel-head"><h2>Closing soon</h2></div>
          {closingSoon.length ? closingSoon.map((d) => (
            <div className="listrow" key={d.id}>
              <div><div style={{ fontWeight: 600 }}>{d.name}</div><div className="lr-sub">{d.stage}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{money(d.value)}</div><div className="lr-sub">{fmtDate(d.expectedClose)}</div></div>
            </div>
          )) : <div className="lr-sub">No open deals with a close date.</div>}
        </div>
        <div className="card panel">
          <div className="panel-head"><h2>Tasks due</h2></div>
          {dueTasks.length ? dueTasks.map((t) => (
            <div className="listrow" key={t.id}>
              <div><div style={{ fontWeight: 600 }}>{t.title}</div><div className="lr-sub">{t.owner}</div></div>
              <div className="lr-sub" style={t.due! < Date.now() ? { color: "var(--danger)", fontWeight: 600 } : {}}>{fmtDate(t.due)}</div>
            </div>
          )) : <div className="lr-sub">Nothing due.</div>}
        </div>
      </div>
    </>
  );
}
