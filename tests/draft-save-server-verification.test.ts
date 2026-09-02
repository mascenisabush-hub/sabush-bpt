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

  // [Bug fix — per-product independent draft persistence] The old
  // single savePeriodicStockDraft was split into savePeriodicStockDraftItem
  // (one row's own document), savePeriodicStockDraftMeta (header fields
  // only), and flushPeriodicStockDraftRows (an atomic batch of both,
  // for interruption-durability/pre-confirmation writes) — see
  // AppContext.tsx's own comment on the periodicStockDraftMeta/
  // periodicStockDraftItemsByKey state for the full rationale. Each of
  // the three still calls getDocFromServer after its own write(s),
  // preserving this exact same "don't report saved before the server
  // actually has it" guarantee for every one of them.
  it('savePeriodicStockDraftItem calls getDocFromServer after setDoc — one row, one independent document', () => {
    const body = extractFunctionBody(appContextSrc, 'const savePeriodicStockDraftItem = async (');
    assert.match(body, /await setDoc\(itemRef, item\);/);
    assert.match(body, /await getDocFromServer\(itemRef\);/);
  });

  it('savePeriodicStockDraftMeta calls getDocFromServer after setDoc — header fields only, never row content', () => {
    const body = extractFunctionBody(appContextSrc, 'const savePeriodicStockDraftMeta = async (');
    assert.match(body, /await setDoc\(metaRef, meta\);/);
    assert.match(body, /await getDocFromServer\(metaRef\);/);
  });

  it('flushPeriodicStockDraftRows calls getDocFromServer after its batch commit — the single most consequential instance, since Contagem is the primary path to establishing Business Worth', () => {
    const body = extractFunctionBody(appContextSrc, 'const flushPeriodicStockDraftRows = async (');
    assert.match(body, /await fsBatch\.commit\(\);/);
    assert.match(body, /await getDocFromServer\(metaRef\);/);
  });
});

describe('PeriodicStockCountView.tsx — already had correct error-surfacing UI (\'save-failed\'), the getDocFromServer fix plugs directly into it', () => {
  it('draftSaveState already includes a distinct, visible save-failed state — confirmed pre-existing, not newly added here', () => {
    // [Decision 41C §1/§4] draftSaveState's literal union grew three
    // more governed states (retrying/save-blocked/save-unknown)
    // alongside the original four — 'save-failed' itself, and its
    // visible "Falha ao guardar rascunho" text, are both still exactly
    // as this test originally asserted.
    const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
    assert.match(
      periodicSrc,
      /useState<\s*'editing' \| 'saving' \| 'saved' \| 'save-failed' \| 'retrying' \| 'save-blocked' \| 'save-unknown'\s*>\('editing'\)/
    );
    assert.match(periodicSrc, /Falha ao guardar rascunho/);
  });
});

describe('InitialStockCountView.tsx — silent-catch bug fixed, matching AddStockView.tsx\'s own established pattern', () => {
  it('draftSaveState\'s type includes a visible failure state (renamed \'error\' → the governed \'save-failed\' by Decision 41C §1/§4)', () => {
    assert.match(
      initialStockSrc,
      /useState<\s*'idle' \| 'saving' \| 'saved' \| 'save-failed' \| 'retrying' \| 'save-blocked' \| 'save-unknown'\s*>\('idle'\)/
    );
  });

  it('none of the three save call sites revert to \'idle\' on failure anymore', () => {
    assert.doesNotMatch(initialStockSrc, /\.catch\(\(\) => setDraftSaveState\('idle'\)\)/);
    assert.doesNotMatch(initialStockSrc, /\.catch\(\(\) => setDraftSaveState\('idle'\)\);/);
  });

  it('every save call site sets a visible, non-idle failure state and logs diagnostic detail on failure — never silently reverts', () => {
    // [Decision 41C] The debounced autosave and manual retry now both
    // route through the shared performDraftSaveAttempt (one console.error
    // + classified state set per failure kind, not a single literal
    // 'error' string); flushDraftNow and the confirm-time flush
    // (handleOpenConfirmStep) still set their own failure state inline.
    // What this test actually guards — that failure is ALWAYS visibly
    // surfaced, never silently reverted to idle/saved — still holds:
    // every failure path sets one of save-failed/save-blocked/save-unknown.
    const consoleErrorCount = (initialStockSrc.match(/console\.error\('\[InitialStockCountView\]/g) || []).length;
    assert.ok(consoleErrorCount >= 3, 'expected diagnostic logging on at least the autosave, retry-exhausted, and flush failure paths');
    assert.match(initialStockSrc, /setDraftSaveState\('save-failed'\)/);
    assert.match(initialStockSrc, /setDraftSaveState\('save-unknown'\)/);
    assert.match(initialStockSrc, /setDraftSaveState\('save-blocked'\)/);
  });

  it('a manual retry handler exists, re-attempting with the CURRENT form state (now via performDraftSaveAttempt\'s own latestFlushArgs.current read, not a captured argument)', () => {
    const start = initialStockSrc.indexOf('const handleRetryDraftSave = () => {');
    assert.notEqual(start, -1);
    const end = initialStockSrc.indexOf('\n  };', start);
    const body = initialStockSrc.slice(start, end);
    // [Decision 41C §9] Restructured to restart a fresh generation and
    // reuse performDraftSaveAttempt (which itself reads
    // latestFlushArgs.current — the CURRENT form state — at
    // attempt-time) rather than calling saveInitialStockDraft directly
    // with a snapshot of rows/date/basis. Verify the delegation AND
    // that performDraftSaveAttempt itself genuinely reads current
    // state, so the "re-attempts with CURRENT form state" guarantee
    // this test's title makes is still actually proven.
    assert.match(body, /const generation = cancelDraftRetry\(\);\s*\n\s*performDraftSaveAttempt\(generation, 1\);/);
    const performBody = extractFunctionBody(initialStockSrc, 'const performDraftSaveAttempt = (generation: number, attemptNumber: number) => {');
    assert.match(performBody, /latestFlushArgs\.current;/);
  });

  it('the save-failed state renders a visible, distinctly-colored indicator with a retry button (renamed from \'error\' by Decision 41C)', () => {
    const start = initialStockSrc.indexOf("{draftSaveState === 'save-failed' && (");
    assert.notEqual(start, -1);
    const end = initialStockSrc.indexOf('\n              )}', start);
    const body = initialStockSrc.slice(start, end);
    assert.match(body, /text-rose-600/);
    assert.match(body, /onClick=\{handleRetryDraftSave\}/);
    assert.match(body, /Tentar novamente/);
  });
});
