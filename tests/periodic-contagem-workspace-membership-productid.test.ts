// [Periodic Contagem Expanded Phase 2 — Integration Point 3, Step 1]
// Regression coverage for productId-aware workspace membership,
// closing the central risk the design assessment identified: the
// workspace must never merge two explicitly-identified products
// sharing a display name, and must never silently pull an explicitly-
// identified row into a productId-less fallback workspace.
// Source-text based, following this repository's own established
// convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

const fnMatch = componentSource.match(
  /const computeWorkspaceRowIdentity = \(\s*\n\s*nameKey: string,\s*\n\s*explicitProductId\?: string\s*\n\s*\): \{ catalogIds: string\[\]; manualIndices: number\[\] \} => \{[\s\S]*?\n  \};/
);

describe('computeWorkspaceRowIdentity — productId-aware workspace membership', () => {
  it('exists with the corrected signature, accepting an optional explicitProductId', () => {
    assert.ok(fnMatch, 'expected computeWorkspaceRowIdentity to exist with the new signature');
  });

  it('Scenario A — with an explicit productId, catalog matching is a direct id lookup, never a name comparison', () => {
    assert.match(
      fnMatch![0],
      /catalogIds:\s*\n\s*catalogRows\[explicitProductId\] && !catalogRows\[explicitProductId\]\.removed \? \[explicitProductId\] : \[\],/
    );
  });

  it('Scenario A/B — with an explicit productId, manual matching is by row.productId equality, never by name', () => {
    const explicitBranch = fnMatch![0].slice(fnMatch![0].indexOf('if (explicitProductId)'), fnMatch![0].indexOf('return {\n      catalogIds: [],'));
    assert.match(explicitBranch, /\.filter\(\(\{ row \}\) => !row\.removed && row\.productId === explicitProductId\)/);
    assert.doesNotMatch(explicitBranch, /productKeyFor/);
  });

  it('Scenario C — the fallback (no explicitProductId) branch never includes any catalog row — every catalog row inherently has its own explicit productId', () => {
    const fallbackBranch = fnMatch![0].slice(fnMatch![0].indexOf('return {\n      catalogIds: [],'));
    assert.match(fallbackBranch, /catalogIds: \[\],/);
  });

  it('Scenario C — the fallback branch matches manual rows by name ONLY when they are themselves productId-less — an explicitly-identified row is never pulled in by name alone', () => {
    const fallbackBranch = fnMatch![0].slice(fnMatch![0].indexOf('return {\n      catalogIds: [],'));
    assert.match(
      fallbackBranch,
      /\.filter\(\(\{ row \}\) => !row\.removed && !row\.productId && productKeyFor\(row\.productName\) === nameKey\)/
    );
  });
});

describe('Call sites — explicit productId correctly threaded through from the clicked/reopened row', () => {
  it('handleUnifiedEntryClick derives explicitProductId from the entry itself (catalog id, or the live row\'s own productId for manual)', () => {
    const clickFnMatch = componentSource.match(
      /const handleUnifiedEntryClick = \(entry: \(typeof unifiedListEntries\)\[number\]\) => \{[\s\S]*?\n  \};/
    );
    assert.ok(clickFnMatch);
    assert.match(
      clickFnMatch![0],
      /const explicitProductId =\s*\n\s*entry\.kind === 'catalog'\s*\n\s*\? entry\.catalogProductId \?\? undefined\s*\n\s*: entry\.manualRowIndex !== null\s*\n\s*\? manualRows\[entry\.manualRowIndex\]\?\.productId\s*\n\s*: undefined;/
    );
    assert.match(clickFnMatch![0], /handleSelectExistingProductForWorkspace\(entry\.activationKey, explicitProductId\);/);
  });

  it('handleEditCatalogRow passes its own productId parameter through to reopenExistingProductForEditing', () => {
    const fn = componentSource.match(/const handleEditCatalogRow = \(productId: string\) => \{[\s\S]*?\n  \};/);
    assert.ok(fn);
    assert.match(fn![0], /reopenExistingProductForEditing\(productKeyFor\(row\.productName\), productId\);/);
  });

  it('handleEditManualRow passes the specific row\'s own productId through to reopenExistingProductForEditing', () => {
    const fn = componentSource.match(/const handleEditManualRow = \(index: number\) => \{[\s\S]*?\n  \};/);
    assert.ok(fn);
    assert.match(fn![0], /reopenExistingProductForEditing\(productKeyFor\(row\.productName\), row\.productId\);/);
  });

  it('both handleSelectExistingProductForWorkspace and reopenExistingProductForEditing accept and forward the optional explicitProductId', () => {
    assert.match(
      componentSource,
      /const handleSelectExistingProductForWorkspace = \(key: string, explicitProductId\?: string\) => \{/
    );
    assert.match(
      componentSource,
      /const reopenExistingProductForEditing = \(key: string, explicitProductId\?: string\) => \{/
    );
  });
});

describe('Scenario D — rename already clears productId (Stage 6); workspace membership correctly follows the new, current identity state', () => {
  it('updateManualRow\'s rename-clearing logic (Stage 6) remains intact and unmodified by this Step', () => {
    assert.match(
      componentSource,
      /resolvedFields = \{ \.\.\.resolvedFields, productId: undefined \};/
    );
  });

  it('computeWorkspaceRowIdentity always reads the CURRENT, live productId from manualRows at call time — never a cached/historical value', () => {
    assert.match(fnMatch![0], /manualRows\s*\n\s*\.map\(\(row, index\) => \(\{ row, index \}\)\)/);
    assert.doesNotMatch(componentSource, /const computeWorkspaceRowIdentity = useMemo/);
  });
});

describe('Workspace identity remains stable after activation, per the existing established contract', () => {
  it('activeWorkspaceRowIdentity is set once, from a snapshot, at activation time — never re-derived from a live name afterward', () => {
    assert.match(
      componentSource,
      /setActiveWorkspaceRowIdentity\(computeWorkspaceRowIdentity\(key, explicitProductId\)\);/
    );
    const occurrences = [...componentSource.matchAll(/setActiveWorkspaceRowIdentity\(computeWorkspaceRowIdentity\(/g)];
    assert.equal(occurrences.length, 2, 'expected exactly the two known activation call sites, no new reactive recomputation introduced');
  });
});
