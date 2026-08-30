// [FR-89–FR-94 — Periodic Contagem Quantity-Unit / Selling-Unit
// Independence. Governed by docs/specs/periodic-contagem-quantity-selling-unit-independence-amendment.md
// (FR-89–FR-94), docs/engineering/periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md
// (Finding 7, §12 — Product-Architect-confirmed "last deliberately
// entered wins" rule), and docs/engineering/periodic-contagem-quantity-selling-unit-independence-implementation-plan.md
// §6.3 (✅ signed Implementation Authorization, 30 August 2026).]
//
// Extracted from AppContext.tsx's recordStockCount() — same reasoning
// as this codebase's other extracted, directly-testable pure-function
// precedents (fr67CostBasisConversion.ts, productMemoryPriceResolution.ts): a pure,
// dependency-free function is directly unit-testable without a live
// Firestore/emulator harness, which recordStockCount() itself (a large
// async Firestore-writing function) cannot be exercised through in this
// repository's existing test setup. This file performs no Firestore
// reads/writes, no UI, no React — pure functions only.
//
// Selects, once per product, the canonical selling price/unit to
// remember as durable Product Memory (§45/FR-83's own write authority,
// unchanged) when a Periodic Contagem is confirmed.
//
// [Confirmed Product Architect decision] When `workingRowDeliberateEntries`
// is supplied, the winner for each product is whichever DELIBERATELY
// entered configuration (sellingPriceAutoFilled === false) carries the
// HIGHEST sellingPriceEditSequence among that product's own candidates
// — "last deliberately entered wins," determined without reference to
// array order, row order, Map iteration order, or the product's own
// confirmed-selling-unit. That confirmed-unit preference is REMOVED
// from this path entirely, per the Product Architect's explicit
// confirmation that it must never override entry recency (Rule 8
// Assessment §12, points 4-5). A product with no deliberately-entered
// candidate at all (every physical quantity entry for it was still
// following the default) has NO entry in the returned Map — no memory
// write occurs for it (restates FR-84/FR-91: an ordinary, all-default
// count never silently overwrites the remembered configuration).
//
// [Backward compatibility] When `workingRowDeliberateEntries` is
// omitted/undefined, this falls back to exactly the PRE-FR-89–FR-94
// behavior, byte-for-byte unchanged: the first submitted portion for a
// product wins by default, and a later one denominated in the
// product's confirmed selling unit overrides it. This is the exact
// behavior every call site had before this capability existed, and
// remains what Initial Stock's own (unused) construction would produce
// if ever read — it never is, per the existing type !== 'initial'
// guard at both write sites.

export interface SellingMemorySelectionRawItem {
  productName: string;
  sellingPrice?: number;
  unit?: string;
}

export interface WorkingRowDeliberateEntry {
  productName: string;
  sellingPrice: number;
  unit: string;
  sellingPriceAutoFilled?: boolean;
  sellingPriceEditSequence?: number;
}

export interface SellingMemoryEntry {
  sellingPrice: number;
  sellingUnit?: string;
}

/**
 * Determines each product's confirmed-selling-unit, for the pre-FR-89
 * fallback tie-break only — mirrors exactly the lookup
 * recordStockCount() already performs (unitRelationshipByProductName
 * for a genuinely new product's own just-established chain, or the
 * existing Product's own already-confirmed unitRelationship.sellingUnit).
 * Passed in as a plain function so this module has zero dependency on
 * AppContext.tsx's own Product/tempProducts shapes.
 */
export type ConfirmedSellingUnitResolver = (productKey: string) => string | undefined;

export function selectSellingMemoryByProductName(
  items: SellingMemorySelectionRawItem[],
  resolveConfirmedSellingUnit: ConfirmedSellingUnitResolver,
  workingRowDeliberateEntries?: WorkingRowDeliberateEntry[]
): Map<string, SellingMemoryEntry> {
  const sellingMemoryByProductName = new Map<string, SellingMemoryEntry>();

  if (workingRowDeliberateEntries) {
    const bestSequenceByProductName = new Map<string, number>();
    for (const wr of workingRowDeliberateEntries) {
      // Only a genuinely deliberate entry participates — an absent or
      // `true` sellingPriceAutoFilled means "still following the
      // default," never a candidate for future memory.
      if (wr.sellingPriceAutoFilled !== false) continue;
      const key = wr.productName.trim().toLowerCase();
      if (!key || typeof wr.sellingPrice !== 'number' || !Number.isFinite(wr.sellingPrice) || wr.sellingPrice < 0) continue;
      const sequence = wr.sellingPriceEditSequence ?? -1;
      const bestSoFar = bestSequenceByProductName.get(key);
      if (bestSoFar === undefined || sequence > bestSoFar) {
        bestSequenceByProductName.set(key, sequence);
        sellingMemoryByProductName.set(key, { sellingPrice: wr.sellingPrice, sellingUnit: wr.unit.trim() || undefined });
      }
    }
    return sellingMemoryByProductName;
  }

  for (const raw of items) {
    const key = raw.productName.trim().toLowerCase();
    if (!key || typeof raw.sellingPrice !== 'number' || !Number.isFinite(raw.sellingPrice) || raw.sellingPrice < 0) continue;
    const rawUnit = (raw.unit ?? '').trim();
    const confirmedSellingUnit = resolveConfirmedSellingUnit(key);
    const current = sellingMemoryByProductName.get(key);
    const isPreferredUnit = !!confirmedSellingUnit && rawUnit.toLowerCase() === confirmedSellingUnit.trim().toLowerCase();
    if (!current || isPreferredUnit) {
      sellingMemoryByProductName.set(key, { sellingPrice: raw.sellingPrice, sellingUnit: rawUnit || confirmedSellingUnit });
    }
  }
  return sellingMemoryByProductName;
}
