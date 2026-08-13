# Rule 8 Assessment — SuperAdmin Payment Operations (V1 Launch Slice)

**Governing spec:** [`18-19-payment-operations-slice.md`](../specs/18-19-payment-operations-slice.md)
(Drafted) implementing [ADR-0005](../adr/ADR-0005-superadmin-payment-operations-boundary.md)
(Approved — architecture decision only).
**Type:** Rule 8 Assessment — Current State → Affected Files → Gap
Analysis → Risks → Implementation Plan, per `CLAUDE.md`'s Rule 8
process. **Planning only. Does not authorize implementation.**
**Scope:** Exactly the nine-item list in the governing spec §1. Nothing
in Module #18 beyond it (Tenant Management, §9.4's override path,
Feature Flags, Platform Analytics, platform Notifications,
Impersonation, System Health, full Internal Account Management) is
assessed or touched.
**Nothing has been modified in `src/`, `server/`, or `firestore.rules`
to produce this document.**

---

## 1. Current State (verified against the actual repository, this
session)

- `server/paymentConfirmation.ts` — implemented, tested
  (`tests/payment-confirmation.test.ts`). Exports `confirmPayment()`
  and `rejectPayment()`, both already idempotent, both already calling
  only `LifecycleApplier.applyLifecycleEvent()` for subscription
  effects. **Zero changes needed to this file's exported behavior.**
- `server/scripts/confirmPayment.ts` — CLI-only entry point, Admin-SDK
  credentials, no role check beyond "has the service account." Not an
  HTTP route. Remains as-is unless a later, separate decision retires
  it (spec §11).
- `server/subscriptionEngine.ts` — implemented, tested (27 tests).
  Untouched by this slice, per BR-1.
- `src/types.ts` — `Payment`, `PaymentStatus`, `PaymentMethod` already
  fully shaped for this slice's needs. `confirmedBy`/`rejectedBy`
  fields already exist as free-text strings; no type change required
  to hold a `platform_operators/{uid}` string instead — that's a
  change in *value*, not *shape*.
- `firestore.rules` — `payments/{paymentId}` block already correctly
  makes the collection client-write-`false` beyond initial creation
  (Owner-only `create`); this slice adds no new client write path to
  it. `platform_audit_log/{eventId}` currently `allow read: if false;
  allow write: if false` for every caller — no `platform_operators`
  concept exists in rules today to grant a scoped read to. No
  `platform_operators/{uid}` match block exists in `firestore.rules`
  at all yet — this collection is entirely new to the rules file.
