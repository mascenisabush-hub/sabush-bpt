// [Bug fix — a device with a poor/interrupted connection can show
// "saved" while the write never reaches the server] Confirmed
// empirically via an Owner report: Firestore Console showed no
// purchaseDrafts document at all, despite AddStockView.tsx showing
// "Draft saved" with a checkmark on the reporting device. Root cause:
// this repo's own persistentLocalCache (firebase.ts) means setDoc's
// Promise resolves once a write is applied to the LOCAL cache and
// queued for delivery — NOT once Firestore's backend has actually
// received it. All three draft-save functions in AppContext.tsx had
// the identical vulnerability; this suite covers the fix applied to
// all three, plus the error-visibility fix this exposed was also
// needed for InitialStockCountView.tsx (which still had the original
// silent-catch bug already fixed in AddStockView.tsx earlier this
// session).
//
// SCOPE: this repository has no DOM/React render harness and
// AppContext.tsx's draft functions are tightly coupled to the live
// Firebase client SDK — established precedent (see
// tests/add-stock-draft-save-error-visibility.test.ts's own header)
// for source-inspection here.
//
// HOW TO RUN:
//   npx tsx --test tests/draft-save-server-verification.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const initialStockSrc = src('apps/tenant/src/components/InitialStockCountView.tsx');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = source.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

describe('AppContext.tsx — getDocFromServer imported and used by all three draft-save functions', () => {
  it('getDocFromServer is imported from firebase/firestore', () => {
    assert.match(appContextSrc, /getDocFromServer,/);
  });

  it('savePurchaseDraft calls getDocFromServer after setDoc, verifying the SAME docRef just written', () => {
    const body = extractFunctionBody(appContextSrc, 'const savePurchaseDraft = async (');
    const setDocIdx = body.indexOf('await setDoc(draftRef, draft);');
    const verifyIdx = body.indexOf('await getDocFromServer(draftRef);');
    assert.notEqual(setDocIdx, -1);
    assert.notEqual(verifyIdx, -1);
    assert.ok(verifyIdx > setDocIdx, 'getDocFromServer must run after setDoc, not before');
  });

  it('saveInitialStockDraft calls getDocFromServer after setDoc', () => {
    const body = extractFunctionBody(appContextSrc, 'const saveInitialStockDraft = async (');
    assert.match(body, /await setDoc\(doc\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'initial'\), draft\);/);
    assert.match(body, /await getDocFromServer\(doc\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'initial'\)\);/);
  });

  it('savePeriodicStockDraft calls getDocFromServer after setDoc — the single most consequential instance, since Contagem is the primary path to establishing Business Worth', () => {
    const body = extractFunctionBody(appContextSrc, 'const savePeriodicStockDraft = async (');
    assert.match(body, /await setDoc\(doc\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic'\), draft\);/);
    assert.match(body, /await getDocFromServer\(doc\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic'\)\);/);
  });
});

describe('PeriodicStockCountView.tsx — already had correct error-surfacing UI (\'save-failed\'), the getDocFromServer fix plugs directly into it', () => {
  it('draftSaveState already includes a distinct, visible save-failed state — confirmed pre-existing, not newly added here', () => {
    const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
    assert.match(periodicSrc, /useState<'editing' \| 'saving' \| 'saved' \| 'save-failed'>\('editing'\)/);
    assert.match(periodicSrc, /Falha ao guardar rascunho/);
  });
});

describe('InitialStockCountView.tsx — silent-catch bug fixed, matching AddStockView.tsx\'s own established pattern', () => {
  it('draftSaveState\'s type includes an \'error\' state', () => {
    assert.match(initialStockSrc, /useState<'idle' \| 'saving' \| 'saved' \| 'error'>\('idle'\)/);
  });

  it('none of the three save call sites revert to \'idle\' on failure anymore', () => {
    assert.doesNotMatch(initialStockSrc, /\.catch\(\(\) => setDraftSaveState\('idle'\)\)/);
    assert.doesNotMatch(initialStockSrc, /\.catch\(\(\) => setDraftSaveState\('idle'\)\);/);
  });

  it('all three save call sites set \'error\' and log diagnostic detail on failure', () => {
    const errorSetCount = (initialStockSrc.match(/setDraftSaveState\('error'\)/g) || []).length;
    const consoleErrorCount = (initialStockSrc.match(/console\.error\('\[InitialStockCountView\]/g) || []).length;
    assert.equal(errorSetCount, 3, 'Expected the debounced autosave, the manual retry handler, and the flush-on-exit path to all set error');
    assert.equal(consoleErrorCount, 3);
  });

  it('a manual retry handler exists, re-attempting with the CURRENT form state', () => {
    const start = initialStockSrc.indexOf('const handleRetryDraftSave = () => {');
    assert.notEqual(start, -1);
    const end = initialStockSrc.indexOf('\n  };', start);
    const body = initialStockSrc.slice(start, end);
    assert.match(body, /saveInitialStockDraft\(rows\.map\(rowToDraftItem\), date, initialCapitalBasis\)/);
  });

  it('the error state renders a visible, distinctly-colored indicator with a retry button', () => {
    const start = initialStockSrc.indexOf("{draftSaveState === 'error' && (");
    assert.notEqual(start, -1);
    const end = initialStockSrc.indexOf('\n              )}', start);
    const body = initialStockSrc.slice(start, end);
    assert.match(body, /text-rose-600/);
    assert.match(body, /onClick=\{handleRetryDraftSave\}/);
    assert.match(body, /Tentar novamente/);
  });
});
