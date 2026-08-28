Implementation Authorization

# Implementation Authorization — Periodic Contagem Cost-Price Removal (§44)

**Type:** Governance bridge document — the formal record that engineering
governance is complete and implementation would be authorized to begin,
once signed. Stage 8 of this repository's governance sequence (BDR/
Reconciliation → Specification/Amendment → Rule 8 → **Implementation
Authorization** → Implementation).

**Status:** ✅ **Authorized. Signed by the Product Architect** — see
§10, below.

**Governing chain:** [`business-worth-evolution-specification.md`](../specs/business-worth-evolution-specification.md)
§15/FR-67 (✅ Approved) → [Periodic Contagem Cost-Price Removal Amendment](../specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md)
(proposed §44, ✅ **ACCEPTED AND SIGNED**, FR-71–FR-77, commit `a0316dc`)
→ [Rule 8 Assessment](./business-worth-evolution-periodic-contagem-cost-price-removal-rule8-assessment.md)
(✅ **READY, ACCEPTED AND SIGNED**, Finding 4 resolved with no remaining
ambiguity, commit `3802d90`) → [Implementation Plan](./business-worth-evolution-periodic-contagem-cost-price-removal-implementation-plan.md)
(file-by-file plan, commit `72d272e`).

**Precedent note:** this document's structure follows the most recent,
directly comparable precedent in this repository,
[`initial-stock-dual-valuation-basis-implementation-authorization.md`](./initial-stock-dual-valuation-basis-implementation-authorization.md)
(signed, Authorized) — itself scoped to an additive, optional-field,
UI-plus-derivation change of comparable size.

**Repository state at this revision:** `main = origin/main = 72d272e17ce4aee5b2775638e18c4f9f002684c2`,
working tree clean, confirmed via `git fetch` immediately before this
document was drafted. **Nothing has been modified in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `tests/`, the amendment, the
Rule 8 Assessment, or the Implementation Plan to produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

**Specification/FR-67 → Amendment (§44) → Rule 8 → Implementation Plan
→ Authorization (this document) → Implementation**

| Stage | Document | Status |
|---|---|---|
| Governing Specification | `business-worth-evolution-specification.md` §15/FR-67 | ✅ Approved |
| Amendment | `business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md` (§44) | ✅ Accepted and Signed |
| Rule 8 | `business-worth-evolution-periodic-contagem-cost-price-removal-rule8-assessment.md` | ✅ Assessed — **READY**, Accepted and Signed |
| Implementation Plan | `business-worth-evolution-periodic-contagem-cost-price-removal-implementation-plan.md` | ✅ Drafted |
| **Authorization** | **This document** | ✅ **Authorized** — signed below |
| Implementation | *(not started)* | ❌ Not authorized until this document is signed |

## 2. What This Authorization Covers (Once Signed)

Every item below traces to a specific Rule 8 Finding and Implementation
Plan section — see §4's traceability table for the full chain back to
the amendment's own FR.

1. **Add `costBasisEstablished?: boolean` to `StockCountItem`**
   (`apps/tenant/src/types.ts`) — additive/optional; `true` when a
   portion's `costPrice` was derived from a valid governed cost basis
   (including the purchase-unit portion), `false` when no basis existed
   and `costPrice` is `0`/not established, absent on every item
   persisted before this ships (Rule 8 Finding 3; Plan §2.1 item 1).
   The same optional field is added identically to
   `StockCountTallyItem` and `NormalizedStockCountItem`
   (`apps/tenant/src/utils/stockCount.ts`) for internal consistency
   across the shared preview/persistence path (Plan §4).
2. **Capture the existing `derived` return value at both existing call
   sites** of `deriveCostContribution`
   (`normalizeStockCountItems` and `tallyStockCountRows`,
   `apps/tenant/src/utils/stockCount.ts`), threading it into
   `costBasisEstablished` on each function's respective output item.
   **`deriveCostContribution` itself (`fr67CostBasisConversion.ts`) is
   not modified** — its signature, logic, and `getConversionFactor`
   dependency are reused exactly as they exist today (Rule 8 Finding 2,
   3; Plan §2.1 item 2).
3. **Remove the two remaining Owner-editable Cost Price inputs**
   (`apps/tenant/src/components/PeriodicStockCountView.tsx`) — the
   purchase-unit-portion cost field in both the catalog-row render path
   (~2978–2989) and the manual-row render path (~3412 region) —
   mirroring exactly how `isCostFieldSuppressed` already removes the
   equivalent field for non-purchase-unit portions. `isCostFieldSuppressed`
   and `getCostBasisForSuppression` are left in place, unmodified, since
   their non-purchase-unit-portion logic is unchanged (Rule 8 Finding 1;
   Plan §2.1 item 3).
