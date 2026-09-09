// Product Unit-of-Measure & Product Memory — Increment A (data model,
// validation, and Recognition-proposal pipeline). Authorized by
// docs/engineering/product-memory-purchase-selling-valuation-implementation-authorization.md
// (signed 2026-08-19 by Product Architect SABUSHIMIKE MASCENI), scoped
// strictly to Increment A. Governing chain: BDR-0012, POL-0001-0006,
// product-unit-of-measure-specification.md ("the UOM Specification"),
// docs/engineering/product-memory-purchase-selling-valuation-rule8-assessment.md.
//
// SCOPE OF THIS FILE, EXACTLY: pure functions only — no Firestore reads
// or writes, no UI, no network calls. Mirrors the existing
// supplierWordingMatching.ts precedent (pure-function-first, wiring into
// screens is a separate step).
//
// EXPLICITLY OUT OF SCOPE, PER INCREMENT A'S BOUNDARY (do not add here):
//   - Any unit-conversion arithmetic (factor composition, multi-hop
//     conversion, rate derivation). That is Increment B's Concept C
//     (product-memory-purchase-selling-valuation-specification.md
//     §13-15, calculateDerivedTransactionValuation) — strictly out of
//     scope for Increment A per the signed Implementation Authorization.
//   - Any AI/OCR provider, model, or recognition algorithm. The UOM
//     Specification §12 explicitly leaves "any AI provider/model
//     selection or recognition algorithm internals" out of scope — no
//     governing artifact has selected one. proposeUnitRelationshipRecognition
//     below is therefore an honest stub: it always returns `null` (no
//     proposal), which is the UOM Specification's own already-authorized
//     fallback behavior (§11 Failure Modes: "Recognition service
//     unavailable/errors -> Falls back to today's existing manual entry
//     -- no Recognition proposal shown, owner enters manually"). This
//     keeps the confirm-then-write architecture (UOM Specification §3)
//     fully real and testable without inventing a business rule (a
//     matching/suggestion heuristic) that no governing document has
//     authorized.

import type { Product, UnitRelationship } from '../types';

/**
 * POL-0005's minimum-configuration threshold, applied to a candidate
 * UnitRelationship before it is written to a Product: at least one unit
 * (units[0], the top-level/default unit) must be present, and if a
 * sellingUnit is being set, it must be a member of units[].unit.
 *
 * This is the single source of truth for this validation — every write
 * path (new-product creation, existing-product reconfirmation) must
 * route through this function before persisting a UnitRelationship.
 * Per POL-0005: a selling PRICE is never required here (Product.sellingPrice
 * is a separate, optional field) — only the unit relationship and,
 * if present, the selling UNIT are validated.
 */
export function isValidUnitRelationship(candidate: UnitRelationship | undefined | null): boolean {
  if (!candidate) return false;
  if (!Array.isArray(candidate.units) || candidate.units.length === 0) return false;

  const topLevel = candidate.units[0];
  if (!topLevel || typeof topLevel.unit !== 'string' || !topLevel.unit.trim()) return false;

  // Every unit string in the chain must be non-empty; every
  // factorFromPrevious except units[0]'s own (explicitly unused/ignored,
  // per the UOM Specification §2) must be a positive finite number --
  // BDR-0012 §5.A Item 2 scopes this capability to strictly-ordered
  // chains only; a non-positive or non-finite factor cannot express an
  // ordered relationship and is rejected here rather than silently
  // accepted and left to fail unpredictably wherever it is later read.
  for (let i = 0; i < candidate.units.length; i++) {
    const entry = candidate.units[i];
    if (!entry || typeof entry.unit !== 'string' || !entry.unit.trim()) return false;
    if (i > 0) {
      if (typeof entry.factorFromPrevious !== 'number' || !Number.isFinite(entry.factorFromPrevious) || entry.factorFromPrevious <= 0) {
        return false;
      }
    }
  }

  if (candidate.sellingUnit != null) {
    // [Bug fix — unit matching was case- and whitespace-sensitive] See
    // getConversionFactor's own identical fix (purchaseToSellingConversion.ts)
    // for the full explanation. Here specifically: a relationship whose
    // sellingUnit was typed/stored with different casing than its own
    // units[] entry (e.g. sellingUnit "Un" against a units[] entry "un")
    // was silently REJECTED as invalid by this exact check — even
    // though it's unambiguously the same unit — collapsing the whole
    // relationship to "unconfirmed" for every downstream consumer
    // (Mode A, cost-basis derivation, suppression) with no error shown.
    const normalizedSellingUnit = candidate.sellingUnit.trim().toLowerCase();
    const isMember = candidate.units.some((u) => u.unit.trim().toLowerCase() === normalizedSellingUnit);
    if (!isMember) return false;
  }

  if (typeof candidate.confirmedAt !== 'string' || !candidate.confirmedAt) return false;

  return true;
}

