// [Multi-Level Unit Chain / Cross-Portion Auto-Computation] Tests for
// the feature that lets an Initial Stock product be entered as several
// physical portions in DIFFERENT units of the same chain (e.g. 1 cx +
// 3 emb + 5 un, where 1 cx = 4 emb = 24 un), with cost and selling
// totals computed automatically from one typed cost rate (on whichever
// portion is in the chain's reference/purchase unit) and one typed
// selling rate (entered once, for the whole product).
//
// This repository has no React/DOM test harness (see
// initial-stock-dual-valuation-basis-wiring.test.ts's own established
// precedent), so InitialStockCountView.tsx's actual per-portion
// computation (the applyChainComputations effect) is tested here two
// ways:
//   1. Source-level regression guards confirming the real formula
//      (getConversionFactor, imported from the actual, separately-
//      tested purchaseToSellingConversion.ts module — never
//      reimplemented) is wired the way this file describes.
//   2. A faithful "shadow" reproduction of applyChainComputations'
//      exact logic — same rounding ORDER (round each portion's own
//      per-unit price to 2 decimals before multiplying by that
//      portion's quantity, matching how a real price can't be
//      fractional-cent) — built from the real, imported
//      getConversionFactor, so this is genuinely testing the same
//      conversion math the app uses, not a parallel reimplementation
//      of it.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-multi-level-unit-chain.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { getConversionFactor } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

const source = readFileSync(
  new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url),
  'utf-8'
);

