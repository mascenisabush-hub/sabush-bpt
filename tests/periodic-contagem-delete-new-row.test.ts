// SABUSH BPT — Periodic Contagem: rows created via "Adicionar produto" or
// "Adicionar Porção" (while editing) must be deletable.
//
// Bug (reported live, urgent): such rows get a stable key
// (manual:<uuid>) at creation, before their first save. Deleting one
// cancels its pending save, so the server has no document, tombstone or
// migration candidate; deletePeriodicManualRow answered 'ambiguous' and
// handleRemoveManualRow refused to remove the row. Also: the open
// workspace tracks rows by position, so after a delete a row of another
// product could slide in; and the bin was hidden on desktop until hover.
//
// Source-text pins, per this repo's precedent (no DOM/React harness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf-8');
const ctx = read('apps/tenant/src/context/AppContext.tsx');
const view = read('apps/tenant/src/components/PeriodicStockCountView.tsx');

const fnBody = (src: string, marker: string) => {
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);
  return src.slice(start, src.indexOf('\n  };', start));
};

test('a never-saved stable-key row is recorded as deleted, not ambiguous', () => {
  const body = fnBody(ctx, 'const deletePeriodicManualRow = async');
  const stable = body.indexOf("if (!/^manual:\\d+$/.test(believedKey)) {");
  const ambiguous = body.lastIndexOf("return 'ambiguous' as const;");
  assert.ok(stable > 0 && stable < ambiguous, 'stable-key branch must come before the ambiguous fallback');
  const branch = body.slice(stable, ambiguous);
  assert.match(branch, /tx\.set\(tombstoneRef\(believedKey\), writeTombstone\(believedKey\)\);/);
  assert.match(branch, /return 'done' as const;/);
});

test('legacy positional keys keep the conservative ambiguous outcome', () => {
  const body = fnBody(ctx, 'const deletePeriodicManualRow = async');
  assert.match(body, /return 'ambiguous' as const;\s*\}\);/);
});

test('new rows really are created with stable manual:<uuid> keys', () => {
  assert.match(view, /sourceRowKey: `manual:\$\{crypto\.randomUUID\(\)\}`/);
});

test('removing a row re-addresses the open workspace (positions shift)', () => {
  const body = fnBody(view, 'const handleRemoveManualRow = async (index: number) => {');
  assert.match(body, /currentRows\.findIndex\(\(r\) => r\.sourceRowKey === row\.sourceRowKey\)/);
  assert.match(body, /manualIndices: prev\.manualIndices\.filter\(\(i\) => i !== removeIndex\)\.map\(shiftIndex\)/);
  assert.match(body, /setReopenedValidatedManualRowIndices\(\(prev\) =>/);
  assert.match(body, /setActiveNewManualRowIndex\(shiftIndex\(activeNewManualRowIndex\)\)/);
});

test('the bin is always visible, not hover-only on desktop', () => {
  assert.doesNotMatch(view, /aria-label=\{`Remover porção`\}\s*className="[^"]*sm:opacity-0/);
  assert.equal((view.match(/text-gray-400 opacity-100 hover:text-rose-600/g) ?? []).length, 2);
});
