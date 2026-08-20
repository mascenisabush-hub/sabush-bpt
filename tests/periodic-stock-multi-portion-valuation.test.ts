// Increment B, Checkpoint B6 — proves the EXISTING, unmodified
// tallyStockCountRows / workingRowToDraftItem / draftItemToWorkingRow
// (apps/tenant/src/utils/stockCount.ts) already correctly support §17's
// multi-portion, mixed-unit/mixed-price-basis Periodic Contagem
// valuation requirement, with ZERO code change to any of the three —
// exactly Rule 8 Assessment Finding 4's conclusion, now verified for
// Periodic Contagem's own working-row model (catalogRows + manualRows,
// distinct from Initial Stock's flat array — see
// PeriodicStockCountView.tsx's own CatalogRowState/manualRows split).
//
// SCOPE: all three functions under test are pure — no Firestore, no
// UI. This file makes NO changes to stockCount.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-multi-portion-valuation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { tallyStockCountRows, workingRowToDraftItem, draftItemToWorkingRow, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';

describe('tallyStockCountRows — §17 canonical worked example (Pretinha), catalog row + manual row', () => {
  it('an auto-populated catalog row (with productId) and a manually-added row (without) for the same product both count as separate portions', () => {
    // Mirrors exactly what PeriodicStockCountView.tsx's allWorkingRows
    // (= [...Object.values(catalogRows), ...manualRows]) would contain
    // for this scenario: the catalog row IS 'Pretinha' auto-populated
    // from the product catalog; the manual row is a second, owner-typed
    // portion of the SAME product name.
    const catalogRow: StockCountWorkingRow = {
      productId: 'prod-pretinha',
      productName: 'Pretinha',
      quantity: '6',
      unit: 'Cx',
      costPrice: '820',
      sellingPrice: '',
    };
    const manualRow: StockCountWorkingRow = {
      productId: undefined,
      productName: 'Pretinha',
      quantity: '4',
      unit: 'Un',
      costPrice: '50',
      sellingPrice: '',
    };

    const result = tallyStockCountRows([catalogRow, manualRow]);

    assert.equal(result.countedItems.length, 2, 'both portions are preserved as SEPARATE tally items — never merged into one');
    assert.equal(result.notCountedProductNames.length, 0);

    // Requirement 2: different units preserved per row.
    assert.equal(result.countedItems[0].unit, 'Cx');
    assert.equal(result.countedItems[1].unit, 'Un');

    // Requirement 3: different valuation price bases preserved per row.
    assert.equal(result.countedItems[0].costPrice, 820);
    assert.equal(result.countedItems[1].costPrice, 50);

    // Requirement 4/10: existing tally correctly includes and sums both portions.
    assert.equal(result.countedItems[0].purchaseValue, 4920); // 6 * 820
    assert.equal(result.countedItems[1].purchaseValue, 200); // 4 * 50
    assert.equal(result.totalPurchaseValue, 5120);
    assert.equal(result.totalPhysicalUnits, 10); // 6 + 4
  });

  it('two manually-added rows for the same product (no catalog entry at all) sum correctly', () => {
    const rows: StockCountWorkingRow[] = [
      { productId: undefined, productName: 'Savanna', quantity: '2', unit: 'Cx', costPrice: '1250', sellingPrice: '' },
      { productId: undefined, productName: 'Savanna', quantity: '5', unit: 'Un', costPrice: '55', sellingPrice: '' },
    ];
    const result = tallyStockCountRows(rows);
    assert.equal(result.countedItems.length, 2);
    assert.equal(result.totalPurchaseValue, 2500 + 275);
  });

  it('a multi-portion product coexists correctly alongside unrelated single-portion catalog/manual rows', () => {
    const rows: StockCountWorkingRow[] = [
      { productId: 'prod-arroz', productName: 'Arroz', quantity: '10', unit: 'Saco', costPrice: '500', sellingPrice: '' },
      { productId: 'prod-pretinha', productName: 'Pretinha', quantity: '6', unit: 'Cx', costPrice: '820', sellingPrice: '' },
      { productId: undefined, productName: 'Pretinha', quantity: '4', unit: 'Un', costPrice: '50', sellingPrice: '' },
      { productId: undefined, productName: 'Feijão', quantity: '3', unit: 'Saco', costPrice: '300', sellingPrice: '' },
    ];
    const result = tallyStockCountRows(rows);
    assert.equal(result.countedItems.length, 4);
    assert.equal(result.totalPurchaseValue, 5000 + 4920 + 200 + 900);
  });

  it('sellingPrice may differ per portion without affecting purchaseValue/totalPurchaseValue (cost-basis rule unchanged)', () => {
    const rows: StockCountWorkingRow[] = [
      { productId: 'prod-pretinha', productName: 'Pretinha', quantity: '6', unit: 'Cx', costPrice: '820', sellingPrice: '950' },
      { productId: undefined, productName: 'Pretinha', quantity: '4', unit: 'Un', costPrice: '50', sellingPrice: '65' },
    ];
    const result = tallyStockCountRows(rows);
    assert.equal(result.countedItems[0].sellingPrice, 950);
    assert.equal(result.countedItems[1].sellingPrice, 65);
    assert.equal(result.totalPurchaseValue, 4920 + 200); // unaffected by sellingValue
    assert.equal(result.totalSellingValue, 5700 + 260); // tracked separately, still not what "the count" is valued at (purchaseValue/totalPurchaseValue)
  });

  it('one portion Not Counted (blank quantity) and the other Counted are handled independently — no forced all-or-nothing per product', () => {
    const rows: StockCountWorkingRow[] = [
      { productId: 'prod-pretinha', productName: 'Pretinha', quantity: '6', unit: 'Cx', costPrice: '820', sellingPrice: '' },
      { productId: undefined, productName: 'Pretinha', quantity: '', unit: 'Un', costPrice: '50', sellingPrice: '' }, // owner hasn't counted this portion yet
    ];
    const result = tallyStockCountRows(rows);
    assert.equal(result.countedItems.length, 1);
    assert.equal(result.countedItems[0].purchaseValue, 4920);
    assert.deepEqual(result.notCountedProductNames, ['Pretinha']); // the SAME product name also appears here — correct, since one portion genuinely wasn't counted
  });
});

