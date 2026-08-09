Business Domain Specification — Amendment

# Initial Stock Valuation History Amendment

Version 1.0
**Status:** ✅ Approved (decisions recorded below, per explicit Product
Architect authorization). Spec #10 has been amended in place — see
`10-stock-counts.md`'s Business Rules / Functional Requirements /
Acceptance Criteria for the `[Valuation History Amendment v1.0]`-tagged
additions. This document remains the record of *why*; the individual
spec remains the source of truth for *what*. A distinct tag from
`[Amendment v1.0]` (the existing Expected Current Stock Value amendment)
is used deliberately, so the two amendments' additions to spec #10
remain individually traceable rather than colliding under one label.
**Implementation status:** Already implemented, **out of sequence** —
`InitialStockPriceChangeEvent` (`src/types.ts`),
`calculateInitialStockCurrentValuation()` and
`calculateInitialStockValuationChange()` (`src/utils/calculations.ts`),
the `recordInitialStockPriceChangeEvent` action and
`initialStockCurrentValuation` derived field (`src/context/AppContext.tsx`),
`firestore.rules` coverage for `initialStockPriceChangeEvents`, and
`InitialStockPriceChangeModal.tsx` were all built off direct task prompts
across two prior sessions, before this governance record existed —
correctly flagged as an open debt in `HANDOFF.md` both times ("a formal
`docs/specs/10-*` amendment... is still owed"). **This document settles
that debt after the fact; it is a governance record for an existing
capability, not an authorization to build a new one.** No `src/`,
`server/`, `firestore.rules`, or `tests/` file is touched by this
document — see Verification, below.
**Amends:** [Stock Counts (spec #10)](./10-stock-counts.md)
**Touches, without amending:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md) —
an explicit non-goal bullet is added there (see Part 8 below), mirroring
the precedent [Amendment v1.0](./10-expected-stock-value-amendment.md)
already established for a structurally identical boundary. Spec #2's
formula, Functional Requirements, and Acceptance Criteria are otherwise
untouched.
**Does not touch:** [Expected Current Stock Value & Persistent Initial
Stock Amendment](./10-expected-stock-value-amendment.md) — that
document is not amended, superseded, or reopened by this one. See Part
9 for the explicit boundary between the two.
**Origin:** Product Architect direction, following the same governance-
after-the-fact pattern this repo has used before when an implementation
outpaces its paper trail (e.g. the sellingPrice field addition to
`StockCountItem`/`InitialStockDraftItem`, itself still separately
unformalized — see Part 12).

---

## Why this document exists

Two related capabilities were implemented directly from task prompts
without a preceding spec amendment: adding `sellingPrice` to Stock
Count items, and this feature — recording price changes affecting units
still remaining from the original Initial Stock. Both were flagged
honestly in `HANDOFF.md` as owing a formal amendment. This document
closes that debt for the price-change/valuation-history capability
specifically. It does not retroactively approve business rules that
don't match what was actually built — the sections below were checked
directly against the shipped implementation (`types.ts`,
`calculations.ts`, `AppContext.tsx`, `firestore.rules`,
`InitialStockPriceChangeModal.tsx`) before being written, the same
verification discipline this repo applies to forward-looking amendments.

## Part 1 — Purpose

Valuation-history events exist so the platform can express a single,
narrow fact: **the price basis of units still remaining from the
original Initial Stock has changed since that stock was first counted,
and the platform should be able to show both the old and new valuation
without altering the historical record itself.** This is a price-basis
correction/update mechanism, not an inventory-movement ledger, not a
sales record, and not a second Initial Capital.

## Part 2 — Initial Capital Integrity

**Initial Capital is historical truth.** The confirmed `initial`
`StockCount` — and therefore `initialCapitalValue`
(`initialStockCount.totalValue`) — is never rewritten, edited, or
recalculated because of a later price-change event, regardless of how
many events exist or what they record. This is not a new rule; it
restates spec #10's existing "truly immutable, no exceptions" tier
(Architecture Section 7.6) and confirms that this feature does not
create an exception to it. Enforced today at the Security Rules layer
(`firestore.rules`' `stockCounts` block refuses `update`/`delete`
unconditionally for `type == 'initial'`) — unmodified by this feature.

## Part 3 — Event Meaning

An `InitialStockPriceChangeEvent` records exactly one thing: **"At this
effective date, the owner states that this quantity of the remaining
Initial Stock should be valued using these prices."** It is a
point-in-time valuation-basis assertion, not a transaction, not a
correction to a mistake, and not a claim about what happened to the
other units. This matches the shipped implementation precisely —
`types.ts`'s own header comment for the type describes it the same way.

## Part 4 — Quantity Semantics

`quantityRemaining` is an **owner-asserted snapshot**, not a
system-derived figure. This app records no sales/POS ledger
(Architecture non-goal, `CLAUDE.md` Rules 3–4), so there is no reliable
way to compute "units still remaining" from any other data in the
system. The platform does **not** claim to know:

- how many units were sold,
- how many units were consumed,
- how many units were transferred, or
- why the quantity changed,

unless a separate, approved feature is built specifically to record
that information. This feature does not attempt to reconstruct
inventory movement, and none of the values it produces should be read
as if it does. Validated only for shape (a positive number, not
exceeding the original item's own counted quantity) — never inferred.

## Part 5 — Price Semantics & Valuation Change

Each event may record `previousCostPrice`, `newCostPrice`,
`previousSellingPrice`, and `newSellingPrice`. The resulting difference
is a **valuation change**, defined precisely as:

```
Cost valuation change =
  quantityRemaining × (newCostPrice − previousCostPrice)

Selling valuation change =
  quantityRemaining × (newSellingPrice − previousSellingPrice)
```

**Valuation Change ≠ Embedded Profit.** Embedded Profit (spec #2,
spec #6) is `marketValue − investmentValue` on unsold Stock Batch
inventory — a snapshot of potential profit in stock currently held. A
valuation change is a *delta caused by a price revision on the same
remaining units*, not a market-value-minus-cost snapshot, and is never
computed, stored, or labeled as profit anywhere in this feature. It is
also not a sale, purchase, expense, withdrawal, or accounting
adjustment — none of those concepts apply here, and none of this
feature's fields feed any of Sabush's existing formulas for them.

## Part 6 — Multiple Events

Events are **append-only** — the shipped `firestore.rules` block
refuses `update`/`delete` unconditionally, the same "no exceptions"
tier as the `initial` `StockCount` itself (Part 2). For a given
product, **the latest applicable event** (by `effectiveDate`, tie-broken
by `createdAt` — the later write wins) represents the current valuation
state. Earlier events for the same product are not summed, netted, or
otherwise combined with the latest one; they remain permanently
available as an audit/explanation trail, each independently
recomputable via the same valuation-change formula (Part 5) applied to
that event's own fields alone. This matches
`calculateInitialStockCurrentValuation()`'s and
`calculateInitialStockValuationChange()`'s actual behavior exactly.

## Part 7 — Separation of Concepts

This feature introduces exactly two new derived figures and
deliberately keeps them separate from five existing ones:

| Concept | Source | Changed by this feature? |
|---|---|---|
| Initial Capital | `initialStockCount.totalValue`, frozen at confirmation | No — Part 2 |
| Current Initial Stock Investment Value | Latest event's `quantityRemaining × newCostPrice` per product, summed | **New**, introduced by this feature |
| Current Initial Stock Selling Value | Latest event's `quantityRemaining × newSellingPrice` per product, summed | **New**, introduced by this feature |
| Valuation Change | Part 5's formula, per event | **New**, introduced by this feature — explicitly not Embedded Profit |
| Embedded Profit | `marketValue − investmentValue` on Stock Batches (spec #2/#6) | No |
| Business Worth | `totalMarketValueAllTime − expenses − withdrawals` (spec #2) | No — Part 8 |

These are not to be merged, summed together, or substituted for one
another in any UI copy, report, or future calculation without a
separate, explicit governance decision.

## Part 8 — Business Worth Boundary

**This amendment does not change the Business Worth formula.**
`businessWorth`, `capitalGrowth`, and `capitalGrowthPct` (spec #2) are
unmodified — confirmed by direct diff inspection (Verification, below).
A one-bullet non-goal note is added to spec #2's Business Rules,
mirroring the existing Expected Current Stock Value Amendment's own
non-goal bullet exactly in form:

> Current Initial Stock Investment Value, Current Initial Stock Selling
> Value, and Valuation Change (Part 5–7 of the [Initial Stock Valuation
> History Amendment](./10-initial-stock-valuation-history-amendment.md))
> are computed alongside this Engine's outputs but do not modify
> `businessWorth`, `capitalGrowth`, `capitalGrowthPct`, or
> `totalEmbeddedProfitAllTime`, and are never fed back into any formula
> in this spec.

## Part 9 — Expected Current Stock Value Boundary

**This amendment does not approve, define, or implement a new Expected
Current Stock Value formula.** The existing Expected Current Stock
Value definition —
`Confirmed Initial Capital + cost value of governed StockBatch
inventory` — as recorded in the [Expected Current Stock Value & Persistent
Initial Stock Amendment](./10-expected-stock-value-amendment.md), remains
**entirely unmodified, unsuperseded, and not reopened** by this
document. `expectedCurrentStockValue` (`AppContext.tsx`) is confirmed
unchanged by direct diff inspection (Verification, below).

No contradiction exists between the two amendments today: the existing
one defines a Contagem comparison baseline from Initial Capital plus
StockBatch cost value; this one defines a separate pair of figures
(Current Initial Stock Investment/Selling Value) that are not currently
read by that baseline or by any other formula. Whether — and how —
Current Initial Stock Valuation should ever factor into Expected
Current Stock Value, Business Worth, or any other formula is an
**explicit, separate, not-yet-authorized product/governance decision**,
consistent with `AppContext.tsx`'s own governing comment on
`initialStockCurrentValuation`, which states it is deliberately not
folded into `expectedCurrentStockValue`/`businessWorth`/`capitalGrowth`,
and with `HANDOFF.md`'s repeated flagging of the same open question
across two prior sessions. This document takes no position on
what that future decision should be.

## Part 10 — Historical Explanation

This feature exists partly so the platform can later explain: **"part
of the difference between historical/expected valuation and current
valuation may be attributable to recorded price changes."** It does not
claim to explain every stock discrepancy. Quantity differences, losses
(Quebras, spec #7), counting errors, and other operational activity
remain entirely separate concepts, governed by their own specs, and are
not addressed, absorbed, or superseded by this feature in any way.

## Part 11 — Governance documents required, and why

Following the same reasoning the Expected Current Stock Value Amendment
used for a structurally identical situation:

- **This amendment document** — required. Formalizes decisions that, in
  this specific case, were made implicitly through two prior
  implementation sessions rather than before them — closing that
  sequencing gap is the entire purpose of this document.
- **Spec #10 update in place** — required; spec #10 is the module's
  source of truth for *what*, and did not previously mention this
  feature at all.
- **`docs/specs/README.md` update** — required, matching every other
  amended module in this series.
- **Spec #2 boundary note** — required, narrowly; one bullet (Part 8),
  not a rewrite.
- **A new BDR — not required.** This answers "how does an existing,
  already-approved capability (Stock Counts, Module #10) gain a
  narrowly-scoped valuation-history mechanism," the same category of
  question the Closing Integrity Amendment and the Expected Current
  Stock Value Amendment each answered without a BDR — no new strategic
  "why does this capability exist" question is being introduced at the
  platform level.
- **A new POL — not required.** The `POL-NN-###` category
  (`19-governance-bdr-policy-framework.md`) exists specifically to
  operationalize approved BDRs for modules that have one; Module #10
  has no BDR/POL stack, and this document's Parts 1–10 already function
  as the operational rule at the amendment level, the same way the two
  existing Module #10 amendments do.
- **A new ADR — not required.** No new module boundary, cross-module
  dependency, or architectural pattern is introduced; the shipped
  implementation reuses this module's existing calculation-in-
  `calculations.ts` / derivation-in-`AppContext` pattern exactly.
- **A Rule 8 governance-readiness assessment** — produced alongside
  this document, per this task's explicit instruction; see
  `docs/engineering/10-initial-stock-valuation-history-governance-rule8-assessment.md`.

## Part 12 — Explicit non-goals of this amendment

- Does not change `expectedCurrentStockValue`, `businessWorth`,
  `capitalGrowth`, or `capitalGrowthPct` (Parts 8–9).
- Does not create an inventory-movement ledger, sales record, or any
  mechanism that infers `quantityRemaining` (Part 4).
- Does not touch Module #17, #18, #19, or #20.
- Does not formalize the separate, still-open `sellingPrice`-on-Stock-
  Count-items addition (`StockCountItem.sellingPrice`,
  `InitialStockDraftItem.sellingPrice`) — that remains its own,
  separately-flagged governance debt (`HANDOFF.md`), a prerequisite
  input this feature depends on but does not itself govern.
- Does not authorize any new implementation. Everything this document
  governs is already shipped (partially committed at `c6433a1`, with a
  further UI/test refinement pass still sitting uncommitted as of this
  document — see `HANDOFF.md`'s "Right now" section for exact state).
- Does not change `firestore.rules`, any Firestore collection schema,
  or any security boundary — all confirmed already in place and
  unmodified by this document (Verification, below).

## Verification

- `git diff --stat HEAD` at the time this document was written shows
  only documentation files changed by this task
  (`docs/specs/10-initial-stock-valuation-history-amendment.md` [new],
  `docs/specs/10-stock-counts.md`, `docs/specs/02-business-worth-engine.md`,
  `docs/specs/README.md`,
  `docs/engineering/10-initial-stock-valuation-history-governance-rule8-assessment.md`
  [new], `HANDOFF.md`) plus the three files already modified,
  uncommitted, by the prior (non-governance) session
  (`src/utils/calculations.ts`, `src/components/InitialStockPriceChangeModal.tsx`,
  `tests/initial-stock-price-change.test.ts`) — none of which this
  document's own authoring touched further.
- No `src/`, `server/`, `firestore.rules`, or `tests/` file was created,
  edited, or deleted while producing this document.
- No commit or push was made.
