// [Feature — unit-aware price re-derivation on manual unit change,
// AddStockView.tsx's own handleUnitChange] Owner-requested: keep using
// Product Memory to auto-fill price and drive all calculations, but
// remain free to edit the row's unit afterward (e.g. switch to Emb
// instead of Cx) and still get correct results — reusing the exact
// same resolveUnitAwarePrice conversion the initial auto-fill already
// uses, never a second, independently-invented calculation.
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent (see tests/product-memory-price-resolution.test.ts's
// own header, tests/periodic-stock-existing-product-summary.test.ts's
// own header). This suite follows both established techniques: (1) a
// local reimplementation of handleUnitChange's own decision logic,
// built directly on the REAL, imported resolveUnitAwarePrice (never a
// second conversion formula), exercised against fixture inputs, and
// (2) structural source-text assertions confirming the four call
// sites (desktop + mobile unit inputs, popover buttons, price inputs)
// are actually wired to this behavior in the real component.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-unit-aware-price-rederivation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

// Same canonical chain as the Owner's own worked example: 1 Cx = 4 Emb
// = 24 Un (24 Un total per Cx: 4 Emb/Cx * 6 Un/Emb).
const heineken: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-24T00:00:00.000Z',
};

/** Mirrors handleUnitChange's own decision logic exactly — built on
 * the REAL resolveUnitAwarePrice, never a duplicated conversion
 * formula. Duplicated here only as a small test fixture, matching
 * this repo's own established pattern for this exact class of
 * problem. Returns the row's own next costPrice/sellingPrice/
 * *AutoFilled/*BasisUnit state, the same shape handleUnitChange's own
 * `updates` object produces. */
function simulateUnitChange(
  row: {
    costPrice: string;
    sellingPrice: string;
    costPriceAutoFilled: boolean;
    sellingPriceAutoFilled: boolean;
    costPriceBasisUnit?: string;
    sellingPriceBasisUnit?: string;
    unit: string;
  },
  newUnit: string,
  relationship: UnitRelationship | undefined
) {
  if (row.unit.trim().toLowerCase() === newUnit.trim().toLowerCase()) {
    return { ...row, unit: newUnit };
  }
  const next = { ...row, unit: newUnit };
  if (row.costPriceAutoFilled && row.costPrice !== '') {
    const basisUnit = row.costPriceBasisUnit ?? row.unit;
    const resolved = resolveUnitAwarePrice(parseFloat(row.costPrice) || 0, basisUnit, newUnit, relationship);
    if (resolved !== '') {
      next.costPrice = resolved;
      next.costPriceAutoFilled = true;
      next.costPriceBasisUnit = newUnit;
    }
  }
  if (row.sellingPriceAutoFilled && row.sellingPrice !== '') {
    const basisUnit = row.sellingPriceBasisUnit ?? row.unit;
    const resolvedSell = resolveUnitAwarePrice(parseFloat(row.sellingPrice) || 0, basisUnit, newUnit, relationship);
    if (resolvedSell !== '') {
      next.sellingPrice = resolvedSell;
      next.sellingPriceAutoFilled = true;
      next.sellingPriceBasisUnit = newUnit;
    }
  }
  return next;
}

