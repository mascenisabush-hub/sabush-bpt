Business Domain Specification

# Subscriptions

Version 1.0
**Status:** ✅ Accepted (business specification and architectural
decisions only — not implementation)
**Module #19 of 20 — Phase 4: Platform**
**Architecture references:** [Section 3.13](../architecture/03-domain-architecture.md)
(Subscriptions domain definition — plan/status/trial/entitlements,
Worth-First scope test), [Section 4.12](../architecture/04-system-architecture.md)
(Payments and Subscriptions Integration — system-level webhook shape),
[Section 6.2](../architecture/06-user-architecture.md) (Admin role —
"manages the business's own Subscription"), [Section 9.4](../architecture/09-superadmin-architecture.md)
(SuperAdmin Subscriptions & Billing screen — reads this module's data,
SuperAdmin-only override path), [Section 13.5](../architecture/13-development-strategy.md)
(Development Strategy Phase 1 — Subscriptions build order, trial-at-
Registration requirement, mobile-money regulatory-lead-time risk)
**Depends on:** [Subscription Ownership Resolution](./19-subscription-ownership-resolution.md)
(this module cannot be drafted without that contradiction resolved
first — `businessId`-keyed binding is a precondition of every section
below) · [Owner Portfolio (spec #17)](./17-owner-portfolio.md) for
`MAX_SHOPS_PER_OWNER`, explicitly **not** modified by this module (see
Business Rules, below) · [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
for the Worth-First boundary this module must never cross
**Implementation:** None yet. Genuinely greenfield — no `subscriptions`
collection, no Subscription-related types, context, or UI exist in
`src/`, `server/`, or `firestore.rules` today.

---

## Purpose

**Why does this module exist?**

Sabush BPT is a commercial SaaS product; every Business using it needs
a clear, unambiguous commercial state — what plan it's on, whether that
plan is in trial, active, or expired, and which platform capabilities
that state currently unlocks. Today, no such state exists anywhere in
the codebase: every Business behaves identically regardless of any
notion of a plan. Module #19 is where that state is defined for the
first time in the codebase.

This module governs **commercial access to the platform**, not the
business's own financial data. It is deliberately, structurally
separate from Business Worth, Capital Invested, Embedded Profit, and
Inventory Value — a Business's Sabush subscription invoice is not part
of that Business's own Expenses, and this module must never blur that
line (Architecture §3.13's own Worth-First scope test).

## Business Problem

Without this module:

- There is no way to gate any feature by plan tier — every capability
  is available to every Business unconditionally, with no commercial
  lever to build a sustainable platform on.
- `MAX_SHOPS_PER_OWNER = 10` (Module #17) is a flat, hardcoded constant
  with no path to becoming plan-dependent later.
- SuperAdmin's Subscriptions & Billing screen (Architecture §9.4) has
  no real collection to read from or override.
- There is no trial concept at all — a new Business today has neither
  a trial state nor an expiry to eventually enforce.

## Users

- **Admin** (Business owner) — sees their own Business's subscription
  state; can view plan, trial/expiry status, and entitlements; can
  initiate a plan change (the request path only — payment execution is
  external, see Non-functional Requirements).
- **Manager** (staff tier, Architecture §6.3) — can *view* the
  Business's subscription state, cannot change it (unchanged from
  §6.3's existing read-only Subscription visibility for this tier).
- **Staff** — no subscription visibility (unchanged from existing role
  model; not a capability this module adds).
- **SuperAdmin / Developer** (Architecture §9.4) — SuperAdmin can view
  and override any Business's subscription state for support/dispute
  resolution; Developer can view (including webhook delivery history)
  but not override. This module supplies the collection Architecture
  §9.4 already specified as its data source — it does not redesign that
  screen's permissions.
- **Background Worker** (Architecture §13.5, item 4) — reads/writes
  subscription state on a schedule to evaluate trial expiry and renewal
  due dates; not a human user, but a system actor this spec must define
  the contract for.

## User Stories

1. As a new Admin registering a Business, I automatically receive a
   trial subscription for that specific Business at the moment of
   registration — I never see a null or "no subscription" state.
2. As an Admin with two independent Businesses (Owner Portfolio,
   Module #17), I can see that one Business is on an active paid plan
   while the other is still on trial — the two states never merge or
   average together.
3. As an Admin whose Business's trial has expired without upgrading, I
   can still log in, still see my Business's historical Worth, Closings,
   and records — but certain plan-gated features become unavailable
   until I upgrade.
4. As a Manager, I can see my Business's current plan and trial/expiry
   status on the relevant screen, but I cannot change it.
5. As a SuperAdmin handling a billing dispute, I can view and, if
   necessary, directly override a specific Business's subscription
   state, with that override automatically and inseparably logged to
   the platform Audit Log.
6. As the Background Worker, I evaluate every subscription's
   trial/renewal dates on a schedule and transition status
   (`trial → active`, `trial → past_due`, `active → past_due`, etc.)
   without requiring a human to notice the date passed.

## Business Rules

1. **Subscription binding is `businessId`, never `uid`.** Fixed and
   non-negotiable for Version 1, per the [Ownership Resolution](./19-subscription-ownership-resolution.md).
   No code path may key a subscription by Owner/Admin identity.
2. **No Owner-level or Portfolio-level subscription.** Explicitly
   rejected for Version 1 (Decision Gate 2). Each Business's
   subscription is fully independent of every other Business the same
   Owner may hold.
3. **`MAX_SHOPS_PER_OWNER` is untouched by this module.** It remains a
   Module #17 platform rule. This module may, in a *future* version,
   supply it as a read entitlement (`entitlements.business_limit`) that
   Owner Portfolio's existing check consumes — but Version 1 does not
   build that wiring. Direction is fixed: entitlement → limit check,
   never the reverse.
4. **No null subscription states, ever.** A trial subscription record
   is created for a Business at the moment of Business Registration
   (Architecture §5.2/§13.5), so no feature-gate check anywhere in the
   product ever needs a special case for a missing subscription.
5. **Business Worth history is never a subscription "feature."** Core
   Business identity, historical Worth data, and record visibility
   remain available regardless of subscription status. Tenant data is
   never held hostage by commercial state. Only capabilities explicitly
   marked as subscription entitlements in the plan definition may become
   unavailable on expiry.
6. **Expired subscription = restricted features, not blocked login and
   not full read-only.** See Functional Requirements for the precise
   mechanism.
7. **No payment instrument storage.** This module stores subscription
   *state* (`status`, `planId`, `trialStatus`, `renewalDate`,
   `entitlements`) — never card numbers, mobile-money credentials, or
   any other payment instrument. Payment execution lives entirely with
   the external processor; this module only receives its webhook
   result.
8. **SuperAdmin overrides are audited atomically.** Every SuperAdmin
   plan/status override writes the `subscriptions/{id}` change and a
   platform Audit Log entry (Architecture §9.6) in the same server-side
   transaction — an override with no audit entry must be structurally
   impossible (already fixed in Architecture §9.4; restated here since
   this module owns the collection that rule applies to).
9. **Legacy accounts receive an explicit, non-null status at
   migration**, not a special-cased absence. See Functional
   Requirements, Migration.

## Functional Requirements

### 19.1 Data Model

```
subscriptions/{subscriptionId}
{
  businessId: string,          // required, immutable after creation
  planId: string,              // references a Plan definition
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled' | 'grandfathered',
  trialStatus: {
    startedAt: timestamp,
    endsAt: timestamp
  } | null,                    // null once out of trial, never null during trial
  renewalDate: timestamp | null,
  entitlements: {
    business_limit: number,
    feature_flags: { [featureKey: string]: boolean }
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

- One `subscriptions` document per `businessId`. `businessId` is
  required and set once at creation; it is never reassigned to a
  different Business.
- No `paymentMethod`, `cardToken`, `mobileMoneyAccount`, or any
  payment-instrument field exists on this document, per Business Rule 7.

### 19.2 Plan Definition (minimal, V1)

```
Plan
 |
 +-- Free Trial
 |
 +-- Paid Plan(s)
```

A Plan defines, at minimum:
- `business_limit` — an integer, the future replacement path for
  Module #17's hardcoded `MAX_SHOPS_PER_OWNER` (not wired in V1; see
  Business Rule 3).
- `features` — a map of feature keys to booleans (e.g., `AI_INSIGHTS`,
  `ADVANCED_REPORTS`, `EXPORTS`). This is the feature-gating source of
  truth every operational domain checks.

Plan *names*, tier count, and pricing are explicitly out of scope for
this BDS (see "Explicitly Left Open," below).

### 19.3 Trial Lifecycle

- Trial is **Business-level** (Decision A). Every new Business created
  through Registration (Architecture §5.2) receives its own trial
  subscription record at the moment of creation — never an Owner-level
  or account-level trial.
- Trial duration is a Plan-level setting, read at subscription-creation
  time (exact length left to Plan definition, not fixed by this BDS).

### 19.4 Expired/Past-Due Behavior — Restricted Features (Decision B)

On trial or subscription expiry:

- Login is **never** blocked.
- The Business is **never** placed in a blanket read-only mode.
- Core Business identity and historical visibility remain fully
  available: Business Worth history, Closings, Reports, Timeline,
  Products, Stock records — none of these are subscription-gated.
- Only capabilities explicitly marked in a Plan's `features` map may
  become unavailable once status leaves `active`/`trial` (i.e.,
  `past_due`/`suspended`). The exact list of which features carry a
  gate is a Plan-definition detail, not fixed here — but Business Rule
  5 fixes the boundary: Business Worth data itself can never be one of
  them.
- Status values in scope for V1: `trial`, `active`, `past_due`,
  `suspended`, `canceled`, `grandfathered` (legacy accounts, 19.6).
  Transition logic between these (grace periods, how long `past_due`
  is tolerated before `suspended`) is Background Worker configuration,
  not fixed by this BDS — flagged as an item the eventual engineering
  implementation plan must define explicitly, per Rule 8, before that
  work begins.

### 19.5 Entitlement Evaluation & Feature Gating Framework

- Every operational domain that needs to check "is this feature
  available" reads the Business's current `subscriptions/{businessId}`
  `entitlements.feature_flags` — a single, consistent read path, not a
  per-domain reimplementation.
- This is a framework/contract this BDS defines; it does not enumerate
  every feature that will eventually be gated. Only capabilities other
  specs have already flagged as commercial-tier-gated (e.g., AI
  Intelligence, spec #15) are candidates — this BDS does not invent new
  gated features on its own authority (per the standing Lead Engineer/
  Product Architect role split — feature-gating *policy* per feature
  remains a Product Architect call made when that feature's own spec is
  written or amended).

### 19.6 Legacy Account Migration

- No Business may ever have a null/missing subscription document. Every
  existing Business, at migration time, receives an explicit
  `subscriptions` record with `status: 'grandfathered'` (or `'active'`
  with `planId` pointing at a `legacy` plan — exact choice is an
  implementation detail for the migration script, not a product
  decision this BDS needs to force one way).
- No code path may special-case a missing subscription document as
  equivalent to "no restrictions" or "no access" — Business Rule 4
  applies identically to legacy and new Businesses alike.

### 19.7 Payment Processor Integration Boundary (Not Vendor Selection)

- This module defines an integration boundary only:
  `Payment Processor → Webhook → Subscription State Update`. The
  webhook handler updates `status`/`renewalDate`/`planId` on the
  relevant `businessId`'s subscription document; it does not store any
  payment instrument (Business Rule 7).
- Vendor selection (M-Pesa, e-Mola, or other) is explicitly not decided
  by this BDS. Architecture §13.5's "M-Pesa/e-Mola priority" is a
  regional requirement note, not a commitment this spec makes on the
  Product Architect's behalf.

## Non-functional Requirements

- **Tenant isolation.** A Business's subscription document is readable
  only by that Business's own Admin/Manager (view), plus SuperAdmin/
  Developer (platform-scoped read, per Architecture §9.4's existing,
  unmodified permission model) — never by another Business's Admin,
  regardless of shared Owner (Owner Portfolio, Module #17, grants no
  cross-Business subscription visibility; see Ownership Resolution).
- **Auditability.** Every SuperAdmin override is logged atomically with
  the state change (Business Rule 8) — no override may succeed without
  its audit entry succeeding in the same transaction.
- **No payment data at rest.** Structurally enforced by the data model
  (19.1) containing no payment-instrument fields, not merely a
  convention.
- **Background Worker load.** Trial/renewal evaluation runs on the
  existing generalized Background Worker (Architecture §13.5, item 4)
  on a schedule — no new scheduling mechanism, no Cloud Functions, no
  Blaze-plan dependency (Architecture §4.1's existing constraint).

## KPIs

- Zero Businesses with a null/missing subscription document, at any
  time post-migration (Business Rule 4/9.6).
- 100% of SuperAdmin overrides have a matching Audit Log entry
  (Business Rule 8) — structurally guaranteed, not just monitored.
- Time from trial expiry to correct feature restriction taking effect
  (a Background Worker latency metric, exact SLA not fixed by this
  BDS).

## Future Enhancements

- Family plans / Owner-level plans spanning multiple Businesses
  (explicitly rejected for V1, Decision Gate 2) — would require its own
  Product Architect decision and a BDS amendment, not an extension made
  silently inside this spec.
- `MAX_SHOPS_PER_OWNER` becoming a live entitlement read
  (`entitlements.business_limit`) instead of a hardcoded constant —
  direction fixed now (Business Rule 3), not built in V1.
- Full billing lifecycle — invoices, receipts, payment ledger — is
  explicitly out of scope for V1 (Decision C) and would require its own
  Product Architect scope decision, given the standing product-identity
  rule that Sabush BPT does not become an accounting/billing system.

## Acceptance Criteria

- [ ] Every new Business receives a `trial`-status subscription record,
      keyed by `businessId`, at the moment of Registration — never a
      delayed or missing record.
- [ ] Two Businesses under the same Owner can independently hold
      different subscription statuses with no shared or aggregated
      state between them.
- [ ] An expired/past-due Business retains full access to historical
      Business Worth data, Closings, Reports, and Timeline; only
      Plan-gated features become unavailable.
- [ ] No code path treats a missing subscription document as a valid,
      unhandled-by-design state — legacy accounts included.
- [ ] A SuperAdmin override of a subscription's plan/status cannot be
      persisted without a corresponding platform Audit Log entry in the
      same transaction.
- [ ] No `subscriptions` document, anywhere in the schema, contains a
      payment instrument field.
- [ ] `MAX_SHOPS_PER_OWNER` and Module #17's ownership model are
      unmodified by this module's implementation.

## Explicitly Left Open (Not Decided by This BDS)

Per Product Architect direction, the following remain open and must not
be inferred or decided during implementation without a separate,
explicit Product Architect decision:

1. **Actual plan names and tier structure** (e.g., what "Free," "Starter,"
   "Growth," "Enterprise" concretely include).
2. **Pricing** for any plan.
3. **Payment processor vendor selection** — M-Pesa/e-Mola remain a
   regional requirement, not a vendor commitment (19.7).
4. **Legacy account migration mechanics** — the *shape* is fixed
   (Business Rule 9/19.6: no null states), the exact migration script,
   timing, and `grandfathered` vs. `legacy`-plan choice are not.

---

## Product Architect Acceptance

**Accepted.** Scope of this acceptance, as explicitly granted:

1. **Subscription ownership model** — Business-level (`Business →
   Subscription`), not Owner/Portfolio-level. Consistent with, and
   granted alongside, the [Ownership Resolution](./19-subscription-ownership-resolution.md)'s
   own Acceptance.
2. **Trial model** — Business-level trial (Decision A). Every new
   Business receives its own subscription lifecycle at registration;
   subscription checks always resolve against the active Business; no
   Owner-level "already has a trial" logic.
3. **Expiry behavior** — Restricted features model (Decision B).
   Login blocking, full read-only mode, and any data-hostage model are
   not accepted. Permanent rule: Business Worth history, Closings,
   Timeline, and historical performance information remain accessible
   regardless of subscription status — subscription controls platform
   capabilities, never ownership of business data.
4. **Version 1 scope** (Decision C) — subscription records, trial
   lifecycle, subscription states, entitlement evaluation, feature
   gating framework, and the future payment-integration boundary are
   in scope. Invoice system, receipt system, payment ledger, and
   accounting-style billing history are explicitly excluded — Sabush
   BPT remains a Business Worth platform, not a billing/accounting
   platform.
5. **`MAX_SHOPS_PER_OWNER` relationship** — confirmed unchanged at `10`
   as a Module #17 Version 1 platform rule. Module #19 may in the
   future replace the fixed limit with entitlement-driven evaluation;
   no current change, no code authorization.

**Not included in this acceptance:** any source code implementation.
This acceptance clears the BDS's business specification and
architectural-decision content — it is not, by itself, authorization to
begin implementation. Per Rule 8, implementation still requires its own
affected-files/plan/risks review at the point it's actually assigned.
Lifecycle: **Designed → Accepted.** Not Implemented, Executed, or
Analyzed — no engineering work is authorized by this Acceptance.
