# Owner-Controlled Correction of a Remembered Supplier-Wording Relationship — Implementation Authorization

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).** See
"Product Architect Acceptance / Signature," §7, below, for the
complete signed decision.

**Governing chain (sole authority for this Authorization):**
[`BDR-0013`](../specs/BDR-0013-product-identity-alternative-name-memory.md)
(Approved) →
[`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(Approved) →
[the Amendment](../specs/product-identity-alternative-name-relationship-correction-amendment.md)
(✅ **ACCEPTED AND AUTHORIZED** — SABUSHIMIKE MASCENI, 29 August 2026)
→
[Rule 8 Assessment](./product-identity-alternative-name-relationship-correction-rule8-assessment.md)
(✅ **READY**) →
[Implementation Plan](./product-identity-alternative-name-relationship-correction-implementation-plan.md)
(✅ **ACCEPTED AND AUTHORIZED** — SABUSHIMIKE MASCENI, 29 August 2026)
→ **this Authorization**.

**Baseline commit:** `15d563ac8108ff45f0b58050c398e8ad09e3540c`
(`main` = `origin/main`, verified via `git fetch`/`git status`
immediately before drafting — working tree clean, nothing untracked,
before this document was created). This commit is the exact commit
that recorded the Implementation Plan's Product Architect Acceptance.
The Amendment's own cited baseline,
`736bb9bf3df3361588a6b73646245b619efd7dfc`, remains confirmed (via
`git merge-base --is-ancestor`, re-checked across the full chain) an
ancestor of this commit.

**This document does not modify application code, tests, Firestore
rules, indexes, schema, `BDR-0013`, the Amendment, the Rule 8
Assessment, or the Implementation Plan.** It exists to record the
Product Architect's formal, signed decision to authorize engineering
work — populated strictly from the already-accepted Implementation
Plan, introducing no new scope, no new business decision, and no
technical detail the Plan did not already specify.

**One capability, stated once, governing everything below:** Owner-
controlled correction — removal and/or redirect — of a previously
remembered `SupplierWordingRelationship`, so that a wrong confirmation
is never permanently, silently stuck. This document authorizes that
capability **as one whole**, exactly as the Implementation Plan
defines it — it does not authorize removal and redirect as two
separately-gated features, and no checkpoint below may be treated as
its own separately-gated capability.

---

## 1. Governance Completeness — What This Record Confirms

- The Amendment is signed and **ACCEPTED AND AUTHORIZED**, establishing
  the business decision: an Owner may explicitly remove or redirect a
  remembered `(supplierRecordId, wording)` relationship, never
  automatically, from the Product Catalog/detail context, with a
  mandatory audit record.
- The Rule 8 Assessment reached a verdict of **READY**, with zero
  unresolved Category 3 (Product-Architect-decision-required) items —
  confirming the existing inline `supplierWordings` array and existing
  `(supplierRecordId, wording)` key need no schema change, that
  `updateProduct` is unsafe for this purpose, and that a redirect is
  structurally achievable as one atomic transaction reusing existing
  confirmation/conflict logic.
- The Implementation Plan translated that READY verdict into a
  concrete, phased, file-by-file design — four checkpoints, exact new
  pure functions, exact new transaction functions, exact UI insertion
  point, exact test files — and is itself **signed and ACCEPTED AND
  AUTHORIZED** by the Product Architect (recorded in the Plan
  document's own "Product Architect Acceptance" section, 29 August
  2026), including three non-blocking documentation clarifications
  already applied in place to the Plan (source-already-gone wording in
  its §4.3, an explicit removal-target-deleted failure row in its
  §12, and an optional `destinationAlreadyHasIt` audit field in its
  §4.4).
- **No further Specification, BDR, or POL amendment is required** for
  anything within the scope defined in §2 below.

## 2. What Is Authorized

Upon signature, engineering implementation of the **complete
Implementation Plan**, all four checkpoints, as one authorized unit of
work (may still be delivered/merged incrementally per checkpoint —
that is an engineering sequencing choice, not a re-gating requirement):

**A. Owner-controlled removal** of a remembered `(supplierRecordId,
wording)` relationship from a `Product`. New pure function
`planSupplierWordingRemoval` (`supplierWordingConfirmation.ts`) and new
transaction function `removeSupplierWordingRelationship`
(`AppContext.tsx`): reads the target product **fresh, inside the
transaction**; removes only the exact targeted relationship; leaves
every other `supplierWordings` entry untouched, in order; makes no
write when the product no longer exists or the relationship is already
absent (idempotent, never an error).

**B. Owner-controlled redirect** of a remembered relationship to a
different, existing `Product`, via **one atomic Firestore
transaction** — never two separately-committed operations. New pure
function `planSupplierWordingRedirect` and new transaction function
`redirectSupplierWordingRelationship`: reads the source product, the
destination product, and any additional conflict-check products
**fresh, inside the same transaction**; both the source removal and
the destination establishment commit together or neither changes at
all.

**C. Existing confirmation/conflict protection, genuinely reused, not
reinvented.** The redirect's establishing half calls the existing,
unmodified `planSupplierWordingConfirmation` and throws the existing,
unmodified `SupplierWordingConflictError` — scoped so that the source
product is explicitly excluded from the destination's own
conflict-check set (it legitimately already holds the relationship
being moved; it must never be flagged as a rival claimant). A genuine
conflict — a **third** product, neither source nor destination,
independently already holding the exact pair — blocks the write
entirely; nothing is silently overwritten.

**D. Product Catalog/detail context** (`ProductDetailModal.tsx`) as
the **sole** authorized surface: a new section, visible only when the
product has remembered wordings, listing each one (supplier + wording)
with a per-entry remove action and a per-entry redirect action (a
plain `<select>` over existing products, mirroring
`AddQuebraView.tsx`'s existing picker pattern, plus an explicit confirm
step before either action fires). No new top-level route. No Product
Catalog screen redesign.

**E. Mandatory `TimelineEvent` audit recording**, via the existing
`logTimelineEvent` infrastructure: one additive `TimelineActivityType`
value (naming — one combined value vs. a two-value split — is an
implementation-time choice per the Plan's §4.4, not fixed here), a new
pure builder function `buildSupplierWordingCorrectionTimelineEventContent`
mirroring the existing `buildProductCreatedTimelineEventContent`
pattern, recording at minimum: the action (`'removed'`/`'redirected'`),
`supplierRecordId`, `wording`, the old product, the new product (when
applicable), and — on the idempotent redirect branch — an optional
`destinationAlreadyHasIt: true` flag. Actor (`userName`) and
`businessId`-scoped path are handled generically by the existing,
unmodified `logTimelineEvent`.

**F. Owner-only access**, enforced by the existing, unmodified
`isOwnerOf(businessId)` `firestore.rules` gate on
`/businesses/{businessId}/products/{productId}` `update` — no new
route, no new authorization boundary, no weaker path.

**G. Tenant isolation**: both new transaction functions resolve
`businessId` from `activeBusinessId` exactly as `updateProduct`
already does — never from a caller-supplied value — and operate
exclusively within `businesses/{businessId}/products/{productId}`.

**H. The full required test coverage** defined in the Implementation
Plan §14/§15 (§4 below restates it as binding acceptance criteria).

## 3. Non-Negotiables — Preserved, Binding on Implementation

Every item below is already a concrete requirement stated in the
Amendment, the Rule 8 Assessment, or the Implementation Plan — none is
a new decision introduced by this Authorization; each is restated here
as a binding, acceptance-testable requirement:

1. **The Owner is always the decision-maker.** No mechanism may
   remove, redirect, reassign, or merge a relationship automatically,
   on an AI/recognition mechanism's own determination, on a confidence
   score, in the background, or as a scheduled/batch process. Every
   correction requires a specific, contemporaneous, explicit Owner
   action through the `ProductDetailModal.tsx` UI — a confirm step, not
   a single click, for both remove and redirect.
2. **Identity is exactly `(supplierRecordId, wording)`**, matching the
   existing, unmodified key used throughout
   `planSupplierWordingConfirmation`/`findExistingSupplierWordingMatch`
   — no new identity field, no new lookup mechanism.
3. **No plain `updateDoc` of a client-computed full array.** Both
   removal and redirect read every `Product` document they touch
   **fresh, inside a Firestore transaction**, immediately before
   deciding what to write — mirroring
   `confirmSupplierWordingRelationship`'s already-proven shape exactly.
4. **Redirect is one atomic transaction.** Source removal and
   destination establishment are two writes inside the same
   `runTransaction` call — they commit together or neither commits;
   no two-step, separately-committed composition is authorized.
5. **The source product is never treated as a conflict against
   itself.** The destination's conflict-check set explicitly excludes
   the source product id.
6. **Destination-already-has-it is an idempotent success, not a
   conflict, not a silent overwrite, not a new business decision.**
   When the destination product already independently holds the exact
   `(supplierRecordId, wording)` pair at the moment of redirect: the
   source relationship is still removed; **no duplicate entry is
   written to the destination**; the pre-existing destination entry is
   left untouched; the operation resolves as a success; the audit
   record for this branch may set `destinationAlreadyHasIt: true`.
   This is the same rule `planSupplierWordingConfirmation`'s own
   existing `alreadyConfirmed` idempotency branch already establishes
   for ordinary confirmation, applied to the redirect's destination
   half — not a new conflict-resolution policy, and not the system
   choosing between two candidates (the destination is the Owner's own
   explicit, already-chosen target).
7. **A genuine third-party conflict blocks the write entirely.** If
   any product other than source or destination independently already
   holds the exact pair, `SupplierWordingConflictError` is thrown, no
   write is made to either source or destination, and the Owner is
   shown the conflict.
8. **Failure cases are explicit, not silently absorbed:**
   - Removal target product deleted concurrently: the transaction's
     fresh read reflects non-existence; no write is made; treated
     identically to "relationship already absent," never an error.
   - Removal of an already-absent relationship: idempotent no-op, no
     error, safe to retry.
   - Redirect's source relationship already gone (concurrently
     removed/redirected): the transaction makes no write of any kind;
     this outcome is surfaced to the caller as a distinct, explicit
     result (never a silent success, never a generic thrown error
     indistinguishable from a conflict).
   - Redirect destination product deleted concurrently: no write is
     made to a nonexistent document, reusing the existing
     `!!target?.exists` guard `planSupplierWordingConfirmation` already
     applies.
9. **Exactly one `TimelineEvent` per successful correction — none on
   cancellation, none on a thrown/caught error.** Closing the remove/
   redirect confirm step without confirming makes no context call of
   any kind — no write, no audit event. A thrown
   `SupplierWordingConflictError` or "already gone" outcome is
   excluded from logging by the same rule.
10. **REMEMBER lifecycle, verified against the unmodified
    `resolveSupplierWordingRecognition`, not a new mechanism:**
    - After **removal**, the next occurrence of that supplier's
      wording does **not** silently reuse the old product — it falls
      through to the normal recognition/Owner-decision flow, because
      `findExistingSupplierWordingMatch` no longer finds the pair on
      any product.
    - After **redirect**, the next occurrence of that supplier's
      wording silently reuses the **destination** product, because the
      pair now resolves there instead.
    - A **different supplier** using the identical wording text
      remains completely independent, because `supplierRecordId`
      participates in the identity key unconditionally — unaffected by
      any correction to a different supplier's relationship.
11. **Product Recognition Intelligence is unaffected.**
    `detectSupplierWordingCandidates`/`detectSupplierWordingContradictions`
    receive no new parameter and are not called from either new
    transaction function — a correction changes only the *data* one
    product's `supplierWordings` array holds, never the *code* or
    *call sites* of PRI's candidate-generation logic.
12. **Every existing, reused mechanism remains unmodified.**
    `confirmSupplierWordingRelationship`, `planSupplierWordingConfirmation`,
    `SupplierWordingConflictError`, and `resolveSupplierWordingRecognition`
    are read and composed, never edited — every existing test covering
    them must continue to exercise identical code and continue to
    pass, unmodified.
13. **Unrelated Product data is never touched.** Neither new
    transaction function writes any field other than `supplierWordings`
    on any document it touches — `Product.name`, `Product.id`,
    `unitRelationship`, `costPrice`, `sellingPrice`, and every other
    field remain byte-for-byte unchanged by either operation.

## 4. Acceptance Criteria — Precise, Testable, Derived From the Plan

Implementation of this capability is complete and ready for
verification once, at minimum, every item below holds:

1. `planSupplierWordingRemoval` and `planSupplierWordingRedirect`
   (pure, dependency-free) exist in `supplierWordingConfirmation.ts`
   and are covered by new tests in `tests/supplier-wording-removal.test.ts`
   and `tests/supplier-wording-redirect.test.ts` respectively — passing
   in the normal sandbox, no emulator required.
2. `removeSupplierWordingRelationship` and
   `redirectSupplierWordingRelationship` exist in `AppContext.tsx`,
   are exposed on the `AppContext` interface and returned provider
   value, and neither `confirmSupplierWordingRelationship` nor
   `planSupplierWordingConfirmation` nor `SupplierWordingConflictError`
   is modified to accommodate them.
3. Concurrent-removal (same relationship; different relationships on
   the same product) and concurrent-redirect (same relationship to
   different destinations; destination deleted mid-operation;
   already-absent source; destination-already-has-it) scenarios all
   pass against a live Firestore emulator in a new
   `tests/supplier-wording-correction-concurrency.test.ts`, mirroring
   `tests/supplier-wording-confirmation-concurrency.test.ts`'s existing
   structure — explicitly distinguished in the test plan as
   emulator-dependent, not sandbox-runnable, exactly like its existing
   precedent file.
4. **Redirect atomicity under a genuine third-party conflict is
   explicitly proven, not merely asserted.** A dedicated test case
   (within `tests/supplier-wording-redirect.test.ts` at the pure
   `planSupplierWordingRedirect` level, and again within
   `tests/supplier-wording-correction-concurrency.test.ts` at the live
   Firestore emulator level) sets up a third product — neither source
   nor destination — already independently holding the exact
   `(supplierRecordId, wording)` pair, then attempts a redirect from
   source to destination, and asserts:
   - the operation throws `SupplierWordingConflictError`;
   - **no write is made to the destination product** (its
     `supplierWordings` array is read back, at the emulator level,
     unchanged from before the attempt);
   - **no write is made to the source product** — critically, the
     source's own relationship **remains exactly as it was before the
     attempted redirect**, still present, unchanged, not removed —
     proving the transaction did not partially commit the source-side
     removal while failing the destination-side establishment.
5. **The following two outcomes are distinct and must not be
   conflated, in both the pure-function tests and the emulator tests:**
   - **Direct removal of an already-absent relationship** (via
     `removeSupplierWordingRelationship`/`planSupplierWordingRemoval`,
     the relationship simply never existed or was already removed by a
     prior call) is a **successful, idempotent no-op**: the operation
     resolves without throwing, no write is made, and this is treated
     as ordinary success — not an error, not a distinct outcome type,
     matching `planSupplierWordingConfirmation`'s own existing
     `alreadyConfirmed`-style idempotency precedent.
   - **A redirect whose source relationship is already gone at the
     moment of the transaction's fresh read** (via
     `redirectSupplierWordingRelationship`/`planSupplierWordingRedirect`,
     `plan.sourceFound === false`) is a **distinct, explicit
     non-success result** — never silently resolved as if the redirect
     had succeeded, and never merged into the same code path or test
     assertion as the removal idempotency case above. No write is made
     to either product in this case either, but the caller must be able
     to tell "there was nothing left to redirect" apart from "the
     redirect completed." A dedicated test in
     `tests/supplier-wording-redirect.test.ts` (pure) and
     `tests/supplier-wording-correction-concurrency.test.ts` (emulator,
     §14 scenario 5 of the Implementation Plan) asserts this outcome is
     observably different from a resolved/successful redirect — e.g. a
     distinct thrown error type or a distinct resolved discriminant,
     per the Plan's own §4.3 naming discretion — never the same return
     shape as an ordinary successful redirect.
6. A non-Owner (Staff-tier) write attempt against `supplierWordings`
   is rejected by the existing, unmodified `isOwnerOf(businessId)`
   `firestore.rules` gate — verified by an emulator-based rules test.
7. `TimelineEvent` generation is verified for both the `'removed'` and
   `'redirected'` outcomes, including the `destinationAlreadyHasIt:
   true` branch, via a new `tests/supplier-wording-correction-audit.test.ts`
   testing `buildSupplierWordingCorrectionTimelineEventContent`
   directly, mirroring the existing
   `buildProductCreatedTimelineEventContent` test pattern in
   `tests/supplier-wording-distinguishing-info.test.ts`.
8. `tests/supplier-wording-matching.test.ts` is extended with
   regression cases proving: (a) once a relationship is removed from a
   product's `supplierWordings`, `findExistingSupplierWordingMatch`
   returns `null` for that pair and recognition falls through to
   candidate detection; (b) once a relationship is present on a
   destination product, `findExistingSupplierWordingMatch` finds it
   there; (c) `detectSupplierWordingCandidates`/
   `detectSupplierWordingContradictions` are called with, and behave
   identically against, the same `existingProducts` shape before and
   after a simulated correction.
9. Every unit test asserts that the pure functions' output never
   contains a modified value for any `Product`/`SupplierWordingRelationship`
   field other than `supplierWordings`'s own contents; emulator tests
   additionally read back the full document to confirm no sibling
   field changed.
10. Manual/QA verification confirms the `ProductDetailModal.tsx` flow
   end to end: see remembered relationships, identify supplier +
   wording, remove with confirm, redirect with destination-picker +
   confirm, success feedback, error feedback (conflict / already-gone),
   and a no-op cancel path — explicitly acknowledged as manual/QA-only
   verification, since this repository has no automated React
   component test harness (no jsdom, no `@testing-library/react`) for
   any existing UI, not only this one.
11. No existing test file's behavior changes except the explicitly
   authorized extension to `tests/supplier-wording-matching.test.ts`
   (item 8 above) — `tests/supplier-wording-add-stock.test.ts`,
   `tests/supplier-wording-confirmation-concurrency.test.ts`,
   `tests/supplier-wording-distinguishing-info.test.ts`,
   `tests/supplier-wording-draft-abandonment.test.ts`, and
   `tests/supplier-wording-smart-stock-entry.test.ts` all continue to
   pass, unmodified.
12. A `git diff` against this Authorization's baseline touches only:
    `apps/tenant/src/lib/supplierWordingConfirmation.ts`,
    `apps/tenant/src/context/AppContext.tsx`,
    `apps/tenant/src/types.ts` (additive `TimelineActivityType` value
    only), and `apps/tenant/src/components/ProductDetailModal.tsx`
    (optionally accompanied by one new, small, locally-rendered
    subcomponent file, per the Plan's own §7 discretion) — and adds
    only the four new test files named in items 1, 3, and 7 above
    (`tests/supplier-wording-removal.test.ts`,
    `tests/supplier-wording-redirect.test.ts`,
    `tests/supplier-wording-correction-concurrency.test.ts`,
    `tests/supplier-wording-correction-audit.test.ts`) — items 4 and 5
    add test *cases* to these same already-named files, introducing no
    additional new file. **No other file is modified or added** —
    specifically, no change to `firestore.rules`,
    `firestore.indexes.json`, `EditProductModal.tsx`,
    `AddStockView.tsx`, `supplierWordingMatching.ts`, or
    `supplierWordingRecognition.ts`.

## 5. What Is Not Authorized

Preserved verbatim from the Amendment §6/§7 and the Implementation
Plan §2/§18 — this Authorization grants none of the following:

- Any new Firestore collection.
- Any new Firestore index.
- Any `firestore.rules` change.
- Any change to `Product.name`.
- Any change to `Product.id`.
- Any change to UOM/`unitRelationship`.
- Any change to `costPrice`/`sellingPrice` or any other pricing field.
- Any change to Business Worth.
- Any change to Stock Count, including Initial Stock.
- Any change to the Add Stock establishing flow.
- Any change to Smart Stock Entry.
- Any change to Product Recognition Intelligence's candidate-
  generation logic (`detectSupplierWordingCandidates`,
  `detectSupplierWordingContradictions`, or
  `resolveSupplierWordingRecognition`'s existing behavior).
- Any automatic, AI-driven, or confidence-based correction of any
  kind.
- Any background, scheduled, or batch correction process.
- Any silent reassignment, silent merge, or silent overwrite of a
  relationship the Owner did not explicitly select as the operation's
  target.
- Any modification to any Product field other than `supplierWordings`.
- Any cross-tenant operation.
- A new top-level route or a Product Catalog screen redesign.
- Exposing `confirmSupplierWordingRelationship` itself, or generalizing
  its signature, to the UI layer — the two new, narrowly-scoped
  functions in §2.A/§2.B are the only newly-exposed operations.

## 6. Redirect Edge Case — Destination Already Holds the Relationship

Explicitly authorized, precise behavior (mirrors Non-Negotiable 6,
§3, above, restated here as its own section per instruction):

When an Owner redirects `Product A`'s `(supplierRecordId, wording)`
relationship to `Product B`, and `Product B` **already independently
holds the identical relationship** at the moment of the transaction's
fresh read:

- `Product A`'s entry is removed (the redirect's source-side effect
  proceeds normally).
- `Product B`'s existing entry is **left exactly as it is** — no
  duplicate is written, no timestamp/provenance/confirmedByName field
  on the existing entry is touched.
- The operation resolves as a **success**, not a conflict and not an
  error — this is the correct outcome because `Product B` is the
  Owner's own explicit, chosen redirect target, not a third party the
  system is choosing between.
- The resulting `TimelineEvent` for this correction may record
  `destinationAlreadyHasIt: true` in its `details`, giving the audit
  trail a way to distinguish "a new entry was established on the
  destination" from "the destination already had it, none was
  written" — additive to the `details` shape, no schema change.

This is consistent with the Amendment and `BDR-0013`: it does not
introduce a new business decision, does not let any mechanism decide
that a relationship is wrong on its own, and does not silently merge,
rename, or reinterpret anything — the destination was already the
Owner's own explicit selection before this branch is ever reached.

## 7. Product Architect Acceptance / Signature

**Status: ✅ ACCEPTED AND AUTHORIZED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED AND AUTHORIZED
> Date: 29 August 2026
>
> I accept and authorize the complete implementation defined by
> §§1–6 of this document, covering the full, unified capability:
> Owner-controlled removal, Owner-controlled redirect, atomic
> transaction protection, existing confirmation/conflict protection
> reused unmodified, Product Catalog/detail surface, mandatory
> TimelineEvent audit recording, Owner-only access, tenant isolation,
> and the complete required test coverage — as one authorized
> capability, not two separately-gated ones.
>
> The redirect edge case in §6 (destination already holds the
> relationship) is explicitly accepted as described: idempotent
> success, no duplicate write, source removal proceeds, audit record
> may note `destinationAlreadyHasIt`.
>
> Nothing in §5 ("What Is Not Authorized") is granted by this
> signature.

**Effective upon this signature:** engineering implementation of the
complete capability defined in §2, subject to every non-negotiable in
§3, every acceptance criterion in §4, the redirect edge case in §6,
and the exclusions in §5, may now proceed. This includes, unchanged
from §§2–6 above:

- Owner-controlled removal and Owner-controlled redirect, as one
  authorized capability, not two separately-gated ones.
- Redirect as one atomic Firestore transaction — source removal and
  destination establishment commit together or neither changes at
  all (§3 item 4, §4 item 4).
- The destination-already-holds-it redirect outcome: idempotent
  success, no duplicate write, source removal still proceeds, audit
  record may note `destinationAlreadyHasIt: true` (§3 item 6, §6).
- The explicit, non-conflatable distinction between direct removal of
  an already-absent relationship (a successful, idempotent no-op) and
  a redirect whose source relationship is already gone (a distinct,
  explicit non-success result) — both no-write (§3 item 8, §4 item 5).
- All 13 non-negotiables in §3, all 12 acceptance criteria in §4, and
  every exclusion in §5, exactly as written, unchanged by this
  signature.

Any discovered need to exceed these boundaries during implementation
returns to Product Architect review before proceeding — not resolved
silently.

---

## Governance Notes

- This document does not modify `BDR-0013`, the Amendment, the Rule 8
  Assessment, or the Implementation Plan — all remain byte-for-byte
  unchanged.
- §7 is now signed: **ACCEPTED AND AUTHORIZED**, Product Architect
  SABUSHIMIKE MASCENI, 29 August 2026. This document, together with
  its signed §7, is now the authoritative Implementation Authorization
  for this capability.
- Populated strictly from the already-accepted Implementation Plan; no
  new technical detail, scope, or business decision beyond what the
  Plan already specifies is introduced here or by this signature.
- This signature authorizes engineering implementation strictly within
  §§2–6 of this document — it is not itself the implementation, and no
  application code, test, or schema is created by this signature; that
  work remains a separate, subsequent step.
