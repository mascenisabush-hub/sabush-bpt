// Bug fix — a manually-added ("PRODUTO NOVO") product's name field
// appeared to "freeze"/revert after a couple of characters, refusing
// further typing or deletion. Root cause: `handleRenameManualGroup`
// (the path every keystroke after the first routes through, once the
// typed name becomes non-blank) only ever scheduled a '__meta__' save
// — never the affected row's own `manual:${index}` key. Two
// consequences, both load-bearing for the bug:
//   1. `scheduleRowDraftSave` only arms `rowHasUnsavedLocalEditRef`
//      for a 'catalog:'/'manual:' key — '__meta__' never re-arms the
//      per-row "don't overwrite active typing" protection
//      (Implementation Authorization §2 item 1) for the row actually
//      being renamed.
//   2. '__meta__' saves count-level fields only — it never issues the
//      per-row Firestore write that actually persists a renamed
//      productName (that lives on the row's own `items` subcollection
//      document, per Decisions 44-56's per-row draft persistence).
// Once the row's own first-keystroke save (via `updateManualRow`,
// which correctly used its own `manual:${index}` key) completed, its
// protection was released as designed for a normal successful save —
// but every keystroke after that point, routed through
// handleRenameManualGroup instead, never re-armed that protection or
// scheduled a real save again. The live-adoption effect would then see
// an unprotected row whose local value no longer matched the last
// thing actually saved, and silently revert it back — exactly the
// reported "won't accept typing past a couple of characters" symptom.
//
// This repository has no React/DOM test harness (see
// stock-count-simplification.test.ts's own established precedent) —
// these are source-level regression guards proving the structural
// properties that produce the fix, matching every other bug-fix test
// block in this codebase's own convention.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-manual-row-rename-dirty-flag-fix.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const periodicSrc = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

const fnMatch = periodicSrc.match(
  /const handleRenameManualGroup = \(groupKey: string, newName: string\) => \{[\s\S]*?\n  \};/
);

describe('Bug fix — manual-row rename no longer freezes/reverts mid-typing', () => {
  it('handleRenameManualGroup exists and was found for the assertions below', () => {
    assert.ok(fnMatch, 'expected to find handleRenameManualGroup');
  });

  it('collects the affected row indices BEFORE renaming, matched by productKeyFor against the current manualRows', () => {
    assert.match(
      fnMatch![0],
      /const affectedIndices = manualRows\.reduce<number\[\]>\(\(acc, row, index\) => \{\s*\n\s*if \(productKeyFor\(row\.productName\) === groupKey\) acc\.push\(index\);/
    );
  });

  it('still schedules \'__meta__\' (unchanged, additive — not removed or replaced)', () => {
    assert.match(fnMatch![0], /scheduleRowDraftSave\('__meta__'\);/);
  });

  it('ALSO schedules scheduleRowDraftSave for every affected row\'s own manual:${index} key — the actual fix', () => {
    assert.match(
      fnMatch![0],
      /for \(const index of affectedIndices\) \{\s*\n\s*scheduleRowDraftSave\(`manual:\$\{index\}`\);\s*\n\s*\}/
    );
  });

  it('the manual:${index} scheduling happens AFTER the rename (setManualRows) and AFTER the __meta__ schedule, so it operates on the row\'s new name, not a stale one', () => {
    const setManualRowsIdx = fnMatch![0].indexOf('setManualRows(nextManualRows)');
    const metaScheduleIdx = fnMatch![0].indexOf("scheduleRowDraftSave('__meta__')");
    const perRowLoopIdx = fnMatch![0].indexOf('for (const index of affectedIndices)');
    assert.ok(setManualRowsIdx >= 0 && metaScheduleIdx >= 0 && perRowLoopIdx >= 0);
    assert.ok(setManualRowsIdx < metaScheduleIdx, 'rename must be applied before any scheduling');
    assert.ok(metaScheduleIdx < perRowLoopIdx, 'per-row scheduling must come after the __meta__ schedule, not before it');
  });

  it('scheduleRowDraftSave itself re-arms rowHasUnsavedLocalEditRef ONLY for catalog:/manual: keys — confirming why __meta__ alone could never have protected the renamed row', () => {
    const scheduleFnMatch = periodicSrc.match(/const scheduleRowDraftSave = \(rowKey: string\) => \{[\s\S]*?\n  \};/);
    assert.ok(scheduleFnMatch, 'expected to find scheduleRowDraftSave');
    assert.match(
      scheduleFnMatch![0],
      /if \(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) \{\s*\n\s*rowHasUnsavedLocalEditRef\.current\[rowKey\] = true;\s*\n\s*\}/
    );
  });

  it('performRowSaveAttempt reads live, current manualRows state at fire-time (latestFlushArgs.current) — so the debounced save this fix schedules will persist whatever was most recently typed, not a stale snapshot', () => {
    const performMatch = periodicSrc.match(/const performRowSaveAttempt = async \(rowKey: string, generation: number, attemptNumber: number\) => \{[\s\S]*?const \{ catalogRows: cr, manualRows: mr,[\s\S]{0,80}\} = latestFlushArgs\.current;/);
    assert.ok(performMatch, 'expected performRowSaveAttempt to read latestFlushArgs.current live');
  });

  it('a successful row save clears rowHasUnsavedLocalEditRef for that exact manual:${index} key, resuming normal live-adoption protection once the fix\'s own save lands', () => {
    assert.match(
      periodicSrc,
      /if \(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) \{\s*\n\s*delete rowHasUnsavedLocalEditRef\.current\[rowKey\];\s*\n\s*\}/
    );
  });

  it('does not touch the JSX call site (group.key ? handleRenameManualGroup(...) : updateManualRow(...)) — only the function body changed', () => {
    assert.match(
      periodicSrc,
      /group\.key \? handleRenameManualGroup\(group\.key, e\.target\.value\) : updateManualRow\(firstIdx, \{ productName: e\.target\.value \}\)/
    );
  });

  it('does not modify updateManualRow (the already-correct first-keystroke path, used while the name is still blank)', () => {
    const updateManualRowMatch = periodicSrc.match(/const updateManualRow = \(\s*\n\s*index: number,[\s\S]*?\n  \};/);
    assert.ok(updateManualRowMatch, 'expected to find updateManualRow');
    assert.match(updateManualRowMatch![0], /scheduleRowDraftSave\(`manual:\$\{index\}`\);/);
  });
});
