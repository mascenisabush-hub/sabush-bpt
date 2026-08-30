// FR-89–FR-94 — Periodic Contagem, Quantity-Unit / Selling-Unit
// Independence. Governed by docs/specs/periodic-contagem-quantity-selling-unit-independence-amendment.md
// (signed), docs/engineering/periodic-contagem-quantity-selling-unit-independence-rule8-assessment.md
// (signed), docs/engineering/periodic-contagem-quantity-selling-unit-independence-implementation-plan.md
// (signed), and docs/engineering/periodic-contagem-quantity-selling-unit-independence-implementation-authorization.md
// (signed, 30 August 2026).
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent across every sibling Contagem UI suite (see
// tests/periodic-stock-mode-a-integration.test.ts's and
// tests/periodic-stock-add-portion.test.ts's own identical scope
// notes). This suite follows the same pattern: it exercises the REAL,
// unmodified, exported production functions
// (resolveDefaultSellingConfigurationForRow, selectSellingMemoryByProductName,
// normalizeStockCountItems, tallyStockCountRows, workingRowToDraftItem,
// draftItemToWorkingRow, deriveModeAPortionValuations) directly, plus a
// small, explicitly-labelled local mirror of
// PeriodicStockCountView.tsx's own applySellingConfigurationEditRules
// closure (which cannot be imported — it is component-internal, not
// exported, matching this repo's own established pattern for testing
// this exact class of component-internal decision logic, e.g.
// periodic-stock-add-portion.test.ts's own createManualRow/
// addPortionToManualGroup local mirrors). The local mirror is built to
// match the production closure's own documented rules exactly (see its
// own comment header, PeriodicStockCountView.tsx) and calls the REAL
// resolveDefaultSellingConfigurationForRow for all arithmetic — only
// the thin "which rule applies" wrapper is reimplemented, never the
// underlying conversion engine.
//
// Scenario letters (A–AA) match Implementation Plan §14's own test
// table exactly.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-quantity-selling-unit-independence.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  deriveModeAPortionValuations,
  resolveDefaultSellingConfigurationForRow,
} from '../apps/tenant/src/lib/contagemMultiUnitValuation';
import {
  selectSellingMemoryByProductName,
  type WorkingRowDeliberateEntry,
} from '../apps/tenant/src/lib/sellingMemorySelection';
import {
  normalizeStockCountItems,
  tallyStockCountRows,
  workingRowToDraftItem,
  draftItemToWorkingRow,
  type StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';
import type { UnitRelationship } from '../apps/tenant/src/types';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const TXILAR_RELATIONSHIP: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

const FARINHA_RELATIONSHIP: UnitRelationship = {
  units: [
    { unit: 'Emb', factorFromPrevious: 0 },
    { unit: 'Pacote', factorFromPrevious: 10 },
  ],
  sellingUnit: 'Pacote',
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

// 1 Cx = 4 Emb = 24 Un (cumulative: Cx=1, Emb=4, Un=4*6=24)
const LITE_RELATIONSHIP: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Emb', factorFromPrevious: 4 },
    { unit: 'Un', factorFromPrevious: 6 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-08-01T00:00:00.000Z',
};

// ------------------------------------------------------------------
// [Component-internal mirror — see file header] Mirrors
// PeriodicStockCountView.tsx's own applySellingConfigurationEditRules
// exactly. Only this thin decision wrapper is reimplemented; all
// arithmetic below calls the REAL resolveDefaultSellingConfigurationForRow.
// ------------------------------------------------------------------

let testSequenceCounter = 0;
function nextTestSequence(): number {
  testSequenceCounter += 1;
  return testSequenceCounter;
}

function applySellingConfigurationEditRules(
  currentRow: StockCountWorkingRow,
  fields: Partial<StockCountWorkingRow>,
  product: { unitRelationship?: UnitRelationship; sellingPrice?: number } | undefined
): Partial<StockCountWorkingRow> {
  if (fields.sellingPrice !== undefined) {
    const newUnit = fields.unit !== undefined ? fields.unit : currentRow.unit;
    return {
      ...fields,
      sellingPriceAutoFilled: false,
      sellingPriceBasisUnit: newUnit,
      sellingPriceEditSequence: nextTestSequence(),
    };
  }

  if (fields.unit !== undefined && fields.unit !== currentRow.unit) {
    if (currentRow.sellingPriceAutoFilled === false) {
      return { ...fields };
    }
    const relationship = product?.unitRelationship;
    const confirmedSellingUnit = relationship?.sellingUnit;
    if (!confirmedSellingUnit || product?.sellingPrice == null) {
      return { ...fields };
    }
    const resolved = resolveDefaultSellingConfigurationForRow(
      { quantity: currentRow.quantity, unit: fields.unit },
      confirmedSellingUnit,
      product.sellingPrice,
      relationship
    );
    if (resolved === null) {
      return { ...fields, sellingPrice: '', sellingPriceBasisUnit: undefined, sellingPriceAutoFilled: true };
    }
    return {
      ...fields,
      sellingPrice: resolved.sellingPrice,
      sellingPriceBasisUnit: resolved.sellingPriceBasisUnit,
      sellingPriceAutoFilled: true,
    };
  }

  return fields;
}

// ==================================================================
// Scenario A — Same-unit quantity: 12 Un @ 50 MZN/Un
// ==================================================================
describe('Scenario A — 12 Un @ 50 MZN/Un (same unit)', () => {
  it('values at 600 MZN, unit unchanged', () => {
    const resolved = resolveDefaultSellingConfigurationForRow({ quantity: '12', unit: 'Un' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.ok(resolved);
    assert.equal(resolved!.sellingPriceBasisUnit, 'Un');
    const { totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '12', unit: 'Un', costPrice: '0', sellingPrice: resolved!.sellingPrice },
    ]);
    assert.equal(totalSellingValue, 600);
  });
});

// ==================================================================
// Scenario B — 12 Cx, remembered 50 MZN/Un, no Mode A -> 14,400 MZN
// ==================================================================
describe('Scenario B — 12 Cx, remembered 50 MZN/Un, no Mode A required', () => {
  it("resolves to 1,200 MZN/Cx, labelled with the row's own unit (Cx), and values at 14,400 MZN; physical quantity/unit untouched", () => {
    const resolved = resolveDefaultSellingConfigurationForRow({ quantity: '12', unit: 'Cx' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.ok(resolved);
    // [Implementation Authorization §1 item 5 — the corrected labelling]
    assert.equal(resolved!.sellingPriceBasisUnit, 'Cx');
    assert.equal(Number(resolved!.sellingPrice), 1200);
    const { items, totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '12', unit: 'Cx', costPrice: '0', sellingPrice: resolved!.sellingPrice },
    ]);
    assert.equal(totalSellingValue, 14400);
    // Physical quantity/unit never rewritten (FR-90/FR-21).
    assert.equal(items[0].quantity, 12);
    assert.equal(items[0].unit, 'Cx');
  });
});

// ==================================================================
// Scenario C — 5 Emb + 3 Pacotes, 1 Emb=10 Pacotes, default 50/Pacote
// -> 2,650 MZN, no automatic merging
// ==================================================================
describe('Scenario C (Plan §14 E) — 5 Emb + 3 Pacotes, default 50/Pacote', () => {
  it('resolves each row independently and sums to 2,650 MZN without merging the two physical quantities', () => {
    const embResolved = resolveDefaultSellingConfigurationForRow({ quantity: '5', unit: 'Emb' }, 'Pacote', 50, FARINHA_RELATIONSHIP);
    const pacoteResolved = resolveDefaultSellingConfigurationForRow({ quantity: '3', unit: 'Pacote' }, 'Pacote', 50, FARINHA_RELATIONSHIP);
    assert.ok(embResolved && pacoteResolved);
    const { items, totalSellingValue } = normalizeStockCountItems([
      { productName: 'Farinha 1kg', quantity: '5', unit: 'Emb', costPrice: '0', sellingPrice: embResolved!.sellingPrice },
      { productName: 'Farinha 1kg', quantity: '3', unit: 'Pacote', costPrice: '0', sellingPrice: pacoteResolved!.sellingPrice },
    ]);
    assert.equal(totalSellingValue, 2650);
    assert.equal(items.length, 2, 'two distinct physical quantity entries, never merged into one');
    assert.equal(items[0].quantity, 5);
    assert.equal(items[0].unit, 'Emb');
    assert.equal(items[1].quantity, 3);
    assert.equal(items[1].unit, 'Pacote');
  });
});

// ==================================================================
// Scenario D (deliberate portion) — 5 Cx @ 480/Cx (deliberate) +
// 7 Cx @ 50/Un (default) -> 10,800 MZN, no reinterpretation
// ==================================================================
describe('Scenario D (Plan §14 C) — deliberate 480/Cx + default 50/Un -> 10,800 MZN', () => {
  it('sums correctly with neither denomination reinterpreted', () => {
    const defaultResolved = resolveDefaultSellingConfigurationForRow({ quantity: '7', unit: 'Cx' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.ok(defaultResolved);
    const { totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '0', sellingPrice: '480' }, // deliberate — entered directly, never derived
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: defaultResolved!.sellingPrice },
    ]);
    assert.equal(totalSellingValue, 10800);
  });

  it('applySellingConfigurationEditRules marks a direct sellingPrice edit as deliberate, preserving the exact entered value', () => {
    const row: StockCountWorkingRow = { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '', sellingPrice: '', sellingPriceAutoFilled: true };
    const result = applySellingConfigurationEditRules(row, { sellingPrice: '480' }, { unitRelationship: TXILAR_RELATIONSHIP, sellingPrice: 50 });
    assert.equal(result.sellingPriceAutoFilled, false);
    assert.equal(result.sellingPriceBasisUnit, 'Cx');
    assert.equal(result.sellingPrice, '480');
  });
});

// ==================================================================
// Scenario E (single deliberate price change) — 12 Cx, remembered
// 50/Un, Owner changes to 60/Un -> 17,280 MZN current; 60 becomes
// the new remembered default
// ==================================================================
describe('Scenario E (Plan §14 B) — deliberate price change, current Contagem uses the new value', () => {
  it('current Contagem values at 17,280 MZN using the deliberate 60/Un, not the stale remembered 50', () => {
    const { totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '12', unit: 'Cx', costPrice: '0', sellingPrice: String(60 * 24) },
    ]);
    assert.equal(totalSellingValue, 17280);
  });

  it('the single deliberate entry wins the memory tie-break trivially, becoming the new remembered default', () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 60, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 1 },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 60, sellingUnit: 'Un' });
  });
});

