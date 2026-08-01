Business Domain Specification

# Subscriptions

Version 2.0 — Governance-Aligned Rewrite
**Status:** ✅ Accepted (business specification and architectural
decisions only — not implementation)
**Module #19 of 20 — Phase 4: Platform** (per `docs/specs/README.md`'s
product-value ordering; Development Strategy §13.5 separately places
this module's *build* in its own "Phase 1 — Platform Backbone," a
code-dependency ordering, not a restatement of this series' Phase 4 —
see that note already recorded in `docs/specs/README.md`'s "Note on
build order").
**Supersedes:** Version 1.0 of this document, in full, per the
[Module #19 Specification Alignment Amendment](./19-specification-alignment-amendment.md)
(Decision 7). Version 1.0 predated the governance stack below and is
retained only in git history, not as a parallel source of truth.
**Governance basis (source of business intent, per BDR-0004's
hierarchy):** [BDR-0001](./19-subscription-philosophy.md) (Subscription
Philosophy), [BDR-0002](./19-value-realization-framework.md) (Value
Realization Framework), [BDR-0003](./19-trial-experience-framework.md)
(Trial Experience Framework), [BDR-0004](./BDR-0004-customer-communication-architecture.md)
(Customer Communication Architecture, platform-wide),
[POL-19-001](./19-pol-001-trial-activation-policy.md) through
[POL-19-008](./19-pol-008-subscription-notification-policy.md) (the
complete Planned Policy Series), the
[Governance Decision — BDR Phase Completion & Policy Document
Framework](./19-governance-bdr-policy-framework.md), and the
[Specification Alignment Amendment](./19-specification-alignment-amendment.md)
that authorized this rewrite. Per that governance hierarchy, this
specification is downstream of all of the above — where this document
and any BDR/POL ever appear to disagree, the BDR/POL governs and this
document has drifted and needs correction, not the reverse.
**Architecture references:** [Section 3.13](../architecture/03-domain-architecture.md)
(Subscriptions domain definition — plan/status/trial/entitlements,
Worth-First scope test), [Section 4.12](../architecture/04-system-architecture.md)
(Payments and Subscriptions Integration — system-level webhook shape),
[Section 6.2](../architecture/06-user-architecture.md) (Admin role —
manages the business's own Subscription), [Section 9.4](../architecture/09-superadmin-architecture.md)
(SuperAdmin Subscriptions & Billing screen — reads this module's data,
SuperAdmin-only override path, resolves binding as `businessId`-keyed),
[Section 13.5](../architecture/13-development-strategy.md) (Development
Strategy Phase 1 — Subscriptions build order, trial-at-Registration
requirement, mobile-money regulatory-lead-time risk).
**Depends on:** [Subscription Ownership Resolution](./19-subscription-ownership-resolution.md)
(`businessId`-keyed binding is a precondition of every section below,
unchanged by this rewrite) · [Owner Portfolio (spec #17)](./17-owner-portfolio.md)
for `MAX_SHOPS_PER_OWNER`, explicitly **not** modified by this module ·
[Business Worth Engine (spec #2)](./02-business-worth-engine.md) for the
Worth-First boundary this module must never cross.
**Implementation:** None yet. Genuinely greenfield — no `subscriptions`
collection, no Subscription-related types, context, or UI exist in
`src/`, `server/`, or `firestore.rules` today. This rewrite is
documentation only; it does not authorize implementation (see "Product
Architect Acceptance," below).

---

## Purpose

**Why does this module exist?**

Sabush BPT is a commercial SaaS product; every Business using it needs
a clear, unambiguous commercial state — what plan it's on, whether that
plan is in trial, active, in a grace period, or expired, and which
platform capabilities that state currently unlocks. Today, no such
state exists anywhere in the codebase: every Business behaves
identically regardless of any notion of a plan. Module #19 is where
that state is defined for the first time in the codebase.

Per BDR-0001's Core Philosophy, this module does not exist primarily to
monetize software access. Sabush BPT sells continued access to
business understanding — Business Worth, Capital Growth, Inventory
Health, Embedded Profit, Financial Visibility, Loss Prevention — not
feature checkboxes. The subscription is how that continued access is
sustained commercially; it is not the product's reason for existing.

This module governs **commercial access to the platform**, not the
business's own financial data. It is deliberately, structurally
separate from Business Worth, Capital Invested, Embedded Profit, and
Inventory Value — a Business's Sabush subscription invoice is not part
of that Business's own Expenses, and this module must never blur that
line (Architecture §3.13's Worth-First scope test).

## Scope

**In scope for Version 1 (per BDR-0004's Decision C, unchanged by this
rewrite):** subscription records, trial lifecycle, subscription states,
entitlement evaluation, feature gating framework, the payment
integration boundary (webhook shape only, not vendor selection).

**Out of scope for Version 1:** invoice system, receipt system, payment
ledger, accounting-style billing history — Sabush BPT remains a
Business Worth platform, not a billing/accounting platform. Also out of
scope: Customer Experience Guides (BDR-0004) — a future, platform-wide
capability this module's eventual customer-facing communication may one
day draw from, not something this specification builds or authorizes.

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
  a trial state nor an expiry to eventually enforce, and no journey
  (BDR-0002/BDR-0003) through which it could realize business value
  before being asked to subscribe.

## Users

- **Admin** (Business owner) — sees their own Business's subscription
  state; can view plan, trial/expiry status, and entitlements; can
  initiate a plan change (the request path only — payment execution is
  external, see Security Considerations).
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
  subscription state on a schedule to evaluate trial expiry, Grace
  Period entry/exit, and renewal due dates; not a human user, but a
  system actor this spec must define the contract for.

## User Stories

1. As a new Admin registering a Business, my Business's trial does not
   begin at that moment — it begins at first meaningful business
   activity (POL-19-001) — but I never see a null or "no subscription"
   state at any point, including before activation (Trial Pending,
   below).
2. As an Admin with two independent Businesses (Owner Portfolio, Module
   #17), I can see that one Business is on an active paid plan while
   the other is still in trial — the two states never merge or average
   together (POL-19-005's Separation Principle applied across shops).
3. As an Admin whose Business's trial has completed without upgrading,
   I can still sign in, still see my Business's historical Worth,
   Closings, Timeline, and records (POL-19-003's Read-Only
   Preservation) — but I cannot create new operational records until I
   subscribe.
4. As a Manager, I can see my Business's current plan and trial/expiry
   status on the relevant screen, but I cannot change it.
5. As an Admin whose payment temporarily fails after being an active
   subscriber, my Business enters a 7-day Grace Period (POL-19-004)
   with full operational capability — I am not immediately restricted
   for a payment interruption that may resolve itself.
6. As an Admin returning after my subscription expired, subscribing
   again restores my Business to Active Subscription immediately,
   without re-onboarding or data loss (POL-19-007) — I am a returning
   partner, not a new customer.
7. As a SuperAdmin handling a billing dispute, I can view and, if
   necessary, directly override a specific Business's subscription
   state, with that override automatically and inseparably logged to
   the platform Audit Log.
8. As the Background Worker, I evaluate every subscription's
   trial/renewal/grace dates on a schedule and transition status
   accordingly, without requiring a human to notice the date passed.

---

## Business Objectives

Derived from BDR-0001 and BDR-0002:

1. Sustain continued business value for the customer, not merely
   monetize software access.
2. Give every business owner a fair, unpressured opportunity to
   experience measurable Value Realization before a subscription
   decision is required.
3. Build sustainable, predictable platform revenue without ever making
   customer-owned business data the mechanism of pressure.
4. Support SMEs through normal cash-flow realities (temporary payment
   interruption) rather than punishing them for it.

## Business Principles

Consolidated from BDR-0001 (Subscription Principles), POL-19-003 (Data
Ownership Principle, Trust Principle), and POL-19-005 (Product
Principle):

1. **Value before payment.** No customer is asked to pay before
   Sabush BPT has had a genuine opportunity to demonstrate business
   value.
2. **Business understanding before feature restriction.** The trial's
   purpose is understanding, not a feature tour.
3. **Customer data remains the customer's property**, always — trial
   expiry, Grace Period, or Subscription Expired must never be used to
   pressure a customer through fear of losing their own information.
4. **Renewal preserves momentum rather than restoring access.**
   Conversion and Recovery are continuations of an existing
   relationship, never a reset (POL-19-006, POL-19-007).
5. **Subscription status governs operational participation — not
   business ownership** (POL-19-005's Product Principle). A business
   continues to exist, in full, regardless of its subscription state.

---

## Subscription Philosophy

Per BDR-0001, in full: Sabush BPT does not primarily sell software
features. It provides business owners with answers that improve
understanding of their business — Business Worth, Capital Growth,
Inventory Health, Embedded Profit, Financial Visibility, Loss
Prevention. The subscription purchases continued access to these
insights, not merely access to software.

The trial is not free software, a marketing gimmick, a countdown timer,
or a feature showcase. It exists so a business owner can discover
measurable value within their own business, by encouraging genuine
business activity, accurate inventory management, regular review of
Business Worth, and the formation of sustainable management habits.

Trial success (BDR-0001/BDR-0002) is measured by business
understanding — the owner being able to answer "What is my business
worth? Is my capital growing? Which products create the most value?
Where am I losing money? Is my inventory healthier than before?" — not
by elapsed time.

---

## Trial Lifecycle

*Derived from POL-19-001 (Trial Activation), POL-19-002 (Trial
Duration), POL-19-003 (Trial Expiry).*

### Activation (POL-19-001)

The trial begins at **first meaningful business activity**, not at
account creation. Registration demonstrates interest; operational
business activity creates the opportunity for Sabush BPT to deliver
measurable value. A Business exists, and is visible in a `Trial
Pending` state (see Business State Model), from the moment of
Registration — but its trial clock does not start until activation.

"Meaningful business activity" is a business concept, not a technical
trigger, per POL-19-001's own explicit scope exclusion. Illustrative
examples only (recording initial inventory, the first real stock
movement, the first real business transaction) — **the precise
technical activation event (which write, field, or threshold
constitutes activity) is not decided by governance and is not decided
by this specification either.** It is flagged as an open engineering
question for the Rule 8 implementation plan, not inferred here (see
"Explicitly Left Open").

### Duration (POL-19-002)

**The standard trial duration is thirty (30) consecutive calendar
days, measured from Trial Activation, for every Business, with no
variation by business size, industry, customer category, or
subscription plan.** This corrects Version 1.0 of this document, which
incorrectly described trial duration as "a Plan-level setting" — that
wording is retired; POL-19-002 fixes a single flat duration for all
plans.

Low business activity does not automatically extend the trial. No
future extension mechanism exists without a separate approved policy.

### Expiry (POL-19-003)

On trial completion, the business enters a **Read-Only** state,
described in governance as `Trial Completed`. This corrects Version
1.0 of this document, which stated that "the Business is never placed
in a blanket read-only mode" — that clause is retired; POL-19-003
explicitly approves Read-Only Preservation as the trial-expiry model.
Precisely because it is a *preservation* model rather than a
restriction model, the following remain true and unchanged by this
correction:

- Trial completion never implies account deletion, loss of ownership,
  loss of historical records, or loss of trust.
- Owners may continue to sign in, view dashboards, review historical
  reports, view Business Worth, review inventory history, and review
  historical transactions.
- Owners may not continue operational activities that create new
  business records (illustrative, non-exhaustive per POL-19-003: new
  sales, purchases, stock receipt, inventory adjustment, expense
  recording — the exact restricted-operations list is Module #19
  engineering-implementation work, not fixed here).
- Historical business insights, including Business Worth, remain fully
  visible after expiry.

---

## Subscription Lifecycle

*Derived from POL-19-004 (Grace Period), POL-19-005 (Subscription State
Model), POL-19-006 (Conversion), POL-19-007 (Recovery), POL-19-008
(Notification).*

### Grace Period (POL-19-004)

Applies only to a business transitioning **out of an Active
Subscription** — trial completion does not qualify for Grace Period.
**Duration: seven (7) consecutive calendar days.** During the Grace
Period, the business retains **full operational capability** — this is
a protection against temporary payment interruption, not a second
trial and not a free subscription. Successful renewal returns the
business to Active Subscription; failure to renew before the period
ends transitions the business to Subscription Expired.

### Conversion (POL-19-006)

Conversion is the transition into Active Subscription from Trial
Completed, Grace Period, or Subscription Expired. It is always
voluntary, is never a new business/migration/reset, and preserves
business identity, historical data, Business Worth history, inventory
history, operational history, user relationships, and business
configuration. Effect is immediate on confirmed activation — no
additional onboarding or migration step.

### Recovery (POL-19-007)

Recovery is conversion specifically **from Subscription Expired**,
named separately because it carries an explicit relationship
principle: a business recovering from Subscription Expired is a
**returning partner**, not a new customer, and the platform should
treat it that way. Businesses in Active Subscription or Grace Period
never require "recovery," since operational continuity was never lost
for them. On confirmed recovery, the business returns immediately to
Active Subscription with no re-onboarding, migration, or data
restoration — no historical information is recreated or duplicated.

### Notifications (POL-19-008)

Subscription-related communication (trial activation, trial progress,
trial completion, Grace Period commencement/reminders, subscription
expiry, successful activation, successful recovery — illustrative, not
an implementation requirement) is **business guidance, not sales
pressure.** It must never rely on fear, artificial urgency, or threats
of data loss. This module supplies the business principles that Module
#20's "Subscription Notifications" category (`docs/specs/20-notifications.md`)
will eventually implement — this specification does not itself define
notification timing, delivery channels, or templates; that boundary is
Module #20's, not this module's, per POL-19-008's own cross-reference.

---

## Business State Model

*The six approved Subscription Lifecycle states, per POL-19-005,
verbatim in meaning:*

| State | Meaning |
|---|---|
| **Trial Pending** | Business exists. Trial has not started. Purpose: allow setup before meaningful business activity. |
| **Trial Active** | Trial officially running. Full operational capability. Purpose: provide fair opportunity for Value Realization. |
| **Trial Completed** | Trial has ended. Operational recording suspended. Historical information remains visible; Read-Only access preserved. Purpose: preserve trust while inviting subscription. |
| **Active Subscription** | Paid subscription active. Full operational capability. Purpose: support continuous Business Worth growth. |
| **Grace Period** | Temporary state between subscription interruption and expiry. Full operational capability (POL-19-004). Purpose: continuity during temporary interruption. |
| **Subscription Expired** | No active subscription, no active Grace Period. Historical information remains available; operational recording suspended. Purpose: preserve ownership while allowing future return. |

**Guiding Principle (POL-19-005):** subscription states describe the
*commercial relationship* between the business and Sabush BPT. They do
not describe the existence, ownership, or value of the business itself.
A business continues to exist regardless of its subscription state.

## Technical Status Model

Governance intentionally stops short of defining a technical state
machine, database schema, enum, or field (POL-19-005's own Governance
Notes) — that is this specification's job. The technical `status` field
on `subscriptions/{id}` is a **direct, literal encoding of the six
approved Business State Model values above, and no others:**

```
status: 'trial_pending' | 'trial_active' | 'trial_completed'
       | 'active' | 'grace_period' | 'expired'
```

This corrects Version 1.0 of this document, whose technical enum
(`'trial' | 'active' | 'past_due' | 'suspended' | 'canceled' |
'grandfathered'`) does not map cleanly onto the now-approved six-state
model — `past_due`, `suspended`, and `canceled` have no corresponding
approved business state, and introducing them as distinct technical
statuses without a governance-approved business meaning behind each one
would mean inventing business rules this specification is not
authorized to invent. They are retired. `grandfathered` (legacy-account
handling at migration) is also retired as a *status value* — legacy
migration is handled structurally instead (see Legacy Account
Migration, below), not as a seventh subscription state no governance
document approves.

Transition timing, technical time-zone handling, and the exact
Background Worker cadence that moves a subscription between these six
values are explicitly excluded from POL-19-002/003/004/005 and remain
Module #19 engineering-implementation detail, not fixed by governance
or by this specification.

## State Mapping

Per the Specification Alignment Amendment's Decision 4, this section
introduces the explicit mapping between **Business Lifecycle** states
and **Technical Subscription Status** that Decision 4 required, while
preserving POL-19-005's Separation Principle that the two are
independent concepts.

**The two axes:**

- **Business Lifecycle** (`Active` / `Archived` / `Closed`, per
  POL-19-005's own naming) — describes whether the Business entity
  itself is operating, archived, or closed. This is a Business-domain
  concept (Architecture §3.2 / Module #17's Owner Portfolio surface),
  **not owned by this module** and not redefined by it.
- **Technical Subscription Status** (the six values above) — describes
  the commercial relationship, owned entirely by this module.

**Relationship, as governance actually defines it:** the two are
structurally independent fields that both relate to the same Business
document — a subscription status change must never write to or imply a
Business Lifecycle change, and a Business Lifecycle change must never
be inferred from a subscription status change. This is the entirety of
what POL-19-005's Separation Principle commits to.

**What governance does not yet define, flagged rather than invented:**
POL-19-005 does not specify per-combination behavior (for example,
whether an `Archived` or `Closed` Business's subscription should be
excluded from Background Worker trial/renewal evaluation, or whether a
`Closed` Business can still hold an `Active Subscription` status). No
BDR or POL addresses this. This specification does not invent an
answer. It is recorded here as an open question for a future,
explicitly separate Product Architect decision — most likely as its own
POL-19-009 or a Module #17/#19 joint decision record, not as an
inference made silently during implementation.

---

## Business Rules

1. **Subscription binding is `businessId`, never `uid`.** Fixed and
   non-negotiable for Version 1, per the [Ownership Resolution](./19-subscription-ownership-resolution.md).
   No code path may key a subscription by Owner/Admin identity.
2. **No Owner-level or Portfolio-level subscription.** Each Business's
   subscription is fully independent of every other Business the same
   Owner may hold (POL-19-005's Separation Principle applied across
   shops).
3. **`MAX_SHOPS_PER_OWNER` is untouched by this module.** It remains a
   Module #17 platform rule. This module may, in a *future* version,
   supply it as a read entitlement (`entitlements.business_limit`) that
   Owner Portfolio's existing check consumes — Version 1 does not build
   that wiring.
4. **No null subscription states, ever.** A `Trial Pending` subscription
   record is created for a Business at the moment of Business
   Registration (Architecture §5.2/§13.5) — no feature-gate check
   anywhere in the product ever needs a special case for a missing
   subscription.
5. **Business Worth history is never a subscription "feature."** Core
   Business identity, historical Worth data, and record visibility
   remain available regardless of subscription status — this is
   preserved unchanged by this rewrite and is fully consistent with
   POL-19-003's Read-Only Preservation, which itself only suspends *new*
   operational record creation, never historical visibility.
6. **Trial expiry and Subscription Expired both restrict new
   operational record creation while preserving historical visibility
   (Read-Only Preservation, POL-19-003).** This replaces Version 1.0's
   Business Rule 6 ("restricted features, not full read-only"), which
   the Specification Alignment Amendment's Decision 2 identified as
   directly conflicting with approved governance.
7. **No payment instrument storage.** This module stores subscription
   *state* (`status`, `planId`, `trialActivatedAt`, `trialEndsAt`,
   `renewalDate`, `entitlements`) — never card numbers, mobile-money
   credentials, or any other payment instrument. Payment execution
   lives entirely with the external processor; this module only
   receives its webhook result.
8. **SuperAdmin overrides are audited atomically.** Every SuperAdmin
   plan/status override writes the `subscriptions/{id}` change and a
   platform Audit Log entry (Architecture §9.6) in the same server-side
   transaction — an override with no audit entry must be structurally
   impossible.
9. **Legacy accounts receive an explicit, non-null status at
   migration**, not a special-cased absence. See Legacy Account
   Migration, below.
10. **Business Lifecycle and Technical Subscription Status are
    independent fields; neither may be inferred from or overwrite the
    other** (State Mapping, above).

---

## Engineering Requirements

*Describes implementation expectations. Does not authorize
implementation — see "Product Architect Acceptance."*

### Data Model

```
subscriptions/{subscriptionId}
{
  businessId: string,          // required, immutable after creation
  planId: string,               // references a Plan definition
  status: 'trial_pending' | 'trial_active' | 'trial_completed'
        | 'active' | 'grace_period' | 'expired',
  trialActivatedAt: timestamp | null,   // null until POL-19-001 activation fires
  trialEndsAt: timestamp | null,        // set at activation; trialActivatedAt + 30 days (POL-19-002)
  gracePeriodEndsAt: timestamp | null,  // set on entry to grace_period; +7 days (POL-19-004)
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
  payment-instrument field exists on this document, per Business Rule
  7.
- `trialActivatedAt`/`trialEndsAt` replace Version 1.0's nested
  `trialStatus` object with flat fields, matching the fixed, non-plan-
  dependent duration now approved (POL-19-002) — no per-plan trial
  configuration exists to nest under.

### Plan Definition (minimal, V1)

```
Plan
 |
 +-- Free Trial
 |
 +-- Paid Plan(s)
```

A Plan defines, at minimum:
- `business_limit` — an integer, the future replacement path for
  Module #17's hardcoded `MAX_SHOPS_PER_OWNER` (not wired in V1).
- `features` — a map of feature keys to booleans (e.g., `AI_INSIGHTS`,
  `ADVANCED_REPORTS`, `EXPORTS`). This is the feature-gating source of
  truth every operational domain checks.

Plan *names*, tier count, and pricing remain explicitly out of scope
(see "Explicitly Left Open").

### Restricted-Operations Enforcement

Every operational domain that needs to check "can this Business create
a new record right now" reads the Business's current
`subscriptions/{businessId}.status`. `trial_completed` and `expired`
both restrict *new operational record creation*; `trial_pending`,
`trial_active`, `active`, and `grace_period` all permit it. This is a
single, consistent read path, not a per-domain reimplementation. The
exact enumerated list of "operational record creation" actions this
gate applies to (POL-19-003's illustrative list: sales, purchases,
stock receipt, inventory adjustment, expenses) is Module #19
implementation-planning work, not fixed by this specification.

### Legacy Account Migration

No Business may ever have a null/missing subscription document. Every
existing Business, at migration time, receives an explicit
`subscriptions` record with a real status value from the Technical
Status Model above (most likely `active`, reflecting that existing
Businesses have unrestricted access today) — the exact status chosen,
and any legacy-specific migration flag needed to distinguish a
migrated account from a new one (if any), is implementation-script
detail, not a product decision this specification forces one way. No
code path may special-case a missing subscription document as
equivalent to "no restrictions" or "no access" — Business Rule 4
applies identically to legacy and new Businesses alike.

### Payment Processor Integration Boundary (Not Vendor Selection)

This module defines an integration boundary only:
`Payment Processor → Webhook → Subscription State Update`. The webhook
handler (Architecture §4.12) updates `status`/`renewalDate`/`planId` on
the relevant `businessId`'s subscription document; it does not store
any payment instrument (Business Rule 7). Vendor selection (M-Pesa,
e-Mola, or other) is not decided by this specification — Architecture
§13.5's "M-Pesa/e-Mola priority" is a regional requirement note, not a
vendor commitment.

---

## Integration Requirements

- **Authentication.** Subscription checks resolve against the
  authenticated user's active Business context (`businessId`), the same
  session/auth model already fixed in Architecture §4.6 — no new auth
  mechanism introduced.
- **Business Context.** Reads the Business entity for its Business
  Lifecycle state only to the extent State Mapping (above) requires —
  never writes to it.
- **Future Billing.** Integrates only through the webhook boundary
  (Architecture §4.12); no direct processor SDK calls from the client
  or from this module's own read/write paths.
- **Notifications (Module #20).** Supplies the business principles
  (POL-19-008) behind Module #20's "Subscription Notifications"
  category; does not implement notification delivery itself.
- **SuperAdmin (Architecture §9.4).** Supplies the `subscriptions/{id}`
  collection SuperAdmin reads/overrides and Developer reads
  (read-only); does not redesign that screen's permission model.
- **Plans.** Internal to this module (Engineering Requirements, above)
  — no external Plan-management surface exists in V1.
- **Future Customer Experience Guides (BDR-0004).** A future,
  platform-wide capability that would eventually explain this module's
  approved behavior in customer-facing language. Not implemented,
  scoped, or authorized by this specification — flagged only for
  completeness per BDR-0004's own governance-hierarchy diagram.

---

## Security Considerations

- **Tenant isolation.** A Business's subscription document is readable
  only by that Business's own Admin/Manager (view), plus SuperAdmin/
  Developer (platform-scoped read, per Architecture §9.4's existing,
  unmodified permission model) — never by another Business's Admin,
  regardless of shared Owner.
- **Auditability.** Every SuperAdmin override is logged atomically with
  the state change (Business Rule 8) — no override may succeed without
  its audit entry succeeding in the same transaction.
- **No payment data at rest.** Structurally enforced by the data model
  containing no payment-instrument fields, not merely a convention.
- **Background Worker load.** Trial/Grace Period/renewal evaluation
  runs on the existing generalized Background Worker (Architecture
  §13.5, item 4) on a schedule — no new scheduling mechanism, no Cloud
  Functions, no Blaze-plan dependency.
- **Webhook authenticity.** Per Architecture §4.12, the billing webhook
  handler verifies the request's signature against the processor's
  secret before any subscription-state write — never trusts an
  unverified external call.

---

## Future Extension Points

*Documented, not authorized:*

- Family plans / Owner-level plans spanning multiple Businesses —
  explicitly rejected for V1 (Business Rule 2); would require its own
  Product Architect decision and a specification amendment.
- `MAX_SHOPS_PER_OWNER` becoming a live entitlement read
  (`entitlements.business_limit`) instead of a hardcoded constant —
  direction fixed now (Business Rule 3), not built in V1.
- Full billing lifecycle — invoices, receipts, payment ledger —
  explicitly out of scope for V1, given the standing product-identity
  rule that Sabush BPT does not become an accounting/billing system.
- Customer Experience Guides for the trial/subscription journey
  (BDR-0004) — a future, platform-wide capability, not scoped here.
- A future POL-19-009 or joint Module #17/#19 decision resolving the
  Business-Lifecycle/Subscription-Status interaction question flagged
  in State Mapping, above.

---

## Cross References

**Business Decision Records:** [BDR-0001](./19-subscription-philosophy.md),
[BDR-0002](./19-value-realization-framework.md), [BDR-0003](./19-trial-experience-framework.md),
[BDR-0004](./BDR-0004-customer-communication-architecture.md).
**Operational Policies:** [POL-19-001](./19-pol-001-trial-activation-policy.md),
[POL-19-002](./19-pol-002-trial-duration-policy.md), [POL-19-003](./19-pol-003-trial-expiry-policy.md),
[POL-19-004](./19-pol-004-grace-period-policy.md), [POL-19-005](./19-pol-005-subscription-state-model.md),
[POL-19-006](./19-pol-006-subscription-conversion-policy.md), [POL-19-007](./19-pol-007-subscription-recovery-policy.md),
[POL-19-008](./19-pol-008-subscription-notification-policy.md).
**Governance:** [BDR/Policy Framework](./19-governance-bdr-policy-framework.md),
[Specification Alignment Amendment](./19-specification-alignment-amendment.md).
**Prior resolution:** [Subscription Ownership Resolution](./19-subscription-ownership-resolution.md).
**Related modules:** [Owner Portfolio (#17)](./17-owner-portfolio.md),
[SuperAdmin (#18)](./18-superadmin.md), [Notifications (#20)](./20-notifications.md).

---

## Non-functional Requirements

(See Security Considerations, above, for the full detail — restated
here briefly per the series' standard template.)

- Tenant isolation, auditability, no payment data at rest, and
  Background Worker load are as specified in Security Considerations.

## KPIs

- Zero Businesses with a null/missing subscription document, at any
  time post-migration (Business Rule 4/Legacy Account Migration).
- 100% of SuperAdmin overrides have a matching Audit Log entry
  (Business Rule 8) — structurally guaranteed, not just monitored.
- Time from `trial_active` → `trial_completed` transition being due to
  it actually taking effect (a Background Worker latency metric, exact
  SLA not fixed by this specification).

## Future Enhancements

See Future Extension Points, above — kept as a single section per this
rewrite's structure rather than duplicated under two headings.

## Acceptance Criteria

- [ ] A `Trial Pending` subscription record exists for every new
      Business at the moment of Registration — never a delayed or
      missing record.
- [ ] Trial activation transitions `trial_pending → trial_active` only
      at first meaningful business activity, never at account creation
      (POL-19-001).
- [ ] Trial duration is thirty (30) consecutive calendar days for every
      Business, with no plan-dependent variation (POL-19-002).
- [ ] On trial completion, the Business enters `trial_completed`:
      historical data, Business Worth, Closings, Reports, and Timeline
      remain fully visible; new operational record creation is
      suspended (POL-19-003). This criterion replaces Version 1.0's
      "never full read-only" criterion, which conflicted with approved
      governance.
- [ ] A Grace Period lasts seven (7) consecutive calendar days from
      Active Subscription interruption, with full operational
      capability preserved throughout (POL-19-004).
- [ ] Two Businesses under the same Owner can independently hold
      different subscription statuses with no shared or aggregated
      state between them.
- [ ] Conversion and Recovery both restore Active Subscription
      immediately, with no re-onboarding, migration, or data loss
      (POL-19-006/007).
- [ ] No code path treats a missing subscription document as a valid,
      unhandled-by-design state — legacy accounts included.
- [ ] A SuperAdmin override of a subscription's plan/status cannot be
      persisted without a corresponding platform Audit Log entry in the
      same transaction.
- [ ] No `subscriptions` document, anywhere in the schema, contains a
      payment instrument field.
- [ ] `MAX_SHOPS_PER_OWNER` and Module #17's ownership model are
      unmodified by this module's implementation.
- [ ] No subscription-status write ever modifies a Business Lifecycle
      field, and no Business-Lifecycle write is ever inferred from a
      subscription-status change (State Mapping).

## Explicitly Left Open (Not Decided by This Specification)

Per Product Architect direction, the following remain open and must not
be inferred or decided during implementation without a separate,
explicit Product Architect decision:

1. **Actual plan names and tier structure** (e.g., what "Free,"
   "Starter," "Growth," "Enterprise" concretely include).
2. **Pricing** for any plan.
3. **Payment processor vendor selection** — M-Pesa/e-Mola remain a
   regional requirement, not a vendor commitment.
4. **The precise technical trigger for "meaningful business activity"**
   (POL-19-001) — which write, field, or threshold constitutes trial
   activation is not fixed by governance or by this specification.
5. **The exact enumerated list of restricted operations** on
   `trial_completed`/`expired` status (POL-19-003's list is
   illustrative, not exhaustive).
6. **Legacy account migration mechanics** — the shape is fixed (no null
   states), the exact migration script, timing, and status-value choice
   are not.
7. **The Business-Lifecycle/Subscription-Status interaction question**
   flagged in State Mapping, above — whether an Archived/Closed
   Business's subscription behaves differently, and how.

---

## Product Architect Acceptance

**Accepted.** Scope of this acceptance, as explicitly granted, updated
by this Version 2.0 rewrite per the Specification Alignment Amendment:

1. **Subscription ownership model** — Business-level (`Business →
   Subscription`), not Owner/Portfolio-level. Consistent with, and
   granted alongside, the [Ownership Resolution](./19-subscription-ownership-resolution.md)'s
   own Acceptance. **Unchanged by this rewrite.**
2. **Trial model** — Business-level trial. Every new Business receives
   its own subscription lifecycle at Registration (as `Trial Pending`);
   trial activation and its 30-day duration are governed by
   POL-19-001/POL-19-002, fixed and flat across every plan. **This
   corrects Version 1.0's "Plan-level setting" wording, per the
   Specification Alignment Amendment's Decision 5.**
3. **Expiry behavior** — **Read-Only Preservation model**, per
   POL-19-003. Historical Business Worth, Closings, Timeline, and
   performance information remain accessible regardless of subscription
   status; new operational record creation is suspended once trial or
   subscription is no longer active/in-grace. **This corrects Version
   1.0's "restricted features, never read-only" model (Decision B), per
   the Specification Alignment Amendment's Decision 2 — the two are
   directly contradictory, and Read-Only Preservation, as the later,
   more specific, and now-approved governance document, supersedes the
   earlier wording.**
4. **Version 1 scope** — subscription records, trial lifecycle,
   subscription states, entitlement evaluation, feature gating
   framework, and the future payment-integration boundary are in scope.
   Invoice system, receipt system, payment ledger, and accounting-style
   billing history are explicitly excluded. **Unchanged by this
   rewrite.**
5. **`MAX_SHOPS_PER_OWNER` relationship** — confirmed unchanged at `10`
   as a Module #17 Version 1 platform rule. **Unchanged by this
   rewrite.**
6. **State Mapping** — Business Lifecycle and Technical Subscription
   Status are confirmed as independent fields/concepts, per POL-19-005
   and the Specification Alignment Amendment's Decision 4. **New in
   this rewrite** — Version 1.0 did not address this relationship at
   all.

**Not included in this acceptance:** any source code implementation.
This acceptance clears this specification's business content and
architectural-decision content — it is not, by itself, authorization to
begin implementation. Per Rule 8, implementation still requires its own
affected-files/plan/risks review at the point it's actually assigned.
Lifecycle: **Designed → Accepted.** Not Implemented, Executed, or
Analyzed — no engineering work is authorized by this Acceptance or by
this rewrite.
