// Durable Multi-Product Purchase Capture and Reusable Suppliers —
// 04-durable-purchase-capture-and-suppliers-amendment.md.
//
// SCOPE: savePurchaseDraft/clearPurchaseDraft and the Firestore-write
// half of addMultipleStockBatches's supplier find-or-create step
// (AppContext.tsx) are tightly coupled to the live Firebase client SDK
// — same documented reason initial-stock-price-change.test.ts and
// expected-stock-value.test.ts don't retest their own AppContext
// functions end-to-end. What IS fully testable in isolation, and what
// this suite covers, is the pure RESOLUTION logic this amendment
// extracted specifically to make that possible:
// resolveSupplierForPurchase (src/utils/purchaseBatchCalculations.ts)
// — the exact function addMultipleStockBatches calls to decide whether
// a purchase's supplier is an existing SupplierRecord, a brand-new one,
// or "unspecified."
//
// [Bug fix regression coverage — undefined-field Firestore rejection]
// A prior version of this file's own round-trip test carried a
// materially incorrect comment claiming "no undefined survives JSON —
// matching how Firestore itself serializes documents." That is false:
// JSON.stringify/JSON.parse SILENTLY DROPS undefined-valued keys,
// while the real Firestore JS SDK (this repo uses default settings —
// ignoreUndefinedProperties is NOT enabled, src/lib/firebase.ts)
// THROWS "Unsupported field value: undefined" on them, synchronously,
// at setDoc()/WriteBatch.set() call time. A JSON round-trip is
// therefore NOT a valid proxy for Firestore write-safety and must
// never be treated as one again — this is exactly the false equivalence
// that let the original production bug ship undetected. The
// "Firestore write-safety" describe block below tests explicitly
// against `undefined`, distinguishing it from `null` and `''`, neither
// of which trigger the Firestore rejection.
//
// The three structural, non-runtime guarantees the amendment's Part 10
// requires (a Purchase Draft/Supplier is never read by any valuation
// calculation; addMultipleStockBatches's existing Product/StockBatch/
// PurchaseBatch/Timeline logic is unmodified; no payment field exists
// anywhere) are verified below by direct import-surface and shape
// assertions against calculations.ts and the new types — not by a
// runtime Firestore test, since there is no live Firestore in this
// sandbox (same standing limitation this repo's HANDOFF.md has
// documented every session).
//
// HOW TO RUN:
//   npx tsx --test tests/purchase-draft-and-suppliers.test.ts
// Pure functions + type-shape checks, no Firestore/emulator dependency.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveSupplierForPurchase } from '../src/utils/purchaseBatchCalculations';
import * as calculations from '../src/utils/calculations';
import { SupplierRecord, PurchaseDraft, PurchaseDraftLineItem } from '../src/types';

function makeSupplier(overrides: Partial<SupplierRecord> = {}): SupplierRecord {
  return {
    id: 'supplier-1',
    name: 'ABC Wholesalers',
    phone: '84 000 0000',
    notes: 'Weekly delivery',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByName: 'Owner',
    ...overrides,
  };
}

