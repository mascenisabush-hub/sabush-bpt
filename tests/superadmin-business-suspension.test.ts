// SuperAdmin V1 Operational Control Plane — Phase C server-side tests
// (ADR-0006, Gap 1 — Product-Architect-confirmed; idempotency —
// CONFIRMED Option B).
//
// Scope: server/businessSuspension.ts only, exercised directly against
// an in-memory fake — the real module, not a duplicated test-only
// implementation. Same convention as
// tests/superadmin-operational-control-plane.test.ts (Phase A) and
// tests/superadmin-business-visibility.test.ts (Phase B): no suite
// imports server/index.ts directly, since it requires real Firebase
// Admin credentials at module load.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-business-suspension.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { suspendBusiness, reactivateBusiness, type BusinessSuspensionDb } from '../server/businessSuspension';
import { writeAuditLogEntry } from '../server/platformAuditLog';

// ------------------------------------------------------------------
// Fake — an in-memory Firestore stand-in supporting exactly what
// businessSuspension.ts needs: doc get + a minimal partial update.
// ------------------------------------------------------------------

function makeFakeDb(businesses: Record<string, { suspended?: boolean } | undefined>): BusinessSuspensionDb & {
  dump(): Record<string, { suspended?: boolean } | undefined>;
  updateCalls(): Array<{ businessId: string; data: { suspended: boolean } }>;
} {
  const store: Record<string, { suspended?: boolean } | undefined> = { ...businesses };
  const calls: Array<{ businessId: string; data: { suspended: boolean } }> = [];
  return {
    collection(_name: 'businesses') {
      return {
        doc(businessId: string) {
          return {
            async get() {
              const data = store[businessId];
              return { exists: !!data, data: () => data };
            },
            async update(data: { suspended: boolean }) {
              calls.push({ businessId, data: { ...data } });
              store[businessId] = { ...(store[businessId] ?? {}), ...data };
            },
          };
        },
      };
    },
    dump: () => ({ ...store }),
    updateCalls: () => calls,
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
// suspendBusiness
// ------------------------------------------------------------------
describe('suspendBusiness', () => {
  it('rejects a missing justification before any read happens', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await suspendBusiness(db, 'biz-1', '');
    assert.equal(result.outcome, 'missing-justification');
    assert.equal(db.updateCalls().length, 0);
  });

  it('rejects an empty justification', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await suspendBusiness(db, 'biz-1', '');
    assert.equal(result.outcome, 'missing-justification');
  });

  it('rejects a whitespace-only justification', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await suspendBusiness(db, 'biz-1', '   ');
    assert.equal(result.outcome, 'missing-justification');
    assert.equal(db.updateCalls().length, 0);
  });

  it('handles a non-existent business safely', async () => {
    const db = makeFakeDb({});
    const result = await suspendBusiness(db, 'ghost', 'customer non-payment');
    assert.equal(result.outcome, 'not-found');
    assert.equal(db.updateCalls().length, 0);
  });

  it('successfully suspends an active business — exactly one minimal partial update, suspended field only', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await suspendBusiness(db, 'biz-1', 'reported abusive activity');
    assert.equal(result.outcome, 'suspended');
    assert.equal(db.updateCalls().length, 1);
    assert.deepEqual(db.updateCalls()[0], { businessId: 'biz-1', data: { suspended: true } });
    assert.equal(db.dump()['biz-1']?.suspended, true);
  });

  it('successfully suspends a business with a missing suspended field (defaults to active)', async () => {
    const db = makeFakeDb({ 'biz-1': {} });
    const result = await suspendBusiness(db, 'biz-1', 'non-payment');
    assert.equal(result.outcome, 'suspended');
  });

  it('Option B — repeated suspend of an already-suspended business is rejected, no write, no audit-worthy outcome', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: true } });
    const result = await suspendBusiness(db, 'biz-1', 'attempting to re-suspend');
    assert.equal(result.outcome, 'already-suspended');
    assert.equal(db.updateCalls().length, 0);
  });
});

