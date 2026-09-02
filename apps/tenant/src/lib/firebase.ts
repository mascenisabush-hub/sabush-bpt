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
//
// [Bug fix — Contagem data-loss incident, root-cause investigation]
// This catch previously swallowed EVERY error unconditionally, with no
// logging at all. The Stock Count Data-Loss Resilience system (Decision
// 38-40: 800ms per-row autosave, pagehide/visibilitychange flush) relies
// entirely on this persistent local cache actually being active — without
// it, a debounced write or an interruption flush is just an ordinary
// in-flight network request racing the tab's teardown, with nothing
// queued locally to survive an incomplete request. On a device/browser
// where persistence genuinely fails to initialize (Safari/iOS Private
// Browsing, storage-restricted WebViews, quota/corruption issues), the
// app was silently reverting to the pre-Decision-38 loss profile with no
// signal to anyone that this had happened — this is the confirmed
// mechanism behind at least one reported "lost all data on refresh"
// incident. Only the expected re-init error (message contains "already
// been called" / "already exists") is now treated as harmless; any other
// failure is logged loudly so it can be diagnosed and monitored, rather
// than silently degrading the safety net this feature depends on.
const firestoreDatabaseId = (firebaseConfig as any)?.firestoreDatabaseId as string | undefined;
let firestoreDb;
// [Data-loss visibility, part 2] Whether the persistent local cache is
// actually active this session. Consumed by Contagem/Initial Stock Count
// views to show an in-app warning — a console.error alone is invisible
// to the actual Owner/operator, who is the one at real risk of a
// refresh/interruption wiping unsent draft edits when this is false.
export let isFirestorePersistenceActive = false;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    },
    firestoreDatabaseId
  );
  isFirestorePersistenceActive = true;
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  const isExpectedReinit = /already been called|already exists|already initialized/i.test(message);
  if (isExpectedReinit) {
    // A prior evaluation of this module in the same process already
    // succeeded in turning persistence on (e.g. Vite HMR re-running this
    // file) — this catch is just re-fetching that same, already-persistent
    // instance via getFirestore below, so the cache is still active.
    isFirestorePersistenceActive = true;
  } else {
    // [Data-loss visibility] This is the case that matters: persistence
    // genuinely failed to turn on for this session. Every Periodic
    // Contagem/Initial Stock draft write in this session will now be
    // memory-only and vulnerable to exactly the refresh/interruption
    // loss the autosave system was built to prevent. Logged loudly
    // (not swallowed) so it shows up in error monitoring instead of
    // only ever being visible as an unexplained client complaint.
    console.error(
      '[Firebase Init] Firestore persistent local cache failed to initialize — ' +
        'falling back to memory-only Firestore. Draft autosave for Stock Count ' +
        '(Contagem) will NOT survive a page refresh or tab close in this session. ' +
        'Likely causes: Private/Incognito browsing, a storage-restricted in-app ' +
        'browser, or IndexedDB quota/corruption on this device.',
      err
    );
  }
  firestoreDb = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}
export const db = firestoreDb;

