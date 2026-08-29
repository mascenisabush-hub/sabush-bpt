// Owner-Controlled Correction of a Remembered Supplier-Wording
// Relationship — Emulator concurrency verification (removal + redirect).
//
// Governing chain: BDR-0013, the accepted Amendment, the READY Rule 8
// Assessment, the accepted Implementation Plan, and the signed
// Implementation Authorization (SABUSHIMIKE MASCENI, 29 August 2026).
//
// WHY THIS FILE EXISTS: tests/supplier-wording-removal.test.ts and
// tests/supplier-wording-redirect.test.ts already prove
// planSupplierWordingRemoval/planSupplierWordingRedirect's DECISION
// LOGIC is correct given arbitrary, hand-constructed "fresh snapshot"
// inputs. They do NOT and cannot prove that Firestore itself actually
// forces a concurrent transaction to re-read (and therefore re-decide
// against) state another transaction just committed — the exact
// guarantee removeSupplierWordingRelationship/
// redirectSupplierWordingRelationship's design (AppContext.tsx)
// depends on. That claim can only be answered by running the real
// transactions against a live Firestore emulator under genuine
// concurrent contention — which is what this file does, directly
// mirroring tests/supplier-wording-confirmation-concurrency.test.ts's
// own established pattern for the structurally identical
// confirmation transaction.
//
// HOW TO RUN:
//   Requires a Firestore emulator already running on localhost:8080
//   (see firebase.json):
//     npx tsx --test tests/supplier-wording-correction-concurrency.test.ts
//
// This test does NOT and CANNOT call the actual production
// removeSupplierWordingRelationship()/redirectSupplierWordingRelationship()
// from AppContext.tsx directly — same reasoning as the existing
// confirmation-concurrency file's own header: they only exist inside
// the `AppProvider` React component's closure and are never exported
// as standalone callables, and this repository has no React component
// test harness. The mirror functions below reproduce
// AppContext.tsx's own transaction bodies EXACTLY — same tx.get()
// read order, same planSupplierWordingRemoval/planSupplierWordingRedirect
// calls (imported directly, completely unmocked — the real, shipped
// decision logic), same real, shipped SupplierWordingConflictError/
// SupplierWordingRelationshipNotFoundError/
// SupplierWordingRedirectDestinationNotFoundError, same tx.update
// writes. They deliberately omit the logTimelineEvent call, which is
// audit-infrastructure plumbing orthogonal to the transaction-
// atomicity/concurrency property this file verifies (covered
// separately by tests/supplier-wording-correction-audit.test.ts). If
// AppContext.tsx's transaction bodies change, these mirrors must be
// updated to match, or this file no longer verifies what it claims to
// — the identical caveat the existing precedent file already documents
// for its own mirror.

import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, runTransaction, type Firestore } from 'firebase/firestore';
import {
  planSupplierWordingRemoval,
  planSupplierWordingRedirect,
  SupplierWordingConflictError,
  SupplierWordingRelationshipNotFoundError,
  SupplierWordingRedirectDestinationNotFoundError,
  type FullProductWordingSnapshot,
} from '../apps/tenant/src/lib/supplierWordingConfirmation';

const PROJECT_ID = 'sabush-bpt-rules-test'; // same project id every other emulator suite in this repo uses
const OWNER_UID = 'supplier-wording-correction-owner1';
const STAFF_UID = 'supplier-wording-correction-staff1';
const OTHER_OWNER_UID = 'supplier-wording-correction-owner2';

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

interface RelationshipFixture {
  supplierRecordId: string;
  wording: string;
  confirmedAt: string;
  provenance?: 'system-proposed' | 'owner-initiated';
  confirmedByName?: string;
}

interface ProductFixture {
  id: string;
  name: string;
  createdAt: string;
  costPrice?: number;
  supplierWordings?: RelationshipFixture[];
}

/**
 * Mirrors removeSupplierWordingRelationship's transaction body
 * (AppContext.tsx) exactly — see this file's header for the full
 * reasoning.
 */
