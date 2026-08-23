// Business Worth Evolution — Implementation Authorization, Increment 8
// (Correction / Recovery) — unit tests for the two new pure eligibility
// functions this increment adds: computeBusinessWorthCorrectionEligibility
// and computeBusinessWorthAuthorizedRecoveryEligibility
// (apps/tenant/src/utils/calculations.ts). Specification §25, §26,
// FR-38, FR-40-FR-43, FR-58, I-7. Pure functions, no Firestore/
// AppContext dependency.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-correction-recovery-eligibility.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeBusinessWorthCorrectionEligibility,
  computeBusinessWorthAuthorizedRecoveryEligibility,
} from '../apps/tenant/src/utils/calculations';
import type { BusinessWorthSnapshot, BusinessWorthRecoveryAuthorization } from '../apps/tenant/src/types';

function makeSnapshot(overrides: Partial<BusinessWorthSnapshot> = {}): BusinessWorthSnapshot {
  return {
    id: 'bws-1',
    businessId: 'biz-1',
    sourceStockCountId: 'sc-1',
    confirmedAt: { toMillis: () => 0, seconds: 0, nanoseconds: 0 } as unknown as BusinessWorthSnapshot['confirmedAt'],
    measuredBusinessWorth: 100000,
    productValuationTotal: 100000,
    productValuationDetail: [],
    embeddedProfitTotal: 0,
    embeddedProfitDetail: [],
    expensesSinceLastSnapshot: 0,
    breakagesSinceLastSnapshot: 0,
    levantamentosSinceLastSnapshot: 0,
    previousCurrentBusinessWorth: null,
    correctionWindowExpiresAt: new Date(0).toISOString(),
    status: 'active',
    ...overrides,
  };
}

function fakeAuthTimestamp(ms: number) {
  return { toMillis: () => ms } as unknown as BusinessWorthRecoveryAuthorization['expiresAt'];
}

function makeAuthorization(overrides: Partial<BusinessWorthRecoveryAuthorization> = {}): BusinessWorthRecoveryAuthorization {
  return {
    id: 'current',
    targetSnapshotId: 'bws-1',
    targetStockCountId: 'sc-1',
    authorizedAt: fakeAuthTimestamp(0),
    expiresAt: fakeAuthTimestamp(72 * 60 * 60 * 1000),
    status: 'unconsumed',
    grantedByUid: 'op-1',
    justification: 'Motivo válido.',
    ...overrides,
  };
}

describe('computeBusinessWorthCorrectionEligibility — no snapshot / non-active snapshot', () => {
  it('null/undefined snapshot is never eligible', () => {
    assert.equal(computeBusinessWorthCorrectionEligibility(null).eligible, false);
    assert.equal(computeBusinessWorthCorrectionEligibility(undefined).eligible, false);
  });

  it('an already-"corrected" snapshot is never eligible for a second correction', () => {
    const snapshot = makeSnapshot({ status: 'corrected', correctionWindowExpiresAt: new Date(Date.now() + 1_000_000).toISOString() });
    assert.equal(computeBusinessWorthCorrectionEligibility(snapshot).eligible, false);
  });

  it('an already-"superseded-by-recovery" snapshot is never eligible for a correction', () => {
    const snapshot = makeSnapshot({ status: 'superseded-by-recovery', correctionWindowExpiresAt: new Date(Date.now() + 1_000_000).toISOString() });
    assert.equal(computeBusinessWorthCorrectionEligibility(snapshot).eligible, false);
  });
});

describe('computeBusinessWorthCorrectionEligibility — 3-hour window (Specification §25)', () => {
  it('eligible with time remaining while still inside the 3-hour window', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    const windowExpiresAt = new Date('2026-08-23T14:00:00.000Z'); // 2h from now
    const snapshot = makeSnapshot({ status: 'active', correctionWindowExpiresAt: windowExpiresAt.toISOString() });
    const result = computeBusinessWorthCorrectionEligibility(snapshot, now);
    assert.equal(result.eligible, true);
    assert.equal(result.msRemaining, 2 * 60 * 60 * 1000);
  });

  it('not eligible once the window has passed, with zero remaining', () => {
    const now = new Date('2026-08-23T16:00:00.000Z');
    const windowExpiresAt = new Date('2026-08-23T15:00:00.000Z'); // 1h ago
    const snapshot = makeSnapshot({ status: 'active', correctionWindowExpiresAt: windowExpiresAt.toISOString() });
    const result = computeBusinessWorthCorrectionEligibility(snapshot, now);
    assert.equal(result.eligible, false);
    assert.equal(result.msRemaining, 0);
  });

  it('not eligible at the exact boundary instant (now === windowExpiresAt is not "still within")', () => {
    const boundary = new Date('2026-08-23T15:00:00.000Z');
    const snapshot = makeSnapshot({ status: 'active', correctionWindowExpiresAt: boundary.toISOString() });
    const result = computeBusinessWorthCorrectionEligibility(snapshot, boundary);
    assert.equal(result.eligible, false);
  });

  it('never the authoritative gate — this is a display convenience only, mirrored by firestore.rules independently', () => {
    // No assertion beyond re-stating the contract: this function never
    // touches Firestore and cannot itself grant a write.
    const snapshot = makeSnapshot({ status: 'active', correctionWindowExpiresAt: new Date(Date.now() + 10_000).toISOString() });
    const result = computeBusinessWorthCorrectionEligibility(snapshot);
    assert.equal(typeof result.eligible, 'boolean');
  });
});

