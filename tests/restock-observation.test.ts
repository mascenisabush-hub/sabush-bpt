// [Restock Observation Amendment v1.0 — docs/specs/05-restock-observation-amendment.md]
// Tests for the optional Restock Observation capability.
//
// SCOPE: addStockBatch()/addMultipleStockBatches() (AppContext.tsx) are
// tightly coupled to the live Firebase client SDK (runTransaction/
// writeBatch against a real `db` singleton) — same constraint documented
// in tests/delete-product-plan.test.ts and tests/open-batch-supersession.test.ts.
// This repo has no jsdom/testing-library harness and the Firestore
// emulator is environment-blocked here (confirmed previously during Fix
// #10 — see that test file's own header). What IS directly testable, and
// what this suite actually proves:
//   1. The pure decision logic in src/lib/restockObservation.ts, which is
//      the ONLY place that decides whether/what observation gets attached
//      to a new batch — addStockBatch/addMultipleStockBatches just call
//      it and conditionally spread the result.
//   2. Source-level regression guards confirming both functions actually
//      wire that pure logic in (and haven't silently diverged from it, or
//      regressed Fix #10's transaction structure while doing so).
//
// HOW TO RUN:
//   npx tsx --test tests/restock-observation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  computeRestockObservation,
  parsePreviousRemainingQuantity,
  findMostRecentBatchForProduct,
} from '../src/lib/restockObservation';
import type { StockBatch } from '../src/types';

// ------------------------------------------------------------------
// parsePreviousRemainingQuantity — "unknown must stay unknown" rule
// ------------------------------------------------------------------
describe('parsePreviousRemainingQuantity', () => {
  it('parses a valid numeric string', () => {
    assert.equal(parsePreviousRemainingQuantity('8'), 8);
  });

  it('parses a valid number', () => {
    assert.equal(parsePreviousRemainingQuantity(8), 8);
  });

  it('accepts an explicit 0 as a genuine, known value', () => {
    assert.equal(parsePreviousRemainingQuantity(0), 0);
    assert.equal(parsePreviousRemainingQuantity('0'), 0);
  });

  it('treats an empty string as unknown, NOT 0', () => {
    assert.equal(parsePreviousRemainingQuantity(''), null);
  });

  it('treats a whitespace-only string as unknown', () => {
    assert.equal(parsePreviousRemainingQuantity('   '), null);
  });

  it('treats null as unknown', () => {
    assert.equal(parsePreviousRemainingQuantity(null), null);
  });

  it('treats undefined as unknown', () => {
    assert.equal(parsePreviousRemainingQuantity(undefined), null);
  });

  it('treats a non-numeric string (e.g. the UI\'s "unknown" sentinel) as unknown', () => {
    assert.equal(parsePreviousRemainingQuantity('unknown'), null);
  });

  it('rejects a negative number as invalid (never a valid physical count)', () => {
    assert.equal(parsePreviousRemainingQuantity(-5), null);
    assert.equal(parsePreviousRemainingQuantity('-5'), null);
  });

  it('rejects non-finite input', () => {
    assert.equal(parsePreviousRemainingQuantity(Infinity), null);
    assert.equal(parsePreviousRemainingQuantity(NaN), null);
  });
});

