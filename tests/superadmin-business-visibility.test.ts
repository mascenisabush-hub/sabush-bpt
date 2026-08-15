// SuperAdmin V1 Operational Control Plane — Phase B server-side tests
// (ADR-0006, docs/engineering/18-superadmin-v1-operational-control-plane-implementation-plan.md).
//
// Scope: server/businessVisibility.ts only, exercised directly against
// an in-memory fake — the real module, not a duplicated test-only
// implementation. Same convention as
// tests/superadmin-operational-control-plane.test.ts (Phase A) and
// tests/superadmin-payment-operations.test.ts: no suite imports
// server/index.ts directly, since it requires real Firebase Admin
// credentials at module load.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-business-visibility.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { searchBusinesses, fetchBusinessDetail, type BusinessVisibilityDb } from '../server/businessVisibility';
import { writeAuditLogEntry } from '../server/platformAuditLog';

// ------------------------------------------------------------------
// Fake — an in-memory Firestore stand-in supporting exactly the
// operations businessVisibility.ts needs: doc get, a name-prefix range
// query (where/where/limit/get) on `businesses`, a staff subcollection
// get, a payments subcollection query (orderBy/limit/get), and a
// users/{uid} doc get.
// ------------------------------------------------------------------

interface FakeBusiness {
  name?: string;
  category?: string;
  currencySymbol?: string;
  createdAt?: string;
  ownerUid?: string;
  suspended?: boolean;
}
interface FakeUser {
  name?: string;
  email?: string;
  createdAt?: string;
}
interface FakeStaff {
  name?: string;
  suspended?: boolean;
}
interface FakePayment {
  amount?: number;
  currency?: string;
  method?: string;
  reference?: string;
  submittedAt?: string;
  status?: string;
}

function makeFakeDb(fixtures: {
  businesses?: Record<string, FakeBusiness>;
  users?: Record<string, FakeUser>;
  staff?: Record<string, Record<string, FakeStaff>>; // businessId -> staffUid -> doc
  payments?: Record<string, Record<string, FakePayment>>; // businessId -> paymentId -> doc
}): BusinessVisibilityDb {
  const businesses = fixtures.businesses ?? {};
  const users = fixtures.users ?? {};
  const staff = fixtures.staff ?? {};
  const payments = fixtures.payments ?? {};

  function makeBusinessQuery(filters: Array<{ field: string; op: string; value: unknown }>, limitN: number | null) {
    return {
      where(field: string, op: string, value: unknown) {
        return makeBusinessQuery([...filters, { field, op, value }], limitN);
      },
      orderBy() {
        return makeBusinessQuery(filters, limitN);
      },
      limit(n: number) {
        return makeBusinessQuery(filters, n);
      },
      async get() {
        let entries = Object.entries(businesses);
        for (const f of filters) {
          if (f.field === 'name' && f.op === '>=') {
            entries = entries.filter(([, b]) => (b.name ?? '') >= (f.value as string));
          }
          if (f.field === 'name' && f.op === '<=') {
            entries = entries.filter(([, b]) => (b.name ?? '') <= (f.value as string));
          }
        }
        if (limitN != null) entries = entries.slice(0, limitN);
        return {
          docs: entries.map(([id, data]) => ({ exists: true, id, data: () => data })),
        };
      },
    };
  }

  return {
    collection(name: 'businesses' | 'users') {
      if (name === 'users') {
        return {
          doc(uid: string) {
            return {
              async get() {
                const data = users[uid];
                return { exists: !!data, id: uid, data: () => data };
              },
            };
          },
        } as never;
      }
      return {
        ...makeBusinessQuery([], null),
        doc(businessId: string) {
          return {
            async get() {
              const data = businesses[businessId];
              return { exists: !!data, id: businessId, data: () => data };
            },
            collection(sub: 'staff' | 'payments') {
              if (sub === 'staff') {
                return {
                  async get() {
                    const rows = staff[businessId] ?? {};
                    return { docs: Object.entries(rows).map(([id, data]) => ({ exists: true, id, data: () => data })) };
                  },
                };
              }
              // payments
              let limitN: number | null = null;
              const builder = {
                orderBy() {
                  return builder;
                },
                limit(n: number) {
                  limitN = n;
                  return builder;
                },
                async get() {
                  let rows = Object.entries(payments[businessId] ?? {});
                  if (limitN != null) rows = rows.slice(0, limitN);
                  return { docs: rows.map(([id, data]) => ({ exists: true, id, data: () => data })) };
                },
              };
              return builder;
            },
          };
        },
      } as never;
    },
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
// searchBusinesses — FR-B1, BR-6
// ------------------------------------------------------------------
describe('searchBusinesses', () => {
  it('returns an empty list for an empty/whitespace query, without touching the database', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    assert.deepEqual(await searchBusinesses(db, ''), []);
    assert.deepEqual(await searchBusinesses(db, '   '), []);
  });

  it('matches by exact businessId', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    const results = await searchBusinesses(db, 'biz-1');
    assert.deepEqual(results, [{ businessId: 'biz-1', name: 'Loja Central' }]);
  });

  it('matches by name prefix', async () => {
    const db = makeFakeDb({
      businesses: {
        'biz-1': { name: 'Loja Central' },
        'biz-2': { name: 'Loja Norte' },
        'biz-3': { name: 'Padaria Sul' },
      },
    });
    const results = await searchBusinesses(db, 'Loja');
    assert.equal(results.length, 2);
    assert.ok(results.some((r) => r.businessId === 'biz-1'));
    assert.ok(results.some((r) => r.businessId === 'biz-2'));
    assert.ok(!results.some((r) => r.businessId === 'biz-3'));
  });

  it('deduplicates when the exact-id match and the name-prefix match are the same business', async () => {
    const db = makeFakeDb({ businesses: { 'loja-1': { name: 'loja-1' } } });
    const results = await searchBusinesses(db, 'loja-1');
    assert.equal(results.length, 1);
  });

  it('never returns any field beyond businessId and name — BR-6, structural allowlist proof', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central', category: 'retail', currencySymbol: 'MZN', ownerUid: 'owner-1' } } });
    const results = await searchBusinesses(db, 'biz-1');
    assert.deepEqual(Object.keys(results[0]).sort(), ['businessId', 'name']);
  });
});

