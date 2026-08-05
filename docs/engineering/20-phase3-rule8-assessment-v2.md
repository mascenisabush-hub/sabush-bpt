# Module #20 (Notifications) — Phase 3 (Background Worker Scheduled Triggers) Rule 8 Assessment — v2

**Type:** Rule 8 Assessment — Current State Assessment → Gap Analysis →
Risks → Implementation Plan review, per `CLAUDE.md`'s Rule 8 process.
Planning and governance-consistency review only. **Does not authorize
implementation.**
**Relationship to the original assessment:** this document **supersedes
and discards** [`20-phase3-rule8-assessment.md`](./20-phase3-rule8-assessment.md)
(commit `8c9599d`) rather than amending it, per explicit Product
Architect instruction. That document is not edited, deleted, or
retroactively marked wrong — it was correct for the repository state it
assessed. This is a fresh, from-scratch assessment of a materially
different repository state (three additional Accepted governance
records now exist that did not exist when it was written).
**Lifecycle status:** Designed → **Assessed**. Not Implemented, not
Executed. Reaching this state is not itself authorization to begin
coding — that remains a separate, explicit Product Architect decision
(Stage 8, Platform Engineering Governance Standard §3).
**Phase:** Module #20, Phase 3 — Background Worker Scheduled Triggers
(Closing, Inventory Risk, Trial), per
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
§9. Follows a closed-out Phase 1 and Phase 2.
**Basis (independently re-verified against the current repository, not
assumed from any prior session or from this task's own framing):**
[`20-notifications.md`](../specs/20-notifications.md) (v1.2, Accepted),
[ADR-0002](../adr/ADR-0002-platform-background-worker.md),
[ADR-0003](../adr/ADR-0003-background-worker-job-registration.md),
[ADR-0004](../adr/ADR-0004-notification-platform-architecture.md),
[BDR-0005](../specs/20-bdr-0005-notification-language-resolution-policy.md),
[BDR-0006](../specs/20-bdr-0006-notification-communication-policy.md),
[**BDR-0007**](../specs/20-bdr-0007-businessevent-creation-policy.md)
(✅ Accepted this session — the specific event this assessment exists
to evaluate the consequences of),
[`20-notifications-implementation-plan.md`](./20-notifications-implementation-plan.md)
(as amended, commit `c848556`),
[`20-notifications-implementation-plan-reconciliation-review.md`](./20-notifications-implementation-plan-reconciliation-review.md),
[`20-phase3-remaining-product-decisions-review.md`](./20-phase3-remaining-product-decisions-review.md),
[`20-phase1-closeout.md`](./20-phase1-closeout.md),
[`20-phase2-closeout.md`](./20-phase2-closeout.md),
[`platform-engineering-governance-standard.md`](./platform-engineering-governance-standard.md),
and the current `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json` state as of a fresh clone/fetch, confirmed
clean at commit **`2842c74`**, plus the (uncommitted, locally-created)
BDR-0007 document.

**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `20-notifications.md`, any ADR, or any prior
BDR/POL to produce this document.**

---

## 0. Scope Boundary for This Assessment

Unchanged from the original assessment — restated for completeness,
not re-derived:

**In scope:** whether Phase 3 (three new Background Worker job types
detecting Closing, Inventory Risk, and Trial events, per the
Implementation Plan §9) is ready for Implementation Authorization.

**Explicitly out of scope, unaffected by this assessment:** Phase 4–6,
Phase 1/2's already-shipped scope, Decision Gates 1–4 or any Business
Rule in `20-notifications.md`, Module #18/#15 recipient/event-type
work.

---

## 1. Fresh Repository Verification

Confirmed by `git fetch` + `git log` against `origin/main`, not assumed
from any document's own claims about itself:

| Governance record | Status confirmed |
|---|---|
| ADR-0002, ADR-0003, ADR-0004 | ✅ Accepted (unchanged since original assessment) |
| BDR-0005, BDR-0006 | ✅ Accepted (unchanged since original assessment) |
| **BDR-0007** | ✅ Accepted (this session — the delta this assessment evaluates) |
| Phase 1, Phase 2 close-outs | ✅ Closed (unchanged) |
| Implementation Plan | Reconciled against ADR-0003/0004, BDR-0005/0006 (commit `c848556`) — **not yet reconciled against BDR-0007** (§2.2, below — this is a real finding) |

**Code state — re-verified directly, not assumed unchanged:**

| Component | State |
|---|---|
| `writeNotification()` (`server/index.ts`) | Unchanged since original assessment — still no dedupe-key existence check, still auto-generated document ID |
| `runTrialLifecycleSweep()` | Unchanged — still a single hardcoded function, still uses transaction-based state re-check, not a dedupe-key/watermark mechanism |
| Job-registration interface (`registerJob(...)`, ADR-0003) | **Still does not exist anywhere in the codebase** — confirmed by direct grep, zero matches outside documentation |
| `platform_worker_state` collection, dedupe-key check, watermark tracking | **Still does not exist anywhere** — confirmed by direct grep, zero matches outside documentation |
| `BusinessEvent` type | **Still does not exist anywhere in `src/` or `server/`** — confirmed by direct grep |
| Any Closing/Inventory Risk/Trial-ending-soon detection logic | **Still does not exist** — confirmed by direct grep for the specific `eventType` strings BDR-0007 just defined (`closing.overdue`, `inventory.risk.breakage`, `trial.ending`) — zero matches in `src/` or `server/` |

**Conclusion: nothing in `src/`, `server/`, `firestore.rules`, or
`firestore.indexes.json` has changed since the original assessment.**
Every code-level finding of that assessment remains independently
re-verified and valid. Only the governance layer has changed — which is
exactly the delta this fresh assessment exists to evaluate.

### 1.1 Governance Contradiction Check

This is the section that differs materially from the original
assessment's conclusion.

**Contradiction 1 (original assessment) — ADR-0003 vs. the
Implementation Plan's own Phase 3 wording.** ✅ **Resolved.**
Independently re-read, not assumed from the reconciliation review's own
claim: the Implementation Plan's Phase 3 section (§9, lines ~444–475)
now reads *"Each job type is added via `registerJob(...)` (ADR-0003)...
not as a branch inside `runTrialLifecycleSweep()`... `runTrialLifecycleSweep()`
itself is migrated onto this same interface as part of this phase."*
This is the ADR-0003-consistent wording, verified present in the
current file, not the pre-ADR-0003 wording the original assessment
flagged.

**Contradiction 2 (original assessment) — ADR-0004 vs. the Accepted
spec's data model and Phase 2's shipped precedent.** ✅ **Resolved for
the Implementation Plan; ⚠️ one residual item, not a contradiction.**
The Plan's §5 "New Components" section now correctly separates
`BusinessEvent` emission from a distinct "Notification Platform
evaluation step" that owns `context`/`priority` population (ADR-0004
Decisions 1/4/5, BDR-0006 §7–8) — independently re-read and confirmed
present, not assumed. The residual item: `20-notifications.md` §20.1's
own data model has **not** been amended to mention `BusinessEvent` —
this was already flagged, by name, in BDR-0006's own Governance Notes
as *"a separate, outstanding spec-amendment task,"* not something
either BDR-0006 or this assessment resolves. ADR-0004 itself states it
*"does not modify the Module #19, #20... specifications,"* so this is
not a contradiction the spec is in violation of — it is a known,
previously-flagged documentation gap, unresolved, carried forward
rather than newly discovered. **Classification: Informational
Dependency** — does not block Phase 3 implementation (the
Implementation Plan, not §20.1's field list, is what Phase 3 code is
actually built against), but the spec amendment remains genuinely
outstanding and should not be forgotten a second time.

