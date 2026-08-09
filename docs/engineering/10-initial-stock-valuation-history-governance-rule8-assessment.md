# Rule 8 Governance-Readiness Assessment — Initial Stock Valuation History Amendment

**Governing spec:** [`10-initial-stock-valuation-history-amendment.md`](../specs/10-initial-stock-valuation-history-amendment.md)
(✅ Approved) amending [`10-stock-counts.md`](../specs/10-stock-counts.md)
(v1.2)
**Kind of assessment:** This is **not** a standard implementation Rule 8
(files affected → plan → risks → implementation) — no implementation is
authorized or performed by this document. It is a **governance-readiness**
assessment, per this task's own explicit instruction, answering whether
the now-formalized concept is internally coherent, correctly bounded, and
consistent with what has already shipped.

---

## 1. Is the business principle clearly defined?

**Yes.** Part 1 of the amendment states it in one sentence: the price
basis of remaining Initial Stock can change after the original count,
and the platform should be able to show both the old and new valuation
without altering the historical record. Parts 3–6 define event meaning,
quantity semantics, price semantics/formulas, and multi-event behavior
precisely enough to be checked directly against code — and were checked
(see Part 11 of the amendment and this document's §10).

## 2. Is the concept compatible with Business Worth philosophy?

**Yes.** It does not assume a sale occurred (Architecture 1.8's
Worth-First scope test), does not create a sales/cash ledger (`CLAUDE.md`
Rules 3–4), and does not conflate a price-driven valuation change with
realized or embedded profit (Part 5). It is a narrower, more honest
concept than "profit" — it only ever claims "the price basis changed,"
never "value was captured."

## 3. Is Initial Capital protected?

**Yes.** Part 2 restates the existing "no exceptions" immutability tier
and confirms no new exception is created. Verified structurally, not
just declared: `initialCapitalValue` reads only
`initialStockCount.totalValue`; no function this feature introduces
writes to `stockCounts`, and `firestore.rules`' unconditional
`update`/`delete` refusal for `type == 'initial'` is unmodified.

## 4. Is Embedded Profit protected?

**Yes.** Part 5 defines Valuation Change with its own formula, distinct
from `embeddedProfit = marketValue − investmentValue` (spec #2/#6).
Verified in code: `calculateInitialStockValuationChange()`'s return
shape has no `profit`/`embeddedProfit` field (also directly asserted by
a test in `tests/initial-stock-price-change.test.ts`, "valuationChange
is not Embedded Profit"), and nothing in this feature writes to or reads
from `calculateInventoryTotals`.

## 5. Is Business Worth protected?

**Yes.** Part 8 adds a one-bullet non-goal to spec #2, matching the
existing Expected Current Stock Value Amendment's precedent exactly.
Verified: `git diff HEAD -- src/context/AppContext.tsx` (run as part of
this governance session) shows **zero** lines changed — the
`businessWorth`/`capitalGrowth`/`capitalGrowthPct` formulas are
untouched, both by this governance pass and by the code changes that
preceded it.

## 6. Is Expected Current Stock Value intentionally left unresolved?

**Yes, explicitly.** Part 9 of the amendment states this as a boundary,
not an oversight: the existing Expected Current Stock Value definition
(Confirmed Initial Capital + StockBatch cost value) is unmodified, and
whether Current Initial Stock Valuation should ever factor into it is
named as a separate, not-yet-authorized decision — consistent with the
code's own governing comment on `initialStockCurrentValuation` and two
prior `HANDOFF.md` sessions flagging the same open question. This
assessment does not resolve it and is not authorized to.

## 7. Are quantity semantics unambiguous?

**Yes.** Part 4 states plainly that `quantityRemaining` is owner-
asserted, not system-derived, and lists exactly what the platform does
*not* claim to know (units sold/consumed/transferred, or why the
quantity changed). This matches the code exactly — no field anywhere
computes a delta between the original 100-unit count and any event's
`quantityRemaining`; each event is independently validated (`> 0`, not
exceeding the original item's counted quantity) but never derived.

## 8. Are multiple events unambiguous?

**Yes.** Part 6 states the rule precisely — latest event by
`effectiveDate` (tie-broken by `createdAt`) represents current state;
earlier events are neither summed nor discarded, only superseded for
valuation purposes while remaining permanently readable. This was
directly verified against `calculateInitialStockCurrentValuation()`'s
`mostRecent()` selection logic and confirmed by three dedicated tests
(single event, multiple events using only the latest, both events
independently recomputable).

## 9. Is historical integrity protected?

**Yes.** Events are append-only at the Security Rules layer
(`allow update: if false; allow delete: if false`, unconditional, every
role) — the same tier as the `initial` Stock Count itself. No
migration, backfill, or retroactive rewrite of any existing record is
introduced by this governance document or by the feature it governs.

## 10. Is the implementation consistent with the governance decision?

**Yes, checked directly rather than assumed** — this is the central
purpose of writing this amendment *after* implementation rather than
before it. Every rule stated in Parts 2–9 was verified against the
actual shipped code during this session:

| Governance rule | Verified against |
|---|---|
| Initial Capital immutable | `firestore.rules` `stockCounts` block, `AppContext.tsx` `initialCapitalValue` |
| Event = owner-asserted snapshot, no movement inference | `types.ts` type comment, `firestore.rules` create validation (shape only, no derivation) |
| Valuation Change formula | `calculateInitialStockValuationChange()`, `calculations.ts` |
| Not Embedded Profit | Return-shape check, dedicated test |
| Latest event wins, no summing | `calculateInitialStockCurrentValuation()`'s `mostRecent()` logic, dedicated tests |
| Append-only | `firestore.rules` `initialStockPriceChangeEvents` block |
| Does not touch `businessWorth`/`capitalGrowth`/`capitalGrowthPct` | `git diff` — zero lines in `AppContext.tsx`'s formula section |
| Does not touch `expectedCurrentStockValue` | Same `git diff` — confirmed unmodified |

No discrepancy was found between what this document governs and what
is already built.

## 11. Are there any remaining contradictions?

**None found between this amendment and the existing Expected Current
Stock Value Amendment** — see Part 9's boundary statement; the two
govern non-overlapping figures today. **One adjacent, already-flagged
gap remains outside this document's scope**: the `sellingPrice` field
addition to `StockCountItem`/`InitialStockDraftItem` — a prerequisite
input this feature depends on — is itself still unformalized (Part 12
of the amendment, `HANDOFF.md`). This is not a contradiction, but an
honestly-named remaining governance debt this task did not authorize
closing.

## 12. Is this governance item ready for future controlled implementation?

**The governance record itself is complete and internally consistent.**
Whether any *future* implementation is "ready" depends on what that
future work would be — and none is authorized by this document. Two
concrete candidates for a future, separately-authorized task:

- Formalizing the `sellingPrice` addition (§11, above) — governance
  debt, not new design.
- Any change wiring Current Initial Stock Valuation into Expected
  Current Stock Value, Business Worth, or any other formula — explicitly
  **not** decided here (Part 9); would need its own product decision,
  its own amendment, and its own Rule 8 implementation assessment before
  any code changes, per this task's own explicit prohibition.

---

## Verification performed for this assessment

- `git diff HEAD -- src/context/AppContext.tsx docs/specs/10-stock-counts.md` (targeted read) —
  confirmed `expectedCurrentStockValue`/`businessWorth`/`capitalGrowth`/
  `capitalGrowthPct` formulas unchanged; spec #10's prior content
  preserved with only additive `[Valuation History Amendment v1.0]`-tagged
  sections.
- `firestore.rules` `initialStockPriceChangeEvents` block read directly
  (lines ~366–394) to confirm create/read/update/delete tiers stated in
  this document and in spec #10 match exactly, not from memory.
- `tests/initial-stock-price-change.test.ts` read directly to confirm
  the "not Embedded Profit," "single event," and "multiple events, latest
  only" claims above are each backed by an existing, passing test.
- No `src/`, `server/`, `firestore.rules`, or `tests/` file was modified
  to produce this assessment.
