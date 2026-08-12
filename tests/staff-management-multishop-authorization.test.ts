// Fix #6 — Multi-Shop Staff Management Authorization.
//
// WHY STATIC/STRUCTURAL, NOT RUNTIME: same constraint already documented
// in tests/staff-notifications.test.ts's header — server/index.ts
// performs Firebase Admin initialization and expressApp.listen() as
// *import-time* side effects, there is no dependency-injection seam for
// `db` already established in this repo, and this sandbox has no
// Firestore emulator / live Firebase credentials to exercise the five
// staff endpoints end-to-end. This suite reads server/index.ts as
// source text and asserts the exact authorization logic shape is
// present — real verification of what's actually committed, not a
// substitute for an end-to-end run against a live (or emulated)
// Firestore + Firebase Auth, which remains outstanding for this
// endpoint family generally (see staff-notifications.test.ts).
//
// SCOPE: verifyStaffManagementAction() previously gated Owner/Admin
// access with `requesterProfile.businessId === businessId` alone — the
// legacy singular field, which only ever points at an Owner's FIRST
// shop (addShop, server/index.ts, only ever appends to `businessIds[]`;
// it never updates the legacy `businessId`). This meant a legitimate
// multi-shop Owner got 403'd managing staff on any shop after their
// first. Fix #6 re-derives the Owner's full owned-shop list the same
// way /api/provisioning/business (addShop) and
// /api/subscriptions/activate-trial already correctly do, and checks
// membership against that list instead.
//
// This suite proves, from source, that:
//   1. The Owner/Admin branch (isAdmin) now checks membership against a
//      server-re-derived ownedBusinessIds list (businessIds[], falling
//      back to the legacy singular businessId) — not the legacy field
//      alone.
//   2. That derivation is structurally the same pattern already used
//      (and already trusted) in addShop and activate-trial — never
//      trusting a client-supplied businessIds/ownership claim.
//   3. The Manager branch (isGrantedManager) is UNCHANGED — still
//      scoped to the requester's own legacy `businessId` only, since a
//      Manager is always single-shop (BDS #16) and must never gain
//      reach into a business merely because the Owner-facing check
//      above now consults businessIds[].
//   4. adminOnly gating (set-tier, reset-pin) and the target-tier
//      "Manager can never manage another Manager/the Admin" guard are
//      both untouched by this fix.
//   5. All five staff endpoints still route through the single shared
//      verifyStaffManagementAction() — the fix is centralized, not
//      duplicated per-endpoint.
//
// HOW TO RUN:
//   npx tsx --test tests/staff-management-multishop-authorization.test.ts

import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

const SOURCE = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');

// Isolate verifyStaffManagementAction()'s own body so assertions below
// can't accidentally match unrelated code elsewhere in the file (e.g.
// the addShop/activate-trial derivations this fix is modeled on).
function extractFunctionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.ok(start !== -1, `Expected to find "${signature}" in server/index.ts`);
  // The function body's opening brace is the LAST "{" before the first
  // statement of the body — not simply the first "{" after the
  // signature, which would instead match either the destructured
  // `options: { adminOnly?: boolean } = {}` parameter type or the
  // `Promise<{ status: ...; body: {...} } | null>` return-type object
  // literal. Anchor on "| null> {" instead, which appears exactly once
  // per function of this shape and is immediately followed by the real
  // body.
  const bodyMarker = '| null> {';
  const bodyMarkerIndex = source.indexOf(bodyMarker, start);
  assert.ok(bodyMarkerIndex !== -1, `Expected "${bodyMarker}" after "${signature}"`);
  const braceStart = bodyMarkerIndex + bodyMarker.length - 1;
  assert.equal(source[braceStart], '{', 'Computed brace position did not land on "{"');
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  assert.ok(depth === 0, `Never found the matching closing brace for "${signature}"`);
  return source.slice(braceStart, i + 1);
}

const VERIFY_FN_BODY = extractFunctionBody(SOURCE, 'async function verifyStaffManagementAction(');

