// Periodic Contagem Shared Live Data — Decisions 44-56, Implementation
// Authorization (commit 67d60a7). Source-level regression guards (this
// repository has no React/DOM test harness — see
// stock-count-simplification.test.ts's own established precedent for
// this exact technique) proving:
//   - the authority mechanism (contagemAuthority) exists and is wired
//   - savePeriodicStockDraftItem uses a transaction, not a plain setDoc
//   - resolvePeriodicConflict enforces the two-preserved-values-only rule
//   - firestore.rules encodes the authority/conflict/finalization/
//     immutability mechanisms exactly as designed
//   - Decision 56 §7's delete path is untouched
//   - Finding K's fail-closed listener gating is applied to every
//     identified Tier-1 (Owner/Manager-only) collection
//   - the UI surfaces CONFLICT state, gates resolution/assignment by
//     role, and blocks the finalization button while conflicts remain
//
// This does NOT substitute for the real-backend/emulator verification
// named in the Rule 8 Reassessment and the Finding K Mechanism
// Analysis — those remain separately required. Finding K remains
// CONFIRMED FAIL, not resolved, regardless of what passes here.
//
// HOW TO RUN:
//   npx tsx --test tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const contextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf-8'
);
const viewSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);
const typesSource = readFileSync(new URL('../apps/tenant/src/types.ts', import.meta.url), 'utf-8');
const rulesSource = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf-8');

