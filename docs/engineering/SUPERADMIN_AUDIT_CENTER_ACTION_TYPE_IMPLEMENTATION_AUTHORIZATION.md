# Implementation Authorization — SuperAdmin Audit Center Action-Type Allowlist Correction

**STATUS: ✅ IMPLEMENTATION AUTHORIZED.** See "Product Architect
Authorization," below.

**PRODUCT ARCHITECT:** SABUSHIMIKE MASCENI
**DATE:** 2026-09-06

This authorization is limited **strictly** to the already-accepted
Implementation Plan identified in §1, below, and its own stated test/
regression requirements. It authorizes a subsequent implementation
task to write code against that plan — it does not itself implement
anything. No application code, test, schema, or Firestore-rules file
is modified by this document.

---

## 1. Authorized Artifact

**The sole implementation blueprint this authorization covers:**

[`docs/engineering/SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md)

— exactly as it stands after its own Governance Review
([`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md),
verdict READY FOR PRODUCT ARCHITECT ACCEPTANCE, zero corrections
required) and its own Product Architect Acceptance (recorded in the
plan's own "Product Architect Acceptance" section, 2026-09-06).
**Verified, this session, not to have drifted since that acceptance:**
`server/auditLogQuery.ts`'s `KNOWN_ACTION_TYPES` (7 entries),
`apps/superadmin/src/lib/superadminApi.ts`'s own duplicate list (7
entries), and `apps/superadmin/src/pages/AuditTrail.tsx`'s
`ACTION_LABELS` (7 entries) were each re-read directly this session
and confirmed unchanged from the state the plan and its acceptance
describe; `git status --short` shows only governance-artifact
markdown files, no application source touched.

## 2. Full Governance Chain This Authorization Sits Atop

Each artifact below is preserved unmodified by this document:

