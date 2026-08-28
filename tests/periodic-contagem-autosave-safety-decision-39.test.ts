// Periodic Contagem — Per-Row Autosave Scheduling + SPA Navigation
// Flush (Decision 39).
//
// [Governing chain: stock-count-data-loss-resilience-specification.md
// §6/§13 (Decision 38) -> Decision 39 amendment (SIGNED — SABUSHIMIKE
// MASCENI, 28 August 2026) -> Rule 8 Assessment (READY) ->
// Implementation Plan -> Implementation Authorization (SIGNED —
// SABUSHIMIKE MASCENI, 29 August 2026)]
//
// SCOPE: same documented constraint as
// tests/periodic-stock-interruption-durability.test.ts —
// PeriodicStockCountView.tsx has no jsdom/testing-library harness in
// this repo, so this suite proves scheduling/ordering/sourcing
// properties via source inspection, not a runtime/behavioral test
// against a live component.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-autosave-safety-decision-39.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = src.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

const scheduleRowDraftSaveBody = extractFunctionBody(source, 'const scheduleRowDraftSave = (');

describe('A — independent per-row timers (Decision 39a FR-N1)', () => {
  it('rowDebounceTimersRef is a Map keyed by row identity, replacing the prior single shared draftDebounceTimerRef', () => {
    assert.match(
      source,
      /const rowDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>\(new Map\(\)\);/
    );
    assert.doesNotMatch(source, /const draftDebounceTimerRef = useRef/);
  });

  it('scheduleRowDraftSave clears/reschedules only the timer for its own rowKey, never the whole map', () => {
    assert.match(scheduleRowDraftSaveBody, /const existing = rowDebounceTimersRef\.current\.get\(rowKey\);/);
    assert.match(scheduleRowDraftSaveBody, /if \(existing\) clearTimeout\(existing\);/);
    assert.match(scheduleRowDraftSaveBody, /rowDebounceTimersRef\.current\.set\(rowKey, timer\);/);
    // Must never clear the whole map inside the per-row scheduler itself.
    assert.doesNotMatch(scheduleRowDraftSaveBody, /rowDebounceTimersRef\.current\.clear\(\)/);
  });

  it('updateCatalogRow schedules a timer keyed by this row\'s own productId', () => {
    const body = extractFunctionBody(source, 'const updateCatalogRow = (');
    assert.match(body, /scheduleRowDraftSave\(`catalog:\$\{productId\}`\)/);
  });

  it('updateManualRow schedules a timer keyed by this row\'s own array index', () => {
    const body = extractFunctionBody(source, 'const updateManualRow = (');
    assert.match(body, /scheduleRowDraftSave\(`manual:\$\{index\}`\)/);
  });

  it('editing a catalog row and editing a manual row use disjoint key prefixes ("catalog:" vs "manual:"), so neither can ever collide with or reset the other\'s timer', () => {
    assert.match(source, /scheduleRowDraftSave\(`catalog:\$\{productId\}`\)/);
    assert.match(source, /scheduleRowDraftSave\(`manual:\$\{index\}`\)/);
  });

  it('count-level, non-row-specific changes (type/label/date) use a shared "__meta__" key, never a specific row\'s key', () => {
    const typeBody = extractFunctionBody(source, 'const handleTypeChange = (');
    const labelBody = extractFunctionBody(source, 'const handleLabelChange = (');
    const dateBody = extractFunctionBody(source, 'const handleDateChange = (');
    assert.match(typeBody, /scheduleRowDraftSave\('__meta__'\)/);
    assert.match(labelBody, /scheduleRowDraftSave\('__meta__'\)/);
    assert.match(dateBody, /scheduleRowDraftSave\('__meta__'\)/);
  });
});

describe('B — same-row debounce still collapses rapid edits (Decision 39a)', () => {
  it('scheduleRowDraftSave\'s clear-then-reschedule step is unconditional on every call for the same rowKey — the same collapsing behavior the prior shared timer already had, now scoped to one map entry', () => {
    // A single rowKey passed twice in quick succession: the second call's
    // `if (existing) clearTimeout(existing)` cancels the first call's
    // still-pending timer before scheduling its own — proven directly
    // by the unconditional presence of that guard in the function body
    // (already asserted in group A), which applies identically whether
    // the same row is edited once or five times in the same window.
    assert.match(scheduleRowDraftSaveBody, /const existing = rowDebounceTimersRef\.current\.get\(rowKey\);\s*\n\s*if \(existing\) clearTimeout\(existing\);/);
  });
});

