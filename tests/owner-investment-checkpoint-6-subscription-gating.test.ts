// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10 (Revision 3), Item 3 — CHECKPOINT 6 (Subscription/Trial
// Gating, Product Architect Decision OI-PA-2,
// business-worth-evolution-implementation-plan.md).
//
// SCOPE: proves the `ownerInvestments` create rule now enforces
// Module #19 Phase 2's existing Restricted-Operations Enforcement
// (Business Rule 6 / Decision 2) via `subscriptionAllowsNewRecords`,
// the SAME mechanism already governing `expenses`/`withdrawals` — no
// new entitlement system.
//
// A deliberate, precise finding from this checkpoint's own inspection
// step: unlike closed-period enforcement (OI-PA-1), which has a
// genuine function-level check inside `addWithdrawal`/`addExpense`
// themselves, subscription gating's CLIENT-side half lives entirely in
// the UI component layer (`AddWithdrawalView.tsx`/`AddExpenseView.tsx`
// each destructure `subscriptionBlocksNewRecords` from `useApp()` and
// conditionally render `<SubscriptionBlockedNotice />` instead of the
// form) — neither `addWithdrawal` nor `addExpense` itself contains a
// subscription check. Since Owner Investment has no UI entry point yet
// (OI-PA-3, not yet implemented), there is currently nothing to wire a
// client-side gate INTO — this is a structural consequence of where
// the gate lives, not a gap in this checkpoint. The tests below prove
// `addOwnerInvestment` correctly has NO client-level check (matching
// its structural precedent exactly), and that the server-side
// `firestore.rules` half — the authoritative one — is fully in place.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-6-subscription-gating.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const rulesSrc = src('firestore.rules');
const planSrc = src('docs/engineering/business-worth-evolution-implementation-plan.md');
const addWithdrawalViewSrc = src('apps/tenant/src/components/AddWithdrawalView.tsx');
const addExpenseViewSrc = src('apps/tenant/src/components/AddExpenseView.tsx');

