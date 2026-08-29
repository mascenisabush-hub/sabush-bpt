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
  hasSupplierWordingContradiction,
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
  // normalization-level similarity, plus Product Recognition
  // Intelligence's own Checkpoints 1/2/4 grounds) — must be presented
  // to the owner, never auto-attached (Specification §3 steps 2–4).
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
 * [Product Recognition Intelligence — Checkpoint 4] Signature the
 * caller-supplied semantic/AI mechanism must satisfy — deliberately
 * matching AppContext.tsx's own `findSemanticSupplierWordingCandidates`
 * shape exactly, so that function (or an equivalent test double) can
 * be passed straight through without adapting it. Optional and
 * defaulted to `undefined` everywhere below: when omitted, this whole
 * module behaves EXACTLY as it did before Checkpoint 4 existed —
 * synchronous-equivalent, deterministic-only — satisfying Acceptance
 * Criterion 20 ("Checkpoints 1-3 remain fully functional with
 * Checkpoint 4 disabled/reverted").
 */
export type SemanticSupplierWordingMatcher = (
  wording: string,
  products: Array<{ id: string; name: string }>
) => Promise<Array<{ productId: string }>>;

/**
 * Merges two candidate lists by `productId` — a product proposed by
 * both lists keeps exactly ONE entry, with the union of both lists'
 * `grounds` (de-duplicated); a product proposed by only one list keeps
 * its own single entry unchanged. Order: `base`'s own candidates
 * first (in their original order), then any additional candidates
 * `additional` proposed that `base` didn't already have (Implementation
 * Plan §2's aggregation contract — "different candidates... both kept,
 * unranked"; this function imposes no ranking of its own, only a
 * stable, deterministic order). Exported for direct testing
 * (Acceptance Criterion 5).
 */
export function unionSupplierWordingCandidates(
  base: SupplierWordingCandidate[],
  additional: SupplierWordingCandidate[]
): SupplierWordingCandidate[] {
  const byProductId = new Map<string, SupplierWordingCandidate>();
  const order: string[] = [];
  for (const c of base) {
    byProductId.set(c.productId, { productId: c.productId, grounds: [...c.grounds] });
    order.push(c.productId);
  }
  for (const c of additional) {
    const existing = byProductId.get(c.productId);
    if (existing) {
      for (const g of c.grounds) {
        if (!existing.grounds.includes(g)) existing.grounds.push(g);
      }
    } else {
      byProductId.set(c.productId, { productId: c.productId, grounds: [...c.grounds] });
      order.push(c.productId);
    }
  }
  return order.map((id) => byProductId.get(id)!);
}

/**
 * Decides which of the four recognition states applies for a freshly
 * typed/extracted supplier wording. `supplierId` is the CURRENTLY
 * SELECTED SupplierRecord.id for this purchase, if any — reuse can only
 * ever apply once a real, reusable supplier identity is known (Rule 8
 * Finding 2); a free-text, not-yet-created supplier name has no prior
 * confirmed relationships to reuse by construction, so `undefined`
 * simply skips straight to candidate detection, exactly as intended.
 *
 * DELIBERATELY STAYS SYNCHRONOUS — see `resolveSupplierWordingRecognitionAsync`
 * below for why. This function's own signature, return shape, and
 * every existing caller/test of it (tests/supplier-wording-*.test.ts)
 * are completely unmodified by Product Recognition Intelligence,
 * satisfying Acceptance Criterion 17 exactly: the pre-existing
 * deterministic recognition path is untouched code, not merely
 * untouched behavior.
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

/**
 * [Product Recognition Intelligence — Checkpoint 4] Async composition
 * layer ON TOP OF `resolveSupplierWordingRecognition` above — never a
 * reimplementation of it, always a caller of it, exactly the same
 * "compose, don't duplicate" discipline `resolveScanRowSupplierWording`
 * below already established for Checkpoint 3.
 *
 * [DESIGN NOTE — why this is a separate function, not
 * `resolveSupplierWordingRecognition` itself made `async`] The
 * Implementation Plan §2 describes the single composition point
 * "becoming async." Literally converting the existing, exported
 * `resolveSupplierWordingRecognition` into an `async function` — even
 * with every call site of its own logic unchanged — changes its
 * RETURN TYPE from `SupplierWordingRecognitionOutcome` to
 * `Promise<SupplierWordingRecognitionOutcome>` for every existing
 * caller, including the entire pre-existing, protected regression
 * suite in tests/supplier-wording-*.test.ts, which asserts directly
 * on the synchronous return value (e.g.
 * `assert.deepEqual(resolveSupplierWordingRecognition(...), { type:
 * 'none' })`). That is irreconcilable with Acceptance Criterion 17
 * ("every existing test... continues to pass unmodified") — an actual,
 * signed, numbered acceptance criterion, not a design preference. Per
 * the Authorization §6 ("choose the smallest implementation consistent
 * with the Plan and document it" for an ambiguous, in-scope
 * implementation detail), this function achieves the Plan's own
 * functional intent — a single async entry point that reaches the
 * semantic/AI mechanism, composing the SAME deterministic logic,
 * never duplicating it — via an additive new function instead of a
 * breaking signature change to an existing, tested one.
 * AddStockView.tsx (this checkpoint's only real caller) uses this
 * function exclusively; the original sync function remains exactly
 * as it was for every pre-existing caller/test.
 *
 * `semanticMatch`, when supplied, is invoked ONLY when the
 * deterministic function above returns 'no-candidates' for this
 * wording (Implementation Plan §3 Checkpoint 4's own proposed gating
 * default) — the common case (a candidate already found
 * deterministically, or an ordinary 'none'/'reused' outcome) never
 * reaches the AI mechanism at all, stays fully synchronous in
 * substance, and needs no network round-trip. Any rejection/throw from
 * `semanticMatch` itself is caught here and treated as an empty AI
 * contribution (Non-Negotiable: AI failure never blocks or erases
 * deterministic candidates already found in the same pass) —
 * belt-and-suspenders alongside `findSemanticSupplierWordingCandidates`'s
 * own identical "never throws" contract one layer further out.
 * Omitting `semanticMatch` entirely reduces this function to exactly
 * the deterministic function's own outcome, wrapped in a resolved
 * Promise — satisfying Acceptance Criterion 20 ("Checkpoints 1-3
 * remain fully functional with Checkpoint 4 disabled/reverted").
 */
export async function resolveSupplierWordingRecognitionAsync(
  wording: string,
  supplierId: string | undefined,
  existingProducts: RecognitionProduct[],
  semanticMatch?: SemanticSupplierWordingMatcher
): Promise<SupplierWordingRecognitionOutcome> {
  const deterministicOutcome = resolveSupplierWordingRecognition(wording, supplierId, existingProducts);

  if (deterministicOutcome.type !== 'no-candidates' || !semanticMatch) {
    return deterministicOutcome;
  }

  const trimmed = wording.trim();
  let aiMatches: Array<{ productId: string }> = [];
  try {
    aiMatches = await semanticMatch(
      trimmed,
      existingProducts.map((p) => ({ id: p.id, name: p.name }))
    );
  } catch {
    aiMatches = [];
  }

  // [Checkpoint 1's Contradiction Check, applied post-union across
  // EVERY mechanism per the Implementation Plan §2 aggregation
  // contract — "runs once per candidate... never once per mechanism"]
  // A semantic/AI candidate whose target product's own canonical name
  // contradicts the wording on quantity/unit is suppressed here,
  // exactly like a deterministic candidate already is inside
  // detectSupplierWordingCandidates itself (Non-Negotiable:
  // "Contradictions remain blocking... regardless of... any
  // mechanism, or combination").
  const aiCandidates: SupplierWordingCandidate[] = aiMatches
    .filter((m) => {
      const product = existingProducts.find((p) => p.id === m.productId);
      if (!product) return false; // defensive — mirrors sanitizeMatches' own id validation server-side
      return !hasSupplierWordingContradiction(trimmed, product.name);
    })
    .map((m) => ({ productId: m.productId, grounds: ['semantic-match'] as SupplierWordingCandidate['grounds'] }));

  // deterministicOutcome.type === 'no-candidates' here (checked above),
  // so this union is, in the CURRENT gating design, always against an
  // empty base list — `unionSupplierWordingCandidates` is still used
  // (rather than simply wrapping `aiCandidates`) so the aggregation
  // contract stays expressed as one real code path, exercised and
  // proven directly by this function's own tests, not merely implied
  // by the gating rule.
  const unioned = unionSupplierWordingCandidates([], aiCandidates);
  if (unioned.length > 0) return { type: 'candidates', candidates: unioned };
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
 * same recognition inputs manual entry uses. No Firestore access, no
 * UI, no row construction; AddStockView.tsx's buildRowFromProposalLineItem
 * calls this and applies the result to the row it's building.
 *
 * DELIBERATELY STAYS SYNCHRONOUS, composing the SYNC
 * `resolveSupplierWordingRecognition` above — see that function's own
 * "DESIGN NOTE" for the full reasoning: an existing, protected
 * regression test (tests/supplier-wording-smart-stock-entry.test.ts)
 * calls this exact function synchronously and asserts directly on its
 * return value; Acceptance Criterion 17 requires it to keep doing so
 * unmodified. `resolveScanRowSupplierWordingAsync` below is the
 * Checkpoint-4-aware counterpart AddStockView.tsx actually calls.
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
  return scanRowDecisionFromOutcome(trimmed, outcome);
}

/**
 * Shared outcome->decision mapping, factored out so
 * `resolveScanRowSupplierWording` (sync) and
 * `resolveScanRowSupplierWordingAsync` (below) apply IDENTICAL
 * translation logic from a `SupplierWordingRecognitionOutcome` to a
 * `ScanRowSupplierWordingDecision` — never two independently-maintained
 * copies of the same switch statement.
 */
function scanRowDecisionFromOutcome(
  trimmed: string,
  outcome: SupplierWordingRecognitionOutcome
): ScanRowSupplierWordingDecision {
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

/**
 * [Product Recognition Intelligence — Checkpoint 4] Async counterpart
 * to `resolveScanRowSupplierWording` above, mirroring
 * `resolveSupplierWordingRecognitionAsync`'s own "compose the sync
 * function, add the AI mechanism on top" shape exactly. This is the
 * function AddStockView.tsx's buildRowFromProposalLineItem actually
 * calls; the original sync function above remains exactly as it was
 * for every pre-existing caller/test.
 */
export async function resolveScanRowSupplierWordingAsync(
  rawProductName: string,
  serverProductMatch: { status: 'confident' | 'uncertain' | 'no_match'; productId: string | null },
  supplierId: string | undefined,
  existingProducts: RecognitionProduct[],
  semanticMatch?: SemanticSupplierWordingMatcher
): Promise<ScanRowSupplierWordingDecision> {
  if (serverProductMatch.status === 'confident' && serverProductMatch.productId) {
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

  const outcome = await resolveSupplierWordingRecognitionAsync(trimmed, supplierId, existingProducts, semanticMatch);
  return scanRowDecisionFromOutcome(trimmed, outcome);
}
