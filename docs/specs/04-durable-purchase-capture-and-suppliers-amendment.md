Business Domain Specification — Amendment

# Durable Multi-Product Purchase Capture and Reusable Suppliers Amendment

Version 1.0
**Status:** ✅ Approved (decisions recorded below, per explicit Product
Architect authorization). Spec #4 has been amended in place — see
`04-purchase-batches.md`'s Business Rules / Functional Requirements /
Acceptance Criteria for the `[Durable Purchase Capture Amendment
v1.0]`-tagged additions. This document remains the record of *why*;
the individual spec remains the source of truth for *what*.
**Implementation status:** **Not implemented.** This document
authorizes the business specification only — see Part 12 for exactly
what remains gated before any code is written.
**Amends:** [Purchase Batches (spec #4)](./04-purchase-batches.md)
**Touches, without amending:** Nothing. Unlike the two Module #10
amendments this document follows as precedent, no new figure or
derived value is introduced here that requires a Business Worth Engine
(spec #2) boundary note — see Part 10 for why none is needed.
**Related but unaffected:** [Products (spec #3)](./03-products.md) —
`Product.supplier` (a free-text catalog field, Functional Requirement
#1) is a different, pre-existing concept from the reusable Supplier
entity this amendment introduces; see Part 8.
**Origin:** Product Architect direction, following this repository's
own investigation-then-amendment sequence (Architecture → Standards →
Specifications → Implementation, `CLAUDE.md`) — a dedicated,
investigation-only task first traced the current Add Stock flow,
current supplier handling, current persistence behavior, and current
valuation calculations end-to-end against the real code, before any
governance document was proposed. This amendment converts that
investigation's approved recommendations into the formal record. No
code, `firestore.rules`, test, or `AppContext` change was made by
either the investigation or this document.

---

## Why this document exists

The investigation confirmed three things directly against the code
(`AddStockView.tsx`, `AppContext.tsx`, `types.ts`,
`purchaseBatchCalculations.ts`):

1. **Add Stock has no persistence until the final submit.** Multiple
   product rows can be entered in one session, but they exist only in
   React state until one atomic `addMultipleStockBatches` Firestore
   write fires at the end. A blackout, browser crash, refresh, or
   session loss before that point loses the entire in-progress
   purchase — unacceptable for a 20–50-product real-world delivery
   entry.
2. **Supplier is a disposable, non-reusable value object**
   (`Supplier { name, phone?, notes? }`, `types.ts`), embedded fresh
   into every `PurchaseBatch` with no collection, no `supplierId`, no
   search, and no deduplication — forcing the same supplier
   information to be retyped on every purchase.
3. **This repository already has an approved, shipped architectural
   answer to problem 1** for a different screen: Module #10's
   Initial Stock draft (`stockCountDrafts/initial` —
   `saveInitialStockDraft`/`clearInitialStockDraft`,
   `AppContext.tsx`, debounced ~800ms autosave,
   `InitialStockCountView.tsx`). This amendment reuses that
   architectural philosophy rather than inventing a new one, per
   `CLAUDE.md` Hard Rule 5 (reuse existing services/patterns).

This document settles the business rules for both capabilities so a
later, separately-authorized implementation spec/Rule 8 Assessment has
something approved to build against — it does not itself authorize
that implementation.

## Part 1 — Purpose

Two related but distinct gaps in the existing, approved Purchase
Batches module (spec #4) are closed at the specification level:

- **Durable multi-product purchase capture** — an Admin/Staff member
  building a multi-product delivery entry (Product 1 → Save, Product
  2 → Save, ... Product 50 → Save) must not lose already-entered work
  to an interruption, and must be able to leave and return to finish
  later.
- **Reusable Supplier identity** — a supplier used on one purchase
  must be findable and reusable on a later purchase, without
  re-typing its details and without creating duplicate, disconnected
  supplier records.

Neither capability changes what a finalized purchase *means* to the
platform — a completed Purchase Batch with its Stock Batch line items
remains exactly what spec #4 and spec #5 already define it to be.

## Part 2 — Purchase Draft: Business Rule Statement

**A Purchase Draft is temporary, incomplete business-entry state. It
is not inventory.**

- A Purchase Draft exists only to let an Admin/Staff member build up a
  multi-product purchase progressively, surviving interruption between
  saves.
- A Purchase Draft has **zero effect** on stock quantities, Investment
  Value, Market Value, Embedded Profit, Business Worth, or Capital
  Growth, for as long as it remains a draft — see Part 10.
- **Only explicit finalization** may create real `Product`,
  `StockBatch`, or `PurchaseBatch` records. Finalization is the exact
  same operation spec #4 already defines and already governs (the
  existing `addMultipleStockBatches`-shaped atomic write) — this
  amendment changes what feeds that operation as input, not what that
  operation does or produces.
- Before finalization, a draft may be freely added to, edited, or
  discarded by whoever is permitted to create it (Part 9).
- This mirrors, deliberately, spec #10's own Business Rule for the
  Initial Stock draft ("the draft is explicitly not Initial Capital —
  it does not participate in Business Worth... while unconfirmed" —
  `10-expected-stock-value-amendment.md`, Part 1): a draft is provisional
  and pre-decisional at every layer, the same governing description
  applied here to purchasing instead of Initial Stock.

## Part 3 — Draft Persistence Requirements

The following are business requirements, not an implementation
design — the exact Firestore document shape, collection name, and
save-triggering mechanics belong to the later implementation
specification (Part 12), not this amendment:

- Purchase entry must survive interruption — browser crash, refresh,
  network loss, device/power loss, or simply closing the app mid-entry.
- Previously entered product lines must not be lost by an
  interruption.
- The user must be able to resume an in-progress draft rather than
  starting over.
- Saving one product/line must not require re-entering previously
  saved products.
- Supplier information entered for the purchase must be retained as
  part of the draft, not lost separately from the product lines.
- The draft remains a distinct concept from finalized inventory at
  every point before finalization (Part 2).
- Successful finalization clears or completes the draft appropriately
  — the same "atomic with cleanup" discipline spec #10's own draft
  confirmation already uses (`10-expected-stock-value-amendment.md`,
  Part 1: "Confirmation is atomic with draft cleanup... If confirmation
  fails, the draft is left untouched").

**Recognized architectural precedent:** the existing
`stockCountDrafts/initial` mechanism (Module #10) — a single,
overwritten-per-save Firestore document, debounced autosave, loaded on
mount, deleted atomically alongside finalization — is the accepted
architectural pattern this capability should follow. This amendment
authorizes reusing that philosophy; it does not itself specify the
new collection's exact name, document shape, or per-business-vs-
per-user scoping — see Part 5 and Part 12.

## Part 4 — Rejected Architecture: No Premature Real Inventory

**Explicitly rejected:** any design where each product row becomes a
real `StockBatch` immediately as it is entered, with a "session"
concept only grouping already-real batches afterward.

**Reason:** an interrupted, never-finalized purchase under that design
would leave real, valued inventory records in place with no supplier
or purchase context ever confirmed as complete — silently and
prematurely inflating Business Worth for stock the Admin never
finished confirming. This is a materially worse failure mode than a
lost draft: lost draft data is recoverable-by-retyping and affects
nothing else; prematurely-real inventory data corrupts the very figure
(Business Worth) this platform exists to protect. A Purchase Draft
must remain entirely outside the inventory domain (Part 2) until one
single, explicit finalization action.

## Part 5 — Concurrency: Explicitly Not Decided Here

This amendment does **not** decide whether a Purchase Draft is scoped
one-per-business, one-per-user, one-per-device/session, or some other
model. Two staff members at the same shop entering two different
purchases at the same time is a real scenario this platform must not
silently mishandle (e.g., one draft overwriting the other), but the
correct resolution is an implementation-level design decision, to be
resolved and explicitly documented **before** implementation begins —
not assumed here and not left ambiguous in the later spec either.

## Part 6 — Reusable Supplier Entity

**Decision: approved as specified.** Supplier becomes a reusable,
tenant-scoped business entity, conceptually:

```
businesses/{businessId}/suppliers/{supplierId}
```

carrying at minimum: `name`, `phone` (optional), `notes` (optional),
`createdAt`, and creator information where appropriate (matching this
repository's existing `createdByName`/`createdBy` conventions used
elsewhere in spec #4 and spec #10). The exact field list, validation
shape, and Firestore rules are implementation-level detail (Part 12),
not decided here.

The Add Stock workflow (draft or otherwise) must support:

- Searching existing suppliers for the active business.
- Selecting an existing supplier to attach to the current purchase.
- Creating a new supplier inline when no match exists — the same
  create-on-first-use pattern spec #3/spec #4 already use for Products
  (`addMultipleStockBatches`'s existing find-or-create-Product logic
  is the direct precedent for find-or-create-Supplier).
- Reusing a previously created supplier on any future purchase without
  retyping its details.

**Supplier identity is tenant-scoped** — one business's suppliers are
never visible to, searchable by, or reusable from another business,
consistent with every other business-scoped entity in this platform
(Architecture 7.1).

## Part 7 — Historical Snapshot Preservation

**Supplier identity and historical purchase snapshot are different
concepts, and this amendment does not blur them:**

- A reusable `Supplier` record answers **"who is this supplier
  today?"**
- The supplier information already embedded on a `PurchaseBatch`
  (`PurchaseBatch.supplier: { name, phone?, notes? }`) answers **"what
  supplier information was recorded for this purchase, at the time it
  was made?"**

**Editing or renaming a reusable `Supplier` record must never rewrite
any existing `PurchaseBatch.supplier` snapshot.** This is not a new
principle — it is the same historical-immutability discipline this
repository already applies to Product reference prices (spec #3:
"costPrice/sellingPrice here are a REFERENCE price... every
calculation always reads price from the actual StockBatch it belongs
to... keeps historical batches accurate even if the reference price on
the product is edited later," `types.ts`) and to Supplier snapshots
denormalized onto Timeline Events (Architecture 7.2's documented
denormalization exception). The same reasoning applies here without
modification.

**No migration.** Existing `PurchaseBatch` records with an embedded
supplier value object remain exactly as valid, complete, and readable
as they are today. This amendment does not require, authorize, or
imply any backfill of a `supplierId` onto historical `PurchaseBatch`
records. The later implementation specification must define how new
purchases reference a reusable `Supplier` while old purchases continue
to read correctly from their existing embedded snapshot alone — both
must be correctly displayable side by side, with no visible gap or
special-casing failure for legacy data, mirroring spec #4's own
existing "Legacy data integrity" rule for ungrouped Stock Batches.

## Part 8 — Relationship to `Product.supplier` (spec #3)

**Explicitly unaffected by this amendment.** `Product.supplier` is a
pre-existing, free-text catalog metadata field (spec #3, Functional
Requirement #1) — unrelated to, and not read or written by, either the
`PurchaseBatch.supplier` snapshot or the new reusable `Supplier`
entity this amendment introduces. This amendment does not rename,
repurpose, migrate, or otherwise touch `Product.supplier`; the two
concepts (a product's free-text catalog note about who supplies it,
versus a purchase's reusable, tenant-scoped supplier record) remain
independent unless a future, separate governance decision explicitly
reconciles them.

## Part 9 — Access & Permissions: Deferred to the Later Specification

This amendment does not invent, grant, or restrict any permission. The
later implementation specification must explicitly define, aligned
with the existing Staff & Roles (Module #16) and business-membership
architecture (Architecture Section 6, including the Manager tier's
`isOwnerOrGrantedManager`/`managerPermissions` mechanism where
relevant, Section 6.3/6.8):

- Who may create and edit a Purchase Draft.
- Who may finalize a Purchase Draft into a real Purchase Batch.
- Who may create a new Supplier.
- Who may edit an existing Supplier's details.

Absent a documented reason to diverge, the natural default to evaluate
at that stage is spec #4's own existing access table (Owner/Manager
full access, Staff can create per assigned permissions) — but this
amendment does not itself make that determination final.

## Part 10 — Valuation & Business Worth Boundary (Mandatory)

**This amendment does not alter the Business Worth calculation model
in any way.** The following remain entirely unmodified, confirmed by
direct inspection of the current implementation during the preceding
investigation:

- `calculateBatch()`
- `calculatePurchaseBatchSummary()`
- Investment Value
- Market/Selling Value
- Embedded Profit
- `totalInvestmentValueAllTime`
- `totalMarketValueAllTime`
- `totalEmbeddedProfitAllTime`
- `expectedCurrentStockValue`
- `businessWorth`
- `capitalGrowth`
- `capitalGrowthPct`
- `initialCapitalValue`

A Purchase Draft has **zero effect** on inventory, Investment Value,
Market Value, Embedded Profit, Business Worth, or Capital Growth,
for as long as it remains unfinalized — see Part 2/Part 4. Once
finalized, a purchase enters the exact same, already-approved
valuation path spec #4 and spec #2 already define; this amendment
changes nothing about how a finalized purchase is valued, only how the
data reaches that point durably.

**No Business Worth Engine (spec #2) boundary note is required.**
Unlike the two Module #10 amendments, which each introduced at least
one genuinely new derived figure sitting adjacent to Business Worth
(Expected Current Stock Value; Current Initial Stock Valuation) and
therefore each needed an explicit non-goals bullet added to spec #2,
this amendment introduces **no new figure at all** — a Purchase Draft
and a reusable Supplier are pure entry-durability and identity-reuse
concepts with nothing for spec #2 to need to disclaim.

## Part 11 — Payment Scope Exclusion (Mandatory)

**Payment and supplier-payable capabilities are intentionally excluded
from this amendment and require separate governance approval before
design or implementation.**

This amendment explicitly does not define, approve, or authorize any
of the following:

- Cash purchase status
- Credit purchase status
- Supplier debt
- Supplier payable
- Unpaid bills
- Partial payments
- Multiple payments
- Amount paid
- Amount due
- Due dates
- Payment terms
- Overdue status
- Payment history
- Settlement workflows

**No payment-related field is added to `PurchaseBatch`, `StockBatch`,
or any draft by this amendment.** No supplier payable model, payment
ledger, or accounts-payable functionality is created. The preceding
investigation found this territory sits close to the ERP/accounting-
ledger boundary Architecture explicitly and repeatedly excludes
(Architecture 1.8, 2.2's Worth-First Scope Test) and recommended it be
evaluated on its own timeline, via its own dedicated BDR, independent
of and not blocking this amendment. This amendment takes no position
on that future question beyond stating plainly that it is not answered
here.

## Part 12 — Governance Classification & Documents Required

**Classification: Amendment to Module #4 — Purchase Batches.**

Reason:

- Module #4 already owns `PurchaseBatch`/Add Stock behavior end to
  end — this amendment extends existing purchase-entry capability, it
  does not create a new purchasing domain.
- It reuses an existing, already-approved draft pattern (Module #10)
  rather than inventing a new persistence philosophy.
- Supplier reuse is a direct refinement of supplier metadata spec #4
  already owns (`PurchaseBatch.supplier`) — not an unrelated new
  domain.

**However**, the reusable Supplier entity (Part 6) is explicitly
recorded here as a **meaningful domain-model refinement** — a new
tenant-scoped collection with its own identity, search, and reuse
semantics — and therefore requires its own explicit implementation
specification when that stage is reached, rather than being treated as
an informal UI enhancement folded silently into Add Stock's existing
component.

Governance documents:

- **This amendment document** — required. Settles the business
  decisions (Parts 1–11) before any Rule 8 work, per standing process.
- **Spec #4 update in place** — required; spec #4 is the module's
  source of truth for *what*, and did not previously describe either
  capability.
- **`docs/specs/README.md` update** — required, matching every other
  amended module in this series.
- **Spec #2 (Business Worth Engine) boundary note — not required.**
  See Part 10.
- **Spec #3 (Products) update — not required.** See Part 8;
  `Product.supplier` is untouched.
- **A new BDR — not required.** This answers "how does an existing,
  already-approved capability (Purchase Batches, Module #4) gain
  durable multi-product entry and reusable supplier identity" — the
  same category of question the Closing Integrity Amendment and both
  Module #10 amendments each answered without a BDR (no new
  platform-level strategic "why" is introduced; the "why" — Business
  Worth, not another ERP — is already settled at the Architecture
  level and this amendment operates entirely inside it).
- **A new POL — not required.** The `POL-NN-###` category exists to
  operationalize an approved BDR for a module that has one (Module
  #19/#20's governance stack); Module #4 has no BDR/POL stack, and
  this document's Parts 1–11 already function as the operational rule
  at the amendment level, the same way Module #10's two amendments do.
- **A new ADR — not required.** No new module boundary, cross-module
  dependency, or architectural pattern is introduced; the design
  explicitly reuses this repository's existing draft-document pattern
  (Module #10) and existing find-or-create-entity pattern (Products).
- **A Rule 8 governance-readiness assessment for *implementation* —
  not produced by this document, and not authorized by it.** Per
  `CLAUDE.md` Hard Rule 8 and this repository's standing sequence
  (proposed → approved → Rule 8 Assessment → implementation plan →
  implemented), a dependency-specific Rule 8 Assessment is the correct
  next step once implementation is separately authorized — it is
  explicitly not performed here, matching this task's own instruction
  not to implement or plan implementation-level detail.

## Part 13 — Explicit Non-Goals of This Amendment

- Does not authorize any implementation. No `src/`, `server/`,
  `firestore.rules`, or `tests/` file is created, edited, or touched by
  this document — see Verification, below.
- Does not create any Firestore collection, document shape, or
  security rule. The purchase-draft collection's exact shape,
  scoping, and rules; the supplier collection's exact shape and rules;
  and the field-level validation for both are all implementation-level
  decisions reserved for the later specification (Part 12).
- Does not decide purchase-draft concurrency scoping (Part 5).
- Does not decide or grant any permission (Part 9).
- Does not introduce, approve, or design any payment, cash/credit,
  supplier-debt, supplier-payable, or accounts-payable capability
  (Part 11) — that is a separate, not-yet-started governance track.
- Does not migrate, backfill, or rewrite any existing `PurchaseBatch`,
  `StockBatch`, or `Product` record (Part 7).
- Does not change `calculateBatch`, `calculatePurchaseBatchSummary`,
  `expectedCurrentStockValue`, `businessWorth`, `capitalGrowth`,
  `capitalGrowthPct`, or any other Business Worth Engine output (Part
  10).
- Does not touch Module #17, #18, #19, or #20.
- Does not touch `Product.supplier` (spec #3) — see Part 8.

## Verification

- `git diff --stat HEAD` at the time this document was written shows
  only documentation files changed by this task:
  `docs/specs/04-durable-purchase-capture-and-suppliers-amendment.md`
  [new], `docs/specs/04-purchase-batches.md`, `docs/specs/README.md`,
  and `HANDOFF.md`.
- No `src/`, `server/`, `firestore.rules`, or `tests/` file was
  created, edited, or deleted while producing this document.
- No Firestore collection was created.
- No commit or push was made, per this task's explicit instruction.
