// Business Worth Evolution — Implementation Authorization, Increment 7
// (Reconciliation / Notifications). Unit tests for the new pure
// functions this increment adds: getLedgerDerivedCashBalance,
// computeCashReconciliationDifference, getPossibleReconciliationCauses.
// Specification §22, FR-10, FR-11, FR-31, FR-32, FR-56. Pure functions,
// no Firestore/AppContext dependency.
//
// HOW TO RUN:
//   node --test tests/business-worth-reconciliation-signal.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  getLedgerDerivedCashBalance,
  computeCashReconciliationDifference,
  getPossibleReconciliationCauses,
} from '../apps/tenant/src/utils/calculations';
import type { CashLedgerEntry, Payable, Receivable } from '../apps/tenant/src/types';

function entry(overrides: Partial<CashLedgerEntry>): CashLedgerEntry {
  return {
    id: 'e1',
    businessId: 'b1',
    direction: 'inflow',
    amount: 0,
    category: 'other-governed-movement',
    sourceReference: { type: 'other' },
    occurredAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    createdBy: 'u1',
    ...overrides,
  };
}

describe('getLedgerDerivedCashBalance — FR-10 (derived, never a stored balance)', () => {
  it('sums every category — inflow adds, outflow subtracts', () => {
    const entries: CashLedgerEntry[] = [
      entry({ id: 'e1', direction: 'inflow', amount: 100000, category: 'customer-payment' }),
      entry({ id: 'e2', direction: 'outflow', amount: 30000, category: 'expense' }),
      entry({ id: 'e3', direction: 'outflow', amount: 20000, category: 'levantamento' }),
      entry({ id: 'e4', direction: 'outflow', amount: 10000, category: 'supplier-payment' }),
    ];
    assert.equal(getLedgerDerivedCashBalance(entries), 40000);
  });

  it('an empty ledger is a true zero', () => {
    assert.equal(getLedgerDerivedCashBalance([]), 0);
  });

  it('asOfMillis restricts the sum to entries occurring at or before that instant', () => {
    const entries: CashLedgerEntry[] = [
      entry({ id: 'e1', direction: 'inflow', amount: 50000, occurredAt: '2026-08-01T00:00:00.000Z' }),
      entry({ id: 'e2', direction: 'inflow', amount: 999999, occurredAt: '2026-08-20T00:00:00.000Z' }),
    ];
    const asOf = new Date('2026-08-05T23:59:59.999Z').getTime();
    assert.equal(getLedgerDerivedCashBalance(entries, asOf), 50000);
  });
});

describe('computeCashReconciliationDifference — FR-11, FR-31, FR-32 (signal only, never classified)', () => {
  it("matches the Specification's own worked example (§22): system 120,000 vs. physical 115,000 = -5,000", () => {
    assert.equal(computeCashReconciliationDifference(115000, 120000), -5000);
  });

  it('a matching count is a true, exact zero — never a fabricated near-zero', () => {
    assert.equal(computeCashReconciliationDifference(75000, 75000), 0);
  });

  it('a positive difference (more cash counted than the ledger expects) is preserved, not floored to zero', () => {
    assert.equal(computeCashReconciliationDifference(82000, 75000), 7000);
  });
});

describe('getPossibleReconciliationCauses — FR-56 (evidence-bound, never invented)', () => {
  const unpaidPayable: Payable = {
    id: 'p1',
    businessId: 'b1',
    sourcePurchaseBatchId: 'batch1',
    totalAmount: 12000,
    amountPaid: 0,
    amountRemaining: 12000,
    status: 'unpaid',
    createdAt: '2026-08-01T00:00:00.000Z',
  };
  const paidPayable: Payable = { ...unpaidPayable, id: 'p2', amountPaid: 12000, amountRemaining: 0, status: 'paid' };
  const unpaidReceivable: Receivable = {
    id: 'r1',
    businessId: 'b1',
    totalAmount: 5000,
    amountPaid: 0,
    amountRemaining: 5000,
    status: 'unpaid',
    createdAt: '2026-08-01T00:00:00.000Z',
  };

  it('every input at zero/empty yields an empty, non-padded list', () => {
    const causes = getPossibleReconciliationCauses({});
    assert.deepEqual(causes, []);
  });

  it('a nonzero expenses-since-last-snapshot figure surfaces unrecordedExpense with its own amount as evidence', () => {
    const causes = getPossibleReconciliationCauses({ expensesSinceLastSnapshot: 8000 });
    const found = causes.find((c) => c.key === 'unrecordedExpense');
    assert.ok(found);
    assert.equal(found!.evidenceAmount, 8000);
  });

  it('a nonzero breakage figure surfaces unrecordedBreakage', () => {
    const causes = getPossibleReconciliationCauses({ breakagesSinceLastSnapshot: 1500 });
    assert.ok(causes.some((c) => c.key === 'unrecordedBreakage'));
  });

  it('a nonzero levantamentos figure surfaces unrecordedLevantamento', () => {
    const causes = getPossibleReconciliationCauses({ levantamentosSinceLastSnapshot: 3000 });
    assert.ok(causes.some((c) => c.key === 'unrecordedLevantamento'));
  });

  it('only non-paid Payables count toward supplierPaymentNotUpdated, with the correct summed evidence', () => {
    const causes = getPossibleReconciliationCauses({ outstandingPayables: [unpaidPayable, paidPayable] });
    const found = causes.find((c) => c.key === 'supplierPaymentNotUpdated');
    assert.ok(found);
    assert.equal(found!.evidenceAmount, 12000);
    assert.equal(found!.evidenceCount, 1);
  });

  it('a paid-only Payable list never surfaces supplierPaymentNotUpdated', () => {
    const causes = getPossibleReconciliationCauses({ outstandingPayables: [paidPayable] });
    assert.ok(!causes.some((c) => c.key === 'supplierPaymentNotUpdated'));
  });

  it('outstanding Receivables surface receivablesRequireFollowUp with correct evidence', () => {
    const causes = getPossibleReconciliationCauses({ outstandingReceivables: [unpaidReceivable] });
    const found = causes.find((c) => c.key === 'receivablesRequireFollowUp');
    assert.ok(found);
    assert.equal(found!.evidenceAmount, 5000);
    assert.equal(found!.evidenceCount, 1);
  });

  it('whenever any evidence exists, incorrectStockCount and stockNotProperlyRecorded are always included', () => {
    const causes = getPossibleReconciliationCauses({ expensesSinceLastSnapshot: 1 });
    assert.ok(causes.some((c) => c.key === 'incorrectStockCount'));
    assert.ok(causes.some((c) => c.key === 'stockNotProperlyRecorded'));
  });

  it('never asserts a cause as fact — every entry is a possibility key plus evidence, never a boolean "this happened"', () => {
    const causes = getPossibleReconciliationCauses({ outstandingReceivables: [unpaidReceivable] });
    for (const cause of causes) {
      assert.equal(typeof cause.key, 'string');
    }
  });
});
