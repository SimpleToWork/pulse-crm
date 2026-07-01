"use client";
import { useMemo } from "react";
import type { Task } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { useStore, useLiveTasks, useTasksData } from "@/lib/store";
import DataTable, { type Column } from "@/components/DataTable";

const isOverdue = (t: Task) => t.status !== "done" && !!t.due && t.due < Date.now();

export default function TasksView() {
  const tasks = useLiveTasks();
  const rawTasks = useTasksData();
  const setCollection = useStore((s) => s.setCollection);
  const openCount = tasks.filter((t) => t.status !== "done").length;
  const overdueCount = tasks.filter(isOverdue).length;

  const toggleDone = (id: string, done: boolean) =>
    setCollection("tasks", rawTasks.map((t) => (t.id === id ? { ...t, status: done ? "done" : "open", updatedAt: Date.now() } : t)));

  const columns: Column<Task>[] = useMemo(() => [
    { key: "done", label: "", sortable: false, filter: true, type: "text", get: (t) => (t.status === "done" ? "Completed" : "Open"), thStyle: { width: 40 },
      cell: (t) => (
        <input type="checkbox" checked={t.status === "done"} onClick={(e) => e.stopPropagation()}
          onChange={(e) => toggleDone(t.id, e.target.checked)}
          style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--accent)" }} />
      ) },
    { key: "title", label: "Task", type: "text", get: (t) => t.title || "",
      cell: (t) => <span style={{ fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "var(--faint)" : "inherit" }}>{t.title}</span> },
    { key: "priority", label: "Priority", type: "text", get: (t) => t.priority || "low", cell: (t) => <span className={"prio " + (t.priority || "low")}>{t.priority || "low"}</span> },
    { key: "due", label: "Due date", type: "date", get: (t) => t.due ?? null,
      cell: (t) => t.due ? <span style={isOverdue(t) ? { color: "var(--danger)", fontWeight: 600 } : { color: "var(--muted)" }}>{fmtDate(t.due)}</span> : <span className="faint">—</span> },
    { key: "owner", label: "Owner", type: "text", get: (t) => t.owner || "", cell: (t) => <span className="muted">{t.owner || "—"}</span> },
    { key: "createdBy", label: "Created by", type: "text", get: (t) => t.createdBy || "", cell: (t) => <span className="muted" style={{ fontSize: 12 }}>{t.createdBy || "—"}</span> },
  ], [rawTasks]);

  return (
    <>
      <div className="pagehead">
        <div><h1>Tasks</h1><div className="sub">{openCount} open · {overdueCount} overdue</div></div>
        <button className="btn primary">+ New task</button>
      </div>
      <DataTable rows={tasks} columns={columns} rowKey={(t) => t.id}
        initialSort={{ col: "due", dir: "asc" }} />
    </>
  );
}
