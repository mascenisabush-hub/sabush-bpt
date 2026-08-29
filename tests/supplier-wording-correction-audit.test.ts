// Owner-Controlled Correction of a Remembered Supplier-Wording
// Relationship — Audit content tests for the pure builder:
//   - buildSupplierWordingCorrectionTimelineEventContent (apps/tenant/src/lib/supplierWordingConfirmation.ts)
//
// Governing chain: BDR-0013, the accepted Amendment, the READY Rule 8
// Assessment, the accepted Implementation Plan, and the signed
// Implementation Authorization (SABUSHIMIKE MASCENI, 29 August 2026).
//
// SCOPE: mirrors tests/supplier-wording-distinguishing-info.test.ts's
// own established pattern for testing a pure TimelineEvent
// description/details builder against plain values only — no
// Firestore client, no emulator. AppContext.tsx's
// removeSupplierWordingRelationship/redirectSupplierWordingRelationship
// call this builder and then the existing, unmodified
// logTimelineEvent — that wiring (actor/businessId-scoped path) is
// existing, already-tested infrastructure, not re-tested here.
//
// Also verifies the additive 'supplier-wording-relationship-corrected'
// TimelineActivityType value is fully wired into the existing,
// pre-existing exhaustive presentation maps
// (apps/tenant/src/components/timeline/timelineHelpers.ts) — a
// TypeScript-compiler-enforced consequence of extending the closed
// TimelineActivityType union, verified explicitly here rather than
// left to be discovered only via `tsc --noEmit`.
//
// HOW TO RUN:
//   npx tsx --test tests/supplier-wording-correction-audit.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { buildSupplierWordingCorrectionTimelineEventContent } from '../apps/tenant/src/lib/supplierWordingConfirmation';
import { ACTIVITY_ICON, ACTIVITY_COLOR, ACTIVITY_LABEL, ALL_ACTIVITY_TYPES } from '../apps/tenant/src/components/timeline/timelineHelpers';

describe('buildSupplierWordingCorrectionTimelineEventContent — removal', () => {
  it('produces action: "removed", with the source product name only — no newProductName key at all', () => {
    const content = buildSupplierWordingCorrectionTimelineEventContent(
      'removed',
      'supplier-1',
      'Coka Cola 2L',
      'Coca-Cola 2L'
    );
    assert.equal(content.details.action, 'removed');
    assert.equal(content.details.supplierRecordId, 'supplier-1');
    assert.equal(content.details.wording, 'Coka Cola 2L');
    assert.equal(content.details.oldProductName, 'Coca-Cola 2L');
    assert.equal('newProductName' in content.details, false);
    assert.equal('destinationAlreadyHasIt' in content.details, false);
    assert.ok(content.description.includes('Coka Cola 2L'));
    assert.ok(content.description.includes('Coca-Cola 2L'));
  });
});

describe('buildSupplierWordingCorrectionTimelineEventContent — ordinary successful redirect', () => {
  it('produces action: "redirected", with both old and new product names, no destinationAlreadyHasIt key', () => {
    const content = buildSupplierWordingCorrectionTimelineEventContent(
      'redirected',
      'supplier-1',
      'Coka Cola 2L',
      'Product A',
      'Product B'
    );
    assert.equal(content.details.action, 'redirected');
    assert.equal(content.details.oldProductName, 'Product A');
    assert.equal(content.details.newProductName, 'Product B');
    assert.equal('destinationAlreadyHasIt' in content.details, false);
    assert.ok(content.description.includes('Product A'));
    assert.ok(content.description.includes('Product B'));
  });
});

describe('buildSupplierWordingCorrectionTimelineEventContent — destination-already-has-it redirect branch', () => {
  it('includes destinationAlreadyHasIt: "true" (a string, matching TimelineEvent.details\u2019 Record<string, string | number | undefined> contract, never a boolean)', () => {
    const content = buildSupplierWordingCorrectionTimelineEventContent(
      'redirected',
      'supplier-1',
      'Coka Cola 2L',
      'Product A',
      'Product B',
      true
    );
    assert.equal(content.details.destinationAlreadyHasIt, 'true');
    assert.equal(typeof content.details.destinationAlreadyHasIt, 'string');
    assert.ok(content.description.includes('já possuía esta relação'));
  });

  it('omits destinationAlreadyHasIt entirely (not even "false") when the flag is not passed or is false', () => {
    const withoutFlag = buildSupplierWordingCorrectionTimelineEventContent(
      'redirected',
      'supplier-1',
      'Coka Cola 2L',
      'Product A',
      'Product B'
    );
    assert.equal('destinationAlreadyHasIt' in withoutFlag.details, false);

    const withFalseFlag = buildSupplierWordingCorrectionTimelineEventContent(
      'redirected',
      'supplier-1',
      'Coka Cola 2L',
      'Product A',
      'Product B',
      false
    );
    assert.equal('destinationAlreadyHasIt' in withFalseFlag.details, false);
  });
});

describe('buildSupplierWordingCorrectionTimelineEventContent — details never carries any field beyond the authorized minimum', () => {
  it('removal details keys are exactly the authorized set', () => {
    const content = buildSupplierWordingCorrectionTimelineEventContent('removed', 'supplier-1', 'Wording', 'Product A');
    assert.deepEqual(Object.keys(content.details).sort(), ['action', 'oldProductName', 'supplierRecordId', 'wording']);
  });

  it('ordinary redirect details keys are exactly the authorized set', () => {
    const content = buildSupplierWordingCorrectionTimelineEventContent(
      'redirected',
      'supplier-1',
      'Wording',
      'Product A',
      'Product B'
    );
    assert.deepEqual(
      Object.keys(content.details).sort(),
      ['action', 'newProductName', 'oldProductName', 'supplierRecordId', 'wording']
    );
  });

  it('destination-already-has-it redirect details keys are exactly the authorized set', () => {
    const content = buildSupplierWordingCorrectionTimelineEventContent(
      'redirected',
      'supplier-1',
      'Wording',
      'Product A',
      'Product B',
      true
    );
    assert.deepEqual(
      Object.keys(content.details).sort(),
      ['action', 'destinationAlreadyHasIt', 'newProductName', 'oldProductName', 'supplierRecordId', 'wording']
    );
  });
});

// ---------------------------------------------------------------------
// TimelineActivityType wiring — the additive
// 'supplier-wording-relationship-corrected' value must be present in
// every exhaustive presentation map (TypeScript's own Record<TimelineActivityType, ...>
// completeness already enforces this at compile time; this test makes
// it an explicit, documented runtime assertion too).
// ---------------------------------------------------------------------
describe('TimelineActivityType — supplier-wording-relationship-corrected is fully wired into the existing Timeline presentation maps', () => {
  it('has an icon entry', () => {
    assert.ok(ACTIVITY_ICON['supplier-wording-relationship-corrected']);
  });
  it('has a color entry', () => {
    assert.ok(ACTIVITY_COLOR['supplier-wording-relationship-corrected']);
  });
  it('has a label entry', () => {
    assert.equal(ACTIVITY_LABEL['supplier-wording-relationship-corrected'], 'Correção de Relação de Fornecedor');
  });
  it('is included in the filter-dropdown list (ALL_ACTIVITY_TYPES)', () => {
    assert.ok(ALL_ACTIVITY_TYPES.includes('supplier-wording-relationship-corrected'));
  });
});
