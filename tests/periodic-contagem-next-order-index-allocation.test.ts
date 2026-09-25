// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §1 items 2, 3] Regression coverage for allocatePeriodicOrderIndex —
// the transactionally-coordinated per-draft counter that replaces the
// confirmed-insufficient local useRef precedent
// (entrySequenceRef/sellingPriceEditSequenceRef) for cross-client-safe
// orderIndex allocation. Source-text based, following this
// repository's own established convention (no Firestore emulator
// available in this environment) — proves the source contains the
// correct transactional structure, not runtime concurrent-client
// behavior, which remains an explicit, named completion gate for this
// Expanded Phase 2 authorization, not something this test claims to
// demonstrate.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf8'
);

describe('allocatePeriodicOrderIndex — transactional nextOrderIndex allocation', () => {
  const fnMatch = appContextSource.match(
    /const allocatePeriodicOrderIndex = async \(\): Promise<number> => \{[\s\S]*?\n  \};/
  );

  it('exists with the documented signature', () => {
    assert.ok(fnMatch, 'expected allocatePeriodicOrderIndex to exist');
  });

  it('reads nextOrderIndex inside a genuine Firestore transaction, not a plain read', () => {
    assert.match(fnMatch![0], /return runTransaction\(db, async \(tx\) => \{/);
    assert.match(fnMatch![0], /const metaSnap = await tx\.get\(metaRef\);/);
  });

  it('defaults to 0 when nextOrderIndex is absent, per its documented default', () => {
    assert.match(fnMatch![0], /const current = metaSnap\.data\(\)\.nextOrderIndex \?\? 0;/);
  });

  it('increments transactionally, in the same commit as the read, and merges rather than replacing the meta document', () => {
    assert.match(
      fnMatch![0],
      /tx\.set\(metaRef, \{ nextOrderIndex: current \+ 1 \}, \{ merge: true \}\);/
    );
  });

  it('returns the pre-increment value — the value this specific caller is allocated, not the post-increment counter state', () => {
    assert.match(fnMatch![0], /return current;\s*\n\s*\}\);/);
  });

  it('never decrements — no subtraction on nextOrderIndex appears anywhere in this function, consistent with the "retired identity never reused" principle', () => {
    assert.doesNotMatch(fnMatch![0], /nextOrderIndex.*-\s*1/);
    assert.doesNotMatch(fnMatch![0], /current\s*-\s*1/);
  });

  it('rejects when the draft is not active (meta document absent), consistent with savePeriodicStockDraftItem\'s own first-write guard', () => {
    assert.match(
      fnMatch![0],
      /if \(!metaSnap\.exists\(\)\) \{\s*\n\s*throw new Error\('Esta Contagem já não está ativa — a alteração não foi guardada\.'\);/
    );
  });

  it('checks authorization (isActiveContagemEditor) before ever opening a transaction, matching every other periodic write function\'s own guard', () => {
    const preTransaction = fnMatch![0].split('return runTransaction')[0];
    assert.match(preTransaction, /if \(!isActiveContagemEditor\) \{/);
  });

  it('is declared in the context interface with the correct signature', () => {
    assert.match(appContextSource, /allocatePeriodicOrderIndex: \(\) => Promise<number>;/);
  });

  it('is exposed through the actual context value, alongside savePeriodicStockDraftItem', () => {
    assert.match(
      appContextSource,
      /savePeriodicStockDraftItem,\s*\n\s*allocatePeriodicOrderIndex,\s*\n\s*migratePeriodicLegacyManualRow,\s*\n\s*resolvePeriodicConflict,/
    );
  });
});
