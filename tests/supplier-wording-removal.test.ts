// Owner-Controlled Correction of a Remembered Supplier-Wording
// Relationship — REMOVAL. Tests for the pure decision function:
//   - planSupplierWordingRemoval (apps/tenant/src/lib/supplierWordingConfirmation.ts)
//
// Governing chain: BDR-0013, the accepted Amendment
// (docs/specs/product-identity-alternative-name-relationship-correction-amendment.md),
// the READY Rule 8 Assessment, the accepted Implementation Plan, and
// the signed Implementation Authorization
// (docs/engineering/product-identity-alternative-name-relationship-correction-implementation-authorization.md,
// SABUSHIMIKE MASCENI, 29 August 2026).
//
// SCOPE: proves the function against plain in-memory values only,
// matching this repository's established pattern for testing
// transaction/decision logic without a live Firestore client or
// emulator (see planSupplierWordingConfirmation's own
// tests/supplier-wording-add-stock.test.ts). AppContext.tsx's
// removeSupplierWordingRelationship wires this function into a real
// Firestore transaction — covered separately by
// tests/supplier-wording-correction-concurrency.test.ts (emulator-only).
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-removal.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { planSupplierWordingRemoval } from '../apps/tenant/src/lib/supplierWordingConfirmation';

const rel = (
  supplierRecordId: string,
  wording: string,
  confirmedAt = '2026-08-01T00:00:00.000Z',
  extra: { provenance?: 'system-proposed' | 'owner-initiated'; confirmedByName?: string } = {}
) => ({ supplierRecordId, wording, confirmedAt, ...extra });

describe('planSupplierWordingRemoval — exact identity, found case', () => {
  it('removes the exact (supplierRecordId, wording) entry and nothing else', () => {
    const target = {
      supplierWordings: [
        rel('supplier-1', 'Coka Cola 2L'),
        rel('supplier-1', 'Fanta Laranja 500ml'),
      ],
    };
    const plan = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', target);
    assert.equal(plan.found, true);
    assert.deepEqual(plan.updatedWordings, [rel('supplier-1', 'Fanta Laranja 500ml')]);
  });

  it('trims incoming wording before matching, exactly like planSupplierWordingConfirmation', () => {
    const target = { supplierWordings: [rel('supplier-1', 'Coka Cola 2L')] };
    const plan = planSupplierWordingRemoval('supplier-1', '  Coka Cola 2L  ', target);
    assert.equal(plan.found, true);
    assert.deepEqual(plan.updatedWordings, []);
  });

  it('preserves every other entry unchanged and in order, including confirmedAt/provenance/confirmedByName', () => {
    const untouched1 = rel('supplier-1', 'Fanta Laranja 500ml', '2026-01-01T00:00:00.000Z', {
      provenance: 'owner-initiated',
      confirmedByName: 'Ana',
    });
    const untouched2 = rel('supplier-2', 'Coka Cola 2L', '2026-02-02T00:00:00.000Z', {
      provenance: 'system-proposed',
    });
    const target = {
      supplierWordings: [untouched1, rel('supplier-1', 'Coka Cola 2L'), untouched2],
    };
    const plan = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', target);
    assert.equal(plan.found, true);
    // Order preserved, and untouched entries are byte-for-byte identical
    // — every field, not just supplierRecordId/wording.
    assert.deepEqual(plan.updatedWordings, [untouched1, untouched2]);
  });

  it('a different supplier using the identical wording text remains completely independent (Scenario C)', () => {
    const target = {
      supplierWordings: [rel('supplier-X', 'Coka Cola 2L'), rel('supplier-Y', 'Coka Cola 2L')],
    };
    const plan = planSupplierWordingRemoval('supplier-X', 'Coka Cola 2L', target);
    assert.equal(plan.found, true);
    assert.deepEqual(plan.updatedWordings, [rel('supplier-Y', 'Coka Cola 2L')]);
  });
});

describe('planSupplierWordingRemoval — already-absent case (idempotent success)', () => {
  it('returns found: false and an unchanged (but new-reference) array when the relationship never existed', () => {
    const target = { supplierWordings: [rel('supplier-1', 'Fanta Laranja 500ml')] };
    const plan = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', target);
    assert.equal(plan.found, false);
    assert.deepEqual(plan.updatedWordings, target.supplierWordings);
    // Idempotent no-op: this is success, not an error — the caller
    // (removeSupplierWordingRelationship) makes no write for this case.
  });

  it('returns found: false for an empty supplierWordings array', () => {
    const plan = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', { supplierWordings: [] });
    assert.equal(plan.found, false);
    assert.deepEqual(plan.updatedWordings, []);
  });

  it('a retried removal of an already-removed relationship is idempotent (second call finds nothing)', () => {
    const target = {
      supplierWordings: [rel('supplier-1', 'Coka Cola 2L'), rel('supplier-1', 'Fanta Laranja 500ml')],
    };
    const first = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', target);
    assert.equal(first.found, true);
    const second = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', {
      supplierWordings: first.updatedWordings,
    });
    assert.equal(second.found, false);
    assert.deepEqual(second.updatedWordings, first.updatedWordings);
  });
});

describe('planSupplierWordingRemoval — purity / no mutation', () => {
  it('never mutates the input array or its entries', () => {
    const original = [rel('supplier-1', 'Coka Cola 2L'), rel('supplier-1', 'Fanta Laranja 500ml')];
    const snapshotCopy = JSON.parse(JSON.stringify(original));
    const target = { supplierWordings: original };
    const plan = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', target);
    assert.deepEqual(original, snapshotCopy, 'input array must be unchanged after the call');
    assert.notEqual(plan.updatedWordings, original, 'must return a new array, never the same reference');
  });

  it('never touches any field other than the supplierWordings array contents (no Product-level field exists on this pure function\'s input/output at all)', () => {
    // planSupplierWordingRemoval's signature only ever receives/returns
    // { supplierWordings }, structurally incapable of reading or writing
    // Product.name/Product.id/unitRelationship/costPrice/sellingPrice —
    // this test documents that structural guarantee explicitly.
    const target = { supplierWordings: [rel('supplier-1', 'Coka Cola 2L')] };
    const plan = planSupplierWordingRemoval('supplier-1', 'Coka Cola 2L', target);
    assert.deepEqual(Object.keys(plan).sort(), ['found', 'updatedWordings']);
  });
});
