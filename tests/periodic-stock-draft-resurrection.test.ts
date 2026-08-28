// Periodic Stock Count draft — resurrection-protection and submission-
// identity-durability source-level regression guards.
//
// [Stock Count Data-Loss Resilience — Implementation Task, §14 item 1]
//
// SCOPE: PeriodicStockCountView.tsx is a React component with no
// jsdom/testing-library harness in this repo — same documented
// constraint as tests/initial-stock-confirmation.test.ts, whose own
// technique this file matches exactly: source-inspection assertions on
// the actual call ordering inside handleConfirmSave/
// handleRequestConfirmation, not a runtime/behavioral test against a
// live component. A true behavioral/timing test is not required and is
// not authorized by the frozen specification (§14's own stated
// boundary) — this is this repo's own deliberate, documented choice for
// this class of client-side timing/ordering property.
//
// WHAT THIS PROVES: two related but distinct failure modes, matching
// the Implementation Task's own §4a/§4b split —
//
//   (a) A late draft-content write must not resurrect
//       stockCountDrafts/periodic after finalization has deleted it —
//       proven by asserting handleConfirmSave cancels/awaits every §4a
//       write handle before calling recordStockCount, in source order.
//   (b) The submission identity itself must be durable BEFORE
//       finalization begins — proven by asserting handleConfirmSave
//       awaits the identity write (never cancels it), and that the
//       identity-establishing write itself is issued from
//       handleRequestConfirmation (immediately, non-debounced), never
//       folded into the debounced/cancellable scheduleDraftSave path.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-draft-resurrection.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} in PeriodicStockCountView.tsx — has it been renamed?`);
  // Slice from the signature to the next top-level `const X = ` at the
  // same 2-space indentation — matches
  // tests/initial-stock-confirmation.test.ts's own boundary-finding
  // technique for this file's consistent function style.
  const rest = src.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

describe('§4a — ordinary row-content autosave is never allowed to resurrect the draft after finalization', () => {
  const handleConfirmSaveBody = extractFunctionBody(source, 'const handleConfirmSave = async (');
  const recordStockCountCallIndex = handleConfirmSaveBody.indexOf('await recordStockCount(');

  it('handleConfirmSave exists and calls recordStockCount', () => {
    assert.notEqual(recordStockCountCallIndex, -1, 'Expected handleConfirmSave to call recordStockCount.');
  });

  it('cancels every not-yet-fired per-row timer before calling recordStockCount', () => {
    const clearIndex = handleConfirmSaveBody.indexOf('rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));');
    assert.notEqual(clearIndex, -1, 'Expected handleConfirmSave to iterate and clearTimeout every entry in rowDebounceTimersRef (Decision 39a — replaces the prior single draftDebounceTimerRef).');
    assert.ok(
      clearIndex < recordStockCountCallIndex,
      'Every pending per-row timer must be cancelled before recordStockCount is called — otherwise any still-pending row timer could still fire after finalization begins, the exact shape of the pre-existing Initial Count resurrection bug this task exists to not repeat.'
    );
  });

  it('awaits any already-in-flight ordinary row-content save before calling recordStockCount', () => {
    const awaitIndex = handleConfirmSaveBody.indexOf('await draftInFlightSaveRef.current');
    assert.notEqual(awaitIndex, -1, 'Expected handleConfirmSave to await draftInFlightSaveRef.current.');
    assert.ok(
      awaitIndex < recordStockCountCallIndex,
      'await draftInFlightSaveRef.current must run before recordStockCount is called — an already-fired autosave write must be allowed to finish (or be known-finished) before finalization\'s draft-delete is queued, so the delete is strictly ordered after it rather than racing it.'
    );
  });
});

