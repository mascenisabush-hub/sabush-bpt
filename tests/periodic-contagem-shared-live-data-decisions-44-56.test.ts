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
