// Periodic Stock Count draft — Decision 38 Amendment source-level
// regression guards: the interruption-durability flush, its
// integration into the existing finalization-safety discipline, the
// stale/out-of-order autosave-write serialization, and the
// newProductInfo write-path plumbing.
//
// [Stock Count Data-Loss Resilience — Implementation Task §7 items
// 7-10 (source-level tier); Implementation Plan §7; Implementation
// Authorization §2 items 4, 5, 6, 7, §8 items 1-4]
//
// SCOPE: same documented constraint as
// tests/periodic-stock-draft-resurrection.test.ts and
// tests/initial-stock-confirmation.test.ts — PeriodicStockCountView.tsx
// has no jsdom/testing-library harness in this repo, so this suite
// proves ordering/wiring properties via source inspection, not a
// runtime/behavioral test against a live component. This is this
// repo's own deliberate, documented choice for this class of
// client-side timing/ordering property (Implementation Task §8's
// standing non-authorization of a new component-test harness).
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-interruption-durability.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const firebaseSource = readFileSync(new URL('../apps/tenant/src/lib/firebase.ts', import.meta.url), 'utf-8');
const appContextSource = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

// Same boundary-finding technique tests/periodic-stock-draft-resurrection
// .test.ts and tests/initial-stock-confirmation.test.ts already
// establish for this file's consistent function style: slice from a
// signature marker to the next top-level `const X = ` at the same
// 2-space indentation.
function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = src.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

// flushPeriodicDraftNow's OWN body only, excluding the visibilitychange/
// pagehide useEffect that immediately follows it in source (that effect
// is checked separately, below, since it is not itself a `const X = (`
// declaration and so falls inside extractFunctionBody's normal
// boundary for the flush function).
function extractFlushFunctionBodyOnly(src: string): string {
  const marker = 'const flushPeriodicDraftNow = () => {';
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, 'Could not locate flushPeriodicDraftNow — has it been renamed?');
  const afterStart = src.slice(start);
  const useEffectIdx = afterStart.indexOf('\n  useEffect(() => {');
  assert.notEqual(useEffectIdx, -1, 'Expected a useEffect immediately after flushPeriodicDraftNow (the visibilitychange/pagehide wiring).');
  return afterStart.slice(0, useEffectIdx);
}

// Strip `//`-style line comments before searching for actual code —
// otherwise an explanatory comment (which legitimately mentions a term
// like "beforeunload" or "persistentSingleTabManager" as the
// alternative deliberately NOT chosen) would produce a false positive.
// Same technique tests/periodic-stock-draft-resurrection.test.ts
// already established for this exact problem.
function stripLineComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

describe('§7 item 7 — PeriodicStockCountView.tsx wires both visibilitychange and pagehide to flushPeriodicDraftNow', () => {
  // extractFunctionBody's boundary naturally includes the wiring
  // useEffect too, since it sits between flushPeriodicDraftNow's own
  // `const` declaration and the next one (getUnitRelationshipForProductName).
  const flushAreaBody = extractFunctionBody(source, 'const flushPeriodicDraftNow = () => {');

  it('registers a visibilitychange listener that calls flushPeriodicDraftNow when the document becomes hidden', () => {
    assert.match(
      flushAreaBody,
      /document\.addEventListener\('visibilitychange',\s*handleVisibilityChange\)/,
      'Expected a document visibilitychange listener registered.'
    );
    assert.match(
      flushAreaBody,
      /document\.visibilityState === 'hidden'\)\s*flushPeriodicDraftNow\(\)/,
      "Expected the visibilitychange handler to call flushPeriodicDraftNow() when document.visibilityState === 'hidden'."
    );
  });

  it('registers a pagehide listener that calls flushPeriodicDraftNow directly', () => {
    assert.match(
      flushAreaBody,
      /window\.addEventListener\('pagehide',\s*flushPeriodicDraftNow\)/,
      'Expected a window pagehide listener registered, calling flushPeriodicDraftNow directly (unconditionally, unlike visibilitychange).'
    );
  });

  it('cleans up both listeners on unmount', () => {
    assert.match(flushAreaBody, /document\.removeEventListener\('visibilitychange',\s*handleVisibilityChange\)/);
    assert.match(flushAreaBody, /window\.removeEventListener\('pagehide',\s*flushPeriodicDraftNow\)/);
  });

  it('does NOT use beforeunload — the same documented reliability reasoning as InitialStockCountView.tsx (design precedent only)', () => {
    assert.doesNotMatch(
      stripLineComments(flushAreaBody),
      /addEventListener\('beforeunload'/,
      'beforeunload must not be used for this mechanism — it is unreliable on some browsers, notably older mobile Safari (Rule 8 Assessment §10 failure-mode table).'
    );
  });
});

