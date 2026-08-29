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

import type { SupplierWordingRelationship } from '../types';

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

// ---------------------------------------------------------------------
// Owner-Controlled Correction of a Remembered Supplier-Wording
// Relationship (Implementation Authorization at
// docs/engineering/product-identity-alternative-name-relationship-correction-implementation-authorization.md,
// signed SABUSHIMIKE MASCENI, 29 August 2026). Governing chain:
// BDR-0013, the accepted Amendment, the READY Rule 8 Assessment, and
// the accepted Implementation Plan.
//
// SCOPE: two pure decision functions, `planSupplierWordingRemoval` and
// `planSupplierWordingRedirect`, mirroring `planSupplierWordingConfirmation`'s
// own existing discipline exactly — no Firestore read/write, no
// mutation of any input, unit-testable against plain objects. Neither
// function is wired to any transaction or UI here; that is
// `AppContext.tsx`'s job (`removeSupplierWordingRelationship`,
// `redirectSupplierWordingRelationship`).
//
// IMPORTANT DIFFERENCE FROM `planSupplierWordingConfirmation`'s OWN
// SNAPSHOT SHAPE: that function's `CheckedProductWordingSnapshot`
// deliberately carries only `{ supplierRecordId, wording }` per entry —
// sufficient for its own conflict-detection purpose, but NOT sufficient
// here. The Implementation Authorization requires removal/redirect to
// "preserve every other supplierWordings entry unchanged" — including
// each entry's own `confirmedAt`/`provenance`/`confirmedByName` — so
// these two new functions operate on, and return, the FULL
// `SupplierWordingRelationship[]` shape for the product(s) they modify,
// never the reduced shape. A `FullProductWordingSnapshot` is
// structurally assignable wherever a `CheckedProductWordingSnapshot` is
// expected (its `supplierWordings` entries are a superset of the
// reduced shape), so `planSupplierWordingRedirect` below passes its own
// snapshots directly to the existing, unmodified
// `planSupplierWordingConfirmation` with no separate mapping step.

/** Like `CheckedProductWordingSnapshot`, but carries each relationship's
 * FULL stored shape (not just the `(supplierRecordId, wording)` pair) —
 * required so removal/redirect can preserve every untouched entry's own
 * `confirmedAt`/`provenance`/`confirmedByName` exactly, never stripping
 * them. Structurally assignable to `CheckedProductWordingSnapshot`
 * wherever that narrower shape is expected. */
export interface FullProductWordingSnapshot {
  productId: string;
  exists: boolean;
  supplierWordings: SupplierWordingRelationship[];
}

export interface SupplierWordingRemovalPlan {
  /** True when the target's CURRENT (fresh) `supplierWordings` array
   * contains this exact `(supplierRecordId, wording)` pair. False means
   * the relationship is already absent — a successful, idempotent
   * no-op per the Implementation Authorization §2.A, never an error. */
  found: boolean;
  /** The target's `supplierWordings` array with that one entry removed
   * — every other entry preserved, in order, byte-for-byte, including
   * its own `confirmedAt`/`provenance`/`confirmedByName`. When `found`
   * is false, an unchanged copy of the input array (never the same
   * array reference — this function never mutates its input). */
  updatedWordings: SupplierWordingRelationship[];
}

/**
 * Decides what a supplier-wording REMOVAL transaction should do, given
 * the FRESH (transactionally-read) full `supplierWordings` array of the
 * target product. Never mutates its input; never itself performs any
 * Firestore read/write. Identity is exactly `(supplierRecordId,
 * wording.trim())`, matching `planSupplierWordingConfirmation`'s own
 * identity key exactly (Implementation Authorization §3 item 2).
 */
export function planSupplierWordingRemoval(
  supplierRecordId: string,
  wording: string,
  target: { supplierWordings: SupplierWordingRelationship[] }
): SupplierWordingRemovalPlan {
  const trimmedWording = wording.trim();
  const relationshipMatches = (r: { supplierRecordId: string; wording: string }) =>
    r.supplierRecordId === supplierRecordId && r.wording.trim() === trimmedWording;

  const found = target.supplierWordings.some(relationshipMatches);
  const updatedWordings = found
    ? target.supplierWordings.filter((r) => !relationshipMatches(r))
    : [...target.supplierWordings];

  return { found, updatedWordings };
}

