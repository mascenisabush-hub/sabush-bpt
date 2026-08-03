# Module #20 (Notifications) — Phase 3 (Background Worker Scheduled Triggers) Rule 8 Assessment

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Implementation Plan review, per `CLAUDE.md`'s Rule 8 process.
Planning and governance-consistency review only. **Does not authorize
implementation.**
**Lifecycle status:** Designed → **Assessed**. Not Implemented, not
Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision.
**Phase:** Module #20, Phase 3 — Background Worker Scheduled Triggers
(Closing-overdue, Inventory-risk, Subscription-notification companion
writes), per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9. Follows a closed-out Phase 1 (Foundations) and a closed-out Phase 2
(Privileged-Server Creation Path).
**Basis (independently re-verified against the current repository, not
assumed from any prior session):** [`20-notifications.md`](../specs/20-notifications.md)
(v1.2, Accepted), the [Enhancement Amendment](../specs/20-notifications-enhancement-amendment.md)
(v1.1) and [Category Amendment](../specs/20-notifications-category-amendment.md)
(v1.2), [POL-20-001](../specs/20-pol-001-notification-retention-policy.md),
[ADR-0002](../adr/ADR-0002-platform-background-worker.md),
[ADR-0003](../adr/ADR-0003-background-worker-job-registration.md),
[ADR-0004](../adr/ADR-0004-notification-platform-architecture.md),
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9 (Phase 3 definition), [`20-phase1-closeout.md`](./20-phase1-closeout.md),
[`20-phase2-closeout.md`](./20-phase2-closeout.md),
[`20-milestone-review-phases-1-2.md`](./20-milestone-review-phases-1-2.md),
[`platform-engineering-governance-standard.md`](./platform-engineering-governance-standard.md),
`README.md`, `HANDOFF.md`, and the current `src/`, `server/`,
`firestore.rules`, `firestore.indexes.json` state as of a fresh clone at
commit `8c9599d` ("docs(adr): accept ADR-0003 and ADR-0004").

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, or any `docs/specs/*`/`docs/architecture/*`/
`docs/adr/*` file to produce this document.**

---

## 0. Scope Boundary for This Assessment

Per the Implementation Plan §9 and the two ADRs that now govern this
phase, Phase 3 is: extending the shared Background Worker with new,
independently registered job types that detect Closing-overdue,
Inventory-risk, and Subscription-state events on a schedule, and hand
each off to become a `notifications` document.

**Explicitly out of scope, unaffected by this assessment:**

- Phase 4 (Tenant User Experience beyond the existing bell dropdown),
  Phase 5 (Payment Webhook Creation Path — separately blocked on
  Module #19's own Commercial Integration phase), Phase 6 (Email/
  WhatsApp/future channels).
- Any change to Phase 1/2's already-shipped, already-closed scope
  (`NotificationContext`, `Header.tsx`, `DeliveryChannel`/`InAppChannel`,
  the five `/api/staff/*` producer call sites).
- Re-deciding Decision Gates 1–4 or any Business Rule in
  `20-notifications.md` — none are reopened here.
- Module #18 (SuperAdmin) recipient work, Module #15 (AI) event types —
  ADR-0004 names both as future, not this phase's responsibility.

---

## 1. Fresh Repository Verification

Confirmed by independent clone and direct inspection (not assumed from
`20-phase2-closeout.md`'s or `20-milestone-review-phases-1-2.md`'s own
text) — current `main` tip: `8c9599d`, working tree clean.

**Confirmed present:**

| Component | Location | State |
|---|---|---|
| `Notification`/`NotificationCategory` (5 values incl. `staff`)/`NotificationPriority`/`NotificationScope` types | `src/types.ts` (~L436–508) | Matches 20.1 field-for-field, as amended by v1.2 |
| `NotificationContext`, `DeliveryChannel`/`InAppChannel`, `firestore.rules` `/notifications/{id}` block, two composite indexes | `src/context/`, `src/lib/notifications/`, `firestore.rules`, `firestore.indexes.json` | Unchanged since Phase 1 close-out |
| `writeNotification()` / `validateNotificationPayload()` | `server/index.ts` (~L1268–1361) | Exists; validates schema shape including `context`/`priority`; writes via Admin SDK to `db.collection('notifications').doc()` — **auto-generated document ID**, no dedupe-key-based existence check anywhere in this function |
| Five `/api/staff/*` endpoints calling `writeNotification()` directly, with hardcoded Portuguese `whatHappened`/`whyItMatters`/`recommendedAction` strings | `server/index.ts` (5 call sites, e.g. ~L308–332) | Phase 2, closed, confirmed unchanged |
| `runTrialLifecycleSweep()` | `server/index.ts` (~L1156–1219) | A single hardcoded async function, invoked via one `setTimeout` + one `setInterval`. Idempotency achieved by a **transaction-based state re-check on the `subscriptions/{businessId}` document itself** (re-reads `status`/`trialEndsAt` inside the transaction before transitioning) — **not** a dedupe-key/watermark mechanism against a separate state collection. |