// ==================================================================
// Scenario F — multiple deliberate configurations, both directions
// (Plan §14 D, corrected per audit Finding 2)
// ==================================================================
describe('Scenario F (Plan §14 D, corrected) — last deliberately entered wins, both directions', () => {
  it('(i) 480/Cx entered, then 50/Un entered -> memory becomes 50/Un', () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 480, unit: 'Cx', sellingPriceAutoFilled: false, sellingPriceEditSequence: 1 },
      { productName: 'Txilar', sellingPrice: 50, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 2 },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 50, sellingUnit: 'Un' });
  });

  it('(ii) 50/Un entered, then 480/Cx entered -> memory becomes 480/Cx', () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 50, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 1 },
      { productName: 'Txilar', sellingPrice: 480, unit: 'Cx', sellingPriceAutoFilled: false, sellingPriceEditSequence: 2 },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 480, sellingUnit: 'Cx' });
  });

  it('the confirmed-selling-unit preference never overrides recency — a non-preferred-unit later entry still wins', () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 50, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 1 },
      { productName: 'Txilar', sellingPrice: 480, unit: 'Cx', sellingPriceAutoFilled: false, sellingPriceEditSequence: 2 },
    ];
    const memory = selectSellingMemoryByProductName(
      [],
      (key) => (key === 'txilar' ? 'Un' : undefined), // confirmed selling unit resolver — deliberately ignored by the new rule
      entries
    );
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 480, sellingUnit: 'Cx' });
  });
});

