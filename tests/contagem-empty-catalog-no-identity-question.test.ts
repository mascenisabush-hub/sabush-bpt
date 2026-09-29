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
  assert.match(view, /isGenuinelyNewProductName\(item\.productName\) && !isConfirmedNewProductName\(item\.productName\)/);
  assert.match(view, /\.\.\.\(isConfirmedNewProductName\(item\.productName\)/);
  // no stray direct checks left that could disagree
  assert.equal((view.match(/manualIdentityConfirmedNew\.has\(/g) ?? []).length, 1);
});

test('the save step already skips the identity check for an empty catalog', () => {
  assert.match(ctx, /if \(type !== 'initial' && products\.length > 0 && !product && !confirmedNewProductByName\.get\(/);
});
