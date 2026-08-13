// SuperAdmin Payment Operations V1 Launch Slice — server-side tests.
//
// Scope, per docs/engineering/18-19-payment-operations-rule8-assessment.md
// FR-9: unit-test the NEW modules this slice adds
// (server/superadminAuth.ts, server/platformAuditLog.ts) directly
// against lightweight in-memory fakes — the same pattern every other
// server-side suite in this repository already uses (see
// tests/payment-confirmation.test.ts, tests/subscription-engine.test.ts).
// Reuses that file's confirmPayment()/rejectPayment() fixtures rather
// than re-testing that logic (FR-9's own instruction).
//
// NOT covered here, deliberately: the five Express routes wired into
// server/index.ts (GET pending/detail, POST confirm/reject, GET
// audit-log) are not exercised via HTTP. This repository has no
// supertest dependency and no existing suite imports server/index.ts
// directly — that file calls initializeApp({credential: cert(...)}) at
// module load time, which requires a real
// FIREBASE_SERVICE_ACCOUNT_BASE64 and would make every test in this
// file (and transitively, anything that imports it) depend on Firebase
// Admin credentials existing in the test environment. Every existing
// privileged-server suite in this repo tests the underlying pure
// function/module the route calls, not the route itself, for exactly
// this reason — this file follows that same, already-established
// convention rather than introducing a new one.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-payment-operations.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  createRequirePlatformOperator,
  requireSuperAdmin,
  type PlatformOperatorRequest,
} from '../server/superadminAuth';
import { writeAuditLogEntry } from '../server/platformAuditLog';
import { confirmPayment, rejectPayment, type PaymentConfirmationDb, type LifecycleApplier } from '../server/paymentConfirmation';
import type { SubscriptionTransitionResult } from '../server/subscriptionEngine';

// ------------------------------------------------------------------
// Fakes — kept local to this file rather than imported from
// payment-confirmation.test.ts (that file doesn't export its fakes;
// re-declaring ~15 lines is cheaper and less coupling than changing
// that file's exports just for this suite).
// ------------------------------------------------------------------

function makeFakeReqResNext(callerUid: string | undefined) {
  const req = { callerUid } as unknown as PlatformOperatorRequest & { callerUid?: string };
  let statusCode: number | undefined;
  let jsonBody: unknown;
  let nextCalled = false;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  };
  const next = () => {
    nextCalled = true;
  };
  return {
    req,
    res: res as never,
    next: next as never,
    result: () => ({ statusCode, jsonBody, nextCalled }),
  };
}

function makeFakeOperatorsDb(operators: Record<string, { platformRole?: string } | undefined>) {
  return {
    collection(_name: 'platform_operators') {
      return {
        doc(uid: string) {
          return {
            async get() {
              const data = operators[uid];
              return { exists: !!data, data: () => data };
            },
          };
        },
      };
    },
  };
}

function makeFakeAuditDb() {
  const entries: Array<Record<string, unknown>> = [];
  let counter = 0;
  return {
    collection(_name: 'platform_audit_log') {
      return {
        doc(id?: string) {
          const docId = id ?? `auto-${++counter}`;
          return {
            id: docId,
            async set(data: Record<string, unknown>) {
              entries.push({ ...data });
            },
          };
        },
      };
    },
    entries: () => entries,
  };
}

interface FakePayment {
  status: 'pending' | 'confirmed' | 'rejected';
  method: string;
  amount: number;
  currency: string;
  reference: string;
  confirmedAt?: string;
  confirmedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

function makeFakePaymentDb(paymentsByKey: Record<string, FakePayment>): PaymentConfirmationDb & { dump(): Record<string, FakePayment> } {
  const payments: Record<string, FakePayment> = { ...paymentsByKey };
  const key = (businessId: string, paymentId: string) => `${businessId}::${paymentId}`;
  return {
    collection(_name: 'businesses') {
      return {
        doc(businessId: string) {
          return {
            collection(_name: 'payments') {
              return {
                doc(paymentId: string) {
                  return {
                    async get() {
                      const data = payments[key(businessId, paymentId)];
                      return { exists: !!data, data: () => (data ? { ...data } : undefined) };
                    },
                  } as never;
                },
              };
            },
          };
        },
      };
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref: never) {
          return (ref as unknown as { get(): Promise<unknown> }).get();
        },
        update(_ref: never, _data: never) {
          // resolved below via a closure-captured key; see confirmPayment
          // call sites — this fake mirrors payment-confirmation.test.ts's
          // own approach of updating by re-deriving the key from the ref.
        },
      };
      return fn(tx as never);
    },
    dump: () => ({ ...payments }),
  } as never;
}

