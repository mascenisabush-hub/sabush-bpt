Business Domain Specification — Amendment

# Closing Integrity Amendment

Version 1.0
**Status:** ✅ Approved (decisions recorded below). Specs #8, #9, and
#11 have been amended to incorporate these decisions — see each spec's
Business Rules / Functional Requirements / Acceptance Criteria for the
`[Amendment v1.0]`-tagged additions. This document remains the record
of *why*; the individual specs remain the source of truth for *what*.
**Implementation status:** Not yet built. This amendment settles the
business-rule decisions; the `closingId`/enforcement *mechanism*
(Option A/B/C) is decided in the Rule 8 implementation plan that
follows this document, not here.
**Amends:** [Expenses (spec #8)](./08-expenses.md),
[Withdrawals (spec #9)](./09-withdrawals.md),
[Monthly Closings (spec #11)](./11-monthly-closings.md)
**Origin:** Calculation audit → Finding B → Rule 8 Current State
Assessment (see session record) → this proposal, produced *before* any
implementation plan or code change, per standing process.
**Implementation:** None yet. This document proposes a decision, not code.

---

## Why this document exists, and why it's separate from the Rule 8 plan

The Rule 8 Current State Assessment for Finding B confirmed the gap
specs #8/#9/#11 already named — no `closingId` field, no lock check, no
role gate, no confirmation — but also surfaced something none of the
three specs state explicitly: **the integrity problem has two
independent halves, and only one of them is currently in scope.**

- **Half 1 — protect existing records.** Specs #8/#9 Functional
  Requirements #7–8 already require this: block edit/delete of a
  record once it belongs to a locked Closing.
- **Half 2 — protect the closed period itself.** Not stated anywhere
  today: nothing stops a **new** Expense or Withdrawal from being
  created with a backdated `date` that falls inside an already-closed
  period. `recordClosing` computes `totalExpenses`/`totalWithdrawals`
  by filtering the live collections on `date` range
  (`generateReportSummary`, `calculations.ts:107-122`) at the moment of
  closing, then freezes the *result* — never the *inputs*. A backdated
  entry after the fact reopens exactly the mismatch Closing exists to
  prevent, without touching a single existing record.

Half 1 is an approved requirement waiting on implementation. Half 2 is
a real gap in the *requirement*, not just the code — which is why this
needs a decision before a Rule 8 implementation plan, not a plan that
quietly assumes an answer.

## Recommendation — Question 1: Should a closed period be fully immutable?

**Recommended: Yes.** A period should mean the same thing the day it's
closed and five years later: `Existing records` blocked from
`update`/`delete`, **and** `new records` blocked from being created
with a `date` inside that period's range. This is the only reading
consistent with Architecture 7.6 ("mutable until locked, then frozen")
and Principle 2.10 ("permanently locks a month or year's figures") —
both already approved; this amendment doesn't introduce a new
principle, it closes a requirement gap under an existing one.

**What this changes concretely, if approved:**
| | Today | Proposed |
|---|---|---|
| Edit existing record in closed period | Not possible (no `update*` function exists) — accidentally compliant | Explicitly blocked, by design |
| Delete existing record in closed period | **Possible, unblocked** | Blocked |
| Create new record dated inside closed period | **Possible, unblocked** | Blocked |
| Create new record dated in the still-open current period | Possible | Unchanged |

## Recommendation — Question 2: Should backdated entries into a closed period be blocked?

**Recommended: Yes** — this is Half 2 above, restated as its own
acceptance criterion so it can't be silently dropped when the
Rule 8 implementation plan is written. Without it, "fully immutable"
in Question 1 is a slogan, not a rule: the January example makes the
failure concrete — a $300 backdated Expense after January is closed
produces a live recount ($1,300) that never matches the frozen
snapshot ($1,000), with no error, no warning, and no record that it
happened.

## Open — Question 3: Should future-dated entries be restricted?

Distinct from Questions 1–2 — this is about a date in the **future**
relative to today, not a backdated entry into a **past closed**
period, and it isn't implied by anything already approved. No existing
spec states a rule either way. I'm not recommending a default here,
since this is a new business rule, not a gap-fill of an existing one —
your call. Options, concretely:
- **Allow** — no change; an Expense/Withdrawal can be dated ahead of today, same as today's behavior.
- **Restrict to today or earlier** — reject a `date` value after today at entry time.
- **Out of scope for this amendment** — leave undecided for now; doesn't block Questions 1–2 or 4.

## Open — Question 4: Should a correction path exist for a locked record?

Once Question 1 is "yes," a real operational question follows:
if a locked Expense turns out to have been entered wrong, what can the
Admin actually do? Spec #8's Future Enhancements already gestures at
one answer ("correction-as-new-record... in the next open period,"
Architecture 7.6's general pattern) but doesn't commit to a mechanism.
Options, concretely:
- **No correction path (spec #8's current language)** — a mistake is only fixable by a new, forward-dated entry referencing what it corrects; nothing about the locked original ever changes. Simplest, matches "closed period = closed" most strictly.
- **Reversal entries** — a signed correction record explicitly linked to the original, still forward-dated, but with a formal link rather than an informal note. More audit-friendly, more to build.
- **Period reopening (admin-only)** — an explicit, logged action that temporarily unlocks a closed period for correction, then re-closes it. Most flexible, but weakens "permanently locks... immutable once recorded" (Architecture 7.6/Principle 2.10) unless reopening itself is tightly scoped and audited — worth being cautious about, given that language is already approved.
- **Decide later** — out of scope for this amendment; Questions 1–2 can be approved and implemented without settling this first, since "no correction path" is already the de facto behavior today (there's no `update*` function at all).

## Decisions Record

| Question | Decision |
|---|---|
| Q1 — Fully immutable closed periods? | **Approved.** Block edit/delete of existing records AND creation of new backdated records inside a closed period. |
| Q2 — Block backdated entries into a closed period? | **Approved** (same decision as Q1 — backdated-entry blocking is how Q1's "fully immutable" is actually enforced). |
| Q3 — Restrict future-dated entries? | **No change.** Future dates remain allowed, same as today's behavior. Unrelated to the closing-lock mechanism; not part of this amendment's implementation. |
| Q4 — Correction path for a locked record? | **Period reopening — admin-only, logged, temporary unlock.** Not "no correction path," and not reversal entries. This is the more flexible, more powerful option, and carries the risk this document flagged: it weakens Architecture 7.6/Principle 2.10's "permanently locks... immutable once recorded" language unless reopening itself is tightly scoped, restricted to Owner (not Manager — see below), and every reopen/re-close is logged as its own `TimelineEvent`, auditable after the fact. |

**Reopening — scope implied by the decision, to be confirmed in the
implementation plan, not assumed here:**
- Who: Owner only. Architecture's existing Manager-`closings`-permission
  gate (BDS #16) governs *recording* a Closing; reopening is a more
  destructive action and this document recommends it not inherit that
  same permission automatically — a Manager granted "can close books"
  is not necessarily a Manager who should be able to *un*-close them.
  This is a recommendation carried into the implementation plan, not a
  fifth question reopened here.
- What happens to the frozen snapshot on reopen: the existing
  `deleteClosing` pattern already establishes the answer architecturally
  — Architecture 8.8 states deleting a Closing "re-opens the period; it
  never edits the frozen figures retroactively." Reopening should follow
  the same shape: the old Closing's snapshot is superseded, not
  retroactively rewritten, and a new Closing is required to re-lock the
  period once corrections are made.
- Every reopen is a `TimelineEvent`, visible on the Business Timeline
  (spec #13), not a silent unlock.

## Explicitly deferred — the `closingId` design question

Per your note, this amendment does **not** decide between Option A
(denormalized `closingId` field), Option B (period-based lookup at
write time, no field), or Option C (`Closing` stores the locked ID
lists). That's an implementation-mechanism choice, not a
business-rule choice, and belongs in the Rule 8 implementation plan
once Questions 1–2 (and optionally 3–4) are answered here.

## What this amendment does *not* do

- Does not change `calculations.ts`, the Business Worth Engine, or the
  Embedded Profit Engine.
- Does not touch Firestore data, `firestore.rules`, or any code.
- Does not change Module #17's status.
- Does not retroactively apply to any already-closed period's existing
  records — only governs behavior going forward, once implemented.

## Next step

Awaiting your decision on Questions 1–2 (recommended: yes/yes) and
Questions 3–4 (open, no default assumed). Once settled, specs #8, #9,
and #11 get their Functional Requirements/Acceptance Criteria sections
amended to match, `docs/specs/README.md` is updated to reflect the
amendment, and only then does a Rule 8 implementation plan (which will
pick the `closingId` mechanism) get written.

## Rule 8 Implementation Assessment — decisions recorded

Three decisions were required before coding, per the Rule 8 assessment:

1. **Lock mechanism: Option B** — `closingId`/`lockedAt` fields on
   Expense/Withdrawal, plus a `ClosedPeriod` lock-index collection so
   `firestore.rules` can independently check a backdated create without
   running a range query (rules can only `get()` a known path — the
   lock-index doc's id is derived deterministically from the period,
   e.g. `monthly:2026-07`).
2. **Historical closings: backfill.** A one-time, idempotent, Owner-only
   `backfillClosingLocks()` migration (exposed in Settings) attaches
   locks/lock-index docs to any pre-amendment Closing that doesn't have
   them yet. This supersedes the "does not retroactively apply" line
   above, which was written before this decision was made.
3. **Reopening: built now**, Owner-only (not covered by a Manager's
   `closings` grant — a Manager who can *record* a Closing is not
   automatically one who can *un*-close one), logged as a `TimelineEvent`,
   and superseding the Closing in place (`status: 'reopened'`) rather than
   deleting it — a Closing is never deleted anymore.

## Implementation status

**Implemented and typechecked/built successfully:**
- `types.ts`: `closingId`/`lockedAt` on Expense/Withdrawal; `status`/
  `reopenedAt`/`reopenedByUid`/`reopenedByName`/`reopenReason` on Closing;
  new `ClosedPeriod` type; new `period-reopened` timeline event type.
- `AppContext.tsx`: `addExpense`/`addWithdrawal` reject a backdated entry
  into an active closed period; `deleteExpense`/`deleteWithdrawal` reject
  deleting a locked record; `recordClosing` now batch-locks every
  Expense/Withdrawal it counted and writes the `ClosedPeriod` lock-index
  doc (chunked at 498 writes); `deleteClosing` replaced by
  `reopenClosing` (Owner-only, logged, supersedes in place, unlocks
  affected records); new `backfillClosingLocks()` migration.
- `firestore.rules`: backdated-create block on `expenses`/`withdrawals`
  via the new `isDateInsideClosedPeriod` function; lock check on
  update/delete; `closings` split so reopening (`update`) is Owner-only
  while recording (`create`) still honors a Manager's `closings` grant,
  and `delete` is now always `false`; new `closedPeriods` collection
  rules.
- UI: `ClosingView.tsx` (reopen modal replacing the old delete button,
  reopened-status badge in history), `ExpenseReport.tsx`/
  `WithdrawalReport.tsx` (lock indicator replacing delete button on
  locked records, confirmation added to the remaining delete path),
  `AddExpenseView.tsx`/`AddWithdrawalView.tsx` (fixed a real bug found
  during implementation — `addExpense`/`addWithdrawal` were called
  without `await`, so a rejected promise, e.g. from the new closed-period
  check, was silently swallowed and the UI showed "success" regardless;
  now properly awaited and caught), `SettingsModal.tsx` (backfill
  migration trigger, updated "Clear All Data" copy).

**A gap found and fixed during implementation, not present in the
original assessment above:** the pre-amendment `closings` Firestore rule
allowed a Manager granted the `closings` permission to delete (and
thereby reopen) any Closing — contradicting decision #3's "Owner-only"
call before it was even implemented. Closed by the `closings` rule split
described above.

**A product-facing behavior change worth a deliberate decision, flagged
rather than silently made:** because a Closing can no longer be deleted
at all, `clearAllData` ("Limpar Todos os Dados") no longer removes
Closing or ClosedPeriod records — attempting to would simply fail
against the rule. Product ownership should confirm whether the
button's copy/promise should be adjusted to reflect that Closings now
survive a full reset by design.

**Not yet done:** `firestore.rules` changes have not been verified
against the Firebase emulator (no network path to Firebase from this
sandbox — only TypeScript/build-level verification was possible here).
This should be run before deploying to production.

