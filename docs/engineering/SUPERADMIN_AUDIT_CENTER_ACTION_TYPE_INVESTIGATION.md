# SuperAdmin Audit Center — Action-Type Allowlist Investigation

**STATUS: INVESTIGATION COMPLETE — NO IMPLEMENTATION AUTHORIZED**

Audit-only. No application code, test, specification, or governance
artifact was modified to produce this document.

---

## 1. Executive Summary

The prior investigation's finding was **directionally correct but
undercounted**: it identified "two newer event types" missing from the
Audit Center's action-type allowlist. Direct inspection of every
`writeAuditLogEntry()`/`actionType:` call site in the repository finds
**four**, not two: `initial_stock_recovery.authorized`,
`initial_stock_recovery.consumed`, `business_worth_recovery.authorized`,
and `business_worth_recovery.expired`.

This is a **CONFIRMED IMPLEMENTATION DEFECT**, not a governance gap and
not intentional narrowing. The evidence is direct, not inferred:

- Each of these four action types was explicitly authorized, as an
  audit-log entry, by its own feature's governance chain (Rule 8
  Finding H, for the recovery-authorization pair: *"`actionType`
  values such as `initial_stock_recovery.authorized`, `.consumed`,
  `.expired` follow the existing `support_session.issued`-style
  convention exactly"*).
- `auditLogQuery.ts`'s own header comment states the intended
  maintenance process in plain language: *"a future phase adding a
  new action type updates this list, not the schema."*
- Git history shows three separate commits (Aug 21, Aug 23 ×2) each
  added a new `platform_audit_log` action type and, in every case,
  **did not touch** `auditLogQuery.ts`'s `KNOWN_ACTION_TYPES` or the
  UI's duplicate copy in `superadminApi.ts` — confirmed by direct
  `git show --stat` inspection of each commit.
- The UI's own copy of the allowlist (`superadminApi.ts`) carries a
  comment claiming it's *"the exact same closed list... so the two
  can never drift"* — a claim already falsified in practice, since it
  is a manually duplicated array, not a shared import, and has in fact
  drifted three times.

The defect is narrowly scoped: it affects **only the `actionType`
filter's validation/options list**, not data integrity, not
authorization, not the default unfiltered view. It requires no
Product Architect decision — the events were already authorized to be
audit-log entries; only a query-layer maintenance step was missed. One
adjacent, smaller finding (see §7) is that even once filterable, the
curated response shape drops the `targetStockCountId`/`authorizationId`
fields these four events carry — worth including in the same fix's
scope, not a separate defect.

---

## 2. Audit Center Architecture Path

Traced end to end, confirmed by direct reading (not assumed from the
prior investigation):

```
apps/superadmin/src/pages/AuditTrail.tsx
  — filter state: { businessId, actorUid, actionType, from, to }
  — actionType <select> options: KNOWN_ACTION_TYPES (imported from
    superadminApi.ts, NOT from server/auditLogQuery.ts — see §3)
      ↓ fetchAuditLog(filters)
apps/superadmin/src/lib/superadminApi.ts
  — builds URLSearchParams, GET /audit-log?businessId=&actorUid=&
    actionType=&from=&to=
  — authedFetch() attaches `Authorization: Bearer <Firebase ID token>`
      ↓
server/index.ts
  GET /api/superadmin/audit-log
    requireAuth              (verifies real Firebase ID token)
    requirePlatformOperator  (re-reads platform_operators/{uid})
    requireSuperAdmin        (platformRole === 'superadmin' only)
    handler reads req.query.{businessId,actorUid,actionType,from,to}
      ↓
server/auditLogQuery.ts
  queryAuditLog(db, filters)
    — validates actionType against KNOWN_ACTION_TYPES (rejects
      anything else as 'invalid' — see §3)
    — validates from/to as parseable ISO dates
    — builds a Firestore query: .where(...) for each supplied filter,
      .orderBy('timestamp','desc').limit(100)
    — maps each doc into the curated AuditLogEntryRow shape (§7)
      ↓
Firestore: platform_audit_log/{eventId}  (Admin SDK — bypasses
  firestore.rules entirely, same as every privileged-server read)
      ↓
response: { entries: AuditLogEntryRow[] }
      ↓
AuditTrail.tsx renders the table, actionLabel(e.actionType) provides
  the PT-language label (safe fallback to the raw string if unlabeled)
```

