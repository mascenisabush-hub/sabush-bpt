// Business Worth Evolution — Increment 10 Item 5 ("Contagem Cost-Basis
// Conversion") + Post-Implementation Correction §25 ("Contagem
// Cost-Price Zero-Fallback Removal"). Authorized by
// docs/engineering/business-worth-evolution-implementation-authorization.md
// §22 item 5, §23 item 5, §25 (signed 23 August 2026); Specification
// §15/FR-67; Implementation Plan Amendment, "PART A — Contagem
// Cost-Basis Conversion." Product Architect resolution on the
// authoritative cost-basis source and the multi-portion aggregate rule,
// 24 August 2026.
//
// SINGLE SHARED, PURE HELPER — used by BOTH tallyStockCountRows
// (Owner-facing preview, utils/stockCount.ts) and
// normalizeStockCountItems (persisted totalValue, same file), per the
// Product Architect's explicit instruction: "The Owner-facing preview
// and persisted Contagem must never disagree." Neither call site
// re-implements this arithmetic independently.
//
// AUTHORITATIVE COST BASIS (Product Architect resolution): there is ONE
// original cost basis per product —
//
//     Product.costPrice  (the original purchase cost)
//         +
//     Product.unitRelationship.units[0].unit  (the original purchase
//     unit)
//
// NEVER the latest StockBatch.costPrice (which may be priced in a
// different unit than the purchase unit, and is only ever a UI
// pre-fill convenience — see PeriodicStockCountView.tsx's own
// buildCatalogRow comment) and NEVER redefined by whatever costPrice
// happens to be showing in the current Contagem's own purchase-unit
// row. This module never reads a StockBatch and never reads a row's
// own costPrice for the governed case below — the caller resolves
// `ProductCostBasis` from Product-level data (or the equivalent
// first-time-entry panel state for a genuinely new product) and passes
// it in; this module performs no such resolution itself, by design
// (mirrors every pure sibling in this directory — no Firestore, no
// product-ID resolution, no React).
//
// GOVERNED CASE (FR-67's own named condition, Authorization §25): a
// unitRelationship confirmed for the product, and a valid, non-negative
// Product.costPrice. Per the Product Architect's resolution, this
// module derives EVERY portion's contribution from this ONE basis —
// including the purchase-unit portion itself (factor 1, its own
// quantity unchanged) — rather than trusting that portion's own raw
// costPrice input, which is exactly the "do not let the current
// Contagem row redefine the product's original cost basis" instruction.
// The FR-67 aggregate rule ("2 CX + 3 EMB + 5 UN, 1 CX = 4 EMB = 24 UN,
// 1,250 MZN/CX -> 3,697.92 MZN") is mathematically identical whether
// computed as one product-level sum of purchase-unit-equivalent
// quantities times purchaseCost, or as this function's own per-portion
// contribution summed by the caller — the two are the same sum by
// simple distributivity, and per-portion is what composes cleanly with
// both call sites' existing per-row/per-item accumulation loops.
//
// FALLBACK (§25's own exact, unchanged behavior — never a second,
// invented fallback policy): no valid cost basis for the product
// (missing/invalid Product.costPrice, missing/invalid/unconfirmed
// unitRelationship), or a portion whose unit is genuinely outside the
// confirmed chain (getConversionFactor returns null, exactly its own
// documented null-handling contract) — cost is NOT derived; the
// caller's own raw, already-coerced costPrice is used exactly as
// before this correction, including its existing zero-coercion for a
// genuinely blank manual entry.
//
// WHAT THIS FILE DOES NOT DO:
//   - Never mutates, stores, or returns a synthetic per-portion
//     costPrice — only a currency VALUE (this portion's own
//     contribution to its product's Total Cost Value). Data Storage
//     Rule: no per-EMB/per-UN cost is ever calculated, stored, or
//     displayed anywhere from this module's output.
//   - Never touches sellingPrice, totalSellingValue,
//     productValuationTotal, or measuredBusinessWorth — Contagem's
//     selling-basis valuation path is completely untouched by this
//     file and by both call sites' use of it.
//   - Never reimplements unit conversion — reuses getConversionFactor
//     (purchaseToSellingConversion.ts) exclusively, the SAME
//     authoritative engine contagemMultiUnitValuation.ts (Mode A)
//     already reuses for the selling side. Never fabricates a
//     conversion factor.
//   - Never rounds internally. The caller rounds exactly once, at the
//     same point each already rounds today (matches this capability's
//     established "one rounding step, at the currency total, not two"
//     discipline — contagemMultiUnitValuation.ts's own comment).

import type { Product, UnitRelationship } from '../types';
import { getConversionFactor } from './purchaseToSellingConversion';
import { isValidUnitRelationship } from './unitRelationship';

/**
 * One product's authoritative original cost basis. Resolved by the
 * CALLER — PeriodicStockCountView.tsx (preview) or AppContext.tsx
 * (persistence) — from Product.costPrice + Product.unitRelationship
 * for an already-catalogued product, or from the equivalent B.1/B.2
 * first-time-entry panel state for a genuinely new product being
 * entered in this same Contagem. This module resolves none of this
 * itself and never reads a StockBatch.
 */
