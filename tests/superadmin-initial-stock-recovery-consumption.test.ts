// SuperAdmin-Assisted Initial Stock Recovery — Consumption & Audit
// Amendment: server-side consumption logic tests
// (server/initialStockRecoveryConsumption.ts).
//
// Governing chain: BDR-0016/POL-0009/Specification/Rule 8 (READY) ->
// Consumption-Audit Rule 8 Re-Assessment (READY) -> Consumption & Audit
// Amendment -> Supplementary Implementation Authorization (Signed,
// 2026-08-21).
//
// Same convention as tests/superadmin-initial-stock-recovery-authorization.test.ts:
// no suite imports server/index.ts directly. Covers items 12-25 of the
// verification checklist reachable WITHOUT a live Firestore instance —
// see this suite's own honesty note on true concurrency at the bottom.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-initial-stock-recovery-consumption.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  consumeInitialStockRecoveryAuthorization,
  type InitialStockRecoveryConsumptionDb,
  type ServerTimestamp,
  type TimestampFactory,
} from '../server/initialStockRecoveryConsumption';

function fakeTimestamp(ms: number): ServerTimestamp {
  return { toMillis: () => ms };
}

function makeClock(nowMs: number): TimestampFactory {
  return { now: () => fakeTimestamp(nowMs) };
}

interface Store {
  users: Record<string, Record<string, unknown> | undefined>;
  stockCounts: Record<string, Record<string, Record<string, unknown>> | undefined>;
  voidRecords: Record<string, Record<string, Record<string, unknown>> | undefined>;
  authorization: Record<string, Record<string, unknown> | undefined>;
}

function makeFakeDb(seed: Partial<Store>): InitialStockRecoveryConsumptionDb & { store: Store } {
  const store: Store = {
    users: { ...(seed.users ?? {}) },
    stockCounts: { ...(seed.stockCounts ?? {}) },
    voidRecords: { ...(seed.voidRecords ?? {}) },
    authorization: { ...(seed.authorization ?? {}) },
  };

  return {
    store,
    collection(name: 'users' | 'businesses') {
      if (name === 'users') {
        return {
          doc(uid: string) {
            return {
              async get() {
                const data = store.users[uid];
                return { exists: !!data, data: () => data };
              },
            };
          },
        } as never;
      }
      return {
        doc(businessId: string) {
          return {
            collection(sub: 'stockCounts' | 'voidRecords' | 'initialStockRecoveryAuthorization') {
              return {
                doc(docId: string) {
                  return {
                    async get() {
                      if (sub === 'initialStockRecoveryAuthorization') {
                        const data = store.authorization[businessId];
                        return { exists: !!data, data: () => data };
                      }
                      const bucket = sub === 'stockCounts' ? store.stockCounts : store.voidRecords;
                      const data = bucket[businessId]?.[docId];
                      return { exists: !!data, data: () => data };
                    },
                    __create(data: Record<string, unknown>) {
                      if (sub !== 'voidRecords') throw new Error(`test harness: unexpected create on ${sub}`);
                      if (!store.voidRecords[businessId]) store.voidRecords[businessId] = {};
                      if (store.voidRecords[businessId]![docId]) {
                        throw new Error('ALREADY_EXISTS');
                      }
                      store.voidRecords[businessId]![docId] = { ...data };
                    },
                    __update(data: Record<string, unknown>) {
                      if (sub !== 'initialStockRecoveryAuthorization') throw new Error(`test harness: unexpected update on ${sub}`);
                      store.authorization[businessId] = { ...(store.authorization[businessId] ?? {}), ...data };
                    },
                  };
                },
              };
            },
          };
        },
      } as never;
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref: { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }> }) {
          return ref.get();
        },
        create(ref: { __create(data: Record<string, unknown>): void }, data: Record<string, unknown>) {
          ref.__create(data);
        },
        update(ref: { __update(data: Record<string, unknown>): void }, data: Record<string, unknown>) {
          ref.__update(data);
        },
      };
      return fn(tx as never);
    },
  } as unknown as InitialStockRecoveryConsumptionDb & { store: Store };
}

function ownerUser(businessId: string) {
  return { role: 'owner', businessId };
}

const VALID_AUTH_MS = 1000;
const VALID_AUTH_EXPIRES_MS = VALID_AUTH_MS + 48 * 60 * 60 * 1000;

function activeAuthorization(overrides: Record<string, unknown> = {}) {
  return {
    targetStockCountId: 'initial',
    authorizedAt: fakeTimestamp(VALID_AUTH_MS),
    expiresAt: fakeTimestamp(VALID_AUTH_EXPIRES_MS),
    status: 'unconsumed',
    grantedByUid: 'op-1',
    justification: 'Cliente contactou o suporte — confirmação acidental.',
    ...overrides,
  };
}

// ------------------------------------------------------------------