No step was skipped in this trace; the chain does not stop at
`auditLogQuery.ts` — the write side (`server/platformAuditLog.ts`) and
every producer were also traced (§4).

---

## 3. Action-Type Allowlist Analysis

**Two independent copies exist, not one shared source.**

**Copy 1 — server-side, the actual validation gate.**
`server/auditLogQuery.ts`, lines 48–56:

```ts
export const KNOWN_ACTION_TYPES = [
  'payment.confirmed',
  'payment.rejected',
  'operator.provisioned',
  'operator.revoked',
  'business.viewed',
  'business.suspended',
  'business.reactivated',
] as const;
```

Consumed inside `queryAuditLog()` (same file, line 163):
```ts
if (actionType !== undefined && !(KNOWN_ACTION_TYPES as readonly string[]).includes(actionType)) {
  return { outcome: 'invalid', message: `actionType inválido: ${actionType}` };
}
```
This is **validation only** for the `actionType` filter parameter — it
does not constrain which documents exist in `platform_audit_log`, and
it does not run at all when `actionType` is omitted (the default,
unfiltered load).

**Copy 2 — client-side, a manually duplicated literal.**
`apps/superadmin/src/lib/superadminApi.ts`, lines 373–381 — byte-for-
byte the same seven strings, with a comment asserting: *"Single source
of truth for the SuperAdmin UI's action-type filter — reuses the exact
same closed list server/auditLogQuery.ts validates against, so the two
can never drift."* This is **not actually an import** — `apps/superadmin`
and `server/` are separate builds with no shared-module wiring for
this constant (confirmed: no `import` statement pulls
`KNOWN_ACTION_TYPES` from `server/auditLogQuery.ts` anywhere in
`apps/superadmin/`). The comment's stated invariant is aspirational,
not enforced, and has already been violated.

**Copy 2 constrains the UI's selectable options** — `AuditTrail.tsx`
maps `KNOWN_ACTION_TYPES` directly into the `<select>`'s `<option>`
list (line 94). A value not in this list cannot even be *chosen* in
the dropdown, regardless of what the server would otherwise accept.

**Both** are validation (reject anything outside the list) — neither
performs any additional filtering of Firestore results beyond the
`.where('actionType', '==', actionType)` clause that already only
fires when a (valid) value is supplied.

---

## 4. Complete Audit Event-Type Inventory

Built from a full grep of every `actionType:`/`WriteAuditLogEntryParams`
literal in `server/*.ts` (not merely `server/index.ts` — checked the
whole `server/` directory):

