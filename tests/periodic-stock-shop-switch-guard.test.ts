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

  it('also resets per-row inline save errors, so stale red status from the old business can never bleed into the new one — and validated status needs no separate reset, since Decision 40 moved it onto each row in catalogRows/manualRows, both already cleared immediately above', () => {
    // [Decision 40 — Validar Workflow] The per-row confirmed-row
    // tracking Sets (setConfirmedCatalogProductIds/
    // setConfirmedManualRowIndices) this test originally checked for
    // were retired when Decision 40 moved validated status onto each
    // row's own `validated` field instead of a separate tracking Set
    // — see the shop-switch reset block's own comment in
    // PeriodicStockCountView.tsx. Clearing catalogRows/manualRows
    // (asserted by the sibling test immediately above) now clears
    // validated status too, by construction, with nothing separate
    // left to reset. Only the inline save-error state — which never
    // moved onto the rows themselves — still needs its own explicit
    // reset here.
    const idx = src.indexOf('detectShopSwitch(activeBusinessId ?? null, loadedForBusinessId)');
    const body = src.slice(idx, idx + 2000);
    assert.match(body, /setCatalogRowSaveError\(\{\}\);/);
    assert.match(body, /setManualRowSaveError\(\{\}\);/);
    assert.doesNotMatch(
      body,
      /setConfirmedCatalogProductIds|setConfirmedManualRowIndices/,
      'The retired per-row confirmed-tracking Sets should not reappear — validated status lives on the rows themselves now.'
    );
  });

  it('the catalogRows auto-populate effect is keyed only on [products], so a reset stays empty until the new business genuinely delivers fresh data', () => {
    const idx = src.indexOf('const next: CatalogRowState = {};');
    assert.notEqual(idx, -1);
    const nearby = src.slice(idx, idx + 400);
    assert.match(nearby, /\}, \[products\]\);/);
  });
});
