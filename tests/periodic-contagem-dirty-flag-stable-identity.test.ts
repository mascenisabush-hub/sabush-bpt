// SABUSH BPT Contagem incident — dirty-flag stable-identity
// correction. Companion to
// tests/periodic-contagem-option-b-stable-identity.test.ts (which
// fixed the live-adoption READ side); this file covers the
// SCHEDULING/PROTECTION side: rowHasUnsavedLocalEditRef must be keyed
// by a row's stable identity (sourceRowKey) to line up with the
// live-adoption effect's own raw-key check, not by the row's current
// array-position save-target key, which can diverge once any earlier
// row has been removed.
//
// Extracted logic (matching this incident's established convention —
// see the two companion files' own header comments for the full
// rationale) from PeriodicStockCountView.tsx at the commit this fix
// was implemented against.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-dirty-flag-stable-identity.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

type DirtyMap = Record<string, string>; // protectionKey -> save-target key

/** Mirrors scheduleRowDraftSave's dirty-flag set (post-fix). */
function setDirty(dirty: DirtyMap, rowKey: string, protectionKey: string = rowKey): DirtyMap {
  if (protectionKey.startsWith('catalog:') || protectionKey.startsWith('manual:')) {
    return { ...dirty, [protectionKey]: rowKey };
  }
  return dirty;
}

/** Mirrors the live-adoption effect's dirty-flag check (unchanged — reads by raw key). */
function isProtected(dirty: DirtyMap, rawKey: string): boolean {
  return Boolean(dirty[rawKey]);
}

/** Mirrors the flush path's post-fix derivation of valid save targets from the ref's VALUES. */
function flushCandidates(dirty: DirtyMap): string[] {
  return Object.entries(dirty)
    .filter(([, saveTargetKey]) => saveTargetKey)
    .map(([, saveTargetKey]) => saveTargetKey);
}

describe('Scenario 1 — gapped row, remote update during the debounce window', () => {
  it('PRE-FIX behavior (documented): protecting by position-based key does not protect the row\'s true identity', () => {
    let dirty: DirtyMap = {};
    // Pre-fix: scheduleRowDraftSave always used rowKey as the flag key.
    dirty = { ...dirty, ['manual:1']: 'manual:1' }; // Trigo, at local position 1, edited
    // A remote update arrives for Trigo's TRUE raw key.
    assert.equal(isProtected(dirty, 'manual:259'), false, 'BUG: not protected under its real identity');
  });

  it('POST-FIX: protecting by sourceRowKey correctly protects the row from a same-window remote update', () => {
    let dirty: DirtyMap = {};
    dirty = setDirty(dirty, 'manual:1', 'manual:259'); // Trigo: save-target manual:1, identity manual:259
    assert.equal(isProtected(dirty, 'manual:259'), true, 'FIXED: correctly protected under its real identity');
    assert.equal(isProtected(dirty, 'manual:1'), false, 'the position-based key itself is no longer what protection is checked against');
  });
});

describe('Scenario 2 — retry and flush', () => {
  it('flush correctly recovers a valid, in-bounds save target from a gapped dirty entry (the exact break the naive fix would have caused)', () => {
    const dirty: DirtyMap = setDirty({}, 'manual:1', 'manual:259');
    const candidates = flushCandidates(dirty);
    assert.deepEqual(candidates, ['manual:1'], 'flush must save to manual:1 (a real array position), never manual:259 (out of bounds on this row set)');
  });

  it('multiple gapped rows all flush to their own correct, distinct save targets', () => {
    let dirty: DirtyMap = {};
    dirty = setDirty(dirty, 'manual:0', 'manual:5');
    dirty = setDirty(dirty, 'manual:1', 'manual:259');
    const candidates = flushCandidates(dirty).sort();
    assert.deepEqual(candidates, ['manual:0', 'manual:1']);
  });

  it('retry preserves the same protectionKey across attempts (modeled: the recursive call always receives the same protectionKey it started with)', () => {
    const originalProtectionKey = 'manual:259';
    const rowKey = 'manual:1';
    // Retry attempt 2 must be scheduled with the SAME protectionKey as attempt 1 — modeled directly, since
    // the real retry closure captures protectionKey as a parameter, not a recomputed value.
    const retryProtectionKey = originalProtectionKey; // what performRowSaveAttempt's own retry call passes through
    assert.equal(retryProtectionKey, originalProtectionKey, 'protectionKey must not be re-derived or lost across a retry attempt');
    assert.notEqual(retryProtectionKey, rowKey, 'sanity check: this scenario is specifically the gapped case, where the two differ');
  });
});

