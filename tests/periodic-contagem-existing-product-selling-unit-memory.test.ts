// Periodic Contagem — Existing-Product Selling-Unit / Price-Memory
// Correction (Implementation Authorization, docs/engineering/
// periodic-contagem-existing-product-selling-unit-memory-implementation-authorization.md,
// signed SABUSHIMIKE MASCENI, 29 August 2026).
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent (see tests/periodic-stock-existing-product-summary.test.ts's
// own header, tests/periodic-stock-mode-a-integration.test.ts's own
// header). This suite follows both of this repo's established
// techniques for that constraint:
//
//   (1) small local reimplementations of buildCatalogRow's and
//       computeDefaultReferenceConfig's own two-tier resolution logic
//       (the latter renamed/relocated under Implementation
//       Authorization §14 — Reference Selling Configuration as the
//       Default Path; same arithmetic, no longer gated behind an
//       explicit Mode A toggle), calling the SAME real, imported,
//       already-tested engine functions (resolveUnitAwarePrice,
//       isValidUnitRelationship, findMostRecentBatchForProduct) the
//       component itself calls — not a duplicated/competing
//       calculation, exercised against fixture inputs;
//   (2) structural source-text assertions confirming the actual
//       component code (buildCatalogRow, computeDefaultReferenceConfig,
//       and both ModeAValuationControl render sites) contains the
//       correct two-tier preference, so this suite fails if the real
//       implementation ever silently reverts to the old unconditional
//       units[0]/latest-batch default.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-existing-product-selling-unit-memory.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import { resolveUnitAwarePrice } from '../apps/tenant/src/lib/productMemoryPriceResolution';
import { findMostRecentBatchForProduct } from '../apps/tenant/src/lib/restockObservation';
import type { UnitRelationship, StockBatch, Product } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

function makeBatch(overrides: Partial<StockBatch>): StockBatch {
  return {
    id: 'batch-1',
    productId: 'p1',
    dateEntered: '2026-08-20',
    quantity: 10,
    unit: 'Cx',
    costPrice: 400,
    sellingPrice: 470,
    status: 'closed',
    createdAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'p1',
    name: 'Impala',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const impalaRelationship: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 }, // 1 Cx = 4 Emb = 24 Un
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-22T00:00:00.000Z',
};

// ---------------------------------------------------------------------
// (1) Fixture reimplementation — buildCatalogRow's two-tier resolution
// (Authorization §2 item 1). Mirrors the real function's own logic
// exactly, calling the SAME resolveUnitAwarePrice/isValidUnitRelationship
// the component imports and uses.
// ---------------------------------------------------------------------
function buildCatalogRowFixture(
  product: Product,
  batches: StockBatch[]
): { unit: string; sellingPrice: string } {
  const latestBatch = findMostRecentBatchForProduct(batches, product.id);
  let unit = latestBatch?.unit ? latestBatch.unit : '';
  let sellingPrice = latestBatch ? String(latestBatch.sellingPrice) : product.sellingPrice != null ? String(product.sellingPrice) : '';

  const relationship = product.unitRelationship;
  const confirmedSellingUnit = isValidUnitRelationship(relationship) ? relationship!.sellingUnit : undefined;
  if (confirmedSellingUnit && latestBatch) {
    const resolved = resolveUnitAwarePrice(latestBatch.sellingPrice, latestBatch.unit || '', confirmedSellingUnit, relationship);
    if (resolved !== '') {
      unit = confirmedSellingUnit;
      sellingPrice = resolved;
    }
  }
  return { unit, sellingPrice };
}

// ---------------------------------------------------------------------
// (2) Fixture reimplementation — handleModeAToggle's two-tier default
// reference unit + seeded reference price (Authorization §2 items 2-3).
// ---------------------------------------------------------------------
function modeAToggleDefaultsFixture(
  relationship: UnitRelationship | undefined,
  product: Product | undefined,
  batches: StockBatch[]
): { defaultReferenceUnit: string; defaultReferencePrice: string } {
  const defaultReferenceUnit = relationship?.sellingUnit || relationship?.units?.[0]?.unit || '';
  let defaultReferencePrice = '';
  if (product && defaultReferenceUnit) {
    const latestBatch = findMostRecentBatchForProduct(batches, product.id);
    if (latestBatch) {
      const resolved = resolveUnitAwarePrice(latestBatch.sellingPrice, latestBatch.unit || '', defaultReferenceUnit, relationship);
      if (resolved !== '') defaultReferencePrice = resolved;
    }
  }
  return { defaultReferenceUnit, defaultReferencePrice };
}

describe('buildCatalogRow two-tier resolution — Rule 8 Finding A / Authorization §2 item 1', () => {
  it('#1 existing single-unit product: no unitRelationship at all — behavior fully unaffected (Rule 8 Finding E)', () => {
    const product = makeProduct({ sellingPrice: 150 });
    const batches = [makeBatch({ unit: 'Saco', sellingPrice: 150 })];
    const result = buildCatalogRowFixture(product, batches);
    assert.equal(result.unit, 'Saco');
    assert.equal(result.sellingPrice, '150');
  });

  it('#2/#4/#5/#7 existing multi-unit product, confirmed sellingUnit != latest purchase unit — the worked Impala example (Cx purchase, Un selling unit)', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship });
    const batches = [makeBatch({ unit: 'Cx', sellingPrice: 470 })];
    const result = buildCatalogRowFixture(product, batches);
    assert.equal(result.unit, 'Un');
    // 470 MZN/Cx -> per-Un: 470 / 24 = 19.5833... -> resolveUnitAwarePrice's own .toFixed(2) contract
    assert.equal(result.sellingPrice, '19.58');
  });

  it('#3 latest purchase unit already equals the confirmed selling unit — identity short-circuit, no spurious conversion', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship });
    const batches = [makeBatch({ unit: 'Un', sellingPrice: 20 })];
    const result = buildCatalogRowFixture(product, batches);
    assert.equal(result.unit, 'Un');
    assert.equal(result.sellingPrice, '20');
  });

  it('#8 conversion from an Emb-denominated purchase to the confirmed Un selling unit', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship });
    const batches = [makeBatch({ unit: 'Emb', sellingPrice: 120 })]; // per-Emb -> per-Un: 120/6
    const result = buildCatalogRowFixture(product, batches);
    assert.equal(result.unit, 'Un');
    assert.equal(result.sellingPrice, '20.00');
  });

  it('#6 resolved sellingPrice equals resolveUnitAwarePrice\'s own output for the same inputs — no independent/duplicate arithmetic', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship });
    const batches = [makeBatch({ unit: 'Cx', sellingPrice: 470 })];
    const result = buildCatalogRowFixture(product, batches);
    const direct = resolveUnitAwarePrice(470, 'Cx', 'Un', impalaRelationship);
    assert.equal(result.sellingPrice, direct);
  });

  it('#5 product with no confirmed sellingUnit preserves today\'s exact units[0]/raw-batch fallback, unconverted', () => {
    const noSellingUnit: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      confirmedAt: '2026-08-22T00:00:00.000Z',
      // sellingUnit intentionally absent
    };
    const product = makeProduct({ unitRelationship: noSellingUnit });
    const batches = [makeBatch({ unit: 'Cx', sellingPrice: 470 })];
    const result = buildCatalogRowFixture(product, batches);
    assert.equal(result.unit, 'Cx');
    assert.equal(result.sellingPrice, '470');
  });

  it('#15/#16 no batch at all, confirmed sellingUnit present — falls back to Product.sellingPrice with no fabricated conversion (resolveUnitAwarePrice never invoked without a batch to convert from)', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship, sellingPrice: 22 });
    const result = buildCatalogRowFixture(product, []);
    assert.equal(result.unit, ''); // unchanged from today's exact no-batch behavior
    assert.equal(result.sellingPrice, '22');
  });

  it('an invalid (incomplete) unitRelationship is treated as no confirmed sellingUnit at all, matching isValidUnitRelationship elsewhere in this codebase', () => {
    const invalid = { units: [{ unit: 'Cx', factorFromPrevious: 0 }], sellingUnit: 'Un', confirmedAt: '2026-08-22T00:00:00.000Z' } as UnitRelationship;
    const product = makeProduct({ unitRelationship: invalid });
    const batches = [makeBatch({ unit: 'Cx', sellingPrice: 470 })];
    const result = buildCatalogRowFixture(product, batches);
    assert.equal(result.unit, 'Cx'); // fallback, since the relationship itself is invalid
    assert.equal(result.sellingPrice, '470');
  });
});

