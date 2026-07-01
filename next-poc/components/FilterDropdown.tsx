"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ColType, ColFilter } from "@/lib/types";
import { XF_OPS, XF_CAP, type DistinctItem } from "@/lib/xf";

function FunnelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export default function FilterDropdown({
  type, filter, getDistinct, onApply,
}: {
  type: ColType;
  filter?: ColFilter;
  getDistinct: () => DistinctItem[];
  onApply: (f: ColFilter) => void;
}) {
  const active = !!filter && (Array.isArray(filter.picked) || !!filter.cond?.op);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // condition + selection state, seeded from the current filter when opened
  const [op, setOp] = useState(filter?.cond?.op || "");
  const [a, setA] = useState(filter?.cond?.a || "");
  const [b, setB] = useState(filter?.cond?.b || "");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Set<string> | null>(
    filter && Array.isArray(filter.picked) ? new Set(filter.picked) : null
  );

  const all = useMemo(() => (open ? getDistinct() : []), [open]); // built lazily on open
  const total = all.length;
  const shown = useMemo(() => {
    const q = search.toLowerCase();
    const items = q ? all.filter((d) => d.label.toLowerCase().includes(q)) : all;
    return { items, capped: items.slice(0, XF_CAP), over: items.length > XF_CAP };
  }, [all, search]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !panelRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const pw = panelRef.current.offsetWidth || 214, ph = panelRef.current.offsetHeight || 320;
    let left = Math.min(r.right - pw, window.innerWidth - pw - 8); left = Math.max(8, left);
    let top = r.bottom + 4; if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    setPos({ top, left });
  }, [open, shown]);

  useLayoutEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const isChecked = (k: string) => sel === null || sel.has(k);
  const allChecked = sel === null || sel.size >= total;
  const toggle = (k: string, on: boolean) => {
    setSel((prev) => {
      const next = prev === null ? new Set(all.map((d) => d.key)) : new Set(prev);
      if (on) next.add(k); else next.delete(k);
      return next;
    });
  };
  const apply = () => {
    const picked = sel === null || sel.size >= total ? null : [...sel];
    onApply({ picked, cond: op ? { op, a, b } : null });
    setOpen(false);
  };
  const clear = () => { setSel(null); setOp(""); setA(""); setB(""); setSearch(""); onApply({ picked: null, cond: null }); setOpen(false); };

  return (
    <span className={"th-fd" + (active ? " on" : "") + (open ? " active" : "")} onClick={(e) => e.stopPropagation()}>
      <button ref={btnRef} className="th-fd-btn" title="Filter" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <FunnelIcon />
      </button>
      {open && (
        <div ref={panelRef} className="xf-panel" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
          <div className="xf-cond">
            <select className="xf-op" value={op} onChange={(e) => setOp(e.target.value)}>
              {(XF_OPS[type] || XF_OPS.text).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {op && <input className="xf-a" type={type === "date" ? "date" : type === "number" ? "number" : "text"} value={a} placeholder="Value" onChange={(e) => setA(e.target.value)} />}
            {op === "between" && <input className="xf-b" type={type === "date" ? "date" : type === "number" ? "number" : "text"} value={b} placeholder="and" onChange={(e) => setB(e.target.value)} />}
          </div>
          <input className="xf-search" placeholder="Search values…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="xf-list">
            <label className="xf-opt xf-all">
              <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = !allChecked && sel !== null && sel.size > 0; }}
                onChange={(e) => setSel(e.target.checked ? null : new Set())} />
              <span>(Select All)</span>
            </label>
            {shown.capped.map((d) => (
              <label className="xf-opt" key={d.key}>
                <input type="checkbox" checked={isChecked(d.key)} onChange={(e) => toggle(d.key, e.target.checked)} />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
          {shown.over && <div className="xf-note">Showing {XF_CAP} of {shown.items.length} — refine search or use the condition above.</div>}
          <div className="xf-actions">
            <button className="xf-clear" onClick={clear}>Clear</button>
            <button className="xf-apply" onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </span>
  );
}
