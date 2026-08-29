Rule 8 Assessment

# Rule 8 Assessment — First-Time Contagem Cost Removal, Selling-Price/
# Selling-Unit Memory & Product Catalog (Proposed §45)

**Governing chain:** `BDR-pending-business-worth-evolution-measurement-model.md`
§4, Decision 37 (✅ APPROVED AND SIGNED, SABUSHIMIKE Masceni, 23 August
2026) → `business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
(§44, ✅ ACCEPTED AND SIGNED, FR-71–FR-77) → [`decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`](../specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md)
(proposed §45, ✅ **ACCEPTED AND SIGNED by the Product Architect** —
"I APPROVE AND SIGN," SABUSHIMIKE MASCENI, 30 August 2026 — FR-78
through FR-88 in full) → **this Rule 8 Assessment**.

**Scope of this assessment:** the signed §45 amendment's **complete
combined approved scope** — FR-78 through FR-88 — covering, together:
(1) removal of the first-time "Custo de Compra Original" historical-
cost input from Periodic Contagem; (2) durable selling-price/selling-
unit Product Memory establishment from a product's first Contagem and
automatic reuse on every subsequent Contagem; (3) the two-independent-
authorities principle separating Cost/Cost Unit (purchase-workflow-
owned) from Selling Price/Selling Unit (Contagem-owned); (4) latest-
purchase-cost memory update; and (5) the Product Catalog as the narrow
reviewable surface for all six fields. This assessment does not reduce
the task to "remove Custo de Compra Original" alone, per explicit
instruction.

**Explicitly out of scope, per the amendment's own §6/§18 and
unaffected by anything below:** Initial Stock; Add Stock's or Smart
Stock Entry's own purchase-cost entry behavior or governance status;
FR-67's cost-basis derivation engine or `getConversionFactor`; the
existing-product selling-unit reference-point reconciliation's own
mechanics (its *use* is investigated below, its *rule* is not
reopened); the Business Worth formula; Mode A/Mode B mechanics; the
Selling Price deviation warning; a redesign of the Products module; a
new Product-level selling-portions schema.

**Lifecycle state:** Amendment Accepted & Signed → **Assessed (this
document)** → Implementation Plan NOT YET CREATED → Implementation
Authorization NOT YET CREATED → Implementation NOT YET AUTHORIZED.

**Baseline verified fresh, this session:** `main = origin/main =
1714c69` (the commit that landed the signed §45 amendment itself),
working tree clean, confirmed via `git fetch origin main` immediately
before this assessment began. The amendment document was read
completely and fresh from the repository (all 21 sections, including
the signed §21 acceptance) as part of this session, independent of any
prior session's summary.

**Governance-state pre-check (per instruction, before drafting):** No
existing governance artifact was found to materially contradict the
signed amendment. Every citation the amendment makes to Decision 37, to
§44, to FR-67, and to the existing-product selling-unit reconciliation
was re-verified directly against the cited source documents and against
the live code in this session (§2, below) and found accurate. No
contradiction requiring a stop-and-report was found; this assessment
proceeds.

---

## 1. Objective

Determine whether the signed amendment's eleven Functional Requirements
(FR-78–FR-88), across all five areas of its combined scope, are
technically safe, fully bounded, and buildable against the actual
current codebase — identifying exactly what already exists and can be
reused, what is genuinely missing, where risk exists, and what an
Implementation Plan must resolve — without inventing new business
requirements and without silently resolving anything the amendment
itself left open in a way that exceeds Rule 8's own authority.

## 2. Governance Inputs Read, Fresh, This Session

- `decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`
  — full document, all 21 sections, including the signed §21
  acceptance ("I APPROVE AND SIGN," SABUSHIMIKE MASCENI, 30 August
  2026).
- `BDR-pending-business-worth-evolution-measurement-model.md` §4 item
  37 (Decision 37, items a–j) — re-read in full to verify the
  amendment's own citations of items (b)/(i) against the actual
  original text, not from memory.
- `business-worth-evolution-rule8-assessment.md`, the "Rule 8
  Assessment Addendum — First-Time Contagem Product-Information Model
  (BDR Decision 37)" section (✅ ACCEPTED, 23 August 2026) — re-read for
  Decision 37's own execution-record lineage (Findings FT-1–FT-7).
- `business-worth-evolution-implementation-authorization.md` §36–§42
  (Decision 37's Execution Records B.1–B.5) — re-read to confirm
  `NewProductInfoPanel`'s implementation history and current authorized
  shape.
- `business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
  (§44, FR-71–FR-77) — re-read in full for the per-portion Cost Price
  removal principle this amendment extends.
