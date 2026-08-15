Business Domain Specification

# SuperAdmin — V1 Operational Control Plane

**Version 1.0**
**Status:** Drafted — this session, per Product Architect authorization
of [ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md).
Requires explicit Product Architect acceptance before the Rule 8
Assessment's Implementation Plan is authorized to become Code.
**Slice of Module #18 (SuperAdmin) — second slice, connected to and
building directly on the first (Payment Operations, ADR-0005).**
**Architecture references:** [ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
(the authorizing decision for this slice's existence and boundary),
[Architecture Gap Resolutions](../engineering/18-superadmin-v1-architecture-gap-resolutions.md)
(the three design decisions this slice's Functional Requirements build
on), [Section 9.1](../architecture/09-superadmin-architecture.md)
(Application Shell), [Section 9.3](../architecture/09-superadmin-architecture.md)
(Businesses/Tenant Management — this slice implements a deliberately
narrower subset), [Section 9.6](../architecture/09-superadmin-architecture.md)
(Audit Logs schema), [Section 9.12](../architecture/09-superadmin-architecture.md)
(Internal Account Management — this slice implements its minimum viable
form), [Section 7.4](../architecture/07-data-architecture.md)
(`platform_operators/{uid}`, `platform_audit_log/{id}`), [Section 4.4](../architecture/04-system-architecture.md)
(privileged-server pattern), [Section 4.6](../architecture/04-system-architecture.md)
(Security-Rules-layer suspension, immediate effect — the pattern this
slice generalizes from staff to business).
**Depends on:** [Payment Operations](./18-19-payment-operations-slice.md)
(✅ Accepted, implemented, live) — this slice reuses its
`requirePlatformOperator`/`requireSuperAdmin` middleware, its
`writeAuditLogEntry` primitive, and its `readSubscriptionStatus()`
helper, unmodified. Also depends on Staff & Roles ([spec #16](./16-staff-roles.md))
for the `suspended`-field-on-a-document + Rules-layer-enforcement
pattern this slice generalizes from `users/{uid}` to `businesses/{id}`.
**Explicitly does not depend on:** Module #17 (Owner Portfolio,
implementation-unauthorized, `businessCode` does not exist), Module #20
(Notifications) beyond what already exists, or any part of Module #18
beyond the sections named above.

---

## 1. Purpose

Close the gap the Payment Operations slice deliberately left open: give a
real SuperAdmin operator the minimum ability to (a) safely add and remove
other operators, (b) see enough of a customer's business state to
diagnose a reported problem, (c) suspend or reactivate an account when
that's the authorized resolution, and (d) actually query the audit trail
those first three capabilities generate. This is not a redesign or
expansion of Module #18's full twelve-screen design (Architecture §9) —
it is the smallest connected set of capabilities that lets SuperAdmin
meet its own governing product test for realistic support scenarios
beyond "confirm a pending payment."

## 2. Business Problem

Verified this session by direct repository inspection: the currently
deployed SuperAdmin application can do exactly one thing — review and
act on a pending Payment. Concretely:

- **No safe multi-operator access.** The only way to grant
  `platform_operators` access is a CLI script requiring live Firebase
  Admin SDK credentials on someone's machine — a single point of
  failure, and one that writes no audit entry for its own most
  privileged action.
- **No visibility into a business's state.** A customer reports "I can't
  log in" or "my payment isn't reflected" — there is no read path into
  that business's data from SuperAdmin at all. Diagnosis today requires
  a Firebase Console session, which is exactly the unaudited backdoor
  this entire application exists to avoid.
- **No suspension mechanism.** Named directly as a real problem by
  ADR-0005's own Business Problem #2 ("suspend a business without a
  database console session, effective immediately") — and the
  underlying `Business` type has no field for it at all.
- **Audit log query-ability unconfirmed.** The write path exists and is
  used; whether an operator can actually filter and answer "who touched
  this business, and when" was not verified.

## 3. Users

- **SuperAdmin** (`platform_operators/{uid}.platformRole == 'superadmin'`)
  — full access to every capability in this slice, identical tier
  structure to Payment Operations.
- Per Architecture §9.1's full matrix, `support`/`developer` roles remain
  structurally recognized but **this slice grants them no new
  capability** — same posture the Payment Operations slice already took.
  Extending any of these four capabilities to Support/Developer tiers is
  explicitly future scope, not decided here.

## 4. User Stories

**Phase A — Internal Account Management**
1. As a SuperAdmin, I can provision a new `platform_operators` record for
   a real Firebase Auth account, assigning it a `platformRole`, from
   inside the SuperAdmin app — without needing Admin SDK credentials on
   my own machine.
2. As a SuperAdmin, I can revoke an existing operator's access, including
   another SuperAdmin's, from inside the app.
3. As a SuperAdmin, I am prevented from revoking my own account if doing
   so would leave zero active SuperAdmin accounts.
4. As anyone auditing this system later, every grant and revocation has
   a corresponding `platform_audit_log` entry — no exceptions.

**Phase B — Business Visibility**
5. As a SuperAdmin, I can search for a business by name or `businessId`
   and see a results list (name + id only).
6. As a SuperAdmin, I can open one specific business and see its core
   identity, owner name and email, shop/staff summary, subscription
   status, and recent payment history — enough to diagnose a realistic
   support report without a database console.
7. As a SuperAdmin, opening a business detail view requires me to supply
   a justification, and that access is itself logged.
8. As a SuperAdmin, I cannot see or reach any operational/financial
   collection (products, batches, expenses, stock counts, etc.) from
   this view — it is diagnostic, not an editor.

**Phase C — Business Suspend/Reactivate**
9. As a SuperAdmin, I can suspend a business, with a required
   human-readable reason, and trust that its Owner/Staff are denied
   further writes immediately — not at their next token refresh.
10. As a SuperAdmin, I can reactivate a suspended business, restoring
    normal write access immediately.
11. As a suspended business's Owner, I can still log in and see that my
    account is suspended — suspension blocks writes, not authentication.
12. As anyone auditing this system later, every suspend/reactivate action
    has a corresponding `platform_audit_log` entry with its justification.

**Phase D — Audit Center**
13. As a SuperAdmin, I can filter the Audit Trail by business, by actor,
    by action type, and by a time range, so "who touched this business,
    and when" is answerable from the screen itself.

## 5. Business Rules

**BR-1 (unchanged from Payment Operations, restated):** Every
`/api/superadmin/*` route re-verifies the caller's
`platform_operators/{uid}.platformRole` server-side on every call. No
client-rendered role state is ever trusted.

**BR-2 (Internal Account Management, no self-escalation):** No route in
this slice allows an operator to modify their own `platform_operators`
record. Provisioning/revoking targets a *different* uid, enforced
server-side, mirroring `verifyStaffManagementAction`'s existing
`staffUid === requesterUid` rejection pattern in `server/index.ts`.

**BR-3 (Internal Account Management, lockout guard):** A revoke request
that targets the last remaining `platformRole: 'superadmin'` record is
rejected server-side, regardless of who requests it or what the client
believes the current operator count is — computed from a fresh Firestore
read at request time, never cached or client-supplied.

**BR-4 (Business Visibility, read-only, absolute):** No route or UI
surface in Phase B performs any write of any kind to tenant data. This is
verified by code review, not asserted by UI absence alone.

**BR-5 (Business Visibility, curated response only):** The single-business
detail read returns exactly the fields named in the [Architecture Gap
Resolutions](../engineering/18-superadmin-v1-architecture-gap-resolutions.md#gap-2--business-visibility-read-model)
document (Gap 2) — business profile, owner identity, shop/staff summary,
subscription status, recent payment history. It never becomes a
passthrough to `products`, `batches`, `expenses`, `withdrawals`,
`stockCounts`, or `timelineEvents`. Any future addition to this response
shape requires its own explicit review against this rule, not a silent
expansion.

**BR-6 (Business Visibility, email scope):** Owner email appears only in
the single-business detail response, never in the search-results list
(Gap 3's resolution).

**BR-7 (Business Visibility, justification required, audited):** Every
single-business detail read requires a justification string and produces
exactly one `platform_audit_log` entry (`business.viewed`) — matching the
audit discipline already proven for Payment Operations' confirm/reject
actions.

**BR-8 (Business suspension, Rules-layer, immediate):** Business
suspension is enforced at `firestore.rules` via `isBusinessSuspended()`
folded into `isMemberOf()` (Gap 1's resolution) — not solely a
server-side check. This guarantees immediate effect for every existing
direct-client-to-Firestore write path, not only writes proxied through
`server/index.ts`.

**BR-9 (Business suspension, non-destructive):** Suspension flips one
boolean field. It never deletes, archives, or purges any tenant data. It
never disables the Owner's or Staff's Firebase Auth accounts (contrast
with staff suspension, BDS #16) — the Owner can still authenticate and
see their own suspended state; only writes are blocked.

**BR-10 (Business suspension, field-protected):** `businesses/{businessId}.suspended`
is never client-writable, including by the business's own Owner —
enforced by an equality-preserving clause on `businesses/{businessId}`'s
existing `allow update: if isOwnerOf(businessId)` rule, mirroring
`users/{userId}`'s existing protection of `suspended`/`staffTier`/
`managerPermissions`.

**BR-11 (Business suspension, justification required, audited):** Every
suspend/reactivate action requires a justification string and produces
exactly one `platform_audit_log` entry (`business.suspended` /
`business.reactivated`).

**BR-12 (Audit Center, no second system):** All four phases' audited
actions write through the existing `writeAuditLogEntry()` primitive
(`server/platformAuditLog.ts`), unmodified. No new audit collection, no
new write primitive.

**BR-13 (No batch/bulk mutation):** Every mutating route in this slice
(provision, revoke, suspend, reactivate) acts on exactly one operator or
one business per request. No multi-target endpoint is introduced.

**BR-14 (Payment Operations untouched):** `server/paymentConfirmation.ts`,
`server/subscriptionEngine.ts`, and the five existing
`/api/superadmin/payments/*`/`audit-log` routes are not modified by this
slice's implementation, beyond adding new, additive `actionType` values
to the open `PlatformAuditLogEntry.actionType` string field (no schema
change required — confirmed by direct inspection).

## 6. Functional Requirements

**Phase A**
- FR-A1: `POST /api/superadmin/operators` — provisions a `platform_operators/{uid}`
  record for a target uid + `platformRole`. SuperAdmin-only. Rejects
  self-targeting (BR-2). Writes `operator.provisioned`.
- FR-A2: `POST /api/superadmin/operators/:uid/revoke` — deletes/deactivates
  a target operator's record. SuperAdmin-only. Rejects self-targeting
  (BR-2) and the last-SuperAdmin case (BR-3). Writes `operator.revoked`.
- FR-A3: `GET /api/superadmin/operators` — lists current
  `platform_operators` records (uid + role only) for the management
  screen to render against.
- FR-A4: SuperAdmin app screen: list current operators, provision new,
  revoke existing — no self-row action buttons rendered for the caller's
  own record (BR-2, enforced in UI as well as server, per §9.1's
  "not rendered, not merely disabled" convention).

**Phase B**
- FR-B1: `GET /api/superadmin/businesses?q=` — search by name-prefix or
  exact `businessId`. Returns `{ businessId, name }[]` only (BR-6).
- FR-B2: `GET /api/superadmin/business/:businessId?justification=` —
  the single-business curated detail read (BR-5). Requires
  `justification` as a query parameter. Writes `business.viewed` (BR-7).
- FR-B3: SuperAdmin app screens: search bar + results list; business
  detail view rendering the curated response.

**Phase C**
- FR-C1: `POST /api/superadmin/business/:businessId/suspend` — body
  requires `justification`. Sets `businesses/{businessId}.suspended = true`
  via Admin SDK. Writes `business.suspended`.
- FR-C2: `POST /api/superadmin/business/:businessId/reactivate` — body
  requires `justification`. Sets `suspended = false`. Writes
  `business.reactivated`.
- FR-C3: `firestore.rules`: `isBusinessSuspended()` helper + fold into
  `isMemberOf()` + field-protection clause on `businesses/{businessId}`'s
  update rule (BR-8, BR-10) — exact text specified in the [Architecture
  Gap Resolutions](../engineering/18-superadmin-v1-architecture-gap-resolutions.md#gap-1--business-suspension-data-model)
  document.
- FR-C4: SuperAdmin app: suspend/reactivate action on the business detail
  view (Phase B), with a required justification field.
- FR-C5: Tenant-facing: a suspended business's Owner/Staff see a clear
  "account suspended" state rather than silent write failures — exact UI
  treatment is an implementation-plan-level detail, not specified here
  beyond "must not be a raw, unexplained permission error."

**Phase D**
- FR-D1: Extend `GET /api/superadmin/audit-log` (existing route) to
  accept `businessId`, `actorUid`, `actionType`, `from`, `to` query
  parameters, filtering server-side.
- FR-D2: SuperAdmin app: filter controls on the existing Audit Trail
  screen, wired to FR-D1.

## 7. Non-Functional Requirements

- **NFR-1 (bundle isolation, unchanged standard):** `apps/tenant`'s
  production build contains zero identifiers from this slice —
  same verification method already used for Payment Operations
  (built-output string scan, not source-structure inference).
- **NFR-2 (Rules test coverage, mandatory before merge):** Every new/
  changed `firestore.rules` clause (Phase C's `isBusinessSuspended()`
  and the `businesses` update-rule field guard) is covered by
  emulator-run tests in `tests/firestore-rules.test.ts` — specifically
  proving a suspended business's Owner/Staff is denied writes across at
  least `products`, `batches`, and `expenses` (representative, not
  exhaustive, of every `isMemberOf`-gated collection), not merely that
  the `businesses` document itself reflects `suspended: true`.
- **NFR-3 (no new identity or audit mechanism):** Restated from BR-2/BR-12
  as a non-functional constraint on the implementation as a whole — this
  slice adds zero new collections beyond what's explicitly named in the
  Architecture Gap Resolutions (no new top-level collection for
  suspension state, no new audit collection).

## 8. KPIs

- Zero direct-Admin-SDK-credential operator provisioning events after
  Phase A ships, except a documented break-glass case (mirroring
  Payment Operations' own KPI structure for its CLI bridge).
- 100% of Phase A/C actions have a corresponding `platform_audit_log`
  entry (BR-2/BR-11 — should be structurally guaranteed by the shared
  `writeAuditLogEntry` primitive, not just observed).
- Time from a real support report to first SuperAdmin diagnostic read
  (Phase B) — not gated by this slice, but the first signal this slice
  makes measurable at all.

## 9. Future Considerations

- Extending Business Visibility's read scope, or building the full
  Support Session credential mechanism (Architecture §9.7), to unblock
  `support`/`developer` tiers — explicitly deferred by Gap 2's
  resolution, not decided by this slice.
- Whether business suspension should also affect Firebase Auth (e.g.
  forced sign-out of active sessions) rather than only gating future
  writes — the current design (BR-9) deliberately does not disable
  Auth, matching the "the Owner can still log in and see they're
  suspended" user story (#11); revisiting this is a future product
  decision, not assumed here.
- §9.4's direct subscription-override path, §9.5 Feature Flags, §9.8
  Platform Analytics, §9.9 platform Notifications, §9.10 Impersonation —
  all remain entirely out of scope, per ADR-0006 §9.

## 10. Out of Scope

- Any implementation: code, Firestore Rules, database schema, or
  deployment of any kind — this spec, its accompanying ADR, and the
  Architecture Gap Resolutions document are design contracts only.
- Direct subscription overrides, impersonation, write-as-customer,
  destructive deletion, data purge, feature flags, platform analytics,
  platform notification configuration, generic Firestore administration,
  ERP-style administration — all explicitly deferred per ADR-0006 §9.
- Extending any of this slice's four capabilities to `support`/
  `developer` roles.
- The full Support Session credential mechanism (Architecture §9.7).

## 11. Acceptance Criteria

*Verifiable only once implementation exists; recorded now as a fixed
target.*

- [ ] A `platform_operators/{uid}` record can be provisioned and revoked
      entirely through the SuperAdmin app, by a SuperAdmin only.
- [ ] Self-targeting is rejected server-side for both provision and
      revoke (BR-2).
- [ ] Revoking the last active SuperAdmin account is rejected
      server-side (BR-3).
- [ ] Every provision/revoke action produces exactly one
      `platform_audit_log` entry.
- [ ] Business search results never include owner email (BR-6).
- [ ] The single-business detail read requires a justification and
      writes exactly one `business.viewed` audit entry per call (BR-7).
- [ ] The single-business detail read never returns any field from
      `products`, `batches`, `expenses`, `withdrawals`, `stockCounts`,
      or `timelineEvents` (BR-5) — verified by code review.
- [ ] A business suspension takes effect at the Firestore Rules layer
      immediately — verified by attempting a write from that business's
      own session immediately after suspension, no token-refresh delay
      (BR-8).
- [ ] `businesses/{businessId}.suspended` cannot be set by any client
      write, including the business's own Owner (BR-10) — verified
      directly against `firestore.rules`.
- [ ] Suspend/reactivate each require a justification and each produce
      exactly one `platform_audit_log` entry (BR-11).
- [ ] The Audit Trail screen filters correctly by business, actor,
      action type, and time range (FR-D1/D2).
- [ ] `apps/tenant`'s production build contains no code from this slice
      (NFR-1).
- [ ] All new/changed `firestore.rules` are covered by emulator-verified
      tests before merge (NFR-2) — explicitly distinguished from
      typecheck/build-clean, which is not equivalent.
- [ ] No route in this slice writes to `subscriptions/{businessId}`,
      `payments/{paymentId}`, or any tenant operational collection
      (BR-4, BR-14) — verified by code review.

---

## Product Architect Decision Record

**Authorized to proceed through governance, this session** (see
[ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md) for
the full architecture decision): the four-phase scope in ADR-0006 §3
applies without modification. The Architecture Gap Resolutions
(business-suspension model, Business Visibility read model, owner-email
scope) are recorded as **recommended**, pending explicit confirmation,
and this BDS's Functional Requirements are written against those
recommendations as the working assumption for the Rule 8 Assessment and
Implementation Plan that follow.

**Status:** Drafted. Per ADR-0006 §16 and the governing session's
explicit stop condition, reaching this point does **not** authorize
Code — a separate, explicit implementation authorization is required
after this governance package (ADR-0006, this BDS, the Gap Resolutions,
the Rule 8 Assessment, and the Implementation Plan) is reviewed in full.
