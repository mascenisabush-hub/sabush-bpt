import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project as apps/tenant (Architecture §9.1: "sharing the
// same Firebase project"). Deliberately a fresh, independent module —
// not an import of apps/tenant/src/lib/firebase.ts — so this app's
// dependency graph never touches apps/tenant/src at all (NFR-1). The
// only direct client-side Firestore read this app ever performs is its
// own platform_operators/{uid} self-read at load, to gate the shell
// (§9.1) — every payment/audit/business read goes through the
// privileged /api/superadmin/* routes instead (ADR-0005 §4).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
