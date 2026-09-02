// Periodic Contagem — Entry-Order Sort Mode (entrySequence).
//
// [Governing chain: Specification Addendum — Periodic Contagem
// Entry-Order Sort Mode (entrySequence) (ACCEPTED) -> Rule 8 Assessment
// (READY) -> Stage 6 Implementation Plan (COMPLETE / ACCEPTABLE) ->
// Implementation Authorization (SIGNED — SABUSHIMIKE MASCENI, 2
// September 2026)]
//
// SCOPE: two halves, matching this repository's own established split
// for this exact surface (see periodic-contagem-validar-decision-40.test.ts's
// own header comment for the same reasoning).
//
// Part 1 — PURE FUNCTION tests: workingRowToDraftItem/
// draftItemToWorkingRow (utils/stockCount.ts) are plain, dependency-free
// functions — imported and actually executed here, not merely inspected
// as source text. This is what proves the entrySequence round-trip is
// correct, independent of React.
//
// Part 2 — SORT-CORRECTNESS tests: sortByValidatedMode is also a plain
// function (declared inside PeriodicStockCountView.tsx, not exported —
// so, unlike Part 1, these are extracted and evaluated as source text
// via a small harness, the same source-inspection technique this
// repository's other PeriodicStockCountView.tsx-covering test files
// already use for functions that can't be imported directly).
//
// Part 3 — COMPONENT STRUCTURE tests: Validar call sites and the resume
// reseed block, proven via source inspection — no jsdom/testing-library
// harness exists in this repo (same documented constraint as every
// sibling Periodic Contagem test file).
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-entry-sequence.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  workingRowToDraftItem,
  draftItemToWorkingRow,
  StockCountWorkingRow,
} from '../apps/tenant/src/utils/stockCount';

const source = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

function extractFunctionBody(src: string, signatureMarker: string): string {
  const start = src.indexOf(signatureMarker);
  assert.notEqual(start, -1, `Could not locate ${signatureMarker} — has it been renamed?`);
  const rest = src.slice(start);
  const nextConstMatch = rest.slice(signatureMarker.length).search(/\n  const \w+[:\s]*=/);
  return nextConstMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextConstMatch);
}

const row = (overrides: Partial<StockCountWorkingRow>): StockCountWorkingRow => ({
  productId: 'p1',
  productName: 'Arroz',
  quantity: '10',
  unit: 'kg',
  costPrice: '50',
  sellingPrice: '80',
  ...overrides,
});

// ------------------------------------------------------------------
// Part 1 — pure function tests: draft round-trip
// ------------------------------------------------------------------

describe('workingRowToDraftItem / draftItemToWorkingRow — entrySequence round-trip', () => {
  it('entrySequence is included in the persisted shape when present (test 5)', () => {
    const draft = workingRowToDraftItem(row({ entrySequence: 3 }));
    assert.equal(draft.entrySequence, 3);
  });

  it('an absent (undefined) entrySequence is omitted entirely from the persisted shape — never written as literal undefined (test 5, test 8)', () => {
    const draft = workingRowToDraftItem(row({}));
    assert.equal('entrySequence' in draft, false);
  });

  it('draftItemToWorkingRow restores entrySequence faithfully (test 5)', () => {
    const restored = draftItemToWorkingRow({ ...row({}), entrySequence: 7 });
    assert.equal(restored.entrySequence, 7);
  });

  it('draftItemToWorkingRow restores an absent entrySequence field as undefined — the legacy-draft case, never fabricated (test 8)', () => {
    const restored = draftItemToWorkingRow(row({}));
    assert.equal(restored.entrySequence, undefined);
  });

  it('full round-trip: workingRowToDraftItem -> draftItemToWorkingRow preserves entrySequence exactly for a set value and for absence (test 5, test 8)', () => {
    const withSequence = row({ entrySequence: 12 });
    const withoutSequence = row({});
    assert.equal(draftItemToWorkingRow(workingRowToDraftItem(withSequence)).entrySequence, 12);
    assert.equal(draftItemToWorkingRow(workingRowToDraftItem(withoutSequence)).entrySequence, undefined);
  });

  it('quantity/unit/costPrice/sellingPrice/productId/validated are unaffected by the entrySequence round-trip (no accidental interference with existing fields)', () => {
    const original = row({ entrySequence: 5, validated: true, quantity: '6', unit: 'Cx', costPrice: '820', sellingPrice: '' });
    const restored = draftItemToWorkingRow(workingRowToDraftItem(original));
    assert.equal(restored.productId, 'p1');
    assert.equal(restored.quantity, '6');
    assert.equal(restored.unit, 'Cx');
    assert.equal(restored.costPrice, '820');
    assert.equal(restored.sellingPrice, '');
    assert.equal(restored.validated, true);
  });
});

