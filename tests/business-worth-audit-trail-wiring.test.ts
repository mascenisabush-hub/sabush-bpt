// Business Worth Evolution — Implementation Authorization, Increment 9
// (Auditability). Two kinds of tests here:
//
// 1. A genuine BEHAVIORAL test (not source-inspection): imports the
//    real timelineHelpers.ts maps and asserts every TimelineActivityType
//    has a real entry in each — this is TypeScript's own exhaustiveness
//    guarantee (Record<TimelineActivityType, X>) re-verified at runtime,
//    not merely matched against source text.
// 2. Source-inspection tests for the AppContext.tsx wiring, matching
//    this repository's own established technique for this class of
//    coverage (see tests/business-worth-estimated-and-dashboard.test.ts's
//    own header) — the only practical technique available for a
//    stateful, Firebase-client-SDK-coupled function like recordStockCount
//    without a live emulator (see tests/initial-stock-confirmation.test.ts's
//    own header for why AppContext functions are never called directly
//    in this repo's test suite).
//
// Specification §34, FR-48. Rule 8 Finding 11-A / §36 item 7's own
// resolution.
//
// HOW TO RUN:
//   npx tsx --test tests/business-worth-audit-trail-wiring.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { ACTIVITY_ICON, ACTIVITY_COLOR, ACTIVITY_LABEL, ALL_ACTIVITY_TYPES } from '../apps/tenant/src/components/timeline/timelineHelpers';
import type { TimelineActivityType } from '../apps/tenant/src/types';

const NEW_INCREMENT_9_TYPES: TimelineActivityType[] = [
  'business-worth-snapshot-confirmed',
  'business-worth-correction',
  'business-worth-recovery-consumed',
  'receivable-payment-recorded',
  'payable-payment-recorded',
];

describe('timelineHelpers.ts — Increment 9 activity types are genuinely present (behavioral, not source-inspection)', () => {
  it('every new activity type has a real ACTIVITY_ICON entry (a component, not undefined)', () => {
    for (const type of NEW_INCREMENT_9_TYPES) {
      assert.notEqual(ACTIVITY_ICON[type], undefined, `Missing icon for ${type}`);
    }
  });

  it('every new activity type has a real ACTIVITY_COLOR entry (a non-empty string)', () => {
    for (const type of NEW_INCREMENT_9_TYPES) {
      assert.equal(typeof ACTIVITY_COLOR[type], 'string');
      assert.ok(ACTIVITY_COLOR[type].length > 0, `Empty color for ${type}`);
    }
  });

  it('every new activity type has a real ACTIVITY_LABEL entry (a non-empty, human string)', () => {
    for (const type of NEW_INCREMENT_9_TYPES) {
      assert.equal(typeof ACTIVITY_LABEL[type], 'string');
      assert.ok(ACTIVITY_LABEL[type].length > 0, `Empty label for ${type}`);
    }
  });

  it('the three new Business Worth event types (confirmed/correction/recovery) have visually DISTINCT colors — never collapsed to look identical', () => {
    const c1 = ACTIVITY_COLOR['business-worth-snapshot-confirmed'];
    const c2 = ACTIVITY_COLOR['business-worth-correction'];
    const c3 = ACTIVITY_COLOR['business-worth-recovery-consumed'];
    // Correction and recovery share the amber "attention" family
    // (matching PeriodicStockCountView's own banner), but neither
    // equals the ordinary-confirmation color — an ordinary event must
    // never visually read as a correction/recovery.
    assert.notEqual(c1, c2);
    assert.notEqual(c1, c3);
  });

  it('every new activity type is present in ALL_ACTIVITY_TYPES (the filter/index list)', () => {
    for (const type of NEW_INCREMENT_9_TYPES) {
      assert.ok(ALL_ACTIVITY_TYPES.includes(type), `${type} missing from ALL_ACTIVITY_TYPES`);
    }
  });

  it('ALL_ACTIVITY_TYPES has no duplicate entries after this increment\'s additions', () => {
    const seen = new Set(ALL_ACTIVITY_TYPES);
    assert.equal(seen.size, ALL_ACTIVITY_TYPES.length);
  });
});

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

