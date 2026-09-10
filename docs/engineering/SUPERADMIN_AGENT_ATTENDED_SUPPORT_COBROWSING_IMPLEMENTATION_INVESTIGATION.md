# Read-Only Attended Support / Co-Browsing — Implementation Investigation

**STATUS: TECHNICAL IMPLEMENTATION-FIT INVESTIGATION ONLY.** No code
was written or modified. No BDR, Policy, Specification, Rule 8
Assessment, or Implementation Authorization was created or altered.
Nothing committed or pushed — this document, like the two before it,
lives entirely outside the repository.

Every major conclusion below is tagged per the task's own discipline:
**FOUND IN REPOSITORY**, **NOT FOUND IN REPOSITORY**, **INFERENCE FROM
EXISTING ARCHITECTURE**, or **NEW CAPABILITY REQUIRED**. Where a
recommendation is offered, it is explicitly labeled as a
recommendation, never presented as something that already exists.

This document does not reopen the Product Decision fixed in §§1–4 and
§24 of the source material (VIEW + POINT + GUIDE only, no write
authority, customer-initiated single-use code, mandatory transparency,
either side can disconnect). It investigates **how** that decision fits
the existing SABUSH BPT architecture, not **whether** it should exist.

---

## A. Existing Support Session — Investigated

**FOUND IN REPOSITORY:** Support Session is described in
`docs/architecture/09-superadmin-architecture.md` §9.7 and §6.5, and
evaluated (not built) in
`docs/engineering/18-superadmin-v1-architecture-gap-resolutions.md`
Gap 2. Direct search of `server/` and `apps/superadmin/src/` for
`support-session`, `supportSession`, `SupportSession` returns **zero
matches**. **It exists only in architecture/spec documents — no code,
no route, no schema, no test file references it anywhere.**

Since it was never built, none of the following exist to inspect:
authentication mechanism, session credential mechanism, businessId
scoping code, target-user identification code, duration/timebox code,
audit-event code, routes, or components. What **is** specified, per
direct quotation of §9.7 (already extracted in the prior investigation
and re-verified here): a server-issued, single-`businessId`-scoped,
read-only credential, 60-minute time-box, non-renewable without a
fresh request, issuance/expiry both logged, cannot escalate to a
write within the same credential.

**Can it realistically be extended for this capability?** There is
nothing built to "extend" — any implementation work here is new
implementation against an existing specification, not a modification
of existing code. This is an important, precise distinction: the
*specification* is real and reusable as a design reference; the
*mechanism* is not implemented and cannot be "reused" in the literal
code-reuse sense.

---

## B. Existing Impersonation — Investigated

**FOUND IN REPOSITORY:** Architecture §9.10, §4.6 (system-level
placement). Direct search of `server/`, `apps/tenant/src/`,
`apps/superadmin/src/` for `impersonat` (case-insensitive) returns
**zero matches** anywhere in application code. **Not implemented,
architectural only** — identical status to Support Session.

Per §9.10's text (re-verified, not paraphrased loosely): full
read/write session acting *as* the Admin; any tier
(Support/Developer/SuperAdmin) may initiate; requires the Admin to
have explicitly requested help, captured as a reference in the
impersonation record; 30-minute time-box; issuance/expiry logged;
persistent unmissable tenant-side banner during an active session;
scope capped at exactly the Admin's own permissions.

