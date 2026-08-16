Business Decision Record

# BDR-0011 — SuperAdmin Subscription Operations: Legitimate Observation and Intervention Boundaries

**Status:** Approved (investigation and framing only — see Part 13).
Does not authorize implementation. Does not select among the four
outcomes Part 13 names (A–D) — that selection remains a separate,
subsequent Product Architect decision.
**Type:** Business Decision Record — a strategic decision about
whether and how SuperAdmin may observe or intervene in
business-critical subscription state, per the category
[19-governance-bdr-policy-framework.md](./19-governance-bdr-policy-framework.md)
establishes.
**Depends on:** [BDR-0010 — SuperAdmin Business Directory](./BDR-0010-superadmin-business-directory.md)
(the capability that surfaced this question — Business Directory
created visibility into subscription state; this record investigates
whether and how that visibility should extend into intervention);
[ADR-0005 — SuperAdmin Payment Operations Boundary](../adr/ADR-0005-superadmin-payment-operations-boundary.md)
(the existing, narrower capability this record must not silently
duplicate or blur); [POL-19-005 — Subscription State Model](./19-pol-005-subscription-state-model.md);
[POL-19-002 — Trial Duration Policy](./19-pol-002-trial-duration-policy.md)
(which already, explicitly, anticipates this exact question — see
Part 1); [`19-subscriptions.md`](./19-subscriptions.md) (the governing
Module #19 specification, particularly its own "Explicitly Left Open"
section, item 7); `server/subscriptionEngine.ts` and
`server/paymentConfirmation.ts` (the actual, current mechanics this
record investigates before proposing anything).
**Governing challenge, stated explicitly so it is not silently
dropped:** an engineering inconvenience (no server-side lever exists
for the case where manual Firestore intervention is currently the only
option) is **not** by itself a justification for building an override
capability. This record's job is to determine whether a **legitimate
platform operation** requires privileged intervention the current
product cannot perform safely — not to formalize a workaround into a
feature.

---

## 1. The Problem — Investigated, Not Assumed

**What currently exists, confirmed by direct inspection of the actual
committed code, not recalled from memory:**

Subscription state changes through exactly **two event types**,
`payment_success` and `payment_reversal`, applied through a closed,
enumerated set of **seven governed transitions**
(`computeSubscriptionTransition()`, `server/subscriptionEngine.ts`) —
every other combination of current-status and event-type is an
explicit, deliberate no-op, never a guess. There is no eighth case, no
catch-all, no default transition.

**Payment Operations (ADR-0005) is narrower than it might appear.**
`confirmPayment()`/`rejectPayment()` (`server/paymentConfirmation.ts`)
operate exclusively on an **already-existing** `payments/{paymentId}`
document — one the tenant's own Owner created themselves (`firestore.rules`:
`payments` creation is Owner-only, always starts `pending`). There is
no path from Payment Operations to a subscription state change **that
does not begin with a real, tenant-submitted payment record.**

The one break-glass mechanism this repository already has
(`server/scripts/confirmPayment.ts`) is **not** an override mechanism —
confirmed by reading it directly. It is a CLI-accessible wrapper around
the exact same `confirmPayment()`/`rejectPayment()` functions, subject
to the exact same "a real payment document must already exist"
constraint. It changes *who* can reach the capability, not *what* the
capability can do.

**The consequence, stated plainly:** if a business's subscription state
needs correction for any reason **other than** "there is a pending
payment to confirm or reject" — a payment received through a channel
that never created a `payments` document; a payment confirmed in
error; a technical fault in an automated sweep; a legitimate,
case-by-case business reason to extend a trial — **there is currently
no sanctioned mechanism in this codebase to address it at all.** The
only path available today is an unaudited, untested, ungoverned manual
Firestore write via the Admin SDK, entirely outside every discipline
this project has otherwise held.

**This gap was already anticipated, in writing, before this BDR was
drafted.** `docs/specs/19-subscriptions.md`, under POL-19-002 (Trial
Duration): *"Low business activity does not automatically extend the
trial. No future extension mechanism exists without a separate approved
policy."* And that same specification's own "Explicitly Left Open"
section, item 7: whether an Archived/Closed Business's subscription
behaves differently, and how — a related, still-unresolved question
this record must not silently answer in passing.

