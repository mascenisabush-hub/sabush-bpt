Implementation Plan

# Implementation Plan — Periodic Contagem, Existing-Product Selling-Unit / Price-Memory Correction

**Type:** Governance bridge document — translates a **READY** Rule 8
Assessment into a concrete, file-by-file implementation plan. Does not
itself authorize implementation and does not modify code.

**Status:** ✅ **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION
AUTHORIZATION** (29 August 2026). See "Product Architect Acceptance,"
§11, below, for the complete signed decision. This acceptance closes
this Plan's own, separate governance gate (formerly Gate 2, §10); a
distinct, subsequent Implementation Authorization remains a required,
separate gate, not created by this acceptance and not created by this
document.

**Implementation basis, as of this revision:**

1. The signed [UOM Specification §4 / Existing-Product Periodic Contagem
   Reference-Point Reconciliation Addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
   (✅ SIGNED, SABUSHIMIKE MASCENI, 29 August 2026) — the governing
   decision that a confirmed `sellingUnit` is the selling/valuation
   reference point for existing-product Periodic Contagem, `units[0]`
   remaining the fallback absent one, with FR-67's own separate
   `units[0]` cost-basis convention explicitly unaffected.
2. The companion [Rule 8 Assessment](./periodic-contagem-existing-product-selling-unit-memory-rule8-assessment.md),
   now **READY** (updated from its original CONDITIONALLY READY verdict
   once (1) was signed).
3. The existing, approved Periodic Contagem architecture — `buildCatalogRow`,
   `handleModeAToggle`, `ModeAValuationControl`, `collectGroupPortions`,
   `getConversionFactor`, `resolveUnitAwarePrice`,
   `deriveModeAPortionValuations` — all reused, none redesigned.

**Governing chain:** `BDR-0012` (Approved) →
[`product-unit-of-measure-specification.md`](../specs/product-unit-of-measure-specification.md)
§4 (✅ Accepted; reconciled for the existing-product/confirmed-`sellingUnit`
case by the signed addendum above) →
[`product-memory-purchase-selling-valuation-specification.md`](../specs/product-memory-purchase-selling-valuation-specification.md)
§16/§17 (✅ Accepted) →
[Rule 8 Assessment](./periodic-contagem-existing-product-selling-unit-memory-rule8-assessment.md)
(**READY** — Findings A–E, all previously-open governance-boundary items
now closed).

**Repository state at this revision:** `main = origin/main = 558fd46`,
working tree clean at the start of this document. Nothing has been
modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or `tests/` to produce this Plan, its
companion Rule 8 Assessment, or the signed reconciliation addendum; all
three remain untracked, uncommitted local files at this point in the
sequence.

**This document does not:** modify any existing governance document,
`firestore.rules`, `firestore.indexes.json`, or any application code. It
does not itself constitute Implementation Authorization.

---

## 1. Purpose

Converts the companion Rule 8 Assessment's Findings A–E into a concrete
map of exactly which files change, what each change is, and how each
governing-input requirement (§1–§20 of the commissioning prompt) is
satisfied. Introduces no new business decision and no new technical
direction beyond what the Rule 8 Assessment already adopted, and commits
no code.

## 2. Scope Enumeration

### 2.1 In Scope

1. **`buildCatalogRow` — two-tier selling-unit/price resolution**
   (`PeriodicStockCountView.tsx`, current lines 659–672, Rule 8 Finding
   A): when `product.unitRelationship` is confirmed, valid
   (`isValidUnitRelationship`), and carries a confirmed `sellingUnit`,
   the row's `unit` defaults to `sellingUnit` instead of
   `latestBatch?.unit`, and `sellingPrice` is resolved via
   `resolveUnitAwarePrice(latestBatch.sellingPrice, latestBatch.unit,
   sellingUnit, product.unitRelationship)` (already-imported function,
   same file, line 13) instead of taken raw from the batch. Absent a
   confirmed `sellingUnit`, or when `resolveUnitAwarePrice` returns `''`
   (no valid bridge — should not occur for a confirmed chain, but
   handled per that function's own existing contract), the function
   falls back to exactly today's behavior. `costPrice` resolution is
   **entirely untouched** — Finding A and this item concern
   `unit`/`sellingPrice` only.
2. **`handleModeAToggle` — default reference unit** (current lines
   1569–1587, Rule 8 Finding B): `defaultReferenceUnit` prefers
   `relationship?.sellingUnit` (when present and a member of the chain —
   already guaranteed for a valid relationship) over
   `relationship?.units?.[0]?.unit`, falling back to the latter exactly
   as today when no `sellingUnit` is confirmed. The `ModeAValuationControl`
   render site's own `effectiveReferenceUnit` computation (current lines
   3444–3445) is updated identically, so the rendered default and the
   toggle-time default can never disagree.
3. **`handleModeAToggle` — seeded reference price** (same lines, Rule 8
   Finding C): on toggle-on, `referencePrice` is seeded from the same
   resolution Finding A's item 1 performs (reusing that same resolved
   value/function call, not a second independent computation), when a
   confirmed `sellingUnit` and a resolvable remembered price exist;
   otherwise remains `''`, exactly as today. Remains fully owner-editable
   immediately after seeding — no change to `handleModeAFieldChange` or
   to the input's own `onChange` wiring.
