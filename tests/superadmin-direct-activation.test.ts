// SuperAdmin Direct Subscription Activation — emergency capability.
//
// Runs the REAL confirmPayment() and the REAL Subscription Lifecycle Engine
// against one in-memory fake Firestore, so these tests prove the whole chain
// (record payment -> confirm -> engine -> active) rather than a mock of it.
//
// WHAT THIS PROVES:
//   1. expired / trial_completed / grace_period -> active, through the
//      existing engine (renewalDate set, engine's own audit entry written).
//   2. trial_pending / trial_active / active / no subscription record are
//      REFUSED and NOTHING is written — no orphan Payment (the engine
//      deliberately does nothing in trial states; governance has not decided
//      otherwise, so this feature must not invent that policy).
//   3. Unknown business is refused with nothing written.
//   4. The Payment is attributed to the operator, carries the plan amount,
//      and never carries the operator's internal justification (the Owner
//      can read payment documents).
//   5. A concurrent state change (engine returns no transition) is reported
//      honestly as activation-not-applied, never as success.
//   6. Input validation.
//   7. Route wiring (source inspection — server/index.ts cannot be imported
//      in tests): SuperAdmin-only, not tenantOnly, audited, allowlisted.
//   8. The module never writes subscription state itself.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-direct-activation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  directlyActivateSubscription,
  parseDirectActivationInput,
  DIRECT_ACTIVATION_ELIGIBLE_STATUSES,
  DIRECT_ACTIVATION_PLAN_AMOUNT_MZN,
  type DirectActivationDb,
} from '../server/superadminDirectActivation';
import { confirmPayment, type PaymentConfirmationDb } from '../server/paymentConfirmation';
import { createSubscriptionEngine, type SubscriptionEngineDb } from '../server/subscriptionEngine';
import { KNOWN_ACTION_TYPES } from '../server/auditLogQuery';

// ---------- in-memory fake Firestore (paths as keys) ----------
function makeFakeFirestore(seed: Record<string, Record<string, unknown>>) {
  const store = new Map<string, Record<string, unknown>>(Object.entries(seed).map(([k, v]) => [k, { ...v }]));
  let autoId = 0;

  function ref(path: string) {
    return {
      path,
      async get() {
        const data = store.get(path);
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      async create(data: Record<string, unknown>) {
        if (store.has(path)) throw new Error(`ALREADY_EXISTS: ${path}`);
        store.set(path, { ...data });
      },
      collection(name: string) {
        return collectionRef(`${path}/${name}`);
      },
    };
  }
  function collectionRef(path: string) {
    return {
      doc(id?: string) {
        return ref(`${path}/${id ?? `auto-${++autoId}`}`);
      },
    };
  }

  const db = {
    collection(name: string) {
      return collectionRef(name);
    },
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const tx = {
        get: (r: { get(): Promise<unknown> }) => r.get(),
        update(r: { path: string }, data: Record<string, unknown>) {
          const cur = store.get(r.path);
          if (!cur) throw new Error(`NOT_FOUND: ${r.path}`);
          store.set(r.path, { ...cur, ...data });
        },
        set(r: { path: string }, data: Record<string, unknown>) {
          store.set(r.path, { ...data });
        },
      };
      return fn(tx);
    },
  };

  return {
    db,
    store,
    keysUnder(prefix: string) {
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    },
  };
}

const OPERATOR = 'op-uid-1';
const input = { method: 'mpesa' as const, reference: 'QGH7X2K9P1', justification: 'Pagamento verificado por captura de ecrã' };

function setup(subscription: Record<string, unknown> | null, opts: { business?: boolean } = {}) {
  const seed: Record<string, Record<string, unknown>> = {};
  if (opts.business !== false) seed['businesses/biz-1'] = { name: 'Loja Teste', subscriptionStatusCache: subscription?.status };
  if (subscription) seed['subscriptions/biz-1'] = subscription;
  const fake = makeFakeFirestore(seed);
  const engine = createSubscriptionEngine(fake.db as unknown as SubscriptionEngineDb);
  const deps = {
    db: fake.db as unknown as DirectActivationDb,
    confirm: (p: { businessId: string; paymentId: string; confirmedBy: string }) =>
      confirmPayment(fake.db as unknown as PaymentConfirmationDb, engine, p),
    newPaymentId: () => 'pmt-sa-test',
  };
  return { fake, deps };
}