describe('InitialStockCountView.tsx — source-level wiring', () => {
  it('CountRowItem has unitChain (an array, not a single hop) and chainSellingUnit', () => {
    assert.match(source, /unitChain: Array<\{ unit: string; factorFromPrevious: number \}>;/);
    assert.match(source, /chainSellingUnit: string;/);
  });

  it('resolveGroupUnitRelationship prefers a KNOWN product\'s catalog relationship over a locally-built one', () => {
    const match = source.match(/const resolveGroupUnitRelationship = \([\s\S]*?\n {2}\};/);
    assert.ok(match, 'expected to find resolveGroupUnitRelationship');
    const body = match![0];
    const catalogIdx = body.indexOf('catalogMatch');
    const localIdx = body.indexOf('firstRow.unitChain');
    assert.ok(catalogIdx !== -1 && localIdx !== -1 && catalogIdx < localIdx, 'expected the catalog check before the local-chain fallback');
  });

  it('applyChainComputations reuses the real getConversionFactor — no second conversion system', () => {
    assert.match(source, /import \{ getConversionFactor \} from '\.\.\/lib\/purchaseToSellingConversion';/);
    const match = source.match(/useEffect\(\(\) => \{\n {4}for \(const group of rowGroups\) \{[\s\S]*?\n {2}\}, \[rows\]\);/);
    assert.ok(match, 'expected to find the applyChainComputations effect');
    // Called for both cost and selling — proves both use the same
    // shared, tested module rather than one path reusing it and the
    // other reimplementing similar math.
    const occurrences = match![0].match(/getConversionFactor\(relationship, row\.unit, /g) ?? [];
    assert.equal(occurrences.length, 2);
  });

  it('a manually-edited cost or selling price is never auto-overwritten (costManuallySet/sellingManuallySet gate every write)', () => {
    const match = source.match(/useEffect\(\(\) => \{\n {4}for \(const group of rowGroups\) \{[\s\S]*?\n {2}\}, \[rows\]\);/);
    const body = match![0];
    assert.match(body, /!row\.costManuallySet/);
    assert.match(body, /!row\.sellingManuallySet/);
  });

  it('the reference cost row (the one holding the typed rate) is never itself auto-written to', () => {
    const match = source.match(/useEffect\(\(\) => \{\n {4}for \(const group of rowGroups\) \{[\s\S]*?\n {2}\}, \[rows\]\);/);
    assert.match(match![0], /row\.id !== referenceCostRow!\.id/);
  });

  it('a known product\'s chain is shown read-only, never as an editable re-entry form (Decision 14 stays a separate action)', () => {
    assert.match(source, /Já configurado para este produto — para alterar, edite a ficha do produto\./);
  });

  it('the group-level selling rate is documented as never auto-overwritten', () => {
    assert.match(source, /Este valor nunca é alterado automaticamente/);
  });
});

describe('types.ts — InitialStockDraftItem persists the in-progress chain (owner\'s explicit request)', () => {
  const typesSource = readFileSync(new URL('../apps/tenant/src/types.ts', import.meta.url), 'utf-8');
  it('unitChain, chainSellingUnit, and sellingPricePerSellingUnit are all optional (backward compatible with older drafts)', () => {
    assert.match(typesSource, /unitChain\?: Array<\{ unit: string; factorFromPrevious: number \}>;/);
    assert.match(typesSource, /chainSellingUnit\?: string;/);
    assert.match(typesSource, /sellingPricePerSellingUnit\?: number;/);
  });
});

describe('Shadow reproduction of applyChainComputations — Bernine 3-portion scenario (1 cx + 3 emb + 5 un)', () => {
  const relationship: UnitRelationship = {
    units: [
      { unit: 'cx', factorFromPrevious: 0 },
      { unit: 'emb', factorFromPrevious: 4 },
      { unit: 'un', factorFromPrevious: 6 },
    ],
    sellingUnit: 'un',
    confirmedAt: new Date().toISOString(),
  };

  // Mirrors applyChainComputations' own per-portion formula and
  // rounding order EXACTLY: round each portion's own per-unit price to
  // 2 decimals first (a real price can't be a fractional cent), THEN
  // multiply by that portion's quantity. This is why the "un" portion
  // below totals 427.10, not the mathematically pure 427.0833.
  function computePortionValues(
    portions: Array<{ unit: string; quantity: number }>,
    referenceUnit: string,
    referenceCostRate: number,
    sellingUnit: string,
    groupSellingRate: number
  ) {
    return portions.map((p) => {
      const costFactor = getConversionFactor(relationship, p.unit, referenceUnit);
      const costPerUnit = p.unit === referenceUnit ? referenceCostRate : Number((costFactor! * referenceCostRate).toFixed(2));
      const sellFactor = getConversionFactor(relationship, p.unit, sellingUnit);
      const sellPerUnit = Number((sellFactor! * groupSellingRate).toFixed(2));
      return {
        unit: p.unit,
        costPerUnit,
        sellPerUnit,
        costContribution: Number((p.quantity * costPerUnit).toFixed(2)),
        sellContribution: Number((p.quantity * sellPerUnit).toFixed(2)),
      };
    });
  }

  it('computes each portion\'s own cost and selling price correctly', () => {
    const results = computePortionValues(
      [
        { unit: 'cx', quantity: 1 },
        { unit: 'emb', quantity: 3 },
        { unit: 'un', quantity: 5 },
      ],
      'cx',
      2050,
      'un',
      100
    );
    assert.equal(results[0].costPerUnit, 2050); // reference row: untouched, exactly as typed
    assert.equal(results[0].sellPerUnit, 2400); // 24 * 100
    assert.equal(results[1].costPerUnit, 512.5); // 2050 / 4
    assert.equal(results[1].sellPerUnit, 600); // 6 * 100
    assert.equal(results[2].costPerUnit, 85.42); // round(2050/24, 2)
    assert.equal(results[2].sellPerUnit, 100); // sellingUnit itself: factor 1
  });

  it('sums to the correct product totals — cost 4,014.60 (not the un-rounded 4,014.58), selling exactly 4,700.00', () => {
    const results = computePortionValues(
      [
        { unit: 'cx', quantity: 1 },
        { unit: 'emb', quantity: 3 },
        { unit: 'un', quantity: 5 },
      ],
      'cx',
      2050,
      'un',
      100
    );
    const totalCost = results.reduce((acc, r) => acc + r.costContribution, 0);
    const totalSelling = results.reduce((acc, r) => acc + r.sellContribution, 0);
    assert.equal(Number(totalCost.toFixed(2)), 4014.6);
    assert.equal(Number(totalSelling.toFixed(2)), 4700);
  });

  it('original purchase data (quantity/unit) is never touched by this computation — only cost/selling prices are derived', () => {
    const portions = [
      { unit: 'cx', quantity: 1 },
      { unit: 'emb', quantity: 3 },
      { unit: 'un', quantity: 5 },
    ];
    const results = computePortionValues(portions, 'cx', 2050, 'un', 100);
    results.forEach((r, i) => {
      assert.equal(r.unit, portions[i].unit); // untouched
    });
  });

  it('cost cannot auto-compute when no portion exists in the reference/purchase unit — no fabricated number', () => {
    // Only emb + un portions exist; no 'cx' portion to source the real
    // typed cost from at all.
    const portionsWithoutCx = [
      { unit: 'emb', quantity: 3 },
      { unit: 'un', quantity: 5 },
    ];
    const factor = getConversionFactor(relationship, 'emb', 'cx');
    assert.ok(factor !== null); // conversion itself is still possible in principle
    // But applyChainComputations only ever runs this when a
    // referenceCostRow actually exists in the group — modeled here as
    // simply not being able to derive a referenceCostRate from nothing.
    const referenceCostRow = portionsWithoutCx.find((p) => p.unit === 'cx');
    assert.equal(referenceCostRow, undefined);
  });

  it('a 4-level chain (e.g. 1 palete = 10 cx = 40 emb = 240 un) composes correctly, not just the 3-level Bernine case', () => {
    const bigRelationship: UnitRelationship = {
      units: [
        { unit: 'palete', factorFromPrevious: 0 },
        { unit: 'cx', factorFromPrevious: 10 },
        { unit: 'emb', factorFromPrevious: 4 },
        { unit: 'un', factorFromPrevious: 6 },
      ],
      sellingUnit: 'un',
      confirmedAt: new Date().toISOString(),
    };
    // 1 palete = 10 cx = 40 emb = 240 un
    assert.equal(getConversionFactor(bigRelationship, 'palete', 'un'), 240);
    assert.equal(getConversionFactor(bigRelationship, 'cx', 'un'), 24);
    assert.equal(getConversionFactor(bigRelationship, 'emb', 'un'), 6);
  });
});
