"use client";
import { useMemo, useState } from "react";
import { INTEGRATIONS, aiDerived, computeQuoteTotals, type QuoteConfig } from "@/lib/quote";
import { money, moneyK } from "@/lib/format";

export default function QuoteBuilderView() {
  const derived = useMemo(() => aiDerived(), []);
  const [client, setClient] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [seats, setSeats] = useState(0);
  const [pricePerUser, setPricePerUser] = useState(0);
  const [aiLicenses, setAiLicenses] = useState(0);
  const [aiCost, setAiCost] = useState(+derived.fullyLoaded.toFixed(2));

  const config: QuoteConfig = useMemo(() => ({
    integrations: Object.entries(selected).map(([id, qty]) => ({ id, qty })),
    users: { count: seats, pricePerUser, aiLicenseCount: aiLicenses },
    aiCostOverride: aiCost,
  }), [selected, seats, pricePerUser, aiLicenses, aiCost]);

  const t = useMemo(() => computeQuoteTotals(config), [config]);
  const toggle = (id: string) => setSelected((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = 1; return n; });

  return (
    <>
      <div className="pagehead">
        <div><h1>Quote Builder</h1><div className="sub">Pick integrations &amp; seats — pricing calculates live.</div></div>
        <button className="btn primary">Save quote</button>
      </div>
      <div className="qb-grid">
        <div className="card panel" style={{ margin: 0 }}>
          <div className="qb-field"><label>Client / company</label><input value={client} placeholder="Acme Logistics" onChange={(e) => setClient(e.target.value)} /></div>
          <div className="qb-row">
            <div className="qb-field"><label>User seats</label><input type="number" min={0} value={seats} onChange={(e) => setSeats(+e.target.value)} /></div>
            <div className="qb-field"><label>Price / user / mo ($)</label><input type="number" min={0} value={pricePerUser} onChange={(e) => setPricePerUser(+e.target.value)} /></div>
          </div>
          <div className="qb-row">
            <div className="qb-field"><label>AI licenses</label><input type="number" min={0} value={aiLicenses} onChange={(e) => setAiLicenses(+e.target.value)} /></div>
            <div className="qb-field"><label>AI cost / license / mo ($)</label><input type="number" min={0} step={0.01} value={aiCost} onChange={(e) => setAiCost(+e.target.value)} /></div>
          </div>
          <div className="qb-field" style={{ marginBottom: 0 }}>
            <label>Integrations ({Object.keys(selected).length} selected)</label>
            <div className="int-list">
              {INTEGRATIONS.map((it) => (
                <label className="int-item" key={it.id}>
                  <input type="checkbox" checked={!!selected[it.id]} onChange={() => toggle(it.id)} />
                  <span>{it.name}</span>
                  <span className="i-lv">L{it.level}</span>
                  <span className="i-mo">{money(it.monthlyCost)}/mo</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card qb-summary">
          <h2>Quote summary{client ? ` · ${client}` : ""}</h2>
          <div className="qb-line"><span>User seats<div className="ql-sub">{t.users} × {money(t.pricePerUser)}</div></span><span>{money(t.seatMonthly)}</span></div>
          <div className="qb-line"><span>AI licenses<div className="ql-sub">{t.aiLicenseCount} × {money(+t.aiPricePerUser.toFixed(2))}{aiCost > 0 ? "" : " (computed)"}</div></span><span>{money(t.aiMonthly)}</span></div>
          <div className="qb-line"><span>Integrations<div className="ql-sub">{Object.keys(selected).length} selected</div></span><span>{money(t.perIntegrationMonthly)}</span></div>
          <div className="qb-total"><span>Monthly</span><span className="val">{money(t.monthly)}</span></div>
          <div className="qb-line" style={{ borderBottom: "none" }}><span>Annual</span><span style={{ fontWeight: 600 }}>{moneyK(t.annual)}</span></div>
          <div className="qb-impl"><span>Implementation (one-time)</span><span>{money(t.implementation)}</span></div>
          {t.timelineDays > 0 && <div className="ql-sub" style={{ marginTop: 8, textAlign: "right" }}>Est. timeline: {t.timelineDays} days</div>}
        </div>
      </div>
    </>
  );
}