4. **No change to Add Portion's own creation mechanism**
   (`handleAddPortionToManualGroup`, `createManualRow`) — Rule 8 Finding
   D's own disposition: the improvement is indirect (a correctly
   pre-seeded Mode A, once activated, per items 2–3 above), not a new
   auto-fill mechanism on blank manual rows.
5. **No change** to `deriveModeAPortionValuations`, `getConversionFactor`,
   `resolveUnitAwarePrice`, `findLatestRememberedProductMemory`,
   `normalizeStockCountItems`, `recordStockCount`,
   `buildProductCostBasisMap`, `deriveCostContribution`,
   `ExistingProductSummary`'s own render logic (though see §2.3, an
   explicitly-deferred *display* enhancement), `isGenuinelyNewProductName`,
   or `NewProductInfoPanel` — every one of these is reused exactly as it
   exists today.
6. **Tests**: per §7 below, mapped to the Rule 8 Assessment's §10 Testing
   Strategy and the governing input's own §17, 22-item Test Plan.

### 2.2 Explicit Exclusions

Carried forward verbatim from the Rule 8 Assessment's §7/§8:

- Any change to Initial Stock, in any respect
  (`InitialStockCountView.tsx` is not touched by this Plan).
- Any change to Case A (new-product setup — `NewProductInfoPanel`,
  `isGenuinelyNewProductName`, the `handleConfirmSave`
  `unitRelationshipByProductName` construction) — already governed,
  already shipped in `558fd46`.
- Any change to Add Stock (`AddStockView.tsx`) or Smart Stock Entry
  extraction contract.
- Any change to `UnitRelationship`'s schema, `getConversionFactor`,
  `resolveUnitAwarePrice`'s own signature/logic, or
  `deriveModeAPortionValuations`'s own signature/logic.
- Any change to `normalizeStockCountItems`, `recordStockCount`, the
  Business Worth formula, `productValuationTotal`,
  `normalizedTotalSellingValue`, `measuredBusinessWorth`.
- Any change to Cost Price removal (§44) — no cost-price render site,
  input, or calculation is touched.
- Any change to Add Portion's persistence semantics, temporariness, or
  non-inheritance across Contagens.
- Any change to `firestore.rules` or `firestore.indexes.json` — Rule 8
  §6.L/§6.R confirmed neither requires modification.
- Any Product-level "selling portions" configuration or new schema
  field on `Product`, `StockCountItem`, `StockCountWorkingRow`, or
  `PeriodicStockDraft`.

### 2.3 Explicitly Deferred (Not In Scope of This Plan)

- `ExistingProductSummary` displaying the confirmed `sellingUnit`
  alongside its existing cost-basis/relationship-chain lines (a genuine,
  small, presentation-only usability improvement the prior
  investigations noted) — **not included in this Plan's scope**, since
  the governing input's own §16 instruction to keep the implementation
  boundary as small as possible, and the reuse-first mandate (§12), do
  not require it for Findings A–D's own correctness; it is a candidate
  for a future, separately-scoped, minor addition, not proposed here.