- `server/index.ts` — has an established, reusable pattern
  (`requireAuth` middleware + a per-feature `verify*Action` function
  that re-reads Firestore for the caller's actual standing) this slice
  can follow directly, not invent from scratch.
- No `apps/` directory exists yet. The repository is currently a
  single Vite SPA (`src/`) + one Express server (`server/`) + no
  monorepo tooling (no `apps/*`, no `packages/*`, no workspace config
  in `package.json`).
- No `platform_operators` document exists in the live database
  (consistent with "Module #18 not started").

## 2. Affected Files (net-new and modified, this slice only)

| File | Change |
|---|---|
| `apps/tenant/*` | **New** — the *existing* `src/`, `server/` content relocated/re-rooted under a `tenant` app boundary. See §5 (Migration Note) — this is the one piece of this slice that touches already-shipped code, and only by relocation, not behavior change. |
| `apps/superadmin/` | **New** — the entire SuperAdmin application: its own `src/`, its own `index.html`, its own Vite entry, its own `vite.config.ts`. Separate build output from `apps/tenant`. |
| `packages/shared-types/` | **New** (or reuse an existing shared package if the migration in §5 already creates one) — `Payment`, `PaymentStatus`, `PaymentMethod`, `Subscription`/`SubscriptionStatus` types, so `apps/superadmin` does not import from `apps/tenant/src/types.ts` directly (that import path is itself a bundling risk — see §6, Risk 3). |
| `server/paymentConfirmation.ts` | **No functional change.** Possibly a comment update noting it is now also called from a privileged HTTP route, not only the CLI script. |
| `server/index.ts` (or a new `server/superadminAuth.ts` alongside it, mirroring how `paymentConfirmation.ts` is its own file) | **New** — `requirePlatformOperator` middleware/function (parallel to `requireAuth` + `verifyStaffManagementAction`'s pattern): re-reads `platform_operators/{callerUid}`, 403s if absent or wrong role. |
| `server/index.ts` | **New routes:** `GET /api/superadmin/payments/pending`, `GET /api/superadmin/payments/:businessId/:paymentId`, `POST /api/superadmin/payments/:businessId/:paymentId/confirm`, `POST /api/superadmin/payments/:businessId/:paymentId/reject`, `GET /api/superadmin/audit-log?actionType=payment.*`. Each wrapped in `requireAuth` + the new `requirePlatformOperator`. |
| `server/platformAuditLog.ts` | **New** — a small, single-purpose helper (`writeAuditLogEntry(db, entry)`), matching `alerting.ts`'s existing "one primitive, reused" convention (`HANDOFF.md`, Fix #8) rather than inlining the write at each call site. Used by the confirm/reject routes; reusable later by any other §9.6-audited action. |
| `firestore.rules` | **New `match /platform_operators/{uid}`** block: `allow read: if request.auth.uid == uid` (an operator can read their own role — needed for the app shell's nav-gating read, §9.1) `; allow write: if false` (provisioning is Admin-SDK-only, §7.4). **Modified `match /platform_audit_log/{eventId}`:** `allow read` changed from unconditionally `false` to scoped-true for a verified `platform_operators/{request.auth.uid}` document existing (exact predicate is an implementation-plan-level rules expression, not fully specified in this document — see §6, Risk 2). `allow write` unchanged (`false` — server/Admin-SDK only). |
| `firestore.indexes.json` | **Possibly new** — a collection-group index on `payments` filtered by `status`, ordered by `submittedAt`, if FR-2's queue query needs one (Firestore collection-group queries with a filter+order commonly require a composite index; confirmed during implementation, not assumed here). |
| `tests/firestore-rules.test.ts` | **Extended** — new cases for `platform_operators` read/write and the changed `platform_audit_log` read rule, following the file's existing per-collection test-group structure. |
| `tests/superadmin-payment-operations.test.ts` | **New** — server-side unit tests for `requirePlatformOperator` and the new routes' request/response shapes, reusing `payment-confirmation.test.ts`'s existing fixtures for the underlying confirm/reject behavior. |
| `docs/specs/18-superadmin.md`, `docs/specs/README.md` | **Updated** — governance step recording that this slice exists and its relationship to the full, still-unauthorized Module #18. |

**No change, confirmed:** `src/context/AppContext.tsx`,
`src/components/*` (tenant UI), any tenant-facing subscription business
rule, `server/subscriptionEngine.ts`.

## 3. Data-Model Changes

- `platform_operators/{uid}` — first real instance of a collection
  Architecture §7.4 already specified but that has never been written
  to. Not a new *design*, a new *population* of an existing design.
- `platform_audit_log/{id}` — same: schema already fixed by §9.6; this
  slice is its first real writer.
- No change to `Payment`, `Subscription`, or any other existing
  document shape.

## 4. Firestore Security (summary; full rule text is an implementation-
plan-level artifact, not written here)

- **New surface:** `platform_operators` self-read (narrow: own `uid`
  only, never a list/scan of other operators from the client — that
  capability, if ever needed for §9.12, is separately gated).
- **New surface:** `platform_audit_log` read, scoped to verified
  platform operators only — a genuine loosening of today's
  unconditional `false`, and therefore the one rules change in this
  slice that most needs its own emulator-verified test coverage before
  merge (Risk 2, below), not just a `tsc`/build-clean check.
- **Unchanged:** every existing tenant-facing rule. This slice adds no
  read/write path reachable by `isOwnerOf`/`isMemberOf`/any tenant
  role — the entire new surface is gated on `platform_operators`
  membership, a structurally separate identity space (§7.4), exactly
  as designed.
- **Unchanged, confirmed:** `payments/{paymentId}`'s existing rule
  block (`allow update: if false; allow delete: if false`) — this
  slice's writes go through the Admin SDK (`server/index.ts`), which
  bypasses client rules entirely, the same guarantee every other
  privileged write in this codebase already relies on.

## 5. Migration Note — `apps/tenant` / `apps/superadmin` restructuring

ADR-0005 and the governing spec require the *existing* application to
live at `apps/tenant`, not just the new SuperAdmin application to be
added at `apps/superadmin`. This is a repository-structure change
touching every existing import path (`src/`, `server/`, build config,
`package.json` scripts, CI) even though it changes **zero application
behavior**. This is a materially larger and riskier piece of work than
the payment-operations feature itself, and is called out here
explicitly rather than folded silently into "add SuperAdmin":

- **Recommended approach:** a workspace/monorepo tool already
  compatible with this repo's existing package manager (the repo has
  both `package-lock.json` and `bun.lock` — which one is authoritative
  is itself worth confirming before choosing a workspace tool) —
  npm/bun workspaces are the minimum viable choice; nothing in this
  slice requires a heavier tool (Nx/Turborepo).
- **Recommended sequence, to keep the higher-risk move isolated from
  the new feature:**
  1. Pure move: `src/` → `apps/tenant/src/`, `server/` →
     `apps/tenant/server/`, config files updated, **zero line of
     application logic changed.** Typecheck, full test suite, and
     build all re-verified green at this checkpoint before anything
     else proceeds — this checkpoint is where a mistake would be
     easiest to introduce and hardest to notice later, precisely
     because "nothing should have changed" is a weak signal to review
     against.
  2. Extract `packages/shared-types` (or confirm it's not needed if
     `apps/superadmin` can vendor a narrow, duplicated type subset
     instead — a legitimate, smaller-footprint alternative worth
     weighing against introducing a new shared package for three
     types).
  3. Scaffold `apps/superadmin` as a new, empty Vite app — build
     succeeds, deploys, shows only a sign-in screen. Checkpoint.
  4. Build FR-1 through FR-9 on top of the scaffold.
- **This step is not optional and not deferrable** — every other item
  in this plan assumes `apps/tenant` / `apps/superadmin` already exist
  as separate build roots, per §9.1/BR-7's non-negotiable requirement.

## 6. Risks

1. **The migration in §5 is the highest-risk part of this entire
   slice**, not the payment-operations feature itself — it touches
   every existing file's location and every build/deploy script, for
   an application already in pilot-customer use (per `HANDOFF.md`).
   Mitigation: the isolated, behavior-frozen checkpoint in §5 step 1,
   verified green before any new feature code is written.
2. **The `platform_audit_log` read-rule loosening (§4) is the one
   genuinely new attack surface this slice opens**, however narrowly
   scoped. Mitigation: emulator-run `firestore.rules` tests
   specifically exercising "non-operator cannot read," not just
   "operator can" — `HANDOFF.md` already flags that this sandbox
   cannot run the Firestore emulator (`storage.googleapis.com` not
   allowlisted), so this verification must happen in an environment
   that can, before merge, not deferred to production observation.
3. **A shared-types package (or its absence) could accidentally
   become a bundling leak** — if `apps/superadmin` ever imports
   anything from `apps/tenant/src/*` directly (even "just a type"),
   a bundler misconfiguration could pull tenant component code into
   the SuperAdmin bundle, or vice versa, silently violating BR-7/NFR-1.
   Mitigation: no cross-app relative imports permitted, enforced by
   either package boundaries (workspace `package.json` `exports`) or
   a lint rule, plus the build-output check NFR-1 already requires.
4. **Collection-group query cost/scale (FR-2).** A collection-group
   scan across every business's `payments` subcollection is fine at
   pilot scale; Architecture §11 (Scalability Strategy) is the right
   place to set a concrete threshold if/when this needs pagination or
   an aggregate rollup instead — flagged, not solved, in this
   assessment.
5. **Break-glass ambiguity (spec §11).** Leaving
   `server/scripts/confirmPayment.ts` in place after this slice ships
   means two live paths can confirm a payment. Not a security risk
   (both still require legitimate credentials of one kind or another)
   but an operational-clarity one — recommend documenting it as
   explicitly break-glass-only in the script's own header once this
   slice ships, as a small follow-up, not blocking this plan.

## 7. Implementation Plan (file/architecture plan — no code yet)

```
apps/
  tenant/                          # relocated, unmodified application
    src/                           # ...current src/, moved as-is
    server/                        # ...current server/, moved as-is
    index.html, vite.config.ts, package.json

  superadmin/                      # NEW — physically separate app (§9.1)
    src/
      main.tsx
      App.tsx                      # shell: reads platform_operators/{uid}
                                    # once at load, gates nav (§9.1)
      pages/
        SignIn.tsx                 # FR-1
        PendingPaymentsQueue.tsx   # FR-2
        PaymentDetail.tsx          # FR-3, FR-4, FR-5, FR-6
        AuditTrail.tsx             # FR-7
      lib/
        superadminApi.ts           # thin fetch wrapper for
                                    # /api/superadmin/* routes
        firebase.ts                # same Firebase project config as
                                    # apps/tenant, separate app init
    index.html
    vite.config.ts
    package.json

packages/
  shared-types/                    # Payment, PaymentStatus,
                                    # PaymentMethod, Subscription,
                                    # SubscriptionStatus — re-exported,
                                    # not redefined, in both apps
    src/index.ts
    package.json

server/                            # remains under apps/tenant/server/
                                    # per the migration note (§5) —
                                    # shown flat here only to name the
                                    # specific file-level changes:
  paymentConfirmation.ts           # UNCHANGED (behavior)
  subscriptionEngine.ts            # UNCHANGED
  platformAuditLog.ts              # NEW — writeAuditLogEntry()
  superadminAuth.ts                # NEW — requirePlatformOperator()
  index.ts                         # MODIFIED — 5 new routes (§2),
                                    # wired to requireAuth +
                                    # requirePlatformOperator +
                                    # paymentConfirmation.ts +
                                    # platformAuditLog.ts

firestore.rules                    # MODIFIED — new platform_operators
                                    # block; platform_audit_log read
                                    # rule narrowed-open
firestore.indexes.json             # POSSIBLY MODIFIED — collection-
                                    # group index for FR-2, confirmed
                                    # during implementation

tests/
  firestore-rules.test.ts          # EXTENDED
  superadmin-payment-operations.test.ts   # NEW
```

**Sequencing within this plan** (each its own commit boundary,
verified typecheck/build/test-green before the next starts, per
`CLAUDE.md`'s session checklist):

1. §5's isolated migration (behavior-frozen checkpoint).
2. `packages/shared-types` extraction.
3. `apps/superadmin` scaffold (sign-in screen only, real
   `platform_operators` check, everything else stubbed/empty).
4. `firestore.rules`: `platform_operators` block + `platform_audit_log`
   read narrowing, with emulator-verified tests (Risk 2) — done before
   step 5 so the server routes below have real rules to build against,
   not a rules change bolted on after the fact.
5. `server/superadminAuth.ts` + `server/platformAuditLog.ts`.
6. The five `/api/superadmin/payments/*` and `/audit-log` routes in
   `server/index.ts`, each calling the unmodified
   `confirmPayment`/`rejectPayment` (BR-1) and the new audit-log
   helper.
7. `apps/superadmin` pages FR-2 through FR-7, wired to the routes from
   step 6.
8. Full test suite (FR-9), including the new rules tests and server
   tests.
9. One-time provisioning of the first real `platform_operators/{uid}`
   record (Admin-SDK script, spec §11 — a small script similar in
   shape to `server/scripts/confirmPayment.ts`, not part of this
   plan's numbered files table above since it's an operational tool,
   not application code).

## 8. What This Assessment Does Not Authorize

Per `CLAUDE.md`'s Rule 8 and this document's own header: reaching
"Assessed" is not authorization to begin Step 1 above. That remains a
separate, explicit Product Architect go-ahead — consistent with how
every other Rule 8 Assessment in this repository (e.g.
`19-v1-payment-path-rule8-assessment-v2.md`) has been treated.
