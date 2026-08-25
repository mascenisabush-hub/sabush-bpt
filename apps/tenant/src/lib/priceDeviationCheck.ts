// [Manual data-entry error investigation, Finding 3 — Owner-requested]
// No price-deviation check existed anywhere in the app — a freshly-typed
// cost or selling price was never compared against the product's own
// remembered price to flag the classic fat-finger typo (an extra or
// missing zero). This is the SAME "warn, never block" shape
// DeclareBusinessWorthView.tsx's own review step already established for
// Finding 1 (Critical) — deliberately factored out here, rather than
// duplicated a third and fourth time, since this capability now needs
// to be genuinely identical across Add Stock and Contagem (and any
// future screen that compares a typed price against memory), where the
// UI markup around it legitimately differs per screen but the
// underlying judgment call — "is this deviation large enough to
// mention" — must not silently drift into two different thresholds in
// two different files.
//
// DeclareBusinessWorthView.tsx's OWN threshold constant is NOT
// refactored to import this — that file already shipped and tested its
// own inline 0.3 independently (Finding 1, this same investigation);
// changing an already-verified file's own working logic to satisfy a
// later DRY preference is a judgment call best left to a deliberate,
// reviewed follow-up, not folded silently into this one. The two
// values are kept numerically identical on purpose.

/**
 * A round, easily explained threshold — not tuned from any real data,
 * mirroring DeclareBusinessWorthView.tsx's own DEVIATION_WARNING_THRESHOLD
 * exactly (same value, independently declared — see this file's own
 * header comment for why). Deliberately generous enough that ordinary
 * price changes (a genuine cost increase, a deliberate markup change)
 * don't nag on every use, while still catching an order-of-magnitude
 * typo.
 */
export const PRICE_DEVIATION_WARNING_THRESHOLD = 0.3;

export interface PriceDeviationCheck {
  /** null when no honest comparison is possible (no remembered price,
   * remembered price is 0 or negative, or the typed price is not a
   * finite number) — never a fabricated 0. */
  deviationPercent: number | null;
  /** Whether the deviation, if computable, meets or exceeds
   * PRICE_DEVIATION_WARNING_THRESHOLD. Always false when
   * deviationPercent is null. */
  showWarning: boolean;
  /** Only meaningful when showWarning is true. */
  isAboveRemembered: boolean;
}

/**
 * Compares a freshly-typed price against a remembered one — pure,
 * deterministic, no I/O. Never fabricates a comparison: a missing,
 * zero, or non-positive remembered price (nothing genuinely known to
 * compare against) or a non-finite typed price (a blank/mid-edit field)
 * both yield "no warning, no percentage," never a false 0%/Infinity%
 * result standing in for "unknown."
 */
export function checkPriceDeviation(
  typedPrice: number,
  rememberedPrice: number | null | undefined
): PriceDeviationCheck {
  if (
    rememberedPrice === null ||
    rememberedPrice === undefined ||
    !Number.isFinite(rememberedPrice) ||
    rememberedPrice <= 0 ||
    !Number.isFinite(typedPrice)
  ) {
    return { deviationPercent: null, showWarning: false, isAboveRemembered: false };
  }
  const deviationPercent = Math.abs(typedPrice - rememberedPrice) / rememberedPrice;
  return {
    deviationPercent,
    showWarning: deviationPercent >= PRICE_DEVIATION_WARNING_THRESHOLD,
    isAboveRemembered: typedPrice > rememberedPrice,
  };
}
