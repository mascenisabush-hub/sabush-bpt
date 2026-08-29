# Periodic Contagem — New-Product `sellingUnit` Capture — Implementation Authorization

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).** See "Product Architect Acceptance / Signature," §10, below, for the complete signed decision.

**Governing chain (sole authority for this Authorization):**
`BDR-0012` (Product Unit-of-Measure & Product Memory, Approved) → POL-0001–0006 → the UOM Specification → Business Worth Evolution's Decision 37 (`business-worth-evolution-implementation-authorization.md` §36, ✅ SIGNED AND AUTHORIZED, SABUSHIMIKE Masceni, 23 August 2026; §38, B.2's Execution Record) →
[Decision 37 B.2 Selling Unit Capture Extension Addendum](./decision-37-b2-selling-unit-capture-extension-addendum.md)
(✅ **SIGNED** — SABUSHIMIKE MASCENI, 29 August 2026) →
[Implementation Plan](./periodic-contagem-new-product-selling-unit-implementation-plan.md)
(✅ **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION AUTHORIZATION** — SABUSHIMIKE MASCENI, 29 August 2026) → **this Authorization**.

**No standalone Rule 8 Assessment document exists for this work — this is not an omission.** Per its own explicit header, the Implementation Plan folds Current-State-Assessment and Gap-Analysis content inline (its §1, §7, §10) rather than as a separate Rule 8 Assessment file, following this repository's own established, permitted small-module pattern (`platform-engineering-governance-standard.md` §2, Stage 7: "or inline in the phase's own Implementation Plan section for small modules"). This Authorization treats the Plan's own §1/§7/§10 as satisfying that gate — no separate Rule 8 Assessment file was skipped or overlooked.

**Baseline commit:** `0742595` (`main` = `origin/main`, verified via `git fetch`/`git status` immediately before drafting — working tree clean, nothing untracked, before this document was created). This is the exact commit that recorded the Implementation Plan's Product Architect Acceptance.

**This document does not modify application code, tests, dependencies, configuration, `firestore.rules`, `firestore.indexes.json`, `BDR-0012`, the UOM Specification, the historical Decision 37 B.2 record (`business-worth-evolution-implementation-authorization.md` §38, unedited), the signed reconciliation addendum, or the accepted Implementation Plan.** It exists to record the Product Architect's formal, signed decision to authorize engineering work — populated strictly from the already-accepted Plan and the already-signed addendum, introducing no new scope, no new business decision, and no technical detail neither of those two documents already specifies.

**One capability, stated once, governing everything below:** letting Periodic Contagem's own new-product relationship editor capture `UnitRelationship.sellingUnit` — from among the functional units the owner has already established — independent of the buying/acquisition unit, using the existing field, type, and validator only. This document authorizes that capability **as one whole**, exactly as the Plan defines it — no part of it (the selector UI, the two construction-site edits, the reset-on-edit behavior) may be treated as its own separately-gated capability.

---

## 1. Governance Completeness — What This Record Confirms

- `BDR-0012` and the UOM Specification remain Approved and unchanged — the underlying business rule (`UnitRelationship.sellingUnit` is optional, independent of `units[0]`, validated by `isValidUnitRelationship`) was never in question and required no reopening.
- The historical Decision 37 B.2 record (`business-worth-evolution-implementation-authorization.md` §38) is confirmed unedited — it remains an accurate record of B.2's own originally-bounded scope as implemented on 23 August 2026.
- The Decision 37 B.2 Selling Unit Capture Extension Addendum is confirmed **✅ SIGNED** (SABUSHIMIKE MASCENI, 29 August 2026), extending that scope without reopening, reversing, or reinterpreting §38.
- The Implementation Plan is confirmed **✅ ACCEPTED** (SABUSHIMIKE MASCENI, 29 August 2026), translating the signed addendum's decision into an exact, file-by-file design: current/desired state, scope, implementation approach, UI behavior, persistence, validation, an 8-test plan, regression boundaries, governance classification, and acceptance criteria.
- No unresolved governance blocker remains. The one point the Plan's own §10 flagged — whether Decision 37 B.2's scope exclusion should be reopened — was resolved by the signed addendum before the Plan's own acceptance.

## 2. What Is Authorized

**Objective, exactly as fixed by the Plan (§2, §4) and the signed addendum (§2):**

```
Existing:  units[] → confirmedAt
Desired:   units[] → sellingUnit → confirmedAt   (only when units.length >= 2)
```

