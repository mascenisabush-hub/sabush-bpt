// Periodic Contagem — Per-Row Autosave Scheduling + SPA Navigation
// Flush (Decision 39).
//
// [Governing chain: stock-count-data-loss-resilience-specification.md
// §6/§13 (Decision 38) -> Decision 39 amendment (SIGNED — SABUSHIMIKE
// MASCENI, 28 August 2026) -> Rule 8 Assessment (READY) ->
// Implementation Plan -> Implementation Authorization (SIGNED —
// SABUSHIMIKE MASCENI, 29 August 2026)]
//
// [Decision 40 — Validar Workflow, SIGNED 29 August 2026; separate
// Rule 8 Assessment (READY), Implementation Plan, and Implementation
// Authorization (SIGNED 29 August 2026)] Describe block G, below, was
// updated under THAT later, separate authorization — it now tests the
// Guardar->Validar rename and persisted validated state Decision 40
// specifically authorizes, which Decision 39's own Implementation
// Authorization (§2) had deliberately left untouched. Every other
// describe block in this file (A-F, H) is unaffected by Decision 40
// and continues to test Decision 39's own scope exactly as before.
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
// [Decision 41C §1/§3/§4] The timer callback's own body — live-state
// read and draftInFlightSaveRef serialization — was extracted out of
// scheduleRowDraftSave into a separate, reusable performRowSaveAttempt
// (so both the ordinary debounce firing AND a bounded automatic retry
// AND a manual retry can all share it). scheduleRowDraftSave itself now
// only owns debounce scheduling + generation bookkeeping; describe
// blocks C/D below were updated to check performRowSaveAttemptBody for
// the properties that moved there — this is a source-location change
// only, not a weakening of what either test actually proves (still
// exactly one live-state read site, still the exact same await-before-
// write serialization).
const performRowSaveAttemptBody = extractFunctionBody(source, 'const performRowSaveAttempt = async (rowKey: string, generation: number, attemptNumber: number) => {');

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
  it('the save-attempt callback reads live current state from latestFlushArgs.current, never from a schedule-time-captured argument', () => {
    assert.match(
      performRowSaveAttemptBody,
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
    // catalogRows/manualRows inside performRowSaveAttempt (§1/§3/§4's
    // shared attempt function, called by every row's debounce timer, by
    // every bounded automatic retry, and by manual retry alike — never
    // one per row, never one per attempt kind).
    const readSiteCount = (performRowSaveAttemptBody.match(/latestFlushArgs\.current/g) || []).length;
    assert.equal(readSiteCount, 1, 'Expected exactly one live-state read site inside the shared save-attempt function — proving every row\'s timer/retry/manual-retry shares the identical current-state source, never a per-attempt-captured one.');
  });
});

