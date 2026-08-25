// [Data-entry error-resilience audit] Covers all four findings from
// the investigation and their fixes:
//
// Finding 1 — DebtsView.tsx's PaymentForm declared a stable
// submissionIdRef but never passed it to onSubmit, generating a fresh
// id on every call instead — silently defeating recordReceivablePayment/
// recordPayablePayment's own transaction-based idempotency check and
// creating a real double-payment risk on retry.
//
// Finding 2 — addExpense/addWithdrawal/addQuebra/addStartupInvestmentEntry
// had no duplicate-submission protection at all (a fresh random id
// every call, no "already exists" check) — extended the same
// submissionId + deterministic-doc-id + idempotent-no-op pattern
// already proven in recordStockCount/recordReceivablePayment.
//
// Finding 3 — AddExpenseView/AddWithdrawalView/AddQuebraView/DebtsView
// had no draft recovery and no warning before an accidental tab close
// mid-entry — added useUnsavedChangesWarning, a lightweight
// beforeunload-based warning (not full draft persistence, which would
// be disproportionate for these 4-6 field forms).
//
// Finding 4 — firestore.rules had no server-side amount/quantityLost
// validation for quebras/expenses/withdrawals, unlike newer
// collections (Cash Position, Startup Investment) — added matching
// `is number` / `> 0` checks.
//
// SCOPE: this repository has no DOM/React render harness or Firestore
// emulator in this environment — established precedent (see
// tests/business-worth-cash-receivables-payables-wiring.test.ts's own
// header). This suite follows the same source-inspection technique.
//
// HOW TO RUN:
//   npx tsx --test tests/data-entry-error-resilience-audit.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const rulesSrc = src('firestore.rules');
const debtsViewSrc = src('apps/tenant/src/components/DebtsView.tsx');
const addExpenseSrc = src('apps/tenant/src/components/AddExpenseView.tsx');
const addWithdrawalSrc = src('apps/tenant/src/components/AddWithdrawalView.tsx');
const addQuebraSrc = src('apps/tenant/src/components/AddQuebraView.tsx');
const startupInvestmentSrc = src('apps/tenant/src/components/StartupInvestmentView.tsx');
const hookSrc = src('apps/tenant/src/hooks/useUnsavedChangesWarning.ts');

