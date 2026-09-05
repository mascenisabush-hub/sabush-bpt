// [Decision 41D — Draft Listener State Hardening; Implementation
// Authorization] Source-text / control-flow ordering tests for the
// governed four-state draft-listener model (loading / confirmed-no-draft
// / draft-exists / load-error) in AppContext.tsx, plus the minimal
// consuming-view gates in PeriodicStockCountView.tsx and
// InitialStockCountView.tsx. Same established methodology as this
// repo's own tests/business-switch-flush-protection-decision-41a.test.ts
// and tests/draft-save-bounded-retry-decision-41c.test.ts (see either
// file's own header comment for the full rationale).
//
// HOW TO RUN:
//   npx tsx --test tests/draft-listener-state-hardening-decision-41d.test.ts

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

function stripLineComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

// Extracts the (successCallback, errorCallback) pair passed to a
// specific onSnapshot(...) call, identified by the ref variable name
// used as its first argument (e.g. 'initialDraftRef').
function extractOnSnapshotCallbacks(src: string, refName: string): { success: string; error: string } {
  const marker = `onSnapshot(\n      ${refName},`;
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, `Could not locate onSnapshot(${refName}, ...) — has it been restructured?`);
  const rest = src.slice(start);
  // Find the matching closing paren for this onSnapshot( call by brace/paren balance.
  const openParenIdx = rest.indexOf('(');
  let depth = 0;
  let endIdx = -1;
  for (let i = openParenIdx; i < rest.length; i++) {
    if (rest[i] === '(') depth++;
    if (rest[i] === ')') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  assert.notEqual(endIdx, -1, `Could not find the balanced closing paren for onSnapshot(${refName}, ...)`);
  const fullCall = rest.slice(0, endIdx + 1);
  // The call body is: onSnapshot(\n  ref,\n  (snap) => {...},\n  (err) => {...}\n);
  // Split on the boundary between the two top-level arrow-function args.
  const successStart = fullCall.indexOf('(snap) => {');
  assert.notEqual(successStart, -1, `Could not find the success (snap) => {...} callback for onSnapshot(${refName}, ...)`);
  const errorMarkerCandidates = ['(err) => {', '(err) =>', '() => {'];
  let errorStart = -1;
  for (const cand of errorMarkerCandidates) {
    const idx = fullCall.indexOf(cand, successStart + 1);
    if (idx !== -1) {
      errorStart = idx;
      break;
    }
  }
  assert.notEqual(errorStart, -1, `Could not find the error callback for onSnapshot(${refName}, ...)`);
  return {
    success: fullCall.slice(successStart, errorStart),
    error: fullCall.slice(errorStart),
  };
}

// ==================================================================
// A — Governed type + initial state
// ==================================================================

describe('AppContext.tsx — Decision 41D governed DraftListenerState type', () => {
  it("declares the exact four governed states: 'loading' | 'confirmed-no-draft' | 'draft-exists' | 'load-error'", () => {
    assert.match(
      appContextSrc,
      /type DraftListenerState = 'loading' \| 'confirmed-no-draft' \| 'draft-exists' \| 'load-error';/
    );
  });

  it('exposes initialStockDraftListenerState and periodicStockDraftListenerState on AppContextType', () => {
    assert.match(appContextSrc, /initialStockDraftListenerState: DraftListenerState;/);
    assert.match(appContextSrc, /periodicStockDraftListenerState: DraftListenerState;/);
  });

  it('exposes both fields on the actual Provider value (not just the type)', () => {
    const providerValueIdx = appContextSrc.indexOf('<AppContext.Provider');
    assert.notEqual(providerValueIdx, -1);
    const providerValueBlock = appContextSrc.slice(providerValueIdx, providerValueIdx + 8000);
    assert.match(providerValueBlock, /\n\s*initialStockDraftListenerState,\n/);
    assert.match(providerValueBlock, /\n\s*periodicStockDraftListenerState,\n/);
  });

  it("test 1 — every listener-state useState is initialized to 'loading', never null/undefined/false/empty as an implicit substitute", () => {
    assert.match(appContextSrc, /const \[initialStockDraftListenerState, setInitialStockDraftListenerState\] = useState<DraftListenerState>\('loading'\);/);
    assert.match(appContextSrc, /const \[periodicStockDraftMetaListenerState, setPeriodicStockDraftMetaListenerState\] = useState<DraftListenerState>\('loading'\);/);
    assert.match(appContextSrc, /const \[periodicStockDraftItemsListenerState, setPeriodicStockDraftItemsListenerState\] = useState<DraftListenerState>\('loading'\);/);
  });
});

