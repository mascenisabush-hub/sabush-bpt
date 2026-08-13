# ADR-0005 — SuperAdmin Payment Operations: Application Boundary & Scope

**Status:** Approved (architecture decision only — not implementation
authorization).
**Type:** Architecture Decision Record.
**Basis:** Product Architect Decision, this session — confirming and
authorizing Architecture §9.1 (Application Shell) as an approved,
non-negotiable boundary, and scoping a launch-critical vertical slice
of Module #18 (SuperAdmin) around Module #19's existing
`businesses/{businessId}/payments/{paymentId}` manual payment bridge.
**Nothing has been modified in `src/`, `server/`, or `firestore.rules`
to produce this document.**

---

## 1. Decision

**§9.1 is reconfirmed, not reopened.** Module #18 SuperAdmin — in full,
and in every slice of it built ahead of the full module, including
this one — is a **physically separate application** from
`apps/tenant`: a separate build, a separate deployment, never bundled
into the tenant SPA. No SuperAdmin component, route, privileged UI
element, or SuperAdmin-only logic may exist inside the tenant
application's browser bundle, gated or not. This is unchanged from
§9.1 as already drafted; this ADR does not weaken it, and no future
implementation plan may propose weakening it "for convenience" without
a new, explicit Product Architect decision superseding this one.

**A narrower slice of Module #18 is authorized to be designed now,**
ahead of the full Phase 2 (§13.6) build order, scoped **only** to
Payment Operations:

1. SuperAdmin authentication
2. Pending payment queue
3. Payment detail/review
4. Confirm payment
5. Reject payment
6. Resulting subscription-state visibility
7. Audit trail
8. Security rules / server-side authorization
9. Tests

Everything else Section 9 designs — Businesses/Tenant Management
(9.3), the §9.4 direct subscription-override path, Feature Flags
(9.5), Platform Analytics (9.8), platform Notifications (9.9),
Impersonation (9.10), System Health (9.11), Internal Account
Management (9.12) beyond the minimum needed to authenticate one
operator — remains **out of scope** and **not authorized** by this
ADR. This is a vertical slice through §9.1 + the minimum of §7.4/§9.6,
not an acceleration of Module #18 as a whole.

## 2. Why this slice, why now (deviation from §13.6's stated build order)

Architecture §13.6 sequences Module #18 as: (1) shell + identity, (2)
Dashboard + Tenant Management, (3) Subscriptions & Billing, (4)
Feature Flags, (5) Audit Logs, (6) everything else. This ADR authorizes
building pieces of (1), a narrow instance of (3) — specifically
*excluding* §9.4's own direct-override mechanism — and a narrow
instance of (5), ahead of (2) and (4), because:

