Implementation Plan

# Periodic Contagem — Quantity-Unit / Selling-Unit Independence
# (FR-89–FR-94) — Implementation Plan

## 1. Header / Status

**Status: ✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT.**
**See "Product Architect Signature," immediately below, for the signed
decision. Authorizes progression to the next governance gate — the
Implementation Authorization — per FR-89–FR-94's own §18 sequence. Does
not, by itself, authorize implementation.**

**Governing chain:**
[`docs/specs/periodic-contagem-quantity-selling-unit-independence-amendment.md`](../specs/periodic-contagem-quantity-selling-unit-independence-amendment.md)
(proposed §46, FR-89–FR-94, ✅ **ACCEPTED AND SIGNED**, SABUSHIMIKE
MASCENI, 30 August 2026) →
[`docs/engineering/periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md`](./periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md)
(✅ **ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT**, SABUSHIMIKE
MASCENI, 30 August 2026; verdict READY AFTER IMPLEMENTATION PLAN) →
**this Implementation Plan** (✅ **ACCEPTED AND SIGNED BY THE PRODUCT
ARCHITECT**, SABUSHIMIKE MASCENI, 30 August 2026) → Implementation
Authorization (not yet created) → implementation (not yet started).

**Governance state, restated explicitly:**
- FR-89–FR-94 Specification Amendment = **accepted, signed**.
- Rule 8 Assessment = **accepted, signed**.
- Implementation Plan (this document) = **accepted, signed**.
- Implementation Authorization = **not yet created**.
- Implementation = **not yet authorized**.

**This document does NOT modify:** the signed FR-89–FR-94 amendment; the
signed Rule 8 Assessment; the signed §45/FR-78–FR-88 amendment or its own
Rule 8 Assessment, Implementation Plan, or Implementation Authorization;
Decision 37; any other governance artifact; any application code; any
test. All are read-only inputs.

**Revision note — audit corrections applied.** Before acceptance, the
Product Architect commissioned an exhaustive assurance audit of this
Plan (not merely a re-read of its prose, but independent re-derivation
of the arithmetic against the actual `getConversionFactor`/
`deriveModeAPortionValuations` contracts). The audit found, and this
revision corrects, two defects: (1) §6's
`resolveDefaultSellingConfigurationForRow` returned `sellingPriceBasisUnit:
productSellingUnit`, mislabeling the unit an auto-derived price is
actually denominated in — corrected to `row.unit`, matching what
`deriveModeAPortionValuations` actually computes (§6.1, inline note);
(2) §14's Test D reused Test C's mixed default/deliberate pair, which
cannot exercise the "last deliberately entered" rule — corrected to an
independent, genuinely two-deliberate scenario tested in both
directions. Three additional explicit test rows (Y, Z, AA) were added
per the audit's coverage findings: the three-simultaneous-physical-unit
case, cross-product edit-sequence isolation, and draft-resume sequence
continuity. A second, final acceptance audit then confirmed two further
points requiring explicit resolution before sign-off, both now recorded
in this revision: (3) §6.1 item 3 now explicitly specifies that a
physical-unit change on an auto-filled row, when the new unit falls
outside the confirmed relationship, clears `sellingPrice` to blank and
leaves `sellingPriceAutoFilled: true` — no price is fabricated, and no
deliberate act is implied by the mere unit edit; (4) §5.3 now explicitly
records the Product Architect's considered decision **not** to add a
persisted `sellingConfigurationSource`-style field to `StockCountItem`
(despite the directly comparable `valuationMode` precedent) — the
working-row-only distinction is confirmed sufficient for every actual
requirement this Plan serves. No other section's substance changed as a
result of either audit — both confirmed the underlying architecture
supports the model without a persisted-`StockCount.items`-schema
redesign.

---

## Product Architect Signature

**Status:** ✅ **ACCEPTED AND SIGNED.**

> I have reviewed this Implementation Plan for the complete FR-89–FR-94
> Contagem selling-configuration scope, including: independent physical
> quantity entries recorded and preserved exactly as counted (`3 Cx + 3
> Emb + 5 Un` for one product, unmerged); physical quantity unit
> independent from selling unit by default, with no Mode A required for
> ordinary mixed-unit counting; different physical units never
> automatically creating a deliberate selling portion; automatic
> resolution of the product-level default selling configuration for
> every physical quantity entry that has not been deliberately
> overridden; deliberate selling portions retaining their own
> independently chosen selling price and selling unit, correctly summed
> (`5 Cx @ 480 MZN/Cx + 7 Cx @ 50 MZN/Un = 10,800 MZN`, neither
> denomination reinterpreted); the last deliberately entered selling
> configuration becoming the product-level remembered/default
> configuration for future Contagem and Add Stock, determined by an
> explicit in-session edit-sequence mechanism rather than array order,
> row order, or confirmed-selling-unit preference, and verified correct
> in both entry orders; Add Stock continuing to receive that remembered
> configuration as its default through the existing shared memory
> mechanism, with the Owner always free to change selling unit and/or
> selling price there; the `sellingPriceBasisUnit` correction ensuring
> an auto-derived price is always labelled with the unit it is actually
> denominated in; the corrected two-direction last-deliberate-entry
> test; the explicit `3 Cx + 3 Emb + 5 Un` test; cross-product
> edit-sequence isolation; draft-resume edit-sequence continuity; the
> final clarification that an auto-filled row whose physical unit is
> changed outside the confirmed relationship remains non-deliberate and
> never has a price fabricated for it; and the explicit, considered
> decision not to add a persisted `sellingConfigurationSource` field to
> `StockCountItem`, the working-row-only distinction being sufficient
> for every requirement this Plan serves. I accept this Implementation
> Plan's conclusions.

**Decision:** I APPROVE AND SIGN THE IMPLEMENTATION PLAN

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 30 August 2026

This signature authorizes progression to the next governance gate — the
Implementation Authorization — per FR-89–FR-94's own §18 sequence. **It
does not, on its own, authorize any code change.** A separate, signed
Implementation Authorization remains required before implementation may
begin.

---

## 2. Pre-Drafting Verification Performed

- `git status`: working tree clean, `nothing to commit`.
- `git log -1`: `HEAD = a73383b606b15480abcda02f424cc68e50ab345f` (`main`
  = `origin/main`), the commit that carries the signed Rule 8 Assessment,
  pushed in the immediately preceding governance step.
- Signed FR-89–FR-94 amendment — re-read in full; confirmed status line
  `✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT`, §20 signature block
  `SABUSHIMIKE MASCENI`, `Date: 30 August 2026`, MD5
  `6f66f6e36fab51d3cc2c3d263553c6e9`.
