Decision Record

# Subscription Ownership Binding — Resolution

**Status:** Designed — recorded as Product Architect direction, not yet
Accepted. Acceptance is a separate, explicit step per the Module #19 BDS
review process (see [`19-subscriptions.md`](./19-subscriptions.md)).
**Resolves:** A genuine source-of-truth contradiction between four
Architecture sections, discovered during Module #19 readiness analysis.
**Architecture references:** [Section 3.13](../architecture/03-domain-architecture.md)
(Subscriptions domain — left binding "open" as a Section 9 decision),
[Section 6.2](../architecture/06-user-architecture.md) (Admin role — states
"An admin's Subscription... attaches to them"), [Section 9.4](../architecture/09-superadmin-architecture.md)
(SuperAdmin Subscriptions & Billing screen — states binding is resolved as
`businessId`-keyed), [Section 13.5](../architecture/13-development-strategy.md)
(Development Strategy Phase 1 — still describes the binding as an open
item for Module #19 to resolve).

---

## The Contradiction

| Source | Position |
|---|---|
| §3.13 | Explicitly open: "Attaches to a Business or owning User (exact binding is a Section 9 design decision)" |
| §6.2 | States plainly: "An admin's Subscription (4.12) attaches to them" — i.e., User-level |
| §9.4 | States plainly: "Section 9 resolves it: keyed by `businessId`" — i.e., Business-level |
| §13.5 | Still lists the binding as something "resolve it here" implies is pending, at Module #19's build time |

§6.2 and §9.4 directly contradict each other. §3.13 and §13.5 both defer
to "Section 9," but §9.4's resolution was never propagated back into
§3.13, §6.2, or §13.5, leaving the documents internally inconsistent —
exactly the kind of contradiction this series exists to catch rather
than silently resolve in one direction while implementation reads
another (per `docs/specs/README.md`'s own closing note on this
discipline).

## Resolution

**Subscription ownership is Business-level (`businessId`), for Version 1,
with no exception.**

- A subscription record attaches to a Business (`subscriptions/{id}` with
  a `businessId` field), never to an Owner/Admin `uid`.
- Each Business has its own independent subscription state. An Owner with
  multiple Businesses (Module #17, Owner Portfolio) may have different
  plans/trial/active/expired states across those Businesses.
- §9.4's resolution stands as authoritative and is hereby confirmed as
  the Version 1 direction; §3.13, §6.2, and §13.5's conflicting or
  stale wording is superseded by this record.
- **Owner Portfolio ownership does not imply subscription ownership.**
  Module #17 (Owner Portfolio) remains an ownership/navigation layer only
  — it does not gain, and must not be read as implying, any subscription
  aggregation capability. No "family plan" or Owner-level subscription
  exists in Version 1 (see Decision Gate 2 below).

### Reasoning

- Sabush BPT's financial identity is the Business tenant, not the Owner
  (product identity, `SABUSH_BPT_ChatGPT_Project_Onboarding.md` §1; echoed
  in Architecture §3.13's own "Worth-First scope test").
- Business Worth, Capital Invested, Embedded Profit, Inventory Value, and
  Closing Integrity all belong to Business, never to Owner/Admin.
- Module #17 (Owner Portfolio) explicitly preserves independent
  Businesses and rejects cross-Business aggregation. A Business-level
  subscription is the only binding consistent with that acceptance.
- A subscription controls access to Business capabilities — it is a
  gate on the Business, not a commercial relationship with the Owner as
  a person.
- Independent Businesses owned by the same Owner may legitimately have
  different commercial states (e.g., a new second shop still on Trial
  while the first is on a paid plan).

### Decision Gate 2 — Portfolio Subscription: Explicitly Rejected for V1

No Owner-level or Portfolio-level subscription spanning multiple
Businesses exists in Version 1. This is a deliberate rejection, not an
oversight:

```
Rejected:

Owner
 |
Portfolio Subscription
 |
Multiple Businesses
```

Coupling Module #19 to Module #17's ownership layer this way would
create exactly the cross-Business aggregation Module #17's Acceptance
explicitly rejected. Family plans, enterprise groups, or multi-business
discounts are named as *future* commercial models only — they do not
enter Module #19 Version 1, and would require their own Product
Architect decision and BDS amendment if pursued later.

### Decision Gate 3 — `MAX_SHOPS_PER_OWNER`: Kept Separate

`MAX_SHOPS_PER_OWNER = 10` remains a Version 1 **Owner Portfolio**
platform rule (Module #17), unrelated to and unmodified by this
resolution. It is not removed, renamed, or touched by Module #19 today.

Module #19 may, in a future version, supply this limit as a subscription
entitlement (e.g., `entitlements.business_limit`) that Owner Portfolio
reads instead of the hardcoded constant. The direction of that future
dependency is fixed now, to prevent it being built backwards later:

```
Correct future direction:
  Subscription entitlement → Owner Portfolio limit check

Rejected direction:
  Subscription module modifies ownership model
```

Module #19 must never become the module that changes how ownership
itself works — it may only supply a number that an unchanged Owner
Portfolio check reads.

## Confirmed, Not Reopened

- `businessId` keying (§9.4) — confirmed, this record's core resolution.
- Owner Portfolio (Module #17) — **no impact.** No `OwnershipLink`
  changes, no ownership-model changes, no new schema on that module.
- Financial tenant relationship — Business, consistent with every prior
  module in this series.

## What This Record Does Not Decide

Left open, intentionally, for the Module #19 BDS itself:

- Actual plan names/tier structure.
- Pricing.
- Payment processor vendor selection (M-Pesa/e-Mola remain a *regional
  requirement* per Architecture §13.5, not a vendor commitment).
- Legacy/pre-launch account migration mechanics (the *shape* of the
  decision — no null subscription states — is fixed in the BDS; exact
  migration script/timing is not).

## Lifecycle

**Designed.** This record documents Product Architect direction as
communicated for Module #19 BDS drafting. It becomes **Accepted** only
through the same explicit acceptance step every other module in this
series has used (see Module #17's own "Product Architect Acceptance"
section for the pattern) — not by virtue of being written down here.

No `docs/architecture/*` file has been modified by this record. §3.13,
§6.2, and §13.5's literal text remains as originally written; this
record is the authoritative cross-reference that supersedes their
conflicting/stale wording for Module #19 purposes, exactly as §9.4
itself already claimed to (but never got cross-referenced for) with
respect to §7.4's keying question. A follow-up documentation task —
updating §3.13/§6.2/§13.5's own prose to cite this record, or to fold
its resolution directly into the Architecture document — is a
`docs/architecture/*` edit and is therefore explicitly **not** performed
here, per standing engineering discipline (no Architecture-file edits
without separate, explicit instruction to touch that specific file).
Flagged as a deferred follow-up, not executed.
