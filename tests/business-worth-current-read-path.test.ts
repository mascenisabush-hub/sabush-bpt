// getCurrentBusinessWorth unit tests — Business Worth Evolution,
// Implementation Authorization Increment 1 (Foundation), CORRECTED per
// Specification §41 (Accepted 22 August 2026) and the Implementation
// Plan's own §6/§7 correction (Accepted 22 August 2026).
//
// SCOPE: proves the corrected, LIVE Current Business Worth calculation
// (Specification §7, §41, FR-1, FR-3, FR-4, I-1) in isolation — a pure
// function, no Firestore/AppContext dependency. Does NOT test the atomic
// snapshot-writing side of Increment 1 (recordStockCount's own
// batch-write extension) — that is a Firestore-level property, covered
// separately by tests/business-worth-snapshot-foundation.test.ts.
//
// [Correction, this pass] The previous version of this suite asserted
// the OPPOSITE of what is now required — it had a test explicitly titled
// "is a pure read — never independently recomputes a value from any
// other input," pinning the function's OLD, now-superseded, frozen-only
// signature. That assertion is removed; the corrected suite instead
// proves the function DOES incorporate governed activity since the
// snapshot, using only existing sources (embedded profit delta,
// Expenses, Levantamentos) — never a fabricated Receivables/Payables/Cash
// term, which remains correctly deferred to Increment 3.
//
// HOW TO RUN:
//   node --test tests/business-worth-current-read-path.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getCurrentBusinessWorth } from '../apps/tenant/src/utils/calculations';
import { BusinessWorthSnapshot, StockBatch, Quebra, Expense, Withdrawal } from '../apps/tenant/src/types';

// A minimal fake Timestamp — the real Firestore SDK's Timestamp exposes
// toMillis(); getCurrentBusinessWorth's own toMillis() helper (internal
// to calculations.ts) is written to tolerate exactly this shape, so
// tests never need the real firebase/firestore SDK loaded.
function fakeTimestamp(isoDate: string) {
  const ms = new Date(isoDate).getTime();
  return { toMillis: () => ms };
}

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  // cashPosition/receivablesPosition/payablesPosition/
  // estimatedBusinessWorthImmediatelyBefore/difference are OMITTED here
  // by default, matching the corrected BusinessWorthSnapshot interface
  // exactly (all five are optional, never a fabricated 0/null).
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

// Helper to call the function with only the parameters a given test cares
// about, defaulting every collection to empty.
function call(params: {
  snapshots?: BusinessWorthSnapshot[] | null;
  batches?: StockBatch[];
  quebras?: Quebra[];
  expenses?: Expense[];
  withdrawals?: Withdrawal[];
  asOfDate?: string;
}) {
  return getCurrentBusinessWorth({
    snapshots: params.snapshots ?? [],
    batches: params.batches ?? [],
    quebras: params.quebras ?? [],
    expenses: params.expenses ?? [],
    withdrawals: params.withdrawals ?? [],
    asOfDate: params.asOfDate,
  });
}

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'p1',
    quantity: 10,
    costPrice: 50,
    sellingPrice: 80,
    date: '2026-08-01',
    status: 'open',
    ...overrides,
  } as StockBatch;
}

