# Module #19 (Subscriptions) — Implementation Readiness Assessment

**Type:** Rule 8 feasibility pass — documentation analysis only.
**Lifecycle status:** Designed → Accepted → **Readiness Assessed**. Not
Implemented, not Executed, not Analyzed. This assessment does not move
the module's lifecycle state and is not implementation authorization.
**Supersedes:** the prior (v1) version of this same file. No other
document changed.
**Basis:** [`19-subscriptions.md`](../specs/19-subscriptions.md) (✅
Accepted), [`19-subscription-ownership-resolution.md`](../specs/19-subscription-ownership-resolution.md),
cross-checked against [`17-owner-portfolio.md`](../specs/17-owner-portfolio.md),
[`20-notifications.md`](../specs/20-notifications.md),
[`18-superadmin.md`](../specs/18-superadmin.md), and the current state
of `src/`, `server/`, `firestore.rules` (commit `5e34885`).

**Nothing was modified to produce this document.** No code, no
Firestore collection, no security rule, no migration, no `AppContext`/
context file, no billing logic, no payment-provider selection.

---

## 1. Implementation Scope

### A. Core Subscription Domain — potentially buildable before payment decisions

| Item | Spec ref | Payment-provider dependent? |
|---|---|---|
| Subscription state model (`subscriptions/{id}`, `status` enum) | §19.1 | No |
| `businessId` binding (never `uid`) | Business Rule 1 | No |
| Trial lifecycle (creation at Registration, trial dates) | §19.3, Business Rule 4 | No — needs one placeholder Plan id, not real pricing |
| Entitlement evaluation / feature-gating read path | §19.5 | No — contract is provider-agnostic |
| `MAX_SHOPS_PER_OWNER` replacement path (`entitlements.business_limit`) | Business Rule 3, Future Enhancements | No, but **explicitly not V1** per Acceptance — flagged, not scheduled |
| SuperAdmin override endpoint + atomic audit write | Business Rule 8, Architecture §9.4 | No |
| Legacy migration *shape* (no null states) | §19.6 | No — exact script/timing is |

### B. Commercial Integration — dependent on unresolved decisions

| Item | Spec ref | Blocked by |
|---|---|---|
| Payment processor selection & integration | §19.7 | Vendor selection (open item 3) |
| Pricing tiers / plan catalogue | §19.2 | Plan names/pricing (open items 1–2) |
| Billing events / renewal-date evaluation for paid plans | §19.4, Business Rule 6 | Vendor selection — no real renewal data exists without a processor |
| Webhook handling | §19.7 | Vendor selection — payload shape is processor-specific |
| Payment failure handling | Business Rule 6, §19.4 | Vendor selection |
| Legacy migration *mechanics* (exact script, `grandfathered` vs `legacy`-plan choice) | §19.6 | Open item 4 |

**Boundary note:** the split above is a technical-dependency read of the
BDS, not a new scope decision — every item in column A is drawn directly
from a Functional Requirement or Business Rule already Accepted; nothing
here extends the spec.

## 2. Files and Systems Likely Affected (identification only — nothing modified)

**Frontend (`src/`):**
- New: a `Subscription`/entitlement type in `types.ts`; a read surface
  (context or hook) for `entitlements.feature_flags` — no context file
  exists yet for this domain (only `AppContext.tsx`,
  `LanguageContext.tsx` currently exist).
- Likely touched later, not now: `AuthView.tsx` (Registration flow,
  3-step client write, no subscription step today) and
  `AppContext.tsx`'s `addShop` (second creation entry point for
  Owner-Portfolio Businesses) — both are read-only findings in this
  assessment, not proposed edits.