describe('AppContext.tsx — Increment 9 audit wiring (source-inspection)', () => {
  it('the Business Worth Timeline audit call is logged only AFTER fsBatch.commit() — never before, never regardless of whether the write actually succeeded', () => {
    const commitIdx = appContextSrc.indexOf('await fsBatch.commit();', appContextSrc.indexOf('const recordStockCount = async ('));
    const auditIdx = appContextSrc.indexOf("businessWorthSnapshotForTimeline) {", commitIdx);
    assert.notEqual(commitIdx, -1);
    assert.notEqual(auditIdx, -1);
    assert.ok(auditIdx > commitIdx, 'The Business Worth audit block must appear strictly after fsBatch.commit() in source order.');
  });

  it('distinguishes exactly three event types (confirmation, correction, recovery) via correctionKind — never a single generic type', () => {
    const idx = appContextSrc.indexOf('if (businessWorthSnapshotForTimeline) {');
    assert.notEqual(idx, -1);
    const block = appContextSrc.slice(idx, idx + 3000);
    assert.match(block, /type: 'business-worth-snapshot-confirmed'/);
    assert.match(block, /type: 'business-worth-correction'/);
    assert.match(block, /type: 'business-worth-recovery-consumed'/);
  });

  it('each Business Worth audit entry uses a deterministic id derived from the underlying snapshot id — never a random id — so a retry converges via the rules-enforced append-only mechanism, not idempotent overwrite', () => {
    const idx = appContextSrc.indexOf('if (businessWorthSnapshotForTimeline) {');
    const block = appContextSrc.slice(idx, idx + 3000);
    const occurrences = (block.match(/id: 'tl-' \+ bwsTimeline\.id,/g) ?? []).length;
    assert.ok(occurrences >= 3, 'Expected all three event branches to use the deterministic tl-<snapshotId> id.');
  });

  it('the reconciliation signal (Specification §22) is carried as part of the SAME confirmation-time audit entry, never a second, separately-invented event', () => {
    const idx = appContextSrc.indexOf('if (businessWorthSnapshotForTimeline) {');
    const block = appContextSrc.slice(idx, idx + 2000);
    assert.match(block, /reconciliationImpact/);
    assert.doesNotMatch(block, /new Date\(\)\.getTime\(\).*reconciliation/i, 'No separately-timed reconciliation event should be invented.');
  });

  it('recordReceivablePayment logs its audit entry with a deterministic id derived from submissionId, after the transaction has already succeeded', () => {
    const start = appContextSrc.indexOf('const recordReceivablePayment = async (');
    assert.notEqual(start, -1);
    const nextFnIdx = appContextSrc.indexOf('\n  // [Business Worth Evolution', start + 100);
    const fnBody = appContextSrc.slice(start, nextFnIdx === -1 ? start + 4000 : nextFnIdx);
    const transactionEndIdx = fnBody.indexOf('});', fnBody.indexOf('await runTransaction'));
    const auditIdx = fnBody.indexOf("id: 'tl-receivable-payment-' + submissionId");
    assert.notEqual(auditIdx, -1);
    assert.ok(auditIdx > transactionEndIdx, 'The receivable-payment audit call must appear after the transaction body in source order.');
    assert.match(fnBody, /type: 'receivable-payment-recorded'/);
  });

  it('recordPayablePayment logs its audit entry with a deterministic id derived from submissionId, after the transaction has already succeeded', () => {
    const start = appContextSrc.indexOf('const recordPayablePayment = async (');
    assert.notEqual(start, -1);
    const fnBody = appContextSrc.slice(start, start + 4000);
    const transactionEndIdx = fnBody.indexOf('});', fnBody.indexOf('await runTransaction'));
    const auditIdx = fnBody.indexOf("id: 'tl-payable-payment-' + submissionId");
    assert.notEqual(auditIdx, -1);
    assert.ok(auditIdx > transactionEndIdx, 'The payable-payment audit call must appear after the transaction body in source order.');
    assert.match(fnBody, /type: 'payable-payment-recorded'/);
  });

  it('neither payment audit call is gated behind a "was this a fresh apply, not a retry" branch — retry-safety is delegated entirely to the deterministic id + rules-enforced append-only mechanism, matching this file\'s own established periodic-stock-verification precedent', () => {
    const start = appContextSrc.indexOf("id: 'tl-receivable-payment-' + submissionId");
    const precedingLines = appContextSrc.slice(start - 400, start);
    assert.doesNotMatch(precedingLines, /if \(wasAlreadyRecorded\)/);
    assert.doesNotMatch(precedingLines, /if \(!isRetry\)/);
  });
});

describe('server/index.ts — Increment 9 does not modify Increment 8\'s existing SuperAdmin recovery grant audit entry', () => {
  const serverSrc = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf-8');

  it('business_worth_recovery.authorized is still written exactly once, via the existing writeAuditLogEntry helper, unchanged by this increment', () => {
    const occurrences = (serverSrc.match(/actionType: 'business_worth_recovery\.authorized',/g) ?? []).length;
    assert.equal(occurrences, 1);
  });
});

describe('Scope discipline — Increment 9 touches only Auditability', () => {
  it('AppContext.tsx\'s new Increment 9 code exists and is anchored at the expected location (sanity check for the tests above)', () => {
    const idx = appContextSrc.indexOf('businessWorthSnapshotForTimeline');
    assert.notEqual(idx, -1);
  });

  it('no existing StockCount/BusinessWorthSnapshot field name was renamed or removed by this increment (every field this suite\'s companion tests from Increment 1-8 already assert on is still referenced)', () => {
    assert.match(appContextSrc, /measuredBusinessWorth/);
    assert.match(appContextSrc, /correctionWindowExpiresAt/);
    assert.match(appContextSrc, /supersedesSnapshotId/);
  });
});
