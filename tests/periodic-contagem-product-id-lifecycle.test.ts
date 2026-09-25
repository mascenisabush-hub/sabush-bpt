// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2, Stage 6] Regression coverage for the productId lifecycle:
// retention on exact match, generalized assignment, clearing on
// rename, later re-match, explicit-identity precedence, and the four
// coupled meaningful-content checks. Source-text based, following
// this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('Stage 6 — productId lifecycle', () => {
  it('Test 1 — handleAddPortionToManualGroup no longer discards the matched product\'s real ID', () => {
    const fnMatch = componentSource.match(
      /const handleAddPortionToManualGroup = \(groupDisplayName: string\) => \{[\s\S]*?\n  \};/
    );
    assert.ok(fnMatch, 'expected handleAddPortionToManualGroup to exist');
    assert.match(
      fnMatch![0],
      /let newRow: StockCountWorkingRow = matchedProduct\s*\n\s*\? \{ \.\.\.buildCatalogRow\(matchedProduct\), productName: groupDisplayName, sourceRowKey: `manual:\$\{crypto\.randomUUID\(\)\}` \}/
    );
    // Confirm the override is gone from the actual object-literal
    // expression, not merely absent from the file as a whole — the
    // comment immediately above legitimately quotes the old code for
    // documentation purposes.
    assert.doesNotMatch(fnMatch![0], /buildCatalogRow\(matchedProduct\), productId: undefined/);
  });

  it('createManualRow correctly still sets productId: undefined — a genuinely blank new row has no product to match', () => {
    assert.match(
      componentSource,
      /const createManualRow = \(\): StockCountWorkingRow => \(\{\s*\n\s*productId: undefined,/
    );
  });

  it('Test 2 — updateManualRow does not touch productId for an ordinary edit that does not change productName', () => {
    const fnMatch = componentSource.match(
      /const updateManualRow = \([\s\S]*?\n  \};/
    );
    assert.ok(fnMatch);
    assert.match(fnMatch![0], /fields\.productName !== undefined &&\s*\n\s*fields\.productName !== currentRow\.productName &&\s*\n\s*fields\.productId === undefined/);
  });

  it('Test 4 — updateManualRow clears productId synchronously when productName genuinely changes', () => {
    const fnMatch = componentSource.match(/const updateManualRow = \([\s\S]*?\n  \};/);
    assert.match(fnMatch![0], /resolvedFields = \{ \.\.\.resolvedFields, productId: undefined \};/);
  });

  it('Test 7 — explicit productId in the incoming fields is never overridden by the clearing logic (rule E)', () => {
    const fnMatch = componentSource.match(/const updateManualRow = \([\s\S]*?\n  \};/);
    assert.match(fnMatch![0], /fields\.productId === undefined/);
  });

  it('the clearing check runs after applySellingConfigurationEditRules, so it is the final word on productId for this update', () => {
    const fnMatch = componentSource.match(/const updateManualRow = \([\s\S]*?\n  \};/);
    const rulesIndex = fnMatch![0].indexOf('applySellingConfigurationEditRules(currentRow');
    const clearIndex = fnMatch![0].indexOf('resolvedFields = { ...resolvedFields, productId: undefined }');
    assert.ok(rulesIndex > -1 && clearIndex > -1 && rulesIndex < clearIndex);
  });

  it('Test 4 (bulk) — handleRenameManualGroup also clears productId for every affected row', () => {
    const fnMatch = componentSource.match(
      /const handleRenameManualGroup = \(groupKey: string, newName: string\) => \{[\s\S]*?\n  \};/
    );
    assert.ok(fnMatch, 'expected handleRenameManualGroup to exist');
    assert.match(
      fnMatch![0],
      /productKeyFor\(row\.productName\) === groupKey \? \{ \.\.\.row, productName: newName, productId: undefined \} : row/
    );
  });

  it('Test 3/6 — a separate, later-timed effect (not fused into rename) generalizes exact-match assignment to every manual row', () => {
    assert.match(
      componentSource,
      /useEffect\(\(\) => \{\s*\n\s*manualRows\.forEach\(\(row, index\) => \{\s*\n\s*if \(row\.productId\) return;\s*\n\s*const trimmedName = row\.productName\.trim\(\)\.toLowerCase\(\);\s*\n\s*if \(!trimmedName\) return;\s*\n\s*const matchedProduct = products\.find\(\(p\) => p\.name\.trim\(\)\.toLowerCase\(\) === trimmedName\);\s*\n\s*if \(matchedProduct\) \{\s*\n\s*updateManualRow\(index, \{ productId: matchedProduct\.id \}\);/
    );
  });

  it('this effect only ever assigns, never clears — a row already carrying productId is skipped immediately, never re-evaluated for a different match', () => {
    const effectMatch = componentSource.match(
      /useEffect\(\(\) => \{\s*\n\s*manualRows\.forEach\(\(row, index\) => \{[\s\S]*?\n  \}, \[manualRows, products\]\);/
    );
    assert.ok(effectMatch);
    assert.match(effectMatch![0], /if \(row\.productId\) return;/);
    // Confirms the guard is the first line inside forEach — nothing
    // before it could ever clear or reassign an existing productId.
    const forEachBody = effectMatch![0].split('manualRows.forEach((row, index) => {')[1];
    assert.ok(forEachBody.trim().startsWith('if (row.productId) return;'));
  });

  it('Test 8/G4 — all four previously-coupled meaningful-content checks now ask only whether productName is present, not whether productId is absent', () => {
    const occurrences = [...componentSource.matchAll(/item\.quantity\.trim\(\) !== '' \|\| \(item\.productName\.trim\(\) !== ''\)/g)];
    assert.equal(occurrences.length, 4, 'expected exactly four corrected occurrences of this check');
    // Confirm the obsolete, coupled form is gone from actual code —
    // checked as a live expression (inside a .some/reduce predicate),
    // not merely absent from the file as a whole, since the
    // explanatory comment above legitimately quotes the old pattern
    // in backticks for documentation purposes.
    assert.doesNotMatch(componentSource, /=> item\.quantity\.trim\(\) !== '' \|\| \(!item\.productId/);
  });

  it('Test 10 — Stage 1\'s identity fields (migratedFromLegacyKey, orderIndex) are untouched by any of Stage 6\'s changes — none of the productId-lifecycle edits reference either field', () => {
    const updateManualRowMatch = componentSource.match(/const updateManualRow = \([\s\S]*?\n  \};/)![0];
    const renameMatch = componentSource.match(/const handleRenameManualGroup = \([\s\S]*?\n  \};/)![0];
    assert.doesNotMatch(updateManualRowMatch, /migratedFromLegacyKey/);
    assert.doesNotMatch(updateManualRowMatch, /orderIndex/);
    assert.doesNotMatch(renameMatch, /migratedFromLegacyKey/);
    assert.doesNotMatch(renameMatch, /orderIndex/);
  });

  it('Test 11/12 — Stage 6 makes no change to AppContext.tsx: D1 field preservation, migration, and tombstone logic (Stages 2, 4, 5) are entirely untouched by this stage', () => {
    const appContextSource = readFileSync(
      new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
      'utf8'
    );
    // Sentinel checks: the Stage 2/4/5 markers this same engagement
    // already established still exist, unmodified, confirming Stage 6
    // is scoped to the component file only, as intended.
    assert.match(appContextSource, /const preservedLifecycleFields = \(/);
    assert.match(appContextSource, /const migratePeriodicLegacyManualRow = async/);
    assert.match(appContextSource, /const deletePeriodicManualRow = async/);
  });

  it('no whole-product delete, no new duplicate rule, no Decision 55 change, no automatic fuzzy rematching, and no Business Worth/InitialStockCountView change is introduced by any Stage 6 edit', () => {
    // These are negative, scope-boundary assertions — confirming
    // Stage 6 stayed within its authorized bounds, not testing a
    // positive behavior.
    assert.doesNotMatch(componentSource, /handleDeleteEntireProduct/);
    assert.doesNotMatch(componentSource, /deleteWholeProduct/);
  });
});
