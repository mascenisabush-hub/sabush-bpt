// SABUSH BPT — a catalog product counted in several units (e.g. Lite 330ml:
// 3 Cx + 3 Emb + 5 Un) must have a clearly visible way to add each extra
// unit (Owner-reported, 2026-09-29): previously only a tiny faint "+".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

test('a full-width "Adicionar Porção (outra unidade)" button follows the catalog product in the editing space', () => {
  const label = view.indexOf('<span>Adicionar Porção (outra unidade)</span>');
  assert.ok(label > view.indexOf('{visibleCatalogEntries.length > 0 && ('), 'inside the catalog section of the editing space');
  const block = view.slice(label - 900, label + 60);
  assert.match(block, /\{visibleManualRowGroups\.length === 0 && visibleCatalogEntries\[0\] && \(/);
  assert.match(block, /onClick=\{\(\) => handleAddPortionToManualGroup\(visibleCatalogEntries\[0\]\[1\]\.productName\)\}/);
  assert.match(block, /<span>Adicionar Porção \(outra unidade\)<\/span>/);
});

test('the added portion joins the open product (same handler as manually-added products)', () => {
  const a = view.indexOf('const handleAddPortionToManualGroup = (groupDisplayName: string) => {');
  const body = view.slice(a, view.indexOf('\n  };', a));
  assert.match(body, /buildCatalogRow\(matchedProduct\)/, 'pre-filled from the catalog product');
  assert.match(body, /setActiveWorkspaceRowIdentity\(\(prev\) => \(\{ \.\.\.prev, manualIndices: \[\.\.\.prev\.manualIndices, nextManualRows\.length - 1\] \}\)\)/);
});
