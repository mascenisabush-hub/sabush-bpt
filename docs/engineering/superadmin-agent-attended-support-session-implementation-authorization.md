# Implementation Authorization — SuperAdmin Agent Attended Support Session (VIEW + POINT + GUIDE)

**Status:** ⚠️ **DRAFTED — AWAITING PRODUCT ARCHITECT ACCEPTANCE.** This
document is the prepared authorization artifact only. It has not been
signed. **No code, `firestore.rules`, `firestore.indexes.json`, or test
file has been created, modified, or committed to produce this
document, and none may be until §14's signature is recorded.** The
Product Architect's prior acceptance of `BDR-0018`, the Policy, the
Specification (including its SPEC-3 correction pass), and the Rule 8
Closure does **not** itself constitute acceptance of this Authorization
— per this task's own explicit instruction, that acceptance must be
separate and explicit.

**Governing chain:**
[`BDR-0018`](../specs/BDR-0018-superadmin-agent-attended-support-session.md)
(✅ Approved) →
[Policy](../specs/POL-pending-superadmin-agent-attended-support-session-policy.md)
(✅ Approved) →
[Specification](../specs/superadmin-agent-attended-support-session-specification.md)
(✅ Accepted, including its SPEC-1/SPEC-2/SPEC-3 correction passes) →
[Rule 8 Assessment](./superadmin-agent-attended-support-session-rule8-assessment.md)
(✅ **CLOSED / PASS**, commit `312f64c`) → **this Authorization
(⚠️ Drafted, not yet signed, §14)**.

**Note on this Authorization's place in the chain.** Several sibling
capabilities in this repository (e.g.
`superadmin-assisted-initial-stock-recovery-implementation-authorization.md`)
interpose a separately-filed Implementation Plan document between Rule
8 and the Authorization. This governance task was explicitly scoped by
the Product Architect to move directly from the Rule 8 Closure to this
Authorization, with the authorized scope and testing/validation
requirements stated in full here (§3, §10) rather than in a distinct
Plan document. This is a documentation-practice difference, not a
lowering of the governance bar — every item a Plan document would
normally carry is present below, traced to its governing FR/Finding.
Flagged here for the Product Architect's awareness at signature, not as
an unresolved blocker.

---

## 1. Authorization Identity

- **Module / capability:** SuperAdmin Agent Attended Support Session
  ("VIEW + POINT + GUIDE") — a customer-initiated, time-boxed,
  co-browsing/support-viewing capability letting an eligible SuperAdmin
  platform operator see (desktop: live screen share; mobile: a
  minimal, allowlisted view-state mirror) and point at a customer's own
  tenant SPA session, with no write, click, or type capability of any
  kind.
- **BDR reference:** `BDR-0018` — SuperAdmin Agent Attended Support
  Session: Rendering Mechanism and Support Authority Boundary.
  Status: ✅ Approved.