- Signed Rule 8 Assessment — re-read in full; confirmed status line
  `✅ ACCEPTED AND SIGNED BY THE PRODUCT ARCHITECT`, "Product Architect
  Signature" section `SABUSHIMIKE MASCENI`, `Date: 30 August 2026`, MD5
  `3b0c1c7a294ae13a50dc84d09c113bb5`.
- Searched the full repository (`find`, all extensions) for
  `periodic-contagem-quantity-selling-unit-independence-implementation-plan.md`
  and for any other file name containing "quantity-selling-unit-
  independence" combined with "implementation-plan" — **no existing
  file found; no naming collision.**
- Re-confirmed `StockCountWorkingRow`'s current shape directly against
  `apps/tenant/src/utils/stockCount.ts` at this same HEAD: exactly
  `productId?`, `productName`, `quantity`, `unit`, `costPrice`,
  `sellingPrice`, `removed?`, `validated?` (plus the UI-only ephemeral
  fields documented immediately after `validated?` in that file) — no
  drift from what the Rule 8 Assessment's Evidence A recorded.

---

## 3. Purpose / Scope

Implements FR-89–FR-94 exactly as resolved by the accepted Rule 8
Assessment: (a) automatic, no-Mode-A-required valuation of a physical
quantity entry against the product's remembered/default selling
configuration when the two are denominated differently; (b) preservation
of a deliberately-created selling portion in its own chosen unit,
correctly summed alongside any other portion; (c) the confirmed
"last deliberately entered wins" rule for which configuration becomes
the new remembered/default when more than one deliberate configuration
exists for the same product in one Contagem; (d) the same default
resolution for a manually-added physical quantity entry ("+ Adicionar
Porção"); (e) confirmation that Add Stock's existing shared memory
mechanism requires no change.

Scope is exactly FR-89–FR-94's own boundary (Specification §5/§6),
restated and not expanded: Periodic Contagem only, catalog rows and
manual rows, existing products and a genuinely new product's first
Contagem (FR-93). Cost-side FR-67/§42, Initial Stock, the Business
Worth formula, Add Stock/Smart Stock Entry's purchase-side single-basis
rule, and the Product Catalog's field ownership are explicitly out of
scope and confirmed untouched throughout this Plan (§13).

---

## 4. The Three-Concept Model (carried forward, not redecided)

This Plan implements, and does not redecide, the model the signed
Rule 8 Assessment's Appendix A fixes:

- **Physical quantity entry** — `quantity` + `unit`, recorded exactly as
  the Owner counted it. Two physical quantity entries for one product in
  different units (e.g. `5 Emb` + `3 Pacotes`) are never automatically
  two selling portions.
- **Product-level selling configuration** — the remembered/default
  `Product.sellingPrice` + `unitRelationship.sellingUnit`. Automatically
  supplied wherever a physical quantity entry has not been given its own
  independent configuration. Never a constraint.
- **Deliberate selling portion** — created only when the Owner directly,
  explicitly gives part of the stock its own selling price/unit,
  distinct from the product-level default. Remains denominated in the
  Owner's own chosen unit, never reinterpreted into another.

Every worked example in the governing instruction (§7–§10 of the
originating business instruction; Scenarios A–L of the Rule 8 Assessment,
§8) is re-verified against this Plan's concrete design in §12, below.

---

## 5. Data Structures — Exact Changes

### 5.1 `StockCountWorkingRow` (`apps/tenant/src/utils/stockCount.ts`)

**Working-row-only fields — three new, all optional, additive:**

```ts
export interface StockCountWorkingRow {
  productId?: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  removed?: boolean;
  validated?: boolean;

  // [FR-89–FR-94] Working-row-only. true while sellingPrice/unit still
  // reflect the product-level default (either buildCatalogRow's/
  // createManualRow's initial prefill, or a later automatic
  // re-resolution — §5.3/§6.1); false the moment the Owner directly
  // edits sellingPrice or unit for this row. Absent on any row that
  // predates this capability — treated identically to `false` by every
  // reader (§6.3's own explicit "absent means not deliberate, for
  // backward compatibility" rule), never to `true`, so an old,
  // untouched draft never gets silently reinterpreted as deliberate.
  sellingPriceAutoFilled?: boolean;

  // [FR-89–FR-94] Working-row-only. The unit the CURRENT sellingPrice
  // value is expressed in, independent of this row's own physical
  // `unit` — mirrors AddStockView.tsx's own existing field of the same
  // name and purpose exactly (Rule 8 Evidence I). Set whenever
  // sellingPrice is set (auto-resolution or deliberate entry alike).
  sellingPriceBasisUnit?: string;

  // [FR-89–FR-94] Working-row-only. Monotonically increasing, set only
  // the moment sellingPriceAutoFilled transitions to false (a genuine
  // Owner edit) — never incremented by the automatic resolution path
  // itself. See §6.2 for the exact counter mechanism and why it is a
  // sequence, not a timestamp.
  sellingPriceEditSequence?: number;

  // ...existing UI-only ephemeral fields, unmodified, omitted here for
  // brevity — see the file's own current declaration.
}
```

**No change to any other field.** `quantity`/`unit` remain the Owner's
own physical-count entry, untouched by anything in this Plan (restates
FR-90/FR-21 mechanically).

### 5.2 Draft round-trip (`workingRowToDraftItem`/`draftItemToWorkingRow`,
same file)

Both functions are extended to carry the three new fields through the
existing Firestore-safe-optional-field discipline this file already
uses for `removed`/`validated` — omitted entirely when absent, never
written as literal `undefined`:

```ts
export function workingRowToDraftItem(row: StockCountWorkingRow): {
  // ...existing fields, unchanged...
  sellingPriceAutoFilled?: boolean;
  sellingPriceBasisUnit?: string;
  sellingPriceEditSequence?: number;
} {
  return {
    // ...existing spread, unchanged...
    ...(row.sellingPriceAutoFilled !== undefined ? { sellingPriceAutoFilled: row.sellingPriceAutoFilled } : {}),
    ...(row.sellingPriceBasisUnit ? { sellingPriceBasisUnit: row.sellingPriceBasisUnit } : {}),
    ...(row.sellingPriceEditSequence !== undefined ? { sellingPriceEditSequence: row.sellingPriceEditSequence } : {}),
  };
}
```

`draftItemToWorkingRow` is the exact inverse, copying the three fields
through verbatim — same pattern `validated` already established (Decision
40, FR-N7), same file.

**This is the one place this Plan's own schema footprint is visible
outside `StockCountWorkingRow` itself: the `PeriodicStockDraft` autosave
document gains three optional fields per item.** `firestore.rules` for
`periodicStockDrafts` is already Owner-only, already unvalidated at the
field-shape level (confirmed directly against `firestore.rules`, this
session, same finding the precedent Rule 8 Assessment's own §6.R already
established for this exact document type) — **no `firestore.rules` or
`firestore.indexes.json` change is required.**

