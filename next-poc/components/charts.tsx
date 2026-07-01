"use client";

export interface Datum { label: string; value: number; color?: string; display?: string; }

export function Bars({ data }: { data: Datum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="barrow" key={d.label}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
          <span className="btrack"><span className="bfill" style={{ width: (d.value / max) * 100 + "%", background: d.color || "var(--accent)" }} /></span>
          <span className="bval">{d.display ?? d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function Columns({ data }: { data: Datum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cols">
      {data.map((d) => (
        <div className="colwrap" key={d.label}>
          <span className="cval">{d.display ?? (d.value || "")}</span>
          <div className="colbar" style={{ height: Math.max(2, (d.value / max) * 100) + "%", background: d.color }} />
          <span className="clabel">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
