Rule 8 Assessment

# Rule 8 Assessment — Owner-Controlled Correction of a Remembered Supplier-Wording Relationship

**Status:** READ-ONLY assessment. Not an Implementation Plan, not an
Implementation Authorization. No application code, test, or existing
governance document was modified to produce this document.
**Governs:** implementation readiness of the capability authorized by
[`product-identity-alternative-name-relationship-correction-amendment.md`](../specs/product-identity-alternative-name-relationship-correction-amendment.md)
("the Amendment") — **ACCEPTED AND AUTHORIZED**, signed by Product
Architect SABUSHIMIKE MASCENI, 29 August 2026.
**Baseline commit:** `736bb9bf3df3361588a6b73646245b619efd7dfc`, per
the Amendment's own baseline. Verified: an ancestor of `HEAD`
(`137ff8d7169f3276495c65d99b1e57f3ca0e935a`, the Amendment's own
acceptance commit) — confirmed this session via `git merge-base
--is-ancestor`. Working tree at assessment time: clean (`git status
--short` → empty) before this document was created; this document is
the only new file produced.
**Does not reopen:** `BDR-0013` items 1, 2, 4, 5, 6, 8, 9; `POL-0007`;
`POL-0011`; `POL-0012`; `ADR-0008`; `POL-0013`; the completed Product
Recognition Intelligence Rule 8 Assessment, Implementation Plan, or
Implementation Authorization. None of these files were read-modified
to produce this document — each was re-read where directly relevant
(§1) and left untouched.

---

## 1. Implementation Surfaces Inspected (Fresh, This Session)

- `apps/tenant/src/types.ts`: `SupplierWordingRelationship`,
  `Product` (full inline comments re-read).
- `apps/tenant/src/lib/supplierWordingMatching.ts`: full file —
  `detectSupplierWordingCandidates`, `detectSupplierWordingContradictions`,
  `findExistingSupplierWordingMatch`.
- `apps/tenant/src/lib/supplierWordingConfirmation.ts`: full file —
  `planSupplierWordingConfirmation`, `SupplierWordingConflictError`,
  `CheckedProductWordingSnapshot`.
- `apps/tenant/src/lib/supplierWordingRecognition.ts`:
  `resolveSupplierWordingRecognition` and its async wrapper.
- `apps/tenant/src/context/AppContext.tsx`: `confirmSupplierWordingRelationship`
  (transaction body, lines ~2638–2694), its one call site inside
  `addMultipleStockBatches` (~3038–3053), `updateProduct` (~5864–5870),
  `confirmProductUnitRelationship` (~5894–5900), `logTimelineEvent`
  (~2336–2404), the `products` Firestore `onSnapshot` listener
  (~1570–1584), and the exported context-value interface (confirmed
  `confirmSupplierWordingRelationship` is **not** in it — see §F).
- `apps/tenant/src/components/AddStockView.tsx`: confirmed zero call
  sites for `confirmSupplierWordingRelationship` (it is invoked only
  from inside `AppContext.tsx` itself, after batch commit).
- `apps/tenant/src/components/ProductDetailModal.tsx`: full file (415
  lines) — confirmed zero references to `supplierWordings` anywhere.
- `apps/tenant/src/components/EditProductModal.tsx`: full file (194
  lines) — confirmed zero references to `supplierWordings`; edits
  `name`/`category`/`supplier`/`sku`/`barcode`/`costPrice`/`sellingPrice`
  only.
- `firestore.rules`: `/businesses/{businessId}/products/{productId}`
  block (451–465) and `/timelineEvents/{timelineEventId}` block
  (1459–1464).
- `firestore.indexes.json`: confirmed no existing index entries
  reference `products` at all.
- `tests/supplier-wording-confirmation-concurrency.test.ts` (full
  file, including its emulator-verification note),
  `tests/supplier-wording-add-stock.test.ts`,
  `tests/supplier-wording-matching.test.ts`,
  `tests/supplier-wording-distinguishing-info.test.ts`,
  `tests/supplier-wording-draft-abandonment.test.ts`,
  `tests/supplier-wording-smart-stock-entry.test.ts`.
- `tests/product-detail-modal-stock-count-history.test.ts` (only
  existing product-detail test file — confirmed no
  `supplierWordings`/correction coverage exists anywhere yet).
- `docs/specs/product-identity-alternative-name-relationship-correction-amendment.md`
  (full text, fresh re-read, including the Product Architect
  Acceptance).
- `docs/engineering/product-recognition-intelligence-rule8-assessment.md`
  and `docs/engineering/product-identity-alternative-name-rule8-assessment.md`
  — read for format/terminology precedent only, not re-opened.

A full repository grep for `supplierWordings` (excluding tests) was
run to enumerate every implementation reference; results are listed in
§2. No file outside the list above references it.

---

## 2. Current Architecture — Traced, Not Inferred

### A. Remembered-relationship representation

- **Storage:** inline array `Product.supplierWordings?:
  SupplierWordingRelationship[]` — not a subcollection. Confirmed:
  `types.ts` line 427; no `firestore.indexes.json` entry exists for
  it; no subcollection path appears anywhere in `firestore.rules` or
  the codebase.