| Event/Action Type | Defined Where | Produced Where | Queried Where | UI Label/Filter | Tested |
|---|---|---|---|---|---|
| `payment.confirmed` | `auditLogQuery.ts` allowlist | `server/index.ts` (`/api/superadmin/payments/.../confirm`) | ✅ filterable | ✅ "Pagamento confirmado" | GOOD |
| `payment.rejected` | same | `server/index.ts` (`.../reject`) | ✅ filterable | ✅ "Pagamento rejeitado" | GOOD |
| `operator.provisioned` | same | `server/index.ts` (`POST /operators`) | ✅ filterable | ✅ "Operador provisionado" | GOOD |
| `operator.revoked` | same | `server/index.ts` (`POST /operators/:uid/revoke`) | ✅ filterable | ✅ "Operador revogado" | GOOD |
| `business.viewed` | same | `server/index.ts` (`GET /business/:businessId`) | ✅ filterable | ✅ "Negócio consultado" | GOOD |
| `business.suspended` | same | `server/index.ts` (`.../suspend`) | ✅ filterable | ✅ "Negócio suspenso" | GOOD |
| `business.reactivated` | same | `server/index.ts` (`.../reactivate`) | ✅ filterable | ✅ "Negócio reativado" | GOOD |
| `initial_stock_recovery.authorized` | **not in allowlist** | `server/index.ts` line ~2759 (`/api/superadmin/initial-stock-recovery/:businessId/authorize`, `requireSuperAdmin`) | ❌ not filterable | ❌ no label (falls back to raw string) | **MISSING** (§9) |
| `initial_stock_recovery.consumed` | **not in allowlist** | `server/index.ts` line ~1348 (`/api/initial-stock-recovery/consume`, tenant-facing, `actorRole: 'owner'`) | ❌ not filterable | ❌ no label | **MISSING** |
| `business_worth_recovery.authorized` | **not in allowlist** | `server/index.ts` line ~2862 (`/api/superadmin/business-worth-recovery/:businessId/authorize`, `requireSuperAdmin`) | ❌ not filterable | ❌ no label | **MISSING** |
| `business_worth_recovery.expired` | **not in allowlist** | `server/businessWorthRecoveryExpiryAudit.ts` line 182 — a scheduled background sweep, `actorUid: 'system'`, `actorRole: 'system'` (not a route at all) | ❌ not filterable | ❌ no label | **MISSING** |

No fifth type was found. Also checked and confirmed **not** relevant
here: tenant-facing `timelineEvents` (a structurally separate concept
— `apps/tenant`'s own audit trail for Business Worth activity, e.g.
`business-worth-recovery-consumed`, stored in a different collection
shape entirely, unrelated to `platform_audit_log`). `activityTouch.ts`
was inspected and confirmed to write no `platform_audit_log` entry at
all (it only updates `businesses/{businessId}.lastActivityAt`, used by
the Business Directory's operational-activity classification, not an
audited action).

---

## 5. Suspected Newer Event Types

All four, with exact provenance:

| Type | Introduced | Commit | Governance |
|---|---|---|---|
| `initial_stock_recovery.authorized` | 2026-08-21 | `17e44b2` "Implement SuperAdmin-assisted Initial Stock recovery" | BDR-0016, POL-0009, `superadmin-assisted-initial-stock-recovery-rule8-assessment.md` Finding H, Implementation Authorization (signed, SABUSHIMIKE MASCENI, 2026-08-21) |
| `initial_stock_recovery.consumed` | 2026-08-21 | same commit | Consumption & Audit Amendment, Rule 8 Re-Assessment, Supplementary Implementation Authorization (signed, same date) |
| `business_worth_recovery.authorized` | 2026-08-23 | `4a40293` "Increment 8 -- Owner Correction Window / SuperAdmin-Authorized Recovery" | `business-worth-evolution-implementation-authorization.md`, `business-worth-evolution-implementation-plan.md` |
| `business_worth_recovery.expired` | 2026-08-23 | `a544406` "Increment 9 -- Auditability, including SuperAdmin recovery-expiry correction" | Same Increment 9 governance line |

All four are produced by an **already-authorized, already-implemented,
already-live** SuperAdmin (or SuperAdmin-adjacent) capability — none
of this is new scope. `git show --stat` on all three commits confirms
**none touched `auditLogQuery.ts`, `superadminApi.ts`'s
`KNOWN_ACTION_TYPES`, or `AuditTrail.tsx`'s `ACTION_LABELS`** — the
omission is consistent across three independent implementation
sessions, which is stronger evidence of a missed maintenance step than
a single oversight would be, and rules out an intentional one-time
decision (a deliberate exclusion would not need to be independently
"re-decided" three times while never once being mentioned in any of
the three governing documents).

**Intended to be visible/filterable?** Yes, per Rule 8 Finding H's own
words: these action types were designed to *"follow the existing...
convention exactly"* — the existing convention, confirmed by direct
reading, is "write to `platform_audit_log`, queryable via the Phase D
mechanism." No governance artifact anywhere states these should be
excluded from Audit Center filtering.

