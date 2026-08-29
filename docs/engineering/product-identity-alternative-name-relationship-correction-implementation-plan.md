Implementation Plan — ACCEPTED AND AUTHORIZED

# Owner-Controlled Correction of a Remembered Supplier-Wording Relationship — Implementation Plan

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).** See
"Product Architect Acceptance," at the end of this document, for the
complete signed decision. **Lifecycle: DRAFT → ACCEPTED AND
AUTHORIZED.** This acceptance authorizes the Plan itself — it does
**not** authorize implementation. A separate, signed **Implementation
Authorization** remains required before any application code, test,
or schema is written. Not created here; not authorized by this
acceptance alone.

**Governing chain:**
[`BDR-0013`](../specs/BDR-0013-product-identity-alternative-name-memory.md)
(Approved) →
[`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(Approved) →
[the Amendment](../specs/product-identity-alternative-name-relationship-correction-amendment.md)
(✅ **ACCEPTED AND AUTHORIZED** — SABUSHIMIKE MASCENI, 29 August 2026)
→
[Rule 8 Assessment](./product-identity-alternative-name-relationship-correction-rule8-assessment.md)
(✅ **READY**) → **this Plan**.

**Baseline:** `main = origin/main = 9e048d324fd5a905ce2a81b1edc13613134f4b1c`
(verified via `git fetch`/`git status` immediately before drafting —
working tree clean, nothing untracked, before this document was
created). The Amendment's own cited baseline,
`736bb9bf3df3361588a6b73646245b619efd7dfc`, is confirmed an ancestor of
this commit (`git merge-base --is-ancestor`, re-checked this session).

**This document does not modify application code, tests, Firestore
rules, indexes, or schema.** It translates the READY Rule 8 Assessment
into a concrete, phased, file-by-file map for the eventual
Implementation Authorization to reference. Every technical choice the
Rule 8 Assessment explicitly left open (transaction shape, exact
function names/signatures, `TimelineActivityType` naming, UI
placement details) is resolved here as a **specific, reasoned Plan-level
proposal** — not a governance re-decision, per the Rule 8 Assessment's
own §9/§12 classification of these as Category 2 (ordinary engineering
judgment). Every such proposal remains open to Product Architect
override at Authorization.

---

## 1. Purpose / Governing Authorization

This Plan translates the Amendment's authorized business capability —
Owner-controlled removal and redirect of a remembered
`SupplierWordingRelationship` — into concrete engineering scope. It
covers the **complete, unified capability** (removal and redirect
together, per the Amendment's own "serve the same accepted business
capability" framing and the explicit instruction not to split them
into separate governance lineages).

## 2. Scope

**In scope:**

A. Owner-controlled **removal** of a remembered
   `(supplierRecordId, wording)` relationship from a `Product`.
B. Owner-controlled **redirect** of that relationship to a different,
   existing `Product`, via one atomic Firestore transaction.
C. The **Product Catalog/detail** surface (`ProductDetailModal.tsx`)
   as the sole authorized entry point.
D. A mandatory `TimelineEvent` for every successful correction.
E. Confirmation that existing recognition/REMEMBER behavior
   (`resolveSupplierWordingRecognition`) naturally reflects the
   corrected state on its next invocation, with no separate cache-
   invalidation mechanism required.

**Out of scope (unchanged, per the Amendment §6/§7 and Rule 8 §3/§11):**

- `Product.name`, `Product.id`, `unitRelationship`, `costPrice`,
  `sellingPrice`, Business Worth, Stock Count (including Initial
  Stock), or any Product field other than `supplierWordings`.
- The Add Stock / Smart Stock Entry establishing flow and
  `confirmSupplierWordingRelationship`'s existing behavior — reused as
  a source of pure logic (`planSupplierWordingConfirmation`,
  `SupplierWordingConflictError`), never modified.
- Product Recognition Intelligence's candidate-generation functions
  (`detectSupplierWordingCandidates`, `detectSupplierWordingContradictions`)
  — read, never edited.
- Any new Firestore collection, index, or `firestore.rules` change.
- Any automatic, AI-driven, confidence-based, or background
  correction mechanism.
- A new top-level route or Product Catalog screen redesign.

## 3. Current Architecture — Reconfirmed Fresh, This Session

Re-verified directly against the baseline commit, not assumed from the
prior Rule 8 Assessment session:

- `SupplierWordingRelationship` (`types.ts` ~366–372): inline,
  `{ supplierRecordId, wording, confirmedAt, provenance?,
  confirmedByName? }`, no `id` field. Stored on `Product.supplierWordings?:
  SupplierWordingRelationship[]` (~427), an inline array, not a
  subcollection.
- `planSupplierWordingConfirmation` (`supplierWordingConfirmation.ts`
  ~77–110): pure. Given a target product id, `supplierRecordId`,
  `wording`, and an array of `CheckedProductWordingSnapshot`, returns
  `{ alreadyConfirmed, conflict, shouldWrite }`. Identity key
  throughout: `(supplierRecordId, wording.trim())`.
- `SupplierWordingConflictError` (~119–126): thrown with the
  conflicting product's id.
- `confirmSupplierWordingRelationship` (`AppContext.tsx` ~2638–2694):
  a `runTransaction` that reads the target plus every
  `conflictCheckProductIds` entry **fresh, inside the transaction**,
  calls `planSupplierWordingConfirmation`, and on `shouldWrite` appends
  the new relationship via `tx.update`. **Not exposed on the
  `AppContext` value/interface** — confirmed absent from the
  interface block (~795–810) and the returned provider value
  (~6375–6412); its only call site is internal, inside
  `addMultipleStockBatches` (~3038–3053).
- `updateProduct` (~5864–5870): a bare `updateDoc`, no transaction, no
  fresh read — confirmed unsafe for any read-modify-write on
  `supplierWordings` (lost-update risk under concurrency).
- `resolveSupplierWordingRecognition` (`supplierWordingRecognition.ts`
  ~130–157): derives `confirmedRelationships` by flat-mapping over
  `existingProducts[].supplierWordings` **fresh on every call**, no
  cache — `existingProducts` is populated from `AppContext`'s
  `products` state, itself kept current by a live `onSnapshot`
  listener (~1570–1584).
- `ProductDetailModal.tsx` (415 lines, full file re-read): the
  existing, single Product Catalog/detail surface; receives the full
  `Product` object and already consumes `updateProduct`, `deleteProduct`,
  `deleteQuebra` via `useApp()`. Zero references to `supplierWordings`
  today. Existing destructive-action pattern:
  `window.confirm(...)` → `setIsX(true)` → `try { await op(); onClose(); }
  catch (err: any) { alert(err?.message || '...'); } finally {
  setIsX(false); }` (see `handleDeleteProduct`, `handleInactivateProduct`).
- `EditProductModal.tsx` (194 lines, full file re-read): edits
  `name`/`category`/`supplier`/`sku`/`barcode`/`costPrice`/`sellingPrice`
  only; zero references to `supplierWordings`; not touched by this
  Plan.
- `AddQuebraView.tsx` (~253–263): existing precedent for "pick another
  existing product" — a plain `<select>` bound to the in-memory
  `products` array. Directly reusable pattern for the redirect
  destination picker; no new picker component is required.
- `firestore.rules`: `/businesses/{businessId}/products/{productId}`
  (451–465) — `allow update, delete: if isOwnerOf(businessId);`,
  unconditional on which fields change. `/timelineEvents/{timelineEventId}`
  (1459–1464) — `allow create: if isMemberOf(businessId);`. Neither
  requires a change.
- `TimelineActivityType` (`types.ts` ~1694–1739): closed string-literal
  union; `business-worth-correction` is the direct precedent for an
  "Owner corrects a previously recorded state" event type already in
  this union. `logTimelineEvent` (`AppContext.tsx` ~2336–2404) is
  already generic over `type`/`details` — no modification needed to
  accept a new value.
- `tests/supplier-wording-confirmation-concurrency.test.ts`: full file
  re-read — direct structural precedent (fresh in-transaction reads
  across a dynamic product set, `Promise.allSettled` contention
  harness, `RulesTestEnvironment` against `firestore.rules`) for the
  new concurrency tests this Plan requires (§14).
- No React component test harness exists in this repository (no
  jsdom, no `@testing-library/react` — reconfirmed this session by
  the same absence already noted in the existing concurrency test
  file's own header). This bounds what "UI wiring test" can mean in
  §15.

## 4. Implementation Design

### 4.1 Core design decision — the redirect transaction

Per Rule 8 §2D/§10 and the technical direction above, this Plan
specifies **one atomic Firestore transaction** for redirect, composing
removal (source) and establishment (destination) as a single
`runTransaction` call. The naive approach — call the existing
removal logic, then separately call `confirmSupplierWordingRelationship`
— is **rejected**: `confirmSupplierWordingRelationship` opens its own,
separate transaction, which would make removal and establishment two
independent commits, not one atomic operation, and would not satisfy
"both must succeed or neither must change."

**The one subtlety this composition must get right:** the source
product legitimately already holds the relationship being moved — it
must never be treated as a "conflicting product" against the
destination's establishment. A naive reuse of
`planSupplierWordingConfirmation` that includes the source product in
`checkedProducts` for the destination's plan would incorrectly flag it
as a conflict (its own `conflictingProduct` check does not know that
one of the checked products is expected to hold the relationship
because it is mid-transfer, not a rival claimant). The design below
excludes the source product from the destination's own
conflict-check set for exactly this reason, while still using the
source product's own fresh snapshot to compute the removal half.

### 4.2 New pure decision functions (`supplierWordingConfirmation.ts`)

Extending the existing file, alongside `planSupplierWordingConfirmation`
— reusing its exported `CheckedProductWordingSnapshot` shape, never
duplicating it:

```ts
export interface SupplierWordingRemovalPlan {
  /** True when the target product's CURRENT (fresh) supplierWordings
   * array contains this exact (supplierRecordId, wording) pair. */
  found: boolean;
  /** The target's supplierWordings array with that one entry removed
   * (or, when `found` is false, an unchanged copy — never mutates the
   * input array). Every other entry is preserved, in order. */
  updatedWordings: Array<{ supplierRecordId: string; wording: string; confirmedAt: string; provenance?: 'system-proposed' | 'owner-initiated'; confirmedByName?: string }>;
}

export function planSupplierWordingRemoval(
  supplierRecordId: string,
  wording: string,
  target: { supplierWordings: Array<{ supplierRecordId: string; wording: string; confirmedAt: string; provenance?: 'system-proposed' | 'owner-initiated'; confirmedByName?: string }> }
): SupplierWordingRemovalPlan
```

Pure, dependency-free, unit-testable against plain objects — same
discipline this file's existing header comment already establishes for
`planSupplierWordingConfirmation`.

```ts
export interface SupplierWordingRedirectPlan {
  /** Whether the source product's fresh snapshot actually held the
   * relationship being moved. False means "already gone" — the
   * caller must treat this as an idempotent no-op on the source side,
   * never an error (Rule 8 Scenario: "already-absent source
   * relationship"). */
  sourceFound: boolean;
  /** Set when a THIRD product (neither source nor destination)
   * already independently holds this exact pair — reusing
   * planSupplierWordingConfirmation's own conflict semantics exactly,
   * scoped to exclude the source product deliberately (§4.1). */
  conflict: { productId: string } | null;
  /** True when the destination already independently holds this exact
   * pair (a pre-existing anomaly, not created by this operation) —
   * idempotent: no destination write needed, source removal still
   * proceeds. */
  destinationAlreadyHasIt: boolean;
  /** Source's supplierWordings with the entry removed (unchanged copy
   * if !sourceFound). */
  updatedSourceWordings: Array<{ supplierRecordId: string; wording: string; confirmedAt: string; provenance?: 'system-proposed' | 'owner-initiated'; confirmedByName?: string }>;
  /** True only when a new entry must be appended to the destination. */
  shouldWriteDestination: boolean;
}

export function planSupplierWordingRedirect(
  sourceProductId: string,
  destinationProductId: string,
  supplierRecordId: string,
  wording: string,
  sourceSnapshot: CheckedProductWordingSnapshot,
  destinationAndOtherSnapshots: CheckedProductWordingSnapshot[] // destination + any additional conflict-check products; MUST NOT include sourceProductId
): SupplierWordingRedirectPlan
```

Internally composes `planSupplierWordingRemoval` (for the source half)
and `planSupplierWordingConfirmation` (for the destination half, called
with `destinationAndOtherSnapshots` only — the caller's contract
excludes the source, exactly the composition described in §4.1). This
is reuse, not reimplementation, of the existing conflict decision —
satisfying the explicit "do not silently invent a new conflict
mechanism" instruction.

### 4.3 New transaction-body functions (`AppContext.tsx`)

**`removeSupplierWordingRelationship(productId, supplierRecordId,
wording): Promise<void>`**

- Resolves `businessId` from `activeBusinessId`, mirroring
  `updateProduct`'s own existing pattern.
- `runTransaction`: reads the target product fresh (`tx.get`); if the
  snapshot's `exists()` is false (product deleted concurrently — see
  §12), makes no write and resolves as a no-op, mirroring
  `confirmSupplierWordingRelationship`'s own existing `snap.exists()`
  check. Otherwise calls `planSupplierWordingRemoval`, and — regardless
  of `found` — writes `{ supplierWordings: plan.updatedWordings }` via
  `tx.update` only when `found` is `true` (a no-op transaction commit
  is avoided when nothing changed, mirroring
  `confirmSupplierWordingRelationship`'s own "no-op when nothing to
  write" discipline). Idempotent by construction: a retried removal
  call finds `found: false` (or the product already gone) on its
  second attempt and does nothing.
- Never touches any field other than `supplierWordings`.
- Does not itself call `logTimelineEvent` — the caller (UI layer, via
  a thin wrapper — see §4.5) is responsible for logging exactly once,
  only after the awaited call resolves without throwing, mirroring
  every other existing call site's own "log after success" discipline
  (e.g. `addMultipleStockBatches`'s own sequencing of writes before
  `logTimelineEvent`).

**`redirectSupplierWordingRelationship(sourceProductId,
destinationProductId, supplierRecordId, wording,
additionalConflictCheckProductIds): Promise<void>`**

- Resolves `businessId` the same way.
- `runTransaction`: reads the source product, the destination product,
  and every id in `additionalConflictCheckProductIds` fresh, inside
  the transaction — mirroring `confirmSupplierWordingRelationship`'s
  own multi-document read pattern exactly.
- Calls `planSupplierWordingRedirect` with the source snapshot
  separated from the rest (§4.2's contract).
- If `plan.conflict` is set, throws `SupplierWordingConflictError`
  (the existing, reused class — never a new error type) with the
  conflicting product's id.
- If `!plan.sourceFound`, the transaction makes no write of any kind —
  the destination-establishment half is skipped entirely, since there
  is nothing to move (the source no longer holds the relationship,
  most likely because a concurrent operation already removed or
  redirected it). This Plan proposes surfacing this outcome to the
  caller as a distinct, explicit result (e.g. a resolved value or a
  dedicated thrown `SupplierWordingRelationshipNotFoundError`,
  Plan-level naming choice, Category 2) rather than a silent no-op, so
  the UI can tell the Owner the relationship was already gone rather
  than falsely implying the redirect succeeded.
- Otherwise: `tx.update` the source with `plan.updatedSourceWordings`;
  if `plan.shouldWriteDestination`, `tx.update` the destination with
  its existing array plus the new relationship entry (constructed the
  same way `confirmSupplierWordingRelationship` already constructs
  one: `{ supplierRecordId, wording: trimmed, confirmedAt: new
  Date().toISOString(), provenance: 'owner-initiated',
  ...(userProfile?.name ? { confirmedByName: userProfile.name } : {})
  }` — `provenance` is always `'owner-initiated'` for a correction,
  never `'system-proposed'`, since this is by definition an explicit
  Owner action).
- Both writes commit together or neither does — ordinary Firestore
  transaction atomicity, no additional mechanism required.

**`additionalConflictCheckProductIds` — Plan-level proposal:** since
the Product Catalog/detail surface has the full `products` array
already loaded client-side (via the existing `onSnapshot` listener,
§3), this Plan proposes computing this list, before calling the
transaction, as every product **other than source and destination**
whose already-loaded `supplierWordings` appears to hold the exact
`(supplierRecordId, wording)` pair. Under the existing invariant
(`BDR-0013` item 5; enforced by `planSupplierWordingConfirmation`'s own
conflict check on every prior write), this list should be empty or
have at most one entry in the overwhelming majority of real states —
this is a defensive, already-loaded-data check, not a new collection
scan, and keeps the transaction's read count small and bounded, the
same bounded-read discipline `confirmSupplierWordingRelationship`
already establishes for the ordinary confirmation case.

### 4.4 New `TimelineActivityType` value

One additive union member, `'supplier-wording-relationship-corrected'`
— covering **both** removal and redirect, distinguished via `details`,
mirroring how `business-worth-correction` already represents a single
"Owner corrects a previously recorded state" concept in this same
union without needing separate remove/redirect-specific type values.
This is a Plan-level naming proposal (Category 2, per Rule 8 §9); a
two-value split (`'supplier-wording-relationship-removed'` /
`'supplier-wording-relationship-redirected'`) is an equally valid
Authorization-time alternative and does not change anything else in
this Plan's design.

**Minimum `details` content** (free-form
`Record<string, string | number | undefined>`, no schema change):

| Field | Removal | Redirect |
|---|---|---|
| `action` | `'removed'` | `'redirected'` |
| `supplierRecordId` | ✓ | ✓ |
| `wording` | ✓ | ✓ |
| `oldProductId` / `oldProductName` | the product it was removed from | the source product |
| `newProductId` / `newProductName` | — (absent) | the destination product |
| `destinationAlreadyHasIt` | — (absent) | `true` only on the idempotent branch (§4.2's `destinationAlreadyHasIt`) — records, for audit transparency, that no new entry was written to the destination because it already independently held the relationship; absent (not `false`) on the ordinary redirect branch, keeping the field additive and non-breaking for existing readers of `details` |

A new pure builder function, mirroring
`buildProductCreatedTimelineEventContent`'s existing shape and test
pattern (`tests/supplier-wording-distinguishing-info.test.ts`) exactly:

```ts
export interface SupplierWordingCorrectionTimelineEventContent {
  description: string;
  details: { action: 'removed' | 'redirected'; supplierRecordId: string; wording: string; oldProductName: string; newProductName?: string; destinationAlreadyHasIt?: true };
}

export function buildSupplierWordingCorrectionTimelineEventContent(
  action: 'removed' | 'redirected',
  supplierRecordId: string,
  wording: string,
  oldProductName: string,
  newProductName?: string,
  destinationAlreadyHasIt?: true
): SupplierWordingCorrectionTimelineEventContent
```

This addition is consistent with the Plan's existing audit contract
(§10): it adds one optional, additive field to an already free-form
`details: Record<string, string | number | undefined>` — no schema
change, no new `TimelineActivityType`, no change to `logTimelineEvent`
itself.

`userName` (actor) and `businessId`-scoped path are already handled
generically by `logTimelineEvent` — no change needed there (§3).

### 4.5 Context-exposure decision

Per Rule 8's own flagged question ("expose the existing operation, or
introduce a narrowly scoped equivalent"): this Plan proposes **neither
exposing `confirmSupplierWordingRelationship` as-is, nor generalizing
it**. It takes a `provenance` parameter and a caller-supplied
`conflictCheckProductIds` list shaped around the Add-Stock candidate
flow — exposing it directly would hand the UI layer more surface area
(arbitrary provenance, arbitrary conflict-check scoping) than a
correction action needs. Instead, the two new, narrowly-scoped
functions above (`removeSupplierWordingRelationship`,
`redirectSupplierWordingRelationship`) are added to the `AppContext`
value interface (~803, alongside `updateProduct`/
`confirmProductUnitRelationship`) and the returned provider object
(~6389, immediately after `confirmProductUnitRelationship,`) — each
does exactly one thing, takes only the parameters a correction UI
actually has, and internally reuses the same pure decision functions
and error class the existing confirmation path already uses. This
satisfies "do not expose more authority than necessary" directly.

## 5. Checkpoint / Phased Implementation Sequence

Phasing is a Category 2 (implementation-level) decision, per Rule 8
§9/§12 — not a return to the Product Architect gate. The capability
remains a single governance lineage; checkpoints sequence engineering
risk only.

**Checkpoint 1 — Pure domain decision functions + transaction design**
- `planSupplierWordingRemoval`, `planSupplierWordingRedirect`
  (§4.2) added to `supplierWordingConfirmation.ts`.
- `removeSupplierWordingRelationship`,
  `redirectSupplierWordingRelationship` transaction bodies (§4.3)
  added to `AppContext.tsx`, exposed on the context interface/value
  (§4.5) — **not yet wired to any UI**.
- New `TimelineActivityType` value (§4.4) and
  `buildSupplierWordingCorrectionTimelineEventContent` builder added,
  **not yet called** from the new transaction functions (kept separate
  per §4.3's "caller logs after success" discipline — wiring happens
  at Checkpoint 4 once the calling UI exists, though the builder and
  type additions are pure/additive and safe to land here).
- Pure-function tests (§6, items 1–2 in §14/§15) land in this
  checkpoint; no live-emulator test yet.
- Zero UI change. Fully additive; a revert at this stage touches only
  new, unused code paths.

**Checkpoint 2 — Owner-only `ProductDetailModal` read/display + removal**
- `ProductDetailModal.tsx` extended with a new section (rendered only
  when `product.supplierWordings?.length`) listing each remembered
  relationship (supplier name resolved from the already-loaded
  `suppliers`/`SupplierRecord` list by `supplierRecordId`, plus the
  `wording` text) with a per-entry "remove" action, following the
  existing `window.confirm` → `setIsX(true)` → `try/catch/finally`
  pattern already used by `handleDeleteProduct`/
  `handleInactivateProduct` in the same file.
- On success: calls `logTimelineEvent` with the new activity type and
  the removal-shaped `details` from §4.4.
- No redirect UI yet in this checkpoint.
- Concurrency/pure-decision tests for removal (§14 item 1, §15 items
  3, 5–7, 9) complete by end of this checkpoint.

**Checkpoint 3 — Redirect + existing confirmation/conflict composition**
- `ProductDetailModal.tsx` extended further: a per-entry "redirect"
  action opens an inline destination picker — a plain `<select>` over
  `products` excluding the current product (§3's `AddQuebraView.tsx`
  precedent), followed by an explicit confirm step, followed by the
  `redirectSupplierWordingRelationship` call.
- Error surfacing: a thrown `SupplierWordingConflictError` is caught
  and shown via the existing `alert(err?.message || ...)` pattern,
  naming the conflicting product where the message allows (Plan-level
  UX detail, Category 2).
- On success: `logTimelineEvent` with the redirect-shaped `details`.
- Redirect-specific concurrency/pure-decision tests (§14 items 2–5,
  §15 items 4, 6) complete by end of this checkpoint.

**Checkpoint 4 — Timeline audit completeness + full integration/regression/concurrency verification**
- Full test suite from §15 run together: cancellation (no write, no
  event), PRI regression, unrelated-field-unchanged regression,
  tenant-isolation, Owner-only authorization, post-removal and
  post-redirect REMEMBER behavior (§7).
- Manual/QA verification of the `ProductDetailModal` UI flow end to
  end (§15 — no automated component-test harness exists in this
  repository, confirmed §3).

## 6. Exact Files Expected to Change

- `apps/tenant/src/lib/supplierWordingConfirmation.ts` — add
  `planSupplierWordingRemoval`, `planSupplierWordingRedirect`,
  `buildSupplierWordingCorrectionTimelineEventContent`, and their
  exported types.
- `apps/tenant/src/context/AppContext.tsx` — add
  `removeSupplierWordingRelationship`,
  `redirectSupplierWordingRelationship`; add both to the context
  interface (~803) and the returned provider value (~6389); no change
  to any existing function's body or signature.
- `apps/tenant/src/types.ts` — one additive
  `TimelineActivityType` union member
  (`'supplier-wording-relationship-corrected'`, or the two-value split
  noted in §4.4, at Authorization's discretion).
- `apps/tenant/src/components/ProductDetailModal.tsx` — new section
  (supplier-wording list, remove action, redirect action), new local
  `useState` for the section's own loading/error state, new imports
  (`removeSupplierWordingRelationship`,
  `redirectSupplierWordingRelationship`, `suppliers`/`SupplierRecord`
  lookup already available via `useApp()` if not already destructured).

**No change to:** `apps/tenant/src/lib/supplierWordingMatching.ts`,
`apps/tenant/src/lib/supplierWordingRecognition.ts`,
`apps/tenant/src/components/EditProductModal.tsx`,
`apps/tenant/src/components/AddStockView.tsx`, `firestore.rules`,
`firestore.indexes.json`.

## 7. Exact Files Expected to Be Added

- `tests/supplier-wording-removal.test.ts`
- `tests/supplier-wording-redirect.test.ts`
- `tests/supplier-wording-correction-concurrency.test.ts`
- `tests/supplier-wording-correction-audit.test.ts`

**Possible, at implementation-time discretion (Category 2, not
mandated):** a small local subcomponent file (e.g.
`ProductDetailModal.SupplierWordingSection.tsx`) if inlining the new
section keeps `ProductDetailModal.tsx` from becoming unwieldy — the
Amendment's "do not create an unrelated correction subsystem"
boundary is about scope, not about forbidding an ordinary
extract-a-sub-component refactor local to this one modal; if used, it
remains rendered exclusively from within `ProductDetailModal.tsx`,
not from a new route.

## 8. Data-Flow / Transaction Behavior

**Removal:**
```
Owner clicks "Remove" on one relationship row
  → window.confirm
  → removeSupplierWordingRelationship(productId, supplierRecordId, wording)
      → runTransaction:
          tx.get(product)                         [fresh read]
          planSupplierWordingRemoval(...)          [pure]
          if found: tx.update(product, { supplierWordings: updated })
          else: no write (idempotent)
  → on resolve: logTimelineEvent(action: 'removed', ...)
  → on reject: alert(err.message)
```

**Redirect:**
```
Owner clicks "Redirect" on one relationship row
  → picks destination product (<select>, existing products excl. self)
  → explicit confirm step
  → redirectSupplierWordingRelationship(sourceId, destinationId, supplierRecordId, wording, additionalConflictCheckProductIds)
      → runTransaction:
          tx.get(source), tx.get(destination), tx.get(each additional id)  [all fresh]
          planSupplierWordingRedirect(...)          [pure; reuses planSupplierWordingConfirmation internally, source excluded from destination's conflict-check set]
          if conflict: throw SupplierWordingConflictError
          if !sourceFound: surface "already gone" outcome, no writes
          else:
            tx.update(source, { supplierWordings: updatedSourceWordings })
            if shouldWriteDestination: tx.update(destination, { supplierWordings: [...existing, newEntry] })
  → on resolve: logTimelineEvent(action: 'redirected', ...)
  → on reject (conflict or other): alert(err.message)
```

Both operations touch only the `supplierWordings` field of the
document(s) involved; every other field is read but never rewritten
(Firestore's `tx.update` with a single named field never touches
sibling fields).

## 9. UI Behavior

Confirmed against `ProductDetailModal.tsx`'s existing conventions
(§3):

1. **See:** a new section, visible only when
   `product.supplierWordings?.length > 0`, listing each relationship —
   supplier (resolved by `supplierRecordId`) and `wording` text.
2. **Identify:** each row shows supplier name + wording directly, no
   additional lookup screen.
3. **Remove:** a `Trash2`-icon button per row (matching the existing
   quebra-removal icon/pattern in the same file), gated by
   `window.confirm`.
4. **Redirect:** a second per-row action opening an inline `<select>`
   (existing `products`, excluding the current product) plus its own
   explicit confirm step before the transaction call — never a
   single-click action, matching this file's existing "destructive/
   consequential action needs an explicit confirm" discipline.
5. **Feedback:** success closes the inline redirect/remove affordance
   and the row updates (or disappears, for removal) via the existing
   live `products` `onSnapshot` listener — no manual local-state
   patch needed, since the modal already re-renders from the `product`
   prop's owning list. Errors use the existing
   `alert(err?.message || '...')` pattern, consistent with every other
   action in this file.
6. **Cancel:** closing the `<select>`/confirm step without confirming
   performs no context call at all — no write, no `TimelineEvent`, per
   the "Cancellation" REMEMBER-behavior requirement (§10 below).

## 10. Audit Behavior

Exactly one `TimelineEvent` per successful correction (never on
cancellation, never on a thrown/caught error), via the existing
`logTimelineEvent` (§3, §4.4) — no new collection, no new
transactional audit mechanism. The audit write follows this
codebase's existing, already-accepted best-effort pattern: it is
sequenced strictly after the correction's own transaction has already
resolved, and its own internal `try/catch` (already present in
`logTimelineEvent`) means an audit-write failure never rolls back or
misreports the correction itself — identical to every other existing
call site's behavior, not a new risk introduced by this capability.

## 11. Security / Tenant Isolation

Both new transaction functions operate exclusively within
`businesses/{businessId}/products/{productId}`, resolving `businessId`
from `activeBusinessId` the same way `updateProduct` already does —
never accepting a caller-supplied `businessId` from the UI layer, and
never reading or writing any path outside the active business. The
existing `firestore.rules` `allow update, delete: if
isOwnerOf(businessId);` on `/products/{productId}` already gates every
write either function makes; no rule is added, weakened, or bypassed.
`/timelineEvents/{timelineEventId}`'s existing `allow create: if
isMemberOf(businessId);` already covers the new event type with no
change. No server route is introduced — both operations remain direct
client-SDK Firestore transactions, identical in authorization shape to
`confirmSupplierWordingRelationship`/`updateProduct` today.

## 12. Failure Modes and Recovery

| Failure | Behavior |
|---|---|
| Connection drops mid-transaction (either operation) | Firestore's own atomicity — no partial write; state unchanged, safe to retry |
| Removal retried after already succeeding | `found: false` on the retry → no-op, no error |
| Removal target product deleted concurrently | Fresh `tx.get` on the target reflects non-existence; the transaction body checks `exists` before calling `planSupplierWordingRemoval` (mirroring `confirmSupplierWordingRelationship`'s own existing `snap.exists()` check) and makes no write when the product is gone — treated the same as `found: false`, never an error, since there is nothing left to correct |
| Redirect's source already gone (concurrently removed/redirected) | `sourceFound: false` → explicit "already gone" outcome surfaced to caller (§4.3), no writes, no false-success |
| Redirect target conflict (third product independently holds the pair) | `SupplierWordingConflictError` thrown, caught by UI, `alert`-surfaced — no write to either source or destination |
| Redirect destination deleted concurrently | Fresh `tx.get` on destination reflects non-existence; `planSupplierWordingConfirmation`'s existing `!!target?.exists` guard (reused via `planSupplierWordingRedirect`) prevents writing to a nonexistent document — Plan proposes surfacing this the same way as a conflict/not-found outcome, Category 2 naming detail |
| `logTimelineEvent` write fails after a successful correction | Correction stands; audit write logs its own error via its existing internal `try/catch` — pre-existing, accepted pattern (§10), not new |
| Owner cancels before confirming | No context call made at all — no partial state of any kind |

## 13. Concurrency Strategy

Both new transaction functions follow
`confirmSupplierWordingRelationship`'s already-proven shape exactly:
every document read fresh, inside the transaction, immediately before
the decide-then-write step; no plain `updateDoc` of a client-computed
array anywhere in either path. `tests/supplier-wording-confirmation-concurrency.test.ts`
is the direct structural precedent — the new
`tests/supplier-wording-correction-concurrency.test.ts` (§7, §14)
mirrors its two-scenario pattern (same-target race;
different-target race) plus the additional scenarios the redirect
composition specifically introduces (§14).

## 14. Test Plan — Concurrency (Emulator-Dependent)

New file `tests/supplier-wording-correction-concurrency.test.ts`,
directly mirroring `tests/supplier-wording-confirmation-concurrency.test.ts`'s
structure (`RulesTestEnvironment`, `firestore.rules` loaded fresh,
`Promise.allSettled` contention harness). **Requires a live Firestore
emulator** (`npm run test:...:emulator`, per the existing file's own
documented run instructions) — **not runnable in this sandbox**,
exactly as already true and already documented for the existing
concurrency test file (its own header explains the `storage.googleapis.com`
egress block). Scenarios:

1. Two concurrent removals of the **same** relationship on the same
   product — both must resolve without throwing; exactly zero matching
   entries remain (not a race that leaves one or duplicates an error).
2. Two concurrent removals of **different** relationships on the
   **same** product — both must succeed; both entries end up removed,
   neither removal undoes the other (the lost-update case §3/§4.3
   guards against).
3. Two concurrent redirects of the **same** relationship to
   **different** destination products — exactly one must win
   (fulfilled), the other must reject with
   `SupplierWordingConflictError` or the "already gone"
   outcome (§12), depending on ordering; final state has the
   relationship on exactly one product, never zero, never two.
4. Destination product deleted concurrently with a redirect targeting
   it — the redirect must fail safely (no write to a nonexistent
   document), mirroring `plan.shouldWrite`'s existing `!!target?.exists`
   guard reused via `planSupplierWordingRedirect`.
5. Source relationship already absent when a redirect is attempted
   (e.g. removed by a concurrent operation a moment earlier) — the
   "already gone" outcome (§12), not a thrown error masquerading as a
   conflict.
6. Destination already independently holds the exact relationship
   (pre-existing anomaly) at the moment of redirect — idempotent:
   source removal still proceeds, no duplicate entry is created on the
   destination.

## 15. Test Plan — Full Coverage Map

| # | Requirement | File | Runnable in sandbox? |
|---|---|---|---|
| 1 | Pure removal decision logic | `tests/supplier-wording-removal.test.ts` (new) | Yes |
| 2 | Pure redirect decision logic | `tests/supplier-wording-redirect.test.ts` (new) | Yes |
| 3 | Successful removal | `tests/supplier-wording-removal.test.ts` | Yes (pure-function level); emulator-level covered by §14 item 1 |
| 4 | Successful redirect | `tests/supplier-wording-redirect.test.ts` | Yes (pure-function level); emulator-level covered by §14 item 3 |
| 5 | Idempotent removal | `tests/supplier-wording-removal.test.ts` (`found: false` case) | Yes |
| 6 | Conflict prevention | `tests/supplier-wording-redirect.test.ts` (`conflict` case, reusing `planSupplierWordingConfirmation`'s existing conflict fixture pattern) | Yes |
| 7 | Tenant isolation | Reasoning proof in this Plan (§11) + existing `firestore.rules` test harness pattern extended in `tests/supplier-wording-correction-concurrency.test.ts` (a cross-tenant write attempt is structurally impossible since `businessId` is never caller-supplied — no new rules test is strictly required, but one may be added defensively) | Emulator |
| 8 | Owner-only authorization | New assertion in `tests/supplier-wording-correction-concurrency.test.ts` (or a dedicated small rules-test file): a Staff-tier auth context attempting the same `supplierWordings`-only `update` is rejected by the existing `isOwnerOf(businessId)` rule — extends, not replaces, existing coverage | Emulator |
| 9 | Cancellation | Manual/QA — no context call is made on cancel, so there is nothing to assert against a live backend; documented as a UI-logic invariant, not a backend test (§9 item 6) | Not applicable (no automated harness for this repo's UI, §3) |
| 10 | TimelineEvent generation | `tests/supplier-wording-correction-audit.test.ts` (new), mirroring `tests/supplier-wording-distinguishing-info.test.ts`'s existing `buildProductCreatedTimelineEventContent` test pattern for the new `buildSupplierWordingCorrectionTimelineEventContent` builder | Yes |
| 11 | Concurrent operations | `tests/supplier-wording-correction-concurrency.test.ts` (§14, all 6 scenarios) | Emulator only |
| 12 | `ProductDetailModal` UI wiring | Manual/QA verification only — this repository has no jsdom/`@testing-library/react` harness (confirmed §3, and already noted by the pre-existing concurrency test file's own header) | Not automatable in this repo today |
| 13 | Post-removal recognition behavior | `tests/supplier-wording-matching.test.ts` (extended) — a regression case constructing a product whose `supplierWordings` no longer contains a given pair and asserting `findExistingSupplierWordingMatch` returns `null`, falling through to `detectSupplierWordingCandidates` | Yes |
| 14 | Post-redirect REMEMBER behavior | `tests/supplier-wording-matching.test.ts` (extended) — a regression case asserting `findExistingSupplierWordingMatch` finds the pair on the destination product once present there | Yes |
| 15 | PRI regression | `tests/supplier-wording-matching.test.ts` (extended) — assert `detectSupplierWordingCandidates`/`detectSupplierWordingContradictions` are called with, and behave identically against, the exact same `existingProducts` shape before and after a simulated correction (no new parameter, no new call site) | Yes |
| 16 | Unrelated Product fields unchanged | `tests/supplier-wording-removal.test.ts` / `-redirect.test.ts` — assert `updatedWordings`/`updatedSourceWordings` never touch any field other than `supplierWordings`, by construction (the pure functions never receive or return other fields) — the transaction-level guarantee (only `supplierWordings` is ever passed to `tx.update`) is additionally covered by §14's emulator tests reading back the full document | Yes (pure) + Emulator (full document) |

**Existing test files extended, not replaced:**
`tests/supplier-wording-matching.test.ts` (items 13–15). Existing
files **left running unmodified as regression baselines**:
`tests/supplier-wording-add-stock.test.ts`,
`tests/supplier-wording-confirmation-concurrency.test.ts`,
`tests/supplier-wording-distinguishing-info.test.ts`,
`tests/supplier-wording-draft-abandonment.test.ts`,
`tests/supplier-wording-smart-stock-entry.test.ts`.

## 16. Regression Protection

- `confirmSupplierWordingRelationship`, `planSupplierWordingConfirmation`,
  and `SupplierWordingConflictError` are **reused, never modified** —
  every existing test covering them continues to exercise identical
  code.
- `detectSupplierWordingCandidates`/`detectSupplierWordingContradictions`
  (PRI) receive no new parameter and are not called from either new
  transaction function — §15 item 15 makes this an explicit,
  checked assertion rather than an inference.
- `resolveSupplierWordingRecognition` is not modified; its existing
  fresh-read-no-cache design is what already makes §7's REMEMBER
  guarantees hold, verified rather than assumed (§15 items 13–14).
- `EditProductModal.tsx`, `AddStockView.tsx`, `firestore.rules`,
  `firestore.indexes.json` are untouched — no regression surface is
  introduced in any of them.

## 17. Rollback Strategy

Every checkpoint (§5) is additive:

- **Checkpoint 1:** new pure functions and new, unexposed-until-later
  transaction functions — reverting removes only new, unused code.
- **Checkpoint 2:** adds a UI section and one new context call site;
  reverting removes the section and the removal call, leaving
  Checkpoint 1's functions dormant but harmless.
- **Checkpoint 3:** adds the redirect UI/call; reverting removes it
  independently of Checkpoint 2's removal UI (they are separate
  per-row actions, not entangled).
- **Checkpoint 4:** test-only; no application-code rollback
  implication.

No checkpoint modifies the signature or behavior of any pre-existing,
shipped function — every rollback is a plain code revert with no data
migration, since no schema or stored-data shape ever changes (§6, §11
of the Rule 8 Assessment already established this; this Plan
introduces nothing that changes it).

## 18. Explicit Out-of-Scope List

Carried forward verbatim from the Amendment §7 and Rule 8 §3/§11 —
nothing in this Plan authorizes or requires any of the following:

- Automatic, AI-driven, or confidence-based correction of any kind.
- Any background, scheduled, or batch correction process.
- Any cross-tenant operation.
- Any change to `Product.name`, `Product.id`, Business Worth, Stock
  Count/finalization, `unitRelationship`, or Product Memory pricing.
- Any redesign of Product Memory beyond this narrow capability.
- Automatic product merging.
- A new Firestore collection, index, or `firestore.rules` change.
- A new top-level route or Product Catalog screen.
- Any modification to Add Stock, Smart Stock Entry, or PRI's
  candidate-generation logic.

## 19. Traceability to Amendment + Rule 8 Requirements

| Amendment / Rule 8 requirement | Where addressed in this Plan |
|---|---|
| Owner may remove (Amendment §3.A) | §4.3, §5 Checkpoint 2, §8 |
| Owner may redirect (Amendment §3.B) | §4.1–4.3, §5 Checkpoint 3, §8 |
| Never automatic/AI/confidence-based (Amendment §3/§7) | §9 item 6 (explicit confirm steps only), §18 |
| Owner-only (Amendment §4.1) | §11 (existing `isOwnerOf` rule, unmodified) |
| Product Catalog/detail surface (Amendment §4.2) | §5, §7, §9 (`ProductDetailModal.tsx` only) |
| Mandatory audit record (Amendment §4.3) | §4.4, §10 |
| No new Firestore collection (Amendment §5/§11) | §6 ("no change to" list), §18 |
| `(supplierRecordId, wording)` sufficient identity key (Rule 8 §2A) | §4.2 (both pure functions keyed on it) |
| Transaction required, `updateProduct` unsafe (Rule 8 §2C) | §4.3, §13 |
| Atomic single-transaction redirect preferred (Rule 8 §2D/§10) | §4.1, §4.3 |
| Reuse `planSupplierWordingConfirmation`/`SupplierWordingConflictError` (Rule 8 §2B/§2D/§8) | §4.2, §4.3 |
| Context-exposure gap (Rule 8 §2B/§2F) | §4.5 |
| REMEMBER lifecycle scenarios 1–8 (Rule 8 §2H) | §15 items 13–15, §12 |
| Test coverage list (Rule 8 §5) | §14, §15 |

## 20. Acceptance Criteria

This capability is ready for Implementation Authorization sign-off
once, at minimum:

1. All pure-function tests (§15 items 1–2, 5–6, 13–16) pass.
2. All emulator concurrency tests (§14) pass against a live Firestore
   emulator (owner-run, per this repository's existing pattern for
   this class of test).
3. `TimelineEvent` generation is verified for both `'removed'` and
   `'redirected'` outcomes (§15 item 10).
4. Manual/QA verification confirms the `ProductDetailModal` UI flow
   end to end: see, identify, remove, redirect, success/error
   feedback, cancel-without-effect (§9, §15 item 12).
5. No existing test file's behavior changes except the explicitly
   listed extension to `tests/supplier-wording-matching.test.ts`
   (§15/§16) — every other existing supplier-wording test continues
   to pass unmodified, proving the reused mechanisms were not altered.
6. A `git diff` against this Plan's baseline touches only the files
   listed in §6 and adds only the files listed in §7 — no
   `firestore.rules`, `firestore.indexes.json`, or governance-document
   change of any kind.

## 21. Implementation Authorization Dependency

This Plan does not itself authorize any of the above. Per the
Amendment's own §8 sequencing (mirrored from the completed Product
Recognition Intelligence chain) and Rule 8 Assessment §10's verdict,
the next and final required gate before any code is written is a
separate, signed **Implementation Authorization**, referencing this
Plan.

---

## Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
>
> I accept and authorize the Implementation Plan for Owner-Controlled
> Correction of a Remembered Supplier-Wording Relationship, including
> the full scope defined in the Plan: Owner-controlled removal,
> Owner-controlled redirect/reassignment, atomic transaction
> protection, existing confirmation/conflict protection, Product
> Catalog/detail surface, mandatory TimelineEvent audit recording,
> tenant isolation, and all stated exclusions and test requirements.
>
> The three non-blocking documentation notes identified during the
> final verification are accepted as implementation/documentation
> details and do not constitute governance blockers:
>
> 1. Clarify the grammatically ambiguous source-already-gone sentence
>    in §4.3.
> 2. Explicitly document the removal-target-deleted failure case in
>    §12.
> 3. Record `destinationAlreadyHasIt` in redirect audit details if
>    consistent with the Plan's existing audit contract.
>
> These do not change the authorized business scope.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED AND AUTHORIZED
> Date: 29 August 2026

This acceptance takes effect immediately on the Plan document itself:
the engineering design, checkpoint sequence, file map, test plan, and
every Category 2 proposal recorded in §§1–21 above are now the
authoritative Plan, together with the three documentation
clarifications listed above (already applied, in place, at §4.3, §4.4,
and §12).

**This acceptance does not authorize implementation.** It accepts the
Plan as the correct translation of the READY Rule 8 Assessment into
engineering scope — it is not itself the separate, signed
**Implementation Authorization** §21 requires, and no application
code, test, or schema may be changed on the strength of this
acceptance alone.

---

**Implementation Plan drafted → ACCEPTED AND AUTHORIZED.**
**Implementation Authorization still required.**
**No application code may be changed until the Product Architect signs
the separate Implementation Authorization.**
