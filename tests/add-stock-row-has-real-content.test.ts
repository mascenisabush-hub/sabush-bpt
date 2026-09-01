// [CRITICAL bug fix — a real, correctly-saved draft never visibly
// loaded, and "Draft saved" showed on a completely blank form]
// Owner-reported and confirmed via screenshot: "Rascunho guardado"
// (Draft saved) appeared on a totally untouched Add Stock screen, and
// — far more seriously — this remained true after every save-side fix
// already made in this session (the load-latch fix, the server-
// verification fix, the immediate-post-scan-save fix, the flush-on-
// unmount fix, the visibilitychange/pagehide flush fix): a real draft
// sitting correctly in Firestore still never visibly appeared when
// returning to a fresh Add Stock screen.
//
// [Later note] The load effect's own guard described below
// (userHasStartedTyping) was itself subsequently superseded by a
// stronger, cross-device-safe content-snapshot diff
// (computeDraftContentSnapshot/hasLocalUnsyncedEdits) — see that
// fix's own comment in AddStockView.tsx. This file's test for that
// specific guard was updated accordingly, below; every other
// assertion here (rowHasRealContent itself and its other four call
// sites) is unaffected and still governs current code exactly as
// originally written.
//
// Root cause, found by tracing this exact discrepancy back through the
// load effect: createEmptyRow's own default `quantity: '50'` is a
// non-empty STRING — truthy — so FOUR separate places in this file
// that needed to ask "does this row actually have anything real in
// it?" were instead asking the much weaker "is quantity non-empty?",
// which is true for every pristine, never-touched row from the moment
// the component mounts, before a single keystroke:
//
//   1. userHasStartedTyping (the load effect) — THE critical one. Since
//      `rows` starts as exactly one pristine default row, this was
//      ALWAYS (falsely) true on every fresh mount, so the
//      `if (!userHasStartedTyping)` block that actually calls
//      setRows(purchaseDraft.items...) to display a genuinely saved
//      draft NEVER ran. A real, correctly-saved, correctly-fetched
//      draft was silently discarded at the very last step, on every
//      single load — independent of, and undoing the value of, every
//      save-side fix made earlier in this same session.
//   2. hasAnyContent (debounced autosave effect)
//   3. hasAnyContent (flushDraftNow)
//   4. hasDraftContent (gates the "Draft saved"/error indicator AND
//      the Discard-draft button) — this is specifically why the
//      indicator showed on a blank form.
//
// Fix: a single shared rowHasRealContent(row) function — matching the
// comparison ALREADY correct elsewhere in this file (the receipt-scan
// merge's own `kept` filter, which always compared `quantity !== '50'`,
// never merely truthiness) — replaces all five ad hoc inline checks
// (the four buggy ones plus the one already-correct one, consolidated
// for consistency), so this exact class of drift — one correct
// definition existing while several independently-written incorrect
// copies of the same intent silently diverge — cannot recur unnoticed.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-row-has-real-content.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('AddStockView.tsx — a single shared rowHasRealContent replaces every ad hoc "does this row have content" check', () => {
  it('rowHasRealContent is defined exactly once, comparing quantity against the actual "50" default (not mere truthiness)', () => {
    const matches = addStockSrc.match(/const rowHasRealContent = \(r: StockRowItem\): boolean =>/g) || [];
    assert.equal(matches.length, 1, 'Expected exactly one definition of rowHasRealContent');
    const defIdx = addStockSrc.indexOf('const rowHasRealContent = (r: StockRowItem): boolean =>');
    const nearby = addStockSrc.slice(defIdx, defIdx + 250);
    assert.match(nearby, /r\.quantity !== '50'/);
    assert.match(nearby, /r\.productName\.trim\(\) !== ''/);
    assert.match(nearby, /r\.costPrice !== ''/);
    assert.match(nearby, /r\.sellingPrice !== ''/);
  });

  it('NO buggy ad hoc "row has content" check (bare truthy quantity, without the !== \'50\' comparison) remains anywhere in the file', () => {
    // This is the exact broken pattern that caused the bug: checking
    // mere truthiness of quantity/costPrice/sellingPrice instead of
    // comparing against the actual pristine-row defaults. If this
    // pattern reappears anywhere (a new inline copy instead of reusing
    // rowHasRealContent), this test must fail.
    assert.doesNotMatch(
      addStockSrc,
      /r\.productName\.trim\(\) \|\| r\.quantity \|\| r\.costPrice \|\| r\.sellingPrice/,
      'A buggy inline "row has content" check reappeared — use rowHasRealContent instead'
    );
    assert.doesNotMatch(
      addStockSrc,
      /row\.productName\.trim\(\) \|\| row\.quantity \|\| row\.costPrice \|\| row\.sellingPrice/,
      'A buggy inline "row has content" check reappeared — use rowHasRealContent instead'
    );
  });

  it('the load effect\'s "don\'t clobber in-progress typing" guard now uses computeDraftContentSnapshot (full-content diffing), not the older bare userHasStartedTyping truthiness check — this was the actual root cause of a real draft never loading, later superseded by a stronger cross-device-safe fix', () => {
    // [Bug fix — a tab that already loaded a draft once could never
    // adopt a LATER update from another device] The original fix for
    // THIS test's own bug (userHasStartedTyping = rows.some(rowHasRealContent))
    // was itself later superseded by a stronger mechanism: instead of a
    // coarse "does the form have any content" boolean, the load effect
    // now diffs a full content snapshot (computeDraftContentSnapshot,
    // built from rowToDraftLineItem over every row) against the
    // snapshot last synced from Firestore. hasLocalUnsyncedEdits is
    // strictly MORE precise than the original rowHasRealContent-based
    // guard it replaced — it distinguishes "this form still holds
    // exactly what was last loaded" from "the Owner has since changed
    // something," where the original boolean could not — so this
    // assertion checks for the current, correct mechanism rather than
    // the intermediate fix that introduced rowHasRealContent.
    const effectIdx = addStockSrc.indexOf('const currentSnapshot = computeDraftContentSnapshot(');
    assert.notEqual(effectIdx, -1, 'Expected the load effect to compute a current content snapshot.');
    const nearby = addStockSrc.slice(effectIdx, effectIdx + 500);
    assert.match(nearby, /const hasLocalUnsyncedEdits =/);
    assert.match(nearby, /currentSnapshot !== lastSyncedContentSnapshot\.current/);
    assert.match(nearby, /if \(!hasLocalUnsyncedEdits\) \{/);
    // computeDraftContentSnapshot itself must be built from real
    // per-row content (rowToDraftLineItem), never a bare truthiness
    // shortcut — the same underlying discipline rowHasRealContent
    // originally established, carried forward into the stronger fix.
    const snapshotFnIdx = addStockSrc.indexOf('function computeDraftContentSnapshot(');
    assert.notEqual(snapshotFnIdx, -1);
    const snapshotFnBody = addStockSrc.slice(snapshotFnIdx, snapshotFnIdx + 500);
    assert.match(snapshotFnBody, /rows\.map\(rowToDraftLineItem\)/);
  });

  it('the debounced autosave effect\'s hasAnyContent uses rowHasRealContent', () => {
    const debouncedEffectIdx = addStockSrc.indexOf("if (skipNextAutosave.current) {");
    assert.notEqual(debouncedEffectIdx, -1);
    const nearby = addStockSrc.slice(debouncedEffectIdx, debouncedEffectIdx + 300);
    assert.match(nearby, /rows\.some\(rowHasRealContent\)/);
  });

  it('flushDraftNow\'s hasAnyContent uses rowHasRealContent', () => {
    const flushIdx = addStockSrc.indexOf('const flushDraftNow = () => {');
    assert.notEqual(flushIdx, -1);
    const nearby = addStockSrc.slice(flushIdx, flushIdx + 900);
    assert.match(nearby, /r\.some\(rowHasRealContent\)/);
  });

  it('hasDraftContent (which gates the "Draft saved" indicator and the Discard-draft button) uses rowHasRealContent — this is specifically why the indicator showed on a blank form', () => {
    const idx = addStockSrc.indexOf('const hasDraftContent =');
    assert.notEqual(idx, -1);
    const nearby = addStockSrc.slice(idx, idx + 200);
    assert.match(nearby, /rows\.some\(rowHasRealContent\)/);
  });

  it('the receipt-scan merge\'s "kept" filter (the one place that was already correct) now also reuses rowHasRealContent, for full consistency', () => {
    const idx = addStockSrc.indexOf('const kept = rows.filter(rowHasRealContent);');
    assert.notEqual(idx, -1);
  });
});
