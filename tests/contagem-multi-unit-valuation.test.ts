// Business Worth Evolution — Increment 4: Multi-Unit Valuation (Mode A/B).
// Tests for apps/tenant/src/lib/contagemMultiUnitValuation.ts — the design-
// pass resolution of Rule 8 open question #1 (Specification §36 item 1;
// Implementation Plan §20).
//
// SCOPE: proves deriveModeAPortionValuations / canApplyModeA /
// sumModeAPortionValuations against plain in-memory UnitRelationship
// values only — no Firestore, no UI. Also proves, at the integration
// level, that normalizeStockCountItems (the existing, unmodified
// downstream valuation path) treats a Mode A-derived price identically to
// a Mode B manually-entered one — i.e. Mode A introduces no second
// valuation calculation.
//
// Test groups mirror this Increment's own governing prompt test
// checklist: Physical Measurement, Mode A, Mode B, Cost Price, Business
// Worth (no double counting), and Regression (existing normalizeStockCountItems
// behavior unchanged).
//
// HOW TO RUN:
//   npx tsx --test tests/contagem-multi-unit-valuation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  deriveModeAPortionValuations,
  canApplyModeA,
  sumModeAPortionValuations,
  type ContagemPortionQuantity,
} from '../apps/tenant/src/lib/contagemMultiUnitValuation';
import { normalizeStockCountItems } from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship } from '../apps/tenant/src/types';

// Canonical three-level chain, matching the codebase's own established
// worked example (purchase-to-selling-conversion.test.ts): 1 Cx = 4 Emb =
// 24 Un.
const savanna: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Emb = 6 Un => 1 Cx = 24 Un
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-22T00:00:00.000Z',
};

const twoLevel: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-22T00:00:00.000Z',
};

describe('deriveModeAPortionValuations — Mode A core arithmetic (Specification §15)', () => {
  it('one-hop: reference unit equals portion unit needs no conversion (factor 1)', () => {
    const portions: ContagemPortionQuantity[] = [{ id: 'p1', unit: 'Cx', quantity: 3 }];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, twoLevel);
    assert.equal(result[0].derivedSellingPrice, 1250);
    assert.equal(result[0].sellingValue, 3750);
  });

  it('one-hop: reference is Cx, portion is Un, canonical 1,250 MZN/Cx, 1 Cx = 24 Un', () => {
    const portions: ContagemPortionQuantity[] = [{ id: 'p1', unit: 'Un', quantity: 24 }];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, twoLevel);
    // 1250 / 24 = 52.083333...
    assert.equal(result[0].derivedSellingPrice, 52.083333);
    // 24 * 52.083333 = 1250.0 (rounds to exactly the reference total for
    // exactly one Cx-worth of Un)
    assert.equal(result[0].sellingValue, 1250);
  });

  it('multi-hop: three-level chain, reference at units[0] (Cx), portion at Emb', () => {
    const portions: ContagemPortionQuantity[] = [{ id: 'p1', unit: 'Emb', quantity: 4 }];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    // 1250 / 4 = 312.5 MZN/Emb; 4 Emb = 1 Cx-worth = 1250
    assert.equal(result[0].derivedSellingPrice, 312.5);
    assert.equal(result[0].sellingValue, 1250);
  });

  it('multiple simultaneous physical portions of ONE product, mixed units, single reference price', () => {
    // Owner counted 2 Cx + 10 Emb + 6 Un of the same product, all valued
    // uniformly at one entered price of 1,250 MZN/Cx (Mode A's own
    // definition, §15: "applied across all physical quantities").
    const portions: ContagemPortionQuantity[] = [
      { id: 'cx', unit: 'Cx', quantity: 2 },
      { id: 'emb', unit: 'Emb', quantity: 10 },
      { id: 'un', unit: 'Un', quantity: 6 },
    ];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    const cx = result.find((r) => r.id === 'cx')!;
    const emb = result.find((r) => r.id === 'emb')!;
    const un = result.find((r) => r.id === 'un')!;
    assert.equal(cx.sellingValue, 2500); // 2 * 1250
    assert.equal(emb.sellingValue, 3125); // 10 * 312.5
    assert.equal(un.sellingValue, 312.5); // 6 * 52.083333, rounded to 2dp
  });

  it('reference unit is NOT units[0] (an interior/leaf unit) — still derives correctly both directions', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'cx', unit: 'Cx', quantity: 1 },
      { id: 'un', unit: 'Un', quantity: 24 },
    ];
    // Reference price entered per Un instead of per Cx.
    const result = deriveModeAPortionValuations(portions, 'Un', 52.083333, savanna);
    const cx = result.find((r) => r.id === 'cx')!;
    const un = result.find((r) => r.id === 'un')!;
    assert.equal(un.derivedSellingPrice, 52.083333); // identity
    assert.ok(Math.abs(cx.derivedSellingPrice! - 1250) < 0.01);
  });

  it('unconvertible: portion unit not a member of the confirmed chain returns null, never a fabricated factor', () => {
    const portions: ContagemPortionQuantity[] = [{ id: 'p1', unit: 'Saco', quantity: 5 }];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    assert.equal(result[0].derivedSellingPrice, null);
    assert.equal(result[0].sellingValue, null);
  });

  it('unconvertible: no confirmed unitRelationship at all returns null for every portion', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'p1', unit: 'Cx', quantity: 2 },
      { id: 'p2', unit: 'Un', quantity: 5 },
    ];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, undefined);
    assert.ok(result.every((r) => r.derivedSellingPrice === null && r.sellingValue === null));
  });

  it('never mutates or drops a portion — same count, same order, ids preserved', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'a', unit: 'Cx', quantity: 1 },
      { id: 'b', unit: 'Emb', quantity: 2 },
      { id: 'c', unit: 'Un', quantity: 3 },
    ];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1000, savanna);
    assert.deepEqual(result.map((r) => r.id), ['a', 'b', 'c']);
    // Physical quantity/unit pass through unchanged — this file never
    // alters what was physically counted (FR-21).
    assert.equal(result[1].unit, 'Emb');
    assert.equal(result[1].quantity, 2);
  });
});

