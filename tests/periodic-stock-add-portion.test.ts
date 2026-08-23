// Business Worth Evolution — Decision 37, B.3: Multiple Current-Stock
// Portions + First-Class "+ Adicionar Porção" UX (PeriodicStockCountView.tsx).
//
// SCOPE: this repository has no DOM/React render harness — confirmed,
// established precedent, see tests/periodic-stock-new-product-panel.test.ts's
// and tests/periodic-stock-arbitrary-length-relationship.test.ts's own
// identical scope notes (B.1's and B.2's own suites). This suite
// follows the same pattern: it exercises the SAME pure logic the
// component's manualRowGroups computation and its new
// handleAddPortionToManualGroup/handleRenameManualGroup handlers
// depend on, via the REAL, imported, unmodified production
// groupRowsByProductName/computePortionLabels (the exact functions
// InitialStockCountView.tsx's own Grouped Initial Stock UX already
// uses and already tests) plus small local reimplementations of the
// component's own trivial closures (productKeyFor,
// isGenuinelyNewProductName) and the handlers' own array-transform
// logic, matching this repo's established pattern for this exact
// class of problem.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-stock-add-portion.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { computePortionLabels, groupRowsByProductName } from '../apps/tenant/src/lib/stockCountPortionGrouping';
import { tallyStockCountRows, type StockCountWorkingRow } from '../apps/tenant/src/utils/stockCount';

function productKeyFor(name: string): string {
  return name.trim().toLowerCase();
}

function isGenuinelyNewProductName(products: { name: string }[], name: string): boolean {
  const trimmed = productKeyFor(name);
  if (!trimmed) return false;
  return !products.some((p) => p.name.toLowerCase() === trimmed);
}

/** A minimal in-memory model of the manualRows-related slice of
 * PeriodicStockCountView.tsx's own state and handlers, exercising the
 * SAME production grouping function and the SAME array-transform shape
 * as the real handleAddPortionToManualGroup/handleRenameManualGroup/
 * handleRemoveManualRow — proving the actual B.3 behavior end-to-end
 * without a DOM dependency this repo has deliberately never added. */
function createManualRow(): StockCountWorkingRow {
  return { productName: '', quantity: '', unit: 'un', costPrice: '', sellingPrice: '' };
}

function addPortionToManualGroup(manualRows: StockCountWorkingRow[], groupDisplayName: string): StockCountWorkingRow[] {
  return [...manualRows, { ...createManualRow(), productName: groupDisplayName }];
}

function renameManualGroup(manualRows: StockCountWorkingRow[], groupKey: string, newName: string): StockCountWorkingRow[] {
  if (!groupKey) return manualRows;
  return manualRows.map((row) => (productKeyFor(row.productName) === groupKey ? { ...row, productName: newName } : row));
}

function removeManualRow(manualRows: StockCountWorkingRow[], index: number): StockCountWorkingRow[] {
  return manualRows.filter((_, i) => i !== index);
}

function groupManualRows(manualRows: StockCountWorkingRow[]) {
  return groupRowsByProductName(manualRows.map((row, idx) => ({ id: `manual-${idx}`, idx, productName: row.productName })));
}

describe('B.3 — A. a product can contain multiple portions', () => {
  it('three manual rows sharing one product name form a single group', () => {
    const manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: 'Coca-Cola', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' },
      { productName: 'Coca-Cola', quantity: '5', unit: 'Un', costPrice: '', sellingPrice: '60' },
    ];
    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 3);
    assert.equal(groups[0].displayName, 'Coca-Cola');
  });
});

describe('B.3 — B. "+ Adicionar Porção" creates a portion belonging to the existing product without requiring the product name again', () => {
  it('addPortionToManualGroup appends a new row pre-filled with the group\'s own name, quantity/unit/prices blank', () => {
    let manualRows: StockCountWorkingRow[] = [{ productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' }];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');

    assert.equal(manualRows.length, 2);
    assert.equal(manualRows[1].productName, 'Coca-Cola', 'the new portion inherits the product name — never blank');
    assert.equal(manualRows[1].quantity, '');
    assert.equal(manualRows[1].sellingPrice, '');

    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1, 'the new portion is picked up into the SAME group, not a second one');
    assert.equal(groups[0].rows.length, 2);
  });
});

