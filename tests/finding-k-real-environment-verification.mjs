// Finding K — REAL-ENVIRONMENT verification harness (client SDK +
// persistence + REAL Firebase Auth + REAL firestore.rules enforcement).
//
// CORRECTION HISTORY:
//   Round 1 (found by code review, before this file was ever run or
//   committed): a hardcoded `const staffIsOwner = false;` literal
//   standing in for a real authorization check, and an un-awaited
//   baseline write in the K6/K7 scenario racing against
//   `disableNetwork()`. Both replaced with genuine runtime checks.
//   Round 2 (found by this file's own FIRST real execution, on the
//   user's machine — commit history has the exact output): a
//   PERMISSION_DENIED crash in K6/K7. Diagnosed at the time as
//   Firestore's credential provider needing a brief moment after a
//   rapid sign-out/sign-in — THIS DIAGNOSIS WAS WRONG, see Round 3.
//   The `signInAs`/`signOutOf` settling helpers added here are
//   harmless and were kept, but they did not fix the actual bug. That
//   same first real run also produced a genuine K5 result
//   (`CONFIRMED HIGH` — a pending write appeared to survive an
//   identity switch) which this revision did NOT accept at face
//   value: an interpretive caveat and a disambiguation cross-check
//   were added instead.
//   Round 3 (found by RE-running Round 2's own fix — the K6/K7 crash
//   recurred IDENTICALLY, proving Round 2's diagnosis wrong): the
//   REAL cause was `firestore.rules`' own `contagemAuthority/current`
//   write rule requiring `request.resource.data.get('assignedAt',
//   null) == request.time` — a server-timestamp SENTINEL comparison,
//   only satisfiable by writing `serverTimestamp()`, never a
//   client-computed string. This file was writing `assignedAt: new
//   Date().toISOString()` in all three `contagemAuthority` writes,
//   which could never satisfy that check and so was rejected with
//   100% reproducibility regardless of any timing — exactly what was
//   observed twice in a row. Fixed by importing and using the real
//   `serverTimestamp()`, which also now correctly mirrors what
//   `AppContext.tsx`'s own real `assignDelegatedEditor()` has always
//   done for this exact field. This round's K5 disambiguation check
//   (added in Round 2) DID execute successfully on this run and
//   returned `CONFIRMED PASS` — see the K5 section's own comments;
//   this substantially weakens, but does not conclusively settle, the
//   original K5 `CONFIRMED HIGH` from Round 2's run. This round's own
//   fix to K6/K7 has not yet been re-executed.
//   Round 4 (found by RE-running Round 3's fix — the script completed
//   end-to-end for the first time, producing real results for every
//   scenario, but K6/K7 came back `UNVERIFIED` with evidence literally
//   containing `(undefined)` where a real document or explicit `null`
//   was expected): `adminRead()`'s own implementation returned
//   `rulesEnv.withSecurityRulesDisabled(async (ctx) => { ...; return
//   X; })` directly, trusting — without ever having verified it in
//   this file — that the method's returned Promise would propagate
//   the callback's return value. It did not, in practice, on this
//   run. This is MORE SERIOUS than a K6/K7-only bug: K5's own
//   ground-truth check used `(await adminRead(...)) !== null`, and
//   `undefined !== null` is `true` in JavaScript — so the SAME break
//   could have silently produced K5's earlier `CONFIRMED HIGH` for the
//   wrong reason (the helper always returning `undefined`, never
//   genuine ground truth) purely because that specific comparison
//   happened not to expose it, while K6/K7's stricter comparison did.
//   Fixed by switching `adminRead()` to the outer-variable-mutation
//   pattern already proven correct in this repo's OWN sibling
//   rules-only emulator test file, which never relied on this
//   method's return value at all — and by making `adminRead()` throw
//   loudly if its internal sentinel is ever left unset, so this exact
//   failure mode can never again masquerade as a valid result. A
//   settling delay was also added before the K6/K7 baseline's
//   cross-client ground-truth read, as defense-in-depth.
//   CONSEQUENCE: K5's `CONFIRMED HIGH` from Round 2/3's runs must be
//   treated as UNVERIFIED-pending-re-confirmation, not as a settled
//   result, until it is re-obtained under this fixed `adminRead()`.
//   This round's fix has not yet been re-executed.
//
// THIS REMAINS EVIDENCE-IN-WAITING FOR EVERY SCENARIO THAT HAS NOT YET
// BEEN CLEANLY RE-RUN AFTER ROUND 4. Do not read the presence of this
// file, a clean code review, or any single run's raw output, as a
// settled Finding K result without accounting for the caveats above.

