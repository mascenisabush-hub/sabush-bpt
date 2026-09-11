# SuperAdmin Agent Attended Support Session — Checkpoint 2: Server Foundation

**Status:** ✅ Implemented (server modules, routes, `firestore.rules`
addition, and dedicated unit-test suites written; typechecked clean).
⚠️ The rules-layer addition's own dedicated test cases (appended to
`tests/superadmin-agent-attended-support-session-firestore-rules.test.ts`)
are **typechecked, not run end-to-end** — this sandbox's network egress
does not include Google's emulator-binary infrastructure, the identical,
already-disclosed limitation Checkpoint 1's own document and
`tests/firestore-rules.test.ts`'s header carry. A clean run of
`npm run test:support-session-rules:emulator` is the actual acceptance
gate for that part of this checkpoint, not this document. The two new
plain unit-test suites (`tests/support-session-invitation.test.ts`,
`tests/support-session-consumption.test.ts`) require no emulator and
**were run end-to-end** — 21/21 passing.

**Governing chain:** `BDR-0018` → Policy → Specification (SPEC-1/2/3) →
Rule 8 (CLOSED / PASS, `312f64c`) → Implementation Authorization
(Signed, `f812aeb`) → Checkpoint 1 (session-scoped Firestore
authorization) → **this checkpoint**.

## What this checkpoint answers

Exactly what Checkpoint 1's own "Next checkpoint" note named: the
Invitation/code lifecycle (generation, consumption, lockout) and the
server route that actually establishes a Session, previously stood in
for by direct emulator seeding.

## What was added

- **`server/supportSessionInvitation.ts`** (new) — customer-triggered
  code generation (FR-1–FR-5): 6-numeric-digit code, `crypto.scrypt` +
  random salt hashing (never plaintext, I-3), server-timestamp-only
  generation time, 5-minute expiry (`INVITATION_VALIDITY_MS`), and
  unconditional supersession of any prior Invitation regardless of its
  own state (FR-2, I-2 — a plain `set()`, not a conditional
  transaction, since the requirement is "always overwrite," not
  "overwrite if idle"). Membership check is `isMemberOf`-equivalent
  (any tenant role — Owner, Manager, or ordinary Staff), never
  Owner-only, matching Checkpoint 1's own rules-test fixture comment
  ("the customer can be non-Owner too").
