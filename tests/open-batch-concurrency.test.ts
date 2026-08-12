// [Fix #10] Emulator concurrency verification — open-batch supersession.
//
// WHY THIS FILE EXISTS: tests/open-batch-supersession.test.ts already
// proves the pure decision logic (computeBatchIdsToCheck /
// computeBatchesToClose) is correct given arbitrary inputs. It does NOT
// and cannot prove that Firestore itself actually serializes two
// concurrent runTransaction() calls against the same
// openBatchLocks/{productId} anchor the way the Fix #10 design assumes.
// That claim can only be answered by running the real transaction
// against a live Firestore emulator under genuine concurrent contention
// — which is what this file does.
//
// HOW TO RUN:
//   npm run test:open-batch-concurrency
// This requires a Firestore emulator already running on localhost:8080
// (see firebase.json). The single-command way to get both:
//   npm run test:open-batch-concurrency:emulator
// which uses firebase-tools emulators:exec, matching this repo's
// existing tests/firestore-rules.test.ts convention exactly.
//
// *** IMPORTANT, READ BEFORE TRUSTING THIS FILE'S RESULTS ***
//
// This test does NOT and CANNOT call the actual production
// `addStockBatch()` function from src/context/AppContext.tsx directly.
// That function only exists inside the `AppProvider` React component's
// closure — it captures `db`, `activeBusinessId`, `products`, `batches`,
// `currentUser`, `userProfile`, `logTimelineEvent`,
// `triggerTrialActivation`, and other context-internal state, and is
// never exported as a standalone callable. This repository has no React
// component test harness (no jsdom, no @testing-library/react in
// package.json — confirmed by inspection), and adding one solely to
// mount AppProvider and drive it through the DOM would be a large,
// disproportionate scope expansion for this verification task, which
// this task's own authorization explicitly scoped to "add test
// infrastructure/test code if necessary," not "add a new testing
// framework."
//
// Instead, `runOpenBatchTransaction` below is a test-local function that
// mirrors addStockBatch's transaction body EXACTLY — same tx.get() read
// order, same computeBatchIdsToCheck/computeBatchesToClose calls
// (imported directly from src/lib/openBatchSupersession.ts, completely
// unmocked — this is the real, shipped decision logic), same tx.update/
// tx.set write order, same openBatchLocks/{productId} anchor path. It is
// NOT a reimplementation of the decision logic (that's imported, real,
// and shared with production) — it IS a hand-copy of the transaction's
// orchestration shape, because that orchestration lives inline inside
// addStockBatch and isn't separately exported.
//
// This means: this test DOES exercise a real runTransaction() against a
// real Firestore emulator, real reads, real writes, and real contention
// — answering the actual concurrency question this task exists to
// answer. It does NOT prove that AppContext.tsx's addStockBatch
// currently matches this mirrored shape byte-for-byte at every future
// point in time — a future edit to addStockBatch's transaction body that
// isn't mirrored here could silently drift out of sync. Cross-reference:
// src/context/AppContext.tsx, addStockBatch, the `runTransaction(db,
// async (tx) => { ... })` block. If that block changes, this file's
// runOpenBatchTransaction must be updated to match, or this test no
// longer verifies what it claims to.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs, runTransaction, type Firestore } from 'firebase/firestore';
import {
  computeBatchIdsToCheck,
  computeBatchesToClose,
  type CheckedBatchSnapshot,
} from '../src/lib/openBatchSupersession';

const PROJECT_ID = 'sabush-bpt-rules-test'; // same project id tests/firestore-rules.test.ts already uses
const OWNER_UID = 'concurrency-owner1';

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
  // Defensive, matching tests/firestore-rules.test.ts's own guard: if
  // before() failed to reach the emulator, testEnv was never assigned.
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

interface StockBatchFixture {
  id: string;
  productId: string;
  dateEntered: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  status: 'open' | 'closed';
  createdAt: string;
}

/**
 * Mirrors addStockBatch's transaction body (AppContext.tsx) exactly —
 * see this file's header comment for the full reasoning on why this
 * exists as a hand-copy rather than a direct call into production code.
 * `candidateOpenBatchIds` mirrors the client-state hint addStockBatch
 * derives from its own `batches` array — passed in explicitly here since
 * this test has no React state to read it from.
 */
