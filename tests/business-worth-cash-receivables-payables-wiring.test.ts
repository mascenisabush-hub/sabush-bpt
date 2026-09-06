// Business Worth Evolution — Implementation Authorization, Increment 3.
//
// SCOPE: source-inspection coverage of the CRUD/atomicity/idempotency/
// security surface this increment adds — AppContext.tsx's new functions
// (addReceivable, recordReceivablePayment, recordPayablePayment,
// addExpense/addWithdrawal's own CashLedgerEntry side effect,
// addMultipleStockBatches' supplierCredit flag) and firestore.rules'
// five new collections. Matches this repository's established
// source-inspection technique (see tests/owner-portfolio-currentworth.test.ts's
// own header) for surfaces with no jsdom/emulator harness available.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-cash-receivables-payables-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const rulesSrc = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf-8');
const typesSrc = readFileSync(new URL('../apps/tenant/src/types.ts', import.meta.url), 'utf-8');
const cashFlowViewSrc = readFileSync(new URL('../apps/tenant/src/components/CashFlowView.tsx', import.meta.url), 'utf-8');
const addStockViewSrc = readFileSync(new URL('../apps/tenant/src/components/AddStockView.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate "${signatureMarker}"`);
  const rest = src.slice(start);
  const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
  return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
}

function extractRulesMatchBlock(src: string, matchMarker: string): string {
  const start = src.indexOf(matchMarker);
  assert.notEqual(start, -1, `Could not locate "${matchMarker}"`);
  // matchMarker always ends with the block's own opening brace (e.g.
  // "match /payables/{payableId} {") — start counting depth from AFTER
  // that brace, at depth 1, rather than from the marker's own start.
  // Counting from the marker's start would treat the balanced
  // "{payableId}" path-parameter braces inside the marker itself as the
  // block's own open/close pair, terminating the scan immediately.
  assert.ok(matchMarker.trimEnd().endsWith('{'), 'matchMarker must end with the block\'s opening brace');
  let depth = 1;
  let i = start + matchMarker.length;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced braces reading match block "${matchMarker}"`);
}

describe('Data model (types.ts) — Increment 3 record types', () => {
  it('CashLedgerEntry is append-only shaped: direction/category are closed enums, no update/delete concept in the type itself', () => {
    assert.match(typesSrc, /direction:\s*'inflow'\s*\|\s*'outflow';/);
    assert.match(typesSrc, /category:\s*'customer-payment'\s*\|\s*'supplier-payment'\s*\|\s*'expense'\s*\|\s*'levantamento'\s*\|\s*'other-governed-movement';/);
  });

  it('Receivable/Payable both carry status as a closed three-state enum', () => {
    const receivableBlock = typesSrc.slice(typesSrc.indexOf('export interface Receivable {'), typesSrc.indexOf('export interface ReceivablePayment'));
    const payableBlock = typesSrc.slice(typesSrc.indexOf('export interface Payable {'), typesSrc.indexOf('export interface PayablePayment'));
    assert.match(receivableBlock, /status:\s*'unpaid'\s*\|\s*'partially-paid'\s*\|\s*'paid';/);
    assert.match(payableBlock, /status:\s*'unpaid'\s*\|\s*'partially-paid'\s*\|\s*'paid';/);
  });

  it('Payable carries sourcePurchaseBatchId — required for the automatic Case-2 supplier-credit path, genuinely absent ONLY on an explicitly-flagged manual/opening-balance entry (isManualEntry)', () => {
    const payableBlock = typesSrc.slice(typesSrc.indexOf('export interface Payable {'), typesSrc.indexOf('export interface PayablePayment'));
    assert.match(payableBlock, /sourcePurchaseBatchId\?:\s*string;/);
    assert.match(payableBlock, /isManualEntry\?:\s*true;/);
  });

  it('ReceivablePayment/PayablePayment both carry cashLedgerEntryId — FR-13/mirror, no payment without a linked ledger effect', () => {
    const receivablePaymentBlock = typesSrc.slice(typesSrc.indexOf('export interface ReceivablePayment {'), typesSrc.indexOf('export interface Payable {'));
    const payablePaymentBlock = typesSrc.slice(typesSrc.indexOf('export interface PayablePayment {'));
    assert.match(receivablePaymentBlock, /cashLedgerEntryId:\s*string;/);
    assert.match(payablePaymentBlock, /cashLedgerEntryId:\s*string;/);
  });
});

describe('addReceivable (AppContext.tsx) — Specification §11, FIN-3', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const addReceivable = async (');

  it('is exposed on the context', () => {
    assert.match(appContextSrc, /addReceivable,/);
  });

  it('is Owner-only', () => {
    assert.match(fnBody, /if \(!isOwner\)/);
  });

  it('rejects a non-positive amount before any write', () => {
    assert.match(fnBody, /if \(!\(Number\(totalAmount\) > 0\)\)/);
  });

  it('a freshly-created Receivable always starts unpaid, with amountRemaining == totalAmount (FIN-3: no shortcut to a pre-settled state)', () => {
    assert.match(fnBody, /amountPaid:\s*0,/);
    assert.match(fnBody, /amountRemaining:\s*rounded,/);
    assert.match(fnBody, /status:\s*'unpaid',/);
  });

  it('performs a single write only — creating a Receivable has no Business Worth side effect requiring atomicity with anything else', () => {
    const setDocCalls = fnBody.match(/setDoc\(/g) ?? [];
    assert.equal(setDocCalls.length, 1);
  });
});

describe('recordReceivablePayment (AppContext.tsx) — Specification §11, FR-12, FR-13, I-5', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const recordReceivablePayment = async (');

  it('is exposed on the context', () => {
    assert.match(appContextSrc, /recordReceivablePayment,/);
  });

  it('is Owner-only and never throws to its caller — reports failure via { success, error }', () => {
    assert.match(fnBody, /if \(!isOwner\)/);
    assert.match(fnBody, /catch \(err: any\) \{/);
    const catchBlock = fnBody.slice(fnBody.indexOf('catch (err: any) {'));
    assert.doesNotMatch(catchBlock, /\n\s*throw /);
  });

  it('uses a single Firestore transaction — the payment record, its linked CashLedgerEntry, and the Receivable update all happen atomically', () => {
    assert.match(fnBody, /runTransaction\(db, async \(tx\) => \{/);
    assert.match(fnBody, /tx\.set\(paymentRef, payment\)/);
    assert.match(fnBody, /tx\.set\(doc\(db, 'businesses', businessId, 'cashLedgerEntries'/);
    assert.match(fnBody, /tx\.update\(receivableRef,/);
  });

  it('is idempotent by construction: the payment document id is the caller-supplied submissionId, and a retry checks for its own prior existence before applying anything', () => {
    assert.match(fnBody, /doc\(db, 'businesses', businessId, 'receivablePayments', submissionId\)/);
    assert.match(fnBody, /if \(existingPaymentSnap\.exists\(\)\) \{/);
  });

  it('rejects an overpayment — an amount exceeding amountRemaining throws before any write', () => {
    assert.match(fnBody, /newAmountRemaining < -0\.005/);
    const overpaymentCheckIndex = fnBody.indexOf('newAmountRemaining < -0.005');
    const firstWriteIndex = fnBody.indexOf('tx.set(paymentRef');
    assert.ok(overpaymentCheckIndex < firstWriteIndex, 'The overpayment check must occur before any write.');
  });

  it('the linked CashLedgerEntry is an inflow, category customer-payment, referencing the receivable', () => {
    const cleStart = fnBody.indexOf('const cashLedgerEntry: CashLedgerEntry = {');
    const cleBlock = fnBody.slice(cleStart, fnBody.indexOf('};', cleStart));
    assert.match(cleBlock, /direction:\s*'inflow',/);
    assert.match(cleBlock, /category:\s*'customer-payment',/);
    assert.match(cleBlock, /sourceReference:\s*\{\s*type:\s*'receivable', id: receivableId\s*\},/);
  });

  it('derives status transitions correctly: fully paid -> "paid", otherwise -> "partially-paid"', () => {
    assert.match(fnBody, /clampedRemaining <= 0\.005 \? 'paid' : 'partially-paid'/);
  });
});

describe('recordPayablePayment (AppContext.tsx) — Specification §12, FR-15, I-6 (mirrors recordReceivablePayment)', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const recordPayablePayment = async (');

  it('is exposed on the context', () => {
    assert.match(appContextSrc, /recordPayablePayment,/);
  });

  it('is Owner-only, transactional, idempotent, and overpayment-rejecting — same discipline as recordReceivablePayment', () => {
    assert.match(fnBody, /if \(!isOwner\)/);
    assert.match(fnBody, /runTransaction\(db, async \(tx\) => \{/);
    assert.match(fnBody, /doc\(db, 'businesses', businessId, 'payablePayments', submissionId\)/);
    assert.match(fnBody, /if \(existingPaymentSnap\.exists\(\)\) \{/);
    assert.match(fnBody, /newAmountRemaining < -0\.005/);
  });

  it('the linked CashLedgerEntry is an outflow, category supplier-payment, referencing the payable', () => {
    const cleStart = fnBody.indexOf('const cashLedgerEntry: CashLedgerEntry = {');
    const cleBlock = fnBody.slice(cleStart, fnBody.indexOf('};', cleStart));
    assert.match(cleBlock, /direction:\s*'outflow',/);
    assert.match(cleBlock, /category:\s*'supplier-payment',/);
    assert.match(cleBlock, /sourceReference:\s*\{\s*type:\s*'payable', id: payableId\s*\},/);
  });
});

describe('addMultipleStockBatches — supplierCredit flag (Specification §12 Case 2, FR-14)', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const addMultipleStockBatches = async (');

  it('creates a Payable only when supplierCredit is true, in the SAME fsBatch as the stock write (atomic)', () => {
    assert.match(fnBody, /if \(supplierCredit && totalInvestmentValue > 0\) \{/);
    const branchStart = fnBody.indexOf('if (supplierCredit && totalInvestmentValue > 0) {');
    const branchEnd = fnBody.indexOf('await fsBatch.commit()');
    const branch = fnBody.slice(branchStart, branchEnd);
    assert.match(branch, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'payables', newPayableId\), newPayable\)/);
  });

  it('the created Payable starts unpaid, amountRemaining == totalAmount == the purchase\'s own total investment value', () => {
    const branchStart = fnBody.indexOf('if (supplierCredit && totalInvestmentValue > 0) {');
    const branch = fnBody.slice(branchStart, fnBody.indexOf('}', fnBody.indexOf('status:', branchStart)) + 1);
    assert.match(branch, /totalAmount:\s*roundedTotal,/);
    assert.match(branch, /amountPaid:\s*0,/);
    assert.match(branch, /amountRemaining:\s*roundedTotal,/);
    assert.match(branch, /status:\s*'unpaid',/);
  });

  it('links the Payable back to the PurchaseBatch it originated from — never a duplicate stock-acquisition record', () => {
    const branchStart = fnBody.indexOf('if (supplierCredit && totalInvestmentValue > 0) {');
    const branch = fnBody.slice(branchStart, branchStart + 800);
    assert.match(branch, /sourcePurchaseBatchId:\s*newPurchaseBatchId,/);
  });

  it('does not touch +Stock/StockBatch/PurchaseBatch writes themselves — the flag is purely additive', () => {
    // The existing PurchaseBatch/StockBatch fsBatch.set calls must still
    // be present, unmodified, elsewhere in this same function.
    assert.match(fnBody, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'purchaseBatches', newPurchaseBatchId\), newPurchaseBatch\)/);
    assert.match(fnBody, /fsBatch\.set\(newBatchRef, newBatch\)/);
  });
});

describe('addExpense / addWithdrawal — governed CashLedgerEntry side effect (Specification §10 FR-10)', () => {
  it('addExpense writes its own CashLedgerEntry (category "expense") atomically alongside the Expense, in the same fsBatch', () => {
    const fnBody = extractFunctionBody(appContextSrc, 'const addExpense = async (');
    assert.match(fnBody, /category:\s*'expense',/);
    assert.match(fnBody, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'expenses', newExpense\.id\), newExpense\)/);
    assert.match(fnBody, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId\), cashLedgerEntry\)/);
    assert.match(fnBody, /await fsBatch\.commit\(\)/);
  });

  it('addWithdrawal writes its own CashLedgerEntry (category "levantamento") atomically alongside the Withdrawal, in the same fsBatch', () => {
    const fnBody = extractFunctionBody(appContextSrc, 'const addWithdrawal = async (');
    assert.match(fnBody, /category:\s*'levantamento',/);
    assert.match(fnBody, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'withdrawals', newWithdrawal\.id\), newWithdrawal\)/);
    assert.match(fnBody, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'cashLedgerEntries', cashLedgerEntryId\), cashLedgerEntry\)/);
  });
});

describe('refreshShopWorth — Increment 3 rewire reads payables/cashLedgerEntries too (regression check, mirrors owner-portfolio-currentworth.test.ts)', () => {
  it('passes payables and cashLedgerEntries through to getEstimatedBusinessWorth', () => {
    const fnBody = extractFunctionBody(appContextSrc, 'const refreshShopWorth = async (');
    assert.match(fnBody, /payables:\s*shopPayables,/);
    assert.match(fnBody, /cashLedgerEntries:\s*shopCashLedgerEntries,/);
  });
});

describe('firestore.rules — Increment 3 collections (Specification §33, tenant isolation, append-only, idempotency)', () => {
  it('cashLedgerEntries: Owner-only read/create, never update/delete (I-4, append-only)', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /cashLedgerEntries/{entryId} {');
    assert.match(block, /allow read: if isOwnerOf\(businessId\);/);
    assert.match(block, /allow create: if isOwnerOf\(businessId\)/);
    assert.match(block, /allow update, delete: if false;/);
  });

  it('cashLedgerEntries: category is restricted to the exact five accepted values — an invalid category is rejected', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /cashLedgerEntries/{entryId} {');
    assert.match(block, /request\.resource\.data\.get\('category', null\) in\s*\n?\s*\['customer-payment', 'supplier-payment', 'expense', 'levantamento', 'other-governed-movement'\]/);
  });

  it('cashLedgerEntries: createdBy must match the authenticated caller — cannot be forged', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /cashLedgerEntries/{entryId} {');
    assert.match(block, /request\.resource\.data\.get\('createdBy', null\) == request\.auth\.uid/);
  });

  it('receivables: create requires the fresh-record invariants (zero paid, remaining == total, status unpaid)', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /receivables/{receivableId} {');
    assert.match(block, /request\.resource\.data\.get\('amountPaid', null\) == 0/);
    assert.match(block, /request\.resource\.data\.get\('amountRemaining', null\) == request\.resource\.data\.get\('totalAmount', null\)/);
    assert.match(block, /request\.resource\.data\.get\('status', null\) == 'unpaid';/);
  });

  it('receivables: update is restricted to exactly the payment-relevant fields — totalAmount/createdAt/description cannot be rewritten later', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /receivables/{receivableId} {');
    assert.match(block, /affectedKeys\(\)\.hasOnly\(\['amountPaid', 'amountRemaining', 'status'\]\)/);
    assert.doesNotMatch(block, /allow delete: if isOwnerOf/, 'Receivables must never be deletable.');
  });

  it('receivablePayments: append-only, id-keyed by submissionId (create-if-absent idempotency), never update/delete', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /receivablePayments/{paymentId} {');
    assert.match(block, /request\.resource\.data\.get\('id', null\) == paymentId/);
    assert.match(block, /allow update, delete: if false;/);
  });

  it('payables: requires sourcePurchaseBatchId and the same fresh-record invariants as receivables', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /payables/{payableId} {');
    assert.match(block, /request\.resource\.data\.get\('sourcePurchaseBatchId', null\) is string/);
    assert.match(block, /request\.resource\.data\.get\('amountPaid', null\) == 0/);
  });

  it('payables: update restricted to payment-relevant fields only, mirroring receivables', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /payables/{payableId} {');
    assert.match(block, /affectedKeys\(\)\.hasOnly\(\['amountPaid', 'amountRemaining', 'status'\]\)/);
  });

  it('payablePayments: append-only, id-keyed by submissionId, never update/delete', () => {
    const block = extractRulesMatchBlock(rulesSrc, 'match /payablePayments/{paymentId} {');
    assert.match(block, /request\.resource\.data\.get\('id', null\) == paymentId/);
    assert.match(block, /allow update, delete: if false;/);
  });

  it('none of the five new collections grant Staff (isMemberOf-only) access — every one requires isOwnerOf', () => {
    for (const marker of [
      'match /cashLedgerEntries/{entryId} {',
      'match /receivables/{receivableId} {',
      'match /receivablePayments/{paymentId} {',
      'match /payables/{payableId} {',
      'match /payablePayments/{paymentId} {',
    ]) {
      const block = extractRulesMatchBlock(rulesSrc, marker);
      assert.doesNotMatch(block, /isMemberOf\(businessId\)/, `${marker} must be Owner-only (isOwnerOf), never isMemberOf.`);
    }
  });
});

describe('CashFlowView.tsx / AddStockView.tsx — minimal UI, no redesign', () => {
  it('CashFlowView renders Receivables, Payables, and Cash Position sections, using the existing context functions only', () => {
    assert.match(cashFlowViewSrc, /addReceivable/);
    assert.match(cashFlowViewSrc, /recordReceivablePayment/);
    assert.match(cashFlowViewSrc, /recordPayablePayment/);
    // [Owner-recorded opening-balance debts / cash position] Added
    // alongside this increment's original three — see addPayable's own
    // AppContext.tsx comment and CashPositionDeclaration's own
    // types.ts comment for why these were added and how they differ
    // from the auto-created/governed paths above.
    assert.match(cashFlowViewSrc, /addPayable/);
    assert.match(cashFlowViewSrc, /addCashPositionDeclaration/);
  });

  it('each payment submission generates its own fresh submissionId per form instance — never a shared/reused one across different rows', () => {
    const submissionIdCalls = cashFlowViewSrc.match(/newSubmissionId\(/g) ?? [];
    assert.ok(submissionIdCalls.length >= 2, 'Expected at least one newSubmissionId(...) call site for receivable payments and one for payable payments.');
  });

  it('AddStockView adds exactly one new control (the supplier-credit checkbox) — does not introduce a new screen/section', () => {
    assert.match(addStockViewSrc, /checked=\{supplierCredit\}/);
    assert.match(addStockViewSrc, /onChange=\{e => setSupplierCredit\(e\.target\.checked\)\}/);
  });

  it('the supplier-credit checkbox defaults to false (Case 1, paid immediately) — this feature never assumes credit', () => {
    assert.match(addStockViewSrc, /const \[supplierCredit, setSupplierCredit\] = useState\(false\);/);
  });
});

describe('Scope discipline — Increment 4-9 boundaries respected', () => {
  it('no Cash Ledger/Receivable/Payable field references Startup Investment, multi-unit valuation, Fecho baseline-anchoring, or reconciliation/notification mechanisms', () => {
    // [Scope fix] The original assertion here scanned the ENTIRE
    // appContextSrc/rulesSrc files for these terms — but Startup
    // Investment is a real, separate, long-standing feature that
    // legitimately exists elsewhere in both files (StartupInvestmentEntry
    // in AppContext.tsx; the /startupInvestmentEntries/{entryId} match
    // block in firestore.rules). A whole-file scan was never a correct
    // way to express "this INCREMENT's own new surface doesn't
    // reference that" — it would fail the moment the unrelated feature
    // existed anywhere in the same file, which it always did. Rescoped
    // to the specific functions/match blocks this increment actually
    // added, using the same extractFunctionBody/extractRulesMatchBlock
    // helpers already established elsewhere in this file (see the
    // Notification-scoped assertion immediately below, and the
    // isMemberOf assertions above, for the same technique).
    const increment3FunctionMarkers = [
      'const addReceivable = async (',
      'const addPayable = async (',
      'const addCashPositionDeclaration = async (',
      'const recordReceivablePayment = async (',
      'const recordPayablePayment = async (',
    ];
    // [extractFunctionBody edge case] The shared helper (used
    // elsewhere in this file too — see the Notification-scoped
    // assertion below) slices up to the NEXT function's own
    // declaration line, so a trailing comment belonging to that
    // next function (describing itself, before its own
    // `const xxx = ` line) gets swept into the current function's
    // extracted body. Trimmed here — locally, not by changing the
    // shared helper other assertions in this file already depend on
    // — by dropping trailing blank/comment-only lines back to the
    // last real code line, so a reference genuinely inside the
    // CURRENT function is still caught, but the next function's own
    // leading comment about itself is not mistaken for it.
    function trimTrailingComment(body: string): string {
      const lines = body.split('\n');
      let end = lines.length;
      while (end > 0 && /^\s*(\/\/.*)?$/.test(lines[end - 1])) end--;
      return lines.slice(0, end).join('\n');
    }
    for (const marker of increment3FunctionMarkers) {
      const body = trimTrailingComment(extractFunctionBody(appContextSrc, marker));
      assert.doesNotMatch(body, /StartupInvestmentEntry/, `${marker} must not reference StartupInvestmentEntry.`);
    }
    const increment3RulesMarkers = [
      'match /cashLedgerEntries/{entryId} {',
      'match /receivables/{receivableId} {',
      'match /receivablePayments/{paymentId} {',
      'match /payables/{payableId} {',
      'match /payablePayments/{paymentId} {',
    ];
    for (const marker of increment3RulesMarkers) {
      const block = extractRulesMatchBlock(rulesSrc, marker);
      assert.doesNotMatch(block, /startupInvestmentEntries/, `${marker} must not reference startupInvestmentEntries.`);
    }
  });

  it('no new NotificationCategory or reconciliation-signal producer was introduced by this increment', () => {
    const receivableFnBody = extractFunctionBody(appContextSrc, 'const recordReceivablePayment = async (');
    const payableFnBody = extractFunctionBody(appContextSrc, 'const recordPayablePayment = async (');
    assert.doesNotMatch(receivableFnBody, /Notification/);
    assert.doesNotMatch(payableFnBody, /Notification/);
  });
});
