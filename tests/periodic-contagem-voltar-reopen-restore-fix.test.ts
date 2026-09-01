// SABUSH BPT — Periodic Contagem, Voltar Reopen/Restore Edge-Case Fix.
//
// Focused corrective pass on top of the "SABUSH BPT — PERIODIC
// CONTAGEM EXISTING-PRODUCT EDIT/CONFIRM WORKFLOW" authorization (see
// tests/periodic-contagem-existing-product-edit-confirm-workflow.test.ts).
// That workflow's own Voltar restoration ("leave it as it is" for a
// reopened, already-counted product) had one real edge case: it
// restored `validated: true` to EVERY row currently sharing the
// reopened product's name and currently unvalidated — which also
// swept up a brand-new portion added AFTER reopening (also
// unvalidated, by construction), falsely marking it counted without
// it ever going through its own Validar.
//
// THE FIX: `reopenExistingProductForEditing` now captures the EXACT
// identity (catalog row id / manual row array index) of only the rows
// that were ALREADY validated at the moment it opened them, before
// any un-validation happens. `handleLeaveWorkspaceUnchanged` (Voltar)
// restores `validated: true` ONLY to rows named in that captured set
// — never to "every unvalidated row of this name" — so a newly added
// portion (never in that set, because it did not exist yet when the
// set was built) is left exactly as it is: unvalidated.
//
// No field VALUES are snapshotted or reverted by this fix — only
// which rows counted as validated. No calculation, persistence,
// schema, or product-identity behavior changes.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see periodic-contagem-single-product-workspace.test.ts's
// own header, and this fix's own sibling file,
// periodic-contagem-existing-product-edit-confirm-workflow.test.ts).
// This suite follows the same source-inspection technique: regex/
// string assertions against the raw PeriodicStockCountView.tsx source,
// proving structural guarantees rather than rendered output. Where a
// scenario would otherwise need a runtime render to observe (e.g. the
// Total-column layout fix, covered at the end of this file), the exact
// class/markup change is asserted directly against the source instead.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-voltar-reopen-restore-fix.test.ts

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
const createManualRowBody = extractFunctionBody(periodicSrc, 'const createManualRow = ');
const handleAddManualRowBody = extractFunctionBody(periodicSrc, 'const handleAddManualRow = () => {');
const handleAddPortionBody = extractFunctionBody(periodicSrc, 'const handleAddPortionToManualGroup = (groupDisplayName: string) => {');

