// [Restock Observation Amendment v1.0 — docs/specs/05-restock-observation-amendment.md]
// Pure, dependency-free decision logic for the optional Restock
// Observation capability, extracted so it can be unit tested directly
// against plain values — no React, no Firestore, no emulator — matching
// this repository's established pattern (see src/lib/openBatchSupersession.ts,
// Fix #10, and src/utils/deleteProductPlan.ts, Fix #7).
//
// CENTRAL RULE (amendment Part 3): this is NEVER a sales figure.
// `computeRestockObservation` returns a value only when both the
// previous purchasing cycle's quantity and the operator's own physical
// "remaining before restock" observation are known — it never invents
// or defaults either operand to 0, and the returned shape is always
// framed as "movement," never "sold"/"sales"/"revenue".

import { StockBatch, StockBatchRestockObservation } from '../types';

/**
 * Finds the most recent EXISTING batch for a given product — the
 * "previous cycle" a Restock Observation compares against — from an
 * unsorted list. Used by `addMultipleStockBatches`, whose in-memory
 * `tempBatches` accumulates newly-created line items as it loops and
 * is therefore not guaranteed to stay date-sorted the way AppContext's
 * top-level `batches` (kept sorted by its `onSnapshot` listener) is.
 * Ties broken by `createdAt` (later wins), matching this repository's
 * existing "most recent, tie-broken by createdAt" convention (see
 * `InitialStockPriceChangeEvent`'s own governing comment in types.ts).
 * Returns `undefined` when there is no prior batch for this product at
 * all (brand-new product).
 */
export function findMostRecentBatchForProduct(
  batchesList: StockBatch[],
  productId: string
): StockBatch | undefined {
  let best: StockBatch | undefined;
  for (const b of batchesList) {
    if (b.productId !== productId) continue;
    if (!best) {
      best = b;
      continue;
    }
    const bDate = new Date(b.dateEntered).getTime();
    const bestDate = new Date(best.dateEntered).getTime();
    if (
      bDate > bestDate ||
      (bDate === bestDate && new Date(b.createdAt).getTime() > new Date(best.createdAt).getTime())
    ) {
      best = b;
    }
  }
  return best;
}

/**
 * Decides whether a valid Restock Observation can be computed and, if
 * so, returns it. Returns `null` whenever the observation cannot be
 * computed — including when the operator declined to provide a
 * previous-remaining-quantity ("I don't know" / left blank), when there
 * is no previous cycle at all (brand-new product), or when either
 * operand would be invalid (negative, non-finite).
 *
 * @param previousCycleQuantity The quantity entered on the most recent
 *   prior batch for this same product — `null`/`undefined` when this is
 *   a brand-new product with no prior batch to compare against.
 * @param previousRemainingQuantityInput The operator's raw input for
 *   "how much was left before this restock" — `null`/`undefined`/empty
 *   string represents an explicit "I don't know" / not-provided, and
 *   must NEVER be treated as 0.
 * @param observedAt ISO timestamp to stamp the observation with (caller
 *   supplies this so the function stays pure/deterministic and testable
 *   without mocking `Date`).
 */
export function computeRestockObservation(
  previousCycleQuantity: number | null | undefined,
  previousRemainingQuantityInput: number | string | null | undefined,
  observedAt: string
): StockBatchRestockObservation | null {
  // No previous cycle at all (brand-new product) — nothing to compare
  // against, regardless of what was typed into the field.
  if (previousCycleQuantity == null || !Number.isFinite(previousCycleQuantity)) {
    return null;
  }
  if (previousCycleQuantity < 0) {
    return null;
  }

  const previousRemainingQuantity = parsePreviousRemainingQuantity(
    previousRemainingQuantityInput
  );
  // Explicit "I don't know" / blank — unknown stays unknown. Never
  // substitute 0 here.
  if (previousRemainingQuantity === null) {
    return null;
  }

  return {
    previousRemainingQuantity,
    movement: previousCycleQuantity - previousRemainingQuantity,
    observedAt,
  };
}

/**
 * Parses the operator's raw "remaining before restock" input into a
 * validated non-negative number, or `null` if the input represents
 * "unknown" (empty/blank/whitespace-only string, `null`, `undefined`)
 * or is not a valid non-negative number. Never returns 0 for an
 * "unknown" input — only for a genuine, explicit `0`.
 */
export function parsePreviousRemainingQuantity(
  input: number | string | null | undefined
): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return null; // blank == "I don't know", never 0
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  }
  if (!Number.isFinite(input) || input < 0) return null;
  return input;
}
