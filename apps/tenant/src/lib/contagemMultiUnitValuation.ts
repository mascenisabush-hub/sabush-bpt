// Business Worth Evolution — Increment 4: Multi-Unit Valuation (Mode A/B).
// Authorized by docs/engineering/business-worth-evolution-implementation-authorization.md,
// scoped strictly to Increment 4 (docs/engineering/business-worth-evolution-implementation-plan.md
// §20, §24 item 4). Governing chain: BDR-pending-business-worth-evolution-
// measurement-model.md Decision 7, POL-0010 CON-4/CON-5, the Consolidated
// Specification §15 (docs/specs/business-worth-evolution-specification.md),
// FR-20-FR-23, and product-unit-of-measure-specification.md §4's existing
// "combine to units[0]" reference-unit convention for Periodic Contagem.
//
// DESIGN-PASS RESOLUTION OF RULE 8 OPEN QUESTION #1 (Specification §36 item
// 1; Implementation Plan §20's own "dedicated design pass at the start of
// Increment 4" note; Rule 8 Assessment Finding 7-A, classified resolvable
// without a new Product Architect decision):
//
//   Direct repository inspection (this Increment's own "before coding"
//   step) found that Contagem's ACTUAL, already-shipped valuation behavior
//   (normalizeStockCountItems, utils/stockCount.ts) already values every
//   counted portion at that portion's OWN independently-entered
//   sellingPrice, summed directly, with no conversion step anywhere in the
//   path — i.e. today's shipped behavior already IS Mode B (multiple
//   independently-set selling-unit prices, §15), applied unconditionally.
//   stockCountPortionGrouping.ts's own header comment independently
//   confirms this: "normalizeStockCountItems... already sums separate
//   same-product rows correctly today, with zero code change."
//
//   Mode A (a single selling-unit price applied uniformly across mixed
//   physical quantities, "internally converted for valuation," §15) is
//   therefore the genuinely new behavior this Increment adds — as an
//   OPTIONAL alternative the Owner may choose per product, never forced
//   (FR-20). The resolution below reuses the existing, authoritative
//   conversion engine this codebase already ships for exactly this kind of
//   arithmetic (getConversionFactor, purchaseToSellingConversion.ts,
//   Consolidated Specification §13) rather than inventing a second one
//   (this file's own "Implementation Discipline" instruction) — the SAME
//   Product.unitRelationship chain, the SAME units[0] reference point
//   product-unit-of-measure-specification.md §4 already fixes, and the
//   SAME cumulative-factor composition purchaseToSellingConversion.ts
//   already proves correct and tests.
//
//   Mechanically: the Owner enters ONE selling price, tied to ONE reference
//   unit (product-unit-of-measure-specification.md §4's own fixed
//   reference point, units[0], by default). For every physical portion
//   counted in a DIFFERENT unit, this module derives that portion's own
//   implied selling price by dividing the reference price by the chain's
//   existing conversion factor between the reference unit and that
//   portion's unit — never a fabricated 1:1 factor, and never invented
//   conversion arithmetic beyond what getConversionFactor already composes
//   from Product.unitRelationship.units[].factorFromPrevious. The derived
//   price is then multiplied by that portion's own OWN physical quantity,
//   exactly as Mode B already does — meaning this module produces ORDINARY
//   per-portion `sellingPrice` values that flow through the EXISTING,
//   UNMODIFIED normalizeStockCountItems/BusinessWorthSnapshot valuation
//   path with ZERO changes to that path. This is deliberate: "one
//   authoritative valuation path" (Implementation Discipline) — Mode A does
//   not introduce a second calculation of totalSellingValue/
//   productValuationTotal; it only computes WHAT PRICE goes into the
//   existing per-portion sellingPrice field before that existing path runs.
//
// WHAT THIS FILE DOES NOT DO (explicitly out of scope, matching every
// sibling file's own discipline):
//   - No Firestore reads/writes, no UI, no React — pure functions only,
//     mirroring unitRelationship.ts / purchaseToSellingConversion.ts.
//   - Does not alter how a physical quantity or its entered unit label is
//     stored or displayed anywhere (FR-21) — this file NEVER writes to
//     quantity or unit; it only computes a derived PRICE for a portion
//     whose quantity/unit the caller already has and does not change.
//   - Does not touch +Stock in any way (FR-22) — this module is Contagem-
//     specific, imported only by Periodic Contagem call sites.
//   - Does not overwrite an Owner-entered cost/selling price's unit label
//     with a converted equivalent in stored data (FR-23) — a derived Mode A
//     price is expressed AS a plain number in the portion's OWN unit terms
//     (e.g. "52.08 MZN per Un"), never re-labeled as a converted quantity
//     of some other unit.
//   - Does not invent a rounding scheme beyond what this codebase already
//     uses (product-unit-of-measure-specification.md §6; POL-0001/POL-0002) —
//     derived per-portion prices are kept at a display-appropriate
//     precision only; the actual currency total is rounded to 2 decimal
//     places exactly once, downstream, by normalizeStockCountItems' own
//     existing `.toFixed(2)` discipline — never rounded twice.

