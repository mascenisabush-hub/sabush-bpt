# Implementation Plan — SuperAdmin V1 Operational Control Plane

**Governing chain:** [ADR-0006](../adr/ADR-0006-superadmin-v1-operational-control-plane.md)
→ [Architecture Gap Resolutions](./18-superadmin-v1-architecture-gap-resolutions.md)
→ [BDS](../specs/18-superadmin-v1-operational-control-plane-slice.md)
→ [Rule 8 Assessment](./18-superadmin-v1-operational-control-plane-rule8-assessment.md)
→ this document.
**Type:** Implementation Plan — file/route/test-level plan, no code
written. **Does not authorize implementation.** A separate, explicit
Product Architect go-ahead is required before Phase A's first commit.
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, or `firestore.indexes.json` to produce this document.**

---

## Sequencing Principle

Each phase is its own commit boundary, verified typecheck/build/test-green
before the next phase starts — the same discipline `18-19-payment-operations-rule8-assessment.md`
§7 already established for Payment Operations. Payment Operations itself
is never re-touched by any phase below.

---

## Phase A — Internal Account Management

**Unblocked today.** No open architecture gap depends on this phase.

### Files
- `server/index.ts` — three new routes:
  - `POST /api/superadmin/operators` — body `{ uid, platformRole }`.
    `requireAuth` + `requirePlatformOperator` + `requireSuperAdmin`.
    Rejects `uid === req.callerUid` (BR-2, mirrors
    `verifyStaffManagementAction`'s existing self-action check). Writes
    `platform_operators/{uid}` via Admin SDK. Calls `writeAuditLogEntry`
    with `actionType: 'operator.provisioned'`, `targetUid: uid`.
  - `POST /api/superadmin/operators/:uid/revoke` — same middleware chain.
    Rejects `:uid === req.callerUid` (BR-2). **Before deleting:** counts
    current `platform_operators` where `platformRole == 'superadmin'`;
    if the target is a superadmin and the count is 1, reject with 400
    (BR-3 — the lockout guard, computed fresh at request time, never
    cached). Deletes the `platform_operators/{uid}` document. Writes
    `actionType: 'operator.revoked'`, `targetUid: uid`.
  - `GET /api/superadmin/operators` — lists `{ uid, platformRole }[]`
    from `platform_operators`. No audit write (a read-only list, same
    tier as the existing `payments/pending` route, which also doesn't
    audit its own read).
- `apps/superadmin/src/lib/superadminApi.ts` — `provisionOperator()`,
  `revokeOperator()`, `fetchOperators()`, following `fetchPendingPayments()`'s
  existing thin-wrapper shape exactly.
- `apps/superadmin/src/pages/Operators.tsx` — **new.** List + provision
  form (uid + role select) + revoke action per row, with the caller's own
  row rendering no revoke button (§9.1's "not rendered, not merely
  disabled" convention — client-side courtesy only; BR-2 is the real
  enforcement, server-side).
- `apps/superadmin/src/App.tsx` — add "Operadores" nav link + view case,
  alongside the two existing nav links. No change to the
  `platform_operators` gating `useEffect`.

### Firestore rules / indexes
None. This phase is entirely Admin-SDK-mediated (§6 of the Rule 8
Assessment).

### Tests
- `tests/superadmin-operational-control-plane.test.ts` (new file, shared
  across all four phases): self-targeting rejected for both
  provision and revoke; last-SuperAdmin revoke rejected; successful
  provision/revoke each produce exactly one audit entry with the correct
  `actionType`/`targetUid`.

### Audit events
`operator.provisioned`, `operator.revoked`.

### Build verification
`tsc --noEmit` across all three programs; `npm run test:all`;
`npm run build:all`; bundle-isolation string scan on `dist/` (must remain
zero SuperAdmin identifiers, unchanged standard).

### Deployment considerations
No new env vars, no new Railway service. Deploys as part of the existing
`apps/superadmin` build/deploy already live.

### Commit boundary
One commit: routes + API client + `Operators.tsx` + nav + tests, verified
green before Phase B starts.

---

## Phase B — Business Visibility

**Partially blocked.** Gap 2 (read model) is treated as settled by this
plan; Gap 3 (owner email) is treated as settled. Both remain
**recommended, not yet Product-Architect-confirmed** per the Rule 8
Assessment's own §17 — this phase's coding step should not begin before
that confirmation, even though the plan itself is written against the
recommended design.

### Files
- `server/index.ts` — two new routes:
  - `GET /api/superadmin/businesses?q=` — Admin-SDK query against
    `businesses` by `name` prefix, or exact-match against document id if
    `q` looks like a `businessId`. Returns `{ businessId, name }[]`
    (BR-6 — no email, no other field). No audit write (list-only,
    matching the operators-list precedent from Phase A).
  - `GET /api/superadmin/business/:businessId?justification=` — requires
    `justification` (400 if missing/empty). Reads, via Admin SDK:
    - `businesses/{businessId}` → `name`, `category`, `currencySymbol`, `createdAt`
    - `users/{ownerUid}` (from `businesses/{businessId}.ownerUid`) → `name`, `email`, `createdAt`
    - `businesses/{businessId}/staff` (collection) → `[{ name, suspended }]` summary only
    - `subscriptions/{businessId}.status` — reusing `readSubscriptionStatus()` verbatim, no new read pattern
    - `payments` (last N for this business, via existing collection query pattern, not the collection-group scan Payment Operations uses for the *pending* queue — this is a single-business scoped query)
    Assembles the curated response (BR-5). Writes
    `actionType: 'business.viewed'`, `targetBusinessId: businessId`,
    `justification`.
- `apps/superadmin/src/lib/superadminApi.ts` — `searchBusinesses(q)`,
  `fetchBusinessDetail(businessId, justification)`.
- `apps/superadmin/src/pages/BusinessSearch.tsx` — **new.** Search input
  + results list (name + id only, BR-6), each row navigating to detail.
- `apps/superadmin/src/pages/BusinessDetail.tsx` — **new.** Justification
  input required before the detail loads (mirrors the pattern of a
  required field gating an action, not a passive prop); renders the
  curated response. **No edit control of any kind** — this page is
  read-only by construction, not by omission (BR-4).
- `apps/superadmin/src/App.tsx` — add "Negócios" nav link + view case.

### Firestore rules / indexes
None to `firestore.rules` (Admin-SDK-mediated, per Gap 2's resolution —
the whole point of choosing this design). **Possibly** a new index if
the `businesses` name-prefix query needs one — confirmed during coding,
not assumed here, same discipline as every prior slice's own indexing
notes.

### Tests
- Curated-response-shape test: asserts the Phase B detail response
  object contains *only* the named fields (BR-5) — a structural
  allowlist assertion, not just a "does it include X" positive check,
  so an accidental future field addition fails the test rather than
  passing silently.
- Missing-justification rejection test.
- Search-results-never-include-email test (BR-6).
- Audit entry produced exactly once per detail read, with correct
  `justification` value round-tripped.

### Audit events
`business.viewed`.

### Build verification
Same as Phase A.

### Deployment considerations
Same as Phase A. If a new index is needed, apply the same
drift-discipline this session's own incident established: deploy via
`firebase deploy --only firestore:indexes` and confirm build status
before relying on the query in production.

### Commit boundary
One commit, gated on explicit confirmation of Gap 2/Gap 3 (not just this
plan's own recommendation), verified green before Phase C starts.

---

## Phase C — Business Suspend/Reactivate

**Implemented and Rules-emulator-verified.** Gap 1 (business-suspension
data model) was Product-Architect-confirmed prior to implementation —
see the Gap Resolutions document's Gap 1 status line and the Phase C
Pre-Implementation Verification's own gate check. Idempotency (§6 of
that verification) was confirmed as Option B (reject repeated
transitions with a controlled error, never a silent no-op). This plan
was written against exactly that confirmed design.

**Firestore Rules emulator result: PASS.** Run 2026-08-15, locally
(`npm run test:rules:emulator`, real Firestore emulator via
`firebase-tools`/JVM, not this repository's own sandboxes — those
remain environment-blocked from `storage.googleapis.com`, unchanged).
**104 tests, 27 suites, 0 failures, 0 cancelled, 0 skipped**, including
the full `business suspension — Phase C` group (active-baseline
regression, suspended-denial across `products`/`expenses`/`stockCounts`
for Owner, `products` for Staff, `closings` for Manager; field-guard
proof on both a suspended and an active business; unrelated-business
non-interference; missing-field-defaults-to-active; `users/{uid}`
self-access exception; `subscriptions/{businessId}` denial). This
confirms `isMemberOf()`'s modification — the widest-blast-radius rules
change in this repository's history — behaves exactly as the Phase C
Pre-Implementation Verification's blast-radius analysis (§3 of that
document) predicted, against a real rules engine, not merely a
typecheck. **Phase C's `firestore.rules` change is verified
production-ready** as of this result; the standing blocker recorded in
the Phase C implementation commit (`3333fb5`) and its own final report
is now resolved. Production deployment (`firebase deploy --only
firestore:rules --project sabush-bpt`) remains a separate, not-yet-
performed, explicit action — this result clears the verification
prerequisite for that step, it does not itself deploy anything.