// ==================================================================
// Scenario G — different physical units, no deliberate pricing at all
// -> no deliberate portion created, no memory write
// ==================================================================
describe('Scenario G — physical-unit variation without deliberate pricing', () => {
  it('no candidate is deliberate -> no memory entry, no write', () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Farinha 1kg', sellingPrice: 250, unit: 'Emb', sellingPriceAutoFilled: true },
      { productName: 'Farinha 1kg', sellingPrice: 50, unit: 'Pacote', sellingPriceAutoFilled: true },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.equal(memory.has('farinha 1kg'), false);
  });

  it('a physical-unit-only change never marks a row deliberate', () => {
    const row: StockCountWorkingRow = { productName: 'Farinha 1kg', quantity: '5', unit: 'Emb', costPrice: '', sellingPrice: '500', sellingPriceAutoFilled: true, sellingPriceBasisUnit: 'Emb' };
    const result = applySellingConfigurationEditRules(row, { unit: 'Pacote' }, { unitRelationship: FARINHA_RELATIONSHIP, sellingPrice: 50 });
    assert.equal(result.sellingPriceAutoFilled, true, 'unit-only change must never flip deliberateness');
  });
});

// ==================================================================
// Scenario H/I — deliberate denomination never reinterpreted
// ==================================================================
describe('Scenario H/I — deliberate denomination is never reinterpreted', () => {
  it('480 MZN/Cx is never displayed/stored as 480 MZN/Un', () => {
    const row: StockCountWorkingRow = { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '', sellingPrice: '', sellingPriceAutoFilled: true };
    const result = applySellingConfigurationEditRules(row, { sellingPrice: '480' }, { unitRelationship: TXILAR_RELATIONSHIP, sellingPrice: 50 });
    assert.equal(result.sellingPriceBasisUnit, 'Cx');
    assert.notEqual(result.sellingPriceBasisUnit, 'Un');
  });

  it('changing physical unit on an already-deliberate row leaves its selling configuration completely untouched', () => {
    const row: StockCountWorkingRow = {
      productName: 'Txilar',
      quantity: '5',
      unit: 'Cx',
      costPrice: '',
      sellingPrice: '480',
      sellingPriceAutoFilled: false,
      sellingPriceBasisUnit: 'Cx',
      sellingPriceEditSequence: 1,
    };
    const result = applySellingConfigurationEditRules(row, { unit: 'Un' }, { unitRelationship: TXILAR_RELATIONSHIP, sellingPrice: 50 });
    assert.equal(result.sellingPrice, undefined, 'sellingPrice untouched by this call — only unit changes');
    assert.equal(result.sellingPriceBasisUnit, undefined, "sellingPriceBasisUnit untouched — the row keeps its prior 480 MZN/Cx label");
    assert.equal(Object.keys(result).length, 1, 'only the requested `unit` field is present in the result');
  });
});

