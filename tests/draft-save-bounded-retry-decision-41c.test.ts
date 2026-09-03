// [Decision 41C — Draft Save Failure Classification + Bounded Retries;
// Implementation Plan §16] Source-text / control-flow ordering tests
// for the View-level and AppContext-level wiring — same established
// methodology as this repo's own
// tests/business-switch-flush-protection-decision-41a.test.ts (see
// that file's own header comment for the full rationale: for
// straight-line code with no branching that could reorder statements,
// source order of `await`/assignment statements IS runtime order, so
// an index-based ordering assertion is a genuine proof here). Pure
// classification-logic behavior (transient/blocked/unknown routing,
// the exact 1s/2s/4s retry sequence, max-attempts) is instead covered
// by real runtime unit tests in
// draft-save-failure-classification-decision-41c.test.ts, since that
// module has no React/DOM dependency.
//
// HOW TO RUN:
//   npx tsx --test tests/draft-save-bounded-retry-decision-41c.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const periodicSrc = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const initialSrc = readFileSync(new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(src: string, signatureMarker: string): string {
  assert.ok(signatureMarker.trimEnd().endsWith('{'), "signatureMarker must end with the function's own opening brace");
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = src.slice(start);
  const braceStart = signatureMarker.length - 1;
  let depth = 0;
  for (let i = braceStart; i < rest.length; i++) {
    if (rest[i] === '{') depth++;
    if (rest[i] === '}') {
      depth--;
      if (depth === 0) return rest.slice(0, i + 1);
    }
  }
  throw new Error(`Could not find a balanced closing brace for ${signatureMarker}`);
}

// ==================================================================
// §2 — Readback-uncertain wiring in AppContext.tsx
// ==================================================================

describe('AppContext.tsx — Decision 41C §2 readback-unconfirmed wrapping', () => {
  it('imports ReadbackUnconfirmedError from the classification module', () => {
    assert.match(appContextSrc, /import \{ ReadbackUnconfirmedError \} from '\.\.\/lib\/draftSaveFailureClassification';/);
  });

  for (const fnMarker of [
    'const saveInitialStockDraft = async (items: InitialStockDraftItem[], date: string, initialCapitalBasis?: InitialCapitalBasis) => {',
    'const savePeriodicStockDraftItem = async (rowKey: string, item: PeriodicStockDraftItem) => {',
  ]) {
    it(`wraps getDocFromServer in try/catch and rethrows ReadbackUnconfirmedError in: ${fnMarker.slice(0, 60)}...`, () => {
      const body = extractFunctionBody(appContextSrc, fnMarker);
      const tryIdx = body.indexOf('try {');
      const getDocIdx = body.indexOf('await getDocFromServer(');
      const catchIdx = body.indexOf('} catch (readbackError) {');
      const throwIdx = body.indexOf('throw new ReadbackUnconfirmedError(readbackError);');
      assert.notEqual(tryIdx, -1);
      assert.notEqual(getDocIdx, -1);
      assert.notEqual(catchIdx, -1);
      assert.notEqual(throwIdx, -1);
      assert.ok(
        tryIdx < getDocIdx && getDocIdx < catchIdx && catchIdx < throwIdx,
        'getDocFromServer must be inside a try block whose catch rethrows ReadbackUnconfirmedError'
      );
    });
  }

  it('savePeriodicStockDraftMeta wraps its getDocFromServer readback the same way', () => {
    const body = extractFunctionBody(
      appContextSrc,
      'const savePeriodicStockDraftMeta = async (\n    type: StockCountType,\n    label: string | undefined,\n    date: string,\n    submissionId?: string,\n    newProductInfo?: Record<\n      string,\n      { purchaseUnit: string; relationshipSteps: { unit: string; factor: string }[] }\n    >\n  ) => {'
    );
    assert.match(body, /try \{\s*await getDocFromServer\(metaRef\);\s*\} catch \(readbackError\) \{\s*throw new ReadbackUnconfirmedError\(readbackError\);\s*\}/);
  });

  it('flushPeriodicStockDraftRows wraps its getDocFromServer readback the same way (the batch-write flush path)', () => {
    const body = extractFunctionBody(
      appContextSrc,
      'const flushPeriodicStockDraftRows = async (\n    rowsByKey: Record<string, PeriodicStockDraftItem>,\n    type: StockCountType,\n    label: string | undefined,\n    date: string,\n    submissionId?: string,\n    newProductInfo?: Record<\n      string,\n      { purchaseUnit: string; relationshipSteps: { unit: string; factor: string }[] }\n    >\n  ) => {'
    );
    assert.match(body, /try \{\s*await getDocFromServer\(metaRef\);\s*\} catch \(readbackError\) \{\s*throw new ReadbackUnconfirmedError\(readbackError\);\s*\}/);
  });

  it('every wrapped write still calls setDoc/commit BEFORE the try/getDocFromServer block — the write itself is never swallowed by the wrapping', () => {
    const saveItemBody = extractFunctionBody(appContextSrc, 'const savePeriodicStockDraftItem = async (rowKey: string, item: PeriodicStockDraftItem) => {');
    const setDocIdx = saveItemBody.indexOf('await setDoc(itemRef, item);');
    const tryIdx = saveItemBody.indexOf('try {');
    assert.notEqual(setDocIdx, -1);
    assert.notEqual(tryIdx, -1);
    assert.ok(setDocIdx < tryIdx, 'setDoc must be awaited (and its own errors thrown un-wrapped) before the readback try/catch begins');
  });
});

