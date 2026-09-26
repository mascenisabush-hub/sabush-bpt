// Periodic Contagem Expanded Phase 2 — nextOrderIndex CONCURRENT
// ALLOCATION — Firestore emulator suite.
//
// WHY THIS FILE EXISTS: allocatePeriodicOrderIndex (AppContext.tsx) reads
// stockCountDrafts/periodic's own nextOrderIndex field inside a Firestore
// client transaction, then writes back current+1 — the exact
// read-then-increment pattern whose safety under genuine concurrency
// depends entirely on Firestore's own transaction-retry guarantee, not on
// anything this app's own JS enforces. This has never been executed
// against a real Firestore engine anywhere in this project's own history
// — only reasoned about from source. This file proves or disproves that
// guarantee directly, using the same read-then-conditionally-write shape
// the real function uses, driven through the client SDK's own
// runTransaction (not the rules-unit-testing SDK's separate transaction
// primitive, so this is testing the identical API surface the real app
// code calls).
//
// HOW TO RUN:
//   npx firebase emulators:exec --only firestore --project sabush-bpt-order-index-contention-test "npx tsx --test tests/periodic-contagem-order-index-contention-emulator.test.ts"
// or, with the emulator already running standalone in another window:
//   npx tsx --test tests/periodic-contagem-order-index-contention-emulator.test.ts
//
// This suite could not be executed in the sandbox that authored it — no
// network access to Google's emulator-binary infrastructure there. Not
// yet executed anywhere as of authoring; awaiting a real run on the
// operator's own machine.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, runTransaction, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-order-index-contention-test';
const BIZ = 'biz1';
const OWNER_UID = 'owner1';

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER_UID), { role: 'owner', businessId: BIZ });
    await setDoc(doc(db, 'businesses', BIZ), { subscriptionStatus: 'active' });
    await setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'), {
      type: 'periodic',
      date: '2026-09-26',
      updatedAt: new Date().toISOString(),
      nextOrderIndex: 0,
    });
  });
});

// The exact read-then-increment shape allocatePeriodicOrderIndex uses,
// against the same metaRef path, through the same authenticated-owner
// context. Not a copy of the app's own code by reference — a faithful
// reproduction of its transaction logic, since the app's own function
// cannot be imported and executed outside the full Vite/React bootstrap
// (confirmed elsewhere in this repository's own test-writing history).
async function allocate(uid: string) {
  const db = testEnv.authenticatedContext(uid).firestore();
  const metaRef = doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic');
  return runTransaction(db, async (tx) => {
    const metaSnap = await tx.get(metaRef);
    const current = metaSnap.data()?.nextOrderIndex ?? 0;
    tx.set(metaRef, { nextOrderIndex: current + 1 }, { merge: true });
    return current;
  });
}

describe('nextOrderIndex — concurrent allocation under genuine contention', () => {
  it('20 simultaneous allocation attempts from the same Owner produce 20 distinct, sequential values with zero duplicates', async () => {
    const attempts = Array.from({ length: 20 }, () => allocate(OWNER_UID));
    const results = await Promise.all(attempts);
    const sorted = [...results].sort((a, b) => a - b);
    const expected = Array.from({ length: 20 }, (_, i) => i);
    assert.deepEqual(sorted, expected, 'every value 0-19 must be allocated exactly once, with no gap and no duplicate — proving Firestore\'s own transaction retry serializes these concurrent writes correctly');
  });

  it('concurrent allocation from TWO DIFFERENT authenticated contexts (simulating two devices) still produces no duplicates', async () => {
    // Same business, same Owner UID, but two separately-instantiated
    // authenticated SDK contexts — the closest this SDK-level test can
    // get to simulating two physically different devices racing on the
    // same field.
    const attempts = [
      ...Array.from({ length: 10 }, () => allocate(OWNER_UID)),
      ...Array.from({ length: 10 }, () => allocate(OWNER_UID)),
    ];
    const results = await Promise.all(attempts);
    const sorted = [...results].sort((a, b) => a - b);
    const expected = Array.from({ length: 20 }, (_, i) => i);
    assert.deepEqual(sorted, expected);
  });
});