**New finding this assessment surfaces — not present in the original,
because BDR-0007 did not exist yet:**

**Finding 3 — the Implementation Plan's Phase 3 section is now stale
relative to BDR-0007, in two specific, checkable ways.** Independently
re-read against BDR-0007's actual text, not assumed:

1. Plan §9 (lines ~479–482) states: *"any detection threshold/grace-
   period tuning beyond what's needed to ship... remain[s] an open
   Product decision."* This sentence is now **factually false** —
   BDR-0007 §4 defines all three threshold decisions (Closing: 3
   triggers; Inventory Risk: Breakages only; Trial: T-7/T-1). This is
   the same category of drift this repository has flagged twice before
   for `README.md`/`HANDOFF.md` (Governance Standard §4, Principle 5) —
   a derivative document not yet caught up to an Accepted decision, not
   a contradiction in the decision itself.
2. Plan §9 (line ~458) still describes the Inventory Risk producer as
   covering *"Closings/#11, Stock Counts/#10 + Breakages/#7"* — i.e.,
   both source domains. BDR-0007 §4.2 **explicitly defers** Stock
   Counts and defines no `eventType` for it. As currently worded, the
   Plan would let a future implementer believe Stock Counts detection
   is in Phase 3's scope. It is not, per BDR-0007 — but the Plan itself
   does not yet say so.

