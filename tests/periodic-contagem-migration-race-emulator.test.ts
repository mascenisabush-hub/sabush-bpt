// Periodic Contagem Expanded Phase 2 — LEGACY MANUAL ROW MIGRATION RACE
// — Firestore emulator suite.
//
// WHY THIS FILE EXISTS: migratePeriodicLegacyManualRow (AppContext.tsx)
// relies entirely on Firestore's own transaction-retry guarantee to make
// two concurrent migration attempts for the SAME legacy row safe — one
// commits the real migration (destination created, legacy deleted,
// nextOrderIndex advanced if needed); Firestore must automatically retry
// the other against the now-changed state, where it should observe the
// legacy row already gone and correctly take the idempotent "already
// migrated" path, never attempting a second, conflicting write. This has
// never been executed against a real Firestore engine — only reasoned
// about from source, exactly as this project's own emulator-verification
// gate has repeatedly flagged. This file proves or disproves it directly.
//
// HOW TO RUN (emulator already running standalone in another window):
//   npx tsx --test tests/periodic-contagem-migration-race-emulator.test.ts
//
// Not yet executed anywhere as of authoring; awaiting a real run on the
// operator's own machine, following this repository's own established
// convention (see periodic-contagem-shared-live-data-decisions-44-56-
// emulator.test.ts's own header for the precedent this file follows).

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, runTransaction, setDoc, getDoc } from 'firebase/firestore';

const PROJECT_ID = 'sabush-bpt-migration-race-test';
const BIZ = 'biz1';
const OWNER_UID = 'owner1';
const LEGACY_KEY = 'manual:3';
const DESTINATION_KEY = 'manual:migrated-3';

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
  // [Same emulator-settling artifact found and fixed in
  // periodic-contagem-order-index-contention-emulator.test.ts —
  // confirmed the identical root cause here: a prior heavy-contention
  // test can leave the emulator briefly still settling when the next
  // test's cleanup runs, surfacing as a spurious 'Transaction lock
  // timeout' on clearFirestore itself.] One retry after a short pause
  // resolves it reliably.
  try {
    await testEnv.clearFirestore();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await testEnv.clearFirestore();
  }
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
    await setDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', LEGACY_KEY), {
      productName: 'Lite 330ml',
      quantity: '5',
      unit: 'cx',
      costPrice: '100',
      sellingPrice: '150',
      rev: 1,
      lastWriterUid: OWNER_UID,
      state: 'ACCEPTED',
    });
  });
});

// A faithful reproduction of migratePeriodicLegacyManualRow's own
// transaction body (AppContext.tsx) — the exact read-then-conditionally-
// write shape whose concurrency safety this file exists to prove,
// against the same document paths the real function uses. The app's own
// function cannot be imported and executed outside the full Vite/React
// bootstrap (confirmed elsewhere in this repository's own test-writing
// history), so this reproduces its logic directly rather than importing
// it.
async function migrate(uid: string): Promise<'migrated' | 'already-migrated'> {
  const db = testEnv.authenticatedContext(uid).firestore();
  const legacyRef = doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', LEGACY_KEY);
  const destinationRef = doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', DESTINATION_KEY);
  const metaRef = doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic');
  return runTransaction(db, async (tx) => {
    const [legacySnap, metaSnap] = await Promise.all([tx.get(legacyRef), tx.get(metaRef)]);
    if (legacySnap.exists()) {
      // [Bug fix — this test's own earlier version omitted this check]
      // Faithfully matching migratePeriodicLegacyManualRow's own
      // complete logic (AppContext.tsx): even when the legacy row
      // still exists on THIS attempt's own read, a concurrent winner
      // may already have created the destination between this read
      // and this transaction's own commit. Checking here, inside the
      // SAME transaction, is what makes Firestore's retry mechanism
      // correctly re-evaluate this on conflict, rather than blindly
      // attempting a tx.set() that could land as an update against an
      // already-written document under an unrelated rule branch.
      const destSnap = await tx.get(destinationRef);
      if (destSnap.exists()) {
        if (destSnap.data()?.migratedFromLegacyKey === LEGACY_KEY) {
          tx.delete(legacyRef);
          return 'migrated';
        }
        throw new Error('migration-collision: destination exists with unrelated provenance');
      }
      const legacyData = legacySnap.data();
      tx.set(destinationRef, { ...legacyData, migratedFromLegacyKey: LEGACY_KEY, orderIndex: 3 });
      tx.delete(legacyRef);
      const currentNextOrderIndex = metaSnap.exists() ? (metaSnap.data()?.nextOrderIndex ?? 0) : 0;
      if (currentNextOrderIndex <= 3) {
        tx.set(metaRef, { nextOrderIndex: 4 }, { merge: true });
      }
      return 'migrated';
    }
    const destSnap = await tx.get(destinationRef);
    if (destSnap.exists() && destSnap.data()?.migratedFromLegacyKey === LEGACY_KEY) {
      return 'already-migrated';
    }
    throw new Error('migration-collision: legacy gone but destination missing or unrelated — genuine anomaly');
  });
}

describe('Legacy manual row migration — concurrent attempts for the SAME row', () => {
  it('10 simultaneous migration attempts for the identical legacy row: exactly one performs the real migration, every other correctly takes the idempotent already-migrated path — never a conflicting write, never a thrown collision error', async () => {
    const attempts = Array.from({ length: 10 }, () => migrate(OWNER_UID));
    const results = await Promise.all(attempts);
    const migratedCount = results.filter((r) => r === 'migrated').length;
    const alreadyMigratedCount = results.filter((r) => r === 'already-migrated').length;
    assert.equal(migratedCount, 1, 'exactly one concurrent attempt must perform the real migration');
    assert.equal(alreadyMigratedCount, 9, 'every other concurrent attempt must correctly observe the already-migrated state, not throw or retry into a collision');
  });

  it('after the race resolves, exactly one destination document exists, the legacy document is gone, and content is intact', async () => {
    await Promise.all(Array.from({ length: 10 }, () => migrate(OWNER_UID)));
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    const legacySnap = await getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', LEGACY_KEY));
    const destSnap = await getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic', 'items', DESTINATION_KEY));
    assert.equal(legacySnap.exists(), false, 'the legacy document must be gone after migration settles');
    assert.equal(destSnap.exists(), true, 'exactly one destination document must exist');
    assert.equal(destSnap.data()?.productName, 'Lite 330ml', 'content must be intact, not corrupted by the race');
    assert.equal(destSnap.data()?.migratedFromLegacyKey, LEGACY_KEY);
  });

  it('nextOrderIndex correctly advances past the migrated row\'s own orderIndex exactly once, never double-advanced by the losing concurrent attempts', async () => {
    await Promise.all(Array.from({ length: 10 }, () => migrate(OWNER_UID)));
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    const metaSnap = await getDoc(doc(db, 'businesses', BIZ, 'stockCountDrafts', 'periodic'));
    assert.equal(metaSnap.data()?.nextOrderIndex, 4, 'nextOrderIndex must advance to exactly 4 (orderIndex 3 + 1), not further, regardless of how many losing attempts raced against the winner');
  });
});
