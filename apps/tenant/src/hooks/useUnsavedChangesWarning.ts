import { useEffect } from 'react';

/**
 * [Data-entry error-resilience audit — Finding 3] Warns the person via
 * the browser's own native "leave site?" confirm dialog if they try to
 * close the tab, refresh, or navigate away while `hasUnsavedInput` is
 * true — for short, single-screen forms (Despesa, Levantamento,
 * Quebra, Dívidas) that have no draft-persistence mechanism of their
 * own, unlike Contagem/+Stock/Initial Stock (which flush a real
 * Firestore draft on 'visibilitychange'/'pagehide' instead — see
 * InitialStockCountView.tsx's own identical-purpose effect for why
 * THAT approach was chosen there: those forms can lose meaningful,
 * time-consuming work, so a silent background save is worth building).
 *
 * A 4-6 field form doesn't carry the same cost if lost, so a full
 * draft-persistence pipeline would be disproportionate — this is
 * intentionally the lighter-weight mitigation for that smaller class
 * of form, not a scaled-down draft system.
 *
 * Known limitation, carried over honestly from that same prior
 * finding: 'beforeunload' is not reliably fired by mobile Safari and
 * some other browsers. This still helps on desktop and most Android
 * browsers — a real, meaningful improvement over the current total
 * absence of any warning — but it is not a guarantee on every device,
 * and does not claim to be one.
 */
export function useUnsavedChangesWarning(hasUnsavedInput: boolean): void {
  useEffect(() => {
    if (!hasUnsavedInput) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set; the actual string shown
      // is the browser's own generic message on every modern browser —
      // custom text hasn't been honored by any browser in years.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedInput]);
}
