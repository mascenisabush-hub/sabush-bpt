// SuperAdmin-Assisted Initial Stock Recovery — client-side pure
// function and source-level regression tests.
//
// Governing chain: BDR-0016 (Approved) -> POL-0009 (Approved) ->
// Specification -> Rule 8 Assessment (READY) -> Implementation Plan ->
// Implementation Authorization (Signed, 2026-08-21).
//
// Mirrors tests/initial-stock-void-redo.test.ts's own established
// two-part technique: (1) computeInitialStockAuthorizedRecoveryEligibility
// is pure and directly importable, so it is unit-tested for real; (2)
// AppContext.tsx's voidInitialStockConfirmation()/listener wiring and
// firestore.rules' new rule text are tightly coupled to the live
// Firebase client SDK / Security Rules runtime with no emulator
// available in this sandbox (see this session's own verification
// report) — those are covered here as source-level regression guards,
// the same technique this repository's own precedent already uses for
// exactly this reason.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-assisted-initial-stock-recovery.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { Timestamp } from 'firebase/firestore';
import { computeInitialStockAuthorizedRecoveryEligibility } from '../apps/tenant/src/utils/calculations';
import type { InitialStockRecoveryAuthorization } from '../apps/tenant/src/types';

function makeAuthorization(overrides: Partial<InitialStockRecoveryAuthorization> = {}): InitialStockRecoveryAuthorization {
  return {
    id: 'current',
    targetStockCountId: 'initial',
    authorizedAt: Timestamp.fromMillis(0),
    expiresAt: Timestamp.fromMillis(48 * 60 * 60 * 1000),
    status: 'unconsumed',
    grantedByUid: 'op-1',
    justification: 'j',
    ...overrides,
  };
}

// ------------------------------------------------------------------
// 1. computeInitialStockAuthorizedRecoveryEligibility — pure unit tests
// ------------------------------------------------------------------

describe('computeInitialStockAuthorizedRecoveryEligibility — no Authorization / no target', () => {
  it('is ineligible when no Authorization exists at all', () => {
    const result = computeInitialStockAuthorizedRecoveryEligibility(null, 'initial');
    assert.equal(result.eligible, false);
    assert.equal(result.expiresAt, null);
    assert.equal(result.msRemaining, 0);
  });

  it('is ineligible when there is no current confirmation to check against', () => {
    const result = computeInitialStockAuthorizedRecoveryEligibility(makeAuthorization(), null);
    assert.equal(result.eligible, false);
  });

  it('is ineligible when the Authorization names a DIFFERENT confirmation than the one being checked', () => {
    const auth = makeAuthorization({ targetStockCountId: 'initial-2' });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial');
    assert.equal(result.eligible, false);
  });

  it('is ineligible once the Authorization has been consumed, even if still within its own window', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    const auth = makeAuthorization({
      status: 'consumed',
      authorizedAt: Timestamp.fromMillis(now.getTime() - 60 * 60 * 1000),
      expiresAt: Timestamp.fromMillis(now.getTime() + 47 * 60 * 60 * 1000),
    });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.eligible, false);
  });
});

describe('computeInitialStockAuthorizedRecoveryEligibility — 48-hour window', () => {
  it('is eligible well within the window (10 hours elapsed of 48)', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    const authorizedAt = Timestamp.fromMillis(now.getTime() - 10 * 60 * 60 * 1000);
    const expiresAt = Timestamp.fromMillis(authorizedAt.toMillis() + 48 * 60 * 60 * 1000);
    const auth = makeAuthorization({ authorizedAt, expiresAt });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.eligible, true);
    assert.equal(result.msRemaining, 38 * 60 * 60 * 1000);
    assert.equal(result.expiresAt!.getTime(), expiresAt.toMillis());
  });

  it('is eligible one second before the 48-hour boundary', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    const expiresAt = Timestamp.fromMillis(now.getTime() + 1000);
    const auth = makeAuthorization({ expiresAt });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.eligible, true);
    assert.equal(result.msRemaining, 1000);
  });

  it('is ineligible exactly at the 48-hour boundary (now === expiresAt, the "<" comparison excludes it — same discipline as the ordinary 12-hour window)', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    const expiresAt = Timestamp.fromMillis(now.getTime());
    const auth = makeAuthorization({ expiresAt });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.eligible, false);
  });

  it('is ineligible just past the 48-hour boundary', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    const expiresAt = Timestamp.fromMillis(now.getTime() - 1000);
    const auth = makeAuthorization({ expiresAt });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.eligible, false);
    assert.equal(result.msRemaining, 0);
  });

  it('msRemaining never goes negative, however far past expiry', () => {
    const now = new Date('2026-08-21T00:00:00Z');
    const expiresAt = Timestamp.fromMillis(now.getTime() - 1000 * 60 * 60 * 24 * 365);
    const auth = makeAuthorization({ expiresAt });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.msRemaining, 0);
  });
});

