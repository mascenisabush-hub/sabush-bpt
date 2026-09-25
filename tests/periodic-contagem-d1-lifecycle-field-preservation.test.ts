// [Periodic Contagem Expanded Phase 2 — Implementation Authorization
// §1 item 6, D1 write contract] Regression coverage for the
// `preservedLifecycleFields` helper and its use in
// `savePeriodicStockDraftItem`'s three non-conflict write branches —
// the fix that prevents an ordinary content-only edit from silently
// erasing a row's `migratedFromLegacyKey`/`orderIndex` once a later
// stage begins populating them. Source-text based, following this
// repository's own established convention (no Firestore emulator
// available in this environment) — proves the source contains the
// correct structure and logic, not runtime Firestore behavior.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf8'
);

describe('D1 write contract — lifecycle field preservation', () => {
  it('defines preservedLifecycleFields, falling back from content to current, never emitting a literal undefined key', () => {
    const helperMatch = appContextSource.match(
      /const preservedLifecycleFields = \([\s\S]{0,200}?\): Partial<Pick<PeriodicStockDraftItem, 'migratedFromLegacyKey' \| 'orderIndex'>> => \{[\s\S]*?\n    \};/
    );
    assert.ok(helperMatch, 'expected preservedLifecycleFields to exist with its documented signature');
    const body = helperMatch![0];
    assert.match(
      body,
      /const migratedFromLegacyKey = content\.migratedFromLegacyKey \?\? currentDoc\?\.migratedFromLegacyKey;/
    );
    assert.match(body, /const orderIndex = content\.orderIndex \?\? currentDoc\?\.orderIndex;/);
    // Conditional inclusion — never a literal `undefined` value in the
    // returned object, matching this codebase's own established
    // discipline (confirmed throughout AppContext.tsx and types.ts).
    assert.match(body, /migratedFromLegacyKey !== undefined \? \{ migratedFromLegacyKey \} : \{\}/);
    assert.match(body, /orderIndex !== undefined \? \{ orderIndex \} : \{\}/);
  });

  it('the first-write branch calls preservedLifecycleFields(null) — a genuinely new row has no current document to fall back to', () => {
    assert.match(
      appContextSource,
      /\/\/ First write for this row\.\s*\n\s*tx\.set\(itemRef, \{\s*\n\s*\.\.\.content,\s*\n\s*\.\.\.preservedLifecycleFields\(null\),\s*\n\s*rev: 1,/
    );
  });

  it('the same-quantity/advance branch calls preservedLifecycleFields(current)', () => {
    assert.match(
      appContextSource,
      /tx\.set\(itemRef, \{\s*\n\s*\.\.\.content,\s*\n\s*\.\.\.preservedLifecycleFields\(current\),\s*\n\s*rev: currentRev \+ 1,\s*\n\s*state: 'ACCEPTED',\s*\n\s*lastWriterUid: currentUser\.uid,\s*\n\s*lastWriterRole: writerRole,\s*\n\s*lastWriteAt: nowIso,\s*\n\s*\/\/ \[Bug fix — "sorting seems to call nothing" follow-up\]/
    );
  });

  it('the same-writer/self-correction branch also calls preservedLifecycleFields(current)', () => {
    assert.match(
      appContextSource,
      /if \(current\.lastWriterUid === currentUser\.uid && \(baseRev === undefined \|\| baseRev === currentRev\)\) \{\s*\n\s*tx\.set\(itemRef, \{\s*\n\s*\.\.\.content,\s*\n\s*\.\.\.preservedLifecycleFields\(current\),\s*\n\s*rev: currentRev \+ 1,/
    );
  });

  it('the genuine-collision branch needs no explicit preservation call — it already spreads the entire current document', () => {
    const collisionMatch = appContextSource.match(
      /no-automatic-winner requirement\.[\s\S]{0,400}?tx\.set\(itemRef, \{\s*\n\s*\.\.\.current,\s*\n\s*state: 'CONFLICT',/
    );
    assert.ok(collisionMatch, 'expected the collision branch to spread ...current wholesale, requiring no separate lifecycle-field preservation');
    // Confirms this branch does NOT redundantly call the helper —
    // spreading the whole document already covers both fields.
    assert.doesNotMatch(collisionMatch![0], /preservedLifecycleFields/);
  });

  it('resolvePeriodicConflict also spreads ...current wholesale and needs no separate preservation call', () => {
    const resolveMatch = appContextSource.match(
      /const resolvePeriodicConflict = async[\s\S]*?tx\.set\(itemRef, \{\s*\n\s*\.\.\.current,\s*\n\s*quantity: resolvedValue,/
    );
    assert.ok(resolveMatch, 'expected resolvePeriodicConflict to spread ...current wholesale');
    assert.doesNotMatch(resolveMatch![0], /preservedLifecycleFields/);
  });
});