**Classification: neither is a governance blocker** (no further
Product Architect decision is needed to resolve either — both are
corrections of already-decided facts into an existing document, the
same mechanical kind of update the ADR-0003/0004 reconciliation already
did once). **Both should be corrected before Implementation
Authorization is drafted**, so the Authorization is not built by
reading a Plan section that contradicts the Accepted BDR-0007 on two
concrete points. This is a **documentation synchronization task** —
Informational Dependency, per §13.2/§14 — not a Required Future
Governance item, and not a factor in this assessment's Governance
Readiness conclusion.

---

## 2. Producer Inventory (What Phase 3 Actually Builds, Post-BDR-0007)

Revised from the original assessment's table — now reflects BDR-0007's
six defined `eventType`s and the Stock Counts deferral:

| Producer (`eventType`) | Producer identity (BDR-0007 §5) | Trigger | Detection logic status |
|---|---|---|---|
| `closing.approaching` | `closing-integrity` | `endDate` 3 days away, `isPeriodClosed` false | Not built — new detection code required |
| `closing.due` | `closing-integrity` | `endDate` today, `isPeriodClosed` false | Not built |
| `closing.overdue` | `closing-integrity` | `endDate` 3 days past, `isPeriodClosed` still false | Not built |
| `inventory.risk.breakage` | `breakage-tracking` (illustrative, per BDR-0007's own caveat) | Adapted from `isQuebraExceedingWarning` | Not built as a BusinessEvent trigger; the underlying signal (`src/utils/calculations.ts`) already exists and is reusable per this project's own "reuse before building" precedent |
| **Stock Counts inventory risk** | — | — | **Explicitly out of Phase 3 scope** — BDR-0007 defers this entirely; no eventType exists to build against |
| `trial.ending_soon` | `trial-engine` | T-7 before `trialEndsAt` | Not built — `runTrialLifecycleSweep()` currently detects expiry only, not this |
| `trial.ending_tomorrow` | `trial-engine` | T-1 before `trialEndsAt` | Not built |

Same structural gaps the original assessment identified remain
true and unaffected by BDR-0007: Closings and Breakages live in
per-business subcollections (`businesses/{businessId}/closings/{id}`,
etc.), requiring a collection-group query design with no existing
composite index — BDR-0007 supplies the *business* trigger definitions,
not the *query* mechanism to evaluate them at scale. This remains
implementation-detail engineering work, unchanged in kind from the
original assessment's Risk 4.

---

## 3. Background Worker Alignment (ADR-0002)

**Unchanged from original: Aligned**, no new work implied by BDR-0007
here — this section concerns worker *ownership*, not event triggers.

## 4. Job Registration Alignment (ADR-0003)

**Unchanged from original: not yet implemented.** `registerJob(...)`
still does not exist in code (§1, above). This remains Phase 3's own
foundational build task — already correctly scoped as such in the
Implementation Plan's amended §9 (§1.1, Contradiction 1, above,
confirmed resolved in text). BDR-0007 does not change this section's
conclusion; it has no bearing on *how* jobs are registered, only *when*
each fires.

