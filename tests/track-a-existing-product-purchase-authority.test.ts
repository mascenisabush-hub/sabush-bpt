// Track A — Existing-Product Stock Entry Purchase Authority
// (POL-pending-existing-product-stock-entry-purchase-authority.md, Accepted
// 2026-09-10; BDR-0012 §3; Rule 8 Assessment; Implementation Plan,
// docs/engineering/track-a-existing-product-stock-entry-purchase-authority-implementation-plan.md;
// Implementation Authorization, docs/engineering/track-a-existing-product-stock-entry-purchase-authority-implementation-authorization.md)
//
// SCOPE: proves, for an EXISTING product, that (1) the active purchase-unit
// and purchase-cost fields are never defaulted from historical
// StockBatch/StockCount memory or from Product.costPrice, at every one of
// the five identified AddStockView.tsx sites; (2) selling-side resolution
// (canonical Product Memory, UnitRelationship, selling price) is completely
// unaffected; (3) handleUnitChange no longer re-derives an OCR-supplied
// purchase cost when the operator corrects the purchase unit — the exact
// "2 Un @ 1,000/Un -> Cx -> silently-computed 24,000" failure this Track A
// change exists to close; (4) FR-86's forward Product.costPrice maintenance
// (AppContext.tsx) is untouched, and is a different direction of data flow
// from the removed reverse (Product.costPrice -> active field) consumption.
//
// SCOPE NOTE: this repository has no DOM/React render harness (established
// precedent — see tests/add-stock-typing-and-autofill-bugfix.test.ts's own
// header). This suite follows the same two established techniques: (1)
// direct fixture tests against the REAL, imported pure functions
// (resolveUnitAwarePrice, calculateBatch) proving the underlying arithmetic
// is correct and unaffected, and (2) structural source-text assertions
// confirming each site is wired correctly.
//
// HOW TO RUN:
//   npx tsx --test tests/track-a-existing-product-purchase-authority.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import { calculateBatch } from '../apps/tenant/src/utils/calculations';
import type { UnitRelationship, StockBatch } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');

const CX_UN: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-01-01T00:00:00.000Z',
};

function fnBody(source: string, defSignature: string): string {
  const start = source.indexOf(defSignature);
  assert.notEqual(start, -1, `expected to find ${defSignature}`);
  const end = source.indexOf('\n  };', start);
  return source.slice(start, end);
}