- **Supplier identity:** `SupplierWordingRelationship.supplierRecordId`
  — a `SupplierRecord.id` reference (reusable, forward-looking
  identity), not a `PurchaseBatch.supplier` immutable snapshot.
- **Wording:** `SupplierWordingRelationship.wording` — the supplier's
  own wording string, as confirmed, stored trimmed
  (`confirmSupplierWordingRelationship` trims before writing).
- **Target product:** implicit — a relationship's target is whichever
  `Product` document's `supplierWordings` array currently contains it.
  There is no `productId`/back-reference field on
  `SupplierWordingRelationship` itself; the type has no `id` field of
  any kind.
- **Uniqueness key:** `(supplierRecordId, wording)`, confirmed as the
  sole identifying pair used throughout `planSupplierWordingConfirmation`
  (`relationshipMatches`, lines 86–87),
  `findExistingSupplierWordingMatch` (lines 684–688), and the
  concurrency test's own invariant assertions. **No other field
  participates in identity.** This confirms, by direct code trace
  (not by re-reading the Amendment's own claim), the Amendment's §5
  finding that `(supplierRecordId, wording)` is sufficient to uniquely
  identify a specific relationship for removal/redirect purposes —
  because it is already exactly what the existing write path uses to
  decide "is this the same relationship" today.
- **Lookup:** there is no dedicated lookup function for "find the
  product currently holding relationship (supplierRecordId, wording)."
  Today this is only ever computed as a side effect of iterating
  `existingProducts` (`resolveSupplierWordingRecognition`,
  `findExistingSupplierWordingMatch`). A correction UI would need to
  perform the equivalent scan itself (client-side, over the
  already-loaded `products` array) — no new Firestore query capability
  is required, since the full `products` collection is already
  streamed into memory via the existing `onSnapshot` listener
  (`AppContext.tsx` ~1570–1584).
- **Schema changes for removal:** none required. Removing an array
  element is a plain array-content change to an already-writable field
  on an already-writable document.
- **Schema changes for reassignment:** none required, for the same
  reason — reassignment is a remove-from-one-array plus
  append-to-another-array, both already-authorized shapes of write to
  the same field on two `Product` documents.

### B. Existing confirmation mechanism

Traced in full: `confirmSupplierWordingRelationship` (`AppContext.tsx`
~2638) → `runTransaction` → reads every product in
`{targetProductId, ...conflictCheckProductIds}` fresh, inside the
transaction (~2653–2668) → `planSupplierWordingConfirmation`
(`supplierWordingConfirmation.ts`, pure) → on `plan.conflict`, throws
`SupplierWordingConflictError`; on `!plan.shouldWrite`, silent no-op
(idempotent-already-confirmed or target-deleted); otherwise
`tx.update(...)` appends the new relationship to the target's
`supplierWordings` array (~2681–2692).

**Two facts materially bound the redirect design space:**

1. **The transaction already reads/writes an arbitrary, dynamically-
   sized set of `Product` documents within one atomic transaction** —
   not just the target. This is the exact mechanism a redirect (which
   touches exactly two products, per the Amendment's §3) would need,
   already present and already proven under concurrent load (§4
   below). No new multi-document transaction capability needs to be
   invented.
2. **`confirmSupplierWordingRelationship` is not exposed on the
   `AppContext` value interface** (verified: absent from the
   `updateProduct`/`confirmProductUnitRelationship`/`deleteProduct`
   cluster of exported function signatures, ~lines 795–810, and absent
   from the final returned context-value object, ~line 6388's
   surrounding block). It is currently only ever invoked from inside
   `AppContext.tsx`'s own `addMultipleStockBatches` closure, after a
   stock-batch commit. **A Product Catalog/detail-initiated correction
   UI cannot call it as-is** — either the function must be exposed
   through the context interface, or an equivalent, separately-named
   operation must be added that reuses its transaction/conflict logic.
   This is an implementation-shape question (Category 2, §14), not a
   governance gap: nothing in `BDR-0013`/`POL-0007`/the Amendment
   restricts *which* internal function establishes a relationship, only
   that the same confirmation/conflict discipline governs it.

**Can it safely establish the replacement relationship after removal?**
Yes, for the establishing half specifically: `planSupplierWordingConfirmation`
already decides purely from freshly-read state and already handles
"another product independently claims this pair" as a conflict, not an
overwrite. This logic requires no modification to serve as the
establishment step of a redirect.

### C. Safe removal

- **Is generic `updateProduct` safe?** No, not as it exists.
  `updateProduct` (~5864–5870) is a bare `updateDoc` — no transaction,
  no fresh read immediately before write. Passing a full replacement
  `supplierWordings` array computed from possibly-stale client state
  risks a **lost update**: if the array is spliced client-side against
  a snapshot that is not the latest committed state, a concurrent
  write to the same product (e.g. another Owner action editing a
  different field, or another wording being confirmed/removed in the
  same product in the same window) can be silently overwritten,
  because a full-array `updateDoc` replaces the field wholesale rather
  than expressing "remove exactly this one element."
- **Is a transaction required?** Yes, for the same reason
  `confirmSupplierWordingRelationship` itself needs one: the operation
  must read the product's current `supplierWordings` fresh, compute
  the array with exactly the targeted `(supplierRecordId, wording)`
  entry removed, and write inside the same transaction — mirroring the
  existing function's own read-then-decide-then-write shape, not
  `updateProduct`'s.
- **Concurrent-edit race without a fresh transaction:** two
  concurrent removals of *different* relationships on the *same*
  product, each computed from a stale client-side array snapshot and
  written via plain `updateDoc`, can race: the second write's "full
  array minus its target" computation may not reflect the first
  write's already-applied removal, resulting in either the first
  removal being silently undone (its entry reappears) or, depending on
  ordering, both removals appearing to succeed while the underlying
  document history shows a lost intermediate state. A transaction with
  a fresh in-transaction read eliminates this, exactly as it already
  does for confirmation.
- **Is a dedicated domain operation, analogous to
  `confirmSupplierWordingRelationship`, required?** Yes — this is the
  Rule 8 finding, not a pre-decided implementation choice: removal
  needs its own pure decision function (mirroring
  `planSupplierWordingConfirmation`'s shape: given a fresh snapshot,
  decide whether the targeted relationship still exists on this
  product and compute its removal) plus a transaction-body caller
  (mirroring `confirmSupplierWordingRelationship`'s shape). Whether
  this is literally a new, separate function or a generalization of
  the existing one is an Implementation Plan decision (Category 2),
  not a Rule 8 verdict blocker either way — both shapes are
  structurally available and neither requires schema/rules change.
- **Can removal be performed without schema/rules changes?** Yes,
  confirmed by §2A above — no new field, no new collection, no new
  Firestore rule is needed; the existing `isOwnerOf(businessId)`
  `update` permission on `products/{productId}` already covers this
  write (§E).

### D. Reassignment

**OLD PRODUCT → remove relationship → NEW PRODUCT → establish
relationship**, analyzed as required by the Amendment's own explicit
"touches exactly two products" scope (§3):

- **Can it safely compose existing operations?** Yes, structurally.
  §2B's Fact 1 (the confirmation transaction already reads/writes an
  arbitrary set of `Product` documents atomically) means a **single
  Firestore transaction** that reads the old product, the new product,
  and any conflict-check products, then writes the removal to the old
  product's array and the addition to the new product's array in the
  same `runTransaction` call, is already structurally available using
  patterns already proven in this codebase (§4) — it does not require
  a new capability to be invented, only composition of the read/decide/
  write shape already used for confirmation, extended to write to two
  documents instead of one.
- **Failure between removal and replacement:** eliminated entirely if
  the redirect is implemented as one atomic transaction (both writes
  succeed or neither does — ordinary Firestore transaction semantics).
  If instead implemented as two separate, sequentially-awaited
  operations (remove, then confirm), a failure between them leaves the
  relationship in neither product — a "forgotten" state, not a lost or
  duplicated one. Whether one atomic transaction is required, or two
  sequential operations with a documented interim "forgotten" state
  are acceptable, is **not decided by the Amendment** (§5, "does not
  decide any technical mechanism... whether 'remove' and 'redirect' are
  one operation or two composed operations") and is therefore an
  Implementation Plan decision, not a Rule 8 verdict blocker — see §14
  Category 2.
- **Duplicate relationship risk:** none beyond what
  `planSupplierWordingConfirmation`'s existing `alreadyConfirmed`
  branch already prevents, provided the redirect's establishing half
  reuses that same decision function (as the Amendment's §3 "same
  protections... item 3... item 5" clause requires).
- **Conflict risk:** identical in kind to the existing confirmation
  conflict (another product independently already holds the target
  `(supplierRecordId, wording)` pair) — already handled by
  `SupplierWordingConflictError`, reusable unchanged.
- **Concurrent Owner actions:** two Owners (or the same Owner, two
  tabs) redirecting the same relationship simultaneously to different
  target products is structurally the same race
  `tests/supplier-wording-confirmation-concurrency.test.ts` Scenario B
  already verifies against a live emulator for the *establishment*
  half — a fresh in-transaction read of both target candidates and the
  same `SupplierWordingConflictError` outcome shape resolves it
  correspondingly for redirect, provided the redirect transaction
  performs its own fresh reads (not reused stale reads from removal).
- **Tenant isolation:** unaffected — both the old and new product
  documents are read/written under the same
  `businesses/{businessId}/products/{productId}` path; no code path in
  `confirmSupplierWordingRelationship` or `planSupplierWordingConfirmation`
  ever crosses a `businessId` boundary, and nothing in a redirect
  composition would need to.
- **Is a temporary "forgotten" state acceptable?** Not decided by the
  Amendment; belongs to the Implementation Plan (see above). Recorded
  here as a genuinely open technical-sequencing question, not a
  business-decision gap — the Amendment's own explicit "the correction
  must not alter... any product's data other than the specific
  relationship(s) being corrected" and "touches exactly two products"
  language constrains *what* changes, not *how atomically* the two
  writes must be sequenced.
- **Is an atomic cross-product transaction actually required?**
  Structurally *available* (proven above) but not *mandated* by the
  Amendment. Whether to require it, versus accepting a documented
  two-step composition with a defined recovery/retry story for the
  interim "forgotten" state, is the one substantive technical-shape
  decision this Rule 8 Assessment surfaces for the Implementation Plan
  to resolve — not invented as a new business requirement, since either
  answer satisfies every constraint the Amendment actually states.

### E. Owner-only authorization

`firestore.rules` line 464: `allow update, delete: if
isOwnerOf(businessId);` on `/businesses/{businessId}/products/{productId}`
— unconditional on which fields of the document are being changed.
This already covers a `supplierWordings`-array-only update with no
rule change. **No server route is required**: every existing
comparable Product write (`updateProduct`,
`confirmProductUnitRelationship`) is a direct client-SDK
Firestore write gated by this same rule, not a server-side API
endpoint; a correction operation composing the same pattern needs no
different authorization boundary. This confirms the Amendment's §4.1
resolution ("Owner-only, matching the existing `Product` write tier")
is already exactly what the rules layer provides — the acceptance
adds no new restriction, and the code needs no new one either.

### F. Product Catalog/detail surface

`ProductDetailModal.tsx` is the existing, single product-detail
surface (confirmed: it is the modal opened from the Product Catalog,
receiving a `Product` and already calling `updateProduct`,
`deleteProduct`, `deleteQuebra` from `useApp()`). It already:

- receives the full `Product` object, including (whenever populated)
  its `supplierWordings` array — no new data-fetching is needed to
  **see** them;
- already has access to `updateProduct` via the same `useApp()` hook a
  correction action would need extending.

It does **not** currently render `supplierWordings` at all (§1, §2A
confirmed by direct grep), so the smallest location for the capability
is this existing modal, extended with: a read-only list of the
product's own remembered wordings (supplier + wording), a per-entry
"remove" action, and a per-entry "redirect" action that opens a
product-picker and invokes the establishing half against the chosen
target. This satisfies the Amendment's §4.2 resolution ("Product
Catalog/detail context") without requiring a new screen, new route, or
new top-level component — consistent with the Amendment's own
"does not decide UI placement, beyond the scoping question" boundary
(§5): this Rule 8 Assessment identifies the smallest existing surface
capable of hosting the capability, not a UI design.

**Gap requiring resolution before implementation (Category 2, not a
governance gap):** as found in §2B, `confirmSupplierWordingRelationship`
is not exposed through the context interface `ProductDetailModal.tsx`
consumes. Wiring the redirect's establishing half will require either
exposing it (or an equivalent) through that interface.

### G. Audit / TimelineEvent

- **Structure:** `TimelineEvent` (`types.ts` ~1840–1858) — `type:
  TimelineActivityType` (closed string-literal union), `date`,
  `createdAt`, `userName`, `title`, `description`,
  `financialImpact?`, `details?: Record<string, string | number |
  undefined>` (free-form), plus denormalized `productName?` and
  others.
- **Actor identity:** `userName`, populated from `userProfile.name`
  inside `logTimelineEvent` (~2360) — the same field every other event
  type already uses; not separately re-derived per event type.
- **`businessId`:** not a field on `TimelineEvent` itself — the
  document's path (`businesses/{businessId}/timelineEvents/{id}`)
  carries it, exactly as every other tenant-scoped collection in this
  codebase does. Consistent with the Amendment's tenant-isolation
  requirement without any change.
- **Before/after values:** representable today via the existing
  free-form `details` field — no schema change needed. Direct
  precedent already exists in the same union:
  `business-worth-correction` (a `TimelineActivityType` value already
  shipped for a structurally analogous "Owner corrects a previously
  recorded state" action) and `buildProductCreatedTimelineEventContent`
  (`supplierWordingConfirmation.ts`, an existing pure builder for a
  comparable event's `description`/`details` shape) — both precedents
  a correction event's own equivalent builder would mirror.
- **New event type required?** Yes, minimally: no existing
  `TimelineActivityType` value describes "a supplier-wording
  relationship was removed" or "redirected." This is an **additive
  enum-member change only** — the same shape of change
  `business-worth-correction` itself already represents in this same
  union, not a new collection, not a new document shape, not a
  `firestore.rules` change (the existing
  `/timelineEvents/{timelineEventId}` rule, `allow create: if
  isMemberOf(businessId)`, already covers any `type` value a client
  writes). Whether this is one new type (e.g. covering both remove and
  redirect, distinguished via `details`) or two, is an Implementation
  Plan naming decision, not a Rule 8 blocker.
- **Fits existing audit infrastructure?** Yes, fully — `logTimelineEvent`
  itself is already generic over `type`/`details` and requires no
  modification to accept a new type value.

### H. REMEMBER Lifecycle After Correction — Proved From Code

`resolveSupplierWordingRecognition` (`supplierWordingRecognition.ts`
~130–157) derives `confirmedRelationships` by flat-mapping over
`existingProducts[].supplierWordings` **fresh, on every call** — it
holds no separate cache and consults no field other than each
product's own current `supplierWordings` array at call time.
`existingProducts` is populated, in every real caller, from
`AppContext`'s `products` state, which is itself kept current by a
live `onSnapshot` listener on the `products` collection (~1570–1584).
This chain proves every scenario below directly from the shipped
recognition code path, not by inference:

- **Scenario 1 (removal → no silent reuse of Product A):** once
  Product A's `supplierWordings` array no longer contains the `(Supplier
  X, "Coka Cola 2L")` entry, `findExistingSupplierWordingMatch`'s
  `confirmedRelationshipsForSupplier.find(...)` (called with the fresh,
  post-removal array) finds no match — `resolveSupplierWordingRecognition`
  falls through to `detectSupplierWordingCandidates`/`no-candidates`,
  exactly the normal recognition/Owner-decision flow, never Product A
  silently. **Proved**, no code change required to make this true —
  this is the existing function's behavior applied to whatever the
  post-removal state is, exactly as the Amendment's §3 states.
- **Scenario 2 (redirect → silent reuse of Product B):** once the
  entry exists on Product B's array instead,
  `findExistingSupplierWordingMatch` finds it there on the next
  occurrence (same supplier, same wording) — **proved** by the same
  mechanism, no separate "make future lookups use B" logic needs to be
  built.
- **Scenario 3 (Supplier Y independence):**
  `findExistingSupplierWordingMatch`'s `relationship.supplierRecordId
  === supplierRecordId` check (line 686) means a Supplier Y wording of
  the identical text can never match a Supplier X relationship — this
  is unconditional on any correction and unaffected by one.
- **Scenario 4 (cancel → unchanged):** an Owner declining/cancelling a
  correction UI flow before any write commits leaves the relationship's
  underlying document field untouched by construction — no code path
  under discussion writes anything on cancel.
- **Scenario 5 (conflict on redirect target):** reusing
  `planSupplierWordingConfirmation`'s existing `conflictingProduct`
  branch (§2B) guarantees the establishing half of a redirect cannot
  silently create or override a duplicate — it throws
  `SupplierWordingConflictError`, exactly as it already does for
  ordinary confirmation.
- **Scenario 6 (concurrent update, lost-update prevention):** requires
  a transaction with a fresh in-transaction read for the removal/
  redirect operation itself (§C) — the existing confirmation
  transaction's own proven pattern (§4, emulator-verified 20/20) is the
  direct precedent that this requirement is achievable with tools
  already in this codebase, not a new concurrency primitive.
- **Scenario 7 (tenant boundary):** every read/write in every
  candidate design stays within
  `businesses/{businessId}/products/{productId}`; nothing in
  `confirmSupplierWordingRelationship`,
  `planSupplierWordingConfirmation`, or
  `resolveSupplierWordingRecognition` accepts or requires a
  cross-`businessId` reference of any kind — proved by absence, not
  merely by rule (§E already independently confirms the
  `firestore.rules` boundary).
- **Scenario 8 (PRI candidate generation unaffected):**
  `detectSupplierWordingCandidates`/`detectSupplierWordingContradictions`
  (the Product Recognition Intelligence candidate-producing functions,
  verified unchanged by this investigation — no edit was made to
  `supplierWordingMatching.ts`) consume the identical, single,
  already-mechanism-agnostic `existingProducts` input
  `resolveSupplierWordingRecognition` does. A correction changes only
  the *contents* of one product's `supplierWordings` array — it
  introduces no new input shape, no new call site, and no change to
  either function's own logic. PRI's candidate-generation rules
  continue functioning identically before and after any correction,
  proved by the fact that neither function was touched and neither
  reads anything a correction would need to add.

---

## 3. Governance Boundary — Confirmed Respected

Every item this Rule 8 Assessment finds technically necessary is
already either explicitly authorized by the Amendment or a pure
composition of already-shipped, already-governed mechanisms:

- No new Firestore collection is proposed (§2A) — consistent with the
  Amendment's §11/§5 "no new Firestore collection is authorized"
  boundary, and with §12 (tenant isolation, §2E/§2H Scenario 7).
- No change to canonical `Product.name`, Business Worth, Stock Count,
  UOM/`unitRelationship`, or unrelated Product data is required by
  anything found in §2 — every operation traced is scoped to the
  `supplierWordings` array field alone.
- No automatic/AI-driven/confidence-based correction path is
  introduced, found necessary, or even structurally suggested by
  anything in §2 — every write path traced requires an explicit
  caller-supplied target (removal) or caller-supplied target product
  (redirect); nothing in the recognition/matching/confirmation code
  makes such a decision on its own today, and nothing in this
  investigation proposes changing that.
- This assessment does not select a UI design (§2F identifies only the
  smallest existing surface), a specific transaction implementation
  (§2C/§2D identify the required *properties* — fresh read,
  transaction-protected, reuse of existing conflict logic — without
  writing one), a specific `TimelineEvent` shape (§2G identifies that
  the existing `details` field suffices, without specifying its
  contents), or a reassignment sequencing strategy (§2D explicitly
  leaves atomic-vs-two-step open as an Implementation Plan decision).

---

## 4. Concurrency Evidence Base

`tests/supplier-wording-confirmation-concurrency.test.ts` is direct,
already-executed (by the repository owner, against a live Firestore
emulator, 2026-08-19, per that file's own self-reported 20/20 passing
result — not independently re-run by this investigation, and not
re-verified in this session) evidence that the transaction shape this
capability's removal/redirect operations would need to mirror — fresh
in-transaction reads across a dynamically-sized set of `Product`
documents, followed by a conflict-or-write decision — already behaves
correctly under genuine concurrent contention in this exact codebase.
This is cited as architectural precedent for feasibility, not as proof
that a not-yet-written removal/redirect transaction is itself correct
— that would require its own, new test file, mirroring this one's
pattern, once the operation exists (§7 below).

---

## 5. Test Coverage — Existing and Required

**Existing, directly relevant:**

- `tests/supplier-wording-matching.test.ts`,
  `tests/supplier-wording-add-stock.test.ts`,
  `tests/supplier-wording-distinguishing-info.test.ts`,
  `tests/supplier-wording-draft-abandonment.test.ts`,
  `tests/supplier-wording-smart-stock-entry.test.ts`: cover
  candidate detection, confirmation decision logic, and the
  establishing half's edge cases — all reusable, unmodified, as the
  foundation the redirect's establishing half depends on.
- `tests/supplier-wording-confirmation-concurrency.test.ts`: direct
  structural precedent (§4) for the removal/redirect transaction's own
  future concurrency test.
- `tests/product-detail-modal-stock-count-history.test.ts`: confirms
  this is currently the only product-detail test file; contains no
  `supplierWordings` coverage today.

**Required, once an Implementation Plan authorizes the actual
mechanism (not created by this document):**

1. A pure decision-function test file for removal, mirroring
   `supplier-wording-add-stock.test.ts`'s structure against
   hand-constructed snapshots (Scenario 1, 3, 4, 7 above).
2. A pure decision-function test file for redirect's compose-with-
   removal behavior (Scenario 2, 5 above), reusing
   `planSupplierWordingConfirmation` for its establishing half.
3. A live-emulator concurrency test file for the new
   removal/redirect transaction, mirroring
   `supplier-wording-confirmation-concurrency.test.ts`'s two-scenario
   structure (Scenario 6 above) — same-product concurrent removal, and
   concurrent redirect-to-different-targets.
4. A `firestore.rules` test (or reuse of an existing rules-test
   harness) confirming a non-Owner (Staff-tier) write attempt against
   `supplierWordings` is rejected — extending, not replacing, the
   existing `isOwnerOf(businessId)` coverage pattern (§2E).
5. A `ProductDetailModal`/correction-UI-level test confirming the PRI
   candidate-generation functions (`detectSupplierWordingCandidates`)
   remain callable and unaffected after a correction — direct evidence
   for Scenario 8, beyond the code-structure argument in §2H.
6. A `TimelineEvent` test confirming the new event type is written
   with the correct `businessId`-scoped path and `userName` actor,
   mirroring the existing `buildProductCreatedTimelineEventContent`
   test pattern.

No test file was created, modified, or run by this Rule 8 Assessment
itself.

---

## 6. Schema / Rules / Index Impact

**None required**, for any of removal, redirect, or audit:

- `Product`/`SupplierWordingRelationship` (`types.ts`): no field
  addition needed (§2A) — the Amendment's own §5 finding is confirmed
  correct by fresh trace.
- `firestore.rules`: no new block, no rule-condition change to
  `/products/{productId}` or `/timelineEvents/{timelineEventId}`
  (§2E, §2G) — both existing rules already cover every write this
  capability needs.
- `firestore.indexes.json`: no entry exists today for `products`; none
  is introduced by anything found in §2 (no new query shape is
  required — the correction UI reads from the already-loaded,
  already-`onSnapshot`-synced `products` array, and the write path
  targets specific documents by id, not a query).
- `types.ts`'s `TimelineActivityType` union: one additive change only
  (a new string-literal member) — not a schema change to any
  document's shape, and not a breaking change to any existing reader
  of `TimelineEvent` (the field's own type already declares `type:
  TimelineActivityType`, and every consumer already switches on it
  exhaustively-or-defaults, per the existing pattern other additions to
  this same union already establish, e.g. `business-worth-correction`).

---

## 7. Failure-Mode Analysis

| Failure | Consequence today (no correction capability exists) | Consequence once removal/redirect exists (per §2C/§2D's required properties) |
|---|---|---|
| Owner initiates removal, connection drops before transaction commits | N/A (capability doesn't exist) | Transaction never commits — Firestore's own atomicity guarantee (no partial write); relationship remains exactly as before, same as any other failed transaction in this codebase |
| Owner initiates redirect as two sequential operations (Category 2 choice), failure between steps | N/A | Relationship left "forgotten" (removed from old, not yet on new) — recoverable by simply re-running the establishment step; not a data-loss state, per Amendment §3's own scoping of what a redirect touches |
| Two Owners concurrently remove the *same* relationship | N/A | Second operation's fresh in-transaction read finds it already absent — idempotent no-op, mirroring `planSupplierWordingConfirmation`'s own `alreadyConfirmed` idempotency precedent |
| Two Owners concurrently redirect the *same* relationship to *different* targets | N/A | Exactly Scenario 6/`supplier-wording-confirmation-concurrency.test.ts` Scenario B's proven shape once mirrored: one wins, the other's fresh read finds the relationship already gone from the source and fails safely (needs its own explicit error path, analogous to `SupplierWordingConflictError`, in the eventual implementation) |
| Target product (redirect destination) deleted concurrently with the redirect | N/A | Existing `plan.shouldWrite`'s `!!target?.exists` guard (`supplierWordingConfirmation.ts` line 109) already handles "target no longer exists" for ordinary confirmation; the same guard, reused for redirect's establishing half, handles this case identically |
| `logTimelineEvent`'s own write fails after the correction itself succeeds | Same pre-existing, accepted risk profile: `logTimelineEvent` is call-site-wrapped in its own `try/catch` (~2370–2374) and never rolls back the underlying business action on audit-write failure — the Amendment's §4.3 "required" audit resolution does not change this pre-existing, already-accepted best-effort pattern, since no other Timeline-logged action in this codebase makes its own success conditional on the audit write's success either |

---

## 8. Interaction With PRI and With Existing Confirmation/Conflict Protection

- **PRI:** §2H Scenario 8 proves, from code structure, that
  `detectSupplierWordingCandidates`/`detectSupplierWordingContradictions`
  need no change and are called with no new input as a result of this
  capability — correction changes only the *data* those functions read
  (one product's `supplierWordings` contents), never their *code* or
  *call sites*.
- **Existing confirmation/conflict protection:** the redirect's
  establishing half is required, by the Amendment's own §3 text, to
  reuse the same protections `BDR-0013` item 3/item 5 already require
  — §2B/§2D confirm `planSupplierWordingConfirmation` and
  `SupplierWordingConflictError` are directly reusable, unmodified, for
  exactly this purpose; no parallel or lower-friction conflict-check
  path is created or required.

---

## 9. Governance Classification

| Item | Classification |
|---|---|
| Owner may remove a remembered relationship | **1 — Already authorized by the Amendment; no further business decision needed** |
| Owner may redirect a remembered relationship to another existing product | **1 — Already authorized by the Amendment** |
| Owner-only access tier | **1 — Already authorized (§4.1) and already the existing `Product` write tier (§2E)** |
| Product Catalog/detail surface scope | **1 — Already authorized (§4.2)** |
| Mandatory audit/timeline record | **1 — Already authorized (§4.3); mechanism choice is Category 2 (§2G)** |
| Specific transaction function name/shape for removal | **2 — Ordinary Implementation Plan engineering detail** |
| Whether redirect is one atomic transaction or two composed operations | **2 — Explicitly left open by the Amendment §5; Implementation Plan decision** |
| Specific new `TimelineActivityType` value name(s) | **2 — Ordinary Implementation Plan naming detail** |
| Whether `confirmSupplierWordingRelationship` is exposed as-is or a new equivalent function is added | **2 — Ordinary Implementation Plan engineering detail (§2B/§2F finding)** |
| Any new Firestore collection, index, or rules-boundary change | **5 — Out of scope; none found necessary (§6)** |
| Automatic/AI-driven/confidence-based correction of any kind | **5 — Out of scope; explicitly prohibited by the Amendment §3/§7, and nothing in §2 requires or suggests it** |
| Any change to Business Worth, Stock Count, UOM/`unitRelationship`, or canonical `Product.name` | **5 — Out of scope; nothing in §2 touches these** |

Category 3 (genuinely unresolved business/architectural decisions
requiring a return to the Product Architect before an Implementation
Plan can be written) is **empty** — stated explicitly, per this
repository's established practice, so the absence is auditable rather
than merely an omission.

---

## 10. Rule 8 Verdict

# **READY**

Every dimension the Amendment left open for this stage (§8 of the
Amendment: "storage/identification mechanism, transaction shape,
composition of 'remove' and 'redirect,' and resolution of the §4
flagged points if... deferred to Rule 8") is resolved by this
investigation as follows:

- **Storage/identification mechanism:** confirmed, by fresh code
  trace, that the existing inline array and existing
  `(supplierRecordId, wording)` compound key are sufficient — no
  schema change (§2A, §6).
- **Transaction shape:** confirmed available and low-risk — the
  existing `confirmSupplierWordingRelationship`/
  `planSupplierWordingConfirmation` pattern already proves the required
  properties (fresh multi-document read, conflict-or-write decision,
  atomic commit) work correctly under concurrency in this exact
  codebase (§2C, §2D, §4).
- **Composition of "remove" and "redirect":** both structurally
  achievable via composition of existing/mirrored patterns; whether
  redirect is one atomic transaction or two sequential operations is
  the one genuinely open technical-sequencing question, and it is a
  Category 2 Implementation Plan decision, not a blocking Category 3
  governance gap — every constraint the Amendment actually states
  (§3: "touches exactly two products," "no other product's own
  remembered relationships," tenant-scoped, same access tier) is
  satisfiable under either sequencing choice.
- **§4 flagged points:** already fully resolved by the Product
  Architect's acceptance itself (Owner-only; Product Catalog/detail
  surface; mandatory audit record) — this investigation found nothing
  in the code that conflicts with any of the three resolutions, and
  confirmed each is already structurally supported by existing
  mechanisms (§2E, §2F, §2G).

No blocking architectural conflict, missing capability, or unresolved
business decision was found. The one open item (atomic-vs-two-step
redirect sequencing, §2D/§9) is explicitly the kind of decision
`BDR-0013` item 3's own precedent (and this repository's established
practice generally) treats as ordinary Implementation Plan scope, not
a reason to withhold Rule 8 readiness — an Implementation Plan can
resolve it directly, without returning to the Product Architect first,
because either resolution is already within what the Amendment
authorizes.

**What READY does not mean:** it does not mean any specific function
name, transaction shape, `TimelineActivityType` value, or UI layout
has been chosen — none has. It does not mean an Implementation Plan or
Implementation Authorization exists — neither does. It means the
accepted governance is complete and internally consistent enough, and
the existing codebase already provides enough directly-reusable
precedent (§2B, §4), that an Implementation Plan can now be written
without needing to return to this gate for a further business
decision.

---

## 11. Implementation Boundary for the Next Implementation Plan

Authorized, once an Implementation Plan is written and separately,
explicitly authorized:

- Removal and redirect operate on the existing inline
  `Product.supplierWordings` array only — no new field, no new
  collection, no new document.
- Both operations are transaction-protected, with fresh
  in-transaction reads of every `Product` document they touch — never
  a plain `updateDoc` of a client-computed full-array replacement.
- Redirect's establishing half reuses `planSupplierWordingConfirmation`
  and `SupplierWordingConflictError` unchanged — no parallel or
  lower-friction conflict-check path.
- `Product.name`, `Product.id`, `unitRelationship`, `sellingPrice`,
  `costPrice`, and every other Product field not named
  `supplierWordings` remain untouched by either operation.
- The capability is reachable only from `ProductDetailModal.tsx` (or a
  component it renders) — no new top-level route, no Add
  Stock/Smart Stock Entry integration (those remain scoped to
  *establishing* new relationships, unaffected).
- Every correction (removal or redirect) produces exactly one
  `TimelineEvent`, via `logTimelineEvent`, using a newly added,
  additive `TimelineActivityType` value — no new audit collection, no
  bypass of the existing best-effort (non-blocking) audit-write
  pattern every other action already uses.
- No mechanism in this capability may be invoked without a specific,
  contemporaneous, explicit Owner UI action — no batch/background/
  scheduled path, matching the Amendment's §7 list exactly.
- `firestore.rules` is not modified — the existing
  `isOwnerOf(businessId)` gate on `products/{productId}` `update`
  already governs every write this capability makes.
- Test coverage follows §5's required list before the Implementation
  Plan is considered complete.

---

## 12. Remaining Product Architect Decisions

**None required to reach an Implementation Plan.** The single open
technical-sequencing question identified in §2D/§9 (atomic single-
transaction redirect vs. two sequential operations with a documented
interim "forgotten" state) is Implementation Plan scope, per §5 of the
Amendment's own explicit deferral — it does not require a return to
the Product Architect, because both options already satisfy every
constraint the Amendment states. Should the Implementation Plan's
authors prefer to have the Product Architect select between the two
explicitly rather than deciding it as ordinary engineering judgment,
that remains available at their discretion, but it is not required by
anything found in this assessment.

---

## 13. Repository / Change Control Confirmation

- **Files inspected:** listed in §1, all read-only.
- **No application code was modified.**
- **No test file was modified or run.**
- **No existing governance document was modified** — the Amendment,
  `BDR-0013`, `POL-0007`, `POL-0011`, `POL-0012`, `ADR-0008`,
  `POL-0013`, and every prior Rule 8/Implementation Plan/Authorization
  artifact remain byte-for-byte unchanged.
- **No Implementation Plan or Implementation Authorization was
  created.**
- **Nothing was committed. Nothing was pushed.**
- **Scope audit:** `git status --short` immediately before this
  document was created showed a clean working tree (baseline commit
  `137ff8d7...`, an ancestor-verified descendant of `736bb9bf...`);
  this Rule 8 Assessment file is the only untracked file this session
  produces.

**Lifecycle:** Amendment Accepted → **Rule 8 Assessed (this document):
READY**. Not Implemented, not Authorized for engineering work — an
Implementation Plan, and a separate, signed Implementation
Authorization, remain required, subsequent gates, exactly as the
Amendment's own §8 states.