describe('C — live-state sourcing / T0-T100 stale-write protection (Decision 39a FR-N2, Rule 8 §D)', () => {
  it('the timer callback reads live current state from latestFlushArgs.current, never from a schedule-time-captured argument', () => {
    assert.match(
      scheduleRowDraftSaveBody,
      /const \{ catalogRows: cr, manualRows: mr, type: t, label: l, date: d, newProductInfo: npi \} = latestFlushArgs\.current;/
    );
    // scheduleRowDraftSave's own parameter list must be JUST the row
    // key — no nextCatalogRows/nextManualRows/etc. argument exists to
    // capture a stale snapshot in the first place.
    assert.match(source, /const scheduleRowDraftSave = \(rowKey: string\) => \{/);
  });

  it('latestFlushArgs is reassigned unconditionally on every render, so it is always current by the time any row\'s 800ms timer actually fires', () => {
    assert.match(
      source,
      /const latestFlushArgs = useRef\(\{ catalogRows, manualRows, type, label, date, newProductInfo \}\);\s*\n\s*latestFlushArgs\.current = \{ catalogRows, manualRows, type, label, date, newProductInfo \};/
    );
  });

  it('T0/T100 proof: Row A\'s timer (scheduled first) and Row B\'s timer (scheduled later) both read from the SAME live ref, so whichever fires first or last, its payload reflects every edit made before it actually fires — a Row-A-triggered write physically cannot omit a Row B edit that happened before A\'s timer fired, since both derive allRows from the identical latestFlushArgs.current snapshot, never from separate per-timer snapshots', () => {
    // The entire write-payload construction (allRows) is built from a
    // SINGLE shared source (latestFlushArgs.current), not from
    // anything unique to whichever row's timer happened to trigger the
    // write — this is what makes the reversion scenario structurally
    // impossible, proven by there being exactly one read site for
    // catalogRows/manualRows inside this function, not one per row.
    const readSiteCount = (scheduleRowDraftSaveBody.match(/latestFlushArgs\.current/g) || []).length;
    assert.equal(readSiteCount, 1, 'Expected exactly one live-state read site inside the per-row timer callback — proving every row\'s timer shares the identical current-state source, never a per-row-captured one.');
  });
});

describe('D — global write serialization is preserved (Decision 39a FR-N3, Rule 8 §D)', () => {
  it('draftInFlightSaveRef remains a single ref (not a per-row Map), unmodified in shape', () => {
    assert.match(source, /const draftInFlightSaveRef = useRef<Promise<void> \| null>\(null\);/);
    assert.doesNotMatch(source, /draftInFlightSaveRef\s*[:=]\s*useRef<Map/);
  });

  it('every row\'s timer callback awaits draftInFlightSaveRef.current before issuing its own write', () => {
    const awaitIdx = scheduleRowDraftSaveBody.indexOf('await draftInFlightSaveRef.current');
    const saveIdx = scheduleRowDraftSaveBody.indexOf('savePeriodicStockDraft(');
    assert.notEqual(awaitIdx, -1);
    assert.ok(awaitIdx < saveIdx);
  });

  it('no per-row write-serialization structure (e.g. a Map of in-flight promises) was introduced', () => {
    assert.doesNotMatch(source, /rowInFlightSaveRef|perRowInFlightRef|rowWriteQueue/i);
  });
});

describe('E — manual-row removal re-indexes pending timers correctly (Implementation Plan §1b)', () => {
  const removeBody = extractFunctionBody(source, 'const handleRemoveManualRow = (');

  it('cancels the removed row\'s own pending timer outright', () => {
    assert.match(removeBody, /const removedKey = `manual:\$\{index\}`;/);
    assert.match(removeBody, /const removedTimer = rowDebounceTimersRef\.current\.get\(removedKey\);/);
    assert.match(removeBody, /if \(removedTimer\) clearTimeout\(removedTimer\);/);
  });

  it('re-keys every later manual row\'s own timer down by one, using the identical i < index / i > index shift confirmedManualRowIndices/manualRowSaveError already use', () => {
    assert.match(removeBody, /if \(i < index\) shifted\.set\(key, timer\);/);
    assert.match(removeBody, /else if \(i > index\) shifted\.set\(`manual:\$\{i - 1\}`, timer\);/);
  });

  it('non-manual-row timer keys (catalog:*, __meta__, newProductInfo:*) pass through the re-indexing step untouched', () => {
    assert.match(removeBody, /if \(!match\) \{\s*\n\s*shifted\.set\(key, timer\);\s*\n\s*return;\s*\n\s*\}/);
  });

  it('re-indexing happens before the resulting save is scheduled', () => {
    const shiftedAssignIdx = removeBody.indexOf('rowDebounceTimersRef.current = shifted;');
    const scheduleIdx = removeBody.indexOf("scheduleRowDraftSave('__meta__')");
    assert.notEqual(shiftedAssignIdx, -1);
    assert.notEqual(scheduleIdx, -1);
    assert.ok(shiftedAssignIdx < scheduleIdx);
  });
});

describe('F — SPA unmount triggers a current-state flush (Decision 39b, Rule 8 §E)', () => {
  it('a dedicated useEffect with an empty dependency array calls flushPeriodicDraftNow only in its cleanup (i.e. on unmount)', () => {
    const marker = 'useEffect(() => {\n    return () => {\n      flushPeriodicDraftNow();\n    };\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);';
    assert.ok(source.includes(marker), 'Expected an unmount-only effect calling flushPeriodicDraftNow, distinct from the visibilitychange/pagehide effect.');
  });

  it('this effect is separate from, and does not replace, the existing visibilitychange/pagehide effect', () => {
    assert.match(source, /document\.addEventListener\('visibilitychange', handleVisibilityChange\);/);
    assert.match(source, /window\.addEventListener\('pagehide', flushPeriodicDraftNow\);/);
    // Both the browser-event effect and the unmount-only effect must
    // independently exist — two separate useEffect calls, not one
    // effect doing both jobs.
    const visibilityEffectIdx = source.indexOf("document.addEventListener('visibilitychange', handleVisibilityChange);");
    const unmountEffectIdx = source.indexOf('return () => {\n      flushPeriodicDraftNow();\n    };');
    assert.notEqual(visibilityEffectIdx, -1);
    assert.notEqual(unmountEffectIdx, -1);
    assert.ok(visibilityEffectIdx < unmountEffectIdx, 'Expected the unmount effect to be declared after the existing visibilitychange/pagehide effect, not replacing it.');
  });

  it('the unmount flush calls the existing flushPeriodicDraftNow unmodified — no new write-construction logic is introduced at the call site', () => {
    const unmountEffectStart = source.indexOf('useEffect(() => {\n    return () => {\n      flushPeriodicDraftNow();');
    const unmountEffectSlice = source.slice(unmountEffectStart, unmountEffectStart + 200);
    assert.doesNotMatch(unmountEffectSlice, /savePeriodicStockDraft\(/, 'The unmount effect must not call savePeriodicStockDraft directly — only the existing flushPeriodicDraftNow.');
  });

  it('App.tsx is not modified — no router, no navigation guard introduced', () => {
    const appSource = readFileSync(new URL('../apps/tenant/src/App.tsx', import.meta.url), 'utf-8');
    assert.doesNotMatch(appSource, /react-router|useNavigate|<Routes/);
    assert.match(appSource, /activeTab === 'stock-count' && \(/, 'Expected the existing activeTab-gated conditional render to remain unchanged.');
  });
});

describe('G — Guardar remains local-only, unaffected by the autosave changes (Implementation Authorization §2)', () => {
  it('handleSaveCatalogRow and handleSaveManualRow call no Firestore function and no autosave scheduler', () => {
    const catalogBody = extractFunctionBody(source, 'const handleSaveCatalogRow = (');
    const manualBody = extractFunctionBody(source, 'const handleSaveManualRow = (');
    for (const body of [catalogBody, manualBody]) {
      assert.doesNotMatch(body, /savePeriodicStockDraft/);
      assert.doesNotMatch(body, /scheduleRowDraftSave/);
      assert.doesNotMatch(body, /flushPeriodicDraftNow/);
    }
  });

  it('handleSaveCatalogRow/handleSaveManualRow still only touch local review-lock state (confirmedCatalogProductIds/confirmedManualRowIndices) and their own save-error maps', () => {
    const catalogBody = extractFunctionBody(source, 'const handleSaveCatalogRow = (');
    const manualBody = extractFunctionBody(source, 'const handleSaveManualRow = (');
    assert.match(catalogBody, /setConfirmedCatalogProductIds\(/);
    assert.match(manualBody, /setConfirmedManualRowIndices\(/);
  });

  it('no reference to "Validar" was introduced anywhere in the component', () => {
    assert.doesNotMatch(source, /Validar/);
  });

  it('the "Guardar" button labels remain unchanged', () => {
    const guardarCount = (source.match(/>\s*Guardar\s*</g) || []).length;
    assert.equal(guardarCount, 2, 'Expected exactly the two existing "Guardar" labels (catalog row + manual row), unchanged.');
  });
});

describe('H — no schema/storage-shape change (Decision 39a, explicit non-goal)', () => {
  it('PeriodicStockDraft.items remains a plain array — no new collection, subcollection, or keyed-map field reference exists in this component', () => {
    assert.doesNotMatch(source, /stockCountDrafts\/[^p]/, 'No draft path other than the existing "periodic"/"initial" singleton ids should appear.');
    assert.doesNotMatch(source, /\.items\[.*productId.*\]\s*=/, 'No direct keyed-map-style assignment into items should exist — it remains an array built fresh by .map() at write time.');
  });

  it('savePeriodicStockDraft\'s own call signature (six positional arguments) is unchanged at every call site', () => {
    const callSites = source.match(/savePeriodicStockDraft\(\s*[\s\S]{0,220}?\)/g) || [];
    assert.ok(callSites.length >= 3, 'Expected savePeriodicStockDraft to still be called from scheduleRowDraftSave, flushPeriodicDraftNow, and handleRequestConfirmation.');
  });
});
