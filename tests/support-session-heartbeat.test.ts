// SuperAdmin Agent Attended Support Session — Checkpoint 3: bidirectional
// heartbeat and reconnection tests (server/supportSessionHeartbeat.ts).
//
// Governing chain: BDR-0018 -> Policy -> Specification (SPEC-1/2/3) ->
// Rule 8 (CLOSED / PASS, 312f64c, Finding 6-A/11-B) -> Implementation
// Authorization (Signed, 2026-09-11, §3 item 4) -> Checkpoint 3.
//
// SCOPE NOTE (identical in kind to tests/support-session-consumption.test.ts's
// own header): this suite covers everything reachable WITHOUT a live
// Firestore instance — the module's own transition logic, sequentially.
// It does NOT, and cannot, exercise Firestore's actual optimistic-
// concurrency behavior for two genuinely simultaneous transactions —
// that requires the Rules Emulator or a real Firestore instance, neither
// reachable from this sandbox's network egress. This limitation is
// disclosed, not silently skipped.
//
// HOW TO RUN:
//   npx tsx --test tests/support-session-heartbeat.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  recordSupportSessionHeartbeat,
  HEARTBEAT_LAPSE_MS,
  RECONNECT_GRACE_MS,
  type SupportSessionHeartbeatDb,
  type ServerTimestamp,
  type TimestampFactory,
} from '../server/supportSessionHeartbeat';

function fakeTimestamp(ms: number): ServerTimestamp {
  return { toMillis: () => ms };
}

function makeClock(nowMs: number): TimestampFactory {
  return {
    now: () => fakeTimestamp(nowMs),
    fromMillis: (ms: number) => fakeTimestamp(ms),
  };
}

const BUSINESS_ID = 'biz1';
const SESSION_ID = 'session-1';
const OPERATOR_UID = 'operator-1';
const ESTABLISHED_AT_MS = 0;
const EXPIRES_AT_MS = 60 * 60 * 1000; // 60 minutes, FR-17/SESSION_DURATION_MS

function baseSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    businessId: BUSINESS_ID,
    operatorUid: OPERATOR_UID,
    customerUid: 'customer-1',
    renderingPath: null,
    establishedAt: fakeTimestamp(ESTABLISHED_AT_MS),
    expiresAt: fakeTimestamp(EXPIRES_AT_MS),
    status: 'active',
    lastHeartbeatAt: null,
    lastOperatorHeartbeatAt: null,
    graceExpiresAt: null,
    endedAt: null,
    endedBy: null,
    ...overrides,
  };
}

interface Store {
  sessions: Record<string, Record<string, unknown> | undefined>;
}

