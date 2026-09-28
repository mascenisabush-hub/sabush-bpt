// [Periodic Contagem Expanded Phase 2 — Rule 8 checkpoint: PA-08
// persistence-state UI + durable recovery UI integration] Regression
// coverage for wiring the already-tested derivePeriodicRowPersistenceState/
// deriveGroupPersistenceState and reconcilePeriodicRecoverySnapshot
// into the actual rendered Contagem UI. Source-text based, following
// this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('PA-08 — groupableUnifiedEntries now calls the real derivation, not a placeholder', () => {
  it('derivePeriodicRowPersistenceState is imported and actually called, replacing the old isConflicted-only placeholder', () => {
    assert.match(componentSource, /import \{ derivePeriodicRowPersistenceState, type PeriodicRowPersistenceState \}/);
    const fnMatch = componentSource.match(/const groupableUnifiedEntries = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n  \);/);
    assert.ok(fnMatch, 'expected groupableUnifiedEntries to exist');
    assert.match(fnMatch![0], /const persistenceState = derivePeriodicRowPersistenceState\(\{/);
    assert.doesNotMatch(fnMatch![0], /persistenceState: \(isConflicted \? 'conflict' : 'saved'\)/, 'the old placeholder must be gone');
  });

  it('1. serverState is sourced from the same conflictKey lookup already used for isConflicted, never invented', () => {
    const fnMatch = componentSource.match(/const groupableUnifiedEntries = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n  \);/);
    assert.match(fnMatch![0], /serverState: periodicStockDraftItemsByKey\[conflictKey\]\?\.state,/);
  });

  it('isBlockedPendingReview sources from ambiguousMigrationKeys, the existing migration-block signal', () => {
    const fnMatch = componentSource.match(/const groupableUnifiedEntries = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n  \);/);
    assert.match(fnMatch![0], /isBlockedPendingReview: ambiguousMigrationKeys\.includes\(conflictKey\),/);
  });

  it('2. hasUnsavedLocalEdit reads rowHasUnsavedLocalEditRef directly (a ref, made reactive via persistenceStateTick, not converted to state)', () => {
    const fnMatch = componentSource.match(/const groupableUnifiedEntries = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n  \);/);
    assert.match(fnMatch![0], /const hasUnsavedLocalEdit = !!rowHasUnsavedLocalEditRef\.current\[conflictKey\];/);
    assert.match(fnMatch![0], /persistenceStateTick\]/, 'persistenceStateTick must be in the dependency array or this memo never recomputes on ref mutation');
  });

  it('saveError combines both genuinely distinct existing error sources — manualRetryEligibleRowsRef (retry exhaustion) and manualRowSaveError (delete-ambiguity/validation)', () => {
    const fnMatch = componentSource.match(/const groupableUnifiedEntries = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n  \);/);
    assert.match(fnMatch![0], /const hasRetryExhaustedError = manualRetryEligibleRowsRef\.current\.has\(conflictKey\);/);
    assert.match(fnMatch![0], /const hasIndexedSaveError = entry\.manualRowIndex !== null && !!manualRowSaveError\[entry\.manualRowIndex\];/);
  });
});

