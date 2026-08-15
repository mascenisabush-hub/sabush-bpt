// SuperAdmin V1 Operational Control Plane — Phase D server-side tests
// (ADR-0006, Audit Center Filtering).
//
// Scope: server/auditLogQuery.ts only, exercised directly against an
// in-memory fake — the real module, not a duplicated test-only
// implementation. Same convention as every prior phase's own test
// file: no suite imports server/index.ts directly, since it requires
// real Firebase Admin credentials at module load.
//
// The fake below genuinely applies equality/range/orderBy/limit
// semantics (not just recording calls) so that filter-combination
// tests are real proofs, not just "was .where() called" assertions.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-audit-log-query.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { queryAuditLog, KNOWN_ACTION_TYPES, type AuditLogDb } from '../server/auditLogQuery';

// ------------------------------------------------------------------
// Fake — a genuinely-filtering in-memory Firestore stand-in. Applies
// every .where()/.orderBy()/.limit() call against a fixed in-memory
// document set, mirroring real Firestore query semantics closely
// enough to prove filter-combination correctness.
// ------------------------------------------------------------------

interface FakeEntry {
  id: string;
  actorUid: string;
  actorRole: string;
  actionType: string;
  targetBusinessId?: string;
  targetUid?: string;
  justification?: string;
  timestamp: string;
}

function makeFakeDb(entries: FakeEntry[]): AuditLogDb {
  function makeQuery(filters: Array<{ field: string; op: string; value: unknown }>, limitN: number | null) {
    return {
      where(field: string, op: string, value: unknown) {
        return makeQuery([...filters, { field, op, value }], limitN);
      },
      orderBy(_field: 'timestamp', _direction: 'asc' | 'desc') {
        return makeQuery(filters, limitN);
      },
      limit(n: number) {
        return makeQuery(filters, n);
      },
      async get() {
        let rows = entries.filter((e) =>
          filters.every((f) => {
            const actual = (e as unknown as Record<string, unknown>)[f.field];
            if (f.op === '==') return actual === f.value;
            if (f.op === '>=') return typeof actual === 'string' && actual >= (f.value as string);
            if (f.op === '<=') return typeof actual === 'string' && actual <= (f.value as string);
            throw new Error(`fake db does not support op ${f.op}`);
          })
        );
        // Always sorted desc by timestamp, matching the module's own
        // unconditional .orderBy('timestamp', 'desc').
        rows = [...rows].sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
        if (limitN != null) rows = rows.slice(0, limitN);
        return { docs: rows.map((r) => ({ id: r.id, data: () => ({ ...r }) })) };
      },
    };
  }

  return {
    collection(_name: 'platform_audit_log') {
      return makeQuery([], null);
    },
  } as never;
}

const FIXTURES: FakeEntry[] = [
  { id: 'e1', actorUid: 'op-1', actorRole: 'superadmin', actionType: 'payment.confirmed', targetBusinessId: 'biz-1', timestamp: '2026-01-01T00:00:00.000Z' },
  { id: 'e2', actorUid: 'op-1', actorRole: 'superadmin', actionType: 'payment.rejected', targetBusinessId: 'biz-1', timestamp: '2026-01-02T00:00:00.000Z' },
  { id: 'e3', actorUid: 'op-2', actorRole: 'superadmin', actionType: 'operator.provisioned', targetUid: 'new-op', timestamp: '2026-01-03T00:00:00.000Z' },
  { id: 'e4', actorUid: 'op-1', actorRole: 'superadmin', actionType: 'business.suspended', targetBusinessId: 'biz-2', justification: 'abuse report', timestamp: '2026-01-04T00:00:00.000Z' },
  { id: 'e5', actorUid: 'op-2', actorRole: 'superadmin', actionType: 'business.viewed', targetBusinessId: 'biz-1', justification: 'support ticket', timestamp: '2026-01-05T00:00:00.000Z' },
];

// ------------------------------------------------------------------
// Default behavior — Decision B: no actionType filter returns every
// action type, not just payments.
// ------------------------------------------------------------------
describe('queryAuditLog — default behavior (Decision B)', () => {
  it('with no filters at all, returns every action type, not only payment.confirmed/payment.rejected', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 5);
    const types = new Set(result.entries.map((e) => e.actionType));
    assert.ok(types.has('operator.provisioned'));
    assert.ok(types.has('business.suspended'));
    assert.ok(types.has('business.viewed'));
  });

  it('ordering is always timestamp desc, newest first', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries[0].id, 'e5');
    assert.equal(result.entries[result.entries.length - 1].id, 'e1');
  });

  it('the 100-row limit is enforced even when more entries exist', async () => {
    const many: FakeEntry[] = Array.from({ length: 150 }, (_, i) => ({
      id: `bulk-${i}`,
      actorUid: 'op-1',
      actorRole: 'superadmin',
      actionType: 'business.viewed',
      timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
    }));
    const db = makeFakeDb(many);
    const result = await queryAuditLog(db, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 100);
  });
});

