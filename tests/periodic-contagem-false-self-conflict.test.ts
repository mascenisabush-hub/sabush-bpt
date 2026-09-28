// Regression: a person's own consecutive edits to a draft row must never be
// flagged as a conflict with themselves just because the live listener lagged
// their own last commit. A genuinely stale second device must still conflict.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSameWriterSelfCorrection } from '../apps/tenant/src/lib/periodicDraftSelfCorrection';

const ME = 'uid-me';
const base = {
  currentUserUid: ME,
  currentLastWriterUid: ME as string | undefined,
};

describe('isSameWriterSelfCorrection', () => {
  it('accepts when the write is based on the current server rev (unchanged behaviour)', () => {
    assert.equal(
      isSameWriterSelfCorrection({ ...base, baseRev: 4, currentRev: 4, currentLastWriteAt: 't4', ownLastCommit: undefined }),
      true
    );
  });

  it('accepts when the caller supplies no base rev (unchanged behaviour)', () => {
    assert.equal(
      isSameWriterSelfCorrection({ ...base, baseRev: undefined, currentRev: 4, currentLastWriteAt: 't4', ownLastCommit: undefined }),
      true
    );
  });

  it('THE BUG: listener lags this device\'s own last commit -> still a self-correction', () => {
    // Listener still shows rev 3, but this device itself committed rev 4 at t4.
    assert.equal(
      isSameWriterSelfCorrection({
        ...base,
        baseRev: 3,
        currentRev: 4,
        currentLastWriteAt: 't4',
        ownLastCommit: { rev: 4, lastWriteAt: 't4' },
      }),
      true
    );
  });

  it('dormant same-account device (never wrote this row) still conflicts', () => {
    assert.equal(
      isSameWriterSelfCorrection({ ...base, baseRev: 2, currentRev: 4, currentLastWriteAt: 't4', ownLastCommit: undefined }),
      false
    );
  });

  it('dormant device whose own last commit was overtaken by a newer write still conflicts', () => {
    // It committed rev 3 at t3; the active device has since written rev 4 at t4
    // (same UID). The server's current document is no longer its own commit.
    assert.equal(
      isSameWriterSelfCorrection({
        ...base,
        baseRev: 3,
        currentRev: 4,
        currentLastWriteAt: 't4',
        ownLastCommit: { rev: 3, lastWriteAt: 't3' },
      }),
      false
    );
  });

  it('a remembered commit from an earlier count (row key reused, rev reset) cannot match', () => {
    // Previous count left rev 4 @ old timestamp; the new count's row is rev 4 @ a different time.
    assert.equal(
      isSameWriterSelfCorrection({
        ...base,
        baseRev: 2,
        currentRev: 4,
        currentLastWriteAt: 'new-t4',
        ownLastCommit: { rev: 4, lastWriteAt: 'old-t4' },
      }),
      false
    );
  });

  it('a different writer is never a self-correction, even if revs line up', () => {
    assert.equal(
      isSameWriterSelfCorrection({
        currentUserUid: ME,
        currentLastWriterUid: 'someone-else',
        baseRev: 4,
        currentRev: 4,
        currentLastWriteAt: 't4',
        ownLastCommit: { rev: 4, lastWriteAt: 't4' },
      }),
      false
    );
  });
});

describe('savePeriodicStockDraftItem wiring', () => {
  const src = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf8');
  const fn = src.match(/const savePeriodicStockDraftItem = async[\s\S]*?\n  \};\n/)![0];

  it('uses the shared self-correction rule with this device\'s own last commit', () => {
    assert.match(fn, /isSameWriterSelfCorrection\(\{/);
    assert.match(fn, /ownCommittedDraftWriteRef\.current\.get\(/);
  });

  it('records the device\'s own commit for every non-conflict write branch, after the transaction commits', () => {
    assert.equal((fn.match(/committedOwnWrite = \{ rev:/g) ?? []).length, 3);
    assert.match(fn, /ownCommittedDraftWriteRef\.current\.set\(/);
    assert.ok(fn.indexOf('ownCommittedDraftWriteRef.current.set(') > fn.indexOf('await runTransaction'));
  });
});
