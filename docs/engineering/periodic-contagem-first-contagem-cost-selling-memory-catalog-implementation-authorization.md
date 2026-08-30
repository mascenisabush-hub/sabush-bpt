Implementation Authorization

# First-Time Contagem Cost Removal, Selling-Price/Selling-Unit Memory
# & Product Catalog (FR-78–FR-88) — Implementation Authorization

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation would be
authorized to begin, once signed. Stage 4 of this scope's own
governance sequence (Amendment → Rule 8 → Implementation Plan →
**Implementation Authorization** → Implementation).

**Status:** ✅ **Authorized. Signed by the Product Architect** — see
§10, below, for the complete signed decision.

**Governing chain:** `BDR-pending-business-worth-evolution-measurement-model.md`
§4, Decision 37 (✅ APPROVED AND SIGNED, 23 August 2026) →
`business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
(§44, ✅ ACCEPTED AND SIGNED, FR-71–FR-77) →
[Decision 37 First-Contagem Cost Removal & Selling-Price/Selling-Unit
Memory Amendment](../specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md)
(proposed §45, ✅ **ACCEPTED AND SIGNED** — "I APPROVE AND SIGN,"
SABUSHIMIKE MASCENI, 30 August 2026 — FR-78–FR-88) →
[Rule 8 Assessment](./periodic-contagem-first-contagem-cost-selling-memory-catalog-rule8-assessment.md)
(✅ **READY AFTER IMPLEMENTATION PLAN**) →
[Implementation Plan](./periodic-contagem-first-contagem-cost-selling-memory-catalog-implementation-plan.md)
(✅ **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION AUTHORIZATION**,
SABUSHIMIKE MASCENI, 30 August 2026) → **this Authorization**.

**Precedent note:** this document's structure follows the most recent,
directly comparable precedent in this repository,
[`periodic-contagem-existing-product-selling-unit-memory-implementation-authorization.md`](./periodic-contagem-existing-product-selling-unit-memory-implementation-authorization.md)
(signed, Authorized, 29 August 2026) — the immediately preceding
Periodic Contagem capability in the same file, whose own regression
boundaries this Authorization explicitly preserves (§8, below).

**Baseline verified fresh, this session:** `main = origin/main =
78d0a70` (the commit landing the accepted Implementation Plan itself),
working tree clean, confirmed via `git fetch origin main` immediately
before drafting this document. **Nothing has been modified in `apps/`,
`server/`, `firestore.rules`, `firestore.indexes.json`, `tests/`, the
§45 amendment, the Rule 8 Assessment, or the Implementation Plan to
produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

**§45 Amendment → Rule 8 Assessment → Implementation Plan →
Authorization (this document, signed) → Implementation (authorized,
not yet performed)**

- The §45 amendment is confirmed **✅ ACCEPTED AND SIGNED** —
  "I APPROVE AND SIGN," SABUSHIMIKE MASCENI, 30 August 2026 — FR-78
  through FR-88 in full, including the partial supersession of Decision
  37 items (b)/(i), the durable selling-price/selling-unit memory
  requirement, the two-independent-authorities principle, and the
  Product Catalog's six-field reviewable surface.
- The combined-scope Rule 8 Assessment is confirmed **✅ complete**,
  verdict **READY AFTER IMPLEMENTATION PLAN** — twelve findings (A–L),
  ten gates PASS and four PASS WITH CONDITIONS, zero FAIL, no
  unresolved specification/business decision remaining.
- The Implementation Plan is confirmed **✅ ACCEPTED** — "I APPROVE AND
  ACCEPT THE IMPLEMENTATION PLAN," SABUSHIMIKE MASCENI, 30 August 2026
  — translating the Rule 8 Assessment into an exact, file-by-file
  design: implementation boundary, data ownership table, persistence
  design, catalog data-source table, a 22-item acceptance-criteria list
  (AC-01–AC-22), an explicit exclusion list, and a 9-step sequence.
- No unresolved governance blocker remains upstream of this
  Authorization.
- No existing governing artifact was found, on re-inspection this
  session, to materially contradict the approved combined scope.

## 2. What Is Authorized

**Objective, exactly as fixed by the accepted Plan (§§5–13) and the
signed amendment (FR-78–FR-88) — nothing added, nothing narrowed:**

```
Periodic Contagem, first-time / new-to-catalog product:
  NewProductInfoPanel:
    "Custo de Compra Original" input group  → REMOVED
    Unit relationship collection            → unchanged
    Selling-unit collection                 → unchanged
  recordStockCount, new-product branch (type !== 'initial' only):
    Product.sellingPrice                    → written from the canonical
                                               submitted portion's price
    Product.unitRelationship.sellingUnit    → unchanged (already correct)

