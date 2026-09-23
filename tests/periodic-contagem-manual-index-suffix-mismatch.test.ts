// SABUSH BPT Contagem incident — demonstrating, with a concrete,
// minimal, executable example, whether the live-adoption effect's use
// of a raw Firestore document suffix (`manual:{N}`) as a live array
// index can write into the WRONG local row once `handleResumeDraft`'s
// own gap-compacting resume has run.
//
// This file does two things the prior investigation's tests did not:
//   1. It extracts the two relevant code blocks VERBATIM (byte-for-byte
//      logic, only renamed to be standalone functions) from their real
//      source locations, cited below, rather than a hand-written model
//      of the author's understanding of them. Any future edit to
//      either real block that changes its behavior will make the
//      corresponding extracted function here stale and worth
//      re-diffing against source — see each function's own header
//      comment for its exact origin.
//   2. It runs those extracted blocks against a small, concrete
//      fixture that deliberately has gaps (mirroring the real,
//      diagnostic-confirmed fact that this business's draft has
//      manualRowCount: 250 while the highest observed document suffix
//      is 259 — i.e. gaps genuinely exist), and asserts on the actual
//      resulting array contents — not merely on source text.
//
// This repository has no React/DOM harness (see
// stock-count-simplification.test.ts's own established precedent), so
// "extract the real logic into a standalone function and run it" is
// the closest available substitute to exercising the real code path.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-manual-index-suffix-mismatch.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

type DraftItem = { productName: string; quantity: string };
type WorkingRow = { productName: string; quantity: string };

const draftItemToWorkingRow = (item: DraftItem): WorkingRow => ({ ...item });

/**
 * VERBATIM (logic-for-logic) extraction of AppContext.tsx's
 * `periodicStockDraft` useMemo, lines 1414–1428 at HEAD a6b041f — the
 * part that sorts manual entries by their raw Firestore suffix and
 * builds the ordered `items` array `handleResumeDraft` then iterates.
 * Source:
 *   for (const [rowKey, item] of Object.entries(periodicStockDraftItemsByKey)) {
 *     if (rowKey.startsWith('manual:')) {
 *       const index = parseInt(rowKey.slice('manual:'.length), 10);
 *       if (Number.isFinite(index)) manualEntries.push({ index, item });
 *     }
 *   }
 *   manualEntries.sort((a, b) => a.index - b.index);
 */
function assembleSortedManualItems(byKey: Record<string, DraftItem>): { index: number; item: DraftItem }[] {
  const manualEntries: { index: number; item: DraftItem }[] = [];
  for (const [rowKey, item] of Object.entries(byKey)) {
    if (rowKey.startsWith('manual:')) {
      const index = parseInt(rowKey.slice('manual:'.length), 10);
      if (Number.isFinite(index)) manualEntries.push({ index, item });
    }
  }
  manualEntries.sort((a, b) => a.index - b.index);
  return manualEntries;
}

/**
 * VERBATIM (logic-for-logic) extraction of
 * PeriodicStockCountView.tsx's `handleResumeDraft`, lines 3828–3839 at
 * HEAD a6b041f — the manual-row half only (catalog handling omitted,
 * irrelevant here). Source:
 *   for (const item of periodicStockDraft.items) {
 *     const row: StockCountWorkingRow = draftItemToWorkingRow(item);
 *     if (item.productId) { ... } else { nextManualRows.push(row); }
 *   }
 */
function resumeManualRows(sortedManualItems: { index: number; item: DraftItem }[]): WorkingRow[] {
  const nextManualRows: WorkingRow[] = [];
  for (const { item } of sortedManualItems) {
    nextManualRows.push(draftItemToWorkingRow(item));
  }
  return nextManualRows;
}

/**
 * VERBATIM (logic-for-logic) extraction of
 * PeriodicStockCountView.tsx's live-adoption effect's manual-row
 * branch, lines 1640–1647 at HEAD a6b041f. Source:
 *   const index = parseInt(rowKey.slice('manual:'.length), 10);
 *   const existing = manualRows[index];
 *   if (!existing) continue;
 *   const candidate = draftItemToWorkingRow(item);
 *   if (JSON.stringify(...) === JSON.stringify(...)) continue;
 *   nextManualRows[index] = candidate;
 */
function applyLiveAdoptionUpdate(manualRows: WorkingRow[], rowKey: string, item: DraftItem): WorkingRow[] {
  const index = parseInt(rowKey.slice('manual:'.length), 10);
  const existing = manualRows[index];
  if (!existing) return manualRows; // "continue" — no local slot at this raw index
  const candidate = draftItemToWorkingRow(item);
  if (JSON.stringify(existing) === JSON.stringify(candidate)) return manualRows; // "continue" — no-op update
  const next = [...manualRows];
  next[index] = candidate;
  return next;
}