describe('canApplyModeA — offerability check', () => {
  it('true when every portion unit is chain-member', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'a', unit: 'Cx', quantity: 1 },
      { id: 'b', unit: 'Un', quantity: 5 },
    ];
    assert.equal(canApplyModeA(portions, 'Cx', savanna), true);
  });

  it('false when any portion unit is not chain-member', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'a', unit: 'Cx', quantity: 1 },
      { id: 'b', unit: 'Saco', quantity: 5 },
    ];
    assert.equal(canApplyModeA(portions, 'Cx', savanna), false);
  });

  it('false for an empty portion list', () => {
    assert.equal(canApplyModeA([], 'Cx', savanna), false);
  });
});

describe('sumModeAPortionValuations', () => {
  it('sums successfully-derived portions', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'a', unit: 'Cx', quantity: 2 },
      { id: 'b', unit: 'Un', quantity: 24 },
    ];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    assert.equal(sumModeAPortionValuations(result), 3750); // 2500 + 1250
  });

  it('returns null (never a partial total) if any portion failed to derive', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'a', unit: 'Cx', quantity: 2 },
      { id: 'b', unit: 'Saco', quantity: 5 },
    ];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    assert.equal(sumModeAPortionValuations(result), null);
  });
});

describe('Mode B — existing, unconditional, already-shipped behavior, unchanged by this Increment', () => {
  it('normalizeStockCountItems already values each portion at its OWN independently-entered price, no conversion, zero code change', () => {
    // Same product, three portions with mixed units, each with its own
    // manually-entered sellingPrice — Mode B's own definition (§15).
    const result = normalizeStockCountItems([
      { productName: 'Cerveja', quantity: 2, unit: 'Cx', costPrice: 900, sellingPrice: 1250 },
      { productName: 'Cerveja', quantity: 10, unit: 'Emb', costPrice: 220, sellingPrice: 312.5 },
      { productName: 'Cerveja', quantity: 6, unit: 'Un', costPrice: 35, sellingPrice: 52.08 },
    ]);
    assert.equal(result.items.length, 3);
    // Each portion's own unit label is preserved exactly (FR-21).
    assert.deepEqual(
      result.items.map((i) => i.unit),
      ['Cx', 'Emb', 'Un']
    );
    // totalSellingValue = 2*1250 + 10*312.5 + 6*52.08 = 2500+3125+312.48
    assert.equal(result.totalSellingValue, 5937.48);
  });
});

describe('Mode A output feeds the EXISTING, unmodified valuation path identically to Mode B (no second calculation)', () => {
  it('a Mode-A-derived price, once written onto a portion, produces the exact same normalizeStockCountItems total as an equivalent manually-entered Mode B price', () => {
    const portions: ContagemPortionQuantity[] = [
      { id: 'cx', unit: 'Cx', quantity: 2 },
      { id: 'emb', unit: 'Emb', quantity: 10 },
      { id: 'un', unit: 'Un', quantity: 6 },
    ];
    const derived = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    const byId = new Map(derived.map((d) => [d.id, d]));

    const result = normalizeStockCountItems([
      { productName: 'Cerveja', quantity: 2, unit: 'Cx', costPrice: 900, sellingPrice: byId.get('cx')!.derivedSellingPrice! },
      { productName: 'Cerveja', quantity: 10, unit: 'Emb', costPrice: 220, sellingPrice: byId.get('emb')!.derivedSellingPrice! },
      { productName: 'Cerveja', quantity: 6, unit: 'Un', costPrice: 35, sellingPrice: byId.get('un')!.derivedSellingPrice! },
    ]);

    // 2500 + 3125 + 312.5 = 5937.5 — matches sumModeAPortionValuations
    // exactly, proving no double-counting or divergence between the two
    // paths (FR-24 discipline extended to this Increment's own new mode).
    assert.equal(result.totalSellingValue, 5937.5);
    assert.equal(sumModeAPortionValuations(derived), 5937.5);
  });
});

describe('Physical Measurement preservation (governing prompt requirement)', () => {
  it('Mode A never alters the physical quantity or unit label a portion already carries', () => {
    const portions: ContagemPortionQuantity[] = [{ id: 'p1', unit: 'caixas', quantity: 10 }];
    // Not a chain-member unit -> unconvertible -> null, never coerced.
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, savanna);
    assert.equal(result[0].unit, 'caixas'); // unchanged, exactly as entered
    assert.equal(result[0].quantity, 10); // unchanged, exactly as entered
  });
});

describe('Cost Price Preservation (Specification §16, FR-23) — Mode A never touches cost', () => {
  it('deriveModeAPortionValuations has no cost-price parameter at all — cannot overwrite it', () => {
    // Structural proof: the function signature itself accepts no cost
    // information, so no code path through this module can ever write a
    // converted cost figure anywhere.
    const portions: ContagemPortionQuantity[] = [{ id: 'p1', unit: 'Un', quantity: 24 }];
    const result = deriveModeAPortionValuations(portions, 'Cx', 1250, twoLevel);
    assert.ok(!('costPrice' in result[0]));
  });
});