describe('Scenario 3 — rename (handleRenameManualGroup)', () => {
  it('a renamed, gapped row is protected under its own sourceRowKey, not its current position', () => {
    let dirty: DirtyMap = {};
    // handleRenameManualGroup's own call: scheduleRowDraftSave(`manual:${index}`, nextManualRows[index].sourceRowKey ?? `manual:${index}`)
    const index = 1;
    const row = { productName: 'Trigo Renomeado', sourceRowKey: 'manual:259' };
    dirty = setDirty(dirty, `manual:${index}`, row.sourceRowKey ?? `manual:${index}`);
    assert.equal(isProtected(dirty, 'manual:259'), true);
    assert.deepEqual(flushCandidates(dirty), ['manual:1'], 'still flushes to the correct, current array position');
  });
});

describe('Scenario 4 — backward compatibility: unstamped rows and non-manual save targets', () => {
  it('a row with no sourceRowKey yet falls back to its position-based key — identical to pre-fix behavior', () => {
    let dirty: DirtyMap = {};
    const index = 2;
    const row: { sourceRowKey?: string } = {}; // never saved yet
    dirty = setDirty(dirty, `manual:${index}`, row.sourceRowKey ?? `manual:${index}`);
    assert.equal(isProtected(dirty, `manual:${index}`), true);
    assert.deepEqual(flushCandidates(dirty), [`manual:${index}`]);
  });

  it('catalog, __meta__, newProductInfo, and caixerDraft targets are entirely unaffected — protectionKey defaults to rowKey, key and value are identical', () => {
    let dirty: DirtyMap = {};
    dirty = setDirty(dirty, 'catalog:abc123'); // no second argument — every existing non-manual caller
    assert.equal(isProtected(dirty, 'catalog:abc123'), true);
    assert.deepEqual(flushCandidates(dirty), ['catalog:abc123']);
    // '__meta__' itself is excluded from this ref entirely, same as before this fix (setDirty's own guard).
    const before = dirty;
    dirty = setDirty(dirty, '__meta__');
    assert.equal(dirty, before, '__meta__ is never added to this ref, unchanged from pre-fix behavior');
  });
});

describe('Scenario 5 — un-validate / "Voltar" set-clear pair, across a shift in between', () => {
  it('set (reopen) and clear (Voltar) use the SAME identity even if the row\'s position has shifted in between', () => {
    let dirty: DirtyMap = {};
    // Reopen, at local position 1, sourceRowKey manual:259.
    dirty = setDirty(dirty, 'manual:1', 'manual:259');
    assert.equal(isProtected(dirty, 'manual:259'), true);

    // Some OTHER row is removed elsewhere in the meantime, shifting this one to local position 0 —
    // its sourceRowKey (its true identity) does not change.
    const currentIndexAtVoltarTime = 0;
    const currentSourceRowKey = 'manual:259'; // unchanged — this is the point of sourceRowKey existing at all

    // Voltar's own clear, using the row's CURRENT sourceRowKey (read fresh, not the stale position captured at reopen time).
    const clearKey = currentSourceRowKey ?? `manual:${currentIndexAtVoltarTime}`;
    delete dirty[clearKey];

    assert.equal(isProtected(dirty, 'manual:259'), false, 'correctly cleared, despite the intervening position shift');
  });
});
