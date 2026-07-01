"use client";
import { useEffect } from "react";

export default function Drawer({ title, onClose, onDelete, onSave, children }: {
  title: string; onClose: () => void; onDelete?: () => void; onSave: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer" role="dialog">
        <div className="drawer-head"><h2>{title}</h2><button className="linkbtn" onClick={onClose}>✕</button></div>
        <div className="drawer-body">{children}</div>
        <div className="drawer-foot">
          {onDelete && <button className="btn danger" onClick={onDelete}>Delete</button>}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </>
  );
}
