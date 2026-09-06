# SuperAdmin Audit Center Action-Type Implementation Plan — Governance Review

**Status: GOVERNANCE REVIEW COMPLETE — IMPLEMENTATION NOT AUTHORIZED**

Plan-review only. No application code, test, schema, specification, or
`firestore.rules` file was modified to produce this document. The
Implementation Plan under review is not accepted, not corrected, and
not authorized by this document.

---

## 1. Executive Summary

The Implementation Plan
([`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_IMPLEMENTATION_PLAN.md))
was checked against the Investigation
([`SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md`](./SUPERADMIN_AUDIT_CENTER_ACTION_TYPE_INVESTIGATION.md))
and against the live repository, independently re-verified line by
line rather than trusted from either prior artifact. **Zero
discrepancies were found.** Every file reference, line number, and
code excerpt in the plan matches the current repository state exactly
(confirmed: `git status --short` shows no changes since the plan was
drafted). One piece of **additional confirming evidence**, not cited
in the plan itself, was found during this review — Phase D's own
Rule 8 Assessment (§17, "Phase Dependencies") states outright that
Phase D's filtering mechanism "has no structural dependency" on any
fixed set of action types and was explicitly built to accommodate
future ones. This strengthens, and does not contradict, the plan's own
authorization claim. **No correction to the plan was required or
made.**

---

## 2. Confirmed Defect

Re-verified directly against `server/auditLogQuery.ts` (current, live
file, not assumed from either prior artifact):

```
lines 48-56: KNOWN_ACTION_TYPES = [7 entries] — unchanged since the
investigation and the plan were both drafted.
```

Cross-checked against every `actionType:` literal in `server/*.ts`
(re-run fresh this session): 10 distinct values written, 7 in the
allowlist, 4 not — the same four the plan names. No fifth value was
found; the three architecturally-named-but-never-implemented types
mentioned in `packages/shared-types/index.ts`'s own comment
(`support_session.issued`, `subscription.overridden`, `flag.changed`)
were checked and confirmed to appear nowhere as an actual write —
confirming the investigation's/plan's inventory remains complete and
accurate.

---

## 3. Phase D Authorization Verification

**Classification: AUTHORIZED WITHIN EXISTING PHASE D SCOPE.**

Evidence, gathered fresh this session directly from the governance
artifacts (not merely re-cited from the plan):

- **ADR-0006**, §16 Definition of Done: *"The Audit Center can filter
  by business, actor, action type, and time range."* This requirement
  is stated generically — it names the filter *dimensions*, not a
  fixed enumeration of specific action-type strings. Nothing in
  ADR-0006 defines or limits Audit Center scope to the 7 types that
  happened to exist when Phase D was completed.
- **`docs/engineering/18-superadmin-v1-operational-control-plane-rule8-assessment.md`**,
  §17 "Phase Dependencies (explicit)": *"Phase D depends on: A and C's
  new `actionType` values existing to filter against for a meaningful
  demo/test, though its own filtering mechanism has **no structural
  dependency** on either — it could be built and tested against
  Payment Operations' existing two action types alone if sequencing
  ever needs to change."* — **this is the single strongest piece of
  evidence found in this review**: Phase D's own governing Rule 8
  assessment explicitly anticipated and designed for exactly this
  situation (new action types arriving after Phase D's own initial
  scope), and explicitly states the filtering mechanism is
  action-type-count-agnostic by design. Neither the investigation nor
  the plan cited this specific passage; it independently corroborates
  their shared conclusion.
- **`packages/shared-types/index.ts`**, `PlatformAuditLogEntry.actionType: string`
  — confirmed, directly, to be an intentionally open (not closed-union)
  schema field, with its own governing comment: *"The union is
  deliberately open (string) rather than a closed literal union...
  this type is meant to describe the collection's schema in general,
  not just this slice's write set."* This is independent, schema-level
  confirmation of the same "open, extensible by design" principle
  `auditLogQuery.ts`'s own comment states at the query-validation
  layer.

No document anywhere — checked across ADR-0006, the Phase D Rule 8
assessment, `18-superadmin-v1-operational-control-plane-slice.md`, and
the four events' own governance chains — states or implies that Audit
Center filtering should be limited to a fixed, closed set of action
types, or that a future action type must clear a new governance gate
before becoming filterable. The plan's own §3/§16 conclusion is
correct and is now backed by stronger evidence than it originally
cited.

---

## 4. Four Action-Type Verification

Each re-confirmed directly against the live producer code this
session (not re-derived from the plan's own citations):

| Type | Producer (re-confirmed) | Governance (re-confirmed) | Plan touches producer? |
|---|---|---|---|
| `initial_stock_recovery.authorized` | `server/index.ts`, `POST /api/superadmin/initial-stock-recovery/:businessId/authorize` (still `requireAuth`→`requirePlatformOperator`→`requireSuperAdmin`) | BDR-0016, POL-0009, signed Implementation Authorization (2026-08-21) | **No** — not in file scope table |
| `initial_stock_recovery.consumed` | `server/index.ts`, `POST /api/initial-stock-recovery/consume` (tenant-facing, `tenantOnly`, `actorRole: 'owner'`) | Consumption & Audit Amendment, signed Supplementary Implementation Authorization (2026-08-21) | **No** |
| `business_worth_recovery.authorized` | `server/index.ts`, `POST /api/superadmin/business-worth-recovery/:businessId/authorize` | Business Worth Evolution Implementation Plan/Authorization, Increment 8 | **No** |
| `business_worth_recovery.expired` | `server/businessWorthRecoveryExpiryAudit.ts` (background sweep, `actorRole: 'system'`) | Business Worth Evolution, Increment 9, Rule 8 Finding 11-A (confirmed directly in `packages/shared-types/index.ts`'s own comment, §3 above) | **No** |

`actorRole: PlatformRole | 'owner' | 'system'` — confirmed, directly
in `packages/shared-types/index.ts`, to already be the governed,
signed-off type for exactly the actor-role diversity these four events
introduce. This independently validates the plan's §8.1 fixture design
(distinct `actorRole` values per type), which was written before this
confirmation was checked.

**The plan does not modify any producer.** Confirmed: none of
`server/index.ts`'s write sites or
`server/businessWorthRecoveryExpiryAudit.ts` appear in the plan's §12
file table.

---

## 5. Backend Allowlist Review

Confirmed directly against the live file:

- `KNOWN_ACTION_TYPES` (lines 48–56) is the sole authority consumed by
  `queryAuditLog()`'s validation (line 163) — re-verified, no second
  backend validation path exists.
- `KnownActionType` (line 58) is `(typeof KNOWN_ACTION_TYPES)[number]`
  — a derived type. Appending 4 array entries updates it automatically;
  the plan correctly does not list this as a separate edit.
- Query-building logic (lines 176–182: five `.where()` branches,
  `.orderBy('timestamp','desc').limit(RESULT_LIMIT)`) is untouched by
  the plan and does not reference `KNOWN_ACTION_TYPES` at all beyond
  the validation gate — confirmed no other query-shape dependency
  exists.
- Rejection of unknown/unapproved types: line 163's `!includes(actionType)`
  check is unaffected by array length — an 11-entry array rejects
  everything not in it exactly as a 7-entry array does. No behavior
  change to this guarantee.
- 100-row cap: `RESULT_LIMIT = 100` (line 99), referenced only in
  `.limit(RESULT_LIMIT)` — not touched by the plan.
- Five-filter combinability: the `.where()` chain (lines 177–181) is
  unconditional per-filter-present logic, unaffected by how many
  values `actionType` may legally take.

**No discrepancy. Backend review: correct as planned.**

---

## 6. UI Allowlist Review

Confirmed directly:

- `apps/superadmin/src/pages/AuditTrail.tsx` line 94:
  `{KNOWN_ACTION_TYPES.map((a) => (<option key={a} value={a}>{actionLabel(a)}</option>))}`
  — the dropdown's options are generated **exclusively** from the
  imported `KNOWN_ACTION_TYPES` (from `../lib/superadminApi`, line 2)
  — no second, independent option list exists in this component.
- `apps/superadmin/src/lib/superadminApi.ts` lines 373–381 — confirmed
  this is a **plain duplicated literal array**, not an import from
  `server/auditLogQuery.ts` (re-confirmed: no cross-app import path
  exists for this specific constant; `apps/superadmin` and `server/`
  are separate build targets that do not share this particular file).

**Consolidation review (Task 5):** The plan's decision to keep the
duplication and update both lists independently, rather than move
`KNOWN_ACTION_TYPES` into `packages/shared-types`, is **correct for
this plan's scope**. Re-confirmed this session:
`packages/shared-types/index.ts` does exist and does already host a
structurally similar closed set consumed by both `server/` and
`apps/superadmin/` (`PlatformRole`) via a `@sabush/shared-types` path
alias — so the mechanism genuinely exists and consolidation would not
be inventing new infrastructure. However, the governing task for this
plan explicitly requires proving the *existing authorized scope
already requires* a new abstraction before adopting one, and nothing
in ADR-0006, the Phase D Rule 8 assessment, or either allowlist's own
code requires the two lists to be a single shared source — the defect
(4 missing strings) is fully, provably correctable by editing both
lists directly. Consolidation remains a legitimate, separately-
proposable follow-up (already named as such in both prior artifacts),
not a hidden requirement this plan is improperly avoiding. **This
review does not recommend consolidation for this plan** — doing so
here would itself be the scope-creep this review is charged with
catching.

---

## 7. Label Review

Each of the four proposed labels checked against
`apps/superadmin/src/pages/BusinessDetail.tsx` directly, fresh this
session:

| Proposed label | Source phrase (re-confirmed, exact line) |
|---|---|
| "Recuperação de Capital Inicial autorizada" | Line 358: `<h3>Recuperação de Capital Inicial</h3>` |
| "Recuperação de Capital Inicial executada" | Line 360: `"...quem **executa** a recuperação é sempre o dono do negócio."` |
| "Recuperação de Valor do Negócio autorizada" | Line 442: `<h3>Recuperação de Valor do Negócio</h3>` |
| "Recuperação de Valor do Negócio expirada" | Grammatically parallel to the above two (no existing "expired" phrase exists elsewhere in this app to check against, since no other SuperAdmin-visible expiry concept currently has UI copy — this is the first; the past-participle-feminine-agreement pattern ("suspenso"/"reativado" → "-o"; "autorizada"/"executada" → "-a" agreeing with the feminine "Recuperação") is already the established pattern for the other three, and for the two existing status labels `'business.suspended': 'Negócio suspenso'`/`'business.reactivated': 'Negócio reativado'` in `AuditTrail.tsx`'s own `ACTION_LABELS`.) |

**No discrepancy found.** No existing SuperAdmin-visible copy uses
different terminology for either recovery capability. The
`ACTION_LABELS` grammatical convention (past participle,
gender-agreeing with the described noun) is followed correctly by all
four proposed additions.

---

## 8. Response-Shape Boundary

Confirmed directly: `AuditLogEntryRow` (`server/auditLogQuery.ts`
lines 68–77) is **not** in the plan's §12 file table, and the plan's
§5/§10/§11 sections each independently and explicitly state this
field set is unchanged.

**The existing response-shape regression test remains intact and
unmodified** — re-confirmed directly at
`tests/superadmin-audit-log-query.test.ts` lines 291–302,
`'every entry contains exactly the approved field set, including
targetUid (Decision C)'`, asserting `Object.keys(entry).sort()` equals
exactly `['actionType', 'actorRole', 'actorUid', 'id', 'justification',
'targetBusinessId', 'targetUid', 'timestamp']` — 8 fields, no
`targetStockCountId`, no `authorizationId`. This test is not in the
plan's list of files to change, meaning it remains active and would
fail immediately if implementation ever added either field. This is
the correct, independently-verifiable mechanism enforcing the
boundary, not merely a stated intention.

**One factual enhancement found during this review, not a
correction:** `packages/shared-types/index.ts` confirms
`targetStockCountId`/`authorizationId` are **already
governed, first-class, optional fields on the underlying
`PlatformAuditLogEntry` schema** (with their own cited governance:
Implementation Plan §16, Supplementary Implementation Authorization
Acceptance Criterion 10) — they are not undecided or speculative
fields; they are simply not yet promoted into `auditLogQuery.ts`'s own
deliberately-narrower curated `AuditLogEntryRow`. This does not change
the verdict that they are **out of scope for this plan** (the
governing task for this plan mandates their exclusion regardless of
their own authorization status) — it only means that if a future,
separate plan pursues that expansion, it would likely also qualify as
"already authorized scope," not a new decision. Noted here for
completeness; **not** incorporated into the plan under review, per
explicit instruction.

**Confirmed: response-shape work remains explicitly, entirely OUT OF
SCOPE for this plan.**

---

## 9. Security/Tenant-Isolation Review

Re-verified directly against `server/superadminAuth.ts` and the
`GET /api/superadmin/audit-log` route in `server/index.ts` — neither
file appears in the plan's §12 file table, and neither is touched by
the plan's own described changes.

- `requireAuth` — unaffected; still verifies a real Firebase ID token
  via the Admin SDK.
- `requirePlatformOperator` — unaffected; still re-reads
  `platform_operators/{uid}` fresh per request.
- `requireSuperAdmin` — unaffected; still requires `platformRole ===
  'superadmin'`.
- Business scoping (`targetBusinessId` filter logic) — unaffected;
  not in the plan's touched lines.
- Tenant isolation — unaffected; `queryAuditLog()` reads only
  `platform_audit_log`, already fully Admin-SDK-gated
  (`firestore.rules`: `allow write: if false` unconditionally,
  confirmed unchanged since the SuperAdmin panel investigation).
- Audit-write authorization — unaffected; no producer file is touched
  (§4 above).
- `firestore.rules` — not in the plan's file table at all; confirmed
  no rules change is proposed or needed (widening a read-side query
  filter's accepted values requires no rules change, since
  `platform_audit_log` reads are already Admin-SDK-mediated, bypassing
  rules entirely).

**Widening accepted `actionType` filter values does not widen who can
query the Audit Center** — authorization is checked before validation
runs, and validation only ever narrows (rejects) a request; it never
grants read access to anything not already returned by an unfiltered
or differently-filtered query. Confirmed no security or
tenant-isolation implication.

---

## 10. Test Plan Review

Each of the 9 requirements the review task specifies, checked against
the plan's actual, re-verified test strategy:

| Req | Plan's mechanism | Verified sufficient? |
|---|---|---|
| A. All four accepted by backend query layer | `tests/superadmin-audit-log-query.test.ts`'s existing generic loop (lines 251–257, re-confirmed present and unmodified) covers this **automatically** the moment the array is widened; plan additionally proposes 4 explicit named per-type tests | ✅ Yes — doubly covered |
| B. All four appear in the UI filter | New `tests/superadmin-audit-log-ui.test.ts`, source-scan, mirroring the established `tests/superadmin-business-directory-ui.test.ts` convention (re-confirmed this file exists and uses exactly the pattern described) | ✅ Yes, within this repository's own stated, standing limitation (no DOM/React test harness exists anywhere in the repo — confirmed, not unique to this plan) |
| C. Labels correct | Same new UI test file, asserting non-fallback `ACTION_LABELS` entries exist for all four | ✅ Yes |
| D. Existing types remain functional | Every existing `it()` in the touched test file is unmodified (verified: the plan's §8.1 explicitly states zero existing lines are edited/removed, and this review independently confirms no existing assertion needs to change for 4 array entries to be appended) | ✅ Yes |
| E. Unknown types remain rejected | The existing `'rejects an unknown actionType'` test (line 245, re-confirmed) is untouched | ✅ Yes |
| F. Response shape unchanged | §8 above — the existing response-allowlist test (lines 291–302) is untouched and would fail on any scope creep | ✅ Yes |
| G. Five-filter behavior unchanged | The existing `'combined filters (Decision A)'` describe block (lines 177–239, re-confirmed) is untouched | ✅ Yes |
| H. 100-row cap unchanged | The existing `'the 100-row limit is enforced...'` test (line 111, re-confirmed) is untouched | ✅ Yes |
| I. Existing audit producers untouched | No producer file/test is in the plan's file scope (§4 above) | ✅ Yes |

**Source-scan convention check:** the proposed
`tests/superadmin-audit-log-ui.test.ts` was checked against
`tests/superadmin-business-directory-ui.test.ts`'s actual header and
structure (re-read directly this session) — same rationale
("no React/DOM test harness... this suite reads the actual committed
source"), same `readFileSync` + `describe`/`it` shape, same
scope-boundary discipline (explicitly stating what this new test does
*not* prove, mirroring the existing file's own "IMPORTANT BOUNDARY"
paragraph). The plan's proposed new file follows the established
convention correctly.

**No existing assertion is weakened anywhere in the plan.**

---

## 11. File Scope Audit

| File | In plan? | Necessary? | Sufficient? |
|---|---|---|---|
| `server/auditLogQuery.ts` | ✅ | ✅ — sole backend allowlist authority | ✅ |
| `apps/superadmin/src/lib/superadminApi.ts` | ✅ | ✅ — sole source of the UI's option list | ✅ |
| `apps/superadmin/src/pages/AuditTrail.tsx` | ✅ | ✅ — sole label source | ✅ |
| `tests/superadmin-audit-log-query.test.ts` | ✅ | ✅ — the only existing test file exercising `queryAuditLog()`'s allowlist behavior directly | ✅ |
| `tests/superadmin-audit-log-ui.test.ts` | ✅ (new) | ✅ — no existing file covers `AuditTrail.tsx` at all (re-confirmed: `grep -rl "AuditTrail.tsx" tests/*.test.ts` → no match) | ✅ |

**No unnecessary file found.** **No genuinely missing file found** —
specifically checked and confirmed not required: `server/index.ts`
(route is a pure passthrough, needs no edit — re-verified),
`firestore.rules`/`firestore.indexes.json` (no rule or index change
needed — widening an equality-filter's legal values requires no new
composite index; the existing 6 composite indexes already cover any
subset of the three equality filters regardless of which specific
`actionType` string is supplied), `packages/shared-types/index.ts`
(consolidation correctly deferred, §6 above),
`tests/superadmin-audit-log-firestore-query.test.ts` (confirmed, fresh
this session: contains no `KNOWN_ACTION_TYPES` import and no generic
per-type loop — its fixtures test real-engine query semantics using
existing types only and are structurally unaffected by a wider
allowlist).

---

## 12. Scope-Creep Audit

Explicitly checked against each item the review task lists — none
found in the plan:

- Audit architecture redesign — not proposed; `queryAuditLog()`'s
  shape is untouched.
- Shared-type refactor — explicitly investigated and explicitly
  declined by the plan itself (§6 above/plan §11).
- Response-shape redesign — explicitly out of scope, independently
  enforced by an untouched test (§8).
- Audit retention project — not mentioned or implied anywhere in the
  plan.
- New audit event system — not proposed; all 4 types already exist
  and are already written.
- New authorization system — not proposed; `superadminAuth.ts` not
  touched.
- New SuperAdmin feature — not proposed; this is a filter-allowlist
  correction only.
- Recovery-workflow changes — not proposed; no producer file touched.
- Business Worth changes — not proposed.
- Initial Stock changes — not proposed.
- Firestore security changes — not proposed; `firestore.rules` not in
  file scope.

**No scope creep found.**

---

## 13. Implementation Sequence Review

The plan's own §13 sequence (1. `auditLogQuery.ts` → 2. `superadminApi.ts`
→ 3. `AuditTrail.tsx` → 4. extend query test → 5. new UI test → 6.
verification → 7. diff audit) matches the review task's proposed
8-step sequence, with steps 6–7 of the plan corresponding to the
review task's steps 6–8 (full suite, typecheck/build, final audit),
folded together under the plan's own "Verification Strategy" (§14 of
the plan).

**No dependency requires a different order.** Confirmed directly:
steps 1–3 are mutually independent (no compile-time or runtime
coupling — `actionLabel()` in `AuditTrail.tsx` accepts a plain
`string`, not the narrow `KnownActionType` union, so labels can be
added before or after either allowlist without a type error). Steps
4–5 correctly depend on 1–3 being complete (a test asserting a type is
accepted, or that a label exists, needs the corresponding production
change first). This sequencing is safe as planned.

---

## 14. Corrections Required

**None.** Every claim, file reference, line number, and code excerpt
in the plan was independently re-verified against the live repository
this session and found accurate. The one additional finding (§3, §8 —
Phase D's Rule 8 Assessment §17, and `packages/shared-types`'s own
governance of `targetStockCountId`/`authorizationId`) **strengthens**
the plan's existing conclusions; neither requires editing the plan,
since the plan's own claims remain fully correct as written and this
review's governing instruction is to correct the plan only if it
inaccurately represents already-authorized scope — it does not.

---

## 15. Verdict

## **A. READY FOR PRODUCT ARCHITECT ACCEPTANCE**

The plan faithfully represents the confirmed defect, stays entirely
within already-authorized Phase D scope (now with stronger evidence
than the plan itself cited), proposes an exact, minimal, fully-testable
file scope with no unnecessary or missing files, correctly declines
architectural consolidation as unnecessary for this specific defect,
correctly and verifiably excludes response-shape/security/tenant-
isolation/producer changes, and sequences safely. No governance
conflict exists. No concrete correction is required.

---

## 16. Next Governance Gate

```
Implementation Plan — DRAFTED
        ↓
Implementation Plan Governance Review — COMPLETE (this document)
        ↓
Product Architect Acceptance — NEXT GATE, NOT YET PERFORMED
        ↓
Implementation Authorization — NOT YET PERFORMED
        ↓
Implementation — NOT PERFORMED BY THIS DOCUMENT
```

This review does not accept the plan on the Product Architect's
behalf, does not create an Implementation Authorization, and does not
implement anything. The next required action is a separate,
explicit Product Architect Acceptance of the plan.

---

## 17. Evidence / File References

**Re-verified live this session (not merely re-cited):**
`server/auditLogQuery.ts` (full file), `server/index.ts` (every
`actionType:` site), `server/businessWorthRecoveryExpiryAudit.ts`,
`apps/superadmin/src/pages/AuditTrail.tsx` (full file),
`apps/superadmin/src/lib/superadminApi.ts` (relevant sections),
`apps/superadmin/src/pages/BusinessDetail.tsx` (terminology source),
`packages/shared-types/index.ts` (`PlatformAuditLogEntry` in full),
`docs/adr/ADR-0006-superadmin-v1-operational-control-plane.md`
(§6 Audit Requirements, §16 Definition of Done),
`docs/engineering/18-superadmin-v1-operational-control-plane-rule8-assessment.md`
(§17 Phase Dependencies — new evidence, not previously cited),
`docs/specs/18-superadmin-v1-operational-control-plane-slice.md`,
`tests/superadmin-audit-log-query.test.ts` (full file),
`tests/superadmin-audit-log-firestore-query.test.ts` (confirmed no
edit needed), `tests/superadmin-business-directory-ui.test.ts`
(convention precedent), `firestore.rules` (`platform_audit_log`
section, confirmed unchanged), `git status --short` / `git log -3`
(confirmed clean working tree, no drift since the plan was drafted).

**Reviewed, not re-verified line-by-line (already exhaustively
covered by the prior investigation, no new claim made against them
this session):** the four events' own individual governance chains
(BDR-0016, POL-0009, Business Worth Evolution Implementation
Plan/Authorization) — re-confirmed present and unchanged by file
listing, content not re-read in full a second time since no discrepancy
was suspected.
