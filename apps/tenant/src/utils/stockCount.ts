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

export interface StockCountInputItem {
  productName: string;
  quantity: number | string;
  unit?: string;
  costPrice: number | string;
  // Optional so callers/tests written before this field existed keep
  // compiling and behaving the same way — missing/invalid input
  // coerces to 0, matching costPrice's own `Number(x) || 0` rule.
  sellingPrice?: number | string;
}

export interface NormalizedStockCountItem {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  totalValue: number;
}

export interface NormalizeStockCountItemsResult {
  items: NormalizedStockCountItem[];
  totalValue: number;
}

/**
 * Normalizes raw Stock Count input rows into the exact shape persisted
 * on a StockCount document (minus productId, which requires a
 * Firestore-backed product lookup/creation and is resolved separately
 * in AppContext.tsx). Blank product names are dropped; quantity/cost
 * are coerced to numbers (invalid input becomes 0, matching
 * recordStockCount's existing `Number(x) || 0` behavior).
 */
export function normalizeStockCountItems(items: StockCountInputItem[]): NormalizeStockCountItemsResult {
  const normalized: NormalizedStockCountItem[] = [];
  let totalValue = 0;

  for (const raw of items) {
    const trimmedName = raw.productName.trim();
    if (!trimmedName) continue;

    const quantity = Number(raw.quantity) || 0;
    const costPrice = Number(raw.costPrice) || 0;
    // sellingPrice is additional information only — it never
    // participates in totalValue, which stays quantity * costPrice
    // (the investment basis), matching Expected Current Stock Value's
    // existing cost-based rule.
    const sellingPrice = Number(raw.sellingPrice) || 0;
    const itemTotal = Number((quantity * costPrice).toFixed(2));
    totalValue += itemTotal;

    normalized.push({
      productName: trimmedName,
      quantity,
      unit: raw.unit ? raw.unit.trim() : 'un',
      costPrice,
      sellingPrice,
      totalValue: itemTotal,
    });
  }

  return { items: normalized, totalValue: Number(totalValue.toFixed(2)) };
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
  newProductSellingUnit?: string;
  newProductSellingUnitFactor?: string;
}

export interface StockCountTallyItem {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  purchaseValue: number; // quantity * costPrice
  sellingValue: number; // quantity * sellingPrice
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
export function tallyStockCountRows(rows: StockCountWorkingRow[]): StockCountTallyResult {
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
    const costPrice = Number(row.costPrice) || 0;
    const sellingPrice = Number(row.sellingPrice) || 0;
    const purchaseValue = Number((quantity * costPrice).toFixed(2));
    const sellingValue = Number((quantity * sellingPrice).toFixed(2));

    countedItems.push({
      productName: trimmedName,
      quantity,
      unit: row.unit.trim() || 'un',
      costPrice,
      sellingPrice,
      purchaseValue,
      sellingValue,
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
} {
  return {
    ...(row.productId ? { productId: row.productId } : {}),
    productName: row.productName,
    quantity: row.quantity,
    unit: row.unit,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    ...(row.removed !== undefined ? { removed: row.removed } : {}),
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
}): StockCountWorkingRow {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    removed: item.removed,
  };
}
