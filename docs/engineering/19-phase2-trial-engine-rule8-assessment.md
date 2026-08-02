# Module #19 (Subscriptions) — Phase 2 (Trial Engine) Rule 8 Assessment

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Implementation Plan, per `CLAUDE.md`'s Rule 8 process. Planning
only. **Does not authorize implementation.**
**Lifecycle status:** Designed → **Assessed**. Not Implemented, not
Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision.
**Phase:** Module #19, Phase 2 — Trial Engine, per
[`19-subscriptions-implementation-plan.md`](./19-subscriptions-implementation-plan.md)
§13 phasing. Follows Phase 1 (Foundations), formally closed in
[`19-phase1-closeout.md`](./19-phase1-closeout.md) at commit `4d9d34b`.
**Basis:** [`19-subscriptions.md`](../specs/19-subscriptions.md) (v2.0,
Accepted) — Technical Status Model, State Mapping, Restricted-Operations
Enforcement, Security Considerations, Explicitly Left Open (items 4, 5,
7); [POL-19-001](../specs/19-pol-001-trial-activation-policy.md)
(Trial Activation), [POL-19-002](../specs/19-pol-002-trial-duration-policy.md)
(Trial Duration), [POL-19-003](../specs/19-pol-003-trial-expiry-policy.md)
(Trial Expiry), [POL-19-005](../specs/19-pol-005-subscription-state-model.md)
(State Model); Architecture §4.8 (Background Processing), §4.6
(Authentication); current `src/`, `server/`, `firestore.rules` state as
of commit `4d9d34b`.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*` file to produce this document.**

Per your framing: every question below is an **engineering** question —
how an already-approved business policy gets encoded, timed, and
enforced — not a reopened product decision. Where governance itself
left something genuinely undecided (not an implementation detail, but
an actual missing decision), it's flagged as such rather than resolved
here, consistent with Phase 1's own practice.

---

## 1. Technical Activation Trigger

**Business decision (settled, POL-19-001):** the trial begins at "the
first meaningful business activity," not at account creation. POL-19-001
gives illustrative, non-exhaustive, non-ranked examples (recording
initial inventory, first stock movement, first real transaction) and
explicitly defers the technical trigger to "the future specification."

**Specification (v2.0) status:** the spec's own "Explicitly Left Open"
item 4 confirms the precise technical trigger is **still not fixed** —
neither governance nor the Accepted specification decided which write,
field, or threshold constitutes activation. This is not an oversight
Phase 2 can quietly fill in; it's an open item the spec itself named.

**Engineering-level options, grounded in what the current codebase
already writes** (presented for Product Architect selection, not
decided here):

| Candidate trigger | Where it already exists in `src/` | Fit against POL-19-001's examples |
|---|---|---|
| First inventory item created for the Business | `AppContext.tsx` inventory-add path | Matches "recording initial business inventory" directly |
| First stock movement (receipt or adjustment) | Purchase batch / stock-adjustment write paths | Matches "first real stock movement" directly |
| First Closing performed | Closing flow (`closingIntegrity.ts`-adjacent writes) | Does not match any listed example — likely too late in the business's actual usage to count as "activation" |
| First of *any* operational write (inventory, purchase, expense) — a single generalized trigger rather than a specific one | Would require a shared write-path hook, not a single existing function | Broadest reading of "genuine business operations," but least precise |

**Recommendation for Product Architect decision, not a default:** the
first two rows are the closest literal matches to POL-19-001's own
examples and are also the cheapest to implement (a single write-path
condition each). The fourth row is architecturally heavier (a
cross-cutting hook) for a broader but vaguer definition. This
assessment does not pick one — Phase 2 cannot proceed past this point
without an explicit choice.

## 2. Trial State Transitions

**Confirmed states in scope for Phase 2** (Technical Status Model):
`trial_pending → trial_active → trial_completed`. `active`,
`grace_period`, `expired` are Phase 3/5 (Subscription Lifecycle,
Commercial Integration) — **out of scope here**, per the Implementation
Plan's own phase boundaries. Phase 2 does not build the Subscription
State Manager's remaining transitions.

**Transition mechanics:**
- `trial_pending → trial_active`: fires once, at the activation trigger
  (§1, above) — sets `trialActivatedAt` and computes `trialEndsAt`
  (§3, below). Idempotent: a Business already in `trial_active` or
  later must never re-trigger this transition, regardless of how many
  times the trigger condition's write path fires again.
- `trial_active → trial_completed`: fires when `now >= trialEndsAt`.
  Per Architecture §4.8/line 224 ("Background Worker for lifecycle
  checks"), this is architecture's already-decided mechanism — a
  scheduled sweep, not a client-side or per-request check. **This is
  where Phase 2 meets the repository's largest unresolved dependency**
  (§6, below): the Background Worker is confirmed 0% built.

**Genuinely open, not an implementation detail:** whether
`trial_pending → trial_active` should also be Worker-evaluated
(scanning for businesses whose activation trigger fired) or fires
synchronously inside the same write that satisfies the trigger
condition. Synchronous is simpler and has no Worker dependency; Worker-
evaluated is consistent with how `trial_active → trial_completed` must
work regardless. Recommend synchronous for activation (write-time,
no Worker needed) and Worker-evaluated for expiry (time-based, needs a
process to notice elapsed time with nobody actively using the app) —
flagged for Product Architect confirmation, not assumed.

## 3. Activation Timestamp

Already scaffolded in Phase 1's `Subscription` type
(`trialActivatedAt: string | null`, `trialEndsAt: string | null`) —
both currently always `null` (Phase 1 produces `trial_pending` only).
Phase 2 populates them:

- **Format:** ISO 8601 UTC string, consistent with every other
  timestamp field already in this schema (`createdAt`, `updatedAt`) —
  no new timestamp convention introduced.
- **`trialEndsAt` computation:** `trialActivatedAt + 30 days`
  (POL-19-002, fixed and flat across every plan — no plan-level
  override). Calendar-day addition in UTC, not a timezone-local
  calculation — avoids the exact class of bug the codebase's existing
  `closedPeriodKey` cross-system-contract discipline already guards
  against (this repo's established pattern: date/time contracts must
  be unambiguous and identically derivable everywhere they're read).
- **Immutability:** once set, `trialActivatedAt` never changes for the
  life of the subscription document (Business-level trial, POL-19-002)
  — no "trial restart" mechanic exists or is implied by any approved
  governance document.

## 4. Restricted-Operation Enforcement After Trial Expiry

**Settled (Restricted-Operations Enforcement, Business Rule 6):**
`trial_completed` and `expired` both restrict *new* operational record
creation; historical visibility is never restricted (Business Rule 5).
A single, consistent read path against `subscriptions/{businessId}.status`
— not a per-domain reimplementation — is the specified enforcement
model (matches Phase 1's "Subscription Guards" planning-level component
name from the Implementation Plan §5).

**Genuinely open (spec's own Explicitly Left Open, item 5):** the exact
enumerated list of "operational record creation" actions this gate
applies to. POL-19-003's list (sales, purchases, stock receipt,
inventory adjustment, expenses) is explicitly illustrative, not
exhaustive. Phase 2 needs this list finalized before the Subscription
Guard can be wired into each domain's write path — this assessment
does not finalize it; it is a Product Architect confirmation, most
efficiently made once (a single enumerated list), not per-domain during
implementation.

**Engineering shape (not blocked on the list above):** a single guard
function/hook, called at each restricted write path, reading
`subscriptions/{businessId}.status` and returning allow/deny — the
same "single consistent read path" the spec already specifies. This
can be built once the enumerated list is confirmed; the guard's
*mechanism* is not itself an open question.

## 5. Interaction with the Grace Period

**Scope boundary (Implementation Plan §13):** Grace Period is Phase 3
(Subscription Lifecycle), not Phase 2. The six-state model's
`grace_period` state is reached from `active` (a paid subscription
whose renewal failed), not from a trial — POL-19-004's Grace Period is
a Business Rule 6/POL-19-004 concept about *paid* subscriptions, not
about trials.

**What Phase 2 must still respect, without building Phase 3's logic:**
the Trial Engine's transitions (`trial_pending`/`trial_active`/
`trial_completed`) and the future Subscription State Manager's
transitions (`active`/`grace_period`/`expired`) are two independent
state families sharing one `status` field and one Background Worker
instance (Implementation Plan §3, §5) — not two separate fields, and
not two separate workers. Phase 2's Trial Engine must be built so a
later Phase 3 addition is additive (new job type on the same Worker),
not a rework of Phase 2's own transition logic. No Grace Period
transition code is written in Phase 2.

## 6. Preservation of Read-Only Access

**Settled (Business Rule 5, POL-19-003 Read-Only Preservation):**
historical Business Worth, Closings, Timeline, and performance data
remain fully visible regardless of subscription status — this is a
*read* guarantee, structurally separate from the *write* guard in §4,
above. Phase 2 must not introduce any change to existing read paths
for historical data; the Subscription Guard (§4) only ever gates
*creation* of new operational records, never visibility of existing
ones. This is a "must not regress" constraint on Phase 2, not new
scope — worth stating explicitly here since it's the kind of thing an
overly broad guard implementation could accidentally violate if it
gated reads instead of writes.

## 7. Auditability of Lifecycle Transitions

**Settled (Business Rule 8):** SuperAdmin overrides must be logged
atomically with the state change — no override may succeed without its
audit entry succeeding in the same transaction. This is explicit and
already scoped to Phase 4 (SuperAdmin Consumption), not Phase 2.

**Genuinely open, not covered by any approved governance document:**
Business Rule 8 only mandates audit logging for *SuperAdmin overrides*.
It says nothing about whether **automatic, system-driven transitions**
(the Background Worker moving a Business from `trial_active` to
`trial_completed` purely because time elapsed, with no human actor) get
any audit trail at all. No BDR, POL, or the spec itself extends Business
Rule 8 to cover this case. Two honest options, not a recommendation:

- **Minimal:** rely on `updatedAt` + the Worker's own operational logs
  (Railway logs) — no new Firestore-level audit write for automatic
  transitions. Cheapest, consistent with "don't invent a new business
  rule."
- **Consistent-with-8:** extend the existing platform Audit Log
  (Architecture §9.6) to also record automatic lifecycle transitions,
  for the same "an audit must be structurally guaranteed, not just
  monitored" reasoning Business Rule 8 applies to SuperAdmin overrides
  — but this *would* be a new audit-scope decision, since governance
  never asked for it.

This assessment flags the gap rather than picking a side, since
choosing either option is a small but real product-governance decision
("how much of the subscription lifecycle needs a permanent audit
trail"), not a pure engineering detail.

---

## 8. Files Likely Affected (Phase 2, identification only)

- **`src/types.ts`** — no new types; `trialActivatedAt`/`trialEndsAt`
  move from always-`null` to populated. Additive semantics, no shape
  change.
- **New: Background Worker process** — confirmed 0% built (Phase 1
  Rule 8 Assessment's finding, unchanged). Phase 2 cannot fully
  implement `trial_active → trial_completed` (§2, above) without at
  least a minimal version of this existing. This is the single largest
  gap between "Phase 2 is engineering-ready" and "Phase 2 is buildable
  today" — see Risks, below.
- **New: activation trigger hook** — wherever §1's chosen candidate
  write path lives (likely `AppContext.tsx`'s inventory or stock-write
  functions) — additive condition, not a rewrite of those functions.
- **New: Subscription Guard read path** — a new shared
  function/hook, called from each restricted-operation write path
  once §4's enumerated list is confirmed. Exact call sites not
  enumerated here (depends on the confirmed list).
- **`firestore.rules`** — no change anticipated. The existing
  `subscriptions/{subscriptionId}` block (Phase 1) already has
  `allow write: if false` — all Phase 2 writes (activation, expiry)
  go through the Admin SDK (Background Worker or server), same
  guarantee as Phase 1.
- **`tests/`** — new unit tests for trial-duration/activation-
  eligibility logic (already anticipated in the Implementation Plan
  §12) once §1/§2's decisions are made.

## 9. Risks

- **Background Worker non-existence (high, blocking for full Phase 2
  completion):** carried forward from Phase 1's own Risks (Implementation
  Plan §11) — this is no longer a diffuse future risk, it's now the
  concrete thing Phase 2's expiry transition depends on. **Needs an
  explicit Product Architect sequencing decision:** does Phase 2 include
  building a minimal Background Worker (single job type: trial
  expiry sweep), or does Phase 2 stop at everything that doesn't need
  one (activation trigger + timestamp population), with expiry
  transition deferred to a Phase 2b once the Worker exists? Both are
  legitimate scopings; this assessment does not choose.
- **Activation trigger ambiguity (medium):** §1's choice affects how
  "fair" the trial feels in practice (a broad trigger fires sooner
  than a narrow one) — a genuine product-facing consequence of an
  engineering-looking choice, worth the Product Architect's explicit
  attention rather than a default.
- **Guard-scope creep (medium):** §4/§6 together mean the Subscription
  Guard must be written narrowly (gate writes, never reads) — a
  natural implementation shortcut (checking status once and gating an
  entire route/component) risks silently violating Read-Only
  Preservation if not built domain-by-domain against the confirmed
  list.
- **Idempotency of the activation transition (medium):** since
  `trial_pending → trial_active` is proposed as synchronous (§2), the
  write path needs a guard against re-firing on every subsequent
  qualifying write, not just the first — a missing idempotency check
  here would silently reset `trialActivatedAt` repeatedly.
- **Auditability gap (low-medium, governance-facing not code-facing):**
  §7's finding — flagged for a decision, not a code risk in itself.

## 10. Remaining Blockers

- **Blocking:** §1 (technical activation trigger) — Phase 2 cannot
  begin coding without this choice.
- **Blocking for full completion, not for starting:** §6's Background
  Worker sequencing decision — activation-side work (§1–§3) can begin
  without it; expiry-side work (§2's second transition, §4's
  enforcement) cannot complete without it.
- **Needs a single confirmation before the Guard is built:** §4's
  enumerated restricted-operations list.
- **Needs a decision, not urgent:** §7's audit-scope question — can be
  decided at any point before Phase 2 is closed out, does not block
  starting.

## 11. Recommendation

**Not yet ready to begin coding.** Unlike Phase 1 — where the Rule 8
Assessment found only an engineering-planning-level gap (rollback
mechanics) — Phase 2 has three items that are genuine, outstanding
Product Architect decisions (§1, §4's exact list, and the Background
Worker sequencing call in §6), plus one governance-scope question
worth an answer before close-out (§7). None of these are this
assessment's to decide.

**Suggested path:** a short decision round covering §1 (pick a trigger
or ask for a different one), §4 (confirm or amend the restricted-
operations list), and §6 (decide Phase 2 scope: with or without a
minimal Worker) would unblock a focused, buildable Phase 2 scope
immediately after. §7 can be folded into that same round or deferred.

This recommendation is not authorization. Per Rule 8, actual coding
still requires its own separate, explicit go-ahead once the above are
answered.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not modify any BDR, POL, the Module #19
  specification, ADR-0001, or the Implementation Plan.
- This record does not decide the technical activation trigger, the
  enumerated restricted-operations list, the Background Worker
  sequencing question, or the automatic-transition audit-scope
  question — each is presented for Product Architect decision, not
  resolved here.

**Lifecycle:** Designed → **Assessed**. Not Implemented, Executed, or
Analyzed — no engineering work is authorized by this record.