async function runOpenBatchTransaction(
  db: Firestore,
  businessId: string,
  productId: string,
  newBatch: StockBatchFixture,
  candidateOpenBatchIds: string[],
): Promise<void> {
  const lockRef = doc(db, 'businesses', businessId, 'openBatchLocks', productId);
  const newBatchRef = doc(db, 'businesses', businessId, 'batches', newBatch.id);

  await runTransaction(db, async (tx) => {
    // ---- READS (all before any write — required by Firestore) ----
    const lockSnap = await tx.get(lockRef);
    const lockData = lockSnap.exists() ? (lockSnap.data() as { openBatchId?: string | null }) : null;
    const lockOpenBatchId = lockData?.openBatchId ?? null;

    const idsToCheck = computeBatchIdsToCheck(lockSnap.exists(), lockOpenBatchId, candidateOpenBatchIds);

    const checkedBatches: CheckedBatchSnapshot[] = [];
    const batchRefsById = new Map<string, ReturnType<typeof doc>>();
    for (const id of idsToCheck) {
      const ref = doc(db, 'businesses', businessId, 'batches', id);
      batchRefsById.set(id, ref);
      const snap = await tx.get(ref);
      checkedBatches.push({
        id,
        exists: snap.exists(),
        status: snap.exists() ? (snap.data() as { status?: string }).status : undefined,
      });
    }

    // ---- WRITES (only after every read above has completed) ----
    const idsToClose = computeBatchesToClose(checkedBatches);
    for (const id of idsToClose) {
      tx.update(batchRefsById.get(id)!, { status: 'closed' });
    }

    tx.set(newBatchRef, newBatch);
    tx.set(lockRef, {
      productId,
      openBatchId: newBatch.id,
      updatedAt: new Date().toISOString(),
    });
  });
}

function ctxDb(uid: string): Firestore {
  // @firebase/rules-unit-testing's authenticatedContext(...).firestore()
  // is typed against the COMPAT Firestore shape (firebase.firestore.Firestore),
  // not the modular SDK's Firestore type — a known type-declaration
  // mismatch between the two packages, not a runtime distinction (it is
  // the same underlying object either way; tests/firestore-rules.test.ts
  // already relies on this by passing it into modular doc()/getDoc()/
  // setDoc(), which accept it structurally without complaint). Only
  // runTransaction()'s stricter parameter type surfaces the mismatch,
  // hence the explicit cast here rather than at every call site.
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

async function readBatch(businessId: string, batchId: string): Promise<StockBatchFixture | null> {
  let result: StockBatchFixture | null = null;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'businesses', businessId, 'batches', batchId));
    result = snap.exists() ? (snap.data() as StockBatchFixture) : null;
  });
  return result;
}

async function readLock(businessId: string, productId: string): Promise<{ productId: string; openBatchId: string | null } | null> {
  let result: { productId: string; openBatchId: string | null } | null = null;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'businesses', businessId, 'openBatchLocks', productId));
    result = snap.exists() ? (snap.data() as { productId: string; openBatchId: string | null }) : null;
  });
  return result;
}

async function seedOwnerProfile(businessId: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', OWNER_UID), { role: 'owner', businessId });
  });
}

async function countBatchesInBusiness(businessId: string): Promise<number> {
  let count = 0;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore(), 'businesses', businessId, 'batches'));
    count = snap.docs.length;
  });
  return count;
}

async function readAllBatchesInBusiness(businessId: string): Promise<StockBatchFixture[]> {
  let batches: StockBatchFixture[] = [];
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore(), 'businesses', businessId, 'batches'));
    batches = snap.docs.map((d) => d.data() as StockBatchFixture);
  });
  return batches;
}

async function seedLegacyBatch(businessId: string, batch: StockBatchFixture): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'batches', batch.id), batch);
  });
}