// ==================================================================
// PeriodicStockCountView.tsx — per-row bounded retry
// ==================================================================

describe('PeriodicStockCountView.tsx — Decision 41C imports and state', () => {
  it('imports classifyDraftSaveError and nextRetryDelayMs', () => {
    assert.match(periodicSrc, /import \{ classifyDraftSaveError, nextRetryDelayMs \} from '\.\.\/lib\/draftSaveFailureClassification';/);
  });

  it('draftSaveState includes all seven governed states', () => {
    assert.match(
      periodicSrc,
      /'editing' \| 'saving' \| 'saved' \| 'save-failed' \| 'retrying' \| 'save-blocked' \| 'save-unknown'/
    );
  });

  it('declares rowRetryRef as a per-row Map (§5 — not a single global timer)', () => {
    assert.match(
      periodicSrc,
      /const rowRetryRef = useRef<Map<string, \{ timer: ReturnType<typeof setTimeout> \| null; generation: number \}>>\(new Map\(\)\);/
    );
  });

  it('declares manualRetryEligibleRowsRef as a per-row Set (§9)', () => {
    assert.match(periodicSrc, /const manualRetryEligibleRowsRef = useRef<Set<string>>\(new Set\(\)\);/);
  });
});

describe('PeriodicStockCountView.tsx — cancelRowRetry (§6/§8 generation/invalidation mechanism)', () => {
  const body = extractFunctionBody(periodicSrc, 'const cancelRowRetry = (rowKey: string): number => {');

  it('clears the row\'s existing pending timer before bumping the generation', () => {
    const clearIdx = body.indexOf('if (existingEntry?.timer) clearTimeout(existingEntry.timer);');
    const bumpIdx = body.indexOf('const generation = (existingEntry?.generation ?? 0) + 1;');
    assert.notEqual(clearIdx, -1);
    assert.notEqual(bumpIdx, -1);
    assert.ok(clearIdx < bumpIdx);
  });

  it('always returns a strictly incrementing generation for the row', () => {
    assert.match(body, /return generation;/);
  });
});