export interface ProductCostBasis {
  /** Product.unitRelationship.units[0].unit — the ONE original
   * purchase unit. */
  purchaseUnit: string;
  /** Product.costPrice — the ONE original purchase cost, expressed in
   * purchaseUnit terms (e.g. 1,250 MZN per CX). */
  purchaseCost: number;
  /** The product's confirmed relationship chain, reused unmodified.
   * Re-validated internally via isValidUnitRelationship — never
   * trusted merely because the caller supplied it. */
  relationship: UnitRelationship | null | undefined;
}

/** One portion's derived contribution to its product's Total Cost
 * Value, and whether it was FR-67-derived or fell back to the raw
 * entered cost (§25's own unchanged behavior). `derived` is exposed
 * for callers/tests that need to distinguish the two paths (e.g. the
 * "no synthetic per-portion costPrice is written" test) — it carries
 * no meaning of its own beyond that. */
export interface CostContributionResult {
  value: number;
  derived: boolean;
}

/**
 * Derives ONE portion's contribution to its product's Total Cost
 * Value — the single shared FR-67 + §25 calculation both
 * tallyStockCountRows and normalizeStockCountItems call, so the
 * Owner-facing preview and the persisted Contagem can never disagree.
 *
 * `quantity`/`unit` are this specific portion's own physical count and
 * unit label — never altered here. `rawCostPrice` is the caller's own
 * already-coerced manual entry (i.e. already `Number(x) || 0`) — used
 * only as the §25 fallback value, never as an input to the governed
 * derivation itself (the governed derivation reads ONLY `basis`).
 */
export function deriveCostContribution(
  quantity: number,
  unit: string,
  rawCostPrice: number,
  basis: ProductCostBasis | null | undefined
): CostContributionResult {
  const trimmedUnit = unit.trim();
  const trimmedPurchaseUnit = basis?.purchaseUnit.trim() ?? '';

  const hasValidBasis =
    !!basis &&
    trimmedPurchaseUnit !== '' &&
    Number.isFinite(basis.purchaseCost) &&
    basis.purchaseCost >= 0 &&
    isValidUnitRelationship(basis.relationship) &&
    // Sanity check: the supplied purchaseUnit must actually BE the
    // relationship's own units[0] — this module never trusts a
    // caller-asserted purchaseUnit that disagrees with the
    // relationship it was paired with; it never silently reconciles
    // the two, it simply treats a mismatched basis as invalid (falls
    // through to §25's own fallback below).
    basis!.relationship!.units[0]?.unit?.trim().toLowerCase() === trimmedPurchaseUnit.toLowerCase();

  if (hasValidBasis && trimmedUnit) {
    const factor = getConversionFactor(basis!.relationship, trimmedPurchaseUnit, trimmedUnit);
    if (factor !== null) {
      // factor = "one purchaseUnit equals `factor` of unit"
      // (getConversionFactor's own documented meaning) — so a
      // quantity of `unit` equals quantity/factor of purchaseUnit.
      const equivalentPurchaseUnitQuantity = quantity / factor;
      return { value: equivalentPurchaseUnitQuantity * basis!.purchaseCost, derived: true };
    }
    // factor === null: unit genuinely outside the confirmed chain —
    // §25's own exact fallback, never a fabricated factor.
  }

  return { value: quantity * rawCostPrice, derived: false };
}

/**
 * Resolves a `costBasisByProductName` lookup (the parameter both
 * tallyStockCountRows and normalizeStockCountItems accept) from a list
 * of catalog Products — the authoritative source, per the Product
 * Architect's resolution (Product.costPrice +
 * Product.unitRelationship.units[0].unit).
 *
 * Used by BOTH call sites (PeriodicStockCountView.tsx for the
 * Owner-facing preview, AppContext.tsx's recordStockCount for
 * persistence) so the exact same resolution logic runs in both places
 * — not merely the same downstream arithmetic — closing off any way
 * the two could drift apart from each other.
 *
 * A product with no confirmed `unitRelationship`, or no valid
 * non-negative `costPrice`, is simply absent from the returned map —
 * never an entry with a fabricated/zero cost basis. This is also what
 * makes a genuinely new product (not yet in the `products` list at
 * all, since it does not exist as a Product record until this same
 * Contagem's own confirmation creates it) fall through to §25's
 * unchanged fallback automatically, with no separate new-product
 * branch needed anywhere that calls this function.
 */
export function buildProductCostBasisMap(
  products: Pick<Product, 'name' | 'costPrice' | 'unitRelationship'>[]
): Map<string, ProductCostBasis> {
  const map = new Map<string, ProductCostBasis>();
  for (const product of products) {
    const relationship = product.unitRelationship;
    if (
      !relationship ||
      !isValidUnitRelationship(relationship) ||
      typeof product.costPrice !== 'number' ||
      !Number.isFinite(product.costPrice) ||
      product.costPrice < 0
    ) {
      continue;
    }
    const purchaseUnit = relationship.units[0]?.unit?.trim();
    const key = product.name.trim().toLowerCase();
    if (!purchaseUnit || !key) continue;
    map.set(key, { purchaseUnit, purchaseCost: product.costPrice, relationship });
  }
  return map;
}