- **Policy reference:**
  `docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`
  — SuperAdmin Agent Attended Support Session Policy (unnumbered per
  that document's own recorded `POL-NNNN` queue). Status: ✅ Approved.
- **Specification reference:**
  `docs/specs/superadmin-agent-attended-support-session-specification.md`.
  Status: ✅ Accepted, including SPEC-1 (Support View State schema,
  §20), SPEC-2 (heartbeat/reconnection, §21), and SPEC-3 (Firestore
  authorization model, I-12/FR-63; bidirectional heartbeat, amended
  FR-54) correction passes.
- **Rule 8 Assessment reference:**
  `docs/engineering/superadmin-agent-attended-support-session-rule8-assessment.md`.
- **Rule 8 verdict:** ✅ **CLOSED / PASS** (§8.4 of that document,
  commit `312f64c`).

## 2. Governance Chain

```
BDR-0018 (Approved)
   -> Policy (Approved)
      -> Specification (Accepted; SPEC-1, SPEC-2, SPEC-3)
         -> Rule 8 Assessment (CLOSED / PASS)
            -> Implementation Authorization (this document — DRAFTED, NOT YET SIGNED)
```

No stage above is reopened, reinterpreted, or amended by this document.
This Authorization only carries forward what each prior stage already
fixed — it introduces no new business rule, no new technical decision,
and no new value.

## 3. Authorized Scope

**Once signed**, this Authorization would permit implementation of
exactly the following, and nothing beyond it — each item traceable to
a Specification FR/Invariant and, where applicable, a Rule 8 Finding:

1. **Invitation lifecycle** — a new
   `businesses/{businessId}/supportSessionInvitation/current`
   fixed-id-per-business document: generation (FR-1–FR-5), 5-minute
   expiry (FR-6, FR-7), hashed/salted code storage, never plaintext
   (FR-4, I-3), atomic consumption unbound to a specific operator
   (FR-11, FR-12, I-4), and single-active-Invitation supersession
   (FR-2, I-2) — reusing
   `server/initialStockRecoveryAuthorization.ts`'s proven
   hash/expiry/transactional-write shape (Rule 8 Finding 4-A).
2. **Failed-attempt lockout** — a per-Invitation `failedAttempts`
   counter (never per-operator, FR-13, I-4), 5th-failure permanent
   lock (FR-14), no reactivation (FR-15, FR-16) — reusing the Clear-Data
   Password precedent's counter/lockout shape (Rule 8 Finding 4-C).
3. **Session establishment and duration** — a new
   `businesses/{businessId}/supportSessions/{sessionId}` document per
   established session, bound to exactly one `businessId` and one
   `operatorUid` (I-5), a non-renewable 60-minute `expiresAt` set once
   at establishment (FR-17, FR-18, I-11).
4. **Bidirectional heartbeat and reconnection** — customer **and**
   Support-operator heartbeat, independently tracked
   (`lastHeartbeatAt`, `lastOperatorHeartbeatAt`), per FR-54 as amended
   by SPEC-3; the `active` → `reconnecting` → `ended` state machine
   (FR-55–FR-59); the 2-minute grace period, capped so it can never
   extend a Session past its own 60-minute `expiresAt` (FR-57, I-11);
   reconnection restoring rendering access only, never authorization
   (FR-56, FR-60, I-10); no revival of an already-ended Session (FR-61).
5. **Desktop rendering path** — `getDisplayMedia()` +
   `RTCPeerConnection`, customer-driven native browser consent (FR-19,
   FR-22, Rule N), Firestore-document-based WebRTC signaling exchange
   (FR-21, §24 item 1), a viewer holding no tenant credential, no
   tenant Firestore connection, and no dependency on tenant SPA code
   (FR-20, I-6).
6. **Mobile rendering path** — the customer-authored, four-category
   allowlisted Support View State document (§20, FR-23–FR-26,
   FR-49–FR-53), Support-side read-only `onSnapshot` subscription
   (FR-24, FR-25), document unreadability the instant the governing
   Session ends (FR-52, FR-53, I-10).
7. **Session-scoped Firestore authorization (the critical item)** — the
   narrow, session-matched `firestore.rules` grant named by
   Invariant I-12 and FR-63 (SPEC-3): every read of the Support View
   State, pointer, or `webrtcSignaling` documents, and the pointer's
   own write, conditioned on the specific
   `businesses/{businessId}/supportSessions/{sessionId}` document
   having `status ∈ {active, reconnecting}` **and**
   `operatorUid == request.auth.uid` — never on `platformRole` or
   `isPlatformOperator()` alone, and never using the existing
   `platform_audit_log` grant as precedent (Rule 8 Findings
   5-A/5-B/2-B/3-B/10-A/10-B/12-A).
8. **Pointer channel** — `{x, y, timestamp}`, common to both rendering
   paths (FR-27), overwritten (not accumulated) per Session (FR-28,
   Rule 8 Finding 8-A), rendered by the customer's SPA with a
   structural `pointer-events: none` guarantee (FR-29, Rule P), never
   extended to carry input/click/keystroke data (FR-30, Rule Z).
9. **Customer transparency** — a persistent, non-dismissible
   connection indicator for the Session's full active duration
   (FR-31–FR-33, Rule Q), modeled on the existing
   `BusinessSuspendedBanner.tsx` pattern.
10. **Disconnect / termination** — customer disconnect authority
    (FR-34, Rule R), Support disconnect authority (FR-35, Rule S),
    immediate server-enforced total revocation on either (FR-36,
    I-8, Rule T).
11. **Audit** — the nine `support_session.*` `actionType` values FR-44
    fixes (`invited`, `established`, `ended_by_customer`,
    `ended_by_support`, `completed`, `ended_by_abandonment`,
    `invitation_expired`, `code_attempt_failed`, `locked`), using the
    existing `platform_audit_log` schema and `KNOWN_ACTION_TYPES`
    allowlist update (FR-44, FR-45, Rule W) — no new audit system, no
    sensitive payload of any kind in any entry (FR-46, Rule X).
12. **Structural write-incapability** — no server route or
    `firestore.rules` grant this capability introduces performs, or
    enables, any tenant write (I-6, FR-43, §25 Non-Goals).
13. **Dedicated security-rules test coverage** — the explicit test Rule
    8 Finding 12-A requires: an authenticated platform operator
    **without** an active Session for a given business **cannot** read
    that business's Support View State, pointer, or Session documents
    — plus the full test surface §10, below, enumerates.
14. **Composite indexes** for the new collections this capability
    introduces (Rule 8 Gap Analysis, ordinary Implementation Plan
    item).

## 4. Non-Authorized Scope

Explicitly **not** authorized by this document, under any
interpretation of §3, restated directly from `BDR-0018` §5, Policy Rule
Z, and Specification §25:

- **No second Support permission tier.** Every eligible operator tier
  (Rule A) receives identical VIEW + POINT + GUIDE authority; no
  elevated or write-capable variant of the role may exist.
- **No "Request Control" mechanism**, at any stage, under any framing.
- **No write, click, typing, submission, creation, editing, or deletion
  performed by Support**, beyond the customer's own unaffected session
  — this includes tenant data, settings, subscription, payment
  information, and account information.
- **No full write-capable Impersonation** (§9.10) and **no
  unrestricted remote control** of any kind.
- **No background/passive monitoring** outside an explicit,
  customer-initiated, time-boxed Session.
- **No broad `isPlatformOperator()` tenant-scoped grant** — the
  `platform_audit_log` precedent is explicitly excluded as a template
  (I-12, FR-63, §6 below).
- **No change to the accepted session security parameters** (§7) —
  5-minute code validity, 5-attempt lockout, 15-minute cooldown,
  60-minute session cap — under any implementation convenience
  argument.
- **No vendor selection or procurement action for TURN/relay** — this
  Authorization records the dependency (§11); it does not select or
  provision one.
- Any change to `BDR-0018`, its Policy, or the Specification
  themselves — this Authorization implements what those stages already
  fixed; it does not amend them.

## 5. Architecture Authorization

**Desktop:** `getDisplayMedia()` + `RTCPeerConnection`, native browser
APIs requiring no new npm dependency (Rule 8 Finding 1-A). The customer
explicitly authorizes screen/tab sharing through the browser's own
unmodified consent picker, never pre-selected or auto-approved by the
platform (FR-22, Rule N). Support receives only the rendered visual
stream — never a customer credential, authentication token, tenant
Firestore connection, tenant write authority, or general tenant API
credential (FR-20, I-6). Screen sharing is a visual observation
mechanism, not a tenant authorization grant (Rule 8 Finding 3-A —
confirmed the strongest guarantee in this entire capability, since no
code path connects the viewer to anything tenant-owned).

**Mobile:** the session-scoped Support View State (§20 of the
Specification) — customer-authored, explicitly allowlisted to exactly
four categories (navigation/context; current workflow context;
approved transient UI state, e.g. `AddStockView.tsx`'s existing
`fieldStatus` badges; viewport information), minimal, business-scoped,
session-scoped, and read-only to Support (FR-49, Rule O). **Never** a
mirror of the entire React state or entire tenant state. Excludes,
unconditionally: credentials, secrets, the raw support code, and any
tenant data outside the four allowlisted categories (FR-50).

## 6. Security Authorization

**The single highest-stakes correctness requirement in this
capability** (Rule 8 Finding 12-A): every `firestore.rules` grant this
capability introduces — read of Support View State, pointer, or
`webrtcSignaling`; write of the pointer — must be conditioned
exclusively on the narrow, session-matched check fixed by **Invariant
I-12** and **FR-63** of the Specification (SPEC-3):

> the governing `businesses/{businessId}/supportSessions/{sessionId}`
> document has `status ∈ {active, reconnecting}` **and**
> `operatorUid == request.auth.uid`.

`platformRole == 'superadmin'` (or any other `platformRole` value)
**must never**, by itself, satisfy this condition. The existing
`platform_audit_log` grant — the one place `isPlatformOperator()` is
used anywhere in the current `firestore.rules` file, and a broad,
non-tenant-scoped grant — is **not** precedent for any collection this
capability introduces (Rule 8's Current State Assessment, §1; I-12).
Implementing the broad form instead of the narrow form would be a
**catastrophic violation** of Policy Rule L ("no standing or
session-less access, ever") and Rule K ("one session, one business, no
exceptions") — this is Rule 8 Finding 5-A's own plain statement, not a
hypothetical this Authorization is restating for emphasis alone.

The concrete resolution direction (Rule 8 Finding 5-B) is a direct
application of the already-proven
`initialStockRecoveryAuthorizationActive()` cross-document `get()`
pattern (`firestore.rules`, current lines ~305–315) — not a new
technique this codebase has to invent, applied to a new pair of
collections.

## 7. Session Security Parameters

Preserved **exactly**, unchanged by this Authorization or by any
governance stage since `BDR-0018`:

| Parameter | Value | Source |
|---|---|---|
| Code validity | **5 minutes** | FR-6, FR-7 |
| Failed-attempt lockout threshold | **5 failed attempts** | FR-13, FR-14, Rule G / LOCKOUT-3 |
| Lockout cooldown | **15 minutes** — but lockout **permanently** kills that Invitation; the cooldown does not reactivate it | FR-14–FR-16, Rule G / LOCKOUT-4 |
| Maximum Session duration | **60 minutes**, non-renewable, non-extendable by any action, including reconnection | FR-17, FR-18, I-11 |
| Code binding | Not bound to a specific operator — first eligible operator to consume it establishes the Session | I-5, Rule H |
| Code consumption | Atomic — at most one of two simultaneous attempts succeeds | FR-11, I-4 |

## 8. Heartbeat / Reconnection

**Bidirectional liveness (SPEC-3, Decision 7, resolving Rule 8 Finding
6-A):** both the customer's browser **and** the Support operator's own
browser, under either rendering path, independently heartbeat — FR-54
as amended. The server is exclusively authoritative for connectivity
status; no client may unilaterally declare a Session active (FR-59).

Proposed figures (Specification's own proposal, not existing
precedent — no comparable heartbeat mechanism existed anywhere in this
codebase before this capability, Rule 8 Finding 4-B): 15-second
heartbeat interval, 30-second missed-heartbeat threshold (two missed
beats) transitioning `active` → `reconnecting` (never directly to
`ended`, FR-55), a 2-minute grace period bounding `reconnecting`
(FR-57), capped so it can never push a Session's total active lifetime
past its original 60-minute `expiresAt` (I-11).

**Reconnection**, from either participant, may **never**: create or
extend authorization; extend, renew, or reset `expiresAt`; bypass or
substitute for code consumption; permit reuse of an already-consumed
code; create a second, concurrent Session for the same business; or
revive a Session that has already transitioned to `ended` (FR-60,
FR-61, I-10).

**Distinct audit outcomes preserved, not collapsed (§9, below):** a
Session reaching its 60-minute cap while still actively used
(`support_session.completed`) is a materially different, separately
auditable event from a Session the grace period's expiry catches as
genuinely abandoned (`support_session.ended_by_abandonment`) — FR-44's
Option B resolution, unchanged by this Authorization.

## 9. Audit / Transparency

**Customer consent and initiation:** the customer alone triggers code
generation, through an explicit, deliberate, already-authenticated
tenant-session action — never automatic, scheduled, or a side effect
(FR-1, Rule C). The customer reads the generated code to the Support
operator out of band (the code itself is never transmitted through any
in-app channel this capability introduces).

**Connected indicator:** a persistent, non-dismissible, clearly visible
indicator for the Session's entire active duration, disappearing the
instant access is revoked by any means (FR-31–FR-33, I-8, Rule Q) —
directly modeled on the existing `BusinessSuspendedBanner.tsx`
component pattern.

**Disconnect:** the customer may end an active Session at any time,
unconditionally, with immediate effect and no operator acknowledgment
required (FR-34, Rule R); the Support operator may do the same,
symmetrically (FR-35, Rule S); either termination is immediate, total,
and server-enforced (FR-36, I-8, Rule T).

**Audit events (FR-44, using the existing `platform_audit_log` schema
— `actorUid`, `actorRole`, `actionType`, `targetBusinessId`, server
`timestamp` — no new schema, only new `actionType` values updated into
`KNOWN_ACTION_TYPES` in the same change, FR-45, Rule W):**
`support_session.invited`, `support_session.established`,
`support_session.ended_by_customer`, `support_session.ended_by_support`,
`support_session.completed`, `support_session.ended_by_abandonment`,
`support_session.invitation_expired`,
`support_session.code_attempt_failed`, `support_session.locked`. No
entry of any kind may contain the plaintext or hashed code, any Support
View State payload or field, any pointer coordinate, or any underlying
tenant business data — screen contents are never logged, since the
desktop path's viewer holds no tenant data connection to log from in
the first place (FR-46, Rule X). No unrelated or new audit system is
introduced — this capability extends the existing platform audit
architecture only.

## 10. Required Validation

At minimum, per Rule 8's own required-testing findings (12-A
specifically) and the Specification's Acceptance Criteria (§28,
including new item 24 from SPEC-3):

1. **Firestore security-rules tests** (this repository's existing
   `@firebase/rules-unit-testing` convention) — the explicit,
   falsifiable test Finding 12-A names: a platform operator
   **without** an active Session for a given business **cannot** read
   that business's Support View State, pointer, or Session documents.
2. **Tenant-isolation tests** — no Session, once established, can be
   read, consumed, or validated against any business other than the
   one it was established for (structural, path-scoped).
3. **No-write Support tests** — no code path, under either rendering
   path, permits a Support-operator credential to write to any
   tenant-owned collection (I-6); the pointer write path specifically
   tested against a business without a matching active Session
   (Finding 3-B/10-B).
4. **Session lifecycle tests** — establishment, the 60-minute cap
   (I-11), termination by either party (FR-34–FR-36), and the
   `active`/`reconnecting`/`ended` state machine (FR-55–FR-59).
5. **Code/lockout tests** — atomic consumption (FR-11), the 5-attempt
   lockout and its permanence (FR-13–FR-16), the 5-minute expiry
   (FR-6, FR-7), and the single-active-Invitation invariant (I-2).
6. **Heartbeat/reconnection tests** — both the customer's and the
   Support operator's own heartbeat lapsing independently trigger
   `reconnecting` (FR-54 as amended, FR-55); reconnection restoring
   `active` status without altering `establishedAt`/`expiresAt`
   (FR-56, I-10); the grace period never extending a Session past its
   60-minute cap (FR-57, I-11); a heartbeat racing an explicit
   termination request resolving via last-write-wins-with-status-check
   (Rule 8 Finding 11-B, Specification §24 item 13).
7. **Pointer non-interactivity tests** — the rendered overlay is
   structurally incapable of dispatching a DOM event under either
   rendering path (FR-29, Rule P).
8. **Desktop/mobile path tests**, where feasible in this repository's
   existing test infrastructure — signaling document lifecycle
   (FR-21), Support View State field-allowlist enforcement (FR-49,
   FR-50), and unreadability the instant a Session ends (FR-52, FR-53,
   I-10).
9. **Failure/recovery tests** — temporary connectivity loss (either
   participant, either rendering path) not immediately ending an
   active Session (§21, §23 of the Specification), and a Session
   correctly transitioning to `ended`/`ended_by_abandonment` only after
   the grace period genuinely elapses (FR-58).
10. **Full regression** of any existing suite this capability's
    `firestore.rules` or `server/` changes touch adjacently (none is
    authorized to touch existing Void & Redo, Business Worth, or other
    unrelated mechanics — a regression pass confirms this, it does not
    permit it).

None of these tests exist yet. None is written by this document.

## 11. Infrastructure Dependency

> **TURN/relay infrastructure must be provisioned before the desktop
> rendering path is used in production.**

Per Rule 8 Finding 1-B/15-B and the Product Architect's Decision 8
(recorded in the Rule 8 Closure, §8.3): no TURN/relay service exists
anywhere in this repository's current configuration, dependencies, or
deployment precedent. Direct peer-to-peer WebRTC is well-documented to
fail across carrier-grade mobile NAT without a relay — a real risk for
this product's mobile-network-heavy customer base. **No vendor is
selected or implied by this Authorization or by any governance document
in this chain** — vendor selection (managed vs. self-hosted) and its
exact recurring cost remain an ordinary Implementation Plan /
procurement item, deferred exactly as Rule 8 and the Product Architect
left it. The **mobile** rendering path has no TURN dependency and is
not gated by this item.

## 12. Acceptance Criteria

Carried forward from the Specification's §28, **unchanged in substance,
including the SPEC-3 additions** — restated here for this
Authorization's own self-containment, not as a new or silently altered
list:

1. A code is generated only by explicit customer action, stored hashed,
   never plaintext, bound to exactly one business (FR-1, FR-4, I-1).
2. At most one active Invitation exists per business at any time; a new
   one always supersedes an old one (FR-2, I-2).
3. An unused code expires, unconditionally, exactly 5 minutes after
   generation (FR-6, FR-7).
4. Any eligible-tier operator may attempt a code only against an
   already-identified business, never via a bare cross-platform search
   (FR-9, FR-10).
5. Successful entry is atomic, unbound to a specific operator, and
   immediately and permanently spends the code (FR-11, FR-12, I-4).
6. The fifth failed attempt against one Invitation permanently
   invalidates it — no reactivation, ever (FR-14, FR-15).
7. A locked or expired Invitation can only be superseded by an
   entirely new, customer-generated one (FR-8, FR-16).
8. An established Session lasts exactly 60 minutes, non-renewable,
   non-extendable by any action (FR-17, FR-18).
9. Under the desktop path, the Support operator's viewer holds no
   customer credential and has no Firestore connection to tenant data
   (FR-20, I-6).
10. Under the mobile path, the Support operator's session can only
    ever read the Support View State document, never write to it or
    any other tenant collection (FR-24, I-6).
11. No server route this capability introduces can write to any
    tenant-owned collection (FR-43).
12. The pointer channel is structurally incapable of dispatching any
    DOM event, under either rendering path (FR-29).
13. The customer sees a persistent, non-dismissible connection
    indicator for the Session's entire active duration, disappearing
    exactly when access is revoked (FR-31–FR-33, I-8).
14. Either party can end the Session at any time, with immediate,
    server-enforced, total effect (FR-34–FR-36).
15. An abandoned Session (either browser disappearing without explicit
    termination) is bounded and eventually ends, never persisting past
    its own 60-minute cap (FR-37).
16. Every lifecycle event produces exactly one audit entry, using the
    existing schema, containing no sensitive payload (FR-44, FR-46).
17. The customer's ordinary tenant session is never interrupted by any
    Invitation- or Session-lifecycle event (FR-47, FR-48, I-9).
18. No write capability of any kind reaches the Support operator under
    any circumstance, at any stage (I-6, §25).
19. The Support View State's schema is fixed to exactly four
    allowlisted categories, contains no credential, secret, or the
    Support code itself, and every field traces to a named
    support-diagnosis need (FR-49–FR-51).
20. A Support View State document is unreadable the instant its
    governing Session ends, and never itself constitutes or implies
    authorization (FR-52, FR-53, I-10).
21. A temporary connectivity interruption from **either participant**
    does not immediately end an active Session; it enters a bounded
    grace period, and reconnection restores full activity with no
    change to the Session's own authorization or 60-minute cap (FR-54
    as amended, FR-55–FR-57, I-10, I-11).