async function runRemovalTransaction(
  db: Firestore,
  businessId: string,
  productId: string,
  supplierRecordId: string,
  wording: string
): Promise<void> {
  const trimmedWording = wording.trim();
  if (!trimmedWording) return;
  const ref = doc(db, 'businesses', businessId, 'products', productId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as ProductFixture;
    const plan = planSupplierWordingRemoval(supplierRecordId, trimmedWording, {
      supplierWordings: data.supplierWordings ?? [],
    });
    if (!plan.found) return;
    tx.update(ref, { supplierWordings: plan.updatedWordings });
  });
}

/**
 * Mirrors redirectSupplierWordingRelationship's transaction body
 * (AppContext.tsx) exactly, including the explicit destination-
 * existence guard that preserves redirect atomicity — see this file's
 * header for the full reasoning.
 */
async function runRedirectTransaction(
  db: Firestore,
  businessId: string,
  sourceProductId: string,
  destinationProductId: string,
  supplierRecordId: string,
  wording: string,
  additionalConflictCheckProductIds: string[]
): Promise<void> {
  const trimmedWording = wording.trim();
  if (!trimmedWording) return;

  const otherIds = Array.from(
    new Set(additionalConflictCheckProductIds.filter((id) => id !== sourceProductId && id !== destinationProductId))
  );
  const destinationAndOtherIds = [destinationProductId, ...otherIds];

  await runTransaction(db, async (tx) => {
    const sourceRef = doc(db, 'businesses', businessId, 'products', sourceProductId);
    const sourceSnap = await tx.get(sourceRef);
    const sourceData = sourceSnap.exists() ? (sourceSnap.data() as ProductFixture) : undefined;
    const sourceSnapshot: FullProductWordingSnapshot = {
      productId: sourceProductId,
      exists: sourceSnap.exists(),
      supplierWordings: sourceData?.supplierWordings ?? [],
    };

    const otherRefsById = new Map<string, ReturnType<typeof doc>>();
    const otherSnapshots: FullProductWordingSnapshot[] = [];
    for (const id of destinationAndOtherIds) {
      const ref = doc(db, 'businesses', businessId, 'products', id);
      otherRefsById.set(id, ref);
      const snap = await tx.get(ref);
      const data = snap.exists() ? (snap.data() as ProductFixture) : undefined;
      otherSnapshots.push({
        productId: id,
        exists: snap.exists(),
        supplierWordings: data?.supplierWordings ?? [],
      });
    }

    const plan = planSupplierWordingRedirect(
      sourceProductId,
      destinationProductId,
      supplierRecordId,
      trimmedWording,
      sourceSnapshot,
      otherSnapshots
    );

    if (!plan.sourceFound) {
      throw new SupplierWordingRelationshipNotFoundError();
    }
    const destinationSnapshotForExistenceCheck = otherSnapshots.find((s) => s.productId === destinationProductId);
    if (!destinationSnapshotForExistenceCheck?.exists) {
      throw new SupplierWordingRedirectDestinationNotFoundError();
    }
    if (plan.conflict) {
      throw new SupplierWordingConflictError(plan.conflict.productId);
    }

    tx.update(sourceRef, { supplierWordings: plan.updatedSourceWordings });
    if (plan.shouldWriteDestination) {
      const destinationSnapshot = otherSnapshots.find((s) => s.productId === destinationProductId)!;
      const newRelationship: RelationshipFixture = {
        supplierRecordId,
        wording: trimmedWording,
        confirmedAt: new Date().toISOString(),
        provenance: 'owner-initiated',
      };
      tx.update(otherRefsById.get(destinationProductId)!, {
        supplierWordings: [...destinationSnapshot.supplierWordings, newRelationship],
      });
    }
  });
}

function ctxDb(uid: string): Firestore {
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

async function seedOwnerProfile(uid: string, businessId: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role: 'owner', businessId });
  });
}

async function seedStaffProfile(uid: string, businessId: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), { role: 'staff', businessId });
  });
}

async function seedProduct(businessId: string, product: ProductFixture): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'businesses', businessId, 'products', product.id), product);
  });
}

const REL = (
  supplierRecordId: string,
  wording: string,
  confirmedAt = '2026-08-01T00:00:00.000Z',
  extra: Partial<RelationshipFixture> = {}
): RelationshipFixture => ({ supplierRecordId, wording, confirmedAt, ...extra });