function extractFunctionBody(source: string, signatureMarker: string): string {
  const start = source.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = source.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

describe('Finding 1 — DebtsView.tsx payment idempotency actually wired in', () => {
  it('PaymentForm.onSubmit signature accepts a submissionId parameter', () => {
    assert.match(debtsViewSrc, /onSubmit: \(amount: number, date: string, submissionId: string\) => Promise/);
  });

  it('handleSubmit passes submissionIdRef.current, never a freshly generated id, to onSubmit', () => {
    const start = debtsViewSrc.indexOf('const handleSubmit = async (e: React.FormEvent) => {');
    const end = debtsViewSrc.indexOf('\n  return (', start);
    const body = debtsViewSrc.slice(start, end);
    assert.match(body, /onSubmit\(numAmount, date, submissionIdRef\.current\)/);
    assert.doesNotMatch(body, /onSubmit\(numAmount, date, newSubmissionId\(/);
  });

  it('the dead "void submissionIdRef" statement is gone — the ref is actually consumed now', () => {
    assert.doesNotMatch(debtsViewSrc, /void submissionIdRef;/);
  });

  it('both payment call sites (receivable, payable) forward the id received from PaymentForm — neither generates its own', () => {
    const receivableCallIdx = debtsViewSrc.indexOf('recordReceivablePayment({');
    const receivableCall = debtsViewSrc.slice(receivableCallIdx, receivableCallIdx + 200);
    assert.match(receivableCall, /submissionId,/);
    assert.doesNotMatch(receivableCall, /submissionId: newSubmissionId\(/);

    const payableCallIdx = debtsViewSrc.indexOf('recordPayablePayment({');
    const payableCall = debtsViewSrc.slice(payableCallIdx, payableCallIdx + 200);
    assert.match(payableCall, /submissionId,/);
    assert.doesNotMatch(payableCall, /submissionId: newSubmissionId\(/);
  });
});

describe('Finding 2 — idempotency extended to Expenses/Withdrawals/Quebras/Startup Investment', () => {
  const cases: Array<{ label: string; fnMarker: string; idPrefix: string; collection: string; typeAssertion: string }> = [
    { label: 'addExpense', fnMarker: 'const addExpense = async (', idPrefix: 'exp-', collection: 'expenses', typeAssertion: 'as Expense' },
    { label: 'addWithdrawal', fnMarker: 'const addWithdrawal = async (', idPrefix: 'wd-', collection: 'withdrawals', typeAssertion: 'as Withdrawal' },
    { label: 'addQuebra', fnMarker: 'const addQuebra = async (', idPrefix: 'quebra-', collection: 'quebras', typeAssertion: 'as Quebra' },
  ];

  for (const { label, fnMarker, idPrefix, collection, typeAssertion } of cases) {
    it(`${label} accepts an optional submissionId, falls back to a random id, checks for an existing doc, and returns it unchanged on a retry`, () => {
      const body = extractFunctionBody(appContextSrc, fnMarker);
      assert.match(body, new RegExp(`submissionId \\|\\| '${idPrefix}'`));
      assert.match(body, new RegExp(`doc\\(db, 'businesses', businessId, '${collection}', \\w+\\)`));
      assert.match(body, /const existingSnap = await getDoc\(/);
      assert.match(body, /if \(existingSnap\.exists\(\)\) \{/);
      assert.match(body, new RegExp(`return existingSnap\\.data\\(\\) ${typeAssertion.replace(/\s/g, '\\s')}`));
    });
  }

  it('addStartupInvestmentEntry accepts an optional submissionId, checks for an existing doc, and idempotently no-ops on a retry', () => {
    const body = extractFunctionBody(appContextSrc, 'const addStartupInvestmentEntry = async (');
    assert.match(body, /submissionId \|\| 'startup-investment-'/);
    assert.match(body, /const existingSnap = await getDoc\(/);
    assert.match(body, /if \(existingSnap\.exists\(\)\) \{\s*return \{ entryId \};/);
  });

  it('getDoc is imported exactly once — no duplicate import introduced', () => {
    const importCount = (appContextSrc.match(/^\s*getDoc,\s*$/gm) || []).length;
    assert.equal(importCount, 1);
  });

  it('StartupInvestmentView.tsx now actually passes submissionIdRef.current — closing the gap where the ref existed but was never consumed', () => {
    assert.match(startupInvestmentSrc, /submissionId: submissionIdRef\.current,/);
  });

  for (const { label, view, prefix } of [
    { label: 'AddExpenseView', view: addExpenseSrc, prefix: 'exp' },
    { label: 'AddWithdrawalView', view: addWithdrawalSrc, prefix: 'wd' },
    { label: 'AddQuebraView', view: addQuebraSrc, prefix: 'quebra' },
  ]) {
    it(`${label} declares a stable submissionIdRef, passes it on submit, and rotates it only after success`, () => {
      assert.match(view, new RegExp(`const submissionIdRef = useRef\\(newSubmissionId\\('${prefix}'\\)\\);`));
      assert.match(view, /submissionId: submissionIdRef\.current,/);
      assert.match(view, new RegExp(`submissionIdRef\\.current = newSubmissionId\\('${prefix}'\\);`));
    });
  }
});

describe('Finding 3 — unsaved-changes warning added to the four previously-unprotected screens', () => {
  it('the hook itself only warns while hasUnsavedInput is true, using the native beforeunload dialog', () => {
    assert.match(hookSrc, /export function useUnsavedChangesWarning\(hasUnsavedInput: boolean\): void/);
    assert.match(hookSrc, /if \(!hasUnsavedInput\) return;/);
    assert.match(hookSrc, /window\.addEventListener\('beforeunload', handleBeforeUnload\)/);
  });

  for (const { label, view } of [
    { label: 'AddExpenseView', view: addExpenseSrc },
    { label: 'AddWithdrawalView', view: addWithdrawalSrc },
    { label: 'AddQuebraView', view: addQuebraSrc },
    { label: 'DebtsView', view: debtsViewSrc },
  ]) {
    it(`${label} imports and calls useUnsavedChangesWarning`, () => {
      assert.match(view, /import \{ useUnsavedChangesWarning \} from '..\/hooks\/useUnsavedChangesWarning';/);
      assert.match(view, /useUnsavedChangesWarning\(/);
    });
  }

  it('DebtsView\'s PaymentForm also warns while a payment amount is being typed, not just the three quick-add forms', () => {
    const start = debtsViewSrc.indexOf('const PaymentForm: React.FC<{');
    const end = debtsViewSrc.indexOf('\n  return (', start);
    const body = debtsViewSrc.slice(start, end);
    assert.match(body, /useUnsavedChangesWarning\(amount\.trim\(\) !== ''\)/);
  });
});

describe('Finding 4 — server-side amount/quantityLost validation added to firestore.rules', () => {
  it('quebras create requires quantityLost to be a positive number', () => {
    const start = rulesSrc.indexOf('match /quebras/{quebraId} {');
    const end = rulesSrc.indexOf('\n      }', start);
    const block = rulesSrc.slice(start, end);
    assert.match(block, /request\.resource\.data\.get\('quantityLost', null\) is number/);
    assert.match(block, /request\.resource\.data\.get\('quantityLost', 0\) > 0/);
  });

  it('expenses create requires amount to be a positive number', () => {
    const start = rulesSrc.indexOf('match /expenses/{expenseId} {');
    const end = rulesSrc.indexOf('\n      }', start);
    const block = rulesSrc.slice(start, end);
    assert.match(block, /request\.resource\.data\.get\('amount', null\) is number/);
    assert.match(block, /request\.resource\.data\.get\('amount', 0\) > 0/);
  });

  it('withdrawals create requires amount to be a positive number', () => {
    const start = rulesSrc.indexOf('match /withdrawals/{withdrawalId} {');
    const end = rulesSrc.indexOf('\n      }', start);
    const block = rulesSrc.slice(start, end);
    assert.match(block, /request\.resource\.data\.get\('amount', null\) is number/);
    assert.match(block, /request\.resource\.data\.get\('amount', 0\) > 0/);
  });

  it('none of the three added validations touch the existing subscription/closed-period/ownership checks already in place', () => {
    const start = rulesSrc.indexOf('match /expenses/{expenseId} {');
    const end = rulesSrc.indexOf('\n      }', start);
    const block = rulesSrc.slice(start, end);
    assert.match(block, /subscriptionAllowsNewRecords\(businessId\)/);
    assert.match(block, /isDateInsideClosedPeriod\(businessId, request\.resource\.data\.date\)/);
  });
});
