Implementation Authorization

# Periodic Contagem — Existing-Product Selling-Unit / Price-Memory Correction — Implementation Authorization

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).** See "Product
Architect Authorization / Signature," §10, below, for the complete
signed decision.

**Governing chain (sole authority for this Authorization):**
`BDR-0012` (Approved) →
[`product-unit-of-measure-specification.md`](../specs/product-unit-of-measure-specification.md)
§4 (✅ Accepted) →
[UOM Specification §4 / Existing-Product Periodic Contagem Reference-Point
Reconciliation Addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
(✅ **SIGNED**, SABUSHIMIKE MASCENI, 29 August 2026) →
[Rule 8 Assessment](./periodic-contagem-existing-product-selling-unit-memory-rule8-assessment.md)
(✅ **READY**) →
[Implementation Plan](./periodic-contagem-existing-product-selling-unit-memory-implementation-plan.md)
(✅ **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION AUTHORIZATION**,
SABUSHIMIKE MASCENI, 29 August 2026) → **this Authorization**.

**Baseline commit:** `65bed2e0a24dd165ff723eb7b7544037ce089b1e` (`main` =
`origin/main`, verified via `git status`/`git log -1` immediately before
drafting this document — working tree at that moment carried exactly one
unstaged, uncommitted modification, the Plan's own §11 Product Architect
Acceptance recorded in the immediately preceding governance step;
nothing else modified, nothing staged, nothing committed). This document
adds no further modification to any file other than itself.

**This document does not modify application code, tests, dependencies,
configuration, `firestore.rules`, `firestore.indexes.json`, `BDR-0012`,
the UOM Specification, the signed reconciliation addendum, the READY
Rule 8 Assessment, or the accepted Implementation Plan.** It exists to
record the Product Architect's formal decision to authorize engineering
work — populated strictly from the already-accepted Plan, the READY Rule
8 Assessment, and the already-signed addendum, introducing no new scope,
no new business decision, and no technical detail none of those three
documents already specifies.

**One capability, stated once, governing everything below:** for an
*existing* product's second-and-subsequent Periodic Contagem, prefer the
product's confirmed `unitRelationship.sellingUnit` — over `units[0]` —
as the default reference unit/price for (a) the auto-populated catalog
row and (b) Mode A's own default reference unit/price, falling back to
today's exact `units[0]`/latest-batch behavior whenever no `sellingUnit`
is confirmed. This document authorizes that capability as one whole,
exactly as the accepted Plan defines it — no part of it may be treated
as its own separately-gated capability.

---

## 1. Governance Completeness — What This Record Confirms

- `BDR-0012` and the UOM Specification remain Approved and unchanged.
- The UOM Specification §4 / Existing-Product Periodic Contagem
  Reference-Point Reconciliation Addendum is confirmed **✅ SIGNED**
  (SABUSHIMIKE MASCENI, 29 August 2026) — the explicit, dedicated,
  signed Product Architect authority narrowing §4's fixed `units[0]`
  reference point to defer to a confirmed `sellingUnit` when one exists,
  for existing-product Periodic Contagem only. FR-67's own, separate
  `units[0]` cost-basis convention is explicitly unaffected by that
  signature (addendum §3a, §4 item 8).
- The companion Rule 8 Assessment is confirmed **✅ READY** — Findings
  A–E are each individually Rule-8-resolvable; the governance-boundary
  question the assessment's own §0/§12 originally carried forward is
  resolved by the signed addendum, not by the assessment's own
  interpretive judgment.
- The Implementation Plan is confirmed **✅ ACCEPTED** (SABUSHIMIKE
  MASCENI, 29 August 2026, Plan §11) — translating the READY assessment
  and the signed addendum into an exact, file-by-file design: scope
  enumeration, explicit exclusions, files expected to change, files
  explicitly excluded, sequencing, a 22-item test plan mapped against
  the governing requirements, and a worked example.
- No unresolved governance blocker remains upstream of this Authorization.

## 2. What Is Authorized

**Objective, exactly as fixed by the Plan (§2, §5) and the signed
addendum (§4, §7):**

```
Existing-product Periodic Contagem, second and subsequent count:
  buildCatalogRow default unit/price:
    confirmed sellingUnit exists  → sellingUnit, price re-denominated via resolveUnitAwarePrice
    no confirmed sellingUnit      → today's exact behavior (latest batch's own unit/price, unconverted)
  handleModeAToggle / ModeAValuationControl default reference unit:
    confirmed sellingUnit exists  → sellingUnit
    no confirmed sellingUnit      → relationship.units[0].unit (unchanged)
  handleModeAToggle default reference price:
    resolvable remembered price exists → seeded from the same resolution buildCatalogRow performs
    otherwise                          → '' (unchanged, never fabricated)
```

**Authorized engineering work, drawn directly from the Plan's Scope
Enumeration (§2.1) — nothing added, nothing narrowed:**

1. **`buildCatalogRow`** (`PeriodicStockCountView.tsx`, current lines
   659–672) — two-tier resolution: when `product.unitRelationship` is
   confirmed, valid (`isValidUnitRelationship`), and carries a confirmed
   `sellingUnit`, default the row's `unit` to `sellingUnit` and resolve
   `sellingPrice` via the existing, already-tested
   `resolveUnitAwarePrice(latestBatch.sellingPrice, latestBatch.unit,
   sellingUnit, product.unitRelationship)`. When `resolveUnitAwarePrice`
   returns `''` (no valid bridge), or no `sellingUnit` is confirmed, fall
   back to exactly today's behavior. `costPrice` resolution is untouched.
2. **`handleModeAToggle`** (current lines 1569–1587) — `defaultReferenceUnit`
   prefers `relationship?.sellingUnit` (when present and a chain member)
   over `relationship?.units?.[0]?.unit`, falling back to the latter
   exactly as today when no `sellingUnit` is confirmed. The
   `ModeAValuationControl` render site's own `effectiveReferenceUnit`
   computation (current lines 3444–3445) is updated identically and
   atomically, so the toggle-time and render-time defaults can never
   disagree.
3. **`handleModeAToggle` — seeded reference price** (same lines) — on
   toggle-on, `referencePrice` is seeded from the same resolution item 1
   performs (reusing the resolved value, not a second independent
   computation) when a confirmed `sellingUnit` and a resolvable
   remembered price exist; otherwise remains `''`, exactly as today.
   Remains fully owner-editable immediately after seeding.
4. **No change** to Add Portion's own creation mechanism
   (`handleAddPortionToManualGroup`, `createManualRow`) — the only
   improvement is indirect, via items 1–3 making Mode A, once activated,
   cheaper to discover and correctly pre-seeded.
5. **No change** to `deriveModeAPortionValuations`, `getConversionFactor`,
   `resolveUnitAwarePrice`, `findLatestRememberedProductMemory`,
   `normalizeStockCountItems`, `recordStockCount`,
   `buildProductCostBasisMap`, `deriveCostContribution`,
   `ExistingProductSummary`'s own render logic, `isGenuinelyNewProductName`,
   or `NewProductInfoPanel` — every one of these is reused exactly as it
   exists today.
6. **Tests** — per §7, below, mapped to the Plan's own 22-item Test Plan.

**No new component or function is authorized; no existing component's
behavior for the cases it already handles correctly may change.**

## 3. Authorized Behavior — Preserved Exactly, Binding on Implementation

Carried forward unaltered from the READY Rule 8 Assessment and the
accepted Plan — none may be reinterpreted, loosened, or silently
narrowed during implementation.

**A. New product (Case A).** Already governed and shipped
(`558fd46`, the signed Decision 37 B.2 reconciliation): Contagem may
establish product identity, functional unit(s), a `UnitRelationship`
when two or more units exist, and a selling unit chosen from that
relationship. **Not reopened, not modified, not investigated by this
Authorization.**

**B. Existing single-unit product.** No `UnitRelationship` is required
or read. No meaningless `1 unit = 1 unit` relationship is created. No
selling-unit selector is required. Entirely unaffected by every item in
§2 (Rule 8 Finding E) — no code path this Authorization introduces can
ever execute for this case.

**C. Existing multi-unit product, second and subsequent Contagem.** The
owner is never asked to re-enter product name, functional units, unit
relationship, selling unit, or Cost Price. The existing Product Memory
is reused automatically.

**D. Confirmed selling unit.** When `Product.unitRelationship.sellingUnit`
exists and is valid, it is used as the selling/valuation reference unit
for both the catalog row's default and Mode A's default — never
`units[0]`, never the latest purchase/batch unit, unless that unit
happens to equal the confirmed `sellingUnit`. The owner is never forced
to re-select the selling unit on every Contagem.

**E. No confirmed selling unit.** The existing `units[0]` fallback
behavior is retained exactly as today. No new per-Contagem configurable
reference-unit mechanism is introduced.

**F. Latest purchase selling-price memory.** The latest selling price
recorded during the latest purchase/Add Stock of that product is the
remembered selling-price basis, re-denominated into the confirmed
`sellingUnit`'s terms when one exists. That remembered price remains
fully editable by the owner during the current Contagem. No
Contagem-specific price decision becomes permanent Product Memory.

**G. Physical quantities.** The owner may record multiple physical units
of the same product during one Contagem (e.g. `3 Cx`, `1 Emb`, `5 Un`)
as separate, independent physical portions/rows — never collapsed into
one displayed equivalent quantity. Any equivalent quantity required for
valuation is calculated silently, internally, by the existing conversion
engine.

**H. Add Portion (`Adicionar Porção`).** Remains optional, temporary,
valid only for the current Contagem, and is never memorized for the next
Contagem. The owner decides what an added portion represents (retail,
wholesale, discount, or any other owner-defined selling quantity) — the
system imposes no business meaning. Every added portion for a multi-unit
product allows independent physical quantity and unit. No standing
Product-level collection of selling prices/portions is created.

**I. Cost Price.** No owner-facing Cost Price input is introduced or
restored into normal Periodic Contagem — catalog rows, manual rows, or
Add Portion rows alike. The existing §44 Cost Price Removal remains
authoritative and untouched. The separate, already-governed, optional
new-product "Custo de Compra Original" field (if present in new-product
setup) is a distinct product-establishment concern, not conflated with
per-portion Contagem cost entry.

**J. FR-67 non-interference.** `units[0]` remains the governed reference
for the existing FR-67 cost-basis convention, entirely unchanged. This
Authorization changes only the selling/valuation reference behavior for
an existing product when a confirmed `sellingUnit` exists — it does not
alter FR-67, its calculation, or its `units[0]` anchor in any way.

**K. Initial Stock.** Completely outside this Authorization. Not
modified, not investigated. (Any separate discontinuation of Initial
Stock as a data-entry door is a distinct governance matter, outside this
Authorization's own scope and not addressed by it either way.)

**L. Add Stock / Smart Stock Entry.** Outside this Authorization. Not
redesigned. Existing behavior unchanged.

## 4. Scope and Affected Files

**Authorized (drawn directly from Plan §3 — nothing added):**

| File | Authorized change |
|---|---|
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | The sole application-code file: `buildCatalogRow`, `handleModeAToggle`, and the `ModeAValuationControl` render site's own `effectiveReferenceUnit` computation, per §2 above. |
| Test files (per §7, below) | New fixture tests plus identification (not silent modification) of any existing structural assertion of the pre-correction default. |

**Explicitly excluded, confirmed untouched by this Authorization**
(carried forward verbatim from Plan §2.2/§4):

- `apps/tenant/src/components/InitialStockCountView.tsx`
- `apps/tenant/src/components/AddStockView.tsx`
- `apps/tenant/src/lib/contagemMultiUnitValuation.ts`
- `apps/tenant/src/lib/purchaseToSellingConversion.ts`
- `apps/tenant/src/lib/productMemoryPriceResolution.ts`
- `apps/tenant/src/lib/unitRelationship.ts`
- `apps/tenant/src/utils/stockCount.ts`
- `apps/tenant/src/context/AppContext.tsx` (unless the accepted Plan
  explicitly requires a change — it does not)
- `apps/tenant/src/lib/fr67CostBasisConversion.ts`
- `types.ts` (unless the accepted Plan explicitly requires a change —
  it does not)
- `getConversionFactor` — reused verbatim, not modified
- `firestore.rules`
- `firestore.indexes.json`
- The Business Worth formula, `normalizeStockCountItems`, `recordStockCount`
- Any Product-level "selling portions" configuration or new schema field
- Every existing governance document under `docs/specs/` and
  `docs/engineering/` — this Authorization and its governing chain are
  additive; none of the cited pre-existing artifacts is edited
- Server-side code (`server/`)
- Unrelated UI redesign

## 5. Reuse-First Implementation Constraint

No new conversion engine, no second competing valuation path, and no
redesign of Mode A/B may be introduced. The following existing,
already-tested mechanisms are the sole authorized arithmetic/memory
path:

- `getConversionFactor`
- `resolveUnitAwarePrice`
- `deriveModeAPortionValuations`
- `findLatestRememberedProductMemory` (as already used elsewhere in this
  file; not newly wired into `buildCatalogRow` beyond what §2 item 1
  specifies)

Any discovered need for a new conversion mechanism, a new schema field,
or a new Product-level configuration returns to Product Architect review
before proceeding — it may not be resolved silently during
implementation.

## 6. Data / Memory Behavior — Restated for Implementation Clarity

- **Permanent Product Memory:** `Product.unitRelationship`, including a
  confirmed `sellingUnit` — never re-collected, never overwritten by
  this correction.
- **Latest-purchase selling-price memory:** the latest selling price
  recorded during purchase/Add Stock for that product — reused,
  re-denominated when necessary, remains editable for the current
  Contagem.
- **Current Contagem physical quantities:** entered fresh each Contagem,
  independently by unit, never merged.
- **Temporary Add Portion decisions:** valid only for the current
  Contagem; never memorized, never promoted to Product Memory, never a
  standing Product-level selling-portions structure.

## 7. Testing Requirements

Exactly the split the Plan's §7 already defines — this Authorization
does not relax or expand it. At minimum, tests must verify:

1. Existing product does not re-enter relationship/setup.
2. Single-unit product does not require a `UnitRelationship` (Rule 8
   Finding E).
3. Existing multi-unit product accepts multiple physical units in one
   Contagem (existing coverage, re-run, not modified).
4. Confirmed `sellingUnit` is preferred over `units[0]` for selling
   valuation (the Impala worked example, Plan §8).
5. `units[0]`/raw-batch fallback is preserved when no confirmed
   `sellingUnit` exists.
6. Latest-purchase selling-price memory is reused and correctly
   re-denominated.
7. Remembered selling price remains editable for the current Contagem.
8. Additional Add Portion rows remain optional and temporary.
9. Add Portion is not persisted as Product-level memory (existing
   coverage, unaffected).
10. Silent conversion applies via `resolveUnitAwarePrice`/
    `deriveModeAPortionValuations`, unmodified.
11. No visible equivalent-quantity requirement is introduced.
12. Cost Price is not reintroduced as an owner-facing Contagem input
    (existing coverage, unaffected).
13. FR-67 cost-basis behavior remains unchanged (no new test required —
    this correction does not touch `fr67CostBasisConversion.ts`; existing
    FR-67 coverage re-run as regression only).
14. Existing new-product behavior remains intact (existing coverage,
    unaffected).
15. Initial Stock remains untouched (no test required — not modified,
    not investigated).
16. `resolveUnitAwarePrice`'s no-fabrication contract (`''` on no valid
    bridge) is honored post-correction, identically to pre-correction.
17. Draft/resume compatibility — a resumed draft's own already-persisted
    `unit`/`sellingPrice` values are used as-is.

**Tests must actually be run before being reported as passing.** This
Authorization does not itself run or claim the results of any test — it
authorizes the tests enumerated in the accepted Plan's §7 to be written
and executed as part of implementation.

**Existing tests requiring updates (identified, not modified, by this
Authorization):** any structural assertion of the literal pre-correction
default text in `buildCatalogRow`/`handleModeAToggle` will need updating
to match the new two-tier preference — the precise locations are to be
identified at implementation time by running the current suite against
the proposed diff, per Plan §7's own note.

## 8. Regression Boundaries

Explicitly confirmed **not** changed by this Authorization:
`UnitRelationship` type/schema; `getConversionFactor`'s signature/logic;
`resolveUnitAwarePrice`'s signature/logic;
`deriveModeAPortionValuations`'s signature/logic; Business Worth
formulas (`productValuationTotal`, `normalizedTotalSellingValue`,
`measuredBusinessWorth`); `normalizeStockCountItems`; `recordStockCount`;
Cost Price removal (§44); Add Portion's persistence semantics,
temporariness, and non-inheritance; `firestore.rules`;
`firestore.indexes.json`; Initial Stock in any respect; Add Stock and
Smart Stock Entry in any respect; the new-product setup flow
(`NewProductInfoPanel`, `isGenuinelyNewProductName`).

## 9. Acceptance Criteria

Carried forward from the accepted Plan's §7/§8, made implementation-verifiable:

- [ ] 1. Existing products do not enter the new-product setup flow.
- [ ] 2. Existing product functional units/relationship are reused.
- [ ] 3. Existing confirmed `sellingUnit` is reused.
- [ ] 4. Existing products are not forced to use `units[0]` as selling
      unit when `sellingUnit` exists.
- [ ] 5. Products without `sellingUnit` preserve `units[0]` fallback.
- [ ] 6. Latest purchase selling-price memory is reused.
- [ ] 7. Remembered selling price remains editable.
- [ ] 8. Physical quantities remain freely recordable by unit.
- [ ] 9. Multiple units of the same product can be entered in one
      Contagem.
- [ ] 10. Portions remain separate physical rows.
- [ ] 11. Equivalent quantity remains internal/silent.
- [ ] 12. Add Portion remains optional.
- [ ] 13. Add Portion remains temporary.
- [ ] 14. Add Portion is not written to Product Memory.
- [ ] 15. No Cost Price input is restored.
- [ ] 16. FR-67 cost-basis behavior remains unchanged.
- [ ] 17. No Product-level selling-portions configuration is introduced.
- [ ] 18. Single-unit products require no `UnitRelationship`.
- [ ] 19. No new per-Contagem reference-unit choice is introduced.
- [ ] 20. Existing conversion mechanisms are reused, not reimplemented.
- [ ] 21. No unrelated file or module is modified — confirmed against §4's file list.
- [ ] 22. Initial Stock remains excluded.
- [ ] The rendered default and the toggle-time default for Mode A's
      reference unit never disagree (§2 item 2).
- [ ] `resolveUnitAwarePrice`'s existing `''` (no-fabrication) contract
      is honored when no valid bridge exists, post-correction.
- [ ] All pre-existing tests identified in §7 as needing updates
      continue to pass once updated to the new two-tier default; no
      other existing test's assertions change.

## 10. Product Architect Authorization / Signature

**Status: ✅ ACCEPTED AND AUTHORIZED (29 August 2026).**

> PRODUCT ARCHITECT AUTHORIZATION
>
> I, as Product Architect, formally approve and authorize implementation
> of the complete capability defined by §§1–9 of this document: for an
> existing product's second-and-subsequent Periodic Contagem, preferring
> the product's confirmed `unitRelationship.sellingUnit` — over
> `units[0]` — as the default reference unit/price for `buildCatalogRow`
> and `handleModeAToggle`/`ModeAValuationControl`, falling back to
> today's exact `units[0]`/latest-batch behavior whenever no `sellingUnit`
> is confirmed, exactly as scoped, bounded, and reuse-first as designed
> by the READY Rule 8 Assessment, the signed reconciliation addendum, and
> the accepted Implementation Plan.
>
> This authorizes implementation of ONLY the scope explicitly listed in
> §§2–4 above, subject to every behavioral preservation in §3, every
> acceptance criterion in §9, the testing requirements in §7, and the
> regression boundaries in §8. Nothing beyond that scope is granted by
> this signature — in particular, Initial Stock, Add Stock, Smart Stock
> Entry, the conversion engine, `UnitRelationship`'s schema, Business
> Worth formulas, FR-67's cost-basis convention, and Firestore
> rules/indexes remain untouched and unauthorized for any change by this
> signature.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: I APPROVE AND AUTHORIZE IMPLEMENTATION
> Date: 29 August 2026

**Effective upon this signature:** engineering implementation of the
capability defined in §2, subject to every behavioral preservation in
§3, every acceptance criterion in §9, the testing requirements in §7,
the regression boundaries in §8, and the exclusions in §4/§5, may now
proceed as a separate, subsequent implementation step — not performed by
this document itself. Any discovered need to exceed these boundaries
during implementation returns to Product Architect review before
proceeding, not resolved silently.

---

## Governance Notes

- This document does not modify `BDR-0012`, the UOM Specification, the
  signed reconciliation addendum, the READY Rule 8 Assessment, or the
  accepted Implementation Plan — all remain byte-for-byte unchanged.
- §10 is now **signed: ACCEPTED AND AUTHORIZED**, Product Architect
  SABUSHIMIKE MASCENI, 29 August 2026. This document, together with its
  signed §10, is now the authoritative Implementation Authorization for
  this capability.
- Populated strictly from the READY Rule 8 Assessment, the signed
  addendum, and the accepted Implementation Plan; no new technical
  detail, scope, or business decision beyond what those three documents
  already specify is introduced here or by this signature.
- This signature authorizes engineering implementation strictly within
  §§2–9 of this document — it is not itself the implementation, and no
  application code, test, or schema is created by this signature; that
  work remains a separate, subsequent step.