4. **Remove the live secondary cost-total display and its "vs. Valor
   Esperado" trend indicator in full** (`PeriodicStockCountView.tsx`
   ~3607–3654) — both the `liveTally.totalPurchaseValue` line and the
   `comparisonBaseline`-driven `diff`/`diffPct` rendering. The
   selling-value hero figure's markup, position, and calculation are
   untouched and become the sole element in that card (Rule 8 Finding 4,
   **explicitly confirmed by the Product Architect with no remaining
   ambiguity**; Plan §2.1 item 4).
5. **Re-anchor the post-confirmation headline to `savedSellingTotal`**
   (`PeriodicStockCountView.tsx` ~2164–2250), in place of `savedTotal`.
   Any retained cost-basis figure on this screen is demoted to secondary
   presentation and explicitly labelled to reflect `costBasisEstablished`
   (uniformly derived, uniformly not-established, or mixed across the
   count's items) — exact copy/label wording is an implementation-task
   decision, not fixed by this authorization (Rule 8 Finding 5; Plan
   §2.1 item 5).
6. **Remove the two cost-side price-deviation warning call sites and
   their JSX** (`PeriodicStockCountView.tsx` ~3014–3021 catalog rows,
   ~3447 manual rows) — the `getRememberedPriceForRow(row, 'cost')` call
   and its associated amber warning block, at both sites. The two
   selling-side call sites, `checkPriceDeviation`, and
   `PRICE_DEVIATION_WARNING_THRESHOLD` (`priceDeviationCheck.ts`) are
   **not modified** (Rule 8 Finding 7; Plan §2.1 item 6).
7. **The required tests**, per the Rule 8 Assessment's own §15 and the
   Implementation Plan's own §6: the known `price-deviation-warning-
   wiring.test.ts` call-count update (4→2, plus an assertion that both
   remaining call sites are `'selling'`); `costBasisEstablished`
   derivation coverage (governed purchase-unit portion → `true`,
   no-basis portion → `false`, omitted parameter → absent field);
   structural, no-DOM-harness assertions that no Cost Price `<input>`
   render path remains for the purchase-unit portion, that the live
   cost-total/trend block is absent from the component source while the
   selling-value hero figure remains, and that the post-confirmation
   headline binds to `savedSellingTotal`; the recommended (not required)
   structural guard that the history comparison and the §22
   reconciliation note remain separate, non-nested regions; and full,
   unmodified regression passes for `contagem-cost-basis-conversion.test.ts`,
   `periodic-stock-cost-field-suppression.test.ts`, every Selling-Price
   regression test, every Business Worth snapshot/read-path test, and
   every Initial Stock test.

**No `firestore.rules` or `firestore.indexes.json` change is authorized
or required** — Rule 8 §11/§9 and Plan §4 confirmed both directly
against the actual rules/index files: no per-item field-shape validation
exists today for periodic `StockCount` creates, and no new query pattern
is introduced by any item above.

## 3. What This Authorization Does Not Cover

Every exclusion below is preserved exactly as the signed amendment's §6/
§16 and the Rule 8 Assessment's §17 already established — none is
invented here:

- **Any change to Initial Stock**, in any respect —
  `InitialStockCountView.tsx` is not referenced anywhere in §2, above,
  and is not touched by this authorization.
- **Any change to Product Memory** (`BDR-0012`) or its pre-fill
  mechanics.
- **Any change to purchase-entry (+Stock) behavior** —
  `AddStockView.tsx` is not touched by this authorization.
- **Any change to `productValuationTotal`, `normalizedTotalSellingValue`,
  `measuredBusinessWorth`, or any `BusinessWorthSnapshot` field** — none
  of §2's items touch `recordStockCount`'s selling-basis computation
  path, and none is authorized to.
- **Any change to `Product.unitRelationship`, `getConversionFactor`, or
  any conversion/rounding rule.**
- **Any change to Mode A (`contagemMultiUnitValuation.ts`) or Mode B
  mechanics**, or to multiple-portion/multiple-selling-price behavior.
- **Any change to the Selling Price invocation of the deviation
  warning**, or to `checkPriceDeviation`/`PRICE_DEVIATION_WARNING_THRESHOLD`
  themselves.
- **Any new cost-anomaly-detection mechanism** — explicitly forbidden by
  FR-77; none is authorized here either.
- **Any change to `recordStockCount`'s atomic batch-write, submission-
  identity idempotency, or `BusinessWorthSnapshot` construction logic.**
- **Any `firestore.rules` or `firestore.indexes.json` change** — Rule 8
  and the Implementation Plan both determined neither is required; none
  is authorized here.
- **Any migration or backfill of any existing `StockCountItem`/
  `StockCount` document** — `costBasisEstablished`'s absence on every
  historical item is itself the correct, permanent, accurate historical
  state.
- **Any change to `StockCountWorkingRow`'s schema** — `costPrice: string`
  remains exactly as it is today; only its UI binding is removed.
- **Any exact UI copy, layout, or typography decision** beyond the
  governing principle fixed in §2 items 4–5 — implementation-task detail,
  not authorized or fixed here.
- **Any additional Product Architect business decision** — none is
  needed; the Rule 8 Assessment found every question already resolved,
  including Finding 4, now explicitly confirmed.
- **Any expansion of this authorization beyond the signed amendment's
  FR-71 through FR-77 and this document's own §2** — this
  authorization's scope is exactly, and only, what §2 lists.
- **Any Policy (`POL-NNNN`) document** — none is drafted or assigned by
  this authorization.

## 4. Rule 8 → Implementation Traceability

| Amendment FR | Rule 8 Finding | Authorized Implementation Consequence |
|---|---|---|
| FR-71 (no Owner-editable Cost Price input) | Finding 1 | §2 item 3 — remove 2 remaining render sites |
| FR-72 (governed derivation, incl. purchase-unit portion) | Finding 2 — **already implemented, already tested** | §2 item 2 — capture existing `derived` flag; zero new calculation code |
| FR-73 (no fabricated zero; "not established" distinguishable) | Finding 3 | §2 item 1 — new `costBasisEstablished?: boolean` |
| FR-74 (Selling Value sole live total) | Finding 4 — **confirmed, no remaining ambiguity** | §2 item 4 — remove entire cost-total/trend block |
| FR-75 (post-confirmation headline = Selling Value) | Finding 5 | §2 item 5 — headline swap, secondary label |
| FR-76 (history comparison retained, unmerged, not elevated above §22) | Finding 6 — PASS | No code change — already structurally satisfied |
| FR-77 (cost deviation warning retired; selling unaffected) | Finding 7 | §2 item 6 — remove 2 cost-side call sites + JSX |
| Business Worth formula unaffected (amendment §12) | Findings 2, 9 (Rule 8 §9) | PASS — zero touch to `productValuationTotal`/`measuredBusinessWorth` |
| Initial Stock unaffected (amendment §6) | Rule 8 §17 | PASS — `InitialStockCountView.tsx` untouched |

## 5. The Finding-4 Resolution — Explicitly In Scope

The Rule 8 Assessment originally flagged, rather than silently assumed,
whether FR-74's "sole live total" language extended to the "vs. Valor
Esperado" trend indicator sitting alongside the live cost total, since
the two are visually and computationally distinct elements sharing the
same underlying value. **The Product Architect has since explicitly
confirmed: FR-74 means the live Periodic Contagem screen shows Selling
Value as the sole live total, and the live cost total and its "vs. Valor
Esperado" trend indicator are both removed** — recorded in the Rule 8
Assessment's own §20 signature and restated here for traceability.

**This resolution is explicitly included in the authorized scope (§2,
item 4) and must not be silently narrowed during implementation to
"remove the total line only" — both the total and its trend indicator
are in scope, as one unit.**

## 6. Risk Acknowledgment

- **Lowest-risk item in this authorization:** §2 item 2 (capturing the
  already-existing, already-correct `derived` flag). The underlying
  computation is not new — it is already implemented and already
  covered by a passing regression test
  (`contagem-cost-basis-conversion.test.ts:163`). The risk surface is
  limited to correctly wiring an already-correct value through two call
  sites, not to any new derivation logic.
- **Structural-removal risk (§2 items 3, 4, 6):** this repository has no
  DOM render harness. A removed UI element that leaves dead, unreachable
  code behind — rather than being fully removed — would not be caught by
  any existing test category without an explicit structural assertion
  naming it. The structural tests named in §2 item 7 are therefore
  treated as **required**, not optional, specifically to control this
  risk.
- **Label-wording risk (§2 item 5):** the exact secondary-label copy for
  a mixed-`costBasisEstablished` count is left to implementation-task
  judgment; this authorization fixes the underlying binding
  (`costBasisEstablished` per item, headline reads `savedSellingTotal`)
  but not the wording itself — a low-risk, cosmetic-only open item.
- Every new field this authorization introduces is additive and
  optional (`StockCountItem.costBasisEstablished?`,
  `StockCountTallyItem.costBasisEstablished?`,
  `NormalizedStockCountItem.costBasisEstablished?`) — consistent with
  this codebase's established backward-compatibility pattern for every
  prior amendment in this lineage.

## 7. Testing Boundary (Carried Into Implementation)

At minimum, per Rule 8 §15 and Implementation Plan §6: the known
`price-deviation-warning-wiring.test.ts` update; `costBasisEstablished`
derivation coverage across the governed, no-basis, and parameter-omitted
cases; structural absence assertions for the removed cost input, the
removed live cost-total/trend block, and the re-anchored post-
confirmation headline; the recommended history/§22-separation structural
guard; and full, unmodified regression passes for
`contagem-cost-basis-conversion.test.ts`,
`periodic-stock-cost-field-suppression.test.ts`, every Selling-Price
regression test, every Business Worth snapshot/read-path test suite, and
every Initial Stock test.

## 8. Rollback / Reversibility

Every change this authorization introduces is either purely additive
(`costBasisEstablished?`) or a UI-only removal (Cost Price inputs, the
live cost-total/trend block, the cost-side deviation warning, the
post-confirmation headline binding). A rollback requires no destructive
migration: reverting the UI removals restores the prior Owner-facing
behavior exactly, and `costBasisEstablished`'s presence or absence on
any item is inert to every pre-existing consumer, since it is never read
by any valuation calculation. No data loss is possible from a rollback,
consistent with this codebase's established rollback posture for every
prior amendment in this lineage.

## 9. Acceptance Criteria

Extracted directly from the signed amendment's own §15 and the Rule 8
Assessment's findings — none invented beyond what those two documents
already support:

1. Periodic Contagem's entry screen presents no Owner-editable Cost
   Price input, for any portion, of any product, of any unit (FR-71;
   §2 item 3).
2. For a product with a valid governed cost basis, every counted
   portion's cost contribution — including the purchase-unit portion —
   is derived from that basis with no Owner-typed cost value involved
   (FR-72; §2 item 2 — already true computationally, confirmed by
   existing test).
3. For a product with no valid governed cost basis, the system never
   presents a cost figure indistinguishable from a genuinely observed
   zero; quantity and Selling Price remain fully recordable and fully
   valued regardless (FR-73; §2 items 1–2).
4. The live entry screen shows no secondary cost total and no
   cost-basis trend indicator; the Selling Value total remains the sole
   live total (FR-74, Finding 4 resolved; §2 item 4).
5. The post-confirmation screen's headline valuation is the counted
   Selling Value; any retained cost figure is secondary and explicitly
   labelled as derived/not-established (FR-75; §2 item 5).
6. The history view's cost-basis comparison remains present, fed by its
   existing governed basis, and is not presented with equal or greater
   prominence than the §22 reconciliation signal (FR-76 — already
   satisfied, no code change required).
7. No Cost Price deviation warning fires in Periodic Contagem; the
   Selling Price deviation warning is unaffected (FR-77; §2 item 6).
8. `productValuationTotal`, `normalizedTotalSellingValue`, and
   `measuredBusinessWorth` are computed identically to their current,
   unamended behavior (amendment §12; verified unaffected by every item
   in §2).
9. `StockCountItem.costPrice`, `StockCount.totalValue`, and
   `expectedValueAtCount` retain their existing names, types, and
   optionality; no historical `StockCount` document is altered
   (amendment §11; §2 item 1's additive-only field).
10. Initial Stock's Cost Price behavior is unchanged in every respect
    (amendment §6; confirmed by `InitialStockCountView.tsx`'s complete
    absence from §2).
11. All tests named in §7 of this document pass, including the known
    `price-deviation-warning-wiring.test.ts` update and the full
    regression suite named there.
12. No migration or backfill of any kind occurs, for any existing
    record (§8, above).

---

## 10. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** August 28, 2026

**Authorization decision (verbatim):**
> "I accept the Implementation Authorization for the §44 Periodic
> Contagem Cost-Price Removal Amendment as drafted. I confirm that the
> governance process — Amendment, Rule 8 Assessment, and Implementation
> Plan — is complete, that Finding 4 is resolved with no remaining
> ambiguity, and I formally authorize implementation strictly within the
> scope, constraints, exclusions, and acceptance criteria recorded in
> this Implementation Authorization."

**Confirmed as part of this signature:**

- [x] This authorization's scope (§2) is approved as stated.
- [x] This authorization's exclusions (§3) are approved as stated.
- [x] The Finding-4 resolution (§5) is explicitly acknowledged as in
      scope, as one unit (total line + trend indicator together).
- [x] No additional scope change is required beyond what §1–§9 of this
      document describe.

---

**This document, as signed, authorizes implementation strictly per §2's
scope and §3's exclusions.** No code has been written, and no schema or
`firestore.rules` change has been made, as of the filing of this signed
authorization — implementation is the next, separate execution step this
signature enables, not something this signature itself performs.