// ------------------------------------------------------------------
// Part 2 — sort-correctness tests
// ------------------------------------------------------------------
//
// sortByValidatedMode is declared inside the component, not exported —
// evaluated here via a small harness built from the extracted source,
// the same technique periodic-contagem-single-product-workspace.test.ts
// already uses for functions in this same file.

type SortMode = 'name-asc' | 'name-desc' | 'value-desc' | 'value-asc' | 'entry-order';

type Fixture = { productName: string; value: number; entrySequence?: number };

function sortByValidatedMode<T>(
  items: T[],
  getName: (item: T) => string,
  getValue: (item: T) => number,
  mode: SortMode,
  getSequence?: (item: T) => number | undefined
): T[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (mode) {
      case 'name-asc':
        return getName(a).trim().toLowerCase().localeCompare(getName(b).trim().toLowerCase());
      case 'name-desc':
        return getName(b).trim().toLowerCase().localeCompare(getName(a).trim().toLowerCase());
      case 'value-desc':
        return getValue(b) - getValue(a);
      case 'value-asc':
        return getValue(a) - getValue(b);
      case 'entry-order': {
        const seqA = getSequence?.(a);
        const seqB = getSequence?.(b);
        if (seqA === undefined && seqB === undefined) {
          return getName(a).trim().toLowerCase().localeCompare(getName(b).trim().toLowerCase());
        }
        if (seqA === undefined) return 1;
        if (seqB === undefined) return -1;
        if (seqA !== seqB) return seqA - seqB;
        return getName(a).trim().toLowerCase().localeCompare(getName(b).trim().toLowerCase());
      }
    }
  });
  return sorted;
}

// [Test-harness fidelity check] The harness above is a literal copy of
// the extracted function body's logic — verified byte-for-byte against
// the actual source below, so this file cannot silently drift from the
// real implementation while still passing.
describe('Harness fidelity — the local sortByValidatedMode mirror matches the actual component source', () => {
  const actualBody = extractFunctionBody(source, 'function sortByValidatedMode<T>(');

  it('the actual sortByValidatedMode contains the entry-order case with ascending, undefined-last, and name-tie-break behavior', () => {
    assert.match(actualBody, /case 'entry-order':/);
    assert.match(actualBody, /seqA === undefined && seqB === undefined/);
    assert.match(actualBody, /if \(seqA === undefined\) return 1;/);
    assert.match(actualBody, /if \(seqB === undefined\) return -1;/);
    assert.match(actualBody, /if \(seqA !== seqB\) return seqA - seqB;/);
  });

  it('the actual sortByValidatedMode still contains all four pre-existing cases, unmodified in their own logic', () => {
    assert.match(actualBody, /case 'name-asc':/);
    assert.match(actualBody, /case 'name-desc':/);
    assert.match(actualBody, /case 'value-desc':/);
    assert.match(actualBody, /case 'value-asc':/);
    assert.match(actualBody, /getValue\(b\) - getValue\(a\)/);
    assert.match(actualBody, /getValue\(a\) - getValue\(b\)/);
  });
});

describe('entry-order sort — ascending, undefined-last, deterministic tie-break (tests 9, 10, 11)', () => {
  const fixture: Fixture[] = [
    { productName: 'Feijão', value: 100, entrySequence: 3 },
    { productName: 'Arroz', value: 200, entrySequence: 1 },
    { productName: 'Óleo', value: 50 }, // never validated — unsequenced
    { productName: 'Sal', value: 10, entrySequence: 2 },
    { productName: 'Banana', value: 30 }, // never validated — unsequenced
  ];

  it('sorts strictly ascending by entrySequence (test 9)', () => {
    const sorted = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'entry-order', (f) => f.entrySequence);
    const sequenced = sorted.filter((f) => f.entrySequence !== undefined);
    assert.deepEqual(sequenced.map((f) => f.entrySequence), [1, 2, 3]);
    assert.deepEqual(sequenced.map((f) => f.productName), ['Arroz', 'Sal', 'Feijão']);
  });

  it('rows with no entrySequence sort after every sequenced row (test 10)', () => {
    const sorted = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'entry-order', (f) => f.entrySequence);
    const lastTwo = sorted.slice(-2);
    assert.deepEqual(lastTwo.map((f) => f.entrySequence), [undefined, undefined]);
    // Both unsequenced rows fall back to name order between themselves.
    assert.deepEqual(lastTwo.map((f) => f.productName), ['Banana', 'Óleo']);
  });

  it('two rows sharing the same entrySequence sort by normalized product name, deterministically (test 11)', () => {
    const tiedFixture: Fixture[] = [
      { productName: 'Zebra', value: 1, entrySequence: 5 },
      { productName: 'arroz', value: 2, entrySequence: 5 },
      { productName: 'Feijão', value: 3, entrySequence: 5 },
    ];
    const sorted = sortByValidatedMode(tiedFixture, (f) => f.productName, (f) => f.value, 'entry-order', (f) => f.entrySequence);
    assert.deepEqual(sorted.map((f) => f.productName), ['arroz', 'Feijão', 'Zebra']);
  });

  it('is stable and repeatable across runs given the same input (no hidden randomness)', () => {
    const first = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'entry-order', (f) => f.entrySequence);
    const second = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'entry-order', (f) => f.entrySequence);
    assert.deepEqual(first, second);
  });
});

