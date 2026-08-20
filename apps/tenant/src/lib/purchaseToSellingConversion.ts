// Automatic Purchase-to-Selling Conversion — Increment B, Checkpoint B2.
//
// GOVERNANCE: implements exactly the Consolidated Specification's §13
// ("Automatic Purchase-to-Selling Conversion") — Concept C's ARITHMETIC
// only (docs/specs/product-memory-purchase-selling-valuation-specification.md
// §13), per Rule 8 Assessment Finding 2 ("the multi-hop composition
// itself... is pure arithmetic over Product.unitRelationship.units[]'s
// factorFromPrevious chain"). This file does NOT introduce
// `StockBatch.derivedSellingValuation`, does NOT write anything, and is
// NEVER read by `calculateBatch`/the Embedded Profit Engine/Business
// Worth — those remain Checkpoint B3/B4's scope (Finding 1, revised).
//
// SCOPE OF THIS FILE, EXACTLY: pure functions only — no Firestore, no
// UI, no batch-commit timing decision (Finding 2 leaves that to the
// caller). Mirrors unitRelationship.ts's own established pattern.
//
// CONVENTION (fixed by the accepted UOM Specification's own field name
// and worked example, product-unit-of-measure-specification.md §2):
// `units[i].factorFromPrevious` = how many `units[i]` make ONE unit of
// `units[i-1]` — i.e. it is a ratio against the IMMEDIATELY PRECEDING
// chain element, not against `units[0]` for i > 1. For the canonical
// chain `1 Cx = 4 Emb = 24 Un`: `units[1].factorFromPrevious` (Emb) is
// 4 ("1 Cx = 4 Emb"); `units[2].factorFromPrevious` (Un) is 6 ("1 Emb =
// 6 Un" — NOT 24, which is 1 Cx's own equivalent). Composing the chain
// (multiplying successive factorFromPrevious values from units[0]
// forward) yields the absolute "how many of THIS unit equal one
// units[0]" figure at every step — 1, 4, 24 for Cx, Emb, Un
// respectively — which is exactly BDR-0012's own worked numbers. This
// module treats that composition as the single source of truth for
// every conversion below; it never re-derives it ad hoc per call site.

import type { UnitRelationship, StockBatchDerivedSellingValuation } from '../types';
import { isValidUnitRelationship } from './unitRelationship';

/**
 * Cumulative "how many of units[i] equal ONE units[0]" for every index
 * in the chain, in order — the composed absolute factors the canonical
 * example expresses as 1, 4, 24 (Cx, Emb, Un). Internal helper; not
 * exported, since callers should go through getConversionFactor below,
 * which also validates the relationship and unit membership. Assumes
 * `relationship` is already known-valid (isValidUnitRelationship) —
 * callers of this internal helper are responsible for that check.
 */
function buildCumulativeFactors(relationship: UnitRelationship): number[] {
  const cumulative: number[] = [1]; // units[0] is its own reference point
  for (let i = 1; i < relationship.units.length; i++) {
    cumulative.push(cumulative[i - 1] * relationship.units[i].factorFromPrevious);
  }
  return cumulative;
}

/**
 * The multiplier to convert a quantity expressed in `fromUnit` into the
 * equivalent quantity expressed in `toUnit`, composed correctly across
 * any number of hops in `relationship`'s confirmed chain, in EITHER
 * direction (§13: "Cx → Emb, Cx → Un, Emb → Un, and the reverse
 * directions Un → Emb, Un → Cx" — arbitrary interior-to-interior pairs
 * work identically, not merely the four named in the Specification's
 * own worked example).
 *
 * `quantityInToUnit = quantityInFromUnit * getConversionFactor(...)`.
 *
 * Returns `null` — never a fabricated factor of 1, never an invented
 * number — whenever a derivation is genuinely not possible (§13: "If
 * there is no confirmed valid Product Memory relationship: do NOT
 * invent one, do NOT assume factor 1... A derived valuation must be
 * explicitly capable of representing 'no derivation possible'. This is
 * different from a factor of 1."):
 *   - `relationship` is missing or fails `isValidUnitRelationship`.
 *   - `fromUnit` or `toUnit` is not a member of `relationship.units[]`.
 *
 * `fromUnit === toUnit` correctly returns exactly `1` (purchase unit
 * equals selling unit is an ordinary, ordinary-case chain position, not
 * a special case requiring separate handling — §12).
 */
