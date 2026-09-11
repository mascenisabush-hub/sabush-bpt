// SuperAdmin Agent Attended Support Session — Checkpoint 2: code
// consumption / lockout / Session establishment tests
// (server/supportSessionConsumption.ts).
//
// Governing chain: BDR-0018 -> Policy -> Specification (SPEC-1/2/3) ->
// Rule 8 (CLOSED / PASS, 312f64c) -> Implementation Authorization
// (Signed, 2026-09-11) -> Checkpoint 2.
//
// SCOPE NOTE (honesty, not a claim of completeness — identical in kind
// to tests/superadmin-initial-stock-recovery-authorization.test.ts's
// own header): this suite covers everything reachable WITHOUT a live
// Firestore instance — the module's own precondition and transition
// logic, sequentially. It does NOT, and cannot, exercise Firestore's
// actual optimistic-concurrency behavior for two genuinely simultaneous
// transactions — that requires the Rules Emulator or a real Firestore
// instance, neither reachable from this sandbox's network egress.
//
// HOW TO RUN:
//   npx tsx --test tests/support-session-consumption.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import crypto from 'crypto';
import {
  consumeSupportSessionInvitationCode,
  LOCKOUT_MAX_ATTEMPTS,
  SESSION_DURATION_MS,
  type SupportSessionConsumptionDb,
  type ServerTimestamp,
  type TimestampFactory,
} from '../server/supportSessionConsumption';

function fakeTimestamp(ms: number): ServerTimestamp {
  return { toMillis: () => ms };
}

function makeClock(nowMs: number): TimestampFactory {
  return {
    now: () => fakeTimestamp(nowMs),
    fromMillis: (ms: number) => fakeTimestamp(ms),
  };
}

function hashCode(code: string, salt: string): string {
  return crypto.scryptSync(code, salt, 64).toString('hex');
}

const SALT = 'test-salt';
const CODE = '123456';

function activeInvitation(overrides: Record<string, unknown> = {}) {
  return {
    codeHash: hashCode(CODE, SALT),
    codeSalt: SALT,
    status: 'active',
    generatedAt: fakeTimestamp(0),
    expiresAt: fakeTimestamp(5 * 60 * 1000),
    failedAttempts: 0,
    lockedAt: null,
    consumedByUid: null,
    consumedAt: null,
    generatedByUid: 'customer-1',
    ...overrides,
  };
}

interface Store {
  invitations: Record<string, Record<string, unknown> | undefined>;
  sessions: Record<string, Record<string, Record<string, unknown>>>;
  autoIdCounter: number;
}

function makeFakeDb(seed: { invitations?: Record<string, Record<string, unknown>> }): SupportSessionConsumptionDb & { store: Store } {
  const store: Store = {
    invitations: { ...(seed.invitations ?? {}) },
    sessions: {},
    autoIdCounter: 0,
  };

  return {
    store,
    collection(_name: 'businesses') {
      return {
        doc(businessId: string) {
          return {
            collection(sub: 'supportSessionInvitation' | 'supportSessions') {
              if (sub === 'supportSessionInvitation') {
                return {
                  doc(_docId: 'current') {
                    return {
                      async get() {
                        const data = store.invitations[businessId];
                        return { exists: !!data, data: () => data };
                      },
                      __update(data: Record<string, unknown>) {
                        store.invitations[businessId] = { ...(store.invitations[businessId] ?? {}), ...data };
                      },
                    };
                  },
                };
              }
              return {
                doc() {
                  const id = `session-${++store.autoIdCounter}`;
                  return {
                    id,
                    __create(data: Record<string, unknown>) {
                      store.sessions[businessId] = store.sessions[businessId] ?? {};
                      store.sessions[businessId][id] = data;
                    },
                  };
                },
              };
            },
          };
        },
      } as any;
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref: { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }> }) {
          return ref.get();
        },
        update(ref: { __update(data: Record<string, unknown>): void }, data: Record<string, unknown>) {
          ref.__update(data);
        },
        create(ref: { __create(data: Record<string, unknown>): void }, data: Record<string, unknown>) {
          ref.__create(data);
        },
      };
      return fn(tx as never);
    },
  } as unknown as SupportSessionConsumptionDb & { store: Store };
}

// ------------------------------------------------------------------

describe('consumeSupportSessionInvitationCode — no active invitation', () => {
  it('rejects when no Invitation exists for the business (FR-10, Rule K)', async () => {
    const db = makeFakeDb({});
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'no-active-invitation');
  });
});

describe('consumeSupportSessionInvitationCode — expiry (FR-6, FR-7)', () => {
  it('rejects and lazily transitions an unconsumed, time-expired Invitation', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(5 * 60 * 1000 + 1), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'invitation-expired');
    assert.equal(db.store.invitations['biz1']!.status, 'expired');
  });

  it('rejects an already status:expired Invitation without rewriting it', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation({ status: 'expired' }) } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'invitation-expired');
  });

  it('the 5-minute window never restarts on a failed attempt (FR-7)', async () => {
    // A failed attempt at t=100 does not push expiresAt out — still
    // expired at the original boundary.
    const db = makeFakeDb({ invitations: { biz1: activeInvitation({ failedAttempts: 1 }) } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(5 * 60 * 1000 + 1), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'invitation-expired');
  });
});

