// Business Worth Evolution — Implementation Authorization, Increment 3
// ("Cash Ledger + Receivables + Payables").
//
// SCOPE: proves the extended getCurrentBusinessWorth/getEstimatedBusinessWorth
// (calculations.ts) — the ONE shared calculation, now incorporating the
// Payables outstanding-balance delta and the customer-payment/
// supplier-payment CashLedgerEntry delta, per Implementation Plan §7's own
// mechanical clarification of the "±Receivables/Payables/Cash position
// changes" term. Pure functions only, no Firestore/AppContext dependency.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-cash-receivables-payables.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  getCurrentBusinessWorth,
  getEstimatedBusinessWorth,
  sumOutstandingPayables,
  sumOutstandingReceivables,
} from '../apps/tenant/src/utils/calculations';
import {
  BusinessWorthSnapshot,
  StockBatch,
  Quebra,
  Expense,
  Withdrawal,
  Payable,
  CashLedgerEntry,
  Receivable,
  StockCount,
} from '../apps/tenant/src/types';

function fakeTimestamp(isoDate: string) {
  const ms = new Date(isoDate).getTime();
  return { toMillis: () => ms };
}

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  return {
    id: 'bws-1',
    businessId: 'biz1',
    sourceStockCountId: 'stockcount-1',
    confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    measuredBusinessWorth: 500000,
    productValuationTotal: 500000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: '2026-08-01T03:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'p1',
    dateEntered: '2026-08-01',
    quantity: 10,
    costPrice: 50,
    sellingPrice: 80,
    status: 'open',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  } as StockBatch;
}

function makePayable(overrides: Partial<Payable> = {}): Payable {
  return {
    id: 'payable-1',
    businessId: 'biz1',
    sourcePurchaseBatchId: 'pbatch-1',
    totalAmount: 25000,
    amountPaid: 0,
    amountRemaining: 25000,
    status: 'unpaid',
    createdAt: '2026-08-05T00:00:00.000Z',
    ...overrides,
  };
}

function makeCashLedgerEntry(overrides: Partial<CashLedgerEntry> = {}): CashLedgerEntry {
  return {
    id: 'cle-1',
    businessId: 'biz1',
    direction: 'inflow',
    amount: 100,
    category: 'customer-payment',
    sourceReference: { type: 'receivable', id: 'receivable-1' },
    occurredAt: '2026-08-05T00:00:00.000Z',
    createdAt: '2026-08-05T00:00:00.000Z',
    createdBy: 'uid-1',
    ...overrides,
  };
}

