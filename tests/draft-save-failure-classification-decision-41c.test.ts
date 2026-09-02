// [Decision 41C — Draft Save Failure Classification + Bounded Retries;
// Implementation Plan §16] Genuine runtime unit tests of
// apps/tenant/src/lib/draftSaveFailureClassification.ts — the one piece
// of 41C with no React/DOM dependency, so it's tested by actually
// calling it rather than by source-text inspection (contrast with
// draft-save-bounded-retry-decision-41c.test.ts, below, which covers
// the View-level wiring the same way this repo's existing
// business-switch-flush-protection-decision-41a.test.ts already does).
//
// HOW TO RUN:
//   npx tsx --test tests/draft-save-failure-classification-decision-41c.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  classifyDraftSaveError,
  isReadbackUnconfirmedError,
  nextRetryDelayMs,
  ReadbackUnconfirmedError,
  DRAFT_SAVE_RETRY_DELAYS_MS,
  DRAFT_SAVE_MAX_ATTEMPTS,
} from '../apps/tenant/src/lib/draftSaveFailureClassification';

function firestoreError(code: string): { code: string; message: string } {
  return { code, message: `simulated ${code}` };
}

describe('classifyDraftSaveError — §1B transient codes (tests 1-5)', () => {
  for (const code of ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'internal', 'cancelled']) {
    it(`classifies '${code}' as transient`, () => {
      assert.equal(
        classifyDraftSaveError(firestoreError(code), { subscriptionBlocksNewRecords: false }),
        'transient'
      );
      // subscriptionBlocksNewRecords must never change a transient
      // classification — it only matters for permission-denied (§1C).
      assert.equal(
        classifyDraftSaveError(firestoreError(code), { subscriptionBlocksNewRecords: true }),
        'transient'
      );
    });
  }
});

describe('classifyDraftSaveError — §1C legitimate subscription blocking (test 10)', () => {
  it("classifies permission-denied as 'save-blocked' ONLY when subscriptionBlocksNewRecords is true", () => {
    assert.equal(
      classifyDraftSaveError(firestoreError('permission-denied'), { subscriptionBlocksNewRecords: true }),
      'save-blocked'
    );
  });
});

describe('classifyDraftSaveError — §1D unknown failures (tests 11-12)', () => {
  it("classifies permission-denied as 'save-unknown' when subscriptionBlocksNewRecords is false — NOT a generic permission failure", () => {
    assert.equal(
      classifyDraftSaveError(firestoreError('permission-denied'), { subscriptionBlocksNewRecords: false }),
      'save-unknown'
    );
  });

  it("classifies an unrecognized Firestore error code as 'save-unknown'", () => {
    assert.equal(
      classifyDraftSaveError(firestoreError('not-found'), { subscriptionBlocksNewRecords: false }),
      'save-unknown'
    );
    assert.equal(
      classifyDraftSaveError(firestoreError('already-exists'), { subscriptionBlocksNewRecords: true }),
      'save-unknown'
    );
  });

  it("classifies a plain, non-Firestore exception (no .code) as 'save-unknown'", () => {
    assert.equal(
      classifyDraftSaveError(new Error('boom'), { subscriptionBlocksNewRecords: false }),
      'save-unknown'
    );
    assert.equal(classifyDraftSaveError(undefined, { subscriptionBlocksNewRecords: false }), 'save-unknown');
    assert.equal(classifyDraftSaveError('a bare string throw', { subscriptionBlocksNewRecords: false }), 'save-unknown');
  });
});

describe('ReadbackUnconfirmedError / isReadbackUnconfirmedError (§2, tests 13-14)', () => {
  it('is recognized by isReadbackUnconfirmedError', () => {
    const err = new ReadbackUnconfirmedError(firestoreError('unavailable'));
    assert.equal(isReadbackUnconfirmedError(err), true);
  });

  it('is NOT recognized for an ordinary error lacking the marker', () => {
    assert.equal(isReadbackUnconfirmedError(new Error('ordinary')), false);
    assert.equal(isReadbackUnconfirmedError(firestoreError('unavailable')), false);
  });

  it('preserves the underlying Firestore code for logging, without it affecting classification', () => {
    const err = new ReadbackUnconfirmedError(firestoreError('unavailable'));
    assert.equal(err.code, 'unavailable');
  });

  it(
    "classifies a readback-unconfirmed result as 'save-unknown' — even when the underlying code is a " +
      'transient WRITE code — and never as transient (test 13/14: a readback failure must never ' +
      'auto-retry as a transient write failure)',
    () => {
      for (const code of ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'internal', 'cancelled']) {
        const err = new ReadbackUnconfirmedError(firestoreError(code));
        assert.equal(
          classifyDraftSaveError(err, { subscriptionBlocksNewRecords: false }),
          'save-unknown',
          `readback-unconfirmed wrapping code '${code}' must still classify as save-unknown`
        );
      }
    }
  );

  it('classifies a readback-unconfirmed result as save-unknown regardless of subscriptionBlocksNewRecords', () => {
    const err = new ReadbackUnconfirmedError(firestoreError('permission-denied'));
    assert.equal(classifyDraftSaveError(err, { subscriptionBlocksNewRecords: true }), 'save-unknown');
    assert.equal(classifyDraftSaveError(err, { subscriptionBlocksNewRecords: false }), 'save-unknown');
  });
});

describe('DRAFT_SAVE_RETRY_DELAYS_MS / nextRetryDelayMs — §3 bounded retry timing (test 6)', () => {
  it('is exactly the governed 1s / 2s / 4s sequence', () => {
    assert.deepEqual(DRAFT_SAVE_RETRY_DELAYS_MS, [1000, 2000, 4000]);
  });

  it('nextRetryDelayMs returns the correct delay for each failed attempt number', () => {
    assert.equal(nextRetryDelayMs(1), 1000); // attempt 1 (initial) failed -> wait 1s before attempt 2
    assert.equal(nextRetryDelayMs(2), 2000); // attempt 2 failed -> wait 2s before attempt 3
    assert.equal(nextRetryDelayMs(3), 4000); // attempt 3 failed -> wait 4s before attempt 4
  });

  it('nextRetryDelayMs returns null once attempt 4 (the final attempt) fails — retries exhausted (test 7)', () => {
    assert.equal(nextRetryDelayMs(4), null);
    assert.equal(nextRetryDelayMs(5), null); // defensive — never called in practice, must never throw
  });
});

describe('DRAFT_SAVE_MAX_ATTEMPTS — §3 "Maximum: 4 total attempts" (test 7)', () => {
  it('equals 4 (1 initial attempt + 3 automatic retries)', () => {
    assert.equal(DRAFT_SAVE_MAX_ATTEMPTS, 4);
    assert.equal(DRAFT_SAVE_MAX_ATTEMPTS, 1 + DRAFT_SAVE_RETRY_DELAYS_MS.length);
  });
});