### Files
- `apps/tenant/src/types.ts` — add `suspended?: boolean` to `Business`,
  with a comment mirroring `UserProfile.suspended`'s existing style
  (server-only-writable, mirrors the staff pattern one level up).
- `firestore.rules`:
  - New function, placed alongside `isSuspended()`:
    ```
    function isBusinessSuspended(businessId) {
      return get(/databases/$(database)/documents/businesses/$(businessId)).data.get('suspended', false) == true;
    }
    ```
  - `isMemberOf()` modified to include `!isBusinessSuspended(businessId)`
    in its conjunction, exact form specified in the Architecture Gap
    Resolutions document.
  - `businesses/{businessId}`'s `allow update` rule gains:
    ```
    request.resource.data.get('suspended', false) == resource.data.get('suspended', false)
    ```
- `server/index.ts` — two new routes:
  - `POST /api/superadmin/business/:businessId/suspend` — body requires
    `justification` (400 if missing). Sets
    `businesses/{businessId}.suspended = true` via Admin SDK
    (single-stage — no Auth-disable step, per BR-9). Writes
    `actionType: 'business.suspended'`, `targetBusinessId`,
    `justification`.
  - `POST /api/superadmin/business/:businessId/reactivate` — same shape,
    sets `suspended = false`, writes `business.reactivated`.
