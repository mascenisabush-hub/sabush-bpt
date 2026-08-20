Business Domain Specification — Amendment

# Capital Growth Dual-Basis Amendment

Version 1.0
**Status:** ✅ **Accepted**, per explicit Product Architect resolution of `BDR-0014` §5.A item 3, recorded in `BDR-0014` §11. **Implementation status: NOT AUTHORIZED.** This is a governance reconciliation, not an Implementation Authorization — a Specification and Rule 8 Assessment remain the required next gates (Next Governance Step, below).
**Amends:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md) — specifically its "Capital Growth" subsection (Business Rules). **Spec #2's own file is not edited by this document** — consistent with `10-initial-stock-dual-valuation-basis-amendment.md`'s identical practice; folding this language into spec #2's own text remains implementation-stage work.
**Governed by:** [`BDR-0014`](./BDR-0014-initial-stock-dual-valuation-basis.md) (Approved), §4 item 4 and §5.A item 3.
**Companion:** [`10-initial-stock-dual-valuation-basis-amendment.md`](./10-initial-stock-dual-valuation-basis-amendment.md) (Accepted) — establishes the frozen, per-count basis pointer this amendment's resolution reads.
**Distinct in kind from prior amendments touching this same section:** unlike the [Expected Current Stock Value Amendment](./10-expected-stock-value-amendment.md) and the [Initial Stock Valuation History Amendment](./10-initial-stock-valuation-history-amendment.md) — both of which explicitly state their own new figures do **not** modify `capitalGrowth` — **this amendment does change what `capitalGrowth`'s existing formula resolves to.** It is filed as its own, separately and explicitly labeled amendment specifically so it is never mistaken for another "explicit non-goal" entry alongside those two.

---

## Part 1 — The Resolution

`02-business-worth-engine.md`'s existing formula is **unchanged in shape**:

```
capitalGrowth = businessWorth − initialCapitalValue
capitalGrowthPct = initialCapitalValue > 0 ? (capitalGrowth / initialCapitalValue) × 100 : 0
```

**What changes is `initialCapitalValue` itself.** Today, `initialCapitalValue` unconditionally reads the `initial` Stock Count's cost-basis `totalValue`. Per `BDR-0014` §5.A item 3's explicit resolution (*"Follows the chosen basis — capitalGrowth uses whatever Initial Capital now displays"*), `initialCapitalValue` instead resolves to **whichever of the two frozen totals** `10-initial-stock-dual-valuation-basis-amendment.md` Part 2 describes — cost or selling — **that business's own Initial Stock confirmation permanently selected**, per that amendment's own frozen, per-count basis pointer.

**Concretely:**
- A business that confirmed Initial Stock before this capability existed, or that explicitly chose cost basis: `initialCapitalValue` remains exactly the cost-basis total, exactly as today — no change in the figure itself, ever, for that business.
- A business that explicitly chose selling basis at its own Initial Stock confirmation: `initialCapitalValue` resolves to the selling-basis total instead, permanently, for that business — and `capitalGrowth`/`capitalGrowthPct` are computed against that figure, per the unchanged formula shape above.

**No business's `initialCapitalValue` can ever resolve differently on two different screens, or at two different moments, for the same confirmed count** — the basis pointer is itself a frozen, per-count fact (`10-initial-stock-dual-valuation-basis-amendment.md` Part 2), never re-evaluated at read time.

## Part 2 — What This Amendment Does Not Change

- `businessWorth` itself (`totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime`) is **completely unaffected** — it contains no `initialCapitalValue` term today and none is added by this amendment, consistent with `BDR-0014` §7's explicit non-goal.
- The two prior "explicit non-goal" entries in spec #2's Capital Growth section (Expected Current Stock Value; Current Initial Stock Investment/Selling Value and per-event Valuation Change) are **entirely unaffected and not reopened** — neither of those figures is fed into `capitalGrowth` by this amendment either; this amendment only changes what `initialCapitalValue` — the term the formula already had — now resolves to.
- No change to `totalEmbeddedProfitAllTime`, `totalInvestmentValueAllTime`, or `totalMarketValueAllTime`.
- No change to `expectedCurrentStockValue` (Module #10's Contagem-comparison figure) — it is computed independently in `AppContext`, and this amendment does not touch it.
- No technical mechanism for *how* a given business's chosen basis is resolved at read time — that remains a Rule 8/Specification question, consistent with `10-initial-stock-dual-valuation-basis-amendment.md` Part 3's own deferral of schema questions.

## Part 3 — Why This Was Resolved This Way, Not the Alternative

Two alternatives were explicitly presented to the Product Architect and are recorded here for traceability, per this repository's discipline of never silently picking an answer to a flagged dependency: (a) `capitalGrowth` could instead have stayed permanently pinned to the cost-basis total regardless of what "Initial Capital" displays, leaving this existing metric's behavior completely decoupled from the new display capability; (b) two separate, explicit `capitalGrowth` variants (versus-cost and versus-selling) could have been introduced instead of one basis-following figure. **Neither alternative was chosen.** The Product Architect's explicit resolution — `capitalGrowth` follows the chosen basis — was selected instead, and is recorded as final for this BDR's scope in `BDR-0014` §11. Should a future need arise to reconsider this specific resolution, that requires its own explicit governance action; it is not left open by this document.

## Part 4 — Business Acceptance Criteria

1. `capitalGrowth = businessWorth − initialCapitalValue` remains the formula, unchanged in shape.
2. `businessWorth` itself contains no `initialCapitalValue` term, before or after this amendment.
3. `initialCapitalValue` resolves to the cost-basis total for every business that has not explicitly chosen selling basis, with zero change in the figure such a business already sees today.
4. `initialCapitalValue` resolves to the selling-basis total, permanently, for a business that explicitly chose it at Initial Stock confirmation.
5. No business's `initialCapitalValue` can resolve inconsistently across screens or over time for the same confirmed count.
6. The two prior "explicit non-goal" entries in spec #2's Capital Growth section remain accurate and unreopened.

---

**Governance Notes**

- No `src/`, `server/`, `firestore.rules`, or `tests/` file is touched by this document.
- `02-business-worth-engine.md` is unmodified by this document — this amendment is accepted as a governance reconciliation; folding this language into spec #2's own text remains a distinct, future, implementation-stage action, exactly as `10-initial-stock-dual-valuation-basis-amendment.md` treats its own base documents.
- This amendment does not itself authorize a Specification, Rule 8 Assessment, or Implementation Authorization.

## Next Governance Step

Identical to `10-initial-stock-dual-valuation-basis-amendment.md`'s own Next Governance Step: a Specification, then Rule 8 Assessment, then a signed Implementation Authorization, then Implementation — each its own separate, explicitly gated step.

**Lifecycle:** Drafted → **Accepted** (this step). Not Implemented.