// ---------------------------------------------------------------------
// Scenario 1 — concurrent removal of the SAME relationship on the SAME
// product.
// ---------------------------------------------------------------------
describe('removeSupplierWordingRelationship — Scenario 1: two concurrent removals of the SAME relationship on the SAME product', () => {
  const ITERATIONS = 5;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}/${ITERATIONS}: both calls resolve without throwing; the relationship ends up removed exactly once, never restored`, async () => {
      const businessId = `biz-removal-1-${i}`;
      const productId = `prod-removal-1-${i}`;
      await seedOwnerProfile(OWNER_UID, businessId);
      await seedProduct(businessId, {
        id: productId,
        name: 'Cerveja Lager 330ml',
        createdAt: new Date().toISOString(),
        supplierWordings: [REL('supplier-1', 'Lager Grande'), REL('supplier-1', 'Other Wording')],
      });
      const db = ctxDb(OWNER_UID);

      const results = await Promise.allSettled([
        runRemovalTransaction(db, businessId, productId, 'supplier-1', 'Lager Grande'),
        runRemovalTransaction(db, businessId, productId, 'supplier-1', 'Lager Grande'),
      ]);

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
      assert.ok(product);
      const remaining = product!.supplierWordings ?? [];
      assert.equal(remaining.length, 1, `expected exactly 1 relationship to remain, found ${remaining.length}`);
      assert.equal(remaining[0].wording, 'Other Wording');
    });
  }
});

// ---------------------------------------------------------------------
// Scenario 2 — concurrent removal of DIFFERENT relationships on the
// SAME product — proves the lost-update race Rule 8/the Implementation
// Plan flagged is actually prevented by fresh in-transaction reads.
// ---------------------------------------------------------------------
describe('removeSupplierWordingRelationship — Scenario 2: two concurrent removals of DIFFERENT relationships on the SAME product', () => {
  const ITERATIONS = 5;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}/${ITERATIONS}: both removals succeed; neither undoes the other`, async () => {
      const businessId = `biz-removal-2-${i}`;
      const productId = `prod-removal-2-${i}`;
      await seedOwnerProfile(OWNER_UID, businessId);
      await seedProduct(businessId, {
        id: productId,
        name: 'Cerveja Lager 330ml',
        createdAt: new Date().toISOString(),
        supplierWordings: [
          REL('supplier-1', 'Lager Grande'),
          REL('supplier-2', 'Cerveja Grande'),
          REL('supplier-3', 'Untouched'),
        ],
      });
      const db = ctxDb(OWNER_UID);

      const results = await Promise.allSettled([
        runRemovalTransaction(db, businessId, productId, 'supplier-1', 'Lager Grande'),
        runRemovalTransaction(db, businessId, productId, 'supplier-2', 'Cerveja Grande'),
      ]);

      for (const [idx, result] of results.entries()) {
        assert.equal(result.status, 'fulfilled', `iteration ${i}: call ${idx} should have succeeded`);
      }

      const product = await readProduct(businessId, productId);
      const remaining = (product!.supplierWordings ?? []).map((r) => r.wording).sort();
      assert.deepEqual(
        remaining,
        ['Untouched'],
        `iteration ${i}: expected exactly the untouched relationship to remain, got ${JSON.stringify(remaining)}`
      );
    });
  }
});

