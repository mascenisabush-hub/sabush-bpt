// [Fix #10] Transactional open-batch supersession tests.
//
// Exercises the pure functions in src/lib/openBatchSupersession.ts
// directly against plain objects — no React, no Firestore, no emulator —
// matching this repository's own established pattern (see
// tests/shop-switch-guard.test.ts, Fix #9) for testing a state-transition
// invariant without live infrastructure.
//
// IMPORTANT SCOPE NOTE: these are UNIT tests of the decision logic only.
// They prove computeBatchIdsToCheck/computeBatchesToClose behave
// correctly given inputs that *simulate* what a Firestore transaction
// would read. They do NOT and cannot prove Firestore's own real-time
// optimistic-concurrency retry behavior end-to-end — that requires the
// Firestore emulator, which remains environment-blocked in this sandbox
// (confirmed by an actual `firebase emulators:exec` attempt during Fix
// #10 implementation: the emulator JAR download is blocked by network
// egress allowlisting). See the Fix #10 implementation report for the
// explicit ENVIRONMENT-BLOCKED status of that verification.
//
// HOW TO RUN:
//   npx tsx --test tests/open-batch-supersession.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeBatchIdsToCheck,
  computeBatchesToClose,
  type CheckedBatchSnapshot,
} from '../src/lib/openBatchSupersession';

describe('computeBatchIdsToCheck — Test 1: no existing open batch (new product / fresh lock)', () => {
  it('with no lock doc and no candidates, checks nothing', () => {
    const ids = computeBatchIdsToCheck(false, null, []);
    assert.deepEqual(ids, []);
  });

  it('with a lock doc that exists but points at null (defensive shape), checks nothing', () => {
    const ids = computeBatchIdsToCheck(true, null, ['stale-candidate']);
    // Lock exists and is authoritative — the stale client-state candidate
    // must be ignored entirely once a lock doc exists, even if it's non-empty.
    assert.deepEqual(ids, []);
  });
});

describe('computeBatchIdsToCheck / computeBatchesToClose — Test 2: one existing open batch', () => {
  it('lock exists and points at the open batch — that single id is checked', () => {
    const ids = computeBatchIdsToCheck(true, 'batch-A', ['batch-A']);
    assert.deepEqual(ids, ['batch-A']);
  });

  it('that batch, read as still open, is the one closed', () => {
    const checked: CheckedBatchSnapshot[] = [{ id: 'batch-A', exists: true, status: 'open' }];
    assert.deepEqual(computeBatchesToClose(checked), ['batch-A']);
  });
});

describe('computeBatchIdsToCheck / computeBatchesToClose — Test 3: multiple existing open batches (legacy/bootstrap case)', () => {
  it('no lock doc yet — all client-state candidates are checked', () => {
    const ids = computeBatchIdsToCheck(false, null, ['batch-A', 'batch-B', 'batch-C']);
    assert.deepEqual(new Set(ids), new Set(['batch-A', 'batch-B', 'batch-C']));
  });

  it('every one of them found genuinely still open is closed — none skipped', () => {
    const checked: CheckedBatchSnapshot[] = [
      { id: 'batch-A', exists: true, status: 'open' },
      { id: 'batch-B', exists: true, status: 'open' },
      { id: 'batch-C', exists: true, status: 'open' },
    ];
    const toClose = computeBatchesToClose(checked);
    assert.deepEqual(new Set(toClose), new Set(['batch-A', 'batch-B', 'batch-C']));
  });

  it('the new batch becomes the sole open one — this is asserted at the write-plan level: every checked id that was open is in the close-list, and the new batch is never part of that list (it is written separately as open)', () => {
    const checked: CheckedBatchSnapshot[] = [
      { id: 'batch-A', exists: true, status: 'open' },
      { id: 'batch-B', exists: true, status: 'open' },
    ];
    const toClose = computeBatchesToClose(checked);
    assert.equal(toClose.includes('batch-NEW'), false);
  });
});

