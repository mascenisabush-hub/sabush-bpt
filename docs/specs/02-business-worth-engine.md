Business Domain Specification

# Business Worth Engine

Version 1.0
**Status:** Drafted, awaiting approval
**Module #2 of 20 — Phase 1: Core Business Intelligence**
**Architecture references:** [Section 1](../architecture/01-product-vision.md)
(Product Vision — Business Worth as the Mission's own defined target),
[Section 2.4 & 2.10](../architecture/02-core-product-principles.md)
(Data Integrity Over Convenience, Historical Integrity), [Section 7.6](../architecture/07-data-architecture.md)
(Immutability tiers), [Section 8.2 & 8.8](../architecture/08-module-architecture.md)
(Calculation Engine, Closing)
**Implementation:** `src/utils/calculations.ts` (`calculateBatch`,
`calculateInventoryTotals`), `src/context/AppContext.tsx` (`businessWorth`,
`capitalGrowth`, `capitalGrowthPct`, lines 375–393)

---

## Purpose

**Why does this module exist?**

Business Worth Engine is not a screen — it's the calculation layer that
every screen showing a Worth-related figure (Dashboard, Reports,
Closings) reads from. It exists so "how much is my business worth" has
exactly one answer, computed exactly one way, everywhere it's asked. This
is the module Architecture Section 15.8 already names as the platform's
single highest-consequence piece of logic: a disagreement here isn't a
display bug, it's the product's core promise breaking.

This spec documents the Engine as distinct from the Dashboard module
(spec #1) deliberately — Dashboard is one *consumer* of this Engine, not
the Engine itself. Reports (#12), Closings (#11), and every future AI
feature that reads financial figures (Architecture Section 10.2/10.3) are
consumers too, and this spec is what all of them are held to.

## Business Problem

**What business problem does it solve?**

A small business owner without formal bookkeeping has no single number
that answers "what is my business actually worth right now" — profit and
loss statements assume a level of record-keeping most of Sabush's target
Admins (Architecture Section 1.4) don't have and don't need forced on
them. Business Worth Engine produces that single number from data the
Admin is already recording anyway (stock purchases, sales prices,
expenses, withdrawals) — no separate bookkeeping exercise required.

## Users

This module has no direct UI — it has no "users" in the sense of people
interacting with a screen. Its users are the other modules that consume
its output, and, transitively, everyone who reads a Worth-related figure
anywhere in the product:

| Consumer module | What it reads |
|---|---|
| **Dashboard** (#1) | `businessWorth`, `capitalGrowth`, `capitalGrowthPct`, `totalEmbeddedProfitAllTime`, `totalInvestmentValueAllTime`, `totalMarketValueAllTime` |
| **Reports** (#12) | Same figures, filtered to a date range via `generateReportSummary` |
| **Closings** (#11) | Freezes a `businessWorthAtClose` snapshot at period-close time (Architecture 8.8) |
| **AI Intelligence** (#15, future) | Business Worth Prediction and Capital Forecasting (Architecture 10.2/10.3) read this Engine's real, historical output as their input — they never reimplement the calculation |

## User Stories

- As a **Business Owner**, I want my Business Worth to reflect what's
  really happened to my money and stock, so that I can trust the number
  instead of double-checking it myself.
- As a **Business Owner**, I want a Quebra (loss) to immediately reduce
  both my Investment Value and Market Value together, so that a damaged
  or stolen item doesn't quietly inflate my numbers.
- As a **Business Owner**, I want my Business Worth to never assume I've
  sold anything I haven't, so that the figure stays honest even if I
  never make a single sale through the app.
- As a **Business Owner**, I want my Capital Growth to be measured
  against a fixed starting point, so that I can see real progress instead
  of a number that resets or drifts.
- As a **future AI feature** (developer story, not an end-user one), I
  want to read Business Worth history without reimplementing how it's
  calculated, so that a forecast is provably built on the same ground
  truth the Admin already sees.

## Business Rules

**Business Worth**
- Never editable — there is no field anywhere an Admin, Staff, or
  platform operator can directly set this value.
- Calculated only, via exactly one formula:
  `businessWorth = totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime`
  (`AppContext.tsx`, line 389). Market Value is what's genuinely on the
  shelf, valued at asking price; Expenses and Withdrawals are real money
  that has actually left the business. No assumed sale, no fabricated
  cash figure — the formula's own governing comment in the codebase
  states this rule directly, and this spec inherits it rather than
  restating it differently.
- Historical, but not itself an immutable record on its own — it's a
  *live-computed* figure until the moment a Closing freezes it.
- **Immutable after Closing:** at Closing time (Architecture 8.8), the
  current `businessWorth` is written into the Closing document as
  `businessWorthAtClose` — a permanently frozen snapshot, per Section
  7.6's "truly immutable, no exceptions" tier. The live `businessWorth`
  figure keeps moving after that (new activity in the next open period);
  the frozen snapshot does not.

**Embedded Profit**
- `embeddedProfit = marketValue − investmentValue`, computed per-batch
  (`calculateBatch`) and summed (`calculateInventoryTotals`) — never
  computed any other way anywhere else in the app.
- `isEstimate: true` for any batch with `status === 'open'` — an open
  batch's profit is potential, not finalized, and every consumer must
  preserve that distinction (Architecture 8.2).
- Never implies a sale occurred — this is unsold inventory value, full
  stop (Architecture Section 1.8's Worth-First scope test, enforced here
  at the calculation layer, not just the product-positioning layer).

**Investment Value & Market Value**
- Both computed off the *same* `remainingQuantity` basis, always — a
  Quebra reduces both simultaneously, never one without the other
  (Architecture 7.1's "live source wins" rule, expressed in code).
- `remainingQuantity = batch.quantity − totalQuebraQuantity` — sourced
  from the batch's own live quantity and its own associated Quebras,
  never a cached or denormalized total.

**Initial Capital**
- Sourced from the `initial` Stock Count's `totalValue` — itself in
  Section 7.6's "truly immutable, no exceptions" tier the moment it's
  recorded.
- This is the fixed baseline Capital Growth is measured against — the
  entire reason this baseline is permanent (per the code's own governing
  comment: "Growth is measured against the Initial Business Capital
  baseline — the whole reason that baseline is permanent and never
  editable").

**Capital Growth**
- `capitalGrowth = businessWorth − initialCapitalValue`.
- `capitalGrowthPct = initialCapitalValue > 0 ? (capitalGrowth / initialCapitalValue) × 100 : 0` —
  explicitly guarded against division by zero for a business that hasn't
  set Initial Capital yet, rather than producing `NaN` or `Infinity` for
  every consumer to separately guard against.

**Currency integrity**
- No batch, expense, withdrawal, or stock count record stores which
  currency it was recorded in (Architecture 7.6's currency-change
  integrity amendment) — this Engine's figures are only meaningful under
  the assumption that `currencySymbol` cannot change once financial
  history exists, a rule enforced at the Security Rules layer, not by
  this Engine itself, but one this Engine's correctness depends on.

## Functional Requirements

*Exactly what the module must do.*

1. Provide `calculateBatch(batch, quebras)` — returns `investmentValue`,
   `marketValue`, `embeddedProfit`, `remainingQuantity`,
   `totalQuebraQuantity`, `quebraValue`, `isEstimate`,
   `hasExceededWarning` for one Stock Batch.
2. Provide `calculateInventoryTotals(batches, quebras)` — aggregates
   `calculateBatch` across a batch set into `totalInvestmentValue`,
   `totalMarketValue`, `totalEmbeddedProfit`, `activeBatchCount`.
3. Provide `businessWorth`, `capitalGrowth`, `capitalGrowthPct` as
   derived, always-current values in `AppContext` — recomputed whenever
   their underlying inputs (batches, quebras, expenses, withdrawals,
   initial stock count) change, never cached or manually refreshed.
4. Provide `isQuebraExceedingWarning` — a guard used at data-entry time
   (Breakages module, #7) to warn before a Quebra would reduce a batch's
   remaining quantity below zero, without blocking the Engine's own
   calculation logic if it happens anyway (`hasExceededWarning` on the
   resulting `BatchCalculation` is how a downstream consumer knows to
   flag it after the fact).
5. Accept zero external dependencies — `calculations.ts` must continue to
   import nothing from the rest of `src/` (Architecture 8.2: "this module
   depends on nothing else in `src/`, which is exactly why every other
   module is allowed to depend on it without a circular-dependency
   risk"). This is a functional requirement, not an implementation
   preference — a future change that adds a dependency into this file
   breaks the guarantee every consumer relies on.
6. At Closing time, expose the current `businessWorth`,
   `totalEmbeddedProfit`, and related figures in a form the Closing
   module (#11) can write into its frozen snapshot without recalculating
   them independently.

## Non-functional Requirements

**Performance**
- `calculateInventoryTotals` runs in O(n) over the batch set — no nested
  iteration that would degrade non-linearly as a single business's batch
  count grows (Architecture Section 11's scaling discipline: this is the
  one calculation every Dashboard and Report render depends on, so its
  cost shape matters more than almost any other function in the app).
- No network call, no async operation anywhere in this module — every
  function is a pure, synchronous calculation over data already loaded
  into memory.

**Security**
- This module has no awareness of tenant boundaries and must never be
  given one — it operates purely on whatever `batches`/`quebras` arrays
  it's handed. Tenant-scoping is the responsibility of the layer that
  fetches those arrays (`AppContext`, governed by Firestore Security
  Rules per Architecture 7.1), never this Engine. Keeping this boundary
  clean is what lets this module be reused unchanged by a future
  server-side context (e.g., AI feature computation, Architecture 10.1)
  without carrying any tenant-isolation risk into that new context.

**Accessibility**
- Not directly applicable — this module produces numbers, not UI. Its
  consumers (Dashboard, Reports) carry the accessibility requirements for
  how those numbers are displayed.

**Offline**
- Fully functional offline in principle — every function is a pure,
  synchronous calculation with no network dependency. In practice, this
  is currently moot: as noted in the Dashboard spec (#1), there is no
  offline data-persistence layer in this codebase yet, so the Engine
  never actually runs against locally-cached data today. When offline
  support is eventually added (Dashboard spec's own Future Enhancement),
  this Engine requires no change to support it.

**Mobile**
- Not applicable — no UI surface of its own.

## KPIs

**How do we know this module succeeds?**

- Zero production incidents where a Business Worth, Embedded Profit, or
  Capital Growth figure differs between two screens for the same
  underlying data — this is the one KPI Architecture Section 15.8
  already treats as a data-integrity failure, not a UX metric, and it
  applies to this Engine specifically since every such incident traces
  back to a consumer bypassing it.
- Every new module that needs a financial figure imports from this
  Engine rather than reimplementing a calculation — measurable at code
  review, not at runtime, but a real success criterion per Architecture
  8.2's own stated design intent.
- Closing snapshots (`businessWorthAtClose`) never require a manual
  correction due to a calculation discrepancy after the fact.

## Future Enhancements

*Ideas — not implementation.*

- **Server-side execution context for AI features** (Architecture
  Section 10.1/10.2/10.3) — Capital Forecasting and Business Worth
  Prediction both need this Engine's real historical output as their
  input. Since this module already has zero dependencies and no side
  effects, it should be directly importable into the future privileged
  server / Background Worker context (Architecture 4.11) without
  modification — worth validating explicitly once that phase starts,
  rather than assumed to "just work."
- **Multi-currency awareness**, if a future Business ever needs it beyond
  the current "currency locks after first financial record" rule
  (Architecture 7.6) — explicitly out of scope for this version; noted
  here so it isn't silently designed around instead of decided on
  deliberately if it's ever raised.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] `calculateBatch` and `calculateInventoryTotals` produce identical
      results whether called directly, via Dashboard, via a Report, or
      via a Closing, for the same input data.
- [ ] A Quebra recorded against an open batch immediately and correctly
      reduces both Investment Value and Market Value in the same
      calculation pass — never one updated ahead of the other.
- [ ] `capitalGrowthPct` never produces `NaN` or `Infinity` for a
      business with `initialCapitalValue === 0`.
- [ ] `calculations.ts` has zero imports from anywhere else in `src/` —
      confirmed by code review, not just by the module working correctly
      today.
- [ ] A Closing's frozen `businessWorthAtClose` matches, at the moment of
      closing, the live `businessWorth` value shown on the Dashboard —
      verified by test, not by visual spot-check alone, given how much
      of the product's trust depends on this specific guarantee.
