Business Domain Specification

# Purchase Batches

Version 1.0
**Status:** ✅ Approved
**Module #4 of 20 — Phase 1: Core Business Intelligence**
**Architecture references:** [Section 3.5](../architecture/03-domain-architecture.md)
(Purchase Batches domain), [Section 2.6](../architecture/02-core-product-principles.md)
(Simplicity Over Completeness — client-derived numbering rationale),
[Section 7.1](../architecture/07-data-architecture.md) (live source
wins), [Section 8.3](../architecture/08-module-architecture.md)
(Purchase Batches module entry), [Section 11.4](../architecture/11-scalability-strategy.md)
(server-side numbering as a scale-triggered item), [Section 13.10](../architecture/13-development-strategy.md)
(item 13, the same trigger named in the Development Strategy's master table)
**Implementation:** `src/utils/purchaseBatchCalculations.ts`,
`src/components/AddStockView.tsx`, `src/components/StocksView.tsx`
(Investment Ledger view), `PurchaseBatch`/`StockBatch` types (`src/types.ts`)

---

## Purpose

**Why does this module exist?**

Purchase Batches represents one real-world purchase event — a delivery
from a supplier, on a given date, possibly covering several products at
once — as the single unit an Admin actually thinks in when they say "I
bought stock from my supplier last Tuesday." Without this module, Stock
Batches (spec #5) would exist only as disconnected per-product line
items with no memory of which ones arrived together, from whom, on what
date — technically sufficient for calculation, but not how a real
purchase is remembered or searched for later.

## Business Problem

**What business problem does it solve?**

A single supplier delivery is rarely one product — it's rice, oil, and
soap arriving together on one invoice, one payment, one trip to the
market. Purchase Batches groups those line items the way the Admin's own
memory and paperwork already do, and gives that group a permanent,
human-readable identity (`BAT-000001`) — something an Admin can reference
in conversation or in a note, unlike a raw database ID.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — create, view, and (via archival, not deletion) retire Purchase Batches |
| **Manager** | Same access as Owner, per Architecture 6.3 |
| **Staff** | Can create Purchase Batches (recording a new delivery) per assigned permissions; `createdByName` records who, so accountability is preserved even when Staff record on the Owner's behalf |
| **SuperAdmin** | No direct access — business-scoped, never read individually by SuperAdmin |

## User Stories

- As a **Business Owner**, I want to record everything I bought from one
  supplier delivery as a single entry, so that my Investment Ledger
  matches how I actually remember the purchase.
- As a **Business Owner**, I want a permanent reference number for each
  purchase, so that I can find or refer to "BAT-000012" later without
  needing to remember the exact date or supplier by heart.
- As a **Business Owner**, I want to see what I originally invested in a
  purchase alongside what's left of it today, so that I understand both
  facts without losing either one.
- As a **Staff member**, I want to record a new delivery with several
  products at once, so that I don't have to create separate entries one
  product at a time.
- As a **Business Owner reviewing old data**, I want batches recorded
  before this feature existed to still show up in my Investment Ledger,
  so that no historical purchase is ever hidden by a later feature
  change.

## Business Rules

**Batch numbering**
- Every Purchase Batch gets a permanent `batchNumber` (`BAT-000001`
  format, `generateBatchNumber`) — never re-issued, never exposing the
  underlying Firestore document ID to the user (Architecture 8.3).
- `batchSeq` is currently **client-derived**, from the highest sequence
  seen so far (`getNextBatchSeq`) — correct and sufficient at this
  business's current scale (Principle 2.6, Simplicity Over
  Completeness). Moving this server-side is an explicitly named,
  trigger-based scale item (Architecture 11.4, Development Strategy
  13.10, item 13) — not a defect in the current implementation, a
  documented future action once a concrete trigger (concurrent staff
  entering stock at high frequency for one business) is actually
  measured, not before.

**Grouping**
- A Purchase Batch contains one or more Stock Batch line items — each
  `StockBatch` optionally links back via `purchaseBatchId`.
- **Legacy data integrity:** Stock Batches created before this grouping
  feature existed have no `purchaseBatchId` — these are still shown in
  the Investment Ledger, grouped by date instead, never lost or hidden
  by the newer grouping capability (per the type definition's own
  governing comment in `types.ts`).

**Original vs. current figures — never collapsed**
- Original-at-purchase figures (what was invested) and current,
  Quebra-adjusted figures (what's left) are always shown side by side,
  never combined into one number — this is what lets an Admin see "what
  I invested" versus "what's left" without losing either fact
  (Architecture 7.1).

**No independent calculation**
- This module only aggregates and formats — every per-line-item figure
  comes from the Calculation Engine (spec #2) via `calculateBatch`,
  never recomputed independently here (Architecture 8.3's explicit
  dependency rule).

**Retirement, not deletion**
- A Purchase Batch can be `archived` (with `archivedAt` recorded) — this
  is distinct from the `PurchaseBatchStatus` badge shown per batch
  (`active` / `partially_remaining` / `fully_consumed` / `archived`),
  which reflects the batch's own stock-remaining lifecycle, not a
  separate delete action.

## Functional Requirements

*Exactly what the module must do.*

1. Support entering multiple product line items under one Purchase
   Batch in a single flow (`AddStockView`) — supplier, date, and notes
   captured once at the batch level, not repeated per line item.
2. For each line item, offer product autocomplete against the existing
   catalog (spec #3), with an inline "create new" option when no exact
   match exists — this module is one of Products' two real creation
   entry points, alongside standalone Stock Entry (spec #5's boundary
   with this module).
3. Generate a permanent `batchNumber` at creation via
   `generateBatchNumber(getNextBatchSeq(existingBatches))` — computed
   once, never regenerated or reassigned after the batch is saved.
4. Record `createdByName` — whichever Staff/Owner/Manager account
   performed the entry — for accountability, without gating who can see
   this field beyond normal role-based access.
5. Build a `PurchaseBatchSummary` for the Investment Ledger view
   (`StocksView`) — combining `PurchaseBatch` metadata,
   `LineItemCalculation[]` (per-product figures via the Calculation
   Engine), `productCount`, and `totalQuantity`.
6. Group and display legacy (pre-grouping-feature) Stock Batches by date
   when no `purchaseBatchId` exists, so the Investment Ledger view never
   has a visible gap for older data.
7. Support archiving a Purchase Batch — distinct from any stock-status
   change on its underlying Stock Batches.

## Non-functional Requirements

**Performance**
- `getNextBatchSeq` is O(n) over existing Purchase Batches — acceptable
  at current, named scale (Principle 2.6); the concrete trigger for
  moving this server-side is already defined in Architecture 11.4/13.8,
  not re-decided here.
- Building a `PurchaseBatchSummary` reuses the Calculation Engine's
  `O(batches + quebras)` cost (spec #2, corrected from an earlier "O(n)"
  statement — see spec #2's Performance section: quebras are now grouped
  by `batchId` once via `groupQuebrasByBatch` rather than re-scanned per
  line item) — this module adds only grouping/aggregation overhead on
  top, no independent recomputation.

**Security**
- Every Purchase Batch and its line items are scoped by the same
  tenant-isolation boundary as every other business-scoped entity
  (Architecture 7.1) — this module performs no additional access control
  of its own.
- `createdByName` is a display convenience, not an audit-log-grade
  record — it identifies who performed the action for the Admin's own
  reference, distinct from the Platform Audit Log's tamper-evident,
  privileged-server-only record (Architecture 9.6, 12.4), which this
  module has no relationship to.

**Accessibility**
- `batchNumber` renders `.type-number` (tabular figures, Design System)
  wherever shown, consistent with every other numeric identifier in the
  product.
- Original-vs-current figure pairs are always labeled, never relying on
  position alone to communicate which number is which.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1).

**Mobile**
- Multi-line-item entry (`AddStockView`) must remain usable on a small
  screen — each line item's fields stack rather than requiring
  horizontal scroll, and adding/removing a line item is a clearly
  visible, appropriately-sized (44×44px minimum) action, per
  [DESIGN_SYSTEM.md → Mobile Rules](../../DESIGN_SYSTEM.md#mobile-rules).

## KPIs

**How do we know this module succeeds?**

- An Admin can locate a specific past purchase by its `batchNumber`
  alone, without needing to recall the exact date.
- Zero instances of a Purchase Batch's aggregate figures disagreeing
  with the sum of its own line items' Calculation Engine output — same
  data-integrity standard as every module reading from spec #2.
- Legacy (pre-grouping) batches remain fully visible and correctly
  valued in the Investment Ledger — measurable by confirming no batch
  count discrepancy exists between the raw `batches` collection and what
  `StocksView` displays.

## Future Enhancements

*Ideas — not implementation.*

- **Server-side `batchSeq` generation** — already scoped precisely in
  Architecture 11.4 and Development Strategy 13.8/13.10 (item 13); this
  spec doesn't re-define the trigger, only confirms this is the module
  it belongs to when that trigger fires.
- **Supplier-level purchase history view** — grouping Purchase Batches
  by supplier over time, distinct from the current per-product Investment
  Ledger view. Not currently requested or scoped; noted so a future ask
  isn't silently designed around.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A multi-product delivery can be entered as one Purchase Batch with
      correctly linked Stock Batch line items.
- [ ] `batchNumber` is generated once, is permanent, and is never
      reassigned or duplicated across two Purchase Batches.
- [ ] The Investment Ledger view correctly displays both legacy
      (ungrouped) and current (grouped) batches with no data gap.
- [ ] Original-at-purchase and current (Quebra-adjusted) figures are
      always shown together, never collapsed into a single number.
- [ ] Every per-line-item and aggregate figure matches the Calculation
      Engine's own output exactly — verified by test, given how directly
      this feeds Business Worth (spec #2).
