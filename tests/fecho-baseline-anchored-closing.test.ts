// Fecho (Closing) — Baseline-Anchored Custom Range unit tests — Business
// Worth Evolution, Implementation Authorization §18, Increment 6
// (Specification §18, FR-25–FR-27, FR-53, FR-54; Rule 8 Findings 8-A,
// 8-B; Implementation Plan §9, §10).
//
// SCOPE:
//   1. resolveActiveBusinessWorthBaselineDate (calculations.ts) — proves
//      Fecho's own start-date resolution: the latest active
//      BusinessWorthSnapshot.confirmedAt when one exists, else the
//      historical Capital Inicial baseline date (Rule 8 Finding 6-A),
//      else null. Pure function, no Firestore/AppContext dependency.
//   2. The `closings` Security Rule's update-immutability fix (Rule 8
//      Finding 8-B) — covered by direct source inspection here, since the
//      sandboxed test environment cannot download/start the Firebase
//      emulator (matching the precedent tests/startup-investment.test.ts
//      already sets for firestore.rules coverage in this suite). No
//      emulator verification is claimed.
//
// Deliberately does NOT re-test getEstimatedBusinessWorth/
// getCurrentBusinessWorth's own Case A/Case B arithmetic — that is
// already fully covered by tests/business-worth-current-read-path.test.ts
// and tests/business-worth-snapshot-foundation.test.ts; this suite only
// proves the NEW baseline-selection logic Increment 6 itself adds.
//
// HOW TO RUN:
//   npm run test:fecho-baseline-anchored-closing

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveActiveBusinessWorthBaselineDate } from '../apps/tenant/src/utils/calculations';
import type { BusinessWorthSnapshot, StockCount } from '../apps/tenant/src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A minimal fake Timestamp — matches the exact shape
// resolveActiveBusinessWorthBaselineDate's own internal toMillis() helper
// (shared with getCurrentBusinessWorth/getEstimatedBusinessWorth) already
// tolerates, per the precedent tests/business-worth-current-read-path.test.ts
// sets. Never needs the real firebase/firestore SDK loaded.
function fakeTimestamp(isoDate: string) {
  const ms = new Date(isoDate).getTime();
  return { toMillis: () => ms };
}

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  return {
    id: 'bws-1',
    businessId: 'biz1',
    sourceStockCountId: 'stockcount-1',
    confirmedAt: fakeTimestamp('2026-05-01T09:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    measuredBusinessWorth: 500000,
    productValuationTotal: 500000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: '2026-05-01T12:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function makeInitialStockCount(overrides: Partial<StockCount> = {}): StockCount {
  return {
    id: 'initial',
    type: 'initial',
    date: '2024-01-01',
    items: [],
    totalValue: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as StockCount;
}

describe('resolveActiveBusinessWorthBaselineDate — Specification §18, FR-25', () => {
  it('1. returns null when neither a snapshot nor an initial StockCount exists (genuinely new business, State 1)', () => {
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [], initialStockCount: null });
    assert.equal(result, null);
  });

  it('2. returns null for null snapshots and no initial StockCount, never throwing', () => {
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: null, initialStockCount: null });
    assert.equal(result, null);
  });

  it('3. Case A — a BusinessWorthSnapshot exists: baseline is that snapshot\'s own confirmedAt, date-only', () => {
    const snap = makeSnapshot({ confirmedAt: fakeTimestamp('2026-05-01T09:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [snap], initialStockCount: null });
    assert.equal(result, '2026-05-01');
  });

  it('4. Case A — the exact worked example from Specification §18: last Contagem 01 May 2026', () => {
    const snap = makeSnapshot({ confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [snap], initialStockCount: null });
    assert.equal(result, '2026-05-01');
  });

  it('5. Case A with multiple snapshots: the LATEST active snapshot\'s confirmedAt is the baseline, never an earlier one', () => {
    const older = makeSnapshot({
      id: 'bws-older',
      confirmedAt: fakeTimestamp('2026-03-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const newer = makeSnapshot({
      id: 'bws-newer',
      confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
    });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [older, newer], initialStockCount: null });
    assert.equal(result, '2026-05-01');
  });

  it('6. a superseded/corrected snapshot is never selected as the baseline, even if it is the most recent by date', () => {
    const active = makeSnapshot({
      id: 'bws-active',
      confirmedAt: fakeTimestamp('2026-04-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
      status: 'active',
    });
    const superseded = makeSnapshot({
      id: 'bws-superseded',
      confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'],
      status: 'corrected',
    });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [active, superseded], initialStockCount: null });
    assert.equal(result, '2026-04-01');
  });

  it('7. Case B — no snapshot yet, State 1a: baseline is the initial StockCount\'s own createdAt (Rule 8 Finding 6-A)', () => {
    const initial = makeInitialStockCount({ createdAt: '2023-05-10T12:00:00.000Z' });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [], initialStockCount: initial });
    assert.equal(result, '2023-05-10');
  });

  it('8. Case B — createdAt is used even when confirmedAt IS present, never confirmedAt (Rule 8 Finding 6-A, mirroring resolveStartupInvestmentWindow)', () => {
    const initial = makeInitialStockCount({
      createdAt: '2023-05-10T12:00:00.000Z',
      confirmedAt: fakeTimestamp('2023-05-11T09:00:00.000Z') as unknown as StockCount['confirmedAt'],
    });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [], initialStockCount: initial });
    assert.equal(result, '2023-05-10');
  });

  it('9. Case A takes priority over Case B when both a snapshot and an initial StockCount exist', () => {
    const initial = makeInitialStockCount({ createdAt: '2023-05-10T12:00:00.000Z' });
    const snap = makeSnapshot({ confirmedAt: fakeTimestamp('2026-05-01T00:00:00.000Z') as unknown as BusinessWorthSnapshot['confirmedAt'] });
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [snap], initialStockCount: initial });
    assert.equal(result, '2026-05-01');
  });

  it('10. an empty (non-null) snapshots array with no initial StockCount still returns null, never a fabricated date', () => {
    const result = resolveActiveBusinessWorthBaselineDate({ snapshots: [], initialStockCount: null });
    assert.equal(result, null);
  });
});

