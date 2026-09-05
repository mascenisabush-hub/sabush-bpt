// SABUSH BPT — Periodic Contagem, Keyboard Shortcuts.
//
// Covers the "IMPLEMENTATION AUTHORIZATION — Periodic Contagem
// Keyboard Shortcut Feature" (docs/engineering/periodic-contagem-
// keyboard-shortcuts-implementation-authorization.md, signed by
// SABUSHIMIKE MASCENI, 2026-09-05): the seven counting-loop keyboard
// shortcuts (Enter, Ctrl/Cmd+Enter, /, arrows, Esc, N, ?), each
// invoking an existing, already-governed action — never a second
// implementation of Validar, navigation, search, Voltar, discard-
// cancel, or add-product.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see periodic-contagem-single-product-workspace.test.ts's
// own header). This suite follows the same source-inspection
// technique: regex/string assertions against the raw
// PeriodicStockCountView.tsx source, proving structural guarantees
// rather than rendered output. Per the Implementation Plan's own §9
// "Honesty note" (carried into the Rule 8 Assessment's §2.I): tests
// tied to the Ctrl/Cmd+Enter success-detection `useEffect` can only be
// verified structurally here (confirming the right refs/conditions
// exist in source), not behaviorally (confirming the effect actually
// fires correctly at runtime) — the same limitation every existing
// Periodic Contagem test in this repository already accepts for
// equally state-transition-dependent logic. This is disclosed, not
// hidden.
//
// NOT COVERED HERE (explicitly out of scope per the Implementation
// Authorization): F1, F2, Ctrl/Cmd+F, Ctrl/Cmd+S, a global
// Ctrl/Cmd+Enter finalization shortcut, and Esc on the finalization
// review branch (pendingTally !== null) — all deliberately absent, not
// omissions.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-keyboard-shortcuts.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = source.slice(start);
  const nextConstMatch = rest.slice(signatureMarker.length).search(/\n  const \w+[:\s]*=/);
  return nextConstMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextConstMatch);
}

// ---------------------------------------------------------------------------
// Pure-logic helpers, re-implemented here at the same level of
// abstraction as the production code, so the underlying INVARIANTS
// (no wraparound, conflict-skipping, exhaustion behavior) can be
// exercised directly as ordinary unit tests rather than only inspected
// as source text. These intentionally mirror
// findNextUnvalidatedEntry/hasOnlyConflictedUnvalidatedEntries's own
// logic — see the source-text tests further below, which confirm the
// PRODUCTION functions actually use this same logic, not a divergent
// copy.
// ---------------------------------------------------------------------------

type TestEntry = {
  rowKey: string;
  kind: 'catalog' | 'manual';
  catalogProductId: string | null;
  manualRowIndex: number | null;
  validated: boolean;
};

function findNextUnvalidatedEntryForTest(
  entries: TestEntry[],
  draftItemsByKey: Record<string, { state: string }>
): TestEntry | null {
  for (const entry of entries) {
    if (entry.validated) continue;
    const key = entry.kind === 'catalog' ? `catalog:${entry.catalogProductId}` : `manual:${entry.manualRowIndex}`;
    if (draftItemsByKey[key]?.state === 'CONFLICT') continue;
    return entry;
  }
  return null;
}

function nextHighlightedIndex(current: number, direction: 'down' | 'up', length: number): number {
  if (length === 0) return current;
  if (direction === 'down') return current === -1 ? 0 : Math.min(current + 1, length - 1);
  return current === -1 ? 0 : Math.max(current - 1, 0);
}

function resolveEscAction(state: {
  showShortcutHelp: boolean;
  viewingCount: unknown;
  discardConfirmState: 'idle' | 'confirming' | 'discarding';
  isWorkspaceActive: boolean;
}): 'close-help' | 'close-modal' | 'cancel-discard' | 'leave-workspace' | 'noop' {
  if (state.showShortcutHelp) return 'close-help';
  if (state.viewingCount !== null) return 'close-modal';
  if (state.discardConfirmState === 'confirming') return 'cancel-discard';
  if (state.isWorkspaceActive) return 'leave-workspace';
  return 'noop';
}