// ------------------------------------------------------------------
// computeRestockObservation — the central movement calculation
// ------------------------------------------------------------------
describe('computeRestockObservation', () => {
  it('computes the correct movement when both operands are known (spec example: 100 - 23 = 77)', () => {
    const result = computeRestockObservation(100, 23, '2026-08-12T10:00:00.000Z');
    assert.deepEqual(result, {
      previousRemainingQuantity: 23,
      movement: 77,
      observedAt: '2026-08-12T10:00:00.000Z',
    });
  });

  it('returns null (no observation) for a brand-new product (no previous cycle)', () => {
    const result = computeRestockObservation(null, 23, '2026-08-12T10:00:00.000Z');
    assert.equal(result, null);
  });

  it('returns null when previousCycleQuantity is undefined', () => {
    const result = computeRestockObservation(undefined, 23, '2026-08-12T10:00:00.000Z');
    assert.equal(result, null);
  });

  it('returns null (no observation persisted) when the operator does not know the previous remaining quantity', () => {
    const result = computeRestockObservation(100, undefined, '2026-08-12T10:00:00.000Z');
    assert.equal(result, null);
  });

  it('returns null for a blank string input (explicit "I don\'t know" / not entered)', () => {
    const result = computeRestockObservation(100, '', '2026-08-12T10:00:00.000Z');
    assert.equal(result, null);
  });

  it('returns null for the UI\'s "unknown" sentinel string', () => {
    const result = computeRestockObservation(100, 'unknown', '2026-08-12T10:00:00.000Z');
    assert.equal(result, null);
  });

  it('never substitutes 0 for an unknown previous remaining quantity', () => {
    const result = computeRestockObservation(100, undefined, '2026-08-12T10:00:00.000Z');
    assert.notEqual(result?.previousRemainingQuantity, 0);
    assert.equal(result, null);
  });

  it('correctly computes a genuine 0 previous remaining quantity (fully sold/consumed, but KNOWN)', () => {
    const result = computeRestockObservation(50, 0, '2026-08-12T10:00:00.000Z');
    assert.deepEqual(result, {
      previousRemainingQuantity: 0,
      movement: 50,
      observedAt: '2026-08-12T10:00:00.000Z',
    });
  });

  it('allows a negative movement (more remained than was originally purchased is a valid, if unusual, observation)', () => {
    const result = computeRestockObservation(10, 15, '2026-08-12T10:00:00.000Z');
    assert.deepEqual(result, {
      previousRemainingQuantity: 15,
      movement: -5,
      observedAt: '2026-08-12T10:00:00.000Z',
    });
  });

  it('the returned shape has no field named sales/unitsSold/revenue', () => {
    const result = computeRestockObservation(100, 23, '2026-08-12T10:00:00.000Z');
    const keys = Object.keys(result!);
    assert.deepEqual(keys.sort(), ['movement', 'observedAt', 'previousRemainingQuantity']);
    for (const key of keys) {
      assert.ok(
        !/sale|sold|revenue|profit/i.test(key),
        `Field "${key}" must never imply sales/revenue — this is a neutral movement observation.`
      );
    }
  });
});

// ------------------------------------------------------------------
// findMostRecentBatchForProduct — used by addMultipleStockBatches,
// whose in-loop tempBatches is not guaranteed date-sorted
// ------------------------------------------------------------------
describe('findMostRecentBatchForProduct', () => {
  const makeBatch = (over: Partial<StockBatch>): StockBatch => ({
    id: 'b-' + Math.random(),
    productId: 'prod-1',
    dateEntered: '2026-01-01',
    quantity: 10,
    costPrice: 1,
    sellingPrice: 2,
    status: 'closed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  it('returns undefined when there is no batch at all for this product', () => {
    assert.equal(findMostRecentBatchForProduct([], 'prod-1'), undefined);
  });

  it('returns undefined when only OTHER products have batches', () => {
    const batches = [makeBatch({ productId: 'prod-2' })];
    assert.equal(findMostRecentBatchForProduct(batches, 'prod-1'), undefined);
  });

  it('picks the batch with the latest dateEntered, regardless of array order', () => {
    const older = makeBatch({ id: 'older', dateEntered: '2026-01-01', quantity: 50 });
    const newer = makeBatch({ id: 'newer', dateEntered: '2026-06-15', quantity: 100 });
    // Deliberately out of chronological order — proves this doesn't just
    // take array[0], unlike the top-level `batches` state's own
    // pre-sorted-by-listener assumption.
    const result = findMostRecentBatchForProduct([older, newer], 'prod-1');
    assert.equal(result?.id, 'newer');
    assert.equal(result?.quantity, 100);
  });

  it('breaks a same-date tie using createdAt (later wins)', () => {
    const first = makeBatch({
      id: 'first',
      dateEntered: '2026-06-15',
      createdAt: '2026-06-15T08:00:00.000Z',
      quantity: 40,
    });
    const second = makeBatch({
      id: 'second',
      dateEntered: '2026-06-15',
      createdAt: '2026-06-15T14:00:00.000Z',
      quantity: 60,
    });
    const result = findMostRecentBatchForProduct([first, second], 'prod-1');
    assert.equal(result?.id, 'second');
  });
});

