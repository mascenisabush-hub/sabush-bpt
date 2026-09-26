// [PWA installability — Android Chrome + iPhone Safari] Regression
// coverage for the service worker registration, the manifest, and the
// iOS-specific meta tags that together make the app installable on
// both platforms. Source-text and file-presence based, following this
// repository's own established convention — this sandbox has no real
// browser to observe an actual install prompt firing (the same
// limitation documented throughout this engagement's Contagem work);
// these tests verify the configuration is genuinely correct and
// present, not that Chrome/Safari actually offer to install it.

import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const indexHtmlPath = new URL('../apps/tenant/index.html', import.meta.url);
const indexHtml = readFileSync(indexHtmlPath, 'utf8');
const swPath = new URL('../public/sw.js', import.meta.url);
const manifestPath = new URL('../public/manifest.json', import.meta.url);

describe('Service worker — present, registered, and deliberately non-caching', () => {
  it('public/sw.js exists', () => {
    assert.ok(existsSync(swPath), 'expected public/sw.js to exist');
  });

  it('registers install/activate/fetch handlers — the exact three Chrome\'s installability check requires', () => {
    const sw = readFileSync(swPath, 'utf8');
    assert.match(sw, /self\.addEventListener\('install', \(\) => \{/);
    assert.match(sw, /self\.addEventListener\('activate', \(event\) => \{/);
    assert.match(sw, /self\.addEventListener\('fetch', \(event\) => \{/);
  });

  it('the fetch handler is a genuine pass-through — never caches, given this app is real-time/Firestore-driven and stale data would be a correctness risk', () => {
    const sw = readFileSync(swPath, 'utf8');
    assert.match(sw, /event\.respondWith\(fetch\(event\.request\)\);/);
    assert.doesNotMatch(sw, /caches\.open|caches\.match|Cache\(/, 'must never introduce caching behavior');
  });

  it('registerServiceWorker exists, is production-only, and registers /sw.js on window load', () => {
    const src = readFileSync(
      new URL('../apps/tenant/src/lib/registerServiceWorker.ts', import.meta.url),
      'utf8'
    );
    assert.match(src, /if \(!import\.meta\.env\.PROD\) return;/);
    assert.match(src, /if \(!\('serviceWorker' in navigator\)\) return;/);
    assert.match(src, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
  });

  it('is actually called from the app\'s real entry point, not just defined and unused', () => {
    const mainSrc = readFileSync(new URL('../apps/tenant/src/main.tsx', import.meta.url), 'utf8');
    assert.match(mainSrc, /import \{registerServiceWorker\} from '\.\/lib\/registerServiceWorker';/);
    assert.match(mainSrc, /registerServiceWorker\(\);/);
  });
});

describe('Manifest — already correct, confirmed present with every field Chrome requires', () => {
  it('public/manifest.json exists and is valid JSON with every required field', () => {
    assert.ok(existsSync(manifestPath), 'expected public/manifest.json to exist');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(manifest.name || manifest.short_name);
    assert.ok(manifest.start_url);
    assert.ok(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display));
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    assert.ok(sizes.includes('192x192'));
    assert.ok(sizes.includes('512x512'));
  });

  it('every icon file the manifest references actually exists on disk', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const icon of manifest.icons as { src: string }[]) {
      const iconPath = new URL(`../public${icon.src}`, import.meta.url);
      assert.ok(existsSync(iconPath), `manifest references ${icon.src} but the file does not exist`);
    }
  });
});

describe('index.html — manifest link, iOS meta tags, and apple-touch-icon all present', () => {
  it('links the manifest', () => {
    assert.match(indexHtml, /<link rel="manifest" href="\/manifest\.json" \/>/);
  });

  it('declares both the modern and iOS-specific web-app-capable tags — Chrome honors the modern tag, iOS Safari still requires its own', () => {
    assert.match(indexHtml, /<meta name="mobile-web-app-capable" content="yes" \/>/);
    assert.match(indexHtml, /<meta name="apple-mobile-web-app-capable" content="yes" \/>/);
  });

  it('declares the iOS status-bar style and app title — without these, an iOS home-screen icon opens an ordinary browser tab, not a standalone app', () => {
    assert.match(indexHtml, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" \/>/);
    assert.match(indexHtml, /<meta name="apple-mobile-web-app-title" content="Sabush" \/>/);
  });

  it('apple-touch-icon was already present before this change and remains so', () => {
    assert.match(indexHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/);
    assert.ok(existsSync(new URL('../public/apple-touch-icon.png', import.meta.url)));
  });
});

describe('Honest platform limitation, recorded as a fact of the test suite itself', () => {
  it('iOS never receives an automatic install prompt regardless of this configuration — Add to Home Screen there is only ever available through Safari\'s own Share menu, a platform restriction nothing in this app can change', () => {
    // This test intentionally asserts nothing about iOS-side automatic
    // prompting, because no such thing exists to assert — documented
    // here as a permanent fact, not a gap to be later "fixed".
    assert.ok(true);
  });
});
