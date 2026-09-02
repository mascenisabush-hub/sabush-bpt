// Stock Count item normalization — pure, zero dependencies (no Firestore,
// no product-ID resolution, no React). Extracted from
// AppContext.tsx's recordStockCount() so the exact data-flow contract
// ("what the owner submitted is what gets normalized") is directly
// unit-testable without a Firebase/DOM harness, which this repository
// does not otherwise have.
//
// This is the ONLY thing recordStockCount reads to build a StockCount's
// items — it takes the `items` argument the caller passed explicitly
// (never any draft/autosave state) and normalizes it. See
// tests/initial-stock-confirmation.test.ts for the specific regression
// coverage this exists to support.
//
// [Business Worth Evolution — Increment 10 Item 5 / Post-Implementation
// Correction §25, "Contagem Cost-Basis Conversion" / "Cost-Price
// Zero-Fallback Removal", Specification §15/FR-67] Both
// normalizeStockCountItems and tallyStockCountRows (further below)
// accept an OPTIONAL costBasisByProductName lookup and, when a given
// row/item's product has an entry, derive that portion's cost
// contribution via the single shared deriveCostContribution helper
// (lib/fr67CostBasisConversion.ts) instead of the old, unconditional
// `quantity * costPrice`. Absent a lookup, or absent a matching entry,
// both functions behave exactly as before this correction — this is
// what keeps every pre-existing call site (and every regression test
// that does not pass this new, optional parameter) byte-for-byte
// unchanged. See that module's own header comment for the full
// authoritative-cost-basis and fallback rules this delegates to.
import type { ProductCostBasis } from '../lib/fr67CostBasisConversion';
import { deriveCostContribution } from '../lib/fr67CostBasisConversion';

// [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
// §2 item 1] `totalSellingValue` (quantity * sellingPrice, summed) is
// computed here IN PARALLEL to the pre-existing `totalValue`
// (quantity * costPrice, summed) — `totalValue`'s own computation is
// completely unchanged, still cost-only, still exactly what two
// existing tests already assert ('does not let selling price
// influence totalValue', 'sellingPrice may also differ per portion
// without affecting totalValue'). This function is SHARED by both
// Initial Stock and Periodic Contagem's own finalization
// (recordStockCount), so `totalSellingValue` becomes available to
// both — consistent with BDR-0014 Decision 7's requirement that
// Periodic Contagem also preserve both totals. Nothing in this file
// wires `totalSellingValue` into any basis-selection UI or display for
// Periodic Contagem — that remains explicitly out of this
// authorization's scope (Rule 8 Assessment Finding 1's own scope
// note).

export interface StockCountInputItem {
  productName: string;
  quantity: number | string;
  unit?: string;
  costPrice: number | string;
  // Optional so callers/tests written before this field existed keep
  // compiling and behaving the same way — missing/invalid input
  // coerces to 0, matching costPrice's own `Number(x) || 0` rule.
  sellingPrice?: number | string;
  // [FR-89–FR-94, Implementation Authorization §10, Option C] Optional
  // pass-through — see StockCountItem.sellingPriceBasisUnit's own
  // comment (types.ts) for the full rationale. This function never
  // reads this field for any arithmetic; it exists solely so the
  // caller's own already-resolved value (StockCountTallyItem, above,
  // via the confirm handler) survives into the persisted
  // StockCountItem shape unchanged.
  sellingPriceBasisUnit?: string;
  // [Business Worth Evolution — Implementation Authorization, Increment 4;
  // Specification §15, FR-20] Optional display-only pass-through — see
  // StockCountItem.valuationMode's own comment (types.ts). This function
  // never reads this field for any arithmetic; it exists solely so a
  // caller's Mode A/B choice survives into the persisted StockCountItem
  // shape unchanged.
  valuationMode?: 'A' | 'B';
}