// ------------------------------------------------------------------
// Individual filters
// ------------------------------------------------------------------
describe('queryAuditLog — individual filters', () => {
  it('filters by businessId (maps to targetBusinessId)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { businessId: 'biz-1' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 3);
    assert.ok(result.entries.every((e) => e.targetBusinessId === 'biz-1'));
  });

  it('filters by actorUid', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actorUid: 'op-2' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 2);
    assert.ok(result.entries.every((e) => e.actorUid === 'op-2'));
  });

  it('filters by actionType', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actionType: 'business.suspended' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e4']);
  });

  it('filters by from (inclusive)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { from: '2026-01-04T00:00:00.000Z' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id).sort(), ['e4', 'e5'].sort());
  });

  it('filters by to (inclusive)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { to: '2026-01-02T00:00:00.000Z' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id).sort(), ['e1', 'e2'].sort());
  });
});

// ------------------------------------------------------------------
// Combined filters (Decision A — all five may combine simultaneously)
// ------------------------------------------------------------------
describe('queryAuditLog — combined filters (Decision A)', () => {
  it('businessId + actorUid', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { businessId: 'biz-1', actorUid: 'op-2' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e5']);
  });

  it('businessId + actionType', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { businessId: 'biz-1', actionType: 'payment.rejected' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e2']);
  });

  it('businessId + time range', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { businessId: 'biz-1', from: '2026-01-02T00:00:00.000Z', to: '2026-01-05T00:00:00.000Z' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id).sort(), ['e2', 'e5'].sort());
  });

  it('actorUid + actionType', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actorUid: 'op-1', actionType: 'business.suspended' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e4']);
  });

  it('actionType + time range', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actionType: 'payment.confirmed', from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T23:59:59.999Z' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e1']);
  });

  it('businessId + actorUid + actionType + time range, all five constraints together', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, {
      businessId: 'biz-1',
      actorUid: 'op-1',
      actionType: 'payment.confirmed',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-01T23:59:59.999Z',
    });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e1']);
  });

  it('a combination matching nothing returns an empty result, not an error', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { businessId: 'biz-1', actionType: 'operator.provisioned' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries, []);
  });
});

// ------------------------------------------------------------------
// Validation — malformed input must never reach the query
// ------------------------------------------------------------------
describe('queryAuditLog — validation', () => {
  it('rejects an unknown actionType', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actionType: 'not.a.real.action' });
    assert.equal(result.outcome, 'invalid');
  });

  it('accepts every value in KNOWN_ACTION_TYPES', async () => {
    for (const actionType of KNOWN_ACTION_TYPES) {
      const db = makeFakeDb(FIXTURES);
      const result = await queryAuditLog(db, { actionType });
      assert.equal(result.outcome, 'ok', `expected ok for actionType ${actionType}`);
    }
  });

  it('rejects a malformed "from" date', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { from: 'not-a-date' });
    assert.equal(result.outcome, 'invalid');
  });

  it('rejects a malformed "to" date', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { to: 'also-not-a-date' });
    assert.equal(result.outcome, 'invalid');
  });

  it('rejects from > to as a nonsensical range, rather than silently returning an unintended empty/reversed range', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { from: '2026-01-05T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' });
    assert.equal(result.outcome, 'invalid');
  });

  it('treats an empty-string businessId identically to the filter being absent', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { businessId: '' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries.length, 5);
  });
});

// ------------------------------------------------------------------
// Response allowlist — Decision C (targetUid now included), and BR-5-
// style structural proof no other field can leak.
// ------------------------------------------------------------------
describe('queryAuditLog — response allowlist', () => {
  it('every entry contains exactly the approved field set, including targetUid (Decision C)', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    for (const entry of result.entries) {
      assert.deepEqual(
        Object.keys(entry).sort(),
        ['actionType', 'actorRole', 'actorUid', 'id', 'justification', 'targetBusinessId', 'targetUid', 'timestamp'].sort()
      );
    }
  });

  it('targetUid is correctly populated for an operator-related event and null for a business-related one', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actionType: 'operator.provisioned' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries[0].targetUid, 'new-op');
    assert.equal(result.entries[0].targetBusinessId, null);
  });

  it('optional fields absent on the underlying document are null, never undefined or omitted', async () => {
    const db = makeFakeDb([{ id: 'bare', actorUid: 'op-1', actorRole: 'superadmin', actionType: 'business.viewed', timestamp: '2026-01-01T00:00:00.000Z' }]);
    const result = await queryAuditLog(db, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.equal(result.entries[0].targetBusinessId, null);
    assert.equal(result.entries[0].targetUid, null);
    assert.equal(result.entries[0].justification, null);
  });
});

// ------------------------------------------------------------------
// Regression — the original payment events still render correctly
// under the broadened default scope.
// ------------------------------------------------------------------
describe('queryAuditLog — regression', () => {
  it('payment.confirmed and payment.rejected still appear correctly alongside every other action type', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, {});
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    const confirmed = result.entries.find((e) => e.id === 'e1');
    const rejected = result.entries.find((e) => e.id === 'e2');
    assert.equal(confirmed?.actionType, 'payment.confirmed');
    assert.equal(rejected?.actionType, 'payment.rejected');
  });

  it('filtering explicitly by payment.confirmed still works exactly as before Phase D', async () => {
    const db = makeFakeDb(FIXTURES);
    const result = await queryAuditLog(db, { actionType: 'payment.confirmed' });
    assert.equal(result.outcome, 'ok');
    if (result.outcome !== 'ok') return;
    assert.deepEqual(result.entries.map((e) => e.id), ['e1']);
  });
});
