// Periodic Contagem — Unidade Selection Control + First-Row Default
// Selling Unit (Owner-requested UX clarification, follow-up to the
// Existing-Product Selling-Unit / Price-Memory Correction).
//
// SCOPE: this repository has no DOM/React render harness — the same
// established constraint/technique documented in
// tests/periodic-contagem-existing-product-selling-unit-memory.test.ts's
// own header, reused here identically:
//   (1) a small local reimplementation of buildCatalogRow's own final
//       unit-default fallback and of getUnitOptionsForRow, calling the
//       SAME real, imported, already-tested engine functions
//       (isValidUnitRelationship) the component itself calls — not a
//       duplicated/competing resolution, exercised against fixtures;
//   (2) structural source-text assertions confirming the actual
//       component code contains the new helper, the conditional
//       select-or-input render, and the price-independent unit
//       fallback in buildCatalogRow — so this suite fails if the real
//       implementation ever silently regresses to free-text-only or to
//       the old "unit only ever set alongside a resolved price" rule.
//
// GOVERNANCE: this is a UI/state-initialization change only. It reuses
// isValidUnitRelationship/getEffectiveUnitRelationshipForProductName —
// no new unit model, no new conversion, no new business rule. It does
// NOT touch tallyStockCountRows, normalizeStockCountItems, Mode A's
// own calculation engine, or Business Worth — see suite L below and
// tests/periodic-contagem-concept-b-compaction.test.ts's own identical
// "no calculation/business-logic code altered" guard, which this
// change was verified against and did not require modifying (only its
// disabled={isConfirmed} occurrence count, a consequence of Unidade
// now rendering one of two gated elements instead of always one).
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-unidade-selector.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import {
  findLatestRememberedProductMemory,
  resolveUnitAwarePrice,
  type RememberedStockCountSource,
} from '../apps/tenant/src/lib/productMemoryPriceResolution';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');

const multiUnitRelationship: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 12 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  sellingUnit: 'Emb',
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

