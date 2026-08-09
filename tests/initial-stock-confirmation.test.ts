// Initial Stock confirmation — data-flow contract tests.
//
// SCOPE: recordStockCount() (AppContext.tsx) is tightly coupled to the
// live Firebase client SDK (setDoc/writeBatch against a real `db`
// singleton). This repository has no jsdom/testing-library/vitest
// component-test harness (confirmed: none of those packages are in
// package.json, and every existing suite — calculations.test.ts,
// subscription-engine.test.ts, etc. — tests either pure functions or
// server/*.ts Admin-SDK code that's already decoupled from any DB
// client by construction). Introducing a full React/DOM test harness
// to test recordStockCount() end-to-end would itself be a scope
// expansion beyond this fix, not a narrow addition.
//
// What IS directly testable, and what this suite actually proves:
// normalizeStockCountItems() — the pure function recordStockCount()
// now calls, extracted specifically so this contract could be tested —
// is the ONLY thing that determines what item list a confirmation
// produces. It takes an explicit `items` argument and nothing else; it
// has no access to any draft/autosave/debounce state, so there is no
// code path by which stale draft state could reach a confirmed
// StockCount. The tests below prove that property directly, plus
// source-level regression guards (documented, not disguised as
// integration tests) that would fail if recordStockCount() were ever
// changed to read initialStockDraft, or if the atomic
// confirm+draft-cleanup batching were ever split apart.
//
// HOW TO RUN:
//   npx tsx --test tests/initial-stock-confirmation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeStockCountItems } from '../src/utils/stockCount';

describe('normal confirmation', () => {
  it('normalizes a valid submitted item list into the exact persisted shape', () => {
    const result = normalizeStockCountItems([
      { productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 65 },
      { productName: 'Feijão', quantity: 5, unit: 'kg', costPrice: 80, sellingPrice: 100 },
    ]);
    assert.equal(result.items.length, 2);
    assert.deepEqual(result.items[0], {
      productName: 'Arroz',
      quantity: 10,
      unit: 'kg',
      costPrice: 50,
      sellingPrice: 65,
      totalValue: 500,
    });
    // totalValue stays cost-based (investment basis) — sellingPrice never
    // participates in it, matching Expected Current Stock Value's
    // existing cost-based rule.
    assert.equal(result.totalValue, 500 + 400);
  });

  it('drops blank-name rows and coerces invalid numeric input to 0, matching prior inline behavior', () => {
    const result = normalizeStockCountItems([
      { productName: '   ', quantity: 10, unit: 'kg', costPrice: 50 },
      { productName: 'Óleo', quantity: NaN as unknown as number, unit: '', costPrice: 30 },
    ]);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].productName, 'Óleo');
    assert.equal(result.items[0].quantity, 0);
    assert.equal(result.items[0].unit, 'un'); // default unit when blank
  });
});

// [Module #10 — Selling Price on Stock Counts] normalizeStockCountItems()
// is the single choke point recordStockCount() uses to build both Initial
// Stock and Periodic Contagem items — these tests cover sellingPrice for
// both callers at once, since neither passes anything extra beyond this
// function's input shape.
describe('selling price', () => {
  it('accepts and persists a submitted selling price alongside cost price', () => {
    const result = normalizeStockCountItems([
      { productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 65 },
    ]);
    assert.equal(result.items[0].costPrice, 50);
    assert.equal(result.items[0].sellingPrice, 65);
  });

  it('accepts an explicit 0 selling price (matching the existing zero-cost rule)', () => {
    const result = normalizeStockCountItems([
      { productName: 'Amostra Grátis', quantity: 3, unit: 'un', costPrice: 0, sellingPrice: 0 },
    ]);
    assert.equal(result.items[0].sellingPrice, 0);
  });

  it('coerces a missing/invalid selling price to 0, matching costPrice\'s own Number(x) || 0 rule — backward-compatible with callers that never pass it', () => {
    const result = normalizeStockCountItems([
      { productName: 'Feijão', quantity: 5, unit: 'kg', costPrice: 80 }, // no sellingPrice field at all
      { productName: 'Óleo', quantity: 2, unit: 'l', costPrice: 40, sellingPrice: NaN as unknown as number },
    ]);
    assert.equal(result.items[0].sellingPrice, 0);
    assert.equal(result.items[1].sellingPrice, 0);
  });

  it('does not let selling price influence totalValue — investment basis stays cost * quantity', () => {
    const result = normalizeStockCountItems([
      { productName: 'Arroz', quantity: 10, unit: 'kg', costPrice: 50, sellingPrice: 999 },
    ]);
    assert.equal(result.items[0].totalValue, 500);
    assert.equal(result.totalValue, 500);
  });
});

