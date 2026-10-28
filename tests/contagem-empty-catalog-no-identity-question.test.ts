// SABUSH BPT — first Contagem with an EMPTY catalog: every product is new by
// definition, so the "existing or new?" confirmation is never shown
// (Owner-requested, 2026-09-29). Non-empty catalogs are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const ctx = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

test('empty catalog ⇒ every name is a confirmed new product; otherwise only explicit confirmations count', () => {
  assert.match(view, /const isConfirmedNewProductName = \(name: string\): boolean =>\s*products\.length === 0 \|\| manualIdentityConfirmedNew\.has\(productKeyFor\(name\)\);/);
});

test('the screen, the confirm gate and the saved items all use the same rule', () => {
  assert.match(view, /\{isNewProduct && !isConfirmedNewProductName\(group\.displayName\) && \(/, '"not confirmed" panel hidden');
  assert.match(view, /\{isNewProduct &&\s*isConfirmedNewProductName\(group\.displayName\) &&/, 'new-product details shown at once');
  // 2026-10-28: existing-vs-new no longer blocks — saved items are always sent as new-if-unmatched
  assert.doesNotMatch(view, /isGenuinelyNewProductName\(item\.productName\) && !isConfirmedNewProductName\(item\.productName\)/);
  assert.match(view, /confirmedNewProduct: true,/);
  // no stray direct checks left that could disagree
  assert.equal((view.match(/manualIdentityConfirmedNew\.has\(/g) ?? []).length, 1);
});

test('the save step never refuses an unmatched name — it is created as new', () => {
  const start = ctx.indexOf('const recordStockCount');
  assert.ok(start > -1);
  assert.doesNotMatch(ctx.slice(start, start + 25000), /Unresolved product identity for/);
});