## 3. Files Expected to Change

- `apps/tenant/src/components/PeriodicStockCountView.tsx` — the sole
  application-code file, per the governing input's own §16 instruction
  ("Prefer changes inside `PeriodicStockCountView.tsx`"). Three
  functions touched: `buildCatalogRow`, `handleModeAToggle`, and the
  `ModeAValuationControl` render site's own `effectiveReferenceUnit`
  computation (all already identified precisely, by name and current
  line range, in §2.1).
- Test files — enumerated in §7, below. No existing test file's
  *assertions about Findings unrelated to this correction* (Cost Price
  removal, Add Portion temporariness, multi-portion grouping, draft
  durability) are touched.

## 4. Files Explicitly Excluded

- `apps/tenant/src/components/InitialStockCountView.tsx`
- `apps/tenant/src/components/AddStockView.tsx`
- `apps/tenant/src/lib/contagemMultiUnitValuation.ts`
- `apps/tenant/src/lib/purchaseToSellingConversion.ts`
- `apps/tenant/src/lib/productMemoryPriceResolution.ts`
- `apps/tenant/src/lib/unitRelationship.ts`
- `apps/tenant/src/utils/stockCount.ts`
- `apps/tenant/src/context/AppContext.tsx`
- `apps/tenant/src/lib/fr67CostBasisConversion.ts`
- `firestore.rules`
- `firestore.indexes.json`
- Every governance document under `docs/specs/` and `docs/engineering/`
  (this Plan and its companion Assessment are additive, new documents;
  none of the cited pre-existing artifacts is edited)

## 5. Existing-Product Path — Precise Behavior After This Change

Restating the governing input's own required elements, each mapped to
the specific code change that satisfies it:

- **Selling unit comes from permanent Product Memory** — Finding A item
  1 (`buildCatalogRow`) and Finding B item 2 (`handleModeAToggle`),
  §2.1 items 1–2.
- **Latest purchase selling price is reused correctly** (source
  unchanged — the latest `StockBatch`; denomination corrected) — Finding
  A item 1, §2.1 item 1.
- **Price conversion is silent** — reuses `resolveUnitAwarePrice`/
  `deriveModeAPortionValuations` exactly as they exist; no new engine
  (§2.1 items 1–3, all "reuse-first" per Rule 8 §4).
- **Add Portion remains temporary** — §2.1 item 4, unchanged.
- **Cost Price remains absent from owner-facing Contagem** — untouched
  by every item in §2.1; no cost-price render site, field, or
  calculation is read, written, or displayed by this correction.
- **No Product-level selling-portions memory** — §2.2, explicitly
  excluded.
- **No Initial Stock changes** — §2.2, §4.
- **No Add Stock redesign** — §2.2, §4.
- **No Smart Stock Entry redesign** — §2.2, §4.
- **New-product path remains unchanged** — §2.2; `NewProductInfoPanel`,
  `isGenuinelyNewProductName`, and the `handleConfirmSave`
  `unitRelationshipByProductName` construction are not touched by any
  item in §2.1.
- **Single-unit path remains unchanged** — Rule 8 Finding E; every item
  in §2.1 gates on a confirmed `unitRelationship`, which a single-unit
  product never has.
- **Multi-unit physical entry remains independent** — untouched; §2.1's
  items change only default *price/unit values shown before the owner
  edits them*, never the underlying flat, unmerged multi-portion data
  model (`collectGroupPortions`, `normalizeStockCountItems`, both
  excluded per §2.2).

## 6. Sequencing

1. `buildCatalogRow` (§2.1 item 1) — no dependency on items 2–3; can be
   implemented and tested independently.
2. `handleModeAToggle` default reference unit (§2.1 item 2) — no
   dependency on item 1, but naturally paired with item 3 (same
   function, same toggle-time write).
