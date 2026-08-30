// [Fix — remembered price silently reused across a genuine unit change]
// Add Stock's Product Memory prefill (manual selection AND Smart Stock
// Entry / receipt scanning, AddStockView.tsx) reuses a product's
// remembered (price, unit) pair from its history. Historically that
// remembered price was reassigned onto whatever unit a new row ended up
// using WITHOUT checking the two units actually matched — a mismatch
// that can only arise when the row's own target unit is independently
// determined (Smart Stock Entry: the AI reads the unit exactly as it
// appears on the photographed receipt, which can genuinely,
// legitimately differ from the last purchase's own unit — e.g. bought
// by the Caixa this time instead of last time's Saco). A price
// denominated in one unit is simply wrong for a different unit; reusing
// it as-is silently proposed an incorrect cost/selling price with the
// same visual confidence as a correct one — exactly the "found vs.
// guessed" distinction BDR-0008 §1b (Smart Stock Entry: AI-Assisted,
// Human-Confirmed Data Capture) exists to protect, even though that
// BDR's own scope is specifically the AI extraction step, not this
// separate Product-Memory prefill step.
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

// [Owner-requested] "Auto-fill selling price and selling unit from
// memory in Contagem or old Capital Inicial." Before this, Add Stock's
// only memory sources were a product's past StockBatch purchases and
// its own reference sellingPrice (set only via manually editing product
// details — never written by Contagem or by a purchase itself). That
// left a real, common gap: a product whose ONLY history is being
// counted in a Contagem (periodic OR the 'initial'/Capital Inicial
// count — a business's very first stock take-on, often BEFORE any
// purchase was ever recorded in this system) had no batch to remember
// from, so its Contagem-entered selling price was invisible to Add
// Stock — even though the Owner had already told the system that exact
// figure once.
//
// This widens the search to both sources — every StockBatch AND every
// confirmed StockCount (both `stockCounts` and Add Stock's own `batches`
// arrays are already sorted newest-first by the AppContext listeners
// that populate them; see their own onSnapshot setup) — and picks
// whichever single candidate is genuinely more recent, by date. Neither
// source is preferred by TYPE — a StockCount from yesterday beats a
// StockBatch from last month, and vice versa; "the latest one," exactly
// as requested, never "batches first, Contagem only as a fallback" or
// the reverse.
//
// unit/costPrice/sellingPrice are ALWAYS taken from the SAME winning
// record — deliberately never a mix of, say, a newer Contagem's selling
// price with an older batch's cost price, which would silently
// reintroduce the exact cross-unit mismatch this module's own
// resolveUnitAwarePrice (above) exists to prevent.
//
// Never invents: a genuinely new product with no batch and no priced
// Contagem entry anywhere in its history returns null — the caller
// leaves the selling price (and everything derived from it) blank,
// never a guessed number.
export interface RememberedProductMemory {
  unit: string;
  costPrice: number;
  sellingPrice: number;
}

/** The minimal shape this function needs from a StockBatch — kept
 * narrow (not the full StockBatch type) so it can be called/tested with
 * a plain literal, mirroring ProductMemorySnapshot's own established
 * pattern (purchaseToSellingConversion.ts). */
export interface RememberedBatchSource {
  productId: string;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  dateEntered: string; // YYYY-MM-DD
}

/** The minimal shape this function needs from a StockCount — a
 * confirmed Contagem OR the 'initial' Capital Inicial count; this
 * function does not distinguish between the two, by design (§ above). */
export interface RememberedStockCountSource {
  date: string; // YYYY-MM-DD
  items: Array<{
    productId: string;
    productName: string;
    unit?: string;
    costPrice: number;
    sellingPrice?: number;
    // [FR-89–FR-94, Implementation Authorization §10, Option C] The
    // unit `sellingPrice`, on this same item, is actually denominated
    // in — distinct from `unit`, immediately above, which remains the
    // physical/counting unit. Optional so a legacy StockCount item
    // (persisted before this field existed) still matches this narrow
    // shape unchanged — see StockCountItem.sellingPriceBasisUnit's own
    // comment (types.ts) for the full rationale.
    sellingPriceBasisUnit?: string;
  }>;
}

/**
 * Finds the single most recent, internally-consistent remembered
 * (unit, costPrice, sellingPrice) triple for `productId`/`productName`
 * across both StockBatch purchases and confirmed StockCounts (Contagem,
 * including Capital Inicial). Returns `null` — never a fabricated
 * triple — when neither source has anything for this product, or when
 * the only StockCount entries found never had a selling price recorded
 * (an ordinary, common state — plenty of counts are cost-only).
 *
 * `batches` and `stockCounts` are assumed pre-sorted newest-first
 * (matches this codebase's own onSnapshot listener setup for both —
 * see AppContext.tsx) — this function does not re-sort either array
 * itself, only takes each one's own first qualifying entry.
 */
