"use client";
export default function LoginScreen() {
  const signIn = async () => {
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    try { await signInWithPopup(getAuth(), new GoogleAuthProvider()); }
    catch (e) { console.error(e); }
  };
  return (
    <div className="login">
      <div className="login-card">
        <h1>PulseCRM</h1>
        <p>Your AI-native CRM for closing more deals with less chaos.</p>
        <button className="btn primary gbtn" onClick={signIn}>Continue with Google</button>
        <p style={{ marginTop: 18, fontSize: 11.5, color: "var(--faint)" }}>Restricted to <b>@merchantsbi.com</b> accounts.</p>
      </div>
    </div>
  );
}
