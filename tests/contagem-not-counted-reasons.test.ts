import test from 'node:test';
import assert from 'node:assert/strict';
import { tallyStockCountRows, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';

const row = (over: Partial<StockCountWorkingRow>): StockCountWorkingRow =>
  ({ productName: 'P', quantity: '', unit: 'un', costPrice: '', sellingPrice: '', ...over }) as StockCountWorkingRow;

test('every not-counted product carries the reason and the row to open', () => {
  const tally = tallyStockCountRows([
    row({ productName: 'Ok', quantity: '3', sellingPrice: '10' }),
    row({ productName: 'Blank', productId: 'p1', quantity: '' }),
    row({ productName: 'No price', productId: 'p2', quantity: '5', sellingPrice: '' }),
    row({ productName: 'No unit', manualRowIndex: 4, quantity: '5', unit: '', sellingPrice: '10' }),
  ]);
  assert.deepEqual(tally.notCountedProductNames, ['Blank', 'No price', 'No unit']);
  assert.equal(tally.notCountedDetails.length, tally.notCountedProductNames.length);
  const by = Object.fromEntries(tally.notCountedDetails.map((d) => [d.name, d]));
  assert.equal(by['Blank'].code, 'quantity-blank');
  assert.equal(by['Blank'].productId, 'p1');
  assert.equal(by['No price'].code, 'price');
  assert.equal(by['No unit'].code, 'unit');
  assert.equal(by['No unit'].manualRowIndex, 4);
});

test('a real problem wins over a plain blank row for the same product', () => {
  const tally = tallyStockCountRows([
    row({ productName: 'Mix', productId: 'a', quantity: '' }),
    row({ productName: 'mix', manualRowIndex: 1, quantity: '2', sellingPrice: '' }),
  ]);
  assert.equal(tally.notCountedDetails.length, 1);
  assert.equal(tally.notCountedDetails[0].code, 'price');
});

test('a product with a counted portion is never listed', () => {
  const tally = tallyStockCountRows([
    row({ productName: 'Smol', quantity: '26', sellingPrice: '290' }),
    row({ productName: 'smol', quantity: '' }),
  ]);
  assert.deepEqual(tally.notCountedDetails, []);
});
