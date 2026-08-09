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
}

export interface NormalizedStockCountItem {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
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
    const itemTotal = Number((quantity * costPrice).toFixed(2));
    totalValue += itemTotal;

    normalized.push({
      productName: trimmedName,
      quantity,
      unit: raw.unit ? raw.unit.trim() : 'un',
      costPrice,
      totalValue: itemTotal,
    });
  }

  return { items: normalized, totalValue: Number(totalValue.toFixed(2)) };
}
