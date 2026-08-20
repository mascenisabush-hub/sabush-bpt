Business Domain Specification — Amendment

# Initial Stock Dual-Valuation-Basis Amendment

Version 1.0
**Status:** ✅ **Accepted.** All three gates this document's own former
Part 5 ("Acceptance Path") named are now satisfied: `BDR-0014` §5.A
items 1–4 are explicitly resolved by the Product Architect (recorded
in `BDR-0014` §11); this document's reconciliation proposal is accepted
as the confirmed technical direction, below; and the required companion
amendment to `02-business-worth-engine.md`'s "Capital Growth" section
(`02-capital-growth-dual-basis-amendment.md`) is filed alongside this
document, also Accepted. **Implementation status: NOT YET AUTHORIZED**
— acceptance of this amendment is a governance action, not an
Implementation Authorization; a Specification and Rule 8 Assessment
remain the required next gates before any implementation work (§ Next
Governance Step, below).
**Amends:** [Initial Stock Valuation History
Amendment](./10-initial-stock-valuation-history-amendment.md) Part 2
("Initial Capital Integrity") and, where its own Business
Rules/Functional Requirements describe Initial Capital as
unconditionally cost-basis, [Stock Counts (spec
#10)](./10-stock-counts.md). **Neither document's own file is edited
by this amendment** — consistent with this repository's practice of
recording an amendment's reconciliation as its own document first;
folding this amendment's language into either base file's own text (as
`10-initial-stock-valuation-history-amendment.md` itself was eventually
folded into `10-stock-counts.md`, tagged `[Valuation History Amendment
v1.0]`) remains implementation-stage work, not performed here.
**Governed by:** [`BDR-0014`](./BDR-0014-initial-stock-dual-valuation-basis.md)
(Approved) — this amendment performs the reconciliation `BDR-0014` §4
identifies as required.
**Companion:** [`02-capital-growth-dual-basis-amendment.md`](./02-capital-growth-dual-basis-amendment.md)
(Accepted) — the required, separate reconciliation for
`02-business-worth-engine.md`'s "Capital Growth" section, per `BDR-0014`
§5.A item 3. This document does not itself amend spec #2 — see that
companion document instead.

---

## Part 1 — Purpose

This amendment formalizes the specific reconciliation `BDR-0014` §4
item 1 identified as required before Decision 2 (owner-chosen Initial
Capital display basis) can proceed to a Specification or Rule 8
Assessment — now that `BDR-0014` §5.A's four open items are explicitly
resolved (`BDR-0014` §11).

## Part 2 — The Reconciliation

**The frozen, immutable figure `10-initial-stock-valuation-history-amendment.md`
Part 2 governs — `initialStockCount.totalValue`, computed once at
confirmation from `normalizeStockCountItems`'s cost-basis rule — remains
exactly what it already is: a cost-basis total, frozen at confirmation,
never rewritten.** This amendment does not touch that figure's meaning,
its immutability, or the `firestore.rules` enforcement of that
immutability. Every already-confirmed Initial Stock count in every
existing business continues to report this figure exactly as it does
today, permanently — per `BDR-0014` §5.A item 1's prospective-only
resolution, no already-confirmed count is ever reopened to add anything
this amendment describes.

**A second, equally historical, equally frozen figure — the Initial
Stock selling valuation total `BDR-0014` Decision 1 requires — is
computed and frozen alongside `totalValue`, at the same confirmation
moment, under the identical immutability discipline.** This is an
additive field on the `initial` `StockCount` document (mirroring this
repository's established pattern for every prior Stock Count amendment
— `StockBatchRestockObservation`, `derivedSellingValuation`,
`InitialStockPriceChangeEvent` itself) — never a replacement of, or a
type-change to, `totalValue`.

**A third field, also on the Initial Stock record itself, records which
of the two frozen totals is treated as "Initial Capital"** — per
`BDR-0014` §5.A item 4's resolution (a field on the Initial Stock
record, not a separate business-level setting) and item 2's resolution
(fixed once set, chosen only at the moment of that count's own, single
confirmation — an already-confirmed count that predates this
capability is never retroactively given this field; per item 1, it
implicitly and permanently remains cost-basis). This field is a
**pointer/selector, not a third valuation figure** — it never holds a
number of its own, only a resolution of which of the other two frozen
totals a consumer should treat as "Initial Capital." This is the exact
mechanism `product-memory-purchase-selling-valuation-specification.md`
§19 anticipated in principle (*"a parallel, non-frozen... display...
shown alongside, not replacing, the frozen cost-basis `totalValue`"*),
now made concrete: the pointer is itself frozen (per item 2), but it
never un-freezes or replaces either total it points between.

**`initialCapitalValue`, wherever it is read** (`AppContext.tsx`, every
Dashboard/Report consumer), **resolves to whichever of the two frozen
totals that business's own Initial Stock confirmation selected** — cost,
for every business that confirmed before this capability existed or
that explicitly chose cost; selling, for a business that explicitly
chose selling. This is the single, permanent, fixed resolution `BDR-0014`
§5.A items 1–2 require — there is no runtime ambiguity, no per-request
toggle, and no possibility of the same business's `initialCapitalValue`
resolving differently on two different screens at the same moment.

## Part 3 — What This Amendment Does Not Resolve

Consistent with `BDR-0014` §6's own scope boundary, this amendment does
**not** propose:

- Any Firestore schema, field name, or `firestore.rules` change — those
  remain Rule 8/Specification questions, per `BDR-0014` §5.B item 3's
  explicit deferral. Part 2's description of "an additive field" and "a
  pointer/selector field" is a conceptual/business-level description of
  the reconciliation, not a schema commitment.
- Any UI/interaction design for how the owner makes the choice at
  confirmation time.
- Any rounding/precision rule beyond the existing `POL-0001`/`POL-0002`
  convention.
- Any change to `businessWorth`'s own formula (`02-business-worth-engine.md`),
  consistent with `BDR-0014` §7 — see the separate companion amendment
  for `capitalGrowth`'s own, narrower resolution.
- Any change to Periodic Contagem's comparison mechanism
  (`expectedCurrentStockValue`) or its date/period model — `BDR-0014`
  Decision 7 explicitly excludes both from this governance change.
- Any migration or backfill for Initial Stock counts already confirmed
  before this capability exists — per Part 2's own resolution, none is
  needed: an already-confirmed count simply continues reading cost-basis,
  unconditionally, forever.

## Part 4 — Business Acceptance Criteria

1. `initialStockCount.totalValue` (cost-basis) is unmodified in meaning, computation, or immutability by this amendment.
2. A second, equally frozen, equally historical selling-valuation total is preserved as of this amendment's eventual implementation.
3. Which of the two totals "Initial Capital" resolves to is itself a frozen, per-count fact, never re-evaluated after that count's own confirmation.
4. No already-confirmed Initial Stock count is ever reopened, retroactively modified, or newly offered this choice.
5. `capitalGrowth`'s own resolution is governed entirely by the separate companion amendment, not restated or altered here.

---

**Governance Notes**

- No `src/`, `server/`, `firestore.rules`, or `tests/` file is touched
  by this document.
- `10-initial-stock-valuation-history-amendment.md` and
  `10-stock-counts.md` are unmodified by this document — this amendment
  is accepted as a *governance reconciliation*, not as an in-place edit
  to either file; folding this language into either base document's own
  text remains a distinct, future, implementation-stage action.
- This amendment does not itself authorize a Specification, Rule 8
  Assessment, or Implementation Authorization.

## Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3's governing hierarchy,
now that `BDR-0014` and both companion amendments are Accepted: a
Specification (functional requirements and acceptance criteria, ready
for Rule 8 assessment), followed by a Rule 8 Assessment, followed by a
signed Implementation Authorization, followed by Implementation — each
its own separate, explicitly gated step, none of which this document
performs or authorizes.

**Lifecycle:** Drafted → **Accepted** (this step). Not Implemented.