1. [`SUPERADMIN_PANEL_CURRENT_STATE_AND_REMAINING_WORK_INVESTIGATION.md`](./SUPERADMIN_PANEL_CURRENT_STATE_AND_REMAINING_WORK_INVESTIGATION.md) — broader SuperAdmin investigation; first identified the allowlist as a suspected defect
2. [`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md) — focused investigation, verdict CONFIRMED IMPLEMENTATION DEFECT
3. [`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md) — the Implementation Plan
4. [`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md) — plan reviewed, READY FOR PRODUCT ARCHITECT ACCEPTANCE, zero discrepancies/corrections
5. Product Architect Acceptance of the plan (recorded within artifact 3 itself, 2026-09-06)
6. **This document** — Implementation Authorization

**Underlying existing authorization this correction operates within,**
unmodified and not reopened by this document:

- [`ADR-0006-superadmin-v1-operational-control-plane.md`](../adr/ADR-0006-superadmin-v1-operational-control-plane.md) — Phase D (Audit Center) original authorization
- [`18-superadmin-v1-operational-control-plane-rule8-assessment.md`](./18-superadmin-v1-operational-control-plane-rule8-assessment.md) §17 — Phase D's own stated "no structural dependency on a fixed action-type set"
- BDR-0016 / POL-0009 (`initial_stock_recovery.*`) and the Business Worth Evolution Implementation Plan/Authorization, Increments 8–9 (`business_worth_recovery.*`) — the four action types' own, separate, already-signed governance, unaffected and not re-decided by this document

**Prerequisite verification, this session:** all five prior artifacts
exist, are internally consistent with one another (no artifact
contradicts an earlier one — confirmed by direct re-reading of the
plan's own acceptance section against the governance review it
responds to, and by re-confirming the governance review's own findings
against the live repository fresh, not merely re-cited), and no
artifact has been altered since the step that produced it. This
authorization is the only document created in this task.

---

## 3. Authorized Implementation — Four File Changes

**A. Backend allowlist.** `server/auditLogQuery.ts` — append exactly
four strings to the existing `KNOWN_ACTION_TYPES` array literal:
`initial_stock_recovery.authorized`, `initial_stock_recovery.consumed`,
`business_worth_recovery.authorized`, `business_worth_recovery.expired`.
No other line in this file changes. `KnownActionType` (a derived type)
and `queryAuditLog()`'s validation logic require no separate edit.

**B. SuperAdmin UI action-type exposure.** `apps/superadmin/src/lib/superadminApi.ts`
— append the identical four strings, in the same order, to its own
duplicate `KNOWN_ACTION_TYPES` array. This is a deliberate, authorized
duplication of Item A's four strings — not a shared import, per §5's
explicit boundary.

**C. SuperAdmin UI labels.** `apps/superadmin/src/pages/AuditTrail.tsx`
— append four entries to `ACTION_LABELS`, using exactly the wording
below (reused verbatim from this app's own existing `BusinessDetail.tsx`
terminology, not invented):

| Action type | Label |
|---|---|
| `initial_stock_recovery.authorized` | Recuperação de Capital Inicial autorizada |
| `initial_stock_recovery.consumed` | Recuperação de Capital Inicial executada |
| `business_worth_recovery.authorized` | Recuperação de Valor do Negócio autorizada |
| `business_worth_recovery.expired` | Recuperação de Valor do Negócio expirada |

No other line in this component changes — the `<select>`'s existing
`.map()` over `KNOWN_ACTION_TYPES` and `actionLabel()`'s existing
fallback already handle the wider list with zero further edits.

**D. Tests.** Extend `tests/superadmin-audit-log-query.test.ts`
additively (new fixtures + new named `it()` blocks per type; zero
existing `it()` edited, weakened, or removed — including the response-
allowlist test at lines 291–302, which independently enforces the
response-shape boundary in §6). Add a new file,
`tests/superadmin-audit-log-ui.test.ts`, mirroring the established
`tests/superadmin-business-directory-ui.test.ts` source-scan
convention (this repository has no React/DOM test harness; this is
the standing, already-accepted pattern for SuperAdmin UI verification).

## 4. Required Behavioral Guarantees

This authorization is conditioned on the implementation satisfying
every one of the following, without exception:

1. **All four action types become valid `actionType` filter values**
   for `queryAuditLog()`, and become selectable options in the Audit
   Trail's action-type dropdown, each with a non-fallback Portuguese
   label.
2. **Every existing action type continues to filter identically** —
   no existing `it()` in `tests/superadmin-audit-log-query.test.ts` is
   edited or removed; all must continue passing unmodified.
3. **Unknown/unapproved action types remain rejected** — the existing
   `'rejects an unknown actionType'` test must remain, unmodified, and
   passing.
4. **The response shape does not change** — `AuditLogEntryRow` is not
   edited; the existing `'every entry contains exactly the approved
   field set...'` test (asserting an exact 8-key `Object.keys()` set)
   must remain, unmodified, and passing. This is the enforced boundary
   for §6, below — not merely a stated intention.
5. **The 100-row cap and five-filter combinability are unchanged** —
   the existing tests proving both (lines 111–124 and 177–239 of
   `tests/superadmin-audit-log-query.test.ts`) must remain, unmodified,
   and passing.
6. **No producer is touched** — none of `server/index.ts`'s existing
   write sites for these four action types, nor
   `server/businessWorthRecoveryExpiryAudit.ts`, may be modified.
7. **No authorization/tenant-isolation surface is touched** —
   `server/superadminAuth.ts`, the `requireAuth`/`requirePlatformOperator`/
   `requireSuperAdmin` chain, and `firestore.rules` are not modified.
8. **The two allowlists remain deliberately duplicated** — no
   consolidation into `packages/shared-types` or any other shared
   mechanism is performed under this authorization (§5).

## 5. Explicitly Prohibited Scope

This authorization does **not** permit, and any of the following found
necessary during implementation must halt and return to governance
review rather than proceed silently:

- `targetStockCountId` / `authorizationId` response-field expansion,
  or any other change to `AuditLogEntryRow`.
- Any new audit field, new audit event type, or new audit producer.
- Any change to audit-write behavior (`writeAuditLogEntry()`, the
  Business Worth Recovery expiry sweep's transaction, or any route's
  write call).
- Any `firestore.rules` or `firestore.indexes.json` change.
- Any change to SuperAdmin authorization or tenant isolation.
- Any change to Business Directory, Suspend/Reactivate, Payment
  Operations, or Recovery Authorization *behavior* (their already-
  correct audit entries simply become filterable — nothing about how
  or when they are created changes).
- Any audit-log retention policy work.
- Any localization-infrastructure work (this app has no i18n system;
  none is introduced by this authorization — plain hardcoded PT
  strings, matching the existing convention, are the entire scope of
  Item C).
- Consolidation or refactoring of the duplicated allowlists into
  `packages/shared-types` or any other shared abstraction.
- Any unrelated SuperAdmin capability: dashboard/home, subscription
  operations, tenant management, feature flags, analytics,
  notifications, impersonation, system health, or any other cleanup.

Any of the above, if it appears necessary during implementation, is a
**new governance question** requiring its own decision — not something
this authorization permits resolving unilaterally mid-build.

## 6. Preserved Architecture — Explicitly Reaffirmed, Not Reopened

This authorization changes nothing about, and does not reopen:

- **Phase D / ADR-0006** — the Audit Center's own filtering
  architecture (five combinable filters, 100-row cap, curated response
  shape) is restated, not amended, in §3–4 above.
- **The four action types' own governance** (BDR-0016/POL-0009;
  Business Worth Evolution Increments 8–9) — their existence, meaning,
  producers, and actor-role model are unaffected; this authorization
  only concerns their visibility inside an already-existing query/
  filter mechanism.