function makeReceivable(overrides: Partial<Receivable> = {}): Receivable {
  return {
    id: 'receivable-1',
    businessId: 'biz1',
    totalAmount: 200,
    amountPaid: 0,
    amountRemaining: 200,
    status: 'unpaid',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function callCurrent(params: {
  snapshots?: BusinessWorthSnapshot[] | null;
  batches?: StockBatch[];
  quebras?: Quebra[];
  expenses?: Expense[];
  withdrawals?: Withdrawal[];
  payables?: Payable[];
  cashLedgerEntries?: CashLedgerEntry[];
  asOfDate?: string;
}) {
  return getCurrentBusinessWorth({
    snapshots: params.snapshots ?? [],
    batches: params.batches ?? [],
    quebras: params.quebras ?? [],
    expenses: params.expenses ?? [],
    withdrawals: params.withdrawals ?? [],
    payables: params.payables,
    cashLedgerEntries: params.cashLedgerEntries,
    asOfDate: params.asOfDate,
  });
}

describe('Increment 3 — Test Requirement #28: 500,000 + 25,000 stock cost + 5,000 embedded profit = 505,000 (regression)', () => {
  it('a cash-financed stock purchase (no Payable, no CashLedgerEntry) is unaffected by the Increment 3 extension', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    // A cash-financed purchase producing 5,000 embedded profit.
    const batches = [makeBatch({ id: 'b-new', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-08-05T00:00:00.000Z' })];
    assert.equal(callCurrent({ snapshots, batches }), 505000);
    // Identical result whether or not empty payables/cashLedgerEntries
    // arrays are explicitly passed — confirms the new params are purely
    // additive, never a fabricated effect.
    assert.equal(callCurrent({ snapshots, batches, payables: [], cashLedgerEntries: [] }), 505000);
  });
});

describe('Increment 3 — Example C / Payables: supplier-credit purchase reduces Business Worth once, at recording time (FIN-4)', () => {
  it('an outstanding Payable recorded after the snapshot reduces Current Business Worth by its own outstanding amount', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const batches = [makeBatch({ id: 'b-credit', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-08-05T00:00:00.000Z' })];
    const payables = [makePayable({ totalAmount: 25000, amountRemaining: 25000, createdAt: '2026-08-05T00:00:00.000Z' })];
    // 500,000 + 5,000 embedded profit - 25,000 outstanding payable = 480,000.
    assert.equal(callCurrent({ snapshots, batches, payables }), 480000);
  });

  it('Test Requirement #32: paying off the Payable in full does not erase the stock purchase\'s own economic value — worth stays flat through the payment (FIN-5, settles rather than doubly reduces)', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const batches = [makeBatch({ id: 'b-credit', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-08-05T00:00:00.000Z' })];
    // Snapshot's own payablesPosition baseline is 0 (predates this payable).
    const beforePayment = callCurrent({
      snapshots,
      batches,
      payables: [makePayable({ totalAmount: 25000, amountRemaining: 25000 })],
    });

    // Now the payable is fully paid: amountRemaining -> 0, and a
    // supplier-payment CashLedgerEntry for the same amount exists.
    const afterPayment = callCurrent({
      snapshots,
      batches,
      payables: [makePayable({ totalAmount: 25000, amountPaid: 25000, amountRemaining: 0, status: 'paid' })],
      cashLedgerEntries: [
        makeCashLedgerEntry({
          id: 'cle-supplier-1',
          direction: 'outflow',
          amount: 25000,
          category: 'supplier-payment',
          sourceReference: { type: 'payable', id: 'payable-1' },
          createdAt: '2026-08-10T00:00:00.000Z',
        }),
      ],
    });

    assert.equal(beforePayment, 480000);
    assert.equal(afterPayment, 480000, 'Worth must remain flat through the payment — never a second reduction, and never a reversal of the original reduction.');
  });

  it('a Payable that already existed AT the snapshot (baked into payablesPosition) contributes nothing further unless its own balance changes afterward', () => {
    // The snapshot itself already "knows about" this 25,000 outstanding
    // payable (its own frozen payablesPosition baseline) — Current
    // Business Worth must not subtract it a second time.
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 480000, embeddedProfitTotal: 5000, payablesPosition: 25000 })];
    const batches = [makeBatch({ id: 'b-credit', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-07-01T00:00:00.000Z' })];
    const payables = [makePayable({ totalAmount: 25000, amountRemaining: 25000, createdAt: '2026-07-01T00:00:00.000Z' })];
    assert.equal(callCurrent({ snapshots, batches, payables }), 480000);
  });
});

describe('Increment 3 — Example B / Receivables: an unpaid Receivable never contributes; a payment received genuinely increases worth (FIN-3)', () => {
  it('an outstanding, unpaid Receivable has zero effect on Current Business Worth', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    // Receivable creation itself has no CashLedgerEntry and touches no
    // Payable — this function has no "receivables outstanding" input at
    // all (by design, see calculations.ts's own doc comment) — so it is
    // structurally impossible for an unpaid Receivable to move this
    // number, with or without one existing.
    assert.equal(callCurrent({ snapshots }), 500000);
  });

  it('Test Requirement #31: a payment actually received increases Current Business Worth by exactly the paid amount — never counted twice, never net zero', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const cashLedgerEntries = [
      makeCashLedgerEntry({
        direction: 'inflow',
        amount: 200,
        category: 'customer-payment',
        createdAt: '2026-08-05T00:00:00.000Z',
      }),
    ];
    assert.equal(callCurrent({ snapshots, cashLedgerEntries }), 500200);
  });

  it('multiple receivable payments accumulate additively, never capped or netted against each other', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const cashLedgerEntries = [
      makeCashLedgerEntry({ id: 'cle-a', amount: 200, createdAt: '2026-08-05T00:00:00.000Z' }),
      makeCashLedgerEntry({ id: 'cle-b', amount: 150, createdAt: '2026-08-06T00:00:00.000Z' }),
    ];
    assert.equal(callCurrent({ snapshots, cashLedgerEntries }), 500350);
  });
});

describe('Increment 3 — Test Requirement #29/#30/#33: Expense/Levantamento/cash-purchase never double-subtracted via the Cash Ledger', () => {
  it('an expense\'s own CashLedgerEntry (category "expense") is completely excluded from the position-change term', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const expenses = [{ id: 'e1', date: '2026-08-05', createdAt: '2026-08-05T00:00:00.000Z', amount: 300, description: 'x' } as Expense];
    const cashLedgerEntries = [
      makeCashLedgerEntry({ id: 'cle-expense-1', direction: 'outflow', amount: 300, category: 'expense', sourceReference: { type: 'expense', id: 'e1' }, createdAt: '2026-08-05T00:00:00.000Z' }),
    ];
    // Only ONE subtraction of 300 (via the existing expensesSinceSnapshot
    // term) — not two.
    assert.equal(callCurrent({ snapshots, expenses, cashLedgerEntries }), 499700);
  });

  it('a levantamento\'s own CashLedgerEntry (category "levantamento") is completely excluded from the position-change term', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const withdrawals = [{ id: 'w1', date: '2026-08-05', createdAt: '2026-08-05T00:00:00.000Z', amount: 400 } as Withdrawal];
    const cashLedgerEntries = [
      makeCashLedgerEntry({ id: 'cle-levantamento-1', direction: 'outflow', amount: 400, category: 'levantamento', sourceReference: { type: 'withdrawal', id: 'w1' }, createdAt: '2026-08-05T00:00:00.000Z' }),
    ];
    assert.equal(callCurrent({ snapshots, withdrawals, cashLedgerEntries }), 499600);
  });

  it('a cash-financed stock purchase (no ledger entry at all) is untouched even with unrelated other-governed-movement noise present', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const batches = [makeBatch({ id: 'b-cash', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-08-05T00:00:00.000Z' })];
    const cashLedgerEntries = [
      makeCashLedgerEntry({ id: 'cle-other', direction: 'outflow', amount: 999, category: 'other-governed-movement', sourceReference: { type: 'other' }, createdAt: '2026-08-05T00:00:00.000Z' }),
    ];
    // 'other-governed-movement' is not customer-payment/supplier-payment
    // — excluded from this term entirely (reserved for a future governed
    // event this Plan doesn't yet define the effect of).
    assert.equal(callCurrent({ snapshots, batches, cashLedgerEntries }), 505000);
  });
});

describe('Increment 3 — activity strictly before the snapshot boundary is excluded (createdAt vs confirmedAt discipline preserved)', () => {
  it('a Payable/CashLedgerEntry created before the snapshot\'s own confirmedAt is not counted a second time', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-08-10T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'], measuredBusinessWorth: 480000, embeddedProfitTotal: 5000, payablesPosition: 25000 })];
    const batches = [makeBatch({ id: 'b-credit', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-08-05T00:00:00.000Z' })];
    const payables = [makePayable({ createdAt: '2026-08-05T00:00:00.000Z' })]; // before the snapshot
    const cashLedgerEntries = [makeCashLedgerEntry({ createdAt: '2026-08-05T00:00:00.000Z' })]; // before the snapshot
    assert.equal(callCurrent({ snapshots, batches, payables, cashLedgerEntries }), 480000);
  });
});

describe('Increment 3 — getEstimatedBusinessWorth Case B: ALL-TIME payables/cash-ledger treatment (no snapshot boundary exists yet)', () => {
  function makeInitialStockCount(overrides: Partial<StockCount> = {}): StockCount {
    return {
      id: 'initial-1',
      type: 'initial',
      date: '2026-01-01',
      items: [],
      totalValue: 500,
      totalSellingValue: 800,
      initialCapitalBasis: 'cost',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    } as StockCount;
  }

  it('an outstanding Payable reduces Estimated Business Worth in State 1a, exactly as it would post-snapshot', () => {
    const initialStockCount = makeInitialStockCount();
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    const payables = [makePayable({ totalAmount: 100, amountRemaining: 100 })];
    // Cost-basis Capital Inicial (500) + full embedded profit (300) - 100 outstanding payable = 700.
    const result = getEstimatedBusinessWorth({
      snapshots: [],
      initialStockCount,
      batches,
      quebras: [],
      expenses: [],
      withdrawals: [],
      payables,
    });
    assert.equal(result, 700);
  });

  it('a received customer-payment (ALL-TIME) increases Estimated Business Worth in State 1a', () => {
    const initialStockCount = makeInitialStockCount();
    const batches = [makeBatch({ id: 'initial-batch', quantity: 10, costPrice: 50, sellingPrice: 80, createdAt: '2026-01-01T00:00:00.000Z' })];
    const cashLedgerEntries = [makeCashLedgerEntry({ amount: 50, category: 'customer-payment' })];
    const result = getEstimatedBusinessWorth({
      snapshots: [],
      initialStockCount,
      batches,
      quebras: [],
      expenses: [],
      withdrawals: [],
      cashLedgerEntries,
    });
    // 500 + 300 + 50 = 850.
    assert.equal(result, 850);
  });
});

describe('Increment 3 — sumOutstandingPayables / sumOutstandingReceivables (pure helpers)', () => {
  it('sumOutstandingPayables sums amountRemaining across every Payable, regardless of status', () => {
    const payables = [
      makePayable({ id: 'p1', amountRemaining: 100 }),
      makePayable({ id: 'p2', amountRemaining: 50, status: 'partially-paid' }),
      makePayable({ id: 'p3', amountRemaining: 0, status: 'paid' }),
    ];
    assert.equal(sumOutstandingPayables(payables), 150);
  });

  it('sumOutstandingReceivables sums amountRemaining across every Receivable', () => {
    const receivables = [
      makeReceivable({ id: 'r1', amountRemaining: 200 }),
      makeReceivable({ id: 'r2', amountRemaining: 0, status: 'paid' }),
    ];
    assert.equal(sumOutstandingReceivables(receivables), 200);
  });

  it('empty arrays sum to zero, never NaN/undefined', () => {
    assert.equal(sumOutstandingPayables([]), 0);
    assert.equal(sumOutstandingReceivables([]), 0);
  });
});
