// Supplier-Wording Recognition — Confirmation Transaction Decision Logic
// (Checkpoint 3 of the Implementation Authorization at
// docs/engineering/product-identity-alternative-name-implementation-authorization.md,
// signed 2026-08-19). Governing chain: BDR-0013, POL-0007,
// product-identity-alternative-name-specification.md, its Terminology
// Amendment, and the Rule 8 Assessment (Finding 13 — Concurrency /
// Idempotency).
//
// PROBLEM (Rule 8 Finding 13): confirming a supplier-wording relationship
// is a "claim a shared resource" operation — the shared resource being
// the (supplierRecordId, wording) pair. Two users could otherwise:
// (a) simultaneously confirm the same wording onto two DIFFERENT
//     products, silently creating the exact "two products claim one
//     wording" conflict state BDR-0013 item 5 exists to prevent the
//     system from causing on its own; or
// (b) double-write the SAME relationship twice (e.g. a retried request),
//     which must be idempotent, not a duplicate array entry.
//
// MECHANISM: the Implementation Authorization (§2, Finding 3) commits to
// NO new firestore.rules block and NO dedicated subcollection/lock
// document for this capability — the array-on-Product model (Finding 1)
// is authoritative. This means, unlike the open-batch lock pattern
// (openBatchSupersession.ts, a DEDICATED lock document this capability
// is not authorized to replicate), there is no separate resource
// document to anchor a transaction on. Instead, the transaction reads
// the TARGET product plus every other product that was shown to the
// owner as a candidate for the same wording ("conflict-check products")
// — fresh, inside the transaction, never from stale client state — and
// only proceeds if none of them independently already holds this exact
// (supplierRecordId, wording) relationship. This closes the race for
// every product the owner could plausibly have been choosing between
// (the actual candidate set); it does not, and cannot without a new
// collection this authorization forbids, catch a wording collision
// against a product that was never part of any candidate set at all
// (e.g. a genuinely brand-new product created by a different user in
// the same instant) — an explicitly acknowledged, narrower residual
// gap, analogous in kind to the pre-existing "duplicate product" race
// Finding 13's own evidence paragraph already documents as a
// pre-existing architectural characteristic, not introduced by this
// capability.
//
// These are pure, dependency-free functions extracted from the
// transaction body (see AppContext.tsx confirmSupplierWordingRelationship)
// so the actual decision logic can be unit tested directly against plain
// objects, without a live Firestore client or emulator — the same
// pattern openBatchSupersession.ts already established for the
// structurally similar open-batch lock transaction.

/** The minimal shape of a transactionally-fetched Product snapshot needed
 * to decide whether a supplier-wording relationship write is safe. */
export interface CheckedProductWordingSnapshot {
  productId: string;
  exists: boolean;
  supplierWordings: Array<{ supplierRecordId: string; wording: string }>;
}

export interface SupplierWordingConfirmationPlan {
  /** True when the TARGET product already holds this exact relationship
   * — the write is redundant (idempotent no-op), not an error. */
  alreadyConfirmed: boolean;
  /** Set when a DIFFERENT checked product already holds this exact
   * relationship — BDR-0013 item 5's conflict state. The write must not
   * proceed; the caller must surface this, never silently pick a side. */
  conflict: { productId: string } | null;
  /** True only when a genuinely new relationship should be written to
   * the target product. */
  shouldWrite: boolean;
}

/**
 * Decides what a supplier-wording confirmation transaction should do,
 * given the FRESH (transactionally-read) state of the target product and
 * every other product that was offered to the owner as a candidate for
 * this same wording. Never mutates its input; never itself performs any
 * Firestore read/write.
 */
export function planSupplierWordingConfirmation(
  targetProductId: string,
  supplierRecordId: string,
  wording: string,
  checkedProducts: CheckedProductWordingSnapshot[]
): SupplierWordingConfirmationPlan {
  const trimmedWording = wording.trim();
  const target = checkedProducts.find((p) => p.productId === targetProductId);

  const relationshipMatches = (r: { supplierRecordId: string; wording: string }) =>
    r.supplierRecordId === supplierRecordId && r.wording.trim() === trimmedWording;

  if (target?.exists && target.supplierWordings.some(relationshipMatches)) {
    // Already established — a retried/duplicate confirmation. Correct
    // outcome is a no-op, never a second array entry for the same pair.
    return { alreadyConfirmed: true, conflict: null, shouldWrite: false };
  }

  const conflictingProduct = checkedProducts.find(
    (p) => p.productId !== targetProductId && p.exists && p.supplierWordings.some(relationshipMatches)
  );
  if (conflictingProduct) {
    // Another product (independently, since the candidate list was
    // computed client-side) has already claimed this exact wording for
    // this exact supplier — BDR-0013 item 5's conflict. Never silently
    // overwrite or silently pick either product.
    return { alreadyConfirmed: false, conflict: { productId: conflictingProduct.productId }, shouldWrite: false };
  }

  // Nothing else claims this pair. Safe to write, provided the target
  // product itself still exists (it may have been deleted concurrently
  // — Rule 8 Finding 14's second additional failure mode).
  return { alreadyConfirmed: false, conflict: null, shouldWrite: !!target?.exists };
}

/**
 * Thrown by AppContext's confirmSupplierWordingRelationship when the
 * transaction's fresh read finds this exact (supplierRecordId, wording)
 * pair already claimed by a DIFFERENT product than the one the caller
 * asked to confirm. The caller must surface this as a conflict, never
 * retry-and-overwrite.
 */
export class SupplierWordingConflictError extends Error {
  conflictingProductId: string;
  constructor(conflictingProductId: string) {
    super(`Supplier wording already confirmed for a different product (${conflictingProductId}).`);
    this.name = 'SupplierWordingConflictError';
    this.conflictingProductId = conflictingProductId;
  }
}
