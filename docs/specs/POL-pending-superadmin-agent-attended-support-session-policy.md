Policy

# POL-pending — SuperAdmin Agent Attended Support Session Policy

**Status:** ✅ Drafted. Operationalizes every DECIDED business rule in
`BDR-0018` (SuperAdmin Agent Attended Support Session: Rendering
Mechanism and Support Authority Boundary) into enforceable "how,
specifically" operational rules. Does not authorize implementation.

## Numbering (Not Assigned Here)

No `POL-NNNN` identifier is assigned by this document. Per
`19-governance-bdr-policy-framework.md`'s Numbering Ledger
assignment-authority rule — "assigning a `POL-NNNN` number requires an
explicit Product Architect decision, made each time... No `POL-NNNN`
number may be inferred from repository state, from the highest
previously-assigned number, or from any other document's convention" —
and consistent with the identical discipline this repository's own
`POL-pending-business-worth-evolution-policy.md` (later assigned
`POL-0010`) and `POL-pending-existing-product-stock-entry-purchase-authority.md`
already established for the same situation, this document does not
self-assign one.

**Observed state, by direct inspection at drafting time, reported for
transparency, not claimed as a decision:** `POL-0001`–`POL-0014` are
all currently assigned in the unprefixed `POL-NNNN` namespace, with no
gap. **`POL-0015` is the next collision-free slot by observation
only.** Two other documents already in this repository —
`POL-pending-existing-product-stock-entry-purchase-authority.md` and
`POL-pending-selling-price-unit-invariant-amendment.md` — independently
made this identical observation before this document was drafted and,
consistent with this same discipline, neither claimed the number
either. **This means there are now three unnumbered Policy documents
in this repository simultaneously observing `POL-0015` as the next
available slot.** This document does not attempt to resolve that
queue — which of the three (if any, or in what order) receives
`POL-0015`, `POL-0016`, or another number is an explicit Product
Architect decision this document defers entirely, flagging the
situation plainly rather than silently picking a position in an
unstated queue.

**Location note:** Filed in `docs/specs/`, unprefixed, under the same
cross-cutting `POL-NNNN` namespace `BDR-0018` itself was filed under —
this Policy's subject matter (SuperAdmin platform-operator authority,
Architecture §9.7's Support Session concept, tenant SPA rendering
consent, and audit conventions) spans the same territory that led
`BDR-0018` to be filed unprefixed rather than under Module #18's own
numbering, for the identical reason.

**Depends on:** `BDR-0018` (Approved) — this Policy operationalizes
every business decision `BDR-0018` already made and does not
re-decide, reopen, or reinterpret any of them. Also depends on, without
amending: `docs/architecture/09-superadmin-architecture.md` §9.7
(Support Session) and §9.10 (Impersonation) — see "Reconciliation With
Architecture §9.7/§9.10," below; `18-superadmin-v1-architecture-gap-resolutions.md`
Gap 2; `POL-0009` (SuperAdmin-Assisted Initial Stock Recovery Policy) —
the closest existing domain precedent, whose rule shape and
"Operationally:" convention this Policy follows; `12-security-architecture.md`
and `07-data-architecture.md` (tenant-isolation discipline).

**Followed by:** A Specification, fixing the Support View State
schema, exact server routes, exact audit `actionType` string values,
sensitive-field masking rules, and the SuperAdmin/tenant-side UI flow
— not started by this document. Rule 8 Assessment and Implementation
Authorization remain further, separately-gated steps after that.

---

## Purpose

`BDR-0018` establishes that SuperAdmin gains a bounded,
customer-assisting Attended Support Session capability — VIEW + POINT
+ GUIDE only, hybrid device-appropriate rendering, no write authority
ever — and explicitly identifies six categories of operational detail
it leaves open (its own §6). This Policy resolves those, and every
other operational question the governing task named, into concrete,
enforceable rules a future Specification can build against — without
deciding anything that is properly a Specification-stage technical
question (exact schema, exact route shape, exact UI).

## Terminology — Inherited From BDR-0018, Not Redefined