### 5.3 `StockCountItem` / `StockCount.items` (confirmed/persisted schema)

**No change.** Confirmed directly, this session: `normalizeStockCountItems`
and `tallyStockCountRows` (`stockCount.ts`) both build their return
shapes from an explicit, literal field list — neither function reads
`sellingPriceAutoFilled`/`sellingPriceBasisUnit`/`sellingPriceEditSequence`
off its input rows, and neither writes them onto its output items. The
three new fields are working-row/draft-only and never reach the
confirmed, signed `StockCount.items` shape FR-90/FR-94 govern. This
satisfies FR-94's own reserved-to-Rule-8 question (Rule 8 Assessment
Finding 4/6): the schema growth found necessary is confined to the
working/draft layer.

**[Decision, final acceptance audit — explicitly considered and
declined] A persisted `sellingConfigurationSource` (or equivalent)
field, mirroring `StockCountItem.valuationMode`'s own existing
"display-only, how-was-this-price-arrived-at" precedent, was
specifically evaluated and is explicitly NOT added.** The Product
Architect's confirmed reasoning: the working-row-only distinction
(`sellingPriceAutoFilled`) is sufficient for everything this capability
actually requires — correct current-Contagem valuation (§6.4) and the
correct future-memory write decision (§6.3) — both of which are fully
resolved before persistence occurs; nothing downstream of confirmation
(Business Worth, §11; any existing report or KPI) needs to know, after
the fact, whether a given persisted price was deliberately entered or
auto-resolved from the default. This decision may be revisited by a
future, separate governance step if a genuine product need for
post-confirmation provenance display emerges — it is not foreclosed by
anything in this Plan — but is not part of this Plan's own authorized
scope.

### 5.4 `Product` (`apps/tenant/src/types.ts`)

**No change.** `Product.sellingPrice` remains a scalar;
`Product.unitRelationship.sellingUnit` remains as-is. This Plan does not
introduce a per-portion pricing table on `Product` (restates the Rule 8
Assessment's own explicit boundary, and the originating instruction's
"Product Memory" section, verbatim).

---

## 6. Mechanism Design

### 6.1 Automatic default resolution (FR-89 itself)

**New pure function**, added to `apps/tenant/src/lib/contagemMultiUnitValuation.ts`
(same file as `deriveModeAPortionValuations`, reused verbatim, zero
changes to that function itself):

```ts
/** Resolves a single row's own sellingPrice/unit from the product's
 * confirmed default, IF that row is still following the default
 * (sellingPriceAutoFilled !== false). Never called for a row the Owner
 * has deliberately priced — callers must check sellingPriceAutoFilled
 * before invoking this, exactly as FR-91/FR-92 require (a default
 * resolution must never overwrite a deliberate entry).
 *
 * Reuses deriveModeAPortionValuations (unmodified) for the actual
 * arithmetic — this function only adapts its single-portion call
 * signature and null-handling to the working-row shape.
 *
 * [Audit correction] deriveModeAPortionValuations' own documented
 * contract (contagemMultiUnitValuation.ts header, worked example
 * "reference 1,250 MZN/Cx, 1 Cx = 24 Un -> 52.083333 MZN/Un") returns a
 * derivedSellingPrice denominated in the PORTION's own unit — i.e.
 * row.unit here, never referenceUnit/productSellingUnit. An earlier
 * draft of this function incorrectly returned
 * `sellingPriceBasisUnit: productSellingUnit`, mislabeling the derived
 * number's actual unit for every auto-resolved row (e.g. a Txilar row
 * counted in Cx, resolved to 1,200 MZN/Cx, would have been tagged
 * "Un"). Nothing in this Plan's own §6.3/§10 logic reads
 * sellingPriceBasisUnit on an auto-filled row today, so this mislabel
 * never corrupted a valuation total — but it violated
 * sellingPriceBasisUnit's own documented contract (§5.1: "the unit the
 * CURRENT sellingPrice value is expressed in") and would have silently
 * misled any future consumer of that field (a drill-down/audit view,
 * or a later feature) — exactly the class of mislabeling FR-91/FR-23
 * exist to prevent. Corrected below: the basis unit returned is always
 * row.unit, matching the value deriveModeAPortionValuations actually
 * computed it in.
 */
export function resolveDefaultSellingConfigurationForRow(
  row: { quantity: string; unit: string },
  productSellingUnit: string,
  productSellingPrice: number,
  relationship: UnitRelationship | undefined | null
): { sellingPrice: string; sellingPriceBasisUnit: string } | null {
  const quantity = parseFloat(row.quantity) || 0;
  const [result] = deriveModeAPortionValuations(
    [{ id: 'default-resolution', unit: row.unit, quantity }],
    productSellingUnit,
    productSellingPrice,
    relationship
  );
  if (result.derivedSellingPrice === null) return null; // FR-89's own narrow exception — no valid bridge; caller leaves the field for manual entry, exactly as today
  // sellingPriceBasisUnit is the PORTION's own unit (row.unit) — the
  // unit deriveModeAPortionValuations actually denominated the derived
  // price in — never productSellingUnit/referenceUnit. See the audit
  // correction note above.
  return { sellingPrice: String(result.derivedSellingPrice), sellingPriceBasisUnit: row.unit };
}
```

**Call sites (three, all in `PeriodicStockCountView.tsx`):**

1. `buildCatalogRow` — after its existing two-tier resolution (unchanged,
   Rule 8 Evidence B) produces `unit`/`sellingPrice`, the row is returned
   with `sellingPriceAutoFilled: true` and `sellingPriceBasisUnit` set to
   whatever unit that existing resolution used. **No arithmetic changes
   here** — this call site already resolves the correct default; this
   Plan only adds the marker fields.
2. `createManualRow` (extended — §7, below) — for an existing product,
   calls `resolveDefaultSellingConfigurationForRow` the same way
   `buildCatalogRow` effectively already does, setting
   `sellingPriceAutoFilled: true`.
3. **Physical-`unit` change on an already-`sellingPriceAutoFilled: true`
   row** — inside `updateCatalogRow`/`updateManualRow`'s existing field-
   write path: whenever the incoming `fields` change `unit` on a row
   whose `sellingPriceAutoFilled` is still `true` (or absent), the new
   `sellingPrice`/`sellingPriceBasisUnit` are re-derived via
   `resolveDefaultSellingConfigurationForRow` before the row is written —
   mirrors `AddStockView.tsx`'s own existing re-derivation-on-unit-change
   logic (lines ~1175–1181, Rule 8 Evidence I) exactly, ported to
   Contagem's own update functions. **[Clarification, final acceptance
   audit] If that re-derivation returns `null`** (the new physical unit
   is outside the confirmed chain — FR-89's own narrow exception, §14
   Test V) **the row's `sellingPrice` is cleared to blank and
   `sellingPriceAutoFilled` remains `true`.** No deliberate act occurred
   — only a physical-unit edit — so nothing here sets `sellingPriceAutoFilled`
   to `false`, and no price is fabricated for the unconvertible unit. The
   row surfaces exactly as an ordinary blank-price row does today,
   awaiting either a valid unit (which re-triggers this same resolution
   automatically) or a direct Owner price entry (which then correctly
   triggers the deliberate-entry detection below, exactly like any other
   direct edit).

