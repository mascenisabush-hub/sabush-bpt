import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf8');

describe('uncounted catalogue products never block finalization', () => {
  it('isNotPartOfThisCount exempts only blank, unvalidated, non-removed catalogue rows without a CONFLICT', () => {
    const m = source.match(/const isNotPartOfThisCount = [\s\S]*?\n  \};/);
    assert.ok(m);
    const body = m![0];
    assert.match(body, /startsWith\('catalog:'\)/);
    assert.match(body, /row\.removed \|\| row\.validated/);
    assert.match(body, /row\.quantity\.trim\(\) !== ''/);
    assert.match(body, /state !== 'CONFLICT'/);
  });

  it('all three unsafe-row gates use blocksFinalization', () => {
    assert.equal((source.match(/\.filter\(\(conflictKey\) => blocksFinalization\(conflictKey\)\)/g) ?? []).length, 3);
    assert.equal((source.match(/\.filter\(\(conflictKey\) => !isRowSafeToProgress\(conflictKey\)\)/g) ?? []).length, 0);
  });

  it('the review screen still lists uncounted products', () => {
    assert.match(source, /Produtos Não Contados/);
  });
});