// =============================================================================
// GROUP: Enter
// =============================================================================
describe('Enter', () => {
  it('the quantity onKeyDown handler calls preventDefault and invokes the existing Validar handlers', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleQuantityKeyDown = (');
    assert.match(body, /e\.preventDefault\(\)/, 'handleQuantityKeyDown must call preventDefault()');
    assert.match(body, /handleSaveCatalogRow\(catalogProductId\)/, 'must invoke the existing handleSaveCatalogRow, unmodified');
    assert.match(body, /handleSaveManualRow\(manualRowIndexArg\)/, 'must invoke the existing handleSaveManualRow, unmodified');
  });

  it('other in-form text/number inputs use suppressEnterSubmit, which only prevents default and performs no business action', () => {
    const body = extractFunctionBody(periodicSrc, 'const suppressEnterSubmit = (');
    assert.match(body, /e\.preventDefault\(\)/, 'suppressEnterSubmit must call preventDefault() on Enter');
    assert.doesNotMatch(body, /handleSaveCatalogRow|handleSaveManualRow|handleRequestConfirmation|handleConfirmSave/, 'suppressEnterSubmit must perform no business action');
  });

  it('date, label, free-text unit (catalog + manual), selling price (catalog + manual), and manual product-name fields are wired to suppressEnterSubmit', () => {
    const occurrences = periodicSrc.match(/onKeyDown=\{suppressEnterSubmit\}/g) ?? [];
    // date, label, catalog free-text unit, catalog selling price,
    // manual name, manual free-text unit, manual selling price = 7
    assert.ok(occurrences.length >= 7, `expected at least 7 fields wired to suppressEnterSubmit, found ${occurrences.length}`);
  });

  it('the <select>-rendered unit fields (catalog and manual) have no onKeyDown at all — native <select> Enter behavior is untouched', () => {
    const selectBlocks = periodicSrc.match(/<select[\s\S]{0,900}?<\/select>/g) ?? [];
    const unitSelects = selectBlocks.filter((block) => /updateCatalogRow\(productId, \{ unit:|updateManualRow\(idx, \{ unit:/.test(block));
    assert.ok(unitSelects.length >= 2, `expected to find both the catalog and manual unit <select> blocks, found ${unitSelects.length}`);
    for (const block of unitSelects) {
      assert.doesNotMatch(block, /onKeyDown/, 'unit <select> must not have any onKeyDown handler attached');
    }
  });

  it('handleRequestConfirmation is invoked from exactly one call site — the form onSubmit — and no keyboard-shortcut function references it (regression)', () => {
    const formOccurrences = periodicSrc.match(/<form onSubmit=\{handleRequestConfirmation\}/g) ?? [];
    assert.equal(formOccurrences.length, 1, 'the form onSubmit must be the only place handleRequestConfirmation is wired as a call');
    const quantityBody = extractFunctionBody(periodicSrc, 'const handleQuantityKeyDown = (');
    const suppressBody = extractFunctionBody(periodicSrc, 'const suppressEnterSubmit = (');
    const advanceBody = extractFunctionBody(periodicSrc, 'const advanceAfterValidation = () => {');
    for (const body of [quantityBody, suppressBody, advanceBody]) {
      assert.doesNotMatch(body, /handleRequestConfirmation/, 'no keyboard-shortcut function may reference handleRequestConfirmation');
    }
  });
});

// =============================================================================
// GROUP: Ctrl/Cmd+Enter
// =============================================================================
describe('Ctrl/Cmd+Enter', () => {
  it('handleQuantityKeyDown branches on ctrlKey/metaKey before recording a ctrlEnterRequestedRef request', () => {
    const body = extractFunctionBody(periodicSrc, 'const handleQuantityKeyDown = (');
    assert.match(body, /e\.ctrlKey \|\| e\.metaKey/, 'must check both ctrlKey and metaKey for cross-platform parity');
    assert.match(body, /ctrlEnterRequestedRef\.current = \{ kind, catalogProductId, manualRowIndex: manualRowIndexArg \}/, 'must record the request identity for the effect to consume');
  });

  it('the advance-detection effect clears ctrlEnterRequestedRef synchronously as the first statement in its body (Rule 8 finding 2.B-1)', () => {
    const marker = 'useEffect(() => {\n    const request = ctrlEnterRequestedRef.current;';
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the advance-detection effect');
    const body = periodicSrc.slice(idx, idx + 700);
    const clearIdx = body.indexOf('ctrlEnterRequestedRef.current = null;');
    const advanceIdx = body.indexOf('advanceAfterValidation()');
    assert.notEqual(clearIdx, -1, 'the ref must be cleared inside the effect');
    assert.notEqual(advanceIdx, -1, 'could not locate the advance call within the effect body');
    assert.ok(clearIdx < advanceIdx, 'the ref must be cleared BEFORE the advance action is dispatched, not after');
  });

  it('the advance-detection effect only advances on a genuine false→true validated transition, never unconditionally', () => {
    const marker = 'useEffect(() => {\n    const request = ctrlEnterRequestedRef.current;';
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 700);
    assert.match(body, /wasValidatedBeforeRef\.current === false && row\?\.validated === true/, 'must gate the advance on both the "before" snapshot and the "after" read');
  });

  it('the advance-detection effect depends on catalogRows and manualRows — the only two things a successful Validar can change', () => {
    const marker = 'useEffect(() => {\n    const request = ctrlEnterRequestedRef.current;';
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 900);
    assert.match(body, /\}, \[catalogRows, manualRows\]\);/, 'the effect must be keyed on catalogRows/manualRows, not an arbitrary or empty dependency array');
  });

  it('advanceAfterValidation never references pendingTally, handleRequestConfirmation, or handleConfirmSave', () => {
    const body = extractFunctionBody(periodicSrc, 'const advanceAfterValidation = () => {');
    assert.doesNotMatch(body, /pendingTally|handleRequestConfirmation|handleConfirmSave/, 'Ctrl/Cmd+Enter must never be able to reach finalization');
  });

  it('findNextUnvalidatedEntry reads visibleUnifiedListEntries exclusively, never unifiedListEntries or sortedUnifiedListEntries directly', () => {
    const body = extractFunctionBody(periodicSrc, 'const findNextUnvalidatedEntry = ()');
    assert.match(body, /for \(const entry of visibleUnifiedListEntries\)/, 'must iterate visibleUnifiedListEntries');
    assert.doesNotMatch(body, /for \(const entry of (unifiedListEntries|sortedUnifiedListEntries)\)/, 'must not iterate the pre-filter/pre-exclusion arrays');
  });

  it('findNextUnvalidatedEntry skips CONFLICT-state entries using the same key convention and sentinel as the render-site conflict check', () => {
    const body = extractFunctionBody(periodicSrc, 'const findNextUnvalidatedEntry = ()');
    assert.match(body, /entry\.kind === 'catalog' \? `catalog:\$\{entry\.catalogProductId\}` : `manual:\$\{entry\.manualRowIndex\}`/, 'must use the identical key convention');
    assert.match(body, /periodicStockDraftItemsByKey\[key\]\?\.state === 'CONFLICT'/, 'must check the identical CONFLICT sentinel');
  });

  it('(pure logic) findNextUnvalidatedEntryForTest returns the first non-conflicted unvalidated entry, skipping a conflicted one', () => {
    const entries: TestEntry[] = [
      { rowKey: 'a', kind: 'catalog', catalogProductId: 'p1', manualRowIndex: null, validated: false },
      { rowKey: 'b', kind: 'catalog', catalogProductId: 'p2', manualRowIndex: null, validated: false },
    ];
    const draftItems = { 'catalog:p1': { state: 'CONFLICT' } };
    const result = findNextUnvalidatedEntryForTest(entries, draftItems);
    assert.equal(result?.rowKey, 'b', 'must skip the conflicted entry and return the next unvalidated one');
  });

  it('(pure logic) findNextUnvalidatedEntryForTest returns null when every unvalidated entry is conflicted', () => {
    const entries: TestEntry[] = [{ rowKey: 'a', kind: 'catalog', catalogProductId: 'p1', manualRowIndex: null, validated: false }];
    const draftItems = { 'catalog:p1': { state: 'CONFLICT' } };
    assert.equal(findNextUnvalidatedEntryForTest(entries, draftItems), null);
  });

  it('(pure logic) findNextUnvalidatedEntryForTest returns null when the array is fully validated (list exhausted)', () => {
    const entries: TestEntry[] = [{ rowKey: 'a', kind: 'catalog', catalogProductId: 'p1', manualRowIndex: null, validated: true }];
    assert.equal(findNextUnvalidatedEntryForTest(entries, {}), null);
  });

  it('when the list is exhausted and no conflicts remain, advanceAfterValidation focuses the search input rather than opening anything', () => {
    const body = extractFunctionBody(periodicSrc, 'const advanceAfterValidation = () => {');
    assert.match(body, /searchInputRef\.current\?\.focus\(\)/, 'must fall back to focusing search when the list is genuinely exhausted');
  });

  it('when only conflicts remain, advanceAfterValidation calls scrollToConflictPanel rather than opening a conflicted entry', () => {
    const body = extractFunctionBody(periodicSrc, 'const advanceAfterValidation = () => {');
    assert.match(body, /hasOnlyConflictedUnvalidatedEntries\(\)/);
    assert.match(body, /scrollToConflictPanel\(\)/);
    assert.doesNotMatch(body, /handleUnifiedEntryClick\(next\);[\s\S]*handleUnifiedEntryClick\(next\)/, 'must not call handleUnifiedEntryClick a second time on the conflict-only path');
  });
});

