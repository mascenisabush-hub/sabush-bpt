Implementation Plan

# Implementation Plan — First-Time Contagem Cost Removal, Selling-Price/
# Selling-Unit Memory & Product Catalog (FR-78–FR-88)

**Status:** ✅ **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION
AUTHORIZATION.** Reviewed and accepted by the Product Architect (§23,
below): "I APPROVE AND ACCEPT THE IMPLEMENTATION PLAN," SABUSHIMIKE
MASCENI, 30 August 2026. This acceptance authorizes drafting an
Implementation Authorization as the next governance step; it does not,
on its own, authorize any code, test, `firestore.rules`, or
`firestore.indexes.json` change, and it does not itself constitute an
Implementation Authorization — a separate, signed Implementation
Authorization remains required before any implementation work begins.

**Governing chain:** `BDR-pending-business-worth-evolution-measurement-model.md`
§4, Decision 37 (✅ APPROVED AND SIGNED, 23 August 2026) →
`business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
(§44, ✅ ACCEPTED AND SIGNED, FR-71–FR-77) →
[`decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`](../specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md)
(proposed §45, ✅ **ACCEPTED AND SIGNED** — "I APPROVE AND SIGN,"
SABUSHIMIKE MASCENI, 30 August 2026 — FR-78–FR-88) →
[`periodic-contagem-first-contagem-cost-selling-memory-catalog-rule8-assessment.md`](./periodic-contagem-first-contagem-cost-selling-memory-catalog-rule8-assessment.md)
(verdict: **READY AFTER IMPLEMENTATION PLAN**) → **this Implementation
Plan**.

---

## 1. Header / Status

| Field | Value |
|---|---|
| Amendment | §45, ACCEPTED AND SIGNED, 30 August 2026 |
| Rule 8 Assessment | Complete, verdict READY AFTER IMPLEMENTATION PLAN |
| This Implementation Plan | ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION AUTHORIZATION (SABUSHIMIKE MASCENI, 30 August 2026) |
| Implementation Authorization | NOT YET CREATED |
| Code implementation | NOT AUTHORIZED |

---

## 2. Verification Performed Before Drafting

- `git fetch origin main`: confirmed `HEAD = origin/main = cf8bba8`
  (the commit landing the Rule 8 Assessment), working tree clean.
- Confirmed the accepted amendment's signature block reads exactly:
  `Decision: I APPROVE AND SIGN` / `Product Architect: SABUSHIMIKE
  MASCENI` / `Date: 30 August 2026`, and its top status banner reads
  "✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT."
- Confirmed the Rule 8 Assessment's verdict section reads
  `READY AFTER IMPLEMENTATION PLAN`.
- Read both documents in full, fresh, this session.
- Re-read Decision 37 (BDR §4 item 37, items a–j), §44 (FR-71–FR-77),
  FR-67 (`fr67CostBasisConversion.ts`), the existing-product
  selling-unit reconciliation and its Implementation Authorization.
- Confirmed no Implementation Plan with overlapping scope exists:
  `docs/engineering/periodic-contagem-first-contagem-cost-selling-memory-catalog-implementation-plan.md`
  did not exist prior to this document's creation.
- **Independently re-verified, against live code, every technical claim
  this Plan relies on** — not merely reproduced from the Rule 8
  Assessment — and found **two corrections** to the Rule 8 Assessment's
  own illustrative (non-binding) technical detail, reported in §4 below
  rather than silently applied. Neither correction changes the Rule 8
  Assessment's verdict or any of its Findings' substance — both are
  refinements of exact mechanism, which the Rule 8 Assessment itself
  explicitly left to this Plan (its own §12 Implementation Boundary
  states the write-path mechanism was "deferred to Rule 8/implementation
  design," and this Plan is that next stage).

---

## 3. Purpose / Scope

Make Periodic Contagem behave correctly for a business that is already
operating before adopting SABUSH BPT: the first Contagem for such a
business establishes current product/selling information without
requiring a reconstructed purchase history. Purchase cost remains
exclusively the purchase workflow's responsibility. The resulting
Product Catalog becomes a reviewable memory surface. This Plan covers
the full combined approved scope (FR-78–FR-88) — not a subset. This is
**not** a redesign of Products, Add Stock, Smart Stock Entry, Initial
Stock, or Business Worth.

---

## 4. Current-State Summary (independently re-verified, this session)

### 4.1 Correction to the Rule 8 Assessment's illustrative guard

**The Rule 8 Assessment's Finding B/Gate C/§8 illustrated the required
Initial-Stock guard as `type === 'periodic'`. This literal value does
not exist in the codebase and must not be used.** Verified directly:

```ts
// apps/tenant/src/types.ts, line 526
export type StockCountType = 'initial' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
```

`InitialStockCountView.tsx` (line 1136) always calls `recordStockCount`
with the literal `type: 'initial'`. `PeriodicStockCountView.tsx` (line
2399) passes its own local `type` state (`useState<StockCountType>('monthly')`,
line 717), which is always one of `'weekly' | 'monthly' | 'quarterly' |
'yearly' | 'custom'` — **never** `'initial'`, and never a literal
`'periodic'` either, since no such value exists in the type. **The
correct, verified guard is `type !== 'initial'`.** This is a mechanical
correction to the Rule 8 Assessment's own illustrative example, not a
disagreement with its substance (both agree a guard is required); the
Rule 8 Assessment's own instruction under which it was produced
explicitly asked for this exact verification before commitment, and
this Plan performs it. The Rule 8 Assessment document itself is not
modified.

### 4.2 New reuse opportunity discovered, not identified by the Rule 8 Assessment

**`findLatestRememberedProductMemory`** (`apps/tenant/src/lib/productMemoryPriceResolution.ts`,
line 143) already exists, is already tested, and is already used
throughout `AddStockView.tsx` (7 call sites) to resolve "the most
recent remembered (unit, costPrice, sellingPrice) triple for a product,
across **both** `StockBatch` purchases **and confirmed `StockCount`
history**" — including Contagem, explicitly documented in its own
header comment: "across both StockBatch purchases and confirmed
StockCounts (Contagem, including Capital Inicial)." It accepts an
optional `preferredSellingUnit` to break ties toward the confirmed
selling unit when a Contagem counted multiple portions.

**This function was not investigated by the Rule 8 Assessment**, which
proposed a hand-written fallback branch inside `buildCatalogRow`/
`handleModeAToggle` reading `product.sellingPrice` directly (its
Finding D). This Plan finds a materially better mechanism exists
already, addressed in §7.3/§17 below — this is a refinement of *how*
Finding D's gap is closed and *how* pre-existing historical products
are covered without a migration script, not a disagreement with
Finding D's diagnosis (a real gap exists) or any other Finding.

### 4.3 Re-confirmed, unchanged from the Rule 8 Assessment

- `NewProductInfoPanel`'s "Custo de Compra Original" section
  (`PeriodicStockCountView.tsx` lines ~409–431) — live, unchanged.
- No code path writes `Product.sellingPrice` or `Product.costPrice`
  automatically anywhere (`addStockBatch` line 2479,
  `addMultipleStockBatches` line 3121, `recordStockCount` line 4435 —
  all three new-product branches write only `id`/`name`/`createdAt`/
  conditionally `unitRelationship`). Only `EditProductModal`'s manual
  edit writes either field.
- `recordStockCount`'s **existing-product** path (the implicit `else`
  of `if (!product) { ... }`, `AppContext.tsx` line ~4427 onward)
  currently does **nothing** to the `Product` document at all — no
  `updateProduct`/`fsBatch.update` call exists there today. Confirmed
  by direct reading, this session: the loop falls straight through to
  `countItems.push(...)` for an existing product.
- **This loop iterates once per counted portion (row), not once per
  product.** For a multi-portion product (e.g. the Impala example: 3
  Cx + 1 Emb + 5 Un = three `norm` entries), any per-product write
  added inside this loop must be deduplicated to fire once per
  product per confirmation, not once per portion — a persistence-design
  requirement not explicit in the Rule 8 Assessment's Finding B/E text,
  identified here.
- `buildCatalogRow`/`handleModeAToggle` (`PeriodicStockCountView.tsx`
  lines 663–708, 1612–1650) resolve remembered selling price **only**
  from the latest `StockBatch`; no-batch case falls back to raw
  `product.sellingPrice` for price (no unit-aware conversion, and for
  `unit`, `buildCatalogRow` does **not** fall back to the confirmed
  `sellingUnit` at all — stays blank) and to a hard `''` for
  `handleModeAToggle`'s reference price.
- `DashboardView.tsx`'s catalog list (`filteredProducts` rendering,
  lines ~952–1030) sources "COMPRA"/"VENDA" from `displayBatch`
  (`StockBatch`), never from `Product.costPrice`/`Product.sellingPrice`.
  Unit Relationship is not displayed anywhere in that list.
  `EditProductModal.tsx` currently allows free editing of both
  `costPrice` and `sellingPrice`, with no Cost Unit, Selling Unit, or
  Unit Relationship field.
- `deriveCostContribution` (`fr67CostBasisConversion.ts`) gracefully
  returns `{ value: quantity * rawCostPrice, derived: false }` (→ `0`
  once Finding A removes the Owner-typed cost input) for a product with
  no valid cost basis — no crash, no fabricated positive figure.
  Untouched by this Plan.
- `productValuationTotal`/`normalizedTotalSellingValue`/
  `measuredBusinessWorth` are computed entirely from selling price ×
  quantity; no cost figure of any kind enters that chain. Untouched by
  this Plan.
- `firestore.rules`' `/products/{productId}` `allow create` rule
  validates only `name`; it does not reject additional fields on
  create. Its own explanatory comment currently states creation call
  sites "never send costPrice/sellingPrice... at creation" — this
  comment will become stale once this Plan ships and must be updated
  (comment only, no rule-logic change).

---

## 5. Target Behavior

### 5.1 First Contagem (product not yet in catalog)

```
Enter product identity
  → establish unit relationship (unchanged, Decision 37 item (c))
  → establish selling unit
  → establish selling price
  → count physical quantities (one or more portions)
  → NO historical/original purchase-cost input shown
  → on confirmation: persist product identity + unit relationship
    (unchanged) + selling-price/selling-unit memory (new, §7.1)
