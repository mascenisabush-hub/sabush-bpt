// [Manual data-entry error investigation, Finding 3 — Owner-requested]
// checkPriceDeviation itself (apps/tenant/src/lib/priceDeviationCheck.ts)
// is tested directly in tests/price-deviation-check.test.ts. This suite
// covers the two places it's actually wired in: Contagem
// (PeriodicStockCountView.tsx — both catalog rows and manual rows) and
// Add Stock (AddStockView.tsx — both desktop and mobile layouts, both
// price fields).
//
// [§44 — Periodic Contagem Cost-Price Removal, FR-77] Contagem's own
// Cost Price invocation is retired as of this amendment — Owner-typed
// Cost Price no longer exists in Periodic Contagem, so there is nothing
// left to check for a typo. Only the Selling Price invocation remains
// for Contagem. Add Stock's own wiring (both cost and selling, all four
// inputs) is completely unaffected — §44 scopes to Periodic Contagem
// only.
//
// [Concept C — Validated Product Compaction] Contagem's own Selling
// Price call-site count is 4, not 2, as of this later increment — a
// validated row is now ALSO rendered in a separate compact summary
// area (alongside the active/editing rows), reusing the exact same
// checkPriceDeviation/getRememberedPriceForRow calls verbatim rather
// than inventing a second check, per that increment's own explicit
// scope. Two logical fields (catalog-row Selling Price, manual-row
// Selling Price) now each have two render sites (active + validated),
// giving 4 call sites total — not 4 distinct checks.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/periodic-stock-review-screen-price.test.ts's own
// header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/price-deviation-warning-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('PeriodicStockCountView.tsx — getRememberedPriceForRow', () => {
  it('is defined once, imports checkPriceDeviation from the SAME shared utility Add Stock uses — never a second, independently-invented one', () => {
    assert.match(periodicSrc, /import \{ checkPriceDeviation \} from '\.\.\/lib\/priceDeviationCheck';/);
    const defCount = (periodicSrc.match(/const getRememberedPriceForRow = \(row: StockCountWorkingRow, field: 'cost' \| 'selling'\): number \| null => \{/g) || []).length;
    assert.equal(defCount, 1);
  });

  it('resolves by productId when present, falling back to a case-insensitive name match — so a manual row (which never carries a productId) still resolves', () => {
    const start = periodicSrc.indexOf("const getRememberedPriceForRow = (row: StockCountWorkingRow");
    const end = periodicSrc.indexOf('\n  };', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /row\.productId\s*\n\s*\? products\.find\(\(p\) => p\.id === row\.productId\)/);
    assert.match(body, /: products\.find\(\(p\) => p\.name\.trim\(\)\.toLowerCase\(\) === trimmedName\)/);
  });

  it('uses findMostRecentBatchForProduct (buildCatalogRow\'s own memory source), never findLatestRememberedProductMemory — deliberately not searching StockCounts, so a Contagem never warns against an earlier portion of itself', () => {
    const start = periodicSrc.indexOf("const getRememberedPriceForRow = (row: StockCountWorkingRow");
    const end = periodicSrc.indexOf('\n  };', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /findMostRecentBatchForProduct\(batches, product\.id\)/);
    assert.doesNotMatch(body, /findLatestRememberedProductMemory/);
  });

  it('converts the remembered batch price via resolveUnitAwarePrice to this row\'s current unit — never a raw, unconverted comparison', () => {
    const start = periodicSrc.indexOf("const getRememberedPriceForRow = (row: StockCountWorkingRow");
    const end = periodicSrc.indexOf('\n  };', start);
    const body = periodicSrc.slice(start, end);
    assert.match(body, /resolveUnitAwarePrice\(rememberedRaw, latestBatch\.unit \|\| row\.unit, row\.unit, product\.unitRelationship\)/);
  });

  it('is called from both the catalog-row and manual-row price fields, in both the active and Concept C validated-summary areas — 4 call sites total (§44: cost removed, selling only; Concept C: each of the 2 remaining fields also rendered in the compact validated view)', () => {
    const callCount = (periodicSrc.match(/getRememberedPriceForRow\(row, '(cost|selling)'\)/g) || []).length;
    assert.equal(callCount, 4);
    // Every remaining call must be 'selling' — none 'cost' (FR-77: the
    // Cost Price invocation is retired; Selling Price is unaffected).
    const costCallCount = (periodicSrc.match(/getRememberedPriceForRow\(row, 'cost'\)/g) || []).length;
    assert.equal(costCallCount, 0);
  });
});

