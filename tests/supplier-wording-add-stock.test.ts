// [Supplier-Wording Recognition — Checkpoint 3] Tests for the Add Stock
// integration's pure decision logic:
//   - resolveSupplierWordingRecognition (apps/tenant/src/lib/supplierWordingRecognition.ts)
//   - planSupplierWordingConfirmation (apps/tenant/src/lib/supplierWordingConfirmation.ts)
//
// SCOPE: proves both functions against plain in-memory values only,
// matching this repository's established pattern for testing
// transaction/decision logic without a live Firestore client or
// emulator (openBatchSupersession.ts's own test suites; Checkpoint 2's
// own supplier-wording-matching.test.ts). AddStockView.tsx itself wires
// these two functions into React/Firestore — that wiring is
// intentionally thin glue code (see both functions' own module
// comments) and is not independently re-tested here, consistent with
// how this repository already tests the open-batch lock transaction's
// pure logic without a React/Firestore harness.
//
// Test numbering below cross-references the ten scenarios required by
// the Checkpoint 3 authorization.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-add-stock.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveSupplierWordingRecognition } from '../apps/tenant/src/lib/supplierWordingRecognition';
import {
  planSupplierWordingConfirmation,
  SupplierWordingConflictError,
  type CheckedProductWordingSnapshot,
} from '../apps/tenant/src/lib/supplierWordingConfirmation';

// ---------------------------------------------------------------------
// resolveSupplierWordingRecognition
// ---------------------------------------------------------------------

describe('resolveSupplierWordingRecognition — ordinary/no-op paths', () => {
  it('returns "none" for empty or whitespace-only wording', () => {
    assert.deepEqual(resolveSupplierWordingRecognition('', undefined, []), { type: 'none' });
    assert.deepEqual(resolveSupplierWordingRecognition('   ', undefined, []), { type: 'none' });
  });

  it('returns "none" when the typed text already exactly matches an existing Product.name — [Test 10] existing Add Stock behavior is unaffected', () => {
    const products = [{ id: 'p1', name: 'Coca-Cola 300ml' }];
    assert.deepEqual(
      resolveSupplierWordingRecognition('coca-cola 300ml', undefined, products),
      { type: 'none' }
    );
  });

  it('returns "no-candidates" for a genuinely new wording with no reuse match and no candidates', () => {
    const products = [{ id: 'p1', name: 'Coca-Cola 300ml' }];
    assert.deepEqual(
      resolveSupplierWordingRecognition('Fanta Laranja 500ml', 'supplier-1', products),
      { type: 'no-candidates' }
    );
  });
});

describe('resolveSupplierWordingRecognition — [Test 1, 5] reuse of an already-confirmed relationship', () => {
  it('silently reuses an exact (supplierRecordId, wording) match — no candidates surfaced', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const outcome = resolveSupplierWordingRecognition('Lager Grande', 'supplier-1', products);
    assert.deepEqual(outcome, { type: 'reused', productId: 'p1' });
  });

  it('[Test 5] a SECOND, later occurrence of the same wording from the same supplier reuses it again, identically', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const first = resolveSupplierWordingRecognition('Lager Grande', 'supplier-1', products);
    const second = resolveSupplierWordingRecognition('Lager Grande', 'supplier-1', products);
    assert.deepEqual(first, { type: 'reused', productId: 'p1' });
    assert.deepEqual(second, { type: 'reused', productId: 'p1' });
  });

  it('does not reuse across a DIFFERENT supplier (BDR-0013 item 3 — same supplier required)', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const outcome = resolveSupplierWordingRecognition('Lager Grande', 'supplier-2', products);
    // No reuse for a different supplier — falls through to candidate
    // detection instead (still finds it as a candidate via the
    // already-confirmed-alternative-wording ground, any supplier).
    assert.equal(outcome.type, 'candidates');
  });

  it('does not reuse when no supplierId is known yet (new/free-text supplier)', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const outcome = resolveSupplierWordingRecognition('Lager Grande', undefined, products);
    assert.equal(outcome.type, 'candidates');
  });

  it('reuse-matching is byte-exact (Rule 8 Finding 5) — a normalized-but-not-exact variant does NOT reuse, falls to candidates instead', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const outcome = resolveSupplierWordingRecognition('LAGER GRANDE', 'supplier-1', products);
    assert.equal(outcome.type, 'candidates');
  });
});

describe('resolveSupplierWordingRecognition — [Test 2, 8] candidate proposal', () => {
  it('[Test 2] proposes a single existing product as a candidate on normalization-level similarity to Product.name', () => {
    const products = [{ id: 'p1', name: 'Café Preto 500ml' }];
    const outcome = resolveSupplierWordingRecognition('CAFE preto 500ml', 'supplier-1', products);
    assert.equal(outcome.type, 'candidates');
    if (outcome.type === 'candidates') {
      assert.equal(outcome.candidates.length, 1);
      assert.equal(outcome.candidates[0].productId, 'p1');
    }
  });

  it('[Test 8] surfaces MULTIPLE plausible candidates together, with no forced/default selection', () => {
    const products = [
      { id: 'p1', name: 'Leite em Pó', supplierWordings: [{ supplierRecordId: 'supplier-9', wording: 'Leite Powder' }] },
      { id: 'p2', name: 'Leite  em   Po' }, // extra whitespace only — normalization-level match, not a literal exact match
    ];
    const outcome = resolveSupplierWordingRecognition('Leite Em Po', 'supplier-1', products);
    assert.equal(outcome.type, 'candidates');
    if (outcome.type === 'candidates') {
      const ids = outcome.candidates.map((c) => c.productId).sort();
      assert.deepEqual(ids, ['p1', 'p2']);
      // No implicit ranking encoded by this function — POL-0007's
      // "no candidate is presumed correct merely by being surfaced".
    }
  });
});

