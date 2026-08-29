Business Domain Specification — Amendment

# First-Time Contagem Cost Removal & Selling-Price/Selling-Unit Memory Amendment
## (Proposed §45 of the Business Worth Evolution Specification)

**Status:** ✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**

This document was drafted, then reviewed and formally accepted by the
Product Architect (§21, below): "I APPROVE AND SIGN," SABUSHIMIKE
MASCENI, 30 August 2026. It records an accepted partial supersession of
Decision 37 and an accepted extension of the governed Product Catalog
surface. This amendment is governance-approved. It does not, on its
own, authorize implementation — a Rule 8 Assessment, an Implementation
Plan, and a signed Implementation Authorization remain separate,
subsequent gates (§19), exactly as they were for the sibling §44
amendment this document is modeled on.

---

## 1. Numbering / Filing (verified before drafting)

Verified directly against the repository at `HEAD 87814a9`, `main`
aligned with `origin/main`, working tree clean, before drafting began.

- `business-worth-evolution-specification.md`'s highest existing
  in-document section remains **§43** ("Owner Investment"). Not
  renumbered by this draft.
- `docs/specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`
  ("§44 Cost-Price Removal") already occupies the next slot as a
  **proposed, not-yet-merged** §44, per that document's own §1 — this
  draft does not collide with or renumber it. **§45** is the next
  collision-free proposed slot for this document, verified by direct
  search: no other file in `docs/specs/` or `docs/engineering/`
  references "§45" or "section 45" as of this draft.
- The highest existing FR number found anywhere in `docs/specs/` or
  `docs/engineering/` is **FR-77** (the §44 amendment's own FR-71–
  FR-77, drafted/accepted separately and unaffected by this document).
  This draft's new FRs therefore begin at **FR-78**, collision-free.
- This draft is filed as a **separate, standalone file**
  (`docs/specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md`),
  consistent with this repository's established practice of housing
  Specification amendments as standalone files rather than in-place
  edits (e.g. `10-expected-stock-value-amendment.md`, the §44
  amendment itself).
- No existing governance document has been edited to produce this
  draft. No code or test file has been modified.

---

## 2. Purpose

This amendment does two things, together, because the second is the
natural reviewable-memory surface the first requires:

1. It removes the one remaining Owner-facing historical/original
   purchase-cost collection step from Periodic Contagem — the
   **"Custo de Compra Original"** panel Decision 37 itself introduced
   for a genuinely-new-to-catalog product — and replaces the business
   premise behind it with a corrected one: a product new to the SABUSH
   catalog is not necessarily a product newly purchased by the
   business. It establishes, instead, that the first Contagem for such
   a product durably remembers the **selling price** and **selling
   unit** the Owner establishes, exactly as later Contagens already
   expect to find remembered (per the already-signed existing-product
   selling-unit/price-memory correction, §3 below).
2. It defines the **Product Catalog** as the narrow, reviewable
   surface for the resulting memory — Product Name, Cost, Cost Unit,
   Selling Price, Selling Unit, and Unit Relationship — with
   authoritative ownership split exactly along the line already
   implied elsewhere in this governance chain: the purchase workflow
   (Add Stock / Smart Stock Entry) owns Cost/Cost Unit; Contagem/
   selling configuration owns Selling Price/Selling Unit.

**Core governance principle established by this amendment:**

> New to the SABUSH catalog is not the same fact as newly purchased.
> Periodic Contagem measures physical reality and establishes selling
> valuation; it does not reconstruct a business's purchase history
> merely because a product has not yet been entered into the system.
> Historical/original purchase cost, where it is genuinely needed, is
> collected through the purchase workflow (Add Stock / Smart Stock
> Entry) — never through Contagem, for any product, first-time or
> otherwise.