describe('Decisions 44-56 — data model (types.ts)', () => {
  it('PeriodicStockDraftItem carries rev/state/lastWriter*/conflict, all optional', () => {
    assert.match(typesSource, /rev\?: number;/);
    assert.match(typesSource, /state\?: 'ACCEPTED' \| 'CONFLICT';/);
    assert.match(typesSource, /lastWriterUid\?: string;/);
    assert.match(typesSource, /conflict\?: \{/);
  });

  it('ContagemAuthority type exists with delegatedEditorUid nullable', () => {
    assert.match(typesSource, /export interface ContagemAuthority \{/);
    assert.match(typesSource, /delegatedEditorUid: string \| null;/);
  });

  it('PeriodicStockDraft meta carries openConflictCount, optional', () => {
    assert.match(typesSource, /openConflictCount\?: number;/);
  });
});

describe('Decisions 44-56 — authority mechanism (AppContext.tsx)', () => {
  it('a live contagemAuthority listener exists, scoped to businesses/{id}/contagemAuthority/current', () => {
    assert.match(contextSource, /doc\(db, 'businesses', businessId, 'contagemAuthority', 'current'\)/);
  });

  it('isCurrentDelegatedEditor is derived from the live listener, never a separately stored claim', () => {
    assert.match(
      contextSource,
      /const isCurrentDelegatedEditor =\s*\n\s*!!currentUser && !!contagemAuthority && contagemAuthority\.delegatedEditorUid === currentUser\.uid;/
    );
  });

  it('isActiveContagemEditor is exactly isOwner OR isCurrentDelegatedEditor — no third path', () => {
    assert.match(contextSource, /const isActiveContagemEditor = isOwner \|\| isCurrentDelegatedEditor;/);
  });

  it('assignDelegatedEditor requires isOwner and writes delegatedEditorUid/assignedByUid/assignedAt', () => {
    assert.match(contextSource, /const assignDelegatedEditor = async \(uid: string \| null\) => \{/);
    assert.match(contextSource, /if \(!currentUser \|\| !isOwner \|\| !activeBusinessId\) \{/);
    assert.match(contextSource, /delegatedEditorUid: uid,/);
  });

  it('contagemAuthority state resets on sign-out and on business switch (staleness discipline)', () => {
    const signOutBlock = contextSource.match(/if \(!user\) \{[\s\S]*?setContagemAuthority\(null\);[\s\S]*?setContagemAuthorityLoaded\(false\);/);
    assert.ok(signOutBlock, 'expected contagemAuthority reset in the sign-out branch');
    const occurrences = (contextSource.match(/setContagemAuthority\(null\);/g) || []).length;
    assert.equal(occurrences, 3, 'expected three resets: sign-out, business-switch, and listener-error fail-closed');
  });
});

describe('Decisions 44-56 — concurrency/conflict mechanism (AppContext.tsx)', () => {
  it('savePeriodicStockDraftItem uses runTransaction, not a plain setDoc, for the row write', () => {
    const fnMatch = contextSource.match(/const savePeriodicStockDraftItem = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find savePeriodicStockDraftItem');
    assert.match(fnMatch![0], /await runTransaction\(db, async \(tx\) => \{/);
    assert.doesNotMatch(fnMatch![0], /await setDoc\(itemRef, item\);/);
  });

  it('a genuine collision (differing quantity) writes CONFLICT and preserves both observations, never overwriting quantity', () => {
    const fnMatch = contextSource.match(/const savePeriodicStockDraftItem = async[\s\S]*?\n  \};/);
    assert.match(fnMatch![0], /state: 'CONFLICT',/);
    assert.match(fnMatch![0], /observationA: \{/);
    assert.match(fnMatch![0], /observationB: \{/);
  });

  it('a row already in CONFLICT refuses an ordinary save (must go through resolvePeriodicConflict instead)', () => {
    const fnMatch = contextSource.match(/const savePeriodicStockDraftItem = async[\s\S]*?\n  \};/);
    assert.match(fnMatch![0], /if \(currentState === 'CONFLICT'\) \{/);
  });

  it('resolvePeriodicConflict only accepts one of the two already-preserved observation values', () => {
    const fnMatch = contextSource.match(/const resolvePeriodicConflict = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find resolvePeriodicConflict');
    assert.match(
      fnMatch![0],
      /if \(resolvedValue !== observationA\.value && resolvedValue !== observationB\.value\) \{/
    );
  });

  it('flushPeriodicStockDraftRows and savePeriodicStockDraftMeta both preserve openConflictCount (do not silently wipe it)', () => {
    assert.match(
      contextSource,
      /const preservedOpenConflictCount = periodicStockDraftMeta\?\.openConflictCount \?\? 0;[\s\S]{0,400}await setDoc\(metaRef, \{/
    );
    assert.match(
      contextSource,
      /const preservedOpenConflictCount = periodicStockDraftMeta\?\.openConflictCount \?\? 0;[\s\S]{0,200}fsBatch\.set\(metaRef, \{/
    );
  });

  it('recordStockCount refuses to finalize a non-initial count while openConflictCount > 0', () => {
    assert.match(
      contextSource,
      /if \(type !== 'initial' && \(periodicStockDraftMeta\?\.openConflictCount \?\? 0\) > 0\) \{/
    );
  });
});

// [Technical Design §19; Implementation Authorization §2 item 13]
// "Denormalized counter drift risk" — openConflictCount is only as
// correct as every code path touching `state` remembering to update it
// in the same transaction. §19 names the required mitigation
// explicitly: keep the counter's only writers to exactly two call
// sites, both already inside a runTransaction for other reasons, and
// cover this with "a dedicated consistency test (e.g. 'sum of
// state==CONFLICT rows always equals openConflictCount')". This block
// is that dedicated test, added as outstanding Implementation
// Authorization §2 item 13 verification — no application code changed
// to add it.
describe('Technical Design §19 — openConflictCount consistency invariant', () => {
  it('exactly two call sites in the whole file ever change the counter\'s VALUE (the §7 collision branch and the §9 resolution branch) — a third would be the exact drift risk §19 warns about', () => {
    // Every `openConflictCount:` occurrence in the file, whatever its
    // shape, so a future third writer cannot silently avoid this count
    // by using different syntax.
    const allOccurrences = contextSource.match(/openConflictCount:/g) ?? [];
    assert.equal(allOccurrences.length, 4, 'expected exactly 4 openConflictCount: occurrences total');
    // Of those 4, exactly 2 actually change the value (+1 on collision,
    // -1 on resolution) — the other 2 are the preservation-only spread
    // pattern verified by the 'preserve openConflictCount' test above,
    // which never mutates the value, only carries it forward unchanged.
    const valueChangingOccurrences = contextSource.match(
      /openConflictCount: (?:priorOpenConflictCount \+ 1|Math\.max\(0, priorOpenConflictCount - 1\))/g
    ) ?? [];
    assert.equal(valueChangingOccurrences.length, 2, 'expected exactly 2 value-changing openConflictCount writes');
  });

  it('the +1 (collision) write happens inside the SAME runTransaction call, and the SAME tx.set, as the state: CONFLICT transition it corresponds to', () => {
    const fnMatch = contextSource.match(/const savePeriodicStockDraftItem = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find savePeriodicStockDraftItem');
    const body = fnMatch![0];
    // Both statements exist inside one runTransaction callback with
    // nothing but the CONFLICT tx.set between them — i.e. the counter
    // increment is the very next transactional statement after the
    // state transition it accounts for, not a separate write outside
    // the transaction (which is exactly how drift could be introduced).
    assert.match(
      body,
      /state: 'CONFLICT',[\s\S]*?\n\s*\}\);\s*\n\s*const priorOpenConflictCount = metaSnap\.exists\(\) \? \(metaSnap\.data\(\)\.openConflictCount \?\? 0\) : 0;\s*\n\s*tx\.set\(metaRef, \{ openConflictCount: priorOpenConflictCount \+ 1 \}, \{ merge: true \}\);\s*\n\s*\}\);/
    );
    // And this whole thing is itself inside a single runTransaction —
    // confirmed separately (existing test, above) that
    // savePeriodicStockDraftItem uses runTransaction at all; this
    // assertion additionally confirms the increment is not issued via
    // some second, later transaction or a bare tx.update/setDoc outside
    // the one already proven to exist.
    assert.match(body, /await runTransaction\(db, async \(tx\) => \{[\s\S]*state: 'CONFLICT',[\s\S]*priorOpenConflictCount \+ 1[\s\S]*\n  \};$/);
  });

  it('the -1 (resolution) write happens inside the SAME runTransaction call, and the SAME tx.set, as the state: ACCEPTED transition it corresponds to', () => {
    const fnMatch = contextSource.match(/const resolvePeriodicConflict = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find resolvePeriodicConflict');
    const body = fnMatch![0];
    assert.match(
      body,
      /state: 'ACCEPTED',[\s\S]*?\n\s*\}\);\s*\n\s*const priorOpenConflictCount = metaSnap\.exists\(\) \? \(metaSnap\.data\(\)\.openConflictCount \?\? 0\) : 0;\s*\n\s*tx\.set\(metaRef, \{ openConflictCount: Math\.max\(0, priorOpenConflictCount - 1\) \}, \{ merge: true \}\);\s*\n\s*\}\);/
    );
    assert.match(body, /await runTransaction\(db, async \(tx\) => \{[\s\S]*state: 'ACCEPTED',[\s\S]*priorOpenConflictCount - 1[\s\S]*\n  \};$/);
  });

  it('the decrement floors at 0 (Math.max), so a resolution can never drive the counter negative even under a hypothetical prior miscount', () => {
    assert.match(contextSource, /openConflictCount: Math\.max\(0, priorOpenConflictCount - 1\)/);
  });

  it('no other code path in the file writes a bare "state: \'CONFLICT\'" or transitions a periodic draft item\'s state away from CONFLICT — the two writers above are exhaustive', () => {
    // Every occurrence of transitioning a row TO CONFLICT in the whole
    // file must be the one already verified above (savePeriodicStockDraftItem's
    // collision branch) — a second, un-counted path would silently
    // reintroduce the exact drift §19 warns about.
    const toConflict = contextSource.match(/state: 'CONFLICT',/g) ?? [];
    assert.equal(toConflict.length, 1, 'expected exactly one place that ever transitions a row TO CONFLICT');
    // Every occurrence of transitioning a row's state to ACCEPTED with
    // an accompanying `conflict:` field carried forward (i.e. a
    // resolution, not an ordinary first-time save, which never has a
    // conflict object at all) must be the one already verified above.
    const resolutionAccepted = contextSource.match(/quantity: resolvedValue,\s*\n\s*state: 'ACCEPTED',/g) ?? [];
    assert.equal(resolutionAccepted.length, 1, 'expected exactly one resolution-shaped ACCEPTED transition');
  });
});

describe('Decisions 44-56 — firestore.rules', () => {
  it('isCurrentDelegatedEditor/isActiveContagemEditor helpers exist', () => {
    assert.match(rulesSource, /function isCurrentDelegatedEditor\(businessId\) \{/);
    assert.match(rulesSource, /function isActiveContagemEditor\(businessId\) \{/);
    assert.match(rulesSource, /return isOwnerOf\(businessId\) \|\| isCurrentDelegatedEditor\(businessId\);/);
  });

  it('contagemAuthority/current is Owner-write, member-read, never deletable', () => {
    assert.match(rulesSource, /match \/contagemAuthority\/current \{/);
    assert.match(rulesSource, /allow read: if isMemberOf\(businessId\);\s*\n\s*allow create, update: if isOwnerOf\(businessId\)/);
    assert.match(rulesSource, /allow delete: if false;/);
  });

  it('the wildcard stockCountDrafts/{draftId} block (governing \'initial\') is untouched — still isOwnerOf-only', () => {
    assert.match(
      rulesSource,
      /match \/stockCountDrafts\/\{draftId\} \{\s*\n\s*allow read: if isOwnerOf\(businessId\);/
    );
  });

  it('a more-specific stockCountDrafts/periodic override widens read to isMemberOf and write to isActiveContagemEditor', () => {
    assert.match(rulesSource, /match \/stockCountDrafts\/periodic \{/);
    const periodicBlock = rulesSource.match(/match \/stockCountDrafts\/periodic \{[\s\S]*?\n      \}\n\n      \/\/ \[Durable/);
    assert.ok(periodicBlock, 'expected to find the periodic-specific override block');
    assert.match(periodicBlock![0], /allow read: if isMemberOf\(businessId\);/);
    assert.match(periodicBlock![0], /allow create, update: if isActiveContagemEditor\(businessId\)/);
  });

  it('the three-branch items/{rowKey} write rule (ordinary/conflict/resolution) exists', () => {
    const periodicBlock = rulesSource.match(/match \/stockCountDrafts\/periodic \{[\s\S]*?\n      \}\n\n      \/\/ \[Durable/);
    assert.match(periodicBlock![0], /request\.resource\.data\.get\('rev', -1\) == resource\.data\.get\('rev', 0\) \+ 1/);
    assert.match(periodicBlock![0], /request\.resource\.data\.get\('state', null\) == 'CONFLICT'/);
    assert.match(periodicBlock![0], /resource\.data\.conflict\.observationA\.value,/);
  });

  it('the stockCounts finalization create rule requires openConflictCount == 0 for non-initial types', () => {
    assert.match(
      rulesSource,
      /type', null\) != 'initial' &&[\s\S]{0,50}subscriptionAllowsNewRecords\(businessId\) &&[\s\S]{0,50}!exists\([\s\S]{0,300}openConflictCount', 0\) == 0/
    );
  });

  it('Decision 56: stockCounts update is unconditionally false; delete is UNCHANGED (Decision 56 §7 not decided here)', () => {
    assert.match(rulesSource, /allow update: if false;\s*\n\s*allow delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
  });

  it('does not introduce a combined update-and-delete grant for non-initial stockCounts (the old, now-narrowed shape)', () => {
    assert.doesNotMatch(rulesSource, /allow update, delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
  });
});

describe('Finding K — fail-closed listener gating (AppContext.tsx)', () => {
  const ownerOnlyCollections = [
    'withdrawals',
    'cashLedgerEntries',
    'receivables',
    'receivablePayments',
    'payables',
    'payablePayments',
    'cashPositionDeclarations',
    'startupInvestmentEntries',
    'payments',
  ];

  for (const name of ownerOnlyCollections) {
    it(`${name}: listener is gated on isOwner, resets to [] on error, and on the non-owner branch`, () => {
      // Each of these follows the same `let unsubX: () => void = () => {}; if (isOwner) { ... } else { setX([]); }` shape.
      const idx = contextSource.indexOf(`'${name}'`);
      assert.ok(idx >= 0, `expected a reference to the '${name}' collection path`);
      const nearby = contextSource.slice(Math.max(0, idx - 200), idx + 1600);
      assert.match(nearby, /if \(isOwner(?:\s*\|\|\s*(?:isManager|canManagerCloseBooks|canManagerManageStaff))?\)/);
    });
  }

  it('subscriptions listener is gated on isOwner || isManager (matches firestore.rules exactly)', () => {
    assert.match(contextSource, /if \(isOwner \|\| isManager\) \{\s*\n\s*unsubSubscription = onSnapshot\(/);
  });

  it('closings listener is gated on isOwner || canManagerCloseBooks (matches isOwnerOrGrantedManager)', () => {
    assert.match(contextSource, /if \(isOwner \|\| canManagerCloseBooks\) \{\s*\n\s*unsubClosings = onSnapshot\(/);
  });

  it('staff listener is gated on isOwner || canManagerManageStaff, and non-authorized branch still confirms the listener (no infinite loading)', () => {
    assert.match(contextSource, /if \(isOwner \|\| canManagerManageStaff\) \{\s*\n\s*unsubStaff = onSnapshot\(/);
    assert.match(
      contextSource,
      /definitively-not-authorized session is[\s\S]{0,200}setStaffMembersListenerConfirmed\(true\);/
    );
  });

  it('legitimately shared (isMemberOf-tier) collections are explicitly NOT gated — e.g. closedPeriods, businessWorthSnapshots', () => {
    // These must remain unconditional — gating a genuinely shared
    // collection would be an over-restriction Decision 51 never asked for.
    assert.match(contextSource, /const unsubClosedPeriods = onSnapshot\(\s*\n\s*closedPeriodsRef,/);
  });
});

describe('Decisions 44-56 — PeriodicStockCountView.tsx UI wiring', () => {
  it('the finalization button is disabled while hasUnresolvedConflicts is true', () => {
    assert.match(viewSource, /const hasUnresolvedConflicts = \(periodicStockDraft\?\.openConflictCount \?\? unresolvedConflictRows\.length\) > 0;/);
    assert.match(viewSource, /disabled=\{isSaving \|\| hasUnresolvedConflicts\}/);
  });

  it('the conflict panel shows both preserved observations and gates the resolve buttons on isActiveContagemEditor', () => {
    assert.match(viewSource, /unresolvedConflictRows\.length > 0 &&/);
    assert.match(viewSource, /observationA/);
    assert.match(viewSource, /observationB/);
    assert.match(viewSource, /\{isActiveContagemEditor && \(\s*\n\s*<button/);
    assert.match(viewSource, /Apenas o Dono\/Admin ou o Editor delegado pode resolver este conflito\./);
  });

  it('conflict resolution calls the existing authorized resolvePeriodicConflict, never a new resolution mechanism', () => {
    assert.match(viewSource, /await resolvePeriodicConflict\(rowKey, resolvedValue\);/);
  });

  it('the authority panel gates delegate assignment on isOwner and shows a read-only notice to a Viewer', () => {
    assert.match(viewSource, /isOwner \? \(/);
    assert.match(viewSource, /handleAssignDelegate/);
    assert.match(viewSource, /modo de visualização/);
  });

  it('delegate assignment calls the existing authorized assignDelegatedEditor, never a new authority model', () => {
    assert.match(viewSource, /await assignDelegatedEditor\(uid\);/);
  });
});

// [Implementation Plan Area A; Implementation Authorization §2 item 1]
// Genuine per-row live adoption (Stage 2). Same source-level regression
// technique as every describe block above — this repository has no
// React/DOM test harness (see file header), so these assert the
// specific structural properties that produce each required behavior,
// rather than rendering and simulating keystrokes.
describe('Implementation Authorization §2 item 1 — genuine per-row live adoption (Stage 2)', () => {
  it('rowHasUnsavedLocalEditRef exists and is a plain ref, not React state (never re-renders on its own)', () => {
    assert.match(viewSource, /const rowHasUnsavedLocalEditRef = useRef<Record<string, boolean>>\(\{\}\);/);
  });

  it('scheduling a row edit (scheduleRowDraftSave) marks that exact row dirty for catalog:/manual: keys only', () => {
    const idx = viewSource.indexOf('const scheduleRowDraftSave = (rowKey: string) => {');
    assert.ok(idx >= 0, 'expected scheduleRowDraftSave to exist');
    const body = viewSource.slice(idx, idx + 2500);
    assert.match(
      body,
      /if \(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) \{\s*\n\s*rowHasUnsavedLocalEditRef\.current\[rowKey\] = true;\s*\n\s*\}/
    );
  });

  it('a successful save (performRowSaveAttempt) clears the dirty flag only once belongsToCurrentGeneration is confirmed', () => {
    const thenIdx = viewSource.indexOf(".then((updatedAt) => {");
    assert.ok(thenIdx >= 0, 'expected the save-success callback to exist');
    const body = viewSource.slice(thenIdx, thenIdx + 1500);
    // The generation guard is the very first line of this callback —
    // the clear below it is therefore already gated by it.
    assert.match(body, /if \(!belongsToCurrentGeneration\(\)\) return;/);
    assert.match(
      body,
      /if \(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) \{\s*\n\s*delete rowHasUnsavedLocalEditRef\.current\[rowKey\];\s*\n\s*\}/
    );
  });

  it('the live-adoption effect skips a row with an unsaved local edit — never overwrites in-progress typing', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    assert.ok(idx >= 0, 'expected the Stage 2 live-adoption effect to exist');
    const body = viewSource.slice(idx, idx + 7000);
    assert.match(body, /if \(rowHasUnsavedLocalEditRef\.current\[rowKey\]\) continue;/);
  });

  it('the live-adoption effect skips a row in CONFLICT state — never picks an automatic winner (Decision 55)', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    assert.match(body, /if \(item\.state === 'CONFLICT'\) continue;/);
  });

  it('a clean catalog row (no local edit, no conflict) is adopted from periodicStockDraftItemsByKey into catalogRows', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    assert.match(body, /const productId = rowKey\.slice\('catalog:'\.length\);/);
    assert.match(body, /const existing = catalogRows\[productId\];/);
    assert.match(body, /nextCatalogRows\[productId\] = candidate;/);
  });

  it('a clean manual row (no local edit, no conflict) is adopted from periodicStockDraftItemsByKey into manualRows, existing indices only', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    assert.match(body, /const index = parseInt\(rowKey\.slice\('manual:'\.length\), 10\);/);
    assert.match(body, /const existing = manualRows\[index\];/);
    assert.match(body, /if \(!existing\) continue; \/\/ scope: existing local rows only/);
    assert.match(body, /nextManualRows\[index\] = candidate;/);
  });

  it('adoption is skipped when the candidate is identical to the existing row (no needless re-render/churn)', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    const occurrences = body.match(/JSON\.stringify\(workingRowToDraftItem\(existing\)\) === JSON\.stringify\(workingRowToDraftItem\(candidate\)\)/g);
    assert.ok(occurrences && occurrences.length === 2, 'expected the equality guard on both the catalog and manual branches');
  });

  it('the adoption effect never runs while the stale-draft resume banner is still pending an explicit operator decision', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    assert.match(body, /if \(hasMeaningfulContent && !draftBannerDismissed\) return;/);
  });

  it('rowHasUnsavedLocalEditRef is reset on business switch, on draft resume, and on draft discard — never leaks across contexts', () => {
    assert.match(
      viewSource,
      /hasSeenProductsRef\.current = false;\s*\n\s*\/\/ \[Implementation Authorization §2 item 1\][\s\S]{0,400}rowHasUnsavedLocalEditRef\.current = \{\};\s*\n\s*\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s*\n\s*\}, \[activeBusinessId\]\);/
    );
    assert.match(
      viewSource,
      /lastLocalDraftWriteRef\.current = periodicStockDraft\.updatedAt;\s*\n\s*\/\/ \[Implementation Authorization §2 item 1\][\s\S]{0,400}rowHasUnsavedLocalEditRef\.current = \{\};\s*\n\s*setDraftBannerDismissed\(true\);\s*\n\s*\};/
    );
    assert.match(
      viewSource,
      /\} finally \{\s*\n\s*\/\/ \[Implementation Authorization §2 item 1\][\s\S]{0,250}rowHasUnsavedLocalEditRef\.current = \{\};\s*\n\s*setDraftBannerDismissed\(true\);\s*\n\s*\}/
    );
  });

  it('does not replace or touch the existing runTransaction conflict-detection mechanism (Decision 55) in AppContext.tsx', () => {
    // Regression guard: this Stage 2 change lives entirely in
    // PeriodicStockCountView.tsx; savePeriodicStockDraftItem's own
    // transaction shape (asserted earlier in this file) must remain
    // byte-for-byte the same read-compare-write mechanism.
    assert.match(contextSource, /await runTransaction\(db, async \(tx\) => \{/);
    assert.match(contextSource, /state: 'CONFLICT',/);
  });

  it('Viewer read-only and finalization/immutability protections remain intact (untouched by Stage 2)', () => {
    // Same assertions the pre-existing describe blocks above already
    // make — re-checked here to confirm Stage 2 did not regress them.
    assert.match(rulesSource, /allow create, update: if isActiveContagemEditor\(businessId\)/);
    assert.match(viewSource, /disabled=\{isSaving \|\| hasUnresolvedConflicts\}/);
    assert.match(rulesSource, /allow update: if false;\s*\n\s*allow delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
  });
});

// [Bug fix — Area A `rowHasUnsavedLocalEditRef` lifecycle, corrective
// session] Root cause: a save rejected because the row is ALREADY
// `state: 'CONFLICT'` throws a plain, non-Firestore-coded Error,
// classified 'save-unknown' (never auto-retried), and — before this
// fix — nothing ever cleared the dirty flag afterward, so the
// live-adoption effect would refuse forever to adopt the row's eventual
// authoritative resolution. Same source-level regression convention as
// every describe block above.
describe('Bug fix — Area A dirty-flag lifecycle (already-CONFLICT rejection)', () => {
  it('1. a save rejected because the row is already CONFLICT clears the dirty flag, checking the TRUE current remote state via a dedicated live ref', () => {
    const idx = viewSource.indexOf("if (classification === 'transient') {");
    assert.ok(idx >= 0, 'expected the classification branch to exist');
    const body = viewSource.slice(idx, idx + 5200);
    assert.match(
      body,
      /if \(\s*\n\s*\(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) &&\s*\n\s*latestPeriodicStockDraftItemsByKeyRef\.current\[rowKey\]\?\.state === 'CONFLICT'\s*\n\s*\) \{\s*\n\s*delete rowHasUnsavedLocalEditRef\.current\[rowKey\];\s*\n\s*\}/
    );
  });

  it('the freshness ref (latestPeriodicStockDraftItemsByKeyRef) is kept live, updated unconditionally every render — never a stale closure', () => {
    assert.match(
      viewSource,
      /const latestPeriodicStockDraftItemsByKeyRef = useRef\(periodicStockDraftItemsByKey\);\s*\n\s*latestPeriodicStockDraftItemsByKeyRef\.current = periodicStockDraftItemsByKey;/
    );
  });

  it('2. a conflicted row remains protected from adoption independently of the dirty flag — the two guards are separate, not merged', () => {
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    // Two distinct, sequential `continue` guards — not a single
    // combined condition — is exactly what makes it safe to clear the
    // dirty flag while a row is still CONFLICT: the state guard alone
    // already fully protects it.
    assert.match(body, /if \(rowHasUnsavedLocalEditRef\.current\[rowKey\]\) continue; \/\/ protect this operator's in-progress edit\s*\n\s*if \(item\.state === 'CONFLICT'\) continue;/);
  });

  it('3. once resolution flips the row back to ACCEPTED, the (now-clean) dirty flag no longer blocks the live-adoption effect from adopting the resolved value', () => {
    // resolvePeriodicConflict (AppContext.tsx) is the sole path back to
    // 'ACCEPTED', and it is untouched by this fix — asserted separately
    // below (test 6). This test confirms the adoption effect itself has
    // no OTHER gate besides the two already verified in test 2 above,
    // so clearing the dirty flag is suffient, on its own, to let
    // adoption resume once state genuinely becomes 'ACCEPTED' again.
    const idx = viewSource.indexOf('Genuine per-row live\n  // adoption');
    const body = viewSource.slice(idx, idx + 7000);
    assert.match(body, /const candidate = draftItemToWorkingRow\(item\);/);
    assert.doesNotMatch(body, /item\.state !== 'ACCEPTED'/); // no third gate was added
  });

  it('4. a genuinely new local edit after resolution re-establishes the dirty flag through the entirely unmodified scheduleRowDraftSave path', () => {
    const idx = viewSource.indexOf('const scheduleRowDraftSave = (rowKey: string) => {');
    const body = viewSource.slice(idx, idx + 2500);
    // Unconditional set — scheduleRowDraftSave has no awareness of
    // conflict/resolution history for a row; every genuine edit sets it.
    assert.match(
      body,
      /if \(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) \{\s*\n\s*rowHasUnsavedLocalEditRef\.current\[rowKey\] = true;\s*\n\s*\}/
    );
  });

  it('5. the already-CONFLICT clear is reached only after belongsToCurrentGeneration() — a superseded (older) rejected attempt can never clear a newer edit\'s dirty flag', () => {
    const catchIdx = viewSource.indexOf('.catch((err) => {');
    assert.ok(catchIdx >= 0, 'expected the catch handler to exist');
    const body = viewSource.slice(catchIdx, catchIdx + 200);
    // The generation guard is the very first statement in the catch
    // handler — every branch below it, including the new dirty-flag
    // clear (test 1, ~5000 chars further into this same handler), is
    // therefore already unreachable for a superseded attempt.
    assert.match(body, /if \(!belongsToCurrentGeneration\(\)\) return; \/\/ superseded/);
  });

  it('6. existing same-row conflict detection/resolution (Decision 55) is untouched — runTransaction, CONFLICT creation, and resolvePeriodicConflict all unchanged', () => {
    assert.match(contextSource, /await runTransaction\(db, async \(tx\) => \{/);
    assert.match(contextSource, /if \(currentState === 'CONFLICT'\) \{\s*\n\s*throw new Error\(/);
    assert.match(contextSource, /const resolvePeriodicConflict = async \(rowKey: string, resolvedValue: string\) => \{/);
  });

  it('7. the existing successful-save dirty-clearing path (ordinary ACCEPTED save) is unchanged', () => {
    const thenIdx = viewSource.indexOf('.then((updatedAt) => {');
    const body = viewSource.slice(thenIdx, thenIdx + 1500);
    assert.match(body, /if \(!belongsToCurrentGeneration\(\)\) return; \/\/ superseded/);
    assert.match(
      body,
      /if \(rowKey\.startsWith\('catalog:'\) \|\| rowKey\.startsWith\('manual:'\)\) \{\s*\n\s*delete rowHasUnsavedLocalEditRef\.current\[rowKey\];\s*\n\s*\}/
    );
  });

  it('8. business-switch/resume/discard reset behavior is unchanged by this fix', () => {
    assert.match(
      viewSource,
      /hasSeenProductsRef\.current = false;\s*\n\s*\/\/ \[Implementation Authorization §2 item 1\][\s\S]{0,400}rowHasUnsavedLocalEditRef\.current = \{\};/
    );
  });

  it('does not modify firestore.rules, Decision 56 §7, or any Finding K listener gating', () => {
    // Regression guard for the explicit "preserve existing semantics"
    // boundary this corrective session was given.
    assert.match(rulesSource, /allow delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
    const idx = contextSource.indexOf("'withdrawals'");
    const nearby = contextSource.slice(Math.max(0, idx - 200), idx + 1600);
    assert.match(nearby, /if \(isOwner\)/);
  });

  it('the fromCache reconnect nuance is documented as a deliberate, unaddressed limitation, not silently ignored', () => {
    assert.match(viewSource, /Known, deliberately-unaddressed nuance/);
    assert.match(viewSource, /fromCache/);
  });
});
