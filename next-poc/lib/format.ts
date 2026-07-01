const PALETTE = ["#5b5bf0","#8b5cf6","#0ea5e9","#16a34a","#f59e0b","#dc2626","#db2777","#0d9488","#64748b"];

export function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
export function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
export function fmtDate(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export const STATUS_COLOR: Record<string, string> = {
  Lead: "#94a3b8", Qualified: "#0ea5e9", Customer: "#16a34a", Churned: "#dc2626", Inactive: "#a1a1aa",
};