describe('PeriodicStockCountView.tsx — scheduleRowDraftSave (§6: newer edit cancels old retry)', () => {
  const body = extractFunctionBody(periodicSrc, 'const scheduleRowDraftSave = (rowKey: string) => {');

  it('cancels the row\'s pending retry (via cancelRowRetry) BEFORE scheduling the new debounce timer — not only when the timer eventually fires', () => {
    const cancelIdx = body.indexOf('const generation = cancelRowRetry(rowKey);');
    const setTimeoutIdx = body.indexOf('const timer = setTimeout(() => {');
    assert.notEqual(cancelIdx, -1);
    assert.notEqual(setTimeoutIdx, -1);
    assert.ok(cancelIdx < setTimeoutIdx, 'cancelRowRetry must run synchronously at schedule-time, invalidating any old retry immediately');
  });

  it('removes the row from the manual-retry-eligible set on every fresh edit', () => {
    assert.match(body, /manualRetryEligibleRowsRef\.current\.delete\(rowKey\);/);
  });

  it('captures the freshly bumped generation and passes it into the debounce timer\'s own closure for attempt 1', () => {
    assert.match(body, /performRowSaveAttempt\(rowKey, generation, 1\);/);
  });

  it('still clears any pre-existing DEBOUNCE timer for the row (unchanged pre-41C behavior)', () => {
    assert.match(body, /const existing = rowDebounceTimersRef\.current\.get\(rowKey\);\s*\n\s*if \(existing\) clearTimeout\(existing\);/);
  });
});

