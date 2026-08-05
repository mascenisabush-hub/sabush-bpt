// Module #20 Phase 2 (Privileged-Server Creation Path) — Checkpoint 3
// verification: staff-endpoint notification producers.
//
// WHY STATIC/STRUCTURAL, NOT RUNTIME: server/index.ts performs Firebase
// Admin initialization and expressApp.listen() as *import-time* side
// effects. There is no dependency-injection seam or firebase-admin
// mock already established in this repo, and this sandbox has no
// Firestore emulator access (same network-egress limitation already
// documented in tests/firestore-rules.test.ts, one level earlier —
// that suite can't reach the emulator; this one can't even safely
// import the module under test without live credentials). Extracting
// the notification helpers into a side-effect-free module would be a
// structural refactor beyond this checkpoint's verification-only scope
// ("do not change runtime behavior unless a genuine defect is
// discovered" — a refactor is not a defect fix).
//
// So, per this repository's own established interim convention for
// emulator/runtime-blocked verification (see firestore-rules.test.ts's
// header, and 20-phase1-closeout.md's "Execution blocked by
// environment" note): this suite reads server/index.ts as source text
// and asserts the required literals are present at each of the five
// call sites, plus the partial-failure control-flow shape around them.
// This is real verification of what's actually committed — not a
// substitute for running the five endpoints end-to-end against a live
// (or emulated) Firestore + Firebase Auth, which remains outstanding
// and is flagged as such in docs/engineering/20-phase2-closeout.md.
//
// HOW TO RUN:
//   npx tsx --test tests/staff-notifications.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

const SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');

// ---------------------------------------------------------------------
// 0. Producer count — no additional notification producers exist.
// ---------------------------------------------------------------------