- Any view that will eventually gate a feature (out of this module's
  authority to enumerate — §19.5 is explicit that per-feature gating
  policy belongs to each feature's own spec).

**Backend (`server/index.ts`):**
- A SuperAdmin override endpoint would follow the existing `requireAuth`
  middleware pattern already used by the five `/api/staff/*` routes —
  no new auth pattern needed.
- A webhook receiver endpoint (Commercial Integration, blocked).

**Firestore collections:**
- New top-level `subscriptions/{subscriptionId}` collection (§19.1) —
  does not yet exist.
- No changes to any existing collection's schema.

**Security Rules (`firestore.rules`):**
- A new match block for `subscriptions/{subscriptionId}` would compose
  from existing `isMemberOf(businessId)` / `isOwnerOf(businessId)`
  helpers already defined — read: Admin/Manager of that business +
  SuperAdmin/Developer platform-scoped read; write: server-only (Admin
  SDK bypasses rules, same pattern as `suspended`/`staffTier` today).
- No existing rule needs modification.

**Lifecycle flows:**
- Business Registration (`AuthView.tsx`) — needs a trial-subscription
  creation step.
- `addShop` (`AppContext.tsx`) — needs the same, for Owner-Portfolio's
  second/third Business creation.
- SuperAdmin override — new server-side transactional flow.

**Background Worker dependency:**
- Confirmed **0% built** — no second process, no cron dependency, no
  `Procfile`; `package.json` defines exactly one runtime process
  (`"start": "node server.js"`). Architecture §4.8 describes a target
  state ("the existing single-process worker on Railway is extended"),
  not current reality. Trial/renewal status transitions (§19.4) cannot
  run on a schedule until this exists — this is the largest single
  piece of net-new infrastructure this module touches, and it is shared
  infrastructure (see §3, below), not #19-exclusive.

## 3. Dependency Analysis

- **#17 Owner Portfolio → #19 (one-directional, #17 depends on #19):**
  #17's spec explicitly documents `MAX_SHOPS_PER_OWNER` as "a fixed
  constant today, not a plan-tier limit," and states in its own text
  that replacing it with a Subscription-gated check "is explicitly out
  of scope for this module and belongs to whichever future spec
  implements Module #19." #19's Business Rule 3 confirms the same
  boundary from the other side: `MAX_SHOPS_PER_OWNER` is untouched by
  #19 in V1, wiring is a *future* enhancement. **No conflict — both
  specs agree the constant stays hardcoded for now and neither module
  currently owns building the live check.**
- **#20 Notifications → #19 (one-directional, #20 depends on #19):**
  #20's own spec lists Module #19 as a direct dependency — category-3
  notification types (trial ending, subscription expired) are triggered
  by #19 state changes, and #20 states plainly that "Notifications must
  never become a second, competing subscription-status source" —  #19
  remains the single source of truth for subscription state; #20 only
  reacts to it. Both modules are also specified to share the same
  Background Worker instance (§4.8) — #20's notification-trigger job
  type and #19's status-transition job type are two job types on one
  worker, not two workers.
- **#18 SuperAdmin → #19 (one-directional, #18 depends on #19):**
  #18's Subscriptions & Billing screen (Architecture §9.4) reads
  `subscriptions/{id}` directly and is #19's own specified data source
  — already cross-checked with no contradictions during #18's
  Acceptance review (prior session). #18's override permissions (write
  access) and #19's Business Rule 8 (atomic audit on override) describe
  the same mechanism from each side; consistent, not duplicated.
