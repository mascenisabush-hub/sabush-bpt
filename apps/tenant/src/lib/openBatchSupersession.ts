// [Fix #10] Transactional open-batch supersession — pure decision logic.
//
// PROBLEM: docs/specs/05-stock-batches.md already establishes "only one
// batch per product can be 'open' at a time; the moment a new Stock Batch
// is entered for a product, every previously-open batch for that same
// product is automatically closed." addStockBatch previously enforced
// this from client-side React state (a read → check → write sequence),
// so two concurrent calls for the same product could both observe "no
// open batch" and both leave their own batch open, producing two
// simultaneously-open batches for one product.
//
// FIX: addStockBatch now runs inside a Firestore runTransaction, anchored
// on a per-product `openBatchLocks/{productId}` document — a
// concurrency-control mechanism, not business data; it exists solely to
// give every transaction for the same product a concrete document to
// read and write, since the Firebase Web SDK's Transaction.get() has no
// Query overload (only DocumentReference), so "find all open batches for
// this product" cannot be read transactionally via a query. Because
// Firestore's transaction conflict detection is based on every path a
// transaction reads — including a read that finds nothing there yet —
// two transactions for the same product are serialized by this lock path
// even on that product's very first-ever write, before either has
// created the lock document. The real residual gap is narrower and
// different in kind: a legacy product with a pre-fix open batch but no
// lock doc yet relies on a client-state hint to find that legacy batch;
// if that hint is missing/stale, the legacy batch can be left open as an
// orphan (a one-time data-cleanup risk), not a live-concurrency race —
// see AppContext.tsx addStockBatch for the full reasoning.
//
// These are the pure, dependency-free functions extracted from that
// transaction body so the actual decision logic — which batch ids to
// check, and which of the checked batches must be closed — can be unit
// tested directly against plain objects, the same way shopSwitchGuard.ts
// (Fix #9) is tested, without a live Firestore client or emulator.

/**
 * Determines which specific batch document ids the transaction must
 * tx.get() (and therefore include in its read-before-write set) before
 * deciding what to close.
 *
 * `lockOpenBatchId` is the pointer read from the (already-fetched)
 * `openBatchLocks/{productId}` document — the authoritative source once
 * that document exists. `candidateOpenBatchIds` is a client-state HINT
 * (from AppContext's live, unfiltered `batches` onSnapshot listener),
 * used only as a bootstrap fallback for a product that has never been
 * through this transaction before (no lock doc yet, e.g. legacy data
 * predating this fix) — it is never trusted for the actual open/closed
 * decision, only for "which documents to check." Once a lock doc exists
 * for a product, the candidate list is ignored entirely: the lock is the
 * sole authority from that point forward.
 */
export function computeBatchIdsToCheck(
  lockExists: boolean,
  lockOpenBatchId: string | null,
  candidateOpenBatchIds: string[],
): string[] {
  const ids = new Set<string>();
  if (lockOpenBatchId) ids.add(lockOpenBatchId);
  if (!lockExists) {
    candidateOpenBatchIds.forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

/** The minimal shape of a transactionally-fetched batch snapshot needed to decide whether it must be closed. */
export interface CheckedBatchSnapshot {
  id: string;
  exists: boolean;
  status: string | undefined;
}

/**
 * The actual write-plan: given the FRESH (transactionally-read) status of
 * every batch id from computeBatchIdsToCheck, returns exactly the ids
 * that are genuinely still `'open'` and must be closed. A batch id that
 * no longer exists, or was already closed by the time this transaction's
 * read landed (e.g. closed by a concurrent transaction that committed
 * first, which this transaction's own retry will have re-read), is
 * correctly excluded — never double-closed, never a no-op write.
 */
export function computeBatchesToClose(checkedBatches: CheckedBatchSnapshot[]): string[] {
  return checkedBatches.filter((b) => b.exists && b.status === 'open').map((b) => b.id);
}
