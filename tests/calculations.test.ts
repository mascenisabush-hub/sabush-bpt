// calculateBatch unit tests — Business Calculation Compliance Audit V-5.
//
// SCOPE: this suite exists solely to prove the V-5 correction (inventory
// valuation must never go negative when logged quebra quantity exceeds a
// batch's original quantity) without regressing normal behavior. It is not
// a general-purpose calculations.ts suite — do not treat its absence of
// coverage for other exports (calculateInventoryTotals, generateReportSummary,
// etc.) as a gap outside this task's scope.
//
// HOW TO RUN:
//   npm run test:calculations
// Pure function, no Firestore/emulator dependency — runs directly under
// Node's built-in test runner.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculateBatch, generateReportSummary } from '../apps/tenant/src/utils/calculations';
import { StockBatch, Quebra, Product } from '../apps/tenant/src/types';

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'product-1',
    dateEntered: '2026-01-01',
    quantity: 100,
    costPrice: 10,
    sellingPrice: 15,
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Test Product',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeQuebra(overrides: Partial<Quebra> = {}): Quebra {
  return {
    id: 'quebra-1',
    batchId: 'batch-1',
    productId: 'product-1',
    date: '2026-01-05',
    quantityLost: 0,
    reason: 'test',
    createdAt: '2026-01-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateBatch — normal quebra behavior (unchanged by V-5)', () => {
  it('with zero quebras, remaining quantity equals full batch quantity', () => {
    const batch = makeBatch();
    const calc = calculateBatch(batch, []);

    assert.equal(calc.remainingQuantity, 100);
    assert.equal(calc.investmentValue, 1000); // 100 * 10
    assert.equal(calc.marketValue, 1500); // 100 * 15
    assert.equal(calc.embeddedProfit, 500);
    assert.equal(calc.totalQuebraQuantity, 0);
    assert.equal(calc.quebraValue, 0);
    assert.equal(calc.hasExceededWarning, false);
  });

  it('with a partial quebra, remaining quantity is reduced correctly, not floored', () => {
    const batch = makeBatch();
    const quebras = [makeQuebra({ quantityLost: 30 })];
    const calc = calculateBatch(batch, quebras);

    assert.equal(calc.remainingQuantity, 70); // 100 - 30, well above zero
    assert.equal(calc.investmentValue, 700); // 70 * 10
    assert.equal(calc.marketValue, 1050); // 70 * 15
    assert.equal(calc.embeddedProfit, 350);
    assert.equal(calc.totalQuebraQuantity, 30);
    assert.equal(calc.quebraValue, 300); // 30 * 10 (cost), unaffected by V-5
    assert.equal(calc.hasExceededWarning, false);
  });

  it('quebras for other batches are ignored (batchId filter still applies)', () => {
    const batch = makeBatch();
    const quebras = [makeQuebra({ batchId: 'other-batch', quantityLost: 999 })];
    const calc = calculateBatch(batch, quebras);

    assert.equal(calc.remainingQuantity, 100);
    assert.equal(calc.totalQuebraQuantity, 0);
  });
});

describe('calculateBatch — excessive quebra does not create negative valuation (V-5)', () => {
  it('quebra quantity exceeding batch quantity floors remaining quantity at zero, not negative', () => {
    const batch = makeBatch({ quantity: 100 });
    const quebras = [makeQuebra({ quantityLost: 150 })]; // 50 more than exists

    const calc = calculateBatch(batch, quebras);

    assert.equal(calc.remainingQuantity, 0); // floored, not -50
    assert.equal(calc.investmentValue, 0); // not negative
    assert.equal(calc.marketValue, 0); // not negative
  });

  it('Embedded Profit remains valid (zero, not negative) when quebra exceeds batch quantity', () => {
    const batch = makeBatch({ quantity: 100, costPrice: 10, sellingPrice: 15 });
    const quebras = [makeQuebra({ quantityLost: 150 })];

    const calc = calculateBatch(batch, quebras);

    assert.equal(calc.embeddedProfit, 0); // marketValue(0) - investmentValue(0)
    assert.ok(calc.embeddedProfit >= 0, 'embeddedProfit must never be negative from an over-quebra\'d batch');
  });

  it('the audit trail (totalQuebraQuantity, quebraValue) still reflects the real, unclamped excess', () => {
    const batch = makeBatch({ quantity: 100, costPrice: 10 });
    const quebras = [makeQuebra({ quantityLost: 150 })];

    const calc = calculateBatch(batch, quebras);

    // These are audit/loss figures, not "remaining inventory value" — V-5
    // explicitly leaves them untouched so the fact that excessive quebra
    // occurred is fully preserved, not silently hidden by the valuation fix.
    assert.equal(calc.totalQuebraQuantity, 150);
    assert.equal(calc.quebraValue, 1500); // 150 * 10, unclamped
  });

  it('hasExceededWarning still fires exactly as before V-5', () => {
    const batch = makeBatch({ quantity: 100 });
    const overQuebras = [makeQuebra({ quantityLost: 101 })];
    const exactQuebras = [makeQuebra({ quantityLost: 100 })];
    const underQuebras = [makeQuebra({ quantityLost: 99 })];

    assert.equal(calculateBatch(batch, overQuebras).hasExceededWarning, true);
    assert.equal(calculateBatch(batch, exactQuebras).hasExceededWarning, false);
    assert.equal(calculateBatch(batch, underQuebras).hasExceededWarning, false);
  });

  it('summing multiple quebras that together exceed batch quantity still floors at zero', () => {
    const batch = makeBatch({ quantity: 100 });
    const quebras = [
      makeQuebra({ id: 'q1', quantityLost: 60 }),
      makeQuebra({ id: 'q2', quantityLost: 60 }), // 120 total, 20 over
    ];

    const calc = calculateBatch(batch, quebras);

    assert.equal(calc.totalQuebraQuantity, 120); // audit trail: real, unclamped
    assert.equal(calc.remainingQuantity, 0); // valuation: floored
    assert.equal(calc.investmentValue, 0);
    assert.equal(calc.marketValue, 0);
    assert.equal(calc.embeddedProfit, 0);
    assert.equal(calc.hasExceededWarning, true);
  });
});