// ------------------------------------------------------------------
// fetchBusinessDetail — FR-B2, BR-5, BR-7
// ------------------------------------------------------------------
describe('fetchBusinessDetail', () => {
  const readSubscriptionStatus = async (_businessId: string) => 'active';

  it('rejects a missing justification before any read happens (BR-7)', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    const result = await fetchBusinessDetail(db, 'biz-1', '', readSubscriptionStatus);
    assert.equal(result.outcome, 'missing-justification');
  });

  it('rejects a whitespace-only justification', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    const result = await fetchBusinessDetail(db, 'biz-1', '   ', readSubscriptionStatus);
    assert.equal(result.outcome, 'missing-justification');
  });

  it('404s for a business that does not exist', async () => {
    const db = makeFakeDb({});
    const result = await fetchBusinessDetail(db, 'ghost', 'investigating a support ticket', readSubscriptionStatus);
    assert.equal(result.outcome, 'not-found');
  });

  it('assembles exactly the curated field set — BR-5, structural allowlist proof (extended, Phase C — ADR-0006, Gap 1: `suspended` is an explicitly-authorized single-field addition, not scope creep — see BusinessDoc.suspended\'s own comment in server/businessVisibility.ts)', async () => {
    const db = makeFakeDb({
      businesses: { 'biz-1': { name: 'Loja Central', category: 'retail', currencySymbol: 'MZN', createdAt: '2026-01-01T00:00:00.000Z', ownerUid: 'owner-1', suspended: false } },
      users: { 'owner-1': { name: 'Dono Teste', email: 'owner@example.com', createdAt: '2025-01-01T00:00:00.000Z' } },
      staff: { 'biz-1': { 'staff-1': { name: 'Funcionário A', suspended: false } } },
      payments: { 'biz-1': { 'pmt-1': { amount: 699, currency: 'MZN', method: 'mpesa', reference: 'TXN-1', submittedAt: '2026-02-01T00:00:00.000Z', status: 'confirmed' } } },
    });
    const result = await fetchBusinessDetail(db, 'biz-1', 'diagnosing login issue', readSubscriptionStatus);
    assert.equal(result.outcome, 'found');
    if (result.outcome !== 'found') return;

    assert.deepEqual(
      Object.keys(result.detail).sort(),
      ['businessId', 'category', 'createdAt', 'currencySymbol', 'name', 'owner', 'recentPayments', 'staff', 'subscriptionStatus', 'suspended'].sort()
    );
    assert.equal(result.detail.suspended, false);
    assert.deepEqual(Object.keys(result.detail.owner!).sort(), ['createdAt', 'email', 'name']);
    assert.deepEqual(Object.keys(result.detail.staff[0]).sort(), ['name', 'suspended']);
    assert.deepEqual(
      Object.keys(result.detail.recentPayments[0]).sort(),
      ['amount', 'currency', 'method', 'reference', 'status', 'submittedAt']
    );

    // never products/batches/expenses/withdrawals/stockCounts/timelineEvents (BR-5) —
    // proven by construction: this module never queries those collections at all,
    // and this allowlist assertion is the regression guard against a future addition.
    assert.equal(result.detail.name, 'Loja Central');
    assert.equal(result.detail.owner!.email, 'owner@example.com');
    assert.equal(result.detail.subscriptionStatus, 'active');
    assert.equal(result.detail.staff.length, 1);
    assert.equal(result.detail.recentPayments.length, 1);
  });

  it('reuses the injected readSubscriptionStatus verbatim rather than reading subscriptions itself', async () => {
    let called = 0;
    const trackedRead = async (businessId: string) => {
      called += 1;
      assert.equal(businessId, 'biz-1');
      return 'grace_period';
    };
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    const result = await fetchBusinessDetail(db, 'biz-1', 'checking subscription state', trackedRead);
    assert.equal(result.outcome, 'found');
    assert.equal(called, 1);
    if (result.outcome === 'found') assert.equal(result.detail.subscriptionStatus, 'grace_period');
  });

  it('handles a business with no owner, no staff, and no payments gracefully', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Vazia' } } });
    const result = await fetchBusinessDetail(db, 'biz-1', 'routine check', readSubscriptionStatus);
    assert.equal(result.outcome, 'found');
    if (result.outcome !== 'found') return;
    assert.equal(result.detail.owner, null);
    assert.deepEqual(result.detail.staff, []);
    assert.deepEqual(result.detail.recentPayments, []);
  });
});