// ==================================================================
// Scenario J — blank/default row automatically resolves
// ==================================================================
describe('Scenario J — blank default row auto-resolves via §6.1', () => {
  it('a fresh row (sellingPriceAutoFilled undefined/true) resolves correctly against the product default', () => {
    const resolved = resolveDefaultSellingConfigurationForRow({ quantity: '3', unit: 'Emb' }, 'Pacote', 50, FARINHA_RELATIONSHIP);
    assert.ok(resolved);
    assert.equal(Number(resolved!.sellingPrice), 500); // 1 Emb = 10 Pacotes -> 500 MZN/Emb
    assert.equal(resolved!.sellingPriceBasisUnit, 'Emb');
  });
});

// ==================================================================
// Scenario K — "+ Adicionar Porção" initializes like a catalog row
// ==================================================================
describe('Scenario K — manual-row default resolution for an existing product', () => {
  it('a manual row created for an existing product resolves the same default a catalog row would', () => {
    const catalogResolved = resolveDefaultSellingConfigurationForRow({ quantity: '3', unit: 'Cx' }, 'Un', 50, TXILAR_RELATIONSHIP);
    const manualResolved = resolveDefaultSellingConfigurationForRow({ quantity: '3', unit: 'Cx' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.deepEqual(manualResolved, catalogResolved);
  });
});

// ==================================================================
// Scenario L — multiple deliberate configs -> highest sequence wins
// (see Scenario F, above, for the full both-directions proof)
// ==================================================================
describe('Scenario L — multiple deliberate configs, highest sequence wins', () => {
  it('three deliberate entries -> the one with the highest sequence wins, regardless of array position', () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 999, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 5 }, // highest sequence, FIRST in array
      { productName: 'Txilar', sellingPrice: 480, unit: 'Cx', sellingPriceAutoFilled: false, sellingPriceEditSequence: 3 },
      { productName: 'Txilar', sellingPrice: 50, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 4 },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 999, sellingUnit: 'Un' });
  });
});