**Deliberate-entry detection (the other half of the same write path):**
inside `updateCatalogRow`/`updateManualRow`, whenever the incoming
`fields` change `sellingPrice` directly (not as a side effect of #3
above) or change `unit` while the row is already
`sellingPriceAutoFilled: false`, the row is written with
`sellingPriceAutoFilled: false`, `sellingPriceBasisUnit` set to the row's
current `unit`, and `sellingPriceEditSequence` set to the next value from
the counter described in §6.2. This is the single place "deliberate vs.
default" is decided — no other code path sets `sellingPriceAutoFilled`.

### 6.2 "Last deliberately entered" — the sequence mechanism

**A single `useRef<number>(0)` counter in `PeriodicStockCountView.tsx`**,
scoped to one active Contagem session (component lifetime), incremented
by exactly 1 each time §6.1's "deliberate-entry detection" branch fires,
for any row, any product. The resulting value is stamped onto that row's
own `sellingPriceEditSequence`.

**Why a counter, not a timestamp** (restates Rule 8 Assessment's own
Finding 3 addendum, carried forward unchanged into this Plan): a
wall-clock timestamp captured inside a debounced autosave write
(`scheduleRowDraftSave`, Decision 39) can resolve out of order relative
to the Owner's own action sequence if two edits land in the same
debounce window; a synchronous, in-memory counter incremented inside the
same event handler that flips `sellingPriceAutoFilled` has no such race,
requires no new time-source dependency, and is deterministic by
construction. No existing part of the Contagem draft model uses a
persisted edit-timestamp for ordering, so this is the minimal-footprint,
architecture-consistent choice, not a new pattern.

**Draft resume:** because `sellingPriceEditSequence` round-trips through
`workingRowToDraftItem`/`draftItemToWorkingRow` (§5.2), a Contagem
resumed after interruption restores each row's own last-known sequence
value. The in-memory `useRef` counter itself is re-seeded, on resume, to
`1 + the maximum sellingPriceEditSequence found across all resumed rows`
(a small addition to the existing draft-resume code path) — this
guarantees any further deliberate edit in the resumed session continues
the correct ordering rather than restarting from zero and colliding with
already-stamped values.

### 6.3 The revised `sellingMemoryByProductName` tie-break (Finding 7)

**File:** `apps/tenant/src/context/AppContext.tsx`, `recordStockCount()`.

**Current logic (verified, unchanged input to this Plan):** iterates
submitted `items`; first item with a valid `sellingPrice` wins by
default; a later item whose `unit` matches the confirmed `sellingUnit`
overrides it.

**Revised logic:** `sellingMemoryByProductName`'s construction is changed
to read from the **working rows** (not the already-normalized submitted
`items`, which by design carry no `sellingPriceAutoFilled`/
`sellingPriceEditSequence` information — §5.3). `recordStockCount`'s
caller (`PeriodicStockCountView.tsx`'s own confirm handler) is extended
to pass an additional, optional, **un-persisted** parameter — a flat list
of `{ productName, sellingPrice, unit, sellingPriceAutoFilled,
sellingPriceEditSequence }` derived directly from the working rows at
the moment of submission, mirroring exactly the precedent
`costBasisByProductName` already establishes for threading extra,
un-persisted context into this function (Rule 8 Evidence F/Finding 6,
reused verbatim as an architectural pattern, not duplicated as code).

```ts
// AppContext.tsx, recordStockCount() — revised construction
const sellingMemoryByProductName = new Map<string, { sellingPrice: number; sellingUnit?: string }>();
const bestSequenceByProductName = new Map<string, number>();
for (const wr of workingRowDeliberateEntries ?? []) { // new optional param, absent = today's old behavior below
  if (wr.sellingPriceAutoFilled !== false) continue; // §6.1's own definition of "deliberate" — absent/true are never candidates
  const key = wr.productName.trim().toLowerCase();
  const seq = wr.sellingPriceEditSequence ?? -1;
  const bestSoFar = bestSequenceByProductName.get(key);
  if (bestSoFar === undefined || seq > bestSoFar) {
    bestSequenceByProductName.set(key, seq);
    sellingMemoryByProductName.set(key, { sellingPrice: wr.sellingPrice, sellingUnit: wr.sellingPriceBasisUnit });
  }
}
```

**No comparison by confirmed-selling-unit match anywhere in this revised
logic** — satisfies the confirmed business rule directly (Rule 8
Assessment §12, points 4–5). **If `workingRowDeliberateEntries` is
absent** (a defensive fallback, e.g. an old call site not yet updated),
the function falls back to today's exact pre-existing logic —
**backward-compatible by construction**, same discipline every other
optional-parameter threading in this codebase already follows
(`costBasisByProductName`, `preferredSellingUnit`).

**If no row for a product was deliberately entered** (every candidate
`continue`d), `sellingMemoryByProductName` has no entry for that product
— the existing "unchanged, no write" guard (`product.sellingPrice ===
memory.sellingPrice` equality check, unmodified) is not even reached; no
write is queued, restating FR-84/FR-91 exactly (Rule 8 Assessment
Scenario H).

### 6.4 Valuation path — where automatic and deliberate prices actually
### feed `normalizeStockCountItems`/`tallyStockCountRows`

**No change to `normalizeStockCountItems` or `tallyStockCountRows`
themselves.** Both continue reading `sellingPrice` directly off each row/
item exactly as today (Rule 8 Evidence F, restated). By the time either
function runs, every row's `sellingPrice` field already holds the
correct value — either §6.1's auto-resolved default or the Owner's own
deliberate entry — because §6.1's resolution writes directly into that
same field the row already carries. **This is the "one authoritative
valuation path" discipline, preserved exactly**: no second calculation,
no second total, no field these functions don't already read.

---

## 7. `createManualRow` / "+ Adicionar Porção" (Finding 8)

**File:** `PeriodicStockCountView.tsx`.

**Current signature (unchanged):** `createManualRow(): StockCountWorkingRow`.

**Revised behavior — existing product:** when a manual row is added for
a product already resolvable by name (the same case-insensitive lookup
`getRememberedPriceForRow`/`isGenuinelyNewProductName` already perform),
the row is initialized via the same resolution path as §6.1 item 2:
`unit`/`sellingPrice` default from `findLatestRememberedProductMemory`/
`resolveUnitAwarePrice` (unmodified, Rule 8 Evidence H), with
`sellingPriceAutoFilled: true`, `sellingPriceBasisUnit` set accordingly.

**Revised behavior — genuinely new product:** unchanged from today —
the row remains blank (`sellingPriceAutoFilled` absent/irrelevant) until
`NewProductInfoPanel`'s own selling-unit/price establishment completes,
exactly as FR-93 already requires. No change to `NewProductInfoPanel`
itself.

**Guarantee, restated as the exact behavior this satisfies:** a manually
-added physical quantity entry never becomes a deliberate selling
portion merely by existing — it only does so the moment the Owner edits
its `sellingPrice`/`unit` directly, at which point §6.1's deliberate-
entry detection fires identically to a catalog row's own.

---

## 8. Add Stock — Verification Only

**Explicit finding, this Plan: NO IMPLEMENTATION CHANGE REQUIRED.**

Re-verified directly against `AddStockView.tsx` and
`productMemoryPriceResolution.ts` at this Plan's own baseline HEAD:
`findLatestRememberedProductMemory` already searches confirmed
`StockCount` history (Periodic Contagem and Initial Stock alike)
alongside `StockBatch` history, newest-by-date wins, already used
identically by both Add Stock and Contagem's own `buildCatalogRow`; once
§6.3's revised write correctly updates `Product.sellingPrice`/
`unitRelationship.sellingUnit`, Add Stock's existing prefill
(`sellingPriceAutoFilled`/`sellingPriceBasisUnit`, already shipped) picks
it up automatically, with the Owner already free to change unit and/or
price (existing, unmodified `sellingPriceAutoFilled` flip-on-edit
behavior). **No file under `AddStockView.tsx` or
`productMemoryPriceResolution.ts` is modified by this Plan.**

---

## 9. Mode A / Mode B Boundary — No Double Conversion

**Explicit demonstration, per the originating instruction's own
requirement:**

- §6.1's automatic resolution runs **only** while
  `sellingPriceAutoFilled !== false` for a given row. The moment Mode A
  is explicitly toggled on for a product (`handleModeAToggle`,
  unmodified), every affected row's `sellingPrice` is overwritten by
  `deriveModeAPortionValuations`' own output and, per §6.1's deliberate-
  entry detection (an explicit Owner-initiated toggle counts as a
  deliberate act), `sellingPriceAutoFilled` is set to `false` for those
  rows — **removing them from further automatic re-resolution**. A
  subsequent physical-`unit` edit on such a row therefore does **not**
  re-trigger §6.1's default-resolution (guarded by the same
  `sellingPriceAutoFilled !== false` check), preventing the exact double-
  conversion risk the instruction asks this Plan to rule out.
