// SABUSH BPT — Periodic Contagem, Existing-Product Edit/Confirm
// Workflow.
//
// Covers the "SABUSH BPT — PERIODIC CONTAGEM EXISTING-PRODUCT
// EDIT/CONFIRM WORKFLOW" authorization: clicking an ALREADY-COUNTED
// product in the persistent list now opens the SAME existing
// row(s)/portions in the workspace — populated with its existing
// quantity/unit/price — rather than un-validating it and leaving the
// Owner to find and re-select it a second time from the picker. No
// duplicate row is ever created; the existing catalogRows/manualRows
// identity is reused; validating (with or without edits) returns the
// SAME existing product to the counted list.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see periodic-contagem-single-product-workspace.test.ts's
// own header). This suite follows the same source-inspection
// technique: regex/string assertions against the raw
// PeriodicStockCountView.tsx source, proving structural guarantees
// rather than rendered output.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-existing-product-edit-confirm-workflow.test.ts

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

const reopenBody = extractFunctionBody(periodicSrc, 'const reopenExistingProductForEditing = (key: string) => {');
const leaveBody = extractFunctionBody(periodicSrc, 'const handleLeaveWorkspaceUnchanged = () => {');
const editCatalogBody = extractFunctionBody(periodicSrc, 'const handleEditCatalogRow = (productId: string) => {');
const editManualBody = extractFunctionBody(periodicSrc, 'const handleEditManualRow = (index: number) => {');

// ---------------------------------------------------------------------
// A. Clicking an existing counted product opens ITS existing data
// ---------------------------------------------------------------------
describe('A — Clicking an existing counted (catalog) product opens its existing data', () => {
  it('handleEditCatalogRow resolves the row it was clicked for, then hands its product-name key to reopenExistingProductForEditing — never a blank/new activation', () => {
    assert.match(editCatalogBody, /const row = catalogRows\[productId\];/);
    assert.match(editCatalogBody, /reopenExistingProductForEditing\(productKeyFor\(row\.productName\)\)/);
  });

  it('reopenExistingProductForEditing activates the workspace via the SAME activeWorkspaceKey mechanism the picker itself uses — not a new/second activation pathway', () => {
    assert.match(reopenBody, /setActiveWorkspaceKey\(key\)/);
    assert.match(reopenBody, /setActiveNewManualRowIndex\(null\)/);
  });

  it('the activated key resolves back to the SAME existing row via the unmodified visibleCatalogEntries filter (productKeyFor(row.productName) === activeWorkspaceProductKey) — proving this opens the existing row, not a placeholder', () => {
    const visibleCatalogBody = extractFunctionBody(periodicSrc, 'const visibleCatalogEntries = useMemo(() => {');
    assert.match(visibleCatalogBody, /productKeyFor\(row\.productName\) === activeWorkspaceProductKey/);
  });
});

describe('B — Clicking an existing counted (manual) product opens its existing data', () => {
  it('handleEditManualRow resolves the row it was clicked for, then hands its product-name key to reopenExistingProductForEditing', () => {
    assert.match(editManualBody, /const row = manualRows\[index\];/);
    assert.match(editManualBody, /reopenExistingProductForEditing\(productKeyFor\(row\.productName\)\)/);
  });

  it('the activated key resolves back to the SAME existing manual-row group via the unmodified visibleManualRowGroups filter (group.key === activeWorkspaceProductKey)', () => {
    const visibleManualBody = extractFunctionBody(periodicSrc, 'const visibleManualRowGroups = useMemo(() => {');
    assert.match(visibleManualBody, /group\.key === activeWorkspaceProductKey/);
  });
});

// ---------------------------------------------------------------------
// C. Existing quantity / unit / selling price are preserved when opened
// ---------------------------------------------------------------------
describe('C — Existing field values are preserved when a counted product is reopened', () => {
  it('reopenExistingProductForEditing never writes to quantity/unit/sellingPrice — it only ever touches the validated flag', () => {
    assert.doesNotMatch(reopenBody, /quantity:/);
    assert.doesNotMatch(reopenBody, /unit:/);
    assert.doesNotMatch(reopenBody, /sellingPrice:/);
  });

  it('the active-workspace quantity/unit/price inputs are bound directly to row.quantity/row.unit/row.sellingPrice (pre-existing, unmodified bindings) — so whatever the existing row already holds is exactly what renders once it becomes the active row', () => {
    assert.match(periodicSrc, /value=\{row\.quantity\}/);
    assert.match(periodicSrc, /value=\{row\.unit\}/);
  });
});