**Attended Support Session**, **VIEW + POINT + GUIDE**, **Support View
State** (the mobile rendering path's own name), and **Support-tier
operator** all carry exactly the meaning `BDR-0018` §§1–2 already fix.
This Policy introduces no new business term for any of these.

---

## Repository Precedents Examined

Per the task's own investigation requirement, checked directly against
the repository before any rule below was drafted:

1. **Authentication and authorization** — the `requireAuth →
   requirePlatformOperator → [role]` chain (`server/superadminAuth.ts`,
   confirmed identical across all 15 existing `/api/superadmin/*`
   routes). Directly reused, unmodified, below.
2. **SuperAdmin/platform operator authorization** — `platform_operators/{uid}`,
   `platformRole` ∈ `{support, developer, superadmin}`. Confirmed
   (`SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md` §12):
   `'support'`/`'developer'` are structurally recognized but
   functionally inert everywhere — no existing route branches on them.
3. **Tenant/business isolation** — every existing privileged route
   takes `businessId` as an explicit, server-re-verified parameter;
   `firestore.rules`' `isMemberOf`/`isOwnerOf` independently gate
   tenant-to-tenant access, unaffected by platform-operator authority.
4. **One-time credentials/authorization codes** — the closest, most
   directly reusable precedent found anywhere in this codebase:
   `server/initialStockRecoveryAuthorization.ts` and its
   `firestore.rules` counterpart (`initialStockRecoveryAuthorizationActive()`,
   ~line 305) — a fixed-id-per-business `current` document, written
   inside a single Firestore transaction, carrying a `status` field
   and an `expiresAt` timestamp checked directly at the rules layer
   (`request.time < ...expiresAt`).
5. **Expiry/timeboxing** — the same `expiresAt` pattern (#4); also
   Architecture §9.7 (60 min) and §9.10 (30 min), both explicitly tying
   duration to write-risk.
6. **Lockout/brute-force protection** — the Clear-Data Password
   feature built and committed earlier in this session
   (`server/index.ts`, `/api/business/clear-data-password/*`):
   `crypto.scrypt` + random salt, `crypto.timingSafeEqual`,
   failed-attempt counter, time-boxed lockout after a threshold.
7. **Audit logging** — `server/platformAuditLog.ts`,
   `platform_audit_log/{eventId}`, server-generated `actorUid`/
   `actorRole`/`actionType`/`targetBusinessId`/`targetUid`/
   `justification`/`timestamp`, never client-supplied.
8. **User consent** — Architecture §9.10's own consent-capture pattern
   (a reference to an Admin-initiated request, recorded in the session);
   `getDisplayMedia()`'s own browser-native, per-use picker consent
   (confirmed a genuine, separate, non-bypassable layer,
   `SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md` §20).
9. **Session termination** — `isBusinessSuspended()` folded into
   `isMemberOf()`, the existing "effect at the data layer, not next
   reload" discipline already applied to business suspension.
10. **Sensitive data masking** — **not found anywhere in this
    codebase.** No field-level masking convention of any kind exists
    today — confirmed by search. This is a genuine gap, not an
    oversight in this investigation.
11. **Support/customer access** — Business Visibility's curated,
    justified, per-call read model (Gap 2).
12. **Architecture §9.7 (Support Session)** — specified, never built;
    full text re-verified (`SUPERADMIN_AGENT_CAPABILITY_AND_AUTHORITY_INVESTIGATION.md`
    §7 and its own follow-ons).
13. **Architecture §9.10 (Impersonation)** — specified, never built;
    explicitly not being built by `BDR-0018` either.
14. **Rules around platform operators accessing tenant data** —
    Principle 2.8 (no raw-tenant-read outside an audited exception);
    Gap 2's own excluded-collections list.
15. **Existing platform audit action types** — `KNOWN_ACTION_TYPES`
    in `server/auditLogQuery.ts` (7 entries, plus two more written but
    not yet in the filter allowlist — a known, pre-existing, unrelated
    technical defect).
16. **Firestore/session security patterns** — `onSnapshot` as the sole
    existing realtime primitive; no WebSocket/WebRTC library anywhere
    in `package.json`; `getDisplayMedia`/`RTCPeerConnection` as
    browser-native APIs requiring no new dependency.

No existing convention found above is reinvented below — each rule
either reuses one directly or explicitly states why none applies.

---

## Decisions Already Determined by BDR-0018 — Not Re-Decided Here

Restated for traceability, not reopened:

- VIEW + POINT + GUIDE is the entire support authority; zero write
  capability, by any mechanism, ever.
- No "Request Control," no second permission tier, no escalation path
  from read-only to write.
- The session is customer-initiated, single-use-code-gated, and
  either party may end it.
- Rendering is hybrid: desktop uses native screen-share; mobile uses a
  purpose-built Support View State over Firestore's existing
  `onSnapshot`.
- The pointer is a common, non-interactive coordinate channel across
  both rendering paths.
- Full, write-capable Impersonation (§9.10) is not being built and is
  not a step toward being built.

---

## Operational Rules

**Rule A — Eligible operator tier.** An Attended Support Session may
be held by any platform operator whose `platformRole` is `'support'`,
`'developer'`, or `'superadmin'` — matching Architecture §9.7's
original intent ("Support, Developer, or SuperAdmin... the audit
requirement is what makes it safe, not restricting it to the top tier
alone") rather than the narrower, `'superadmin'`-only reach every
*existing* SuperAdmin route happens to have today. This is a
deliberate widening from current practice, justified because this
capability carries strictly less risk than every `'superadmin'`-only
action (no write authority exists to misuse, unlike suspension,
operator provisioning, or payment confirmation). Operationally: a
future Specification must implement this as its own, distinct
authorization gate — not by relaxing `requireSuperAdmin` itself, which
must continue to protect every action that actually requires it.

**Rule B — Customer-initiated only; no operator-initiated path.**
An Attended Support Session may only be established following a
code the customer themselves generated and chose to share. There is
no route, mechanism, or override by which a Support-tier operator
may open a session against a business without that business's own
customer having generated a still-valid, unconsumed code for it. This
is a deliberate, explicit departure from Architecture §9.7's original
text, which specified no customer-consent requirement at all — see
"Reconciliation With Architecture §9.7/§9.10," below.

**Rule C — One-time code: generation and storage.** The code is
generated only in response to an explicit customer action (no
automatic, scheduled, or background generation). It is stored hashed
— following the Clear-Data Password precedent (#6, above) exactly:
`crypto.scrypt` with a random per-code salt, never plaintext, never
recoverable, only verifiable.

**Rule D — One-time code: format.** The code is a 6-digit numeric
value — matching this codebase's own existing UX convention for a
short numeric code (the staff quick-login PIN, `/api/staff/reset-pin`'s
own "exactly 6 dígitos numéricos" validation). This is a Policy-level
choice, made for consistency with an established product pattern, not
a Specification-level detail invented independently.

**Rule E — One-time code: validity window before use.** The generated
code remains valid to enter only for a short, bounded period after
generation — materially shorter than the session duration itself
(Rule H, below), since its only purpose is to bridge the moment the
customer reads it aloud to the moment the operator enters it, not to
function as a standing credential. **The exact figure (a small number
of minutes) is not fixed by this Policy** — this is flagged for
explicit Product Architect confirmation rather than invented, since,
unlike Rule H's duration (which reuses Architecture §9.7's own
already-decided figure), no existing precedent in this repository
fixes an analogous "code read-aloud window."

**Rule F — One-time code: single active invitation per business.** At
most one unconsumed, unexpired code may exist for a given business at
any time. Generating a new code necessarily invalidates whatever code
existed before it for that business — directly following the
"current"-fixed-id-document pattern (#4, above), which guarantees this
property by construction rather than requiring a separate rule to
police a growing collection.

**Rule G — One-time code: brute-force protection.** Following the
Clear-Data Password precedent (#6, above) exactly, given the code's
materially weaker entropy (6 digits, 1,000,000 possible values, versus
an owner-chosen password): a failed-attempt counter with a time-boxed
lockout after a threshold is mandatory, not optional. **The exact
threshold and lockout duration are not fixed by this Policy** — the
Clear-Data Password's own already-shipped figures
(`CLEAR_DATA_LOCKOUT_MAX_ATTEMPTS`/`_DURATION_MS`) are the best-
evidenced starting point for a future Specification to reuse or adapt,
not a number this Policy invents independently for a differently-
weighted risk (an attacker who successfully guesses this code gains
read-only screen visibility into one business for a bounded time, not
account access or a standing credential — a materially different
consequence than the Clear-Data Password's own "wipe real business
data" stakes, which may justify a different, likely stricter,
threshold; that judgment is left to the Specification stage informed
by this note, not decided here).

**Rule H — One-time code: atomic, one-time consumption.** Successful
entry of the code by a Support-tier operator immediately and
atomically transitions it out of any "usable" state — following the
recovery-authorization precedent's own `'unconsumed'`-style enum
transition (#4, above) — such that no race condition between two
simultaneous entry attempts (by the same or different operators) can
ever establish two sessions from one code, or allow the same code to
be consumed twice.

**Rule I — Session duration.** An established Attended Support Session
is valid for **60 minutes** from its own establishment, reusing
Architecture §9.7's already-decided figure directly — the closer
analog of the two existing time-boxed precedents (§9.7's 60 minutes
vs. §9.10's shorter 30 minutes, explicitly justified there by
write-risk this capability categorically does not carry).

**Rule J — Non-renewable without a fresh code.** A session may not be
extended, renewed, or silently kept alive past its Rule I duration by
any mechanism. Reaching a session in need of more time requires the
customer generating an entirely new code (Rule C–H) and the operator
establishing an entirely new session — directly reusing Architecture
§9.7's own explicit "non-renewable without a fresh request" rule and
§9.10's identical discipline.

**Rule K — Tenant/business scoping: one session, one business, no
exceptions.** A session is bound, at establishment, to exactly one
`businessId` — the business the consumed code belongs to — for its
entire duration. The code itself must be looked up **scoped by
`businessId` in the document/record path**, never via a flat,
business-agnostic code lookup across the whole platform. This is a
direct, explicit adoption of the tenant-isolation recommendation
`SUPERADMIN_AGENT_ATTENDED_SUPPORT_COBROWSING_IMPLEMENTATION_INVESTIGATION.md`
§11 already reasoned through in detail: a bare code-only lookup would
require the server to search across every business's invitation for a
hash match, reopening exactly the enumeration risk the business-scoped
path otherwise closes by construction. The Agent-facing entry flow
must therefore identify the business first (via the already-existing,
already-built Business Search/Directory) and enter the code second,
scoped to that specific business — never the reverse.

**Rule L — No standing or session-less access, ever.** There is no
mechanism, override, emergency path, or platform-operator privilege
level — including `'superadmin'` itself — by which a business may be
viewed under this capability without a currently active, validly-
established session traceable to a specific consumed customer code.
This is the direct, explicit restatement of Rule B as a security
boundary, not merely a UX flow description: even the highest
platform-operator tier has no bypass.

**Rule M — Support authority ceiling: structurally enforced, not
merely hidden.** Consistent with `BDR-0018` §2.1 and the "technically
impossible, not merely restricted" standard already recommended for
this exact capability
(`SUPERADMIN_AGENT_VIEW_ONLY_IMPERSONATION_INVESTIGATION.md` §9), the
Support-tier operator's viewer, under either rendering path (Rule N,
Rule O, below), must have no code path — none, under any
circumstance, including an operator's own attempt — capable of
performing a tenant write. For the desktop path, this follows from the
viewer holding no tenant credential, no live Firestore connection to
the business's data, and no dependency on the tenant SPA's own code at
all. For the mobile path, this follows from the viewer only ever
subscribing (read) to a Support View State document it can never
itself write to, enforced independently at the `firestore.rules` layer
for that new collection.

**Rule N — Desktop rendering: native browser consent is mandatory and
non-bypassable.** `getDisplayMedia()`'s own browser-native
screen/tab-selection picker is a **second, independent, mandatory**
consent layer, additional to and never replaced by the code-based
session consent (Rule B). The platform must never attempt to
pre-select, auto-approve, or otherwise circumvent this browser-native
prompt — the customer must always be the one who actively chooses
which tab/window is shared, at the moment of sharing, through the
browser's own unmodified UI.

**Rule O — Mobile rendering: Support View State is read-only and
minimum-necessary.** The Support View State exists solely to expose
the specific, diagnosis-relevant transient and persisted UI state a
customer's session already legitimately has — never a general-purpose
mirror of arbitrary tenant data, and never writable by the Support
operator's own session under any circumstance (Rule M). **The exact
field-by-field schema is not decided by this Policy** — `DEFER TO
SPECIFICATION`, per `BDR-0018` §6's own explicit deferral.

**Rule P — Pointer: non-interactive by construction.** The pointer/
guide overlay, common to both rendering paths, must be implemented
such that it is structurally incapable of receiving or dispatching any
DOM event (e.g., rendered with `pointer-events: none` or the
equivalent structural guarantee) — this is an application-independent,
browser-enforced property, not a discipline the application code must
remember to maintain. The pointer channel carries only coordinate/
timestamp data and must never be extended, by any future change, into
a channel capable of carrying an input, click, or keystroke event.

**Rule Q — Customer transparency: persistent, unmissable, for the full
session duration.** The customer must see a persistent, clearly
visible indicator for the entire time a session is active against
their business — directly modeled on the existing
`BusinessSuspendedBanner.tsx` precedent (a real, already-built,
`AppContext`-driven, app-wide banner pattern). The indicator must
disappear the instant the session ends, by any means (Rule R–T,
below), and must never be dismissible by the customer while the
session remains active (dismissing the indicator is not the same
action as ending the session — ending the session, Rule R, is the only
way to make it disappear).

**Rule R — Customer disconnect authority.** The customer may end an
active session at any time, unconditionally, with immediate effect —
this is a right the customer holds regardless of anything the
Support-tier operator does or does not do, and requires no
justification, confirmation delay, or operator acknowledgment to take
effect.

**Rule S — Support disconnect authority.** The Support-tier operator
may end an active session at any time — symmetrical to Rule R, using
the identical underlying mechanism, from the other side.

**Rule T — Termination is immediate, total, and server-enforced.**
Ending a session, by either Rule R or Rule S, must take effect at the
server/data layer instantly — following the identical "effect at the
Security Rules/data layer, not at the next reload" discipline already
proven for business suspension (`isBusinessSuspended()` folded into
`isMemberOf()`) — and must immediately and totally revoke the
operator's access under both rendering paths (severing the WebRTC
connection for desktop; denying further reads of the Support View
State document for mobile), not merely hide the connected indicator
client-side while access technically continues.

**Rule U — Abandoned session safety net.** If either party's browser
closes, loses connectivity, or otherwise disappears without an
explicit Rule R/S termination action, the session must not remain
silently, indefinitely active as a result. **The exact detection
mechanism (e.g., a heartbeat, a presence system, a connection-close
event) is not decided by this Policy** — `DEFER TO SPECIFICATION` —
but the underlying requirement is Policy-level and firm: exposure from
an abandoned session must be bounded, never indefinite, and must never
exceed the Rule I session duration even in the total absence of any
explicit termination action from either side.

**Rule V — Coexistence with the customer's ordinary tenant session.**
Establishing or ending an Attended Support Session must never log the
customer out of, interrupt, or otherwise disrupt their own ordinary,
already-authenticated tenant SPA session. The two are structurally
independent — the customer continues using SABUSH BPT normally
throughout, with the Attended Support Session existing alongside it,
not in place of it.

**Rule W — Audit: required event categories.** The following must each
produce a `platform_audit_log` entry, using the existing schema (#7,
above) unmodified — actor, target business, timestamp always
server-derived: code generation/invitation; session establishment
(successful code consumption); session termination by the customer;
session termination by the Support operator; session expiry (Rule I,
unused-out) or code expiry (Rule E, unused-out); and every failed code-
entry attempt (Rule G). **The exact `actionType` string values are not
decided by this Policy** — `DEFER TO SPECIFICATION`, per `BDR-0018`
§6's own explicit deferral. Note directly for the Specification stage:
`server/auditLogQuery.ts`'s `KNOWN_ACTION_TYPES` filter allowlist must
be updated at the same time any new `actionType` value is introduced —
not left stale, repeating the pre-existing, unrelated defect already
flagged elsewhere in this repository's own governance record.

**Rule X — What must never be logged.** The audit entries required by
Rule W must never contain: the code itself, in any form (plaintext or
hash); the mirrored/streamed screen content or Support View State
payload; the pointer's coordinate stream; or any underlying tenant
business data. Every audit entry is lifecycle metadata only (who,
which business, when, how the session started or ended) — consistent
with every existing audit entry in this codebase, none of which logs
underlying business data.

**Rule Y — Sensitive-field masking: not decided here.** Whether any
fields should be deliberately obscured even during a view-only session
is **`DEFER TO SPECIFICATION`**, per `BDR-0018` §6's own explicit
deferral and consistent with this investigation's own finding that no
masking convention exists anywhere in this codebase today (#10,
above) — this Policy does not invent one to fill that gap.

**Rule Z — No mutation-authority carve-out, ever, for any reason.**
No future amendment to this Policy, and no Specification built on top
of it, may introduce any write capability, "temporary" elevated
access, emergency override, or any other mechanism by which a Support-
tier operator gains mutation authority during an Attended Support
Session — this ceiling is not a default subject to future relaxation
by implementation convenience; any change to it is, by definition, a
new `BDR`-level decision, not a Policy or Specification one.

---

## Reconciliation With Architecture §9.7/§9.10

Per the task's own required investigation, stated precisely rather
than left implicit:

**Architecture §9.7 (Support Session), as originally drafted,
specified:** any of Support/Developer/SuperAdmin may initiate;
operator-stated `justification` required; **no customer-consent
requirement stated**; 60-minute time-box; issuance/expiry logged;
read-only access to raw tenant collections via a server-issued
credential, consumed by the SuperAdmin app itself (not the tenant SPA).

**This Policy's Attended Support Session narrows §9.7 in one
dimension and extends it in another:**
- **Narrows:** access is never a raw-collection credential handed to
  the SuperAdmin app — it is always mediated through one of the two
  rendering paths (Rule N, Rule O), each independently structured to
  make write access impossible, not merely unoffered.
- **Extends, by explicit override:** unlike §9.7's original text, this
  capability is **customer-initiated and requires the customer's own
  active code generation** (Rule B) — a materially stronger consent
  requirement than §9.7 ever specified, closer in spirit to §9.10's
  (Impersonation's) consent-capture pattern than to §9.7's own
  operator-initiated model.

**Architecture §9.10 (Impersonation) is entirely unaffected and not
superseded.** This Policy creates no path toward it, inherits none of
its write authority, and does not treat the Attended Support Session
as a stepping stone toward building it. §9.10 remains exactly as
deferred as `BDR-0018` §5 already states.

**Required future governance follow-up, identified but not performed
here:** Architecture §9.7's own text, as written, describes a
capability materially different from what `BDR-0018` and this Policy
now establish (no customer consent, raw-collection credential, no
rendering-path concept). A future architecture-document amendment to
§9.7 itself — updating its text to reflect that its "Support Session"
concept has been operationalized as this Policy's customer-consent-
gated, rendering-mediated Attended Support Session, not as originally
drafted — is identified as necessary for the architecture documents to
remain internally consistent, but is **not performed by this Policy**,
consistent with the task's own instruction not to silently rewrite
architecture during this stage.

---

## Traceability — Task Items to Resolution

| Task item | Resolution |
|---|---|
| A. Eligible operator tier | Rule A |
| B. Customer initiation requirements | Rule B |
| C. Code format/length/entropy/expiry/max attempts/lockout/single-active | Rules C–H |
| D. Session duration | Rule I |
| E. Renewal without fresh code | Rule J |
| F. Tenant/business scoping | Rule K |
| G. Access without an active session | Rule L |
| H. What Support may see | `BDR-0018` §2.1 (unchanged) + Rules M–O |
| I. Sensitive-data masking | Rule Y — **DEFER TO SPECIFICATION** |
| J. Desktop consent requirements | Rule N |
| K. Mobile Support View State security | Rule O (schema itself **DEFER TO SPECIFICATION**) |
| L. Pointer behavior and limits | Rule P |
| M. Session lifecycle states | Rules C–L, T–U (states named; exact field/enum design **DEFER TO SPECIFICATION**) |
| N. Customer disconnect authority | Rule R |
| O. Support disconnect authority | Rule S |
| P. Customer closes browser/tab | Rule U |
| Q. Support closes browser/tab | Rule U |
| R. Termination invalidates all access | Rule T |
| S. Audit requirements | Rule W (event categories); exact `actionType` strings **DEFER TO SPECIFICATION** |
| T. What must never be logged | Rule X |
| U. Coexistence with other tenant sessions | Rule V |
| V. Persistent connection indicator | Rule Q |
| W. Exact disconnect/termination semantics | Rules R–T (principle); exact technical mechanism **DEFER TO SPECIFICATION** |

---

## Scope Exclusions — Technical Implementation Not Decided Here

Consistent with `BDR-0018` §6/§7 and the Policy/Specification boundary,
this Policy does **not** decide:

- Firestore schema or field names for the code/invitation document,
  the session document, or the Support View State document.
- The `firestore.rules` implementation of any new collection this
  capability requires.
- The exact `actionType` string values (Rule W).
- The Support View State's field-by-field content (Rule O).
- Whether or how sensitive fields are masked (Rule Y).
- The abandoned-session detection mechanism (Rule U).
- The exact code-validity-window figure (Rule E) and lockout
  threshold/duration figures (Rule G) — flagged for explicit Product
  Architect input, not invented here.
- Database transaction design for code generation/consumption.
- The UI/interaction design for any screen this capability requires,
  on either the tenant or SuperAdmin side.
- Whether/how the customer and Support operator's spoken conversation
  itself is carried — `BDR-0018` §6 already defers this as separate,
  larger governance work this Policy does not scope.

Each of these is reserved for the Specification, Rule 8 Assessment,
and Implementation Authorization stages that must follow.

## Genuine Open Questions — Not Silently Resolved

- **The exact code-validity-window duration (Rule E)** — not fixed by
  this Policy; flagged for explicit Product Architect decision.
- **The exact brute-force lockout threshold/duration (Rule G)** — the
  Clear-Data Password's own figures are the best-evidenced starting
  point, but this Policy explicitly does not assume they transfer
  unchanged, given the different risk profile; flagged for explicit
  Product Architect decision or Specification-stage judgment informed
  by this note.
- **The POL-NNNN numbering queue** — three unnumbered Policy documents
  (this one and two others) currently observe `POL-0015` as the next
  available slot; this document does not resolve the ordering.

## Business Acceptance Criteria

- No rule above contradicts, narrows, or silently reinterprets any
  decision `BDR-0018` already made.
- Every task item (A–W) named by the governing task is either resolved
  by a specific, cited rule, or explicitly marked `DEFER TO
  SPECIFICATION` — none was silently skipped or guessed at (see
  Traceability table, above).
- Every rule reuses an identified, cited existing repository
  convention where one exists, and states plainly where none exists
  (Rule E's and Rule G's exact figures; Rule Y's masking question).
- Architecture §9.7 and §9.10 are reconciled explicitly, not silently
  reinterpreted or rewritten.

## Governance Notes

This Policy does not itself modify `docs/architecture/09-superadmin-architecture.md`,
`18-superadmin-v1-architecture-gap-resolutions.md`, or `BDR-0018`. The
identified future architecture-text amendment to §9.7 ("Reconciliation
With Architecture §9.7/§9.10," above) is a follow-on governance item,
not performed here. Recording this Policy's eventual `POL-NNNN` number
in `19-governance-bdr-policy-framework.md`'s Numbering Ledger, once
assigned, is a follow-on documentation step, mirroring the identical
deferral `POL-0008`'s and `POL-0010`'s own Governance Notes recorded
for their own numbers.

## Next Governance Step

Per `BDR-0018` §7 and `19-governance-bdr-policy-framework.md`'s
established hierarchy: a Specification, converting this Policy's
rules — together with `BDR-0018`'s own decisions — into functional
requirements, a data model, and acceptance criteria a Rule 8 Assessment
can be run against. Not drafted, started, or authorized by this
document. Per the governing task's own explicit instruction, this
document stops here and awaits Product Architect review and
acceptance — including resolution of the numbering queue named above
— before any further governance stage begins.
