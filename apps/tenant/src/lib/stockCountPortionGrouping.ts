// Stock Count Multi-Portion Grouping — Increment B, Checkpoint B5 (§16).
//
// GOVERNANCE: implements the presentation-layer requirement Rule 8
// Finding 4 identifies as the ONLY genuinely new work §16 requires —
// "the owner-facing UI must make clear that two rows sharing a product
// name are being treated as portions of one physical count for that
// product, not flagged as an accidental duplicate entry." No schema
// change; no new valuation logic. This file computes ONLY a display
// label, never anything that feeds a totalValue/costPrice calculation
// — normalizeStockCountItems (utils/stockCount.ts) already sums
// separate same-product rows correctly today, with zero code change
// (Rule 8 Finding 4), and remains completely untouched by this file.
// Applies identically to Initial Stock (Checkpoint B5) and Periodic
// Contagem (Checkpoint B6) — both surfaces share the identical flat,
// unmerged per-row data model this file's own grouping logic assumes.
//
// Deliberately NOT product-duplicate detection (POL-0003): that
// mechanism operates across DIFFERENT Product documents/catalog
// entries via supplier-wording candidate detection, which has no
// presence in Initial Stock or Periodic Contagem at all (Consolidated
// Specification §6 — "Trigger surfaces: Add Stock and Smart Stock
// Entry only"). This file's grouping is purely about MULTIPLE ROWS FOR
// THE SAME ALREADY-TYPED PRODUCT NAME within one count draft — a
// completely different situation. This module has no ability to flag,
// warn about, or block anything; it only computes a display label.

export interface PortionGroupableRow {
  id: string;
  productName: string;
}

export interface PortionLabel {
  /** True when 2+ rows in the input share this row's (trimmed,
   * case-insensitive) product name — i.e. this row is one portion of a
   * multi-portion count for that product, not a standalone entry. */
  isMultiPortion: boolean;
  /** 1-based position of this row among same-named rows, in their
   * original relative order — e.g. "Portion 1 of 2". Always 1 for a
   * row with no same-named siblings. */
  portionIndex: number;
  /** Total number of rows (including this one) sharing this row's
   * product name. Always 1 for a row with no same-named siblings. */
  portionCount: number;
}

/**
 * Computes, for every row in `rows`, whether it shares its (trimmed,
 * case-insensitive) product name with one or more OTHER rows in the
 * same list, and its 1-based position among them.
 *
 * Blank-name rows are never grouped with each other or with anything
 * else (each gets its own singleton `{isMultiPortion: false, portionIndex: 1, portionCount: 1}`)
 * — an empty product name isn't "the same product" as another empty
 * product name; it simply hasn't been identified yet.
 *
 * Pure, stateless, no dependency on Product/catalog data — this is a
 * WITHIN-THIS-DRAFT grouping only, entirely separate from whether any
 * of these names match an existing catalog Product
 * (isGenuinelyNewProductName, InitialStockCountView.tsx/
 * PeriodicStockCountView.tsx) or would trigger supplier-wording
 * candidate detection (which never runs on either surface at all, §6).
 */
export function computePortionLabels<T extends PortionGroupableRow>(rows: T[]): Map<string, PortionLabel> {
  const labels = new Map<string, PortionLabel>();
  const countsByName = new Map<string, number>();
  const seenIndexByName = new Map<string, number>();

  for (const row of rows) {
    const key = row.productName.trim().toLowerCase();
    if (!key) continue; // blank names are never grouped with anything
    countsByName.set(key, (countsByName.get(key) ?? 0) + 1);
  }

  for (const row of rows) {
    const key = row.productName.trim().toLowerCase();
    if (!key) {
      labels.set(row.id, { isMultiPortion: false, portionIndex: 1, portionCount: 1 });
      continue;
    }
    const portionCount = countsByName.get(key) ?? 1;
    const nextIndex = (seenIndexByName.get(key) ?? 0) + 1;
    seenIndexByName.set(key, nextIndex);
    labels.set(row.id, {
      isMultiPortion: portionCount > 1,
      portionIndex: nextIndex,
      portionCount,
    });
  }

  return labels;
}
