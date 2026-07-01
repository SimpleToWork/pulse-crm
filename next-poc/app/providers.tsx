"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { firebaseReady, db } from "@/lib/firebase";
import { makeDemo } from "@/lib/demoData";

const ALLOWED_DOMAIN = "merchantsbi.com";
// Collections streamed into the store. Extend as views are migrated.
const COLLECTIONS = ["contacts", "companies", "deals", "tasks", "tickets"];

/**
 * App-wide client providers: applies theme, runs auth (Firebase or demo), and
 * streams Firestore collections into the store (onSnapshot). Data updates flow
 * through Zustand → React re-renders only the components that read them.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const setUser = useStore((s) => s.setUser);
  const setAuthReady = useStore((s) => s.setAuthReady);
  const setTheme = useStore((s) => s.setTheme);
  const setCollection = useStore((s) => s.setCollection);

  // theme: hydrate from localStorage, then keep <html data-theme> + storage in sync
  useEffect(() => {
    const saved = (localStorage.getItem("pulse-theme") as "light" | "dark") || "light";
    setTheme(saved);
  }, [setTheme]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pulse-theme", theme);
  }, [theme]);

  // auth + data
  useEffect(() => {
    if (!firebaseReady || !db) {
      // Demo mode: auto sign-in + in-memory sample data.
      setUser({ name: "Demo User", email: "demo@" + ALLOWED_DOMAIN });
      setAuthReady(true);
      const d = makeDemo(500);
      setCollection("contacts", d.contacts);
      setCollection("companies", d.companies);
      return;
    }
    let unsub: Array<() => void> = [];
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const { collection, onSnapshot } = await import("firebase/firestore");
      onAuthStateChanged(getAuth(), (u) => {
        if (u && (!ALLOWED_DOMAIN || (u.email || "").endsWith("@" + ALLOWED_DOMAIN))) {
          setUser({ name: u.displayName || u.email || "", email: u.email || "", uid: u.uid });
          unsub.forEach((f) => f());
          unsub = COLLECTIONS.map((name) =>
            onSnapshot(collection(db!, name), (s) => setCollection(name, s.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))
          );
        } else {
          setUser(null);
          unsub.forEach((f) => f());
          unsub = [];
        }
        setAuthReady(true);
      });
    })();
    return () => unsub.forEach((f) => f());
  }, [setUser, setAuthReady, setCollection]);

  return <>{children}</>;
}
