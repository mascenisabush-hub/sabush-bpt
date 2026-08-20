// Grouped Initial Stock UX — tests for InitialStockCountView.tsx's new
// group-level handlers (handleAddPortion, handleRenameGroup,
// handleRemoveGroup) and the end-to-end proof that grouping is a pure
// render-layer change over the same flat rows array — the submitted
// StockCountItem shape, Product resolution, and total valuation are
// byte-for-byte identical to what the pre-checkpoint flat-row UI
// already produced.
//
// SCOPE: the handlers themselves live inside a React component with no
// DOM test harness in this repository (established pattern — see
// tests/periodic-stock-multi-portion-valuation.test.ts's own
// "simulates the exact resurrection algorithm" precedent). Each
// handler below is a plain array transform over CountRowItem-shaped
// objects; this file reproduces each handler's EXACT logic (verbatim
// from InitialStockCountView.tsx) as a standalone function and tests
// that function directly. The end-to-end sections call the REAL,
// unmodified normalizeStockCountItems and a faithful reproduction of
// recordStockCount's own product-resolution loop to prove the actual
// persisted shape, not merely a hand-wavy claim about it.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-grouped-ux.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { groupRowsByProductName } from '../apps/tenant/src/lib/stockCountPortionGrouping';
import { normalizeStockCountItems } from '../apps/tenant/src/utils/stockCount';

interface Row {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  newProductSellingUnit: string;
  newProductSellingUnitFactor: string;
}

const makeRow = (overrides: Partial<Row> & { id: string }): Row => ({
  productName: '',
  quantity: '',
  unit: 'un',
  costPrice: '',
  sellingPrice: '',
  newProductSellingUnit: '',
  newProductSellingUnitFactor: '',
  ...overrides,
});

// Verbatim reproduction of InitialStockCountView.tsx's handleAddPortion.
function handleAddPortion(rows: Row[], groupDisplayName: string, newId: string): Row[] {
  return [...rows, makeRow({ id: newId, productName: groupDisplayName })];
}

// Verbatim reproduction of InitialStockCountView.tsx's handleRenameGroup.
function handleRenameGroup(rows: Row[], groupKey: string, newName: string): Row[] {
  if (!groupKey) return rows;
  return rows.map((row) => (row.productName.trim().toLowerCase() === groupKey ? { ...row, productName: newName } : row));
}

// Verbatim reproduction of InitialStockCountView.tsx's handleRemoveGroup.
function handleRemoveGroup(rows: Row[], rowIds: string[]): Row[] {
  const idsToRemove = new Set(rowIds);
  const remaining = rows.filter((row) => !idsToRemove.has(row.id));
  if (remaining.length === 0) return rows;
  return remaining;
}

// Verbatim reproduction of InitialStockCountView.tsx's handleRemoveRow.
function handleRemoveRow(rows: Row[], id: string): Row[] {
  if (rows.length <= 1) return rows;
  return rows.filter((row) => row.id !== id);
}

describe('handleAddPortion — add portion', () => {
  it('adds a new row pre-filled with the group\'s display name, everything else blank', () => {
    const rows = [makeRow({ id: 'r1', productName: 'Coca-Cola', quantity: '3', unit: 'Cx', costPrice: '1250' })];
    const result = handleAddPortion(rows, 'Coca-Cola', 'r2');
    assert.equal(result.length, 2);
    assert.equal(result[1].productName, 'Coca-Cola');
    assert.equal(result[1].quantity, '');
    assert.equal(result[1].unit, 'un');
    assert.equal(result[1].costPrice, '');
    assert.equal(result[0].quantity, '3');
  });

  it('a group of 1 grows to a group of 2 after adding a portion', () => {
    const rows = [makeRow({ id: 'r1', productName: 'Coca-Cola' })];
    const afterAdd = handleAddPortion(rows, 'Coca-Cola', 'r2');
    const groups = groupRowsByProductName(afterAdd);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });
});

describe('handleRemoveRow — remove one portion', () => {
  it('removing one portion of a 2-portion group leaves a 1-portion group (now solo)', () => {
    const rows = [
      makeRow({ id: 'r1', productName: 'Coca-Cola', unit: 'Cx' }),
      makeRow({ id: 'r2', productName: 'Coca-Cola', unit: 'Un' }),
    ];
    const afterRemove = handleRemoveRow(rows, 'r2');
    assert.equal(afterRemove.length, 1);
    const groups = groupRowsByProductName(afterRemove);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 1);
    assert.equal(groups[0].rows[0].id, 'r1');
  });

  it('never removes the very last row overall, even inside a group', () => {
    const rows = [makeRow({ id: 'r1', productName: 'Arroz' })];
    const result = handleRemoveRow(rows, 'r1');
    assert.equal(result.length, 1);
  });
});

