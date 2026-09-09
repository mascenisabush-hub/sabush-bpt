// Product Catalog Phase 2 — Checkpoint 4 (Add Stock Correction —
// Canonical Product Information). Governing chain: accepted Phase 2
// Specification (§7, §9, §10, §11), accepted Rule 8 Assessment,
// accepted Implementation Plan (§I, §K, §L, §M), accepted Implementation
// Authorization (§4 item 4), Fifth Implementation Plan Amendment
// (commit `2a30b11`), Fifth Implementation Authorization Amendment
// (commit `e7a36ea`) — Family 2 architecture (reuse existing write
// functions), explicitly excluding any `AppContext.tsx` change.
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent (see
// tests/product-catalog-phase-2-checkpoint-2-unit-relationship-reconfiguration.test.ts's
// own header, and tests/product-catalog-phase-1-checkpoint-b.test.ts's
// before it). This suite follows the same source-inspection technique:
// structural/regex assertions against the actual
// AddStockView.tsx source, confirming the real implementation exists
// and behaves as Checkpoint 4 requires — never a claim of DOM-level
// behavior this repository cannot exercise.
//
// AUTHORIZED SCOPE (Fifth Implementation Authorization Amendment,
// `e7a36ea`): this file only. No other test file is modified here.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-product-correction.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

// Extracts a balanced-brace block starting at the first `{` found at or
// after `startMarker` — used to isolate the correction modal component
// body (and its inner functions) from the rest of this large file, so
// assertions never accidentally match unrelated code elsewhere.
function extractBlock(source: string, startMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert.notEqual(startIdx, -1, `Could not locate "${startMarker}" in source.`);
  const braceStart = source.indexOf('{', startIdx);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  assert.ok(i < source.length, `Could not find a balanced closing brace for "${startMarker}".`);
  return source.slice(startIdx, i + 1);
}

// The correction modal component's full body — everything from its
// declaration through its own closing `};`, immediately before
// `export const AddStockView`.
const modalSrc = (() => {
  const startIdx = addStockSrc.indexOf('const AddStockProductCorrectionModal: React.FC<{');
  assert.notEqual(startIdx, -1, 'AddStockProductCorrectionModal component must exist in AddStockView.tsx.');
  const endMarker = 'export const AddStockView: React.FC<AddStockViewProps>';
  const endIdx = addStockSrc.indexOf(endMarker, startIdx);
  assert.notEqual(endIdx, -1, 'Could not find the end of the correction modal component.');
  return addStockSrc.slice(startIdx, endIdx);
})();

const performSaveSrc = extractBlock(modalSrc, 'const performSave = async (finalName: string) => ');
const handleSubmitSrc = extractBlock(modalSrc, 'const handleSubmit = (e: React.FormEvent) => ');

describe('A — Name confirmation is a distinct, explicit owner action (Specification §9; Plan §K)', () => {
  it('handleSubmit does not call performSave when the name has changed — it sets pendingRename and returns instead', () => {
    const changedNameBranchIdx = handleSubmitSrc.indexOf("if (trimmedName !== product.name) {");
    assert.notEqual(changedNameBranchIdx, -1);
    const branchEndIdx = handleSubmitSrc.indexOf('performSave(trimmedName);', changedNameBranchIdx);
    // performSave(trimmedName) is the UNCHANGED-name fallthrough call —
    // it must appear strictly after the changed-name branch's own
    // setPendingRename/return, never inside that branch itself.
    const branchBody = handleSubmitSrc.slice(changedNameBranchIdx, branchEndIdx === -1 ? undefined : branchEndIdx);
    assert.doesNotMatch(branchBody.split('return;')[0] + branchBody.split('return;')[1] ?? '', /performSave\(/);
    assert.match(handleSubmitSrc, /setPendingRename\(\{ oldName: product\.name, newName: trimmedName \}\);\s*\n\s*return;/);
  });

  it('no Product write function (updateProduct/confirmProductUnitRelationship) is called anywhere inside handleSubmit itself — every write lives only in performSave', () => {
    assert.equal(handleSubmitSrc.includes('updateProduct('), false);
    assert.equal(handleSubmitSrc.includes('confirmProductUnitRelationship('), false);
  });

  it('the pendingRename confirmation step communicates both the old and the new name, using the authorized localized keys', () => {
    assert.match(modalSrc, /t\('addStock\.correction\.nameChangeConfirmTitle'\)/);
    assert.match(
      modalSrc,
      /t\('addStock\.correction\.nameChangeConfirmBody', \{ old: pendingRename\.oldName, new: pendingRename\.newName \}\)/
    );
  });

  it('confirming the rename calls performSave with the pending new name, and clears pendingRename first (never leaves a stale confirmation state)', () => {
    const confirmClickIdx = modalSrc.indexOf('const confirmedName = pendingRename.newName;');
    assert.notEqual(confirmClickIdx, -1);
    const nearby = modalSrc.slice(confirmClickIdx, confirmClickIdx + 200);
    assert.match(nearby, /setPendingRename\(null\);\s*\n\s*performSave\(confirmedName\);/);
  });

  it('cancelling the rename confirmation clears pendingRename without calling performSave — the canonical name is left untouched', () => {
    assert.match(modalSrc, /onClick=\{\(\) => setPendingRename\(null\)\}/);
  });

  it('this mechanism is structurally distinct from identityConfirmedNew — the correction modal never references it in executable code (checked outside comments)', () => {
    const codeOnly = modalSrc
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    assert.equal(codeOnly.includes('identityConfirmedNew'), false);
  });
});

describe('B — sellingPrice/sellingUnit invariant (Specification §10; Plan §L)', () => {
  it('the pairing refusal runs before either write, using the authorized sellingUnitRequiredError key', () => {
    const guardIdx = performSaveSrc.indexOf("if (trimmedSellingPrice !== '' && !effectiveSellingUnit) {");
    assert.notEqual(guardIdx, -1);
    const relWriteIdx = performSaveSrc.indexOf('await confirmProductUnitRelationship(');
    const productWriteIdx = performSaveSrc.indexOf('await updateProduct(');
    assert.ok(guardIdx < relWriteIdx && guardIdx < productWriteIdx, 'The pairing guard must run before either write.');
    assert.match(
      performSaveSrc,
      /setError\(t\('addStock\.correction\.sellingUnitRequiredError'\)\);\s*\n\s*return;/
    );
  });

  it('effectiveSellingUnit is computed from the actual candidate/current state — never assumed valid without a membership check', () => {
    assert.match(
      performSaveSrc,
      /candidateUnits\.some\(\(u\) => u\.unit\.trim\(\)\.toLowerCase\(\) === sellingUnit\.trim\(\)\.toLowerCase\(\)\)/
    );
    assert.match(performSaveSrc, /isValidUnitRelationship\(product\.unitRelationship\)/);
  });

  it('when a relationship correction is required, the relationship write happens strictly before the remaining Product update', () => {
    const relWriteIdx = performSaveSrc.indexOf('await confirmProductUnitRelationship(');
    const productWriteIdx = performSaveSrc.indexOf('await updateProduct(');
    assert.notEqual(relWriteIdx, -1);
    assert.notEqual(productWriteIdx, -1);
    assert.ok(relWriteIdx < productWriteIdx, 'confirmProductUnitRelationship must be called before updateProduct.');
    assert.match(performSaveSrc, /if \(willWriteRelationship\) \{\s*\n\s*await confirmProductUnitRelationship\(/);
  });

  it('sellingPrice is never written ahead of a valid sellingUnit — the relationship write is unconditionally awaited before the updateProduct call runs', () => {
    // Structural guarantee: updateProduct (which carries sellingPrice)
    // is a single top-level `await` statement positioned after the
    // `if (willWriteRelationship) { await confirmProductUnitRelationship(...); }`
    // block, within the same try block — a throw from the relationship
    // write skips straight to catch, so updateProduct never runs.
    const tryIdx = performSaveSrc.indexOf('try {');
    const catchIdx = performSaveSrc.indexOf('} catch (err) {');
    assert.notEqual(tryIdx, -1);
    assert.notEqual(catchIdx, -1);
    const tryBody = performSaveSrc.slice(tryIdx, catchIdx);
    const relIdx = tryBody.indexOf('await confirmProductUnitRelationship(');
    const prodIdx = tryBody.indexOf('await updateProduct(');
    assert.ok(relIdx < prodIdx);
  });

  it('sellingUnit-only correction (sellingPrice field left blank) does not spuriously set a sellingPrice — the updateProduct payload always derives sellingPrice from the sellingPrice field alone', () => {
    assert.match(
      performSaveSrc,
      /await updateProduct\(product\.id, \{\s*\n\s*name: finalName,\s*\n\s*sellingPrice: trimmedSellingPrice \? parseFloat\(trimmedSellingPrice\) : undefined,\s*\n\s*\}\);/
    );
  });

  it('a valid existing sellingUnit (relationship unchanged) plus a sellingPrice correction is permitted — effectiveSellingUnit falls back to the product\'s own already-confirmed sellingUnit when the relationship is not being written', () => {
    assert.match(
      performSaveSrc,
      /: isValidUnitRelationship\(product\.unitRelationship\)\s*\n\s*\? product\.unitRelationship\?\.sellingUnit\s*\n\s*: undefined;/
    );
  });
});

describe('C — UnitRelationship governance is reused, never duplicated (Plan §G, §M; Decision 1)', () => {
  it('confirmProductUnitRelationship and updateProduct are both imported from useApp() — no new AppContext write function is referenced', () => {
    assert.match(modalSrc, /const \{ updateProduct, confirmProductUnitRelationship \} = useApp\(\);/);
    assert.equal(addStockSrc.includes('correctProductFromAddStock'), false);
  });

  it('willWriteRelationship reuses the module-level unitRelationshipCandidateEqualsCurrent helper — the identical decision EditProductModal.tsx already established for Checkpoint 2, not a re-derived rule', () => {
    assert.match(
      performSaveSrc,
      /const relationshipChanged = !unitRelationshipCandidateEqualsCurrent\(product\.unitRelationship, candidateUnits, sellingUnit\);/
    );
    assert.match(performSaveSrc, /const willWriteRelationship = relationshipChanged && candidateUnits\.length > 0;/);
  });

  it('clearing every unit row never triggers a relationship write — the existing confirmed relationship is left exactly as it was, never silently discarded', () => {
    // willWriteRelationship requires candidateUnits.length > 0 (asserted
    // above) — an emptied form structurally cannot reach the
    // confirmProductUnitRelationship call.
    assert.match(performSaveSrc, /candidateUnits\.length > 0/);
  });

  it('the relationship write payload is built from the candidate units/sellingUnit only — never restructures confirmedAt or bypasses confirmProductUnitRelationship\'s own validation', () => {
    assert.match(
      performSaveSrc,
      /await confirmProductUnitRelationship\(product\.id, \{\s*\n\s*units: candidateUnits,\s*\n\s*\.\.\.\(sellingUnit\.trim\(\) \? \{ sellingUnit: sellingUnit\.trim\(\) \} : \{\}\),\s*\n\s*\} as UnitRelationshipProposal\);/
    );
  });
});

describe('D — Authorization denial follows the existing Add Stock pattern, never a false-success state (Plan §6, §I)', () => {
  it('a thrown error from either write is caught and surfaced via the authorized saveError key when no more specific message exists', () => {
    assert.match(
      performSaveSrc,
      /\} catch \(err\) \{\s*\n[\s\S]*?setError\(err instanceof Error \? err\.message : t\('addStock\.correction\.saveError'\)\);\s*\n\s*\} finally \{\s*\n\s*setIsSaving\(false\);\s*\n\s*\}/
    );
  });

  it('onClose() — the only success signal this modal gives — is called strictly inside the try block, before the catch; a denied/failed write can never reach it', () => {
    const tryIdx = performSaveSrc.indexOf('try {');
    const catchIdx = performSaveSrc.indexOf('} catch (err) {');
    const onCloseIdx = performSaveSrc.indexOf('onClose();');
    assert.ok(tryIdx !== -1 && catchIdx !== -1 && onCloseIdx !== -1);
    assert.ok(onCloseIdx > tryIdx && onCloseIdx < catchIdx, 'onClose() must be reached only on the successful try-block path.');
    // And it must never also appear inside the catch block itself.
    const catchBody = performSaveSrc.slice(catchIdx);
    assert.equal(catchBody.includes('onClose();'), false);
  });

  it('isSaving is always reset in a finally block — a denied write never leaves the UI stuck in a saving state', () => {
    assert.match(performSaveSrc, /\} finally \{\s*\n\s*setIsSaving\(false\);\s*\n\s*\}/);
  });
});

describe('E — Excluded fields never appear in the correction payload (Specification §7)', () => {
  it('the correction modal never references costPrice, active, supplierWordings, category, supplier, sku, or barcode (checked outside comments)', () => {
    const codeOnly = modalSrc
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    for (const forbidden of ['costPrice', 'active', 'supplierWordings', 'category', 'supplier', 'sku', 'barcode']) {
      assert.equal(codeOnly.includes(forbidden), false, `Forbidden field "${forbidden}" must not appear in the correction modal's executable code.`);
    }
  });

  it('the updateProduct payload contains exactly two fields — name and sellingPrice — nothing else', () => {
    const payloadMatch = performSaveSrc.match(/await updateProduct\(product\.id, \{([\s\S]*?)\}\);/);
    assert.ok(payloadMatch, 'the updateProduct payload must be found');
    const fieldLines = payloadMatch![1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    assert.equal(fieldLines.length, 2, `Expected exactly 2 payload lines, found: ${JSON.stringify(fieldLines)}`);
    assert.match(fieldLines[0], /^name: finalName,$/);
    assert.match(fieldLines[1], /^sellingPrice: trimmedSellingPrice \? parseFloat\(trimmedSellingPrice\) : undefined,$/);
  });
});

describe('F — Canonical correction is structurally separate from Add Stock transaction data', () => {
  it('the correction modal never references the stock transaction row state (rows/updateRow/setRows) — it is a fully self-contained component with its own local state only', () => {
    assert.equal(modalSrc.includes('updateRow('), false);
    assert.equal(modalSrc.includes('setRows('), false);
    assert.match(modalSrc, /const \[name, setName\] = useState\(product\.name\);/);
  });

  it('the modal is mounted once, at the top level of AddStockView\'s own return — never once per stock-entry row', () => {
    assert.match(
      addStockSrc,
      /\{correctionProduct && \(\s*\n\s*<AddStockProductCorrectionModal product=\{correctionProduct\} onClose=\{\(\) => setCorrectionProduct\(null\)\} \/>\s*\n\s*\)\}/
    );
  });

  it('the trigger button only appears for an already-matched, active existing product — never for an unmatched/new-product row', () => {
    assert.match(
      addStockSrc,
      /const matchedProduct = products\.find\(\s*\n\s*p => p\.active !== false && p\.name\.trim\(\)\.toLowerCase\(\) === trimmedName\s*\n\s*\);\s*\n\s*if \(!matchedProduct\) return null;/
    );
  });
});

describe('G — Locale-key authorization: exactly the five authorized addStock.correction.* keys are used, no other', () => {
  it('AddStockView.tsx references exactly these five keys and no others under the addStock.correction.* namespace', () => {
    const used = new Set(
      [...addStockSrc.matchAll(/addStock\.correction\.([a-zA-Z]+)/g)].map((m) => m[1])
    );
    assert.deepEqual(
      [...used].sort(),
      ['editButton', 'nameChangeConfirmBody', 'nameChangeConfirmTitle', 'saveError', 'sellingUnitRequiredError'].sort()
    );
  });
});
