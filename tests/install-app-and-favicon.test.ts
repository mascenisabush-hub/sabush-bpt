// Feature — Owner-requested: replace the browser favicon/PWA icon with
// the new Sabush Tech logo, and "facilitate downloading (make it
// easy)" via a real, installable web app manifest + a one-click
// install banner.
//
// Source-inspection tests, matching this repository's established
// technique (no jsdom/testing-library harness exists here).
//
// HOW TO RUN:
//   npx tsx --test tests/install-app-and-favicon.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const indexHtml = src('apps/tenant/index.html');
const appSrc = src('apps/tenant/src/App.tsx');
const bannerSrc = src('apps/tenant/src/components/InstallAppBanner.tsx');
const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('Favicon / PWA icon replacement', () => {
  it('the five expected icon files exist in public/', () => {
    for (const file of ['favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
      assert.ok(existsSync(new URL(`../public/${file}`, import.meta.url)), `Expected public/${file} to exist.`);
    }
  });

  it('index.html links favicon-32/16 and apple-touch-icon, matching the existing convention', () => {
    assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32\.png" \/>/);
    assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="16x16" href="\/favicon-16\.png" \/>/);
    assert.match(indexHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/);
  });
});

describe('Web App Manifest — enables real "install app" capability', () => {
  it('public/manifest.json exists and is valid JSON', () => {
    const manifestPath = new URL('../public/manifest.json', import.meta.url);
    assert.ok(existsSync(manifestPath), 'Expected public/manifest.json to exist.');
    const raw = readFileSync(manifestPath, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(raw));
  });

  it('the manifest declares name, start_url, display, theme/background colors, and both required icon sizes', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf-8'));
    assert.equal(manifest.name, 'Sabush BPT');
    assert.equal(manifest.short_name, 'Sabush');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.theme_color, '#0B1F3A');
    assert.equal(manifest.background_color, '#0B1F3A');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Expected at least two icons.');
    const sizes = manifest.icons.map((i: any) => i.sizes);
    assert.ok(sizes.includes('192x192'));
    assert.ok(sizes.includes('512x512'));
    for (const icon of manifest.icons) {
      assert.equal(icon.type, 'image/png');
      assert.match(icon.src, /^\/icon-(192|512)\.png$/);
    }
  });

  it('index.html links the manifest and declares a matching theme-color meta tag', () => {
    assert.match(indexHtml, /<link rel="manifest" href="\/manifest\.json" \/>/);
    assert.match(indexHtml, /<meta name="theme-color" content="#0B1F3A" \/>/);
  });
});

describe('InstallAppBanner — one-click install, platform-honest, dismissible', () => {
  it('is imported and mounted in App.tsx, in the same banner family as the existing subscription/support banners', () => {
    assert.match(appSrc, /import \{ InstallAppBanner \} from '\.\/components\/InstallAppBanner';/);
    assert.match(appSrc, /<InstallAppBanner \/>/);
    // Mounted alongside, not replacing, the existing banners.
    assert.match(appSrc, /<SubscriptionStatusBanner \/>[\s\S]{0,120}<InstallAppBanner \/>/);
  });

  it('listens for beforeinstallprompt and appinstalled, and calls preventDefault on the captured event (required to defer the browser\'s own automatic prompt until the user clicks the banner\'s own button)', () => {
    assert.match(bannerSrc, /window\.addEventListener\('beforeinstallprompt', handleBeforeInstallPrompt\)/);
    assert.match(bannerSrc, /window\.addEventListener\('appinstalled', handleAppInstalled\)/);
    assert.match(bannerSrc, /e\.preventDefault\(\);\s*\n\s*setDeferredPrompt\(e\);/);
  });

  it('cleans up both listeners on unmount', () => {
    assert.match(bannerSrc, /window\.removeEventListener\('beforeinstallprompt', handleBeforeInstallPrompt\)/);
    assert.match(bannerSrc, /window\.removeEventListener\('appinstalled', handleAppInstalled\)/);
  });

  it('renders nothing when there is no captured prompt or the banner was dismissed — including on Safari, which never fires beforeinstallprompt at all; checked outside this file\'s own explanatory comment, which legitimately names Safari to document why no fallback UI exists for it', () => {
    assert.match(bannerSrc, /if \(!deferredPrompt \|\| dismissed\) return null;/);
    const codeOnly = bannerSrc.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(codeOnly, /safari/i);
  });

  it('handleInstall calls the browser\'s own native prompt() and awaits userChoice, then clears the one-time-use deferred event regardless of outcome', () => {
    const installBody = bannerSrc.slice(bannerSrc.indexOf('const handleInstall'), bannerSrc.indexOf('const handleDismiss'));
    assert.match(installBody, /deferredPrompt\.prompt\(\);/);
    assert.match(installBody, /await deferredPrompt\.userChoice;/);
    assert.match(installBody, /setDeferredPrompt\(null\);/);
  });

  it('dismissal persists to localStorage under the app\'s own established sabush.-prefixed key convention, and is read back on mount', () => {
    assert.match(bannerSrc, /const DISMISSED_KEY = 'sabush\.installBannerDismissed';/);
    assert.match(bannerSrc, /localStorage\.getItem\(DISMISSED_KEY\) === '1'/);
    assert.match(bannerSrc, /localStorage\.setItem\(DISMISSED_KEY, '1'\);/);
  });

  it('reuses the exact same full-width banner structural convention already used by SubscriptionStatusBanner (max-w-7xl inner container, px-4 sm:px-8 py-2, flex items-center justify-between)', () => {
    const subscriptionBannerSrc = src('apps/tenant/src/components/SubscriptionStatusBanner.tsx');
    assert.match(bannerSrc, /max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2/);
    assert.match(subscriptionBannerSrc, /max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2/);
  });
});

describe('i18n — installApp.banner.* keys exist in all three locales', () => {
  it('pt.ts declares the type block', () => {
    assert.match(
      ptSrc,
      /installApp: \{\s*\n\s*banner: \{\s*\n\s*title: string;\s*\n\s*subtitle: string;\s*\n\s*installButton: string;\s*\n\s*dismiss: string;\s*\n\s*\};\s*\n\s*\};/
    );
  });

  it('all three locales provide matching non-empty values for title/subtitle/installButton/dismiss', () => {
    for (const localeSrc of [ptSrc, enSrc, frSrc]) {
      assert.match(localeSrc, /installApp: \{\s*\n\s*banner: \{\s*\n\s*title: '[^']+',\s*\n\s*subtitle: '[^']+',\s*\n\s*installButton: '[^']+',\s*\n\s*dismiss: '[^']+',/);
    }
  });
});
