// Supplier-Wording Recognition — Row-Level Recognition Decision
// (Checkpoint 3 of the Implementation Authorization at
// docs/engineering/product-identity-alternative-name-implementation-authorization.md,
// signed 2026-08-19). Governing chain: BDR-0013, POL-0007,
// product-identity-alternative-name-specification.md, its Terminology
// Amendment, and the Rule 8 Assessment.
//
// PURPOSE: AddStockView.tsx needs to decide, every time a row's typed
// productName changes, which of four states applies (Specification §3
// step 1, §6): an ordinary exact `Product.name` match (recognition never
// fires); a silent reuse of an already-confirmed relationship (Rule 8
// Finding 5); one or more candidates to propose (Rule 8 Finding 4); or
// no recognition signal at all. This is pure decision logic — no
// Firestore access, no UI, no state mutation — extracted into its own
// function (mirroring the same pure-decision-logic/thin-component-glue
// split this codebase already established for the open-batch lock
// transaction, openBatchSupersession.ts, and for Checkpoint 2's own two
// matching functions, supplierWordingMatching.ts) specifically so it can
// be unit tested directly, without a React rendering harness this
// repository does not otherwise use.
//
// Deliberately a SEPARATE file from supplierWordingMatching.ts — that
// file's own header fixes its scope at exactly two functions
// (Checkpoint 2's authorized boundary) and this is new, Checkpoint
// 3-owned logic that composes those two functions, not a third addition
// to that file.

import {
  detectSupplierWordingCandidates,
  findExistingSupplierWordingMatch,
  type SupplierWordingCandidate,
} from './supplierWordingMatching';

export type SupplierWordingRecognitionOutcome =
  // Empty/whitespace-only wording, or one that already exactly matches
  // an existing Product.name — ordinary, already-existing behavior;
  // recognition never fires (Specification §3 step 1).
  | { type: 'none' }
  // An already-confirmed relationship exists for this exact wording and
  // this exact supplier (Rule 8 Finding 5's byte-exact matching) —
  // reused silently, no owner interaction (BDR-0013 item 3).
  | { type: 'reused'; productId: string }
  // One or more plausible candidates found (Rule 8 Finding 4's
  // normalization-level similarity) — must be presented to the owner,
  // never auto-attached (Specification §3 steps 2–4).
  | { type: 'candidates'; candidates: SupplierWordingCandidate[] }
  // Non-empty, non-exact-match wording with no reuse match and no
  // candidates — ordinary new-product path applies unless the owner
  // separately declares a relationship themselves (§3a).
  | { type: 'no-candidates' };

export interface RecognitionProduct {
  id: string;
  name: string;
  supplierWordings?: Array<{ supplierRecordId: string; wording: string }>;
}

/**
 * Decides which of the four recognition states applies for a freshly
 * typed/extracted supplier wording. `supplierId` is the CURRENTLY
 * SELECTED SupplierRecord.id for this purchase, if any — reuse can only
 * ever apply once a real, reusable supplier identity is known (Rule 8
 * Finding 2); a free-text, not-yet-created supplier name has no prior
 * confirmed relationships to reuse by construction, so `undefined`
 * simply skips straight to candidate detection, exactly as intended.
 */
export function resolveSupplierWordingRecognition(
  wording: string,
  supplierId: string | undefined,
  existingProducts: RecognitionProduct[]
): SupplierWordingRecognitionOutcome {
  const trimmed = wording.trim();
  if (!trimmed) return { type: 'none' };

  const exactMatch = existingProducts.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return { type: 'none' };

  if (supplierId) {
    const confirmedRelationships = existingProducts.flatMap((p) =>
      (p.supplierWordings ?? []).map((r) => ({
        supplierRecordId: r.supplierRecordId,
        wording: r.wording,
        productId: p.id,
      }))
    );
    const reuseMatch = findExistingSupplierWordingMatch(trimmed, supplierId, confirmedRelationships);
    if (reuseMatch) return { type: 'reused', productId: reuseMatch.productId };
  }

  const candidates = detectSupplierWordingCandidates(trimmed, existingProducts);
  if (candidates.length > 0) return { type: 'candidates', candidates };

  return { type: 'no-candidates' };
}
