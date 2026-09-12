// Owner Investment / Capital Added — Implementation Authorization §45
// (OI-PA-3, OI-PA-4, AC-OI-UI-1) — CHECKPOINT 7 (UI Entry Point).
//
// SCOPE: proves the already-authorized, already-implemented (§23 item 3,
// Checkpoints 1-6) Owner Investment capability now has a working,
// Owner-facing entry point in CashFlowView.tsx, following the existing
// AddWithdrawalView.tsx/AddExpenseView.tsx structural pattern — with no
// backend, rules, economic-model, CAIXER, FR-64/FR-65, or lifetime-total
// change introduced by this checkpoint.
//
// HOW TO RUN:
//   npx tsx --test tests/owner-investment-checkpoint-7-ui-entry-point.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const componentPath = 'apps/tenant/src/components/AddOwnerInvestmentView.tsx';
const componentAbsPath = new URL(`../${componentPath}`, import.meta.url);
const cashFlowViewSrc = src('apps/tenant/src/components/CashFlowView.tsx');
const enSrc = src('apps/tenant/src/i18n/locales/en.ts');
const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const frSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('A. AddOwnerInvestmentView.tsx exists', () => {
  it('the component file exists on disk', () => {
    assert.ok(existsSync(componentAbsPath), `${componentPath} does not exist`);
  });
});

const componentSrc = existsSync(componentAbsPath) ? src(componentPath) : '';

