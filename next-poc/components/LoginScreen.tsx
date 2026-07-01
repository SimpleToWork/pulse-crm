"use client";
import { useState } from "react";

export default function LoginScreen() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setErr(""); setBusy(true);
    const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import("firebase/auth");
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      const code = e?.code || "";
      // Popup blocked / closed / COOP-isolated → fall back to full-page redirect.
      if (["auth/popup-blocked", "auth/cancelled-popup-request", "auth/popup-closed-by-user", "auth/internal-error"].includes(code)) {
        try { await signInWithRedirect(auth, provider); return; } catch (e2: any) { setErr(e2?.code || e2?.message || "Sign-in failed"); }
      } else {
        setErr(code || e?.message || "Sign-in failed");
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>PulseCRM</h1>
        <p>Your AI-native CRM for closing more deals with less chaos.</p>
        <button className="btn primary gbtn" onClick={signIn} disabled={busy}>{busy ? "Signing in…" : "Continue with Google"}</button>
        {err && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--danger)", lineHeight: 1.5 }}>
            Sign-in error: <b>{err}</b>
            {err.includes("unauthorized-domain") && <div style={{ color: "var(--muted)", marginTop: 6 }}>This domain isn’t in Firebase → Authentication → Authorized domains. Add <b>{typeof window !== "undefined" ? window.location.hostname : ""}</b> there.</div>}
          </div>
        )}
        <p style={{ marginTop: 18, fontSize: 11.5, color: "var(--faint)" }}>Restricted to <b>@merchantsbi.com</b> accounts.</p>
      </div>
    </div>
  );
}