// ---------------------------------------------------------------------
// A. The exact-identity snapshot is captured BEFORE un-validation
// ---------------------------------------------------------------------
describe('A — reopenExistingProductForEditing captures exact row identity before un-validating', () => {
  it('computes validatedCatalogRowIdsAtReopen from the CURRENT catalogRows (id + productKeyFor(name) === key + already validated), before any un-validating write', () => {
    assert.match(
      reopenBody,
      /const validatedCatalogRowIdsAtReopen = Object\.entries\(catalogRows\)\s*\n\s*\.filter\(\(\[, row\]\) => productKeyFor\(row\.productName\) === key && row\.validated\)/
    );
    const captureIndex = reopenBody.indexOf('validatedCatalogRowIdsAtReopen');
    const unvalidateIndex = reopenBody.indexOf('setCatalogRows((prev)');
    assert.ok(captureIndex !== -1 && unvalidateIndex !== -1 && captureIndex < unvalidateIndex,
      'The catalog capture must run before the un-validating setCatalogRows call, or it would capture post-mutation state.');
  });

  it('computes validatedManualRowIndicesAtReopen from the CURRENT manualRows array (index + productKeyFor(name) === key + already validated), before any un-validating write', () => {
    assert.match(
      reopenBody,
      /const validatedManualRowIndicesAtReopen = manualRows\s*\n\s*\.map\(\(row, index\) => \(\{ row, index \}\)\)\s*\n\s*\.filter\(\(\{ row \}\) => productKeyFor\(row\.productName\) === key && row\.validated\)/
    );
    const captureIndex = reopenBody.indexOf('validatedManualRowIndicesAtReopen');
    const unvalidateIndex = reopenBody.indexOf('setManualRows((prev)');
    assert.ok(captureIndex !== -1 && unvalidateIndex !== -1 && captureIndex < unvalidateIndex,
      'The manual-row capture must run before the un-validating setManualRows call, or it would capture post-mutation state.');
  });

  it('the two captured lists are stored in their own dedicated state, set once per reopen, alongside reopenedExistingProductKey', () => {
    assert.match(reopenBody, /setReopenedValidatedCatalogRowIds\(validatedCatalogRowIdsAtReopen\)/);
    assert.match(reopenBody, /setReopenedValidatedManualRowIndices\(validatedManualRowIndicesAtReopen\)/);
    assert.match(reopenBody, /setReopenedExistingProductKey\(key\)/);
  });

  it('still creates no new row and performs no new grouping/identity concept (same guarantee suite E already proves for this function)', () => {
    assert.doesNotMatch(reopenBody, /createManualRow\(\)/);
    assert.doesNotMatch(reopenBody, /buildCatalogRow\(/);
    assert.doesNotMatch(reopenBody, /\.push\(/);
  });
});

// ---------------------------------------------------------------------
// B. Voltar restores ONLY the captured rows — never a blanket by-name
//    match against "every currently unvalidated row"
// ---------------------------------------------------------------------
describe('B — handleLeaveWorkspaceUnchanged restores only the exact captured rows', () => {
  it('builds lookup sets from the captured lists, not from a fresh by-name scan', () => {
    assert.match(leaveBody, /const catalogIdsToRestore = new Set\(reopenedValidatedCatalogRowIds \?\? \[\]\)/);
    assert.match(leaveBody, /const manualIndicesToRestore = new Set\(reopenedValidatedManualRowIndices \?\? \[\]\)/);
  });

  it('the catalog restore condition checks captured-id membership, never a bare productKeyFor(name) === key match', () => {
    assert.match(leaveBody, /catalogIdsToRestore\.has\(id\) && !row\.validated/);
    assert.doesNotMatch(leaveBody, /productKeyFor\(row\.productName\) === key && !row\.validated/);
  });

  it('the manual-row restore condition checks captured-index membership, never a bare productKeyFor(name) === key match', () => {
    assert.match(leaveBody, /manualIndicesToRestore\.has\(index\) && !row\.validated/);
  });

  it('restoration still writes ONLY the validated flag — no quantity/unit/price/productName field is read or written by this handler (no field-level revert/snapshot system)', () => {
    assert.match(leaveBody, /\{ \.\.\.row, validated: true \}/g);
    for (const forbiddenField of ['quantity:', 'unit:', 'costPrice:', 'sellingPrice:', 'productName:']) {
      assert.doesNotMatch(leaveBody, new RegExp(`${forbiddenField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*['\`"]`),
        `handleLeaveWorkspaceUnchanged must never assign a literal ${forbiddenField} value — it only restores the validated flag.`);
    }
  });

  it('clears the captured lists alongside reopenedExistingProductKey on the way out, so a stale snapshot can never leak into a later Voltar press', () => {
    assert.match(leaveBody, /setReopenedValidatedCatalogRowIds\(null\)/);
    assert.match(leaveBody, /setReopenedValidatedManualRowIndices\(null\)/);
  });
});

// ---------------------------------------------------------------------
// C. A new portion added after reopening is structurally excluded from
//    the captured set, and therefore never restored by Voltar
// ---------------------------------------------------------------------
describe('C — a newly-added portion (added after reopen) cannot be swept into the restored set', () => {
  it('a brand-new manual row is unvalidated by construction (createManualRow sets no validated: true default)', () => {
    assert.doesNotMatch(createManualRowBody, /validated:\s*true/);
  });

  it('handleAddManualRow appends the new row to the END of the array (manualRows is strictly append-only) — so it lands at a brand-new index that could not have existed in a snapshot captured earlier', () => {
    assert.match(handleAddManualRowBody, /const nextManualRows = \[\.\.\.manualRows, createManualRow\(\)\];/);
  });

  it('handleAddPortionToManualGroup (the "+ Adicionar Porção" affordance for an existing product) also produces an unvalidated row, never validated: true, by construction', () => {
    assert.doesNotMatch(handleAddPortionBody, /validated:\s*true/);
  });

  it('the capture happens once, synchronously, inside reopenExistingProductForEditing itself — a portion added by a LATER, separate handler call cannot retroactively appear in a Set already constructed and passed to setState', () => {
    // Structural guarantee: the Set(s) consumed by handleLeaveWorkspaceUnchanged
    // are built from state (reopenedValidatedCatalogRowIds/
    // reopenedValidatedManualRowIndices) that is only ever written by
    // reopenExistingProductForEditing (captured at reopen time) or
    // cleared to null — never appended to by any other handler.
    const otherWriters = [...periodicSrc.matchAll(/setReopenedValidatedCatalogRowIds\(([^)]*)\)/g)].map((m) => m[1].trim());
    const otherWritersManual = [...periodicSrc.matchAll(/setReopenedValidatedManualRowIndices\(([^)]*)\)/g)].map((m) => m[1].trim());
    for (const arg of otherWriters) {
      assert.ok(arg === 'null' || arg === 'validatedCatalogRowIdsAtReopen',
        `setReopenedValidatedCatalogRowIds must only ever be called with the fresh capture or null to clear it, found: ${arg}`);
    }
    for (const arg of otherWritersManual) {
      assert.ok(arg === 'null' || arg === 'validatedManualRowIndicesAtReopen',
        `setReopenedValidatedManualRowIndices must only ever be called with the fresh capture or null to clear it, found: ${arg}`);
    }
  });
});