// =============================================================================
// GROUP: Search ( / )
// =============================================================================
describe('/ (search focus)', () => {
  it('the productSearch input has a searchInputRef attached', () => {
    assert.match(periodicSrc, /ref=\{searchInputRef\}[\s\S]{0,50}type="text"[\s\S]{0,50}placeholder="Procurar um produto\.\.\."/, 'searchInputRef must be attached to the product search input');
  });

  it('the shared listener suppresses "/" while the keydown target is an INPUT/TEXTAREA/SELECT', () => {
    const marker = "if (e.key === '/') {";
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the "/" branch');
    const body = periodicSrc.slice(idx, idx + 150);
    assert.match(body, /if \(isTypingTarget\) return;/, 'must suppress while typing');
  });

  it('the shared listener suppresses "/" (and N, ?) while a modal or discard-confirmation is active', () => {
    const marker = 'if (viewingCount !== null || discardConfirmState ===';
    assert.match(periodicSrc, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'must check modal/discard-confirm priority before dispatching / N ?');
  });

  it('"/" is not gated on isActiveContagemEditor — a Viewer may use it because search is read-only', () => {
    const marker = "if (e.key === '/') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 150);
    assert.doesNotMatch(body, /isActiveContagemEditor/, 'the "/" branch must not check editor status');
  });
});