describe('Notification producer count (Phase 2 boundary)', () => {
  it('has exactly five writeNotification() call sites', () => {
    const matches = SOURCE.match(/await writeNotification\(/g) || [];
    assert.equal(matches.length, 5, 'Expected exactly five callers — one per staff endpoint. A different count means either a missing endpoint or an unauthorized new producer (Background Worker, Subscription, Closing, Inventory Risk, or Platform Announcement) has been introduced without its own Rule 8 Assessment and Authorization.');
  });

  it('defines writeNotification() itself exactly once, now in server/notificationPlatform.ts (moved there, Phase 3 Checkpoint 2 — not duplicated, not left behind in server/index.ts)', () => {
    const indexMatches = SOURCE.match(/async function writeNotification\(/g) || [];
    assert.equal(indexMatches.length, 0, 'server/index.ts should no longer define writeNotification() itself — it now imports it from server/notificationPlatform.ts.');

    const platformSource = readFileSync(new URL('../server/notificationPlatform.ts', import.meta.url), 'utf8');
    const platformMatches = platformSource.match(/async function writeNotification\(/g) || [];
    assert.equal(platformMatches.length, 1, 'server/notificationPlatform.ts should define writeNotification() exactly once.');

    assert.match(SOURCE, /import\s*\{\s*createNotificationPlatform\s*\}\s*from\s*'\.\/notificationPlatform'/, 'server/index.ts should import the Notification Platform factory rather than redefining writeNotification locally.');
  });

  it('no function other than the five staff endpoints calls writeNotification() (no Background Worker/Subscription/Closing/Inventory Risk/Platform Announcement producer exists)', () => {
    // Module #19's own runTrialLifecycleSweep() legitimately exists in
    // this file (Module #19 Phase 2, a separate, already-authorized
    // module) — its mere presence is not a Module #20 boundary issue.
    // What matters for Phase 2's own scope is that it does not call
    // writeNotification(); confirmed by the exact-five-callers count
    // above already covering the whole file, not just the five known
    // sites. This test double-checks by name for the specific function
    // most likely to eventually need one (Phase 3's own future scope).
    const sweepStart = SOURCE.indexOf('async function runTrialLifecycleSweep');
    if (sweepStart !== -1) {
      const sweepEnd = SOURCE.indexOf('\n}\n', sweepStart);
      const sweepBody = SOURCE.slice(sweepStart, sweepEnd === -1 ? undefined : sweepEnd);
      assert.doesNotMatch(sweepBody, /writeNotification/, 'runTrialLifecycleSweep (Module #19 Phase 2) must not call writeNotification — that would be an unauthorized Phase 3 producer introduced without its own Rule 8 Assessment.');
    }
  });
});

// ---------------------------------------------------------------------
// Helper: extract the writeNotification({...}) call block immediately
// following a given route-registration marker, up to the matching
// closing '});' of the call — good enough for this file's consistent
// formatting (verified by eye against all five sites before writing
// this helper).
// ---------------------------------------------------------------------
function extractNotificationBlock(routeMarker: string): string {
  const routeIndex = SOURCE.indexOf(routeMarker);
  assert.ok(routeIndex !== -1, `Route marker not found: ${routeMarker}`);
  const callIndex = SOURCE.indexOf('await writeNotification({', routeIndex);
  assert.ok(callIndex !== -1, `No writeNotification call found after ${routeMarker}`);
  const endIndex = SOURCE.indexOf('});', callIndex);
  assert.ok(endIndex !== -1, `Could not find end of writeNotification call after ${routeMarker}`);
  return SOURCE.slice(callIndex, endIndex + 3);
}

// Endpoint -> [route marker, expected `type`, expected dedupeKey prefix pattern]
const ENDPOINTS: Array<{
  name: string;
  marker: string;
  type: string;
}> = [
  { name: 'delete', marker: "expressApp.post('/api/staff/delete'", type: 'staff_removed' },
  { name: 'suspend', marker: "expressApp.post('/api/staff/suspend'", type: 'staff_suspended' },
  { name: 'reactivate', marker: "expressApp.post('/api/staff/reactivate'", type: 'staff_reactivated' },
  { name: 'reset-pin', marker: "expressApp.post('/api/staff/reset-pin'", type: 'staff_pin_reset' },
  { name: 'set-tier', marker: "expressApp.post('/api/staff/set-tier'", type: 'staff_tier_changed' },
];

describe('Per-endpoint notification payload shape (structural)', () => {
  for (const { name, marker, type } of ENDPOINTS) {
    describe(`/api/staff/${name}`, () => {
      const block = extractNotificationBlock(marker);

      it('sets category to staff (Amendment v1.2)', () => {
        assert.match(block, /category:\s*'staff'/);
      });

      it("sets scope to 'user' (User-scoped, not Business-scoped)", () => {
        assert.match(block, /scope:\s*'user'/);
      });

      it('sets businessId to null (required by validateNotificationPayload for scope=user)', () => {
        assert.match(block, /businessId:\s*null/);
      });

      it('sets userId to staffUid — the acted-upon staff member is the recipient, not the requester', () => {
        assert.match(block, /userId:\s*staffUid/);
        assert.doesNotMatch(block, /userId:\s*requesterUid/);
      });

      it(`sets the expected event type ('${type}')`, () => {
        assert.match(block, new RegExp(`type:\\s*'${type}'`));
      });

      it("uses payloadRef pointing at the staff member's own user document", () => {
        assert.match(block, /payloadRef:\s*\{\s*collection:\s*'users',\s*documentId:\s*staffUid\s*\}/);
      });

      it('constructs a dedupeKey scoped to staffUid, the event type, and a unique eventId', () => {
        assert.match(block, new RegExp(`dedupeKey:\\s*\`\\\$\\{staffUid\\}:${type}:\\\$\\{eventId\\}\``));
      });

      it('populates context with all three required keys (Amendment v1.1, Business Rule 9)', () => {
        // whatHappened may appear as an explicit `whatHappened: <expr>,`
        // (delete/suspend/reactivate/reset-pin) or as the ES2015
        // shorthand `whatHappened,` when the endpoint precomputes it as
        // a local const first (set-tier, whose value depends on which
        // of three tier-change outcomes occurred) — both are the same
        // required key being populated, not a different contract.
        assert.match(block, /whatHappened:|(?<![.\w])whatHappened,/);
        assert.match(block, /whyItMatters:/);
        assert.match(block, /recommendedAction:/);
      });

      it("sets priority to 'immediate' (all five are account-security/access events, per Business Rule 10's intent)", () => {
        assert.match(block, /priority:\s*'immediate'/);
      });
    });
  }
});

describe('Partial-failure handling (staged pattern, per HANDOFF.md)', () => {
  for (const { name, marker } of ENDPOINTS) {
    it(`/api/staff/${name}: notification write is wrapped in its own try/catch, distinct from the primary action`, () => {
      const routeIndex = SOURCE.indexOf(marker);
      const callIndex = SOURCE.indexOf('await writeNotification({', routeIndex);
      // The nearest preceding 'try {' before the call, and the nearest
      // following 'catch' after the call's closing '});', should bound
      // the notification write in its own stage — not share a try block
      // with the primary (Auth/Firestore) mutation above it.
      const precedingTry = SOURCE.lastIndexOf('try {', callIndex);
      const blockEnd = SOURCE.indexOf('});', callIndex) + 3;
      const followingCatch = SOURCE.indexOf('catch (err)', blockEnd);
      assert.ok(precedingTry !== -1 && precedingTry < callIndex, `${name}: expected a try { before the writeNotification call`);
      assert.ok(followingCatch !== -1 && followingCatch < blockEnd + 400, `${name}: expected a nearby catch (err) after the writeNotification call`);

      const stageSlice = SOURCE.slice(precedingTry, followingCatch + 400);
      assert.match(stageSlice, /notificationLogged = false/, `${name}: catch block should set notificationLogged = false, not rethrow or fail the request`);
      assert.match(stageSlice, /console\.error\(/, `${name}: catch block should log the failure`);
    });

    it(`/api/staff/${name}: response includes notificationLogged only when the notification stage failed (not unconditionally)`, () => {
      const routeIndex = SOURCE.indexOf(marker);
      // Look at the next occurrence of the response-shaping pattern
      // after the notification try/catch — every endpoint follows
      // "if (!notificationLogged) response.notificationLogged = false;"
      // immediately before res.json(response).
      const callIndex = SOURCE.indexOf('await writeNotification({', routeIndex);
      const nextRouteIndex = SOURCE.indexOf('expressApp.post(', callIndex + 1);
      const searchEnd = nextRouteIndex === -1 ? SOURCE.length : nextRouteIndex;
      const tail = SOURCE.slice(callIndex, searchEnd);
      assert.match(
        tail,
        /if \(!notificationLogged\) response\.notificationLogged = false;/,
        `${name}: expected the conditional notificationLogged flag on the response, matching the existing auditLogged pattern`,
      );
    });
  }
});
