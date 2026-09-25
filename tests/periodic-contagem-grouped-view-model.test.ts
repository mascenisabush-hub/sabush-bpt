// [Periodic Contagem Expanded Phase 2 — Integration Point 3, Step 2]
// Regression coverage for the pure group-level view-model semantics:
// identity, validation, conflict, persistence state, sort
// representative values, search interaction, and workspace-active
// state. Direct-import, genuine behavioral testing — this module is
// pure with no Firestore dependency.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildProductDisplayGroups,
  filterGroupsBySearch,
  isGroupActiveInWorkspace,
  type GroupableUnifiedEntry,
} from '../apps/tenant/src/lib/periodicContagemGroupedView';

function entry(overrides: Partial<GroupableUnifiedEntry> & { id: string; productName: string }): GroupableUnifiedEntry {
  return {
    rowKey: overrides.id,
    kind: 'manual',
    catalogProductId: null,
    manualRowIndex: 0,
    sourceRowKey: `manual:${overrides.id}`,
    quantity: '1',
    unit: 'un',
    sellingPrice: '10',
    validated: false,
    activationKey: overrides.productName.trim().toLowerCase(),
    isConflicted: false,
    persistenceState: 'saved',
    ...overrides,
  };
}

describe('buildProductDisplayGroups — identity', () => {
  it('1. same productId -> one group', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola' }),
      entry({ id: 'b', productId: 'ABC', productName: 'Coca-Cola' }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].memberCount, 2);
  });

  it('2. different productIds + same name -> separate groups', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'A', productName: 'Coca-Cola' }),
      entry({ id: 'b', productId: 'B', productName: 'Coca-Cola' }),
    ]);
    assert.equal(groups.length, 2);
  });

  it('3. product-less same-name rows -> approved fallback grouping', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: undefined, productName: 'Sabonete' }),
      entry({ id: 'b', productId: undefined, productName: 'Sabonete' }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].key, 'name:sabonete');
  });

  it('4. product-less row does not merge into an explicit productId group', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'A', productName: 'Coca-Cola' }),
      entry({ id: 'b', productId: undefined, productName: 'Coca-Cola' }),
    ]);
    assert.equal(groups.length, 2);
  });

  it('5/6. group retains every member\'s sourceRowKey and productId', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola', sourceRowKey: 'manual:uuid-1' }),
      entry({ id: 'b', productId: 'ABC', productName: 'Coca-Cola', sourceRowKey: 'manual:uuid-2' }),
    ]);
    const keys = groups[0].members.map((m) => m.sourceRowKey);
    const ids = groups[0].members.map((m) => m.productId);
    assert.deepEqual(keys.sort(), ['manual:uuid-1', 'manual:uuid-2']);
    assert.deepEqual(ids, ['ABC', 'ABC']);
  });

  it('16. multiple units remain separate members within one group', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola', unit: 'Garrafa' }),
      entry({ id: 'b', productId: 'ABC', productName: 'Coca-Cola', unit: 'Grade' }),
    ]);
    assert.equal(groups[0].memberCount, 2);
    assert.deepEqual(groups[0].members.map((m) => m.unit).sort(), ['Garrafa', 'Grade']);
  });

  it('17. multiple prices remain separate members within one group', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola', sellingPrice: '50' }),
      entry({ id: 'b', productId: 'ABC', productName: 'Coca-Cola', sellingPrice: '300' }),
    ]);
    assert.deepEqual(groups[0].members.map((m) => m.sellingPrice).sort(), ['300', '50']);
  });

  it('18. catalog + manual portions with same productId remain separate underlying members within one group', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'catalog-ABC', kind: 'catalog', catalogProductId: 'ABC', productId: 'ABC', productName: 'Coca-Cola' }),
      entry({ id: 'manual-0', kind: 'manual', productId: 'ABC', productName: 'Coca-Cola' }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].memberCount, 2);
    assert.deepEqual(groups[0].members.map((m) => m.kind).sort(), ['catalog', 'manual']);
  });
});

describe('buildProductDisplayGroups — validation, conflict, persistence', () => {
  it('7/8. any unvalidated member -> group unresolved; all validated -> group validated', () => {
    const allValidated = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', validated: true }),
      entry({ id: 'b', productId: 'ABC', productName: 'X', validated: true }),
    ]);
    assert.equal(allValidated[0].allValidated, true);

    const oneUnvalidated = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', validated: true }),
      entry({ id: 'b', productId: 'ABC', productName: 'X', validated: false }),
    ]);
    assert.equal(oneUnvalidated[0].allValidated, false);
  });

  it('9/10. any conflict -> group conflicted; no conflict -> group clean', () => {
    const clean = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', isConflicted: false }),
    ]);
    assert.equal(clean[0].anyConflicted, false);

    const conflicted = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', isConflicted: false }),
      entry({ id: 'b', productId: 'ABC', productName: 'X', isConflicted: true }),
    ]);
    assert.equal(conflicted[0].anyConflicted, true);
  });

  it('conflict on one member does not contaminate a different product group', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'A', productName: 'X', isConflicted: true }),
      entry({ id: 'b', productId: 'B', productName: 'Y', isConflicted: false }),
    ]);
    const groupA = groups.find((g) => g.key === 'id:A')!;
    const groupB = groups.find((g) => g.key === 'id:B')!;
    assert.equal(groupA.anyConflicted, true);
    assert.equal(groupB.anyConflicted, false);
  });

  it('11. persistence state follows the existing deriveGroupPersistenceState worst-member-wins rule, no new policy', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', persistenceState: 'saved' }),
      entry({ id: 'b', productId: 'ABC', productName: 'X', persistenceState: 'conflict' }),
      entry({ id: 'c', productId: 'ABC', productName: 'X', persistenceState: 'saving' }),
    ]);
    assert.equal(groups[0].persistenceState, 'conflict');
  });
});