**Confirmed absent — this is the central finding of this assessment:**

- **No job-registration interface exists anywhere in the codebase.**
  ADR-0003 defines `registerJob({ jobType, schedule, execute,
  dedupeKeyFn, retryPolicy })` as the mechanism through which any *new*
  job type must be added. No such function, registry, or scaffolding
  exists in `server/index.ts` or anywhere else. `runTrialLifecycleSweep()`
  remains exactly what ADR-0003's own "Context" section describes as
  the failure mode to avoid if extended by "another hardcoded branch."
- **No `platform_worker_state` collection, no per-job dedupe-key check,
  no watermark tracking exists anywhere** — confirmed by repository-wide
  grep. Architecture §4.8.1, cited throughout `20-notifications.md`,
  every prior Phase's governance documents, and both new ADRs as an
  "existing mechanism... reused rather than reinvented," has in fact
  **never been implemented**. `writeNotification()` performs zero
  existence-check before writing; a second call with an identical
  `dedupeKey` today would silently create a second, duplicate
  `notifications` document. This has been low-risk so far only because
  Phase 2's producers are each triggered exactly once per
  already-server-verified HTTP request, never by a re-scanning sweep —
  Phase 3 is the **first** point where this gap has real consequences.
- **No `BusinessEvent` type, producer registry, template registry, or
  Notification Platform layer exists anywhere.** ADR-0004 Decisions 1
  and 5 require producers to emit a structured `BusinessEvent` and never
  construct notification text directly, with template resolution and
  localization (`LanguageContext`/`t()`) owned centrally. Today,
  `writeNotification()`'s only caller pattern (Phase 2's five staff
  endpoints) does the opposite: each endpoint constructs final,
  hardcoded-Portuguese `context` strings and calls `writeNotification()`
  directly — no `BusinessEvent`, no template, no `t()` call anywhere in
  the notification-content path.
- No Closing-overdue, Inventory-risk, or Subscription-companion
  detection logic exists anywhere in `src/` or `server/` — confirmed, as
  the Implementation Plan itself already expected ("no existing
  'overdue' or 'discrepancy' logic exists anywhere today to wire onto").

### 1.1 Governance Contradiction Check

This is where the assessment differs materially from Phase 2's: two
new Accepted ADRs, both scoped explicitly to Phase 3, were adopted
*after* `20-notifications.md` (v1.2), the Enhancement Amendment, and
the Implementation Plan were last written — and neither the spec nor
the Plan has been amended to reflect them.

**Contradiction 1 — ADR-0003 vs. the Implementation Plan's own Phase 3
wording.** `20-notifications-implementation-plan.md` §9, Phase 3, reads
verbatim: *"Extend `runTrialLifecycleSweep()`'s process with new job
types (not a second process)"* — written before ADR-0003 existed, and
describing exactly the informal, hardcoded-branch-inside-one-function
shape ADR-0003 was written to replace. ADR-0003 states plainly that
*any new job type... is added through this registration interface, not
as another hardcoded branch alongside it.* The Implementation Plan has
not been updated to reference `registerJob()` at all. Per the Platform
Engineering Governance Standard §5, a phase breakdown that now differs
from what an already-Planned Implementation Plan describes is itself a
Stage 6 amendment requiring explicit Product Architect flagging — not
something this assessment can silently resolve by picking one wording
over the other.

**Contradiction 2 — ADR-0004 vs. the Accepted spec's own data model and
Phase 2's shipped implementation.** `20-notifications.md` §20.1 (Accepted,
v1.2) still specifies that a `notifications/{id}` document's `context`
and `priority` are simply present on the document — consistent with
producers populating them directly, which is exactly what Phase 2's
five endpoints do today (confirmed §1, above). ADR-0004 Decisions 1 and
5 establish, as an Accepted architectural decision, that this is no
longer the intended shape going forward: producers must emit
`BusinessEvent`s only, and a not-yet-built Notification Platform layer
(template registry + existing `LanguageContext`/`t()`) must own turning
that into a persisted, localized notification. ADR-0004 explicitly
states it *"does not modify the Module #19, #20... specifications"* —
so the spec's 20.1 schema and Phase 2's shipped code are not
retroactively wrong, but they are now **architecturally superseded for
future producers without the spec itself saying so**. Nothing in
`20-notifications.md`, its amendments, or the Implementation Plan
mentions `BusinessEvent`, a template registry, or routing new content
through `LanguageContext`/`t()`. A Phase 3 producer built strictly to
satisfy the Accepted spec's own 20.1 schema (as Phase 2's producers
were) would directly contradict ADR-0004's Decision 1; a Phase 3
producer built strictly to satisfy ADR-0004 would require building
infrastructure (a template registry, localization wiring for
notification content, a communication-policy evaluation step) that no
approved Functional Requirement, Implementation Plan section, or Rule 8
scope currently describes or budgets for.

