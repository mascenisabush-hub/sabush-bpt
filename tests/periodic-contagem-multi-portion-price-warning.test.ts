// Regression: Integration Point 3 (3053a60, one-product-one-row) hard-coded `{ showWarning: false }` for any
// multi-portion product in the unified list, so a mistyped selling price on one portion of a product counted
// in several portions was never flagged there - against the unified list's own Hard Requirement §2. Not among
// 3053a60's listed deliberate changes.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const src = readFileSync('apps/tenant/src/components/PeriodicStockCountView.tsx', 'utf8');
const loopStart = src.indexOf('{visibleProductDisplayGroups.map((group) => {');
const loop = src.slice(loopStart, src.indexOf('const hasModeAWarning', loopStart) + 200);

describe('unified list: price-deviation warning for multi-portion products', () => {
  it('no longer suppresses the warning for multi-portion groups', () => {
    assert.ok(loopStart !== -1);
    assert.doesNotMatch(loop, /singleRow\s*\?\s*checkPriceDeviation[\s\S]{0,200}:\s*\{\s*showWarning:\s*false\s*\}/);
  });

  it('checks EVERY member portion with the same function and inputs as the active rows', () => {
    assert.match(loop, /const memberRowsForWarning = group\.members\s*\n\s*\.map\(/);
    assert.match(loop, /memberRowsForWarning\s*\n\s*\.map\(\(row\) => checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)\)\s*\n\s*\.find\(\(check\) => check\.showWarning\)/);
    assert.match(loop, /const hasPriceWarning = priceCheck\.showWarning;/);
  });

  it('member rows resolve by the member\'s own identity (catalog id / manual index), never by name', () => {
    const map = loop.slice(loop.indexOf('const memberRowsForWarning'), loop.indexOf('.filter((row): row is StockCountWorkingRow'));
    assert.match(map, /catalogRows\[member\.catalogProductId\]/);
    assert.match(map, /manualRows\[member\.manualRowIndex\]/);
    assert.doesNotMatch(map, /productName/);
  });

  it('single-portion wording is unchanged; multi-portion wording names a portion', () => {
    assert.match(src, /\{isMultiPortion \? 'O preço de uma das porções é' : 'Este preço é'\}/);
  });
});
