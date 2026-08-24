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
import { resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
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