describe('computeBusinessWorthAuthorizedRecoveryEligibility — no snapshot / no authorization / mismatch', () => {
  it('null authorization or null snapshot is never eligible', () => {
    assert.equal(computeBusinessWorthAuthorizedRecoveryEligibility(null, makeSnapshot()).eligible, false);
    assert.equal(computeBusinessWorthAuthorizedRecoveryEligibility(makeAuthorization(), null).eligible, false);
  });

  it('a non-active target snapshot is never eligible, even with a matching unconsumed Authorization', () => {
    const snapshot = makeSnapshot({ id: 'bws-1', status: 'corrected' });
    const authorization = makeAuthorization({ targetSnapshotId: 'bws-1', status: 'unconsumed', expiresAt: fakeAuthTimestamp(1_000_000_000) });
    assert.equal(computeBusinessWorthAuthorizedRecoveryEligibility(authorization, snapshot).eligible, false);
  });

  it('an Authorization naming a DIFFERENT snapshot is never eligible for this one', () => {
    const snapshot = makeSnapshot({ id: 'bws-2', status: 'active' });
    const authorization = makeAuthorization({ targetSnapshotId: 'bws-1', status: 'unconsumed', expiresAt: fakeAuthTimestamp(1_000_000_000) });
    assert.equal(computeBusinessWorthAuthorizedRecoveryEligibility(authorization, snapshot).eligible, false);
  });

  it('an already-"consumed" Authorization is never eligible again', () => {
    const snapshot = makeSnapshot({ id: 'bws-1', status: 'active' });
    const authorization = makeAuthorization({ targetSnapshotId: 'bws-1', status: 'consumed', expiresAt: fakeAuthTimestamp(1_000_000_000) });
    assert.equal(computeBusinessWorthAuthorizedRecoveryEligibility(authorization, snapshot).eligible, false);
  });
});

describe('computeBusinessWorthAuthorizedRecoveryEligibility — 72-hour ceiling (Specification §26)', () => {
  it('eligible with time remaining while still inside the 72-hour ceiling', () => {
    const now = new Date(0);
    const snapshot = makeSnapshot({ id: 'bws-1', status: 'active' });
    const authorization = makeAuthorization({ targetSnapshotId: 'bws-1', status: 'unconsumed', expiresAt: fakeAuthTimestamp(72 * 60 * 60 * 1000) });
    const result = computeBusinessWorthAuthorizedRecoveryEligibility(authorization, snapshot, now);
    assert.equal(result.eligible, true);
    assert.equal(result.msRemaining, 72 * 60 * 60 * 1000);
  });

  it('not eligible once the 72-hour ceiling has passed', () => {
    const now = new Date(73 * 60 * 60 * 1000);
    const snapshot = makeSnapshot({ id: 'bws-1', status: 'active' });
    const authorization = makeAuthorization({ targetSnapshotId: 'bws-1', status: 'unconsumed', expiresAt: fakeAuthTimestamp(72 * 60 * 60 * 1000) });
    const result = computeBusinessWorthAuthorizedRecoveryEligibility(authorization, snapshot, now);
    assert.equal(result.eligible, false);
    assert.equal(result.msRemaining, 0);
  });

  it('is independent of, and can be simultaneously true alongside eligible:false from computeBusinessWorthCorrectionEligibility — exactly the case this mechanism exists to serve (§26)', () => {
    const now = new Date('2026-08-23T20:00:00.000Z');
    const expiredCorrectionWindow = new Date('2026-08-23T13:00:00.000Z'); // 7h ago — correction window long closed
    const snapshot = makeSnapshot({
      id: 'bws-1',
      status: 'active',
      correctionWindowExpiresAt: expiredCorrectionWindow.toISOString(),
    });
    const correctionEligibility = computeBusinessWorthCorrectionEligibility(snapshot, now);
    assert.equal(correctionEligibility.eligible, false);

    const authorization = makeAuthorization({
      targetSnapshotId: 'bws-1',
      status: 'unconsumed',
      expiresAt: fakeAuthTimestamp(now.getTime() + 60 * 60 * 1000), // 1h remaining on the 72h authorization
    });
    const recoveryEligibility = computeBusinessWorthAuthorizedRecoveryEligibility(authorization, snapshot, now);
    assert.equal(recoveryEligibility.eligible, true);
  });
});