describe('eligible states activate through the existing engine', () => {
  for (const status of ['expired', 'trial_completed', 'grace_period'] as const) {
    it(`${status} -> active`, async () => {
      const { fake, deps } = setup({ status, gracePeriodEndsAt: null, renewalDate: null });
      const result = await directlyActivateSubscription(deps, { businessId: 'biz-1', operatorUid: OPERATOR, ...input });

      assert.equal(result.outcome, 'activated');
      const sub = fake.store.get('subscriptions/biz-1')!;
      assert.equal(sub.status, 'active');
      assert.equal(sub.gracePeriodEndsAt, null);
      assert.ok(typeof sub.renewalDate === 'string' && sub.renewalDate.length > 0, 'renewalDate must be set by the engine');
      assert.equal(fake.store.get('businesses/biz-1')!.subscriptionStatusCache, 'active');
      // The engine's own audit entry for the transition exists.
      const audit = fake.keysUnder('platform_audit_log/').map((k) => fake.store.get(k)!);
      assert.ok(audit.some((a) => a.eventType === 'subscription_lifecycle_transition' && a.newStatus === 'active'));
    });
  }

  it('only the three engine-governed states are eligible', () => {
    assert.deepEqual([...DIRECT_ACTIVATION_ELIGIBLE_STATUSES].sort(), ['expired', 'grace_period', 'trial_completed']);
  });
});

describe('the recorded Payment', () => {
  it('is confirmed, attributed to the operator, at the plan amount, without the internal justification', async () => {
    const { fake, deps } = setup({ status: 'expired', gracePeriodEndsAt: null, renewalDate: null });
    await directlyActivateSubscription(deps, { businessId: 'biz-1', operatorUid: OPERATOR, ...input });

    const p = fake.store.get('businesses/biz-1/payments/pmt-sa-test')!;
    assert.equal(p.status, 'confirmed');
    assert.equal(p.confirmedBy, OPERATOR);
    assert.equal(p.submittedBy, OPERATOR);
    assert.equal(p.amount, DIRECT_ACTIVATION_PLAN_AMOUNT_MZN);
    assert.equal(p.currency, 'MZN');
    assert.equal(p.method, 'mpesa');
    assert.equal(p.reference, 'QGH7X2K9P1');
    assert.equal(JSON.stringify(p).includes('captura de ecrã'), false, 'justification is internal — audit log only, never on the owner-readable Payment');
    assert.equal(Object.values(p).includes(undefined), false, 'no undefined field values (Firestore rejects them)');
  });
});

describe('ineligible situations are refused with NOTHING written', () => {
  const cases: Array<[string, Record<string, unknown> | null, string | null]> = [
    ['trial_active', { status: 'trial_active', gracePeriodEndsAt: null, renewalDate: null }, 'trial_active'],
    ['trial_pending', { status: 'trial_pending', gracePeriodEndsAt: null, renewalDate: null }, 'trial_pending'],
    ['already active', { status: 'active', gracePeriodEndsAt: null, renewalDate: '2026-10-20T00:00:00.000Z' }, 'active'],
    ['no subscription record', null, null],
  ];
  for (const [label, sub, expectedStatus] of cases) {
    it(label, async () => {
      const { fake, deps } = setup(sub);
      const before = JSON.stringify([...fake.store.entries()]);
      const result = await directlyActivateSubscription(deps, { businessId: 'biz-1', operatorUid: OPERATOR, ...input });

      assert.deepEqual(result, { outcome: 'state-not-eligible', currentStatus: expectedStatus });
      assert.equal(JSON.stringify([...fake.store.entries()]), before, 'store must be byte-identical — no orphan Payment, no audit, no state change');
    });
  }

  it('unknown business', async () => {
    const { fake, deps } = setup({ status: 'expired', gracePeriodEndsAt: null, renewalDate: null }, { business: false });
    const before = JSON.stringify([...fake.store.entries()]);
    const result = await directlyActivateSubscription(deps, { businessId: 'biz-1', operatorUid: OPERATOR, ...input });
    assert.equal(result.outcome, 'business-not-found');
    assert.equal(JSON.stringify([...fake.store.entries()]), before);
  });

  it('a second activation right after the first is refused (double-click safe)', async () => {
    const { fake, deps } = setup({ status: 'expired', gracePeriodEndsAt: null, renewalDate: null });
    await directlyActivateSubscription(deps, { businessId: 'biz-1', operatorUid: OPERATOR, ...input });
    const second = await directlyActivateSubscription(
      { ...deps, newPaymentId: () => 'pmt-sa-second' },
      { businessId: 'biz-1', operatorUid: OPERATOR, ...input }
    );
    assert.deepEqual(second, { outcome: 'state-not-eligible', currentStatus: 'active' });
    assert.equal(fake.store.has('businesses/biz-1/payments/pmt-sa-second'), false);
  });
});

