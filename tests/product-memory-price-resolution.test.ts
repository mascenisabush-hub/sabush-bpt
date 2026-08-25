// Tests for the pure function in
// apps/tenant/src/lib/productMemoryPriceResolution.ts — Add Stock's
// unit-aware Product Memory price prefill (manual product selection AND
// Smart Stock Entry / receipt scanning, AddStockView.tsx).
//
// SCOPE: proves resolveUnitAwarePrice against plain in-memory
// UnitRelationship values only — no Firestore, no UI, no StockBatch.
// Matches this repository's established pure-function test pattern
// (tests/purchase-to-selling-conversion.test.ts, whose own
// getConversionFactor this function is built directly on top of).
//
// HOW TO RUN:
//   npx tsx --test tests/product-memory-price-resolution.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveUnitAwarePrice, findLatestRememberedProductMemory } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { UnitRelationship } from '../apps/tenant/src/types';

// Same canonical three-level chain used throughout this codebase's own
// worked examples: 1 Cx = 4 Emb = 24 Un.
const savanna: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 }, // 1 Cx = 4 Emb
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Emb = 6 Un => 1 Cx = 24 Un
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

describe('resolveUnitAwarePrice — same-unit fast path', () => {
  it('returns the remembered price unchanged when units already match', () => {
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Cx', savanna), '1250');
  });

  it('is case- and whitespace-insensitive when comparing units (mirrors getConversionFactor\'s own identical fix)', () => {
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', ' cx ', savanna), '1250');
    assert.equal(resolveUnitAwarePrice(1250, ' CX', 'cx', savanna), '1250');
  });

  it('takes the same-unit fast path even with NO relationship at all — no conversion is needed, so none is required', () => {
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Cx', undefined), '1250');
  });
});

describe('resolveUnitAwarePrice — genuine unit change, valid relationship', () => {
  it('correctly rescales a larger-unit remembered price down to a smaller target unit (Cx remembered -> Emb target)', () => {
    // 1250 MZN/Cx -> price/Emb = 1250 / 4 = 312.50
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Emb', savanna), '312.50');
  });

  it('correctly rescales a larger-unit remembered price down to the smallest target unit (Cx remembered -> Un target)', () => {
    // 1250 MZN/Cx -> price/Un = 1250 / 24 = 52.0833... -> 52.08
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Un', savanna), '52.08');
  });

  it('correctly rescales a smaller-unit remembered price up to a larger target unit (Un remembered -> Cx target)', () => {
    // 60 MZN/Un -> price/Cx = 60 * 24 = 1440
    assert.equal(resolveUnitAwarePrice(60, 'Un', 'Cx', savanna), '1440.00');
  });

  it('correctly rescales an interior-to-interior conversion (Emb remembered -> Un target)', () => {
    // 300 MZN/Emb -> price/Un = 300 / 6 = 50
    assert.equal(resolveUnitAwarePrice(300, 'Emb', 'Un', savanna), '50.00');
  });
});

describe('resolveUnitAwarePrice — genuine unit change, NO valid relationship: never fabricates', () => {
  it('returns "" (never the stale, wrong-unit number) when relationship is undefined', () => {
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Emb', undefined), '');
  });

  it('returns "" when relationship is present but invalid (fails isValidUnitRelationship)', () => {
    const invalid = { units: [{ unit: 'Cx', factorFromPrevious: 0 }] } as UnitRelationship; // single-unit chain, POL-0005 minimum not met
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Emb', invalid), '');
  });

  it('returns "" when the target unit is genuinely outside the confirmed chain', () => {
    assert.equal(resolveUnitAwarePrice(1250, 'Cx', 'Saco', savanna), '');
  });

  it('returns "" when the remembered unit is genuinely outside the confirmed chain', () => {
    assert.equal(resolveUnitAwarePrice(1250, 'Saco', 'Cx', savanna), '');
  });
});