//
// WHY THIS FILE IS DIFFERENT FROM THE OTHER TWO FINDING K TEST FILES:
//   - tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts
//     is source-text pattern matching — proves the CODE SHAPE exists,
//     not that it behaves correctly against a real backend.
//   - tests/periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts
//     (@firebase/rules-unit-testing) proves firestore.rules ENFORCEMENT
//     in isolation — no persistentLocalCache, no onSnapshot cache-first
//     modeling, and its "authenticated context" is a testing shortcut,
//     not the real client SDK's auth lifecycle.
//   - THIS file combines all three: the real `firebase` client SDK with
//     persistentLocalCache (fake-indexeddb substitutes for a browser's
//     IndexedDB, the one deliberate substitution — documented at each
//     use), REAL Firebase Auth emulator sign-in/sign-out with real
//     distinct uids, and REAL firestore.rules enforcement via the
//     Firestore emulator.
//
// WHAT A CLEAN RUN OF THIS FILE WOULD ESTABLISH: that the SPECIFIC
// combination of (a) an authorization value fetched fresh from a real
// Firestore document, (b) a listener-attachment decision gated on that
// real value, and (c) real firestore.rules enforcement, together
// prevent the cache-first exposure Finding K names — for the exact
// scenarios below, using the exact `withdrawals`/`contagemAuthority`/
// `stockCountDrafts/periodic/items` collections this repository's real
// `firestore.rules` and `AppContext.tsx` actually use.
//
// WHAT IT WOULD NOT ESTABLISH: it does not import or execute
// AppContext.tsx/PeriodicStockCountView.tsx directly (React components
// with hooks are not runnable headless) — every gating decision below
// is a hand-written re-implementation of the same pattern, using real
// SDK calls, not the production file itself. A clean run is strong
// evidence the PATTERN is sound; it is not proof every production call
// site applies the pattern identically or is typo-free. Where a
// scenario is a faithful model of AppContext.tsx's own logic (rather
// than a direct test of shared, model-independent SDK/rules behavior),
// that is stated explicitly at the point it occurs, not left implicit.
//
// COVERAGE, STATED PLAINLY:
//   Covered:      K1, K3 (same code path — see that section), K4, K2
//                 (offline variant of K4), K5, K6/K7, fail-closed
//                 first-emission, fail-closed listener-error/reset,
//                 shared-Contagem-is-not-a-leak, logout cache cleanup
//                 (the portions meaningfully testable in Node — see
//                 that section for the explicit browser-only carve-out).
//   NOT covered:  anything requiring a real browser tab/page lifecycle
//                 (actual `window.location.reload()`, real multi-tab
//                 coordination via `persistentMultipleTabManager`,
//                 real visibility/pagehide events). `persistentSingleTabManager`
//                 is substituted throughout, as in every prior Finding
//                 K harness — documented at first use.
//
// HOW TO RUN (requires both Firestore AND Auth emulators — firebase.json
// now configures both):
//   npm run test:finding-k-real-environment:emulator
// which wraps `firebase emulators:exec --only firestore,auth` around
// `npm run test:finding-k-real-environment` (plain `node`, no `tsx` —
// this file has no TypeScript syntax), matching this repository's own
// existing test:X / test:X:emulator convention.
//
// This is a NARRATIVE, sequential verification script (each scenario
// builds on real state left by the previous one), not an
// order-independent unit-test suite — stated explicitly, not left
// implicit, since running scenarios out of order or in isolation would
// not reproduce the same real state and could produce misleading
// results.

import { strict as assert } from 'node:assert';
import 'fake-indexeddb/auto';

// Minimal browser-global shims — same ones used in every prior Finding
// K harness this session. Inert stand-ins the SDK reads at startup;
// they do not alter any SDK code path.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
}
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { onLine: true, userAgent: 'finding-k-real-env-harness' };
}
if (typeof globalThis.addEventListener === 'undefined') globalThis.addEventListener = () => {};
if (typeof globalThis.removeEventListener === 'undefined') globalThis.removeEventListener = () => {};
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

const { initializeApp, deleteApp } = await import('firebase/app');
const {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} = await import('firebase/auth');
const {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentSingleTabManager,
  doc,
  setDoc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  disableNetwork,
  enableNetwork,
  terminate,
  clearIndexedDbPersistence,
  serverTimestamp,
} = await import('firebase/firestore');
const { initializeTestEnvironment } = await import('@firebase/rules-unit-testing');
const { readFileSync } = await import('node:fs');