describe('computeInitialStockAuthorizedRecoveryEligibility — separateness from the ordinary 12-hour window (POL-0009 Rule R)', () => {
  it('is independent of any ordinary-window concept — it never reads confirmedAt or chainPosition at all', () => {
    // The function's own signature takes only (authorization, targetStockCountId, now) —
    // no StockCount, no confirmedAt, no chainPosition parameter exists for it to read.
    // This test exists as an explicit, named regression guard for that shape, not just
    // an implicit consequence of the signature.
    const now = new Date('2026-08-21T00:00:00Z');
    const auth = makeAuthorization({ expiresAt: Timestamp.fromMillis(now.getTime() + 1000) });
    const result = computeInitialStockAuthorizedRecoveryEligibility(auth, 'initial', now);
    assert.equal(result.eligible, true);
    // Only 2 required params count toward .length (the `now` parameter
    // has a default value, so JS excludes it from Function.length) —
    // asserting this at all is itself the regression guard: a future
    // edit that adds a StockCount/confirmedAt/chainPosition parameter
    // would change this arity.
    assert.equal(computeInitialStockAuthorizedRecoveryEligibility.length, 2);
  });
});

// ------------------------------------------------------------------
// 2. Source-level regression guards — AppContext.tsx wiring
// ------------------------------------------------------------------

const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf-8'
);

describe('AppContext.tsx — Authorization listener wiring', () => {
  it('listens to the fixed-id "current" document, not a collection query', () => {
    assert.match(appContextSource, /doc\(db, 'businesses', businessId, 'initialStockRecoveryAuthorization', 'current'\)/);
  });

  it('unsubscribes the Authorization listener on cleanup (no leak on business switch)', () => {
    assert.match(appContextSource, /unsubInitialStockRecoveryAuthorization\(\);/);
  });
});

