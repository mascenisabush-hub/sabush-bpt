# SuperAdmin Agent Attended Support Session Specification

**Status:** Drafted. Converts `BDR-0018` (✅ Approved) and the
SuperAdmin Agent Attended Support Session Policy (✅ Approved,
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`
— currently unnumbered, per that document's own recorded numbering
queue) into functional requirements, a proposed data model, and
acceptance criteria a Rule 8 Assessment can be run against. **This
Specification is not, however, formally Accepted in the signed sense**
— no named Product Architect signature has been given for this
document specifically, and none is fabricated here, matching the
identical, explicitly-stated caveat `superadmin-assisted-initial-stock-recovery-specification.md`'s
own Status line already established for this repository's convention
when a Specification is drafted but not yet individually signed.

---

## 1. Status / Purpose

This Specification converts `BDR-0018` and its Policy into the
precise technical contract for the Attended Support Session's full
lifecycle: customer-initiated code generation → Support-operator code
entry and session establishment → device-appropriate rendering
(desktop screen-share / mobile Support View State) → the pointer/guide
channel → the persistent customer-visible connection indicator →
disconnect (by either party, or by abandonment) → expiry (of the code,
and separately of the session) → audit → the structural enforcement
that Support authority never exceeds VIEW + POINT + GUIDE.

This Specification does not restate or re-derive any decision `BDR-0018`
or its Policy already settled. It specifies only the technical shape
those decisions require: functional requirements, a proposed (not
final) data model, and acceptance criteria — never `firestore.rules`
text, database transaction implementation, or UI component design,
each reserved for Rule 8 Assessment and Implementation Authorization,
consistent with the sibling `superadmin-assisted-initial-stock-recovery-specification.md`'s
own explicit exclusion of the same categories.

## 2. Scope

**In scope:** the one-time code's full lifecycle (generation, entry,
consumption, expiry, lockout); Attended Support Session establishment
and duration; the desktop rendering path (native screen-share) and the
mobile rendering path (Support View State); the pointer/guide channel;
the persistent customer-visible indicator; disconnect by either party
and the abandoned-session safety net; tenant/business isolation for
every step; the structural (not merely UI-level) enforcement that
Support never gains write authority; the audit trail for every
lifecycle event; coexistence with the customer's ordinary tenant
session.

**Out of scope:** any change to Business Visibility, Suspend/
Reactivate, Payment Operations, or either existing Recovery
Authorization mechanism — all unmodified and unrelated; any change to
Architecture §9.10 (Impersonation), which remains exactly as deferred
as `BDR-0018` §5 states; any `firestore.rules` text, database
transaction design, exact API route signatures, or UI component/layout
design (reserved for Rule 8/Implementation Authorization); how the
customer and Support operator's spoken conversation itself is carried
(`BDR-0018` §6 defers this as separate, larger governance work this
Specification does not scope); any change to `BDR-0011`'s subscription/
billing boundary.

## 3. Terminology — Preserved, Not Redefined

**Attended Support Session**, **VIEW + POINT + GUIDE**, **Support View
State**, and **Support-tier operator** all carry exactly the meaning
`BDR-0018` §§1–2 already fix. **Rule A** through **Rule Z** below refer
to the Policy's own lettered Operational Rules; this Specification
introduces no new business term and re-derives no business decision
already made there.

## 4. Conceptual Vocabulary — Fixed Terms

- **Invitation** — the server-side record representing one
  customer-generated code, from generation until it is consumed,
  expires unused, or is permanently invalidated by lockout (Policy
  Rules C–H).
- **Session** — the record representing one established Attended
  Support Session, from successful code consumption until it ends by
  customer action, Support action, its own duration expiring, or the
  abandoned-session safety net (Policy Rules I–U).
- **Rendering path** — whichever of the two device-appropriate
  mechanisms (desktop screen-share or mobile Support View State) is
  active for a given Session (Policy Rules M–O).
- **Lockout state** — the state an Invitation enters upon its fifth
  failed code-entry attempt: permanently invalidated, with a 15-minute
  cooldown associated with the event, never a path back to the same
  code becoming valid again (Policy Rule G / LOCKOUT-1 through
  LOCKOUT-4).
- **Abandonment** — either party's browser disappearing (closed, lost
  connectivity) without an explicit Rule R/S termination action having
  been taken (Policy Rule U).

## 5. Business Rules

Restated from the Policy's Rules A–Z for direct traceability (§29,
below, maps each to its FR):

1. Eligible operator tier: `support`, `developer`, or `superadmin` (Rule A).
2. Customer-initiated only; no operator-initiated path exists (Rule B).
3. Code generated only on explicit customer action; hashed, never
   plaintext, never recoverable (Rule C).
4. Code format: 6-digit numeric (Rule D).
5. Code validity window: 5 minutes from generation (Rule E / CODE-1).
6. At most one unconsumed, unexpired code per business at a time; a
   new code invalidates whatever code preceded it (Rule F).
7. Brute-force protection is mandatory: 5 failed attempts trigger
   lockout; 15-minute cooldown; lockout **permanently invalidates**
   the code (no reactivation after cooldown); scoped per invitation/
   business, never per-operator (Rule G / LOCKOUT-1 through LOCKOUT-4).
8. Code consumption is atomic, one-time, and unbound to any specific
   Support operator — first eligible operator to succeed establishes
   the session (Rule H / CODE-2).
9. Session duration: 60 minutes from establishment (Rule I).
10. Non-renewable without an entirely fresh code (Rule J).
11. One session, one business, no exceptions; lookup must be scoped by
    `businessId`, never a flat cross-platform code search (Rule K).
12. No standing or session-less access, ever, at any operator tier (Rule L).
13. Support authority ceiling is structurally enforced, not merely
    hidden, under either rendering path (Rule M).
14. Desktop: native browser screen-share consent is mandatory and
    non-bypassable, additional to code-based consent (Rule N).
15. Mobile: Support View State is read-only and minimum-necessary;
    exact field schema deferred to this Specification (Rule O — see §17).
16. Pointer is structurally non-interactive by construction (Rule P).
17. Customer sees a persistent, unmissable connection indicator for
    the full session duration (Rule Q).
18. Customer may end the session at any time, unconditionally (Rule R).
19. Support may end the session at any time (Rule S).
20. Termination is immediate, total, and server-enforced under both
    rendering paths (Rule T).
21. Abandoned sessions must not remain indefinitely active; bounded
    exposure is required even absent explicit termination (Rule U).
22. The Attended Support Session coexists with, and never disrupts,
    the customer's ordinary tenant session (Rule V).
23. Required audit event categories: invitation, establishment,
    termination (by either party), expiry, failed attempts (Rule W).
24. Never logged: the code itself, mirrored/streamed content, pointer
    coordinates, or any underlying tenant business data (Rule X).
25. Sensitive-field masking: deferred to this Specification (Rule Y —
    see §24).
26. No future mutation-authority carve-out of any kind without a new
    BDR-level decision (Rule Z).

## 6. Invariants

- **I-1.** An Invitation, once generated, is bound to exactly one
  `businessId` for its entire lifetime.
- **I-2.** At most one Invitation is ever in an active (unconsumed,
  unexpired, unlocked) state for a given business at any instant.
- **I-3.** An Invitation's code, once hashed and stored, is never
  reconstructible to plaintext by any read path, including by the
  business's own Owner.
- **I-4.** Consumption is atomic and one-way: an Invitation is exactly
  one of {active, consumed, expired, locked} at any instant — never
  any other state, and never reversible from consumed, expired, or
  locked back to active.
- **I-5.** A Session, once established, is bound to exactly one
  `businessId` and exactly one operator `uid` (the operator who
  consumed the Invitation) for its entire lifetime — the *code* is
  unbound at generation (Rule H), but the resulting *Session* is bound
  to whichever operator actually consumed it, the instant consumption
  succeeds.
- **I-6.** No code path exists, under either rendering path, by which
  a Session's own client can invoke a tenant-mutating server route or
  write to a tenant-owned Firestore collection.
- **I-7.** Every Invitation-lifecycle and Session-lifecycle event
  (generation, consumption, expiry, lockout, establishment,
  termination by either party) is a permanent, append-only audit fact.
- **I-8.** A Session's termination, however triggered, revokes the
  operator's rendering-path access at the server/data layer within the
  same request/write that records the termination — never merely
  hiding the customer-side indicator while access technically
  continues.
- **I-9.** The customer's ordinary tenant SPA authentication and
  session state are never read, modified, or invalidated by any
  Invitation- or Session-lifecycle event.

## 7. Functional Requirements — Code Generation

**FR-1.** The customer must be able to trigger code generation only
through an explicit, deliberate action within their own already-
authenticated tenant session (Rule C) — never automatically, on a
schedule, or as a side effect of any other action.

**FR-2.** On generation, the system must create or overwrite the
business's single Invitation record (I-2), invalidating any prior
Invitation for that business regardless of that prior Invitation's own
state (active, expired, or locked).

**FR-3.** The generated code must be exactly 6 numeric digits (Rule D).

**FR-4.** The system must never persist the code in plaintext anywhere
— only a salted hash, following the Clear-Data Password precedent
(`server/index.ts`'s `crypto.scrypt` + random salt pattern) (Rule C, I-3).

**FR-5.** The system must record the Invitation's generation timestamp
as a server timestamp, never client-supplied, following this
codebase's universal convention (`platformAuditLog.ts`'s own
"server timestamp, not client-supplied" discipline, applied here to
the Invitation record itself, not only its audit entry).

## 8. Functional Requirements — Code Validity and Expiry

**FR-6.** An Invitation must become permanently unusable exactly 5
minutes after its own generation timestamp, whether or not any entry
attempt was ever made against it (Rule E / CODE-1).

**FR-7.** The 5-minute window must not restart, extend, or reset on
any action (a failed attempt, the customer re-displaying the code, or
any other interaction) — identical in spirit to `POL-0008` Rule B's
"no restart, no extension" discipline, applied here to a materially
shorter window.

**FR-8.** Once expired, establishing a session requires an entirely
new Invitation (FR-1–FR-5) — never a renewal or extension of the
expired one.

## 9. Functional Requirements — Code Entry, Consumption, and Lockout

**FR-9.** Any platform operator whose `platformRole` is `support`,
`developer`, or `superadmin` must be able to attempt entering a code
against a specific, already-identified business (Rule A, Rule K) —
never against a bare code with no business context (§18, Rule K's
enumeration-risk rationale).

**FR-10.** The system must verify the entered code against the
business's own Invitation record only — never search across other
businesses' Invitations for a match (I-1, Rule K).

**FR-11.** On successful verification, the system must atomically
transition the Invitation to `consumed` and establish a Session bound
to that exact business and that exact operator `uid` (I-4, I-5) —
structured such that two simultaneous entry attempts (by the same or
different operators) can never both succeed, and the code can never be
consumed twice (Rule H).

**FR-12.** On successful verification, the system must **not** require
or check for any prior relationship between the entering operator and
the business, or any prior communication about which specific operator
was expected to enter the code (Rule H / CODE-2) — the first eligible
operator to succeed is definitionally the one who establishes the
session.

**FR-13.** On a failed verification attempt, the system must increment
a failed-attempt counter scoped to the Invitation itself (Rule G /
LOCKOUT-4) — never a counter scoped to the attempting operator, and
never a counter shared across different businesses' Invitations.

**FR-14.** On the fifth failed attempt against one Invitation, the
system must, atomically with recording that fifth failure:
transition the Invitation to `locked`; record a 15-minute cooldown
timestamp associated with the lockout event; and ensure no subsequent
code entry — correct or incorrect — against that specific Invitation
can ever succeed again, for any operator, at any time (Rule G /
LOCKOUT-1 through LOCKOUT-3).

**FR-15.** The system must never transition a `locked` Invitation back
to `active`, whether or not the 15-minute cooldown has elapsed — the
cooldown is associated with the failed-attempt event's own security
posture, never a mechanism restoring the code's usability (Rule G /
LOCKOUT-3, stated as an explicit negative requirement per the Policy's
own emphatic framing: "the old code NEVER becomes valid again").

**FR-16.** Establishing a session against a business with a `locked`
Invitation requires the customer generating an entirely new Invitation
(FR-1–FR-5), which itself requires a fresh, explicit customer action
(FR-1) — no operator-side action can substitute for this.

## 10. Functional Requirements — Session Duration and Renewal

**FR-17.** A successfully established Session must be valid for
exactly 60 minutes from its own establishment timestamp (Rule I),
reusing Architecture §9.7's already-decided figure directly.

**FR-18.** The 60-minute window must not restart, extend, or renew on
any action taken during the session, by either party — reaching the
end of a 60-minute window with more assistance still needed requires
an entirely new Invitation and an entirely new Session (Rule J), never
an extension of the existing one.

## 11. Functional Requirements — Desktop Rendering Path

**FR-19.** Where the customer's browser supports `getDisplayMedia()`,
the desktop rendering path must be available: the customer's browser
captures a screen/tab/window of the customer's own explicit choosing
(via the browser's own native picker, never pre-selected or
auto-approved by the platform) and transmits it via `RTCPeerConnection`
to the Support operator's viewer (Rule N).

**FR-20.** The Support operator's viewer, under this path, must never
hold, receive, or have access to any Firebase Auth credential
belonging to the customer, any direct Firestore connection to the
business's tenant data, or any dependency on the tenant SPA's own
client code (I-6, Rule M) — its only input is the incoming media
stream.

**FR-21.** WebRTC signaling (session description/ICE candidate
exchange) between the two browsers must be mediated via Firestore
documents scoped to the specific Session (reusing the `onSnapshot`
primitive already proven throughout this codebase — Rule M's own
citation of the cobrowsing investigation's finding that no WebSocket/
WebRTC-specific backend infrastructure exists or is needed for this).

**FR-22.** The platform must never attempt to programmatically
pre-select a screen/tab/window on the customer's behalf, suppress the
browser's native consent prompt, or auto-approve it via any script or
API call (Rule N) — the customer's own active choice, through the
browser's unmodified UI, is required every time a desktop-path session
is established.

## 12. Functional Requirements — Mobile Rendering Path (Support View State)

**FR-23.** Where `getDisplayMedia()` is unavailable (confirmed, per
the cobrowsing investigation's verified current browser-support data,
on Chrome for Android, Firefox for Android, Safari on iOS, Samsung
Internet, and Opera Mobile), the mobile rendering path must be
available: the customer's own already-authenticated tenant SPA session
publishes a Support View State document; the Support operator's viewer
subscribes to it via `onSnapshot`, read-only (Rule O).

**FR-24.** The Support operator's viewer, under this path, must have
no write path to the Support View State document or to any other
tenant collection — enforced independently at the security-rules layer
for this new collection, not merely by client-side omission of a write
UI (I-6, Rule M).

**FR-25.** The Support View State document must be written only by the
customer's own tenant SPA session (the same session already privileged
to read/write that business's own data) — never by the Support
operator's session, and never by any server-side process acting on the
Support operator's behalf.

**FR-26.** The Support View State's exact field-by-field content is
**not fixed by this Specification** — see §24 (Sensitive-Field
Masking) for the minimum-necessary principle this Specification does
resolve; the literal field list is deferred to Rule 8, per `BDR-0018`
§6's and the Policy's own explicit deferral (Rule O).

## 13. Functional Requirements — Pointer / Guide Mechanism

**FR-27.** The pointer channel must be common to both rendering paths
— identical mechanism regardless of which is active for a given
Session.

**FR-28.** The Support operator's browser must be able to publish
coordinate/timestamp data (`{x, y, timestamp}` or an equivalent
normalized representation) to a channel the customer's browser
subscribes to via `onSnapshot`.

**FR-29.** The customer's tenant SPA must render the received
coordinate as a purely visual overlay, styled such that it is
structurally incapable of receiving or dispatching any DOM event (e.g.
`pointer-events: none` or the equivalent guarantee) — a browser-
enforced property, never an application-level discipline alone (Rule P).

**FR-30.** The pointer channel must never be extended to carry any
payload beyond coordinate/timestamp data — no click, keystroke, or
input event of any kind, under any future change without a new
BDR-level decision (Rule Z, applied specifically to this channel).

## 14. Functional Requirements — Customer Transparency

**FR-31.** The moment a Session is established, the customer's tenant
SPA must display a persistent, clearly visible connection indicator —
directly modeled on the existing `BusinessSuspendedBanner.tsx`
pattern (an `AppContext`-driven, app-wide, persistent banner) — for
the Session's entire duration (Rule Q).

**FR-32.** The indicator must not be dismissible by the customer while
the Session remains active — only ending the Session (FR-33 or later)
causes it to disappear.

**FR-33.** The indicator must disappear within the same request/write
that ends the Session, by any means (customer termination, Support
termination, expiry, or the abandoned-session safety net) — never
lagging behind the actual access-revocation moment (I-8).

## 15. Functional Requirements — Disconnect and Termination

**FR-34.** The customer must be able to end an active Session at any
time, unconditionally, with immediate server-enforced effect — no
confirmation delay, justification, or Support-side acknowledgment
required (Rule R).

**FR-35.** The Support operator must be able to end an active Session
at any time, with immediate server-enforced effect, symmetrical to
FR-34 (Rule S).

**FR-36.** Either termination path (FR-34, FR-35) must, within the
same request/write: transition the Session to `ended`; record which
party ended it; and, under the active rendering path, sever the
Support operator's access — closing the WebRTC connection for the
desktop path, or denying further reads of the Support View State
document for the mobile path (I-8, Rule T).

**FR-37.** If either party's browser disappears (connection loss,
browser closure) without an explicit FR-34/FR-35 termination, the
system must detect this and end the Session within a bounded time —
never allowing the Session to remain active past its own FR-17
60-minute duration even in total absence of explicit termination (Rule
U). The exact detection mechanism (heartbeat, presence system, or
connection-close event) is **not fixed by this Specification** —
deferred to Rule 8 (§25).

## 16. Functional Requirements — Tenant Isolation and Authorization

**FR-38.** Every Invitation lookup, code-verification attempt, and
Session-establishment call must take `businessId` as an explicit,
server-re-verified parameter — following the identical pattern already
proven across all 15 existing `/api/superadmin/*` routes (Rule K).

**FR-39.** No mechanism, override, or operator-tier privilege —
including `superadmin` — may establish a Session or view a business
under this capability without a currently active, validly-consumed
Invitation traceable to a specific customer code-generation event
(Rule L, I-1).

**FR-40.** Every Invitation- and Session-related server route must
enforce the identical `requireAuth → requirePlatformOperator →
[eligible tier]` authorization chain already proven across every
existing SuperAdmin route (Rule A), implemented as its own, distinct
gate — never by relaxing `requireSuperAdmin` itself, which must
continue to protect every action that actually requires it (Policy
Rule A's own explicit "Operationally" note).

## 17. Functional Requirements — Structural Write-Incapability

**FR-41.** Under the desktop rendering path, the Support operator's
viewer application must have zero code dependency on the tenant SPA
and zero Firestore client connection to tenant collections — the only
data it ever receives is the incoming media stream and the pointer/
indicator-status channels (I-6, Rule M).

**FR-42.** Under the mobile rendering path, the Support View State
collection's security rules must deny write access to any
platform-operator credential unconditionally — the Support operator's
session may only ever read it (I-6, Rule M).

**FR-43.** No server route introduced by this capability may perform,
or expose any path to perform, a write to any tenant-owned collection
(`products`, `batches`, `stockCounts`, `expenses`, `withdrawals`,
`timelineEvents`, or any other business-data collection) — the only
writes this capability's own server routes ever perform are to the
Invitation, Session, Support View State (customer-authored only, FR-25),
pointer, and audit records it itself defines.

## 18. Functional Requirements — Audit Behavior

**FR-44.** The following lifecycle events must each produce exactly
one `platform_audit_log` entry, using the existing schema
(`actorUid`, `actorRole`, `actionType`, `targetBusinessId`, server
`timestamp`, per `platformAuditLog.ts`) — no new entry shape, only new
`actionType` values (Rule W):

| Event | Proposed `actionType` | `actorUid` represents |
|---|---|---|
| Code generated | `support_session.invited` | the **customer** (the first audit entry type in this codebase representing a tenant-user-initiated action, not a platform-operator action — flagged explicitly, §26) |
| Code consumed / session established | `support_session.established` | the Support operator |
| Session ended by customer | `support_session.ended_by_customer` | the customer |
| Session ended by Support | `support_session.ended_by_support` | the Support operator |
| Session ended by abandonment (FR-37) | `support_session.ended_by_timeout` | system-attributed (no human actor; `actorUid` set to a server-internal identifier per this codebase's existing convention for system-triggered events, e.g. `20-notifications.md`'s own producer pattern) |
| Invitation expired unused | `support_session.invitation_expired` | system-attributed |
| Failed code-entry attempt | `support_session.code_attempt_failed` | the attempting Support operator |
| Invitation locked (5th failure) | `support_session.locked` | system-attributed, referencing the failed attempt that triggered it |

`support_session.issued` — already anticipated by name in
`platformAuditLog.ts`'s own header comment — is deliberately **not**
reused verbatim; `support_session.established` is used instead to
distinguish this capability's customer-consent-gated establishment
event from whatever that comment's author may have originally
envisioned for the now-superseded, never-built §9.7 Support Session
concept. This distinction is noted for Rule 8's own awareness, not
imposed as a hard requirement on Rule 8's eventual naming choice.

**FR-45.** `server/auditLogQuery.ts`'s `KNOWN_ACTION_TYPES` allowlist
must be updated in the same change that introduces any of the
`actionType` values in FR-44's table — never left stale, repeating the
pre-existing, unrelated defect this repository's own governance record
already flags for other action types (Policy Rule W's own explicit
note).

**FR-46.** No audit entry produced by this capability may contain: the
code itself, in plaintext or hashed form; any Support View State
payload or field; any pointer coordinate; or any underlying tenant
business data — every entry is lifecycle metadata only (Rule X).

## 19. Functional Requirements — Coexistence With Ordinary Tenant Session

**FR-47.** Generating an Invitation, establishing a Session, or ending
one, by any means, must never call `signOut()`, invalidate the
customer's own Firebase Auth token, or otherwise interrupt the
customer's ordinary, already-authenticated tenant SPA session (Rule V,
I-9).

**FR-48.** The customer must be able to continue using SABUSH BPT
normally — navigating, entering data, viewing reports — while a
Session is active, with the sole visible change being the persistent
indicator (FR-31).

## 20. Proposed Data Model

**Proposed, not final** — exact field names, types, and `firestore.rules`
text are Rule 8/Implementation Authorization decisions, per §2's scope
exclusion. Offered here to ground the Functional Requirements above in
a concrete, plausible shape, following this repository's own
"current"-fixed-id-document precedent (`initialStockRecoveryAuthorization.ts`)
as closely as this capability's own requirements allow.

**`businesses/{businessId}/supportSessionInvitation/current`** — the
single active Invitation (I-2), following the recovery-authorization
document's exact shape:
- `codeHash`, `codeSalt` — never the plaintext code (FR-4).
- `status`: `'active' | 'consumed' | 'expired' | 'locked'` (I-4).
- `generatedAt` — server timestamp (FR-5).
- `expiresAt` — `generatedAt` + 5 minutes (FR-6).
- `failedAttempts` — integer counter, per-invitation scope (FR-13).
- `lockedAt` — set on the 5th failure (FR-14), `null` otherwise.
- `consumedByUid`, `consumedAt` — set on successful consumption
  (I-5), `null` otherwise.

**`businesses/{businessId}/supportSessions/{sessionId}`** — one
document per established Session:
- `businessId`, `operatorUid` (I-5).
- `renderingPath`: `'desktop' | 'mobile'` (determined at
  establishment, per whether the operator's or customer's environment
  supports `getDisplayMedia`).
- `establishedAt` — server timestamp (FR-17).
- `expiresAt` — `establishedAt` + 60 minutes (FR-17).
- `status`: `'active' | 'ended'`.
- `endedAt`, `endedBy`: `'customer' | 'support' | 'timeout'` (FR-36,
  FR-37).

**`businesses/{businessId}/supportSessions/{sessionId}/webrtcSignaling/{...}`**
(desktop path only) — SDP offer/answer/ICE-candidate exchange
documents, ephemeral, deleted or expiring with the Session (FR-21).

**`businesses/{businessId}/supportSessions/{sessionId}/supportViewState`**
(mobile path only) — the customer-published, Support-read-only mirror
document (FR-23–FR-26); field-by-field content deferred to Rule 8.

**`businesses/{businessId}/supportSessions/{sessionId}/pointer`** — the
coordinate channel (FR-27–FR-30), common to both paths: `{x, y,
timestamp}`, overwritten frequently, never accumulated as history.

## 21. Failure / Edge Cases

- **Customer generates a new code while a Session from a prior code is
  still active.** The new Invitation (FR-2) does not affect the
  already-established Session (a distinct record, I-5) — the active
  Session continues until it independently ends (FR-34–FR-37); the new
  code is available for a *future* session, once the current one ends.
  This is not contradictory: Rule F's "single active Invitation" and
  Rule K's "single Session, one business" govern two different
  records, and this Specification does not conflate them.
- **Support operator's connection drops mid-session (desktop path).**
  Covered by FR-37 (abandonment) — the specific detection signal (ICE
  connection state, WebRTC's own `disconnected`/`failed` states) is a
  Rule 8 question (§25), but the *requirement* that this triggers
  eventual termination is fixed here.
- **Customer's device cannot support either rendering path** (e.g., an
  unusual browser supporting neither `getDisplayMedia` nor the tenant
  SPA reliably). **Not resolved by this Specification** — flagged as a
  genuine edge case for Rule 8 to address, potentially as a documented
  limitation rather than a technical requirement this capability must
  solve.
- **Two operators attempt the same valid code within the same instant.**
  FR-11's atomicity requirement is the governing answer — exactly one
  succeeds, the other's attempt is a failed attempt (FR-13) even though
  the code itself was, at the instant of the race, genuinely valid.

## 22. Explicit Rule-8 Technical Questions

Per the precedent's own convention, listed here rather than silently
resolved:

1. The exact abandoned-session detection mechanism (FR-37).
2. The Support View State's exact field-by-field schema (FR-26, §24).
3. The exact mechanism for determining, at Session establishment,
   which rendering path applies (client-side `getDisplayMedia`
   feature-detection, presumably, but the exact detection code and
   fallback behavior is a Rule 8 question).
4. Whether `webrtcSignaling` documents are deleted on Session end or
   simply expire/become orphaned and are garbage-collected — a
   storage-hygiene question, not a security one (FR-21's own security
   requirements are unaffected either way).
5. The exact transaction design guaranteeing FR-11's atomicity (a
   Firestore transaction, following the recovery-authorization
   precedent's own transactional-write pattern, is the evident
   approach, but the precise implementation is Rule 8/Implementation
   territory).

## 23. Non-Goals / Explicit Exclusions

Restated directly from `BDR-0018` §5 and the Policy's own Rule Z, for
this Specification's own explicit record: no write, click, typing
(beyond the customer's own unaffected session), submission, creation,
editing, or deletion performed by Support; no "Request Control"; no
full write-capable Impersonation (§9.10); no unrestricted remote
control; no background/passive monitoring outside an explicit,
customer-initiated, time-boxed Session; no permanent access; no
subscription/billing override capability of any kind.

## 24. Sensitive-Field Masking

The Policy's Rule Y explicitly deferred this question to this
Specification stage. This Specification resolves the **principle**,
consistent with the minimum-necessary discipline Business Visibility's
own curated read already applies (Gap 2), while deferring the
**specific field list** to Rule 8, since that list depends on the
Support View State's own not-yet-fixed schema (§12, FR-26):

**Resolved here:** whatever fields the Support View State's eventual
Rule-8-defined schema includes, it must include only fields genuinely
necessary to diagnose the realistic support scenarios this capability
exists for (per the original investigation series' own evidence base
— the OCR field-status case and the defect-vs-misunderstanding case)
— never a general-purpose mirror of arbitrary tenant data. This is the
same "minimum necessary, not maximum available" principle Gap 2 and
Business Visibility already apply, extended here rather than
reinvented.

**Not resolved here, deferred to Rule 8:** whether any *specific*
field within that eventual minimum-necessary set should be further
masked (e.g., a supplier's exact name partially obscured, a cost price
rounded) even though it would otherwise qualify as diagnostically
necessary. No existing convention anywhere in this codebase governs
field-level masking (confirmed, `SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`
§20) — inventing specific masked fields here, with no such convention
to ground them in, would be guessing rather than specifying. Rule 8,
informed by the eventual concrete schema, is better positioned to
identify whether any field genuinely warrants this.

**A related, harder constraint, stated plainly:** the desktop rendering
path (screen-share) makes field-level masking structurally difficult
to achieve at all — a video stream cannot selectively obscure one
field without the tenant SPA itself pre-rendering it masked, which
would reintroduce the same "instrument every component" cost the
mobile path already carries (per the cobrowsing investigation's own
finding). If Rule 8 or a future decision determines specific masking
is required, this asymmetry between the two rendering paths is a real
factor that decision must account for, not a detail this Specification
resolves.

## 25. Traceability Matrix

| Business Rule (§5) | Policy Rule | FR(s) |
|---|---|---|
| 1 | Rule A | FR-9, FR-40 |
| 2 | Rule B | FR-1, FR-39 |
| 3 | Rule C | FR-1, FR-4, FR-5 |
| 4 | Rule D | FR-3 |
| 5 | Rule E / CODE-1 | FR-6, FR-7, FR-8 |
| 6 | Rule F | FR-2, I-2 |
| 7 | Rule G / LOCKOUT-1–4 | FR-13, FR-14, FR-15, FR-16 |
| 8 | Rule H / CODE-2 | FR-11, FR-12 |
| 9 | Rule I | FR-17 |
| 10 | Rule J | FR-18 |
| 11 | Rule K | FR-9, FR-10, FR-38 |
| 12 | Rule L | FR-39 |
| 13 | Rule M | FR-20, FR-24, FR-41, FR-42 |
| 14 | Rule N | FR-19, FR-21, FR-22 |
| 15 | Rule O | FR-23, FR-25, FR-26 |
| 16 | Rule P | FR-27, FR-28, FR-29, FR-30 |
| 17 | Rule Q | FR-31, FR-32, FR-33 |
| 18 | Rule R | FR-34 |
| 19 | Rule S | FR-35 |
| 20 | Rule T | FR-36, I-8 |
| 21 | Rule U | FR-37 |
| 22 | Rule V | FR-47, FR-48, I-9 |
| 23 | Rule W | FR-44, FR-45 |
| 24 | Rule X | FR-46 |
| 25 | Rule Y | §24 |
| 26 | Rule Z | FR-30, FR-43 |

## 26. Acceptance Criteria

1. A code is generated only by explicit customer action, stored
   hashed, never plaintext, and bound to exactly one business (FR-1,
   FR-4, I-1).
2. At most one active Invitation exists per business at any time; a
   new one always supersedes an old one (FR-2, I-2).
3. An unused code expires, unconditionally, exactly 5 minutes after
   generation (FR-6, FR-7).
4. Any eligible-tier operator may attempt a code only against an
   already-identified business, never via a bare cross-platform search
   (FR-9, FR-10).
5. Successful entry is atomic, unbound to a specific operator, and
   immediately and permanently spends the code (FR-11, FR-12, I-4).
6. The fifth failed attempt against one Invitation permanently
   invalidates it — no reactivation, ever, regardless of elapsed time
   (FR-14, FR-15).
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
16. Every lifecycle event (invitation, establishment, termination,
    expiry, failed attempt, lockout) produces exactly one audit entry,
    using the existing schema, containing no sensitive payload (FR-44,
    FR-46).
17. The customer's ordinary tenant session is never interrupted by any
    Invitation- or Session-lifecycle event (FR-47, FR-48, I-9).
18. No write capability of any kind reaches the Support operator under
    any circumstance, at any stage of this lifecycle (I-6, §23).

## 27. Governance Notes

- This is a Specification document only. No `apps/`, `server/`,
  `firestore.rules`, `tests/`, or `firestore.indexes.json` file is
  touched by this document.
- This Specification does not modify `BDR-0018`, its Policy,
  `18-superadmin-v1-architecture-gap-resolutions.md`, or Architecture
  §9.7/§9.10 — the future architecture-text amendment to §9.7 the
  Policy already identified as a necessary follow-up remains
  unperformed here as well.
- This Specification is **not** Accepted. No Product Architect
  signature is recorded here, none is implied, and none has been
  fabricated.
- `docs/specs/README.md` is not modified by this document.
- The `POL-NNNN` numbering queue this capability's Policy identified
  (three unnumbered documents observing `POL-0015`) remains unresolved
  and is not this Specification's concern to address.

## 28. Next Governance Step

Per this repository's governance chain and the explicit instruction
accompanying this task: **stop here.** The next step — not performed —
is Product Architect review of this Specification (including the two
genuinely open items this document itself flags: §22's five Rule-8
technical questions, and §24's deferred field-masking specifics),
followed only then by a Rule 8 Assessment. No Rule 8 Assessment,
Implementation Plan, or Implementation Authorization is drafted,
started, or implied by this document.

**Lifecycle:** Drafted → **Product Architect review (this step)** →
Not yet Accepted. Not yet assessed under Rule 8. Not Implemented.
