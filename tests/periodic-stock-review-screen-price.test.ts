// [Manual data-entry error investigation, Finding 2 — Owner-requested]
// The Confirmar Contagem review screen (PeriodicStockCountView.tsx) —
// the last screen before a Contagem becomes permanent and directly
// feeds Business Worth — used to show only product name + quantity +
// unit per row, never a price. A fat-fingered price typo on any single
// row (the classic extra/missing zero) had nothing on this screen to
// reveal it; only the aggregate total absorbed the error, invisibly,
// across potentially 50-100+ products. This suite confirms each row
// now shows its own selling-value line total.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/declare-business-worth-review-step.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-review-screen-price.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

describe('Confirmar Contagem review screen — each row shows its own price, not just quantity', () => {
  it('the review list (pendingTally.countedItems.map) renders item.sellingValue, not merely quantity/unit', () => {
    const start = periodicSrc.indexOf('{pendingTally.countedItems.map((item, index) => (');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('))}', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /\{item\.quantity\} \{item\.unit\}/);
    assert.match(body, /formatCurrency\(item\.sellingValue, currencySymbol\)/);
  });

  it('shows sellingValue — the same figure productValuationTotal sums across every row — never a second, independently recomputed value (e.g. quantity * sellingPrice re-derived here)', () => {
    const start = periodicSrc.indexOf('{pendingTally.countedItems.map((item, index) => (');
    const end = periodicSrc.indexOf('))}', start);
    const body = periodicSrc.slice(start, end);
    assert.doesNotMatch(body, /item\.quantity \* item\.sellingPrice/);
    assert.doesNotMatch(body, /item\.sellingPrice \* item\.quantity/);
  });

  it('shows the SELLING value specifically, not cost — matching the same figure the confirmation total and the live entry screen already treat as primary', () => {
    const start = periodicSrc.indexOf('{pendingTally.countedItems.map((item, index) => (');
    const end = periodicSrc.indexOf('))}', start);
    const body = periodicSrc.slice(start, end);
    assert.doesNotMatch(body, /item\.purchaseValue/);
  });

  it('the row key remains unique per portion (productName + unit + index) — unaffected by this addition, still guards against the multi-portion duplicate-key bug fixed earlier', () => {
    assert.match(periodicSrc, /key=\{`\$\{item\.productName\}-\$\{item\.unit\}-\$\{index\}`\}/);
  });

  it('uses text-gray-500, not text-gray-400, matching this file\'s own established contrast correction for secondary captions', () => {
    const start = periodicSrc.indexOf('{pendingTally.countedItems.map((item, index) => (');
    const end = periodicSrc.indexOf('))}', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /text-\[11px\] text-gray-500 tabular-nums/);
    assert.doesNotMatch(body, /text-gray-400/);
  });
});