// ------------------------------------------------------------------
// End-to-end pure-logic scenarios matching the task's numbered test
// requirements directly (movement calc, unknown => no observation,
// brand-new product => no observation, omitted observation still
// allows a restock decision to proceed — proven at the decision-logic
// level, since the actual Firestore write is untestable here).
// ------------------------------------------------------------------
describe('Restock Observation — scenario coverage (task requirements)', () => {
  it('9. known previous remaining quantity creates a valid observation (task\'s own worked example: 50 previous cycle - 8 remaining = 42)', () => {
    const obs = computeRestockObservation(50, 8, '2026-08-12T00:00:00.000Z');
    assert.ok(obs !== null);
    assert.equal(obs!.movement, 42);
  });

  it("10. movement calculation is correct for the amendment's own worked example (100 - 23 = 77)", () => {
    const obs = computeRestockObservation(100, 23, '2026-08-12T00:00:00.000Z');
    assert.equal(obs!.movement, 77);
  });

  it('11/12. unknown or empty previous remaining quantity creates NO observation, and restocking is never blocked by this', () => {
    assert.equal(computeRestockObservation(50, undefined, '2026-08-12T00:00:00.000Z'), null);
    assert.equal(computeRestockObservation(50, '', '2026-08-12T00:00:00.000Z'), null);
    // Nothing in computeRestockObservation throws or signals an error for
    // "unknown" — it simply returns null, which callers treat as "omit
    // the field," never as a validation failure blocking the batch write.
  });

  it('13. brand-new products (no previous cycle) never receive an observation regardless of input', () => {
    assert.equal(computeRestockObservation(undefined, 23, '2026-08-12T00:00:00.000Z'), null);
    assert.equal(computeRestockObservation(null, 0, '2026-08-12T00:00:00.000Z'), null);
  });
});