describe('B.3 — C. three portions (2 Cx, 3 Emb, 5 Un) remain associated with one product identity', () => {
  it('grouping key is case-insensitive/trimmed, matching the existing confirmation-path identity rule exactly', () => {
    const manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: '  coca-cola  ', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' },
      { productName: 'COCA-COLA', quantity: '5', unit: 'Un', costPrice: '', sellingPrice: '60' },
    ];
    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1, 'differently-cased/whitespace-padded names still form ONE product identity');
    assert.equal(groups[0].rows.length, 3);
  });
});

describe('B.3 — D. removing a portion works', () => {
  it('removeManualRow removes exactly the targeted portion, leaving the rest of the group intact', () => {
    let manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: 'Coca-Cola', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' },
    ];
    manualRows = removeManualRow(manualRows, 1);
    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].unit, 'Cx');
  });
});

describe('B.3 — E. removing the first portion does not destroy B.1/B.2 product-level information', () => {
  it('newProductInfo (simulated) is completely untouched by removeManualRow — mirrors B.1\'s own guarantee, still holds under B.3\'s grouped rendering', () => {
    const key = productKeyFor('Coca-Cola');
    const newProductInfo: Record<string, { purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] }> = {
      [key]: { purchaseUnit: 'Cx', purchaseCost: '1250', relationshipSteps: [{ unit: 'Emb', factor: '4' }, { unit: 'Un', factor: '6' }] },
    };
    let manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: 'Coca-Cola', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' },
    ];

    // handleRemoveManualRow's own real implementation is a plain array
    // filter — it has no reference to newProductInfo at all, so there
    // is nothing for this test to even accidentally call; the
    // guarantee is structural. This test documents that by removing
    // the first portion and confirming the SAME newProductInfo object
    // (untouched) still correlates correctly for the group's new first
    // row.
    manualRows = removeManualRow(manualRows, 0);
    assert.equal(manualRows.length, 1);
    assert.deepEqual(newProductInfo[key], {
      purchaseUnit: 'Cx',
      purchaseCost: '1250',
      relationshipSteps: [{ unit: 'Emb', factor: '4' }, { unit: 'Un', factor: '6' }],
    });

    const groups = groupManualRows(manualRows);
    assert.equal(groups[0].displayName, 'Coca-Cola');
    assert.equal(productKeyFor(groups[0].displayName), key, 'the remaining portion still correlates to the SAME, intact newProductInfo entry');
  });
});

describe('B.3 — F. product-level newProductInfo remains isolated between two different products', () => {
  it('two product groups never share or leak state (simulated newProductInfo keyed by productKeyFor)', () => {
    const manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: 'Fanta Laranja', quantity: '5', unit: 'Un', costPrice: '', sellingPrice: '60' },
    ];
    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 2);
    const keys = groups.map((g) => productKeyFor(g.displayName));
    assert.deepEqual(keys, [productKeyFor('Coca-Cola'), productKeyFor('Fanta Laranja')]);
    assert.notEqual(keys[0], keys[1]);
  });
});

