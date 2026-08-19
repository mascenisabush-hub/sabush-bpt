// [Supplier-Wording Recognition — Checkpoint 5] Tests for
// distinguishing-information capture (POL-0007 "Conflicting Supplier
// Wording — Distinguishing Information: ACCEPT, Mandatory"; Rule 8
// Finding 9).
//
// SCOPE: the mandatory GATE (a new product created in response to a
// flagged wording conflict cannot submit without distinguishing
// information) was already implemented and tested in Checkpoint 3
// (tests/supplier-wording-add-stock.test.ts, AddStockView.tsx's
// supplierWordingConflictPending validation) — unchanged by this
// checkpoint. This suite covers what Checkpoint 3 explicitly deferred:
// the CAPTURE/persistence of that information once provided, via the
// pure buildProductCreatedTimelineEventContent function
// (supplierWordingConfirmation.ts), following Rule 8 Finding 9's
// explicit delegation of the field-shape question to implementation
// time, quoted verbatim as a binding technical decision in the
// Implementation Authorization's own §2.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-distinguishing-info.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { buildProductCreatedTimelineEventContent } from '../apps/tenant/src/lib/supplierWordingConfirmation';

describe('buildProductCreatedTimelineEventContent — ordinary new product (no conflict involved)', () => {
  it('produces the exact, pre-existing description/details when no distinguishing information is given', () => {
    const content = buildProductCreatedTimelineEventContent('Fanta Laranja 500ml');
    assert.deepEqual(content, {
      description: '"Fanta Laranja 500ml" foi adicionado como novo produto.',
      details: { productName: 'Fanta Laranja 500ml' },
    });
  });

  it('is unaffected by an empty or whitespace-only distinguishing information value — treated identically to "not provided"', () => {
    const content = buildProductCreatedTimelineEventContent('Fanta Laranja 500ml', '   ');
    assert.deepEqual(content, {
      description: '"Fanta Laranja 500ml" foi adicionado como novo produto.',
      details: { productName: 'Fanta Laranja 500ml' },
    });
  });
});

describe('buildProductCreatedTimelineEventContent — [POL-0007 conflict path] distinguishing information is captured', () => {
  it('appends the distinguishing information to the description and includes it in details', () => {
    const content = buildProductCreatedTimelineEventContent('Bela 400g', '500g pack instead of 400g');
    assert.deepEqual(content, {
      description: '"Bela 400g" foi adicionado como novo produto. Distinção: 500g pack instead of 400g',
      details: { productName: 'Bela 400g', distinguishingInfo: '500g pack instead of 400g' },
    });
  });

  it('trims the distinguishing information before capturing it', () => {
    const content = buildProductCreatedTimelineEventContent('Bela 400g', '  500g pack instead of 400g  ');
    assert.equal(content.details.distinguishingInfo, '500g pack instead of 400g');
    assert.ok(content.description.endsWith('500g pack instead of 400g'));
  });

  it('the details object never carries a distinguishingInfo key at all when none was given (never an empty string, matching this codebase\u2019s conditional-spread discipline elsewhere)', () => {
    const content = buildProductCreatedTimelineEventContent('Fanta Laranja 500ml');
    assert.equal('distinguishingInfo' in content.details, false);
  });
});

describe('Regression — [Checkpoint 3] the mandatory gate itself is untouched by this checkpoint', () => {
  it('is proven by tests/supplier-wording-add-stock.test.ts, not re-tested here — this checkpoint only adds CAPTURE for information the gate already required', () => {
    // Documentation-only assertion: Checkpoint 5 does not modify
    // AddStockView.tsx's supplierWordingConflictPending validation or
    // handleDeclineSupplierWordingCandidates (verified in the
    // completion report's diff audit). This test exists to make that
    // boundary explicit in the test suite itself, not only in prose.
    assert.ok(true);
  });
});