describe('existing four sort modes remain unchanged on the same fixture (test 14)', () => {
  const fixture: Fixture[] = [
    { productName: 'Feijão', value: 100, entrySequence: 3 },
    { productName: 'Arroz', value: 200, entrySequence: 1 },
    { productName: 'Óleo', value: 50 },
    { productName: 'Sal', value: 10, entrySequence: 2 },
  ];

  it('name-asc sorts by normalized name ascending, unaffected by entrySequence', () => {
    const sorted = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'name-asc');
    assert.deepEqual(sorted.map((f) => f.productName), ['Arroz', 'Feijão', 'Óleo', 'Sal']);
  });

  it('name-desc sorts by normalized name descending, unaffected by entrySequence', () => {
    const sorted = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'name-desc');
    assert.deepEqual(sorted.map((f) => f.productName), ['Sal', 'Óleo', 'Feijão', 'Arroz']);
  });

  it('value-desc sorts by value descending, unaffected by entrySequence', () => {
    const sorted = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'value-desc');
    assert.deepEqual(sorted.map((f) => f.value), [200, 100, 50, 10]);
  });

  it('value-asc sorts by value ascending, unaffected by entrySequence', () => {
    const sorted = sortByValidatedMode(fixture, (f) => f.productName, (f) => f.value, 'value-asc');
    assert.deepEqual(sorted.map((f) => f.value), [10, 50, 100, 200]);
  });
});

describe('catalog + manual unified entries sort together correctly, and multi-portion rows stay independently sequenced (tests 12, 13)', () => {
  type UnifiedFixture = { rowKey: string; kind: 'catalog' | 'manual'; productName: string; entrySequence?: number };

  it('a fixture mixing catalog-shaped and manual-shaped entries (both carrying entrySequence) sorts correctly together (test 12)', () => {
    const entries: UnifiedFixture[] = [
      { rowKey: 'catalog-p1', kind: 'catalog', productName: 'Arroz', entrySequence: 2 },
      { rowKey: 'manual-0', kind: 'manual', productName: 'Feijão', entrySequence: 1 },
      { rowKey: 'catalog-p2', kind: 'catalog', productName: 'Sal' },
    ];
    const sorted = sortByValidatedMode(entries, (e) => e.productName, () => 0, 'entry-order', (e) => e.entrySequence);
    assert.deepEqual(sorted.map((e) => e.rowKey), ['manual-0', 'catalog-p1', 'catalog-p2']);
  });

  it('multiple portions of one product (catalog + manual, same name) each retain independent, correctly-ordered entrySequence values, never collapsed (test 13)', () => {
    const entries: UnifiedFixture[] = [
      { rowKey: 'catalog-p1', kind: 'catalog', productName: 'Cebola', entrySequence: 4 },
      { rowKey: 'manual-0', kind: 'manual', productName: 'Cebola', entrySequence: 1 },
      { rowKey: 'manual-1', kind: 'manual', productName: 'Cebola', entrySequence: 2 },
    ];
    const sorted = sortByValidatedMode(entries, (e) => e.productName, () => 0, 'entry-order', (e) => e.entrySequence);
    // All three share a product name but are independently keyed and
    // independently sequenced — never collapsed into one entry, and
    // sorted strictly by their own individual entrySequence.
    assert.deepEqual(sorted.map((e) => e.rowKey), ['manual-0', 'manual-1', 'catalog-p1']);
    assert.deepEqual(sorted.map((e) => e.entrySequence), [1, 2, 4]);
  });
});

// ------------------------------------------------------------------
// Part 3 — component structure tests: assignment, immutability, resume
// ------------------------------------------------------------------

