# SuperAdmin Agent Attended Support Session — Rule 8 Assessment

**Status:** Drafted. This is a Current State Assessment → Gap Analysis
→ Risk Findings → Direction pass, per `CLAUDE.md`'s Rule 8 process.
**This document commits no code and authorizes no implementation.** An
Implementation Plan and a signed Implementation Authorization remain
separately-gated future steps. This is a **falsification exercise**,
per the Product Architect's explicit framing: every dimension below is
investigated to find the reason the proposed architecture *cannot*
safely work within this codebase, not to confirm that it can.

**Governing chain:** `BDR-0018` (✅ Approved) →
`docs/specs/POL-pending-superadmin-agent-attended-support-session-policy.md`
(✅ Approved) →
`docs/specs/superadmin-agent-attended-support-session-specification.md`
(✅ Accepted, including its SPEC-1/SPEC-2 correction pass) → **this
assessment**.

**File discipline note:** Following the confirmed convention for
cross-cutting Rule 8 Assessments (`business-worth-evolution-rule8-assessment.md`,
`superadmin-assisted-initial-stock-recovery-rule8-assessment.md` —
both filed in `docs/engineering/`, unprefixed, descriptively named, no
numeric identifier since no Rule 8 numbering ledger exists), this
document is filed as
`superadmin-agent-attended-support-session-rule8-assessment.md`.

**Method:** Every finding below is checked against the actual,
currently-committed `firestore.rules`, `package.json`,
`server/index.ts`, `server/platformAuditLog.ts`,
`server/auditLogQuery.ts`, `server/initialStockRecoveryAuthorization.ts`,
`server/superadminAuth.ts`, `apps/superadmin/src/lib/firebase.ts`,
`apps/tenant/src/components/AddStockView.tsx`,
`apps/tenant/src/types.ts`, and the `tests/` directory listing — not
recalled from memory, not inferred from the governance documents
alone. Line references and function names below are to the repository
state at the time of this assessment.

---

## 1. Current State Assessment

