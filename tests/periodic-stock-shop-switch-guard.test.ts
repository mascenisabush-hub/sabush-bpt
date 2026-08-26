// [Investigation finding — Contagem was the one product-referencing
// view missing multi-shop stale-reference protection] Every other
// screen that auto-selects from `products`/`batches` (Add Stock,
// Initial Stock Count, Add Quebra) already guards against a direct
// Owner switch (ShopSwitcher) leaving stale Business-A ids usable
// against Business B — PeriodicStockCountView never got this
// protection, meaning a count auto-populated (or genuinely typed
// into) right after a switch could reference the wrong business's
// product ids while being saved under the new business.
//
// This is a source-text wiring test (matching this repository's own
// established pattern — see tests/add-stock-flush-on-exit.test.ts,
// tests/add-stock-draft-remote-update-adoption.test.ts — for verifying
// a component actually calls into shared, already-unit-tested pure
// logic) rather than a re-test of detectShopSwitch itself, which
// tests/shop-switch-guard.test.ts already covers directly.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-shop-switch-guard.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

describe('PeriodicStockCountView.tsx — shop-switch guard is wired in', () => {
  it('imports detectShopSwitch from the shared guard utility', () => {
    assert.match(src, /import \{ detectShopSwitch \} from '\.\.\/lib\/shopSwitchGuard';/);
  });

  it('destructures activeBusinessId from useApp() — needed to detect a switch at all', () => {
    const useAppBlock = src.slice(src.indexOf('export const PeriodicStockCountView'), src.indexOf('} = useApp();') + 20);
    assert.match(useAppBlock, /activeBusinessId,/);
  });

  it('calls detectShopSwitch inside a useEffect keyed on [activeBusinessId]', () => {
    const idx = src.indexOf('detectShopSwitch(activeBusinessId ?? null, loadedForBusinessId)');
    assert.notEqual(idx, -1, 'expected a detectShopSwitch(...) call');
    const nearby = src.slice(Math.max(0, idx - 400), idx + 2000);
    assert.match(nearby, /useEffect\(\(\) => \{/);
    assert.match(nearby, /\}, \[activeBusinessId\]\);/);
  });

  it('resets catalogRows and manualRows on a detected switch — the two pieces of state that actually reference product ids', () => {
    const idx = src.indexOf('detectShopSwitch(activeBusinessId ?? null, loadedForBusinessId)');
    const body = src.slice(idx, idx + 2000);
    assert.match(body, /setCatalogRows\(\{\}\);/);
    assert.match(body, /setManualRows\(\[\]\);/);
  });

  it('also resets the confirmed-row tracking and inline errors introduced by the per-row Save/confirm feature, so stale green/red status from the old business can never bleed into the new one', () => {
    const idx = src.indexOf('detectShopSwitch(activeBusinessId ?? null, loadedForBusinessId)');
    const body = src.slice(idx, idx + 2000);
    assert.match(body, /setConfirmedCatalogProductIds\(new Set\(\)\);/);
    assert.match(body, /setConfirmedManualRowIndices\(new Set\(\)\);/);
    assert.match(body, /setCatalogRowSaveError\(\{\}\);/);
    assert.match(body, /setManualRowSaveError\(\{\}\);/);
  });

  it('the catalogRows auto-populate effect is keyed only on [products], so a reset stays empty until the new business genuinely delivers fresh data', () => {
    const idx = src.indexOf('const next: CatalogRowState = {};');
    assert.notEqual(idx, -1);
    const nearby = src.slice(idx, idx + 400);
    assert.match(nearby, /\}, \[products\]\);/);
  });
});
