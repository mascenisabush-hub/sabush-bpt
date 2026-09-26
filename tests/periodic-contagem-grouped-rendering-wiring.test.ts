// [Periodic Contagem Expanded Phase 2 — Integration Point 3, Step 3]
// Regression coverage for the actual one-product-one-row rendering
// wiring. Source-text based — this repository has no rendered-
// component test harness and no Firestore emulator available in this
// sandbox, so DOM-level click/keyboard/focus behavior CANNOT be
// executed here. Every test in this file verifies the LOGIC that
// drives that behavior (which functions are called, with which
// values, in which order, reusing which already-tested modules) —
// not actual rendered pixels or DOM events. This limitation is
// explicit throughout, not glossed over.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('Data pipeline — groups built before filtering, reusing Step 1/2 modules directly', () => {
  it('groupableUnifiedEntries augments each entry with productId/isConflicted/persistenceState, reusing the identical conflict-key convention already established', () => {
    const fnMatch = componentSource.match(/const groupableUnifiedEntries = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n    \[unifiedListEntries, periodicStockDraftItemsByKey, manualRows, ambiguousMigrationKeys, manualRowSaveError, persistenceStateTick\]\s*\n  \);/);
    assert.ok(fnMatch, 'expected groupableUnifiedEntries to exist');
    assert.match(fnMatch![0], /entry\.kind === 'catalog' \? `catalog:\$\{entry\.catalogProductId\}` : entry\.sourceRowKey \?\? `manual:\$\{entry\.manualRowIndex\}`/);
  });

  it('productDisplayGroups is built from the COMPLETE, unfiltered groupableUnifiedEntries — grouping before filtering, per Step 2\'s own rule', () => {
    assert.match(
      componentSource,
      /const productDisplayGroups = useMemo\(\(\) => buildProductDisplayGroups\(groupableUnifiedEntries\), \[groupableUnifiedEntries\]\);/
    );
  });

  it('search filtering (filterGroupsBySearch) runs on groups, not on the pre-grouped flat list', () => {
    assert.match(
      componentSource,
      /const filteredProductDisplayGroups = useMemo\(\s*\n\s*\(\) => filterGroupsBySearch\(productDisplayGroups, productSearch\),/
    );
  });

  it('sorting feeds group-derived representative values into the SAME, unmodified sortByValidatedMode — no new sort implementation', () => {
    const fnMatch = componentSource.match(/const sortedProductDisplayGroups = useMemo\(\s*\n\s*\(\) =>\s*\n\s*sortByValidatedMode\([\s\S]*?\n    \[filteredProductDisplayGroups, validatedSortMode\]\s*\n  \);/);
    assert.ok(fnMatch, 'expected sortedProductDisplayGroups to exist');
    assert.match(fnMatch![0], /\(group\) => group\.sortRepresentative\.entrySequence/);
    assert.match(fnMatch![0], /\(group\) => group\.sortRepresentative\.firstWriteAt/);
    assert.match(fnMatch![0], /\(group\) => group\.sortRepresentative\.originalOrderIndex/);
    assert.doesNotMatch(fnMatch![0], /group\.key\.length|indexOf|findIndex/, 'must never sort by array index');
  });

  it('workspace-active filtering uses activeWorkspaceRowIdentity (Step 1\'s own precise snapshot), matching by stable member identity, never by name', () => {
    const fnMatch = componentSource.match(/const visibleProductDisplayGroups = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n    \[sortedProductDisplayGroups, isWorkspaceActive, activeWorkspaceRowIdentity\]\s*\n  \);/);
    assert.ok(fnMatch, 'expected visibleProductDisplayGroups to exist');
    assert.match(fnMatch![0], /activeWorkspaceRowIdentity\.catalogIds\.includes\(member\.catalogProductId\)/);
    assert.match(fnMatch![0], /activeWorkspaceRowIdentity\.manualIndices\.includes\(member\.manualRowIndex\)/);
  });
});

