// [Periodic Contagem Expanded Phase 2 — Integration Point 3
// prerequisite fixes] Regression coverage for four real, cascading
// bugs found while tracing unifiedListEntries for the combined
// catalog/manual rendering work: several places still looked up a
// manual row's live Firestore state via manual:${idx} (position-
// derived), which stopped correctly resolving once Integration Point
// 2's prerequisite made sourceRowKey a UUID assigned at creation
// rather than a position-derived stamp. Source-text based, following
// this repository's own established convention.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

describe('unifiedListEntries — sourceRowKey carried through and used for live-state lookups', () => {
  it('manual entries carry their own sourceRowKey explicitly', () => {
    const fnMatch = componentSource.match(/const unifiedListEntries = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[/);
    assert.ok(fnMatch);
    assert.match(fnMatch![0], /sourceRowKey: row\.sourceRowKey as string \| undefined,/);
  });

  it('catalog entries also declare sourceRowKey (as undefined) for type consistency in the unified array', () => {
    const fnMatch = componentSource.match(/const unifiedListEntries = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[/);
    assert.match(fnMatch![0], /sourceRowKey: undefined as string \| undefined,/);
  });

  it('firstWriteAt now resolves via row.sourceRowKey, with a positional fallback, not manual:${idx} alone', () => {
    const fnMatch = componentSource.match(/const unifiedListEntries = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[/);
    assert.match(
      fnMatch![0],
      /periodicStockDraftItemsByKey\[row\.sourceRowKey \?\? `manual:\$\{idx\}`\]\?\.firstWriteAt \?\?\s*\n\s*periodicStockDraftItemsByKey\[row\.sourceRowKey \?\? `manual:\$\{idx\}`\]\?\.lastWriteAt,/
    );
  });
});

describe('handleEditManualRow — conflict guard corrected', () => {
  it('looks up the row\'s live state via sourceRowKey, not manual:${index} alone', () => {
    const fnMatch = componentSource.match(/const handleEditManualRow = \(index: number\) => \{[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected handleEditManualRow to exist');
    assert.match(
      fnMatch![0],
      /if \(periodicStockDraftItemsByKey\[row\.sourceRowKey \?\? `manual:\$\{index\}`\]\?\.state === 'CONFLICT'\) \{/
    );
  });
});

describe('Unified-list conflict-key lookups — all three sites corrected', () => {
  it('every occurrence of the catalog/manual key-selection ternary now prefers entry.sourceRowKey for the manual branch', () => {
    const occurrences = [...componentSource.matchAll(
      /entry\.kind === 'catalog' \? `catalog:\$\{entry\.catalogProductId\}` : entry\.sourceRowKey \?\? `manual:\$\{entry\.manualRowIndex\}`/g
    )];
    assert.equal(occurrences.length, 3, 'expected exactly three corrected occurrences: findNextUnvalidatedEntry, hasOnlyConflictedUnvalidatedEntries, and the render loop\'s own conflict check');
  });

  it('the obsolete, uncorrected form no longer exists anywhere', () => {
    assert.doesNotMatch(
      componentSource,
      /entry\.kind === 'catalog' \? `catalog:\$\{entry\.catalogProductId\}` : `manual:\$\{entry\.manualRowIndex\}`/
    );
  });
});
