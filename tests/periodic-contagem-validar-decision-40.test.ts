// Periodic Contagem — Validar Workflow (Decision 40): Guardar -> Validar
// rename, persisted validated state, active-workspace filtering,
// accumulated/validated area, and Corrigir.
//
// [Governing chain: stock-count-data-loss-resilience-specification.md
// (Frozen, Decision 38) -> Decision 39 amendment (SIGNED, implemented)
// -> Decision 40 amendment (SIGNED — SABUSHIMIKE MASCENI, 29 August
// 2026) -> Rule 8 Assessment (READY) -> Implementation Plan ->
// Implementation Authorization (SIGNED — SABUSHIMIKE MASCENI, 29
// August 2026)]
//
// SCOPE: two halves, matching this repository's own established split
// for this exact surface (see stock-count-simplification.test.ts's own
// header comment for the same reasoning applied to tallyStockCountRows).
//
// Part 1 — PURE FUNCTION tests: workingRowToDraftItem/
// draftItemToWorkingRow/tallyStockCountRows (utils/stockCount.ts) are
// plain, dependency-free functions — imported and actually executed
// here, not merely inspected as source text. This is what proves the
// `validated` round-trip and StockCountTallyItem's new identity fields
// are correct, independent of React.
//
// Part 2 — COMPONENT STRUCTURE tests: PeriodicStockCountView.tsx has no
// jsdom/testing-library harness in this repo (same documented
// constraint as periodic-contagem-autosave-safety-decision-39.test.ts
// and its own siblings) — these tests prove wiring/ordering/exclusion
// properties via source inspection.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-validar-decision-40.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  tallyStockCountRows,
  workingRowToDraftItem,
  draftItemToWorkingRow,
  StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = src.slice(start);
  // Bounded at the NEXT two-space-indented `const` declaration of any
  // shape (arrow function OR useMemo/useRef/etc.-wrapped) — broader
  // than the arrow-function-only pattern this repo's other test files
  // use, since several targets in this file (visibleCatalogEntries,
  // allWorkingRows, manualRowGroups, validatedCatalogEntries,
  // validatedManualRowEntries) are `useMemo(...)`-wrapped consts, not
  // plain arrow functions, and would otherwise overrun into whatever
  // text happens to follow.
  const nextConstMatch = rest.slice(signatureMarker.length).search(/\n  const \w+[:\s]*=/);
  return nextConstMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextConstMatch);
}

const row = (overrides: Partial<StockCountWorkingRow>): StockCountWorkingRow => ({
  productId: 'p1',
  productName: 'Arroz',
  quantity: '10',
  unit: 'kg',
  costPrice: '50',
  sellingPrice: '80',
  ...overrides,
});

// ------------------------------------------------------------------
// Part 1 — pure function tests
// ------------------------------------------------------------------

