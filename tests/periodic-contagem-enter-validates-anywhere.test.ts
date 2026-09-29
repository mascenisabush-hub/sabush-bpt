// SABUSH BPT — Periodic Contagem: Enter validates the open product from
// anywhere on the page (Owner-requested), not only from a quantity field.
// Source-text pins, per this repo's precedent (no DOM/React harness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const effStart = view.indexOf("if (e.key === 'Enter') {\n        if (!isWorkspaceActive");
const enterBlock = view.slice(effStart, view.indexOf("if (e.key.toLowerCase() === 'n')", effStart));

test('global handler validates the open product on Enter', () => {
  assert.ok(effStart > 0, 'Enter branch in the document-level keydown handler');
  assert.match(enterBlock, /e\.preventDefault\(\);\s*handleValidateOpenProductShortcut\(e\.ctrlKey \|\| e\.metaKey\);/);
});

test('only while a product is open, never on the review screen, help panel or IME composition', () => {
  assert.match(enterBlock, /if \(!isWorkspaceActive \|\| pendingTally \|\| showShortcutHelp \|\| e\.isComposing\) return;/);
});

test('never double-validates an Enter the quantity field already handled', () => {
  assert.match(view, /enterHandledByFieldRef\.current = e\.nativeEvent;/);
  assert.match(enterBlock, /if \(enterHandledByFieldRef\.current === e\) return;/);
});

test('leaves native Enter alone on buttons, links, dropdowns, rows and opted-out fields', () => {
  assert.match(enterBlock, /\['BUTTON', 'A', 'SELECT', 'TEXTAREA', 'SUMMARY'\]\.includes\(target\.tagName\)/);
  assert.match(enterBlock, /target\.closest\('\[role="button"\], \[data-enter-validate="off"\]'\)/);
  assert.match(enterBlock, /'checkbox', 'radio', 'file', 'date'/);
  // search, count label and existing-product lookup opt out
  // + the editing space's blank-entry search (Enter opens/adds a product there).
  assert.equal((view.match(/\n\s*data-enter-validate="off"\n/g) ?? []).length, 4);
});

test('shortcut reuses the same validation paths (single portion vs whole product) and Ctrl/Cmd advance', () => {
  const s = view.indexOf('const handleValidateOpenProductShortcut = (advanceAfter: boolean) => {');
  const body = view.slice(s, view.indexOf('\n  };', s));
  assert.match(body, /if \(pending\.length >= 2\) handleValidateWorkspaceProduct\(\);/);
  assert.match(body, /handleSaveCatalogRow\(first\.productId\)/);
  assert.match(body, /handleSaveManualRow\(first\.idx\)/);
  assert.match(body, /ctrlEnterRequestedRef\.current =/);
});

test('help panel describes the new behaviour', () => {
  assert.match(view, /\['Enter', 'Validar o produto aberto \(em qualquer lugar da página\)'\]/);
});