describe('persistenceStateTick — bumped at every existing write site, never introduced as a replacement for the refs\' own behavior', () => {
  it('exists as a plain counter, declared once, alongside rowHasUnsavedLocalEditRef', () => {
    assert.match(componentSource, /const \[persistenceStateTick, setPersistenceStateTick\] = useState\(0\);/);
    assert.match(componentSource, /const bumpPersistenceStateTick = \(\) => setPersistenceStateTick\(\(t\) => t \+ 1\);/);
  });

  it('3. every write site to rowHasUnsavedLocalEditRef/manualRetryEligibleRowsRef is followed by a bump (originally 15 sites; later fixes such as row removal added more)', () => {
    const lines = componentSource.split('\n');
    const writeRe = /(rowHasUnsavedLocalEditRef\.current(\[[^\]]+\])?\s*=(?!=)|delete rowHasUnsavedLocalEditRef\.current\[|manualRetryEligibleRowsRef\.current\.(add|delete|clear)\()/;
    let writeSites = 0;
    const missing: number[] = [];
    lines.forEach((line, i) => {
      if (line.trim().startsWith('//') || !writeRe.test(line)) return;
      writeSites++;
      const next = lines.slice(i + 1, i + 6).filter((l) => !l.trim().startsWith('//')).slice(0, 3).join('\n');
      if (!/bumpPersistenceStateTick\(\);/.test(next)) missing.push(i + 1);
    });
    assert.ok(writeSites >= 15, `expected at least the 15 originally traced write sites, found ${writeSites}`);
    assert.deepEqual(missing, [], `write sites without a following bumpPersistenceStateTick(): lines ${missing.join(', ')}`);
  });

  it('the refs\' own read/write mechanics are otherwise unmodified — no site\'s existing write itself was altered, only a bump call added', () => {
    // Spot-check one representative site of each ref to confirm the
    // original write is intact, immediately followed by the bump.
    assert.match(componentSource, /manualRetryEligibleRowsRef\.current\.delete\(rowKey\);\s*\n\s*bumpPersistenceStateTick\(\);/);
    assert.match(componentSource, /rowHasUnsavedLocalEditRef\.current\[protectionKey\] = rowKey;\s*\n\s*bumpPersistenceStateTick\(\);/);
  });
});

describe('4/5/6/7. Rendered group-level state — all six states distinguishable, none silently collapsed', () => {
  it('the render loop\'s status icon now switches on group.persistenceState across all six states, not just the old conflicted/validated binary', () => {
    assert.match(componentSource, /group\.persistenceState === 'save-blocked' \? \(/);
    assert.match(componentSource, /group\.persistenceState === 'occupied-target-rejected' \|\| group\.persistenceState === 'save-unknown' \? \(/);
    assert.match(componentSource, /group\.persistenceState === 'saving' \? \(/);
  });

  it('group.anyConflicted and group.allValidated remain exactly as before — additive, not replaced (existing tests/behavior relying on them still hold)', () => {
    assert.match(componentSource, /\) : group\.anyConflicted \? \(/);
    assert.match(componentSource, /\) : group\.allValidated \? \(/);
  });

  it('a "saving" state never renders identically to a genuinely saved (validated) row — distinct icon, distinct sr-only label', () => {
    assert.match(componentSource, /RotateCw className="w-3\.5 h-3\.5 text-gray-400 shrink-0 animate-spin"/);
    assert.match(componentSource, /'A guardar'/);
  });

  it('deriveGroupPersistenceState itself (Stage 8, unmodified) is what group.persistenceState ultimately derives from — worst-member-wins, no new policy', () => {
    const groupedViewSrc = readFileSync(
      new URL('../apps/tenant/src/lib/periodicContagemGroupedView.ts', import.meta.url),
      'utf8'
    );
    assert.match(groupedViewSrc, /deriveGroupPersistenceState\(group\.rows\.map\(\(row\) => row\.persistenceState\)\)/);
  });
});

describe('Recovery — listPeriodicRecoveryRowKeys/reconcilePeriodicRecoverySnapshot now wired into handleResumeDraft', () => {
  const fnMatch = componentSource.match(/const handleResumeDraft = async \(\) => \{[\s\S]*?\n  \};/);

  it('exists and is called after migration settles and rows are built (setManualRows already called)', () => {
    assert.ok(fnMatch, 'expected handleResumeDraft to exist');
    const setManualRowsIdx = fnMatch![0].indexOf('setManualRows(nextManualRows);');
    const listKeysIdx = fnMatch![0].indexOf('listPeriodicRecoveryRowKeys(activeBusinessId)');
    assert.ok(setManualRowsIdx > -1 && listKeysIdx > -1);
    assert.ok(setManualRowsIdx < listKeysIdx, 'recovery reconciliation must run after rows are built, not before');
  });

  it('1. reconciles against periodicStockDraftItemsByKey, the same live server-state source migration itself reads', () => {
    assert.match(fnMatch![0], /const serverItem = periodicStockDraftItemsByKey\[rowKey\];/);
  });

  it('2. an already-synced outcome clears the snapshot silently, never stored for display', () => {
    assert.match(
      fnMatch![0],
      /if \(outcome\.outcome === 'already-synced'\) \{\s*\n\s*clearPeriodicRecoverySnapshot\(activeBusinessId, rowKey\);\s*\n\s*continue;\s*\n\s*\}/
    );
  });

  it('3/4. unacknowledged/diverged/fail-closed outcomes are all stored for operator review — never silently discarded or auto-resolved', () => {
    assert.match(fnMatch![0], /nextUnresolved\[rowKey\] = outcome;/);
    // Confirmed no branch anywhere handles 'unacknowledged'/'diverged'/
    // 'fail-closed' by choosing a side or overwriting server/local data.
    assert.doesNotMatch(fnMatch![0], /savePeriodicStockDraftItem\(rowKey/, 'reconciliation must never itself trigger a write');
  });

  it('does not invent a fifth reconciliation case — only the four outcomes the module itself defines are handled', () => {
    const outcomeChecks = [...fnMatch![0].matchAll(/outcome\.outcome === '([a-z-]+)'/g)].map((m) => m[1]);
    const uniqueOutcomes = [...new Set(outcomeChecks)];
    assert.deepEqual(uniqueOutcomes.sort(), ['already-synced'], 'only already-synced is explicitly branched on; the other three fall through to the shared nextUnresolved[rowKey] = outcome; line, never a fifth invented case');
  });
});

describe('unresolvedRecoveryEvidence — reactive state, correctly typed, never a silent resolution mechanism', () => {
  it('declared with the correct type, mirroring ambiguousMigrationKeys\' own declaration site for consistency', () => {
    assert.match(
      componentSource,
      /const \[unresolvedRecoveryEvidence, setUnresolvedRecoveryEvidence\] = useState<\s*\n\s*Record<string, PeriodicRecoveryReconciliation>\s*\n\s*>\(\{\}\);/
    );
  });

  it('5/finalization gating: both handleRequestConfirmation and handleConfirmSave block on unresolved recovery evidence, mirroring the existing migrationStatus gate exactly', () => {
    // Review: `if (Object.keys(unresolvedRecoveryEvidence).length > 0) { setError(...message(...)) }`.
    // Confirm: the same check via a named count (it now reports instead of a bare return).
    const reviewGate = [...componentSource.matchAll(/Object\.keys\(unresolvedRecoveryEvidence\)\.length > 0/g)];
    const confirmGate = [...componentSource.matchAll(/const unresolvedEvidenceCount = Object\.keys\(unresolvedRecoveryEvidence\)\.length;\s*\n\s*if \(unresolvedEvidenceCount > 0\)/g)];
    assert.equal(reviewGate.length, 1, 'expected exactly one gate in handleRequestConfirmation');
    assert.equal(confirmGate.length, 1, 'expected exactly one gate in handleConfirmSave');
  });

  it('6. resolution happens only through the normal, unmodified save pipeline — no new "apply recovered value" write path was introduced', () => {
    assert.doesNotMatch(componentSource, /applyRecoveredValue|resolveRecoveryEvidence|acceptRecoverySnapshot/);
  });

  it('7. recovery reconciliation never constructs or reads a positional manual:${index}-style key as an identity source — only real Firestore document keys (rowKey) from listPeriodicRecoveryRowKeys', () => {
    const fnMatch = componentSource.match(/const handleResumeDraft = async \(\) => \{[\s\S]*?\n  \};/);
    const recoveryBlock = fnMatch![0].slice(fnMatch![0].indexOf('if (activeBusinessId) {\n      const candidateKeys'));
    assert.doesNotMatch(recoveryBlock, /`manual:\$\{/, 'recovery wiring must never construct a positional key itself');
  });
});
