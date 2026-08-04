# Module #20 — Phase 3 Remaining Product Decisions: Governance Review

**Type:** Governance review only. Identifies remaining Product
Architect decisions standing between the current repository state and
a Phase 3 "Ready" classification. **Does not implement. Does not draft
implementation authorization. Does not modify any existing document.
Does not update or replace the existing Phase 3 Rule 8 Assessment.**
**Basis:** fresh, independent repository review — `docs/specs/*`,
`docs/architecture/*`, `docs/adr/*`, `docs/engineering/*` — performed
without assuming anything carried over from a prior session or from
this task's own framing prompt. Current `origin/main`, re-fetched
immediately before this review: `c848556`.

**Nothing in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any existing `docs/` file was modified to
produce this document.**

---

## 1. Repository Verification

The task prompt's "CURRENT VERIFIED STATE" claim was independently
checked, not assumed:

| Claim | Verified |
|---|---|
| ADR-0001 Accepted | ✅ Confirmed (`Status: Approved`) |
| ADR-0002 Accepted | ✅ Confirmed |
| ADR-0003 Accepted | ✅ Confirmed |
| ADR-0004 Accepted | ✅ Confirmed |
| BDR-0005 Accepted | ✅ Confirmed (`docs/specs/20-bdr-0005-notification-language-resolution-policy.md`) |
| BDR-0006 Accepted | ✅ Confirmed (`docs/specs/20-bdr-0006-notification-communication-policy.md`) |
| Module #20 Phase 1 Closed | ✅ Confirmed (`20-phase1-closeout.md`) |
| Module #20 Phase 2 Closed | ✅ Confirmed (`20-phase2-closeout.md`) |
| Implementation Plan reconciled with ADR-0003/0004, BDR-0005/0006 | ✅ Confirmed (`20-notifications-implementation-plan.md`, commit `c848556`, cross-checked against `20-notifications-implementation-plan-reconciliation-review.md`) |

The prompt's stated state matches the repository. **This review does
not repeat the reconciliation work** — it starts from `c848556` as
given and investigates only the four named areas.

---

## 2. Findings

### 2.1 Closing Detection Threshold

**Searched:** `docs/specs/11-monthly-closings.md`, `20-notifications.md`
and its amendments, `docs/architecture/04-system-architecture.md` §4.8,
`docs/architecture/05-business-lifecycle.md` §"New from Section 4",
ADR-0002/0003/0004, BDR-0005/0006, every `docs/engineering/*` file.

**Finding: does not exist anywhere.** Every reference to Closing
"overdue" in this repository is the *name* of the event, never a
definition of when it applies. `11-monthly-closings.md` states this
explicitly, in its own words: *"Overdue-Closing reminders are
architecturally planned, not yet buildable... Architecture 4.8/4.9/5.8
describe a scheduled Background Worker producing an 'approaching' and a
distinct 'overdue' Closing reminder, computed by scanning
`isPeriodClosed` state... [but] Nothing in this codebase runs scheduled
server-side code today."* No day-count, grace period, or rule for
"approaching" vs. "overdue" exists in any spec, ADR, BDR, POL, or
engineering document. Note this is actually **two** thresholds needing
a decision, not one — the spec's own category language (`20-notifications.md`
line 331, "closing approaching, overdue") names both an advance-warning
and a past-deadline event as distinct.

### 2.2 Inventory Risk Detection Threshold

**Searched:** `docs/specs/10-stock-counts.md`, `docs/specs/07-breakages.md`,
BDR-0006, `20-notifications.md`, Architecture domain/system docs.

**Finding: BDR-0006 defines communication policy only — confirmed, per
the task's own caution.** BDR-0006 §9.3 fixes what happens *once* an
Inventory Risk event exists (Notify, High priority) but explicitly
excludes "inventory thresholds" from its own scope (§13). It does not,
and was never meant to, define what makes inventory "at risk."

**More precisely than "nothing exists" — a partial, non-authoritative
precedent exists for half of this domain:**
- **Stock Counts (#10):** zero discrepancy/variance/risk concept
  anywhere in the spec. Confirmed by direct search — no match for
  "discrepancy," "variance," "threshold," or "risk" in
  `10-stock-counts.md` at all. A genuinely blank slate.
- **Breakages (#7):** an existing, *implemented* concept —
  `isQuebraExceedingWarning` — already fires when cumulative losses on
  a batch would exceed that batch's original quantity
  (`src/utils/calculations.ts`), surfaced today as a Dashboard warning
  banner. However, `07-breakages.md` itself is explicit that this is
  *"a data-quality signal, not a hard rule"* (citing Architecture §8.5)
  — it exists to flag a probable miscount, not to define a business
  threshold for owner risk communication, and the spec does not
  authorize repurposing it as one.

**A documentation accuracy note, not a governance gap:** the
Implementation Plan states *"no existing discrepancy/risk detection
logic exists anywhere in the codebase today"* (§3, Architectural
Context) for this domain. That's accurate for Stock Counts but not for
Breakages — `isQuebraExceedingWarning` does exist. Flagged for
awareness; not corrected here, per this review's own scope (does not
modify existing documents).

