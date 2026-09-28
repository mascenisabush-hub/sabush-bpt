// SABUSH BPT — Periodic Contagem: a product with 2+ portions is validated
// with ONE product-level click (Owner-requested). Opening a product shows
// all its portions together, so per-portion Validar was redundant.
//
// Source-text pins, per this repo's precedent (no DOM/React harness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const start = view.indexOf('const handleValidateWorkspaceProduct = () => {');
const body = view.slice(start, view.indexOf('\n  };', start));

test('handler exists and covers every unvalidated portion (catalog + manual) in the open product', () => {
  assert.ok(start > 0);
  const pendingStart = view.indexOf('const getWorkspacePendingPortions = () => {');
  const pending = view.slice(pendingStart, view.indexOf('\n  };', pendingStart));
  assert.match(pending, /visibleCatalogEntries\s*\n?\s*\.filter\(\(\[, row\]\) => !row\.validated\)/);
  assert.match(pending, /visibleManualRowGroups\.flatMap/);
  assert.match(pending, /!manualRowsRef\.current\[idx\]\.validated/);
});

test('reuses the exact per-row checks, all-or-nothing before any write', () => {
  assert.match(body, /validateWorkingRowForSave\(portion\.row\) \?\? duplicatePortionMessageFor\(portion\.row, key\)/);
  const errorReturn = body.indexOf('setManualRowSaveError((prev) => ({ ...prev, ...manualErrors }));');
  const firstWrite = body.indexOf('updateManualRow(portion.idx, { validated: true, entrySequence })');
  assert.ok(errorReturn > 0 && firstWrite > errorReturn, 'errors must be handled (and return) before any portion is validated');
  assert.match(body.slice(errorReturn, firstWrite), /return;/);
});

test('zero-stock confirmation is asked once for the product, and a cancel validates nothing', () => {
  assert.match(body, /const zeroPortions = pending\.filter/);
  assert.match(body, /!window\.confirm\([\s\S]*?\)\s*\)\s*\{\s*return;\s*\}/);
});

test('writes through the same updateCatalogRow/updateManualRow path as per-row Validar', () => {
  assert.match(body, /updateCatalogRow\(portion\.productId, \{ validated: true, entrySequence \}\)/);
  assert.match(body, /updateManualRow\(portion\.idx, \{ validated: true, entrySequence \}\)/);
});

test('with 2+ pending portions the per-row Validar buttons are replaced by one product-level button', () => {
  assert.match(view, /const isMultiPortionWorkspace = workspacePendingPortionCount >= 2;/);
  assert.equal((view.match(/\) : isMultiPortionWorkspace \? null : \(/g) ?? []).length, 2);
  assert.match(view, /\{isMultiPortionWorkspace && \([\s\S]{0,900}onClick=\{handleValidateWorkspaceProduct\}/);
  assert.match(view, /Validar produto \(\{workspacePendingPortionCount\} porções\)/);
});

test('Enter in a quantity field validates the whole product when it has several portions', () => {
  const kStart = view.indexOf('const handleQuantityKeyDown = (');
  const k = view.slice(kStart, view.indexOf('\n  };', kStart));
  assert.match(k, /if \(isMultiPortionWorkspace && \(catalogProductId \|\| manualRowIndexArg !== null\)\) \{\s*handleValidateWorkspaceProduct\(\);/);
});

test('single-portion products keep the ordinary per-row Validar', () => {
  assert.match(view, /onClick=\{\(\) => handleSaveCatalogRow\(productId\)\}/);
  assert.match(view, /onClick=\{\(\) => handleSaveManualRow\(idx\)\}/);
});