describe('findLatestRememberedProductMemory — the actual Owner-reported gap: Contagem/Capital Inicial as a memory source', () => {
  it('finds a remembered price from a StockCount when the product has NEVER been purchased through Add Stock (no batch at all) — this is the exact gap reported: a product only ever counted, never bought via +Stock', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Savanna 2L',
      [], // no batches whatsoever
      [
        {
          date: '2026-08-10',
          items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Cx', costPrice: 900, sellingPrice: 1250 }],
        },
      ]
    );
    assert.deepEqual(result, { unit: 'Cx', costPrice: 900, sellingPrice: 1250 });
  });

  it("covers 'old Capital Inicial' the same way — the 'initial' StockCount type carries no special marker this function needs; it is just another confirmed StockCount", () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Savanna 2L',
      [],
      [{ date: '2025-01-05', items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Un', costPrice: 50, sellingPrice: 65 }] }]
    );
    assert.deepEqual(result, { unit: 'Un', costPrice: 50, sellingPrice: 65 });
  });

  it('picks whichever source is genuinely more recent — a newer StockCount beats an older StockBatch', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Savanna 2L',
      [{ productId: 'prod-1', unit: 'Cx', costPrice: 900, sellingPrice: 1250, dateEntered: '2026-01-01' }],
      [{ date: '2026-08-20', items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Un', costPrice: 55, sellingPrice: 70 }] }]
    );
    assert.deepEqual(result, { unit: 'Un', costPrice: 55, sellingPrice: 70 });
  });

  it('picks whichever source is genuinely more recent — an older StockCount loses to a newer StockBatch', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Savanna 2L',
      [{ productId: 'prod-1', unit: 'Cx', costPrice: 900, sellingPrice: 1250, dateEntered: '2026-08-20' }],
      [{ date: '2026-01-01', items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Un', costPrice: 55, sellingPrice: 70 }] }]
    );
    assert.deepEqual(result, { unit: 'Cx', costPrice: 900, sellingPrice: 1250 });
  });

  it('never mixes fields across sources — unit/cost/sell always come from the SAME winning record', () => {
    // If this were wrongly implemented as "take sellingPrice from
    // whichever is newest, but costPrice from the batch regardless,"
    // this test would catch it: the StockCount wins overall (newer), so
    // its OWN costPrice (55) must be returned, never the batch's (900).
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Savanna 2L',
      [{ productId: 'prod-1', unit: 'Cx', costPrice: 900, sellingPrice: 1250, dateEntered: '2026-01-01' }],
      [{ date: '2026-08-20', items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Un', costPrice: 55, sellingPrice: 70 }] }]
    );
    assert.equal(result?.costPrice, 55);
    assert.notEqual(result?.costPrice, 900);
  });

  it('matches a StockCount item by productName when productId is absent on the item (a common real shape for older records)', () => {
    const result = findLatestRememberedProductMemory('prod-1', 'Savanna 2L', [], [
      { date: '2026-08-10', items: [{ productId: '', productName: 'Savanna 2L', unit: 'Cx', costPrice: 900, sellingPrice: 1250 }] },
    ]);
    assert.deepEqual(result, { unit: 'Cx', costPrice: 900, sellingPrice: 1250 });
  });

  it('skips a StockCount item with no sellingPrice recorded (an ordinary, common state — a cost-only count) and keeps searching older counts', () => {
    const result = findLatestRememberedProductMemory('prod-1', 'Savanna 2L', [], [
      { date: '2026-08-20', items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Cx', costPrice: 900 }] }, // no sellingPrice
      { date: '2026-08-10', items: [{ productId: 'prod-1', productName: 'Savanna 2L', unit: 'Cx', costPrice: 850, sellingPrice: 1200 }] },
    ]);
    assert.deepEqual(result, { unit: 'Cx', costPrice: 850, sellingPrice: 1200 });
  });

  it('skips a StockBatch with no unit recorded (a genuine historical shape — StockBatch.unit is optional) rather than returning an unusable pair', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Savanna 2L',
      [{ productId: 'prod-1', unit: undefined, costPrice: 900, sellingPrice: 1250, dateEntered: '2026-08-20' } as any],
      []
    );
    assert.equal(result, null);
  });

  it('returns null (never a fabricated pair) for a genuinely new product with no batch and no priced Contagem entry anywhere', () => {
    const result = findLatestRememberedProductMemory('prod-new', 'Brand New Product', [], []);
    assert.equal(result, null);
  });

  it('returns null when the only StockCount entries found are for a DIFFERENT product', () => {
    const result = findLatestRememberedProductMemory('prod-1', 'Savanna 2L', [], [
      { date: '2026-08-20', items: [{ productId: 'prod-2', productName: 'Coca-Cola', unit: 'Cx', costPrice: 900, sellingPrice: 1250 }] },
    ]);
    assert.equal(result, null);
  });
});