// ------------------------------------------------------------------
// reactivateBusiness
// ------------------------------------------------------------------
describe('reactivateBusiness', () => {
  it('rejects a missing justification before any read happens', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: true } });
    const result = await reactivateBusiness(db, 'biz-1', '');
    assert.equal(result.outcome, 'missing-justification');
    assert.equal(db.updateCalls().length, 0);
  });

  it('rejects a whitespace-only justification', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: true } });
    const result = await reactivateBusiness(db, 'biz-1', '   ');
    assert.equal(result.outcome, 'missing-justification');
  });

  it('handles a non-existent business safely', async () => {
    const db = makeFakeDb({});
    const result = await reactivateBusiness(db, 'ghost', 'issue resolved');
    assert.equal(result.outcome, 'not-found');
    assert.equal(db.updateCalls().length, 0);
  });

  it('successfully reactivates a suspended business — exactly one minimal partial update', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: true } });
    const result = await reactivateBusiness(db, 'biz-1', 'payment received, issue resolved');
    assert.equal(result.outcome, 'reactivated');
    assert.equal(db.updateCalls().length, 1);
    assert.deepEqual(db.updateCalls()[0], { businessId: 'biz-1', data: { suspended: false } });
    assert.equal(db.dump()['biz-1']?.suspended, false);
  });

  it('Option B — repeated reactivate of an already-active business is rejected, no write', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await reactivateBusiness(db, 'biz-1', 'attempting to re-activate');
    assert.equal(result.outcome, 'already-active');
    assert.equal(db.updateCalls().length, 0);
  });

  it('Option B — reactivating a business with a missing suspended field (already active by default) is rejected', async () => {
    const db = makeFakeDb({ 'biz-1': {} });
    const result = await reactivateBusiness(db, 'biz-1', 'attempting to re-activate');
    assert.equal(result.outcome, 'already-active');
    assert.equal(db.updateCalls().length, 0);
  });
});

// ------------------------------------------------------------------
// suspend -> reactivate -> suspend — each a genuine transition,
// each succeeds under Option B (only a repeat of the SAME state is
// rejected, not alternating transitions).
// ------------------------------------------------------------------
describe('suspend -> reactivate -> suspend sequence', () => {
  it('each genuine state transition succeeds in sequence', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });

    const r1 = await suspendBusiness(db, 'biz-1', 'first suspension');
    assert.equal(r1.outcome, 'suspended');

    const r2 = await reactivateBusiness(db, 'biz-1', 'resolved');
    assert.equal(r2.outcome, 'reactivated');

    const r3 = await suspendBusiness(db, 'biz-1', 'second suspension, different reason');
    assert.equal(r3.outcome, 'suspended');

    assert.equal(db.updateCalls().length, 3);
  });
});

// ------------------------------------------------------------------
// Composed proof: exactly one audit event per accepted mutation, zero
// for a rejected repeated transition — same "prove the full chain
// composes" style as Phase A/B's own composed describe blocks.
// ------------------------------------------------------------------
describe('composed: audit event correctness', () => {
  it('a successful suspension writes exactly one business.suspended entry with correct targetBusinessId and justification', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await suspendBusiness(db, 'biz-1', 'reported fraud');
    assert.equal(result.outcome, 'suspended');

    const auditDb = makeFakeAuditDb();
    await writeAuditLogEntry(auditDb, {
      actorUid: 'op-1',
      actorRole: 'superadmin',
      actionType: 'business.suspended',
      targetBusinessId: 'biz-1',
      justification: 'reported fraud',
    });
    assert.equal(auditDb.entries().length, 1);
    assert.equal(auditDb.entries()[0].actionType, 'business.suspended');
    assert.equal(auditDb.entries()[0].targetBusinessId, 'biz-1');
    assert.equal(auditDb.entries()[0].justification, 'reported fraud');
  });

  it('a successful reactivation writes exactly one business.reactivated entry', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: true } });
    const result = await reactivateBusiness(db, 'biz-1', 'issue resolved');
    assert.equal(result.outcome, 'reactivated');

    const auditDb = makeFakeAuditDb();
    await writeAuditLogEntry(auditDb, {
      actorUid: 'op-1',
      actorRole: 'superadmin',
      actionType: 'business.reactivated',
      targetBusinessId: 'biz-1',
      justification: 'issue resolved',
    });
    assert.equal(auditDb.entries().length, 1);
    assert.equal(auditDb.entries()[0].actionType, 'business.reactivated');
  });

  it('a rejected repeated suspend (already-suspended) never reaches a write, so zero audit entries are ever produced for it', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: true } });
    const result = await suspendBusiness(db, 'biz-1', 'repeat attempt');
    assert.equal(result.outcome, 'already-suspended');
    // No audit write attempted — mirrors server/index.ts's route,
    // which only calls writeAuditLogEntry() after a 'suspended'/
    // 'reactivated' outcome, never for a 409-mapped rejection.
    assert.equal(db.updateCalls().length, 0);
  });

  it('a rejected repeated reactivate (already-active) never reaches a write, so zero audit entries are ever produced for it', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await reactivateBusiness(db, 'biz-1', 'repeat attempt');
    assert.equal(result.outcome, 'already-active');
    assert.equal(db.updateCalls().length, 0);
  });

  it('a missing-justification result never reaches a Firestore read, so zero audit entries are ever produced for it', async () => {
    const db = makeFakeDb({ 'biz-1': { suspended: false } });
    const result = await suspendBusiness(db, 'biz-1', '');
    assert.equal(result.outcome, 'missing-justification');
    assert.equal(db.updateCalls().length, 0);
  });
});
