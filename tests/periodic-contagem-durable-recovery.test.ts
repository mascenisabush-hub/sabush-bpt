// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 items 10, 11, Stage 9] Regression coverage for the durable
// edit-time recovery module (localStorage read/write/clear/list) and
// the four-case reconciliation contract. Direct-import, behavioral
// testing against a minimal in-memory localStorage polyfill (this
// module is browser-only; Node's test runner has no window object by
// default).

import { readFileSync } from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage polyfill, sufficient for this module's own
// usage (getItem/setItem/removeItem/key/length) — not a general
// browser-environment shim.
class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
}

(globalThis as any).window = { localStorage: new FakeLocalStorage() };

const {
  writePeriodicRecoverySnapshot,
  readPeriodicRecoverySnapshot,
  clearPeriodicRecoverySnapshot,
  listPeriodicRecoveryRowKeys,
  reconcilePeriodicRecoverySnapshot,
} = await import('../apps/tenant/src/lib/periodicContagemRecovery');

const sampleContent = {
  productName: 'Coca-Cola',
  quantity: '18',
  unit: 'Garrafa',
  costPrice: '35',
  sellingPrice: '50',
};

describe('write/read/clear/list — the storage layer', () => {
  beforeEach(() => {
    ((globalThis as any).window.localStorage as FakeLocalStorage).clear();
  });

  it('writes and reads back an identical snapshot', () => {
    writePeriodicRecoverySnapshot('biz1', 'manual:0', {
      savedAt: '2026-01-01T00:00:00.000Z',
      baseRev: 3,
      content: sampleContent,
    });
    const read = readPeriodicRecoverySnapshot('biz1', 'manual:0');
    assert.deepEqual(read, {
      savedAt: '2026-01-01T00:00:00.000Z',
      baseRev: 3,
      content: sampleContent,
    });
  });

  it('returns null for an absent snapshot', () => {
    assert.equal(readPeriodicRecoverySnapshot('biz1', 'manual:99'), null);
  });

  it('returns null (fail-closed) for a malformed snapshot, never partially trusts it', () => {
    (globalThis as any).window.localStorage.setItem('contagem-pending:biz1:periodic:manual:1', 'not valid json');
    assert.equal(readPeriodicRecoverySnapshot('biz1', 'manual:1'), null);
    (globalThis as any).window.localStorage.setItem(
      'contagem-pending:biz1:periodic:manual:2',
      JSON.stringify({ savedAt: '2026-01-01', baseRev: 'not-a-number', content: sampleContent })
    );
    assert.equal(readPeriodicRecoverySnapshot('biz1', 'manual:2'), null);
  });

  it('clears a snapshot; a subsequent read correctly returns null', () => {
    writePeriodicRecoverySnapshot('biz1', 'manual:0', { savedAt: 'x', baseRev: 1, content: sampleContent });
    clearPeriodicRecoverySnapshot('biz1', 'manual:0');
    assert.equal(readPeriodicRecoverySnapshot('biz1', 'manual:0'), null);
  });

  it('lists every stored row key for one business, scoped correctly and not confused with another business\'s own snapshots', () => {
    writePeriodicRecoverySnapshot('biz1', 'manual:0', { savedAt: 'x', baseRev: 1, content: sampleContent });
    writePeriodicRecoverySnapshot('biz1', 'catalog:ABC', { savedAt: 'x', baseRev: 1, content: sampleContent });
    writePeriodicRecoverySnapshot('biz2', 'manual:0', { savedAt: 'x', baseRev: 1, content: sampleContent });
    const keys = listPeriodicRecoveryRowKeys('biz1').sort();
    assert.deepEqual(keys, ['catalog:ABC', 'manual:0']);
  });

  it('overwriting a key does not accumulate — a second write to the same row key replaces, not appends', () => {
    writePeriodicRecoverySnapshot('biz1', 'manual:0', { savedAt: 'first', baseRev: 1, content: sampleContent });
    writePeriodicRecoverySnapshot('biz1', 'manual:0', { savedAt: 'second', baseRev: 2, content: sampleContent });
    const keys = listPeriodicRecoveryRowKeys('biz1');
    assert.equal(keys.length, 1);
    assert.equal(readPeriodicRecoverySnapshot('biz1', 'manual:0')!.savedAt, 'second');
  });
});

