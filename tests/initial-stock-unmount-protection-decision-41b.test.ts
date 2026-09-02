// [Decision 41B — Initial Stock Count Unmount Protection;
// Implementation Authorization, Phase 2] Verifies InitialStockCountView
// now has an unmount-triggered flush equivalent, in effect, to Periodic
// Contagem's own already-shipped mechanism — closing the gap where an
// in-app tab switch (a genuine React unmount, with neither
// visibilitychange nor pagehide firing) could discard an edit still
// inside its debounce window.
//
// Source-text / control-flow tests, matching this repository's own
// established pattern for exactly this class of claim (see
// tests/periodic-stock-interruption-durability.test.ts's own
// unmount-cleanup assertions for Periodic Contagem, and
// tests/business-switch-flush-protection-decision-41a.test.ts for the
// identical methodology applied to Decision 41A in this same file).
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-unmount-protection-decision-41b.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../apps/tenant/src/components/InitialStockCountView.tsx', import.meta.url), 'utf-8');

describe('InitialStockCountView.tsx — Decision 41B unmount protection', () => {
  it('has an unmount-cleanup effect that calls the existing flushDraftNow, mirroring Periodic Contagem\'s equivalent exactly', () => {
    assert.match(
      src,
      /useEffect\(\(\) => \{\s*return \(\) => \{\s*flushDraftNow\(\);\s*\};\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s*\}, \[\]\);/,
      'Expected a plain unmount-cleanup effect calling flushDraftNow(), matching PeriodicStockCountView.tsx\'s own already-shipped pattern.'
    );
  });

  it('the new unmount effect is placed AFTER the existing visibilitychange/pagehide effect, not in place of it', () => {
    const visibilityEffectIdx = src.indexOf("document.addEventListener('visibilitychange'");
    const pagehideIdx = src.indexOf("window.addEventListener('pagehide', flushDraftNow);");
    const unmountEffectIdx = src.indexOf('return () => {\n      flushDraftNow();\n    };');
    assert.notEqual(visibilityEffectIdx, -1);
    assert.notEqual(pagehideIdx, -1);
    assert.notEqual(unmountEffectIdx, -1, 'Expected the new unmount-only cleanup effect to exist as its own, separate effect.');
    assert.ok(
      visibilityEffectIdx < unmountEffectIdx && pagehideIdx < unmountEffectIdx,
      'The new unmount effect must come after the existing visibilitychange/pagehide wiring, as an addition, not a replacement.'
    );
  });

  it('the existing visibilitychange listener registration is still present, unmodified', () => {
    assert.match(src, /document\.addEventListener\('visibilitychange', handleVisibilityChange\);/);
    assert.match(src, /document\.visibilityState === 'hidden'\) flushDraftNow\(\);/);
  });

  it('the existing pagehide listener registration is still present, unmodified', () => {
    assert.match(src, /window\.addEventListener\('pagehide', flushDraftNow\);/);
  });

  it('the existing visibilitychange/pagehide effect still cleans up its own two listeners — the new unmount effect did not fold into or replace that cleanup', () => {
    assert.match(
      src,
      /return \(\) => \{\s*document\.removeEventListener\('visibilitychange', handleVisibilityChange\);\s*window\.removeEventListener\('pagehide', flushDraftNow\);\s*\};/
    );
  });

  it('flushDraftNow itself is unmodified — still reads latestFlushArgs.current, not a stale captured value', () => {
    const flushFnStart = src.indexOf('const flushDraftNow = () => {');
    assert.notEqual(flushFnStart, -1);
    const nearby = src.slice(flushFnStart, flushFnStart + 400);
    assert.match(nearby, /\} =\s*\n?\s*latestFlushArgs\.current;/);
  });

  it('latestFlushArgs is refreshed unconditionally on every render (assignment outside any effect/condition), so the unmount cleanup always sees the latest typed values', () => {
    assert.match(
      src,
      /const latestFlushArgs = useRef\(\{ rows, date, initialCapitalBasis, draftLoaded, hasInitialStockCount \}\);\s*\n\s*latestFlushArgs\.current = \{ rows, date, initialCapitalBasis, draftLoaded, hasInitialStockCount \};/
    );
  });

  it('flushDraftNow still applies its existing guards (not loaded / already confirmed / no content) — the new unmount trigger does not bypass them', () => {
    const flushFnStart = src.indexOf('const flushDraftNow = () => {');
    const nextEffectIdx = src.indexOf('useEffect(', flushFnStart);
    const flushBody = src.slice(flushFnStart, nextEffectIdx);
    assert.match(flushBody, /if \(!loaded \|\| confirmed\) return;/);
    assert.match(flushBody, /if \(!hasAnyContent\) return;/);
  });

  it('the new unmount effect introduces no new Firestore call of its own — it only calls the existing flushDraftNow, which routes through the existing saveInitialStockDraft', () => {
    const unmountEffectIdx = src.indexOf('return () => {\n      flushDraftNow();\n    };');
    assert.notEqual(unmountEffectIdx, -1);
    const nearby = src.slice(Math.max(0, unmountEffectIdx - 50), unmountEffectIdx + 150);
    assert.doesNotMatch(nearby, /setDoc\(/, 'the unmount effect must not call setDoc directly');
    assert.doesNotMatch(nearby, /saveInitialStockDraft\(/, 'the unmount effect must call flushDraftNow only, not saveInitialStockDraft directly');
  });

  it('does not disturb the Decision 41A registration effect — both effects independently coexist', () => {
    assert.match(src, /registerPendingContagemFlush\(flushForSwitchIfNeeded\);/);
    assert.match(src, /return \(\) => registerPendingContagemFlush\(null\);/);
  });
});
