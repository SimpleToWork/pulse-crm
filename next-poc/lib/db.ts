// CRUD layer — mirrors the single-file app's dbAdd/dbUpdate/dbRemove.
// Demo mode mutates the in-memory store; with Firebase it writes to Firestore
// (onSnapshot then updates the store). dbRemove is a soft delete.
import { useStore } from "./store";
import { firebaseReady, db } from "./firebase";

let localSeq = 1;
const stamp = () => {
  const email = useStore.getState().user?.email || "demo";
  const now = Date.now();
  return { createdAt: now, updatedAt: now, createdBy: email, deletedAt: null as number | null };
};

export async function dbAdd(coll: string, data: Record<string, any>): Promise<string> {
  const st = useStore.getState();
  if (firebaseReady && db) {
    const { collection, addDoc } = await import("firebase/firestore");
    const ref = await addDoc(collection(db, coll), { ...data, ...stamp() });
    st.toast("Saved", "ok");
    return ref.id;
  }
  const rec = { ...data, ...stamp(), id: "local-" + localSeq++ };
  st.setCollection(coll, [...(st.collections[coll] || []), rec]);
  st.toast("Saved (demo — not persisted)");
  return rec.id;
}

export async function dbUpdate(coll: string, id: string, patch: Record<string, any>): Promise<void> {
  const st = useStore.getState();
  if (firebaseReady && db) {
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, coll, id), { ...patch, updatedAt: Date.now() });
    st.toast("Updated", "ok");
    return;
  }
  st.setCollection(coll, (st.collections[coll] || []).map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)));
  st.toast("Updated");
}

export async function dbRemove(coll: string, id: string, label = "Item"): Promise<void> {
  const st = useStore.getState();
  if (firebaseReady && db) {
    const { doc, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, coll, id), { deletedAt: Date.now() });
  } else {
    st.setCollection(coll, (st.collections[coll] || []).map((x) => (x.id === id ? { ...x, deletedAt: Date.now() } : x)));
  }
  st.toast(label + " deleted");
}