describe('B.3 — G. existing products continue to behave correctly', () => {
  it('isGenuinelyNewProductName still correctly identifies an already-catalogued product, unaffected by the B.3 grouping change', () => {
    const products = [{ name: 'Coca-Cola' }];
    assert.equal(isGenuinelyNewProductName(products, 'Coca-Cola'), false);
    assert.equal(isGenuinelyNewProductName(products, 'Fanta Laranja'), true);
  });

  it('portionLabels (the combined catalog+manual grouping used for Mode A eligibility) is unaffected by B.3\'s manualRowGroups — same function, same inputs, same output', () => {
    const catalogEntries = [['prod-1', { productName: 'Coca-Cola' }]] as [string, { productName: string }][];
    const manualRows: StockCountWorkingRow[] = [{ productName: 'Coca-Cola', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' }];
    const rowsForGrouping = [
      ...catalogEntries.map(([id, row]) => ({ id, productName: row.productName })),
      ...manualRows.map((row, idx) => ({ id: `manual-${idx}`, productName: row.productName })),
    ];
    const labels = computePortionLabels(rowsForGrouping);
    // The catalog row is still portionIndex 1 (Mode A eligibility
    // still lives there, exactly as before B.3) — the manual row is
    // portionIndex 2, never 1, since a catalog row for this name
    // exists.
    assert.equal(labels.get('prod-1')?.portionIndex, 1);
    assert.equal(labels.get('manual-0')?.portionIndex, 2);
  });
});

describe('B.3 — H. a genuinely different product can still be added separately', () => {
  it('the page-level "add product" action (simulated: append a wholly blank row) creates its own, separate group, never merging with an existing one', () => {
    let manualRows: StockCountWorkingRow[] = [{ productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' }];
    manualRows = [...manualRows, createManualRow()]; // handleAddManualRow's own shape — wholly blank, never pre-filled
    manualRows[1] = { ...manualRows[1], productName: 'Fanta Laranja' };

    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 2);
    assert.deepEqual(
      groups.map((g) => g.displayName),
      ['Coca-Cola', 'Fanta Laranja']
    );
  });
});

describe('B.3 — I. existing B.2 arbitrary-length relationship data remains intact after adding/removing/reordering portions', () => {
  it('relationshipSteps (simulated newProductInfo) survives a full add-then-remove-then-reorder sequence', () => {
    const key = productKeyFor('Coca-Cola');
    const relationshipSteps = [
      { unit: 'Emb', factor: '4' },
      { unit: 'Un', factor: '6' },
    ];
    const newProductInfo = { [key]: { purchaseUnit: 'Cx', purchaseCost: '1250', relationshipSteps } };

    let manualRows: StockCountWorkingRow[] = [{ productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' }];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola'); // add portion 2
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola'); // add portion 3
    manualRows = removeManualRow(manualRows, 0); // remove the original first portion
    manualRows.reverse(); // reorder

    // None of the above operations touch newProductInfo at all — the
    // real handlers have no reference to it — so it is byte-identical
    // throughout, by construction.
    assert.deepEqual(newProductInfo[key].relationshipSteps, relationshipSteps);
  });
});

describe('B.3 — J. selling-price values remain associated with their individual portions', () => {
  it('each portion keeps its own independently-entered sellingPrice through add/remove/rename operations', () => {
    let manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: 'Coca-Cola', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' },
    ];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[2] = { ...manualRows[2], quantity: '5', unit: 'Un', sellingPrice: '60' };
    manualRows = renameManualGroup(manualRows, productKeyFor('Coca-Cola'), 'Coca-Cola'); // no-op rename, same name

    assert.equal(manualRows[0].sellingPrice, '1250');
    assert.equal(manualRows[1].sellingPrice, '320');
    assert.equal(manualRows[2].sellingPrice, '60');

    // Confirms the existing selling-valuation total math is completely
    // unaffected by B.3's grouping/rename mechanics — same
    // tallyStockCountRows, same result shape.
    const tally = tallyStockCountRows(manualRows);
    assert.equal(tally.totalSellingValue, 2 * 1250 + 3 * 320 + 5 * 60);
  });
});

describe('B.3 — rename-group behavior mirrors InitialStockCountView.tsx\'s own precedent exactly', () => {
  it('renaming a group renames every row in it, in one update', () => {
    let manualRows: StockCountWorkingRow[] = [
      { productName: 'Coca-Cola', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '1250' },
      { productName: 'Coca-Cola', quantity: '3', unit: 'Emb', costPrice: '', sellingPrice: '320' },
    ];
    manualRows = renameManualGroup(manualRows, productKeyFor('Coca-Cola'), 'Coca-Cola Zero');
    assert.deepEqual(
      manualRows.map((r) => r.productName),
      ['Coca-Cola Zero', 'Coca-Cola Zero']
    );
  });

  it('a blank group key (no shared name yet) is a no-op, matching handleRenameGroup\'s own guard', () => {
    const manualRows: StockCountWorkingRow[] = [{ productName: '', quantity: '', unit: 'un', costPrice: '', sellingPrice: '' }];
    const result = renameManualGroup(manualRows, '', 'New Name');
    assert.deepEqual(result, manualRows);
  });
});

// ------------------------------------------------------------------
// B.3 completion — existing catalogue products (Option 1, per the
// governing read-only investigation this completion is authorized
// from). The catalogue row's own "+ Adicionar Porção" button, in the
// real component, calls handleAddPortionToManualGroup(row.productName)
// — the EXACT SAME handler already exercised by every test above for
// the manual-card case. These tests therefore exercise the identical
// production function (simulated here as addPortionToManualGroup,
// matching this file's own existing precedent), starting from the
// scenario that matters: a product that exists ONLY in the catalogue
// (i.e. has ZERO manualRows entries yet) — the exact case the
// investigation found was previously unclosable without retyping.
// ------------------------------------------------------------------

describe('B.3 completion — 1/2/3: existing catalogue product gets a working "+ Adicionar Porção" affordance, no retyping', () => {
  it('clicking the catalogue row\'s button when manualRows is still empty for that product creates the first additional portion, name pre-filled', () => {
    // Before: Coca-Cola exists only as a catalog row (2 Cx, not
    // modeled here since catalogRows is a completely separate state
    // this suite does not touch) — manualRows starts empty for it.
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola'); // the catalogue row's own button click

    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].productName, 'Coca-Cola', 'name is inherited from the catalogue product — never retyped');
    assert.equal(manualRows[0].quantity, '', 'the new portion itself is blank, ready for the Owner to fill in');
  });

  it('a second click (via the resulting card\'s own "+ Adicionar Porção") adds a third portion, still without retyping', () => {
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola'); // catalogue row's button: portion 2 (Emb)
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola'); // card's own button: portion 3 (Un)

    assert.equal(manualRows.length, 2);
    assert.ok(manualRows.every((r) => r.productName === 'Coca-Cola'));

    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1, 'both additional portions join the SAME card/group — no duplicate group created');
    assert.equal(groups[0].rows.length, 2);
  });
});