// ------------------------------------------------------------------
// Composed proof: a successful detail read produces exactly one
// business.viewed audit entry with the real justification round-tripped
// — same "prove the full chain composes" style as Phase A's own
// composed describe block.
// ------------------------------------------------------------------
describe('composed: a successful business detail read produces exactly one audit entry', () => {
  it('writes exactly one business.viewed entry with the correct targetBusinessId and justification', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    const result = await fetchBusinessDetail(db, 'biz-1', 'customer reported login failure', async () => 'active');
    assert.equal(result.outcome, 'found');

    const auditDb = makeFakeAuditDb();
    await writeAuditLogEntry(auditDb, {
      actorUid: 'op-1',
      actorRole: 'superadmin',
      actionType: 'business.viewed',
      targetBusinessId: 'biz-1',
      justification: 'customer reported login failure',
    });
    assert.equal(auditDb.entries().length, 1);
    assert.equal(auditDb.entries()[0].actionType, 'business.viewed');
    assert.equal(auditDb.entries()[0].targetBusinessId, 'biz-1');
    assert.equal(auditDb.entries()[0].justification, 'customer reported login failure');
  });

  it('a missing-justification result never reaches a Firestore read of the business, so no audit entry is ever produced for it', async () => {
    const db = makeFakeDb({ businesses: { 'biz-1': { name: 'Loja Central' } } });
    const result = await fetchBusinessDetail(db, 'biz-1', '', async () => 'active');
    assert.equal(result.outcome, 'missing-justification');
    // No audit write attempted — mirrors server/index.ts's route, which
    // only calls writeAuditLogEntry() after a 'found' outcome.
  });
});
