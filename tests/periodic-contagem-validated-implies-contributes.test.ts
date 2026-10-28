// [Validated ⇒ contributes — Owner decision, 2026-10-28]
// A product is "validated" only while it can enter the live total. A row
// that cannot is shown as NOT validated ("por validar") with the action
// required. This suite proves:
//   1. getTallyExclusion — the ONE shared rule — returns the right code
//      and action for every way a row can fail to contribute;
//   2. the tally and the rule can never disagree (parity);
//   3. the tally's valuation output is unchanged for rows that qualify;
//   4. the screen derives "effective" validation from that rule and
//      feeds it to the list, the pending panel, the workspace and the
//      confirm tally (source-text checks, like the neighbouring suites).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getTallyExclusion,
  tallyStockCountRows,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship } from '../apps/tenant/src/types';

function row(overrides: Partial<StockCountWorkingRow> = {}): StockCountWorkingRow {
  return {
    productName: 'Cerveja Lite 330ml',
    quantity: '10',
    unit: 'cx',
    costPrice: '100',
    sellingPrice: '150',
    validated: true,
    ...overrides,
  } as StockCountWorkingRow;
}

const cxToUn: UnitRelationship = {
  units: [
    { unit: 'cx', factorFromPrevious: 0 },
    { unit: 'un', factorFromPrevious: 24 },
  ],
  confirmedAt: '2026-10-28T00:00:00.000Z',
} as UnitRelationship;

describe('getTallyExclusion — every way a row can fail to contribute', () => {
  it('a complete row contributes (null)', () => {
    assert.equal(getTallyExclusion(row()), null);
  });

  it('a quantity of 0 contributes — zero is a deliberate count', () => {
    assert.equal(getTallyExclusion(row({ quantity: '0' })), null);
  });

  it('blank name → name', () => {
    const r = getTallyExclusion(row({ productName: '   ' }));
    assert.equal(r?.code, 'name');
    assert.match(r!.message, /nome do produto/);
  });

  it('removed → removed', () => {
    assert.equal(getTallyExclusion(row({ removed: true }))?.code, 'removed');
  });

  it('blank quantity → quantity-blank, with the action', () => {
    const r = getTallyExclusion(row({ quantity: '' }));
    assert.equal(r?.code, 'quantity-blank');
    assert.match(r!.message, /Introduza a quantidade contada/);
  });

  it('non-numeric or negative quantity → quantity-invalid', () => {
    assert.equal(getTallyExclusion(row({ quantity: 'abc' }))?.code, 'quantity-invalid');
    assert.equal(getTallyExclusion(row({ quantity: '-1' }))?.code, 'quantity-invalid');
  });

  it('blank unit → unit', () => {
    const r = getTallyExclusion(row({ unit: '  ' }));
    assert.equal(r?.code, 'unit');
    assert.equal(r?.message, 'Introduza a unidade contada.');
  });

  it('blank, zero, negative or non-numeric selling price → price', () => {
    for (const sellingPrice of ['', '0', '-5', 'x']) {
      const r = getTallyExclusion(row({ sellingPrice }));
      assert.equal(r?.code, 'price', `sellingPrice=${JSON.stringify(sellingPrice)}`);
      assert.equal(r?.message, 'Introduza um preço de venda válido, maior que zero.');
    }
  });

  it('price in another unit with no known conversion → conversion, naming both units', () => {
    const r = getTallyExclusion(row({ unit: 'un', sellingPriceBasisUnit: 'cx', sellingPrice: '480' }));
    assert.equal(r?.code, 'conversion');
    assert.match(r!.message, /O preço está por cx mas a quantidade está em un/);
  });

  it('the same row contributes once the conversion is known', () => {
    assert.equal(
      getTallyExclusion(row({ unit: 'un', sellingPriceBasisUnit: 'cx', sellingPrice: '480' }), cxToUn),
      null
    );
  });

  it('reports the FIRST failing criterion, in the order name → quantity → unit → price → conversion', () => {
    assert.equal(getTallyExclusion(row({ productName: '', quantity: '', unit: '' }))?.code, 'name');
    assert.equal(getTallyExclusion(row({ quantity: '', unit: '' }))?.code, 'quantity-blank');
    assert.equal(getTallyExclusion(row({ unit: '', sellingPrice: '' }))?.code, 'unit');
    assert.equal(getTallyExclusion(row({ sellingPrice: '0' }))?.code, 'price');
  });
});