import type { UnitRelationship } from '../types';
import { getConversionFactor } from './purchaseToSellingConversion';

/** The two Contagem valuation modes the Consolidated Specification §15
 * fixes. 'B' (multiple independently-set selling-unit prices, each
 * applied to its own physical portion) is this codebase's existing,
 * unconditional, already-shipped behavior — the default whenever an Owner
 * has not explicitly chosen Mode A for a given product's portions in this
 * count (FR-20: "without forcing a choice the Owner has not made"). 'A'
 * (a single selling-unit price applied uniformly, internally converted)
 * is the new, explicitly-opted-into mode this Increment adds. */
export type ContagemValuationMode = 'A' | 'B';

/** One physical portion of a single product's Contagem entry — the exact
 * quantity/unit pair the Owner counted, unchanged by anything in this
 * file (FR-21). Deliberately minimal: this module needs nothing else to
 * derive a Mode A price for a portion. */
export interface ContagemPortionQuantity {
  /** Stable identifier the caller uses to re-associate a result with its
   * originating row (e.g. a working-row id) — never interpreted by this
   * module, only echoed back. */
  id: string;
  unit: string;
  quantity: number;
}

/** The result of deriving one portion's Mode A price. `derivedSellingPrice`
 * and `sellingValue` are `null` — never a fabricated factor of 1, never a
 * silently-substituted value — exactly when no conversion is possible:
 * an unconfirmed/invalid unitRelationship, or a portion/reference unit
 * that is not a member of the confirmed chain (product-unit-of-measure-
 * specification.md §4 Item 6's existing "warn-and-allow-entry" case,
 * mirrored here rather than duplicated with different behavior). A caller
 * MUST treat a `null` result exactly as that existing UOM convention
 * already requires elsewhere: fall back to Owner manual entry for that
 * specific portion (effectively Mode B for that one portion), never block
 * the whole count, never invent a value. */
export interface ContagemPortionValuation {
  id: string;
  unit: string;
  quantity: number;
  derivedSellingPrice: number | null;
  sellingValue: number | null;
}

/** Precision kept for a DERIVED per-unit price only (never for the final
 * currency total, which remains a plain 2-decimal-place value produced by
 * the existing, unmodified normalizeStockCountItems downstream) — chosen
 * so that composing quantity * derivedSellingPrice across a chain with a
 * large conversion factor (e.g. 1 Cx = 24 Un) does not itself introduce a
 * rounding error the existing 2-decimal-place currency rounding did not
 * already have. Matches this file's own header note on rounding
 * discipline: one rounding step, at the currency total, not two. */
const DERIVED_PRICE_PRECISION = 6;

