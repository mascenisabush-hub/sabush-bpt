Business Domain Specification

# SuperAdmin — Payment Operations (V1 Launch Slice)

**Version 1.0**
**Status:** Drafted — awaiting Product Architect acceptance
**Slice of Module #18 (SuperAdmin), operating on Module #19
(Subscriptions)'s existing payment records**
**Architecture references:** [ADR-0005](../adr/ADR-0005-superadmin-payment-operations-boundary.md)
(the authorizing decision for this slice's existence and boundary),
[Section 9.1](../architecture/09-superadmin-architecture.md) (Application
Shell — physically separate application), [Section 9.6](../architecture/09-superadmin-architecture.md)
(Audit Logs schema), [Section 7.4](../architecture/07-data-architecture.md)
(`platform_operators/{uid}`, `platform_audit_log/{id}`), [Section 4.4](../architecture/04-system-architecture.md)
(privileged-server pattern), [Section 4.13](../architecture/04-system-architecture.md)
(SuperAdmin Integration Point)
**Depends on:** [Module #19 Subscriptions](./19-subscriptions.md) — the
V1 Manual Payment Bridge (`server/paymentConfirmation.ts`,
`server/scripts/confirmPayment.ts`), the Subscription Lifecycle Engine
(`server/subscriptionEngine.ts`), and the `Payment` type (`src/types.ts`)
— all implemented, tested, and **unmodified in their subscription-
affecting logic** by this slice. Also depends on [Module #18 SuperAdmin](./18-superadmin.md)
(✅ Accepted, documentation & business rules) for the identity/audit
shapes this slice instantiates a minimal, real version of.
**Explicitly does not depend on:** Module #17 (Owner Portfolio,
implementation-unauthorized), Module #20 (Notifications) beyond what
already exists, or any other part of Module #18 beyond §9.1's shell
principle and §9.6's audit schema.

---

## 1. Purpose

Give a real, accountable, server-authorized human operator a way to
review and act on a pending Payment — replacing the ambient-trust CLI
script (`server/scripts/confirmPayment.ts`) that is, today, the *only*
mechanism that activates a paying customer's subscription. This slice
does not replace or redesign the payment/subscription engine; it gives
that engine a proper, audited front door.

## 2. Business Problem

`docs/specs/19-subscriptions.md`'s V1 Manual Payment Bridge was always
labeled provisional: `Payment.confirmedBy` is documented in
`src/types.ts` as "free-text... no platform-operator role exists yet
(Module #18 gap)." In production terms:

- Anyone with `FIREBASE_SERVICE_ACCOUNT_BASE64` access can confirm or
  reject any business's payment, with no role check, no queue of
  what's pending, and no structured record of *why* a decision was
  made beyond a free-text rejection reason.
- There is no way to see "what's waiting for review" without querying
  Firestore directly.
- Every confirmation/rejection is invisible to `platform_audit_log`
  today — the log exists (§7.4, §9.6) but nothing writes to it yet for
  this action.

## 3. Users

- **SuperAdmin** (`platform_operators/{uid}.platformRole == 'superadmin'`)
  — full access to every capability in this slice. The only role this
  V1 slice authorizes to act (confirm/reject). Per §9.1's full matrix,
  `support`/`developer` roles exist conceptually but this slice does
  not grant them payment-review capability — that is future scope, not
  a V1 gap, since §9.1's matrix does not name payment review as a
  Support/Developer capability at all (closest analog, §9.4, is
  SuperAdmin-write / Developer-read-only, and this slice is narrower
  than §9.4).

## 4. User Stories

1. As a SuperAdmin, I can sign in to a separate SuperAdmin application
   and see every pending Payment across all businesses, oldest first.
2. As a SuperAdmin, I can open one pending Payment and see everything
   I need to judge it: business name/code, amount, method, reference,
   submitter, submission time — without needing a database console.
3. As a SuperAdmin, I can confirm a payment I've verified externally,
   and trust that the correct subscription-state transition happens
   automatically, without me touching subscription state myself.
4. As a SuperAdmin, I can reject a payment I've determined is invalid,
   with a required reason, and trust the subscription is left
   completely unaffected.
5. As a SuperAdmin, after acting, I can see the resulting subscription
   state for that business, so I know my action had the intended
   effect without switching tools.
6. As a SuperAdmin, I can look at the Audit Trail and see exactly who
   confirmed or rejected which payment, and when.
7. As anyone auditing this system later, I can trust that no payment
   confirmation/rejection ever happened without a real, identified
   `platform_operators` account behind it.

## 5. Business Rules

- **BR-1 (Operator, not engine).** This slice's server code may only
  ever call `confirmPayment()` / `rejectPayment()` from the existing
  `server/paymentConfirmation.ts`. It must never write
  `subscription.status`, `subscription.renewalDate`, `subscription.trial*`,
  or `subscription.grace*` directly, and must never call
  `applyLifecycleEvent()` itself outside of what those two functions
  already do internally. This restates ADR-0005 §3 as a testable rule.
- **BR-2 (No §9.4 override path).** This slice does not build, expose,
  or link to any "change subscription plan/status directly" action.
  If a future session wires §9.4 into the same SuperAdmin application,
  it must remain a visibly distinct screen/action from Confirm/Reject,
  not a fallback the operator reaches for when a payment looks
  unusual.
- **BR-3 (Real identity only).** Every confirm/reject action is
  attributed to a real `platform_operators/{uid}`, re-verified
  server-side on every call (never trusted from the client) — the
  free-text `confirmedBy`/`rejectedBy` behavior of the current CLI
  bridge is superseded for actions taken through this slice; the CLI
  script itself may remain as a break-glass fallback (decision: keep
  it, unauthenticated-by-role but still requiring Admin SDK access —
  see §11 Future Considerations) but is no longer the primary path.
- **BR-4 (Idempotency preserved).** `confirmPayment()`/`rejectPayment()`'s
  existing idempotency guarantees (re-running is always safe; a
  rejected payment cannot be confirmed and vice versa) are unchanged
  and this slice's UI must surface those existing outcome states
  (`already-rejected`, `already-confirmed`, `not-found`) rather than
  hide or reinterpret them.
- **BR-5 (No instrument data).** This slice never stores or displays
  payment-instrument data beyond what `Payment` already holds
  (Architecture §4.12 — the payment processor, when one exists, is the
  system of record for instrument data; V1 has none, by design).
- **BR-6 (Audit is structurally required, not optional).** A
  confirm/reject action with no corresponding `platform_audit_log`
  entry must be impossible, not just discouraged — same standard
  §9.4/§9.6 already set for subscription overrides, applied here.
- **BR-7 (Physical separation, always).** No file under this slice may
  be imported by, or built into, `apps/tenant`'s bundle. Enforced at
  minimum by directory boundary (`apps/superadmin` only) and checked
  at build time (bundler entry points, CI) — see the Implementation
  Plan (Rule 8 Assessment) for the concrete mechanism.

## 6. Functional Requirements

**FR-1 — SuperAdmin Authentication.** `apps/superadmin` has its own
sign-in screen, using Firebase Auth (same project, per §9.1) but
checking `platform_operators/{uid}.platformRole` after sign-in — an
otherwise-valid Firebase Auth account with no `platform_operators`
record is denied entry to the app (shown a clear "not a platform
operator account" state, not a generic error).

**FR-2 — Pending Payment Queue.** A list view reading every
`businesses/*/payments/*` document with `status == 'pending'`, sorted
by `submittedAt` ascending (oldest first). Each row shows business
name/`businessCode`, amount, method, submission time. This is
necessarily a collection-group query across all businesses' `payments`
subcollections — the one place this slice reads more than one
business's data at once, and it is read-only, aggregate-shaped (no
raw per-business operational data beyond the Payment record itself),
consistent with the "not a raw cross-tenant scan" boundary Architecture
§2.8/§4.10 draws elsewhere for aggregate-shaped platform reads.

**FR-3 — Payment Detail / Review.** Opening one queue row shows the
full `Payment` record (amount, currency, method, reference,
submittedAt, submittedBy) plus the owning business's name and
`businessCode` (7.2's amendment — the same identifier already surfaced
on the tenant Dashboard, §8.14) and current subscription status.

**FR-4 — Confirm Payment.** A single "Confirm" action on the detail
view calls the server, which calls `confirmPayment()` unmodified
(BR-1), passing the real `platform_operators/{uid}` as `confirmedBy`.
On success, shows the resulting `lifecycleTransition` (or its absence,
per `subscriptionEngine.ts`'s own documented "no change can be a
correct outcome" case) in plain language, not raw JSON.

**FR-5 — Reject Payment.** A "Reject" action requiring a reason
(free text, required — mirrors the CLI script's existing requirement)
calls the server, which calls `rejectPayment()` unmodified, passing
the real `platform_operators/{uid}` as `rejectedBy`.

**FR-6 — Resulting Subscription-State Visibility.** After either
action, the detail view re-reads and displays that business's current
`subscriptions/{businessId}` status — read-only, no write path from
this screen (BR-2).

**FR-7 — Audit Trail.** A list view over `platform_audit_log` filtered
to `actionType` in (`payment.confirmed`, `payment.rejected`), showing
`actorUid`/`actorRole`/`targetBusinessId`/`timestamp` and (for
rejections) the justification. Requires the read-path rules change
noted in ADR-0005 §5 — see Non-functional Requirements and the Rule 8
Assessment for the exact scoped rule.

**FR-8 — Security Rules / Server Authorization.** Every write this
slice can trigger (confirm, reject) goes through the privileged server
and re-verifies `platform_operators/{uid}.platformRole` server-side —
`firestore.rules`' existing `allow update: if false` on `payments` is
unchanged (the server already bypasses client rules via the Admin
SDK, same pattern as every other privileged write in this codebase).

**FR-9 — Tests.** Server-side: unit tests for the new authorization
check (valid SuperAdmin, non-operator account, missing
`platform_operators` doc, wrong role) and for the new
`/api/superadmin/payments/*` routes' request/response shapes,
reusing `paymentConfirmation.test.ts`'s existing fixtures for the
underlying confirm/reject behavior rather than re-testing that logic.
Firestore rules tests: the new/changed `platform_operators` and
`platform_audit_log` read rules, added to `tests/firestore-rules.test.ts`'s
existing suite structure.

## 7. Non-Functional Requirements

- **NFR-1 (Physical separation).** Restates BR-7 as a build-level
  requirement: `apps/superadmin`'s production bundle must contain zero
  references to `apps/tenant`'s components; verified by the build
  output, not just by directory convention.
- **NFR-2 (Least privilege on the new read).** FR-7's Audit Trail read
  path is scoped to `platform_operators` only (any authenticated
  Firebase Auth user with no `platform_operators` record must still
  get `allow read: if false`) — this is a new capability, not a
  loosening of the existing "entirely client-inaccessible" rule for
  every other caller.
- **NFR-3 (No new dependency-inversion layer).** Per this codebase's
  existing convention (`server/paymentConfirmation.ts`'s own header),
  the new server route calls `confirmPayment`/`rejectPayment` directly
  — no new callback/event-bus abstraction introduced for this slice.

## 8. Data Model

**No new Firestore collection beyond what §7.4 already named.** This
slice is the first real writer to two collections whose schema
Architecture already fixed:

- `platform_operators/{uid}` — `{ platformRole: 'superadmin' }` for
  V1 (this slice only ever checks for `superadmin`; the field's full
  `'support' | 'developer' | 'superadmin'` union from §7.4 is
  unchanged, other values simply aren't granted access by this
  slice's authorization check yet).
- `platform_audit_log/{id}` — populated per §9.6's schema:
  `actorUid`, `actorRole: 'superadmin'`, `actionType: 'payment.confirmed'
  | 'payment.rejected'`, `targetBusinessId`, `justification` (rejection
  reason; omitted/empty for confirmations, matching §9.6's "required
  for Support Session/impersonation issuance and... purge" — not
  stated as required for every action type), `timestamp` (server
  timestamp).

No change to `Payment` (`src/types.ts`) or `Subscription`'s shape.
`Payment.confirmedBy`/`rejectedBy` now receives a real
`platform_operators/{uid}` string when the action comes through this
slice (still a string field, per its existing type — no type change
needed, only a change in what value populates it).

## 9. Security Considerations

- Every `/api/superadmin/payments/*` route: `requireAuth` (existing
  middleware pattern) → look up `platform_operators/{callerUid}` →
  403 if absent or `platformRole !== 'superadmin'` → only then proceed
  to `confirmPayment`/`rejectPayment`. Mirrors
  `verifyStaffManagementAction`'s existing shape in `server/index.ts`
  (re-read from Firestore, never trusted from the client), applied to
  the new identity space rather than `users/{uid}`.
- `apps/superadmin` is not reachable from `apps/tenant` at any route —
  a separate deployment target/subdomain, per §9.1 and ADR-0005.
- The Audit Trail's new read rule (FR-7) is additive and narrow: it
  must not grant read on any field of `platform_audit_log` to any
  caller who isn't a verified `platform_operators/{uid}` — the exact
  rule expression is an implementation-plan-level detail, not decided
  here beyond that constraint.

## 10. KPIs

- Zero payments confirmed/rejected through the CLI bridge post-launch
  of this slice, for any business, except a documented break-glass
  case (§11).
- 100% of confirm/reject actions have a corresponding
  `platform_audit_log` entry (BR-6 — should be structurally guaranteed,
  not just observed, but worth measuring as a regression signal).
- Time from Payment submission to SuperAdmin decision (queue age) —
  not gated by this slice, but the first real signal this slice makes
  visible at all.

## 11. Future Considerations

- Whether the CLI script (`server/scripts/confirmPayment.ts`) should
  be retired entirely once this slice ships, or kept as a documented
  break-glass path (e.g., SuperAdmin app is down) — a product decision
  for a later session, not this one.
- `support`/`developer` read-only visibility into the pending queue
  (§9.1's matrix implies Developer has *some* subscription visibility
  via §9.4 read-only) — deferred; V1 is SuperAdmin-only, full stop.
- §9.12 Internal Account Management screen (self-service provisioning
  of `platform_operators` records) — this slice's launch does not
  require it; the first `platform_operators/{uid}` record(s) are
  provisioned by a one-time Admin-SDK script/console action, tracked
  as a known gap, not silently assumed away.
- Automated payment-processor integration (PaySuite/PayTED) remains
  entirely out of scope, per its own separately-gated track.

## 12. Acceptance Criteria

- [ ] A Firebase Auth account with no `platform_operators` record
      cannot sign into `apps/superadmin` in any usable state.
- [ ] A `platform_operators/{uid}` with `platformRole: 'superadmin'`
      can see every pending Payment across all businesses.
- [ ] Confirming a payment calls the unmodified `confirmPayment()` and
      results in exactly the same lifecycle transition the CLI bridge
      would have produced for the same input.
- [ ] Rejecting a payment calls the unmodified `rejectPayment()` and
      leaves the subscription state completely unchanged.
- [ ] Every confirm/reject action produces exactly one
      `platform_audit_log` entry, matching §9.6's schema.
- [ ] No client (tenant or otherwise) without a `platform_operators`
      record can read `platform_audit_log`.
- [ ] `apps/tenant`'s production build contains no SuperAdmin code.
- [ ] All new/changed `firestore.rules` covered by
      `tests/firestore-rules.test.ts`.

---

## Product Architect Decision Record

**Confirmed and authorized, this session (see [ADR-0005](../adr/ADR-0005-superadmin-payment-operations-boundary.md)
for the full architecture decision):** §9.1's physical-separation
boundary applies without exception to this slice. SuperAdmin is
authorized as an *operator of* the existing Module #19 payment/
subscription engine — never an alternative subscription system. The
§9.4 direct-override concept is explicitly withheld from this slice.
Scope is the nine-item list in §1 of this document, nothing more.

**Status:** Drafted. Requires explicit Product Architect acceptance
before the Rule 8 Assessment / Implementation Plan proceeds to code.
