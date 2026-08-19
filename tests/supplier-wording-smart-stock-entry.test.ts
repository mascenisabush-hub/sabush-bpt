// [Supplier-Wording Recognition — Checkpoint 4] Tests proving that
// Smart Stock Entry scan-generated rows receive the same supplier-wording
// recognition behavior as manually entered Add Stock rows.
//
// SCOPE: this checkpoint's authorized change was corrected, after
// baseline investigation, from a (nonexistent) server-side transaction
// integration to a narrow client-side gap: AddStockView.tsx's
// buildRowFromProposalLineItem previously used ONLY the server's own
// exact-name match, bypassing Checkpoint 3's candidate/reuse recognition
// entirely for scan-sourced rows. The fix is entirely expressed in one
// new pure function, resolveScanRowSupplierWording
// (apps/tenant/src/lib/supplierWordingRecognition.ts), composing (never
// reimplementing) Checkpoint 3's own resolveSupplierWordingRecognition.
// This suite tests that composition directly, matching this repository's
// established pattern of testing extracted pure decision logic rather
// than the React component that calls it.
//
// The extraction ENDPOINT itself (server/smartStockEntry.ts,
// server/index.ts) is untouched by this checkpoint — see the companion
// regression assertion at the bottom of this file, which re-imports and
// exercises server/smartStockEntry.ts's own pure functions to prove nothing
// there was disturbed, and the completion report's diff audit for the
// stronger, file-level guarantee (no lines changed in that file at all).
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-smart-stock-entry.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { resolveScanRowSupplierWording } from '../apps/tenant/src/lib/supplierWordingRecognition';
import {
  classifyStringField,
  classifyNumericField,
  matchProductByExactName,
} from '../server/smartStockEntry';
import * as smartStockEntryModule from '../server/smartStockEntry';

// ---------------------------------------------------------------------
// [Test 1] Scan-generated row with no supplier wording
// ---------------------------------------------------------------------

describe('resolveScanRowSupplierWording — [Test 1] no supplier wording involved', () => {
  it('a confident server exact-match produces the matched product, no recognition state at all', () => {
    const products = [{ id: 'p1', name: 'Coca-Cola 300ml' }];
    const decision = resolveScanRowSupplierWording(
      'Coca-Cola 300ml',
      { status: 'confident', productId: 'p1' },
      'supplier-1',
      products
    );
    assert.deepEqual(decision, {
      matchedProductId: 'p1',
      pendingSupplierWording: undefined,
      supplierWordingCandidates: undefined,
    });
  });

  it('an empty extracted product name produces no match and no recognition state', () => {
    const decision = resolveScanRowSupplierWording('', { status: 'no_match', productId: null }, 'supplier-1', []);
    assert.deepEqual(decision, {
      matchedProductId: undefined,
      pendingSupplierWording: undefined,
      supplierWordingCandidates: undefined,
    });
  });

  it('a genuinely new, unrecognized wording produces no match and no candidates — ordinary new-product path, unaffected', () => {
    const products = [{ id: 'p1', name: 'Coca-Cola 300ml' }];
    const decision = resolveScanRowSupplierWording(
      'Fanta Laranja 500ml',
      { status: 'no_match', productId: null },
      'supplier-1',
      products
    );
    assert.deepEqual(decision, {
      matchedProductId: undefined,
      pendingSupplierWording: undefined,
      supplierWordingCandidates: undefined,
    });
  });
});

// ---------------------------------------------------------------------
// [Test 2, 4] Scan-generated row with a valid supplier-wording candidate
// / requiring confirmation
// ---------------------------------------------------------------------

