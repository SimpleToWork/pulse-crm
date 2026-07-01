"use client";

export default function Pager({
  total, page, per, onPage, onPer,
}: {
  total: number; page: number; per: number;
  onPage: (p: number) => void; onPer: (n: number) => void;
}) {
  const pages = per ? Math.max(1, Math.ceil(total / per)) : 1;
  const from = total ? (per ? (page - 1) * per + 1 : 1) : 0;
  const to = per ? Math.min(page * per, total) : total;
  return (
    <div className="tpager" onClick={(e) => e.stopPropagation()}>
      <div>{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span>Rows</span>
        <select className="tpager-per" value={per} onChange={(e) => onPer(+e.target.value)}>
          {[25, 50, 100, 200, 0].map((n) => <option key={n} value={n}>{n || "All"}</option>)}
        </select>
        <button className="tpager-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
        <span className="tpager-page">{page} / {pages}</span>
        <button className="tpager-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}