**Authorized engineering work, drawn directly from the Plan's implementation approach (§4) — nothing added, nothing narrowed:**

1. Extend `newProductInfo`'s per-product state shape (`PeriodicStockCountView.tsx:1220-1222`) with one new field, `sellingUnit: string` (default `''`).
2. Render one new selling-unit `<select>` inside `NewProductInfoPanel`, directly below `UnitRelationshipChainEditor`'s own rendered chain — visible only once the relationship has at least one complete step (2+ total units) — populated from `[purchaseUnit, ...completeSteps.map(s => s.unit)]`, mirroring the existing `ModeAValuationControl`'s own `referenceUnitOptions` construction pattern (`PeriodicStockCountView.tsx:294-305`).
3. Thread the selected value into **both** existing candidate-`UnitRelationship`-construction sites — `getEffectiveUnitRelationshipForProductName` (`PeriodicStockCountView.tsx:1353-1376`) and the submit-time `unitRelationshipByProductName` correlation loop (`PeriodicStockCountView.tsx:2210-2229`) — as `sellingUnit: info.sellingUnit || undefined`, changing only the object literal each already builds. No new construction path, no second source of truth.
4. Reset the selecting state to blank whenever the current selection is no longer among the live option list (e.g. the owner removed the step that introduced it) — a derived-value check, mirroring the existing `effectiveReferenceUnit` fallback pattern already used by `ModeAValuationControl`'s own call site.
5. For a single-functional-unit product, the new selector never renders — no behavior change from today's already-correct handling.

**No new component is authorized; no existing component's behavior for the cases it already handles correctly may change.**

## 3. Authorized Behavior — Preserved Exactly, Binding on Implementation

Carried forward unaltered from the signed addendum (§2) and the accepted Plan — none may be reinterpreted, loosened, or silently narrowed during implementation.

**A. Single-unit product.** No `UnitRelationship` is required. No meaningless `1 unit = 1 unit` relationship is ever created. The one functional unit is naturally the product's selling/valuation unit.

**B. Multi-unit product.** Once the functional-unit chain is established, the owner chooses the selling/valuation unit from that chain, stored in the existing `UnitRelationship.sellingUnit` field. The selling unit is never forced to equal the purchase/buying unit. The owner separately enters the selling price associated with the selected unit; existing conversion logic (`getConversionFactor`) silently performs whatever valuation conversion is required.

**C. Physical quantity entry.** The owner records what physically exists, freely by unit (e.g. `3 Cx`, `1 Emb`, `5 Un`) — no manual conversion by the owner. The equivalent consolidated quantity is calculated silently by the existing engine; **no visible consolidated-total field is added** merely for display.

**D. Selling price / valuation.** Owner chooses the selling unit and enters its price; existing logic handles conversion silently. Business Worth formulas are unchanged.

**E. Add Portion.** Remains optional, appears only when the owner decides additional selling/valuation portions are useful, valid only for the current Contagem, is **not** Product Memory, is **not** persisted as a reusable Product-level selling-portion configuration, is **not** carried forward to the next Contagem, and introduces **no** new Product schema concept. The meaning of a portion (retail, wholesale, discount, or otherwise) is entirely the owner's decision — the system imposes no interpretation.

**F. Add Stock.** For an existing product: the established relationship and selected selling unit/price are remembered and reused automatically; when a purchase arrives in a different acquisition unit, valuation is converted automatically, with no manual re-entry or re-conversion required from the owner. For a genuinely new product: the owner supplies the required information through the existing new-product flow, which is **not redesigned** by this Authorization.

**G. Smart Stock Entry.** Inherits the same downstream Add Stock behavior, unmodified. This Authorization does **not** touch the AI extraction contract, the advisory/human-confirmation boundary, product recognition, or receipt extraction logic.

**H. Initial Stock.** Explicitly out of scope — not modified, not investigated, not touched.

## 4. Scope and Affected Files

**Authorized (drawn directly from Plan §3 — nothing added):**

| File | Authorized change |
|---|---|
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | The only application file: `newProductInfo` state extension, one new selling-unit `<select>`, both construction-site edits, per §2 above. |
| `tests/periodic-stock-arbitrary-length-relationship.test.ts` (extended) or a new, narrowly-scoped sibling test file | New tests per §9 below. |

**Explicitly excluded, confirmed untouched by this Authorization:**

