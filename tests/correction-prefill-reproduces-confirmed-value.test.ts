// SABUSH BPT — re-opening a confirmed Contagem for correction (3-hour window
// or SuperAdmin-authorized recovery) must start EXACTLY at the value it was
// confirmed with, portions included (Owner-reported, 2026-09-29: 345,879 MT
// confirmed → a different value when re-opened). Runs the real pre-fill and
// the real valuation used by the live total and the snapshot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCorrectionPrefill } from '../apps/tenant/src/lib/periodicCorrectionPrefill';
import { tallyStockCountRows, normalizeStockCountItems, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';
import type { StockCountItem, UnitRelationship } from '../apps/tenant/src/types';

// Lite 330ml: 1 Cx = 4 Emb, 1 Emb = 6 Un (24 Un per Cx).
const rel = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-01T00:00:00.000Z',
} as unknown as UnitRelationship;
const relFor = (name: string) => (name.toLowerCase().startsWith('lite') ? rel : undefined);
// The catalog rows the app builds at the start of a count (Lite: default unit Un, priced per Un).
const blankCatalog = (): Record<string, StockCountWorkingRow> => ({
  p1: { productId: 'p1', productName: 'Lite 330ml', quantity: '', unit: 'Un', costPrice: '40', sellingPrice: '55', sellingPriceBasisUnit: 'Un', sellingPriceAutoFilled: true } as StockCountWorkingRow,
  p2: { productId: 'p2', productName: 'Agua 500ml', quantity: '', unit: 'un', costPrice: '15', sellingPrice: '25', sellingPriceBasisUnit: 'un', sellingPriceAutoFilled: true } as StockCountWorkingRow,
  p3: { productId: 'p3', productName: 'Benas', quantity: '', unit: 'un', costPrice: '5', sellingPrice: '10', sellingPriceBasisUnit: 'un', sellingPriceAutoFilled: true } as StockCountWorkingRow,
});
// The confirmed count: Lite in three portions (one priced in a different unit), Agua, Benas not counted.
const items = [
  { productId: 'p1', productName: 'Lite 330ml', quantity: 3, unit: 'Cx', costPrice: 960, sellingPrice: 1200, sellingPriceBasisUnit: 'Cx', totalValue: 2880 },
  { productId: 'p1', productName: 'Lite 330ml', quantity: 3, unit: 'Emb', costPrice: 240, sellingPrice: 300, sellingPriceBasisUnit: 'Emb', totalValue: 720 },
  { productId: 'p1', productName: 'Lite 330ml', quantity: 5, unit: 'Un', costPrice: 40, sellingPrice: 1200, sellingPriceBasisUnit: 'Cx', totalValue: 200 },
  { productId: 'p2', productName: 'Agua 500ml', quantity: 66, unit: 'un', costPrice: 15, sellingPrice: 25, sellingPriceBasisUnit: 'un', totalValue: 990 },
] as StockCountItem[];

const liveTotal = (rows: StockCountWorkingRow[]) =>
  tallyStockCountRows(rows.map((r) => (r.validated ? r : { ...r, quantity: '' })), undefined, relFor).totalSellingValue;

test('re-opened count starts at exactly the confirmed value (portions and price units included)', () => {
  // confirmed value, valued the way the count was confirmed (price per counted unit)
  const confirmed = tallyStockCountRows(
    items.map((i) => ({ productName: i.productName, quantity: String(i.quantity), unit: i.unit!, costPrice: String(i.costPrice), sellingPrice: String(i.sellingPrice), sellingPriceBasisUnit: i.sellingPriceBasisUnit }) as StockCountWorkingRow),
    undefined,
    relFor
  ).totalSellingValue;
  // 3 Cx × 1200 + 3 Emb × 300 + 5 Un × (1200/24) + 66 × 25 = 3600 + 900 + 250 + 1650
  assert.equal(confirmed, 6400);
  let n = 0;
  const pre = buildCorrectionPrefill(items, blankCatalog(), () => `manual:k${++n}`);
  const rows = [...Object.values(pre.catalogRows), ...pre.extraManualRows];
  assert.equal(liveTotal(rows), confirmed, 'live total right after re-opening = confirmed value');
});

test('each pre-filled row keeps its confirmed price unit and is never re-priced from today\'s prices', () => {
  const pre = buildCorrectionPrefill(items, blankCatalog(), () => 'manual:x');
  assert.equal(pre.catalogRows.p1.sellingPriceBasisUnit, 'Cx', 'was inheriting the catalog basis "Un"');
  assert.equal(pre.catalogRows.p1.sellingPrice, '1200');
  assert.equal(pre.catalogRows.p1.sellingPriceAutoFilled, false);
  assert.equal(pre.catalogRows.p1.validated, true);
});

test('extra portions: same product, stable key, validated, confirmed order kept', () => {
  let n = 0;
  const pre = buildCorrectionPrefill(items, blankCatalog(), () => `manual:k${++n}`);
  assert.equal(pre.extraManualRows.length, 2);
  for (const row of pre.extraManualRows) {
    assert.equal(row.productId, 'p1');
    assert.match(row.sourceRowKey ?? '', /^manual:k\d$/);
    assert.equal(row.validated, true);
  }
  assert.deepEqual(pre.extraManualRows.map((r) => r.entrySequence), [2, 3]);
  assert.equal(pre.extraManualRows[1].sellingPriceBasisUnit, 'Cx');
});

test('products not in the confirmed count stay blank and unvalidated (never counted)', () => {
  const pre = buildCorrectionPrefill(items, blankCatalog(), () => 'manual:x');
  assert.equal(pre.catalogRows.p3.quantity, '');
  assert.notEqual(pre.catalogRows.p3.validated, true);
});

test('confirming the correction unchanged records the same selling value', () => {
  let n = 0;
  const pre = buildCorrectionPrefill(items, blankCatalog(), () => `manual:k${++n}`);
  const tally = tallyStockCountRows([...Object.values(pre.catalogRows), ...pre.extraManualRows], undefined, relFor);
  const { totalSellingValue } = normalizeStockCountItems(tally.countedItems.map((i) => ({ ...i })));
  assert.equal(totalSellingValue, 6400);
});

test('the Contagem screen uses this pre-fill and moves the entry counter past it', () => {
  const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
  assert.match(view, /const prefill = buildCorrectionPrefill\(sourceCount\.items, catalogRows, \(\) => `manual:\$\{crypto\.randomUUID\(\)\}`\);/);
  assert.match(view, /entrySequenceRef\.current = Math\.max\(entrySequenceRef\.current, sourceCount\.items\.length\);/);
});
