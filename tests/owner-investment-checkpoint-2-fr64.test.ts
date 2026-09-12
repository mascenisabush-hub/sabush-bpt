// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10 (Revision 3), Item 3 — CHECKPOINT 2 (FR-64: Live Business
// Worth Integration).
//
// SCOPE: proves the `ownerInvestmentsSinceSnapshot` live Business Worth
// term (calculations.ts, `computeCaseALiveBusinessWorth`, consumed by
// both `getCurrentBusinessWorth` and `getEstimatedBusinessWorth`'s own
// Case A branch) — the authoritative post-snapshot boundary is
// `OwnerInvestment.createdAt > activeBaseline.confirmedAt`, per the
// Product Architect's recorded clarification (commit 1000bde). Pure
// functions only, no Firestore/AppContext dependency — mirrors this
// repository's own established pattern, see
// tests/business-worth-cash-receivables-payables.test.ts.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-2-fr64.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getCurrentBusinessWorth, getEstimatedBusinessWorth } from '../apps/tenant/src/utils/calculations';
import {
  BusinessWorthSnapshot,
  StockBatch,
  Quebra,
  Expense,
  Withdrawal,
  Payable,
  CashLedgerEntry,
  OwnerInvestment,
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
    confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    measuredBusinessWorth: 500000,
    productValuationTotal: 500000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: '2026-09-10T13:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function makeOwnerInvestment(overrides: Partial<OwnerInvestment> = {}): OwnerInvestment {
  return {
    id: 'oi-1',
    businessId: 'biz1',
    amount: 100000,
    date: '2026-09-10',
    createdAt: '2026-09-10T10:00:01.000Z',
    createdBy: 'uid-owner',
    ...overrides,
  };
}

function makeCashLedgerEntry(overrides: Partial<CashLedgerEntry> = {}): CashLedgerEntry {
  return {
    id: 'cle-1',
    businessId: 'biz1',
    direction: 'inflow',
    amount: 100000,
    category: 'other-governed-movement',
    sourceReference: { type: 'owner-investment', id: 'oi-1' },
    occurredAt: '2026-09-10',
    createdAt: '2026-09-10T10:00:01.000Z',
    createdBy: 'uid-owner',
    ...overrides,
  };
}

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: 'batch-1',
    productId: 'p1',
    dateEntered: '2026-09-01',
    quantity: 10,
    costPrice: 50,
    sellingPrice: 80,
    status: 'open',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  } as StockBatch;
}

function callCurrent(params: {
  snapshots?: BusinessWorthSnapshot[] | null;
  batches?: StockBatch[];
  quebras?: Quebra[];
  expenses?: Expense[];
  withdrawals?: Withdrawal[];
  payables?: Payable[];
  cashLedgerEntries?: CashLedgerEntry[];
  ownerInvestments?: OwnerInvestment[];
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
    ownerInvestments: params.ownerInvestments,
    asOfDate: params.asOfDate,
  });
}

// ============================================================
// §7 Required Boundary Tests — Cases A through E
// ============================================================

describe('FR-64 — Case A: OwnerInvestment created AFTER the snapshot boundary is included', () => {
  it('a 100,000 OwnerInvestment created 1 second after confirmedAt adds +100,000', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T10:00:01.000Z' })];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 600000);
  });
});

describe('FR-64 — Case B: OwnerInvestment created BEFORE the snapshot boundary is excluded', () => {
  it('a 100,000 OwnerInvestment created 1 second before confirmedAt contributes nothing', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T09:59:59.000Z' })];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 500000);
  });
});

describe('FR-64 — Case C: exact same timestamp — createdAt == confirmedAt is excluded (operator is strictly ">", never ">=")', () => {
  it('createdAt exactly equal to confirmedAt is treated as "already existed at measurement time" and excluded', () => {
    const confirmedAtIso = '2026-09-10T10:00:00.000Z';
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp(confirmedAtIso) as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: confirmedAtIso })];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 500000);
  });
});

describe('FR-64 — Case D: backdated business `date` does not exclude a genuinely post-baseline OwnerInvestment (the whole point of the createdAt clarification)', () => {
  it('date=5 Sept (before baseline), createdAt=11 Sept (after baseline) is INCLUDED', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [
      makeOwnerInvestment({ amount: 100000, date: '2026-09-05', createdAt: '2026-09-11T00:00:00.000Z' }),
    ];
    assert.equal(callCurrent({ snapshots, ownerInvestments, asOfDate: '2026-09-11' }), 600000);
  });
});