describe('buildProductDisplayGroups — sort representative values (never array-index-derived)', () => {
  it('12. sortRepresentative uses the minimum member value per criterion, not array index or position', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', entrySequence: 5, firstWriteAt: '2026-01-02', originalOrderIndex: 9 }),
      entry({ id: 'b', productId: 'ABC', productName: 'X', entrySequence: 2, firstWriteAt: '2026-01-01', originalOrderIndex: 3 }),
    ]);
    assert.equal(groups[0].sortRepresentative.entrySequence, 2);
    assert.equal(groups[0].sortRepresentative.firstWriteAt, '2026-01-01');
    assert.equal(groups[0].sortRepresentative.originalOrderIndex, 3);
  });

  it('a group with no member carrying a value for a criterion is undefined for that criterion, matching sortByValidatedMode\'s own missing-value handling', () => {
    const groups = buildProductDisplayGroups([entry({ id: 'a', productId: 'ABC', productName: 'X' })]);
    assert.equal(groups[0].sortRepresentative.entrySequence, undefined);
    assert.equal(groups[0].sortRepresentative.firstWriteAt, undefined);
    assert.equal(groups[0].sortRepresentative.originalOrderIndex, undefined);
  });
});

describe('buildProductDisplayGroups — presentation-only aggregate', () => {
  it('15. displayAggregateValue sums quantity x sellingPrice across members, for display only', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'X', quantity: '2', sellingPrice: '50' }),
      entry({ id: 'b', productId: 'ABC', productName: 'X', quantity: '3', sellingPrice: '100' }),
    ]);
    assert.equal(groups[0].displayAggregateValue, 2 * 50 + 3 * 100);
  });

  it('this module never imports or calls tallyStockCountRows or any Business Worth calculation function', () => {
    const src = readFileSync(
      new URL('../apps/tenant/src/lib/periodicContagemGroupedView.ts', import.meta.url),
      'utf8'
    );
    // Checked line-by-line, excluding comment lines entirely — the
    // header comment legitimately explains this module's own
    // non-interaction with tallyStockCountRows/Business Worth, which
    // naturally mentions both names for documentation purposes.
    const codeLines = src.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));
    const codeOnly = codeLines.join('\n');
    assert.doesNotMatch(codeOnly, /tallyStockCountRows/);
    assert.doesNotMatch(codeOnly, /businessWorth/i);
  });
});

describe('filterGroupsBySearch — group visibility and member retention', () => {
  it('14. a group is visible if ANY member matches, and retains ALL members, not only the matching one', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola Garrafa' }),
      entry({ id: 'b', productId: 'ABC', productName: 'Coca Cola Grade' }),
    ]);
    const filtered = filterGroupsBySearch(groups, 'grade');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].memberCount, 2, 'the non-matching member must still be retained once the group matches');
  });

  it('a non-matching group is excluded entirely', () => {
    const groups = buildProductDisplayGroups([entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola' })]);
    assert.equal(filterGroupsBySearch(groups, 'sabonete').length, 0);
  });

  it('an empty search term returns every group unchanged', () => {
    const groups = buildProductDisplayGroups([entry({ id: 'a', productId: 'ABC', productName: 'Coca-Cola' })]);
    assert.equal(filterGroupsBySearch(groups, '').length, 1);
  });
});

describe('isGroupActiveInWorkspace — Step 1-corrected identity contract', () => {
  it('13a. active product A vs inactive product B — only A is active', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'a', productId: 'A', productName: 'Coca-Cola' }),
      entry({ id: 'b', productId: 'B', productName: 'Coca-Cola' }),
    ]);
    const groupA = groups.find((g) => g.key === 'id:A')!;
    const groupB = groups.find((g) => g.key === 'id:B')!;
    const active = { explicitProductId: 'A', nameKey: 'coca-cola' };
    assert.equal(isGroupActiveInWorkspace(groupA, active), true);
    assert.equal(isGroupActiveInWorkspace(groupB, active), false, 'must never fall back to name matching for an explicitly identified product');
  });

  it('13b. product-less fallback group is active only under a product-less active workspace with a matching name key', () => {
    const groups = buildProductDisplayGroups([entry({ id: 'a', productId: undefined, productName: 'Sabonete' })]);
    assert.equal(isGroupActiveInWorkspace(groups[0], { nameKey: 'sabonete' }), true);
    assert.equal(isGroupActiveInWorkspace(groups[0], { explicitProductId: 'A', nameKey: 'sabonete' }), false);
  });

  it('13c/13d. catalog + manual same-product group is active as one unit under its shared productId', () => {
    const groups = buildProductDisplayGroups([
      entry({ id: 'catalog-A', kind: 'catalog', catalogProductId: 'A', productId: 'A', productName: 'Coca-Cola' }),
      entry({ id: 'manual-0', kind: 'manual', productId: 'A', productName: 'Coca-Cola' }),
    ]);
    assert.equal(isGroupActiveInWorkspace(groups[0], { explicitProductId: 'A', nameKey: 'coca-cola' }), true);
  });

  it('no active workspace -> no group is active', () => {
    const groups = buildProductDisplayGroups([entry({ id: 'a', productId: 'A', productName: 'X' })]);
    assert.equal(isGroupActiveInWorkspace(groups[0], null), false);
  });
});
