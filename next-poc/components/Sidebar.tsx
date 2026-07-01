"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useStore } from "@/lib/store";
import { initials, colorFor } from "@/lib/format";

type NavItem = { sec?: string; id?: string; label?: string; icon?: string };

const NAV: NavItem[] = [
  { sec: "Workspace" },
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "contacts", label: "Contacts", icon: "users" },
  { id: "companies", label: "Companies", icon: "building" },
  { id: "deals", label: "Deals", icon: "trello" },
  { id: "quotes", label: "Quote Builder", icon: "calc" },
  { id: "tasks", label: "Tasks", icon: "check" },
  { id: "tickets", label: "Support Tickets", icon: "ticket" },
  { id: "templates", label: "Templates", icon: "template" },
  { id: "support", label: "Support Settings", icon: "shield" },
  { sec: "Insights" },
  { id: "analytics", label: "Analytics", icon: "bar" },
  { id: "settings", label: "Settings", icon: "cog" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = useStore((s) => s.user);
  return (
    <aside className="sidebar">
      <div className="brand">PulseCRM</div>
      {NAV.map((n, i) =>
        n.sec ? (
          <div className="nav-sec" key={"s" + i}>{n.sec}</div>
        ) : (
          <Link key={n.id} href={"/" + n.id} className={"navlink" + (pathname === "/" + n.id ? " on" : "")}>
            <Icon name={n.icon!} />
            <span>{n.label}</span>
          </Link>
        )
      )}
      {user && (
        <div className="userbox">
          <span className="ava" style={{ background: colorFor(user.name) }}>{initials(user.name)}</span>
          <div className="who"><b>{user.name}</b><span>{user.email}</span></div>
        </div>
      )}
    </aside>
  );
}