Periodic Contagem, existing product, every subsequent count:
  recordStockCount, existing-product branch (type !== 'initial' only):
    submitted selling price differs from remembered → Product.sellingPrice updates
    submitted selling price matches remembered      → no write queued
  buildCatalogRow / handleModeAToggle:
    confirmed sellingUnit + latestBatch exists  → unchanged, signed reconciliation (87814a9)
    confirmed sellingUnit, no latestBatch       → NEW: fall back to
                                                   findLatestRememberedProductMemory
                                                   (existing function, reused verbatim)
    no confirmed sellingUnit                    → unchanged, units[0] fallback

Add Stock / Smart Stock Entry (addStockBatch, addMultipleStockBatches):
  new batch cost differs from Product.costPrice → Product.costPrice updates
  Product.sellingPrice / unitRelationship       → never touched by this path

Product Catalog (DashboardView.tsx, EditProductModal.tsx):
  Cost / Cost Unit    → read-only, sourced from Product.costPrice (fallback: latest StockBatch)
  Selling Price       → editable, sourced from Product.sellingPrice (fallback chain per Plan §8)
  Selling Unit        → sourced from Product.unitRelationship.sellingUnit
  Unit Relationship   → sourced from Product.unitRelationship.units[]
```

**Authorized engineering work, drawn directly from the accepted Plan's
§7 Implementation Boundary — nothing added, nothing narrowed:**

1. **`NewProductInfoPanel`** (`PeriodicStockCountView.tsx`, current
   lines ~370–470) — remove the "Custo de Compra Original" input group
   (purchase-unit and purchase-cost-per-purchase-unit fields and their
   supporting copy) only. Product-identity display, unit-relationship
   chain collection (`UnitRelationshipChainEditor`), and selling-unit
   collection are preserved unmodified.
2. **`recordStockCount`, new-product branch** (`AppContext.tsx`, the
   `if (!product)` block inside the per-item loop, current line
   ~4427) — add a conditional `sellingPrice` field to the `newProd:
   Product` literal, sourced via a per-product (not per-portion)
   canonical-selection Map built once before the per-item loop,
   mirroring the existing `unitRelationshipByProductName`/
   `costBasisByProductName` Map pattern already used in this same
   function. **Guarded by `type !== 'initial'`** (§6, below).
3. **`recordStockCount`, existing-product branch** (same function, the
   implicit `else` of the same `if (!product)`, current line ~4427
   onward — today performs no `Product` write at all) — add a
   change-detected `fsBatch.update` on `Product.sellingPrice`, using
   the same per-product canonical-selection value as item 2, queued
   only when it differs from the product's current remembered value.
   **Guarded by `type !== 'initial'`** (§6, below). No write is queued
   when the value is unchanged.
4. **`buildCatalogRow`** (`PeriodicStockCountView.tsx`, current lines
   663–708) — add one additional fallback tier, reached only when no
   confirmed-`sellingUnit`-plus-`latestBatch` resolution applies and no
   `latestBatch` exists at all: call the existing, already-tested
   `findLatestRememberedProductMemory` (`productMemoryPriceResolution.ts`),
   already imported and used identically in `AddStockView.tsx`, passing
   `product.id`, `product.name`, `batches`, `stockCounts` (newly
   destructured from `useApp()`, item 6 below), and the confirmed
   `sellingUnit` as `preferredSellingUnit`. When it returns a memory,
   set both `unit` (converted to the confirmed `sellingUnit` via the
   existing `resolveUnitAwarePrice`) and `sellingPrice`. The existing,
   signed, batch-present branch (commit `87814a9`) is not modified in
   any way.
5. **`handleModeAToggle`** (current lines 1612–1650) — identical
   fallback tier added for `defaultReferencePrice` only.
   `defaultReferenceUnit`'s existing resolution (already correct,
   independent of any batch) is unmodified.
6. **`PeriodicStockCountView.tsx`'s `useApp()` destructure** — add
   `stockCounts` (already exists on `AppContext`, not yet consumed in
   this file). No behavior change from this addition alone.
7. **`addStockBatch`** (`AppContext.tsx`, current line 2444) and
   **`addMultipleStockBatches`** (current line 2975) — inside each
   function's already-open batch-creation write (`setDoc`/`fsBatch.set`
   for a new product; `fsBatch.update`/equivalent for an existing one),
   add a change-detected `Product.costPrice` update: when the batch's
   own `costPrice` differs from `product.costPrice`, the new value is
   written; otherwise no additional write occurs. No new `Product`
   field (e.g. a separate `costUnit`) is introduced — Cost Unit
   continues to be represented by the batch's own `unit`, read by the
   Catalog (item 8) from the same source as Cost itself.
8. **`DashboardView.tsx`** (`filteredProducts` row rendering, current
   lines ~952–1030) and **`EditProductModal.tsx`** — extend the
   existing catalog row and edit modal to expose the six approved
   fields (Product Name, Cost, Cost Unit, Selling Price, Selling Unit,
   Unit Relationship) per the Plan's §8 data-source table: Selling
   Price/Unit sourced from `Product.sellingPrice`/
   `unitRelationship.sellingUnit` (falling back to
   `findLatestRememberedProductMemory`, then to the latest batch, per
   item 4's same resolution); Cost/Cost Unit sourced from
   `Product.costPrice` (falling back to the latest batch). `costPrice`
   in `EditProductModal.tsx` changes from an editable `<input>` to a
   read-only display; `sellingPrice` remains editable, writing through
   the existing `updateProduct` call. No other field, no search/filter/
   navigation logic, is touched.
9. **Tests** — per §7, below, mapped to the Plan's own §14 Test
   Strategy.

**No new component, no new conversion engine, no new Firestore
collection, and no new `Product`-level schema field (e.g. a separate
`costUnit`) is authorized. No existing component's behavior for cases
it already handles correctly may change.**

## 3. Authorized Behavior — Preserved Exactly, Binding on Implementation

Carried forward unaltered from the Rule 8 Assessment and the accepted
Plan — none may be reinterpreted, loosened, or silently narrowed during
implementation.

**A. Historical purchase cost.** No product — genuinely new to the
SABUSH catalog or already existing, any portion, any unit — is ever
asked to supply historical/original purchase cost in Periodic Contagem.
"New to the catalog" is never treated as equivalent to "newly
purchased." No first-time Contagem confirmation is blocked, and no
warning is shown, on account of absent historical cost.

**B. Selling-price/selling-unit memory.** A selling price and selling
unit established during a product's first Contagem become durable
`Product` memory. Every subsequent Contagem automatically loads them,
without requiring re-entry — including for a product whose only history
is a prior confirmed Contagem, with no `StockBatch` ever recorded. The
memory is written once per product per confirmation, never once per
counted portion.

**C. Selling-price editability.** The remembered selling price remains
editable at any later Contagem. An edited value becomes the new
memory. An unedited value causes no write. Editing the selling price
never alters `Product.costPrice` or any `StockBatch.costPrice`.

**D. Selling-unit stability.** A confirmed selling unit is never
silently reverted to the purchase unit or to `units[0]` by an ordinary
Contagem confirmation that does not change it.

**E. Purchase cost / cost-unit memory.** When a new purchase batch
carries a cost different from the product's current remembered cost,
that becomes the product's current Cost/Cost Unit memory, reviewable
via the Product Catalog. This write lives exclusively inside
`addStockBatch`/`addMultipleStockBatches` — never inside
`recordStockCount`. A purchase-cost update never alters
`Product.sellingPrice` or `Product.unitRelationship`.

**F. Two independent authorities.** Purchase Cost/Cost Unit and Selling
Price/Selling Unit are governed as two structurally separate write
paths (`addStockBatch`/`addMultipleStockBatches` vs. `recordStockCount`)
— no single Owner action or code path introduced by this Authorization
may write both.

**G. Product Catalog.** A reviewable surface exposing Product Name,
Cost, Cost Unit, Selling Price, Selling Unit, and Unit Relationship for
every active product, with Selling Price editable and Cost/Cost Unit
read-only from that surface. This is a narrow extension of the existing
catalog list/modal — not a new screen, not a search/filter/navigation
redesign.

**H. Existing-product selling-unit reference point.** When
`Product.unitRelationship.sellingUnit` exists and is valid, it remains
the selling/valuation reference unit for both the catalog row's default
and Mode A's default — never `units[0]`, unless no `sellingUnit` is
confirmed, in which case the existing `units[0]` fallback is retained
exactly as today. This Authorization adds one further fallback tier
(item 4/5, §2, above) reached only in the no-batch case the existing,
signed reconciliation does not currently resolve — the reconciliation's
own preference order (`sellingUnit` over `units[0]`) is not reopened,
loosened, or reinterpreted in any way.

**I. Multi-unit / Add Portion.** The owner may record multiple physical
units of the same product in one Contagem (e.g. `3 Cx`, `1 Emb`, `5
Un`) as separate, independent physical portions/rows — never collapsed.
Add Portion remains optional, temporary, and is never memorized as a
standing Product-level selling-portions structure. The Impala-style
chain (`1 Cx = 4 Emb = 24 Un`) continues to function exactly as today.

**J. FR-67 non-interference.** `deriveCostContribution`,
`fr67CostBasisConversion.ts`, and FR-67's own `units[0]` cost-basis
anchor are untouched. FR-67's existing safe fallback (a non-fabricated
`0`/`derived: false` when no valid cost basis exists) continues to
apply, now correctly reached for a genuinely-new-to-catalog product
once item 1 (§2) removes the Owner-typed purchase cost.

**K. Business Worth non-interference.** `productValuationTotal`,
`normalizedTotalSellingValue`, `measuredBusinessWorth`, expenses,
withdrawals, cash, receivables, and payables logic are untouched. No
cost figure of any kind — existing or newly memoried — enters that
calculation chain. Selling price × counted quantity remains the
relevant product-valuation input, unchanged in mechanism.

**L. Initial Stock.** Completely excluded from every write this
Authorization introduces. `recordStockCount` is confirmed shared
infrastructure between `InitialStockCountView.tsx` and
`PeriodicStockCountView.tsx`; both new writes (§2 items 2–3) are gated
`type !== 'initial'` — the verified real guard (§6, below), not the
Rule 8 Assessment's own illustrative, non-existent `type === 'periodic'`
example. No other part of Initial Stock's behavior is modified,
investigated, or reinterpreted.

**M. Add Stock / Smart Stock Entry.** Neither surface's own UI is
modified. Smart Stock Entry's receipt-extraction logic and its own,
separate governance/approval status are untouched. The only change
touching this family (§2 item 7) lives entirely inside the shared
`AppContext.tsx` functions both surfaces already funnel through.

## 4. Scope and Affected Files

**Authorized (drawn directly from the accepted Plan's §7 — nothing
added):**

| File | Authorized change |
|---|---|
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | `NewProductInfoPanel` (removal, §2 item 1); `buildCatalogRow`, `handleModeAToggle` (new fallback tier, §2 items 4–5); `useApp()` destructure (`stockCounts` added, §2 item 6). |
| `apps/tenant/src/context/AppContext.tsx` | `recordStockCount` new- and existing-product branches (§2 items 2–3); `addStockBatch`, `addMultipleStockBatches` (§2 item 7). |
| `apps/tenant/src/components/DashboardView.tsx` | `filteredProducts` row rendering only (§2 item 8). |
| `apps/tenant/src/components/EditProductModal.tsx` | Field exposure/editability changes per §2 item 8. |
| `firestore.rules` | **Comment only** — the existing `/products/{productId}` rule's explanatory comment, which currently states creation call sites "never send costPrice/sellingPrice... at creation," becomes stale once §2 items 2 and 7 ship and must be updated for accuracy. **No rule-logic change** — the Plan (§17) and this Authorization both confirm the existing `allow create`/`allow update` rules already permit these writes without modification. |
| Test files (per §7, below) | New tests plus identification (not silent modification) of any existing structural assertion of pre-authorization behavior. |

**Explicitly excluded, confirmed untouched by this Authorization**
(carried forward verbatim from the Plan's §21):

- `apps/tenant/src/components/InitialStockCountView.tsx`
- `apps/tenant/src/components/AddStockView.tsx` (its own UI/component
  file — only the shared `AppContext.tsx` functions it calls into are
  touched, per §2 item 7)
- `apps/tenant/src/utils/smartStockEntryImagePreprocessing.ts`
- `apps/tenant/src/lib/fr67CostBasisConversion.ts`
- `apps/tenant/src/lib/purchaseToSellingConversion.ts`
- `apps/tenant/src/lib/productMemoryPriceResolution.ts` (reused
  verbatim, not modified — `findLatestRememberedProductMemory`'s own
  signature and logic are untouched)
- `apps/tenant/src/lib/unitRelationship.ts`
- `apps/tenant/src/utils/stockCount.ts`
- `apps/tenant/src/utils/calculations.ts`
- `types.ts` — **no schema change**; `Product.sellingPrice`,
  `Product.costPrice`, and `Product.unitRelationship.sellingUnit`
  already exist exactly as needed
- `getConversionFactor`, `resolveUnitAwarePrice`,
  `deriveModeAPortionValuations` — reused verbatim, not modified
- `firestore.rules` **rule logic** (comment-only change, per §4 above)
- `firestore.indexes.json`
- The Business Worth formula, `normalizeStockCountItems`
- Any Product-level "selling portions" configuration or new schema
  field
- Every existing governance document under `docs/specs/` and
  `docs/engineering/` — this Authorization and its governing chain are
  additive; none of the cited pre-existing artifacts is edited
- Server-side code (`server/`)
- Unrelated Products-module UI: search, category/supplier filters,
  navigation

## 5. Reuse-First Implementation Constraint

No new conversion engine, no second competing valuation path, no new
Firestore collection, and no new `Product`-level schema field may be
introduced. The following existing, already-tested mechanisms are the
sole authorized arithmetic/memory path:

- `getConversionFactor`
- `resolveUnitAwarePrice`
- `findLatestRememberedProductMemory` (newly wired into
  `buildCatalogRow`/`handleModeAToggle`, per §2 items 4–5 — its own
  signature and internal logic are not modified)
- The existing `fsBatch` transaction pattern already used throughout
  `recordStockCount`/`addStockBatch`/`addMultipleStockBatches`
- The existing `unitRelationshipByProductName`/`costBasisByProductName`
  per-product `Map` pattern already used in `recordStockCount`,
  mirrored (not reimplemented) for the new selling-price
  canonical-selection logic (§2 item 2)

Any discovered need for a new conversion mechanism, a new schema field,
or a new Product-level configuration returns to Product Architect
review before proceeding — it may not be resolved silently during
implementation.

## 6. Initial Stock Guard — Verified, Binding

**Verified this session, independently, against live code — not
assumed from the Rule 8 Assessment's own illustrative text:**

```ts
// apps/tenant/src/types.ts, line 526
export type StockCountType = 'initial' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
```

`InitialStockCountView.tsx` always calls `recordStockCount` with the
literal `type: 'initial'`. `PeriodicStockCountView.tsx` always passes
one of `'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'` —
never `'initial'`, and never a literal `'periodic'`, since no such
value exists in `StockCountType`. **The binding guard for §2 items 2
and 3 is `type !== 'initial'`.** This corrects the Rule 8 Assessment's
own illustrative (and inaccurate) `type === 'periodic'` example without
disagreeing with its substance — both agree a guard is required; this
is the verified, exact mechanism. Neither the Rule 8 Assessment nor the
accepted Plan is modified by this correction; the Plan's own §4.1
already recorded this identical correction during planning.

## 7. Testing Requirements

Exactly the set the accepted Plan's §14 already defines — this
Authorization does not relax or expand it. At minimum, tests must
verify:

1. First Contagem: no cost field rendered; confirmation succeeds
   without cost.
2. First Contagem: selling price persists to `Product.sellingPrice`
   (single-unit and multi-level-chain cases).
3. First Contagem: selling unit persists (regression — already correct
   per Finding C).
4. Second Contagem: selling unit auto-loads, including the no-batch
   case.
5. Second Contagem: selling price auto-loads, including the no-batch
   case.
6. Operator edits selling price during a later Contagem → memory
   updates.
7. Operator leaves selling price unchanged → no write is queued.
8. Selling-unit memory is never silently reverted.
9. New purchase batch with a different cost → `Product.costPrice`
   updates; selling price/unit unchanged.
10. Selling/cost independence: editing selling price never touches
    cost; a new batch never touches selling price/unit.
11. Multi-unit (Impala) lifecycle: full first-and-second-Contagem
    cycle; confirmed `sellingUnit` remains reference point; Add Portion
    unaffected.
12. Business Worth formula/results unchanged (regression).
13. FR-67 no-basis fallback remains safe (regression).
14. Initial Stock: `Product.sellingPrice` is **not** written when
    `type === 'initial'` — an explicit new negative test.
15. Catalog: six fields display; Selling Price editable, Cost/Cost Unit
    read-only; Selling Price reflects `Product.sellingPrice`/fallback
    chain, not raw latest-batch price.
16. Tenant isolation: all new writes remain scoped to
    `activeBusinessId`.

**Tests must actually be run before being reported as passing.** This
Authorization does not itself run or claim the results of any test — it
authorizes the tests enumerated in the accepted Plan's §14 to be
written and executed as part of implementation.

**Existing tests requiring diff-audit (identified, not modified, by
this Authorization):**
`periodic-contagem-cost-price-removal.test.ts`,
`periodic-stock-new-product-panel.test.ts`,
`periodic-contagem-existing-product-selling-unit-memory.test.ts` (24
existing tests — several may currently assert the exact no-batch gap
§2 items 4–5 close, and will need deliberate, documented updates
reflecting the new, correct behavior — never silently weakened),
`periodic-stock-existing-product-summary.test.ts`,
`product-memory-price-resolution.test.ts` (must remain green,
unmodified — §2 items 4–5 add a new caller, not a change to
`findLatestRememberedProductMemory` itself), `initial-stock-confirmation.test.ts`.
The precise locations needing updates are to be identified at
implementation time by running the current suite against the proposed
diff, per the Plan's own §14 note.

## 8. Regression Boundaries

Explicitly confirmed **not** changed by this Authorization: `Product`/
`UnitRelationship`/`StockBatch`/`StockCountItem` type/schema;
`getConversionFactor`'s signature/logic; `resolveUnitAwarePrice`'s
signature/logic; `findLatestRememberedProductMemory`'s signature/logic;
`deriveModeAPortionValuations`'s signature/logic; `deriveCostContribution`/
FR-67's cost-basis convention; Business Worth formulas
(`productValuationTotal`, `normalizedTotalSellingValue`,
`measuredBusinessWorth`); `normalizeStockCountItems`; the existing,
signed selling-unit reference-point reconciliation's own batch-present
branch (commit `87814a9`); §44's per-portion Cost Price removal;
Add Portion's persistence semantics, temporariness, and
non-inheritance; `firestore.rules` rule logic (comment-only change);
`firestore.indexes.json`; Initial Stock in any respect; Add Stock's and
Smart Stock Entry's own UI/component files; the new-product setup
flow's unit-relationship/selling-unit collection
(`UnitRelationshipChainEditor`, `isGenuinelyNewProductName`).

## 9. Acceptance Criteria

Carried forward verbatim from the accepted Plan's §20 (AC-01–AC-22),
made implementation-verifiable:

- [ ] AC-01 — First Contagem never asks historical Cost Price.
- [ ] AC-02 — New-to-catalog does not mean newly purchased; no
      confirmation is blocked or warned on absent historical cost.
- [ ] AC-03 — First Contagem selling unit persists.
- [ ] AC-04 — First Contagem selling price persists.
- [ ] AC-05 — Second Contagem loads remembered selling unit, including
      the no-batch case.
- [ ] AC-06 — Second Contagem loads remembered selling price, including
      the no-batch case.
- [ ] AC-07 — Selling-price edit updates memory, only on actual change.
- [ ] AC-08 — Selling-price edit does not change purchase cost.
- [ ] AC-09 — Purchase-cost update does not change selling price.
- [ ] AC-10 — Cost/Cost Unit come from the purchase workflow
      exclusively.
- [ ] AC-11 — Catalog exposes all six approved fields.
- [ ] AC-12 — Catalog Selling Price reflects Contagem memory, not raw
      latest-batch price.
- [ ] AC-13 — Catalog Cost reflects purchase memory.
- [ ] AC-14 — Unit relationship remains governed, unchanged mechanism.
- [ ] AC-15 — Confirmed `sellingUnit` remains the valuation reference
      point; the signed reconciliation is not reopened.
- [ ] AC-16 — `units[0]` is the fallback only when `sellingUnit` is
      absent.
- [ ] AC-17 — Add Portion remains temporary/current-count behavior,
      unaffected.
- [ ] AC-18 — Initial Stock is not modified by Periodic Contagem
      memory writes (`type !== 'initial'` guard, independently tested).
- [ ] AC-19 — Business Worth formula remains unchanged.
- [ ] AC-20 — FR-67 remains unchanged.
- [ ] AC-21 — Tenant isolation remains intact — all new writes scoped
      to `activeBusinessId`.
- [ ] AC-22 — No unrelated Product Catalog redesign occurs.

**22 acceptance criteria total**, matching the accepted Plan exactly —
no criterion added, none removed.

## 10. Product Architect Authorization / Signature

**Status: ✅ ACCEPTED AND AUTHORIZED (30 August 2026).**

> PRODUCT ARCHITECT AUTHORIZATION
>
> I, as Product Architect, formally approve and authorize implementation
> of the complete capability defined by §§1–9 of this document: removal
> of the first-Contagem "Custo de Compra Original" input; durable
> selling-price/selling-unit `Product` memory established from a
> product's first Contagem and automatically reused on every subsequent
> Contagem, including the no-batch case; purchase cost/cost-unit memory
> updates from Add Stock/Smart Stock Entry; and the six-field reviewable
> Product Catalog extension — exactly as scoped, bounded, and
> reuse-first as designed by the READY Rule 8 Assessment and the
> accepted Implementation Plan.
>
> This authorizes implementation of ONLY the scope explicitly listed in
> §§2–4 above, subject to every behavioral preservation in §3, every
> acceptance criterion in §9, the testing requirements in §7, the
> regression boundaries in §8, the verified `type !== 'initial'` guard
> in §6, and the exclusions in §4/§5. Nothing beyond that scope is
> granted by this signature — in particular, Initial Stock, Add Stock's
> and Smart Stock Entry's own UI, the conversion engine, `Product`/
> `UnitRelationship`/`StockBatch` schema, Business Worth formulas,
> FR-67's cost-basis convention, and Firestore rule logic (only the one
> explanatory comment may change) remain untouched and unauthorized for
> any further change by this signature.

Product Architect: SABUSHIMIKE MASCENI
Decision: I APPROVE AND AUTHORIZE IMPLEMENTATION
Date: 30 August 2026

**Effective upon this signature:** engineering implementation of the
capability defined in §2, subject to every behavioral preservation in
§3, every acceptance criterion in §9, the testing requirements in §7,
the regression boundaries in §8, the verified guard in §6, and the
exclusions in §4/§5, may now proceed as a separate, subsequent
implementation step — not performed by this document itself. Any
discovered need to exceed these boundaries during implementation
returns to Product Architect review before proceeding, not resolved
silently.

---

## Governance Notes

- This document does not modify the §45 amendment, the Rule 8
  Assessment, or the accepted Implementation Plan — all remain
  byte-for-byte unchanged.
- §10 is now **signed: ACCEPTED AND AUTHORIZED**, Product Architect
  SABUSHIMIKE MASCENI, 30 August 2026. This document, together with
  its signed §10, is now the authoritative Implementation Authorization
  for this capability.
- Populated strictly from the READY Rule 8 Assessment and the accepted
  Implementation Plan; no new technical detail, scope, or business
  decision beyond what those two documents already specify is
  introduced here, except the §6 guard correction, which the Plan's own
  §4.1 already recorded during planning and this document merely
  restates as the binding mechanism.
- This signature authorizes engineering implementation strictly within
  §§2–9 of this document — it is not itself the implementation, and no
  application code, test, or schema is created by this signature; that
  work remains a separate, subsequent step.
