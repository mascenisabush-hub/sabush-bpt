Business Domain Specification — Amendment

# Expected Current Stock Value & Persistent Initial Stock Amendment

Version 1.0
**Status:** ✅ Approved (decisions recorded below, per explicit Product
Architect authorization). Spec #10 has been amended in place — see
`10-stock-counts.md`'s Business Rules / Functional Requirements /
Acceptance Criteria for the `[Amendment v1.0]`-tagged additions. This
document remains the record of *why*; the individual spec remains the
source of truth for *what*.
**Implementation status:** Implemented this session — see the Rule 8
Assessment (`docs/engineering/10-rule8-assessment.md`) and Implementation
Plan (`docs/engineering/10-expected-stock-value-implementation-plan.md`)
for scope, files, and verification.
**Amends:** [Stock Counts (spec #10)](./10-stock-counts.md)
**Touches, without amending:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md) —
an explicit non-goals boundary is added there (see Part 4 below); its
formula, Acceptance Criteria, and Functional Requirements are otherwise
untouched.
**Origin:** Product Architect direction — the Customer & Commercial
Validation phase (`docs/engineering/19-v1-customer-validation-plan.md`)
cannot produce meaningful evidence if customers cannot safely complete
the Initial Stock registration workflow (today: a single-shot form with
no draft state, no persistence across a session, and no scoped
correction path — spec #10's own Functional Requirement #6). This
amendment is a **controlled validation-enablement exception**, not a
reopening of the wider project. Modules #18, #19, and #20 are
unaffected and remain in their previously closed/accepted state.
**Implementation:** *[Drafting-time note, kept for the historical
record — see Implementation status above for where things actually
stand]* At the moment this document was first drafted, no code had yet
been touched: the business decisions in Parts 1–7 below were proposed
and approved first; the Rule 8 Assessment and Implementation Plan were
produced after this document, per standing governance sequence; only
then did implementation begin. That full sequence is now complete —
proposed → approved (this document) → assessed and planned
(`10-rule8-assessment.md`, `10-expected-stock-value-implementation-plan.md`)
→ implemented (Implementation status, above) — this line is retained
only so a future reader can see the sequence was actually followed in
order, not to describe the current state.

---

## Why this document exists

Spec #10 already named two real gaps: the `initial` Stock Count's
immutability isn't enforced at the Security Rules layer (Functional
Requirement #5), and there is no scoped correction path short of
"Clear All Data" (Functional Requirement #6). A live customer cannot
safely be handed a one-shot, unrecoverable form for the single most
consequential screen in the product. Separately, spec #10's own
Business Rules note that Stock Counts are deliberately **not** part of
Business Worth (spec #2) — but the periodic-count comparison baseline
(`comparisonBaseline`, `PeriodicStockCountView.tsx`) has never had a
real "what should be on the shelf right now" figure to compare against;
it compares only against the *previous physical count*, which answers
"did stock move since I last checked," never "does my stock match what
the system, independent of any human recount, thinks I should have."
This amendment settles both: a persistent Initial Stock draft workflow,
and a new **Expected Current Stock Value** figure that gives Contagem
a real, calculation-engine-derived baseline.

## Part 1 — Persistent Initial Stock Draft Workflow

**Decision: approved as specified.** Initial Stock moves from a
single-shot submit to **Draft → Editable → Confirmed**:

- Before confirmation, items persist server-side (Firestore, scoped to
  the business), survive refresh/logout/device change, and can be
  freely added/edited/deleted by the Owner.
- The draft is explicitly **not** Initial Capital — it does not
  participate in Business Worth, Capital Growth, or Expected Current
  Stock Value (Part 2) while unconfirmed.
- **Confirmation** is the single, one-way transition into a permanent
  `stockCounts` record with `type: 'initial'`, exactly as today.
  Confirmation is atomic with draft cleanup (both happen in the same
  Firestore batch write — Firestore batch writes are all-or-nothing,
  which is what "atomic" means at this layer; there is no partial-batch
  outcome to reason about). If confirmation fails, the draft is left
  untouched (the batch simply never commits).
- A confirmed `initial` Stock Count remains immutable — see Part 3.
- No second Initial Stock confirmation is permitted, unchanged from
  today's `hasInitialStockCount` guard.

This closes spec #10's Functional Requirement #6 partially (a scoped
"keep working on it before it's permanent" path now exists) without
inventing a post-confirmation correction mechanism — that remains
explicitly out of scope for this amendment, named in spec #10's own
Future Enhancements, and undecided.

## Part 2 — Expected Current Stock Value

**Decision: approved as specified.**

```
Expected Current Stock Value =
  Confirmed Initial Capital
  + cost value of governed StockBatch inventory (at current remaining quantity)
```

Implementation note, not a business-rule change: `calculateInventoryTotals`'s
existing `totalInvestmentValue` is *already* computed from each batch's
`remainingQuantity` (`quantity − totalQuebraQuantity`, `calculations.ts`)
— Quebra is already netted out before this figure exists. "− recognized
Quebra already reflected by the inventory calculation engine" in the
original instruction is accordingly not a separate subtraction; it is
already true by construction of the figure being reused. No second
implementation of batch/Quebra math is introduced — this is a thin
derived value (`initialCapitalValue + totalInvestmentValueAllTime`) read
directly from `AppContext`'s existing computation, per Business Worth
Engine spec #2's own Functional Requirement #5 (`calculations.ts` stays
at zero external dependencies; this derivation happens in `AppContext`,
never inside `calculations.ts`).

Explicitly, this figure:
- Uses cost/investment value, never selling price.
- Does not include Embedded Profit, Expenses, or Withdrawals.
- Does not include prior physical Contagem results (it is not
  recursively defined against itself).
- Does not change Business Worth, Capital Growth, or Embedded Profit —
  see Part 4.
- Is `0 + totalInvestmentValueAllTime` for a business that has not yet
  confirmed Initial Stock (mirrors `capitalGrowthPct`'s existing
  explicit-zero-not-NaN pattern in spec #2 — an intentional, not an
  error, value).

### Existing StockBatch ambiguity — resolved

**Finding, grounded directly in the current data model, not inferred:**
`StockBatch` and `StockCount` have never had any field, write path, or
calculation that references the other. `recordStockCount`'s own
governing comment states plainly that a Stock Count "never creates or
touches a `StockBatch`"; conversely, nothing in `addStockBatch` /
`addMultipleStockBatches` reads or writes `stockCounts`. There is no
`stockCountId` on `StockBatch`, no `batchId` on `StockCountItem`, and
`calculateInventoryTotals` has zero awareness that `stockCounts` even
exists. **Confirmed Initial Capital and StockBatch inventory are
therefore separate, non-overlapping value pools by construction — not
merely by convention that could later be violated.** A StockBatch
created before Initial Stock confirmation is not "absorbed into," nor
does it "duplicate," the Initial Capital figure; there is no code path
by which it could.

**Resulting rule:** include both, unconditionally, regardless of
creation timestamp relative to Initial Stock confirmation. No
migration, backfill, or timestamp-based filter is needed or introduced
— the general instruction's fallback case ("if the data model proves
they can represent the same inventory, establish a deterministic rule
that prevents double-counting") does not apply here, because the data
model proves the opposite.

## Part 3 — Security: `initial` Stock Count immutability

**Decision: approved as specified**, closing spec #10's Functional
Requirement #5 exactly as spec #10's own Future Enhancements already
proposed: `firestore.rules`' `stockCounts` match block now refuses
`update`/`delete` unconditionally when `resource.data.type == 'initial'`,
regardless of role — Owner included. This is the same "no exceptions"
tier the block already documents in its own comment, now actually
enforced at the rules layer rather than by UI omission. No other
`stockCounts` behavior changes: any other type remains Owner-editable/
deletable exactly as today.

## Part 4 — Contagem: comparison baseline change

**Decision: approved as specified**, explicitly superseding spec #10's
prior stated rule:

> ~~`comparisonBaseline` is the most recent non-`initial` count if one
> exists, falling back to `initialCapitalValue` only if no periodic
> count has ever been recorded.~~ **[Superseded by this amendment.]**

**New rule:** Expected Current Stock Value (Part 2) is the comparison
baseline for every periodic Contagem, unconditionally. The prior rule
does not remain active in parallel — this is a full replacement, not an
additional option.

The variance produced (`Physical Counted Value − Expected Current Stock
Value`) is neutral diagnostic information. It is not labeled loss,
shrinkage, theft, or error anywhere in the UI or the data model — a
positive or negative number is a value difference requiring the
Owner's own interpretation, consistent with spec #10's existing
"honest verification figure" framing.

**Explicit boundary, added to spec #2 (Business Worth Engine):**
Expected Current Stock Value does not modify `businessWorth`,
`capitalGrowth`, `capitalGrowthPct`, or `totalEmbeddedProfitAllTime`.
It is a Contagem-only comparison figure, computed alongside the
Engine's existing outputs, never fed back into them.

## Part 5 — Historical Contagem: `expectedValueAtCount`

**Decision: approved as specified.** Every periodic Stock Count
recorded *after* this amendment persists `expectedValueAtCount` — the
exact Expected Current Stock Value used for that comparison, at that
moment. This is a permanent historical snapshot on the `StockCount`
document itself (`StockCountItem`'s own structural pattern —
`totalValue` already exists per counted item; `expectedValueAtCount` is
analogous, at the count level). It is never recalculated later from the
live formula — a future change to how Expected Current Stock Value is
computed must not silently rewrite what a past comparison actually
showed.

**Existing historical Contagem records are not retroactively rewritten**
and will not have this field. They remain readable exactly as recorded,
under the prior comparison model (most recent count / Initial Capital
fallback) implicitly, since that was the rule in force when they were
created. No migration or backfill is introduced by this amendment.

## Part 6 — Governance documents required, and why

Following the same precedent the Closing Integrity Amendment
(`08-09-11-closing-integrity-amendment.md`) established for a
structurally identical situation (multiple specs, a real requirement
gap, a security-rule change, no new strategic "why"):

- **This amendment document** — required. Settles the business
  decisions before any Rule 8 work, per standing process.
- **Spec #10 update in place** — required; spec #10 is the module's
  source of truth for *what*, and now describes a workflow this
  amendment changed.
- **`docs/specs/README.md` update** — required; the module's status
  line must point to this amendment, matching every other amended
  module in this series.
- **Spec #2 boundary note** — required, narrowly; a one-paragraph
  non-goals addition (Part 4 above), not a rewrite. Spec #2's formula,
  Functional Requirements, and Acceptance Criteria are unchanged.
- **A new BDR — not required.** BDR-0001–0003 (Module #19) each answer
  a genuinely new strategic "why does this capability exist" question
  for the platform (per `19-governance-bdr-policy-framework.md`'s own
  framing). This amendment answers "how does an existing, already-
  approved capability (Stock Counts, Module #10, Phase 2 — Capital
  Protection) close a named implementation gap and gain one new derived
  figure" — the same category of question the Closing Integrity
  Amendment answered for Modules #8/#9/#11 without a BDR. No new
  strategic question is being introduced.
- **A new ADR — not required.** The one architecture-adjacent decision
  here (reusing `calculateInventoryTotals` as the basis for a new
  derived figure, computed in `AppContext` rather than inside
  `calculations.ts`) does not change the Business Worth Engine's
  architecture — `calculations.ts` keeps its zero-dependency guarantee
  (spec #2, Functional Requirement #5) unmodified, and no new module
  boundary, data-ownership boundary, or cross-module dependency is
  created. This is a calculation-reuse decision at the spec level, not
  an architecture decision.

## Part 7 — Explicit non-goals of this amendment

Per the originating instruction, restated here so a future reader does
not have to reconstruct scope from the diff:

- Does not change pricing, Business Worth, Capital Growth, or Embedded
  Profit.
- Does not make Initial Stock Count mandatory (the existing "Configurar
  mais tarde" skip path is unchanged).
- Does not add any subscription or notification feature.
- Does not touch Module #18, #19, or #20.
- Does not introduce a post-confirmation correction mechanism for a
  mistaken `initial` count (still an open item in spec #10's own Future
  Enhancements).
- Does not migrate or backfill any existing `StockBatch` or historical
  `StockCount` record.
- Does not localize the two Stock Count views (spec #10's separately
  named, still-open Functional Requirement #7) — out of scope for this
  amendment specifically; the new draft workflow UI follows the same
  hardcoded-Portuguese pattern the rest of the two views already use,
  so this amendment does not widen the existing localization gap, but
  it does not close it either.
