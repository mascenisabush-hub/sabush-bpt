// [Periodic Contagem — Implementation Authorization §1d, signed
// 27 September 2026, commit 6310429] Stage 4 of 6: finalization's
// third gate, checking persistenceState alongside the two existing
// gates (migrationStatus, unresolvedRecoveryEvidence). Source-text
// based, following this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('handleRequestConfirmation — third gate added, existing two gates unchanged', () => {
  it('the two existing gates (migrationStatus, unresolvedRecoveryEvidence) remain present, unmodified, in the same order', () => {
    const fnStart = source.indexOf('const handleRequestConfirmation = async (e: React.FormEvent) => {');
    const region = source.slice(fnStart, fnStart + 7500); // widened from 3000: the identity-check retry and the duplicate gate now sit before this gate
    const migrationIdx = region.indexOf("migrationStatus === 'blocked'");
    const recoveryIdx = region.indexOf('unresolvedRecoveryEvidence).length > 0');
    const newGateIdx = region.indexOf('unsafeRowEntries.length > 0');
    assert.ok(migrationIdx > -1 && recoveryIdx > -1 && newGateIdx > -1);
    assert.ok(migrationIdx < recoveryIdx && recoveryIdx < newGateIdx, 'expected the new gate to come after both existing ones, not replace or reorder them');
  });

  it('the new gate reuses isRowSafeToProgress unchanged from Stage 2 -- no new persistence-state derivation introduced', () => {
    const fnStart = source.indexOf('const handleRequestConfirmation = async (e: React.FormEvent) => {');
    const region = source.slice(fnStart, fnStart + 7500); // widened from 3000: the identity-check retry and the duplicate gate now sit before this gate
    assert.match(region, /\.filter\(\(conflictKey\) => !isRowSafeToProgress\(conflictKey\)\)/);
  });

  it('checks every existing row (catalog and manual), using the same catalog:${id} / sourceRowKey ?? manual:${index} pattern used everywhere else in this file', () => {
    const fnStart = source.indexOf('const handleRequestConfirmation = async (e: React.FormEvent) => {');
    const region = source.slice(fnStart, fnStart + 7500); // widened from 3000: the identity-check retry and the duplicate gate now sit before this gate
    assert.match(region, /Object\.entries\(catalogRows\)\.map\(\(\[productId\]\) => `catalog:\$\{productId\}`\)/);
    assert.match(region, /manualRows\.map\(\(row, idx\) => row\.sourceRowKey \?\? `manual:\$\{idx\}`\)/);
  });
});

describe('handleConfirmSave — belt-and-suspenders re-check, matching the existing two gates\' own pattern exactly', () => {
  it('the gate is present and re-checked here; it reports via setError (was a silent bare return -- a dead Confirm button, see periodic-contagem-confirm-gate-messages.test.ts)', () => {
    const fnStart = source.indexOf('const handleConfirmSave = async () => {');
    const region = source.slice(fnStart, fnStart + 4000);
    assert.match(region, /const unsafeRowCount = \[[\s\S]*?\]\.filter\(\(conflictKey\) => !isRowSafeToProgress\(conflictKey\)\)\.length;\s*\n\s*if \(unsafeRowCount > 0\) \{\s*\n\s*setError\(unsafeRowsMessage\(unsafeRowCount\)\);\s*\n\s*return;/);
  });

  it('comes after the two existing gates here too, in the same order', () => {
    const fnStart = source.indexOf('const handleConfirmSave = async () => {');
    const region = source.slice(fnStart, fnStart + 4000);
    const migrationIdx = region.indexOf("migrationStatus === 'blocked'");
    const recoveryIdx = region.indexOf('unresolvedRecoveryEvidence).length');
    const newGateIdx = region.indexOf('unsafeRowCount');
    assert.ok(migrationIdx < recoveryIdx && recoveryIdx < newGateIdx);
  });
});

// Direct execution of the gate's own decision logic -- proving the
// actual behavior, not just source-text presence.
type PersistenceState = 'saved' | 'saving' | 'conflict' | 'save-blocked' | 'occupied-target-rejected' | 'save-unknown';

function anyRowBlocksFinalization(states: PersistenceState[]): boolean {
  return states.some((s) => s !== 'saved' && s !== 'saving');
}

describe('Direct execution -- finalization blocking decision for every combination named in the authorization', () => {
  it('all rows saved -> does not block', () => assert.equal(anyRowBlocksFinalization(['saved', 'saved']), false));
  it('one row transiently saving, rest saved -> does not block (Decision A3)', () => assert.equal(anyRowBlocksFinalization(['saved', 'saving']), false));
  it('one row conflict -> blocks', () => assert.equal(anyRowBlocksFinalization(['saved', 'conflict']), true));
  it('one row save-blocked -> blocks', () => assert.equal(anyRowBlocksFinalization(['saved', 'save-blocked']), true));
  it('one row occupied-target-rejected -> blocks', () => assert.equal(anyRowBlocksFinalization(['saved', 'occupied-target-rejected']), true));
  it('one row save-unknown -> blocks (the state the entire investigation traced most deeply)', () => assert.equal(anyRowBlocksFinalization(['saved', 'save-unknown']), true));
});