/**
 * A product has confirmed Product Memory (UOM Specification §3 step 5's
 * "existing confirmed configuration") only when unitRelationship is
 * present AND independently valid — never trusted merely because the
 * field is non-null (a defensive check against any historical/partial
 * write reaching this far, consistent with this platform's existing
 * "never fabricate precision, never silently discard information"
 * discipline, POL-0001's Guiding Principle, applied here to structural
 * validity rather than numeric precision).
 */
export function hasConfirmedUnitRelationship(product: Pick<Product, 'unitRelationship'>): boolean {
  return isValidUnitRelationship(product.unitRelationship);
}

/**
 * The product's top-level/default unit (BDR-0012 §5.A Item 4) -- the
 * default purchase-entry unit, and (UOM Specification §4, Periodic
 * Contagem) the single reference point mixed-unit combination converts
 * toward. Returns undefined for a product with no confirmed
 * configuration -- callers must handle that case via BDR-0012 §5.A Item
 * 6's warn-and-allow-entry treatment, never by inventing a default.
 */
export function getDefaultUnit(product: Pick<Product, 'unitRelationship'>): string | undefined {
  if (!hasConfirmedUnitRelationship(product)) return undefined;
  return product.unitRelationship!.units[0].unit;
}

/**
 * Whether a given unit string is a member of the product's confirmed
 * chain -- the exact test that decides between "chain-member unit,
 * saves without warning" and "non-member unit, triggers Item 6's
 * warn-and-allow-entry treatment" (UOM Specification §4, every screen
 * section). A product with no confirmed configuration always returns
 * false here (nothing is a "member" of a relationship that doesn't
 * exist) -- callers must check hasConfirmedUnitRelationship separately
 * to distinguish "no configuration at all" from "configured, but this
 * unit isn't part of it," since BDR-0012 §5.A Item 6 treats both as
 * warn-and-allow but a caller may want different copy for each.
 */
export function isUnitInChain(product: Pick<Product, 'unitRelationship'>, unit: string): boolean {
  if (!hasConfirmedUnitRelationship(product) || !unit) return false;
  // [Bug fix — unit matching was case- and whitespace-sensitive] Same
  // fix, same reasoning as getConversionFactor's own identical change
  // (purchaseToSellingConversion.ts) — a portion typed "UN" against a
  // confirmed chain unit "un" is the same unit, and must not trigger
  // Item 6's "unit outside the chain" warning purely over casing.
  const normalizedUnit = unit.trim().toLowerCase();
  return product.unitRelationship!.units.some((u) => u.unit.trim().toLowerCase() === normalizedUnit);
}

/** A Recognition proposal -- transient, never itself Product Memory
 * (UOM Specification §3 step 2: "a proposal only -- held in transient UI
 * state, never written to Product"). Structurally identical to
 * UnitRelationship minus confirmedAt, since a proposal is not yet
 * confirmed. */
export interface UnitRelationshipProposal {
  units: Array<{ unit: string; factorFromPrevious: number }>;
  sellingUnit?: string;
}

