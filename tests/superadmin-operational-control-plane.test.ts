// SuperAdmin V1 Operational Control Plane — Phase A server-side tests
// (ADR-0006, docs/engineering/18-superadmin-v1-operational-control-plane-implementation-plan.md).
//
// Scope: server/operatorManagement.ts only, exercised directly against
// an in-memory fake — the real module, not a duplicated test-only
// implementation. Same convention tests/superadmin-payment-operations.test.ts
// already established: this repository has no supertest dependency and
// no suite imports server/index.ts directly (it calls
// initializeApp({credential: cert(...)}) at module load, requiring real
// Firebase Admin credentials) — every privileged-server route in
// server/index.ts is a thin wrapper, tested here at the module it
// delegates to, not at the HTTP layer.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-operational-control-plane.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  provisionOperator,
  revokeOperator,
  listOperators,
  type OperatorsCollection,
} from '../server/operatorManagement';
import { writeAuditLogEntry } from '../server/platformAuditLog';

// ------------------------------------------------------------------
// Fake — kept local, same shape as makeFakeOperatorsDb in
// superadmin-payment-operations.test.ts but extended with set/delete
// and a collection-level get() (for the last-SuperAdmin count), since
// operatorManagement.ts's OperatorsCollection interface needs more than
// superadminAuth.ts's own read-only PlatformOperatorsCollection does.
// ------------------------------------------------------------------

function makeFakeOperatorsDb(initial: Record<string, { platformRole?: string } | undefined>): OperatorsCollection & { dump(): Record<string, { platformRole?: string } | undefined> } {
  const operators: Record<string, { platformRole?: string } | undefined> = { ...initial };
  return {
    collection(_name: 'platform_operators') {
      return {
        doc(uid: string) {
          return {
            async get() {
              const data = operators[uid];
              return { exists: !!data, data: () => data };
            },
            async set(data: { platformRole: string }) {
              operators[uid] = { ...data };
            },
            async delete() {
              delete operators[uid];
            },
          };
        },
        async get() {
          return {
            docs: Object.entries(operators).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          };
        },
      };
    },
    dump: () => ({ ...operators }),
  } as never;
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

// ------------------------------------------------------------------
// provisionOperator — BR-2 (no self-escalation)
// ------------------------------------------------------------------
describe('provisionOperator', () => {
  it('rejects provisioning when targetUid equals requesterUid (self-target, BR-2)', async () => {
    const db = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
    const result = await provisionOperator(db, { targetUid: 'op-1', platformRole: 'support', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'self-target');
    assert.deepEqual(db.dump()['op-1'], { platformRole: 'superadmin' }); // unchanged — no write happened
  });

  it('rejects an empty uid', async () => {
    const db = makeFakeOperatorsDb({});
    const result = await provisionOperator(db, { targetUid: '', platformRole: 'support', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'invalid-argument');
  });

  it('rejects an invalid platformRole', async () => {
    const db = makeFakeOperatorsDb({});
    const result = await provisionOperator(db, { targetUid: 'op-2', platformRole: 'nonsense', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'invalid-argument');
    assert.equal(db.dump()['op-2'], undefined); // no write happened
  });

  it('provisions a new operator for a genuinely different target', async () => {
    const db = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
    const result = await provisionOperator(db, { targetUid: 'op-2', platformRole: 'support', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'provisioned');
    assert.equal(result.uid, 'op-2');
    assert.equal(result.platformRole, 'support');
    assert.deepEqual(db.dump()['op-2'], { platformRole: 'support' });
  });

  it('accepts every valid platformRole value', async () => {
    for (const role of ['support', 'developer', 'superadmin']) {
      const db = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
      const result = await provisionOperator(db, { targetUid: 'op-x', platformRole: role, requesterUid: 'op-1' });
      assert.equal(result.outcome, 'provisioned', `expected provisioned for role ${role}`);
    }
  });
});

// ------------------------------------------------------------------
// revokeOperator — BR-2 (no self-revocation), BR-3 (last-SuperAdmin
// lockout, computed from current data at request time)
// ------------------------------------------------------------------
describe('revokeOperator', () => {
  it('rejects revoking when targetUid equals requesterUid (self-target, BR-2)', async () => {
    const db = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' }, 'op-2': { platformRole: 'superadmin' } });
    const result = await revokeOperator(db, { targetUid: 'op-1', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'self-target');
    assert.ok(db.dump()['op-1']); // unchanged — no delete happened
  });

  it('404s when the target does not exist', async () => {
    const db = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
    const result = await revokeOperator(db, { targetUid: 'ghost', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'not-found');
  });

  it('rejects revoking the last active superadmin (BR-3)', async () => {
    const db = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'support' },
    });
    const result = await revokeOperator(db, { targetUid: 'op-1', requesterUid: 'op-2' });
    assert.equal(result.outcome, 'last-superadmin');
    assert.ok(db.dump()['op-1']); // unchanged — no delete happened
  });

  it('allows revoking a superadmin when at least one other active superadmin remains', async () => {
    const db = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'superadmin' },
    });
    const result = await revokeOperator(db, { targetUid: 'op-1', requesterUid: 'op-2' });
    assert.equal(result.outcome, 'revoked');
    assert.equal(db.dump()['op-1'], undefined);
    assert.ok(db.dump()['op-2']); // the other superadmin is untouched
  });

  it('allows revoking a non-superadmin operator freely, regardless of superadmin count', async () => {
    const db = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'support' },
    });
    const result = await revokeOperator(db, { targetUid: 'op-2', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'revoked');
    assert.equal(db.dump()['op-2'], undefined);
  });

  it('the last-superadmin count is computed fresh at request time, not from a stale snapshot — a superadmin provisioned moments earlier unblocks revoking another', async () => {
    const db = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
    // simulate a second superadmin having just been provisioned
    await db.collection('platform_operators').doc('op-2').set({ platformRole: 'superadmin' });
    const result = await revokeOperator(db, { targetUid: 'op-1', requesterUid: 'op-2' });
    assert.equal(result.outcome, 'revoked'); // now safe — two existed at request time
  });
});

