Specification — Proposed Stock Count Amendment

# Stock Count Data-Loss Resilience Specification

**Status:** Frozen — Specification → Implementation authorized. Direction
approved (this session's authorization); a full internal-consistency
review against this document's own §1–§14, `BDR-0009-stock-count-physical-observation.md`,
and `10-stock-counts.md` was completed in two passes — the first
surfaced three findings (a broken §4→§5 cross-reference; an acceptance
criterion requiring emulator-backed testing for a client-side timing
property this repository has no harness for, contradicted by this
exact repo's own precedent handling of the analogous Initial Count
race; an ambiguous "reuse the pattern" phrase that could be read as
authorizing a shared-hook refactor touching the excluded Initial Count
surface) — all three were corrected, and the second pass found no
remaining contradiction or unresolved specification-level decision.
This document itself does not constitute the implementation task — per
this project's established discipline, a separate, formally-scoped
Implementation Task is the next artifact, not code changes issued
directly from this freeze.
**Depends on:** the Investigation filed in this session (not yet a
standalone document; its findings are incorporated directly below
since they are load-bearing); [Stock Counts (spec #10)](./10-stock-counts.md);
[Stock Count Simplification Amendment](./10-stock-counts-simplification-amendment.md);
[BDR-0009 — Stock Count as a Physical Observation Event](./BDR-0009-stock-count-physical-observation.md);
`apps/tenant/src/components/PeriodicStockCountView.tsx`;
`apps/tenant/src/components/InitialStockCountView.tsx`;
`apps/tenant/src/context/AppContext.tsx` (`recordStockCount`,
`saveInitialStockDraft`, `logTimelineEvent`, `triggerTrialActivation`);
`firestore.rules` (`stockCounts`, `stockCountDrafts`).
**Governing product decision (already made, restated not
re-litigated):** this specification addresses exactly two failure
classes, kept explicitly separate throughout — Periodic Contagem Data
Loss (P0) and Finalization Integrity (P1/P0 depending on business
impact) — plus a third input, the Initial Count draft's existing
resurrection defect, used as prior art and a cautionary constraint,
not as a template to copy uncritically.

---

## 1. Purpose

Define a resilience model for the Periodic Stock Count ("Contagem")
workflow so that a 300+ product count survives an interruption
(refresh, tab close, crash, connectivity loss), and so that retrying
after an ambiguous finalization outcome cannot produce a duplicate
`stockCounts` record, a duplicate `timelineEvents` record, or a
duplicate business-visible effect of any kind.

## 1a. The Governing Distinction

Stated first because it governs every decision below:

**"The user's work is durable" and "the final business transaction has
been committed" are two different states, and this specification does
not allow them to share a UI signal.**

"Durable" means: if the browser closes right now, the physically
counted quantities the operator already typed can be recovered. It
says nothing about whether a `StockCount` exists yet, whether it
affected Business Worth, or whether a timeline event was logged.
"Committed" means the opposite: the `stockCounts` document exists,
under the governance of `firestore.rules`, and downstream calculations
now see it. A UI that shows one green checkmark for both collapses a
recoverable local/durable-draft state into a finalized-business-event
state, which is precisely how confidence in the app's data integrity
erodes. Every state defined in Section 4 exists to keep this
distinction visible to the operator, not just correct internally.

## 2. Scope — the two failure classes, and the one piece of prior art

**Class 1 — Periodic Contagem Data Loss (P0).** Confirmed by
investigation: `PeriodicStockCountView.tsx` holds every row —
catalog-derived and manually added alike — only in React state. There
is no Firestore draft, no `localStorage`, no `IndexedDB` write
anywhere in the component. An interruption erases the entire count,
however many products had already been entered. There is currently no
recovery mechanism.

**Class 2 — Finalization Integrity (P1/P0).** Confirmed by
investigation: `recordStockCount`'s periodic branch assigns a new
random document id (`'stockcount-' + Date.now() + ...'`) on every
call, with no idempotency key. An ambiguous network outcome (server
commits, client sees a failure, operator retries) can therefore
produce a second `stockCounts` document for the same physical count.
`logTimelineEvent` is independently non-idempotent (random id, no
dedup, called outside the finalization batch). `triggerTrialActivation`
is idempotent at the server (`trial_pending → trial_active` is a
one-way transition, a second call is a no-op) but the *attempt* itself
is not deduplicated client-side.

**Prior art — Initial Count draft resurrection race, used as a
constraint, not a pattern to copy.** `InitialStockCountView.tsx`'s
autosave effect debounces on `[rows, date, draftLoaded,
hasInitialStockCount]`, omitting `isSaving` and `savedMessage` from
its dependency array. A debounce timer already pending when
confirmation begins is never cancelled, and can fire `setDoc` on the
draft *after* the same draft has already been deleted by the
finalization batch — resurrecting it.

**The existing Initial Count autosave implementation demonstrates a
known late-write resurrection failure mode and must not be copied
without explicit race protection.** This is a known, currently unfixed
defect in the existing Initial Count workflow. **Fixing
`InitialStockCountView` is explicitly out of scope for this
specification** (restated in Section 12) — if it is fixed later, that
is a separate, separately-authorized task. It is cited here solely
because Section 6's design for the periodic draft's autosave lifecycle
must not reproduce the same class of bug.

## 3. Terminology

- **Draft** — the durable, pre-finalization, per-count persisted
  record of what the operator has typed so far. Never itself a
  `StockCount`. Never read by any valuation calculation (same
  invariant `stockCountDrafts/initial` already holds today).
- **Finalization** — the single, authoritative operation that turns a
  confirmed tally into a permanent `StockCount` document, a timeline
  event, and a trial-activation attempt.
- **Submission identity** — a stable identifier, generated once,
  shared by every retry of the same logical finalization attempt (see
  Section 7).
- **Committed** — a `StockCount` document exists in Firestore under
  that submission's identity. Nothing before this point may be
  represented to the operator as committed.

## 4. Draft Lifecycle State Model

The periodic draft's save status must be modeled as an explicit,
mutually exclusive state, surfaced to the operator distinctly from
finalization status (Section 1a):

- **`editing`** — local changes exist that have not yet been
  acknowledged as persisted by Firestore. Default state whenever the
  working list differs from the last-acknowledged persisted draft.
- **`saving`** — a persist operation for the current content is
  in flight, not yet acknowledged.
- **`saved`** — Firestore has acknowledged the write that matches the
  currently-displayed content. Never set optimistically, never set
  before the write's promise resolves — this requirement holds for
  every state transition into `saved`, with no exception, and is
  restated for finalization status specifically in Section 8b.
- **`save-failed`** — the most recent persist attempt was rejected or
  errored. The operator's in-memory rows are the source of truth in
  this state (never discarded), and the UI must surface this state
  distinguishably from `saving`, not silently retry-and-hide it.

This state governs the draft only. Finalization has its own separate
status (Section 8) and the two must never be rendered as if they were
the same signal.

## 5. Durable Periodic Draft Persistence

- A new draft document, analogous to `stockCountDrafts/initial`, under
  the same `stockCountDrafts` collection (no rules change required —
  see Section 11). Doc id and per-user vs. per-business scoping is an
  open implementation-task decision (Section 13), constrained by:
  periodic `stockCounts` creation is already Owner-only at the rules
  layer today (`firestore.rules` line 441, no type-specific carve-out),
  so the draft does not need to support concurrent multi-user editing
  of the same periodic count.
- Content: every catalog row (including `removed` ones — Section 9)
  and every manual row (Section 10), plus `type`, `label`, `date`, and
  the draft's own submission identity (Section 7).
- Write pattern: reuse the existing whole-document-overwrite +
  debounce *design* already proven by `saveInitialStockDraft` /
  `savePurchaseDraft` — i.e. the same general shape (debounce, then
  overwrite the whole draft document) — but as a **new,
  periodic-count-specific mechanism** (e.g. its own function, analogous
  in shape to `saveInitialStockDraft` but not the same code path). This
  specification does **not** authorize extracting `saveInitialStockDraft`,
  `InitialStockCountView`, or any other existing draft implementation
  into a shared hook/utility consumed by both the initial and periodic
  workflows — doing so would mean modifying the initial workflow's own
  code, which Section 12 excludes. "Reuse the pattern" means design
  precedent only, never code sharing with the excluded surface.
  Section 6 separately covers why this must not simply copy the
  existing debounce *effect wiring*, only its overwrite/debounce
  *strategy*.
- No item ever autosaves as blank-coerced-to-zero, or vice versa —
  this specification does not relax BDR-0009 Part 6 for the draft
  state; it explicitly reaffirms it (already stated once in the
  Simplification Amendment's Part 3, restated here because the draft
  mechanism is new since that amendment was written).

## 6. Recovery, and Explicit Protection Against Resurrection

- **Recovery after refresh/crash/tab close:** on mount, if a draft
  exists for the active business (and, depending on Section 13's
  scoping decision, the active user), it is offered to the operator as
  an explicit resume point — never silently auto-loaded over a blank
  form without the operator's awareness that recovered data is being
  shown.
- **Resurrection protection (the specific defect named in Section 2)
  must be closed by design, not by convention:** the autosave
  mechanism for the periodic draft must make it structurally
  impossible for a write scheduled before finalization began to land
  after finalization has deleted or superseded the draft. This means,
  at minimum, that any in-flight or pending draft-save operation is
  either awaited-and-superseded or actively cancelled before the
  finalization write is issued — not merely gated by a state variable
  that a stale closure can bypass, which is the exact shape of the
  existing Initial Count bug. The Implementation Task must include an
  explicit design step verifying this property against the concrete
  bug described in Section 2, not merely asserting the new code "looks
  different."
- Draft cleanup on successful finalization is atomic with the
  `stockCounts` write, in the same Firestore batch/transaction — same
  invariant `recordStockCount` already holds for the initial count
  today (Section 2's prior art), extended to periodic counts.

## 7. Stable Submission Identity

- A submission identity (client-generated, e.g. a UUID) is created
  once, at the moment the operator moves from editing into the
  mandatory Counted/Not-Counted confirmation step (the existing
  `pendingTally` step, `PeriodicStockCountView.tsx` lines 210–235),
  and is persisted as part of the draft from that point forward.
- Every retry of the same logical "Confirmar Contagem" action reuses
  this same identity — it is not regenerated per network attempt.
- The identity is discarded (a new one generated) only if the operator
  explicitly backs out of confirmation and materially edits the tally
  before reconfirming — matching the existing "last-second edit wins"
  principle already established and tested for the Initial Count
  (`tests/initial-stock-confirmation.test.ts`).

## 8. Idempotent Finalization — Exactly-Once Logical Effect

### 8a. The Invariant (non-negotiable, specification-level — mechanism is open, this requirement is not)

**A periodic count may be finalized only once per logical submission
identity. Any retry — including one following an ambiguous
client/network outcome, where the server may have already committed
the write before the client observed a failure — must converge on the
same logical finalization. It must not create a second `stockCounts`
record or a second `timelineEvents` record, and must not cause a
harmful duplicate trial-activation transition.**

This is a business/data-integrity requirement, stated here because it
must hold regardless of which mechanism the Implementation Task
chooses to satisfy it with. The Implementation Task may choose among
(non-exhaustive, and not a ranking):

- a deterministic document id derived from the submission identity;
- a stored submission id checked before writing;
- a Firestore transaction with a precondition;
- an existence check preceding the write;
- another mechanism, if it is shown to satisfy Section 8a as stated.

Whichever mechanism is chosen, it must produce the property in Section
8a as its observable outcome — see Section 8b for what "converge" is
required to mean precisely, and what it is deliberately not required
to mean.

### 8b. Required Observable Outcome, Not Literal Cross-Collection Atomicity

Firestore can genuinely provide atomic, all-or-nothing commitment for
the `stockCounts` write and the draft-cleanup delete when both are
queued on the same batch — the same guarantee `recordStockCount`
already relies on for the `initial` count today (Section 2). This
specification requires that same literal batch-atomicity between the
periodic `stockCounts` write and its draft-cleanup delete.

`timelineEvents` and `triggerTrialActivation`, however, are not
required to be written inside that same atomic batch — the existing
codebase does not do this for any write path, and this specification
does not mandate re-architecting that. **What this specification
requires instead is the observable outcome:** repeated execution of
the same logical submission — however many client retries, partial
failures, or ambiguous outcomes occur along the way — must converge to
exactly one business count, exactly one corresponding timeline event,
and no harmful duplicate trial-activation transition. The mechanism
achieving that convergence (e.g., deriving the timeline event's
document id from the same submission identity so a duplicate write is
a harmless overwrite rather than a second document; gating the
trial-activation call on finalization having determined this was the
first successful commit) is an Implementation Task decision, not
specified here. The distinction matters: this specification does not
promise database-level atomicity across all three side effects, only
that their combined, retried, end-to-end result is indistinguishable
from having finalized exactly once.

- Finalization status shown to the operator (`saving` /
  `saved`/committed / `save-failed`, distinct from the draft's own
  Section 4 states) must not report success until the `stockCounts`
  commit described in this section has actually been acknowledged by
  Firestore — no optimistic "Contagem registada com sucesso!" before
  that acknowledgement.

## 9. Catalog Products Removed Mid-Count

No behavior change from the existing, already-approved semantics
(Simplification Amendment Part 10, `handleRemoveCatalogRow`): a
removed row stays `removed: true`, resolves to Not Counted, and is
never dropped from the working list entirely. This specification's
only addition is that this `removed` flag must itself be part of the
durable draft (Section 5) — today it exists only in memory and is lost
on interruption exactly like every other row.

## 10. Manually Added (Non-Catalog) Products

No behavior change to how a manual row is entered or tallied. This
specification's only addition is the same as Section 9: manual rows
must be part of the durable draft, not memory-only.

## 11. Security Rules

No new `firestore.rules` block is anticipated. The existing
`stockCountDrafts` match block (`firestore.rules` lines 455–464) is
already generic over `{draftId}` and already Owner-only at every tier
— it was written to cover `stockCountDrafts/initial` specifically, but
its rule text does not special-case that id. If Section 13's scoping
decision lands on a doc id/collection shape that fits within this
existing generic rule, no rules change is required at all; if it does
not (e.g. a nested subcollection design), that divergence must be
called out explicitly in the Implementation Task rather than assumed.

## 12. Explicit Non-Goals (Implementation Boundary)

This specification does not authorize, and the Implementation Task
derived from it must not include:

- Any change to the existing `initial` Stock Count workflow, including
  the resurrection defect named in Section 2. That defect is used here
  strictly as prior art / a constraint on the periodic draft's design
  — fixing `InitialStockCountView` itself requires separate
  authorization and, if authorized, its own narrowly-scoped task.
- `IndexedDB` or any browser-level offline-persistence layer
  (`enableIndexedDbPersistence` / `persistentLocalCache` or
  equivalent) — confirmed absent from the codebase today (investigation,
  `apps/tenant/src/lib/firebase.ts`); introducing one is a separate
  decision.
- Any app-wide navigation guard (e.g. a global "you have unsaved
  changes" `beforeunload`/router interceptor).
- Any invented business rule beyond what BDR-0009 and the
  Simplification Amendment already establish — in particular, no
  item-level expected-quantity, no inferred sales quantity, no new
  variance figure.
- Any change to `addMultipleStockBatches` / `purchaseDrafts`, which
  share a structurally similar random-id/non-idempotent pattern
  (investigation, Section "idempotency") but are explicitly out of
  scope for this task.

## 13. Explicitly Left Open (for the Implementation Task to resolve, not this specification)

- Exact `stockCountDrafts` document id/scoping for the periodic draft
  (per-business singleton like `initial`, vs. some other shape) —
  constrained by Section 11's preference to avoid a rules change if
  possible.
- Exact debounce interval and write-coalescing strategy for 300+ rows
  (starting point: the existing 800ms pattern, Section 5), including
  confirming the resulting document stays comfortably under
  Firestore's 1 MiB document-size ceiling at 300+ rows — a sizing
  check, not a design decision, and one the Implementation Task must
  perform explicitly rather than assume.
- Exact mechanism for "has this submission identity already been
  committed" (Firestore transaction read-before-write vs. a
  `create`-only rule analogous to the `initial` type's, vs. another
  approach) — Section 8 specifies the required property, not the
  mechanism.
- Exact stale-draft UI copy/resume-or-discard interaction pattern.

## 14. Required Regression Coverage — Non-Negotiable Acceptance Criteria

These are acceptance criteria, not a suggestion that "test coverage
should exist somewhere." Verification is not complete until each of
the following is proven, at the test tier the repository can actually
support today — no new component-test harness (jsdom/testing-library/
React-DOM or equivalent) is authorized by this specification. This
repository has two distinct existing test tiers, not one, and this
section does not conflate them:

- **Firestore-emulator-backed tests** (`tests/firestore-rules.test.ts`,
  `npm run test:rules:emulator`) — genuinely exercise real Firestore
  behavior (rules, writes, transactions) against a live emulator. Used
  wherever a requirement is actually a Firestore-level property.
- **Source-level regression guards** (`tests/initial-stock-confirmation.test.ts`)
  — this repo's own documented, deliberate choice for client-side
  timing/ordering properties that a live-Firebase-client-SDK-coupled
  function can't be exercised against without a component-test harness
  this repo does not have (see that file's own header comment). This
  specification adopts the same choice for the same class of property,
  rather than requiring new test infrastructure to do otherwise.

1. **Late draft write after finalization → draft remains deleted.**
   A draft-save scheduled (e.g. an in-flight debounce timer) before
   finalization begins must not be allowed to land after finalization
   has already completed and deleted/superseded the draft. This is a
   client-side timing/ordering property, the same class already
   covered for the Initial Count by `tests/initial-stock-confirmation.test.ts`'s
   source-level regression guards (e.g. its ordering assertions on
   `fsBatch.commit()` and the surrounding queue/cancel calls) — this
   criterion is satisfied by an equivalent source-level regression
   guard against the periodic mechanism's actual code (asserting the
   pending-save-is-cancelled-or-superseded-before-the-finalization-write
   property directly in source, not merely asserting the new code
   "looks different" from the Initial Count bug by unstructured
   inspection). A true behavioral/timing test against a live component
   is not required and is not authorized by this specification, per
   the boundary stated above.
2. **Ambiguous commit + retry → exactly one logical result.** This is
   a genuine Firestore-level property — does exactly one `stockCounts`
   document, exactly one `timelineEvents` document, and no harmful
   duplicate trial-activation transition exist after the same
   submission identity is committed and then retried — and must be
   proven with a real Firestore-emulator-backed test, matching
   `tests/firestore-rules.test.ts`'s tier, not the source-level tier
   used for item 1. Simulate the server committing the write while the
   client observes an ambiguous/failed outcome, then retry the same
   submission identity against the emulator; assert the resulting
   document count and content directly. This proves Section 8a's
   invariant behaviorally, not merely asserting idempotency in
   principle.
3. The draft persists and is recoverable across a simulated
   reload/remount with 300+ rows, including `removed` catalog rows and
   manually added rows.
4. A blank quantity is never coerced to zero, and a zero quantity is
   never coerced to blank, at any point in the draft-save/recovery
   path (extends the existing coverage in
   `tests/stock-count-simplification.test.ts`, which today only covers
   the in-memory tally, not persistence/recovery).
5. Security-rules coverage for whatever document shape Section 13
   resolves to, following the existing pattern in
   `tests/firestore-rules.test.ts`'s `stockCountDrafts` block —
   Owner-only read/create/update, delete never subscription-gated.
6. The existing Initial Count test suite
   (`tests/initial-stock-confirmation.test.ts`) is unaffected — this
   work must not regress it, per Section 12's non-goal.

---

**This document is a specification, not an implementation task.** It
defines required properties and explicit boundaries; it does not
prescribe file-by-file code changes. Per this project's established
discipline, review and freeze happen next, and a separate
Implementation Task is derived from the frozen version of this
document before any code is written.