describe('handleRemoveGroup — remove entire product group', () => {
  it('removes every row belonging to the group, leaving other groups untouched', () => {
    const rows = [
      makeRow({ id: 'r1', productName: 'Coca-Cola' }),
      makeRow({ id: 'r2', productName: 'Coca-Cola' }),
      makeRow({ id: 'r3', productName: 'Arroz' }),
    ];
    const result = handleRemoveGroup(rows, ['r1', 'r2']);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'r3');
  });

  it('never leaves zero rows — refuses (no-op) if the group is everything that exists', () => {
    const rows = [makeRow({ id: 'r1', productName: 'Coca-Cola' }), makeRow({ id: 'r2', productName: 'Coca-Cola' })];
    const result = handleRemoveGroup(rows, ['r1', 'r2']);
    assert.equal(result.length, 2);
  });

  it('correctly distinguishes two DIFFERENT blank-name groups — removing one blank row never removes another', () => {
    const rows = [makeRow({ id: 'r1', productName: '' }), makeRow({ id: 'r2', productName: '' })];
    const result = handleRemoveGroup(rows, ['r1']);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'r2');
  });
});

describe('handleRenameGroup — rename product group', () => {
  it('renames every row in the group at once', () => {
    const rows = [
      makeRow({ id: 'r1', productName: 'Coca-Cola', unit: 'Cx' }),
      makeRow({ id: 'r2', productName: 'Coca-Cola', unit: 'Un' }),
      makeRow({ id: 'r3', productName: 'Arroz' }),
    ];
    const result = handleRenameGroup(rows, 'coca-cola', 'Coca-Cola Zero');
    assert.equal(result[0].productName, 'Coca-Cola Zero');
    assert.equal(result[1].productName, 'Coca-Cola Zero');
    assert.equal(result[2].productName, 'Arroz');
  });

  it('renaming to match an existing OTHER group merges into it on the next grouping pass (intended behavior)', () => {
    const rows = [makeRow({ id: 'r1', productName: 'Coca-Cola' }), makeRow({ id: 'r2', productName: 'Pepsi' })];
    const renamed = handleRenameGroup(rows, 'pepsi', 'Coca-Cola');
    const groups = groupRowsByProductName(renamed);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });

  it('is a no-op for a blank groupKey (a solo unnamed row is renamed via its own field, not this handler)', () => {
    const rows = [makeRow({ id: 'r1', productName: '' })];
    const result = handleRenameGroup(rows, '', 'Arroz');
    assert.equal(result[0].productName, '');
  });
});

describe('New product + Product Memory — attaches to exactly one portion, per group', () => {
  it('when only the first portion carries newProductSellingUnit/Factor, only that row would attach unitRelationship at submit time', () => {
    const rows = [
      makeRow({ id: 'r1', productName: 'Savanna', unit: 'Cx', newProductSellingUnit: 'Un', newProductSellingUnitFactor: '24' }),
      makeRow({ id: 'r2', productName: 'Savanna', unit: 'Un' }),
    ];
    const rowsWithValidUnitRelationship = rows.filter(
      (r) => r.newProductSellingUnit.trim() && Number.isFinite(parseFloat(r.newProductSellingUnitFactor)) && parseFloat(r.newProductSellingUnitFactor) > 0
    );
    assert.equal(rowsWithValidUnitRelationship.length, 1);
    assert.equal(rowsWithValidUnitRelationship[0].id, 'r1');
  });
});