export interface SupplierWordingRedirectPlan {
  /** Whether the SOURCE product's fresh snapshot actually held the
   * relationship being moved. False means "already gone" — a distinct,
   * explicit non-success result (Implementation Authorization §2.D),
   * never silently reported as a successful redirect, and never
   * conflated with `planSupplierWordingRemoval`'s own `found: false`
   * idempotent-success semantics for direct removal. */
  sourceFound: boolean;
  /** Set when a THIRD product — neither source nor destination —
   * already independently holds this exact pair. Reuses
   * `planSupplierWordingConfirmation`'s own existing conflict
   * semantics exactly, scoped (by this function's own contract, see
   * below) to exclude the source product, since the source
   * legitimately already holds the relationship being moved and must
   * never be flagged as a rival claimant (Implementation Authorization
   * §2.C). A genuine conflict blocks the entire redirect: no source
   * write, no destination write, relationship remains exactly as it
   * was (Implementation Authorization §2.B "conflict" scenario). */
  conflict: { productId: string } | null;
  /** True when the DESTINATION already independently holds this exact
   * pair at the moment of the fresh read — the authorized "destination
   * already holds the relationship" outcome (Implementation
   * Authorization §2.C / §6): idempotent, no destination write, no
   * duplicate, existing destination entry (and its own `confirmedAt`/
   * `provenance`/`confirmedByName`) left completely untouched; source
   * removal still proceeds. */
  destinationAlreadyHasIt: boolean;
  /** Source's `supplierWordings` with the entry removed — every other
   * source entry preserved, in order, unchanged (unchanged copy of the
   * input if `!sourceFound`). */
  updatedSourceWordings: SupplierWordingRelationship[];
  /** True only when a new entry must be appended to the destination —
   * false both when the destination already has it (idempotent) and
   * when nothing should be written at all (conflict, or source
   * already gone). */
  shouldWriteDestination: boolean;
}

/**
 * Decides what a supplier-wording REDIRECT transaction should do, given
 * the FRESH (transactionally-read) full snapshots of the source
 * product and of the destination-plus-any-additional-conflict-check
 * products. Never mutates any input; never itself performs any
 * Firestore read/write.
 *
 * CONTRACT — CALLER MUST NOT INCLUDE THE SOURCE PRODUCT IN
 * `destinationAndOtherSnapshots`: this function composes
 * `planSupplierWordingRemoval` (for the source half) with the existing,
 * unmodified `planSupplierWordingConfirmation` (for the destination
 * half, called with `destinationAndOtherSnapshots` only). Including the
 * source product in that second argument would incorrectly cause
 * `planSupplierWordingConfirmation`'s own conflict check to flag it as
 * a rival claimant — it is not one, it is the relationship's own
 * legitimate current holder, mid-transfer (Implementation Authorization
 * §2.C, §3 item 5). This is reuse of the existing conflict decision,
 * not a new conflict mechanism (Implementation Authorization §3 item 7
 * / §5's "no new conflict mechanism" boundary).
 */
export function planSupplierWordingRedirect(
  sourceProductId: string,
  destinationProductId: string,
  supplierRecordId: string,
  wording: string,
  sourceSnapshot: FullProductWordingSnapshot,
  destinationAndOtherSnapshots: FullProductWordingSnapshot[]
): SupplierWordingRedirectPlan {
  const removalPlan = planSupplierWordingRemoval(supplierRecordId, wording, sourceSnapshot);

  const confirmationPlan = planSupplierWordingConfirmation(
    destinationProductId,
    supplierRecordId,
    wording,
    destinationAndOtherSnapshots
  );

  return {
    sourceFound: removalPlan.found,
    conflict: confirmationPlan.conflict,
    destinationAlreadyHasIt: confirmationPlan.alreadyConfirmed,
    updatedSourceWordings: removalPlan.updatedWordings,
    // Nothing is ever written to the destination when the source
    // relationship is already gone (nothing to redirect) or when a
    // genuine third-party conflict exists — only
    // `planSupplierWordingConfirmation`'s own `shouldWrite` (already
    // false for both the conflict and the destination-already-has-it
    // cases) governs whether a new destination entry is required, and
    // only once the source is confirmed to still hold the relationship.
    shouldWriteDestination: removalPlan.found && confirmationPlan.shouldWrite,
  };
}

// ---------------------------------------------------------------------
// [Checkpoint 5] Distinguishing-information capture (POL-0007
// "Conflicting Supplier Wording — Distinguishing Information: ACCEPT,
// Mandatory"; Rule 8 Finding 9)
// ---------------------------------------------------------------------
//
// Finding 9 fixes only the REQUIREMENT (a new product created in
// response to a flagged wording conflict must be gated on
// distinguishing information being provided) — AddStockView.tsx's
// existing, unmodified supplierWordingConflictPending validation
// already enforces that gate (Checkpoint 3). Finding 9 explicitly
// leaves the FIELD SHAPE to "ordinary implementation-time engineering
// judgment, not requiring further authorization at any governance
// layer" — a determination the Implementation Authorization's own §2
// quotes verbatim as one of its binding technical decisions, not merely
// a Rule 8 recommendation sitting outside it.
//
// Chosen shape (Checkpoint 5): captured on the resulting product's
// EXISTING product-created TimelineEvent, whose `details` field is
// already a free-form Record<string, string | number | undefined>
// (types.ts) — no new Product field, no new collection, no
// firestore.rules/indexes change, no migration. This is the pure,
// independently-testable construction of that event's description/
// details; AppContext.tsx's addMultipleStockBatches calls it once per
// newly-created product carrying distinguishing information.