## 5. BusinessEvent Alignment (ADR-0004 Decisions 1–3, now joined by BDR-0007)

**Materially changed from the original assessment.** The original
found "not aligned — nothing to align yet," citing both the absence of
a `BusinessEvent` type in code *and* the absence of any business-level
definition of *when* one of the three domains' events should fire. The
second half of that finding is now resolved: BDR-0007 supplies exactly
that definition, for six named eventTypes, grounded in existing fields
(`endDate`, `isPeriodClosed`, `isQuebraExceedingWarning`, `trialEndsAt`)
rather than inventing new ones. The first half — no `BusinessEvent`
type exists in code — is unchanged and remains real implementation
work, not a governance gap.

## 6. Notification Platform Alignment (ADR-0004 Decisions 4–5, BDR-0006, BDR-0007 §5 Mapping)

**Unchanged from original in code terms — zero implementation exists.**
Materially *stronger* in governance terms: the original assessment
flagged that the platform-side evaluation layer had "no policy
evaluation... no template lookup, no localization step" defined for it
to implement against. BDR-0006 §9 already fixed the Notify/Priority
outcome for each producer *category*; BDR-0007 §5 now maps each of the
six specific eventTypes to that outcome explicitly, closing the last
gap between "a producer category has a policy" and "a named eventType
has a policy." Nothing remains undefined at the governance level for
this layer's Phase 3 behavior — only its code.

## 7. Delivery Channel Alignment (ADR-0004 Decision 8)

**Unchanged from original: Aligned, no new work implied.**

---

## 8. Implementation Risks

Carried forward from the original assessment, re-verified against
current code (§1) and re-annotated for BDR-0007's effect where
relevant:

| # | Risk | Impact | Status vs. original assessment |
|---|---|---|---|
| 1 | **Dedupe/watermark mechanism does not exist.** | High | **Unchanged — still real.** Per `20-phase3-remaining-product-decisions-review.md` §2.4/§5: fully specified by Architecture §4.8.1 and ADR-0003, not awaiting any further decision. Classified there as an *Immediate Blocker for coding, not for governance* — i.e., it is Phase 3's own first build task, already named as such in the Plan's §10 Risk 1 mitigation, and not a factor lowering Governance Readiness (§13.1). |
| 2 | **Job-registration interface does not exist.** | High | **Unchanged in code; governance contradiction resolved (§1.1).** Building it is squarely in-scope for Phase 3 per the now-reconciled Plan. |
| 3 | **BusinessEvent / Notification Platform layer does not exist in code.** | High | **Governance side now fully resolved** (ADR-0004 + BDR-0006 + BDR-0007). Code-side risk is unchanged — this is exactly what Phase 3 implementation builds. |
| 4 | **Collection-group query design for Closing/Breakage producers.** | Medium | **Unchanged.** No index exists yet; BDR-0007 defines the business trigger, not the query shape. |
| 5 | **Detection-threshold parameters undecided.** | ~~Low–Medium~~ | ✅ **Resolved by BDR-0007.** Removed as an open risk. |
| 6 | **i18n gap widened if Phase 3 follows Phase 2's hardcoded-Portuguese precedent.** | Medium | **Unchanged** — still a live risk; BDR-0005/0007 don't by themselves prevent an implementer from copying Phase 2's shortcut. Worth explicit reinforcement in the eventual Authorization's scope language. |
| 7 (new) | **Implementation Plan's Phase 3 text is stale relative to BDR-0007 on two specific points (§1.1, Finding 3).** | Low | **New**, not present in the original assessment. Documentation synchronization item (§13.2) — does not affect Governance Readiness; correct as normal maintenance. |

