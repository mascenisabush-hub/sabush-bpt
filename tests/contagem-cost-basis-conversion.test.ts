// Business Worth Evolution — Increment 10 Item 5 ("Contagem Cost-Basis
// Conversion") + Post-Implementation Correction §25 ("Contagem
// Cost-Price Zero-Fallback Removal"). Authorized by
// docs/engineering/business-worth-evolution-implementation-authorization.md
// §22 item 5, §23 item 5, §25; Specification §15/FR-67. Product
// Architect resolution on the authoritative cost-basis source and the
// multi-portion aggregate rule, 24 August 2026.
//
// SCOPE: proves deriveCostContribution / buildProductCostBasisMap
// (apps/tenant/src/lib/fr67CostBasisConversion.ts) directly, and proves
// — at the integration level — that tallyStockCountRows (Owner-facing
// preview) and normalizeStockCountItems (persisted totalValue) produce
// byte-for-byte identical Total Cost Value figures for the same input,
// per the Product Architect's own "preview and persisted Contagem must
// never disagree" instruction.
//
// HOW TO RUN:
//   npx tsx --test tests/contagem-cost-basis-conversion.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  deriveCostContribution,
  buildProductCostBasisMap,
  type ProductCostBasis,
} from '../apps/tenant/src/lib/fr67CostBasisConversion';
import {
  normalizeStockCountItems,
  tallyStockCountRows,
  type StockCountInputItem,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship, Product } from '../apps/tenant/src/types';

// Canonical three-level chain, matching this codebase's own established
// worked example: 1 Cx = 4 Emb = 24 Un.
const threeLevel: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Emb = 6 Un => 1 Cx = 24 Un
  ],
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

const twoLevel: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
  ],
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