// ==================================================================
// B — Initial Stock draft listener (unsubInitialDraft)
// ==================================================================

describe('AppContext.tsx — unsubInitialDraft (Initial Stock draft listener)', () => {
  const { success, error } = extractOnSnapshotCallbacks(appContextSrc, 'initialDraftRef');

  it('test 2/3 — successful snapshot sets confirmed-no-draft or draft-exists based on snap.exists(), never inferred from stale state', () => {
    assert.match(success, /setInitialStockDraftListenerState\(snap\.exists\(\) \? 'draft-exists' : 'confirmed-no-draft'\);/);
  });

  it('branches on isOwner to distinguish a genuine Owner error from expected Staff permission denial', () => {
    assert.match(error, /if \(isOwner\) \{/);
    assert.match(error, /\} else \{/);
  });

  it("test 4 — an Owner listener error transitions to 'load-error'", () => {
    const ownerBranchStart = error.indexOf('if (isOwner) {');
    const elseBranchStart = error.indexOf('} else {');
    const ownerBranch = error.slice(ownerBranchStart, elseBranchStart);
    assert.match(ownerBranch, /setInitialStockDraftListenerState\('load-error'\);/);
  });

  it("test 5 — an Owner listener error does NOT set 'confirmed-no-draft' anywhere in its own branch", () => {
    const ownerBranchStart = error.indexOf('if (isOwner) {');
    const elseBranchStart = error.indexOf('} else {');
    const ownerBranch = error.slice(ownerBranchStart, elseBranchStart);
    assert.doesNotMatch(ownerBranch, /'confirmed-no-draft'/);
  });

  it('test 6 — an Owner listener error does NOT call setInitialStockDraft(null) — an already-known real draft is never cleared merely because the listener failed', () => {
    const ownerBranchStart = error.indexOf('if (isOwner) {');
    const elseBranchStart = error.indexOf('} else {');
    const ownerBranch = stripLineComments(error.slice(ownerBranchStart, elseBranchStart));
    assert.doesNotMatch(ownerBranch, /setInitialStockDraft\(/, 'The Owner error branch must never call setInitialStockDraft at all — neither to null it nor to fabricate a value.');
  });

  it('test 8 — Staff (non-Owner) permission-denial behavior is preserved EXACTLY: draft stays null, loaded stays true, reported as confirmed-no-draft', () => {
    const elseBranchStart = error.indexOf('} else {');
    const staffBranch = error.slice(elseBranchStart);
    assert.match(staffBranch, /setInitialStockDraft\(null\);/);
    assert.match(staffBranch, /setInitialStockDraftLoaded\(true\);/);
    assert.match(staffBranch, /setInitialStockDraftListenerState\('confirmed-no-draft'\);/);
    // Never load-error for Staff — preserving the existing, ungated UX.
    assert.doesNotMatch(staffBranch, /'load-error'/);
  });

  it('initialStockDraftLoaded is still set true in BOTH branches of the error callback — its pre-41D meaning ("some definitive result arrived") is preserved unmodified for existing consumers', () => {
    const loadedCallCount = (error.match(/setInitialStockDraftLoaded\(true\);/g) || []).length;
    assert.equal(loadedCallCount, 2, 'Expected setInitialStockDraftLoaded(true) in both the Owner and the Staff branch.');
  });

  it('the isOwner closure-capture rationale is documented (not silently relying on undocumented behavior)', () => {
    assert.match(appContextSrc, /isOwner` is read\s*\n\s*\/\/ via closure, not added to this effect's own dependency array/);
  });
});

// ==================================================================
// C — Periodic Contagem draft listeners (meta + items)
// ==================================================================

describe('AppContext.tsx — unsubPeriodicDraftMeta (Periodic Contagem meta sub-listener)', () => {
  const { success, error } = extractOnSnapshotCallbacks(appContextSrc, 'periodicDraftMetaRef');

  it('successful snapshot sets confirmed-no-draft or draft-exists based on snap.exists()', () => {
    assert.match(success, /setPeriodicStockDraftMetaListenerState\(snap\.exists\(\) \? 'draft-exists' : 'confirmed-no-draft'\);/);
  });

  it("an Owner error transitions to 'load-error' and never calls setPeriodicStockDraftMeta(null)", () => {
    const ownerBranchStart = error.indexOf('if (isOwner) {');
    const elseBranchStart = error.indexOf('} else {');
    const ownerBranch = error.slice(ownerBranchStart, elseBranchStart);
    assert.match(ownerBranch, /setPeriodicStockDraftMetaListenerState\('load-error'\);/);
    assert.doesNotMatch(ownerBranch, /setPeriodicStockDraftMeta\(/);
    assert.doesNotMatch(ownerBranch, /'confirmed-no-draft'/);
  });

  it('Staff denial behavior is preserved exactly: meta stays null, loaded stays true, reported as confirmed-no-draft', () => {
    const elseBranchStart = error.indexOf('} else {');
    const staffBranch = error.slice(elseBranchStart);
    assert.match(staffBranch, /setPeriodicStockDraftMeta\(null\);/);
    assert.match(staffBranch, /setPeriodicStockDraftMetaLoaded\(true\);/);
    assert.match(staffBranch, /setPeriodicStockDraftMetaListenerState\('confirmed-no-draft'\);/);
  });
});

describe('AppContext.tsx — unsubPeriodicDraftItems (Periodic Contagem items sub-listener)', () => {
  const { success, error } = extractOnSnapshotCallbacks(appContextSrc, 'periodicDraftItemsRef');

  it('a successful snapshot always sets draft-exists (this sub-listener never asserts existence/absence on its own — meta owns that signal)', () => {
    assert.match(success, /setPeriodicStockDraftItemsListenerState\('draft-exists'\);/);
  });

  it('an Owner error transitions to load-error and never clears the already-known items map', () => {
    const ownerBranchStart = error.indexOf('if (isOwner) {');
    const elseBranchStart = error.indexOf('} else {');
    const ownerBranch = error.slice(ownerBranchStart, elseBranchStart);
    assert.match(ownerBranch, /setPeriodicStockDraftItemsListenerState\('load-error'\);/);
    assert.doesNotMatch(ownerBranch, /setPeriodicStockDraftItemsByKey\(/);
  });

  it('Staff denial behavior is preserved exactly: items map stays empty, loaded stays true, reported as confirmed-no-draft', () => {
    const elseBranchStart = error.indexOf('} else {');
    const staffBranch = error.slice(elseBranchStart);
    assert.match(staffBranch, /setPeriodicStockDraftItemsByKey\(\{\}\);/);
    assert.match(staffBranch, /setPeriodicStockDraftItemsLoaded\(true\);/);
    assert.match(staffBranch, /setPeriodicStockDraftItemsListenerState\('confirmed-no-draft'\);/);
  });
});

describe('AppContext.tsx — combined periodicStockDraftListenerState derivation', () => {
  it('test 7 (periodic half) — an error on EITHER sub-listener wins over the other one\'s success; loading wins over any settled state; only once both are settled and neither errored does meta\'s own existence signal decide the result', () => {
    const idx = appContextSrc.indexOf('const periodicStockDraftListenerState: DraftListenerState =');
    assert.notEqual(idx, -1);
    const block = appContextSrc.slice(idx, idx + 700);
    const errorCheckIdx = block.indexOf("=== 'load-error' || periodicStockDraftItemsListenerState === 'load-error'");
    const loadingCheckIdx = block.indexOf("=== 'loading' || periodicStockDraftItemsListenerState === 'loading'");
    const fallbackIdx = block.indexOf(': periodicStockDraftMetaListenerState;');
    assert.notEqual(errorCheckIdx, -1, 'Expected the load-error check to test BOTH sub-listener states.');
    assert.notEqual(loadingCheckIdx, -1, 'Expected the loading check to test BOTH sub-listener states.');
    assert.notEqual(fallbackIdx, -1, 'Expected the final fallback to defer to the meta sub-listener\'s own state (the only one of the two that means anything about draft existence).');
    assert.ok(errorCheckIdx < loadingCheckIdx && loadingCheckIdx < fallbackIdx, 'Expected the ternary to check load-error first, then loading, then fall back to the meta state — in that priority order.');
  });
});

// ==================================================================
// D — Business-switch / sign-out reset coverage
// ==================================================================

describe("AppContext.tsx — all three listener-state setters reset to 'loading' on business switch and sign-out (never left stale across a switch)", () => {
  it('the sign-out reset (onAuthStateChanged) resets all three', () => {
    const idx = appContextSrc.indexOf('if (!user) {');
    assert.notEqual(idx, -1);
    const block = appContextSrc.slice(idx, idx + 1200);
    assert.match(block, /setInitialStockDraftListenerState\('loading'\);/);
    assert.match(block, /setPeriodicStockDraftMetaListenerState\('loading'\);/);
    assert.match(block, /setPeriodicStockDraftItemsListenerState\('loading'\);/);
  });

  it('the business-switch reset (the [activeBusinessId] effect) resets all three, unconditionally on every switch — not only when activeBusinessId becomes falsy', () => {
    const idx = appContextSrc.indexOf('// full on a direct Business A → Business B switch');
    assert.notEqual(idx, -1);
    const block = appContextSrc.slice(idx, idx + 2500);
    const initialResetIdx = block.indexOf("setInitialStockDraftListenerState('loading');");
    const metaResetIdx = block.indexOf("setPeriodicStockDraftMetaListenerState('loading');");
    const itemsResetIdx = block.indexOf("setPeriodicStockDraftItemsListenerState('loading');");
    const ifActiveBusinessIdIdx = block.indexOf('if (!activeBusinessId) {');
    assert.notEqual(initialResetIdx, -1);
    assert.notEqual(metaResetIdx, -1);
    assert.notEqual(itemsResetIdx, -1);
    assert.notEqual(ifActiveBusinessIdIdx, -1);
    assert.ok(
      initialResetIdx < ifActiveBusinessIdIdx && metaResetIdx < ifActiveBusinessIdIdx && itemsResetIdx < ifActiveBusinessIdIdx,
      'All three resets must run BEFORE the `if (!activeBusinessId)` branch — i.e. unconditionally on every switch, not gated behind activeBusinessId becoming falsy.'
    );
  });
});

// ==================================================================
// E — Consuming-view gates (PeriodicStockCountView / InitialStockCountView)
// ==================================================================

describe('PeriodicStockCountView.tsx — Decision 41D consuming gate', () => {
  it('destructures periodicStockDraftListenerState from useApp()', () => {
    const useAppBlockEnd = periodicSrc.indexOf('} = useApp();');
    assert.notEqual(useAppBlockEnd, -1);
    const useAppBlock = periodicSrc.slice(0, useAppBlockEnd);
    assert.match(useAppBlock, /periodicStockDraftListenerState,/);
  });

  it("renders the existing loading notice when listener state is 'loading' (not merely !periodicStockDraftLoaded)", () => {
    assert.match(periodicSrc, /if \(periodicStockDraftListenerState === 'loading'\) \{/);
  });

  it("test 8 (periodic view half) / core UI proof — a dedicated 'load-error' branch exists, placed BEFORE the main editing UI, so an Owner listener error can never fall through into it and be silently skipped", () => {
    const loadingIdx = periodicSrc.indexOf("if (periodicStockDraftListenerState === 'loading') {");
    const errorIdx = periodicSrc.indexOf("if (periodicStockDraftListenerState === 'load-error') {");
    // [Decision 60 §13.A — Resume/Re-Entry Behavior] The stale-draft
    // resume/discard banner this boundary marker used to anchor on
    // (draftDecisionPending) is removed entirely — resume is now
    // automatic. The load-error branch is now immediately followed by
    // the component's own main return statement.
    const mainReturnIdx = periodicSrc.indexOf('return (\n    <div className="max-w-7xl mx-auto pb-12 space-y-4">');
    assert.notEqual(loadingIdx, -1);
    assert.notEqual(errorIdx, -1);
    assert.notEqual(mainReturnIdx, -1);
    assert.ok(loadingIdx < errorIdx && errorIdx < mainReturnIdx, 'Expected the order: loading branch, then load-error branch, then the main editing UI — never skipping straight from loading past load-error.');
  });

  it('the load-error branch never mentions periodicStockDraft, catalogRows, or any write function — it is a read-only notice, never a recovery/write action (41D is listener-state hardening only, not 41E recovery)', () => {
    const errorIdx = periodicSrc.indexOf("if (periodicStockDraftListenerState === 'load-error') {");
    const nextIdx = periodicSrc.indexOf('return (\n    <div className="max-w-7xl mx-auto pb-12 space-y-4">');
    const errorBlock = periodicSrc.slice(errorIdx, nextIdx);
    assert.doesNotMatch(errorBlock, /savePeriodicStockDraftItem|savePeriodicStockDraftMeta|flushPeriodicStockDraftRows|clearPeriodicStockDraft/);
  });
});

describe('InitialStockCountView.tsx — Decision 41D consuming gate', () => {
  it('destructures initialStockDraftListenerState from useApp()', () => {
    const useAppBlockEnd = initialSrc.indexOf('} = useApp();');
    assert.notEqual(useAppBlockEnd, -1);
    const useAppBlock = initialSrc.slice(0, useAppBlockEnd);
    assert.match(useAppBlock, /initialStockDraftListenerState,/);
  });

  it("the draft-population effect blocks on BOTH 'loading' and 'load-error' — never proceeds to treat a null draft as confirmed absence while the listener is unreliable", () => {
    const idx = initialSrc.indexOf('useEffect(() => {\n    if (draftLoaded) return;');
    assert.notEqual(idx, -1);
    const effectSlice = initialSrc.slice(idx, idx + 1600);
    const loadingGuardIdx = effectSlice.indexOf("if (initialStockDraftListenerState === 'loading') return;");
    const errorGuardIdx = effectSlice.indexOf("if (initialStockDraftListenerState === 'load-error') return;");
    const nullCheckIdx = effectSlice.indexOf('if (initialStockDraft === null) {');
    assert.notEqual(loadingGuardIdx, -1);
    assert.notEqual(errorGuardIdx, -1);
    assert.notEqual(nullCheckIdx, -1);
    assert.ok(
      loadingGuardIdx < errorGuardIdx && errorGuardIdx < nullCheckIdx,
      'Both guards must appear, in order, BEFORE the `initialStockDraft === null` branch that populates default rows and marks the form ready — otherwise a load-error would fall straight through to that branch exactly like a genuine confirmed-empty result.'
    );
  });

  it("test 8 (initial view half) — a dedicated load-error notice is rendered, gated on !draftLoaded (never shown once a genuine result has already settled things) and never during redo (a separate flow that doesn't depend on this listener)", () => {
    const idx = initialSrc.indexOf("if (!draftLoaded && !redoingConfirmationId && initialStockDraftListenerState === 'load-error') {");
    assert.notEqual(idx, -1);
  });

  it('is placed after the existing subscriptionBlocksNewRecords check — an unrelated, pre-existing gate (§10: never confuse subscription blocking with a listener load error) that must keep taking priority unmodified', () => {
    const subIdx = initialSrc.indexOf('if (subscriptionBlocksNewRecords && !redoingConfirmationId) {');
    const errorIdx = initialSrc.indexOf("if (!draftLoaded && !redoingConfirmationId && initialStockDraftListenerState === 'load-error') {");
    assert.notEqual(subIdx, -1);
    assert.notEqual(errorIdx, -1);
    assert.ok(subIdx < errorIdx);
  });
});

// ==================================================================
// F — The core negative-regression proof (§14)
// ==================================================================

describe('Decision 41D §14 — THE core negative regression proof: the dangerous historical collapse cannot return', () => {
  it('for an Owner, no code path anywhere in the initial-draft, periodic-meta, or periodic-items error callbacks can produce load-error and confirmed-no-draft as the same outcome — the two are mutually exclusive branches, never merged', () => {
    for (const refName of ['initialDraftRef', 'periodicDraftMetaRef', 'periodicDraftItemsRef']) {
      const { error } = extractOnSnapshotCallbacks(appContextSrc, refName);
      const ownerBranchStart = error.indexOf('if (isOwner) {');
      const elseBranchStart = error.indexOf('} else {');
      assert.notEqual(ownerBranchStart, -1, `Expected an isOwner branch in the ${refName} error callback.`);
      assert.notEqual(elseBranchStart, -1, `Expected a Staff (else) branch in the ${refName} error callback.`);
      const ownerBranch = error.slice(ownerBranchStart, elseBranchStart);
      // The single, explicit proof: scanning ONLY the code that runs
      // when an Owner's listener errors, 'confirmed-no-draft' does not
      // appear anywhere — it is structurally impossible for an Owner
      // listener failure to ever set that state.
      assert.doesNotMatch(
        ownerBranch,
        /confirmed-no-draft/,
        `Owner error branch for ${refName} must never be able to reach 'confirmed-no-draft' — that would be exactly the dangerous historical collapse Decision 41D exists to prevent.`
      );
      // And the converse: it DOES reach load-error, so this isn't
      // merely an absence of the dangerous string — it's the presence
      // of the correct, distinct one.
      assert.match(ownerBranch, /load-error/, `Owner error branch for ${refName} must set load-error.`);
    }
  });
});