// ------------------------------------------------------------------
// Source-level regression guards: confirm addStockBatch and
// addMultipleStockBatches actually wire in this pure logic, and that
// Fix #10's transaction structure is untouched by this feature.
// ------------------------------------------------------------------
describe('AppContext.tsx source guards', () => {
  const appContextSrc = readFileSync(
    new URL('../src/context/AppContext.tsx', import.meta.url),
    'utf-8'
  );

  it('addStockBatch computes restockObservation via the shared pure function, not ad-hoc inline logic', () => {
    const fnMarker = 'const addStockBatch = async (';
    const fnStart = appContextSrc.indexOf(fnMarker);
    assert.notEqual(fnStart, -1, 'Could not locate addStockBatch — has it been renamed/restructured?');
    const nextFnIndex = appContextSrc.indexOf('\n  const addMultipleStockBatches', fnStart);
    const fnBody = appContextSrc.slice(fnStart, nextFnIndex === -1 ? undefined : nextFnIndex);

    assert.ok(
      fnBody.includes('computeRestockObservation('),
      'addStockBatch must delegate the observation decision to computeRestockObservation().'
    );
    assert.ok(
      fnBody.includes('restockObservation ? { restockObservation } : {}'),
      'addStockBatch must conditionally spread restockObservation, never write it as a literal undefined field.'
    );
  });

  it("addStockBatch computes the observation BEFORE opening Fix #10's runTransaction (no new reads/writes inside the transaction)", () => {
    const fnMarker = 'const addStockBatch = async (';
    const fnStart = appContextSrc.indexOf(fnMarker);
    const observationCallIndex = appContextSrc.indexOf('computeRestockObservation(', fnStart);
    const transactionIndex = appContextSrc.indexOf('await runTransaction(db,', fnStart);
    assert.notEqual(observationCallIndex, -1);
    assert.notEqual(transactionIndex, -1);
    assert.ok(
      observationCallIndex < transactionIndex,
      'The restock observation must be fully computed before runTransaction opens, so Fix #10\'s read-then-write transaction body is structurally unchanged by this feature.'
    );
  });

  it("Fix #10's transaction body still reads everything before writing anything (regression guard, unrelated to this feature but must still hold)", () => {
    const transactionIndex = appContextSrc.indexOf('await runTransaction(db,');
    assert.notEqual(transactionIndex, -1);
    const txBody = appContextSrc.slice(transactionIndex, transactionIndex + 1800);
    const firstWriteIndex = Math.min(
      ...['tx.update(', 'tx.set('].map((marker) => {
        const idx = txBody.indexOf(marker);
        return idx === -1 ? Infinity : idx;
      })
    );
    const lastReadIndex = Math.max(
      ...['tx.get(lockRef)', 'tx.get(ref)'].map((marker) => {
        const idx = txBody.lastIndexOf(marker);
        return idx === -1 ? -Infinity : idx;
      })
    );
    assert.ok(
      lastReadIndex < firstWriteIndex,
      'Fix #10\'s transaction must still read everything before writing anything.'
    );
  });

  it('addMultipleStockBatches computes restockObservation per line item via the shared pure function', () => {
    const fnMarker = 'const addMultipleStockBatches = async (';
    const fnStart = appContextSrc.indexOf(fnMarker);
    assert.notEqual(fnStart, -1, 'Could not locate addMultipleStockBatches — has it been renamed/restructured?');
    const nextFnIndex = appContextSrc.indexOf('\n  const attachPurchaseEventId', fnStart);
    const fnBody = appContextSrc.slice(fnStart, nextFnIndex === -1 ? undefined : nextFnIndex);

    assert.ok(
      fnBody.includes('computeRestockObservation('),
      'addMultipleStockBatches must delegate the observation decision to computeRestockObservation().'
    );
    assert.ok(
      fnBody.includes('findMostRecentBatchForProduct('),
      'addMultipleStockBatches must resolve the previous-cycle batch via findMostRecentBatchForProduct(), not assume tempBatches[0] is the latest.'
    );
    assert.ok(
      fnBody.includes('restockObservation ? { restockObservation } : {}'),
      'addMultipleStockBatches must conditionally spread restockObservation, never write it as a literal undefined field.'
    );
  });

  it('addMultipleStockBatches has NOT been converted to runTransaction (scope guard — plain WriteBatch is unchanged)', () => {
    const fnMarker = 'const addMultipleStockBatches = async (';
    const fnStart = appContextSrc.indexOf(fnMarker);
    const nextFnIndex = appContextSrc.indexOf('\n  const attachPurchaseEventId', fnStart);
    const fnBody = appContextSrc.slice(fnStart, nextFnIndex === -1 ? undefined : nextFnIndex);

    assert.ok(
      !fnBody.includes('runTransaction('),
      'This feature must not convert addMultipleStockBatches to runTransaction() — out of scope per the amendment (Part 12).'
    );
    assert.ok(
      fnBody.includes('createFirestoreBatch(db)') || fnBody.includes('fsBatch'),
      'addMultipleStockBatches must still use its existing plain WriteBatch pattern.'
    );
  });

  it('openBatchLocks is not referenced inside addMultipleStockBatches (Fix #10\'s lock remains addStockBatch-only, unchanged)', () => {
    const fnMarker = 'const addMultipleStockBatches = async (';
    const fnStart = appContextSrc.indexOf(fnMarker);
    const nextFnIndex = appContextSrc.indexOf('\n  const attachPurchaseEventId', fnStart);
    const fnBody = appContextSrc.slice(fnStart, nextFnIndex === -1 ? undefined : nextFnIndex);
    assert.ok(!fnBody.includes('openBatchLocks'));
  });

  it('AddStockParams carries the new optional previousRemainingQuantity field', () => {
    const marker = 'interface AddStockParams';
    const idx = appContextSrc.indexOf(marker);
    assert.notEqual(idx, -1);
    const interfaceBody = appContextSrc.slice(idx, appContextSrc.indexOf('}', idx));
    assert.ok(interfaceBody.includes('previousRemainingQuantity?'));
  });
});

// ------------------------------------------------------------------
// Source-level guards: calculations.ts must never reference the new
// field — the amendment's own "no financial impact" requirement,
// verifiable at the code level, not just by inspection.
// ------------------------------------------------------------------
describe('Business Worth / calculations.ts isolation (amendment Part 6/14)', () => {
  it('calculations.ts never references restockObservation', () => {
    const calcSrc = readFileSync(new URL('../src/utils/calculations.ts', import.meta.url), 'utf-8');
    assert.ok(
      !calcSrc.includes('restockObservation'),
      'restockObservation must never be read by any Business Worth / Embedded Profit / Stock Value calculation.'
    );
  });
});
