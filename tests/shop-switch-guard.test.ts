// [Fix #9] Multi-shop stale product/batch reference protection tests.
//
// Exercises the pure functions in src/lib/shopSwitchGuard.ts directly
// against plain objects — no React, no jsdom, matching this repository's
// own established pattern (see tests/subscription-engine.test.ts) for
// testing a state-transition invariant without browser infrastructure.
//
// HOW TO RUN:
//   npx tsx --test tests/shop-switch-guard.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  detectShopSwitch,
  isBusinessDataReady,
  isSelectionSafeToSubmit,
} from '../apps/tenant/src/lib/shopSwitchGuard';

// Minimal fixtures — two businesses, each with one product and one batch,
// with genuinely distinct, non-overlapping ids (mirrors how real ids are
// generated in AppContext.tsx: 'prod-' + Date.now() + random suffix).
const PRODUCT_A = { id: 'prod-A-1' };
const BATCH_A = { id: 'batch-A-1', productId: 'prod-A-1' };
const PRODUCT_B = { id: 'prod-B-1' };
const BATCH_B = { id: 'batch-B-1', productId: 'prod-B-1' };

describe('detectShopSwitch — Test 1: business switch invalidates stale product selection', () => {
  it('reports a switch and instructs the caller to reset selection when activeBusinessId changes', () => {
    const result = detectShopSwitch('business-B', 'business-A');
    assert.equal(result.shouldResetSelection, true);
    assert.equal(result.loadedForBusinessId, 'business-B');
  });

  it('null -> a real business id is also a switch (first real assignment)', () => {
    const result = detectShopSwitch('business-A', null);
    assert.equal(result.shouldResetSelection, true);
  });
});

describe('isSelectionSafeToSubmit — Test 2: stale batch cannot survive a shop switch', () => {
  it('rejects Business A\'s batch/product once the current arrays are Business B\'s', () => {
    // Simulates the post-refresh state: Firestore listeners have already
    // delivered Business B's real products/batches, but the component's
    // own selection state was never re-derived (the exact bug this fix
    // closes) and still holds Business A's ids.
    const safe = isSelectionSafeToSubmit(
      PRODUCT_A.id,
      BATCH_A.id,
      [PRODUCT_B],
      [BATCH_B],
    );
    assert.equal(safe, false, 'Business A batch must never be submittable once the active arrays are Business B\'s');
  });

  it('rejects a batch that exists but belongs to a different product than selected', () => {
    // A batch id could coincidentally exist in the current array while
    // its productId doesn't match the selected product — must also fail.
    const mismatchedBatch = { id: BATCH_B.id, productId: 'some-other-product' };
    const safe = isSelectionSafeToSubmit(PRODUCT_B.id, mismatchedBatch.id, [PRODUCT_B], [mismatchedBatch]);
    assert.equal(safe, false);
  });
});

describe('isBusinessDataReady / isSelectionSafeToSubmit — Test 3: new business initializes normally', () => {
  it('data is ready once the array reference has changed since the switch snapshot', () => {
    const staleProducts = [PRODUCT_A];
    const freshProducts = [PRODUCT_B]; // a new array reference, as Firestore's onSnapshot always produces
    assert.equal(isBusinessDataReady(staleProducts, staleProducts), false, 'same reference as the switch snapshot must read as not-ready');
    assert.equal(isBusinessDataReady(freshProducts, staleProducts), true, 'a new reference must read as ready');
  });

  it('once ready, Business B\'s own product/batch is a valid, submittable selection', () => {
    const safe = isSelectionSafeToSubmit(PRODUCT_B.id, BATCH_B.id, [PRODUCT_B], [BATCH_B]);
    assert.equal(safe, true);
  });

  it('a null switch-snapshot (no switch pending, e.g. first mount) always reads as ready', () => {
    assert.equal(isBusinessDataReady([PRODUCT_A], null), true);
  });
});

describe('detectShopSwitch / isSelectionSafeToSubmit — Test 4: same-business behavior unchanged', () => {
  it('does not flag a switch when activeBusinessId is unchanged', () => {
    const result = detectShopSwitch('business-A', 'business-A');
    assert.equal(result.shouldResetSelection, false);
  });

  it('an existing valid selection remains valid when nothing switched', () => {
    const safe = isSelectionSafeToSubmit(PRODUCT_A.id, BATCH_A.id, [PRODUCT_A], [BATCH_A]);
    assert.equal(safe, true);
  });
});

