// SABUSH BPT — Periodic Contagem layout (Owner-requested, 2026-09-29):
// left = editing space only (blank entry or the product being edited, with
// ✕); right = the products of this count (validated + "por validar"),
// newest first; ✕ closes the editing space and the list is centred.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const fn = (marker: string) => {
  const a = view.indexOf(marker);
  assert.notEqual(a, -1, `missing ${marker}`);
  return view.slice(a, view.indexOf('\n  };', a));
};

test('✕: blank entry closes the space; a NEW product is deleted (asking first if anything was typed); an existing product closes without changes', () => {
  const body = fn('const handleCloseEditingSpace = async () => {');
  assert.match(body, /if \(!isWorkspaceActive\) \{\s*setEditingSpaceOpen\(false\);\s*return;\s*\}/);
  assert.match(body, /if \(activeNewManualRowIndex === null\) \{\s*handleLeaveWorkspaceUnchanged\(\);\s*return;\s*\}/);
  assert.match(body, /if \(hasData && !window\.confirm\('Apagar este produto\? O que escreveu nele será apagado\.'\)\) return;/);
  assert.match(body, /await handleRemoveManualRow\(idx\);/);
  // one confirmation only — the per-portion prompt is suppressed, then restored
  assert.match(body, /suppressRemoveConfirmRef\.current = true;[\s\S]*finally \{\s*suppressRemoveConfirmRef\.current = false;\s*\}/);
  assert.match(view, /!suppressRemoveConfirmRef\.current &&\s*!window\.confirm\('Remover esta porção\?/);
});

test('after Validar (the product closes) a fresh blank entry takes focus; opening any product re-opens the editing space', () => {
  assert.match(view, /if \(wasWorkspaceActiveRef\.current && !isWorkspaceActive && editingSpaceOpen\) \{\s*setEntryPickerQuery\(''\);\s*setTimeout\(\(\) => entryPickerInputRef\.current\?\.focus\(\), 0\);/);
  assert.match(view, /useEffect\(\(\) => \{\s*if \(isWorkspaceActive\) setEditingSpaceOpen\(true\);\s*\}, \[isWorkspaceActive\]\);/);
});

test('blank entry: type → pick an existing product (same activation as the list) or add a new one with that name', () => {
  assert.match(view, /filterGroupsBySearch\(productDisplayGroups, query\)\.slice\(0, 8\)/);
  assert.match(view, /onClick=\{\(\) => activateProductGroup\(group\)\}/);
  assert.match(view, /if \(matches\.length === 1\) activateProductGroup\(matches\[0\]\);\s*else if \(query && !exact\) handleAddNewProductWithName\(query\);/);
  const add = fn('const handleAddNewProductWithName = (name: string) => {');
  assert.match(add, /handleAddNewProductToWorkspace\(\);\s*if \(name\.trim\(\)\) updateManualRow\(newIndex, \{ productName: name\.trim\(\) \}\);/);
});

test('closed editing space: list centred at a fixed width, with "Contar produto" to reopen', () => {
  assert.match(view, /: 'w-full max-w-3xl mx-auto'/);
  assert.match(view, /\{!editingSpaceOpen && \([\s\S]{0,200}onClick=\{\(\) => setEditingSpaceOpen\(true\)\}[\s\S]{0,500}<span>Contar produto<\/span>/);
});

test('the editing-space header carries the ✕ with a label that says what it will do', () => {
  assert.match(view, /'Fechar espaço de edição'/);
  assert.match(view, /'Apagar este produto novo'/);
  assert.match(view, /'Fechar este produto sem alterações'/);
  assert.match(view, /void handleCloseEditingSpace\(\);/);
});