describe('B-K. AddOwnerInvestmentView.tsx implements the authorized §45 scope', () => {
  it('B. imports and uses the existing useApp() context', () => {
    assert.match(componentSrc, /import\s*\{[^}]*\buseApp\b[^}]*\}\s*from\s*'\.\.\/context\/AppContext'/);
    assert.match(componentSrc, /useApp\(\)/);
  });

  it('C. reads subscriptionBlocksNewRecords from context', () => {
    assert.match(componentSrc, /subscriptionBlocksNewRecords/);
  });

  it('D. renders SubscriptionBlockedNotice when blocked, mirroring AddWithdrawalView', () => {
    assert.match(componentSrc, /import\s*\{\s*SubscriptionBlockedNotice\s*\}\s*from\s*'\.\/SubscriptionBlockedNotice'/);
    assert.match(componentSrc, /if\s*\(\s*subscriptionBlocksNewRecords\s*\)\s*\{\s*\n?\s*return <SubscriptionBlockedNotice \/>;/);
  });

  it('E. calls addOwnerInvestment from context, not a new/duplicate write path', () => {
    assert.match(componentSrc, /const \{[^}]*\baddOwnerInvestment\b[^}]*\}\s*=\s*useApp\(\);/);
    assert.match(componentSrc, /await addOwnerInvestment\(\{/);
  });

  it('F. the submission includes date, amount, description, and submissionId — no more, no less', () => {
    const callStart = componentSrc.indexOf('await addOwnerInvestment({');
    assert.notEqual(callStart, -1);
    const callEnd = componentSrc.indexOf('});', callStart);
    const callBody = componentSrc.slice(callStart, callEnd);
    assert.match(callBody, /\bdate\b/);
    assert.match(callBody, /\bamount:\s*numAmount\b/);
    assert.match(callBody, /\bdescription:/);
    assert.match(callBody, /\bsubmissionId:\s*submissionIdRef\.current\b/);
  });

  it('G. no unauthorized extra fields are introduced (reason, notes, category, source, financing, equity, repayment)', () => {
    const bodyNoComments = componentSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(bodyNoComments, /\breason\b/i);
    assert.doesNotMatch(bodyNoComments, /\bnotes\b/i);
    assert.doesNotMatch(bodyNoComments, /\bcategory\b/i);
    assert.doesNotMatch(bodyNoComments, /financ(e|ing)/i);
    assert.doesNotMatch(bodyNoComments, /\bequity\b/i);
    assert.doesNotMatch(bodyNoComments, /repayment/i);
  });

  it('H. sanitizeDecimalInput is used for the amount input, matching AddWithdrawalView', () => {
    assert.match(componentSrc, /import\s*\{\s*sanitizeDecimalInput\s*\}\s*from\s*'\.\.\/lib\/decimalInputSanitizer'/);
    assert.match(componentSrc, /setAmount\(sanitizeDecimalInput\(e\.target\.value\)\)/);
  });

  it('I. submissionId is generated via useRef and regenerated only after a successful submission (existing idempotency pattern)', () => {
    assert.match(componentSrc, /const submissionIdRef = useRef\(newSubmissionId\('oi'\)\);/);
    // The regenerating assignment must occur after the addOwnerInvestment
    // call and before the success message is set — i.e. only on the
    // success path, not in the catch/failure branch.
    const tryStart = componentSrc.indexOf('try {');
    const catchStart = componentSrc.indexOf('} catch');
    const tryBody = componentSrc.slice(tryStart, catchStart);
    assert.match(tryBody, /submissionIdRef\.current = newSubmissionId\('oi'\);/);
    const catchBody = componentSrc.slice(catchStart, componentSrc.indexOf('finally', catchStart));
    assert.doesNotMatch(catchBody, /submissionIdRef\.current = newSubmissionId/);
  });

  it('J. the async submission is awaited and wrapped in try/catch (load-bearing for closed-period rejection)', () => {
    assert.match(componentSrc, /try\s*\{[\s\S]*await addOwnerInvestment\(\{[\s\S]*\}\s*catch\s*\(err: any\)\s*\{/);
  });

  it('K. onComplete is only called after a successful submission, inside the try block\'s setTimeout, never in catch', () => {
    const tryStart = componentSrc.indexOf('try {');
    const catchStart = componentSrc.indexOf('} catch');
    const tryBody = componentSrc.slice(tryStart, catchStart);
    const catchBody = componentSrc.slice(catchStart, componentSrc.indexOf('finally', catchStart));
    assert.match(tryBody, /setTimeout\(\(\) => \{\s*\n\s*onComplete\(\);/);
    assert.doesNotMatch(catchBody, /onComplete\(\)/);
  });

  it('never shows the success state before the write resolves (setSubmittedMessage only follows the awaited call)', () => {
    const callIdx = componentSrc.indexOf('await addOwnerInvestment({');
    const successIdx = componentSrc.indexOf('setSubmittedMessage(');
    assert.ok(callIdx !== -1 && successIdx !== -1 && callIdx < successIdx);
  });
});

describe('L. CashFlowView.tsx integrates the Owner Investment section', () => {
  it('declares a showAddOwnerInvestment state flag', () => {
    assert.match(cashFlowViewSrc, /const \[showAddOwnerInvestment, setShowAddOwnerInvestment\] = useState\(false\);/);
  });

  it('imports AddOwnerInvestmentView', () => {
    assert.match(cashFlowViewSrc, /import\s*\{\s*AddOwnerInvestmentView\s*\}\s*from\s*'\.\/AddOwnerInvestmentView'/);
  });

  it('positions the Owner Investment section immediately after the Withdrawals section', () => {
    const withdrawalIdx = cashFlowViewSrc.indexOf('<AddWithdrawalView onComplete={() => setShowAddWithdrawal(false)} />');
    const investmentIdx = cashFlowViewSrc.indexOf('ownerInvestmentSection.title');
    assert.notEqual(withdrawalIdx, -1);
    assert.notEqual(investmentIdx, -1);
    assert.ok(withdrawalIdx < investmentIdx, 'Owner Investment section must appear after the Withdrawals block');
  });

  it('has open/close toggle behavior matching the Expenses/Withdrawals pattern', () => {
    assert.match(cashFlowViewSrc, /onClick=\{\(\) => setShowAddOwnerInvestment\(true\)\}/);
    assert.match(cashFlowViewSrc, /onClick=\{\(\) => setShowAddOwnerInvestment\(false\)\}/);
  });

  it('embeds AddOwnerInvestmentView with onComplete collapsing the section', () => {
    assert.match(cashFlowViewSrc, /<AddOwnerInvestmentView onComplete=\{\(\) => setShowAddOwnerInvestment\(false\)\} \/>/);
  });
});

describe('M. i18n keys exist in en/pt/fr', () => {
  const requiredFormKeys = [
    'title', 'subtitle', 'registeredTitle', 'successMessage', 'dateLabel',
    'amountLabel', 'descriptionLabel', 'descriptionPlaceholder', 'submitButton',
  ];
  const requiredSectionKeys = ['title', 'subtitle', 'addButton'];

  for (const [label, fileSrc] of [['en', enSrc], ['pt', ptSrc], ['fr', frSrc]] as const) {
    it(`${label}.ts declares addOwnerInvestment.* with all required form keys`, () => {
      const start = fileSrc.indexOf('addOwnerInvestment: {');
      assert.notEqual(start, -1, `addOwnerInvestment block missing in ${label}.ts`);
      const end = fileSrc.indexOf('\n  },', start);
      const block = fileSrc.slice(start, end);
      for (const key of requiredFormKeys) {
        assert.match(block, new RegExp(`\\b${key}:`), `${label}.ts addOwnerInvestment missing "${key}"`);
      }
      assert.match(block, /errors:\s*\{\s*invalidAmount:/);
    });

    it(`${label}.ts declares cashFlow.ownerInvestmentSection.* with all required section keys`, () => {
      const start = fileSrc.indexOf('ownerInvestmentSection: {');
      assert.notEqual(start, -1, `ownerInvestmentSection block missing in ${label}.ts`);
      const end = fileSrc.indexOf('\n    },', start);
      const block = fileSrc.slice(start, end);
      for (const key of requiredSectionKeys) {
        assert.match(block, new RegExp(`\\b${key}:`), `${label}.ts ownerInvestmentSection missing "${key}"`);
      }
    });
  }

  it('pt.ts (canonical TranslationDict) declares matching type shapes for both blocks', () => {
    // [Checkpoint 8 / Implementation Authorization §46/§47, FR-82]
    // ownerInvestmentSection's type shape was extended, additively only
    // (no existing key removed or renamed), with lifetimeTotalLabel and
    // history — this assertion is updated to match that authorized
    // addition; it still asserts an exact, closed shape (no unexpected
    // further keys), just a larger one than Checkpoint 7's own original.
    assert.match(ptSrc, /ownerInvestmentSection:\s*\{\s*title:\s*string;\s*subtitle:\s*string;\s*addButton:\s*string;\s*lifetimeTotalLabel:\s*string;\s*history:\s*string;\s*\};/);
    assert.match(ptSrc, /addOwnerInvestment:\s*\{\s*title:\s*string;/);
  });
});

describe('N. No hard-coded user-facing strings in the component', () => {
  it('every user-facing label goes through t(...)', () => {
    // Every JSX text-bearing label/heading/button in the component uses
    // the t() translation function; the only literal user-facing string
    // is the placeholder "0.00" for the amount field (a numeric format
    // hint, not translatable copy) and the generic fallback alert
    // message, matching AddWithdrawalView.tsx's own identical pattern.
    const labelLines = componentSrc.match(/\{t\('addOwnerInvestment\.[a-zA-Z]+'/g) ?? [];
    assert.ok(labelLines.length >= 6, 'Expected at least 6 distinct addOwnerInvestment.* t() calls');
  });
});

describe('O. Existing Expenses/Withdrawals blocks remain structurally intact', () => {
  it('AddExpenseView and AddWithdrawalView embeds are unchanged', () => {
    assert.match(cashFlowViewSrc, /<AddExpenseView onComplete=\{\(\) => setShowAddExpense\(false\)\} \/>/);
    assert.match(cashFlowViewSrc, /<AddWithdrawalView onComplete=\{\(\) => setShowAddWithdrawal\(false\)\} \/>/);
    assert.match(cashFlowViewSrc, /const \[showAddExpense, setShowAddExpense\] = useState\(false\);/);
    assert.match(cashFlowViewSrc, /const \[showAddWithdrawal, setShowAddWithdrawal\] = useState\(false\);/);
  });
});

describe('Scope discipline — no unauthorized coupling', () => {
  it('the component does not reference CAIXER, FR-64/FR-65 internals, Startup Investment, or Levantamento', () => {
    const bodyNoComments = componentSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(bodyNoComments, /caixer/i);
    assert.doesNotMatch(bodyNoComments, /startupInvestment/i);
    assert.doesNotMatch(bodyNoComments, /levantamento/i);
  });

  it('addOwnerInvestment\'s own backend implementation (AppContext.tsx) is unmodified in shape — still the Checkpoint-6 signature', () => {
    const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
    assert.match(appContextSrc, /const addOwnerInvestment = async \(\{ date, amount, description, submissionId \}: AddOwnerInvestmentParams\) => \{/);
  });

  it('firestore.rules is not referenced or duplicated by the UI component', () => {
    assert.doesNotMatch(componentSrc, /firestore\.rules|isDateInsideClosedPeriod|findClosedPeriodConflict/);
  });
});