export function getConversionFactor(
  relationship: UnitRelationship | undefined | null,
  fromUnit: string,
  toUnit: string
): number | null {
  if (!isValidUnitRelationship(relationship)) return null;
  const rel = relationship as UnitRelationship;

  const fromIndex = rel.units.findIndex((u) => u.unit === fromUnit);
  const toIndex = rel.units.findIndex((u) => u.unit === toUnit);
  if (fromIndex === -1 || toIndex === -1) return null;

  const cumulative = buildCumulativeFactors(rel);
  // cumulative[i] = how many units[i] equal one units[0]. Converting
  // one fromUnit into toUnit terms: fromUnit is (cumulative[fromIndex])
  // units[0]-equivalents "small"; toUnit is (cumulative[toIndex])
  // units[0]-equivalents "small" — so one fromUnit equals
  // cumulative[toIndex] / cumulative[fromIndex] toUnits. This is
  // symmetric and correctly yields the exact reciprocal for the
  // reverse direction (e.g. 24 for Cx->Un, 1/24 for Un->Cx) without any
  // special-cased branch for which direction is being asked.
  return cumulative[toIndex] / cumulative[fromIndex];
}

/**
 * §13 Concept C's core frozen figure: "MZN implied selling value per
 * ONE unit of this batch's own purchase unit" — exactly what the Rule 8
 * Assessment's `StockBatch.derivedSellingValuation.ratePerPurchaseUnit`
 * (Finding 1, revised) will hold once Checkpoint B3 wires this in.
 * Deliberately returns the RATE, not an absolute quantity multiplied by
 * any specific transaction's own purchase quantity — composing that
 * final step is `deriveTransactionValuation`, below, and remains the
 * caller's job in B3/B4 so this function stays reusable for both a
 * live preview (Finding 2) and a frozen-at-commit write (Finding 1).
 *
 * Returns `null` under the same "no derivation possible" conditions as
 * `getConversionFactor` (relationship invalid, purchaseUnit or
 * sellingUnit not in the chain) — §13's explicit distinction from a
 * fabricated factor of 1.
 */
export function computeRatePerPurchaseUnit(
  relationship: UnitRelationship | undefined | null,
  purchaseUnit: string,
  sellingUnit: string,
  sellingUnitPrice: number
): number | null {
  const factor = getConversionFactor(relationship, purchaseUnit, sellingUnit);
  if (factor === null) return null;
  if (!Number.isFinite(sellingUnitPrice)) return null;
  return factor * sellingUnitPrice;
}

/** The three concepts kept strictly separate throughout §13 — this
 * result carries ONLY concept (C), the system-derived transaction
 * valuation. It is never itself concept (A) purchase facts or concept
 * (B) Product Memory, and nothing in this file writes to either. */
export interface DerivedTransactionValuation {
  ratePerPurchaseUnit: number; // MZN implied selling value per ONE purchase unit
  impliedSellingValue: number; // ratePerPurchaseUnit * purchaseQuantity — this transaction's full implied selling value
  cost: number; // purchaseQuantity * purchaseCostPerPurchaseUnit — restated here for the worked embeddedProfit figure only; never a substitute for, or write to, the batch's own costPrice
  embeddedProfit: number; // impliedSellingValue - cost
}

/**
 * The full §13 worked-example computation — "given [the purchase's] own
 * recorded quantity and unit (A) and the product's confirmed
 * relationship and remembered selling price (B), the system derives
 * what that purchase implies in selling terms and in profit terms."
 * Matches the Specification's own canonical numbers exactly:
 * `3 Cx @ 1,250 MZN/Cx`, `1 Cx = 24 Un`, `60 MZN/Un` ->
 * `ratePerPurchaseUnit = 1,440`, `impliedSellingValue = 4,320`,
 * `cost = 3,750`, `embeddedProfit = 570`.
 *
 * Returns `null` (never a fabricated figure) exactly when
 * `computeRatePerPurchaseUnit` would — no confirmed relationship, or
 * either unit missing from the chain — per §13's explicit
 * "no-derivation-possible" requirement, distinct from a fabricated
 * factor of 1.
 */
export function deriveTransactionValuation(input: {
  purchaseQuantity: number;
  purchaseUnit: string;
  purchaseCostPerPurchaseUnit: number;
  relationship: UnitRelationship | undefined | null;
  sellingUnit: string;
  sellingUnitPrice: number;
}): DerivedTransactionValuation | null {
  const { purchaseQuantity, purchaseUnit, purchaseCostPerPurchaseUnit, relationship, sellingUnit, sellingUnitPrice } =
    input;

  if (!Number.isFinite(purchaseQuantity) || !Number.isFinite(purchaseCostPerPurchaseUnit)) return null;

  const ratePerPurchaseUnit = computeRatePerPurchaseUnit(relationship, purchaseUnit, sellingUnit, sellingUnitPrice);
  if (ratePerPurchaseUnit === null) return null;

  const impliedSellingValue = purchaseQuantity * ratePerPurchaseUnit;
  const cost = purchaseQuantity * purchaseCostPerPurchaseUnit;
  const embeddedProfit = impliedSellingValue - cost;

  return { ratePerPurchaseUnit, impliedSellingValue, cost, embeddedProfit };
}