describe('workingRowToDraftItem / draftItemToWorkingRow — validated round-trip (Decision 40 FR-N7)', () => {
  it('validated: true is included in the persisted shape, mirroring removed', () => {
    const draftItem = workingRowToDraftItem(row({ validated: true }));
    assert.equal(draftItem.validated, true);
  });

  it('validated: false is included explicitly (not omitted), matching removed:false\'s own existing behavior', () => {
    const draftItem = workingRowToDraftItem(row({ validated: false }));
    assert.equal('validated' in draftItem, true);
    assert.equal(draftItem.validated, false);
  });

  it('an absent (undefined) validated field is omitted entirely from the persisted shape — never written as literal undefined', () => {
    const draftItem = workingRowToDraftItem(row({}));
    assert.equal('validated' in draftItem, false);
  });

  it('draftItemToWorkingRow restores validated: true faithfully', () => {
    const restored = draftItemToWorkingRow({
      productId: 'p1',
      productName: 'Arroz',
      quantity: '10',
      unit: 'kg',
      costPrice: '50',
      sellingPrice: '80',
      validated: true,
    });
    assert.equal(restored.validated, true);
  });

  it('draftItemToWorkingRow restores an absent validated field as undefined — the legacy-draft case', () => {
    const restored = draftItemToWorkingRow({
      productId: 'p1',
      productName: 'Arroz',
      quantity: '10',
      unit: 'kg',
      costPrice: '50',
      sellingPrice: '80',
      // validated intentionally omitted — simulates a draft written
      // before Decision 40 existed.
    });
    assert.equal(restored.validated, undefined);
  });

  it('full round-trip: workingRowToDraftItem -> draftItemToWorkingRow preserves validated exactly for true, false, and absent', () => {
    for (const value of [true, false, undefined] as const) {
      const original = row(value === undefined ? {} : { validated: value });
      const restored = draftItemToWorkingRow(workingRowToDraftItem(original));
      assert.equal(restored.validated, value);
    }
  });

  it('quantity/unit/costPrice/sellingPrice/productId are unaffected by the validated round-trip (no accidental interference with existing fields)', () => {
    const original = row({ validated: true, quantity: '7', unit: 'un', costPrice: '12', sellingPrice: '20' });
    const restored = draftItemToWorkingRow(workingRowToDraftItem(original));
    assert.equal(restored.productId, 'p1');
    assert.equal(restored.quantity, '7');
    assert.equal(restored.unit, 'un');
    assert.equal(restored.costPrice, '12');
    assert.equal(restored.sellingPrice, '20');
  });
});

describe('tallyStockCountRows — StockCountTallyItem carries identity + validated (Decision 40 FR-N11)', () => {
  it('a catalog-shaped row (has productId) surfaces productId on its tally item, and no manualRowIndex', () => {
    const result = tallyStockCountRows([row({ productId: 'p42', validated: true })]);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.countedItems[0].productId, 'p42');
    assert.equal(result.countedItems[0].manualRowIndex, undefined);
    assert.equal(result.countedItems[0].validated, true);
  });

  it('a manual-shaped row (no productId, tagged manualRowIndex) surfaces manualRowIndex on its tally item, and no productId', () => {
    const manualRow: StockCountWorkingRow = {
      productName: 'Feijão',
      quantity: '5',
      unit: 'kg',
      costPrice: '30',
      sellingPrice: '45',
      manualRowIndex: 2,
    };
    const result = tallyStockCountRows([manualRow]);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.countedItems[0].productId, undefined);
    assert.equal(result.countedItems[0].manualRowIndex, 2);
    assert.equal(result.countedItems[0].validated, false);
  });

  it('validated defaults to a concrete false (never undefined) when the source row\'s own validated field is absent', () => {
    const result = tallyStockCountRows([row({})]);
    assert.equal(result.countedItems[0].validated, false);
  });

  it('a Not-Counted (blank-quantity) row never appears in countedItems at all, validated or not — unaffected by Decision 40', () => {
    const result = tallyStockCountRows([row({ quantity: '', validated: true })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Arroz']);
  });

  it('a validated row still contributes its full quantity/value to the totals — Decision 40 never changes what is counted, only where it renders', () => {
    const result = tallyStockCountRows([row({ validated: true, quantity: '10', costPrice: '50', sellingPrice: '80' })]);
    assert.equal(result.totalPhysicalUnits, 10);
    assert.equal(result.totalSellingValue, 800);
  });

  it('manualRowIndex is a purely local, ephemeral tag — it is never written by workingRowToDraftItem (excluded by construction)', () => {
    const draftItem = workingRowToDraftItem(row({ manualRowIndex: 3 } as Partial<StockCountWorkingRow>));
    assert.equal('manualRowIndex' in draftItem, false);
  });
});

// ------------------------------------------------------------------
// Part 2 — component structure tests
// ------------------------------------------------------------------

