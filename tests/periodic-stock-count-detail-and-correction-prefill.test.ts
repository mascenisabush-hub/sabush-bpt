// [Feature — Owner-requested, real client complaint] After a Periodic
// Contagem is confirmed, there was no way to come back and see which
// products were counted, their quantities, or the total — the existing
// "Histórico de Contagens" list showed only a date, a product COUNT
// ("12 produtos"), and an aggregate total, with no click-through at
// all. Separately, entering "correction mode" (the already-governed
// 3-hour window, POL-0010 REC-1) opened a genuinely BLANK Contagem
// screen — confirmed by direct inspection that `mostRecentCount` was
// declared but never read anywhere else in the file — so "correcting"
// meant blindly re-counting everything from scratch.
//
// This is a source-text wiring test (matching this repository's own
// established pattern — see tests/periodic-stock-shop-switch-guard.test.ts,
// tests/add-stock-flush-on-exit.test.ts — for verifying a component
// actually calls into the right state/logic, since this repository has
// no DOM/React render harness) rather than a rendered-DOM test.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-count-detail-and-correction-prefill.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

describe('PeriodicStockCountView.tsx — view past count details (any count, no time limit)', () => {
  it('declares viewingCount state', () => {
    assert.match(src, /const \[viewingCount, setViewingCount\] = useState<StockCount \| null>\(null\);/);
  });

  it('each history row is a clickable button that opens the viewer, not a static div', () => {
    const idx = src.indexOf('pastCounts.map((count) => (');
    assert.notEqual(idx, -1);
    const nearby = src.slice(idx, idx + 400);
    assert.match(nearby, /<button\b/);
    assert.match(nearby, /onClick=\{\(\) => setViewingCount\(count\)\}/);
  });

  it('the detail overlay is gated on viewingCount, not on the correction window or any date check', () => {
    const idx = src.indexOf('{viewingCount && (');
    assert.notEqual(idx, -1, 'expected a {viewingCount && (...)} block');
    const nearby = src.slice(idx, idx + 1500);
    // Must not gate visibility on the correction-window eligibility —
    // viewing must remain available for every past count, forever.
    assert.doesNotMatch(nearby, /businessWorthCorrectionEligibility/);
    assert.doesNotMatch(nearby, /pendingBusinessWorthCorrection/);
  });

  it('renders every item\'s productName, quantity, and unit from the real StockCountItem — never a recomputed/derived name', () => {
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 3000);
    assert.match(nearby, /viewingCount\.items\.map/);
    assert.match(nearby, /item\.productName/);
    assert.match(nearby, /item\.quantity/);
    assert.match(nearby, /item\.unit/);
  });

  it('shows Selling Value as the headline total, per the accepted §44 amendment\'s convention — not cost', () => {
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 3500);
    assert.match(nearby, /viewingCount\.totalSellingValue/);
    // Explicitly does not surface totalValue (the cost-basis figure) in
    // this new view — matches §9's "friction disproportionate to
    // value" finding for Contagem cost figures.
    assert.doesNotMatch(nearby, /viewingCount\.totalValue\b/);
  });

  it('closing the overlay (X button, or clicking the backdrop) clears viewingCount', () => {
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 3500);
    const closeCalls = nearby.match(/setViewingCount\(null\)/g) ?? [];
    assert.ok(closeCalls.length >= 2, `expected at least 2 ways to close (backdrop + X button), found ${closeCalls.length}`);
  });
});

describe('PeriodicStockCountView.tsx — correction mode pre-fills the original count (bug fix)', () => {
  it('destructures latestActiveBusinessWorthSnapshot from useApp() — the authoritative link to the count being corrected', () => {
    const useAppBlock = src.slice(src.indexOf('export const PeriodicStockCountView'), src.indexOf('} = useApp();') + 20);
    assert.match(useAppBlock, /latestActiveBusinessWorthSnapshot,/);
  });

  it('resolves the source count via sourceStockCountId — never a "most recent by date" guess', () => {
    const idx = src.indexOf('const correctionPrefillAppliedForRef = useRef');
    assert.notEqual(idx, -1, 'expected the prefill-once guard ref declaration');
    const nearby = src.slice(idx, idx + 2500);
    assert.match(nearby, /latestActiveBusinessWorthSnapshot\?\.sourceStockCountId/);
    assert.match(nearby, /stockCounts\.find\(\(sc\) => sc\.id === sourceStockCountId\)/);
  });

  it('pre-fills quantity, unit, costPrice, and sellingPrice from the source count\'s own items into catalogRows', () => {
    const idx = src.indexOf('const correctionPrefillAppliedForRef = useRef');
    const nearby = src.slice(idx, idx + 2500);
    assert.match(nearby, /setCatalogRows\(\(prev\) => \{/);
    assert.match(nearby, /for \(const item of sourceCount\.items\)/);
    assert.match(nearby, /quantity: String\(item\.quantity\)/);
    assert.match(nearby, /costPrice: String\(item\.costPrice\)/);
    assert.match(nearby, /sellingPrice: item\.sellingPrice != null/);
  });

  it('only applies once per correction session — guarded by a ref keyed on the specific snapshotId, so it can never silently re-overwrite in-progress edits', () => {
    const idx = src.indexOf('const correctionPrefillAppliedForRef = useRef');
    const nearby = src.slice(idx, idx + 1200);
    assert.match(nearby, /if \(correctionPrefillAppliedForRef\.current === pendingBusinessWorthCorrection\.snapshotId\) return;/);
    assert.match(nearby, /correctionPrefillAppliedForRef\.current = pendingBusinessWorthCorrection\.snapshotId;/);
  });

  it('resets the guard when correction mode is exited, so entering it again later re-applies the prefill correctly', () => {
    const idx = src.indexOf('const correctionPrefillAppliedForRef = useRef');
    const nearby = src.slice(idx, idx + 800);
    assert.match(nearby, /if \(!pendingBusinessWorthCorrection\) \{\s*correctionPrefillAppliedForRef\.current = null;/);
  });

  it('tracks and discloses products that could not be pre-filled (deleted from the catalog since the original count) — never a silent gap', () => {
    assert.match(src, /const \[correctionPrefillMissingCount, setCorrectionPrefillMissingCount\] = useState\(0\);/);
    const bannerIdx = src.indexOf('correctionPrefillMissingCount > 0');
    assert.notEqual(bannerIdx, -1, 'expected the missing-products disclosure in the correction banner');
  });

  it('the live-entry correction banner confirms the original data was pre-filled, not just that a correction is in progress', () => {
    const idx = src.indexOf("pré-preenchidos abaixo");
    assert.notEqual(idx, -1, 'expected the Owner-facing confirmation that original values were loaded');
  });
});