describe('§4b — the submission identity write is never discarded, always durable before finalization', () => {
  const handleConfirmSaveBody = extractFunctionBody(source, 'const handleConfirmSave = async (');
  const recordStockCountCallIndex = handleConfirmSaveBody.indexOf('await recordStockCount(');

  it('awaits the identity write before calling recordStockCount — never a clearTimeout/cancel on this ref', () => {
    const awaitIndex = handleConfirmSaveBody.indexOf('await identityWriteRef.current');
    assert.notEqual(awaitIndex, -1, 'Expected handleConfirmSave to await identityWriteRef.current.');
    assert.ok(
      awaitIndex < recordStockCountCallIndex,
      'await identityWriteRef.current must run before recordStockCount is called — the submission identity must be confirmed durable in Firestore before the finalization network call is even issued, or a crash in that window followed by a retry would generate a NEW identity and defeat the entire deterministic-id idempotency mechanism (Implementation Task §3).'
    );
    // Guard against a future edit reintroducing a cancel/clear on this
    // specific ref anywhere in the function — the identity write must
    // never be treated as discardable the way §4a's ordinary autosave
    // deliberately is.
    assert.doesNotMatch(
      handleConfirmSaveBody,
      /clearTimeout\(\s*identityWriteRef/,
      'identityWriteRef must never be cancelled via clearTimeout — only draftDebounceTimerRef (§4a, ordinary row content) is safe to cancel.'
    );
  });

  it('recordStockCount is called with an explicit submissionId sourced from submissionIdRef', () => {
    assert.match(
      handleConfirmSaveBody,
      /submissionId:\s*submissionIdRef\.current\s*\|\|\s*undefined/,
      'Expected the recordStockCount call to pass submissionId: submissionIdRef.current || undefined.'
    );
  });

  it('the identity-establishing write is issued from handleRequestConfirmation, immediately and non-debounced', () => {
    const handleRequestConfirmationBody = extractFunctionBody(source, 'const handleRequestConfirmation = async (');
    assert.match(
      handleRequestConfirmationBody,
      /identityWriteRef\.current\s*=\s*savePeriodicStockDraft\(/,
      'Expected handleRequestConfirmation to issue the identity-establishing write directly (identityWriteRef.current = savePeriodicStockDraft(...)), not via the debounced scheduleDraftSave path.'
    );
    assert.doesNotMatch(
      handleRequestConfirmationBody,
      /setTimeout\(/,
      'The identity-establishing write in handleRequestConfirmation must be immediate, not scheduled behind a setTimeout debounce — a debounced identity write could be discarded by the very cancellation logic §4a relies on for ordinary row content.'
    );
  });

  it('scheduleRowDraftSave (the debounced §4a path) never itself assigns to identityWriteRef — only handleRequestConfirmation does', () => {
    const scheduleRowDraftSaveBody = extractFunctionBody(source, 'const scheduleRowDraftSave = (');
    assert.doesNotMatch(
      scheduleRowDraftSaveBody,
      /identityWriteRef/,
      'scheduleRowDraftSave must never reference identityWriteRef — folding the identity write into the debounced/cancellable per-row path would reintroduce exactly the failure mode §4b exists to close.'
    );
  });
});

describe('submission identity regeneration — cleared on edit, reused on retry (frozen spec §7)', () => {
  it('every row/type/date/label-change handler nulls submissionIdRef.current before scheduling a save', () => {
    const handlerNames = [
      'updateCatalogRow',
      'updateManualRow',
      'handleAddManualRow',
      'handleRemoveManualRow',
      'handleTypeChange',
      'handleLabelChange',
      'handleDateChange',
    ];
    for (const name of handlerNames) {
      const body = extractFunctionBody(source, `const ${name} = (`);
      assert.match(
        body,
        /submissionIdRef\.current\s*=\s*null/,
        `Expected ${name} to null submissionIdRef.current — otherwise editing after a confirmation attempt would silently reuse a stale identity instead of regenerating one on the next confirmation, per the frozen spec §7's "last-second edit wins" principle.`
      );
    }
  });

  it('handleConfirmSave does NOT clear submissionIdRef.current on a failed/errored attempt — a retry must reuse the same identity', () => {
    const handleConfirmSaveBody = extractFunctionBody(source, 'const handleConfirmSave = async (');
    const catchIndex = handleConfirmSaveBody.indexOf('} catch (err: any) {');
    assert.notEqual(catchIndex, -1, 'Expected a catch block in handleConfirmSave.');
    const finallyIndex = handleConfirmSaveBody.indexOf('} finally {');
    assert.notEqual(finallyIndex, -1, 'Expected a finally block in handleConfirmSave.');
    const catchBody = handleConfirmSaveBody.slice(catchIndex, finallyIndex);
    assert.doesNotMatch(
      catchBody,
      /submissionIdRef\.current\s*=\s*null/,
      'The catch block must not clear submissionIdRef.current — a failed or ambiguous finalization attempt must remain retryable under the SAME submission identity (Implementation Task §3/§4b), not silently start a new logical count on the next attempt.'
    );
  });

  it('handleConfirmSave DOES clear submissionIdRef.current on success — a finalized count must not bleed its identity into a later, unrelated count', () => {
    const handleConfirmSaveBody = extractFunctionBody(source, 'const handleConfirmSave = async (');
    const savedMessageIndex = handleConfirmSaveBody.indexOf('setSavedMessage(');
    const catchIndex = handleConfirmSaveBody.indexOf('} catch (err: any) {');
    assert.notEqual(savedMessageIndex, -1);
    assert.notEqual(catchIndex, -1);
    const successBody = handleConfirmSaveBody.slice(savedMessageIndex, catchIndex);
    assert.match(successBody, /submissionIdRef\.current\s*=\s*null/);
  });
});

describe('recordStockCount (AppContext.tsx) — periodic branch enforces and uses the submission identity', () => {
  const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

  function extractAppContextFunctionBody(src: string, signatureMarker: string): string {
    const start = src.indexOf(signatureMarker);
    assert.notEqual(start, -1, `Could not locate ${signatureMarker} in AppContext.tsx — has it been renamed?`);
    const rest = src.slice(start);
    const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
    return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
  }

  const recordStockCountBody = extractAppContextFunctionBody(appContextSrc, 'const recordStockCount = async (');

  // Strip `//`-style line comments before searching for actual code —
  // otherwise a comment explaining what changed (which necessarily
  // mentions the OLD pattern in prose) would produce a false positive.
  // Same technique tests/initial-stock-confirmation.test.ts already
  // established for this exact problem.
  function stripLineComments(code: string): string {
    return code
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('//');
        return idx === -1 ? line : line.slice(0, idx);
      })
      .join('\n');
  }
  const recordStockCountCodeOnly = stripLineComments(recordStockCountBody);

  it('throws if submissionId is missing for a non-initial (periodic) count', () => {
    assert.match(
      recordStockCountCodeOnly,
      /type !== 'initial' && !submissionId/,
      'Expected recordStockCount to validate that a periodic count always has a submissionId — otherwise a future call site could silently regress to the old random-id, non-idempotent scheme.'
    );
  });

  it('derives the stockCounts id deterministically from submissionId for non-initial types', () => {
    assert.match(
      recordStockCountCodeOnly,
      /'stockcount-periodic-'\s*\+\s*submissionId/,
      'Expected the periodic stockCounts id to be derived from submissionId, not a fresh random id per attempt.'
    );
    assert.doesNotMatch(
      recordStockCountCodeOnly,
      /'stockcount-'\s*\+\s*Date\.now\(\)/,
      'Found the OLD random-id scheme still present in actual code — this would defeat the deterministic-id idempotency mechanism the frozen spec §8a requires.'
    );
  });

  it('derives the periodic timelineEvents id deterministically from submissionId', () => {
    assert.match(
      recordStockCountCodeOnly,
      /id:\s*'tl-periodic-'\s*\+\s*submissionId/,
      'Expected the periodic logTimelineEvent call to pass an explicit deterministic id derived from submissionId.'
    );
  });

  it('queues the stockCountDrafts/periodic delete on the same batch as the stockCounts write for non-initial types', () => {
    const setIndex = recordStockCountCodeOnly.indexOf("fsBatch.set(doc(db, 'businesses', businessId, 'stockCounts'");
    const periodicDeleteIndex = recordStockCountCodeOnly.indexOf("fsBatch.delete(doc(db, 'businesses', businessId, 'stockCountDrafts', 'periodic')");
    const commitIndex = recordStockCountCodeOnly.indexOf('await fsBatch.commit()');
    assert.notEqual(setIndex, -1);
    assert.notEqual(periodicDeleteIndex, -1, 'Expected recordStockCount to queue a stockCountDrafts/periodic delete for the periodic branch.');
    assert.notEqual(commitIndex, -1);
    assert.ok(setIndex < commitIndex, 'stockCounts set must be queued on fsBatch before commit().');
    assert.ok(periodicDeleteIndex < commitIndex, 'stockCountDrafts/periodic delete must be queued on fsBatch before commit() — same atomicity guarantee the initial branch already has.');
  });
});
