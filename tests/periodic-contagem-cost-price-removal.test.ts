// §44 — Periodic Contagem Cost-Price Removal. Authorized by
// docs/engineering/business-worth-evolution-periodic-contagem-cost-price-removal-implementation-authorization.md
// (SIGNED — SABUSHIMIKE MASCENI), per the Rule 8 Assessment (READY) and
// Implementation Plan for the same amendment. FR-71 through FR-77.
//
// SCOPE: proves (1) costBasisEstablished derivation at both authorized
// call sites (normalizeStockCountItems, tallyStockCountRows) — a direct
// pass-through of deriveCostContribution's own existing, already-tested
// `derived` value, no new calculation; (2) structural absence of every
// removed Owner-facing surface in PeriodicStockCountView.tsx (Cost Price
// inputs, the live cost-total/trend block, the per-row "Custo: X"
// caption, the receipt's Custo/Un column, the cost-side deviation
// warning); (3) structural presence of what must remain (Selling Price
// input/warning, the post-confirmation Selling Value headline, the
// history cost comparison, the receipt's governed Valor (Custo) total).
//
// This repository has no DOM/React render harness — established
// precedent (see tests/periodic-stock-cost-field-suppression.test.ts's
// own header). Source-structure checks only, mirroring that file's
// approach.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-cost-price-removal.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildProductCostBasisMap, type ProductCostBasis } from '../apps/tenant/src/lib/fr67CostBasisConversion';
import {
  normalizeStockCountItems,
  tallyStockCountRows,
  type StockCountInputItem,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship, Product } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

// Canonical three-level chain, matching this codebase's own established
// worked example: 1 Cx = 4 Emb = 24 Un (1 Emb = 6 Un).
const threeLevel: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

const basisFor = (relationship: UnitRelationship, purchaseCost: number): ProductCostBasis => ({
  purchaseUnit: relationship.units[0].unit,
  purchaseCost,
  relationship,
});

describe('costBasisEstablished — normalizeStockCountItems (persisted)', () => {
  it('is true for the purchase-unit portion when a valid governed basis exists (FR-72: extends to the purchase-unit portion itself)', () => {
    const map = new Map<string, ProductCostBasis>([['coca-cola', basisFor(threeLevel, 1250)]]);
    const items: StockCountInputItem[] = [{ productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 0 }];
    const result = normalizeStockCountItems(items, map);
    assert.equal(result.items[0].costBasisEstablished, true);
    assert.equal(result.items[0].totalValue, 3750); // 3 * 1250, governed, ignoring the (absent) raw cost
  });

  it('is true for a non-purchase-unit portion when a valid governed basis exists (pre-existing FR-67 behavior, unaffected)', () => {
    const map = new Map<string, ProductCostBasis>([['coca-cola', basisFor(threeLevel, 1250)]]);
    const items: StockCountInputItem[] = [{ productName: 'Coca-Cola', quantity: 24, unit: 'Un', costPrice: 0 }];
    const result = normalizeStockCountItems(items, map);
    assert.equal(result.items[0].costBasisEstablished, true);
  });

  it('is false when no valid governed basis exists for the product — costPrice is 0, never fabricated, but explicitly marked not established (FR-73)', () => {
    const items: StockCountInputItem[] = [{ productName: 'Produto Novo', quantity: 5, unit: 'un', costPrice: 0 }];
    const result = normalizeStockCountItems(items); // no costBasisByProductName at all
    assert.equal(result.items[0].costBasisEstablished, false);
    assert.equal(result.items[0].costPrice, 0);
    assert.equal(result.items[0].totalValue, 0);
  });

  it('is false, not absent, when a costBasisByProductName map is supplied but has no entry for this product (map present, product unknown to it)', () => {
    const map = new Map<string, ProductCostBasis>([['outro-produto', basisFor(threeLevel, 500)]]);
    const items: StockCountInputItem[] = [{ productName: 'Produto Novo', quantity: 5, unit: 'un', costPrice: 0 }];
    const result = normalizeStockCountItems(items, map);
    assert.equal(result.items[0].costBasisEstablished, false);
  });

  it('never derives from an Owner-typed raw costPrice when a governed basis exists — the raw value is ignored, matching FR-67\'s existing "do not trust the row" resolution', () => {
    const map = new Map<string, ProductCostBasis>([['coca-cola', basisFor(threeLevel, 1250)]]);
    // A stray non-zero costPrice can still arrive on this input shape
    // from a historical/legacy caller — normalizeStockCountItems must
    // still resolve costBasisEstablished/totalValue from the governed
    // basis alone, never from this value.
    const items: StockCountInputItem[] = [{ productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 999999 }];
    const result = normalizeStockCountItems(items, map);
    assert.equal(result.items[0].costBasisEstablished, true);
    assert.equal(result.items[0].totalValue, 3750); // still 3 * 1250, not 3 * 999999
  });
});