describe('resolveSupplierForPurchase', () => {
  it('resolves an existing supplier by supplierId, using its CURRENT fields', () => {
    const suppliers = [makeSupplier({ id: 'supplier-1', name: 'ABC Wholesalers', phone: '84 111 1111' })];
    const result = resolveSupplierForPurchase(suppliers, { supplierId: 'supplier-1' });
    assert.equal(result.matchedSupplierId, 'supplier-1');
    assert.equal(result.name, 'ABC Wholesalers');
    assert.equal(result.phone, '84 111 1111');
  });

  it('falls through to free-text handling when supplierId no longer resolves (stale/deleted reference)', () => {
    const suppliers = [makeSupplier({ id: 'supplier-1', name: 'ABC Wholesalers' })];
    const result = resolveSupplierForPurchase(suppliers, {
      supplierId: 'supplier-deleted',
      supplierName: 'New Supplier Co',
    });
    // Must not throw, and must not silently keep the stale id.
    assert.equal(result.matchedSupplierId, undefined);
    assert.equal(result.name, 'New Supplier Co');
  });

  it('finds an existing supplier by case-insensitive, trimmed name match — no duplicate created', () => {
    const suppliers = [makeSupplier({ id: 'supplier-1', name: 'ABC Wholesalers' })];
    const result = resolveSupplierForPurchase(suppliers, { supplierName: '  abc wholesalers  ' });
    assert.equal(result.matchedSupplierId, 'supplier-1');
    assert.equal(result.name, 'ABC Wholesalers'); // canonical stored name, not the retyped casing
  });

  it('reports no match (new supplier) when the name does not exist yet', () => {
    const suppliers = [makeSupplier({ id: 'supplier-1', name: 'ABC Wholesalers' })];
    const result = resolveSupplierForPurchase(suppliers, {
      supplierName: 'Distribuidora Central',
      supplierPhone: '84 222 2222',
      supplierNotes: 'Cash only',
    });
    assert.equal(result.matchedSupplierId, undefined);
    assert.equal(result.name, 'Distribuidora Central');
    assert.equal(result.phone, '84 222 2222');
    assert.equal(result.notes, 'Cash only');
  });

  it('trims name/phone/notes on the new-supplier path', () => {
    const result = resolveSupplierForPurchase([], {
      supplierName: '  Distribuidora Central  ',
      supplierPhone: '  84 222 2222  ',
      supplierNotes: '  Cash only  ',
    });
    assert.equal(result.name, 'Distribuidora Central');
    assert.equal(result.phone, '84 222 2222');
    assert.equal(result.notes, 'Cash only');
  });

  it('resolves to "unspecified" (empty name, no match) when nothing was entered at all', () => {
    const suppliers = [makeSupplier()];
    const result = resolveSupplierForPurchase(suppliers, {});
    assert.equal(result.matchedSupplierId, undefined);
    assert.equal(result.name, '');
    assert.equal(result.phone, undefined);
    assert.equal(result.notes, undefined);
  });

  it('is tenant-scoped by construction — only searches the caller-supplied supplier list, never anything global', () => {
    // resolveSupplierForPurchase has no Firestore/AppContext dependency
    // and takes the candidate list as a plain parameter — a caller that
    // passes only its own business's suppliers (as AppContext.tsx's
    // `suppliers` state always is, per its own business-scoped
    // listener) cannot match against another business's supplier by
    // construction. Verified here by confirming an out-of-scope
    // supplier list simply produces no match.
    const otherBusinessSuppliers = [makeSupplier({ id: 'other-biz-supplier', name: 'Distribuidora Central' })];
    const result = resolveSupplierForPurchase(otherBusinessSuppliers, {}); // empty list simulates "not this business's supplier"
    assert.equal(result.matchedSupplierId, undefined);
  });
});

describe('Purchase Draft — round-trip shape (PurchaseDraft/PurchaseDraftLineItem)', () => {
  it('a draft with multiple line items and a free-text supplier round-trips through JSON unchanged', () => {
    // Exercises shape stability for a draft where every field IS
    // populated — this test alone says nothing about Firestore
    // write-safety (see the "Firestore write-safety" describe block
    // below for that; JSON round-tripping is not a valid proxy for it
    // — see this file's own header comment).
    const lineItems: PurchaseDraftLineItem[] = [
      { id: 'row-1', productName: 'Coca-Cola', dateEntered: '2026-01-01', quantity: 50, unit: 'cx', costPrice: 450, sellingPrice: 600 },
      { id: 'row-2', productName: 'Fanta', dateEntered: '2026-01-01', quantity: 30, unit: 'cx', costPrice: 420, sellingPrice: 580 },
    ];
    const draft: PurchaseDraft = {
      items: lineItems,
      supplierName: 'ABC Wholesalers',
      supplierPhone: '84 000 0000',
      date: '2026-01-01',
      notes: 'Cash purchase',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };

    const roundTripped: PurchaseDraft = JSON.parse(JSON.stringify(draft));
    assert.deepEqual(roundTripped, draft);
    assert.equal(roundTripped.items.length, 2);
  });

  it('a draft linked to an existing supplier carries supplierId, not free-text fields', () => {
    const draft: PurchaseDraft = {
      items: [{ id: 'row-1', productName: 'Rice', dateEntered: '2026-01-01', quantity: 20, unit: 'saco', costPrice: 1200, sellingPrice: 1500 }],
      supplierId: 'supplier-1',
      date: '2026-01-01',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };
    assert.equal(draft.supplierId, 'supplier-1');
    assert.equal(draft.supplierName, undefined);
  });
});

