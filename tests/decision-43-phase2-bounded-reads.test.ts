// [Decision 43 §5, §7 — Phase 2 bounded authoritative reads]
//
// SCOPE: deleteProduct() and reopenClosing() (AppContext.tsx) are tightly
// coupled to the live Firebase client SDK (getDocs/getDocFromServer/
// writeBatch against a real `db` singleton) — same constraint documented
// in tests/delete-product-plan.test.ts and
// tests/business-worth-correction-recovery-ui.test.ts — this repo has no
// jsdom/testing-library harness to exercise either function end-to-end.
//
// What IS directly testable, and what this suite proves: that both
// functions' consequential cascade/unlock/target-lookup decisions have
// been switched from ambient, listener-fed array reads to bounded,
// tenant-scoped, authoritative Firestore reads — and that a failure of
// either fresh read aborts the operation with a distinct error rather
// than silently proceeding on an empty/unconfirmed scope.
//
// HOW TO RUN:
//   npx tsx --test tests/decision-43-phase2-bounded-reads.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

function extractFunctionBody(src: string, marker: string): string {
  const fnStart = src.indexOf(marker);
  assert.notEqual(fnStart, -1, `Could not locate "${marker}" — has the function been renamed/restructured?`);
  const nextFnIndex = src.indexOf('\n  const ', fnStart + marker.length);
  return src.slice(fnStart, nextFnIndex === -1 ? undefined : nextFnIndex);
}

describe('deleteProduct() — Decision 43 §5 cascade-scope authoritative read', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const deleteProduct = async (id: string) => {');

  it('no longer derives cascade scope from the ambient batches/quebras arrays', () => {
    assert.ok(
      !/batches\.filter\(\(b\) => b\.productId === id\)/.test(fnBody),
      'deleteProduct must not read cascade scope from the ambient, listener-fed `batches` array.'
    );
    assert.ok(
      !/quebras\.filter\(\(q\) => q\.productId === id\)/.test(fnBody),
      'deleteProduct must not read cascade scope from the ambient, listener-fed `quebras` array.'
    );
  });

  it('performs a bounded, product-scoped fresh read for both batches and quebras', () => {
    assert.match(fnBody, /collection\(db, 'businesses', businessId, 'batches'\), where\('productId', '==', id\)/);
    assert.match(fnBody, /collection\(db, 'businesses', businessId, 'quebras'\), where\('productId', '==', id\)/);
    assert.match(fnBody, /getDocs\(/, 'Cascade scope must come from getDocs, not a plain ambient array.');
  });

  it('still builds and commits the plan via planDeleteProduct + writeBatch (Fix #7 contract unchanged)', () => {
    assert.ok(fnBody.includes('planDeleteProduct('), 'deleteProduct must still build its delete plan via planDeleteProduct().');
    assert.ok(fnBody.includes('createFirestoreBatch(db)'), 'deleteProduct must still commit each chunk via a Firestore writeBatch.');
    assert.ok(fnBody.includes('.commit()'), 'deleteProduct must still actually commit the writeBatch(es) it builds.');
  });

  it('aborts with a distinct error, rather than proceeding on an empty scope, if the fresh read fails', () => {
    const tryIndex = fnBody.indexOf('try {');
    const catchIndex = fnBody.indexOf('} catch (readError) {');
    assert.notEqual(tryIndex, -1);
    assert.notEqual(catchIndex, -1);
    assert.ok(tryIndex < catchIndex, 'The bounded reads must be wrapped in a try block preceding the catch.');
    const catchBlock = fnBody.slice(catchIndex, fnBody.indexOf('}', fnBody.indexOf('throw new Error', catchIndex)) + 1);
    assert.match(catchBlock, /throw new Error/, 'A failed fresh read must abort the cascade with a thrown error, never fall back to an ambient/empty scope.');
  });

  it('remains scoped to the active business (no cross-business read)', () => {
    assert.match(fnBody, /businesses', businessId, 'batches'/);
    assert.match(fnBody, /businesses', businessId, 'quebras'/);
    assert.ok(!/collectionGroup/.test(fnBody), 'deleteProduct must not use a collectionGroup (cross-business) query.');
  });
});

describe('reopenClosing() — Decision 43 §7 authoritative target + unlock scope', () => {
  const fnBody = extractFunctionBody(appContextSrc, 'const reopenClosing = async (id: string, reason?: string) => {');

  it('no longer derives its target Closing from the ambient closings array', () => {
    assert.ok(
      !/closings\.find\(\(c\) => c\.id === id\)/.test(fnBody),
      'reopenClosing must not read its target from the ambient, listener-fed `closings` array.'
    );
    assert.match(fnBody, /getDocFromServer\(doc\(db, 'businesses', activeBusinessId, 'closings', id\)\)/);
  });

  it('no longer derives unlock scope from the ambient expenses/withdrawals arrays', () => {
    assert.ok(
      !/expenses\.filter\(\(e\) => e\.closingId === id\)/.test(fnBody),
      'reopenClosing must not read unlock scope from the ambient, listener-fed `expenses` array.'
    );
    assert.ok(
      !/withdrawals\.filter\(\(w\) => w\.closingId === id\)/.test(fnBody),
      'reopenClosing must not read unlock scope from the ambient, listener-fed `withdrawals` array.'
    );
    assert.match(fnBody, /collection\(db, 'businesses', activeBusinessId, 'expenses'\), where\('closingId', '==', id\)/);
    assert.match(fnBody, /collection\(db, 'businesses', activeBusinessId, 'withdrawals'\), where\('closingId', '==', id\)/);
  });

  it('the unlock write ops still reference only record ids, from the new authoritative id lists', () => {
    assert.match(fnBody, /lockedExpenseIds\.map\(\(eid\) =>/);
    assert.match(fnBody, /lockedWithdrawalIds\.map\(\(wid\) =>/);
    assert.match(fnBody, /'expenses', eid\), \{ closingId: deleteField\(\), lockedAt: deleteField\(\) \}/);
    assert.match(fnBody, /'withdrawals', wid\), \{ closingId: deleteField\(\), lockedAt: deleteField\(\) \}/);
  });

  it('aborts with a distinct error, rather than proceeding on an unconfirmed target, if the target read fails', () => {
    const targetTryIndex = fnBody.indexOf('const closingSnap = await getDocFromServer');
    assert.notEqual(targetTryIndex, -1);
    const surroundingCatch = fnBody.slice(targetTryIndex, targetTryIndex + 700);
    assert.match(surroundingCatch, /catch \(readError\) \{/);
    assert.match(surroundingCatch, /throw new Error/);
  });

  it('aborts with a distinct error, rather than proceeding on an unconfirmed unlock scope, if that fresh read fails', () => {
    const unlockTryIndex = fnBody.indexOf("query(collection(db, 'businesses', activeBusinessId, 'expenses')");
    assert.notEqual(unlockTryIndex, -1);
    const surroundingCatch = fnBody.slice(unlockTryIndex, unlockTryIndex + 700);
    assert.match(surroundingCatch, /catch \(readError\) \{/);
    assert.match(surroundingCatch, /throw new Error/);
  });

  it('remains scoped to the active business (no cross-business read)', () => {
    assert.ok(!/collectionGroup/.test(fnBody), 'reopenClosing must not use a collectionGroup (cross-business) query.');
  });

  it('the existing Owner-only guard and already-reopened guard are unchanged', () => {
    assert.match(fnBody, /Apenas o dono pode reabrir um período fechado\./);
    assert.match(fnBody, /Este período já foi reaberto anteriormente\./);
  });
});