**Can any part of its architecture be safely reused without inheriting
write authority?** Two properties are directly reusable **as design
patterns**, not as code: (1) the **consent-capture pattern**
(referencing an Admin-initiated request in the session record) is a
real, evidenced precedent for how customer-initiated authorization
could be structured for the new capability — directly analogous to,
though not identical to, the single-use code the Product Decision
already specifies; (2) the **persistent tenant-visible banner**
requirement is a real, evidenced precedent for the "🟢 SABUSH Support
connected" indicator the Product Decision requires (§3, §17 of the
source material) — the architectural *principle* ("an Admin must never
be unaware a platform operator is currently acting as them... applied
to transparency") transfers cleanly to a view-only session, even
though no banner component exists to literally reuse (confirmed:
`grep -rn "impersonat" apps/tenant/src` returns zero matches, so no
banner component exists at all).

---

## 5. Support Session vs. Impersonation vs. the New Capability — Terminology Fit

Testing whether "a read-only rendering/co-browsing mode of the
existing Support Session architecture" is the right frame, against
the actual repository:

**INFERENCE FROM EXISTING ARCHITECTURE, not FOUND IN REPOSITORY** (since
neither mechanism is built, this cannot be a code-level finding): the
prior investigation in this series already reached exactly this
synthesis independently — "View-Only Impersonation is best understood
as Support Session's underlying access mechanism, consumed through a
different rendering surface... rather than a curated/raw JSON
response." This document's own investigation (§§7–12 below) confirms
that framing holds up at the technical-feasibility level too: the
scoping requirements (single `businessId`, time-boxed, server-issued,
read-only-by-construction) are identical to what Support Session
already specifies; only the **consumption surface** differs (rendered
UI/co-browse feed vs. raw JSON to a SuperAdmin screen).

**Recommended terminology** (a recommendation, not an existing
convention): **"Attended Support Session"**, used consistently
throughout this document, chosen specifically because: it does not
reuse "Impersonation" (which this repository's architecture reserves,
unambiguously, for the write-capable concept); it does not invent an
unrelated new term ("co-browsing" is accurate technically but is
industry jargon absent from this repository's existing vocabulary);
and it stays a variant of "Support Session," the term this
repository's own architecture already uses for the closest existing
specified concept.

---

## 7. The Most Important Technical Question — Can the Support Agent See the Actual Tenant SPA?

**FOUND IN REPOSITORY, decisive for everything downstream:** the
complete dependency list (`package.json`, both `dependencies` and
`devDependencies`, verified directly) contains **zero** WebSocket
libraries, **zero** WebRTC libraries, **zero** realtime-collaboration
libraries (no Socket.io, no PeerJS, no Yjs, no Automerge, no ShareDB),
and **zero** canvas/DOM-annotation libraries. The full list: `firebase`/
`firebase-admin` (the one realtime primitive that does exist — see
below), `express`/`cors` (plain HTTP), `@google/genai` (the Smart Stock
Entry AI provider, unrelated), `jspdf`/`jspdf-autotable`/`xlsx` (export
tooling, unrelated), `motion` (CSS/layout animation, not
networking), `lucide-react` (icons), plus standard build tooling
(`vite`, `typescript`, `tsx`, `esbuild`).

**FOUND IN REPOSITORY:** the server (`server/index.ts`, confirmed at
the file's own `expressApp.listen(PORT, ...)` call, line ~3238) is a
plain HTTP Express server — no `WebSocketServer`, no `http.createServer`
wrapping for upgrade handling, nothing resembling a persistent
bidirectional connection anywhere in the backend.

**FOUND IN REPOSITORY:** the *only* realtime push mechanism that exists
anywhere in this codebase is **Firestore's own client-SDK realtime
listener (`onSnapshot`)** — used pervasively throughout
`apps/tenant/src/context/AppContext.tsx` (dozens of call sites,
confirmed by direct reading across this and prior sessions' work) to
keep the tenant SPA's state synchronized with Firestore in real time.
This is the one, and only, existing "push new state to a browser"
primitive in this entire stack.

**This decisively rules out a naive interpretation of the ASCII
diagram in §7 of the source material** (a dedicated "co-browse client"
alongside the tenant SPA, and a "co-browse viewer" alongside SuperAdmin
Agent, implying purpose-built bidirectional infrastructure) **as
something that already exists** — it does not, in any form. Building it
requires **NEW CAPABILITY**, on one of two realistic paths, both
evaluated below on their actual technical merits rather than
popularity:

### Path 1 — Firestore-mediated state mirroring (extends the one existing realtime primitive)

**INFERENCE FROM EXISTING ARCHITECTURE:** the customer's own browser,
already authenticated with full read/write rights to its own
business's data (an unavoidable, already-true fact of how this app
works — no change needed to grant this), could **write** a curated,
periodically- or event-driven-updated "mirror" document to a new,
purpose-built, session-scoped Firestore location (e.g., something
shaped like `supportSessions/{sessionId}/mirrorState`) whenever a
support session is active. The Support Agent's SuperAdmin browser
would **only ever read** that one document via `onSnapshot`, using
exactly the same primitive already proven correct throughout this
codebase.

**Strengths, evidenced:** requires zero new client-side or server-side
networking dependency (no npm package to add) — `onSnapshot` already
exists in the `firebase` SDK already installed. Fits this repository's
existing pattern of "the privileged server or `firestore.rules`
defines exactly what's readable, never a raw open channel" (Principle
2.8/2.9, applied here as: a new, tightly-scoped collection with an
explicit rules-layer boundary, not a general-purpose pipe).

**Genuine limitation, stated honestly, not glossed over:** this is
**not** literal, automatic, pixel-perfect rendering — it requires the
tenant SPA to be **deliberately instrumented** to publish whichever
pieces of state matter (the OCR field-status badges named in the
Product Decision's own §4, current screen/navigation, visible modal,
etc.) into the mirror document's shape. Anything not explicitly wired
to publish does not appear on the Agent's side. This is a real,
ongoing engineering surface — every future component with support-
relevant transient state would need to remember to publish it — not a
one-time integration.

### Path 2 — Browser-native screen/tab sharing (WebRTC `getDisplayMedia`)

**INFERENCE FROM EXISTING ARCHITECTURE, evaluated on technical merit:**
modern browsers expose `navigator.mediaDevices.getDisplayMedia()` and
`RTCPeerConnection` as **native Web APIs, requiring no npm dependency
at all** for the media-capture/transport layer itself — this is not
"choosing WebRTC because it's popular," it is the browser-native
mechanism for exactly this class of problem (customer's browser
captures and streams video of a chosen tab; the Agent's browser
receives and displays that video feed, nothing more). Critically, a
video stream has **no code path back into the tenant SPA at all** — the
Agent's viewer literally cannot invoke a click, a form submission, or
any tenant API call through a video feed, because no such channel
exists in this design at all, by construction, not by omission of a
"Request Control" button (which the Product Decision's §2 already
correctly identifies is unnecessary — with pure screen-share, there is
nothing to build *and then withhold*).

**What this path is genuinely missing, stated honestly:** WebRTC needs
a **signaling channel** to exchange session descriptions/ICE candidates
between the two browsers before a direct connection can establish —
**FOUND IN REPOSITORY, directly reusable for this purpose:** this can
be built on top of the same Firestore `onSnapshot` primitive (writing
the offer/answer/candidates as ephemeral Firestore documents the other
side subscribes to) — this is a well-established pattern (Firebase's
own official WebRTC reference implementation historically used exactly
this signaling approach) and requires no new backend infrastructure
beyond a new collection + rules, consistent with Path 1's
infrastructure cost.

**The one piece genuinely absent from this stack for either
signaling-adjacent or the actual media path, and a real risk, not
glossed over:** a **TURN relay server** for NAT traversal. Direct
peer-to-peer WebRTC connections frequently fail across carrier-grade
mobile NAT and restrictive networks without a TURN relay — a real,
material risk for a customer base reachable primarily via mobile
networks (the product's own currency/locale context, MZN, and its
mobile-first design orientation, both already established in this
codebase's broader context). **No TURN service, self-hosted or
managed, exists anywhere in this repository's configuration, `package.json`,
or environment variable conventions searched.** This is a genuine,
concrete **NEW CAPABILITY REQUIRED** — either a managed TURN service
(a new external dependency and likely a new recurring cost) or a
self-hosted one (new infrastructure this Railway-hosted, Cloud-
Functions-avoiding stack has no precedent for running).

### Recommendation, explicitly labeled as such

**Path 2 (screen-share) gives the strongest, simplest structural
read-only guarantee** (§12) and the most complete transient-state
visibility (§8) with the least ongoing per-component engineering
burden — but carries a real, unaddressed infrastructure gap (TURN)
this repository has no precedent for solving. **Path 1
(Firestore-mediated mirroring) has zero infrastructure gap** but
requires deliberate, ongoing per-component instrumentation to achieve
comparable transient-state visibility, and is a **materially larger,
more diffuse implementation surface** than a single, contained
screen-share integration. Neither is "already built" — both are **NEW
CAPABILITY REQUIRED**, and the choice between them is a real
architectural decision this document surfaces for the Product
Architect, not one this investigation resolves on its own.

---

## 8. Transient Client State — Can Either Path Actually Show It?

Directly re-confirming the prior investigation's finding (§4 of the
View-Only Impersonation investigation): the OCR review screen's field-
status badges (`detected`/`review`/`not_found`) are rendered
client-side-only state (`renderFieldStatusBadge`, `AddStockView.tsx`
~line 2674) and are **not** part of `PurchaseDraftLineItem`'s persisted
schema (`apps/tenant/src/types.ts` ~line 1568–1598, confirmed by direct
reading — no field-status property exists on that type). This is
re-verified here specifically against the two candidate paths:

- **Path 1 (Firestore mirroring):** **Can show it, but only if
  explicitly wired** — since this state is component-local React
  state (not even in `AppContext`, confirmed: the badge status is
  computed and rendered inline in `AddStockView.tsx`, not lifted into
  shared context), publishing it to a mirror document requires new
  code specifically in that component (and, by extension, in every
  other component with support-relevant transient state) to push its
  local state out. **NEW CAPABILITY REQUIRED**, non-trivial, ongoing.
- **Path 2 (screen-share):** **Shows it automatically, with zero
  per-component work** — because it is a video feed of the actual
  rendered pixels, any transient state that is currently rendered
  is, definitionally, visible. This is the single strongest technical
  argument in this document for Path 2 over Path 1.

**Direct answer to §8's question ("can the Support Agent see these
states without modifying them?"):** **Yes, for both paths, in the
sense that neither path gives the Agent any write channel at all** (§12)
— the *visibility* question and the *write-safety* question are
answered independently and both resolve favorably for either path.
The meaningful difference between the two paths is **completeness and
maintenance cost of visibility**, not safety.

---

## 9. Pointer / Highlighting Mechanism

**NEW CAPABILITY REQUIRED, but architecturally simple and consistent
with existing primitives regardless of which path (§7) is chosen:**

A pointer overlay is a **separate, small concern** from "seeing the
screen" — it only needs a lightweight coordinate channel: the Agent's
browser periodically writes `{x, y, timestamp}` (viewport-relative or
normalized coordinates) to a small, high-write-frequency, ephemeral
Firestore document scoped to the active session; the customer's
tenant SPA subscribes via `onSnapshot` (the same existing primitive,
again) and renders a small floating indicator at those coordinates,
positioned with CSS `pointer-events: none` — a standard, well-
understood technique that makes the overlay element **structurally
incapable of receiving or dispatching any DOM click/input event**, by
browser design, not by application-level discipline alone. This
mechanism is **the same regardless of which of Path 1/Path 2 is chosen
for the underlying "see the screen" problem** — it is a small,
independent addition either way.

**Security assessment:** genuinely low risk. `pointer-events: none`
is a well-established CSS property specifically designed to remove an
element from the event-target chain entirely; combined with the
overlay never being wired to any click/keydown handler in the first
place (there is no code to remove — none would ever be written), this
satisfies "must NOT click/trigger events/submit forms/change state" by
construction, the same "technically impossible, not merely hidden"
standard the prior investigation already recommended for the broader
write-boundary question.

---

## 10. One-Time Customer Code — Lifecycle, Grounded in an Existing Precedent

**FOUND IN REPOSITORY, directly reusable as a design pattern — the
strongest precedent found anywhere in this investigation:**
`server/initialStockRecoveryAuthorization.ts` and its `firestore.rules`
counterpart (~line 305, `initialStockRecoveryAuthorizationActive()`)
already implement almost exactly this shape for a different purpose:
a **fixed-id-per-business "current" document**
(`businesses/{businessId}/initialStockRecoveryAuthorization/current`),
written inside a **single Firestore transaction** (so two simultaneous
attempts resolve via Firestore's own optimistic concurrency control,
"requiring no additional locking primitive," per that module's own
header comment), carrying a `status` field (`'unconsumed'` until
used), a `targetStockCountId` binding (the "what is this good for"
scope), and an `expiresAt` timestamp **checked directly in
`firestore.rules`** via `request.time < ... .data.expiresAt` — a
server-timestamp comparison enforced at the security-rules layer
itself, not only in application code.

**Also FOUND IN REPOSITORY, this same session's own prior work:** the
Clear-Data Password feature just built and committed earlier in this
session (`server/index.ts`, `/api/business/clear-data-password/*`
routes) established a fresh, current, hashed-secret-with-lockout
precedent in this exact codebase: `crypto.scrypt` + random salt for
hashing, `crypto.timingSafeEqual` for constant-time comparison, and a
failed-attempt counter with a time-boxed lockout
(`CLEAR_DATA_LOCKOUT_MAX_ATTEMPTS`/`_DURATION_MS`) — directly
applicable to the one-time code's own brute-force-resistance
requirement (§10, §20 below).

**Applying both precedents to the one-time code's lifecycle:**

- **Where stored:** a new, purpose-built document, following the
  "current"-per-business fixed-id shape already proven
  (`businesses/{businessId}/supportSessionInvitation/current`, or
  equivalent) — **INFERENCE FROM EXISTING ARCHITECTURE**, since this
  specific collection doesn't exist, but the shape is a direct,
  evidenced extension of an already-proven pattern.
- **Whether it should be hashed:** **yes, following the Clear-Data
  Password precedent exactly** — the code itself should never be
  stored in plaintext, since (per §11/§20) an Agent who could read the
  raw code value could enumerate it without needing the customer to
  read it aloud at all.
- **Expiration:** the `expiresAt` + `request.time <` rules-layer check
  is a **directly reusable pattern**, not merely a design idea —
  the exact same rule shape already exists for a different fixed-id
  document today.
- **Digits/characters:** the source material's own example (`742 381`,
  6 digits) matches this codebase's own existing UX convention for a
  short numeric code — the staff quick-login PIN is already
  specified as "exactly 6 dígitos numéricos" (`server/index.ts`
  ~line 1273, `/api/staff/reset-pin`'s own validation) — **FOUND IN
  REPOSITORY** as a precedent for 6-digit numeric codes being an
  already-established UX pattern in this product, though that PIN is a
  standing credential, not a single-use code, so the *validation shape*
  transfers but the *semantics* (single-use, short-lived) do not.
- **Brute-force prevention:** the Clear-Data Password's exact lockout
  shape (max-attempts counter, time-boxed lockout after threshold) is
  directly applicable — a 6-digit code has only 1,000,000 possible
  values, materially weaker than any password, making rate-limiting/
  lockout **not optional** the way it might be for a longer secret.
  **NEW CAPABILITY REQUIRED**, but a close structural copy of an
  already-proven, already-committed pattern in this exact codebase.
- **How many active invitations a customer can have / what happens
  when a new code is generated while an old one exists:** the "current"
  fixed-id-document pattern (§ above) answers this structurally, not
  as an open design question — a fixed document ID means generating a
  new code **necessarily overwrites** whatever was there before (the
  same "at most one active state per business" property the recovery-
  authorization pattern already guarantees by construction, since
  there's only one document, not a growing collection of invitations).
  This is a strong, evidenced answer, not an invented rule: it directly
  follows from reusing the existing pattern's own shape.
- **What happens when Support enters an expired code:** the
  `request.time < expiresAt` check already demonstrates the exact
  mechanism — an expired document simply fails the isActive-style rule
  check, the same way `initialStockRecoveryAuthorizationActive()`
  already does; the server-side verify route (analogous to the Clear-
  Data Password's own `/verify` endpoint, another directly reusable
  shape from this session's own work) would return the equivalent of
  a "not-configured"/"expired" outcome rather than establishing a
  session.
- **What happens when the customer disconnects:** covered in §13
  below — the same document's `status` field, following the existing
  `'unconsumed'`-style enum convention, would transition to a
  terminal state (e.g. `'ended'`), and any active session record tied
  to it would need to be independently invalidated, not merely leave
  the original invitation document stale.

---

## 11. Tenant Isolation

**Conceptual attack tested directly, per the task's own instruction:
"Agent knows/guesses another customer's support code."**

**INFERENCE FROM EXISTING ARCHITECTURE, following the already-proven
pattern exactly:** because the code (hashed) lives under
`businesses/{businessId}/supportSessionInvitation/current` — i.e.,
**scoped by `businessId` in the document path itself**, not in a
global, flat "codes" collection — an Agent attempting to "enter a
code" must supply *both* the code **and** know or guess the correct
`businessId` for the server-side verification to even locate the right
document to check the code against. This mirrors exactly how every
other privileged route in this codebase already works (Business
Visibility, Suspend/Reactivate, both Recovery Authorizations — all
take `businessId` as an explicit parameter, re-verified server-side,
confirmed across this investigation series). **A guessed code alone,
without also guessing the correct `businessId`, cannot succeed** — this
is a direct, structural consequence of following the existing
per-business-scoped-document pattern, not a new invention.

**A genuine remaining question, not resolved by the pattern alone:**
if the Support Agent UI's own "enter code" flow does **not** first
require identifying the business (i.e., if the flow is "type only the
6-digit code, nothing else"), then the *server* would need to search
across all businesses' `supportSessionInvitation/current` documents to
find a hash match — a materially different, weaker shape than the
per-`businessId`-scoped check above, and one that reintroduces exactly
the enumeration risk the scoped-path approach avoids. **NEW CAPABILITY
REQUIRED, explicit design decision needed:** the Agent-facing flow
should require identifying the business *first* (via the existing
Business Search/Directory, already built) and entering the code
*second*, scoped to that specific business — **not** a bare
code-only lookup across the whole platform. This is a recommendation
grounded directly in avoiding a real, identified structural weakness,
not an arbitrary preference.

**SuperAdmin authorization layer, unchanged:** whichever tier is
ultimately permitted to use this capability (per the still-open
question from the Assistance-Level Investigation, §17 there) still
passes through the identical, already-proven
`requireAuth → requirePlatformOperator → [role check]` chain — no new
authorization *shape* is implied by anything in this section.

---

## 12. Read-Only Guarantee — Structural, Not Cosmetic

Testing the task's own explicit standard — "even if the Support Agent
attempts to perform a write, the architecture must not give them the
authority to perform it" — against both candidate paths from §7:

**Path 2 (screen-share): the strongest possible structural
guarantee found anywhere in this investigation series.** The Support
Agent's browser, in this design, **never authenticates as the
customer, never receives a Firebase Auth token scoped to the
customer's account, never has a live connection to Firestore for that
business's data, and never loads the tenant SPA's own code at all** —
it only ever renders an incoming video stream. There is, structurally,
**no code path from the Agent's viewer to any tenant write API,
Firestore write, or server mutation route**, because the viewer
application is not the tenant SPA and has no dependency on it. This
satisfies the task's standard about as completely as this repository's
existing architecture allows for any capability investigated across
this entire three-document series.

**Path 1 (Firestore mirroring): a weaker, but still defensible,
guarantee, with one real caveat.** The Agent's browser reads a mirror
document via a scoped `onSnapshot` listener — it likewise never
receives the customer's own credentials, and `firestore.rules` can
(and should) deny the Agent's own platform-operator credential any
write path to the mirror document or to any real tenant collection
(the mirror document is written only by the customer's own,
already-privileged session, never by the Agent). **The caveat:** this
guarantee depends entirely on `firestore.rules` being written
correctly for this new collection — it is a rules-layer guarantee, the
same *category* of guarantee this codebase already relies on
everywhere (e.g., `businesses/{businessId}` update rule excluding
`suspended` from an Owner's own writable fields), but it is not the
same *unconditionally structural* guarantee Path 2 provides purely by
never granting the Agent's browser any tenant-scoped credential at
all.

**Direct answer:** **Path 2 achieves the guarantee by omission of
capability (nothing to misuse); Path 1 achieves it by restriction of
capability (something exists, but rules deny misuse).** Both are
legitimate, both are consistent with how this codebase already reasons
about security elsewhere, but Path 2 is measurably closer to "cannot
possibly write" as opposed to "is not permitted to write," which is a
meaningfully stronger property for exactly the kind of irreversible-
mistake risk this capability exists to avoid.

**Does the current architecture already guarantee this for either
path?** **No — NEW CAPABILITY REQUIRED for both.** Neither the
Firestore rules, the server routes, nor the client applications
contain anything today that already enforces this for a not-yet-built
capability; this section describes what a correctly-built version
would look like, not something already in place.

---

## 13. Customer Disconnect

**INFERENCE FROM EXISTING ARCHITECTURE, following the "current"-document
pattern (§10) directly:** the customer pressing "End Support Session"
should trigger a **server-side** state transition (the same
Admin-SDK-only write pattern every other privileged mutation in this
codebase already uses — confirmed as the universal convention across
every route this investigation series has examined) on the session
document — e.g., `status: 'ended'` — **not** merely a client-side UI
change. Whichever access mechanism is chosen (§7), that mechanism's
own continued function should be **conditioned on reading this same
status field live** (via `onSnapshot`, the same primitive again): the
instant the document's status changes, both the Agent's viewer (if
Path 1) or the signaling channel (if Path 2, since the actual media
connection would need to be explicitly torn down by the customer's
side ceasing to publish/renegotiate) observe the change and terminate
access — this is the same "the effect happens at the Security Rules/
data layer, not at the next reload" discipline this codebase already
applies to business suspension (`isBusinessSuspended()` folded
directly into `isMemberOf()`, confirmed in prior work this session).

**Audit:** a state-transition write is exactly the shape the existing
`platform_audit_log` convention already handles — no new event
*shape* required, only a new `actionType` value, consistent with §16
below.

---

## 14. Support Disconnect

**Symmetrical to §13, same underlying mechanism.** The Support Agent
pressing "End Session" performs the identical server-side state
transition, from the other side. **Reuse note, directly evidenced:**
the existing session infrastructure this investigation series has
repeatedly found (the "current"-document + `expiresAt` +
transaction-based write pattern from `initialStockRecoveryAuthorization.ts`)
is symmetric by design — either party's action is just another
authorized write to the same document, following the same server-side-
only, Admin-SDK write discipline.

---

## 15. Session Time Limit

**FOUND IN REPOSITORY, both existing durations, neither applied
without a stated conflict:** Support Session specifies 60 minutes
(§9.7); Impersonation specifies 30 minutes, explicitly shorter "since
impersonation carries write authority" (§9.10). **The new capability's
risk profile is closer to Support Session's** (no write authority at
all, per the fixed Product Decision) — **INFERENCE FROM EXISTING
ARCHITECTURE:** reusing Support Session's 60-minute figure is the more
defensible default, on the architecture's own stated reasoning (time-
box length is explicitly tied to write-risk in the one place the
architecture gives a reason at all), rather than inventing a new
number. **No conflict identified** between this reuse and the new use
case — both concepts describe an occasional, bounded diagnostic
interaction, not a different duration of task.

---

## 16. Audit — Mapped to Existing Infrastructure

**FOUND IN REPOSITORY:** `server/platformAuditLog.ts`,
`platform_audit_log/{eventId}`, server-generated `actorUid`/
`actorRole`/`timestamp` (never client-supplied, confirmed across every
route this investigation series has examined), and Audit Center's
existing filterable UI (`server/auditLogQuery.ts`,
`apps/superadmin/src/pages/AuditTrail.tsx`).

Mapping each requested category onto this existing shape — **no new
event shape required, only new `actionType` values**, consistent with
the task's own instruction not to invent new event *definitions*
beyond what naming a new type requires:

- **Session invitation** (customer generates a code): a new
  `actionType` (e.g. `support_session.invited`), `targetBusinessId`
  set, `actorUid` would need to be the **customer's** uid here, a
  genuine departure from every existing audit entry in this codebase,
  which are all written for **platform-operator** actions
  (`actorUid` = the operator). **NEW CAPABILITY REQUIRED**: this is
  the first audited event type in this codebase's history that would
  need to represent a **tenant-user-initiated** action inside the
  platform audit log, not a platform-operator action — worth flagging
  explicitly as a small but real precedent-setting decision, not
  assumed to be a trivial reuse.
- **Session connection** (Agent enters the code): `actionType` (e.g.
  `support_session.connected`), `actorUid` = the operator, standard
  shape, directly consistent with every existing entry.
- **Session termination**, either side: `actionType` (e.g.
  `support_session.ended`), with a field indicating which party ended
  it — a small, additive extension of the existing schema's own
  `targetBusinessId`/`targetUid` pattern, not a new shape.
- **Expiry** (code times out unused, or session times out): same
  "log even though nothing happened" discipline §9.7/§9.10 already
  specify for their own expiries.

**Explicitly recommended, per the task's own instruction not to log
sensitive data unnecessarily:** the audit entries above should **never**
carry the code itself (hashed or otherwise), the mirrored/streamed
tenant content, or any pointer coordinates — only session-lifecycle
metadata (who, which business, when, how it ended), consistent with
every existing audit entry in this codebase, none of which logs
underlying business data, only the fact and shape of an action.

**Can existing Audit Center infrastructure surface these?** **Yes,
directly** — the existing filter set (`businessId`, `actorUid`,
`actionType`, date range, already combinable per the Panel
Investigation's earlier findings) already accommodates new
`actionType` values without any structural change, **except** the
already-noted, pre-existing staleness of the filter allowlist
(`KNOWN_ACTION_TYPES` in `auditLogQuery.ts`) — any new action type
introduced here should be added to that allowlist at build time, not
repeat the same staleness this repository's own governance record
already flags as a known defect.

---

## 17. Customer-Visible Trust Signal

**FOUND IN REPOSITORY:** the tenant SPA has an established, global
shell pattern — confirmed by the existing precedent of
`BusinessSuspendedBanner.tsx`, a dedicated component reading a boolean
flag from `AppContext` and rendering conditionally at a
persistent, app-wide location. This is a **directly reusable
structural pattern** (not the same component, but the same *kind* of
component and the same *kind* of `AppContext`-driven conditional
render) for the "🟢 SABUSH Support connected" indicator.

**Mobile/accessibility:** this repository's own design system
(`DESIGN_SYSTEM.md`, referenced throughout prior sessions' work but not
re-read in full for this narrow investigation) already governs this
territory generally; nothing in this specific investigation surfaces a
reason to treat this indicator differently from any other persistent
app-wide banner already built — **INFERENCE FROM EXISTING
ARCHITECTURE**, not a new design decision.

---

## 18. Support Agent Experience

**FOUND IN REPOSITORY:** the existing SuperAdmin nav (`apps/superadmin/src/App.tsx`,
confirmed across this investigation series) is a simple `view` state
machine with five existing tabs (Fila de Pagamentos, Auditoria,
Operadores, Negócios, Directório) plus a `businessDetail` drill-in
view reached by click-through, not its own nav item. **Directly
reusable pattern:** a new tab (or, more likely per the existing
precedent, a flow reached from within Business Detail, following the
same click-through pattern Recovery Authorization and
Suspend/Reactivate already use rather than adding yet another top-
level nav item) fits this existing structure without requiring any
redesign — consistent with the task's own instruction not to redesign
the SuperAdmin application.

---

## 19. Mobile Customer

**FOUND IN REPOSITORY:** this codebase's own product framing (referenced
throughout prior sessions, e.g. mobile-first quick-login/PIN pairing
for shared shop devices) confirms the tenant SPA is already designed
with mobile use as a primary case, not an afterthought.

**A genuine, path-dependent limitation, stated honestly:**
`getDisplayMedia()` (Path 2, §7) has **materially weaker or absent
support on mobile browsers** compared to desktop — screen/tab capture
from a mobile browser is a real, known platform limitation, not
something this investigation can solve by design choice alone. **This
is a concrete, real constraint specifically affecting Path 2** if the
customer's own device is a phone (the product's own primary context)
— **NEW CAPABILITY REQUIRED** does not fix a platform-level browser
API gap. Path 1 (Firestore mirroring) does **not** share this specific
limitation, since it never depends on a native screen-capture API at
all — it works identically on any device capable of running the
tenant SPA and writing to Firestore, which is already every supported
device.

**This is a material factor the Product Architect should weigh
directly against §7/§8's other findings** — Path 2's stronger
read-only guarantee and effortless transient-state visibility are
weighed against a real mobile-support gap that directly affects this
product's actual primary user base; Path 1's weaker guarantee and
higher engineering cost are weighed against working uniformly across
every device this product already supports. Neither path is free of a
real trade-off, and this document does not resolve which trade-off the
Product Architect should accept.

---

## 20. Security / Privacy

Consolidating findings already established above, plus items not yet
covered:

- **Authentication/authorization:** unchanged from every existing
  privileged mechanism — `requireAuth → requirePlatformOperator →
  [role]`, re-verified server-side per action (§11).
- **Tenant isolation:** the `businessId`-in-document-path pattern
  (§11) is the load-bearing control; a code-only, business-agnostic
  lookup flow would weaken this and should be explicitly avoided
  (§11's own recommendation).
- **Session token security:** whichever path is chosen, no customer
  credential (Firebase Auth token, session cookie) should ever be
  transmitted to or held by the Agent's browser — confirmed
  architecturally sound for Path 2 (no credential involved at all) and
  achievable for Path 1 provided the mirror document's own
  `firestore.rules` are correctly scoped (§12's caveat).
- **Code entropy / brute-force:** a 6-digit numeric code (the source
  material's own example, and this codebase's own existing PIN-length
  convention) has only 1,000,000 possible values — genuinely weak
  entropy on its own, which is precisely why the Clear-Data Password's
  lockout precedent (§10) is **not optional** here, and why the
  `businessId`-scoping requirement (§11) matters even more: an
  attacker would need to correctly target a *specific* business's
  fixed-id document *and* guess a 6-digit code within a short,
  lockout-enforced window — a materially harder combined problem than
  either constraint alone.
- **Replay protection:** the "current"-fixed-id-document,
  transactional-write pattern (§10) already gives this by
  construction — a consumed code transitions the document's `status`
  away from `'unconsumed'`, and the existing recovery-authorization
  precedent already demonstrates this exact state-machine shape
  working correctly in production.
- **Session expiration:** covered, §15.
- **Sensitive-data exposure — what should remain hidden even during
  an Attended Support Session:** **NOT FOUND IN REPOSITORY as an
  existing masking convention** — no field-level masking mechanism was
  found anywhere in this codebase (confirmed: no "mask," "redact," or
  similar pattern found in prior or current searches). **This is a
  genuine open product question, not a technical gap**: should the
  Agent, viewing the customer's actual screen (either path), see the
  same fully-unmasked data the customer themselves sees (their own
  payment references, supplier names, financial figures), or should
  certain fields be deliberately obscured even in a view-only session?
  Nothing in the existing architecture answers this — `UNRESOLVED —
  NOT DEFINED BY CURRENT ARCHITECTURE`, and worth the Product
  Architect's explicit attention, since Path 2 (screen-share)
  specifically makes field-level masking **much harder** to achieve
  (a video stream cannot selectively black out one field without the
  tenant SPA itself rendering it pre-masked, which reintroduces exactly
  the "deliberately instrument every component" cost Path 1 already
  carries) — this is a real, additional point in favor of Path 1 if
  masking is later decided to be necessary, not previously surfaced in
  §7's comparison.
- **Accidental write paths:** already addressed structurally, §12.
- **Logging/audit exposure:** already addressed, §16 (no sensitive
  content logged, only lifecycle metadata).
- **Browser security:** Path 2's `getDisplayMedia()` already requires
  explicit, browser-native, per-use user consent (the customer must
  actively pick which tab/window to share, via the browser's own
  built-in picker UI) — a genuine, additional, built-in transparency
  control neither this document nor the Product Decision needs to
  build, since the browser already enforces it. This is a real,
  additional point in favor of Path 2, not previously surfaced.

---

## 21. Performance

**Occasional-session framing, not permanent monitoring, as the source
material itself specifies:**

- **Path 1:** additional Firestore reads/writes scale with however
  frequently the mirror document is updated during an active session
  (a design choice, not a fixed cost) — bounded, low-volume, consistent
  with this codebase's existing Firestore-read-heavy architecture
  generally (already the dominant cost model for the whole tenant app,
  per its pervasive `onSnapshot` usage).
- **Path 2:** the actual video bandwidth/CPU cost is borne
  **peer-to-peer, between the two browsers directly** (once WebRTC
  negotiation completes) — **not** the privileged server's problem at
  all, beyond the lightweight signaling-document writes. This is a
  materially different, and in this specific respect **more favorable**,
  cost profile than Path 1 for the *server's* own load, since Path 1's
  server-mediated Firestore writes/reads do consume the same
  Firestore-cost budget every other feature in this app already shares.
- **Customer browser impact:** Path 2's screen capture has a real,
  non-zero CPU/battery cost while active — a known characteristic of
  any screen-sharing technology, not specific to this implementation;
  bounded by the session's own time-box (§15) and by it being
  explicitly customer-initiated and endable at will (§13).
- **Neither path introduces a standing/background cost** when no
  session is active — both are entirely dormant until a customer
  deliberately starts one, consistent with the "occasional support
  session, not permanent monitoring" framing.

---

## 22. Existing Dependencies — Direct Re-Confirmation

Re-stated precisely, per §7's full search: **NOT FOUND IN REPOSITORY**
for WebSocket, WebRTC (as an npm package — the *browser-native* API
requires none), realtime-collaboration, session-store, DOM/canvas, or
pointer/annotation libraries. **FOUND IN REPOSITORY**: `firebase` (the
one realtime primitive, `onSnapshot`, already installed and used
pervasively). **No new npm dependency is required for Path 1 at all.**
**No new npm dependency is required for Path 2's media/signaling
layer either** (both `RTCPeerConnection` and `getDisplayMedia` are
native browser APIs) — the **only** genuinely new external dependency
either path could require is a **TURN relay service** for Path 2
(§7, §19), which is infrastructure, not an npm package, and is the
single clearest "new dependency" finding in this entire investigation.

---

## 23. Governance Impact

- **Existing Support Session architecture (§9.7) must be amended, not
  merely reused as-is:** the source material's fixed Product Decision
  (customer-initiated single-use code, mandatory transparency
  indicator, no consent-optional flow) is more specific and more
  customer-consent-forward than §9.7's original text (which describes
  operator-initiated, `justification`-only access with no stated
  customer-consent requirement at all, per the Capability
  Investigation's own §7 finding). This is a genuine amendment
  requirement, not a drop-in reuse.
- **Gap 2 must be explicitly reaffirmed, revised, or explicitly
  superseded for this specific new capability** — consistent with the
  prior investigation's own recommendation, restated here as still
  correct: Gap 2's original deferral reasoning (no operational
  incident evidence yet) predates both this new Product Decision and
  the concrete OCR/UI-mismatch evidence surfaced in the prior
  investigation; it should not be treated as silently overridden by
  this new work.
- **A new BDR is likely required** for the customer-consent model
  specifically (§20's masking question, §16's tenant-user-initiated
  audit-entry precedent, and the Path 1/Path 2 trade-off itself) —
  these are genuine, non-trivial product decisions, not
  implementation details.
- **A new Policy is likely required** for the one-time code's own
  operational parameters (length, lockout thresholds, expiry duration)
  — mirroring how existing time-boxed/threshold-bearing mechanisms in
  this codebase (e.g. POL-0009's own governing role for Initial Stock
  Recovery) already receive their own dedicated Policy document rather
  than being decided ad hoc inside a Specification.
- **The existing Support Session specification-level text (§9.7) can
  likely be amended rather than replaced wholesale** — the core
  shape (server-issued, `businessId`-scoped, time-boxed, read-only,
  audited) survives essentially intact; what needs amendment is
  specifically the consumption surface (rendered UI/co-browse vs. raw
  JSON) and the consent model.
- **A new module/spec section is not evidently required** — this fits
  within the existing Module #18 (SuperAdmin) scope already
  established, not a new numbered module.
- **Rule 8 Assessment: required**, once a Specification exists — this
  repository's own established sequence, unskippable, per every
  precedent this investigation series has examined.
- **Implementation Authorization: required**, following Rule 8 —
  same.
- **Closest existing governance parent:** `18-superadmin-v1-architecture-gap-resolutions.md`
  (Gap 2) and Architecture §9.7 together — any new governance work
  here should explicitly cite and either extend or supersede these,
  not originate independently.

---

# FINAL OUTPUT

## 1. Executive Finding

**Yes, the desired capability can fit into the existing SABUSH BPT
architecture — but only as new implementation against an
already-specified-but-unbuilt foundation (Support Session, §9.7),
consuming that foundation through a genuinely new rendering surface
this repository has no precedent for.** Every governance, audit,
authorization, and tenant-isolation pattern needed already exists in
proven, reusable form (the recovery-authorization "current"-document
pattern, the platform-operator authorization chain, the platform audit
log, the Clear-Data Password's hashing/lockout precedent). The
genuinely new engineering surface is narrow and specific: a real-time
rendering/mirroring mechanism (Path 1 or Path 2, §7), which this
codebase has never needed before because every other feature to date
has been either request/response or Firestore-listener-based state
sync of *structured data*, never a live view of *another user's
rendered application*.

## 2. Existing Architecture

Architecture §9.7 (Support Session, specified, unbuilt), §9.10
(Impersonation, specified, unbuilt, explicitly not being requested
here), §6.5/§6.7/§6.8 (role hierarchy), Gap 2 (the prior deferral
decision), the existing `requireAuth → requirePlatformOperator →
[role]` chain, the existing `platform_audit_log` schema, the existing
"current"-fixed-id-document + `expiresAt` + transactional-write
pattern (`initialStockRecoveryAuthorization.ts`), and this session's
own newly-built Clear-Data Password hashing/lockout precedent.

## 3. Reusable Existing Components

The full authorization chain; the audit log schema and Audit Center
UI (extended with new `actionType` values only); the "current"-
document + `expiresAt` pattern for the one-time code; the
scrypt-hash + salt + lockout pattern for brute-force resistance; the
`BusinessSuspendedBanner.tsx`-style persistent-indicator pattern; the
existing SuperAdmin nav/click-through UI shape for where the Agent-
side flow lives; `onSnapshot` as the one existing realtime primitive,
directly reusable for either candidate path's data-flow needs.

## 4. Technical Gap

Zero WebSocket/WebRTC/realtime-collaboration/canvas-annotation
libraries exist anywhere in this codebase. No component in the tenant
SPA publishes its own transient UI state anywhere. No TURN relay
infrastructure exists. No tenant-user-initiated audit-entry precedent
exists (every existing entry represents a platform-operator action).
No field-masking convention exists anywhere in this codebase.

## 5. Proposed Architecture Fit

The smallest architecture: (a) a new "current"-fixed-id document per
business for the code/invitation, following the recovery-authorization
pattern exactly; (b) a small set of new, thin server routes
(generate/verify/end), following the Clear-Data Password's own recent
route-shape precedent; (c) either a Firestore-mirrored state document
the customer's browser writes and the Agent's browser reads (Path 1),
or a Firestore-signaled WebRTC screen-share connection (Path 2) — the
Product Architect's choice, not resolved here; (d) a small,
`pointer-events: none` coordinate-overlay channel, independent of
which path is chosen for (c); (e) a persistent tenant-side banner,
following the `BusinessSuspendedBanner.tsx` pattern; (f) new
`platform_audit_log` `actionType` values for invitation/connection/
termination/expiry, added to the existing filter allowlist from day
one.

## 6. Read-Only Enforcement

Path 2: structural, by omission — the Agent's browser never holds any
tenant credential or write-capable connection of any kind, so there is
no capability to misuse, not merely a restricted one. Path 1:
enforced at the `firestore.rules` layer, the same category of
guarantee this codebase already relies on elsewhere, but conditioned
on those rules being written correctly, not unconditional by
construction. Neither exists today; both are buildable to this
standard.

## 7. Customer Code Lifecycle

Generation via a transactional write to a fixed-id "current" document
(hashed, salted, per the Clear-Data Password precedent);
consumption/invalidation via the same document's `status` field
transitioning out of `'unconsumed'`, enforced transactionally so a
race condition cannot double-consume it; expiry via a stored
`expiresAt` timestamp checked both server-side and, ideally, at the
`firestore.rules` layer directly (per the existing recovery-
authorization precedent); replay protection is a direct, structural
consequence of the same fixed-id/status-transition shape, not a
separate mechanism.

## 8. Co-Browsing / Rendering Mechanism

Two candidate paths identified and evaluated on technical merit (§7):
Firestore-mediated state mirroring (reuses the one existing realtime
primitive, zero new dependency, weaker transient-state visibility and
higher ongoing engineering cost) or browser-native WebRTC screen-share
(strongest read-only guarantee and automatic transient-state
visibility, but a real, unaddressed TURN-relay gap and a real mobile-
browser support limitation for this product's actual primary user
base). This document does not choose between them.

## 9. Pointer Mechanism

A small, independent, `onSnapshot`-based coordinate channel with a
`pointer-events: none` rendered overlay — structurally incapable of
triggering any DOM event, by browser-native design, regardless of
which co-browsing path is chosen.

## 10. Customer Transparency

A persistent, `AppContext`-driven banner, directly modeled on the
existing `BusinessSuspendedBanner.tsx` pattern, reading a live session-
status field via `onSnapshot`.

## 11. Tenant Isolation

The one-time code and its session must be scoped by `businessId` in
the document path itself (not a flat, global code lookup) — this is
the single most important structural recommendation in this document,
since a code-only lookup flow would reintroduce a real enumeration
risk the existing "current"-document-per-business pattern otherwise
closes by construction.

## 12. Audit

Session invitation, connection, termination (by either party), and
expiry, all mapped onto the existing `platform_audit_log` schema with
new `actionType` values, surfaced through the existing Audit Center UI
with no new event shape required — except that the invitation event
would be this codebase's first audit entry ever written for a
tenant-user-initiated action rather than a platform-operator action,
a small but real precedent to flag explicitly.

## 13. Security Risks

Weak code entropy (6 digits) mitigated by mandatory `businessId`-
scoping plus a lockout mechanism directly modeled on this session's
own recently-built Clear-Data Password precedent; no existing field-
masking convention, a genuinely open question this document does not
resolve; Path 2's TURN-relay gap is a real, unaddressed infrastructure
dependency; Path 1's correctness depends entirely on `firestore.rules`
being written correctly for a brand-new collection, the same category
of risk this codebase already manages everywhere else, not a new kind
of risk.

## 14. Performance

Both paths are dormant except during an active, customer-initiated
session; Path 2's actual media cost is peer-to-peer, not server-
mediated; Path 1's cost is additional, but bounded, Firestore
read/write volume, consistent with this app's existing cost model.

## 15. Mobile / Browser Constraints

Path 2's `getDisplayMedia()` has materially weaker or absent mobile
browser support — a real, unresolved constraint directly relevant to
this product's actual primary user base; Path 1 has no equivalent
platform-level limitation, working uniformly on any device already
capable of running the tenant SPA.

## 16. Governance Impact

Support Session's own specification-level text needs amendment, not
wholesale replacement; Gap 2 needs explicit reaffirmation or revision
for this specific new capability; a new BDR is likely needed for the
consent model, masking question, and Path 1/Path 2 choice; a new
Policy is likely needed for the code's own operational parameters;
Rule 8 Assessment and Implementation Authorization remain required,
unskippable, following this repository's own established sequence.

## 17. Recommended Implementation Boundary

The smallest defensible implementation, per this document's own
findings: the code/session lifecycle (§7, §10, §13/§14 combined) and
the audit trail (§12) are the parts with the clearest, most directly
reusable existing precedent and should be specified first, independent
of which rendering path is ultimately chosen — since both paths share
an identical session-lifecycle/authorization/audit foundation, and
only diverge on the "how does the Agent actually see the screen"
question. Deferring the Path 1 vs. Path 2 decision does not block
specifying the shared foundation.

## 18. Explicit Non-Goals

No write, no click, no typing (beyond the customer's own, unaffected
session), no delete, no submit, no customer impersonation with
customer credentials, no unrestricted remote control, no "Request
Control"/"Allow Control" feature of any kind, no background/passive
monitoring outside an explicit, customer-initiated, time-boxed
session, no permanent or standing access, no full write-capable
Impersonation (§9.10, explicitly out of scope, not argued for
anywhere in this document).

## 19. Recommendation

**NEEDS ARCHITECTURAL DECISION.** Not "not feasible" — every piece
investigated has either a direct, reusable existing precedent or a
clearly-scoped, honestly-described new-capability gap, with no dead
end found anywhere. Not yet "ready for governance specification" as a
single unit, because one genuinely open, consequential technical
choice (Path 1 vs. Path 2, §7) materially changes the shape of at
least four downstream sections of any future specification (§8
transient-state completeness, §12 read-only guarantee strength, §19
mobile support, §20 masking feasibility) — writing a Specification
before that choice is made would risk specifying the wrong mechanism
and re-doing the work. **Recommended next governance step:** a
focused Product Architect decision specifically on Path 1 vs. Path 2
(or an explicit decision to build both, sequenced), informed directly
by this document's §7/§8/§12/§19/§20 trade-off findings — only after
that, proceed to BDR/Policy/Specification drafting for the now-fully-
scoped capability.

---

**NO IMPLEMENTATION PERFORMED. NO CODE WRITTEN. NO BDR, POLICY,
SPECIFICATION, RULE 8 ASSESSMENT, OR IMPLEMENTATION AUTHORIZATION
CREATED OR ALTERED. NO ARCHITECTURE REDESIGNED. THE FIXED PRODUCT
DECISION (§§1–4, §24 OF THE SOURCE MATERIAL) WAS NOT REOPENED OR
ARGUED AGAINST ANYWHERE IN THIS DOCUMENT. NOTHING COMMITTED. NOTHING
PUSHED. THIS DOCUMENT IS NOT PART OF THE REPOSITORY.**