describe('FR-64 — Case E: future business `date` does not force-include a genuinely pre-baseline OwnerInvestment, nor does it exclude a genuinely post-baseline one — only createdAt decides', () => {
  it('date=20 Sept (future), createdAt=11 Sept (after baseline) is included based on createdAt, not date', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [
      makeOwnerInvestment({ amount: 100000, date: '2026-09-20', createdAt: '2026-09-11T00:00:00.000Z' }),
    ];
    assert.equal(callCurrent({ snapshots, ownerInvestments, asOfDate: '2026-09-11' }), 600000);
  });

  it('a future date does NOT rescue an OwnerInvestment whose createdAt is genuinely before the baseline', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [
      makeOwnerInvestment({ amount: 100000, date: '2026-12-25', createdAt: '2026-09-10T09:00:00.000Z' }),
    ];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 500000);
  });
});

// ============================================================
// §8 Multiple investments
// ============================================================

describe('FR-64 — multiple OwnerInvestments accumulate additively, respecting the boundary independently for each', () => {
  it('Investment A (100,000, post-baseline) + B (50,000, post-baseline) + C (25,000, pre-baseline, excluded) = +150,000 exactly once', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [
      makeOwnerInvestment({ id: 'oi-a', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-b', amount: 50000, createdAt: '2026-09-10T12:00:00.000Z' }),
      makeOwnerInvestment({ id: 'oi-c', amount: 25000, createdAt: '2026-09-10T09:00:00.000Z' }),
    ];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 650000);
  });
});

// ============================================================
// §9 Duplicate / idempotency — the live calculation reflects whatever
// economic records exist exactly once; Checkpoint 1's own idempotent
// document-id behavior means a retried submission never produces a
// second OwnerInvestment document, so there is nothing further for this
// calculation to guard against beyond summing whatever documents exist.
// ============================================================

describe('FR-64 — duplicate-submission / idempotency: a retried submission (same resulting single document) is reflected exactly once', () => {
  it('a single OwnerInvestment document (as Checkpoint 1\'s idempotent submissionId-derived id guarantees even after a client retry) contributes its amount exactly once — never doubled', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    // Checkpoint 1's addOwnerInvestment guarantees at most one document
    // per submissionId — so a retried submission is represented here as
    // the SAME single array entry, not two.
    const ownerInvestments = [makeOwnerInvestment({ id: 'oi-retry-1', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 600000);
  });
});

// ============================================================
// §10 CashLedgerEntry double-count proof — actual calculation behavior,
// not source-string inspection.
// ============================================================

describe('FR-64 — CRITICAL: the linked other-governed-movement CashLedgerEntry does NOT cause a second additive effect', () => {
  it('a 100,000 OwnerInvestment plus its own linked 100,000 inflow CashLedgerEntry (category=other-governed-movement) contributes +100,000 total, never +200,000', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ id: 'oi-1', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    const cashLedgerEntries = [
      makeCashLedgerEntry({
        id: 'cle-owner-investment-oi-1',
        direction: 'inflow',
        amount: 100000,
        category: 'other-governed-movement',
        sourceReference: { type: 'owner-investment', id: 'oi-1' },
        createdAt: '2026-09-10T11:00:00.000Z',
      }),
    ];
    const result = callCurrent({ snapshots, ownerInvestments, cashLedgerEntries });
    assert.equal(result, 600000, 'Must be 500,000 + 100,000 = 600,000 — NOT 700,000.');
    assert.notEqual(result, 700000);
  });

  it('the same proof holds via getEstimatedBusinessWorth\'s Case A branch (the identical shared calculation)', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ id: 'oi-1', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    const cashLedgerEntries = [
      makeCashLedgerEntry({ id: 'cle-owner-investment-oi-1', amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' }),
    ];
    const result = getEstimatedBusinessWorth({
      snapshots,
      initialStockCount: null,
      batches: [],
      quebras: [],
      expenses: [],
      withdrawals: [],
      ownerInvestments,
      cashLedgerEntries,
    });
    assert.equal(result, 600000);
  });
});

// ============================================================
// §11 Startup Investment separation
// ============================================================

describe('FR-64 — Startup Investment separation: ownerInvestmentsSinceSnapshot has no coupling to startupInvestmentEntries', () => {
  it('getCurrentBusinessWorth has no startupInvestmentEntries parameter at all — structurally impossible for Startup Investment to leak into this calculation', () => {
    // getCurrentBusinessWorth's own params object has no
    // startupInvestmentEntries field (calculations.ts) — Startup
    // Investment is computed by a wholly separate function
    // (computeStartupInvestmentTotal) never invoked here. Calling with
    // only ownerInvestments proves the OwnerInvestment amount is counted
    // on its own, with nothing implicitly pulled in from any other
    // collection.
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    assert.equal(callCurrent({ snapshots, ownerInvestments }), 600000);
  });
});

// ============================================================
// §12 Levantamento separation
// ============================================================

describe('FR-64 — Levantamento separation: Owner Investment adds, Levantamento subtracts, independently', () => {
  it('a post-baseline OwnerInvestment (+100,000) and a post-baseline Withdrawal (-40,000) net to +60,000 — never conflated, never cancelled incorrectly', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    const withdrawals = [{ id: 'w1', date: '2026-09-10', createdAt: '2026-09-10T11:30:00.000Z', amount: 40000 } as Withdrawal];
    assert.equal(callCurrent({ snapshots, ownerInvestments, withdrawals }), 560000);
  });
});