describe('Minimal example WITHOUT gaps — the mechanism is safe when every raw suffix is contiguous (0..N-1)', () => {
  it('a live-adoption update for a given raw key updates ONLY that same product\'s row, never a different one', () => {
    const byKey: Record<string, DraftItem> = {
      'manual:0': { productName: 'Arroz', quantity: '10' },
      'manual:1': { productName: 'Feijão', quantity: '5' },
      'manual:2': { productName: 'Açúcar', quantity: '3' },
    };
    const sorted = assembleSortedManualItems(byKey);
    const manualRows = resumeManualRows(sorted);
    // Local index 0 = 'manual:0' = Arroz here, no gaps, so the raw
    // suffix and the local position genuinely coincide.
    assert.deepEqual(manualRows.map((r) => r.productName), ['Arroz', 'Feijão', 'Açúcar']);

    const updated = applyLiveAdoptionUpdate(manualRows, 'manual:1', { productName: 'Feijão Preto', quantity: '7' });
    assert.equal(updated[0].productName, 'Arroz', 'row 0 untouched');
    assert.equal(updated[1].productName, 'Feijão Preto', 'the CORRECT row was updated');
    assert.equal(updated[2].productName, 'Açúcar', 'row 2 untouched');
  });
});

describe('Minimal example WITH a gap — reproducing the mismatch that explains the incident', () => {
  it('demonstrates: after resume compacts away a gap, a live-adoption update addressed to one Firestore document silently overwrites a DIFFERENT, unrelated local row', () => {
    // Mirrors the real, diagnostic-confirmed shape of this incident in
    // miniature: manual:0 and manual:1 exist; manual:2 was deleted at
    // some point (its document is simply gone — a real gap, not
    // present in periodicStockDraftItemsByKey at all); manual:3
    // ('Trigo', standing in for the real manual:259) is the most
    // recently added row.
    const byKey: Record<string, DraftItem> = {
      'manual:0': { productName: 'Arroz', quantity: '10' },
      'manual:1': { productName: 'Feijão', quantity: '5' },
      // 'manual:2' intentionally absent — the gap.
      'manual:3': { productName: 'Trigo', quantity: '50' },
    };
    const sorted = assembleSortedManualItems(byKey);
    const manualRows = resumeManualRows(sorted);

    // The compacted array has only 3 entries (0, 1, 2) — Trigo, whose
    // RAW suffix is 3, ends up at LOCAL index 2, because the gap at
    // raw suffix 2 was compacted away.
    assert.equal(manualRows.length, 3, 'resume compacts the gap away — 3 rows, not 4');
    assert.equal(manualRows[2].productName, 'Trigo', 'Trigo now lives at LOCAL index 2, not its own raw suffix 3');

    // Now: a live-adoption update arrives for a COMPLETELY DIFFERENT,
    // pre-existing Firestore document — say the operator (or a
    // dormant second device) had, at some earlier point, also created
    // and abandoned a document at raw key 'manual:2' with a blank
    // name (an incomplete "Adicionar produto" attempt never
    // completed) — a document Trigo's own resume never saw locally
    // because it wasn't in periodicStockDraft.items at THIS resume
    // (e.g. it arrived in the SAME snapshot but sorted after
    // manual:1, i.e. exactly where manual:2 numerically belongs — or
    // was created moments after this resume ran and delivered via the
    // live listener afterward). Either way, its RAW suffix (2)
    // coincides with Trigo's LOCAL array position (2, due to
    // compaction) purely by numeric coincidence.
    const collidingUpdate: DraftItem = { productName: '', quantity: '' };
    const afterUpdate = applyLiveAdoptionUpdate(manualRows, 'manual:2', collidingUpdate);

    // THE DEFECT, DEMONSTRATED: this update was never meant for
    // Trigo's row at all — it targets raw key 'manual:2', a document
    // Trigo never held — yet because manual:2's raw suffix equals
    // Trigo's LOCAL index after compaction, Trigo's row is silently
    // replaced with the blank-named row instead.
    assert.equal(afterUpdate[2].productName, '', 'THE BUG: Trigo\'s slot was overwritten by an unrelated document\'s content');
    assert.notEqual(afterUpdate[2].productName, 'Trigo', 'Trigo is gone from this local slot');
    assert.equal(afterUpdate[0].productName, 'Arroz', 'unrelated rows are untouched');
    assert.equal(afterUpdate[1].productName, 'Feijão', 'unrelated rows are untouched');
  });

  it('demonstrates the exact downstream symptom: a blank-named row, once produced this way, disappears from BOTH tallyStockCountRows buckets — reproducing "present at resume, absent from PDF, absent from search" precisely', () => {
    // Same tallyStockCountRows inclusion rule as
    // apps/tenant/src/utils/stockCount.ts lines 463-465 — the ONE
    // gate that runs before either the counted or not-counted bucket:
    //   const trimmedName = row.productName.trim();
    //   if (!trimmedName) continue;
    const wouldBeSkippedByTally = (row: WorkingRow) => row.productName.trim() === '';

    const corruptedTrigoRow: WorkingRow = { productName: '', quantity: '50' };
    assert.equal(
      wouldBeSkippedByTally(corruptedTrigoRow),
      true,
      'a blank-named row is skipped before EITHER counted-items or not-counted-names is populated — invisible in both PDF tables, exactly as reported'
    );
  });

  it('confirms this is NOT the same mechanism as the already-fixed same-index-collision bug (8af59b8): that fix protects against TWO CLICKS computing the same target index from a stale closure. This defect is different — it is a genuine document existing at raw suffix N, and a genuine, unrelated row existing at local position N, both real and valid on their own, colliding only because compaction makes those two numbers diverge', () => {
    // No new assertion — documents the distinction for anyone
    // reviewing this test file, since both defects involve "two
    // things landing on the same index" and could otherwise be
    // conflated.
    assert.ok(true);
  });
});
