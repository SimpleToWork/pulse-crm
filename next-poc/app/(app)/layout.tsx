"use client";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import LoginScreen from "@/components/LoginScreen";
import Toasts from "@/components/Toasts";
import EntityForm from "@/components/forms/EntityForm";
import { useStore } from "@/lib/store";
import { firebaseReady } from "@/lib/firebase";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  const authReady = useStore((s) => s.authReady);

  if (!authReady) return <div className="login"><div className="login-card"><h1>PulseCRM</h1><p>Loading…</p></div></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          {!firebaseReady && (
            <div className="demo-banner">⚙️ Demo mode — running on in-memory sample data. Set <b>NEXT_PUBLIC_FIREBASE_*</b> env vars to connect real Firestore.</div>
          )}
          {children}
        </div>
      </div>
      <EntityForm />
      <Toasts />
    </div>
  );
}