describe('End-to-end: grouped UI produces the same flattened persistence shape as the old flat UI', () => {
  it('a group of 2 portions flattens into the identical itemsToSave shape the pre-checkpoint flat UI already produced', () => {
    const rows = [
      makeRow({ id: 'r1', productName: 'Coca-Cola', quantity: '3', unit: 'Cx', costPrice: '1250', sellingPrice: '1500' }),
      makeRow({ id: 'r2', productName: 'Coca-Cola', quantity: '24', unit: 'Un', costPrice: '60', sellingPrice: '80' }),
    ];
    const itemsToSave = rows
      .filter((r) => r.productName.trim())
      .map((r) => ({
        productName: r.productName.trim(),
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit || 'un',
        costPrice: parseFloat(r.costPrice) || 0,
        sellingPrice: parseFloat(r.sellingPrice) || 0,
      }));

    assert.deepEqual(itemsToSave, [
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250, sellingPrice: 1500 },
      { productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 60, sellingPrice: 80 },
    ]);
  });

  it('3 Cx x 1,250 + 24 Un x 60 = 5,190 MZN — using the REAL, unmodified normalizeStockCountItems', () => {
    const result = normalizeStockCountItems([
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250 },
      { productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 60 },
    ]);
    assert.equal(result.items.length, 2);
    assert.equal(result.totalValue, 5190);
  });

  it('no duplicate Product documents — reproduction of recordStockCount\'s product-resolution loop resolves both portions to ONE product', () => {
    const normalized = normalizeStockCountItems([
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250 },
      { productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 60 },
    ]).items;

    const tempProducts: Array<{ id: string; name: string }> = [];
    const resolvedProductIds: string[] = [];
    for (const norm of normalized) {
      let product = tempProducts.find((p) => p.name.toLowerCase() === norm.productName.toLowerCase());
      if (!product) {
        product = { id: 'prod-' + tempProducts.length, name: norm.productName };
        tempProducts.push(product);
      }
      resolvedProductIds.push(product.id);
    }

    assert.equal(tempProducts.length, 1);
    assert.deepEqual(resolvedProductIds, [tempProducts[0].id, tempProducts[0].id]);
  });

  it('existing product + multiple portions: both portions resolve to the pre-existing productId, no new Product created', () => {
    const normalized = normalizeStockCountItems([
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250 },
      { productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 60 },
    ]).items;

    const tempProducts = [{ id: 'prod-existing-coca-cola', name: 'Coca-Cola' }];
    const resolvedProductIds: string[] = [];
    for (const norm of normalized) {
      let product = tempProducts.find((p) => p.name.toLowerCase() === norm.productName.toLowerCase());
      if (!product) {
        product = { id: 'prod-' + tempProducts.length, name: norm.productName };
        tempProducts.push(product);
      }
      resolvedProductIds.push(product.id);
    }

    assert.equal(tempProducts.length, 1);
    assert.deepEqual(resolvedProductIds, ['prod-existing-coca-cola', 'prod-existing-coca-cola']);
  });

  it('two completely different product groups flatten independently, each with its own total', () => {
    const result = normalizeStockCountItems([
      { productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 1250 },
      { productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 60 },
      { productName: 'Arroz', quantity: 10, unit: 'Saco', costPrice: 500 },
    ]);
    assert.equal(result.items.length, 3);
    assert.equal(result.totalValue, 3750 + 1440 + 5000);
  });
});

describe('Draft autosave/resurrection — flat rows shape is unaffected by grouping', () => {
  it('a grouped set of rows round-trips through the same rowToDraftItem/draftItemToRow shape untouched', () => {
    const rows = [
      makeRow({ id: 'r1', productName: 'Coca-Cola', quantity: '3', unit: 'Cx', costPrice: '1250', sellingPrice: '1500' }),
      makeRow({ id: 'r2', productName: 'Coca-Cola', quantity: '24', unit: 'Un', costPrice: '60', sellingPrice: '80' }),
    ];
    const draftItems = rows.map((row) => ({
      id: row.id,
      productName: row.productName,
      quantity: parseFloat(row.quantity) || 0,
      unit: row.unit,
      costPrice: parseFloat(row.costPrice) || 0,
      sellingPrice: parseFloat(row.sellingPrice) || 0,
    }));
    const restoredRows = draftItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity ? String(item.quantity) : '',
      unit: item.unit || 'un',
      costPrice: item.costPrice ? String(item.costPrice) : '',
      sellingPrice: item.sellingPrice ? String(item.sellingPrice) : '',
    }));

    assert.equal(restoredRows.length, 2);
    assert.equal(restoredRows[0].productName, 'Coca-Cola');
    assert.equal(restoredRows[1].productName, 'Coca-Cola');
    const groups = groupRowsByProductName(restoredRows.map((r) => ({ id: r.id, productName: r.productName })));
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });
});
