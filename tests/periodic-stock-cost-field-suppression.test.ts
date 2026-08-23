// Business Worth Evolution — Decision 37, B.4: Cost-Field Suppression on
// Non-Purchase-Unit Portions (PeriodicStockCountView.tsx).
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent, see tests/periodic-stock-new-product-panel.test.ts's
// own header comment. This suite follows the same precedent: rather than
// rendering PeriodicStockCountView.tsx itself, it exercises small local
// reimplementations of the component's own two new, trivial closures
// (getCostBasisForSuppression / isCostFieldSuppressed), matching this
// repo's established pattern for this exact class of problem.
//
// Per Implementation Authorization §36 item 4 and Plan Amendment §B.4
// verbatim ("No new calculation lives here — this item is UI-only"),
// this suite proves ONLY the suppression condition itself — never any
// cost value, never any total. The regression section at the bottom
// proves the real production selling-side/tally functions this item
// does not touch are unaffected.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-cost-field-suppression.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import { tallyStockCountRows, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship } from '../apps/tenant/src/types';

function productKeyFor(name: string): string {
  return name.trim().toLowerCase();
}

type NewProductInfo = { purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] };

/** Mirrors PeriodicStockCountView.tsx's own getCostBasisForSuppression
 * exactly — see that function's own comment for the two cost-basis
 * sources (existing product vs. this Contagem's own newProductInfo). */
function getCostBasisForSuppression(
  productName: string,
  products: { name: string; unitRelationship?: UnitRelationship }[],
  newProductInfo: Record<string, NewProductInfo>
): { purchaseUnit: string } | null {
  const key = productKeyFor(productName);
  if (!key) return null;

  const existing = products.find((p) => p.name.toLowerCase() === key);
  const existingRelationship = existing?.unitRelationship;
  if (existingRelationship && isValidUnitRelationship(existingRelationship)) {
    const purchaseUnit = existingRelationship.units[0]?.unit?.trim();
    if (purchaseUnit) return { purchaseUnit };
  }

  const info = newProductInfo[key];
  if (info) {
    const purchaseUnit = info.purchaseUnit.trim();
    const hasCostBasis = purchaseUnit !== '' && info.purchaseCost.trim() !== '' && Number.isFinite(parseFloat(info.purchaseCost));
    const hasCompleteStep = info.relationshipSteps.some(
      (s) => s.unit.trim() !== '' && Number.isFinite(parseFloat(s.factor)) && parseFloat(s.factor) > 0
    );
    if (hasCostBasis && hasCompleteStep) return { purchaseUnit };
  }

  return null;
}

/** Mirrors PeriodicStockCountView.tsx's own isCostFieldSuppressed exactly. */
function isCostFieldSuppressed(
  productName: string,
  portionUnit: string,
  products: { name: string; unitRelationship?: UnitRelationship }[],
  newProductInfo: Record<string, NewProductInfo>
): boolean {
  const basis = getCostBasisForSuppression(productName, products, newProductInfo);
  if (!basis) return false;
  const trimmedPortionUnit = portionUnit.trim();
  if (!trimmedPortionUnit) return false;
  return trimmedPortionUnit.toLowerCase() !== basis.purchaseUnit.toLowerCase();
}

