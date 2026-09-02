// [Decision 41A — Business-Switch Protection; Implementation
// Authorization, Phase 1] Verifies the coordinated pre-switch flush:
// AppContext owns a single pendingContagemFlushRef that the currently
// mounted Contagem view (Periodic or Initial — never both, since they
// occupy mutually exclusive App.tsx tabs) registers on mount and
// clears on unmount; switchShop() awaits that registered flush BEFORE
// its own updateDoc() changes activeBusinessId, so every write the
// flush performs resolves its Firestore path while activeBusinessId
// is still the OLD business.
//
// Source-text / control-flow ordering tests, matching this
// repository's own established pattern for exactly this class of
// claim — see tests/periodic-stock-interruption-durability.test.ts's
// own "handleConfirmSave awaits flushInFlightSaveRef.current before
// calling recordStockCount" tests for the identical methodology: for
// straight-line async code with no branching that could reorder
// awaited calls, the source order of `await` statements within a
// function body IS the runtime order, so an index-based ordering
// assertion is a genuine proof here, not a weaker substitute for one.
//
// HOW TO RUN:
//   npx tsx --test tests/business-switch-flush-protection-decision-41a.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const periodicSrc = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf-8');
const initialSrc = readFileSync(new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(src: string, signatureMarker: string): string {
  assert.ok(signatureMarker.trimEnd().endsWith('{'), 'signatureMarker must end with the function\'s own opening brace');
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = src.slice(start);
  // The marker itself ends with the function's opening `{` — start
  // balanced-brace scanning from THAT exact brace, never from
  // `rest.indexOf('{')`, which would incorrectly match a `{` inside
  // the marker's own text (e.g. `Promise<{ success: boolean }>`).
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

describe('AppContext.tsx — Decision 41A coordination primitives', () => {
  it('declares pendingContagemFlushRef as a single ref (not a list/registry)', () => {
    assert.match(
      appContextSrc,
      /const pendingContagemFlushRef = useRef<\(\(\) => Promise<\{ success: boolean \}>\) \| null>\(null\);/,
      'Expected a single-slot ref, per the accepted Implementation Plan §4.1.'
    );
  });

  it('exposes registerPendingContagemFlush on the AppContextType interface', () => {
    assert.match(
      appContextSrc,
      /registerPendingContagemFlush: \(fn: \(\(\) => Promise<\{ success: boolean \}>\) \| null\) => void;/
    );
  });

  it('exposes registerPendingContagemFlush on the actual context Provider value', () => {
    const providerValueIdx = appContextSrc.indexOf('<AppContext.Provider');
    assert.notEqual(providerValueIdx, -1);
    const providerValueBlock = appContextSrc.slice(providerValueIdx, providerValueIdx + 6000);
    assert.match(providerValueBlock, /\n\s*registerPendingContagemFlush,\n/);
    // Regression guard for the exact bug caught during this
    // implementation: an earlier edit accidentally dropped
    // refreshShopWorth while inserting this line next to switchShop.
    assert.match(providerValueBlock, /\n\s*refreshShopWorth,\n/, 'refreshShopWorth must still be present in the Provider value.');
  });

  it('declares switchInFlightRef as a boolean ref guarding concurrent switches', () => {
    assert.match(appContextSrc, /const switchInFlightRef = useRef\(false\);/);
  });
});

describe('AppContext.tsx — switchShop() ordering and failure behavior (Decision 41A)', () => {
  const switchShopBody = extractFunctionBody(appContextSrc, 'const switchShop = async (businessId: string) => {');

  it('preserves the existing currentUser/isOwner and ownedBusinessIds authorization checks, unmodified', () => {
    assert.match(switchShopBody, /if \(!currentUser \|\| !isOwner\) return;/);
    assert.match(switchShopBody, /if \(!ownedBusinessIds\.includes\(businessId\)\) \{/);
  });

  it('checks switchInFlightRef and throws before doing any flush/updateDoc work — a concurrent second call is rejected', () => {
    const guardIdx = switchShopBody.indexOf('if (switchInFlightRef.current) {');
    const setTrueIdx = switchShopBody.indexOf('switchInFlightRef.current = true;');
    const flushReadIdx = switchShopBody.indexOf('pendingContagemFlushRef.current');
    assert.notEqual(guardIdx, -1);
    assert.notEqual(setTrueIdx, -1);
    assert.notEqual(flushReadIdx, -1);
    assert.ok(guardIdx < setTrueIdx, 'the in-flight guard must be checked before this call claims the flag');
    assert.ok(setTrueIdx < flushReadIdx, 'the flag must be claimed before this call reads the registered flush');
  });

  it('resets switchInFlightRef in a finally block, so a failed switch does not permanently lock out future attempts', () => {
    assert.match(switchShopBody, /\} finally \{\s*switchInFlightRef\.current = false;\s*\}/);
  });

  it('CRITICAL ORDERING PROOF: awaits the registered flush strictly before calling updateDoc — never the reverse', () => {
    const flushAwaitIdx = switchShopBody.indexOf('const result = await flush();');
    const updateDocIdx = switchShopBody.indexOf('await updateDoc(doc(db,');
    assert.notEqual(flushAwaitIdx, -1, 'expected an awaited flush() call');
    assert.notEqual(updateDocIdx, -1, 'expected the activeBusinessId-changing updateDoc() call');
    assert.ok(
      flushAwaitIdx < updateDocIdx,
      'flush() must be awaited BEFORE updateDoc() — this is the entire Decision 41A/42A safety argument. ' +
        'activeBusinessId only changes once updateDoc() succeeds and the profile listener delivers it, so ' +
        'this ordering is what keeps activeBusinessId equal to the OLD business throughout the whole flush.'
    );
  });

  it('a failed flush throws BEFORE reaching updateDoc — the switch never proceeds on failure', () => {
    const failureThrowIdx = switchShopBody.indexOf("if (!result.success) {");
    const updateDocIdx = switchShopBody.indexOf('await updateDoc(doc(db,');
    assert.notEqual(failureThrowIdx, -1);
    assert.ok(
      failureThrowIdx < updateDocIdx,
      'the failure branch must appear, in source order, before updateDoc() — a thrown error inside this ' +
        'try block prevents any subsequent statement (including updateDoc) from ever executing.'
    );
    assert.match(
      switchShopBody,
      /throw new Error\(\s*'Não foi possível guardar as alterações da contagem antes de mudar de loja\. Tente novamente\.'\s*\)/
    );
  });

  it('when no flush is registered (no Contagem view mounted), the switch proceeds directly — no flush call is forced', () => {
    assert.match(switchShopBody, /const flush = pendingContagemFlushRef\.current;\s*\n\s*if \(flush\) \{/);
  });

  it('never accepts or forwards an explicit businessId parameter into the flush call — the flush always resolves its own target from live activeBusinessId, never a value passed through switchShop', () => {
    // Proof of "no cross-business write via parameter-passing": the
    // registered flush function type is a zero-argument thunk
    // (`() => Promise<{ success: boolean }>`), so switchShop has no
    // way to hand it a businessId even if it wanted to — the flush's
    // own writes are what already-existing functions
    // (savePeriodicStockDraftItem/flushPeriodicStockDraftRows/
    // saveInitialStockDraft) resolve from AppContext's own live
    // activeBusinessId at call time, which the ordering proof above
    // guarantees is still the OLD business throughout.
    assert.match(appContextSrc, /pendingContagemFlushRef = useRef<\(\(\) => Promise<\{ success: boolean \}>\) \| null>/);
    assert.doesNotMatch(switchShopBody, /flush\(businessId\)/, 'the flush must never be called with a businessId argument');
  });
});

for (const [label, src, mountFile] of [
  ['Periodic Contagem', periodicSrc, 'PeriodicStockCountView.tsx'],
  ['Initial Stock Count', initialSrc, 'InitialStockCountView.tsx'],
] as const) {
  describe(`${mountFile} — Decision 41A flush registration (${label})`, () => {
    it('destructures registerPendingContagemFlush from useApp()', () => {
      const useAppBlockEnd = src.indexOf('} = useApp();');
      assert.notEqual(useAppBlockEnd, -1);
      const useAppBlock = src.slice(0, useAppBlockEnd);
      assert.match(useAppBlock, /registerPendingContagemFlush,/);
    });

    it('defines flushForSwitchIfNeeded returning a { success: boolean } result', () => {
      assert.match(src, /const flushForSwitchIfNeeded = async \(\): Promise<\{ success: boolean \}> => \{/);
    });

    it('registers flushForSwitchIfNeeded on mount and unregisters (passes null) on unmount, via an effect with an empty dependency array', () => {
      const idx = src.indexOf('registerPendingContagemFlush(flushForSwitchIfNeeded);');
      assert.notEqual(idx, -1);
      const nearby = src.slice(Math.max(0, idx - 300), idx + 300);
      assert.match(nearby, /useEffect\(\(\) => \{/);
      assert.match(nearby, /return \(\) => registerPendingContagemFlush\(null\);/);
      assert.match(nearby, /\}, \[\]\);/);
    });

    it('never introduces a parallel/duplicate persistence path — only calls into already-existing save functions', () => {
      const body = extractFunctionBody(src, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');
      if (label === 'Periodic Contagem') {
        assert.match(body, /flushPeriodicStockDraftRows\(/);
        assert.doesNotMatch(body, /setDoc\(/, 'must not call setDoc directly — must route through the existing save functions');
      } else {
        assert.match(body, /saveInitialStockDraft\(/);
        assert.doesNotMatch(body, /setDoc\(/, 'must not call setDoc directly — must route through the existing save function');
      }
    });
  });
}

describe('PeriodicStockCountView.tsx — flushForSwitchIfNeeded specifics (Decision 41A)', () => {
  const body = extractFunctionBody(periodicSrc, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');

  it('returns { success: true } immediately with no Firestore call when nothing is pending', () => {
    const guardIdx = body.indexOf('if (rowDebounceTimersRef.current.size === 0 && !draftInFlightSaveRef.current) {');
    assert.notEqual(guardIdx, -1);
    const flushCallIdx = body.indexOf('flushPeriodicStockDraftRows(');
    assert.ok(guardIdx < flushCallIdx, 'the no-pending-work guard must appear before the actual write');
  });

  it('awaits any already-in-flight save (draftInFlightSaveRef) before issuing its own write — never bypasses existing serialization', () => {
    const awaitInFlightIdx = body.indexOf('await draftInFlightSaveRef.current;');
    const ownWriteIdx = body.indexOf('await flushPeriodicStockDraftRows(');
    assert.notEqual(awaitInFlightIdx, -1);
    assert.notEqual(ownWriteIdx, -1);
    assert.ok(awaitInFlightIdx < ownWriteIdx, 'must await the existing in-flight save before this flush issues its own write');
  });

  it('reads live state via latestFlushArgs.current, never a stale captured argument', () => {
    assert.match(body, /latestFlushArgs\.current;/);
  });

  it('clears every pending per-row debounce timer before flushing, matching flushPeriodicDraftNow\'s own existing discipline', () => {
    assert.match(body, /rowDebounceTimersRef\.current\.forEach\(\(timer\) => clearTimeout\(timer\)\);/);
    assert.match(body, /rowDebounceTimersRef\.current\.clear\(\);/);
  });

  it('returns { success: false } on any thrown error, never lets the exception propagate to switchShop uncaught', () => {
    assert.match(body, /\} catch \{\s*return \{ success: false \};\s*\}/);
  });
});

describe('InitialStockCountView.tsx — flushForSwitchIfNeeded specifics (Decision 41A)', () => {
  const body = extractFunctionBody(initialSrc, 'const flushForSwitchIfNeeded = async (): Promise<{ success: boolean }> => {');

  it('returns { success: true } with no write when the draft is not yet loaded or Initial Stock is already confirmed', () => {
    assert.match(body, /if \(!loaded \|\| confirmed\) return \{ success: true \};/);
  });

  it('returns { success: true } with no write when there is no meaningful content to persist', () => {
    assert.match(body, /if \(!hasAnyContent\) return \{ success: true \};/);
  });

  it('reads live state via latestFlushArgs.current, matching the existing flushDraftNow discipline', () => {
    assert.match(body, /latestFlushArgs\.current;/);
  });

  it('returns { success: false } on any thrown error', () => {
    assert.match(body, /\} catch \{\s*return \{ success: false \};\s*\}/);
  });
});

describe('Decision 41A — regression guard: existing unmount-flush adjacency is preserved', () => {
  it('PeriodicStockCountView: flushForSwitchIfNeeded/registration are placed AFTER the existing unmount-flush effect, not between flushPeriodicDraftNow and its own visibilitychange/pagehide effect', () => {
    // This is the exact ordering that periodic-stock-interruption-
    // durability.test.ts's own extractFunctionBody-based tests rely
    // on (flushPeriodicDraftNow's own body ends where the very next
    // `useEffect(() => {` begins) — this test exists so a future edit
    // that moves the new Decision 41A code back between them fails
    // loudly here rather than silently breaking that other, unrelated
    // test file.
    const flushFnIdx = periodicSrc.indexOf('const flushPeriodicDraftNow = () => {');
    const visibilityEffectIdx = periodicSrc.indexOf("document.addEventListener('visibilitychange'", flushFnIdx);
    const registrationIdx = periodicSrc.indexOf('registerPendingContagemFlush(flushForSwitchIfNeeded);');
    assert.notEqual(flushFnIdx, -1);
    assert.notEqual(visibilityEffectIdx, -1);
    assert.notEqual(registrationIdx, -1);
    assert.ok(
      flushFnIdx < visibilityEffectIdx && visibilityEffectIdx < registrationIdx,
      'Decision 41A\'s new code must come after the visibilitychange/pagehide effect, not between it and flushPeriodicDraftNow.'
    );
  });
});