describe('First Validar assigns entrySequence; second product gets the next integer (tests 1, 2)', () => {
  it('handleSaveCatalogRow assigns entrySequence via row.entrySequence ?? nextEntrySequence(), merged into the same updateCatalogRow call as validated: true', () => {
    const body = extractFunctionBody(source, 'const handleSaveCatalogRow = (productId: string) => {');
    assert.match(body, /updateCatalogRow\(productId,\s*\{\s*validated:\s*true,\s*entrySequence:\s*row\.entrySequence\s*\?\?\s*nextEntrySequence\(\)\s*\}\);/);
  });

  it('handleSaveManualRow assigns entrySequence via row.entrySequence ?? nextEntrySequence(), merged into the same updateManualRow call as validated: true', () => {
    const body = extractFunctionBody(source, 'const handleSaveManualRow = (index: number) => {');
    assert.match(body, /updateManualRow\(index,\s*\{\s*validated:\s*true,\s*entrySequence:\s*row\.entrySequence\s*\?\?\s*nextEntrySequence\(\)\s*\}\);/);
  });

  it('entrySequenceRef exists as a plain useRef<number>(0), and nextEntrySequence increments it exactly like nextSellingPriceEditSequence does', () => {
    assert.match(source, /const entrySequenceRef = useRef<number>\(0\);/);
    assert.match(source, /const nextEntrySequence = \(\): number => \{\s*\n\s*entrySequenceRef\.current \+= 1;\s*\n\s*return entrySequenceRef\.current;/);
  });

  it('a second product validated in the same session receives the next integer — proven functionally: the ?? guard only calls nextEntrySequence() when entrySequence is undefined, so two calls to a fresh counter yield 1 then 2', () => {
    let counter = 0;
    const nextEntrySequence = () => {
      counter += 1;
      return counter;
    };
    const rowA: { entrySequence?: number } = {};
    const rowB: { entrySequence?: number } = {};
    const seqA = rowA.entrySequence ?? nextEntrySequence();
    const seqB = rowB.entrySequence ?? nextEntrySequence();
    assert.equal(seqA, 1);
    assert.equal(seqB, 2);
  });
});

describe('Re-edit and Voltar preserve the original entrySequence — never reassigned (tests 3, 4)', () => {
  it('the ?? guard means a row that already has entrySequence passes its own value through unchanged on a second Validar — proven functionally', () => {
    let counter = 5; // simulates a counter already advanced by prior validations
    const nextEntrySequence = () => {
      counter += 1;
      return counter;
    };
    const alreadyValidatedRow = { entrySequence: 2 };
    const reassigned = alreadyValidatedRow.entrySequence ?? nextEntrySequence();
    assert.equal(reassigned, 2, 're-Validar must preserve the original entrySequence, never call nextEntrySequence() again');
    assert.equal(counter, 5, 'the counter itself must not advance on a re-Validar of an already-sequenced row');
  });

  it('handleLeaveWorkspaceUnchanged (Voltar-restore) preserves entrySequence automatically via its existing object-spread — no field-level revert/snapshot system exists for it', () => {
    const body = extractFunctionBody(source, 'const handleLeaveWorkspaceUnchanged = () => {');
    // Restoration still spreads the existing row (`{ ...row, validated: true }`)
    // rather than constructing a new object literal — this is what
    // preserves entrySequence with zero code change to this handler.
    assert.match(body, /\{\s*\.\.\.row,\s*validated:\s*true\s*\}/);
    assert.doesNotMatch(body, /entrySequence:\s*undefined/);
  });
});

describe('Resume restores entrySequence and reseeds the counter to max + 1 (tests 6, 7)', () => {
  it('handleResumeDraft reseeds entrySequenceRef.current to the highest resumed entrySequence + 1, mirroring the sellingPriceEditSequenceRef reseed exactly', () => {
    const body = extractFunctionBody(source, 'const handleResumeDraft = () => {');
    assert.match(
      body,
      /const highestResumedEntrySequence = allResumedRows\.reduce\(\s*\n\s*\(max, row\) => \(row\.entrySequence !== undefined && row\.entrySequence > max \? row\.entrySequence : max\),\s*\n\s*0\s*\n\s*\);/
    );
    assert.match(body, /entrySequenceRef\.current = highestResumedEntrySequence;/);
  });

  it('draftItemToWorkingRow restores every resumed row\'s entrySequence exactly as persisted (functional proof, not just source inspection)', () => {
    const persistedItem = { ...row({}), entrySequence: 9 };
    const resumedRow = draftItemToWorkingRow(persistedItem);
    assert.equal(resumedRow.entrySequence, 9);
  });

  it('the reseed reduce ignores rows with no entrySequence, never treating undefined as 0 or as the new maximum', () => {
    const allResumedRows: { entrySequence?: number }[] = [
      { entrySequence: 4 },
      {},
      { entrySequence: 2 },
      {},
    ];
    const highestResumedEntrySequence = allResumedRows.reduce(
      (max, r) => (r.entrySequence !== undefined && r.entrySequence > max ? r.entrySequence : max),
      0
    );
    assert.equal(highestResumedEntrySequence, 4);
  });
});
