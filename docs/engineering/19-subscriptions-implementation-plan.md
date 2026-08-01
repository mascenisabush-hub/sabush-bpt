# Module #19 (Subscriptions) — Implementation Plan

**Type:** Engineering planning document. Translates the approved
specification into a structured implementation roadmap. **Does not
authorize implementation.**
**Lifecycle status:** Designed → Accepted → Readiness Assessed →
**Planned**. Not Implemented, not Executed, not Analyzed. Reaching
"Planned" is not itself authorization to begin Phase 1 — that remains a
separate, explicit Product Architect decision, per Rule 8.
**Basis:** [`19-subscriptions.md`](../specs/19-subscriptions.md) (v2.0,
✅ Accepted), BDR-0001–0004, POL-19-001–008, the
[Specification Alignment Amendment](../specs/19-specification-alignment-amendment.md),
[Module #19 Implementation Readiness Assessment](./19-subscriptions-implementation-readiness.md)
(commit `96af354`), [Registration & Subscription Creation Architecture
Decision](./registration-subscription-creation-architecture-decision.md)
(commit `c64d306`, Approved), Architecture §4.1, §4.6, §4.8, §4.12,
§6.2, §9.4, §13.5.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`, or
any `docs/specs/*`/`docs/architecture/*` file to produce this document.**

**Note on superseded inputs:** the Implementation Readiness Assessment
above was written before the v2.0 specification rewrite and contains
two now-retired details — trial duration described as "a Plan-level
setting" and a technical status enum including `past_due`/`suspended`/
`canceled`. This plan uses v2.0's actual model (fixed 30-day trial,
`'trial_pending' | 'trial_active' | 'trial_completed' | 'active' |
'grace_period' | 'expired'`) throughout. The Readiness Assessment's
scope split (§1A/§1B), dependency analysis (§3), and risk findings (§5)
otherwise still hold and are reused, not re-derived. Its own file is
unchanged by this plan — flagged here, not silently corrected there.

---

## 1. Purpose

This plan translates the approved Module #19 specification — itself
downstream of BDR-0001–0004 and POL-19-001–008 — into a sequenced,
engineering-actionable roadmap: what gets built, in what order, against
what existing components, with what risks and open questions made
explicit. It is the bridge between "the business rules are settled"
and "here is what Rule 8's affected-files/plan/risks review looks like
when Phase 1 is actually assigned." It does not perform that Rule 8
review itself — each phase still requires its own, at the point it is
authorized.

## 2. Scope

**Included in this plan:** sequencing and dependency structure for the
Core Subscription Domain (data model, trial lifecycle, entitlement
read path, SuperAdmin override, legacy migration) and the Commercial
Integration surface (payment webhook boundary, billing events) as
already scoped by the v2.0 specification's own "Scope" section.

**Excluded from this plan:** invoice/receipt/billing-ledger systems,
Customer Experience Guides (BDR-0004) — both already out of scope for
the specification itself, so also out of scope for planning its
implementation. Also excluded: any decision on plan names, pricing, or
payment-processor vendor (spec's own "Explicitly Left Open," items 1–3)
— this plan sequences around those gaps rather than resolving them.

**Future work, not this plan:** the four items in "Explicitly Left
Open" remain tracked, not decided, here. `MAX_SHOPS_PER_OWNER` becoming
a live entitlement read is explicitly Business Rule 3's *future*
enhancement, not V1 planning.

## 3. Architectural Context

Module #19 is the first module to give a Business a commercial state;
today every Business behaves identically. It sits **upstream** of
Modules #17, #18, and #20 — none of the three write to or redefine its
domain, all three only read or react to it (Readiness Assessment §3,
unchanged).

- **Authentication (§4.6):** subscription checks resolve against the
  already-fixed session/auth model; no new auth mechanism.
- **Business Context:** reads Business Lifecycle state only for the
  State Mapping boundary (spec §"State Mapping") — never writes to it.
- **Multi-Shop (#17):** independent per `businessId`; no Owner/Portfolio
  aggregation (Business Rule 2). `MAX_SHOPS_PER_OWNER` untouched in V1
  (Business Rule 3).
- **SuperAdmin (#18, Architecture §9.4):** #19 supplies the
  `subscriptions/{id}` collection #18's Subscriptions & Billing screen
  already specifies as its data source; override writes are #19's
  Business Rule 8 obligation, not #18's to reimplement.
- **Notifications (#20):** #19 is the single source of subscription
  truth; #20 only reacts to state changes (POL-19-008). Both modules
  share one Background Worker instance (§4.8) as two job types, not two
  workers.
- **Future Billing Integration (§4.12):** integration is a webhook
  boundary only — `Payment Processor → Webhook → Subscription State
  Update` — vendor selection is explicitly out of scope.
- **Customer Experience Guides (BDR-0004):** future, platform-wide,
  not scoped or touched by this module's implementation.

## 4. Existing Components Likely Requiring Modification

Repository-evidence-based, not assumed (spot-checked against current
`main`):

- **`src/types.ts`** — no `Subscription`/entitlement type exists today
  (confirmed: `UserRole` is the only role-adjacent type here). A new
  type would be additive, not a modification of existing types.
- **`src/context/AppContext.tsx`** — no subscription-aware context or
  read surface exists. `addShop` (the second/third-Business creation
  entry point) would need the same trial-creation step Registration
  needs (Registration & Subscription Creation Architecture Decision,
  §10, Future Work — explicitly not yet authorized there either).
- **`src/components/AuthView.tsx`** — confirmed still a three-step,
  non-atomic client sequence (`createUserWithEmailAndPassword` →
  `setDoc(users/{uid})` → `setDoc(businesses/{id})`, both the
  email/password and Google Sign-In paths). This is the component the
  Approved Registration Architecture Decision replaces with server
  orchestration — not modified in place.
- **`server/index.ts`** — a new orchestration endpoint (Auth create →
  business → user profile → subscription, single request, compensating
  rollback) would follow the existing `requireAuth` middleware pattern
  already used by the five `/api/staff/*` routes. No new auth pattern.
- **`firestore.rules`** — no existing rule needs modification; a new
  match block composes from `isMemberOf`/`isOwnerOf`, already defined.
- **Background Worker** — confirmed genuinely 0% built (`package.json`
  defines exactly one runtime process, `node server.js`; no `Procfile`,
  no second process). Architecture §4.8 describes a target state, not
  current reality.

## 5. New Components (planning concepts only)

- **Subscription Repository / read-write access layer** for
  `subscriptions/{businessId}` — the persistence boundary other
  components call through, not called directly.
- **Trial Engine** — owns activation-eligibility evaluation
  (POL-19-001) and duration bookkeeping (POL-19-002). The exact
  technical activation trigger is explicitly not decided by governance
  or the spec (spec's "Explicitly Left Open," item 4) — this component
  is where that decision, once made, would live.
- **Subscription State Manager** — owns the six-state transition logic
  (Business State Model) and the Grace Period / Conversion / Recovery
  transitions (POL-19-004/006/007).
- **Entitlement / Feature-Gating read path** — a provider-agnostic
  contract consumed by other domains; does not itself decide which
  features are gated (spec's own boundary — that's each feature's own
  spec).
- **Subscription Guards** — the "can this Business create a new
  operational record right now" check (spec's "Restricted-Operations
  Enforcement"), one consistent read path rather than a per-domain
  reimplementation.
- **SuperAdmin Override handler** — the atomic override + audit-log
  write (Business Rule 8), a server-side transactional operation.
- **Registration/Onboarding Orchestration endpoint** — already Approved
  architecture (not new-in-this-plan), performing Auth + `users` +
  `businesses` + `subscriptions` as one server-side request with
  compensation on failure.
- **Background Worker job types** — trial/renewal/grace-period
  transition evaluation and businesses-missing-a-subscription
  reconciliation, as job types on the shared Worker (§4.8), not a
  #19-exclusive process.

These are planning-level names for responsibilities the spec already
assigns — not a proposed module/file structure.

## 6. Data Model Impact

- **New collection:** `subscriptions/{subscriptionId}`, one document
  per `businessId` (spec's Engineering Requirements section defines the
  field list — not repeated here as a schema, per this plan's own
  constraint against defining schemas). No `subscriptions` collection
  exists in Firestore today.
- **New state field:** the six-value `status` field is the entire
  technical encoding of the Business State Model — no separate
  "sub-status" or flag field implied anywhere in governance.
- **New timestamps:** trial activation/end, grace-period end, renewal
  date — all already named in the spec, not newly invented here.
- **New audit obligation, not a new collection:** SuperAdmin overrides
  write to the existing platform Audit Log (Architecture §9.6) in the
  same transaction as the subscription write — reuses existing audit
  infrastructure rather than creating a parallel one.
- **No existing collection's schema changes.** `users`, `businesses`,
  and every operational collection are untouched by this module's data
  model.
- **Legacy migration** touches every existing `businesses` document
  once, non-destructively (adds a `subscriptions` document; does not
  modify the `businesses` document itself) — mechanics remain open
  (spec's "Explicitly Left Open," item 6).

## 7. API / Server Impact

The privileged Railway server (not Cloud Functions — Architecture §4.1)
gains responsibility for: orchestrating the Registration/`addShop`
multi-resource write (Approved decision, §6 of that record), receiving
and verifying the billing webhook before any subscription-state write
(spec's Security Considerations — signature verification against the
processor's secret), and handling the SuperAdmin override with atomic
audit logging. No endpoint contracts, payloads, or route paths are
defined here — that is implementation-planning-detail work for each
phase's own Rule 8 pass.

## 8. Client Impact

The client gains awareness of subscription state for: presenting
current plan/trial/expiry status to Admin and Manager (spec's "Users"
section — Manager is view-only), read-only presentation once a Business
is in `trial_completed` or `expired` (historical data remains visible,
new-record creation UI is suspended), and surfacing SuperAdmin's
override view (Architecture §9.4, not redesigned by this module). No
specific banner, prompt, or screen layout is designed here — that is
Design System / Component Library work at implementation time, out of
this plan's scope.

## 9. State Management

Application behavior is expected to read `subscriptions/{businessId}
.status` as the single source of truth for "can this Business create a
new operational record right now" (spec's Restricted-Operations
Enforcement) — a single, consistent read path rather than per-domain
reimplementation. Business Lifecycle state and Subscription Status
remain structurally independent (State Mapping) — no component may
infer one from the other. This plan does not define the specific hook,
context, or caching mechanism that read path would use.

## 10. Integration Dependencies

- **Module #17 (Owner Portfolio):** one-directional, #17 depends on
  #19 only for a *future* `MAX_SHOPS_PER_OWNER` entitlement wiring —
  not V1. No conflict; both specs already agree the constant stays
  hardcoded for now (Readiness Assessment §3, unchanged).
- **Module #18 (SuperAdmin):** depends on #19 holding real data before
  its own runtime implementation begins (`docs/specs/README.md`'s
  settled build order, `#19 → #20 → #18`) — this plan does not change
  that ordering.
- **Module #20 (Notifications):** depends on #19 as its single source
  of subscription-state truth; shares the Background Worker instance.
- **Authentication:** existing session/auth model, unmodified.
- **Business Context:** read-only dependency for State Mapping.
- **Future billing providers:** vendor selection is an open Product
  decision (spec's "Explicitly Left Open," item 3) — Commercial
  Integration work is blocked on it, Core Domain work is not.
- **Future notification engine:** #20's own implementation, not #19's
  — #19 only needs to emit the state changes #20 will eventually react
  to.

## 11. Risks

Carried forward from the Readiness Assessment §5 (still accurate
against current code), restated at planning level:

- **Trial migration (medium):** legacy backfill touching every existing
  Business needs an idempotent, resumable design — a partial failure
  mid-migration would violate Business Rule 4 ("no null subscription
  states, ever").
- **Entitlement/Business-Rule-5 boundary (medium, diffuse):** because
  which features are gated is left to each feature's own spec, a future
  feature spec could propose gating something Business Rule 5 forbids
  (Business Worth history must never become subscription-gated) without
  #19's own implementation being at fault — an ongoing review point,
  not a defect in this module.
- **Payment boundary (not yet assessable):** blocked on vendor
  selection; structurally mitigated in advance by the data model having
  no payment-instrument field at all.
- **Registration atomicity (identified, now architecturally resolved
  but not yet implemented):** the Approved Registration & Subscription
  Creation Architecture Decision closes this gap on paper (server
  orchestration + Worker reconciliation) — the risk shifts from
  "unresolved architecture" to "approved architecture not yet built,"
  which is itself Phase 1's first engineering task, not a remaining
  open question.
- **Background Worker non-existence (shared infrastructure risk):**
  0% built; required for scheduled trial/renewal/grace transitions and
  for reconciliation safety-net coverage. A Product Architect
  sequencing call on when to build it (tracked as shared with #20,
  not #19-exclusive) remains open.
- **Governance-stack/spec drift (new, this plan's own finding):**
  `docs/specs/README.md` does not yet index the v2.0 spec, the four
  BDRs, or the eight POLs — a documentation-sync gap already flagged in
  a prior session, unaffected by and not resolved by this plan.

## 12. Testing Strategy

- **Unit testing:** Trial Engine duration/activation-eligibility logic,
  Subscription State Manager transition rules (all six states),
  entitlement-read contract.
- **Integration testing:** server orchestration endpoint (Auth +
  Firestore multi-write with compensation), SuperAdmin override +
  atomic audit write, webhook signature verification.
- **Migration testing:** legacy backfill idempotency — re-running the
  migration against an already-migrated Business must be a no-op, not
  a duplicate or corrupted record.
- **State transition testing:** every governance-approved transition
  (Trial Pending → Trial Active → Trial Completed; Active → Grace
  Period → Expired or back to Active; Conversion; Recovery) plus every
  transition governance does **not** approve (e.g., no direct Trial
  Pending → Expired) as a negative test.
- **Firestore rules emulator testing:** extends the existing
  `tests/firestore-rules.test.ts` suite (16 `describe` blocks today,
  per the tenant isolation audit) with a `subscriptions` collection
  block — tenant isolation, SuperAdmin/Developer read scope, server-only
  write enforcement.
- **Manual validation:** end-to-end Registration → Trial Pending record
  → (once Trial Engine exists) activation → expiry read-only behavior,
  run against the real Firebase environment this sandbox cannot reach.

## 13. Phased Implementation

Adjusted from the Readiness Assessment's proposed sequencing (§6 there)
based on repository evidence gathered since — specifically, the now-
Approved Registration Architecture Decision and POL-19-002's resolution
of the trial-duration blocker:

**Phase 1 — Foundations.** `subscriptions/{businessId}` data model,
`firestore.rules` match block, the server-side Registration/`addShop`
orchestration endpoint (Approved architecture, not yet built), a
placeholder V1 Plan id. Produces a `Trial Pending` record for every new
Business at creation. No feature gated yet, no activation logic yet.

**Phase 2 — Trial Management.** Trial Engine (activation trigger,
30-day duration, expiry → Read-Only transition), Subscription Guards
(restricted-operations read path), client-side read-only presentation.
Requires the technical activation-trigger decision (spec's "Explicitly
Left Open," item 4) before this phase can be fully specified — this
plan does not make that decision.

**Phase 3 — Subscription Lifecycle.** Grace Period, Conversion,
Recovery state transitions; Subscription State Manager complete across
all six states.

**Phase 4 — SuperAdmin Consumption.** Override endpoint + atomic audit
write. Technically independent of payment integration, sequenced here
because #18's own runtime implementation waits on #19/#20 holding real
data — no consuming surface exists before then.

**Phase 5 — Commercial Integration.** Blocked until vendor selection,
pricing, and plan catalogue are decided (spec's "Explicitly Left Open,"
items 1–3). Webhook handler, billing events, payment-failure handling,
renewal-date evaluation against a real processor.

**Phase 6 — Notification Integration.** Wires POL-19-008's business
principles into Module #20's "Subscription Notifications" category —
sequenced after #20 exists, per the settled `#19 → #20 → #18` build
order; not #19's own implementation to build.

**Background Worker build-out** is cross-cutting across Phases 1–3 and
shared with #20 — not assigned to a single phase, per the Readiness
Assessment's own finding, unchanged here.

## 14. Rule 8 Assessment

**Affected repository areas** (Phase 1 only, since later phases are not
yet actionable): `src/types.ts` (additive), `src/context/AppContext.tsx`
(`addShop`), `src/components/AuthView.tsx` (replaced by server
orchestration, not edited in place), `server/index.ts` (new
orchestration endpoint), `firestore.rules` (new match block), no
existing collection schema.

**Implementation readiness:** Phase 1's architecture is fully resolved
on paper — data model shape (spec), orchestration pattern (Approved
Registration Decision), rules pattern (existing `isMemberOf`/
`isOwnerOf` helpers, no new isolation model needed). What remains
unresolved is engineering-planning detail, not open Product/Business
decisions: the Registration Architecture Decision's own §9 leaves exact
rollback mechanics (e.g., whether an Auth-user-created-but-Firestore-
failed case triggers immediate Auth-user deletion vs. Worker-only
cleanup) as "an implementation-planning detail, not decided here" —
this plan does not resolve it either; it would be Phase 1's own
implementation task.

**Remaining blockers:**
- No blocker for Phase 1 from open Product decisions — trial duration
  (previously flagged as blocking in the Registration Decision's §9) is
  now resolved by POL-19-002, superseding that note.
- Phase 2 is blocked on the trial-activation technical trigger
  (spec item 4) until that is decided.
- Phases 3–6 carry their own dependencies as described in §13, above.
- No phase is authorized to begin by this document.

## 15. Recommendation

**Ready after minor preparation** — specifically for Phase 1
(Foundations) only.

Supporting evidence: every architectural question Phase 1 depends on is
already Approved (Registration & Subscription Creation Architecture
Decision) or Accepted (the v2.0 specification itself, including the
data model, rules pattern, and legacy-migration shape). No open
Product/Business decision blocks Phase 1 specifically — the four
"Explicitly Left Open" items all sit in Phase 2 (activation trigger) or
Phase 5 (vendor/pricing), not Phase 1. The one remaining gap is the
Registration Decision's own explicitly-unresolved rollback-mechanics
detail (§9 of that record) — an engineering-planning-level decision,
not a Product one, and the "minor preparation" this recommendation
refers to.

Phases 2–6 are **not ready** — each has its own explicit blocker
(activation trigger; vendor/pricing/legacy-migration mechanics; #20/#18
existing) documented above and is not assessed as ready by this plan.

This recommendation is not authorization. Per Rule 8, Phase 1 still
requires its own separate, explicit go-ahead — including a fresh
affected-files/plan/risks pass at the point it is actually assigned,
since code may have changed between this plan and that assignment.

---

## Deliverables Summary

1. **File created:** `docs/engineering/19-subscriptions-implementation-plan.md`
   (this document). No other file modified.
2. **Location rationale:** matches existing convention — module-prefixed
   (`19-`), living alongside `19-subscriptions-implementation-readiness.md`
   in `docs/engineering/`, using the `-implementation-plan` suffix
   already established by `phase0-owner-admin-migration-implementation-plan.md`.
3. **No implementation has begun.** No `src/`, `server/`,
   `firestore.rules`, or `docs/specs/*` file was touched.
4. **Proposed phases:** Foundations → Trial Management → Subscription
   Lifecycle → SuperAdmin Consumption → Commercial Integration →
   Notification Integration (§13).
5. **Highest-priority engineering tasks:** (a) build the Approved
   Registration/`addShop` server-orchestration endpoint, (b) define the
   `subscriptions` Firestore rules match block, (c) resolve the
   orchestration endpoint's rollback-mechanics detail (Registration
   Decision §9) — all three are Phase 1 scope.
6. **Blockers found:** none new for Phase 1. Phase 2 is blocked on the
   trial-activation technical trigger; Phase 5 is blocked on vendor/
   pricing decisions; a documentation-sync gap (`docs/specs/README.md`
   not indexing the v2.0 spec/BDRs/POLs) was noted but is unrelated to
   implementation readiness.
7. **Module #19 readiness for Phase 1 engineering:** Ready after minor
   preparation (§15) — architecturally clear, pending explicit
   authorization and the one named engineering-planning detail.
8. Waiting for Product Architect approval before any implementation
   work begins.
