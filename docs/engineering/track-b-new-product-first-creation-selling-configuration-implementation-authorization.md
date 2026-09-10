# Track B — New-Product First-Creation Selling Configuration — Implementation Authorization

**Type:** Governance bridge document — the formal record that engineering governance is complete and Track B is authorized to begin. Follows the pattern established by [`track-a-existing-product-stock-entry-purchase-authority-implementation-authorization.md`](./track-a-existing-product-stock-entry-purchase-authority-implementation-authorization.md), [`17-owner-portfolio-addendum-implementation-authorization.md`](./17-owner-portfolio-addendum-implementation-authorization.md), and [`20-phase3-implementation-authorization.md`](./20-phase3-implementation-authorization.md).

**Status:** ✅ **IMPLEMENTATION AUTHORIZED.** Signature complete (§ Signature, below). Engineering may begin implementation strictly within the scope defined by §"Authorized Files"/§"Protected Surfaces," once this document is recorded (this commit).

**Basis:** [`new-product-first-creation-selling-configuration-amendment.md`](../specs/new-product-first-creation-selling-configuration-amendment.md) ("§47," Accepted and Signed, 2026-09-10 — FR-95 through FR-99), [`decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`](../specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md) ("§45," Accepted 30 August 2026 — FR-81/83/85/86, unedited, unaffected outside §47's named exception), [`product-catalog-phase-2-bdr.md`](../specs/product-catalog-phase-2-bdr.md) (Accepted 2026-09-09 — §4 item 4, §9), [`POL-pending-selling-price-unit-invariant-amendment.md`](../specs/POL-pending-selling-price-unit-invariant-amendment.md) (the pairing invariant), [`BDR-0012-product-unit-of-measure-product-memory.md`](../specs/BDR-0012-product-unit-of-measure-product-memory.md) §3 (Approved), and [`POL-pending-existing-product-stock-entry-purchase-authority.md`](../specs/POL-pending-existing-product-stock-entry-purchase-authority.md) ("Track A," Accepted, protected and unaffected).

**Repository state at drafting:** `main` @ `2175361`, working tree clean before this record was added. Track A's own implementation remains at `f3f891d`, verified unmodified by this document. Nothing in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or any existing `docs/specs/*`/`docs/engineering/*` file was modified to produce this document.

---

## 1. Governance Completeness — What This Record Confirms

**Product Decision Accepted → §47 Governance Amendment Accepted & Signed → Rule 8 Assessed → Implementation Planned → Authorization (this document) → Implementation → Verification → Close-out**

| Stage | Document | Status |
|---|---|---|
| Product Architect product decision | (recorded within §47's own drafting chain) | ✅ Accepted (prior to this session) |
| Governance amendment | `new-product-first-creation-selling-configuration-amendment.md` ("§47") | ✅ Accepted and Signed, 2026-09-10 |
| Rule 8 Assessment | (chat-recorded, this session, against `HEAD 2175361`) | ✅ Assessed — `READY FOR IMPLEMENTATION PLANNING` |
| Implementation Plan | (chat-recorded, this session) | ✅ Planned — `READY FOR IMPLEMENTATION AUTHORIZATION` |
| Authorization | This document | ✅ **AUTHORIZED** |

**Note on artifact persistence:** the Rule 8 Assessment and Implementation Plan referenced above were produced in-conversation, under explicit instructions not to write repository files at those stages. This Authorization is based on their settled content exactly as delivered; it does not restate them in full, and their absence as separate committed files does not weaken this Authorization's own basis — the governance chain (§47, §45, Phase 2 BDR, the pairing invariant, `BDR-0012`, Track A) that both the Assessment and the Plan were themselves grounded in is fully documented and unmodified.

No new product behavior is invented by this authorization — it authorizes implementation of behavior already fixed by §47.

## 2. Already-Decided Product Behavior (Not Reopened)

When Add Stock creates a genuinely new Product for the first time, that same Stock Entry may establish the Product's initial canonical selling configuration — complete UnitRelationship, selling/reference unit, and selling price denominated in that selling unit — and that configuration must be usable within the same Stock Entry's calculation before its result is finalized/persisted, and must persist canonically so the next purchase recognizes the Product as existing and retrieves its selling configuration. Worked example: `2 Cx @ 1,200 MZN/Cx`, `1 Cx = 24 Un`, `65 MZN/Un` → `48 Un` / `3,120 MZN`. After creation, the Product is an ordinary existing Product, governed thereafter by Track A (purchase side) and existing selling-configuration authorities (selling side).

## 3. Immediate-Use Interpretation (Resolved, Conservative Reading)

FR-99 requires that the newly established selling configuration be available to the same Stock Entry's calculation path **before the transaction's result is finalized/persisted** — it does not require a continuously updating live UI preview as an additional feature. A live preview is not authorized or required by this document merely to satisfy FR-99; it may be included only if it falls naturally out of the existing UI architecture already in place, not introduced as new scope.

## 4. Purchase/Selling Separation (Reaffirmed)

Purchase facts (quantity, unit, cost) remain current-receipt/operator facts, governed by Track A, untouched by this authorization. Initial selling configuration (UnitRelationship, selling unit, selling price per selling unit) are independently established facts. No implementation step authorized by this document may derive selling price from purchase cost, purchase cost from selling price, purchase unit from selling unit, selling unit from purchase cost, or current purchase cost from historical Product Memory. Track A's implementation (`f3f891d`) remains untouched.

## 5. Authorized Files

**Production — authorized for change, and only these:**
1. `apps/tenant/src/components/AddStockView.tsx`
2. `apps/tenant/src/context/AppContext.tsx`

**Test — authorized to create:**
- `tests/track-b-new-product-selling-configuration.test.ts` (new, dedicated suite)
- Existing tests may be updated **only** where required to preserve intentional behavior expectations caused directly by this authorized implementation (mirroring Track A's own precedent of updating assertions that encoded now-superseded behavior) — no unrelated test may be altered.

**If implementation discovers that a third production file is genuinely unavoidable, the engineer must STOP before changing it and request a governance/scope review — this authorization does not extend automatically.**

## 6. Required Implementation Mechanism Boundary

**`AddStockView.tsx`:** introduce the smallest distinct data representation necessary for "canonical selling price per selling unit," kept distinct from the row's existing transaction `sellingPrice` and purchase `costPrice` fields. Extend the existing new-product configuration UI (`UnitRelationshipRow` or its immediate surroundings) minimally — no redesign of Add Stock.

**`AppContext.tsx`,** for the genuinely-new-Product branch only: carry the new canonical selling-price value; validate the complete UnitRelationship; conditionally persist `Product.sellingPrice`, reusing the already-shipped Contagem FR-81 pairing-invariant guard pattern (`recordStockCount`'s `newProdSellingUnitValid`-equivalent check) rather than inventing a new one; ensure the newly established configuration is available to the existing valuation path (`buildDerivedSellingValuationSnapshot`) during that same Stock Entry, by supplying it as a synthesized input for the new-product case — not by modifying the calculation engine itself.

## 7. Protected Surfaces

The following are **not authorized for modification** under this document:

- `apps/tenant/src/lib/purchaseToSellingConversion.ts` — `resolveUnitAwarePrice`, `getConversionFactor`, `calculateBatch`, and related conversion logic, confirmed mathematically correct by Rule 8; the defect is caller/context-scoped, not engine-scoped. **If implementation discovers that a modification here is genuinely unavoidable, STOP and report the conflict rather than silently expanding scope.**
- Track A's implementation (`f3f891d`) — all five of its authorized functions, `handleUnitChange`'s Track A behavior, and existing-Product purchase authority generally.
- Product Recognition and Supplier Wording Recognition logic.
- Contagem (`recordStockCount`'s own new-product branch is a **reference pattern only**, never itself modified).
- Product Catalog.
- Business Worth formulas (`calculateBatch`, `calculateInventoryTotals`, and related aggregation).
- Existing Product Memory resolution (`findLatestRememberedProductMemory`, `resolveCanonicalProductSellingMemory`) — their own implementations are not modified; only their *consumption* at the new-product code path, where applicable, may change.
- `firestore.rules` — Rule 8 confirmed the existing `/products/{productId}` create rule already sufficient (validates only `name`; its own comment already anticipates additional conditionally-spread fields). No change is authorized unless implementation proves this insufficient, in which case: STOP and report before changing it.
- §45, §47, `BDR-0012`, the Product Catalog Phase 2 BDR, the pairing-invariant Policy, and Track A's own governance artifact — none may be modified during implementation.
- Any unrelated module not named in §5.

## 8. Atomicity / Consistency Requirement

The existing architecture writes the new `Product` document and its first `StockBatch` document within the same Firestore batched write (`fsBatch`) — this atomicity must be preserved, not reintroduced or redesigned. The canonical new-product selling configuration persisted onto `Product.sellingPrice` and the same Stock Entry's selling-side calculation (feeding `StockBatch.sellingPrice`/`derivedSellingValuation`) must originate from the **same** authoritative new-product configuration the operator entered in this transaction — never two independently-derived figures that could diverge. No duplicate source of truth for this one value may be introduced.

## 9. Acceptance Criteria

| # | Criterion |
|---|---|
| AC-01 | Only a genuinely new Product's first-creation flow may use FR-95's authority. |
| AC-02 | The new Product's canonical name is persisted. |
| AC-03 | The complete UnitRelationship is established and persisted. |
| AC-04 | The selling/reference unit is explicit and unambiguous. |
| AC-05 | The initial canonical selling price is explicitly denominated in the selling unit (`65 MZN/Un` is never interpreted as `65 MZN/Cx`). |
| AC-06 | Purchase cost and initial selling price remain independent facts. |
| AC-07 | The new configuration is available to the same Stock Entry's calculation before its result is finalized/persisted. |
| AC-08 | Worked example produces `48 Un` / `3,120 MZN` from `2 Cx`, `1 Cx = 24 Un`, `65 MZN/Un`. |
| AC-09 | `Product.sellingPrice` is persisted only together with a valid, required selling UnitRelationship. |
| AC-10 | A subsequent purchase recognizes the Product as existing and retrieves its canonical selling configuration. |
| AC-11 | Existing Products retain their current governed selling configuration; Add Stock does not become a general selling-price editing surface. |
| AC-12 | Track A purchase-side behavior remains unchanged. |
| AC-13 | Existing conversion mathematics remain unchanged. |
| AC-14 | Product and StockBatch writes remain scoped to the correct business/shop. |
| AC-15 | Product and first-StockBatch persistence retain the existing atomic write behavior. |
| AC-16 | No unrelated refactoring or product redesign is included. |

## 10. Validation Requirements

After implementation, the engineer must validate, at minimum: the new focused Track B test suite; the relevant existing Add Stock tests; Track A's own regression suite (`tests/track-a-existing-product-purchase-authority.test.ts` and the four files it touches); the aggregate test suite (`npm run test:all`); `npx tsc --noEmit -p apps/tenant`; and `npm run build` — following this repository's existing validation conventions exactly as Track A's own implementation did. This authorization does not itself execute any of these validations.

## 11. Governance Traceability

| Requirement | Governing basis |
|---|---|
| New-product first-creation authority | FR-95 |
| Existing-product exclusion | FR-96 |
| Purchase/selling independence | FR-97 |
| Selling-price/selling-unit pairing | FR-98 |
| Immediate same-entry use | FR-99 |
| Existing selling configuration protection | FR-83 / FR-85 |
| Contagem precedent (pattern reuse only) | FR-81 |
| Purchase cost maintenance | FR-86 |
| Track A purchase authority | Track A policy |
| Product Memory separation | `BDR-0012` |
| Selling-price/unit invariant | Product Catalog Phase 2 §9 |

## 12. Scope Discipline

- No business rule may be changed during implementation.
- No governance document (§45, §47, the Phase 2 BDR, the pairing-invariant Policy, `BDR-0012`, Track A's own policy, this Authorization) may be modified during implementation unless separately, explicitly authorized.
- If an unexpected dependency outside §5's scope appears, STOP and report it — do not silently expand scope.
- Implementation begins only once this document's signature (§ Signature, below) is complete — it is, as of this commit.

## Signature

**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 2026-09-10
**Decision:** IMPLEMENTATION AUTHORIZED
**Scope:** Track B — New-Product First-Creation Selling Configuration
**Governance status:** §47 Accepted and Signed → Rule 8 READY FOR IMPLEMENTATION PLANNING → Implementation Plan READY FOR IMPLEMENTATION AUTHORIZATION → **Authorized**
**Restriction:** No redesign, no governance reopening, no unrelated refactoring — scope strictly as defined in §5/§6/§7 above.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or change any `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `docs/specs/*`, or other `docs/engineering/*` file. None were touched to produce it.
- This record does not modify §45, §47, the Product Catalog Phase 2 BDR, `BDR-0012`, the pairing-invariant Policy, or Track A's own accepted policy/implementation — it sits downstream of all of them, authorizing based on their settled content, not amending it.
- This record does not pre-authorize any future extension of Track B functionality — any such extension requires its own governance record.

**Lifecycle:** §47 Accepted → Rule 8 Assessed (Ready) → Implementation Planned (Ready) → **Authorized** (2026-09-10, signed). Not yet Implemented, not yet Verified, not yet Closed. Engineering work under this document begins only once this commit lands, strictly within the boundary above.
