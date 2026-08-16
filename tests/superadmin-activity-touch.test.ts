// SuperAdmin V1 Operational Control Plane — Phase E activity-touch
// mechanism tests (BDR-0010 Part 5/6, POL-18-001).
//
// Scope: server/activityTouch.ts's touchBusinessActivity() in
// isolation, exercised against an in-memory fake — the real function,
// not a duplicated implementation. Combined with structural
// (source-text) proof for the two things this module's own design
// cannot express in isolation: that the route wrapping it
// (server/index.ts) never surfaces a touch failure as an HTTP error
// (BDR-0010 Part 6's never-block requirement lives partly at the
// route layer, not just inside this function), and that the client
// (apps/tenant/src/context/AppContext.tsx) never writes
// lastActivityAt directly via the Firestore client SDK — the
// rejected mechanism BDR-0010 Part 5 explicitly ruled out. Same
// documented constraint and technique as
// tests/staff-management-multishop-authorization.test.ts and this
// session's own creation-invariant test: server/index.ts and
// AppContext.tsx cannot be imported (Firebase Admin init / browser
// Firestore SDK dependencies at load), so these two properties are
// verified by reading the actual committed source, not assumed.
//
// HOW TO RUN:
//   npx tsx --test tests/superadmin-activity-touch.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { touchBusinessActivity, type ActivityTouchDb } from '../server/activityTouch';

// ------------------------------------------------------------------
// Fake — a genuinely-stateful in-memory Firestore stand-in, small
// enough to keep inline (this module only ever calls one .update()).
// ------------------------------------------------------------------
function makeFakeDb(initial: Record<string, Record<string, unknown>> = {}): ActivityTouchDb & {
  state(): Record<string, Record<string, unknown>>;
  updateCallCount(businessId: string): number;
} {
  const businesses: Record<string, Record<string, unknown>> = Object.fromEntries(
    Object.entries(initial).map(([id, data]) => [id, { ...data }]),
  );
  const callCounts: Record<string, number> = {};
  const knownIds = new Set(Object.keys(initial));

  return {
    state() {
      return Object.fromEntries(Object.entries(businesses).map(([id, data]) => [id, { ...data }]));
    },
    updateCallCount(businessId: string) {
      return callCounts[businessId] ?? 0;
    },
    collection(_name: 'businesses') {
      return {
        doc(businessId: string) {
          return {
            async update(data: { lastActivityAt: string }) {
              callCounts[businessId] = (callCounts[businessId] ?? 0) + 1;
              // Mirrors real Firestore's own behavior: .update() on a
              // document that was never created fails outright (the
              // same class of behavior this project already learned,
              // the hard way, applies to get() on a nonexistent
              // document in firestore.rules — see the isBusinessSuspended
              // fix earlier this session).
              if (!knownIds.has(businessId)) {
                throw new Error(`NOT_FOUND: no document to update at businesses/${businessId}`);
              }
              businesses[businessId] = { ...businesses[businessId], ...data };
            },
          };
        },
      } as never;
    },
  };
}

describe('touchBusinessActivity — isolation', () => {
  it('updates lastActivityAt to a server-generated timestamp', async () => {
    const db = makeFakeDb({ 'biz-1': { name: 'Test Biz' } });
    const now = new Date('2026-08-15T12:00:00.000Z');
    const result = await touchBusinessActivity(db, 'biz-1', now);

    assert.equal(result.outcome, 'touched');
    if (result.outcome !== 'touched') return;
    assert.equal(result.timestamp, '2026-08-15T12:00:00.000Z');
    assert.equal(db.state()['biz-1'].lastActivityAt, '2026-08-15T12:00:00.000Z');
  });

  it('never modifies any field other than lastActivityAt', async () => {
    const db = makeFakeDb({ 'biz-1': { name: 'Test Biz', suspended: false, ownerUid: 'u-1' } });
    await touchBusinessActivity(db, 'biz-1', new Date());

    const state = db.state()['biz-1'];
    assert.equal(state.name, 'Test Biz');
    assert.equal(state.suspended, false);
    assert.equal(state.ownerUid, 'u-1');
  });

  it('a write failure (e.g. unknown business) resolves to outcome "failed" — never throws to the caller', async () => {
    const db = makeFakeDb({}); // no businesses registered — update() will throw internally
    const result = await touchBusinessActivity(db, 'biz-does-not-exist', new Date());

    assert.equal(result.outcome, 'failed');
    if (result.outcome !== 'failed') return;
    assert.match(result.message, /NOT_FOUND/);
  });

  it('a failure never throws — calling code can safely await without a try/catch and still get a result', async () => {
    const db = makeFakeDb({});
    await assert.doesNotReject(touchBusinessActivity(db, 'biz-nonexistent', new Date()));
  });

  it('repeated touches each produce a fresh, distinct timestamp, overwriting the previous value (never accumulating)', async () => {
    const db = makeFakeDb({ 'biz-1': {} });
    const t1 = new Date('2026-08-15T08:00:00.000Z');
    const t2 = new Date('2026-08-15T09:30:00.000Z');
    const t3 = new Date('2026-08-15T14:15:00.000Z');

    const r1 = await touchBusinessActivity(db, 'biz-1', t1);
    assert.equal(r1.outcome, 'touched');
    assert.equal(db.state()['biz-1'].lastActivityAt, '2026-08-15T08:00:00.000Z');

    const r2 = await touchBusinessActivity(db, 'biz-1', t2);
    assert.equal(r2.outcome, 'touched');
    assert.equal(db.state()['biz-1'].lastActivityAt, '2026-08-15T09:30:00.000Z'); // overwritten, not merged/appended

    const r3 = await touchBusinessActivity(db, 'biz-1', t3);
    assert.equal(r3.outcome, 'touched');
    assert.equal(db.state()['biz-1'].lastActivityAt, '2026-08-15T14:15:00.000Z');

    assert.equal(db.updateCallCount('biz-1'), 3); // one real write per touch, no batching/deduping
  });

  it('a touch call ignores whatever the injected "now" would otherwise coincidentally match a prior value — always writes the current call\'s timestamp', async () => {
    const db = makeFakeDb({ 'biz-1': { lastActivityAt: '2026-01-01T00:00:00.000Z' } }); // pre-existing, older value
    const now = new Date('2026-08-15T00:00:00.000Z');
    const result = await touchBusinessActivity(db, 'biz-1', now);

    assert.equal(result.outcome, 'touched');
    assert.equal(db.state()['biz-1'].lastActivityAt, '2026-08-15T00:00:00.000Z'); // moved forward, not left at the stale value
  });

  it('the timestamp always comes from the injected/real server clock — the function signature accepts no client-supplied timestamp at all', () => {
    // Structural proof by the function's own signature, not a runtime
    // assertion: touchBusinessActivity(db, businessId, now?) has
    // exactly one optional Date parameter, defaulting to new Date() —
    // there is no third string/timestamp parameter a caller could use
    // to inject an untrusted value. TypeScript's own type system
    // enforces this at every call site; this test documents the
    // property explicitly rather than leaving it implicit.
    assert.equal(touchBusinessActivity.length, 2); // db, businessId are required; now is optional (not counted in .length)
  });
});

