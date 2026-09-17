// Bug fix — Owner-reported urgent issue: a staff member's Add Stock
// purchase was rejected with "insufficient permission" on the final
// Save/Confirm step.
//
// Root cause: the "Compra a crédito" (supplier credit) checkbox had no
// `!isStaff` gate, despite its own governing comment (Business Worth
// Evolution, FR-14) always describing it as an "explicit Owner
// declaration." Checking it makes addMultipleStockBatches write a new
// /payables document in the SAME atomic Firestore batch as the stock
// batch itself, and /payables' own create rule requires
// `isOwnerOf(businessId)`. Firestore batch writes are all-or-nothing,
// so that one disallowed write rejected the entire save — batches,
// products, supplier record, everything — with PERMISSION_DENIED,
// surfacing to the client as "insufficient permission" on a purchase
// that had nothing else wrong with it.
//
// Source-inspection tests, matching this repository's established
// technique (no jsdom/testing-library harness exists here).
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-staff-supplier-credit-permission-fix.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const rulesSrc = src('firestore.rules');

describe('Add Stock — staff supplier-credit permission fix', () => {
  it('confirms the actual root cause still holds in firestore.rules: /payables create requires isOwnerOf, not merely isMemberOf — this is the invariant the UI-level fix must respect, not loosen', () => {
    const payablesBlock = rulesSrc.slice(rulesSrc.indexOf('match /payables/{payableId}'), rulesSrc.indexOf('match /payablePayments'));
    assert.match(payablesBlock, /allow create: if isOwnerOf\(businessId\)/);
    assert.doesNotMatch(payablesBlock, /allow create: if isMemberOf\(businessId\)/);
  });

  it('the supplier-credit checkbox is now gated behind !isStaff, matching every other owner-only control already established in this file', () => {
    assert.match(
      addStockSrc,
      /\{!isStaff && \(\s*\n\s*<label className="flex items-center gap-2 text-\[13px\] text-\[#111827\] cursor-pointer">\s*\n\s*<input\s*\n\s*type="checkbox"\s*\n\s*checked=\{supplierCredit\}\s*\n\s*onChange=\{e => setSupplierCredit\(e\.target\.checked\)\}/
    );
  });

  it('the checkbox\'s own onChange still calls setSupplierCredit unchanged — this fix only gates visibility, it does not alter the underlying state/handler', () => {
    assert.match(addStockSrc, /onChange=\{e => setSupplierCredit\(e\.target\.checked\)\}/);
  });

  it('the actual addMultipleStockBatches call site defensively re-checks isStaff and forces supplierCredit to false for a staff session, independent of the UI gate above — this file\'s own established "UI gate + defensive re-check at the point of use" pattern', () => {
    const callIdx = addStockSrc.indexOf('const result = await addMultipleStockBatches(');
    const callBlock = addStockSrc.slice(callIdx, callIdx + 400);
    assert.match(callBlock, /isStaff \? false : supplierCredit/);
  });

  it('outstanding-balance warning remains visible regardless of role — it is read-only/informational, never itself the cause of a rejected write, so it correctly keeps no !isStaff gate', () => {
    const warningIdx = addStockSrc.indexOf('getSupplierOutstandingBalance(supplierId)');
    const checkboxIdx = addStockSrc.indexOf("t('addStock.supplier.creditCheckboxLabel')");
    assert.notEqual(warningIdx, -1);
    assert.ok(warningIdx > checkboxIdx, 'Expected the outstanding-balance warning after the checkbox, outside its gated block.');
    // Confirm it's not itself wrapped in a !isStaff gate.
    const gateIdx = addStockSrc.lastIndexOf('{!isStaff', warningIdx);
    const nearestCheckboxCloseIdx = addStockSrc.indexOf(')}', checkboxIdx);
    assert.ok(gateIdx === -1 || gateIdx < nearestCheckboxCloseIdx, 'The outstanding-balance warning should not be inside its own !isStaff gate.');
  });

  it('only one render site of the checkbox exists — no separate, ungated duplicate elsewhere in the file', () => {
    const count = (addStockSrc.match(/creditCheckboxLabel/g) || []).length;
    assert.equal(count, 1, `Expected exactly one reference to creditCheckboxLabel, found ${count}.`);
  });

  it('the /payables write itself, and its own supplierCredit-gated condition in AppContext.tsx, are unmodified by this fix — this was a UI/call-site-level correction only, never a change to the write logic or the governed business rule', () => {
    const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
    assert.match(appContextSrc, /if \(supplierCredit && totalInvestmentValue > 0\) \{/);
    assert.match(appContextSrc, /fsBatch\.set\(doc\(db, 'businesses', businessId, 'payables', newPayableId\), newPayable\);/);
  });
});