**Neither contradiction is resolved by this assessment.** Both are
flagged per Rule 8's purpose — surfacing exactly this kind of gap
before coding starts, not after — and per this repository's own stated
practice of stopping and explaining a conflict rather than silently
picking a side.

**Other checks:**

- `docs/specs/README.md`'s Module #20 row still reads "Phase 2
  (Privileged-Server Creation Path) not yet authorized" — **stale**;
  Phase 2 is closed (`20-phase2-closeout.md`). `HANDOFF.md`'s "Right
  now" section describes Module #19 Phase 1 as the current status and
  does not mention ADR-0002/0003/0004, Module #20 Phase 2, or any
  Module #20 governance artifact at all — substantially stale relative
  to the actual repository history. Neither file is edited by this
  assessment, per instruction; both are flagged as documentation debt,
  consistent with this repository's recurring, already-named failure
  mode (Governance Standard §4.5).
- POL-20-001, ADR-0002, the Category Amendment, and the two Phase
  close-outs remain internally consistent with each other and with the
  verified repository state above — no further contradiction found
  among those.

---

## 2. Producer Inventory (What Phase 3 Must Actually Build)

Three independent detection producers, per the Implementation Plan §9
and the three source specs:

| Producer | Source spec | Detection logic status | Notes |
|---|---|---|---|
| **Closing-overdue** | Monthly Closings (#11) | None exists; spec #11 itself states overdue reminders are "architecturally planned, not yet buildable" and names no exact day-count threshold | Closings live at `businesses/{businessId}/closings/{id}` — a **per-business subcollection**, not a flat top-level collection. Unlike `subscriptions` (flat, one `where`-filtered query), detecting "overdue" requires reasoning about the *absence* of a closing for the current period across every business — a collection-group query plus a positive definition of "due," neither of which exists today. |
| **Inventory-risk** | Stock Counts (#10), Breakages (#7) | None exists; no numeric discrepancy/risk threshold defined in either spec | Same subcollection-per-business shape as Closings — same collection-group query design gap. |
| **Subscription-companion** | Subscriptions (#19) | `runTrialLifecycleSweep()` already detects `trial_active → trial_completed` (expiry) via a flat top-level query; a **"trial ending soon"** notification (as distinct from "expired") requires a *new* threshold (e.g., N days before `trialEndsAt`) that is defined nowhere in `19-subscriptions.md` or its POL series today | Structurally the easiest of the three — reuses an existing flat-collection query shape — but still needs at least one new business-parameter decision (the "ending soon" threshold) before it can be built, and needs a second `notifications` write added alongside the existing `platform_audit_log` write, per the Implementation Plan's own §9 description. |

All three are explicitly named in the spec's own "Explicitly Left Open"
section as implementation parameters, not scope decisions — this is an
anticipated gap, not a surprise. It is listed here because Phase 3 is
the point at which these parameters stop being deferrable.

---

## 3. Background Worker Alignment (ADR-0002)

**Aligned.** ADR-0002's core resolution — "extend, not introduce," one
shared worker process rather than a second parallel one — is not in
tension with anything found in this review. `runTrialLifecycleSweep()`
remains the worker's only real instance today, exactly as ADR-0002's
"Relationship to Existing Implementation" section describes.

**Not yet concretely implemented:** ADR-0002 itself defers the "how" to
ADR-0003 (§ "Future Considerations"), which is where the actual
job-registration mechanism lives — and, per §1.1 above, that mechanism
does not exist in code yet and is not reflected in the Implementation
Plan's own Phase 3 wording.

---

## 4. BusinessEvent Alignment (ADR-0004, Decisions 1–3)

**Not aligned — nothing to align yet.** No `BusinessEvent` type,
producer contract, or in-process representation exists anywhere in
`src/` or `server/`. Building Phase 3's three producers to actually
satisfy ADR-0004 (emit a `BusinessEvent`, never notification text
directly) requires designing and implementing this contract for the
first time, in the same phase that also has to build the
job-registration interface (§3) and the dedupe/watermark mechanism
(§5) — none of which is currently scoped as Phase 3 work in the
Implementation Plan, which still describes producers writing
`notifications` documents directly (matching the older 20.1 schema, not
ADR-0004's producer/BusinessEvent split).

---

## 5. Notification Platform Alignment (ADR-0004, Decisions 4–5)

**Not aligned — the platform-side half of ADR-0004 (communication
policy, template resolution routed through the existing
`LanguageContext`/`t()`) has zero implementation.** `writeNotification()`
is the closest existing artifact, and it does the opposite of what
Decisions 4–5 describe: it accepts a fully-formed payload (including
final `context` strings) from the caller and persists it unconditionally
— no policy evaluation (notify/suppress/batch), no template lookup, no
localization step. Building this platform-side layer for the first time
is a materially larger undertaking than "three new detection jobs,"
and is not sized, scoped, or budgeted anywhere in the current
Implementation Plan.

---

## 6. Delivery Channel Alignment (ADR-0004 Decision 8, Decision Gate 3)

**Aligned, no new work implied.** `DeliveryChannel`/`InAppChannel`
already exists (Phase 1) and ADR-0004 explicitly reinforces it rather
than redesigning it. Phase 3 producers, whatever their final shape,
would flow through the existing interface unchanged — this is the one
area of this review with no open question.

---

## 7. Implementation Risks

| # | Risk | Impact | Notes |
|---|---|---|---|
| 1 | **Dedupe/watermark mechanism does not exist.** §4.8.1, cited everywhere as "existing," has never been built. A recurring scheduled sweep (unlike Phase 2's one-shot HTTP-triggered writes) will produce duplicate `notifications` documents on every crash-and-restart without it. | **High** | Must be designed and built in this phase — Architecture §4.8.1 offers two candidate mechanisms (dedupe key as document ID, or a separate `platform_worker_state/{jobType}` document) without choosing between them for this codebase; that choice is still open. |
| 2 | **Job-registration interface does not exist.** ADR-0003 is Accepted but unimplemented; the Implementation Plan's own Phase 3 wording still describes the pre-ADR-0003 "extend the one function" approach. | **High** | Building three job types directly into `runTrialLifecycleSweep()` as hardcoded branches — the literal current wording of the Plan — would contradict an Accepted ADR the moment it's written. Building the full registration interface first is materially more engineering scope than the Plan currently accounts for. |
| 3 | **BusinessEvent / Notification Platform layer does not exist.** ADR-0004 Decisions 1–5 are Accepted but unimplemented, and conflict with the spec's own 20.1 schema and Phase 2's shipped precedent (§1.1, Contradiction 2). | **High** | Undecided whether Phase 3 producers must satisfy ADR-0004 in full (larger scope, first-of-its-kind platform layer) or continue Phase 2's direct-write pattern (smaller scope, but a documented ADR violation from the moment it ships). |
| 4 | **Collection-group query design for Closing/Inventory producers.** Both source domains are per-business subcollections, not flat top-level collections — a materially different (and more expensive at scale) query shape than Module #19's existing worker precedent, with no existing composite index. | Medium | No index exists yet (confirmed, `firestore.indexes.json`); a collection-group query and its supporting index design is new work this phase has not previously had to do. |
| 5 | **Detection-threshold parameters undecided.** Overdue-Closing day-count, Inventory-risk criteria, and a new "trial ending soon" threshold (distinct from existing trial-expiry) are all undefined in any Accepted spec or POL. | Low–Medium | Explicitly anticipated by the spec's own "Explicitly Left Open" section — not a surprise, but still blocking for coding until decided. |
| 6 | **i18n gap widened, not narrowed, if Phase 3 follows Phase 2's precedent.** Phase 2's five notification producers hardcode Portuguese `context` strings, bypassing `LanguageContext`/`t()` — a second instance of exactly the gap ADR-0004 names (`BusinessProfileSetupModal.tsx`) as one to avoid repeating. If Phase 3 copies Phase 2's pattern for expediency, the platform now has notification content in three more places that don't localize, compounding rather than resolving the gap ADR-0004 exists to close. | Medium | A Product Architect / Rule 8 decision, not an engineering judgment call, per this repository's own discipline. |

---

## 8. Testing Risks

- **No existing test precedent for a recurring, multi-job-type
  scheduled worker.** `tests/staff-notifications.test.ts` (Phase 2) is
  structural/static and covers one-shot HTTP-triggered writes only; it
  has no equivalent for "simulate two scheduled runs and assert exactly
  one notification per real event" — new test infrastructure, not an
  extension of existing suites.
- **Firestore emulator dependency, unresolved.** Both Phase 1 and Phase
  2 close-outs flag the same standing gap: this sandbox cannot reach
  `storage.googleapis.com`, so any collection-group query or new
  composite index this phase introduces cannot be verified end-to-end
  here — a manual local/emulator step would remain outstanding, same as
  every prior phase.
- **Regression risk to `runTrialLifecycleSweep()` itself.** If the
  existing Trial Lifecycle job is migrated onto whatever registration
  interface Phase 3 builds (ADR-0003 calls this "a reasonable, low-risk
  follow-up," not a requirement), its existing transaction-based
  idempotency behavior must be re-verified, not assumed preserved by
  the migration.

---

## 9. Architecture Risks

- The two contradictions in §1.1 are architecture-level, not
  implementation-level, risks: proceeding to code against either the
  spec's literal 20.1 schema or the Implementation Plan's literal Phase
  3 wording would each independently put a real commit in conflict with
  an Accepted ADR the moment it lands.
- Building the full ADR-0003 + ADR-0004 machinery (job registry,
  dedupe/watermark, BusinessEvent contract, template/localization layer)
  as a prerequisite to three notification producers is a materially
  larger and more foundational undertaking than "Phase 3: three new job
  types," which is how every existing governance document (Implementation
  Plan §9, both Phase close-outs, the Milestone Review) still describes
  it. This mismatch in perceived scope is itself worth surfacing to the
  Product Architect before an Implementation Plan amendment or a
  Phase 3 coding authorization is drafted.

---

## 10. Expected Runtime Files (If and When Phase 3 Is Authorized)

Not an authorization list — an inventory of what this phase would
plausibly touch, for the Product Architect's own scoping judgment:

- `server/index.ts` — new job-registration scaffolding (if ADR-0003 is
  to be honored), three new detection functions, extension or
  replacement of `runTrialLifecycleSweep()`'s registration.
- Possibly a new module (e.g., `server/backgroundWorker.ts` or
  equivalent) if the registration interface is built as its own file
  rather than inline in `server/index.ts` — not decided by any existing
  document.
- `firestore.indexes.json` — new collection-group indexes for Closings
  and Stock Counts/Breakages subcollection scans.
- Possibly new type definitions (`BusinessEvent`, a job-registration
  contract type) in `src/types.ts` or a new server-side-only type file,
  depending on how far this phase goes toward ADR-0004 compliance.
- `docs/specs/19-subscriptions.md` or a new POL, if a "trial ending
  soon" threshold requires a formal parameter decision (per that spec's
  own precedent for POL-19-002's "thirty days").

---

## 11. Expected Non-Changes

- `NotificationContext`, `Header.tsx`, `DeliveryChannel`/`InAppChannel`
  — unaffected; Phase 3 is producer-side only (§6, above).
- The five `/api/staff/*` endpoints and Phase 2's shipped notification
  calls — not touched by this phase unless the Product Architect
  separately decides to retroactively migrate them (§7, Risk 3/6).
- `firestore.rules`'s `/notifications/{id}` block — Phase 3 adds
  writers (server-side, Admin-SDK, same as Phase 2), not new client
  read/write surface; no rules change is implied by anything in this
  review.
- Decision Gates 1–4, any Business Rule, POL-20-001's four decided
  parameters — none reopened.

---

## 12. Readiness Classification

**Not Ready.**

**Why not "Ready" or "Ready after minor preparation":** this phase has
more than one small, well-scoped gap (the shape Phase 2's "Ready after
minor preparation" precedent fits). It has two genuine, unresolved
contradictions between Accepted governance documents (§1.1) — one
between ADR-0003 and the Implementation Plan's own Phase 3 wording, one
between ADR-0004 and both the Accepted spec's 20.1 schema and Phase 2's
already-shipped implementation — plus a foundational reliability
mechanism (§4.8.1's dedupe/watermark model) that has been referenced as
"existing" throughout this module's entire governance history but has,
in fact, never been built. Any Implementation Plan or per-checkpoint
Rule 8 Assessment written today would have to silently pick a side on
both contradictions to proceed, which is exactly what Rule 8 exists to
prevent.

**What would move this to "Ready after minor preparation" or "Ready":**
Product Architect resolution of:

1. Whether Phase 3 (and, if so, whether also Phase 2 retroactively)
   must build against ADR-0003's job-registration interface, or whether
   the Implementation Plan's existing "extend the one function" wording
   is to be formally amended to match ADR-0003 instead.
2. Whether Phase 3's three producers must satisfy ADR-0004 in full
   (BusinessEvent contract + a new Notification Platform template/
   localization/policy layer — a significantly larger build), or
   whether ADR-0004 is intended to apply prospectively to some *future*
   phase/module only, with Phase 3 continuing Phase 2's direct-write
   precedent for now — and, either way, an explicit spec amendment to
   `20-notifications.md` §20.1 reconciling it with whichever answer is
   chosen.
3. A decision on which of Architecture §4.8.1's two candidate
   dedupe/watermark mechanisms this codebase adopts (dedupe key as
   document ID vs. a separate `platform_worker_state` collection) —
   this is an engineering-planning detail once the above are settled,
   but is currently blocked behind them since it depends on where in
   the pipeline (raw write vs. BusinessEvent evaluation) idempotency is
   actually enforced.
4. At least the "trial ending soon" threshold for the Subscription-
   companion producer (§2), since no numeric parameter exists today —
   Closing/Inventory thresholds can plausibly be deferred further
   without blocking a first Implementation Plan draft, but this one
   sits on the structurally simplest of the three producers and would
   otherwise stall it too.

None of the above is resolved by this assessment. This document does
not itself propose an answer to items 1–2, consistent with this
codebase's standing discipline that architectural direction is a
Product Architect decision, not an engineering judgment call.

---

## Deliverables

1. **File created:** `docs/engineering/20-phase3-rule8-assessment.md`
   (this document). No other file created or modified.
2. **Files touched:** none besides this new document. Confirmed via
   `git status` before and after this session — working tree was clean
   at `8c9599d` before this document was written, and remains so except
   for this one addition.
3. **Inconsistencies found:**
   - ADR-0003 (job-registration interface, Accepted) vs. the
     Implementation Plan's own Phase 3 wording (still describes
     extending `runTrialLifecycleSweep()` as a single function) — §1.1,
     Contradiction 1.
   - ADR-0004 (BusinessEvent/Notification Platform architecture,
     Accepted) vs. the Accepted spec's own 20.1 data model and Phase
     2's already-shipped, producer-constructs-content-directly
     implementation — §1.1, Contradiction 2.
   - Architecture §4.8.1's dedupe/watermark mechanism, referenced as
     "existing" throughout this module's governance history, does not
     exist anywhere in the codebase — §1, §7 Risk 1.
   - `docs/specs/README.md` and `HANDOFF.md` are both stale relative to
     Module #20 Phase 2's actual (closed) status and do not mention
     ADR-0003/ADR-0004 at all — flagged, not corrected, per instruction
     that documentation synchronization is a separate step.
4. **Risks identified:** six implementation risks (§7), three testing
   risks (§8), two architecture risks (§9).
5. **Readiness classification: Not Ready** (§12) — pending four
   specific Product Architect decisions listed there.
6. **Recommendations:**
   - Resolve the ADR-0003/Implementation-Plan conflict and the
     ADR-0004/spec conflict explicitly before drafting any further
     Phase 3 planning document — both are Stage 2/Stage 6 amendment
     decisions, not engineering discretion.
   - Decide the dedupe/watermark mechanism and at least the
     Subscription "trial ending soon" threshold once the above are
     settled.
   - Treat the documentation staleness in `README.md`/`HANDOFF.md` as
     its own housekeeping step, independent of Phase 3's technical
     scope, consistent with how this repository has handled the same
     recurring issue for Module #19 previously.
7. **Confirmation that implementation has not begun.** No file under
   `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`,
   `docs/specs/`, or `docs/architecture/` was modified to produce this
   assessment. No job-registration interface, no `BusinessEvent` type,
   no detection logic, and no dedupe/watermark mechanism exists
   anywhere in this repository as of `8c9599d`. This document does not
   authorize Module #20 Phase 3, any amendment to `20-notifications.md`
   or the Implementation Plan, or any other Phase 3-or-later work.