describe('§7 item 8 — flushPeriodicDraftNow cancels the pending debounce before issuing its own write', () => {
  const flushBody = extractFlushFunctionBodyOnly(source);

  it('flushPeriodicDraftNow exists and calls flushPeriodicStockDraftRows', () => {
    const saveIndex = flushBody.indexOf('flushPeriodicStockDraftRows(');
    assert.notEqual(saveIndex, -1, 'Expected flushPeriodicDraftNow to call flushPeriodicStockDraftRows.');
  });

  it('every pending per-row timer is cancelled before the flush write is issued', () => {
    const clearIndex = flushBody.indexOf('rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));');
    const saveIndex = flushBody.indexOf('flushPeriodicStockDraftRows(');
    assert.notEqual(clearIndex, -1, 'Expected flushPeriodicDraftNow to iterate and clearTimeout every entry in rowDebounceTimersRef.');
    assert.notEqual(saveIndex, -1);
    assert.ok(
      clearIndex < saveIndex,
      'Every pending per-row timer must be cancelled before the flush issues its own write — otherwise any still-pending row timer could still fire afterward as a redundant, stale write racing this one.'
    );
  });

  it('tracks its own write in flushInFlightSaveRef, distinct from draftInFlightSaveRef and identityWriteRef', () => {
    assert.match(
      flushBody,
      /flushInFlightSaveRef\.current\s*=\s*flushPromise/,
      'Expected flushPeriodicDraftNow to assign its own write promise to flushInFlightSaveRef.current.'
    );
    assert.doesNotMatch(
      flushBody,
      /draftInFlightSaveRef\.current\s*=/,
      'flushPeriodicDraftNow must not assign to draftInFlightSaveRef — that ref belongs exclusively to the ordinary debounced autosave path (§4a), and conflating the two would break the distinct cancel-vs-await treatment §4a/§4c each require.'
    );
  });
});

