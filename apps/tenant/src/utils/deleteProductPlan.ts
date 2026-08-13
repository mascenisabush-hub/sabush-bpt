// deleteProduct deletion planning — pure, zero dependencies (no Firestore,
// no React). Extracted from AppContext.tsx's deleteProduct() so the
// all-or-nothing / no-misleading-partial-state contract is directly
// unit-testable without a Firebase/DOM harness, which this repository does
// not otherwise have (see tests/initial-stock-confirmation.test.ts for the
// established precedent for this pattern).
//
// [Fix #7 — Destructive Operations Safety] Firestore's writeBatch has a
// hard 500-operation ceiling. deleteProduct deletes 1 product doc + N
// batch docs + M quebra docs. For the overwhelming majority of real
// businesses (1 + N + M <= 500) this planner returns a single chunk,
// which AppContext commits as one atomic writeBatch — true all-or-nothing,
// exactly as authorized.
//
// For the rare business whose product has accumulated more history than
// that (a long-lived, frequently-restocked or high-loss product), a
// single Firestore commit can never cover the whole deletion — that is a
// platform limit, not something client code can paper over. The
// invariant that must never be violated instead is: the product document
// is only ever deleted in the LAST chunk, after every batch/quebra chunk
// has already committed successfully. That guarantees a mid-cascade
// failure never leaves an orphaned batch/quebra counted toward Business
// Worth under a product that no longer exists (AppContext.tsx's
// calculateInventoryTotals sums ALL batches/quebras in state regardless
// of whether their product still exists — see Fix #7 investigation
// report) — the worst case is an incomplete-but-safe deletion (product
// still visible, some batches/quebras already gone, retry picks up where
// it left off), never a misleading one.
export const FIRESTORE_BATCH_OP_LIMIT = 500;

export type DeleteProductOp =
  | { kind: 'product'; id: string }
  | { kind: 'batch'; id: string }
  | { kind: 'quebra'; id: string };

/**
 * Splits the full deletion of one product (+ its batches + its quebras)
 * into one or more ordered chunks, each safe to commit as a single
 * Firestore writeBatch (<= FIRESTORE_BATCH_OP_LIMIT operations).
 *
 * - If everything fits in one chunk, that single chunk includes the
 *   product op alongside every batch/quebra op — one atomic commit.
 * - If it doesn't fit, every returned chunk except the last contains only
 *   batch/quebra ops; the LAST chunk contains the product op and nothing
 *   else. Callers MUST commit chunks in the returned order and MUST NOT
 *   commit a later chunk if an earlier one failed.
 */
export function planDeleteProduct(
  productId: string,
  batchIds: string[],
  quebraIds: string[],
  limit: number = FIRESTORE_BATCH_OP_LIMIT
): DeleteProductOp[][] {
  const historyOps: DeleteProductOp[] = [
    ...batchIds.map((id): DeleteProductOp => ({ kind: 'batch', id })),
    ...quebraIds.map((id): DeleteProductOp => ({ kind: 'quebra', id })),
  ];
  const productOp: DeleteProductOp = { kind: 'product', id: productId };

  const totalOps = historyOps.length + 1;
  if (totalOps <= limit) {
    return [[productOp, ...historyOps]];
  }

  const chunks: DeleteProductOp[][] = [];
  for (let i = 0; i < historyOps.length; i += limit) {
    chunks.push(historyOps.slice(i, i + limit));
  }
  chunks.push([productOp]);
  return chunks;
}