describe('PeriodicStockCountView.tsx — the warning is actually rendered next to each price field', () => {
  it('§44: no Cost Price deviation warning remains anywhere in Periodic Contagem — the cost-side checkPriceDeviation call is fully retired', () => {
    const costWarningCount = (periodicSrc.match(/checkPriceDeviation\(parseFloat\(row\.costPrice\)/g) || []).length;
    assert.equal(costWarningCount, 0);
  });

  it('the catalog-row and manual-row Venda/Un fields each still check for a Selling Price deviation warning, in both the active and Concept C validated-summary areas — 4 call sites total, unaffected by §44 itself', () => {
    const sellingWarningCount = (periodicSrc.match(/checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)/g) || []).length;
    assert.equal(sellingWarningCount, 4);
  });

  it('warnings only render when check.showWarning is true — never an empty/always-visible note (§44: 2 remaining, both Selling Price)', () => {
    const occurrences = periodicSrc.match(/const check = checkPriceDeviation\([\s\S]{0,80}?\);\n\s+if \(!check\.showWarning\) return null;/g) || [];
    assert.equal(occurrences.length, 2);
    for (const occurrence of occurrences) {
      assert.match(occurrence, /row\.sellingPrice/);
      assert.doesNotMatch(occurrence, /row\.costPrice/);
    }
  });
});

describe('AddStockView.tsx — getRememberedPriceForRow (Add Stock\'s own, separate helper)', () => {
  it('uses the SAME findLatestRememberedProductMemory + isValidUnitRelationship pattern already established for auto-fill — never a second, independently-invented memory lookup', () => {
    const start = addStockSrc.indexOf('const getRememberedPriceForRow = (row: StockRowItem, field:');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /findLatestRememberedProductMemory\(/);
    assert.match(body, /isValidUnitRelationship\(matched\.unitRelationship\)/);
    assert.match(body, /resolveUnitAwarePrice\(/);
  });

  it('is called from all four price inputs — desktop cost, desktop selling, mobile cost, mobile selling', () => {
    const callCount = (addStockSrc.match(/getRememberedPriceForRow\(row, '(cost|selling)'\)/g) || []).length;
    assert.equal(callCount, 4);
  });

  it('warnings only render when check.showWarning is true, matching Contagem\'s own identical discipline', () => {
    const occurrences = addStockSrc.match(/const check = checkPriceDeviation\([\s\S]{0,80}?\);\n\s+if \(!check\.showWarning\) return null;/g) || [];
    assert.equal(occurrences.length, 4);
  });

  it('imports checkPriceDeviation from the shared utility', () => {
    assert.match(addStockSrc, /import \{ checkPriceDeviation \} from '\.\.\/lib\/priceDeviationCheck';/);
  });
});

describe('i18n — priceDeviationWarningAbove/Below present in all three locales (Add Stock\'s own t()-based screen)', () => {
  for (const locale of ['pt', 'en', 'fr']) {
    it(`${locale}.ts declares both keys with a {{percent}} placeholder`, () => {
      const localeSrc = src(`apps/tenant/src/i18n/locales/${locale}.ts`);
      assert.match(localeSrc, /priceDeviationWarningAbove:/);
      assert.match(localeSrc, /priceDeviationWarningBelow:/);
      const aboveMatch = localeSrc.match(/priceDeviationWarningAbove:\s*\n?\s*['"][^'"]*\{\{percent\}\}[^'"]*['"]/);
      assert.notEqual(aboveMatch, null, `${locale}.ts's priceDeviationWarningAbove must include {{percent}}`);
    });
  }
});
