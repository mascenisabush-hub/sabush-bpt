// [Bug fix — scanned receipt data lost if the user leaves the page
// within the autosave debounce window] Owner-reported and confirmed
// via Firestore Console: after scanning a receipt on the phone (the
// form visibly filled in with real items), the purchaseDrafts document
// on the server contained only the pristine DEFAULT empty row
// (productName: "", quantity: the '50' placeholder) — not the scanned
// data at all, despite the phone's screen briefly showing it correctly.
//
// Root cause: handleFileSelected previously only called setRows(...)
// with the scan's results and relied entirely on the ordinary autosave
// effect (deliberately 800ms debounced, so a fast typist doesn't
// trigger a write per keystroke) to eventually persist it. A completed
// scan is not typing — it's a single, already-finished batch of real
// data. If the tab is backgrounded, the app is switched away from, or
// the person navigates off within that 800ms window — the exact
// cross-device workflow this feature exists for ("scan on the phone,
// finish on the computer") — the debounced save's pending setTimeout
// is cancelled by the effect's own cleanup before it ever fires, and
// the scan result is silently lost with no visible sign anything went
// wrong.
//
// Fix: a successful scan now ALSO saves immediately, synchronously
// within handleFileSelected, bypassing the debounce entirely — using
// a concretely-computed finalRows/finalSupplierName/finalDate (not the
// setRows functional-updater's own internal `prev`), so this exact
// same data is both rendered AND durably saved before the function
// returns. The ordinary debounced autosave effect is left otherwise
// unchanged and still also fires shortly after — harmless, same data,
// last-write-wins.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-scan-immediate-save.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

function extractHandleFileSelected(source: string): string {
  const start = source.indexOf('const handleFileSelected = async (');
  assert.notEqual(start, -1);
  const end = source.indexOf('\n  // Explicit "reject this scan"', start);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

describe('AddStockView.tsx — a successful scan saves immediately, not only via the debounced autosave', () => {
  const body = extractHandleFileSelected(addStockSrc);

  it('finalRows is computed as a concrete array (from the current rows, not inside setRows\' own functional updater) so the exact same data can be saved immediately', () => {
    assert.match(body, /const kept = rows\.filter\(/);
    assert.match(body, /const finalRows = \[\.\.\.kept, \.\.\.newRows\];/);
    assert.match(body, /setRows\(finalRows\);/);
  });

  it('finalSupplierName and finalDate are likewise computed concretely, not left as stale pre-scan closure values', () => {
    assert.match(body, /const finalSupplierName =/);
    assert.match(body, /const finalDate =/);
  });

  it('savePurchaseDraft is called directly and awaited inside handleFileSelected itself, using finalRows/finalSupplierName/finalDate — not merely relying on the debounced autosave effect', () => {
    assert.match(body, /await savePurchaseDraft\(\s*\n\s*finalRows\.map\(rowToDraftLineItem\),/);
  });

  it('the immediate save sets the exact same draftSaveState values (\'saving\'/\'saved\'/\'error\') as the debounced autosave, so its own visible indicator and error+retry UI apply here too — not a separate silent path', () => {
    const saveBlockStart = body.indexOf('try {\n      setDraftSaveState');
    assert.notEqual(saveBlockStart, -1);
    const saveBlock = body.slice(saveBlockStart);
    assert.match(saveBlock, /setDraftSaveState\('saving'\);/);
    assert.match(saveBlock, /setDraftSaveState\('saved'\);/);
    assert.match(saveBlock, /catch \(err\) \{[\s\S]*?setDraftSaveState\('error'\);/);
  });

  it('the immediate save happens AFTER scanState is reset to idle, so the UI is already showing the merged rows normally while the save completes in the background', () => {
    const idleIdx = body.indexOf("setScanState('idle');");
    const saveIdx = body.indexOf('await savePurchaseDraft(');
    assert.notEqual(idleIdx, -1);
    assert.notEqual(saveIdx, -1);
    assert.ok(idleIdx < saveIdx, 'scanState must be reset to idle before the immediate save runs');
  });
});
