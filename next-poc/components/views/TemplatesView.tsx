"use client";
import { useMemo, useState } from "react";
import { TMPL_CATS } from "@/lib/types";
import { useLiveTemplates, useStore } from "@/lib/store";
import { dbRemove } from "@/lib/db";

export default function TemplatesView() {
  const templates = useLiveTemplates();
  const openDrawer = useStore((s) => s.openDrawer);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const list = useMemo(() => {
    const query = q.toLowerCase();
    return templates
      .filter((t) => (!query || (t.name || "").toLowerCase().includes(query) || (t.body || "").toLowerCase().includes(query) || (t.category || "").toLowerCase().includes(query)))
      .filter((t) => (!cat || t.category === cat))
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.name || "").localeCompare(b.name || ""));
  }, [templates, q, cat]);

  const copy = (id: string, body: string) => { navigator.clipboard?.writeText(body); setCopied(id); setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500); };

  return (
    <>
      <div className="pagehead">
        <div><h1>Templates</h1><div className="sub">Reusable message templates for outreach and follow-up</div></div>
        <button className="btn primary" onClick={() => openDrawer("template")}>+ New template</button>
      </div>
      <div className="toolbar">
        <div className="field-search"><input placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="cattabs">
          {["", ...TMPL_CATS].map((c) => {
            const count = c ? templates.filter((t) => t.category === c).length : templates.length;
            return <button key={c || "all"} className={"btn sm" + (cat === c ? " primary" : "")} onClick={() => setCat(c)}>{c || "All"} <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span></button>;
          })}
        </div>
      </div>
      <div className="tmpl-grid">
        {list.map((t) => (
          <div className="card tmpl-card" key={t.id}>
            <div className="tc-head">
              <div><div className="tc-name">{t.name}</div><span className="chip" style={{ marginTop: 5 }}>{t.category || "Other"}</span></div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <button className="btn sm" onClick={() => copy(t.id, t.body || "")}>{copied === t.id ? "Copied!" : "Copy"}</button>
                <button className="btn sm" onClick={() => openDrawer("template", t.id)}>Edit</button>
                <button className="btn sm danger" onClick={() => dbRemove("templates", t.id, "Template")}>✕</button>
              </div>
            </div>
            {t.subject && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{t.subject}</div>}
            <div className="tc-body">{t.body}</div>
          </div>
        ))}
        {!list.length && <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No templates match your filter.</div>}
      </div>
    </>
  );
}
