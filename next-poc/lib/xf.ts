import type { ColType, ColFilter } from "./types";

const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Canonical membership/grouping key for a cell value. */
export function xfKey(v: unknown, type: ColType): string {
  if (v == null || v === "") return "";
  if (type === "date") return String(dayStart(+v as number));
  if (type === "number") return String(+(v as number));
  return String(v).trim();
}
export function xfLabel(v: unknown, type: ColType): string {
  if (v == null || v === "") return "(Blanks)";
  if (type === "date") return new Date(+(v as number)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return String(v).trim();
}

export interface DistinctItem { key: string; label: string; }

export function xfDistinct<T>(rows: T[], get: (r: T) => unknown, type: ColType): DistinctItem[] {
  const m = new Map<string, string>();
  for (const r of rows) { const v = get(r); const k = xfKey(v, type); if (!m.has(k)) m.set(k, xfLabel(v, type)); }
  const arr = [...m.entries()].map(([key, label]) => ({ key, label }));
  arr.sort((a, b) => {
    if ((a.key === "") !== (b.key === "")) return a.key === "" ? 1 : -1;
    if (type === "number" || type === "date") return (+a.key || 0) - (+b.key || 0);
    return a.label.toLowerCase() < b.label.toLowerCase() ? -1 : a.label.toLowerCase() > b.label.toLowerCase() ? 1 : 0;
  });
  return arr;
}

export function xfActive(f?: ColFilter | null): boolean {
  return !!f && (Array.isArray(f.picked) || !!(f.cond && f.cond.op));
}

export function xfPass(v: unknown, f: ColFilter | undefined | null, type: ColType): boolean {
  if (!f) return true;
  if (Array.isArray(f.picked) && !f.picked.includes(xfKey(v, type))) return false;
  const c = f.cond;
  if (c && c.op) {
    if (type === "number") {
      const n = v == null || v === "" ? null : +(v as number);
      const a = c.a === "" ? null : +c.a, b = c.b === "" ? null : +c.b;
      if (c.op === "eq" && n !== a) return false;
      if (c.op === "ne" && n === a) return false;
      if (c.op === "gt" && !(n != null && a != null && n > a)) return false;
      if (c.op === "ge" && !(n != null && a != null && n >= a)) return false;
      if (c.op === "lt" && !(n != null && a != null && n < a)) return false;
      if (c.op === "le" && !(n != null && a != null && n <= a)) return false;
      if (c.op === "between" && !(n != null && a != null && b != null && n >= Math.min(a, b) && n <= Math.max(a, b))) return false;
    } else if (type === "date") {
      const d = v == null || v === "" ? null : dayStart(+(v as number));
      const a = c.a ? dayStart(new Date(c.a).getTime()) : null, b = c.b ? dayStart(new Date(c.b).getTime()) : null;
      if (c.op === "on" && d !== a) return false;
      if (c.op === "before" && !(d != null && a != null && d < a)) return false;
      if (c.op === "after" && !(d != null && a != null && d > a)) return false;
      if (c.op === "between" && !(d != null && a != null && b != null && d >= Math.min(a, b) && d <= Math.max(a, b))) return false;
    } else {
      const s = String(v == null ? "" : v).toLowerCase(), a = String(c.a || "").toLowerCase();
      if (c.op === "contains" && !s.includes(a)) return false;
      if (c.op === "ncontains" && s.includes(a)) return false;
      if (c.op === "eq" && s !== a) return false;
      if (c.op === "ne" && s === a) return false;
      if (c.op === "begins" && !s.startsWith(a)) return false;
      if (c.op === "ends" && !s.endsWith(a)) return false;
    }
  }
  return true;
}

export const XF_OPS: Record<ColType, [string, string][]> = {
  text: [["", "Show all"], ["contains", "Contains"], ["ncontains", "Does not contain"], ["eq", "Equals"], ["ne", "Does not equal"], ["begins", "Begins with"], ["ends", "Ends with"]],
  number: [["", "Show all"], ["eq", "="], ["ne", "≠"], ["gt", ">"], ["ge", "≥"], ["lt", "<"], ["le", "≤"], ["between", "Between"]],
  date: [["", "Show all"], ["on", "On"], ["before", "Before"], ["after", "After"], ["between", "Between"]],
};

export const XF_CAP = 300;