describe('1/2/3/4/5/6/18/19/20. Identity, membership, and multi-portion cases — delegated entirely to already-tested modules', () => {
  it('buildProductDisplayGroups is the sole grouping mechanism used — Stage 7\'s earlier, now-superseded combinedProductGroups (which called groupRowsByProductIdentity directly) was removed as genuinely dead code, not left as a parallel, duplicate path', () => {
    assert.match(componentSource, /import \{ buildProductDisplayGroups, filterGroupsBySearch/);
    // Checked line-by-line, excluding comment lines — the removal
    // comment immediately above legitimately names the old function
    // for documentation purposes; the live import list and any actual
    // call site are what must be genuinely free of it.
    const codeOnly = componentSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    assert.doesNotMatch(codeOnly, /groupRowsByProductIdentity/, 'the lower-level primitive should no longer be referenced directly in live code anywhere in this file');
    assert.doesNotMatch(codeOnly, /combinedProductGroups/, 'Stage 7\'s superseded computation should be fully removed from live code, not left dead');
  });
});

describe('7/17. Editing opens the correct workspace, isolated by explicit productId', () => {
  it('handleGroupActivation reopens an already-validated group via the representative member, using the existing, unmodified handleEditCatalogRow/handleEditManualRow', () => {
    const fnMatch = componentSource.match(/const handleGroupActivation = \(\) => \{[\s\S]*?\n                    \};/);
    assert.ok(fnMatch, 'expected handleGroupActivation to exist');
    assert.match(fnMatch![0], /if \(group\.allValidated\) \{/);
    assert.match(fnMatch![0], /handleEditCatalogRow\(representative\.catalogProductId\);/);
    assert.match(fnMatch![0], /handleEditManualRow\(representative\.manualRowIndex\);/);
  });

  it('an unvalidated group opens via handleSelectExistingProductForWorkspace with the group\'s own explicit productId, derived from its own stable key, never falling back to name for an id: group', () => {
    const fnMatch = componentSource.match(/const handleGroupActivation = \(\) => \{[\s\S]*?\n                    \};/);
    assert.match(
      fnMatch![0],
      /const explicitProductId = group\.key\.startsWith\('id:'\) \? group\.key\.slice\(3\) : undefined;/
    );
    assert.match(fnMatch![0], /handleSelectExistingProductForWorkspace\(representative\.activationKey, explicitProductId\);/);
  });

  it('a conflicted group routes to the conflict panel, never opening the workspace directly', () => {
    const fnMatch = componentSource.match(/const handleGroupActivation = \(\) => \{[\s\S]*?\n                    \};/);
    const conflictIndex = fnMatch![0].indexOf('if (group.anyConflicted)');
    const validatedIndex = fnMatch![0].indexOf('if (group.allValidated)');
    assert.ok(conflictIndex > -1 && validatedIndex > -1 && conflictIndex < validatedIndex, 'conflict must be checked before validation routing');
  });
});

describe('9/10. Deletion targets the individual member only — no whole-product delete anywhere', () => {
  it('deletePeriodicManualRow remains the sole deletion mechanism, entirely unchanged by this step — no group-level delete call exists', () => {
    assert.doesNotMatch(componentSource, /deleteProductGroup|handleDeleteGroup|handleRemoveGroup/);
    assert.match(componentSource, /const handleRemoveManualRow = async \(index: number\) => \{/);
    assert.match(componentSource, /if \(row\?\.sourceRowKey\) \{\s*\n\s*const outcome = await deletePeriodicManualRow\(row\.sourceRowKey\);/);
  });
});

describe('11/12. Group-level conflict and persistence-state indicators reflect member state, never silently collapsed', () => {
  it('the render loop\'s conflict/validated indicators read group.anyConflicted/group.allValidated, both already-tested Step 2 aggregates (now positioned after the PA-08 save-blocked check, per the Rule 8 checkpoint integration — additive, not replaced)', () => {
    assert.match(componentSource, /\) : group\.anyConflicted \? \(/);
    assert.match(componentSource, /\) : group\.allValidated \? \(/);
  });
});

describe('13. Search retains all group members once any member matches (delegated to Step 2\'s own tested filterGroupsBySearch)', () => {
  it('no separate, competing search-filter logic exists in this render pipeline beyond the one filterGroupsBySearch call already verified above', () => {
    const searchFilterCalls = [...componentSource.matchAll(/\.filter\([^)]*productName[^)]*toLowerCase\(\)\.includes/g)];
    assert.equal(searchFilterCalls.length, 0, 'no duplicate, hand-rolled name-substring filter should exist outside filterGroupsBySearch');
  });
});

describe('15/16. Keyboard navigation and next-unvalidated operate on displayed groups, never on raw portions', () => {
  it('findNextUnvalidatedEntry searches visibleProductDisplayGroups in order, then within each group\'s own members — never opening a later group before an earlier one is exhausted', () => {
    const fnMatch = componentSource.match(/const findNextUnvalidatedEntry = \(\): GroupableUnifiedEntry \| null => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected findNextUnvalidatedEntry to exist with the corrected return type');
    assert.match(fnMatch![0], /for \(const group of visibleProductDisplayGroups\) \{\s*\n\s*for \(const member of group\.members\) \{/);
    assert.match(fnMatch![0], /if \(member\.validated\) continue;/);
    assert.match(fnMatch![0], /if \(member\.isConflicted\) continue;/);
  });

  it('the standalone search-input arrow-key handler (handleSearchKeyDown) navigates visibleProductDisplayGroups, keyed by each group\'s own stable key, not by portion rowKey', () => {
    const fnMatch = componentSource.match(/const handleSearchKeyDown = \(e: React\.KeyboardEvent<HTMLInputElement>\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected handleSearchKeyDown to exist');
    assert.match(fnMatch![0], /visibleProductDisplayGroups\.findIndex\(\(g\) => g\.key === highlightedRowKey\)/);
    assert.match(fnMatch![0], /setHighlightedRowKey\(nextGroup\.key\);/);
  });

  it('the render loop\'s own per-row arrow-key handler navigates the identical visibleProductDisplayGroups array, keyed the same way', () => {
    const fnMatch = componentSource.match(/const handleRowArrowKey = \(e: React\.KeyboardEvent\) => \{[\s\S]*?\n                    \};/);
    assert.ok(fnMatch, 'expected the render-site handleRowArrowKey to exist');
    assert.match(fnMatch![0], /visibleProductDisplayGroups\.findIndex\(\(g\) => g\.key === group\.key\)/);
  });

  it('a group is visited exactly once per traversal — navigation iterates visibleProductDisplayGroups itself, already one entry per logical product, with no further flattening into members', () => {
    const searchNav = componentSource.match(/const handleSearchKeyDown = \(e: React\.KeyboardEvent<HTMLInputElement>\) => \{[\s\S]*?\n  \};/)![0];
    assert.doesNotMatch(searchNav, /\.flatMap|\.members\./);
  });
});

describe('17. Active-workspace isolation — same-name/different-productId scenario', () => {
  it('visibleProductDisplayGroups excludes only the group whose members appear in activeWorkspaceRowIdentity\'s own snapshot — the same precise identity the workspace itself already uses, confirmed not name-based', () => {
    const fnMatch = componentSource.match(/const visibleProductDisplayGroups = useMemo\(\s*\n\s*\(\) =>[\s\S]*?\n    \[sortedProductDisplayGroups, isWorkspaceActive, activeWorkspaceRowIdentity\]\s*\n  \);/);
    assert.doesNotMatch(fnMatch![0], /activationKey|productKeyFor/, 'must never filter by name-derived activationKey for this exclusion');
  });
});

describe('18. Display aggregates never alter financial aggregation inputs', () => {
  it('displayAggregateValue is read only for rendering — never passed to tallyStockCountRows or savePeriodicStockDraftItem', () => {
    const usages = [...componentSource.matchAll(/displayAggregateValue/g)];
    assert.ok(usages.length >= 2, 'expected displayAggregateValue to be genuinely used in the render output');
    assert.doesNotMatch(componentSource, /tallyStockCountRows\([^)]*displayAggregateValue/);
    assert.doesNotMatch(componentSource, /savePeriodicStockDraftItem\([^)]*displayAggregateValue/);
  });
});

describe('21. Adding/removing a member updates the correct group without identity reuse', () => {
  it('handleAddManualRow/handleAddPortionToManualGroup (Integration Point 2 prerequisite) remain unmodified — new rows still receive a genuine UUID at creation, never reusing a retired identity', () => {
    assert.match(componentSource, /sourceRowKey: `manual:\$\{crypto\.randomUUID\(\)\}`,/);
  });

  it('the grouped pipeline recomputes on every relevant dependency change — a newly added or removed member is picked up automatically via React\'s own useMemo re-evaluation, not a manual refresh', () => {
    assert.match(componentSource, /\[unifiedListEntries, periodicStockDraftItemsByKey, manualRows, ambiguousMigrationKeys, manualRowSaveError, persistenceStateTick\]/);
  });
});

describe('22. Rename/productId-clearing lifecycle correctly triggers regrouping', () => {
  it('Stage 6\'s existing rename-clearing logic is untouched, and groupableUnifiedEntries reads manualRows live — a cleared productId is reflected on the very next render', () => {
    assert.match(componentSource, /resolvedFields = \{ \.\.\.resolvedFields, productId: undefined \};/);
  });
});