describe('parity — the tally counts a row exactly when the rule says it qualifies', () => {
  const cases: Array<[string, StockCountWorkingRow, UnitRelationship | undefined]> = [
    ['complete', row(), undefined],
    ['zero quantity', row({ quantity: '0' }), undefined],
    ['blank name', row({ productName: '' }), undefined],
    ['removed', row({ removed: true }), undefined],
    ['blank quantity', row({ quantity: '' }), undefined],
    ['invalid quantity', row({ quantity: 'abc' }), undefined],
    ['negative quantity', row({ quantity: '-2' }), undefined],
    ['blank unit', row({ unit: '' }), undefined],
    ['blank price', row({ sellingPrice: '' }), undefined],
    ['zero price', row({ sellingPrice: '0' }), undefined],
    ['unconvertible price', row({ unit: 'un', sellingPriceBasisUnit: 'cx' }), undefined],
    ['convertible price', row({ unit: 'un', sellingPriceBasisUnit: 'cx' }), cxToUn],
  ];

  for (const [label, r, relationship] of cases) {
    it(`${label}: counted ⇔ getTallyExclusion is null`, () => {
      const tally = tallyStockCountRows([r], undefined, () => relationship);
      const counted = tally.countedItems.length === 1;
      assert.equal(counted, getTallyExclusion(r, relationship) === null);
    });
  }

  it('an excluded row never adds to any total', () => {
    const result = tallyStockCountRows([row({ sellingPrice: '0' })]);
    assert.equal(result.totalSellingValue, 0);
    assert.equal(result.totalPhysicalUnits, 0);
    assert.deepEqual(result.notCountedProductNames, ['Cerveja Lite 330ml']);
  });

  it('only a conversion failure is also reported as unconvertible', () => {
    const conv = tallyStockCountRows([row({ unit: 'un', sellingPriceBasisUnit: 'cx' })]);
    assert.deepEqual(conv.unconvertiblePriceProductNames, ['Cerveja Lite 330ml']);
    const blank = tallyStockCountRows([row({ quantity: '' })]);
    assert.deepEqual(blank.unconvertiblePriceProductNames, []);
  });

  it('a blank-name row is skipped without being listed (nothing to name)', () => {
    const result = tallyStockCountRows([row({ productName: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, []);
  });

  it('valuation of a qualifying row is unchanged', () => {
    const result = tallyStockCountRows([row()]);
    assert.equal(result.totalSellingValue, 1500);
    assert.equal(result.totalPhysicalUnits, 10);
    assert.equal(result.countedItems[0].sellingValue, 1500);
  });

  it('valuation through a unit conversion is unchanged (480/cx, 24 un/cx, 12 un → 240)', () => {
    const result = tallyStockCountRows(
      [row({ unit: 'un', quantity: '12', sellingPriceBasisUnit: 'cx', sellingPrice: '480' })],
      undefined,
      () => cxToUn
    );
    assert.equal(result.totalSellingValue, 240);
  });
});

const componentSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf8'
);

function extractBody(source: string, marker: string): string {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Could not locate ${marker}`);
  const rest = source.slice(start);
  const next = rest.slice(marker.length).search(/\n  const \w+[:\s<]*=/);
  return next === -1 ? rest : rest.slice(0, marker.length + next);
}

describe('the screen treats a failing validated row as not validated (source checks)', () => {
  it('derives effectiveCatalogRows / effectiveManualRows from getTallyExclusion, without rewriting stored rows', () => {
    const catalog = extractBody(componentSource, 'const effectiveCatalogRows = useMemo');
    const manual = extractBody(componentSource, 'const effectiveManualRows = useMemo');
    for (const body of [catalog, manual]) {
      assert.match(body, /getTallyExclusion\(row, getEffectiveUnitRelationshipForProductName\(row\.productName\.trim\(\)\)\)/);
      assert.match(body, /validated: false/);
      assert.doesNotMatch(body, /setCatalogRows|setManualRows|updateCatalogRow|updateManualRow/);
    }
  });

  it('Validar refuses with the shared rule\'s message', () => {
    const body = extractBody(componentSource, 'const validateWorkingRowForSave = (');
    assert.match(body, /getTallyExclusion\(row, getEffectiveUnitRelationshipForProductName/);
    assert.match(body, /return exclusion\.message/);
  });

  it('the live total, the workspace, the lists and the confirm tally all read the effective rows', () => {
    assert.match(extractBody(componentSource, 'const allWorkingRows: StockCountWorkingRow[] = useMemo('), /effectiveCatalogRows[\s\S]*effectiveManualRows/);
    assert.match(extractBody(componentSource, 'const validatedCatalogEntries = useMemo('), /effectiveCatalogRows/);
    assert.match(extractBody(componentSource, 'const pickerCatalogEntries = useMemo('), /effectiveCatalogRows/);
    assert.match(extractBody(componentSource, 'const unifiedListEntries = useMemo('), /effectiveCatalogRows[\s\S]*effectiveManualRows/);
    const confirm = extractBody(componentSource, 'const handleRequestConfirmation = async (e: React.FormEvent) => {');
    assert.match(confirm, /Object\.values\(effectiveCatalogRows\)/);
    assert.match(confirm, /effectiveManualRows\.map/);
  });

  it('"Produtos por validar" lists a stored-validated row that no longer qualifies, even with a blank quantity', () => {
    const body = extractBody(componentSource, 'const pendingValidationEntries: PendingValidationEntry[] = [');
    assert.match(body, /Object\.entries\(effectiveCatalogRows\)/);
    assert.match(body, /catalogRows\[productId\]\?\.validated === true/);
    assert.match(body, /manualRows\[index\]\?\.validated === true/);
  });

  it('the right-hand list keeps such a product visible (storedValidated)', () => {
    assert.match(componentSource, /storedValidated: catalogRows\[productId\]\?\.validated === true/);
    assert.match(componentSource, /storedValidated: manualRows\[idx\]\?\.validated === true/);
    assert.match(componentSource, /member\.storedValidated \|\|/);
  });

  it('every `row.validated` that feeds the totals goes through onlyValidatedCounts over effective rows', () => {
    assert.match(componentSource, /const onlyValidatedCounts = \(rows: StockCountWorkingRow\[\]\): StockCountWorkingRow\[\] =>/);
    assert.doesNotMatch(
      componentSource,
      /onlyValidatedCounts\(\[\s*\.\.\.Object\.values\(catalogRows\)/,
      'the confirm tally must not read the raw stored rows'
    );
  });
});
