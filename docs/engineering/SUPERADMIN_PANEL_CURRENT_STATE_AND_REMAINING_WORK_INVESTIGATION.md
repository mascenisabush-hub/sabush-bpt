# SuperAdmin Panel — Current State and Remaining Work Investigation

**STATUS: INVESTIGATION COMPLETE — NO IMPLEMENTATION AUTHORIZED**

This is an audit-only artifact. No application code, test, schema, or
`firestore.rules` file was modified to produce it. It reflects the
repository state as of `HEAD` at the time of investigation.

---

## 1. Executive Summary

The SuperAdmin panel is materially more built than a first glance at
one module suggests. Two ADR-governed slices are fully implemented,
tested, and (per `docs/specs/README.md`) production-verified:

- **SuperAdmin Payment Operations V1** (ADR-0005) — confirm/reject
  manually-submitted tenant payments.
- **SuperAdmin V1 Operational Control Plane** (ADR-0006) — four
  phases: Internal Account Management, Business Visibility, Business
  Suspend/Reactivate, Audit Center Filtering.

A fifth, separately-governed capability — **Business Directory**
(BDR-0010/POL-18-001) — is also fully implemented and tested, though
its own governance record documents that implementation began before
the Rule 8/Authorization gate formally closed (retrospectively
accepted, not concealed).

Server-side authorization is real and consistent: every one of the 15
`/api/superadmin/*` routes runs the identical `requireAuth →
requirePlatformOperator → requireSuperAdmin` chain, re-reading
`platform_operators/{uid}` from Firestore on every request — never
trusting a client-supplied role. `firestore.rules` independently
backs this up (`platform_operators` write is unconditionally `false`
for every client; the `suspended` field on `businesses/{businessId}`
is excluded from what an Owner's own update can touch, in either
direction).

What is genuinely **not** built is large and explicitly named in the
repository's own governing index (`docs/specs/README.md`): Tenant
Management, §9.4 subscription overrides, Feature Flags, Platform
Analytics, platform Notifications, Impersonation, System Health, and
the fuller §9.12 Internal Account Management UI beyond what the
Operational Control Plane's narrower slice covers. One specific
capability — **SuperAdmin subscription intervention** — was
investigated, decided, and explicitly **not implemented on purpose**
(BDR-0011, "Monitor first," with a stated revisit condition) — this is
a deliberate governance outcome, not an oversight.

