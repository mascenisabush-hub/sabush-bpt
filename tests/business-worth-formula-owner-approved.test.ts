// Owner-approved Business Worth formula (live):
//   latest stock count + embedded profits + Owner investment + receivables
//   ONLY when paid − Levantamentos − Quebras − Expenses.
// Regression for the bug where a Quebra's COST was never subtracted.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getEstimatedBusinessWorth, computeQuebraCostLost } from '../apps/tenant/src/utils/calculations';

const ts = (iso: string) => ({ toMillis: () => new Date(iso).getTime() }) as any;
const snap: any = { id: 's1', status: 'active', confirmedAt: ts('2026-09-01T10:00:00Z'), measuredBusinessWorth: 500000, embeddedProfitTotal: 0, payablesPosition: 0 };
const batch: any = { id: 'b1', productId: 'p1', quantity: 100, costPrice: 1000, sellingPrice: 1100, status: 'open', createdAt: '2026-09-05T10:00:00Z', date: '2026-09-05' };
const q = (id: string, qty: number, createdAt: string): any => ({ id, batchId: 'b1', productId: 'p1', date: createdAt.slice(0, 10), quantityLost: qty, reason: 'x', createdAt });
const base = { snapshots: [snap], initialStockCount: null, asOfDate: '2026-09-30' };
const worth = (over: Record<string, unknown> = {}) =>
  getEstimatedBusinessWorth({ ...base, batches: [batch], quebras: [], expenses: [], withdrawals: [], ...over } as any);

describe('live Business Worth — owner-approved formula', () => {
  it('baseline: count + embedded profit of a cash purchase (asset conversion, cost neutral)', () => {
    assert.equal(worth(), 510000);
  });
  it('a Quebra after the count subtracts its full market value: cost + lost embedded profit', () => {
    assert.equal(worth({ quebras: [q('q1', 10, '2026-09-10T10:00:00Z')] }), 499000);
  });
  it('a Quebra recorded BEFORE the count is already reflected in it — not subtracted again', () => {
    assert.equal(worth({ quebras: [q('q0', 10, '2026-08-20T10:00:00Z')] }), 510000 - 1000);
  });
  it('an over-logged Quebra never subtracts more than the batch held', () => {
    assert.equal(computeQuebraCostLost([batch], [q('q9', 150, '2026-09-10T10:00:00Z')]), 100 * 1000);
  });
  it('Owner investment adds; Levantamento and Expense subtract', () => {
    const oi: any = { id: 'o1', amount: 20000, createdAt: '2026-09-12T10:00:00Z', date: '2026-09-12' };
    const w: any = { id: 'w1', amount: 5000, createdAt: '2026-09-13T10:00:00Z', date: '2026-09-13' };
    const e: any = { id: 'e1', amount: 3000, createdAt: '2026-09-14T10:00:00Z', date: '2026-09-14' };
    assert.equal(worth({ ownerInvestments: [oi] }), 530000);
    assert.equal(worth({ withdrawals: [w] }), 505000);
    assert.equal(worth({ expenses: [e] }), 507000);
  });
  it('a receivable counts ONLY when paid: a recorded-but-unpaid one changes nothing, a received payment adds', () => {
    assert.equal(worth({ cashLedgerEntries: [] }), 510000);
    const paid: any = { id: 'c1', category: 'customer-payment', direction: 'inflow', amount: 8000, createdAt: '2026-09-15T10:00:00Z' };
    assert.equal(worth({ cashLedgerEntries: [paid] }), 518000);
  });
  it('paying a supplier for stock already counted does not reduce worth a second time', () => {
    const payable: any = { id: 'p1', amountRemaining: 0, totalAmount: 10000, sourcePurchaseBatchId: 'pb1', createdAt: '2026-09-06T10:00:00Z' };
    const paid: any = { id: 'c2', category: 'supplier-payment', direction: 'outflow', amount: 10000, createdAt: '2026-09-16T10:00:00Z' };
    assert.equal(worth({ payables: [payable], cashLedgerEntries: [paid] }), 510000);
  });
});