- **Net dependency shape:** #19 is upstream of #17, #18, and #20 — none
  of the three write to or redefine #19's domain; all three only read
  or react to it. This matches the confirmed build order
  (`#19 → #20 → #18`, with #17 already Accepted independently of #19).
  #19 itself has no upstream module dependency other than the already-
  resolved Ownership Resolution record.

## 4. Open Decisions

### A. Decisions blocking implementation (of specific deliverables)

1. **Payment processor vendor selection** (M-Pesa/e-Mola/other) — blocks
   all of Commercial Integration (§1B).
2. **Plan names, tier structure, and pricing** — blocks the real Plan
   catalogue; does *not* block Core Domain work if a placeholder V1
   Plan id is used instead (see B.1, below).
3. **Legacy migration mechanics** (`grandfathered` vs. `legacy`-plan,
   script, timing) — blocks Deliverable 7 (§19.6) specifically; the
   *shape* (no null states) is already fixed and not blocked.
4. **Where the trial-creation write architecturally lives** — bundled
   into a transactional Registration/`addShop` write, vs. moved
   server-side. Not a business-rule question, but blocks writing an
   accurate Rule 8 "affected files" list for Deliverable 2 until
   answered, since Registration is currently a non-atomic 3-step client
   write (see Risk 1).
5. **Grace-period / `past_due` → `suspended` transition timing** — §19.4
   itself flags this as something "the eventual engineering
   implementation plan must define explicitly... before that work
   begins." Blocks Background Worker status-transition logic only.

### B. Decisions that can remain configurable (not blocking)

1. A placeholder/internal V1 Plan id can be used to build trial creation
   and the entitlement-read path against, entirely independent of the
   real tier catalogue (open item 2) — this is an engineering
   convenience, not a Product decision Claude is making on the Product
   Architect's behalf.
2. Exact trial duration — already specified as "a Plan-level setting,
   read at subscription-creation time" (§19.3); configurable per Plan
   without further Product input.
3. Which specific features carry a gate — explicitly deferred by §19.5
   to each feature's own spec, not decided here or blocking here.
4. Background Worker scan interval (hourly, per Architecture §4.8's own
   example) — an infrastructure-tuning parameter, not a Product
   decision.

## 5. Risk Assessment

- **Tenant isolation:** Low risk, well-covered. `subscriptions/{id}`
  reuses existing `isMemberOf`/`isOwnerOf` rule helpers verbatim — no
  new isolation model needs to be invented, and no cross-Business read
  path is implied anywhere in the spec.
- **Subscription ownership boundaries:** Low risk *if* Business Rule 1/2
  are enforced structurally (schema has no `uid`/owner field to bind to
  by mistake) rather than only by convention — worth confirming at
  actual schema-authoring time, not a concern with the spec itself.
- **Trial migration:** Medium risk. Legacy accounts (§19.6) require a
  one-time backfill touching every existing Business; a partial-failure
  mid-migration would leave some Businesses with a null subscription
  document — directly violating Business Rule 4 ("no null subscription
  states, ever"). This needs an idempotent, resumable migration design
  at implementation-planning time, not resolved here.
- **Entitlement mistakes:** Medium risk, specifically around the
  Business Rule 5 boundary (Business Worth history must never become
  subscription-gated). Because §19.5 leaves *which* features are gated
  to each feature's own spec, the risk is diffuse — a future feature
  spec could, in isolation, propose gating something Business Rule 5
  forbids, without #19's own implementation being at fault. Worth
  flagging as an ongoing review point for every future feature-gating
  proposal, not a defect in #19 itself.
- **Payment boundary mistakes:** Not yet assessable in detail — blocked
  on vendor selection. The one thing already structurally verifiable:
  §19.1's schema has no payment-instrument field, so "accidentally
  storing a card number" is prevented by the data model itself once
  built, not left to code-review discipline alone.
- **Auditability:** Low risk, well-specified. Business Rule 8 requires
  the override + audit-log write to be the same server-side transaction
  — "structurally impossible" to succeed independently, per both #19's
  BDS and Architecture §9.4. This is a hard requirement to satisfy
  technically (single Firestore transaction across two documents) but
  not ambiguous.
- **Registration write-path risk (not in the BDS, found in code):**
  `AuthView.tsx`'s Registration flow is three sequential, independently
  try/caught client writes today (Auth → `users` doc → `businesses`
  doc), not a single transaction — a failure after step 2 already
  leaves an orphaned user profile with no business doc, today,
  independent of #19. Adding trial-subscription creation as an
  uncoordinated fourth step would extend this existing gap rather than
  close it. Flagged as a pre-existing condition this module's
  implementation planning should address, not something #19 introduced.

## 6. Proposed Implementation Sequencing (phases only — not scheduled, not authorized)

**Phase 1 — Subscription foundation.** Data model (§19.1), `businessId`
binding, trial-at-Registration wired into both creation entry points
(Registration + `addShop`), placeholder V1 Plan. No feature actually
gated yet.

**Phase 2 — Entitlement enforcement.** Feature-gating read path (§19.5)
live and consumable by other domains; no domain wired to consume it yet
except as a technical readiness step — actually gating a specific
feature remains that feature's own spec's decision.

**Phase 3 — Payment integration.** Blocked until vendor selection,
pricing, and plan catalogue are decided (§1B). Webhook handler, billing
events, payment-failure handling, renewal-date evaluation.

**Phase 4 — SuperAdmin consumption.** Override endpoint + atomic audit
(could technically move earlier, since it has no payment dependency —
sequenced last here only because #18's own BDS states its runtime
implementation waits on #19 and #20 holding real data first, so there's
no consuming surface for it before then).

Background Worker build-out is a cross-cutting concern spanning Phases
1 and 3 (trial/renewal transitions) and is shared with #20 — its own
sequencing question (build minimal now vs. track as shared
infrastructure) is listed as an open decision (§4.A.4 in the prior
version of this assessment; carried forward as unresolved) and is not
assigned to a specific phase above.

---

## Findings

- Roughly half of #19's scope (Core Subscription Domain) has no payment-
  provider dependency and is technically sequenceable now, pending three
  narrow engineering-planning decisions (§4.A.4, §4.A.5, and a
  placeholder Plan id) — none of which require a BDS amendment.
- The Background Worker is confirmed genuinely greenfield (0% built) and
  is shared infrastructure across #19 and #20, not a #19-only build
  item — worth a Product Architect sequencing call before either module
  is authorized to build it.
- One pre-existing code risk (non-atomic Registration write path) sits
  outside #19's own spec but would be made worse by naive
  implementation of Business Rule 4 if not explicitly addressed in
  implementation planning.

## Blockers

- Commercial Integration (§1B) fully blocked on vendor selection,
  pricing/tier decisions, and legacy-migration mechanics — all four
  "Explicitly Left Open" items from the Accepted BDS remain open; none
  resolved by this assessment.
- Background Worker status-transition logic blocked on grace-period
  timing (§4.A.5) and the worker's own non-existence.

## Recommendation for Product Architect Authorization

This assessment recommends no implementation authorization at this
time — that decision remains yours. If and when you choose to
authorize, the technical dependency structure above supports
authorizing **Phase 1 (Core Subscription Domain) independently of the
four open payment-provider items**, since nothing in Phase 1 touches
them. Phases 3–4 would need their own separate authorization once the
blocking decisions in §4.A are resolved.
