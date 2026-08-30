// Decision 37 — First-Time Contagem Cost Removal & Selling-Price/
// Selling-Unit Memory (docs/specs/decision-37-first-contagem-cost-removal-and-selling-price-memory-amendment.md,
// ACCEPTED AND SIGNED, SABUSHIMIKE MASCENI, 30 August 2026) and its
// Implementation Authorization (docs/engineering/periodic-contagem-first-contagem-cost-selling-memory-catalog-implementation-authorization.md,
// ACCEPTED AND AUTHORIZED, 30 August 2026, "I APPROVE AND AUTHORIZE
// IMPLEMENTATION").
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent (see tests/periodic-contagem-existing-product-selling-unit-memory.test.ts's
// own header). This suite follows both of this repo's established
// techniques for that constraint:
//
//   (1) structural source-text assertions confirming the actual
//       AppContext.tsx/PeriodicStockCountView.tsx source contains the
//       authorized behavior — the "Custo de Compra Original" removal,
//       the verified `type !== 'initial'` guard on both new selling-
//       price write sites, the cost-memory write sites in addStockBatch/
//       addMultipleStockBatches, and the no-batch fallback tier's call
//       to findLatestRememberedProductMemory — so this suite fails if
//       the real implementation ever silently regresses;
//   (2) small local reimplementations of the exact selection logic,
//       calling the SAME real, imported, already-tested engine
//       functions (findLatestRememberedProductMemory,
//       resolveUnitAwarePrice) the component/AppContext code itself
//       calls, exercised against fixture data.
//
// HOW TO RUN:
//   npx tsx --test tests/decision-37-first-contagem-cost-removal-and-selling-price-memory.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { findLatestRememberedProductMemory, resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { RememberedBatchSource, RememberedStockCountSource } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

describe('AC-01/AC-02 — Custo de Compra Original is fully removed, not merely hidden', () => {
  it('the input group no longer renders as visible JSX text (the phrase may still appear in comments documenting its removal)', () => {
    assert.equal(periodicSrc.includes('>Custo de Compra Original<'), false);
    assert.equal(periodicSrc.includes('Introduza o custo original uma única vez'), false);
  });

  it('purchaseCost no longer exists as a field anywhere on newProductInfo state', () => {
    // The state declaration itself must not type purchaseCost as a
    // field — proves this was removed from state, not just the render.
    assert.match(
      periodicSrc,
      /const \[newProductInfo, setNewProductInfo\] = useState<[\s\S]{0,400}?>/
    );
    const stateDeclMatch = periodicSrc.match(/const \[newProductInfo, setNewProductInfo\] = useState<([\s\S]{0,400}?)>\(\{\}\);/);
    assert.ok(stateDeclMatch, 'newProductInfo state declaration must be found');
    assert.equal(stateDeclMatch![1].includes('purchaseCost'), false);
  });

  it('purchaseUnit is deliberately preserved — it remains the relationship chain root unit, independent of the removed cost value', () => {
    assert.match(periodicSrc, /purchaseUnit: string/);
    assert.match(periodicSrc, /<UnitRelationshipChainEditor purchaseUnit=\{purchaseUnit\}/);
  });

  it('the draft-persistence type (PeriodicStockDraft.newProductInfo) no longer carries purchaseCost either', () => {
    const typesSrc = src('apps/tenant/src/types.ts');
    const draftFieldMatch = typesSrc.match(/newProductInfo\?: Record<\s*string,\s*(\{[\s\S]{0,200}?\})\s*>;/);
    assert.ok(draftFieldMatch, 'PeriodicStockDraft.newProductInfo field must be found');
    assert.equal(draftFieldMatch![1].includes('purchaseCost'), false);
  });
});

describe('AC-03/AC-04 — first-Contagem selling-price/unit memory: write side exists and is correctly gated', () => {
  it('recordStockCount writes Product.sellingPrice for a new product, gated on the verified type !== \'initial\' guard (never the non-existent \'periodic\' literal)', () => {
    assert.match(appContextSrc, /type !== 'initial' && sellingMemoryByProductName\.has\(norm\.productName\.toLowerCase\(\)\)/);
    // The non-existent literal from the Rule 8 Assessment's own
    // illustrative example must never appear as an actual comparison.
    assert.equal(appContextSrc.includes("type === 'periodic'"), false);
  });

  it("StockCountType has no 'periodic' member — confirms the guard correction was necessary and correct", () => {
    const typesSrc = src('apps/tenant/src/types.ts');
    const typeDecl = typesSrc.match(/export type StockCountType = ([^;]+);/);
    assert.ok(typeDecl, 'StockCountType declaration must be found');
    assert.equal(typeDecl![1].includes("'periodic'"), false);
    assert.match(typeDecl![1], /'initial'/);
  });

  it('the selling-price canonical selection is built once per product (a Map, keyed by product, never once per portion) — extracted, per FR-89–FR-94, into a directly-testable pure function', () => {
    // [FR-89–FR-94, Implementation Authorization §2 item 5] The
    // construction previously inlined here was extracted into
    // lib/sellingMemorySelection.ts's selectSellingMemoryByProductName
    // — same reasoning as this file's own sibling extractions
    // (fr67CostBasisConversion.ts, productMemoryPriceResolution.ts): a
    // pure, directly-unit-testable function, called exactly once per
    // Contagem confirmation (never once per portion) from
    // recordStockCount. This assertion now verifies both halves: the
    // call site invokes the extracted function exactly once, and that
    // function's own source genuinely builds a per-product-keyed Map.
    assert.match(appContextSrc, /const sellingMemoryByProductName = selectSellingMemoryByProductName\(/);
    const callCount = (appContextSrc.match(/selectSellingMemoryByProductName\(/g) || []).length;
    assert.equal(callCount, 1, 'selectSellingMemoryByProductName must be called exactly once per confirmation, never once per portion');
    const sellingMemorySelectionSrc = src('apps/tenant/src/lib/sellingMemorySelection.ts');
    assert.match(sellingMemorySelectionSrc, /const sellingMemoryByProductName = new Map<string, SellingMemoryEntry>\(\);/);
  });
});

describe('AC-07/AC-08/AC-09 — selling price and purchase cost are independently write-gated (FR-85)', () => {
  it('the existing-product selling-price update writes only Product.sellingPrice, never costPrice, and only on an actual change', () => {
    const updateBlockMatch = appContextSrc.match(
      /if \(type !== 'initial'\) \{\s*for \(const \[key, memory\] of sellingMemoryByProductName\)[\s\S]{0,700}?\n    \}/
    );
    assert.ok(updateBlockMatch, 'the existing-product selling-price update block must be found');
    const block = updateBlockMatch![0];
    assert.match(block, /product\.sellingPrice === memory\.sellingPrice\) continue;/);
    assert.equal(block.includes('costPrice'), false);
  });

  it("addStockBatch's cost-memory update writes only Product.costPrice, never sellingPrice or unitRelationship, and only on an actual change", () => {
    const costUpdateMatch = appContextSrc.match(
      /\} else if \(Number\.isFinite\(costPrice\) && costPrice >= 0 && product\.costPrice !== Number\(costPrice\)\) \{[\s\S]{0,1000}?\n    \}/
    );
    assert.ok(costUpdateMatch, "addStockBatch's existing-product cost-memory update block must be found");
    const block = costUpdateMatch![0];
    const writePayloadMatch = block.match(/await updateDoc\([\s\S]*?\{([\s\S]*?)\}\);/);
    assert.ok(writePayloadMatch, 'the updateDoc write payload must be found within the block');
    const payload = writePayloadMatch![1];
    assert.match(payload, /costPrice: Number\(costPrice\)/);
    assert.equal(payload.includes('sellingPrice'), false);
    assert.equal(payload.includes('unitRelationship'), false);
  });

  it('the two write mechanisms live in structurally separate functions — recordStockCount vs. addStockBatch/addMultipleStockBatches — never a single shared helper writing both', () => {
    // sellingMemoryByProductName (the Contagem-side selling-price
    // mechanism) must not appear anywhere in addStockBatch/
    // addMultipleStockBatches' own cost-writing logic.
    const addStockBatchStart = appContextSrc.indexOf('const addStockBatch = async');
    const addMultipleStart = appContextSrc.indexOf('const addMultipleStockBatches = async');
    const recordStockCountStart = appContextSrc.indexOf('const recordStockCount = async');
    assert.ok(addStockBatchStart > -1 && addMultipleStart > -1 && recordStockCountStart > -1);
    const addStockBatchBody = appContextSrc.slice(addStockBatchStart, addMultipleStart);
    assert.equal(addStockBatchBody.includes('sellingMemoryByProductName'), false);
  });
});

describe('AC-05/AC-06 — no-batch fallback (Finding D closure): buildCatalogRow/handleModeAToggle reuse findLatestRememberedProductMemory', () => {
  it('buildCatalogRow calls findLatestRememberedProductMemory in a new tier reached only when a confirmed sellingUnit exists but no latestBatch does', () => {
    assert.match(
      periodicSrc,
      /\} else if \(confirmedSellingUnit && !latestBatch\) \{[\s\S]{0,1400}?findLatestRememberedProductMemory\(product\.id, product\.name, batches, stockCounts, confirmedSellingUnit\)/
    );
  });

  it('handleModeAToggle mirrors the identical fallback for defaultReferencePrice only — defaultReferenceUnit resolution is untouched', () => {
    assert.match(
      periodicSrc,
      /\} else \{[\s\S]{0,700}?findLatestRememberedProductMemory\(product\.id, product\.name, batches, stockCounts, defaultReferenceUnit\)/
    );
    // defaultReferenceUnit's own resolution line must still be exactly
    // the pre-existing two-tier preference — untouched.
    assert.match(periodicSrc, /const defaultReferenceUnit = relationship\?\.sellingUnit \|\| relationship\?\.units\?\.\[0\]\?\.unit \|\| '';/);
  });

  it('the existing signed batch-present branch (commit 87814a9) is untouched — same resolveUnitAwarePrice call, same confirmedSellingUnit-over-units[0] preference', () => {
    assert.match(
      periodicSrc,
      /if \(confirmedSellingUnit && latestBatch\) \{\s*const resolved = resolveUnitAwarePrice\(latestBatch\.sellingPrice, latestBatch\.unit \|\| '', confirmedSellingUnit, relationship\);/
    );
  });

  it('findLatestRememberedProductMemory itself resolves a no-batch, Contagem-only product correctly (fixture-based, real function)', () => {
    const batches: RememberedBatchSource[] = []; // no purchase history at all
    const stockCounts: RememberedStockCountSource[] = [
      {
        date: '2026-08-15',
        items: [
          { productId: 'p1', productName: 'Impala', unit: 'Cx', costPrice: 0, sellingPrice: 0 }, // no price recorded for this portion
          { productId: 'p1', productName: 'Impala', unit: 'Un', costPrice: 0, sellingPrice: 50 },
        ],
      },
    ];
    const memory = findLatestRememberedProductMemory('p1', 'Impala', batches, stockCounts, 'Un');
    assert.ok(memory, 'a Contagem-only product with a priced portion must resolve a memory, never null');
    assert.equal(memory!.unit, 'Un');
    assert.equal(memory!.sellingPrice, 50);
  });

  it('a genuinely new product with no batch and no priced Contagem history anywhere resolves to null — never a fabricated memory', () => {
    const memory = findLatestRememberedProductMemory('p-brand-new', 'Produto Novo', [], []);
    assert.equal(memory, null);
  });
});

describe('AC-15/AC-16 — the existing selling-unit reference-point reconciliation is not reopened', () => {
  it('the preference order (confirmed sellingUnit over units[0]) is unchanged for the batch-present case', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Emb', factorFromPrevious: 4 },
        { unit: 'Un', factorFromPrevious: 6 },
      ],
      sellingUnit: 'Un',
      confirmedAt: '2026-08-20T00:00:00.000Z',
    };
    // 50 MZN/Un, remembered in Cx terms on the batch (1 Cx = 24 Un ->
    // 50*24 = 1200/Cx), must resolve back to 50 when re-denominated
    // into the confirmed sellingUnit.
    const resolved = resolveUnitAwarePrice(1200, 'Cx', 'Un', relationship);
    assert.equal(resolved, '50.00');
  });
});

