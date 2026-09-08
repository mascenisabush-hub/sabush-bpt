Implementation Authorization

# Implementation Authorization — Owner Product Catalog (Phase 1)

**Type:** Governance bridge document — the formal record that engineering governance is complete and implementation is authorized to begin, per this signature, strictly within the scope defined below. Does not itself perform implementation and does not modify code, `firestore.rules`, schema, UI, or tests.

## 1. Authorization Status

**✅ IMPLEMENTATION AUTHORIZED — WITHIN DEFINED SCOPE.** Signed 2026-09-08 by SABUSHIMIKE MASCENI, Product Architect. See §8 for the signed acceptance record. Authorization is valid only for the exact scope defined in §3 of this document; anything outside that scope remains unauthorized and requires the appropriate governance process (a new or amended Decision, Rule 8 Assessment, Implementation Plan, and Implementation Authorization, as applicable) before any code implementing it may be written.

**Repository state at drafting:** `main = origin/main = c025903dd4d60626947be4f24ec2da9039e84c59`, working tree otherwise clean apart from the not-yet-committed Implementation Plan itself, confirmed via `git fetch` immediately before this document was drafted. Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `package.json`, or `tests/` to produce this document.

**No duplicate:** a repository-wide search for existing Product Catalog Phase 1 Implementation Authorization artifacts (`find docs -iname "*product-catalog*authoriz*"`) returns nothing prior to this document.

## 2. Governance Basis

[Decision Proposal](./product-catalog-phase-1-decision-proposal.md) (✅ Accepted, SABUSHIMIKE MASCENI, 2026-09-08) → [Product Architect Acceptance](./product-catalog-phase-1-product-architect-acceptance.md) (✅ ACCEPTED AS PROPOSED, commit `6d20262`) → [Rule 8 Assessment](./product-catalog-phase-1-rule8-assessment.md) (✅ READY FOR IMPLEMENTATION PLANNING, commit `c025903`) → [Implementation Plan](./product-catalog-phase-1-implementation-plan.md) (drafted this session; committed alongside this Authorization, §10) → **THIS Implementation Authorization** → *(next, once signed: implementation — not performed by this document)*.

**Governing chain for the underlying product requirement:** Decisions 1–9 of the Decision Proposal (dedicated Catalog surface; reuse of `Product`; registration fields; identity-only registration; recognition reuse; UnitRelationship/Merge/Never-Stocked-UI exclusions; Product Memory unchanged) → this Authorization (implements exactly that requirement, nothing more).

**Precedent note:** this document's structure follows [`periodic-contagem-interruption-persistence-decision-58-implementation-authorization.md`](./periodic-contagem-interruption-persistence-decision-58-implementation-authorization.md), the closest, most directly comparable repository precedent for a governance-bridge authorization document, adapted to Product Catalog Phase 1's own scope.

## 3. Authorized Implementation

### 3.1 Scope (restated from Decision Proposal §5 / Implementation Plan §1, unmodified)

A. Dedicated Owner-only Product Catalog surface.
B. Reuse of the existing `Product` entity as canonical identity — no `CatalogProduct` entity.
C. Registration fields: required `name`, `sellingPrice`; optional `category`, `supplier`, `sku`, `barcode`; **excluded `costPrice`**.
D. Catalog registration is identity-only — no `StockBatch`, no `StockCount`, no physical stock, no Business Worth contribution.
E. Existing Product Identity Existing/New Resolution remains authoritative, unmodified.
F. A new, Catalog-hosted resolution UI, reusing only the existing pure recognition logic (`findSimilarProducts`) — never a second recognition rule.
G. UnitRelationship configuration — out of scope.
H. Product Merge — out of scope.
I. Never-Stocked vs. Out-of-Stock visible UI — out of scope.
J. Product Memory — unchanged.

### 3.2 Authorized Checkpoints (verbatim from the Implementation Plan §13 — not renamed, expanded, or reduced)

**Checkpoint A — Catalog surface/navigation.**
Files: `navigationTabs.ts`, `App.tsx`, i18n locales.
Behavior: an empty Catalog screen (list only, no data yet) is reachable by Owner, unreachable by Staff.
Tests: nav-gating test (mirrors existing `stocks`/`dashboard` pattern).
Invariant protected: Owner-only access.
Stop condition: screen renders, gated correctly, before any write logic exists.

**Checkpoint B — Product registration write path.**
Files: `AppContext.tsx` (`registerCatalogProduct`).
Behavior: function exists, is exposed via context, is not yet wired to any UI.
Tests: structural assertion — no `costPrice` in payload; no `batches`/`stockCounts` reference.
Invariant protected: cost-price boundary; zero Business Worth impact.
Stop condition: function verified safe in isolation before any UI calls it.

