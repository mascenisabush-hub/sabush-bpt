// computeMeasuredBusinessWorth unit tests — Business Worth Evolution,
// Implementation Authorization Increment 1 (Foundation), CORRECTED per
// explicit Product Architect clarification (Decision A: existing
// financial activity already exists and must not be treated as zero).
//
// SCOPE: this suite exists specifically to prove the correction — that
// a snapshot's measuredBusinessWorth actually incorporates the
// business's EXISTING, already-tracked expenses and withdrawals, and
// that cash/receivables/payables are treated as genuinely ABSENT
// (never a fabricated 0) when Increment 3 has not yet shipped. Pure
// function, no Firestore/AppContext dependency.
//
// HOW TO RUN:
//   node --test tests/business-worth-measured-value.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computeMeasuredBusinessWorth } from '../apps/tenant/src/utils/calculations';

describe('computeMeasuredBusinessWorth — Decision A: existing financial activity is not zero', () => {
  it('an existing business with real, already-tracked expenses and withdrawals has them actually subtracted — not silently ignored', () => {
    // A business that has been operating for a while: physical count
    // (selling basis) of 700,000, but it has ALREADY spent 50,000 on
    // expenses and the Owner has ALREADY withdrawn 20,000 — both
    // EXISTING, already-tracked figures (Expense/Withdrawal
    // collections), unrelated to Cash Ledger/Receivables/Payables.
    const result = computeMeasuredBusinessWorth({
      productValuationTotal: 700000,
      totalExpensesAllTime: 50000,
      totalWithdrawalsAllTime: 20000,
    });
    // The corrected formula MUST reflect this real activity —
    // 700000 - 50000 - 20000 = 630000, never 700000 (which would
    // silently discard the business's own real financial history).
    assert.equal(result, 630000);
  });

  it('a genuinely brand-new business with zero expenses/withdrawals correctly gets a measured value equal to its stock valuation alone — zero here is a TRUE zero (no activity has ever occurred), not a fabricated one', () => {
    const result = computeMeasuredBusinessWorth({
      productValuationTotal: 500000,
      totalExpensesAllTime: 0,
      totalWithdrawalsAllTime: 0,
    });
    assert.equal(result, 500000);
  });

  it('cash/receivables/payables are OMITTED (not passed) for an Increment-1-era snapshot, and correctly contribute nothing — never silently treated as a real zero balance that could mask a future Increment 3 correction', () => {
    const withoutThem = computeMeasuredBusinessWorth({
      productValuationTotal: 500000,
      totalExpensesAllTime: 10000,
      totalWithdrawalsAllTime: 5000,
    });
    const withExplicitZeros = computeMeasuredBusinessWorth({
      productValuationTotal: 500000,
      totalExpensesAllTime: 10000,
      totalWithdrawalsAllTime: 5000,
      cashPosition: 0,
      receivablesPosition: 0,
      payablesPosition: 0,
    });
    // Numerically identical today (0 contributes nothing either way) —
    // this test exists to pin that the OMITTED-parameter code path and
    // the explicit-zero code path are equivalent NOW, so that a future
    // Increment 3 caller passing real, non-zero values is the only
    // thing that can ever change this result — never a hidden default.
    assert.equal(withoutThem, 485000);
    assert.equal(withExplicitZeros, 485000);
  });

  it('once real cash/receivables/payables values exist (a future Increment 3 caller), they correctly participate in the formula', () => {
    const result = computeMeasuredBusinessWorth({
      productValuationTotal: 500000,
      totalExpensesAllTime: 0,
      totalWithdrawalsAllTime: 0,
      cashPosition: 30000,
      receivablesPosition: 10000,
      payablesPosition: 15000,
    });
    // 500000 + 30000 + 10000 - 15000 = 525000
    assert.equal(result, 525000);
  });
});

describe('computeMeasuredBusinessWorth — BDR Decision 15/16 worked example (cash-financed stock purchase)', () => {
  it('a cash-financed stock purchase\'s embedded profit is what shows up — the purchase itself is never treated as an expense or a duplicate value addition', () => {
    // Current Business Worth: 500,000. Owner spends 25,000 of business
    // cash on stock; the resulting batch's embedded profit is 5,000.
    // The 25,000 purchase itself never appears anywhere in this
    // function's inputs — it is not an Expense, not a Withdrawal, and
    // (per the corrected Cash Ledger design) never a CashLedgerEntry —
    // only the resulting embedded profit reaches Business Worth, via
    // the increased productValuationTotal a fresh Contagem would
    // measure. This test proves the formula itself introduces no
    // separate deduction for the purchase amount.
    const before = computeMeasuredBusinessWorth({
      productValuationTotal: 500000,
      totalExpensesAllTime: 0,
      totalWithdrawalsAllTime: 0,
    });
    const afterPurchaseAndEmbeddedProfit = computeMeasuredBusinessWorth({
      // The Contagem's own physical count now measures 505,000 of
      // stock (the prior 500,000 baseline's stock component, plus the
      // new batch's own embedded-profit-inclusive selling value) —
      // never 500,000 - 25,000 (treating the purchase as an expense)
      // and never 500,000 + 25,000 + 5,000 (double-counting the
      // purchase amount on top of its own embedded profit).
      productValuationTotal: 505000,
      totalExpensesAllTime: 0,
      totalWithdrawalsAllTime: 0,
    });
    assert.equal(before, 500000);
    assert.equal(afterPurchaseAndEmbeddedProfit, 505000);
  });
});
