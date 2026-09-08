Implementation Plan — DRAFT, NOT YET AUTHORIZED

# Owner Product Catalog — Phase 1 — Implementation Plan

**STATUS: DRAFT. PLANNING ONLY.** No code, test, schema, or `firestore.rules` change was made to produce this document. This Plan does not itself authorize implementation — a separate, signed Implementation Authorization remains a required, subsequent gate.

**Governing chain:**
[Decision Proposal](./product-catalog-phase-1-decision-proposal.md) → [Product Architect Acceptance](./product-catalog-phase-1-product-architect-acceptance.md) (✅ ACCEPTED AS PROPOSED, SABUSHIMIKE MASCENI, 2026-09-08) → [Rule 8 Assessment](./product-catalog-phase-1-rule8-assessment.md) (✅ FINAL — READY FOR IMPLEMENTATION PLANNING, committed `c025903`) → **this Implementation Plan** → *(next: Implementation Authorization — not created here)*.

**Repository state investigated:** `main @ c025903`, working tree clean, verified via `git fetch` immediately before drafting. Every file/line reference below was re-confirmed fresh this session.

---

# 1. Authoritative Scope (restated, not reinterpreted)

Exactly the ten items of Decision Proposal §5 / this task's §2 — dedicated Owner-only surface; reuse of `Product`; `name`+`sellingPrice` required, `category`/`supplier`/`sku`/`barcode` optional, `costPrice` excluded; identity-only registration (no `StockBatch`, no `StockCount`, no Business Worth contribution); reuse of the existing Identity Existing/New Resolution governance; UnitRelationship, Merge, and Never-Stocked/Out-of-Stock UI all excluded; Product Memory not redesigned.

---

# 2. Implementation-Scope Trace (fresh, this session)

**A. Product creation/write path.** Confirmed exactly two existing writers: `addStockBatch` (`AppContext.tsx:3230`) and `recordStockCount` (`AppContext.tsx:5172`). `addStockBatch`'s own Product-creation block (lines 3268–3293, re-read in full) is the exact template this Plan reuses:
```
productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
const newProd: Product = {
  id: productId,
  name: trimmedName,
  createdAt: new Date().toISOString(),
  // conditionally: unitRelationship, costPrice — NEITHER applies to this Plan's scope
};
await setDoc(doc(db, 'businesses', businessId, 'products', productId), newProd);
```
Confirmed: no `active` field is set at creation anywhere in this existing block — `active === false` is the only exclusion check used everywhere it's read (`DashboardView.tsx:363`, `PeriodicStockCountView.tsx:1744`), so an absent `active` is already, correctly, "active."

**B. `updateProduct`.** `AppContext.tsx:7904` — generic `(id: string, updates: Partial<Product>) => updateDoc(doc(...), updates)`. Confirmed, again this session: no field-level restriction of any kind. This is the mechanism Requirement A (§3, below) must be enforced *around*, not *by*.

**C. Existing Product creation patterns.** Both existing creators bundle Product creation with a stock write in the same function; neither is directly callable standalone. This Plan's new function is a genuine, minimal subset of `addStockBatch`'s own block — not a call to `addStockBatch` itself (which would create a batch), and not a modification to it.

**D. Product identity resolution logic.** Implementation Authorization for Product Identity Existing/New Resolution, signed 2026-09-06, commit `0f479f2`. Requirement 1: *"Unresolved product identity must never silently create a Product."* Governs any creation surface by its own wording, not scoped to specific files.

**E. `findSimilarProducts` and related pure logic.** `apps/tenant/src/lib/productNameSimilarity.ts:275` — pure, no Firestore access, signature `findSimilarProducts(name: string, products: Product[])`. Directly importable and callable from a new file with zero modification.

**F. Add Stock resolution host.** `AddStockView.tsx:3023` — `findSimilarProducts` called inline, directly inside the component's own render/handler code; the candidate-chip UI and "confirm as new" control are local JSX, not an exported sub-component.

**G. Contagem resolution host.** `PeriodicStockCountView.tsx:7886`/`:7919` — same pattern, independently implemented, not shared with (F).

**H. Product Memory behavior.** `findLatestRememberedProductMemory` (`productMemoryPriceResolution.ts:157`) — confirmed null-safe for a zero-batch, zero-count product. `AddStockView.tsx:430-467` and `PeriodicStockCountView.tsx:844` both already fall back correctly to `product.sellingPrice` when no batch/count memory exists — re-verified at the exact line level this session (also documented in the Rule 8 Assessment §2.11).

