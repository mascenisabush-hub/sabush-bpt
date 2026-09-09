Implementation Plan — DRAFT, NOT YET AUTHORIZED

# Product Catalog Phase 2 — Implementation Plan

**STATUS: ✅ ACCEPTED (2026-09-09).** See "Product Architect Acceptance of Implementation Plan," below. No code, test, schema, or `firestore.rules` change was made to produce this document. This acceptance does not itself authorize implementation — a separate, signed Implementation Authorization remains a required, subsequent gate.

**Governing chain:** [Phase 2 BDR](./product-catalog-phase-2-bdr.md) (✅ Accepted, `e9e4297`) → [Policy Amendment](../specs/POL-pending-selling-price-unit-invariant-amendment.md) (✅ Accepted, `d677c82`) → [Decision 1](../specs/product-catalog-phase-2-selling-price-unit-relationship-reconfiguration-decision-amendment.md) (✅ Accepted, `cc09b5c`) → [Decisions 2A/2B](../specs/product-catalog-phase-2-add-stock-correction-scope-and-name-confirmation-decision-amendment.md) (✅ Accepted, `7fe6ac9`) → [Phase 2 Specification](../specs/product-catalog-phase-2-canonical-product-information-multi-door-correction-and-selling-configuration-specification.md) (✅ Accepted, SABUSHIMIKE MASCENI, 2026-09-09, `a488095`) → [Rule 8 Assessment](./product-catalog-phase-2-rule8-assessment.md) (✅ FINAL — READY FOR IMPLEMENTATION PLANNING, `f60f841`) → **this Implementation Plan (✅ ACCEPTED, SABUSHIMIKE MASCENI, 2026-09-09)** → *(next: Implementation Authorization — not created here)*.

**Repository state investigated:** `main @ f60f841`, working tree clean, verified via `git fetch`/`git pull` immediately before drafting. Every file/line reference below was re-confirmed fresh this session.

---

## A. Implementation Objective and Governing Chain

Implement the 24 functional requirements of the accepted Phase 2 Specification (§17) within the existing architecture, per the Rule 8 Assessment's `READY FOR IMPLEMENTATION PLANNING` disposition — no unapproved product redesign, no new business rule, no broadened scope beyond what §B below cites.

## B. Specification and Rule 8 References