describe('generateReportSummary — productDetails reflects period activity (V-4)', () => {
  it('an active period returns only products with activity in range', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Active Product' }),
      makeProduct({ id: 'p2', name: 'Inactive Product' }),
    ];
    const batches: StockBatch[] = [
      makeBatch({ id: 'b1', productId: 'p1', dateEntered: '2026-02-10', quantity: 20 }),
      // b2 belongs to p2 but falls OUTSIDE the report range below
      makeBatch({ id: 'b2', productId: 'p2', dateEntered: '2026-05-01', quantity: 20 }),
    ];

    const report = generateReportSummary(
      '2026-02-01', '2026-02-28',
      products, batches, [], [], []
    );

    assert.equal(report.productDetails.length, 1);
    assert.equal(report.productDetails[0].product.id, 'p1');
  });

  it('a period with zero activity returns an empty productDetails collection, not the full product list', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Product One' }),
      makeProduct({ id: 'p2', name: 'Product Two' }),
    ];
    const batches: StockBatch[] = [
      // both batches dated well outside the queried range
      makeBatch({ id: 'b1', productId: 'p1', dateEntered: '2026-01-01', quantity: 10 }),
      makeBatch({ id: 'b2', productId: 'p2', dateEntered: '2026-01-01', quantity: 10 }),
    ];

    const report = generateReportSummary(
      '2026-06-01', '2026-06-30',
      products, batches, [], [], []
    );

    assert.deepEqual(report.productDetails, []); // empty, not a fallback to all products
  });

  it('scalar totals are unaffected by the productDetails filter — a genuinely empty period sums to zero', () => {
    const products = [makeProduct({ id: 'p1' })];
    const batches: StockBatch[] = [
      makeBatch({ id: 'b1', productId: 'p1', dateEntered: '2026-01-01', quantity: 10 }),
    ];

    const report = generateReportSummary(
      '2026-06-01', '2026-06-30',
      products, batches, [], [], []
    );

    assert.equal(report.productDetails.length, 0);
    assert.equal(report.totalEmbeddedProfit, 0);
    assert.equal(report.totalExpenses, 0);
    assert.equal(report.totalWithdrawals, 0);
  });

  it('scalar totals for an ACTIVE period are unchanged by the V-4 correction (sum full productDetails, not just active)', () => {
    const products = [makeProduct({ id: 'p1', costPrice: 10, sellingPrice: 15 })];
    const batches: StockBatch[] = [
      makeBatch({ id: 'b1', productId: 'p1', dateEntered: '2026-02-10', quantity: 20, costPrice: 10, sellingPrice: 15 }),
    ];
    const expenses = [{ id: 'e1', date: '2026-02-15', description: 'rent', amount: 500, createdAt: '2026-02-15T00:00:00.000Z' }];
    const withdrawals = [{ id: 'w1', date: '2026-02-20', amount: 200, createdAt: '2026-02-20T00:00:00.000Z' }];

    const report = generateReportSummary(
      '2026-02-01', '2026-02-28',
      products, batches, [], expenses, withdrawals
    );

    assert.equal(report.productDetails.length, 1);
    assert.equal(report.totalEmbeddedProfit, 100); // 20 * (15-10)
    assert.equal(report.totalExpenses, 500);
    assert.equal(report.totalWithdrawals, 200);
  });
});
