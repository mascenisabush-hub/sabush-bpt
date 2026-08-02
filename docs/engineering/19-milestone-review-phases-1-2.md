# Module #19 — Milestone Review (Phases 1 & 2)

**Type:** Engineering milestone record. Summarizes and cross-references
existing governance and engineering documents; does not itself decide,
authorize, or implement anything.
**Does not authorize additional implementation.** Reaching this
checkpoint is not itself a go-ahead for Phase 3 or for commercial
subscription features — each remains its own separate, explicit
Product Architect decision, per the same Rule 8 discipline this
milestone reviews.
**Milestone commit range:** `4d9d34b..0c92cad` (`main`, all pushed and
confirmed synced with `origin/main`).

---

## Purpose

This document records the successful completion of the first
implementation milestone of Module #19 (Subscriptions) — Phase 1
(Foundations) and Phase 2 (Trial Engine). Its purpose is to establish a
verified checkpoint before commercial subscription features (billing,
payment gateways, plan management — Phase 3 and beyond) are
introduced, and to give a single place a future session or a future
audit can read to understand what shipped, how it was governed, and
what remains open, without needing to reconstruct that from the full
document trail.

## Governance Compliance

Implementation followed the approved governance sequence in full, with
no step skipped and no step reordered:

| Step | Record |
|---|---|
| Product Vision | Pre-existing, approved |
| Architecture | Pre-existing, approved (relevant sections: §4.6 Authentication, §4.8 Background Processing, §9.6 Audit Log) |
| Business Decision Records | BDR-0001–BDR-0004 (Module #19 governance-bdr-policy-framework + BDR-0004 Customer Communication Architecture) |
| Operational Policies | POL-19-001 through POL-19-008, all Approved |
| Module Specification | [`19-subscriptions.md`](../specs/19-subscriptions.md), v2.0, Accepted |
| Architecture Decision Records | [ADR-0001](../adr/ADR-0001-business-provisioning-orchestrator.md) — Business Provisioning Orchestrator (Option B) |
| Implementation Plan | [`19-subscriptions-implementation-plan.md`](./19-subscriptions-implementation-plan.md) |
| Rule 8 Assessment (Phase 1) | Implementation Plan §14–§15 ("Ready after minor preparation") |
| Phase 1 Implementation | Commit `4d9d34b` |
| Phase 1 Verification | This session: `tsc --noEmit` clean, `npm run build` clean, diff reviewed line-by-line against spec/ADR/plan |
| Phase 1 Close-Out | [`19-phase1-closeout.md`](./19-phase1-closeout.md), commit `264b9c2` |
| Phase 2 Rule 8 Assessment | [`19-phase2-trial-engine-rule8-assessment.md`](./19-phase2-trial-engine-rule8-assessment.md), commit `cb6cec6` |
| Phase 2 Engineering Decisions | [`19-phase2-trial-engine-decisions.md`](./19-phase2-trial-engine-decisions.md), commit `5f93bfa` |
| Phase 2 Implementation | Commit `0c92cad` |
| Phase 2 Verification | This session: `tsc --noEmit` clean, `npm run build` clean, diff reviewed against the four approved decisions |

Implementation remained inside the approved governance boundaries
throughout: no BDR, POL, the specification, or ADR-0001 was modified,
reinterpreted, or reopened at any point across both phases. Where a
genuine gap surfaced that governance itself had not closed — the
Phase 1 stale-`HANDOFF.md` discrepancy, and Phase 2's four open items
(activation trigger, restricted-operations list, Background Worker
sequencing, audit scope) — each was flagged and returned to the
Product Architect for an explicit decision rather than resolved
unilaterally. No new business rule, product behavior, or scope
expansion was introduced without that round-trip.

## Implementation Status

**Phase 1 (Foundations)** — Complete. `subscriptions/{businessId}` data
model, `firestore.rules` match block (client write always denied), the
Business Provisioning Orchestrator (`POST /api/provisioning/business`,
single transaction: business + owner membership + initial
`trial_pending` subscription doc).

**Phase 2 (Trial Engine)** — Complete, within the Engineering
Boundaries your authorization set:
1. **Trial Activation** — `POST /api/subscriptions/activate-trial`,
   idempotent `trial_pending → trial_active`, populates
   `trialActivatedAt`/`trialEndsAt` (+30 days, POL-19-002). Triggered
   fire-and-forget from `AppContext.tsx`'s five write paths mapped onto
   Decision 1's platform-level concept.
2. **Restricted Operations** — `firestore.rules`'
   `subscriptionAllowsNewRecords()`, gating `create` on the six
   collections identified as affecting Business Worth/financial
   position (`batches`, `purchaseBatches`, `quebras`, `expenses`,
   `withdrawals`, `stockCounts`).
3. **Trial Lifecycle Worker** — minimal `setInterval` sweep inside
   `server/index.ts`, hourly by default, sole responsibility
   `trial_active → trial_completed`.
4. **Automatic Audit Events** — new `platform_audit_log` collection,
   written atomically alongside both transitions above.

**Explicitly not built in either phase** (Engineering Boundaries, held):
commercial billing integration, payment gateways, subscription
purchase flow, plan management, Notification engine integration
(Module #20), SuperAdmin commercial features, general-purpose
background-job infrastructure, Grace Period/Conversion/Recovery
transitions.

## Verification Status

| Check | Phase 1 | Phase 2 |
|---|---|---|
| `tsc --noEmit` | ✅ Clean | ✅ Clean |
| `npm run build` | ✅ Clean (pre-existing, unrelated warnings only) | ✅ Clean (same) |
| Diff reviewed against governing docs | ✅ | ✅ |
| Firestore emulator rules tests | ❌ Execution-blocked-by-environment | ❌ Execution-blocked-by-environment |
| `git status` / sync with `origin/main` | ✅ Clean, synced | ✅ Clean, synced |

The emulator limitation is identical across both phases and every
prior emulator-dependent change in this repository's history: the
sandbox's network egress does not allow
`storage.googleapis.com`, which the Firestore emulator binary download
requires. This is an environment constraint, not a code defect, and is
**the one verification step still owed against a local environment**
before either phase is treated as fully production-verified — tracked
here explicitly rather than left implicit.

## Remaining Work

- **Manual, blocking before production trust:**
  - Run `npm run test:rules:emulator` locally (Phase 1's and Phase 2's
    new rules tests — subscriptions, restricted-operations enforcement,
    `platform_audit_log`).
  - Deploy the new Firestore composite index
    (`firebase deploy --only firestore:indexes`) — the Trial Lifecycle
    Worker's query will otherwise fail silently (caught and logged,
    non-fatal, but the `trial_active → trial_completed` transition
    will never fire until the index exists).
- **Tracked, not blocking either phase:**
  - Legacy migration for Businesses that predate Phase 1 and have no
    `subscriptions` document yet (spec's "Explicitly Left Open," item
    6). Restricted-Operations Enforcement fails open for these
    Businesses in the interim — a disclosed, deliberate, temporary
    behavior, not a silent gap.
  - Rotating the GitHub PAT used to push this milestone's commits (used
    directly in chat, per this repository's standing practice for any
    token shared that way).
  - Manager closing-screen navigation bug (pre-dates Module #19,
    unrelated, still open).
