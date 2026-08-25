// [Bug fix — unsaved edits lost when leaving the Add Stock tab]
// Owner-reported: "In any data entry door, including add stock, when
// leaving the tab accidentally... coming back you find nothing."
//
// Root cause, same class as the earlier immediate-post-scan-save fix
// (see add-stock-scan-immediate-save.test.ts) but general to ANY edit,
// not just a scan: App.tsx renders AddStockView conditionally
// ({activeTab === 'add-stock' && <AddStockView ... />}), so switching
// to any other tab in the app UNMOUNTS this component outright. The
// debounced autosave effect (deliberately 800ms, so a fast typist
// doesn't trigger a write per keystroke) has its own cleanup
// (`return () => clearTimeout(handle)`), which React runs on unmount
// exactly like on every dependency change — so any edit made within
// the last 800ms, with its save still pending, was simply discarded
// the moment the tab switched, with nothing visible to indicate it.
//
// Fix: a second effect with an empty dependency array (so its cleanup
// runs exactly once, on unmount) reads the CURRENT form contents from
// refs mirrored on every render, and — gated by the exact same three
// conditions the debounced autosave effect itself already uses
// (draftLoaded, !isSaving, !submittedMessage) plus the same
// hasAnyContent check — fires one immediate, best-effort save.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-flush-on-unmount.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const appSrc = src('apps/tenant/src/App.tsx');

// The unmount-flush effect's cleanup body starts here — every test
// below locates its own assertions relative to this single, unique
// anchor rather than re-deriving it, so a reformat of unrelated code
// elsewhere in the file can't accidentally make an assertion match the
// wrong occurrence of a common token like "savePurchaseDraft(".
const unmountFlushAnchor = "const {\n        rows: r,\n        date: d,\n        supplierId: sId,";

describe('App.tsx — confirms the actual mechanism this fix targets', () => {
  it('AddStockView is rendered conditionally on activeTab, meaning it fully unmounts on any tab switch away from add-stock', () => {
    assert.match(appSrc, /\{activeTab === 'add-stock' && \(/);
  });
});

describe('AddStockView.tsx — a flush-on-unmount save protects any pending debounced edit', () => {
  it('the unmount-flush anchor is present exactly once (sanity check that the other tests in this file are looking at the right block)', () => {
    const first = addStockSrc.indexOf(unmountFlushAnchor);
    assert.notEqual(first, -1, 'Expected to find the unmount-flush destructuring block');
    const second = addStockSrc.indexOf(unmountFlushAnchor, first + 1);
    assert.equal(second, -1, 'Expected the unmount-flush destructuring block to appear exactly once');
  });

  it('latestAutosaveInputsRef mirrors the current form state on every render (not just at effect-dependency-change time)', () => {
    const start = addStockSrc.indexOf('const latestAutosaveInputsRef = useRef({');
    assert.notEqual(start, -1);
    const nearby = addStockSrc.slice(start, start + 700);
    assert.match(nearby, /latestAutosaveInputsRef\.current = \{/);
  });

  it('the flush-on-unmount effect has an empty dependency array, so its cleanup runs exactly once, on unmount', () => {
    const anchorIdx = addStockSrc.indexOf(unmountFlushAnchor);
    assert.notEqual(anchorIdx, -1);
    const closeIdx = addStockSrc.indexOf('}, []);', anchorIdx);
    assert.notEqual(closeIdx, -1, 'Expected an empty-dependency-array useEffect ending in }, []); after the unmount-flush block');
  });

  it('the unmount flush applies the exact same three gates as the debounced autosave effect: draftLoaded, not isSaving, not submittedMessage', () => {
    const anchorIdx = addStockSrc.indexOf(unmountFlushAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 800);
    assert.match(nearby, /if \(!loaded \|\| saving \|\| submitted\) return;/);
  });

  it('the unmount flush applies the exact same hasAnyContent check as the debounced autosave effect — never writes an empty/pristine draft', () => {
    const anchorIdx = addStockSrc.indexOf(unmountFlushAnchor);
    assert.notEqual(anchorIdx, -1);
    const nearby = addStockSrc.slice(anchorIdx, anchorIdx + 1000);
    assert.match(nearby, /const hasAnyContent =/);
    assert.match(nearby, /if \(!hasAnyContent\) return;/);
  });

  it('the unmount flush calls savePurchaseDraft directly with the ref-captured (current, not stale) values', () => {
    const anchorIdx = addStockSrc.indexOf(unmountFlushAnchor);
    assert.notEqual(anchorIdx, -1);
    const flushSaveStart = addStockSrc.indexOf('savePurchaseDraft(', anchorIdx);
    assert.notEqual(flushSaveStart, -1);
    const nearby = addStockSrc.slice(flushSaveStart, flushSaveStart + 300);
    assert.match(nearby, /r\.map\(rowToDraftLineItem\)/);
  });

  it('a save failure during the unmount flush is only logged (fire-and-forget, no UI left to show a retry) — never thrown unhandled', () => {
    const anchorIdx = addStockSrc.indexOf(unmountFlushAnchor);
    assert.notEqual(anchorIdx, -1);
    const flushSaveStart = addStockSrc.indexOf('savePurchaseDraft(', anchorIdx);
    assert.notEqual(flushSaveStart, -1);
    const nearby = addStockSrc.slice(flushSaveStart, flushSaveStart + 500);
    assert.match(nearby, /\.catch\(\(err\) => \{\s*console\.error\('\[AddStockView\] flush-on-unmount draft save failed', err\);/);
  });
});