**This restates and extends, rather than contradicts, the §44
principle** ("the Owner observes quantities and establishes selling
prices; the system derives cost information when a reliable governed
cost basis exists") to the one case §44 explicitly left open: a
genuinely-new-to-catalog product, for which §44's own governed
cost-basis derivation (FR-72) has nothing to derive from, because no
prior batch or Product-level cost basis yet exists.

---

## 3. Existing Governance Lineage

- **`BDR-pending-business-worth-evolution-measurement-model.md` §4,
  Decision 37** ("First-Time Contagem Product-Information Model",
  APPROVED AND SIGNED, SABUSHIMIKE Masceni, 23 August 2026) — the
  direct governing decision this amendment partially supersedes. Items
  (b) ("One original cost basis... purchase unit... purchase cost") and
  (i) ("the first-time flow collects: product name, original purchase
  unit, original purchase cost, the full unit relationship...") are the
  specific provisions amended (§7, below). Items (a), (c), (d), (f),
  (g), (h), (j) are unaffected and remain in full force.
- **`docs/engineering/business-worth-evolution-rule8-assessment.md`**
  — the "Rule 8 Assessment Addendum — First-Time Contagem
  Product-Information Model (BDR Decision 37)" (✅ ACCEPTED, SABUSHIMIKE
  Masceni, 23 August 2026) and the underlying "Increment 4" cross-
  cutting findings (FR-67 Cost-Basis Conversion). Unaffected by this
  amendment — see §13, below.
- **`docs/specs/business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md`**
  (the "§44" amendment, ✅ **ACCEPTED AND SIGNED**) — FR-71 through
  FR-77. §44 already removed Owner-facing per-portion Cost Price entry
  from Periodic Contagem for every counted portion of every product,
  and already established the "unknown/not-established, never a
  fabricated zero" principle (FR-73) for a product with no governed
  cost basis. **§44's own text explicitly notes it does not itself
  remove the separate first-time "Custo de Compra Original" field** —
  this amendment is the document §44 anticipated would be needed for
  that removal.
- **`apps/tenant/src/components/PeriodicStockCountView.tsx`,
  `NewProductInfoPanel`** — the actual implementation of the field this
  amendment removes governance authority for (§7/§8, below). Verified
  by direct inspection (this session): the panel renders "Custo de
  Compra Original" with an owner-editable purchase-unit field and a
  purchase-cost-per-purchase-unit field, labeled "Introduza o custo
  original uma única vez, na unidade de compra do produto — nunca por
  porção."
- **`docs/engineering/periodic-contagem-existing-product-selling-unit-memory-implementation-authorization.md`**
  and **`docs/engineering/uom-specification-section4-existing-product-contagem-reconciliation-addendum.md`**
  (✅ SIGNED, SABUSHIMIKE MASCENI, 29 August 2026) — the already-signed
  reconciliation establishing that a confirmed `Product.unitRelationship.sellingUnit`
  is the reference point for selling-price valuation of an **existing**
  product in Contagem, with `units[0]` remaining the fallback only
  where no confirmed `sellingUnit` exists. Implemented at `HEAD` by
  commit `87814a9` ("existing-product selling-unit/price-memory
  correction"). **This amendment does not alter that reference-point
  rule, its fallback, or its implementation in `buildCatalogRow`/
  `handleModeAToggle` in any way** — it is the read-side counterpart
  this amendment's write-side memory-establishment requirement (§10,
  below) depends on and is consistent with.
- **`BDR-0012` (Product Unit-of-Measure & Product Memory)** and
  **`apps/tenant/src/types.ts`, `Product`/`UnitRelationship`** — the
  existing schema this amendment reuses without modification:
  `Product.costPrice?`, `Product.sellingPrice?` (documented in-code as
  "reference price only... NOT used by any Investment/Market/Profit
  calculation"), and `UnitRelationship.sellingUnit?`. **This amendment
  introduces no new field on `Product` or `UnitRelationship`.**
- **`docs/specs/04-smart-stock-entry-amendment.md`** and
  **`docs/specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md`**
  — the existing (at the time of this draft, still in "Drafted,
  awaiting Product Architect approval" status per those documents' own
  headers) governance for Smart Stock Entry's receipt-based,
  human-confirmed cost capture. This amendment does not change, advance,
  or depend on that status — it only confirms, consistent with that
  chain, that purchase-cost capture belongs to Add Stock / Smart Stock
  Entry, not Contagem, and takes no position on Smart Stock Entry's own
  separate approval.
- **`docs/specs/10-stock-counts.md`** and
  **`docs/specs/10-expected-stock-value-amendment.md`** — referenced
  for context only; not amended by this draft.

**Does not amend:** `POL-0010`; `BDR-0014` or its companion amendments;
`InitialStockCountView.tsx`'s governed behavior; `02-business-worth-engine.md`;
FR-67's cost-basis derivation engine or `getConversionFactor`; the
existing-product selling-unit reference-point reconciliation
(`buildCatalogRow`/`handleModeAToggle`); the Selling Price deviation
warning; Add Stock's or Smart Stock Entry's own governance status; any
Firestore rule, schema, or index.

---

## 4. Problem / Business Evidence

Real-business testing of the live platform (this governance chain's own
prior session, verified again by direct inspection in this session)
established the following as fact:

1. **SABUSH BPT is used by businesses that are already operating
   before they adopt the system.** For such a business, its first
   Contagem is the initial valuation/counting of an already-running
   business — not the starting point of a business's existence.
2. **"New to the SABUSH catalog" and "newly purchased" are two
   different facts, currently conflated by Decision 37 items (b)/(i).**
   Every product an already-operating business counts for the first
   time is, by definition, new to the SABUSH catalog. It is not, by
   that fact alone, newly purchased, recently purchased, or purchased
   at a price the Owner still knows or can document.
3. **Direct inspection confirms Decision 37's "Custo de Compra
   Original" panel is a live, Owner-facing, required-in-practice input
   today.** `NewProductInfoPanel` (`PeriodicStockCountView.tsx`) asks
   for a purchase unit and a purchase cost "uma única vez" for any
   product not already in the catalog, with no distinction between a
   product the business is counting for the first time because it
   already owned it, and a product genuinely just purchased.
4. **The historical/original purchase cost this panel asks for may be
   genuinely unknown or unknowable** — the receipt may be lost, the
   price may have changed since the original purchase, the Owner may
   not remember it precisely, or the product may predate the business's
   adoption of SABUSH BPT entirely by months or years.
5. **Business Worth does not require this figure.** Confirmed by direct
   inspection: `productValuationTotal`/`normalizedTotalSellingValue`/
   `measuredBusinessWorth` are computed entirely from selling-price
   valuation (Decision 37 item (h), restated at §44 §12, unaffected by
   this amendment). Nothing in this Contagem-confirmation cost figure
   ever reaches Business Worth.
6. **Cost has a proper home already: the purchase workflow.** Add Stock
   (`addStockBatch`) and Smart Stock Entry are where an actual purchase
   batch, with its own receipt or Owner-entered figure, is the natural
   and reliable source of a purchase cost — because a purchase event is
   what the cost genuinely describes. Contagem, by contrast, records
   physical presence and current selling valuation, not a purchase
   event (`BDR-0009`, "physical observation, not reconciliation").

**Distinguishing "new-to-catalog" from "newly purchased" is therefore
not a stylistic preference — it corrects a conflation Decision 37
itself made when it assumed every first-time-counted product came with
a known, current, reconstructable purchase cost.**

---

## 5. Exact Scope

This amendment applies to **Periodic Contagem's first-time/new-to-
catalog product flow** (`NewProductInfoPanel` and its data-flow into
`recordStockCount`'s new-product-creation branch) **and** to the
**Product Catalog** as the review/edit surface for the resulting Cost/
Cost Unit/Selling Price/Selling Unit/Unit Relationship memory.

## 6. Explicit Non-Scope

This amendment explicitly does **not** change:

- **Add Stock** (`AddStockView.tsx`, `addStockBatch`) — its purchase-
  cost entry, its role in `StockBatch.costPrice`, and embedded-profit
  calculation are completely untouched. Add Stock remains, and is
  reaffirmed by this amendment as, the correct venue for capturing
  actual purchase cost.
- **Smart Stock Entry** — its own receipt-based cost-extraction
  behavior and its own separate governance status (§3, above) are
  untouched by this amendment in every respect.
- **§44's per-portion Cost Price removal** (FR-71–FR-77) — fully
  preserved, unmodified, and extended in spirit rather than reopened.
- **FR-67's cost-basis derivation engine**, `getConversionFactor`, or
  `deriveCostContribution` — untouched. Where a governed cost basis
  already exists for a product (from a prior purchase), §44's existing
  derivation continues exactly as governed; this amendment concerns
  only the case where no such basis yet exists because the product has
  never been purchased through the system.
- **The already-signed existing-product selling-unit reference-point
  reconciliation** (`buildCatalogRow`/`handleModeAToggle`, commit
  `87814a9`) — unmodified. This amendment's own selling-unit/price
  memory-establishment requirement (§10) is the write-side counterpart
  that reconciliation's read-side logic already depends on existing.
- **The Business Worth formula** — `productValuationTotal`,
  `normalizedTotalSellingValue`, `measuredBusinessWorth` (§14, below).
- **Unit Relationship** collection mechanics, `UnitRelationshipChainEditor`,
  or arbitrary-length chain support (Decision 37 item (c)) — fully
  preserved; this amendment collects unit relationship exactly as
  Decision 37 item (c) already governs.
- **Multiple current-stock portions** (Decision 37 item (d)) — fully
  preserved.
- **Initial Stock** (`InitialStockCountView.tsx`) — its own governed
  Cost Price behavior is untouched. Nothing in this amendment implies
  any change to Initial Stock; if a future reading of this principle
  is thought to extend there, that is explicitly **not decided by this
  amendment** and would require its own separate governance step.
- **Mode A / Mode B selling-price mechanics**, the Selling Price
  deviation warning, and existing conversion/rounding discipline
  (`POL-0001`/`POL-0002`) — unaffected.
- **Any new Product-level selling-portions schema** — not introduced.
  Selling price/unit memory continues to use the existing
  `Product.sellingPrice` and `Product.unitRelationship.sellingUnit`
  fields exactly as they already exist (§3, above) — no new shape.
- **A redesign of the Products module or the Product Catalog's overall
  UI** — this amendment defines only the narrow set of fields the
  catalog must expose/review (§11–§13), not a new screen, layout, or
  navigation structure.

---

## 7. Product Architect Decision — Partial Supersession of Decision 37

**[ACCEPTED]**

The part of Decision 37 items (b) and (i) that requires the first-time
Contagem flow to collect a **historical/original purchase unit and
purchase cost** for a genuinely-new-to-catalog product is
**superseded**. Every other part of Decision 37 — items (a), (c),
(d), (f), (g), (h), (j), and the remainder of (b)/(i) concerning unit
relationship, current portions, and selling valuation — is
**unaffected and remains in full force**. This amendment narrows one
specific provision within Decision 37; it does not discard Decision 37
as a whole, in exactly the same way §44 narrowed Decision 37 (B.4)
without discarding it.

**New principle (proposed):** During Periodic Contagem, no product —
first-time/new-to-catalog or already established — is ever asked to
supply a historical/original purchase cost. A product's cost basis, if
and when one is genuinely needed, is established exclusively through
the purchase workflow (Add Stock / Smart Stock Entry).

**FR-78 [new, accepted].** Periodic Contagem's first-time/
new-to-catalog product flow must not present an Owner-editable
historical/original purchase-cost input, nor an Owner-editable original
purchase-unit input tied to that cost, for any product. This supersedes
Decision 37 items (b) and (i) specifically insofar as they require
collecting "original purchase unit, original purchase cost" during
Contagem's first-time flow. Unit relationship collection (item (c)),
multiple current-stock portions (item (d)), and current selling
unit/price collection (items (f)/(g)/(i)'s selling-price clause) are
unaffected and continue exactly as Decision 37 already governs.

**FR-79 [new, accepted].** "New to the SABUSH catalog"
must never be treated, in any Contagem-facing copy, validation, or
required-field logic, as equivalent to "newly purchased" or "purchase
cost known." No first-time Contagem confirmation may be blocked, and no
warning may be shown, on account of a genuinely-new-to-catalog
product's absent historical cost.

---

## 8. Consequence — "Custo de Compra Original" Removal

**[ACCEPTED]**

`NewProductInfoPanel`'s "Custo de Compra Original" section — the
purchase-unit and purchase-cost-per-purchase-unit inputs and their
supporting copy — is removed from Periodic Contagem's
first-time product flow. This is the direct, named consequence of
§7/FR-78, called out explicitly per this amendment's own governance
task, distinct from the general FR statement.

**FR-80 [new, accepted].** The "Custo de Compra Original"
input group (purchase unit + purchase cost per purchase unit) is
removed from `NewProductInfoPanel` in Periodic Contagem. The panel's
remaining responsibilities — product identity display, unit-
relationship chain collection, and selling-unit/selling-price
collection — are preserved (§9, §10, below).

**What this does not do.** This does not remove `NewProductInfoPanel`
itself, does not remove unit-relationship collection, and does not
remove selling-unit/selling-price collection — only the historical-
cost-specific input group. It does not touch the byte-identical
purchase-cost fields that exist in `InitialStockCountView.tsx` or
`AddStockView.tsx` (per that component family's own header comment
noting the deliberate per-file duplication) — those remain governed by
Initial Stock's and Add Stock's own, entirely separate, unamended
rules (§6, above).

---

## 9. Preserved — Unit Relationship Collection

**[Restated, not newly established]**

Decision 37 item (c) (arbitrary-length unit-relationship collection)
and its implementation (`UnitRelationshipChainEditor`,
`getConversionFactor`, `Product.unitRelationship`) are entirely
untouched by this amendment. A first-time product's complete unit
relationship (e.g. `1 Cx = 4 Emb = 24 Un`) continues to be collected in
Contagem exactly as Decision 37 already governs, independent of
whether a historical purchase cost is ever collected for that product.

---

## 10. Establishing Durable Selling-Price and Selling-Unit Memory

**[ACCEPTED]**

**Problem this closes.** Direct inspection of `recordStockCount`'s
new-product-creation branch (`AppContext.tsx`) confirms that today, the
`Product` document written for a genuinely new product created via
Contagem carries only `id`, `name`, `createdAt`, and — only when a
confirmed unit-relationship candidate exists — `unitRelationship`
(which may itself carry a chosen `sellingUnit`, when the product has a
multi-level chain). **`Product.sellingPrice` is never written by this
path today, for any product, under any condition.** This means no
durable selling-price memory is established from a first Contagem
today — the exact gap this amendment is required to close. This is
**required by this amendment / not yet implemented**, not a
misunderstanding of existing behavior.

**FR-81 [new, accepted].** When the Owner establishes a
selling price for a product during that product's first Contagem
(whether the product has a single functional unit or a multi-level
unit-relationship chain), that selling price becomes the product's
durable selling-price memory (`Product.sellingPrice`), and the selling
unit it was entered in becomes the product's durable selling-unit
memory (`Product.unitRelationship.sellingUnit`, or the sole unit itself
for a single-unit product). This closes the gap identified above: it
requires the new-product-creation write path to persist the
Owner-entered selling price, not merely the unit relationship.

**FR-82 [new, accepted].** Every Contagem after a
product's first — for both single-unit and multi-level-chain products —
must automatically load that product's remembered selling unit and
selling price, consistent with, and without altering, the already-
signed existing-product selling-unit reference-point reconciliation
(§3/§6, above: confirmed `sellingUnit` as reference point, `units[0]`
as fallback only where none is confirmed). The Owner is not required to
re-enter a selling price merely because a new Contagem has begun.

**FR-83 [new, accepted].** The selling price remains
editable at any later Contagem or stock-entry point. When the Owner
changes it, the newly entered value becomes the current selling-price
memory (`Product.sellingPrice`), superseding the previous remembered
value. Changing the selling price must never alter `StockBatch.costPrice`
or `Product.costPrice` (§12, below) — the two remain fully independent
write paths, exactly as §11 requires.

**FR-84 [new, accepted].** A confirmed selling unit must
never silently revert to the purchase unit or to `units[0]` merely
because a later Contagem is performed — the reference-point rule (§3,
above) already governs this for reads; this FR establishes the
corresponding guarantee that the memory itself is not overwritten or
discarded by an ordinary Contagem confirmation that does not change it.

---

## 11. Purchase Cost / Selling Price — Two Independent Authorities

**[Restated, and formally established as a governance principle for
the first time in these terms]**

Purchase Cost / Cost Unit:

- owned exclusively by Add Stock / Smart Stock Entry;
- sourced from the actual purchase batch/receipt;
- updates when a new purchase batch arrives with a different cost;
- never entered, edited, or established through Periodic Contagem, for
  any product, first-time or otherwise (§7/§8, above; §44's existing
  per-portion removal, unaffected).

Selling Price / Selling Unit:

- established by Periodic Contagem (first Contagem for a new-to-
  catalog product; editable thereafter);
- remembered as durable Product Memory (§10, above);
- edited only through Contagem/selling-configuration surfaces or the
  Product Catalog's own edit affordance (§13, below) — never through
  Add Stock's purchase-cost entry;
- changing the selling price must never alter the purchase cost, and
  changing the purchase cost must never alter the selling price.

**FR-85 [new, accepted].** Purchase Cost/Cost Unit and
Selling Price/Selling Unit are governed as two independent write
authorities. No code path introduced or modified in furtherance of
this amendment may write to both from a single Owner action, and no
UI surface introduced or modified in furtherance of this amendment may
present them as a single combined field.

---

## 12. Cost Memory — Purchase Workflow Remains Authoritative

**[Restated, not newly established]**

This amendment does not change how or when purchase cost is captured.
Add Stock (`addStockBatch`) continues to be where an actual purchase
batch's cost is entered — by receipt (Smart Stock Entry, where and when
separately governed and available) or manually. This amendment records
one governance clarification, needed because §10/§11 above newly define
the Product Catalog's Cost/Cost Unit columns as sourced from this
workflow:

**Implementation-discovery finding (not yet governed as an FR, recorded
for Rule 8's benefit).** Direct inspection of `addStockBatch`'s
new-product-creation branch confirms it, too, does not currently write
`Product.costPrice` — only `unitRelationship`, when supplied. The only
code path found that writes `Product.costPrice`/`Product.sellingPrice`
today is the Owner's manual edit in `EditProductModal` via
`updateProduct`. **This means "the catalog's current Cost/Cost Unit
updates to the latest applicable purchase information when a new
purchase batch has a different cost" (§13, below) is not yet
implemented anywhere in the codebase as of this draft — it is required
by this amendment, not a restatement of existing behavior.** This
finding is recorded here for the Rule 8 Assessment this amendment must
still pass through (§19); it does not itself instruct any
implementation.

**FR-86 [new, accepted].** When a new purchase batch is
recorded for a product with a different cost than the product's
current remembered cost, that batch's cost and unit become the
product's current Cost/Cost Unit memory (`Product.costPrice`,
informed by the batch's own unit), reviewable via the Product Catalog
(§13). This FR authorizes the *business requirement* only — the exact
write-path mechanism (e.g. `addStockBatch` writing `Product.costPrice`
directly, a separate reconciliation step, or reuse of
`updateProduct`) is explicitly left to Rule 8/implementation design
(§19), consistent with this amendment's own governance boundary (§18).

---

## 13. The Product Catalog — Reviewable Memory Surface

**[ACCEPTED]**

Counted products must have a reviewable Product Catalog. At minimum,
the catalog must expose, for review and — where the field's own
authority permits (§11) — edit:

1. **Product Name**
2. **Cost** — sourced from the purchase workflow (§12).
3. **Cost Unit** — sourced from the purchase workflow (§12).
4. **Selling Price** — sourced from Contagem/selling configuration
   memory (§10), editable directly in the catalog.
5. **Selling Unit** — sourced from Contagem/selling configuration
   memory (§10).
6. **Unit Relationship** — sourced from Decision 37 item (c)'s
   existing collection mechanism (§9), unaffected by this amendment.

**Purpose.** An Owner opens the catalog to: check the current selling
price if forgotten; see the current selling unit; edit the selling
price when the real price changes; see the latest purchase cost and
cost unit; see the unit relationship. This is a **review/edit surface
for already-governed memory** — it introduces no new valuation
calculation and is not a new pricing engine.

**Implementation-discovery findings (recorded for Rule 8's benefit, not
governed as FRs by themselves).** Direct inspection of the existing
catalog list (`DashboardView.tsx`'s `filteredProducts` rendering)
confirms:

- The existing catalog list already exists as a reviewable product list
  (search, category/supplier filters, an existing `EditProductModal`
  for editing `Product.costPrice`/`Product.sellingPrice` as "reference"
  fields) — this amendment does not require a new screen, only an
  extension of what is already there.
- Today, the catalog list's displayed "COMPRA"/"VENDA" figures are
  sourced from `displayBatch` (the product's active or latest
  `StockBatch`), **not** from `Product.costPrice`/`Product.sellingPrice`
  memory. Whether the catalog's Selling Price column should be
  re-sourced to read from `Product.sellingPrice` memory once FR-81
  begins populating it (rather than continuing to read the latest
  batch's selling price) is **not decided by this amendment** — it is
  left to Rule 8 (§19), which must reconcile this finding against
  FR-81's memory-establishment requirement.
- **Unit Relationship is not displayed anywhere in the existing catalog
  list today.** Exposing it is required by this amendment (§13 item 6,
  above) and is not yet implemented.
- `EditProductModal` already allows editing `costPrice`/`sellingPrice`
  as two separate fields, but does not currently label or separate
  "Cost Unit" or "Selling Unit" from the numeric price fields, and does
  not expose Unit Relationship. Extending it to do so — narrowly,
  without a redesign — is anticipated to be the smallest-change path,
  but the exact mechanism is left to Rule 8/implementation design (§18).

**FR-87 [new, accepted].** A Product Catalog surface must
expose, at minimum, the six fields listed above, for every active
product. This FR fixes the business requirement; it does not fix
whether this is achieved by extending the existing catalog list/
`EditProductModal`, or some other narrowly-scoped mechanism — that is a
Rule 8/implementation-stage decision (§18/§19), constrained only by
§6's explicit non-scope (no redesign of the Products module).

**FR-88 [new, accepted].** Editing the Selling Price
through the Product Catalog updates the same `Product.sellingPrice`
memory FR-81/FR-83 establish and govern — it is the same authority,
reached through a second entry point, not a separate valuation input.
Editing Cost/Cost Unit through the Product Catalog is **not**
authorized by this amendment — Cost/Cost Unit remain purchase-
workflow-owned (§11) and read-only in the catalog unless a future,
separate governance step decides otherwise.

---

## 14. Business Worth Invariant

**[Restated, not newly established]**

This amendment does not change `productValuationTotal`,
`normalizedTotalSellingValue`, `measuredBusinessWorth`, or their
selling-price basis, in any respect. Historical/original purchase cost
was never required to calculate Business Worth before this amendment,
and remains not required after it. Nothing in this amendment introduces
a dependency on `Product.costPrice`, `StockBatch.costPrice`, or any
cost figure in the Business Worth calculation path.

---

## 15. Data / History Compatibility

- **No existing persisted field is renamed, removed, or restructured.**
  `Product.costPrice`, `Product.sellingPrice`, and
  `Product.unitRelationship.sellingUnit` retain their existing names,
  types, and optionality exactly as currently defined in `types.ts`.
- **No historical `StockCount`, `StockBatch`, or `Product` document is
  altered by this amendment.** This amendment concerns only how a
  *future* first Contagem's product-creation write path populates
  `Product.sellingPrice`/`Product.unitRelationship.sellingUnit` going
  forward (FR-81), and how a *future* purchase batch may update
  `Product.costPrice` (FR-86).
- **A product entered into the SABUSH catalog for the first time
  before this amendment ships will have no historical-cost figure in
  either direction** — no purchase cost was collected under the old
  model's absence of a decision either, and none is fabricated
  retroactively by this amendment. This is consistent with §44's own
  "unknown/not established, never a fabricated zero" principle
  (FR-73), extended here to the first-time-product case by the same
  reasoning.

---

## 16. Safety / Integrity Boundaries Preserved

- **Physical observation nature of Contagem** (`BDR-0009`) — unaffected;
  this amendment removes a non-physical-observation input (historical
  cost), consistent with, and arguably strengthening, BDR-0009's own
  framing, exactly as §44 already reasoned for per-portion Cost Price.
- **Unit conversion authority** — `getConversionFactor` remains the
  sole conversion engine; unmodified.
- **FR-67's cost-basis derivation** — unmodified; this amendment
  concerns only the case where no basis yet exists.
- **Tenant/business isolation** — unaffected.
- **Multi-portion behavior** — Decision 37 item (d)'s multi-portion
  support is unaffected in every respect.
- **Confirmation safety / autosave** (Decisions 29/30) — unaffected;
  this amendment changes what a first-time product's information panel
  collects, not the confirmation or autosave mechanism itself.

---

## 17. Acceptance Criteria

Stated at governance level — testable without prescribing
implementation:

- [ ] Periodic Contagem's first-time/new-to-catalog product flow
      presents no historical/original purchase-cost input and no
      purchase-unit input tied to that cost, for any product (FR-78,
      FR-80).
- [ ] No first-time Contagem confirmation is blocked, and no warning is
      shown, on account of a genuinely-new-to-catalog product's absent
      historical cost (FR-79).
- [ ] Unit-relationship collection (Decision 37 item (c)) is unchanged
      and continues to function exactly as before this amendment (§9).
- [ ] A selling price and selling unit established during a product's
      first Contagem are persisted as durable Product Memory
      (`Product.sellingPrice`, `Product.unitRelationship.sellingUnit`)
      (FR-81).
- [ ] Every subsequent Contagem for that product automatically loads
      the remembered selling unit and selling price, without requiring
      re-entry, consistent with the existing reference-point
      reconciliation (FR-82).
- [ ] The selling price remains editable at any later point; an edited
      value becomes the new selling-price memory (FR-83).
- [ ] Editing the selling price never alters `Product.costPrice` or any
      `StockBatch.costPrice`; editing cost never alters the selling
      price (FR-83, FR-85).
- [ ] A confirmed selling unit is never silently reverted to the
      purchase unit or `units[0]` by an ordinary Contagem confirmation
      (FR-84).
- [ ] A Product Catalog surface exposes Product Name, Cost, Cost Unit,
      Selling Price, Selling Unit, and Unit Relationship for every
      active product, with Selling Price editable and Cost/Cost Unit
      read-only from that surface (FR-87, FR-88).
- [ ] `productValuationTotal`, `normalizedTotalSellingValue`, and
      `measuredBusinessWorth` are computed identically to their
      current, unamended behavior (§14).
- [ ] No existing `Product`, `StockBatch`, or `StockCount` field is
      renamed, removed, or restructured (§15).
- [ ] Add Stock's and Smart Stock Entry's own purchase-cost entry
      behavior, and their own governance status, are unchanged in every
      respect (§6).
- [ ] Initial Stock's Cost Price behavior is unchanged in every respect
      (§6).

---

## 18. Explicit Non-Goals

Not decided here: the exact technical write-path mechanism for FR-81's
memory establishment or FR-86's cost-memory update (left to Rule 8);
whether the Product Catalog's Selling Price column should be re-sourced
from `Product.sellingPrice` rather than the latest batch (left to Rule
8, per §13's own recorded finding); exact UI layout, component
structure, or copy for `NewProductInfoPanel`'s remaining fields or the
extended catalog surface; whether this principle extends to Initial
Stock (explicitly not decided, §6). Not in scope at all: Add Stock
redesign; Smart Stock Entry's own approval status; Business Worth
formula changes; a new Product-level selling-portions schema; a
redesign of the Products module; FR-67's cost-basis engine; the
existing-product selling-unit reference-point reconciliation's own
mechanics; the Selling Price deviation warning.

---

## 19. Governance Dependencies / Next Gates

**This amendment does not authorize implementation.**

- Product Architect acceptance/signature of this document (§21) has
  been completed: "I APPROVE AND SIGN," SABUSHIMIKE MASCENI, 30 August
  2026. This acceptance is governance-approved, effective this
  amendment.
- Now that acceptance is recorded, the following remain required, in
  order:
  1. **Rule 8 Assessment** — required, to resolve the write-path
     mechanism for FR-81/FR-86, the Product Catalog's exact sourcing
     question (§13's recorded finding), and the smallest-change path
     for extending `EditProductModal`/the catalog list.
  2. **Implementation Plan**, as governance requires.
  3. **Implementation Authorization**, signed, before any code is
     written.
  4. **Implementation** itself, only after the above.
- None of Rule 8, an Implementation Plan, or an Implementation
  Authorization has been created by this document. This document is a
  governance-approved artifact; it does not itself constitute any of
  those three subsequent gates.

---

## 20. Traceability

| Item | Source | Disposition (proposed) |
|---|---|---|
| First-time flow must collect original purchase unit/cost | Decision 37 (b)/(i) | Superseded in part (FR-78, FR-80) |
| Unit relationship collection | Decision 37 (c) | Unchanged |
| Multiple current-stock portions | Decision 37 (d) | Unchanged |
| Selling valuation independent of cost | Decision 37 (f)/(g) | Unchanged |
| Business Worth = selling-basis only | Decision 37 (h), §44 §12 | Restated, unchanged (§14) |
| Per-portion Cost Price removal | §44 FR-71–FR-77 | Unchanged, extended in spirit |
| "Unknown, never fabricated zero" | §44 FR-73 | Extended by reasoning to first-time products (§15) |
| Existing-product sellingUnit reference point | Reconciliation addendum, commit `87814a9` | Unchanged; write-side counterpart added (FR-81, FR-82) |
| `Product.sellingPrice` never written by Contagem's new-product path | `AppContext.tsx recordStockCount`, verified by direct inspection | Closed by FR-81 |
| `Product.costPrice` never auto-updated from a purchase batch | `AppContext.tsx addStockBatch`, verified by direct inspection | Closed by FR-86 (mechanism deferred to Rule 8) |
| Catalog list currently reads Cost/Selling from `StockBatch`, not `Product` memory | `DashboardView.tsx`, verified by direct inspection | Recorded finding; sourcing decision deferred to Rule 8 (§13, §18) |
| Unit Relationship not shown in existing catalog list | `DashboardView.tsx`, verified by direct inspection | Closed by FR-87 |

---

## 21. Product Architect Acceptance

**Status:** ✅ **ACCEPTED AND SIGNED.**

> I have reviewed the complete amendment draft as written and confirm
> this introduces no change beyond what is recorded above — the
> partial supersession of Decision 37 items (b)/(i) (§7), removal of
> the "Custo de Compra Original" panel (§8), the durable selling-price/
> selling-unit memory established from first Contagem (§10), the
> two-independent-authorities principle for cost vs. selling price
> (§11), and the Product Catalog as the narrow reviewable memory
> surface (§13) — with no change to Business Worth, FR-67, the §44
> per-portion Cost Price removal, the existing-product selling-unit
> reference-point reconciliation, Add Stock, Smart Stock Entry, or
> Initial Stock. This amendment is **ACCEPTED and SIGNED**, effective
> this session.

Decision: I APPROVE AND SIGN

**Product Architect:** SABUSHIMIKE MASCENI

Date: 30 August 2026

This acceptance authorizes proceeding to Rule 8 Assessment. It does not,
on its own, authorize any code change — an Implementation Plan and a
signed Implementation Authorization remain required, separate gates
after Rule 8 (§19).
