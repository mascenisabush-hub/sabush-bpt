// Increment B, Checkpoint B1 — tests for the pure receipt-sequencing
// queue logic in apps/tenant/src/lib/receiptSequencing.ts
// (Consolidated Specification §8, Rule 8 Assessment Finding 6).
//
// SCOPE: proves the "unresolved" classification and queue-ordering
// functions against plain in-memory row values only — no Firestore, no
// UI harness, matching this repository's established pattern for
// testing pure decision logic (supplier-wording-matching.test.ts,
// supplier-wording-add-stock.test.ts).
//
// HOW TO RUN:
//   npx tsx --test tests/receipt-sequencing.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  isRowUnresolved,
  getUnresolvedRowIds,
  getCurrentUnresolvedRowId,
  isReceiptReadyForFinalReview,
  getRowsToDisplay,
  type ReceiptSequencingRow,
} from '../apps/tenant/src/lib/receiptSequencing';

const resolvedRow = (id: string): ReceiptSequencingRow => ({ id });

const rowWithPendingCandidates = (id: string, n = 1): ReceiptSequencingRow => ({
  id,
  supplierWordingCandidates: Array.from({ length: n }, (_, i) => ({ productId: `cand-${i}` })),
});

const rowWithConflictPending = (id: string, distinguishingInfo?: string): ReceiptSequencingRow => ({
  id,
  supplierWordingConflictPending: true,
  supplierWordingDistinguishingInfo: distinguishingInfo,
});

describe('isRowUnresolved', () => {
  it('is false for a row with no supplier-wording state at all', () => {
    assert.equal(isRowUnresolved(resolvedRow('r1')), false);
  });

  it('is true while candidates are pending', () => {
    assert.equal(isRowUnresolved(rowWithPendingCandidates('r1')), true);
  });

  it('is false once candidates array is present but empty (cleared after resolution)', () => {
    assert.equal(isRowUnresolved({ id: 'r1', supplierWordingCandidates: [] }), false);
  });

  it('is true when a conflict is pending and no distinguishing info was entered', () => {
    assert.equal(isRowUnresolved(rowWithConflictPending('r1')), true);
    assert.equal(isRowUnresolved(rowWithConflictPending('r1', '')), true);
    assert.equal(isRowUnresolved(rowWithConflictPending('r1', '   ')), true);
  });

  it('is false once distinguishing info is provided for a conflict-pending row', () => {
    assert.equal(isRowUnresolved(rowWithConflictPending('r1', 'Different flavor, blue label')), false);
  });

  it('does not treat missing ordinary fields (name/qty/unit/cost) as unresolved — out of §8 scope', () => {
    // ReceiptSequencingRow intentionally carries no such fields; a row
    // object missing everything but `id` must read as resolved.
    assert.equal(isRowUnresolved({ id: 'r1' }), false);
  });
});

describe('getUnresolvedRowIds', () => {
  it('returns an empty array for an empty rows list', () => {
    assert.deepEqual(getUnresolvedRowIds([]), []);
  });

  it('returns an empty array when every row is resolved', () => {
    assert.deepEqual(getUnresolvedRowIds([resolvedRow('a'), resolvedRow('b')]), []);
  });

  it('returns only unresolved row ids, preserving original row order', () => {
    const rows = [
      resolvedRow('a'),
      rowWithPendingCandidates('b'),
      resolvedRow('c'),
      rowWithConflictPending('d'),
    ];
    assert.deepEqual(getUnresolvedRowIds(rows), ['b', 'd']);
  });

  it('returns all row ids when every row is unresolved', () => {
    const rows = [rowWithPendingCandidates('a'), rowWithConflictPending('b')];
    assert.deepEqual(getUnresolvedRowIds(rows), ['a', 'b']);
  });
});