export interface NormalizedStockCountItem {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  // [FR-89–FR-94, Implementation Authorization §10, Option C] Mirrors
  // StockCountItem's own field 1:1 (types.ts) — see that field's own
  // comment for the full rationale. Display/audit-only.
  sellingPriceBasisUnit?: string;
  totalValue: number;
  valuationMode?: 'A' | 'B';
  // [§44 — Periodic Contagem Cost-Price Removal, FR-73; Rule 8 Finding 3]
  // See StockCountItem.costBasisEstablished's own comment (types.ts) for
  // the full meaning. Captured here from deriveCostContribution's own
  // existing, already-computed `derived` return value — no new
  // calculation. Mirrors StockCountItem's own field 1:1.
  costBasisEstablished?: boolean;
}

export interface NormalizeStockCountItemsResult {
  items: NormalizedStockCountItem[];
  totalValue: number;
  // [Initial Stock Dual-Valuation-Basis] Sum of quantity * sellingPrice
  // across every non-blank row — the selling-basis counterpart to
  // totalValue above. See this file's own header comment.
  totalSellingValue: number;
}

/**
 * Normalizes raw Stock Count input rows into the exact shape persisted
 * on a StockCount document (minus productId, which requires a
 * Firestore-backed product lookup/creation and is resolved separately
 * in AppContext.tsx). Blank product names are dropped; quantity/cost
 * are coerced to numbers (invalid input becomes 0, matching
 * recordStockCount's existing `Number(x) || 0` behavior).
 */
export function normalizeStockCountItems(
  items: StockCountInputItem[],
  // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67] See
  // this file's own header comment above. Keyed by trimmed, lowercased
  // productName — the same key convention this file's
  // unitRelationshipByProductName correlation (AppContext.tsx) already
  // uses. Optional so every existing call site is unaffected.
  costBasisByProductName?: Map<string, ProductCostBasis>
): NormalizeStockCountItemsResult {
  const normalized: NormalizedStockCountItem[] = [];
  let totalValue = 0;
  let totalSellingValue = 0;

  for (const raw of items) {
    const trimmedName = raw.productName.trim();
    if (!trimmedName) continue;

    const quantity = Number(raw.quantity) || 0;
    const unit = raw.unit ? raw.unit.trim() : 'un';
    const costPrice = Number(raw.costPrice) || 0;
    // sellingPrice is additional information only — it never
    // participates in totalValue, which stays cost-basis-derived (the
    // investment basis), matching Expected Current Stock Value's
    // existing cost-based rule. It DOES participate in the separate
    // totalSellingValue accumulation below, unchanged in how it's read
    // from the row (per-portion, independent, exactly like costPrice).
    const sellingPrice = Number(raw.sellingPrice) || 0;
    // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67]
    // `costContribution` replaces the old unconditional
    // `quantity * costPrice` for this item's OWN totalValue only —
    // `costPrice` itself, stored on the normalized item below, is
    // NEVER overwritten with a derived value (Data Storage Rule: no
    // synthetic per-portion costPrice). Absent a matching cost basis
    // (or absent the parameter entirely), deriveCostContribution's own
    // fallback reproduces `quantity * costPrice` exactly — byte-for-
    // byte identical to this function's pre-correction behavior.
    const basis = costBasisByProductName?.get(trimmedName.toLowerCase());
    const { value: costContribution, derived: costBasisEstablished } = deriveCostContribution(quantity, unit, costPrice, basis);
    const itemTotal = Number(costContribution.toFixed(2));
    const itemSellingTotal = Number((quantity * sellingPrice).toFixed(2));
    totalValue += itemTotal;
    totalSellingValue += itemSellingTotal;

    normalized.push({
      productName: trimmedName,
      quantity,
      unit,
      costPrice,
      sellingPrice,
      // [FR-89–FR-94, Implementation Authorization §10, Option C]
      // raw.sellingPriceBasisUnit is the caller's own already-resolved
      // value (StockCountTallyItem, stockCount.ts, above, via the
      // confirm handler) — falls back to `unit` (the same, already-
      // computed local above) whenever absent, e.g. a legacy caller not
      // yet passing this field. Always resolves to a defined string —
      // never conditionally omitted, matching `unit` itself immediately
      // above.
      sellingPriceBasisUnit: raw.sellingPriceBasisUnit ?? unit,
      totalValue: itemTotal,
      // Display-only pass-through (see StockCountInputItem.valuationMode
      // above) — omitted entirely, never written as literal `undefined`,
      // matching this codebase's existing Firestore-safe-optional-field
      // discipline (workingRowToDraftItem, this same file, below).
      ...(raw.valuationMode ? { valuationMode: raw.valuationMode } : {}),
      // [§44 — Periodic Contagem Cost-Price Removal, FR-73; Rule 8
      // Finding 3] deriveCostContribution's own `derived` value, always
      // a defined boolean regardless of whether costBasisByProductName
      // was supplied — see StockCountItem.costBasisEstablished's own
      // comment (types.ts).
      costBasisEstablished,
    });
  }

  return {
    items: normalized,
    totalValue: Number(totalValue.toFixed(2)),
    totalSellingValue: Number(totalSellingValue.toFixed(2)),
  };
}

