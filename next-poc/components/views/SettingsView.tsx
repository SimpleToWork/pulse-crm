"use client";
import { Icon } from "@/lib/icons";
import { initials, colorFor } from "@/lib/format";
import { useStore } from "@/lib/store";

const TEAM = [
  { name: "Ricky Schweky", email: "ricky@merchantsbi.com", role: "Admin" },
  { name: "Joe Harari", email: "joe@merchantsbi.com", role: "Sales" },
  { name: "Gabe Lesser", email: "gabe@merchantsbi.com", role: "Sales" },
  { name: "Nathan Mosseri", email: "nathan@merchantsbi.com", role: "Sales" },
];
const INTEGRATIONS = [
  { icon: "✉️", name: "Instantly", desc: "Cold email sequences", on: true },
  { icon: "🚀", name: "Smartlead", desc: "Email outreach & warmup", on: false },
  { icon: "🧭", name: "Apollo", desc: "Lead enrichment & sourcing", on: true },
  { icon: "💬", name: "Slack", desc: "Deal & ticket notifications", on: false },
];

export default function SettingsView() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <>
      <div className="pagehead"><div><h1>Settings</h1><div className="sub">Workspace, team & integrations</div></div></div>

      <div className="card panel set-section">
        <div className="panel-head"><h2>Appearance</h2></div>
        <div className="themebtns">
          <button className={"btn" + (theme === "light" ? " primary" : "")} onClick={() => setTheme("light")}><Icon name="sun" /> Light</button>
          <button className={"btn" + (theme === "dark" ? " primary" : "")} onClick={() => setTheme("dark")}><Icon name="moon" /> Dark</button>
        </div>
      </div>

      <div className="card panel set-section">
        <div className="panel-head"><h2>Team</h2><span className="muted" style={{ fontSize: 12 }}>{TEAM.length} members</span></div>
        {TEAM.map((m) => (
          <div className="member" key={m.email}>
            <span className="ava" style={{ background: colorFor(m.name) }}>{initials(m.name)}</span>
            <div className="m-info"><b>{m.name}</b><span>{m.email}</span></div>
            <span className="m-role">{m.role}</span>
          </div>
        ))}
      </div>

      <div className="card panel set-section">
        <div className="panel-head"><h2>Integrations</h2></div>
        {INTEGRATIONS.map((it) => (
          <div className="integ" key={it.name}>
            <span className="i-ico">{it.icon}</span>
            <div className="i-info"><b>{it.name}</b><span>{it.desc}</span></div>
            {it.on ? <span className="pill-ok">Connected</span> : <button className="btn sm">Connect</button>}
          </div>
        ))}
      </div>

      <div className="card panel set-section">
        <div className="panel-head"><h2>About</h2></div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          PulseCRM — Next.js migration build. Firebase project <b>pulse-crm-60582</b>, sign-in restricted to <b>@merchantsbi.com</b>.
          Editing team/integrations lands in the write-paths phase.
        </div>
      </div>
    </>
  );
}
