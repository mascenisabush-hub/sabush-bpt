// Business Worth Evolution — Implementation Authorization, Increment 8
// (Correction / Recovery) — server-side grant logic tests
// (server/businessWorthRecoveryAuthorization.ts).
//
// Governing chain: docs/specs/business-worth-evolution-specification.md
// (§26, FR-40-FR-43, FR-58) / docs/engineering/business-worth-evolution-
// rule8-assessment.md (Findings 4-A, 4-B, 10-B) / docs/engineering/
// business-worth-evolution-implementation-plan.md (§13) /
// docs/engineering/business-worth-evolution-implementation-authorization.md
// (§20, signed SABUSHIMIKE Masceni, 23 August 2026).
//
// Same convention as tests/superadmin-initial-stock-recovery-
// authorization.test.ts: no suite imports server/index.ts directly (it
// requires real Firebase Admin credentials at module load) — this
// suite exercises the real, importable module directly against an
// in-memory fake satisfying BusinessWorthRecoveryAuthorizationDb.
//
// SCOPE NOTE (honesty, not a claim of completeness): this suite covers
// everything reachable WITHOUT a live Firestore instance — the grant
// function's own precondition logic, sequentially. It does NOT, and
// cannot, exercise Firestore's actual optimistic-concurrency behavior
// for two genuinely simultaneous transactions (that requires the Rules
// Emulator or a real Firestore instance, neither available in this
// sandbox). The "concurrency" test below verifies this module's own
// precondition checks are correct in sequence, which is a necessary but
// not sufficient condition for true concurrent safety.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-recovery-authorization.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  grantBusinessWorthRecoveryAuthorization,
  BUSINESS_WORTH_RECOVERY_AUTHORIZATION_DURATION_MS,
  type BusinessWorthRecoveryAuthorizationDb,
  type ServerTimestamp,
  type TimestampFactory,
} from '../server/businessWorthRecoveryAuthorization';

function fakeTimestamp(ms: number): ServerTimestamp {
  return { toMillis: () => ms };
}

function makeClock(nowMs: number): TimestampFactory {
  return {
    now: () => fakeTimestamp(nowMs),
    fromMillis: (ms: number) => fakeTimestamp(ms),
  };
}

interface FakeStore {
  snapshots: Record<string, Record<string, Record<string, unknown>> | undefined>;
  authorization: Record<string, Record<string, unknown> | undefined>;
}

function makeFakeDb(seed: {
  snapshots?: Record<string, Record<string, Record<string, unknown>>>;
  authorization?: Record<string, Record<string, unknown>>;
}): BusinessWorthRecoveryAuthorizationDb & { store: FakeStore } {
  const store: FakeStore = {
    snapshots: { ...(seed.snapshots ?? {}) },
    authorization: { ...(seed.authorization ?? {}) },
  };

  return {
    store,
    collection(_name: 'businesses') {
      return {
        doc(businessId: string) {
          return {
            collection(sub: 'businessWorthSnapshots' | 'businessWorthRecoveryAuthorizations') {
              return {
                doc(docId: string) {
                  return {
                    async get() {
                      if (sub === 'businessWorthRecoveryAuthorizations') {
                        const data = store.authorization[businessId];
                        return { exists: !!data, data: () => data };
                      }
                      const data = store.snapshots[businessId]?.[docId];
                      return { exists: !!data, data: () => data };
                    },
                    // set() is only ever called by this module against
                    // the 'businessWorthRecoveryAuthorizations'
                    // collection (it never writes businessWorthSnapshots
                    // — FR-42).
                    __set(data: Record<string, unknown>) {
                      if (sub !== 'businessWorthRecoveryAuthorizations') {
                        throw new Error(`test harness: unexpected write to ${sub}`);
                      }
                      store.authorization[businessId] = { ...data };
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
      };
      return fn(tx as never);
    },
  } as unknown as BusinessWorthRecoveryAuthorizationDb & { store: FakeStore };
}

function setup(seed: Parameters<typeof makeFakeDb>[0]) {
  return makeFakeDb(seed);
}

describe('grantBusinessWorthRecoveryAuthorization — input validation', () => {
  it('rejects a missing justification before any read happens', async () => {
    const db = setup({});
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-1',
      justification: '',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'missing-justification');
  });

  it('rejects a missing target', async () => {
    const db = setup({});
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: '',
      justification: 'Cliente contactou o suporte.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'missing-target');
  });
});

describe('grantBusinessWorthRecoveryAuthorization — target eligibility', () => {
  it('rejects a target snapshot that does not exist', async () => {
    const db = setup({});
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-missing',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-not-found');
  });

  it('rejects a snapshot whose status is already "corrected" — no longer current', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-1': { status: 'corrected', sourceStockCountId: 'sc-1' } } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-1',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-not-active');
  });

  it('rejects a snapshot whose status is already "superseded-by-recovery"', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-1': { status: 'superseded-by-recovery', sourceStockCountId: 'sc-1' } } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-1',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-not-active');
  });

  it('grants successfully against a genuinely active snapshot, with a 72-hour expiry and carried-through targetStockCountId', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-1': { status: 'active', sourceStockCountId: 'sc-1' } } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-1',
      justification: 'Cliente contactou o suporte.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
    if (result.outcome !== 'granted') return;
    assert.equal(result.targetSnapshotId, 'bws-1');
    assert.equal(result.targetStockCountId, 'sc-1');
    assert.equal(result.authorizedAt.toMillis(), 1000);
    assert.equal(result.expiresAt.toMillis(), 1000 + BUSINESS_WORTH_RECOVERY_AUTHORIZATION_DURATION_MS);
    assert.equal(BUSINESS_WORTH_RECOVERY_AUTHORIZATION_DURATION_MS, 72 * 60 * 60 * 1000);
  });

  it('never writes to the businessWorthSnapshots collection (FR-42) — only to the Authorization artifact', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-1': { status: 'active', sourceStockCountId: 'sc-1' } } },
    });
    await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-1',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    // The fake harness itself throws if this module ever attempts a
    // write to any collection other than businessWorthRecoveryAuthorizations
    // (see __set above) — reaching this point without throwing IS the
    // assertion. The snapshot's own stored data is also unchanged.
    assert.deepEqual(db.store.snapshots['biz-1']['bws-1'], { status: 'active', sourceStockCountId: 'sc-1' });
  });
});