- Conversely, a row still at `sellingPriceAutoFilled: true` when Mode A
  is toggled receives Mode A's own value and immediately becomes
  `false` — never resolved twice by two different code paths for the
  same edit.
- `deriveModeAPortionValuations` itself is called from exactly two
  places after this Plan: `handleModeAToggle` (existing, unmodified) and
  `resolveDefaultSellingConfigurationForRow` (§6.1, new, single-portion
  wrapper around the same function). Neither call site's output is ever
  fed into the other — no chained/compounded conversion is possible by
  construction.

**Mode A's own existing UI, toggle, and semantics are unmodified.** It
remains available for its original purpose (an explicit, product-wide
reference-unit choice), never mandatory for ordinary mixed-unit
counting — restates Rule 8 Assessment Finding 10 exactly.

---

## 10. Persistence / `recordStockCount` — Exact Write Sequence

1. `PeriodicStockCountView.tsx`'s confirm handler builds `items` (the
   existing, unchanged `StockCountInputItem[]` shape) from the working
   rows' current `sellingPrice`/`unit`/`quantity` — **unchanged from
   today**, since §6.1 already resolved every row's `sellingPrice` before
   this point.
2. The same handler additionally builds the new, un-persisted
   `workingRowDeliberateEntries` list (§6.3) from the same working rows,
   passed as `recordStockCount`'s new optional parameter.
3. `recordStockCount` calls `normalizeStockCountItems(items,
   costBasisByProductName)` — **unchanged call signature and behavior**
   (§6.4).
4. `sellingMemoryByProductName` is constructed per §6.3's revised logic,
   using `workingRowDeliberateEntries` — **the only changed step in this
   sequence.**
5. The two existing write sites (new-product creation branch;
   existing-product post-loop update, both `AppContext.tsx`) consume
   `sellingMemoryByProductName` **exactly as they already do today** — no
   change to either write site's own code, only to what feeds the Map
   they read.
6. `countItems`/`totalValue`/`totalSellingValue` persist **exactly as
   today** — no new field on `StockCount.items` (§5.3).

---

## 11. Business Worth — Confirmed Untouched

`normalizedTotalSellingValue` → `productValuationTotal` →
`measuredBusinessWorth` (`AppContext.tsx`) reads only the final
`sellingPrice`/`quantity` on each persisted item, with no awareness of
`sellingPriceAutoFilled`, Mode A/B, or anything else this Plan
introduces. **Zero changes to any Business Worth calculation, formula,
or code path.** Restates Rule 8 Assessment Scenario K.

---

## 12. Worked Examples — Re-verified Against This Plan's Concrete Design

Each of the originating instruction's own numbered examples (§7–§10) and
the Rule 8 Assessment's Scenarios A–L are re-traced here against this
Plan's actual mechanism (not merely restated):

