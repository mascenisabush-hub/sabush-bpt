// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 item 9, Stage 8] PA-08 persistence-state derivation.
//
// Pure, presentation-layer logic — computes a row's or a group's
// current persistence status from signals the rest of the codebase
// already produces (server-confirmed state, an in-flight save, an
// unsaved local edit, a save error, and the two Phase 2-specific
// blocking conditions). Deliberately decoupled from HOW those signals
// are currently tracked in PeriodicStockCountView.tsx: today,
// `rowHasUnsavedLocalEditRef` and `manualRetryEligibleRowsRef` are
// plain `useRef`s, not reactive state, so a caller wiring this
// function into genuinely live, re-rendering UI needs those converted
// to `useState` first — a separate, deliberately deferred follow-on,
// not part of this stage. This file's own correctness does not depend
// on that conversion; it is fully testable against explicit inputs
// today.

export type PeriodicRowPersistenceState =
  | 'saved'
  | 'saving'
  | 'occupied-target-rejected'
  | 'save-unknown'
  | 'conflict'
  | 'save-blocked';

export interface PeriodicRowPersistenceInputs {
  /** The row's own server-confirmed `state` field, once persisted.
   * `undefined` means never yet successfully saved to the server. */
  serverState?: 'ACCEPTED' | 'CONFLICT';
  /** True if this row has an edit that has not yet been confirmed
   * persisted (the local, in-memory value may differ from the last
   * known server value). */
  hasUnsavedLocalEdit: boolean;
  /** True if a save request for this row is currently in flight. */
  isCurrentlySaving: boolean;
  /** Present if the row's most recent save attempt failed with an
   * error whose cause is not otherwise more specifically classified
   * below (e.g. a network failure, or an unclassified rejection). */
  saveError?: string;
  /** True if the row's most recent save attempt failed specifically
   * because its destination key was occupied by unrelated data (the
   * Phase 2 stable-identity collision case) — a more specific failure
   * than a generic saveError, surfaced separately per PA-08's own
   * named state. */
  isOccupiedTargetRejection?: boolean;
  /** True if this row is currently blocked pending manual review
   * (e.g. `migration-ambiguous`/`delete-target-ambiguous`, or any
   * other fail-closed condition this architecture defines) — distinct
   * from an ordinary save failure, since no retry can resolve it
   * without human intervention. */
  isBlockedPendingReview?: boolean;
}

/**
 * Derives a single row's persistence state from its current signals.
 * Precedence, most severe first: a blocked/ambiguous state always
 * wins (nothing else matters until a human resolves it); then a
 * genuine server-confirmed conflict; then the two more specific
 * failure classifications; then an in-flight or pending save; finally
 * the ordinary confirmed-saved case.
 */
export function derivePeriodicRowPersistenceState(
  inputs: PeriodicRowPersistenceInputs
): PeriodicRowPersistenceState {
  if (inputs.isBlockedPendingReview) return 'save-blocked';
  if (inputs.serverState === 'CONFLICT') return 'conflict';
  if (inputs.isOccupiedTargetRejection) return 'occupied-target-rejected';
  if (inputs.saveError) return 'save-unknown';
  if (inputs.isCurrentlySaving) return 'saving';
  if (inputs.hasUnsavedLocalEdit) return 'saving';
  return 'saved';
}

// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 item 9, Stage 8] Group-level precedence, exactly as specified:
// Conflict > Save-blocked > Save-unknown > Saving > Saved. The
// specification did not explicitly place `occupied-target-rejected`
// in this five-item chain — reasonably interpreted here, and
// documented as an interpretation rather than silently assumed, as a
// row-level failure requiring intervention, placed alongside
// `save-blocked` (both mean "this specific row cannot proceed without
// action," ranked just below a genuine conflict).
const GROUP_STATE_PRECEDENCE: PeriodicRowPersistenceState[] = [
  'conflict',
  'save-blocked',
  'occupied-target-rejected',
  'save-unknown',
  'saving',
  'saved',
];

/**
 * Derives a displayed product group's persistence state as the single
 * worst state among its member rows/portions — if any member is
 * unresolved, the group visibly reflects that, never silently hiding
 * a failed/unknown member behind other successfully-saved portions.
 */
export function deriveGroupPersistenceState(
  memberStates: PeriodicRowPersistenceState[]
): PeriodicRowPersistenceState {
  if (memberStates.length === 0) return 'saved';
  for (const candidate of GROUP_STATE_PRECEDENCE) {
    if (memberStates.includes(candidate)) return candidate;
  }
  return 'saved';
}
