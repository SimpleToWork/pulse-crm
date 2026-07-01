"use client";
import { useState } from "react";
import type { Deal } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { money, moneyK, STAGE_COLOR } from "@/lib/format";
import { useStore } from "@/lib/store";
import { dbUpdate } from "@/lib/db";

export default function DealsBoard({ deals, coName }: { deals: Deal[]; coName: (id?: string | null) => string }) {
  const openDrawer = useStore((s) => s.openDrawer);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const moveTo = (id: string, stage: string) => {
    const d = deals.find((x) => x.id === id);
    if (d && d.stage !== stage) dbUpdate("deals", id, { stage });
  };

  return (
    <div className="board">
      {STAGES.map((stage) => {
        const items = deals.filter((d) => d.stage === stage).sort((a, b) => (a.order || 0) - (b.order || 0));
        const total = items.reduce((s, d) => s + (+d.value! || 0), 0);
        return (
          <div
            key={stage}
            className={"kcol" + (dropStage === stage ? " drop" : "")}
            onDragOver={(e) => { e.preventDefault(); setDropStage(stage); }}
            onDragLeave={() => setDropStage((s) => (s === stage ? null : s))}
            onDrop={(e) => { e.preventDefault(); setDropStage(null); if (dragId) moveTo(dragId, stage); }}
          >
            <div className="kcol-head">
              <span className="dot" style={{ background: STAGE_COLOR[stage] || "#94a3b8" }} />
              {stage}
              <span className="cnt">{items.length} · {moneyK(total)}</span>
            </div>
            {items.map((d) => (
              <div
                key={d.id}
                className={"dealcard" + (dragId === d.id ? " dragging" : "")}
                draggable
                onDragStart={() => setDragId(d.id)}
                onDragEnd={() => setDragId(null)}
                onClick={() => openDrawer("deal", d.id)}
              >
                <div className="dc-name">{d.name}</div>
                <div className="dc-co">{coName(d.companyId) || "—"}</div>
                <div className="dc-foot">
                  <span className="dc-val">{money(d.value)}</span>
                  <span className={"prio " + (d.priority || "low")}>{d.priority || "low"}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