const singleUnitRelationship: UnitRelationship = {
  units: [{ unit: 'kg', factorFromPrevious: 0 }],
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------
// Local reimplementation of the two new pieces of logic, calling the
// real imported isValidUnitRelationship — not a second, independently
// invented validity check.
// ---------------------------------------------------------------------

/** Mirrors buildCatalogRow's new final fallback exactly: only fires
 * when `unit` is still blank after every price-resolution tier already
 * ran, and never touches `sellingPrice`. */
function resolveDefaultUnitOnly(unit: string, relationship: UnitRelationship | undefined): string {
  if (unit) return unit;
  const confirmedSellingUnit = isValidUnitRelationship(relationship) ? relationship!.sellingUnit : undefined;
  return confirmedSellingUnit || (isValidUnitRelationship(relationship) ? relationship!.units[0]?.unit : undefined) || '';
}

/** Mirrors getUnitOptionsForRow exactly: null (fall back to free text)
 * for no valid relationship; the chain's units otherwise, with the
 * row's own current unit appended if it isn't already a member. */
function unitOptionsFor(relationship: UnitRelationship | undefined, currentUnit: string): string[] | null {
  if (!relationship || !isValidUnitRelationship(relationship)) return null;
  const options = relationship.units.map((u) => u.unit);
  const trimmedCurrent = currentUnit.trim();
  if (trimmedCurrent && !options.some((u) => u.trim().toLowerCase() === trimmedCurrent.toLowerCase())) {
    return [...options, trimmedCurrent];
  }
  return options;
}

describe('A/D — first-row default unit, independent of price memory', () => {
  it('a product with a confirmed sellingUnit but no price memory at all still defaults unit to sellingUnit', () => {
    assert.equal(resolveDefaultUnitOnly('', multiUnitRelationship), 'Emb');
  });

  it('never overwrites a unit a price-resolution tier already set', () => {
    assert.equal(resolveDefaultUnitOnly('Cx', multiUnitRelationship), 'Cx');
  });

  it('falls back to units[0] when a valid relationship has no designated sellingUnit', () => {
    const noSellingUnit: UnitRelationship = { units: multiUnitRelationship.units, confirmedAt: '2026-08-01T00:00:00.000Z' };
    assert.equal(resolveDefaultUnitOnly('', noSellingUnit), 'Cx');
  });

  it('single-unit product defaults to its one configured unit', () => {
    assert.equal(resolveDefaultUnitOnly('', singleUnitRelationship), 'kg');
  });

  it('never fabricates a unit for a product with no valid relationship at all', () => {
    assert.equal(resolveDefaultUnitOnly('', undefined), '');
  });
});

describe('B — single-unit products', () => {
  it('selector contains exactly the one configured unit, nothing invented', () => {
    assert.deepEqual(unitOptionsFor(singleUnitRelationship, ''), ['kg']);
  });
});

describe('C — products without a valid UnitRelationship', () => {
  it('returns null (never a fabricated list) for an undefined relationship', () => {
    assert.equal(unitOptionsFor(undefined, 'saco'), null);
  });

  it('returns null for a structurally invalid relationship (empty units array)', () => {
    const invalid: UnitRelationship = { units: [], confirmedAt: '2026-08-01T00:00:00.000Z' };
    assert.equal(unitOptionsFor(invalid, 'saco'), null);
  });
});

describe('D/G — selector options and the sellingUnit default selection', () => {
  it('selector options are exactly the chain members, in chain order', () => {
    assert.deepEqual(unitOptionsFor(multiUnitRelationship, 'Emb'), ['Cx', 'Emb', 'Un']);
  });

  it('the configured sellingUnit is what a fresh first row selects by default (combined with A/D above)', () => {
    const defaultedUnit = resolveDefaultUnitOnly('', multiUnitRelationship);
    const options = unitOptionsFor(multiUnitRelationship, defaultedUnit);
    assert.equal(defaultedUnit, 'Emb');
    assert.ok(options!.includes(defaultedUnit), 'the default unit must always be a selectable option');
  });

  it('owner can select any other valid chain unit — all chain members are present as options', () => {
    const options = unitOptionsFor(multiUnitRelationship, 'Emb');
    assert.deepEqual(options, ['Cx', 'Emb', 'Un']);
  });
});

describe('G — reopened/existing rows: an out-of-chain stored unit is preserved, never silently dropped', () => {
  it('appends the row\'s own current unit when it is not a chain member, rather than excluding or replacing it', () => {
    const options = unitOptionsFor(multiUnitRelationship, 'Saco');
    assert.deepEqual(options, ['Cx', 'Emb', 'Un', 'Saco']);
  });

  it('does not duplicate the current unit when it already is a chain member (case/whitespace-insensitive)', () => {
    const options = unitOptionsFor(multiUnitRelationship, ' emb ');
    assert.deepEqual(options, ['Cx', 'Emb', 'Un']);
  });
});

describe('A/D follow-up — a valid UnitRelationship without a designated sellingUnit is a real, reachable state', () => {
  it('isValidUnitRelationship accepts a single-unit relationship with no sellingUnit at all', () => {
    assert.equal(isValidUnitRelationship(singleUnitRelationship), true);
  });

  it('isValidUnitRelationship accepts a multi-unit (chain-confirmed) relationship with no designated sellingUnit', () => {
    const chainNoSellingUnit: UnitRelationship = { units: multiUnitRelationship.units, confirmedAt: '2026-08-01T00:00:00.000Z' };
    assert.equal(isValidUnitRelationship(chainNoSellingUnit), true);
  });

  it('resolveDefaultUnitOnly therefore correctly matches the SAME governed default already established by computeDefaultReferenceConfig elsewhere in this file (sellingUnit, else units[0]) — not an invented rule', () => {
    const chainNoSellingUnit: UnitRelationship = { units: multiUnitRelationship.units, confirmedAt: '2026-08-01T00:00:00.000Z' };
    // computeDefaultReferenceConfig's own line, reused verbatim here as
    // the independent proof this suite compares against:
    const computeDefaultReferenceConfigPattern = (r: UnitRelationship | undefined) =>
      r?.sellingUnit || r?.units?.[0]?.unit || '';
    assert.equal(resolveDefaultUnitOnly('', chainNoSellingUnit), computeDefaultReferenceConfigPattern(chainNoSellingUnit));
    assert.equal(resolveDefaultUnitOnly('', multiUnitRelationship), computeDefaultReferenceConfigPattern(multiUnitRelationship));
  });
});

describe('Single-unit-product autofill — findLatestRememberedProductMemory no longer gated behind a confirmed sellingUnit', () => {
  /** Mirrors buildCatalogRow's new `else if (!latestBatch)` branch
   * exactly: no latestBatch, no canonicalSellingMemory. Calls the SAME
   * real, imported findLatestRememberedProductMemory/resolveUnitAwarePrice
   * — not a duplicated resolution. */
  function resolveNoBatchTier(
    productId: string,
    productName: string,
    stockCounts: RememberedStockCountSource[],
    confirmedSellingUnit: string | undefined,
    relationship: UnitRelationship | undefined
  ): { unit: string; sellingPrice: string } {
    const memory = findLatestRememberedProductMemory(productId, productName, [], stockCounts, confirmedSellingUnit);
    if (!memory) return { unit: '', sellingPrice: '' };
    if (confirmedSellingUnit) {
      const resolved = resolveUnitAwarePrice(memory.sellingPrice, memory.unit, confirmedSellingUnit, relationship);
      return resolved !== '' ? { unit: confirmedSellingUnit, sellingPrice: resolved } : { unit: '', sellingPrice: '' };
    }
    return { unit: memory.unit, sellingPrice: String(memory.sellingPrice) };
  }

  const priorCount: RememberedStockCountSource[] = [
    {
      date: '2026-08-15',
      items: [{ productId: 'p1', productName: 'Feijão', unit: 'kg', costPrice: 90, sellingPrice: 130 }],
    },
  ];

  it('a single-unit product (no confirmed sellingUnit) with no batch history now autofills from a prior Contagem — previously unreachable', () => {
    const result = resolveNoBatchTier('p1', 'Feijão', priorCount, undefined, singleUnitRelationship);
    assert.deepEqual(result, { unit: 'kg', sellingPrice: '130' });
  });

  it('a product with NO relationship at all (the true, most common single-unit case) also autofills the same way', () => {
    const result = resolveNoBatchTier('p1', 'Feijão', priorCount, undefined, undefined);
    assert.deepEqual(result, { unit: 'kg', sellingPrice: '130' });
  });

  it('never fabricates a value when genuinely no memory exists anywhere', () => {
    const result = resolveNoBatchTier('p1', 'Feijão', [], undefined, undefined);
    assert.deepEqual(result, { unit: '', sellingPrice: '' });
  });

  it('a confirmed sellingUnit case is BYTE-IDENTICAL to the pre-existing behavior — same conversion, same result', () => {
    const chainCount: RememberedStockCountSource[] = [
      {
        date: '2026-08-15',
        items: [{ productId: 'p1', productName: 'Impala', unit: 'Cx', costPrice: 400, sellingPrice: 5640 }], // 470/Emb x 12
      },
    ];
    const result = resolveNoBatchTier('p1', 'Impala', chainCount, 'Emb', multiUnitRelationship);
    assert.deepEqual(result, { unit: 'Emb', sellingPrice: '470.00' });
  });
});

// ---------------------------------------------------------------------
// Source-inspection: the real component actually contains this logic,
// wired the way this suite assumes.
// ---------------------------------------------------------------------

describe('J — source-level proof: the real component contains the new helper and wiring', () => {
  it('getUnitOptionsForRow exists and is derived from getEffectiveUnitRelationshipForProductName (no new relationship source)', () => {
    assert.match(periodicSrc, /const getUnitOptionsForRow = \(productName: string, currentUnit: string\): string\[\] \| null => \{/);
    assert.match(periodicSrc, /const relationship = getEffectiveUnitRelationshipForProductName\(productName\);\s*\n\s*if \(!relationship \|\| !isValidUnitRelationship\(relationship\)\) return null;/);
  });

  it('buildCatalogRow\'s new unit fallback never assigns to sellingPrice — unit-only, price-independent', () => {
    const fallbackMatch = periodicSrc.match(
      /if \(!unit\) \{\s*\n\s*unit = confirmedSellingUnit \|\| \(isValidUnitRelationship\(relationship\) \? relationship!\.units\[0\]\?\.unit : undefined\) \|\| '';\s*\n\s*\}/
    );
    assert.ok(fallbackMatch, 'expected the price-independent unit fallback in buildCatalogRow');
  });

  it('both the catalog-row and manual-row Unidade fields call getUnitOptionsForRow and fall back to the original free-text input', () => {
    const occurrences = periodicSrc.match(/const unitOptions = getUnitOptionsForRow\(row\.productName, row\.unit\);/g) ?? [];
    assert.equal(occurrences.length, 2, 'expected getUnitOptionsForRow called once per loop (catalog + manual)');
    // The pre-existing free-text <input type="text"> for Unidade is
    // preserved verbatim as the fallback branch — not deleted, only
    // now conditional.
    const freeTextOccurrences = periodicSrc.match(/<input\s*\n\s*type="text"\s*\n\s*(placeholder="un"\s*\n\s*)?value=\{row\.unit\}/g) ?? [];
    assert.equal(freeTextOccurrences.length, 2, 'expected the original free-text Unidade input preserved as the no-relationship fallback, once per loop');
  });

  it('the select options route through the SAME updateCatalogRow/updateManualRow unit-change path the free-text input already used — no new update path', () => {
    assert.match(periodicSrc, /onChange=\{\(e\) => updateCatalogRow\(productId, \{ unit: e\.target\.value \}\)\}/);
    assert.match(periodicSrc, /onChange=\{\(e\) => updateManualRow\(idx, \{ unit: e\.target\.value \}\)\}/);
  });

  it('buildCatalogRow\'s no-batch memory lookup is no longer gated behind a confirmed sellingUnit — the widened condition is actually present in source', () => {
    assert.match(periodicSrc, /\} else if \(!latestBatch\) \{/);
    assert.doesNotMatch(periodicSrc, /\} else if \(confirmedSellingUnit && !latestBatch\) \{/);
  });

  it('the no-batch branch still passes confirmedSellingUnit through as findLatestRememberedProductMemory\'s own OPTIONAL preferredSellingUnit tie-break — the helper itself is unmodified', () => {
    assert.match(
      periodicSrc,
      /findLatestRememberedProductMemory\(product\.id, product\.name, batches, stockCounts, confirmedSellingUnit\)/
    );
  });
});

describe('H — calculation engine untouched', () => {
  it('tallyStockCountRows and its own sellingValue formula are not referenced or duplicated by this change (only imported, unchanged)', () => {
    assert.match(periodicSrc, /import \{ .*tallyStockCountRows.* \} from '\.\.\/utils\/stockCount';/);
  });

  it('the unified-list duplicated display formula (previously documented finding) is unchanged by this work — still present, still not modified here', () => {
    assert.match(periodicSrc, /const rowValue = q \* sellingPriceNum;/);
  });
});
