// SuperAdmin-Assisted Initial Stock Recovery — server-side grant logic
// tests (server/initialStockRecoveryAuthorization.ts).
//
// Governing chain: docs/specs/BDR-0016.../POL-0009.../Specification/
// Rule 8 Assessment (READY)/Implementation Plan/Implementation
// Authorization (Signed, 2026-08-21).
//
// Same convention as tests/superadmin-business-suspension.test.ts: no
// suite imports server/index.ts directly (it requires real Firebase
// Admin credentials at module load) — this suite exercises the real,
// importable module directly against an in-memory fake satisfying
// InitialStockRecoveryAuthorizationDb.
//
// SCOPE NOTE (honesty, not a claim of completeness): this suite covers
// everything reachable WITHOUT a live Firestore instance — the grant
// function's own precondition logic, sequentially. It does NOT, and
// cannot, exercise Firestore's actual optimistic-concurrency behavior
// for two genuinely simultaneous transactions (that requires the Rules
// Emulator or a real Firestore instance, neither available in this
// sandbox — see this session's own verification report for why). The
// "concurrency" tests below verify this module's own precondition
// checks are correct in sequence, which is a necessary but not
// sufficient condition for true concurrent safety; true concurrent
// safety additionally depends on Firestore's own transaction guarantees
// (unmodified, un-owned by this module) and must be verified against a
// real emulator/Firestore instance before this ships.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-initial-stock-recovery-authorization.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  grantInitialStockRecoveryAuthorization,
  AUTHORIZATION_DURATION_MS,
  CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS,
  type InitialStockRecoveryAuthorizationDb,
  type ServerTimestamp,
  type TimestampFactory,
} from '../server/initialStockRecoveryAuthorization';

// ------------------------------------------------------------------
// Fake Timestamp / clock — a fixed, controllable "now" so expiry math
// is exactly assertable, not flaky against real wall-clock time.
// ------------------------------------------------------------------
function fakeTimestamp(ms: number): ServerTimestamp {
  return { toMillis: () => ms };
}

function makeClock(nowMs: number): TimestampFactory {
  return {
    now: () => fakeTimestamp(nowMs),
    fromMillis: (ms: number) => fakeTimestamp(ms),
  };
}

// ------------------------------------------------------------------
// Fake Firestore — an in-memory stand-in supporting exactly what
// grantInitialStockRecoveryAuthorization() needs: doc get/set inside a
// (sequentially-executed, not truly concurrent) transaction.
// ------------------------------------------------------------------
interface FakeStore {
  stockCounts: Record<string, Record<string, Record<string, unknown>> | undefined>;
  voidRecords: Record<string, Record<string, Record<string, unknown>> | undefined>;
  authorization: Record<string, Record<string, unknown> | undefined>;
}