```

### 5.2 Second (and every subsequent) Contagem

```
Existing product
  → product identity already known
  → unit relationship already known (unchanged)
  → selling unit auto-loaded from memory (§7.3, closing the no-batch gap)
  → selling price auto-loaded from memory (§7.3)
  → operator may edit the selling price
  → count physical quantities
  → NO cost entry, ever
  → on confirmation: IF the submitted selling price differs from the
    remembered value, memory updates (§7.2); if unchanged, no write
    occurs
```

### 5.3 Purchase (Add Stock / Smart Stock Entry — unchanged in UI, small addition in AppContext)

```
New batch recorded
  → purchase cost / cost unit entered exactly as today (§6, §9)
  → IF this batch's cost differs from the product's current remembered
    cost, cost memory updates (§7.4)
  → selling price / selling unit are NEVER touched by this path
```

---

## 6. Data Ownership Table

| Information | Authoritative workflow | Storage |
|---|---|---|
| Product Name | Product identity / first Contagem or Add Stock, whichever creates the product | `Product.name` |
| Unit Relationship | Product setup / existing governed relationship (Decision 37 item (c), unchanged) | `Product.unitRelationship` |
| Selling Unit | Periodic Contagem | `Product.unitRelationship.sellingUnit` |
| Selling Price | Periodic Contagem | `Product.sellingPrice` |
| Cost | Add Stock / Smart Stock Entry | `Product.costPrice` (new write, §7.4), with `StockBatch.costPrice` remaining FR-67's own unchanged source |
| Cost Unit | Add Stock / Smart Stock Entry | Implied by the batch/`Product.costPrice`'s own associated unit — see §7.4 for exact representation |

**Explicit invariant, restated as a hard implementation constraint
(FR-85):** Selling-price changes must never change purchase cost.
Purchase-cost changes must never change selling price. The two writes
(§7.1/§7.2 vs. §7.4) live in entirely separate functions
(`recordStockCount` vs. `addStockBatch`/`addMultipleStockBatches`) and
must never be merged into one shared "update product memory" helper
that touches both from a single call.

---

## 7. Detailed Implementation Boundary

### 7.1 `AppContext.tsx` — `recordStockCount`, new-product branch (Findings B, C)

**File:** `apps/tenant/src/context/AppContext.tsx`, the `if (!product)`
block inside `recordStockCount`'s per-item loop (~line 4427).

**Why it must change:** today writes only `id`/`name`/`createdAt`/
conditional `unitRelationship` for a genuinely new product — never
`sellingPrice`. FR-81 requires the Owner-established selling price to
become durable memory on the product's first Contagem.

**What changes:** the `newProd: Product` literal gains a conditional
`sellingPrice` field, sourced from the confirmed selling-price value
for this product within the current submission. **Guard:** the entire
addition fires only when `type !== 'initial'` (§4.1) — i.e. this must
not fire for an Initial Stock confirmation, which also creates
`Product` documents through this exact same shared branch.

**Multi-portion selection rule (new design decision, not specified by
the amendment or Rule 8 Assessment, resolved here):** because this loop
runs once per counted portion, the selling-price value written must be
selected once per product, not once per portion. Selection rule,
mirroring `findLatestRememberedProductMemory`'s own established
`preferredSellingUnit` tie-break precedent: prefer whichever submitted
portion's `unit` matches the confirmed `unitRelationship.sellingUnit`
(when a chain exists); for a single-functional-unit product (no chain),
its one portion's price is unambiguous; for Mode A, every portion
already shares one reference price, so any portion suffices. Computed
via a `Map<productKey, {sellingPrice, sellingUnit}>` built once before
the per-item loop, mirroring the existing `unitRelationshipByProductName`/
`costBasisByProductName` Map pattern already used in this same
function (lines ~4372–4383) — no new pattern introduced.

**What remains untouched:** `unitRelationship` write logic (unchanged,
Finding C already correct); `costPrice`/`totalValue` computation
(FR-67, untouched); the `if (!product)` gate itself; every other field
on `StockCountItem`.

### 7.2 `AppContext.tsx` — `recordStockCount`, existing-product branch (Finding E)

**File:** same function, the implicit `else` of `if (!product)` — today
entirely empty of any `Product` write.

**Why it must change:** FR-83 requires an operator's selling-price edit
during any later Contagem to become the new memory.

**What changes:** after the per-item loop (once the canonical
per-product selling price is determined, per §7.1's selection rule),
compare it against the existing `product.sellingPrice`. If different
(or if the confirmed `sellingUnit` differs), queue an `fsBatch.update`
on the product's existing document — reusing the already-open
`fsBatch` transaction `recordStockCount` already commits, not a new
round trip. **Guard:** identical `type !== 'initial'` condition as
§7.1. **If unchanged:** no write is queued at all — this is the
explicit "no accidental overwrite" requirement; a Contagem that leaves
the price exactly as remembered must not generate a Firestore write or
bump `updatedAt`.

**What remains untouched:** `Product.unitRelationship` for an existing
product is governed exclusively by `confirmProductUnitRelationship`
(a separate, deliberate-action function) — this addition does not
touch `unitRelationship` for an existing product in any way, only
`sellingPrice`. `Product.costPrice` is never referenced by this branch.

### 7.3 `PeriodicStockCountView.tsx` — `buildCatalogRow`/`handleModeAToggle` (Finding D)

**File:** `apps/tenant/src/components/PeriodicStockCountView.tsx`,
lines 663–708 and 1612–1650.

**Why it must change:** FR-82 requires automatic loading of remembered
selling unit/price on every subsequent Contagem, including for a
product with no `StockBatch` at all — the exact case both functions
currently fail to resolve correctly (§4.3).

**What changes — reuse-first resolution, superior to the Rule 8
Assessment's own proposed fallback (§4.2):** both functions gain a
fallback tier using the **existing** `findLatestRememberedProductMemory`
(`productMemoryPriceResolution.ts`), already imported and used
identically in `AddStockView.tsx`. This single function already
resolves the "no batch, but a prior confirmed Contagem exists" case
correctly, because it already searches `StockCount` history (via its
`stockCounts` parameter) in addition to `batches` — and `StockCount.items[].sellingPrice`
is **already populated unconditionally** by `recordStockCount` today,
for every portion of every Contagem, with no new write required for
this specific read path to start working retroactively for historical
data (§17, Migration). Call shape, mirroring
`AddStockView.tsx`'s existing `getRememberedPriceForRow` precedent
exactly:

```ts
const memory = findLatestRememberedProductMemory(
  product.id,
  product.name,
  batches,
  stockCounts,
  isValidUnitRelationship(product.unitRelationship) ? product.unitRelationship?.sellingUnit : undefined
);
```

Resolution order, per function:

- `buildCatalogRow`: (1) confirmed `sellingUnit` + `latestBatch` — the
  existing, signed, untouched reconciliation (commit `87814a9`); (2)
  no `latestBatch` — fall back to `findLatestRememberedProductMemory`;
  if it returns a memory, set both `unit` (converted to the confirmed
  `sellingUnit` via the already-existing `resolveUnitAwarePrice`, same
  engine the existing reconciliation already uses) and `sellingPrice`;
  (3) no memory at all — today's exact final fallback (`product.sellingPrice`
  raw, blank unit) unchanged, for the narrow remaining case of a
  product with a `Product.sellingPrice` value but literally zero
  StockBatch/StockCount history (should not occur post-§7.1, but
  preserved for defensiveness, per §44/FR-73's own "never remove a
  safe fallback" discipline).
- `handleModeAToggle`: identical tier added for `defaultReferencePrice`
  only (`defaultReferenceUnit`'s existing resolution is already correct
  and untouched, per Finding D's own scoping).

**What remains untouched:** the existing-batch-present branch in both
functions — the signed reference-point rule (`sellingUnit` over
`units[0]`) and its exact preference order are not reopened, per
explicit instruction (§7 of the originating task). `findLatestRememberedProductMemory`
itself is not modified.

### 7.4 `AppContext.tsx` — `addStockBatch` / `addMultipleStockBatches` (Finding F)

**File:** `apps/tenant/src/context/AppContext.tsx`, lines ~2444–2482
(`addStockBatch`) and ~2975–3130 (`addMultipleStockBatches`).

**Why it must change:** FR-86 requires the product's Cost/Cost Unit
memory to update when a new batch's cost differs from what is currently
remembered.

**What changes:** after resolving the target `product` (new or
existing) and immediately before/alongside the existing `StockBatch`
write, compare `costPrice` (already an input parameter to both
functions) against `product.costPrice`. If different, queue a
`Product.costPrice` update inside the same already-open write
(`setDoc`/`fsBatch.set` for a new product's literal — add `costPrice`
directly; `fsBatch.update` for an existing product — reusing the same
transaction, not a new round trip).

**Cost Unit representation — smallest-change decision, per instruction
§(E)'s explicit request to identify one if the existing schema is
insufficient.** `Product` has no separate `costUnit` field today.
**Smallest sufficient change: none required.** The batch's own `unit`
field (`StockBatch.unit`, already written on every batch) already
carries the cost's associated unit; the Product Catalog (§8) reads Cost
Unit from the same source it reads Cost from (the latest batch, or
`Product.costPrice`'s originating batch) — no new `Product.costUnit`
field is introduced, avoiding an unnecessary schema change the
instruction explicitly warns against inventing without evidence.

**What remains untouched:** `StockBatch.costPrice`/`unit` themselves
(FR-67's own unchanged source); `Product.sellingPrice`/`unitRelationship`
are never referenced by this addition; Smart Stock Entry's own
receipt-extraction UI and logic are untouched — this change lives
entirely inside the shared `addStockBatch`/`addMultipleStockBatches`
write path both Add Stock and Smart Stock Entry already funnel through,
not in either's own front-end.

### 7.5 `EditProductModal.tsx` / `DashboardView.tsx` — Product Catalog (Finding H)

**File:** `apps/tenant/src/components/EditProductModal.tsx`,
`apps/tenant/src/components/DashboardView.tsx` (`filteredProducts`
row rendering only).

**Why it must change:** FR-87/FR-88 require the six approved fields
exposed, with Selling Price editable and Cost/Cost Unit read-only.

**What changes:**

- `DashboardView.tsx`'s catalog row: "VENDA" column re-sourced to
  `Product.sellingPrice` (falling back to `findLatestRememberedProductMemory`
  per §7.3's same resolution, then to `displayBatch.sellingPrice` as
  today's final fallback for pre-migration data) instead of
  `displayBatch.sellingPrice` unconditionally, per the originating
  instruction's own explicit concern ("the catalog's 'VENDA' value
  could represent the latest purchase batch's selling price instead of
  the confirmed Contagem selling-price memory"). "COMPRA" column
  continues reading `Product.costPrice` (once §7.4 populates it) with
  a `displayBatch.costPrice` fallback — unaffected in spirit, since
  Cost remains purchase-workflow-sourced either way. A new, compact
  Unit Relationship indicator (e.g. `1 Cx = 4 Emb = 24 Un`, derived from
  the existing `Product.unitRelationship.units[]`, no new formatting
  utility beyond what `UnitRelationshipChainEditor`'s own display
  logic already does) is added to the row.
- `EditProductModal.tsx`: `costPrice` input becomes a read-only display
  (labeled, not an `<input>`) sourced identically to the catalog row
  above; `sellingPrice` input remains editable, now explicitly labeled
  "Selling Price" and written through the same `updateProduct` call
  already used, satisfying FR-88 (editing here updates the same memory
  §7.1/§7.2 establish — same field, second entry point, not a new
  authority). Cost Unit and Selling Unit are added as read-only/derived
  display fields (Selling Unit from `unitRelationship.sellingUnit`,
  Cost Unit from the same source as the Cost column above).

**What remains untouched:** search, category/supplier filters,
navigation, the modal's other fields (name/category/supplier/sku/
barcode), and every other screen in the Products module — per the
originating instruction's explicit "do not redesign" boundary.

---

## 8. Catalog Design — Data Source Table

| Displayed field | Authoritative source (post-Plan) | Fallback chain |
|---|---|---|
| Product Name | `Product.name` | none needed |
| Cost | `Product.costPrice` (§7.4) | latest `StockBatch.costPrice` |
| Cost Unit | latest `StockBatch.unit` associated with the remembered cost | none — no new field introduced (§7.4) |
| Selling Price | `Product.sellingPrice` (§7.1/§7.2) | `findLatestRememberedProductMemory` (§7.3) → latest `StockBatch.sellingPrice` (today's current, soon-to-be-last-resort behavior) |
| Selling Unit | `Product.unitRelationship.sellingUnit` | latest `StockBatch.unit`, then `units[0]` |
| Unit Relationship | `Product.unitRelationship.units[]` | — (absent = not yet configured, an ordinary state per BDR-0012, never an error) |

This directly resolves the originating instruction's named concern: the
catalog's Selling Price no longer represents "whatever the latest
purchase batch happened to sell at" as its primary source — it
represents the confirmed Contagem selling-price memory, falling back
only for products predating this feature.

---

## 9. Add Stock / Smart Stock Entry Boundary (explicit, per instruction §11)

- Add Stock's own UI (`AddStockView.tsx`) is **not modified** by this
  Plan in any way — its purchase-cost entry, its cost-unit selection,
  and its batch-history display are untouched.
- Smart Stock Entry's receipt-extraction logic
  (`smartStockEntryImagePreprocessing.ts`) is **not modified**.
- The only change touching the Add Stock/Smart Stock Entry family is
  §7.4, and it lives entirely inside `AppContext.tsx`'s shared
  `addStockBatch`/`addMultipleStockBatches` functions — the same
  functions both Add Stock and Smart Stock Entry already funnel
  through — not in either surface's own component.
- No cross-over: Periodic Contagem's own write paths (§7.1/§7.2) never
  touch `Product.costPrice`; Add Stock's write path (§7.4) never
  touches `Product.sellingPrice`/`unitRelationship`.

---

## 10. FR-67 / Cost-Basis Boundary (explicit, per instruction §8)

`deriveCostContribution`, `fr67CostBasisConversion.ts`, and the FR-67
fallback contract are **not modified** by this Plan. Independently
re-verified this session (§4.3): the function already returns a safe,
non-fabricated `0` (`derived: false`) when no valid cost basis exists —
exactly the state every genuinely-new-to-catalog product will be in
once §7.1 removes the Owner-typed purchase cost (Finding A). No change
to this file is required or proposed anywhere in this Plan.

---

## 11. Business Worth Boundary (explicit, per instruction §9)

No change to `productValuationTotal`, `normalizedTotalSellingValue`,
`measuredBusinessWorth`, expenses, withdrawals, cash, receivables, or
payables logic anywhere in this Plan. Every write this Plan introduces
(§7.1, §7.2, §7.4) touches only `Product.sellingPrice`/
`Product.unitRelationship.sellingUnit`/`Product.costPrice` — fields
independently re-confirmed this session (§4.3) to be read by no
Investment/Market/Profit calculation anywhere in the codebase. Selling-
price memory is a persistence/pre-fill improvement to what the Owner
sees as a starting value; the Owner's confirmed value at the moment of
confirmation — unchanged mechanism — is what Business Worth always
reads, regardless of where that value was pre-filled from.

---

## 12. Initial Stock Boundary (explicit, per instruction §10 — critical)

`recordStockCount` is confirmed, this session, to be shared by
`InitialStockCountView.tsx` and `PeriodicStockCountView.tsx`. **Exact
guard, verified against actual code (§4.1), correcting the Rule 8
Assessment's own illustrative (and incorrect) `type === 'periodic'`
example:**

```ts
if (type !== 'initial') {
  // §7.1 / §7.2 selling-price/selling-unit memory writes fire here only
}
```

Both new writes (§7.1 new-product, §7.2 existing-product) must be
wrapped in this exact condition. No other change in this Plan touches
`recordStockCount`'s `type === 'initial'` path in any way — Initial
Stock's own Cost Price behavior, its own confirmation flow, and its own
`initialCapitalBasis` handling are entirely unaffected.

---

## 13. Persistence Design

### First Contagem write (§7.1)

- **Written:** `Product.sellingPrice` (new); `Product.unitRelationship`
  including `sellingUnit` (unchanged, already correct — Finding C).
- **Not written:** `Product.costPrice`; no field on `Product` related
  to historical/original purchase cost, ever, from this path.
- **Selling price persisted:** as a plain number on `Product.sellingPrice`,
  denominated in whichever unit the canonical portion (§7.1's selection
  rule) was recorded in — the same "reference price" semantics
  `Product.sellingPrice` already documents in-code.
- **Selling unit persisted:** via the existing `unitRelationship.sellingUnit`
  mechanism, unchanged.
- **Unit relationship persisted:** unchanged (Decision 37 item (c)).
- **If the product is already present** (a race: two operators
  simultaneously counting the same genuinely-new product) — this
  Plan does not introduce new concurrency handling; the existing
  `tempProducts`/`fsBatch` pattern's own existing behavior for this
  edge case (already governed elsewhere, unmodified) applies unchanged.

### Subsequent Contagem (§7.2)

- **`Product.sellingPrice` updates** only when the canonical submitted
  value differs from the current remembered value (§7.2).
- **Does not update** when the operator leaves the pre-filled/loaded
  price unchanged — no write is queued at all in that case, avoiding
  unnecessary `updatedAt` churn and satisfying the explicit
  "no accidental overwrite" requirement.
- **Accidental-overwrite prevention:** the comparison happens against
  the *current* `product.sellingPrice` read within the same
  confirmation transaction (via `tempProducts`, the same in-memory
  product-state pattern `recordStockCount` already maintains for its
  new-product branch) — not a stale client-side snapshot — so a
  genuinely unchanged value can never be misdetected as changed due to
  timing.

### Purchase (§7.4)

- **Cost memory updates** only when the new batch's cost differs from
  `product.costPrice`.
- **Selling memory protected:** §7.4's code path never reads or writes
  `sellingPrice`/`unitRelationship` in any branch — structurally
  incapable of touching it, not merely disciplined not to.

---

## 14. Test Strategy

### New tests required

- First Contagem: no cost field rendered; confirmation succeeds without
  cost; selling unit persists; selling price persists (multi-portion —
  canonical-portion selection rule, §7.1).
- Second Contagem: selling unit auto-loads (no-batch case, §7.3); selling
  price auto-loads (no-batch case); no cost field; operator edits price
  → memory updates (§7.2); operator leaves price unchanged → no write
  queued.
- Third/future Contagem: latest memory loads; latest edit becomes new
  memory.
- Purchase: new batch, different cost → cost memory updates; selling
  price/unit unchanged (§7.4).
- Multi-unit (Impala example): full lifecycle per §5.1/§5.2; confirmed
  `sellingUnit` remains reference point (regression, not new); Mode A
  reference price resolves via `findLatestRememberedProductMemory` in
  the no-batch case; Add Portion unaffected (regression).
- Business Worth: unchanged formula/results (regression against
  `business-worth-measured-value.test.ts`).
- FR-67: no-basis fallback remains safe (regression against
  `contagem-cost-basis-conversion.test.ts`).
- Initial Stock: confirms **no** `Product.sellingPrice` write occurs
  when `type === 'initial'` — a new, explicit negative test directly
  covering §12's guard.
- Catalog: six fields display; Selling Price editable, Cost/Cost Unit
  read-only; Selling Price reflects `Product.sellingPrice`/memory
  fallback chain (§8), not raw latest-batch price.
- Tenant isolation: all new writes remain scoped to `activeBusinessId`
  (reusing the existing `businesses/{businessId}/...` path pattern
  every other write in this file already uses — no new pattern).

### Existing tests to run as regression, unmodified

- `periodic-contagem-cost-price-removal.test.ts` (§44 regression)
- `periodic-stock-new-product-panel.test.ts`
- `periodic-contagem-existing-product-selling-unit-memory.test.ts`
  (24 tests — must be diff-audited: several may currently assert the
  exact no-batch gap §7.3 closes and will need deliberate, documented
  updates reflecting the new, correct behavior — never silently
  weakened)
- `periodic-stock-existing-product-summary.test.ts`,
  `periodic-stock-multi-portion-valuation.test.ts`,
  `periodic-stock-arbitrary-length-relationship.test.ts`,
  `periodic-stock-add-portion.test.ts`,
  `periodic-stock-mode-a-integration.test.ts`
- `business-worth-measured-value.test.ts`,
  `business-worth-snapshot-product-valuation-line.test.ts`
- `product-memory-price-resolution.test.ts` (covers
  `findLatestRememberedProductMemory` directly — must remain green,
  unmodified, since §7.3 only adds a new *caller*, not a change to the
  function itself)
- `initial-stock-confirmation.test.ts` — regression-confirms Initial
  Stock's own confirmation flow is unaffected by §7.1/§7.2's guard.

**Two pre-existing, unrelated failures** noted in commit `87814a9`'s
own message (`periodic-stock-shop-switch-guard`,
`periodic-stock-multi-portion-valuation`) are out of scope for this
Plan to fix; must be confirmed still-and-only-those-two-failing after
implementation, not newly caused or newly hidden.

**No test file has been modified in producing this Plan.**

---

## 15. Migration / Existing Data

**Determination: B — lazy backfill is sufficient; no explicit migration
script required.**

Rationale, directly enabled by §7.3/§4.2's discovery: `findLatestRememberedProductMemory`
already resolves a product's most recent selling price/unit from
**existing, already-persisted** `StockCount.items[].sellingPrice`
history — data that has been written, unconditionally, by every
Contagem confirmation since before this Plan, with no gap. A product
counted before this feature ships will therefore correctly show its
last-known selling price in the catalog and pre-fill correctly on its
next Contagem via §7.3's fallback tier, **the first time** it is
touched by either path — no batch migration, no backfill script, and
no `Product.sellingPrice` field needs to be populated retroactively for
existing products. `Product.sellingPrice` becomes authoritative
going forward (§7.1/§7.2) for every product touched after this ships;
`findLatestRememberedProductMemory` bridges the gap for everything
before, exactly as it already does for Add Stock today. `Product.unitRelationship`
requires no migration either — absence remains an ordinary,
already-governed state (BDR-0012 §5.A Item 6), unaffected by this Plan.

---

## 16. Failure / Edge Cases

| Case | Handling |
|---|---|
| No selling price exists anywhere | Catalog/Contagem show blank — never fabricated (existing discipline, `findLatestRememberedProductMemory` returns `null`, never a guessed number) |
| No selling unit exists | Falls back to `units[0]` (unchanged, signed reconciliation) |
| No StockBatch exists | §7.3's new fallback tier via `findLatestRememberedProductMemory` |
| `Product` exists, `sellingPrice` absent | Same fallback tier; once any future Contagem/edit occurs, §7.1/§7.2 populate it |
| `Product` exists, `sellingUnit` absent | `units[0]` fallback (unchanged) |
| Latest batch has no `unit` | `findMostRecentBatchForProduct`'s existing guard (`!!b.unit` in `findLatestRememberedProductMemory`; existing `latestBatch?.unit` optional-chaining in `buildCatalogRow`) — unchanged, already handled |
| Latest batch has no selling price | Existing `resolveUnitAwarePrice`'s own no-fabrication contract (returns `''`) — unchanged |
| Incomplete multi-unit relationship | `isValidUnitRelationship`'s existing validation gate — unchanged |
| Invalid/negative price | Existing numeric coercion/validation (`Number(x) || 0` / firestore rule's `>= 0` check) — unchanged, applies identically to the new writes |
| Operator changes selling price | §7.2's change-detected write |
| Purchase cost changes | §7.4's change-detected write |
| Same product name in another business | Not applicable — every read/write in this Plan is scoped to `businesses/{activeBusinessId}/products`, the existing tenant-isolation pattern; no cross-business query is introduced anywhere |
| Duplicate product-name normalization | Unchanged — existing `trim().toLowerCase()` matching used throughout `recordStockCount`/`addStockBatch` today, reused as-is |
| First Contagem interrupted before confirmation | Unaffected — no write in this Plan occurs before confirmation; existing autosave/draft mechanism (Decisions 29/38) is untouched |

---

## 17. Security / Tenant Isolation

**No `firestore.rules` change is required.** Verified this session
(§4.3): the `/products/{productId}` `allow create` rule validates only
`name`, and does not reject additional fields — Findings B/F's new
`sellingPrice`/`costPrice` fields at create time are already permitted
by the existing rule shape, exactly as `unitRelationship` already is
today. `allow update` for `/products/{productId}` already permits the
business owner (`isOwnerOf(businessId)`) — §7.2/§7.4's `fsBatch.update`
calls are issued from the same authenticated client context every
other `updateProduct`-style write already uses; no new write identity
or elevated permission is introduced.

**One documentation-only change flagged, not a rule-logic change:**
the existing rule's own explanatory comment ("every product-creation
call site... never sends costPrice/sellingPrice... at creation") will
become factually stale once §7.1/§7.4 ship and should be updated for
audit-trail accuracy as part of the same implementation commit — this
is a comment edit inside `firestore.rules`, not a permission change,
and is called out explicitly here rather than silently bundled.

Every new write in this Plan (§7.1, §7.2, §7.4) is scoped to
`businesses/{activeBusinessId}/products/{productId}` — the same path
every existing write in `AppContext.tsx` already uses. No new
collection, no cross-business read, no broadened permission.

---

## 18. Performance

- §7.1/§7.2: at most one additional field on an *already-open*
  Firestore write per Contagem confirmation (the existing `fsBatch`
  transaction `recordStockCount` already commits) — not a new write,
  not a new round trip. Bounded to once per product per confirmation
  (§7.1's dedup rule), never once per portion.
- §7.4: identical — one additional field on the *already-open*
  `setDoc`/`fsBatch.set` per batch write.
- §7.3: `findLatestRememberedProductMemory` is already called
  repeatedly today inside `AddStockView.tsx` against the same
  client-side `batches`/`stockCounts` arrays already loaded via
  existing `onSnapshot` listeners — no new Firestore read is
  introduced; this is a pure in-memory function call over data the
  component already holds.
- §8: catalog row rendering reads the same already-loaded `products`/
  `batches` arrays; no new per-row query.

No new listener, no new query, no N+1 pattern introduced anywhere in
this Plan.

---

## 19. Implementation Sequence

1. **Persistence/data-flow preparation** — add `stockCounts` to
   `PeriodicStockCountView.tsx`'s existing `useApp()` destructure
   (trivial; `stockCounts` already exists on `AppContext`, just not yet
   consumed here). No behavior change yet. *Acceptance:* component
   compiles, `stockCounts` in scope, zero test impact.
2. **First-Contagem cost-field removal (§7's Finding A)** — remove
   "Custo de Compra Original" from `NewProductInfoPanel`. *Tests:*
   `periodic-contagem-cost-price-removal.test.ts`,
   `periodic-stock-new-product-panel.test.ts` (diff-audit, update as
   needed per §14). *Acceptance:* AC-01, AC-02.
3. **Selling-price/selling-unit memory — write side (§7.1, §7.2)** —
   add the `type !== 'initial'`-gated writes to `recordStockCount`'s
   new- and existing-product branches. *Tests:* new tests per §14
   items 1–2 (persistence, edit-updates-memory, no-op-on-unchanged),
   plus the new Initial-Stock negative test. *Acceptance:* AC-03, AC-04,
   AC-07, AC-08, AC-18.
4. **Selling-price/selling-unit memory — read side (§7.3)** — extend
   `buildCatalogRow`/`handleModeAToggle` with the
   `findLatestRememberedProductMemory` fallback tier. *Tests:* new
   no-batch-case tests; diff-audit the existing 24-test reconciliation
   suite. *Acceptance:* AC-05, AC-06, AC-15, AC-16.
5. **Purchase cost memory (§7.4)** — add the change-detected
   `Product.costPrice` write to `addStockBatch`/
   `addMultipleStockBatches`. *Tests:* new purchase-memory tests.
   *Acceptance:* AC-09, AC-10.
6. **Product Catalog review surface (§7.5, §8)** — extend
   `DashboardView.tsx`'s row and `EditProductModal.tsx`'s fields.
   *Tests:* new catalog-display tests. *Acceptance:* AC-11, AC-12,
   AC-13, AC-14, AC-22.
7. **Multi-unit integration verification** — run the full Impala
   worked example end-to-end across steps 2–6. *Tests:* new multi-unit
   lifecycle test; regression against existing multi-portion/mode-A
   suites. *Acceptance:* AC-15, AC-16, AC-17.
8. **Full regression pass** — run every suite named in §14, confirm
   only the two pre-existing, unrelated failures remain (or zero, if
   those have since been separately fixed) and no new failure appears.
   *Acceptance:* AC-19, AC-20, AC-21.
9. **`firestore.rules` comment accuracy update** — update the stale
   explanatory comment identified in §17 (no logic change).
   *Acceptance:* documentation accuracy only, no test impact.

This order is dependency-driven: step 1 is a prerequisite for step 4;
steps 2–3 must land before step 4 can be meaningfully tested end-to-end
(a no-batch product needs to exist first); step 5 is independent of
2–4 and could be reordered earlier or run in parallel, but is
sequenced after for narrative clarity, matching the ownership split
(§6) between the two independent write authorities.

---

## 20. Acceptance Criteria

- **AC-01** — First Contagem never asks historical Cost Price. *(§7's
  Finding A removal.)*
- **AC-02** — New-to-catalog does not mean newly purchased; no
  confirmation is blocked or warned on absent historical cost.
- **AC-03** — First Contagem selling unit persists (`unitRelationship.sellingUnit`).
- **AC-04** — First Contagem selling price persists (`Product.sellingPrice`,
  §7.1, canonical-portion rule).
- **AC-05** — Second Contagem loads remembered selling unit, including
  the no-batch case (§7.3).
- **AC-06** — Second Contagem loads remembered selling price, including
  the no-batch case (§7.3).
- **AC-07** — Selling-price edit updates memory (§7.2), only on actual
  change.
- **AC-08** — Selling-price edit does not change purchase cost
  (structural — §7.2 never touches `Product.costPrice`).
- **AC-09** — Purchase-cost update does not change selling price
  (structural — §7.4 never touches `Product.sellingPrice`).
- **AC-10** — Cost/Cost Unit come from the purchase workflow exclusively
  (§7.4, §9).
- **AC-11** — Catalog exposes all six approved fields (§7.5, §8).
- **AC-12** — Catalog Selling Price reflects Contagem memory, not raw
  latest-batch price (§8's resolution order).
- **AC-13** — Catalog Cost reflects purchase memory (§8).
- **AC-14** — Unit relationship remains governed, unchanged mechanism
  (§7's Finding C/Decision 37 item (c)).
- **AC-15** — Confirmed `sellingUnit` remains the valuation reference
  point — the signed reconciliation is not reopened (§7.3).
- **AC-16** — `units[0]` is the fallback only when `sellingUnit` is
  absent — unchanged (§7.3).
- **AC-17** — Add Portion remains temporary/current-count behavior,
  unaffected (§7, non-scope).
- **AC-18** — Initial Stock is not modified by Periodic Contagem
  memory writes — the `type !== 'initial'` guard, independently tested
  (§12, §14).
- **AC-19** — Business Worth formula remains unchanged (§11).
- **AC-20** — FR-67 remains unchanged (§10).
- **AC-21** — Tenant isolation remains intact — all new writes scoped
  to `activeBusinessId` (§17).
- **AC-22** — No unrelated Product Catalog redesign occurs — search,
  filtering, navigation untouched (§7.5).

No additional criteria beyond the instructed list were found necessary
by this Plan.

---

## 21. Explicit Exclusions

- Business Worth formula redesign.
- FR-67 / `deriveCostContribution` redesign.
- Cost Price reintroduction into Contagem, in any form, for any
  portion or unit.
- Initial Stock redesign.
- Add Stock redesign (its UI is untouched; only its shared
  `AppContext.tsx` function gains one conditional field, §7.4).
- Smart Stock Entry redesign.
- A new Product-level selling-portions schema.
- A new conversion engine (`getConversionFactor`/`resolveUnitAwarePrice`
  are reused verbatim throughout).
- A new valuation engine.
- `firestore.rules` logic changes (only the one explanatory comment,
  §17).
- `firestore.indexes.json` changes — not identified as necessary by
  this Plan; no new query shape is introduced (§18).
- Unrelated Product Catalog redesign — search, filtering, navigation.
- Unrelated modules.
- Background jobs — no background job is introduced or required
  anywhere in this Plan; every write is triggered synchronously by an
  explicit Owner action (Contagem confirmation or batch entry).
- Cross-business queries.
- Scheduled synchronization.
- Hidden price mutation unrelated to an operator action — every write
  in this Plan traces to either a Contagem confirmation or a purchase-
  batch entry, both explicit Owner-initiated actions; nothing runs on
  a timer, a listener side-effect, or any other implicit trigger.

---

## 22. Governance Gates

- Decision 37 → §44 → §45 amendment: **ACCEPTED AND SIGNED.**
- Rule 8 Assessment (combined scope): **READY AFTER IMPLEMENTATION
  PLAN.**
- **This Implementation Plan: ACCEPTED — AUTHORIZED TO PROCEED TO
  IMPLEMENTATION AUTHORIZATION** (§23, below: "I APPROVE AND ACCEPT
  THE IMPLEMENTATION PLAN," SABUSHIMIKE MASCENI, 30 August 2026).
- Implementation Authorization: **NOT YET CREATED.**
- **No code implementation is authorized by the existence of this
  Plan, even now accepted.** The next governance step is drafting an
  Implementation Authorization; only after a *signed* Implementation
  Authorization may any code, test, or `firestore.rules` change be
  made in furtherance of this scope.

---

## 23. Product Architect Acceptance

**Status:** ✅ **ACCEPTED.**

> I have reviewed the Implementation Plan as written — the
> Implementation Boundary (§7), Data Ownership Table (§6), Catalog
> Design (§8), the FR-67/Business Worth/Initial Stock/Add Stock
> boundaries (§9–§12), Persistence Design (§13), Test Strategy (§14),
> Migration determination (§15), Implementation Sequence (§19),
> Acceptance Criteria (§20), and Explicit Exclusions (§21) — and
> confirm this introduces no change beyond what is recorded above, no
> reopening of the signed §45 amendment or the Rule 8 Assessment, and
> no redesign of Business Worth, FR-67, Initial Stock, Add Stock, Smart
> Stock Entry, or the Products module. This Implementation Plan is
> **ACCEPTED**, effective this session.

Decision: I APPROVE AND ACCEPT THE IMPLEMENTATION PLAN

**Product Architect:** SABUSHIMIKE MASCENI

Date: 30 August 2026

This acceptance authorizes proceeding to drafting an Implementation
Authorization. It does not, on its own, authorize any code, test, or
`firestore.rules` change — a separate, signed Implementation
Authorization remains required before any implementation work begins.