**Platform-operator authorization, as actually implemented today:**
- `server/superadminAuth.ts`'s `requireAuth → requirePlatformOperator
  → [role check]` chain is confirmed identical across all 15 existing
  `/api/superadmin/*` routes — directly reusable, no new authorization
  *shape* required for this capability's own server routes.
- `platform_operators/{uid}` documents are real; `platformRole` ∈
  `{support, developer, superadmin}` is a real, checked field
  (`VALID_PLATFORM_ROLES`, `server/operatorManagement.ts`).

**The one-time-credential/expiry pattern, as actually implemented
today:** `server/initialStockRecoveryAuthorization.ts` and its
`firestore.rules` counterpart (`initialStockRecoveryAuthorizationActive()`,
line ~305) are real, shipped, tested code — a fixed-id (`'current'`)
document per business, `status` field, `expiresAt` timestamp checked
directly in rules via a cross-document `get()` lookup (confirmed,
lines 305–315). This is the single most directly reusable precedent
found for the code/Invitation lifecycle.

**The brute-force-lockout pattern, as actually implemented today:**
the Clear-Data Password feature (`server/index.ts` lines 659–660,
`CLEAR_DATA_LOCKOUT_MAX_ATTEMPTS = 5`,
`CLEAR_DATA_LOCKOUT_DURATION_MS = 15 * 60 * 1000`) is real, shipped
code — `crypto.scrypt` hashing, `crypto.timingSafeEqual` comparison,
a failed-attempt counter reset to `0` on every fresh secret (`/set`
route). Directly reusable shape, confirmed by direct reading.

**Realtime infrastructure, as actually implemented today:** confirmed,
by direct inspection of `package.json`'s full dependency list (both
`dependencies` and `devDependencies`): zero WebSocket libraries, zero
WebRTC libraries, zero realtime-collaboration libraries. `onSnapshot`
(via the `firebase` SDK) is the only existing realtime primitive
anywhere in this stack. `server/index.ts`'s own `expressApp.listen(...)`
(line ~3238) confirms a plain HTTP server, no WebSocket upgrade
handling anywhere.

**`isPlatformOperator()` usage, as actually implemented today — the
single most consequential finding of this Current State Assessment:**
`firestore.rules`' `isPlatformOperator()` helper (lines 15–18) is used
in **exactly one place in the entire file** — granting `allow read` on
`platform_audit_log` (line 1918), a platform-level, non-tenant-scoped
collection. Confirmed by an exhaustive grep for every occurrence of
`isPlatformOperator()`. **There is zero existing precedent anywhere in
this codebase for a `platform_operators` identity being granted direct
client-side read access to any `businesses/{businessId}/...`-scoped
collection, and zero precedent for a `platform_operators` identity
performing any client-side Firestore write at all** — every existing
platform-operator write (Suspend/Reactivate, both Recovery
Authorizations, Operator provisioning) is explicitly, repeatedly
documented as "NEVER a client-side Firestore write, by any role,
including an authenticated `platform_operators/{uid}`" (verbatim, the
comment recurring at `initialStockRecoveryAuthorization`'s and
`businessWorthRecoveryAuthorizations`' own `allow create: if false`
rules). Every existing tenant-scoped collection's `allow read` is
gated by `isMemberOf(businessId)` — a tenant identity check — never by
`isPlatformOperator()`.

**SuperAdmin app's own Firestore client, as actually implemented
today:** `apps/superadmin/src/lib/firebase.ts` does instantiate a real
`getFirestore(app)` client (`db`), but — confirmed by the Prior
Investigation series and re-confirmed here — it is used only to read
the operator's own `platform_operators/{own-uid}` document; every
other SuperAdmin capability is server-mediated (Admin SDK, bypassing
rules entirely).

**The cross-document rules-lookup pattern, as actually implemented
today:** `initialStockRecoveryAuthorizationActive(businessId,
stockCountId)` (`firestore.rules` lines 305–315) is a real, shipped
example of a rules function that `get()`s a *different* document
(the Authorization) to conditionally grant access to the *target*
document (the `StockCount`), matching identity/state fields across
both. This is the directly reusable pattern for solving Finding 10-A,
below.

**OCR/Smart Stock Entry transient state, as actually implemented
today:** re-confirmed, `AddStockView.tsx`'s field-status badges
(`detected`/`review`/`not_found`) and `PurchaseDraftLineItem`'s own
schema (`apps/tenant/src/types.ts`) — the badges are never persisted,
confirmed by direct reading, unchanged from the prior investigation
series' own finding.

## 2. Gap Analysis

| Requirement | Exists today? | Gap |
|---|---|---|
| Invitation/code lifecycle (hash, expiry, single-active, atomic consumption) | Shape exists (`initialStockRecoveryAuthorization.ts`); this exact collection does not | New collection, new server routes, reusing a proven pattern |
| Brute-force lockout on the code | Shape exists (Clear-Data Password); this exact mechanism does not | New counter/lockout logic, reusing a proven pattern |
| Session document + heartbeat/grace-period state machine | No precedent of any kind — this codebase has never had a heartbeat mechanism | New collection, new server routes, **no existing pattern to reuse** — the first genuinely novel mechanism this capability requires |
| Platform operator client-side read of tenant-scoped data | **No precedent anywhere** — confirmed exhaustively | New `firestore.rules` grant class required; see Finding 10-A |
| Platform operator client-side write of any kind | **No precedent anywhere** — confirmed exhaustively, explicitly documented as never-done | New `firestore.rules` grant class required, narrower and higher-risk than the read case; see Finding 10-B |
| WebRTC signaling relay | No WebRTC infrastructure of any kind exists | New, but requires no new npm dependency — native browser APIs + Firestore-as-signaling-channel (a well-established external pattern, not previously used in this codebase) |
| TURN/relay service | **Does not exist, not even referenced anywhere in configuration** | New infrastructure dependency — see Finding 1-B |
| Support View State schema enforcement | No field-level schema-enforcement precedent for a customer-authored, operator-read document | New `firestore.rules` field-allowlist logic |
| Audit action types for this capability | Shape exists (`platformAuditLog.ts`, `KNOWN_ACTION_TYPES`); the 8 specific values do not | Additive, low-risk, following exact existing convention |
| Composite indexes for new collections | None exist for any of this capability's proposed collections | Standard Implementation Plan item |

## 3. Findings, by Assessment Dimension

Each finding is classified **A** (Specification-level technical
question, resolvable during implementation planning without changing
business meaning), **B** (Rule 8 blocker / Product Architect decision
or explicit acknowledgment required before implementation), or **C**
(ordinary implementation detail, does not block Rule 8).

### 1. Desktop `getDisplayMedia()` + WebRTC Path

**Finding 1-A (A).** `getDisplayMedia()` + `RTCPeerConnection` are
confirmed native browser APIs requiring zero new npm dependency — the
Specification's own claim is verified, not merely repeated. The
customer's own native browser consent picker (FR-22) is a real,
browser-enforced control this Specification correctly does not need to
build.

**Finding 1-B (B).** **TURN/relay infrastructure does not exist
anywhere in this stack, is not referenced in any environment variable
convention, `package.json`, or deployment configuration, and this
repository has no operational precedent for running or provisioning
one.** Direct peer-to-peer WebRTC connections are well-documented to
fail across carrier-grade mobile NAT without a TURN relay — a real
risk for a customer base already established as mobile-network-heavy
throughout this codebase's own context. **This is a genuine
falsification candidate for the desktop path specifically**: without
a TURN service, an unknown but potentially significant fraction of
desktop-path Sessions could fail to establish a peer-to-peer
connection at all, with no fallback defined anywhere in the
Specification. **Required action:** a Product Architect decision on
whether to acquire a managed TURN service (a new recurring cost and
vendor dependency) or accept that some fraction of desktop-path
Sessions may fail without one — this Specification does not decide
this, and Rule 8 cannot resolve it unilaterally, since it is a cost/
vendor decision, not a technical one.

### 2. Mobile Firestore Support View State Path

**Finding 2-A (A).** The Support View State's four-category allowlist
(§20 of the Specification) is internally consistent with the
existing `AddStockView.tsx` field-status badge shape it specifically
cites — the field names proposed (`fieldStatus` map with
`detected`/`review`/`not_found` values) match the actual, real
component states, not an invented shape.

**Finding 2-B (B) — directly tied to Finding 10-A, below.** The
mobile path's entire viability depends on a `platform_operators`
identity being able to `onSnapshot`-subscribe to a tenant-scoped
document — a pattern with **zero precedent** in this codebase (§1,
Current State Assessment). This is not a reason the mobile path
*cannot* work — it is achievable, using the cross-document lookup
pattern already proven for `initialStockRecoveryAuthorizationActive()`
— but it is a genuinely new class of Security Rules grant this
codebase has never needed before, and must be implemented with the
narrow, session-scoped precision Finding 10-A specifies exactly, not
the broad `isPlatformOperator()` grant `platform_audit_log` uses today.
Getting this narrow-enough is the single highest-stakes correctness
requirement in this entire capability.

### 3. VIEW + POINT + GUIDE / Zero-Write Structural Boundary

**Finding 3-A (A).** The desktop path's guarantee (FR-20: the viewer
holds no credential, no Firestore connection, no tenant SPA code
dependency at all) is confirmed achievable and is, by a meaningful
margin, the strongest guarantee in this entire capability — there is
no code path to misuse because there is no code connecting the viewer
to anything tenant-owned.

**Finding 3-B (B) — the second load-bearing, previously-unflagged
finding this assessment surfaces.** The pointer mechanism (FR-28)
requires the **Support operator's browser to write** coordinate data
to a Firestore document the customer's browser reads. Per §1's Current
State Assessment, **this would be the first client-side Firestore
write by a `platform_operators` identity in this codebase's entire
history** — every existing platform-operator write is explicitly,
repeatedly documented as server-mediated-only, precisely *because* a
client-side write from that identity class has never been trusted
before. This is not disqualifying — the write's payload (`{x, y,
timestamp}`) is inert, cosmetic data with no path to any tenant
mutation, and FR-29's `pointer-events: none` rendering already ensures
it cannot become an input channel regardless of how it's written. But
it is a genuine, real departure from an unbroken existing convention,
and the `firestore.rules` grant permitting it must be scoped with the
same session-specific precision Finding 10-B requires — a broad
`allow write: if isPlatformOperator()` on the pointer path would
technically satisfy "the operator can publish coordinates" while
massively over-granting (any operator could write pointer spam into
any business's pointer document, active session or not).

**Finding 3-C (A).** No finding anywhere in this assessment identifies
a code path by which the write-prohibition could be bypassed once
Findings 2-B/3-B/10-A/10-B are correctly implemented — the boundary is
sound in design; its risk is entirely in *implementation precision*,
not in the underlying architecture.

### 4. One-Time-Code Security Model

**Finding 4-A (A).** The hash/salt/atomic-consumption/single-active-
per-business shape is a direct, proven reuse of
`initialStockRecoveryAuthorization.ts`'s own transactional-write
pattern — no new design risk found.

**Finding 4-B (C).** The Specification's own proposed heartbeat
figures (15s interval / 30s missed-threshold / 2min grace) and code
comparison requirement (`crypto.timingSafeEqual`, FR-4) are
technically sound as proposed; exact production tuning remains an
ordinary Implementation Plan question, not a blocker.

**Finding 4-C (A).** FR-13's "counter scoped to the Invitation itself,
never per-operator" (Rule G / LOCKOUT-4) is directly and cleanly
implementable using the same single-document-counter shape the
Clear-Data Password precedent already proves — no new mechanism
required.

### 5. Tenant Isolation

**Finding 5-A (B) — the most severe risk this entire assessment
identifies, stated plainly.** If Findings 2-B/3-B/10-A/10-B are
resolved by implementing the *broad* form of `isPlatformOperator()`
seen at `platform_audit_log` (any authenticated platform operator,
unconditionally) rather than the *narrow*, session-matched form this
assessment specifies, the result would be a **catastrophic violation**
of Policy Rule L ("no standing or session-less access, ever") and Rule
K ("one session, one business, no exceptions"): any platform operator
— including one who has never consumed any code for any business —
could read every business's live Support View State, pointer stream,
and Session status at will, with no code ever having been generated,
let alone consumed. **This is not a hypothetical edge case; it is the
literal, default behavior of copying the one existing
`isPlatformOperator()` precedent verbatim**, which is precisely why
this finding is classified B rather than A: the Implementation Plan
and Rule 8's own sign-off must explicitly verify, by security-rules
test (`tests/*.test.ts`, following this repository's own
`@firebase/rules-unit-testing` convention, already a real dependency),
that the eventual rules text uses the narrow, session-matched form —
not merely that it "works" in a happy-path manual check.

**Finding 5-B (A) — the concrete, evidence-grounded resolution
direction.** The fix is a direct application of the already-proven
`initialStockRecoveryAuthorizationActive()` pattern (§1): a new helper,
conceptually `isActiveSupportOperatorForSession(businessId, sessionId)`,
that `get()`s the `businesses/{businessId}/supportSessions/{sessionId}`
document and confirms **both** that its `status` is `active` or
`reconnecting` **and** that its `operatorUid` field equals
`request.auth.uid` — before granting read (Support View State,
pointer, signaling) or the narrowly-scoped pointer write (Finding
3-B). This is not a new technique this codebase has to invent; it is
the exact shape of an already-shipped, already-tested rules function,
applied to a new pair of collections.

**Finding 5-C (A).** Every proposed collection is consistently scoped
`businesses/{businessId}/...` (confirmed against §22's Proposed Data
Model) — no cross-tenant path was found anywhere in the Specification
itself; the isolation risk is entirely in the *grant condition*
(Finding 5-A), not in the *path structure*.

### 6. Heartbeat/Reconnection/Abandonment Handling

**Finding 6-A (B) — a genuine gap in the Specification itself, not
previously flagged anywhere in this governance chain.** FR-54 requires
**only the customer's browser** to send a heartbeat. Nothing in the
Specification requires the **Support operator's own browser** to send
one. A Support operator's own connectivity loss (laptop sleeps, WiFi
drops, browser crash) — while the customer's connection remains
perfectly healthy — is therefore **not detected by the mechanism as
specified**, and the customer could be left believing a Support
operator is still connected (the persistent indicator, FR-31, would
remain visible) when the operator's own browser has silently
disappeared. **This is exactly the class of gap Rule 8's falsification
mandate exists to catch** — the Specification names abandonment as a
bidirectional concern conceptually (Policy Rule U: "either party's
browser") but FR-54's actual requirement is one-directional. **Required
action:** the Implementation Plan must extend the heartbeat requirement
to the Support operator's own browser symmetrically — this is
correctable within Rule 8's own technical authority (it does not
reopen any Policy or BDR decision, since Rule U's own text already
names "either party"), but it must be corrected before implementation,
not discovered afterward.

**Finding 6-B (A).** FR-57's cap ("the grace period must never cause
total active lifetime to exceed the original 60-minute cap," directly
implementing I-11) is a clean, directly-enforceable invariant at the
rules or server layer — comparing `graceExpiresAt` against the
Session's own immutable `expiresAt` and taking the minimum. No
implementation risk found.

**Finding 6-C (A).** FR-59's "server is exclusively authoritative;
client cannot unilaterally declare a session active" is achievable
using the same discipline this codebase already applies to business
suspension (`isBusinessSuspended()` folded into `isMemberOf()`,
confirmed in the Prior Investigation series) — a rules-layer read of
the Session's own `status` field, never a client-asserted claim.

### 7. The 60-Minute Session Invariant

**Finding 7-A (A).** Directly and cleanly enforceable: `expiresAt` is
server-set once, at establishment (FR-17), and I-11 (never modified by
any connectivity event) is a straightforward "this field is immutable
after creation except by the server's own termination write" rule —
the same field-lock discipline already identified as a gap-to-fix
elsewhere in this codebase's own history (the `closings` field-lock
gap the Business Worth Evolution Rule 8 Assessment found and fixed) is
directly applicable here, and this capability's own Data Model already
anticipates it correctly by never listing `expiresAt` as
customer-writable.

### 8. Pointer Synchronization

**Finding 8-A (C).** The `{x, y, timestamp}` overwrite-only shape
(§22's Data Model: "overwritten frequently, never accumulated as
history") is a low-risk, low-volume write pattern well within
Firestore's ordinary write-rate characteristics for a single document
being overwritten by one operator during one active Session.

**Finding 8-B (A).** Coordinate-space normalization (the customer's
and operator's viewports may differ in size) is not addressed
anywhere in the Specification's FR-27–30 — this is a real,
implementation-level question (should coordinates be normalized as
percentages of viewport rather than raw pixels?) but does not block
Rule 8, since Support View State's own `viewportWidth`/`viewportHeight`
fields (§20, Category 4) already provide exactly the data an
Implementation Plan would need to solve this correctly.

### 9. Audit Integrity

**Finding 9-A (A).** All 8 proposed `actionType` values (FR-44) follow
the exact existing `noun.verb_past_tense` convention
(`KNOWN_ACTION_TYPES`, confirmed); the schema itself (`actorUid`,
`actorRole`, `actionType`, `targetBusinessId`, server `timestamp`)
requires no change. FR-45's requirement to update
`KNOWN_ACTION_TYPES` in the same change is a correct, low-risk,
already-precedented discipline (this repository's own governance
record already documents the cost of *not* doing this, per the
existing Audit Center allowlist staleness finding).

**Finding 9-B (A).** The customer-as-`actorUid` case (`support_session.invited`)
is confirmed, by this assessment's own re-reading, to be genuinely the
first audit entry type in this codebase's history representing a
tenant-user-initiated action rather than a platform-operator action —
no schema change is required to accommodate this (the schema's
`actorUid`/`actorRole` fields are identity-agnostic), but the
Implementation Plan should confirm `actorRole` is populated
meaningfully for a non-platform-operator actor (e.g. `'business-owner'`
or `'staff'`, mirroring the tenant-side `role` field), since every
other existing audit entry's `actorRole` is drawn from the
`PlatformRole` type specifically.

### 10. Sensitive-Data Exposure / Masking

**Finding 10-A (B).** *(Restated from Finding 2-B/5-A/5-B above, given
its own dimension per the task's own enumeration — not a duplicate
finding, the same underlying risk viewed from the read-access angle
specifically.)* The Support View State's own field-level masking
question (§26 of the Specification) is correctly scoped as "no field
exists in the schema that wasn't already selected as necessary" — but
this guarantee is only meaningful if the **document itself** is
unreadable by anyone other than the one authorized operator (Finding
5-A/5-B) — a masking discipline applied to a document anyone could
read would be a much weaker guarantee than one applied to a document
only the correctly-scoped operator can read at all.

**Finding 10-B (B).** *(Restated from Finding 3-B above.)* The
pointer-write grant must be scoped with the same precision — see
Finding 5-B's resolution direction, applied identically to the write
case.

### 11. Concurrency / Race Conditions

**Finding 11-A (A).** FR-11's atomicity requirement (two simultaneous
code-entry attempts, at most one succeeds) is directly implementable
via a Firestore transaction, following `initialStockRecoveryAuthorization.ts`'s
own already-proven transactional-write pattern exactly — no new
technique required.

**Finding 11-B (A).** A heartbeat write arriving in the same instant
as an explicit termination request (FR-34/FR-35) — named as an open
question in the Specification's own §24 item 13 — is resolvable by
ordinary last-write-wins-with-status-check discipline (a heartbeat
write that finds the Session already `ended` should simply no-op, not
error or resurrect the Session) — a straightforward Implementation
Plan rule, not a structural risk.

### 12. `firestore.rules` Implementation

**Finding 12-A (B).** *(Consolidates Findings 2-B, 3-B, 5-A, 5-B,
10-A, 10-B into their own dimension, per the task's enumeration.)*
Every new collection this capability introduces needs new rules text;
the two genuinely novel grant classes (platform-operator read,
platform-operator write) must use the narrow, session-matched form
(Finding 5-B), never the broad form the one existing precedent uses.
**This is the single item this assessment recommends receiving
dedicated security-rules test coverage before any Implementation
Authorization is considered** — following this repository's own
`@firebase/rules-unit-testing` convention (a real, already-used
dependency, confirmed in `package.json`), with an explicit test
asserting that an authenticated platform operator **without** an
active Session for a given business **cannot** read that business's
Support View State, pointer, or Session documents — the direct,
falsifiable test of Finding 5-A's own risk.

### 13. WebRTC Signaling and TURN/Relay Requirements

**Finding 13-A.** *(Restated from Finding 1-A/1-B — given its own
dimension per the task's enumeration.)* Signaling itself (SDP/ICE
exchange) is achievable via Firestore documents, reusing `onSnapshot`
— Class A, no new risk. TURN/relay remains Class B (Finding 1-B), the
one clear infrastructure/cost gap this assessment identifies.

### 14. Browser / Mobile Compatibility

**Finding 14-A (A).** The desktop/mobile split itself is directly
evidenced (verified browser-support data, `BDR-0018` §2.2) — no new
risk beyond what's already governed. The exact client-side feature-
detection code (§24 item 11) remains a Rule 8/Implementation
question, not a blocker.

**Finding 14-B (C).** Neither the Specification nor this assessment
addresses what happens if a customer's device supports *neither* path
reliably (an edge case already named in §23 of the Specification,
correctly left as a documented limitation rather than a requirement
to solve).

### 15. Performance and Cost

**Finding 15-A (C).** The heartbeat mechanism's Firestore read/write
volume, at the proposed 15-second interval, is bounded and low
relative to this app's existing `onSnapshot`-heavy architecture —
confirmed no structural scale concern, though exact cost at production
volume is an ordinary Implementation Plan estimation item.

**Finding 15-B (B).** TURN relay bandwidth cost (if Finding 1-B's
Product Architect decision selects a managed service) is a genuine,
currently-unestimated recurring cost this assessment cannot itself
quantify — flagged for the same Product Architect decision as Finding
1-B, not a separate one.

### 16. Failure Recovery

**Finding 16-A (A).** The grace-period/reconnection mechanism (§21)
directly addresses the primary failure-recovery requirement (temporary
loss ≠ abandonment) — confirmed sound in design, contingent on Finding
6-A's bidirectional-heartbeat correction.

**Finding 16-B (A).** `webrtcSignaling` document cleanup (§24 item 10
of the Specification) remains correctly unresolved as a storage-
hygiene, not security, question — no risk found either way.

## 4. Assessment of the Specification's 13 Open Rule 8 Questions (§24)

All 13 items in the Specification's own §24 list are genuinely Class A
or C technical questions this assessment confirms are appropriately
left to the Implementation Plan — none conceals a business decision.
Two items (§24 items 1 and 6, WebRTC signaling design and reconnect
timing feasibility) are directly addressed by this assessment's own
Findings 1-A/13-A and 4-B respectively, narrowing but not eliminating
them as Implementation Plan work.

## 5. Formal Decision Table

| Finding | Evidence | Class | Risk | Required action | Governance owner | Blocks implementation? |
|---|---|---|---|---|---|---|
| TURN/relay infrastructure absent | No TURN service anywhere in this repo's config/precedent | **B** | High (desktop path may fail on restrictive networks without it) | Product Architect decision: acquire managed TURN, or accept the risk | **Product Architect** | **Yes, for the desktop path specifically** |
| Broad vs. narrow `isPlatformOperator()` grant | Exhaustive grep: one existing use, broad, on a non-tenant-scoped collection | **B** | **Critical** (naive implementation = any operator reads any business's live session data, unconsumed-code or not) | Implement the narrow, session-matched form (Finding 5-B); require explicit security-rules test coverage before Authorization | Implementation Plan + Rule 8 sign-off | **Yes, until the narrow form is the confirmed design** |
| Platform-operator client-side write (pointer) | Zero precedent anywhere in this codebase's history | **B** | Medium (inert payload, but a real first-of-its-kind grant) | Same narrow-scoping requirement as above, applied to the write case | Implementation Plan | Same as above |
| One-directional heartbeat (customer-only) | FR-54's literal text | **B** | Medium (Support-side disconnection undetected, stale "connected" indicator) | Extend heartbeat requirement to the Support operator's own browser | Implementation Plan (Rule 8's own technical authority — no Policy/BDR reopened) | **Yes, before FR-54 is implemented as currently worded** |
| Code/lockout/session-duration mechanics | Direct reuse of proven precedents | A | Low | Implement as specified | Implementation Plan | No |
| Audit action types/schema | Direct reuse of proven convention | A | Low | Implement as specified; update `KNOWN_ACTION_TYPES` | Implementation Plan | No |
| Pointer coordinate normalization | Not addressed by the Specification | A | Low | Resolve using `viewportWidth`/`viewportHeight` already in the schema | Implementation Plan | No |
| Composite indexes | None exist yet | C | Low | Standard Implementation Plan item | Implementation Plan | No |
| Heartbeat/termination race | Named in Specification §24 item 13 | A | Low | Last-write-wins with status check | Implementation Plan | No |

## 6. What This Assessment Does NOT Decide

Consistent with Rule 8's own scope, this assessment identifies
directions and technical findings — it does not commit:

- The exact `firestore.rules` expression text for the narrow,
  session-matched grant (Finding 5-B names the required *shape*, not
  the literal rules syntax).
- Whether a managed or self-hosted TURN service is selected, or its
  cost is accepted as a known risk (Finding 1-B/15-B) — a genuine
  Product Architect decision this assessment cannot make.
- The exact schema/field names beyond what §20 of the Specification
  already fixes.
- The exact composite indexes required.
- Any UI/component-level design for either the tenant-side consent/
  indicator UI or the SuperAdmin-side viewer UI.
- Any test file content — though §12/Finding 12-A specifically
  recommends *which* test must exist before Authorization, not its
  content.
- The exact mechanism by which the Support operator's own heartbeat
  (Finding 6-A's required correction) is implemented — the requirement
  is fixed here; the code path is an Implementation Plan question.

Each remains reserved for the Implementation Plan and, ultimately,
code written only after a signed Implementation Authorization.

## 7. Verdict

**⚠️ READY AFTER DECISIONS.**

Not READY FOR IMPLEMENTATION outright, and not NOT READY — three
findings require resolution before an Implementation Plan can safely
proceed, none of which reopens `BDR-0018` or the Policy:

1. **Product Architect decision required — TURN/relay (Finding 1-B,
   15-B).** No existing precedent, real recurring cost/vendor
   question. This assessment cannot resolve it and does not attempt
   to.
2. **Implementation Plan must specify the narrow,
   session-matched `firestore.rules` grant (Finding 5-A/5-B/10-A/10-B/12-A),
   never the broad form this codebase's one existing precedent uses**
   — resolvable entirely within Rule 8/Implementation Plan authority,
   using an already-proven pattern (`initialStockRecoveryAuthorizationActive()`),
   but must be explicit, tested, and verified before Authorization —
   not left to implementation-time judgment, given how severe the
   naive-implementation failure mode is (Finding 5-A).
3. **Implementation Plan must extend FR-54's heartbeat requirement to
   the Support operator's own browser, symmetrically** (Finding 6-A) —
   a correction within Rule 8's own technical authority (Policy Rule U
   already says "either party"), not a reopened decision, but a real
   gap in the Specification's own FR text that must be closed before
   implementation, not discovered during it.

**Every other dimension investigated (§3, all 16) either found no
structural risk (desktop credential-absence guarantee, code/lockout
mechanics, audit schema, tenant-scoped path structure, the 60-minute
invariant, pointer's non-interactive rendering) or identified an
ordinary, low-risk Implementation Plan item.** No finding in this
assessment reopens, reinterprets, or silently resolves any decision
already made in `BDR-0018`, the Policy, or the Specification — Finding
6-A's correction is explicitly confirmed to operate within Policy Rule
U's own existing text, not against it.

**This verdict authorizes exactly what §1–§6 describe — nothing
more.** It does not itself authorize an Implementation Plan or an
Implementation Authorization, and it does not itself resolve item 1
above (a genuine Product Architect decision) or pre-approve the
specific rules text for items 2–3 (an Implementation Plan
responsibility, informed by this assessment's required direction).

## Governance Notes (original assessment)

- This is a Rule 8 Assessment only. No `apps/`, `server/`,
  `firestore.rules`, `firestore.indexes.json`, or `tests/` file is
  touched by this document — every reference above is read-only
  inspection.
- This assessment does not modify `BDR-0018`, the Policy, or the
  Specification.
- No Implementation Plan or Implementation Authorization is created,
  drafted, or implied by this document.
- Every Policy Rule (A–Z) and every Specification FR (1–62) remains
  represented and unchanged — none is reopened, reinterpreted, or
  silently resolved by this document. Findings 5-A/5-B and 6-A each
  identify a required *implementation* correction within Rule 8's own
  technical authority, not a business-decision reversal.
- Nothing was committed or pushed to produce this document.

---

## 8. Rule 8 Closure — Product Architect Decisions 1–8 Applied

**This section is a closure pass, added after the Product Architect's
explicit Decisions 1–8** resolving this assessment's three outstanding
findings (§7, original verdict `READY AFTER DECISIONS`). Sections 1–7
and the "Governance Notes (original assessment)" above are preserved
verbatim as the historical falsification record; nothing in them is
edited, reinterpreted, or retracted by this section. Where a decision
requires a change to binding Specification text, that change is made in
`docs/specs/superadmin-agent-attended-support-session-specification.md`
as a formal **SPEC-3** correction pass (see that document's own
Governance Notes) — not silently, and not in this document.

### 8.1 Findings Disposition

| Finding | Product Architect decision | Specification already sufficient? | Amendment made | Final Rule 8 disposition |
|---|---|---|---|---|
| **1-B / 15-B** — TURN/relay infrastructure absent; cost/vendor decision required | **Decision 8**: TURN/relay is an explicit implementation/infrastructure dependency, not silently invented or vendor-selected; must be provisioned before desktop-path production use | N/A — not a Specification-text question | None (infrastructure/procurement item, not governance text) | **RESOLVED as a documented pre-production dependency**, gating the desktop rendering path's production launch specifically (not the mobile path, not this Rule 8 Closure itself). Vendor/self-hosted selection and cost estimation (Finding 15-B) remain an ordinary Implementation Plan / procurement item. See §8.3. |
| **5-A / 5-B / 2-B / 3-B / 10-A / 10-B / 12-A** — broad vs. narrow `isPlatformOperator()` grant; catastrophic-isolation risk if the one existing broad precedent is copied | **Decision 4**: authorization boundary is the active support session, never `platformRole` alone; must reuse the narrow `initialStockRecoveryAuthorizationActive()`-shaped pattern; explicitly forbids using `platform_audit_log` as precedent | **No** — the Specification's FR-53 implied the principle for reads but never stated it as a binding invariant, and no FR covered the pointer write or `webrtcSignaling` read at all | **Yes — SPEC-3**: new **Invariant I-12** (§6) and new **FR-63** (§21) added to `superadmin-agent-attended-support-session-specification.md`, naming the exact session-matched check (`status ∈ {active, reconnecting}` and `operatorUid == request.auth.uid`) and explicitly excluding `platform_audit_log` as precedent. Traceability matrix (§27) and Acceptance Criteria (§28, new item 24) updated to match. | **RESOLVED.** The narrow-grant requirement is now binding Specification text, not merely a Rule 8 recommendation — an Implementation Plan is bound by FR-63/I-12 the same way it is bound by any other FR, and the required security-rules test coverage (Finding 12-A) remains a pre-Authorization gate. |
| **6-A** — FR-54 heartbeat is one-directional (customer only); Support operator's own disconnection undetected as worded | **Decision 7**: both participants must be represented in authoritative session liveness; reconnection cannot create new authorization, extend the 60-minute cap, bypass the consumed code, create a second session, or revive an ended session; natural expiry/completion and abandonment must remain distinct audit events | **No** — FR-54's literal text named only "the customer's browser" | **Yes — SPEC-3**: **FR-54 amended** to require both the customer's and the Support operator's own browser to heartbeat independently; **FR-55 clarified** ("either participant"); **Data Model (§22)** gains `lastOperatorHeartbeatAt`; **Acceptance Criteria item 21** updated. FR-56–FR-62 required no textual change — already participant-agnostic as originally worded, confirmed by direct re-reading. The `support_session.completed` / `support_session.ended_by_abandonment` distinction (§18, FR-44) is unchanged and unaffected. | **RESOLVED.** FR-54 as amended now matches Policy Rule U's own "either party" text exactly, closing the gap Finding 6-A identified without reopening Rule U or any other Policy Rule. |

### 8.2 Specification Integrity Check

- **Firestore authorization:** the Specification now makes this
  explicit and binding (I-12, FR-63) — Support is never authorized by
  `platformRole` alone; the Support View State, pointer, and
  `webrtcSignaling` reads and the pointer write are all conditioned on
  the active session; no broad platform-operator grant is permitted.
  This closes the gap this assessment's own §8.1 row 2 identifies as
  "No."
- **Support-side heartbeat:** the Specification now requires it
  explicitly (FR-54 as amended). This closes the gap this assessment's
  own §8.1 row 3 identifies as "No."
- **TURN dependency:** confirmed to need only implementation
  documentation, not a Specification or further governance decision —
  Decision 8 itself constitutes the required Product Architect
  acknowledgment (acquire and provision TURN before desktop production
  use; vendor deferred). No Specification text names a TURN vendor or
  needs to.

### 8.3 TURN/Relay — Remaining Dependency (not a blocker to this closure)

Decision 8 resolves the *governance* question Finding 1-B raised (does
the Product Architect accept a real infrastructure dependency here, or
silently skip it) without resolving the *implementation* question
(which vendor, or self-hosted, and its exact cost). That split is
consistent with Finding 1-B's own original framing: "a cost/vendor
decision, not a technical one" for the former, ordinary Implementation
Plan estimation (Finding 15-A/15-B) for the latter. Concretely:

- The desktop rendering path (`getDisplayMedia()` + `RTCPeerConnection`)
  **must not** reach production use without a provisioned TURN/relay
  service — this is now a fixed pre-production gate, not an open
  question.
- The mobile rendering path (Support View State) has no TURN dependency
  and is not gated by this item.
- Selecting a managed vs. self-hosted TURN service, its exact recurring
  cost, and its environment-variable/deployment integration remain
  ordinary Implementation Plan work — no vendor is named here, per the
  Product Architect's own instruction not to invent one.

This dependency does not block Rule 8 Closure itself (a governance
determination that the architecture is sound and correctly bounded); it
blocks **desktop-path production launch** specifically, and must be
tracked as an Implementation Plan prerequisite.

### 8.4 Final Verdict

**✅ RULE 8 — CLOSED / PASS.**

All three findings that kept the original §7 verdict at `READY AFTER
DECISIONS` are now resolved:

1. TURN/relay (Finding 1-B/15-B) — resolved as a documented,
   pre-production infrastructure dependency for the desktop path only
   (Decision 8, §8.3) — no longer an open governance decision.
2. The narrow, session-matched Firestore authorization model (Findings
   5-A/5-B/2-B/3-B/10-A/10-B/12-A) — resolved and now binding
   Specification text (I-12, FR-63, SPEC-3).
3. The bidirectional heartbeat requirement (Finding 6-A) — resolved and
   now binding Specification text (FR-54 as amended, SPEC-3).

No finding in §3 of this assessment is reopened, reversed, or
reinterpreted by this closure. No Policy Rule or `BDR-0018` item is
touched. The security-rules test coverage this assessment recommends
(Finding 12-A) — an explicit test asserting that a platform operator
**without** an active session for a business cannot read that
business's Support View State, pointer, or Session documents — remains
required before Implementation Authorization; Rule 8 Closure fixes the
*requirement*, it does not itself constitute that test's existence.

## Next Governance Step

Rule 8 is now **CLOSED / PASS**. Per `19-governance-bdr-policy-framework.md`
§3, the next governance step is an **Implementation Plan**, informed by
this assessment's findings (in particular Findings 5-B, 12-A, and the
now-binding FR-63/I-12 and amended FR-54), followed by a signed
**Implementation Authorization**. **Neither is drafted, started, or
authorized by this document or by this closure pass.** Implementation
Authorization specifically remains a separate, future, explicitly-gated
step — this closure resolves governance findings; it does not itself
authorize code.

**Lifecycle:** Drafted → Verdict: READY AFTER DECISIONS → Product
Architect Decisions 1–8 → Specification SPEC-3 correction pass →
**Rule 8 Closure: CLOSED / PASS (this step)** → Not yet an
Implementation Plan. Not yet an Implementation Authorization. Not
Implemented.