describe('handleUnitChange — the Owner\'s own worked example (2 Cx @ 1500, memory 75/Un)', () => {
  it('switching Cx -> Un re-derives the row price to the exact per-Un figure the Owner expects', () => {
    // sellingPrice starts at 1800 (the already-converted Cx-equivalent
    // of the remembered 75/Un) — the state the row is actually in
    // after Smart Stock Entry's own initial auto-fill.
    const row = { costPrice: '1500', sellingPrice: '1800', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Un', heineken);
    assert.equal(next.sellingPrice, '75.00');
    assert.equal(next.costPrice, (1500 / 24).toFixed(2));
    assert.equal(next.sellingPriceAutoFilled, true);
  });

  it('switching Cx -> Emb re-derives correctly (1800 / 4 = 450)', () => {
    const row = { costPrice: '1500', sellingPrice: '1800', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Emb', heineken);
    assert.equal(next.sellingPrice, '450.00');
  });

  it('switching back Un -> Cx round-trips to the exact original 1800 (no drift)', () => {
    const row = { costPrice: '62.50', sellingPrice: '75', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Un', sellingPriceBasisUnit: 'Un', unit: 'Un' };
    const next = simulateUnitChange(row, 'Cx', heineken);
    assert.equal(next.sellingPrice, '1800.00');
  });

  it('same unit re-selected is a pure no-op — never re-runs a conversion, byte-identical price', () => {
    const row = { costPrice: '1500', sellingPrice: '1800', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Cx', heineken);
    assert.equal(next.sellingPrice, '1800');
    assert.equal(next.costPrice, '1500');
  });
});

describe('handleUnitChange — Owner decision 1: a manually-edited price is never overwritten', () => {
  it('costPriceAutoFilled: false — a manually-typed cost price is left completely untouched on unit change', () => {
    const row = { costPrice: '1600', sellingPrice: '1800', costPriceAutoFilled: false, sellingPriceAutoFilled: true, sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Emb', heineken);
    assert.equal(next.costPrice, '1600'); // untouched, not re-derived to 400
    assert.equal(next.sellingPrice, '450.00'); // sellingPrice still auto-filled, still re-derives
  });

  it('sellingPriceAutoFilled: false — a manually-typed selling price is left completely untouched on unit change', () => {
    const row = { costPrice: '1500', sellingPrice: '1750', costPriceAutoFilled: true, sellingPriceAutoFilled: false, costPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Un', heineken);
    assert.equal(next.sellingPrice, '1750'); // untouched, not re-derived to 72.92
    assert.equal(next.costPrice, (1500 / 24).toFixed(2)); // costPrice still auto-filled, still re-derives
  });

  it('both prices manually edited — unit change moves the unit only, both prices frozen', () => {
    const row = { costPrice: '1600', sellingPrice: '1750', costPriceAutoFilled: false, sellingPriceAutoFilled: false, unit: 'Cx' };
    const next = simulateUnitChange(row, 'Un', heineken);
    assert.equal(next.costPrice, '1600');
    assert.equal(next.sellingPrice, '1750');
    assert.equal(next.unit, 'Un');
  });
});

describe('handleUnitChange — Owner decision 2: an unrelated unit leaves the price alone and signals the mismatch, never fabricates or blanks it', () => {
  it('a unit outside the confirmed chain leaves the still-auto-filled price completely unchanged', () => {
    const row = { costPrice: '1500', sellingPrice: '1800', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Litro', heineken);
    assert.equal(next.costPrice, '1500'); // never fabricated, never blanked
    assert.equal(next.sellingPrice, '1800');
    // AutoFilled stays true — a later switch to a THIRD, genuinely
    // convertible unit still re-derives from this same known-good
    // price, not from a value that was already left stale once.
    assert.equal(next.costPriceAutoFilled, true);
    assert.equal(next.sellingPriceAutoFilled, true);
  });

  it('recovering to a valid unit after a mismatched one still re-derives correctly from the untouched price', () => {
    const row = { costPrice: '1500', sellingPrice: '1800', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const afterMismatch = simulateUnitChange(row, 'Litro', heineken);
    const afterRecovery = simulateUnitChange(afterMismatch, 'Un', heineken);
    assert.equal(afterRecovery.sellingPrice, '75.00');
  });

  it('no confirmed relationship at all (undefined) behaves identically to an out-of-chain unit — price left alone', () => {
    const row = { costPrice: '1500', sellingPrice: '1800', costPriceAutoFilled: true, sellingPriceAutoFilled: true, costPriceBasisUnit: 'Cx', sellingPriceBasisUnit: 'Cx', unit: 'Cx' };
    const next = simulateUnitChange(row, 'Un', undefined);
    assert.equal(next.sellingPrice, '1800');
    assert.equal(next.costPrice, '1500');
  });
});

describe('AddStockView.tsx — handleUnitChange is actually wired in (source-structure checks)', () => {
  it('is defined once, built on the real resolveUnitAwarePrice — no second, independently-invented conversion', () => {
    assert.match(addStockSrc, /const handleUnitChange = \(rowId: string, newUnit: string\) => \{/);
    const defCount = (addStockSrc.match(/const handleUnitChange = \(rowId: string, newUnit: string\) => \{/g) || []).length;
    assert.equal(defCount, 1);
    const start = addStockSrc.indexOf('const handleUnitChange = (rowId: string, newUnit: string) => {');
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /resolveUnitAwarePrice\(/);
    // Never overwrites a manually-edited price.
    assert.match(body, /row\.costPriceAutoFilled/);
    assert.match(body, /row\.sellingPriceAutoFilled/);
  });

  it('all four unit-change UI sites (desktop input, desktop popover, mobile input) call handleUnitChange, not a raw updateRow({ unit })', () => {
    const rawUnitUpdateCount = (addStockSrc.match(/updateRow\(row\.id, \{ unit: e\.target\.value \}\)/g) || []).length;
    assert.equal(rawUnitUpdateCount, 0);
    const handledCount = (addStockSrc.match(/handleUnitChange\(row\.id, e\.target\.value\)/g) || []).length;
    assert.equal(handledCount, 2); // desktop input + mobile input
    assert.match(addStockSrc, /handleUnitChange\(row\.id, u\);/); // popover suggestion button
  });

  it('both price inputs clear their own *AutoFilled flag the moment the Owner types directly — never silently left true after a manual edit', () => {
    const costOnChangeCount = (addStockSrc.match(/costPrice: e\.target\.value, costPriceAutoFilled: false/g) || []).length;
    const sellOnChangeCount = (addStockSrc.match(/sellingPrice: e\.target\.value, sellingPriceAutoFilled: false/g) || []).length;
    assert.equal(costOnChangeCount, 2); // desktop + mobile
    assert.equal(sellOnChangeCount, 2);
  });

  it('a live unit-mismatch warning is rendered near the unit field, never a stored/persisted flag', () => {
    const warningCount = (addStockSrc.match(/unitOutsideRelationshipWarning/g) || []).length;
    assert.ok(warningCount >= 2); // desktop + mobile layout, each with its own live check
    assert.doesNotMatch(addStockSrc, /unitMismatch:\s*boolean/); // never a stored StockRowItem field
  });
});

describe('AddStockView.tsx — all three findLatestRememberedProductMemory call sites pass the product\'s confirmed selling unit (Owner-requested: "it should pull the selling unit")', () => {
  it('every call site passes a 5th argument derived from unitRelationship.sellingUnit, guarded by isValidUnitRelationship — never an unvalidated read', () => {
    const callSites = addStockSrc.match(/findLatestRememberedProductMemory\(\s*[\s\S]*?\);/g) || [];
    assert.equal(callSites.length, 3, 'Expected exactly 3 call sites (createEmptyRow, handleSelectProductForTool, buildRowFromProposalLineItem)');
    for (const call of callSites) {
      assert.match(call, /isValidUnitRelationship\(\w+\.unitRelationship\)/);
      assert.match(call, /\w+\.unitRelationship\?\.sellingUnit/);
    }
  });

  it('cost price still starts from the receipt\'s own reading, never from memory, in the Smart Stock Entry path — unaffected by this change', () => {
    const start = addStockSrc.indexOf('const buildRowFromProposalLineItem = (item: SmartStockEntryLineItemProposal): StockRowItem => {');
    const nearby = addStockSrc.slice(start, start + 400);
    assert.match(nearby, /let costPrice = item\.costPrice\.value != null \? String\(item\.costPrice\.value\) : '';/);
  });
});