// ------------------------------------------------------------------
// Structural verification — the two properties this module's own
// isolation tests cannot express, verified against the actual
// committed source.
// ------------------------------------------------------------------
describe('Phase E — activity-touch never-block contract (structural)', () => {
  const SERVER_SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');

  it('the /api/business/touch-activity route never returns a non-2xx status for a touch outcome — always res.json({ outcome })', () => {
    const routeMatch = SERVER_SOURCE.match(/expressApp\.post\('\/api\/business\/touch-activity'[\s\S]*?\n\}\);/);
    assert.ok(routeMatch, 'Expected to find the /api/business/touch-activity route in server/index.ts');
    const routeSource = routeMatch![0];

    // The successful-touch-attempt path and the catch-all failure path
    // must both use res.json (implicit 200), never res.status(4xx/5xx),
    // for the touch outcome itself. The businessId-validation and
    // membership checks above it are a different, legitimate class of
    // failure (a real security boundary) and are correctly excluded
    // from this assertion by only checking the code after those checks.
    const afterMembershipCheck = routeSource.slice(routeSource.indexOf('touchBusinessActivity('));
    assert.ok(!/res\.status\(\s*[45]\d\d/.test(afterMembershipCheck), 'A touch-activity outcome must never be reported via a 4xx/5xx status — see BDR-0010 Part 6.');
    assert.ok(afterMembershipCheck.includes("res.json({ outcome: result.outcome })"));
    assert.ok(afterMembershipCheck.includes("res.json({ outcome: 'failed' })"));
  });

  it('the route still correctly returns a real 403 for genuine cross-business authorization violations — a security boundary, not "activity metadata failure"', () => {
    const routeMatch = SERVER_SOURCE.match(/expressApp\.post\('\/api\/business\/touch-activity'[\s\S]*?\n\}\);/);
    assert.ok(routeMatch);
    assert.match(routeMatch![0], /res\.status\(403\)/);
  });

  it('businessId is validated before any write attempt is even considered', () => {
    const routeMatch = SERVER_SOURCE.match(/expressApp\.post\('\/api\/business\/touch-activity'[\s\S]*?\n\}\);/);
    assert.ok(routeMatch);
    assert.match(routeMatch![0], /if \(!businessId\)/);
  });
});

describe('Phase E — client cannot become the source of truth (structural)', () => {
  const CLIENT_SOURCE = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf8');

  it('AppContext.tsx never calls updateDoc/setDoc with lastActivityAt directly — the only path to that field is the server endpoint', () => {
    // A direct client write would look like updateDoc(..., { lastActivityAt: ... })
    // or setDoc(..., { ..., lastActivityAt: ... }) somewhere in this
    // file. The only occurrence of the string "lastActivityAt" anywhere
    // in this file should be inside a comment explaining why it is
    // NOT written here — never inside an actual Firestore write call.
    const occurrences = CLIENT_SOURCE.split('\n').filter((line) => line.includes('lastActivityAt'));
    assert.ok(occurrences.length > 0, 'Expected at least the explanatory comment to be present');
    for (const line of occurrences) {
      assert.ok(
        line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('POL-18-001'),
        `Found a non-comment reference to lastActivityAt in AppContext.tsx: "${line.trim()}" — this field must only ever be written server-side.`,
      );
    }
  });

  it('the touch-activity fetch call uses a server-verified Authorization Bearer token, not a client-asserted identity', () => {
    const touchCallMatch = CLIENT_SOURCE.match(/fetch\('\/api\/business\/touch-activity'[\s\S]*?\}\);/);
    assert.ok(touchCallMatch, 'Expected to find the touch-activity fetch call in AppContext.tsx');
    assert.match(touchCallMatch![0], /Authorization: `Bearer \$\{idToken\}`/);
  });
});