**Checkpoint C — Registration form + validation.**
Files: `ProductCatalogView.tsx`.
Behavior: form renders the six fields, validates required fields, does **not** yet call `registerCatalogProduct` (submission is a no-op or logs only).
Tests: validation assertions.
Invariant protected: `costPrice` never rendered; UnitRelationship never rendered.
Stop condition: form is fully validated and visually correct before it can write anything.

**Checkpoint D — Identity resolution.**
Files: `ProductCatalogView.tsx` (new resolution sub-UI), importing `findSimilarProducts`.
Behavior: submitting the form now runs recognition first; only a confirmed-new path reaches `registerCatalogProduct`.
Tests: identity-protection assertions.
Invariant protected: no silent duplicate creation.
Stop condition: a near-duplicate name cannot reach creation without explicit Owner confirmation, verified by test before proceeding.

**Checkpoint E — Catalog list/edit behavior.**
Files: `ProductCatalogView.tsx` (list/search, `EditProductModal` wiring).
Behavior: registered products appear in the list; search/filter works; "Edit" opens the existing, unmodified `EditProductModal`.
Tests: list/search assertions; confirm `EditProductModal` itself is untouched (diff-based regression guard).
Invariant protected: no duplicate UI/logic for editing.
Stop condition: full create → list → edit loop works end-to-end.

**Checkpoint F — Regression/integration verification.**
Files: none (verification only).
Behavior: full sweep of every test file touching `AddStockView`, `PeriodicStockCountView`, `DashboardView`, `EditProductModal`, and the Product Identity Existing/New Resolution suite.
Tests: the full existing suites for all of the above, run unmodified.
Invariant protected: no regression anywhere outside the Catalog's own new files.
Stop condition: 100% of pre-existing, previously-passing tests in these areas still pass; any pre-existing unrelated failure individually confirmed via `git stash` comparison, never silently absorbed into this scope.

### 3.3 Authorized File Scope (verbatim from the Implementation Plan §12)

| File | Create/Modify | Purpose |
|---|---|---|
| `apps/tenant/src/components/ProductCatalogView.tsx` | **Create** | The Catalog screen itself |
| `apps/tenant/src/context/AppContext.tsx` | **Modify** | Add `registerCatalogProduct` + expose via context |
| `apps/tenant/src/data/navigationTabs.ts` | **Modify** | Add `'catalog'` tab |
| `apps/tenant/src/App.tsx` | **Modify** | Mount `ProductCatalogView` behind `!isStaff && activeTab === 'catalog'` |
| `apps/tenant/src/i18n/locales/{pt,en,fr}.ts` | **Modify** | Add Catalog nav/UI strings |
| `tests/product-catalog-phase-1.test.ts` (exact name at implementation time) | **Create** | The Implementation Plan's own test matrix |

**No file outside this table may be modified without stopping and reporting per §6/§8 of this document.** This is not a suggestion — it is the exact boundary of what this signature authorizes.

**Files that MUST NOT change (verbatim from the Implementation Plan §12):** `apps/tenant/src/utils/calculations.ts` (Business Worth); `apps/tenant/src/components/PeriodicStockCountView.tsx` and its own Contagem calculation logic; `apps/tenant/src/lib/productMemoryPriceResolution.ts` (Product Memory); any file implementing or scaffolding Merge (none exists — must stay that way); anything touching `UnitRelationship` governance (`confirmProductUnitRelationship`, `unitRelationship.ts`); `firestore.rules` (confirmed sufficient as-is by the Rule 8 Assessment — no change proven necessary); `apps/tenant/src/components/EditProductModal.tsx` (reused **unmodified** — not authorized to change).

## 4. Tests / Verification

At minimum, matching the Implementation Plan §11 test matrix and this task's own §6:

