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

describe('getCurrentBusinessWorth — Increment 1 Audit §2: same-day Contagem/activity boundary', () => {
  it('includes activity recorded on the SAME calendar date as confirmation, when it occurs after confirmation', () => {
    // 01 May: Contagem confirms at some moment; later the same day, +Stock
    // occurs, generating embedded profit. That activity must be included
    // — it must never be excluded merely because it shares the Contagem's
    // own calendar date.
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T09:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      batches: [makeBatch({ id: 'same-day-purchase', quantity: 10, costPrice: 50, sellingPrice: 80 })], // +300
      asOfDate: '2026-05-01',
    });
    assert.equal(result, 500300);
  });

  it('continues to include that same-day activity when queried on a later date (02 May)', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T09:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      batches: [makeBatch({ id: 'same-day-purchase', quantity: 10, costPrice: 50, sellingPrice: 80 })],
      asOfDate: '2026-05-02',
    });
    assert.equal(result, 500300);
  });

  it('[REGRESSION — Increment 1 financial-integrity audit, corrected] an Expense created BEFORE the snapshot confirmation, even on the same calendar date, is NOT double-subtracted', () => {
    // Reproduction of the audit's own finding: an Expense dated 2026-05-01
    // was already created (createdAt 09:00) BEFORE the Contagem was
    // confirmed (confirmedAt 15:00) the same day. computeMeasuredBusinessWorth's
    // own totalExpensesAllTime input (AppContext.tsx) sums ALL
    // currently-existing Expense records with no date filter — so this
    // Expense is ALREADY subtracted into the snapshot's own frozen
    // measuredBusinessWorth. The CORRECTED function now compares this
    // Expense's own `createdAt` (09:00) against the snapshot's
    // `confirmedAt` (15:00) — since createdAt <= confirmedAt, it is
    // correctly excluded from the post-snapshot delta, avoiding the
    // double subtraction the previous, date-based implementation produced
    // (485,000 — see git history for the prior, defective test).
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000, // frozen; already reflects the 09:00 Rent expense via totalExpensesAllTime
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T15:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'], // confirmed at 15:00
    });
    const result = call({
      snapshots: [snap],
      expenses: [
        { id: 'e1', date: '2026-05-01', description: 'Rent (recorded 09:00, before confirmation)', amount: 15000, createdAt: '2026-05-01T09:00:00.000Z' },
      ],
      asOfDate: '2026-05-01',
    });
    assert.equal(result, 500000, 'The pre-confirmation same-day Expense must not be counted a second time.');
  });

  it('a Levantamento (Withdrawal) created BEFORE the snapshot confirmation, same calendar date, is NOT double-subtracted', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T15:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      withdrawals: [
        { id: 'w1', date: '2026-05-01', amount: 20000, createdAt: '2026-05-01T10:00:00.000Z' },
      ],
      asOfDate: '2026-05-01',
    });
    assert.equal(result, 500000);
  });

  it('an Expense created AFTER the snapshot confirmation, same calendar date, IS included', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T15:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [
        { id: 'e2', date: '2026-05-01', description: 'Post-confirmation expense', amount: 4000, createdAt: '2026-05-01T16:00:00.000Z' },
      ],
      asOfDate: '2026-05-01',
    });
    assert.equal(result, 496000);
  });

  it('a Levantamento created AFTER the snapshot confirmation, same calendar date, IS included', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T15:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      withdrawals: [
        { id: 'w2', date: '2026-05-01', amount: 3000, createdAt: '2026-05-01T16:00:00.000Z' },
      ],
      asOfDate: '2026-05-01',
    });
    assert.equal(result, 497000);
  });

  it('a BACKDATED Expense (business date before the snapshot) is still included, because it was CREATED after confirmation', () => {
    // The exact scenario the correction targets: Contagem confirmed 01 May
    // 15:00; an Expense is entered on 03 May (createdAt), correcting a
    // forgotten expense whose own business date is 30 April — BEFORE the
    // snapshot. It must still be included, because it did not exist yet
    // at confirmation time and therefore was never subtracted into the
    // snapshot's own frozen measuredBusinessWorth.
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T15:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [
        { id: 'e3', date: '2026-04-30', description: 'Forgotten expense, entered late', amount: 2000, createdAt: '2026-05-03T10:00:00.000Z' },
      ],
      asOfDate: '2026-05-05',
    });
    assert.equal(result, 498000, 'A backdated expense created after confirmation must still be included.');
  });

  it('that same backdated Expense is EXCLUDED if asOfDate is before it was actually created', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T15:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [
        { id: 'e3', date: '2026-04-30', description: 'Forgotten expense, entered late', amount: 2000, createdAt: '2026-05-03T10:00:00.000Z' },
      ],
      asOfDate: '2026-05-02', // before the expense was actually created (05-03)
    });
    assert.equal(result, 500000);
  });
});