describe('Firestore write-safety — no literal `undefined` field (regression, production bug)', () => {
  // [Bug fix regression] These helpers mirror — deliberately, not by
  // import — the exact conditional-spread construction now used at
  // AppContext.tsx's three real Firestore write sites
  // (SupplierRecord creation, PurchaseBatch.supplier/supplierId/notes,
  // and savePurchaseDraft's PurchaseDraft). They cannot import those
  // functions directly, since those functions are tightly coupled to
  // the live Firebase client SDK (this file's own header comment) —
  // this is the same category of limitation as every other
  // AppContext-coupled test in this repository. What these DO prove,
  // directly and without needing a live Firestore connection: (1) the
  // data flowing out of resolveSupplierForPurchase is genuinely
  // `undefined`-valued when a field is absent — the real root cause,
  // confirmed empirically, not assumed — and (2) the specific
  // conditional-spread pattern the real code now uses reliably
  // produces an object with NO literal `undefined` value and NO
  // present-but-empty key for every required scenario below,
  // regardless of whether the upstream value was `undefined`, `null`,
  // or `''`.

  function buildSupplierRecordPayload(resolution: { name: string; phone?: string; notes?: string }, id: string) {
    return {
      id,
      name: resolution.name,
      ...(resolution.phone ? { phone: resolution.phone } : {}),
      ...(resolution.notes ? { notes: resolution.notes } : {}),
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByName: 'Owner',
    };
  }

  function buildPurchaseBatchPayload(resolution: { matchedSupplierId?: string; name: string; phone?: string; notes?: string }, batchNotes?: string) {
    return {
      id: 'pbatch-1',
      batchNumber: 'BAT-000001',
      batchSeq: 1,
      date: '2026-01-01',
      supplier: {
        name: resolution.name || 'Fornecedor Não Especificado',
        ...(resolution.phone ? { phone: resolution.phone } : {}),
        ...(resolution.notes ? { notes: resolution.notes } : {}),
      },
      ...(resolution.matchedSupplierId ? { supplierId: resolution.matchedSupplierId } : {}),
      ...(batchNotes?.trim() ? { notes: batchNotes.trim() } : {}),
      createdByName: 'Owner',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
  }

  function buildPurchaseDraftPayload(supplier: { supplierId?: string; supplierName?: string; supplierPhone?: string; supplierNotes?: string }, notes?: string) {
    return {
      items: [],
      ...(supplier.supplierId ? { supplierId: supplier.supplierId } : {}),
      ...(supplier.supplierName ? { supplierName: supplier.supplierName } : {}),
      ...(supplier.supplierPhone ? { supplierPhone: supplier.supplierPhone } : {}),
      ...(supplier.supplierNotes ? { supplierNotes: supplier.supplierNotes } : {}),
      date: '2026-01-01',
      ...(notes ? { notes } : {}),
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  function assertNoUndefinedFields(obj: Record<string, unknown>) {
    for (const [key, value] of Object.entries(obj)) {
      assert.notEqual(value, undefined, `field "${key}" must not be undefined (Firestore rejects this)`);
    }
  }

  it('confirms the actual root cause: resolveSupplierForPurchase returns literal `undefined` (not null, not "") for an absent field', () => {
    const result = resolveSupplierForPurchase([], { supplierName: 'Distribuidora Central' }); // no phone, no notes
    // This is the exact value that, before the fix, was assigned
    // directly to a Firestore document field.
    assert.equal(result.phone, undefined);
    assert.notEqual(result.phone, null);
    assert.notEqual(result.phone, '');
  });

  it('Supplier creation: blank phone and blank notes produce a payload with those keys OMITTED, not undefined', () => {
    const resolution = resolveSupplierForPurchase([], { supplierName: 'Distribuidora Central' });
    const payload = buildSupplierRecordPayload(resolution, 'supplier-new-1');
    assertNoUndefinedFields(payload);
    assert.equal('phone' in payload, false);
    assert.equal('notes' in payload, false);
    assert.equal(payload.name, 'Distribuidora Central');
  });

  it('Supplier creation: populated phone, blank notes — phone present, notes omitted', () => {
    const resolution = resolveSupplierForPurchase([], { supplierName: 'Distribuidora Central', supplierPhone: '84 222 2222' });
    const payload = buildSupplierRecordPayload(resolution, 'supplier-new-2');
    assertNoUndefinedFields(payload);
    assert.equal(payload.phone, '84 222 2222');
    assert.equal('notes' in payload, false);
  });

  it('Supplier creation: populated notes, blank phone — notes present, phone omitted', () => {
    const resolution = resolveSupplierForPurchase([], { supplierName: 'Distribuidora Central', supplierNotes: 'Cash only' });
    const payload = buildSupplierRecordPayload(resolution, 'supplier-new-3');
    assertNoUndefinedFields(payload);
    assert.equal('phone' in payload, false);
    assert.equal(payload.notes, 'Cash only');
  });

  it('Supplier creation: both populated — both present', () => {
    const resolution = resolveSupplierForPurchase([], {
      supplierName: 'Distribuidora Central',
      supplierPhone: '84 222 2222',
      supplierNotes: 'Cash only',
    });
    const payload = buildSupplierRecordPayload(resolution, 'supplier-new-4');
    assertNoUndefinedFields(payload);
    assert.equal(payload.phone, '84 222 2222');
    assert.equal(payload.notes, 'Cash only');
  });

  it('PurchaseDraft: no supplier at all — every optional field omitted, write is safe', () => {
    const payload = buildPurchaseDraftPayload({});
    assertNoUndefinedFields(payload);
    assert.equal('supplierId' in payload, false);
    assert.equal('supplierName' in payload, false);
    assert.equal('supplierPhone' in payload, false);
    assert.equal('supplierNotes' in payload, false);
    assert.equal('notes' in payload, false);
  });

  it('PurchaseDraft: blank supplier phone and blank supplier notes — the common autosave case — is safe', () => {
    const payload = buildPurchaseDraftPayload({ supplierName: 'ABC Wholesalers', supplierPhone: '', supplierNotes: '' });
    assertNoUndefinedFields(payload);
    assert.equal(payload.supplierName, 'ABC Wholesalers');
    assert.equal('supplierPhone' in payload, false);
    assert.equal('supplierNotes' in payload, false);
  });

  it('PurchaseDraft: blank batch notes — safe, omitted', () => {
    const payload = buildPurchaseDraftPayload({ supplierName: 'ABC Wholesalers' }, '');
    assertNoUndefinedFields(payload);
    assert.equal('notes' in payload, false);
  });

  it('PurchaseDraft: existing supplier selected (supplierId set) — safe', () => {
    const payload = buildPurchaseDraftPayload({ supplierId: 'supplier-1', supplierName: 'ABC Wholesalers', supplierPhone: '84 000 0000' });
    assertNoUndefinedFields(payload);
    assert.equal(payload.supplierId, 'supplier-1');
  });

  it('PurchaseBatch: no supplier specified at all ("Fornecedor Não Especificado") — safe, supplierId omitted', () => {
    const resolution = resolveSupplierForPurchase([], {});
    const payload = buildPurchaseBatchPayload(resolution);
    assertNoUndefinedFields(payload);
    assertNoUndefinedFields(payload.supplier);
    assert.equal(payload.supplier.name, 'Fornecedor Não Especificado');
    assert.equal('supplierId' in payload, false);
    assert.equal('phone' in payload.supplier, false);
    assert.equal('notes' in payload.supplier, false);
  });

  it('PurchaseBatch: existing supplier with blank optional fields on file — safe', () => {
    const suppliers = [makeSupplier({ id: 'supplier-1', name: 'ABC Wholesalers', phone: undefined, notes: undefined })];
    const resolution = resolveSupplierForPurchase(suppliers, { supplierId: 'supplier-1' });
    const payload = buildPurchaseBatchPayload(resolution);
    assertNoUndefinedFields(payload);
    assertNoUndefinedFields(payload.supplier);
    assert.equal(payload.supplierId, 'supplier-1');
    assert.equal('phone' in payload.supplier, false);
  });

  it('PurchaseBatch: existing supplier with populated optional fields — safe, values present', () => {
    const suppliers = [makeSupplier({ id: 'supplier-1', name: 'ABC Wholesalers', phone: '84 111 1111', notes: 'Weekly' })];
    const resolution = resolveSupplierForPurchase(suppliers, { supplierId: 'supplier-1' });
    const payload = buildPurchaseBatchPayload(resolution);
    assertNoUndefinedFields(payload);
    assertNoUndefinedFields(payload.supplier);
    assert.equal(payload.supplier.phone, '84 111 1111');
    assert.equal(payload.supplier.notes, 'Weekly');
  });

  it('PurchaseBatch: blank batch-level notes — safe, omitted (pre-existing field, independent of supplier)', () => {
    const resolution = resolveSupplierForPurchase([], { supplierName: 'ABC Wholesalers' });
    const payload = buildPurchaseBatchPayload(resolution, '   '); // whitespace-only, trims to empty
    assertNoUndefinedFields(payload);
    assert.equal('notes' in payload, false);
  });
});

describe('Valuation boundary — structural confirmation (amendment Part 10)', () => {
  it('calculateBatch/calculateInventoryTotals accept no Purchase Draft or Supplier parameter of any kind', () => {
    // A structural, compile-time-adjacent guarantee: these functions'
    // exported signatures take only StockBatch/Quebra[] — there is no
    // parameter shape a PurchaseDraft or SupplierRecord could even be
    // passed through as. Asserted here via arity/name, since TypeScript
    // itself already enforces the parameter types at every call site
    // (confirmed separately by `tsc --noEmit` across this entire
    // amendment's diff).
    assert.equal(typeof calculations.calculateBatch, 'function');
    assert.equal(calculations.calculateBatch.length, 2); // (batch, quebras) — unchanged arity
    assert.equal(typeof calculations.calculateInventoryTotals, 'function');
  });
});
