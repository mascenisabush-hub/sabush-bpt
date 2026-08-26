// [Feature/bug fix — Owner-requested: "does the system recognize there
// is a pending unpaid receipt?" from the same supplier] Investigation
// found two real gaps:
//
// 1. AddStockView.tsx never read the payables collection at all -- the
//    supplier-credit checkbox had zero awareness of any existing
//    outstanding balance for the selected supplier.
//
// 2. Even checking Dívidas manually wouldn't clearly show which
//    supplier a payable belonged to: Payable.supplierName is, by its
//    own documented contract, "Never set on the automatic path" (every
//    +Stock supplier-credit purchase), and there was no supplierId ->
//    name resolution anywhere -- {p.supplierName || p.description ||
//    p.id} fell through to a meaningless raw document ID for every
//    auto-created payable.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/price-deviation-warning-wiring.test.ts's own
// header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-outstanding-balance.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const debtsSrc = src('apps/tenant/src/components/DebtsView.tsx');

describe('AddStockView.tsx — getSupplierOutstandingBalance', () => {
  it('is defined once, reading the live payables array from useApp() — never a second, separately fetched copy', () => {
    assert.match(addStockSrc, /payables,/);
    const defCount = (addStockSrc.match(/const getSupplierOutstandingBalance = \(forSupplierId: string \| undefined\): number \| null => \{/g) || []).length;
    assert.equal(defCount, 1);
  });

  it('filters to unpaid or partially-paid payables for the given supplierId, summing amountRemaining', () => {
    const start = addStockSrc.indexOf('const getSupplierOutstandingBalance = (forSupplierId: string | undefined): number | null => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /p\.supplierId === forSupplierId && \(p\.status === 'unpaid' \|\| p\.status === 'partially-paid'\)/);
    assert.match(body, /sum \+ p\.amountRemaining/);
  });

  it('returns null (never a fabricated 0) both for no supplier selected and for a genuinely zero balance', () => {
    const start = addStockSrc.indexOf('const getSupplierOutstandingBalance = (forSupplierId: string | undefined): number | null => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /if \(!forSupplierId\) return null;/);
    assert.match(body, /return total > 0 \? total : null;/);
  });
});

describe('AddStockView.tsx — the warning is actually wired next to the credit checkbox', () => {
  it('renders only when getSupplierOutstandingBalance returns non-null — never an empty warning box', () => {
    const start = addStockSrc.indexOf('const outstanding = getSupplierOutstandingBalance(supplierId);');
    assert.notEqual(start, -1);
    const nearby = addStockSrc.slice(start, start + 200);
    assert.match(nearby, /if \(outstanding === null\) return null;/);
  });

  it('is shown regardless of whether THIS purchase is itself on credit — informational either way, matching this file\'s own "warn, never block" discipline', () => {
    const checkboxIdx = addStockSrc.indexOf("{t('addStock.supplier.creditCheckboxLabel')}");
    const warningIdx = addStockSrc.indexOf('const outstanding = getSupplierOutstandingBalance(supplierId);');
    assert.notEqual(checkboxIdx, -1);
    assert.notEqual(warningIdx, -1);
    assert.ok(warningIdx > checkboxIdx, 'the warning must render after the checkbox, not gated by its checked state');
    const between = addStockSrc.slice(checkboxIdx, warningIdx);
    assert.doesNotMatch(between, /if \(!supplierCredit\)/);
  });

  it('uses the shared formatCurrency/AlertTriangle already imported in this file — never a second, duplicated formatting/icon choice', () => {
    const start = addStockSrc.indexOf('const outstanding = getSupplierOutstandingBalance(supplierId);');
    const end = addStockSrc.indexOf('})()}', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /formatCurrency\(outstanding, currencySymbol\)/);
    assert.match(body, /<AlertTriangle/);
    assert.match(body, /t\('addStock\.supplier\.outstandingBalanceWarning', \{/);
  });
});

describe('DebtsView.tsx — resolvePayableDisplayName fixes the raw-document-ID display bug', () => {
  it('is defined once and prefers supplierName, then a live suppliers lookup by supplierId, then description, then a translated placeholder — never the raw document id', () => {
    const start = debtsSrc.indexOf('function resolvePayableDisplayName(');
    assert.notEqual(start, -1);
    const end = debtsSrc.indexOf('\n}', start);
    const body = debtsSrc.slice(start, end);
    assert.match(body, /if \(p\.supplierName\) return p\.supplierName;/);
    assert.match(body, /suppliers\.find\(\(s\) => s\.id === p\.supplierId\)/);
    assert.match(body, /if \(p\.description\) return p\.description;/);
    assert.match(body, /return t\('debts\.payablesSection\.unknownSupplier'\);/);
    assert.doesNotMatch(body, /return p\.id;/);
  });

  it('suppliers is destructured from useApp() and passed into the resolver — never a second Firestore read', () => {
    assert.match(debtsSrc, /suppliers,\n  \} = useApp\(\);/);
    assert.match(debtsSrc, /resolvePayableDisplayName\(p, suppliers, t\)/);
  });

  it('the old fallback chain (p.supplierName || p.description || p.id) is gone from the render — replaced entirely by the resolver', () => {
    assert.doesNotMatch(debtsSrc, /\{p\.supplierName \|\| p\.description \|\| p\.id\}/);
  });

  it('the secondary description subtitle only shows when it genuinely differs from the resolved title — never a redundant duplicate line', () => {
    assert.match(debtsSrc, /const showDescriptionAsSubtitle = !!p\.description && p\.description !== displayName;/);
  });
});

describe('i18n — outstandingBalanceWarning and unknownSupplier present in all three locales', () => {
  for (const locale of ['pt', 'en', 'fr']) {
    it(`${locale}.ts declares both keys with non-empty values`, () => {
      const localeSrc = src(`apps/tenant/src/i18n/locales/${locale}.ts`);
      const warningMatch = localeSrc.match(/outstandingBalanceWarning: ['"][^'"]*\{\{amount\}\}[^'"]*['"],/);
      assert.notEqual(warningMatch, null, `${locale}.ts must have a non-empty outstandingBalanceWarning with {{amount}}`);
      const unknownMatch = localeSrc.match(/unknownSupplier: ['"][^'"]+['"],/);
      assert.notEqual(unknownMatch, null, `${locale}.ts must have a non-empty unknownSupplier value`);
    });
  }

  it('the shared TranslationDict interface (pt.ts) declares both keys', () => {
    const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
    assert.match(ptSrc, /outstandingBalanceWarning: string;/);
    assert.match(ptSrc, /unknownSupplier: string;/);
  });
});