22. A reconnection can never create, extend, renew, or recreate any
    authorization, bypass code consumption, reuse a consumed code, or
    revive an ended Session (FR-60, FR-61).
23. The server, never the client, is authoritative for whether a
    Session is active, reconnecting, or ended (FR-59).
24. No Support access to the Support View State, pointer, or
    `webrtcSignaling` documents is ever granted merely by `platformRole`
    or `isPlatformOperator()` — every such grant is conditioned on the
    narrow, session-matched check of I-12, confirmed by dedicated
    security-rules test coverage before Implementation Authorization
    (FR-63, I-12).

## 13. Implementation Boundary

**Implementation is authorized only within the accepted `BDR-0018`,
Policy, Specification (including SPEC-1/SPEC-2/SPEC-3), and the Rule 8
Closure.** Any requirement, mechanism, schema field, rendering
behavior, security-rules grant shape, or session-security parameter not
traceable to one of those artifacts — including anything this document
itself did not enumerate in §3 — requires a new governance decision
before it may be implemented; it may not be inferred, assumed, or
silently added during implementation. Specifically, and without
limitation: no vendor selection for TURN/relay (§11); no session
security parameter change (§7); no second Support permission tier or
any authority beyond VIEW + POINT + GUIDE (§4); no broad
`isPlatformOperator()` grant on any tenant-scoped collection (§6).