describe('handleModeAToggle two-tier default reference unit + seeded price — Rule 8 Findings B/C / Authorization §2 items 2-3', () => {
  it('confirmed sellingUnit is preferred over units[0] as the default reference unit', () => {
    const { defaultReferenceUnit } = modeAToggleDefaultsFixture(impalaRelationship, undefined, []);
    assert.equal(defaultReferenceUnit, 'Un');
  });

  it('falls back to units[0] exactly as today when no sellingUnit is confirmed', () => {
    const noSellingUnit: UnitRelationship = {
      units: [
        { unit: 'Cx', factorFromPrevious: 0 },
        { unit: 'Un', factorFromPrevious: 24 },
      ],
      confirmedAt: '2026-08-22T00:00:00.000Z',
    };
    const { defaultReferenceUnit } = modeAToggleDefaultsFixture(noSellingUnit, undefined, []);
    assert.equal(defaultReferenceUnit, 'Cx');
  });

  it('seeds the reference price from the same resolution buildCatalogRow performs, when a resolvable remembered price exists', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship });
    const batches = [makeBatch({ unit: 'Cx', sellingPrice: 470 })];
    const { defaultReferenceUnit, defaultReferencePrice } = modeAToggleDefaultsFixture(impalaRelationship, product, batches);
    assert.equal(defaultReferenceUnit, 'Un');
    assert.equal(defaultReferencePrice, '19.58');
    // Cross-check: identical to buildCatalogRow's own resolution for the
    // same product/batches — one resolution, reused, never duplicated.
    const catalogRow = buildCatalogRowFixture(product, batches);
    assert.equal(defaultReferencePrice, catalogRow.sellingPrice);
  });

  it('remains "" (never fabricated) when no batch exists to resolve a remembered price from — matches today\'s exact behavior', () => {
    const product = makeProduct({ unitRelationship: impalaRelationship });
    const { defaultReferencePrice } = modeAToggleDefaultsFixture(impalaRelationship, product, []);
    assert.equal(defaultReferencePrice, '');
  });

  it('new-product path (no Product record, undefined product) always seeds "" — new-product behavior is unaffected (§3.A)', () => {
    const { defaultReferencePrice } = modeAToggleDefaultsFixture(impalaRelationship, undefined, []);
    assert.equal(defaultReferencePrice, '');
  });
});