describe('Fix #6 — verifyStaffManagementAction() multi-shop Owner authorization', () => {
  it('derives an ownedBusinessIds list inside the function, falling back from businessIds[] to the legacy singular businessId', () => {
    assert.match(
      VERIFY_FN_BODY,
      /const ownedBusinessIds:\s*string\[\]\s*=\s*\n?\s*Array\.isArray\(requesterProfile\.businessIds\)\s*&&\s*requesterProfile\.businessIds\.length > 0\s*\n?\s*\?\s*requesterProfile\.businessIds\s*\n?\s*:\s*requesterProfile\.businessId\s*\n?\s*\?\s*\[requesterProfile\.businessId\]\s*\n?\s*:\s*\[\]/,
      'verifyStaffManagementAction should derive ownedBusinessIds the same way addShop/activate-trial do — businessIds[] first, falling back to [businessId], falling back to [].'
    );
  });

  it('checks the Owner/Admin branch (isAdmin) against ownedBusinessIds.includes(businessId), not the legacy field alone', () => {
    assert.match(
      VERIFY_FN_BODY,
      /const isAdmin =\s*\n?\s*\(requesterProfile\.role === 'owner' \|\| requesterProfile\.role === 'admin'\)\s*&&\s*\n?\s*ownedBusinessIds\.includes\(businessId\);/,
      'isAdmin should check membership via ownedBusinessIds.includes(businessId).'
    );
  });

  it('does NOT gate isAdmin on requesterProfile.businessId === businessId alone (the pre-Fix-#6 bug)', () => {
    // The old, insufficient check must not be the sole/first condition
    // feeding isAdmin any more. (isGrantedManager below legitimately
    // keeps this exact clause — this assertion is scoped to isAdmin's
    // own definition, extracted separately.)
    const isAdminDefMatch = VERIFY_FN_BODY.match(/const isAdmin =[\s\S]*?;/);
    assert.ok(isAdminDefMatch, 'Expected to find the isAdmin const definition');
    assert.doesNotMatch(
      isAdminDefMatch![0],
      /requesterProfile\.businessId === businessId/,
      'isAdmin must no longer be gated by the legacy singular businessId field — that was the multi-shop bug this fix corrects.'
    );
  });

  it('leaves the Manager branch (isGrantedManager) scoped to the legacy singular businessId — unchanged, still single-shop', () => {
    const isManagerDefMatch = VERIFY_FN_BODY.match(/const isGrantedManager =[\s\S]*?;/);
    assert.ok(isManagerDefMatch, 'Expected to find the isGrantedManager const definition');
    assert.match(
      isManagerDefMatch![0],
      /requesterProfile\.businessId === businessId/,
      'isGrantedManager should still check the legacy singular businessId — a Manager is always single-shop (BDS #16) and must not gain reach via ownedBusinessIds.'
    );
    assert.doesNotMatch(
      isManagerDefMatch![0],
      /ownedBusinessIds/,
      'isGrantedManager must NOT be widened to ownedBusinessIds — that would let a Manager reach into any business the Owner happens to own, which this fix explicitly must not introduce.'
    );
  });

  it('preserves the adminOnly gate on isGrantedManager (set-tier, reset-pin stay Admin-only where already Admin-only)', () => {
    assert.match(
      VERIFY_FN_BODY,
      /!options\.adminOnly\s*&&\s*\n?\s*requesterProfile\.role === 'staff'/,
      'isGrantedManager should still be short-circuited by !options.adminOnly, unchanged from before this fix.'
    );
  });

  it('preserves the target-tier guard: a granted Manager can never manage another Manager or the Admin', () => {
    assert.match(
      VERIFY_FN_BODY,
      /if \(isGrantedManager && staffProfile\?\.staffTier === 'manager'\)/,
      'The existing "Manager cannot manage another Manager" guard must remain intact and untouched by this fix.'
    );
  });

  it('preserves the belongsToBusiness check that the target staff member is actually in the requested business', () => {
    assert.match(
      VERIFY_FN_BODY,
      /const belongsToBusiness =/,
      'The target-membership verification must remain intact — this fix only changes which businesses the REQUESTER is considered a member of, never relaxes verification of the TARGET.'
    );
  });
});

describe('Fix #6 — all five staff endpoints remain routed through the single shared authorization function', () => {
  it('has exactly five verifyStaffManagementAction() call sites (delete, suspend, reactivate, reset-pin, set-tier)', () => {
    const matches = SOURCE.match(/await verifyStaffManagementAction\(/g) || [];
    assert.equal(
      matches.length,
      5,
      'Expected exactly five call sites — one per staff-management endpoint. A different count means the fix was duplicated per-endpoint instead of centralized, or an endpoint was missed.'
    );
  });

  it('reset-pin and set-tier still pass { adminOnly: true }, unchanged', () => {
    const matches = SOURCE.match(/await verifyStaffManagementAction\([^)]*\{\s*adminOnly:\s*true\s*\}\)/g) || [];
    assert.equal(
      matches.length,
      2,
      'Expected exactly two adminOnly: true call sites (reset-pin, set-tier) — this fix must not add or remove adminOnly gating anywhere.'
    );
  });
});

describe('Fix #6 — ownedBusinessIds derivation matches the existing trusted pattern (addShop, activate-trial)', () => {
  it('the same Array.isArray(...businessIds)... fallback shape already used in addShop is not reinvented differently here', () => {
    const occurrences = SOURCE.match(/Array\.isArray\(requesterProfile\.businessIds\) && requesterProfile\.businessIds\.length > 0/g) || [];
    // Four sites total: addShop (provisioning/business), activate-trial,
    // verifyStaffManagementAction (Fix #6), and now the Smart Stock
    // Entry extraction route's own membership check — each re-reads the
    // requester's own server-fetched Firestore profile and is never
    // trusted from the client, in all four.
    assert.equal(
      occurrences.length,
      4,
      'Expected this exact derivation guard in four places: addShop, activate-trial, verifyStaffManagementAction, and the Smart Stock Entry extraction route.'
    );
  });
});