const fourLevel: UnitRelationship = {
  units: [
    { unit: 'Palete', factorFromPrevious: 0 },
    { unit: 'Cx', factorFromPrevious: 10 }, // 1 Palete = 10 Cx
    { unit: 'Emb', factorFromPrevious: 4 }, // 1 Cx = 4 Emb => 1 Palete = 40 Emb
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Emb = 6 Un => 1 Palete = 240 Un
  ],
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

const basisFor = (relationship: UnitRelationship, purchaseCost: number): ProductCostBasis => ({
  purchaseUnit: relationship.units[0].unit,
  purchaseCost,
  relationship,
});

describe('deriveCostContribution — unit-level derivation (FR-67 / §25)', () => {
  it('A. same purchase unit: 1 Cx @ 1,250 MZN/Cx -> 1,250', () => {
    const result = deriveCostContribution(1, 'Cx', 0, basisFor(threeLevel, 1250));
    assert.equal(result.derived, true);
    assert.equal(Number(result.value.toFixed(2)), 1250);
  });

  it('B. two-level relationship: 3 Emb, 1 Cx = 4 Emb, 1,250 MZN/Cx -> 937.50', () => {
    const result = deriveCostContribution(3, 'Emb', 0, basisFor(twoLevel, 1250));
    assert.equal(result.derived, true);
    assert.equal(Number(result.value.toFixed(2)), 937.5);
  });

  it('C. three-level relationship: 5 Un, 1 Cx = 24 Un, 1,250 MZN/Cx -> 260.42', () => {
    const result = deriveCostContribution(5, 'Un', 0, basisFor(threeLevel, 1250));
    assert.equal(result.derived, true);
    assert.equal(Number(result.value.toFixed(2)), 260.42);
  });

  it('D. four-level relationship: 3 Emb, 1 Palete = 40 Emb, 12,500 MZN/Palete -> 937.50', () => {
    const result = deriveCostContribution(3, 'Emb', 0, basisFor(fourLevel, 12500));
    assert.equal(result.derived, true);
    assert.equal(Number((result.value).toFixed(2)), 937.5);
  });

  it('E. invalid/unconvertible unit never fabricates a factor — falls back to raw cost (§25)', () => {
    const result = deriveCostContribution(5, 'Litro', 60, basisFor(threeLevel, 1250));
    assert.equal(result.derived, false);
    assert.equal(result.value, 300); // 5 * 60, unchanged manual-entry behavior
  });

  it('F. no relationship at all follows exact §25 fallback', () => {
    const result = deriveCostContribution(5, 'Un', 60, undefined);
    assert.equal(result.derived, false);
    assert.equal(result.value, 300);
  });

  it('G. invalid relationship (empty units[]) follows exact §25 fallback', () => {
    const invalid: UnitRelationship = { units: [], confirmedAt: '2026-08-01T00:00:00.000Z' };
    const basis: ProductCostBasis = { purchaseUnit: 'Cx', purchaseCost: 1250, relationship: invalid };
    const result = deriveCostContribution(5, 'Un', 60, basis);
    assert.equal(result.derived, false);
    assert.equal(result.value, 300);
  });

  it('H. missing/negative purchaseCost follows exact §25 fallback, never a synthetic zero-cost derivation', () => {
    const missing = deriveCostContribution(5, 'Un', 60, { purchaseUnit: 'Cx', purchaseCost: NaN, relationship: threeLevel });
    assert.equal(missing.derived, false);
    assert.equal(missing.value, 300);

    const negative = deriveCostContribution(5, 'Un', 60, { purchaseUnit: 'Cx', purchaseCost: -1, relationship: threeLevel });
    assert.equal(negative.derived, false);
    assert.equal(negative.value, 300);
  });

  it('I. non-purchase-unit blank cost does NOT silently become zero in the governed convertible case', () => {
    // raw cost is 0 (blank/suppressed) but a valid basis + relationship exist
    const result = deriveCostContribution(5, 'Un', 0, basisFor(threeLevel, 1250));
    assert.equal(result.derived, true);
    assert.ok(result.value > 0);
    assert.equal(Number(result.value.toFixed(2)), 260.42);
  });

  it('J. blank manual cost with NO confirmed relationship still coerces to zero — outside FR-67 scope, unchanged', () => {
    const result = deriveCostContribution(5, 'Un', 0, undefined);
    assert.equal(result.derived, false);
    assert.equal(result.value, 0);
  });

  it('K. mismatched purchaseUnit vs. relationship.units[0] is treated as an invalid basis (defensive)', () => {
    const mismatched: ProductCostBasis = { purchaseUnit: 'Saco', purchaseCost: 1250, relationship: threeLevel };
    const result = deriveCostContribution(5, 'Un', 60, mismatched);
    assert.equal(result.derived, false);
    assert.equal(result.value, 300);
  });
});

describe('deriveCostContribution — the exact mandatory multi-portion example', () => {
  it('2 Cx + 3 Emb + 5 Un, 1 Cx = 4 Emb = 24 Un, 1,250 MZN/Cx -> 3,697.92 total', () => {
    const basis = basisFor(threeLevel, 1250);
    const portions: [number, string][] = [
      [2, 'Cx'],
      [3, 'Emb'],
      [5, 'Un'],
    ];
    const total = portions.reduce((sum, [quantity, unit]) => {
      const { value, derived } = deriveCostContribution(quantity, unit, 0, basis);
      assert.equal(derived, true);
      return sum + value;
    }, 0);
    assert.equal(Number(total.toFixed(2)), 3697.92);
  });

  it('the CX portion is derived from the basis, not from its own raw entered cost — resolution §1/§4', () => {
    // Even if the CX row happened to carry some other manually-entered
    // cost value, the governed derivation must ignore it entirely and
    // use the authoritative Product.costPrice basis instead.
    const basis = basisFor(threeLevel, 1250);
    const result = deriveCostContribution(2, 'Cx', 999999, basis);
    assert.equal(result.derived, true);
    assert.equal(Number(result.value.toFixed(2)), 2500);
  });
});

describe('buildProductCostBasisMap — authoritative source resolution', () => {
  const productBase = (overrides: Partial<Product>): Pick<Product, 'name' | 'costPrice' | 'unitRelationship'> => ({
    name: 'Coca-Cola',
    costPrice: 1250,
    unitRelationship: threeLevel,
    ...overrides,
  });

  it('includes a product with a valid relationship and a finite, non-negative costPrice', () => {
    const map = buildProductCostBasisMap([productBase({})]);
    const basis = map.get('coca-cola');
    assert.ok(basis);
    assert.equal(basis!.purchaseUnit, 'Cx');
    assert.equal(basis!.purchaseCost, 1250);
  });

  it('excludes a product with no confirmed unitRelationship', () => {
    const map = buildProductCostBasisMap([productBase({ unitRelationship: undefined })]);
    assert.equal(map.has('coca-cola'), false);
  });

  it('excludes a product with no costPrice on record (e.g. a genuinely new product not yet created)', () => {
    const map = buildProductCostBasisMap([productBase({ costPrice: undefined })]);
    assert.equal(map.has('coca-cola'), false);
  });

  it('never uses a StockBatch cost as a substitute — this function reads only Product fields', () => {
    // buildProductCostBasisMap's own type signature (Pick<Product, ...>)
    // structurally cannot read a StockBatch at all; this test documents
    // that guarantee rather than exercising a branch.
    const map = buildProductCostBasisMap([productBase({})]);
    assert.equal(map.get('coca-cola')!.purchaseCost, 1250);
  });
});

describe('normalizeStockCountItems — FR-67 integration (persisted totalValue)', () => {
  const items = (basisMap?: Map<string, ProductCostBasis>) => {
    const rawItems: StockCountInputItem[] = [
      { productName: 'Coca-Cola', quantity: 2, unit: 'Cx', costPrice: 0, sellingPrice: 1250 },
      { productName: 'Coca-Cola', quantity: 3, unit: 'Emb', costPrice: 0, sellingPrice: 320 },
      { productName: 'Coca-Cola', quantity: 5, unit: 'Un', costPrice: 0, sellingPrice: 60 },
    ];
    return normalizeStockCountItems(rawItems, basisMap);
  };

  it('derives the exact 3,697.92 total when a cost basis is supplied', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = items(map);
    assert.equal(result.totalValue, 3697.92);
  });

  it('FR-67 still works with no Cx (purchase-unit) portion present in this Contagem', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const rawItems: StockCountInputItem[] = [
      { productName: 'Coca-Cola', quantity: 3, unit: 'Emb', costPrice: 0, sellingPrice: 320 },
      { productName: 'Coca-Cola', quantity: 5, unit: 'Un', costPrice: 0, sellingPrice: 60 },
    ];
    const result = normalizeStockCountItems(rawItems, map);
    // 3 Emb = 0.75 Cx -> 937.50; 5 Un = 0.208333 Cx -> 260.42
    assert.equal(result.totalValue, 1197.92);
  });

  it('absent a cost basis map (existing call sites), behavior is byte-for-byte unchanged', () => {
    const result = items(undefined);
    // No basis supplied -> falls back to quantity * costPrice (all 0 here)
    assert.equal(result.totalValue, 0);
  });

  it('no synthetic per-portion costPrice is written — each item.costPrice stays exactly the raw entered value', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = items(map);
    for (const item of result.items) {
      assert.equal(item.costPrice, 0); // raw entered value, never overwritten with a derived per-unit figure
    }
  });

  it('two different products never contaminate each other\'s cost basis', () => {
    const map = new Map([
      ['coca-cola', basisFor(threeLevel, 1250)],
      ['fanta', basisFor(twoLevel, 900)],
    ]);
    const rawItems: StockCountInputItem[] = [
      { productName: 'Coca-Cola', quantity: 2, unit: 'Cx', costPrice: 0, sellingPrice: 1250 },
      { productName: 'Fanta', quantity: 1, unit: 'Emb', costPrice: 0, sellingPrice: 320 },
    ];
    const result = normalizeStockCountItems(rawItems, map);
    const coca = result.items.find((i) => i.productName === 'Coca-Cola')!;
    const fanta = result.items.find((i) => i.productName === 'Fanta')!;
    assert.equal(coca.totalValue, 2500);
    assert.equal(fanta.totalValue, 225); // 1 Emb of 4 -> 0.25 Cx * 900
    assert.equal(result.totalValue, 2725);
  });

  it('multiple portions of the same product all contribute to ONE total, not separate cost bases', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = items(map);
    assert.equal(result.items.length, 3);
    assert.equal(result.totalValue, 3697.92);
  });

  it('selling price and totalSellingValue remain completely independent of the cost derivation', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = items(map);
    // 2*1250 + 3*320 + 5*60 = 2500 + 960 + 300 = 3760
    assert.equal(result.totalSellingValue, 3760);
  });

  it('purchase-unit-only portion requires no conversion and matches the raw-cost path exactly', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const rawItems: StockCountInputItem[] = [{ productName: 'Coca-Cola', quantity: 1, unit: 'Cx', costPrice: 0, sellingPrice: 1250 }];
    const result = normalizeStockCountItems(rawItems, map);
    assert.equal(result.totalValue, 1250);
  });
});

