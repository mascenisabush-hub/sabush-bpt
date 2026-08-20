// Receipt / Unresolved-Product Sequencing — Increment B, Checkpoint B1.
//
// GOVERNANCE: implements exactly the Consolidated Specification's §8
// ("New/Unrecognized Receipt Workflow") — docs/specs/product-memory-purchase-selling-valuation-specification.md
// — as resolved by Rule 8 Finding 6 (docs/engineering/product-memory-purchase-selling-valuation-rule8-assessment.md)
// and authorized by the signed Implementation Authorization's Increment B
// scope item A. Per Finding 6: "a new, client-side-only sequencing/
// queue-state requirement layered on top of the already-implemented
// per-line confirmation mechanism — it does not require any change to
// the confirmed-relationship storage, matching logic, or conflict-
// handling logic already shipped for supplier wording."
//
// SCOPE OF THIS FILE, EXACTLY: pure functions only — no Firestore reads
// or writes, no UI, no new matching/candidate-detection logic of its
// own. It only classifies rows, using state the already-implemented
// supplier-wording mechanism (BDR-0013/POL-0007, Checkpoints 2-5)
// already produces, into "resolved" / "unresolved," and exposes the
// ordered queue those rows form. Mirrors this repository's established
// pure-function-first pattern (unitRelationship.ts, supplierWordingMatching.ts,
// supplierWordingRecognition.ts).
//
// A row is "unresolved" (Consolidated Specification §8 Step 2) exactly
// when the owner has not yet made an explicit resolution decision for
// its supplier-wording recognition state:
//   - Candidates are being offered and none has been confirmed or
//     declined yet (row.supplierWordingCandidates is non-empty) — §9.
//   - A conflict was flagged (the owner declined a candidate that was
//     itself an already-confirmed wording for a different product,
//     POL-0007's mandatory-distinguishing-information rule) and the
//     required distinguishing information has not yet been entered —
//     §9, POL-0007 Decision A.
//
// Deliberately NOT part of this classification (kept OUT of §8's queue
// on purpose — conflating either with §8 would silently change the
// scope of an already-decided rule):
//   - Missing/blank ordinary required fields (productName, quantity,
//     unit, cost) — these are pre-existing, general form-validation
//     concerns (HTML `required`, handleSubmit's own per-row checks),
//     not receipt-identity-recognition concerns. §8 governs supplier-
//     wording/product-identity resolution sequencing; it does not
//     redefine ordinary field validation for manual, non-receipt entry.
//   - A row mid-way through the "genuinely new product" unit-of-measure
//     configuration (§10) — that path has no separate accept/decline
//     gate; per §10's own text, a new-product row "disappears from the
//     unresolved queue" the moment the owner picks "new product," not
//     upon completing any further optional unit-relationship
//     configuration. Once no supplier-wording candidates are pending
//     for it, it is resolved for §8's purposes.

export interface ReceiptSequencingRow {
  id: string;
  supplierWordingCandidates?: Array<{ productId: string }>;
  supplierWordingConflictPending?: boolean;
  supplierWordingDistinguishingInfo?: string;
}

/**
 * True iff `row` still requires an explicit owner resolution action
 * (§9's "same product" / "different product" choice, or supplying
 * mandatory distinguishing information after a declined conflicting
 * candidate) before it may participate in the full-receipt review
 * screen (§11).
 */
export function isRowUnresolved(row: ReceiptSequencingRow): boolean {
  if (row.supplierWordingCandidates && row.supplierWordingCandidates.length > 0) {
    return true;
  }
  if (row.supplierWordingConflictPending && !row.supplierWordingDistinguishingInfo?.trim()) {
    return true;
  }
  return false;
}

/**
 * The ordered queue of still-unresolved row ids, in the SAME order the
 * rows themselves appear in `rows` — §8 Step 3 processes lines "one at
 * a time," in order, and this is what "first"/"next" means for that
 * purpose. Never mutates or reorders `rows` itself.
 */
export function getUnresolvedRowIds<T extends ReceiptSequencingRow>(rows: T[]): string[] {
  return rows.filter(isRowUnresolved).map((r) => r.id);
}

/**
 * The single row id the owner should be resolving right now (§8 Step
 * 3), or null once the queue is empty (§8: "Once every unresolved line
 * is resolved, proceed to §11 [whole-receipt review]").
 */
export function getCurrentUnresolvedRowId<T extends ReceiptSequencingRow>(rows: T[]): string | null {
  const unresolved = rows.find(isRowUnresolved);
  return unresolved ? unresolved.id : null;
}

/**
 * True once the unresolved queue is empty and the full, whole-receipt
 * review screen (§11) — and, per §11, the single atomic final
 * confirmation action — may be shown. A row with no supplier-wording
 * recognition state at all (e.g. an exact-match existing product, or a
 * new product the owner has already named without any candidate being
 * offered) is never unresolved by construction, so a receipt with no
 * candidate/conflict activity at all is immediately ready — this
 * function adds no NEW gate beyond §8's own scope.
 */
export function isReceiptReadyForFinalReview<T extends ReceiptSequencingRow>(rows: T[]): boolean {
  return getUnresolvedRowIds(rows).length === 0;
}

/**
 * Convenience combining the above for a render layer: which rows should
 * actually be shown right now. Per §8 Step 3 ("the owner sees exactly
 * that one line's resolution choice — not the rest of the receipt"):
 * while the queue is non-empty, only the current unresolved row is
 * shown; once empty, every row is shown for §11's whole-receipt review.
 * Deliberately returns rows in their ORIGINAL relative order/identity
 * (never a copy with reordered/renumbered rows) so a caller mapping
 * over the result can still resolve each row's true position in the
 * full `rows` array (e.g. for a stable "#N" label) via its own lookup.
 */
export function getRowsToDisplay<T extends ReceiptSequencingRow>(rows: T[]): T[] {
  const currentId = getCurrentUnresolvedRowId(rows);
  if (currentId === null) return rows;
  const current = rows.find((r) => r.id === currentId);
  return current ? [current] : rows;
}
