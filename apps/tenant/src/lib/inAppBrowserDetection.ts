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
  // [Bug fix — Owner-reported, urgent, live with a client: "want to add
  // another [receipt] on top of it to continue the list, it does not
  // work and sometimes brings the previous receipt"] The existing
  // warning above already correctly identified the root cause class
  // (an in-app browser's own broken `<input capture>` handling — an
  // OS/host-app-level bug, not something this codebase's error
  // handling can catch) but only ever showed a vague, non-actionable
  // notice. `os` distinguishes the one platform where a genuine,
  // code-level fix exists (Android — a same-page, no-download escape
  // into a real browser) from the one where it structurally does not
  // (iOS explicitly and deliberately prevents any page from
  // programmatically leaving an in-app browser — Apple's own platform
  // policy, not a limitation of this codebase). `'other'` covers
  // desktop and any UA this detector doesn't recognize, where the
  // question is moot.
  os: 'android' | 'ios' | 'other';
}

const KNOWN_IN_APP_BROWSER_MARKERS: Array<{ pattern: RegExp; appName: string }> = [
  { pattern: /\bWhatsApp\//i, appName: 'WhatsApp' },
  { pattern: /\bFBAN\/|\bFBAV\//i, appName: 'Facebook' },
  { pattern: /\bInstagram\b/i, appName: 'Instagram' },
  { pattern: /\bLine\//i, appName: 'Line' },
  { pattern: /\bMicroMessenger\//i, appName: 'WeChat' },
  { pattern: /\bMusical_ly\b|\bTikTok\b/i, appName: 'TikTok' },
];

function detectOs(userAgent: string): 'android' | 'ios' | 'other' {
  if (/\bAndroid\b/i.test(userAgent)) return 'android';
  // WhatsApp's iOS in-app browser's own User-Agent, per this file's own
  // header comment, does not reliably self-identify AS WhatsApp — but
  // it always still reports the real underlying iOS device correctly
  // (WebKit/Mobile Safari markers), which is all this needs to know.
  if (/\b(iPhone|iPad|iPod)\b/i.test(userAgent)) return 'ios';
  return 'other';
}

/**
 * Checks a raw User-Agent string for a known in-app browser marker.
 * Never throws — an unrecognized or empty string simply resolves to
 * `{ detected: false, os: 'other' }`, the same as a normal browser.
 */
export function detectInAppBrowser(userAgent: string | undefined | null): InAppBrowserDetection {
  if (!userAgent) return { detected: false, os: 'other' };
  for (const { pattern, appName } of KNOWN_IN_APP_BROWSER_MARKERS) {
    if (pattern.test(userAgent)) {
      return { detected: true, appName, os: detectOs(userAgent) };
    }
  }
  return { detected: false, os: detectOs(userAgent) };
}

/**
 * [Bug fix — see InAppBrowserDetection.os's own comment for the full
 * rationale] Builds the Android `intent://` URL that reliably forces
 * the CURRENT page to reopen in a genuine Chrome tab, escaping the
 * host app's own broken in-app WebView entirely — a well-established,
 * standard Android mechanism (not a hack specific to this codebase),
 * requiring no download, no app switch confirmation dialog beyond the
 * OS's own one-time "open with" prompt, and no server-side support.
 * Pure and independently testable — takes the current location
 * explicitly rather than reading `window.location` itself, so it can
 * be exercised without a DOM. Returns null for a non-http(s) URL
 * (defensive only — this app is always served over https in practice).
 */
export function buildAndroidChromeEscapeUrl(currentHref: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(currentHref);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const schemelessRest = currentHref.slice(parsed.protocol.length + 2); // strip "https://" / "http://"
  return `intent://${schemelessRest}#Intent;scheme=${parsed.protocol.slice(0, -1)};package=com.android.chrome;end;`;
}