describe('costBasisEstablished — tallyStockCountRows (Owner-facing preview)', () => {
  const baseRow = (overrides: Partial<StockCountWorkingRow>): StockCountWorkingRow => ({
    productName: 'Coca-Cola',
    quantity: '3',
    unit: 'Cx',
    costPrice: '',
    sellingPrice: '1500',
    ...overrides,
  });

  it('is true for the purchase-unit portion when a valid governed basis exists — identical to the persisted path', () => {
    const map = new Map<string, ProductCostBasis>([['coca-cola', basisFor(threeLevel, 1250)]]);
    const result = tallyStockCountRows([baseRow({})], map);
    assert.equal(result.countedItems[0].costBasisEstablished, true);
    assert.equal(result.countedItems[0].purchaseValue, 3750);
  });

  it('is false when no basis is known — quantity and sellingValue remain fully computed regardless (FR-73: unknown cost never blocks the count)', () => {
    const result = tallyStockCountRows([baseRow({ productName: 'Produto Novo', unit: 'un', costPrice: '' })]);
    assert.equal(result.countedItems[0].costBasisEstablished, false);
    assert.equal(result.countedItems[0].costPrice, 0);
    assert.equal(result.countedItems[0].quantity, 3);
    assert.equal(result.countedItems[0].sellingValue, 4500); // 3 * 1500 — Selling Price unaffected
  });

  it('preview and persistence agree on costBasisEstablished for the identical input (Owner-facing preview and persisted Contagem can never disagree — same guarantee this file\'s sibling suite already establishes for costPrice/totalValue)', () => {
    const map = new Map<string, ProductCostBasis>([['coca-cola', basisFor(threeLevel, 1250)]]);
    const previewResult = tallyStockCountRows([baseRow({})], map);
    const persistedResult = normalizeStockCountItems(
      [{ productName: 'Coca-Cola', quantity: 3, unit: 'Cx', costPrice: 0, sellingPrice: 1500 }],
      map
    );
    assert.equal(previewResult.countedItems[0].costBasisEstablished, persistedResult.items[0].costBasisEstablished);
  });
});