**Net finding:** whether `isQuebraExceedingWarning` is adopted,
adapted, or explicitly rejected as the basis for a notification-worthy
"Inventory Risk" event — and what the equivalent for Stock Counts
should be — is undecided. This is a genuine open Product Decision, not
merely an engineering detail, because it requires judging whether an
existing UI-only "signal, not a hard rule" is fit to become an
owner-facing, High-priority platform notification.

### 2.3 Trial Ending Soon Threshold

**Searched:** `docs/specs/19-subscriptions.md`, all eight
`19-pol-NNN-*.md` policy documents (the complete Planned Policy
Series), Architecture §4.8/§4.12.

**Finding: does not exist.** `19-subscriptions.md` defines `trialEndsAt`
as a fixed point (`trialActivatedAt` + 30 days, POL-19-002) but no
policy defines an advance-warning window before it. The one document
that could plausibly hold this — **POL-19-008 (Subscription
Notification Policy)**, the last item in the Planned Policy Series —
was checked directly and explicitly excludes it: its own "Scope
Exclusions" section lists *"Notification timing... Reminder frequency...
Scheduling"* as things it does **not** define, calling them *"future
specification work — including Module #20's own eventual implementation
of its 'Subscription Notifications' category."* "Trial progress" is
named in POL-19-008 as an illustrative future communication event, but
the document is explicit that the list is *"illustrative only, not
implementation requirements."* Separately, POL-19-004 defines a 7-day
**grace period** *after* a subscription lapses — a related but distinct
concept (post-expiry continuation window, not a pre-expiry warning) —
and does not supply a "days before expiry" figure either.

**Net finding:** genuinely open. No document in this repository —
including the one most likely to hold it — defines this threshold.

### 2.4 Dedupe / Watermark Mechanism

**Searched:** Architecture §4.8.1, ADR-0002, ADR-0003, the reconciled
Implementation Plan, current `writeNotification()`/
`runTrialLifecycleSweep()` in `server/index.ts`.

**Finding: this is not an open governance question. It is fully
specified architecturally, and remains only unbuilt.** Architecture
§4.8.1 is not a placeholder — it names two concrete, already-decided
mechanisms in detail: (1) a **per-job dedupe key**, checked either via
a small `platform_worker_state/{jobType}` document or via the dedupe
key itself as the notification document's own ID rather than an
auto-ID; (2) a **run-level watermark**
(`platform_worker_state/{jobType}.lastRunCompletedAt`), explicitly
described as "only an optimization to narrow the scan, never the
correctness mechanism by itself." ADR-0003 reinforces this directly:
watermark tracking is named as one of the Background Worker's core
responsibilities, "per ADR-0002/§4.8.1's existing model, keyed per
registered job, not globally" — i.e., ADR-0003 already assumes and
extends §4.8.1's mechanism to the multi-job-type world, rather than
leaving it open.

The choice between the dedupe key's two storage options ("a small
`platform_worker_state/{jobType}` document, **or** the dedupe key's own
existence... as the Notification document's ID") is presented in the
architecture's own words as interchangeable — "both cheap to build,"
neither preferred over the other for business reasons. That is an
engineering implementation choice, not a Product Architect decision:
nothing about it touches Business Worth, tenant isolation, notification
content, or communication policy — the categories this project's
governance actually reserves for Product Architect authority. The
**prior** Phase 3 Rule 8 Assessment (`20-phase3-rule8-assessment.md`,
written before this closer re-read) characterized this as needing "a
decision on which of Architecture §4.8.1's two candidate mechanisms
this codebase adopts" — this review revises that characterization: it
is not undecided architecture, it is unbuilt architecture. No new ADR
is required.

**What remains, and it is real:** none of this exists in code today.
`writeNotification()` has zero duplicate-check logic of any kind (confirmed
in the earlier Rule 8 Assessment and unchanged since). This is a
concrete, immediate engineering task — building `platform_worker_state`,
the dedupe-check, and the watermark read/write — not a governance gap.

---

## 3. Remaining Product Decisions

Exactly two — not three, and not four, per the more precise finding in
§2.4:

1. **Closing detection threshold(s).** What counts as "approaching" and
   what counts as "overdue" for a Closing — day-counts or an equivalent
   rule, against `isPeriodClosed` state. Two thresholds, not one.
2. **Inventory Risk detection definition.** What "at risk" means for
   Stock Counts (currently zero precedent) and for Breakages (an
   existing but explicitly non-authoritative signal,
   `isQuebraExceedingWarning`, requiring an explicit decision on whether
   it's adopted, adapted, or rejected as the basis for a Version 1
   platform notification).
3. **Trial-ending-soon threshold.** How many days before `trialEndsAt`
   the notification fires — no existing policy, including the one
   (POL-19-008) that explicitly named and then excluded this exact
   question.

(Numbered 1–3 above for reference in this document; conceptually two
domains — Closing and Inventory — carry a combined three individual
thresholds, plus Subscription's one, so "three remaining threshold
decisions" is the more precise count if measured per-notification-type
rather than per-domain.)

