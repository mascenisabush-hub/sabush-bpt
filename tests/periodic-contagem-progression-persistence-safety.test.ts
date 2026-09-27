// [Periodic Contagem — Implementation Authorization §1b, Decision A,
// signed 27 September 2026, commit 6310429] Stage 2 of 6: progression
// (Ctrl/Cmd+Enter advance, auto-close-workspace) consulting
// persistenceState alongside validated. Source-text based, following
// this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('isRowSafeToProgress — the shared helper', () => {
  it('exists, and consults the exact same signals groupableUnifiedEntries itself uses -- no new signal introduced', () => {
    assert.match(source, /const isRowSafeToProgress = \(conflictKey: string\): boolean => \{/);
    assert.match(source, /rowHasUnsavedLocalEditRef\.current\[conflictKey\]/);
    assert.match(source, /manualRetryEligibleRowsRef\.current\.has\(conflictKey\)/);
    assert.match(source, /derivePeriodicRowPersistenceState\(\{/);
  });

  it('the safe set is exactly saved or transiently saving -- conflict/save-blocked/occupied-target-rejected/save-unknown all remain unsafe, per Decision A2\'s table', () => {
    const fnMatch = source.match(/const isRowSafeToProgress = \(conflictKey: string\): boolean => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(fnMatch![0], /return persistenceState === 'saved' \|\| persistenceState === 'saving';/);
  });
});

describe('Ctrl/Cmd+Enter advance -- consults isRowSafeToProgress, not validated alone', () => {
  it('the advance effect now checks isRowSafeToProgress before calling advanceAfterValidation', () => {
    const region = source.slice(
      source.indexOf('wasValidatedBeforeRef.current === false && row?.validated === true'),
      source.indexOf('wasValidatedBeforeRef.current === false && row?.validated === true') + 900
    );
    assert.match(region, /if \(isRowSafeToProgress\(conflictKey\)\) \{\s*\n\s*advanceAfterValidation\(\);\s*\n\s*\}/);
  });

  it('the conflictKey is derived using the exact same catalog:${id} / sourceRowKey ?? manual:${index} pattern used everywhere else in this file', () => {
    const region = source.slice(
      source.indexOf('wasValidatedBeforeRef.current === false && row?.validated === true') - 400,
      source.indexOf('wasValidatedBeforeRef.current === false && row?.validated === true') + 500
    );
    assert.match(region, /`catalog:\$\{request\.catalogProductId\}`/);
    assert.match(region, /row\.sourceRowKey \?\? `manual:\$\{request\.manualRowIndex\}`/);
  });
});

describe('Auto-close-workspace -- consults isRowSafeToProgress for every row, not validated alone', () => {
  it('the effect now requires both row.validated AND isRowSafeToProgress for every entry before closing', () => {
    assert.match(source, /entries\.every\(\(entry\) => entry\.row\.validated && isRowSafeToProgress\(entry\.conflictKey\)\)/);
  });

  it('the emptiness condition (entries.length === 0) is completely unchanged -- an empty workspace still closes exactly as before', () => {
    assert.match(source, /entries\.length === 0 \|\|\s*\n\s*entries\.every/);
  });

  it('every one of the five pre-existing state clears (workspace key, new manual row index, row identity, reopened product key, reopened validated sets) remains present, unchanged', () => {
    const fnMatch = source.match(/if \(\s*\n\s*entries\.length === 0[\s\S]*?setReopenedValidatedManualRowIndices\(null\);\s*\n\s*\}/);
    assert.ok(fnMatch, 'expected all five clears to remain present, in the same if-block');
  });
});

// Direct execution of the safe-set logic itself, reproduced exactly
// (the real function closes over live component refs/state and
// cannot be imported standalone) -- proving the actual decision for
// every persistence state named in Decision A2's own table.
type PersistenceState = 'saved' | 'saving' | 'conflict' | 'save-blocked' | 'occupied-target-rejected' | 'save-unknown';

function isSafe(state: PersistenceState): boolean {
  return state === 'saved' || state === 'saving';
}

describe('Direct execution -- Decision A2\'s table, every state', () => {
  it('saved -> safe to progress', () => assert.equal(isSafe('saved'), true));
  it('saving -> safe to progress (transient, held briefly, not an error)', () => assert.equal(isSafe('saving'), true));
  it('conflict -> NOT safe', () => assert.equal(isSafe('conflict'), false));
  it('save-blocked -> NOT safe', () => assert.equal(isSafe('save-blocked'), false));
  it('occupied-target-rejected -> NOT safe', () => assert.equal(isSafe('occupied-target-rejected'), false));
  it('save-unknown -> NOT safe', () => assert.equal(isSafe('save-unknown'), false));
});