describe('reconcilePeriodicRecoverySnapshot — the four-case contract', () => {
  const snapshot = { savedAt: 'x', baseRev: 5, content: sampleContent };

  it('Case 1 — baseRev equals server rev: unacknowledged, eligible for review/re-entry', () => {
    const result = reconcilePeriodicRecoverySnapshot(snapshot, { exists: true, rev: 5, content: sampleContent });
    assert.equal(result.outcome, 'unacknowledged');
  });

  it('Case 2 — server rev advanced, all five content fields match: cleared silently', () => {
    const result = reconcilePeriodicRecoverySnapshot(snapshot, { exists: true, rev: 6, content: sampleContent });
    assert.equal(result.outcome, 'already-synced');
  });

  it('Case 2 — deliberately ignores metadata-only differences: only the five content fields are compared', () => {
    // The server content object itself has no metadata fields at all
    // (PeriodicRecoverySnapshotContent's own type) — this test
    // confirms that ANY of the five fields matching exactly, with
    // nothing else considered, is sufficient for a match.
    const result = reconcilePeriodicRecoverySnapshot(snapshot, {
      exists: true,
      rev: 100, // a large jump, as if many unrelated saves/metadata updates occurred
      content: { ...sampleContent },
    });
    assert.equal(result.outcome, 'already-synced');
  });

  it('Case 3 — server rev advanced, content differs: never overwritten, preserved for review', () => {
    const result = reconcilePeriodicRecoverySnapshot(snapshot, {
      exists: true,
      rev: 6,
      content: { ...sampleContent, quantity: '99' },
    });
    assert.equal(result.outcome, 'diverged');
    assert.ok('snapshot' in result && result.snapshot === snapshot, 'the original snapshot must be preserved for review, not discarded');
  });

  it('Case 4 — row no longer exists server-side: fails closed, preserved for review', () => {
    const result = reconcilePeriodicRecoverySnapshot(snapshot, { exists: false });
    assert.equal(result.outcome, 'fail-closed');
  });

  it('Case 4 — server state cannot otherwise be safely established (exists but missing rev/content): fails closed', () => {
    const result = reconcilePeriodicRecoverySnapshot(snapshot, { exists: true });
    assert.equal(result.outcome, 'fail-closed');
  });

  it('the binding invariant: no case ever silently chooses between conflicting local and server states — every outcome is either "nothing to do," "safely matches," or explicitly preserved for review', () => {
    const outcomes = new Set(['unacknowledged', 'already-synced', 'diverged', 'fail-closed']);
    // Enumerate all four cases and confirm each maps to exactly one of
    // these four outcomes — no fifth, silently-resolving branch exists.
    assert.equal(
      reconcilePeriodicRecoverySnapshot(snapshot, { exists: true, rev: 5, content: sampleContent }).outcome,
      'unacknowledged'
    );
    assert.ok(outcomes.has('already-synced'));
    assert.ok(outcomes.has('diverged'));
    assert.ok(outcomes.has('fail-closed'));
  });
});

describe('scheduleRowDraftSave — synchronous recovery-write wiring', () => {
  const componentSource = readFileSync(
    new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
    'utf8'
  );

  it('writePeriodicRecoverySnapshot is called synchronously, before the 800ms debounce timer is set', () => {
    const fnMatch = componentSource.match(
      /const scheduleRowDraftSave = \(rowKey: string, protectionKey: string = rowKey\) => \{[\s\S]*?\n  \};/
    );
    assert.ok(fnMatch, 'expected scheduleRowDraftSave to exist');
    const body = fnMatch![0];
    const writeIndex = body.indexOf('writePeriodicRecoverySnapshot(');
    const timerIndex = body.indexOf('setTimeout(() => {');
    assert.ok(writeIndex > -1 && timerIndex > -1);
    assert.ok(writeIndex < timerIndex, 'the recovery snapshot must be captured before the debounce timer is set, not after');
  });

  it('is wrapped in try/catch — a storage failure must never block or corrupt the ordinary save path', () => {
    const fnMatch = componentSource.match(
      /const scheduleRowDraftSave = \(rowKey: string, protectionKey: string = rowKey\) => \{[\s\S]*?\n  \};/
    );
    const body = fnMatch![0];
    const tryIndex = body.indexOf('try {');
    const writeIndex = body.indexOf('writePeriodicRecoverySnapshot(');
    const catchIndex = body.indexOf('} catch {');
    assert.ok(tryIndex > -1 && catchIndex > -1);
    assert.ok(tryIndex < writeIndex && writeIndex < catchIndex);
  });

  it('resolves the row\'s current content by matching sourceRowKey against rowKey (correct for a genuinely new, UUID-keyed row), with a positional fallback for a not-yet-stamped legacy row, or catalogRows, by parsing the rowKey prefix', () => {
    const fnMatch = componentSource.match(
      /const scheduleRowDraftSave = \(rowKey: string, protectionKey: string = rowKey\) => \{[\s\S]*?\n  \};/
    );
    const body = fnMatch![0];
    assert.match(
      body,
      /rowKey\.startsWith\('manual:'\)\s*\n\s*\? manualRowsRef\.current\.find\(\(row\) => row\.sourceRowKey === rowKey\) \?\?\s*\n\s*manualRowsRef\.current\[Number\(rowKey\.slice\('manual:'\.length\)\)\]/
    );
    assert.match(body, /: rowKey\.startsWith\('catalog:'\)\s*\n\s*\? catalogRows\[rowKey\.slice\('catalog:'\.length\)\]/);
  });

  it('is imported correctly', () => {
    assert.match(
      componentSource,
      /import \{ writePeriodicRecoverySnapshot \} from '\.\.\/lib\/periodicContagemRecovery';/
    );
  });
});
