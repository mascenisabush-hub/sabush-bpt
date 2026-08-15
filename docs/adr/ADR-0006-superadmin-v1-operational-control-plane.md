# ADR-0006 — SuperAdmin V1: Operational Control Plane

**Status:** Approved (architecture decision only — not implementation
authorization).
**Type:** Architecture Decision Record.
**Basis:** Product Architect Decision — confirming the SuperAdmin Payment
Operations slice (ADR-0005) is intentionally insufficient to constitute a
responsibly-operable SuperAdmin V1, and authorizing a second, connected,
equally narrow slice of Module #18 to close that gap.
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, or `firestore.indexes.json` to produce this document.**

---

## 1. Context

ADR-0005 authorized and shipped one vertical slice of Module #18:
SuperAdmin Payment Operations. It is live in production (deployed against
`firebase-project sabush-bpt`, reachable at `adminbpt.sabushtech.com`,
verified end-to-end this session). The governing product test for
SuperAdmin's existence is:

*"If a real Sabush BPT customer has a problem tomorrow, can the platform
operator understand the problem, safely resolve what they are authorized
to resolve, and leave an auditable record?"*

The Payment Operations slice answers yes for exactly one scenario — a
pending manual payment. It answers no for every other realistic support
scenario: no way to see a business's state, no way to suspend an abusive
or non-paying account, no safe way to add a second operator, and an
audit log whose query-ability was unconfirmed.

## 2. Problem

A platform operating with real customers on a single-operator,
zero-visibility, zero-suspension SuperAdmin does not yet meet its own
governing test. This is a real operational gap, confirmed by direct
repository inspection (see the SuperAdmin V1 Completeness Audit, this
session): `platform_aggregates`, `feature_flags`, Support Sessions, and
Impersonation do not exist anywhere in the codebase; `Business` has no
`suspended` field; the only operator-provisioning path is a raw CLI
script with no audit trail of its own.

## 3. Decision

Authorize a second narrow, connected slice of Module #18 — the
**SuperAdmin V1 Operational Control Plane** — consisting of exactly four
capabilities, each scoped as tightly as ADR-0005 scoped Payment
Operations:

1. **Internal Account Management** — provision/revoke `platform_operators`
   records, SuperAdmin-only, audited, no self-escalation.
2. **Business Visibility** — read-only diagnostic lookup, narrow and
   audited (see §4/§7).
3. **Business Suspend/Reactivate** — narrow, reversible, non-destructive,
   justification-required.
4. **Audit Center completion** — filtering by business/actor/action/time,
   over the existing `platform_audit_log`.

Payment Operations (ADR-0005) is unchanged and carried forward as-is.

## 4. Scope

Exactly the four items in §3. This ADR resolves — via the accompanying
[Architecture Gap Resolutions](../engineering/18-superadmin-v1-architecture-gap-resolutions.md)
document — the two open design questions those four items depend on:

- **Business suspension** is represented as a `suspended?: boolean` field
  on `businesses/{businessId}`, enforced at the Firestore Rules layer via
  a new `isBusinessSuspended()` helper folded into `isMemberOf()`, exactly
  mirroring the already-proven `users/{uid}.suspended` pattern. Not a new
  top-level collection.
- **Business Visibility** is a narrow, server-mediated, per-call-audited
  diagnostic read endpoint — not the full Support Session credential
  mechanism Architecture §9.7 describes for the eventual Support/Developer
  tiers. That mechanism remains a future decision, not built by this ADR.
- **Owner email** is exposed only within the single-business audited
  detail view, never in list/search results.

Nothing beyond these four items and their settled design details is
authorized. See §9.

## 5. Security Boundaries

Unchanged from ADR-0005 §1 and Architecture §9.1, reconfirmed without
exception:

- SuperAdmin remains a physically separate application (`apps/superadmin`)
  — separate build, separate deployment, zero SuperAdmin-related
  identifiers in the tenant bundle.
- `platform_operators/{uid}` remains the **sole** platform-operator
  identity mechanism. This ADR does not introduce a second one. The
  existing CLI provisioning script (`server/scripts/provisionPlatformOperator.ts`)
  may remain as a documented break-glass/bootstrap path; the in-app
  provision/revoke flow (Phase A) becomes the primary path once it exists.