describe('tallyStockCountRows — FR-67 integration (Owner-facing preview)', () => {
  const row = (overrides: Partial<StockCountWorkingRow>): StockCountWorkingRow => ({
    productId: 'p1',
    productName: 'Coca-Cola',
    quantity: '',
    unit: 'Cx',
    costPrice: '',
    sellingPrice: '',
    ...overrides,
  });

  it('derives the exact 3,697.92 total for the preview, identical to persistence', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = tallyStockCountRows(
      [
        row({ quantity: '2', unit: 'Cx' }),
        row({ quantity: '3', unit: 'Emb' }),
        row({ quantity: '5', unit: 'Un' }),
      ],
      map
    );
    assert.equal(result.totalPurchaseValue, 3697.92);
  });

  it('preview total exactly matches normalizeStockCountItems total for the identical input', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const workingRows = [row({ quantity: '2', unit: 'Cx' }), row({ quantity: '3', unit: 'Emb' }), row({ quantity: '5', unit: 'Un' })];
    const tally = tallyStockCountRows(workingRows, map);

    const rawItems: StockCountInputItem[] = workingRows.map((r) => ({
      productName: r.productName,
      quantity: r.quantity,
      unit: r.unit,
      costPrice: r.costPrice,
      sellingPrice: r.sellingPrice,
    }));
    const normalized = normalizeStockCountItems(rawItems, map);

    assert.equal(tally.totalPurchaseValue, normalized.totalValue);
  });

  it('absent the map (existing behavior), a blank quantity is still Not Counted, unaffected', () => {
    const result = tallyStockCountRows([row({ quantity: '' })]);
    assert.equal(result.countedItems.length, 0);
    assert.deepEqual(result.notCountedProductNames, ['Coca-Cola']);
  });

  it('no synthetic per-portion costPrice is written in the preview either', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = tallyStockCountRows([row({ quantity: '5', unit: 'Un', costPrice: '' })], map);
    assert.equal(result.countedItems[0].costPrice, 0);
    assert.ok(result.countedItems[0].purchaseValue > 0);
  });
});

describe('Selling-basis regression — untouched by this correction', () => {
  it('normalizeStockCountItems does not let selling price influence totalValue (pre-existing guarantee, still holds)', () => {
    const result = normalizeStockCountItems([{ productName: 'Arroz', quantity: 3, unit: 'kg', costPrice: 50, sellingPrice: 9999 }]);
    assert.equal(result.totalValue, 150);
  });

  it('sellingPrice may differ per portion without affecting totalValue, even with a cost basis supplied', () => {
    const map = new Map([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = normalizeStockCountItems(
      [{ productName: 'Coca-Cola', quantity: 2, unit: 'Cx', costPrice: 0, sellingPrice: 99999 }],
      map
    );
    assert.equal(result.totalValue, 2500);
  });
});