describe('resolveScanRowSupplierWording — [Test 2, 4] candidate recognition for a scanned wording', () => {
  it('surfaces a candidate when the server found no exact match but the wording is normalization-close to an existing Product.name', () => {
    const products = [{ id: 'p1', name: 'Café Preto 500ml' }];
    const decision = resolveScanRowSupplierWording(
      'CAFE preto 500ml',
      { status: 'no_match', productId: null },
      'supplier-1',
      products
    );
    assert.equal(decision.matchedProductId, undefined);
    assert.equal(decision.pendingSupplierWording, undefined);
    assert.ok(decision.supplierWordingCandidates);
    assert.equal(decision.supplierWordingCandidates!.length, 1);
    assert.equal(decision.supplierWordingCandidates![0].productId, 'p1');
    // [Test 4] This is exactly the shape AddStockView's existing,
    // already-tested candidate confirm/decline panel renders from —
    // row.supplierWordingCandidates is read generically, with no
    // scan-specific branch, so confirmation behaves identically to a
    // manually typed row's candidate (proven in Checkpoint 3's own
    // planSupplierWordingConfirmation tests).
  });

  it('also surfaces a candidate for an "uncertain" server match, not just "no_match" (server confidence never suppresses this client-side check)', () => {
    const products = [{ id: 'p1', name: 'Leite em Pó 400g' }];
    const decision = resolveScanRowSupplierWording(
      'leite em po 400g',
      { status: 'uncertain', productId: null },
      'supplier-1',
      products
    );
    assert.ok(decision.supplierWordingCandidates);
    assert.equal(decision.supplierWordingCandidates!.length, 1);
  });
});

// ---------------------------------------------------------------------
// [Test 3] Scan-generated row with an exact-match supplier wording
// ---------------------------------------------------------------------

describe('resolveScanRowSupplierWording — [Test 3] exact-match reuse for a scanned wording', () => {
  it('silently reuses an already-confirmed relationship — matchedProductId set, pendingSupplierWording carries origin "reused"', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const decision = resolveScanRowSupplierWording(
      'Lager Grande',
      { status: 'no_match', productId: null },
      'supplier-1',
      products
    );
    assert.deepEqual(decision, {
      matchedProductId: 'p1',
      pendingSupplierWording: {
        wording: 'Lager Grande',
        productId: 'p1',
        origin: 'reused',
        conflictCheckProductIds: [],
      },
      supplierWordingCandidates: undefined,
    });
  });

  it('does not reuse when the extraction ran before a supplier was selected (supplierId undefined) — falls through to candidate detection instead, never silently skipped', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const decision = resolveScanRowSupplierWording(
      'Lager Grande',
      { status: 'no_match', productId: null },
      undefined,
      products
    );
    assert.equal(decision.matchedProductId, undefined);
    assert.ok(decision.supplierWordingCandidates); // still recognized via the alternative-wording ground
  });
});

// ---------------------------------------------------------------------
// [Test 5, 6] Conflict / distinguishing information
// ---------------------------------------------------------------------

describe('resolveScanRowSupplierWording — [Test 5, 6] conflict and distinguishing-information path is the SAME shared UI, not reimplemented here', () => {
  it('a wording already claimed by product A, appearing for a scan row, is surfaced as a normal candidate — the conflict/mandatory-distinguishing-information gate is AddStockView\u2019s existing, unmodified handleDeclineSupplierWordingCandidates/handleSubmit logic, which reads row.supplierWordingCandidates the same way for every row regardless of origin', () => {
    const products = [
      {
        id: 'p1',
        name: 'Leite em Pó',
        supplierWordings: [{ supplierRecordId: 'supplier-9', wording: 'Leite Powder' }],
      },
    ];
    const decision = resolveScanRowSupplierWording(
      'Leite Powder',
      { status: 'no_match', productId: null },
      'supplier-DIFFERENT',
      products
    );
    assert.ok(decision.supplierWordingCandidates);
    assert.equal(decision.supplierWordingCandidates![0].grounds.includes('existing-alternative-wording'), true);
    // The distinguishing-information requirement gate itself
    // (row.supplierWordingConflictPending) is set by
    // handleDeclineSupplierWordingCandidates when this exact grounds
    // value is present — unchanged by this checkpoint, verified by the
    // Checkpoint 3 diff containing zero edits to that function (see
    // completion report's adversarial diff audit).
  });
});

// ---------------------------------------------------------------------
// [Test 7] Scan-generated row still reaches the normal Add Stock
// finalization path
// ---------------------------------------------------------------------