// ------------------------------------------------------------------
// [Stock Count Simplification Amendment v1.0 — 10-stock-counts-
// simplification-amendment.md] Blank vs. zero, and Counted vs. Not
// Counted — pure, dependency-free so the central "blank must never
// silently become zero" rule (BDR-0009 Part 4) is directly unit
// testable, matching this file's existing normalizeStockCountItems
// and this repository's established pattern (restockObservation.ts,
// openBatchSupersession.ts).
//
// This is the ONLY place that decides whether a working-list row
// counts as "counted" (contributes a StockCountItem + totals) or "not
// counted" (contributes only its name to the report's Not Counted
// list, per Amendment Part 15's forbidden-language rule — no
// quantity, price, value, or implied zero is ever attached to it).
// ------------------------------------------------------------------

/** One row of the Periodic Contagem working list — whether it came
 * from auto-populating the product catalog or from the existing
 * manual "add product" affordance. `quantity` is a raw string because
 * it mirrors a controlled `<input type="number">`'s value directly:
 * '' is the only representation of "not yet counted"; any other
 * string (including '0') is an operator-entered physical count. */
export interface StockCountWorkingRow {
  productId?: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  // Operator explicitly removed this pre-populated catalog row from
  // the working list this session (Amendment Part 10) — distinct from
  // a still-blank quantity only in how it got here, never in outcome:
  // both land in Not Counted, never in Counted, never as an implied
  // zero.
  removed?: boolean;
  // [Decision 40 — Validar Workflow, FR-N6] The Owner has explicitly
  // pressed "Validar" on this row: "I have finished checking/counting
  // this product." Persisted (round-tripped through
  // workingRowToDraftItem/draftItemToWorkingRow below, mirroring
  // `removed`'s own existing pattern exactly), never a purely local
  // UI-only concept — this is the field that replaces the prior
  // React-state-only `confirmedCatalogProductIds`/
  // `confirmedManualRowIndices` mechanism. Orthogonal to `removed`:
  // a row can be validated without being removed, or removed without
  // ever having been validated; neither implies the other. Consulted
  // only by PeriodicStockCountView.tsx's own active-workspace/
  // accumulated-area filtering — never by tallyStockCountRows (which
  // still counts a validated row exactly like any other, per its own
  // quantity/removed rules, unaffected by this field) and never
  // forwarded to a finalized StockCount item (see
  // PeriodicStockCountView.tsx's own explicit-literal `items` mapping
  // for recordStockCount, which excludes it by construction). No
  // timestamp, no audit history — a single boolean is the entire
  // authorized semantic (Decision 40 §4 non-goals).
  validated?: boolean;
  // [Decision 40 — Validar Workflow, Rule 8 §D/§E] UI-only, ephemeral
  // identity for a manually-added row, used solely so
  // tallyStockCountRows (below) can attach enough identity to
  // StockCountTallyItem for the review screen's "Corrigir" action to
  // resolve which row to reopen. Set only on the caller-local rows
  // array PeriodicStockCountView.tsx builds specifically for a
  // confirmation-tally call (never on `manualRows` state itself, and
  // never on the shared `allWorkingRows` memo used for autosave/live
  // display) — a manual row has no other stable identity today (see
  // `updateManualRow`'s/`handleRemoveManualRow`'s own existing
  // array-index convention, reused here rather than inventing a new
  // one). Deliberately NOT referenced by workingRowToDraftItem/
  // draftItemToWorkingRow below (same exclusion-by-construction as
  // this file's other UI-only fields, above) — never persisted, never
  // part of the draft schema.
  manualRowIndex?: number;
  // [Product Memory / UOM — Increment A, Checkpoint 2c] UI-only fields,
  // meaningful only for a manually-added row (productId undefined) that
  // does not match any existing catalog product — the Periodic Contagem
  // analogue of InitialStockCountView.tsx's/AddStockView.tsx's own
  // identically-scoped fields from Checkpoints 2a/2b. Deliberately NOT
  // referenced by workingRowToDraftItem/draftItemToWorkingRow below —
  // both build explicit, field-by-field object literals rather than
  // spreading `row`, so these two fields are excluded from the
  // persisted draft by construction, with no change needed to either
  // function. tallyStockCountRows, further below, is unaffected for the
  // identical reason (it also builds an explicit StockCountTallyItem
  // literal, never spreading the source row). PeriodicStockCountView.tsx
  // is solely responsible for reading these two fields and building/
  // validating an actual UnitRelationship candidate from them at
  // submission time — this type only carries the raw strings.
  // [Product Memory / UOM — Increment A, Checkpoint 2c; Decision 37,
  // B.1] Historically this type carried newProductSellingUnit/
  // newProductSellingUnitFactor/newProductPurchaseUnit/
  // newProductPurchaseCost as UI-only, row-owned fields for a
  // manually-added row not yet in the catalog. That design had a real
  // bug: this is genuinely PRODUCT-level information, but storing it
  // on a specific row meant deleting that one row could silently
  // destroy it. The correction moves this information into
  // PeriodicStockCountView.tsx's own component state
  // (`newProductInfo`, keyed by product name via `productKeyFor` — the
  // same convention `modeAGroups` already uses), which survives row
  // deletion/reordering by construction. StockCountWorkingRow itself
  // therefore carries none of these four fields anymore — there is
  // nothing here for workingRowToDraftItem/draftItemToWorkingRow/
  // tallyStockCountRows to exclude or be affected by, since the data
  // never lives on a row in the first place.