// ---------------------------------------------------------------------
// D. Editing only the name (Feijao -> Feijão) requires no re-entry
// ---------------------------------------------------------------------
describe('D — A name-only correction does not require re-entering other fields', () => {
  it('a catalog-linked row\'s productName is read-only in the active workspace by pre-existing design (tied to the linked Product document\'s own identity, not editable inline during Contagem) — unrelated to and unchanged by this workflow; the manual-row rename path below is where a name-only correction like "Feijao -> Feijão" actually applies', () => {
    // Confirmed by direct inspection: visibleCatalogEntries.map(([productId, row]) => {...})
    // renders row.productName as a label, never as a controlled <input>
    // with an onChange — there is no catalog-row name-edit path to
    // preserve or break here.
    assert.match(periodicSrc, /visibleCatalogEntries\.map\(\(\[productId, row\]\) => \{/);
  });

  it('the manual-row group name field reuses the SAME pre-existing handleRenameManualGroup path, unmodified — this is the actual "Feijao -> Feijão" correction path', () => {
    assert.match(periodicSrc, /group\.key \? handleRenameManualGroup\(group\.key, e\.target\.value\) : updateManualRow\(firstIdx, \{ productName: e\.target\.value \}\)/);
  });

  it('reopening (via reopenExistingProductForEditing) only READS productName — to match which existing rows belong to the reopened product (productKeyFor(row.productName)) — and never WRITES to it; the existing name, whatever it already is, is exactly what the reopened row\'s input starts with, and only handleRenameManualGroup/updateManualRow — both pre-existing, both unmodified — ever change it, driven by the Owner\'s own typing', () => {
    assert.match(reopenBody, /productKeyFor\(row\.productName\)/);
    assert.doesNotMatch(reopenBody, /productName:/);
  });
});

// ---------------------------------------------------------------------
// E. No duplicate is ever created — reopening or re-validating
// ---------------------------------------------------------------------
describe('E — Reopening and re-validating an existing product never creates a duplicate', () => {
  it('reopenExistingProductForEditing never creates a new row — no createManualRow()/buildCatalogRow() call, no push onto manualRows, inside its own body', () => {
    assert.doesNotMatch(reopenBody, /createManualRow\(\)/);
    assert.doesNotMatch(reopenBody, /buildCatalogRow\(/);
    assert.doesNotMatch(reopenBody, /\.push\(/);
    assert.doesNotMatch(reopenBody, /manualRows\.length/);
  });

  it('handleLeaveWorkspaceUnchanged never creates a new row either', () => {
    assert.doesNotMatch(leaveBody, /createManualRow\(\)/);
    assert.doesNotMatch(leaveBody, /buildCatalogRow\(/);
    assert.doesNotMatch(leaveBody, /\.push\(/);
  });

  it('re-validating (Validar) an existing row still routes through the SAME, unmodified handleSaveCatalogRow/handleSaveManualRow -> updateCatalogRow/updateManualRow path — never a second/parallel write path introduced by this workflow', () => {
    const saveCatalogBody = extractFunctionBody(periodicSrc, 'const handleSaveCatalogRow = (productId: string) => {');
    const saveManualBody = extractFunctionBody(periodicSrc, 'const handleSaveManualRow = (index: number) => {');
    // [Periodic Contagem Entry-Order Sort Mode — Implementation
    // Authorization, mechanical regression fix, Product Architect
    // authorization for narrowly-scoped test adjustment] Widened from
    // the Decision-40-era exact `{ validated: true }` literal to allow
    // that Authorization's own atomic-Validar requirement (§3 criterion
    // 3): `entrySequence` merged into the SAME call. Still asserts both
    // fields land in one object literal, AND (via the call-count checks
    // below) that this remains the ONLY updateCatalogRow/updateManualRow
    // call in each handler — the original guarantee this test protects
    // is unchanged, only the literal shape of the one authorized call is.
    assert.match(saveCatalogBody, /updateCatalogRow\(productId,\s*\{\s*validated:\s*true,\s*entrySequence:[^}]*\}\);/);
    assert.match(saveManualBody, /updateManualRow\(index,\s*\{\s*validated:\s*true,\s*entrySequence:[^}]*\}\);/);
    const catalogCallCount = (saveCatalogBody.match(/updateCatalogRow\(/g) || []).length;
    const manualCallCount = (saveManualBody.match(/updateManualRow\(/g) || []).length;
    assert.equal(catalogCallCount, 1, 'handleSaveCatalogRow must call updateCatalogRow exactly once — no second/parallel write path.');
    assert.equal(manualCallCount, 1, 'handleSaveManualRow must call updateManualRow exactly once — no second/parallel write path.');
  });
});

// ---------------------------------------------------------------------
// F. No-change confirmation: Validar with zero edits is a safe no-op
// ---------------------------------------------------------------------
describe('F — Validar with zero changes is safe (no duplicate, no altered value)', () => {
  it('validateWorkingRowForSave (the shared gate every Validar click passes through, reopened row or not) is completely unaffected by this workflow — no new bypass, no new special case for a reopened row', () => {
    const validateBody = extractFunctionBody(periodicSrc, 'const validateWorkingRowForSave = (row: StockCountWorkingRow): string | null => {');
    assert.match(validateBody, /Introduza a quantidade contada/);
  });

  it('the auto-clear-to-empty effect (fires once every visible row is validated) is untouched by this workflow — a reopened, then re-validated product returns the workspace to empty via the SAME pre-existing mechanism', () => {
    const autoClearBody = extractFunctionBody(periodicSrc, '  useEffect(() => {\n    if (!isWorkspaceActive) return;');
    assert.match(autoClearBody, /rows\.length === 0 \|\| rows\.every\(\(row\) => row\.validated\)/);
  });
});

// ---------------------------------------------------------------------
// G. Product identity is preserved — no new id, no re-keying
// ---------------------------------------------------------------------
describe('G — Existing product identity is preserved throughout', () => {
  it('reopenExistingProductForEditing keys strictly off the EXISTING productKeyFor(name) identity — never generates a new id (no Date.now(), no crypto.randomUUID, no incrementing counter)', () => {
    assert.doesNotMatch(reopenBody, /Date\.now\(\)/);
    assert.doesNotMatch(reopenBody, /crypto\.randomUUID/);
  });

  it('catalog rows are updated in place by their existing productId (Object.entries/spread — never Object.assign onto a new key, never a new productId minted)', () => {
    assert.match(reopenBody, /Object\.entries\(prev\)/);
    assert.match(reopenBody, /next\[id\] = \{ \.\.\.row, validated: false \}/);
  });
});

// ---------------------------------------------------------------------
// H. Portions — a multi-portion product reopens with ALL its portions
// ---------------------------------------------------------------------
describe('H — Existing portions are preserved and reopen together (Cebola: 4 saco + 3 kg)', () => {
  it('reopenExistingProductForEditing un-validates EVERY row (catalog AND manual) sharing the product\'s name-key — not only the single row that was clicked — so a product split across multiple portions/rows reopens as one group, never split', () => {
    assert.match(reopenBody, /productKeyFor\(row\.productName\) === key && row\.validated/);
    // Two distinct un-validation blocks — one over catalogRows
    // (setCatalogRows), one over manualRows (setManualRows) — proving
    // BOTH representations are covered, not only whichever one the
    // Owner happened to click.
    assert.match(reopenBody, /setCatalogRows\(\(prev\) => \{/);
    assert.match(reopenBody, /setManualRows\(\(prev\) => \{/);
  });

  it('the active-workspace manual-portion loop still filters out only VALIDATED portions at render time (group.rows.filter(...=> !manualRows[idx]?.validated)) — unmodified — so every portion this workflow just un-validated becomes visible together in the same card', () => {
    assert.match(periodicSrc, /group\.rows\.filter\(\(\{ idx \}\) => !manualRows\[idx\]\?\.validated\)\.map\(\(\{ idx \}\) => \{/);
  });

  it('groupRowsByProductName (the single existing grouping rule every portion view already shares) is not CALLED again inside this workflow — reopenExistingProductForEditing only mentions it in an explanatory comment, never invokes it as a second, competing grouping computation', () => {
    // Strip comment lines before checking for an actual function CALL
    // (`groupRowsByProductName(` in executable code) — the function
    // name legitimately appears in this body's own explanatory
    // comments (documenting why un-validating must cover every row
    // sharing a name, the SAME identity concept groupRowsByProductName
    // already establishes), which is documentation, not a second call
    // site.
    const executableLines = reopenBody
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    assert.doesNotMatch(executableLines, /groupRowsByProductName\(/);
  });
});

// ---------------------------------------------------------------------
// I. Single-active-product rule still applies to reopened products
// ---------------------------------------------------------------------
describe('I — The single-active-product rule applies to reopening an existing product exactly as it does to picking a new one', () => {
  it('reopenExistingProductForEditing refuses to activate a product other than the currently-active one — defense in depth alongside the disabled button, below', () => {
    assert.match(reopenBody, /if \(isWorkspaceActive && activeWorkspaceProductKey !== key\) return;/);
  });

  it('the unified list\'s own Editar/Abrir button (covering both catalog and manual entries, now via one shared control) is disabled whenever a DIFFERENT product is currently active — never able to activate a second independent product', () => {
    // [Owner-requested — single unified product list] The old per-loop
    // `editDisabled = isWorkspaceActive && activeWorkspaceProductKey !== productKeyFor(row.productName)`
    // guard is superseded by `const disabled = isWorkspaceActive;` —
    // simpler, but equivalent in effect: `visibleUnifiedListEntries`
    // (declared far above) already excludes the active product's own
    // entries from this list entirely, so every entry reaching this
    // render is, by construction, a DIFFERENT product than the active
    // one whenever a workspace is active — see that memo's own filter
    // for the actual key comparison this simplification relies on.
    const disabledMatches = periodicSrc.match(/const disabled = isWorkspaceActive;/g) ?? [];
    assert.equal(disabledMatches.length, 1, 'Expected the disabled guard in the unified list.');
    const visibleEntriesBody = extractFunctionBody(periodicSrc, 'const visibleUnifiedListEntries = useMemo(');
    assert.match(visibleEntriesBody, /!isWorkspaceActive \|\| entry\.activationKey !== activeWorkspaceProductKey/);
    // [Bug fix — "editing a validated product is not accepting"] The
    // click is now routed through `handleEntryActivation`, a small
    // per-entry wrapper that ALSO redirects a CONFLICT row to the
    // conflict panel instead of opening it — but it still checks
    // `disabled` first, before anything else, so the single-active-
    // product guarantee this test exists to protect is unchanged.
    assert.match(
      periodicSrc,
      /const handleEntryActivation = \(\) => \{\s*if \(disabled\) return;/,
      'Expected handleEntryActivation to refuse activation whenever disabled, before considering anything else.'
    );
    assert.match(periodicSrc, /disabled=\{disabled\}[\s\S]{0,400}handleEntryActivation\(\);|handleEntryActivation\(\)[\s\S]{0,200}disabled=\{disabled\}/);
  });

  it('the idle-state left column (formerly the picker table) remains hidden while a product (new or reopened) is active — the SAME `{!isWorkspaceActive && (...)}` gate, unmodified by this workflow', () => {
    assert.match(periodicSrc, /\{!isWorkspaceActive && \(/);
  });
});

// ---------------------------------------------------------------------
// J. Draft / autosave compatibility
// ---------------------------------------------------------------------
describe('J — Draft/autosave behavior is preserved', () => {
  it('reopenExistingProductForEditing schedules the SAME structural (\'__meta__\') autosave every other multi-row change in this file already uses — no new persistence mechanism', () => {
    assert.match(reopenBody, /scheduleRowDraftSave\('__meta__'\)/);
  });

  it('handleLeaveWorkspaceUnchanged also schedules \'__meta__\' autosave when (and only conceptually when) it restores validated status — same existing mechanism', () => {
    assert.match(leaveBody, /scheduleRowDraftSave\('__meta__'\)/);
  });

  it('neither function touches the draft schema/shape — workingRowToDraftItem/draftItemToWorkingRow (the existing draft serialization functions) are not referenced or reimplemented here', () => {
    assert.doesNotMatch(reopenBody, /workingRowToDraftItem/);
    assert.doesNotMatch(reopenBody, /draftItemToWorkingRow/);
    assert.doesNotMatch(leaveBody, /workingRowToDraftItem/);
    assert.doesNotMatch(leaveBody, /draftItemToWorkingRow/);
  });

  it('handleResumeDraft (restoring a saved draft) is completely untouched by this workflow — a reopened-then-interrupted product still resumes via the exact same pre-existing path', () => {
    const resumeBody = extractFunctionBody(periodicSrc, 'const handleResumeDraft = () => {');
    assert.match(resumeBody, /setCatalogRows\(nextCatalogRows\);/);
    assert.match(resumeBody, /setManualRows\(nextManualRows\);/);
    assert.doesNotMatch(resumeBody, /reopenExistingProductForEditing/);
  });
});

// ---------------------------------------------------------------------
// K. Calculations are untouched
// ---------------------------------------------------------------------
describe('K — Existing calculation/valuation paths are completely untouched by this workflow', () => {
  it('reopenExistingProductForEditing and handleLeaveWorkspaceUnchanged reference none of the valuation/conversion/Mode-A functions', () => {
    for (const forbidden of [
      'tallyStockCountRows',
      'normalizeStockCountItems',
      'getConversionFactor',
      'deriveModeAPortionValuations',
      'applyModeAToGroup',
      'resolveUnitAwarePrice',
      'buildProductCostBasisMap',
    ]) {
      assert.doesNotMatch(reopenBody, new RegExp(forbidden));
      assert.doesNotMatch(leaveBody, new RegExp(forbidden));
    }
  });

  it('the live selling-value calculation (quantity * sellingPrice, computed for both the active row and the counted-list row) is the SAME pre-existing expression, not reimplemented for the reopened case', () => {
    // [Owner-requested — single unified product list] Catalog and
    // manual entries now share ONE loop, so this expression appears
    // once for the unified list (plus once for the active-workspace
    // row's own rowSellingValue — a differently-named but equally
    // pre-existing sibling expression, unaffected by this workflow).
    const matches = periodicSrc.match(/const rowValue = q \* sellingPriceNum;/g) ?? [];
    assert.ok(matches.length >= 1, 'Expected the existing rowValue calculation to still appear for the unified list.');
  });
});

// ---------------------------------------------------------------------
// L. "Voltar" investigation — retained, and fixed for the reopened case
// ---------------------------------------------------------------------
describe('L — "Voltar (deixar sem alterações)" is retained, not removed, and now correctly restores counted status for a reopened product', () => {
  it('Voltar is still present as a real, always-available exit while a product is active — not removed', () => {
    assert.match(periodicSrc, /Voltar \(deixar sem alterações\)/);
  });

  it('for a genuinely NEW product (reopenedExistingProductKey is null), Voltar performs the SAME pure two-state clear as before this workflow — no validated write of any kind', () => {
    // The restoration block is gated behind `if (reopenedExistingProductKey !== null)` —
    // proving the null/new-product branch falls straight through to the
    // same two clears with no other side effect.
    assert.match(leaveBody, /if \(reopenedExistingProductKey !== null\) \{/);
    assert.match(leaveBody, /setActiveWorkspaceKey\(null\);/);
    assert.match(leaveBody, /setActiveNewManualRowIndex\(null\);/);
  });

  it('for a REOPENED existing product, Voltar restores validated: true — the same write Validar itself performs, applied on exit instead of on an explicit per-row click — but ONLY to the exact rows captured as already-validated at reopen time, never to every currently-unvalidated row sharing the product\'s name (see the Voltar edge-case fix, suite M, below, for why the blanket-by-name form was a bug)', () => {
    assert.match(leaveBody, /catalogIdsToRestore\.has\(id\) && !row\.validated/);
    assert.match(leaveBody, /manualIndicesToRestore\.has\(index\) && !row\.validated/);
    assert.match(leaveBody, /validated:\s*true/);
  });

  it('reopenedExistingProductKey is cleared on every path that could otherwise leave it stale: ordinary picker selection, adding a new product, the auto-clear-on-all-validated effect, and Voltar itself', () => {
    const selectBody = extractFunctionBody(periodicSrc, 'const handleSelectExistingProductForWorkspace = (key: string) => {');
    const addNewBody = extractFunctionBody(periodicSrc, 'const handleAddNewProductToWorkspace = () => {');
    const autoClearBody = extractFunctionBody(periodicSrc, '  useEffect(() => {\n    if (!isWorkspaceActive) return;');
    assert.match(selectBody, /setReopenedExistingProductKey\(null\)/);
    assert.match(addNewBody, /setReopenedExistingProductKey\(null\)/);
    assert.match(autoClearBody, /setReopenedExistingProductKey\(null\)/);
    assert.match(leaveBody, /setReopenedExistingProductKey\(null\)/);
  });
});