---

## 14. Product Architect Signature

**Status:** ⚠️ **DRAFTED — AWAITING PRODUCT ARCHITECT ACCEPTANCE.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** *(not recorded — no signature date is fabricated by this
document; to be filled in only if and when acceptance is explicitly
given)*

**Authorization decision:** *(not yet recorded)*

**To be confirmed as part of signature, when given:**

- [ ] This authorization's scope (§3) is approved as stated.
- [ ] This authorization's exclusions (§4) are approved as stated.
- [ ] The session-scoped Firestore authorization model (§6, I-12,
      FR-63) is approved as the required implementation shape — not
      left to implementation-time judgment.
- [ ] The bidirectional heartbeat requirement (§8, FR-54 as amended) is
      approved as binding.
- [ ] The TURN/relay pre-production dependency (§11) is acknowledged,
      with no vendor selected here.
- [ ] The required validation surface (§10) is acknowledged as a
      pre-Authorization-completion gate, in particular the dedicated
      security-rules test of Finding 12-A.
- [ ] No additional scope change is required beyond what §1–§13 of this
      document describe.

---

**As of this filing, this document authorizes nothing.** Until §14 is
signed, no implementation of any kind — code, `firestore.rules`,
`firestore.indexes.json`, test file, or infrastructure — may begin
under this capability's name.
