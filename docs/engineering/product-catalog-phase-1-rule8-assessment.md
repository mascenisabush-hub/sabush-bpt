Rule 8 Assessment — FINAL

# Rule 8 Assessment — Owner Product Catalog, Phase 1

**STATUS:** ✅ **FINAL — RULE 8 ASSESSMENT COMPLETE.** This document does not authorize implementation. A separate Implementation Plan and a signed Implementation Authorization remain required, subsequent gates.

**Governing chain:**
[Decision Proposal](./product-catalog-phase-1-decision-proposal.md) → [Product Architect Acceptance](./product-catalog-phase-1-product-architect-acceptance.md) (✅ **ACCEPTED AS PROPOSED**, SABUSHIMIKE MASCENI, 2026-09-08, all nine decisions individually signed) → **this Rule 8 Assessment** → *(next: Implementation Planning, only if this assessment's verdict permits)*.

**Repository state investigated:** `main @ 6d20262` (the commit that recorded the Decision Proposal and its Acceptance), working tree clean, verified via `git fetch` immediately before this assessment. Every finding below was re-verified fresh against this exact commit — not carried over from memory of the three prior investigations that fed the Decision Brief and Proposal.

**Scope of this assessment:** strictly the accepted Phase 1 scope (Decision Proposal §5, Decisions 1–9) — registration-only, identity-independent-of-stock, reuse of the existing `Product` entity and the existing Identity Existing/New Resolution mechanism. Merge, UnitRelationship configuration UI, and Never-Stocked/Out-of-Stock UI are explicitly out of scope for this assessment, exactly as they are out of scope for Phase 1 itself (Decision Proposal §6/§7).

---

# 1. Executive Determination

## **READY FOR IMPLEMENTATION PLANNING**

Every one of the thirteen areas below is either already fully satisfied by existing, verified architecture, or requires only a narrow, well-specified addition with no open technical question blocking it. No governance conflict, no schema requirement, and no scope-leakage risk was found. Two items are flagged as **implementation-planning-stage considerations** (§8, §13) — neither is a blocker, but both must be explicitly addressed in the Implementation Plan rather than assumed away.

---

# 2. Requirement-by-Requirement Assessment

## 2.1 — Owner-only access and tenant isolation

**Confirmed fresh, this session:** `App.tsx:117` and `:134` — `{!isStaff && activeTab === 'dashboard' ...}`, `{!isStaff && activeTab === 'stocks' ...}` — the exact, already-proven client-side gate pattern every other Owner-only screen uses. A new Catalog tab reusing this identical gate requires no new mechanism.

`firestore.rules:82-96` (re-read fresh): `isMemberOf(businessId)` requires `myProfile().businessId == businessId || businessId in ownedBusinessIds()` — already enforces that Owner A cannot act on Business B's data, for every collection, unconditionally. `isOwnerOf` layers `role == 'owner' || role == 'admin'` on top. No `isManagerOf` or other elevated-Staff path touches the `products` collection anywhere (confirmed by direct grep — `managerPermissions`/`isManagerOf` hits found elsewhere in the rules file, none inside the `products/{productId}` block).

**Finding: SATISFIED, no new mechanism required.**

## 2.2 — Batch-free Product creation

**Confirmed fresh:** `firestore.rules:484-507`, re-read in full — `allow create: if isMemberOf(businessId) && request.resource.data.get('name', null) is string && request.resource.data.get('name', '') != '';`. No linkage to any `batches`/`stockCounts` write is enforced, or even checkable, at this layer. A registration function performing only `setDoc` on `products/{id}` is unconditionally permitted today, exactly as `addStockBatch`'s own Product-creation block already proves is possible (it is one `setDoc` call, followed *separately* by its own batch write — the two are not atomically coupled at the rules layer).

**Finding: SATISFIED. The smallest safe implementation is a function mirroring `addStockBatch`'s existing Product-creation block, minus its batch write — not a new mechanism, a subset of an existing one.**

## 2.3 — Zero Business Worth impact

**Confirmed fresh, traced the full call chain, not just the function signature:** `apps/tenant/src/utils/calculations.ts:71` — `calculateInventoryTotals(batches: StockBatch[], quebras: Quebra[])` — parameters only, `products` never passed in, never read inside the function body (re-read in full, lines 71–87). Its caller, `AppContext.tsx:1718`, confirms the actual downstream use: *"Business Worth = Inventory Market Value − Expenses − Withdrawals"* (comment at line 1721), where Inventory Market Value is `totalMarketValueAllTime`, sourced exclusively from this same `calculateInventoryTotals(batches, quebras)` call. `currentInventoryValue` (the other half of the Business Worth picture) comes from `latestStockCount?.totalValue` — also entirely independent of `products`.

**Finding: SATISFIED, verified end-to-end from the raw calculation function through to the actual Business Worth figure shown on the Dashboard, not merely at the function-signature level.**

## 2.4 — Required selling price

**Confirmed fresh:** `Product.sellingPrice` is `sellingPrice?: number` — optional at the schema level (correctly; "required" is a Phase 1 *registration-form* rule, not a schema constraint, matching Decision Proposal §5 Decision 3's own framing). `EditProductModal.tsx` already writes it via a plain `updateProduct(id, { sellingPrice: sellingPrice.trim() ? parseFloat(sellingPrice) : undefined })` call — confirmed no batch, no valuation side effect (§2.3 already establishes why). Making it a required field is a client-side form-validation rule for the new registration screen, not a schema or write-path change.

**Finding: SATISFIED — the write path already exists and is already proven safe; "required" is enforced by the new form, not by any new backend rule.**

## 2.5 — Optional metadata

**Confirmed fresh:** `category?`, `supplier?`, `sku?`, `barcode?` — all already optional on `Product` (`types.ts:405-451`, re-read in full). `EditProductModal.tsx`'s own header comment (re-read fresh) confirms these are exactly its existing edit scope: *"category, supplier, SKU, barcode, and a REFERENCE cost/selling price."*

**Finding: SATISFIED, zero new fields required.**

## 2.6 — No cost-price violation

**Confirmed fresh, and this is the one area requiring explicit, disciplined implementation-time attention rather than being automatically enforced:** `EditProductModal.tsx`'s own submit handler (re-read fresh) contains the comment *"costPrice is deliberately never sent from this form — Cost/Cost Unit are purchase-workflow-owned... and read-only from the Product Catalog"* (§45 Amendment FR-88) — and indeed, `costPrice` is absent from that form's `useState` list and its `updateProduct(...)` payload entirely. However, `updateProduct` itself (`AppContext.tsx:7904`, re-read fresh) is a **generic, unrestricted** `Partial<Product>` updater with **no field-level enforcement of its own** — confirmed again, this session, not merely carried over. The exclusion is a UI-discipline convention today, not a structurally-guaranteed one.

**Finding: SATISFIED IN PRINCIPLE, but this is a hard implementation requirement, not an automatic guarantee.** The Implementation Plan must explicitly state that the Catalog registration form never renders a `costPrice` input and never includes `costPrice` in any payload it sends — matching `EditProductModal`'s own precedent exactly. This is not a blocker; it is a discipline requirement the Plan must name explicitly rather than leave implicit.

## 2.7 — Existing/New Product recognition reuse

**Confirmed fresh:** Implementation Authorization for Product Identity Existing/New Resolution, signed 2026-09-06, implemented at commit `0f479f2` — re-confirmed present in `git log` this session. `findSimilarProducts` (`apps/tenant/src/lib/productNameSimilarity.ts:275`, re-read in full) is a pure, side-effect-free candidate-generation function — no Firestore reads, never assigns or resolves anything itself, by its own docstring.

**Finding: SATISFIED at the logic layer.** See §2.11 below for a precise, non-blocking coupling finding regarding the UI layer.

## 2.8 — No silent duplicate creation

**Confirmed fresh:** Requirement 1 of the signed Implementation Authorization for Product Identity Existing/New Resolution: *"Unresolved product identity must never silently create a Product."* This governs any surface that creates a Product, by its own wording — not scoped to only AddStockView/PeriodicStockCountView. A Catalog registration function is bound by this exact same requirement without needing a new decision to say so.

**Finding: SATISFIED as a governance matter.** The Implementation Plan must ensure the Catalog's own registration flow actually invokes this resolution (see §2.11's coupling finding for what that concretely requires to build).

## 2.9 — No accidental stock creation

Identical evidence to §2.2/§2.3 — a registration function that only calls `setDoc` on `products/{id}` cannot, by construction, create a `StockBatch` or `StockCount` document, since it never touches those collections.

**Finding: SATISFIED — this is a property of what the function does *not* do, not a property requiring a new safeguard to be added.**

## 2.10 — Product Memory lifecycle

**Confirmed fresh:** `findLatestRememberedProductMemory` (`apps/tenant/src/lib/productMemoryPriceResolution.ts:157`, re-read in full) — `batches.find((b) => b.productId === productId && !!b.unit)` against an empty/no-match `batches` array returns `undefined` safely; `batchCandidate` becomes `null`; no exception path. This is exactly the shape a zero-batch Catalog product presents.

**Finding: SATISFIED, re-verified directly in the function body, not inferred from its docstring alone.**

## 2.11 — Existing Product compatibility with +Stock and Contagem

**This is the deepest verification performed for this assessment — traced the actual autofill logic in both consuming screens, fresh, line by line, rather than trusting the prior investigation's summary.**

**+Stock (`AddStockView.tsx:430-467`, re-read in full):** confirmed an explicit, already-existing, already-commented fallback: *"No batch and no priced Contagem entry — fall back to the product's own reference price (set via 'Editar Detalhes') instead of the generic defaults."* — `else if (match.costPrice != null || match.sellingPrice != null) { ... initialSell = String(match.sellingPrice); }`. This is precisely the branch a Catalog-registered product (has `sellingPrice`, has no batch, has no prior count) hits. Further down, the `canonicalSellingMemory`/`resolveUnitAwarePrice` resolution explicitly names *"no relationship at all"* as an anticipated, handled case (`resolvedSell === ''`), leaving the already-established `initialSell` untouched rather than erroring.

**Contagem (`PeriodicStockCountView.tsx:844`, re-read in full):** `let sellingPrice = latestBatch ? String(latestBatch.sellingPrice) : product.sellingPrice != null ? String(product.sellingPrice) : '';` — an explicit, direct fallback to `product.sellingPrice` when there is no `latestBatch`, exactly the shape of a Catalog-registered product.

**Finding: SATISFIED, verified at the exact line level in both consuming screens, not merely at the level of "the mechanism exists somewhere."** A Catalog-registered product's `sellingPrice` is already correctly surfaced by both +Stock and Contagem's own existing autofill logic, with zero special-casing required for Phase 1.

**One precise, non-blocking coupling finding, confirmed fresh this session (relevant to §2.7/§2.8 above):** `findSimilarProducts` is called directly inline inside `AddStockView.tsx` (line 3023) and separately, again inline, inside `PeriodicStockCountView.tsx` (lines 7886/7919) — confirmed by direct grep, not assumed. **There is no extracted, standalone, reusable "resolution panel" component** — the candidate-chips UI, the manual-search fallback, and the "confirm as new" button are each duplicated locally within their two host components, not a shared component either could import. **This means:** a new Catalog registration screen can reuse the *pure* `findSimilarProducts` function and the *products* array (trivial), and is *governed* by the same no-silent-duplicate requirement (§2.8) — but it **cannot simply import an existing resolution-panel component**; the Implementation Plan must build the Catalog's own version of that panel, following the same pattern (never a second recognition *algorithm*, but necessarily its own rendering of it). This is a real, concrete scoping item for the Implementation Plan, not a blocker and not evidence of a governance gap — the underlying decision (never silently duplicate) is already settled; only the UI's own composition is new work.

## 2.12 — No schema requirement unless evidence proves otherwise

**Confirmed, comprehensively, across every area above:** no field used by this assessment's registration scope (`name`, `sellingPrice`, `category`, `supplier`, `sku`, `barcode`) is missing from the current `Product` type. No `firestore.rules` change is required (§2.2). No new collection is required. The evidence in §2.1–§2.11 collectively proves the existing schema is sufficient for the accepted Phase 1 scope.

**Finding: SATISFIED — no schema change of any kind is required or justified by anything found in this assessment.**

## 2.13 — No scope leakage into Merge, UnitRelationship, or status UI

**Confirmed fresh, by direct negative-result search this session:** `grep -rn "mergeProduct|CatalogProduct|neverStocked|never_stocked"` across `apps/tenant/src` and `server/` returns exactly one hit — an unrelated, pre-existing local variable name (`confirmedCatalogProductIds` in `stockCount.ts`, a different feature entirely, not a new entity). No merge implementation, no `CatalogProduct` entity, and no never-stocked/out-of-stock UI exists anywhere in the current codebase to accidentally leak into.

`confirmProductUnitRelationship` (`AppContext.tsx:7943`, re-confirmed present and unchanged) remains available but is not proposed for use by this Phase 1 scope, consistent with Decision Proposal §5 Decision 6 and §7's deferral.

**Finding: SATISFIED — nothing in the current repository state creates any risk of accidentally implementing out-of-scope capability; the boundary is clean because the out-of-scope capabilities simply do not exist yet to be leaked into.**

---

# 3. Requirement Matrix

| # | Area | Existing Support | Gap | Rule 8 Finding |
|---|---|---|---|---|
| 1 | Owner-only access / tenant isolation | Full (`App.tsx` gate + `isMemberOf`/`isOwnerOf`) | None | Satisfied |
| 2 | Batch-free Product creation | Full (`firestore.rules` unconditional on `name` only) | None | Satisfied |
| 3 | Zero Business Worth impact | Full, traced end-to-end to the actual displayed figure | None | Satisfied |
| 4 | Required selling price | Full (existing `updateProduct` write path) | None (UI-only rule) | Satisfied |
| 5 | Optional metadata | Full (`EditProductModal`'s own existing scope) | None | Satisfied |
| 6 | No cost-price violation | Convention exists (`EditProductModal`), not structurally enforced | `updateProduct` itself has no field-level guard | Satisfied in principle — **explicit Plan-stage discipline requirement**, not automatic |
| 7 | Existing/New recognition reuse | Full at the logic layer (`findSimilarProducts`, pure) | None at logic layer | Satisfied |
| 8 | No silent duplicate creation | Full (signed Requirement 1, already governs any creation surface) | None | Satisfied |
| 9 | No accidental stock creation | Full (structural — the function simply doesn't touch those collections) | None | Satisfied |
| 10 | Product Memory lifecycle | Full (`findLatestRememberedProductMemory` null-safe, re-verified in-body) | None | Satisfied |
| 11 | +Stock/Contagem compatibility | Full, verified at the exact line level in both consumers | None functionally — **UI-composition-only gap, see below** | Satisfied — **resolution-panel UI must be newly built, not imported** |
| 12 | No schema requirement | Full | None | Satisfied |
| 13 | No scope leakage | Full (confirmed by direct negative search) | None | Satisfied |

---

# 4. Existing Mechanisms — Sufficiency Summary

**Already sufficient, no new mechanism needed:** Owner-only gating; tenant isolation; batch-free creation permission; Business Worth's batch-only computation; `sellingPrice`/metadata write path (`updateProduct`); Product Memory retrieval; +Stock/Contagem autofill compatibility; the "no silent duplicate" governance requirement itself.

**Partially sufficient — logic reusable, UI must be newly composed:** the Existing/New resolution mechanism (§2.7/§2.8/§2.11's coupling finding) — `findSimilarProducts` is directly reusable; the resolution *panel* is not an importable component and must be built fresh for the Catalog screen, following the same pattern already proven twice.

**Insufficient / does not exist yet:** the Catalog screen itself; the batch-free registration function (a small, well-specified subset of `addStockBatch`'s existing creation block); the registration form UI.

---

# 5. Gaps (confirmed only, none manufactured)

1. No dedicated Catalog screen exists.
2. No standalone, batch-free Product-registration function exists (though its shape is fully specified by an existing function's own creation block).
3. No extracted, reusable Existing/New resolution-panel component exists — the Catalog will need its own, following the existing pattern, not a new pattern.
4. `costPrice` exclusion is a convention, not a structural guarantee — must be an explicit, named requirement in the Implementation Plan, not an assumed property of `updateProduct`.

No other gaps were found across the thirteen requested areas.

---

# 6. Technical Mechanism Recommendation

- **Registration function:** mirror `addStockBatch`'s Product-creation block exactly, omit the batch write and the `costPrice` field entirely. No new Firestore interaction pattern.
- **Recognition:** call `findSimilarProducts(name, products)` directly (already imported and used this way in two other components) before allowing registration to complete; build a Catalog-specific resolution UI following the same shape already proven in `AddStockView.tsx`/`PeriodicStockCountView.tsx`, never a new algorithm.
- **Form fields:** `name`, `sellingPrice` (required); `category`, `supplier`, `sku`, `barcode` (optional) — no `costPrice` input, no `unitRelationship` step.
- **Screen gating:** reuse `!isStaff` exactly as every other Owner-only tab.

No other new mechanism is justified by this assessment's evidence.

---

# 7. Governance Dependencies

- **Decision Proposal / Acceptance (this same chain):** already signed; this assessment does not reopen it.
- **§45 Amendment FR-88 (cost purchase-workflow ownership):** not reopened; §2.6 confirms the Implementation Plan must operationally respect it, not that it needs amending.
- **BDR-0012 Decision 14 (`confirmProductUnitRelationship`):** not exercised by this Phase 1 scope; not reopened.
- **Product Identity Existing/New Resolution Authorization:** not reopened; its Requirement 1 is inherited, unmodified, by this Phase 1 scope.
- **Decisions 44–56, Business Worth Evolution, Contagem governance generally:** untouched — nothing in this assessment's findings requires reopening any of them.

No governance artifact requires amendment as a precondition for Implementation Planning.

---

# 8. Implementation Boundary

**A future Implementation Plan may address:** the Catalog screen itself; the batch-free registration function; the registration form (required/optional fields exactly as §5 of the Decision Proposal states); a Catalog-specific resolution-panel UI reusing `findSimilarProducts`; wiring the new screen into the existing `!isStaff` gate pattern.

**A future Implementation Plan must NOT:** add a `costPrice` input anywhere in the new registration flow; add any `unitRelationship` configuration step; add any Never-Stocked/Out-of-Stock visible UI; implement or scaffold Merge in any form; introduce a new `CatalogProduct` entity or collection; modify `updateProduct`, `addStockBatch`, `recordStockCount`, `calculateInventoryTotals`, or `findLatestRememberedProductMemory`; modify `firestore.rules`' existing `products` rule block (it already permits everything this scope needs).

---

# 9. Testing Requirements for a Future Implementation

At minimum, a future Implementation Plan's test suite must cover:

- A registered product with only `name` + `sellingPrice` set contributes exactly zero to `calculateInventoryTotals`'s output (regression-guarding §2.3's own finding, not merely trusting it stays true).
- The registration function's payload never includes `costPrice`, under any input (regression-guarding §2.6).
- The registration function never creates a `StockBatch` or `StockCount` document (regression-guarding §2.9).
- Attempting to register a name that closely matches an existing product surfaces the resolution UI and does not silently create a duplicate (regression-guarding §2.8).
- A registered, zero-batch product's `sellingPrice` is correctly autofilled the first time it is selected in +Stock (regression-guarding §2.11's own line-level finding).
- The same, for its first appearance in Contagem.
- The Catalog screen is unreachable for a Staff-role account (regression-guarding §2.1).
- Owner A cannot register or view a product under Business B's `products` path (regression-guarding tenant isolation).

Test design itself is not performed here, per instruction — this is the obligations list only.

---

# 10. Open Items — Resolved Where Possible

1. **Whether the Catalog's own resolution-panel UI should visually match the existing Add Stock/Contagem panels exactly, or may differ in presentation** — not resolvable from repository evidence alone (a design choice, not a technical constraint); flagged for the Implementation Plan to decide, not assumed here.
2. **Everything else requested in the original thirteen-area scope is resolved above**, with no remaining ambiguity requiring a Product Architect decision before Implementation Planning may proceed.

---

RULE 8 DECISION — FINAL STATUS:
READY FOR IMPLEMENTATION PLANNING

DECISIONS 1–9 (Owner Product Catalog Phase 1):
UNCHANGED / ACCEPTED — nothing in this assessment reinterprets, narrows, or expands any of the nine accepted decisions.

MERGE / UNITRELATIONSHIP CONFIGURATION / NEVER-STOCKED UI:
CONFIRMED OUT OF SCOPE — no evidence found requiring or tempting their inclusion; no accidental leakage risk identified.

IMPLEMENTATION:
NOT AUTHORIZED

NEXT GOVERNANCE GATE:
Implementation Planning — may now be correctly scoped, per §6/§8 above, but has not been created and requires its own separate drafting, plus its own subsequent, signed Implementation Authorization, before any code, `firestore.rules`, or test may be written.

REPOSITORY CHANGES:
None to application code, `firestore.rules`, `firestore.indexes.json`, or tests. One new documentary artifact: this Rule 8 Assessment.

COMMITS:
None yet for this assessment document itself.
