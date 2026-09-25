// [Periodic Contagem Expanded Phase 2 — Integration Point 2
// prerequisite] Regression coverage for the genuine, foundational gap
// found while tracing the live deletion path: new manual rows were
// never actually assigned a crypto.randomUUID() at creation, despite
// this being the original architecture's own Stage 1 requirement --
// sourceRowKey was instead stamped to the row's own position-derived
// save-target key on first save, which is not stable identity.
// Source-text based, following this repository's own established
// convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('createManualRow — UUID assigned at creation, not derived from position', () => {
  it('sourceRowKey is set to a manual:{uuid} key immediately, via crypto.randomUUID()', () => {
    assert.match(
      componentSource,
      /const createManualRow = \(\): StockCountWorkingRow => \(\{[\s\S]*?sourceRowKey: `manual:\$\{crypto\.randomUUID\(\)\}`,\s*\n\s*\}\);/
    );
  });
});

describe('handleAddPortionToManualGroup — matched-product branch also assigns a UUID', () => {
  it('the matched branch, which bypasses createManualRow entirely, explicitly sets its own sourceRowKey', () => {
    const fnMatch = componentSource.match(/const handleAddPortionToManualGroup = \(groupDisplayName: string\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(
      fnMatch![0],
      /\? \{ \.\.\.buildCatalogRow\(matchedProduct\), productName: groupDisplayName, sourceRowKey: `manual:\$\{crypto\.randomUUID\(\)\}` \}/
    );
  });
});

describe('updateManualRow / handleRenameManualGroup — save target uses the row\'s own stable key', () => {
  it('updateManualRow\'s scheduleRowDraftSave call now uses sourceRowKey as the actual save target, not just the protection key', () => {
    const fnMatch = componentSource.match(/const updateManualRow = \([\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(
      fnMatch![0],
      /scheduleRowDraftSave\(\s*\n\s*nextManualRows\[index\]\.sourceRowKey \?\? `manual:\$\{index\}`,\s*\n\s*nextManualRows\[index\]\.sourceRowKey \?\? `manual:\$\{index\}`\s*\n\s*\);/
    );
  });

  it('handleRenameManualGroup\'s per-row loop uses the identical fix', () => {
    const fnMatch = componentSource.match(/const handleRenameManualGroup = \([\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(
      fnMatch![0],
      /for \(const index of affectedIndices\) \{\s*\n[\s\S]*?scheduleRowDraftSave\(\s*\n\s*nextManualRows\[index\]\.sourceRowKey \?\? `manual:\$\{index\}`,\s*\n\s*nextManualRows\[index\]\.sourceRowKey \?\? `manual:\$\{index\}`\s*\n\s*\);/
    );
  });
});

describe('scheduleRowDraftSave — recovery-content resolution corrected for non-numeric keys', () => {
  it('resolves manual-row content by matching sourceRowKey against rowKey, not by parsing the suffix as a numeric index', () => {
    const fnMatch = componentSource.match(/const scheduleRowDraftSave = \(rowKey: string, protectionKey: string = rowKey\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    assert.match(
      fnMatch![0],
      /manualRowsRef\.current\.find\(\(row\) => row\.sourceRowKey === rowKey\) \?\?\s*\n\s*manualRowsRef\.current\[Number\(rowKey\.slice\('manual:'\.length\)\)\]/
    );
  });

  it('the positional fallback still exists for a row whose sourceRowKey is genuinely not yet set — never a hard failure', () => {
    const fnMatch = componentSource.match(/const scheduleRowDraftSave = \(rowKey: string, protectionKey: string = rowKey\) => \{[\s\S]*?\n  \};/);
    assert.match(fnMatch![0], /Number\(rowKey\.slice\('manual:'\.length\)\)/);
  });
});
