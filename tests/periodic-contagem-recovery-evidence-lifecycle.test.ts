// Regression: browser-local recovery snapshots were written on every edit but never cleared, so every
// row ever saved left "unconfirmed change" evidence behind and "Rever e Confirmar Contagem" showed
// "Existem N linha(s) com alterações não confirmadas…" with nothing the operator could do.

import { readFileSync } from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  writePeriodicRecoverySnapshot,
  readPeriodicRecoverySnapshot,
  listPeriodicRecoveryRowKeys,
  clearAllPeriodicRecoverySnapshots,
  reconcilePeriodicRecoverySnapshot,
  isSnapshotFromEarlierLifecycle,
} from '../apps/tenant/src/lib/periodicContagemRecovery.ts';

const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

const content = { productName: 'Patas', quantity: '2', unit: 'Cx', costPrice: '', sellingPrice: '2560' };
const snap = (savedAt: string, baseRev = 3) => ({ savedAt, baseRev, content });

describe('recovery snapshot lifecycle helpers', () => {
  beforeEach(() => store.clear());

  it('clearAll removes every snapshot of the business and leaves other businesses/keys alone', () => {
    writePeriodicRecoverySnapshot('biz1', 'manual:a', snap('2026-09-01T10:00:00Z'));
    writePeriodicRecoverySnapshot('biz1', 'catalog:p1', snap('2026-09-01T10:00:00Z'));
    writePeriodicRecoverySnapshot('biz2', 'manual:a', snap('2026-09-01T10:00:00Z'));
    store.set('unrelated', 'x');
    clearAllPeriodicRecoverySnapshots('biz1');
    assert.deepEqual(listPeriodicRecoveryRowKeys('biz1'), []);
    assert.equal(readPeriodicRecoverySnapshot('biz2', 'manual:a') !== null, true);
    assert.equal(store.get('unrelated'), 'x');
  });
});

describe('isSnapshotFromEarlierLifecycle — leftovers from an earlier count that reused the row key', () => {
  it("last month's snapshot against this month's brand-new row is from an earlier lifecycle", () => {
    assert.equal(isSnapshotFromEarlierLifecycle('2026-08-28T10:00:00Z', '2026-09-28T07:33:25.424Z'), true);
  });
  it('a snapshot NEWER than the row is never discarded (a real unsaved edit stays flagged)', () => {
    assert.equal(isSnapshotFromEarlierLifecycle('2026-09-28T09:00:00Z', '2026-09-28T07:33:25.424Z'), false);
  });
  it('clock skew inside the margin keeps the evidence (fail-closed direction)', () => {
    assert.equal(isSnapshotFromEarlierLifecycle('2026-09-28T07:30:00Z', '2026-09-28T07:33:25.424Z'), false);
  });
  it('unknown or unparseable timestamps keep the evidence', () => {
    assert.equal(isSnapshotFromEarlierLifecycle('2026-08-28T10:00:00Z', undefined), false);
    assert.equal(isSnapshotFromEarlierLifecycle('not-a-date', '2026-09-28T07:33:25.424Z'), false);
  });
});

describe('reconcilePeriodicRecoverySnapshot — the original four-case contract is unchanged', () => {
  it('fail-closed / unacknowledged / already-synced / diverged', () => {
    assert.equal(reconcilePeriodicRecoverySnapshot(snap('2026-09-28T09:00:00Z'), { exists: false }).outcome, 'fail-closed');
    assert.equal(reconcilePeriodicRecoverySnapshot(snap('2026-09-28T09:00:00Z', 3), { exists: true, rev: 3, content }).outcome, 'unacknowledged');
    assert.equal(reconcilePeriodicRecoverySnapshot(snap('2026-09-28T09:00:00Z', 3), { exists: true, rev: 5, content }).outcome, 'already-synced');
    assert.equal(
      reconcilePeriodicRecoverySnapshot(snap('2026-09-28T09:00:00Z', 3), { exists: true, rev: 5, content: { ...content, quantity: '9' } }).outcome,
      'diverged'
    );
  });
});

describe('snapshot clearing is wired into every point where it stops being evidence', () => {
  const app = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url), 'utf8');

  it('after a confirmed row save', () => {
    assert.match(view, /setManualRowsSynced\(stamped\);[\s\S]{0,900}?clearPeriodicRecoverySnapshot\(activeBusinessId, rowKey\);/);
  });
  it('when the draft is cleared (discard / start over)', () => {
    assert.match(app, /await fsBatch\.commit\(\);\s*clearAllPeriodicRecoverySnapshots\(activeBusinessId\);/);
  });
  it('when a count is finalized (periodic draft deleted in recordStockCount)', () => {
    assert.match(app, /if \(type !== 'initial'\) clearAllPeriodicRecoverySnapshots\(businessId\);/);
  });
  it('when the operator deletes a row', () => {
    assert.match(app, /if \(outcome === 'done'\) \{[\s\S]{0,300}?clearPeriodicRecoverySnapshot\(activeBusinessId, believedKey\);/);
  });
  it('when a legacy row is migrated, only if the snapshot equals what was migrated', () => {
    assert.match(app, /if \(outcome === 'migrated'\) \{[\s\S]{0,1800}?snapshot\.content\.sellingPrice === migratedDoc\.sellingPrice[\s\S]{0,200}?clearPeriodicRecoverySnapshot\(activeBusinessId, legacyKey\)/);
  });
  it('resume discards tombstoned / earlier-lifecycle evidence BEFORE the (unchanged) four-case reconcile', () => {
    assert.match(view, /!serverItem && tombstonedKeys\.has\(rowKey\)[\s\S]{0,200}?isSnapshotFromEarlierLifecycle\(snapshot\.savedAt, serverItem\.firstWriteAt\)[\s\S]{0,300}?const outcome = reconcilePeriodicRecoverySnapshot\(/);
  });
  it('the captured evidence list is re-synced when snapshots disappear, without touching the finalization gate', () => {
    assert.match(view, /useEffect\(\(\) => \{\s*if \(!activeBusinessId\) return;\s*const keys = Object\.keys\(unresolvedRecoveryEvidence\);/);
    assert.match(view, /if \(Object\.keys\(unresolvedRecoveryEvidence\)\.length > 0\) \{\s*setError\(/);
  });
});
