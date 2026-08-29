Rule 8 Assessment

# Rule 8 Assessment — Periodic Contagem, Existing-Product Selling-Unit / Price-Memory Correction

**Governing chain:** [`BDR-0012`](../specs/BDR-0012-product-unit-of-measure-product-memory.md)
(Approved) → [`product-unit-of-measure-specification.md`](../specs/product-unit-of-measure-specification.md)
§4 (✅ Accepted) → [`product-memory-purchase-selling-valuation-specification.md`](../specs/product-memory-purchase-selling-valuation-specification.md)
§16/§17 (✅ Accepted) → [`business-worth-evolution-specification.md`](../specs/business-worth-evolution-specification.md)
§15/§36 item 1 (✅ Accepted; open technical question) →
[`business-worth-evolution-rule8-assessment.md`](./business-worth-evolution-rule8-assessment.md)
Finding 7-A (design direction confirmed workable; exact mechanics deferred
to implementation) → the design-pass resolution recorded directly in
[`apps/tenant/src/lib/contagemMultiUnitValuation.ts`](../../apps/tenant/src/lib/contagemMultiUnitValuation.ts)'s
own header comment, which shipped Mode A/B in commit `558fd46`
("feat(contagem): capture selling unit for multi-unit products") →
**this document's own original draft**, commissioned directly by the
Product Architect (§1–§20 of that session's input was treated as the
governing business-decision text; see §0 below) →
[**UOM Specification §4 / Existing-Product Periodic Contagem
Reference-Point Reconciliation Addendum**](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
(✅ **SIGNED**, SABUSHIMIKE MASCENI, 29 August 2026) — the governance
gap this document's own §0/§12 flagged is now formally closed by that
addendum's signature. **This revision of this document records that
resolution; see §0 and §13, below, both updated accordingly.**

**Scope of this assessment:** whether and how Periodic Contagem's
existing-product path (Case B) should automatically prefer the product's
confirmed `unitRelationship.sellingUnit` — over the chain's `units[0]` —
as the reference point for (a) the auto-populated catalog row's default
unit/price and (b) Mode A's own default reference unit/price, for a
product that already has one confirmed. **New-product setup (Case A,
already governed and shipped in `558fd46`), Initial Stock, Cost Price
removal, Add Stock, Smart Stock Entry, and the Business Worth formula are
explicitly out of scope** — see §17. **FR-67's separate `units[0]`
cost-basis convention is explicitly unaffected — see §0's closing note
and Finding H's own "what must NOT change" clause; this correction
concerns only the selling/valuation reference point, never the cost
basis.**

**Lifecycle state:** Investigation complete → Assessed (original draft,
**CONDITIONALLY READY**) → Reconciliation addendum drafted → **signed**
(29 August 2026) → **this document updated to READY (this revision)** →
Implementation Plan (companion document) — its own separate acceptance
gate remains outstanding, not touched by this revision — → Implementation
Authorization **NOT** created — explicitly withheld, still required as a
separate, subsequent, distinct governance gate.

**Baseline verified fresh:** `main = origin/main = 558fd46` (the commit
that shipped Decision 37 B.2's selling-unit capture for new products),
working tree clean, confirmed via `git status`/`git log` immediately
before this revision began and re-confirmed after (see the accompanying
change-control report).

---

## 0. A Genuine Governance Tension, Surfaced Rather Than Silently Resolved

Before any Finding: this assessment identifies a real conflict between
two existing, independently-Accepted governance artifacts, and explains
precisely how it is being handled — per this session's own instruction
("If any existing governance artifact is contradicted, STOP and identify
the conflict rather than silently modifying the rule").

**The conflict.** `product-unit-of-measure-specification.md` §4
("Periodic Contagem") states, in Accepted, unambiguous text:

> "The mixed-unit combination step (Decisions 6–7) converts all entries
> for one product within one count to the confirmed chain's top-level
> unit, `units[0]`, for valuation purposes — the same single reference
> point Add Stock's default already uses (§5.A Item 4); **no separate,
> configurable, or per-count reference-unit choice is introduced.** The
> exact technical calculation mechanics remain a Rule 8/implementation
> concern; only the reference point itself (`units[0]`) is fixed here."

This convention was carried forward, unresolved as a *precise mechanic*,
into `business-worth-evolution-specification.md` §36 item 1 ("Whether and
how Contagem's Mode B... interacts with the existing `units[0]`-reference
convention... is not resolved by any prior artifact"), and was then
given its first concrete technical shape by
`business-worth-evolution-rule8-assessment.md` Finding 7-A ("design
direction confirmed workable... exact mechanics remain Implementation
Plan detail"). The Implementation Plan that followed chose, as its
design-pass resolution (recorded in `contagemMultiUnitValuation.ts`'s own
header comment): Mode A's reference unit **defaults to `units[0]`**,
exactly matching the Specification's own fixed reference point, while
additionally making it **owner-overridable** via a dropdown — a detail
the Specification's "no separate, configurable... reference-unit choice"
sentence does not, on its strict text, appear to have anticipated, but
which no later artifact flagged as a conflict at the time.

**What this session's governing input requires.** §4 of the current
session's directive states explicitly and repeatedly: the existing
product's confirmed `sellingUnit` must be used automatically; the system
"must not... default to relationship.units[0]... assume the first
relationship unit is the selling unit." This is the literal opposite of
the Specification's fixed `units[0]` reference point.

**How this assessment resolves it.** Two readings are available:

1. **Narrow/implementation-extension reading (adopted here).**
   `product-unit-of-measure-specification.md` §4 was written to fix a
   reference point for the *general* case — a product whose chain may or
   may not have a confirmed `sellingUnit` at all (the field is optional
   per the Specification's own Data Model, §2). `sellingUnit`, when
   confirmed, is itself a more specific, deliberately-owner-established
   reference within that same data model (POL-0005's own minimum-
   configuration mechanism), not a rival concept to `units[0]` — it is
   the exact field the Specification's own §7 anticipates ("missing a
   confirmed `sellingUnit` **where a selling reference is being
   configured**" implies a confirmed one *is* the selling reference once
   it exists). Under this reading, "reuse `sellingUnit` as the reference
   when confirmed, falling back to `units[0]` only when no `sellingUnit`
   is confirmed" is a narrowing/refinement of the existing convention,
   not a contradiction of it — `units[0]` remains exactly the fallback
   the Specification already describes for a product with no more
   specific selling reference.
2. **Strict-text reading (not adopted, flagged).** §4's sentence names
   `units[0]` without qualification as "the" reference point and
   explicitly rules out "a separate, configurable... reference-unit
   choice" — under a strict textual reading, preferring `sellingUnit`
   is a genuine amendment to an Accepted Specification section, not an
   implementation detail.

**Disposition.** This assessment proceeds under reading (1), on the
explicit strength of this session's own governing directive (§1–§4 of
the input prompt), which is treated as a direct, current, in-session
Product Architect clarification of exactly this ambiguity — the
Specification's own text is genuinely ambiguous between "the reference
point is unconditionally `units[0]`" and "the reference point is
`units[0]` absent a more specific confirmed selling reference," and the
governing input resolves that ambiguity explicitly, in the direction of
reading (1), rather than inventing a new business rule from nothing.
**This assessment recommended, as a remaining governance gate, that a
short addendum recording this clarification be appended to
`product-unit-of-measure-specification.md` §4 before Implementation
Authorization is granted** — this assessment did not itself modify that
Specification, per the original session's explicit instruction not to
modify governance documents; it only identified the need.

**RESOLVED (this revision).** That recommended addendum has since been
drafted, reviewed, and **formally signed**: [`uom-specification-section4-existing-product-contagem-reconciliation-addendum.md`](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
(✅ SIGNED, SABUSHIMIKE MASCENI, 29 August 2026) records, as an explicit,
separate, signed Product Architect decision, exactly reading (1) above:
an existing product's confirmed `sellingUnit` is the selling/valuation
reference point for Periodic Contagem; `units[0]` remains the fallback
only when no `sellingUnit` is confirmed; no new per-Contagem
reference-unit choice is introduced; FR-67's own, separate `units[0]`
cost-basis convention is explicitly and unaffected by this signature
(the signed addendum's own §3a). The strict-text reading (2) is
therefore superseded by explicit signed governance, not merely by this
assessment's own prior, provisional disposition — the ambiguity §0
identified in `product-unit-of-measure-specification.md` §4 no longer
requires this assessment's own interpretive judgment to resolve; it is
now settled by a dedicated, signed governance artifact.

No Finding below depended on anything beyond this now-signed resolution;
every Finding that previously carried a conditional "depends on §0's
disposition" note is updated at §12/§13, below, to reflect that the
condition is cleared.

## 1. Objective

Determine whether the three prior investigations' identified gaps (GAP
A–D, restated in §10 of the governing input) are technically safe, fully
bounded, and buildable against the actual current codebase, using
exclusively already-existing conversion/memory mechanisms — without
inventing new business requirements, without silently resolving §0's
tension beyond what is explicitly stated above, and without smuggling
implementation detail into what should remain a governance artifact.

## 2. Governance Inputs

Read completely and fresh, in this session:

- The current prompt's own §1–§20 (Product Architect's Definitive
  Business Model, Core Principle, existing-product Selling Unit/Price
  Memory, Silent Conversion, Add Portion, Cost Price, Single-Unit
  Products, Exact Current Problems, Critical Multi-Unit Example,
  Reuse-First Requirement, Mode A/B question, Rule 8 Analysis
  requirements, exclusions, Test Plan, Governance Classification,
  Required Output, Change Control).
- `product-unit-of-measure-specification.md` — full document, §2 (Data
  Model), §4 (Screen-by-Screen Behavior, esp. Periodic Contagem), §7
  (Incomplete/Unconvertible Configuration), §9 (Minimum Configuration
  Validation).
- `product-memory-purchase-selling-valuation-specification.md` — §12
  (Purchase Unit vs. Selling Unit), §13 (Automatic Purchase-to-Selling
  Conversion), §16 (Initial Stock Valuation — mixed-unit/mixed-price-
  basis scope boundary), §17 (Periodic Contagem Valuation).
- `business-worth-evolution-specification.md` — §36 item 1, the §613
  traceability-table row for `BDR-0012`, §345/§360/§367 (Mode A/B and the
  §42 deterministic cost-basis-conversion amendment).
- `business-worth-evolution-rule8-assessment.md` — Finding 7-A and its
  §134 traceability-table row.
- Three prior read-only investigation reports produced earlier in this
  session (existing-product second-Contagem behaviour, Cost Price
  verification, buying-unit-vs-selling-unit deep trace) — treated as
  this assessment's own §4 (Current-System Evidence) source, re-verified
  directly against source in this session rather than trusted from
  memory (see §4, below, for the direct re-verification).

**No documentation-sync discrepancy found** beyond the §0 tension itself,
which is explicit, not a sync error.

## 3. Accepted Business Constraints (restated, not re-decided)

Every Finding below cites back to one of these:

1. An existing product's `unitRelationship`, `sellingUnit`, and product
   identity are never re-collected during Contagem (`product-unit-of-
   measure-specification.md` §4, "an existing confirmed configuration
   (reused, never re-recognized)").
2. Multiple physical units may be entered independently for one product
   within one count, never merged, never forced into one unit (`BDR-0012`
   Decisions 6–7; `product-unit-of-measure-specification.md` §4's mixed-
   unit combination step).
3. Each portion's valuation price may be independently owner-specified
   during a stock count — Mode B, already Accepted business behavior,
   scoped exclusively to Initial Stock and Periodic Contagem valuation,
   never to purchase/receipt entry (`product-memory-purchase-selling-
   valuation-specification.md` §16/§17).
4. A confirmed `sellingUnit` must be a member of `units[]` (POL-0005,
   `product-unit-of-measure-specification.md` §9) — no new validation
   rule is needed for this correction; it already exists.
5. The already-existing conversion engine (`getConversionFactor`,
   `resolveUnitAwarePrice`, `deriveModeAPortionValuations`) is the single
   authoritative arithmetic path for any unit conversion — no new engine
   may be introduced (this session's own §6/§12 instruction, consistent
   with every prior conversion-engine artifact's own "one authoritative
   valuation path" discipline).
6. Cost Price is not an owner-facing Contagem input, for any product, any
   portion (§44, already governed, already shipped — untouched by this
   correction).
7. A single-functional-unit product requires no `UnitRelationship`, and
   this correction introduces none (`product-unit-of-measure-
   specification.md` §4, "Periodic Contagem" bullet's own scope; `BDR-0012`
   §5.A Item 3).
8. Add Portion is Contagem-scoped, never Product Memory, never carried
   forward (this session's own §7; consistent with `handleAddPortionToManualGroup`'s
   existing, unmodified behavior — Finding D, below, does not change
   this).
9. Initial Stock is unaffected in every respect (this session's own §9,
   §15).

## 4. Current-System Evidence

All of the following was re-verified directly against `main = 558fd46`
in this session (not merely carried over from the prior investigations'
own text).

- **`apps/tenant/src/components/PeriodicStockCountView.tsx`**,
  `buildCatalogRow` (lines 659–672) — `unit = latestBatch?.unit ?? ''`;
  `sellingPrice = latestBatch?.sellingPrice ?? product.sellingPrice ?? ''`.
  **No reference to `product.unitRelationship.sellingUnit` anywhere in
  this function.** Confirmed by direct re-read.
- **Same file**, every read of `.sellingUnit` (4 occurrences, lines 1440,
  2289 [comment], 2294 [comment], 2316, 3845) — **all four read
  `newProductInfo[key].sellingUnit`** (new-product-only, in-session
  state). Confirmed by direct grep and line-by-line re-check: zero reads
  of `product.unitRelationship.sellingUnit` for an existing product
  anywhere in this file.
- **Same file**, `handleModeAToggle` (lines 1569–1587), line 1585 —
  `const defaultReferenceUnit = relationship?.units?.[0]?.unit || '';`
  — the function's own adjacent comment (lines 1578–1583) states this
  defaults "to the chain's own **purchase unit**," by name. Confirmed.
- **Same file**, `ModeAValuationControl`'s render site (lines 3429–3467),
  line 3444–3445 — `referenceUnitOptions = relationship.units.map((u) =>
  u.unit)`; `effectiveReferenceUnit = config?.referenceUnit ||
  referenceUnitOptions[0] || ''` — same `units[0]` default, confirmed at
  the render call site independently of `handleModeAToggle`.
- **Same file**, `handleModeAToggle` line 1586 —
  `referencePrice: ''` unconditionally on toggle-on. No seeding from any
  Product Memory source. Confirmed.
- **`apps/tenant/src/lib/contagemMultiUnitValuation.ts`**,
  `deriveModeAPortionValuations` (lines 157–195) — reuses
  `getConversionFactor` as its sole conversion engine; returns `null`
  (never a fabricated factor) for an unconvertible portion; writes a
  derived price per-portion, never touching quantity/unit. Confirmed
  correct and already fully tested (this file's own docstrings cite
  passing coverage). **This function requires zero changes** to serve
  a `sellingUnit`-preferred reference — it already accepts an arbitrary
  `referenceUnit` string; only the *caller's* choice of default changes.
- **Same file**, `collectGroupPortions` (lines 1519–1528) — merges
  catalog row + every manual/"Adicionar Porção" row for the same product
  into one flat portion list, already fed into Mode A uniformly (both
  `catalog:` and `manual:` id-prefixed portions receive derived prices
  identically once Mode A is active, via `applyModeAToGroup`, lines
  1543–1567). **Confirmed: Mode A already applies to Add Portion rows,
  not merely the anchor row, once active** — Gap D (governing input §10)
  is therefore narrower than "Add Portion has zero access to the engine"
  — it is "Add Portion has zero access **unless Mode A is already
  active for that product in this Contagem**," which remains a real gap
  (the owner must still discover and activate Mode A) but is not a
  structural inability.
- **`apps/tenant/src/lib/productMemoryPriceResolution.ts`**,
  `findLatestRememberedProductMemory` (lines 143–201) — accepts an
  optional `preferredSellingUnit` parameter (lines 148–163) whose own
  header comment states it exists precisely "to prefer whichever portion
  is denominated in the product's own CONFIRMED designated selling unit
  (`Product.unitRelationship.sellingUnit`)." **This function already
  implements exactly the tie-break `sellingUnit`-preference this
  correction needs — it is simply never called from
  `PeriodicStockCountView.tsx`.** Confirmed by grep: called from
  `AddStockView.tsx` (6 sites) and `ProductDetailModal.tsx`; zero calls
  from `PeriodicStockCountView.tsx`.
- **`apps/tenant/src/lib/productMemoryPriceResolution.ts`**,
  `resolveUnitAwarePrice` (lines 53–68) — pure, already-tested, converts
  a remembered `(price, unit)` pair into an equivalent price for a
  different `targetUnit`, via the confirmed `unitRelationship`; returns
  `''` (never a fabricated number) when no valid relationship bridges
  the two units. **Already used in this exact file** (`getRememberedPriceForRow`,
  line 1203) for the price-deviation-warning comparison, but **not** for
  the catalog row's own initial prefill (`buildCatalogRow` does not call
  it). This is the single existing function that would let
  `buildCatalogRow` correctly re-denominate a batch's own raw
  `sellingPrice` into the confirmed `sellingUnit`'s terms.
- **`apps/tenant/src/lib/purchaseToSellingConversion.ts`**,
  `buildDerivedSellingValuationSnapshot` (lines 254–285) and
  `deriveTransactionValuation` (lines 180–201) — both are Add-Stock-side
  (`addMultipleStockBatches`) mechanisms that, at the moment a purchase
  batch is committed, derive and freeze a `StockBatch.derivedSellingValuation`
  snapshot (`ratePerPurchaseUnit`, `sellingUnit`, `sellingUnitPrice`) from
  whatever Product Memory (`unitRelationship` + `Product.sellingPrice`) was
  confirmed at that moment — but only when `Product.sellingPrice` is
  itself set. Confirmed: `Product.sellingPrice` is written **only** by
  `EditProductModal.tsx` (a manual catalog-editing screen, lines 42–50),
  never automatically by Contagem or by `addStockBatch` itself. This
  means `StockBatch.derivedSellingValuation`, though a real, already-
  built, already-frozen "selling-unit-denominated purchase valuation"
  record, is **absent on most batches in practice** (it requires
  `Product.sellingPrice` to already be manually set at purchase time) —
  confirmed not to be a reliable memory source for this correction on
  its own, though it is noted here per the reuse-first requirement.
- **`apps/tenant/src/components/PeriodicStockCountView.tsx`**,
  `ExistingProductSummary` (lines 511–550) — displays purchase cost basis
  and the relationship chain; **never displays `sellingUnit`**. Confirmed
  by direct re-read.
- **`firestore.rules`**, `stockCounts` `create`/`update` rules (lines
  613 onward) — no per-item field-shape validation for periodic
  (non-`'initial'`) counts. Confirmed: adding no new field to any
  persisted type (this correction changes only *which value* is written
  into the existing `sellingPrice`/`unit` fields, at prefill time — see
  §5 Finding A) requires no `firestore.rules` change.
- **`firestore.indexes.json`** — grepped; no `stockCounts`-item-level
  index exists; no index implication.
- **`apps/tenant/src/context/AppContext.tsx`**, `recordStockCount` (lines
  4250 onward) — the `if (!product)` guard (line 4428) confirms an
  existing product's `unitRelationship` is never read or overwritten by
  Contagem confirmation. This correction changes only client-side
  *prefill* logic (`buildCatalogRow`, `handleModeAToggle`) — it proposes
  **no change** to `recordStockCount`, `normalizeStockCountItems`, or any
  persistence path.

## 5. Technical Findings

### Finding A — Catalog-Row Default Unit/Price Anchored to Latest Batch, Not Confirmed `sellingUnit`

**Severity:** MAJOR (Rule-8-resolvable — resolved by the signed reconciliation addendum, 29 August 2026)

**Current state vs. requirement:** `buildCatalogRow` sets `unit`/
`sellingPrice` from the latest `StockBatch`'s own denomination
unconditionally — never checking `product.unitRelationship.sellingUnit`.

**What must change:** when a product has a confirmed, valid
`unitRelationship` with a confirmed `sellingUnit`, `buildCatalogRow`
should default the row's `unit` to that `sellingUnit`, and resolve the
row's `sellingPrice` by converting the latest batch's own `(sellingPrice,
unit)` pair into `sellingUnit` terms via the already-existing
`resolveUnitAwarePrice(rememberedRaw, batchUnit, sellingUnit,
relationship)` — reusing exactly the function already proven correct and
already used elsewhere in this same file for the deviation check. When
`resolveUnitAwarePrice` returns `''` (no valid bridging relationship —
should not occur for a confirmed, valid chain, but the function's own
contract guarantees no fabricated number regardless), the row falls back
to today's behavior (latest batch's own unit/price, unconverted) rather
than showing a blank the owner cannot explain.

**What must NOT change:** a product with **no** confirmed `sellingUnit`
(the field is optional) keeps today's exact behavior — latest batch's
own unit/price, unconverted — since there is no more specific reference
to prefer. A single-unit product (no `unitRelationship` at all) is
entirely unaffected — `buildCatalogRow` never touches `unitRelationship`
today and this Finding does not add such a read for that case (§3
constraint 7).

**Reuse-first disposition:** no new function. `resolveUnitAwarePrice`
already exists, is already tested, and already performs exactly this
conversion for a sibling purpose in the same file.

**Governance classification:** Rule-8-resolvable. **Now unconditionally
resolved** — the signed [reconciliation addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
(29 August 2026) provides the explicit Product Architect decision this
Finding's `units[0]` vs. `sellingUnit` reference-point question required;
no longer dependent on this document's own §0 disposition alone.

### Finding B — Mode A's Default Reference Unit Repeats the Purchase-Unit Assumption

**Severity:** MAJOR (Rule-8-resolvable — resolved by the signed reconciliation addendum, 29 August 2026)

**Current state vs. requirement:** `handleModeAToggle` (line 1585) and
`ModeAValuationControl`'s render site (line 3445) both default the
reference unit to `relationship.units[0].unit`.

**What must change:** both sites should prefer
`relationship.sellingUnit` (when confirmed and a member of the chain —
already guaranteed by POL-0005/`isValidUnitRelationship`) as the default
reference unit, falling back to `relationship.units[0].unit` only when no
`sellingUnit` is confirmed — the exact same two-tier preference as
Finding A, applied to Mode A's own default instead of the catalog row's.

**What must NOT change:** the owner's ability to override the reference
unit via the existing dropdown (`referenceUnitOptions`, unchanged, still
every chain unit) is preserved exactly as today — this Finding changes
only which option is *pre-selected*, never which options are offered,
and never removes the owner's freedom to choose differently (this
session's own §13 question: "should the owner still have the freedom to
override/edit prices?" — yes, unchanged).

**Reuse-first disposition:** no new function; `deriveModeAPortionValuations`
itself needs zero changes (§4, above) — it already accepts an arbitrary
`referenceUnit` string.

**Governance classification:** Rule-8-resolvable. **Now unconditionally
resolved**, same basis and same signed addendum as Finding A.

### Finding C — Mode A's Reference Price Is Never Seeded from Memory

**Severity:** MINOR (Rule-8-resolvable)

**Current state vs. requirement:** `handleModeAToggle` sets
`referencePrice: ''` unconditionally on toggle-on, regardless of any
remembered price.

**What must change:** on toggle-on, when a confirmed `sellingUnit` and a
resolvable remembered price exist (the same `buildCatalogRow`/
`resolveUnitAwarePrice` resolution Finding A performs, or — where
available — a governed `Product.sellingPrice` reference, per the
existing `buildCatalogRow` fallback tier), seed `referencePrice` from
that resolved value instead of `''`. The owner remains free to edit it
immediately (this session's own §5: "must remain editable"; §13:
unchanged owner freedom) — this Finding only changes the *starting*
value shown, never removes editability, never blocks confirmation on an
unedited value, and never silently substitutes a value the owner did not
see.

**What must NOT change:** when no resolvable remembered price exists
(no batch, no reference price, no valid relationship), `referencePrice`
remains `''`, exactly as today — no fabricated seed value under any
circumstance (mirrors every other "never fabricate, warn-and-allow"
guarantee already established throughout this codebase's conversion
functions).

**Reuse-first disposition:** reuses Finding A's own resolution path; no
new function.

**Governance classification:** Rule-8-resolvable. Narrower in scope than
Findings A/B — this is a UX seeding improvement, not a reference-point
question, so it does not itself depend on §0's disposition (it is a pure
usability improvement regardless of which unit is chosen as reference).

### Finding D — Add Portion Rows Receive No Assistance Unless Mode A Is Already Active

**Severity:** MINOR (Rule-8-resolvable)

**Current state vs. requirement:** confirmed in §4: Mode A, once active
for a product group, already applies uniformly to every portion in that
group (catalog row and every manual/"Adicionar Porção" row alike) via
`collectGroupPortions`/`applyModeAToGroup`. The gap is narrower than "no
access to the engine" — it is that the owner must discover and
explicitly activate Mode A, per product, per Contagem, before any
portion (including the very first one they add) receives any conversion
assistance.

**What must change:** nothing in Add Portion's own creation mechanism
(`handleAddPortionToManualGroup`) or its temporariness (§3 constraint 8,
this session's own §7 — explicitly preserved, not renegotiable by this
Finding). The improvement available here is indirect: if Findings A–C
ship, a newly-added manual-row portion for a product with a confirmed
`sellingUnit` and a resolvable remembered price benefits from the SAME
resolution path Finding A/C use — **only if** the manual row's own
`unit` happens to already equal the confirmed `sellingUnit` at creation
(in which case `getRememberedPriceForRow`'s existing deviation-check
resolution already applies) or **only if** Mode A is separately turned
on for that group. This assessment does **not** propose auto-seeding a
newly-created blank manual row's `sellingPrice` field directly (that
would mean guessing which unit the owner is about to type before they
type it — a fabrication this codebase's every other conversion function
explicitly refuses to do). The correct, safe, Rule-8-resolvable
improvement is: Findings A–C already make Mode A cheaper to discover and
faster to use correctly (a pre-seeded, correctly-defaulted reference
unit/price) — this is the full extent of what can honestly be done
without violating Add Portion's own "the owner decides what an added
portion represents" principle (this session's own §7: the system "must
not infer or permanently remember that business decision").

**What must NOT change:** Add Portion's temporariness, its non-
inheritance into the next Contagem, its non-promotion to Product Memory —
all explicitly preserved, unchanged by this Finding (§3 constraint 8).

**Governance classification:** Rule-8-resolvable. This Finding narrows
the governing input's own Gap D framing to what is honestly achievable
without inventing a new "guess the owner's intended unit" mechanism —
flagged explicitly as a scope narrowing, not silently reduced.

### Finding E — Single-Unit Products Are Unaffected

**Severity:** — (Verification)

**Current state vs. requirement:** `buildCatalogRow` never reads
`unitRelationship` at all today; Findings A–D all gate on "a confirmed,
valid `unitRelationship` with a confirmed `sellingUnit`" — a single-unit
product has no `unitRelationship` object at all (§3 constraint 7), so
every one of these Findings' own conditionals is false for it,
unconditionally. **No code path introduced by this correction can ever
execute for a single-unit product.**

**Governance classification:** Verification. PASS — no change required,
no risk.

## 6. Rule 8 Analysis — the 20 Required Dimensions

For each dimension: current behaviour, desired behaviour, risk, proposed
reuse-first solution, whether code/schema/governance changes are
required.

**A. Business correctness.** Current: existing-product row anchors to
buying unit, not selling unit — the exact defect §0/Findings A–B name.
Desired: selling-unit-denominated by default, owner-editable. Risk:
low — the underlying arithmetic (`resolveUnitAwarePrice`,
`getConversionFactor`) is already tested; risk is confined to *which
value* is chosen as default, not to any new calculation. Solution:
Findings A–C. Changes required: code (client-side prefill logic only);
governance — resolved (the signed reconciliation addendum, 29 August
2026, is the closing governance basis; no further governance change
required for this dimension).

**B. Data integrity.** Current: `StockCountItem.costPrice`/`sellingPrice`/
`unit` schema unchanged by this correction. Desired: unchanged. Risk:
none — no field added, removed, or retyped. Solution: n/a. Changes
required: none.

**C. Multi-unit correctness.** Current: already correct — confirmed §4,
multiple portions never merged, summed independently by
`normalizeStockCountItems`. Desired: unchanged. Risk: none — this
correction touches only *default price/unit values shown before the
owner edits them*, never the underlying multi-portion data model. Solution:
n/a. Changes required: none (this dimension is already satisfied and
this correction does not touch it).

**D. Buying-unit vs. selling-unit independence.** Current: conflated by
default in `buildCatalogRow`/Mode A (Findings A/B). Desired: fully
independent, per §2 of the governing input ("BUYING UNIT ≠ SELLING
UNIT"). Risk: low, same as A. Solution: Findings A/B. Changes required:
code.

**E. Single-unit products.** Current/desired: already correct, Finding
E. Risk: none. Solution: n/a. Changes required: none.

**F. Existing-product memory.** Current: `unitRelationship`/`sellingUnit`
correctly read-only (never re-collected); `sellingPrice` prefill
incorrectly ignores `sellingUnit`. Desired: both correctly reused.
Risk: low. Solution: Findings A–C. Changes required: code.

**G. Latest purchase memory.** Current: correctly sourced from the most
recent `StockBatch` (matches this session's own §5 rule: "use the latest
selling price recorded during the latest purchase/Add Stock"). Desired:
unchanged *source*, corrected *denomination* (§2's distinction). Risk:
low. Solution: Finding A (re-denominates, does not change the source).
Changes required: code.

**H. Price denomination correctness.** Current: incorrect — a batch's
own raw price, in its own unit, is presented under the confirmed
`sellingUnit`'s implicit label without conversion. Desired: correctly
converted via `resolveUnitAwarePrice`. Risk: low — this exact function
already handles the "no valid bridge" case safely (returns `''`, never a
wrong number). Solution: Finding A. Changes required: code.

**I. Silent conversion.** Current: only available via manually-activated
Mode A, defaulting to the wrong reference unit. Desired: automatic,
correct-by-default reference unit; Mode A remains the mechanism, not
replaced. Risk: low — reuses `deriveModeAPortionValuations` unmodified.
Solution: Findings A–C. Changes required: code.

**J. Add Portion temporariness.** Current/desired: already correct,
unaffected — confirmed Finding D and §4 (draft deletion, `manualRows`
reset). Risk: none — this correction proposes no change to Add Portion's
own persistence semantics (this session's own explicit prohibition, §7,
§10 note under Gap D, §16). Solution: n/a. Changes required: none.

**K. Cost Price exclusion.** Current/desired: already correct, §44
untouched. Risk: none. Solution: n/a. Changes required: none — this
correction does not read, write, or display `costPrice` anywhere.

**L. Tenant isolation.** Current: `firestore.rules` `stockCounts` rules
gate on `isMemberOf(businessId)`/`isOwnerOf(businessId)`, unaffected by
this correction (no new field, no new collection, no new write path —
this correction changes only which *pre-existing* field values a
client-side prefill function computes before the owner edits and
confirms). Risk: none. Solution: n/a. Changes required: none.

**M. Performance / read amplification.** Current: `buildCatalogRow`
already reads `batches` (already in memory, client-side, via the
existing `AppContext` listener) and `products` (same). Desired: adds one
additional read of `product.unitRelationship.sellingUnit` — already
in-memory on the same `Product` object already being read. Risk: none —
zero new Firestore reads, zero new listeners. Solution: n/a. Changes
required: none.

**N. Draft durability.** Current: `PeriodicStockDraft`/`StockCountWorkingRow.sellingPrice`/`.unit`
round-trip verbatim as strings (`workingRowToDraftItem`/
`draftItemToWorkingRow`, `stockCount.ts`). Desired: unchanged — this
correction changes only the *initial* value `buildCatalogRow` computes
before any draft exists; once a draft is saved (with the owner's own
edited or accepted value), resume behavior is byte-for-byte identical to
today, since the draft round-trip functions are not modified by this
correction. Risk: none. Solution: n/a. Changes required: none.

**O. Backward compatibility.** Current: every field this correction
touches (`StockCountWorkingRow.unit`/`.sellingPrice`) already exists,
already required, already string-typed. Desired: unchanged shape,
different *initial* value only. A resumed draft saved before this
correction ships round-trips exactly as it does today — nothing about
this correction depends on, or changes, the persisted `PeriodicStockDraft`
shape. Risk: none. Solution: n/a. Changes required: none.

**P. Existing-product vs. new-product branching.** Current:
`isGenuinelyNewProductName` correctly gates `NewProductInfoPanel` vs.
`ExistingProductSummary`/`buildCatalogRow`, unaffected by this
correction — Findings A–D touch only the existing-product branch's own
internal prefill logic, never the branching condition itself, never the
new-product panel (this session's own explicit "new-product path remains
unchanged," §16). Risk: none. Solution: n/a. Changes required: none.

**Q. Failure behaviour when relationship/memory is missing.** Current
and desired, unchanged by this correction: `resolveUnitAwarePrice`/
`getConversionFactor` already return `''`/`null` (never a fabricated
value) when no valid bridging relationship exists; `buildCatalogRow`'s
existing fallback tiers (batch → `Product.sellingPrice` reference →
blank) remain the fallback whenever the new, more specific `sellingUnit`
resolution cannot be performed. Risk: none — this correction adds a
*preferred* resolution path in front of the existing fallback chain,
never removes or weakens the existing chain. Solution: Findings A–C, as
specified (their own "what must NOT change" clauses). Changes required:
code (additive only).

**R. Server validation / Firestore boundaries.** Current: no per-item
field-shape validation exists for periodic `stockCounts` creates/updates
(§4, confirmed directly against `firestore.rules`). Desired: unchanged —
this correction is entirely client-side prefill logic; the eventual
submitted `sellingPrice`/`unit` values are exactly what the owner sees
and (optionally) edits before confirming, exactly as today. Risk: none.
Solution: n/a. Changes required: none to `firestore.rules` or
`firestore.indexes.json`.

**S. Regression risk.** Current tests (`periodic-stock-existing-product-summary.test.ts`,
`periodic-contagem-cost-price-removal.test.ts`,
`periodic-stock-multi-portion-valuation.test.ts`, and others) assert
today's exact `buildCatalogRow`/`handleModeAToggle` default behavior
implicitly (via structural source-text assertions) or explicitly (via
fixture-based unit tests of the guard logic these Findings touch).
Risk: MEDIUM — any structural test asserting the literal text
`relationship?.units?.[0]?.unit` as `handleModeAToggle`'s default, or
`latestBatch?.unit`/`latestBatch?.sellingPrice` as `buildCatalogRow`'s
unconditional source, will need updating to match the new two-tier
preference; this is an expected, known consequence, not a surprise
regression (mirrors the `price-deviation-warning-wiring.test.ts`
call-count precedent from the §44 Rule 8 Assessment). Solution: identify
and update exactly those assertions in the companion Implementation
Plan's Test Plan (§17 of the governing input; §7 of the companion Plan).
Changes required: tests (not created by this assessment — the companion
Plan enumerates them; no test file is modified by this document).

**T. Testability.** Current: `buildCatalogRow`, `handleModeAToggle`, and
`resolveUnitAwarePrice` are all plain, already-unit-tested-in-part
functions/branches, following this file's own established "no DOM
harness — source-structure and pure-function fixture tests" convention
(`periodic-stock-existing-product-summary.test.ts`'s own header).
Desired: unchanged testing strategy — every new assertion these Findings
require follows the identical pattern already established by that file
and by `periodic-contagem-cost-price-removal.test.ts`. Risk: none.
Solution: n/a. Changes required: none to the testing *approach* — only
new assertions, enumerated in the companion Plan.

## 7. What This Correction Does NOT Change (Reuse-First Boundary)

Per the governing input's own §12 instruction and this assessment's own
findings:

- `UnitRelationship` schema — unchanged (Finding E; every Finding gates
  on the existing, optional `sellingUnit` field, adds no new field).
- The conversion engine (`getConversionFactor`, `resolveUnitAwarePrice`,
  `deriveModeAPortionValuations`) — unchanged, reused verbatim (§4, every
  Finding's own "reuse-first disposition").
- The Business Worth formula, `normalizeStockCountItems`,
  `recordStockCount` — unchanged (§4, §6.B/§6.R).
- Add Stock architecture, Smart Stock Entry extraction contract —
  unchanged; this correction touches only
  `PeriodicStockCountView.tsx`'s own client-side prefill logic.
- Initial Stock — unchanged, not investigated beyond the necessary
  citation of `InitialStockCountView.tsx`'s own name in
  `ExistingProductSummary`'s pre-existing comment (not opened, not
  modified, not analyzed).
- Cost Price removal (§44) — unchanged, untouched.
- Add Portion's persistence semantics — unchanged (Finding D's own
  explicit scope narrowing; §3 constraint 8).
- `firestore.rules`, `firestore.indexes.json` — unchanged (§6.L/§6.R).

## 8. Explicitly Out of Scope

- Case A (new-product setup flow) — already governed, already shipped in
  `558fd46`; this assessment does not reopen it.
- Initial Stock, in every respect.
- The Mode A/Mode B business semantics themselves (this session's own
  §13: "do not automatically conclude that Mode A itself must become the
  permanent model") — this correction does not change what Mode A *is*,
  only what it *defaults to* and how `buildCatalogRow` independently
  prefills the anchor row; Mode B (independent per-portion pricing)
  remains the unconditional default behavior for a product with no
  confirmed `sellingUnit`, exactly as today.
- Any Product-level "selling portions" configuration — explicitly not
  proposed (this session's own §10 Gap D note; Finding D's own
  disposition).
- Exact UI copy/label wording for any changed prefill — this assessment
  fixes the governing resolution logic, not pixel-level presentation
  detail, mirroring the §44 Rule 8 Assessment's own precedent (Finding
  5's identical deferral).

## 9. Migration/Backfill Assessment

None required, none proposed. No schema field is added, renamed, or
retyped by this correction (§6.B/§6.O). Every existing historical
`StockCount`/`PeriodicStockDraft` document remains exactly as persisted;
this correction affects only what a *future* Contagem's own client-side
prefill computes before the owner sees and edits it.

## 10. Testing Strategy (feeds the companion Implementation Plan's Test Plan)

Structural, source-text and pure-function fixture tests, matching this
file's own established no-DOM-harness convention (`periodic-stock-existing-product-summary.test.ts`,
`periodic-contagem-cost-price-removal.test.ts`). At minimum:

- A fixture test proving `buildCatalogRow`'s new two-tier resolution
  (`sellingUnit`-preferred, `units[0]`/raw-batch fallback) against the
  exact Impala worked example (§12, below, and the companion Plan's §7).
- A fixture test proving the same for `handleModeAToggle`'s default
  reference unit and seeded reference price.
- A fixture test proving a single-unit product (no `unitRelationship`)
  takes neither new code path (Finding E).
- A fixture test proving a product with **no** confirmed `sellingUnit`
  (relationship exists, `sellingUnit` absent) falls back to today's exact
  `units[0]`/raw-batch behavior, unchanged.
- A fixture test proving `resolveUnitAwarePrice`'s existing `''`
  (no-fabrication) contract is honored when no valid bridge exists
  post-correction, identically to pre-correction.
- Regression re-verification (not new tests) of every existing test
  identified in §6.S as depending on the prior default, updated to match
  the new two-tier preference — enumerated precisely by file/line in the
  companion Implementation Plan, not modified by this document.

Full enumeration against the governing input's own 22-item Test Plan
(§17) is carried in the companion Implementation Plan, §7.

## 11. Explicitly Out-of-Scope Governance Artifacts

This assessment does not create, and this session does not authorize:

- An Implementation Authorization (explicitly withheld, per this
  session's own instruction).
- A modification to `product-unit-of-measure-specification.md`,
  `business-worth-evolution-specification.md`, `BDR-0012`, `POL-0005`, or
  any other existing governance document — §0's recommended addendum is
  named, not drafted or applied.
- A new BDR or POL document — none is required; this correction is
  scoped as an implementation-level refinement of an already-Accepted
  business rule, per the now-signed reconciliation addendum (§0).

## 12. Governance Boundary Violation Scan

Explicit check, performed against every Finding above:

- **Findings A/B** — the two Findings whose Rule-8-resolvability
  originally depended on §0's own provisional disposition, now
  unconditionally resolved by the signed reconciliation addendum
  (stated explicitly in each Finding's own updated "Governance
  classification" line). Neither Finding invents new business logic
  beyond reusing the confirmed `sellingUnit` field the existing,
  Accepted UOM Specification's own Data Model already defines.
- **Finding C** — never depended on §0 (a pure seeding/UX improvement,
  independent of which unit is chosen as reference); flagged explicitly
  as such, unaffected either way by the signature.
- **Finding D** — narrows the governing input's own framing rather than
  expanding it; explicitly does not propose any new "infer the owner's
  intent" mechanism, honoring this session's own explicit prohibition
  (§7, "must not infer or permanently remember that business decision").
- **No Finding proposes new business logic, a new conversion engine, a
  new valuation formula, or any change to Business Worth, Initial Stock,
  Add Stock, Smart Stock Entry, or Cost Price removal.**
- **No Finding overrides `product-unit-of-measure-specification.md`
  §4's text without signed authority** — §0 records that a strict-text
  reading would have disagreed, and that ambiguity is now closed by the
  signed reconciliation addendum, not by this assessment's own
  interpretive judgment.

**The governance-boundary item previously flagged here is now RESOLVED
(this revision).** The signed [reconciliation addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
(✅ SIGNED, SABUSHIMIKE MASCENI, 29 August 2026) provides the explicit
Product Architect confirmation this section previously carried forward
as open: that a confirmed `sellingUnit` is the reference point for
existing-product Periodic Contagem valuation, `units[0]` remains the
fallback absent one, no new per-Contagem reference-unit choice is
introduced, and FR-67's own cost-basis `units[0]` convention is
unaffected. No item remains flagged for further Product Architect
confirmation before Implementation Authorization on this specific
question — the separate, distinct Implementation Plan acceptance gate
and the separate, distinct Implementation Authorization gate both
remain outstanding, unchanged by this resolution (§13, below).

## 13. Final Rule 8 Verdict

**READY.** *(Updated this revision from the original draft's
CONDITIONALLY READY — see §0/§12, above.)*

Findings A, B, C, D, and E are each individually Rule-8-resolvable —
none requires new architecture, none touches Business Worth, Initial
Stock, Add Stock, Smart Stock Entry, or Cost Price removal, and every
proposed mechanism already exists, already tested, in the codebase
today. **The item previously flagged in §0/§12 — this correction's core
premise (preferring `sellingUnit` over `units[0]`) sitting at the edge
of an existing Accepted Specification's own literal text — is now
RESOLVED** by the signed [reconciliation addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
(✅ SIGNED, SABUSHIMIKE MASCENI, 29 August 2026), which provides
explicit, dedicated, signed Product Architect authority for exactly this
narrowing — no longer merely this document's own provisional treatment
of the current session's input. FR-67's own, separate `units[0]`
cost-basis convention remains explicitly unaffected (§0's closing note;
Finding H's own "what must NOT change" clause).

**"READY" means every technical Finding in this assessment is
Rule-8-resolvable with no outstanding governance-boundary question.** It
does not mean implementation is authorized. The companion Implementation
Plan's own, separate acceptance gate remains outstanding (not affected by
this revision), and a distinct, signed Implementation Authorization
remains a required, later, separate gate. No code, `firestore.rules`,
index, or test file has been created or modified to produce this
assessment.

---

## Verification Performed for This Assessment

- The governing input (this session's own prompt, §1–§20) read completely
  and treated as the primary business-decision text.
- `product-unit-of-measure-specification.md` — §2, §4, §7, §9 re-read
  directly, in full, in this session.
- `product-memory-purchase-selling-valuation-specification.md` — §12,
  §13, §16, §17 re-read directly.
- `business-worth-evolution-specification.md` — §36 item 1, §345/§360/§367,
  the `BDR-0012` traceability-table row (§613) re-read directly.
- `business-worth-evolution-rule8-assessment.md` — Finding 7-A and its
  traceability row re-read directly.
- `apps/tenant/src/components/PeriodicStockCountView.tsx` — every cited
  line range (`buildCatalogRow`, every `.sellingUnit` read site,
  `handleModeAToggle`, `ModeAValuationControl`'s render site,
  `collectGroupPortions`, `ExistingProductSummary`,
  `isGenuinelyNewProductName`) re-read directly in this session, not
  inferred from the prior investigations' own summaries.
- `apps/tenant/src/lib/contagemMultiUnitValuation.ts`,
  `productMemoryPriceResolution.ts`, `purchaseToSellingConversion.ts` —
  read in full, in this session.
- `apps/tenant/src/context/AppContext.tsx`, `recordStockCount`'s
  `if (!product)` guard, re-confirmed directly.
- `firestore.rules` — `stockCounts` create/update rules re-read directly;
  confirmed no per-item field-shape validation exists.
- `firestore.indexes.json` — grepped; no `stockCounts`-item-level entry.
- `git status`/`git log -1` run immediately before this assessment began;
  confirmed `main = origin/main = 558fd46`, working tree clean.
- No `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or
  `tests/` file was modified to produce this assessment.
- No existing Specification, BDR, POL, or prior Rule 8 Assessment/
  Implementation Plan/Authorization was modified to produce this
  assessment's original draft.
- **This revision:** the signed [reconciliation addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
  read completely, confirmed ✅ SIGNED (SABUSHIMIKE MASCENI, 29 August
  2026); this document's own §0, §12, §13, and the Finding A/B
  "Governance classification" lines updated accordingly — no other
  section rewritten. The signed addendum itself was not modified to
  produce this revision. `git status`/`git log -1` re-confirmed
  `main = origin/main = 558fd46`, working tree clean, immediately before
  and after this revision (see the accompanying change-control report).
- No Implementation Authorization was created.

**This document does not itself authorize implementation.** It is a
readiness opinion only, per this repository's established Rule 8
discipline. The governance-boundary item this document's original draft
carried forward at §12 is now resolved by the signed reconciliation
addendum (§0, §13) — no open item remains on that question. An
Implementation Plan (companion document, with its own separate
acceptance gate) and a separate, signed Implementation Authorization
remain the required next gates.