// ---------------------------------------------------------------------
// Scenario 3 — concurrent redirects of the SAME relationship to
// DIFFERENT destination products. Exactly one call wins; the other's
// fresh re-read (after the winner commits) finds the source already
// gone and safely rejects with SupplierWordingRelationshipNotFoundError
// — never a duplicate, never a lost relationship.
// ---------------------------------------------------------------------
describe('redirectSupplierWordingRelationship — Scenario 3: two concurrent redirects of the SAME relationship to TWO DIFFERENT destination products', () => {
  const ITERATIONS = 5;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}/${ITERATIONS}: exactly one redirect succeeds; the other safely rejects; the relationship ends up on exactly one destination`, async () => {
      const businessId = `biz-redirect-3-${i}`;
      const sourceId = `prod-redirect-3-src-${i}`;
      const destAId = `prod-redirect-3-a-${i}`;
      const destBId = `prod-redirect-3-b-${i}`;
      await seedOwnerProfile(OWNER_UID, businessId);
      await seedProduct(businessId, {
        id: sourceId,
        name: 'Cerveja Lager 330ml',
        createdAt: new Date().toISOString(),
        supplierWordings: [REL('supplier-1', 'Lager Grande')],
      });
      await seedProduct(businessId, { id: destAId, name: 'Cerveja Lager 500ml', createdAt: new Date().toISOString() });
      await seedProduct(businessId, { id: destBId, name: 'Cerveja Lager 1L', createdAt: new Date().toISOString() });
      const db = ctxDb(OWNER_UID);

      const results = await Promise.allSettled([
        runRedirectTransaction(db, businessId, sourceId, destAId, 'supplier-1', 'Lager Grande', []),
        runRedirectTransaction(db, businessId, sourceId, destBId, 'supplier-1', 'Lager Grande', []),
      ]);

      const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
      const rejectedCount = results.filter((r) => r.status === 'rejected').length;
      assert.equal(fulfilledCount, 1, `iteration ${i}: expected exactly 1 of 2 to succeed, got ${fulfilledCount}`);
      assert.equal(rejectedCount, 1, `iteration ${i}: expected exactly 1 of 2 to be rejected, got ${rejectedCount}`);

      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      assert.ok(
        rejected.reason instanceof SupplierWordingRelationshipNotFoundError,
        `iteration ${i}: the losing call must reject with SupplierWordingRelationshipNotFoundError (the source was already moved), got ${rejected.reason}`
      );

      const source = await readProduct(businessId, sourceId);
      const destA = await readProduct(businessId, destAId);
      const destB = await readProduct(businessId, destBId);
      assert.deepEqual(source!.supplierWordings ?? [], [], `iteration ${i}: source must end up with no relationship`);

      const aHas = (destA!.supplierWordings ?? []).length;
      const bHas = (destB!.supplierWordings ?? []).length;
      assert.equal(
        aHas + bHas,
        1,
        `iteration ${i}: expected exactly 1 destination to hold the relationship across both, found A=${aHas} B=${bHas}`
      );
    });
  }
});

// ---------------------------------------------------------------------
// Scenario 4 — destination deleted (never created) — the redirect must
// abort ENTIRELY: no write to source, no write to any destination.
// ---------------------------------------------------------------------
describe('redirectSupplierWordingRelationship — Scenario 4: destination product does not exist', () => {
  it('rejects with SupplierWordingRedirectDestinationNotFoundError; source relationship remains exactly as it was — no partial write', async () => {
    const businessId = 'biz-redirect-4';
    const sourceId = 'prod-redirect-4-src';
    const missingDestId = 'prod-redirect-4-missing';
    await seedOwnerProfile(OWNER_UID, businessId);
    const originalRelationship = REL('supplier-1', 'Lager Grande', '2025-01-01T00:00:00.000Z', {
      provenance: 'owner-initiated',
      confirmedByName: 'Ana',
    });
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [originalRelationship],
    });
    // Deliberately never seed missingDestId.
    const db = ctxDb(OWNER_UID);

    await assert.rejects(
      runRedirectTransaction(db, businessId, sourceId, missingDestId, 'supplier-1', 'Lager Grande', []),
      SupplierWordingRedirectDestinationNotFoundError
    );

    const source = await readProduct(businessId, sourceId);
    assert.deepEqual(
      source!.supplierWordings,
      [originalRelationship],
      'source relationship must remain completely untouched — no partial removal when the destination is gone'
    );
  });
});

// ---------------------------------------------------------------------
// Scenario 5 — source relationship already absent when the redirect is
// attempted.
// ---------------------------------------------------------------------
describe('redirectSupplierWordingRelationship — Scenario 5: source relationship already absent', () => {
  it('rejects with SupplierWordingRelationshipNotFoundError; no write to source or destination', async () => {
    const businessId = 'biz-redirect-5';
    const sourceId = 'prod-redirect-5-src';
    const destId = 'prod-redirect-5-dest';
    await seedOwnerProfile(OWNER_UID, businessId);
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [], // never had it, or already corrected
    });
    await seedProduct(businessId, { id: destId, name: 'Cerveja Lager 500ml', createdAt: new Date().toISOString() });
    const db = ctxDb(OWNER_UID);

    await assert.rejects(
      runRedirectTransaction(db, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', []),
      SupplierWordingRelationshipNotFoundError
    );

    const dest = await readProduct(businessId, destId);
    assert.deepEqual(dest!.supplierWordings ?? [], [], 'destination must remain untouched');
  });
});

// ---------------------------------------------------------------------
// Scenario 6 — destination already holds the exact relationship
// (idempotent success, not a conflict). BEFORE/AFTER exactly as
// required: source loses it; destination's original entry is preserved
// byte-for-byte (same confirmedAt/provenance/confirmedByName) — never
// a duplicate.
// ---------------------------------------------------------------------
describe('redirectSupplierWordingRelationship — Scenario 6: destination already independently holds the relationship', () => {
  it('BEFORE: source has it, destination has it — AFTER: source no longer has it, destination has exactly its original (unchanged) entry', async () => {
    const businessId = 'biz-redirect-6';
    const sourceId = 'prod-redirect-6-src';
    const destId = 'prod-redirect-6-dest';
    await seedOwnerProfile(OWNER_UID, businessId);
    const existingDestinationEntry = REL('supplier-1', 'Lager Grande', '2025-06-15T00:00:00.000Z', {
      provenance: 'owner-initiated',
      confirmedByName: 'Original Owner',
    });
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [REL('supplier-1', 'Lager Grande')],
    });
    await seedProduct(businessId, {
      id: destId,
      name: 'Cerveja Lager 500ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [existingDestinationEntry],
    });
    const db = ctxDb(OWNER_UID);

    await runRedirectTransaction(db, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', []);

    const source = await readProduct(businessId, sourceId);
    const dest = await readProduct(businessId, destId);
    assert.deepEqual(source!.supplierWordings ?? [], [], 'source must have the relationship removed');
    assert.deepEqual(
      dest!.supplierWordings,
      [existingDestinationEntry],
      'destination must retain EXACTLY its original entry — same confirmedAt/provenance/confirmedByName — never a duplicate, never modified'
    );
  });
});

// ---------------------------------------------------------------------
// Scenario 7/8 — genuine third-party conflict blocks the entire
// redirect. Explicit BEFORE/AFTER proving ZERO writes result.
// ---------------------------------------------------------------------
describe('redirectSupplierWordingRelationship — Scenario 7/8: genuine third-party conflict produces ZERO writes', () => {
  it('BEFORE: source has it, destination does not, third-party has it — AFTER: source still has it, destination still does not, third-party still has it', async () => {
    const businessId = 'biz-redirect-7';
    const sourceId = 'prod-redirect-7-src';
    const destId = 'prod-redirect-7-dest';
    const thirdPartyId = 'prod-redirect-7-third';
    await seedOwnerProfile(OWNER_UID, businessId);
    const sourceRelationship = REL('supplier-1', 'Lager Grande');
    const thirdPartyRelationship = REL('supplier-1', 'Lager Grande', '2025-03-03T00:00:00.000Z', {
      provenance: 'system-proposed',
    });
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [sourceRelationship],
    });
    await seedProduct(businessId, { id: destId, name: 'Cerveja Lager 500ml', createdAt: new Date().toISOString() });
    await seedProduct(businessId, {
      id: thirdPartyId,
      name: 'Cerveja Lager Importada',
      createdAt: new Date().toISOString(),
      supplierWordings: [thirdPartyRelationship],
    });
    const db = ctxDb(OWNER_UID);

    await assert.rejects(
      runRedirectTransaction(db, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', [thirdPartyId]),
      SupplierWordingConflictError
    );

    // Explicit BEFORE/AFTER — ZERO writes anywhere.
    const source = await readProduct(businessId, sourceId);
    const dest = await readProduct(businessId, destId);
    const thirdParty = await readProduct(businessId, thirdPartyId);
    assert.deepEqual(source!.supplierWordings, [sourceRelationship], 'source must be completely unchanged');
    assert.deepEqual(dest!.supplierWordings ?? [], [], 'destination must remain empty — no write of any kind');
    assert.deepEqual(thirdParty!.supplierWordings, [thirdPartyRelationship], 'third-party product must be completely unchanged');
  });
});

// ---------------------------------------------------------------------
// Scenario 9 — a successful redirect changes only the two intended
// supplierWordings arrays; every other field on both documents, and
// every field on an unrelated third product, remains byte-for-byte
// unchanged ("full document preservation").
// ---------------------------------------------------------------------
describe('redirectSupplierWordingRelationship — Scenario 9: successful redirect changes only the two intended supplierWordings arrays', () => {
  it('preserves Product.name/costPrice and every unrelated product entirely untouched', async () => {
    const businessId = 'biz-redirect-9';
    const sourceId = 'prod-redirect-9-src';
    const destId = 'prod-redirect-9-dest';
    const unrelatedId = 'prod-redirect-9-unrelated';
    await seedOwnerProfile(OWNER_UID, businessId);
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      costPrice: 45.5,
      supplierWordings: [REL('supplier-1', 'Lager Grande'), REL('supplier-1', 'Other Wording')],
    });
    await seedProduct(businessId, {
      id: destId,
      name: 'Cerveja Lager 500ml',
      createdAt: new Date().toISOString(),
      costPrice: 60,
    });
    const unrelatedRelationship = REL('supplier-9', 'Completely Unrelated');
    await seedProduct(businessId, {
      id: unrelatedId,
      name: 'Fanta Laranja',
      createdAt: new Date().toISOString(),
      costPrice: 30,
      supplierWordings: [unrelatedRelationship],
    });
    const db = ctxDb(OWNER_UID);

    await runRedirectTransaction(db, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', []);

    const source = await readProduct(businessId, sourceId);
    const dest = await readProduct(businessId, destId);
    const unrelated = await readProduct(businessId, unrelatedId);

    // Only the moved relationship changed on source; every other field
    // and every other relationship entry preserved.
    assert.equal(source!.name, 'Cerveja Lager 330ml');
    assert.equal(source!.costPrice, 45.5);
    assert.deepEqual(source!.supplierWordings, [REL('supplier-1', 'Other Wording')]);

    // Destination gained exactly one new entry; its own unrelated
    // fields untouched.
    assert.equal(dest!.name, 'Cerveja Lager 500ml');
    assert.equal(dest!.costPrice, 60);
    assert.equal((dest!.supplierWordings ?? []).length, 1);
    assert.equal(dest!.supplierWordings![0].supplierRecordId, 'supplier-1');
    assert.equal(dest!.supplierWordings![0].wording, 'Lager Grande');

    // A completely unrelated third product is byte-for-byte untouched.
    assert.deepEqual(unrelated, {
      id: unrelatedId,
      name: 'Fanta Laranja',
      createdAt: unrelated!.createdAt,
      costPrice: 30,
      supplierWordings: [unrelatedRelationship],
    });
  });
});

// ---------------------------------------------------------------------
// Owner-only access — the existing, unmodified isOwnerOf(businessId)
// Firestore rule already gates every Product `update`, including a
// supplierWordings-only update; this defensively/explicitly proves
// that specific field is covered, extending (not replacing)
// tests/firestore-rules.test.ts's own generic "products" coverage.
// ---------------------------------------------------------------------
describe('Owner-only access — a Staff-tier user cannot perform a supplierWordings-only correction write', () => {
  it('removal: Staff-tier transaction is rejected by firestore.rules; Owner-tier succeeds', async () => {
    const businessId = 'biz-owner-only-removal';
    const productId = 'prod-owner-only-removal';
    await seedOwnerProfile(OWNER_UID, businessId);
    await seedStaffProfile(STAFF_UID, businessId);
    await seedProduct(businessId, {
      id: productId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [REL('supplier-1', 'Lager Grande')],
    });

    const staffDb = ctxDb(STAFF_UID);
    await assert.rejects(runRemovalTransaction(staffDb, businessId, productId, 'supplier-1', 'Lager Grande'));

    const unchanged = await readProduct(businessId, productId);
    assert.equal((unchanged!.supplierWordings ?? []).length, 1, 'Staff write must not have taken effect');

    const ownerDb = ctxDb(OWNER_UID);
    await runRemovalTransaction(ownerDb, businessId, productId, 'supplier-1', 'Lager Grande');
    const afterOwner = await readProduct(businessId, productId);
    assert.equal((afterOwner!.supplierWordings ?? []).length, 0, 'Owner write must succeed');
  });

  it('redirect: Staff-tier transaction is rejected by firestore.rules; Owner-tier succeeds', async () => {
    const businessId = 'biz-owner-only-redirect';
    const sourceId = 'prod-owner-only-redirect-src';
    const destId = 'prod-owner-only-redirect-dest';
    await seedOwnerProfile(OWNER_UID, businessId);
    await seedStaffProfile(STAFF_UID, businessId);
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [REL('supplier-1', 'Lager Grande')],
    });
    await seedProduct(businessId, { id: destId, name: 'Cerveja Lager 500ml', createdAt: new Date().toISOString() });

    const staffDb = ctxDb(STAFF_UID);
    await assert.rejects(
      runRedirectTransaction(staffDb, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', [])
    );
    const sourceUnchanged = await readProduct(businessId, sourceId);
    assert.equal((sourceUnchanged!.supplierWordings ?? []).length, 1, 'Staff redirect must not have taken effect');

    const ownerDb = ctxDb(OWNER_UID);
    await runRedirectTransaction(ownerDb, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', []);
    const sourceAfterOwner = await readProduct(businessId, sourceId);
    const destAfterOwner = await readProduct(businessId, destId);
    assert.equal((sourceAfterOwner!.supplierWordings ?? []).length, 0);
    assert.equal((destAfterOwner!.supplierWordings ?? []).length, 1);
  });
});

// ---------------------------------------------------------------------
// Tenant isolation — an owner of a DIFFERENT business cannot read or
// write this business's product documents at all, including a
// supplierWordings correction.
// ---------------------------------------------------------------------
describe('Tenant isolation — an owner of a DIFFERENT business cannot correct this business\'s relationships', () => {
  it('removal against another business\'s product is rejected; that business\'s data remains untouched', async () => {
    const businessId = 'biz-tenant-isolation-removal';
    const otherBusinessId = 'biz-tenant-isolation-removal-OTHER';
    const productId = 'prod-tenant-isolation-removal';
    await seedOwnerProfile(OWNER_UID, businessId);
    await seedOwnerProfile(OTHER_OWNER_UID, otherBusinessId);
    await seedProduct(businessId, {
      id: productId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [REL('supplier-1', 'Lager Grande')],
    });

    const otherOwnerDb = ctxDb(OTHER_OWNER_UID);
    await assert.rejects(runRemovalTransaction(otherOwnerDb, businessId, productId, 'supplier-1', 'Lager Grande'));

    const unchanged = await readProduct(businessId, productId);
    assert.equal((unchanged!.supplierWordings ?? []).length, 1, 'cross-tenant write must not have taken effect');
  });

  it('redirect against another business\'s products is rejected on every read/write path', async () => {
    const businessId = 'biz-tenant-isolation-redirect';
    const otherBusinessId = 'biz-tenant-isolation-redirect-OTHER';
    const sourceId = 'prod-tenant-isolation-redirect-src';
    const destId = 'prod-tenant-isolation-redirect-dest';
    await seedOwnerProfile(OWNER_UID, businessId);
    await seedOwnerProfile(OTHER_OWNER_UID, otherBusinessId);
    await seedProduct(businessId, {
      id: sourceId,
      name: 'Cerveja Lager 330ml',
      createdAt: new Date().toISOString(),
      supplierWordings: [REL('supplier-1', 'Lager Grande')],
    });
    await seedProduct(businessId, { id: destId, name: 'Cerveja Lager 500ml', createdAt: new Date().toISOString() });

    const otherOwnerDb = ctxDb(OTHER_OWNER_UID);
    await assert.rejects(
      runRedirectTransaction(otherOwnerDb, businessId, sourceId, destId, 'supplier-1', 'Lager Grande', [])
    );

    const sourceUnchanged = await readProduct(businessId, sourceId);
    assert.equal((sourceUnchanged!.supplierWordings ?? []).length, 1, 'cross-tenant redirect must not have taken effect');
  });
});
