// [PWA installability — Android Chrome install prompt] This service
// worker exists SOLELY to satisfy Chrome's installability criteria
// (a registered service worker with a fetch event handler is
// required for the beforeinstallprompt/"Install app" experience —
// the manifest and icons alone are not sufficient). It deliberately
// does NOT cache anything and does NOT enable offline use.
//
// This app is a real-time, Firestore-listener-driven business tool —
// live stock counts, live business worth, live draft state. A
// caching service worker risks serving STALE business data to an
// Owner mid-count, a correctness/data-integrity risk far more severe
// than the installability gap this file closes. Every request is
// therefore passed straight through to the network, unmodified,
// exactly as if this file did not exist from the app's own
// perspective — this is a deliberate, permanent design choice, not a
// placeholder for caching to be added later without a fresh,
// separate risk assessment.

self.addEventListener('install', () => {
  // Activate this worker immediately, without waiting for the
  // previous one (if any) to finish handling its existing clients —
  // safe here specifically because this worker never diverges in
  // caching behavior from having no worker at all.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required for Chrome's own installability check to recognize this
  // worker as handling navigation — a genuine pass-through, not a
  // cache. Every response comes straight from the network.
  event.respondWith(fetch(event.request));
});
