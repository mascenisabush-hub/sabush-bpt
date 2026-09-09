// [Smart Stock Entry crash investigation — WhatsApp in-app browser]
// A client-reported crash during "Tirar Foto"/"Carregar Documento" was
// investigated live (Railway console): the entire AI extraction
// pipeline — API key, model, and the exact SDK call this app makes,
// including with a real image — was confirmed working end-to-end in
// production. The link that crashed had been shared via WhatsApp.
//
// This matters because WKWebView (the engine WhatsApp's — and Messenger's,
// Instagram's, Facebook's, Line's, TikTok's — in-app browser is built
// on, on iOS) has multiple documented, version-specific bugs and
// outright crashes specifically when a page's `<input type="file"
// capture>` tries to trigger the native camera — an OS/host-app-level
// failure, not a JavaScript exception this codebase's own error
// handling can catch or recover from. This is the most likely
// explanation for the reported crash, though it was not (and, without
// the actual device, cannot be) directly confirmed.
//
// Pure, dependency-free string matching — independently unit
// testable, no DOM/browser API required, same separation this
// codebase already uses for other pure-logic/impure-I/O splits (e.g.
// smartStockEntryImagePreprocessing.ts's own header comment).
//
// Deliberately best-effort, not exhaustive: matching is intentionally
// conservative (specific, documented markers only) so a normal
// browser is never mistakenly flagged — a false "you're in an in-app
// browser" warning shown to someone who isn't would be worse than
// occasionally missing a real one. iOS WhatsApp in particular does not
// reliably self-identify in its User-Agent the way Android WhatsApp
// and Meta's own apps (Messenger/Instagram/Facebook, both platforms)
// do — this detector will under-detect that specific case, not
// over-detect it.

export interface InAppBrowserDetection {
  detected: boolean;
  /** Human-readable app name, for display/logging — undefined when not detected. */
  appName?: string;
}

const KNOWN_IN_APP_BROWSER_MARKERS: Array<{ pattern: RegExp; appName: string }> = [
  { pattern: /\bWhatsApp\//i, appName: 'WhatsApp' },
  { pattern: /\bFBAN\/|\bFBAV\//i, appName: 'Facebook' },
  { pattern: /\bInstagram\b/i, appName: 'Instagram' },
  { pattern: /\bLine\//i, appName: 'Line' },
  { pattern: /\bMicroMessenger\//i, appName: 'WeChat' },
  { pattern: /\bMusical_ly\b|\bTikTok\b/i, appName: 'TikTok' },
];

/**
 * Checks a raw User-Agent string for a known in-app browser marker.
 * Never throws — an unrecognized or empty string simply resolves to
 * `{ detected: false }`, the same as a normal browser.
 */
export function detectInAppBrowser(userAgent: string | undefined | null): InAppBrowserDetection {
  if (!userAgent) return { detected: false };
  for (const { pattern, appName } of KNOWN_IN_APP_BROWSER_MARKERS) {
    if (pattern.test(userAgent)) {
      return { detected: true, appName };
    }
  }
  return { detected: false };
}