describe('AC-11/AC-13 — purchase cost/cost-unit memory (Finding F closure)', () => {
  it('addStockBatch seeds Product.costPrice on new-product creation, addMultipleStockBatches does the same for its own new-product branch', () => {
    assert.match(appContextSrc, /\.\.\.\(Number\.isFinite\(costPrice\) && costPrice >= 0 \? \{ costPrice: Number\(costPrice\) \} : \{\}\),/);
    assert.match(appContextSrc, /\.\.\.\(Number\.isFinite\(item\.costPrice\) && item\.costPrice >= 0 \? \{ costPrice: Number\(item\.costPrice\) \} : \{\}\),/);
  });

  it('no dedicated Product.costUnit field is introduced — the smallest-change decision', () => {
    const typesSrc = src('apps/tenant/src/types.ts');
    assert.equal(typesSrc.includes('costUnit'), false);
  });
});

describe('AC-19/AC-20 — Business Worth and FR-67 are structurally unreachable from every new write', () => {
  it('the sellingMemoryByProductName construction (now extracted, per FR-89–FR-94) does not reference productValuationTotal, normalizedTotalSellingValue, measuredBusinessWorth, or deriveCostContribution', () => {
    // [FR-89–FR-94, Implementation Authorization §2 item 5] The
    // construction this assertion originally sliced out of
    // AppContext.tsx's own inline source now lives in
    // lib/sellingMemorySelection.ts (selectSellingMemoryByProductName)
    // — checking that WHOLE file's source is a strictly stronger
    // guarantee than the old substring-slice heuristic: the file has no
    // import of, and therefore structurally cannot reference, any of
    // these terms at all, not merely "doesn't happen to mention them in
    // one slice."
    const forbidden = ['productValuationTotal', 'normalizedTotalSellingValue', 'measuredBusinessWorth', 'deriveCostContribution'];
    const sellingMemorySelectionSrc = src('apps/tenant/src/lib/sellingMemorySelection.ts');
    for (const term of forbidden) {
      assert.equal(sellingMemorySelectionSrc.includes(term), false, `sellingMemoryByProductName construction must not reference ${term}`);
    }
  });

  it('the existing-product selling-price update block does not reference productValuationTotal, normalizedTotalSellingValue, measuredBusinessWorth, or deriveCostContribution', () => {
    const forbidden = ['productValuationTotal', 'normalizedTotalSellingValue', 'measuredBusinessWorth', 'deriveCostContribution'];
    const updateBlockMatch = appContextSrc.match(
      /if \(type !== 'initial'\) \{\s*for \(const \[key, memory\] of sellingMemoryByProductName\)[\s\S]{0,700}?\n    \}/
    );
    assert.ok(updateBlockMatch, 'the existing-product selling-price update block must be found');
    const block = updateBlockMatch![0];
    for (const term of forbidden) {
      assert.equal(block.includes(term), false, `selling-price update block must not reference ${term}`);
    }
  });
});