---

## 9. Testing Risks

Unchanged from the original assessment — no code exists yet in this
area, so nothing has changed to re-verify:

- No existing test precedent for a recurring, multi-job-type scheduled
  worker.
- Firestore emulator dependency unresolved in this sandbox (cannot
  reach `storage.googleapis.com`) — same standing gap named in every
  prior phase's close-out.
- Regression risk to `runTrialLifecycleSweep()`'s existing idempotency
  behavior if migrated onto the new registration interface.

---

## 10. Architecture Risks

**Materially reduced from the original assessment.** The original's
central architecture risk — building the full ADR-0003 + ADR-0004
machinery as a prerequisite to three notification producers is a larger
undertaking than "three new job types" as prior documents described it
— is **still true as a scope-size observation**, but is no longer an
*open* risk in the sense the original meant it: the original's real
concern was that proceeding to code would require silently picking a
side on unresolved architecture. That is no longer the case. What
remains is a known, bounded, already-scoped engineering build — not an
architectural ambiguity.

---

## 11. Expected Runtime Files (If and When Phase 3 Is Authorized)

Unchanged from the original assessment's inventory — re-stated, not
re-derived, since nothing about *where* this code lives has changed:

- `server/index.ts` — job-registration scaffolding, `BusinessEvent`
  type, Notification Platform evaluation step, detection functions for
  the six BDR-0007 eventTypes (five domains: `closing.*` ×3,
  `inventory.risk.breakage`, `trial.*` ×2).
- Possibly a new module (e.g., `server/backgroundWorker.ts`) — not
  decided by any existing document.
- `firestore.indexes.json` — new collection-group indexes for Closings
  and Breakages subcollection scans.
- Possibly new type definitions (`BusinessEvent`) in `src/types.ts` or
  a server-only type file.
- `platform_worker_state` collection (new) — dedupe/watermark state.

**Not expected, per BDR-0007's explicit deferral:** any Stock Counts
discrepancy/variance detection code. Its appearance in a Phase 3 diff
would exceed this assessment's own scope boundary (§0) and BDR-0007's.

---

## 12. Expected Non-Changes

Unchanged from the original assessment: `NotificationContext`,
`Header.tsx`, `DeliveryChannel`/`InAppChannel`, the five `/api/staff/*`
endpoints (per the Plan's own "Legacy Compatibility" decision — not
retrofitted), `firestore.rules`'s `/notifications/{id}` block, Decision
Gates 1–4, POL-20-001's decided parameters.

---

## 13. Readiness Classification

**Governance Readiness and Documentation Synchronization are evaluated
as two separate dimensions, not one blended score.** Conflating them —
letting an editorial-lag finding pull down a governance-readiness
classification — was an error in this assessment's original
conclusion, corrected here.

### 13.1 Governance Readiness: **Ready.**

The Rule 8 question this classification actually answers is: *can
engineering begin implementation without inventing business behavior?*
After BDR-0007, the answer is yes, on every axis that matters:

- Both original architectural contradictions are resolved — not just
  in the reconciliation review's proposal, but independently
  re-verified present in the Implementation Plan's actual committed
  text (§1.1).
- All three Required Future Governance items the Remaining Product
  Decisions Review identified are now Accepted, via BDR-0007. That
  category is empty (§14).
- Engineering has an authoritative answer, sourced from Accepted
  ADRs/BDRs, for: what BusinessEvents exist, when each fires, who
  emits it, what happens to it (BDR-0006), what language it resolves
  to (BDR-0005), who owns the worker process (ADR-0002), how new job
  types are added (ADR-0003), and how producer and platform
  responsibilities divide (ADR-0004). Nothing essential is left for
  engineering to decide on its own judgment.