describe('workingRowToDraftItem / draftItemToWorkingRow — §17 draft round-trip for multi-portion rows', () => {
  it('a catalog-row portion and a manual-row portion of the same product both round-trip losslessly, independently', () => {
    const catalogRow: StockCountWorkingRow = {
      productId: 'prod-pretinha',
      productName: 'Pretinha',
      quantity: '6',
      unit: 'Cx',
      costPrice: '820',
      sellingPrice: '',
    };
    const manualRow: StockCountWorkingRow = {
      productId: undefined,
      productName: 'Pretinha',
      quantity: '4',
      unit: 'Un',
      costPrice: '50',
      sellingPrice: '',
    };

    const draftCatalog = workingRowToDraftItem(catalogRow);
    const draftManual = workingRowToDraftItem(manualRow);

    // Requirement: productId is present on the catalog portion's draft
    // item, and genuinely ABSENT (not merely falsy) on the manual
    // portion's — this is exactly what handleResumeDraft's own
    // `item.productId ? catalogRows[...] : manualRows.push(...)`
    // branch relies on to route each portion back to the correct array
    // without collision.
    assert.equal(draftCatalog.productId, 'prod-pretinha');
    assert.equal('productId' in draftManual, false);

    const restoredCatalog = draftItemToWorkingRow(draftCatalog);
    const restoredManual = draftItemToWorkingRow(draftManual);

    assert.deepEqual(restoredCatalog, { ...catalogRow, removed: undefined });
    assert.deepEqual(restoredManual, { ...manualRow, removed: undefined });

    // Requirement 3: each portion's own unit/price basis survives the round-trip.
    assert.equal(restoredCatalog.unit, 'Cx');
    assert.equal(restoredCatalog.costPrice, '820');
    assert.equal(restoredManual.unit, 'Un');
    assert.equal(restoredManual.costPrice, '50');
  });

  it('two manual-row portions of the same product (both productId-less) round-trip as two independent draft items, never collapsed into one', () => {
    const manualRow1: StockCountWorkingRow = { productId: undefined, productName: 'Savanna', quantity: '2', unit: 'Cx', costPrice: '1250', sellingPrice: '' };
    const manualRow2: StockCountWorkingRow = { productId: undefined, productName: 'Savanna', quantity: '5', unit: 'Un', costPrice: '55', sellingPrice: '' };

    const items = [workingRowToDraftItem(manualRow1), workingRowToDraftItem(manualRow2)];

    // Simulates the exact branching handleResumeDraft (PeriodicStockCountView.tsx)
    // uses: item.productId ? catalogRows[...] : manualRows.push(...).
    const catalogRows: Record<string, ReturnType<typeof draftItemToWorkingRow>> = {};
    const manualRows: ReturnType<typeof draftItemToWorkingRow>[] = [];
    for (const item of items) {
      const row = draftItemToWorkingRow(item);
      if (item.productId) {
        catalogRows[item.productId] = row;
      } else {
        manualRows.push(row);
      }
    }

    assert.equal(Object.keys(catalogRows).length, 0);
    assert.equal(manualRows.length, 2, 'both manual portions survive resurrection as two independent rows — no collision, no data loss');
    assert.equal(manualRows[0].unit, 'Cx');
    assert.equal(manualRows[1].unit, 'Un');
  });

  it('a catalog portion and a manual portion of the same product resurrect into the correct, non-colliding array each', () => {
    const catalogRow: StockCountWorkingRow = { productId: 'prod-pretinha', productName: 'Pretinha', quantity: '6', unit: 'Cx', costPrice: '820', sellingPrice: '' };
    const manualRow: StockCountWorkingRow = { productId: undefined, productName: 'Pretinha', quantity: '4', unit: 'Un', costPrice: '50', sellingPrice: '' };

    const items = [workingRowToDraftItem(catalogRow), workingRowToDraftItem(manualRow)];

    const catalogRows: Record<string, ReturnType<typeof draftItemToWorkingRow>> = {};
    const manualRows: ReturnType<typeof draftItemToWorkingRow>[] = [];
    for (const item of items) {
      const row = draftItemToWorkingRow(item);
      if (item.productId) {
        catalogRows[item.productId] = row;
      } else {
        manualRows.push(row);
      }
    }

    // Exactly ONE catalog entry for this product (structurally, a
    // Record can only ever hold one per productId) — its own portion,
    // untouched by the manual portion's resurrection.
    assert.equal(Object.keys(catalogRows).length, 1);
    assert.equal(catalogRows['prod-pretinha'].unit, 'Cx');
    assert.equal(catalogRows['prod-pretinha'].costPrice, '820');

    // The manual portion survives as its own, separate array entry —
    // no data loss, no merge with the catalog row.
    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].unit, 'Un');
    assert.equal(manualRows[0].costPrice, '50');

    // Recombining (exactly what allWorkingRows does) still yields both
    // portions for tallying.
    const recombined = [...Object.values(catalogRows), ...manualRows];
    const tally = tallyStockCountRows(recombined);
    assert.equal(tally.countedItems.length, 2);
    assert.equal(tally.totalPurchaseValue, 5120);
  });
});
