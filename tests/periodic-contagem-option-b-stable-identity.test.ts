// SABUSH BPT Contagem incident — Option B regression tests, per the
// authorized package: gap scenario with stable-key lookup, identity
// preservation across compaction, backward compatibility with no key,
// mixed draft, and identity survival across a removal-triggered
// reindex. Companion to
// tests/periodic-contagem-manual-index-suffix-mismatch.test.ts, which
// demonstrated the PRE-fix defect; this file demonstrates the fix
// closes it, using the same extraction-from-real-source convention
// (see that file's own header for the full rationale).
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-option-b-stable-identity.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

type DraftItem = { productName: string; quantity: string };
type WorkingRow = { productName: string; quantity: string; sourceRowKey?: string };

const draftItemToWorkingRow = (item: DraftItem): WorkingRow => ({ ...item });

/**
 * VERBATIM (logic-for-logic) extraction of the FIXED
 * handleResumeDraft manual-row assembly, PeriodicStockCountView.tsx —
 * builds sorted manual entries from the raw byKey map (retaining each
 * item's own key) and stamps sourceRowKey on each resulting row.
 */
function resumeManualRowsFixed(byKey: Record<string, DraftItem>): WorkingRow[] {
  const manualEntries: { index: number; rowKey: string; item: DraftItem }[] = [];
  for (const [rowKey, item] of Object.entries(byKey)) {
    if (rowKey.startsWith('manual:')) {
      const index = parseInt(rowKey.slice('manual:'.length), 10);
      if (Number.isFinite(index)) manualEntries.push({ index, rowKey, item });
    }
  }
  manualEntries.sort((a, b) => a.index - b.index);
  return manualEntries.map(({ rowKey, item }) => ({ ...draftItemToWorkingRow(item), sourceRowKey: rowKey }));
}

/**
 * VERBATIM (logic-for-logic) extraction of the FIXED live-adoption
 * effect's manual-row branch — matches by sourceRowKey instead of a
 * raw-suffix-as-array-index lookup.
 */
function applyLiveAdoptionUpdateFixed(manualRows: WorkingRow[], rowKey: string, item: DraftItem): WorkingRow[] {
  const existingIdx = manualRows.findIndex((r) => r.sourceRowKey === rowKey);
  if (existingIdx === -1) return manualRows; // "continue" — no local row carries this key yet
  const existing = manualRows[existingIdx];
  const candidate: WorkingRow = { ...draftItemToWorkingRow(item), sourceRowKey: rowKey };
  if (JSON.stringify(existing) === JSON.stringify(candidate)) return manualRows; // "continue" — no-op
  const next = [...manualRows];
  next[existingIdx] = candidate;
  return next;
}

/**
 * VERBATIM (logic-for-logic) extraction of the FIXED
 * handleRemoveManualRow reindex step — filters out the removed row,
 * then stamps every SHIFTED row's sourceRowKey to its new target key
 * in the same synchronous step.
 */
function removeManualRowFixed(manualRows: WorkingRow[], removeIndex: number): WorkingRow[] {
  return manualRows
    .filter((_, i) => i !== removeIndex)
    .map((row, i) => (i >= removeIndex ? { ...row, sourceRowKey: `manual:${i}` } : row));
}

describe('Option B — gap scenario, stable-key lookup: the pre-fix cross-contamination no longer occurs', () => {
  it('the exact fixture from periodic-contagem-manual-index-suffix-mismatch.test.ts, now with the fix applied: an update to an unrelated document no longer touches Trigo\'s row', () => {
    const byKey: Record<string, DraftItem> = {
      'manual:0': { productName: 'Arroz', quantity: '10' },
      'manual:1': { productName: 'Feijão', quantity: '5' },
      // 'manual:2' intentionally absent — the same gap as before.
      'manual:3': { productName: 'Trigo', quantity: '50' },
    };
    const manualRows = resumeManualRowsFixed(byKey);
    assert.equal(manualRows.length, 3);
    assert.equal(manualRows[2].productName, 'Trigo');
    assert.equal(manualRows[2].sourceRowKey, 'manual:3', 'Trigo correctly remembers its OWN raw key, not its local position');

    // The same colliding update as the pre-fix test: an unrelated
    // document happens to exist at raw key 'manual:2' (numerically
    // equal to Trigo's LOCAL position, purely by coincidence).
    const collidingUpdate: DraftItem = { productName: '', quantity: '' };
    const afterUpdate = applyLiveAdoptionUpdateFixed(manualRows, 'manual:2', collidingUpdate);

    // THE FIX, DEMONSTRATED: no local row carries sourceRowKey
    // 'manual:2' (nothing does, in this fixture), so this update is
    // correctly ignored — Trigo is untouched.
    assert.equal(afterUpdate, manualRows, 'no matching row found — update correctly ignored, array reference unchanged');
    assert.equal(afterUpdate[2].productName, 'Trigo', 'Trigo is NOT overwritten — the defect is closed');
  });

  it('an update addressed to Trigo\'s OWN real key still correctly updates it', () => {
    const byKey: Record<string, DraftItem> = {
      'manual:0': { productName: 'Arroz', quantity: '10' },
      'manual:3': { productName: 'Trigo', quantity: '50' },
    };
    const manualRows = resumeManualRowsFixed(byKey);
    const updated = applyLiveAdoptionUpdateFixed(manualRows, 'manual:3', { productName: 'Trigo', quantity: '60' });
    assert.equal(updated[1].productName, 'Trigo');
    assert.equal(updated[1].quantity, '60', 'a genuine update to Trigo\'s own key still applies correctly');
    assert.equal(updated[1].sourceRowKey, 'manual:3');
  });
});