  // [FR-89–FR-94, Implementation Authorization §2 item 1] Working-row-
  // only. `true` while sellingPrice/unit still reflect the product-
  // level default (either buildCatalogRow's/createManualRow's initial
  // prefill, or a later automatic re-resolution — see
  // resolveDefaultSellingConfigurationForRow, contagemMultiUnitValuation.ts);
  // `false` the moment the Owner directly edits sellingPrice, or edits
  // unit while the row is already deliberate. Absent on any row that
  // predates this capability — treated identically to `false` by every
  // reader (a physical unit alone never implies deliberateness either
  // way, so "absent" only matters for the auto-re-resolution path,
  // which simply does not fire for a pre-existing row until it is next
  // rebuilt), never treated as `true`, so an old, untouched draft is
  // never silently reinterpreted as still-default when it is genuinely
  // ambiguous. Persisted only in the draft round-trip
  // (workingRowToDraftItem/draftItemToWorkingRow, below) — never
  // reaches the confirmed StockCountItem shape (see
  // normalizeStockCountItems/tallyStockCountRows, further below, which
  // do not read this field).
  sellingPriceAutoFilled?: boolean;
  // [FR-89–FR-94, Implementation Authorization §2 item 1] Working-row-
  // only. The unit the CURRENT sellingPrice value is actually
  // expressed in, independent of this row's own physical `unit` —
  // mirrors AddStockView.tsx's own existing field of the same name and
  // purpose exactly. Set whenever sellingPrice is set, whether by
  // auto-resolution (set to the row's own physical unit — see
  // resolveDefaultSellingConfigurationForRow's own contract) or by a
  // deliberate Owner entry (set to the row's current unit at the
  // moment of that entry).
  sellingPriceBasisUnit?: string;
  // [FR-89–FR-94, Implementation Authorization §2 item 1] Working-row-
  // only. Monotonically increasing, set only the moment
  // sellingPriceAutoFilled transitions to false (a genuine Owner edit)
  // — never incremented by the automatic resolution path itself. An
  // in-session sequence, not a wall-clock timestamp (see
  // PeriodicStockCountView.tsx's own sellingPriceEditSequenceRef for
  // why). Used only to determine, among several deliberately-priced
  // rows for the same product, which was entered last — never read by
  // any valuation calculation.
  sellingPriceEditSequence?: number;
  // [Periodic Contagem Entry-Order Sort Mode — Implementation
  // Authorization §1 items 1-2, §3 criteria 1-2/4-5] Working-row-only,
  // draft-round-tripped. Set exactly once, the moment this row's
  // `validated` first transitions to `true` (assigned in the SAME
  // updateCatalogRow/updateManualRow call, per §3 criterion 3) — never
  // reassigned afterward by any later edit, re-Validar, or Voltar
  // restoration. An in-session, monotonically increasing counter, not
  // a wall-clock timestamp — same reasoning as sellingPriceEditSequence
  // above. Absent on a row never validated this session; never
  // fabricated, never defaulted to 0. Excluded by construction from
  // the finalized StockCount item shape (see recordStockCount's own
  // explicit-literal `items` mapping), exactly as `validated` and
  // `manualRowIndex` already are.
  entrySequence?: number;
}

