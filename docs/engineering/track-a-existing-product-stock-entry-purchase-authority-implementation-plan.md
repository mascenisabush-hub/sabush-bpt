# Implementation Plan — Track A: Existing-Product Stock Entry Purchase Authority

**Governed by:** [`docs/specs/POL-pending-existing-product-stock-entry-purchase-authority.md`](../specs/POL-pending-existing-product-stock-entry-purchase-authority.md) (Accepted, Product Architect SABUSHIMIKE MASCENI, 2026-09-10).

**Rule 8 Assessment:** Produced and delivered in-session (chat-recorded, HEAD `2a0ef6e`) — not separately persisted as its own `docs/engineering/*-rule8-assessment.md` file as of this Plan. This Plan restates every finding of that assessment it depends on inline, phase by phase, so it is self-contained; flagged here as a deviation from this repository's usual paired-file convention, for the Product Architect's awareness, not assumed away. Disposition recorded by that assessment: **READY FOR IMPLEMENTATION PLANNING**, all seven Rule 8 sub-questions (R8-A–R8-G) resolved to CONFORMING, IMPLEMENTATION GAP, or PROTECTED/NO CHANGE — no GOVERNANCE GAP, GOVERNANCE CONFLICT, or BLOCKER found.

This document does not itself authorize starting Phase 1 — produced as the required planning artifact, not executed. A separate, explicit Implementation Authorization is required before Phase 1 begins.

---

## Resolution of the two items the Rule 8 Assessment left open (§14), per explicit Product Architect direction — no governance reopened

**§14 item 1 — OCR no-signal unit fallback:** Removed. Per the Product Architect's direction ("current purchase dictates purchase unit... I would expect the plan to remove that fallback too"), `buildRowFromProposalLineItem`'s own `if (!item.unit.value && productBatches.length > 0) unit = productBatches[0].unit || unit;` (AddStockView.tsx:2225) is in scope for removal (Phase 2, below) — the same historical-unit-as-default problem Track A §D prohibits for the manual-selection path applies here too, regardless of how narrow this particular fallback is.

**§14 item 2 — previous-cost comparison:** No change required. Traced this session: `getRememberedPriceForRow` (AddStockView.tsx:1728-1756) is consumed exclusively by `checkPriceDeviation(parseFloat(row.costPrice), getRememberedPriceForRow(row, 'cost'))` at four call sites (lines 3678, 3725, 4032, 4078) — a pure, read-only comparison (`priceDeviationCheck.ts`) that only ever renders a deviation warning caption above a 30% threshold; it does not write to `row.costPrice`, does not autofill anything, and cannot become an alternative input. This already satisfies Track A §G exactly as the Product Architect directed ("keep it as a temporary, read-only informational comparison. It should never populate or control the current cost field") — no code change needed.

---

## Phase 1 — Manual-selection purchase-side defaulting removal

**Files:** `apps/tenant/src/components/AddStockView.tsx`

**Purpose:** In `buildProductMemoryAutofill` (lines 1596-1641) and the row-creation site (lines 780-846), stop defaulting `newUnit`/`initialUnit` from `findLatestRememberedProductMemory`'s `memory.unit`, and stop defaulting `newCost`/`initialCost` from `memory.costPrice` or the `Product.costPrice` fallback (`else if (match.costPrice != null ...)`). Both functions' unit falls back to the existing no-memory default expression (`suggestedUnits[0] || 'un'`) unconditionally — the same value already used today when no memory exists at all. Both functions' cost field is left blank (`''`) whenever no OCR/manual value is present, exactly as already happens today for a genuinely new product with no history.

**Explicitly preserved, unmodified in this phase:** `resolveCanonicalProductSellingMemory` and its selling-price conversion logic (lines 1623-1629, 834-845) — selling price/unit continue to be sourced from canonical Product Memory exactly as today, converted into whatever unit the row ends up with. `previousCycleQuantity` resolution — unrelated, untouched.

**Dependencies:** None.

**Risks:** None identified. `resolveCanonicalProductSellingMemory`'s independence from the removed logic is confirmed by the Rule 8 Assessment (R8-D, PROTECTED/NO CHANGE) and by direct trace — it reads only `product.sellingPrice`/`product.unitRelationship.sellingUnit`, never `memory.unit`/`memory.costPrice`.

## Phase 2 — Confirm/Smart-Stock-Entry purchase-side defaulting removal

**Files:** `apps/tenant/src/components/AddStockView.tsx`

