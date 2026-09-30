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

  // ---- Purchase profit must accumulate; restocking closes the old batch ----
  const mk = (id: string, status: string, qty: number, cost: number, sell: number, createdAt: string): any =>
    ({ id, productId: 'p1', quantity: qty, costPrice: cost, sellingPrice: sell, status, createdAt, dateEntered: createdAt.slice(0, 10) });
  const snapWithOld: any = { ...snap, embeddedProfitTotal: 1000 };
  const A = (status: string) => mk('A', status, 100, 10, 20, '2026-08-20T10:00:00Z'); // existed at the count, profit 1,000 already inside it
  const B1 = (status: string) => mk('B1', status, 100, 10, 25, '2026-09-05T10:00:00Z'); // profit 1,500
  const B2 = (status: string) => mk('B2', status, 50, 10, 30, '2026-09-12T10:00:00Z'); // profit 1,000
  const w2 = (batches: any[], over: Record<string, unknown> = {}) =>
    getEstimatedBusinessWorth({ snapshots: [snapWithOld], initialStockCount: null, asOfDate: '2026-09-30', quebras: [], expenses: [], withdrawals: [], batches, ...over } as any);

  it('nothing bought since the count: worth equals the count', () => {
    assert.equal(w2([A('open')]), 500000);
  });
  it('a restock (old batch closed, new one open) ADDS the new purchase profit — the old batch profit is not erased', () => {
    assert.equal(w2([A('closed'), B1('open')]), 501500);
  });
  it('every purchase since the count adds its profit, even after later purchases closed the earlier ones', () => {
    assert.equal(w2([A('closed'), B1('closed'), B2('open')]), 502500);
  });
  it('a Quebra on a batch that existed at the count removes its full selling value (qty x selling price)', () => {
    // 10 units x selling 20 = 200
    assert.equal(w2([A('open')], { quebras: [q('qa', 10, '2026-09-10T10:00:00Z')].map((x) => ({ ...x, batchId: 'A' })) }), 500000 - 200);
  });
  it('a Quebra on a purchase made after the count removes its full selling value, even if that batch was later closed', () => {
    // B1: +1,500 profit; 20 lost x selling 25 = 500 lost in total vs. no quebra => net +1,000 after cost/profit split
    const lost = [{ ...q('qb', 20, '2026-09-15T10:00:00Z'), batchId: 'B1' }];
    const without = w2([A('closed'), B1('closed'), B2('open')]);
    const withQ = w2([A('closed'), B1('closed'), B2('open')], { quebras: lost });
    assert.equal(without - withQ, 20 * 25);
  });
  it('a purchase on credit is neutral at cost; only its embedded profit counts', () => {
    const payable: any = { id: 'pay1', amountRemaining: 1000, totalAmount: 1000, sourcePurchaseBatchId: 'pb1', createdAt: '2026-09-05T10:00:00Z' };
    assert.equal(w2([A('closed'), B1('open')], { payables: [payable] }), 501500);
  });
});

