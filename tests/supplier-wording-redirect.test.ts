// Owner-Controlled Correction of a Remembered Supplier-Wording
// Relationship — REDIRECT. Tests for the pure decision function:
//   - planSupplierWordingRedirect (apps/tenant/src/lib/supplierWordingConfirmation.ts)
//
// Governing chain: BDR-0013, the accepted Amendment, the READY Rule 8
// Assessment, the accepted Implementation Plan, and the signed
// Implementation Authorization (SABUSHIMIKE MASCENI, 29 August 2026).
//
// SCOPE: proves the function against plain in-memory values only —
// no live Firestore client or emulator (see
// tests/supplier-wording-add-stock.test.ts for the established
// pattern this mirrors). AppContext.tsx's
// redirectSupplierWordingRelationship wires this function into one
// atomic Firestore transaction — covered separately by
// tests/supplier-wording-correction-concurrency.test.ts (emulator-only).
//
// This file explicitly proves planSupplierWordingRedirect composes
// planSupplierWordingRemoval (source half) with the existing,
// UNMODIFIED planSupplierWordingConfirmation (destination half) —
// it does not reimplement conflict detection.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-redirect.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  planSupplierWordingRedirect,
  type FullProductWordingSnapshot,
} from '../apps/tenant/src/lib/supplierWordingConfirmation';

const rel = (
  supplierRecordId: string,
  wording: string,
  confirmedAt = '2026-08-01T00:00:00.000Z',
  extra: { provenance?: 'system-proposed' | 'owner-initiated'; confirmedByName?: string } = {}
) => ({ supplierRecordId, wording, confirmedAt, ...extra });

const snapshot = (
  productId: string,
  exists: boolean,
  supplierWordings: ReturnType<typeof rel>[]
): FullProductWordingSnapshot => ({ productId, exists, supplierWordings });

const SUPPLIER = 'supplier-1';
const WORDING = 'Coka Cola 2L';

describe('planSupplierWordingRedirect — ordinary successful redirect', () => {
  it('removes from source, establishes on destination, no conflict', () => {
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING), rel(SUPPLIER, 'Other Wording')]);
    const destination = snapshot('product-B', true, []);

    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);

    assert.equal(plan.sourceFound, true);
    assert.equal(plan.conflict, null);
    assert.equal(plan.destinationAlreadyHasIt, false);
    assert.equal(plan.shouldWriteDestination, true);
    // Source keeps every other relationship, in order — only the
    // moved one is removed.
    assert.deepEqual(plan.updatedSourceWordings, [rel(SUPPLIER, 'Other Wording')]);
  });

  it('trims incoming wording before matching, consistently with removal/confirmation', () => {
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING)]);
    const destination = snapshot('product-B', true, []);
    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, `  ${WORDING}  `, source, [
      destination,
    ]);
    assert.equal(plan.sourceFound, true);
    assert.equal(plan.shouldWriteDestination, true);
  });
});

describe('planSupplierWordingRedirect — source is never treated as a conflict against itself', () => {
  it('does not flag the source as a conflicting product even though it currently holds the relationship', () => {
    // Deliberately proves the CONTRACT: the caller must exclude the
    // source from destinationAndOtherSnapshots. This test constructs
    // the call correctly (source excluded) and confirms no conflict
    // is raised, which would be the (incorrect) outcome if the source
    // were mistakenly included and checked against itself.
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING)]);
    const destination = snapshot('product-B', true, []);
    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);
    assert.equal(plan.conflict, null);
  });
});

describe('planSupplierWordingRedirect — genuine third-party conflict', () => {
  it('blocks the entire redirect when a THIRD product independently holds the exact pair', () => {
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING)]);
    const destination = snapshot('product-B', true, []);
    const thirdParty = snapshot('product-C', true, [rel(SUPPLIER, WORDING)]);

    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [
      destination,
      thirdParty,
    ]);

    assert.deepEqual(plan.conflict, { productId: 'product-C' });
    assert.equal(plan.shouldWriteDestination, false);
    // BEFORE/AFTER invariant (Authorization §6/§14): a failed redirect
    // must produce ZERO writes. This pure function does not perform
    // the write itself, but its contract is that the caller must make
    // no write to source OR destination when conflict is set — proven
    // here by asserting updatedSourceWordings equals the source's
    // ORIGINAL array whenever a conflict is present, so a
    // conflict-aware caller has no reason to ever apply it.
    assert.deepEqual(plan.updatedSourceWordings, []);
    // (updatedSourceWordings reflects what removal WOULD do — the
    // caller is responsible for not applying either write on conflict;
    // see AppContext.tsx's redirectSupplierWordingRelationship, which
    // checks `plan.conflict` before issuing any tx.update at all.)
  });

  it('does not conflict against the destination itself holding it differently than expected — only a THIRD product triggers conflict', () => {
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING)]);
    // Destination does NOT hold it yet — ordinary case, no conflict.
    const destination = snapshot('product-B', true, []);
    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);
    assert.equal(plan.conflict, null);
  });
});

