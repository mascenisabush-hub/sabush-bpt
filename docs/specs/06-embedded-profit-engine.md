Business Domain Specification

# Embedded Profit Engine

Version 1.0
**Status:** ✅ Approved
**Module #6 of 20 — Phase 1: Core Business Intelligence**
**Architecture references:** [Section 1](../architecture/01-product-vision.md)
(Embedded Profit as a named Mission scale target), [Section 3.6](../architecture/03-domain-architecture.md)
(Stock Batches domain), [Section 8.2](../architecture/08-module-architecture.md)
(Calculation Engine — `embeddedProfit`, `isEstimate`)
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
for the raw `embeddedProfit` formula — this spec does not redefine it,
only the presentation and product meaning built on top of it ·
[Stock Batches (spec #5)](./05-stock-batches.md) for the open/closed
lifecycle rule this module's central distinction depends on
**Implementation:** `src/components/DashboardView.tsx` (lines 157–174,
the estimated/finalized split; lines 467–530, the breakdown modal)

---

## Purpose

**Why does this module exist?**

Embedded Profit — unsold profit potential currently sitting in
inventory — is one of the Mission's own explicitly named targets
(Architecture Section 1, alongside Business Worth and Capital Invested).
This spec exists separately from Business Worth Engine (#2) because
Embedded Profit has a product-level distinction Business Worth doesn't:
not every dollar of Embedded Profit is equally certain. This module
documents that distinction — **estimated vs. finalized** — its meaning,
where it's currently shown, and a real dependency it inherits directly
from Stock Batches (spec #5) that deserves the same explicit review that
spec already asked for.

**Boundary with spec #2, stated precisely:** spec #2 owns the raw
`embeddedProfit = marketValue − investmentValue` formula
(`calculateBatch`) and the business-wide total
(`calculateInventoryTotals`). This spec owns what happens *after* that
number exists — specifically, splitting it by batch status into
"estimated" and "finalized," and everywhere that split is (and isn't yet)
surfaced to the Admin.

## Business Problem

**What business problem does it solve?**

A flat Embedded Profit total tells an Admin "this much value is sitting
in my stock," but not how *sure* that number is. A batch still open and
actively being sold from carries more uncertainty than one already
superseded by a newer purchase. Without this distinction, an Admin
can't tell the difference between "profit I can be fairly confident in"
and "profit that's still moving" — both folded into one number that
reads with equal weight either way.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — sees the total, and the estimated/finalized breakdown via the Dashboard's breakdown modal |
| **Manager** | Same access as Owner, per Architecture 6.3 |
| **Staff** | Sees whatever Embedded Profit figures their Dashboard access already permits (spec #1) — no separate permission gate specific to this split |
| **SuperAdmin** | No direct access — never reads a single business's Embedded Profit individually, only anonymized, aggregated patterns (Architecture 3.1, 10.9) |

## User Stories

- As a **Business Owner**, I want to see how much of my Embedded Profit
  comes from stock I've already moved past (finalized) versus stock I'm
  still actively selling from (estimated), so that I understand how
  solid my current profit picture really is.
- As a **Business Owner**, I want the total Embedded Profit figure on my
  Dashboard to always equal the sum of the estimated and finalized
  breakdown, so that the two views of the same number never disagree.
- As a **Business Owner viewing a Report** (currently unmet — see
  Functional Requirements), I want the same estimated/finalized context
  available wherever Embedded Profit is shown, not only on the Dashboard.

## Business Rules

**The estimated/finalized split**
- An open batch's Embedded Profit contributes to `estimatedEmbeddedProfit`;
  a closed batch's contributes to `finalizedEmbeddedProfit`
  (`DashboardView.tsx`, lines 161–174) — computed by iterating every
  batch, calling `calculateBatch` (spec #2), and bucketing the result by
  `batch.status`.
- `estimatedEmbeddedProfit + finalizedEmbeddedProfit` must always equal
  `totalEmbeddedProfitAllTime` for the same data — this is a checkable
  invariant, not just an expectation.

**This split inherits Stock Batches' (spec #5) open/closed rule directly
— restated here because it changes what "finalized" means:**
- Per spec #5: a batch is `'closed'` the moment a *newer* batch is
  entered for the same product — not when its stock is sold out or fully
  accounted for. This means "finalized" Embedded Profit, as currently
  labeled and shown to the Admin, can include profit from a batch that
  still has real, un-sold remaining quantity on the shelf. Spec #5 flagged
  this open/closed behavior itself as worth a deliberate product review;
  this spec flags the direct downstream consequence — the word
  **"finalized"** shown to the Admin implies more certainty than the
  underlying mechanism actually guarantees. Both specs point at the same
  underlying decision; it only needs to be made once; it's noted in both
  places because both modules are genuinely affected by the outcome.

**Never a realized figure**
- Embedded Profit, in either its raw or split form, never implies a sale
  occurred (Architecture 1.8, 8.2) — the breakdown modal's own
  explanatory text (`dashboard.breakdownModal.explanation`) exists
  specifically to keep this clear to the Admin, not just to this
  document series.

## Functional Requirements

*Exactly what the module must do.*

1. Compute `estimatedEmbeddedProfit` and `finalizedEmbeddedProfit` by
   iterating all batches, calling `calculateBatch` (spec #2) per batch,
   and summing by `status` — currently implemented inline in
   `DashboardView.tsx`, not as a named export of the Calculation Engine
   (spec #2) itself.
2. Display the breakdown in a dedicated modal, triggered from the
   Dashboard's Embedded Profit KPI card (spec #1), showing: estimated
   (open), finalized (closed), the total, and — for context — Expenses
   and Withdrawals subtracted below it (mirroring the Business Worth
   formula's own components, spec #2), so the Admin can see how Embedded
   Profit relates to Business Worth without leaving the modal.
3. **Not currently implemented, and worth naming as a real gap:** no
   Report (spec #12, not yet specified) currently uses this
   estimated/finalized split, or the underlying `isEstimate` flag at all
   — confirmed directly against the Reports source. Reports show
   Embedded Profit as a single figure with no estimate/finalized context,
   while Dashboard shows the same underlying data with it. This is a
   presentation-completeness gap, not a numeric-disagreement one (the
   totals still match, per spec #2/#15's "must never disagree" rule) —
   but it means an Admin gets a materially more informative view of this
   specific metric on Dashboard than on any Report showing the same
   number.
4. Support sorting the Dashboard's product list by embedded profit
   (highest first) — already implemented (spec #1's Functional
   Requirement #7), computed the same way, per-product, via `calculateBatch`
   summed across that product's batches.

## Non-functional Requirements

**Performance**
- The estimated/finalized split iterates the full batch set once,
  calling `calculateBatch` per batch — the same O(n) cost class as
  `calculateInventoryTotals` (spec #2), but currently a **second**,
  separate iteration rather than sharing one pass with whatever computes
  the plain total. At current scale this is immaterial; flagged as a
  candidate for consolidation into a single aggregation function if this
  module and spec #2's totals are ever computed in the same render path
  under real load (Architecture Section 11's discipline: not a problem
  today, worth naming so it isn't rediscovered as a surprise later).

**Security**
- No additional access control beyond the standard tenant-isolation
  boundary (Architecture 7.1) — this module reads already-scoped batch
  data, same as every other consumer.

**Accessibility**
- The breakdown modal's estimated/finalized/total rows use `.type-number`
  (tabular figures) consistently, and each row is clearly labeled — no
  reliance on color alone to distinguish estimated from finalized.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1).

**Mobile**
- Breakdown modal follows standard Dialog rules
  ([DESIGN_SYSTEM.md → Dialogs](../../DESIGN_SYSTEM.md#dialogs--modals)) —
  `p-3` outer padding, scrollable if content exceeds viewport height.

## KPIs

**How do we know this module succeeds?**

- `estimatedEmbeddedProfit + finalizedEmbeddedProfit` equals
  `totalEmbeddedProfitAllTime` in 100% of cases, verified by test, not
  spot-check — this is the one hard invariant this module owns.
- An Admin can correctly explain, after viewing the breakdown modal once,
  the difference between the estimated and finalized figures — a
  comprehension KPI, best measured qualitatively (support ticket volume
  asking "what does finalized mean here" is a reasonable proxy signal).

## Future Enhancements

*Ideas — not implementation.*

- **Resolve the "finalized" naming/meaning question** — the same
  decision spec #5 already surfaced, restated here because this module
  is the one that actually presents the word "finalized" to the Admin.
  A single product decision here resolves both specs' open flag at once.
- **Bring the estimated/finalized split into Reports** (spec #12, not yet
  written) — closing the presentation gap named in Functional
  Requirement #3, once Reports is specified and this split's product
  meaning is settled.
- **Promote the split computation into the Calculation Engine** (spec
  #2) as a named export (e.g., `calculateInventoryTotalsBySplit`) rather
  than inline Dashboard logic — worth doing at the same time Reports
  adopts the split, so both consumers share one implementation instead of
  two.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] `estimatedEmbeddedProfit + finalizedEmbeddedProfit` is provably
      equal to `totalEmbeddedProfitAllTime` for any given data set.
- [ ] The breakdown modal correctly reflects a change in batch status
      (a new Stock Entry closing a prior batch, spec #5) immediately, with
      no stale or cached split.
- [ ] The "finalized" terminology and its underlying meaning have been
      explicitly confirmed by product ownership — not left as an
      unreviewed side effect inherited from Stock Batches' closing rule.
- [ ] Product-level sort by embedded profit on the Dashboard produces
      results consistent with the same figures shown elsewhere for those
      products.
