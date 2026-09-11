# SuperAdmin Agent Attended Support Session Specification

**Status:** ✅ **Accepted.** Corrected following the Specification
Acceptance Audit and the Product Architect's SPEC-1/SPEC-2
resolutions (see "Product Architect Acceptance," at the end of this
document). Converts `BDR-0018` (✅ Approved) and the SuperAdmin
Agent Attended Support Session Policy (✅ Approved,
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`
— currently unnumbered, per that document's own recorded numbering
queue) into functional requirements, a proposed data model, and
acceptance criteria a Rule 8 Assessment can be run against. This
correction pass resolved, at Specification level, the Support View
State schema (§20) and the abandoned-session/reconnection mechanism
(§21) — both of which the original draft had improperly re-deferred to
Rule 8 despite `BDR-0018` §6 and the Policy's Rule O/Rule U explicitly
assigning them to this stage; the Specification Acceptance Audit
identified this as its central finding, and this correction resolved
it directly.

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
mobile rendering path (Support View State, including its explicit,
allowlisted schema — §20); the pointer/guide channel; the persistent
customer-visible indicator; disconnect by either party and the
abandoned-session/reconnection lifecycle, including the heartbeat and
grace-period mechanism that distinguishes temporary connectivity loss
from genuine abandonment (§21); tenant/business isolation for every
step; the structural (not merely UI-level) enforcement that Support
never gains write authority; the principle that rendering connectivity
is never itself authorization; the audit trail for every lifecycle
event; coexistence with the customer's ordinary tenant session.

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

Restated from the Policy's Rules A–Z for direct traceability (§27,
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
15. Mobile: Support View State is read-only and minimum-necessary,
    following an explicitly allowlisted, customer-authored schema
    (Rule O — see §12, §20).
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
    see §26).
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
- **I-10.** Rendering connectivity is not authorization: a WebRTC
  connection, Firestore listener, or Support View State subscription
  is a rendering/transport mechanism only. No connectivity event
  (connect, disconnect, or reconnect) may ever itself create, extend,
  renew, or recreate any Invitation's or Session's authorization
  state — authorization and connectivity are structurally independent
  facts, and connectivity can never influence authorization in either
  direction.
- **I-11.** A Session's total active lifetime, measured from its own
  `establishedAt`, never exceeds 60 minutes (Rule I / FR-17), under
  any circumstance — including any intervening connectivity loss,
  grace period, or reconnection (§21). A reconnection restores
  rendering access to an already-authorized Session; it never resets,
  pauses, or extends that Session's own clock.

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
— only a salted hash, following the Clear-Data Password precedent's
full shape (`server/index.ts`'s `crypto.scrypt` + random salt for
hashing) (Rule C, I-3). Verifying an entered code against the stored
hash must use a constant-time comparison (the same precedent's
`crypto.timingSafeEqual`, not a standard `===`/string-equality
check) — required explicitly here, not merely implied by citing the
hashing half of the precedent alone, since a timing side-channel could
otherwise leak information about a valid code's hash even without
ever recovering the plaintext.

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
never against a bare code with no business context (§16, Rule K's
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

**FR-26.** The Support View State's field-by-field content is fixed by
this Specification as an explicit allowlist — never a mirror of
arbitrary tenant application state — per the Product Architect's
SPEC-1 resolution. The full schema, its four fixed categories, and its
explicit exclusions are defined in §20, below, which this FR
incorporates by reference (Rule O).

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

**FR-37.** If either party's connectivity is lost (temporary network/
transport interruption) or a browser genuinely disappears (closure,
permanent disconnection) without an explicit FR-34/FR-35 termination,
the system must distinguish temporary interruption from genuine
abandonment via the server-authoritative heartbeat and grace-period
mechanism defined in §21, below, per the Product Architect's SPEC-2
resolution — never ending the Session immediately on the first sign of
connectivity loss, and never allowing it to remain active past its own
FR-17 60-minute duration regardless of how connectivity behaves (Rule
U). This FR incorporates §21's requirements by reference.

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
`actionType` values (Rule W). Per the Product Architect's resolution
of the audit-ambiguity the Specification Acceptance Audit identified,
natural completion and abandonment use **distinct action types**
(Option B) rather than one generic event with a reason field — this
follows this codebase's own existing convention directly: every
existing `KNOWN_ACTION_TYPES` entry (`payment.confirmed`,
`business.suspended`, etc.) is a specific, independently-filterable
value, and `PlatformAuditLogEntry` has no generic "reason" field
anywhere in its existing shape for this Specification to introduce
one into:

| Event | Proposed `actionType` | `actorUid` represents |
|---|---|---|
| Code generated | `support_session.invited` | the **customer** (the first audit entry type in this codebase representing a tenant-user-initiated action, not a platform-operator action) |
| Code consumed / session established | `support_session.established` | the Support operator |
| Session ended by customer | `support_session.ended_by_customer` | the customer |
| Session ended by Support | `support_session.ended_by_support` | the Support operator |
| **Session reached its natural 60-minute duration cap while still connected/active** | **`support_session.completed`** | system-attributed |
| **Session ended because the abandoned-session grace period (§21) elapsed without reconnection** | **`support_session.ended_by_abandonment`** | system-attributed, referencing the last successful heartbeat |
| Invitation expired unused | `support_session.invitation_expired` | system-attributed |
| Failed code-entry attempt | `support_session.code_attempt_failed` | the attempting Support operator |
| Invitation locked (5th failure) | `support_session.locked` | system-attributed, referencing the failed attempt that triggered it |

`support_session.completed` and `support_session.ended_by_abandonment`
replace the single, ambiguous `support_session.ended_by_timeout` this
Specification originally proposed — the audit correctly identified
that one name conflated two conceptually distinct endings (a Session
that ran its full course while actively used, versus one that was
genuinely abandoned mid-way and caught by the grace-period safety net,
§21). This distinction is auditable and meaningful: an operator
reviewing the Audit Center can now tell the difference between "this
customer's support need was fully served" and "this session was
dropped and never resumed," without needing a free-text reason field
this codebase's audit schema does not otherwise use.

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

## 20. Functional Requirements — Support View State Schema (SPEC-1)

Resolves Rule O's deferred field-by-field schema question, per the
Product Architect's explicit SPEC-1 decision. The Support View State
is a **minimal, explicitly allowlisted, customer-authored** record —
never a mirror of the tenant SPA's entire React state, and never
containing anything beyond what a Support operator genuinely needs to
provide VIEW + POINT + GUIDE assistance for the two evidenced
scenarios this capability exists for (the OCR field-status case; the
defect-vs-misunderstanding case, per `BDR-0018` §1).

**FR-49.** The Support View State document's schema is fixed to
exactly four categories, and no field outside them may ever be
included:

1. **Navigation/context** — the customer's current tenant route/view
   identifier, and the relevant workflow/module context (e.g. "Add
   Stock — OCR Review step"), sufficient for the Support operator to
   understand *where* the customer is without seeing raw route
   parameters or internal identifiers beyond what's needed for this
   purpose.
2. **Current workflow context** — the identifier of the specific
   product/record being worked on, where necessary for guidance (e.g.
   which line item the customer is currently editing), and the current
   step within a multi-step workflow (e.g. which OCR review row).
3. **Approved transient UI state** — only the specific, named,
   allowlisted transient states genuinely needed for the realistic
   support scenarios already evidenced: OCR field-status indicators
   (`detected`/`review`/`not_found`, per `AddStockView.tsx`'s own
   existing badge states), active validation/error messages currently
   shown to the customer, and whether a specific guidance-relevant
   modal or panel is currently open. No other transient UI state may
   be added to this category without a new Specification-level
   decision (Rule Z's own "no future carve-out without an explicit
   decision" discipline, applied here to scope creep rather than write
   authority).
4. **Viewport information, where technically necessary for pointer
   alignment** — viewport dimensions and, only if required for the
   Support operator's pointer coordinates to align correctly with what
   the customer sees, the current scroll position. Nothing else about
   the customer's device, browser, or environment is included.

**FR-50.** The Support View State must never contain: any Firebase
Auth credential or token; any authentication secret; the one-time
Support code itself, in any form; any payment or financial-account
secret; any password, PIN, or hash of either; or any other information
not directly required to satisfy one of FR-49's four categories for
the purpose of VIEW + POINT + GUIDE assistance. This is an explicit
negative requirement, not merely an absence — a Rule 8 implementation
must be able to demonstrate no code path can populate the document
with any of these, not merely that no current code path happens to do
so.

**FR-51.** Every field in the Support View State's actual schema (as
finalized at Rule 8, within FR-49's four fixed categories) must be
traceable to a specific, named support-diagnosis need — the same
minimum-necessary discipline Business Visibility's own curated read
already applies (Gap 2), now made concrete and testable against an
explicit allowlist rather than stated only as a principle (§26 below
restates this principle; this FR is what makes it enforceable).

**FR-52.** A Support View State document belongs to exactly one
Session and exactly one business for its entire lifetime — never
shared, reused, or readable across Sessions or businesses (I-1, I-5,
FR-38). The document must become unreadable to any Support operator
the instant its governing Session transitions to `ended`, by any means
(FR-34–FR-37, §21) — the same immediate, total revocation FR-36
already requires for the rendering connection itself, applied here to
the underlying data record.

**FR-53.** The existence, content, or freshness of a Support View
State document must never itself establish, extend, substitute for, or
imply Session authorization (I-10). A Support operator's ability to
read a Support View State document is always and only a *consequence*
of an already-valid, already-established Session (FR-11) — never an
independent access path, and never a signal the server treats as proof
of an active, valid Session on its own.

## 21. Functional Requirements — Connectivity, Heartbeat, and Reconnection (SPEC-2)

Resolves Rule U's deferred abandoned-session detection mechanism, per
the Product Architect's explicit SPEC-2 decision. The governing
principle, restated from the Product Architect's own framing and fixed
here as Invariant I-10: **rendering connectivity is not authorization**
— a temporary network or transport interruption must never immediately
end an otherwise-valid Session, and a restored connection must never
create, extend, or recreate any authorization it did not already have.

**FR-54.** While a Session is `active`, the customer's browser, under
either rendering path, must send a heartbeat signal at a regular
interval — proposed at **every 15 seconds** — to a server-authoritative
location (e.g. a privileged write updating the Session document's own
`lastHeartbeatAt` field). This figure is this Specification's own
proposal, offered clearly enough for Rule 8 to evaluate and adjust, not
a figure carried over from any existing precedent (no comparable
heartbeat mechanism exists anywhere else in this codebase).

**FR-55.** If the server does not receive a heartbeat for **30
seconds** (missing two consecutive expected heartbeats under FR-54's
proposed interval), the Session's connectivity status must transition
to `reconnecting` — **not** to `ended`. The Session's own `status`
field remains `active`, and its `expiresAt` (the 60-minute cap, FR-17)
is completely unchanged by this transition (I-11).

**FR-56.** If a heartbeat resumes while the Session is in
`reconnecting` status and before the grace period (FR-57) elapses, the
Session must return directly to full `active` connectivity status.
This reconnection must never modify `establishedAt`, `expiresAt`, or
any other authorization-bearing field on the Session or its originating
Invitation — it restores the rendering/transport layer only (I-10).

**FR-57.** The grace period — proposed at **2 minutes from the last
successful heartbeat** — bounds how long a Session may remain in
`reconnecting` status before being treated as genuinely abandoned. This
figure, like FR-54's interval, is this Specification's own proposal for
Rule 8 to evaluate, not an existing precedent. Under no circumstance
may the grace period cause a Session's total active lifetime to exceed
its original 60-minute cap (I-11): if the grace period's own natural
end would fall after `expiresAt`, the Session ends at `expiresAt`, not
at the grace period's end.

**FR-58.** If the grace period elapses without a heartbeat resuming,
the server must transition the Session to `ended`, `endedBy:
'abandonment'`, producing a `support_session.ended_by_abandonment`
audit entry (§18, FR-44) — with the same immediate, total,
server-enforced revocation effect FR-36 already requires for explicit
termination, never a client-side-only state change.

**FR-59.** The server is exclusively authoritative for whether a
Session is `active`, `reconnecting`, or `ended`. A client's own local
belief that its Session is still active or still within its grace
period must be verified against the server's own Session record before
any rendering-path action may resume (re-establishing a WebRTC stream,
resuming Support View State reads) — a client may never unilaterally
declare an expired or ended Session active.

**FR-60.** A reconnection, under either rendering path, must never: be
treated as a new Invitation-consumption event; extend, renew, or reset
the Session's `expiresAt`; bypass or substitute for code consumption
(FR-11); permit reuse of an already-consumed code; create a second,
concurrent Session for the same business (I-2's single-active-
Invitation discipline extends here to Sessions); or circumvent
server-side expiry or termination in any way (I-10).

**FR-61.** Once a Session has transitioned to `ended` — by explicit
termination (FR-34/FR-35), natural 60-minute completion
(`support_session.completed`), or grace-period-expired abandonment
(FR-58) — no reconnection of any kind may restore it. Establishing
further assistance requires the customer generating an entirely new
Invitation (FR-1) and an operator newly consuming it (FR-11), producing
a wholly new Session, never a revival of the old one.

**FR-62.** Temporary WebRTC transport interruption (desktop path) and
temporary Firestore/Support-View-State listener interruption (mobile
path) are both governed by the identical heartbeat/grace-period
mechanism (FR-54–FR-61) — no path-specific exception, shorter grace
period, or divergent behavior is introduced for either rendering path.

## 22. Proposed Data Model

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
- `expiresAt` — `establishedAt` + 60 minutes (FR-17), never modified by
  any connectivity event (I-11).
- `status`: `'active' | 'reconnecting' | 'ended'` (FR-55, FR-56).
- `lastHeartbeatAt` — server timestamp, updated at each successful
  heartbeat (FR-54); the basis for the `active`→`reconnecting`
  transition (FR-55).
- `graceExpiresAt` — set when `status` transitions to `reconnecting`
  (`lastHeartbeatAt` + 2 minutes, capped at the Session's own
  `expiresAt` per FR-57), `null` otherwise.
- `endedAt`, `endedBy`: `'customer' | 'support' | 'completed' |
  'abandonment'` (FR-36, FR-58, FR-61) — `'completed'` for a Session
  that reached its natural 60-minute cap while still `active`,
  `'abandonment'` for one ended by grace-period expiry, distinguished
  per the audit-event resolution (§18, FR-44).

**`businesses/{businessId}/supportSessions/{sessionId}/webrtcSignaling/{...}`**
(desktop path only) — SDP offer/answer/ICE-candidate exchange
documents, ephemeral, deleted or expiring with the Session (FR-21;
exact cleanup timing, §24 item 10).

**`businesses/{businessId}/supportSessions/{sessionId}/supportViewState`**
(mobile path only) — the customer-published, Support-read-only mirror
document, its schema now fixed in full by §20's four allowlisted
categories (FR-23–FR-26, FR-49–FR-53):
- `route`, `workflowContext` — Category 1 (Navigation/context).
- `selectedRecordId`, `workflowStep` — Category 2 (Current workflow
  context), present only where the active workflow has a specific
  record/step to name.
- `fieldStatus` — Category 3 (Approved transient UI state), an
  allowlisted map of field identifiers to `'detected' | 'review' |
  'not_found'` (directly mirroring `AddStockView.tsx`'s own existing
  badge states, per §20's own citation), plus `activeValidationMessage`
  and `openPanelId`, each present only when applicable.
- `viewportWidth`, `viewportHeight`, `scrollPosition` — Category 4
  (Viewport information), `scrollPosition` present only where pointer
  alignment requires it.
- No field outside these four categories may exist on this document
  (FR-49), and FR-50's exclusion list (credentials, secrets, the
  Support code, payment/security secrets) applies unconditionally
  regardless of category.

**`businesses/{businessId}/supportSessions/{sessionId}/pointer`** — the
coordinate channel (FR-27–FR-30), common to both paths: `{x, y,
timestamp}`, overwritten frequently, never accumulated as history.

## 23. Failure / Edge Cases

- **Customer generates a new code while a Session from a prior code is
  still active.** The new Invitation (FR-2) does not affect the
  already-established Session (a distinct record, I-5) — the active
  Session continues until it independently ends (FR-34–FR-37); the new
  code is available for a *future* session, once the current one ends.
  This is not contradictory: Rule F's "single active Invitation" and
  Rule K's "single Session, one business" govern two different
  records, and this Specification does not conflate them.
- **Support operator's connection drops mid-session (desktop path).**
  Governed by the heartbeat/grace-period mechanism (§21, FR-54–FR-62)
  — a temporary drop enters `reconnecting`, not `ended`; only a
  grace-period-expired drop is treated as abandonment. The *specific*
  WebRTC-level signal a Rule 8 implementation uses to detect the drop
  (ICE connection state, WebRTC's own `disconnected`/`failed` states)
  remains a Rule 8 question (§24), but the governing behavior —
  distinguish temporary loss from genuine abandonment, never end
  immediately — is fixed here.
- **Support operator's connection drops mid-session (mobile path).**
  Identical governing mechanism (FR-62) — a Firestore listener
  disconnecting briefly is not treated differently from a WebRTC
  connection doing so.
- **Brief reconnection during an active Session** (either rendering
  path). Restores full `active` connectivity status with no effect on
  the Session's own authorization or `expiresAt` (FR-56, I-10, I-11) —
  this is the ordinary, expected case the heartbeat/grace-period
  mechanism exists to support, not an edge case requiring special
  handling beyond what §21 already specifies.
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

## 24. Explicit Rule-8 Technical Questions

Per the precedent's own convention, listed here rather than silently
resolved. Two items previously listed here — the abandoned-session
detection mechanism and the Support View State's exact schema — are
now resolved by this Specification (§20, §21) and are **not** repeated
below; what remains are genuinely lower-level implementation questions
the now-fixed architectural contract still leaves to Rule 8, per the
Product Architect's own framing: this Specification defines **what**
the system must guarantee, Rule 8 evaluates **whether** the proposed
architecture can safely and correctly guarantee it.

1. Exact WebRTC signaling design (SDP offer/answer/ICE-candidate
   message shape and Firestore document lifecycle for the signaling
   exchange itself, FR-21).
2. TURN/relay requirements — whether a managed or self-hosted TURN
   service is needed for reliable NAT traversal on this product's
   actual mobile-network-heavy customer base, and if so, which.
3. `firestore.rules` implementation for every new collection this
   capability introduces (Invitation, Session, Support View State,
   `webrtcSignaling`, pointer) — this Specification fixes the required
   *properties* (FR-24, FR-42, FR-50, etc.) but not the rules text
   itself, per §2's scope exclusion.
4. Transaction correctness for FR-11's atomicity guarantee and for the
   Invitation-overwrite behavior FR-2 requires.
5. Heartbeat implementation details — the exact client-side timer
   mechanism, how a privileged write vs. a client-writable field with
   server-side validation is chosen for `lastHeartbeatAt` (FR-54).
6. Exact reconnect timing/threshold feasibility — this Specification
   proposes a 15-second heartbeat interval, a 30-second missed-
   heartbeat threshold, and a 2-minute grace period (FR-54, FR-55,
   FR-57); Rule 8 should validate these figures against real network
   conditions for this product's customer base, adjusting them if
   infeasible, without reopening the *principle* they implement.
7. Performance/load implications of the heartbeat mechanism at
   whatever scale this capability sees in practice.
8. Concurrent-session behavior at the infrastructure level (e.g.
   whether two heartbeats racing against the same Session document
   need additional transaction discipline beyond what FR-11 already
   requires for Invitation consumption).
9. Browser compatibility specifics beyond the already-verified
   `getDisplayMedia` support matrix (`BDR-0018` §2.2) — e.g. exact
   `RTCPeerConnection` API differences across supported browsers.
10. `webrtcSignaling` document cleanup — deleted on Session end or
    expiring/orphaned and garbage-collected (a storage-hygiene
    question, not a security one — FR-21's own security requirements
    are unaffected either way).
11. The exact mechanism for determining, at Session establishment,
    which rendering path applies (client-side `getDisplayMedia`
    feature-detection, presumably, but the exact detection code and
    fallback behavior is a Rule 8 question).
12. Security testing requirements for the full lifecycle this
    Specification now fully defines (§20, §21) — penetration-testing
    scope, specifically around the heartbeat/reconnection boundary
    (FR-59's "server never trusts client self-assertion" requirement)
    and the Support View State allowlist's actual enforcement.
13. Race conditions beyond FR-11's already-specified atomicity — e.g.
    a heartbeat arriving in the same instant as an explicit termination
    request (FR-34/FR-35).

## 25. Non-Goals / Explicit Exclusions

Restated directly from `BDR-0018` §5 and the Policy's own Rule Z, for
this Specification's own explicit record — including one item the
Specification Acceptance Audit found missing from this consolidated
list despite being substantively preserved everywhere else in the
document (BDR-0018 item P): no write, click, typing (beyond the
customer's own unaffected session), submission, creation, editing, or
deletion performed by Support; **no second Support permission tier —
every eligible operator tier (Rule A) receives identical VIEW + POINT
+ GUIDE authority, with no elevated or write-capable variant of the
role existing anywhere in this capability**; no "Request Control"; no
full write-capable Impersonation (§9.10); no unrestricted remote
control; no background/passive monitoring outside an explicit,
customer-initiated, time-boxed Session (the heartbeat mechanism, §21,
exists solely to maintain an already-authorized, already-active
Session's connectivity — it is never a standing or passive monitoring
capability, and ceases entirely the instant no Session is active); no
permanent access; no subscription/billing override capability of any
kind.

## 26. Sensitive-Field Masking

The Policy's Rule Y explicitly deferred this question to this
Specification stage. This Specification resolves the **principle**
and, with §20's schema now fixed, can state it concretely rather than
hypothetically: every one of the Support View State's four allowlisted
categories (§20) was itself selected against the same minimum-necessary
discipline Business Visibility's own curated read already applies
(Gap 2) — FR-51 makes this a testable requirement, not only a stated
principle. Whether any *specific* field within that now-fixed schema
should be further masked (e.g., a product name partially obscured) is
still deferred to Rule 8:

**Resolved here:** the schema itself (§20) is already the
minimum-necessary set — four fixed categories, an explicit exclusion
list (FR-50), and a traceability requirement tying every field to a
named diagnostic need (FR-51). No field exists in the schema that
wasn't already selected for being necessary, which meaningfully narrows
what masking, if any, would even need to address.

**Not resolved here, deferred to Rule 8:** whether any specific field
*within* that already-minimal schema should be further masked (e.g., a
cost price rounded rather than shown exactly) even though it already
qualified as diagnostically necessary to be included at all. No
existing convention anywhere in this codebase governs field-level
masking (confirmed,
`SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`
§20 [that document's own §20, an external citation, distinct from this
Specification's own §20] — inventing specific masked fields here, with
no such convention to ground them in, would be guessing rather than
specifying. Rule 8, working against this Specification's now-concrete
schema rather than a hypothetical one, is meaningfully better
positioned to resolve this than the original draft's "deferred to a
not-yet-fixed schema" framing allowed.

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

## 27. Traceability Matrix

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
| 15 | Rule O | FR-23, FR-25, FR-26, FR-49, FR-50, FR-51, FR-52, FR-53 |
| 16 | Rule P | FR-27, FR-28, FR-29, FR-30 |
| 17 | Rule Q | FR-31, FR-32, FR-33 |
| 18 | Rule R | FR-34 |
| 19 | Rule S | FR-35 |
| 20 | Rule T | FR-36, I-8 |
| 21 | Rule U | FR-37, FR-54, FR-55, FR-56, FR-57, FR-58, FR-59, FR-60, FR-61, FR-62, I-10, I-11 |
| 22 | Rule V | FR-47, FR-48, I-9 |
| 23 | Rule W | FR-44, FR-45 |
| 24 | Rule X | FR-46 |
| 25 | Rule Y | §26, FR-51 |
| 26 | Rule Z | FR-30, FR-43 |

## 28. Acceptance Criteria

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
    any circumstance, at any stage of this lifecycle (I-6, §25).
19. The Support View State's schema is fixed to exactly four
    allowlisted categories, contains no credential, secret, or the
    Support code itself, and every field traces to a named support-
    diagnosis need (FR-49–FR-51).
20. A Support View State document is unreadable the instant its
    governing Session ends, and never itself constitutes or implies
    authorization (FR-52, FR-53, I-10).
21. A temporary connectivity interruption (either rendering path) does
    not immediately end an active Session; it enters a bounded grace
    period, and reconnection within that period restores full activity
    with no change to the Session's own authorization or 60-minute cap
    (FR-55–FR-57, I-10, I-11).
22. A reconnection can never create, extend, renew, or recreate any
    authorization, bypass code consumption, reuse a consumed code, or
    revive an ended Session (FR-60, FR-61).
23. The server, never the client, is authoritative for whether a
    Session is active, reconnecting, or ended (FR-59).

## 29. Governance Notes

- This is a Specification document only. No `apps/`, `server/`,
  `firestore.rules`, `tests/`, or `firestore.indexes.json` file is
  touched by this document.
- **This is a correction pass on the original draft**, incorporating
  the Product Architect's SPEC-1 and SPEC-2 resolutions following the
  Specification Acceptance Audit's findings. Corrected: FR-26 (now
  defines the Support View State schema in full, §20, rather than
  deferring it); FR-37 (now defines the heartbeat/grace-period
  mechanism in full, §21, rather than deferring it); FR-4 (constant-
  time comparison now explicit); FR-44 (the natural-completion-vs-
  abandonment audit-event ambiguity resolved via distinct action
  types, per the Product Architect's Option B choice); §25 (Non-Goals,
  "no second permission tier" now explicit). Also corrected, found
  during this pass: three pre-existing, unrelated cross-reference
  defects in the original draft (§5 item 1's "§29" should have read
  "§25"; the original FR-26's "see §17" should have read "§12"; the
  original FR-9's "§18" should have read "§16") — none affected any
  business or technical decision, all fixed as part of touching the
  surrounding text for other reasons, flagged here per this session's
  established discipline of disclosing rather than silently leaving
  known defects.
- The 5-minute code validity, 5-attempt lockout threshold, 15-minute
  lockout cooldown, and 60-minute maximum Session duration are
  **unchanged** by this correction pass — confirmed by direct
  re-reading of FR-6, FR-14, and FR-17, none of which was touched.
- This Specification does not modify `BDR-0018`, its Policy,
  `18-superadmin-v1-architecture-gap-resolutions.md`, or Architecture
  §9.7/§9.10 — the future architecture-text amendment to §9.7 the
  Policy already identified as a necessary follow-up remains
  unperformed here as well.
- This Specification is **Accepted**. The Product Architect's
  acceptance is recorded below, "Product Architect Acceptance."
- `docs/specs/README.md` is not modified by this document.
- The `POL-NNNN` numbering queue this capability's Policy identified
  (three unnumbered documents observing `POL-0015`) remains unresolved
  and is not this Specification's concern to address.

## Product Architect Acceptance

**Status:** Accepted. This Specification, including its SPEC-1
(Support View State schema, §20) and SPEC-2 (heartbeat/reconnection,
§21) correction-pass resolutions, is approved as a complete document.
The Product Architect authorizes progression to the next governance
stage: a Rule 8 Assessment, falsifying the proposed architecture
against the actual repository before any Implementation Plan or
Implementation Authorization is considered. Not started by this
document.

**Scope of this acceptance:** covers this Specification's content in
full, as corrected by the SPEC-1/SPEC-2 pass. Does not reopen, amend,
or re-approve `BDR-0018` or the Policy themselves (both remain approved
exactly as they already were). Does not itself constitute a Rule 8
Assessment, Implementation Plan, or Implementation Authorization, each
of which remains a distinct, separately-gated future step.

## 30. Next Governance Step

Per this repository's governance chain: with this Specification now
Accepted, the next governance step is a **Rule 8 Assessment** —
falsifying the proposed architecture (both rendering paths, the
one-time-code model, tenant isolation, the heartbeat/reconnection
mechanism, the 60-minute invariant, pointer synchronization, audit
integrity, masking, concurrency, `firestore.rules`, WebRTC signaling/
TURN requirements, browser compatibility, performance, and failure
recovery) against the actual repository, not merely confirming it on
paper. This document's own §24 (13 remaining Rule-8 technical
questions) and §26 (the still-open specific field-masking question)
are the starting point for that assessment, not an exhaustive list of
everything it must investigate. No Rule 8 Assessment, Implementation
Plan, or Implementation Authorization is drafted, started, or implied
by this document itself.

**Lifecycle:** Drafted → Product Architect review → Correction pass
(SPEC-1/SPEC-2) → **Accepted (this step)** → Not yet assessed under
Rule 8. Not Implemented.
