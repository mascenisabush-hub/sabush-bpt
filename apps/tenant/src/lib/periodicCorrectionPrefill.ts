// SABUSH BPT — Business Worth correction / SuperAdmin recovery: re-opens the
// confirmed Contagem that produced the latest snapshot, pre-filling the rows
// from that count's saved items. Extracted from PeriodicStockCountView so it
// can be tested against the value the count was confirmed with.
import type { StockCountItem } from '../types';
import type { StockCountWorkingRow } from '../utils/stockCount';

export interface CorrectionPrefillResult {
  catalogRows: Record<string, StockCountWorkingRow>;
  extraManualRows: StockCountWorkingRow[];
  missingCount: number;
  originalOrder: Record<string, number>;
}

// [Bug fix — Owner-reported, 2026-09-29: "after re-opening for correction
// the total is different from the confirmed value"] Every pre-filled row
// now reproduces the confirmed count EXACTLY:
//  • its price keeps the unit it was confirmed in (sellingPriceBasisUnit
//    from the saved item) — it used to inherit the catalog row's basis,
//    so e.g. "1 200 per Cx" became "1 200 per Un";
//  • its price is marked deliberate (sellingPriceAutoFilled: false), so it
//    is never re-derived from the product's CURRENT price/reference — the
//    correction starts from what was confirmed, not from today's prices;
//  • it is validated (with its original order as entrySequence): it was
//    validated when confirmed, so it counts in the live total at once —
//    the re-opened count starts at the confirmed value;
//  • extra portions of the same product keep their productId and get a
//    stable row key, like every other row.
export function buildCorrectionPrefill(
  items: StockCountItem[],
  catalogRows: Record<string, StockCountWorkingRow>,
  makeManualRowKey: () => string
): CorrectionPrefillResult {
  const next = { ...catalogRows };
  const claimedThisPass = new Set<string>();
  const originalOrder: Record<string, number> = {};
  const overflowItems: StockCountItem[] = [];
  let missingCount = 0;
  items.forEach((item, index) => {
    originalOrder[item.productId] = index;
    if (!item.productName || !item.productName.trim()) {
      missingCount += 1;
      return;
    }
    const existing = !claimedThisPass.has(item.productId) ? next[item.productId] : undefined;
    if (!existing) {
      overflowItems.push(item);
      return;
    }
    claimedThisPass.add(item.productId);
    const unit = item.unit || existing.unit;
    next[item.productId] = {
      ...existing,
      quantity: String(item.quantity),
      unit,
      costPrice: String(item.costPrice),
      sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : existing.sellingPrice,
      sellingPriceBasisUnit: item.sellingPrice != null ? item.sellingPriceBasisUnit ?? unit : existing.sellingPriceBasisUnit,
      sellingPriceAutoFilled: false,
      removed: false,
      validated: true,
      entrySequence: index + 1,
    };
  });
  const orderOf = new Map(items.map((item, index) => [item, index]));
  const extraManualRows = overflowItems.map(
    (item): StockCountWorkingRow => ({
      productId: item.productId || undefined,
      productName: item.productName,
      quantity: String(item.quantity),
      unit: item.unit || 'un',
      costPrice: String(item.costPrice),
      sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : '',
      sellingPriceAutoFilled: false,
      sellingPriceBasisUnit: item.sellingPriceBasisUnit ?? (item.unit || 'un'),
      sourceRowKey: makeManualRowKey(),
      validated: true,
      entrySequence: (orderOf.get(item) ?? 0) + 1,
    })
  );
  return { catalogRows: next, extraManualRows, missingCount, originalOrder };
}
