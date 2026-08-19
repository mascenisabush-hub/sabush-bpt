// [Proposal 5A] Emulator concurrency verification — supplier-wording
// relationship confirmation (Rule 8 Finding 13).
//
// WHY THIS FILE EXISTS: tests/supplier-wording-add-stock.test.ts already
// proves planSupplierWordingConfirmation's DECISION LOGIC is correct
// given arbitrary, hand-constructed "fresh snapshot" inputs. It does NOT
// and cannot prove that Firestore itself actually forces a concurrent
// transaction to re-read (and therefore re-decide against) state another
// transaction just committed — the exact guarantee
// confirmSupplierWordingRelationship's design (AppContext.tsx) depends
// on. That claim can only be answered by running the real transaction
// against a live Firestore emulator under genuine concurrent contention
// — which is what this file does, directly mirroring
// tests/open-batch-concurrency.test.ts's own established pattern for
// the structurally identical open-batch lock transaction.
//
// HOW TO RUN:
//   npm run test:supplier-wording-confirmation-concurrency
// Requires a Firestore emulator already running on localhost:8080 (see
// firebase.json). Single-command way to get both:
//   npm run test:supplier-wording-confirmation-concurrency:emulator
//
// *** IMPORTANT, READ BEFORE TRUSTING THIS FILE'S RESULTS ***
//
// This test does NOT and CANNOT call the actual production
// `confirmSupplierWordingRelationship()` from AppContext.tsx directly —
// it only exists inside the `AppProvider` React component's closure
// (captures `db`, `activeBusinessId`, `userProfile`, and other
// context-internal state) and is never exported as a standalone
// callable. This repository has no React component test harness (no
// jsdom, no @testing-library/react — confirmed by inspection), and this
// task's own authorization is a verification task, not a testing-
// framework addition.
//
// `runSupplierWordingConfirmationTransaction` below is a test-local
// function that mirrors confirmSupplierWordingRelationship's transaction
// body EXACTLY — same tx.get() read order (target + every
// conflictCheckProductId), same planSupplierWordingConfirmation call
// (imported directly from apps/tenant/src/lib/supplierWordingConfirmation.ts,
// completely unmocked — this is the real, shipped decision logic and the
// real, shipped SupplierWordingConflictError), same tx.update write. It
// is NOT a reimplementation of the decision logic — it IS a hand-copy of
// the transaction's orchestration shape, because that orchestration
// lives inline inside confirmSupplierWordingRelationship and isn't
// separately exported. If AppContext.tsx's transaction body changes,
// this mirror must be updated to match, or this test no longer verifies
// what it claims to — the identical caveat
// tests/open-batch-concurrency.test.ts already documents for its own
// mirror of addStockBatch.
//
// SCOPE, PER PROPOSAL 5A'S AUTHORIZATION: verification only. No
// production code in this diff. No new lock document, no new
// collection, no firestore.rules change, no change to the transaction
// algorithm, no artificial production delays. If this test had exposed
// a genuine defect, this file's own header would say so explicitly and
// stop short of "fixing" it — see the completion report for the actual
// outcome.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, runTransaction, type Firestore } from 'firebase/firestore';
import {
  planSupplierWordingConfirmation,
  SupplierWordingConflictError,
  type CheckedProductWordingSnapshot,
} from '../apps/tenant/src/lib/supplierWordingConfirmation';

const PROJECT_ID = 'sabush-bpt-rules-test'; // same project id every other emulator suite in this repo uses
const OWNER_UID = 'supplier-wording-concurrency-owner1';

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
});

interface ProductFixture {
  id: string;
  name: string;
  createdAt: string;
  supplierWordings?: Array<{ supplierRecordId: string; wording: string; confirmedAt: string; provenance?: string }>;
}

/**
 * Mirrors confirmSupplierWordingRelationship's transaction body
 * (AppContext.tsx) exactly — see this file's header comment for the
 * full reasoning. Throws SupplierWordingConflictError (the real,
 * production class) exactly when the real function would.
 */