Every requirement cited below traces to Specification §4–§17 (as summarized in the Rule 8 Assessment's §2.A–§2.P) and to the two Rule 8 observations, §2.L and §2.Q, both explicitly addressed in §5/§6 below.

## C. Current Architecture / Code-Path Assessment (re-verified fresh)

- **Catálogo:** `registerCatalogProduct` (`AppContext.tsx:8022`, creation) requires `sellingPrice`, never writes `unitRelationship`. `EditProductModal.tsx` → `updateProduct` writes `name/category/supplier/sku/barcode/sellingPrice`; displays `unitRelationship` read-only; never writes it.
- **Add Stock:** new-product branch (`addStockBatch`) writes `unitRelationship` (if valid) and `costPrice`, never `sellingPrice`. Existing-product path writes only `StockBatch` fields. One existing canonical write: `handleReactivateProduct` (`AddStockView.tsx:1429-1440`) → `updateProduct(product.id, { active: true })` — no role gate, generic try/catch/alert/rollback on failure (§F, §S).
- **Contagem:** `recordStockCount` writes `unitRelationship`/`sellingPrice` from two independently-populated maps (`unitRelationshipByProductName`, `sellingMemoryByProductName`); existing-product branch's `sellingUnitFieldUpdate` re-validates against the *current* relationship but is gated independently of `sellingPriceChanged`.
- **Shared primitives:** `isValidUnitRelationship`/`confirmUnitRelationship` (`unitRelationship.ts`) — pure, single-candidate validation, no prior-state awareness. `confirmProductUnitRelationship` (`AppContext.tsx:8101`) — writes `unitRelationship` only, zero callers anywhere.
- **`firestore.rules:484-508`:** `products/{productId}` — `allow create: if isMemberOf(businessId)`; `allow update, delete: if isOwnerOf(businessId)`. No new field requires a rules change (§S, §T).
- **Test debt:** `product-catalog-phase-1-checkpoint-b.test.ts` asserts `registerCatalogProduct` "never sets `unitRelationship`" — will require updating.
- **Additional test debt (Implementation Plan Amendment, Accepted 2026-09-09 — see "Product Architect Acceptance of Implementation Plan Amendment," below):** identified during Checkpoint 2 pre-implementation investigation, not identified at original Plan-acceptance time. `tests/product-catalog-phase-1-checkpoint-c.test.ts` contains two assertions — "has exactly six input elements inside the registration form" and "does NOT contain UnitRelationship configuration UI" — that are directly and exclusively contradicted by Specification §6/§10 and by this Plan's own §H. Checkpoint 2 is authorized to update only these two specific assertions, so that they test the newly governing behavior rather than the Checkpoint-C-era behavior the Specification has already superseded. No other assertion in this file, and no other legacy checkpoint test file, is authorized for change by this amendment.

## D. Files/Components/Services Expected to Change

- `apps/tenant/src/context/AppContext.tsx` — `registerCatalogProduct`, `confirmProductUnitRelationship`, `recordStockCount` (both write branches), and new function(s) for Add Stock canonical correction.
- `apps/tenant/src/components/ProductCatalogView.tsx` — creation form: add unit-relationship capture, remove unconditional `sellingPrice` requirement.
- `apps/tenant/src/components/EditProductModal.tsx` — add `unitRelationship`/`sellingUnit` editing (currently read-only).
- `apps/tenant/src/components/AddStockView.tsx` — new in-context correction UI for `name`/`sellingPrice`/`sellingUnit`/`unitRelationship`, with the name-change confirmation mechanism (§K).
- `apps/tenant/src/components/PeriodicStockCountView.tsx` — couple `sellingUnitFieldUpdate`'s gate to `sellingPriceChanged` so neither can fire without the other resulting in a valid pair.
- `tests/product-catalog-phase-1-checkpoint-b.test.ts` — update the now-superseded assertion.
- New or extended test files per §V.

## E. Files/Components Explicitly Expected NOT to Change

`apps/tenant/src/utils/calculations.ts` (Business Worth — confirmed to never read `products`); `apps/tenant/src/lib/productMemoryPriceResolution.ts`, `sellingMemorySelection.ts`, `unitRelationship.ts`'s existing exported functions' signatures (extended via new logic, not rewritten — §5); `firestore.rules` (§S, §T — no change identified as necessary); any `SupplierWordingRelationship`/`confirmSupplierWordingRelationship` code (`BDR-0013`/`POL-0007`, untouched); `costPrice`-related code paths anywhere (FR-88).

## F. Data Model / Write-Path Analysis

No schema change. Every field this Plan touches already exists on `Product` (`types.ts:415-461`). The work is entirely in *which* existing write functions run *when*, and *what validation* gates them before they run — not new fields, not new collections.

## G. Canonical Product Information Write Strategy

Reuse existing patterns: `updateProduct` (generic passthrough) remains the underlying primitive for metadata (`name/category/supplier/sku/barcode`); `confirmProductUnitRelationship` (extended per §5) becomes the single point every door routes through for `unitRelationship`/`sellingUnit` changes, since it is the one function already built and named for exactly this ("a catalog 'confirm unit relationship' screen"), currently unused, so extending it carries zero regression risk to any existing caller.

## H. Catálogo Create/Edit Strategy

- **Create (`registerCatalogProduct`):** remove the unconditional `sellingPrice`-required throw; accept an optional `unitRelationship` candidate; if a `sellingPrice` is supplied, require it to arrive alongside a valid `sellingUnit` in the same call (Specification §6/§10) — reject the combination otherwise, mirroring the existing `Number.isFinite`/`>= 0` validation-before-write pattern this function already uses for `sellingPrice` itself.
- **Edit (`EditProductModal.tsx`):** add `unitRelationship`/`sellingUnit` fields to the existing form; route through `confirmProductUnitRelationship` (extended, §5) rather than the current no-op read-only display.

## I. Add Stock Contextual Correction Strategy

New capability (§7 of the Specification): a correction affordance for `name`, `sellingPrice`, `sellingUnit`, `unitRelationship` on an already-matched existing product, reusing `handleReactivateProduct`'s existing pattern (attempt write → generic catch → alert → optimistic-state rollback) for authorization-failure handling (§6, below) — no new error-handling framework.

## J. Contagem Compatibility Strategy

Couple the existing-product branch's price and unit writes: `sellingPriceChanged` may only produce a write when `sellingUnitFieldUpdate` is defined or the product's `unitRelationship.sellingUnit` is already valid post-write — smallest change to the existing gate at `AppContext.tsx` ~L5602–5646, not a rewrite of `recordStockCount`. Apply the identical coupling to the new-product branch's two independent maps.

## K. Product.name Explicit-Confirmation Mechanism

A distinct confirmation step (Specification §9) — exact UI (modal vs. inline) is an implementation choice, not dictated by the Specification; smallest safe choice: reuse the existing confirmation-dialog pattern already used elsewhere in this codebase for other consequential actions (e.g., the existing "confirm as new product" pattern in Add Stock's identity resolution), rather than building a new dialog primitive.

## L. sellingPrice/sellingUnit Invariant Enforcement

Every write path in §H–§J validates the pairing *before* constructing its write payload — no path may submit a payload containing a non-null `sellingPrice` without also including a valid `sellingUnit` in the same call. This is validation-before-write, using each function's own existing single-call/single-`fsBatch` structure (§8) — no new transaction mechanism required.

## M. UnitRelationship Handling

- **Unchanged relationship:** no write occurs.
- **sellingUnit reassignment within existing relationship:** reuse Contagem's existing dot-path-update pattern (`AppContext.tsx` ~L5630-5638), extended to be callable from any door.
- **Extension** (every prior unit/factor preserved, new unit added): submitted as a full candidate to the extended `confirmProductUnitRelationship` (§5); passes because no existing unit/factor changed and the prior `sellingUnit` (if still present) remains valid.
- **Replacement/reconfiguration** (any factor change, removal, or restructuring): same entry point; the extended old-state-aware check (§5) evaluates whether the prior `sellingUnit` survives in the candidate.
- **Preservation until confirmation:** no write occurs until the owner's confirmation action fires — the existing `confirmUnitRelationship`/`confirmProductUnitRelationship` architecture already has no intermediate-write step (validation happens before the single write), so this is inherent, not new.
- **Blocking when the current `sellingUnit` is dropped:** the extended check (§5) returns a distinguishable error the caller surfaces to the owner, requesting a new valid `sellingUnit` from the proposed relationship, in the same confirmation action — never proceeding with the write until resolved.
- **No automatic selection, no automatic clearing:** the extended check never itself supplies a `sellingUnit` or touches `sellingPrice` — it only validates and, on failure, refuses to write.

## N. Product Memory Boundary

Unchanged, per Specification §12: *"This Specification governs the canonical selling configuration represented by `sellingPrice` and `unitRelationship`; it does not redefine the broader Product Memory model governed by `BDR-0012`."* No implementation change to `findLatestRememberedProductMemory`, `resolveUnitAwarePrice`, or `resolveCanonicalProductSellingMemory` — all remain read/prefill-only, unmodified.

## O. SupplierWordingRelationship Boundary

Unchanged. `confirmSupplierWordingRelationship` remains the sole writer; no code in this Plan reads or writes `supplierWordings`.

## P. costPrice / FR-88 Boundary

Unchanged everywhere. No function this Plan touches gains a `costPrice` parameter or write path.

## Q. Existing Product vs. New Product Behavior

Unchanged identity-resolution guards (`confirmedNewProduct`, existing-match checks) in every write function touched by this Plan — none is loosened, none is bypassed by the new correction capability, which only ever operates against an *already-resolved* existing product.

## R. Recognition/Matching Write Restrictions

Unchanged — confirmed zero write calls exist in any recognition-related file today; this Plan adds none.

---

## 5. Rule 8 Observation §2.L — UnitRelationship Old-State Awareness

**Investigated, smallest safe extension identified:** extend `confirmProductUnitRelationship` (`AppContext.tsx:8101`) itself — the one function already built and explicitly documented as the anticipated single entry point for this action, with zero existing callers (zero regression risk to extend). Add one new check, performed *before* the existing `confirmUnitRelationship`/`isValidUnitRelationship` validation: read the target product's *current* `unitRelationship.sellingUnit` (already available via the existing `products` state this file already holds); if it is set and is **not** a member of the *proposed* candidate's `units[]`, and the candidate's own `sellingUnit` field does not already supply a valid replacement, throw a distinguishable error identifying the blocked-replacement case (distinct from the existing generic "invalid relationship" error) rather than proceeding to write. `isValidUnitRelationship`/`confirmUnitRelationship` themselves are **not modified** — they remain correct, general-purpose, candidate-only validators; the new old-state-aware check is additive, sitting in front of them, specific to the "confirm a *replacement* for an *existing* product" scenario Decision 1 governs. This satisfies Decision 1's requirements (§11 of the Specification) without weakening the existing relationship at any point — the existing relationship is read for comparison only, never written to, until the new check passes.

## 6. Rule 8 Observation §2.Q — Add Stock Staff Authority

**Classification: Option 2 — resolvable from existing authorization architecture, without inventing a new business/product rule.**

**Evidence:** `AddStockView.tsx` already contains one existing `products`-collection UPDATE call reachable from a Staff-accessible session — `handleReactivateProduct` (L1429–1440) — with **no role check of any kind** before attempting the write. Its existing pattern: attempt `updateProduct`; on failure (which `firestore.rules`' unconditional `isOwnerOf`-only update rule would produce for a Staff session), catch generically, `alert(err?.message || ...)`, and roll back the optimistic UI change so "the Owner can see the banner (and retry) again — a failed reactivation must not silently look like it succeeded" (the function's own governing comment). Separately, this same file already establishes precedent for treating Staff differently *within* Add Stock — but only by **hiding sensitive business insight** (estimated profit per row, L3380; the combined total summary bar, L4128) from Staff, never by restricting Staff's ability to perform the core recording action.

**Conclusion, evidenced, not invented:** the existing architecture already answers this question for the one canonical write Add Stock currently performs, and that answer generalizes cleanly to the new correction capability without adding a new rule: **attempt the write; let `firestore.rules`' existing, unconditional `isOwnerOf` check be the actual authorization boundary; on denial, surface a clear error and roll back, exactly as `handleReactivateProduct` already does.** No `firestore.rules` change, no new client-side role gate, and no new business decision about who "should" be allowed to correct Product Information is required — the existing rule already decided that (Owner/Admin only), consistently, for every `products` update regardless of which door originates it, and the existing error-handling pattern already exists to surface a denial gracefully rather than silently. This Plan applies that identical, already-established pattern to every new write this Plan introduces.

---

## S. Authorization / Security Considerations

Covered in full by §6, above, and by `firestore.rules`' existing, unchanged `isMemberOf`/`isOwnerOf` boundary (§C). No new authorization tier, no new rule, no new client-side gate beyond reusing the existing generic error-handling pattern.

## T. Tenant-Isolation Considerations

Unaffected — every write this Plan touches remains scoped under `businesses/{businessId}/products/{productId}`, governed by `isMemberOf`'s existing, unmodified cross-business protection (Rule 8 §2.Q, confirmed PASS).

## U. Validation / Error-State Strategy

Every write path validates the `sellingPrice`/`sellingUnit` pairing and (for relationship changes) the old-state comparison (§5) *before* constructing its Firestore payload — consistent with this codebase's existing "warn/refuse before write, never fabricate or silently proceed" discipline already used throughout (`resolveUnitAwarePrice`'s `''`-on-no-conversion pattern, `registerCatalogProduct`'s existing pre-write throws).

## V. Test Strategy and Acceptance Verification

New/updated test coverage required (none of the following currently exists, verified by direct search this session unless noted):

- Product creation without stock, without `sellingPrice` (extends existing `product-catalog-phase-1-checkpoint-*` suite).
- Rejection of `sellingPrice` without valid `sellingUnit`, at every write path in §D.
- Valid single-unit relationship acceptance (new — no existing test covers this).
- `sellingPrice`-only edit leaves `unitRelationship` untouched; `sellingUnit`-only reassignment leaves `units[]`/`confirmedAt`/`sellingPrice` untouched.
- Extension preserves all prior units/factors exactly (new).
- Replacement preserving a still-valid `sellingUnit` proceeds without blocking (new).
- Replacement invalidating the current `sellingUnit` is refused until a new one is supplied in the same action (new — directly tests §5's extension).
- No automatic `sellingUnit` selection, no automatic `sellingPrice` clearing (new, negative-case tests).
- `Product.name` correction requires explicit confirmation; Recognition/matching cannot write `name` (extends existing recognition test suites with a new negative assertion).
- `costPrice` remains unreachable from every new write path (extends existing FR-88 coverage pattern).
- `SupplierWordingRelationship` untouched by any new write path (negative assertion).
- Cross-door canonical-state visibility: a correction in one door is the state the next door reads (new, may need a lightweight integration-style test given this repo's existing no-DOM-harness convention — structural/fixture-based, per `add-stock-cost-selling-unit-conflation-bugfix.test.ts`'s own established technique).
- Tenant/authorization: Staff-session write attempt against `products` update is rejected by existing rules, surfaced via the reused error-handling pattern (§6) — verifiable via the existing emulator-based rules test precedent this repo already has for other collections, if such a harness is chosen; not claimed to already exist.
- Regression: `product-catalog-phase-1-checkpoint-b.test.ts`'s superseded assertion updated to match the new `registerCatalogProduct` behavior, not merely deleted.
- `product-catalog-phase-1-checkpoint-c/d/e.test.ts` and every existing Add Stock/Contagem test file referencing the touched functions: full regression sweep required before any checkpoint is considered complete.

**No test is claimed to already exist beyond what was directly verified in this session's searches.**

## W. Migration / Backfill Assessment

**None required, none authorized.** Every existing Product document with a `sellingPrice` and no `unitRelationship` (the now-superseded Phase 1 registration state) remains exactly as it is — `BDR-0012` Decisions 15–16 (historical facts never rewritten) and the Phase 1 reconciliation's own "existing implementation consequences remain a separate downstream matter" both apply unchanged. New validation governs *future* writes only; no existing document is touched, scanned, or backfilled by this Plan. If a business wants to complete a pre-existing product's configuration, that happens the ordinary way — an owner-initiated edit through one of the three doors, going forward — not a migration script.

## X. Rollout / Checkpoint Sequence

**Checkpoint 1 — UnitRelationship old-state-aware extension.** Objective: implement §5's extension to `confirmProductUnitRelationship`. Scope: `AppContext.tsx` only (the one function, additive). Files: `AppContext.tsx`. Tests: new relationship-replacement test suite (§V). Result: function is extended, still has zero UI callers (no behavior change visible anywhere yet). Prohibited: touching `isValidUnitRelationship`/`confirmUnitRelationship`; any UI change.

**Checkpoint 2 — Catálogo creation/edit.** Objective: §H. Scope: `registerCatalogProduct`, `ProductCatalogView.tsx`, `EditProductModal.tsx`. Tests: creation/edit invariant tests, checkpoint-b regression update, **and the two specific `checkpoint-c.test.ts` assertions identified in §C's test-debt note (Implementation Plan Amendment, Accepted 2026-09-09) — no broader edit to `checkpoint-c.test.ts`.** Prohibited: touching Add Stock or Contagem files.

**Checkpoint 3 — Contagem coupling fix.** Objective: §J. Scope: `PeriodicStockCountView.tsx`, `recordStockCount` in `AppContext.tsx`. Tests: existing-product/new-product invariant tests for Contagem. Prohibited: touching Catálogo or Add Stock files.

**Checkpoint 4 — Add Stock correction capability.** Objective: §I, §K. Scope: `AddStockView.tsx`, calling the Checkpoint-1-extended `confirmProductUnitRelationship` and `updateProduct`. Tests: name-confirmation, price/unit correction, authorization-denial-handling tests (§6). Prohibited: touching Catálogo or Contagem files; introducing any `category`/`supplier`/`sku`/`barcode` UI in Add Stock (explicitly excluded, Specification §7).

**Checkpoint 5 — Full regression sweep.** Objective: run every existing test file referencing any touched function across all four checkpoints; confirm zero unrelated regressions. Prohibited: any new functional change.

Each checkpoint requires its own review before the next begins — no checkpoint implies authorization for the next.

## Product Architect Acceptance of Implementation Plan

**Status:** ✅ Accepted (2026-09-09).

> This Implementation Plan is accepted exactly as recorded — its checkpoint structure (§X), scope boundaries (§D–§E), reuse strategy (§G, §5), test strategy (§V), migration assessment (§W), and treatment of both Rule 8 observations (§5, §6) — with no substantive change made by this acceptance. This acceptance approves the Plan as the governing implementation plan for Product Catalog Phase 2. It does not itself authorize source-code implementation, does not create or imply an Implementation Authorization, and does not modify the accepted Phase 2 Specification, Rule 8 Assessment, BDR, Policy Amendment, Decision 1, or Decisions 2A/2B — a separate, signed Implementation Authorization remains a required, subsequent gate.

**Product Architect:** SABUSHIMIKE MASCENI

**Decision:** ACCEPTED

**Date:** 2026-09-09

## Product Architect Acceptance of Implementation Plan Amendment — Checkpoint 2 Regression-Assertion Reconciliation

**Type:** Implementation Plan Amendment — narrowly scoped to a single, mechanical governance-chain conflict discovered during Checkpoint 2 pre-implementation investigation. Not a Specification Amendment, not a Decision, not a BDR, not a Policy — decides no new business rule and reopens no accepted product decision. Amends only this Implementation Plan; does not modify, reinterpret, or reopen the accepted Phase 2 Specification, the Phase 2 BDR, the Selling Price/Unit Policy Amendment, Decision 1, Decisions 2A/2B, `BDR-0012`, `BDR-0013`, `POL-0005`, `POL-0007`, the Rule 8 Assessment, or the Implementation Authorization.

**Status:** ✅ Accepted (2026-09-09).

**Amendment content, in full (the only substantive change this amendment makes to the Plan):**

1. The addition to §C's "Test debt" bullet list (above), identifying `tests/product-catalog-phase-1-checkpoint-c.test.ts` as containing exactly two assertions — "has exactly six input elements inside the registration form" and "does NOT contain UnitRelationship configuration UI" — directly and exclusively contradicted by the already-accepted Phase 2 Specification §6/§10.
2. The corresponding clarification to §X's Checkpoint 2 entry (above), authorizing Checkpoint 2 to update only those two specific assertions as part of its already-authorized test scope.
3. The explicit limitation, stated in both insertions, that no other assertion in `checkpoint-c.test.ts`, and no other legacy checkpoint test file, is authorized for change by this amendment.

> This Implementation Plan Amendment is accepted exactly as proposed — limited strictly to the two insertions in §C and §X, above. This acceptance authorizes no other change to this Implementation Plan, does not itself authorize modification of `tests/product-catalog-phase-1-checkpoint-c.test.ts` (a corresponding Implementation Authorization amendment, adding that file to the existing §5 file-scope list with the identical narrow limitation, remains a separate, required, subsequent gate — not created by this acceptance), does not authorize resumption of Checkpoint 2 implementation, and does not modify the accepted Phase 2 Specification, Rule 8 Assessment, BDR, Policy Amendment, Decision 1, Decisions 2A/2B, or the existing Implementation Authorization in any way.

**Product Architect:** SABUSHIMIKE MASCENI

**Decision:** ACCEPTED

**Date:** 2026-09-09

## Governance Status

**✅ ACCEPTED** (original Plan, 2026-09-09) **— AMENDED ✅ ACCEPTED** (Checkpoint 2 Regression-Assertion Reconciliation, 2026-09-09, see immediately above). This acceptance, and the amendment acceptance above, do not imply or grant implementation authorization. The next gate is **Implementation Authorization** (original scope, already signed) **and a corresponding, separately signed Implementation Authorization Amendment** (for the narrow §5 file-scope addition this Plan amendment now requires) — neither the original Authorization nor an amendment to it is created or modified here.
