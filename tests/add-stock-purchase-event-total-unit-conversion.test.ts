// Bug fix — Owner-reported, urgent, live with a client: same root cause
// as tests/add-stock-existing-product-venda-total-unit-conversion.test.ts
// (existing product, purchase unit differs from confirmed selling unit —
// e.g. "1 Cx = 20 Un, sells 250 MZN/Un"), but found one layer deeper
// during that investigation: the actual PERSISTED purchase-event totals
// — AppContext.tsx's addMultipleStockBatches own totalMarketValue, which
// feeds the "Lote de Compra Criado" Timeline event's own "Lucro
// Embutido"/marketValue financial-impact figures — computed
// `quantity * item.sellingPrice` directly, with the exact same missing
// unit-conversion defect, this time in data that gets WRITTEN and shown
// in the business's own activity history, not merely an in-progress UI
// preview.
//
// FIX: AddStockParams gained an optional `sellingPriceBasisUnit` field
// (AddStockView.tsx now forwards row.sellingPriceBasisUnit when
// present) so addMultipleStockBatches knows which unit sellingPrice is
// ACTUALLY denominated in, and converts via the same, unmodified
// computeRatePerPurchaseUnit (purchaseToSellingConversion.ts) whenever
// it genuinely differs from the row's own purchase unit — never a
// second, independently-invented conversion, and never touching what
// gets written onto StockBatch.sellingPrice itself (only the
// totalMarketValue/Timeline figures are corrected).
//
// SCOPE NOTE: this repository has no DOM/React render harness, and
// addMultipleStockBatches is tightly coupled to the live Firebase
// client SDK (see this repository's own established precedent — e.g.
// tests/business-worth-correction-recovery-ui.test.ts's header — for
// why that class of function is covered by structural source-text
// inspection rather than direct invocation). This suite follows the
// same two established techniques already used by the sibling
// AddStockView fix: (1) a direct fixture test against the real,
// imported computeRatePerPurchaseUnit reproducing the exact scenario,
// and (2) structural source-text assertions confirming the wiring.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-purchase-event-total-unit-conversion.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { computeRatePerPurchaseUnit } from '../apps/tenant/src/lib/purchaseToSellingConversion';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('computeRatePerPurchaseUnit — the reported scenario (1 Cx = 20 Un, sells 250 MZN/Un)', () => {
  const relationship: UnitRelationship = {
    units: [
      { unit: 'Cx', factorFromPrevious: 1 },
      { unit: 'Un', factorFromPrevious: 20 },
    ],
    sellingUnit: 'Un',
    confirmedAt: '2026-09-12T10:00:00.000Z',
  };

  it('the per-Cx rate is 5,000 MZN (20 * 250), not 250', () => {
    const rate = computeRatePerPurchaseUnit(relationship, 'Cx', 'Un', 250);
    assert.equal(rate, 5000);
  });

  it('a fractional purchase quantity (0.5 Cx) works correctly with the corrected rate — 0.5 * 5,000 = 2,500, not 0.5 * 250 = 125', () => {
    const rate = computeRatePerPurchaseUnit(relationship, 'Cx', 'Un', 250);
    assert.notEqual(rate, null);
    const marketValue = 0.5 * (rate as number);
    assert.equal(marketValue, 2500);
    assert.notEqual(marketValue, 0.5 * 250);
  });

  it('embedded profit for a 0.5 Cx purchase at 3,840 MZN/Cx cost is 2,500 - 1,920 = 580, not a naive/wrong figure', () => {
    const rate = computeRatePerPurchaseUnit(relationship, 'Cx', 'Un', 250);
    const marketValue = 0.5 * (rate as number);
    const investmentValue = 0.5 * 3840;
    assert.equal(investmentValue, 1920);
    assert.equal(marketValue - investmentValue, 580);
  });
});

describe('AppContext.tsx — AddStockParams.sellingPriceBasisUnit wiring', () => {
  it('the field exists on the interface', () => {
    assert.match(appContextSrc, /sellingPriceBasisUnit\?: string;/);
  });

  it('addMultipleStockBatches resolves totalMarketValue unit-aware via computeRatePerPurchaseUnit, not a bare quantity * item.sellingPrice', () => {
    const start = appContextSrc.indexOf('totalInvestmentValue += Number(item.quantity) * Number(item.costPrice);');
    assert.notEqual(start, -1);
    const end = appContextSrc.indexOf('totalMarketValue += rowMarketValue;', start) + 'totalMarketValue += rowMarketValue;'.length;
    const body = appContextSrc.slice(start, end);
    assert.match(body, /const sellingBasisUnit = \(item\.sellingPriceBasisUnit \|\| batchUnit\)\.trim\(\);/);
    assert.match(body, /isValidUnitRelationship\(relationshipForConversion\)/);
    assert.match(body, /computeRatePerPurchaseUnit\(relationshipForConversion, batchUnit, sellingBasisUnit, Number\(item\.sellingPrice\)\)/);
    // Same-unit fast path preserved — never converts when no conversion is needed.
    assert.match(body, /Number\(item\.quantity\) \* Number\(item\.sellingPrice\)/);
  });

  it('computeRatePerPurchaseUnit is properly imported from purchaseToSellingConversion.ts — never a second, independently-invented conversion', () => {
    const importLine = appContextSrc.split('\n').find((l) => l.includes("from '../lib/purchaseToSellingConversion'"));
    assert.ok(importLine, 'Expected a purchaseToSellingConversion.ts import line.');
    assert.match(importLine!, /computeRatePerPurchaseUnit/);
  });

  it('StockBatch.sellingPrice itself remains completely untouched by this fix — item.sellingPrice is written to newBatch exactly as sent', () => {
    assert.match(appContextSrc, /sellingPrice: Number\(item\.sellingPrice\),/);
  });
});

describe('AddStockView.tsx — forwards sellingPriceBasisUnit to the write path', () => {
  it('itemsToSave forwards row.sellingPriceBasisUnit when present', () => {
    assert.match(addStockSrc, /\.\.\.\(row\.sellingPriceBasisUnit \? \{ sellingPriceBasisUnit: row\.sellingPriceBasisUnit \} : \{\}\),/);
  });
});