**I. Owner-only navigation/screen gating.** `apps/tenant/src/data/navigationTabs.ts` — single source of truth for both desktop and mobile nav; `TabType` union, `NavTabDefinition[]` array, `ownerOnly: boolean` field already exists and is already exactly what every Owner-only tab (`dashboard`, `stocks`, `stock-count`, etc.) uses. `App.tsx:117-134` — confirmed pattern: `{!isStaff && activeTab === 'stocks' && <StocksView />}`, zero props required for a simple top-level screen.

**J. Existing Product list/search/edit UI patterns.** `DashboardView.tsx`'s `filteredProducts` (search/category/supplier filtering logic, confirmed reusable in shape) and `EditProductModal.tsx` (`{ product: Product; onClose: () => void }` — a fully portable, zero-coupling component, confirmed directly reusable as-is for this Plan's "Edit Product" need).

**K. Firestore Product rules.** `firestore.rules:484-507`, re-read in full this session: `allow create: if isMemberOf(businessId) && name is non-empty string` — no batch linkage. `allow update, delete: if isOwnerOf(businessId)`. Confirmed unconditionally sufficient for this Plan's needs; no rule change proposed or required.

**L. Business Worth calculation path.** `calculateInventoryTotals(batches, quebras)` (`calculations.ts:71`) → `AppContext.tsx:1718`'s `totalMarketValueAllTime` → Business Worth formula (`AppContext.tsx:1721`, *"Inventory Market Value − Expenses − Withdrawals"*). `products` never enters this chain at any point — re-traced end to end this session.

**M. All Product references potentially affected.** `Quebra.productId`, `StockBatch.productId`, `StockCountItem.productId`, `BusinessWorthSnapshot*Line.productId`, `PeriodicStockDraftItem.productId`, `InitialStockPriceChangeEvent.productId` — none of these is written by this Plan's registration function (it only writes the `Product` document itself), so none is affected by Phase 1 at all. (Full reference map already established in the prior Merge Governance investigation; re-confirmed still accurate, no new references introduced since.)

**N. Existing tests covering these paths.** `tests/product-identity-existing-new-resolution.test.ts` (the resolution mechanism itself — not to be duplicated), `tests/product-recognition-*.test.ts` (naming/matching logic — not to be duplicated). No existing test file references a "Catalog" screen (confirmed by grep — none exists yet).

---

# 3. Rule 8 Findings as Plan Constraints