- `apps/superadmin/src/pages/BusinessDetail.tsx` — modified: add
  suspend/reactivate action button + required justification field,
  conditional on current `suspended` state (fetched as part of Phase B's
  existing detail read — `Business.suspended` becomes part of that
  response once this phase ships).
- `apps/tenant/src/**` — a suspended-state UI treatment (FR-C5). Exact
  component/placement is decided at coding time, not fixed here, but the
  requirement is explicit: a suspended business's Owner/Staff must see a
  clear, explained state — not a raw Firestore permission-denied error
  surfacing in the console with no user-facing explanation. Candidate
  approach: `AppContext.tsx`'s existing real-time profile listener
  (already used to force sign-out on `users/{uid}.suspended`) is
  extended to also listen to `businesses/{businessId}.suspended` and
  render a persistent banner — this mirrors an existing mechanism rather
  than inventing a new one, but is confirmed feasible, not assumed, at
  coding time.

### Firestore rules / indexes
The one rules change in this entire slice. No new index required.

### Tests (the most consequential test addition in this slice)
- `tests/firestore-rules.test.ts`, new `businesses` suspension group:
  - A suspended business's Owner cannot write to `products`, `batches`,
    `expenses` (representative sample, per NFR-2 — not exhaustive of
    every `isMemberOf`-gated collection, but covering at least one from
    each major access tier already established in the file).
  - A suspended business's Staff (non-Manager) is equally denied.
  - `businesses/{businessId}.suspended` cannot be set to `true` or
    `false` by the business's own Owner via a direct client write —
    tested explicitly, not inferred from the field simply not being
    mentioned in the Owner's allowed update fields.
  - A non-suspended business is completely unaffected (regression
    coverage — the most important test in this group, since a logic
    error here would silently break every business on the platform).
- Server-side: justification-required enforcement; audit entry
  correctness; idempotency (suspending an already-suspended business
  twice does not produce two audit entries — mirroring
  `paymentConfirmation.ts`'s own idempotency pattern where relevant, or
  explicitly documented as *not* idempotent if the design instead treats
  a repeat suspend as a no-op vs. an error — decided explicitly at coding
  time, not left ambiguous).