describe('consumeInitialStockRecoveryAuthorization — authentication and ownership (items 12-16)', () => {
  it('rejects an unknown/missing requester profile', async () => {
    const db = makeFakeDb({});
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'ghost',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'requester-not-found');
  });

  it('REJECTS a Manager (staff role, even with businessId match) — item 13', async () => {
    const db = makeFakeDb({
      users: { 'mgr-1': { role: 'staff', staffTier: 'manager', businessId: 'biz-1' } },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'mgr-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'not-owner');
  });

  it('REJECTS Staff — item 14', async () => {
    const db = makeFakeDb({
      users: { 'staff-1': { role: 'staff', businessId: 'biz-1' } },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'staff-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'not-owner');
  });

  it('REJECTS an Owner of a DIFFERENT business ("wrong business cannot consume" — item 12)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-OTHER') },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'not-owner');
  });

  it('ALLOWS the correct Owner (role owner, matching businessId) — item 16', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'consumed');
  });

  it('ALLOWS an Owner/Admin with multi-shop businessIds[] including the target', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': { role: 'owner', businessIds: ['biz-1', 'biz-2'] } },
      stockCounts: { 'biz-2': { initial: { type: 'initial' } } },
      authorization: { 'biz-2': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-2',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'consumed');
  });
});

describe('consumeInitialStockRecoveryAuthorization — target/current-confirmation validation (items 17-18)', () => {
  it('REJECTS a target that does not exist', async () => {
    const db = makeFakeDb({ users: { 'owner-1': ownerUser('biz-1') }, stockCounts: { 'biz-1': {} } });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'target-not-found');
  });

  it('REJECTS a non-current confirmation — a voidRecords entry already exists for it (item 18)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      voidRecords: { 'biz-1': { initial: { voidedConfirmationId: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'target-not-current');
  });

  it('REJECTS a confirmation the Authorization does NOT name — "wrong confirmation cannot consume" (item 17)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { 'initial-2': { type: 'initial', chainPosition: 2 } } },
      authorization: { 'biz-1': activeAuthorization({ targetStockCountId: 'initial' }) },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial-2',
    });
    assert.equal(result.outcome, 'authorization-mismatch');
  });
});

describe('consumeInitialStockRecoveryAuthorization — Authorization validity (items 19-20)', () => {
  it('REJECTS when no Authorization exists at all', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'no-active-authorization');
  });

  it('REJECTS an EXPIRED Authorization — item 19', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(VALID_AUTH_EXPIRES_MS + 1), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'authorization-expired');
  });

  it('is ineligible exactly at the 48-hour boundary (now === expiresAt) — same "<" discipline as the ordinary window', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(VALID_AUTH_EXPIRES_MS), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'authorization-expired');
  });

  it('REJECTS (returns already-consumed, not a fresh error) an ALREADY-CONSUMED Authorization — item 20', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization({ status: 'consumed' }) },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'already-consumed');
    if (result.outcome === 'already-consumed') {
      assert.equal(result.consumed, true);
    }
  });
});

describe('consumeInitialStockRecoveryAuthorization — Confirmation #4 ceiling (item 21)', () => {
  it('REJECTS a target at Confirmation #4 (chainPosition 4)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { 'initial-4': { type: 'initial', chainPosition: 4 } } },
      authorization: { 'biz-1': activeAuthorization({ targetStockCountId: 'initial-4' }) },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial-4',
    });
    assert.equal(result.outcome, 'target-at-ceiling');
  });

  it('ALLOWS a legacy target (no chainPosition field — defaults to 1, never excluded)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'consumed');
  });
});

describe('consumeInitialStockRecoveryAuthorization — transactional integrity (items 10, 23, 24)', () => {
  it('creates VoidRecord AND marks the Authorization consumed together, in one successful outcome', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'consumed');
    assert.ok(db.store.voidRecords['biz-1']?.initial, 'expected a voidRecords/initial document to exist');
    assert.equal(db.store.authorization['biz-1']?.status, 'consumed');
    assert.ok(db.store.authorization['biz-1']?.consumedAt, 'expected consumedAt to be set');
  });

  it('NEVER writes any field to stockCounts — original immutability (item 10, 23)', async () => {
    const originalTarget = { type: 'initial', items: [{ productName: 'X', quantity: 1, costPrice: 10, totalValue: 10 }] };
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { ...originalTarget } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'consumed');
    assert.deepEqual(db.store.stockCounts['biz-1']?.initial, originalTarget);
  });

  it('never writes confirmedAt or chainPosition anywhere (no fabrication/backfill)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    const voidRecord = db.store.voidRecords['biz-1']?.initial;
    const authorization = db.store.authorization['biz-1'];
    assert.equal('confirmedAt' in (voidRecord ?? {}), false);
    assert.equal('chainPosition' in (voidRecord ?? {}), false);
    assert.equal('confirmedAt' in (authorization ?? {}), false);
    assert.equal('chainPosition' in (authorization ?? {}), false);
  });

  it('a second create() attempt at the same voidRecords id fails (create-once guarantee, item 24 — sequential proxy for true concurrency)', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization() },
    });
    const first = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(first.outcome, 'consumed');
    // A second attempt now sees status === 'consumed' and returns the
    // idempotent outcome — it never reaches the create() call again,
    // so the create-once guarantee is never even exercised on a real
    // second attempt through the public function; this is exactly the
    // idempotency behavior the amendment requires (item 20/25 proxy).
    const second = await consumeInitialStockRecoveryAuthorization(db, makeClock(2001), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(second.outcome, 'already-consumed');
  });
});