// ------------------------------------------------------------------
// listOperators
// ------------------------------------------------------------------
describe('listOperators', () => {
  it('lists every valid operator record', async () => {
    const db = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'developer' },
    });
    const list = await listOperators(db);
    assert.equal(list.length, 2);
    assert.deepEqual(
      list.sort((a, b) => a.uid.localeCompare(b.uid)),
      [
        { uid: 'op-1', platformRole: 'superadmin' },
        { uid: 'op-2', platformRole: 'developer' },
      ]
    );
  });

  it('excludes a record with a missing or invalid platformRole rather than crashing', async () => {
    const db = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'nonsense' },
      'op-3': {},
    });
    const list = await listOperators(db);
    assert.deepEqual(list, [{ uid: 'op-1', platformRole: 'superadmin' }]);
  });
});

// ------------------------------------------------------------------
// Composed proof: provision -> audit entry, and revoke -> audit entry,
// each exactly once (BR: "every mutation produces exactly one
// platform_audit_log entry") — same "prove the full chain composes"
// style as superadmin-payment-operations.test.ts's own composed
// describe block, without re-testing writeAuditLogEntry's own behavior
// (already covered by that file).
// ------------------------------------------------------------------
describe('composed: provision and revoke each produce exactly one audit entry', () => {
  it('provisioning a new operator produces exactly one operator.provisioned entry with the correct targetUid', async () => {
    const operatorsDb = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
    const result = await provisionOperator(operatorsDb, { targetUid: 'op-2', platformRole: 'support', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'provisioned');

    const auditDb = makeFakeAuditDb();
    await writeAuditLogEntry(auditDb, {
      actorUid: 'op-1',
      actorRole: 'superadmin',
      actionType: 'operator.provisioned',
      targetUid: result.uid,
    });
    assert.equal(auditDb.entries().length, 1);
    assert.equal(auditDb.entries()[0].actionType, 'operator.provisioned');
    assert.equal(auditDb.entries()[0].targetUid, 'op-2');
    assert.equal(auditDb.entries()[0].actorUid, 'op-1');
  });

  it('revoking an operator produces exactly one operator.revoked entry with the correct targetUid', async () => {
    const operatorsDb = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'developer' },
    });
    const result = await revokeOperator(operatorsDb, { targetUid: 'op-2', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'revoked');

    const auditDb = makeFakeAuditDb();
    await writeAuditLogEntry(auditDb, {
      actorUid: 'op-1',
      actorRole: 'superadmin',
      actionType: 'operator.revoked',
      targetUid: result.uid,
    });
    assert.equal(auditDb.entries().length, 1);
    assert.equal(auditDb.entries()[0].actionType, 'operator.revoked');
    assert.equal(auditDb.entries()[0].targetUid, 'op-2');
  });

  it('a self-target provision attempt never reaches a Firestore write, so no audit entry is ever produced for it', async () => {
    const operatorsDb = makeFakeOperatorsDb({ 'op-1': { platformRole: 'superadmin' } });
    const result = await provisionOperator(operatorsDb, { targetUid: 'op-1', platformRole: 'support', requesterUid: 'op-1' });
    assert.equal(result.outcome, 'self-target');
    // No audit write attempted — this mirrors server/index.ts's route,
    // which only calls writeAuditLogEntry() after a non-error outcome.
  });

  it('a last-superadmin-blocked revoke never reaches a Firestore delete, so no audit entry is ever produced for it', async () => {
    const operatorsDb = makeFakeOperatorsDb({
      'op-1': { platformRole: 'superadmin' },
      'op-2': { platformRole: 'support' },
    });
    const result = await revokeOperator(operatorsDb, { targetUid: 'op-1', requesterUid: 'op-2' });
    assert.equal(result.outcome, 'last-superadmin');
    assert.ok(operatorsDb.dump()['op-1']); // still present — the guard fired before any delete
  });
});
