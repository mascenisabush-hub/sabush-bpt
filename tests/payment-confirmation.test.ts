// Module #19 V1 Manual Payment Bridge — payment confirmation tests.
//
// Exercises confirmPayment()/rejectPayment() directly against a
// lightweight in-memory fake, matching the same pattern every other
// server-side test suite in this repository already established.
//
// HOW TO RUN:
//   npx tsx --test tests/payment-confirmation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { confirmPayment, rejectPayment, type PaymentConfirmationDb, type LifecycleApplier } from '../server/paymentConfirmation';
import type { SubscriptionTransitionResult } from '../server/subscriptionEngine';

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

interface FakePaymentRef {
  __businessId: string;
  __paymentId: string;
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
}

function makeFakeDb(paymentsByKey: Record<string, FakePayment>): PaymentConfirmationDb & { dump(): Record<string, FakePayment> } {
  const payments: Record<string, FakePayment> = { ...paymentsByKey };

  function key(businessId: string, paymentId: string) {
    return `${businessId}::${paymentId}`;
  }

  return {
    collection(_name: 'businesses') {
      return {
        doc(businessId: string) {
          return {
            collection(_name: 'payments') {
              return {
                doc(paymentId: string): FakePaymentRef {
                  return {
                    __businessId: businessId,
                    __paymentId: paymentId,
                    async get() {
                      const data = payments[key(businessId, paymentId)];
                      return { exists: !!data, data: () => (data ? { ...data } : undefined) };
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
        async get(ref: FakePaymentRef) {
          return ref.get();
        },
        update(ref: FakePaymentRef, data: Record<string, unknown>) {
          const k = key(ref.__businessId, ref.__paymentId);
          payments[k] = { ...payments[k], ...data } as FakePayment;
        },
      };
      return fn(tx as never);
    },
    dump() {
      return { ...payments };
    },
  } as never;
}

// A fake Engine, matching LifecycleApplier's narrow interface — lets
// these tests verify confirmPayment() calls it correctly without
// pulling in the full Subscription Lifecycle Engine (already tested
// exhaustively in its own suite).
function makeFakeEngine(): LifecycleApplier & { calls: Array<{ businessId: string; event: { type: string; occurredAt: string } }> } {
  const calls: Array<{ businessId: string; event: { type: string; occurredAt: string } }> = [];
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

function pendingPayment(overrides: Partial<FakePayment> = {}): FakePayment {
  return {
    status: 'pending',
    method: 'mpesa',
    amount: 750,
    currency: 'MZN',
    reference: 'TXN123',
    ...overrides,
  };
}

describe('confirmPayment', () => {
  it('confirms a pending payment and invokes the lifecycle engine with payment_success', async () => {
    const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment() });
    const engine = makeFakeEngine();

    const result = await confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Ana' });

    assert.equal(result.outcome, 'confirmed');
    assert.equal(db.dump()['biz-1::pmt-1'].status, 'confirmed');
    assert.equal(db.dump()['biz-1::pmt-1'].confirmedBy, 'Ana');
    assert.ok(db.dump()['biz-1::pmt-1'].confirmedAt);
    assert.equal(engine.calls.length, 1);
    assert.equal(engine.calls[0].businessId, 'biz-1');
    assert.equal(engine.calls[0].event.type, 'payment_success');
  });

  it('returns not-found for a nonexistent payment, without throwing', async () => {
    const db = makeFakeDb({});
    const engine = makeFakeEngine();
    const result = await confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'ghost', confirmedBy: 'Ana' });
    assert.equal(result.outcome, 'not-found');
    assert.equal(engine.calls.length, 0);
  });

  it('refuses to confirm an already-rejected payment', async () => {
    const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment({ status: 'rejected', rejectedBy: 'Bruno', rejectionReason: 'no match' }) });
    const engine = makeFakeEngine();
    const result = await confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Ana' });
    assert.equal(result.outcome, 'already-rejected');
    assert.equal(engine.calls.length, 0);
    assert.equal(db.dump()['biz-1::pmt-1'].status, 'rejected'); // unchanged
  });

  describe('idempotency', () => {
    it('confirming the same payment twice does not create a duplicate lifecycle effect on the payment record', async () => {
      const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment() });
      const engine = makeFakeEngine();

      await confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Ana' });
      const firstConfirmedAt = db.dump()['biz-1::pmt-1'].confirmedAt;
      const firstConfirmedBy = db.dump()['biz-1::pmt-1'].confirmedBy;

      const second = await confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Carlos' });

      assert.equal(second.outcome, 'confirmed');
      // Original confirmedAt/confirmedBy preserved — never overwritten by a retry.
      assert.equal(db.dump()['biz-1::pmt-1'].confirmedAt, firstConfirmedAt);
      assert.equal(db.dump()['biz-1::pmt-1'].confirmedBy, firstConfirmedBy);
    });

    it('a retry after the payment was already confirmed still (safely) re-invokes the lifecycle engine — this is the partial-failure recovery path', async () => {
      // Simulates: first confirmPayment() call succeeded at marking the
      // payment 'confirmed' but the process crashed before/during the
      // lifecycle call. A second, independent invocation must still
      // complete the lifecycle step.
      const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment({ status: 'confirmed', confirmedAt: '2026-08-01T00:00:00.000Z', confirmedBy: 'Ana' }) });
      const engine = makeFakeEngine();

      const result = await confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Ana' });

      assert.equal(result.outcome, 'confirmed');
      assert.equal(engine.calls.length, 1); // the lifecycle step DID run this time
      assert.equal(engine.calls[0].event.occurredAt, '2026-08-01T00:00:00.000Z'); // uses the ORIGINAL confirmedAt, not "now"
    });

    it('concurrent confirmation attempts both complete safely, with only one confirmedBy value surviving', async () => {
      const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment() });
      const engine = makeFakeEngine();

      const [first, second] = await Promise.all([
        confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Ana' }),
        confirmPayment(db, engine, { businessId: 'biz-1', paymentId: 'pmt-1', confirmedBy: 'Carlos' }),
      ]);

      assert.equal(first.outcome, 'confirmed');
      assert.equal(second.outcome, 'confirmed');
      // Exactly one of the two names survives as the audit record — not both, not neither.
      const survivor = db.dump()['biz-1::pmt-1'].confirmedBy;
      assert.ok(survivor === 'Ana' || survivor === 'Carlos');
    });
  });

  describe('tenant isolation', () => {
    it('confirming a payment for one business never touches another business\'s payment, even with the same paymentId', async () => {
      const db = makeFakeDb({
        'biz-a::pmt-1': pendingPayment({ reference: 'A-REF' }),
        'biz-b::pmt-1': pendingPayment({ reference: 'B-REF' }),
      });
      const engine = makeFakeEngine();

      await confirmPayment(db, engine, { businessId: 'biz-a', paymentId: 'pmt-1', confirmedBy: 'Ana' });

      assert.equal(db.dump()['biz-a::pmt-1'].status, 'confirmed');
      assert.equal(db.dump()['biz-b::pmt-1'].status, 'pending'); // untouched
      assert.equal(engine.calls.length, 1);
      assert.equal(engine.calls[0].businessId, 'biz-a');
    });
  });
});