- Every new route re-verifies `platform_operators/{uid}.platformRole`
  server-side on every call — no client-rendered role state is ever
  trusted (Principle 2.9, unchanged, matching every existing
  `/api/superadmin/*` route).
- No self-escalation: an operator can never grant or modify their own
  `platformRole`, and cannot revoke their own account if doing so would
  leave zero active SuperAdmin accounts (server-verified, not only
  UI-level).
- No batch/bulk mutations across any of the four phases — one business or
  one operator per action, matching the "mutate narrowly" principle below.

## 6. Audit Requirements

Every mutation this ADR authorizes writes exactly one `platform_audit_log`
entry via the existing `writeAuditLogEntry()` primitive
(`server/platformAuditLog.ts`) — **no second audit mechanism is created.**
New `actionType` values required: `operator.provisioned`,
`operator.revoked`, `business.suspended`, `business.reactivated`,
`business.viewed`. This requires **no schema change** —
`PlatformAuditLogEntry.actionType` (`packages/shared-types/index.ts`) is
already typed as an open `string`, and `targetUid`/`targetBusinessId`
already exist on the schema — confirmed by direct inspection, not
assumed.

## 7. Data-Access Boundaries

Business Visibility (Phase B) is **read-only**, server-mediated, and
per-call audited (Gap 2's resolution). It returns a curated response
shape — business profile, owner identity (name + email, per Gap 3),
shop/staff roster summary, subscription status, recent payment history —
**never** a passthrough to raw `products`/`batches`/`expenses`/
`withdrawals`/`stockCounts`/`timelineEvents` or any other operational
collection. No bypass of the existing tenant-isolation boundary
(Principle 2.8) under any circumstance. Search-results lists expose
`name` + `businessId` only; email appears exclusively inside the
single-business, justified, audited detail view.

## 8. Mutation Boundaries

Adopted explicitly as this ADR's governing principle:

**"SuperAdmin should observe broadly but mutate narrowly."**

Every mutation this ADR authorizes is: explicitly authorized
(role-checked), narrowly scoped (one business or one operator at a time),
server-enforced, auditable, and reason-bearing where the action is
consequential — suspend/reactivate and operator revoke each require a
human-readable justification, matching the existing
`platform_audit_log.justification` field the schema already supports.

**Permanently out of this ADR's mutation surface:** subscription state,
payment state (beyond what ADR-0005 already authorized), arbitrary
business field edits, destructive deletion, purge.

## 9. Deferred Capabilities (explicitly recorded, not forgotten)

Direct subscription overrides; bypassing payment confirmation;
impersonation; write-as-customer; arbitrary tenant-data editing; arbitrary
business-field editing; destructive business deletion; data purge; feature
flags; platform analytics; platform notification configuration; generic
Firestore administration; ERP-style administration; the full Support
Session credential mechanism (Architecture §9.7, as distinct from the
narrower Business Visibility endpoint this ADR does authorize).

None of these are authorized by this ADR. A future slice needing any of
them requires its own ADR.

## 10. Relationship to ADR-0005

This ADR does not reopen, weaken, or reinterpret ADR-0005. §9.1's
physical-separation boundary applies without exception to every
capability this ADR authorizes, identically to Payment Operations. This
ADR does not authorize direct subscription manipulation under any
framing — ADR-0005 §3's operator/engine boundary (SuperAdmin *reviews and
authorizes*; the Subscription Lifecycle Engine alone *decides transitions*)
remains absolute and is not touched by any of the four phases here.

## 11. Relationship to Existing Payment Operations

Unchanged, unreplaced, not redesigned. `server/paymentConfirmation.ts`,
`server/subscriptionEngine.ts`, and `server/platformAuditLog.ts` are not
modified in behavior by this ADR — `platformAuditLog.ts`'s one function is
*reused* (new callers, same primitive), never duplicated. The existing
flow — pending Payment → SuperAdmin review → confirm/reject → unmodified
`paymentConfirmation.ts` → unmodified `subscriptionEngine.ts` — is carried
forward exactly as-is.

## 12. Implementation Sequencing

**Phase A — Internal Account Management**, first: every subsequent phase
assumes "the right people, and only the right people, have access" is an
auditable fact, not an assumption resting on one unaudited CLI script.