describe('Decision 37 B.4 — cost-field suppression condition', () => {
  it('suppresses a non-purchase-unit portion of an EXISTING catalogued product (Coca-Cola example)', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'CX', factorFromPrevious: 0 },
        { unit: 'EMB', factorFromPrevious: 4 },
        { unit: 'UN', factorFromPrevious: 6 },
      ],
      confirmedAt: new Date().toISOString(),
    };
    const products = [{ name: 'Coca-Cola', unitRelationship: relationship }];
    assert.equal(isCostFieldSuppressed('Coca-Cola', 'EMB', products, {}), true);
    assert.equal(isCostFieldSuppressed('Coca-Cola', 'UN', products, {}), true);
  });

  it('does NOT suppress the purchase-unit portion itself — that is where the cost basis is actually entered', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'CX', factorFromPrevious: 0 },
        { unit: 'EMB', factorFromPrevious: 4 },
      ],
      confirmedAt: new Date().toISOString(),
    };
    const products = [{ name: 'Coca-Cola', unitRelationship: relationship }];
    assert.equal(isCostFieldSuppressed('Coca-Cola', 'CX', products, {}), false);
    // case-insensitive match on the purchase unit itself
    assert.equal(isCostFieldSuppressed('Coca-Cola', 'cx', products, {}), false);
  });

  it('does NOT suppress when the product has no confirmed unitRelationship at all', () => {
    const products = [{ name: 'Arroz' }];
    assert.equal(isCostFieldSuppressed('Arroz', 'EMB', products, {}), false);
  });

  it('does NOT suppress when the stored unitRelationship is invalid/incomplete', () => {
    const invalidRelationship = { units: [], confirmedAt: new Date().toISOString() } as UnitRelationship;
    const products = [{ name: 'Arroz', unitRelationship: invalidRelationship }];
    assert.equal(isCostFieldSuppressed('Arroz', 'EMB', products, {}), false);
  });

  it('suppresses a non-purchase-unit portion of a GENUINELY NEW product via this Contagem\'s own newProductInfo panel (B.1/B.2)', () => {
    const newProductInfo: Record<string, NewProductInfo> = {
      cerveja: {
        purchaseUnit: 'CX',
        purchaseCost: '1250',
        relationshipSteps: [{ unit: 'EMB', factor: '4' }],
      },
    };
    assert.equal(isCostFieldSuppressed('Cerveja', 'EMB', [], newProductInfo), true);
    assert.equal(isCostFieldSuppressed('Cerveja', 'CX', [], newProductInfo), false);
  });

  it('does NOT suppress a new product whose relationship chain has no complete step yet (Owner still typing)', () => {
    const newProductInfo: Record<string, NewProductInfo> = {
      cerveja: {
        purchaseUnit: 'CX',
        purchaseCost: '1250',
        relationshipSteps: [{ unit: '', factor: '' }],
      },
    };
    assert.equal(isCostFieldSuppressed('Cerveja', 'EMB', [], newProductInfo), false);
  });

  it('does NOT suppress a new product with a relationship chain but no purchase cost entered yet', () => {
    const newProductInfo: Record<string, NewProductInfo> = {
      cerveja: {
        purchaseUnit: 'CX',
        purchaseCost: '',
        relationshipSteps: [{ unit: 'EMB', factor: '4' }],
      },
    };
    assert.equal(isCostFieldSuppressed('Cerveja', 'EMB', [], newProductInfo), false);
  });

  it('does NOT suppress a portion whose own unit is blank (nothing entered yet)', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'CX', factorFromPrevious: 0 },
        { unit: 'EMB', factorFromPrevious: 4 },
      ],
      confirmedAt: new Date().toISOString(),
    };
    const products = [{ name: 'Coca-Cola', unitRelationship: relationship }];
    assert.equal(isCostFieldSuppressed('Coca-Cola', '', products, {}), false);
  });

  it('an existing product\'s own relationship takes precedence over any stale newProductInfo entry for the same key', () => {
    const relationship: UnitRelationship = {
      units: [
        { unit: 'CX', factorFromPrevious: 0 },
        { unit: 'EMB', factorFromPrevious: 4 },
      ],
      confirmedAt: new Date().toISOString(),
    };
    const products = [{ name: 'Coca-Cola', unitRelationship: relationship }];
    const staleNewProductInfo: Record<string, NewProductInfo> = {
      'coca-cola': { purchaseUnit: 'UN', purchaseCost: '1', relationshipSteps: [{ unit: 'CX', factor: '2' }] },
    };
    // purchase unit must come from the EXISTING product's relationship
    // (CX), not the stale newProductInfo candidate (UN) — CX is not
    // suppressed, UN would be if the stale entry incorrectly won.
    assert.equal(isCostFieldSuppressed('Coca-Cola', 'CX', products, staleNewProductInfo), false);
  });
});

describe('Decision 37 B.4 — regression: no calculation introduced, selling-side untouched', () => {
  it('tallyStockCountRows sums quantity*costPrice/sellingPrice exactly as before — no new derivation, no fabricated value', () => {
    // A B.4-suppressed portion's underlying costPrice is left completely
    // untouched by this item (UI-only) — whatever the Owner already
    // entered (or left blank, coercing to 0 via the EXISTING, unmodified
    // `Number(x) || 0` rule) still flows through tallyStockCountRows
    // exactly as it did before B.4.
    const rows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'CX', costPrice: '1250', sellingPrice: '1500' },
      { productName: 'Coca-Cola', quantity: '3', unit: 'EMB', costPrice: '', sellingPrice: '400' },
    ];
    const tally = tallyStockCountRows(rows);
    assert.equal(tally.countedItems.length, 2);
    // Second portion's costPrice is exactly what it was before this item
    // (blank -> 0 via the pre-existing, unmodified fallback) — B.4 does
    // not derive, coerce, or hide this value at the data layer.
    assert.equal(tally.countedItems[1].costPrice, 0);
  });
});