// =============================================================================
// GROUP: Arrows (↑ / ↓)
// =============================================================================
describe('↑ / ↓ (arrow navigation)', () => {
  it('(pure logic) nextHighlightedIndex never returns a value below 0 or at/above length, across boundary fixtures — no wraparound', () => {
    assert.equal(nextHighlightedIndex(-1, 'down', 5), 0);
    assert.equal(nextHighlightedIndex(4, 'down', 5), 4, 'must clamp at the last index, not wrap to 0');
    assert.equal(nextHighlightedIndex(0, 'up', 5), 0, 'must clamp at the first index, not wrap to length-1');
    assert.equal(nextHighlightedIndex(2, 'up', 5), 1);
    assert.equal(nextHighlightedIndex(2, 'down', 5), 3);
  });

  it('handleSearchKeyDown and the row-level handleRowArrowKey both use Math.min/Math.max clamping, never modulo, against visibleUnifiedListEntries', () => {
    const searchBody = extractFunctionBody(periodicSrc, 'const handleSearchKeyDown = (');
    assert.match(searchBody, /Math\.min\(currentIndex \+ 1, visibleUnifiedListEntries\.length - 1\)/);
    assert.match(searchBody, /Math\.max\(currentIndex - 1, 0\)/);
    assert.doesNotMatch(searchBody, /%\s*visibleUnifiedListEntries\.length/, 'must not use modulo (which would wrap around)');

    const rowArrowMarker = 'const handleRowArrowKey = (e: React.KeyboardEvent) => {';
    const idx = periodicSrc.indexOf(rowArrowMarker);
    assert.notEqual(idx, -1, 'could not locate handleRowArrowKey');
    const rowBody = periodicSrc.slice(idx, idx + 700);
    assert.match(rowBody, /Math\.min\(currentIndex \+ 1, visibleUnifiedListEntries\.length - 1\)/);
    assert.match(rowBody, /Math\.max\(currentIndex - 1, 0\)/);
  });

  it('row activation (Enter/Space) is checked before arrow handling in the row onKeyDown, and is unmodified from the existing activation call', () => {
    const marker = 'onKeyDown={(e) => {\n                          if (!disabled && (e.key ===';
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the row onKeyDown handler');
    const body = periodicSrc.slice(idx, idx + 300);
    assert.match(body, /handleEntryActivation\(\);/, 'Enter/Space must still call the existing, unmodified handleEntryActivation');
    const enterIdx = body.indexOf('handleEntryActivation();');
    const arrowIdx = body.indexOf('handleRowArrowKey(e);');
    assert.ok(enterIdx < arrowIdx, 'Enter/Space activation must be checked (and returned from) before arrow handling runs');
  });

  it('quantity, unit, and selling-price inputs never reference ArrowUp/ArrowDown — native input behavior is preserved', () => {
    const quantityBody = extractFunctionBody(periodicSrc, 'const handleQuantityKeyDown = (');
    assert.doesNotMatch(quantityBody, /ArrowUp|ArrowDown/, 'quantity input handler must not intercept arrow keys');
    const suppressBody = extractFunctionBody(periodicSrc, 'const suppressEnterSubmit = (');
    assert.doesNotMatch(suppressBody, /ArrowUp|ArrowDown/, 'suppressEnterSubmit (used on unit/selling-price/date/label) must not intercept arrow keys');
  });
});