- `BDR-0012`
- the UOM Specification
- the historical Decision 37 B.2 record (`business-worth-evolution-implementation-authorization.md` §38)
- the signed Decision 37 B.2 Selling Unit Capture Extension Addendum
- any other unrelated governance artifact
- Business Worth formulas (`apps/tenant/src/utils/calculations.ts`)
- `UnitRelationship`'s schema (`apps/tenant/src/types.ts`)
- `getConversionFactor` and any unrelated conversion logic (`apps/tenant/src/lib/purchaseToSellingConversion.ts`)
- `isValidUnitRelationship` (`apps/tenant/src/lib/unitRelationship.ts`) — reused unmodified
- `apps/tenant/src/lib/contagemMultiUnitValuation.ts` (Mode A/B)
- `apps/tenant/src/context/AppContext.tsx` (`recordStockCount`'s contract is unchanged — it already accepts and writes `unitRelationship` verbatim)
- `apps/tenant/src/components/AddStockView.tsx`
- `apps/tenant/src/components/InitialStockCountView.tsx`
- Add Portion's persistence semantics
- any Product-level multiple-selling-price/"selling portions" configuration
- Smart Stock Entry's extraction/advisory logic and Product Recognition Intelligence
- any server file — the accepted Plan identifies no required server change
- `firestore.rules` / `firestore.indexes.json` — the accepted Plan identifies no required change

**No file outside this list is authorized by this document.** If implementation discovers a file outside this list is technically required, that is a scope finding to report back to the Product Architect — not something to resolve silently.

## 5. Explicit Exclusions Restated — Not Authorized By This Document

Restating §4's exclusion list as an explicit negative, per the originating instruction's own structure — the following are **not** authorized, under any framing, by this Authorization: any BDR; any Policy; any Rule 8 Assessment; any redesign of the Business Worth formula, `UnitRelationship`'s schema, `getConversionFactor`, Smart Stock Entry's extraction contract, or Add Portion's persistence semantics; any Product-level multiple-selling-price configuration; any change to Initial Stock; any change to tenant isolation or data-integrity boundaries; any server-side change; any Firestore rules/indexes change.

## 6. Acceptance Criteria — Precise, Testable, Derived From the Plan

Carried forward unaltered from the Plan's own §11, restated in full per the originating instruction's own numbered list — none weakened:

- [ ] 1. Single-unit products require no `UnitRelationship`.
- [ ] 2. Multi-unit products can establish a functional-unit chain (unchanged, existing capability).
- [ ] 3. Multi-unit products can select `sellingUnit` from that chain.
- [ ] 4. Buying unit and selling unit remain independent — the selector never forces equality.
- [ ] 5. Physical quantities can be entered freely by actual unit (unchanged, existing capability).
- [ ] 6. No manual conversion is required from the owner at any point in this flow.
- [ ] 7. The equivalent quantity is calculated silently — no new visible total is added.
- [ ] 8. Selling price is associated with the owner's selected selling unit (existing Mode A/B mechanism, unchanged).
- [ ] 9. Add Portion is optional and temporary (unchanged).
- [ ] 10. Add Portion is not Product Memory (unchanged).
- [ ] 11. Add Portion does not create a standing multi-price Product configuration (unchanged, and none introduced by this work).
- [ ] 12. Existing Add Stock products reuse remembered unit/price information (unchanged, existing capability, unaffected).
- [ ] 13. Add Stock automatically converts valuation when purchase and selling units differ (unchanged, existing capability, unaffected).
- [ ] 14. Smart Stock Entry inherits the same behavior (unchanged, unaffected).
- [ ] 15. Initial Stock is excluded — untouched.
- [ ] 16. The existing conversion engine (`getConversionFactor`) is reused, not reimplemented.
- [ ] 17. No Business Worth formula changes.
- [ ] 18. No unauthorized schema changes — `sellingUnit` is an existing, already-typed field.
- [ ] 19. No unrelated module is modified — confirmed against §4's file list.
- [ ] 20. Existing tenant/data-integrity boundaries remain intact — this work touches only client-side candidate construction, no Firestore rule or cross-tenant read/write path.
- [ ] The selling-unit selector only ever offers units that are actually part of the in-progress chain.
- [ ] The selector does not render for a single-functional-unit product.
- [ ] The persisted `Product.unitRelationship.sellingUnit` (when set) matches exactly what the owner selected.
- [ ] `isValidUnitRelationship` continues to gate persistence unmodified.
- [ ] All 15 existing tests in `tests/periodic-stock-arbitrary-length-relationship.test.ts` continue to pass unmodified.
- [ ] `npm run lint:tenant` is clean for the affected scope.

## 7. Testing Requirements

Exactly the split the Plan's §8 already defines — this Authorization does not relax or expand it:

1. Multi-unit relationship candidate can contain a non-empty `sellingUnit` — new test.
2. Selected `sellingUnit` is always one of the chain's own units — new test, confirming `isValidUnitRelationship` correctly rejects an out-of-chain selection (proves the existing validator, unmodified, already guards this).
3. `sellingUnit` can differ from the purchase/acquisition unit — new test (`1 Cx = 12 Un`, `sellingUnit = 'Un'`).
4. Single-unit product never constructs a relationship or a `sellingUnit` — **already covered** by the existing `"zero complete steps produces no candidate at all for that product"` test; confirm it still passes unmodified, no new test needed.
5. All 15 existing tests in `tests/periodic-stock-arbitrary-length-relationship.test.ts` — regression, must remain 15/15.
6. Existing Add Stock test suites — regression only, not touched by this scope.
7. `tests/unit-relationship.test.ts`, `tests/purchase-to-selling-conversion.test.ts`, `tests/periodic-stock-mode-a-integration.test.ts`, `tests/periodic-stock-multi-portion-valuation.test.ts` — regression only, none require modification.

## 8. Regression Boundaries

Explicitly confirmed **not** changed: `UnitRelationship` type; `isValidUnitRelationship`'s logic; `getConversionFactor`; Business Worth (`calculations.ts`); `StockBatch`; Smart Stock Entry extraction; Add Stock's conversion mechanism; Add Portion's transient persistence behavior; any Product-level "selling portions" concept (none introduced); Initial Stock.

## 9. Manual QA (Carried Forward From the Plan §12)

**Scenario 1 (multi-unit):** New product "Impala," chain `1 Cx = 4 Emb`, `1 Emb = 6 Un`. Confirm the selling-unit selector offers `Cx`, `Emb`, `Un`. Select `Un`. Confirm the count. Verify `Product.unitRelationship.sellingUnit === 'Un'`, independent of the purchase unit `Cx`.

**Scenario 2 (single-unit):** New product "Arroz 25kg," relationship panel never expanded. Confirm the count with quantity in unit "Saco." Verify no `unitRelationship` field is written to the new `Product` document at all.

## 10. Product Architect Acceptance / Signature

**Status: ✅ ACCEPTED AND AUTHORIZED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED AND AUTHORIZED
> Date: 29 August 2026
>
> I accept and authorize the complete implementation defined by
> §§1–9 of this document, covering the full, unified capability:
> Periodic Contagem's new-product relationship editor capturing
> `UnitRelationship.sellingUnit` from among the established
> functional-unit chain, independent of the buying/acquisition unit,
> using the existing field, type, and validator only — as one
> authorized capability, not several separately-gated ones.
>
> This authorizes implementation of ONLY the scope explicitly listed
> in §§2–4 above. Nothing in §5 ("Explicit Exclusions Restated") is
> granted by this signature.

**Effective upon this signature:** engineering implementation of the complete capability defined in §2, subject to every behavioral preservation in §3, every acceptance criterion in §6, the testing requirements in §7, the regression boundaries in §8, and the exclusions in §4/§5, may now proceed. This includes, unchanged from §§2–9 above:

- The single, unified new-product `sellingUnit`-capture capability, exactly as designed.
- Every already-governed behavior (single-unit no-relationship rule, buying/selling independence, Add Portion's temporariness, Add Stock/Smart Stock Entry inheritance, Initial Stock exclusion) preserved unchanged.
- All 20+ acceptance criteria in §6, unweakened.

Any discovered need to exceed these boundaries during implementation returns to Product Architect review before proceeding — not resolved silently.

---

## Governance Notes

- This document does not modify `BDR-0012`, the UOM Specification, the historical Decision 37 B.2 record, the signed reconciliation addendum, or the accepted Implementation Plan — all remain byte-for-byte unchanged.
- §10 is now signed: **ACCEPTED AND AUTHORIZED**, Product Architect SABUSHIMIKE MASCENI, 29 August 2026. This document, together with its signed §10, is now the authoritative Implementation Authorization for this capability.
- Populated strictly from the already-accepted Implementation Plan and the already-signed addendum; no new technical detail, scope, or business decision beyond what those two documents already specify is introduced here or by this signature.
- This signature authorizes engineering implementation strictly within §§2–9 of this document — it is not itself the implementation, and no application code, test, or schema is created by this signature; that work remains a separate, subsequent step.