**Explicitly not a fourth item:** the dedupe/watermark mechanism (§2.4)
is not a Product Decision. It is listed separately in §4.

---

## 4. Remaining Engineering Decisions

1. **Dedupe/watermark implementation** (§2.4) — build
   `platform_worker_state`, the per-job dedupe check, and the watermark
   read/write against Architecture §4.8.1's already-specified design.
   No further governance input needed to start this.
2. **Choice of dedupe-key storage shape** — `platform_worker_state/{jobType}`
   document vs. dedupe key as the notification's own document ID.
   Architecture §4.8.1 presents both as valid; engineering may pick
   either without further approval.
3. Everything else already named as engineering-planning detail in the
   Implementation Plan §7 (read/unread mechanism, dismiss mechanism,
   Archived representation, Delivery Channel Interface shape,
   immutability enforcement) — unaffected by this review, unchanged.

---

## 5. Governance Classification

| Item | Classification | Why |
|---|---|---|
| Closing detection threshold(s) | **Required Future Governance** | No definition exists anywhere; genuinely a Product Architect call (what "overdue" means is a business judgment about operational continuity, not an engineering default) |
| Inventory Risk detection definition | **Required Future Governance** | Same reasoning, compounded by a real sub-decision (whether to repurpose an existing non-authoritative UI signal) that only the Product Architect can resolve |
| Trial-ending-soon threshold | **Required Future Governance** | Explicitly named and explicitly excluded by the one policy document that could have decided it (POL-19-008) — a deliberate deferral, not an oversight, but still undecided |
| Dedupe/watermark mechanism (existence & design) | **Informational Dependency** | Fully specified by Architecture §4.8.1, reinforced by ADR-0003; not awaiting any decision |
| Dedupe/watermark mechanism (build status) | **Immediate Blocker** (for coding, not for governance) | Doesn't exist in code; must be built before Phase 3 producers can ship safely, but requires zero further Product Architect input to start |

---

## 6. Projected Rule 8 Outcome If Run Today (Not an Assessment)

**If a fresh Rule 8 Assessment were run today, it would likely
classify Phase 3 as: Not Ready.**

**Exactly why:** three Required Future Governance items remain fully
open (§3, §5) — not minor tuning, but the specific business definitions
each of Phase 3's three producers needs before its detection logic can
be written at all. A Closing-overdue job cannot be written without
knowing what "overdue" means; the same is true for Inventory Risk and
Trial-ending-soon. This is qualitatively different from "Ready after
minor preparation," which would fit a situation with one small,
well-scoped gap — here, all three of Phase 3's producers are
individually blocked, not just one.

This is **not** the same "Not Ready" as the original assessment,
though, and a fresh assessment should say so explicitly: the two
architectural contradictions that drove the original classification
(ADR-0003 vs. the Implementation Plan's stale wording; ADR-0004 vs. the
spec's producer-owned-content pattern) are now resolved by the
reconciliation already committed. What remains is narrower and more
concrete — three specific, nameable business decisions — not an
unresolved architecture. A fresh assessment, once run, would be
classifying against a materially smaller gap than the original one did,
even though the top-line word is the same.

**What would change this projection to "Ready after minor
preparation":** resolution (decision or explicit deferral, per this
project's own established practice — see BDR-0006 §9.3's deferral of
batching/suppression as a precedent for what a legitimate "explicit
deferral" record looks like) of all three items in §3.

---

## 7. Recommendation

Decide, or explicitly and formally defer (per the BDR-0006 §9.3
precedent — "not decided" is not a valid resting state per this
project's own governance discipline; "explicitly deferred, recorded,
with a reason" is), the three items in §3:

1. Closing "approaching" and "overdue" thresholds.
2. Inventory Risk definition for Stock Counts and Breakages
   (including the specific question of `isQuebraExceedingWarning`'s
   fitness for reuse).
3. Trial-ending-soon threshold.

No new ADR is needed for the dedupe/watermark mechanism (§2.4, §5) —
that can proceed as engineering work in parallel with, or after, the
three decisions above, without waiting on further Product Architect
input.

Once the three decisions (or explicit deferrals) exist as committed
records, the next legitimate step — per the sequencing already agreed
— is a fresh Phase 3 Rule 8 Assessment, run as a new document, not an
edit to the existing one.

---

## Deliverables

1. **File created:**
   `docs/engineering/20-phase3-remaining-product-decisions-review.md`
   (this document). No other file created or modified.
2. **No implementation, no runtime code, no authorization drafted.**
3. **No existing document modified** — including the prior Rule 8
   Assessment, the Implementation Plan, any spec, ADR, BDR, or POL.
4. **Repository claim in the task prompt verified independently**
   (§1) — matched, not merely trusted.
5. **Three remaining Product Decisions identified** (§3), each
   evidenced against a direct repository search, not inferred.
6. **One prior characterization revised**, in the interest of accuracy
   rather than repetition: the dedupe/watermark mechanism is not an
   open architectural question requiring a decision between two
   options — it is a fully specified, unbuilt mechanism (§2.4).
7. **Projected — not performed — Rule 8 outcome:** Not Ready, for
   reasons narrower than the original assessment's (§6).
