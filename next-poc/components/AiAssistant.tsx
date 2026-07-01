"use client";
import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useLiveContacts, useCompaniesData, useLiveDeals, useLiveTasks, useLiveTickets } from "@/lib/store";
import { workspaceContext, askAI } from "@/lib/ai";

interface Msg { role: "you" | "ai"; text: string; }

export default function AiAssistant() {
  const contacts = useLiveContacts();
  const companies = useCompaniesData();
  const deals = useLiveDeals();
  const tasks = useLiveTasks();
  const tickets = useLiveTickets();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [log, setLog] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const prompt = q.trim();
    if (!prompt || busy) return;
    setLog((l) => [...l, { role: "you", text: prompt }]);
    setQ(""); setBusy(true);
    try {
      const ctx = workspaceContext({ contacts, companies, deals, tasks, tickets });
      const text = await askAI(prompt, ctx);
      setLog((l) => [...l, { role: "ai", text }]);
    } catch (e) {
      setLog((l) => [...l, { role: "ai", text: "⚠️ " + (e as Error).message }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button className="ai-fab" title="Ask PulseAI" onClick={() => setOpen((o) => !o)}><Icon name="spark" /></button>
      {open && (
        <div className="ai-panel">
          <div className="ai-head"><Icon name="spark" /> <b>PulseAI</b><span style={{ flex: 1 }} /><button className="linkbtn" onClick={() => setOpen(false)}>✕</button></div>
          <div className="ai-log">
            {log.length === 0 && <div className="ai-empty">Ask about your pipeline — e.g. “Which open deals should I prioritize this week?” Answers use only your workspace data.</div>}
            {log.map((m, i) => <div key={i} className={"ai-msg " + m.role}>{m.text}</div>)}
            {busy && <div className="ai-msg ai"><span className="ai-dots">…</span></div>}
          </div>
          <div className="ai-input">
            <input value={q} placeholder="Ask PulseAI…" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
            <button className="btn primary" onClick={send} disabled={busy}>Ask</button>
          </div>
        </div>
      )}
    </>
  );
}