function makeFakeDb(seed: {
  stockCounts?: Record<string, Record<string, Record<string, unknown>>>;
  voidRecords?: Record<string, Record<string, Record<string, unknown>>>;
  authorization?: Record<string, Record<string, unknown>>;
}): InitialStockRecoveryAuthorizationDb & { store: FakeStore } {
  const store: FakeStore = {
    stockCounts: { ...(seed.stockCounts ?? {}) },
    voidRecords: { ...(seed.voidRecords ?? {}) },
    authorization: { ...(seed.authorization ?? {}) },
  };

  return {
    store,
    collection(_name: 'businesses') {
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
                    // set() is only ever called by this module against
                    // the 'initialStockRecoveryAuthorization' collection
                    // (it never writes stockCounts or voidRecords) — the
                    // closed-over businessId/sub here are exactly what
                    // makes that unambiguous, with no side-channel
                    // needed on the ref itself.
                    __set(data: Record<string, unknown>) {
                      if (sub !== 'initialStockRecoveryAuthorization') {
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
  } as unknown as InitialStockRecoveryAuthorizationDb & { store: FakeStore };
}

function setup(seed: Parameters<typeof makeFakeDb>[0]) {
  return makeFakeDb(seed);
}

// ------------------------------------------------------------------

describe('grantInitialStockRecoveryAuthorization — input validation', () => {
  it('rejects a missing justification before any read happens', async () => {
    const db = setup({});
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: '',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'missing-justification');
  });

  it('rejects a missing target', async () => {
    const db = setup({});
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: '',
      justification: 'Cliente contactou o suporte.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'missing-target');
  });
});

describe('grantInitialStockRecoveryAuthorization — target eligibility (current-confirmation-only, ceiling)', () => {
  it('rejects a target that does not exist', async () => {
    const db = setup({ stockCounts: { 'biz-1': {} } });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-not-found');
  });

  it('rejects a target that is not type "initial"', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'periodic' } } } });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-not-initial-type');
  });

  it('accepts a LEGACY target — type initial, no confirmedAt, no chainPosition field at all', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'initial' } } } });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'Confirmação legada, sem confirmedAt.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });

  it('accepts an EXPIRED-WINDOW, non-legacy target (chainPosition 2, confirmedAt long past)', async () => {
    const db = setup({
      stockCounts: { 'biz-1': { 'initial-2': { type: 'initial', chainPosition: 2, confirmedAt: fakeTimestamp(1000) } } },
    });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(999_999_999_999), {
      businessId: 'biz-1',
      targetStockCountId: 'initial-2',
      justification: 'Janela de 12 horas já expirou.',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });

  it('REJECTS a target already at Confirmation #4 (chainPosition 4) — the ceiling', async () => {
    const db = setup({
      stockCounts: { 'biz-1': { 'initial-4': { type: 'initial', chainPosition: 4, confirmedAt: fakeTimestamp(1000) } } },
    });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial-4',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-at-ceiling');
  });

  it('REJECTS a target that already has a voidRecords entry — not the current confirmation', async () => {
    const db = setup({
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      voidRecords: { 'biz-1': { initial: { voidedConfirmationId: 'initial' } } },
    });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'target-not-current');
  });
});

describe('grantInitialStockRecoveryAuthorization — single-active-Authorization', () => {
  it('REJECTS a second grant while an unconsumed, unexpired Authorization already exists', async () => {
    const db = setup({
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: {
        'biz-1': {
          targetStockCountId: 'initial',
          authorizedAt: fakeTimestamp(1000),
          expiresAt: fakeTimestamp(1000 + AUTHORIZATION_DURATION_MS),
          status: 'unconsumed',
          grantedByUid: 'op-0',
          justification: 'earlier grant',
        },
      },
    });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(2000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'second attempt',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'authorization-already-active');
  });

  it('ALLOWS a new grant once the existing Authorization has been consumed', async () => {
    const db = setup({
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: {
        'biz-1': {
          targetStockCountId: 'initial',
          authorizedAt: fakeTimestamp(1000),
          expiresAt: fakeTimestamp(1000 + AUTHORIZATION_DURATION_MS),
          status: 'consumed',
          grantedByUid: 'op-0',
          justification: 'earlier grant',
        },
      },
    });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(2000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'second attempt',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });

  it('ALLOWS a new grant once the existing Authorization has expired unconsumed', async () => {
    const expiresAtMs = 1000 + AUTHORIZATION_DURATION_MS;
    const db = setup({
      stockCounts: { 'biz-1': { initial: { type: 'initial' } } },
      authorization: {
        'biz-1': {
          targetStockCountId: 'initial',
          authorizedAt: fakeTimestamp(1000),
          expiresAt: fakeTimestamp(expiresAtMs),
          status: 'unconsumed',
          grantedByUid: 'op-0',
          justification: 'earlier grant, now expired',
        },
      },
    });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(expiresAtMs + 1), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'second attempt after expiry',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
  });
});

describe('grantInitialStockRecoveryAuthorization — 48-hour expiry computation', () => {
  it('sets expiresAt to exactly authorizedAt + 48 hours, no more, no less', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'initial' } } } });
    const nowMs = 1_700_000_000_000;
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(nowMs), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
    if (result.outcome !== 'granted') return;
    assert.equal(AUTHORIZATION_DURATION_MS, 48 * 60 * 60 * 1000);
    assert.equal(result.authorizedAt.toMillis(), nowMs);
    assert.equal(result.expiresAt.toMillis(), nowMs + 48 * 60 * 60 * 1000);
  });

  it('never writes chainPosition or confirmedAt onto the Authorization document (no field confusion)', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'initial' } } } });
    await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    const written = db.store.authorization['biz-1'];
    assert.ok(written);
    assert.equal('chainPosition' in (written ?? {}), false);
    assert.equal('confirmedAt' in (written ?? {}), false);
    assert.equal(written?.status, 'unconsumed');
  });
});