describe('concurrent state change', () => {
  it('reports activation-not-applied (never success) when the engine makes no change', async () => {
    const { fake, deps } = setup({ status: 'expired', gracePeriodEndsAt: null, renewalDate: null });
    const result = await directlyActivateSubscription(
      { ...deps, confirm: async () => ({ outcome: 'confirmed' as const, lifecycleTransition: null }) },
      { businessId: 'biz-1', operatorUid: OPERATOR, ...input }
    );
    assert.deepEqual(result, { outcome: 'activation-not-applied', paymentId: 'pmt-sa-test' });
    assert.ok(fake.store.has('businesses/biz-1/payments/pmt-sa-test'), 'the recorded payment is reported by id so it can be reconciled');
  });
});

describe('parseDirectActivationInput', () => {
  it('accepts a valid body and trims', () => {
    const r = parseDirectActivationInput({ method: 'emola', reference: '  ABC123  ', justification: '  ok  ' });
    assert.deepEqual(r, { ok: true, value: { method: 'emola', reference: 'ABC123', justification: 'ok' } });
  });
  it('rejects bad method, missing reference, missing justification, overlong values, non-objects', () => {
    assert.equal(parseDirectActivationInput({ method: 'cash', reference: 'x', justification: 'y' }).ok, false);
    assert.equal(parseDirectActivationInput({ method: 'mpesa', reference: '   ', justification: 'y' }).ok, false);
    assert.equal(parseDirectActivationInput({ method: 'mpesa', reference: 'x', justification: '' }).ok, false);
    assert.equal(parseDirectActivationInput({ method: 'mpesa', reference: 'x'.repeat(121), justification: 'y' }).ok, false);
    assert.equal(parseDirectActivationInput({ method: 'mpesa', reference: 'x', justification: 'y'.repeat(501) }).ok, false);
    assert.equal(parseDirectActivationInput(null).ok, false);
    assert.equal(parseDirectActivationInput('nope').ok, false);
  });
});

describe('boundaries (source inspection)', () => {
  const indexSrc = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf-8');
  const moduleSrc = readFileSync(new URL('../server/superadminDirectActivation.ts', import.meta.url), 'utf-8');
  const start = indexSrc.indexOf("'/api/superadmin/businesses/:businessId/activate-subscription'");
  const routeSrc = indexSrc.slice(start, start + 4500);

  it('the route exists and is SuperAdmin-only (auth + operator + requireSuperAdmin), never tenantOnly', () => {
    assert.ok(start > -1, 'route must be registered');
    assert.match(routeSrc, /requireAuth,\s*requirePlatformOperator,\s*requireSuperAdmin,/);
    assert.equal(routeSrc.includes('tenantOnly'), false);
  });

  it('the route audits the action and the action type is in the audit filter allowlist', () => {
    assert.match(routeSrc, /actionType: 'subscription\.directly_activated'/);
    assert.ok((KNOWN_ACTION_TYPES as readonly string[]).includes('subscription.directly_activated'));
  });

  it('the module never writes anything except the new Payment via create() — no subscription/cache writes, no update/set', () => {
    const code = moduleSrc.replace(/\/\/.*$/gm, '');
    assert.equal(/\.(update|set|delete)\(/.test(code), false, 'must not update/set/delete anything');
    assert.equal(code.includes('subscriptionStatusCache'), false);
    assert.equal((code.match(/\.create\(/g) ?? []).length, 1, 'exactly one write: the Payment create()');
  });
});