### Explicit test-result reporting requirement
Per the Rule 8 Assessment §12: the firestore-rules-emulator run for this
phase's tests must be reported as one of **PASS / FAIL / ENVIRONMENT
BLOCKED / NOT RUN** in whatever session implements this phase — never
silently treated as equivalent to a passing `tsc`/build check. Given this
phase's uniquely wide blast radius (`isMemberOf()` itself), this is the
single most important verification step in the entire four-phase plan.

### Audit events
`business.suspended`, `business.reactivated`.

### Build verification
Same as Phases A/B, plus the explicit rules-emulator PASS requirement
above.

### Rollback
Per the Rule 8 Assessment §15: confirm a `firestore.rules`-only rollback
(prior rules file redeploy) works independently of a full code rollback,
before this phase ships to production — not assumed.

### Deployment considerations
`firebase deploy --only firestore:rules` required as its own explicit
step (this session's own incident is the direct precedent for why this
cannot be assumed to happen automatically). Recommend a pre-deploy
drift-check (diff live rules vs. `HEAD`) as an explicit runbook step for
this specific deploy, given the blast radius.

### Commit boundary
One commit: types + rules + routes + UI + tests, gated on explicit Gap 1
confirmation, verified green (including a real, non-environment-blocked
emulator PASS) before Phase D starts.

---

## Phase D — Audit Center Completion

**Unblocked today.** No architecture gap depends on this phase; benefits
from A/C's new action types existing but has no structural dependency on
them.

### Files
- `server/index.ts` — `GET /api/superadmin/audit-log` modified to accept
  optional `businessId`, `actorUid`, `actionType`, `from`, `to` query
  parameters, applying Firestore `.where()` clauses accordingly (Admin
  SDK, same collection already read by the existing route — no new
  collection, no new index unless the specific field-combination
  Firestore requires one, confirmed at coding time).
- `apps/superadmin/src/pages/AuditTrail.tsx` — modified: add filter
  controls (business/actor/action-type/date-range inputs), wired to the
  extended route.
- `apps/superadmin/src/lib/superadminApi.ts` — `fetchAuditLog()` extended
  to accept and forward filter parameters.

### Firestore rules / indexes
No rules change (existing `platform_audit_log` read rule, scoped to
verified operators, already covers this). **Possibly** a new composite
index depending on which filter combinations are queried together —
confirmed at coding time, not assumed.

### Tests
Filter-correctness tests for each parameter independently and in
combination; confirms no filter parameter allows reading beyond what the
existing `platform_audit_log` read rule already permits (i.e., filtering
is a query-shape change only, not an authorization change).

### Audit events
None new — this phase reads, never writes, the audit log.

### Build verification
Same as prior phases.

### Deployment considerations
Same as prior phases; index deploy only if confirmed necessary at coding
time.

### Commit boundary
One commit: route + UI + tests, verified green. Closes this slice.

---

## Cross-Phase Verification (before this slice is considered complete)

- Full `npm run test:all` green, including the new
  `tests/superadmin-operational-control-plane.test.ts` and the extended
  `tests/firestore-rules.test.ts`.
- `npm run build:all` clean, all three build artifacts.
- Bundle-isolation scan on `dist/` — zero identifiers from any of the
  four phases (same standard, same verification method as Payment
  Operations).
- Rules-emulator run reported with an explicit PASS/FAIL/ENVIRONMENT
  BLOCKED/NOT RUN status — not silently assumed.
- `HANDOFF.md` updated to reflect the four phases' actual shipped state,
  matching the discipline this session already applied when correcting
  `HANDOFF.md`'s stale "not yet production-deployed" line for Payment
  Operations.

## Mandatory Scope Audit (explicit, per the governing instruction)

Confirmed by direct re-read of every document in this governance package:
this plan authorizes, at completion, **no** subscription override, **no**
direct subscription writes, **no** arbitrary business editing (Phase C
writes exactly one boolean field, nothing else), **no** impersonation,
**no** write-as-customer, **no** destructive deletion, **no** data purge,
**no** generic Firestore access beyond the specific, named reads/writes
enumerated phase by phase above, and **no** ERP-style administration.