export interface ProductCreatedTimelineEventContent {
  description: string;
  details: { productName: string; distinguishingInfo?: string };
}

/**
 * Builds the description/details for a product-created TimelineEvent,
 * appending the owner's distinguishing information when present (a
 * conflict-path new product, POL-0007) — identical, ordinary-new-product
 * wording otherwise, unchanged from this codebase's pre-existing
 * behavior.
 */
export function buildProductCreatedTimelineEventContent(
  productName: string,
  distinguishingInfo?: string
): ProductCreatedTimelineEventContent {
  const trimmedInfo = distinguishingInfo?.trim();
  return {
    description: trimmedInfo
      ? `"${productName}" foi adicionado como novo produto. Distinção: ${trimmedInfo}`
      : `"${productName}" foi adicionado como novo produto.`,
    details: {
      productName,
      ...(trimmedInfo ? { distinguishingInfo: trimmedInfo } : {}),
    },
  };
}

// ---------------------------------------------------------------------
// Owner-Controlled Correction — redirect "already gone" error, and the
// correction TimelineEvent content builder (Implementation Authorization
// §2.D, §2.E).
// ---------------------------------------------------------------------

/**
 * Thrown by AppContext's `redirectSupplierWordingRelationship` when the
 * transaction's fresh read finds the DESTINATION product no longer
 * exists (deleted concurrently). A redirect is an atomic, two-document
 * operation (Implementation Authorization §2.B/§3 item 4: "commit
 * together or neither commits") — unlike ordinary single-product
 * confirmation, where a missing target simply means "nothing to write"
 * with no other side effect, a redirect whose destination has vanished
 * must abort the ENTIRE operation, including the source-side removal,
 * rather than silently remove the source relationship with nowhere
 * for it to go. No write is made to source or destination.
 */
export class SupplierWordingRedirectDestinationNotFoundError extends Error {
  constructor() {
    super('The redirect destination product no longer exists — the redirect cannot proceed.');
    this.name = 'SupplierWordingRedirectDestinationNotFoundError';
  }
}

/**
 * Thrown by AppContext's `redirectSupplierWordingRelationship` when the
 * transaction's fresh read finds the source product no longer holds
 * the `(supplierRecordId, wording)` relationship the Owner asked to
 * redirect (`planSupplierWordingRedirect`'s own `sourceFound: false`).
 * A distinct, explicit non-success result — never silently reported as
 * a successful redirect, and never conflated with
 * `planSupplierWordingRemoval`'s own idempotent-success semantics for
 * direct removal (Implementation Authorization §2.D / §3 item 8).
 */
export class SupplierWordingRelationshipNotFoundError extends Error {
  constructor() {
    super('The supplier wording relationship no longer exists on the source product — nothing to redirect.');
    this.name = 'SupplierWordingRelationshipNotFoundError';
  }
}

export interface SupplierWordingCorrectionTimelineEventContent {
  description: string;
  details: {
    action: 'removed' | 'redirected';
    supplierRecordId: string;
    wording: string;
    oldProductName: string;
    newProductName?: string;
    // String, not boolean — TimelineEvent.details (types.ts) is typed
    // Record<string, string | number | undefined>, existing, shared
    // infrastructure this capability reuses unmodified (Implementation
    // Authorization §2.E/§5 — no new audit collection or mechanism).
    destinationAlreadyHasIt?: 'true';
  };
}

/**
 * Builds the description/details for a supplier-wording CORRECTION
 * TimelineEvent (removal or redirect) — mirroring
 * `buildProductCreatedTimelineEventContent`'s existing shape exactly
 * (Implementation Authorization §2.E). Pure, independently testable.
 * `destinationAlreadyHasIt` is included in `details` only on the
 * idempotent redirect branch (never for an ordinary redirect or a
 * removal), keeping the field additive and non-breaking for any
 * existing reader of `details` (Implementation Plan §4.4).
 */
export function buildSupplierWordingCorrectionTimelineEventContent(
  action: 'removed' | 'redirected',
  supplierRecordId: string,
  wording: string,
  oldProductName: string,
  newProductName?: string,
  destinationAlreadyHasIt?: boolean
): SupplierWordingCorrectionTimelineEventContent {
  const description =
    action === 'removed'
      ? `Relação de fornecedor removida: "${wording}" deixou de estar associado a "${oldProductName}".`
      : destinationAlreadyHasIt
        ? `Relação de fornecedor redirecionada: "${wording}" removido de "${oldProductName}" — "${newProductName}" já possuía esta relação.`
        : `Relação de fornecedor redirecionada: "${wording}" movido de "${oldProductName}" para "${newProductName}".`;

  return {
    description,
    details: {
      action,
      supplierRecordId,
      wording,
      oldProductName,
      ...(newProductName ? { newProductName } : {}),
      ...(destinationAlreadyHasIt ? { destinationAlreadyHasIt: 'true' as const } : {}),
    },
  };
}