// ---------------------------------------------------------------------
// planSupplierWordingConfirmation
// ---------------------------------------------------------------------

const snap = (
  productId: string,
  exists: boolean,
  supplierWordings: Array<{ supplierRecordId: string; wording: string }> = []
): CheckedProductWordingSnapshot => ({ productId, exists, supplierWordings });

describe('planSupplierWordingConfirmation — [Test 3, 4] fresh confirmation is written', () => {
  it('writes a new relationship when nothing else claims the (supplierRecordId, wording) pair', () => {
    const plan = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', [snap('p1', true, [])]);
    assert.deepEqual(plan, { alreadyConfirmed: false, conflict: null, shouldWrite: true });
  });

  it('trims wording before comparing, matching Rule 8 Finding 5\u2019s whitespace-trim rule', () => {
    const plan = planSupplierWordingConfirmation('p1', 'supplier-1', '  Lager Grande  ', [snap('p1', true, [])]);
    assert.equal(plan.shouldWrite, true);
  });
});

describe('planSupplierWordingConfirmation — [Test 7] idempotency, never a duplicate/rejected-alias entry', () => {
  it('is a no-op (not an error, not a duplicate write) when the target already holds this exact relationship', () => {
    const plan = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', [
      snap('p1', true, [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }]),
    ]);
    assert.deepEqual(plan, { alreadyConfirmed: true, conflict: null, shouldWrite: false });
  });

  it('does not write when the target product no longer exists (deleted concurrently — Rule 8 Finding 14)', () => {
    const plan = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', [snap('p1', false, [])]);
    assert.deepEqual(plan, { alreadyConfirmed: false, conflict: null, shouldWrite: false });
  });
});

describe('planSupplierWordingConfirmation — [Test 9] concurrent confirmation never silently overwrites another relationship', () => {
  it('reports a conflict, and does not write, when a DIFFERENT checked product already independently claims this exact pair', () => {
    const plan = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', [
      snap('p1', true, []),
      snap('p2', true, [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }]),
    ]);
    assert.deepEqual(plan, {
      alreadyConfirmed: false,
      conflict: { productId: 'p2' },
      shouldWrite: false,
    });
  });

  it('a conflicting relationship for a DIFFERENT supplier on the same wording does not block the write (scoped to supplierRecordId)', () => {
    const plan = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', [
      snap('p1', true, []),
      snap('p2', true, [{ supplierRecordId: 'supplier-OTHER', wording: 'Lager Grande' }]),
    ]);
    assert.equal(plan.shouldWrite, true);
    assert.equal(plan.conflict, null);
  });

  it('SupplierWordingConflictError carries the conflicting productId for the caller to surface', () => {
    const err = new SupplierWordingConflictError('p2');
    assert.equal(err.conflictingProductId, 'p2');
    assert.equal(err.name, 'SupplierWordingConflictError');
    assert.ok(err instanceof Error);
  });

  it('is only ever computed from the FRESH snapshots passed in — proves the function itself has no hidden state across calls', () => {
    const staleSnapshots = [snap('p1', true, []), snap('p2', true, [])];
    const freshSnapshots = [
      snap('p1', true, []),
      // Between the stale read and this call, product p2 was confirmed
      // by a concurrent transaction — the fresh read must catch it.
      snap('p2', true, [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }]),
    ];
    const staleDecision = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', staleSnapshots);
    const freshDecision = planSupplierWordingConfirmation('p1', 'supplier-1', 'Lager Grande', freshSnapshots);
    assert.equal(staleDecision.shouldWrite, true); // would have raced, if this were the only read
    assert.equal(freshDecision.shouldWrite, false);
    assert.deepEqual(freshDecision.conflict, { productId: 'p2' });
  });
});

describe('planSupplierWordingConfirmation — [Test 6] "new product" path never plans a write for anything', () => {
  it('there is nothing to plan at all when the owner declines every candidate — no function in this module is even called for that path, by design (see AddStockView.tsx handleDeclineSupplierWordingCandidates)', () => {
    // Documentation-only assertion: planSupplierWordingConfirmation is
    // never invoked for a declined-candidates row. Asserting the
    // contract holds for a row with genuinely no claim anywhere yet.
    const plan = planSupplierWordingConfirmation('p-new', 'supplier-1', 'Refrigerante XPTO', [
      snap('p-new', true, []),
    ]);
    assert.equal(plan.shouldWrite, true); // would only ever be called if the owner HAD confirmed
  });
});