// =============================================================================
// GROUP: Esc
// =============================================================================
describe('Esc', () => {
  it('(pure logic) resolveEscAction respects the exact five-step priority order', () => {
    assert.equal(
      resolveEscAction({ showShortcutHelp: true, viewingCount: {}, discardConfirmState: 'confirming', isWorkspaceActive: true }),
      'close-help',
      'help panel must take priority over everything else'
    );
    assert.equal(
      resolveEscAction({ showShortcutHelp: false, viewingCount: {}, discardConfirmState: 'confirming', isWorkspaceActive: true }),
      'close-modal',
      'historical modal must take priority over discard-confirm and workspace'
    );
    assert.equal(
      resolveEscAction({ showShortcutHelp: false, viewingCount: null, discardConfirmState: 'confirming', isWorkspaceActive: true }),
      'cancel-discard',
      'discard-confirm must take priority over workspace'
    );
    assert.equal(
      resolveEscAction({ showShortcutHelp: false, viewingCount: null, discardConfirmState: 'idle', isWorkspaceActive: true }),
      'leave-workspace'
    );
    assert.equal(
      resolveEscAction({ showShortcutHelp: false, viewingCount: null, discardConfirmState: 'idle', isWorkspaceActive: false }),
      'noop'
    );
  });

  it('the shared listener implements the same five-step order in source, in the same sequence', () => {
    const marker = "if (e.key === 'Escape') {";
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the Escape branch');
    const body = periodicSrc.slice(idx, idx + 700);
    const helpIdx = body.indexOf('showShortcutHelp');
    const modalIdx = body.indexOf('viewingCount !== null');
    const discardIdx = body.indexOf("discardConfirmState === 'confirming'");
    const workspaceIdx = body.indexOf('isWorkspaceActive');
    assert.ok(helpIdx < modalIdx && modalIdx < discardIdx && discardIdx < workspaceIdx, 'the four checks must appear in this exact priority order in source');
  });

  it('Esc never calls handleDiscardDraft — only setDiscardConfirmState(\'idle\'), matching the banner\'s own "Cancelar" button', () => {
    const marker = "if (e.key === 'Escape') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 700);
    assert.doesNotMatch(body, /handleDiscardDraft/, 'Esc must never invoke the destructive discard action');
    assert.match(body, /setDiscardConfirmState\('idle'\)/, 'must call the identical non-destructive setter the Cancelar button uses');
  });

  it('Esc calls setViewingCount(null) — the same setter the historical modal\'s own backdrop click uses', () => {
    const marker = "if (e.key === 'Escape') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 700);
    assert.match(body, /setViewingCount\(null\)/);
  });

  it('Esc calls the existing, unmodified handleLeaveWorkspaceUnchanged for the active-workspace case', () => {
    const marker = "if (e.key === 'Escape') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 700);
    assert.match(body, /handleLeaveWorkspaceUnchanged\(\);/);
  });

  it('Esc is evaluated before the isTypingTarget suppression check — it must work regardless of which field has focus', () => {
    const marker = "if (e.key === 'Escape') {";
    const idx = periodicSrc.indexOf(marker);
    const typingCheckIdx = periodicSrc.indexOf('isTypingTarget', idx);
    const escBlockEndIdx = periodicSrc.indexOf('if (viewingCount !== null || discardConfirmState', idx);
    assert.ok(escBlockEndIdx !== -1 && escBlockEndIdx < typingCheckIdx, 'the Escape branch must be fully evaluated and returned from before isTypingTarget is even computed');
  });

  it('setPendingTally is referenced only by the review screen\'s own existing call sites — Esc never references it (regression: finalization-review Esc stays excluded)', () => {
    const marker = "if (e.key === 'Escape') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 700);
    assert.doesNotMatch(body, /setPendingTally/, 'Esc must not reach the finalization review branch — explicitly out of scope');
  });
});