- **Catalog surface:** Owner can access; Staff cannot; existing navigation behavior for every other tab remains intact.
- **Product registration:** `name` required; `sellingPrice` required; optional metadata saves correctly; no `costPrice` input exists anywhere in the rendered form; `registerCatalogProduct`'s own payload contains no `costPrice` key, under any input (structural assertion against the function's own source).
- **Stock separation:** registration creates exactly one `Product` document; zero `StockBatch`; zero `StockCount`; zero physical stock; zero Business Worth impact (behavioral assertion against `calculateInventoryTotals`'s actual output, not merely a structural claim).
- **Identity safety:** existing candidates surfaced where relevant; explicit Existing-Product resolution reuses the canonical `Product` (no new document created); unresolved identity cannot silently create a Product; explicit New-Product confirmation creates exactly one new `Product`.
- **Later compatibility:** a Catalog-created Product's `sellingPrice` autofills correctly on its first selection in Add Stock; same for Contagem; Product Memory behavior remains governed entirely by existing, unmodified functions.
- **Tenant isolation:** every Catalog read/write scoped to `businesses/{activeBusinessId}/products`; no cross-business access path introduced.
- **Regression:** existing Add Stock identity-resolution tests pass unmodified; existing Contagem identity-resolution tests pass unmodified; existing Product-editing tests (if any) pass unmodified; a full, fresh `npm run lint:tenant` (`tsc --noEmit`) and the full relevant test sweep both required before Checkpoint F is considered complete.

## 5. Safety / Invariants

Restated from the Rule 8 Assessment, unmodified by this Authorization, and binding on the implementation:

1. **Zero Business Worth impact** is structural — `calculateInventoryTotals` must never be modified to special-case Catalog products; it must simply continue never reading `products` at all.
2. **Cost-price exclusion** is enforced by the registration function's own payload never containing the key — not by hiding a form field that is still technically submitted, and not by adding a new field-level guard to `updateProduct` (no evidence found that one is needed).
3. **No silent duplicate creation** — Requirement 1 of the Product Identity Existing/New Resolution Authorization applies to the Catalog exactly as it already applies to Add Stock and Contagem, without exception.
4. **Tenant isolation** is inherited automatically from the existing `businesses/{businessId}/products` path structure and `isMemberOf`/`isOwnerOf` rule functions — no new isolation mechanism is authorized or required.
5. **Owner-only access** reuses the existing `!isStaff` client-side gate pattern exactly — no new role, no new permission tier, and the existing Staff-usable Add Stock product-creation path must remain completely untouched by this work.

## 6. Explicit Exclusions

This signature does **not** authorize, under any circumstance: Product Merge; merge aliases/redirects; metadata merge conflict resolution; UnitRelationship configuration UI; Never-Stocked/Out-of-Stock visible UI; Product Memory redesign; Business Worth formula changes; Contagem calculation changes; purchase-cost governance changes; a new Product identity model; a new `CatalogProduct` entity; a second recognition algorithm; silent automatic identity decisions of any kind; any unrelated UI redesign.

**Change control:** if implementation discovers a requirement outside this authorized scope, the correct response is to **stop** — report the discovered requirement, why it is necessary, which authorized boundary it affects, and the smallest proposed governance/plan amendment. No scope expansion may occur without a separate Product Architect review, regardless of how small or reasonable the expansion may seem in the moment.

## 7. Completion Criteria

Implementation of this Authorization's scope is complete **only when all of the following are simultaneously true** — no partial subset constitutes completion:

1. All six checkpoints in §3.2 are implemented exactly as scoped, in order, each passing its own stated tests before the next begins.
2. `registerCatalogProduct` never includes `costPrice` in its own payload, and never references `batches`/`stockCounts`, verified by the structural tests in §4, not merely asserted.
3. No file outside §3.3's table is modified — including, explicitly, `firestore.rules`, `calculations.ts`, `PeriodicStockCountView.tsx`'s own calculation logic, `productMemoryPriceResolution.ts`, and `EditProductModal.tsx`.
4. Every test named in §4 exists (where new) or is re-run (where existing) and passes — including a full, fresh `npm run lint:tenant` and the complete relevant test sweep, with any pre-existing unrelated failure individually confirmed via `git stash` comparison, exactly as every prior checkpoint this session has already practiced.
5. The safety/invariant checks in §5 are specifically, freshly re-verified against the actual implemented code, not assumed from this document.
6. Nothing above is asserted as already true by this document — these are the conditions a future implementation session must satisfy and report against; none is satisfied as of this Authorization's own signing.

**This document does not claim any of the above is already implemented, verified, or complete.**

## 8. Acceptance

**✅ ACCEPTED AND SIGNED.** Implementation may now begin, strictly within the exact scope defined in §3, subject to §4's verification requirements, §5's safety/invariants, §6's explicit exclusions, and §7's completion criteria — all unchanged by this signature.

> I accept this Implementation Authorization and authorize implementation within the exact scope defined above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-08

**Decision:** AUTHORIZED FOR IMPLEMENTATION

**IMPLEMENTATION AUTHORIZED — WITHIN DEFINED SCOPE.** Anything outside the exact scope §3 defines — including, without limitation, every item named in §6's Explicit Exclusions — remains unauthorized and requires its own governance process (Decision, Rule 8 Assessment, Implementation Plan, and Implementation Authorization, as applicable) before any code implementing it may be written.

---

IMPLEMENTATION AUTHORIZATION STATUS:
- Decision Proposal: ACCEPTED
- Rule 8 Decision 60: READY
- Implementation Plan: APPROVED FOR AUTHORIZATION
- Implementation Authorization: SIGNED / AUTHORIZED
- Implementation: AUTHORIZED
- Code changes: NONE
- Test changes: NONE
- Scope changes: NONE
