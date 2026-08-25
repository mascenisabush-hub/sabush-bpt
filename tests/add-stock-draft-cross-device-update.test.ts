// [Bug fix — cross-device draft update missed while a tab stays open]
// Owner-reported: "Draft saved" confirmed on the phone, same login and
// same shop on the computer, yet the draft didn't appear even after a
// hard refresh. Investigating the restore effect found a real,
// separate bug: draftLoaded was a one-way latch — the FIRST Firestore
// answer (even "no draft exists yet") permanently set it true, and the
// effect's own guard clause then silently ignored every LATER
// purchaseDraft update for the rest of that page session. Concretely:
// open Add Stock on a computer before a draft exists, then save one
// from a phone — the live onSnapshot listener correctly delivers the
// new draft to the already-open tab, but the effect never re-ran to
// load it.
//
// Whether this fully explains the specific report is uncertain (a
// genuine hard refresh remounts the component and resets this latch
// too, which is why Firebase Console verification was also
// recommended) -- but this is a real, separate bug regardless, for
// anyone leaving Add Stock open on one device while updating the draft
// from another.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-draft-cross-device-update.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('AddStockView.tsx — the load effect no longer has a one-way "already loaded" latch', () => {
  it('lastProcessedDraftSignature ref is declared, replacing a mere draftLoaded check as the effect\'s own re-entry guard', () => {
    assert.match(addStockSrc, /const lastProcessedDraftSignature = useRef<string \| undefined>\(undefined\);/);
  });

  it('the load effect no longer bails out unconditionally on draftLoaded — that check was the actual one-way latch', () => {
    const start = addStockSrc.indexOf('useEffect(() => {\n    if (loadedForBusinessId !== activeBusinessId) return;');
    assert.notEqual(start, -1, 'Expected the load effect to no longer start with "if (draftLoaded) return;"');
  });

  it('the effect computes a draftSignature from purchaseDraft.updatedAt (or the literal \'none\' for no draft) and only proceeds when it differs from the last-processed one', () => {
    const start = addStockSrc.indexOf('const draftSignature = purchaseDraft ? purchaseDraft.updatedAt : \'none\';');
    assert.notEqual(start, -1);
    const nearby = addStockSrc.slice(start, start + 300);
    assert.match(nearby, /if \(lastProcessedDraftSignature\.current === draftSignature\) return;/);
    assert.match(nearby, /lastProcessedDraftSignature\.current = draftSignature;/);
  });

  it('a transition back to null (draft discarded elsewhere) after real content was already loaded does not wipe the form — only the very first null resolution seeds the empty-row default', () => {
    const start = addStockSrc.indexOf('if (purchaseDraft === null) {');
    const end = addStockSrc.indexOf('\n    }', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /if \(!draftLoaded\) \{/);
  });

  it('the business-switch reset effect clears lastProcessedDraftSignature alongside draftLoaded, so switching businesses re-arms both correctly', () => {
    const start = addStockSrc.indexOf("setDraftLoaded(false); // re-arms the load effect below for the new business");
    assert.notEqual(start, -1);
    const nearby = addStockSrc.slice(start, start + 400);
    assert.match(nearby, /lastProcessedDraftSignature\.current = undefined;/);
  });

  it('"already started typing" protection is unaffected — still checked before adopting a real (non-null) draft, exactly as before this fix', () => {
    assert.match(addStockSrc, /const userHasStartedTyping = rows\.some\(/);
  });
});