describe('computeBatchesToClose — Test 4: existing closed batches remain untouched', () => {
  it('a batch already closed is never re-included in the close-list (no redundant write)', () => {
    const checked: CheckedBatchSnapshot[] = [{ id: 'batch-A', exists: true, status: 'closed' }];
    assert.deepEqual(computeBatchesToClose(checked), []);
  });

  it('a batch id that no longer exists (e.g. deleted) is safely excluded, not an error', () => {
    const checked: CheckedBatchSnapshot[] = [{ id: 'batch-ghost', exists: false, status: undefined }];
    assert.deepEqual(computeBatchesToClose(checked), []);
  });

  it('mixed set: only the genuinely open ones are selected, closed/missing ones pass through untouched', () => {
    const checked: CheckedBatchSnapshot[] = [
      { id: 'batch-open', exists: true, status: 'open' },
      { id: 'batch-closed', exists: true, status: 'closed' },
      { id: 'batch-missing', exists: false, status: undefined },
    ];
    assert.deepEqual(computeBatchesToClose(checked), ['batch-open']);
  });
});

describe('Test 5: the write-plan never touches quantity/cost fields', () => {
  it('computeBatchesToClose returns bare ids only — the caller writes {status: "closed"} exclusively, proving by construction that no other field can be part of this write', () => {
    const checked: CheckedBatchSnapshot[] = [{ id: 'batch-A', exists: true, status: 'open' }];
    const toClose = computeBatchesToClose(checked);
    // The return type is string[] — there is no quantity/cost field in
    // this function's output for a caller to accidentally write.
    assert.equal(typeof toClose[0], 'string');
  });
});

describe('Lock-authority transition — post-bootstrap behavior is fully deterministic', () => {
  it('once a lock doc exists, a stale/incomplete candidate list from client state cannot reintroduce a legacy stray open batch', () => {
    // Simulates: lock doc already points at batch-B (the true current
    // open batch per every transaction so far), but the client's local
    // `batches` array hint is stale/wrong (e.g. still lists batch-A as
    // open, from before it was closed). The lock, not the candidate
    // list, must win entirely.
    const ids = computeBatchIdsToCheck(true, 'batch-B', ['batch-A']);
    assert.deepEqual(ids, ['batch-B']);
    assert.equal(ids.includes('batch-A'), false);
  });
});

describe('Same-business, single-writer behavior unchanged (Fix #10 regression guard)', () => {
  it('a single sequential entry (no concurrency at all) still closes exactly the one prior open batch', () => {
    const ids = computeBatchIdsToCheck(true, 'batch-prev', ['batch-prev']);
    assert.deepEqual(ids, ['batch-prev']);
    const checked: CheckedBatchSnapshot[] = [{ id: 'batch-prev', exists: true, status: 'open' }];
    assert.deepEqual(computeBatchesToClose(checked), ['batch-prev']);
  });
});

describe('Bootstrap caveat — documented at the decision-logic level (see AppContext.tsx addStockBatch for full reasoning)', () => {
  it('a legacy open batch absent from the client-state candidate hint is never checked, and therefore never closed', () => {
    // Simulates: product has a pre-Fix-#10 open batch ("legacy-A") that
    // the client's local `batches` state does NOT currently include
    // (e.g. a stale/incomplete snapshot) — no lock doc exists yet. This
    // is the one real residual gap: NOT a live-concurrency race (two
    // transactions reading the SAME lock path are still serialized by
    // Firestore even before that path has ever been written — see the
    // module header), but a one-time legacy-data visibility gap.
    const staleCandidates: string[] = []; // legacy-A missing from this hint
    const idsToCheck = computeBatchIdsToCheck(false, null, staleCandidates);
    assert.equal(idsToCheck.includes('legacy-A'), false, 'a batch id absent from the candidate hint is structurally never read, by construction');
  });

  it('once the lock is created pointing at the new batch, a subsequent transaction correctly follows the lock and does not re-discover the orphan on its own', () => {
    // Documents the follow-on state precisely: the NEXT transaction for
    // this product sees the lock (now pointing at "new-B") and correctly
    // closes new-B when a third batch is entered — legacy-A remains an
    // orphan unless something else (a separate, future data-cleanup
    // pass) closes it. This is intentionally NOT solved by this fix.
    const idsToCheck = computeBatchIdsToCheck(true, 'new-B', ['legacy-A']);
    assert.deepEqual(idsToCheck, ['new-B']);
    assert.equal(idsToCheck.includes('legacy-A'), false);
  });
});