describe('Option B — row identity preserved across compaction, independent of local array position', () => {
  it('every row\'s sourceRowKey equals its own raw suffix, regardless of how many gaps precede it', () => {
    const byKey: Record<string, DraftItem> = {
      'manual:5': { productName: 'A', quantity: '1' },
      'manual:100': { productName: 'B', quantity: '2' },
      'manual:259': { productName: 'Trigo', quantity: '50' },
    };
    const manualRows = resumeManualRowsFixed(byKey);
    assert.deepEqual(
      manualRows.map((r) => r.sourceRowKey),
      ['manual:5', 'manual:100', 'manual:259'],
      'each row remembers its OWN true key, not 0/1/2'
    );
  });
});

describe('Option B — backward compatibility: a draft with no sourceRowKey on any row', () => {
  it('a row with no sourceRowKey (simulating a draft resumed before this fix existed) is simply never matched by the live-adoption effect — no crash, no incorrect match', () => {
    const legacyRows: WorkingRow[] = [
      { productName: 'Arroz', quantity: '10' }, // no sourceRowKey — as if resumed pre-fix
    ];
    const result = applyLiveAdoptionUpdateFixed(legacyRows, 'manual:0', { productName: 'Arroz Novo', quantity: '99' });
    assert.equal(result, legacyRows, 'nothing matched — reference unchanged, exactly like the pre-fix code\'s own (!existing) safety branch');
  });
});

describe('Option B — mixed draft: some rows stamped, some not', () => {
  it('stamped rows are correctly matched; unstamped rows are safely skipped; neither affects the other', () => {
    const mixedRows: WorkingRow[] = [
      { productName: 'Arroz', quantity: '10' }, // legacy, no key
      { productName: 'Trigo', quantity: '50', sourceRowKey: 'manual:259' }, // fixed, stamped
    ];
    // Update targets the unstamped row's Firestore key — must not match it (it has no key to match against).
    const afterUnrelated = applyLiveAdoptionUpdateFixed(mixedRows, 'manual:0', { productName: 'Arroz Novo', quantity: '99' });
    assert.equal(afterUnrelated, mixedRows, 'legacy row not matched — safe no-op, not a false match');

    // Update targets Trigo's own real key — must match correctly, and must not touch the legacy row.
    const afterTrigo = applyLiveAdoptionUpdateFixed(mixedRows, 'manual:259', { productName: 'Trigo', quantity: '55' });
    assert.equal(afterTrigo[0].productName, 'Arroz', 'legacy row untouched');
    assert.equal(afterTrigo[1].quantity, '55', 'stamped row correctly updated');
  });
});

describe('Option B — identity survives a removal-triggered reindex', () => {
  it('Trigo moving from local position 2 to 1 after an earlier row is removed: its sourceRowKey is updated to match its NEW real Firestore key, and a subsequent live-adoption update addressed to that new key still finds it', () => {
    const beforeRemoval: WorkingRow[] = [
      { productName: 'Arroz', quantity: '10', sourceRowKey: 'manual:0' },
      { productName: 'Feijão', quantity: '5', sourceRowKey: 'manual:1' },
      { productName: 'Trigo', quantity: '50', sourceRowKey: 'manual:2' },
    ];
    // Remove 'Arroz' (local index 0) — Feijão and Trigo shift down one position.
    const afterRemoval = removeManualRowFixed(beforeRemoval, 0);
    assert.equal(afterRemoval.length, 2);
    assert.equal(afterRemoval[0].productName, 'Feijão');
    assert.equal(afterRemoval[0].sourceRowKey, 'manual:0', 'Feijão now correctly saves to manual:0, matching its NEW real Firestore document');
    assert.equal(afterRemoval[1].productName, 'Trigo');
    assert.equal(
      afterRemoval[1].sourceRowKey,
      'manual:1',
      'THE CORRECTED BEHAVIOR: Trigo\'s sourceRowKey is updated to manual:1, matching the real reindex-triggered save (handleRemoveManualRow rewrites Trigo\'s content to manual:1 and deletes the old manual:2) — a stale "manual:2" here would break the very mechanism this fix relies on'
    );

    // A live-adoption update now arrives for Trigo's NEW real key.
    const afterUpdate = applyLiveAdoptionUpdateFixed(afterRemoval, 'manual:1', { productName: 'Trigo', quantity: '52' });
    assert.equal(afterUpdate[1].productName, 'Trigo');
    assert.equal(afterUpdate[1].quantity, '52', 'the update correctly finds Trigo under its NEW key after the reindex');
  });
});