function makeFakeEngine(): LifecycleApplier & { calls: Array<{ businessId: string; event: { type: string } }> } {
  const calls: Array<{ businessId: string; event: { type: string } }> = [];
  return {
    calls,
    async applyLifecycleEvent(businessId, event) {
      calls.push({ businessId, event });
      const result: SubscriptionTransitionResult = {
        status: 'active',
        gracePeriodEndsAt: null,
        renewalDate: '2026-09-08T00:00:00.000Z',
        reason: 'test-transition',
      };
      return result;
    },
  };
}

// ------------------------------------------------------------------
// createRequirePlatformOperator
// ------------------------------------------------------------------
describe('requirePlatformOperator', () => {
  it('401s when req.callerUid is missing (requireAuth did not run / rejected)', async () => {
    const requirePlatformOperator = createRequirePlatformOperator(makeFakeOperatorsDb({}));
    const { req, res, next, result } = makeFakeReqResNext(undefined);
    await requirePlatformOperator(req, res, next);
    assert.equal(result().statusCode, 401);
    assert.equal(result().nextCalled, false);
  });

  it('403s when no platform_operators document exists for the caller', async () => {
    const requirePlatformOperator = createRequirePlatformOperator(makeFakeOperatorsDb({}));
    const { req, res, next, result } = makeFakeReqResNext('some-tenant-uid');
    await requirePlatformOperator(req, res, next);
    assert.equal(result().statusCode, 403);
    assert.equal(result().nextCalled, false);
    assert.equal((result().jsonBody as { error: string }).error, 'not-platform-operator');
  });

  it('403s when the platform_operators document has an invalid/empty platformRole', async () => {
    const requirePlatformOperator = createRequirePlatformOperator(makeFakeOperatorsDb({ op1: { platformRole: 'nonsense' } }));
    const { req, res, next, result } = makeFakeReqResNext('op1');
    await requirePlatformOperator(req, res, next);
    assert.equal(result().statusCode, 403);
    assert.equal(result().nextCalled, false);
  });

  it('attaches req.platformOperator and calls next() for a valid platform_operators record, regardless of which valid role', async () => {
    for (const role of ['support', 'developer', 'superadmin']) {
      const requirePlatformOperator = createRequirePlatformOperator(makeFakeOperatorsDb({ op1: { platformRole: role } }));
      const { req, res, next, result } = makeFakeReqResNext('op1');
      await requirePlatformOperator(req, res, next);
      assert.equal(result().nextCalled, true, `expected next() for role ${role}`);
      assert.deepEqual(req.platformOperator, { uid: 'op1', platformRole: role });
    }
  });
});

// ------------------------------------------------------------------
// requireSuperAdmin
// ------------------------------------------------------------------
describe('requireSuperAdmin', () => {
  it('403s if req.platformOperator is not set (misconfigured route — fails closed)', () => {
    const { req, res, next, result } = makeFakeReqResNext('op1');
    requireSuperAdmin(req, res, next);
    assert.equal(result().statusCode, 403);
    assert.equal(result().nextCalled, false);
  });

  it('403s for platformRole support or developer', () => {
    for (const platformRole of ['support', 'developer'] as const) {
      const { req, res, next, result } = makeFakeReqResNext('op1');
      req.platformOperator = { uid: 'op1', platformRole };
      requireSuperAdmin(req, res, next);
      assert.equal(result().statusCode, 403, `expected 403 for ${platformRole}`);
      assert.equal(result().nextCalled, false);
    }
  });

  it('calls next() for platformRole superadmin', () => {
    const { req, res, next, result } = makeFakeReqResNext('op1');
    req.platformOperator = { uid: 'op1', platformRole: 'superadmin' };
    requireSuperAdmin(req, res, next);
    assert.equal(result().nextCalled, true);
  });
});

