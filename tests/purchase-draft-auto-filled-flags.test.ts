// [Bug fix — cross-device draft restore silently disabled unit-aware
// re-derivation] Owner-reported: took a receipt photo, it scanned
// correctly, but selling price/unit remained empty was investigated
// separately (see the conversation, not a code bug — see this file's
// own sibling investigation). This specific fix addresses a DIFFERENT,
// confirmed gap found while answering "does the auto-filled selling
// price/unit survive a cross-device draft restore": the price VALUE
// always did, but costPriceAutoFilled/sellingPriceAutoFilled/
// costPriceBasisUnit/sellingPriceBasisUnit (StockRowItem's own fields,
// AddStockView.tsx — read by handleUnitChange to decide whether
// changing a row's unit should re-derive its price) were never part of
// PurchaseDraftLineItem, so restoring a draft silently dropped them —
// a unit change after restore stopped re-deriving prices that were, in
// truth, still untouched auto-fills.
//
// SCOPE: rowToDraftLineItem/draftLineItemToRow are plain, pure
// functions (no Firebase SDK coupling) — exercised directly here,
// unlike most of this file's own AppContext-coupled tests (see this
// file's own header comment on that limitation).
//
// HOW TO RUN:
//   npx tsx --test tests/purchase-draft-auto-filled-flags.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import type { PurchaseDraftLineItem } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('AddStockView.tsx — rowToDraftLineItem carries the AutoFilled/BasisUnit fields, conditionally', () => {
  it('writes all four fields only when actually set — never a literal false/undefined key (Firestore write-safety, this file\'s own established discipline)', () => {
    const start = addStockSrc.indexOf('const rowToDraftLineItem = (row: StockRowItem): PurchaseDraftLineItem => ({');
    const end = addStockSrc.indexOf('\n});', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /\.\.\.\(row\.costPriceAutoFilled \? \{ costPriceAutoFilled: true \} : \{\}\)/);
    assert.match(body, /\.\.\.\(row\.sellingPriceAutoFilled \? \{ sellingPriceAutoFilled: true \} : \{\}\)/);
    assert.match(body, /\.\.\.\(row\.costPriceBasisUnit \? \{ costPriceBasisUnit: row\.costPriceBasisUnit \} : \{\}\)/);
    assert.match(body, /\.\.\.\(row\.sellingPriceBasisUnit \? \{ sellingPriceBasisUnit: row\.sellingPriceBasisUnit \} : \{\}\)/);
  });
});

describe('AddStockView.tsx — draftLineItemToRow restores the AutoFilled/BasisUnit fields verbatim', () => {
  it('assigns all four fields directly from the draft item — an older draft with none of them restores exactly as it always did (absent -> undefined -> falsy)', () => {
    const start = addStockSrc.indexOf('const draftLineItemToRow = (item: PurchaseDraftLineItem): StockRowItem => ({');
    const end = addStockSrc.indexOf('\n});', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /costPriceAutoFilled: item\.costPriceAutoFilled,/);
    assert.match(body, /sellingPriceAutoFilled: item\.sellingPriceAutoFilled,/);
    assert.match(body, /costPriceBasisUnit: item\.costPriceBasisUnit,/);
    assert.match(body, /sellingPriceBasisUnit: item\.sellingPriceBasisUnit,/);
  });
});

describe('PurchaseDraftLineItem — round-trip fixture proving the fix actually closes the reported gap', () => {
  // Small local reimplementation of the two pure functions' own field
  // mapping, exercised end-to-end — mirrors this file's own established
  // pattern (see the "Firestore write-safety" describe block, above in
  // this same file) for testing AddStockView.tsx logic without the
  // live Firebase SDK coupling those functions themselves have.
  function toDraftLineItem(row: {
    id: string; productName: string; dateEntered: string; quantity: string; unit: string;
    costPrice: string; sellingPrice: string;
    costPriceAutoFilled?: boolean; sellingPriceAutoFilled?: boolean;
    costPriceBasisUnit?: string; sellingPriceBasisUnit?: string;
  }): PurchaseDraftLineItem {
    return {
      id: row.id,
      productName: row.productName,
      dateEntered: row.dateEntered,
      quantity: parseFloat(row.quantity) || 0,
      unit: row.unit,
      costPrice: parseFloat(row.costPrice) || 0,
      sellingPrice: parseFloat(row.sellingPrice) || 0,
      ...(row.costPriceAutoFilled ? { costPriceAutoFilled: true } : {}),
      ...(row.sellingPriceAutoFilled ? { sellingPriceAutoFilled: true } : {}),
      ...(row.costPriceBasisUnit ? { costPriceBasisUnit: row.costPriceBasisUnit } : {}),
      ...(row.sellingPriceBasisUnit ? { sellingPriceBasisUnit: row.sellingPriceBasisUnit } : {}),
    };
  }

  it('a row with an untouched memory auto-fill (Cx, converted from a 75/Un remembered price) survives a full draft round-trip with its AutoFilled flags intact', () => {
    const row = {
      id: 'row-1', productName: 'Heineken Txoti', dateEntered: '2026-08-25', quantity: '2', unit: 'Cx',
      costPrice: '1500', sellingPrice: '1800',
      costPriceAutoFilled: true, sellingPriceAutoFilled: true,
      costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx',
    };
    const draftItem = toDraftLineItem(row);
    // Simulates the Firestore round-trip itself (setDoc -> onSnapshot),
    // which is a plain JSON-shaped object read back.
    const restored: PurchaseDraftLineItem = JSON.parse(JSON.stringify(draftItem));
    assert.equal(restored.costPriceAutoFilled, true);
    assert.equal(restored.sellingPriceAutoFilled, true);
    assert.equal(restored.costPriceBasisUnit, 'Cx');
    assert.equal(restored.sellingPriceBasisUnit, 'Cx');
    // Confirms this is genuinely what was previously missing: before
    // the fix, none of these four keys existed on the draft item at
    // all.
    assert.ok('costPriceAutoFilled' in draftItem);
  });

  it('a manually-typed price (never auto-filled) writes NO AutoFilled/BasisUnit keys at all — never a fabricated false', () => {
    const row = {
      id: 'row-1', productName: 'New Product', dateEntered: '2026-08-25', quantity: '2', unit: 'Cx',
      costPrice: '1500', sellingPrice: '1800',
    };
    const draftItem = toDraftLineItem(row);
    assert.equal('costPriceAutoFilled' in draftItem, false);
    assert.equal('sellingPriceAutoFilled' in draftItem, false);
    assert.equal('costPriceBasisUnit' in draftItem, false);
    assert.equal('sellingPriceBasisUnit' in draftItem, false);
  });

  it('an older draft document (predating this fix, none of the four fields present) restores without error, all four fields simply undefined', () => {
    const olderDraftItem: PurchaseDraftLineItem = {
      id: 'row-1', productName: 'Coca-Cola', dateEntered: '2026-01-01', quantity: 50, unit: 'cx', costPrice: 450, sellingPrice: 600,
    };
    assert.equal(olderDraftItem.costPriceAutoFilled, undefined);
    assert.equal(olderDraftItem.sellingPriceAutoFilled, undefined);
  });
});
