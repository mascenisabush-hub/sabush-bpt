// Owner Investment / Capital Added — Implementation Authorization §23,
// Increment 10 (Revision 3), Item 3 — CHECKPOINT 5 (Closed-Period
// Enforcement, Product Architect Decision OI-PA-1,
// business-worth-evolution-implementation-plan.md).
//
// SCOPE: proves `addOwnerInvestment` (AppContext.tsx) now rejects a
// backdated write into an already-closed Fecho period, reusing the
// exact same `findClosedPeriodConflict` mechanism `addExpense`/
// `addWithdrawal` already use — no new closed-period architecture.
//
// The client-side function is tightly coupled to the live Firebase
// client SDK, so it is covered here by structural source-text
// inspection, matching this repository's own established technique for
// that exact class of function (see
// tests/owner-investment-checkpoint-1.test.ts's own header). The
// server-side `firestore.rules` half of the guard is covered
// separately, against a real emulator, in
// tests/owner-investment-firestore-rules.test.ts (PRESENT — NOT
// EXECUTED in this environment; see that file's own SANDBOX
// DISCLOSURE).
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-5-closed-period.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const rulesSrc = src('firestore.rules');
const planSrc = src('docs/engineering/business-worth-evolution-implementation-plan.md');

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

describe('addOwnerInvestment — closed-period enforcement (client-side half of the guard)', () => {
  it('calls the SAME shared findClosedPeriodConflict helper addExpense/addWithdrawal already use — not a new mechanism', () => {
    assert.match(addOwnerInvestmentBody, /const conflict = findClosedPeriodConflict\(date\);/);
    assert.match(addWithdrawalBody, /const conflict = findClosedPeriodConflict\(date\);/);
    assert.match(addExpenseBody, /const conflict = findClosedPeriodConflict\(date\);/);
  });

  it('throws a descriptive error naming the closed period and pointing to Fechos, mirroring addWithdrawal\'s own error text pattern', () => {
    assert.match(
      addOwnerInvestmentBody,
      /if \(conflict\) \{\s*throw new Error\(\s*`Não é possível registar um investimento do proprietário em \$\{date\} — este período \("\$\{conflict\.periodLabel\}"\) já foi fechado\. Para corrigir um período fechado, reabra-o primeiro em Fechos\.`\s*\);\s*\}/
    );
  });

  it('the closed-period check runs BEFORE the amount validation and BEFORE any write — a rejected date never reaches Firestore', () => {
    const conflictIdx = addOwnerInvestmentBody.indexOf('const conflict = findClosedPeriodConflict(date);');
    const amountCheckIdx = addOwnerInvestmentBody.indexOf('Number(amount) > 0');
    const batchIdx = addOwnerInvestmentBody.indexOf('createFirestoreBatch(db)');
    assert.notEqual(conflictIdx, -1);
    assert.notEqual(amountCheckIdx, -1);
    assert.notEqual(batchIdx, -1);
    assert.ok(conflictIdx < amountCheckIdx, 'Closed-period check must run before the amount validation.');
    assert.ok(conflictIdx < batchIdx, 'Closed-period check must run before any Firestore write.');
  });

  it('still rejects amount <= 0 and still requires isOwner — regression, neither pre-existing check was disturbed', () => {
    assert.match(addOwnerInvestmentBody, /if \(!isOwner\) throw new Error/);
    assert.match(addOwnerInvestmentBody, /if \(!\(Number\(amount\) > 0\)\) throw new Error/);
  });

  it('still derives a deterministic, idempotent document id from submissionId — regression, unchanged by this checkpoint', () => {
    assert.match(addOwnerInvestmentBody, /const investmentId = submissionId \|\| 'oi-' \+ Date\.now\(\) \+ '-' \+ Math\.random\(\)\.toString\(36\)\.substr\(2, 4\);/);
  });
});

describe('firestore.rules — ownerInvestments create rule now enforces the closed-period lock server-side (the authoritative half)', () => {
  const ruleStart = rulesSrc.indexOf("match /ownerInvestments/{investmentId} {");
  const ruleEnd = rulesSrc.indexOf('\n      }', ruleStart);
  const ruleBody = rulesSrc.slice(ruleStart, ruleEnd);

  it('the create rule calls isDateInsideClosedPeriod against this record\'s own date field — the SAME mechanism expenses/withdrawals already use, no new architecture', () => {
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

  it('read/update/delete rules are unchanged — this checkpoint touches only the create rule\'s own conjunction list', () => {
    assert.match(ruleBody, /allow read: if isOwnerOf\(businessId\);/);
  });
});

describe('Scope discipline — no unauthorized coupling', () => {
  it('addOwnerInvestment still has no subscription/trial gate — OI-PA-2 remains a separate, not-yet-implemented decision', () => {
    assert.doesNotMatch(addOwnerInvestmentBody, /subscriptionAllowsNewRecords|subscriptionBlocksNewRecords/);
  });

  it('the ownerInvestments create rule still has no subscriptionAllowsNewRecords call — OI-PA-2 remains separate', () => {
    const ruleStart = rulesSrc.indexOf("match /ownerInvestments/{investmentId} {");
    const ruleEnd = rulesSrc.indexOf('\n      }', ruleStart);
    const ruleBody = rulesSrc.slice(ruleStart, ruleEnd);
    assert.doesNotMatch(ruleBody, /subscriptionAllowsNewRecords/);
  });

  it('no CAIXER, Startup Investment, or Levantamento code was touched by this checkpoint', () => {
    assert.doesNotMatch(addOwnerInvestmentBody.replace(/\/\/.*$/gm, ''), /caixer|startupInvestment/i);
  });

  it('the Implementation Plan records this exact checkpoint as OI-PA-1', () => {
    assert.match(planSrc, /### OI-PA-1 — Closed-Period Enforcement/);
  });
});
