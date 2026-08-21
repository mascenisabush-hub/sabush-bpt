// [Initial Stock Valuation Basis — Live Total fix] Source-level
// regression guards (this repository has no React/DOM test harness —
// see initial-stock-dual-valuation-basis-wiring.test.ts's own
// established precedent for this exact technique) proving:
//   - the live pre-confirm Total display respects initialCapitalBasis
//     (previously it was hardcoded to cost, ignoring the Custo/Venda
//     toggle entirely)
//   - the pure cost-only totalCapital variable is UNCHANGED (an
//     existing test in initial-stock-portion-grouping-wiring.test.ts
//     already locks this in; these tests do not duplicate that, only
//     confirm the new code sits alongside it rather than replacing it)
//   - the sell-unit price conversion (perUnitPrice × factor) never
//     writes to quantity/unit/costPrice — the original purchase record
//   - a value-based "shadow" reproduction of both formulas, since the
//     real ones live inside a React component this repo has no way to
//     mount and execute directly
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-live-total-valuation-basis.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url),
  'utf-8'
);

describe('InitialStockCountView.tsx — displayedCapitalTotal (requirement: selected basis controls the Total shown)', () => {
  it('totalSellingCapital is a plain sum of quantity * sellingPrice, a NEW variable separate from totalCapital', () => {
    const match = source.match(/const totalSellingCapital = rows\.reduce\(([\s\S]*?)\n  \}, 0\);/);
    assert.ok(match, 'expected to find totalSellingCapital computation');
    assert.match(match![0], /q \* s/);
  });

  it('totalCapital itself remains a plain sum of quantity * costPrice — untouched by this fix', () => {
    const match = source.match(/const totalCapital = rows\.reduce\(([\s\S]*?)\n  \}, 0\);/);
    assert.ok(match, 'expected to find totalCapital computation');
    assert.match(match![0], /q \* c/);
  });

  it('displayedCapitalTotal is a ternary on initialCapitalBasis, never a fixed choice', () => {
    assert.match(
      source,
      /const displayedCapitalTotal = initialCapitalBasis === 'selling' \? totalSellingCapital : totalCapital;/
    );
  });

  it('all three live Total displays (success screen, entry-time card, confirm modal) read displayedCapitalTotal, not totalCapital directly', () => {
    const matches = source.match(/formatCurrency\((displayedCapitalTotal|totalCapital), currencySymbol\)/g) ?? [];
    assert.equal(matches.length, 3, 'expected exactly 3 Total displays in this file');
    for (const m of matches) {
      assert.match(m, /displayedCapitalTotal/, `expected every Total display to read displayedCapitalTotal, found: ${m}`);
    }
  });

  it('the Total card and confirm modal both label which basis is being shown (Custo/Venda), not just a bare number', () => {
    const badgeMatches = source.match(/\(\{initialCapitalBasis === 'selling' \? 'Venda' : 'Custo'\}\)/g) ?? [];
    assert.ok(badgeMatches.length >= 2, 'expected the basis label on at least the Total card and confirm modal');
  });
});