export interface StockCountTallyItem {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  // [FR-89–FR-94, Implementation Authorization §10, Option C] The unit
  // `sellingPrice`, immediately above, is actually denominated in —
  // distinct from `unit`, which remains the physical/counting unit.
  // Populated from `row.sellingPriceBasisUnit ?? row.unit` in
  // tallyStockCountRows, below — same source expression Finding A's own
  // fix already established for the un-persisted memory-write layer,
  // now also feeding this Owner-facing preview and, from there, the
  // persisted StockCountItem shape (via the confirm handler,
  // PeriodicStockCountView.tsx, and normalizeStockCountItems, below).
  // Display-only — never read by sellingValue's own calculation.
  sellingPriceBasisUnit?: string;
  purchaseValue: number; // quantity * costPrice
  sellingValue: number; // quantity * sellingPrice
  // [§44 — Periodic Contagem Cost-Price Removal, FR-73; Rule 8 Finding 3]
  // See StockCountItem.costBasisEstablished's own comment (types.ts) for
  // the full meaning. Captured here from deriveCostContribution's own
  // existing, already-computed `derived` return value — no new
  // calculation. Owner-facing-preview counterpart of
  // NormalizedStockCountItem.costBasisEstablished; both are always
  // computed identically from the same shared helper, per this file's
  // own "preview and persistence can never disagree" guarantee.
  costBasisEstablished: boolean;
  // [Decision 40 — Validar Workflow, FR-N11; Implementation
  // Authorization §1 item 7] UI-only fields, existing solely to let
  // the review screen's "Corrigir" action identify which exact row to
  // reopen, and to let it visually distinguish a validated product
  // from one still active when this screen is showing. NEITHER field
  // is ever included in the explicit-literal `items` mapping
  // PeriodicStockCountView.tsx's handleConfirmSave builds for
  // recordStockCount — this type is never itself persisted to
  // Firestore (it only ever backs this in-memory review screen), so
  // there is nothing to round-trip and no schema this could leak
  // into. `productId` mirrors the source row's own existing
  // `StockCountWorkingRow.productId` (present for a catalog row,
  // absent for a manual one); `manualRowIndex` mirrors the source
  // row's own ephemeral `StockCountWorkingRow.manualRowIndex` (see
  // that field's own comment, above) and is absent for a catalog row.
  // Exactly one of the two is ever present for a given item.
  productId?: string;
  manualRowIndex?: number;
  // [Decision 40 — Validar Workflow, FR-N11] Whether this product had
  // been validated ("Validar") at the moment this tally was built —
  // read directly from the same row this function is already
  // iterating, never a second pass or a separate lookup. Always a
  // concrete boolean here (never `undefined`), even though the source
  // row's own `validated` field is optional, since this type exists
  // solely to drive review-screen rendering, which needs a definite
  // yes/no per item.
  validated: boolean;
  // [Implementation Authorization §14 item 6 — Reference Selling
  // Configuration as the Default Path] Mirrors the source row's own
  // `StockCountWorkingRow.sellingPriceAutoFilled` verbatim — whether
  // THIS portion is still following a shared/default selling
  // configuration (`true`) or was independently, deliberately priced
  // (`false`). Working-preview-only, exactly like `productId`/
  // `manualRowIndex`/`validated` above: never included in the
  // explicit-literal `items` mapping PeriodicStockCountView.tsx's
  // confirm handler builds for `recordStockCount`, never reaching
  // `NormalizedStockCountItem`/the persisted `StockCountItem` shape,
  // never read by any valuation calculation. Exists solely so the
  // confirm handler can tag `StockCountItem.valuationMode` per item
  // (§14 item 6) instead of per product group, without a second
  // lookup pass against `allWorkingRows`.
  sellingPriceAutoFilled?: boolean;
}

