// [Bug fixes — found while investigating an Owner report: "photo
// loaded, products loaded well, but selling price/unit remained
// empty, and no caption appeared under the price field at all"]
//
// Two separate, real gaps were found and fixed:
//
// 1. The "Preço da memória do produto" / "Sem preço memorizado para
//    esta unidade" caption — which would have told the Owner directly
//    why the price was empty — existed only in the desktop table
//    layout. On a phone (the mobile stacked layout, which is what the
//    Owner was actually using), it never appeared at all, regardless
//    of what happened internally. This alone fully explains "no text
//    appeared under the price field."
//
// 2. handleConfirmSupplierWordingCandidate (confirming a "could this
//    be the same product?" suggestion) never re-ran the Product Memory
//    price lookup at all, unlike every other path that resolves a row
//    to an existing product (buildRowFromProposalLineItem's exact-match
//    branch, handleSelectProductForTool). A confirmed candidate got its
//    name/id updated but never its price.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-unit-aware-price-rederivation.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-mobile-caption-and-candidate-price-fill.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('Bug fix 1 — the memory/not-found caption now exists in BOTH layouts', () => {
  it('sellingPriceFromMemory/sellingPriceNotFound appears exactly twice — once per layout, not just the desktop table', () => {
    const fromMemoryCount = (addStockSrc.match(/t\('addStock\.smartEntry\.sellingPriceFromMemory'\)/g) || []).length;
    const notFoundCount = (addStockSrc.match(/t\('addStock\.smartEntry\.sellingPriceNotFound'\)/g) || []).length;
    assert.equal(fromMemoryCount, 2, 'Expected the caption in both the desktop and mobile layouts');
    assert.equal(notFoundCount, 2, 'Expected the caption in both the desktop and mobile layouts');
  });

  it('both occurrences are gated identically on row.smartEntrySource === \'ai\' — never shown for a manually-typed row', () => {
    const gateCount = (addStockSrc.match(/row\.smartEntrySource === 'ai' && \(/g) || []).length;
    assert.equal(gateCount, 2);
  });

  it('both occurrences use the same color logic (gold when filled, amber+bold when not) — no visual drift between layouts', () => {
    const colorLogicCount = (addStockSrc.match(/row\.sellingPrice \? 'text-\[#8A6D1F\]' : 'text-amber-600 font-semibold'/g) || []).length;
    assert.equal(colorLogicCount, 2);
  });
});

describe('Bug fix 2 — confirming a supplier-wording candidate now fills price from memory', () => {
  it('handleConfirmSupplierWordingCandidate calls findLatestRememberedProductMemory, not just updating productName/id', () => {
    const start = addStockSrc.indexOf('const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /findLatestRememberedProductMemory\(/);
    assert.match(body, /isValidUnitRelationship\(matchedProduct\.unitRelationship\)/);
  });

  it('sellingPrice always fills from memory when found — it was never proposed by the scan, so there is nothing to protect by leaving it blank', () => {
    const start = addStockSrc.indexOf('const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /resolveUnitAwarePrice\(memory\.sellingPrice, memory\.unit, row\.unit, matchedProduct\.unitRelationship\)/);
  });

  it('costPrice only fills from memory when the row does not already have one — the receipt\'s own reading keeps priority, matching every other fill site in this file', () => {
    const start = addStockSrc.indexOf('const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /if \(!costPrice\) \{\s*const resolvedCost = resolveUnitAwarePrice\(memory\.costPrice,/);
  });

  it('falls back to the Product\'s own static reference price when no batch/StockCount memory exists, matching the other two fill sites\' own fallback tier', () => {
    const start = addStockSrc.indexOf('const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /matchedProduct\.costPrice != null/);
    assert.match(body, /matchedProduct\.sellingPrice != null/);
  });

  it('sets the AutoFilled/BasisUnit tracking fields when a fill happens — so a later unit change still re-derives correctly, and the price-deviation check still recognizes this as memory-sourced', () => {
    const start = addStockSrc.indexOf('const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /sellingPriceAutoFilled = true;/);
    assert.match(body, /costPriceAutoFilled = true;/);
    assert.match(body, /sellingPriceBasisUnit = row\.unit;/);
    assert.match(body, /costPriceBasisUnit = row\.unit;/);
  });

  it('updateRow\'s call still sets productName/previousCycleQuantity/pendingSupplierWording — the pre-existing behavior is preserved, not replaced', () => {
    const start = addStockSrc.indexOf('const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /productName: matchedProduct\.name,/);
    assert.match(body, /previousCycleQuantity,/);
    assert.match(body, /pendingSupplierWording: \{/);
    assert.match(body, /origin: 'confirmed',/);
  });
});
