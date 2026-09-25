// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 items 10, 11, Stage 9] Durable edit-time recovery: a synchronous,
// per-row, browser-local snapshot captured at the moment of an edit —
// closing the gap between "the debounced Firestore save fires" and
// "the browser tears down before it completes," without becoming a
// second source of truth. Firestore remains authoritative throughout;
// this module never writes to Firestore, only to this browser's own
// localStorage, and only ever repopulates React state on the caller's
// side — the normal, already-protected save pipeline is the only path
// from a recovered value back to Firestore.
//
// localStorage, not IndexedDB, deliberately: this engagement's own
// investigation established that IndexedDB's asynchronous API offers
// no guarantee of completing before a genuine page teardown — the
// same race this whole mechanism exists to close. localStorage is the
// one browser storage API that writes synchronously, which is the
// one property that actually matters here.

export interface PeriodicRecoverySnapshotContent {
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
}

export interface PeriodicRecoverySnapshot {
  savedAt: string; // ISO string, when this snapshot was captured
  baseRev: number; // the server rev this edit was based on, at capture time
  content: PeriodicRecoverySnapshotContent;
}

const KEY_PREFIX = 'contagem-pending:';

function recoveryKey(businessId: string, rowKey: string): string {
  return `${KEY_PREFIX}${businessId}:periodic:${rowKey}`;
}

/**
 * Synchronously writes a per-row recovery snapshot. Intended call
 * site: the same point every edit already passes through before its
 * debounced Firestore save is scheduled (scheduleRowDraftSave in
 * PeriodicStockCountView.tsx) — see that function's own wiring,
 * separately verified. Wrapped in try/catch by the caller; this
 * function itself throws on failure (e.g. quota exceeded, storage
 * disabled) rather than silently swallowing it, so a caller can decide
 * how to react.
 */
export function writePeriodicRecoverySnapshot(
  businessId: string,
  rowKey: string,
  snapshot: PeriodicRecoverySnapshot
): void {
  window.localStorage.setItem(recoveryKey(businessId, rowKey), JSON.stringify(snapshot));
}

/**
 * Reads one row's recovery snapshot, if any. Returns null if absent
 * or malformed (a malformed snapshot is treated identically to no
 * snapshot at all — the conservative, fail-closed default; never
 * partially trusted).
 */
export function readPeriodicRecoverySnapshot(
  businessId: string,
  rowKey: string
): PeriodicRecoverySnapshot | null {
  const raw = window.localStorage.getItem(recoveryKey(businessId, rowKey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.savedAt !== 'string' ||
      typeof parsed?.baseRev !== 'number' ||
      typeof parsed?.content?.productName !== 'string' ||
      typeof parsed?.content?.quantity !== 'string' ||
      typeof parsed?.content?.unit !== 'string' ||
      typeof parsed?.content?.costPrice !== 'string' ||
      typeof parsed?.content?.sellingPrice !== 'string'
    ) {
      return null;
    }
    return parsed as PeriodicRecoverySnapshot;
  } catch {
    return null;
  }
}

/** Clears one row's recovery snapshot — called once its Firestore save is confirmed. */
export function clearPeriodicRecoverySnapshot(businessId: string, rowKey: string): void {
  window.localStorage.removeItem(recoveryKey(businessId, rowKey));
}

/**
 * Lists every recovery-snapshot key currently stored for one business's
 * periodic draft, without assuming which specific row keys exist —
 * needed at resume time to discover candidates before reconciling
 * each one individually.
 */
export function listPeriodicRecoveryRowKeys(businessId: string): string[] {
  const prefix = `${KEY_PREFIX}${businessId}:periodic:`;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keys.push(key.slice(prefix.length));
    }
  }
  return keys;
}

// ------------------------------------------------------------------
// Reconciliation — the four-case contract, exact.
// ------------------------------------------------------------------

export type PeriodicRecoveryReconciliation =
  | { outcome: 'unacknowledged'; snapshot: PeriodicRecoverySnapshot }
  | { outcome: 'already-synced' }
  | { outcome: 'diverged'; snapshot: PeriodicRecoverySnapshot }
  | { outcome: 'fail-closed'; snapshot: PeriodicRecoverySnapshot };

export interface PeriodicServerRowState {
  exists: boolean;
  rev?: number;
  content?: PeriodicRecoverySnapshotContent;
}

/**
 * Reconciles one row's local recovery snapshot against its current,
 * authoritative server state. Never automatically chooses between
 * conflicting local and server states — case 3 and case 4 both
 * preserve the snapshot and require editor review rather than
 * resolving anything silently.
 *
 * Case 1 — baseRev === server rev: nothing has advanced since this
 *   edit began; the server does not yet have it. Unacknowledged,
 *   genuinely eligible for review/re-entry.
 * Case 2 — server rev advanced AND all five content fields match:
 *   this exact edit already reached the server via some other path
 *   (e.g. the client never received its own success acknowledgement
 *   before teardown, but the write itself committed). Cleared
 *   silently — comparing only the five content fields, deliberately
 *   ignoring metadata (rev, state, writer, timestamps, conflict) so a
 *   legitimate write whose only change was metadata is never mistaken
 *   for a conflict.
 * Case 3 — server rev advanced AND any content field differs:
 *   something else changed this row. Never overwritten automatically;
 *   preserved for explicit review.
 * Case 4 — the row no longer exists server-side, or its state cannot
 *   otherwise be safely established: fails closed, preserved for
 *   review.
 */
export function reconcilePeriodicRecoverySnapshot(
  snapshot: PeriodicRecoverySnapshot,
  serverState: PeriodicServerRowState
): PeriodicRecoveryReconciliation {
  if (!serverState.exists || serverState.rev === undefined || !serverState.content) {
    return { outcome: 'fail-closed', snapshot };
  }
  if (serverState.rev === snapshot.baseRev) {
    return { outcome: 'unacknowledged', snapshot };
  }
  // serverState.rev !== snapshot.baseRev — something has advanced.
  const contentMatches =
    serverState.content.productName === snapshot.content.productName &&
    serverState.content.quantity === snapshot.content.quantity &&
    serverState.content.unit === snapshot.content.unit &&
    serverState.content.costPrice === snapshot.content.costPrice &&
    serverState.content.sellingPrice === snapshot.content.sellingPrice;
  if (contentMatches) {
    return { outcome: 'already-synced' };
  }
  return { outcome: 'diverged', snapshot };
}