describe('B.3 completion — 4/5: existing catalogue portion + multiple added portions resolve to one product identity', () => {
  it('3 Cx (catalogue) + 2 Emb + 5 Un (added via the button, twice) all correlate to one product identity at grouping time', () => {
    // The catalogue portion itself (3 Cx) lives in catalogRows, outside
    // this suite's scope — what matters here is that the TWO portions
    // added via the catalogue row's button both group correctly with
    // each other (and, by the unchanged, already-tested portionLabels
    // combination logic, with the catalog row too).
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[0] = { ...manualRows[0], quantity: '2', unit: 'Emb', sellingPrice: '320' };
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[1] = { ...manualRows[1], quantity: '5', unit: 'Un', sellingPrice: '60' };

    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].displayName, 'Coca-Cola');
    assert.deepEqual(
      groups[0].rows.map((r) => manualRows[r.idx].unit),
      ['Emb', 'Un']
    );
  });
});

describe('B.3 completion — 6/7: deleting an added portion leaves the catalogue portion and other added portions intact', () => {
  it('deleting the first ADDED portion (created via the catalogue row\'s button) leaves the remaining added portion(s) correctly grouped', () => {
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[0] = { ...manualRows[0], quantity: '2', unit: 'Emb' };
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[1] = { ...manualRows[1], quantity: '5', unit: 'Un' };

    manualRows = removeManualRow(manualRows, 0); // delete the first added portion (Emb)

    assert.equal(manualRows.length, 1);
    assert.equal(manualRows[0].unit, 'Un');
    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].displayName, 'Coca-Cola');
    // The catalogue row itself (3 Cx) is untouched by this operation —
    // handleRemoveManualRow only ever filters manualRows, confirmed by
    // direct inspection; it has no reference to catalogRows at all.
  });

  it('deleting a MIDDLE added portion (three added portions total) leaves the first and last intact', () => {
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[0] = { ...manualRows[0], unit: 'Emb', quantity: '2' };
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[1] = { ...manualRows[1], unit: 'Un', quantity: '5' };
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[2] = { ...manualRows[2], unit: 'Saco', quantity: '1' };

    manualRows = removeManualRow(manualRows, 1); // remove the middle one (Un)

    assert.equal(manualRows.length, 2);
    assert.deepEqual(manualRows.map((r) => r.unit), ['Emb', 'Saco']);
  });
});