describe('firestore.rules — closings update-immutability fix (Rule 8 Finding 8-B; Plan §10)', () => {
  const rulesPath = path.join(__dirname, '..', 'firestore.rules');
  const rulesSource = fs.readFileSync(rulesPath, 'utf-8');

  function closingsBlock(): string {
    const start = rulesSource.indexOf('match /closings/{closingId}');
    assert.ok(start >= 0, 'expected a /closings/{closingId} match block in firestore.rules');
    // The block ends at the next top-level `match /closedPeriods` sibling,
    // which immediately follows /closings in this file.
    const end = rulesSource.indexOf('match /closedPeriods/{periodKey}', start);
    assert.ok(end > start, 'expected /closedPeriods/{periodKey} to immediately follow /closings');
    return rulesSource.slice(start, end);
  }

  it('1. every frozen Closing field is locked on update (startDate, the very field FR-25 exists to protect)', () => {
    const block = closingsBlock();
    assert.match(block, /request\.resource\.data\.startDate == resource\.data\.startDate/);
  });

  it('2. periodType, endDate, and every frozen financial total are locked on update, not just startDate', () => {
    const block = closingsBlock();
    for (const field of [
      'periodType',
      'periodLabel',
      'endDate',
      'totalEmbeddedProfit',
      'totalExpenses',
      'totalWithdrawals',
      'inventoryCostAtClose',
      'inventoryMarketValueAtClose',
      'businessWorthAtClose',
      'closedAt',
    ]) {
      const re = new RegExp(`request\\.resource\\.data\\.${field} == resource\\.data\\.${field}`);
      assert.match(block, re, `expected ${field} to be locked between resource.data and request.resource.data`);
    }
  });

  it('3. delete remains unconditionally false — a Closing is never deleted, only reopened (unchanged by this fix)', () => {
    const block = closingsBlock();
    assert.match(block, /allow delete: if false;/);
  });

  it('4. create remains gated by isOwnerOrGrantedManager, unaffected by the update fix', () => {
    const block = closingsBlock();
    assert.match(block, /allow read, create: if isOwnerOrGrantedManager\(businessId, 'closings'\);/);
  });

  it('5. update is still gated by isOwnerOf, not opened up to a granted Manager (reopen remains Owner-only, unaffected by this fix)', () => {
    const block = closingsBlock();
    assert.match(block, /allow update: if isOwnerOf\(businessId\) &&/);
  });
});
