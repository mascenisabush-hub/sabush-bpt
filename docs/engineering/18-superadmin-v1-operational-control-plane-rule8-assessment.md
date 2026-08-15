# Rule 8 Assessment — SuperAdmin V1 Operational Control Plane

**Governing spec:** [`18-superadmin-v1-operational-control-plane-slice.md`](../specs/18-superadmin-v1-operational-control-plane-slice.md)
(Drafted) implementing [ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
(Approved — architecture decision only), against the decisions recorded
in [Architecture Gap Resolutions](./18-superadmin-v1-architecture-gap-resolutions.md)
(Recommended, pending confirmation).
**Type:** Rule 8 Assessment — Current State → Desired State → Affected
Files → Gap Analysis → Risks → Implementation Plan, per `CLAUDE.md`'s
Rule 8 process. **Planning only. Does not authorize implementation.**
**Scope:** Exactly the four phases the governing spec §1 names. Nothing
else in Module #18 is assessed or touched.
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, or `firestore.indexes.json` to produce this document.**

---

## 1. Current State (verified against the actual repository, this session)

- `server/index.ts` — exposes exactly 5 `/api/superadmin/*` routes
  (payments pending/detail/confirm/reject, audit-log), each wrapped in
  `requireAuth` + `requirePlatformOperator` + `requireSuperAdmin`. This
  slice adds new routes to the same file, following the identical
  middleware chain — no new authorization pattern is invented.
- `server/superadminAuth.ts` — `requirePlatformOperator`/`requireSuperAdmin`
  already implemented, tested, reusable verbatim by every new route in
  this slice. **Zero changes needed to this file.**
- `server/platformAuditLog.ts` — `writeAuditLogEntry()` already
  implemented, tested, reusable verbatim. `PlatformAuditLogEntry.actionType`
  (`packages/shared-types/index.ts`) is already an open `string` type —
  confirmed by direct inspection — so the five new action types this
  slice needs (`operator.provisioned`, `operator.revoked`,
  `business.viewed`, `business.suspended`, `business.reactivated`)
  require no type change.
- `server/index.ts` (staff-suspension routes, lines ~630–675) — the
  existing two-stage (Auth-disable + Firestore-sync) suspension pattern
  is the direct precedent for Phase C, though Phase C's own mechanism is
  single-stage (no Auth account exists at the business level to disable
  — see BR-9 in the governing spec).
- `server/index.ts` (`verifyStaffManagementAction`, lines 373–460) — the
  existing `staffUid === requesterUid` self-action rejection is the
  direct precedent for Phase A's BR-2 (no self-escalation).
- `apps/tenant/src/types.ts` — `Business` interface confirmed to have
  **no `suspended` field**. `UserProfile.suspended` is the direct
  precedent this slice's `Business.suspended` addition follows.
- `firestore.rules` — `isMemberOf()`, `isOwnerOf()`, `isSuspended()` are
  the exact functions Phase C's `isBusinessSuspended()` extends,
  following the identical shape. `businesses/{businessId}`'s existing
  `allow update: if isOwnerOf(businessId)` rule has no field-level
  protection today — this is the exact gap Phase C's field-guard clause
  closes.
- `server/index.ts` (`readSubscriptionStatus()`, line ~1599) — already
  implemented, used by the existing Payment Operations detail route.
  Phase B's business-detail read reuses this verbatim.
- `apps/superadmin/` — `App.tsx`, `SignIn`, `PendingPaymentsQueue`,
  `PaymentDetail`, `AuditTrail` exist. This slice adds new pages
  (`Operators`, `BusinessSearch`, `BusinessDetail`) and extends
  `AuditTrail` — the shell (`App.tsx`'s `platform_operators` gate) is
  reused unmodified.
- No `platform_operators` list/management route exists — Phase A adds
  the first one.
- No business-search or business-detail route exists — Phase B adds the
  first one.
- No `suspended` concept exists anywhere for `businesses/*` — confirmed
  absent from both the type and the rules file.

## 2. Desired State (end of this slice, all four phases)

- A SuperAdmin can provision/revoke `platform_operators` records entirely
  in-app, with the CLI script relegated to a documented break-glass path.
- A SuperAdmin can search and view a curated, audited, read-only summary
  of any business, sufficient to diagnose realistic support scenarios,
  without a database console.
- A SuperAdmin can suspend/reactivate a business, with immediate,
  Rules-layer-enforced effect, fully reversible, fully audited.
- A SuperAdmin can filter the existing Audit Trail by business, actor,
  action type, and time range.
- Payment Operations is unchanged in behavior throughout.

## 3. Affected Files (net-new and modified, this slice only)

| File | Change |
|---|---|
| `apps/tenant/src/types.ts` | **Modified** — add `suspended?: boolean` to `Business`, matching `UserProfile.suspended`'s existing comment style and shape exactly. |
| `packages/shared-types/index.ts` | **Possibly modified** — if `Business` (or a subset of it) needs to be shared with `apps/superadmin` for the detail-view response typing; confirmed during implementation whether a new shared type or a slice-local response DTO is cleaner (implementation-plan-level detail, not fixed here). |
| `firestore.rules` | **Modified** — new `isBusinessSuspended(businessId)` function (mirrors `isSuspended()`); folded into `isMemberOf()`; new field-protection clause on `businesses/{businessId}`'s existing `allow update` rule. **No other collection's rule text changes** — the entire enforcement surface is centralized in `isMemberOf()`, per the Architecture Gap Resolutions' own blast-radius analysis. |
| `server/index.ts` | **New routes:** `POST /api/superadmin/operators`, `POST /api/superadmin/operators/:uid/revoke`, `GET /api/superadmin/operators`, `GET /api/superadmin/businesses`, `GET /api/superadmin/business/:businessId`, `POST /api/superadmin/business/:businessId/suspend`, `POST /api/superadmin/business/:businessId/reactivate`. **Modified:** `GET /api/superadmin/audit-log` extended with query-parameter filtering (Phase D). Every route wrapped in the existing `requireAuth` + `requirePlatformOperator` + `requireSuperAdmin` chain — no new middleware. |
| `server/superadminAuth.ts` | **No change.** Reused verbatim. |
| `server/platformAuditLog.ts` | **No change.** Reused verbatim — new callers only, no new primitive. |
| `apps/superadmin/src/pages/` | **New:** `Operators.tsx` (Phase A), `BusinessSearch.tsx` + `BusinessDetail.tsx` (Phase B, with suspend/reactivate actions added to `BusinessDetail.tsx` in Phase C). **Modified:** `AuditTrail.tsx` (Phase D — filter controls). |
| `apps/superadmin/src/lib/superadminApi.ts` | **Modified** — new thin fetch wrappers for each new route, following the file's existing `authedFetch()` pattern exactly. |
| `apps/superadmin/src/App.tsx` | **Modified** — new nav links for Operators / Business Search, added to the existing shell alongside "Fila de Pagamentos" / "Auditoria". No change to the `platform_operators` gating logic itself. |
| `apps/tenant/src/**` | **Possibly modified** — a suspended-business UI treatment (FR-C5: a clear "account suspended" state rather than a raw permission error) if a suspended-business's Owner/Staff attempts a write. Exact scope (a global banner vs. per-action error message) is an implementation-plan-level UI decision, not fixed by this assessment. |
| `firestore.indexes.json` | **Possibly modified** — if Phase B's business-search-by-name-prefix or Phase D's multi-field audit-log filter needs a composite index; confirmed during implementation, not assumed here (same discipline the Payment Operations Rule 8 Assessment already applied to its own collection-group query). |
| `tests/firestore-rules.test.ts` | **Extended** — new `businesses` suspension test group; extended `isMemberOf`-consuming collection tests (representative: `products`, `batches`, `expenses`) proving a suspended business is denied writes. |
| `tests/superadmin-operational-control-plane.test.ts` | **New** — server-side unit tests for all seven new routes, self-escalation rejection (BR-2), last-SuperAdmin lockout (BR-3), curated-response-shape assertions (BR-5), following `superadmin-payment-operations.test.ts`'s existing fixture/structure conventions. |
| `docs/specs/18-superadmin.md`, `docs/specs/README.md` | **Updated** — governance step recording this second slice's existence and relationship to the still-unauthorized full Module #18. |

**No change, confirmed:** `server/paymentConfirmation.ts`,
`server/subscriptionEngine.ts`, any existing `/api/superadmin/payments/*`
route's behavior, `apps/superadmin/src/pages/PendingPaymentsQueue.tsx`,
`apps/superadmin/src/pages/PaymentDetail.tsx` (beyond the shared
`App.tsx` nav addition).

## 4. Architecture Alignment

- Phase A aligns with Architecture §9.12 (Internal Account Management),
  implementing its "minimum viable" form explicitly deferred by the
  Payment Operations spec §11, not the full self-service screen §9.12
  eventually describes (no invitation-by-email flow, no UI beyond
  provision/revoke against a known uid — matching this slice's own
  narrower FR-A1–A4).
- Phase B aligns with Architecture §9.3 (Businesses/Tenant Management)
  **narrowly** — implementing only its read-only diagnostic capability,
  explicitly not its suspend/reactivate/purge write actions (those are
  Phase C, differently scoped) and explicitly not its full
  `businessCode`-based search (that field doesn't exist — confirmed,
  same known gap Payment Operations already documented; this slice uses
  name/`businessId` matching instead, per Gap 2's resolution).
- Phase C aligns with Architecture §9.3's suspend/reactivate action and
  §4.6's "Security-Rules-enforced, immediate effect" pattern, applied at
  the business level exactly as §9.3 itself already states it should be.
- Phase D aligns with Architecture §9.6 (Audit Logs) — its "filterable
  by business, actor, and action type" requirement, not yet implemented
  by the Payment Operations slice's initial flat-list screen.
- **No alignment claimed with** Architecture §9.4 (Subscriptions & Billing
  override), §9.5 (Feature Flags), §9.7 (full Support Session), §9.8
  (Platform Analytics), §9.9 (platform Notifications), §9.10
  (Impersonation), §9.11 (System Health) — none of these are touched.

## 5. Data-Model Impact

- `Business.suspended?: boolean` — new, optional, additive. Default
  absent = `false` via `.get('suspended', false)` in Rules, matching
  every other optional field already in this file. **No migration
  required** for any existing business document.
- No change to `Payment`, `Subscription`, `UserProfile`, `StaffMember`,
  or any other existing document shape.
- `PlatformAuditLogEntry.actionType` — no type change (already open
  `string`); five new *values* used, not a new *field*.

## 6. Firestore Rules Impact

**New:**
```
function isBusinessSuspended(businessId) {
  return get(/databases/$(database)/documents/businesses/$(businessId)).data.get('suspended', false) == true;
}
```
Folded into `isMemberOf()`:
```
function isMemberOf(businessId) {
  return isSignedIn() && !isSuspended() && !isBusinessSuspended(businessId) && (
    myProfile().businessId == businessId ||
    businessId in ownedBusinessIds()
  );
}
```
`businesses/{businessId}`'s existing `allow update: if isOwnerOf(businessId)`
gains a field-immutability clause (exact form specified in the
Architecture Gap Resolutions document, §Gap 1).

**Read-cost note, flagged not silently absorbed:** `isMemberOf()` is the
single most widely-consumed function in this rules file. This change
adds one additional `get()` per `isMemberOf()` evaluation (the business
document, in addition to `myProfile()`'s existing `get()`) — a real,
measurable doubling of that function's read cost. This is the same class
of cost the file already accepts for `isSuspended()`'s `myProfile()` read
and is not expected to be materially different in practice, but it is
the single most consequential performance-adjacent change in this slice
and should be watched, not assumed negligible.

**Unchanged:** every other collection's rule text — the entire new
suspension-enforcement surface lives in one function, per the "one
change, many consumers" pattern this file already uses for
`isMemberOf`/`isOwnerOf` themselves.

**No rules change for Phases A, B, or D.** All three are implemented
entirely as privileged-server (Admin SDK) routes, which already bypass
client rules — the same guarantee every existing `/api/superadmin/*`
route relies on. This is a deliberate design choice (Gap 2's
recommendation): Business Visibility reads never touch `firestore.rules`
at all, since the client's Firestore SDK is never given a path to raw
tenant collections in the first place.

## 7. API Impact

Seven new routes, one modified route (§3, above), all under
`/api/superadmin/*`, all following the identical
`requireAuth`/`requirePlatformOperator`/`requireSuperAdmin` chain already
proven by the five existing Payment Operations routes. No new
authentication mechanism, no new middleware pattern, no route outside the
`/api/superadmin/*` namespace.

## 8. SuperAdmin UI Impact

Three new pages (`Operators`, `BusinessSearch`, `BusinessDetail`), one
extended page (`AuditTrail`), nav additions to the existing shell.
`App.tsx`'s `platform_operators` gating logic (the code that decides
whether the shell renders at all) is unmodified — new nav links are
simply additional entries alongside the two that already exist, gated
the same way (SuperAdmin-only, matching this slice's scope — no new
per-screen role matrix is introduced, since every capability in this
slice remains SuperAdmin-only per BDS §3).

## 9. Security Impact

- No new identity mechanism (BR-2/NFR-3) — `platform_operators` remains
  sole.
- No new attack surface on `firestore.rules`'s read side — Phases A, B, D
  add zero new client-reachable rule paths (§6, above). The one genuine
  new rules surface is Phase C's write-protection clause, which
  *narrows* what's writable (adds a guard), rather than opening anything.
- Self-escalation is structurally prevented for both operator
  provisioning (BR-2) and the last-SuperAdmin lockout (BR-3), each
  computed from a fresh server-side read at request time, matching
  `verifyStaffManagementAction`'s existing `staffUid === requesterUid`
  precedent.
- Business Visibility introduces the first human-visible cross-tenant PII
  surface (owner email) in this application — scoped per Gap 3's
  resolution (single-business detail view only, never in list results,
  always audited with a required justification).

## 10. Audit Impact

Five new `actionType` values, zero new audit collections, zero changes
to `writeAuditLogEntry()`'s own implementation. Every mutating action in
this slice (provision, revoke, suspend, reactivate) and the one
consequential read (business detail view) produces exactly one audit
entry — matching BR-12 and the existing atomicity caveat already
documented in `platformAuditLog.ts`'s own header (the audit write is a
separate step after the state-changing step, not in the same Firestore
transaction, for the same Admin-SDK-nested-transaction reason already
established for Payment Operations).

## 11. Tenant Isolation Impact

- Phase B's curated response shape is the one place this slice reads
  more than the caller's own scope — explicitly bounded (§7 of the BDS)
  to prevent it becoming a raw cross-tenant data surface. No new
  collection-group query is introduced by this slice (contrast with
  Payment Operations' `payments` collection-group query) — Phase B reads
  are all single-document/single-business reads, keyed by the
  `businessId` the operator explicitly requested.
- Phase C's suspension check is intrinsically single-business — no
  cross-tenant read is introduced.
- No existing tenant-facing rule (`isOwnerOf`/`isMemberOf`-gated
  collections not already discussed) changes in shape or behavior beyond
  the one new `isBusinessSuspended()` clause folded into `isMemberOf()`
  itself.

## 12. Testing Requirements

- **Firestore Rules (emulator-required, per NFR-2):** new `businesses`
  suspension test group; extended tests on at least `products`,
  `batches`, `expenses` proving a suspended business's Owner/Staff is
  denied writes; a test proving `businesses/{businessId}.suspended`
  cannot be set by any client write, Owner included.
- **Server-side unit tests:** self-escalation rejection (Phase A);
  last-SuperAdmin lockout (Phase A); curated-response-shape assertions —
  a test that positively confirms the Phase B response never contains a
  raw collection reference or any field outside the named shape;
  justification-required enforcement on Phase B/C routes.
- **Explicit test-result taxonomy for this slice, per the mandatory
  testing standard:** every rules-emulator test result in this slice's
  eventual implementation report must be recorded as one of **PASS /
  FAIL / ENVIRONMENT BLOCKED / NOT RUN** — never silently conflated with
  a passing `tsc`/build-clean result. `HANDOFF.md` already documents this
  sandbox's own emulator access as environment-blocked
  (`storage.googleapis.com` not allowlisted); if that constraint still
  holds at implementation time, the CI emulator run
  (`.github/workflows/ci.yml`'s existing Java 21 + `firebase-tools` step)
  is the environment that must produce a real PASS before merge — not
  assumed passing because the equivalent Payment Operations tests were
  never confirmed to have run either (a standing gap, restated here, not
  newly introduced by this slice).

## 13. Risks

1. **`isMemberOf()` read-cost increase (§6)** — the widest-reaching
   single change in this slice's rules surface. Mitigation: explicit
   flag here rather than silent absorption; worth a before/after read-cost
   spot-check during implementation, not just a correctness test.
2. **Phase B response-shape scope creep, over time** — the single
   ongoing risk most likely to erode this slice's own boundary after it
   ships (BR-5's own text names this explicitly). Mitigation: any future
   PR touching the Phase B response shape should cite BR-5 in its own
   description, not be treated as a routine field addition.
3. **Business-suspension UX (FR-C5) is under-specified by design** — the
   BDS deliberately leaves the tenant-facing suspended-state UI as an
   implementation-plan-level decision. Mitigation: resolve this
   explicitly in the Implementation Plan (§7, next document), not left
   ambiguous into coding.
4. **Two-path operator provisioning after Phase A ships** — the CLI
   script remains functional alongside the new in-app flow (matching the
   already-accepted Payment Operations CLI-bridge precedent). Mitigation:
   same treatment already recommended for that precedent — document the
   CLI script as break-glass-only in its own header once Phase A ships.
5. **Firestore rules emulator verification remains this repository's
   standing, unresolved gap** — restated from the Payment Operations Rule
   8 Assessment, not new to this slice. This slice's Phase C rules change
   is the first one since that gap was flagged with a *genuinely wider*
   blast radius (`isMemberOf()` itself, not a single new collection) —
   raising the cost of shipping without emulator verification compared to
   prior slices.

## 14. Implementation Plan

See the companion document,
[`18-superadmin-v1-operational-control-plane-implementation-plan.md`](./18-superadmin-v1-operational-control-plane-implementation-plan.md),
for the full per-phase file/route/test breakdown, commit-boundary
sequencing, and deployment considerations. This assessment names *what*
changes; that document sequences *how*.

## 15. Rollback Considerations

- **Phase A:** revoking is itself the rollback mechanism for a bad
  provisioning grant — no separate rollback path needed beyond the
  feature's own revoke action.
- **Phase B:** read-only; rollback is a plain code revert with zero data
  implications.
- **Phase C — the one phase with a real rollback consideration:** if the
  `isBusinessSuspended()` rules change ships with a defect (e.g. blocks
  writes for non-suspended businesses due to a logic error), rollback is
  a `firebase deploy --only firestore:rules` of the prior rules file —
  same mechanism already used this session to fix the `platform_operators`
  drift. **Given this slice's own risk #1 (blast radius), a rules-only
  rollback path independent of a full code rollback is worth confirming
  explicitly works before this phase ships**, not assumed.
- **Phase D:** read/filter-only; plain code revert, zero data
  implications.

## 16. Deployment Considerations

- This session's own experience is the direct, immediate precedent:
  **both `firestore.rules` and `firestore.indexes.json` (if Phase B/D
  need one) require their own explicit `firebase deploy` step** —
  confirmed, this session, that this repository has no automated
  rules/indexes deployment in CI. The two production incidents fixed
  this session (stale `platform_operators` rules, missing `payments`
  collection-group index) are the exact failure mode any Phase C/B
  rules-or-index change must not repeat.
- Recommended: before Phase C's rules change is deployed, run the same
  drift-check this session performed manually (diff live vs. `HEAD`) as
  an explicit deployment-runbook step, not an assumed-safe deploy.
- No new Railway service, domain, or environment variable is required —
  this slice ships entirely within the existing `apps/superadmin`
  deployment already live at `adminbpt.sabushtech.com`.

## 17. Phase Dependencies (explicit)

- **Phase A depends on:** nothing new — every primitive it needs
  (`platform_operators` collection, `writeAuditLogEntry`,
  `requirePlatformOperator`) already exists and is proven.
- **Phase B depends on:** nothing new for its read mechanism (Gap 2's
  resolution requires no rules change); depends on Gap 3's confirmation
  (owner-email scope) before its response shape is finalized.
- **Phase C depends on:** Gap 1's resolution being explicitly confirmed
  by the Product Architect — this assessment treats it as the working
  design, but per this document's own header, that confirmation is not
  yet given. **Phase C cannot begin its own coding step until that
  confirmation exists**, independent of A/B's own readiness.
- **Phase D depends on:** A and C's new `actionType` values existing to
  filter against for a meaningful demo/test, though its own filtering
  mechanism has no structural dependency on either — it could be built
  and tested against Payment Operations' existing two action types alone
  if sequencing ever needs to change.

## 18. What This Assessment Does Not Authorize

Per `CLAUDE.md`'s Rule 8 and this document's own header: reaching
"Assessed" is not authorization to begin implementation. That remains a
separate, explicit Product Architect go-ahead, consistent with how every
other Rule 8 Assessment in this repository has been treated — including
the Payment Operations Rule 8 Assessment this document directly follows
the shape of.