// ---------------------------------------------------------------------
// Core concurrency scenario
// ---------------------------------------------------------------------
describe('addStockBatch transaction — real concurrent contention against a live Firestore emulator', () => {
  const ITERATIONS = 20; // per this task's requirement, "prefer at least 20 iterations if runtime permits"

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}/${ITERATIONS}: two concurrent legitimate purchases for the same product both survive, exactly one ends up open`, async () => {
      const businessId = `biz-concurrency-${i}`;
      const productId = `prod-concurrency-${i}`;
      await seedOwnerProfile(businessId);
      const db = ctxDb(OWNER_UID);

      const batchA: StockBatchFixture = {
        id: `batch-A-${i}`,
        productId,
        dateEntered: '2026-08-12',
        quantity: 50,
        unit: 'un',
        costPrice: 10,
        sellingPrice: 15,
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      const batchB: StockBatchFixture = {
        id: `batch-B-${i}`,
        productId,
        dateEntered: '2026-08-12',
        quantity: 75,
        unit: 'un',
        costPrice: 12,
        sellingPrice: 18,
        status: 'open',
        createdAt: new Date().toISOString(),
      };

      // Neither client has seen the other's write yet — both candidate
      // lists are empty (matches addStockBatch's real behavior: a brand
      // new product has no open batches in client state either), and
      // neither has a lock doc yet. This is precisely the "two
      // first-ever writes race" scenario the Fix #10 review corrected
      // the reasoning on — both should still serialize via the lock path
      // itself, per that correction.
      await Promise.all([
        runOpenBatchTransaction(db, businessId, productId, batchA, []),
        runOpenBatchTransaction(db, businessId, productId, batchB, []),
      ]);

      const readA = await readBatch(businessId, batchA.id);
      const readB = await readBatch(businessId, batchB.id);
      const lock = await readLock(businessId, productId);

      // 1 & 2. Both batch documents exist — both purchases preserved.
      assert.ok(readA, `iteration ${i}: batch A must exist — a legitimate purchase must never be lost`);
      assert.ok(readB, `iteration ${i}: batch B must exist — a legitimate purchase must never be lost`);

      // 3, 4, 5. Quantities/costs/selling prices unchanged from what was submitted.
      assert.equal(readA!.quantity, 50);
      assert.equal(readA!.costPrice, 10);
      assert.equal(readA!.sellingPrice, 15);
      assert.equal(readB!.quantity, 75);
      assert.equal(readB!.costPrice, 12);
      assert.equal(readB!.sellingPrice, 18);

      // 6. Both reference the same product.
      assert.equal(readA!.productId, productId);
      assert.equal(readB!.productId, productId);

      // 7 & 8. Exactly one open, the other closed — never both open, never both closed.
      const statuses = [readA!.status, readB!.status].sort();
      assert.deepEqual(statuses, ['closed', 'open'], `iteration ${i}: expected exactly one open and one closed, got A=${readA!.status} B=${readB!.status}`);

      // 9 & 10. Lock doc exists and points at whichever batch is open.
      assert.ok(lock, `iteration ${i}: openBatchLocks/${productId} must exist after either write`);
      const openBatch = readA!.status === 'open' ? readA! : readB!;
      assert.equal(lock!.openBatchId, openBatch.id, `iteration ${i}: lock must point at the batch actually marked open, not the other one`);

      // 11. No third batch was unintentionally created — collection
      // should contain exactly these two documents for this product.
      const totalBatchCount = await countBatchesInBusiness(businessId);
      assert.equal(totalBatchCount, 2, `iteration ${i}: expected exactly 2 batch documents total, found ${totalBatchCount}`);

      // 12. Neither purchase was rejected — already implied by both
      // Promise.all() branches resolving without throwing above, and by
      // both documents existing; asserted explicitly for clarity.
      assert.ok(true, 'both concurrent addStockBatch-equivalent calls resolved without throwing — neither purchase was rejected');
    });
  }
});

// ---------------------------------------------------------------------
// Downstream invariant: the sole open batch is the one Quebra-style
// selection logic would pick (mirrors AddQuebraView.tsx's own
// `batches.find(b => b.status === 'open')`, unmodified — this test does
// not touch or import AddQuebraView; it re-checks the same predicate
// against the real post-transaction Firestore state).
// ---------------------------------------------------------------------
describe('downstream open-batch invariant after concurrent resolution', () => {
  it('the batch selection predicate used elsewhere in the app (status === "open") resolves to exactly one, correct batch', async () => {
    const businessId = 'biz-quebra-followup';
    const productId = 'prod-quebra-followup';
    await seedOwnerProfile(businessId);
    const db = ctxDb(OWNER_UID);

    const batchA: StockBatchFixture = {
      id: 'batch-A-followup', productId, dateEntered: '2026-08-12', quantity: 20, unit: 'un',
      costPrice: 5, sellingPrice: 8, status: 'open', createdAt: new Date().toISOString(),
    };
    const batchB: StockBatchFixture = {
      id: 'batch-B-followup', productId, dateEntered: '2026-08-12', quantity: 30, unit: 'un',
      costPrice: 6, sellingPrice: 9, status: 'open', createdAt: new Date().toISOString(),
    };

    await Promise.all([
      runOpenBatchTransaction(db, businessId, productId, batchA, []),
      runOpenBatchTransaction(db, businessId, productId, batchB, []),
    ]);

    const allBatches = await readAllBatchesInBusiness(businessId);

    // Exact same predicate AddQuebraView.tsx / DashboardView.tsx use.
    const openBatches = allBatches.filter((b) => b.productId === productId && b.status === 'open');
    assert.equal(openBatches.length, 1, 'exactly one batch must satisfy the open-batch predicate downstream code relies on');

    const lock = await readLock(businessId, productId);
    assert.equal(openBatches[0].id, lock!.openBatchId, 'the batch the predicate finds must be the same one the lock points at');
  });
});

// ---------------------------------------------------------------------
// Legacy / bootstrap scenario
// ---------------------------------------------------------------------
describe('legacy bootstrap — product with a pre-existing open batch and no lock doc yet', () => {
  it('the first post-Fix-10 transaction closes the legacy open batch and creates the lock, using the client-state candidate hint', async () => {
    const businessId = 'biz-legacy';
    const productId = 'prod-legacy';
    await seedOwnerProfile(businessId);
    const db = ctxDb(OWNER_UID);

    const legacyBatch: StockBatchFixture = {
      id: 'batch-legacy-A', productId, dateEntered: '2026-01-10', quantity: 40, unit: 'un',
      costPrice: 4, sellingPrice: 7, status: 'open', createdAt: '2026-01-10T00:00:00.000Z',
    };
    // Seed directly, bypassing the transaction — simulates data that
    // predates this fix, written before openBatchLocks existed at all.
    await seedLegacyBatch(businessId, legacyBatch);

    // Confirm no lock doc exists yet — the actual precondition being tested.
    const lockBefore = await readLock(businessId, productId);
    assert.equal(lockBefore, null, 'precondition: no lock doc should exist yet for this legacy product');

    const newBatch: StockBatchFixture = {
      id: 'batch-new-B', productId, dateEntered: '2026-08-12', quantity: 60, unit: 'un',
      costPrice: 9, sellingPrice: 14, status: 'open', createdAt: new Date().toISOString(),
    };

    // The client-state hint here mirrors what addStockBatch would derive
    // from AppContext's live `batches` listener at the moment of this
    // call — including the legacy batch, since a real, already-loaded
    // client would have it in its onSnapshot-populated array.
    await runOpenBatchTransaction(db, businessId, productId, newBatch, [legacyBatch.id]);

    const readLegacy = await readBatch(businessId, legacyBatch.id);
    const readNew = await readBatch(businessId, newBatch.id);
    const lockAfter = await readLock(businessId, productId);

    assert.equal(readLegacy!.status, 'closed', 'the pre-existing legacy open batch must be closed by the first post-fix transaction');
    assert.equal(readNew!.status, 'open', 'the new batch must be the sole open batch');
    assert.ok(lockAfter, 'the lock document must now exist');
    assert.equal(lockAfter!.openBatchId, newBatch.id, 'the lock must point at the new batch');
  });
});
