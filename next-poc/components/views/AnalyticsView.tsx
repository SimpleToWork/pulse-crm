"use client";
import { useMemo } from "react";
import { STAGES, OPEN_STAGES } from "@/lib/types";
import { moneyK, money, STATUS_COLOR, STAGE_COLOR, colorFor } from "@/lib/format";
import { useLiveContacts, useLiveDeals } from "@/lib/store";
import { Bars, Columns } from "@/components/charts";

const OWNERS_COLOR = "var(--accent)";

export default function AnalyticsView() {
  const contacts = useLiveContacts();
  const deals = useLiveDeals();

  const a = useMemo(() => {
    const won = deals.filter((d) => d.stage === "Won");
    const lost = deals.filter((d) => d.stage === "Lost");
    const openVal = deals.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + (+d.value! || 0), 0);
    const wonVal = won.reduce((s, d) => s + (+d.value! || 0), 0);
    const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const avg = deals.length ? Math.round(deals.reduce((s, d) => s + (+d.value! || 0), 0) / deals.length) : 0;

    const byStage = STAGES.map((stage) => ({ label: stage, value: deals.filter((d) => d.stage === stage).reduce((s, d) => s + (+d.value! || 0), 0), color: STAGE_COLOR[stage] }))
      .map((b) => ({ ...b, display: moneyK(b.value) }));

    const statuses = ["Lead", "Qualified", "Customer", "Churned", "Inactive"];
    const byStatus = statuses.map((st) => ({ label: st, value: contacts.filter((c) => (c.status || "Lead") === st).length, color: STATUS_COLOR[st] }));

    const ownerMap: Record<string, number> = {};
    for (const d of deals) if (OPEN_STAGES.includes(d.stage)) ownerMap[d.owner || "—"] = (ownerMap[d.owner || "—"] || 0) + (+d.value! || 0);
    const byOwner = Object.entries(ownerMap).sort((x, y) => y[1] - x[1]).map(([label, value]) => ({ label, value, color: colorFor(label), display: moneyK(value) }));

    // deals created, last 6 months
    const now = new Date(); const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime(), end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      months.push({ label: d.toLocaleDateString("en-US", { month: "short" }), value: deals.filter((x) => (x.createdAt || 0) >= start && (x.createdAt || 0) < end).length });
    }
    return { openVal, wonVal, winRate, avg, byStage, byStatus, byOwner, months, wonCount: won.length };
  }, [deals, contacts]);

  return (
    <>
      <div className="pagehead"><div><h1>Analytics</h1><div className="sub">Performance across your pipeline</div></div></div>
      <div className="stats">
        <div className="card stat"><div className="lbl">Open pipeline</div><div className="val">{moneyK(a.openVal)}</div></div>
        <div className="card stat"><div className="lbl">Won value</div><div className="val">{moneyK(a.wonVal)}</div><div className="delta">{a.wonCount} deals</div></div>
        <div className="card stat"><div className="lbl">Win rate</div><div className="val">{a.winRate}%</div></div>
        <div className="card stat"><div className="lbl">Avg deal size</div><div className="val">{money(a.avg)}</div></div>
      </div>
      <div className="grid2">
        <div className="card panel"><div className="panel-head"><h2>Pipeline value by stage</h2></div><Bars data={a.byStage} /></div>
        <div className="card panel"><div className="panel-head"><h2>Contacts by status</h2></div><Bars data={a.byStatus} /></div>
      </div>
      <div className="grid2">
        <div className="card panel"><div className="panel-head"><h2>Open pipeline by owner</h2></div><Bars data={a.byOwner} /></div>
        <div className="card panel"><div className="panel-head"><h2>Deals created (last 6 months)</h2></div><Columns data={a.months} /></div>
      </div>
    </>
  );
}