- `business-worth-evolution-periodic-contagem-cost-price-removal-rule8-assessment.md`
  (§44's own Rule 8 Assessment) — re-read for its structural convention
  (this document follows the same convention) and to confirm §44's own
  scope boundary against this assessment's scope.
- `periodic-contagem-existing-product-selling-unit-memory-implementation-authorization.md`
  and `uom-specification-section4-existing-product-contagem-reconciliation-addendum.md`
  (✅ SIGNED, 29 August 2026) — re-read for the existing-product
  selling-unit reference-point rule this amendment's FR-82 must remain
  consistent with.
- `apps/tenant/src/types.ts` — `Product`, `UnitRelationship`,
  `StockBatch`, `StockCountItem` — re-read for current schema shape.
- `apps/tenant/src/context/AppContext.tsx` — `addStockBatch`,
  `addMultipleStockBatches`, `recordStockCount`, `updateProduct`,
  `confirmProductUnitRelationship` — read directly, this session, not
  assumed from the amendment's own citations.
- `apps/tenant/src/components/PeriodicStockCountView.tsx` —
  `NewProductInfoPanel`, `buildCatalogRow`, `handleModeAToggle` — read
  directly, this session.
- `apps/tenant/src/components/DashboardView.tsx`,
  `EditProductModal.tsx` — read directly, this session, for the
  Product Catalog's current implementation.
- `apps/tenant/src/lib/fr67CostBasisConversion.ts` — `deriveCostContribution`
  — read directly, this session, to independently confirm FR-67's
  graceful no-basis handling.
- `firestore.rules` — the `/products/{productId}` and `/batches/{batchId}`
  rules — read directly, this session, for security/tenant-isolation
  implications.

**No documentation-sync discrepancy found.** The amendment's own header
already reads "✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT," §21's
signature block matches exactly what was reported accepted, and every
governance citation the amendment makes was independently reproduced
against the cited source in this session.

## 3. Accepted Business Constraints (restated, not re-decided)

Every Finding below cites back to one of these, established and
accepted by the amendment, not reopened here:

- **[C1]** No product — first-time or existing, any portion, any unit —
  is ever asked for historical/original purchase cost in Periodic
  Contagem (FR-78, FR-79, FR-80).
- **[C2]** A product's selling price and selling unit, once established
  in Contagem, are durable Product Memory, automatically reused on
  every subsequent Contagem, and remain independently editable without
  affecting purchase cost (FR-81–FR-84).
- **[C3]** Purchase Cost/Cost Unit and Selling Price/Selling Unit are
  two independent write authorities; no single Owner action or UI
  surface may combine them (FR-85).
- **[C4]** Purchase Cost/Cost Unit memory updates from the latest
  applicable purchase batch when its cost differs; this is a business
  requirement whose exact write-path mechanism is left to Rule 8
  (FR-86).
- **[C5]** A Product Catalog surface exposes Product Name, Cost, Cost
  Unit, Selling Price, Selling Unit, and Unit Relationship for every
  active product, with Selling Price editable and Cost/Cost Unit
  read-only from that surface (FR-87, FR-88).
- **[C6]** Business Worth, FR-67's cost-basis engine, §44's per-portion
  removal, the existing-product selling-unit reference-point rule, Add
  Stock, Smart Stock Entry, and Initial Stock are all explicitly
  unaffected (§6/§14/§16 of the amendment).

---

## 4. Findings

### Finding A — First-Contagem historical Cost Price removal

- **Current behavior.** `NewProductInfoPanel` (`PeriodicStockCountView.tsx`,
  lines ~370–470) renders a live, Owner-facing "Custo de Compra
  Original" section for any product not already in the catalog: a
  purchase-unit text input and a purchase-cost-per-purchase-unit
  numeric input, with the copy "Introduza o custo original uma única
  vez, na unidade de compra do produto — nunca por porção." Verified
  directly, this session, unchanged since the amendment was drafted.
- **Required behavior.** This input group must be removed (FR-80). No
  first-time Contagem confirmation may be blocked or warned on account
  of absent historical cost (FR-79).
- **Evidence.** `PeriodicStockCountView.tsx` lines 370–470 (component
  definition); the `purchaseUnit`/`purchaseCost` props threaded through
  `newProductInfo` state (lines ~3894–3942) into
  `recordStockCount`'s cost-basis-synthesis logic (`AppContext.tsx`
  lines ~4372–4383, the `costBasisByProductName` "genuinely new
  product" branch) — this synthesis logic reads the purchase-unit
  portion's `costPrice` as its source, so removing the panel's inputs
  removes the Owner-entered value that branch currently reads.
- **Governance classification.** Directly authorized (FR-78, FR-80).
- **Implementation impact.** UI-layer removal of one input group and
  its state plumbing (`purchaseUnit`/`purchaseCost` fields in
  `newProductInfo`). The downstream cost-basis-synthesis branch in
  `recordStockCount` (lines ~4372–4383) reads `purchaseUnitItem.costPrice`
  from the submitted `items` array — once the panel no longer collects
  it, that field is simply absent/zero for a genuinely new product,
  which the branch's own guard (`typeof purchaseCost !== 'number' ...
  continue`) already handles safely by skipping cost-basis synthesis
  entirely — no crash, no fabricated value. This is the exact §44
  FR-73 "unknown, never fabricated zero" behavior, now correctly
  reached for the first-time case too.
- **Regression risk.** Low. `UnitRelationshipChainEditor` and the
  selling-unit selector inside the same panel are untouched and must
  not be removed — implementation must remove only the "Custo de
  Compra Original" `<div>` block and its two inputs, not the panel
  itself (per the amendment's own "What this does not do," §8).
- **Reuse opportunity.** None needed — this is a subtractive change.
  `tests/periodic-contagem-cost-price-removal.test.ts` and
  `tests/periodic-stock-new-product-panel.test.ts` already exist and
  must be checked for assertions that assume the removed fields are
  present (regression risk for Gate G, below).

### Finding B — Selling Price persistence from first Contagem

- **Current behavior.** Direct inspection of all three `Product`-
  creation sites in `AppContext.tsx` — `addStockBatch` (line 2479),
  `addMultipleStockBatches` (line 3121), and `recordStockCount` (line
  4435) — confirms **none of the three ever writes `Product.sellingPrice`
  at creation.** Each writes only `id`, `name`, `createdAt`, and,
  conditionally, `unitRelationship`. This independently confirms the
  amendment's own §10 finding.
- **Required behavior.** When the Owner establishes a selling price
  during a product's first Contagem, that price must be persisted as
  `Product.sellingPrice` (FR-81).
- **Evidence.** `AppContext.tsx` lines 4432–4440 (the `recordStockCount`
  new-product literal) — confirmed by direct reading, this session,
  reproducing exactly the amendment's own §10/§20 traceability claim.
- **Governance classification.** Directly authorized (FR-81). No new
  schema — `Product.sellingPrice?: number` already exists (`types.ts`
  line 415), documented as a "reference price" field.
- **Implementation impact.** `recordStockCount`'s new-product-creation
  branch must be extended to include `sellingPrice` (sourced from the
  submitted item's own selling-price entry) in the `newProd` literal.
  **Material scoping risk identified independently by this
  assessment, not named in the amendment:** `recordStockCount` is a
  **shared function**, called by both `PeriodicStockCountView.tsx`
  (line 2399) and `InitialStockCountView.tsx` (line 1135), and already
  distinguishes the two via its own `type: StockCountType` parameter
  (`'initial' | 'periodic'`), used elsewhere in the same function
  (e.g. lines 4264, 4284). **Any write of `Product.sellingPrice` added
  to this shared new-product branch must be conditioned on `type ===
  'periodic'`**, or it will silently extend selling-price memory
  establishment to Initial Stock — which §6 of the amendment explicitly
  places out of scope ("Initial Stock... untouched... not decided by
  this amendment"). This condition is cheap and low-risk (the `type`
  variable is already in scope at that line), but it is a concrete,
  mandatory implementation constraint an Implementation Plan must state
  explicitly.
- **Regression risk.** Low, contingent on the `type === 'periodic'`
  guard above being applied. Without it: moderate risk of silently
  reopening the amendment's own explicit Initial Stock exclusion.
- **Reuse opportunity.** The existing `Product` schema and the existing
  `newProd` literal construction pattern are reused verbatim — only a
  conditional field addition, no new write mechanism.

### Finding C — Selling Unit persistence from first Contagem

- **Current behavior.** Selling-unit persistence is **partially
  implemented** — better than selling-price persistence (Finding B).
  For a **multi-level unit-relationship chain** product, the operator's
  chosen `sellingUnit` (from `NewProductInfoPanel`'s selector) is
  already attached to the candidate `unitRelationship` object before
  submission (`PeriodicStockCountView.tsx` lines 1489/2391:
  `...(effectiveSellingUnit ? { sellingUnit: effectiveSellingUnit } :
  {})`), and that candidate — including its `sellingUnit` — **is**
  already written onto the new `Product.unitRelationship` by
  `recordStockCount` today (line 4438, `unitRelationshipByProductName`
  lookup). For a **single-functional-unit** product (no chain at all),
  no `UnitRelationship` object is constructed, so no `sellingUnit` is
  persisted either — consistent with the amendment's own §3.A framing
  ("no selector, no relationship, the one unit is simply the selling
  unit") and not a gap requiring a fix, since there is nothing
  ambiguous to remember in that case.
- **Required behavior.** The selling unit established at first Contagem
  must become durable memory (FR-81), consistent with FR-82's read-side
  reuse.
- **Evidence.** `PeriodicStockCountView.tsx` line 1489/2391 (candidate
  construction); `AppContext.tsx` lines 4437–4439 (write path).
- **Governance classification.** ALREADY IMPLEMENTED for the multi-unit
  case; not applicable (by design) for the single-unit case. No
  additional FR-81 work is required for selling-unit persistence
  specifically — Finding B's gap is the selling-**price** side only.
- **Implementation impact.** None required beyond Finding B's own
  `type === 'periodic'` guard, which already covers this same write
  path (the `unitRelationship` write happens in the identical
  conditional block).
- **Regression risk.** None — no change needed.
- **Reuse opportunity.** Full reuse; this is the one piece of FR-81
  already correctly built.

### Finding D — Automatic loading of selling price/unit in subsequent Contagens

- **Current behavior — a materially incomplete resolution, identified
  independently by this assessment.** `buildCatalogRow` and
  `handleModeAToggle` (`PeriodicStockCountView.tsx`, lines 663–708 and
  1612–1650) already implement the signed existing-product
  selling-unit reference-point reconciliation (commit `87814a9`) — but
  **both resolve the remembered selling *price* exclusively from the
  product's latest `StockBatch`, never from `Product.sellingPrice`
  directly.** Specifically:
  - `buildCatalogRow`'s two-tier resolution only re-denominates a
    remembered price when **both** a confirmed `sellingUnit` **and** a
    `latestBatch` exist (`if (confirmedSellingUnit && latestBatch)`,
    line 690). When no `latestBatch` exists — exactly the case of a
    product established purely through Contagem, with no Add Stock
    purchase ever recorded, which is the central real-world scenario
    this entire amendment chain exists to support — the function falls
    through to `unit = ''` (never set to the confirmed `sellingUnit`)
    and `sellingPrice` sourced from raw `product.sellingPrice` (line
    671), so the selling **price** would load correctly (once Finding
    B ships) but the selling **unit** would not.
  - `handleModeAToggle`'s `defaultReferencePrice` is set **only** when
    a `latestBatch` exists (lines 1642–1647: `if (latestBatch) { const
    resolved = resolveUnitAwarePrice(latestBatch.sellingPrice, ...) }`)
    — with no `latestBatch`, `defaultReferencePrice` stays `''`
    regardless of any `Product.sellingPrice` value, even after Finding
    B ships. `defaultReferenceUnit`, by contrast, already correctly
    prefers `relationship?.sellingUnit` independent of any batch (line
    1636), so only the Mode A reference **price** default is affected.
- **Required behavior.** Every Contagem after a product's first must
  automatically load the remembered selling unit **and** selling price,
  without requiring re-entry, for a product with or without any
  purchase batch (FR-82).
- **Evidence.** `PeriodicStockCountView.tsx` lines 663–708 (`buildCatalogRow`),
  1612–1650 (`handleModeAToggle`) — read directly, this session.
- **Governance classification.** PARTIALLY IMPLEMENTED. The confirmed-
  `sellingUnit`-as-reference-point *rule* is correctly implemented and
  **must not be reopened** (per the amendment's own §6/§16 and this
  assessment's own instruction) — the gap is narrower: both functions'
  remembered-*price* resolution needs a **second, batch-independent
  fallback branch** reading `product.sellingPrice` directly when no
  `latestBatch` exists, and `buildCatalogRow` additionally needs its
  `unit` default widened to the confirmed `sellingUnit` in that same
  no-batch case. This is an *extension* of the existing two-tier
  resolution (adding a third tier: confirmed-`sellingUnit` +
  `Product.sellingPrice`, no batch required), not a redesign or a
  reopening of the signed reconciliation's own preference order
  (`sellingUnit` over `units[0]`), which is fully preserved.
- **Implementation impact.** Two small, localized additions —
  `buildCatalogRow`'s fallback branch and `handleModeAToggle`'s
  `defaultReferencePrice` computation — each reusing
  `product.sellingPrice` directly (no new resolution function, no new
  conversion logic, since a `Product.sellingPrice`-under-its-own-
  `sellingUnit` needs no unit conversion at all — it is already
  denominated in the unit it will be read in).
- **Regression risk.** Low, provided the existing `latestBatch`-present
  branches (the already-signed, already-tested reconciliation) are left
  completely untouched and the new branch is strictly additive,
  reachable only in the no-batch case the existing code does not
  currently handle. Must be diff-audited against
  `tests/periodic-contagem-existing-product-selling-unit-memory.test.ts`'s
  existing 24 tests to confirm no existing assertion's premise (e.g.
  "no batch → blank") is broken by adding this new fallback — several
  of those tests likely assert exactly the gap this Finding closes, and
  must be reviewed, not blindly extended.
- **Reuse opportunity.** High — no new engine; `product.sellingPrice`
  is already in scope in both functions' parameter (`product`), it is
  simply not yet read in the no-batch branch.

### Finding E — Operator selling-price edit updates memory

- **Current behavior.** Confirmed by direct inspection: **no code path
  anywhere in `AppContext.tsx` writes `Product.sellingPrice` from any
  Contagem confirmation, for a new or existing product.** The only
  `updateProduct` call sites are: `active: true` (reactivation,
  `AddStockView.tsx` line 1253), `active: false` (deactivation,
  `ProductDetailModal.tsx` line 92), a manual edit
  (`EditProductModal.tsx` line 42, the Owner's own catalog edit), and
  `unitRelationship` confirmation (`confirmProductUnitRelationship`,
  `AppContext.tsx` line 6178, a separate deliberate-action function).
  A grep for any call passing both `costPrice`/`sellingPrice` returned
  zero automatic (non-manual) matches.
- **Required behavior.** When the Owner edits the selling price at any
  later Contagem, the new value becomes the current `Product.sellingPrice`
  memory (FR-83).
- **Evidence.** As above; independently reproduces the amendment's own
  §10 "required by this amendment / not yet implemented" framing —
  this assessment confirms it extends beyond first-Contagem creation to
  every later edit as well.
- **Governance classification.** NOT IMPLEMENTED. Requires new logic:
  `recordStockCount`'s **existing-product** path (the `if (!product)`
  branch's `else` — an existing product being counted again) must
  additionally call `updateProduct`/an equivalent write when the
  submitted selling price differs from the product's current
  `sellingPrice` memory, again gated to `type === 'periodic'` (Finding
  B's same constraint applies identically here).
- **Implementation impact.** A second write path, symmetrical to
  Finding B's new-product path, but triggered on every periodic
  Contagem confirmation for an existing product, not only its first.
  Should be batched into the same Firestore write (`fsBatch`,
  already used throughout `recordStockCount`) rather than a separate
  round trip, for atomicity with the Contagem confirmation itself.
- **Regression risk.** Moderate if implemented naively (e.g. writing on
  *every* Contagem regardless of change, generating unnecessary
  `updatedAt` churn) — should write conditionally on an actual value
  change, mirroring the discipline `updateProduct`'s own doc comment
  already establishes ("Edits catalog metadata only... never touches
  batches"). Low risk if scoped correctly.
- **Reuse opportunity.** High — reuses `updateProduct`'s existing
  signature and the existing `fsBatch` transaction already open in
  `recordStockCount`; no new write mechanism.

### Finding F — Purchase cost/cost-unit memory updates from latest purchase

- **Current behavior.** Confirmed by direct inspection: `addStockBatch`'s
  new-product branch (line 2479) and `addMultipleStockBatches`'s (line
  3121) — the Add Stock family — **also never write `Product.costPrice`**,
  matching the identical gap pattern found in Findings B/E for selling
  price. No code path updates an **existing** product's `Product.costPrice`
  from a new batch either — the same `updateProduct` call-site audit
  (Finding E) applies identically here: only `EditProductModal`'s
  manual edit ever sets `Product.costPrice`.
- **Required behavior.** When a new purchase batch carries a different
  cost than the product's current remembered cost, that becomes the
  product's current Cost/Cost Unit memory, reviewable via the catalog
  (FR-86).
- **Evidence.** `AppContext.tsx` lines 2444–2482 (`addStockBatch`),
  2975–3130 area (`addMultipleStockBatches`) — read directly, this
  session.
- **Governance classification.** NOT IMPLEMENTED. FR-86 itself already
  states its exact write-path mechanism is left to Rule 8 (§12 of the
  amendment) — this assessment resolves that: the lowest-risk path is
  extending `addStockBatch`'s (and `addMultipleStockBatches`'s)
  existing new-batch-write transaction to also set `Product.costPrice`
  (and implicitly, `Cost Unit` — see Finding H below for how "Cost
  Unit" is represented) whenever the batch's own cost differs from the
  product's current remembered cost — mirroring Finding E's "write
  only on change" discipline. **This is squarely inside the Add Stock/
  Smart Stock Entry family's own existing write transaction** — it does
  not touch Contagem at all, and does not require the `type ===
  'periodic'` guard Findings B/E need (Add Stock has no `type`
  ambiguity to guard against).
- **Implementation impact.** A conditional field addition inside two
  already-open Firestore writes (`addStockBatch`'s `setDoc`,
  `addMultipleStockBatches`'s `fsBatch.set`) — no new transaction, no
  new engine.
- **Regression risk.** Low — purely additive; must not alter
  `StockBatch.costPrice` itself (FR-67's own cost-basis source, §6 of
  the amendment — untouched) or any embedded-profit calculation, both
  of which read from `StockBatch`, never from `Product.costPrice`
  (confirmed by `types.ts`'s own header comment on `Product`: "reference
  price only... NOT used by any Investment/Market/Profit calculation").
- **Reuse opportunity.** High — reuses the existing purchase-write
  transactions; no new mechanism.

### Finding G — Selling memory and purchase-cost memory remain independent

- **Current behavior.** Trivially true today, because **neither memory
  is currently written automatically at all** (Findings B, E, F) — there
  is no code today that could conflate them, because there is no code
  writing either.
- **Required behavior.** Once both write paths exist (Findings B/E and
  F), they must remain structurally independent — no single Owner
  action or code path may write both (FR-85).
- **Evidence.** Findings B, E, F above.
- **Governance classification.** DIRECTLY AUTHORIZED (FR-85) as a
  **design constraint** on the implementation Findings B/E/F introduce,
  not an independently existing mechanism to assess today.
- **Implementation impact.** None beyond ensuring Findings B/E's
  Contagem-side write (touches only `Product.sellingPrice`/
  `unitRelationship.sellingUnit`) and Finding F's Add-Stock-side write
  (touches only `Product.costPrice`) remain two separate code
  locations, never merged into one shared "update product memory"
  function that writes both from a single call. Two small, separate
  additions are the correct shape, not a shared helper.
- **Regression risk.** None, provided the two writes are kept in their
  respective, already-separate call sites (`recordStockCount` vs.
  `addStockBatch`/`addMultipleStockBatches`) as Findings B/E/F already
  specify.
- **Reuse opportunity.** N/A — this finding is a boundary condition on
  new code, not a reuse question.

### Finding H — Reviewable Product Catalog information surface

- **Current behavior.** A reviewable catalog list **already exists**
  (`DashboardView.tsx`, `filteredProducts` rendering, lines ~952–1030):
  search, category/supplier filters, and an existing `EditProductModal`
  for editing `costPrice`/`sellingPrice` as free-form "reference"
  fields (`EditProductModal.tsx`, confirmed by direct reading: both
  fields are currently editable with no read-only distinction, and
  neither "Cost Unit," "Selling Unit," nor "Unit Relationship" is
  displayed or editable there at all). The list's own displayed
  "COMPRA"/"VENDA" columns are sourced from `displayBatch` (the
  product's active-or-latest `StockBatch`), **not** from
  `Product.costPrice`/`Product.sellingPrice` (lines ~970–971, `const
  costPriceText = displayBatch ? ... `). Unit Relationship is not
  displayed anywhere in the existing list.
- **Required behavior.** The catalog must expose, at minimum, Product
  Name, Cost, Cost Unit, Selling Price, Selling Unit, and Unit
  Relationship, with Selling Price editable and Cost/Cost Unit
  read-only (FR-87, FR-88).
- **Evidence.** `DashboardView.tsx` lines 195–1030;
  `EditProductModal.tsx` lines 1–60 — read directly, this session.
- **Governance classification.** PARTIALLY IMPLEMENTED. The list/modal
  shell is ALREADY IMPLEMENTED and reusable; the specific six-field
  exposure, the Selling-Price-editable/Cost-read-only split, and Unit
  Relationship display are NOT IMPLEMENTED.
- **Implementation impact — sourcing decision resolved by this
  assessment (per the amendment's own §18 deferral to Rule 8).**
  Consistent with §11's two-authorities principle: the catalog's
  **Selling Price/Selling Unit** columns should read from
  `Product.sellingPrice`/`Product.unitRelationship.sellingUnit`
  (Contagem-owned memory, once Findings B/C/E populate it), while
  **Cost/Cost Unit** columns should read from `Product.costPrice`
  (purchase-workflow-owned memory, once Finding F populates it) with a
  fallback to the latest `StockBatch`'s own cost/unit for a product
  whose `Product.costPrice` has not yet been backfilled by Finding F
  (i.e. one purchased before this feature ships) — mirroring exactly
  the "unknown, not a fabricated figure" discipline §44/FR-73 already
  established, applied here to catalog display rather than Contagem
  entry. This resolves the amendment's own explicitly-deferred sourcing
  question (§13/§18) as a *technical direction*, not a new business
  decision — the *ownership* was already decided by the amendment
  (§11); this is only *which existing field implements that ownership*.
  `EditProductModal` needs its `costPrice` input changed to read-only
  display (or removed in favor of a labeled, non-editable figure) and
  a `sellingUnit`/`unitRelationship`-derived display added — a form
  change, not a redesign, consistent with §6's "no Products module
  redesign" boundary.
- **Regression risk.** Low if scoped to `EditProductModal`'s existing
  fields and `DashboardView.tsx`'s existing row rendering only, per the
  amendment's own explicit "no redesign" instruction — Implementation
  Plan must resist any temptation to also touch search, filtering, or
  navigation, none of which this amendment authorizes.
- **Reuse opportunity.** High — the screen, the modal, the filter
  logic, and the row-rendering pattern are all reused verbatim; only
  field exposure and one field's editability change.

### Finding I — Multi-unit valuation/reference-unit interaction

- **Current behavior, verified against the Impala example (1 Cx = 4
  Emb = 24 Un, sellingUnit = Un, sellingPrice = 50 MZN/Un, counted 3
  Cx + 1 Emb + 5 Un):**
  - **First Contagem setup** — `UnitRelationshipChainEditor` (unaffected
    by this amendment, Finding A) collects the full chain; the "+
    Adicionar Porção" pattern (Decision 37 item (d), also unaffected)
    allows the three separate physical portions (3 Cx, 1 Emb, 5 Un) to
    be recorded as three distinct rows, never merged — confirmed by
    `stockCountPortionGrouping.ts`'s existing, unmodified
    `groupRowsByProductName`/`RowGroup` mechanism.
  - **Selling-unit persistence** — ALREADY IMPLEMENTED for this exact
    multi-level-chain case (Finding C).
  - **Selling-price persistence** — NOT IMPLEMENTED (Finding B) — this
    is the gap this amendment closes.
  - **Later Contagem loading** — PARTIALLY IMPLEMENTED (Finding D):
    the confirmed `sellingUnit` (`Un`) is already the correct reference
    point once a batch exists to convert from; the no-batch fallback
    gap (Finding D) applies identically to this multi-unit case.
  - **Mixed-unit valuation reference / Mode A** — `handleModeAToggle`'s
    `defaultReferenceUnit` already correctly resolves to the confirmed
    `sellingUnit` (`Un`) over `units[0]` (`Cx`) for this product,
    independent of Finding D's price-only gap — confirmed directly,
    line 1636.
  - **Add Portion behavior** — unaffected by this amendment in every
    respect (§6); reused verbatim.
  - **Confirmed `sellingUnit` vs. `units[0]`; `units[0]` fallback** —
    this is precisely the already-signed reference-point reconciliation
    (commit `87814a9`). **This assessment does not reopen it.** Finding
    D's fallback addition operates strictly in the "no batch exists at
    all" case that reconciliation's own existing logic does not
    currently reach — it does not alter the preference order
    (`sellingUnit` over `units[0]`) in any case where a batch does
    exist.
- **Required behavior.** All of the above must work together correctly
  for a multi-unit product across its full lifecycle (§9 of the
  originating instruction).
- **Evidence.** As cited per bullet above.
- **Governance classification.** Composite of Findings B–D, C, and the
  already-accepted Decision 37 item (d)/reconciliation — no new finding
  beyond what those already establish; this Finding exists to confirm
  they compose correctly for the specific worked example, which they
  do, once Findings B/D's gaps are closed.
- **Implementation impact.** None beyond Findings B/D's own scope —
  this Finding identifies no additional multi-unit-specific work.
- **Regression risk.** Covered by Findings B/D's own regression
  analysis; `tests/periodic-stock-multi-portion-valuation.test.ts`,
  `tests/periodic-stock-arbitrary-length-relationship.test.ts`, and
  `tests/periodic-stock-add-portion.test.ts` already exist and must be
  run as regression checks (Gate G, below) — note two of these
  (`periodic-stock-shop-switch-guard`,
  `periodic-stock-multi-portion-valuation`) were already failing on
  baseline `87814a9` per that commit's own message, a pre-existing,
  unrelated condition this assessment does not attribute to the §45
  amendment.
- **Reuse opportunity.** Full — no new multi-unit mechanism of any
  kind.

### Finding J — Business Worth non-interference

- **Current behavior, traced directly this session.**
  `productValuationTotal` (`AppContext.tsx` line ~4699) is set to
  `Number(normalizedTotalSellingValue.toFixed(2))` — `normalizedTotalSellingValue`
  comes from `normalizeStockCountItems(items, costBasisByProductName)`
  (line 4404), which computes selling value purely from each item's
  own `quantity × sellingPrice` (or Mode A/B's own established
  selling-price logic) — **cost basis (`costBasisByProductName`) is
  passed to `normalizeStockCountItems` only for its own separate
  `costPrice`/`totalValue` (cost-basis) output field, never mixed into
  `normalizedTotalSellingValue`.** `measuredBusinessWorth` is then
  computed from `productValuationTotal` plus/minus the business's
  existing expenses/withdrawals/embedded-profit terms (line ~4699
  onward) — no `costPrice`, `Product.costPrice`, or `StockBatch.costPrice`
  term anywhere in that chain.
- **Answers to the six explicit questions:**
  1. Does removal of first-Contagem historical cost affect Business
     Worth? **No** — it was never an input.
  2. What exact values feed product valuation? Selling price × quantity
     per portion (Mode A/B), summed as `normalizedTotalSellingValue`.
  3. Does selling price + quantity remain sufficient for the product
     valuation component? **Yes**, unchanged by this amendment.
  4. Does the new selling-price memory alter the existing Business
     Worth formula? **No** — memory only changes *where a default value
     is pre-filled from*, never the calculation itself, which always
     uses the Owner-confirmed value at confirmation time regardless of
     its origin.
  5. Does catalog creation alter Business Worth? **No** — the catalog
     (Finding H) is a read/edit surface over already-existing fields;
     it performs no calculation itself.
  6. Does cost memory alter Business Worth? **No** — `Product.costPrice`
     is documented, in-code, as never read by any
     Investment/Market/Profit calculation (`types.ts` header comment,
     independently reconfirmed this session); Finding F's write does
     not change that.
  7. Does FR-67 remain independent of the Business Worth calculation?
     **Yes** — `deriveCostContribution` (`fr67CostBasisConversion.ts`,
     read directly this session) computes only `StockCountItem.costPrice`/
     `totalValue` (cost-basis output), never `sellingPrice`/
     `totalSellingValue`; independently confirmed to gracefully return
     `{ value: quantity * rawCostPrice, derived: false }` (effectively
     `0` for a genuinely new product with no basis and no Owner-typed
     cost, post-Finding-A) rather than erroring or fabricating a
     nonzero figure — exactly §44's FR-73 discipline, now correctly
     reached for the first-time case.
- **Governance classification.** Fully consistent with the amendment's
  own §14 restatement — no discrepancy found.
- **Implementation impact.** None — no code change is required for
  Business Worth non-interference; it already holds.
- **Regression risk.** Low; `tests/business-worth-measured-value.test.ts`
  and `tests/business-worth-snapshot-product-valuation-line.test.ts`
  exist as regression coverage and should be run unchanged.
- **Reuse opportunity.** N/A — no new mechanism; this Finding confirms
  an invariant, not a build item.

### Finding K — Add Stock / Smart Stock Entry non-interference

- **Current behavior.** Add Stock (`AddStockView.tsx`/`addStockBatch`)
  and Smart Stock Entry (`smartStockEntryImagePreprocessing.ts` and the
  Smart Stock Entry data-flow into `addMultipleStockBatches`) are
  entirely separate code paths from Periodic Contagem
  (`PeriodicStockCountView.tsx`/`recordStockCount`) — confirmed by
  direct inspection; no shared function exists between the Contagem
  confirmation path and the Add Stock purchase path except the fully
  generic, unmodified `updateProduct`/`Product` schema itself.
- **Required behavior.** Neither this amendment's Contagem-side changes
  (Findings A, B, C, D, E) nor its Catalog changes (Finding H) may
  alter Add Stock's or Smart Stock Entry's own purchase-cost entry
  behavior (§6/§7 of the originating instruction).
- **Evidence.** As cited; `addStockBatch` and `recordStockCount` are
  confirmed, by direct reading, to share no code beyond the `Product`/
  `StockBatch` type definitions and the generic `updateProduct`
  function — Finding F's own change (§ above) is itself scoped
  entirely inside `addStockBatch`/`addMultipleStockBatches`, never
  touching `recordStockCount`, and vice versa for Findings B/C/E.
- **Governance classification.** DIRECTLY AUTHORIZED as a boundary
  (§6/§7); confirmed non-interfering by this assessment's own
  independent code trace, not merely restated from the amendment.
- **Implementation impact.** None beyond Findings B/E's (Contagem-side)
  and Finding F's (Add-Stock-side) own already-scoped changes, kept in
  their respective, separate call sites.
- **Regression risk.** Low, provided Finding F's write is added only
  inside `addStockBatch`/`addMultipleStockBatches`'s own transaction
  and Findings B/E's writes only inside `recordStockCount`'s — exactly
  as those Findings already specify.
- **Reuse opportunity.** N/A — this Finding is a non-interference
  boundary confirmation, not a build item.

### Finding L — Existing Product / New-to-Catalog distinction

- **Current behavior.** The distinction the amendment requires — "new
  to the SABUSH catalog" must never be treated as "newly purchased" —
  is **already structurally present** in the codebase's own existing
  `isGenuinelyNewProductName` gate (referenced throughout
  `PeriodicStockCountView.tsx` and cited in Decision 37's own Rule 8
  Assessment Addendum, Finding FT-4): a product is "new" purely by
  catalog-membership test (name match against existing `Product`
  records), with no reference anywhere in that gate to purchase
  recency, receipt existence, or any other purchase-history signal.
  Nothing in the current codebase conflates the two concepts today —
  the conflation the amendment corrects (§4 item 2 of the amendment)
  is in Decision 37's own **business-decision text** (its literal
  requirement to collect "original purchase cost" for any such
  product), not in any piece of code that actively equates the two.
- **Required behavior.** This distinction must be explicit and must
  never be reintroduced by any future Contagem-facing copy, validation,
  or required-field logic (FR-79).
- **Evidence.** `isGenuinelyNewProductName`'s existing name-match-only
  logic (confirmed present, this session, via its use gating
  `NewProductInfoPanel`'s own rendering); Decision 37's original text
  (§4 item 37(b)/(i)) as the source of the conflation being corrected.
- **Governance classification.** DIRECTLY AUTHORIZED (FR-79); the
  underlying mechanism (`isGenuinelyNewProductName`) is ALREADY
  IMPLEMENTED and correct — no code change is required for the
  distinction itself, only for its *consequence* (removing the cost
  input Finding A already covers).
- **Implementation impact.** None beyond Finding A's own removal;
  Finding L confirms no separate "new vs. newly-purchased" flag or
  mechanism needs to be invented.
- **Regression risk.** None.
- **Reuse opportunity.** Full — `isGenuinelyNewProductName` is reused
  verbatim, unmodified.

---

## 5. Rule 8 Gates

| Gate | Verdict | Basis |
|---|---|---|
| A. Business correctness | **PASS** | All eleven FRs trace directly to signed amendment text; no invented business rule (Findings A–L). |
| B. Tenant isolation | **PASS** | All new writes identified (Findings B, E, F) reuse existing `businessId`-scoped Firestore paths and the existing `fsBatch`/`setDoc` transactions already scoped per-business; no new collection or cross-tenant read introduced. |
| C. Data integrity | **PASS WITH CONDITIONS** | Condition: Finding B/E's write must be gated to `type === 'periodic'` to avoid silently extending memory-establishment to Initial Stock (out of scope, §6). Condition: Finding G's independence requirement must be honored by keeping the two write paths in separate call sites, as specified. |
| D. Financial correctness | **PASS** | Finding J traces the full Business Worth chain directly; no cost figure of any kind (existing or newly-memoried) enters `productValuationTotal`/`measuredBusinessWorth`. FR-67 independently confirmed to degrade safely with no basis (Finding J). |
| E. Persistence/lifecycle correctness | **PASS WITH CONDITIONS** | Findings B, E, F identify genuine, currently-absent write paths — none of which exist yet. Condition: each must be implemented exactly as scoped (Findings B/E in `recordStockCount` only, gated by `type`; Finding F in `addStockBatch`/`addMultipleStockBatches` only) before this gate is fully satisfied. Not a blocker — a bounded, well-understood implementation task. |
| F. Multi-unit correctness | **PASS** | Finding I confirms the Impala worked example composes correctly across Decision 37 item (d) (unaffected), Finding C (already implemented), and Findings B/D (this amendment's own scope) with no additional multi-unit-specific mechanism required. |
| G. Regression risk | **PASS WITH CONDITIONS** | Condition: Finding A's removal must be diff-audited against `periodic-contagem-cost-price-removal.test.ts` and `periodic-stock-new-product-panel.test.ts`. Condition: Finding D's fallback addition must be diff-audited against the existing 24-test `periodic-contagem-existing-product-selling-unit-memory.test.ts` suite, since several existing assertions may currently assert the exact no-batch gap this amendment closes and will need deliberate, documented updates (not silent weakening). Two pre-existing, unrelated test failures noted in commit `87814a9`'s own message (`periodic-stock-shop-switch-guard`, `periodic-stock-multi-portion-valuation`) are out of scope for this amendment to fix. |
| H. Performance | **PASS** | All identified writes are additive fields inside already-open Firestore transactions (`fsBatch`/`setDoc`) — no new round trip, no new query, no N+1 risk introduced. |
| I. Security | **PASS WITH CONDITIONS** | `firestore.rules`' `/products/{productId}` `allow create` rule validates only `name`; it does not reject additional fields, so Findings B/F's new writes require **no rule change**. Condition: the rule's own explanatory comment ("every product-creation call site... never sends costPrice/sellingPrice... at creation") will become factually stale once Findings B/F ship and must be updated for audit-trail accuracy as part of the same implementation — a documentation-accuracy condition, not a security gap. |
| J. Governance compliance | **PASS** | No FR exceeds what the signed amendment authorizes; every Finding's "required behavior" traces to a specific FR; Findings D and H's sourcing/fallback resolutions operationalize already-decided ownership (§11) rather than deciding new business rules. |
| K. Test coverage | **PASS WITH CONDITIONS** | No test currently exists for FR-78–FR-88 specifically (they are new). Condition: the Test Strategy (§6, below) must be executed as part of the Implementation Plan/Authorization, not assumed satisfied by existing suites, which cover only §44's and the existing-product reconciliation's own prior scope. |
| L. Migration/backfill implications | **PASS** | Findings B/C/F confirm no historical `Product`/`StockBatch`/`StockCount` document is altered — this amendment concerns only future writes (§15 of the amendment, independently confirmed). A product created before this ships will simply show `Cost`/`Selling Price` as unset/unknown in the catalog (Finding H's own "unknown, not fabricated" discipline) rather than requiring any backfill script. |

---

## 6. Test Strategy

The following tests are required (none currently exist for this
amendment's specific scope; existing suites named below are regression
coverage, not new-scope coverage):

**New tests required:**

1. First Contagem with no cost price — confirms `NewProductInfoPanel`
   no longer renders "Custo de Compra Original," and confirmation
   succeeds with no cost-related blocking/warning (Finding A/FR-78–80).
2. First Contagem selling-price persistence — confirms
   `Product.sellingPrice` is written on new-product creation, gated to
   `type === 'periodic'` (Finding B/FR-81).
3. First Contagem selling-unit persistence (multi-unit case) —
   regression-confirms Finding C's already-working behavior continues
   to work once Finding A's panel changes land.
4. Second Contagem automatic loading, no-batch case — confirms
   Finding D's new fallback branch in `buildCatalogRow` and
   `handleModeAToggle` correctly loads both selling unit and price for
   a product with `Product.sellingPrice`/`unitRelationship.sellingUnit`
   set but no `StockBatch` (FR-82).
5. Second Contagem automatic loading, with-batch case — regression-
   confirms the existing, already-signed reconciliation (commit
   `87814a9`) is untouched.
6. Selling-price edit and memory update — confirms an edited selling
   price on an existing product's later Contagem updates
   `Product.sellingPrice` (Finding E/FR-83), and does so only on actual
   change (not on every confirmation).
7. Selling-unit persistence does not silently revert — confirms a
   confirmed `sellingUnit` is not cleared/reset by an ordinary Contagem
   confirmation that does not change it (FR-84).
8. Purchase cost memory update — confirms `Product.costPrice` updates
   from a new `addStockBatch`/`addMultipleStockBatches` batch with a
   different cost (Finding F/FR-86).
9. Selling/cost independence — confirms editing selling price during
   Contagem never alters `Product.costPrice`/`StockBatch.costPrice`,
   and a new purchase batch never alters `Product.sellingPrice`
   (Finding G/FR-85).
10. Multi-unit conversion (Impala example) — end-to-end test of the
    full worked example across first and second Contagem (Finding I).
11. Add Portion — regression-confirms unaffected (§6 of amendment).
12. Business Worth unchanged — regression-confirms
    `productValuationTotal`/`measuredBusinessWorth` computed identically
    before/after (Finding J).
13. FR-67 fallback — regression-confirms `deriveCostContribution`'s
    no-basis behavior is unaffected by Finding A's removal (Finding J).
14. Catalog display — confirms the six required fields render, Selling
    Price is editable, Cost/Cost Unit are read-only (Finding H/FR-87–88).
15. Tenant isolation — confirms all new writes remain scoped to
    `activeBusinessId`, no cross-tenant leak.

**Existing regression suites to run unchanged, per Gate G:**

- `tests/periodic-contagem-cost-price-removal.test.ts` (§44 regression)
- `tests/periodic-stock-new-product-panel.test.ts`
- `tests/periodic-contagem-existing-product-selling-unit-memory.test.ts`
  (24 existing tests — reference-point reconciliation regression)
- `tests/periodic-stock-existing-product-summary.test.ts`
- `tests/periodic-stock-multi-portion-valuation.test.ts`,
  `tests/periodic-stock-arbitrary-length-relationship.test.ts`,
  `tests/periodic-stock-add-portion.test.ts`, `tests/periodic-stock-mode-a-integration.test.ts`
- `tests/business-worth-measured-value.test.ts`,
  `tests/business-worth-snapshot-product-valuation-line.test.ts`

**Not modified by this assessment** — per instruction, no test file has
been changed in the course of this Rule 8 Assessment.

---

## 7. Reuse-First Analysis

| Mechanism | Status |
|---|---|
| `getConversionFactor` | ALREADY IMPLEMENTED — untouched, reused as-is |
| `resolveUnitAwarePrice` | ALREADY IMPLEMENTED — reused as-is by Finding D's extension |
| `deriveModeAPortionValuations` | ALREADY IMPLEMENTED — untouched, out of this amendment's scope |
| `deriveCostContribution` (FR-67) | ALREADY IMPLEMENTED — untouched; independently confirmed to degrade safely with no basis (Finding J) |
| `isGenuinelyNewProductName` | ALREADY IMPLEMENTED — reused as-is (Finding L) |
| `Product.unitRelationship` | ALREADY IMPLEMENTED — no schema change |
| `Product.unitRelationship.sellingUnit` | ALREADY IMPLEMENTED (schema) — write path PARTIALLY IMPLEMENTED (Finding C: multi-unit case works, no gap) |
| `Product.sellingPrice` | ALREADY IMPLEMENTED (schema) — write path NOT IMPLEMENTED (Finding B/E) |
| `Product.costPrice` | ALREADY IMPLEMENTED (schema) — write path NOT IMPLEMENTED (Finding F) |
| Latest `StockBatch.costPrice` | ALREADY IMPLEMENTED — remains FR-67's own source, untouched |
| Latest `StockBatch.sellingPrice` | ALREADY IMPLEMENTED — remains `buildCatalogRow`/`handleModeAToggle`'s existing-batch-case source, untouched; Finding D adds a no-batch fallback alongside it, not a replacement |
| Existing Products/catalog UI (`DashboardView.tsx`) | ALREADY IMPLEMENTED — reused as-is; field exposure PARTIALLY IMPLEMENTED (Finding H) |
| `EditProductModal` | ALREADY IMPLEMENTED — reused as-is; editability split (Cost read-only) NOT IMPLEMENTED (Finding H) |
| Existing Contagem product setup (`NewProductInfoPanel`, `UnitRelationshipChainEditor`, "+ Adicionar Porção") | ALREADY IMPLEMENTED — reused as-is except the one field group Finding A removes |
| Add Stock / Smart Stock Entry pathways | ALREADY IMPLEMENTED — reused as-is; Finding F adds one conditional field to their existing write, nothing structural |

**Conclusion: no new mechanism is required anywhere in this combined
scope.** Every FR is satisfiable by either (a) removing an existing
input group (Finding A), (b) adding a conditional field to an
already-open Firestore write inside an already-existing function
(Findings B, E, F), (c) adding one additional fallback branch to two
already-existing resolution functions (Finding D), or (d) extending an
already-existing catalog screen/modal's field exposure and editability
(Finding H). No new conversion engine, no new schema field, no new
Firestore collection, no new security rule, and no new UI screen are
required anywhere in this scope.

---

## 8. Implementation Boundary (for the future Implementation Plan)

Explicitly in scope for implementation, per this assessment:

1. Remove "Custo de Compra Original" from `NewProductInfoPanel`
   (Finding A).
2. Add `Product.sellingPrice`/`unitRelationship.sellingUnit` write to
   `recordStockCount`'s new-product branch, gated `type === 'periodic'`
   (Findings B/C).
3. Add `Product.sellingPrice` update-on-change to `recordStockCount`'s
   existing-product branch, gated `type === 'periodic'` (Finding E).
4. Add a no-batch fallback branch to `buildCatalogRow` and
   `handleModeAToggle`, reading `product.sellingPrice` directly when no
   `latestBatch` exists and a confirmed `sellingUnit` is present
   (Finding D).
5. Add `Product.costPrice` update-on-change to `addStockBatch` and
   `addMultipleStockBatches` (Finding F).
6. Extend `EditProductModal` and `DashboardView.tsx`'s catalog row to
   expose Cost, Cost Unit, Selling Price (editable), Selling Unit, and
   Unit Relationship, sourcing Cost/Cost Unit from `Product.costPrice`
   with a `StockBatch` fallback, and Selling Price/Unit from
   `Product.sellingPrice`/`unitRelationship.sellingUnit` (Finding H).
7. Update `firestore.rules`' own explanatory comment on
   `/products/{productId}` for accuracy (no rule logic change).

**Explicitly NOT in scope for implementation** (per the amendment's own
§6/§18 and this assessment's own findings — must not be silently
absorbed into the Implementation Plan):

- Any change to Add Stock's or Smart Stock Entry's own cost-entry UI or
  their own separate governance status.
- Any change to `getConversionFactor`, `deriveCostContribution`, or any
  other FR-67 mechanism.
- Any change to the existing-product selling-unit reference-point
  *preference order* (`sellingUnit` over `units[0]`) — only its
  no-batch fallback gap is extended.
- Any change to `productValuationTotal`, `normalizedTotalSellingValue`,
  or `measuredBusinessWorth`.
- Any change to Initial Stock.
- Any redesign of the Products module, its search, filtering, or
  navigation.
- Any new Product-level selling-portions schema.
- Any Firestore *rule logic* change (only the explanatory comment, per
  item 7 above).

---

## 9. Verdict

# **READY AFTER IMPLEMENTATION PLAN**

**Rationale.** No additional Product Architect / specification decision
is required — the signed amendment (FR-78–FR-88) is unambiguous, and
every technical question it explicitly deferred to Rule 8 (the FR-81/
FR-86 write-path mechanism; the catalog's Selling-Price-column sourcing
question) has been resolved above by this assessment as a *technical
direction consistent with already-decided ownership* (§11 of the
amendment), not by deciding a new business rule. Every Finding
identifies either an already-correct existing mechanism (Findings C, J,
K, L) or a small, well-bounded, low-risk addition to an already-existing
function or screen (Findings A, B, D, E, F, H) — no new architecture,
schema, engine, or Firestore rule logic is required anywhere in this
combined scope (§7, Reuse-First Analysis). What remains before an
Implementation Authorization can be signed is translating §8's
Implementation Boundary into a concrete, sequenced Implementation Plan
— covering the `type === 'periodic'` gating condition (Findings B/E),
the diff-audit obligations against existing test suites (Gate G), and
the full Test Strategy (§6) — exactly the next governance gate the
amendment's own §19 already names.

**Not NOT READY:** no contradiction, no missing business decision, and
no unresolved architectural question was found.

**Not simply READY:** eleven FRs' worth of genuinely new write-path and
UI-exposure logic remain unimplemented (Findings B, D, E, F, H) —
"reuse existing mechanisms" does not mean "no code is needed," and an
Implementation Plan is required to sequence and scope that code
correctly, particularly the shared-function gating risk (Finding B)
this assessment identified independently of the amendment's own text.

---

## 10. Verification Performed

- `git fetch origin main` immediately before this assessment began;
  confirmed `HEAD = origin/main = 1714c69`, working tree clean.
- The amendment document was read in full (all 21 sections) fresh this
  session, not from a prior session's summary.
- Every code claim in this assessment (Findings A–L) was independently
  verified by direct `view`/`grep` against the live repository this
  session — not merely reproduced from the amendment's own citations.
- Two material findings were identified independently of the
  amendment's own text: the `recordStockCount` shared-function scoping
  risk (Finding B) and the `buildCatalogRow`/`handleModeAToggle`
  no-batch fallback gap (Finding D) — both are new contributions of
  this Rule 8 Assessment, not restatements.
- No existing governance document was found to contradict the signed
  amendment.

## 11. Lifecycle Status

**Status of this document: Rule 8 Assessment complete. NOT an
Implementation Authorization. NOT signed by the Product Architect. Does
not authorize any code change.**

Next required governance step: **Implementation Plan**, translating §8
(Implementation Boundary) and §6 (Test Strategy) into a sequenced,
reviewable plan — followed by a signed Implementation Authorization —
before any code, test, or `firestore.rules` change may be made in
furtherance of this amendment.