describe('immediate confirmation before debounce, and last-second edits', () => {
  // These two scenarios collapse into the same property once you look
  // at the actual call site: handleSubmit() reads `rows` (React
  // controlled-input state, synchronous on every keystroke) and passes
  // it as `items` — the ONLY input normalizeStockCountItems() sees.
  // Whatever a separate, differently-timed "draft" value says is
  // structurally irrelevant, because the function has no parameter for
  // it. These tests simulate exactly that: an "in-flight UI state" that
  // has already diverged from an older "last-saved draft" snapshot, and
  // confirm the function's output tracks the former, never the latter.

  it('a user typing a new row and confirming immediately (draft debounce has not fired yet) gets the freshly-typed row, not the empty pre-debounce draft', () => {
    const staleDraftBeforeDebounce: { productName: string; quantity: number; costPrice: number }[] = []; // draft has not autosaved yet — still empty
    const currentUISubmission = [{ productName: 'Açúcar', quantity: 20, unit: 'kg', costPrice: 45 }]; // what's actually in the form right now

    const result = normalizeStockCountItems(currentUISubmission);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].productName, 'Açúcar');
    // The stale/empty draft value is never consulted — proven simply by
    // there being no way to pass it in. This assertion exists to make
    // that structural fact explicit rather than implicit.
    assert.notDeepEqual(result.items, staleDraftBeforeDebounce);
  });

  it('a last-second edit to a field (e.g. quantity corrected right before clicking Confirm) is reflected exactly — an older saved draft value is not used', () => {
    const olderSavedDraftItem = { productName: 'Sal', quantity: 5, unit: 'kg', costPrice: 10 }; // what was autosaved a few seconds ago
    const currentUISubmission = [{ productName: 'Sal', quantity: 8, unit: 'kg', costPrice: 10 }]; // owner just corrected the quantity to 8

    const result = normalizeStockCountItems(currentUISubmission);

    assert.equal(result.items[0].quantity, 8);
    assert.notEqual(result.items[0].quantity, olderSavedDraftItem.quantity);
  });
});