/**
 * Recognition (BDR-0012 Decision 17): proposes a likely unit-of-measure
 * structure for a genuinely first-time product entry. Per this file's
 * header comment, no recognition algorithm has been authorized by any
 * governing artifact (UOM Specification §12 explicitly excludes "any AI
 * provider/model selection or recognition algorithm internals") -- this
 * function is therefore an honest, always-null stub, not a placeholder
 * standing in for hidden logic. Callers MUST treat a null return
 * exactly as the UOM Specification's own §11 Failure Modes table
 * already requires: fall back to manual entry, do not block, do not
 * invent a proposal.
 *
 * Per UOM Specification §3 step 5 and Decision 17's "never re-run"
 * clause: callers must check hasConfirmedUnitRelationship(product)
 * BEFORE calling this function at all -- Recognition must never be
 * invoked for a product that already has confirmed Product Memory. This
 * function does not enforce that itself (it has no Product to check
 * against; it is intentionally decoupled from Firestore/product state),
 * so the caller carries that responsibility.
 */
export function proposeUnitRelationshipRecognition(_productName: string): UnitRelationshipProposal | null {
  return null;
}

/**
 * Builds the confirmed UnitRelationship object to write to a Product,
 * from either an accepted Recognition proposal or a manually-entered
 * structure -- the single point where confirmedAt is stamped. This
 * function performs NO Firestore write itself (see AppContext.tsx's
 * confirmProductUnitRelationship / the product-creation paths in
 * addStockBatch and recordStockCount for the actual write paths) -- it
 * exists so every write path stamps confirmedAt the same way and so
 * validity is checked at the moment of confirmation, not deferred to
 * whoever eventually persists it.
 *
 * Returns null if the candidate does not meet POL-0005's minimum
 * configuration threshold -- callers must never persist a value this
 * function rejected.
 */
export function confirmUnitRelationship(
  candidate: UnitRelationshipProposal,
  confirmedAt: string = new Date().toISOString()
): UnitRelationship | null {
  const withTimestamp: UnitRelationship = { ...candidate, confirmedAt };
  return isValidUnitRelationship(withTimestamp) ? withTimestamp : null;
}

// [Product Catalog Phase 2 — Implementation Checkpoint 1, Decision 1
// (docs/specs/product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md),
// Specification §11, Implementation Authorization §3.2(C)/§4/§6.] Pure
// classification only — no Firestore access, matching this file's own
// stated scope. Distinguishes an EXTENSION (every previously-confirmed
// unit token AND its own factorFromPrevious value preserved exactly,
// with at least one new unit token added, and the top-level/default
// unit -- units[0] -- unchanged) from a REPLACEMENT/RECONFIGURATION
// (any other change: an existing unit's factor changed, a unit
// removed, the top-level unit changed, or any other restructuring).
// This mirrors the worked example in Decision 1/§11 exactly: extending
// `1 Cx = 24 Un` with `1 Emb = 6 Un` to `1 Cx = 4 Emb = 24 Un`
// preserves Un's own factorFromPrevious (24) byte-identical even though
// a new unit (Emb) was inserted between Cx and Un positionally --
// factors are never recomputed or treated as "close enough" here.
// A product with no valid current relationship at all has nothing to
// extend -- any candidate for it is classified 'replacement' (in the
// sense of "not an extension"), consistent with confirmProductUnitRelationship's
// own existing "first confirmation vs later reconfiguration" framing;
// this classification does not itself gate anything -- see
// evaluateUnitRelationshipReplacement, below, for the actual
// selling-unit-preservation gate Decision 1 requires.
export type UnitRelationshipChangeKind = 'extension' | 'replacement';

