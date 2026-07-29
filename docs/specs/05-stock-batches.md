Business Domain Specification

# Stock Batches

Version 1.0
**Status:** ✅ Approved
**Module #5 of 20 — Phase 1: Core Business Intelligence**
**Architecture references:** [Section 3.6](../architecture/03-domain-architecture.md)
(Stock Batches domain), [Section 2.4 & 7.1](../architecture/02-core-product-principles.md)
(Data Integrity — frozen-at-purchase pricing), [Section 8.5](../architecture/08-module-architecture.md)
(Stock Entry & Quebras module entry)
**Implementation:** `src/context/AppContext.tsx` (`addStockBatch`, lines
785–827), `StockBatch` type (`src/types.ts`), consumed by
`src/utils/calculations.ts` (spec #2)

---

## Purpose

**Why does this module exist?**

Stock Batches is the atomic unit of "what a business owns and what it's
worth" (Architecture 3.6) — one product, one purchase date, one cost
price, one selling price, tracked independently so historical worth is
never distorted by a later price change. Every figure this product shows
an Admin — Business Worth, Embedded Profit, Market Value — ultimately
traces back to a Stock Batch record, not to a Product's reference price
(spec #3) and not to a manually-entered total.

## Business Problem

**What business problem does it solve?**

If a business only tracked "how much rice do I have" without tracking
*when* and *at what price* each unit was bought, a price change on the
next purchase would silently rewrite the value of stock bought weeks
earlier — an Admin's Business Worth would move for a reason that has
nothing to do with anything happening in their business today. Stock
Batches solves this by freezing cost and selling price at the moment of
purchase, permanently, so historical worth stays historically true.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — create new batches (via Stock Entry, spec #4), view batch detail |
| **Manager** | Same access as Owner, per Architecture 6.3 |
| **Staff** | Can create Stock Batches per assigned permissions; cannot edit a batch's frozen price fields after creation, regardless of role |
| **SuperAdmin** | No direct access — business-scoped |

## User Stories

- As a **Business Owner**, I want my last month's stock value to stay
  exactly what it was, even if I've since bought the same product at a
  different price, so that my historical figures stay honest.
- As a **Business Owner**, I want to know which of my batches are
  currently "active" for a product versus superseded by a newer entry,
  so that I understand which price is currently governing that product's
  figures.
- As a **Business Owner**, I want a batch's remaining quantity to update
  automatically as losses are recorded against it, so that I don't have
  to manually recalculate stock on hand.

## Business Rules

**Price freezing — the module's central rule**
- `costPrice` and `sellingPrice` are captured at the moment of purchase
  and frozen permanently — a later reference-price change on the Product
  (spec #3) never retroactively changes an already-written Stock Batch
  (Architecture 7.1, 7.2, 8.5).
- These frozen prices are the actual source of every Embedded Profit,
  Business Worth, and Market Value calculation (spec #2) — never the
  Product's reference price.

**Open/closed status — a real behavior worth stating precisely, not
glossed over:**
- A Stock Batch's `status` is `'open'` or `'closed'`. **This is not a
  "sold out" flag** — it does not mean the batch's stock has been fully
  consumed. The actual rule, confirmed directly in `addStockBatch`
  (`AppContext.tsx`): **only one batch per product can be `'open'` at a
  time.** The moment a new Stock Batch is entered for a product, every
  previously-open batch for that *same product* is automatically closed
  — regardless of how much quantity remains on it.
- **Direct consequence for `isEstimate`:** the Calculation Engine (spec
  #2) treats `isEstimate: true` only for the currently-open batch. Once a
  batch is closed by a newer entry superseding it, its Embedded Profit is
  presented as finalized (`isEstimate: false`) — even if the batch still
  has un-sold, un-lost remaining quantity physically sitting on the shelf,
  and even though this product never records an actual sale. This is
  worth a deliberate confirmation from product ownership, not an assumed
  correct behavior: an Admin restocking a fast-moving product with
  several genuinely still-active older batches on hand would see all but
  the newest one lose their "estimate" flag the moment the new entry is
  saved, which may or may not match what "finalized" should mean here.
  Documented as-is, factually, because a spec's job is to describe real
  behavior precisely — this specific rule is flagged as a candidate for
  explicit product review, not silently endorsed as obviously correct.
- Regardless of `status`, `remainingQuantity` is always computed the same
  way (`quantity − totalQuebraQuantity`, spec #2) — closing a batch never
  freezes or stops its quantity math from responding to a later-recorded
  Quebra against it.

**Legacy tolerance**
- A Stock Batch's link to a Purchase Batch (spec #4) via
  `purchaseBatchId` is optional — batches predating the grouping feature
  have none, and must remain fully valid, fully calculated records
  regardless (Architecture 3.6, `types.ts`'s own governing comment).

**Immutability**
- Once written, a Stock Batch's price fields are immutable (Architecture
  7.2) — no UI path exists, or should ever exist, to edit `costPrice` or
  `sellingPrice` on an already-created batch. A correction, if ever
  needed, is a new record, per the general correction pattern (7.6) —
  though note this module currently has no defined correction mechanism
  of its own; that's out of scope here and not yet designed anywhere in
  this document series.

## Functional Requirements

*Exactly what the module must do.*

1. Create a new Stock Batch with `productId`, `dateEntered`, `quantity`,
   optional `unit`, `costPrice`, `sellingPrice` — via Stock Entry
   (spec #4's `AddStockView`), which is this module's only write path in
   the current implementation.
2. On creation, automatically close any other currently-open batch for
   the same `productId`, per the Business Rules above — this is the
   module's core lifecycle behavior, not an optional step.
3. Optionally link to a `purchaseBatchId` when created as part of a
   grouped Purchase Batch entry (spec #4); remain fully functional
   without one for standalone entries or legacy data.
4. Never expose an edit path for `costPrice`/`sellingPrice` once a batch
   is created.
5. Supply every consumer (Products' detail view, spec #3; Purchase
   Batches' Investment Ledger, spec #4; Dashboard, spec #1; Reports,
   spec #12) with the same underlying record — no consumer maintains its
   own copy or derived cache of a Stock Batch's core fields.

## Non-functional Requirements

**Performance**
- Closing previously-open batches for a product on new-entry creation is
  currently a per-batch `updateDoc` loop (`AppContext.tsx`, line
  807–810) — acceptable at current per-product open-batch counts
  (typically zero or one), but worth noting as the kind of pattern
  Architecture Section 11's scaling discipline would revisit if a future
  business pattern ever produced many simultaneously-open batches per
  product (not expected under the current one-open-batch-per-product
  rule, but named here since the loop's cost is technically proportional
  to however many batches happen to be open at once).

**Security**
- Every Stock Batch read/write is scoped by the standard tenant-isolation
  boundary (Architecture 7.1) — no additional access control in this
  module itself.

**Accessibility**
- Not directly applicable — this module has no dedicated UI surface of
  its own; its data is rendered by consumer modules (Products, Purchase
  Batches, Dashboard, Reports), each carrying its own accessibility
  requirements.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1).

**Mobile**
- Not directly applicable — see Accessibility above; entry happens
  through Stock Entry (spec #4), which carries its own mobile
  requirements.

## KPIs

**How do we know this module succeeds?**

- Zero instances of a Stock Batch's frozen price fields changing after
  creation, in production — verifiable at the Security Rules layer, not
  just by application-level testing.
- Zero instances of a historical figure (a past Closing snapshot, a past
  Report) changing value due to an unrelated, later price change on the
  same product — the concrete, user-visible proof the freezing rule is
  actually holding.
- The open/closed transition behaves correctly and predictably for every
  new Stock Entry — measurable by confirming exactly one batch per
  product is ever `'open'` at a time, no exceptions found in data audits.

## Future Enhancements

*Ideas — not implementation.*

- **Explicit product decision on the `isEstimate` transition rule** named
  above — whether "closed by a newer entry" should really mean
  "finalized, no longer an estimate" given no sale is ever recorded. Not
  a code change proposed here; a decision this spec surfaces for
  deliberate confirmation rather than silent continuation.
- **A defined correction mechanism** for a mis-entered Stock Batch (wrong
  price or quantity caught after saving) — currently undefined anywhere
  in this document series; the general correction pattern (Architecture
  7.6) exists in principle but has no concrete mechanism specified for
  this entity yet.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A new Stock Batch's `costPrice`/`sellingPrice` never changes after
      creation, under any code path.
- [ ] Creating a new batch for a product correctly closes exactly the
      previously-open batch(es) for that same product, and no others.
- [ ] `remainingQuantity` continues to respond correctly to a Quebra
      recorded against a batch regardless of its open/closed status.
- [ ] A legacy batch with no `purchaseBatchId` calculates and displays
      identically to a grouped batch, with no missing figures or broken
      references.
- [ ] The `isEstimate` transition behavior is either confirmed as
      intended by product ownership, or scheduled for a deliberate change
      — not left as an unreviewed side effect of the closing logic.