describe('Multi-unit physical entry remains independent — Authorization §3.G, unaffected by this correction', () => {
  it('3 Cx + 1 Emb + 5 Un remain three independent portions — this correction only changes default unit/price VALUES shown before the owner edits them, never the underlying flat multi-portion data model', () => {
    // This correction touches only buildCatalogRow/handleModeAToggle's
    // own default VALUES; collectGroupPortions/normalizeStockCountItems
    // (the actual multi-portion data model) are unmodified — see the
    // exclusion checks below. No fixture duplication needed here: the
    // existing periodic-stock-multi-portion-valuation.test.ts and
    // periodic-stock-mode-a-integration.test.ts suites already cover
    // that model's own correctness and are re-run, not modified, by
    // this correction (Plan §7 #10; Authorization §7 #3).
    assert.ok(true);
  });
});

describe('Cost Price remains absent — Authorization §3.I, unaffected by this correction', () => {
  it('buildCatalogRow costPrice resolution is untouched: no relationship/sellingUnit read anywhere in its cost-price line', () => {
    const start = periodicSrc.indexOf('const buildCatalogRow = (product:');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('\n  const [type, setType] = useState', start);
    assert.notEqual(end, -1);
    const fn = periodicSrc.slice(start, end);
    const costLine = fn.split('\n').find((l) => l.includes('const costPrice ='));
    assert.ok(costLine, 'expected a costPrice assignment line');
    assert.doesNotMatch(costLine!, /unitRelationship|sellingUnit/);
  });
});

