// SuperAdmin Agent Attended Support Session — Checkpoint 2: Invitation
// generation tests (server/supportSessionInvitation.ts).
//
// Governing chain: BDR-0018 -> Policy -> Specification (SPEC-1/2/3) ->
// Rule 8 (CLOSED / PASS, 312f64c) -> Implementation Authorization
// (Signed, 2026-09-11) -> Checkpoint 2.
//
// Same convention as tests/superadmin-initial-stock-recovery-authorization.test.ts:
// no suite imports server/index.ts directly — this suite exercises the
// real, importable module against an in-memory fake satisfying
// SupportSessionInvitationDb.
//
// HOW TO RUN:
//   npx tsx --test tests/support-session-invitation.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  generateSupportSessionInvitation,
  INVITATION_VALIDITY_MS,
  type SupportSessionInvitationDb,
  type ServerTimestamp,
  type TimestampFactory,
} from '../server/supportSessionInvitation';

function fakeTimestamp(ms: number): ServerTimestamp {
  return { toMillis: () => ms };
}

function makeClock(nowMs: number): TimestampFactory {
  return {
    now: () => fakeTimestamp(nowMs),
    fromMillis: (ms: number) => fakeTimestamp(ms),
  };
}

interface FakeStore {
  users: Record<string, Record<string, unknown> | undefined>;
  invitations: Record<string, Record<string, unknown> | undefined>;
}

function makeFakeDb(seed: {
  users?: Record<string, Record<string, unknown>>;
}): SupportSessionInvitationDb & { store: FakeStore } {
  const store: FakeStore = {
    users: { ...(seed.users ?? {}) },
    invitations: {},
  };

  return {
    store,
    collection(name: 'users' | 'businesses') {
      if (name === 'users') {
        return {
          doc(uid: string) {
            return {
              async get() {
                const data = store.users[uid];
                return { exists: !!data, data: () => data };
              },
            };
          },
        } as any;
      }
      return {
        doc(businessId: string) {
          return {
            collection(_sub: 'supportSessionInvitation') {
              return {
                doc(_docId: 'current') {
                  return {
                    async get() {
                      const data = store.invitations[businessId];
                      return { exists: !!data, data: () => data };
                    },
                    async set(data: Record<string, unknown>) {
                      store.invitations[businessId] = data;
                      return {};
                    },
                  };
                },
              };
            },
          };
        },
      } as any;
    },
  } as any;
}

describe('generateSupportSessionInvitation', () => {
  it('generates a 6-digit code for a member and never persists it in plaintext', async () => {
    const db = makeFakeDb({ users: { alice: { businessId: 'biz1' } } });
    const clock = makeClock(1_000_000);

    const result = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'alice' });

    assert.equal(result.outcome, 'generated');
    if (result.outcome !== 'generated') return;
    assert.match(result.code, /^\d{6}$/);
    assert.equal(result.generatedAt.toMillis(), 1_000_000);
    assert.equal(result.expiresAt.toMillis(), 1_000_000 + INVITATION_VALIDITY_MS);

    const stored = db.store.invitations['biz1']!;
    assert.equal(stored.status, 'active');
    assert.equal(stored.failedAttempts, 0);
    assert.equal(stored.lockedAt, null);
    assert.equal(stored.consumedByUid, null);
    assert.equal(stored.generatedByUid, 'alice');
    assert.notEqual(stored.codeHash, result.code);
    assert.ok(typeof stored.codeHash === 'string' && (stored.codeHash as string).length > 0);
    assert.ok(typeof stored.codeSalt === 'string' && (stored.codeSalt as string).length > 0);
    // Plaintext code never appears anywhere in the stored document.
    assert.equal(JSON.stringify(stored).includes(result.code), false);
  });

  it('allows a non-Owner staff member to generate a code (isMemberOf, not isOwnerOf)', async () => {
    const db = makeFakeDb({ users: { staffUid: { businessId: 'biz1', role: 'staff' } } });
    const clock = makeClock(0);

    const result = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'staffUid' });
    assert.equal(result.outcome, 'generated');
  });

  it('allows a multi-shop owner via businessIds[]', async () => {
    const db = makeFakeDb({ users: { owner: { businessIds: ['biz1', 'biz2'] } } });
    const clock = makeClock(0);

    const result = await generateSupportSessionInvitation(db, clock, { businessId: 'biz2', requesterUid: 'owner' });
    assert.equal(result.outcome, 'generated');
  });

  it('rejects a requester who is not a member of the business', async () => {
    const db = makeFakeDb({ users: { alice: { businessId: 'biz2' } } });
    const clock = makeClock(0);

    const result = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'alice' });
    assert.equal(result.outcome, 'not-member');
  });

  it('rejects an unknown requester', async () => {
    const db = makeFakeDb({ users: {} });
    const clock = makeClock(0);

    const result = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'ghost' });
    assert.equal(result.outcome, 'requester-not-found');
  });

  it('FR-2/I-2: unconditionally overwrites a prior Invitation regardless of its own state', async () => {
    const db = makeFakeDb({ users: { alice: { businessId: 'biz1' } } });
    db.store.invitations['biz1'] = { status: 'locked', failedAttempts: 5, codeHash: 'stale', codeSalt: 'stale' };
    const clock = makeClock(5000);

    const result = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'alice' });
    assert.equal(result.outcome, 'generated');

    const stored = db.store.invitations['biz1']!;
    assert.equal(stored.status, 'active');
    assert.equal(stored.failedAttempts, 0);
    assert.notEqual(stored.codeHash, 'stale');
  });

  it('generates a different code/hash on each call (not deterministic)', async () => {
    const db = makeFakeDb({ users: { alice: { businessId: 'biz1' } } });
    const clock = makeClock(0);

    const first = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'alice' });
    const second = await generateSupportSessionInvitation(db, clock, { businessId: 'biz1', requesterUid: 'alice' });
    assert.equal(first.outcome, 'generated');
    assert.equal(second.outcome, 'generated');
    if (first.outcome !== 'generated' || second.outcome !== 'generated') return;
    // Extremely unlikely to collide across two independent random draws;
    // not a security property, just a sanity check that generation is
    // actually randomized.
    assert.notEqual(first.code, second.code);
  });
});