async function runSupplierWordingConfirmationTransaction(
  db: Firestore,
  businessId: string,
  targetProductId: string,
  supplierRecordId: string,
  wording: string,
  conflictCheckProductIds: string[]
): Promise<void> {
  const trimmedWording = wording.trim();
  if (!trimmedWording) return;

  const idsToCheck = Array.from(new Set([targetProductId, ...conflictCheckProductIds]));

  await runTransaction(db, async (tx) => {
    // ---- READS (all before any write — required by Firestore) ----
    const snapshots: CheckedProductWordingSnapshot[] = [];
    const refsById = new Map<string, ReturnType<typeof doc>>();
    for (const id of idsToCheck) {
      const ref = doc(db, 'businesses', businessId, 'products', id);
      refsById.set(id, ref);
      const snap = await tx.get(ref);
      const data = snap.exists() ? (snap.data() as ProductFixture) : undefined;
      snapshots.push({
        productId: id,
        exists: snap.exists(),
        supplierWordings: (data?.supplierWordings ?? []).map((r) => ({
          supplierRecordId: r.supplierRecordId,
          wording: r.wording,
        })),
      });
    }

    const plan = planSupplierWordingConfirmation(targetProductId, supplierRecordId, trimmedWording, snapshots);

    if (plan.conflict) {
      throw new SupplierWordingConflictError(plan.conflict.productId);
    }
    if (!plan.shouldWrite) {
      return;
    }

    // ---- WRITES (only after every read above has completed) ----
    const targetSnapshot = snapshots.find((s) => s.productId === targetProductId)!;
    const newRelationship = {
      supplierRecordId,
      wording: trimmedWording,
      confirmedAt: new Date().toISOString(),
      provenance: 'system-proposed' as const,
    };
    tx.update(refsById.get(targetProductId)!, {
      supplierWordings: [...targetSnapshot.supplierWordings, newRelationship],
    });
  });
}

function ctxDb(uid: string): Firestore {
  // Same modular/compat type-declaration cast tests/open-batch-concurrency.test.ts
  // already documents and relies on — not a runtime distinction.
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

async function readProduct(businessId: string, productId: string): Promise<ProductFixture | null> {
  let result: ProductFixture | null = null;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), 'businesses', businessId, 'products', productId));
    result = snap.exists() ? (snap.data() as ProductFixture) : null;
  });
  return result;
}

async function seedOwnerProfile(businessId: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', OWNER_UID), { role: 'owner', businessId });
  });
}

async function seedProduct(businessId: string, product: ProductFixture): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'products', product.id), product);
  });
}