describe('findLatestRememberedProductMemory — preferredSellingUnit (Owner-requested: "it should pull the selling unit")', () => {
  it('with multiple priced portions in the same Contagem, picks the one matching preferredSellingUnit, not merely the first one stored', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Heineken Txoti',
      [],
      [{
        date: '2026-08-24',
        items: [
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Cx', costPrice: 1500, sellingPrice: 1800 }, // stored first
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Un', costPrice: 62.5, sellingPrice: 75 },   // the product's own designated selling unit
        ],
      }],
      'Un'
    );
    assert.deepEqual(result, { unit: 'Un', costPrice: 62.5, sellingPrice: 75 });
  });

  it('is case- and whitespace-insensitive when matching preferredSellingUnit, mirroring every other unit comparison in this codebase', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Heineken Txoti',
      [],
      [{
        date: '2026-08-24',
        items: [
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Cx', costPrice: 1500, sellingPrice: 1800 },
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Un', costPrice: 62.5, sellingPrice: 75 },
        ],
      }],
      ' un '
    );
    assert.equal(result?.unit, 'Un');
  });

  it('falls back to the first matching portion when none of them use preferredSellingUnit — never returns null just because the preference missed', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Heineken Txoti',
      [],
      [{
        date: '2026-08-24',
        items: [
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Cx', costPrice: 1500, sellingPrice: 1800 },
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Emb', costPrice: 375, sellingPrice: 450 },
        ],
      }],
      'Un' // present on neither portion
    );
    assert.deepEqual(result, { unit: 'Cx', costPrice: 1500, sellingPrice: 1800 });
  });

  it('omitted entirely (no 5th argument) behaves byte-for-byte identically to before this feature existed — first match wins', () => {
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Heineken Txoti',
      [],
      [{
        date: '2026-08-24',
        items: [
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Cx', costPrice: 1500, sellingPrice: 1800 },
          { productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Un', costPrice: 62.5, sellingPrice: 75 },
        ],
      }]
    );
    assert.deepEqual(result, { unit: 'Cx', costPrice: 1500, sellingPrice: 1800 });
  });

  it('a single portion (the ordinary case) is entirely unaffected by preferredSellingUnit, matched or not', () => {
    const singlePortionCount = { date: '2026-08-24', items: [{ productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Cx', costPrice: 1500, sellingPrice: 1800 }] };
    const withPreference = findLatestRememberedProductMemory('prod-1', 'Heineken Txoti', [], [singlePortionCount], 'Un');
    const withoutPreference = findLatestRememberedProductMemory('prod-1', 'Heineken Txoti', [], [singlePortionCount]);
    assert.deepEqual(withPreference, withoutPreference);
  });

  it('preferredSellingUnit only tie-breaks WITHIN the winning count — never changes which count/batch wins overall', () => {
    // A newer StockBatch (Cx-only, no preference possible) still beats
    // an older StockCount that happens to have a Un-matching portion —
    // the preference never overrides "which source is more recent."
    const result = findLatestRememberedProductMemory(
      'prod-1',
      'Heineken Txoti',
      [{ productId: 'prod-1', unit: 'Cx', costPrice: 1600, sellingPrice: 1900, dateEntered: '2026-08-24' }],
      [{
        date: '2026-01-01',
        items: [{ productId: 'prod-1', productName: 'Heineken Txoti', unit: 'Un', costPrice: 62.5, sellingPrice: 75 }],
      }],
      'Un'
    );
    assert.deepEqual(result, { unit: 'Cx', costPrice: 1600, sellingPrice: 1900 });
  });
});