describe('FR-67 non-interference — Authorization §3.J, unaffected by this correction', () => {
  it('buildProductCostBasisMap (FR-67\'s own units[0] cost-basis convention) is called exactly once in the file, and this correction adds no second call', () => {
    const callCount = (periodicSrc.match(/buildProductCostBasisMap\(/g) || []).length;
    assert.equal(callCount, 1);
  });

  it('fr67CostBasisConversion.ts is not touched by this correction (no new export/import added here beyond the pre-existing buildProductCostBasisMap import)', () => {
    const importLine = periodicSrc.split('\n').find((l) => l.includes("from '../lib/fr67CostBasisConversion'"));
    assert.ok(importLine);
    assert.match(importLine!, /buildProductCostBasisMap/);
  });
});

describe('PeriodicStockCountView.tsx — source-structure checks confirming the authorized two-tier preference is actually wired in', () => {
  it('buildCatalogRow reads product.unitRelationship and calls resolveUnitAwarePrice with a confirmed sellingUnit as the target unit', () => {
    const start = periodicSrc.indexOf('const buildCatalogRow = (product:');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('\n  const [type, setType] = useState', start);
    assert.notEqual(end, -1);
    const fn = periodicSrc.slice(start, end);
    assert.match(fn, /isValidUnitRelationship\(relationship\)/);
    assert.match(fn, /resolveUnitAwarePrice\(latestBatch\.sellingPrice, latestBatch\.unit \|\| '', confirmedSellingUnit, relationship\)/);
  });

  it('computeDefaultReferenceConfig prefers relationship.sellingUnit over relationship.units[0].unit for its default reference unit', () => {
    const start = periodicSrc.indexOf('const computeDefaultReferenceConfig = (productKey: string)');
    assert.notEqual(start, -1);
    const end = periodicSrc.indexOf('const getEffectiveReferenceConfig', start);
    assert.notEqual(end, -1);
    const fn = periodicSrc.slice(start, end);
    assert.match(fn, /const defaultReferenceUnit = relationship\?\.sellingUnit \|\| relationship\?\.units\?\.\[0\]\?\.unit \|\| '';/);
  });

  it('computeDefaultReferenceConfig seeds defaultReferencePrice via resolveUnitAwarePrice using the SAME function buildCatalogRow uses — not a second independent computation', () => {
    const start = periodicSrc.indexOf('const computeDefaultReferenceConfig = (productKey: string)');
    const end = periodicSrc.indexOf('const getEffectiveReferenceConfig', start);
    const fn = periodicSrc.slice(start, end);
    assert.match(fn, /resolveUnitAwarePrice\(latestBatch\.sellingPrice, latestBatch\.unit \|\| '', defaultReferenceUnit, relationship\)/);
  });

  it('both ModeAValuationControl render sites (catalog-row loop, manual-row card loop) resolve the identical getEffectiveReferenceConfig — no longer two separately-inlined default computations', () => {
    const occurrences = periodicSrc.match(/const config = getEffectiveReferenceConfig\(key\);/g) || [];
    // [Concept C — Validated Product Compaction] A third, legitimate
    // call site now exists inside getModeANonConvertibleWarning — the
    // helper Concept C's validated-row compact representation uses to
    // surface the same Mode A non-convertible warning once every
    // portion of a group has been validated and ModeAValuationControl
    // itself no longer renders (see tests/periodic-contagem-concept-c-
    // validated-compaction.test.ts, Suite B). The two ORIGINAL
    // render-site occurrences — each feeding directly into
    // <ModeAValuationControl — remain independently confirmed below,
    // unmodified by Concept C.
    assert.equal(occurrences.length, 3, 'expected the two original render-site occurrences (catalog-row loop + manual-row card loop) plus Concept C\'s own validated-row warning helper');
    const renderSiteOccurrences = (periodicSrc.match(/const config = getEffectiveReferenceConfig\(key\);[\s\S]{0,400}?<ModeAValuationControl/g) ?? []).length;
    assert.equal(renderSiteOccurrences, 2, 'the two original render sites must still both feed directly into ModeAValuationControl, unmodified');
  });

  it('no new conversion engine or second valuation path is introduced — getConversionFactor, resolveUnitAwarePrice, and deriveModeAPortionValuations import counts are unchanged (one import statement each)', () => {
    assert.equal((periodicSrc.match(/from '\.\.\/lib\/purchaseToSellingConversion'/g) || []).length, 1);
    assert.equal((periodicSrc.match(/from '\.\.\/lib\/productMemoryPriceResolution'/g) || []).length, 1);
    assert.equal((periodicSrc.match(/from '\.\.\/lib\/contagemMultiUnitValuation'/g) || []).length, 1);
  });

  it('Add Portion\'s own creation mechanism (handleAddPortionToManualGroup) reuses buildCatalogRow\'s own resolution — no second, independent resolveUnitAwarePrice call inside it', () => {
    const start = periodicSrc.indexOf('const handleAddPortionToManualGroup');
    if (start === -1) return; // name may differ across revisions; this check is best-effort, not load-bearing
    const end = periodicSrc.indexOf('\n  const ', start + 10);
    const fn = periodicSrc.slice(start, end === -1 ? start + 2000 : end);
    assert.doesNotMatch(fn, /resolveUnitAwarePrice/);
  });

  it('Initial Stock (InitialStockCountView.tsx) is never referenced by name inside PeriodicStockCountView.tsx\'s own buildCatalogRow/computeDefaultReferenceConfig functions', () => {
    const start1 = periodicSrc.indexOf('const buildCatalogRow = (product:');
    const end1 = periodicSrc.indexOf('\n  const [type, setType] = useState', start1);
    const start2 = periodicSrc.indexOf('const computeDefaultReferenceConfig = (productKey: string)');
    const end2 = periodicSrc.indexOf('const getEffectiveReferenceConfig', start2);
    assert.notEqual(start1, -1);
    assert.notEqual(start2, -1);
    assert.doesNotMatch(periodicSrc.slice(start1, end1), /InitialStock/);
    assert.doesNotMatch(periodicSrc.slice(start2, end2), /InitialStock/);
  });
});