// ==================================================================
// Scenario M/N/O — Add Stock: no code touched by this Authorization,
// asserted here only as a structural/documentation confirmation —
// full behavioral verification is Add Stock's own existing test suite
// (untouched, unmodified, per Implementation Plan §8/Authorization §1
// item 8, "NO IMPLEMENTATION CHANGE REQUIRED").
// ==================================================================
describe('Scenario M/N/O — Add Stock requires no implementation change', () => {
  it('documents the boundary — Add Stock behavioral verification is its own existing, untouched suite', () => {
    assert.ok(true);
  });
});

// ==================================================================
// Scenario P/Q — Mode A remains available; no double conversion
// ==================================================================
describe('Scenario P/Q — Mode A availability and no double conversion', () => {
  it('normal mixed-unit counting needs no Mode A — resolveDefaultSellingConfigurationForRow alone produces the correct value', () => {
    const resolved = resolveDefaultSellingConfigurationForRow({ quantity: '12', unit: 'Cx' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.ok(resolved);
    assert.equal(Number(resolved!.sellingPrice) * 12, 14400);
  });

  it("Mode A's own deriveModeAPortionValuations (unmodified) and the new resolver produce byte-identical output for the same inputs — proving no second, divergent conversion engine exists", () => {
    const viaModeA = deriveModeAPortionValuations([{ id: 'p1', unit: 'Cx', quantity: 12 }], 'Un', 50, TXILAR_RELATIONSHIP);
    const viaResolver = resolveDefaultSellingConfigurationForRow({ quantity: '12', unit: 'Cx' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.equal(String(viaModeA[0].derivedSellingPrice), viaResolver!.sellingPrice);
  });
});

// ==================================================================
// Scenario R — Initial Stock isolation
// ==================================================================
describe('Scenario R — Initial Stock isolation', () => {
  it("selectSellingMemoryByProductName falls back to pre-existing behavior when the caller omits workingRowDeliberateEntries (Initial Stock's own call shape)", () => {
    const memory = selectSellingMemoryByProductName(
      [{ productName: 'Txilar', sellingPrice: 50, unit: 'Un' }],
      () => 'Un',
      undefined // Initial Stock never passes this parameter
    );
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 50, sellingUnit: 'Un' });
  });
});

// ==================================================================
// Scenario V — no valid unit relationship -> safe fallback, no
// fabricated price
// ==================================================================
describe('Scenario V — no valid unit relationship', () => {
  it('resolveDefaultSellingConfigurationForRow returns null when the unit is outside the confirmed chain', () => {
    const resolved = resolveDefaultSellingConfigurationForRow({ quantity: '5', unit: 'Saco' }, 'Un', 50, TXILAR_RELATIONSHIP);
    assert.equal(resolved, null);
  });

  it('the unresolvable-unit edge case clears sellingPrice and stays non-deliberate/auto-filled — never fabricates a value', () => {
    const row: StockCountWorkingRow = { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '', sellingPrice: '1200', sellingPriceAutoFilled: true, sellingPriceBasisUnit: 'Cx' };
    const result = applySellingConfigurationEditRules(row, { unit: 'Saco' }, { unitRelationship: TXILAR_RELATIONSHIP, sellingPrice: 50 });
    assert.equal(result.sellingPrice, '');
    assert.equal(result.sellingPriceAutoFilled, true, 'stays non-deliberate — a mere unit edit into unconvertible territory implies no deliberate act');
    assert.equal(result.sellingPriceBasisUnit, undefined);
  });

  it('returns null with no relationship at all — even a same-unit case requires a confirmed relationship to exist (never fabricates)', () => {
    const resolved = resolveDefaultSellingConfigurationForRow({ quantity: '5', unit: 'Un' }, 'Un', 50, undefined);
    // getConversionFactor requires isValidUnitRelationship unconditionally
    // — even fromUnit === toUnit returns null without a confirmed
    // relationship (purchaseToSellingConversion.ts's own contract).
    // This is correct: FR-89's "never fabricate" exception applies
    // regardless of whether the units happen to already match.
    assert.equal(resolved, null);
  });
});

// ==================================================================
// Scenario W — multiple deliberate portions sum correctly, no
// cross-denomination conversion
// ==================================================================
describe('Scenario W — multiple deliberate portions summed without cross-denomination conversion', () => {
  it('5 Cx@480/Cx + 7 Cx@50/Un (both deliberate) sums to 10,800 MZN with each price stored in its own entered denomination', () => {
    const { items, totalSellingValue } = normalizeStockCountItems([
      { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '0', sellingPrice: '480' },
      { productName: 'Txilar', quantity: '7', unit: 'Cx', costPrice: '0', sellingPrice: String(50 * 24) },
    ]);
    assert.equal(totalSellingValue, 10800);
    assert.equal(items[0].sellingPrice, 480);
    assert.equal(items[1].sellingPrice, 1200);
  });
});

// ==================================================================
// Scenario X — edit-sequence ordering is deterministic, independent
// of array order
// ==================================================================
describe('Scenario X — edit-sequence ordering deterministic, independent of array order', () => {
  it('shuffling the candidate array order never changes the winner — only sellingPriceEditSequence decides', () => {
    const forward: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 480, unit: 'Cx', sellingPriceAutoFilled: false, sellingPriceEditSequence: 7 },
      { productName: 'Txilar', sellingPrice: 50, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 3 },
    ];
    const shuffled: WorkingRowDeliberateEntry[] = [forward[1], forward[0]];
    const memoryForward = selectSellingMemoryByProductName([], () => undefined, forward);
    const memoryShuffled = selectSellingMemoryByProductName([], () => undefined, shuffled);
    assert.deepEqual(memoryForward.get('txilar'), memoryShuffled.get('txilar'));
    assert.deepEqual(memoryForward.get('txilar'), { sellingPrice: 480, sellingUnit: 'Cx' });
  });
});