**Purpose:**
- `handleConfirmSupplierWordingCandidate` (lines 2038-2108): remove the `if (!costPrice) { const resolvedCost = resolveUnitAwarePrice(memory.costPrice, ...); ... }` branch (2089-2096). The selling-price conversion branch immediately above it (2081-2088) is untouched.
- `buildRowFromProposalLineItem` (lines 2176-2259): remove the cost-fallback line `if (!costPrice) costPrice = resolveUnitAwarePrice(memory.costPrice, memory.unit, unit, matched.unitRelationship);` (2255) and its sibling `if (!costPrice && matched.costPrice != null) costPrice = String(matched.costPrice);` (2257) in the `else` branch. Also remove the no-OCR-signal historical-unit fallback, `if (!item.unit.value && productBatches.length > 0) unit = productBatches[0].unit || unit;` (2225), per the §14 resolution above. OCR's own priority (`unit = item.unit.value || (suggestedUnits[0] || 'un')`, line 2179; `costPrice = item.costPrice.value != null ? String(item.costPrice.value) : ''`, line 2178) is untouched — these already correctly give the current receipt priority and are exactly what Track A §B requires kept.

**Explicitly preserved, unmodified in this phase:** the selling-price conversion logic at both sites (lines 2081-2088, 2253-2254), OCR's own initial-value assignment, `resolveScanRowSupplierWordingAsync` and every supplier-wording-recognition mechanism — none of this is touched.

**Dependencies:** None (independent of Phase 1 — different functions, same file).

**Risks:** Removing the OCR-no-signal unit fallback means a row where OCR detected no unit at all, for a product with prior purchase history but no OCR unit reading, now defaults to the generic `suggestedUnits[0] || 'un'` rather than the latest StockBatch's own unit — an intentional behavior change per the §14 resolution above, not an oversight.

## Phase 3 — Stop fabricating a converted cost on purchase-unit change

**Files:** `apps/tenant/src/components/AddStockView.tsx`

**Purpose:** In `handleUnitChange` (lines 1669-1713), remove the cost-conversion branch entirely:

```
if (row.costPriceAutoFilled && row.costPrice !== '') {
  ... resolveUnitAwarePrice(...) ...
}
```

**Why this is the correct, minimal fix for the OCR-fabrication problem (Rule 8 R8-E), not a separate mechanism:** after Phases 1-2, no code path sets `costPriceAutoFilled = true` for a cost value sourced from Product Memory — that source is removed. The only remaining path that sets `costPriceAutoFilled = true` for cost is OCR's own initial read (`costPriceAutoFilled: costPrice !== ''`, `buildRowFromProposalLineItem` line 2281, unchanged). Consequently, once Phases 1-2 land, `handleUnitChange`'s cost-conversion branch would from that point on **only ever fire on an OCR-origin value** — precisely the case Track A §F prohibits converting. Removing the branch outright, rather than adding a new origin-tracking flag, achieves the same required outcome with a smaller change: an OCR-supplied cost that the operator hasn't manually confirmed is left exactly as OCR read it when the unit is corrected, visibly available for the operator to notice and retype from the receipt — never silently transformed into a fabricated number.

**Explicitly preserved, unmodified in this phase:** the selling-price conversion branch immediately below it (lines 1702-1710, `if (row.sellingPriceAutoFilled && row.sellingPrice !== '') {...}`) — this remains legitimately memory-sourced (canonical Product selling configuration) and must continue to re-derive correctly on a unit change, per Track A §E's "immediately interpreted through the existing selling configuration" requirement. `costPriceAutoFilled`/`costPriceBasisUnit` themselves are **not removed from `StockRowItem`** — they may still serve other purposes (e.g. UI styling distinguishing an OCR-populated field) and their removal is out of this Plan's scope; only their consumption inside this one conversion branch changes.

**Dependencies:** Phases 1-2 (the reasoning above depends on cost-side memory-autofill no longer existing; sequencing this phase after 1-2 in implementation, though the code change itself could technically land independently, keeps the "why this is safe" justification accurate at every intermediate commit).

**Risks:** None identified beyond the intended behavior change itself, which is the explicit purpose of this phase.

## Phase 4 — Historical price comparison: verification only, no code change

**Files:** None.

**Purpose:** Formal record that `getRememberedPriceForRow`/`checkPriceDeviation` (§14 item 2, above) already conforms to Track A §G and requires no change. This phase exists so the Implementation Authorization has an explicit checkbox for this item rather than it being silently assumed.

**Dependencies:** None.

**Risks:** None — no code touched.

## Phase 5 — Tests

