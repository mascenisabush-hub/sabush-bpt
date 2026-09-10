# Track A — Existing-Product Stock Entry Purchase Authority — Implementation Authorization

**Type:** Governance bridge document — the formal record that engineering governance is complete and Track A is authorized to begin. Follows the pattern established by [`17-owner-portfolio-addendum-implementation-authorization.md`](./17-owner-portfolio-addendum-implementation-authorization.md) and [`20-phase3-implementation-authorization.md`](./20-phase3-implementation-authorization.md).

**Status:** ✅ **AUTHORIZED FOR IMPLEMENTATION.** Signature complete (§5). Engineering may begin implementation strictly within the scope defined by §2/§3, once this document is recorded (this commit).

**Basis:** [`BDR-0012-product-unit-of-measure-product-memory.md`](../specs/BDR-0012-product-unit-of-measure-product-memory.md) §3 (Approved), [`POL-pending-existing-product-stock-entry-purchase-authority.md`](../specs/POL-pending-existing-product-stock-entry-purchase-authority.md) (Accepted, 2026-09-10), [`decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`](../specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md) ("§45," Accepted) — FR-86 confirmed unaffected, the Track A Rule 8 Assessment (chat-recorded against `HEAD 1772aca`'s code state, unchanged through this commit — result: **READY FOR IMPLEMENTATION PLANNING**), and the Track A Implementation Plan ([`track-a-existing-product-stock-entry-purchase-authority-implementation-plan.md`](./track-a-existing-product-stock-entry-purchase-authority-implementation-plan.md), committed `2771b2f`).

**Repository state at drafting:** `main` @ `2771b2f`, working tree clean before this record was added. Nothing in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or any existing `docs/specs/*`/`docs/engineering/*` file was modified to produce this document.

**Note on the Implementation Plan artifact:** a further, more detailed 15-section elaboration of the committed Implementation Plan (Objective / Governance Authority / Current Defects / Exact Files-Functions / Exact Logic Changes / Protected Logic / OCR Correction Handling / Product.costPrice Handling / Selling-Side Protection / Test Changes / Regression Risks / Acceptance Criteria / Implementation Order / Verification Commands / Rollback) was produced in the same session, in-conversation, but was not itself committed as a repository file, per that step's own explicit instruction not to write to the repository. This Authorization treats the committed Implementation Plan (`2771b2f`) as the governance-chain artifact of record; the uncommitted elaboration is consistent with it, refines it, and introduces no scope not already present in the committed version's five identified files/functions and six phases. Flagged here rather than silently assumed.

---

## 1. Governance Completeness — What This Record Confirms

**BDR Approved → Policy Accepted → Rule 8 Assessed → Implementation Plan → Authorization (this document) → Implementation → Verification → Close-out**

| Stage | Document | Status |
|---|---|---|
| Business Decision Record | `BDR-0012-product-unit-of-measure-product-memory.md` §3 | ✅ Approved (pre-existing) |
| Policy | `POL-pending-existing-product-stock-entry-purchase-authority.md` | ✅ Accepted (2026-09-10) |
| Rule 8 Assessment | (chat-recorded, this session) | ✅ Assessed — `READY FOR IMPLEMENTATION PLANNING` |
| Implementation Plan | `track-a-existing-product-stock-entry-purchase-authority-implementation-plan.md` | ✅ Planned (`2771b2f`) |
| Authorization | This document | ✅ **AUTHORIZED** |

No new product behavior is invented by this authorization — it authorizes implementation of behavior already fixed by the Policy and Rule 8 Assessment above.

## 2. What Is Authorized

**Product rule (existing Product only):** current purchase/receipt is authoritative for purchase quantity, purchase unit, and purchase cost. Historical Product/Stock memory (StockBatch history, StockCount history, `Product.costPrice`, any remembered purchase-unit/cost value) must not automatically populate or overwrite those active purchase-side values.

**OCR boundary:** OCR remains an allowed initial input mechanism for purchase quantity/unit/cost; all OCR values remain fully editable; operator correction is authoritative. The system must not silently recalculate an unconfirmed OCR purchase cost merely because the operator changes the purchase unit (worked example: OCR `2 Un @ 1,000 MZN/Un` → operator changes unit to `Cx` → cost remains `1,000` until the operator explicitly enters `1,200`; saved purchase is `2 Cx @ 1,200 MZN/Cx`, never a silently-converted `24,000`).

**Selling-side authority (unchanged, explicitly preserved):** the existing Product's canonical selling configuration — UnitRelationship, selling unit, selling price — remains authoritative and separate from purchase-side facts (worked example: `1 Cx = 24 Un`, selling unit `Un`, selling price `65 MZN/Un`, current purchase `2 Cx @ 1,200 MZN/Cx` → selling quantity `48 Un`, selling value `3,120 MZN`).

**`Product.costPrice`:** not deleted. FR-86 forward maintenance (current purchase cost → `Product.costPrice`) remains authorized and untouched. The reverse direction (`Product.costPrice` → current purchase field, as an active-entry default) is prohibited and is the one consumption path authorized for removal.

**Authorized application scope — `apps/tenant/src/components/AddStockView.tsx` only:**
1. `buildProductMemoryAutofill`
2. Existing-product row creation/autofill
3. `handleConfirmSupplierWordingCandidate`
4. `buildRowFromProposalLineItem`
5. `handleUnitChange`

**Authorized required code changes, per site:**
- **A — Purchase Unit:** remove historical-memory defaulting (`findLatestRememberedProductMemory.unit`, historical StockBatch unit) from the active purchase-unit field; the existing generic unit fallback may remain; OCR-provided unit stays valid and editable.
- **B — Purchase Cost:** remove historical purchase-cost defaulting (remembered historical cost, `Product.costPrice`) from the active cost field; OCR cost input, manual cost entry, StockBatch cost persistence, and FR-86 maintenance are not removed.
- **C — Supplier-Wording Confirmation:** remove the historical-cost fallback that fires when OCR leaves cost blank at this confirmation step; do not alter wording recognition itself or canonical selling-price resolution in this flow.
- **D — OCR Proposal Construction:** when OCR supplies no unit, do not fall back to historical StockBatch unit; when OCR supplies no cost, do not fall back to historical memory or `Product.costPrice`; the selling-price side stays intact.
- **E — Unit Change / OCR Cost:** remove the purchase-cost re-derivation branch from `handleUnitChange`; do not remove the legitimate selling-price recalculation branch; `costPriceAutoFilled` may remain if still used elsewhere — no new origin-tracking data model unless implementation proves it necessary.

**Test changes:** authorized only in the previously identified relevant test files (`tests/product-memory-price-resolution.test.ts`, `tests/add-stock-cost-selling-unit-conflation-bugfix.test.ts`), updated only where an existing assertion contradicts the accepted Track A policy, plus the minimum new regression coverage listed in the Implementation Plan (§10 there) — purchase-unit authority, purchase-cost authority, the exact OCR-unit-correction scenario, selling-configuration protection, and FR-86 direction-independence.

## 3. What Is Not Authorized

- `apps/tenant/src/lib/purchaseToSellingConversion.ts` — no change.
- The implementation of `findLatestRememberedProductMemory` or `resolveCanonicalProductSellingMemory` (`productMemoryPriceResolution.ts`) — only their purchase-side *consumption* at the five authorized sites may be removed; the functions themselves are not modified.
- `apps/tenant/src/context/AppContext.tsx` — `addMultipleStockBatches`, `StockBatch.unit`/`costPrice` persistence, and the FR-86 `Product.costPrice` forward-maintenance mechanism are not modified.
- `StockCountItem`, `costBasisEstablished`, Contagem UI, Contagem persistence — not modified.
- Business Worth formulas, Reports, Closings, Catalog, Product Recognition, SupplierWordingRelationship recognition logic, existing selling-price behavior — not modified, unless a concrete compile/runtime dependency makes a minimal correction unavoidable, in which case implementation must **STOP and report the dependency and its governance impact** before proceeding, rather than silently expanding scope.
- No redesign of `getRememberedPriceForRow`/the historical price-deviation warning mechanism — it may remain exactly as it is, confirmed already conforming (Track A §G).
- New Product / first-time Product creation in Add Stock, and its own unresolved FR-85 question — out of scope, not touched, not reopened by this authorization.
- No accepted governance document — `BDR-0012`, the Track A Policy, or the §45 amendment — may be altered during implementation. Any apparent need to do so requires stopping and returning to governance, not a silent workaround.

## 4. Scope Discipline

- Implementation Order (informational, matches the Implementation Plan §13): (1) `buildProductMemoryAutofill` + row-creation site → (2) `handleConfirmSupplierWordingCandidate` + `buildRowFromProposalLineItem`'s cost fallback → (3) `buildRowFromProposalLineItem`'s OCR-silence unit fallback → (4) `handleUnitChange`'s cost-conversion branch, sequenced after 1-3 so its safety reasoning is accurate at the moment it lands → (5) test updates/additions → (6) `npx tsc --noEmit -p .`, `npm run test:all`, `npm run build`, `git diff` reviewed strictly against §2's authorized file list, then the twelve acceptance checks below.
- If an unexpected dependency outside §2's scope appears during implementation, STOP and report it — do not silently expand scope.
- No business rule may be changed during implementation.
- No governance document (Policy, Rule 8 Assessment, Implementation Plan, this Authorization) may be modified during implementation unless separately, explicitly authorized.

**Acceptance criteria (twelve, unmodified from the authorization decision):**

1. Existing Product historical purchase unit does not populate the active purchase unit.
2. Existing Product historical purchase cost does not populate the active purchase cost.
3. `Product.costPrice` remains maintained by FR-86.
4. `Product.costPrice` is not used as an active current-purchase default.
5. OCR remains capable of initially supplying purchase quantity/unit/cost.
6. OCR-derived values remain editable.
7. Changing an OCR unit does not silently recalculate an unconfirmed OCR cost.
8. Operator-entered purchase values are authoritative.
9. Existing canonical selling configuration remains intact.
10. `1 Cx = 24 Un` with selling price `65 MZN/Un` still converts `2 Cx` to `48 Un` and `3,120 MZN`.
11. StockBatch persistence continues to save the actual current purchase unit and cost.
12. No unrelated module or business formula is changed.

**Implementation of the runtime files listed in §2 begins only once this document's signature (§5) is complete — it is, as of this commit.**

## 5. Signature

**Product Architect:** SABUSHIMIKE MASCENI
**Authorization:** APPROVED FOR IMPLEMENTATION
**Scope:** Track A — Existing-Product Stock Entry Purchase Authority
**Governance status:** Rule 8 PASSED — Implementation Authorized
**Date:** 2026-09-10
**Restriction:** No redesign, no governance reopening, no unrelated refactoring.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or change any `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `docs/specs/*`, or other `docs/engineering/*` file. None were touched to produce it.
- This record does not modify the Track A Policy, `BDR-0012`, the §45 amendment, the Rule 8 Assessment, or the committed Implementation Plan — it sits downstream of all of them, authorizing based on their settled content, not amending it.
- This record preserves the distinction between the authorization *decision* (made in this session, 2026-09-10) and this document as its *repository record*, the same distinction this repository's other Implementation Authorization records maintain.
- This record does not pre-authorize New Product / first-time Product creation in Add Stock, or the FR-85 question that carries — that remains its own, separate, not-yet-authorized track.
- The uncommitted, more detailed 15-section Implementation Plan elaboration produced earlier in this session is not itself a governance artifact of record; see the header note above.

**Lifecycle:** BDR Approved → Policy Accepted → Rule 8 Assessed (Ready) → Implementation Planned → **Authorized** (2026-09-10, signed). Not yet Implemented, not yet Verified, not yet Closed. Engineering work under this document begins only once this commit lands, strictly within §2/§3's boundary.