describe('grantInitialStockRecoveryAuthorization — never touches stockCounts or voidRecords', () => {
  it('the target stockCounts document is byte-for-byte unmodified after a successful grant', async () => {
    const originalTarget = { type: 'initial', items: [{ productName: 'X', quantity: 1, costPrice: 10, totalValue: 10 }] };
    const db = setup({ stockCounts: { 'biz-1': { initial: { ...originalTarget } } } });
    const result = await grantInitialStockRecoveryAuthorization(db, makeClock(1000), {
      businessId: 'biz-1',
      targetStockCountId: 'initial',
      justification: 'j',
      grantedByUid: 'op-1',
    });
    assert.equal(result.outcome, 'granted');
    assert.deepEqual(db.store.stockCounts['biz-1']?.initial, originalTarget);
  });
});

// [Capital Inicial Retirement — Implementation Authorization Increment
// 3, AC-5/AC-6] The retirement cutover precondition — checked FIRST,
// before every existing precondition (justification, target
// eligibility, single-active-Authorization).
describe('grantInitialStockRecoveryAuthorization — retirement cutover (Increment 3)', () => {
  it('AC-5: a grant attempted BEFORE cutover succeeds exactly as before, unchanged', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'initial' } } } });
    const result = await grantInitialStockRecoveryAuthorization(
      db,
      makeClock(CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS - 1),
      { businessId: 'biz-1', targetStockCountId: 'initial', justification: 'Antes do cutover.', grantedByUid: 'op-1' }
    );
    assert.equal(result.outcome, 'granted');
  });

  it('AC-6: a grant attempted AT OR AFTER cutover is refused with retirement-cutover-reached', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'initial' } } } });
    const atCutover = await grantInitialStockRecoveryAuthorization(
      db,
      makeClock(CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS),
      { businessId: 'biz-1', targetStockCountId: 'initial', justification: 'No exato instante do cutover.', grantedByUid: 'op-1' }
    );
    assert.equal(atCutover.outcome, 'retirement-cutover-reached');

    const afterCutover = await grantInitialStockRecoveryAuthorization(
      db,
      makeClock(CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS + 1_000_000),
      { businessId: 'biz-1', targetStockCountId: 'initial', justification: 'Muito depois do cutover.', grantedByUid: 'op-1' }
    );
    assert.equal(afterCutover.outcome, 'retirement-cutover-reached');
  });

  it('the cutover check runs BEFORE the justification/target validation — an empty justification after cutover still reports retirement-cutover-reached, not missing-justification', async () => {
    const db = setup({});
    const result = await grantInitialStockRecoveryAuthorization(
      db,
      makeClock(CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS),
      { businessId: 'biz-1', targetStockCountId: '', justification: '', grantedByUid: 'op-1' }
    );
    assert.equal(result.outcome, 'retirement-cutover-reached');
  });

  it('the cutover check runs BEFORE target eligibility — an otherwise-invalid target after cutover still reports retirement-cutover-reached, not target-not-found', async () => {
    const db = setup({ stockCounts: { 'biz-1': {} } });
    const result = await grantInitialStockRecoveryAuthorization(
      db,
      makeClock(CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS),
      { businessId: 'biz-1', targetStockCountId: 'initial', justification: 'j', grantedByUid: 'op-1' }
    );
    assert.equal(result.outcome, 'retirement-cutover-reached');
  });

  it('a post-cutover retirement-cutover-reached result never writes an Authorization document — the fixed-id store stays empty', async () => {
    const db = setup({ stockCounts: { 'biz-1': { initial: { type: 'initial' } } } });
    const result = await grantInitialStockRecoveryAuthorization(
      db,
      makeClock(CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS),
      { businessId: 'biz-1', targetStockCountId: 'initial', justification: 'j', grantedByUid: 'op-1' }
    );
    assert.equal(result.outcome, 'retirement-cutover-reached');
    assert.equal(db.store.authorization['biz-1'], undefined);
  });
});