// ---------------------------------------------------------------------
// Scenario A — genuine concurrent contention: SAME target product, SAME
// (supplierRecordId, wording) pair — this is the idempotent-retry path
// (two confirmations of the identical relationship).
// ---------------------------------------------------------------------
describe('confirmSupplierWordingRelationship transaction — Scenario A: two concurrent confirmations of the SAME relationship onto the SAME product, against a live Firestore emulator', () => {
  const ITERATIONS = 10;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}/${ITERATIONS}: both calls resolve without throwing; exactly one relationship entry results, never a duplicate`, async () => {
      const businessId = `biz-sw-concurrency-a-${i}`;
      const productId = `prod-sw-a-${i}`;
      const supplierRecordId = 'supplier-1';
      const wording = 'Lager Grande';
      await seedOwnerProfile(businessId);
      await seedProduct(businessId, { id: productId, name: 'Cerveja Lager 330ml', createdAt: new Date().toISOString() });
      const db = ctxDb(OWNER_UID);

      // Neither client has seen the other's write yet — both start from
      // the identical, freshly-seeded (no relationship yet) state, and
      // neither has any other candidate to check (conflictCheckProductIds
      // empty), matching the real function's own "no candidates shown"
      // case.
      const results = await Promise.allSettled([
        runSupplierWordingConfirmationTransaction(db, businessId, productId, supplierRecordId, wording, []),
        runSupplierWordingConfirmationTransaction(db, businessId, productId, supplierRecordId, wording, []),
      ]);

      // Success criterion for THIS scenario, per the real function's own
      // documented contract (AppContext.tsx's own comment: "resolves
      // silently (no write) if the target already holds it — idempotent
      // retry"): neither call is expected to throw. A SAME-target,
      // SAME-relationship race is never a conflict — plan.conflict only
      // ever fires against a DIFFERENT product (planSupplierWordingConfirmation's
      // own conflictingProduct.productId !== targetProductId check).
      for (const [idx, result] of results.entries()) {
        assert.equal(
          result.status,
          'fulfilled',
          `iteration ${i}: call ${idx} was expected to resolve (idempotent), but ${
            result.status === 'rejected' ? `rejected with: ${(result as PromiseRejectedResult).reason}` : ''
          }`
        );
      }

      const product = await readProduct(businessId, productId);
      assert.ok(product, `iteration ${i}: product must still exist`);
      const relationships = product!.supplierWordings ?? [];

      // The actual invariant: exactly ONE relationship entry for this
      // (supplierRecordId, wording) pair — never zero (a legitimate
      // confirmation lost), never two (a duplicate array entry — the
      // exact defect planSupplierWordingConfirmation's alreadyConfirmed
      // branch exists to prevent).
      const matching = relationships.filter(
        (r) => r.supplierRecordId === supplierRecordId && r.wording === wording
      );
      assert.equal(
        matching.length,
        1,
        `iteration ${i}: expected exactly 1 matching relationship, found ${matching.length} — ${JSON.stringify(relationships)}`
      );
    });
  }
});

// ---------------------------------------------------------------------
// Scenario B — genuine concurrent contention: TWO DIFFERENT target
// products, SAME (supplierRecordId, wording) pair, each including the
// other in conflictCheckProductIds (the documented, authorized boundary
// — both were shown as candidates to each caller). This is the conflict
// path BDR-0013 item 5 exists to prevent the system from causing itself.
// ---------------------------------------------------------------------
describe('confirmSupplierWordingRelationship transaction — Scenario B: two concurrent confirmations of the SAME relationship onto TWO DIFFERENT products, against a live Firestore emulator', () => {
  const ITERATIONS = 10;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}/${ITERATIONS}: exactly one product wins the relationship; the other call safely rejects with SupplierWordingConflictError; no duplicate/contradictory state results`, async () => {
      const businessId = `biz-sw-concurrency-b-${i}`;
      const productAId = `prod-sw-b-a-${i}`;
      const productBId = `prod-sw-b-b-${i}`;
      const supplierRecordId = 'supplier-1';
      const wording = 'Lager Grande';
      await seedOwnerProfile(businessId);
      await seedProduct(businessId, { id: productAId, name: 'Cerveja Lager 330ml', createdAt: new Date().toISOString() });
      await seedProduct(businessId, { id: productBId, name: 'Cerveja Lager 500ml', createdAt: new Date().toISOString() });
      const db = ctxDb(OWNER_UID);

      // Client A confirms onto product A, checking product B as the
      // other shown candidate. Client B confirms onto product B,
      // checking product A. Both start from the identical, freshly-
      // seeded (neither has the relationship yet) state.
      const results = await Promise.allSettled([
        runSupplierWordingConfirmationTransaction(db, businessId, productAId, supplierRecordId, wording, [productBId]),
        runSupplierWordingConfirmationTransaction(db, businessId, productBId, supplierRecordId, wording, [productAId]),
      ]);

      const [resultA, resultB] = results;
      const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
      const rejectedCount = results.filter((r) => r.status === 'rejected').length;

      // Outcome accounting, against the real function's actual
      // contract — not an invented "both must succeed" expectation.
      // Exactly one of the two must win (fulfilled, wrote the
      // relationship); the other must either lose safely (rejected with
      // SupplierWordingConflictError) — this is what "no invalid partial
      // state" and "at most the permitted confirmation wins" resolve to
      // for this specific, documented mechanism.
      assert.equal(
        fulfilledCount,
        1,
        `iteration ${i}: expected exactly 1 of 2 concurrent cross-product confirmations to succeed, got ${fulfilledCount} — A:${resultA.status} B:${resultB.status}`
      );
      assert.equal(
        rejectedCount,
        1,
        `iteration ${i}: expected exactly 1 of 2 to be rejected as a conflict, got ${rejectedCount}`
      );

      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      assert.ok(rejected, `iteration ${i}: a rejection must be present`);
      assert.ok(
        rejected!.reason instanceof SupplierWordingConflictError,
        `iteration ${i}: the losing call must reject with the real, production SupplierWordingConflictError — got ${rejected!.reason}`
      );

      // Final-state integrity: read both products fresh, independent of
      // which promise settled which way.
      const productA = await readProduct(businessId, productAId);
      const productB = await readProduct(businessId, productBId);
      assert.ok(productA && productB, `iteration ${i}: both products must still exist`);

      const relationshipsA = (productA!.supplierWordings ?? []).filter(
        (r) => r.supplierRecordId === supplierRecordId && r.wording === wording
      );
      const relationshipsB = (productB!.supplierWordings ?? []).filter(
        (r) => r.supplierRecordId === supplierRecordId && r.wording === wording
      );
      const totalMatching = relationshipsA.length + relationshipsB.length;

      // The actual invariant this whole mechanism exists to guarantee:
      // exactly ONE product, across the entire business, ends up holding
      // this exact (supplierRecordId, wording) relationship — never zero
      // (a legitimate confirmation silently lost), never two (the exact
      // "two products claim one wording" conflict state BDR-0013 item 5
      // exists to prevent the system from causing on its own).
      assert.equal(
        totalMatching,
        1,
        `iteration ${i}: expected exactly 1 matching relationship across BOTH products combined, found ${totalMatching} (A=${relationshipsA.length}, B=${relationshipsB.length})`
      );

      // Cross-check: the product that ended up holding the relationship
      // is exactly the one whose confirmation call actually fulfilled —
      // never a mismatch between "which promise resolved" and "which
      // document was actually written."
      const winningProductId = relationshipsA.length === 1 ? productAId : productBId;
      const winningCallIndex = relationshipsA.length === 1 ? 0 : 1;
      assert.equal(
        results[winningCallIndex].status,
        'fulfilled',
        `iteration ${i}: product ${winningProductId} holds the relationship, but its own confirmation call did not fulfill — internal inconsistency`
      );
    });
  }
});