- The dedupe/watermark mechanism, the job-registration interface, and
  the BusinessEvent/Notification Platform layer are all unbuilt, but
  none of that is a readiness question — each is fully specified
  architecturally with zero further Product Architect input needed
  (§14). Building them is what Stage 9 Incremental Implementation *is*;
  their absence today doesn't mean the phase isn't ready to be
  authorized, any more than an empty file means a spec isn't ready to
  be built from.

### 13.2 Documentation Synchronization: **Minor synchronization
recommended, not a blocker.**

The Implementation Plan's Phase 3 section (§9) contains two items now
behind BDR-0007 — a claim that thresholds remain undecided, and a
producer description that still implies Stock Counts is in scope
(§1.1, Finding 3). These are documentation-drift items, the same
category as `README.md`/`HANDOFF.md`'s own staleness (Governance
Standard Principle 5) — they don't create undefined business behavior,
conflicting governance, or engineering discretion, because the
Accepted ADRs/BDRs remain the authoritative source regardless of what
the Plan's prose currently says. They should be corrected as normal
documentation maintenance — before, alongside, or immediately after
Authorization is drafted, at the Product Architect's discretion — not
treated as a precondition to Authorization itself.

### 13.3 Recommended Sequence

1. ✅ BDR-0007 Accepted (done).
2. ✅ This Rule 8 Assessment concludes **Ready** (governance dimension).
3. 📝 Draft the Phase 3 Implementation Authorization, scoped to exactly
   the six BDR-0007 eventTypes (Stock Counts explicitly excluded), the
   job-registration interface, the dedupe/watermark mechanism, and the
   BusinessEvent/Notification Platform evaluation layer — nothing
   broader.
4. ✍️ Explicit Product Architect sign-off on that Authorization.
5. 🚀 Phase 3 implementation begins — not before.
6. 📚 Implementation Plan, `README.md`, and `HANDOFF.md` synchronized as
   documentation housekeeping, either immediately before implementation
   or as part of the first implementation documentation pass — a
   separate, explicit, non-blocking step, per this repository's own
   established practice of never folding drift-correction into
   unrelated work.

---

## 14. Consequence Classification Summary (Three-Tier Model)

| Item | Classification |
|---|---|
| `20-notifications.md` §20.1 not amended to mention `BusinessEvent` | Informational Dependency — outstanding, previously flagged, does not block Phase 3 |
| Dedupe/watermark mechanism (design) | Informational Dependency — fully specified by Architecture §4.8.1/ADR-0003 |
| Dedupe/watermark mechanism (build status) | Immediate Blocker *for coding to begin safely*, not for governance or Authorization |
| Job-registration interface (build status) | Immediate Blocker *for coding*, not for governance — fully specified by ADR-0003 |
| BusinessEvent type / Notification Platform evaluation layer (build status) | Immediate Blocker *for coding*, not for governance — fully specified by ADR-0004/BDR-0006/BDR-0007 |
| Collection-group query + index design (Closing, Breakages) | Immediate Blocker *for coding* — no governance question, pure engineering design |
| Implementation Plan §9 stale re: thresholds and Stock Counts scope | Informational Dependency — documentation synchronization, not a readiness gate; the Accepted ADRs/BDRs remain authoritative regardless of the Plan's current prose (§13.2) |
| i18n hardcoding risk if Phase 3 copies Phase 2's shortcut | Informational Dependency — worth explicit reinforcement in Authorization scope language |

**No item in this table is a Required Future Governance item.** That
category is empty for the first time across this module's Phase 3
governance history — the direct, measurable effect of BDR-0007's
acceptance. **No item in this table blocks Governance Readiness** —
the two build-status "Immediate Blocker" rows are blockers to shipping
code, which Stage 9 Incremental Implementation resolves; they are not
blockers to Stage 8 Authorization itself.