describe('PeriodicStockCountView.tsx — performRowSaveAttempt (§1/§3/§4/§7/§8/§9)', () => {
  const body = extractFunctionBody(
    periodicSrc,
    'const performRowSaveAttempt = async (rowKey: string, generation: number, attemptNumber: number) => {'
  );

  it('verifies the attempt still belongs to the current generation before doing any work (§8 stale-attempt guard)', () => {
    const idx = body.indexOf('if (!belongsToCurrentGeneration()) return;');
    assert.notEqual(idx, -1);
    // Must appear before the serialization await AND before the actual write.
    const serializationIdx = body.indexOf('await draftInFlightSaveRef.current;');
    assert.ok(idx < serializationIdx);
  });

  it('re-verifies generation AFTER awaiting the existing in-flight save (§8 — a flush/newer edit could have superseded it while waiting)', () => {
    const matches = [...body.matchAll(/belongsToCurrentGeneration\(\)/g)];
    assert.ok(matches.length >= 3, 'expected at least 3 generation checks: pre-wait guard, post-wait guard, and inside both .then/.catch handlers');
  });

  it('preserves existing serialization: awaits draftInFlightSaveRef.current before issuing its own write (§7)', () => {
    const awaitIdx = body.indexOf('await draftInFlightSaveRef.current;');
    const rawSaveIdx = body.indexOf('let rawSavePromise: Promise<string>;');
    assert.notEqual(awaitIdx, -1);
    assert.notEqual(rawSaveIdx, -1);
    assert.ok(awaitIdx < rawSaveIdx);
  });

  it('reads live row/meta state from latestFlushArgs.current at attempt-time, never a captured argument', () => {
    assert.match(body, /latestFlushArgs\.current;/);
  });

  it('routes to the same two narrower write functions as before (meta vs. row), unchanged routing logic', () => {
    assert.match(body, /savePeriodicStockDraftMeta\(/);
    assert.match(body, /savePeriodicStockDraftItem\(/);
  });

  it('classifies the error via classifyDraftSaveError, passing the live subscriptionBlocksNewRecords flag', () => {
    assert.match(body, /classifyDraftSaveError\(err, \{ subscriptionBlocksNewRecords \}\)/);
  });

  it("on 'transient' with retries remaining: schedules the next attempt via nextRetryDelayMs and sets 'retrying', storing the new timer under the SAME generation", () => {
    const transientIdx = body.indexOf("if (classification === 'transient') {");
    const delayIdx = body.indexOf('const delay = nextRetryDelayMs(attemptNumber);');
    const retryStateIdx = body.indexOf("setDraftSaveState('retrying');");
    const rescheduleIdx = body.indexOf('performRowSaveAttempt(rowKey, generation, attemptNumber + 1);');
    const storeIdx = body.indexOf('rowRetryRef.current.set(rowKey, { timer, generation });');
    assert.notEqual(transientIdx, -1);
    assert.notEqual(delayIdx, -1);
    assert.notEqual(retryStateIdx, -1);
    assert.notEqual(rescheduleIdx, -1);
    assert.notEqual(storeIdx, -1);
    assert.ok(transientIdx < delayIdx && delayIdx < retryStateIdx && retryStateIdx < rescheduleIdx && rescheduleIdx < storeIdx);
  });

  it("on 'transient' with retries exhausted (delay === null): adds the row to manualRetryEligibleRowsRef and sets 'save-failed' — never automatically retried further", () => {
    assert.match(
      body,
      /\/\/ Retries exhausted \(§3\)\.\s*\n\s*manualRetryEligibleRowsRef\.current\.add\(rowKey\);\s*\n\s*setDraftSaveState\('save-failed'\);/
    );
  });

  it("on 'save-blocked': sets 'save-blocked' and does NOT add the row to manualRetryEligibleRowsRef (§9 — no manual retry for legitimate blocking)", () => {
    const blockedIdx = body.indexOf("if (classification === 'save-blocked') {");
    assert.notEqual(blockedIdx, -1);
    const blockedBranch = body.slice(blockedIdx, blockedIdx + 300);
    assert.match(blockedBranch, /setDraftSaveState\('save-blocked'\);/);
    assert.doesNotMatch(blockedBranch, /manualRetryEligibleRowsRef\.current\.add/);
  });

  it("falls through to 'save-unknown' for every other classification, adding the row to manualRetryEligibleRowsRef (§9 manual-retry eligible)", () => {
    const tailIdx = body.lastIndexOf("manualRetryEligibleRowsRef.current.add(rowKey);");
    const stateIdx = body.lastIndexOf("setDraftSaveState('save-unknown');");
    assert.notEqual(tailIdx, -1);
    assert.notEqual(stateIdx, -1);
    assert.ok(tailIdx < stateIdx);
  });

  it('on success, removes the row from manualRetryEligibleRowsRef and sets \'saved\', but only if the attempt still belongs to the current generation', () => {
    const thenIdx = body.indexOf('.then((updatedAt) => {');
    const guardIdx = body.indexOf('if (!belongsToCurrentGeneration()) return;', thenIdx);
    const deleteIdx = body.indexOf('manualRetryEligibleRowsRef.current.delete(rowKey);', thenIdx);
    const savedIdx = body.indexOf("setDraftSaveState('saved');", thenIdx);
    assert.notEqual(thenIdx, -1);
    assert.notEqual(guardIdx, -1);
    assert.notEqual(deleteIdx, -1);
    assert.notEqual(savedIdx, -1);
    assert.ok(thenIdx < guardIdx && guardIdx < deleteIdx && deleteIdx < savedIdx);
  });

  it('always clears draftInFlightSaveRef in a finally block, exactly as the pre-41C implementation did', () => {
    assert.match(body, /\.finally\(\(\) => \{\s*draftInFlightSaveRef\.current = null;\s*\}\);/);
  });
});

describe('PeriodicStockCountView.tsx — handleManualRetryDraftSave (§9 manual retry)', () => {
  const body = extractFunctionBody(periodicSrc, 'const handleManualRetryDraftSave = () => {');

  it('retries every row currently in manualRetryEligibleRowsRef', () => {
    assert.match(body, /const rowKeys = Array\.from\(manualRetryEligibleRowsRef\.current\);/);
  });

  it('restarts each row at a fresh generation (attempt 1), reusing performRowSaveAttempt — no parallel retry mechanism', () => {
    assert.match(body, /const generation = cancelRowRetry\(rowKey\);\s*\n\s*performRowSaveAttempt\(rowKey, generation, 1\);/);
  });
});

describe('PeriodicStockCountView.tsx — cancelAllRowRetries wired into every existing timer-cleanup site (§7/§10/§11)', () => {
  it('is defined and clears every row\'s timer before clearing the whole map', () => {
    const body = extractFunctionBody(periodicSrc, 'const cancelAllRowRetries = () => {');
    assert.match(body, /rowRetryRef\.current\.forEach\(\(entry\) => \{\s*if \(entry\.timer\) clearTimeout\(entry\.timer\);\s*\}\);/);
    assert.match(body, /rowRetryRef\.current\.clear\(\);/);
  });

  it('is called in the business-switch reset effect, immediately after clearing rowDebounceTimersRef (§11)', () => {
    const idx = periodicSrc.indexOf('rowDebounceTimersRef.current.clear();\n    // [Decision 41C §11] A business switch must never leave a pending');
    assert.notEqual(idx, -1);
    const nearby = periodicSrc.slice(idx, idx + 400);
    assert.match(nearby, /cancelAllRowRetries\(\);/);
    assert.match(nearby, /manualRetryEligibleRowsRef\.current\.clear\(\);/);
  });

  it('is called inside flushPeriodicDraftNow, before the flush\'s own write (§7)', () => {
    const body = extractFunctionBody(periodicSrc, 'const flushPeriodicDraftNow = () => {');
    const clearIdx = body.indexOf('rowDebounceTimersRef.current.clear();');
    const cancelIdx = body.indexOf('cancelAllRowRetries();');
    const writeIdx = body.indexOf('flushPeriodicStockDraftRows(rowsByKey');
    assert.notEqual(clearIdx, -1);
    assert.notEqual(cancelIdx, -1);
    assert.notEqual(writeIdx, -1);
    assert.ok(clearIdx < cancelIdx && cancelIdx < writeIdx);
  });

  it('is called inside flushForSwitchIfNeeded, and the early-return guard also accounts for a pending retry with no debounce timer/in-flight save (§11)', () => {
    const body = extractFunctionBody(periodicSrc, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');
    assert.match(
      body,
      /if \(rowDebounceTimersRef\.current\.size === 0 && !draftInFlightSaveRef\.current && rowRetryRef\.current\.size === 0\) \{/
    );
    assert.match(body, /cancelAllRowRetries\(\);/);
  });

  it('is called inside handleRequestConfirmation, before the identity write (§7)', () => {
    const idx = periodicSrc.indexOf("submissionIdRef.current = 'submission-'");
    assert.notEqual(idx, -1);
    const nearby = periodicSrc.slice(idx, idx + 900);
    assert.match(nearby, /cancelAllRowRetries\(\);/);
  });

  it('is called inside handleConfirmSave, before finalization begins (§7)', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleConfirmSave = async () => {');
    const clearIdx = body.indexOf('rowDebounceTimersRef.current.clear();');
    const cancelIdx = body.indexOf('cancelAllRowRetries();');
    assert.notEqual(clearIdx, -1);
    assert.notEqual(cancelIdx, -1);
    assert.ok(clearIdx < cancelIdx);
  });
});

describe('PeriodicStockCountView.tsx — UI renders the three new governed states with correct manual-retry affordance', () => {
  it("renders 'retrying' as distinct copy, no button", () => {
    assert.match(periodicSrc, /\{draftSaveState === 'retrying' && 'A tentar guardar novamente…'\}/);
  });

  it("renders 'save-failed' with a manual-retry button calling handleManualRetryDraftSave", () => {
    const idx = periodicSrc.indexOf("{draftSaveState === 'save-failed' && (");
    assert.notEqual(idx, -1);
    const nearby = periodicSrc.slice(idx, idx + 400);
    assert.match(nearby, /onClick=\{handleManualRetryDraftSave\}/);
  });

  it("renders 'save-unknown' with a manual-retry button calling handleManualRetryDraftSave", () => {
    const idx = periodicSrc.indexOf("{draftSaveState === 'save-unknown' && (");
    assert.notEqual(idx, -1);
    const nearby = periodicSrc.slice(idx, idx + 400);
    assert.match(nearby, /onClick=\{handleManualRetryDraftSave\}/);
  });

  it("renders 'save-blocked' with NO retry button (§9 — legitimate blocking is never manual-retry eligible)", () => {
    const idx = periodicSrc.indexOf("{draftSaveState === 'save-blocked' && (");
    assert.notEqual(idx, -1);
    const nearby = periodicSrc.slice(idx, idx + 200);
    assert.doesNotMatch(nearby, /onClick=/);
  });
});

// ==================================================================
// InitialStockCountView.tsx — single-target bounded retry
// ==================================================================

describe('InitialStockCountView.tsx — Decision 41C imports and state', () => {
  it('imports classifyDraftSaveError and nextRetryDelayMs', () => {
    assert.match(initialSrc, /import \{ classifyDraftSaveError, nextRetryDelayMs \} from '\.\.\/lib\/draftSaveFailureClassification';/);
  });

  it('draftSaveState includes all six governed states for this view', () => {
    assert.match(initialSrc, /'idle' \| 'saving' \| 'saved' \| 'save-failed' \| 'retrying' \| 'save-blocked' \| 'save-unknown'/);
  });

  it('declares draftRetryRef as a single-target ref (this view has exactly one save target, not per-row)', () => {
    assert.match(
      initialSrc,
      /const draftRetryRef = useRef<\{ timer: ReturnType<typeof setTimeout> \| null; generation: number \}>\(\{/
    );
  });

  it('declares manualRetryEligibleRef (§9)', () => {
    assert.match(initialSrc, /const manualRetryEligibleRef = useRef\(false\);/);
  });
});

describe('InitialStockCountView.tsx — cancelDraftRetry (§6/§8)', () => {
  const body = extractFunctionBody(initialSrc, 'const cancelDraftRetry = (): number => {');
  it('clears the pending timer before bumping the generation and returns it', () => {
    assert.match(
      body,
      /if \(draftRetryRef\.current\.timer\) clearTimeout\(draftRetryRef\.current\.timer\);\s*\n\s*const generation = draftRetryRef\.current\.generation \+ 1;/
    );
    assert.match(body, /return generation;/);
  });
});

describe('InitialStockCountView.tsx — performDraftSaveAttempt (§1/§3/§4/§9)', () => {
  const body = extractFunctionBody(initialSrc, 'const performDraftSaveAttempt = (generation: number, attemptNumber: number) => {');

  it('verifies the attempt still belongs to the current generation before doing any work (§8)', () => {
    assert.match(body, /if \(draftRetryRef\.current\.generation !== generation\) return; \/\/ superseded by a newer attempt already/);
  });

  it('reads live state from latestFlushArgs.current at attempt-time', () => {
    assert.match(body, /latestFlushArgs\.current;/);
  });

  it('classifies the error via classifyDraftSaveError with the live subscriptionBlocksNewRecords flag', () => {
    assert.match(body, /classifyDraftSaveError\(err, \{ subscriptionBlocksNewRecords \}\)/);
  });

  it("on 'transient' with retries remaining: schedules the next attempt via nextRetryDelayMs, sets 'retrying'", () => {
    const transientIdx = body.indexOf("if (classification === 'transient') {");
    const delayIdx = body.indexOf('const delay = nextRetryDelayMs(attemptNumber);');
    const retryingIdx = body.indexOf("setDraftSaveState('retrying');");
    const rescheduleIdx = body.indexOf('performDraftSaveAttempt(generation, attemptNumber + 1);');
    assert.notEqual(transientIdx, -1);
    assert.notEqual(delayIdx, -1);
    assert.notEqual(retryingIdx, -1);
    assert.notEqual(rescheduleIdx, -1);
    assert.ok(transientIdx < delayIdx && delayIdx < retryingIdx && retryingIdx < rescheduleIdx);
  });

  it("on 'transient' with retries exhausted: sets manualRetryEligibleRef true and 'save-failed'", () => {
    assert.match(
      body,
      /\/\/ Retries exhausted \(§3\)\.\s*\n\s*console\.error\([^)]*\);\s*\n\s*manualRetryEligibleRef\.current = true;\s*\n\s*setDraftSaveState\('save-failed'\);/
    );
  });

  it("on 'save-blocked': sets 'save-blocked' without marking manual-retry eligible", () => {
    const blockedIdx = body.indexOf("if (classification === 'save-blocked') {");
    assert.notEqual(blockedIdx, -1);
    const blockedBranch = body.slice(blockedIdx, blockedIdx + 250);
    assert.match(blockedBranch, /setDraftSaveState\('save-blocked'\);/);
    assert.doesNotMatch(blockedBranch, /manualRetryEligibleRef\.current = true/);
  });

  it("falls through to 'save-unknown' for every other classification, marking manual-retry eligible", () => {
    const tailIdx = body.lastIndexOf('manualRetryEligibleRef.current = true;');
    const stateIdx = body.lastIndexOf("setDraftSaveState('save-unknown');");
    assert.notEqual(tailIdx, -1);
    assert.notEqual(stateIdx, -1);
    assert.ok(tailIdx < stateIdx);
  });

  it('on success, clears manualRetryEligibleRef and sets \'saved\' only if still current generation', () => {
    const thenIdx = body.indexOf('.then(() => {');
    const guardIdx = body.indexOf('if (draftRetryRef.current.generation !== generation) return;', thenIdx);
    const clearIdx = body.indexOf('manualRetryEligibleRef.current = false;', thenIdx);
    const savedIdx = body.indexOf("setDraftSaveState('saved');", thenIdx);
    assert.notEqual(thenIdx, -1);
    assert.notEqual(guardIdx, -1);
    assert.notEqual(clearIdx, -1);
    assert.notEqual(savedIdx, -1);
    assert.ok(thenIdx < guardIdx && guardIdx < clearIdx && clearIdx < savedIdx);
  });
});

describe('InitialStockCountView.tsx — autosave effect / manual retry / flush all cancel-then-attempt through the shared mechanism (§6/§7/§9)', () => {
  it('the debounced autosave effect calls cancelDraftRetry() synchronously (not inside the setTimeout) before scheduling the new debounce timer', () => {
    const effectIdx = initialSrc.indexOf('useEffect(() => {\n    if (!draftLoaded || hasInitialStockCount || isSaving || savedMessage) return;');
    assert.notEqual(effectIdx, -1);
    const effectSlice = initialSrc.slice(effectIdx, effectIdx + 1600);
    const cancelIdx = effectSlice.indexOf('const generation = cancelDraftRetry();');
    const setTimeoutIdx = effectSlice.indexOf('const handle = setTimeout(() => {');
    assert.notEqual(cancelIdx, -1);
    assert.notEqual(setTimeoutIdx, -1);
    assert.ok(cancelIdx < setTimeoutIdx);
  });

  it('handleRetryDraftSave cancels the retry and restarts at attempt 1, reusing performDraftSaveAttempt', () => {
    const body = extractFunctionBody(initialSrc, 'const handleRetryDraftSave = () => {');
    assert.match(body, /const generation = cancelDraftRetry\(\);\s*\n\s*performDraftSaveAttempt\(generation, 1\);/);
  });

  it('flushDraftNow cancels any pending retry before issuing its own write (§7), and never schedules a further automatic retry itself', () => {
    const body = extractFunctionBody(initialSrc, 'const flushDraftNow = () => {');
    const cancelIdx = body.indexOf('const generation = cancelDraftRetry();');
    const writeIdx = body.indexOf('saveInitialStockDraft(r.map(rowToDraftItem), d, basis)');
    assert.notEqual(cancelIdx, -1);
    assert.notEqual(writeIdx, -1);
    assert.ok(cancelIdx < writeIdx);
    assert.doesNotMatch(body, /nextRetryDelayMs/, 'flushDraftNow must be one-shot — no automatic retry scheduling in a pagehide/unmount context');
  });

  it('flushForSwitchIfNeeded treats a pending retry (with no other pending work) as pending, and cancels it before returning success (§11)', () => {
    const body = extractFunctionBody(initialSrc, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');
    assert.match(body, /if \(!hasAnyContent && !draftRetryRef\.current\.timer\) return \{ success: true \};/);
    assert.match(body, /const generation = cancelDraftRetry\(\);/);
  });

  it('handleOpenConfirmStep (the confirm-time flush) cancels any pending retry before its own write (§7)', () => {
    const idx = initialSrc.indexOf('const handleOpenConfirmStep = async () => {');
    assert.notEqual(idx, -1);
    const nearby = initialSrc.slice(idx, idx + 1100);
    assert.match(nearby, /cancelDraftRetry\(\);/);
  });

  it('the business-switch reset effect cancels the retry and clears manual-retry eligibility (§11)', () => {
    const idx = initialSrc.indexOf("setDraftSaveState('idle');\n    skipNextAutosave.current = false;");
    assert.notEqual(idx, -1);
    const nearby = initialSrc.slice(idx, idx + 400);
    assert.match(nearby, /cancelDraftRetry\(\);/);
    assert.match(nearby, /manualRetryEligibleRef\.current = false;/);
  });
});

describe('InitialStockCountView.tsx — UI renders the three new governed states with correct manual-retry affordance', () => {
  it("renders 'retrying' as distinct copy, no button", () => {
    assert.match(initialSrc, /\{draftSaveState === 'retrying' && 'A tentar guardar novamente…'\}/);
  });

  it("renders 'save-failed' with a manual-retry button calling handleRetryDraftSave", () => {
    const idx = initialSrc.indexOf("{draftSaveState === 'save-failed' && (");
    assert.notEqual(idx, -1);
    const nearby = initialSrc.slice(idx, idx + 400);
    assert.match(nearby, /onClick=\{handleRetryDraftSave\}/);
  });

  it("renders 'save-unknown' with a manual-retry button calling handleRetryDraftSave", () => {
    const idx = initialSrc.indexOf("{draftSaveState === 'save-unknown' && (");
    assert.notEqual(idx, -1);
    const nearby = initialSrc.slice(idx, idx + 400);
    assert.match(nearby, /onClick=\{handleRetryDraftSave\}/);
  });

  it("renders 'save-blocked' with NO retry button", () => {
    const idx = initialSrc.indexOf("{draftSaveState === 'save-blocked' && (");
    assert.notEqual(idx, -1);
    const nearby = initialSrc.slice(idx, idx + 200);
    assert.doesNotMatch(nearby, /onClick=/);
  });

  it('no stale reference to the old \'error\' state name remains anywhere in the file', () => {
    assert.doesNotMatch(initialSrc, /draftSaveState === 'error'/);
    assert.doesNotMatch(initialSrc, /setDraftSaveState\('error'\)/);
  });
});

// ==================================================================
// Regression guards — 41A/41B call sites are untouched by 41C
// ==================================================================

describe('Decision 41C — regression guard: 41A/41B mechanisms are untouched', () => {
  it('PeriodicStockCountView: pendingContagemFlushRef registration (41A) still wires flushForSwitchIfNeeded unmodified', () => {
    assert.match(periodicSrc, /registerPendingContagemFlush\(flushForSwitchIfNeeded\);/);
  });

  it('InitialStockCountView: the 41B unmount-cleanup effect still calls flushDraftNow unmodified', () => {
    const idx = initialSrc.lastIndexOf('return () => {\n      flushDraftNow();\n    };');
    assert.notEqual(idx, -1);
  });

  it('firestore.rules and firestore.indexes.json are not referenced by any new 41C source', () => {
    const newClassificationSrc = readFileSync(
      new URL('../apps/tenant/src/lib/draftSaveFailureClassification.ts', import.meta.url),
      'utf-8'
    );
    assert.doesNotMatch(newClassificationSrc, /firestore\.rules/);
  });
});