// ------------------------------------------------------------------
// Increment B, Checkpoint B3 — StockBatch.derivedSellingValuation
// snapshot builder (§13 storage, §14 freeze-at-commit-time, Rule 8
// Finding 1, revised).
// ------------------------------------------------------------------

/** The minimal shape this builder needs from a Product — deliberately
 * NOT `Product` itself, so this function has no dependency on the full
 * Product type and can be tested/called with a plain literal. */
export interface ProductMemorySnapshot {
  unitRelationship?: UnitRelationship;
  sellingPrice?: number;
}

/**
 * Builds the exact object to write, once, onto `StockBatch.derivedSellingValuation`
 * (Finding 1, revised's frozen structure) for a batch being recorded
 * RIGHT NOW, from whichever Product Memory is CURRENTLY confirmed for
 * its product and this batch's own recorded purchase unit.
 *
 * FREEZING (§14) IS ACHIEVED ENTIRELY BY CALL DISCIPLINE, NOT BY
 * ANYTHING THIS FUNCTION ITSELF DOES: this function is pure and
 * stateless — it has no notion of "before" or "after," reads no
 * Firestore document, and would happily recompute a different answer
 * if called again later with different `productMemory` input. The
 * freeze guarantee comes entirely from the CALLER (addMultipleStockBatches
 * in AppContext.tsx) invoking this function exactly ONCE, at the
 * moment a batch is committed, and then writing the returned object
 * onto that StockBatch document permanently — never calling this
 * function again for an already-recorded batch, and never re-deriving
 * from current Product Memory at read/display time. This mirrors
 * exactly how `costPrice`'s own immutability (BDR-0012 Decisions
 * 15-16) already works in this codebase: nothing about the FIELD
 * itself is special; the discipline lives entirely in when and how
 * often it is written.
 *
 * Returns `undefined` — never a fabricated valuation, never a factor of
 * 1 — whenever:
 *   - `productMemory` is absent entirely (brand-new product, no
 *     Product Memory confirmed yet at all).
 *   - `productMemory.unitRelationship` fails `isValidUnitRelationship`
 *     (no confirmed chain, or a confirmed chain with no selling unit
 *     set — POL-0005's minimum-configuration threshold not yet met).
 *   - `productMemory.sellingPrice` is missing or not a finite number
 *     (Product Memory's remembered selling price not yet set).
 *   - `purchaseUnit` is not a member of the confirmed chain.
 * Every one of these is the ordinary, fully anticipated "no confirmed
 * Product Memory (yet)" case (BDR-0012 §5.A Item 6) — never an error,
 * and the caller's ordinary warn-not-block, manual-entry behavior for
 * `costPrice`/`sellingPrice` is completely unaffected either way.
 */
export function buildDerivedSellingValuationSnapshot(
  productMemory: ProductMemorySnapshot | undefined,
  purchaseUnit: string,
  derivedAt: string = new Date().toISOString()
): StockBatchDerivedSellingValuation | undefined {
  if (!productMemory) return undefined;

  const relationship = productMemory.unitRelationship;
  if (!isValidUnitRelationship(relationship)) return undefined;
  const validRelationship = relationship as UnitRelationship;

  const sellingUnit = validRelationship.sellingUnit;
  if (!sellingUnit) return undefined;

  const sellingUnitPrice = productMemory.sellingPrice;
  if (typeof sellingUnitPrice !== 'number' || !Number.isFinite(sellingUnitPrice)) return undefined;

  const ratePerPurchaseUnit = computeRatePerPurchaseUnit(validRelationship, purchaseUnit, sellingUnit, sellingUnitPrice);
  if (ratePerPurchaseUnit === null) return undefined;

  return {
    ratePerPurchaseUnit,
    sellingUnit,
    sellingUnitPrice,
    // Deep-copied plain objects, never a live reference into
    // `validRelationship.units` — this snapshot must survive
    // completely unaffected if the caller's own `productMemory` object
    // (or the live Product document it came from) is later mutated.
    unitRelationshipSnapshot: validRelationship.units.map((u) => ({ unit: u.unit, factorFromPrevious: u.factorFromPrevious })),
    derivedAt,
  };
}