export interface StockCountTallyResult {
  countedItems: StockCountTallyItem[];
  notCountedProductNames: string[];
  totalPhysicalUnits: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
}

/**
 * Splits a working list of rows into Counted vs. Not Counted, per
 * BDR-0009 Part 4 and the Amendment's Part 8–10/14: a row with a
 * non-blank quantity (including the literal string '0') is Counted;
 * a blank-quantity row, an explicitly removed row, or a row with an
 * unparseable quantity is Not Counted and contributes nothing but its
 * name — never a quantity, price, value, or implied zero. A row with
 * no product name at all (an untouched empty template row) is dropped
 * entirely, matching this file's existing normalizeStockCountItems
 * behavior for blank product names.
 */
export function tallyStockCountRows(
  rows: StockCountWorkingRow[],
  // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67] Same
  // parameter, same semantics, same shared deriveCostContribution
  // helper as normalizeStockCountItems above — this is what guarantees
  // the Owner-facing preview (this function) and the persisted
  // Contagem (normalizeStockCountItems) can never disagree. Passed in
  // by the caller (PeriodicStockCountView.tsx) rather than carried on
  // StockCountWorkingRow itself: a row's own shape is round-tripped
  // through workingRowToDraftItem/draftItemToWorkingRow and persisted
  // as an autosaved draft (further below), so adding a cost-basis
  // field there would introduce a new persisted-draft schema field —
  // exactly what this correction's own governing instruction forbids
  // absent strict necessity. Threading it as a separate, un-persisted
  // parameter avoids that entirely.
  costBasisByProductName?: Map<string, ProductCostBasis>
): StockCountTallyResult {
  const countedItems: StockCountTallyItem[] = [];
  const notCountedProductNames: string[] = [];
  let totalPhysicalUnits = 0;
  let totalPurchaseValue = 0;
  let totalSellingValue = 0;

  for (const row of rows) {
    const trimmedName = row.productName.trim();
    if (!trimmedName) continue;

    const rawQuantity = row.quantity.trim();
    const parsedQuantity = rawQuantity === '' ? NaN : Number(rawQuantity);
    const isBlank = row.removed === true || rawQuantity === '' || Number.isNaN(parsedQuantity);

    if (isBlank) {
      notCountedProductNames.push(trimmedName);
      continue;
    }

    const quantity = parsedQuantity;
    const unit = row.unit.trim() || 'un';
    const costPrice = Number(row.costPrice) || 0;
    const sellingPrice = Number(row.sellingPrice) || 0;
    // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67] See
    // normalizeStockCountItems' identical comment above — same helper,
    // same fallback guarantee, same "costPrice itself is never
    // overwritten" rule for the persisted StockCountTallyItem.costPrice
    // field below.
    const basis = costBasisByProductName?.get(trimmedName.toLowerCase());
    const { value: costContribution, derived: costBasisEstablished } = deriveCostContribution(quantity, unit, costPrice, basis);
    const purchaseValue = Number(costContribution.toFixed(2));
    const sellingValue = Number((quantity * sellingPrice).toFixed(2));

    countedItems.push({
      productName: trimmedName,
      quantity,
      unit,
      costPrice,
      sellingPrice,
      // [FR-89–FR-94, Implementation Authorization §10, Option C]
      // row.sellingPriceBasisUnit is only ever set on a row whose price
      // came from a deliberate entry or an FR-89 auto-resolution — both
      // already denominate it correctly; a row with neither (e.g. a
      // blank/never-priced row) falls back to `unit` here, matching
      // every other consumer's own identical fallback. Always resolves
      // to a defined string — never conditionally omitted.
      sellingPriceBasisUnit: row.sellingPriceBasisUnit ?? unit,
      purchaseValue,
      sellingValue,
      // [§44 — Periodic Contagem Cost-Price Removal, FR-73; Rule 8
      // Finding 3] See StockCountTallyItem's own comment, above.
      costBasisEstablished,
      // [Decision 40 — Validar Workflow, FR-N11] UI-only identity/
      // status, read directly from this same row — see
      // StockCountTallyItem's own comment for why neither of these
      // ever reaches recordStockCount.
      productId: row.productId,
      manualRowIndex: row.manualRowIndex,
      validated: row.validated === true,
      // [Implementation Authorization §14 item 6] See
      // StockCountTallyItem's own comment, above — mirrors the source
      // row verbatim, working-preview-only.
      sellingPriceAutoFilled: row.sellingPriceAutoFilled,
    });

    totalPhysicalUnits += quantity;
    totalPurchaseValue += purchaseValue;
    totalSellingValue += sellingValue;
  }

  return {
    countedItems,
    notCountedProductNames,
    totalPhysicalUnits: Number(totalPhysicalUnits.toFixed(2)),
    totalPurchaseValue: Number(totalPurchaseValue.toFixed(2)),
    totalSellingValue: Number(totalSellingValue.toFixed(2)),
  };
}