describe('getCurrentBusinessWorth — FR-1, FR-3, I-1 (UNKNOWN / snapshot selection)', () => {
  it('returns UNKNOWN for an empty snapshot list (a business with no confirmed new-model Contagem yet)', () => {
    assert.equal(call({ snapshots: [] }), 'UNKNOWN');
  });

  it('returns UNKNOWN for null snapshots, never throwing', () => {
    assert.equal(call({ snapshots: null }), 'UNKNOWN');
  });

  it('returns the single snapshot\'s measuredBusinessWorth when exactly one exists and no activity has occurred since', () => {
    const snap = makeSnapshot({ measuredBusinessWorth: 123456 });
    assert.equal(call({ snapshots: [snap], asOfDate: '2026-08-01' }), 123456);
  });

  it('selects the LATEST snapshot by confirmedAt, not the last one in array order', () => {
    const older = makeSnapshot({
      id: 'bws-1',
      measuredBusinessWorth: 100000,
      confirmedAt: fakeTimestamp('2026-06-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const newer = makeSnapshot({
      id: 'bws-2',
      measuredBusinessWorth: 200000,
      confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    assert.equal(call({ snapshots: [newer, older], asOfDate: '2026-08-01' }), 200000);
    assert.equal(call({ snapshots: [older, newer], asOfDate: '2026-08-01' }), 200000);
  });

  it('never returns a corrected/superseded snapshot\'s value as current (forward-compatible with the not-yet-implemented Increment 8 mechanism)', () => {
    const superseded = makeSnapshot({
      id: 'bws-1',
      measuredBusinessWorth: 999999,
      status: 'superseded-by-recovery',
      confirmedAt: fakeTimestamp('2026-08-10T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const active = makeSnapshot({
      id: 'bws-2',
      measuredBusinessWorth: 505000,
      status: 'active',
      confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    assert.equal(call({ snapshots: [superseded, active], asOfDate: '2026-08-10' }), 505000);
  });

  it('returns UNKNOWN when every snapshot has been superseded', () => {
    const superseded = makeSnapshot({ status: 'corrected' });
    assert.equal(call({ snapshots: [superseded] }), 'UNKNOWN');
  });
});

describe('getCurrentBusinessWorth — §41: Current Business Worth is LIVE, not a frozen read', () => {
  it('is unchanged when no governed activity has occurred since the snapshot', () => {
    const snap = makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 30000 });
    const result = call({
      snapshots: [snap],
      batches: [makeBatch({ costPrice: 50, sellingPrice: 80, quantity: 1000 })], // same embedded profit as snapshot
      asOfDate: '2026-08-01',
    });
    // 1000 * (80-50) = 30000 embedded profit now, same as snapshot's own
    // 30000 -> delta 0 -> no change from the snapshot's own baseline.
    assert.equal(result, 500000);
  });

  it('increases when embedded profit has grown since the snapshot (e.g. a new purchase batch)', () => {
    const snap = makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 });
    const result = call({
      snapshots: [snap],
      // A new batch not present at snapshot time: embedded profit = 10*(80-50) = 300
      batches: [makeBatch({ id: 'new-batch', quantity: 10, costPrice: 50, sellingPrice: 80 })],
      asOfDate: '2026-08-05',
    });
    assert.equal(result, 500300);
  });

  it('decreases by Expenses recorded since the snapshot, from the existing Expense collection', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [
        { id: 'e1', date: '2026-08-03', description: 'Rent', amount: 15000, createdAt: '2026-08-03T00:00:00.000Z' },
      ],
      asOfDate: '2026-08-05',
    });
    assert.equal(result, 485000);
  });

  it('decreases by Levantamentos (Withdrawals) recorded since the snapshot, from the existing Withdrawal collection', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      withdrawals: [
        { id: 'w1', date: '2026-08-04', amount: 20000, createdAt: '2026-08-04T00:00:00.000Z' },
      ],
      asOfDate: '2026-08-05',
    });
    assert.equal(result, 480000);
  });

  it('ignores Expenses/Withdrawals recorded BEFORE the snapshot — only activity since counts', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-08-10T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [{ id: 'e1', date: '2026-08-01', description: 'Old', amount: 99999, createdAt: '2026-08-01T00:00:00.000Z' }],
      withdrawals: [{ id: 'w1', date: '2026-08-05', amount: 99999, createdAt: '2026-08-05T00:00:00.000Z' }],
      asOfDate: '2026-08-15',
    });
    assert.equal(result, 500000);
  });

  it('combines embedded-profit growth, Expenses, and Levantamentos correctly, all in one calculation', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      batches: [makeBatch({ id: 'new-batch', quantity: 10, costPrice: 50, sellingPrice: 80 })], // +300 embedded profit
      expenses: [{ id: 'e1', date: '2026-08-03', description: 'Rent', amount: 5000, createdAt: '2026-08-03T00:00:00.000Z' }],
      withdrawals: [{ id: 'w1', date: '2026-08-04', amount: 2000, createdAt: '2026-08-04T00:00:00.000Z' }],
      asOfDate: '2026-08-05',
    });
    // 500000 + 300 - 5000 - 2000 = 493300
    assert.equal(result, 493300);
  });
});

describe('getCurrentBusinessWorth — BDR Decision 15/16 worked example (cash-financed stock purchase)', () => {
  it('produces 505,000 — never 480,000 (treating the purchase as an expense) and never 530,000 (double-counting it)', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-08-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    // Owner buys stock with business cash: 25,000. This purchase itself
    // never appears as an Expense or a Withdrawal (it is not one) — only
    // the resulting batch's own embedded profit (5,000) reaches the
    // calculation, via the embedded-profit-delta mechanism. Batch built
    // so its own embedded profit is exactly 5,000: quantity 1000 *
    // (selling 30 - cost 25) = 1000*5 = 5000.
    const result = call({
      snapshots: [snap],
      batches: [makeBatch({ id: 'purchase', quantity: 1000, costPrice: 25, sellingPrice: 30 })],
      asOfDate: '2026-08-05',
    });
    assert.notEqual(result, 480000);
    assert.notEqual(result, 530000);
    assert.equal(result, 505000);
  });
});

describe('getCurrentBusinessWorth — Increment 3 deferral (no fabricated Receivables/Payables/Cash term)', () => {
  it('has no parameter for cash/receivables/payables at all — TypeScript itself enforces this is not a silent zero', () => {
    // This test exists to pin the function's own signature: it accepts
    // only snapshots/batches/quebras/expenses/withdrawals/asOfDate. There
    // is no cashPosition/receivablesPosition/payablesPosition parameter
    // to pass — a future Increment 3 caller will need to extend this
    // function's own signature additively, not merely pass a value that
    // already silently exists today.
    const snap = makeSnapshot({ measuredBusinessWorth: 500000 });
    // @ts-expect-error — cashPosition is not a valid parameter in Increment 1.
    const _shouldNotTypecheck = () => getCurrentBusinessWorth({ snapshots: [snap], batches: [], quebras: [], expenses: [], withdrawals: [], cashPosition: 100 });
    assert.equal(call({ snapshots: [snap], asOfDate: '2026-08-01' }), 500000);
  });
});
