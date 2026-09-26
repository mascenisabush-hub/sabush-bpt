// [PWA installability — Android Chrome install prompt] Registers the
// pass-through service worker (public/sw.js — see that file's own
// comment for why it deliberately caches nothing) so Chrome's
// installability criteria are met and the "Install app"/
// beforeinstallprompt experience becomes available on Android.
//
// Production only — deliberately skipped in dev. Vite's own dev
// server already serves /sw.js from public/, so registration would
// technically succeed there too, but a service worker sitting between
// the browser and Vite's dev server risks interfering with HMR/live
// reload in ways with no corresponding benefit in a local dev
// session, where installability was never the goal in the first
// place.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability degrades gracefully to "no install prompt" —
      // never a reason to disrupt the app itself, which functions
      // identically with or without this registration succeeding.
    });
  });
}