describe('§44 — no Owner-editable Cost Price input remains in Periodic Contagem (FR-71)', () => {
  it('no input is bound to row.costPrice anywhere in the component source', () => {
    assert.doesNotMatch(periodicSrc, /value=\{row\.costPrice\}/);
  });

  it('no onChange handler ever sets costPrice from a row update (catalog or manual)', () => {
    assert.doesNotMatch(periodicSrc, /updateCatalogRow\(productId, \{ costPrice:/);
    assert.doesNotMatch(periodicSrc, /updateManualRow\(idx, \{ costPrice:/);
  });

  it('the "Compra/Un" JSX label no longer renders anywhere (surviving mentions, if any, are historical prose comments explaining the removal, not live markup)', () => {
    assert.doesNotMatch(periodicSrc, /<label className=\{fieldLabelClass\}>Compra\/Un/);
  });

  it('the Selling Price ("Venda/Un") input is unaffected — still present, still editable, exactly twice (catalog + manual)', () => {
    const sellingInputCount = (periodicSrc.match(/value=\{row\.sellingPrice\}/g) || []).length;
    assert.equal(sellingInputCount, 2);
  });
});

describe('§44 — live cost-total and "vs. Valor Esperado" trend indicator removed (FR-74, confirmed scope)', () => {
  it('"Valor Físico (Custo) Contado até Agora" no longer renders as JSX text (surviving mentions, if any, are historical prose comments explaining the removal)', () => {
    assert.doesNotMatch(periodicSrc, /<span[^>]*>Valor Físico \(Custo\) Contado até Agora<\/span>/);
  });

  it('the cost-basis "vs. Valor Esperado" trend variables (comparisonBaseline, diff, diffPct) no longer exist as declarations', () => {
    assert.doesNotMatch(periodicSrc, /const comparisonBaseline =/);
    assert.doesNotMatch(periodicSrc, /const diff = liveTally\.totalPurchaseValue/);
    assert.doesNotMatch(periodicSrc, /const diffPct =/);
  });

  it('"Valor de Venda Contado até Agora" (the selling-value hero figure) remains the sole live total', () => {
    assert.match(periodicSrc, /Valor de Venda Contado até Agora/);
    assert.match(periodicSrc, /liveTally\.totalSellingValue/);
  });
});

describe('§44 — Implementation Clarification: per-row "Custo: X" caption removed', () => {
  it('no "Custo: " caption is rendered per-row anywhere in the component', () => {
    assert.doesNotMatch(periodicSrc, /Custo: \{formatCurrency\(/);
    assert.doesNotMatch(periodicSrc, /Custo:\{' '\}/);
  });

  it('rowCostValue (the helper that only ever fed the removed per-row caption) no longer exists', () => {
    assert.doesNotMatch(periodicSrc, /const rowCostValue = /);
  });

  it('the per-row Selling Value figure remains — "Valor" label and rowSellingValue rendering are unaffected', () => {
    assert.match(periodicSrc, /rowSellingValue/);
  });
});

describe('§44 — post-confirmation headline is Selling Value (FR-75)', () => {
  it('the post-confirmation headline reads savedSellingTotal, not savedTotal', () => {
    const start = periodicSrc.indexOf('if (savedMessage) {');
    assert.notEqual(start, -1, 'Could not locate the post-confirmation success-screen render branch.');
    const end = periodicSrc.indexOf('produtos contados', start);
    const block = periodicSrc.slice(start, end);
    assert.match(block, /\{formatCurrency\(savedSellingTotal, currencySymbol\)\}/);
    assert.doesNotMatch(block, /\{formatCurrency\(savedTotal, currencySymbol\)\}/);
  });

  it('"Valor Físico Total (a custo)" no longer appears as the post-confirmation headline', () => {
    assert.doesNotMatch(periodicSrc, /Valor Físico Total \(a custo\)/);
  });

  it('savedTotal itself is preserved (still captured from recordStockCount) — only its use as the on-screen headline is removed, per the governed distinction between removing display and removing data', () => {
    assert.match(periodicSrc, /setSavedTotal\(saved\.totalValue\)/);
  });
});

describe('§44 — history cost comparison retained, unaffected (FR-76)', () => {
  it('count.totalValue and count.expectedValueAtCount are still rendered in the history list', () => {
    assert.match(periodicSrc, /formatCurrency\(count\.totalValue, currencySymbol\)/);
    assert.match(periodicSrc, /count\.expectedValueAtCount/);
    assert.match(periodicSrc, /vs\.\s*\{formatCurrency\(count\.expectedValueAtCount, currencySymbol\)\} esperado/);
  });

  it('the history list and the §22 reconciliation note remain separate, non-merged render regions (FR-76: not elevated above, not merged into)', () => {
    // The reconciliation note only ever renders inside the savedMessage
    // (post-confirmation) branch; the history list only ever renders in
    // the main (non-savedMessage) branch — structurally, they cannot
    // co-render, which is itself the "not merged" property.
    const reconciliationIndex = periodicSrc.indexOf('savedReconciliation && (() =>');
    const historyIndex = periodicSrc.indexOf("count.totalValue, currencySymbol)}");
    assert.notEqual(reconciliationIndex, -1);
    assert.notEqual(historyIndex, -1);
    const savedMessageBranchEnd = periodicSrc.indexOf('if (savedMessage) {') === -1
      ? -1
      : periodicSrc.indexOf('\n  }\n\n  return (', periodicSrc.indexOf('if (savedMessage) {'));
    assert.ok(savedMessageBranchEnd !== -1, 'Could not locate the end of the savedMessage render branch.');
    assert.ok(reconciliationIndex < savedMessageBranchEnd, 'Reconciliation note must be inside the savedMessage branch.');
    assert.ok(historyIndex > savedMessageBranchEnd, 'History list must be outside (after) the savedMessage branch.');
  });
});

describe('§44 — receipt: Custo/Un removed, Valor (Custo) retained as governed data (Implementation Clarification)', () => {
  it('the receipt table no longer has a "Custo/Un" column', () => {
    assert.doesNotMatch(periodicSrc, /'Custo\/Un'/);
  });

  it('the receipt table still has "Valor (Custo)" — a real, governed, derived total, not an Owner-input presentation', () => {
    assert.match(periodicSrc, /'Valor \(Custo\)'/);
  });

  it('the receipt row mapping no longer reads item.costPrice (the raw, now-permanently-0 per-unit figure) but still reads item.purchaseValue (the governed derived total)', () => {
    const start = periodicSrc.indexOf("title: 'Produtos Contados'");
    const end = periodicSrc.indexOf('notCountedProductNames.length > 0', start);
    const block = periodicSrc.slice(start, end);
    assert.doesNotMatch(block, /formatCurrency\(item\.costPrice, currencySymbol\)/);
    assert.match(block, /formatCurrency\(item\.purchaseValue, currencySymbol\)/);
  });

  it('the receipt KPI list still includes "Valor Físico (Custo)" — the governed aggregate total, unaffected by the Owner-input removal', () => {
    assert.match(periodicSrc, /label: 'Valor Físico \(Custo\)', value: formatCurrency\(savedTotal, currencySymbol\)/);
  });
});

describe('§44 — Selling Price input, Mode A, Mode B, multiple portions unaffected', () => {
  it('deriveModeAPortionValuations / Mode A import is unchanged', () => {
    // [FR-89–FR-94, Implementation Authorization §2 item 4] Import
    // updated to include resolveDefaultSellingConfigurationForRow —
    // deriveModeAPortionValuations/canApplyModeA/ContagemPortionQuantity
    // remain imported from the same, unmodified module.
    assert.match(periodicSrc, /import \{ deriveModeAPortionValuations, canApplyModeA, resolveDefaultSellingConfigurationForRow, type ContagemPortionQuantity \} from '\.\.\/lib\/contagemMultiUnitValuation';/);
  });

  it('getConversionFactor / unit-relationship import is unchanged', () => {
    assert.match(periodicSrc, /import \{ getConversionFactor \} from '\.\.\/lib\/purchaseToSellingConversion';/);
  });
});

// Issue 2 — Periodic Contagem Live Selling-Price Readability (this is the
// UI/implementation correction, not a §44 continuation — no new BDR,
// Policy, Specification amendment, Rule 8 Assessment, Implementation
// Plan, or Implementation Authorization applies; see the read-only
// investigation's own classification). Proves: (1) the live Valor box no
// longer permits mid-number wrapping; (2) rowGridClass's declared grid
// columns match the row's actual post-§44 cell count (no leftover
// Cost-Price-sized track); (3) the Selling Price deviation warning is
// still present and untouched; (4) the Selling Value calculation itself
// is unchanged.
describe('Issue 2 — Periodic Contagem live Selling-Price readability', () => {
  it('the live Valor/Selling Value display no longer uses break-words', () => {
    assert.doesNotMatch(periodicSrc, /break-words/);
  });

  it('the live Valor/Selling Value display uses whitespace-nowrap so a currency value cannot split mid-number', () => {
    const occurrences = periodicSrc.match(/tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis/g) ?? [];
    // One for the catalog-row Valor box, one for the manual-row Valor box.
    assert.equal(occurrences.length, 2);
  });

  it('rowGridClass no longer declares the obsolete seven-track (pre-§44, Cost-Price-inclusive) template', () => {
    assert.doesNotMatch(periodicSrc, /sm:grid-cols-\[minmax\(0,2fr\)_84px_76px_112px_112px_120px_28px\]/);
  });

  it('rowGridClass declares exactly five tracks, matching the row\'s five actual top-level cells (Nome, Qtd, Unid, Venda\\/Un, Valor+ações)', () => {
    const match = periodicSrc.match(/const rowGridClass = 'grid grid-cols-2 sm:grid-cols-\[([^\]]+)\]/);
    assert.ok(match, 'Could not locate rowGridClass declaration.');
    const tracks = match![1].split('_');
    assert.equal(tracks.length, 5, `Expected 5 grid tracks, found ${tracks.length}: ${match![1]}`);
  });

  it('every full-row span (ModeAValuationControl, NewProductInfoPanel, ExistingProductSummary, multi-portion label) now spans col-span-5, not the stale col-span-7', () => {
    assert.doesNotMatch(periodicSrc, /col-span-2 sm:col-span-7/);
    const fullRowSpans = periodicSrc.match(/col-span-2 sm:col-span-5/g) ?? [];
    assert.equal(fullRowSpans.length, 4, `Expected 4 full-row col-span-5 spans, found ${fullRowSpans.length}.`);
  });

  it('the Selling Price deviation warning (checkPriceDeviation against the remembered selling price) is still present, unaffected by the layout fix', () => {
    assert.match(periodicSrc, /checkPriceDeviation\(parseFloat\(row\.sellingPrice\), getRememberedPriceForRow\(row, 'selling'\)\)/);
  });

  it('the catalog-row Selling Value figure is still rendered via formatCurrency(rowSellingValue, currencySymbol) — calculation untouched', () => {
    assert.match(periodicSrc, /\{isBlank \? 'Não contado' : formatCurrency\(rowSellingValue, currencySymbol\)\}/);
  });

  it('the manual-row Selling Value figure is still quantity × sellingPrice — calculation untouched', () => {
    assert.match(
      periodicSrc,
      /formatCurrency\(\s*\(Number\(row\.quantity\) \|\| 0\) \* \(Number\(row\.sellingPrice\) \|\| 0\),\s*currencySymbol\s*\)/
    );
  });
});