export function classifyUnitRelationshipChange(
  current: UnitRelationship | undefined | null,
  proposed: UnitRelationshipProposal
): UnitRelationshipChangeKind {
  if (!isValidUnitRelationship(current)) return 'replacement';
  const currentUnits = current!.units;
  const proposedUnits = proposed.units;
  if (!Array.isArray(proposedUnits) || proposedUnits.length === 0) return 'replacement';

  // Top-level unit (units[0]) must remain the same unit for this to be
  // an extension -- changing which unit occupies the default/purchase-
  // unit role (BDR-0012 §5.A Item 4) is itself a reconfiguration, per
  // the worked example (Cx stays units[0] throughout).
  const currentTopLevel = currentUnits[0]?.unit?.trim().toLowerCase();
  const proposedTopLevel = proposedUnits[0]?.unit?.trim().toLowerCase();
  if (!currentTopLevel || currentTopLevel !== proposedTopLevel) return 'replacement';

  const proposedByName = new Map(proposedUnits.map((u) => [u.unit.trim().toLowerCase(), u]));

  // Every previously-confirmed unit (except units[0] itself, whose own
  // factorFromPrevious is explicitly unused/ignored, per isValidUnitRelationship's
  // own identical treatment) must still be present, with its exact same
  // factorFromPrevious value -- not merely numerically close, not
  // recomputed, byte-identical.
  for (let i = 0; i < currentUnits.length; i++) {
    const entry = currentUnits[i];
    const normalizedName = entry.unit.trim().toLowerCase();
    const match = proposedByName.get(normalizedName);
    if (!match) return 'replacement';
    if (i > 0 && match.factorFromPrevious !== entry.factorFromPrevious) return 'replacement';
  }

  // At least one genuinely new unit token must be present for this to
  // be an extension rather than merely a no-op resubmission of the
  // exact same chain.
  const currentNames = new Set(currentUnits.map((u) => u.unit.trim().toLowerCase()));
  const hasNewUnit = proposedUnits.some((u) => !currentNames.has(u.unit.trim().toLowerCase()));
  return hasNewUnit ? 'extension' : 'replacement';
}

/**
 * Decision 1's own governing rule, as a pure, directly-testable check:
 * a proposed UnitRelationship replacement/reconfiguration must not be
 * confirmed if it would strand the product's current confirmed
 * `sellingUnit` -- unless the proposed candidate itself already
 * supplies a valid replacement selling unit (a member of the proposed
 * relationship's own units[]). Never auto-selects a replacement
 * (returns `allowed: false` rather than picking one), never implies
 * `sellingPrice` should be cleared (this function has no awareness of
 * `sellingPrice` at all -- that remains untouched by design, per
 * Decision 1's explicit "do not automatically clear sellingPrice"
 * rule and this file's own single-field, no-cross-field-mutation
 * discipline). A product with no valid current confirmed sellingUnit
 * has nothing to strand -- always allowed, regardless of classification.
 */
export interface UnitRelationshipReplacementEvaluation {
  allowed: boolean;
  reason?: 'requires-new-selling-unit';
}

export function evaluateUnitRelationshipReplacement(
  current: UnitRelationship | undefined | null,
  proposed: UnitRelationshipProposal
): UnitRelationshipReplacementEvaluation {
  const currentSellingUnit = isValidUnitRelationship(current) ? current!.sellingUnit : undefined;
  if (!currentSellingUnit) return { allowed: true };

  const normalizedCurrentSellingUnit = currentSellingUnit.trim().toLowerCase();
  const proposedUnits = Array.isArray(proposed.units) ? proposed.units : [];
  const stillMember = proposedUnits.some((u) => u.unit.trim().toLowerCase() === normalizedCurrentSellingUnit);
  if (stillMember) return { allowed: true };

  // The current sellingUnit is no longer a member of the proposed
  // relationship. Allowed ONLY if the candidate itself already supplies
  // a valid replacement -- re-validated here defensively (never trusted
  // un-checked, matching this file's existing discipline throughout),
  // never inferred or chosen on the candidate's behalf.
  if (proposed.sellingUnit) {
    const normalizedProposedSellingUnit = proposed.sellingUnit.trim().toLowerCase();
    const proposedSellingUnitIsMember = proposedUnits.some(
      (u) => u.unit.trim().toLowerCase() === normalizedProposedSellingUnit
    );
    if (proposedSellingUnitIsMember) return { allowed: true };
  }

  return { allowed: false, reason: 'requires-new-selling-unit' };
}
