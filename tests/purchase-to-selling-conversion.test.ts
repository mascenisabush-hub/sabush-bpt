// Increment B, Checkpoint B2 — tests for the pure multi-hop
// purchase-to-selling conversion functions in
// apps/tenant/src/lib/purchaseToSellingConversion.ts (Consolidated
// Specification §13, Rule 8 Assessment Finding 2).
//
// SCOPE: proves getConversionFactor / computeRatePerPurchaseUnit /
// deriveTransactionValuation against plain in-memory UnitRelationship
// values only — no Firestore, no UI, no StockBatch (that integration is
// Checkpoint B3/B4). Matches this repository's established pure-
// function test pattern.
//
// Test groups below mirror the governing prompt's own minimum-testing
// checklist for §13: one-hop forward, multi-hop forward, one-hop
// reverse, multi-hop reverse, purchase unit == selling unit,
// interior-to-interior conversion, fractional/reverse factor, invalid
// relationship, missing Product Memory, no matching purchase/selling
// unit, and precision/rounding.
//
// HOW TO RUN:
//   npx tsx --test tests/purchase-to-selling-conversion.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  getConversionFactor,
  computeRatePerPurchaseUnit,
  deriveTransactionValuation,
} from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

// Canonical three-level chain used throughout the Consolidated
// Specification's own worked examples: 1 Cx = 4 Emb = 24 Un.
const savanna: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 }, // ignored for units[0]
    { unit: 'Emb', factorFromPrevious: 4 }, // 1 Cx = 4 Emb
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Emb = 6 Un  =>  1 Cx = 24 Un
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

// A simple two-level chain, purchase unit adjacent to selling unit.
const simpleTwoLevel: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

