Business Domain Specification — Amendment

# Multi-Supplier Purchase Event Amendment

Version 1.0
**Status:** ✅ Approved (decisions recorded below, per explicit Product
Architect authorization, following the Multi-Supplier Purchase Event
investigation). Spec #4 requires no direct edit from this amendment —
see Part 4 for why `PurchaseBatch`'s existing definition is entirely
unchanged.
**Implementation status:** **Not implemented.** This document
authorizes the business specification only — see the companion Rule 8
Assessment and Implementation Plan for exactly what remains gated
before any code is written.
**Amends:** [Purchase Batches (spec #4)](./04-purchase-batches.md) —
additively, alongside the [Durable Purchase Capture and Reusable
Suppliers Amendment](./04-durable-purchase-capture-and-suppliers-amendment.md),
not in place of it.
**Touches, without amending:** Nothing. No new figure or derived
Business Worth value is introduced — see Part 12. No architecture
document requires an edit — confirmed by direct precedent: the prior
`supplierId` amendment, structurally identical in shape, touched no
architecture document either (Architecture 3.5 was inspected directly
this session and contains no trace of it).
**Origin:** Product Architect direction, following a dedicated,
investigation-only task that traced the current `PurchaseBatch`/
`StockBatch`/Investment Ledger/Purchase Draft architecture end-to-end
against the real code, evaluated four candidate models (Models A/B/C
per the investigation task, plus Model D — discovered during the
investigation, not one of the three originally named), and resolved
the one genuinely open product-flow question (how the owner indicates
"continue this purchase with another supplier" vs. "this is a separate
purchase") before this amendment was written.

---

## Why this document exists

An SME owner's real-world restocking trip commonly spans multiple
suppliers in one outing. Today, each supplier's delivery becomes an
unrelated `PurchaseBatch` document with no way to see "how much did I
invest across my whole restocking trip on 23 June" as one figure — the
owner must manually reconstruct it by summing separate Investment
Ledger cards. This amendment closes that gap with the smallest change
that genuinely closes it: an optional correlation field, not a new
domain entity.

## Part 1 — Purpose

Introduce **Purchase Event** as a *correlation*, not a new record type:
a way to mark that several `PurchaseBatch` documents — each still
exactly what it already is, one supplier's delivery — happened as part
of the same broader purchasing activity, so the Investment Ledger can
show their combined totals as one figure when the owner wants that
view.

## Part 2 — Business Problem

Confirmed directly against the current code (`StocksView.tsx:66-102`):
the Investment Ledger's `allSummaries` is a flat list of one card per
`PurchaseBatch`, with no aggregation layer above it. Three suppliers
bought from on the same restocking trip produce three disconnected
cards today, with the owner left to add them up by hand.

## Part 3 — Purchase Event Definition

A Purchase Event is **not a document.** It is a shared correlation
value (`purchaseEventId`) stamped onto two or more `PurchaseBatch`
records that the Admin has explicitly indicated belong to the same
purchasing activity. There is no `PurchaseEvent` collection, no
`PurchaseEvent` document, and no lifecycle state stored anywhere other
than on the `PurchaseBatch` (and, transiently, `PurchaseDraft`)
records it correlates.

**Explicitly rejected for this amendment:** a first-class `PurchaseEvent`
Firestore document. Per Architecture Principle 2.6 (Simplicity Over
Completeness), a new collection is not introduced merely because the
business concept has a name — the correlation-only design fully
satisfies the stated business requirement (Part 2) without one. If a
future requirement genuinely needs event-level data that cannot live
on a `PurchaseBatch` (its own notes distinct from any one batch's
notes, for example), that would be a *separate*, future amendment,
evaluated against a concrete, demonstrated need — not decided here.

## Part 4 — PurchaseBatch Definition Remains Unchanged

**This is the amendment's central discipline, stated explicitly so it
is never accidentally violated during implementation:** `PurchaseBatch`
continues to mean exactly what spec #4's own Purpose section and
Architecture 3.5 already say — *"one real-world purchase/investment
event — money spent, from a supplier, on a given date."* This amendment
does not redefine that. It adds an optional way to say two or more
such records are related, without changing what any single one of them
is.

## Part 5 — `purchaseEventId`

`PurchaseBatch.purchaseEventId?: string` — optional, additive, present
only on `PurchaseBatch` documents the Admin has explicitly correlated
with at least one other. A client-generated string value (matching this
repository's existing ID-generation convention — e.g.
`'pevent-' + Date.now() + ...'`), never itself a Firestore document
reference. **Not assigned by default, ever** — see Part 7 for why
lazy, explicit-only assignment is the deliberate design, not an
oversight.

## Part 6 — PurchaseDraft `purchaseEventId`

`PurchaseDraft.purchaseEventId?: string` — optional, additive,
carrying a Purchase Event correlation forward through the existing
durable-draft mechanism (Rule 8 Assessment, Durable Purchase Capture
Amendment, Section 3) so that an interruption (crash/refresh) while
entering a *second* supplier's products, after the Admin has already
chosen to correlate it with a first, does not silently lose that
correlation. This is the only reason a draft-level field is needed at
all — the field itself carries no other meaning.

## Part 7 — Event Lifecycle

**Two findings from direct code inspection shaped this design, and are
recorded here because they materially constrain what a safe
implementation must do — not just what it should do:**

1. `App.tsx`'s `onComplete` routing sends Staff back to the *same*
   `add-stock` tab value after a successful Add Stock submit, which
   means (React bailing out of re-rendering an unchanged state value)
   `AddStockView` never unmounts for a Staff member who stays on that
   screen — the same component instance persists across a successful
   finalize.
2. `AddStockView.tsx`'s `submittedMessage` state is set on success but
   is **never reset to `null`** except by the business-switch effect —
   meaning, for the same Staff member in finding 1, the success screen
   would remain permanently displayed after one successful submit, with
   no path back to the form short of a business switch or navigating
   away and back through a different tab.

**Consequence: any "continue this purchase with another supplier"
mechanism must not depend on the app's existing `onComplete`/tab-
navigation plumbing at all** — that plumbing is unreliable for exactly
this scenario. The lifecycle below is designed around that constraint,
not despite it.

**Lifecycle, precisely:**

- **Begins:** lazily — only the first time the Admin explicitly clicks
  an "Add Another Supplier to This Purchase" action on the success
  screen shown after a `PurchaseBatch` is finalized. Never assigned
  upfront at Add Stock session start, and never assigned to a
  single-supplier purchase that the Admin never chose to extend.
- **First correlation:** clicking that action generates a
  `purchaseEventId` (if the just-finalized batch doesn't already carry
  one) and applies it to that one, already-finalized `PurchaseBatch`
  via a small, retroactive field update — reusing the existing,
  unmodified `purchaseBatches` update rule (`isMemberOf`-only, no
  subscription gate), the same rule tier archive/unarchive already
  uses, on the same reasoning: organizing an already-real record does
  not create or change Business Worth.
- **Continues:** the same action resets the Add Stock form in place —
  explicitly, locally, without touching `onComplete()` or any tab
  navigation — carrying the same `purchaseEventId` into the next
  supplier's entry (via local state, and via `PurchaseDraft` for
  interruption safety, Part 6).
- **No "unfinished event" state exists, by construction.** Every
  `PurchaseBatch` correlated into an event is already a fully real,
  valid, correctly-valued record the moment it's created — the event
  is a tag over already-complete records, never a container something
  can be incomplete inside. There is nothing to "resume" and nothing
  that requires explicit abandonment-handling.
- **Ends:** either explicitly (the Admin chooses "Concluir"/Finish
  instead of "Add Another Supplier" on any given success screen) or
  implicitly (the Admin simply stops — closes the tab, does something
  else). Both are equally valid, complete outcomes with zero data loss
  either way.
- **Business switching:** no new handling required — the existing
  business-switch reset effect already unconditionally clears all Add
  Stock local state; a Purchase Event cannot span two businesses
  regardless, since `PurchaseBatch` is already business-scoped.
- **Concurrency:** no new concern — `purchaseEventId` is a plain,
  client-generated string tag with no ownership/locking of its own;
  two different team members running independent multi-supplier
  sequences produce independent, non-colliding values, the same
  ID-generation convention already used throughout this codebase.

## Part 8 — Multi-Supplier Flow (Add Stock UX)

The success screen shown after any Add Stock finalize gains one new,
secondary action alongside the existing default ("Concluir"):
**"Adicionar Outro Fornecedor a Esta Compra."** No upfront "Start
Purchase Event" step, no separate Event screen — the multi-supplier
flow is discovered progressively, only after the first supplier's
purchase is already safely finalized, matching the amendment's own
"lazy, explicit-only" discipline (Part 7). A live running total shown
*during* multi-supplier entry is explicitly a non-goal for this
amendment (Part 18) — the Investment Ledger view (Part 10) is where
the aggregate is shown, after the fact.

## Part 9 — Event Completion / Event Abandonment

Directly answered by Part 7's lifecycle design: there is no distinct
"completion" action beyond choosing "Concluir," and no "abandonment"
state exists to handle, because nothing is ever incomplete at the
event level. This is a deliberate simplification, not an omission —
recorded explicitly so a future reader doesn't wonder whether an
abandonment flow was overlooked.

## Part 10 — Investment Ledger Behavior / Aggregation Rules

`StocksView.tsx`'s existing `allSummaries` computation
(`PurchaseBatchSummary[]`, built via the unmodified
`calculatePurchaseBatchSummary`) is reused entirely as-is. A new,
additive, opt-in grouping view sums already-computed
`totalInvestmentValue`/`totalMarketValue`/`totalEmbeddedProfit` across
every summary sharing the same `purchaseBatch.purchaseEventId`,
falling back to today's ungrouped, per-`PurchaseBatch` display for any
summary where it's absent — the exact same fallback shape the existing
`legacyByDate` logic already uses for `StockBatch`es with no
`purchaseBatchId`. **No new calculation function.** Aggregation is
addition performed on numbers `calculatePurchaseBatchSummary` already
produces.

## Part 11 — Historical Compatibility

Every existing `PurchaseBatch` simply has no `purchaseEventId` — read
exactly as it is today, in every view, with zero special-casing beyond
the fallback already described in Part 10. No migration, no backfill,
no rewrite of any `PurchaseBatch`, `StockBatch`, `Supplier`, or
`SupplierRecord` document — the identical no-migration reasoning
already established (and shipped) for the prior amendment's
`supplierId` field applies here without modification.

## Part 12 — Business Worth Boundary (Mandatory)

**This amendment does not alter the Business Worth calculation model
in any way.** Confirmed by direct inspection this session:
`calculateBatch()`, `calculateInventoryTotals()`, and
`calculatePurchaseBatchSummary()` read no supplier, no
`purchaseEventId`, and no draft field of any kind, at any point,
before or after this amendment. A Purchase Event's total is arithmetic
performed on `calculatePurchaseBatchSummary`'s already-computed,
unmodified output — never a new formula.

**Correction to an illustrative figure used during this amendment's
own investigation, recorded here for accuracy:** an example figure of
"Expected Sales Value: 5,000" alongside "Investment: 45,000" conflated
`totalMarketValue` (quantity × sellingPrice, the correct meaning of
"expected selling value") with `totalEmbeddedProfit`
(`totalMarketValue − totalInvestmentValue`). A correct illustrative
example: Investment 45,000 · Expected Selling Value [the sum of each
correlated batch's `totalMarketValue`, e.g. 58,000] · Embedded Profit
[the difference, e.g. 13,000] — not a standalone "5,000" presented as
if it were the selling value itself.

## Part 13 — Payment Scope Exclusion (Mandatory)

**Payment and supplier-payable capabilities remain entirely excluded
from this amendment**, exactly as they were excluded from the prior
Durable Purchase Capture Amendment (that document's Part 11, unchanged
and unaffected here). A Purchase Event means capital deployed into
inventory — nothing about whether, when, or how any supplier has been
paid. No payment, credit, debt, amount-owed, or settlement field,
type, or rule is introduced anywhere by this amendment.

## Part 14 — Security

`purchaseBatches`' existing `create` rule needs one additive
field-shape check, mirroring `supplierId`'s own exactly:
`(!('purchaseEventId' in request.resource.data) || request.resource.data.purchaseEventId is string)`.
Confirmed by direct inspection: the current rule does not yet
constrain this field's shape at all (it doesn't exist yet), so this is
a real, identified, non-blocking implementation task, not a
retroactive fix to anything already shipped. `purchaseDrafts`' existing
rule requires no change — draft documents are not field-validated
beyond ownership, so one more optional field needs no new rule clause.
The retroactive `purchaseEventId` assignment (Part 7) uses the
existing, unmodified `purchaseBatches` `update` rule — no new
authorization tier, no new rule pattern.

## Part 15 — Draft Persistence

Covered in full by Part 6. No change to draft ownership or concurrency
model (`purchaseDrafts/{uid}`, per `(business, user)`, unmodified) —
this amendment does not touch that decision at all.

## Part 16 — Business Switching Behavior

Covered in full by Part 7's own subsection — no new handling required,
existing reset behavior already correct.

## Part 17 — Concurrency Considerations

Covered in full by Part 7's own subsection — no new concurrency model,
no new collision risk.

## Part 18 — Non-Goals

- No `PurchaseEvent` Firestore collection or document (Part 3).
- No live "running total" display during multi-supplier entry — a
  future, separately-evaluated enhancement, not required to satisfy
  this amendment's stated business problem (Part 2).
- No retroactive correlation of two *already-finalized*, previously
  unrelated `PurchaseBatch` documents from the Investment Ledger (e.g.,
  "merge these into one event after the fact") — a plausible future
  enhancement, explicitly not built here.
- No fix to the pre-existing "Save N Batches" `StockBatch`-vs-
  `PurchaseBatch` terminology conflation (identified in the prior
  investigation) — deliberately kept as a separate, unrelated UX
  cleanup, not bundled into this domain-model amendment.
- No payment/credit/debt capability (Part 13).
- No change to `calculateBatch`, `calculateInventoryTotals`,
  `calculatePurchaseBatchSummary`, or any Business Worth figure
  (Part 12).
- No migration of any historical record (Part 11).

## Part 19 — Terminology

- **`Purchase Batch`** — unchanged meaning (Part 4): one supplier's
  delivery, one or more product lines.
- **`Stock Batch`** — unchanged: one product's inventory line item.
- **`Purchase Event`** — new: a correlation across `PurchaseBatch`
  records, not a document (Part 3).
- **`Supplier Purchase`** — explicitly not adopted as a new term; a
  "Supplier Purchase" is precisely what a `Purchase Batch` already is.

## Part 20 — Acceptance Criteria

- [ ] A single-supplier Add Stock purchase behaves identically to
      today — no `purchaseEventId` is ever assigned unless the Admin
      explicitly chooses "Add Another Supplier."
- [ ] Choosing "Add Another Supplier" after a successful finalize
      resets the Add Stock form in place, without navigating away, and
      does not depend on `onComplete()` or tab routing.
- [ ] Two or more `PurchaseBatch` documents sharing a `purchaseEventId`
      display as one aggregated entry in an opt-in Investment Ledger
      view, with `totalInvestmentValue`/`totalMarketValue`/
      `totalEmbeddedProfit` summed from their already-computed,
      unmodified `PurchaseBatchSummary` figures.
- [ ] Every existing `PurchaseBatch` document, unmodified, continues to
      display exactly as it does today.
- [ ] An interrupted (crash/refresh) second-supplier entry, after the
      Admin has already chosen to correlate it, restores with its
      `purchaseEventId` intact.
- [ ] No `calculateBatch`, `calculateInventoryTotals`, or
      `calculatePurchaseBatchSummary` output changes for any existing
      or new `PurchaseBatch`.
- [ ] No payment/credit/debt field, type, or rule exists anywhere in
      the implementation.

## Governance Path

Business/Product Decision (this amendment) → Rule 8 Assessment →
Implementation Plan → Implementation — the same sequence already
proven for the Durable Purchase Capture Amendment. No new BDR, no new
POL, no new ADR (Part 15 of the investigation report this amendment
converts; confirmed by direct precedent, not merely asserted).