describe('§7 item 9 — handleConfirmSave awaits flushInFlightSaveRef.current before calling recordStockCount (the single most safety-critical guard in this amendment)', () => {
  const handleConfirmSaveBody = extractFunctionBody(source, 'const handleConfirmSave = async (');
  const recordStockCountCallIndex = handleConfirmSaveBody.indexOf('await recordStockCount(');

  it('handleConfirmSave exists and calls recordStockCount', () => {
    assert.notEqual(recordStockCountCallIndex, -1, 'Expected handleConfirmSave to call recordStockCount.');
  });

  it('awaits flushInFlightSaveRef.current before calling recordStockCount', () => {
    const awaitIndex = handleConfirmSaveBody.indexOf('await flushInFlightSaveRef.current');
    assert.notEqual(awaitIndex, -1, 'Expected handleConfirmSave to await flushInFlightSaveRef.current.');
    assert.ok(
      awaitIndex < recordStockCountCallIndex,
      'await flushInFlightSaveRef.current must run before recordStockCount is called — otherwise the new interruption-durability flush could still be writing stockCountDrafts/periodic after finalization has already deleted it, resurrecting the draft (Rule 8 Assessment Finding C1).'
    );
  });

  it('never cancels (clearTimeout) flushInFlightSaveRef — only draftDebounceTimerRef (§4a) is safe to cancel', () => {
    assert.doesNotMatch(
      handleConfirmSaveBody,
      /clearTimeout\(\s*flushInFlightSaveRef/,
      'flushInFlightSaveRef must never be cancelled via clearTimeout — it holds a write PROMISE (already in flight or already resolved), not a timer handle; only draftDebounceTimerRef is a cancellable timer.'
    );
  });

  it('this fourth step runs after the existing §4a/§4b steps (cancel every per-row timer, await in-flight autosave, await identity write), preserving their own order unchanged', () => {
    const clearIndex = handleConfirmSaveBody.indexOf('rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));');
    const draftAwaitIndex = handleConfirmSaveBody.indexOf('await draftInFlightSaveRef.current');
    const identityAwaitIndex = handleConfirmSaveBody.indexOf('await identityWriteRef.current');
    const flushAwaitIndex = handleConfirmSaveBody.indexOf('await flushInFlightSaveRef.current');
    assert.ok(clearIndex !== -1 && draftAwaitIndex !== -1 && identityAwaitIndex !== -1 && flushAwaitIndex !== -1);
    assert.ok(
      clearIndex < draftAwaitIndex && draftAwaitIndex < identityAwaitIndex && identityAwaitIndex < flushAwaitIndex && flushAwaitIndex < recordStockCountCallIndex,
      'Expected the exact order: cancel every pending per-row timer (§4a, Decision 39a) -> await in-flight autosave (§4a) -> await identity write (§4b) -> await flush (§4c) -> recordStockCount. The existing §4a/§4b steps must remain in their original relative order, with the new §4c step appended after them, not interleaved or reordered.'
    );
  });
});

describe('§7 item 10 — the per-row autosave scheduler awaits draftInFlightSaveRef.current before issuing its own next write (stale/out-of-order autosave-write serialization)', () => {
  const scheduleRowDraftSaveBody = extractFunctionBody(source, 'const scheduleRowDraftSave = (');

  it('scheduleRowDraftSave exists and calls savePeriodicStockDraftItem/savePeriodicStockDraftMeta', () => {
    assert.match(scheduleRowDraftSaveBody, /savePeriodicStockDraftItem\(/, 'Expected scheduleRowDraftSave to call savePeriodicStockDraftItem for an ordinary row edit.');
    assert.match(scheduleRowDraftSaveBody, /savePeriodicStockDraftMeta\(/, 'Expected scheduleRowDraftSave to call savePeriodicStockDraftMeta for a header-level (__meta__/newProductInfo) edit.');
  });

  it('awaits draftInFlightSaveRef.current, inside the debounce timer callback, before issuing its own write', () => {
    const awaitIndex = scheduleRowDraftSaveBody.indexOf('await draftInFlightSaveRef.current');
    const itemSaveIndex = scheduleRowDraftSaveBody.indexOf('savePeriodicStockDraftItem(');
    const metaSaveIndex = scheduleRowDraftSaveBody.indexOf('savePeriodicStockDraftMeta(');
    assert.notEqual(awaitIndex, -1, 'Expected scheduleRowDraftSave\'s timer callback to await draftInFlightSaveRef.current.');
    assert.notEqual(itemSaveIndex, -1);
    assert.notEqual(metaSaveIndex, -1);
    assert.ok(
      awaitIndex < itemSaveIndex && awaitIndex < metaSaveIndex,
      'await draftInFlightSaveRef.current must run before scheduleRowDraftSave issues its own next write — otherwise two overlapping ordinary autosave writes (from any two row timers) could complete out of order, letting an older one silently overwrite newer state within the same active session (Rule 8 Assessment Finding D1).'
    );
  });

  it('the timer callback reads live current state via latestFlushArgs.current, never a schedule-time-captured argument (Decision 39a FR-N2)', () => {
    assert.match(
      scheduleRowDraftSaveBody,
      /const \{ catalogRows: cr, manualRows: mr, type: t, label: l, date: d, newProductInfo: npi \} = latestFlushArgs\.current;/,
      'Expected the per-row timer callback to read live state from latestFlushArgs.current at fire-time, not from schedule-time function arguments — this is the exact property that makes the T0/T100 race across two different rows structurally impossible.'
    );
  });

  it('is keyed per-row in rowDebounceTimersRef — a Map, not a single ref, so editing one row never clears another row\'s own timer', () => {
    assert.match(
      source,
      /const rowDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>\(new Map\(\)\);/,
      'Expected a per-row Map-based timer structure, replacing the prior single shared draftDebounceTimerRef.'
    );
  });

  it('writes remain full-document overwrites — no version/sequence field is introduced anywhere in this function', () => {
    assert.doesNotMatch(
      stripLineComments(scheduleRowDraftSaveBody),
      /\bversion\b|sequenceNumber|writeSeq/i,
      'No version/sequence field should be introduced — serialization by issue-order is sufficient because writes are already whole-document overwrites (Implementation Task §5c; Decision 39a FR-N3).'
    );
  });
});

describe('§5b — newProductInfo reaches every meta-document write path for the periodic draft (per-product independent draft persistence: newProductInfo lives on the META document, never on a row — see AppContext.tsx\'s own periodicStockDraftMeta comment)', () => {
  it('scheduleRowDraftSave sources newProductInfo live from latestFlushArgs.current and forwards it to savePeriodicStockDraftMeta', () => {
    const scheduleRowDraftSaveBody = extractFunctionBody(source, 'const scheduleRowDraftSave = (');
    assert.match(
      scheduleRowDraftSaveBody,
      /const \{ catalogRows: cr, manualRows: mr, type: t, label: l, date: d, newProductInfo: npi \} = latestFlushArgs\.current;/,
      'Expected scheduleRowDraftSave\'s timer callback to destructure newProductInfo (as npi) from latestFlushArgs.current — sourced live at fire-time, the same as every other field, never passed as a schedule-time function argument.'
    );
    assert.match(
      scheduleRowDraftSaveBody,
      /savePeriodicStockDraftMeta\(t, l\.trim\(\) \|\| undefined, d, submissionIdRef\.current \|\| undefined, npi\)/,
      'Expected scheduleRowDraftSave\'s savePeriodicStockDraftMeta call (the "__meta__"/"newProductInfo:*" branch) to pass the live-sourced npi as its fifth argument.'
    );
  });

  it('flushPeriodicDraftNow forwards newProductInfo (via latestFlushArgs) to flushPeriodicStockDraftRows', () => {
    const flushBody = extractFlushFunctionBodyOnly(source);
    assert.match(
      flushBody,
      /flushPeriodicStockDraftRows\(rowsByKey, t, l\.trim\(\) \|\| undefined, d, submissionIdRef\.current \|\| undefined, npi\)/,
      'Expected flushPeriodicDraftNow\'s flushPeriodicStockDraftRows call to include the destructured newProductInfo (npi) value as its sixth argument.'
    );
  });

  it('handleRequestConfirmation\'s identity-establishing write includes newProductInfo — a batch write (rows + meta together) that must not silently erase it', () => {
    const handleRequestConfirmationBody = extractFunctionBody(source, 'const handleRequestConfirmation = async (');
    assert.match(
      handleRequestConfirmationBody,
      /identityWriteRef\.current\s*=\s*flushPeriodicStockDraftRows\(\s*rowsByKey,\s*type,\s*label\.trim\(\)\s*\|\|\s*undefined,\s*date,\s*submissionIdRef\.current,\s*newProductInfo\s*\)/,
      'Expected the identity-establishing write in handleRequestConfirmation to include newProductInfo as its sixth argument — omitting it would silently erase any already-persisted newProductInfo the moment the operator reaches pendingTally.'
    );
  });

  it('handleResumeDraft restores newProductInfo from the draft, defaulting to an empty object when absent (backward compatibility)', () => {
    const handleResumeDraftBody = extractFunctionBody(source, 'const handleResumeDraft = () => {');
    assert.match(
      handleResumeDraftBody,
      /setNewProductInfo\(periodicStockDraft\.newProductInfo\s*\?\?\s*\{\}\)/,
      'Expected handleResumeDraft to call setNewProductInfo(periodicStockDraft.newProductInfo ?? {}) — a draft written before this field existed must resume as an empty object, never as an error.'
    );
  });

  it('savePeriodicStockDraftMeta/flushPeriodicStockDraftRows (AppContext.tsx) accept newProductInfo and never write it as literal undefined', () => {
    function extractAppContextFunctionBody(src: string, signatureMarker: string): string {
      const start = src.indexOf(signatureMarker);
      assert.notEqual(start, -1, `Could not locate ${signatureMarker} in AppContext.tsx — has it been renamed?`);
      const rest = src.slice(start);
      const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
      return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
    }
    // [Bug fix — per-product independent draft persistence] Both
    // savePeriodicStockDraftMeta and flushPeriodicStockDraftRows share
    // the SAME meta-building logic via buildPeriodicDraftMeta — a
    // single shared helper, checked once here, rather than duplicating
    // this assertion per caller.
    const body = extractAppContextFunctionBody(appContextSource, 'const buildPeriodicDraftMeta = (');
    assert.match(body, /newProductInfo\?:/, 'Expected buildPeriodicDraftMeta to declare newProductInfo as an optional parameter.');
    assert.match(
      body,
      /\.\.\.\(newProductInfo && Object\.keys\(newProductInfo\)\.length > 0 \? \{ newProductInfo \} : \{\}\)/,
      'Expected newProductInfo to be conditionally spread into the built meta object only when non-empty, never assigned the literal value undefined (Firestore rejects that).'
    );
  });
});

describe('§7 item 13 (source half) — Firestore persistent local cache is configured in lib/firebase.ts', () => {
  it('imports initializeFirestore, persistentLocalCache, and persistentMultipleTabManager from firebase/firestore', () => {
    assert.match(firebaseSource, /initializeFirestore/, 'Expected firebase.ts to import initializeFirestore.');
    assert.match(firebaseSource, /persistentLocalCache/, 'Expected firebase.ts to import persistentLocalCache.');
    assert.match(firebaseSource, /persistentMultipleTabManager/, 'Expected firebase.ts to import persistentMultipleTabManager.');
  });

  it('calls initializeFirestore with localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })', () => {
    assert.match(
      firebaseSource,
      /localCache:\s*persistentLocalCache\(\{\s*tabManager:\s*persistentMultipleTabManager\(\)\s*\}\)/,
      'Expected the exact settings shape: localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) — the settings field is "localCache", not "cache" (Rule 8 Assessment\'s own corrected finding).'
    );
  });

  it('does NOT use persistentSingleTabManager — multi-tab coordination for the same user is required, not single-tab exclusivity', () => {
    assert.doesNotMatch(
      stripLineComments(firebaseSource),
      /persistentSingleTabManager/,
      'persistentSingleTabManager would force-fail persistence in a second tab of the same user\'s own browser — persistentMultipleTabManager is required instead (Implementation Authorization §2 item 1).'
    );
  });

  it('preserves the existing databaseId-conditional construction', () => {
    assert.match(
      firebaseSource,
      /firestoreDatabaseId\s*=\s*\(firebaseConfig as any\)\?\.\s*firestoreDatabaseId/,
      'Expected the existing firestoreDatabaseId extraction to be preserved.'
    );
  });

  it('falls back to getFirestore if initializeFirestore throws (e.g. re-evaluation under HMR), rather than crashing', () => {
    assert.match(firebaseSource, /catch\s*\{/, 'Expected a catch block guarding the initializeFirestore call.');
    assert.match(firebaseSource, /getFirestore\(app,\s*firestoreDatabaseId\)/, 'Expected the catch fallback to still respect the databaseId conditional.');
  });
});
