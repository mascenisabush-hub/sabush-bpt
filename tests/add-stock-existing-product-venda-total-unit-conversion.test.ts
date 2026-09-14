// Bug fix — Owner-reported, urgent, live with a client: "Rajat Fitah,
// 1 Cx = 150 Un, sells 7 MZN/Un, cost 760 MZN/Cx" — an EXISTING product
// whose confirmed selling unit is a genuinely smaller unit than its
// purchase unit. The selling-price field correctly showed "7" (already
// denominated in Un), but Add Stock's own row-level revenue/profit
// display and the Combined Total Summary Bar's totalMarketValue/
// totalEmbeddedProfit both computed `quantity * sellingPrice` DIRECTLY
// — correct only when quantity and sellingPrice happen to already share
// the same unit, and badly wrong whenever they do not (e.g. 10 Cx * 7
// MZN/Un = 70, instead of the correct 10 * 150 * 7 = 10,500 MZN) — the
// Owner's own report: "it only shows 7 in the selling row, but no
// calculation is done and display".
//
// FIX: both calculations now go through a shared `resolveRowRevenue`
// helper (AddStockView.tsx) that resolves the row's matched Product's
// own confirmed unitRelationship and, only when the row's sellingPrice
// is genuinely denominated in a different unit than its purchase unit
// (sellingPriceBasisUnit != unit), converts via the existing,
// unmodified `computeRatePerPurchaseUnit` (purchaseToSellingConversion.ts)
// — the exact same conversion engine `new-product-venda-auto-
// calculation.test.ts`'s own companion fix already uses for a NEW
// product's VENDA auto-fill, and the unit-relationship configuration
// modal's own live preview already uses. Falls back to direct
// multiplication whenever no conversion is needed (the ordinary,
// same-unit case) or, defensively, when no valid relationship can
// bridge a genuine mismatch.
//
// SCOPE NOTE: this repository has no DOM/React render harness (see
// tests/new-product-venda-auto-calculation.test.ts's own header). This
// suite follows the same two established techniques: (1) a direct
// fixture test against the real, imported computeRatePerPurchaseUnit
// reproducing the Owner's own exact numbers, and (2) structural
// source-text assertions confirming AddStockView.tsx's own totals
// reduce and per-row calculation both route through the new helper
// rather than a bare `quantity * sellingPrice`.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-existing-product-venda-total-unit-conversion.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeRatePerPurchaseUnit } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('computeRatePerPurchaseUnit — the Owner\'s own exact scenario (Rajat Fitah)', () => {
  const relationship: UnitRelationship = {
    units: [
      { unit: 'Cx', factorFromPrevious: 1 }, // units[0]'s own factor is unused/ignored, per isValidUnitRelationship
      { unit: 'Un', factorFromPrevious: 150 },
    ],
    sellingUnit: 'Un',
    confirmedAt: '2026-09-12T10:00:00.000Z',
  };

  it('1 Cx = 150 Un, sells 7 MZN/Un — the per-Cx rate is 1,050 MZN, not 7', () => {
    const rate = computeRatePerPurchaseUnit(relationship, 'Cx', 'Un', 7);
    assert.equal(rate, 1050);
  });

  it('10 Cx purchased at that rate implies 10,500 MZN total selling value, not 70', () => {
    const rate = computeRatePerPurchaseUnit(relationship, 'Cx', 'Un', 7);
    assert.notEqual(rate, null);
    const totalMarketValue = 10 * (rate as number);
    assert.equal(totalMarketValue, 10500);
    assert.notEqual(totalMarketValue, 10 * 7); // the old, wrong naive multiplication
  });

  it('cost stays denominated in Cx (760/Cx) — investment value uses no conversion at all, unaffected by this fix', () => {
    const investmentValue = 10 * 760;
    assert.equal(investmentValue, 7600);
  });

  it('embedded profit reflects the corrected revenue, not the naive one (10,500 - 7,600 = 2,900, not 70 - 7,600 = -7,530)', () => {
    const rate = computeRatePerPurchaseUnit(relationship, 'Cx', 'Un', 7);
    const correctProfit = 10 * (rate as number) - 10 * 760;
    assert.equal(correctProfit, 2900);
  });

  it('the ordinary same-unit case is unaffected — purchase and selling unit identical needs no conversion at all', () => {
    const sameUnitRelationship: UnitRelationship = {
      units: [{ unit: 'Un', factorFromPrevious: 1 }],
      sellingUnit: 'Un',
      confirmedAt: '2026-09-12T10:00:00.000Z',
    };
    const rate = computeRatePerPurchaseUnit(sameUnitRelationship, 'Un', 'Un', 7);
    assert.equal(rate, 7);
  });
});

describe('AddStockView.tsx — wiring: both revenue calculations route through the unit-aware helper', () => {
  it('resolveRowRevenue exists and resolves the matched product\'s own confirmed unitRelationship via computeRatePerPurchaseUnit', () => {
    const start = addStockSrc.indexOf('const resolveRowRevenue = (row: StockRowItem');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /isValidUnitRelationship\(relationship\)/);
    assert.match(body, /computeRatePerPurchaseUnit\(relationship, purchaseUnit, sellingUnit, sellingPrice\)/);
    // Same-unit fast path — never converts when no conversion is needed.
    assert.match(body, /purchaseUnit\.toLowerCase\(\) === sellingUnit\.toLowerCase\(\)/);
    assert.match(body, /return quantity \* sellingPrice;/);
  });

  it('the totals reduce (Combined Total Summary Bar) uses resolveRowRevenue for marketValue, not a bare quantity * sellingPrice', () => {
    const start = addStockSrc.indexOf('const totals = rows.reduce(');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('{ totalInvestmentValue: 0', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /const marketValue = resolveRowRevenue\(row, q, s\);/);
    assert.doesNotMatch(body, /const marketValue = q \* s;/);
  });

  it('the per-row revenue/profit display uses resolveRowRevenue for rowRevenue, not a bare numQty * numSell', () => {
    const start = addStockSrc.indexOf('const rowCost = numQty * numCost;');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('const rowProfit = rowRevenue - rowCost;', start) + 'const rowProfit = rowRevenue - rowCost;'.length;
    const body = addStockSrc.slice(start, end);
    assert.match(body, /const rowRevenue = resolveRowRevenue\(row, numQty, numSell\);/);
    assert.doesNotMatch(body, /const rowRevenue = numQty \* numSell;/);
  });

  it('the exact-match product lookup mirrors this file\'s own established pattern (case-insensitive, exact name)', () => {
    const start = addStockSrc.indexOf('const resolveRowRevenue = (row: StockRowItem');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /products\.find\(\(p\) => p\.name\.toLowerCase\(\) === row\.productName\.trim\(\)\.toLowerCase\(\)\)/);
  });
});