**This BDR is not inventing a concern. It is fulfilling a prerequisite
Module #19's own governance already required before any such mechanism
could exist.**

## 2. How Often, and What Happens Today — Honestly Unquantified

**No operational data exists yet** to say how often this situation
arises — the platform is early-stage, and no incident log or support
ticket history was available to this investigation. This is stated
explicitly rather than estimated with false confidence. What can be
said with confidence: the *mechanism* gap is structural and total (§1),
independent of frequency — even a single legitimate occurrence has no
sanctioned path today.

**Decision point, not resolved here:** whether to authorize a narrow
intervention capability now, on the strength of the structural gap
alone, or to wait for real operational incidents to accumulate before
committing engineering effort. This BDR takes no position on timing —
only on what the capability, if and when built, must and must not do.

## 3. What SuperAdmin Should Be Allowed to Observe

Lower-risk, and partially already precedented:

- **View current subscription state** — already effectively available
  today via Business Directory's `subscriptionStatusCache` (BDR-0010)
  and via Business Detail's existing read of the canonical
  `subscriptions/{businessId}` document (Phase B). No new capability
  needed for this alone.
- **View payment history for a business** — Business Detail already
  shows recent payments (Phase B, BR-5's curated response). Whether
  this needs to become richer (a fuller ledger view, not just recent
  entries) is a specification-level question, not a business-decision
  one — observation-only capabilities carry materially lower risk than
  anything that writes.

**This BDR proposes no new observation capability is a business
decision at all** — the existing read surfaces already largely cover
this need. If a gap remains, it belongs in the specification stage,
not this record.

## 4. What SuperAdmin Should Be Allowed to Correct or Intervene — the Genuine Question

This record deliberately does **not** answer this with a list of CRUD
verbs. Instead, it draws one structural distinction that should govern
whatever specification follows — stated with the precision the
Product Architect's own review of this record established:

**A correction** means: an existing subscription state is believed to
be wrong; there is sufficient evidence to establish the correct state;
and the correction returns the business to the existing governed
subscription model — it re-enters `computeSubscriptionTransition()`'s
own logic through a legitimate event, rather than setting a field
directly.

**An override** means: a privileged operator intentionally causes a
subscription state or capability that would not otherwise occur under
Module #19's normal, governed rules — a fundamentally different power,
not a larger version of the same one.

Elaborating the correction case with a concrete example: a payment was
genuinely received (verifiable, evidenced) but no `payments` document
exists to drive the governed transition. The action available should
be narrowly shaped to **re-enter the governed transition model**
(create the missing evidence, then let the existing, unmodified
`applyLifecycleEvent()` do exactly what it already does for a real
payment) — not a parallel, unaudited status-field write.

**Recommendation, not yet a decision:** if this capability proceeds,
it should be scoped first to **corrections that re-enter the governed
model** — closing the gap §1 identified (payment received without a
`payments` document) — before any broader override capability is even
specified. This keeps the governed transition model as the single
source of behavioral truth (§7) rather than introducing a second,
parallel decision-maker.

**Explicitly listed as requiring their own, separate, later decision —
not resolved here:**
- Trial extension for a case-by-case business reason (POL-19-002
  itself already requires "a separate approved policy" for this —
  this BDR does not constitute that policy).
- Cancellation.
- Any manual application of a subscription plan/state with no
  underlying evidence at all (the purest form of "override," and the
  one this record is most cautious about).
- Reversing a prior SuperAdmin intervention (a second-order question
  that only becomes real once a first intervention capability exists).

## 5. What SuperAdmin Must Not Be Allowed to Do

Stated as hard boundaries, regardless of what the eventual
specification decides on §4:

- **Must never write directly to `subscriptions/{businessId}.status`**
  bypassing `computeSubscriptionTransition()`'s own governed logic —
  any intervention must produce its effect *through* that existing,
  unmodified function, not around it. This preserves POL-19-005's
  state model as the single behavioral authority, not a second one
  layered on top.
- **Must never modify plan structure, pricing, or entitlements** —
  those remain explicitly out of scope for Module #19 V1 itself
  (`19-subscriptions.md`'s own "Explicitly Left Open," items 1–2), and
  a SuperAdmin intervention capability cannot retroactively grant
  itself scope the underlying module was never given.
- **Must never act without a justification, logged before the action
  executes** — matching the exact precedent Business Suspension (Phase
  C) and Business Visibility (Phase B) already established, not a
  weaker standard for something touching business-critical financial
  state.
- **Must never conflate with Payment Operations** — see §6.
- **Must never introduce a second denormalized or cached subscription
  value with independent write authority** — `subscriptions/{businessId}.status`
  remains the sole canonical field (§7); `subscriptionStatusCache`
  (BDR-0010) remains explicitly non-canonical, a read-only mirror, and
  this record does not change that.

## 6. Relationship to Payment Operations — Explicit Separation

**Payment confirmation/rejection and subscription intervention are not
the same capability, and must not be blurred into one.**

Payment Operations (ADR-0005) answers: *"Does this specific,
tenant-submitted payment get confirmed or rejected?"* — scoped to one
document, one binary outcome, always starting from a real payment the
tenant created.

Whatever this BDR's eventual specification authorizes answers a
different question: *"Is this business's subscription state correct,
and if not, how does it get corrected?"* — a broader question that may
have no `payments` document in play at all.

**The boundary, stated as a rule:** if a real `payments/{paymentId}`
document exists for the situation, Payment Operations is the correct,
already-built path — nothing here should duplicate it. Whatever this
record authorizes exists specifically for the cases Payment Operations
structurally cannot reach.

## 7. Source of Truth — Restated, Not Redefined

`subscriptions/{businessId}.status`, written exclusively by
`computeSubscriptionTransition()`'s governed logic, remains the single
canonical subscription value — unchanged by this record. Any
capability this BDR eventually authorizes must produce its effect by
driving that same function through a legitimate event (§4's
"correction" framing), not by introducing a second write path with
independent authority.

`businesses/{businessId}.subscriptionStatusCache` (BDR-0010) remains
exactly what it already is: a read-only, non-canonical display/filter
convenience, refreshed automatically whenever the canonical field
changes. This record does not add a third value, a fourth cache, or
any new denormalization.

## 8. Mandatory Audit Trail

Whatever this BDR's specification stage authorizes must answer, for
every intervention, without exception: **who** changed it, **what**
the state was before, **what** it is now, **why** (a required
justification, not optional), **when**, and **what evidence**
justified the action. This is not a new audit architecture — it reuses
`platform_audit_log` (the same collection, the same
`writeAuditLogEntry()` primitive) exactly as every prior SuperAdmin
phase already has, following the "one audit system, never a second"
discipline POL-18-001 and BDR-0010 already established for a different
capability. A new `actionType` value (e.g.
`subscription.intervention.applied`) would be a specification-level
addition to the existing, already-open string enum — not a new system.

## 9. Owner Experience and Module #19 Alignment

Any intervention this record's specification stage eventually
authorizes must not silently reinterpret an already-approved Module #19
policy — the full governing set, named explicitly rather than
partially: **POL-19-001** (Trial Activation), **POL-19-002** (Trial
Duration), **POL-19-003** (Trial Expiry), **POL-19-004** (Grace
Period), and **POL-19-005** (Subscription State). None of these five
are weakened, reinterpreted, or made discretionary by this record.
Concretely: an intervention is not license to treat POL-19-001's
activation trigger, POL-19-002's flat, no-exceptions trial duration,
POL-19-003's Read-Only Preservation model, POL-19-004's grace-period
duration and meaning, or POL-19-005's state definitions as negotiable
on a per-case basis without their own explicit amendment. A correction
closes a factual gap (§4); it does not become a backdoor for quietly
overriding policy the platform has already committed to. Where a real
business need genuinely requires departing from an existing policy
(trial extension is the named example, per POL-19-002's own text),
that departure needs its own explicit policy amendment — not a
SuperAdmin button that routes around it silently. **This BDR's own
role is precisely this: define what happens when the platform's
governed state is believed to be incorrect — not to define, weaken, or
substitute for what the governed state itself should be.**

## 10. Alternatives Considered

- **Do nothing; keep manual Firestore edits as the only path** —
  rejected as the status quo this record exists to move past, not
  because manual editing is unacceptable in principle, but because it
  is unaudited, untested, and outside every governance discipline this
  project has otherwise held for anything touching business-critical
  state.
- **Build a general-purpose subscription override screen immediately**
  — rejected at this stage; conflates "correction" with "override"
  (§4) without first establishing whether the broader capability is
  actually needed, exactly the trap this record's own governing
  challenge warns against.
- **Extend Payment Operations' existing scope to cover these cases** —
  rejected; would blur ADR-0005's own clean boundary (a real payment
  document in, a binary outcome out) into something structurally
  different, rather than keeping the two capabilities separate per §6.

## 11. Consequences

- If this record's recommendation (§4) is accepted, the next
  specification stage has a narrower, better-bounded starting point
  than "build subscription overrides" — specifically, closing the
  evidenced-payment-without-a-document gap first, deferring the
  broader override question to its own future decision.
- The genuinely hard question — whether arbitrary, non-evidenced
  override should ever exist — remains explicitly open, not decided by
  omission. A future specification attempting to build it without its
  own BDR amendment would be acting outside this record's authorization.

## 12. Risks

- **Scope creep from "correction" into "override"** during
  specification — the single risk this record spends the most effort
  guarding against (§4's structural distinction exists specifically to
  make this driftable-but-visible, not to prevent all future override
  authorization).
- **A second source of truth emerging by accident** if a future
  specification is tempted to write `subscriptionStatusCache` directly
  as a shortcut — explicitly prohibited (§5, §7), consistent with
  BDR-0010's own already-established discipline.
- **Under-specification of "evidence"** — §4's correction path assumes
  some evidence standard for "a payment was genuinely received" exists
  or can be defined; this record does not define it, and the
  specification stage must not silently assume a low bar.

## 13. Governance and Implementation Boundary

**This BDR authorizes investigation and framing only.** It does not
authorize any Firestore rules change, any server route, any UI screen,
or any specific list of allowed actions. It does not select among the
four outcomes below — that selection is the Product Architect's own
next, separate decision, made after reviewing this record, not
predetermined by it:

**A. Implement a controlled correction capability** — scoped per §4's
recommendation, once the evidence standard (item 2, below) is settled.

**B. Establish monitoring/incident procedures first** — a legitimate,
complete outcome in its own right, not a placeholder for A. If §2's
honest absence of operational data is the deciding factor, "monitor;
do not implement" is a valid product decision, not a deferred yes.

**C. Deliberately defer SuperAdmin subscription intervention entirely**
— also a legitimate, complete outcome, not merely "not yet."

**D. Establish a narrowly defined override mechanism** — only if a
genuinely compelling, specific operational case is identified that a
correction capability structurally cannot address, and only through
its own separate authorization, per §4's explicit caution against
treating override as a larger version of correction.

Separately, the following items remain genuinely open regardless of
which of A–D is chosen:

1. Whether to proceed with even the narrow "correction" capability now,
   or wait for real operational data (§2).
2. The exact evidence standard a correction must meet before it may
   re-enter the governed transition model (§4).
3. Whether — as a separate, later, explicitly-authorized decision —
   any broader override capability should ever be built at all.
4. Whether this needs its own Policy record (a POL, parallel to
   POL-18-001) once a specification stage settles the evidence
   standard and audit-event shape, or whether BDR-level constraints
   plus the existing platform_audit_log discipline are sufficient.

**Governing sequence from here, unchanged:** this BDR → Product
Architect selection among A–D, and resolution of items 1–4 above → a
Policy record if item 4 determines one is needed → a Module
#19-adjacent specification amendment → a Rule 8 Assessment →
implementation. Rule 8 is not skipped. No implementation prompt should
be produced until this sequence completes, matching the exact
discipline Business Directory (BDR-0010) already proved works. **This
BDR's approval, on its own, authorizes none of A–D** — it authorizes
only that the investigation and framing above are accepted as accurate
and sufficient to make that separate selection from.

## 14. What This Decision Does Not Do

- Does not authorize any subscription override capability, narrow or
  broad — see §13.
- Does not define the exact evidence standard a correction must meet
  — an open item for the next stage, not resolved here.
- Does not decide whether SuperAdmin may ever perform a
  non-evidenced, discretionary override — explicitly left open, not
  silently answered "yes" by building toward it.
- Does not reinterpret, weaken, or amend any existing Module #19
  policy (POL-19-001 through POL-19-005, or any other) — see §9.
- Does not blur or duplicate Payment Operations' existing, narrower
  scope — see §6.
- Does not introduce a second canonical subscription value — see §7.
- Does not commit to a timeline or authorize implementation of any
  kind.