/**
 * Derives every listed portion's own implied selling price and selling
 * value from ONE Owner-entered reference price tied to ONE reference unit
 * — Mode A's core arithmetic (Specification §15; this file's own header
 * comment for the full design-pass resolution).
 *
 * Reuses getConversionFactor (purchaseToSellingConversion.ts) as the
 * SINGLE authoritative conversion engine already proven correct for this
 * exact class of arithmetic (Consolidated Specification §13) — this
 * function performs no independent factor composition of its own.
 *
 * A portion whose unit equals the reference unit needs no conversion at
 * all (factor 1, exactly like getConversionFactor's own identity case) —
 * its derivedSellingPrice is simply referenceSellingPrice.
 *
 * Never mutates, reorders, or drops a portion — always returns exactly
 * one result per input portion, in the same order, preserving `id` so the
 * caller can write each result back onto its own originating row's
 * `sellingPrice` field without altering that row's quantity or unit
 * (FR-21).
 */
export function deriveModeAPortionValuations(
  portions: ContagemPortionQuantity[],
  referenceUnit: string,
  referenceSellingPrice: number,
  relationship: UnitRelationship | undefined | null
): ContagemPortionValuation[] {
  return portions.map((portion) => {
    // getConversionFactor already returns null for an invalid/unconfirmed
    // relationship or a unit outside the confirmed chain — this function
    // never re-derives or second-guesses that judgment (single
    // authoritative valuation path, Implementation Discipline).
    const factor = getConversionFactor(relationship, referenceUnit, portion.unit);

    if (factor === null || !Number.isFinite(referenceSellingPrice) || referenceSellingPrice < 0) {
      return {
        id: portion.id,
        unit: portion.unit,
        quantity: portion.quantity,
        derivedSellingPrice: null,
        sellingValue: null,
      };
    }

    // factor = "one referenceUnit equals `factor` of portion.unit"
    // (getConversionFactor's own documented meaning). A larger portion
    // unit therefore carries a smaller derived price, and vice versa —
    // e.g. reference 1,250 MZN/Cx, 1 Cx = 24 Un -> 52.083333 MZN/Un.
    const derivedSellingPrice = Number((referenceSellingPrice / factor).toFixed(DERIVED_PRICE_PRECISION));
    const sellingValue = Number((portion.quantity * derivedSellingPrice).toFixed(2));

    return {
      id: portion.id,
      unit: portion.unit,
      quantity: portion.quantity,
      derivedSellingPrice,
      sellingValue,
    };
  });
}

/**
 * Whether Mode A is even offerable for a given set of portions and
 * candidate reference unit — true only when every distinct unit among the
 * portions is a member of the confirmed chain (i.e. deriveModeAPortionValuations
 * would return a non-null result for all of them). Pure UI-affordance
 * helper: this function decides nothing about storage or valuation itself
 * and duplicates no arithmetic — it simply reports whether every portion
 * would successfully derive, using the identical getConversionFactor calls
 * deriveModeAPortionValuations itself makes; a caller that wants the
 * derived values calls that function directly rather than this one twice.
 */
export function canApplyModeA(
  portions: ContagemPortionQuantity[],
  referenceUnit: string,
  relationship: UnitRelationship | undefined | null
): boolean {
  if (!portions.length) return false;
  return portions.every((portion) => getConversionFactor(relationship, referenceUnit, portion.unit) !== null);
}

/**
 * Sums a set of already-derived Mode A portion valuations into the same
 * shape Mode B's own per-portion sums already produce (quantity and
 * sellingValue totals) — a small convenience for a caller building a
 * preview before committing derived prices back onto working rows. Does
 * NOT feed into, replace, or duplicate normalizeStockCountItems'/
 * AppContext.tsx's own totalSellingValue accumulation (that remains the
 * single authoritative total, computed once, downstream, from whatever
 * sellingPrice value each portion's row ends up carrying — Mode A's
 * derived price or Mode B's manually-entered one, indistinguishably, by
 * design). Returns `null` if ANY portion in the set failed to derive
 * (unconvertible unit) — a partial Mode A total would misrepresent the
 * product's real valuation, so this function never sums past a gap.
 */
export function sumModeAPortionValuations(valuations: ContagemPortionValuation[]): number | null {
  let total = 0;
  for (const v of valuations) {
    if (v.sellingValue === null) return null;
    total += v.sellingValue;
  }
  return Number(total.toFixed(2));
}