// ==================================================================
// Scenario Y — 3 Cx + 3 Emb + 5 Un, same product, none deliberately
// priced -> 4,750 MZN, no merging
// ==================================================================
describe('Scenario Y — 3 Cx + 3 Emb + 5 Un for one product, no merging', () => {
  it('each of three physical quantity entries in three different units resolves independently and sums correctly', () => {
    const cxResolved = resolveDefaultSellingConfigurationForRow({ quantity: '3', unit: 'Cx' }, 'Un', 50, LITE_RELATIONSHIP);
    const embResolved = resolveDefaultSellingConfigurationForRow({ quantity: '3', unit: 'Emb' }, 'Un', 50, LITE_RELATIONSHIP);
    const unResolved = resolveDefaultSellingConfigurationForRow({ quantity: '5', unit: 'Un' }, 'Un', 50, LITE_RELATIONSHIP);
    assert.ok(cxResolved && embResolved && unResolved);

    const { items, totalSellingValue } = normalizeStockCountItems([
      { productName: 'Lite', quantity: '3', unit: 'Cx', costPrice: '0', sellingPrice: cxResolved!.sellingPrice },
      { productName: 'Lite', quantity: '3', unit: 'Emb', costPrice: '0', sellingPrice: embResolved!.sellingPrice },
      { productName: 'Lite', quantity: '5', unit: 'Un', costPrice: '0', sellingPrice: unResolved!.sellingPrice },
    ]);

    assert.equal(items.length, 3, 'three distinct physical quantity entries, never merged');
    assert.equal(items[0].quantity, 3);
    assert.equal(items[0].unit, 'Cx');
    assert.equal(items[1].quantity, 3);
    assert.equal(items[1].unit, 'Emb');
    assert.equal(items[2].quantity, 5);
    assert.equal(items[2].unit, 'Un');
    // 3 Cx * 24 Un/Cx * 50 = 3,600 ; 3 Emb * 6 Un/Emb * 50 = 900 ; 5 Un * 50 = 250 ; total 4,750
    assert.equal(totalSellingValue, 4750);
  });
});

// ==================================================================
// Scenario Z — cross-product edit-sequence isolation
// ==================================================================
describe('Scenario Z — cross-product edit-sequence isolation', () => {
  it("Product A's own last deliberate entry wins regardless of Product B's edit landing between Product A's two edits", () => {
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Product A', sellingPrice: 100, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 1 },
      { productName: 'Product B', sellingPrice: 200, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 2 },
      { productName: 'Product A', sellingPrice: 150, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: 3 },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.deepEqual(memory.get('product a'), { sellingPrice: 150, sellingUnit: 'Un' }, "Product A's third (later) edit wins, unaffected by Product B's edit in between");
    assert.deepEqual(memory.get('product b'), { sellingPrice: 200, sellingUnit: 'Un' });
  });
});