describe('D — global write serialization is preserved (Decision 39a FR-N3, Rule 8 §D)', () => {
  it('draftInFlightSaveRef remains a single ref (not a per-row Map), unmodified in shape', () => {
    assert.match(source, /const draftInFlightSaveRef = useRef<Promise<void> \| null>\(null\);/);
    assert.doesNotMatch(source, /draftInFlightSaveRef\s*[:=]\s*useRef<Map/);
  });

  it('the shared save-attempt function awaits draftInFlightSaveRef.current before issuing its own write — every row\'s debounce firing, every bounded automatic retry, and every manual retry all route through this SAME await', () => {
    const awaitIdx = performRowSaveAttemptBody.indexOf('await draftInFlightSaveRef.current');
    // [Bug fix — per-product independent draft persistence] The single
    // savePeriodicStockDraft( call site is now one of two, depending on
    // rowKey (savePeriodicStockDraftMeta for '__meta__'/'newProductInfo:*',
    // savePeriodicStockDraftItem for an actual row) — either way, both
    // sit AFTER the same await, so this still proves the serialization
    // guarantee regardless of which branch fires.
    const metaSaveIdx = performRowSaveAttemptBody.indexOf('savePeriodicStockDraftMeta(');
    const itemSaveIdx = performRowSaveAttemptBody.indexOf('savePeriodicStockDraftItem(');
    assert.notEqual(awaitIdx, -1);
    assert.notEqual(metaSaveIdx, -1);
    assert.notEqual(itemSaveIdx, -1);
    assert.ok(awaitIdx < metaSaveIdx && awaitIdx < itemSaveIdx);
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
    assert.doesNotMatch(unmountEffectSlice, /savePeriodicStockDraftItem\(|savePeriodicStockDraftMeta\(|flushPeriodicStockDraftRows\(/, 'The unmount effect must not call any periodic-draft persistence function directly — only the existing flushPeriodicDraftNow.');
  });

  it('App.tsx is not modified — no router, no navigation guard introduced', () => {
    const appSource = readFileSync(new URL('../apps/tenant/src/App.tsx', import.meta.url), 'utf-8');
    assert.doesNotMatch(appSource, /react-router|useNavigate|<Routes/);
    assert.match(appSource, /activeTab === 'stock-count' && \(/, 'Expected the existing activeTab-gated conditional render to remain unchanged.');
  });
});

describe('G — Validar (formerly Guardar) now persists via the exact same per-row autosave mechanism (Decision 40, Implementation Authorization §1 items 3/9)', () => {
  // [Decision 40 — Validar Workflow] Decision 39's own Implementation
  // Authorization (§2) deliberately scoped the Guardar/Validar rename
  // OUT — "handleSaveCatalogRow/handleSaveManualRow are not touched."
  // Decision 40 is the separate, later, signed authorization that
  // specifically authorizes changing exactly that. This describe
  // block replaces its own prior "Guardar remains local-only, tested
  // here as a Decision 39 scope boundary" assertions with the new,
  // signed Decision 40 behavior — it does not weaken Decision 39's
  // own guarantees (per-row scheduling, live-state-at-fire-time,
  // global serialization — all still separately proven in describe
  // blocks A-F, above, none of which reference Guardar/Validar at
  // all).
  it('handleSaveCatalogRow and handleSaveManualRow now route through updateCatalogRow/updateManualRow (the same write path every other field edit already uses), not a standalone local Set', () => {
    const catalogBody = extractFunctionBody(source, 'const handleSaveCatalogRow = (');
    const manualBody = extractFunctionBody(source, 'const handleSaveManualRow = (');
    // [Periodic Contagem Entry-Order Sort Mode — Implementation
    // Authorization, mechanical regression fix, Product Architect
    // authorization for narrowly-scoped test adjustment] Widened from
    // the Decision-40-era exact `{ validated: true }` literal to allow
    // that Authorization's own atomic-Validar requirement (§3 criterion
    // 3): `entrySequence` merged into the SAME call. The call-count
    // checks below preserve this test's original guarantee — a single
    // write path, never a second/parallel one — independent of the
    // object literal's exact contents.
    assert.match(catalogBody, /updateCatalogRow\(productId,\s*\{\s*validated:\s*true,\s*entrySequence:[^}]*\}\)/);
    assert.match(manualBody, /updateManualRow\(index,\s*\{\s*validated:\s*true,\s*entrySequence:[^}]*\}\)/);
    const catalogCallCount = (catalogBody.match(/updateCatalogRow\(/g) || []).length;
    const manualCallCount = (manualBody.match(/updateManualRow\(/g) || []).length;
    assert.equal(catalogCallCount, 1, 'handleSaveCatalogRow must call updateCatalogRow exactly once — no second/parallel write path.');
    assert.equal(manualCallCount, 1, 'handleSaveManualRow must call updateManualRow exactly once — no second/parallel write path.');
  });

  it('the prior local-only confirmedCatalogProductIds/confirmedManualRowIndices useState declarations no longer exist — comment mentions explaining the historical mechanism (already an established pattern in this file for superseded designs) are not the same as a live state declaration', () => {
    assert.doesNotMatch(source, /const \[confirmedCatalogProductIds/);
    assert.doesNotMatch(source, /const \[confirmedManualRowIndices/);
    assert.doesNotMatch(source, /setConfirmedCatalogProductIds\(/);
    assert.doesNotMatch(source, /setConfirmedManualRowIndices\(/);
  });

  it('handleEditCatalogRow and handleEditManualRow — superseded by the later, separate "Existing-Product Edit/Confirm Workflow" authorization: both now route the inverse (validated: false) transition through the new reopenExistingProductForEditing helper (which also activates the workspace and covers every sibling portion sharing the product\'s name, not only the clicked row) rather than calling updateCatalogRow/updateManualRow directly for a single row', () => {
    const catalogBody = extractFunctionBody(source, 'const handleEditCatalogRow = (');
    const manualBody = extractFunctionBody(source, 'const handleEditManualRow = (');
    assert.match(catalogBody, /reopenExistingProductForEditing\(productKeyFor\(row\.productName\)\)/);
    assert.match(manualBody, /reopenExistingProductForEditing\(productKeyFor\(row\.productName\)\)/);
    // The inverse transition itself (validated: false) still happens,
    // just inside the shared helper now — proven directly against
    // that helper's own body, applied across every row (catalog AND
    // manual) sharing the reopened product's name, via setCatalogRows/
    // setManualRows (a bulk, multi-row update — updateCatalogRow/
    // updateManualRow only ever touch one row by id/index, which
    // cannot express "every row sharing this name" in one write).
    const reopenBody = extractFunctionBody(source, 'const reopenExistingProductForEditing = (key: string) => {');
    assert.match(reopenBody, /validated:\s*false/);
    assert.match(reopenBody, /setCatalogRows\(/);
    assert.match(reopenBody, /setManualRows\(/);
  });

  it('Validar has been introduced as the visible action name, with no remaining "Guardar" button label', () => {
    assert.match(source, /Validar/);
    assert.doesNotMatch(source, />\s*Guardar\s*</);
  });

  it('the "Validar" button labels appear exactly twice (catalog row + manual row), matching the two prior "Guardar" labels 1:1', () => {
    const validarButtonCount = (source.match(/>\s*Validar\s*</g) || []).length;
    assert.equal(validarButtonCount, 2, 'Expected exactly two "Validar" button labels (catalog row + manual row).');
  });

  it('validateWorkingRowForSave and the zero-quantity confirmation gate are byte-for-byte unchanged by the rename (Decision 40 §2/this task item 1)', () => {
    const validateBody = extractFunctionBody(source, 'const validateWorkingRowForSave = (');
    assert.match(validateBody, /Introduza a quantidade contada/);
    assert.match(validateBody, /qty < 0/);
    assert.match(source, /Confirmas que "\$\{row\.productName\}" tem mesmo 0 em stock\?/);
  });
});

describe('H — per-product independent draft persistence (superseding Decision 39a\'s original "no schema/storage-shape change" non-goal — a later, explicitly-authorized bug fix)', () => {
  // [Bug fix — per-product independent draft persistence] Decision
  // 39a's own non-goal (this describe block's original name/assertions)
  // held only until the class of bug this change fixes was found: a
  // single full-document overwrite meant a transient in-memory gap
  // (e.g. `products` briefly empty on page load) could silently
  // discard an already-large draft's worth of counted data with no
  // warning. The storage shape change below — one row, one independent
  // Firestore document — is what makes that structurally impossible
  // going forward: a bad write can now only ever affect the ONE row it
  // targets, never any other product's already-saved data.
  it('PeriodicStockDraft.items is now assembled from an independent per-row `items` subcollection (AppContext.tsx), not a plain array field on one document', () => {
    assert.match(source, /savePeriodicStockDraftItem/);
    assert.match(source, /savePeriodicStockDraftMeta/);
    assert.match(source, /flushPeriodicStockDraftRows/);
  });

  it('scheduleRowDraftSave still routes through savePeriodicStockDraftItem/savePeriodicStockDraftMeta; flushForSwitchIfNeeded and handleRequestConfirmation\'s identity write are the two remaining flushPeriodicStockDraftRows callers (Decision 58 — flushPeriodicDraftNow itself is no longer one of them)', () => {
    const itemCallSites = source.match(/savePeriodicStockDraftItem\(\s*[\s\S]{0,220}?\)/g) || [];
    const metaCallSites = source.match(/savePeriodicStockDraftMeta\(\s*[\s\S]{0,220}?\)/g) || [];
    const flushCallSites = source.match(/flushPeriodicStockDraftRows\(\s*[\s\S]{0,220}?\)/g) || [];
    assert.ok(itemCallSites.length >= 1, 'Expected savePeriodicStockDraftItem to be called from scheduleRowDraftSave.');
    assert.ok(metaCallSites.length >= 1, 'Expected savePeriodicStockDraftMeta to be called from scheduleRowDraftSave.');
    // [Decision 58 — Interruption Persistence and Recovery Parity]
    // flushPeriodicDraftNow no longer calls flushPeriodicStockDraftRows
    // (it now routes dirty rows through performRowSaveAttempt instead —
    // see tests/periodic-stock-interruption-durability.test.ts's own
    // Decision 58 describe block). Exactly its two other, legitimate,
    // Decision-58-unaffected call sites remain: flushForSwitchIfNeeded
    // (business-switch flush) and handleRequestConfirmation's
    // pre-finalization identity write.
    assert.equal(
      flushCallSites.length,
      2,
      'Expected flushPeriodicStockDraftRows to be called from exactly flushForSwitchIfNeeded and handleRequestConfirmation\'s identity write — no more (a stray third caller) and no fewer (Decision 58 must not have accidentally removed one of its two legitimate, unaffected callers).'
    );
    const flushBody = source.slice(source.indexOf('const flushPeriodicDraftNow = () => {'), source.indexOf('const flushForSwitchIfNeeded ='));
    assert.doesNotMatch(
      flushBody,
      /flushPeriodicStockDraftRows\(/,
      'flushPeriodicDraftNow itself must not be one of the two remaining flushPeriodicStockDraftRows callers (Decision 58).'
    );
  });
});