Two known, narrow test failures exist, both in
`superadmin-assisted-initial-stock-recovery.test.ts`, both pre-existing
and unrelated to the four core phases. Two of the fifteen SuperAdmin
test files require a live Firestore emulator this sandbox cannot
reach; their own headers already document this ("could not be executed
in the sandbox that authored it").

No security defect was found in the SuperAdmin authorization chain
itself. Two UX-level gaps were found: operator provisioning requires
typing a raw Firebase Auth `uid` with no lookup-by-email affordance,
and there are two separate, overlapping "find a business" screens
(Business Search vs. Business Directory) with no stated reason for
both to exist going forward.

---

## 2. Current Repository/Git State

```
Branch: main
HEAD:   ab2a3d9 (docs(handoff): update HANDOFF.md for Product Identity Existing/New Resolution session)
Working tree: clean, no uncommitted changes, before this investigation began
```

Recent commit history has no SuperAdmin-specific commits in the last 5
entries — the most recent SuperAdmin-related work predates the
Product Identity Existing/New Resolution and Product Recognition
threads this session's own prior work concerned. This investigation
did not rely on chat memory of that older work; every claim below was
re-verified against the current file contents.

---

## 3. SuperAdmin Architecture Map

SuperAdmin is a **fully separate Vite app** — `apps/superadmin/` — not
a route inside the tenant app. It has its own `index.html`,
`vite.config.ts`, `App.tsx`, and Firebase client config
(`apps/superadmin/src/lib/firebase.ts`).

Request path (traced end-to-end):

```
apps/superadmin/src/pages/*.tsx (UI)
  → apps/superadmin/src/lib/superadminApi.ts (typed fetch wrapper,
    attaches Firebase ID token as Bearer header)
  → server/index.ts route (/api/superadmin/*)
      → requireAuth            (verifies real Firebase ID token, Admin SDK)
      → requirePlatformOperator (re-reads platform_operators/{uid}, server/superadminAuth.ts)
      → requireSuperAdmin       (platformRole === 'superadmin' only, V1 scope)
      → thin route handler, delegating to an importable module:
          server/operatorManagement.ts   (Phase A)
          server/businessVisibility.ts   (Phase B)
          server/businessSuspension.ts   (Phase C)
          server/auditLogQuery.ts        (Phase D)
          server/businessDirectory.ts    (Phase E)
          server/paymentConfirmation.ts  (Payment Ops V1)
          server/initialStockRecoveryAuthorization.ts
          server/businessWorthRecoveryAuthorization.ts
      → Firestore (Admin SDK — bypasses firestore.rules entirely, by design)
  → JSON response
  → UI state update
```

Every module above (Phases A–E, Payment Ops) is deliberately
**extracted from `server/index.ts`** for one stated, consistent
reason across every file's own header comment: `server/index.ts`
calls `initializeApp({credential: cert(...)})` at module load, so no
test can import it directly. Each module is therefore independently
importable and independently tested; `server/index.ts`'s own route is
"a thin wrapper," verified by direct reading (see §12).

---

## 4. Authentication/Authorization

**Identification:** a SuperAdmin is a Firebase Auth user whose uid has
a `platform_operators/{uid}` document with `platformRole ===
'superadmin'`. This is a **structurally separate identity space** from
`users/{uid}` (tenant accounts) — confirmed by direct inspection:
`server/superadminAuth.ts` never reads `users/{uid}` at all.

**Server-enforced, not merely UI-enforced.** Verified directly: all 15
`/api/superadmin/*` routes in `server/index.ts` carry the identical
three-middleware chain (`requireAuth, requirePlatformOperator,
requireSuperAdmin`) — checked line-by-line, no exception found. Client
UI gating (`apps/superadmin/src/App.tsx`'s `AuthPhase` state machine)
exists too, but is explicitly documented (in `Operators.tsx`'s own
comment) as "a client-side courtesy only; the real enforcement is
server-side... never trusted from this UI state alone."

**Can tenant users reach SuperAdmin APIs?** A tenant user can call
these routes (auth is real, the endpoint is on the same server), but
`requirePlatformOperator` will 403 them (`not-platform-operator`)
since a tenant `users/{uid}` document is not a
`platform_operators/{uid}` document — these are different
collections/documents by construction, and `platform_operators` write
is unconditionally `false` in `firestore.rules`, so a tenant account
can never self-promote.

**V1 scope note (by design, not a gap):** only `platformRole ===
'superadmin'` passes `requireSuperAdmin`; `'support'` and
`'developer'` are real, structurally-recognized values (confirmed:
`VALID_PLATFORM_ROLES` includes all three) but every current route
denies them. `firestore.rules`' `platform_audit_log` read rule is
intentionally *broader* than this (any verified platform operator, not
superadmin-only) — the rule comment explains this is deliberate
defense-in-depth (a wider-but-safer rules-layer default, narrowed by
the server), not an inconsistency.

**No authorization gap found** in this chain.

---

## 5. Current UI Inventory

From `apps/superadmin/src/App.tsx`'s nav (`Fila de Pagamentos`,
`Auditoria`, `Operadores`, `Negócios`, `Directório`) plus
`BusinessDetail`, reached via click-through, not its own nav item:

| Screen | File | Status |
|---|---|---|
| Sign-in | `SignIn.tsx` | BUILT |
| Pending Payments Queue | `PendingPaymentsQueue.tsx` | BUILT |
| Payment Detail (confirm/reject) | `PaymentDetail.tsx` | BUILT |
| Audit Trail | `AuditTrail.tsx` | BUILT |
| Operators (Account Management) | `Operators.tsx` | BUILT |
| Business Search | `BusinessSearch.tsx` | BUILT |
| Business Directory | `BusinessDirectory.tsx` | BUILT |
| Business Detail (view/suspend/reactivate/recovery) | `BusinessDetail.tsx` | BUILT |
| Dashboard / home landing | — | MISSING (app defaults straight to the payment queue; no overview screen exists) |
| Notifications (platform-side) | — | MISSING (not authorized per `docs/specs/README.md`) |
| System/operational health | — | MISSING (not authorized) |
| Feature flags | — | MISSING (not authorized) |
| Tenant Management (broader than suspend/reactivate) | — | MISSING (not authorized) |
| Impersonation / Support Session | — | MISSING (explicitly rejected in Architecture Gap Resolutions — Gap 2 chose the narrower, non-credential-issuing option instead) |

Every item marked BUILT was confirmed reachable through `App.tsx`'s
own `view` state machine and confirmed to call a real, wired API
function — not merely present as a component.

---

## 6. Business Directory

Backend: `server/businessDirectory.ts`, `queryBusinessDirectory()`.
Confirmed functionality by direct reading:

- **Listing** — yes, paginated (`DIRECTORY_PAGE_SIZE = 100`, opaque
  cursor from the last row's own sort-field value).
- **Search** — yes, exact-`businessId` match unioned with a
  name-prefix range query, deduplicated, capped at
  `SEARCH_RESULT_LIMIT = 20`.
- **Filtering** — operational activity (`new`/`active`/`inactive`/
  `dormant`, POL-18-001 thresholds: 30/14/45 days), subscription
  state (six known values, validated against an allowlist), suspended
  (boolean). All combinable with search per the module's own
  documented Decision A/B split (equality filters combine in one
  query; the range-based Activity filter, when search is also active,
  is applied as a bounded post-filter on the already-fetched rows —
  explicitly to avoid a three-simultaneous-range-field query the
  module's own header says was never verified to work).
- **Sorting** — `lastActivityAt` / `createdAt` / `name`, direction
  fixed per field (name ascending, everything else descending).
- **Business identification** — `businessId`, `name`.
- **Owner/account info** — `ownerUid` only at the directory-row level
  (email is deliberately absent here — see §8, Gap 3).
- **Status** — `suspended`, `subscriptionState`, `operationalActivity`.
- **Audit activity** — `lastActivityAt`, `daysSinceActivity`.
- **Timestamps** — `createdAt`, `lastActivityAt`.
- **Pagination** — yes (cursor-based, confirmed wired in
  `BusinessDirectory.tsx`'s "load more" button).
- **Empty/loading/error states** — confirmed present in
  `BusinessDirectory.tsx` (`busy`, `error`, `rows === null` checks).

**No UI-without-backend found here.** Every filter/sort/pagination
control in `BusinessDirectory.tsx` maps to a real
`queryBusinessDirectory()` parameter.

**Caveat, stated by the module's own governance record (not
concealed):** implementation of this Phase E capability began before
its Rule 8/Authorization gate formally closed — see
`docs/engineering/18-superadmin-business-directory-retrospective-acceptance.md`.
It was retrospectively accepted, tested (81 non-emulator + 18/18
emulator tests per `docs/specs/README.md`), and closed out
(`18-superadmin-business-directory-closeout.md`) — this is a
governance-process finding, not a functional defect.

---

## 7. Internal Account Management (Phase A)

Backend: `server/operatorManagement.ts`. Confirmed:

- **View accounts** — `listOperators()`, `GET
  /api/superadmin/operators`, wired to `Operators.tsx`. Read-only, no
  audit entry written for the list read (documented, deliberate,
  matches the same convention as the payment-queue read).
- **Provision** — `provisionOperator()`, self-escalation blocked
  (`targetUid === requesterUid` rejected server-side, BR-2), platform
  role validated against a closed three-value set.
- **Revoke** — `revokeOperator()`, self-revoke blocked, and a
  **last-superadmin lockout**: before revoking a `'superadmin'`
  record, it re-counts active superadmins via a fresh Firestore read
  (never cached, never client-supplied) and refuses if the target is
  the last one (BR-3).
- **Account/business relationship inspection** — **not present in
  this module.** `platform_operators` carries no business linkage at
  all (it's a platform-identity record, structurally separate from
  `users/{uid}`); relating an operator to specific businesses they've
  acted on is only visible indirectly, via the Audit Trail's
  `actorUid` filter (§10) — there is no dedicated "what has this
  operator touched" view.
- **Fully functional** — yes, both client and server verified wired.
- **Tests** — `tests/superadmin-operational-control-plane.test.ts`
  (17 tests) covers Phase A/B/C/D behavior including BR-2/BR-3.

**Concrete UX gap, not a functional defect:** provisioning requires
typing a raw Firebase Auth `uid` by hand (`Operators.tsx`'s form has a
plain text input labeled "uid (Firebase Auth)"). There is no
email-to-uid lookup or invite-by-email flow — an operator must already
know or separately obtain the target's raw uid (e.g. via Firebase
Console) before they can provision them.

---

## 8. Business Visibility (Phase B)

Backend: `server/businessVisibility.ts`. Confirmed:

- **What SuperAdmin can see:** exactly a curated allowlist —
  `searchBusinesses()` returns `businessId` + `name` only (BR-6,
  enforced by the function's own return type, not left to the caller
  to strip). `fetchBusinessDetail()` returns business name/category/
  currency/createdAt/suspended, owner name/email/createdAt, staff
  name+suspended, subscription status, and the 10 most recent payments
  — nothing else. No raw Firestore document is ever passed through.
- **Business-scoped** — yes; every read is keyed by the single
  `businessId` parameter.
- **Sensitive data exposure** — owner **email is exposed only in the
  single-business detail view, never in search results** (Gap 3,
  confirmed: `BusinessSearchRow` has no `email` field at all, by
  type).
- **Access protection** — the single-business detail read requires a
  non-empty `justification` string (BR-7) before any read happens,
  and is **audited exactly once** as `business.viewed` via the
  existing `writeAuditLogEntry()` primitive.
- **Tests** — `tests/superadmin-business-visibility.test.ts` (13
  tests) plus coverage inside `superadmin-operational-control-plane.test.ts`.

**Architecturally deliberate boundary, confirmed by the module's own
header:** this is read-only — zero writes of any kind — and there is
no client-side Firestore access to raw tenant collections; every read
goes through this server-mediated, curated shape. "Support Session"
(impersonation) was considered and explicitly rejected in favor of
this narrower option (Gap 2, Option B).

---

## 9. Suspend/Reactivate (Phase C)

Backend: `server/businessSuspension.ts`. Confirmed exact behavior:

- **Suspend** — requires non-empty `justification`; verifies the
  business exists; if already `suspended === true`, returns
  `'already-suspended'` (maps to HTTP 409) with **no write and no
  audit entry** (confirmed idempotent by design, Option B). Otherwise
  a single `.update({ suspended: true })` — never a full-document
  overwrite.
- **Reactivate** — the exact mirror image, same idempotency guarantee.
- **State stored** — one boolean field, `businesses/{businessId}.suspended`.
  Missing is treated identically to `false` everywhere it's read
  (confirmed in `firestore.rules`' `isBusinessSuspended()`: `.get('suspended', false)`).
- **User experience after suspension** — a dedicated tenant-facing
  component, `apps/tenant/src/components/BusinessSuspendedBanner.tsx`,
  reads `businessSuspended` from `AppContext` and renders when true.
  This is a fully-closed loop, not a silent failure.
- **Authentication affected?** — **No.** Confirmed by the module's own
  header: "no Firebase Auth disable." The user can still sign in;
  every Firestore **read/write for that business** is denied instead.
- **Tenant application access blocked?** — **Yes, comprehensively.**
  `isBusinessSuspended(businessId)` is folded directly into
  `isMemberOf(businessId)` in `firestore.rules`, and `isMemberOf` is
  the base gate nearly every collection's read/write rule in the file
  depends on (confirmed: `isOwnerOf` itself is defined as `isMemberOf(...)
  && role check`). A suspended business is cut off everywhere at once,
  not per-collection.
- **Reversible** — yes, `reactivateBusiness()` is the exact inverse,
  same idempotency.
- **Audited** — yes, `business.suspended`/`business.reactivated`
  action types, written by the route after a real state change only.
- **Server-side enforcement** — the mutation itself is Admin-SDK-only
  (bypasses rules); additionally, `firestore.rules`' own `businesses/{businessId}`
  `update` rule independently blocks any client (Owner included) from
  writing the `suspended` field in either direction:
  `request.resource.data.get('suspended', false) == resource.data.get('suspended', false)`.
  This is **two independent layers**, not one.
- **Bypass paths** — none found. Checked: no other write path to
  `businesses/{businessId}.suspended` exists in `server/index.ts`
  besides this module; no Cloud Function exists in this repo (the
  README explicitly states none are used); Firestore rules
  independently block the client path regardless of the server.

---

## 10. Audit Center (Phase D)

Backend: `server/auditLogQuery.ts` + `server/platformAuditLog.ts`
(write side). Confirmed:

- **Events captured** — a closed, confirmed-by-direct-inspection list
  (`KNOWN_ACTION_TYPES`): `payment.confirmed`, `payment.rejected`,
  `operator.provisioned`, `operator.revoked`, `business.viewed`,
  `business.suspended`, `business.reactivated`. (Two more action types
  exist outside this Phase-D list but are written by other slices —
  `business_worth_recovery.authorized` and an initial-stock-recovery
  equivalent — confirmed present in `server/index.ts`'s own
  `writeAuditLogEntry()` call sites; `auditLogQuery.ts`'s own
  `actionType` filter would reject them as "invalid" if someone tried
  to filter by them, since the allowlist wasn't updated for those
  later slices — see §21, Technical Defect.)
- **Storage** — `platform_audit_log/{eventId}`, Admin-SDK-only writes,
  server-generated `timestamp` (never client-supplied).
- **SuperAdmin access** — `GET /api/superadmin/audit-log`, gated
  `requireSuperAdmin` same as every other route.
- **Filtering** — businessId, actorUid, actionType (validated against
  the allowlist above), date range (`from`/`to`, both validated as
  parseable ISO dates, `from` must not be after `to`) — **all five
  combinable simultaneously** (Decision A, confirmed in code, backed
  by six new composite indexes the module's own header enumerates).
- **Pagination** — **explicitly none.** `orderBy('timestamp',
  'desc').limit(100)` is fixed; the module's own header states this
  plainly as Decision D, not an oversight.
- **Retention** — **not defined anywhere found.** No TTL policy, no
  archival/deletion mechanism for `platform_audit_log` exists in
  `firestore.rules`, `server/`, or any spec searched. This is a
  genuine gap, not flagged as intentional anywhere in the governance
  trail reviewed.
- **Trustworthiness** — server-generated throughout; `actorUid`/
  `actorRole` are always re-derived from the already-authenticated
  `req.platformOperator` context, never taken from the request body.
  Confirmed no route accepts a client-supplied `actorUid` for its own
  audit entry.

---

## 11. Other Existing SuperAdmin Features (beyond A–E)

Two further slices exist, gated identically (`requireSuperAdmin`),
extending `BusinessDetail.tsx`:

- **SuperAdmin-Assisted Initial Stock Recovery** (BDR-0016/POL-0009) —
  `server/initialStockRecoveryAuthorization.ts` +
  `server/initialStockRecoveryConsumption.ts`. Grants the business
  Owner a 48-hour window to recover an accidental/legacy Capital
  Inicial confirmation via the tenant app's own Void & Redo flow — the
  SuperAdmin only authorizes; the Owner executes. Extensively tested
  (`superadmin-initial-stock-recovery-authorization.test.ts`, 23
  tests; `superadmin-initial-stock-recovery-consumption.test.ts`, 28
  tests; `superadmin-assisted-initial-stock-recovery.test.ts`, 25
  tests, 2 known pre-existing failures — see §15).
- **Business Worth Recovery Authorization** — `server/businessWorthRecoveryAuthorization.ts`,
  same authorize-only pattern, a "fully separate" mechanism per its
  own route comment (never writes to `businessWorthSnapshots` or
  `stockCounts` itself).

Both are BUILT and wired into `BusinessDetail.tsx`'s own
`PendingAction` state alongside suspend/reactivate.

---

## 12. Backend/API Inventory

All 15 confirmed routes in `server/index.ts`, each carrying
`requireAuth, requirePlatformOperator, requireSuperAdmin`:

| Method | Route | Module |
|---|---|---|
| GET | `/api/superadmin/payments/pending` | inline (thin) |
| GET | `/api/superadmin/payments/:businessId/:paymentId` | inline (thin) |
| POST | `/api/superadmin/payments/:businessId/:paymentId/confirm` | `paymentConfirmation.ts` |
| POST | `/api/superadmin/payments/:businessId/:paymentId/reject` | `paymentConfirmation.ts` |
| POST | `/api/superadmin/operators` | `operatorManagement.ts` |
| POST | `/api/superadmin/operators/:uid/revoke` | `operatorManagement.ts` |
| GET | `/api/superadmin/operators` | `operatorManagement.ts` |
| GET | `/api/superadmin/businesses` | `businessVisibility.ts` |
| GET | `/api/superadmin/businesses/directory` | `businessDirectory.ts` |
| GET | `/api/superadmin/business/:businessId` | `businessVisibility.ts` |
| POST | `/api/superadmin/business/:businessId/suspend` | `businessSuspension.ts` |
| POST | `/api/superadmin/business/:businessId/reactivate` | `businessSuspension.ts` |
| POST | `/api/superadmin/initial-stock-recovery/:businessId/authorize` | `initialStockRecoveryAuthorization.ts` |
| POST | `/api/superadmin/business-worth-recovery/:businessId/authorize` | `businessWorthRecoveryAuthorization.ts` |
| GET | `/api/superadmin/audit-log` | `auditLogQuery.ts` |

Every module above is independently importable and independently
tested — confirmed `server/index.ts` itself is never imported by any
test file (its top-level `initializeApp({credential: cert(...)})`
call requires real credentials).

---

## 13. Firestore/Data Access

- SuperAdmin **never reads Firestore directly from the client** for
  privileged data — every read/write above goes through the Admin SDK
  inside `server/index.ts`'s route handlers, which bypasses
  `firestore.rules` entirely (by design, same as every other
  privileged-server operation in this codebase).
- The **only** Firestore access the SuperAdmin *client* app makes
  directly is `platform_operators/{uid}` — its own document, at
  sign-in, to decide nav — confirmed by `App.tsx`'s
  `getDoc(doc(db, 'platform_operators', user.uid))`, and confirmed
  scoped to exactly that by `firestore.rules`'
  `allow read: if isSignedIn() && request.auth.uid == uid;`.
- `firestore.indexes.json` carries the composite indexes
  `auditLogQuery.ts`'s own header enumerates as required for its
  combinable-filter design.

---

## 14. Security/Tenant-Isolation Findings

Specifically checked for each item in the investigation brief:

| Check | Finding |
|---|---|
| Client-only authorization | Not found — every route re-verifies server-side. |
| Missing server-side authorization | Not found — all 15 routes carry the full chain. |
| Callable/API authorization gaps | Not found. |
| Firestore rule bypass assumptions | Confirmed intentional and documented (Admin SDK bypasses rules) — this is the established pattern for every privileged operation in this repo, not unique to SuperAdmin. |
| businessId manipulation | Not exploitable — `businessId` is a route param, not a claimed identity; access comes from the operator's own `platformRole`, not from any relationship to the target business (a SuperAdmin is *supposed* to act across businesses). |
| Unauthorized cross-business reads/writes | Not found for the operator path. Client-side, `firestore.rules`'s `isMemberOf`/`isOwnerOf` still fully gate tenant-to-tenant cross-business access, unaffected by any SuperAdmin change. |
| IDOR-style access | Not found — see businessId manipulation above; the authorization model is role-based, not ownership-based, and that is correct for this domain. |
| Suspension bypasses | Not found — two independent layers (rules-layer field lock + Admin-SDK-only write path); see §9. |
| Audit spoofing | Not found — `actorUid`/`actorRole`/`timestamp` are always server-derived, never accepted from the request body. |
| Client-supplied actor identity | Not found. |
| Insecure administrative endpoints | Not found. |

**One documented, intentional non-issue worth naming explicitly (not
a defect):** `platform_audit_log` read access at the `firestore.rules`
layer is granted to *any* verified platform operator (Support/
Developer/SuperAdmin), not narrowed to SuperAdmin — while every actual
route currently serving that data requires SuperAdmin specifically.
The rules comment states this is deliberate defense-in-depth (a
provisioned Support/Developer account with rules-layer read access but
no route that will serve them anything is "the deliberately narrower,
safer side to be wrong on"). Flagged here per the brief's instruction
to document even judged-acceptable asymmetries, not to imply it needs
fixing.

**No security defect requiring remediation was found.**

---

## 15. Test Coverage

| Area | Coverage | Notes |
|---|---|---|
| Authentication/authorization | GOOD | `server/superadminAuth.ts` logic + route-level chain confirmed by direct reading; behavioral tests inside `superadmin-operational-control-plane.test.ts` and `superadmin-payment-operations.test.ts`. |
| Business Directory | GOOD | `superadmin-business-directory.test.ts` (31 tests, pure logic), `-api.test.ts` (10, route wrapper shape), `-ui.test.ts` (12, source-scan), `-firestore.test.ts` (18, real-emulator — cannot run in this sandbox). |
| Account management (Phase A) | GOOD | Covered inside `superadmin-operational-control-plane.test.ts` (BR-2/BR-3 self-escalation/last-superadmin cases). |
| Business visibility (Phase B) | GOOD | `superadmin-business-visibility.test.ts` (13 tests) + shared coverage in the control-plane suite. |
| Suspend/reactivate (Phase C) | GOOD | `superadmin-business-suspension.test.ts` (19 tests) + `firestore-rules.test.ts`'s own "business suspension — Phase C" block (15 sub-tests, emulator-only, could not run here). |
| Audit center (Phase D) | GOOD | `superadmin-audit-log-query.test.ts` (26 tests, pure logic), `-firestore-query.test.ts` (14, real-emulator — cannot run here). |
| Initial Stock / Business Worth Recovery | GOOD | 76 combined tests across three files; 2 known pre-existing failures (see below). |
| API/server (route wrappers) | PARTIAL | Route handlers in `server/index.ts` itself are never directly tested (cannot be imported) — only the modules they call are. This is a stated, accepted architectural limitation, not an oversight. |
| UI (SuperAdmin app components) | PARTIAL | Source-scan/structural tests only (`-ui.test.ts` files) — no React/DOM behavioral harness exists anywhere in this repository (confirmed, same limitation `periodic-stock-portion-grouping-wiring.test.ts` and others document for the tenant app). |
| Firestore rules (SuperAdmin-relevant) | GOOD, but UNVERIFIED HERE | `firestore-rules.test.ts` covers `platform_operators`, `platform_audit_log`, `platform_event_dedupe`, `platform_worker_state`, business suspension — but is entirely emulator-dependent and could not execute in this sandbox (network fetch to the emulator failed). |
| Integration/emulator | NO COVERAGE IN THIS SESSION | Every emulator-dependent SuperAdmin test (`firestore-rules.test.ts`, `superadmin-business-directory-firestore.test.ts`, `superadmin-audit-log-firestore-query.test.ts`) could not be executed here — this sandbox lacks network access to `storage.googleapis.com`/the Firestore emulator, a limitation those files' own headers already document, not new to this investigation. |

**Source-scan vs. behavioral, explicitly distinguished:**
`superadmin-business-directory-ui.test.ts`,
`superadmin-business-directory-api.test.ts` (partially),
`superadmin-activity-touch.test.ts`, and
`superadmin-assisted-initial-stock-recovery.test.ts` (partially) use
`readFileSync` + regex against the actual source — structural/wiring
proofs, not behavioral execution. The rest (`operatorManagement`,
`businessVisibility`, `businessSuspension`, `auditLogQuery`,
`businessDirectory`'s own logic tests) call the real exported
functions against an in-memory fake `db` — genuine behavioral tests.

**Actually run this session (non-emulator subset, 13 of 15
SuperAdmin-named files):** 244 tests, 242 pass, 2 fail — both in
`superadmin-assisted-initial-stock-recovery.test.ts`
("consumes the Authorization ONLY when the ordinary window is NOT
already eligible" and "the original stockCounts allow update/delete
line is completely unmodified") — pre-existing, unrelated to the core
four phases, not investigated further per this task's audit-only
scope.

---

## 16. Governance/Specification Inventory

Full timeline, oldest to newest, for the capabilities that exist or
were seriously considered:

| Capability | Specified? | Architecturally decided? | Rule 8? | Authorized? | Implemented? | Verified? |
|---|---|---|---|---|---|---|
| Payment Operations V1 | ✅ `18-19-payment-operations-slice.md` | ✅ ADR-0005 | ✅ `18-19-payment-operations-rule8-assessment.md` | ✅ | ✅ | ✅ (per README) |
| Internal Account Mgmt (A) | ✅ `18-superadmin-v1-operational-control-plane-slice.md` | ✅ ADR-0006 | ✅ | ✅ | ✅ | ✅ |
| Business Visibility (B) | ✅ same slice doc | ✅ ADR-0006 | ✅ | ✅ | ✅ | ✅ |
| Suspend/Reactivate (C) | ✅ same slice doc, Gap 1 | ✅ ADR-0006 | ✅ | ✅ | ✅ | ✅ |
| Audit Center Filtering (D) | ✅ same slice doc | ✅ ADR-0006 | ✅ | ✅ | ✅ | ✅ |
| Business Directory (E) | ✅ BDR-0010/POL-18-001 | ✅ | ⚠️ began before gate closed (retrospective) | ⚠️ retrospectively accepted | ✅ | ✅ |
| SuperAdmin-Assisted Initial Stock Recovery | ✅ BDR-0016/POL-0009 | ✅ | ✅ | ✅ | ✅ | ✅ (2 pre-existing test failures) |
| Business Worth Recovery Authorization | ✅ (referenced, same authorization pattern) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SuperAdmin Subscription Operations** | ✅ BDR-0011 | ✅ | N/A (decision was "don't build") | ❌ **explicitly not authorized — "Monitor first"** | ❌ | N/A |
| Tenant Management (broader) | ✅ `18-superadmin.md` (documentation-level) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature Flags | ✅ documentation-level only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Platform Analytics | ✅ documentation-level only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Platform Notifications (admin-facing) | ✅ documentation-level only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Impersonation / Support Session | ✅ considered and rejected (Gap 2, Option B chosen instead) | ✅ (decided against) | N/A | ❌ | ❌ | N/A |
| System Health | ✅ documentation-level only | ❌ | ❌ | ❌ | ❌ | ❌ |

No undocumented idea is treated as authorized anywhere in this table.

---

## 17. Complete Features

- Payment Operations V1 (queue, detail, confirm, reject).
- Internal Account Management (Phase A) — list, provision, revoke,
  with BR-2/BR-3 enforcement.
- Business Visibility (Phase B) — search, justified single-business
  detail read, audited.
- Suspend/Reactivate (Phase C) — full lifecycle, idempotent, doubly
  enforced, tenant-facing UX closed the loop.
- Audit Center Filtering (Phase D) — five combinable filters, 100-row
  cap.
- Business Directory (Phase E) — filter/sort/search/paginate.
- SuperAdmin-Assisted Initial Stock Recovery.
- Business Worth Recovery Authorization.
- Server-side authorization chain (`requireAuth` →
  `requirePlatformOperator` → `requireSuperAdmin`) across every route.

---

## 18. Partially Complete Features

- **Audit Center's action-type filter allowlist** — `KNOWN_ACTION_TYPES`
  in `auditLogQuery.ts` was not updated when the Initial Stock
  Recovery / Business Worth Recovery slices added
  `business_worth_recovery.authorized` and its sibling action types.
  Those events are written and stored correctly, but **cannot be
  filtered by `actionType` in the Audit Trail UI** — attempting to
  would be rejected as `invalid` by `queryAuditLog()`'s own
  validation. Evidence: `KNOWN_ACTION_TYPES` (7 entries, `auditLogQuery.ts`
  lines 48–56) vs. `actionType: 'business_worth_recovery.authorized'`
  (`server/index.ts`, confirmed present near line 2862). Dependency:
  none blocking — a one-line allowlist addition.
- **Account/business relationship inspection** (part of the broader
  §9.12 Internal Account Management vision) — an operator's own row
  exists, but there's no dedicated view of "which businesses/actions
  has this operator touched" beyond manually filtering the Audit Trail
  by `actorUid`. Not broken, just not a first-class feature.

---

## 19. Missing Features

All confirmed **not implemented anywhere in the repository** (no
route, no server module, no UI):

- SuperAdmin dashboard/home overview screen.
- Tenant Management beyond suspend/reactivate (per README's own
  explicit list).
- §9.4 subscription overrides (see §20, BLOCKED — this is the
  BDR-0011 outcome, not a plain gap).
- Feature Flags.
- Platform Analytics.
- Platform-side Notifications management.
- System/operational health screen.
- Operator provisioning by email (only raw uid entry exists).
- Audit log retention/archival policy (no TTL, no deletion mechanism
  found anywhere).
- Pagination for the Audit Trail beyond the fixed 100-row cap
  (documented as a deliberate V1 decision, not silently absent).

---

## 20. Blocked Features

- **SuperAdmin Subscription Operations (BDR-0011).** Not a technical
  blocker — a **governance decision** already made: "Outcome selected
  (Part 14, addendum): B — Monitor first. Not implemented; not
  deferred indefinitely — a defined, evidence-based revisit condition
  governs when this is reconsidered." Any future work here should
  start by reading BDR-0011's own Part 14 revisit condition, not by
  re-litigating the decision.
- **Impersonation / Support Session.** Considered and explicitly
  rejected in Architecture Gap Resolutions (Gap 2) in favor of the
  narrower, already-implemented Business Visibility read model. Not
  "missing" in the ordinary sense — a considered no.

---

## 21. Technical Defects

- **Audit Trail action-type filter is stale relative to what's
  actually written.** See §18 — `KNOWN_ACTION_TYPES` in
  `auditLogQuery.ts` lists 7 action types; at least 2 more
  (`business_worth_recovery.authorized` and its initial-stock-recovery
  counterpart) are written to `platform_audit_log` by later slices but
  cannot be selected in the filter dropdown or passed as a valid
  `actionType` query parameter. The events themselves are correctly
  stored and still visible in an *unfiltered* Audit Trail view — this
  is a filter-completeness defect, not a data-loss or audit-integrity
  defect.
- **Two known pre-existing test failures**, both in
  `superadmin-assisted-initial-stock-recovery.test.ts` — not
  investigated further in this audit-only task per its own explicit
  "do not fix" instruction; flagged for a future dedicated pass.

---

## 22. Concrete Remaining Work

In evidence-supported terms only (no invented requirements):

1. Add the two missing action types to `auditLogQuery.ts`'s
   `KNOWN_ACTION_TYPES` (Technical Defect, §21) — smallest, most
   contained item on this list.
2. Decide whether to add an email→uid lookup to operator provisioning,
   or accept the current raw-uid-entry UX permanently (concrete UX
   gap, §7 — no existing spec currently requires this, so building it
   would be new scope, not a gap-fill).
3. Decide whether Business Search and Business Directory should be
   consolidated, or whether their different capability sets (simple
   lookup vs. full filter/sort/paginate) justify both remaining as
   separate nav items permanently (UX finding, §5/§11 — likewise new
   scope, not a governed gap).
4. Investigate and fix the two pre-existing
   `superadmin-assisted-initial-stock-recovery.test.ts` failures
   (Technical Defect, §21).
5. Define a `platform_audit_log` retention/archival policy — currently
   genuinely undefined anywhere (§10, §19). Whether this needs a
   near-term answer is a governance question outside this
   investigation's scope.
6. Re-attempt the three emulator-dependent SuperAdmin test files
   (`firestore-rules.test.ts`'s SuperAdmin sections,
   `superadmin-business-directory-firestore.test.ts`,
   `superadmin-audit-log-firestore-query.test.ts`) in an environment
   with real Firestore-emulator network access — not a code change,
   an environment/CI gap.

Everything else named in §19 (Tenant Management, Feature Flags,
Platform Analytics, Notifications, System Health) has **no existing
specification, architecture decision, or implementation plan** behind
it — building any of it would be new governance work, not "remaining"
work in the sense this investigation was scoped to find.

---

## 23. Potential Next Steps — NOT YET AUTHORIZED

*(Ideas only. None of these are supported by an existing spec,
architecture decision, or implementation plan — they would each need
their own governance chain from scratch before any implementation.)*

- A SuperAdmin dashboard/home screen summarizing pending payments,
  recent suspensions, and directory activity at a glance.
- Consolidating Business Search into Business Directory (one screen,
  simple-mode vs. filtered-mode) instead of two separate nav items.
- Email-based operator invitation flow.
- A dedicated "what has this operator done" view, built on top of the
  existing Audit Trail data rather than a new data source.
- A defined retention policy for `platform_audit_log`.

---

## 24. Evidence / File References

Server: `server/index.ts`, `server/superadminAuth.ts`,
`server/operatorManagement.ts`, `server/businessVisibility.ts`,
`server/businessSuspension.ts`, `server/auditLogQuery.ts`,
`server/businessDirectory.ts`, `server/platformAuditLog.ts`,
`server/activityTouch.ts`, `server/initialStockRecoveryAuthorization.ts`,
`server/businessWorthRecoveryAuthorization.ts`.

Client: `apps/superadmin/src/App.tsx`,
`apps/superadmin/src/lib/superadminApi.ts`,
`apps/superadmin/src/pages/*.tsx` (all 8 files),
`apps/tenant/src/components/BusinessSuspendedBanner.tsx`,
`apps/tenant/src/context/AppContext.tsx` (`businessSuspended`).

Rules: `firestore.rules` (lines ~77–96 helper functions; ~458–478
`businesses/{businessId}`; ~1846–1937 `platform_*` collections).

Governance: `docs/specs/18-superadmin.md`,
`docs/specs/18-superadmin-business-directory-slice.md`,
`docs/specs/18-superadmin-v1-operational-control-plane-slice.md`,
`docs/specs/BDR-0010-superadmin-business-directory.md`,
`docs/specs/BDR-0011-superadmin-subscription-operations.md`,
`docs/specs/BDR-0016-superadmin-assisted-initial-stock-recovery.md`,
`docs/specs/POL-0009-superadmin-assisted-initial-stock-recovery-policy.md`,
`docs/adr/ADR-0005-superadmin-payment-operations-boundary.md`,
`docs/adr/ADR-0006-superadmin-v1-operational-control-plane.md`,
`docs/engineering/18-superadmin-v1-architecture-gap-resolutions.md`,
`docs/engineering/18-superadmin-business-directory-retrospective-acceptance.md`,
`docs/engineering/18-superadmin-business-directory-closeout.md`,
`docs/specs/README.md` (Module #18 status row).

Tests: all 15 files matching `tests/superadmin-*.test.ts`, plus
`tests/firestore-rules.test.ts`'s SuperAdmin-relevant sections.

---

## 25. Final Governance Status

```
CURRENT SUPERADMIN GOVERNANCE STATE
  — Payment Ops V1, Operational Control Plane (A–D), Business
    Directory (E), Initial Stock/Business Worth Recovery: ACCEPTED,
    AUTHORIZED, IMPLEMENTED, VERIFIED.
  — Subscription Operations: ACCEPTED decision, explicitly NOT
    AUTHORIZED for implementation ("Monitor first").
  — Tenant Management/Feature Flags/Platform Analytics/Notifications/
    System Health: documentation-level only, no architecture decision,
    no Rule 8, no authorization.
        ↓
INVESTIGATION COMPLETE
        ↓
NEXT GOVERNANCE/PLANNING STEP: not proposed by this document — no
implementation plan exists in the repository for any item in §19/§20,
so none is fabricated here. If work proceeds, the smallest, already-
evidenced starting point is the Technical Defect in §21 (Audit Trail
action-type allowlist), which needs no new governance chain since it
is a correction to an already-authorized capability, not a new one.
```

**NO IMPLEMENTATION PERFORMED. NO COMMIT. NO PUSH.**