describe('getCurrentUnresolvedRowId — §8 Step 3 "one at a time"', () => {
  it('returns null when there are no rows', () => {
    assert.equal(getCurrentUnresolvedRowId([]), null);
  });

  it('returns null once every row is resolved', () => {
    assert.equal(getCurrentUnresolvedRowId([resolvedRow('a'), resolvedRow('b')]), null);
  });

  it('returns the first unresolved row id, not a later one, when multiple are unresolved', () => {
    const rows = [resolvedRow('a'), rowWithPendingCandidates('b'), rowWithConflictPending('c')];
    assert.equal(getCurrentUnresolvedRowId(rows), 'b');
  });

  it('advances to the next unresolved row once the current one is resolved', () => {
    let rows: ReceiptSequencingRow[] = [rowWithPendingCandidates('a'), rowWithConflictPending('b')];
    assert.equal(getCurrentUnresolvedRowId(rows), 'a');

    // Simulate the owner resolving row 'a' (candidate confirmed, array cleared).
    rows = rows.map((r) => (r.id === 'a' ? { id: 'a' } : r));
    assert.equal(getCurrentUnresolvedRowId(rows), 'b');

    // Simulate the owner resolving row 'b' (distinguishing info entered).
    rows = rows.map((r) => (r.id === 'b' ? { ...r, supplierWordingDistinguishingInfo: 'Larger pack' } : r));
    assert.equal(getCurrentUnresolvedRowId(rows), null);
  });
});

describe('isReceiptReadyForFinalReview — §11 gate', () => {
  it('is true for a single already-resolved row (ordinary single-product entry)', () => {
    assert.equal(isReceiptReadyForFinalReview([resolvedRow('a')]), true);
  });

  it('is false while any row in a multi-line receipt is unresolved', () => {
    assert.equal(
      isReceiptReadyForFinalReview([resolvedRow('a'), rowWithPendingCandidates('b'), resolvedRow('c')]),
      false
    );
  });

  it('becomes true only once every row is resolved', () => {
    const rows: ReceiptSequencingRow[] = [
      resolvedRow('a'),
      { id: 'b', supplierWordingCandidates: [] }, // resolved: cleared
      resolvedRow('c'),
    ];
    assert.equal(isReceiptReadyForFinalReview(rows), true);
  });
});

describe('getRowsToDisplay — §8 Step 3 render-layer convenience', () => {
  it('shows every row once the receipt is ready for final review (§11)', () => {
    const rows = [resolvedRow('a'), resolvedRow('b'), resolvedRow('c')];
    assert.deepEqual(getRowsToDisplay(rows), rows);
  });

  it('shows ONLY the current unresolved row while the queue is non-empty — not the rest of the receipt', () => {
    const rows: ReceiptSequencingRow[] = [
      resolvedRow('a'),
      rowWithPendingCandidates('b'),
      rowWithConflictPending('c'),
    ];
    const displayed = getRowsToDisplay(rows);
    assert.equal(displayed.length, 1);
    assert.equal(displayed[0].id, 'b');
  });

  it('reveals the next single unresolved row once the current one resolves, still hiding the rest', () => {
    let rows: ReceiptSequencingRow[] = [rowWithPendingCandidates('a'), rowWithConflictPending('b'), resolvedRow('c')];
    assert.deepEqual(getRowsToDisplay(rows).map((r) => r.id), ['a']);

    rows = rows.map((r) => (r.id === 'a' ? { id: 'a' } : r));
    assert.deepEqual(getRowsToDisplay(rows).map((r) => r.id), ['b']);

    rows = rows.map((r) => (r.id === 'b' ? { ...r, supplierWordingDistinguishingInfo: 'note' } : r));
    // Now fully resolved — whole receipt (§11) is shown, in original order.
    assert.deepEqual(getRowsToDisplay(rows).map((r) => r.id), ['a', 'b', 'c']);
  });

  it('handles a single-row receipt (ordinary Add Stock of one product) correctly whether resolved or not', () => {
    assert.deepEqual(getRowsToDisplay([resolvedRow('only')]).map((r) => r.id), ['only']);
    assert.deepEqual(getRowsToDisplay([rowWithPendingCandidates('only')]).map((r) => r.id), ['only']);
  });
});
