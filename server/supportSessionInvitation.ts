// SuperAdmin Agent Attended Support Session — Checkpoint 2: Invitation
// generation (customer-triggered code creation).
//
// Governing chain: docs/specs/BDR-0018-superadmin-agent-attended-support-session.md
// (Approved) -> docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md
// (Approved) -> docs/specs/superadmin-agent-attended-support-session-specification.md
// (Accepted, SPEC-1/2/3) -> docs/engineering/superadmin-agent-attended-support-session-rule8-assessment.md
// (CLOSED / PASS, 312f64c) -> docs/engineering/superadmin-agent-attended-support-session-implementation-authorization.md
// (Signed, SABUSHIMIKE MASCENI, 2026-09-11) -> this Checkpoint.
//
// Same extraction rationale as every other server/*.ts module in this
// codebase: server/index.ts cannot be imported by any test (Admin SDK
// init at module load), so this logic lives in its own importable
// module and the Express route in server/index.ts stays a thin
// wrapper.
//
// SCOPE (Implementation Authorization §3 item 1): this module's ONLY
// write surface is the fixed-id-per-business
// businesses/{businessId}/supportSessionInvitation/current document. It
// NEVER writes supportSessions, never touches any other tenant
// collection, and NEVER persists the plaintext code anywhere (FR-4,
// I-3) — only a salted hash, following the Clear-Data Password
// precedent's exact shape (server/index.ts's hashClearDataPassword,
// crypto.scrypt + random salt). The plaintext code is returned to the
// caller exactly once, in this function's own return value, for the
// route handler to relay to the customer's browser — never logged,
// never re-derivable from what gets written.
//
// UNCONDITIONAL OVERWRITE (FR-2, I-2): unlike
// grantInitialStockRecoveryAuthorization's conditional
// "already-active" guard, generation here always supersedes whatever
// Invitation currently exists for the business, regardless of its own
// state (active, expired, or locked) — this is Rule F's own explicit
// design, not an oversight. No transaction is needed for this reason:
// a plain set() is the correct, spec-accurate primitive, not a
// weakened version of the recovery-authorization pattern.
//
// CUSTOMER IDENTITY (Rule 8/Implementation-Authorization-level
// decision, not pre-fixed by the Specification's own proposed-not-final
// §22 data model): `generatedByUid` is added to the Invitation document
// so the audit entry FR-44 requires ("Code generated" ->
// support_session.invited, actorUid representing the customer) has a
// concrete source, and so Checkpoint 2's Session document (see
// server/supportSessionConsumption.ts) can carry a `customerUid` field
// per the Checkpoint 2 prompt's own Step 8 "customer participant
// identity" requirement. This is a strictly additive field beyond the
// Specification §22 sketch, not a contradiction of it (§22 itself is
// explicitly "proposed, not final").

import crypto from 'crypto';

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<unknown>;
}

interface UserDocRef {
  get(): Promise<DocSnap>;
}

export interface SupportSessionInvitationDb {
  collection(name: 'users'): {
    doc(uid: string): UserDocRef;
  };
  collection(name: 'businesses'): {
    doc(businessId: string): {
      collection(name: 'supportSessionInvitation'): {
        doc(docId: 'current'): DocRef;
      };
    };
  };
}

/** Minimal Admin-SDK-shaped server-clock Timestamp — satisfied by firebase-admin's real Timestamp. */
export interface ServerTimestamp {
  toMillis(): number;
}

export interface TimestampFactory {
  now(): ServerTimestamp;
  fromMillis(ms: number): ServerTimestamp;
}

/** 5 minutes, per BDR-0018/Policy Rule E, Specification FR-6. A single named constant — never re-derived or re-typed elsewhere. */
export const INVITATION_VALIDITY_MS = 5 * 60 * 1000;

export type GenerateInvitationOutcome =
  | { outcome: 'generated'; businessId: string; code: string; generatedAt: ServerTimestamp; expiresAt: ServerTimestamp }
  | { outcome: 'requester-not-found'; message: string }
  | { outcome: 'not-member'; message: string };

/**
 * Verifies, server-side, that requesterUid is a member of businessId —
 * any tenant role (Owner/Admin, Manager, or ordinary Staff), never
 * Owner-only (Specification FR-1's "within their own already-
 * authenticated tenant session" names no tier restriction, and the
 * Policy's own "Repository Precedents Examined" §3 cites
 * firestore.rules' isMemberOf — not isOwnerOf — as the relevant
 * precedent; Checkpoint 1's own rules-test fixture comment says this
 * explicitly: "the customer can be non-Owner too"). Mirrors
 * firestore.rules' isMemberOf() shape server-side: businessId either
 * matches the requester's own `businessId` field (ordinary Staff/
 * Manager/single-shop Owner) or appears in their `businessIds[]`
 * (multi-shop Owner).
 */
async function resolveIsMemberOfBusiness(
  db: SupportSessionInvitationDb,
  requesterUid: string,
  businessId: string
): Promise<'not-found' | 'not-member' | 'member'> {
  const requesterSnap = await db.collection('users').doc(requesterUid).get();
  if (!requesterSnap.exists) return 'not-found';
  const profile = requesterSnap.data() ?? {};
  const ownedBusinessIds: string[] =
    Array.isArray(profile.businessIds) && (profile.businessIds as string[]).length > 0
      ? (profile.businessIds as string[])
      : [];
  const isMember = profile.businessId === businessId || ownedBusinessIds.includes(businessId);
  return isMember ? 'member' : 'not-member';
}

/**
 * Generates (or overwrites) the business's single Attended Support
 * Session Invitation. FR-3's exactly-6-numeric-digit format, FR-4's
 * hashed-never-plaintext storage with constant-time-comparable hashing
 * (crypto.scrypt, matching the Clear-Data Password precedent exactly),
 * FR-5's server-timestamp-only generation time, FR-6's 5-minute expiry.
 *
 * Returns the plaintext code so the route handler can relay it to the
 * customer's browser in the HTTP response — this function itself never
 * logs it and never writes it anywhere.
 */
export async function generateSupportSessionInvitation(
  db: SupportSessionInvitationDb,
  clock: TimestampFactory,
  params: { businessId: string; requesterUid: string }
): Promise<GenerateInvitationOutcome> {
  const { businessId, requesterUid } = params;

  const membership = await resolveIsMemberOfBusiness(db, requesterUid, businessId);
  if (membership === 'not-found') {
    return { outcome: 'requester-not-found', message: 'Perfil do utilizador não encontrado.' };
  }
  if (membership === 'not-member') {
    return { outcome: 'not-member', message: 'Não pertence a este negócio.' };
  }

  // FR-3: exactly 6 numeric digits, including leading zeros.
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = crypto.scryptSync(code, salt, 64).toString('hex');

  const generatedAt = clock.now();
  const expiresAt = clock.fromMillis(generatedAt.toMillis() + INVITATION_VALIDITY_MS);

  const invitationRef = db.collection('businesses').doc(businessId).collection('supportSessionInvitation').doc('current');

  // FR-2/I-2: unconditional overwrite — no read-before-write needed,
  // and none performed, per this module's own header note.
  await invitationRef.set({
    codeHash,
    codeSalt: salt,
    status: 'active',
    generatedAt,
    expiresAt,
    failedAttempts: 0,
    lockedAt: null,
    consumedByUid: null,
    consumedAt: null,
    generatedByUid: requesterUid,
  });

  return { outcome: 'generated', businessId, code, generatedAt, expiresAt };
}
