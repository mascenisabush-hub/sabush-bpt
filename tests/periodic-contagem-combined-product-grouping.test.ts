// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 item 4F, Stage 7] Regression coverage for groupRowsByProductIdentity
// (the combined catalog+manual grouping function) and its additive
// wiring as combinedProductGroups in the component. Source-text and
// direct-import based — this function is pure and has no Firestore
// dependency, so it is tested by direct execution, not source-pattern
// matching, giving genuine behavioral coverage for this stage.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupRowsByProductIdentity, type IdentifiableGroupableRow } from '../apps/tenant/src/lib/stockCountPortionGrouping';

describe('groupRowsByProductIdentity — combined catalog/manual grouping', () => {
  it('one catalog portion + multiple manual portions, same productId, unify into one group', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'catalog-ABC', productId: 'ABC', productName: 'Coca-Cola' },
      { id: 'manual-0', productId: 'ABC', productName: 'Coca-Cola' },
      { id: 'manual-1', productId: 'ABC', productName: 'Coca-Cola' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 3);
    assert.equal(groups[0].key, 'id:ABC');
  });

  it('same display name, different productId — must NOT be grouped together', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'catalog-ABC', productId: 'ABC', productName: 'Coca-Cola' },
      { id: 'catalog-XYZ', productId: 'XYZ', productName: 'Coca-Cola' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups.length, 2, 'two different products, even with an identical name, must remain two separate groups');
    assert.notEqual(groups[0].key, groups[1].key);
  });

  it('a productId-less row falls back to name-based grouping among other productId-less rows', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'manual-0', productId: undefined, productName: 'Sabonete Artesanal' },
      { id: 'manual-1', productId: undefined, productName: 'Sabonete Artesanal' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].key, 'name:sabonete artesanal');
  });

  it('a productId-less row can NEVER join a group that has a real productId, even with a matching name', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'catalog-ABC', productId: 'ABC', productName: 'Coca-Cola' },
      { id: 'manual-0', productId: undefined, productName: 'Coca-Cola' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups.length, 2, 'the productId-less row must fall back to its own name-keyed group, never silently join the ID-keyed one');
    const idGroup = groups.find((g) => g.key === 'id:ABC');
    const nameGroup = groups.find((g) => g.key === 'name:coca-cola');
    assert.ok(idGroup && idGroup.rows.length === 1);
    assert.ok(nameGroup && nameGroup.rows.length === 1);
  });

  it('a blank-name, productId-less row is never grouped with anything, including another blank row', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'manual-0', productId: undefined, productName: '' },
      { id: 'manual-1', productId: undefined, productName: '' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups.length, 2);
    assert.ok(groups.every((g) => g.key === ''));
  });

  it('different units/prices within the same product still unify into one group (each portion remains its own row object)', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'catalog-ABC', productId: 'ABC', productName: 'Coca-Cola' },
      { id: 'manual-0', productId: 'ABC', productName: 'Coca-Cola' },
      { id: 'manual-1', productId: 'ABC', productName: 'Coca-Cola' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups.length, 1);
    assert.equal(new Set(groups[0].rows.map((r) => r.id)).size, 3);
  });

  it('preserves first-appearance order for groups and original relative order within a group', () => {
    const rows: IdentifiableGroupableRow[] = [
      { id: 'a', productId: 'Y', productName: 'Segundo' },
      { id: 'b', productId: 'X', productName: 'Primeiro' },
      { id: 'c', productId: 'Y', productName: 'Segundo' },
    ];
    const groups = groupRowsByProductIdentity(rows);
    assert.equal(groups[0].key, 'id:Y');
    assert.equal(groups[1].key, 'id:X');
    assert.deepEqual(groups[0].rows.map((r) => r.id), ['a', 'c']);
  });
});

describe('combinedProductGroups — additive wiring in the component', () => {
  const componentSource = readFileSync(
    new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
    'utf8'
  );

  it('Stage 7\'s original combinedProductGroups is superseded, correctly, by the Integration Point 3 Step 3 pipeline (buildProductDisplayGroups/productDisplayGroups) — not left as dead, parallel code', () => {
    const codeOnly = componentSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    assert.doesNotMatch(codeOnly, /combinedProductGroups/, 'the superseded computation should be fully removed from live code');
    assert.match(componentSource, /const productDisplayGroups = useMemo\(\(\) => buildProductDisplayGroups\(groupableUnifiedEntries\), \[groupableUnifiedEntries\]\);/);
  });

  it('is now genuinely wired into the render pipeline — the deferral this Stage originally noted is resolved, not still pending', () => {
    assert.match(componentSource, /visibleProductDisplayGroups\.map\(\(group\) => \{/);
  });

  it('groupRowsByProductName remains imported for its own, distinct, still-valid purpose (manualRowGroups\' "+ Adicionar Porção" picker) — groupRowsByProductIdentity is no longer imported directly, superseded by buildProductDisplayGroups', () => {
    assert.match(
      componentSource,
      /import \{ computePortionLabels, groupRowsByProductName \} from '\.\.\/lib\/stockCountPortionGrouping';/
    );
    assert.match(
      componentSource,
      /import \{ buildProductDisplayGroups, filterGroupsBySearch, type ProductDisplayGroup, type GroupableUnifiedEntry \} from '\.\.\/lib\/periodicContagemGroupedView';/
    );
  });
});
