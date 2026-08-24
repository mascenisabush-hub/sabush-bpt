// [Fix — remembered price silently reused across a genuine unit change]
// Add Stock's Product Memory prefill (manual selection AND Smart Stock
// Entry / receipt scanning, AddStockView.tsx) reuses a product's
// remembered (price, unit) pair from its latest StockBatch. Historically
// that remembered price was reassigned onto whatever unit a new row
// ended up using WITHOUT checking the two units actually matched — a
// mismatch that can only arise when the row's own target unit is
// independently determined (Smart Stock Entry: the AI reads the unit
// exactly as it appears on the photographed receipt, which can
// genuinely, legitimately differ from the last purchase's own unit —
// e.g. bought by the Caixa this time instead of last time's Saco). A
// price denominated in one unit is simply wrong for a different unit;
// reusing it as-is silently proposed an incorrect cost/selling price
// with the same visual confidence as a correct one — exactly the
// "found vs. guessed" distinction BDR-0008 §1b (Smart Stock Entry:
// AI-Assisted, Human-Confirmed Data Capture) exists to protect, even
// though that BDR's own scope is specifically the AI extraction step,
// not this separate Product-Memory prefill step.
//
// Resolved here the same, single, already-authoritative way every OTHER
// unit conversion in this codebase does — the product's own CONFIRMED
// unitRelationship (Product Memory/UOM, established once via Contagem's
// or Initial Stock's "Configurar relação de unidades," then reused
// automatically forever after, BDR-0012 Decision 13) via
// getConversionFactor (purchaseToSellingConversion.ts) — never a second,
// independently-invented conversion.
//
// GOVERNANCE — never a fabricated factor:
//   - units already match (case/whitespace-insensitive, mirroring every
//     other unit-identity check in this codebase) → the remembered price
//     is reused completely unchanged (the fast, ordinary-case path,
//     byte-for-byte the historical behavior).
//   - units differ AND a valid relationship converts between them → the
//     remembered price is correctly rescaled.
//   - units differ and NO valid relationship exists to bridge them →
//     returns '' (never the stale, wrong-unit number) — the owner types
//     it once, the same existing "warn, never block, never invent"
//     discipline this codebase already applies everywhere a conversion
//     genuinely isn't possible (deriveCostContribution's own identical
//     fallback rule, fr67CostBasisConversion.ts).

import type { UnitRelationship } from '../types';
import { getConversionFactor } from './purchaseToSellingConversion';
import { isValidUnitRelationship } from './unitRelationship';

/**
 * Resolves a remembered per-unit price into the equivalent price for
 * `targetUnit`, via the product's own confirmed unitRelationship when
 * the two units differ. Returns a formatted string (matching every
 * other price field in this codebase's own `String(...)`/`.toFixed(2)`
 * convention) — or '' when no honest conversion is possible.
 */
export function resolveUnitAwarePrice(
  rememberedPrice: number,
  rememberedUnit: string,
  targetUnit: string,
  relationship: UnitRelationship | undefined
): string {
  const remembered = rememberedUnit.trim().toLowerCase();
  const target = targetUnit.trim().toLowerCase();
  if (!remembered || !target || remembered === target) {
    return String(rememberedPrice);
  }
  if (!isValidUnitRelationship(relationship)) return '';
  const factor = getConversionFactor(relationship, target, rememberedUnit);
  if (factor === null) return '';
  return (factor * rememberedPrice).toFixed(2);
}
