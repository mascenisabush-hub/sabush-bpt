// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §1 items 5, 7, 11; Stage 5] Regression coverage for
// deletePeriodicManualRow (tombstone-coordinated, deletion-redirect
// deletion) and the two draft-lifecycle-endpoint cleanup extensions
// (clearPeriodicStockDraft, recordStockCount's finalization cleanup).
// Source-text based, following this repository's own established
// convention — no Firestore emulator available in this environment.
// Genuine concurrent-deletion/migration-race behavior remains an
// explicit, separately-named completion gate, not claimed
// demonstrated here.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf8'
);

const fnMatch = appContextSource.match(
  /const deletePeriodicManualRow = async \(believedKey: string\): Promise<'deleted' \| 'ambiguous'> => \{[\s\S]*?\n  \};/
);

describe('deletePeriodicManualRow — coordinated, tombstone-writing deletion', () => {
  it('exists with the documented signature', () => {
    assert.ok(fnMatch, 'expected deletePeriodicManualRow to exist');
  });

  const body = fnMatch ? fnMatch[0] : '';

  it('is additive: removePeriodicStockDraftItem still exists unchanged, both coexist', () => {
    assert.match(
      appContextSource,
      /const removePeriodicStockDraftItem = async \(rowKey: string\) => \{\s*\n\s*if \(!activeBusinessId\) return;\s*\n\s*await deleteDoc\(doc\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic', 'items', rowKey\)\);/
    );
  });

  it('the ordinary case deletes the row and writes its tombstone atomically, in the same transaction', () => {
    assert.match(
      body,
      /if \(rowSnap\.exists\(\)\) \{\s*\n\s*tx\.delete\(rowRef\(believedKey\)\);\s*\n\s*tx\.set\(tombstoneRef\(believedKey\), writeTombstone\(believedKey\)\);\s*\n\s*return 'done' as const;/
    );
  });

  it('repeated deletion is idempotent: an existing tombstone is recognized and no second write occurs', () => {
    assert.match(
      body,
      /const existingTombstone = await tx\.get\(tombstoneRef\(believedKey\)\);\s*\n\s*if \(existingTombstone\.exists\(\)\) \{\s*\n\s*return 'done' as const; \/\/ Already deleted — idempotent no-op\./
    );
  });

  it('redirects to the migrated destination when the believed key has been relocated, using a candidate verified by direct reference, never trusted from the outer query alone', () => {
    assert.match(body, /const candidateSnap = await tx\.get\(rowRef\(candidateMigratedKey\)\);/);
    assert.match(
      body,
      /if \(candidateSnap\.exists\(\) && candidateSnap\.data\(\)\.migratedFromLegacyKey === believedKey\) \{\s*\n\s*tx\.delete\(rowRef\(candidateMigratedKey\)\);\s*\n\s*tx\.set\(tombstoneRef\(candidateMigratedKey\), writeTombstone\(candidateMigratedKey, believedKey\)\);/
    );
  });

  it('the redirected tombstone records redirectedFrom, distinguishing a redirect from an ordinary deletion', () => {
    assert.match(
      body,
      /const writeTombstone = \(key: string, redirectedFrom\?: string\) => \(\{\s*\n\s*deletedAt: new Date\(\)\.toISOString\(\),\s*\n\s*deletedByUid: currentUser\.uid,\s*\n\s*\.\.\.\(redirectedFrom \? \{ redirectedFrom \} : \{\}\),/
    );
  });

  it('a stale candidate (changed since the outer query) triggers a retry with a fresh query, never a blind apply', () => {
    assert.match(
      body,
      /\/\/ Candidate no longer matches — someone changed it since\s*\n\s*\/\/ Step A\. Retry with a fresh query rather than trusting it\.\s*\n\s*return 'retry' as const;/
    );
  });

  it('genuinely ambiguous state (neither row, tombstone, nor candidate) fails closed, never guesses', () => {
    assert.match(body, /return 'ambiguous' as const;/);
  });

  it('the retry loop is bounded, not infinite', () => {
    assert.match(body, /const MAX_ATTEMPTS = 3;/);
    assert.match(body, /for \(let attempt = 0; attempt < MAX_ATTEMPTS; attempt\+\+\) \{/);
    assert.match(body, /return 'ambiguous';\s*\n\s*\};?\s*$/);
  });

  it('never uses tx.get with a query argument — confirmed compatible with the actual client SDK', () => {
    assert.doesNotMatch(body, /tx\.get\(query\(/);
  });

  it('checks authorization before ever attempting a deletion', () => {
    const preLoop = body.split('const MAX_ATTEMPTS')[0];
    assert.match(preLoop, /if \(!isActiveContagemEditor\) \{/);
  });

  it('is declared in the interface and exposed through the context value, alongside removePeriodicStockDraftItem', () => {
    assert.match(
      appContextSource,
      /deletePeriodicManualRow: \(believedKey: string\) => Promise<'deleted' \| 'ambiguous'>;\s*\n\s*removePeriodicStockDraftItem: \(rowKey: string\) => Promise<void>;/
    );
    assert.match(
      appContextSource,
      /deletePeriodicManualRow,\s*\n\s*removePeriodicStockDraftItem,/
    );
  });
});

describe('Tombstone cleanup at draft-lifecycle endpoints', () => {
  it('clearPeriodicStockDraft ("Começar de novo") also enumerates and deletes the tombstones subcollection, in the same atomic batch as items', () => {
    const fnBody = appContextSource.match(
      /const clearPeriodicStockDraft = async \(\) => \{[\s\S]*?\n  \};/
    );
    assert.ok(fnBody, 'expected clearPeriodicStockDraft to exist');
    assert.match(
      fnBody![0],
      /const tombstonesSnap = await getDocs\(\s*\n\s*collection\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic', 'tombstones'\)\s*\n\s*\);\s*\n\s*tombstonesSnap\.forEach\(\(tombstoneDoc\) => fsBatch\.delete\(tombstoneDoc\.ref\)\);/
    );
    // Confirm the tombstone deletion is added to the SAME batch that
    // is committed once, atomically — not a separate operation.
    const commitIndex = fnBody![0].indexOf('await fsBatch.commit()');
    const tombstoneIndex = fnBody![0].indexOf('tombstonesSnap.forEach');
    assert.ok(tombstoneIndex > -1 && tombstoneIndex < commitIndex, 'tombstone deletion must be part of the same batch, before the single commit');
  });

  it('recordStockCount\'s finalization cleanup also enumerates and deletes tombstones, in the same batch as items and the meta document', () => {
    assert.match(
      appContextSource,
      /const periodicTombstonesSnap = await getDocs\(\s*\n\s*collection\(db, 'businesses', businessId, 'stockCountDrafts', 'periodic', 'tombstones'\)\s*\n\s*\);\s*\n\s*periodicTombstonesSnap\.forEach\(\(tombstoneDoc\) => fsBatch\.delete\(tombstoneDoc\.ref\)\);/
    );
  });

  it('no time-based/expiry cleanup exists anywhere — only the two draft-lifecycle-endpoint sites delete tombstones', () => {
    const allTombstoneDeletes = [...appContextSource.matchAll(/tombstoneDoc\.ref\)\)/g)];
    assert.equal(allTombstoneDeletes.length, 2, 'expected exactly two tombstone-cleanup sites: clearPeriodicStockDraft and finalization');
    assert.doesNotMatch(appContextSource, /setTimeout.*tombstone/i);
    assert.doesNotMatch(appContextSource, /setInterval.*tombstone/i);
  });
});