describe('getCurrentBusinessWorth — Increment 1 Audit §9: Quebras are informational only, never a second subtraction', () => {
  it('a Quebra after the snapshot reduces embedded profit via remainingQuantity, but is never separately subtracted again', () => {
    // A batch with 100 units, cost 10, selling 20 -> embedded profit at
    // full quantity = 100*(20-10) = 1000. A Quebra of 20 units reduces
    // remainingQuantity to 80 -> embedded profit = 80*(20-10) = 800. The
    // function has no separate "breakage" subtraction term — Quebra's
    // effect is folded entirely into the embedded-profit delta.
    const snap = makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 1000 });
    const quebra: Quebra = { id: 'q1', batchId: 'b1', productId: 'p1', date: '2026-08-02', quantityLost: 20, reason: 'Damaged', createdAt: '2026-08-02T00:00:00.000Z' };
    const result = call({
      snapshots: [snap],
      batches: [makeBatch({ id: 'b1', quantity: 100, costPrice: 10, sellingPrice: 20 })],
      quebras: [quebra],
      asOfDate: '2026-08-05',
    });
    // Embedded profit now = 800 (after quebra), snapshot's own = 1000 ->
    // delta = -200 -> 500000 - 200 = 499800. Never 500000 - 200 - (any
    // separate quebra-value subtraction) — there is no such term.
    assert.equal(result, 499800);
  });
});

describe('getCurrentBusinessWorth — Increment 1 Audit §11: multiple snapshots / baseline reset', () => {
  it('activity between snapshot A and snapshot B is excluded once B exists — B becomes the sole active baseline', () => {
    const snapA = makeSnapshot({
      id: 'bws-A',
      measuredBusinessWorth: 500000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    // Activity that occurred strictly between A and B.
    const activityBetween = {
      expenses: [{ id: 'e1', date: '2026-05-10', description: 'Between A and B', amount: 3000, createdAt: '2026-05-10T00:00:00.000Z' }],
    };

    // Before B exists: this activity correctly reduces the live figure below A.
    const beforeB = call({ snapshots: [snapA], expenses: activityBetween.expenses, asOfDate: '2026-05-15' });
    assert.equal(beforeB, 497000);

    // Now Contagem B is confirmed on 2026-05-20 at 520,000 (a fresh
    // measurement, not a pure roll-forward of A + activity).
    const snapB = makeSnapshot({
      id: 'bws-B',
      measuredBusinessWorth: 520000,
      embeddedProfitTotal: 0,
      confirmedAt: fakeTimestamp('2026-05-20T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });

    // With both A and B present, and no activity after B, Current must be
    // exactly B's own value — the 05-10 expense (between A and B) must
    // NOT continue to reduce the figure once B is the active baseline.
    const afterB = call({ snapshots: [snapA, snapB], expenses: activityBetween.expenses, asOfDate: '2026-05-25' });
    assert.equal(afterB, 520000);
  });

  it('activity genuinely after B is still correctly included', () => {
    const snapA = makeSnapshot({
      id: 'bws-A',
      measuredBusinessWorth: 500000,
      confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const snapB = makeSnapshot({
      id: 'bws-B',
      measuredBusinessWorth: 520000,
      confirmedAt: fakeTimestamp('2026-05-20T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snapA, snapB],
      expenses: [{ id: 'e2', date: '2026-05-22', description: 'After B', amount: 1000, createdAt: '2026-05-22T00:00:00.000Z' }],
      asOfDate: '2026-05-25',
    });
    assert.equal(result, 519000);
  });
});

describe('getCurrentBusinessWorth — Increment 1 Audit §12: asOfDate precision', () => {
  it('excludes activity dated AFTER the requested asOfDate', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [{ id: 'e1', date: '2026-05-10', description: 'Later', amount: 4000, createdAt: '2026-05-10T00:00:00.000Z' }],
      asOfDate: '2026-05-05', // before the 05-10 expense
    });
    assert.equal(result, 500000);
  });

  it('includes that same activity once asOfDate moves past it', () => {
    const snap = makeSnapshot({
      measuredBusinessWorth: 500000,
      confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = call({
      snapshots: [snap],
      expenses: [{ id: 'e1', date: '2026-05-10', description: 'Later', amount: 4000, createdAt: '2026-05-10T00:00:00.000Z' }],
      asOfDate: '2026-05-15', // after the 05-10 expense
    });
    assert.equal(result, 496000);
  });
});

describe('getCurrentBusinessWorth — Increment 1 Audit §10/§15/§19: immutability and idempotency', () => {
  it('never mutates the snapshot object it reads (historical immutability, at the pure-function level)', () => {
    const snap = makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 });
    const frozenCopy = JSON.parse(JSON.stringify({ ...snap, confirmedAt: '2026-08-01T00:00:00.000Z' }));
    call({
      snapshots: [snap],
      batches: [makeBatch({ quantity: 10, costPrice: 50, sellingPrice: 80 })],
      expenses: [{ id: 'e1', date: '2026-08-02', description: 'X', amount: 1000, createdAt: '2026-08-02T00:00:00.000Z' }],
      asOfDate: '2026-08-05',
    });
    const afterCopy = JSON.parse(JSON.stringify({ ...snap, confirmedAt: '2026-08-01T00:00:00.000Z' }));
    assert.deepEqual(afterCopy, frozenCopy, 'The snapshot object must be byte-for-byte unchanged after the call.');
    assert.equal(snap.measuredBusinessWorth, 500000, 'measuredBusinessWorth itself must never change.');
  });

  it('repeated calls with identical inputs return identical results (pure, idempotent read)', () => {
    const snap = makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 });
    const params = {
      snapshots: [snap],
      batches: [makeBatch({ quantity: 10, costPrice: 50, sellingPrice: 80 })],
      expenses: [{ id: 'e1', date: '2026-08-02', description: 'X', amount: 1000, createdAt: '2026-08-02T00:00:00.000Z' }],
      asOfDate: '2026-08-05',
    };
    const first = call(params);
    const second = call(params);
    const third = call(params);
    assert.equal(first, second);
    assert.equal(second, third);
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