describe('Guardar -> Validar rename is complete in the visible UI (Decision 40 FR-N5)', () => {
  it('no "Guardar" button label remains anywhere in the component', () => {
    assert.doesNotMatch(source, />\s*Guardar\s*</);
  });

  it('exactly two "Validar" button labels exist — catalog row + manual row', () => {
    const count = (source.match(/>\s*Validar\s*</g) || []).length;
    assert.equal(count, 2);
  });

  it('the status-dot tooltip text is "Validado"/"Ainda não validado", not the old "Guardado"/"Ainda não guardado"', () => {
    assert.doesNotMatch(source, /Guardado|Ainda não guardado/);
    assert.match(source, /'Validado' : 'Ainda não validado'/);
  });
});

describe('Active-workspace filtering excludes validated rows WITHOUT removing them from underlying state (Decision 40 FR-N8; Rule 8 §C — the central safety proof)', () => {
  it('visibleCatalogEntries filters on both !row.removed and !row.validated, falsy-safe', () => {
    const body = extractFunctionBody(source, 'const visibleCatalogEntries = useMemo(');
    assert.match(body, /!row\.removed && !row\.validated/);
  });

  it('allWorkingRows is built ONLY from Object.values(catalogRows) and manualRows — no validated filter term anywhere in its definition', () => {
    const body = extractFunctionBody(source, 'const allWorkingRows: StockCountWorkingRow[] = useMemo(');
    assert.match(body, /\[\.\.\.Object\.values\(catalogRows\), \.\.\.manualRows\]/);
    assert.doesNotMatch(body, /validated/);
  });

  it('the active manual-row render loop filters out validated portions at the render site, never by mutating manualRows itself', () => {
    assert.match(source, /group\.rows\.filter\(\(\{ idx \}\) => !manualRows\[idx\]\?\.validated\)\.map\(\(\{ idx \}\) => \{/);
  });

  it('manualRowGroups (the grouping memo itself) is NOT filtered by validated status — only the individual portion render loop is', () => {
    const body = extractFunctionBody(source, 'const manualRowGroups = useMemo(');
    assert.doesNotMatch(body, /validated/);
  });

  it('catalogRows/manualRows/allWorkingRows are never spliced, deleted from, or reassigned to a smaller set as a consequence of validated becoming true — no setCatalogRows/setManualRows call exists inside handleSaveCatalogRow/handleSaveManualRow', () => {
    const catalogBody = extractFunctionBody(source, 'const handleSaveCatalogRow = (');
    const manualBody = extractFunctionBody(source, 'const handleSaveManualRow = (');
    assert.doesNotMatch(catalogBody, /setCatalogRows\(/);
    assert.doesNotMatch(manualBody, /setManualRows\(/);
  });
});

describe('Accumulated/validated area (Decision 40 FR-N8; Implementation Authorization §1 item 5)', () => {
  it('validatedCatalogEntries selects validated, non-removed catalog rows — never both removed and validated at once', () => {
    const body = extractFunctionBody(source, 'const validatedCatalogEntries = useMemo(');
    assert.match(body, /row\.validated && !row\.removed/);
  });

  it('validatedManualRowEntries selects validated, non-removed manual rows, carrying each row\'s own stable idx', () => {
    const body = extractFunctionBody(source, 'const validatedManualRowEntries = useMemo(');
    assert.match(body, /row\.validated && !row\.removed/);
    assert.match(body, /\{ idx, row \}/);
  });

  it('the unified product list section renders both validated and unvalidated entries, combined — via the sorted view (Sorting, Authorization §8) that derives directly from unifiedListEntries (itself built from catalogRows/manualRows unfiltered by validated status), not a separately recomputed source', () => {
    assert.match(source, /Owner-requested — single unified product list\] Replaces/);
    // [Owner-requested — single unified product list] The render site
    // now iterates visibleUnifiedListEntries, itself sorted from
    // filteredUnifiedListEntries/unifiedListEntries — a superset of the
    // old validatedCatalogEntries/validatedManualRowEntries (which
    // remain declared, unaffected, and are still exercised by the
    // earlier assertions in this suite), not a replacement for the
    // underlying `validated` flag itself. This test's own guarantee —
    // every validated row still renders, alongside every unvalidated
    // one, combined in one place — is unaffected by the rendering
    // change; only which derived array the render site reads changed
    // as an intentional consequence of unifying the two lists.
    assert.match(source, /visibleUnifiedListEntries\.map\(/);
    const entriesBody = extractFunctionBody(source, 'const unifiedListEntries = useMemo(() => {');
    assert.match(entriesBody, /Object\.entries\(catalogRows\)/);
    assert.match(entriesBody, /manualRows/);
    assert.doesNotMatch(entriesBody, /!row\.validated/, 'unifiedListEntries must not filter out validated rows — it is the superset, not the validated-only subset');
  });

  it('reopening from the unified list reuses the EXISTING handleEditCatalogRow/handleEditManualRow unchanged — no new validated-clearing logic is duplicated here', () => {
    // Both call sites exist: one in the active-workspace row's own
    // "Editar" button, one inside handleUnifiedEntryClick's own routing
    // for an already-validated entry — both must reference the same
    // two functions, never a third, parallel one.
    const editCatalogCallSites = (source.match(/handleEditCatalogRow\(productId\)/g) || []).length;
    const editManualCallSites = (source.match(/handleEditManualRow\(idx\)/g) || []).length;
    assert.equal(editCatalogCallSites, 1, 'Expected exactly one literal call site left: the active-workspace Editar button.');
    assert.equal(editManualCallSites, 1, 'Expected exactly one literal call site left: the active-workspace Editar button.');
    const clickBody = extractFunctionBody(source, 'const handleUnifiedEntryClick = (entry: (typeof unifiedListEntries)[number]) => {');
    assert.match(clickBody, /handleEditCatalogRow\(entry\.catalogProductId\)/);
    assert.match(clickBody, /handleEditManualRow\(entry\.manualRowIndex\)/);
  });
});

describe('Corrigir (Decision 40 FR-N11; Implementation Authorization §1 item 7, §3 items 7-9)', () => {
  it('handleCorrigirTallyItem resolves catalog identity (productId) before falling back to manual identity (manualRowIndex)', () => {
    const body = extractFunctionBody(source, 'const handleCorrigirTallyItem = (item: StockCountTallyItem) => {');
    const productIdBranch = body.indexOf('if (item.productId)');
    const manualBranch = body.indexOf('item.manualRowIndex !== undefined');
    assert.notEqual(productIdBranch, -1);
    assert.notEqual(manualBranch, -1);
    assert.ok(productIdBranch < manualBranch, 'Expected the productId check to come first.');
  });

  it('handleCorrigirTallyItem clears validated via updateCatalogRow/updateManualRow, then discards pendingTally — in that order', () => {
    const body = extractFunctionBody(source, 'const handleCorrigirTallyItem = (item: StockCountTallyItem) => {');
    assert.match(body, /updateCatalogRow\(item\.productId,\s*\{\s*validated:\s*false\s*\}\)/);
    assert.match(body, /updateManualRow\(item\.manualRowIndex,\s*\{\s*validated:\s*false\s*\}\)/);
    const validatedClearIndex = Math.max(body.indexOf('updateCatalogRow('), body.indexOf('updateManualRow('));
    const discardIndex = body.indexOf('setPendingTally(null)');
    assert.notEqual(discardIndex, -1);
    assert.ok(validatedClearIndex < discardIndex, 'Expected the validated flag to be cleared BEFORE pendingTally is discarded.');
  });

  it('the review screen renders a "Corrigir" button gated on item.validated, calling handleCorrigirTallyItem', () => {
    assert.match(source, /\{item\.validated && \(/);
    assert.match(source, /onClick=\{\(\) => handleCorrigirTallyItem\(item\)\}/);
    assert.match(source, />\s*Corrigir\s*</);
  });

  it('"Voltar" is unchanged — still an unconditional setPendingTally(null), independent of Corrigir', () => {
    assert.match(source, /onClick=\{\(\) => setPendingTally\(null\)\}/);
    assert.match(source, />\s*Voltar\s*</);
  });

  it('handleRequestConfirmation tags manual rows with their own array index (rowsForTally), without modifying allWorkingRows itself', () => {
    const body = extractFunctionBody(source, 'const handleRequestConfirmation = async (e: React.FormEvent) => {');
    assert.match(body, /manualRows\.map\(\(row, idx\) => \(\{ \.\.\.row, manualRowIndex: idx \}\)\)/);
    assert.match(body, /tallyStockCountRows\(rowsForTally, effectiveCostBasisByProductName\)/);
    // [Bug fix — per-product independent draft persistence] The
    // identity write immediately below no longer reads allWorkingRows
    // at all (it builds a rowKey-keyed map directly from catalogRows/
    // manualRows for flushPeriodicStockDraftRows' batch write) — but
    // it still reads catalogRows/manualRows in their ORIGINAL,
    // untagged form, proving the SAME invariant this test's own name
    // describes: the manualRowIndex tagging above is local to
    // rowsForTally/tally construction, never mutating the shared
    // catalogRows/manualRows state itself.
    assert.match(body, /for \(const \[productId, row\] of Object\.entries\(catalogRows\)\) rowsByKey\[`catalog:\$\{productId\}`\] = workingRowToDraftItem\(row\);/);
    assert.match(body, /manualRows\.forEach\(\(row, index\) => \{/);
  });
});

describe('Manual-row removal/re-indexing with a validated row involved (Decision 40 FR-N9)', () => {
  it('handleRemoveManualRow contains no re-indexing structure for validated status — no parallel Set exists to re-key', () => {
    const body = extractFunctionBody(source, 'const handleRemoveManualRow = (index: number) => {');
    assert.doesNotMatch(body, /setConfirmedManualRowIndices/);
    // manualRowSaveError's own existing re-indexing block is untouched
    // and still present — only the validated-specific one was removed.
    assert.match(body, /setManualRowSaveError\(\(prev\) => \{/);
  });

  it('the array .filter used to remove a row is the same, single mechanism that already carries every other field (including validated) forward for surviving rows', () => {
    const body = extractFunctionBody(source, 'const handleRemoveManualRow = (index: number) => {');
    assert.match(body, /manualRows\.filter\(\(_, i\) => i !== index\)/);
  });
});

describe('Finalization regression — validated/identity fields never reach recordStockCount (Decision 40 FR-N12; Implementation Authorization §1 item 8/§9)', () => {
  it('the explicit-literal items mapping for recordStockCount contains no "validated" key', () => {
    const body = extractFunctionBody(source, 'const handleConfirmSave = async () => {');
    const itemsLiteralStart = body.indexOf('items: pendingTally.countedItems.map((item) => ({');
    assert.notEqual(itemsLiteralStart, -1);
    const itemsLiteralEnd = body.indexOf('})),', itemsLiteralStart);
    const itemsLiteral = body.slice(itemsLiteralStart, itemsLiteralEnd);
    assert.doesNotMatch(itemsLiteral, /validated:/);
    assert.doesNotMatch(itemsLiteral, /productId:\s*item\.productId/);
    assert.doesNotMatch(itemsLiteral, /manualRowIndex:/);
  });

  it('the items mapping remains an explicit, named object literal — never a spread of `item` — the exact property that makes the exclusion above structural, not incidental', () => {
    const body = extractFunctionBody(source, 'const handleConfirmSave = async () => {');
    const itemsLiteralStart = body.indexOf('items: pendingTally.countedItems.map((item) => ({');
    const itemsLiteralEnd = body.indexOf('})),', itemsLiteralStart);
    const itemsLiteral = body.slice(itemsLiteralStart, itemsLiteralEnd);
    assert.doesNotMatch(itemsLiteral, /\.\.\.item[^N]/, 'Expected no "...item" spread inside the items literal.');
  });

  it('recordStockCount itself is never referenced with a "validated" argument or parameter anywhere in this component', () => {
    assert.doesNotMatch(source, /recordStockCount\([^)]*validated/s);
  });
});

describe('Validation-state autosave / T0-T100 correctness (Decision 40 FR-N10; Rule 8 §F)', () => {
  it('scheduleRowDraftSave contains NO special-cased path for validated — it is a generic, all-fields mechanism, so the T0/T100 proof already established for every other field (Decision 39 suite, block C) applies to validated automatically, with zero new code', () => {
    const body = extractFunctionBody(source, 'const scheduleRowDraftSave = (');
    assert.doesNotMatch(body, /validated/, 'scheduleRowDraftSave must have no field-specific logic — it must remain generic across every field, including validated.');
    // It must still build its write payload from the live ref and the
    // existing conversion function — the exact mechanism that makes
    // "generic" also mean "correct for validated". [Bug fix —
    // per-product independent draft persistence] Was
    // `.map(workingRowToDraftItem)` over a combined array — now a
    // single `workingRowToDraftItem(row)` call on whichever ONE row
    // this rowKey resolves to (savePeriodicStockDraftItem writes just
    // that row's own document) — still the same conversion function,
    // still no field-specific branching for validated or anything
    // else.
    assert.match(body, /latestFlushArgs\.current/);
    assert.match(body, /workingRowToDraftItem\(row\)/);
  });

  it('flushPeriodicDraftNow (interruption/SPA-unmount flush) is equally generic — no validated-specific branch exists there either', () => {
    const body = extractFunctionBody(source, 'const flushPeriodicDraftNow = () => {');
    assert.doesNotMatch(body, /validated/);
    assert.match(body, /latestFlushArgs\.current/);
    // [Bug fix — per-product independent draft persistence] Was
    // `.map(workingRowToDraftItem)` over one combined array — now
    // builds a rowKey-keyed map, calling the SAME conversion function
    // per row, for flushPeriodicStockDraftRows' batch write.
    assert.match(body, /workingRowToDraftItem\(row\)/);
  });

  it('updateCatalogRow/updateManualRow (the write path Validar/Editar/Corrigir all use to set validated) schedule their row\'s own existing timer key — no new timer key scheme was introduced for validated', () => {
    const catalogBody = extractFunctionBody(source, 'const updateCatalogRow = (');
    const manualBody = extractFunctionBody(source, 'const updateManualRow = (');
    assert.match(catalogBody, /scheduleRowDraftSave\(`catalog:\$\{productId\}`\)/);
    assert.match(manualBody, /scheduleRowDraftSave\(`manual:\$\{index\}`\)/);
  });
});

describe('Resume (Retomar Contagem) restores validated status automatically (Decision 40; Rule 8 §G)', () => {
  it('a partially validated draft (A validated, B validated, C not) round-trips through workingRowToDraftItem -> draftItemToWorkingRow with each row\'s own status intact, independently of the others', () => {
    const a = row({ productId: 'A', productName: 'Produto A', validated: true });
    const b = row({ productId: 'B', productName: 'Produto B', validated: true });
    const c = row({ productId: 'C', productName: 'Produto C', validated: false });

    // [Rule 8 §G scenario] Simulates the persisted draft document —
    // exactly what savePeriodicStockDraft would have written and what
    // handleResumeDraft reads back on Retomar Contagem.
    const persisted = [a, b, c].map(workingRowToDraftItem);
    const resumed = persisted.map(draftItemToWorkingRow);

    const byId = new Map(resumed.map((r) => [r.productId, r]));
    assert.equal(byId.get('A')?.validated, true, 'Produto A must resume validated.');
    assert.equal(byId.get('B')?.validated, true, 'Produto B must resume validated.');
    assert.equal(byId.get('C')?.validated, false, 'Produto C must resume NOT validated.');
    // No row lost, none duplicated.
    assert.equal(resumed.length, 3);
  });

  it('an all-validated draft resumes with every row validated — no minimum-active-row invariant rejects it', () => {
    const rows = ['A', 'B', 'C'].map((id) => row({ productId: id, validated: true }));
    const resumed = rows.map(workingRowToDraftItem).map(draftItemToWorkingRow);
    assert.ok(resumed.every((r) => r.validated === true));
  });

  it('a legacy draft item with no validated field at all resumes as not-validated (undefined), never as an error', () => {
    const legacyItem = {
      productId: 'p1',
      productName: 'Arroz',
      quantity: '10',
      unit: 'kg',
      costPrice: '50',
      sellingPrice: '80',
      // No `validated` key at all — simulates a document written
      // before Decision 40 existed.
    };
    const resumed = draftItemToWorkingRow(legacyItem);
    assert.equal(resumed.validated, undefined);
  });

  it('handleResumeDraft still routes every item through draftItemToWorkingRow unmodified — no special-cased re-population of any validated Set', () => {
    const body = extractFunctionBody(source, 'const handleResumeDraft = () => {');
    assert.match(body, /draftItemToWorkingRow\(item\)/);
    assert.doesNotMatch(body, /setConfirmedCatalogProductIds|setConfirmedManualRowIndices/);
  });

  it('handleResumeDraft has no minimum-active-row invariant that would reject an all-validated resumed draft', () => {
    const body = extractFunctionBody(source, 'const handleResumeDraft = () => {');
    assert.doesNotMatch(body, /throw new Error/);
  });
});

describe('Negative / out-of-scope proofs (Decision 40 amendment §4; Implementation Authorization §2)', () => {
  it('no import of, or JSX usage of, Initial Stock or Add Stock components/drafts exists in this component — comment mentions as design precedent (already an established, pre-existing pattern in this file) are not the same as an actual dependency', () => {
    assert.doesNotMatch(source, /from ['"].*InitialStockCountView['"]/);
    assert.doesNotMatch(source, /from ['"].*AddStockView['"]/);
    assert.doesNotMatch(source, /<InitialStockCountView|<AddStockView/);
    assert.doesNotMatch(source, /\bInitialStockDraft\b/);
    assert.doesNotMatch(source, /\bPurchaseDraft(Item|LineItem)?\b/);
  });

  it('recordStockCount, StockCount history, and BusinessWorthSnapshot construction are untouched — the call itself still has no "validated" parameter (re-confirmed, see the finalization-regression block above) and BusinessWorthSnapshot is never referenced directly in this file', () => {
    assert.doesNotMatch(source, /BusinessWorthSnapshot\s*\(/);
  });

  it('rowDebounceTimersRef remains a single Map — no per-row or per-flag restructuring was introduced for validated', () => {
    assert.match(source, /const rowDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>\(new Map\(\)\)/);
  });

  it('no new debounce/flush function was introduced alongside scheduleRowDraftSave/flushPeriodicDraftNow', () => {
    const scheduleFns = (source.match(/const \w*[Ss]chedule\w*DraftSave\w* = /g) || []).length;
    const flushFns = (source.match(/const \w*[Ff]lush\w*DraftNow\w* = /g) || []).length;
    assert.equal(scheduleFns, 1, 'Expected exactly one scheduling function (scheduleRowDraftSave).');
    assert.equal(flushFns, 1, 'Expected exactly one flush function (flushPeriodicDraftNow).');
  });

  it('validateWorkingRowForSave (the shared Validar/Guardar-era validation rule) is unchanged in its core conditions', () => {
    const body = extractFunctionBody(source, 'const validateWorkingRowForSave = (');
    assert.match(body, /row\.quantity\.trim\(\) === ''/);
    assert.match(body, /!Number\.isFinite\(qty\) \|\| qty < 0/);
  });
});
