// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §1 item 4; Stage 4] Regression coverage for
// migratePeriodicLegacyManualRow — the resumable, per-row-transactional,
// fail-closed migration of a legacy manual:{index}-keyed row to its
// stable destination identity. Source-text based, following this
// repository's own established convention (no Firestore emulator
// available in this environment) — proves the source contains the
// correct structure and logic for every required case, not runtime
// Firestore concurrency behavior, which remains an explicit,
// separately-named completion gate, not claimed demonstrated here.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf8'
);

const fnMatch = appContextSource.match(
  /const migratePeriodicLegacyManualRow = async \(legacyKey: string\): Promise<PeriodicMigrationOutcome> => \{[\s\S]*?\n  \};/
);

describe('migratePeriodicLegacyManualRow — legacy manual-row migration', () => {
  it('exists with the documented signature', () => {
    assert.ok(fnMatch, 'expected migratePeriodicLegacyManualRow to exist');
  });

  const body = fnMatch ? fnMatch[0] : '';

  it('Test 1/8 — derives the destination key deterministically from the exact legacy key alone', () => {
    assert.match(
      appContextSource,
      /const deriveMigratedDestinationKey = \(legacyKey: string\): string => `manual:migrated-\$\{legacyKey\.slice\('manual:'\.length\)\}`;/
    );
  });

  it('Test 2 — derives orderIndex from the legacy numeric suffix, e.g. manual:17 -> 17', () => {
    assert.match(
      appContextSource,
      /const parseLegacyOrderIndex = \(legacyKey: string\): number => \{\s*\n\s*const suffix = legacyKey\.slice\('manual:'\.length\);\s*\n\s*const parsed = Number\(suffix\);\s*\n\s*return Number\.isFinite\(parsed\) \? parsed : 0;/
    );
  });

  it('Test 3/4 — the ordinary migration write spreads the full legacy content, then adds migratedFromLegacyKey and orderIndex', () => {
    assert.match(
      body,
      /tx\.set\(destinationRef, \{\s*\n\s*\.\.\.legacyData,\s*\n\s*migratedFromLegacyKey: legacyKey,\s*\n\s*orderIndex,\s*\n\s*\}\);/
    );
  });

  it('Test 5 — idempotent when the destination already exists with matching provenance: finishes the remaining delete, does not re-write content', () => {
    assert.match(
      body,
      /if \(destData\.migratedFromLegacyKey === legacyKey\) \{[\s\S]{0,400}?tx\.delete\(legacyRef\);\s*\n\s*return 'migrated';/
    );
  });

  it('Test 6 — Case A: legacy absent, matching destination provenance -> already-migrated, no duplicate write', () => {
    assert.match(body, /\/\/ Case A — already migrated\.\s*\n\s*return 'already-migrated';/);
  });

  it('Test 7 — Case B: legacy absent, tombstone exists -> deleted, no recreation', () => {
    assert.match(
      body,
      /const tombstoneSnap = await tx\.get\(tombstoneRef\);\s*\n\s*if \(tombstoneSnap\.exists\(\)\) \{\s*\n\s*\/\/ Case B — intentionally deleted\.\s*\n\s*return 'deleted';/
    );
  });

  it('Test 8 — Case C: legacy absent, neither destination provenance nor tombstone -> ambiguous, fail closed', () => {
    assert.match(body, /\/\/ Case C — ambiguous\. Fail closed\.\s*\n\s*return 'ambiguous';/);
  });

  it('the three absent-source cases are distinct branches, not collapsed into one generic handler', () => {
    const caseALine = body.indexOf("return 'already-migrated';");
    const caseBLine = body.indexOf("return 'deleted';");
    const caseCLine = body.indexOf("return 'ambiguous';");
    assert.ok(caseALine > -1 && caseBLine > -1 && caseCLine > -1, 'all three case outcomes must exist');
    assert.ok(caseALine < caseBLine && caseBLine < caseCLine, 'expected the three cases in this exact order, each its own branch');
  });

  it('Test 9 — conflicting provenance at the destination throws, never overwrites, never deletes either side', () => {
    assert.match(
      body,
      /\/\/ §7 — conflicting provenance\. Fail closed\. Never overwrite,\s*\n\s*\/\/ never choose, never delete either side\.\s*\n\s*throw new Error\(\s*\n\s*`migration-collision: destination \$\{destinationKey\} exists with unrelated provenance`/
    );
    // Confirm no delete of either legacyRef or destinationRef occurs on this path.
    const collisionBranch = body.slice(body.indexOf('conflicting provenance'), body.indexOf('migration-collision') + 150);
    assert.doesNotMatch(collisionBranch, /tx\.delete/);
  });

  it('Test 10 — destination identity never derives from product name or any mutable content field', () => {
    assert.doesNotMatch(body, /deriveMigratedDestinationKey\([^)]*productName/);
    assert.doesNotMatch(body, /deriveMigratedDestinationKey\([^)]*quantity/);
    // The only input to the derivation function anywhere in this file is legacyKey.
    const derivationCalls = [...appContextSource.matchAll(/deriveMigratedDestinationKey\(([^)]*)\)/g)];
    assert.ok(derivationCalls.length > 0);
    for (const call of derivationCalls) {
      assert.equal(call[1].trim(), 'legacyKey');
    }
  });

  it('Test 11 — migrated rows never allocate through nextOrderIndex/allocatePeriodicOrderIndex', () => {
    assert.doesNotMatch(body, /allocatePeriodicOrderIndex/);
  });

  it('Test 12 — nextOrderIndex is advanced only when it would otherwise fall behind the migrated value, never unconditionally overwritten, and resumable/interruption-safe per-row', () => {
    assert.match(
      body,
      /const currentNextOrderIndex = metaSnap\.exists\(\) \? \(metaSnap\.data\(\)\.nextOrderIndex \?\? 0\) : 0;\s*\n\s*if \(currentNextOrderIndex <= orderIndex\) \{\s*\n\s*tx\.set\(metaRef, \{ nextOrderIndex: orderIndex \+ 1 \}, \{ merge: true \}\);/
    );
  });

  it('Test 13 — every read this transaction needs is issued before any write, satisfying Firestore\'s own transaction requirement and making the function safe to interrupt/resume at any point', () => {
    const firstWriteIndex = Math.min(
      ...['tx.set(destinationRef', 'tx.delete(legacyRef', 'tx.set(metaRef']
        .map((needle) => body.indexOf(needle))
        .filter((i) => i !== -1)
    );
    const readIndexes = ['tx.get(legacyRef)', 'tx.get(metaRef)', 'tx.get(destinationRef)']
      .map((needle) => body.indexOf(needle))
      .filter((i) => i !== -1);
    for (const readIndex of readIndexes) {
      assert.ok(readIndex < firstWriteIndex, `expected read at index ${readIndex} to precede first write at index ${firstWriteIndex}`);
    }
  });

  it('Test 14 — reuses the D1 field-preservation discipline correctly: the migration write spreads the complete legacy document, so no D1-protected lifecycle field is dropped', () => {
    // Confirmed distinct from ordinary edits: this write spreads the
    // FULL prior document (...legacyData), never a partial `content`
    // object, so it cannot drop anything D1 protects.
    assert.match(body, /\.\.\.legacyData,/);
  });

  it('Test 15 — productId is preserved exactly: the migration write never references or overrides productId directly, relying entirely on the ...legacyData spread', () => {
    assert.doesNotMatch(body, /productId:/);
  });

  it('the outer, pre-transaction candidate query never itself authorizes a write — it is only re-verified by direct reference inside the transaction before being trusted (Case A safety)', () => {
    const outerSection = body.slice(0, body.indexOf('return runTransaction'));
    assert.match(outerSection, /const outerMatch = await getDocs\(query\(itemsCollection, where\('migratedFromLegacyKey', '==', legacyKey\)\)\);/);
    assert.match(body, /const candidateSnap = await tx\.get\(candidateRef\);/);
    assert.match(body, /if \(candidateSnap\.exists\(\) && candidateSnap\.data\(\)\.migratedFromLegacyKey === legacyKey\) \{/);
  });

  it('the outer query never uses tx.get with a query argument — confirmed compatible with the actual client SDK, which supports transaction reads only by direct document reference', () => {
    assert.doesNotMatch(appContextSource, /tx\.get\(query\(/);
  });

  it('checks authorization (isActiveContagemEditor) before ever opening a transaction', () => {
    const preTransaction = body.split('return runTransaction')[0];
    assert.match(preTransaction, /if \(!isActiveContagemEditor\) \{/);
  });

  it('is declared in the context interface with the correct four-outcome return type', () => {
    assert.match(
      appContextSource,
      /migratePeriodicLegacyManualRow: \(legacyKey: string\) => Promise<'migrated' \| 'already-migrated' \| 'deleted' \| 'ambiguous'>;/
    );
  });

  it('is exposed through the actual context value', () => {
    assert.match(
      appContextSource,
      /allocatePeriodicOrderIndex,\s*\n\s*migratePeriodicLegacyManualRow,\s*\n\s*migrateAllLegacyPeriodicRows,\s*\n\s*resolvePeriodicConflict,/
    );
  });
});