export function findLatestRememberedProductMemory(
  productId: string,
  productName: string,
  batches: RememberedBatchSource[],
  stockCounts: RememberedStockCountSource[],
  // [Owner-requested — "it should pull the selling unit"] When a
  // Contagem counted this product as multiple portions (e.g. some Cx,
  // some Un, each independently priced — the multi-unit valuation
  // capability), more than one item in the same count can match. This
  // resolves the ambiguity: prefer whichever portion is denominated in
  // the product's own CONFIRMED designated selling unit
  // (Product.unitRelationship.sellingUnit) over "whichever happens to
  // be stored first." Purely a tie-break among otherwise-equally-valid
  // candidates within the SAME winning count — never changes which
  // count/batch wins overall, and every conversion this memory then
  // feeds (resolveUnitAwarePrice) was already correct regardless of
  // which portion was picked; this only makes the picked source more
  // intuitive to the Owner, not more mathematically correct than
  // before. Optional and backward-compatible: omitted entirely, this
  // falls back to the previous "first match" behavior unchanged.
  preferredSellingUnit?: string
): RememberedProductMemory | null {
  const latestBatch = batches.find((b) => b.productId === productId && !!b.unit);
  const batchCandidate = latestBatch
    ? { unit: latestBatch.unit as string, costPrice: latestBatch.costPrice, sellingPrice: latestBatch.sellingPrice, asOfDate: latestBatch.dateEntered }
    : null;

  const trimmedName = productName.trim().toLowerCase();
  const trimmedPreferredUnit = preferredSellingUnit?.trim().toLowerCase();
  let countCandidate: { unit: string; costPrice: number; sellingPrice: number; asOfDate: string } | null = null;
  for (const count of stockCounts) {
    const matches = count.items.filter(
      (i) =>
        (i.productId === productId || i.productName.trim().toLowerCase() === trimmedName) &&
        typeof i.sellingPrice === 'number' &&
        i.sellingPrice > 0 &&
        !!i.unit
    );
    if (matches.length === 0) continue;
    // [FR-89–FR-94, Implementation Authorization §10, Option C] The
    // tie-break itself must compare against each candidate's own TRUE
    // selling-price denomination (sellingPriceBasisUnit), not the
    // physical `unit` — a deliberately-priced portion's price can
    // legitimately be denominated in a different unit than it was
    // physically counted in, and the confirmed-selling-unit preference
    // below exists specifically to find the portion that matches the
    // Owner's own designated selling unit for THIS purpose. Falls back
    // to `unit` for any legacy item with no `sellingPriceBasisUnit` —
    // byte-for-byte the previous behavior for every record persisted
    // before this field existed.
    const preferredMatch = trimmedPreferredUnit
      ? matches.find((m) => (m.sellingPriceBasisUnit ?? m.unit)!.trim().toLowerCase() === trimmedPreferredUnit)
      : undefined;
    // Falls back to the first match — byte-for-byte the previous
    // behavior — whenever no preferred unit was supplied, or none of
    // this count's matching portions happen to use it.
    const item = preferredMatch || matches[0];
    // [FR-89–FR-94, Implementation Authorization §10, Option C] The
    // returned candidate's own `unit` must be the item's TRUE selling-
    // price denomination — `sellingPriceBasisUnit` when present, `unit`
    // otherwise (a legacy item, or one whose price was never deliberate
    // and always matched its own physical unit). This is the exact
    // fallback the signed Authorization specifies.
    countCandidate = {
      unit: (item.sellingPriceBasisUnit ?? item.unit) as string,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice as number,
      asOfDate: count.date,
    };
    break; // stockCounts is newest-first — the first (qualifying) count is the most recent
  }

  const winner =
    batchCandidate && countCandidate
      ? new Date(batchCandidate.asOfDate).getTime() >= new Date(countCandidate.asOfDate).getTime()
        ? batchCandidate
        : countCandidate
      : batchCandidate || countCandidate;

  return winner ? { unit: winner.unit, costPrice: winner.costPrice, sellingPrice: winner.sellingPrice } : null;
}

// [Bug fix — Finding C, fresh end-to-end audit, FR-89–FR-94] The
// function above (findLatestRememberedProductMemory) re-derives a
// remembered selling price/unit purely from raw historical
// StockBatch/StockCount records. It has no way to know which of several
// portions in the SAME historical StockCount was the Owner's own "last
// deliberately entered" one — that information is deliberately never
// persisted onto a StockCountItem (Implementation Plan §5.3;
// Implementation Authorization §9, Product-Architect-confirmed) — so
// its own within-count tie-break necessarily falls back to an older
// heuristic (prefer the confirmed-unit match, else the first stored
// item). This can disagree with Product.sellingPrice/
// Product.unitRelationship.sellingUnit, which — as of this same
// correction's own Finding B fix (AppContext.tsx, recordStockCount) —
// IS now correctly kept as the canonical, paired "last deliberately
// entered" selling configuration.
//
// This function makes that canonical Product memory authoritative,
// checked BEFORE any historical re-derivation, wherever a caller
// resolves a product's default selling price/unit: Periodic Contagem's
// own buildCatalogRow/handleModeAToggle, and Add Stock's equivalent
// prefill sites. Returns null when canonical memory is genuinely
// unavailable (no confirmed sellingUnit, or no remembered sellingPrice
// yet) — callers fall back to findLatestRememberedProductMemory in that
// case, unchanged from before this fix; this never removes or replaces
// that function, only takes priority over it when it has something
// authoritative to say.
//
// Deliberately selling-price/unit ONLY — says nothing about cost, which
// remains each caller's own, entirely separate, already-existing
// resolution (FR-85's own independent-write-authorities principle;
// Product.costPrice/FR-67's cost-basis mechanism is untouched by this
// function and by every caller of it).
export interface CanonicalProductSellingMemory {
  unit: string;
  sellingPrice: number;
}

export function resolveCanonicalProductSellingMemory(product: {
  sellingPrice?: number;
  unitRelationship?: UnitRelationship;
}): CanonicalProductSellingMemory | null {
  const confirmedSellingUnit = isValidUnitRelationship(product.unitRelationship) ? product.unitRelationship!.sellingUnit : undefined;
  if (!confirmedSellingUnit || product.sellingPrice == null) return null;
  return { unit: confirmedSellingUnit, sellingPrice: product.sellingPrice };
}