// ==================================================================
// A — Purchase unit/cost never defaulted from historical memory or
// Product.costPrice, at every identified site
// ==================================================================
describe('Track A §A/§C/§D — purchase unit/cost are never sourced from historical memory or Product.costPrice', () => {
  it('buildProductMemoryAutofill: newUnit is never assigned from memory.unit; newCost is never assigned from memory.costPrice or product.costPrice', () => {
    const body = fnBody(addStockSrc, 'const buildProductMemoryAutofill = (product: (typeof products)[number]): Partial<StockRowItem> => {');
    assert.doesNotMatch(body, /newUnit = memory\.unit/);
    assert.doesNotMatch(body, /newCost = String\(memory\.costPrice\)/);
    assert.doesNotMatch(body, /newCost = String\(product\.costPrice\)/);
    // Selling side untouched: memory.sellingPrice remains a legitimate fallback.
    assert.match(body, /newSell = String\(memory\.sellingPrice\)/);
  });

  it('createEmptyRow: initialUnit is never assigned from memory.unit; initialCost is never assigned from memory.costPrice or match.costPrice', () => {
    const body = fnBody(addStockSrc, 'const createEmptyRow = (productName: string = \'\'): StockRowItem => {');
    assert.doesNotMatch(body, /initialUnit = memory\.unit/);
    assert.doesNotMatch(body, /initialCost = String\(memory\.costPrice\)/);
    assert.doesNotMatch(body, /initialCost = String\(match\.costPrice\)/);
    assert.match(body, /initialSell = String\(memory\.sellingPrice\)/);
  });

  it('handleConfirmSupplierWordingCandidate: costPrice is never assigned from memory.costPrice or matchedProduct.costPrice', () => {
    const body = fnBody(addStockSrc, 'const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    assert.doesNotMatch(body, /resolveUnitAwarePrice\(memory\.costPrice,/);
    assert.doesNotMatch(body, /matchedProduct\.costPrice != null/);
    assert.match(body, /matchedProduct\.sellingPrice != null/);
  });

  it('buildRowFromProposalLineItem: costPrice is never assigned from memory.costPrice or matched.costPrice; unit never falls back to the latest StockBatch\'s own unit when OCR supplies none', () => {
    const body = fnBody(addStockSrc, 'const buildRowFromProposalLineItem = async (item: SmartStockEntryLineItemProposal): Promise<StockRowItem> => {');
    assert.doesNotMatch(body, /resolveUnitAwarePrice\(memory\.costPrice,/);
    assert.doesNotMatch(body, /matched\.costPrice != null/);
    assert.doesNotMatch(body, /unit = productBatches\[0\]\.unit \|\| unit/);
    assert.match(body, /matched\.sellingPrice != null/);
    // OCR's own priority is unaffected.
    assert.match(body, /unit = item\.unit\.value \|\| \(suggestedUnits\[0\] \|\| 'un'\)/);
    assert.match(body, /costPrice = item\.costPrice\.value != null \? String\(item\.costPrice\.value\) : ''/);
  });
});

// ==================================================================
// B — handleUnitChange never re-derives purchase cost (Track A §F,
// Rule 8 R8-E — the OCR-fabrication fix)
// ==================================================================
describe('Track A §F / R8-E — handleUnitChange never re-derives purchase cost on a unit change', () => {
  it('structural: no cost-conversion branch remains (code, not comments); selling-price re-derivation is untouched', () => {
    const body = fnBody(addStockSrc, 'const handleUnitChange = (rowId: string, newUnit: string) => {');
    assert.doesNotMatch(body, /row\.costPriceAutoFilled/);
    assert.doesNotMatch(body, /updates\.costPrice\b/);
    assert.doesNotMatch(body, /updates\.costPriceAutoFilled/);
    assert.doesNotMatch(body, /updates\.costPriceBasisUnit/);
    assert.match(body, /row\.sellingPriceAutoFilled && row\.sellingPrice !== ''/);
    assert.match(body, /updates\.sellingPrice = resolvedSell/);
  });

  it('the exact worked example: OCR reads 2 Un @ 1,000 MZN/Un; had the removed branch still existed, correcting the unit to Cx would have computed 1,000 x 24 = 24,000 — proving what the removed branch would have silently produced, and why leaving costPrice untouched is the correct fix', () => {
    // This is the fabricated value the pre-Track-A code would have
    // silently written into row.costPrice — never a legitimate result.
    const fabricatedIfConverted = resolveUnitAwarePrice(1000, 'Un', 'Cx', CX_UN);
    assert.equal(fabricatedIfConverted, '24000.00');
    // The structural assertion above already proves handleUnitChange no
    // longer calls resolveUnitAwarePrice against row.costPrice at all —
    // this fixture exists only to make the magnitude of the prevented
    // fabrication concrete and reviewable.
  });
});

// ==================================================================
// C — Selling-side conversion engine, unaffected (Track A §E, R8-D/R8-F)
// ==================================================================
describe('Track A §E / R8-D / R8-F — selling-side conversion is unaffected, worked example verified', () => {
  it('1 Cx = 24 Un, selling unit Un, selling price 65 MZN/Un: converts to 1,560 MZN/Cx', () => {
    const resolved = resolveUnitAwarePrice(65, 'Un', 'Cx', CX_UN);
    assert.equal(resolved, '1560.00');
  });

  it('end-to-end worked example via the real calculateBatch: 2 Cx @ 1,200 MZN/Cx purchase, sellingPrice correctly set to 1,560/Cx, yields marketValue 3,120 MZN (48 Un equivalent)', () => {
    const batch: StockBatch = {
      id: 'batch-test',
      productId: 'prod-test',
      dateEntered: '2026-09-10',
      quantity: 2,
      unit: 'Cx',
      costPrice: 1200,
      sellingPrice: 1560,
      status: 'open',
      createdAt: '2026-09-10T00:00:00.000Z',
    };
    const result = calculateBatch(batch, []);
    assert.equal(result.investmentValue, 2400);
    assert.equal(result.marketValue, 3120);
  });
});

// ==================================================================
// D — FR-86 direction-independence: forward write untouched, reverse
// read removed (Track A §C, R8-C)
// ==================================================================
describe('Track A §C / R8-C — Product.costPrice: FR-86 forward maintenance untouched; reverse (active-field) consumption removed', () => {
  it('AppContext.tsx: the FR-86 forward-write block (current purchase cost -> Product.costPrice) is unmodified and present', () => {
    assert.match(
      appContextSrc,
      /if \(product && Number\.isFinite\(item\.costPrice\) && item\.costPrice >= 0 && product\.costPrice !== Number\(item\.costPrice\)\) \{/
    );
    assert.match(appContextSrc, /costPrice: Number\(item\.costPrice\),/);
  });

  it('AddStockView.tsx: no remaining site reads Product.costPrice into an active purchase-cost field', () => {
    assert.doesNotMatch(addStockSrc, /newCost = String\(product\.costPrice\)/);
    assert.doesNotMatch(addStockSrc, /initialCost = String\(match\.costPrice\)/);
    assert.doesNotMatch(addStockSrc, /matchedProduct\.costPrice != null/);
    assert.doesNotMatch(addStockSrc, /matched\.costPrice != null/);
  });
});