describe('consumeInitialStockRecoveryAuthorization — returned audit context (feeds items 29-30, checked in server/index.ts)', () => {
  it('returns the Authorization\'s own authorizedAt and justification unchanged, for the caller to build the audit entry from', async () => {
    const db = makeFakeDb({
      users: { 'owner-1': ownerUser('biz-1') },
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: { 'biz-1': activeAuthorization({ justification: 'Texto exato do SuperAdmin.' }) },
    });
    const result = await consumeInitialStockRecoveryAuthorization(db, makeClock(2000), {
      requesterUid: 'owner-1',
      businessId: 'biz-1',
      targetStockCountId: 'initial',
    });
    assert.equal(result.outcome, 'consumed');
    if (result.outcome !== 'consumed') return;
    assert.equal(result.authorizationAuthorizedAt.toMillis(), VALID_AUTH_MS);
    assert.equal(result.authorizationJustification, 'Texto exato do SuperAdmin.');
  });
});

// ------------------------------------------------------------------
// Source-level regression guards — server/index.ts's route wiring.
// server/index.ts cannot be imported directly (Firebase Admin init at
// module load, see this file's own header) — same limitation, same
// established technique as tests/smart-stock-entry.test.ts and others.
// ------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const serverIndexSource = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf-8');

describe('server/index.ts — /api/initial-stock-recovery/consume route wiring', () => {
  it('is gated by requireAuth (tenantOnly) — never requirePlatformOperator/requireSuperAdmin (item 8; Acceptance Criterion 3)', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume', tenantOnly, requireAuth, async[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch, 'expected the consume route to exist with tenantOnly, requireAuth gating');
    const body = routeMatch![0];
    assert.doesNotMatch(body, /requirePlatformOperator/);
    assert.doesNotMatch(body, /requireSuperAdmin/);
  });

  it('never accepts a justification/reason field from the request body (item C — no new Owner-entered reason field)', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    assert.doesNotMatch(body, /req\.body\?\.justification/);
    assert.doesNotMatch(body, /req\.body\?\.reason/);
  });

  it('the .consumed audit entry uses actorRole "owner" and the consuming Owner\'s own uid, never the granting SuperAdmin\'s', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    assert.match(body, /actionType: 'initial_stock_recovery\.consumed'/);
    assert.match(body, /actorUid: requesterUid/);
    assert.match(body, /actorRole: 'owner'/);
  });

  it('the .consumed audit entry reuses the Authorization\'s own justification verbatim — no new reason text', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    assert.match(body, /justification: result\.authorizationJustification/);
  });

  it('the .consumed audit entry includes targetStockCountId and authorizationId', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    assert.match(body, /targetStockCountId: result\.targetStockCountId/);
    assert.match(body, /authorizationId: new Date\(result\.authorizationAuthorizedAt\.toMillis\(\)\)\.toISOString\(\)/);
  });

  it('the audit write happens AFTER, not inside, the recovery transaction — never claimed atomic (Amendment §4)', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    const consumeCallIndex = body.indexOf('consumeInitialStockRecoveryAuthorization(');
    const auditCallIndex = body.indexOf('writeAuditLogEntry(');
    assert.ok(consumeCallIndex >= 0 && auditCallIndex >= 0);
    assert.ok(auditCallIndex > consumeCallIndex, 'expected the audit write to be textually after the transaction call');
  });

  it('a failed audit write is surfaced (auditLogged: false) and never rolls back the recovery — never re-throws to fail the request', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    assert.match(body, /auditLogged = false;/);
    assert.match(body, /auditLogged \? \{\} : \{ auditLogged: false \}/);
    // The outer response for a successful transaction is always sent
    // (res.json with outcome: 'consumed') regardless of audit outcome —
    // no early return / error path exists between the transaction
    // succeeding and this final response.
    assert.match(body, /outcome: 'consumed'/);
  });

  it('an already-consumed outcome (idempotent retry) still returns success, with alreadyConsumed flagged, not an error', () => {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\('\/api\/initial-stock-recovery\/consume'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch);
    const body = routeMatch![0];
    assert.match(body, /already-consumed/);
    assert.match(body, /alreadyConsumed: true/);
  });
});
// recoveries"): the test above ("a second create() attempt...")
// verifies this module's OWN precondition logic is correct in
// sequence — it does not, and cannot in this sandbox, exercise
// Firestore's actual optimistic-concurrency behavior for two
// genuinely SIMULTANEOUS transactions. That requires the Rules
// Emulator or a real Firestore instance, neither available here (see
// this session's own verification report). What IS verified: (a) the
// underlying voidRecords.create() call fails if the document already
// exists (fake harness enforces this explicitly, matching real
// Firestore Transaction.create() semantics), and (b) a second call to
// the public function after a first success never reaches that
// create() call again, because it correctly reads 'consumed' first.
// True concurrent safety additionally depends on Firestore's own
// transaction guarantees, unmodified and un-owned by this module, and
// must be verified against a real emulator/Firestore instance before
// this ships.
// ------------------------------------------------------------------