describe('rejectPayment', () => {
  it('rejects a pending payment and never touches the subscription', async () => {
    const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment() });

    const result = await rejectPayment(db, { businessId: 'biz-1', paymentId: 'pmt-1', rejectedBy: 'Ana', rejectionReason: 'Reference not found' });

    assert.equal(result.outcome, 'rejected');
    assert.equal(db.dump()['biz-1::pmt-1'].status, 'rejected');
    assert.equal(db.dump()['biz-1::pmt-1'].rejectionReason, 'Reference not found');
  });

  it('returns not-found for a nonexistent payment', async () => {
    const db = makeFakeDb({});
    const result = await rejectPayment(db, { businessId: 'biz-1', paymentId: 'ghost', rejectedBy: 'Ana', rejectionReason: 'x' });
    assert.equal(result.outcome, 'not-found');
  });

  it('refuses to reject an already-confirmed payment — the subscription has already been activated', async () => {
    const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment({ status: 'confirmed', confirmedAt: '2026-08-01T00:00:00.000Z', confirmedBy: 'Ana' }) });
    const result = await rejectPayment(db, { businessId: 'biz-1', paymentId: 'pmt-1', rejectedBy: 'Carlos', rejectionReason: 'mistake' });
    assert.equal(result.outcome, 'already-confirmed');
    assert.equal(db.dump()['biz-1::pmt-1'].status, 'confirmed'); // unchanged
  });

  it('rejecting an already-rejected payment is idempotent — the original reason is preserved', async () => {
    const db = makeFakeDb({ 'biz-1::pmt-1': pendingPayment({ status: 'rejected', rejectedBy: 'Ana', rejectedAt: '2026-08-01T00:00:00.000Z', rejectionReason: 'original reason' }) });
    const result = await rejectPayment(db, { businessId: 'biz-1', paymentId: 'pmt-1', rejectedBy: 'Carlos', rejectionReason: 'different reason' });
    assert.equal(result.outcome, 'rejected');
    assert.equal(db.dump()['biz-1::pmt-1'].rejectionReason, 'original reason'); // not overwritten
    assert.equal(db.dump()['biz-1::pmt-1'].rejectedBy, 'Ana'); // not overwritten
  });
});
