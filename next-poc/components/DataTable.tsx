"use client";
import { useMemo, useState, type ReactNode, type CSSProperties } from "react";
import type { ColType, ColFilter } from "@/lib/types";
import { xfPass, xfDistinct } from "@/lib/xf";
import FilterDropdown from "./FilterDropdown";
import Pager from "./Pager";

export interface Column<T> {
  key: string;
  label?: string;
  type?: ColType;               // present → sortable + filterable
  get?: (r: T) => unknown;      // required when type is present
  cell: (r: T) => ReactNode;
  sortable?: boolean;
  filter?: boolean;
  thStyle?: CSSProperties;
}

export default function DataTable<T>({
  rows, columns, rowKey, initialSort, defaultCompare, onRowClick, empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  initialSort?: { col: string; dir: "asc" | "desc" };
  defaultCompare?: (a: T, b: T) => number;
  onRowClick?: (r: T) => void;
  empty?: ReactNode;
}) {
  const [filters, setFilters] = useState<Record<string, ColFilter>>({});
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(initialSort || null);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(50);

  const filtered = useMemo(() => {
    let out = rows.filter((r) => columns.every((c) => (c.type ? xfPass(c.get!(r), filters[c.key], c.type) : true)));
    if (sort) {
      const col = columns.find((c) => c.key === sort.col);
      if (col?.type && col.get) {
        out = [...out].sort((x, y) => {
          const av = col.get!(x), bv = col.get!(y);
          let cmp: number;
          if (col.type === "text") { const a = String(av || "").toLowerCase(), b = String(bv || "").toLowerCase(); cmp = a < b ? -1 : a > b ? 1 : 0; }
          else cmp = ((av as number) || 0) - ((bv as number) || 0);
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    } else if (defaultCompare) {
      out = [...out].sort(defaultCompare);
    }
    return out;
  }, [rows, columns, filters, sort, defaultCompare]);

  const pages = per ? Math.max(1, Math.ceil(filtered.length / per)) : 1;
  const curPage = Math.min(page, pages);
  const pageRows = per ? filtered.slice((curPage - 1) * per, curPage * per) : filtered;

  const applyFilter = (key: string, f: ColFilter) => { setFilters((p) => ({ ...p, [key]: f })); setPage(1); };
  const toggleSort = (key: string) => { setPage(1); setSort((s) => (s?.col === key ? { col: key, dir: s.dir === "asc" ? "desc" : "asc" } : { col: key, dir: "asc" })); };

  if (!rows.length && empty) return <>{empty}</>;

  return (
    <div className="card tablecard">
      <table>
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = col.sortable ?? !!col.type;
              const sorted = sort?.col === col.key;
              return (
                <th key={col.key} className={sortable ? "sortable" + (sorted ? " sorted" : "") : ""} style={col.thStyle}
                    onClick={sortable ? () => toggleSort(col.key) : undefined}>
                  {col.label}
                  {sortable && <span className="sort-ind">{sorted ? (sort!.dir === "asc" ? "↑" : "↓") : "↕"}</span>}
                  {(col.filter ?? !!col.type) && col.type && col.get && (
                    <FilterDropdown
                      type={col.type}
                      filter={filters[col.key]}
                      getDistinct={() => xfDistinct(rows, col.get!, col.type!)}
                      onApply={(f) => applyFilter(col.key, f)}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((col) => <td key={col.key}>{col.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <Pager total={filtered.length} page={curPage} per={per} onPage={setPage} onPer={(n) => { setPer(n); setPage(1); }} />
    </div>
  );
}
