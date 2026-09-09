// [Smart Stock Entry crash investigation — WhatsApp in-app browser]
// Pure-function tests for detectInAppBrowser — no I/O, no DOM. See
// that file's own header for the investigation this addresses.
//
// HOW TO RUN:
//   npx tsx --test tests/in-app-browser-detection.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { detectInAppBrowser } from '../apps/tenant/src/lib/inAppBrowserDetection';

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
  it('does not flag a normal Android Chrome browser', () => {
    assert.deepEqual(detectInAppBrowser(REAL_ANDROID_CHROME), { detected: false });
  });

  it('does not flag a normal iOS Safari browser', () => {
    assert.deepEqual(detectInAppBrowser(REAL_IOS_SAFARI), { detected: false });
  });

  it('flags WhatsApp on Android (the reported case) via its own UA marker', () => {
    const result = detectInAppBrowser(WHATSAPP_ANDROID);
    assert.equal(result.detected, true);
    assert.equal(result.appName, 'WhatsApp');
  });

  it('flags Facebook on iOS via FBAN/FBAV markers', () => {
    const result = detectInAppBrowser(FACEBOOK_IOS);
    assert.equal(result.detected, true);
    assert.equal(result.appName, 'Facebook');
  });

  it('flags Instagram on iOS', () => {
    const result = detectInAppBrowser(INSTAGRAM_IOS);
    assert.equal(result.detected, true);
    assert.equal(result.appName, 'Instagram');
  });

  it('never throws on empty/undefined/null input — resolves to not-detected', () => {
    assert.deepEqual(detectInAppBrowser(''), { detected: false });
    assert.deepEqual(detectInAppBrowser(undefined), { detected: false });
    assert.deepEqual(detectInAppBrowser(null), { detected: false });
  });
});