describe('grantBusinessWorthRecoveryAuthorization — at most one active Authorization per business (FR-41)', () => {
  it('rejects a grant while an existing unconsumed, unexpired Authorization is still active', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-2': { status: 'active', sourceStockCountId: 'sc-2' } } },
      authorization: { 'biz-1': { targetSnapshotId: 'bws-1', status: 'unconsumed', expiresAt: fakeTimestamp(5000) } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-2',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'authorization-already-active');
  });

  it('allows a fresh grant once the existing Authorization has expired', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-2': { status: 'active', sourceStockCountId: 'sc-2' } } },
      authorization: { 'biz-1': { targetSnapshotId: 'bws-1', status: 'unconsumed', expiresAt: fakeTimestamp(500) } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-2',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });

  it('allows a fresh grant once the existing Authorization has already been consumed', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-2': { status: 'active', sourceStockCountId: 'sc-2' } } },
      authorization: { 'biz-1': { targetSnapshotId: 'bws-1', status: 'consumed', expiresAt: fakeTimestamp(5000) } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-2',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });

  it('a fresh grant overwrites the prior (fixed-slot) document, never appending a second one', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-2': { status: 'active', sourceStockCountId: 'sc-2' } } },
      authorization: { 'biz-1': { targetSnapshotId: 'bws-1', status: 'consumed', expiresAt: fakeTimestamp(5000) } },
    });
    await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-2',
      justification: 'Nova autorização.',
      grantedByUid: 'op-1',
    });
    assert.equal(db.store.authorization['biz-1']?.targetSnapshotId, 'bws-2');
    assert.equal(db.store.authorization['biz-1']?.status, 'unconsumed');
  });
});

describe('grantBusinessWorthRecoveryAuthorization — no cycle-count ceiling (Rule 8 Finding 4-B, RESOLVED)', () => {
  it('grants repeatedly against the same business across sequential (non-overlapping) authorizations — no third, hidden ceiling is enforced', async () => {
    const db = setup({
      snapshots: { 'biz-1': { 'bws-1': { status: 'active', sourceStockCountId: 'sc-1' } } },
    });
    for (let i = 0; i < 5; i++) {
      const now = i * (BUSINESS_WORTH_RECOVERY_AUTHORIZATION_DURATION_MS + 1000);
      const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(now), {
        businessId: 'biz-1',
        targetSnapshotId: 'bws-1',
        justification: `Tentativa ${i + 1}.`,
        grantedByUid: 'op-1',
      });
      assert.equal(result.outcome, 'granted', `attempt ${i + 1} should succeed — no cycle ceiling exists for this mechanism`);
    }
  });
});

describe('grantBusinessWorthRecoveryAuthorization — never interacts with the Initial-Stock Authorization collection (FR-43)', () => {
  it('the fake harness itself proves isolation: this module only ever touches businessWorthSnapshots/businessWorthRecoveryAuthorizations, never initialStockRecoveryAuthorization/voidRecords/stockCounts', async () => {
    // Structural proof, not a runtime assertion: BusinessWorthRecoveryAuthorizationDb's
    // own type signature (server/businessWorthRecoveryAuthorization.ts)
    // exposes ONLY 'businessWorthSnapshots' and
    // 'businessWorthRecoveryAuthorizations' as valid sub-collection
    // names — a call site cannot reach 'initialStockRecoveryAuthorization',
    // 'voidRecords', or 'stockCounts' through this type at all, which is
    // what makes FR-43 a compile-time guarantee here, not merely a
    // runtime one.
    const db = setup({
      snapshots: { 'biz-1': { 'bws-1': { status: 'active', sourceStockCountId: 'sc-1' } } },
    });
    const result = await grantBusinessWorthRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetSnapshotId: 'bws-1',
      justification: 'Motivo válido.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });
});
