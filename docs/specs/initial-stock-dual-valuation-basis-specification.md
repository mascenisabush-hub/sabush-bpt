Business Domain Specification

# Initial Stock Dual-Valuation-Basis Specification

Version 0.1 (Draft)
**Status:** Drafted, awaiting Product Architect approval. **Not yet
accepted. Implementation status: NOT AUTHORIZED.** This document does
not, by itself, authorize implementation even once accepted — see the
companion Rule 8 Assessment and Implementation Authorization (neither
yet created) for that separate gate.
**Governed by:** [`BDR-0014`](./BDR-0014-initial-stock-dual-valuation-basis.md)
(Approved, all §5.A items resolved — §11), [`10-initial-stock-dual-valuation-basis-amendment.md`](./10-initial-stock-dual-valuation-basis-amendment.md)
(Accepted), and [`02-capital-growth-dual-basis-amendment.md`](./02-capital-growth-dual-basis-amendment.md)
(Accepted). **This Specification does not re-decide anything those
three documents already resolved** — it translates their accepted
business decisions into functional requirements and acceptance
criteria, ready for Rule 8 assessment, per `19-governance-bdr-policy-framework.md`
§3's governing hierarchy (`BDR → Policy → Module Specifications → Rule
8 → Implementation`).
**Depends on:** [Stock Counts (spec #10)](./10-stock-counts.md) — this
Specification extends Initial Stock's existing confirmation flow;
[Business Worth Engine (spec #2)](./02-business-worth-engine.md) — for
the unchanged `businessWorth` formula and the now-resolved
`capitalGrowth` formula; [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md)
— for Product Memory's existing non-overwriting boundary, restated
here, not altered; [`BDR-0009`](./BDR-0009-stock-count-physical-observation.md)
— for Stock Count's existing physical-observation framing, restated
here, not altered.
**This document does not:** modify, supersede, or reinterpret
`BDR-0009`, `BDR-0012`, `10-stock-counts.md`,
`10-initial-stock-valuation-history-amendment.md`,
`10-expected-stock-value-amendment.md`, `02-business-worth-engine.md`,
or any other existing artifact. It is additive to, and consistent
with, all of the above, per the reconciliation `BDR-0014` §4 and its
two companion amendments already performed.
**Location note:** Filed in `docs/specs/`, unprefixed — cross-cutting
between Module #10 (Stock Counts) and Module #2 (Business Worth
Engine), following the same pattern `product-memory-purchase-selling-valuation-specification.md`
already established for a cross-cutting Specification tied to its own
BDR/amendment lineage.

---

## 1. Status / Purpose

This Specification translates `BDR-0014`'s accepted business decision — that Initial Stock must preserve both a cost valuation and a selling valuation, and that the owner may choose which one is treated as Initial Capital, fixed once at confirmation — into functional requirements ready for Rule 8 assessment. It resolves nothing `BDR-0014` §5.A did not already resolve; every requirement below traces directly to one of that BDR's four resolved decisions (§11) or to a decision already restated, not newly made, in `BDR-0014` §3.

Every requirement below is labeled, following the convention `product-memory-purchase-selling-valuation-specification.md` established:

- **[ESTABLISHED]** — already an accepted, binding business decision in this repository (`BDR-0009`, `BDR-0012`, or `10-initial-stock-valuation-history-amendment.md`); this Specification only restates or sharpens it.
- **[ACCEPTED]** — a business decision `BDR-0014` and its companion amendments establish; this Specification turns it into a functional requirement.
- **[SPECIFICATION-LEVEL]** — a requirement this document itself introduces to make an accepted business decision concretely testable, without introducing any new business decision of its own.

**Business context this Specification exists to serve** (restated from `BDR-0014` §1, not re-decided): existing businesses — Sabush BPT's primary audience — commonly already hold substantial stock at the moment they begin using the platform. Initial Stock is the historical snapshot of that opening position. During Initial Stock (and, per `BDR-0014` Decision 7, Periodic Contagem), the owner is determining the current value of physical stock they may know with varying confidence — they may deliberately count only the portions/quantities they can value reliably, exactly as `BDR-0009`'s existing physical-observation framing already anticipates (zero is a valid, explicit count; blank means not yet counted). Cost valuation and selling valuation are both legitimate, simultaneously true numbers for that same physical stock; this Specification's purpose is to stop the platform from being able to express only one of them.

## 2. Conceptual Vocabulary — Fixed Terms

Restated from `BDR-0014` §2, with the additions this Specification's own functional requirements need. None of these definitions is new; each traces to already-accepted governance.

- **Raw/historical Initial Stock facts [ESTABLISHED]** — a confirmed `StockCountItem`'s own recorded `productName`, `quantity`, `unit`, `costPrice`, and `sellingPrice`, per portion/row. Frozen at confirmation (`BDR-0009` Decision 8; `10-initial-stock-valuation-history-amendment.md` Part 2). This Specification adds nothing to, and removes nothing from, what already counts as a "raw fact."
- **Calculated cost valuation [ESTABLISHED, restated]** — the sum, across every portion/row of every product in the confirmed Initial Stock count, of `quantity × costPrice`. Today, this **is** `initialStockCount.totalValue`.
- **Calculated selling valuation [ACCEPTED — `BDR-0014` Decision 1]** — the sum, across every portion/row, of `quantity × sellingPrice`. A new, equally frozen, equally historical total this Specification requires be preserved as a first-class fact of the snapshot (FR-1, below) — not merely computable in principle from already-stored per-row data, as it is today.
- **Selected Initial Capital basis [ACCEPTED — `BDR-0014` Decision 2, §5.A item 4]** — a single, per-snapshot selector (`'cost'` or `'selling'`), chosen once, before confirmation, and frozen at confirmation. **Not** a valuation figure itself — it never holds a number, only a pointer to one of the two totals above (§4, Invariant I-3).
- **Frozen `initialCapitalValue` [ACCEPTED — `BDR-0014` §5.A item 3]** — whichever of the two calculated valuations the selected basis points to, resolved once, permanently, per business.
- **`capitalGrowth` [ACCEPTED — `02-capital-growth-dual-basis-amendment.md`]** — `businessWorth − initialCapitalValue`, formula unchanged in shape; only what `initialCapitalValue` resolves to changes.
- **Business Worth [ESTABLISHED, untouched]** — `totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime` (`02-business-worth-engine.md`). Contains no `initialCapitalValue` term today and none is added by this Specification.
- **Portion** — one row of a Stock Count (`StockCountItem`/working row) for a given product. Multiple portions of the same product are one Product identity, summed into both valuation totals (`BDR-0014` Decisions 1, 5; B5, `3f84886`). Restated, not altered, by this Specification.

## 3. Business Rules

1. **[ESTABLISHED, restated]** A confirmed Initial Stock snapshot's raw, per-portion facts (`productName`, `quantity`, `unit`, `costPrice`, `sellingPrice`) are never rewritten after confirmation, regardless of later Product Memory changes, later price-change events, or later purchases (`BDR-0009` Decisions 7–8; `10-initial-stock-valuation-history-amendment.md` Part 2; `BDR-0014` Decision 3).
2. **[ACCEPTED]** Both the calculated cost valuation and the calculated selling valuation are computed and preserved for every confirmed Initial Stock snapshot, in total. Neither is discarded because the other exists (`BDR-0014` Decision 1).
3. **[ACCEPTED]** Before confirming Initial Stock, the owner chooses exactly one Initial Capital basis — cost or selling — for the **entire** snapshot. **This choice is not available per product and not available per portion/row.** One snapshot, one basis, applying uniformly to how `initialCapitalValue` is derived from the two totals FR-1 preserves (`BDR-0014` §5.A item 4's resolution: a field on the Initial Stock record itself, not a business-wide setting independent of that record, and — per the same resolution — not a finer-grained per-item setting either).
4. **[ACCEPTED]** The selected basis is frozen at the moment of confirmation and is immutable thereafter. There is no owner-facing action, at any point after confirmation, that changes which basis a given confirmed Initial Stock snapshot uses (`BDR-0014` §5.A item 2).
5. **[ACCEPTED]** The selected basis applies prospectively only. An Initial Stock count confirmed before this capability exists is never reopened, never retroactively offered a choice, and its `initialCapitalValue` continues to resolve to the cost valuation, unconditionally and permanently, exactly as it already does today (`BDR-0014` §5.A item 1).
6. **[ACCEPTED]** `capitalGrowth = businessWorth − initialCapitalValue` is unchanged in formula shape. `initialCapitalValue` resolves to whichever valuation (cost or selling) that business's own Initial Stock snapshot selected (`02-capital-growth-dual-basis-amendment.md`).
7. **[ESTABLISHED, restated — hard boundary]** `businessWorth` itself (`totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime`) is not modified by any requirement in this Specification. It contains no `initialCapitalValue` term before or after this capability (`BDR-0014` §7).
8. **[ESTABLISHED, restated]** Multiple portions/rows of the same product within one Initial Stock snapshot remain one Product identity — never treated as duplicate products merely because their unit or valuation price differs — and are summed correctly into both valuation totals (`BDR-0014` Decisions 1, 5; B5, `3f84886`). This Specification does not alter B5's existing multi-portion mechanism in any way.
9. **[ESTABLISHED, restated]** Product Memory's confirmed unit relationship may inform how the owner reconciles quantities across portions, but never silently rewrites a portion's owner-entered quantity, unit, cost price, or selling price (`BDR-0012` Decisions 2–3, 15; `BDR-0014` Decision 6).
10. **[ESTABLISHED, restated]** A later Add Stock purchase of the same product creates its own independent `StockBatch` document, with its own purchase facts and, where Product Memory applies, its own currently-remembered selling price. It never retroactively alters the Initial Stock record, in either raw facts or either valuation total (`BDR-0012` Decisions 2–4, 15; `BDR-0014` Decision 4).
11. **[SPECIFICATION-LEVEL — explicit disambiguation]** `InitialStockPriceChangeEvent` (the existing mechanism `10-initial-stock-valuation-history-amendment.md` already governs) is a **separate, independent capability** from the selected Initial Capital basis this Specification introduces. A price-change event records a later re-valuation of *remaining* Initial Stock quantity at a *new* price, for display purposes (`calculateInitialStockCurrentValuation`) — it is not, and must never become, a mechanism for changing which basis (cost or selling) a confirmed snapshot's `initialCapitalValue` resolves to. The two mechanisms read from the same underlying `StockCountItem` facts but serve entirely different purposes and must remain structurally independent.

## 4. Invariants

These must hold at every point in time, for every business, without exception. Rule 8 assessment must demonstrate each is enforceable by the eventual technical design, not merely true by convention.

- **I-1 (One basis per snapshot).** For any given business, there is at most one selected Initial Capital basis value, and it applies to the *entire* confirmed Initial Stock snapshot — never to an individual product or portion within it. A technical design that allows per-product or per-portion basis selection violates this invariant, regardless of how it is framed.
- **I-2 (Frozen at confirmation, immutable forever after).** Once an Initial Stock snapshot is confirmed, its selected basis cannot change through any owner action, any Product Memory change, any price-change event, or any later purchase. If a future business need to allow a basis change ever arises, it requires its own separate governance decision (`BDR-0014` §5.A item 2's own resolution) — it is not something a Rule 8 Assessment or implementation may introduce as a convenience.
- **I-3 (The basis is a pointer, never a value).** The selected basis never itself stores or represents a monetary figure. It resolves to one of the two independently-computed, independently-frozen valuation totals. A technical design that stores only "the chosen number" and discards the other basis's total violates Business Rule 2 and this invariant together.
- **I-4 (Prospective-only; no retroactive rewrite).** An Initial Stock snapshot confirmed before this capability exists never gains a selected-basis field through any migration, backfill, or default-assignment mechanism that changes its behavior. Its `initialCapitalValue` continues to resolve to the cost valuation, exactly as today, forever.
- **I-5 (Raw facts remain frozen, independent of basis selection).** Selecting a basis, or `capitalGrowth` following that selection, never causes any raw per-portion fact (`quantity`, `unit`, `costPrice`, `sellingPrice`) to be rewritten, recalculated, or reinterpreted. The basis selection operates only on the two already-computed totals, never on the facts beneath them.
- **I-6 (`businessWorth` is untouched).** No requirement in this Specification adds, removes, or modifies any term in `businessWorth`'s formula. Any technical design that reads `initialCapitalValue`, either valuation total, or the selected basis inside `businessWorth`'s own computation violates this invariant.
- **I-7 (`InitialStockPriceChangeEvent` independence).** No technical design may repurpose, extend, or overload the existing `InitialStockPriceChangeEvent` mechanism to record or influence a basis selection or change (Business Rule 11).
- **I-8 (Multi-portion summation is unaffected).** B5's existing multi-portion behavior — same Product identity, separate rows/portions, independently recorded units/costs/selling prices, summed correctly — continues exactly as implemented, for both valuation totals equally. This Specification adds a second total to preserve; it does not change how either total is summed across portions.

## 5. Functional Requirements

*(Each traces to a §3 Business Rule; none introduces a new business decision beyond what `BDR-0014` and its companions already resolved.)*

**FR-1 — Preserve both valuation totals.** A confirmed Initial Stock snapshot's cost valuation and selling valuation must both be computed (from the same, already-existing per-portion `costPrice`/`sellingPrice` facts) and preserved as first-class, frozen facts of that snapshot — not merely derivable in principle from stored per-item data, as the selling valuation currently is. *(Business Rule 2, I-3, I-5)*

**FR-2 — Owner selects the basis before confirmation.** The Initial Stock confirmation flow must present the owner with an explicit choice — cost or selling — before the snapshot is confirmed. The choice must be for the entire snapshot; the confirmation flow must not offer, imply, or allow a per-product or per-portion variant of this choice. *(Business Rule 3, I-1)*

**FR-3 — Persist the selected basis on the Initial Stock record.** The selected basis must be persisted as part of the same confirmed Initial Stock record the two valuation totals belong to — not as a separate business-level document, setting, or collection independent of that record. *(Business Rule 3, `BDR-0014` §5.A item 4)*

**FR-4 — Freeze the selected basis at confirmation.** Once persisted, the selected basis must never be modifiable by any subsequent action — no edit path, no re-confirmation flow, no administrative override. *(Business Rule 4, I-2)*

**FR-5 — Derive `initialCapitalValue` from the frozen selection.** Wherever `initialCapitalValue` is read (Dashboard, Reports, `capitalGrowth`'s own computation), it must resolve to whichever of the two preserved totals (FR-1) the frozen selected basis (FR-3–FR-4) points to — cost, for a business without a selection (including every business whose Initial Stock predates this capability) or an explicit cost selection; selling, for an explicit selling selection. *(Business Rule 5–6, I-4)*

**FR-6 — `capitalGrowth` uses the resolved `initialCapitalValue`.** `capitalGrowth = businessWorth − initialCapitalValue` must use exactly the value FR-5 resolves — no separate, decoupled, or alternate figure. `capitalGrowthPct`'s existing division-by-zero guard is unaffected. *(Business Rule 6)*

**FR-7 — `businessWorth` formula unchanged.** No technical design produced from this Specification may add, remove, or alter any term of `businessWorth = totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime`. *(Business Rule 7, I-6)*

**FR-8 — Raw item-level facts unchanged after confirmation.** Every existing immutability guarantee for a confirmed `StockCountItem` — `productName`, `quantity`, `unit`, `costPrice`, `sellingPrice` — continues to hold exactly as it does today. This Specification adds new derived facts (the two totals, the selected basis) without weakening any existing raw-fact guarantee. *(Business Rule 1, I-5)*

**FR-9 — Multi-portion behavior preserved.** Same-Product, multi-portion rows (different units, different cost prices, different selling prices, same Product identity) continue to be summed correctly into both valuation totals, exactly as B5 already implements for the cost valuation today. *(Business Rule 8, I-8)*

**FR-10 — StockBatch independence preserved.** A later Add Stock purchase of the same product must not read from, write to, or otherwise alter any confirmed Initial Stock snapshot's raw facts, valuation totals, or selected basis. *(Business Rule 10)*

## 6. Non-Goals / Explicit Exclusions

The following are deliberately **not** introduced, specified, or authorized by this document — consistent with `BDR-0014` §6 and §7, and with the explicit scope boundary given for this Specification:

- A mutable, business-wide valuation flag independent of the Initial Stock record itself (contradicts FR-3, I-1).
- Per-product Cost/Selling basis selection (contradicts FR-2, I-1).
- Per-portion Initial Capital basis selection (contradicts FR-2, I-1).
- Retroactive migration or backfill of any existing, already-confirmed Initial Stock record (contradicts FR-5, I-4).
- Rewriting any historical Initial Stock fact (contradicts FR-8, I-5).
- Any change to `businessWorth`'s formula (contradicts FR-7, I-6).
- §19 selling-basis Initial Capital as `product-memory-purchase-selling-valuation-specification.md` §19 originally, narrowly framed it (that requirement is superseded by `BDR-0014`'s broader, dual-preservation resolution — this Specification does not reopen §19's own narrower text, it fulfills the separate-governance action §19 required).
- Any new AI/OCR/recognition behavior.
- Historical backfill of any kind.
- Any change to `StockBatch.sellingPrice` semantics.
- Any change to Product Memory semantics.
- Any change to Periodic Contagem's date/period model or comparison mechanism (`expectedCurrentStockValue`) — `BDR-0014` Decision 7 explicitly excludes this; unaffected here.
- Any change to Add Stock or Smart Stock Entry valuation logic.
- Any new Business Worth calculation of any kind.
- Any Firestore schema, field name, `firestore.rules` change, or UI design — all remain Rule 8/Implementation Authorization questions, not decided here.

## 7. Acceptance Criteria

1. A confirmed Initial Stock snapshot has both a cost valuation total and a selling valuation total, both computed from existing per-portion facts, both preserved (FR-1).
2. The owner is offered exactly one basis choice per Initial Stock confirmation, for the whole snapshot — never a per-product or per-portion choice (FR-2).
3. The selected basis is stored as part of the Initial Stock record itself (FR-3).
4. No mechanism exists, anywhere, to change a confirmed snapshot's selected basis after confirmation (FR-4).
5. `initialCapitalValue`, read from any consumer, resolves to exactly the total the frozen basis selection points to (FR-5).
6. `capitalGrowth`/`capitalGrowthPct` use that resolved `initialCapitalValue`, with the existing division-by-zero guard intact (FR-6).
7. `businessWorth`'s own formula is provably unchanged — no new term, no removed term (FR-7).
8. Every raw per-portion fact of a confirmed Initial Stock snapshot is provably unchanged from before this capability existed (FR-8).
9. A multi-portion product's rows sum correctly into both totals, matching B5's existing cost-valuation summation behavior exactly, extended losslessly to the selling valuation (FR-9).
10. A later Add Stock purchase of the same product never alters any Initial Stock fact, total, or selected basis (FR-10).
11. An Initial Stock snapshot confirmed before this capability exists shows no selected-basis field, no behavioral change, and an `initialCapitalValue` identical to what it already reports today (I-4).
12. `InitialStockPriceChangeEvent` remains fully independent of the selected basis — recording a price-change event never alters, is never influenced by, and never itself represents a basis selection (Business Rule 11, I-7).

## 8. Governance Notes

- No `src/`, `server/`, `firestore.rules`, or `tests/` file is touched by this document.
- This Specification does not itself authorize implementation. A Rule 8 Assessment and a signed Implementation Authorization remain the required next gates, in that order, per `19-governance-bdr-policy-framework.md` §3.
- `BDR-0014`, `10-initial-stock-dual-valuation-basis-amendment.md`, and `02-capital-growth-dual-basis-amendment.md` are unmodified by this document.
- `docs/specs/README.md` is not modified by this document, consistent with prior artifacts in this lineage.

## 9. Product Architect Acceptance

**Status:** ⏳ **Pending.** This section remains unfilled until the Product Architect explicitly reviews and accepts this Specification. No implicit or inferred acceptance should be assumed from the drafting of this document.

---

**Lifecycle:** Drafted → **awaiting Product Architect review** (this step). Not Accepted, not assessed under Rule 8, not Authorized, not Implemented.
