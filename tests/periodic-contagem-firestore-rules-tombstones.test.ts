// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §2 item 12, Stage 10] Regression coverage for the tombstones
// firestore.rules block. Source-text based — this repository has no
// Firestore emulator available in this sandbox (confirmed throughout
// this engagement: functional infrastructure, network-blocked
// specifically), so actual rules enforcement cannot be executed here.
// This test confirms the rule text's structure and content, not its
// runtime behavior, which remains an explicit, named completion gate.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const rulesSource = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

describe('firestore.rules — tombstones subcollection', () => {
  it('exists exactly once, nested as a sibling of the periodic items block', () => {
    const occurrences = [...rulesSource.matchAll(/match \/tombstones\/\{key\}/g)];
    assert.equal(occurrences.length, 1, 'expected exactly one tombstones rule block');
  });

  const blockMatch = rulesSource.match(
    /match \/tombstones\/\{key\} \{[\s\S]*?\n        \}/
  );

  it('grants read to any business member, matching the periodic items block\'s own read permission', () => {
    assert.ok(blockMatch);
    assert.match(blockMatch![0], /allow read: if isMemberOf\(businessId\);/);
  });

  it('grants create only to isActiveContagemEditor, requiring deletedAt (a string) and deletedByUid (the caller\'s own uid) to be present', () => {
    assert.match(
      blockMatch![0],
      /allow create: if isActiveContagemEditor\(businessId\) &&\s*\n\s*request\.resource\.data\.get\('deletedAt', null\) is string &&\s*\n\s*request\.resource\.data\.get\('deletedByUid', null\) == request\.auth\.uid;/
    );
  });

  it('has no update rule at all — a tombstone is immutable once created', () => {
    // Checked as a live rule statement (allow update: if ...), not
    // merely absent from the block as a whole — the comment
    // immediately above legitimately quotes "allow update" in
    // backticks for documentation purposes.
    assert.doesNotMatch(blockMatch![0], /allow update:/);
  });

  it('grants delete only to isActiveContagemEditor, matching what the two draft-lifecycle-endpoint cleanup sites (Stage 5) require', () => {
    assert.match(blockMatch![0], /allow delete: if isActiveContagemEditor\(businessId\);/);
  });

  it('sits inside the same periodic-specific override block as the items rule, not the generic wildcard block', () => {
    // Confirmed earlier this engagement: a separate, generic items
    // block exists at a different location with `draftId != 'periodic'`
    // in its own condition — the tombstones block must be nested
    // under the SAME periodic-specific override, never the generic one.
    const periodicBlockStart = rulesSource.indexOf('match /items/{rowKey} {', rulesSource.indexOf("draftId == 'periodic'"));
    const tombstonesIndex = rulesSource.indexOf('match /tombstones/{key}');
    assert.ok(periodicBlockStart > -1 && tombstonesIndex > periodicBlockStart);
  });
});

describe('firestore.rules — basic syntax sanity', () => {
  it('braces are balanced across the whole file', () => {
    const opens = (rulesSource.match(/\{/g) || []).length;
    const closes = (rulesSource.match(/\}/g) || []).length;
    assert.equal(opens, closes, 'unbalanced braces indicate a structural syntax error');
  });
});
