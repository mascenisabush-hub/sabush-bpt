Business Decision Record

# BDR-0010 — SuperAdmin Business Directory: Independent Operational, Subscription, and Suspension Dimensions

**Status:** Approved (Business Decision only — no implementation is
authorized by this record; see Part 14).
**Type:** Business Decision Record — a strategic, long-lived decision
about why this capability exists and what boundary it may never cross,
per the category [19-governance-bdr-policy-framework.md](./19-governance-bdr-policy-framework.md)
establishes. Not a Policy and not a Business Domain Specification —
the functional requirements, exact query design, and acceptance
criteria this decision authorizes belong in a subsequent Module #18
specification amendment, not here.
**Location note:** Filed without a module prefix, following
`BDR-0004`, `BDR-0008`, and `BDR-0009`'s precedent — this decision
governs a new capability within Module #18 (SuperAdmin) but is written
to also stand as the platform's general rule against collapsing
independent business-state dimensions into one overloaded status
field, should a future module face the same temptation.
**Depends on:** [ADR-0006 — SuperAdmin V1 Operational Control Plane](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
(the four already-implemented phases this capability extends);
[`18-superadmin.md`](./18-superadmin.md) (§9.3, Businesses/Tenant
Management — the original architecture section this decision narrows
and operationalizes); [`18-superadmin-v1-operational-control-plane-slice.md`](./18-superadmin-v1-operational-control-plane-slice.md)
(Phase B's existing `businessVisibility.ts`/`searchBusinesses` pattern,
reused rather than duplicated — Part 7); [POL-19-005 — Subscription
State Model](./19-pol-005-subscription-state-model.md) (the six
approved subscription-state values this decision reads, never
redefines); a repository investigation into `timelineEvents` and
`logTimelineEvent()`, conducted this session (not yet a standalone
document — its findings are incorporated directly into Part 5 below,
since they are load-bearing for this decision, not incidental).
**Followed by:** a Module #18 specification amendment operationalizing
this decision into functional requirements, exact Firestore query
design, and acceptance criteria, followed by its own Rule 8 Assessment
and Implementation Plan — per Part 14.

---

## 1. The Business Decision

**SuperAdmin will gain a Business Directory: a single, searchable,
filterable, server-side-paginated view of every tenant business on the
platform, showing four independent dimensions of that business's
current state — never one overloaded status field.** The directory is
a monitoring and navigation surface. It answers "what is the state of
the businesses on this platform" and routes an operator to the
existing Business Detail view (already implemented, Phase B/C) to act
on any one of them. It does not itself become a place where those
businesses are managed, edited, or bulk-acted upon.

**The central framing this decision protects:** an operator looking at
one row of the directory must be able to read four separate, honest
answers — is this business operationally active, where is it in its
subscription lifecycle, is it suspended, what plan is it on — never a
single blended label that hides which of those four is actually true.
`Active + Grace Period` is a valid, real, and useful combination.
`Dormant + Active Subscription` is a valid, real, and useful
combination. Collapsing these into one field destroys exactly the
information an operator needs to act correctly.

## 2. Decisions Formally Established

1. **The Business Directory is approved as SuperAdmin's next
   capability**, extending the already-implemented, already-deployed
   ADR-0006 Operational Control Plane — not a new module, not a
   redesign of anything already shipped.
2. **Four dimensions, kept strictly independent, never merged:**
   Operational Activity, Subscription State, Suspension, Plan. See
   Part 3.
3. **Operational Activity uses exactly four states:** `New`, `Active`,
   `Inactive`, `Dormant`. No fifth state, no scoring, no
   customer-health blend. See Part 4.
4. **Initial thresholds are explicitly provisional policy hypotheses,
   not empirically validated universal SaaS values** — grounded in the
   expected operating cadence of the SME businesses this platform
   serves, not generic industry convention. See Part 4 and Part 13.
5. **`timelineEvents` is the sole authoritative source of operational
   activity.** No login activity, no SuperAdmin-side activity, no
   subscription event, no administrative event may substitute for it.
   See Part 5.
6. **`lastActivityAt` must be maintained through a trusted server-side
   mechanism — not a plain client-side write inside the existing
   `logTimelineEvent()` function.** This is a correction to an earlier,
   now-abandoned assumption, not a refinement of it. See Part 5.
7. **A failure to update `lastActivityAt` must never block, fail, or
   invalidate the underlying business action it's attached to.** See
   Part 6.
8. **V1 scope is deliberately minimal**, per Part 7 and Part 8 — a
   directory, not a dashboard.

## 3. The Four Independent Dimensions

| Dimension | Values | Source |
|---|---|---|
| Operational Activity | `New` / `Active` / `Inactive` / `Dormant` | Derived from `timelineEvents`, via the mechanism Part 5 requires |
| Subscription State | `Trial Pending` / `Trial Active` / `Trial Completed` / `Active` / `Grace Period` / `Expired` | `subscriptions/{businessId}.status` — the existing, POL-19-005-approved six-value enum. This decision reads this field; it does not redefine, extend, or reinterpret it. |
| Suspension | `Active` / `Suspended` | `businesses/{businessId}.suspended` — the existing, ADR-0006-Phase-C-implemented boolean. This decision reads this field; it does not change its meaning or its write path. |
| Plan | Current subscription plan identifier | `subscriptions/{businessId}` — existing field, read-only here |

**No field, database or UI, may combine these into a single value**
(for example, a `businessStatus` string containing something like
`"Suspended Dormant Trial"`). The Business Directory's UI may display
multiple badges side by side in one row — that is a presentation
choice, not a data-model one. The underlying concepts remain four
separate, independently queryable facts, always.

## 4. Operational Activity Model

**States:** `New`, `Active`, `Inactive`, `Dormant` — exactly these
four, no more.

**New:** a business is `New` for the first **30 calendar days** from
its `createdAt`. `New` is a statement about business age, not about
activity level — a brand-new business that is already highly active
still shows as `New` until the 30-day window closes. This exists
specifically to prevent a business that hasn't yet logged its first
`timelineEvent` (still onboarding, hasn't done its first stock count)
from being misclassified as `Dormant` the moment it's created.

**Active:** for a business outside its `New` window, `lastActivityAt`
is within the last **14 days**.

**Inactive:** for a business outside its `New` window, no activity for
**15–45 days**.

**Dormant:** for a business outside its `New` window, no activity for
**more than 45 days**.

**These specific numbers — 14 and 45 — are initial policy values, a
product hypothesis grounded in the expected operating cadence of the
SME businesses this platform serves (notably: Monthly Closing is a
normal, expected, once-a-month rhythm — a 14-day Active window and a
45-day Dormant cutoff are chosen specifically to comfortably span one
full accounting cycle without misclassifying a healthy, monthly-cadence
business as Inactive or Dormant mid-cycle). They are explicitly NOT
claimed as empirically validated, industry-standard, or derived from
observed SABUSH BPT usage data — none exists yet at the time of this
decision. See Part 13 for how and when they may be revised.

## 5. Activity Source and the `lastActivityAt` Requirement — the Necessary Correction

**Source:** operational activity is derived exclusively from
`timelineEvents`, the business-scoped, append-only activity log
already implemented across Phase 1 of this platform. A repository
investigation this session confirmed all fourteen client-triggered
activity types this collection captures (stock, expenses, withdrawals,
quebras, products, closings, initial stock, price changes, period
reopening, profile updates, report exports) represent genuine business
operation, not administrative noise, and that the underlying logging
architecture already exists and should be reused, not duplicated.

**The correction this BDR makes, explicit and binding:** an earlier
working assumption — that `lastActivityAt` could simply be written
from inside the existing, shared, client-side `logTimelineEvent()`
function via a plain Firestore `updateDoc` to
`businesses/{businessId}` — is **rejected**, not adopted. The same
investigation established why: `businesses/{businessId}`'s current
`firestore.rules` update rule is Owner-only; Staff, who generate a
substantial share of real business activity (stock entries, expenses,
quebras are all staff-permitted actions), have no write path to that
document at all today. A naive client-side write would silently
succeed for Owner-triggered activity and silently fail for
Staff-triggered activity (matching this codebase's existing
never-block-the-real-action error-handling convention) — meaning any
business run day-to-day by staff would appear permanently `Dormant` in
the directory. This is exactly the class of quiet, hard-to-detect
correctness defect this platform has already encountered once this
year in a different `firestore.rules` context, and this decision
exists in part to prevent a second occurrence of the same class of
mistake. Separately, a client-supplied timestamp is the caller's local
device clock — not server-authoritative, not tamper-resistant, not an
input this platform should trust for something a platform operator
will make judgments from.

**The approved requirement, binding on whatever implementation follows
this decision:**

> Every qualifying business activity must result in a **trusted
> server-side** update of `businesses/{businessId}.lastActivityAt`,
> regardless of whether the underlying activity was performed by an
> Owner or a Staff member.

The specific mechanism (a new small privileged endpoint; an additive,
narrowly-scoped, monotonicity-guarded `firestore.rules` clause; or
another design not yet considered) is **not fixed by this decision** —
that belongs to the Module #18 specification amendment and its own
Rule 8 Assessment, per Part 14. What this decision does fix, as
binding constraints on whichever mechanism is chosen:

- Must use a trusted, server-side-originated timestamp — never a
  client-supplied value.
- Must work identically for Owner-triggered and Staff-triggered
  activity — no permission-tier gap.
- Must never require granting Staff broader direct write access to
  `businesses/{businessId}` than they have today, beyond whatever
  narrow, field-scoped mechanism the chosen design specifically
  introduces for this one purpose.
- Must result in a field that supports ordinary Firestore server-side
  filtering and sorting — no per-business subquery fan-out, no
  client-side scan-and-filter of the whole business population.

## 6. Failure and Resilience Requirement

Updating `lastActivityAt` must never block, fail, or invalidate the
underlying business action it is attached to. If the update mechanism
fails for any reason, the original action (recording stock, an
expense, a closing, whatever it was) remains fully successful; the
failure is observable through whatever engineering logging mechanism
the eventual implementation specifies; the directory may show
temporarily stale activity information until the next successful
update. This is not a new philosophy — it matches the existing,
already-proven resilience pattern this codebase already applies to
`logTimelineEvent()` itself and to every audit-write-after-success
pattern in the Operational Control Plane's four already-shipped
phases. No transactional coupling between a real business action and
this metadata update is introduced.

## 7. V1 Directory Scope

**Columns:** business name; business ID; Operational Activity badge;
last activity, both as a bucketed state and as "X days ago"; Subscription
State; Suspension state; Plan; owner name/email; created date.

**Filters:** Operational Activity, Subscription State, and Suspension
— each independently combinable, all server-side. No loading the full
business population into the browser and filtering client-side, at
any scale.

**Search:** business name and business ID. Reuses Phase B's existing
`searchBusinesses` pattern (`server/businessVisibility.ts`) where
architecturally appropriate, rather than a parallel search mechanism
invented for this feature alone.

**Sorting:** exactly three options — last activity, created date,
name. Not an open-ended, arbitrary-field sort framework.

**Pagination:** the established 100-row cap/pagination precedent from
Phase D (`auditLogQuery.ts`) applies as the starting model; the exact
Firestore pagination mechanism is a specification-level, not a
decision-level, question.

**Navigation:** selecting a business routes to the existing Business
Detail view (Phase B/C, already implemented and deployed). The
directory itself does not duplicate or replace that surface.

## 8. Explicitly Out of Scope for V1

Bulk actions of any kind; inline business editing; charts or analytics
visualizations; mass suspension or mass reactivation; deletion;
subscription mutation; plan mutation; any administrative action beyond
what Phases A–D already authorize via the existing Business Detail
view. The Business Directory is a visibility and navigation surface —
it grants no new mutation capability whatsoever. Every write path an
operator can reach from this feature already exists, unchanged, from
an earlier phase.

## 9. Business Worth / Platform Alignment

This capability gives SuperAdmin operators a single, honest view of
the tenant base's actual condition — able to answer, with real
server-side queries rather than manual investigation: which businesses
are operationally active; which are drifting toward inactivity; which
have gone dormant; which are in trial and how they're behaving; which
are paying and active; which are in grace period and may need
attention; which are suspended. This directly supports the platform's
own operational health without inventing a second product inside
SABUSH BPT — it observes what already exists (activity, subscription
state, suspension state), it does not compute a new synthetic score,
predict churn, or recommend interventions. Those remain explicitly
future, separately-authorized capabilities, not implied by this
decision.

## 10. Alternatives Considered and Rejected

- **A single overloaded `businessStatus` field** combining activity,
  subscription, and suspension into one string or enum — rejected;
  this is the exact anti-pattern Part 1 and Part 3 exist to prevent.
- **Writing `lastActivityAt` from the existing client-side
  `logTimelineEvent()` function** — rejected; see Part 5's full
  reasoning. This was the original working assumption and is not
  merely refined by this decision, it is abandoned.
- **A periodic background-worker recompute job** (matching the
  existing ADR-0003 job-registration pattern) as the mechanism for
  `lastActivityAt` — not rejected outright, but not adopted as the
  presumed mechanism either; it remains one candidate the follow-on
  specification may evaluate against the server-side-endpoint
  alternative, per Part 5's explicit deferral of the exact mechanism.
- **Client-side filtering of a fully-loaded business list** — rejected
  as inconsistent with this platform's own scale expectations and the
  precedent Phase D already established for server-side query design.
- **Treating "Inactive" and "Dormant" as one bucket** — considered,
  rejected in favor of the four-state model, on the reasoning that the
  distinction between "starting to go quiet" and "genuinely gone
  quiet" is itself operationally useful information, not redundant
  granularity.

## 11. Consequences

- SuperAdmin gains a genuine platform-health view for the first time —
  previously, understanding tenant-base activity required manual,
  business-by-business investigation via Phase B's lookup tool.
- A new, narrow write-path requirement is introduced into the platform
  (Part 5) — the first time an Operational Control Plane phase has
  needed anything beyond a pure read extension (Phase D) or an
  already-precedented mutation pattern (Phase C). This is a real,
  acknowledged increase in implementation complexity relative to the
  prior four phases, not hidden by this decision.
- The four-dimension model, once built, becomes the template any
  future SuperAdmin capability needing to express business state must
  follow — this decision is written to bind that precedent explicitly,
  not merely to solve this one feature.

## 12. Risks

- **Threshold miscalibration** — 14/45 days may prove wrong once real
  usage data exists; mitigated by Part 13's explicit revision policy,
  not by claiming false precision now.
- **`lastActivityAt` mechanism risk** — whichever mechanism the
  follow-on specification chooses touches either `firestore.rules`
  again (a file with two real, production-discovered defects already
  this year) or introduces a new privileged server endpoint; either
  path requires the same rigorous, real-Firestore-engine verification
  discipline every prior Operational Control Plane phase has needed,
  not assumed to be lower-risk because this feature is "just a
  directory."
- **Scope creep toward analytics** — the strongest temptation this
  feature invites, given how naturally "which businesses need
  attention" slides toward scoring, prediction, and recommendation.
  Part 8's explicit out-of-scope list exists specifically to name and
  resist this before implementation begins, not after.

## 13. Threshold Revision Policy

The 14-day (Active) and 45-day (Dormant) thresholds established in
Part 4 are explicitly provisional. They may be revised by a future,
explicitly-authorized amendment to this BDR once real SABUSH BPT usage
data exists to check them against — specifically, once there is
enough real `timelineEvents` history across a meaningful number of
real tenant businesses to observe actual activity cadence, rather than
reasoning from expected cadence alone. Until such an amendment is
made, these values remain the governing definition, and no
implementation may silently substitute different numbers based on an
individual engineer's judgment.

## 14. Governance and Implementation Boundary

**This BDR authorizes the business decision only.** It does not
authorize, and no part of it should be read as authorizing:

- any change to `src/`, `apps/tenant/`, or `apps/superadmin/`
- any change to `firestore.rules`
- any change to `firestore.indexes.json`
- any new server endpoint or route
- any test, of any kind
- any deployment, of any kind

**The governing sequence from here, unchanged from this platform's
established discipline:** Business Philosophy → this BDR → a Policy
record, if the follow-on specification determines one is required
(for instance, if the exact `lastActivityAt` mechanism raises a
question this BDR's constraints don't fully settle) → a Module #18
specification amendment operationalizing this decision into functional
requirements and acceptance criteria → a Rule 8 Assessment → an
Implementation Plan → implementation. **Rule 8 is not skipped.** No
implementation prompt should be produced until this BDR is reviewed
and the subsequent specification and Rule 8 gates are separately,
explicitly completed.

## 15. What This Decision Does Not Do

- Does not authorize any implementation work — see Part 14.
- Does not redefine, reinterpret, or extend the six POL-19-005
  subscription-state values — this decision reads that model, it does
  not touch it.
- Does not change the meaning or write path of
  `businesses/{businessId}.suspended` — ADR-0006 Phase C's existing
  behavior is unchanged.
- Does not fix the exact `lastActivityAt` implementation mechanism —
  see Part 5's explicit deferral to the follow-on specification.
- Does not introduce customer-health scoring, churn prediction, or any
  AI-driven recommendation — see Part 8.
- Does not introduce any bulk-administration capability — see Part 8.
- Does not claim the 14/45-day thresholds are validated by real usage
  data — see Part 13.
- Does not redesign any part of SuperAdmin's existing, already-shipped
  architecture merely because this new capability exists.