describe('Full lifecycle — Test 5: AddQuebra specifically (Shop A selection -> switch to Shop B -> submit)', () => {
  it('cannot create a Shop B quebra referencing Shop A, at any point in the switch sequence', () => {
    // Step 1 — Owner is on Shop A, has selected Shop A's product/batch.
    let selectedProductId = PRODUCT_A.id;
    let selectedBatchId = BATCH_A.id;
    let loadedForBusinessId: string | null = 'business-A';
    let currentProducts = [PRODUCT_A];
    let currentBatches = [BATCH_A];

    assert.equal(
      isSelectionSafeToSubmit(selectedProductId, selectedBatchId, currentProducts, currentBatches),
      true,
      'sanity check: the original in-business selection is valid before any switch',
    );

    // Step 2 — Owner switches to Shop B via ShopSwitcher. activeBusinessId
    // flips immediately; AppContext's `products`/`batches` have NOT been
    // replaced yet (this is the exact race the bug lived in) — they are
    // still the same array references as Shop A's.
    const activeBusinessId = 'business-B';
    const switchResult = detectShopSwitch(activeBusinessId, loadedForBusinessId);
    assert.equal(switchResult.shouldResetSelection, true);
    loadedForBusinessId = switchResult.loadedForBusinessId;
    // AddQuebraView's own switch-effect clears selection synchronously,
    // in the same tick the switch is observed — before any Firestore
    // round trip.
    selectedProductId = '';
    selectedBatchId = '';
    const productsAtSwitch = currentProducts; // captured stale reference
    const batchesAtSwitch = currentBatches;

    // Step 3 — an attempted submit *immediately* after switching, before
    // Shop B's listeners have delivered anything (`currentProducts`/
    // `currentBatches` are still literally Shop A's arrays) must be
    // rejected — both because selection was cleared AND, even if it
    // somehow hadn't been, because the data isn't confirmed fresh yet.
    assert.equal(
      isSelectionSafeToSubmit(selectedProductId, selectedBatchId, currentProducts, currentBatches),
      false,
      'a submit attempt right after switching, with cleared selection, must be rejected',
    );
    assert.equal(
      isBusinessDataReady(currentProducts, productsAtSwitch) && isBusinessDataReady(currentBatches, batchesAtSwitch),
      false,
      'data must not be considered ready while the arrays are still the pre-switch references',
    );

    // Step 4 — even in the worst case where the UI-level clear were
    // somehow bypassed and Shop A's stale ids were resubmitted while the
    // arrays are still stale, the defense-in-depth check must still see
    // them as *valid against Shop A's own stale arrays* (this is exactly
    // why relying on isSelectionSafeToSubmit alone, without the
    // businessDataReady gate, would NOT be sufficient) — demonstrating
    // why both layers are required together.
    assert.equal(
      isSelectionSafeToSubmit(PRODUCT_A.id, BATCH_A.id, currentProducts, currentBatches),
      true,
      'documents why isSelectionSafeToSubmit alone cannot close the race: stale arrays make stale ids look valid',
    );
    // But the actual component flow never reaches this call with Shop
    // A's ids after a switch, because selection was already cleared in
    // Step 2/3 and the auto-select effects are held back by
    // businessDataReady until Step 5 below — the two layers together are
    // what make the invariant hold end-to-end.

    // Step 5 — Shop B's listeners finally deliver fresh snapshots (new
    // array references).
    currentProducts = [PRODUCT_B];
    currentBatches = [BATCH_B];
    assert.equal(
      isBusinessDataReady(currentProducts, productsAtSwitch) && isBusinessDataReady(currentBatches, batchesAtSwitch),
      true,
      'data is now confirmed ready for Shop B',
    );

    // Step 6 — only now does the auto-select effect run, deriving a
    // selection from Shop B's own (now-confirmed-fresh) data.
    selectedProductId = currentProducts[0].id;
    selectedBatchId = currentBatches[0].id;

    // Step 7 — a submit now succeeds, and it is provably Shop B's own
    // product/batch, never Shop A's.
    assert.equal(
      isSelectionSafeToSubmit(selectedProductId, selectedBatchId, currentProducts, currentBatches),
      true,
    );
    assert.notEqual(selectedProductId, PRODUCT_A.id);
    assert.notEqual(selectedBatchId, BATCH_A.id);
  });
});

// Test 6 (PeriodicStockCountView) is intentionally omitted. The Fix #9
// audit traced its actual data path and confirmed it does NOT hold a
// persisted productId/batchId in component state that can survive a
// business switch — it resolves rows purely by free-text productName,
// matched fresh against `products` inside recordStockCount() at call
// time (see src/context/AppContext.tsx). There is nothing for this guard
// to protect there; adding a test would not demonstrate any real
// invariant. See the Fix #9 implementation report for the full trace.
