# SuperAdmin Audit Center Action-Type Allowlist Implementation Plan

**Status: ACCEPTED (2026-09-06) — IMPLEMENTATION NOT AUTHORIZED**

This is a planning artifact. No application code, test, schema, or
`firestore.rules` file is modified by this document. Product Architect
Acceptance (recorded at the end of this document) is a distinct,
prior governance event from Implementation Authorization — the latter
remains a separate, not-yet-performed gate; no code may be changed on
the strength of this acceptance alone.

---

## 1. Executive Summary

This plan implements exactly, and only, the correction identified in
[`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md):
four already-authorized `platform_audit_log` action types
(`initial_stock_recovery.authorized`, `initial_stock_recovery.consumed`,
`business_worth_recovery.authorized`, `business_worth_recovery.expired`)
are written correctly today but are absent from the Audit Center's two
action-type allowlists (backend validation + UI filter), and have no
UI label. This plan adds them to both existing lists, adds their UI
labels using terminology already established elsewhere in this exact
app, and extends/adds tests proving the fix without touching anything
else. The response shape, audit-write behavior, authorization chain,
100-row cap, and five-filter architecture are all explicitly preserved
unchanged and are each independently verified as unchanged by an
already-existing test.

---

## 2. Confirmed Defect

Restated from the investigation, re-verified fresh this session by
direct inspection (not assumed from the prior artifact):

- `server/auditLogQuery.ts`'s `KNOWN_ACTION_TYPES` (lines 48–56) lists
  exactly 7 strings.
- `grep -n "actionType:" server/index.ts` plus
  `server/businessWorthRecoveryExpiryAudit.ts` confirms **10 distinct
  literal `actionType` values are actually written** to
  `platform_audit_log` across the codebase; 7 match the allowlist, 4
  do not:
  `initial_stock_recovery.authorized`, `initial_stock_recovery.consumed`,
  `business_worth_recovery.authorized`, `business_worth_recovery.expired`.
- `apps/superadmin/src/lib/superadminApi.ts` (lines 373–381) carries a
  second, manually duplicated copy of the same stale 7-entry list,
  consumed directly by `AuditTrail.tsx`'s filter dropdown (line 94).
- `AuditTrail.tsx`'s `ACTION_LABELS` (lines 10–18) has no entry for any
  of the 4 missing types — `actionLabel()`'s safe fallback (line 26)
  means this never crashes or mislabels, it just shows the raw
  machine-readable string instead of a translated label.

---

## 3. Existing Authorized Scope

All four action types belong to already-authorized, already-
implemented, already-verified SuperAdmin capabilities:

- `initial_stock_recovery.authorized` / `.consumed` — BDR-0016,
  POL-0009, `superadmin-assisted-initial-stock-recovery-specification.md`,
  Rule 8 assessment (Finding H names this exact `actionType` string),
  signed Implementation Authorization (2026-08-21).
- `business_worth_recovery.authorized` / `.expired` — Business Worth
  Evolution Implementation Plan/Authorization, Increments 8–9.

This work is a **maintenance correction inside the already-authorized
Phase D Audit Center capability** (ADR-0006), not a new capability.
`auditLogQuery.ts`'s own header comment already states the intended
process: *"actionType itself remains an open string on the schema...
this list is a Phase D filter-validation allowlist, not a schema
constraint; a future phase adding a new action type updates this
list."* This plan performs exactly that already-anticipated update.

**No new Product Architect decision is created by this plan.** No
governance conflict was found during this session's re-verification —
see §16.

---

## 4. Exact Behavioral Objective

After this plan's implementation:

1. `queryAuditLog(db, { actionType: X })` returns `{ outcome: 'ok', ... }`
   for all 11 now-known action types (7 existing + 4 added), and
   `{ outcome: 'invalid', ... }` for any other string — identical
   validation behavior, wider allowlist only.
2. The Audit Trail's "Ação" dropdown offers all 11 as selectable
   options, each with a human-readable Portuguese label.
3. Every other Audit Center behavior — the 100-row cap, the five
   combinable filters, the curated response field set, unfiltered
   default view, ordering — is provably unchanged.

---

## 5. Backend Implementation

**File:** `server/auditLogQuery.ts`
**Change:** append 4 entries to the existing `KNOWN_ACTION_TYPES`
array literal (lines 48–56). No other line in this file changes.

```ts
export const KNOWN_ACTION_TYPES = [
  'payment.confirmed',
  'payment.rejected',
  'operator.provisioned',
  'operator.revoked',
  'business.viewed',
  'business.suspended',
  'business.reactivated',
  'initial_stock_recovery.authorized',
  'initial_stock_recovery.consumed',
  'business_worth_recovery.authorized',
  'business_worth_recovery.expired',
] as const;
```

`KnownActionType` (line 58) is a derived type
(`(typeof KNOWN_ACTION_TYPES)[number]`) — it updates automatically,
no separate edit needed. `queryAuditLog()`'s validation logic (line
163) reads this same constant — no change needed there; a wider array
is the entire fix at this layer.

**No route change.** `server/index.ts`'s `GET /api/superadmin/audit-log`
handler (confirmed at line ~2897–2907) already passes
`req.query.actionType` through to `queryAuditLog()` verbatim as an
untyped string — it performs no allowlist check of its own and
requires no edit.

---

## 6. UI Implementation

**File:** `apps/superadmin/src/lib/superadminApi.ts`
**Change:** append the identical 4 entries to its own
`KNOWN_ACTION_TYPES` array (lines 373–381), in the same order, for the
reason given in §11 (duplication is kept, not consolidated, for this
plan).

**File:** `apps/superadmin/src/pages/AuditTrail.tsx`
**Change:** append 4 entries to `ACTION_LABELS` (lines 10–18) — see
§7 for exact wording. No other line in this component changes: the
`<select>`'s `.map()` over `KNOWN_ACTION_TYPES` (line 94) and
`actionLabel()`'s fallback (line 25–27) already handle any array
length correctly with zero further edits.

---

## 7. Localization

**Existing convention, confirmed this session:** `apps/superadmin` has
**no i18n/translation-key system** (confirmed: no `i18n`, `useLanguage`,
or `LanguageContext` reference anywhere under `apps/superadmin/src/`).
Every user-facing string, including the existing 7
`ACTION_LABELS` entries, is a plain hardcoded Portuguese string
literal inside the component. "The existing localization convention"
for this app **is** that hardcoded-string pattern — there is no
translation-key mechanism to plug into, and inventing one here would
be an unauthorized architectural addition, not a minimal fix.

**Wording is not invented — each label reuses terminology already
live in this exact app**, found in `apps/superadmin/src/pages/BusinessDetail.tsx`:

- Line 358: `<h3>Recuperação de Capital Inicial</h3>`
- Line 368: `Autorizar recuperação de Capital Inicial`
- Line 442: `<h3>Recuperação de Valor do Negócio</h3>`
- Line 452: `Autorizar recuperação de Valor do Negócio`
- Line 360: *"...quem **executa** a recuperação é sempre o dono do
  negócio"* — `executa`/`execução` is this app's own existing verb for
  the Owner's consumption action, reused below rather than inventing
  a synonym.

**Exact new `ACTION_LABELS` entries:**

```ts
const ACTION_LABELS: Record<string, string> = {
  'payment.confirmed': 'Pagamento confirmado',
  'payment.rejected': 'Pagamento rejeitado',
  'operator.provisioned': 'Operador provisionado',
  'operator.revoked': 'Operador revogado',
  'business.viewed': 'Negócio consultado',
  'business.suspended': 'Negócio suspenso',
  'business.reactivated': 'Negócio reativado',
  'initial_stock_recovery.authorized': 'Recuperação de Capital Inicial autorizada',
  'initial_stock_recovery.consumed': 'Recuperação de Capital Inicial executada',
  'business_worth_recovery.authorized': 'Recuperação de Valor do Negócio autorizada',
  'business_worth_recovery.expired': 'Recuperação de Valor do Negócio expirada',
};
```

No new translation key infrastructure of any kind is introduced.

---

## 8. Test Strategy

### 8.1 Extended, not replaced: `tests/superadmin-audit-log-query.test.ts`

This file already contains a test (lines 251–257) that iterates
`KNOWN_ACTION_TYPES` generically:
```ts
it('accepts every value in KNOWN_ACTION_TYPES', async () => {
  for (const actionType of KNOWN_ACTION_TYPES) { ... assert 'ok' ... }
});
```
Adding the 4 entries to the array causes this existing test to cover
them **automatically, with zero edits to this test itself** — this is
the single strongest piece of existing test architecture supporting
this fix, and is why the plan for this file is "extend," not
"rewrite."

**New additions to this same file** (extending, in the same style as
the existing named per-type tests, e.g. `'filters by actionType'`):

1. Add 4 new fixture entries to `FIXTURES` (or a small dedicated
   fixture array, matching the file's own existing style — one entry
   per new action type, each with a realistic `actorUid`/`actorRole`
   reflecting §8 of the investigation's finding that these events are
   not uniformly superadmin-authored: an `actorRole: 'owner'` fixture
   for `.consumed`, an `actorRole: 'system'` fixture for `.expired`,
   `actorRole: 'superadmin'` for the two `.authorized` types).
2. One new `it()` per type (4 total, mirroring the existing
   `'filters by actionType'` test's shape at line 149) proving a
   filtered query returns exactly the matching fixture entry.
3. **No existing `it()` block in this file is edited or removed.**

### 8.2 New file: `tests/superadmin-audit-log-ui.test.ts`

No existing test file references `AuditTrail.tsx` at all (confirmed by
`grep -rl "AuditTrail.tsx" tests/*.test.ts` — no match). This plan
adds one new file, mirroring the established
`tests/superadmin-business-directory-ui.test.ts` pattern exactly (same
header rationale — no React/DOM test harness exists in this
repository, so this is source-inspection, not behavioral rendering):

- Reads `apps/superadmin/src/pages/AuditTrail.tsx` and
  `apps/superadmin/src/lib/superadminApi.ts` via `readFileSync`.
- Asserts the dropdown's options still derive from
  `KNOWN_ACTION_TYPES` (not a second, hardcoded option list).
- Asserts all 4 new types have a non-fallback entry in `ACTION_LABELS`
  (i.e., the label differs from the raw machine string).
- Asserts the two `KNOWN_ACTION_TYPES` copies
  (`server/auditLogQuery.ts` and `apps/superadmin/src/lib/superadminApi.ts`)
  contain the identical 11-element set — this is the one regression
  guard directly protecting against the exact failure mode that
  produced the original defect, without requiring the two files to be
  merged into one (§11).
- Asserts the UI still imports `fetchAuditLog`/`KNOWN_ACTION_TYPES`
  only from `../lib/superadminApi` — never the Firestore client SDK
  directly (mirroring the Business Directory UI test's own boundary
  check).

### 8.3 Requirement-by-requirement mapping

| Requirement | How proven |
|---|---|
| A. Each of the 4 types accepted by the query layer | §8.1 item 1 (generic loop, automatic) + item 2 (4 explicit per-type tests) |
| B. Each selectable through the UI filter, where architecture supports it | §8.2 — source-inspection proof the dropdown option list includes all 4 (behavioral click-through is out of reach — no DOM harness exists, same standing limitation as every prior SuperAdmin UI test) |
| C. Existing action types remain filterable | Every existing `it()` in `tests/superadmin-audit-log-query.test.ts` is untouched and continues to run — regression by construction |
| D. Unknown/unapproved types remain rejected | The existing `'rejects an unknown actionType'` test (line 245) is untouched — still asserts `'not.a.real.action'` is rejected |
| E. The 4 events remain correctly written by their existing producers | Unchanged — this plan touches no producer file (`server/index.ts`'s write sites, `server/businessWorthRecoveryExpiryAudit.ts`); existing coverage in `tests/superadmin-initial-stock-recovery-authorization.test.ts`, `tests/superadmin-initial-stock-recovery-consumption.test.ts`, `tests/business-worth-audit-trail.test.ts`, `tests/business-worth-audit-trail-wiring.test.ts` remains valid and untouched |
| F. SuperAdmin authorization remains required | Unchanged — `requireAuth`/`requirePlatformOperator`/`requireSuperAdmin` are not touched by this plan; no test in `tests/superadmin-operational-control-plane.test.ts` or `tests/superadmin-payment-operations.test.ts` needs any edit |
| G. Tenant/business scoping unchanged | Unchanged — `targetBusinessId` filtering logic in `queryAuditLog()` is not touched |
| H. No response-shape changes | Proven by the **existing, untouched** test `'every entry contains exactly the approved field set...'` (line 291) — this test does a `deepEqual` on `Object.keys(entry).sort()` against a fixed 8-field list; if this plan's implementation ever accidentally added `targetStockCountId`/`authorizationId` (explicitly out of scope, §11), this exact test would fail immediately. Its continued, unmodified presence and pass is the acceptance proof for H. |
| I. 100-row cap unchanged | Proven by the existing, untouched `'the 100-row limit is enforced...'` test (line 111) |
| J. Existing five-filter behavior unchanged | Proven by the existing, untouched `'combined filters (Decision A)'` describe block (lines 177–239) |

### 8.4 Source-scan window check (explicitly performed, not skipped)

Checked every test file that references any of the three files this
plan touches (`grep -rl "auditLogQuery\|superadminApi.ts\|AuditTrail.tsx" tests/*.test.ts`
→ `business-worth-correction-recovery-ui.test.ts`,
`superadmin-audit-log-firestore-query.test.ts`,
`superadmin-audit-log-query.test.ts`,
`superadmin-business-directory-api.test.ts`). None of the three uses a
fixed-character `.slice(start, start + N)` window against any of
these three files — `business-worth-correction-recovery-ui.test.ts`
and `superadmin-business-directory-api.test.ts` both use whole-file
`.match()` regexes (position-independent), and
`superadmin-audit-log-firestore-query.test.ts` imports `queryAuditLog`
directly rather than scanning source text. **No source-scan window
adjustment is required by this plan** — confirmed by direct
inspection, not assumed.

`tests/superadmin-audit-log-firestore-query.test.ts` (emulator-only,
unrunnable in a sandbox without Firestore-emulator network access,
per its own header) is not modified by this plan — its fixtures test
`queryAuditLog()`'s real-engine behavior generically, not per-type,
and are unaffected by a wider allowlist. Extending it with the 4 new
types' fixtures would be a reasonable follow-on but is not required to
prove this plan's own acceptance criteria, and this plan does not
propose it as in-scope.

---

## 9. Security / Tenant Isolation

No change to any of the following, confirmed by the fact that this
plan's entire diff surface is: two array literals gaining 4 string
entries each, one object literal gaining 4 key-value pairs, and
additive-only test code.

- **SuperAdmin authorization** — `requireAuth`, `requirePlatformOperator`,
  `requireSuperAdmin` (all in `server/superadminAuth.ts` and the route
  chain in `server/index.ts`) are not in this plan's file list at all.
- **Tenant isolation** — `queryAuditLog()` reads only
  `platform_audit_log`, already fully Admin-SDK-gated; widening which
  `actionType` *values* are legal query inputs does not widen which
  *documents* are readable — unfiltered/other-filtered queries already
  return these 4 types' documents today (confirmed in the
  investigation, §8/§9 of that artifact).
- **Business scoping** — `targetBusinessId` filtering is untouched.
- **Actor attribution** — already correct at write time in each
  producer (untouched by this plan); the fix only concerns which
  strings the *query validator* accepts.

---

## 10. Response-Shape Boundary

**Explicitly, permanently out of scope for this plan.** The
`AuditLogEntryRow` interface (`server/auditLogQuery.ts` lines 68–77)
is not edited. No field is added, removed, or renamed. This is
independently enforced by the existing, untouched
`'every entry contains exactly the approved field set...'` test
(§8.3, row H) — any accidental scope creep into `targetStockCountId`/
`authorizationId` would fail that test immediately, without requiring
a reviewer to manually check for it.

The investigation's own separate finding about these two fields being
useful-but-currently-dropped (its §7) is **not addressed by this
plan** and is not implied to be addressed by anything in this plan's
scope, per the explicit out-of-scope instruction governing this task.

---

## 11. Explicit Out-of-Scope Items

Per the governing task's own list, restated here as this plan's own
binding boundary:

- `targetStockCountId` / `authorizationId` response expansion.
- Any other response-shape change.
- New audit fields, new audit event types, new audit producers.
- Any change to audit-write behavior (`writeAuditLogEntry()`,
  `server/businessWorthRecoveryExpiryAudit.ts`'s transaction, or any
  route's write call).
- `firestore.rules` changes.
- SuperAdmin authorization changes.
- Tenant isolation changes.
- Business Directory, Suspend/Reactivate, Payment Operations, or
  Recovery Authorization *behavior* changes (only their already-
  existing, already-correct audit *entries* become filterable —
  nothing about how/when they're created changes).
- Audit retention policy.
- Audit-log architecture redesign.

**Duplicated-allowlist consolidation — investigated, deliberately not
adopted for this plan:** `packages/shared-types` (`packages/shared-types/index.ts`)
is confirmed to be this repository's established mechanism for
sharing closed string-literal sets between `server/` and
`apps/superadmin/` across a `@sabush/shared-types` path alias — it
already hosts `PlatformRole`, a structurally similar closed-union
value shared across exactly these same two boundaries. Moving
`KNOWN_ACTION_TYPES`/`KnownActionType` there would be architecturally
consistent with that precedent, and would structurally prevent a
fifth future omission of this same kind (the investigation's own §15
item 2 named this as a reasonable future direction). **This plan does
not adopt it**, because the governing task for this plan explicitly
requires proving the existing authorized scope *already requires* a
new abstraction before introducing one, and the Audit Center defect
itself is fully correctable — provably, by the test strategy in §8 —
without moving any code across the package boundary. Consolidation
remains a legitimate, separately-proposable follow-up (already named
in the investigation's own §15), not a hidden requirement of this
plan. Per §6 (option A), both existing lists are updated
independently and minimally.

---

## 12. Exact File Scope

| File | Change | Type |
|---|---|---|
| `server/auditLogQuery.ts` | Append 4 entries to `KNOWN_ACTION_TYPES` (lines 48–56) | Production, minimal |
| `apps/superadmin/src/lib/superadminApi.ts` | Append the same 4 entries to its own `KNOWN_ACTION_TYPES` (lines 373–381) | Production, minimal |
| `apps/superadmin/src/pages/AuditTrail.tsx` | Append 4 entries to `ACTION_LABELS` (lines 10–18) | Production, minimal |
| `tests/superadmin-audit-log-query.test.ts` | Extend: 4 new fixtures + 4 new `it()` blocks; zero existing lines removed or altered | Test, additive |
| `tests/superadmin-audit-log-ui.test.ts` | New file, mirrors `tests/superadmin-business-directory-ui.test.ts`'s established pattern | Test, new |

**No other file is expected to change.** No file outside this table
should appear in the eventual implementation diff.

---

## 13. Implementation Sequence

1. `server/auditLogQuery.ts` — append the 4 allowlist entries.
2. `apps/superadmin/src/lib/superadminApi.ts` — append the identical 4
   entries.
3. `apps/superadmin/src/pages/AuditTrail.tsx` — append the 4
   `ACTION_LABELS` entries.
4. `tests/superadmin-audit-log-query.test.ts` — add fixtures + 4 new
   `it()` blocks.
5. `tests/superadmin-audit-log-ui.test.ts` — new file.
6. Run verification (§14).
7. Diff audit against §12's table (§15 of the governing task; "Exact
   diff/scope audit criteria" below).

Steps 1–3 are independent of each other and could be done in any
order; 4–5 depend on 1–3 being complete first.

---

## 14. Verification Strategy

Commands to run once implemented (not run by this planning task):

```
npx tsc --noEmit -p apps/tenant        # apps/superadmin has its own tsconfig — see below
npx tsc --noEmit -p apps/superadmin
npx tsx --test tests/superadmin-audit-log-query.test.ts
npx tsx --test tests/superadmin-audit-log-ui.test.ts
npm run test:all                        # full existing regression chain
git diff --stat                         # confirm only the 5 files in §12 changed
```

Expected outcomes: all typechecks clean; `superadmin-audit-log-query.test.ts`
passes with more `it()`s than before (all passing, none removed);
`superadmin-audit-log-ui.test.ts` passes as a new, fully-passing file;
`test:all` shows no new failures relative to the baseline already
established in this repository's own prior sessions (two pre-existing,
unrelated failures in `superadmin-assisted-initial-stock-recovery.test.ts`
are expected to remain, per the investigation's own §15/§10 — not
caused by, and not fixed by, this plan).

---

## 15. Rollback Strategy

Every change in §12 is independently, trivially revertible: reverting
any of the 3 production files returns that file's allowlist/label set
to exactly its current 7/7-entry state, with no data migration
implied in either direction (no schema change, no write-path change,
no persisted document is affected by this plan in any way — this is a
pure read/validation/display-layer change). Reverting the 2 test
changes removes only additive test coverage, never weakening or
removing an existing assertion. No feature flag or staged rollout is
needed given the size and blast radius of the change.

---

## 16. Governance Traceability

Re-confirmed this session, not merely cited from the investigation:

- The 4 action types' own existence as audit events: already decided,
  signed, and implemented (§3).
- Whether Phase D (Audit Center Filtering, ADR-0006) should expose
  every `platform_audit_log` action type that exists: already the
  documented intent of `auditLogQuery.ts`'s own header comment (§1,
  §3 above) — not a new decision this plan is making on the Product
  Architect's behalf.
- **No governance conflict was found.** No document anywhere states
  these 4 types should be excluded from Audit Center filtering; no
  document states the two-allowlist duplication must be preserved or
  must be consolidated. §11's decision to keep the duplication for
  this plan is an implementation-scope judgment consistent with the
  governing task's own explicit instruction, not a governance
  resolution.
- **This plan does not require, and does not create, a new Product
  Architect decision.** The existing Phase D authorization is
  sufficient to cover this correction.

---

## 17. Acceptance Criteria

Mirrors the governing task's own 13-item list exactly:

1. ✅ All four action types recognized by `queryAuditLog()`'s
   validation (§5, §8.1).
2. ✅ All four available through the SuperAdmin action-type filter
   (§6, §8.2).
3. ✅ Human-readable PT labels exist, using this app's own existing
   terminology (§7).
4. ✅ Existing 7 action types continue working — proven by every
   existing, untouched test in `tests/superadmin-audit-log-query.test.ts`
   (§8.3, row C).
5. ✅ Unknown action types remain excluded/rejected — proven by the
   existing, untouched `'rejects an unknown actionType'` test (§8.3,
   row D).
6. ✅ Existing audit producers remain unchanged — no producer file is
   in §12's file list.
7. ✅ Audit records remain correctly scoped — `targetBusinessId`
   logic untouched (§9).
8. ✅ SuperAdmin authorization remains unchanged — no authorization
   file is in §12's file list (§9).
9. ✅ The 100-row limit remains unchanged — proven by the existing,
   untouched test (§8.3, row I).
10. ✅ Existing five-filter behavior remains unchanged — proven by the
    existing, untouched combined-filter describe block (§8.3, row J).
11. ✅ No response-shape fields added — `AuditLogEntryRow` not in
    §12's file list; independently enforced by an existing test
    (§10).
12. ✅ No `targetStockCountId`/`authorizationId` work included (§10,
    §11).
13. ✅ No unrelated SuperAdmin capability changed — §12's file list is
    exhaustive and limited to the allowlist/label/test surface.

---

## 18. Implementation Authorization Boundary

**This plan does not authorize implementation.** Per the governing
task, the next gate is Implementation Plan Governance Review — this
document has not been reviewed, accepted, or authorized by anyone. No
code, test, or governance file beyond this plan itself has been
touched to produce it (confirmed: `git status --short` shows only this
new file).

```
Implementation Plan — DRAFTED
        ↓
Implementation Plan Governance Review — COMPLETE (READY FOR PRODUCT
ARCHITECT ACCEPTANCE)
        ↓
Product Architect Acceptance — ACCEPTED (see below)
        ↓
Implementation Authorization — NEXT GATE, NOT YET PERFORMED
        ↓
Implementation — NOT PERFORMED BY THIS DOCUMENT
```

---

## Product Architect Acceptance

**Status:** ✅ **ACCEPTED (2026-09-06).**

> I formally accept this Implementation Plan as the implementation
> blueprint for correcting the confirmed SuperAdmin Audit Center
> action-type allowlist defect, exactly as reviewed in
> [`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN_GOVERNANCE_REVIEW.md)
> (verdict: READY FOR PRODUCT ARCHITECT ACCEPTANCE, zero corrections
> required). No change is made to this plan by this acceptance beyond
> the top-of-document status line.
>
> This acceptance confirms:
>
> 1. The four action types — `initial_stock_recovery.authorized`,
>    `initial_stock_recovery.consumed`, `business_worth_recovery.authorized`,
>    `business_worth_recovery.expired` — remain governed exclusively by
>    their own respective, already-signed governance chains (BDR-0016/
>    POL-0009; Business Worth Evolution Increments 8–9). This
>    acceptance does not reopen, re-decide, or add to those chains — it
>    only accepts that these already-authorized events may become
>    filterable in the already-authorized Phase D Audit Center.
> 2. The existing Phase D (ADR-0006) authorization is sufficient to
>    cover this correction, per §3/§16 of the plan and independently
>    confirmed in the Governance Review's §3 (citing the Phase D Rule 8
>    Assessment's own "no structural dependency on any fixed action-type
>    set" language). No new Product Architect decision beyond this
>    acceptance is created or required.
> 3. The backend change is accepted exactly as specified in §5: append
>    the four strings to `KNOWN_ACTION_TYPES` in
>    `server/auditLogQuery.ts`. No other line in that file changes.
> 4. The UI change is accepted exactly as specified in §6/§7: append
>    the identical four strings to `apps/superadmin/src/lib/superadminApi.ts`'s
>    own duplicate list, and add the four `ACTION_LABELS` entries to
>    `apps/superadmin/src/pages/AuditTrail.tsx`, using the exact
>    wording given in §7 (reused from this app's own existing
>    `BusinessDetail.tsx` terminology, not invented).
> 5. The decision in §11 to retain the two duplicated allowlists and
>    update both independently, rather than consolidate into
>    `packages/shared-types`, is accepted for this plan's scope.
>    Consolidation remains a legitimate, separately-proposable future
>    improvement — it is not authorized by this acceptance, and no
>    future session should treat this plan as having implicitly
>    endorsed it.
> 6. The test strategy in §8 — extending
>    `tests/superadmin-audit-log-query.test.ts` (additively; no
>    existing assertion edited or removed) and adding the new
>    `tests/superadmin-audit-log-ui.test.ts` (mirroring the established
>    `tests/superadmin-business-directory-ui.test.ts` source-scan
>    convention) — is accepted as written.
> 7. The explicit out-of-scope list in §11 remains fully binding on any
>    implementation of this plan. In particular:
>    `targetStockCountId`/`authorizationId` response-shape expansion is
>    **not** authorized by this acceptance — even though the Governance
>    Review's §8 notes these fields are already governed at the
>    `PlatformAuditLogEntry` schema level, promoting them into
>    `auditLogQuery.ts`'s own curated `AuditLogEntryRow` response is a
>    separate, not-yet-proposed piece of work requiring its own plan.
> 8. No security, tenant-isolation, `firestore.rules`, or SuperAdmin-
>    authorization change is authorized by this acceptance — none is
>    proposed anywhere in the plan, confirmed independently by the
>    Governance Review's §9.
>
> **This acceptance does not constitute Implementation Authorization.**
> No application code, test, schema, or Firestore-rules file may be
> changed on the strength of this acceptance alone. Implementation
> Authorization remains a separate, subsequent, not-yet-performed
> governance gate.
>
> **Existing Authorization Basis:** Phase D / ADR-0006 (SuperAdmin V1
> Operational Control Plane).
>
> **Product Architect:** SABUSHIMIKE MASCENI.
> **Date:** 2026-09-06.

**Implementation Plan drafted → reviewed → ACCEPTED.**
**Implementation Authorization still required.**
**No application code may be changed until the Product Architect signs
the separate Implementation Authorization.**