- **12 Cx, remembered 50 MZN/Un, no deliberate change.** `buildCatalogRow`
  → `sellingPriceAutoFilled: true`. §6.1's resolution derives `50 × 24 =
  1,200 MZN/Cx` equivalently `12 × 24 × 50 = 14,400 MZN`, with
  `sellingPriceBasisUnit: 'Cx'` (the corrected §6.1 return value —
  matches the unit the derived number is actually denominated in, not
  `'Un'`). Matches.
- **12 Cx, Owner deliberately changes to 60 MZN/Un.** Owner edits
  `sellingPrice`; §6.1 deliberate-entry detection fires:
  `sellingPriceAutoFilled: false`, `sellingPriceBasisUnit: 'Un'`,
  sequence stamped. Current valuation: `12 × 24 × 60 = 17,280 MZN`.
  §6.3: this product's only deliberate entry wins trivially → remembered
  default becomes `60 MZN/Un`. Matches.
- **5 Cx @ 480 MZN/Cx + 7 Cx @ 50 MZN/Un, both deliberate.** Two rows,
  both `sellingPriceAutoFilled: false`, sequences 1 and 2 respectively
  (in whichever order the Owner actually edited them — §6.2 guarantees
  this is not array order). Valuation: `5 × 480 + 7 × 24 × 50 = 2,400 +
  8,400 = 10,800 MZN`. Neither price reinterpreted. §6.3: whichever
  sequence is higher wins as the future default — reversing entry order
  reverses the winner (Rule 8 Scenarios F/G). Matches exactly, including
  the reverse-order proof.
- **5 Emb + 3 Pacotes, 1 Emb = 10 Pacotes, default 50 MZN/Pacote, no
  deliberate change.** Both rows `sellingPriceAutoFilled: true`. §6.1
  resolves each independently: `5 × 10 × 50 = 2,500`; `3 × 50 = 150`;
  summed by unmodified `normalizeStockCountItems` = `2,650 MZN`. Neither
  quantity rewritten, no automatic merging into one entry. Matches.
- **5 Emb @ 450 MZN/Emb (deliberate) + 3 Pacotes under default 50
  MZN/Pacote.** First row: Owner edits → `sellingPriceAutoFilled: false`,
  `450` preserved exactly in `Emb` terms. Second row: untouched,
  `sellingPriceAutoFilled: true`, resolves to `50 MZN/Pacote` via §6.1.
  Valuation: `5 × 450 + 3 × 50 = 2,250 + 150 = 2,400 MZN`. Matches.

---

## 13. Explicit Boundaries — Confirmed Untouched

- **FR-67/§42 cost-basis engine** — `deriveCostContribution`,
  `fr67CostBasisConversion.ts`, `costBasisByProductName` construction —
  zero changes; this Plan reads none of it, writes none of it.
- **Initial Stock** — every write this Plan introduces is gated
  `type !== 'initial'`, mirroring §45's own existing guard exactly (§6.3);
  §6.1's automatic resolution applies equally and harmlessly to Initial
  Stock's own multi-portion valuation (already-existing capability,
  Product Memory Specification §16) without changing Initial Stock's own
  deliberately cost-basis-only `totalValue`.
- **Business Worth formula** — §11, above. Zero changes.
- **Add Stock / Smart Stock Entry purchase-side single-selling-basis
  rule** — §8, above. Zero changes to any Add Stock file.
- **Product Catalog field ownership (§45 §13)** — this Plan writes to
  the same `Product.sellingPrice`/`unitRelationship.sellingUnit` fields
  §45 already owns, via the same write authority (`recordStockCount`'s
  existing existing-product update site), never a new one.
- **FR-78–FR-88 (§45) own signed text and its own Rule 8/Plan/
  Authorization** — not reopened, not modified. Only the
  `sellingMemoryByProductName` tie-break *implementation* (never itself
  signed FR text — Rule 8 Assessment Finding 7/§11, Product-Architect-
  confirmed) is revised, per §6.3, above.
- **`firestore.rules`/`firestore.indexes.json`** — no change (§5.2).

---

## 14. Test Plan

**New unit tests (pure-function, no DOM/Firestore harness, matching this
codebase's established convention):**

| # | Scenario | Expected |
|---|---|---|
| A | 12 Cx @ remembered 50/Un, no deliberate change | 14,400 MZN |
| B | 12 Cx, Owner deliberately changes to 60/Un | 17,280 MZN; new remembered default = 60/Un |
| C | 5 Cx @ 480/Cx (deliberate) + 7 Cx @ 50/Un (default) | 10,800 MZN; both denominations preserved |
| D | **[Corrected, per audit Finding 2]** Two deliberately-entered configurations for the same product, both directions: (i) `480/Cx` entered, then `50/Un` entered → memory becomes `50/Un`; (ii) `50/Un` entered, then `480/Cx` entered → memory becomes `480/Cx` | (i) `sellingMemoryByProductName` selects `50/Un` (higher `sellingPriceEditSequence`); (ii) selects `480/Cx`. Proves the tie-break follows entry recency, not row order, array position, or confirmed-selling-unit match — distinct from Test C, which has only one deliberate candidate and cannot exercise this rule |
| E | 5 Emb + 3 Pacotes, 1 Emb=10 Pacotes, default 50/Pacote | 2,650 MZN; quantities unchanged |
| F | 5 Emb @ 450/Emb (deliberate) + 3 Pacotes @ 50/Pacote (default) | 2,400 MZN |
| G | 5 Emb + 3 Pacotes, neither deliberately priced | No deliberate portion created; no memory write |
| H | Deliberate 480/Cx | Never stored/displayed as 480/Un anywhere |
| I | Deliberate 50/Un on a row physically counted in Cx | Remains 50/Un |
| J | Blank row, valid relationship + remembered config | Auto-resolves via §6.1, `sellingPriceAutoFilled` stays true |
| K | "+ Adicionar Porção" on an existing product | Initializes exactly like a catalog row (§7) |
| L | Multiple deliberate configs in one Contagem | Highest `sellingPriceEditSequence` wins (§6.3) |
| M | Add Stock after a Contagem-established default | Loads it as default, unchanged code (§8) |
| N | Add Stock, Owner changes unit | Allowed, unchanged code |
| O | Add Stock, Owner changes price | Allowed, unchanged code |
| P | Mixed-unit counting, no deliberate entries | No Mode A toggle required |
| Q | Mode A explicitly toggled | Produces correct value once; `sellingPriceAutoFilled` set false; no re-resolution on subsequent unit edit (§9) |
| R | Initial Stock | Unaffected — `type !== 'initial'` guard verified (§13) |
| S | Existing FR-78–FR-88 tests | Re-run as regression, unmodified expectations |
| T | Business Worth | Correct final valuation, zero formula changes (§11) |
| U | Same physical unit as selling unit | Existing identity-case behavior unchanged |
| V | No valid unit relationship | `resolveDefaultSellingConfigurationForRow` returns `null`; row left for manual entry (FR-89's own exception) |
| W | Multiple deliberate portions summed | Correct total; no cross-denomination conversion |
| X | Edit-sequence ordering | Deterministic; unaffected by shuffling row array order in the test fixture itself |
| Y | **[New, per audit]** `3 Cx + 3 Emb + 5 Un`, same product, one catalog row + two manual rows, none deliberately priced, remembered default `50 MZN/Un`, `1 Cx = 24 Un`, `1 Emb = 6 Un` | Each row resolves independently via §6.1: `3 × 24 × 50 = 3,600` (Cx) + `3 × 6 × 50 = 900` (Emb) + `5 × 50 = 250` (Un) = `4,750 MZN`; all three physical quantities/units remain exactly `3 Cx`/`3 Emb`/`5 Un`, never merged |
| Z | **[New, per audit]** Two different products in one Contagem, each with its own deliberate entry, entered interleaved (Product A deliberate edit, then Product B deliberate edit, then a second Product A deliberate edit) | The global `sellingPriceEditSequence` counter is shared, but §6.3's `bestSequenceByProductName` is keyed per product name — confirms Product A's winner is its own *last* deliberate entry (the third edit), unaffected by Product B's edit landing between Product A's two edits |
| AA | **[New, per audit]** A Contagem is interrupted (autosave draft persisted) after one deliberate entry (`sellingPriceEditSequence: 1`), then resumed and a second deliberate entry is made for the same product | On resume, the in-session counter re-seeds to `max(resumed sequences) + 1 = 2`; the second, post-resume deliberate entry receives sequence `2` and correctly wins the tie-break as the later entry, proving §6.2's resume re-seeding logic is not merely described but exercised |

**Existing tests to re-run as regression, unmodified expectations
(re-verified this session, Rule 8 Evidence K — no existing assertion
found that this Plan's design would break; must be re-confirmed against
the actual diff at implementation time, not assumed here):**
`contagem-multi-unit-valuation.test.ts`,
`periodic-stock-mode-a-integration.test.ts`,
`periodic-stock-multi-portion-valuation.test.ts`,
`periodic-stock-add-portion.test.ts`,
`decision-37-first-contagem-cost-removal-and-selling-price-memory.test.ts`,
plus the full FR-78–FR-88 (§45) regression suite.

---

## 15. Reuse-First Confirmation

| Existing mechanism | Reused verbatim | Notes |
|---|---|---|
| `findLatestRememberedProductMemory` | Yes | Zero changes (§8) |
| `resolveUnitAwarePrice` | Yes | Zero changes |
| `getConversionFactor` | Yes | Zero changes, called only via `deriveModeAPortionValuations` |
| `deriveModeAPortionValuations` | Yes | Zero changes; wrapped by one new single-portion helper (§6.1) |
| Add Stock `sellingPriceAutoFilled`/`sellingPriceBasisUnit` | Extended (same names, same semantics) to `StockCountWorkingRow` | §5.1 — direct precedent reuse, not reinvention |
| `costBasisByProductName` threading pattern | Reused as an architectural pattern for `workingRowDeliberateEntries` | §6.3, §10 — not literally the same Map, but the identical "optional, un-persisted parameter" technique |
| `sellingMemoryByProductName` | Construction logic revised; both consuming write sites unchanged | §6.3 |

No existing mechanism is duplicated. The one genuinely new piece of
logic this Plan introduces is the in-session sequence counter (§6.2) —
justified above as necessary because no existing mechanism in this
codebase already establishes deterministic intra-session edit ordering.

---

## 16. Implementation Sequence (for the eventual Implementation
## Authorization — not authorized by this Plan)

1. `StockCountWorkingRow` schema + draft round-trip (§5.1–§5.2).
2. `resolveDefaultSellingConfigurationForRow` (§6.1) +
   `buildCatalogRow`/`createManualRow` wiring (§6.1 items 1–2, §7).
3. `updateCatalogRow`/`updateManualRow` deliberate-detection +
   re-resolution-on-unit-change (§6.1 item 3, §6.2 counter).
4. `sellingMemoryByProductName` revision + `recordStockCount` new
   parameter (§6.3, §10).
5. Mode A integration point — `handleModeAToggle` setting
   `sellingPriceAutoFilled: false` (§9).
6. Test suite (§14), full regression pass (§14's existing-test list).

Each step is independently testable before the next begins, matching
this repository's own established incremental-implementation discipline.

---

## 17. Acceptance Criteria

- Every scenario in §14's table passes.
- Every existing regression test listed in §14 passes unmodified.
- No change to `StockCount.items`' persisted schema (verified by schema
  diff at implementation time).
- No change to `firestore.rules`/`firestore.indexes.json`.
- No change to any Business Worth calculation.
- No change to Add Stock code.
- No change to FR-67/§42 cost-basis code.
- No change to Initial Stock's own valuation behavior.
- Mode A's own existing UI/toggle unchanged in behavior for its
  original explicit-choice purpose.

---

## 18. Explicit Exclusions

Restated from FR-89–FR-94 §19 and the Rule 8 Assessment §10: no change
to Add Stock/Smart Stock Entry; no change to the Business Worth formula;
no change to Initial Stock; no redesign of the Product Catalog's field
set or ownership; no new schema on `StockCount.items`; no new competing
Product Memory mechanism; no timestamp-based ordering; no second
Business Worth calculation.

---

## 19. Governance Gates (restated)

Rule 8 Assessment = **accepted, signed**. Implementation Plan (this
document) = **accepted, signed** — see "Product Architect Signature,"
above §2. Implementation Authorization = **not yet created**.
Implementation = **not yet authorized**. Per FR-89–FR-94's own §18
sequence, this Plan's acceptance was the required gate before an
Implementation Authorization may be drafted; that Authorization remains
a separate, subsequent step, and implementation may not begin until it
is signed.

---

## Verification Performed for This Plan

- `git status`/`git log -1` confirmed clean working tree at
  `a73383b606b15480abcda02f424cc68e50ab345f` before drafting.
- Signed FR-89–FR-94 amendment and signed Rule 8 Assessment re-read in
  full, MD5-checksummed before and after drafting — both unchanged
  (`6f66f6e36fab51d3cc2c3d263553c6e9` and
  `3b0c1c7a294ae13a50dc84d09c113bb5` respectively).
- Repository searched for any pre-existing file matching this Plan's own
  intended path or name — none found.
- `StockCountWorkingRow`, `normalizeStockCountItems`,
  `tallyStockCountRows`, `workingRowToDraftItem`/`draftItemToWorkingRow`
  (`stockCount.ts`); `deriveModeAPortionValuations`,
  `canApplyModeA`, `sumModeAPortionValuations`
  (`contagemMultiUnitValuation.ts`); `findLatestRememberedProductMemory`,
  `resolveUnitAwarePrice` (`productMemoryPriceResolution.ts`); relevant
  sections of `PeriodicStockCountView.tsx` (`buildCatalogRow`,
  `createManualRow`, `updateCatalogRow`, `updateManualRow`,
  `handleModeAToggle`, `getRememberedPriceForRow`); relevant sections of
  `AddStockView.tsx` (`sellingPriceAutoFilled`/`sellingPriceBasisUnit`
  logic); `AppContext.tsx` (`recordStockCount`,
  `sellingMemoryByProductName` construction and both write sites) — all
  re-inspected directly against this Plan's own baseline HEAD.
- No application code, test, or governance file was modified while
  drafting this Plan.

---

## 20. Addendum — Persisted Selling-Price Basis Unit (Option C)

**Status: ✅ ACCEPTED BY THE PRODUCT ARCHITECT, SABUSHIMIKE MASCENI, 30
August 2026.**

Appended per this repository's own established "append, don't rewrite"
pattern. §1–§19 above, and the Verification section immediately
preceding this addendum, are unaltered.

**Revises §5.3's own prior conclusion** ("No change" to
`StockCount.items`' persisted schema) — per Rule 8 Assessment §15
addendum (this same governance chain), a narrow, additive exception is
now specified, exercising the exact discretion FR-94's own signed text
reserves to Rule 8.

**Exact schema change:**

```ts
export interface StockCountItem {
  // ...existing fields, unchanged...
  sellingPriceBasisUnit?: string; // display/audit-only — never read by
  // any valuation calculation; see Rule 8 Assessment §15 addendum for
  // the full rationale.
}
```

**Exact functions changed:**
- `normalizeStockCountItems`/`tallyStockCountRows` (`stockCount.ts`) —
  add `sellingPriceBasisUnit: row.sellingPriceBasisUnit ?? row.unit` to
  each item's returned shape.
- `ProductDetailModal.tsx` — the existing selling-price display line
  reads `item.sellingPriceBasisUnit ?? item.unit` instead of `item.unit`
  alone. The existing quantity display line is untouched.
- `findLatestRememberedProductMemory`
  (`productMemoryPriceResolution.ts`) — the matched historical item's
  own basis-unit resolution prefers `item.sellingPriceBasisUnit`, falls
  back to `item.unit`.

**Backward compatibility (restated verbatim per the Product Architect's
own explicit instruction):** new records get `sellingPriceBasisUnit`;
old records without it continue using `item.unit`, exactly as they are
read today. No migration, no backfill.

**Explicitly out of scope for this addendum:** the Contagem UI caption
fix (`PeriodicStockCountView.tsx:3851, 4287`) is a separate,
already-identified, not-yet-authorized correction — a distinct decision
point (display-only, no schema dependency), not authorized by this
addendum even if bundled into the same implementation pass for
efficiency.

**Test requirements (minimum):**
1. `sellingPriceBasisUnit` round-trips correctly through
   `normalizeStockCountItems`/`tallyStockCountRows` for a diverged row
   (`480/Cx` deliberately entered, physical unit later changed to `Un`).
2. A pre-existing `StockCountItem` (no `sellingPriceBasisUnit` field at
   all) is read correctly by both updated consumers, falling back to
   `.unit`.
3. `ProductDetailModal`'s quantity display line is unaffected — still
   reads `.unit` only.
4. No existing valuation total changes for any scenario in the existing
   FR-89–FR-94 test suite (regression).

**Verdict: READY AFTER IMPLEMENTATION AUTHORIZATION AMENDMENT.**

**Product Architect acceptance, recorded 30 August 2026.** The Product
Architect has accepted this §20 addendum, in the same act as accepting
Implementation Authorization §10 (the corresponding, final governance
gate for Option C) — see that document's own §10 signature block for
the full, verbatim decision text. This §20 addendum's own schema
specification, function list, and test requirements (above) are
unaltered by this acceptance record; nothing above this line is
rewritten.

## 21. Addendum — Contagem UI Selling-Price Denomination Caption

**Status: DRAFT — AWAITING PRODUCT ARCHITECT ACCEPTANCE.**

Appended per this repository's own established "append, don't rewrite"
pattern. §1–§20 above, including §20's own signature block, are
unaltered by this addendum.

**Basis.** This addendum plans, at the Implementation Plan level,
exactly the correction Rule 8 Assessment §16 addendum (this same
governance chain) analyzed and recommended, and which §20 immediately
above explicitly named as out of its own scope. It authorizes planning
for exactly two display expressions — nothing else.

**Scope — exactly two locations, both in
`apps/tenant/src/components/PeriodicStockCountView.tsx`:**
1. Catalog-row selling-price caption (line 3857).
2. Manual-row selling-price caption (line 4293).

**Required implementation behavior, identical at both locations:**

Current:
```tsx
{currencySymbol} por {row.unit.trim() || 'un'}
```

Change to:
```tsx
{currencySymbol} por {(row.sellingPriceBasisUnit ?? row.unit).trim() || 'un'}
```

**Explicitly, this addendum authorizes planning for display-only
text-source changes, and nothing else:**
- No state mutation — neither line writes to any state; both remain
  pure render expressions.
- No business-logic changes — `applySellingConfigurationEditRules` and
  every other function in this file's Rules 1–4 (§6 above) are
  untouched.
- No schema changes — `StockCountWorkingRow`/`StockCountItem`/`Product`
  are all already final (§5, §20 above); this addendum adds no field to
  any of them.
- No persistence changes — `recordStockCount`'s own write sequence
  (§10 above) is untouched; nothing about what is saved changes.
- No Product changes — `Product.sellingPrice`/`unitRelationship` are
  not read or written by either affected line.
- No Add Stock changes — `AddStockView.tsx` does not contain either
  affected line and is not touched.
- No Initial Stock changes — `InitialStockCountView.tsx` does not
  contain either affected line and is not touched.
- No Mode A/B changes — Mode A's own reference-unit caption (line 308,
  `{referenceUnit || 'unidade'}`) is a distinct, already-correct
  mechanism and is explicitly excluded; Mode B's own valuation path
  (§9 above) is unaffected since neither affected line feeds any
  calculation.
- No FR-67 changes — `fr67CostBasisConversion.ts` is not touched.
- No other UI redesign — no other caption, label, layout, or component
  in this file is modified.
- No new fields — `sellingPriceBasisUnit` already exists
  (`StockCountWorkingRow`, §5/§20 above); this addendum introduces no
  new field anywhere.
- No terminology changes — "por", the currency symbol placement, and
  the surrounding label text ("Venda/Un") are unchanged; only which
  unit string is read for the denomination changes.

**Test Plan (minimum, structural — extending
`tests/stockcount-selling-price-basis-unit.test.ts` or an equivalent
new file, using this repository's own established source-text-assertion
technique for files with no DOM render harness):**

A. Same-unit: `unit=Cx, sellingPriceBasisUnit=Cx` → resolved
   denomination is `Cx`.
B. Divergent unit: `unit=Cx, sellingPriceBasisUnit=Un` → resolved
   denomination is `Un`.
C. Reverse divergent unit: `unit=Un, sellingPriceBasisUnit=Cx` →
   resolved denomination is `Cx`.
D. Legacy fallback: `sellingPriceBasisUnit` absent → resolved
   denomination is `unit`, unchanged from today.
E. Mode A unchanged: structural assertion that line 308's own caption
   still reads `referenceUnit`, not `row.unit`/`row.sellingPriceBasisUnit`.
F. Catalog/manual parity: both the catalog-row and manual-row caption
   expressions are independently asserted to use
   `sellingPriceBasisUnit ?? unit`, since they are two separate
   textual occurrences.

**Verdict: READY AFTER IMPLEMENTATION AUTHORIZATION AMENDMENT.**

This addendum plans the change; it does not itself authorize coding.
The corresponding Implementation Authorization addendum (below) is the
gate that must be signed by the Product Architect before any source or
test file is modified.