- **`PlatformAuditLogEntry`'s schema** (`packages/shared-types/index.ts`)
  — unmodified; `targetStockCountId`/`authorizationId` remain defined
  there but out of `auditLogQuery.ts`'s own curated response, exactly
  as today.
- **Tenant isolation / SuperAdmin authorization** — the
  `requireAuth`→`requirePlatformOperator`→`requireSuperAdmin` chain
  and every `firestore.rules` boundary remain exactly as already
  verified in the SuperAdmin panel investigation.

## 7. Explicitly Prohibited Scope — Cross-Reference

See §5, above; duplicated here as a single authoritative list per this
repository's established authorization-document convention. No
additional items beyond §5 apply.

## 8. Distinction Preserved

**Product Architect Acceptance of the Plan** (recorded 2026-09-06,
within the plan document itself) and **this Implementation
Authorization** are two distinct governance events, per this
repository's established sequence — the former accepted the plan as
the correct engineering translation of the confirmed defect and the
existing Phase D authorization; this document is the separate,
subsequent act that permits code to be written against that accepted
plan. This authorization would not exist, and could not be granted,
without that prior acceptance already having occurred — but the two
are not the same act, and are recorded in separate artifacts
accordingly.

## 9. Boundary of This Task

**No application code, test, schema, or Firestore-rules file was
modified to produce this authorization.** This document changes the
governance state to "Implementation Authorized" — it does not, itself,
implement any part of the authorized plan. A subsequent, separate task
is required to write the actual code, tests, and any resulting pull
request(s).

---

## Product Architect Authorization

**Status:** ✅ **IMPLEMENTATION AUTHORIZED (2026-09-06).**

> I authorize implementation of
> `SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md` exactly
> as accepted, strictly bounded by §3–7 of this document. This
> authorization does not extend to any scope not named in the accepted
> plan, and any discovery during implementation that the accepted plan
> is incomplete or inaccurate in a way affecting the four action
> types' own governance, Phase D's authorization, or the response-shape
> boundary requires a return to governance review before proceeding —
> it is not to be resolved silently during implementation.
>
> This authorization confirms explicitly: this is a **maintenance
> correction within already-authorized Phase D functionality**, not a
> new product capability. No new architecture, no new audit mechanism,
> no new authorization model, and no shared-type refactor is
> authorized by this document.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 2026-09-06

---

## Governance State After This Authorization

```
Investigation — CONFIRMED IMPLEMENTATION DEFECT
        ↓
Implementation Plan — ACCEPTED
        ↓
Implementation Plan Governance Review — READY FOR PRODUCT ARCHITECT ACCEPTANCE
        ↓
Product Architect Acceptance — ACCEPTED
        ↓
IMPLEMENTATION AUTHORIZATION — AUTHORIZED  ◄── this document
        ↓
Implementation — NEXT STEP, NOT PERFORMED BY THIS DOCUMENT
```
