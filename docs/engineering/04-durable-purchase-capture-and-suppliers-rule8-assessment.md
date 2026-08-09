# Rule 8 Assessment — Module #4 Durable Multi-Product Purchase Capture and Reusable Suppliers

**Governing spec:** [`04-durable-purchase-capture-and-suppliers-amendment.md`](../specs/04-durable-purchase-capture-and-suppliers-amendment.md)
(✅ Approved) amending [`04-purchase-batches.md`](../specs/04-purchase-batches.md)
(v1.1)
**Scope of this assessment:** the minimum change set needed to close the
amendment's two authorized capabilities (Parts 1–9 of that document): a
durable, per-user Purchase Draft, and a reusable, tenant-scoped Supplier
entity. Nothing outside that scope — payment/credit/supplier-debt (the
amendment's Part 11), Modules #17/#18/#19/#20, the Business Worth
formula, or unrelated `AppContext` refactoring — is evaluated or
touched.
**Product Architect decisions consumed by this assessment** (both
supplied directly, not inferred): Decision 1 — Purchase Drafts are
scoped per purchase-entry session/user, not one global draft per
business. Decision 2 — access follows the existing Module #16 Staff &
Roles model, reusing it as-is rather than inventing a new tier.

---

## 1. Objective

Produce the missing governance artifact that authorizes implementation
of the two capabilities the amendment already approved at the business-
specification level: a Firestore-backed Purchase Draft that survives
interruption during multi-product Add Stock entry, and a reusable,
searchable Supplier entity that replaces today's disposable, embedded
`Supplier` value object.

## 2. Governance authority

- [`04-durable-purchase-capture-and-suppliers-amendment.md`](../specs/04-durable-purchase-capture-and-suppliers-amendment.md)
  — ✅ Approved, business specification.
- [`04-purchase-batches.md`](../specs/04-purchase-batches.md) v1.1 —
  amended in place, `[Durable Purchase Capture Amendment v1.0]`-tagged
  Business Rules / Functional Requirements / Acceptance Criteria.
- `docs/specs/README.md` — Module #4 row updated to point to the
  amendment.
- This document (Rule 8 Assessment) + its companion Implementation Plan
  — the two artifacts the amendment's own Part 12 named as still owed
  before implementation.

## 3. Scope

**In scope:** Purchase Draft persistence/lifecycle; reusable Supplier
entity (create, search, reuse); Add Stock UI integration for both;
`firestore.rules` for the two new collections; finalization wiring into
the existing `addMultipleStockBatches` path; tests.

**Explicitly out of scope, per the amendment's Part 11 and this task's
own instruction:** any payment, cash/credit, supplier-debt,
supplier-payable, or accounts-payable field, collection, or workflow.
No field of that kind is designed, named, or reserved anywhere below.

## 4. Architecture alignment

- Reuses Architecture 7.1 (live source wins) and 7.2 (bounded
  denormalization) exactly as spec #4 already does for `PurchaseBatch`.
- Reuses Architecture 2.6 (Simplicity Over Completeness) for two
  specific choices below: client-derived Supplier IDs (matching
  `Product`'s own client-derived ID pattern) and in-memory/client-side
  Supplier search (matching how `products` is already searched in
  `AddStockView.tsx`) rather than a server-side search index — correct
  and sufficient at this business's current scale, with the same
  "documented future trigger, not a defect" framing Architecture 11.4
  already applies to `batchSeq`.
- Introduces no new module boundary, no new cross-module dependency,
  and no new architectural pattern — confirmed in the amendment's own
  Part 12 ("A new ADR — not required").

## 5. Existing patterns reused

| Need | Existing pattern reused | Source |
|---|---|---|
| Draft persistence, autosave, load-on-mount, atomic clear-on-finalize | Module #10's `stockCountDrafts/initial` (`saveInitialStockDraft`/`clearInitialStockDraft`, `AppContext.tsx`; debounced autosave, `InitialStockCountView.tsx`) | `10-expected-stock-value-amendment.md` Part 1 |
| Find-or-create master data, case-insensitive, trimmed | `addStockBatch`/`addMultipleStockBatches`'s existing find-or-create-`Product` logic | `AppContext.tsx:1141`, `:1259` |
| Client-derived, timestamp-based document IDs | `Product`, `StockBatch`, `PurchaseBatch` ID generation (`'prod-' + Date.now() + ...`) | `AppContext.tsx` throughout |
| Per-user document scoping via doc ID | `users/{userId}` — a user's own profile document, keyed by their own `uid` | `firestore.rules:159` |
| "Operational data any team member can read/create, only Owner edits/deletes" access tier | `products` match block | `firestore.rules:261-265` |
| Historical snapshot immutability despite reusable master data | `Product.costPrice`/`sellingPrice` reference-price-vs-`StockBatch`-actual-price separation | `types.ts:195-201` |
| `createdByName` display convenience on a purchase-domain record | `PurchaseBatch.createdByName` | `types.ts:188` |

No pattern here is invented fresh; every one is an existing, shipped
mechanism in this exact codebase, reused per `CLAUDE.md` Hard Rule 5.

## 6. Data-model impact

**New types (`src/types.ts`), additive only:**

```ts
// Mirrors InitialStockDraftItem's shape and its own governing comment
// exactly — id for stable row round-tripping, numeric fields (the
// AddStockView form's string inputs convert at the component boundary,
// same as InitialStockCountView already does for InitialStockDraftItem).
export interface PurchaseDraftLineItem {
  id: string;
  productName: string;
  dateEntered: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
}

// A draft's supplier is EITHER an existing Supplier's id (selected from
// the reusable list) OR free-text fields for a not-yet-created supplier
// — never both populated meaningfully at once. Mirrors the "productName
// is free text until finalization creates the real Product" pattern
// already used for line items in this exact draft.
export interface PurchaseDraft {
  items: PurchaseDraftLineItem[];
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierNotes?: string;
  date: string; // YYYY-MM-DD — purchase date staged so far
  notes?: string; // batch-level notes, mirrors PurchaseBatch.notes
  updatedAt: string; // ISO string
}

// New reusable, tenant-scoped Supplier entity. Deliberately a DIFFERENT
// named type from the existing `Supplier` value object (types.ts:160),
// which remains exactly as-is and continues to be what
// PurchaseBatch.supplier embeds — see Part 7 of the amendment and
// Section 14 below for why the two must not be merged.
export interface SupplierRecord {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string; // ISO string
  createdByName?: string; // display convenience, mirrors PurchaseBatch.createdByName — not audit-log-grade (spec #4's own existing framing for this field)
}
```

**`PurchaseBatch` (existing type, `types.ts:181`) — one new optional
field, additive, non-breaking:**

```ts
export interface PurchaseBatch {
  // ...unchanged fields...
  supplier: Supplier; // UNCHANGED — the historical snapshot, still always populated
  supplierId?: string; // NEW, optional — set only on purchases finalized after this feature ships, when the purchase was linked to a reusable SupplierRecord. Absent on every historical PurchaseBatch and on any future purchase where the Admin typed a one-off supplier without selecting/creating a reusable record.
}
```

This is the same additive-optional-field shape already used for
`StockBatch.purchaseBatchId` (spec #4's own "Legacy data integrity"
rule) — no migration, no rewrite, no behavior change for any existing
document.

**No change to `StockBatch`, `Product`, or the existing `Supplier`
value-object type.**

## 7. Firestore collection structure

Two new collections, both nested under the existing
`businesses/{businessId}` scope (Architecture 7.1's tenant-isolation
boundary, unmodified):

```
businesses/{businessId}/purchaseDrafts/{draftId}
businesses/{businessId}/suppliers/{supplierId}
```

**`purchaseDrafts` — document ID is the owning user's own `request.auth.uid`,
not a generated ID.** This is the concrete resolution of Decision 1
(Section 11, below): one draft per user per business, addressed
directly by the user's `uid` — the same idiom this repository already
uses for `users/{userId}`. A second concurrent draft for the same user
cannot exist by construction (same reasoning `10-rule8-assessment.md`
already gives for `stockCountDrafts`' fixed `initial` ID — here the
fixed part is "this exact user," not "this exact business"). No query,
no index: read/write always by exact document ID.

**`suppliers` — document ID is client-generated** (`'supplier-' +
Date.now() + '-' + Math.random()...`), identical in form to `Product`'s
own ID generation. The full list is loaded into `AppContext` state via
a live listener and searched/matched client-side, exactly how
`products` already is — correct at this scale per Architecture 2.6/11.4
(Section 4, above).

## 8. Security-rule impact

Two new `firestore.rules` match blocks, both inside the existing
`match /businesses/{businessId}` block:

```
match /purchaseDrafts/{draftId} {
  // Per-user draft — the document ID IS the authorization boundary,
  // not a stored field. Matches this file's existing users/{userId}
  // idiom. Any team member may hold a draft (Decision 2) — same tier
  // as products/batches/purchaseBatches creation, not Owner-only like
  // stockCountDrafts (Initial Stock is a one-time, Owner-exclusive,
  // capital-defining action; day-to-day purchasing is not).
  allow read, create, update: if isMemberOf(businessId) &&
    request.auth.uid == draftId &&
    subscriptionAllowsNewRecords(businessId);
  // Delete (discard, or the atomic clear-on-finalize) is never
  // subscription-gated — same reasoning stockCountDrafts' own delete
  // rule already states: a blocked subscription must never trap
  // someone unable to clean up their own draft.
  allow delete: if isMemberOf(businessId) && request.auth.uid == draftId;
}

match /suppliers/{supplierId} {
  // Same access tier as /products — "operational data any team member
  // can read and create, but only the owner can edit/delete"
  // (firestore.rules's own existing comment above the /products
  // block). Reused verbatim per Decision 2's explicit instruction not
  // to invent a new "Supplier Manager" tier.
  allow read: if isMemberOf(businessId);
  allow create: if isMemberOf(businessId);
  allow update, delete: if isOwnerOf(businessId);
}
```

**`purchaseBatches` match block — one additive change, not a new
block:** `create` must now also accept the optional `supplierId` field
in the same shape-validation style `initialStockPriceChangeEvents`
already established (self-consistent field checks, no second read):

```
allow create: if isMemberOf(businessId) && subscriptionAllowsNewRecords(businessId) &&
  (!('supplierId' in request.resource.data) || request.resource.data.supplierId is string);
```

No other existing rule (`products`, `batches`, `stockCounts`,
`stockCountDrafts`, `initialStockPriceChangeEvents`, `expenses`,
`withdrawals`, etc.) is touched.

## 9. Tenant isolation

Unaffected. Both new collections live inside the existing
`match /businesses/{businessId}` block and use only the existing
`isMemberOf`/`isOwnerOf` helpers (`firestore.rules:35-49`) — no new
rule function, no cross-tenant read/write path. `purchaseDrafts`' extra
`request.auth.uid == draftId` check narrows access *within* an
already-tenant-scoped collection; it does not weaken the tenant
boundary itself.

## 10. Staff/Manager/Owner permissions — resulting matrix

Directly reusing Module #16's existing model (no new tier, per
Decision 2), cross-checked against `firestore.rules`' actual current
`products`/`batches`/`purchaseBatches` rules (Section 3 of the
preceding investigation already confirmed these are `isMemberOf`-gated
for create, not Manager-permission-gated — Purchase entry has never
been one of the two delegable Manager permissions, `closings` and
`staffManagement`, per spec #16):

| Action | Staff | Manager | Owner/Admin |
|---|---|---|---|
| Create/edit own Purchase Draft | ✅ | ✅ | ✅ |
| Discard own Purchase Draft | ✅ | ✅ | ✅ |
| Finalize a Purchase Draft (creates real `PurchaseBatch`/`StockBatch`) | ✅ — same as today's existing `addMultipleStockBatches` access (`isMemberOf`) | ✅ | ✅ |
| Search/select an existing Supplier | ✅ | ✅ | ✅ |
| Create a new Supplier | ✅ | ✅ | ✅ |
| Edit/delete an existing Supplier | ❌ | ❌ | ✅ — matches `Product`'s own edit/delete tier exactly |

This is not a new decision — it is the direct, mechanical consequence
of reusing the `products`/`batches`/`purchaseBatches` access tier
(Section 8, above) for the two new collections, exactly as Decision 2
instructed.

## 11. Draft concurrency model

**Resolved by Decision 1, made concrete here:** one Purchase Draft per
`(businessId, uid)` pair — a Staff/Manager/Owner's draft is keyed by
their own Firebase Auth `uid` as the document ID (Section 7, above).
Two different team members at the same business can hold two
independent, simultaneously in-progress drafts with zero risk of one
overwriting the other — not because of any new conflict-resolution
logic, but because they are, structurally, two different Firestore
documents. Confirmed against the actual login architecture
(`QuickLoginScreen.tsx`): even the PIN-based shared-device quick login
still calls `signInWithEmailAndPassword`, producing a distinct Firebase
Auth session — and therefore a distinct `uid` — per staff member, per
sign-in. A shared device does not create a shared `uid`.

**Known, accepted limitation, stated explicitly rather than silently
ignored:** the same user with two open tabs/devices signed in
simultaneously still shares one draft document (last-write-wins on
that single document) — identical, unmodified behavior to
`stockCountDrafts` today, not a new gap this feature introduces.

## 12. Draft lifecycle

```
EMPTY
  ↓ (user starts typing in Add Stock)
DRAFT CREATED           — first debounced autosave writes purchaseDrafts/{uid}
  ↓
AUTOSAVED               — every subsequent meaningful change, debounced (~800ms, matching Module #10's own interval)
  ↓
USER RETURNS            — AppContext's existing per-business listener pattern (mirroring unsubInitialDraft) already has the draft loaded
  ↓
DRAFT RESTORED           — AddStockView reads context's purchaseDraft instead of starting from empty rows
  ↓
USER CONTINUES           — same autosave loop
  ↓
FINALIZE                 — draft's items + supplier fields are handed to the EXISTING addMultipleStockBatches call as its input (Section 16)
  ↓
REAL PurchaseBatch + StockBatch records created  — unchanged atomic Firestore WriteBatch
  ↓
DRAFT CLEARED             — delete(purchaseDrafts/{uid}) added to the SAME WriteBatch, exactly how stockCountDrafts' own confirmation already deletes the draft atomically alongside the real record
```

**Discard path:** `DRAFT → DISCARD → DRAFT REMOVED` — a direct
`deleteDoc` on `purchaseDrafts/{uid}`, mirroring
`clearInitialStockDraft` exactly.

**Failed finalization:** the `addMultipleStockBatches` WriteBatch either
commits fully or rejects fully (Firestore batch atomicity, unchanged).
On rejection, **no delete is attempted** — the draft-clearing `delete()`
call lives inside the same batch as the create calls, so if the batch
never commits, the draft delete never happens either. The draft is
therefore preserved automatically, by the same atomicity property
already governing every other write in this module — no new retry
logic, no new error-handling branch beyond what `AddStockView.tsx`'s
existing `handleSubmit` try/catch (`AddStockView.tsx:176-200`) already
does.

## 13. Supplier lifecycle

**Explicit design decision, stated with its rationale (this is exactly
the "exact field list/behavior" the amendment's Part 6/Part 12 left for
this stage to resolve):** selecting an *existing* Supplier during draft
entry stores only `supplierId` in the draft. Typing a *new* supplier
name (no match found) stores free-text `supplierName`/`supplierPhone`/
`supplierNotes` in the draft — **the real `SupplierRecord` document is
not created until finalization**, mirroring exactly how a new
`Product` is not created until finalization today.

**Reason:** creating a real, reusable Supplier record the instant
someone types a new name — before the purchase is ever confirmed —
would let an abandoned, never-finalized draft leave permanent master
data behind. That's a smaller-stakes version of the same problem the
amendment's Part 4 already rejected for inventory (a draft must not
leave real records behind before explicit confirmation); the same
discipline is applied here for consistency, even though Supplier
itself carries no valuation weight.

**Accepted, stated trade-off:** a supplier "created" mid-draft by one
user will not appear in a *different*, concurrently in-progress draft's
autocomplete until the first draft is finalized. Given Section 11's
draft-per-user model, this only matters for two different team members
both encountering the exact same brand-new supplier for the first time,
simultaneously — an edge case, not a common flow, and not silently
ignored: named here explicitly should it ever need revisiting.

**Finalization behavior:** `addMultipleStockBatches` gains one new
find-or-create step, parallel to and modeled directly on its existing
find-or-create-`Product` loop —

- If the draft carries `supplierId`: look up the existing
  `SupplierRecord`, use its *current* `name`/`phone`/`notes` as the
  historical snapshot written to the new `PurchaseBatch.supplier`, and
  set the new `PurchaseBatch.supplierId` field.
- If the draft carries only free-text supplier fields: case-insensitive,
  trimmed match against the already-loaded `suppliers` list (identical
  matching logic to `Product`'s own `p.name.toLowerCase() ===
  trimmedName.toLowerCase()`); if found, behave as the `supplierId`
  case above; if not found, create a new `SupplierRecord` in the same
  Firestore batch as everything else, then behave as the `supplierId`
  case using the just-created record.
- If no supplier information was entered at all: unchanged from today
  — `'Fornecedor Não Especificado'` (`AppContext.tsx:1244`), no
  `SupplierRecord` created, no `supplierId` set.

**Editing an existing `SupplierRecord`** (Owner-only, Section 10) never
touches any `PurchaseBatch.supplier` snapshot already written —
enforced structurally, not just by convention: nothing in the edit path
touches the `purchaseBatches` collection at all.

## 14. Backward compatibility

- Every existing `PurchaseBatch` document is read exactly as it is
  today — `supplier: { name, phone?, notes? }` remains fully populated
  and fully sufficient on its own; `supplierId` simply does not exist
  on these documents, and every read path must treat its absence as
  "this purchase predates reusable suppliers or used a one-off name,"
  never as an error or a missing-data state.
- The Investment Ledger view (`StocksView.tsx`) needs no change to keep
  displaying historical batches correctly — it already reads
  `PurchaseBatch.supplier` directly, which is untouched.
- No migration script, backfill, or rewrite of any kind — matching the
  amendment's Part 7 explicitly.
- A business that has never used a Purchase Draft has no
  `purchaseDrafts` documents at all; `AddStockView` behaves exactly as
  it does today (empty rows) the first time any team member opens it
  after this ships — same "no draft exists yet, behaves like a fresh
  form" pattern `InitialStockCountView` already established.

## 15. Historical supplier snapshots

Directly addressed by Section 6 (`PurchaseBatch.supplier` unchanged,
`supplierId` additive-optional) and Section 13 (editing a
`SupplierRecord` never touches a snapshot). This is the same
reference-vs-actual separation `Product.costPrice`/`sellingPrice`
already establishes for pricing (`types.ts:195-201`) — applied here to
supplier identity instead of price.

## 16. Finalization boundary

**`addMultipleStockBatches` remains the single, authoritative
finalization mechanism.** It is extended, not replaced or duplicated:

- Its existing find-or-create-`Product` loop: **unchanged.**
- Its existing `StockBatch`/`PurchaseBatch` creation, batch numbering
  (`generateBatchNumber`/`getNextBatchSeq`), and Timeline Event logging:
  **unchanged.**
- Its existing validation (`AddStockView.tsx:130-165`): **unchanged** —
  still runs against whatever rows are currently staged, whether they
  arrived via a restored draft or fresh typing; the draft is purely an
  alternate *source* for those same rows, not a different validation
  path.
- **New:** the function's input now includes an optional `supplierId`
  (Section 13) and, before its existing Firestore batch commits, one
  new find-or-create-`Supplier` step (Section 13) added to that *same*
  batch — Firestore's existing atomicity (already relied on for
  Product/Batch/PurchaseBatch creation) now also covers Supplier
  creation and draft deletion in the identical all-or-nothing write.
- **New:** on success, `AddStockView`'s existing `setTimeout(() =>
  onComplete(), 1200)` success path is unchanged; the only addition is
  that the draft no longer exists in Firestore by the time `onComplete`
  fires (deleted in the same batch, Section 12).

No purchase-creation logic is duplicated. The draft is a persistence
layer feeding the same, single, existing entry point.

## 17. Valuation boundary

**Confirmed unmodified — this section states the check performed, not
an intention:**

- `calculateBatch()` (`calculations.ts`) — no new parameter, no new
  read, no call site change. Neither `PurchaseDraft`,
  `PurchaseDraftLineItem`, nor `SupplierRecord` is imported into
  `calculations.ts` by this plan.
- `calculateInventoryTotals()` — same; a draft is never included in
  `batches`, the only input this function reads.
- `calculatePurchaseBatchSummary()` (`purchaseBatchCalculations.ts`) —
  unchanged; the new `PurchaseBatch.supplierId` field is not read by
  this function (it aggregates `StockBatch` figures only, per its
  existing, untouched signature).
- `expectedCurrentStockValue`, `businessWorth`, `capitalGrowth`,
  `capitalGrowthPct`, `initialCapitalValue` — none of these derived
  values in `AppContext.tsx` gains a new dependency; a `PurchaseDraft`
  is never read by any of them, at any point, draft or finalized.
- A finalized purchase — one that went through a draft — computes
  **exactly** the same `investmentValue`/`marketValue`/`embeddedProfit`
  it would have computed via today's single-shot form, because
  finalization still calls the same, unmodified `calculateBatch`-backed
  path (Section 16) on the same `quantity`/`costPrice`/`sellingPrice`
  fields, regardless of whether those fields arrived via a restored
  draft or fresh typing.

**Supplier identity is confirmed to be a pure identity/reuse concept —
it is never read by any calculation function**, matching the amendment's
Part 10 exactly.

## 18. Payment exclusion — confirmed

No field named or shaped like `paymentStatus`, `paid`/`unpaid`,
`credit`, `cash`, `amountPaid`, `amountDue`, `dueDate`, or any
payment/payable concept appears anywhere in Section 6's new types,
Section 7's collections, or Section 8's rules. `PurchaseBatch` gains
exactly one new field (`supplierId?: string`) and nothing else. No
`Payment`/`PaymentMethod`/`PaymentStatus` type (Module #19's own,
unrelated types) is imported, referenced, or reused anywhere in this
plan.

## 19. Migration requirements

**None.** Confirmed independently in Sections 6, 14, and 15 — every
new field is additive-optional, every new collection starts empty for
every business, and no existing document of any kind requires a
rewrite, backfill, or one-time script.

## 20. Performance considerations

- `purchaseDrafts`: one additional small live listener per signed-in
  team member (their own draft only, by ID — no query), attached
  alongside the business's other existing always-on listeners
  (`products`, `batches`, `purchaseBatches`, etc. — see
  `AppContext.tsx`'s existing listener setup). Negligible at current
  scale; every team member's client already maintains several such
  listeners.
- `suppliers`: one additional collection-wide listener per business,
  loaded into `AppContext` state exactly like `products` already is.
  Acceptable at current scale (Architecture 2.6) — the same documented,
  not-yet-triggered scale concern already named for `products`/
  `batches` themselves, not a new risk category this feature
  introduces.
- No new Firestore index required for either collection (Section 7).
- `getNextBatchSeq`'s existing O(n) cost (spec #4's own already-named,
  already-accepted performance note) is unaffected — this feature adds
  no new call to it beyond the one `addMultipleStockBatches` already
  makes.

## 21. Failure/interruption behavior

Directly covered by Section 12 (Draft lifecycle) and Section 16
(Finalization boundary): every interruption scenario named in the task
— refresh, browser/tab close, network loss, power loss, failed
finalization — reduces to the same two guarantees already proven in
production by Module #10's draft: (1) autosave persists before a
1200ms-scale UI transition can plausibly be interrupted mid-save far
more often than it already isn't (unchanged autosave-debounce risk
window, not newly introduced), and (2) atomic batch commit means
finalization is either fully real or the draft is fully intact — never
a partial state of either kind.

## 22. Testing strategy

New focused test files, mirroring
`tests/initial-stock-price-change.test.ts`'s and
`tests/expected-stock-value.test.ts`'s existing Node-runnable,
Firestore-independent style (pure-function/logic tests, not full
Firestore emulator integration — consistent with this repo's standing
sandbox limitation):

- **Purchase Draft:** create, autosave debounce behavior, restore
  round-trip, multiple line items survive round-trip, supplier fields
  (`supplierId` and free-text forms) survive round-trip, discard,
  failed-finalization preserves the draft (simulated batch rejection),
  successful finalization clears the draft, a draft alone never appears
  in any valuation input.
- **Supplier:** create, case-insensitive/trimmed find-existing,
  duplicate prevention, `supplierId`-based finalization path,
  free-text-new-supplier finalization path, historical
  `PurchaseBatch.supplier` snapshot unaffected by a later edit to the
  `SupplierRecord`.
- **Finalization regression:** existing `addMultipleStockBatches`
  behavior (Product find-or-create, `StockBatch`/`PurchaseBatch`
  creation, batch numbering, Timeline Events) produces identical output
  whether its input came from a restored draft or from fresh in-memory
  rows — same test fixtures as today's implicit coverage, run through
  both paths.
- **`firestore.rules` coverage** for `purchaseDrafts` and `suppliers` —
  written, following this repo's existing `tests/firestore-rules.test.ts`
  pattern, but **not executable in this sandbox** — same standing
  `storage.googleapis.com` network-egress gap named in every prior
  session's HANDOFF entry. Not claimed as passing; flagged as owed
  before production deploy, identically to every other `firestore.rules`
  change in this repository's history.
- **Full regression:** `npm run test:all` must remain green with zero
  new failures — required before this work is considered complete.

## 23. Affected files

See the companion [Implementation Plan](./04-durable-purchase-capture-and-suppliers-implementation-plan.md)
for the phased breakdown; summarized here:

| File | Change |
|---|---|
| `src/types.ts` | New `PurchaseDraftLineItem`, `PurchaseDraft`, `SupplierRecord`; `PurchaseBatch.supplierId?: string` added |
| `src/context/AppContext.tsx` | New `suppliers` state + listener; new `purchaseDraft` state + listener (scoped to current user); new `savePurchaseDraft`/`clearPurchaseDraft` functions; `addMultipleStockBatches` extended with the Supplier find-or-create step and draft-delete-in-batch |
| `src/components/AddStockView.tsx` | Loads/restores draft on mount, debounced autosave on row/supplier/date/notes change, supplier field becomes autocomplete against `suppliers`, finalize (submit) uses draft-sourced state |
| `firestore.rules` | New `purchaseDrafts` and `suppliers` match blocks; one additive field-shape check on `purchaseBatches`' existing `create` rule |
| `tests/*.test.ts` | New focused test file(s) per Section 22; `tests/firestore-rules.test.ts` extended |
| `docs/specs/04-purchase-batches.md`, `docs/specs/04-durable-purchase-capture-and-suppliers-amendment.md`, `docs/specs/README.md` | Already updated — governance step, precedes this assessment |

No `server/` change (this feature has no privileged-server action — all
writes are already client-permitted per Section 8). No
`firestore.indexes.json` change (Section 7).

## 24. Risks

- **Supplier autocomplete UX regression risk (low):** replacing three
  plain text inputs with an autocomplete-plus-create pattern in
  `AddStockView.tsx` is the largest UI change here. Mitigated by
  copying the already-shipped Product autocomplete in the same file
  almost verbatim, rather than designing a new interaction pattern.
- **Draft/live-row state reconciliation on load (low, precedented):**
  the same race `InitialStockCountView.tsx` already solved
  (`skipNextAutosave.current`, "don't clobber in-progress typing with
  an older saved draft") applies identically here and should reuse the
  identical fix, not a new one.
- **Firestore rules unverified against the emulator (standing,
  repository-wide, not new to this feature):** same gap named in
  Section 22 and in every prior HANDOFF.md entry. Flagged, not hidden.
- **Scope creep risk (mitigated by this document's own boundary):**
  the temptation to also add a `paymentStatus` field while already
  touching `PurchaseBatch` is real, given how close by it sits in the
  file. Section 18 and this repository's own `CLAUDE.md` Hard Rule 3
  make this an explicit non-goal; the Implementation Plan's own scope
  boundary (below) restates it.

## 25. Implementation sequence

See the companion [Implementation Plan](./04-durable-purchase-capture-and-suppliers-implementation-plan.md).

## 26. Readiness determination

**Governance Readiness: Ready.**

- Both Product Architect decisions this assessment needed (draft
  concurrency, access/permissions) were supplied directly and are
  resolved concretely in Sections 7, 10, and 11 — not guessed.
- Every valuation-boundary and payment-exclusion requirement is
  confirmed satisfiable by design, not merely asserted (Sections 17–18).
- No migration is required (Section 19).
- No new architectural pattern, module boundary, or authorization
  mechanism is introduced (Sections 4–5, 8–9) — every piece reuses an
  existing, shipped precedent in this exact codebase.
- Scope is narrow and additive; it does not touch Modules #17/#18/#19/
  #20, the Business Worth formula, or any payment concept.

Proceeding to the Implementation Plan.