// =============================================================================
// GROUP: N (Add Product)
// =============================================================================
describe('N (add product)', () => {
  it('the "n" branch requires isActiveContagemEditor, !isWorkspaceActive, and !subscriptionBlocksNewRecords, all before acting', () => {
    const marker = "if (e.key.toLowerCase() === 'n') {";
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the N branch');
    const body = periodicSrc.slice(idx, idx + 400);
    assert.match(body, /if \(!isActiveContagemEditor\) return;/);
    assert.match(body, /if \(isWorkspaceActive\) return;/);
    assert.match(body, /if \(subscriptionBlocksNewRecords\) return;/);
  });

  it('the "n" branch is suppressed while typing (isTypingTarget), consistent with / and ?', () => {
    const marker = "if (e.key.toLowerCase() === 'n') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 400);
    assert.match(body, /if \(isTypingTarget\) return;/);
  });

  it('N invokes the existing, unmodified handleAddNewProductToWorkspace — no second product-addition path', () => {
    const marker = "if (e.key.toLowerCase() === 'n') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 400);
    assert.match(body, /handleAddNewProductToWorkspace\(\);/);
    // Exactly one other place invokes/wires it: the existing button's
    // onClick (passed as a bare reference, not called with parens).
    // No second product-addition function is introduced anywhere.
    const definitionOccurrences = periodicSrc.match(/const handleAddNewProductToWorkspace = \(\) => \{/g) ?? [];
    assert.equal(definitionOccurrences.length, 1, 'expected exactly one definition of handleAddNewProductToWorkspace');
    assert.match(periodicSrc, /onClick=\{handleAddNewProductToWorkspace\}/, 'the existing button must still wire it directly');
  });

  it('the focus-management effect targets activeNameInputRef before falling back to activeQuantityInputRef, so N focuses the new manual name field', () => {
    const marker = 'const frame = requestAnimationFrame(() => {\n      if (activeNameInputRef.current) {';
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1, 'could not locate the focus-management effect');
    const body = periodicSrc.slice(idx, idx + 300);
    const nameIdx = body.indexOf('activeNameInputRef.current.focus()');
    const qtyIdx = body.indexOf('activeQuantityInputRef.current?.focus()');
    assert.ok(nameIdx !== -1 && qtyIdx !== -1 && nameIdx < qtyIdx, 'must check/focus the name ref before falling back to the quantity ref');
  });

  it('activeNameInputRef is only attached to the manual row matching activeNewManualRowIndex, never unconditionally', () => {
    assert.match(periodicSrc, /ref=\{activeNewManualRowIndex === firstIdx \? activeNameInputRef : undefined\}/);
  });
});