**Files:** `tests/product-memory-price-resolution.test.ts`, `tests/add-stock-cost-selling-unit-conflation-bugfix.test.ts` (both reviewed for assertions that currently encode the removed default behavior — per the Rule 8 Assessment §11, TEST 4/5's own "never overrides newUnit from canonical memory" assertions remain valid and are not touched; any assertion elsewhere in these files that currently expects `buildProductMemoryAutofill`/`buildRowFromProposalLineItem` to source `costPrice`/`unit` from `findLatestRememberedProductMemory` for an *existing* product needs updating to reflect the new expected blank/receipt-only behavior), plus new, narrowly-scoped test coverage for:

1. An existing product with prior StockBatch/StockCount history: selecting it manually leaves `row.unit`/`row.costPrice` blank/default rather than populated from that history (Phase 1).
2. The same, via `handleConfirmSupplierWordingCandidate` and `buildRowFromProposalLineItem` (Phase 2), including the OCR-no-signal-unit case now defaulting generically rather than to the latest StockBatch's unit.
3. The exact OCR-then-unit-correction scenario (Rule 8 R8-E worked example: OCR reads `2 Un`/`1,000 MZN/Un`, operator corrects unit to `Cx`): `row.costPrice` remains `1000` (unconverted, unfabricated) after the unit change, not `24000` (Phase 3).
4. Regression guard: canonical selling-price/unit conversion (`resolveCanonicalProductSellingMemory` + `resolveUnitAwarePrice`) still produces the worked example's `48 Un`/`3,120 MZN` result correctly, for both the manual-selection and OCR paths, unaffected by Phases 1-3 (protects R8-D/R8-F's PROTECTED/NO CHANGE findings).

**Dependencies:** Phases 1-3.

**Risks:** None — test-only.

## Phase 6 — Build / regression verification

**Files:** None new.

**Purpose:**
- `npx tsc --noEmit -p .` — clean, no new errors beyond the existing documented baseline.
- `npm run test:all` — 100% passing, zero regressions in any pre-existing suite outside the ones intentionally updated in Phase 5.
- `npm run build` — clean.
- `git diff` reviewed against this Plan's own file list — no unlisted file touched.
- `HANDOFF.md` updated; commit named with the policy/plan (`docs(track-a): ...` / `fix(add-stock): ...` per this repository's existing scoping convention); push only per the session's standing instruction (auto-commit/push once each phase's implementation is accepted, unless told no).

## Explicit Scope Boundary

**Touches only:** `apps/tenant/src/components/AddStockView.tsx` (`buildProductMemoryAutofill`, the row-creation site, `handleConfirmSupplierWordingCandidate`, `buildRowFromProposalLineItem`, `handleUnitChange`), plus the test files named in Phase 5, plus `docs/specs/*`/`docs/engineering/*`/`HANDOFF.md` for the governance/handoff trail.

**Does not touch:**
- `apps/tenant/src/lib/purchaseToSellingConversion.ts` — no change, per Rule 8 R8-F (PROTECTED/NO CHANGE).
- `apps/tenant/src/lib/productMemoryPriceResolution.ts` — `findLatestRememberedProductMemory` and `resolveCanonicalProductSellingMemory` themselves are not modified; only their *consumption* at the AddStockView call sites above changes.
- `apps/tenant/src/context/AppContext.tsx` — `addMultipleStockBatches`, `StockBatch.unit`/`costPrice` persistence, and the FR-86 `Product.costPrice` forward-maintenance mechanism (lines 4093-4103) are all untouched, per Rule 8 R8-C/§10 (forward-write direction confirmed unaffected).
- `StockCountItem`, `costBasisEstablished`, any Contagem UI or persistence file.
- `firestore.rules`, `firestore.indexes.json` — no schema/security-boundary change; this Plan changes only which existing, already-typed row fields get defaulted from which existing source.
- Product Catalog (Phase 1/Phase 2), Product Recognition/OCR extraction itself (only its already-existing output's *consumption priority* is touched, not the extraction mechanism), Product Merge, SupplierWordingRelationship logic, Business Worth formulas, `calculateBatch`/`calculateInventoryTotals`.
- New Product / first-time Product creation in Add Stock — explicitly out of Track A's scope, carries its own unresolved FR-85 question, handled separately.

---

**Lifecycle:** Policy Accepted → Rule 8 Assessed (Ready) → **Implementation Plan (this document)** → Implementation Authorization (not yet issued) → Implementation. No code, test, or governance-document edit has been made to produce this Plan.
