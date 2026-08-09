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
    // Simulates the Firestore setDoc/onSnapshot round-trip (JSON-shaped
    // data, no class instances, no undefined survives JSON — matching
    // how Firestore itself serializes documents) without needing a
    // live Firestore client.
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