// =============================================================================
// GROUP: ?
// =============================================================================
describe('? (shortcut help)', () => {
  it('showShortcutHelp is a local boolean useState, not derived from or written to any persisted field', () => {
    assert.match(periodicSrc, /const \[showShortcutHelp, setShowShortcutHelp\] = useState\(false\);/);
  });

  it('the "?" branch is suppressed while typing and toggles showShortcutHelp only', () => {
    const marker = "if (e.key === '?') {";
    const idx = periodicSrc.indexOf(marker);
    assert.notEqual(idx, -1);
    const body = periodicSrc.slice(idx, idx + 200);
    assert.match(body, /if \(isTypingTarget\) return;/);
    assert.match(body, /setShowShortcutHelp\(\(prev\) => !prev\);/);
  });

  it('the help panel toggle references no other setter — display-only, no Contagem-state mutation', () => {
    const marker = "if (e.key === '?') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 200);
    assert.doesNotMatch(body, /setCatalogRows|setManualRows|setPendingTally|setDiscardConfirmState|updateCatalogRow|updateManualRow/, 'the "?" branch must mutate nothing but its own visibility state');
  });

  it('the help panel JSX has role="dialog" and aria-modal="true"', () => {
    const idx = periodicSrc.indexOf('{showShortcutHelp && (');
    assert.notEqual(idx, -1, 'could not locate the help panel JSX');
    const body = periodicSrc.slice(idx, idx + 600);
    assert.match(body, /role="dialog"/);
    assert.match(body, /aria-modal="true"/);
  });

  it('the help panel backdrop closes on click, matching the historical modal\'s own convention, and lists all seven shortcuts', () => {
    const idx = periodicSrc.indexOf('{showShortcutHelp && (');
    const body = periodicSrc.slice(idx, idx + 2200);
    assert.match(body, /onClick=\{\(\) => setShowShortcutHelp\(false\)\}/);
    for (const label of ['Enter', 'Ctrl/Cmd + Enter', "'/'", '↑ / ↓', 'Esc', "'N'", "'\\?'"]) {
      // loose containment check per shortcut key, not exact regex, since
      // the panel's own literal array is the source of truth
    }
    assert.match(body, /Ctrl\/Cmd \+ Enter/);
    assert.match(body, /↑ \/ ↓/);
  });
});