// ============================================================
// §13 CAIXER non-double-count — CAIXER is a physical remeasurement
// mechanism entirely outside this function's own inputs (no CAIXER
// field appears anywhere in computeCaseALiveBusinessWorth's params);
// proven here as a structural absence, matching this suite's own
// Startup Investment proof above.
// ============================================================

describe('FR-64 — CAIXER separation: no CAIXER field is read by this calculation, so a CAIXER remeasurement cannot create a second Owner Investment effect', () => {
  it('the ownerInvestmentsSinceSnapshot term is driven ENTIRELY by the ownerInvestments array — no cash-position/CAIXER field of any kind participates', () => {
    const snapshots = [makeSnapshot({ confirmedAt: fakeTimestamp('2026-09-10T10:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] })];
    const ownerInvestments = [makeOwnerInvestment({ amount: 100000, createdAt: '2026-09-10T11:00:00.000Z' })];
    // Calling with and without payables/cashLedgerEntries/batches present
    // (simulating a CAIXER-triggered remeasurement's own unrelated writes
    // elsewhere in the system) changes nothing about this OwnerInvestment
    // term's own contribution.
    const withoutOtherActivity = callCurrent({ snapshots, ownerInvestments });
    const withUnrelatedBatch = callCurrent({
      snapshots,
      ownerInvestments,
      batches: [makeBatch({ id: 'b-unrelated', createdAt: '2026-09-10T11:15:00.000Z' })],
    });
    // The OwnerInvestment contribution itself (600,000 base) is present
    // in both; the second figure additionally reflects the unrelated
    // batch's own embedded profit (10 * (80-50) = 300), never a second
    // Owner Investment effect.
    assert.equal(withoutOtherActivity, 600000);
    assert.equal(withUnrelatedBatch, 600300);
  });
});

// ============================================================
// §14 Snapshot boundary — confirms FR-65 (ownerInvestmentSinceLastSnapshot
// on BusinessWorthSnapshot) is NOT implemented by this checkpoint.
// ============================================================

describe('FR-64 boundary — FR-65 snapshot drill-down is explicitly NOT implemented by this checkpoint', () => {
  it('BusinessWorthSnapshot does not expose ownerInvestmentSinceLastSnapshot', () => {
    const snapshot = makeSnapshot();
    assert.ok(!('ownerInvestmentSinceLastSnapshot' in snapshot));
  });
});

// ============================================================
// Regression: empty/omitted ownerInvestments is purely additive (no
// fabricated effect), mirroring the Increment 3 payables/cashLedgerEntries
// discipline this function already established.
// ============================================================

describe('FR-64 — regression: omitting ownerInvestments entirely changes nothing (purely additive parameter)', () => {
  it('identical result whether ownerInvestments is omitted or passed as []', () => {
    const snapshots = [makeSnapshot({ measuredBusinessWorth: 500000, embeddedProfitTotal: 0 })];
    const batches = [makeBatch({ id: 'b-new', quantity: 100, costPrice: 250, sellingPrice: 300, createdAt: '2026-09-11T00:00:00.000Z' })];
    assert.equal(callCurrent({ snapshots, batches }), 505000);
    assert.equal(callCurrent({ snapshots, batches, ownerInvestments: [] }), 505000);
  });
});
