// [Fix #9] Multi-shop stale product/batch reference protection.
//
// PROBLEM: a view like AddQuebraView holds a *persisted* selection
// (selectedProductId/selectedBatchId) derived from AppContext's shared
// `products`/`batches` arrays. On a direct Owner switch (ShopSwitcher ->
// switchShop()), the component is not remounted and activeBusinessId
// changes immediately, but `products`/`batches` keep showing the
// PREVIOUS business's data until that business's Firestore listeners are
// torn down and the new business's onSnapshot delivers its first real
// snapshot. A selection made under Business A must never be usable as a
// write reference once activeBusinessId has moved to Business B — not
// even during that in-between window.
//
// These are pure, dependency-free functions (no React, no Firestore) so
// the actual state-transition invariant can be unit-tested directly
// against plain objects, the same way subscriptionEngine.ts's
// computeSubscriptionTransition() is tested — not by asserting on
// component wiring/strings.

/** The minimal shape either products or batches need for validation. */
export interface HasId {
  id: string;
}

export interface BatchLike extends HasId {
  productId: string;
}

/**
 * Given the business the current selection was loaded for and the
 * business that is now active, decides whether a switch just happened
 * and, if so, that any held selection must be discarded.
 *
 * `loadedForBusinessId` is deliberately just business identity, not a
 * "data is fresh" signal — see isBusinessDataReady() below for that.
 */
export function detectShopSwitch(
  activeBusinessId: string | null,
  loadedForBusinessId: string | null,
): { loadedForBusinessId: string | null; shouldResetSelection: boolean } {
  if (activeBusinessId === loadedForBusinessId) {
    return { loadedForBusinessId, shouldResetSelection: false };
  }
  return { loadedForBusinessId: activeBusinessId, shouldResetSelection: true };
}

/**
 * True once `current` is a genuinely different array reference than the
 * one captured at the moment a switch was first observed (`snapshotAtSwitch`).
 *
 * This works without any extra Firestore read and without AppContext
 * needing to expose a per-collection "loaded" flag: every onSnapshot
 * callback in AppContext.tsx builds a brand-new array on every delivery
 * (`const list: T[] = []; ... setProducts(list)`), including the very
 * first delivery from the newly (re-)subscribed listener for the new
 * business. So "has this reference changed since the switch was
 * observed" reliably means "at least one real snapshot for the new
 * business has arrived" — never a false positive from mutated-in-place
 * data, since Firestore listeners here never mutate in place.
 *
 * `snapshotAtSwitch` of `null` (no switch pending, e.g. first mount)
 * always reads as ready — this gate exists to cover the switch window
 * specifically, not to block the very first load.
 */
export function isBusinessDataReady<T>(current: T, snapshotAtSwitch: T | null): boolean {
  return snapshotAtSwitch === null || current !== snapshotAtSwitch;
}

/**
 * Defense-in-depth: the actual invariant this fix exists to guarantee.
 * Re-validates, at the moment of write, that a productId/batchId
 * genuinely resolve inside the CURRENT products/batches arrays for
 * whatever business is currently active — independent of whatever the
 * UI did or didn't manage to keep in sync. No extra Firestore read:
 * `currentProducts`/`currentBatches` are already-subscribed AppContext
 * state.
 *
 * Equivalent formulation (per the Fix #9 brief): a product/batch id
 * selected under Business A must never remain a valid submission
 * reference once the active business is Business B.
 */
export function isSelectionSafeToSubmit(
  selectedProductId: string,
  selectedBatchId: string,
  currentProducts: HasId[],
  currentBatches: BatchLike[],
): boolean {
  if (!selectedProductId || !selectedBatchId) return false;
  const productExists = currentProducts.some((p) => p.id === selectedProductId);
  const batchExists = currentBatches.some(
    (b) => b.id === selectedBatchId && b.productId === selectedProductId,
  );
  return productExists && batchExists;
}