describe('AppContext.tsx — voidInitialStockConfirmation() consumption wiring (post-Consumption & Audit Amendment)', () => {
  it('consumes the Authorization ONLY when the ordinary window is NOT already eligible — never spends a still-needed grant', () => {
    assert.match(
      appContextSource,
      /!initialStockVoidEligibility\.eligible && initialStockAuthorizedRecoveryEligibility\.eligible/
    );
  });

  it('the authorized path calls the server-mediated consumption route — it no longer writes voidRecords or the Authorization document directly', () => {
    const fnMatch = appContextSource.match(/const voidInitialStockConfirmation = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected voidInitialStockConfirmation to exist');
    const body = fnMatch![0];
    assert.match(body, /fetch\('\/api\/initial-stock-recovery\/consume'/);
    assert.match(body, /method: 'POST'/);
    assert.match(body, /Authorization: `Bearer \$\{idToken\}`/);
    // The request body carries only businessId/targetStockCountId — no
    // justification/reason field is ever sent from the client (Amendment
    // §6/§7 — no new Owner-entered reason field).
    const requestBodyMatch = body.match(/body: JSON\.stringify\(\{([\s\S]*?)\}\),/);
    assert.ok(requestBodyMatch, 'expected a JSON request body for the consume call');
    assert.doesNotMatch(requestBodyMatch![1], /justification/);
    assert.doesNotMatch(requestBodyMatch![1], /reason/i);
  });

  it('the ordinary (non-authorized) path is unchanged — still a direct client batch write, gated by firestore.rules alone', () => {
    const fnMatch = appContextSource.match(/const voidInitialStockConfirmation = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    const body = fnMatch![0];
    assert.match(body, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'voidRecords', targetId\)/);
    assert.match(body, /await fsBatch\.commit\(\);/);
  });

  it('the authorized path never writes directly to voidRecords or initialStockRecoveryAuthorization from the client (that write now happens server-side only)', () => {
    const fnMatch = appContextSource.match(/const voidInitialStockConfirmation = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch);
    const body = fnMatch![0];
    // The only fsBatch.update in this function must not target the
    // Authorization collection — that update path was removed by the
    // Consumption & Audit Amendment.
    assert.doesNotMatch(body, /fsBatch\.update\(doc\(db, 'businesses', businessId, 'initialStockRecoveryAuthorization'/);
  });

  it('never writes confirmedAt or chainPosition anywhere inside voidInitialStockConfirmation (no fabrication/backfill)', () => {
    const fnMatch = appContextSource.match(/const voidInitialStockConfirmation = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected voidInitialStockConfirmation to exist');
    const body = fnMatch![0];
    assert.doesNotMatch(body, /confirmedAt:/);
    assert.doesNotMatch(body, /chainPosition:/);
  });
});

// ------------------------------------------------------------------
// 3. Source-level regression guards — firestore.rules
// ------------------------------------------------------------------

const rulesSource = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf-8');

describe('firestore.rules — SuperAdmin-Assisted Initial Stock Recovery', () => {
  it('defines initialStockRecoveryAuthorizationActive() as a helper, not inline in the create rule', () => {
    assert.match(rulesSource, /function initialStockRecoveryAuthorizationActive\(businessId, stockCountId\) \{/);
  });

  it('the eligibility helper checks chainPosition != 4 — Confirmation #4 stays non-voidable under this path too', () => {
    const fnMatch = rulesSource.match(/function initialStockRecoveryAuthorizationActive[\s\S]*?\n    \}/);
    assert.ok(fnMatch);
    assert.match(fnMatch![0], /chainPosition', 1\) != 4/);
  });

  it('the eligibility helper does NOT require confirmedAt to be present (legacy confirmations are reachable) — it never reads the target\'s confirmedAt field', () => {
    const fnMatch = rulesSource.match(/function initialStockRecoveryAuthorizationActive[\s\S]*?\n    \}/);
    assert.ok(fnMatch);
    // Checks the actual field-access pattern, not the bare word — the
    // function's own explanatory comment legitimately mentions
    // "confirmedAt" in prose (contrasting itself with
    // initialStockConfirmationVoidable()); what must never appear is an
    // actual .data.get('confirmedAt' or .data.confirmedAt read.
    assert.doesNotMatch(fnMatch![0], /\.data\.get\('confirmedAt'/);
    assert.doesNotMatch(fnMatch![0], /\.data\.confirmedAt/);
  });

  it('the /voidRecords create rule is extended additively — the ordinary initialStockConfirmationVoidable(...) condition is still present, unmodified', () => {
    assert.match(
      rulesSource,
      /\(initialStockConfirmationVoidable\(businessId, stockCountId\) \|\|\s*\n\s*initialStockRecoveryAuthorizationActive\(businessId, stockCountId\)\);/
    );
  });

  it('the /initialStockRecoveryAuthorization collection refuses client create (Admin-SDK/server-only grant)', () => {
    const matchBlock = rulesSource.match(/match \/initialStockRecoveryAuthorization\/\{docId\} \{[\s\S]*?\n      \}/);
    assert.ok(matchBlock);
    assert.match(matchBlock![0], /allow create: if false;/);
  });

  it('the /initialStockRecoveryAuthorization collection refuses client update too (consumption is server-mediated only, per the Consumption & Audit Amendment)', () => {
    const matchBlock = rulesSource.match(/match \/initialStockRecoveryAuthorization\/\{docId\} \{[\s\S]*?\n      \}/);
    assert.ok(matchBlock);
    assert.match(matchBlock![0], /allow update: if false;/);
  });

  it('the /initialStockRecoveryAuthorization collection never allows delete', () => {
    const matchBlock = rulesSource.match(/match \/initialStockRecoveryAuthorization\/\{docId\} \{[\s\S]*?\n      \}/);
    assert.ok(matchBlock);
    assert.match(matchBlock![0], /allow delete: if false;/);
  });

  it('the original stockCounts allow update/delete line is completely unmodified (immutability untouched by this capability)', () => {
    assert.match(
      rulesSource,
      /allow update, delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/
    );
  });
});