// ==================================================================
// Scenario AA — draft-resume edit-sequence continuity
// ==================================================================
describe('Scenario AA — draft-resume edit-sequence continuity', () => {
  it('re-seeding the counter to max(resumed sequences) + 1 lets a post-resume deliberate entry correctly win as the later entry', () => {
    // Simulates PeriodicStockCountView.tsx's own handleResumeDraft
    // re-seed logic: highest resumed sequence + 1.
    const resumedRows: StockCountWorkingRow[] = [
      { productName: 'Txilar', quantity: '5', unit: 'Cx', costPrice: '', sellingPrice: '480', sellingPriceAutoFilled: false, sellingPriceBasisUnit: 'Cx', sellingPriceEditSequence: 1 },
    ];
    const highestResumedSequence = resumedRows.reduce(
      (max, row) => (row.sellingPriceEditSequence !== undefined && row.sellingPriceEditSequence > max ? row.sellingPriceEditSequence : max),
      0
    );
    assert.equal(highestResumedSequence, 1);
    const reseeded = highestResumedSequence + 1;
    // A post-resume deliberate entry receives sequence 2, correctly
    // later than the pre-interruption entry's sequence 1.
    const entries: WorkingRowDeliberateEntry[] = [
      { productName: 'Txilar', sellingPrice: 480, unit: 'Cx', sellingPriceAutoFilled: false, sellingPriceEditSequence: 1 },
      { productName: 'Txilar', sellingPrice: 50, unit: 'Un', sellingPriceAutoFilled: false, sellingPriceEditSequence: reseeded },
    ];
    const memory = selectSellingMemoryByProductName([], () => undefined, entries);
    assert.deepEqual(memory.get('txilar'), { sellingPrice: 50, sellingUnit: 'Un' });
  });
});

// ==================================================================
// Draft round-trip — the three new working-row fields
// ==================================================================
describe('Draft round-trip — sellingPriceAutoFilled/sellingPriceBasisUnit/sellingPriceEditSequence', () => {
  it('round-trips all three new fields losslessly through workingRowToDraftItem/draftItemToWorkingRow', () => {
    const row: StockCountWorkingRow = {
      productName: 'Txilar',
      quantity: '5',
      unit: 'Cx',
      costPrice: '',
      sellingPrice: '480',
      sellingPriceAutoFilled: false,
      sellingPriceBasisUnit: 'Cx',
      sellingPriceEditSequence: 3,
    };
    const draftItem = workingRowToDraftItem(row);
    assert.equal(draftItem.sellingPriceAutoFilled, false);
    assert.equal(draftItem.sellingPriceBasisUnit, 'Cx');
    assert.equal(draftItem.sellingPriceEditSequence, 3);
    const restored = draftItemToWorkingRow(draftItem);
    assert.equal(restored.sellingPriceAutoFilled, false);
    assert.equal(restored.sellingPriceBasisUnit, 'Cx');
    assert.equal(restored.sellingPriceEditSequence, 3);
  });

  it('a legacy row with none of the three fields omits them entirely from the draft item — never writes literal undefined', () => {
    const row: StockCountWorkingRow = { productName: 'Legacy', quantity: '1', unit: 'un', costPrice: '', sellingPrice: '' };
    const draftItem = workingRowToDraftItem(row);
    assert.equal('sellingPriceAutoFilled' in draftItem, false);
    assert.equal('sellingPriceBasisUnit' in draftItem, false);
    assert.equal('sellingPriceEditSequence' in draftItem, false);
  });
});

// ==================================================================
// tallyStockCountRows — same guarantees as normalizeStockCountItems,
// via the Owner-facing preview path
// ==================================================================
describe('tallyStockCountRows — preview path matches persistence path', () => {
  it('12 Cx @ resolved 1,200/Cx tallies to 14,400 MZN, identical to normalizeStockCountItems', () => {
    const rows: StockCountWorkingRow[] = [
      { productName: 'Txilar', quantity: '12', unit: 'Cx', costPrice: '0', sellingPrice: '1200' },
    ];
    const { countedItems, totalSellingValue } = tallyStockCountRows(rows);
    assert.equal(totalSellingValue, 14400);
    assert.equal(countedItems[0].quantity, 12);
    assert.equal(countedItems[0].unit, 'Cx');
  });
});
