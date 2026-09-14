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
    // [Historical Contagem review/PDF enhancement] Window widened
    // (3000 -> 4500) purely because the modal grew (an export button +
    // per-unit price line were added before this content) — the actual
    // assertions/guarantee below are unchanged.
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 4500);
    assert.match(nearby, /viewingCount\.items\.map/);
    assert.match(nearby, /item\.productName/);
    assert.match(nearby, /item\.quantity/);
    assert.match(nearby, /item\.unit/);
  });

  it('shows Selling Value as the headline total, per the accepted §44 amendment\'s convention — not cost', () => {
    // [Historical Contagem review/PDF enhancement] Window widened
    // (4200 -> 6000) for the same reason as the test above.
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 6000);
    assert.match(nearby, /viewingCount\.totalSellingValue/);
    // Explicitly does not surface totalValue (the cost-basis figure) in
    // this new view — matches §9's "friction disproportionate to
    // value" finding for Contagem cost figures.
    assert.doesNotMatch(nearby, /viewingCount\.totalValue\b/);
  });

  it('never shows a fabricated €0 for a count recorded before totalSellingValue existed — genuinely absent, not a zero (FR-69 discipline, already established elsewhere in this codebase)', () => {
    // [Historical Contagem review/PDF enhancement] Window widened
    // (4200 -> 6000) for the same reason as the two tests above.
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 6000);
    assert.match(nearby, /typeof viewingCount\.totalSellingValue === 'number' \? \(/);
    assert.doesNotMatch(nearby, /totalSellingValue \?\? 0/);
  });

  it('closing the overlay (X button, or clicking the backdrop) clears viewingCount', () => {
    const idx = src.indexOf('{viewingCount && (');
    const nearby = src.slice(idx, idx + 3500);
    const closeCalls = nearby.match(/setViewingCount\(null\)/g) ?? [];
    assert.ok(closeCalls.length >= 2, `expected at least 2 ways to close (backdrop + X button), found ${closeCalls.length}`);
  });
});

