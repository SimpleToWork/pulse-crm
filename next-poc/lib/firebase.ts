// Firebase is optional in the POC: if NEXT_PUBLIC_FIREBASE_* env vars are set we
// use real Firestore; otherwise the app runs on in-memory demo data (see useContacts).
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(cfg.apiKey && cfg.projectId);

let db: Firestore | null = null;
if (firebaseReady) {
  const app: FirebaseApp = getApps()[0] || initializeApp(cfg);
  db = getFirestore(app);
}
export { db };
