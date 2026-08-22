// getCurrentBusinessWorth unit tests — Business Worth Evolution,
// Implementation Authorization Increment 1 (Foundation).
//
// SCOPE: proves the Current Business Worth read path (Specification §7,
// FR-1, FR-3, FR-4, I-1) in isolation — a pure function, no Firestore/
// AppContext dependency. Does NOT test the atomic snapshot-writing side
// of Increment 1 (recordStockCount's own batch-write extension) — that
// is a Firestore-level property, covered separately by
// tests/business-worth-snapshot-foundation.test.ts, matching this
// repository's own established split between pure-function unit tests
// (this file) and rules-emulator tests (that file) — see e.g.
// tests/calculations.test.ts vs tests/periodic-stock-finalization.test.ts
// for the same split applied to an earlier feature.
//
// HOW TO RUN:
//   npm run test:calculations -- tests/business-worth-current-read-path.test.ts
// or simply run it directly with Node's built-in test runner:
//   node --test tests/business-worth-current-read-path.test.ts
// Pure function, no Firestore/emulator dependency.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getCurrentBusinessWorth } from '../apps/tenant/src/utils/calculations';
import { BusinessWorthSnapshot } from '../apps/tenant/src/types';

// A minimal fake Timestamp — the real Firestore SDK's Timestamp exposes
// toMillis(); getCurrentBusinessWorth's own toMillis() helper (internal
// to calculations.ts) is written to tolerate exactly this shape, so
// tests never need the real firebase/firestore SDK loaded.
function fakeTimestamp(isoDate: string) {
  const ms = new Date(isoDate).getTime();
  return { toMillis: () => ms };
}

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  // [Corrected] cashPosition/receivablesPosition/payablesPosition/
  // estimatedBusinessWorthImmediatelyBefore/difference are OMITTED here
  // by default, matching the corrected BusinessWorthSnapshot interface
  // exactly (all five are optional, never a fabricated 0/null) — a test
  // that needs one present can still supply it via `overrides`.
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

describe('getCurrentBusinessWorth — FR-1, FR-3, I-1', () => {
  it('returns UNKNOWN for an empty snapshot list (a business with no confirmed new-model Contagem yet)', () => {
    assert.equal(getCurrentBusinessWorth([]), 'UNKNOWN');
  });

  it('returns UNKNOWN for null/undefined input, never throwing', () => {
    assert.equal(getCurrentBusinessWorth(null), 'UNKNOWN');
    assert.equal(getCurrentBusinessWorth(undefined), 'UNKNOWN');
  });

  it('returns the single snapshot\'s measuredBusinessWorth when exactly one exists', () => {
    const snap = makeSnapshot({ measuredBusinessWorth: 123456 });
    assert.equal(getCurrentBusinessWorth([snap]), 123456);
  });

  it('returns the LATEST snapshot by confirmedAt, not the last one in array order (FR-3 — never a third outcome, never array-order-dependent)', () => {
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
    // Deliberately passed with the OLDER one last, to prove the function
    // sorts by confirmedAt rather than trusting array order.
    assert.equal(getCurrentBusinessWorth([newer, older]), 200000);
    assert.equal(getCurrentBusinessWorth([older, newer]), 200000);
  });

  it('never returns a corrected/superseded snapshot\'s value as current (forward-compatible with the not-yet-implemented Increment 8 correction/recovery mechanism)', () => {
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
    // The superseded one is even NEWER by confirmedAt, but must still be
    // ignored — it is no longer the authoritative current figure.
    assert.equal(getCurrentBusinessWorth([superseded, active]), 505000);
  });

  it('returns UNKNOWN when every snapshot has been superseded (defensive — not a scenario Increment 1 itself can produce, since Increment 8 does not exist yet)', () => {
    const superseded = makeSnapshot({ status: 'corrected' });
    assert.equal(getCurrentBusinessWorth([superseded]), 'UNKNOWN');
  });

  it('is a pure read — never independently recomputes a value from any other input', () => {
    // Regression guard against a future edit accidentally turning this
    // into a live recalculation (that is Estimated Business Worth's own,
    // structurally distinct job — Specification §9, Increment 2). The
    // function's own signature (snapshots only, no batches/expenses/
    // withdrawals parameter) is itself the enforcement; this test simply
    // pins that signature so a regression is caught at compile time, not
    // just by inspection.
    const snap = makeSnapshot({ measuredBusinessWorth: 42 });
    const result: number | 'UNKNOWN' = getCurrentBusinessWorth([snap]);
    assert.equal(result, 42);
  });
});
