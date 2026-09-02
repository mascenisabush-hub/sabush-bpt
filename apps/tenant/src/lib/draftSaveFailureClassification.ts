// [Decision 41C — Draft Save Failure Classification + Bounded Retries;
// Implementation Plan §13; signed Stage 8 Implementation Authorization]
//
// Narrow, dependency-free classification helper for the Periodic Stock
// Count and Initial Stock draft autosave systems. This module owns ONLY
// the governed classification rules and the governed retry-timing
// constants — it is deliberately not a generic error-handling framework
// (§13's own explicit boundary), and does not itself touch Firestore,
// React state, or timers. Callers (PeriodicStockCountView.tsx,
// InitialStockCountView.tsx) own scheduling, per-row ownership, and UI
// state transitions.

/**
 * The four governed draft-save outcomes (§1). 'confirmed-success' is
 * intentionally not modeled here — a successful save never reaches this
 * classifier at all; only rejected save attempts do.
 */
export type DraftSaveErrorClassification = 'transient' | 'save-blocked' | 'save-unknown';

export interface ClassifyDraftSaveErrorOptions {
  /** The business's current subscription-blocking flag (§1C). */
  subscriptionBlocksNewRecords: boolean;
}

// §1B — the exact governed set of transient Firestore error codes.
const TRANSIENT_FIRESTORE_CODES = new Set<string>([
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'cancelled',
]);

/**
 * [§13] Marker thrown by a draft-save function when its write may have
 * already reached Firestore but the subsequent `getDocFromServer`
 * readback itself failed (§2). Wrapping the underlying error rather
 * than discarding it preserves the original Firestore error code for
 * logging/debugging, while `isReadbackUnconfirmed` is the one signal
 * `classifyDraftSaveError` needs to route this — unconditionally — to
 * `save-unknown`, never to automatic transient retry, even when the
 * underlying code happens to also be a transient write code (e.g.
 * `unavailable`).
 */
export class ReadbackUnconfirmedError extends Error {
  readonly isReadbackUnconfirmed = true as const;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(cause: unknown) {
    super('Draft save could not be confirmed: the write may have reached the server, but the readback failed.');
    this.name = 'ReadbackUnconfirmedError';
    this.cause = cause;
    const maybeCode = cause && typeof cause === 'object' && 'code' in cause ? (cause as { code?: unknown }).code : undefined;
    if (typeof maybeCode === 'string') {
      this.code = maybeCode;
    }
  }
}

export function isReadbackUnconfirmedError(error: unknown): error is ReadbackUnconfirmedError {
  return !!error && typeof error === 'object' && (error as { isReadbackUnconfirmed?: unknown }).isReadbackUnconfirmed === true;
}

function extractFirestoreCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/**
 * [§1, §2] Classifies a rejected draft-save attempt into one of the
 * three non-success governed outcomes. Readback-unconfirmed results are
 * checked FIRST, before any error-code branching, so they are always
 * `save-unknown` regardless of the underlying code (§2: "do not
 * classify it as confirmed success" / "do not automatically retry it as
 * a transient write failure").
 */
export function classifyDraftSaveError(
  error: unknown,
  options: ClassifyDraftSaveErrorOptions
): DraftSaveErrorClassification {
  if (isReadbackUnconfirmedError(error)) {
    return 'save-unknown';
  }

  const code = extractFirestoreCode(error);

  if (code && TRANSIENT_FIRESTORE_CODES.has(code)) {
    return 'transient';
  }

  if (code === 'permission-denied') {
    // [§1C — "This is NOT a generic permission failure"] Only a
    // permission-denied that co-occurs with the business's own
    // subscription-blocking flag is a legitimate, non-retryable
    // subscription block. Every other permission-denied is unknown.
    return options.subscriptionBlocksNewRecords ? 'save-blocked' : 'save-unknown';
  }

  // Any unrecognized Firestore code, or any non-Firestore exception.
  return 'save-unknown';
}

// §3 — the exact governed bounded-retry sequence: 1s, 2s, 4s after
// attempts 1, 2, and 3 respectively fail. Index 0 is the delay before
// attempt 2, index 1 before attempt 3, index 2 before attempt 4.
export const DRAFT_SAVE_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000];

// 1 initial attempt + 3 automatic retries.
export const DRAFT_SAVE_MAX_ATTEMPTS = 1 + DRAFT_SAVE_RETRY_DELAYS_MS.length;

/**
 * Given the attempt number that just failed (1-based; attempt 1 is the
 * initial, non-retry attempt), returns the delay in ms before the next
 * automatic attempt, or `null` if retries are exhausted (§3: "After the
 * third retry fails: stop automatic retries").
 */
export function nextRetryDelayMs(failedAttemptNumber: number): number | null {
  if (failedAttemptNumber >= DRAFT_SAVE_MAX_ATTEMPTS) return null;
  return DRAFT_SAVE_RETRY_DELAYS_MS[failedAttemptNumber - 1] ?? null;
}
