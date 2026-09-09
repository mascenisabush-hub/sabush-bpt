Implementation Authorization

# Implementation Authorization — Product Catalog Phase 2

**Type:** Governance bridge document — the formal record that engineering governance is complete and implementation is authorized to begin, per this signature, strictly within the scope defined below. Does not itself perform implementation and does not modify code, `firestore.rules`, schema, UI, or tests.

## 1. Authorization Status

**✅ IMPLEMENTATION AUTHORIZED — WITHIN DEFINED SCOPE.** Signed 2026-09-09 by SABUSHIMIKE MASCENI, Product Architect. See §8 for the signed acceptance record. Authorization is valid only for the exact scope defined in §3–§5 of this document; anything outside that scope remains unauthorized and requires the appropriate governance process before any code implementing it may be written.

**Repository state at drafting:** `main = origin/main`, `HEAD = 6d8bd5a9c2b0ffb7f7dab78b2c3f5519f7d77793` (the Implementation Plan's own acceptance commit), working tree clean, confirmed via `git fetch`/`git pull` immediately before this document was drafted. Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `package.json`, or `tests/` to produce this document.

**No duplicate:** a repository-wide search for existing Product Catalog Phase 2 Implementation Authorization artifacts (`find docs -iname "*phase-2*implementation-authorization*"`) returns nothing prior to this document.

**Precedent note:** this document's structure follows `product-catalog-phase-1-implementation-authorization.md`, the closest, most directly comparable repository precedent for a governance-bridge authorization document, adapted to Product Catalog Phase 2's own scope.

## 2. Governance Basis

[Phase 2 BDR](./product-catalog-phase-2-bdr.md) (✅ Accepted, `e9e4297e7ba010619fd6ca81973fff07415711cf`) → [Policy Amendment](../specs/POL-pending-selling-price-unit-invariant-amendment.md) (✅ Accepted, `d677c82329199e67c40159ec64e564bb79f38fd0`) → [Decision 1](../specs/product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md) (✅ Accepted, `cc09b5c9d718121023861973bd40edec6fb41ffa`) → [Decisions 2A/2B](../specs/product-catalog-phase-2-add-stock-correction-scope-and-name-confirmation-decision-amendment.md) (✅ Accepted, `7fe6ac9c54d157c4433f6dc6c29cf918fb69080b`) → [Phase 1 Selling-Price/Unit Reconciliation](./product-catalog-phase-1-selling-price-unit-reconciliation-amendment.md) (governing constraint, unchanged) → [Phase 2 Specification](../specs/product-catalog-phase-2-canonical-product-information-multi-door-correction-and-selling-configuration-specification.md) (✅ Accepted, SABUSHIMIKE MASCENI, 2026-09-09, `a4880958a6f30c37e9aa76729ef2856b934c5c86`) → [Rule 8 Assessment](./product-catalog-phase-2-rule8-assessment.md) (✅ FINAL — READY FOR IMPLEMENTATION PLANNING, `f60f841b36af290b0926709de34eac76cc7bbfad`) → [Implementation Plan](./product-catalog-phase-2-implementation-plan.md) (✅ Accepted, SABUSHIMIKE MASCENI, 2026-09-09, `6d8bd5a9c2b0ffb7f7dab78b2c3f5519f7d77793`) → **THIS Implementation Authorization** → *(next, once signed: implementation, checkpoint by checkpoint — not performed by this document)*.

All eight upstream artifacts re-verified unchanged against current `main` immediately before drafting this document (§11 restates this check explicitly).

## 3. Authorized Implementation

### 3.1 Scope (restated from the Specification §4–§17 / Implementation Plan §A–§X, unmodified)

Implement the 24 functional requirements of the accepted Phase 2 Specification within the existing architecture, exactly as the accepted Implementation Plan describes. No product redesign, no new business rule, no scope beyond what §3.2's acceptance criteria and §4's checkpoints authorize.

### 3.2 Required Acceptance Criteria (restated, not reinterpreted)

**A. One Canonical Product Information Model.** Catálogo, Add Stock, and Contagem remain legitimate doors into the same canonical Product record. Catálogo is the only stock-free Product creation door. Catálogo is NOT the exclusive editing surface. No workflow-specific duplicate Product Information store may be created.

**B. Selling Price / Selling Unit Invariant.** A canonical Product must not end a confirmed logical write action with a non-null/non-empty `sellingPrice` while the corresponding `unitRelationship.sellingUnit` is absent or invalid. A Product may exist without `sellingPrice`. A Product may exist without a selling/reference configuration. A valid single-unit `UnitRelationship` remains permitted (`product-unit-of-measure-specification.md` §9).

**C. UnitRelationship Preservation.** Existing confirmed `UnitRelationship` information must not be silently discarded or altered. A valid extension preserves every previously confirmed unit token and factor and adds at least one new unit. A replacement/reconfiguration requires explicit owner confirmation. If the proposed replacement no longer contains the current confirmed `sellingUnit`, confirmation must also supply a valid `sellingUnit` from the proposed relationship. The system MUST NOT auto-select a new `sellingUnit`, silently clear `sellingPrice`, or silently discard the existing confirmed relationship.

**D. Product Name.** Add Stock may correct canonical `Product.name` within the approved scope, but consequential `name` correction requires explicit owner confirmation. Recognition, matching, and transaction recording must never silently rename the canonical Product.

**E. Cost Price.** `costPrice` remains outside canonical Product Information editing and remains governed by FR-88.

**F. Supplier Wordings.** `SupplierWordingRelationship` remains separately governed by `BDR-0013`/`POL-0007` and must not be absorbed into the generic Product Information model.

**G. Product Memory.** Preserve, verbatim: *"This Specification governs the canonical selling configuration represented by `sellingPrice` and `unitRelationship`; it does not redefine the broader Product Memory model governed by `BDR-0012`."* No workflow-specific Product Memory store may be introduced. Historical Product Memory fallback must not be silently promoted into canonical state.

**H. Authorization / Tenant Isolation.** Implementation must preserve the existing tenant and ownership boundaries identified by the accepted Plan (`firestore.rules:484-508` — `isMemberOf` for create, `isOwnerOf` for update/delete, unconditional). Do not weaken existing authorization. Do not modify security rules outside the authorized scope (§5).

## 4. Authorized Checkpoint Sequence (exact, from the accepted Implementation Plan §X — not reordered, not combined)

1. **UnitRelationship old-state-aware extension** — extend `confirmProductUnitRelationship` only (`AppContext.tsx`), per Plan §5. `isValidUnitRelationship`/`confirmUnitRelationship` themselves unmodified.
2. **Catálogo creation/edit** — `registerCatalogProduct`, `ProductCatalogView.tsx`, `EditProductModal.tsx`, per Plan §H.
3. **Contagem coupling fix** — `PeriodicStockCountView.tsx`, `recordStockCount` in `AppContext.tsx`, per Plan §J.
4. **Add Stock correction capability** — `AddStockView.tsx`, per Plan §I, §K, reusing the existing `handleReactivateProduct` write/error-handling pattern for authorization treatment (§6, below).
5. **Full regression sweep** — no new functional change; run every existing test file referencing any file touched by Checkpoints 1–4.

Each checkpoint requires its own review before the next begins, exactly as the accepted Plan states. This authorization does not permit silently combining checkpoints or reordering them.

## 5. File Scope

**Authorized for change, only as required by the corresponding checkpoint above — not a blanket permission to touch every listed file:** `apps/tenant/src/context/AppContext.tsx`; `apps/tenant/src/components/ProductCatalogView.tsx`; `apps/tenant/src/components/EditProductModal.tsx`; `apps/tenant/src/components/AddStockView.tsx`; `apps/tenant/src/components/PeriodicStockCountView.tsx`; `tests/product-catalog-phase-1-checkpoint-b.test.ts`; `tests/product-catalog-phase-1-checkpoint-c.test.ts` (**Implementation Authorization Amendment, Accepted 2026-09-09 — see §10, below; authorized only as to the two specific assertions the accepted Implementation Plan Amendment identifies — "has exactly six input elements inside the registration form" and "does NOT contain UnitRelationship configuration UI" — no other assertion, helper, fixture, import, or structure in that file is authorized to change**); new or extended test files where the accepted Plan §V explicitly requires them.

**Protected — MUST NOT change under this authorization:** `apps/tenant/src/utils/calculations.ts` (Business Worth); `apps/tenant/src/lib/productMemoryPriceResolution.ts`; `apps/tenant/src/lib/sellingMemorySelection.ts`; the existing exported function signatures of `apps/tenant/src/lib/unitRelationship.ts` (`isValidUnitRelationship`, `confirmUnitRelationship`); `firestore.rules` (no change authorized — the accepted Plan classified the Add Stock authorization question as resolvable without a rules change, §6 below); any file implementing `SupplierWordingRelationship`/`confirmSupplierWordingRelationship`; any `costPrice`-handling code path.

**If implementation discovers that a file outside this list must change, or that a protected file must change, implementation MUST stop and report the scope conflict — this authorization does not extend itself automatically.**

## 6. Rule 8 Observations — Authorized Treatment (restated from the accepted Plan, not reopened)

**§2.L (UnitRelationship old-state awareness):** authorized treatment is the smallest safe extension to the existing, currently-unused `confirmProductUnitRelationship` — add one old-state-aware check before its existing validation; `isValidUnitRelationship`/`confirmUnitRelationship` remain unmodified. No new function, no new file.

**§2.Q (Add Stock Staff authority):** authorized treatment is reuse of the existing `handleReactivateProduct` pattern (attempt the write; `firestore.rules`' existing, unconditional `isOwnerOf`-only update rule is the actual authorization boundary; on denial, generic catch/alert/rollback, exactly as that function already does). **No new authorization policy, no new client-side role gate beyond this reused pattern, and no `firestore.rules` change is authorized.**

## 7. Implementation Discipline

Implementation must: follow the accepted Specification and accepted Implementation Plan exactly; remain reuse-first, preferring existing write/read paths over parallel mechanisms; use the smallest safe change at every step; preserve existing behavior outside the authorized scope; add the tests the accepted Plan §V identifies as required, not claim any as already existing without verification; verify each checkpoint (§4) before proceeding to the next; and **stop immediately on any discovered contradiction between implementation reality and the accepted governance chain**, returning to the appropriate governance gate rather than resolving it autonomously. No new product or business decision may be introduced during implementation, at any checkpoint, for any reason.

## 8. Authorization Signature

> I have reviewed the accepted Product Catalog Phase 2 Specification (`a488095`), Rule 8 Assessment (`f60f841`), and accepted Implementation Plan (`6d8bd5a`), including the acceptance criteria restated in §3.2 above, the exact checkpoint sequence in §4, the file scope and protected boundaries in §5, and the authorized treatment of both Rule 8 observations in §6. I authorize implementation to proceed strictly within this scope, checkpoint by checkpoint, with the stop/escalation discipline of §7 in force at every step. This signature does not itself perform any implementation.

**Product Architect:** SABUSHIMIKE MASCENI

**Decision:** IMPLEMENTATION AUTHORIZED

**Date:** 2026-09-09

## 9. Governance Notes

- This document does not modify the accepted Phase 2 Specification, Rule 8 Assessment, Implementation Plan, BDR, Policy Amendment, Decision 1, Decisions 2A/2B, the Phase 1 reconciliation, `BDR-0012`, `BDR-0013`, `POL-0005`, `POL-0007`, or `19-governance-bdr-policy-framework.md`.
- No application code, test, schema, or `firestore.rules` file has been modified to produce this document.
- This document authorizes implementation strictly within §3–§6; it does not authorize Product Merge, Business Worth calculation changes, Product Memory model changes, `SupplierWordingRelationship` changes, `costPrice`/FR-88 boundary changes, unrelated refactoring, or unrelated UI redesign.
- Implementation itself, once begun, proceeds checkpoint by checkpoint per §4 — this document does not perform, and is not, that implementation.

## 10. Implementation Authorization Amendment — Checkpoint 2 Regression-Assertion Reconciliation

**Type:** Implementation Authorization Amendment — narrowly amends only §5's file-scope provision, to bring this Authorization into alignment with the already-accepted Implementation Plan Amendment (`docs/engineering/product-catalog-phase-2-implementation-plan.md`, "Product Architect Acceptance of Implementation Plan Amendment — Checkpoint 2 Regression-Assertion Reconciliation," Accepted 2026-09-09, commit `54ef1e0`). Authorizes no new product capability; does not modify the Specification, Rule 8 Assessment, the Implementation Plan's substantive implementation scope, or any BDR/Policy/Decision; does not authorize general modification of `checkpoint-c.test.ts`, Checkpoint 3–5, or any implementation itself.

**Status:** ✅ Accepted / IMPLEMENTATION AUTHORIZATION AMENDED (2026-09-09).

**Amendment content, in full (the only substantive change this amendment makes to this Authorization):**

The §5 addition, above, adding `tests/product-catalog-phase-1-checkpoint-c.test.ts` to the file-scope list — authorized **only** as to the two specific assertions the accepted Implementation Plan Amendment identifies:
1. The assertion requiring exactly six input elements in the Catalog registration form.
2. The assertion requiring that `ProductCatalogView.tsx` contain no UnitRelationship configuration UI.

This authorization exists only because those two assertions directly encode behavior already superseded by the accepted Phase 2 Specification (§6/§10) and necessarily become obsolete the moment Checkpoint 2 implements the already-authorized Catalog behavior (Plan §H) — it is not a general grant to edit this file, and no other assertion, helper, fixture, import, or test structure within it is authorized to change under this amendment.

> This Implementation Authorization Amendment is accepted exactly as scoped above. The original Implementation Authorization (§1–§9, signed 2026-09-09) remains in force, unchanged, in every other respect — this amendment adds exactly one narrowly scoped test file to §5, limited to the two named assertions; all other original authorization boundaries, protected-file list, checkpoint sequence, and Rule 8 treatment remain exactly as originally signed. This acceptance does not modify the accepted Phase 2 Specification, Rule 8 Assessment, BDR, Policy Amendment, Decision 1, Decisions 2A/2B, or the Implementation Plan beyond its own already-accepted amendment. This acceptance authorizes implementation to resume Checkpoint 2 strictly within the existing Checkpoint 2 scope (§3–§4, above) plus this §10 amendment — it does not authorize Checkpoints 3–5, and does not itself perform any implementation.

**Product Architect:** SABUSHIMIKE MASCENI

**Decision:** ACCEPTED / IMPLEMENTATION AUTHORIZATION AMENDED

**Date:** 2026-09-09
