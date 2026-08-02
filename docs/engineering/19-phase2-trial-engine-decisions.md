# Module #19 — Phase 2 (Trial Engine) — Product Architect Decisions

**Type:** Product Architect Decision Record — resolves the four open
items identified in
[`19-phase2-trial-engine-rule8-assessment.md`](./19-phase2-trial-engine-rule8-assessment.md).
Not a BDR (no new strategic "why" question — every decision below
operationalizes already-approved policy), not a POL (doesn't belong to
the numbered Planned Policy Series), not an ADR (no architecture-level
system fork). A single, scoped decision record for one implementation
milestone, per explicit Product Architect direction to keep this
compact rather than four separate documents.
**Status:** Approved.
**Resolves:** Rule 8 Assessment §1 (Technical Activation Trigger), §4
(Restricted-Operation Enforcement), §6/Risk-1 (Background Worker
sequencing), §7 (Auditability of Lifecycle Transitions).
**Does not modify:** any BDR, any POL, `19-subscriptions.md`, ADR-0001,
or the Implementation Plan. Each decision below operationalizes
existing, unmodified governance — POL-19-001's "meaningful business
activity," POL-19-003's Read-Only Preservation, Architecture §4.8's
Background Worker, and Business Rule 8's audit principle, respectively.
**Does not authorize implementation.** Per Rule 8, coding Phase 2 still
requires its own separate, explicit go-ahead — this record closes the
strategic-uncertainty gate, not the implementation gate.

---

## Decision 1 — Technical Activation Trigger

**Approved rule:** a trial activates on **the first successful
operational transaction that creates enduring business value** — a
platform-level concept, not a binding to any specific feature.

**Rationale:** binding activation to a named feature (inventory,
stock movement) would make the trigger fragile against future
operational modules — every new module would need its own activation-
trigger decision. A platform-level concept lets today's operations
(sales, purchases, inventory receipts, expenses) map onto it, and lets
future operations map onto it too, without reopening this decision or
POL-19-001 itself.

**What this means for implementation:** the *concept* ("creates
enduring business value") is now fixed and approved. The *mapping* of
specific write paths onto that concept remains implementation detail —
engineering may map today's existing operations (inventory creation,
purchase recording, expense recording, stock adjustment) onto the
concept during Phase 2 build-out, and may extend that mapping to future
modules later, without needing a new Product Architect decision each
time, as long as the underlying concept (creates enduring business
value) is what's actually being checked.

**What remains implementation-planning work, not decided here:** the
exact code-level hook/mechanism (a shared write-path check vs. a
per-domain call) and the precise enumerated set of today's operations
that satisfy the concept. Both are Phase 2 engineering tasks under this
now-fixed concept, not further open product questions.

## Decision 2 — Restricted Operations

**Approved rule:** during `trial_completed` or `expired` status, a user
may not **create, modify, or delete any operational record that
changes Business Worth or financial position.** Principle-based, not a
fixed enumerated list — future operational modules are covered
automatically without needing a spec amendment each time.

**Allowed (illustrative, not exhaustive — anything that only reads
does not need to be listed to be allowed):**
- View dashboards, reports, history
- View customers, suppliers, products
- Export data, where the active plan permits it