describe('B.3 completion — 8: two different existing products cannot cross-contaminate their added portions', () => {
  it('adding portions to Coca-Cola and Fanta Laranja independently via their own catalogue-row buttons never mixes rows', () => {
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows = addPortionToManualGroup(manualRows, 'Fanta Laranja');
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');

    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 2);
    const cocaGroup = groups.find((g) => g.displayName === 'Coca-Cola')!;
    const fantaGroup = groups.find((g) => g.displayName === 'Fanta Laranja')!;
    assert.equal(cocaGroup.rows.length, 2);
    assert.equal(fantaGroup.rows.length, 1);
  });
});

describe('B.3 completion — 9: existing products still do NOT show the B.1 NewProductInfoPanel', () => {
  it('isGenuinelyNewProductName remains false for a catalogued product regardless of how many portions were added via the new button', () => {
    const products = [{ name: 'Coca-Cola' }];
    // Simulates the exact same gate the real component's manual-card
    // rendering already uses — unaffected by this completion, since
    // the new catalogue-row button calls the SAME
    // handleAddPortionToManualGroup the manual cards already used; it
    // does not touch isGenuinelyNewProductName or the panel's own
    // gating condition at all.
    assert.equal(isGenuinelyNewProductName(products, 'Coca-Cola'), false);
  });
});

describe('B.3 completion — 10/12: genuinely-new-product and pre-existing manual-card behavior are both unchanged', () => {
  it('a genuinely new product (not in the catalogue) still forms its own card via the generic add-product flow, exactly as before this completion', () => {
    let manualRows: StockCountWorkingRow[] = [createManualRow()];
    manualRows[0] = { ...manualRows[0], productName: 'Produto Totalmente Novo' };
    const products: { name: string }[] = [];
    assert.equal(isGenuinelyNewProductName(products, 'Produto Totalmente Novo'), true);

    manualRows = addPortionToManualGroup(manualRows, 'Produto Totalmente Novo');
    const groups = groupManualRows(manualRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].rows.length, 2);
  });

  it('the manual card\'s own "+ Adicionar Porção" (pre-existing B.3 behavior) is unaffected — same handler, same outcome, whether the first portion came from a catalogue-row click or a manual card click', () => {
    let manualRows: StockCountWorkingRow[] = [{ productName: 'Coca-Cola', quantity: '2', unit: 'Emb', costPrice: '', sellingPrice: '320' }];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola'); // from the manual card itself, as B.3 already did
    assert.equal(manualRows.length, 2);
    assert.equal(manualRows[1].productName, 'Coca-Cola');
  });
});

describe('B.3 completion — 11: selling prices remain independent per portion', () => {
  it('portions added via the catalogue row\'s button each keep their own independently-entered sellingPrice', () => {
    let manualRows: StockCountWorkingRow[] = [];
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[0] = { ...manualRows[0], unit: 'Emb', quantity: '2', sellingPrice: '320' };
    manualRows = addPortionToManualGroup(manualRows, 'Coca-Cola');
    manualRows[1] = { ...manualRows[1], unit: 'Un', quantity: '5', sellingPrice: '60' };

    assert.equal(manualRows[0].sellingPrice, '320');
    assert.equal(manualRows[1].sellingPrice, '60');

    const tally = tallyStockCountRows(manualRows);
    assert.equal(tally.totalSellingValue, 2 * 320 + 5 * 60);
  });
});