**Phase B — Business Visibility**, second: Phase C (suspend/reactivate) is
meaningless without first being able to see what's being acted on, and
this phase is the direct answer to the largest gap in "understand the
problem."

**Phase C — Business Suspend/Reactivate**, third, now unblocked by Gap 1's
resolution (§4) — the data-model question that previously blocked this
phase's own Rule 8 Assessment is settled.

**Phase D — Audit Center completion**, last: lowest risk (query/filter UI,
no new write surface), and benefits from A–C's new action types existing
to filter against.

Payment Operations remains already implemented; no phase re-touches it.

## 13. Explicit Non-Goals

This ADR is not: a general-purpose administrative database editor; a path
to arbitrary tenant-data editing; a redesign of the payment/subscription
engine; a second identity or audit mechanism; authorization for
impersonation or write-as-customer in any form; the full Support Session
credential mechanism; a commitment to build every item in Architecture §9
— only the four named capabilities, at the scope this ADR and its gap
resolutions settle.

## 14. Risks

1. **`firestore.rules` change for business suspension touches `isMemberOf()`**
   — the single most widely-consumed function in the rules file. The
   change itself is small (one new helper, one new clause) and follows an
   exact existing precedent (`isSuspended()`), but its *reach* is the
   widest of any rules change since the file's original shape. Requires
   emulator-verified tests specifically proving a suspended business's
   Owner/Staff is denied writes across representative collections, not
   just the `businesses` document itself.
2. **Phase B's response-shape discipline is the main ongoing risk** — the
   curated-read design (§7) only holds if every future addition to that
   endpoint's response is deliberately reviewed against "does this serve
   a realistic support scenario," not silently expanded toward a general
   business-data dump over time.
3. **Operator-provisioning UI (Phase A) is itself a new privileged-write
   surface** — same class of risk as any other mutation path; needs the
   same server-side re-verification discipline as every existing
   `/api/superadmin/*` route, plus the explicit zero-SuperAdmin-lockout
   guard.
4. **Break-glass ambiguity, compounded.** After Phase A ships, there are
   two ways to provision an operator (in-app + the CLI script), matching
   the same "two live paths" situation already flagged and accepted for
   Payment Operations' CLI bridge (spec §11) — recommend the same
   treatment: document the CLI script explicitly as break-glass-only
   once Phase A ships, not retire it.

## 15. Acceptance Criteria

*Verifiable only once each phase's own implementation exists — recorded
now as a fixed target, per this repository's established convention.*

- [ ] A `platform_operators/{uid}` record can be provisioned and revoked
      entirely through the SuperAdmin app, by a SuperAdmin only, with no
      self-escalation possible.
- [ ] Every provision/revoke action produces exactly one
      `platform_audit_log` entry.
- [ ] A SuperAdmin cannot revoke their own account if doing so would
      leave zero active SuperAdmin accounts (server-verified).
- [ ] Business Visibility exposes no write path of any kind — verified by
      code review, not just UI absence.
- [ ] Business Visibility's search-results list never includes owner
      email; the single-business detail view does, and every such detail
      read produces one `platform_audit_log` entry.
- [ ] A business suspension takes effect immediately at the Firestore
      Rules layer — verified by attempting a write from that business's
      own session immediately after suspension, no token-refresh delay.
- [ ] Suspend/reactivate is reversible, non-destructive, and requires a
      justification string.
- [ ] The Audit Center can filter by business, actor, action type, and
      time range.
- [ ] `apps/tenant`'s production build contains zero code from this
      slice (bundle-isolation check, same standard as ADR-0005).
- [ ] All new/changed `firestore.rules` are covered by emulator-verified
      tests before merge.

## 16. Governance Sequence (unchanged, restated for this slice)

Architecture Gap Resolutions (this session) → ADR-0006 (this document) →
BDS → Rule 8 Assessment → Implementation Plan → Code. Each stage requires
its own explicit Product Architect sign-off before the next begins, per
`CLAUDE.md`'s existing process. This ADR authorizes design and governance
work through the Implementation Plan stage; it does **not** authorize
Code. A separate, explicit implementation authorization is required
before any of the four phases begins.