**Requirement A — Cost price.** The new registration write function's payload literally never includes a `costPrice` key, under any code path — not merely a hidden/unrendered form field. This Plan does **not** modify `updateProduct`'s own signature or add any field-level guard to it (no evidence found that doing so is necessary — `EditProductModal` already proves the omit-at-the-call-site pattern is sufficient and is this repository's own established convention for this exact boundary). The registration function is written once, with `costPrice` structurally absent from its own object literal — the same guarantee `addStockBatch`'s own Product-creation block gives for `sellingPrice` (also absent there) by simply never writing it.

**Requirement B — Recognition UI.** Confirmed no reusable resolution-panel component exists (§2.F/G). This Plan's Checkpoint D (§14) builds a new, Catalog-hosted panel, importing only `findSimilarProducts` — never a new matching algorithm, never a modified one.

---

# 4. Catalog User Flow

**A.** Owner opens Catalog (new nav tab, Owner-only).
**B.** Owner sees a searchable product list — the existing `filteredProducts` search/filter shape, reused.
**C.** Owner selects "Adicionar Produto."
**D.** Registration form: `name`* , `sellingPrice`*, `category`, `supplier`, `sku`, `barcode` (* required).
**E.** No `costPrice` field renders anywhere in this form.
**F.** On submit, before any write: call `findSimilarProducts(name, products)`.
   - No candidates above threshold → proceed directly to creation.
   - Candidate(s) found → present them; Owner explicitly picks "this is [Existing Product]" (no new Product created, registration form's other fields are discarded — the existing Product is not silently overwritten) **or** "Confirmar como produto novo" (proceeds to creation). No automatic resolution either way.
**G.** On confirmed-new creation: write `Product` only (§6). No `StockBatch`, no `StockCount`, no Business Worth change (§2.L).
**H.** After registration: the product appears in the Catalog list, zero stock, and is recognizable by +Stock/Contagem exactly as any other Product from that point on (§2.H).

No additional onboarding step is introduced.

---

# 5. UI / UX Plan

- **Nav integration:** new `TabType` literal `'catalog'`; new `NavTabDefinition` entry in `navigationTabs.ts`, `ownerOnly: true`, following the existing array's exact shape (icon, color, i18n keys) — e.g. icon `Boxes`-adjacent or a distinct catalog icon (`BookOpen`/`Archive` from the already-imported `lucide-react` family; final icon choice left to implementation, not a governance question).
- **Screen gating:** `App.tsx`, `{!isStaff && activeTab === 'catalog' && <ProductCatalogView />}` — identical pattern to `stocks`.
- **Catalog list:** reuse `DashboardView`'s `filteredProducts` search/category/supplier filtering *logic* (not the component itself, which is Dashboard-specific) inside the new `ProductCatalogView`.
- **Add-product action:** a button opening a registration form (new, small component or inline state in `ProductCatalogView` — implementation's own choice, not a governance question).
- **Registration form:** the six fields in §4.D, styled per this repository's existing design-system conventions (matching `EditProductModal`'s own input styling, not a new visual language).
- **Validation:** `name` and `sellingPrice` required, inline error messages, matching existing form-validation patterns already used elsewhere (e.g. `AddStockView`'s own field validation).
- **Identity resolution surface:** new, Catalog-hosted (§3, Requirement B) — candidate chips + manual search fallback + "Confirmar como produto novo" button, following the *shape* already proven in `AddStockView`/`PeriodicStockCountView`, not their literal code.
- **Successful registration state:** return to the Catalog list, newly-registered product visible.
- **Editing:** reuse `EditProductModal` **unmodified** — already proven fully portable (§2.J).
- **Empty state:** "No products registered yet" + prompt to add one, matching this repository's existing empty-state conventions (e.g. `StocksView`'s own empty state).

**Explicitly not built:** stock quantity field, cost-price field, UnitRelationship configuration step, Never-Stocked/Out-of-Stock badge or filter.

---

# 6. Data / Write Plan

**Fields written by registration:** `id`, `name`, `createdAt`, `sellingPrice`, and any of `category`/`supplier`/`sku`/`barcode` the Owner filled in (conditionally included, matching `addStockBatch`'s own conditional-spread pattern for optional fields).

**Fields never written by registration:** `costPrice`, `unitRelationship`, `active` (left absent, per §2.A's confirmed convention), `supplierWordings`, `updatedAt` (only set by later edits, matching existing convention).

**Write function:** one new, small, standalone function (proposed name: `registerCatalogProduct`, confirmed no existing name collision this session) — not an extension of `addStockBatch`, `recordStockCount`, or `updateProduct`. A single `setDoc` call, structurally incapable of writing to `batches`/`stockCounts` since it never references those collections.

**Timestamps/active state:** exactly `addStockBatch`'s own existing convention (§2.A) — no new convention introduced.

**Identity resolution timing:** occurs entirely client-side, before this write function is ever called — `registerCatalogProduct` itself performs no recognition logic; the calling UI only invokes it after the Owner has explicitly confirmed "New Product."

---

# 7. Business-Worth Safety

Traced (§2.L): the planned write touches only `products/{id}`. `calculateInventoryTotals` never reads `products`. No calculation file is modified by this Plan. Zero Business Worth impact is a structural property of what `registerCatalogProduct` does not do, not a new safeguard requiring its own code.

---

# 8. Product Memory / Later Workflow Compatibility

Confirmed (§2.H): a Catalog-created Product's `sellingPrice` is already correctly picked up by both `AddStockView.tsx:430-467` and `PeriodicStockCountView.tsx:844`'s existing fallback logic, unmodified. This Plan creates **no** Product Memory of any kind at registration time (no synthetic batch, no synthetic count, no backdated history) — `findLatestRememberedProductMemory` will correctly return `null` for such a product until it has a genuine first transaction, exactly as it already does for any product today between creation and its first purchase/count.

---

# 9. Permissions / Tenant Isolation

- **Owner-only:** reuse of `!isStaff` (§5) — no new role, no new permission tier.
- **Server-side:** `firestore.rules`' existing `products` rule (§2.K) already permits everything this Plan needs; **no rules change proposed**.
- **Existing Staff product-creation paths (via Add Stock) are explicitly preserved, untouched** — this Plan does not narrow `allow create`'s existing `isMemberOf` scope, since doing so would break Add Stock's own existing, legitimate Staff-usable path (Rule 8 Assessment §2.1's own finding, restated here as a hard constraint on this Plan).
- **Tenant isolation:** inherited automatically — every read/write in this Plan is scoped under `businesses/{businessId}/products`, the same path structure every other collection already uses.

---

# 10. Recognition Implementation — Reuse Map

**REUSABLE (imported as-is, zero modification):**
- `findSimilarProducts` (`productNameSimilarity.ts`)
- The `products` array itself (already loaded app-wide via context)
- The existing owner-authoritative resolution semantics (Requirement 1 of the signed Authorization)

**HOST-SPECIFIC (not touched, not refactored):**
- `AddStockView.tsx`'s own inline resolution UI
- `PeriodicStockCountView.tsx`'s own inline resolution UI

**NEW CATALOG-SPECIFIC (built fresh, following the same shape):**
- The Catalog's own candidate-chip/search-fallback/confirm-new UI, hosted in the new `ProductCatalogView` (or a small sub-component of it)

**No refactor of Add Stock or Contagem into a shared component is proposed** — investigated (§2.F/G) and confirmed unnecessary for this Plan's scope; each host's own resolution UI is small enough, and different enough in its surrounding form context, that extracting a shared component now would be a broader refactor than this Plan's accepted scope justifies. This can be revisited later, separately, if a third host ever needs the same UI — not a Phase 1 decision.

---

# 11. Test Plan

| Area | Assertion |
|---|---|
| Catalog access | Owner can reach the Catalog tab; Staff cannot (mirrors existing `!isStaff` tests for `stocks`/`dashboard`) |
| Registration validation | Missing `name` blocked; missing `sellingPrice` blocked; valid optional fields accepted; `costPrice` never appears in `registerCatalogProduct`'s own payload, under any input (regex/structural assertion against the function's own source, matching this repo's established test style) |
| Stock separation | `registerCatalogProduct` never references `batches`/`stockCounts` collections (structural assertion); a registered product's `sellingPrice` contributes 0 to `calculateInventoryTotals`'s output (behavioral assertion) |
| Identity protection | A near-duplicate name surfaces candidates; confirmed-new creates exactly one `Product`; confirmed-existing creates zero |
| Tenant isolation | All reads/writes scoped to `businesses/{activeBusinessId}/products` (structural assertion, matching existing collection-path tests) |
| Later compatibility | A registered, zero-batch product's `sellingPrice` autofills correctly the first time it's selected in Add Stock; same for Contagem (regression-guarding the exact line-level findings in Rule 8 Assessment §2.11) |
| Regression | Existing Add Stock identity-resolution tests still pass unmodified; existing Contagem identity-resolution tests still pass unmodified; `EditProductModal`'s own existing tests (if any) still pass unmodified |

All assertions non-vacuous, matching this repository's own established discipline (every prior checkpoint this session verified via `tsc` + targeted test runs + full sweeps, never merely "the code compiles").

---

# 12. File/Scope Plan

| File | Create/Modify | Purpose | Why necessary |
|---|---|---|---|
| `apps/tenant/src/components/ProductCatalogView.tsx` | **Create** | The Catalog screen itself (list, search, add-product entry, registration form, resolution UI) | No existing screen serves this purpose (Rule 8 Assessment §2, confirmed "Stocks" cannot) |
| `apps/tenant/src/context/AppContext.tsx` | **Modify** | Add `registerCatalogProduct` function + expose it via context | New, minimal write function per §6; no existing function can be reused as-is without also writing a batch |
| `apps/tenant/src/data/navigationTabs.ts` | **Modify** | Add `'catalog'` to `TabType`, add its `NavTabDefinition` entry | Single source of truth for nav; no other file defines tabs |
| `apps/tenant/src/App.tsx` | **Modify** | Mount `ProductCatalogView` behind `!isStaff && activeTab === 'catalog'` | Matches every other tab's own mount pattern |
| `apps/tenant/src/i18n/locales/{pt,en,fr}.ts` | **Modify** | Add `nav.tabs.catalog.*` and Catalog screen's own UI strings | This repository's existing i18n convention, no exceptions found anywhere else in the codebase |
| `tests/product-catalog-phase-1.test.ts` (or similar, exact name at implementation time) | **Create** | The test matrix in §11 | No existing test file covers a Catalog screen (§2.N) |

**Files that MUST NOT change:** `apps/tenant/src/utils/calculations.ts` (Business Worth); `apps/tenant/src/components/PeriodicStockCountView.tsx` and its own Contagem calculation logic; `apps/tenant/src/lib/productMemoryPriceResolution.ts` (Product Memory); any file implementing or scaffolding Merge (none exists — must stay that way); anything touching `UnitRelationship` governance (`confirmProductUnitRelationship`, `unitRelationship.ts`); `firestore.rules` (confirmed sufficient as-is, §2.K/§9); `apps/tenant/src/components/EditProductModal.tsx` (reused unmodified, §2.J/§5).

---

# 13. Implementation Checkpoints

**Checkpoint A — Catalog surface/navigation.**
Files: `navigationTabs.ts`, `App.tsx`, i18n locales.
Behavior: an empty Catalog screen (list only, no data yet) is reachable by Owner, unreachable by Staff.
Tests: nav-gating test (mirrors existing `stocks`/`dashboard` pattern).
Invariant protected: Owner-only access (§9).
Stop condition: screen renders, gated correctly, before any write logic exists.

**Checkpoint B — Product registration write path.**
Files: `AppContext.tsx` (`registerCatalogProduct`).
Behavior: function exists, is exposed via context, is not yet wired to any UI.
Tests: structural assertion — no `costPrice` in payload; no `batches`/`stockCounts` reference.
Invariant protected: Requirement A (§3); zero Business Worth impact (§7).
Stop condition: function verified safe in isolation before any UI calls it.

**Checkpoint C — Registration form + validation.**
Files: `ProductCatalogView.tsx`.
Behavior: form renders the six fields (§4.D), validates required fields, does **not** yet call `registerCatalogProduct` (submission is a no-op or logs only).
Tests: validation assertions (§11).
Invariant protected: `costPrice` never rendered; UnitRelationship never rendered.
Stop condition: form is fully validated and visually correct before it can write anything.

**Checkpoint D — Identity resolution.**
Files: `ProductCatalogView.tsx` (new resolution sub-UI), importing `findSimilarProducts`.
Behavior: submitting the form now runs recognition first; only a confirmed-new path reaches `registerCatalogProduct`.
Tests: identity-protection assertions (§11).
Invariant protected: Requirement B (§3); no silent duplicate creation.
Stop condition: a near-duplicate name cannot reach creation without explicit Owner confirmation, verified by test before proceeding.

**Checkpoint E — Catalog list/edit behavior.**
Files: `ProductCatalogView.tsx` (list/search, `EditProductModal` wiring).
Behavior: registered products appear in the list; search/filter works; "Edit" opens the existing, unmodified `EditProductModal`.
Tests: list/search assertions; confirm `EditProductModal` itself is untouched (diff-based regression guard, matching this repo's own established convention for "this file was not modified" checks).
Invariant protected: no duplicate UI/logic for editing (§5).
Stop condition: full create → list → edit loop works end-to-end.

**Checkpoint F — Regression/integration verification.**
Files: none (verification only).
Behavior: full sweep of every test file touching `AddStockView`, `PeriodicStockCountView`, `DashboardView`, `EditProductModal`, and the Product Identity Existing/New Resolution suite.
Tests: the full existing suites for all of the above, run unmodified.
Invariant protected: no regression anywhere outside the Catalog's own new files.
Stop condition: 100% of pre-existing, previously-passing tests in these areas still pass (matching this session's own established sweep discipline — pre-existing unrelated failures, if any, individually confirmed via `git stash` comparison, never silently absorbed into this Plan's own scope).

---

# 14. No Scope Leakage

Explicitly outside this Implementation Plan: Product Merge; merge aliases/redirects; metadata merge conflict resolution; UnitRelationship configuration UI; Never-Stocked/Out-of-Stock visible status; Product Memory redesign; Business Worth formula changes; Contagem redesign; purchase-cost governance changes; a new recognition algorithm; automatic identity decisions of any kind.

If any checkpoint in §13 is found, during actual implementation, to require touching any of the above, the correct response is to **stop and report the conflict** rather than silently expanding scope — per this task's own explicit instruction.

---

# 15. Implementation Authorization Preparation

Acceptance criteria a future, separate Implementation Authorization would need the Product Architect to sign:

1. `registerCatalogProduct` writes exactly the fields in §6, never `costPrice`, never touches `batches`/`stockCounts`.
2. The Catalog screen is unreachable for Staff, verified by test.
3. All six checkpoints (§13) pass their own stated tests before the next begins.
4. The full regression sweep (Checkpoint F) shows zero new failures, with any pre-existing failures individually confirmed unrelated (matching this session's established `git stash`-comparison discipline).
5. No file outside §12's table is modified.
6. `EditProductModal` is confirmed byte-identical to its pre-Plan state (or, if any change proves genuinely necessary, that change is separately called out and justified — not silently bundled in).

Not created or signed here.

---

IMPLEMENTATION PLAN STATUS:
- Decision Proposal: ACCEPTED
- Rule 8 Decision 60: READY FOR IMPLEMENTATION PLANNING
- Implementation Plan: DRAFT
- Product Architect Implementation Authorization: NOT GRANTED
- Implementation: NOT AUTHORIZED
- Code changes: NONE
- Tests changed: NONE
- Commit/push: NONE (pending explicit instruction)