describe('InitialStockCountView.tsx — chain-driven conversion never mutates original purchase data (requirement 3)', () => {
  // [Superseded by the Multi-Level Unit Chain / Cross-Portion
  // Auto-Computation feature] The single-hop onSellingPriceChange/
  // onChange handlers this described no longer exist — replaced by
  // UnitChainSection's onChainChange/onSellingUnitChange/onSellingRateChange
  // (which only ever write unitChain/chainSellingUnit/sellingPricePerSellingUnit,
  // never quantity/unit/costPrice — verified below) plus the
  // applyChainComputations effect, which is where actual portion
  // costPrice/sellingPrice writes now happen.
  it('applyChainComputations only ever writes costPrice/sellingPrice — never quantity, unit, productName, or the reference row it reads from', () => {
    const match = source.match(/useEffect\(\(\) => \{\n {4}for \(const group of rowGroups\) \{[\s\S]*?\n {2}\}, \[rows\]\);/);
    assert.ok(match, 'expected to find the applyChainComputations effect');
    const body = match![0];
    assert.match(body, /updates\.costPrice = computed;/);
    assert.match(body, /updates\.sellingPrice = computed;/);
    assert.doesNotMatch(body, /quantity:/);
    assert.doesNotMatch(body, /productName:/);
    assert.doesNotMatch(body, /updates\.unit\b/);
    // The reference cost row is explicitly excluded from being
    // auto-written to — it IS the source, never a target.
    assert.match(body, /row\.id !== referenceCostRow!\.id/);
  });

  it('UnitChainSection\'s onChainChange/onSellingUnitChange/onSellingRateChange each write exactly one field, never quantity/unit/costPrice', () => {
    for (const [propName, expectedField] of [
      ['onChainChange', 'unitChain'],
      ['onSellingUnitChange', 'chainSellingUnit'],
      ['onSellingRateChange', 'sellingPricePerSellingUnit'],
    ]) {
      const regex = new RegExp(`${propName}=\\{\\([^)]*\\) => updateRow\\(firstRow\\.id, \\{ ${expectedField}: [^}]*\\}\\)\\}`);
      assert.match(source, regex, `expected ${propName} to write only ${expectedField}`);
    }
  });
});

describe('Shadow reproduction — same formulas, executed as plain values (proves the arithmetic itself, not just its presence in source)', () => {
  // Mirrors detectSuggestedUnit/onSellingPriceChange's own conversion:
  // fields.sellingPrice = (perUnitPrice * factor).toFixed(2)
  const convertSellingPrice = (perUnitPrice: number, factor: number) => Number((perUnitPrice * factor).toFixed(2));

  // Mirrors totalCapital / totalSellingCapital / displayedCapitalTotal
  // exactly, as plain reducers over the same row shape.
  type Row = { quantity: number; costPrice: number; sellingPrice: number };
  const totalCapital = (rows: Row[]) => rows.reduce((acc, r) => acc + r.quantity * r.costPrice, 0);
  const totalSellingCapital = (rows: Row[]) => rows.reduce((acc, r) => acc + r.quantity * r.sellingPrice, 0);
  const displayedCapitalTotal = (rows: Row[], basis: 'cost' | 'selling') =>
    basis === 'selling' ? totalSellingCapital(rows) : totalCapital(rows);

  it('Bernine example end-to-end: 1 cx @ 2050 MZN/cx, sold 100 MZN/un, 1cx=24un — Custo shows 2050, Venda shows 2400', () => {
    const convertedSellingPrice = convertSellingPrice(100, 24);
    assert.equal(convertedSellingPrice, 2400);
    const rows: Row[] = [{ quantity: 1, costPrice: 2050, sellingPrice: convertedSellingPrice }];
    assert.equal(displayedCapitalTotal(rows, 'cost'), 2050);
    assert.equal(displayedCapitalTotal(rows, 'selling'), 2400);
  });

  it('same purchase/selling unit (factor irrelevant, no conversion needed): Custo uses cost, Venda uses selling, no crossover', () => {
    const rows: Row[] = [{ quantity: 10, costPrice: 500, sellingPrice: 650 }];
    assert.equal(displayedCapitalTotal(rows, 'cost'), 5000);
    assert.equal(displayedCapitalTotal(rows, 'selling'), 6500);
  });

  it('selecting Custo never uses sellingPrice even when it differs wildly from cost', () => {
    const rows: Row[] = [{ quantity: 3, costPrice: 100, sellingPrice: 999999 }];
    assert.equal(displayedCapitalTotal(rows, 'cost'), 300);
  });

  it('selecting Venda never uses costPrice even when it differs wildly from selling', () => {
    const rows: Row[] = [{ quantity: 3, costPrice: 999999, sellingPrice: 100 }];
    assert.equal(displayedCapitalTotal(rows, 'selling'), 300);
  });

  it('changing the basis on the SAME rows changes the Total correctly, both directions', () => {
    const rows: Row[] = [
      { quantity: 2, costPrice: 2050, sellingPrice: 2400 }, // Bernine, 2 cx
      { quantity: 10, costPrice: 500, sellingPrice: 650 }, // Arroz, same-unit
    ];
    const costTotal = displayedCapitalTotal(rows, 'cost');
    const sellingTotal = displayedCapitalTotal(rows, 'selling');
    assert.equal(costTotal, 2 * 2050 + 10 * 500); // 9100
    assert.equal(sellingTotal, 2 * 2400 + 10 * 650); // 11300
    assert.notEqual(costTotal, sellingTotal);
  });

  it('multiple different unit-conversion factors across products each convert independently', () => {
    const rows: Row[] = [
      { quantity: 1, costPrice: 2050, sellingPrice: convertSellingPrice(100, 24) }, // 1cx=24un
      { quantity: 1, costPrice: 900, sellingPrice: convertSellingPrice(50, 12) }, // 1cx=12un
    ];
    assert.equal(totalSellingCapital(rows), 2400 + 600);
  });
});