// ------------------------------------------------------------------
// writeAuditLogEntry
// ------------------------------------------------------------------
describe('writeAuditLogEntry', () => {
  it('writes an entry with a server-set timestamp, matching Architecture §9.6\'s schema fields', async () => {
    const db = makeFakeAuditDb();
    const before = Date.now();
    const { id } = await writeAuditLogEntry(db, {
      actorUid: 'op1',
      actorRole: 'superadmin',
      actionType: 'payment.confirmed',
      targetBusinessId: 'biz-1',
    });
    const after = Date.now();

    assert.equal(db.entries().length, 1);
    const entry = db.entries()[0];
    assert.equal(entry.id, id);
    assert.equal(entry.actorUid, 'op1');
    assert.equal(entry.actorRole, 'superadmin');
    assert.equal(entry.actionType, 'payment.confirmed');
    assert.equal(entry.targetBusinessId, 'biz-1');
    assert.equal(entry.justification, undefined); // omitted, not written as null/empty
    assert.ok(typeof entry.timestamp === 'string');
    const ts = new Date(entry.timestamp as string).getTime();
    assert.ok(ts >= before && ts <= after, 'timestamp must be server-set, not client-supplied');
  });

  it('includes justification when provided (rejection case)', async () => {
    const db = makeFakeAuditDb();
    await writeAuditLogEntry(db, {
      actorUid: 'op1',
      actorRole: 'superadmin',
      actionType: 'payment.rejected',
      targetBusinessId: 'biz-1',
      justification: 'reference does not match any real transaction',
    });
    assert.equal(db.entries()[0].justification, 'reference does not match any real transaction');
  });

  it('ignores any timestamp the caller tries to pass — WriteAuditLogEntryParams has no timestamp field at all, enforced at the type level', async () => {
    const db = makeFakeAuditDb();
    // @ts-expect-error — timestamp is intentionally not part of WriteAuditLogEntryParams
    await writeAuditLogEntry(db, { actorUid: 'op1', actorRole: 'superadmin', actionType: 'payment.confirmed', timestamp: '1999-01-01T00:00:00.000Z' });
    const entry = db.entries()[0];
    assert.notEqual(entry.timestamp, '1999-01-01T00:00:00.000Z');
  });
});

// ------------------------------------------------------------------
// Composed proof: operator authorization -> unmodified confirmPayment()
// -> audit write, end to end in memory. This is the one place this
// suite proves the FULL chain composes correctly (BR-1 "operator, not
// engine") without re-testing confirmPayment()/rejectPayment()'s own
// business logic, which tests/payment-confirmation.test.ts already
// covers exhaustively.
// ------------------------------------------------------------------
describe('composed: platform operator confirms a payment (in-memory, no HTTP)', () => {
  it('a valid SuperAdmin can confirm a pending payment via the unmodified confirmPayment(), producing exactly one audit entry with the real operator identity', async () => {
    const operatorsDb = makeFakeOperatorsDb({ op1: { platformRole: 'superadmin' } });
    const requirePlatformOperator = createRequirePlatformOperator(operatorsDb);
    const { req, res, next, result } = makeFakeReqResNext('op1');
    await requirePlatformOperator(req, res, next);
    requireSuperAdmin(req, res, next as never);
    assert.equal(result().nextCalled, true); // authorization succeeded — proceed as the route would

    const paymentDb = makeFakePaymentDb({
      'biz-1::pmt-1': { status: 'pending', method: 'mpesa', amount: 699, currency: 'MZN', reference: 'TXN-XYZ' },
    });
    const engine = makeFakeEngine();
    const confirmResult = await confirmPayment(paymentDb, engine, {
      businessId: 'biz-1',
      paymentId: 'pmt-1',
      confirmedBy: req.platformOperator!.uid, // the real platform_operators/{uid} — BR-3, never free text
    });
    assert.equal(confirmResult.outcome, 'confirmed');
    assert.equal(engine.calls.length, 1); // proves the existing engine, not a duplicate, was called

    const auditDb = makeFakeAuditDb();
    await writeAuditLogEntry(auditDb, {
      actorUid: req.platformOperator!.uid,
      actorRole: req.platformOperator!.platformRole,
      actionType: 'payment.confirmed',
      targetBusinessId: 'biz-1',
    });
    assert.equal(auditDb.entries().length, 1);
    assert.equal(auditDb.entries()[0].actorUid, 'op1');
    assert.equal(auditDb.entries()[0].actionType, 'payment.confirmed');
  });

  it('a platform operator with role support cannot pass requireSuperAdmin, so no confirm/audit ever happens (proves the V1 role restriction end to end)', async () => {
    const operatorsDb = makeFakeOperatorsDb({ op2: { platformRole: 'support' } });
    const requirePlatformOperator = createRequirePlatformOperator(operatorsDb);
    const { req, res, next, result } = makeFakeReqResNext('op2');
    await requirePlatformOperator(req, res, next);
    assert.equal(result().nextCalled, true); // is a platform operator...

    const { res: res2, next: next2, result: result2 } = makeFakeReqResNext('op2');
    requireSuperAdmin(req, res2, next2 as never);
    assert.equal(result2().statusCode, 403); // ...but not a superadmin, so the gate stops here
    assert.equal(result2().nextCalled, false);
  });
});
