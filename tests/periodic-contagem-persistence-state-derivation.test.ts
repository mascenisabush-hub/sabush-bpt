// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 item 9, Stage 8] Regression coverage for
// derivePeriodicRowPersistenceState and deriveGroupPersistenceState.
// Direct-import, behavioral testing — both functions are pure, with
// no Firestore dependency.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePeriodicRowPersistenceState,
  deriveGroupPersistenceState,
} from '../apps/tenant/src/lib/periodicContagemPersistenceState';

describe('derivePeriodicRowPersistenceState — per-row state', () => {
  it('Saved — server-confirmed, no pending edit, not saving, no error', () => {
    const state = derivePeriodicRowPersistenceState({
      serverState: 'ACCEPTED',
      hasUnsavedLocalEdit: false,
      isCurrentlySaving: false,
    });
    assert.equal(state, 'saved');
  });

  it('Saving — a save is currently in flight', () => {
    const state = derivePeriodicRowPersistenceState({
      hasUnsavedLocalEdit: true,
      isCurrentlySaving: true,
    });
    assert.equal(state, 'saving');
  });

  it('Saving — an unsaved local edit exists, even without an active in-flight request', () => {
    const state = derivePeriodicRowPersistenceState({
      hasUnsavedLocalEdit: true,
      isCurrentlySaving: false,
    });
    assert.equal(state, 'saving');
  });

  it('Save-unknown — a save error exists with no more specific classification', () => {
    const state = derivePeriodicRowPersistenceState({
      hasUnsavedLocalEdit: false,
      isCurrentlySaving: false,
      saveError: 'network timeout',
    });
    assert.equal(state, 'save-unknown');
  });

  it('Occupied-target-rejected — the more specific Phase 2 collision classification takes precedence over a generic saveError', () => {
    const state = derivePeriodicRowPersistenceState({
      hasUnsavedLocalEdit: false,
      isCurrentlySaving: false,
      saveError: 'generic message',
      isOccupiedTargetRejection: true,
    });
    assert.equal(state, 'occupied-target-rejected');
  });

  it('Conflict — a genuine server-confirmed CONFLICT state takes precedence over occupied-target-rejected and saveError', () => {
    const state = derivePeriodicRowPersistenceState({
      serverState: 'CONFLICT',
      hasUnsavedLocalEdit: false,
      isCurrentlySaving: false,
      saveError: 'irrelevant here',
      isOccupiedTargetRejection: true,
    });
    assert.equal(state, 'conflict');
  });

  it('Save-blocked — a blocked/ambiguous condition outranks everything else, including a genuine conflict', () => {
    const state = derivePeriodicRowPersistenceState({
      serverState: 'CONFLICT',
      hasUnsavedLocalEdit: true,
      isCurrentlySaving: true,
      saveError: 'irrelevant',
      isOccupiedTargetRejection: true,
      isBlockedPendingReview: true,
    });
    assert.equal(state, 'save-blocked', 'a blocked/ambiguous row must never be reported as merely conflicted or saving, since no retry can resolve it without review');
  });
});

describe('deriveGroupPersistenceState — worst-member-wins, deterministic precedence', () => {
  it('all members saved -> group saved', () => {
    assert.equal(deriveGroupPersistenceState(['saved', 'saved', 'saved']), 'saved');
  });

  it('Saved + Saving + Saved -> Saving (matches the worked example from the specification)', () => {
    assert.equal(deriveGroupPersistenceState(['saved', 'saving', 'saved']), 'saving');
  });

  it('Saved + Conflict + Saved -> Conflict (matches the worked example from the specification)', () => {
    assert.equal(deriveGroupPersistenceState(['saved', 'conflict', 'saved']), 'conflict');
  });

  it('a single unresolved member is never hidden by other successfully-saved members — Saved + Save-unknown + Saved -> Save-unknown', () => {
    assert.equal(deriveGroupPersistenceState(['saved', 'save-unknown', 'saved']), 'save-unknown');
  });

  it('conflict outranks save-blocked, per the specified precedence order', () => {
    assert.equal(deriveGroupPersistenceState(['save-blocked', 'conflict']), 'conflict');
  });

  it('save-blocked outranks save-unknown', () => {
    assert.equal(deriveGroupPersistenceState(['save-unknown', 'save-blocked']), 'save-blocked');
  });

  it('save-unknown outranks saving', () => {
    assert.equal(deriveGroupPersistenceState(['saving', 'save-unknown']), 'save-unknown');
  });

  it('saving outranks saved', () => {
    assert.equal(deriveGroupPersistenceState(['saved', 'saving']), 'saving');
  });

  it('an empty member list defaults to saved (a group with no rows is not itself unresolved)', () => {
    assert.equal(deriveGroupPersistenceState([]), 'saved');
  });

  it('occupied-target-rejected is included in the precedence chain, ranked alongside save-blocked per this file\'s own documented interpretation', () => {
    assert.equal(deriveGroupPersistenceState(['saved', 'occupied-target-rejected']), 'occupied-target-rejected');
    assert.equal(deriveGroupPersistenceState(['occupied-target-rejected', 'conflict']), 'conflict');
  });
});
