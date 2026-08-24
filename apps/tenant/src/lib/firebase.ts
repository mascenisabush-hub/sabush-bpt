import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
console.log('[Firebase Init] Config in use:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 8)}...` : undefined,
  firestoreDatabaseId: (firebaseConfig as any).firestoreDatabaseId
});

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// [Stock Count Data-Loss Resilience — Decision 38, Implementation
// Authorization §2 item 1] Firestore's own persistent local cache,
// enabled here because this is the single shared `db` instance every
// Firestore read/write in the tenant app uses — there is no SDK-level
// way to scope this to Periodic Contagem alone (Rule 8 Assessment §8;
// Implementation Authorization §2 item 1, §5). `persistentMultipleTabManager`
// (not `persistentSingleTabManager`) is used so that a second tab of
// the SAME user's own browser/device does not force-fail persistence —
// this coordinates the local cache across tabs of one user only; it is
// NOT authorization for multi-user or multi-device collaborative
// editing of any kind (Implementation Authorization §3, §6).
//
// `initializeFirestore` may only be called once per `FirebaseApp`
// instance — a second call (e.g. a module re-evaluation under Vite
// HMR, or `getApps().length` already being non-zero from a prior
// evaluation in the same process) throws. The existing
// `databaseId`-conditional construction below is preserved exactly;
// the try/catch here only guards against re-initialization, falling
// back to the plain (already-initialized) instance via `getFirestore`
// rather than crashing — no different Firestore instance, no
// different behavior, than what `getFirestore` already returned before
// this change in that fallback case.
const firestoreDatabaseId = (firebaseConfig as any)?.firestoreDatabaseId as string | undefined;
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    },
    firestoreDatabaseId
  );
} catch {
  firestoreDb = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}
export const db = firestoreDb;

