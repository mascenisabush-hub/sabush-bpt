// [Periodic Contagem Expanded Phase 2 — Integration Point 2] Regression
// coverage for the actual deletion-path replacement: the reindex-save
// loop and tail-document deletion are removed entirely; deletion now
// targets the row's own stable key via deletePeriodicManualRow. Source-
// text based, following this repository's own established convention.
// The key acceptance condition this suite exists to demonstrate:
// deleting one manual row no longer depends on the row's current
// array position.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

const fnMatch = componentSource.match(/const handleRemoveManualRow = async \(index: number\) => \{[\s\S]*?\n  \};/);

describe('handleRemoveManualRow — replaced with coordinated, stable-key deletion', () => {
  it('exists, now async', () => {
    assert.match(componentSource, /const handleRemoveManualRow = async \(index: number\) => \{/);
  });

  it('the explicit confirmation dialog remains, unchanged, and runs before anything else', () => {
    assert.ok(fnMatch);
    const confirmIndex = fnMatch![0].indexOf("window.confirm('Remover esta porção?");
    const deleteCallIndex = fnMatch![0].indexOf('await deletePeriodicManualRow(');
    assert.ok(confirmIndex > -1 && deleteCallIndex > -1);
    assert.ok(confirmIndex < deleteCallIndex, 'confirmation must be checked before any deletion is attempted');
  });

  it('KEY ACCEPTANCE CONDITION — the deletion target is the row\'s own stable sourceRowKey, never manual:${index}', () => {
    assert.match(fnMatch![0], /if \(row\?\.sourceRowKey\) \{\s*\n\s*const outcome = await deletePeriodicManualRow\(row\.sourceRowKey\);/);
    // Confirm the array index is never passed as the deletion target
    // anywhere in this function — the only manual:${index}
    // occurrences remaining are for the purely local timer map, never
    // for the actual server-side deletion call.
    assert.doesNotMatch(fnMatch![0], /deletePeriodicManualRow\(`manual:\$\{index\}`\)/);
  });

  it('a row never actually persisted (no sourceRowKey) skips the server call entirely — nothing to delete', () => {
    const conditionalStart = fnMatch![0].indexOf('if (row?.sourceRowKey) {');
    const conditionalEnd = fnMatch![0].indexOf('\n    }', conditionalStart);
    const conditional = fnMatch![0].slice(conditionalStart, conditionalEnd);
    assert.ok(conditional.includes('await deletePeriodicManualRow'));
  });

  it('an ambiguous outcome leaves authoritative local state intact — no setManualRowsSynced call before this check resolves', () => {
    const ambiguousIndex = fnMatch![0].indexOf("outcome === 'ambiguous'");
    const filterIndex = fnMatch![0].indexOf('manualRowsRef.current.filter((_, i) => i !== index)');
    assert.ok(ambiguousIndex > -1 && filterIndex > -1);
    assert.ok(ambiguousIndex < filterIndex, 'the ambiguous check must occur, and return early, before local state is ever touched');
    assert.match(fnMatch![0], /if \(outcome === 'ambiguous'\) \{[\s\S]*?return;\s*\n\s*\}/);
  });

  it('an ambiguous outcome surfaces a visible error via the existing manualRowSaveError channel', () => {
    assert.match(
      fnMatch![0],
      /if \(outcome === 'ambiguous'\) \{[\s\S]*?setManualRowSaveError\(\(prev\) => \(\{\s*\n\s*\.\.\.prev,\s*\n\s*\[index\]: '[\s\S]*?',\s*\n\s*\}\)\);/
    );
  });

  it('the old reindex-save loop is gone entirely — no savePeriodicStockDraftItem call for any surviving row', () => {
    assert.doesNotMatch(fnMatch![0], /savePeriodicStockDraftItem\(targetKey/);
    assert.doesNotMatch(fnMatch![0], /nextManualRows\.forEach\(\(row, i\) => \{\s*\n\s*if \(i >= index\)/);
  });

  it('the old tail-document deletion is gone entirely — no removePeriodicStockDraftItem call at all', () => {
    assert.doesNotMatch(fnMatch![0], /removePeriodicStockDraftItem\(/);
  });

  it('surviving rows are never re-stamped with a new sourceRowKey — their own stable identity is untouched by an unrelated row\'s removal', () => {
    assert.doesNotMatch(fnMatch![0], /sourceRowKey: `manual:\$\{i\}`/);
    // The only .map/.filter over manualRowsRef.current is a plain
    // filter, confirming no per-row content mutation occurs at all.
    assert.match(fnMatch![0], /const nextManualRows = manualRowsRef\.current\.filter\(\(_, i\) => i !== index\);/);
  });

  it('local UI bookkeeping (debounce timers, manualRowSaveError) is preserved, unchanged — this is cosmetic array-position tracking, not persistence, and re-indexing it carries no data-integrity risk', () => {
    assert.match(fnMatch![0], /const removedKey = `manual:\$\{index\}`;/);
    assert.match(fnMatch![0], /rowDebounceTimersRef\.current\.delete\(removedKey\);/);
    assert.match(fnMatch![0], /const shifted = new Map<string, ReturnType<typeof setTimeout>>\(\);/);
    assert.match(
      fnMatch![0],
      /setManualRowSaveError\(\(prev\) => \{\s*\n\s*const next: Record<number, string> = \{\};/
    );
  });

  it('__meta__ is still scheduled after a successful removal, matching the existing draftSaveState indicator pattern', () => {
    assert.match(fnMatch![0], /scheduleRowDraftSave\('__meta__'\);/);
  });

  it('the sole existing call site remains a compatible fire-and-forget onClick handler', () => {
    assert.match(componentSource, /onClick=\{\(\) => handleRemoveManualRow\(idx\)\}/);
  });
});