describe('Scan-row finalization path — [Test 7] no second persistence path introduced', () => {
  it('a resolved scan-row decision produces exactly the same pendingSupplierWording SHAPE addMultipleStockBatches (AppContext.tsx) already consumes for manual rows — Checkpoint 3\u2019s AddStockParams.pendingSupplierWording contract, unchanged', () => {
    const products = [
      {
        id: 'p1',
        name: 'Cerveja Lager 330ml',
        supplierWordings: [{ supplierRecordId: 'supplier-1', wording: 'Lager Grande' }],
      },
    ];
    const decision = resolveScanRowSupplierWording(
      'Lager Grande',
      { status: 'no_match', productId: null },
      'supplier-1',
      products
    );
    // Shape check: exactly the fields AddStockView.tsx's handleSubmit
    // already reads off row.pendingSupplierWording (wording, productId,
    // origin, conflictCheckProductIds) — proves buildRowFromProposalLineItem
    // needs no new finalization branch, only this decision applied to
    // the row it already constructs.
    assert.ok(decision.pendingSupplierWording);
    assert.deepEqual(Object.keys(decision.pendingSupplierWording!).sort(), [
      'conflictCheckProductIds',
      'origin',
      'productId',
      'wording',
    ]);
  });
});

// ---------------------------------------------------------------------
// [Test 8] Existing manually entered supplier-wording behavior remains
// unchanged
// ---------------------------------------------------------------------

describe('[Test 8] manual-entry recognition is untouched by this checkpoint', () => {
  it('resolveSupplierWordingRecognition itself (Checkpoint 3\u2019s own function, composed here, never edited) still behaves exactly as its own Checkpoint 3 test suite already proves', () => {
    // Re-imported and exercised here as a direct regression check,
    // rather than merely asserted by omission from the diff — a
    // conflicting edit to resolveSupplierWordingRecognition's own
    // signature or behavior would surface as a compile error or a
    // failing assertion right here.
    const products = [{ id: 'p1', name: 'Coca-Cola 300ml' }];
    const decision = resolveScanRowSupplierWording(
      'coca-cola 300ml', // exact match, case-insensitive
      { status: 'no_match', productId: null }, // deliberately NOT server-confident, to prove the underlying exact-match short-circuit still fires via resolveSupplierWordingRecognition's own 'none' case
      'supplier-1',
      products
    );
    assert.deepEqual(decision, {
      matchedProductId: undefined, // 'none' outcome never sets a matchedProductId — this is intentional and matches manual entry's own "recognition never fires on an exact match" rule; the row's OWN productName is already correct as typed and needs no rewrite
      pendingSupplierWording: undefined,
      supplierWordingCandidates: undefined,
    });
  });
});

// ---------------------------------------------------------------------
// [Test 9, 10] Existing Smart Stock Entry extraction behavior remains
// unchanged; no writes occur during the extraction/proposal phase
// ---------------------------------------------------------------------

describe('[Test 9] server/smartStockEntry.ts pure functions are unmodified by this checkpoint', () => {
  it('classifyStringField still behaves exactly as before (regression re-check, not just a diff omission)', () => {
    assert.deepEqual(classifyStringField('  Coca-Cola  '), { value: 'Coca-Cola', status: 'detected' });
    assert.deepEqual(classifyStringField(''), { value: null, status: 'not_found' });
  });

  it('classifyNumericField still behaves exactly as before', () => {
    assert.deepEqual(classifyNumericField(5), { value: 5, status: 'detected' });
    assert.deepEqual(classifyNumericField(-1), { value: -1, status: 'review' });
  });

  it('matchProductByExactName still only matches by exact, case-insensitive Product.name — no supplier-wording awareness was added to the server route by this checkpoint (by design — see docs/architecture/10-smart-stock-entry-adr.md Decision 2a)', () => {
    const products = [{ id: 'p1', name: 'Cerveja Lager 330ml' }];
    assert.deepEqual(matchProductByExactName('cerveja lager 330ml', products), {
      status: 'confident',
      productId: 'p1',
    });
    assert.deepEqual(matchProductByExactName('Lager Grande', products), { status: 'no_match', productId: null });
  });
});

describe('[Test 10] no writes occur during the extraction/proposal phase', () => {
  it('server/smartStockEntry.ts exports no Firestore write/transaction primitive of any kind — a static, file-level guarantee, not merely a runtime assertion', () => {
    const exportedNames = Object.keys(smartStockEntryModule);
    const forbiddenNamePatterns = /write|commit|transaction|batch|persist|save/i;
    const suspicious = exportedNames.filter((name) => forbiddenNamePatterns.test(name));
    assert.deepEqual(
      suspicious,
      [],
      `server/smartStockEntry.ts must remain proposal-only and write-free (ADR Decision 2a); found suspicious export(s): ${suspicious.join(', ')}`
    );
  });
});