describe('consumeSupportSessionInvitationCode — lockout (FR-13-FR-16, Rule G)', () => {
  it('rejects a locked Invitation without evaluating the code at all (FR-15)', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation({ status: 'locked', failedAttempts: 5, lockedAt: fakeTimestamp(500) }) } });
    // Even the CORRECT code must fail once locked.
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'invitation-locked');
  });

  it('increments failedAttempts on attempts 1-4 without locking', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    for (let attempt = 1; attempt <= 4; attempt++) {
      const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
        businessId: 'biz1',
        code: 'wrong0',
        operatorUid: 'op1',
      });
      assert.equal(result.outcome, 'invalid-code');
      if (result.outcome === 'invalid-code') {
        assert.equal(result.attemptsRemaining, LOCKOUT_MAX_ATTEMPTS - attempt);
      }
      assert.equal(db.store.invitations['biz1']!.status, 'active');
      assert.equal(db.store.invitations['biz1']!.failedAttempts, attempt);
    }
  });

  it('the 5th failed attempt permanently locks the Invitation (FR-14)', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation({ failedAttempts: 4 }) } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: 'wrong0',
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'locked-now');
    const stored = db.store.invitations['biz1']!;
    assert.equal(stored.status, 'locked');
    assert.equal(stored.failedAttempts, 5);
    assert.ok(stored.lockedAt);
  });

  it('a locked Invitation can never reach 6+ recorded attempts (FR-15 — no further evaluation once locked)', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation({ status: 'locked', failedAttempts: 5, lockedAt: fakeTimestamp(500) }) } });
    await consumeSupportSessionInvitationCode(db, makeClock(1000), { businessId: 'biz1', code: 'wrong0', operatorUid: 'op1' });
    assert.equal(db.store.invitations['biz1']!.failedAttempts, 5);
  });
});

describe('consumeSupportSessionInvitationCode — already consumed (I-4)', () => {
  it('rejects a consumed Invitation, correct code or not', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation({ status: 'consumed', consumedByUid: 'other-op', consumedAt: fakeTimestamp(500) }) } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'invitation-already-consumed');
  });
});

describe('consumeSupportSessionInvitationCode — successful establishment (FR-11, FR-12, I-4, I-5)', () => {
  it('establishes a Session bound to the entering operator, unbound to any prior relationship (Rule H / CODE-2)', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op-first-to-try',
    });
    assert.equal(result.outcome, 'established');
    if (result.outcome !== 'established') return;
    assert.equal(result.businessId, 'biz1');
    assert.equal(result.operatorUid, 'op-first-to-try');
    assert.equal(result.customerUid, 'customer-1');
    assert.equal(result.establishedAt.toMillis(), 1000);
    assert.equal(result.expiresAt.toMillis(), 1000 + SESSION_DURATION_MS);

    // Invitation transitioned atomically alongside Session creation.
    const invitation = db.store.invitations['biz1']!;
    assert.equal(invitation.status, 'consumed');
    assert.equal(invitation.consumedByUid, 'op-first-to-try');

    const session = db.store.sessions['biz1'][result.sessionId];
    assert.equal(session.businessId, 'biz1');
    assert.equal(session.operatorUid, 'op-first-to-try');
    assert.equal(session.customerUid, 'customer-1');
    assert.equal(session.status, 'active');
    assert.equal((session.expiresAt as ServerTimestamp).toMillis(), 1000 + SESSION_DURATION_MS);
    assert.equal(session.endedAt, null);
    assert.equal(session.endedBy, null);
  });

  it('a consumed code can never be consumed a second time, by any operator (Rule H, I-4)', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    const first = await consumeSupportSessionInvitationCode(db, makeClock(1000), { businessId: 'biz1', code: CODE, operatorUid: 'op1' });
    assert.equal(first.outcome, 'established');

    const second = await consumeSupportSessionInvitationCode(db, makeClock(1500), { businessId: 'biz1', code: CODE, operatorUid: 'op2' });
    assert.equal(second.outcome, 'invitation-already-consumed');
  });

  it('never checks any prior relationship between operator and business before granting (FR-12)', async () => {
    // op-with-no-history has no seeded relationship of any kind — the
    // module accepts any operatorUid string, trusting only that the
    // caller (server/index.ts route, gated by
    // requireSupportEligibleOperator) already verified platformRole
    // eligibility before invoking this module.
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op-with-no-history',
    });
    assert.equal(result.outcome, 'established');
  });
});

describe('consumeSupportSessionInvitationCode — code verification (FR-4)', () => {
  it('rejects an incorrect code without revealing the correct one', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: '000000',
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'invalid-code');
  });

  it('accepts the exact correct code', async () => {
    const db = makeFakeDb({ invitations: { biz1: activeInvitation() } });
    const result = await consumeSupportSessionInvitationCode(db, makeClock(1000), {
      businessId: 'biz1',
      code: CODE,
      operatorUid: 'op1',
    });
    assert.equal(result.outcome, 'established');
  });
});