**Deliberate omission?** No evidence found anywhere — no comment, no
governance line, no test — stating these should be excluded. The
omission is best explained as: each feature's own governance and
implementation focused on getting the write side correct (and
succeeded), and the separate, cross-cutting step of updating Phase
D's own allowlist was not part of any of those three features' own
scoped file lists.

---

## 6. UI Filter Analysis

- **Derives options from `KNOWN_ACTION_TYPES`** — yes, directly
  (`AuditTrail.tsx` line 94, `.map()` over the imported constant).
- **Own hardcoded list, separate from the allowlist?** The *labels*
  (`ACTION_LABELS`) are a separate hardcoded object, but the
  *available option values* come from `KNOWN_ACTION_TYPES` — so the
  UI cannot offer more options than the (stale) allowlist permits,
  and even if it could, it has no PT label for any of the four missing
  types (though `actionLabel()`'s safe fallback prevents a crash or
  mislabeling — it would show the raw string).
- **Derives from a shared type?** No — confirmed in §3, it's a
  manually duplicated array, not an import.
- **Can it display the four suspected types?** Only if they happen to
  appear in an *unfiltered* (or businessId/actorUid/date-only-filtered)
  result set — the dropdown itself cannot be used to select them.
- **Sends the selected value correctly?** Yes — `fetchAuditLog()`
  forwards `filters.actionType` verbatim as the `actionType` query
  param; there is no client-side transformation. If a caller bypassed
  the UI and sent one of the four values directly via the API, the
  request would be rejected by the server's own validation (§3), not
  merely by the UI.

**Mismatch table:**

| | payment.*/operator.*/business.viewed/suspended/reactivated (7) | The 4 missing types |
|---|---|---|
| Backend accepts as filter | ✅ | ❌ (`'invalid'`) |
| UI offers as dropdown option | ✅ | ❌ (not present at all) |
| Actually emitted to `platform_audit_log` | ✅ | ✅ |

The three columns agree with each other for 7 types and disagree
identically (backend and UI both exclude, data still exists) for the
other 4 — there is no case where the UI and backend disagree with each
other; they are consistently stale together, since the UI's copy was
manually kept in sync with the *original* 7, just never updated
alongside the backend's own equally-stale list.

---

## 7. Backend Query Analysis

`queryAuditLog()` (§2, §3) applies `actionType` as a plain Firestore
equality filter, combinable with the other four filters (Decision A,
confirmed already proven in the prior investigation and re-confirmed
here). The four missing types would work identically to the existing
seven **the moment they're added to the allowlist** — no query-shape
change, no new composite index required (an equality filter on
`actionType` combined with the others is already covered by the six
composite indexes the module's own header documents, since those were
built for "any subset of the three equality filters," not enumerated
per specific string value).

**One additional, adjacent gap found during this investigation, not
named in the prior report:** the curated response shape,
`AuditLogEntryRow` (`auditLogQuery.ts` lines 68–77), does **not**
include `targetStockCountId` or `authorizationId` — fields that all
four of these events' underlying `platform_audit_log` documents
actually carry (confirmed: `server/index.ts` writes
`targetStockCountId: result.businessId` context and
`authorizationId: new Date(...).toISOString()` for the recovery-
authorization events; `businessWorthRecoveryExpiryAudit.ts` writes
`targetStockCountId: String(currentData.targetStockCountId ?? '')`).
Once these four types become filterable, the resulting rows would
still render with a generic "Alvo (UID)" column showing `—` for these
entries (since `targetUid` is null for all four — they target a
business/stock-count, not a uid) and no visible indication of *which*
stock count or authorization was involved, even though that data
exists in Firestore. This is the same class of fix (curation-layer
maintenance), not a new architectural question, but should be scoped
into the same piece of work rather than discovered again separately.

---

## 8. Audit Data Integrity

For all four types, confirmed directly against their write-site code:

- **Written to the audit store** — yes, all four call
  `writeAuditLogEntry()` (or its direct Firestore-transaction
  equivalent, for the sweep) targeting `platform_audit_log`.