3. `handleModeAToggle` seeded reference price (§2.1 item 3) — depends on
   item 1's own resolution logic being available to reuse (a shared
   helper, not a second independent implementation — the exact "one
   authoritative valuation path" discipline every other conversion
   function in this codebase already follows).
4. `ModeAValuationControl` render site's `effectiveReferenceUnit` (part
   of §2.1 item 2) — must ship atomically with item 2, since a mismatch
   between the toggle-time default and the render-time default would
   itself be a new class of bug (the render site and the toggle handler
   must never compute a different default from the same inputs).

No item in this sequence has any dependency on, or effect on, Initial
Stock, Add Stock, Smart Stock Entry, or any file in §4.

## 7. Test Plan

Mapped against the governing input's own 22-item Test Plan (§17):

| # | Governing-input requirement | Covered by |
|---|---|---|
| 1 | Existing single-unit product | New fixture test: Rule 8 Finding E — no `unitRelationship` present, neither new code path executes. |
| 2 | Existing multi-unit product | New fixture test: confirmed relationship + `sellingUnit`, multiple portions, all resolve correctly. |
| 3 | Latest purchase unit = selling unit | New fixture test: `resolveUnitAwarePrice`'s own existing identity-case branch (`remembered === target`) confirmed to short-circuit correctly — no regression. |
| 4 | Latest purchase unit ≠ selling unit | New fixture test: the Impala worked example (§8, below) — Cx purchase, Un selling unit, correct converted default. |
| 5 | Confirmed `sellingUnit = Un`, latest purchase `= Cx` | Same as #4. |
| 6 | Latest selling price correctly interpreted in selling-unit denomination | New fixture test asserting `buildCatalogRow`'s resolved `sellingPrice` equals `resolveUnitAwarePrice`'s own output for the same inputs — no independent/duplicate arithmetic. |
| 7 | Automatic conversion Cx → selling unit | Covered by #4/#8 (Impala worked example). |
| 8 | Automatic conversion Emb → selling unit | New fixture test, same relationship, Emb portion. |
| 9 | Automatic conversion Un → selling unit | New fixture test — identity case (Un already the selling unit). |
| 10 | Multiple physical portions in one Contagem | Existing coverage unaffected (`periodic-stock-multi-portion-valuation.test.ts`, `contagem-multi-unit-valuation.test.ts`) — re-run, not modified, per Rule 8 §6.C ("already satisfied, this correction does not touch it"). |
| 11 | Add Portion receives appropriate current-Contagem assistance | New fixture test: once Mode A is active (post-correction default), a newly added manual-row portion for the same product group receives a correctly derived price via the existing, unmodified `applyModeAToGroup`/`collectGroupPortions` path — confirming Rule 8 Finding D's own narrowed scope, not a new auto-fill mechanism. |
| 12 | Add Portion does NOT become Product Memory | Existing coverage unaffected — no `Product` write path is touched by this correction (§2.2). |
| 13 | Next Contagem does NOT inherit Add Portion | Existing coverage unaffected — `manualRows` reset/draft-deletion mechanism untouched. |
| 14 | Owner can edit remembered/derived selling price | New fixture test confirming the seeded/derived value is a plain, editable `string` field with no `disabled`/read-only gating introduced — mirrors this file's own existing `isConfirmed`-only disable pattern, unchanged. |
| 15 | Missing relationship behaves safely | New fixture test: no `unitRelationship` at all — falls back to today's exact `buildCatalogRow`/`handleModeAToggle` behavior. |
| 16 | Missing selling-price memory behaves safely | New fixture test: confirmed `sellingUnit`, no batch, no `Product.sellingPrice` — resolves to `''`, never a fabricated number (mirrors `resolveUnitAwarePrice`'s own existing contract). |
| 17 | New-product flow remains unchanged | Existing coverage unaffected (`periodic-stock-new-product-panel.test.ts`) — re-run, not modified. |
| 18 | Cost Price remains absent from physical-entry rows | Existing coverage unaffected (`periodic-contagem-cost-price-removal.test.ts`) — re-run, not modified; this correction adds no cost-price render site. |
| 19 | Existing `Product.unitRelationship` is never overwritten | Existing coverage unaffected — `recordStockCount`'s `if (!product)` guard is not touched by this correction (§2.2, §4). |
| 20 | No cross-tenant data access | Existing coverage unaffected — no new Firestore read/write path is introduced (Rule 8 §6.L/§6.M). |
| 21 | Draft/resume compatibility | New fixture test confirming a resumed draft's own already-persisted `unit`/`sellingPrice` values are used as-is (this correction affects only the *initial* prefill computed before any draft exists — `handleResumeDraft`'s own logic is untouched). |
| 22 | Backward compatibility for existing periodic drafts | Same as #21 — `workingRowToDraftItem`/`draftItemToWorkingRow` are excluded (§4), so a pre-correction draft round-trips identically. |