// ------------------------------------------------------------------
// [Stock Count Data-Loss Resilience — Implementation Task, Section 6]
// Working-row <-> persisted-draft-item conversion — pure, dependency-
// free (no Firestore, no React), same reasoning as this file's own
// tallyStockCountRows/normalizeStockCountItems above: the property that
// actually matters ("a blank quantity is never coerced to zero, and a
// zero quantity is never coerced to blank, anywhere in the draft-save/
// recovery path" — frozen spec §14 item 4) lives entirely in this JS
// transformation layer, not in Firestore itself (which stores strings
// faithfully, with no numeric coercion of its own) — so this is the
// correct, and only necessary, place to prove that property, without
// needing a live Firestore/emulator dependency for this specific
// concern. Used by PeriodicStockCountView's autosave/resume path.
// ------------------------------------------------------------------

/** Converts a working row to its Firestore-safe persisted shape.
 * Optional fields are omitted entirely when absent, never written as
 * literal `undefined` (Firestore rejects that — matches
 * savePurchaseDraft's own documented fix, AppContext.tsx, for this
 * exact class of bug). `quantity` is passed through as the exact
 * string the operator typed (including '', which is the only
 * representation of "not yet counted") — never parsed, coerced, or
 * defaulted here. */
export function workingRowToDraftItem(row: StockCountWorkingRow): {
  productId?: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  removed?: boolean;
  validated?: boolean;
  sellingPriceAutoFilled?: boolean;
  sellingPriceBasisUnit?: string;
  sellingPriceEditSequence?: number;
  entrySequence?: number;
} {
  return {
    ...(row.productId ? { productId: row.productId } : {}),
    productName: row.productName,
    quantity: row.quantity,
    unit: row.unit,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    ...(row.removed !== undefined ? { removed: row.removed } : {}),
    // [Decision 40 — Validar Workflow, FR-N7] Round-tripped exactly
    // like `removed`, immediately above — omitted entirely when
    // absent, never written as literal `undefined`. This one line is
    // what makes every existing Decision 39 autosave/flush trigger
    // (per-row 800ms timer, interruption flush, SPA unmount flush)
    // include the current validated state automatically, with no
    // change to any of those mechanisms themselves.
    ...(row.validated !== undefined ? { validated: row.validated } : {}),
    // [FR-89–FR-94, Implementation Authorization §2 item 2] Same
    // omit-when-absent discipline as `removed`/`validated`, above —
    // this is what makes the default-vs-deliberate distinction, and
    // the edit-sequence ordering, survive an interrupted/resumed
    // Contagem session.
    ...(row.sellingPriceAutoFilled !== undefined ? { sellingPriceAutoFilled: row.sellingPriceAutoFilled } : {}),
    ...(row.sellingPriceBasisUnit ? { sellingPriceBasisUnit: row.sellingPriceBasisUnit } : {}),
    ...(row.sellingPriceEditSequence !== undefined ? { sellingPriceEditSequence: row.sellingPriceEditSequence } : {}),
    // [Periodic Contagem Entry-Order Sort Mode — Implementation
    // Authorization §1 item 2] Same omit-when-absent discipline as
    // every other optional field above — never written as literal
    // `undefined`, and this one line is what makes the existing
    // Decision 39 autosave/flush triggers include it automatically,
    // with no change to any of those mechanisms.
    ...(row.entrySequence !== undefined ? { entrySequence: row.entrySequence } : {}),
  };
}

