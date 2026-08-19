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

// ---------------------------------------------------------------------
// [Checkpoint 4] Smart Stock Entry scan-row integration
// ---------------------------------------------------------------------
//
// PROBLEM (discovered during Checkpoint 4's baseline investigation): a
// manually typed Add Stock row runs through resolveSupplierWordingRecognition
// above (via AddStockView's applySupplierWordingCheck), but a row built
// from a Smart Stock Entry extraction proposal (AddStockView's
// buildRowFromProposalLineItem) previously used ONLY the server's own
// exact-name match (matchProductByExactName, server/smartStockEntry.ts)
// — which has no knowledge of supplier-wording candidates or reuse. A
// scanned wording could therefore reach Add Stock's finalization path
// without ever being checked for recognition, even though it flows
// through the exact same `rows` state and the exact same
// handleSubmit → addMultipleStockBatches path Checkpoint 3 already
// covers for manual entry.
//
// FIX: this function is the pure decision for a scan-sourced row,
// composing resolveSupplierWordingRecognition above — never
// reimplementing it — exactly the same way AddStockView's own
// applySupplierWordingCheck already composes it for manual entry. The
// ONLY new decision here is which productId (if any) the row should be
// treated as matching, given TWO possible sources of a match: the
// server's own exact-name check (item.productMatch), or a client-side
// supplier-wording recognition outcome — with the server's exact match
// taking priority (Specification §3 step 1: recognition never fires
// once text already exactly names a product).

export interface ScanRowSupplierWordingDecision {
  /** The product this row should be treated as matching, if any — from
   * EITHER the server's own exact-name match or a client-side reuse
   * match. Undefined means neither source found a match. */
  matchedProductId: string | undefined;
  /** Set only for a genuinely NEW relationship the row should carry
   * through to finalization (silent reuse) — never for the server's
   * own ordinary exact-name match, which needs no relationship at all. */
  pendingSupplierWording:
    | { wording: string; productId: string; origin: 'reused'; conflictCheckProductIds: string[] }
    | undefined;
  /** Candidates to present via the SAME confirm/decline panel manual
   * entry already uses — never a scan-specific UI concept. */
  supplierWordingCandidates: SupplierWordingCandidate[] | undefined;
}

/**
 * Resolves the supplier-wording decision for one scan-extracted line
 * item, given the server's own exact-name match result alongside the
 * same recognition inputs manual entry uses. Pure — no Firestore
 * access, no UI, no row construction; AddStockView.tsx's
 * buildRowFromProposalLineItem calls this and applies the result to the
 * row it's building.
 */
export function resolveScanRowSupplierWording(
  rawProductName: string,
  serverProductMatch: { status: 'confident' | 'uncertain' | 'no_match'; productId: string | null },
  supplierId: string | undefined,
  existingProducts: RecognitionProduct[]
): ScanRowSupplierWordingDecision {
  if (serverProductMatch.status === 'confident' && serverProductMatch.productId) {
    // Ordinary exact match — identical treatment to a manually typed
    // exact match (resolveSupplierWordingRecognition's own 'none' case):
    // no recognition needed, no candidates, no new relationship.
    return {
      matchedProductId: serverProductMatch.productId,
      pendingSupplierWording: undefined,
      supplierWordingCandidates: undefined,
    };
  }

  const trimmed = rawProductName.trim();
  if (!trimmed) {
    return { matchedProductId: undefined, pendingSupplierWording: undefined, supplierWordingCandidates: undefined };
  }

  const outcome = resolveSupplierWordingRecognition(trimmed, supplierId, existingProducts);

  switch (outcome.type) {
    case 'reused':
      return {
        matchedProductId: outcome.productId,
        pendingSupplierWording: {
          wording: trimmed,
          productId: outcome.productId,
          origin: 'reused',
          conflictCheckProductIds: [],
        },
        supplierWordingCandidates: undefined,
      };
    case 'candidates':
      return {
        matchedProductId: undefined,
        pendingSupplierWording: undefined,
        supplierWordingCandidates: outcome.candidates,
      };
    case 'none':
    case 'no-candidates':
    default:
      return { matchedProductId: undefined, pendingSupplierWording: undefined, supplierWordingCandidates: undefined };
  }
}