**Existing tests requiring updates (identified, not modified, by this
Plan)** — per Rule 8 §6.S, any structural assertion of the literal
pre-correction default text in `buildCatalogRow`/`handleModeAToggle`
will need updating; the precise assertion locations are to be identified
at implementation time by running the current test suite against the
proposed diff, exactly as the §44 precedent's own Finding 7 was
identified (a known, expected consequence, not a surprise regression).

## 8. Worked Impala Example — Before and After

**Setup:** Impala, `1 Cx = 4 Emb = 24 Un`, confirmed `sellingUnit = Un`.
Latest purchase: `2 Cx @ 470 MZN/Cx` (i.e. `StockBatch.unit = 'Cx'`,
`StockBatch.sellingPrice` = whatever per-Cx selling figure was recorded
at that purchase — call it `S`). Second Contagem physical stock: `3 Cx,
1 Emb, 5 Un`.

**Before this correction:**
- Catalog row: `unit = 'Cx'`, `sellingPrice = S` (raw, per-Cx).
- Owner adds `1 Emb` and `5 Un` via "Adicionar Porção": both start
  entirely blank — no unit, no price.
- Mode A, if manually activated: reference unit defaults to `Cx`;
  reference price starts blank.

**After this correction:**
- Catalog row: `unit = 'Un'` (the confirmed `sellingUnit`),
  `sellingPrice = resolveUnitAwarePrice(S, 'Cx', 'Un', relationship)` —
  i.e. `S / 24`, correctly re-denominated per Un.
- Owner adds `1 Emb` and `5 Un` via "Adicionar Porção": both still start
  blank (Finding D's own scope — unchanged), unless the owner activates
  Mode A for this product group.
- Mode A, if activated: reference unit defaults to `Un` (the confirmed
  `sellingUnit`); reference price is pre-seeded with the same
  `S / 24` figure the catalog row already shows — the owner sees a
  consistent, correctly-denominated number in both places, and may edit
  either freely.
- The owner is never asked to re-enter product name, functional units,
  relationship, selling unit, or cost price — unchanged, already
  correct.

## 9. Answer: "After This Change, What Exactly Will the Owner See and Do in Contagem #2?"

The owner opens Contagem. Impala's catalog row appears automatically,
already labeled in `Un` — the unit they actually sell in — with a
selling price already correctly converted from whatever the last
purchase recorded, in `Un` terms, not `Cx` terms. They enter `3` in that
row's quantity field (still in `Un`, or they may change the unit if this
portion of their physical stock happens to be in a different unit —
freely, as always). For the `1 Emb` and `5 Un` they also physically have,
they tap "Adicionar Porção" twice, type the unit and quantity for each —
exactly as today. If they want every portion valued from one single,
consistently-converted reference price instead of typing each
separately, they may check the existing "single selling price" (Mode A)
box — which now starts pre-filled with `Un` and the correct remembered
price already converted, instead of defaulting to `Cx` with a blank
price they had to notice was wrong and fix themselves. They can edit any
of these numbers before confirming. They are never asked for the
product's name, its unit relationship, its selling unit, or a cost
price — all of that remains exactly as reused today. Nothing about Add
Portion's temporary nature, or what gets remembered permanently for the
next Contagem, changes.

## 10. Governance Gates Remaining