- **Consistent `actionType` field** — yes, plain strings, same shape
  as the existing seven.
- **Actor identity** — present for all four, but **not uniform in
  kind**: `initial_stock_recovery.authorized`/`business_worth_recovery.authorized`
  carry a real platform-operator `actorUid`/`actorRole` (superadmin);
  `initial_stock_recovery.consumed` carries the **tenant Owner's**
  `actorUid`, `actorRole: 'owner'` — not a platform operator at all;
  `business_worth_recovery.expired` carries `actorUid: 'system'`,
  `actorRole: 'system'` — no human actor. This is a legitimate,
  intentional distinction (the audit log's own schema already
  supports an open `actorRole` string, confirmed by
  `PlatformAuditLogEntry`'s type), not a data-quality problem — but
  worth naming so any future allowlist fix doesn't assume every entry
  is superadmin-authored.
- **Business identity** — `targetBusinessId` present for all four.
- **Timestamps** — server-generated for all four (either via
  `writeAuditLogEntry()`'s own `new Date().toISOString()`, or the
  sweep's own `now.toISOString()` inside its transaction) — never
  client-supplied.
- **Safely queryable by the existing mechanism** — yes, structurally;
  only the allowlist gate currently prevents filtering by these
  specific values.

**Practical effect of the omission, precisely:**
- **Not** complete invisibility — an unfiltered load, or a load
  filtered only by `businessId`/`actorUid`/date-range, already returns
  these entries (confirmed: the `actionType` validation only runs
  `if (actionType !== undefined)`).
- **Is** filter inability — an operator cannot isolate *just* these
  four types via the dropdown or the API's `actionType` parameter.
- **No incorrect counts** — nothing is double-counted, dropped, or
  miscategorized; the entries exist exactly once, correctly.
- **One real, concrete practical consequence:** the Audit Trail has no
  pagination and caps at 100 rows (Decision D, by design). Because
  these four types are comparatively rare (grant/consume/expire events
  vs. everyday payment/business-view traffic), an operator trying to
  find them by scrolling an unfiltered, high-volume history — with no
  way to isolate them via the one filter built for exactly that
  purpose — could plausibly have older instances pushed outside the
  100-row window with no filter-based way to reach them (short of a
  narrow enough `businessId`/date-range guess). This is the concrete,
  user-visible cost of the defect, distinct from "cosmetic
  inconvenience."

---

## 9. Security/Tenant-Isolation Analysis

Verified directly: fixing the allowlist (adding four strings to two
arrays, and the two extra fields to the response shape) would **not**
touch:

- **SuperAdmin authorization** — the allowlist is read *after*
  `requireAuth`/`requirePlatformOperator`/`requireSuperAdmin` have
  already run; it has no bearing on who may call the endpoint.
- **Tenant isolation** — `queryAuditLog()` never reads any
  tenant-scoped collection; it only reads `platform_audit_log`, which
  is already fully Admin-SDK-gated (`firestore.rules`: client write
  `false` unconditionally). Widening which `actionType` VALUES are
  legal query inputs does not widen which documents are readable —
  the underlying documents already exist and are already returned
  whenever no `actionType` filter (or a `businessId`/`actorUid`/date
  filter) is applied.
- **Business scoping** — unaffected; `targetBusinessId` filtering
  logic is untouched by this fix.
- **Audit integrity** — unaffected; this is a read-side filter
  correction, not a write-side change. No new write path, no change
  to `writeAuditLogEntry()`'s own atomicity/timestamp guarantees.
- **Actor attribution** — unaffected; `actorUid`/`actorRole` are
  already correctly populated at write time by each producer (§8);
  the fix only concerns which `actionType` strings the *query*
  validator accepts and which fields the *response* curates.

**No security or tenant-isolation implication was found.**

---

## 10. Test Coverage

| Coverage area | Classification | Evidence |
|---|---|---|
| `auditLogQuery.ts` general behavior (existing 7 types, combinable filters, date validation) | GOOD | `tests/superadmin-audit-log-query.test.ts` (26 tests) |
| `auditLogQuery.ts` against a real Firestore engine | GOOD (but unrunnable in this sandbox) | `tests/superadmin-audit-log-firestore-query.test.ts` |
| A regression test proving the allowlist *should* include the four missing types | **MISSING** | Searched every test file for the four literal strings — found only in `tests/business-worth-audit-trail-wiring.test.ts` and `tests/business-worth-audit-trail.test.ts`, and confirmed those test the **write side** (that the entry is created correctly, and that `platform_audit_log`'s `firestore.rules` are unweakened) — **neither imports or exercises `auditLogQuery.ts`, `KNOWN_ACTION_TYPES`, or the SuperAdmin UI's filter at all.** |
| The four events' own write-side correctness | GOOD | Covered inside `tests/superadmin-initial-stock-recovery-authorization.test.ts`, `tests/superadmin-initial-stock-recovery-consumption.test.ts`, `tests/business-worth-audit-trail.test.ts`, `tests/business-worth-audit-trail-wiring.test.ts` |
| Audit Center UI (`AuditTrail.tsx`) | PARTIAL | No dedicated `AuditTrail.tsx`-specific test file was found (the prior investigation's "UI PARTIAL, source-scan only" finding applies here too — no React/DOM harness exists in this repository at all) |

**No existing test would have caught this defect**, and no existing
test currently proves the allowlist should include these four types —
the closest evidence is the governance documents themselves (§5),
which authorize the *events*, not the *filter's ability to select
them* explicitly by name.

---

## 11. Governance Trace

For each of the four types (repeating §5's table in the requested
format):

- **`initial_stock_recovery.authorized`** — Specification: BDR-0016 /
  POL-0009 / `superadmin-assisted-initial-stock-recovery-specification.md`.
  Rule 8: `superadmin-assisted-initial-stock-recovery-rule8-assessment.md`,
  Finding H (explicitly names this exact `actionType` string).
  Authorization: `superadmin-assisted-initial-stock-recovery-implementation-authorization.md`,
  signed. Implemented/verified: yes (`server/index.ts`,
  `initialStockRecoveryAuthorization.ts`, tested).
- **`initial_stock_recovery.consumed`** — Amendment:
  `superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md`.
  Rule 8 re-assessment:
  `...consumption-audit-rule8-reassessment.md`. Authorization:
  `...consumption-audit-implementation-authorization.md`, signed.
  Implemented/verified: yes.
- **`business_worth_recovery.authorized`** — Plan:
  `business-worth-evolution-implementation-plan.md`. Authorization:
  `business-worth-evolution-implementation-authorization.md`.
  Implemented/verified: yes.
- **`business_worth_recovery.expired`** — Same Increment 9 governance
  line as above (Auditability increment). Implemented/verified: yes.

**All four are part of already-authorized, already-implemented,
already-verified existing SuperAdmin capabilities.** None require new
architectural decision-making to justify their existence as audit
events — that question was already settled, favorably, by each
feature's own governance chain. What remains is a query/UI-layer
maintenance correction to a capability (Phase D Audit Center) whose
own governing code comment already anticipated exactly this kind of
future addition (§1).

---

## 12. Git-History Findings

- `KNOWN_ACTION_TYPES` was introduced in `0e774ff`, "feat(superadmin):
  complete phase D audit center filtering," **2026-08-15** — with
  exactly the 7 entries it still has today. Confirmed via
  `git log --diff-filter=A -- server/auditLogQuery.ts`.
- Three subsequent commits each added a new `platform_audit_log`
  action type without updating this file or its UI/API-layer copies:
  `17e44b2` (2026-08-21, two new types), `4a40293` (2026-08-23, one new
  type), `a544406` (2026-08-23, one new type). Confirmed via
  `git show --stat` on each — none lists `auditLogQuery.ts`,
  `superadminApi.ts`'s `KNOWN_ACTION_TYPES` section, or
  `AuditTrail.tsx` among their changed hunks relevant to this constant
  (`17e44b2` did touch `superadminApi.ts`, but only to add the
  *authorize-call* client function, confirmed by direct diff — the
  `KNOWN_ACTION_TYPES` block is shown as unchanged context immediately
  below that addition).
- **No prior commit ever updates `KNOWN_ACTION_TYPES` at all** since
  its creation — this is the *first* time in this repository's history
  that a new `platform_audit_log` action type has been added after
  Phase D existed to compare against, so there is exactly one
  precedent, and it was missed. There is no established pattern of
  "always remember to update this list" being followed correctly
  elsewhere to hold this instance to — nor is there a broken pattern
  of it being followed inconsistently. It is a single miss, repeated
  three times because the underlying process step (someone explicitly
  checking `auditLogQuery.ts` when adding a new action type) was never
  written down anywhere except the file's own internal comment.

---

## 13. Root Cause

Phase D (Audit Center Filtering) was implemented and closed
(2026-08-15) as a complete, correct capability for the seven action
types that existed at the time. Three subsequent, entirely
appropriately-governed features (Aug 21, Aug 23 ×2) each correctly
added a new `platform_audit_log` write per the "follow the existing
convention" instruction their own Rule 8 assessments gave — but "the
existing convention" was interpreted (correctly, as far as it went) to
mean *how to write an audit entry*, not *remembering to also update
the separate, cross-cutting Phase D query/UI allowlist,* which lived
in a different file, owned by a different (earlier-closed) feature
slice, and was not named in any of the three later features' own
`Files Expected to Change` lists. This is a **scope-boundary gap
between features**, not a mistake within any one of them — each
feature did exactly what it set out to do.

---

## 14. Classification

## **A. CONFIRMED IMPLEMENTATION DEFECT**

- Existing, already-authorized `platform_audit_log` events
  (`initial_stock_recovery.authorized`, `initial_stock_recovery.consumed`,
  `business_worth_recovery.authorized`, `business_worth_recovery.expired`)
  should be queryable/filterable — this is directly supported by their
  own governance (§5, §11) and by `auditLogQuery.ts`'s own stated
  maintenance intent (§1, §3).
- The allowlist omission is accidental — confirmed by git history
  showing three independent misses with no accompanying rationale
  anywhere (§12), and by the fact that no governance document anywhere
  states these should be excluded from Audit Center.
- Fixing it stays **entirely within the existing, already-authorized
  Audit Center capability** — adding known, already-valid strings to a
  validation list and known, already-written fields to a response
  shape. No new business rule, no new access-control decision, no new
  Firestore query shape (the required composite indexes already exist
  per §7), no schema change.

**No additional Product Architect decision is necessary** to correct
this specific defect. The Product Architect decisions that matter here
(should these events exist; who may trigger them; what they should
contain) were already made and signed, for each of the four types,
before this investigation began.

---

## 15. Exact Remaining Work

(Stated for completeness per the investigation's own required
structure — **not authorized for implementation by this document**.)

1. Add the four action types to `server/auditLogQuery.ts`'s
   `KNOWN_ACTION_TYPES`.
2. Add the same four to `apps/superadmin/src/lib/superadminApi.ts`'s
   duplicate `KNOWN_ACTION_TYPES` (or, as a more durable fix, resolve
   the "two independent copies" duplication itself — e.g. via a shared
   `packages/shared-types` export, matching the pattern already used
   for `PlatformRole` — so a fourth future omission of this exact kind
   becomes structurally impossible rather than merely less likely).
3. Add PT-language labels for the four types to `AuditTrail.tsx`'s
   `ACTION_LABELS`.
4. Add `targetStockCountId`/`authorizationId` to `auditLogQuery.ts`'s
   `AuditLogEntryRow` curated shape and its mapping function, and
   render them in `AuditTrail.tsx`'s table (§7's adjacent finding).
5. Add a regression test asserting `KNOWN_ACTION_TYPES` (or its
   shared-source replacement) includes every action type any
   `writeAuditLogEntry()`/direct `platform_audit_log` write call site
   in `server/` actually uses — ideally a source-scan test that would
   itself catch a fifth future omission automatically, closing the gap
   §12 identifies (no such regression-proofing exists today).

---

## 16. Recommended Next Gate

This is **ready for a small implementation task**, not a governance
gate. Recommended framing for whoever picks this up: a
narrowly-scoped correction to the existing, already-authorized Phase D
Audit Center capability (per §14), not a new feature — the smallest
defensible unit of work is items 1–3 in §15 together (they're one
logical fix, split across three files by this repo's own existing
architecture); items 4–5 are worth bundling into the same pass since
they were discovered investigating the same code, but could
legitimately be split into a follow-up if preferred.

---

## 17. Evidence / File References

**Server:** `server/auditLogQuery.ts` (full file read),
`server/index.ts` (every `actionType:` site, confirmed via grep across
the whole file), `server/businessWorthRecoveryExpiryAudit.ts` (full
relevant section), `server/platformAuditLog.ts`, `server/superadminAuth.ts`.

**Client:** `apps/superadmin/src/pages/AuditTrail.tsx` (full file),
`apps/superadmin/src/lib/superadminApi.ts` (`KNOWN_ACTION_TYPES`,
`fetchAuditLog`, `AuditLogEntryRow`, and the Initial Stock Recovery
diff via `git show 17e44b2`).

**Governance:** `docs/specs/BDR-0016-superadmin-assisted-initial-stock-recovery.md`,
`docs/specs/POL-0009-superadmin-assisted-initial-stock-recovery-policy.md`,
`docs/specs/superadmin-assisted-initial-stock-recovery-specification.md`,
`docs/engineering/superadmin-assisted-initial-stock-recovery-rule8-assessment.md`
(Finding H), `docs/engineering/superadmin-assisted-initial-stock-recovery-implementation-authorization.md`,
`docs/engineering/superadmin-assisted-initial-stock-recovery-consumption-audit-amendment.md`,
`docs/engineering/superadmin-assisted-initial-stock-recovery-consumption-audit-rule8-reassessment.md`,
`docs/engineering/superadmin-assisted-initial-stock-recovery-consumption-audit-implementation-authorization.md`,
`docs/engineering/business-worth-evolution-implementation-plan.md`,
`docs/engineering/business-worth-evolution-implementation-authorization.md`,
`docs/engineering/18-superadmin-v1-operational-control-plane-implementation-plan.md`.

**Tests:** `tests/superadmin-audit-log-query.test.ts`,
`tests/superadmin-audit-log-firestore-query.test.ts`,
`tests/business-worth-audit-trail.test.ts`,
`tests/business-worth-audit-trail-wiring.test.ts`,
`tests/superadmin-initial-stock-recovery-authorization.test.ts`,
`tests/superadmin-initial-stock-recovery-consumption.test.ts`.

**Git:** `0e774ff`, `17e44b2`, `4a40293`, `a544406` (each inspected via
`git log --diff-filter=A`, `git show --stat`, and/or `git show -- <file>`).

---

## 18. Final Governance Status

```
CURRENT SUPERADMIN AUDIT CENTER GOVERNANCE STATE
  — Phase D (Audit Center Filtering): ACCEPTED, AUTHORIZED,
    IMPLEMENTED, VERIFIED, for the 7 action types known at its own
    completion (2026-08-15).
  — The 4 action types added by 3 later, independently-authorized
    features: each fully ACCEPTED/AUTHORIZED/IMPLEMENTED/VERIFIED as
    audit-log WRITES; never propagated into Phase D's own READ/filter
    allowlist.
        ↓
INVESTIGATION COMPLETE
        ↓
NEXT GOVERNANCE/PLANNING STEP: none required. This is classified as a
CONFIRMED IMPLEMENTATION DEFECT within already-authorized scope — the
next step, if and when authorized, is the small implementation task
in §15, not a new governance chain.
```

**NO IMPLEMENTATION PERFORMED. NO COMMIT. NO PUSH.**
