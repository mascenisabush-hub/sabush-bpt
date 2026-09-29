// SABUSH BPT — Contagem valuation: quantity × price per COUNTED unit, in the
// live total, every on-screen figure and the Business Worth snapshot
// (Owner-approved fix, 2026-09-29). Runs the real production functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  tallyStockCountRows,
  normalizeStockCountItems,
  resolveSellingPricePerCountedUnit,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship } from '../apps/tenant/src/types';

const cxUn: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-01T00:00:00.000Z',
} as UnitRelationship;
const rel = (name: string) => (name.toLowerCase() === 'txilar' ? cxUn : undefined);
const row = (over: Partial<StockCountWorkingRow>): StockCountWorkingRow =>
  ({ productName: 'Txilar', quantity: '5', unit: 'Un', costPrice: '', sellingPrice: '480', ...over }) as StockCountWorkingRow;

test('Owner example: 480 per Cx, 5 Un counted → 100 MT, not 2,400', () => {
  const t = tallyStockCountRows([row({ sellingPriceBasisUnit: 'Cx' })], undefined, rel);
  assert.equal(t.totalSellingValue, 100);
  assert.equal(t.countedItems[0].sellingValue, 100);
});

test('reverse: 60 per Un, 3 Cx counted → 4,320 MT, not 180', () => {
  const t = tallyStockCountRows([row({ quantity: '3', unit: 'Cx', sellingPrice: '60', sellingPriceBasisUnit: 'Un' })], undefined, rel);
  assert.equal(t.totalSellingValue, 4320);
});

test('same unit (or no basis recorded): plain quantity × price, unchanged', () => {
  assert.equal(tallyStockCountRows([row({ unit: 'Cx', sellingPriceBasisUnit: 'Cx' })], undefined, rel).totalSellingValue, 2400);
  assert.equal(tallyStockCountRows([row({ unit: 'Cx', sellingPriceBasisUnit: 'cx' })], undefined, rel).totalSellingValue, 2400);
  assert.equal(tallyStockCountRows([row({ unit: 'Cx' })]).totalSellingValue, 2400);
});

test('no known conversion: the row is NOT valued (never a wrong number) and is reported', () => {
  const t = tallyStockCountRows([row({ productName: 'Outro', sellingPriceBasisUnit: 'Cx' })], undefined, rel);
  assert.equal(t.totalSellingValue, 0);
  assert.equal(t.countedItems.length, 0);
  assert.deepEqual(t.unconvertiblePriceProductNames, ['Outro']);
  assert.deepEqual(t.notCountedProductNames, ['Outro']);
});

test('resolveSellingPricePerCountedUnit: price per one counted unit', () => {
  assert.equal(resolveSellingPricePerCountedUnit('Un', 'Cx', 480, cxUn), 20);
  assert.equal(resolveSellingPricePerCountedUnit('Cx', 'Un', 60, cxUn), 1440);
  assert.equal(resolveSellingPricePerCountedUnit('Un', undefined, 50, undefined), 50);
  assert.equal(resolveSellingPricePerCountedUnit('Un', 'Cx', 480, undefined), null);
});

test('the snapshot records exactly the value shown: normalize uses the passed sellingValue', () => {
  const t = tallyStockCountRows([row({ sellingPriceBasisUnit: 'Cx' })], undefined, rel);
  const item = t.countedItems[0];
  const { totalSellingValue } = normalizeStockCountItems([
    { productName: item.productName, quantity: item.quantity, unit: item.unit, costPrice: item.costPrice, sellingPrice: item.sellingPrice, sellingPriceBasisUnit: item.sellingPriceBasisUnit, sellingValue: item.sellingValue },
  ]);
  assert.equal(totalSellingValue, 100);
  // callers without sellingValue keep the historical quantity × price
  assert.equal(normalizeStockCountItems([{ productName: 'X', quantity: 2, unit: 'Un', costPrice: 0, sellingPrice: 30 }]).totalSellingValue, 60);
});

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

test('every figure on the Contagem screen uses the same rule', () => {
  assert.match(view, /tallyStockCountRows\(allWorkingRows, effectiveCostBasisByProductName, getEffectiveUnitRelationshipForProductName\)/);
  assert.match(view, /tallyStockCountRows\(rowsForTally, effectiveCostBasisByProductName, getEffectiveUnitRelationshipForProductName\)/);
  assert.match(view, /sellingValue: item\.sellingValue,/);
  assert.match(view, /sellingValue: sourceRow && entry\.quantity\.trim\(\) !== '' \? rowSellingValueFor\(sourceRow\) : undefined,/);
  assert.doesNotMatch(view, /\(Number\(row\.quantity\) \|\| 0\) \* \(Number\(row\.sellingPrice\) \|\| 0\)/);
  assert.doesNotMatch(view, /q \* sellingPriceNum/);
  assert.equal((view.match(/'Rever preço'/g) ?? []).length, 2);
});

test('an unconvertible price blocks validation and confirmation, naming the product', () => {
  assert.match(view, /if \(pricePerCountedUnitFor\(row\) === null\) \{[\s\S]{0,300}introduza o preço por \$\{counted\}/);
  assert.match(view, /if \(tally\.unconvertiblePriceProductNames\.length > 0\) \{\s*setError\(/);
});

test('review screen names the products not counted (#3)', () => {
  assert.match(view, /<span className="font-semibold">Não contados:<\/span> \{formatProductNames\(names\)\}/);
  assert.match(view, /Ver todos \(\{names\.length\}\)/);
});