1. ~~Rule 8 Assessment §12's open item~~ — **RESOLVED.** The signed
   [reconciliation addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
   (✅ SIGNED, SABUSHIMIKE MASCENI, 29 August 2026) provides the explicit
   Product Architect authority for the `sellingUnit`-over-`units[0]`
   reference-point narrowing of `product-unit-of-measure-specification.md`
   §4; the companion Rule 8 Assessment has been updated from
   CONDITIONALLY READY to **READY** accordingly.
2. ~~This Implementation Plan's own acceptance~~ — **RESOLVED (29 August
   2026).** A separate, distinct Product Architect acceptance of this
   Plan document itself (§1–§9, above) has been recorded — see §11,
   below — mirroring the two-step precedent already established for the
   new-product `sellingUnit` capture work (its own signed addendum,
   followed by a separate, later Plan acceptance).
3. **Implementation Authorization** — a separate, signed document, not
   created by this Plan, still required before any code, test, or
   `firestore.rules` change is made. **Not created by this acceptance or
   by this document** — remains the one outstanding gate.

Every technical Finding (A–E) in the companion Rule 8 Assessment is
independently Rule-8-resolvable, the governance-boundary question that
previously sat upstream of every remaining gate is closed, and this
Plan's own acceptance gate (2) is now closed. Gate 3 (Implementation
Authorization) is the sole remaining, ordinary, sequential governance
step — not an open technical or business question.

## 11. Product Architect Acceptance

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
>
> I, as Product Architect, formally accept this Implementation Plan
> (§1–§9, above) in its entirety, as scoped: the two-tier
> `sellingUnit`-preferred / `units[0]`-fallback resolution applied to
> `buildCatalogRow` and `handleModeAToggle` (and its
> `ModeAValuationControl` render-site counterpart) in
> `apps/tenant/src/components/PeriodicStockCountView.tsx`, and no other
> file, function, schema, or governance document. This acceptance
> authorizes the project to proceed to the separate, subsequent
> Implementation Authorization gate. **This acceptance does not itself
> authorize implementation** — no code, test, `firestore.rules`, or
> `firestore.indexes.json` change may be made until a distinct, signed
> Implementation Authorization exists.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED
> Date: 29 August 2026

---

## Verification Performed for This Plan

- The companion Rule 8 Assessment read completely, in this session.
- Every file/line reference in §2.1, §3, §4 re-confirmed directly against
  `apps/tenant/src/components/PeriodicStockCountView.tsx` at
  `main = 558fd46` in this session.
- `git status`/`git log -1` run immediately before this Plan began;
  confirmed `main = origin/main = 558fd46`, working tree clean.
- No `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or
  `tests/` file was modified to produce this Plan's original draft.
- **This revision:** the signed [reconciliation addendum](./uom-specification-section4-existing-product-contagem-reconciliation-addendum.md)
  read completely, confirmed ✅ SIGNED (SABUSHIMIKE MASCENI, 29 August
  2026); this document's own header, governing chain, and §10 updated
  accordingly — no other section rewritten. The signed addendum and the
  companion Rule 8 Assessment were both re-read but not modified to
  produce this revision (the Rule 8 Assessment's own update was made in
  a separate edit to that file, per this session's instruction). `git
  status`/`git log -1` re-confirmed `main = origin/main = 558fd46`,
  working tree clean, immediately before and after this revision.
- No existing Specification, BDR, POL, or prior Rule 8 Assessment/
  Implementation Plan/Authorization was modified to produce this Plan.
- No Implementation Authorization was created.
- **This revision:** the companion Rule 8 Assessment (READY) and the
  signed reconciliation addendum re-read in full, confirmed unchanged;
  this document's own header, §10, and new §11 updated to record the
  Product Architect's acceptance of this Plan — no other section
  rewritten. `git status`/`git log -1` re-confirmed clean working tree
  and unchanged `HEAD` immediately before and after this revision.

**This document does not itself authorize implementation.** Its own
Product Architect acceptance is now recorded (§11); a distinct, signed
Implementation Authorization remains a separate, later, required step,
not performed here.