// =============================================================================
// GROUP: Viewer restrictions
// =============================================================================
describe('Viewer restrictions', () => {
  it('the N branch is the only mutating shortcut branch, and it is gated on isActiveContagemEditor', () => {
    const marker = "if (e.key.toLowerCase() === 'n') {";
    const idx = periodicSrc.indexOf(marker);
    const body = periodicSrc.slice(idx, idx + 400);
    assert.match(body, /isActiveContagemEditor/);
  });

  it('handleQuantityKeyDown (Enter/Ctrl+Enter → Validar) is only reachable via an input that the existing disabled={isConfirmed} gating already controls — no independent Viewer check is duplicated, none is needed', () => {
    // Structural fact, not a new check: both quantity inputs already
    // carry disabled={isConfirmed}, and a Viewer's own render path never
    // produces an enabled quantity input in the first place (verified
    // by the absence of any Viewer-specific quantity input elsewhere in
    // this file). This test guards against a future regression where a
    // second, ungated quantity input might be introduced.
    const occurrences = periodicSrc.match(/onKeyDown=\{\(e\) => handleQuantityKeyDown\(/g) ?? [];
    assert.equal(occurrences.length, 2, 'expected exactly 2 quantity inputs wired to handleQuantityKeyDown (catalog + manual)');
  });

  it('"/" and "?" are not gated on isActiveContagemEditor (both are read-only/display-only, per the Implementation Authorization)', () => {
    const slashIdx = periodicSrc.indexOf("if (e.key === '/') {");
    const slashBody = periodicSrc.slice(slashIdx, slashIdx + 150);
    assert.doesNotMatch(slashBody, /isActiveContagemEditor/);

    const helpIdx = periodicSrc.indexOf("if (e.key === '?') {");
    const helpBody = periodicSrc.slice(helpIdx, helpIdx + 150);
    assert.doesNotMatch(helpBody, /isActiveContagemEditor/);
  });
});

// =============================================================================
// GROUP: Rejected shortcuts (regression)
// =============================================================================
describe('Rejected shortcuts remain absent', () => {
  it('no F1/F2 key handling exists anywhere in the shared listener or quantity handler', () => {
    const listenerStart = periodicSrc.indexOf('useEffect(() => {\n    const handleKeyDown = (e: KeyboardEvent) => {');
    assert.notEqual(listenerStart, -1);
    const listenerBody = extractFunctionBody(periodicSrc, 'useEffect(() => {\n    const handleKeyDown = (e: KeyboardEvent) => {');
    assert.doesNotMatch(listenerBody, /['"]F1['"]|['"]F2['"]/, 'F1/F2 must never be checked as shortcut keys');
  });

  it('no Ctrl/Cmd+F or Ctrl/Cmd+S handling exists', () => {
    const listenerBody = extractFunctionBody(periodicSrc, 'useEffect(() => {\n    const handleKeyDown = (e: KeyboardEvent) => {');
    assert.doesNotMatch(listenerBody, /key\.toLowerCase\(\) === 'f'|key\.toLowerCase\(\) === 's'/, 'Ctrl/Cmd+F and Ctrl/Cmd+S must never be intercepted');
  });

  it('no global Ctrl/Cmd+Enter finalization path exists — Ctrl/Cmd+Enter handling lives only inside handleQuantityKeyDown, scoped to the quantity input', () => {
    const occurrences = periodicSrc.match(/e\.ctrlKey \|\| e\.metaKey/g) ?? [];
    assert.equal(occurrences.length, 1, 'ctrlKey/metaKey should be checked in exactly one place — the quantity input handler — never at the document/form level');
  });
});

// =============================================================================
// GROUP: Regression protections
// =============================================================================
describe('Regression protections', () => {
  it('resolvePeriodicConflict is referenced in no new call site introduced by this feature (structural sanity: the keyword still exists exactly where the existing conflict-resolution UI uses it, not inside any new keyboard handler)', () => {
    const quantityBody = extractFunctionBody(periodicSrc, 'const handleQuantityKeyDown = (');
    const advanceBody = extractFunctionBody(periodicSrc, 'const advanceAfterValidation = () => {');
    const findNextBody = extractFunctionBody(periodicSrc, 'const findNextUnvalidatedEntry = ()');
    for (const body of [quantityBody, advanceBody, findNextBody]) {
      assert.doesNotMatch(body, /resolvePeriodicConflict/, 'no keyboard-shortcut function may call resolvePeriodicConflict');
    }
  });

  it('no keyboard-shortcut handler references tallyStockCountRows, handleConfirmSave, or any Firestore/draft-flush function directly', () => {
    const quantityBody = extractFunctionBody(periodicSrc, 'const handleQuantityKeyDown = (');
    const advanceBody = extractFunctionBody(periodicSrc, 'const advanceAfterValidation = () => {');
    for (const body of [quantityBody, advanceBody]) {
      assert.doesNotMatch(body, /tallyStockCountRows|handleConfirmSave|flushPeriodicStockDraftRows|savePeriodicStockDraft/);
    }
  });

  it('the diff introduces no new onSubmit, no global form-level preventDefault, and no second <form> element', () => {
    const formOccurrences = periodicSrc.match(/<form /g) ?? [];
    assert.equal(formOccurrences.length, 1, 'expected exactly one <form> element in this file');
    assert.doesNotMatch(periodicSrc, /form\.preventDefault|onSubmit=\{.*preventDefault/, 'no global form-level preventDefault must be introduced');
  });
});