**Restricted (illustrative, not exhaustive — anything matching the
principle is restricted whether or not it's named here):**
- Record sales
- Record purchases
- Receive inventory
- Record expenses
- Adjust inventory
- Any other action that changes Business Worth or financial position

**What this means for implementation:** the Subscription Guard (Phase
2 Rule 8 Assessment §4) is built against this principle — "does this
write change Business Worth or financial position" — not against a
fixed list engineering must remember to update. This also removes the
prior open item (spec's "Explicitly Left Open," item 5) as a blocking
gap: the principle itself is now the enumerable-enough criterion.

**Confirmed unaffected:** Business Rule 5 (Business Worth history is
never gated) and POL-19-003's Read-Only Preservation — this decision
governs new-record *creation*, never historical visibility, matching
the Rule 8 Assessment's §6 "must not regress" finding exactly.

## Decision 3 — Background Worker Scope for Phase 2

**Approved rule:** Phase 2 does **not** wait for a general-purpose
Background Worker framework. Phase 2 builds a **minimal Trial
Lifecycle Worker** whose only responsibility is advancing subscriptions
based on elapsed time — specifically `trial_active → trial_completed`
per §2 of the Rule 8 Assessment. General-purpose scheduled processing
(the full Architecture §4.8 design — notification triggers, renewal
evaluation, aggregation rollups, and everything Module #20 will also
need) is explicitly **deferred**, built later as reusable
infrastructure once more than one consumer needs it.

**Rationale:** this un-blocks Phase 2 without taking on the larger,
cross-cutting Background Worker build (shared with #20, previously
flagged as a sequencing question nobody had answered) as this phase's
own dependency. It also avoids building general infrastructure before
a second real consumer (Notifications, renewal evaluation) exists to
validate the design — consistent with this codebase's existing
"reuse, don't over-build ahead of need" pattern.

**What this means for implementation:** a single, narrow scheduled
process (or scheduled job entry point) that does exactly one thing:
scan for `subscriptions` where `status == 'trial_active'` and
`trialEndsAt <= now`, transition to `trial_completed`, idempotently.
Nothing else lives in this worker yet. When Phase 3 (Grace Period,
Conversion, Recovery) or #20 (Notifications) need scheduled evaluation
too, extending this into the fuller Architecture §4.8 design is a
separate, future decision — not pre-built now.

## Decision 4 — Audit Scope for Automatic Lifecycle Transitions

**Approved rule:** Business Rule 8's audit guarantee is **broadened**
to cover automatic, system-driven subscription lifecycle transitions,
not only SuperAdmin overrides. Every one of the following produces an
audit event, written to the existing platform Audit Log (Architecture
§9.6), whenever it occurs:

- Trial activated
- Trial completed
- Grace period entered
- Subscription expired
- Subscription renewed

**Rationale (explicitly not a compliance argument):** this supports
the platform's transparency/explainability principle — these events
become directly useful for customer support, troubleshooting, and
future analytics, and let an Owner's or Admin's "why did my account
change state" question always have a concrete answer in the record,
not just an inferable one from `updatedAt`.

**What this means for implementation:** Phase 2 is the first phase to
actually produce two of these events (**Trial activated**, **Trial
completed**) — the Trial Lifecycle Worker (Decision 3) and the
activation-trigger write path (Decision 1) each write their audit
entry in the same transaction/operation as the state change itself,
mirroring Business Rule 8's existing "no state change without its
audit entry" pattern for SuperAdmin overrides. **Grace period entered,
Subscription expired** (the paid-subscription sense, distinct from
trial expiry), and **Subscription renewed** are Phase 3/5 events —
this decision fixes the *principle* now (so Phase 3/5 don't need their
own separate audit-scope decision later), but no code for those three
events is written in Phase 2.

---

## Readiness

With these four decisions recorded, Phase 2's strategic uncertainty is
closed:

- Decision 1 removes the Rule 8 Assessment's §1 blocker (the one item
  marked "Phase 2 cannot begin coding without this choice").
- Decision 2 removes §4's enumerated-list blocker.
- Decision 3 resolves §6/Risk-1's Background Worker sequencing
  question — Phase 2's scope is now fully bounded (activation trigger,
  timestamp population, the minimal Trial Lifecycle Worker, the
  principle-based Subscription Guard), with no dependency on
  unbuilt general infrastructure.
- Decision 4 resolves §7's audit-scope question.

**No further strategic uncertainty remains for Phase 2 as scoped by
this record and the Rule 8 Assessment together.** This matches the
same "Ready" state Phase 1 reached after its own Rule 8 Assessment —
architecturally and product-wise clear, pending only the same kind of
engineering-planning-level detail work Phase 1 also had (e.g., the
exact write-path hook for Decision 1's mapping, the exact scheduled-job
mechanism for Decision 3's worker) that Rule 8 expects each phase to
resolve at implementation time, not before.

**This record does not itself start implementation.** Per Rule 8 and
this repo's established pattern, beginning Phase 2 coding requires its
own separate, explicit Product Architect go-ahead.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, edit
  application logic, or change any `firestore.rules`, `src/`, or
  `server/` file. None were touched to produce it.
- This record does not modify any BDR, POL, the Module #19
  specification, ADR-0001, or the Implementation Plan — it
  operationalizes them within Phase 2's already-approved scope.
- `docs/engineering/19-phase2-trial-engine-rule8-assessment.md` is left
  unmodified — its four open items are resolved by this record, not
  silently edited into that document, per this repo's established
  practice of not retroactively rewriting a prior assessment.

**Lifecycle:** Assessed → **Decided**. Not Implemented, Executed, or
Analyzed — no engineering work is authorized by this record.
