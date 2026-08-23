// Business Worth Evolution — Implementation Authorization, Increment 9
// (Auditability) — unit tests for
// server/businessWorthRecoveryExpiryAudit.ts.
//
// Governing chain: Specification §34, FR-48; Rule 8 Finding 11-A;
// Implementation Plan §15 (`business_worth_recovery.expired`
// actionType); Authorization §21.
//
// CORRECTION CONTEXT: this module and its tests exist because an
// earlier pass of Increment 9 incorrectly concluded no discrete
// expiry-write event was needed for SuperAdmin recovery Authorization
// expiry, reasoning by analogy from Initial-Stock recovery's own
// deliberate design (which has none). That analogy did not hold for
// this mechanism — Rule 8 Finding 11-A and Plan §15 both explicitly
// treat expiry as its own auditable event with its own proposed
// actionType, unlike Initial-Stock's own governance chain.
//
// Mirrors tests/business-worth-recovery-authorization.test.ts's own
// fake-Firestore harness conventions (Increment 8).
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-recovery-expiry-audit.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  createBusinessWorthRecoveryExpiryAuditSweep,
  type BusinessWorthRecoveryExpiryAuditDb,
  type ServerTimestampLike,
} from '../server/businessWorthRecoveryExpiryAudit';

function fakeTimestamp(ms: number): ServerTimestampLike {
  return { toMillis: () => ms };
}

interface FakeStore {
  authorizations: Record<string, Record<string, unknown> | undefined>;
  auditLog: Record<string, unknown>[];
}

function makeFakeDb(seed: { authorizations?: Record<string, Record<string, unknown>> }): BusinessWorthRecoveryExpiryAuditDb & { store: FakeStore } {
  const store: FakeStore = {
    authorizations: { ...(seed.authorizations ?? {}) },
    auditLog: [],
  };

  function docSnapFor(businessId: string) {
    const data = store.authorizations[businessId];
    return {
      id: 'current',
      exists: !!data,
      data: () => data,
      ref: { parent: { parent: { id: businessId } } },
    };
  }

  return {
    store,
    collectionGroup(_name: 'businessWorthRecoveryAuthorizations') {
      return {
        async get() {
          return {
            docs: Object.keys(store.authorizations).map((businessId) => docSnapFor(businessId)),
          };
        },
      };
    },
    collection(name: 'businesses' | 'platform_audit_log') {
      if (name === 'platform_audit_log') {
        return {
          doc() {
            return {
              __set(data: Record<string, unknown>) {
                store.auditLog.push(data);
              },
            } as unknown as { get(): Promise<never> };
          },
        } as never;
      }
      return {
        doc(businessId: string) {
          return {
            collection(_sub: 'businessWorthRecoveryAuthorizations') {
              return {
                doc(_id: 'current') {
                  return {
                    async get() {
                      const data = store.authorizations[businessId];
                      return { exists: !!data, data: () => data };
                    },
                    __update(data: Record<string, unknown>) {
                      store.authorizations[businessId] = { ...(store.authorizations[businessId] ?? {}), ...data };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref: { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }> }) {
          return ref.get();
        },
        set(ref: { __set(data: Record<string, unknown>): void }, data: Record<string, unknown>) {
          ref.__set(data);
        },
        update(ref: { __update(data: Record<string, unknown>): void }, data: Record<string, unknown>) {
          ref.__update(data);
        },
      };
      return fn(tx as never);
    },
  } as unknown as BusinessWorthRecoveryExpiryAuditDb & { store: FakeStore };
}

function noopReportCriticalFailure() {}

describe('runBusinessWorthRecoveryExpiryAuditSweep — audits a genuinely unconsumed, expired Authorization', () => {
  it('writes exactly one platform_audit_log entry with actionType business_worth_recovery.expired', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'unconsumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-1' },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(2000));

    assert.equal(db.store.auditLog.length, 1);
    assert.equal(db.store.auditLog[0].actionType, 'business_worth_recovery.expired');
    assert.equal(db.store.auditLog[0].targetBusinessId, 'biz-1');
  });

  it('marks expiryAuditedAt on the authorization document, in the same operation', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'unconsumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-1' },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(2000));

    assert.notEqual(db.store.authorizations['biz-1']?.expiryAuditedAt, undefined);
  });
});

describe('runBusinessWorthRecoveryExpiryAuditSweep — never audits an ineligible Authorization', () => {
  it('does not audit a still-unconsumed Authorization that has not yet expired', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'unconsumed', expiresAt: fakeTimestamp(5000), targetStockCountId: 'sc-1' },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(1000));

    assert.equal(db.store.auditLog.length, 0);
  });

  it('does not audit an already-consumed Authorization', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'consumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-1' },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(2000));

    assert.equal(db.store.auditLog.length, 0);
  });

  it('does not double-audit an Authorization already marked expiryAuditedAt on an earlier tick', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'unconsumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-1', expiryAuditedAt: fakeTimestamp(1500) },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(3000));

    assert.equal(db.store.auditLog.length, 0);
  });

  it('running the sweep twice against the same expired Authorization produces exactly one audit entry, never two', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'unconsumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-1' },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(2000));
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(3000));

    assert.equal(db.store.auditLog.length, 1);
  });
});

describe('runBusinessWorthRecoveryExpiryAuditSweep — isolation across businesses', () => {
  it('one businesss ineligibility never blocks another eligible businesss audit', async () => {
    const db = makeFakeDb({
      authorizations: {
        'biz-1': { status: 'consumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-1' },
        'biz-2': { status: 'unconsumed', expiresAt: fakeTimestamp(1000), targetStockCountId: 'sc-2' },
      },
    });
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(2000));

    assert.equal(db.store.auditLog.length, 1);
    assert.equal(db.store.auditLog[0].targetBusinessId, 'biz-2');
  });

  it('an empty authorizations collection produces zero audit entries and does not throw', async () => {
    const db = makeFakeDb({});
    const sweep = createBusinessWorthRecoveryExpiryAuditSweep(db, noopReportCriticalFailure);
    await sweep.runBusinessWorthRecoveryExpiryAuditSweep(new Date(2000));

    assert.equal(db.store.auditLog.length, 0);
  });
});