- **The gap this closes is real and already in production use.**
  Module #19's V1 Manual Payment Bridge
  (`server/paymentConfirmation.ts`, `server/scripts/confirmPayment.ts`)
  is the *only* mechanism that turns a submitted Payment into an
  active subscription today, and it is a bare CLI script run by
  "whoever already holds legitimate Firebase Admin SDK / deploy
  access" — by that module's own header, an ambient-trust boundary,
  not a role-checked, queued, or audited one. `Payment.confirmedBy` is
  explicitly documented in `src/types.ts` as "free-text... no
  platform-operator role exists yet (Module #18 gap)." This slice
  closes exactly that named gap — it does not invent new scope.
- **§13.2 Rule 1 ("a phase only starts once every domain it reads from
  has real data") is satisfied for this slice specifically.** The
  payment-operations surface reads and writes only
  `businesses/{businessId}/payments/{paymentId}` and (indirectly, via
  the unmodified Lifecycle Engine) `subscriptions/{businessId}` — both
  of which already hold real, live data from Module #19 Phases 1–2 and
  the V1 Manual Payment Bridge. It has no read dependency on Module
  #20 (Notifications) holding real data, unlike §9.9. The general
  "#19 and #20 must both hold real data before #18 begins" statement
  in `docs/specs/18-superadmin.md` is a statement about the *full*
  Module #18 (which does depend on #9.9/Notifications); it is not a
  blanket bar on every possible slice of #18, and this ADR narrows the
  claim accordingly for this one slice only.
- **It does not touch, and is not gated by, §9.3/§9.4/§9.5/§9.8/§9.9's
  full designs.** Nothing in this slice requires Tenant Management,
  Feature Flags, Platform Analytics, or platform Notifications to
  exist first.

This is a deliberate, named exception to §13.6's ordering — not a
silent reordering. If a future session needs to build the rest of
Module #18, §13.6's original order still governs everything this ADR
did not carve out.

## 3. The critical internal boundary: operator vs. engine

This is the one property every later document in this chain (BDS,
Rule 8 Assessment, implementation plan, code) must preserve without
exception:

- **SuperAdmin decides:** *"I have reviewed this payment and authorize
  confirmation [or rejection]."* That is a review-and-authorize
  action, nothing more.
- **The Payment/Subscription engine decides:** *"Given this confirmed
  payment, these are the valid subscription-state transitions."* That
  remains exclusively `server/subscriptionEngine.ts`'s
  `applyLifecycleEvent()`, invoked exactly as
  `server/paymentConfirmation.ts` already invokes it today.

SuperAdmin is an **operator of** the existing Module #19 payment/
subscription engine, never an **alternative** subscription system.
Concretely, this means:

- The new SuperAdmin confirm/reject server endpoints call
  `confirmPayment()` / `rejectPayment()` from
  `server/paymentConfirmation.ts` **unmodified in their subscription-
  affecting logic** — the only change that file may need is *how the
  caller is authorized* (see §4) and *what identity string is passed
  as `confirmedBy`/`rejectedBy`* (a real `platform_operators/{uid}`
  now, instead of free text), never a new code path that mutates
  `subscription.status` directly.
- §9.4's direct subscription-override concept (change plan/status
  bypassing the payment-processor/confirmation path entirely) is
  **not** used for ordinary payment activation, and is **not** part of
  this slice at all. §9.4 remains reserved for its originally-scoped
  purpose: support/billing-dispute resolution, a materially different
  action from "I reviewed a submitted payment," and one this ADR does
  not authorize building yet.
- No new code in this slice may duplicate payment-confirmation or
  subscription-transition logic. If the BDS or implementation plan
  that follows this ADR proposes any such duplication, that is a
  process gap to flag, per `CLAUDE.md` Rule 2, not something to route
  around silently.

## 4. What this ADR resolves that §9's draft left open for this slice

Architecture §9 (status: drafted, awaiting full approval) already
fixes the shape this slice must follow; this ADR does not re-decide
any of the following, only confirms which already-fixed pieces this
slice draws on:

- **Identity:** `platform_operators/{uid}.platformRole` (§7.4, §9.1) is
  the SuperAdmin identity/authorization record — a structurally
  separate collection from `users/{uid}`, populated only by
  provisioning, never self-service signup. This slice needs exactly
  one role value populated (`superadmin`, or a role capable of
  reviewing payments — see the BDS for the exact minimum) to unblock
  Confirm/Reject; it does not need §9.12's full internal-account
  management *screen* — provisioning for this slice's launch can be a
  one-time server-side/Admin-SDK write, with the screen itself
  deferred (flagged as a known gap in the BDS, not silently dropped).
- **Server-side authorization:** every confirm/reject action re-
  verifies the caller's `platform_operators/{uid}.platformRole`
  server-side, exactly as `verifyStaffManagementAction` already does
  for tenant staff actions in `server/index.ts` (§4.4's pattern,
  applied to a new identity space) — never trusts client-rendered UI
  state, per Architecture Principle 2.9.
- **Audit trail:** `platform_audit_log/{id}` (§7.4, §9.6) — this
  slice's actions (`payment.confirmed`, `payment.rejected`, and
  session/login events if the BDS scopes them in) use exactly the
  schema §9.6 already specifies (`actorUid`, `actorRole`,
  `actionType`, `targetBusinessId`, `justification`, `timestamp`), not
  a bespoke shape invented for this slice. `firestore.rules`'
  existing `platform_audit_log` block (`allow read: if false; allow
  write: if false` — client-inaccessible, Admin-SDK-only) already
  matches this and needs no change for the write path; a narrow read
  path for the SuperAdmin app itself is new scope the BDS must specify
  explicitly (see open item below).

## 5. Open items this ADR does not resolve (deferred to the BDS)

- Exact `platformRole` value(s) permitted to confirm/reject payments
  for V1 (§9.1's full matrix names `support | developer | superadmin`
  with different screen access; this slice's BDS must state, not
  assume, which of those — if any beyond `superadmin` — can act here).
- Whether/how the SuperAdmin app itself reads `platform_audit_log` for
  its own Audit Trail screen (item 7 of the launch slice) given
  today's `allow read: if false` rule — this requires a rules change,
  scoped narrowly to platform-operator read, not a blanket opening of
  the collection.
- Exact API surface (`/api/superadmin/payments/*` route names,
  request/response shapes).
- `apps/superadmin`'s build/deploy mechanics (bundler config, hosting
  target) — infrastructure, not architecture, and out of this ADR's
  scope.

These are implementation-specification concerns, not architecture
concerns, and are carried forward to the BDS and Rule 8 Assessment that
follow this ADR in the governance sequence.

## 6. Explicitly not authorized by this ADR

- Direct subscription overrides for ordinary payment activation (§9.4
  misuse — see §3 above).
- Analytics, platform aggregates, feature flags, customer CRM, pricing
  administration.
- Automatic payment gateways/webhooks (PaySuite/PayTED integration
  remains its own, separately-gated track per
  `docs/engineering/19-v1-payment-adapter-contract-and-test-matrix.md`).
- Any other SuperAdmin functionality not named in §1's nine-item list.
- Any code. This ADR is an architecture decision only.

## 7. Governance sequence (unchanged, restated for this slice)

Architecture (this ADR) → Implementation Specification (BDS amendment)
→ Rule 8 Assessment → Implementation Plan → Code. Each stage requires
its own explicit Product Architect sign-off before the next begins,
per `CLAUDE.md`'s existing process. This ADR authorizes only the first
stage.