// A chain where the purchase unit IS the selling unit (§12: this is
// not a special/error case).
const purchaseEqualsSellingUnit: UnitRelationship = {
  units: [{ unit: 'Un', factorFromPrevious: 0 }],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

// A four-level chain to prove genuinely arbitrary interior-to-interior
// composition, not merely top-to-bottom.
const fourLevel: UnitRelationship = {
  units: [
    { unit: 'Palete', factorFromPrevious: 0 },
    { unit: 'Cx', factorFromPrevious: 10 }, // 1 Palete = 10 Cx
    { unit: 'Emb', factorFromPrevious: 4 }, // 1 Cx = 4 Emb  => 1 Palete = 40 Emb
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Emb = 6 Un  => 1 Cx = 24 Un, 1 Palete = 240 Un
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

// A chain with a genuinely fractional factor (e.g. a purchase unit
// smaller than the selling unit — reverse of the usual case).
const fractionalFactor: UnitRelationship = {
  units: [
    { unit: 'MeioKg', factorFromPrevious: 0 },
    { unit: 'Kg', factorFromPrevious: 0.5 }, // 1 MeioKg = 0.5 Kg
  ],
  sellingUnit: 'Kg',
  confirmedAt: '2026-08-20T00:00:00.000Z',
};

const invalidRelationship = { units: [], confirmedAt: '2026-08-20T00:00:00.000Z' } as UnitRelationship;

describe('getConversionFactor — one-hop', () => {
  it('forward, one hop (Cx -> Un, adjacent two-level chain)', () => {
    assert.equal(getConversionFactor(simpleTwoLevel, 'Cx', 'Un'), 24);
  });

  it('reverse, one hop (Un -> Cx, adjacent two-level chain)', () => {
    assert.equal(getConversionFactor(simpleTwoLevel, 'Un', 'Cx'), 1 / 24);
  });
});

describe('getConversionFactor — multi-hop', () => {
  it('forward, multi-hop (Cx -> Un, three-level chain) — composes 4 * 6 = 24', () => {
    assert.equal(getConversionFactor(savanna, 'Cx', 'Un'), 24);
  });

  it('forward, multi-hop (Cx -> Emb)', () => {
    assert.equal(getConversionFactor(savanna, 'Cx', 'Emb'), 4);
  });

  it('interior-to-interior (Emb -> Un) — neither endpoint is the top-level unit', () => {
    assert.equal(getConversionFactor(savanna, 'Emb', 'Un'), 6);
  });

  it('reverse, multi-hop (Un -> Cx)', () => {
    assert.equal(getConversionFactor(savanna, 'Un', 'Cx'), 1 / 24);
  });

  it('reverse, one hop within a multi-level chain (Un -> Emb)', () => {
    assert.equal(getConversionFactor(savanna, 'Un', 'Emb'), 1 / 6);
  });

  it('four-level chain: top-to-bottom (Palete -> Un) composes across three hops', () => {
    assert.equal(getConversionFactor(fourLevel, 'Palete', 'Un'), 240);
  });

  it('four-level chain: interior-to-interior (Cx -> Emb), skipping the top level entirely', () => {
    assert.equal(getConversionFactor(fourLevel, 'Cx', 'Emb'), 4);
  });

  it('four-level chain: reverse interior-to-interior (Emb -> Cx)', () => {
    assert.equal(getConversionFactor(fourLevel, 'Emb', 'Cx'), 1 / 4);
  });

  it('four-level chain: reverse top-to-bottom (Un -> Palete)', () => {
    assert.equal(getConversionFactor(fourLevel, 'Un', 'Palete'), 1 / 240);
  });
});

describe('getConversionFactor — purchase unit equals selling unit (§12)', () => {
  it('returns exactly 1, not a special-cased branch failure', () => {
    assert.equal(getConversionFactor(purchaseEqualsSellingUnit, 'Un', 'Un'), 1);
  });

  it('returns exactly 1 for same-unit conversion even within a larger chain', () => {
    assert.equal(getConversionFactor(savanna, 'Emb', 'Emb'), 1);
  });
});

describe('getConversionFactor — fractional / reverse factors', () => {
  it('composes a fractional factorFromPrevious correctly, forward', () => {
    assert.equal(getConversionFactor(fractionalFactor, 'MeioKg', 'Kg'), 0.5);
  });

  it('composes a fractional factorFromPrevious correctly, reverse', () => {
    assert.equal(getConversionFactor(fractionalFactor, 'Kg', 'MeioKg'), 2);
  });
});

describe('getConversionFactor — no derivation possible (never fabricates a factor)', () => {
  it('returns null for a missing relationship', () => {
    assert.equal(getConversionFactor(undefined, 'Cx', 'Un'), null);
    assert.equal(getConversionFactor(null, 'Cx', 'Un'), null);
  });

  it('returns null for a structurally invalid relationship (empty units)', () => {
    assert.equal(getConversionFactor(invalidRelationship, 'Cx', 'Un'), null);
  });

  it('returns null when the "from" unit is not a member of the chain', () => {
    assert.equal(getConversionFactor(savanna, 'Saco', 'Un'), null);
  });

  it('returns null when the "to" unit is not a member of the chain', () => {
    assert.equal(getConversionFactor(savanna, 'Cx', 'Saco'), null);
  });

  it('returns null when neither unit is a member of the chain', () => {
    assert.equal(getConversionFactor(savanna, 'Saco', 'Kg'), null);
  });

  it('never returns 1 as a fallback for an unresolvable pair — 1 is a real, distinct answer elsewhere', () => {
    const result = getConversionFactor(savanna, 'Saco', 'Kg');
    assert.notEqual(result, 1);
    assert.equal(result, null);
  });
});

describe('computeRatePerPurchaseUnit', () => {
  it('matches the Specification\'s own canonical worked number: 24 Un/Cx * 60 MZN/Un = 1,440', () => {
    assert.equal(computeRatePerPurchaseUnit(savanna, 'Cx', 'Un', 60), 1440);
  });

  it('returns null when no relationship is confirmed (missing Product Memory)', () => {
    assert.equal(computeRatePerPurchaseUnit(undefined, 'Cx', 'Un', 60), null);
  });

  it('returns null when the purchase unit has no matching chain entry', () => {
    assert.equal(computeRatePerPurchaseUnit(savanna, 'Saco', 'Un', 60), null);
  });

  it('returns null when the selling unit has no matching chain entry', () => {
    assert.equal(computeRatePerPurchaseUnit(savanna, 'Cx', 'Litro', 60), null);
  });

  it('is exactly the selling price itself when purchase unit equals selling unit', () => {
    assert.equal(computeRatePerPurchaseUnit(purchaseEqualsSellingUnit, 'Un', 'Un', 60), 60);
  });
});

describe('deriveTransactionValuation — full worked example (§13)', () => {
  it('reproduces the Specification\'s own canonical figures exactly: 3 Cx @ 1,250 MZN/Cx, 1 Cx = 24 Un, 60 MZN/Un', () => {
    const result = deriveTransactionValuation({
      purchaseQuantity: 3,
      purchaseUnit: 'Cx',
      purchaseCostPerPurchaseUnit: 1250,
      relationship: savanna,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.ok(result);
    assert.equal(result!.ratePerPurchaseUnit, 1440);
    assert.equal(result!.impliedSellingValue, 4320);
    assert.equal(result!.cost, 3750);
    assert.equal(result!.embeddedProfit, 570);
  });

  it('returns null (no derivation) when Product Memory is missing entirely', () => {
    const result = deriveTransactionValuation({
      purchaseQuantity: 3,
      purchaseUnit: 'Cx',
      purchaseCostPerPurchaseUnit: 1250,
      relationship: undefined,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.equal(result, null);
  });

  it('returns null when the recorded purchase unit is not part of the confirmed chain', () => {
    const result = deriveTransactionValuation({
      purchaseQuantity: 3,
      purchaseUnit: 'Saco', // not in savanna's chain
      purchaseCostPerPurchaseUnit: 1250,
      relationship: savanna,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.equal(result, null);
  });

  it('composes correctly across a reverse direction (purchase in the selling unit itself)', () => {
    // Buying loose Un directly, still deriving a (trivial) rate.
    const result = deriveTransactionValuation({
      purchaseQuantity: 10,
      purchaseUnit: 'Un',
      purchaseCostPerPurchaseUnit: 55,
      relationship: savanna,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.ok(result);
    assert.equal(result!.ratePerPurchaseUnit, 60);
    assert.equal(result!.impliedSellingValue, 600);
    assert.equal(result!.cost, 550);
    assert.equal(result!.embeddedProfit, 50);
  });

  it('composes correctly when the purchase unit sits between the top level and the selling unit (Emb)', () => {
    const result = deriveTransactionValuation({
      purchaseQuantity: 5,
      purchaseUnit: 'Emb',
      purchaseCostPerPurchaseUnit: 200,
      relationship: savanna,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.ok(result);
    // 1 Emb = 6 Un => rate = 6 * 60 = 360 MZN implied selling value per Emb
    assert.equal(result!.ratePerPurchaseUnit, 360);
    assert.equal(result!.impliedSellingValue, 1800);
    assert.equal(result!.cost, 1000);
    assert.equal(result!.embeddedProfit, 800);
  });

  it('produces a negative embedded profit honestly when the derived selling value is below cost (never floored/hidden)', () => {
    const result = deriveTransactionValuation({
      purchaseQuantity: 3,
      purchaseUnit: 'Cx',
      purchaseCostPerPurchaseUnit: 5000, // deliberately overpriced purchase
      relationship: savanna,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.ok(result);
    assert.equal(result!.impliedSellingValue, 4320);
    assert.equal(result!.cost, 15000);
    assert.equal(result!.embeddedProfit, -10680);
  });

  it('handles a fractional multi-unit purchase quantity without losing precision', () => {
    const result = deriveTransactionValuation({
      purchaseQuantity: 2.5,
      purchaseUnit: 'Cx',
      purchaseCostPerPurchaseUnit: 1250,
      relationship: savanna,
      sellingUnit: 'Un',
      sellingUnitPrice: 60,
    });
    assert.ok(result);
    assert.equal(result!.ratePerPurchaseUnit, 1440);
    assert.equal(result!.impliedSellingValue, 3600);
    assert.equal(result!.cost, 3125);
    assert.equal(result!.embeddedProfit, 475);
  });
});