describe('failed confirmation preserves the draft — source-level regression guards', () => {
  // These are deliberately source-inspection tests, not integration
  // tests against a real/mocked Firestore — labeled as such, not
  // disguised as proof of runtime behavior. What they guard against:
  // a future edit accidentally re-introducing a closure read of
  // initialStockDraft inside recordStockCount, or splitting the
  // confirm+draft-cleanup batch into two separate operations (which
  // would break "a failed confirmation leaves the draft intact," since
  // that guarantee currently rests entirely on both writes being queued
  // on the SAME Firestore WriteBatch before a single commit()).
  const appContextSrc = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf-8');

  function extractFunctionBody(source: string, signatureMarker: string): string {
    const start = source.indexOf(signatureMarker);
    assert.notEqual(start, -1, `Could not locate ${signatureMarker} in AppContext.tsx — has it been renamed?`);
    // Slice from the signature to the next top-level `const X = async` or
    // `const X = (` at the same indentation, a close enough boundary for
    // this file's consistent 2-space-indented function style.
    const rest = source.slice(start);
    const nextFnMatch = rest.slice(signatureMarker.length).search(/\n  const \w+ = (async )?\(/);
    return nextFnMatch === -1 ? rest : rest.slice(0, signatureMarker.length + nextFnMatch);
  }

  const recordStockCountBody = extractFunctionBody(appContextSrc, 'const recordStockCount = async (');

  // Strip `//`-style line comments before searching for actual code
  // references — otherwise a comment that mentions "initialStockDraft"
  // in prose (exactly the kind this fix added, explaining why it's
  // absent) would produce a false positive.
  function stripLineComments(code: string): string {
    return code
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('//');
        return idx === -1 ? line : line.slice(0, idx);
      })
      .join('\n');
  }

  const recordStockCountCodeOnly = stripLineComments(recordStockCountBody);

  it('recordStockCount never reads initialStockDraft — confirmation has no closure over draft state', () => {
    assert.equal(
      recordStockCountCodeOnly.includes('initialStockDraft'),
      false,
      'recordStockCount now references initialStockDraft in actual code (not just a comment) — this reintroduces the exact stale-closure defect class this fix closed. Confirmation must only ever use its explicit `items` parameter.'
    );
  });

  it('the stockCounts write and the stockCountDrafts delete are queued on the same batch before a single commit — this is what makes "failed confirmation preserves the draft" true', () => {
    const setIndex = recordStockCountBody.indexOf("fsBatch.set(doc(db, 'businesses', businessId, 'stockCounts'");
    const deleteIndex = recordStockCountBody.indexOf("fsBatch.delete(doc(db, 'businesses', businessId, 'stockCountDrafts'");
    const commitIndex = recordStockCountBody.indexOf('fsBatch.commit()');

    assert.notEqual(setIndex, -1, 'Expected the stockCounts fsBatch.set(...) call to still exist in recordStockCount.');
    assert.notEqual(deleteIndex, -1, 'Expected the stockCountDrafts fsBatch.delete(...) call to still exist in recordStockCount.');
    assert.notEqual(commitIndex, -1, 'Expected exactly one fsBatch.commit() call in recordStockCount.');
    // Both queued operations must precede the single commit — if either
    // were moved to run via a direct setDoc/deleteDoc call instead of
    // via fsBatch, or if commit() were called before queuing both, a
    // failed commit could no longer be relied on to leave the draft
    // untouched.
    assert.ok(setIndex < commitIndex, 'stockCounts set must be queued on fsBatch before commit().');
    assert.ok(deleteIndex < commitIndex, 'stockCountDrafts delete must be queued on fsBatch before commit().');

    // Guard against a standalone deleteDoc(...) on stockCountDrafts
    // anywhere in this function body — that would delete the draft
    // outside the batch, breaking atomicity even if the queued delete
    // above still exists.
    const standaloneDeleteRegex = /(?<!fsBatch\.)deleteDoc\([^)]*stockCountDrafts/;
    assert.equal(
      standaloneDeleteRegex.test(recordStockCountBody),
      false,
      'Found a non-batched deleteDoc targeting stockCountDrafts inside recordStockCount — this would break "failed confirmation preserves the draft."'
    );
  });
});

describe('business-switch draft staleness — source-level regression guard', () => {
  // [Fix — business-switch draft staleness] Companion guard to the
  // suite above: verifies the AppContext listener effect resets
  // initialStockDraft/initialStockDraftLoaded unconditionally on every
  // activeBusinessId change, not only inside the `!activeBusinessId`
  // branch. A regression here would silently reopen the exact window
  // where Business A's draft could read as Business B's during a
  // direct shop switch — not testable at runtime without a DOM harness
  // this repo doesn't have, so this checks the source structure instead.
  const appContextSrc = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf-8');

  it('setInitialStockDraft/setInitialStockDraftLoaded reset calls appear before the `if (!activeBusinessId)` early return in the listener effect', () => {
    const effectMarker = "// Listen to Business and Subcollections when userProfile and businessId exist\n  useEffect(() => {";
    const effectStart = appContextSrc.indexOf(effectMarker);
    assert.notEqual(effectStart, -1, 'Could not locate the Business/Subcollections listener useEffect — has it been restructured?');

    const earlyReturnMarker = 'if (!activeBusinessId) {';
    const earlyReturnIndex = appContextSrc.indexOf(earlyReturnMarker, effectStart);
    assert.notEqual(earlyReturnIndex, -1, 'Could not locate the `if (!activeBusinessId)` branch inside the listener effect.');

    const preamble = appContextSrc.slice(effectStart, earlyReturnIndex);
    assert.ok(
      preamble.includes('setInitialStockDraft(null)') && preamble.includes('setInitialStockDraftLoaded(false)'),
      'Expected setInitialStockDraft(null) and setInitialStockDraftLoaded(false) to run unconditionally, before the `!activeBusinessId` branch — otherwise a direct business switch (not through a null businessId) would leave the previous business\'s draft state stale until the new business\'s listener delivers its first snapshot.'
    );
  });
});