// ------------------------------------------------------------------
// Source-level regression guards — server/index.ts's route wiring for
// the /authorize route's new retirement-cutover-reached branch.
//
// [Capital Inicial Retirement — Implementation Authorization Amendment
// 1] server/index.ts cannot be imported directly (Firebase Admin init
// at module load, see this file's own header comment) — same
// established technique tests/superadmin-initial-stock-recovery-
// consumption.test.ts already uses for the sibling /consume route.
//
// Minimum necessary integration coverage per Amendment 1's own Test
// Requirements: (a) the branch exists and returns a controlled,
// non-success response; (b) it returns BEFORE any granted-success
// handling is reached — proving no fall-through; (c) no audit-log
// write happens on this path — proving no false successful-grant
// audit. Pre-cutover behavior and pre-cutover-grant-remains-
// consumable-after-cutover are already covered: the former by every
// existing 'granted' test above (all run with clock values far below
// CAPITAL_INICIAL_RETIREMENT_CUTOVER_MS), the latter by the regression
// run of tests/superadmin-initial-stock-recovery-consumption.test.ts
// (unmodified, per Increment 3's own explicit exclusion of that file).
// ------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const serverIndexSource = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf-8');

describe('server/index.ts — /api/superadmin/initial-stock-recovery/:businessId/authorize route wiring (Amendment 1)', () => {
  function authorizeRouteBody(): string {
    const routeMatch = serverIndexSource.match(
      /expressApp\.post\(\s*'\/api\/superadmin\/initial-stock-recovery\/:businessId\/authorize'[\s\S]*?\n\}\);/
    );
    assert.ok(routeMatch, 'expected the initial-stock-recovery authorize route to exist');
    return routeMatch![0];
  }

  it('explicitly handles retirement-cutover-reached with a non-success (409) response', () => {
    const body = authorizeRouteBody();
    assert.match(body, /result\.outcome === 'retirement-cutover-reached'/);
    // Same textual block must contain both the check and a 409 status
    // — not merely appear somewhere else in the route.
    const branchStart = body.indexOf("result.outcome === 'retirement-cutover-reached'");
    const nearby = body.slice(branchStart, branchStart + 200);
    assert.match(nearby, /res\.status\(409\)/);
  });

  it('returns BEFORE the granted-success handling — never falls through to writing businessId/targetStockCountId/expiresAt', () => {
    const body = authorizeRouteBody();
    const branchIndex = body.indexOf("result.outcome === 'retirement-cutover-reached'");
    const grantedCommentIndex = body.indexOf("result.outcome === 'granted' from here");
    assert.ok(branchIndex >= 0 && grantedCommentIndex >= 0);
    assert.ok(branchIndex < grantedCommentIndex, 'expected the retirement-cutover-reached branch to appear, and return, before granted-success handling');
    // The branch itself must contain its own `return;`, so control
    // never reaches the code after it.
    const branchSlice = body.slice(branchIndex, grantedCommentIndex);
    assert.match(branchSlice, /return;/);
  });

  it('never writes an audit-log entry on the retirement-cutover-reached path — no false successful-grant audit', () => {
    const body = authorizeRouteBody();
    const branchIndex = body.indexOf("result.outcome === 'retirement-cutover-reached'");
    const grantedCommentIndex = body.indexOf("result.outcome === 'granted' from here");
    const branchSlice = body.slice(branchIndex, grantedCommentIndex);
    assert.doesNotMatch(branchSlice, /writeAuditLogEntry/);
  });

  it('does not access businessId/targetStockCountId/expiresAt within the retirement-cutover-reached branch itself', () => {
    const body = authorizeRouteBody();
    const branchIndex = body.indexOf("result.outcome === 'retirement-cutover-reached'");
    const grantedCommentIndex = body.indexOf("result.outcome === 'granted' from here");
    const branchSlice = body.slice(branchIndex, grantedCommentIndex);
    assert.doesNotMatch(branchSlice, /result\.businessId/);
    assert.doesNotMatch(branchSlice, /result\.targetStockCountId/);
    assert.doesNotMatch(branchSlice, /result\.expiresAt/);
  });
});
