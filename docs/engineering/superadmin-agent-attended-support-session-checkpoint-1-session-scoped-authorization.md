# SuperAdmin Agent Attended Support Session — Checkpoint 1: Session-Scoped Firestore Authorization

**Status:** ✅ Implemented (rules + dedicated test suite written). ⚠️ Test
suite **typechecked, not run end-to-end** — this sandbox's network
egress does not include Google's emulator-binary infrastructure
(`storage.googleapis.com`), confirmed by direct attempt. A clean run of
`npm run test:support-session-rules:emulator` is the actual acceptance
gate for this checkpoint, not this document or a passing typecheck
alone — identical in kind to the same disclosed limitation
`tests/firestore-rules.test.ts` and
`tests/superadmin-business-directory-firestore.test.ts` already carry.

**Governing chain:** `BDR-0018` → Policy → Specification (SPEC-1/2/3) →
Rule 8 (CLOSED / PASS, `312f64c`) → Implementation Authorization
(Signed, `f812aeb`) → **this checkpoint**, the first of the eight the
Product Architect's implementation sequence names.

## What this checkpoint answers

Exactly the question the Product Architect posed as the highest-risk
boundary: **can a legitimately connected Support operator read only the
active customer's own support-session data, while another platform
operator or an unrelated tenant cannot?**

## What was added

- **`firestore.rules`:** a new helper function,
  `isActiveSupportOperatorForSession(businessId, sessionId)` — the
  narrow, session-matched check Invariant I-12 and FR-63 require
  (`status ∈ {active, reconnecting}` **and**
  `operatorUid == request.auth.uid`, on top of the ordinary
  `isPlatformOperator()` eligibility floor). `isPlatformOperator()`
  never appears alone as a sufficient condition anywhere in this
  capability's rules. A new `match /supportSessions/{sessionId}` block
  (nested under `/businesses/{businessId}`) with three nested
  collections — `supportViewState`, `pointer`, `webrtcSignaling` — each
  gated by this helper (Support side) and/or `isMemberOf(businessId)`
  (customer side), per the Implementation Authorization §3 item 7 and
  §6. All writes to the `supportSessions/{sessionId}` document itself
  are refused from any client (`allow write: if false`) — session
  establishment, heartbeat, and termination remain exclusively
  server-mediated (Admin SDK), matching
  `initialStockRecoveryAuthorization`'s own convention exactly.
- **`tests/superadmin-agent-attended-support-session-firestore-rules.test.ts`:**
  a dedicated rules-emulator suite (25 cases) — the explicit,
  falsifiable test Rule 8 Finding 12-A requires: a platform operator
  **without** an active session for a business cannot read that
  business's `supportSessions`, `supportViewState`, `pointer`, or
  `webrtcSignaling` documents, plus tenant-isolation, operator-session
  binding (wrong `operatorUid`), status-check (`ended` session),
  customer-side read/write, and the Admin-SDK-only write boundary on
  the Session document itself.
- **`package.json`:** `test:support-session-rules` and
  `test:support-session-rules:emulator` scripts, matching the existing
  `test:rules`/`test:rules:emulator` convention.

## What this checkpoint deliberately does NOT cover

Per the Product Architect's staged sequence — each deferred to its own
named checkpoint, not silently included here:

- **Invitation/code lifecycle** (Checkpoint 2) — no
  `supportSessionInvitation` collection rules are added by this
  checkpoint. Its own rules text is orthogonal to the session-scoped
  read/write risk this checkpoint closes (grant/consumption is
  server-mediated regardless of what this checkpoint does), so
  deferring it does not weaken this checkpoint's own guarantee.
- **Server routes** of any kind — no `server/` file is touched. Session
  documents are seeded directly in tests via the emulator's
  Admin-SDK-bypass (`withSecurityRulesDisabled`), standing in for the
  Checkpoint 2 server route that will write them in production, exactly
  as the existing `initialStockRecoveryAuthorization` test suite already
  does for its own Authorization documents.
- **Heartbeat semantics** (Checkpoint 3) — the Session document schema
  includes `lastHeartbeatAt`/`lastOperatorHeartbeatAt` fields in test
  fixtures for shape-realism only; no heartbeat-transition logic exists
  yet, server-side or in rules.
- **Support View State field-content allowlisting** (Checkpoint 4) —
  the `supportViewState` rule fixes only the read/write authorization
  boundary; FR-49/FR-50's four-category field allowlist is not yet
  enforced at the rules layer.
- **Pointer rendering / non-interactivity** (Checkpoint 5) — this
  checkpoint fixes only the pointer document's read/write
  authorization; `pointer-events: none` rendering is a tenant-SPA
  concern, not a rules concern, and is not implemented here.
- **Desktop WebRTC** (Checkpoint 6) — `webrtcSignaling` rules fix only
  read/create authorization; no `getDisplayMedia()`/`RTCPeerConnection`
  code, no TURN/relay integration, and no signaling-document cleanup
  exist yet.
- **Customer transparency / disconnect UI** (Checkpoint 7) and **full
  validation beyond this checkpoint's own rules suite** (Checkpoint 8)
  are untouched.

## Traceability

| Item | Governing FR / Invariant | Rule 8 Finding |
|---|---|---|
| `isActiveSupportOperatorForSession()` | I-12, FR-63 | 5-A, 5-B, 2-B, 10-A, 12-A |
| `supportSessions` write refusal (Admin-SDK-only) | FR-54 ("privileged write"), I-6 | — |
| `supportViewState` read (Support) / write (customer) | FR-23–FR-25 | 2-B |
| `pointer` write (Support only) / read (both) | FR-27–FR-28 | 3-B, 10-B |
| `webrtcSignaling` read/create (both) | FR-21 | 1-A, 13-A |
| Dedicated security-rules test coverage | — | **12-A** (explicit requirement) |

## Next checkpoint

**Checkpoint 2 — Support-session server foundation:** the
`supportSessionInvitation` collection and its rules, the privileged
server routes for generation/consumption/lockout (reusing
`server/initialStockRecoveryAuthorization.ts`'s proven shape per Rule 8
Finding 4-A/4-C), and the server route that actually writes
`supportSessions/{sessionId}` documents at establishment — the route
this checkpoint's tests currently stand in for via direct seeding.