function extractFunctionBody(sourceText: string, signatureMarker: string): string {
  const start = sourceText.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = sourceText.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

const addOwnerInvestmentBody = extractFunctionBody(appContextSrc, 'const addOwnerInvestment = async (');
const addWithdrawalBody = extractFunctionBody(appContextSrc, 'const addWithdrawal = async (');
const addExpenseBody = extractFunctionBody(appContextSrc, 'const addExpense = async (');

describe('Inspection finding: Withdrawal/Expense\'s subscription gate lives in the UI layer, not inside the write function', () => {
  it('addWithdrawal itself has no subscriptionAllowsNewRecords/subscriptionBlocksNewRecords check', () => {
    assert.doesNotMatch(addWithdrawalBody, /subscriptionAllowsNewRecords|subscriptionBlocksNewRecords/);
  });

  it('addExpense itself has no subscriptionAllowsNewRecords/subscriptionBlocksNewRecords check', () => {
    assert.doesNotMatch(addExpenseBody, /subscriptionAllowsNewRecords|subscriptionBlocksNewRecords/);
  });

  it('AddWithdrawalView.tsx is where the client-side gate actually lives — destructures subscriptionBlocksNewRecords and renders SubscriptionBlockedNotice', () => {
    assert.match(addWithdrawalViewSrc, /subscriptionBlocksNewRecords/);
    assert.match(addWithdrawalViewSrc, /if \(subscriptionBlocksNewRecords\) \{\s*return <SubscriptionBlockedNotice \/>;/);
  });

  it('AddExpenseView.tsx uses the identical UI-layer pattern', () => {
    assert.match(addExpenseViewSrc, /subscriptionBlocksNewRecords/);
    assert.match(addExpenseViewSrc, /if \(subscriptionBlocksNewRecords\) \{\s*return <SubscriptionBlockedNotice \/>;/);
  });
});

describe('addOwnerInvestment — correctly has NO client-level subscription check, matching its structural precedent exactly', () => {
  it('no subscriptionAllowsNewRecords/subscriptionBlocksNewRecords reference in the function body — this is by design, not an omission', () => {
    assert.doesNotMatch(addOwnerInvestmentBody, /subscriptionAllowsNewRecords|subscriptionBlocksNewRecords/);
  });

  it('the closed-period check (OI-PA-1) remains present and unaffected by this checkpoint — regression', () => {
    assert.match(addOwnerInvestmentBody, /const conflict = findClosedPeriodConflict\(date\);/);
  });
});

describe('firestore.rules — ownerInvestments create rule now enforces subscriptionAllowsNewRecords (the authoritative half)', () => {
  const ruleStart = rulesSrc.indexOf('match /ownerInvestments/{investmentId} {');
  const ruleEnd = rulesSrc.indexOf('\n      }', ruleStart);
  const ruleBody = rulesSrc.slice(ruleStart, ruleEnd);

  it('calls the SAME subscriptionAllowsNewRecords function expenses/withdrawals already use — not a new entitlement system', () => {
    assert.match(ruleBody, /subscriptionAllowsNewRecords\(businessId\)/);
  });

  it('subscriptionAllowsNewRecords is the exact same top-level function referenced by expenses and withdrawals (single implementation, no duplicate)', () => {
    const fnStart = rulesSrc.indexOf('function subscriptionAllowsNewRecords(businessId) {');
    assert.notEqual(fnStart, -1);
    const occurrences = (rulesSrc.match(/function subscriptionAllowsNewRecords\(/g) ?? []).length;
    assert.equal(occurrences, 1, 'There must be exactly one implementation of subscriptionAllowsNewRecords in the whole rules file.');
  });

  it('closed-period enforcement (OI-PA-1) remains present — regression, both checkpoints coexist', () => {
    assert.match(ruleBody, /!isDateInsideClosedPeriod\(businessId, request\.resource\.data\.date\)/);
  });

  it('every other existing create-rule check remains intact — regression, only one line was added', () => {
    assert.match(ruleBody, /request\.resource\.data\.get\('businessId', null\) == businessId/);
    assert.match(ruleBody, /request\.resource\.data\.get\('id', null\) == investmentId/);
    assert.match(ruleBody, /request\.resource\.data\.get\('amount', null\) is number/);
    assert.match(ruleBody, /request\.resource\.data\.get\('amount', 0\) > 0/);
    assert.match(ruleBody, /request\.resource\.data\.get\('createdBy', null\) == request\.auth\.uid/);
    assert.match(ruleBody, /allow update, delete: if false;/);
  });

  it('read rule is unchanged — subscription gating applies to create only, matching every other restricted collection', () => {
    assert.match(ruleBody, /allow read: if isOwnerOf\(businessId\);/);
  });
});

describe('Governance — the "Module #19 Phase 2" master enumeration in tests/firestore-rules.test.ts now names ownerInvestments as the seventh restricted collection', () => {
  it('the master describe block\'s own comment and assertions include ownerInvestments', () => {
    const masterTestSrc = src('tests/firestore-rules.test.ts');
    assert.match(masterTestSrc, /ownerInvestments \(the last added by\s*\n\s*\/\/ Product Architect Decision OI-PA-2/);
    const trialActiveStart = masterTestSrc.indexOf("it('While trial_active, every restricted collection still accepts new records'");
    const trialActiveEnd = masterTestSrc.indexOf('});', trialActiveStart);
    assert.match(masterTestSrc.slice(trialActiveStart, trialActiveEnd), /ownerInvestments/);
  });
});

describe('Governance consistency — OI-PA-2 was already recorded and covers exactly this implementation', () => {
  it('Implementation Plan records OI-PA-2 naming both subscriptionAllowsNewRecords and subscriptionBlocksNewRecords', () => {
    assert.match(planSrc, /### OI-PA-2 — Subscription\/Trial Entitlement/);
    const start = planSrc.indexOf('### OI-PA-2 — Subscription/Trial Entitlement');
    const end = planSrc.indexOf('\n\n###', start);
    const body = planSrc.slice(start, end);
    assert.match(body, /subscriptionAllowsNewRecords/);
    assert.match(body, /subscriptionBlocksNewRecords/);
  });
});

describe('Scope discipline — no unauthorized coupling', () => {
  it('no CAIXER, Startup Investment, or Levantamento code was touched by this checkpoint', () => {
    assert.doesNotMatch(addOwnerInvestmentBody.replace(/\/\/.*$/gm, ''), /caixer|startupInvestment/i);
  });

  it('the Owner Investment entry point (OI-PA-3) remains unimplemented — no UI component references addOwnerInvestment', () => {
    // Mirrors the full-feature audit's own established finding — this
    // checkpoint does not change it, and this test guards against a
    // future checkpoint accidentally believing OI-PA-3 was silently
    // included here.
    const components = ['AddWithdrawalView', 'AddExpenseView'].map((n) => src(`apps/tenant/src/components/${n}.tsx`));
    for (const c of components) {
      assert.doesNotMatch(c, /addOwnerInvestment/);
    }
  });
});