- **Deferred by design, not gaps:** Grace Period, Conversion, Recovery
  (Phase 3); SuperAdmin consumption of subscription data (Phase 4);
  billing/payment integration (Phase 5); Notification wiring (Phase 6,
  depends on Module #20); general-purpose Background Worker
  infrastructure beyond the minimal Trial Lifecycle Worker.

## Readiness for Future Phases

Phase 3 (Grace Period, Conversion, Recovery) and beyond are **not
authorized by this document**. This milestone confirms Phases 1–2 are
implemented and internally verified to the extent this environment
allows; it does not assess Phase 3's scope, and no Phase 3 Rule 8
Assessment has been drafted. Per the same discipline applied
throughout Module #19 so far, beginning Phase 3 requires its own Rule
8 Assessment and its own explicit Product Architect authorization —
this record does not substitute for either.

---

## Governance Notes

- This record does not modify any BDR, POL, the Module #19
  specification, ADR-0001, the Implementation Plan, either Rule 8
  Assessment, or either phase's decision/close-out record — it
  summarizes and cross-references them.
- No `src/`, `server/`, `firestore.rules`, or `docs/specs/*` file was
  touched to produce this document.

**Lifecycle:** Implemented → Verified → Closed (Phase 1) / Implemented
→ Verified (Phase 2) → **Milestone Reviewed**. Phase 3 is Designed
(per existing specification content) but not Assessed, Decided, or
Authorized.