describe('PeriodicStockCountView.tsx — correction/recovery mode faithfully restores the confirmed StockCount, including multi-portion products (bug fix)', () => {
  // Locates the actual recovery useEffect precisely, by its own
  // declaration comment through to the end of the hook body — used by
  // every test below instead of a fragile fixed-character-offset
  // window, so these assertions cannot silently drift out of alignment
  // with unrelated later edits to this large file the way the prior
  // version of this suite had (confirmed via baseline comparison: four
  // of its assertions were already failing before this fix, due to
  // exactly that kind of offset drift).
  const effectStart = src.indexOf('  useEffect(() => {\n    if (!pendingBusinessWorthCorrection) {');
  const effectEnd = src.indexOf('\n  }, [pendingBusinessWorthCorrection, latestActiveBusinessWorthSnapshot, stockCounts, products]);', effectStart);
  const effectBody = src.slice(effectStart, effectEnd);

  it('the recovery effect is found in the source, well-formed', () => {
    assert.notEqual(effectStart, -1, 'expected to locate the correction-prefill useEffect');
    assert.notEqual(effectEnd, -1, 'expected to locate the end of the correction-prefill useEffect');
  });

  it('destructures latestActiveBusinessWorthSnapshot from useApp() — the authoritative link to the count being corrected', () => {
    const useAppBlock = src.slice(src.indexOf('export const PeriodicStockCountView'), src.indexOf('} = useApp();') + 20);
    assert.match(useAppBlock, /latestActiveBusinessWorthSnapshot,/);
  });

  it('resolves the source count via sourceStockCountId — never a "most recent by date" guess', () => {
    assert.match(effectBody, /latestActiveBusinessWorthSnapshot\?\.sourceStockCountId/);
    assert.match(effectBody, /stockCounts\.find\(\(sc\) => sc\.id === sourceStockCountId\)/);
  });

  it('only applies once per correction session — guarded by a ref keyed on the specific snapshotId, so it can never silently re-overwrite in-progress edits', () => {
    assert.match(effectBody, /if \(correctionPrefillAppliedForRef\.current === pendingBusinessWorthCorrection\.snapshotId\) return;/);
    assert.match(effectBody, /correctionPrefillAppliedForRef\.current = pendingBusinessWorthCorrection\.snapshotId;/);
  });

  it('resets the guard when correction mode is exited, so entering it again later re-applies the prefill correctly', () => {
    assert.match(effectBody, /if \(!pendingBusinessWorthCorrection\) \{\s*correctionPrefillAppliedForRef\.current = null;/);
  });

  it('[Timing hardening] waits for the catalog to have loaded at least once before running, rather than restoring everything as manual rows unnecessarily', () => {
    assert.match(effectBody, /if \(products\.length === 0\) return;/);
  });

  it('[TEST 1 / TEST 2 — completeness] iterates every item in sourceCount.items exactly once — nothing is filtered out before the restoration decision is made', () => {
    assert.match(effectBody, /sourceCount\.items\.forEach\(\(item, index\) => \{/);
  });

  it('[TEST 3 — multiple portions] the FIRST occurrence of a productId in this pass may claim the catalogRows slot; a claimed slot is tracked and never reused within the same pass', () => {
    assert.match(effectBody, /const claimedThisPass = new Set<string>\(\);/);
    assert.match(effectBody, /const existing = !claimedThisPass\.has\(item\.productId\) \? next\[item\.productId\] : undefined;/);
    assert.match(effectBody, /claimedThisPass\.add\(item\.productId\);/);
  });

  it('[TEST 3 / TEST 4 / TEST 8 — no overwrite] a productId whose slot is already claimed this pass is pushed to overflowItems, never re-entering the catalogRows write for a second time', () => {
    assert.match(effectBody, /overflowItems\.push\(item\);/);
    // The catalogRows write only ever happens inside the `if (!existing)
    // { overflowItems.push(item); return; }` branch's else-path — i.e.
    // exactly once per productId per pass, confirmed by claimedThisPass
    // being consulted (asserted above) before this assignment is ever
    // reached for a given productId.
    assert.match(effectBody, /claimedThisPass\.add\(item\.productId\);\s*next\[item\.productId\] = \{/);
  });

  it('[TEST 8 / TEST 9 — manual-row restoration, catalog-change safety] overflow items are restored via setManualRows, using the SAME productId: undefined convention handleAddPortionToManualGroup already uses — never a new row kind', () => {
    assert.match(effectBody, /setManualRows\(\(prevManual\) => \[/);
    assert.match(effectBody, /\.\.\.prevManual,/);
    assert.match(effectBody, /productId: undefined,/);
    assert.match(effectBody, /productName: item\.productName,/);
  });

  it('a restored manual-row portion preserves quantity/unit/costPrice/sellingPrice/sellingPriceBasisUnit from the confirmed item, and is marked deliberate (never the product-level default)', () => {
    assert.match(effectBody, /quantity: String\(item\.quantity\),/);
    assert.match(effectBody, /unit: item\.unit \|\| 'un',/);
    assert.match(effectBody, /costPrice: String\(item\.costPrice\),/);
    assert.match(effectBody, /sellingPrice: item\.sellingPrice != null \? String\(item\.sellingPrice\) : '',/);
    assert.match(effectBody, /sellingPriceAutoFilled: false,/);
    assert.match(effectBody, /sellingPriceBasisUnit: item\.sellingPriceBasisUnit \?\? item\.unit,/);
  });

  it('the claimed catalogRows slot preserves quantity/unit/costPrice/sellingPrice from the source item, exactly as the original implementation did', () => {
    assert.match(effectBody, /quantity: String\(item\.quantity\)/);
    assert.match(effectBody, /costPrice: String\(item\.costPrice\)/);
    assert.match(effectBody, /sellingPrice: item\.sellingPrice != null/);
  });

  it('[TEST 12 — no historical mutation] this effect only ever calls setCatalogRows/setManualRows (local React state) — it contains no write to any StockCount/BusinessWorthSnapshot document', () => {
    assert.doesNotMatch(effectBody, /updateDoc|setDoc|deleteDoc|writeBatch|runTransaction/);
  });

  it('[TEST 13 — prefill timing] originalOrder is recorded for every item regardless of which structure it lands in, independent of hydration timing', () => {
    assert.match(effectBody, /originalOrder\[item\.productId\] = index;/);
  });

  it('tracks a defensive-only missing count for a genuinely unrecoverable item (no product name) — no longer used for "deleted from catalog," which now recovers via manualRows', () => {
    assert.match(effectBody, /if \(!item\.productName \|\| !item\.productName\.trim\(\)\) \{/);
    assert.match(src, /const \[correctionPrefillMissingCount, setCorrectionPrefillMissingCount\] = useState\(0\);/);
  });

  it('the live-entry correction banner confirms the original data was pre-filled, not just that a correction is in progress', () => {
    const idx = src.indexOf("pré-preenchidos abaixo");
    assert.notEqual(idx, -1, 'expected the Owner-facing confirmation that original values were loaded');
  });
});

describe('PeriodicStockCountView.tsx — recovery/correction multi-portion restoration, behavioral simulation of the actual customer incident', () => {
  // [Scope note] This repository has no DOM/React render harness, so
  // the actual useReducer-style state transitions cannot be executed
  // directly. This suite instead re-implements the EXACT restoration
  // algorithm asserted structurally above, as a small, pure, standalone
  // function operating on plain objects shaped like the real
  // catalogRows/sourceCount.items — proving the ALGORITHM's own
  // correctness on the real customer numbers, while the structural
  // tests above prove that algorithm is what the component actually
  // runs. Mirrors this repository's own established two-technique
  // pattern for exactly this situation.
  function simulateRecoveryRestoration(
    catalogRowProductIds: Set<string>,
    items: { productId: string; productName: string; quantity: number; unit: string; costPrice: number; sellingPrice: number }[]
  ) {
    const catalogRowsClaimed = new Map<string, typeof items[number]>();
    const claimedThisPass = new Set<string>();
    const manualRows: typeof items = [];
    for (const item of items) {
      const canClaim = !claimedThisPass.has(item.productId) && catalogRowProductIds.has(item.productId);
      if (canClaim) {
        claimedThisPass.add(item.productId);
        catalogRowsClaimed.set(item.productId, item);
      } else {
        manualRows.push(item);
      }
    }
    return { catalogRowsClaimed, manualRows };
  }

  it('[TEST 3] three portions of the SAME productId produce one catalog slot and TWO manual rows — never one overwritten row', () => {
    const items = [
      { productId: 'A', productName: 'Product A', quantity: 1, unit: 'un', costPrice: 10, sellingPrice: 20 },
      { productId: 'A', productName: 'Product A', quantity: 2, unit: 'cx', costPrice: 100, sellingPrice: 200 },
      { productId: 'A', productName: 'Product A', quantity: 3, unit: 'kg', costPrice: 5, sellingPrice: 8 },
    ];
    const { catalogRowsClaimed, manualRows } = simulateRecoveryRestoration(new Set(['A']), items);
    assert.equal(catalogRowsClaimed.size, 1);
    assert.equal(catalogRowsClaimed.get('A')!.unit, 'un'); // first occurrence wins the catalog slot
    assert.equal(manualRows.length, 2);
    assert.deepEqual(manualRows.map((r) => r.unit), ['cx', 'kg']);
  });

  it('[TEST 9] a productId absent from the current catalog is restored entirely as a manual row, never dropped', () => {
    const items = [{ productId: 'DELETED', productName: 'Discontinued Product', quantity: 5, unit: 'un', costPrice: 10, sellingPrice: 15 }];
    const { catalogRowsClaimed, manualRows } = simulateRecoveryRestoration(new Set(), items);
    assert.equal(catalogRowsClaimed.size, 0);
    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].productName, 'Discontinued Product');
  });

  it('[TEST 1 / TEST 2 / TEST 4 — the actual customer incident] 211 confirmed items (177 single-portion + 34 second-portions of already-counted products) restore as 211 total rows, with zero loss', () => {
    const distinctProducts = 177;
    const items: { productId: string; productName: string; quantity: number; unit: string; costPrice: number; sellingPrice: number }[] = [];
    const catalogRowProductIds = new Set<string>();
    for (let i = 0; i < distinctProducts; i++) {
      const productId = `prod-${i}`;
      catalogRowProductIds.add(productId);
      items.push({ productId, productName: `Product ${i}`, quantity: 10, unit: 'un', costPrice: 5, sellingPrice: 8 });
    }
    // The 34 known second-portion entries from the actual incident — each
    // reuses one of the first 34 productIds above, exactly like Rachele's
    // own second portion shared its first portion's productId.
    for (let i = 0; i < 34; i++) {
      items.push({ productId: `prod-${i}`, productName: `Product ${i}`, quantity: 4, unit: 'cx', costPrice: 20, sellingPrice: 30 });
    }
    assert.equal(items.length, 211);
    const { catalogRowsClaimed, manualRows } = simulateRecoveryRestoration(catalogRowProductIds, items);
    assert.equal(catalogRowsClaimed.size, 177);
    assert.equal(manualRows.length, 34);
    assert.equal(catalogRowsClaimed.size + manualRows.length, 211); // zero loss — the exact acceptance criterion
  });

  it('[TEST 5 — Pala Pala] a single-portion product\'s corrected quantity (3 cxn, not 2) is preserved exactly, unaffected by the multi-portion fix', () => {
    const items = [{ productId: 'pala-pala', productName: 'Pala Pala', quantity: 3, unit: 'cxn', costPrice: 40, sellingPrice: 40 }];
    const { catalogRowsClaimed } = simulateRecoveryRestoration(new Set(['pala-pala']), items);
    assert.equal(catalogRowsClaimed.get('pala-pala')!.quantity, 3);
    assert.equal(catalogRowsClaimed.get('pala-pala')!.quantity * catalogRowsClaimed.get('pala-pala')!.costPrice, 120);
  });

  it('[TEST 6 — Lucky Star] the confirmed (wrong) quantity restores exactly as confirmed — 140, never silently corrected to 14 — the Owner must edit it intentionally', () => {
    const items = [{ productId: 'lucky-star', productName: 'Lucky Star', quantity: 140, unit: 'un', costPrice: 100, sellingPrice: 140 }];
    const { catalogRowsClaimed } = simulateRecoveryRestoration(new Set(['lucky-star']), items);
    assert.equal(catalogRowsClaimed.get('lucky-star')!.quantity, 140);
  });
});

