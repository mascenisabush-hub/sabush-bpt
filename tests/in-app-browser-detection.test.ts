// [Smart Stock Entry crash investigation — WhatsApp in-app browser]
// Pure-function tests for detectInAppBrowser — no I/O, no DOM. See
// that file's own header for the investigation this addresses.
//
// [Bug fix — Owner-reported, urgent, live with a client: "add another
// [receipt]... does not work and sometimes brings the previous
// receipt"] Extended for InAppBrowserDetection.os and
// buildAndroidChromeEscapeUrl — see inAppBrowserDetection.ts's own
// comments for the full rationale.
//
// HOW TO RUN:
//   npx tsx --test tests/in-app-browser-detection.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { detectInAppBrowser, buildAndroidChromeEscapeUrl } from '../apps/tenant/src/lib/inAppBrowserDetection';

const REAL_ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const REAL_IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const WHATSAPP_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.1.78';
const FACEBOOK_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.0;FBBV/123456;]';
const INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0.0';

describe('detectInAppBrowser', () => {
  it('does not flag a normal Android Chrome browser, and correctly identifies its OS', () => {
    assert.deepEqual(detectInAppBrowser(REAL_ANDROID_CHROME), { detected: false, os: 'android' });
  });

  it('does not flag a normal iOS Safari browser, and correctly identifies its OS', () => {
    assert.deepEqual(detectInAppBrowser(REAL_IOS_SAFARI), { detected: false, os: 'ios' });
  });

  it('flags WhatsApp on Android (the reported case) via its own UA marker, with os: android — the one platform a genuine escape exists for', () => {
    const result = detectInAppBrowser(WHATSAPP_ANDROID);
    assert.equal(result.detected, true);
    assert.equal(result.appName, 'WhatsApp');
    assert.equal(result.os, 'android');
  });

  it('flags Facebook on iOS via FBAN/FBAV markers, with os: ios — no programmatic escape possible', () => {
    const result = detectInAppBrowser(FACEBOOK_IOS);
    assert.equal(result.detected, true);
    assert.equal(result.appName, 'Facebook');
    assert.equal(result.os, 'ios');
  });

  it('flags Instagram on iOS', () => {
    const result = detectInAppBrowser(INSTAGRAM_IOS);
    assert.equal(result.detected, true);
    assert.equal(result.appName, 'Instagram');
    assert.equal(result.os, 'ios');
  });

  it('never throws on empty/undefined/null input — resolves to not-detected, os: other', () => {
    assert.deepEqual(detectInAppBrowser(''), { detected: false, os: 'other' });
    assert.deepEqual(detectInAppBrowser(undefined), { detected: false, os: 'other' });
    assert.deepEqual(detectInAppBrowser(null), { detected: false, os: 'other' });
  });

  it('a desktop User-Agent (no Android/iPhone/iPad/iPod marker) resolves os: other', () => {
    const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    assert.deepEqual(detectInAppBrowser(desktopUa), { detected: false, os: 'other' });
  });
});

describe('buildAndroidChromeEscapeUrl — the actionable Android fix', () => {
  it('builds a well-formed intent:// URL for an https page', () => {
    const url = buildAndroidChromeEscapeUrl('https://bpt.sabushtech.com/add-stock?draft=1');
    assert.equal(url, 'intent://bpt.sabushtech.com/add-stock?draft=1#Intent;scheme=https;package=com.android.chrome;end;');
  });

  it('preserves http (never silently upgrades to https, which could point at a different, non-existent origin)', () => {
    const url = buildAndroidChromeEscapeUrl('http://localhost:5173/add-stock');
    assert.equal(url, 'intent://localhost:5173/add-stock#Intent;scheme=http;package=com.android.chrome;end;');
  });

  it('returns null for a non-http(s) URL — defensive, never throws', () => {
    assert.equal(buildAndroidChromeEscapeUrl('mailto:test@example.com'), null);
  });

  it('returns null for a genuinely unparseable string — never throws', () => {
    assert.equal(buildAndroidChromeEscapeUrl(''), null);
    assert.equal(buildAndroidChromeEscapeUrl('not a url at all'), null);
  });
});