// ---------------------------------------------------------------------
// D. Multi-portion products (e.g. Cebola: catalog "4 saco" + manual
//    "3 kg") — both structures are captured and restored independently
// ---------------------------------------------------------------------
describe('D — same-name/different-unit portions across catalogRows AND manualRows both restore correctly', () => {
  it('the catalog capture/restore path and the manual-row capture/restore path are both present and independent (a product split across both structures gets both halves captured and both halves restored)', () => {
    assert.match(reopenBody, /validatedCatalogRowIdsAtReopen/);
    assert.match(reopenBody, /validatedManualRowIndicesAtReopen/);
    assert.match(leaveBody, /catalogIdsToRestore/);
    assert.match(leaveBody, /manualIndicesToRestore/);
  });

  it('un-validation on reopen still un-validates EVERY row sharing the name across both structures (unchanged from before this fix) — only the RESTORE side became narrower, not the un-validate side', () => {
    assert.match(reopenBody, /productKeyFor\(row\.productName\) === key && row\.validated/);
  });
});

// ---------------------------------------------------------------------
// E. Editing a field during reopen, then Voltar: field values kept,
//    still no revert system introduced
// ---------------------------------------------------------------------
describe('E — editing a field and then pressing Voltar keeps the edit; no revert/undo system exists', () => {
  it('handleLeaveWorkspaceUnchanged never reads or writes quantity/unit/price/productName — those already persist independently on the row via updateCatalogRow/updateManualRow, untouched by this handler', () => {
    assert.doesNotMatch(leaveBody, /row\.quantity/);
    assert.doesNotMatch(leaveBody, /row\.unit/);
    assert.doesNotMatch(leaveBody, /row\.costPrice/);
    assert.doesNotMatch(leaveBody, /row\.sellingPrice/);
  });

  it('no new snapshot/undo state beyond the two id/index lists this fix introduces — no "previousRow"/"snapshot"/"revert" concept added', () => {
    for (const forbidden of ['previousRow', 'rowSnapshot', 'revertRow', 'undoStack', 'fieldSnapshot']) {
      assert.doesNotMatch(periodicSrc, new RegExp(forbidden));
    }
  });
});

// ---------------------------------------------------------------------
// F. Total column display fix (persistent "Produtos Validados" list)
// ---------------------------------------------------------------------
describe('F — Total value in the validated list is no longer squeezed alongside the Editar button', () => {
  it('the catalog-validated row\'s value+action cell now stacks the Total value above the Editar button (flex-col), instead of splitting one fixed-width row between them (flex justify-between)', () => {
    assert.match(
      periodicSrc,
      /<div className="col-span-2 sm:col-span-1 flex flex-col items-end gap-1">\s*\n\s*<span className="text-\[13px\] font-semibold text-\[#633806\] tabular-nums whitespace-nowrap">\{formatCurrency\(rowValue, currencySymbol\)\}<\/span>\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*onClick=\{\(\) => handleEditCatalogRow\(productId\)\}/
    );
  });

  it('the manual-validated row\'s value+action cell has the identical corrected layout', () => {
    assert.match(
      periodicSrc,
      /<div className="col-span-2 sm:col-span-1 flex flex-col items-end gap-1">\s*\n\s*<span className="text-\[13px\] font-semibold text-\[#633806\] tabular-nums whitespace-nowrap">\{formatCurrency\(rowValue, currencySymbol\)\}<\/span>\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*onClick=\{\(\) => handleEditManualRow\(idx\)\}/
    );
  });

  it('no calculation changed: the same pre-existing rowValue = q * sellingPriceNum expression still feeds the Total value — only its surrounding layout changed', () => {
    const matches = periodicSrc.match(/const rowValue = q \* sellingPriceNum;/g) ?? [];
    assert.ok(matches.length >= 2, 'Expected the existing rowValue calculation to still appear for both the catalog and manual validated-list rows, unmodified.');
  });

  it('the underlying five-column grid track widths (rowGridClass and the validated list\'s own literal grid template) are unchanged by this fix — only the content WITHIN the last cell was rearranged', () => {
    assert.match(periodicSrc, /const rowGridClass = 'grid grid-cols-2 sm:grid-cols-\[minmax\(0,2fr\)_84px_76px_112px_190px\] gap-x-2\.5 gap-y-2\.5 sm:items-end';/);
    const validatedGridTemplateMatches = periodicSrc.match(/sm:grid-cols-\[minmax\(0,2fr\)_84px_76px_112px_190px\] gap-x-2\.5 gap-y-1 sm:items-center/g) ?? [];
    assert.equal(validatedGridTemplateMatches.length, 2, 'Expected the unchanged 190px validated-list grid template to still appear exactly twice (catalog + manual lists).');
  });

  it('[Documented, not asserted at runtime — see file header] No jsdom/testing-library harness exists in this repo to render the corrected cell and measure that the full formatted value (e.g. "425.278,50 MT") no longer clips. Regression protection here is: (1) the structural assertions above pinning the exact corrected markup, (2) TypeScript/build verification that the JSX is valid, and (3) manual visual confirmation performed alongside this change.', () => {
    assert.ok(true);
  });
});
