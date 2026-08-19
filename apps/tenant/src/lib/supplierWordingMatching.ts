// Supplier-Wording Recognition — Matching Functions (Checkpoint 2 of the
// Implementation Authorization at
// docs/engineering/product-identity-alternative-name-implementation-authorization.md,
// signed 2026-08-19). Governing chain: BDR-0013, POL-0007,
// product-identity-alternative-name-specification.md, its Terminology
// Amendment, and the Rule 8 Assessment (Findings 4, 5, 18).
//
// SCOPE OF THIS FILE, EXACTLY: two pure functions and nothing else.
// Neither function reads or writes Firestore, touches any UI, ranks or
// orders candidates, presents a confirmation experience, persists
// anything, or is called from anywhere yet. Wiring into Add Stock or
// Smart Stock Entry, transaction-protected writes (Finding 13), and
// every other behavior are explicitly deferred to later, separately
// authorized checkpoints. Initial Stock has no supplier concept and is
// not a caller of this module, now or ever, per the accepted
// Terminology Amendment.
//
// Candidate detection and reuse matching are DELIBERATELY DIFFERENT
// strictness levels (Rule 8 Finding 5) — this is not an oversight, it
// mirrors the two behaviors' different risk profiles: a candidate is
// always owner-reviewed before anything is established (low cost if
// imperfect); reuse silently reattaches a wording to a product with no
// owner review at all (BDR-0013 item 3), so it must never risk a false
// positive. Do not unify these two functions or their thresholds.

import { normalize } from '../data/businessCategories';

/**
 * Candidate-detection normalization: reuses the existing `normalize()`
 * (case + accent folding, per Rule 8 Finding 4) and additionally
 * collapses whitespace runs to a single space and trims. Whitespace
 * collapsing is applied here, not inside the shared `normalize()`
 * itself, to avoid changing that function's existing, unrelated
 * behavior (category-name keyword detection in
 * `businessCategories.ts`) for a concern specific to this capability.
 * POL-0007's Candidate Grounds explicitly names "spacing" as part of
 * the normalization-level signal category this function implements.
 */
function normalizeForCandidateDetection(text: string): string {
  return normalize(text).trim().replace(/\s+/g, ' ');
}

/** A candidate product a supplier wording might refer to, with the
 * ground(s) that make it plausible. Detection only — being returned
 * here is never itself a decision (BDR-0013 Decision 4); the owner
 * still confirms or declines every candidate this surfaces. */
export interface SupplierWordingCandidate {
  productId: string;
  /** Which candidate ground(s) fired, per POL-0007's Candidate Grounds
   * section — a wording may match on both grounds simultaneously. */
  grounds: Array<'initial-stock-name' | 'existing-alternative-wording'>;
}

/**
 * Candidate detection (Rule 8 Finding 4): proposes existing products a
 * newly-entered supplier wording might refer to, using
 * normalization-level similarity only (case and accent via the shared
 * `normalize()`, plus whitespace-run collapsing applied locally — see
 * `normalizeForCandidateDetection` below) — never semantic/AI matching,
 * per POL-0007's Candidate Grounds and Technical Boundary. Checks two grounds per POL-0007: (a)
 * normalized equality to a product's `Product.name` (Initial Stock
 * name); (b) normalized equality to any of that product's own
 * already-confirmed alternative wordings (any supplier — POL-0007's
 * "regardless of which supplier that alternative name is associated
 * with"). Returns every plausible candidate, unordered beyond input
 * order — no ranking, scoring, or maximum count is implemented here
 * (Specification §3 step 4, explicitly deferred; multiple-candidate
 * presentation itself is a later, separately authorized checkpoint).
 * Pure: no Firestore reads, no side effects — the caller supplies the
 * product/wording data already in memory, mirroring
 * `matchProductByExactName`'s existing shape in `server/smartStockEntry.ts`.
 */
export function detectSupplierWordingCandidates(
  wording: string,
  existingProducts: Array<{
    id: string;
    name: string;
    supplierWordings?: Array<{ wording: string }>;
  }>
): SupplierWordingCandidate[] {
  const trimmed = wording.trim();
  if (!trimmed) {
    return [];
  }
  const needle = normalizeForCandidateDetection(trimmed);
  const candidates: SupplierWordingCandidate[] = [];

  for (const product of existingProducts) {
    const grounds: SupplierWordingCandidate['grounds'] = [];

    if (normalizeForCandidateDetection(product.name) === needle) {
      grounds.push('initial-stock-name');
    }

    const hasMatchingAlternativeWording = (product.supplierWordings ?? []).some(
      (relationship) => normalizeForCandidateDetection(relationship.wording) === needle
    );
    if (hasMatchingAlternativeWording) {
      grounds.push('existing-alternative-wording');
    }

    if (grounds.length > 0) {
      candidates.push({ productId: product.id, grounds });
    }
  }

  return candidates;
}

/**
 * Reuse matching (Rule 8 Finding 5): determines whether an incoming
 * supplier wording is a repeat of an already-confirmed relationship
 * for the same supplier, per BDR-0013 item 3's "automatically
 * recognizes/reuses... without asking the owner to reconfirm."
 * Deliberately stricter than candidate detection — byte-exact,
 * whitespace-trimmed only, no further normalization (no case-folding,
 * no accent-stripping). This asymmetry is required, not incidental:
 * reuse is the one path in this capability with no owner review at
 * all, so a false-positive match here would silently misattach a
 * wording to the wrong product — exactly what BDR-0013 Decision 4/5
 * exist to prevent. Scoped to a single supplier's own already-confirmed
 * relationships only, per BDR-0013 item 3's "same wording from the
 * same supplier." Pure: no Firestore reads, no side effects, no write
 * of any kind — this function only answers "does a match already
 * exist," never establishes one.
 */
export function findExistingSupplierWordingMatch(
  wording: string,
  supplierRecordId: string,
  confirmedRelationshipsForSupplier: Array<{
    supplierRecordId: string;
    wording: string;
    productId: string;
  }>
): { productId: string } | null {
  const needle = wording.trim();
  if (!needle) {
    return null;
  }
  const match = confirmedRelationshipsForSupplier.find(
    (relationship) =>
      relationship.supplierRecordId === supplierRecordId &&
      relationship.wording.trim() === needle
  );
  return match ? { productId: match.productId } : null;
}
