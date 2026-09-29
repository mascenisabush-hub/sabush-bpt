// SABUSH BPT — Business Worth snapshot creation (recordStockCount):
// (B) an Owner correction never uses the snapshot it replaces as its own
//     baseline; (C) "since last count" figures use exact timestamps, and the
//     cash reconciliation is taken as of confirmation. Owner-approved 2026-09-29.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ctx = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');
const start = ctx.indexOf('const recordStockCount = async');
const body = ctx.slice(start, ctx.indexOf('\n  };', start));

test('(B) the corrected snapshot is excluded from every baseline comparison', () => {
  assert.match(body, /const baselineSnapshots = correctionOfSnapshotId\s*\?\s*businessWorthSnapshots\.filter\(\(s\) => s\.id !== correctionOfSnapshotId\)\s*:\s*businessWorthSnapshots;/);
  assert.match(body, /const previousSnapshots = baselineSnapshots\.filter\(\(s\) => s\.status === 'active'\);/);
  assert.match(body, /getCurrentBusinessWorth\(\{\s*snapshots: baselineSnapshots,/);
  assert.match(body, /getEstimatedBusinessWorth\(\{\s*snapshots: baselineSnapshots,/);
  // the replaced snapshot is still marked corrected/superseded in the same batch
  assert.match(body, /\{ status: correctionKind === 'superadmin-authorized-recovery' \? 'superseded-by-recovery' : 'corrected' \}/);
});

test('(C) since-last-count figures: strictly after the previous confirmation, up to this confirmation, by createdAt', () => {
  assert.match(body, /return Number\.isFinite\(t\) && t > windowStartMillis && t <= confirmationMillis;/);
  for (const [coll, v] of [['expenses', 'e'], ['quebras', 'q'], ['withdrawals', 'w']]) {
    assert.match(body, new RegExp(`${coll}\\s*\\n\\s*\\.filter\\(\\(${v}\\) => isSinceLastSnapshot\\(${v}\\.createdAt\\)\\)`));
  }
  assert.doesNotMatch(body, /isDateInRange\(/);
  assert.doesNotMatch(body, /windowStartDate/);
});

test('(C) cash reconciliation and owner investments are taken as of the moment of confirmation', () => {
  assert.match(body, /getLedgerDerivedCashBalance\(cashLedgerEntries, confirmationMillis\)/);
  assert.doesNotMatch(body, /T23:59:59\.999Z/);
  assert.match(body, /computeOwnerInvestmentsSinceSnapshot\(\s*ownerInvestments,\s*activeBaselineConfirmedAtMillis,\s*confirmationMillis\s*\)/);
});
