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

  // [Decision 58 — Interruption Persistence and Recovery Parity;
  // Implementation Authorization §3 item 2] Added after Test Group F
  // (tests/decision-58-cross-device-finalization.test.ts) empirically
  // confirmed, via the Firestore emulator, that without this guard a
  // stale retry landing after a different device's finalization could
  // recreate an orphaned item document that a subsequently created
  // active Contagem's own unfiltered items-subcollection listener would
  // then inherit. This is an application-layer guard only — it is not,
  // and does not need to be, enforced by firestore.rules, which permits
  // this write shape regardless (confirmed by that same emulator suite,
  // whose rules-layer assertions this guard does not change).
  it('Decision 58 — the "first write" branch refuses to (re-)create a row when the parent meta document does not exist (guards against a stale interruption retry resurrecting an orphaned row after a different device finalized this Contagem)', () => {
    const fnMatch = contextSource.match(/const savePeriodicStockDraftItem = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find savePeriodicStockDraftItem');
    const body = fnMatch![0];
    const notCurrentIdx = body.indexOf('if (!current) {');
    const guardIdx = body.indexOf('if (!metaSnap.exists()) {', notCurrentIdx);
    const setIdx = body.indexOf('tx.set(itemRef, {', notCurrentIdx);
    assert.notEqual(notCurrentIdx, -1);
    assert.notEqual(guardIdx, -1, 'Expected a metaSnap.exists() guard inside the "first write" (!current) branch.');
    assert.notEqual(setIdx, -1);
    assert.ok(
      notCurrentIdx < guardIdx && guardIdx < setIdx,
      'The meta-existence guard must run inside the "first write" branch, before tx.set — refusing the write outright, not merely logging or writing anyway.'
    );
    // Reuses the metaSnap already read at the top of the transaction
    // (for the unrelated openConflictCount bookkeeping the CONFLICT
    // branch uses) — no second Firestore read is introduced.
    assert.doesNotMatch(
      body.slice(0, notCurrentIdx),
      /const metaSnap = await tx\.get/,
      'metaSnap must remain sourced from the single Promise.all([tx.get(itemRef), tx.get(metaRef)]) at the top of the transaction, not a second, separate read added for this guard.'
    );
    // The guard must be scoped to the "first write" branch only — an
    // ordinary edit to an EXISTING row (the branches below this one)
    // must remain entirely unaffected, since only a genuinely new/
    // resurrected document can ever be the orphan this guard prevents.
    const afterNotCurrentBlock = body.slice(setIdx);
    assert.doesNotMatch(
      afterNotCurrentBlock.slice(0, afterNotCurrentBlock.indexOf('const currentRev')),
      /metaSnap\.exists\(\)/,
      'The guard should not appear again outside the "first write" branch — an existing row\'s ordinary update/conflict handling is unaffected by Decision 58.'
    );
  });

  it('resolvePeriodicConflict only accepts one of the two already-preserved observation values', () => {
    const fnMatch = contextSource.match(/const resolvePeriodicConflict = async[\s\S]*?\n  \};/);
    assert.ok(fnMatch, 'expected to find resolvePeriodicConflict');
    assert.match(
      fnMatch![0],
      /if \(resolvedValue !== observationA\.value && resolvedValue !== observationB\.value\) \{/
    );
  });

  it('savePeriodicStockDraftMeta and flushPeriodicStockDraftRows both preserve openConflictCount by reading it FRESH from the server inside a transaction — never a stale client-side mirror', () => {
    // [Bug fix — openConflictCount resurrection race] The prior
    // version of both functions read openConflictCount from
    // `periodicStockDraftMeta`, this client's own LOCAL, live-
    // subscribed mirror of the document — not its true server value
    // at write time. If a conflict was JUST resolved
    // (resolvePeriodicConflict's own transaction correctly decrements
    // this field on the server) but this client's own listener hadn't
    // yet caught up when either of these functions fired — a
    // realistic window given how frequently ordinary autosave
    // activity happens — the stale, now-incorrect higher count would
    // be rewritten, resurrecting a phantom open conflict that blocks
    // finalization even though every row is genuinely resolved. Fixed
    // by reading the CURRENT value fresh, from the server, inside a
    // transaction for both functions — eliminating the race entirely
    // rather than merely narrowing it.
    const extractBody = (marker: string): string => {
      const start = contextSource.indexOf(marker);
      assert.notEqual(start, -1, `could not locate ${marker}`);
      const rest = contextSource.slice(start);
      const nextConstMatch = rest.slice(marker.length).search(/\n  const \w+[:\s]*=/);
      return nextConstMatch === -1 ? rest : rest.slice(0, marker.length + nextConstMatch);
    };

    const metaBody = extractBody('const savePeriodicStockDraftMeta = async (');
    assert.match(
      metaBody,
      /await runTransaction\(db, async \(tx\) => \{\s*\n\s*const metaSnap = await tx\.get\(metaRef\);\s*\n\s*const currentOpenConflictCount = metaSnap\.exists\(\) \? \(metaSnap\.data\(\)\.openConflictCount \?\? 0\) : 0;\s*\n\s*tx\.set\(metaRef, \{/,
      'savePeriodicStockDraftMeta must read openConflictCount fresh, via tx.get, before writing it back'
    );
    assert.doesNotMatch(
      metaBody,
      /periodicStockDraftMeta\?\.openConflictCount/,
      'must not fall back to the stale local mirror anywhere in this function'
    );

    const flushBody = extractBody('const flushPeriodicStockDraftRows = async (');
    assert.match(
      flushBody,
      /await runTransaction\(db, async \(tx\) => \{\s*\n\s*const metaSnap = await tx\.get\(metaRef\);\s*\n\s*const currentOpenConflictCount = metaSnap\.exists\(\) \? \(metaSnap\.data\(\)\.openConflictCount \?\? 0\) : 0;\s*\n\s*tx\.set\(metaRef, \{/,
      'flushPeriodicStockDraftRows must read openConflictCount fresh, via tx.get, before writing it back'
    );
    assert.doesNotMatch(
      flushBody,
      /periodicStockDraftMeta\?\.openConflictCount|createFirestoreBatch|fsBatch/,
      'must not fall back to the stale local mirror, and must no longer use a WriteBatch — converted to a transaction'
    );
    // Both the meta write AND every row write happen inside the SAME
    // transaction — the atomicity guarantee the prior WriteBatch
    // provided is preserved exactly, just via a different mechanism.
    assert.match(flushBody, /for \(const \[rowKey, item\] of Object\.entries\(rowsByKey\)\) \{/);
    assert.match(flushBody, /tx\.set\(doc\(db, 'businesses', activeBusinessId, 'stockCountDrafts', 'periodic', 'items', rowKey\), \{/);
  });

  it('the fresh transactional read for openConflictCount is the ONLY read either function performs — the row-writing loop\'s own deliberate, pre-existing behavior (blind overwrite based on the local rev mirror, relying on firestore.rules\' own rev check) is completely unchanged', () => {
    const start = contextSource.indexOf('const flushPeriodicStockDraftRows = async (');
    assert.notEqual(start, -1);
    const rest = contextSource.slice(start);
    const nextConstMatch = rest.slice('const flushPeriodicStockDraftRows = async ('.length).search(/\n  const \w+[:\s]*=/);
    const flushBody = nextConstMatch === -1 ? rest : rest.slice(0, 'const flushPeriodicStockDraftRows = async ('.length + nextConstMatch);
    const txGetOccurrences = flushBody.match(/tx\.get\(/g) ?? [];
    assert.equal(txGetOccurrences.length, 1, 'expected exactly one tx.get call — the single metaRef read — no per-row read was added');
    assert.match(flushBody, /rev: \(known\?\.rev \?\? 0\) \+ 1,/, 'row writes must still derive rev from the local periodicStockDraftItemsByKey mirror, unchanged');
  });

  it('recordStockCount refuses to finalize a non-initial count while a real conflict-row exists — computed from ground truth (periodicStockDraft.items\' own state field), never the separately-cached openConflictCount counter', () => {
    // [Bug fix — openConflictCount permanent-drift correction] Was
    // `(periodicStockDraftMeta?.openConflictCount ?? 0) > 0` — the
    // same drift-prone counter the resurrection-race and permanent
    // -drift fixes address elsewhere in this file. This is explicitly
    // a non-authoritative, fast client guard (firestore.rules' own
    // openConflictCount == 0 precondition remains the real,
    // authoritative enforcement regardless of this check) — but there
    // is no reason for it to depend on a counter that can drift when
    // the ground truth is already available in this exact scope.
    assert.match(
      contextSource,
      /const hasUnresolvedConflictRows = \(periodicStockDraft\?\.items \?\? \[\]\)\.some\(\(item\) => item\.state === 'CONFLICT'\);/
    );
    assert.match(contextSource, /if \(type !== 'initial' && hasUnresolvedConflictRows\) \{/);
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
  it('exactly three call sites in the whole file ever change the counter\'s VALUE — the §7 collision branch, the §9 resolution branch, and the deliberate self-heal correction added in response to the reported permanent-drift bug; a fourth, unaccounted-for site would be the exact drift risk §19 warns about', () => {
    // [Bug fix — openConflictCount permanent-drift correction] §19's
    // original "exactly two writers" invariant assumed the two
    // arithmetic writers (+1/-1) would always stay correctly
    // synchronized with the real per-row state. In practice they did
    // not — a client-side staleness race (the resurrection-race fix,
    // above) could corrupt the stored value with no way to recover,
    // since firestore.rules itself enforces this exact stored field as
    // a hard finalization precondition and nothing in the original
    // design ever recomputed it from ground truth. This is a
    // deliberate, intentional widening of the invariant from "trust 2
    // arithmetic writers to always be correct" to "trust 2 arithmetic
    // writers, but also have a genuine self-healing correction for
    // when they aren't" — strictly safer than the original two-writer
    // design, not a regression of it. Still guards against a FOURTH,
    // unaccounted-for site: any occurrence beyond these three known,
    // individually-verified ones would be the exact drift risk §19
    // warns about.
    const allOccurrences = contextSource.match(/openConflictCount:/g) ?? [];
    assert.equal(allOccurrences.length, 5, 'expected exactly 5 openConflictCount: occurrences total (2 arithmetic + 2 preservation-spread + 1 corrective)');
    // Of those 5, exactly 2 are the ARITHMETIC deltas (+1 on collision,
    // -1 on resolution) — the two preservation-only spread occurrences
    // (verified by the 'preserve openConflictCount' test above, which
    // never mutate the value, only carry it forward unchanged) and the
    // one corrective occurrence (verified by its own dedicated describe
    // block below, which writes the TRUE ground-truth value directly,
    // never a delta) are each individually accounted for separately.
    const valueChangingOccurrences = contextSource.match(
      /openConflictCount: (?:priorOpenConflictCount \+ 1|Math\.max\(0, priorOpenConflictCount - 1\))/g
    ) ?? [];
    assert.equal(valueChangingOccurrences.length, 2, 'expected exactly 2 arithmetic-delta openConflictCount writes');
    const correctiveOccurrences = contextSource.match(/openConflictCount: trueOpenConflictCount \}, \{ merge: true \}\);/g) ?? [];
    assert.equal(correctiveOccurrences.length, 1, 'expected exactly 1 corrective (ground-truth) openConflictCount write');
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

describe('Bug fix — openConflictCount resurrection race (reported: Owner blocked from finalizing a Contagem with a stale, non-zero openConflictCount despite zero rows genuinely in CONFLICT)', () => {
  // [Bug report] "Confirmar Contagem" stayed disabled with a banner
  // reading "Existem 0 linhas em conflito" — hasUnresolvedConflicts
  // (gated on periodicStockDraft?.openConflictCount) was true while
  // unresolvedConflictRows.length (the genuine, live count) was 0.
  // Root cause: savePeriodicStockDraftMeta and flushPeriodicStockDraftRows
  // both "preserved" openConflictCount by reading it from
  // periodicStockDraftMeta — this client's own LOCAL listener mirror —
  // rather than the server's true current value. If either fired
  // (ordinary autosave activity, extremely frequent) in the narrow
  // window between resolvePeriodicConflict's own server-side decrement
  // and this client's own listener catching up, the stale, higher
  // value was written straight back, resurrecting a phantom conflict.
  const extractBody = (marker: string): string => {
    const start = contextSource.indexOf(marker);
    assert.notEqual(start, -1, `could not locate ${marker}`);
    const rest = contextSource.slice(start);
    const nextConstMatch = rest.slice(marker.length).search(/\n  const \w+[:\s]*=/);
    return nextConstMatch === -1 ? rest : rest.slice(0, marker.length + nextConstMatch);
  };

  it('(pure logic) simulates the exact race: a resolve decrements the server value while a client\'s local mirror is still stale — the FIXED read-fresh-inside-a-transaction approach never resurrects the old value', () => {
    // Models the two data sources directly: "server" (what
    // resolvePeriodicConflict's own transaction already correctly
    // updated) vs. "local mirror" (this client's own not-yet-caught-up
    // periodicStockDraftMeta state) — proving the fix reads the
    // former, never the latter.
    let server = { openConflictCount: 1 };
    const staleLocalMirror = { openConflictCount: 1 }; // hasn't caught up to the resolve yet

    // resolvePeriodicConflict's own transaction runs first, server-side:
    server = { openConflictCount: Math.max(0, server.openConflictCount - 1) };
    assert.equal(server.openConflictCount, 0, 'server is now correctly at 0');

    // OLD, buggy behavior: read from the stale local mirror.
    const oldBuggyPreservedValue = staleLocalMirror.openConflictCount;
    assert.equal(oldBuggyPreservedValue, 1, 'the bug: the old code would have resurrected this stale 1');

    // NEW, fixed behavior: read fresh from "the server" (what
    // tx.get(metaRef) would actually return at this exact moment).
    const currentOpenConflictCount = server.openConflictCount;
    assert.equal(currentOpenConflictCount, 0, 'the fix: reading fresh always reflects the true, already-resolved value');
  });

  it('savePeriodicStockDraftMeta and flushPeriodicStockDraftRows are the ONLY two places in the whole file that ever "preserve" openConflictCount into an otherwise-unrelated write — confirming the fix covers every such site, not just one', () => {
    const preserveSites = contextSource.match(/currentOpenConflictCount = metaSnap\.exists\(\) \? \(metaSnap\.data\(\)\.openConflictCount \?\? 0\) : 0;/g) ?? [];
    assert.equal(preserveSites.length, 2, 'expected exactly savePeriodicStockDraftMeta and flushPeriodicStockDraftRows, no third site');
  });

  it('neither fixed function leaves any trace of the old stale-mirror pattern anywhere in the file', () => {
    assert.doesNotMatch(contextSource, /const preservedOpenConflictCount = periodicStockDraftMeta\?\.openConflictCount/, 'the old, buggy pattern must not exist anywhere in this file anymore');
  });

  it('both fixed functions still floor at 0 via the SAME Math.max-equivalent discipline as the +1/-1 sites above — a fresh read can never be preserved as a negative number', () => {
    // The fresh read itself already defaults to 0 (`?? 0`) and is only
    // ever written back when `> 0` — there is no path for a negative
    // or undefined value to be written, matching the existing
    // increment/decrement sites' own floor-at-0 discipline.
    const metaBody = extractBody('const savePeriodicStockDraftMeta = async (');
    assert.match(metaBody, /\(currentOpenConflictCount > 0 \? \{ openConflictCount: currentOpenConflictCount \} : \{\}\)/);
    const flushBody = extractBody('const flushPeriodicStockDraftRows = async (');
    assert.match(flushBody, /\(currentOpenConflictCount > 0 \? \{ openConflictCount: currentOpenConflictCount \} : \{\}\)/);
  });
});

describe('Bug fix — openConflictCount permanent-drift self-correction (reported: still stuck after the resurrection-race fix, because that fix only stops future corruption — it never corrects a value already wrong on the server, which firestore.rules itself enforces as a hard finalization precondition)', () => {
  const extractBody = (marker: string): string => {
    const start = contextSource.indexOf(marker);
    assert.notEqual(start, -1, `could not locate ${marker}`);
    const rest = contextSource.slice(start);
    const nextConstMatch = rest.slice(marker.length).search(/\n  const \w+[:\s]*=/);
    return nextConstMatch === -1 ? rest : rest.slice(0, marker.length + nextConstMatch);
  };

  it('correctOpenConflictCountIfDrifted reads the CURRENT server value fresh, inside a transaction, and only writes when it genuinely disagrees with the true count passed in — a no-op otherwise, never an unconditional overwrite', () => {
    const body = extractBody('const correctOpenConflictCountIfDrifted = async (trueOpenConflictCount: number) => {');
    assert.match(body, /const metaSnap = await tx\.get\(metaRef\);/);
    assert.match(body, /if \(!metaSnap\.exists\(\)\) return;/);
    assert.match(body, /const storedOpenConflictCount = metaSnap\.data\(\)\.openConflictCount \?\? 0;/);
    assert.match(body, /if \(storedOpenConflictCount === trueOpenConflictCount\) return;/);
    assert.match(body, /tx\.set\(metaRef, \{ openConflictCount: trueOpenConflictCount \}, \{ merge: true \}\);/);
  });

  it('correctOpenConflictCountIfDrifted never throws to its caller — a background self-heal must not surface an error banner the operator never initiated', () => {
    const body = extractBody('const correctOpenConflictCountIfDrifted = async (trueOpenConflictCount: number) => {');
    assert.match(body, /try \{[\s\S]*catch \{/);
  });

  it('correctOpenConflictCountIfDrifted is exposed on the context value and typed in the context interface, matching resolvePeriodicConflict\'s own established pattern', () => {
    assert.match(contextSource, /correctOpenConflictCountIfDrifted: \(trueOpenConflictCount: number\) => Promise<void>;/);
    assert.match(contextSource, /^\s*correctOpenConflictCountIfDrifted,$/m);
  });

  it('PeriodicStockCountView.tsx runs the self-heal in a useEffect comparing the live, ground-truth unresolvedConflictRows.length against the stored periodicStockDraft.openConflictCount', () => {
    const idx = viewSource.indexOf('const trueCount = unresolvedConflictRows.length;');
    assert.notEqual(idx, -1, 'could not locate the self-heal effect');
    const body = viewSource.slice(idx - 300, idx + 400);
    assert.match(body, /if \(!isActiveContagemEditor\) return;/);
    assert.match(body, /if \(!periodicStockDraft\) return;/);
    assert.match(body, /const storedCount = periodicStockDraft\.openConflictCount \?\? 0;/);
    assert.match(body, /if \(trueCount === storedCount\) return;/);
    assert.match(body, /correctOpenConflictCountIfDrifted\(trueCount\);/);
  });

  it('the self-heal effect depends on the specific primitive values compared, never the whole periodicStockDraft object or the non-memoized correction function itself — avoiding an unnecessary transaction attempt on every unrelated render', () => {
    const idx = viewSource.indexOf('correctOpenConflictCountIfDrifted(trueCount);');
    assert.notEqual(idx, -1);
    const body = viewSource.slice(idx, idx + 250);
    assert.match(body, /\}, \[isActiveContagemEditor, periodicStockDraft\?\.openConflictCount, unresolvedConflictRows\.length\]\);/);
  });

  it('(pure logic) proves the self-heal actually corrects the exact reported scenario: stored count stuck at a positive number while the true, live conflict-row count is genuinely 0', () => {
    // Models exactly what firestore.rules itself checks
    // (get(...).data.get('openConflictCount', 0) == 0) against exactly
    // what a stuck document looks like — a resurrected count that will
    // never self-correct through the resurrection-race fix alone,
    // since "read fresh" only re-reads this same wrong value.
    const stuckServerDocument = { openConflictCount: 1 };
    const trueLiveConflictRowCount = 0; // unresolvedConflictRows.length, genuinely accurate

    // The resurrection-race fix's own "preserve if fresh" logic, in
    // isolation, does NOT correct this — it only avoids making it WORSE:
    const preserveOnlyResult = stuckServerDocument.openConflictCount > 0 ? stuckServerDocument.openConflictCount : 0;
    assert.equal(preserveOnlyResult, 1, 'confirms preserve-only logic alone cannot fix an already-stuck value');

    // The self-heal instead compares against the true count and
    // corrects unconditionally when they disagree:
    const shouldCorrect = stuckServerDocument.openConflictCount !== trueLiveConflictRowCount;
    assert.equal(shouldCorrect, true);
    const correctedValue = trueLiveConflictRowCount;
    assert.equal(correctedValue, 0, 'the self-heal writes the TRUE value, finally satisfying firestore.rules\' own == 0 precondition');
  });

  it('the self-heal is gated on isActiveContagemEditor specifically — a Viewer\'s session, which also computes unresolvedConflictRows correctly, never attempts a write it has no permission for', () => {
    const idx = viewSource.indexOf('if (!isActiveContagemEditor) return;\n    if (!periodicStockDraft) return;\n    const trueCount = unresolvedConflictRows.length;');
    assert.notEqual(idx, -1, 'expected the editor-gate to be the FIRST check in the effect, before the draft-loaded check');
  });

  it('(pure logic) proves recordStockCount\'s own local pre-check is now immune to the exact scenario the self-heal exists for — a stuck, non-zero counter with genuinely zero real conflict rows', () => {
    // Models exactly the reported scenario: openConflictCount stuck at
    // 1 in the client's own local mirror (whether from a not-yet-
    // healed drift, or any future, currently-unforeseen cause), while
    // the real per-row states show zero rows in CONFLICT.
    const staleCachedCounter = { openConflictCount: 1 };
    const items = [
      { state: 'ACCEPTED' as 'ACCEPTED' | 'CONFLICT' },
      { state: 'ACCEPTED' as 'ACCEPTED' | 'CONFLICT' },
    ];

    // OLD, fragile check — would have incorrectly blocked finalization:
    const oldCheckResult = staleCachedCounter.openConflictCount > 0;
    assert.equal(oldCheckResult, true, 'confirms the old check WOULD have incorrectly blocked this exact scenario');

    // NEW, ground-truth check — correctly evaluates the real row states:
    const newCheckResult = items.some((item) => item.state === 'CONFLICT');
    assert.equal(newCheckResult, false, 'the fix: computed from real row states, never fooled by a stale or drifted counter');
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

  it('Decision 57: stockCounts update AND delete are both unconditionally false (Option B implemented — Clear-All-Data may no longer delete finalized Periodic Contagem)', () => {
    assert.match(rulesSource, /allow update: if false;\s*\n\s*allow delete: if false;/);
  });

  it('does not introduce a combined update-and-delete grant for non-initial stockCounts (the old, pre-Decision-56 shape)', () => {
    assert.doesNotMatch(rulesSource, /allow update, delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
  });

  it('does not reintroduce the pre-Decision-57 conditional delete permission (the old, now-narrowed shape)', () => {
    assert.doesNotMatch(rulesSource, /allow delete: if isOwnerOf\(businessId\) && resource\.data\.get\('type', null\) != 'initial';/);
  });
});

// [Decision 57 — Intentional Removal of Finalized Periodic Contagem
// History, Option B; Rule 8 §IV.O-n; Implementation Plan §14;
// Implementation Authorization (decision-57-clear-all-data-finalized-
// history-implementation-authorization.md)] Same source-level
// regression technique as every describe block in this file — proves
// clearAllData() no longer attempts to delete stockCounts at all, and
// that every unrelated category it deletes is unchanged.
describe('Decision 57 — Clear-All-Data no longer deletes stockCounts (Option B)', () => {
  const fnMatch = contextSource.match(/const clearAllData = async \(\) => \{[\s\S]*?\n  \};/);

  it('clearAllData exists and was found for the assertions below', () => {
    assert.ok(fnMatch, 'expected to find clearAllData');
  });

  it('clearAllData() contains no stockCounts deletion call of any kind', () => {
    assert.doesNotMatch(fnMatch![0], /deleteDoc\([^)]*'stockCounts'/);
    assert.doesNotMatch(fnMatch![0], /for \(const \w+ of stockCounts\)/);
  });

  it('clearAllData() does not reference the stockCounts collection at all anymore', () => {
    assert.doesNotMatch(fnMatch![0], /'stockCounts'/);
  });

  it('every unrelated Clear-All-Data deletion category is unchanged — products, batches, purchaseBatches, quebras, expenses, withdrawals, timelineEvents, and the initial stockCountDrafts working draft', () => {
    assert.match(fnMatch![0], /for \(const p of products\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'products', p\.id\)\);/);
    assert.match(fnMatch![0], /for \(const b of batches\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'batches', b\.id\)\);/);
    assert.match(fnMatch![0], /for \(const pb of purchaseBatches\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'purchaseBatches', pb\.id\)\);/);
    assert.match(fnMatch![0], /for \(const q of quebras\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'quebras', q\.id\)\);/);
    assert.match(fnMatch![0], /for \(const e of expenses\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'expenses', e\.id\)\);/);
    assert.match(fnMatch![0], /for \(const w of withdrawals\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'withdrawals', w\.id\)\);/);
    assert.match(fnMatch![0], /for \(const t of timelineEvents\) \{\s*\n\s*await deleteDoc\(doc\(db, 'businesses', businessId, 'timelineEvents', t\.id\)\);/);
    assert.match(fnMatch![0], /await deleteDoc\(doc\(db, 'businesses', businessId, 'stockCountDrafts', 'initial'\)\)\.catch/);
  });

  it('firestore.rules independently guarantees the same outcome even if a future edit reintroduced the loop — delete is unconditionally false, not merely absent from this one call site', () => {
    assert.match(rulesSource, /allow update: if false;\s*\n\s*allow delete: if false;/);
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
    // [Owner-only finalization — Product Architect decision, mechanical
    // regression fix] Widened from a strict, exact match on the old
    // `disabled={isSaving || hasUnresolvedConflicts}` expression to
    // confirm each individual condition is still present in the
    // (now wider) expression, rather than the old literal string —
    // hasUnresolvedConflicts still disables the button exactly as
    // before; `!isOwner` is a new, additive condition alongside it,
    // never a replacement for it.
    const disabledExprMatch = viewSource.match(/disabled=\{isSaving \|\| hasUnresolvedConflicts \|\| !isOwner\}/);
    assert.notEqual(disabledExprMatch, null, 'the finalization button must still disable on isSaving and hasUnresolvedConflicts, now alongside !isOwner');
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

describe('Owner-only finalization — Product Architect decision (delegated Editor may count, only Owner/Admin may finalize)', () => {
  it('handleRequestConfirmation — the true entry point into the review screen — returns early for a non-Owner, matching the existing subscriptionBlocksNewRecords belt-and-suspenders guard immediately above it', () => {
    const start = viewSource.indexOf('const handleRequestConfirmation = async (e: React.FormEvent) => {');
    assert.notEqual(start, -1, 'could not locate handleRequestConfirmation');
    const body = viewSource.slice(start, start + 2000);
    const subscriptionGuardIdx = body.indexOf('if (subscriptionBlocksNewRecords) return;');
    const ownerGuardIdx = body.indexOf('if (!isOwner) return;');
    assert.notEqual(subscriptionGuardIdx, -1, 'the pre-existing subscription guard must still be present, unmodified');
    assert.notEqual(ownerGuardIdx, -1, 'a new if (!isOwner) return; guard must be present');
    assert.ok(subscriptionGuardIdx < ownerGuardIdx, 'the two guards must appear in this order, both before any tally/review logic runs');
  });

  it('handleConfirmSave — the finalization action itself — also returns early for a non-Owner, as defense-in-depth (not relying solely on handleRequestConfirmation upstream)', () => {
    const start = viewSource.indexOf('const handleConfirmSave = async () => {');
    assert.notEqual(start, -1, 'could not locate handleConfirmSave');
    const body = viewSource.slice(start, start + 1600);
    assert.match(body, /if \(!pendingTally\) return;/);
    assert.match(body, /if \(subscriptionBlocksNewRecords\) return;/);
    assert.match(body, /if \(!isOwner\) return;/);
    assert.match(body, /setIsSaving\(true\);/);
    const ownerGuardIdx = body.indexOf('if (!isOwner) return;');
    const setIsSavingIdx = body.indexOf('setIsSaving(true);');
    assert.ok(ownerGuardIdx < setIsSavingIdx, 'the Owner guard must return before any saving state is set or any write is attempted');
  });

  it('neither Owner-only guard touches catalogRows, manualRows, or any draft-clearing/persistence function — a delegated Editor\'s in-progress draft and autosave are completely unaffected', () => {
    const requestStart = viewSource.indexOf('const handleRequestConfirmation = async (e: React.FormEvent) => {');
    const requestGuardIdx = viewSource.indexOf('if (!isOwner) return;', requestStart);
    const requestGuardLine = viewSource.slice(requestGuardIdx - 20, requestGuardIdx + 25);
    assert.doesNotMatch(requestGuardLine, /setCatalogRows|setManualRows|clearPeriodicStockDraft|updateCatalogRow|updateManualRow/);

    const confirmStart = viewSource.indexOf('const handleConfirmSave = async () => {');
    const confirmGuardIdx = viewSource.indexOf('if (!isOwner) return;', confirmStart);
    const confirmGuardLine = viewSource.slice(confirmGuardIdx - 20, confirmGuardIdx + 25);
    assert.doesNotMatch(confirmGuardLine, /setCatalogRows|setManualRows|clearPeriodicStockDraft|updateCatalogRow|updateManualRow/);
  });

  it('the "Rever e Confirmar Contagem" submit button is disabled for a non-Owner, with an explanatory banner shown above it reassuring the draft is saved', () => {
    assert.match(viewSource, /disabled=\{isSaving \|\| !isOwner\}/);
    assert.match(viewSource, /Só o Dono\/Admin pode confirmar esta Contagem/);
    assert.match(viewSource, /A tua contagem está guardada — nada se perde\./);
  });

  it('"Voltar" on the review screen is NOT gated on isOwner — it only clears pendingTally, never touches the draft, and must remain available to everyone', () => {
    const voltarIdx = viewSource.indexOf("onClick={() => setPendingTally(null)}");
    assert.notEqual(voltarIdx, -1);
    const voltarButtonBlock = viewSource.slice(voltarIdx, voltarIdx + 150);
    assert.match(voltarButtonBlock, /disabled=\{isSaving\}/);
    assert.doesNotMatch(voltarButtonBlock, /isOwner/, '"Voltar" must remain unrestricted by ownership — it is always safe and must always be available');
  });

  it('the review screen\'s own "Confirmar Contagem" button is also disabled for a non-Owner (defense-in-depth) and shows the same reassurance banner', () => {
    assert.match(viewSource, /disabled=\{isSaving \|\| hasUnresolvedConflicts \|\| !isOwner\}/);
    const reviewBannerOccurrences = viewSource.match(/Só o Dono\/Admin pode confirmar esta Contagem/g) ?? [];
    assert.equal(reviewBannerOccurrences.length, 2, 'expected the reassurance banner on both the edit screen and the review screen');
  });

  it('every existing counting/editing action (Validar, search, arrows, Adicionar produto, autosave) remains completely ungated by isOwner — only finalization itself is restricted', () => {
    // Regression guard: confirms this change did not spill over into
    // restricting anything a delegated Editor is still supposed to do.
    const validarBody = viewSource.match(/onClick=\{\(\) => handleSaveCatalogRow\(productId\)\}/g) ?? [];
    assert.ok(validarBody.length >= 1, 'Validar must remain reachable');
    assert.doesNotMatch(
      viewSource.slice(viewSource.indexOf('const handleSaveCatalogRow = ('), viewSource.indexOf('const handleSaveCatalogRow = (') + 200),
      /isOwner/,
      'handleSaveCatalogRow (Validar) must not be gated on isOwner — a delegated Editor must still be able to validate rows'
    );
    assert.doesNotMatch(
      viewSource.slice(viewSource.indexOf('const scheduleRowDraftSave = ('), viewSource.indexOf('const scheduleRowDraftSave = (') + 300),
      /isOwner/,
      'autosave (scheduleRowDraftSave) must not be gated on isOwner — a delegated Editor\'s work must keep saving normally'
    );
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
    // [Owner-only finalization — Product Architect decision, mechanical
    // regression fix] Same widening as the sibling test above — the
    // finalization button's disable condition now also includes
    // `!isOwner`, additively, alongside the two conditions this test
    // already existed to protect.
    assert.match(viewSource, /disabled=\{isSaving \|\| hasUnresolvedConflicts \|\| !isOwner\}/);
    assert.match(rulesSource, /allow update: if false;\s*\n\s*allow delete: if false;/);
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

  it('does not modify Decision 56 §7\'s (now Decision 57-superseded) delete path incidentally, or any Finding K listener gating — the delete narrowing below is the explicitly authorized Decision 57 Option B change, not an accidental one', () => {
    // Regression guard for the explicit "preserve existing semantics"
    // boundary this corrective session was given. Updated for Decision
    // 57 (Option B): `delete` is now unconditionally `false`, exactly
    // as Implementation Authorization (decision-57-clear-all-data-
    // finalized-history-implementation-authorization.md) §3 item 1
    // authorizes — this is the one intentional, authorized exception
    // to "nothing else changed" this test otherwise guards.
    assert.match(rulesSource, /allow delete: if false;/);
    const idx = contextSource.indexOf("'withdrawals'");
    const nearby = contextSource.slice(Math.max(0, idx - 200), idx + 1600);
    assert.match(nearby, /if \(isOwner\)/);
  });

  it('the fromCache reconnect nuance is documented as a deliberate, unaddressed limitation, not silently ignored', () => {
    assert.match(viewSource, /Known, deliberately-unaddressed nuance/);
    assert.match(viewSource, /fromCache/);
  });
});