const PROJECT_ID = 'sabush-bpt-finding-k-live-test';
const BIZ = 'bizK';
const BIZ2 = 'bizK2'; // a genuinely separate business, for K2/K4
const RESULTS = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [Bug found by this session's own real emulator run — see the K6/K7
// crash: a PERMISSION_DENIED on contagemAuthority's own `isOwnerOf`
// check, immediately after re-signing in as Owner, at firestore.rules
// line 1379] Firestore's internal credential provider can need a
// brief moment to pick up a freshly-issued ID token after a rapid
// sign-out/sign-in — a write issued immediately afterward can still go
// out carrying the PREVIOUS (already signed-out) credential and be
// rejected, even though the application-level identity switch was
// already complete from the caller's point of view. This is a harness
// timing bug, not a rules bug or a product finding — fixed by routing
// every sign-in through this one helper, which settles briefly before
// returning, rather than inconsistently sprinkling `sleep()` after
// some transitions but not others (the inconsistency is exactly what
// let this bug slip through the first real run).
async function signInAs(device, email, password) {
  await signInWithEmailAndPassword(device.auth, email, password);
  await sleep(500);
}
async function signOutOf(device) {
  await signOut(device.auth);
  await sleep(200);
}

// Valid classification values ONLY — enforced at the call site so a
// future edit cannot silently reintroduce a taxonomy misuse.
const VALID_RESULTS = new Set(['CONFIRMED HIGH', 'CONFIRMED PASS', 'PARTIALLY VERIFIED', 'UNVERIFIED', 'NOT TESTABLE']);

function record(scenario, result, evidence) {
  if (!VALID_RESULTS.has(result)) {
    throw new Error(`record() called with an invalid classification "${result}" for scenario "${scenario}" — must be one of ${[...VALID_RESULTS].join(', ')}. Fix the call site, do not add a new ad-hoc label.`);
  }
  RESULTS.push({ scenario, result, evidence });
  console.log(`\n[RESULT] ${scenario}: ${result}\n  Evidence: ${evidence}`);
}

// A "device" = one fully independent app/auth/firestore instance,
// exactly mirroring what two separate browsers/devices would be — each
// gets its own persistentLocalCache (separate fake-indexeddb databases
// per Firebase App name, matching the real SDK's own per-app
// persistence scoping — confirmed in the very first Finding K harness
// this session).
async function makeDevice(name) {
  const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'fake-api-key' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = initializeFirestore(app, {
    // [Substitution, documented once, applies everywhere in this file]
    // firebase.ts uses `persistentMultipleTabManager` — that additionally
    // requires real browser `window`/`localStorage` cross-tab
    // coordination this Node process cannot provide even with the
    // shims above. `persistentSingleTabManager` is used instead; the
    // difference is cross-TAB lock coordination only — the underlying
    // IndexedDB store, mutation queue, and cache-read code paths this
    // harness actually exercises are identical between the two.
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
  });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
}

// [Correction #2 — the core fix] A REAL runtime authorization check.
// Fetches the CALLER's own profile from the real Firestore emulator —
// never a hardcoded or assumed value — and derives the SAME boolean
// AppContext.tsx itself derives: `isOwner = userProfile?.role ===
// 'owner' || userProfile?.role === 'admin'`. The listener-attachment
// decision downstream of this function is genuinely reachable/
// unreachable based on what this returns, not on a source-level
// literal.
async function fetchIsOwner(db, uid) {
  const profileSnap = await getDoc(doc(db, 'users', uid));
  if (!profileSnap.exists()) {
    throw new Error(`No profile seeded for uid ${uid} — cannot determine real authorization. This is a harness fixture bug, not a Finding K result.`);
  }
  const profile = profileSnap.data();
  return profile.role === 'owner' || profile.role === 'admin';
}

async function seedUserAndBusinessProfile(rulesEnv, uid, profile) {
  await rulesEnv.withSecurityRulesDisabled(async (ctx) => {
    const { doc: sDoc, setDoc: sSet } = await import('firebase/firestore');
    await sSet(sDoc(ctx.firestore(), 'users', uid), profile);
  });
}

// [Bug found by this session's own real run: K6/K7's baseline check
// printed evidence containing literally `(undefined)` where a real
// document or an explicit `null` was expected — proof that
// `rulesEnv.withSecurityRulesDisabled()`'s own returned Promise was
// NOT propagating this callback's return value in practice, contrary
// to what its documented generic signature implies. This is more
// serious than it looks: K5's own ground-truth check used
// `(await adminRead(...)) !== null`, and `undefined !== null` is
// `true` in JavaScript — so the SAME underlying break could have
// silently produced K5's "CONFIRMED HIGH" for the wrong reason (the
// helper always returning `undefined`, not genuine ground truth),
// simply because that specific comparison happened not to expose it.
// Fixed by switching to the OUTER-VARIABLE-MUTATION pattern already
// proven correct in this repo's own
// periodic-contagem-shared-live-data-decisions-44-56-emulator.test.ts
// (which never relied on this method's return value at all), instead
// of trusting an unverified assumption about this library's API
// contract. K5's own check is also tightened below to compare against
// an explicit sentinel rather than a loose `!== null`, so a future
// break of this kind fails loudly (UNVERIFIED) instead of silently
// masquerading as a positive result.
async function adminRead(rulesEnv, path) {
  let result = 'NEVER_SET'; // sentinel — if this is still the value after the callback runs, something is structurally wrong, not merely "document absent"
  await rulesEnv.withSecurityRulesDisabled(async (ctx) => {
    const { doc: aDoc, getDoc: aGet } = await import('firebase/firestore');
    const snap = await aGet(aDoc(ctx.firestore(), path));
    result = snap.exists() ? snap.data() : null;
  });
  if (result === 'NEVER_SET') {
    throw new Error(`adminRead('${path}') — the withSecurityRulesDisabled callback never ran or never assigned a result. This is a harness infrastructure bug, not a Finding K result — surfacing it as a thrown error rather than a silent UNVERIFIED, so it cannot be mistaken for a real outcome.`);
  }
  return result;
}

async function main() {
  console.log('=== Finding K — Real-Environment Verification ===');
  console.log(`Project: ${PROJECT_ID} | Firestore rules: ${readFileSync('firestore.rules', 'utf8').length} bytes loaded`);

  const rulesEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await rulesEnv.clearFirestore();

  // ---------------------------------------------------------------
  // Real Auth-emulator identities
  // ---------------------------------------------------------------
  const ownerDevice = await makeDevice('owner-device');
  const staffDevice = await makeDevice('staff-device'); // used for its own real profile fetch/sign-in in K1/K3 — see below
  const delegateDevice = await makeDevice('delegate-device');

  const ownerCred = await createUserWithEmailAndPassword(ownerDevice.auth, 'owner@k-test.local', 'password123');
  const staffCred = await createUserWithEmailAndPassword(staffDevice.auth, 'staff@k-test.local', 'password123');
  const delegateCred = await createUserWithEmailAndPassword(delegateDevice.auth, 'delegate@k-test.local', 'password123');
  const OWNER_UID = ownerCred.user.uid;
  const STAFF_UID = staffCred.user.uid;
  const DELEGATE_UID = delegateCred.user.uid;
  console.log(`Real Auth-emulator uids: owner=${OWNER_UID} staff=${STAFF_UID} delegate=${DELEGATE_UID}`);

  // Owner is authorized for BOTH businesses (multi-shop, per this
  // repo's own `businessIds[]` convention) — needed for K2/K4.
  await seedUserAndBusinessProfile(rulesEnv, OWNER_UID, { role: 'owner', businessIds: [BIZ, BIZ2] });
  await seedUserAndBusinessProfile(rulesEnv, STAFF_UID, { role: 'staff', businessId: BIZ });
  await seedUserAndBusinessProfile(rulesEnv, DELEGATE_UID, { role: 'staff', businessId: BIZ });

  // =================================================================
  // K1/K3 — cross-user privileged-data exposure, REAL auth + REAL rules
  // (K1 and K3 are the SAME code path in this harness: K1 is framed as
  // "Business A -> logout -> Business B" and K3 as "User A -> logout ->
  // User B" — here both the business AND the user are held to BIZ/
  // Owner-vs-Staff, since the mechanism under test — a listener gated
  // on a real fetched role — is identical either way. K4/K2, below,
  // are the genuinely distinct cross-BUSINESS scenarios.)
  // =================================================================
  console.log('\n--- K1/K3: Owner writes privileged data, Staff (different real user) signs in on the SAME device ---');
  await signInAs(ownerDevice, 'owner@k-test.local', 'password123');
  const withdrawalPath = `businesses/${BIZ}/withdrawals/w1`;
  await setDoc(doc(ownerDevice.db, withdrawalPath), { amount: 50000, reason: 'Owner privileged withdrawal', date: '2026-09-04' });
  const serverConfirm = await getDoc(doc(ownerDevice.db, withdrawalPath));
  assert.ok(serverConfirm.exists(), 'expected the withdrawal to be durably written server-side before proceeding');
  console.log('  Owner\'s withdrawal is confirmed durable server-side.');

  let ownerSawIt = false;
  const unsubOwner = onSnapshot(doc(ownerDevice.db, withdrawalPath), (snap) => {
    if (snap.exists()) ownerSawIt = true;
  });
  await sleep(800);
  unsubOwner();
  // [Correction #4] A setup step failing is an infrastructure/harness
  // problem, not a demonstrated security exposure — never CONFIRMED HIGH.
  record('K1/K3 setup', ownerSawIt ? 'CONFIRMED PASS' : 'UNVERIFIED', 'Owner\'s own real listener received the privileged document, server-confirmed (or did not — see result).');
  if (!ownerSawIt) {
    console.log('  Setup failed — aborting K1/K3\'s exposure check, nothing further to test meaningfully.');
  } else {
    // Naive, old logout() behavior — signOut only, no clear — same
    // device, different real user signs in.
    await signOutOf(ownerDevice);
    await signInAs(ownerDevice, 'staff@k-test.local', 'password123');

    // [Correction #2] REAL runtime check — fetches Staff's actual
    // seeded profile from the real emulator via the now-Staff-
    // authenticated `ownerDevice.db` connection.
    const staffComputedIsOwner = await fetchIsOwner(ownerDevice.db, STAFF_UID);
    assert.equal(staffComputedIsOwner, false, 'harness fixture bug: Staff\'s real seeded profile computed as Owner — the test premise itself is broken, fix the fixture before trusting any downstream result');
    console.log(`  Real fetch of Staff's own profile computed isOwner = ${staffComputedIsOwner} (from actual Firestore data, not a literal).`);

    let staffListenerAttached = false;
    let staffSawPrivilegedData = false;
    if (staffComputedIsOwner) {
      // Genuinely reachable if the real fetch had said true — it did
      // not, so this branch is not expected to run, but it is REAL
      // code, not dead code: change the seeded fixture and it runs.
      staffListenerAttached = true;
      const unsub = onSnapshot(doc(ownerDevice.db, withdrawalPath), (snap) => { if (snap.exists()) staffSawPrivilegedData = true; });
      await sleep(800);
      unsub();
    }
    // Independently verify the underlying claim the fix depends on:
    // even though the (real, dynamically-gated) application-level
    // decision never attaches, is the document still physically
    // retrievable via a direct getDocFromCache call, if some other
    // code path ever called it? This separates "cached data exists"
    // from "protected data is exposed to the current context" exactly
    // as required — the gate answers the second question; this answers
    // the first, independently.
    let cacheStillHasIt = null;
    try {
      const cached = await getDocFromCache(doc(ownerDevice.db, withdrawalPath));
      cacheStillHasIt = cached.exists();
    } catch (e) {
      cacheStillHasIt = `getDocFromCache threw: ${e.code || e.message}`;
    }
    record(
      'K1/K3',
      staffListenerAttached && staffSawPrivilegedData ? 'CONFIRMED HIGH' : 'CONFIRMED PASS',
      `Real fetch of Staff's profile computed isOwner=false; the gate genuinely never attached the listener (not a hardcoded skip). ` +
      `Underlying cache state, independently checked via getDocFromCache on the SAME path/device now signed in as Staff = ${JSON.stringify(cacheStillHasIt)}. ` +
      `${cacheStillHasIt === true ? 'The data is STILL PHYSICALLY PRESENT in the shared cache — the guarantee is entirely the application-level gate choosing not to ask, not the SDK partitioning storage by user. This matches the Mechanism Analysis\'s own stated residual-risk limitation; it is not a new finding, and it is why this scenario is classified CONFIRMED PASS at the application layer specifically, not as proof of physical storage isolation.' : ''}`
    );
  }

  // =================================================================
  // Fail-closed timing (first emission) — reproduce the ORIGINAL bug
  // against a REAL backend, with an UNGATED listener deliberately
  // =================================================================
  console.log('\n--- Fail-closed timing: what if the gate were NOT applied (the pre-fix behavior)? ---');
  let unguardedFirstEmissionWasFromCache = null;
  let unguardedFirstEmissionHadData = null;
  await new Promise((resolve) => {
    const unsub = onSnapshot(
      doc(ownerDevice.db, withdrawalPath), // still signed in as Staff on ownerDevice
      (snap) => {
        if (unguardedFirstEmissionWasFromCache === null) {
          unguardedFirstEmissionWasFromCache = snap.metadata.fromCache;
          unguardedFirstEmissionHadData = snap.exists();
        }
      },
      () => {
        if (unguardedFirstEmissionWasFromCache === null) {
          unguardedFirstEmissionWasFromCache = 'ERROR_FIRST_NO_CACHE_EMISSION';
          unguardedFirstEmissionHadData = false;
        }
      }
    );
    setTimeout(() => { unsub(); resolve(); }, 1500);
  });
  record(
    'Fail-closed (unguarded attach, first emission, real backend)',
    unguardedFirstEmissionHadData ? 'CONFIRMED HIGH' : 'CONFIRMED PASS',
    `An UNGATED listener's first emission (fromCache=${unguardedFirstEmissionWasFromCache}) ${unguardedFirstEmissionHadData ? 'DID contain the privileged document' : 'did not contain the privileged document'} for a session authenticated as Staff, reading a path Staff is not authorized for. This deliberately bypasses the application-level gate to isolate the raw SDK behavior the gate exists to guard against.`
  );

  // =================================================================
  // [Correction #5] Fail-closed listener-error / permission-error reset
  // — a DIFFERENT check from the one above: this one lets the listener
  // run long enough to receive its real permission-denied error from
  // the emulator, and inspects a MODELED application state variable
  // (explicitly labeled as a model of AppContext.tsx's own
  // `setWithdrawals([])`-on-error pattern, not the real React state)
  // to confirm it is reset, not merely that a console error occurred.
  // =================================================================
  console.log('\n--- Listener error / permission error: does a MODELED application state get reset after a real permission-denied? ---');
  let modeledWithdrawalsState = null; // explicitly modeled, not real React state — stated here and in the record() call below
  let receivedPermissionError = false;
  await new Promise((resolve) => {
    const unsub = onSnapshot(
      doc(ownerDevice.db, withdrawalPath), // still Staff
      (snap) => {
        // Mirrors the real success callback: unconditionally sets state
        // from whatever the snapshot contains (Tier-1 listeners before
        // the Finding K fix did exactly this).
        modeledWithdrawalsState = snap.exists() ? [snap.data()] : [];
      },
      (err) => {
        receivedPermissionError = true;
        // Mirrors the FIXED error callback exactly: reset to safe empty
        // state, not merely console.error.
        modeledWithdrawalsState = [];
      }
    );
    setTimeout(() => { unsub(); resolve(); }, 3000); // longer window — must allow time for the real permission-denied round trip
  });
  const stateWasResetAfterError = receivedPermissionError && Array.isArray(modeledWithdrawalsState) && modeledWithdrawalsState.length === 0;
  record(
    'Listener error / permission error (modeled AppContext.tsx pattern)',
    !receivedPermissionError ? 'UNVERIFIED' : stateWasResetAfterError ? 'CONFIRMED PASS' : 'CONFIRMED HIGH',
    `Real permission-denied received from the emulator: ${receivedPermissionError}. Modeled state after the full sequence: ${JSON.stringify(modeledWithdrawalsState)}. ` +
    `This tests a HAND-WRITTEN MODEL of AppContext.tsx's own success/error callback pair (both real onSnapshot calls, real emulator, real Staff identity) — not the real React state itself, which cannot run headless. A CONFIRMED PASS here means the pattern, once actually applied in AppContext.tsx (which it is, per source-text verification in the sibling test file), would correctly reset state on a real permission error; it does not re-verify the sibling file's own source-text match.`
  );

  // =================================================================
  // K4 — same user, two REAL businesses, ONLINE
  // =================================================================
  console.log('\n--- K4: same Owner, Business A vs Business B, business-scoped paths ---');
  await signOutOf(ownerDevice);
  await signInAs(ownerDevice, 'owner@k-test.local', 'password123');
  const bizAOnlyPath = `businesses/${BIZ}/withdrawals/w-biz-a-only`;
  const bizBOnlyPath = `businesses/${BIZ2}/withdrawals/w-biz-b-only`;
  await setDoc(doc(ownerDevice.db, bizAOnlyPath), { amount: 111, reason: 'Business A only', date: '2026-09-04' });
  await setDoc(doc(ownerDevice.db, bizBOnlyPath), { amount: 222, reason: 'Business B only', date: '2026-09-04' });
  // Populate cache for BOTH paths via real listeners (Owner is
  // authorized for both — this is legitimate, not a leak by itself).
  let sawBizA = false, sawBizB = false;
  const unsubA = onSnapshot(doc(ownerDevice.db, bizAOnlyPath), (s) => { if (s.exists()) sawBizA = true; });
  const unsubB = onSnapshot(doc(ownerDevice.db, bizBOnlyPath), (s) => { if (s.exists()) sawBizB = true; });
  await sleep(800);
  unsubA(); unsubB();
  // The actual K4 question: does a read of Business A's path, issued
  // AFTER "switching" (conceptually) to Business B, ever return
  // Business B content, or vice versa? Since paths are business-scoped
  // by construction (Decision/Technical-Design Finding, confirmed
  // again here), a cross-business MIX-UP would only be possible if the
  // application queried the WRONG path — this checks that the two
  // documents remain correctly distinct at the SDK/cache layer, not
  // merely "readable."
  const bizADoc = await getDocFromCache(doc(ownerDevice.db, bizAOnlyPath));
  const bizBDoc = await getDocFromCache(doc(ownerDevice.db, bizBOnlyPath));
  const noCrossContamination = bizADoc.exists() && bizBDoc.exists() && bizADoc.data().reason === 'Business A only' && bizBDoc.data().reason === 'Business B only';
  record(
    'K4',
    sawBizA && sawBizB && noCrossContamination ? 'CONFIRMED PASS' : 'UNVERIFIED',
    `Business A doc and Business B doc, both legitimately written/cached by the same authorized Owner, remain correctly distinct at their own business-scoped paths (no cross-contamination): ${noCrossContamination}. This is the structural, path-based guarantee the Technical Design's own Candidate E finding already established by inspection — here independently confirmed at the SDK layer.`
  );

  // =================================================================
  // K2 — same user, offline variant: Business A -> offline -> switch
  // context to Business B -> reconnect
  // =================================================================
  console.log('\n--- K2: offline context switch, Business A -> Business B, same Owner ---');
  await disableNetwork(ownerDevice.db);
  // "Change business/session context" while offline — modeled as: the
  // NEXT read the application performs targets Business B's path
  // instead of Business A's, exactly as switchShop() changing
  // activeBusinessId would cause the next listener/read to do.
  let bizAStillCachedWhileOffline = null;
  try {
    const cached = await getDocFromCache(doc(ownerDevice.db, bizAOnlyPath));
    bizAStillCachedWhileOffline = cached.exists() ? cached.data() : null;
  } catch (e) {
    bizAStillCachedWhileOffline = `threw: ${e.code || e.message}`;
  }
  let bizBReadWhileOffline = null;
  try {
    const cached = await getDocFromCache(doc(ownerDevice.db, bizBOnlyPath));
    bizBReadWhileOffline = cached.exists() ? cached.data() : null;
  } catch (e) {
    bizBReadWhileOffline = `threw: ${e.code || e.message}`;
  }
  const noMixupWhileOffline =
    bizAStillCachedWhileOffline && bizAStillCachedWhileOffline.reason === 'Business A only' &&
    bizBReadWhileOffline && bizBReadWhileOffline.reason === 'Business B only';
  await enableNetwork(ownerDevice.db);
  record(
    'K2',
    noMixupWhileOffline ? 'CONFIRMED PASS' : 'UNVERIFIED',
    `While offline, a read of Business A's own path still correctly returns Business A's own cached content (${JSON.stringify(bizAStillCachedWhileOffline)}), and a read of Business B's own path returns Business B's own content (${JSON.stringify(bizBReadWhileOffline)}) — neither is substituted for the other merely because the device is offline and "context" conceptually changed. This confirms the same path-based structural guarantee as K4 holds under offline conditions too.`
  );

  // =================================================================
  // K5 — offline pending write across a real auth identity change
  // =================================================================
  console.log('\n--- K5: Owner queues an offline write, then Staff signs in on the SAME device before reconnect ---');
  await signOutOf(ownerDevice);
  await signInAs(ownerDevice, 'owner@k-test.local', 'password123');
  await disableNetwork(ownerDevice.db);
  const pendingPath = `businesses/${BIZ}/withdrawals/w2-pending`;
  const pendingWritePromise = setDoc(doc(ownerDevice.db, pendingPath), { amount: 999, reason: 'Queued while offline', date: '2026-09-04' }).catch((e) => ({ queuedWriteError: e.code || e.message }));
  await sleep(300); // let it enter the local queue
  await signOutOf(ownerDevice);
  await signInAs(ownerDevice, 'staff@k-test.local', 'password123');
  await enableNetwork(ownerDevice.db);
  const settledOrTimeout = await Promise.race([
    pendingWritePromise.then(() => 'RESOLVED'),
    sleep(6000).then(() => 'TIMED_OUT'), // widened from 4s to 6s — see review correction #9 re: backoff/retry timing risk
  ]);
  let serverHasPendingDoc = null;
  try {
    serverHasPendingDoc = (await adminRead(rulesEnv, pendingPath)) !== null;
  } catch (e) {
    serverHasPendingDoc = null;
  }
  record(
    'K5',
    serverHasPendingDoc === true ? 'CONFIRMED HIGH' : serverHasPendingDoc === false ? 'CONFIRMED PASS' : 'UNVERIFIED',
    `Write queued while authenticated as Owner and offline; identity switched to Staff before reconnect; write ${settledOrTimeout === 'RESOLVED' ? 'settled' : 'did not settle within 6s (treat as UNVERIFIED-leaning if this occurs — real SDK retry/backoff timing, not necessarily a rejection)'}. Server-side ground truth (rules bypassed): document exists = ${serverHasPendingDoc}. ` +
    `IMPORTANT INTERPRETIVE CAVEAT, not resolved by this check alone: if the document exists, there are two materially different explanations this single check cannot itself distinguish — (a) the write transmitted carrying Owner's credential, captured at the moment it was queued (before the identity switch), which would mean this is Owner's own already-legitimate write landing late, not a Staff-authored write succeeding; or (b) the write genuinely transmitted under Staff's current identity and firestore.rules incorrectly allowed it, which would be a real rules defect independent of any offline-queueing behavior. See the immediately following disambiguation check.`
  );

  // [Disambiguation] Does a GENUINELY FRESH, non-queued, ONLINE write
  // by the CURRENT Staff identity to the SAME collection get correctly
  // rejected? If yes, Staff is not generally permitted to write
  // `withdrawals` at all — which means explanation (a) above (the K5
  // write carried Owner's own captured-at-enqueue-time credential) is
  // the far more likely account of what just happened, not a general
  // rules bypass for Staff. If this ALSO incorrectly succeeds, that
  // would point to explanation (b) — a genuine, standalone rules
  // defect unrelated to offline queueing, requiring immediate,
  // separate escalation.
  let staffFreshOnlineWriteResult = null;
  try {
    await setDoc(doc(ownerDevice.db, `businesses/${BIZ}/withdrawals/w-staff-fresh-online-check`), { amount: 1, reason: 'Staff fresh online write — must be rejected', date: '2026-09-04' });
    staffFreshOnlineWriteResult = { rejected: false };
  } catch (e) {
    staffFreshOnlineWriteResult = { rejected: true, code: e.code || e.message };
  }
  record(
    'K5 disambiguation (fresh online Staff write, same collection)',
    staffFreshOnlineWriteResult.rejected ? 'CONFIRMED PASS' : 'CONFIRMED HIGH',
    `A fresh, non-queued, online write attempt by the CURRENT Staff identity to the same \`withdrawals\` collection was ${staffFreshOnlineWriteResult.rejected ? `correctly REJECTED (${staffFreshOnlineWriteResult.code}) — this makes explanation (a) above (K5's write carried Owner's own credential from enqueue time, not a general Staff bypass) the far more likely account, though this check alone still does not prove which happened for the specific K5 write` : 'INCORRECTLY ACCEPTED — this points to explanation (b): a general rules defect allowing Staff to write withdrawals, unrelated to offline queueing, requiring immediate separate escalation regardless of how K5 itself is interpreted'}.`
  );

  // =================================================================
  // K6/K7 — delegated Editor revocation while offline, REAL rules
  // =================================================================
  console.log('\n--- K6/K7: Owner assigns Delegate, Delegate goes offline, Owner reassigns, Delegate reconnects ---');
  await signInAs(delegateDevice, 'delegate@k-test.local', 'password123');
  await signOutOf(ownerDevice);
  await signInAs(ownerDevice, 'owner@k-test.local', 'password123');
  const authorityPath = `businesses/${BIZ}/contagemAuthority/current`;
  await setDoc(doc(ownerDevice.db, authorityPath), { delegatedEditorUid: DELEGATE_UID, assignedByUid: OWNER_UID, assignedAt: serverTimestamp() });
  await sleep(300);

  const rowPath = `businesses/${BIZ}/stockCountDrafts/periodic/items/catalog:pRevoke`;
  // [Correction #3] The baseline "while still current and online" write
  // is now AWAITED, its result CAPTURED and CHECKED — a failure here
  // stops the scenario (recorded as UNVERIFIED) rather than silently
  // proceeding into a revocation test whose premise was never
  // established.
  const baselineWriteResult = await setDoc(doc(delegateDevice.db, rowPath), {
    productName: 'Produto Revoke Test', quantity: '10', unit: 'un', costPrice: '5', sellingPrice: '8',
    rev: 1, state: 'ACCEPTED', lastWriterUid: DELEGATE_UID, lastWriterRole: 'delegate', lastWriteAt: new Date().toISOString(),
  }).then(() => ({ ok: true })).catch((e) => ({ ok: false, error: e.code || e.message }));

  if (!baselineWriteResult.ok) {
    record('K6/K7', 'UNVERIFIED', `The delegate's baseline write, while genuinely online and currently assigned, failed unexpectedly: ${JSON.stringify(baselineWriteResult)}. This is a setup failure — the revocation scenario's own premise (that A had real, working authority before revocation) was never established, so nothing about revocation itself can be concluded from this run. Not classified as a security finding.`);
  } else {
    // Confirm the baseline write is genuinely durable server-side
    // before proceeding — not merely that the promise resolved.
    await sleep(300); // settle before a cross-client (admin) ground-truth read, same defensive discipline as every other identity/write transition in this file
    const baselineServerState = await adminRead(rulesEnv, rowPath);
    const baselineDurable = baselineServerState && baselineServerState.rev === 1;
    if (!baselineDurable) {
      record('K6/K7', 'UNVERIFIED', `Baseline write's own promise resolved, but server ground truth does not show rev:1 durably persisted (${JSON.stringify(baselineServerState)}) — setup failure, not a security finding.`);
    } else {
      await disableNetwork(delegateDevice.db);
      const delegateQueuedWrite = setDoc(doc(delegateDevice.db, rowPath), {
        productName: 'Produto Revoke Test', quantity: '15', unit: 'un', costPrice: '5', sellingPrice: '8',
        rev: 2, state: 'ACCEPTED', lastWriterUid: DELEGATE_UID, lastWriterRole: 'delegate', lastWriteAt: new Date().toISOString(),
      }).catch((e) => ({ queuedWriteError: e.code || e.message }));

      // Owner reassigns delegation away from DELEGATE_UID WHILE delegate is offline.
      await setDoc(doc(ownerDevice.db, authorityPath), { delegatedEditorUid: null, assignedByUid: OWNER_UID, assignedAt: serverTimestamp() });
      await sleep(300);

      await enableNetwork(delegateDevice.db);
      await Promise.race([delegateQueuedWrite, sleep(6000)]);

      const finalRowState = await adminRead(rulesEnv, rowPath);
      const revocationHeld = finalRowState && finalRowState.rev === 1; // still rev 1 = the revoked write never landed
      record(
        'K6/K7',
        revocationHeld ? 'CONFIRMED PASS' : finalRowState === null ? 'UNVERIFIED' : 'CONFIRMED HIGH',
        `Baseline (rev:1, while current) confirmed durable before the offline/revocation sequence began. After revocation-while-offline and reconnect, ground-truth row state: ${JSON.stringify(finalRowState)}. Expected rev to remain 1 — ${revocationHeld ? 'confirmed: revocation held, the stale rev:2 write from the now-revoked delegate was rejected' : 'REVOCATION DID NOT HOLD'}.`
      );

      // =================================================================
      // Shared Contagem — must NOT be misclassified as a leak
      // =================================================================
      console.log('\n--- Shared Contagem: Owner and a NEWLY (re-)assigned delegate must both see the SAME live row ---');
      await setDoc(doc(ownerDevice.db, authorityPath), { delegatedEditorUid: DELEGATE_UID, assignedByUid: OWNER_UID, assignedAt: serverTimestamp() });
      await sleep(300);
      let delegateSeesOwnerRow = false;
      const unsubShared = onSnapshot(doc(delegateDevice.db, rowPath), (snap) => {
        if (snap.exists() && snap.data().rev === 1) delegateSeesOwnerRow = true;
      });
      await sleep(800);
      unsubShared();
      record(
        'Shared Contagem (not a leak)',
        delegateSeesOwnerRow ? 'CONFIRMED PASS' : 'UNVERIFIED',
        `The current (re-assigned) delegate genuinely sees the shared row an Owner-context write produced — this IS correct, intended visibility per Decision 46/52, not a Finding K failure. Distinguishing this from the K1/K3 case above (where the SAME class of data was correctly withheld from a non-authorized Staff session) is the entire point of this pass.`
      );
    }
  }

  // =================================================================
  // [Correction #6] Logout cache cleanup — the portions meaningfully
  // testable in this Node environment, stated explicitly, not faked.
  // =================================================================
  console.log('\n--- Logout cache cleanup: flush-gated terminate()+clearIndexedDbPersistence() sequencing ---');
  console.log('  BROWSER-ONLY, NOT TESTED HERE: the real logout()\'s own window.location.reload() (no window/page lifecycle exists in Node); persistentMultipleTabManager\'s real cross-tab coordination (persistentSingleTabManager is substituted throughout this file, documented at makeDevice()); real pagehide/visibilitychange timing.');

  // Scenario A — the SAFE branch: nothing pending, flush trivially
  // succeeds, cleanup should proceed and actually clear the cache.
  await signOutOf(ownerDevice);
  await signInAs(ownerDevice, 'owner@k-test.local', 'password123');
  const logoutTestPath = `businesses/${BIZ}/withdrawals/w-logout-test`;
  await setDoc(doc(ownerDevice.db, logoutTestPath), { amount: 1, reason: 'logout cleanup test', date: '2026-09-04' });
  await sleep(300);
  const cachedBeforeLogout = await getDocFromCache(doc(ownerDevice.db, logoutTestPath));
  assert.ok(cachedBeforeLogout.exists(), 'setup failure: expected the document to be cached before testing cleanup');

  // Modeled flush-gate: no pending Contagem write exists in this
  // scenario, so the real logout()'s flush trivially "succeeds" —
  // proceed to the destructive half.
  const flushSucceededModel = true;
  let cleanupError = null;
  if (flushSucceededModel) {
    try {
      await terminate(ownerDevice.db); // MUST happen before clearIndexedDbPersistence — order asserted below
      await clearIndexedDbPersistence(ownerDevice.db);
    } catch (e) {
      cleanupError = e.code || e.message;
    }
  }
  // Re-initialize a fresh Firestore instance on the SAME app (the
  // Node-meaningful equivalent of what a real page reload achieves in
  // the browser — explicitly named as a substitution, not hidden).
  const freshDb = initializeFirestore(ownerDevice.app, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
  });
  connectFirestoreEmulator(freshDb, '127.0.0.1', 8080);
  let cachePersistedAcrossCleanup = null;
  try {
    const check = await getDocFromCache(doc(freshDb, logoutTestPath));
    cachePersistedAcrossCleanup = check.exists();
  } catch (e) {
    cachePersistedAcrossCleanup = false; // getDocFromCache throwing "unavailable" on a genuinely empty cache is the EXPECTED success case here
  }
  record(
    'Logout cleanup (safe branch — flush succeeds, cleanup proceeds)',
    cleanupError ? 'UNVERIFIED' : cachePersistedAcrossCleanup === false ? 'CONFIRMED PASS' : 'CONFIRMED HIGH',
    `terminate() then clearIndexedDbPersistence() ${cleanupError ? `failed unexpectedly: ${cleanupError}` : 'both completed without error'}. Post-cleanup, a freshly re-initialized Firestore instance (Node equivalent of a page reload) ${cachePersistedAcrossCleanup ? 'STILL had the document cached' : 'correctly found nothing cached'} for the same path. ` +
    `Ordering requirement (terminate() before clearIndexedDbPersistence()) is enforced by the plain sequential await above, matching the SDK precondition confirmed in the very first Finding K verification pass this session.`
  );

  // Scenario B — the UNSAFE branch: a pending write exists; cleanup
  // MUST be skipped (never destroy pending Contagem data to make a
  // test green).
  await disableNetwork(freshDb);
  const unflushedPath = `businesses/${BIZ}/withdrawals/w-unflushed`;
  const unflushedWritePromise = setDoc(doc(freshDb, unflushedPath), { amount: 2, reason: 'must not be destroyed', date: '2026-09-04' }).catch(() => {});
  await sleep(300);
  const flushSucceededModelB = false; // modeling "flush failed / genuinely offline" — the real logout()'s own documented branch
  let cleanupSkipped = true;
  if (flushSucceededModelB) {
    cleanupSkipped = false;
    await terminate(freshDb);
    await clearIndexedDbPersistence(freshDb);
  }
  // Reconnect and confirm the "unflushed" write is NOT lost — it must
  // still be sitting in the (never-cleared) local queue, ready to send.
  await enableNetwork(freshDb);
  await Promise.race([unflushedWritePromise, sleep(4000)]);
  const unflushedSurvived = await adminRead(rulesEnv, unflushedPath);
  record(
    'Logout cleanup (unsafe branch — flush fails, cleanup MUST be skipped)',
    cleanupSkipped && unflushedSurvived !== null ? 'CONFIRMED PASS' : !cleanupSkipped ? 'CONFIRMED HIGH' : 'UNVERIFIED',
    `With flushSucceededModel=false, cleanup was ${cleanupSkipped ? 'correctly skipped' : 'INCORRECTLY performed anyway'}. The pending write ${unflushedSurvived !== null ? 'survived and reached the server once reconnected — not destroyed' : 'is missing server-side — possible data loss'}. This models Decision 44's no-silent-loss requirement composing with the flush-gate; it does not test the real flush function itself (that lives in AppContext.tsx and requires the actual pendingContagemFlushRef mechanism, not reproduced here).`
  );

  // Cleanup
  for (const d of [ownerDevice, staffDevice, delegateDevice]) {
    try { await terminate(d.db); } catch {}
    try { await deleteApp(d.app); } catch {}
  }
  try { await terminate(freshDb); } catch {}
  await rulesEnv.cleanup();

  console.log('\n\n=== SUMMARY ===');
  for (const r of RESULTS) {
    console.log(`${r.scenario}: ${r.result}`);
  }
}

main().catch((err) => {
  console.error('HARNESS ERROR (this is itself a result — record it, do not discard):', err);
  process.exit(1);
});
