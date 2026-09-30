// SABUSH BPT — Quebras: the product is chosen by searching (type → matching
// products appear), not by scrolling a dropdown (Owner-requested 2026-09-29).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../apps/tenant/src/components/AddQuebraView.tsx', import.meta.url), 'utf-8');

test('product selection is a medium-size search field with a live list — no plain product dropdown', () => {
  assert.doesNotMatch(view, /<select\s+value=\{selectedProductId\}/);
  assert.match(view, /<div className="relative max-w-md">/);
  assert.match(view, /role="combobox"/);
  assert.match(view, /placeholder=\{t\('addQuebra\.searchProductPlaceholder'\)\}/);
  assert.match(view, /role="listbox"/);
});

test('matching: any part of the name, accents and capitals ignored; names starting with the letters first', () => {
  // run the component's own normalisation + matching rule
  const normalizeForSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  assert.match(view, /text\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)\.toLowerCase\(\)\.trim\(\)/);
  assert.match(view, /products\.filter\(p => normalizeForSearch\(p\.name\)\.includes\(q\)\)/);
  const names = ['Água 500ml', 'Lite 330ml', 'Agua plus 6l', 'Cerveja Laurentina'];
  const q = normalizeForSearch('AGUA');
  const hits = names.filter((n) => normalizeForSearch(n).includes(q));
  assert.deepEqual(hits, ['Água 500ml', 'Agua plus 6l']);
  assert.match(view, /normalizeForSearch\(a\.name\)\.startsWith\(q\) \? 0 : 1/);
});

test('keyboard: ↑/↓ move, Enter picks (never submits the breakage form), Escape closes', () => {
  assert.match(view, /e\.key === 'ArrowDown'/);
  assert.match(view, /e\.key === 'ArrowUp'/);
  assert.match(view, /e\.key === 'Enter'\) \{\s*\/\/ never submit the form while choosing a product\s*e\.preventDefault\(\);/);
  assert.match(view, /e\.key === 'Escape'/);
});

test('choosing sets the same selectedProductId the rest of the form (batches, submit) already uses', () => {
  assert.match(view, /const chooseProduct = \(productId: string\) => \{\s*setSelectedProductId\(productId\);/);
  assert.match(view, /onClick=\{\(\) => chooseProduct\(p\.id\)\}/);
});

test('translations exist in pt, en and fr', () => {
  for (const l of ['pt', 'en', 'fr']) {
    const src = readFileSync(new URL(`../apps/tenant/src/i18n/locales/${l}.ts`, import.meta.url), 'utf-8');
    assert.match(src, /searchProductPlaceholder: '/, l);
    assert.match(src, /noProductMatch: '/, l);
  }
});