- **`server/supportSessionConsumption.ts`** (new) — code entry,
  verification, atomic consumption, lockout, and Session establishment
  (FR-9–FR-17), inside one Firestore transaction mirroring
  `consumeInitialStockRecoveryAuthorization`'s own shape: locked/
  consumed/expired short-circuits (with a lazy `status: 'expired'`
  write when time-expiry is discovered, FR-6/FR-7), constant-time code
  verification (`crypto.timingSafeEqual`), a per-Invitation
  `failedAttempts` counter with 5th-failure permanent lock (FR-13–
  FR-16), and — on success — atomic Invitation-consumed +
  Session-created writes bound to the entering `operatorUid`, unbound
  to any prior relationship with the business (FR-11, FR-12, I-4, I-5).
  `sessionId` is a Firestore auto-id (`.doc()`, no client-supplied
  value). `customerUid` is sourced from the Invitation's own
  `generatedByUid` (a field this checkpoint adds to the Specification
  §22 sketch, additively — see the module's own header).
- **`server/superadminAuth.ts`:** `requireSupportEligibleOperator` — a
  new, DISTINCT gate (support/developer/superadmin), never built by
  relaxing `requireSuperAdmin` (FR-40's own explicit instruction).
  Currently structurally equivalent to the `requirePlatformOperator`
  floor check (since all three platformRole values are already the
  full eligible set), but exists as its own named gate so this
  capability's authorization requirement is never coupled to
  `requireSuperAdmin`'s.
- **`server/index.ts`:** two new routes —
  `POST /api/business/support-session/generate-code` (tenant-side,
  `tenantOnly` + `requireAuth`) and
  `POST /api/superadmin/support-session/consume-code`
  (`requireAuth` + `requirePlatformOperator` +
  `requireSupportEligibleOperator`) — plus `platform_audit_log` writes
  for `support_session.invited`, `.established`,
  `.code_attempt_failed`, `.locked`, and `.invitation_expired` (FR-44),
  written as a separate step after each module call settles, per this
  codebase's established audit-atomicity discipline
  (`platformAuditLog.ts`'s own header).
- **`server/auditLogQuery.ts`:** `KNOWN_ACTION_TYPES` extended with all
  nine `support_session.*` values FR-44's table names (FR-45) — the
  four not yet written by this checkpoint (`ended_by_customer`,
  `ended_by_support`, `completed`, `ended_by_abandonment`) are included
  now so later checkpoints need no second allowlist-maintenance change.
- **`packages/shared-types/index.ts`:** `PlatformAuditLogEntry.actorRole`
  additively widened to accept `'customer'` — the tenant user who
  triggers `support_session.invited`, following the exact same
  additive-widening pattern the existing `'owner'`/`'system'` values
  already established.
- **`firestore.rules`:** a new `supportSessionInvitation/{docId}` block
  (nested under `/businesses/{businessId}`, placed immediately before
  Checkpoint 1's `supportSessions` block) — `allow read: if
  isMemberOf(businessId)`, `allow write: if false` (Admin-SDK-only,
  matching `initialStockRecoveryAuthorization`'s own precedent exactly).
  No platform-operator read grant exists on this collection at all — a
  Support operator's only interaction with it is via the
  consume-code route, entirely server-mediated.
- **`tests/support-session-invitation.test.ts`** (new, 7 cases) and
  **`tests/support-session-consumption.test.ts`** (new, 14 cases) —
  plain unit tests against the real, importable modules and an
  in-memory fake `Db`, following
  `tests/superadmin-initial-stock-recovery-authorization.test.ts`'s own
  established pattern and its own disclosed concurrency-testing scope
  limit (sequential precondition verification is necessary but not
  sufficient for true concurrent-transaction safety, which needs a live
  emulator/Firestore instance this sandbox cannot reach). **Run and
  passing: 21/21.**
- **`tests/superadmin-agent-attended-support-session-firestore-rules.test.ts`**
  extended (not replaced) with a `supportSessionInvitation/current`
  describe block (4 cases: member read, cross-tenant read denial,
  platform-operator read denial even with a legitimate session
  elsewhere on the same business, and the Admin-SDK-only write
  boundary). Typechecked; not run end-to-end (see Status above).
- **`package.json`:** `test:support-session-invitation` and
  `test:support-session-consumption` scripts, added to the `test:all`
  chain.

## What this checkpoint deliberately does NOT cover

Per the Product Architect's staged sequence, exactly as the Checkpoint
2 prompt's own "GOVERNANCE STOP CONDITION" and Step 17 boundary list
require — none of the following exist anywhere in this checkpoint's
diff:

- WebRTC, screen sharing, TURN, `RTCPeerConnection` (Desktop checkpoint).
- Support View State document content/schema, mobile rendering
  (Mobile/Support-View-State checkpoint) — only the read/write
  authorization boundary on `supportViewState` exists, unchanged from
  Checkpoint 1.
- Pointer rendering / `pointer-events: none` (Pointer checkpoint).
- Heartbeat transition logic, `active`→`reconnecting`→`ended` state
  machine, grace period (Heartbeat checkpoint) — the Session document
  this checkpoint creates includes `lastHeartbeatAt`/
  `lastOperatorHeartbeatAt`/`graceExpiresAt` fields (all `null` at
  establishment) for shape-realism only, exactly as Checkpoint 1's own
  rules-test fixtures already did.
- Customer support banner / disconnect UI (Customer Transparency
  checkpoint).
- `renderingPath` determination — left `null` at establishment,
  deliberately not invented (Checkpoint 2 prompt Step 8 names only
  `sessionId`, `businessId`, customer participant identity,
  `operatorUid`, session status, and `expiresAt` as this checkpoint's
  minimum required Session fields).
- Session termination (`ended_by_customer`, `ended_by_support`,
  `completed`, `ended_by_abandonment`) — no route in this checkpoint
  writes these; their `actionType` values are pre-added to the
  allowlist (see above) but unused until their own checkpoint.

## Traceability

| Item | Governing FR / Invariant | 
|---|---|
| Code generation, hashing, expiry | FR-1–FR-7, I-1, I-3 |
| Failed-attempt lockout | FR-13–FR-16, I-4 |
| Atomic consumption, operator/business binding | FR-9–FR-12, I-4, I-5 |
| Session establishment, 60-minute non-renewable `expiresAt` | FR-17, FR-18, I-11 |
| `requireSupportEligibleOperator` — distinct gate, never `requireSuperAdmin` relaxed | FR-40 |
| Business-re-verified `businessId` param on both routes | FR-38, Rule K |
| Audit entries, `KNOWN_ACTION_TYPES` maintenance | FR-44, FR-45, FR-46 |
| No tenant-owned-collection writes from either route | FR-43 |
| `supportSessionInvitation` rules: member-read / Admin-SDK-write | (data-model §22 authorization shape, consistent with I-12's own no-`isPlatformOperator()`-alone principle) |

## Next checkpoint

**Checkpoint 3 — Bidirectional heartbeat and reconnection:**
`lastHeartbeatAt`/`lastOperatorHeartbeatAt` transition logic, the
`active`→`reconnecting`→`ended` state machine, the 2-minute grace
period capped at the Session's own 60-minute `expiresAt` (FR-54 as
amended, FR-55–FR-61, I-10, I-11) — the fields this checkpoint's
Session document already carries as `null` placeholders.
