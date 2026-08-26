// [Bug fix — URGENT, Owner-reported: "i edited on computer, but using
// a phone i still see the original unedited one"] The load effect's
// own "defense in depth" check used to be `rows.some(rowHasRealContent)`
// -- "does my form currently have anything in it." That is true
// forever after the FIRST successful load, on ANY device, even when
// nothing has been typed since -- so once a device (e.g. a phone) had
// loaded the original draft once, it would refuse every LATER update
// from any other device (e.g. a computer) permanently, mistaking "I
// loaded data earlier" for "I am actively typing right now."
//
// Fixed by replacing "does rows have content" with "has the form's
// content DIVERGED from what was true at the moment of the last sync"
// -- computeDraftContentSnapshot + lastSyncedContentSnapshot, compared
// on every new draft version instead of a one-shot content check.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-cross-device-update.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-draft-remote-update-adoption.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('computeDraftContentSnapshot — deterministic, meaningful-content-only comparison', () => {
  it('is defined once, reusing rowToDraftLineItem for the rows themselves — never a second, independently-invented row normalization', () => {
    const defCount = (addStockSrc.match(/function computeDraftContentSnapshot\(/g) || []).length;
    assert.equal(defCount, 1);
    const start = addStockSrc.indexOf('function computeDraftContentSnapshot(');
    const end = addStockSrc.indexOf('\n}', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /rows\.map\(rowToDraftLineItem\)/);
  });
});

describe('AddStockView.tsx — the load effect no longer mistakes "has content" for "is actively being edited"', () => {
  it('the naive rowHasRealContent-only "userHasStartedTyping" check is gone from the load effect', () => {
    const start = addStockSrc.indexOf('useEffect(() => {\n    if (loadedForBusinessId !== activeBusinessId) return;');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf("}, [purchaseDraft, purchaseDraftLoaded, loadedForBusinessId, activeBusinessId]);", start);
    const body = addStockSrc.slice(start, end);
    assert.doesNotMatch(body, /const userHasStartedTyping = rows\.some\(rowHasRealContent\);/);
    assert.match(body, /const hasLocalUnsyncedEdits =/);
  });

  it('hasLocalUnsyncedEdits requires an existing snapshot before it can be true — false (safe to adopt) on the very first load', () => {
    const start = addStockSrc.indexOf('const hasLocalUnsyncedEdits =');
    assert.notEqual(start, -1);
    const body = addStockSrc.slice(start, addStockSrc.indexOf('if (!hasLocalUnsyncedEdits)', start));
    assert.match(body, /lastSyncedContentSnapshot\.current !== undefined &&/);
  });

  it('adopting a draft updates lastSyncedContentSnapshot from the DRAFT\'s own just-adopted content, not stale pre-render React state — now via the shared adoptRemoteDraft(draft) function, reused by the conflict-banner\'s "use their version" action', () => {
    const fnStart = addStockSrc.indexOf('const adoptRemoteDraft = (draft: PurchaseDraft) => {');
    assert.notEqual(fnStart, -1, 'Expected adoptRemoteDraft to be defined');
    const fnEnd = addStockSrc.indexOf('\n  };', fnStart);
    const fnBody = addStockSrc.slice(fnStart, fnEnd);
    assert.match(fnBody, /lastSyncedContentSnapshot\.current = computeDraftContentSnapshot\(\s*draft\.items\.map\(draftLineItemToRow\),/);

    const start = addStockSrc.indexOf('const hasLocalUnsyncedEdits =');
    const end = addStockSrc.indexOf('setDraftLoaded(true);', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /adoptRemoteDraft\(purchaseDraft\);/, 'Expected the load effect to adopt via the shared function, not a second inlined copy');
  });
});

describe('AddStockView.tsx — every save path refreshes lastSyncedContentSnapshot after a successful save', () => {
  it('the debounced autosave captures a snapshot from the same closure as the save call, and commits it only on success', () => {
    const start = addStockSrc.indexOf('const savedSnapshot = computeDraftContentSnapshot(\n        rows, date, supplierId, supplierName, supplierPhone, supplierNotes, batchNotes\n      );');
    assert.notEqual(start, -1, 'Expected the debounced autosave to capture savedSnapshot from its own closure');
    const nearby = addStockSrc.slice(start, start + 1200);
    assert.match(nearby, /lastSyncedContentSnapshot\.current = savedSnapshot;/);
  });

  it('the manual retry handler does the same', () => {
    const start = addStockSrc.indexOf('const handleRetryDraftSave = () => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /const savedSnapshot = computeDraftContentSnapshot\(/);
    assert.match(body, /lastSyncedContentSnapshot\.current = savedSnapshot;/);
  });

  it('the flush-on-exit/tab-hidden path does the same', () => {
    const start = addStockSrc.indexOf('const flushDraftNow');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /const savedSnapshot = computeDraftContentSnapshot\(r, d, sId, sName, sPhone, sNotes, bNotes\);/);
    assert.match(body, /lastSyncedContentSnapshot\.current = savedSnapshot;/);
  });

  it('the immediate post-scan save does the same', () => {
    const start = addStockSrc.indexOf('immediate post-scan draft save failed');
    assert.notEqual(start, -1);
    const nearby = addStockSrc.slice(Math.max(0, start - 800), start + 100);
    assert.match(nearby, /const savedSnapshot = computeDraftContentSnapshot\(/);
    assert.match(nearby, /lastSyncedContentSnapshot\.current = savedSnapshot;/);
  });
});

describe('AddStockView.tsx — the business-switch reset effect re-arms the new snapshot ref too', () => {
  it('lastSyncedContentSnapshot is cleared alongside lastProcessedDraftSignature/draftLoaded when activeBusinessId changes', () => {
    const start = addStockSrc.indexOf('lastProcessedDraftSignature.current = undefined;');
    assert.notEqual(start, -1);
    const nearby = addStockSrc.slice(start, start + 400);
    assert.match(nearby, /lastSyncedContentSnapshot\.current = undefined;/);
  });
});