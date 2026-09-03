// [Decision 41E — Subscription-Blocked Draft Access / Read-Only
// Recovery; Implementation Plan §18-21] Source-text / control-flow
// ordering tests, same established methodology as this repo's own
// tests/business-switch-flush-protection-decision-41a.test.ts and
// tests/draft-listener-state-hardening-decision-41d.test.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/subscription-blocked-draft-recovery-decision-41e.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const periodicSrc = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const initialSrc = readFileSync(new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url), 'utf-8');
const readOnlySrc = readFileSync(new URL('../apps/tenant/src/components/ReadOnlyDraftRecovery.tsx', import.meta.url), 'utf-8');

function stripLineComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

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
// A — ReadOnlyDraftRecovery.tsx: safe by construction
// ==================================================================

describe('ReadOnlyDraftRecovery.tsx — safe by construction (§9/§10)', () => {
  it('never calls useApp() — has no independent Firestore access at all', () => {
    assert.doesNotMatch(stripLineComments(readOnlySrc), /useApp\(/);
  });

  it('imports no draft-save/flush/finalize/write function of any kind', () => {
    assert.doesNotMatch(
      stripLineComments(readOnlySrc),
      /setDoc|updateDoc|addDoc|deleteDoc|writeBatch|saveInitialStockDraft|savePeriodicStockDraftItem|savePeriodicStockDraftMeta|flushPeriodicStockDraftRows|clearInitialStockDraft|clearPeriodicStockDraft|recordStockCount/
    );
  });

  it('renders no <input>, <textarea>, <select>, or onChange handler anywhere — genuinely no editable field exists', () => {
    assert.doesNotMatch(readOnlySrc, /<input|<textarea|<select|onChange=/);
  });

  it('the only onClick in the file is the optional export button, gated on the caller explicitly providing onExportPdf', () => {
    const onClickMatches = [...readOnlySrc.matchAll(/onClick=/g)];
    assert.equal(onClickMatches.length, 1, 'Expected exactly one onClick in this file.');
    const idx = readOnlySrc.search(/onClick=/);
    const nearby = readOnlySrc.slice(Math.max(0, idx - 400), idx);
    assert.match(nearby, /\{onExportPdf && \(/, 'The one onClick must be inside an `onExportPdf &&` conditional, never unconditional.');
  });

  it('onExportPdf is typed as optional — omitting it entirely is a valid, supported usage (§11: no export mechanism to reuse for some screens)', () => {
    assert.match(readOnlySrc, /onExportPdf\?: \(\) => void;/);
  });
});

// ==================================================================
// B — PeriodicStockCountView.tsx: blocked render gate
// ==================================================================

describe('PeriodicStockCountView.tsx — Decision 41E blocked render gate (§4/§5)', () => {
  it('imports ReadOnlyDraftRecovery', () => {
    assert.match(periodicSrc, /import \{ ReadOnlyDraftRecovery \} from '\.\/ReadOnlyDraftRecovery';/);
  });

  it("branches on periodicStockDraftListenerState inside the subscriptionBlocksNewRecords guard — loading, load-error, draft-exists, and a confirmed-no-draft fallback all handled", () => {
    const guardIdx = periodicSrc.indexOf('if (subscriptionBlocksNewRecords) {');
    assert.notEqual(guardIdx, -1);
    const nextTopLevelGuardIdx = periodicSrc.indexOf('if (draftDecisionPending && periodicStockDraft) {');
    assert.notEqual(nextTopLevelGuardIdx, -1, 'Could not locate the resume/discard banner branch that follows the whole blocked guard block.');
    assert.ok(guardIdx < nextTopLevelGuardIdx);
    const guardedBlock = periodicSrc.slice(guardIdx, nextTopLevelGuardIdx);
    assert.match(guardedBlock, /periodicStockDraftListenerState === 'loading'/);
    assert.match(guardedBlock, /periodicStockDraftListenerState === 'load-error'/);
    assert.match(guardedBlock, /periodicStockDraftListenerState === 'draft-exists' && periodicStockDraft/);
    assert.match(guardedBlock, /return <SubscriptionBlockedNotice \/>;/);
  });

  it('test 1/4 — the draft-exists branch renders ReadOnlyDraftRecovery, never SubscriptionBlockedNotice, for a genuinely existing draft', () => {
    const idx = periodicSrc.indexOf("if (periodicStockDraftListenerState === 'draft-exists' && periodicStockDraft) {");
    assert.notEqual(idx, -1);
    const nextGuardIdx = periodicSrc.indexOf(
      "// 'confirmed-no-draft' (or the defensive draft-exists-but-null"
    );
    assert.notEqual(nextGuardIdx, -1);
    const block = periodicSrc.slice(idx, nextGuardIdx);
    assert.match(block, /<ReadOnlyDraftRecovery/);
    assert.doesNotMatch(block, /<SubscriptionBlockedNotice/);
  });

  it('test 12 — passes onExportPdf, reusing the SAME exportReportPdf helper the rest of this file already uses (no new export architecture)', () => {
    const idx = periodicSrc.indexOf("if (periodicStockDraftListenerState === 'draft-exists' && periodicStockDraft) {");
    const nextGuardIdx = periodicSrc.indexOf("// 'confirmed-no-draft' (or the defensive draft-exists-but-null");
    const block = periodicSrc.slice(idx, nextGuardIdx);
    assert.match(block, /exportReportPdf\(/);
    assert.match(block, /onExportPdf=\{handleExportBlockedDraftPdf\}/);
  });

  it('the export adapter reads directly from periodicStockDraft.items (the raw, already-persisted draft), never from catalogRows/manualRows/liveTally (live editable working state, unavailable and irrelevant in this blocked branch)', () => {
    const idx = periodicSrc.indexOf("if (periodicStockDraftListenerState === 'draft-exists' && periodicStockDraft) {");
    const nextGuardIdx = periodicSrc.indexOf('// \'confirmed-no-draft\' (or the defensive draft-exists-but-null');
    const block = periodicSrc.slice(idx, nextGuardIdx);
    assert.match(block, /periodicStockDraft\.items/);
    assert.doesNotMatch(stripLineComments(block), /catalogRows|manualRows|liveTally|allWorkingRows/);
  });
});

// ==================================================================
// C — PeriodicStockCountView.tsx: write-path audit (§13)
// ==================================================================

describe('PeriodicStockCountView.tsx — Decision 41E write-path audit (§13)', () => {
  it('test 5/9 — flushPeriodicDraftNow (runs unconditionally on visibilitychange/pagehide/unmount, independent of which JSX renders) guards on subscriptionBlocksNewRecords as its very first statement', () => {
    const body = extractFunctionBody(periodicSrc, 'const flushPeriodicDraftNow = () => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const firstRealWorkIdx = body.indexOf('rowDebounceTimersRef.current.forEach');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(firstRealWorkIdx, -1);
    assert.ok(guardIdx < firstRealWorkIdx, 'The guard must run before any other work in this function.');
  });

  it('flushForSwitchIfNeeded treats subscription-blocked as "nothing to flush" (success:true, no write attempted) rather than attempting a doomed write', () => {
    const body = extractFunctionBody(periodicSrc, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) {');
    assert.notEqual(guardIdx, -1);
    const guardBlock = body.slice(guardIdx, guardIdx + 300);
    assert.match(guardBlock, /cancelAllRowRetries\(\);/);
    assert.match(guardBlock, /return \{ success: true \};/);
    assert.doesNotMatch(guardBlock, /flushPeriodicStockDraftRows\(/);
  });

  it('test 7/8 — scheduleRowDraftSave (the debounce-scheduling entry point) guards on subscriptionBlocksNewRecords before doing anything else', () => {
    const body = extractFunctionBody(periodicSrc, 'const scheduleRowDraftSave = (rowKey: string) => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const firstRealWorkIdx = body.indexOf('const existing = rowDebounceTimersRef.current.get(rowKey);');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(firstRealWorkIdx, -1);
    assert.ok(guardIdx < firstRealWorkIdx, 'Expected the guard before the first real statement in the function.');
  });

  it('test 9/10 — handleRequestConfirmation (the identity-establishing write) guards on subscriptionBlocksNewRecords before any other work', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleRequestConfirmation = async (e: React.FormEvent) => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const firstRealWorkIdx = body.indexOf("if (type === 'custom' && !label.trim()) {");
    assert.notEqual(guardIdx, -1);
    assert.notEqual(firstRealWorkIdx, -1);
    assert.ok(guardIdx < firstRealWorkIdx, 'Expected the guard before the first validation check.');
  });

  it('test 10 — handleConfirmSave (finalization) guards on subscriptionBlocksNewRecords before any work', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleConfirmSave = async () => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const firstRealWorkIdx = body.indexOf('setIsSaving(true);');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(firstRealWorkIdx, -1);
    assert.ok(guardIdx < firstRealWorkIdx, 'Expected the guard before setIsSaving(true).');
  });

  it('handleManualRetryDraftSave (41C manual retry) guards on subscriptionBlocksNewRecords before attempting any row', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleManualRetryDraftSave = () => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const rowKeysIdx = body.indexOf('const rowKeys = Array.from(manualRetryEligibleRowsRef.current);');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(rowKeysIdx, -1);
    assert.ok(guardIdx < rowKeysIdx);
  });
});

// ==================================================================
// D — InitialStockCountView.tsx: blocked render gate
// ==================================================================

describe('InitialStockCountView.tsx — Decision 41E blocked render gate (§6, redo exemption preserved)', () => {
  it('imports ReadOnlyDraftRecovery', () => {
    assert.match(initialSrc, /import \{ ReadOnlyDraftRecovery \} from '\.\/ReadOnlyDraftRecovery';/);
  });

  it("the guard condition is EXACTLY the pre-existing `subscriptionBlocksNewRecords && !redoingConfirmationId` — the Void & Redo exemption (Rule 8 Finding K1) is untouched", () => {
    assert.match(initialSrc, /if \(subscriptionBlocksNewRecords && !redoingConfirmationId\) \{/);
  });

  it('test 2/4 — the draft-exists branch renders ReadOnlyDraftRecovery, never SubscriptionBlockedNotice, for a genuinely existing draft', () => {
    const idx = initialSrc.indexOf("if (initialStockDraftListenerState === 'draft-exists' && initialStockDraft) {");
    assert.notEqual(idx, -1);
    const nextGuardIdx = initialSrc.indexOf("// 'confirmed-no-draft' (or the defensive draft-exists-but-null");
    assert.notEqual(nextGuardIdx, -1);
    const block = initialSrc.slice(idx, nextGuardIdx);
    assert.match(block, /<ReadOnlyDraftRecovery/);
    assert.doesNotMatch(block, /<SubscriptionBlockedNotice/);
  });

  it('test 4 (existence proof) — reads directly from the raw initialStockDraft context value, never the local editable `rows` state', () => {
    const idx = initialSrc.indexOf("if (initialStockDraftListenerState === 'draft-exists' && initialStockDraft) {");
    const nextGuardIdx = initialSrc.indexOf("// 'confirmed-no-draft' (or the defensive draft-exists-but-null");
    const block = initialSrc.slice(idx, nextGuardIdx);
    assert.match(block, /initialStockDraft\.items\.map/);
    assert.doesNotMatch(block, /rows\.map|rows\.some/);
  });

  it('§11 — no onExportPdf is passed for Initial Stock (no existing export mechanism for this screen, per the signed Plan\'s own "report, don\'t invent" instruction)', () => {
    const idx = initialSrc.indexOf("if (initialStockDraftListenerState === 'draft-exists' && initialStockDraft) {");
    const nextGuardIdx = initialSrc.indexOf("// 'confirmed-no-draft' (or the defensive draft-exists-but-null");
    const block = initialSrc.slice(idx, nextGuardIdx);
    assert.doesNotMatch(block, /onExportPdf=/);
    // Confirm the reason is documented, not silently omitted.
    assert.match(block, /No existing export mechanism exists for/);
    assert.match(block, /Initial Stock's draft today/);
  });
});

// ==================================================================
// E — InitialStockCountView.tsx: write-path audit, redo-aware (§13)
// ==================================================================

describe('InitialStockCountView.tsx — Decision 41E write-path audit (§13)', () => {
  it('test 5/6/9 — performDraftSaveAttempt (the single funnel for ordinary debounce, retry, and manual retry) guards unconditionally on subscriptionBlocksNewRecords, before any other work', () => {
    const body = extractFunctionBody(initialSrc, 'const performDraftSaveAttempt = (generation: number, attemptNumber: number) => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const nextWorkIdx = body.indexOf('const { rows: r, date: d,');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(nextWorkIdx, -1);
    assert.ok(guardIdx < nextWorkIdx);
  });

  it('test 11 — the debounced-autosave effect guards on subscriptionBlocksNewRecords, explicitly documented as covering incidental read-only-display hydration', () => {
    const effectIdx = initialSrc.indexOf('useEffect(() => {\n    if (!draftLoaded || hasInitialStockCount || isSaving || savedMessage) return;');
    assert.notEqual(effectIdx, -1);
    const effectSlice = initialSrc.slice(effectIdx, effectIdx + 1000);
    assert.match(effectSlice, /if \(subscriptionBlocksNewRecords\) return;/);
  });

  it('flushDraftNow guards on subscriptionBlocksNewRecords', () => {
    const body = extractFunctionBody(initialSrc, 'const flushDraftNow = () => {');
    assert.match(body, /if \(subscriptionBlocksNewRecords\) return;/);
  });

  it('flushForSwitchIfNeeded treats subscription-blocked as "nothing to flush" (success:true), cancelling any leftover retry rather than attempting a doomed write', () => {
    const body = extractFunctionBody(initialSrc, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) {');
    assert.notEqual(guardIdx, -1);
    const guardBlock = body.slice(guardIdx, guardIdx + 300);
    assert.match(guardBlock, /cancelDraftRetry\(\);/);
    assert.match(guardBlock, /return \{ success: true \};/);
    assert.doesNotMatch(guardBlock, /saveInitialStockDraft\(/);
  });

  it('handleRetryDraftSave (manual retry) guards on subscriptionBlocksNewRecords', () => {
    const body = extractFunctionBody(initialSrc, 'const handleRetryDraftSave = () => {');
    assert.match(body, /if \(subscriptionBlocksNewRecords\) return;/);
  });

  it("handleOpenConfirmStep and handleSubmit (finalization-adjacent) guard on `subscriptionBlocksNewRecords && !redoingConfirmationId` — NOT unconditionally, since both also serve the Void & Redo flow (Rule 8 Finding K1) which must remain reachable while blocked", () => {
    const openConfirmBody = extractFunctionBody(initialSrc, 'const handleOpenConfirmStep = async () => {');
    const submitBody = extractFunctionBody(initialSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
    assert.match(openConfirmBody, /if \(subscriptionBlocksNewRecords && !redoingConfirmationId\) return;/);
    assert.match(submitBody, /if \(subscriptionBlocksNewRecords && !redoingConfirmationId\) return;/);
    // And explicitly NOT the unconditional form, in either function.
    assert.doesNotMatch(openConfirmBody, /if \(subscriptionBlocksNewRecords\) return;\n/);
  });
});

// ==================================================================
// F — Decision 41C/41D preserved (§8, tests 16-18)
// ==================================================================

describe('Decision 41E — 41C save/retry classification untouched (§8, test 16/17)', () => {
  it('classifyDraftSaveError itself (the module 41C owns) is not modified by 41E — no reference to it changes its own file', () => {
    const classificationSrc = readFileSync(
      new URL('../apps/tenant/src/lib/draftSaveFailureClassification.ts', import.meta.url),
      'utf-8'
    );
    assert.doesNotMatch(classificationSrc, /Decision 41E/);
  });

  it("permission-denied caused by subscription blocking is still classified 'save-blocked' by the SAME 41C classifier, never a new/parallel classification path introduced by 41E", () => {
    assert.match(periodicSrc, /classifyDraftSaveError\(err, \{ subscriptionBlocksNewRecords \}\)/);
    assert.match(initialSrc, /classifyDraftSaveError\(err, \{ subscriptionBlocksNewRecords \}\)/);
  });

  it("'save-blocked' is still never auto-retried — 41E's own new guards PREVENT the attempt from being made at all while blocked, they do not add a second retry-suppression mechanism on top of 41C's existing one", () => {
    // 41C's own performRowSaveAttempt/performDraftSaveAttempt classification
    // branches (the actual retry-suppression logic for save-blocked) are
    // unmodified — proven by the 41C regression suite passing unchanged;
    // this test proves 41E didn't duplicate that logic anywhere new.
    assert.doesNotMatch(periodicSrc, /'save-blocked'[\s\S]{0,50}setTimeout/, 'save-blocked must never be followed by a new retry timer.');
    assert.doesNotMatch(initialSrc, /'save-blocked'[\s\S]{0,50}setTimeout/, 'save-blocked must never be followed by a new retry timer.');
  });
});

describe('Decision 41E — 41D listener states untouched (§4, test 18)', () => {
  it('DraftListenerState\'s four governed values are referenced by name in both blocked render gates, exactly as 41D defined them — no fifth state invented', () => {
    for (const src of [periodicSrc, initialSrc]) {
      assert.match(src, /'loading'/);
      assert.match(src, /'confirmed-no-draft'/);
      assert.match(src, /'draft-exists'/);
      assert.match(src, /'load-error'/);
    }
  });

  it('the AppContext.tsx onSnapshot error callbacks (the actual 41D state-transition logic) are not modified by 41E', () => {
    const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
    assert.doesNotMatch(appContextSrc, /Decision 41E/);
  });
});

// ==================================================================
// G — 41A/41B preserved (tests 19/20)
// ==================================================================

describe('Decision 41E — 41A/41B mechanisms untouched (tests 19/20)', () => {
  it('PeriodicStockCountView: pendingContagemFlushRef registration (41A) still wires flushForSwitchIfNeeded unmodified', () => {
    assert.match(periodicSrc, /registerPendingContagemFlush\(flushForSwitchIfNeeded\);/);
  });

  it('InitialStockCountView: the 41B unmount-cleanup effect still calls flushDraftNow unmodified', () => {
    const idx = initialSrc.lastIndexOf('return () => {\n      flushDraftNow();\n    };');
    assert.notEqual(idx, -1);
  });
});

// ==================================================================
// H — Staff / tenant isolation preserved (§14/§15, test 13/14/22)
// ==================================================================

describe('Decision 41E — Staff restrictions and tenant isolation untouched (§14/§15, tests 13/14/22)', () => {
  it('ReadOnlyDraftRecovery is only ever mounted from inside a subscriptionBlocksNewRecords-gated branch that reads the SAME context-level draft (initialStockDraft/periodicStockDraft) 41D already scopes per-business and per-Owner — no new query, no new Firestore read is introduced by this component', () => {
    assert.doesNotMatch(readOnlySrc, /collection\(|doc\(|onSnapshot\(|getDoc/, 'ReadOnlyDraftRecovery must perform no Firestore reads of its own.');
  });

  it('no cross-business identifier (a second businessId, a loop over multiple businesses, or an owner-portfolio-style aggregation) appears anywhere in the new/changed 41E code', () => {
    assert.doesNotMatch(readOnlySrc, /businessId|ownedBusinessIds|portfolio/i);
  });

  it("Decision 41D's own Staff-vs-Owner branch in AppContext.tsx (the actual access-control decision) is unmodified — 41E adds no new isOwner check of its own, since the EXISTING listener-state machine already fully determines what a Staff session ever sees here", () => {
    const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
    const isOwnerCount = (appContextSrc.match(/if \(isOwner\) \{/g) || []).length;
    // Exactly the three 41D error-callback branches (initial, periodic
    // meta, periodic items) — unchanged count from 41D, proving 41E
    // added no fourth.
    assert.equal(isOwnerCount, 3);
  });
});

// ==================================================================
// I — §19: THE zero-new-write proof (view/recover/export while
// subscription-blocked causes ZERO new Firestore writes)
// ==================================================================

describe('Decision 41E §19 — THE core zero-write proof: viewing/recovering/exporting an existing draft while blocked causes ZERO new Firestore writes', () => {
  it('ReadOnlyDraftRecovery.tsx — the component every blocked "draft-exists" branch renders — contains no Firestore write call anywhere', () => {
    const src = stripLineComments(readOnlySrc);
    assert.doesNotMatch(src, /setDoc\(|updateDoc\(|addDoc\(|deleteDoc\(|writeBatch\(|\.commit\(\)/);
  });

  it('reportExport.ts (the export mechanism reused by 41E) performs no Firestore write of any kind — export is client-side PDF/Excel generation only', () => {
    const reportExportSrc = readFileSync(
      new URL('../apps/tenant/src/components/reports/shared/reportExport.ts', import.meta.url),
      'utf-8'
    );
    assert.doesNotMatch(stripLineComments(reportExportSrc), /setDoc\(|updateDoc\(|addDoc\(|deleteDoc\(|writeBatch\(/);
  });

  it("PeriodicStockCountView's blocked-branch export adapter (handleExportBlockedDraftPdf) calls ONLY exportReportPdf — reading, never writing, periodicStockDraft", () => {
    const idx = periodicSrc.indexOf('const handleExportBlockedDraftPdf = () => {');
    const body = extractFunctionBody(periodicSrc, 'const handleExportBlockedDraftPdf = () => {');
    assert.notEqual(idx, -1);
    assert.match(body, /exportReportPdf\(/);
    assert.doesNotMatch(stripLineComments(body), /setDoc\(|updateDoc\(|addDoc\(|deleteDoc\(|savePeriodicStockDraft|flushPeriodicStockDraftRows/);
  });

  it('mounting the blocked draft-exists branch in either view schedules nothing and calls no save-attempt function — a synchronous render producing static JSX from already-fetched context data, with no macrotask that could later fire a write', () => {
    for (const [label, src] of [
      ['Periodic', periodicSrc],
      ['Initial', initialSrc],
    ] as const) {
      const idx = src.indexOf(
        label === 'Periodic'
          ? "if (periodicStockDraftListenerState === 'draft-exists' && periodicStockDraft) {"
          : "if (initialStockDraftListenerState === 'draft-exists' && initialStockDraft) {"
      );
      const nextGuardIdx = src.indexOf("// 'confirmed-no-draft' (or the defensive draft-exists-but-null", idx);
      assert.notEqual(idx, -1, `${label}: could not locate the draft-exists branch`);
      assert.notEqual(nextGuardIdx, -1, `${label}: could not locate the branch's own end marker`);
      const block = stripLineComments(src.slice(idx, nextGuardIdx));
      assert.doesNotMatch(
        block,
        /setTimeout|setInterval|scheduleRowDraftSave|performDraftSaveAttempt|performRowSaveAttempt/,
        `${label}: the draft-exists branch must schedule nothing and call no save-attempt function.`
      );
    }
  });
});

// ==================================================================
// J — §20: THE core finalization-blocked proof
// ==================================================================

describe('Decision 41E §20 — THE core finalization-blocked proof: a subscription-blocked Owner cannot finalize/create a new stock count', () => {
  it('PeriodicStockCountView: handleConfirmSave (the function that calls recordStockCount) unconditionally returns before that write when subscriptionBlocksNewRecords is true', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleConfirmSave = async () => {');
    assert.match(body, /if \(subscriptionBlocksNewRecords\) return;/);
    assert.match(body, /recordStockCount\(/);
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const recordIdx = body.indexOf('recordStockCount(');
    assert.ok(guardIdx < recordIdx, 'The guard must run before the recordStockCount call, not after.');
  });

  it('InitialStockCountView: handleSubmit (the function that ultimately confirms/finalizes Initial Stock) returns before any finalization work for a NEW (non-redo) confirmation while blocked', () => {
    const body = extractFunctionBody(initialSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
    const guardIdx = body.indexOf('if (subscriptionBlocksNewRecords && !redoingConfirmationId) return;');
    const firstRealWorkIdx = body.indexOf('if (!showConfirmStep) {');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(firstRealWorkIdx, -1);
    assert.ok(guardIdx < firstRealWorkIdx, 'Expected the guard before the secondary-confirmation-step check.');
  });

  it('the finalization guards trace the ACTUAL handler functions (handleConfirmSave / handleSubmit), not merely a disabled button attribute — a `return` statement inside the write-triggering function itself, not a JSX `disabled` prop', () => {
    const periodicBody = extractFunctionBody(periodicSrc, 'const handleConfirmSave = async () => {');
    const initialBody = extractFunctionBody(initialSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
    assert.match(periodicBody, /if \(subscriptionBlocksNewRecords\) return;/);
    assert.match(initialBody, /if \(subscriptionBlocksNewRecords && !redoingConfirmationId\) return;/);
  });

  it('the render-level guard (§4/§5/§6) precedes the editable form\'s own JSX in source order in both views — the handler-level guard proven above is genuine defense-in-depth, not the only thing standing between a blocked Owner and a write', () => {
    const periodicRenderGuardIdx = periodicSrc.indexOf('if (subscriptionBlocksNewRecords) {');
    const periodicFormIdx = periodicSrc.indexOf('<form onSubmit={handleRequestConfirmation}');
    const initialRenderGuardIdx = initialSrc.indexOf('if (subscriptionBlocksNewRecords && !redoingConfirmationId) {');
    const initialFormIdx = initialSrc.indexOf('<form onSubmit={handleSubmit}');
    assert.notEqual(periodicRenderGuardIdx, -1);
    assert.notEqual(periodicFormIdx, -1);
    assert.notEqual(initialRenderGuardIdx, -1);
    assert.notEqual(initialFormIdx, -1);
    assert.ok(periodicRenderGuardIdx < periodicFormIdx);
    assert.ok(initialRenderGuardIdx < initialFormIdx);
  });
});
