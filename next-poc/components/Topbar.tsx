"use client";
import { Icon } from "@/lib/icons";
import { useStore } from "@/lib/store";

export default function Topbar() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  return (
    <div className="topbar">
      <span className="brand">PulseCRM</span>
      <span className="poc-tag">Next.js migration</span>
      <span className="spacer" />
      <button className="iconbtn" title="Toggle theme" onClick={toggleTheme}>
        <Icon name={theme === "dark" ? "sun" : "moon"} />
      </button>
    </div>
  );
}