/** The exact inverse of workingRowToDraftItem — used when resuming a
 * recovered draft. `quantity` (and every other string field) is copied
 * through verbatim, never re-parsed or re-coerced; this is what
 * guarantees a recovered '' round-trips back to '' (Not Counted) and a
 * recovered '0' round-trips back to '0' (Counted, physically zero),
 * never crossing into the other's meaning. */
export function draftItemToWorkingRow(item: {
  productId?: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  removed?: boolean;
  validated?: boolean;
  sellingPriceAutoFilled?: boolean;
  sellingPriceBasisUnit?: string;
  sellingPriceEditSequence?: number;
  entrySequence?: number;
}): StockCountWorkingRow {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    removed: item.removed,
    // [Decision 40 — Validar Workflow, FR-N7] A legacy item written
    // before this field existed simply lacks it — copied through as
    // `undefined` here, exactly like `removed` already is above, and
    // treated as "not validated" by every filter that reads it
    // (falsy-safe, never requiring an explicit `false`).
    validated: item.validated,
    // [FR-89–FR-94, Implementation Authorization §2 item 2] Same
    // verbatim-copy-through discipline as `validated`, above — a
    // legacy draft item written before this capability existed simply
    // lacks these three fields, copied through as `undefined`/absent,
    // which every reader already treats as "not deliberate" (never as
    // "deliberate").
    sellingPriceAutoFilled: item.sellingPriceAutoFilled,
    sellingPriceBasisUnit: item.sellingPriceBasisUnit,
    sellingPriceEditSequence: item.sellingPriceEditSequence,
    // [Periodic Contagem Entry-Order Sort Mode — Implementation
    // Authorization §1 item 2, §3 criterion 2/5] Verbatim copy-through
    // — a legacy draft item written before this feature existed simply
    // lacks it, copied through as `undefined`, never fabricated.
    entrySequence: item.entrySequence,
  };
}