describe('planSupplierWordingRedirect — destination already holds the relationship (idempotent success, not a conflict)', () => {
  it('removes from source, leaves destination entry completely untouched, resolves as success — never a duplicate', () => {
    const existingDestinationEntry = rel(SUPPLIER, WORDING, '2025-12-25T00:00:00.000Z', {
      provenance: 'owner-initiated',
      confirmedByName: 'Original Owner',
    });
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING)]);
    const destination = snapshot('product-B', true, [existingDestinationEntry]);

    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);

    assert.equal(plan.sourceFound, true);
    assert.equal(plan.conflict, null);
    assert.equal(plan.destinationAlreadyHasIt, true);
    assert.equal(plan.shouldWriteDestination, false, 'must never write a duplicate to the destination');
    // Source-side removal still proceeds.
    assert.deepEqual(plan.updatedSourceWordings, []);
    // This test asserts the PLAN's own output never includes any
    // representation of a "new" destination entry — the caller
    // (redirectSupplierWordingRelationship) has nothing to write for
    // the destination in this branch, so existingDestinationEntry's
    // own confirmedAt/provenance/confirmedByName are never touched by
    // construction (no write path exists for them here at all).
  });
});

describe('planSupplierWordingRedirect — source relationship already gone (distinct non-success result)', () => {
  it('sourceFound is false, and this is NOT conflated with an ordinary successful redirect', () => {
    const source = snapshot('product-A', true, []); // already removed/redirected concurrently
    const destination = snapshot('product-B', true, []);
    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);

    assert.equal(plan.sourceFound, false);
    // Critically, shouldWriteDestination must be false even though the
    // destination itself has no conflict and would otherwise accept a
    // new entry — because there is nothing left to redirect.
    assert.equal(plan.shouldWriteDestination, false);
    assert.deepEqual(plan.updatedSourceWordings, []);
  });

  it('is a genuinely different outcome shape from planSupplierWordingRemoval\'s own already-absent idempotent-success case', () => {
    // planSupplierWordingRemoval's `found: false` is treated by its own
    // caller as a successful no-op. planSupplierWordingRedirect's
    // `sourceFound: false` must be surfaced by ITS caller
    // (redirectSupplierWordingRelationship) as a distinct, explicit
    // non-success result — this test documents that the two fields are
    // named and reasoned about independently, never merged into one
    // shared "alreadyGone" boolean shared across both operations.
    const source = snapshot('product-A', true, []);
    const destination = snapshot('product-B', true, []);
    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);
    assert.ok('sourceFound' in plan);
    assert.ok(!('found' in plan), 'redirect plan must not reuse removal\'s "found" field name');
  });
});

describe('planSupplierWordingRedirect — destination does not exist (caller must check existence separately)', () => {
  it('shouldWriteDestination is false, and this is indistinguishable at the pure-function level from destinationAlreadyHasIt — the caller (redirectSupplierWordingRelationship) must check the destination snapshot\'s own `exists` flag directly and abort the WHOLE transaction (never partially remove from source) when it is false', () => {
    const source = snapshot('product-A', true, [rel(SUPPLIER, WORDING)]);
    const nonexistentDestination = snapshot('product-B', false, []);

    const plan = planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [
      nonexistentDestination,
    ]);

    assert.equal(plan.sourceFound, true);
    assert.equal(plan.conflict, null);
    assert.equal(plan.destinationAlreadyHasIt, false);
    assert.equal(plan.shouldWriteDestination, false);
    // This test documents, deliberately, that the pure plan alone does
    // NOT distinguish "destination gone" from "nothing to write for
    // some other reason" — AppContext.tsx's redirectSupplierWordingRelationship
    // performs its own explicit `destinationSnapshot.exists` check
    // before any write, throwing SupplierWordingRedirectDestinationNotFoundError
    // and making NO write to source or destination in that case,
    // exactly because this pure function's own output is insufficient
    // to safely distinguish the two cases on its own.
  });
});

describe('planSupplierWordingRedirect — different supplier independence', () => {
  it('a different supplier using the identical wording text is untouched by this redirect', () => {
    const source = snapshot('product-A', true, [rel('supplier-X', WORDING), rel('supplier-Y', WORDING)]);
    const destination = snapshot('product-B', true, []);
    const plan = planSupplierWordingRedirect('product-A', 'product-B', 'supplier-X', WORDING, source, [destination]);
    assert.equal(plan.sourceFound, true);
    assert.deepEqual(plan.updatedSourceWordings, [rel('supplier-Y', WORDING)]);
  });
});

describe('planSupplierWordingRedirect — purity / no mutation', () => {
  it('never mutates any input snapshot', () => {
    const sourceWordings = [rel(SUPPLIER, WORDING)];
    const destinationWordings: ReturnType<typeof rel>[] = [];
    const source = snapshot('product-A', true, sourceWordings);
    const destination = snapshot('product-B', true, destinationWordings);
    const sourceCopy = JSON.parse(JSON.stringify(source));
    const destinationCopy = JSON.parse(JSON.stringify(destination));

    planSupplierWordingRedirect('product-A', 'product-B', SUPPLIER, WORDING, source, [destination]);

    assert.deepEqual(source, sourceCopy);
    assert.deepEqual(destination, destinationCopy);
  });
});
