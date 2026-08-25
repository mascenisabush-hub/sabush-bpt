// [Bug fix — unsaved edits lost on internal tab switch AND on a real
// hard refresh/tab close] Two owner reports, same underlying gap:
//
// 1. "In add stock, when you leave that tab, coming back you find
//    nothing." — App.tsx renders AddStockView conditionally
//    ({activeTab === 'add-stock' && ...}), so switching to any other
//    tab in the app UNMOUNTS this component outright, cancelling the
//    debounced autosave's pending setTimeout via its own cleanup.
//
// 2. "Hard refreshing when I have draft in add stock, they
//    disappear." — a genuine hard refresh, tab close, or browser
//    navigation is NOT a React unmount at all; the whole JS context is
//    torn down, so React never even gets to run fix #1's cleanup.
//    InitialStockCountView.tsx and PeriodicStockCountView.tsx already
//    carry the fix for this exact class of loss (their own
//    "Draft-loss fix, part 2" comment) — AddStockView was simply
//    missing it.
//
// Fix: a single shared flushDraftNow function (reading current form
// state from a ref mirrored every render, gated by the same three
// conditions the debounced autosave effect itself uses, plus the same
// hasAnyContent check) is wired to THREE triggers: component unmount,
// 'visibilitychange' turning hidden (covers switching apps/minimizing
// — the most reliable signal on mobile), and 'pagehide' (covers an
// actual reload/close/navigation) — deliberately not 'beforeunload',
// which mobile Safari and some other browsers don't reliably fire.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-flush-on-exit.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const appSrc = src('apps/tenant/src/App.tsx');
const initialStockSrc = src('apps/tenant/src/components/InitialStockCountView.tsx');

// The single anchor every test below locates its assertions relative
// to — the start of flushDraftNow's own definition.
const flushDraftNowAnchor = 'const flushDraftNow = () => {';

describe('App.tsx — confirms the actual mechanism fix #1 targets', () => {
  it('AddStockView is rendered conditionally on activeTab, meaning it fully unmounts on any tab switch away from add-stock', () => {
    assert.match(appSrc, /\{activeTab === 'add-stock' && \(/);
  });
});

describe('InitialStockCountView.tsx — confirms the sibling pattern this fix ports over', () => {
  it('already wires visibilitychange + pagehide to its own draft flush (the pattern AddStockView now matches)', () => {
    assert.match(initialStockSrc, /document\.addEventListener\('visibilitychange', handleVisibilityChange\);/);
    assert.match(initialStockSrc, /window\.addEventListener\('pagehide', flushDraftNow\);/);
  });
});

describe('AddStockView.tsx — a single shared flushDraftNow protects unmount, backgrounding, and a real page exit', () => {
  it('flushDraftNow is defined exactly once, as a named function (not inlined separately per trigger)', () => {
    const first = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(first, -1);
    const second = addStockSrc.indexOf(flushDraftNowAnchor, first + 1);
    assert.equal(second, -1, 'Expected flushDraftNow to be defined exactly once and reused, not duplicated');
  });

  it('flushDraftNow reads from latestAutosaveInputsRef, mirrored on every render (not stale closure values)', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 400);
    assert.match(nearby, /\} = latestAutosaveInputsRef\.current;/);
    assert.match(addStockSrc, /latestAutosaveInputsRef\.current = \{/);
  });

  it('flushDraftNow applies the exact same three gates as the debounced autosave effect: draftLoaded, not isSaving, not submittedMessage', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 800);
    assert.match(nearby, /if \(!loaded \|\| saving \|\| submitted\) return;/);
  });

  it('flushDraftNow applies the exact same hasAnyContent check — never writes an empty/pristine draft', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 1000);
    assert.match(nearby, /const hasAnyContent =/);
    assert.match(nearby, /if \(!hasAnyContent\) return;/);
  });

  it('flushDraftNow calls savePurchaseDraft with the ref-captured (current, not stale) values', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const saveStart = addStockSrc.indexOf('savePurchaseDraft(', anchorIdx);
    assert.notEqual(saveStart, -1);
    const nearby = addStockSrc.slice(saveStart, saveStart + 300);
    assert.match(nearby, /r\.map\(rowToDraftLineItem\)/);
  });

  it('a flushDraftNow failure is only logged (fire-and-forget, no UI left to show a retry in any of the three trigger scenarios) — never thrown unhandled', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 1400);
    assert.match(nearby, /\.catch\(\(err\) => \{\s*console\.error\('\[AddStockView\] draft flush-on-exit failed', err\);/);
  });

  it('an effect with an empty dependency array calls flushDraftNow from its cleanup — fires exactly once, on unmount', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const unmountEffectIdx = addStockSrc.indexOf('return () => flushDraftNow();', anchorIdx);
    assert.notEqual(unmountEffectIdx, -1);
  });

  it('a second effect wires visibilitychange (hidden) and pagehide, both calling flushDraftNow, and cleans both listeners up', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 2500);
    assert.match(nearby, /if \(document\.visibilityState === 'hidden'\) flushDraftNow\(\);/);
    assert.match(nearby, /document\.addEventListener\('visibilitychange', handleVisibilityChange\);/);
    assert.match(nearby, /window\.addEventListener\('pagehide', flushDraftNow\);/);
    assert.match(nearby, /document\.removeEventListener\('visibilitychange', handleVisibilityChange\);/);
    assert.match(nearby, /window\.removeEventListener\('pagehide', flushDraftNow\);/);
  });

  it('deliberately does NOT use beforeunload for this flush (established, documented unreliability on mobile Safari)', () => {
    const anchorIdx = addStockSrc.indexOf(flushDraftNowAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 2500);
    assert.doesNotMatch(nearby, /addEventListener\('beforeunload'/);
  });
});