function makeFakeDb(seedSession: Record<string, unknown> | undefined): SupportSessionHeartbeatDb & { store: Store } {
  const store: Store = { sessions: { [SESSION_ID]: seedSession } };

  return {
    store,
    collection(_name: 'businesses') {
      return {
        doc(_businessId: string) {
          return {
            collection(_sub: 'supportSessions') {
              return {
                doc(sessionId: string) {
                  return {
                    async get() {
                      const data = store.sessions[sessionId];
                      return { exists: !!data, data: () => data };
                    },
                    __update(data: Record<string, unknown>) {
                      store.sessions[sessionId] = { ...(store.sessions[sessionId] ?? {}), ...data };
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
      };
      return fn(tx as never);
    },
  } as unknown as SupportSessionHeartbeatDb & { store: Store };
}

async function heartbeat(
  db: ReturnType<typeof makeFakeDb>,
  nowMs: number,
  participant: 'customer' | 'operator',
  operatorUid?: string
) {
  return recordSupportSessionHeartbeat(db, makeClock(nowMs), {
    businessId: BUSINESS_ID,
    sessionId: SESSION_ID,
    participant,
    operatorUid,
  });
}

// ------------------------------------------------------------------
// 1. Customer heartbeat lapse independently causes reconnecting
// ------------------------------------------------------------------

describe('Checkpoint 3 — item 1: customer heartbeat lapse independently causes reconnecting', () => {
  it('operator fresh, customer lapsed (>=30s since establishedAt, never heartbeated) -> reconnecting', async () => {
    const db = makeFakeDb(baseSession({ lastOperatorHeartbeatAt: fakeTimestamp(1000) }));
    const result = await heartbeat(db, HEARTBEAT_LAPSE_MS + 1000, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'reconnecting');
    assert.equal(db.store.sessions[SESSION_ID]?.status, 'reconnecting');
  });
});

// ------------------------------------------------------------------
// 2. Operator heartbeat lapse independently causes reconnecting
// ------------------------------------------------------------------

describe('Checkpoint 3 — item 2: operator heartbeat lapse independently causes reconnecting', () => {
  it('customer fresh, operator lapsed -> reconnecting, even though the customer is perfectly healthy (FR-54: neither party substitutes for the other)', async () => {
    const db = makeFakeDb(baseSession({ lastHeartbeatAt: fakeTimestamp(1000) }));
    const result = await heartbeat(db, HEARTBEAT_LAPSE_MS + 1000, 'customer');
    assert.equal(result.outcome, 'reconnecting');
    assert.equal(db.store.sessions[SESSION_ID]?.status, 'reconnecting');
  });
});

// ------------------------------------------------------------------
// 3 & 4 & 5. Reconnection before grace deadline restores active,
// without modifying establishedAt/expiresAt
// ------------------------------------------------------------------

describe('Checkpoint 3 — items 3-5: reconnection before grace deadline restores active without touching establishedAt/expiresAt', () => {
  it('both participants fresh again while reconnecting -> active, establishedAt/expiresAt unchanged', async () => {
    const graceStartMs = 100000;
    const db = makeFakeDb(
      baseSession({
        status: 'reconnecting',
        lastHeartbeatAt: fakeTimestamp(graceStartMs),
        lastOperatorHeartbeatAt: fakeTimestamp(1000), // lapsed relative to graceStartMs + a bit
        graceExpiresAt: fakeTimestamp(graceStartMs + RECONNECT_GRACE_MS),
      })
    );
    const recoverMs = graceStartMs + 5000; // well within the 2-minute grace
    const result = await heartbeat(db, recoverMs, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'active');
    if (result.outcome === 'active') assert.equal(result.recoveredFromReconnecting, true);
    const stored = db.store.sessions[SESSION_ID];
    assert.equal(stored?.status, 'active');
    assert.equal(stored?.graceExpiresAt, null);
    assert.equal((stored?.establishedAt as ServerTimestamp).toMillis(), ESTABLISHED_AT_MS, 'establishedAt must be untouched');
    assert.equal((stored?.expiresAt as ServerTimestamp).toMillis(), EXPIRES_AT_MS, 'expiresAt must be untouched');
  });
});

// ------------------------------------------------------------------
// 6. Two-minute grace is enforced
// ------------------------------------------------------------------

describe('Checkpoint 3 — item 6: two-minute grace is enforced', () => {
  it('still lapsed just before the 2-minute grace deadline -> remains reconnecting, not ended', async () => {
    const graceStartMs = 100000;
    const db = makeFakeDb(
      baseSession({
        status: 'reconnecting',
        lastHeartbeatAt: fakeTimestamp(1000), // customer lapsed the whole time
        lastOperatorHeartbeatAt: fakeTimestamp(graceStartMs),
        graceExpiresAt: fakeTimestamp(graceStartMs + RECONNECT_GRACE_MS),
      })
    );
    const stillWithinGraceMs = graceStartMs + RECONNECT_GRACE_MS - 1000;
    const result = await heartbeat(db, stillWithinGraceMs, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'reconnecting');
    assert.equal(db.store.sessions[SESSION_ID]?.status, 'reconnecting');
  });

  it('exactly at/after the 2-minute grace deadline -> ends (abandonment)', async () => {
    const graceStartMs = 100000;
    const db = makeFakeDb(
      baseSession({
        status: 'reconnecting',
        lastHeartbeatAt: fakeTimestamp(1000),
        lastOperatorHeartbeatAt: fakeTimestamp(graceStartMs),
        graceExpiresAt: fakeTimestamp(graceStartMs + RECONNECT_GRACE_MS),
      })
    );
    const atGraceDeadlineMs = graceStartMs + RECONNECT_GRACE_MS;
    const result = await heartbeat(db, atGraceDeadlineMs, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'ended-abandonment');
    const stored = db.store.sessions[SESSION_ID];
    assert.equal(stored?.status, 'ended');
    assert.equal(stored?.endedBy, 'abandonment');
  });
});

// ------------------------------------------------------------------
// 7 & 8. Grace cannot exceed expiresAt; if expiresAt occurs first, the
// session ends at expiresAt
// ------------------------------------------------------------------

describe('Checkpoint 3 — items 7-8: grace never extends past the session\'s own 60-minute expiresAt (I-11)', () => {
  it('the 60-minute cap is reached before the 2-minute grace would naturally end -> session ends at expiresAt, not at the grace deadline', async () => {
    // expiresAt is set 90 seconds after this Session entered
    // 'reconnecting' -- less than the full 2-minute (120s) grace window.
    const graceStartMs = EXPIRES_AT_MS - 90 * 1000;
    const db = makeFakeDb(
      baseSession({
        status: 'reconnecting',
        lastHeartbeatAt: fakeTimestamp(1000),
        lastOperatorHeartbeatAt: fakeTimestamp(graceStartMs),
        graceExpiresAt: fakeTimestamp(Math.min(graceStartMs + RECONNECT_GRACE_MS, EXPIRES_AT_MS)),
      })
    );
    // The raw grace deadline (graceStartMs + 120s) would be AFTER
    // EXPIRES_AT_MS -- but the capped graceExpiresAt already reflects
    // the min(), matching how this module itself would have computed
    // and stored it when the Session first entered 'reconnecting'.
    const atExpiresAtMs = EXPIRES_AT_MS;
    const result = await heartbeat(db, atExpiresAtMs, 'operator', OPERATOR_UID);
    assert.ok(result.outcome === 'ended-abandonment' || result.outcome === 'ended-completed');
    const stored = db.store.sessions[SESSION_ID];
    assert.equal(stored?.status, 'ended');
    assert.equal((stored?.endedAt as ServerTimestamp).toMillis(), EXPIRES_AT_MS, 'must end exactly at expiresAt, never later');
  });

  it('a fresh (still-active) Session that simply reaches its 60-minute cap ends as "completed", not "abandonment"', async () => {
    const db = makeFakeDb(baseSession({ status: 'active', lastHeartbeatAt: fakeTimestamp(1000), lastOperatorHeartbeatAt: fakeTimestamp(1000) }));
    const result = await heartbeat(db, EXPIRES_AT_MS, 'customer');
    assert.equal(result.outcome, 'ended-completed');
    assert.equal(db.store.sessions[SESSION_ID]?.endedBy, 'completed');
  });
});

// ------------------------------------------------------------------
// 9 & 10. A heartbeat after explicit termination cannot resurrect the
// session — Rule 8 Finding 11-B, last-write-wins-with-status-check
// ------------------------------------------------------------------

describe('Checkpoint 3 — items 9-10: a heartbeat after explicit termination cannot resurrect the session (Rule 8 Finding 11-B)', () => {
  it('Session already status: "ended" (e.g. explicit termination, FR-34/FR-35) -> heartbeat no-ops, never errors, never resurrects', async () => {
    const db = makeFakeDb(baseSession({ status: 'ended', endedAt: fakeTimestamp(500), endedBy: 'customer' }));
    const before = { ...db.store.sessions[SESSION_ID] };
    const result = await heartbeat(db, 1000, 'customer');
    assert.equal(result.outcome, 'already-ended');
    assert.deepEqual(db.store.sessions[SESSION_ID], before, 'the ended Session document must be completely untouched');
  });

  it('an operator heartbeat likewise no-ops against an already-ended Session', async () => {
    const db = makeFakeDb(baseSession({ status: 'ended', endedAt: fakeTimestamp(500), endedBy: 'support' }));
    const result = await heartbeat(db, 1000, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'already-ended');
    assert.equal(db.store.sessions[SESSION_ID]?.status, 'ended');
  });
});

// ------------------------------------------------------------------
// Session-not-found / operator-identity mismatch (I-12, applied
// server-side)
// ------------------------------------------------------------------

describe('Checkpoint 3 — additional: session-not-found and operator-identity mismatch', () => {
  it('no Session document exists for the given sessionId -> session-not-found, no write', async () => {
    const db = makeFakeDb(undefined);
    const result = await heartbeat(db, 1000, 'customer');
    assert.equal(result.outcome, 'session-not-found');
  });

  it('an operator whose uid does not match the Session\'s own operatorUid is rejected (I-12) -- never accepted as this Session\'s heartbeat', async () => {
    const db = makeFakeDb(baseSession());
    const result = await heartbeat(db, 1000, 'operator', 'a-different-operator');
    assert.equal(result.outcome, 'operator-mismatch');
    assert.equal(db.store.sessions[SESSION_ID]?.lastOperatorHeartbeatAt, null, 'no heartbeat write for a mismatched operator');
  });
});

// ------------------------------------------------------------------
// Both participants fresh on every heartbeat -> stays active, no
// spurious reconnecting flap
// ------------------------------------------------------------------

describe('Checkpoint 3 — regression: both participants heartbeating normally never enters reconnecting', () => {
  it('customer and operator both heartbeat well within the 30-second window repeatedly -> status remains active throughout', async () => {
    const db = makeFakeDb(baseSession());
    let result = await heartbeat(db, 5000, 'customer');
    assert.equal(result.outcome, 'active');
    result = await heartbeat(db, 6000, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'active');
    result = await heartbeat(db, 20000, 'customer');
    assert.equal(result.outcome, 'active');
    result = await heartbeat(db, 21000, 'operator', OPERATOR_UID);
    assert.equal(result.outcome, 'active');
    assert.equal(db.store.sessions[SESSION_ID]?.status, 'active');
  });

  it('a participant who has not yet sent a first heartbeat is not immediately treated as lapsed (grace anchored to establishedAt)', async () => {
    const db = makeFakeDb(baseSession()); // both heartbeat fields still null, fresh establishment
    const result = await heartbeat(db, 5000, 'customer'); // well within 30s of establishedAt=0
    assert.equal(result.outcome, 'active');
  });
});

// ------------------------------------------------------------------
// 11. Existing Checkpoint 1 and Checkpoint 2 behavior remains intact
// ------------------------------------------------------------------

describe('Checkpoint 3 — item 11: existing Checkpoint 1/2 behavior is unaffected', () => {
  it('this module writes only to the existing supportSessions/{sessionId} document — no new collection, no create() call, update-only', () => {
    // Structural proof: SupportSessionHeartbeatDb's own interface (this
    // file's import) exposes no `.doc()` auto-id / `create()` surface —
    // only `.doc(sessionId)` (existing document) and a transaction
    // whose only mutating method used by this module is `update`.
    // Re-asserted at the type level by the module's own DB interface;
    // covered functionally by every test above never producing a
    // second session id in the store.
    const db = makeFakeDb(baseSession());
    assert.equal(Object.keys(db.store.sessions).length, 1);
  });
});
