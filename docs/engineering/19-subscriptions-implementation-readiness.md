# Module #19 (Subscriptions) — Implementation Readiness Assessment

**Type:** Rule 8 feasibility pass — documentation analysis only.
**Status:** Informational. Does **not** authorize implementation.
**Basis:** [`docs/specs/19-subscriptions.md`](../specs/19-subscriptions.md)
(✅ Accepted) and [`19-subscription-ownership-resolution.md`](../specs/19-subscription-ownership-resolution.md),
cross-checked against the current state of `src/`, `server/`, and
`firestore.rules` as of commit `046d399`.

This assessment identifies scope, what already exists to build on, what is
genuinely greenfield, risks, and which Product decisions block which slice
of work — so that when implementation is separately authorized, Rule 8's
"affected files / plan / risks" step starts from a verified baseline
instead of assumptions.

---

## 1. Implementation Scope (from the Accepted BDS)

Six deliverables, per §19.1–19.7 of the spec:

1. **Data model** — `subscriptions/{subscriptionId}` collection, one doc
   per `businessId`, fields per §19.1.
2. **Trial-at-Registration** — every new Business gets a trial
   subscription doc at creation, no exceptions (Business Rule 4).
3. **Entitlement evaluation / feature-gating framework** — a single read
   path (`entitlements.feature_flags`) other domains consume (§19.5).
4. **SuperAdmin override path** — server-verified, atomically audited
   plan/status override (Business Rule 8, Architecture §9.4).
5. **Background Worker trial/renewal evaluation** — scheduled status
   transitions (`trial → active`, `→ past_due`, `→ suspended`, etc.)
   (§19.4, Architecture §4.8).
6. **Payment webhook integration boundary** — `Payment Processor →
   Webhook → Subscription State Update`, no payment instrument storage
   (§19.7).
7. **Legacy migration** — every existing Business backfilled with an
   explicit non-null status (§19.6).

## 2. What Already Exists (reusable, verified in code)

- **Server auth pattern.** `server/index.ts` has a working `requireAuth`
  middleware (`verifyIdToken`, Bearer-token pattern) already used by five
  `/api/staff/*` endpoints. A SuperAdmin override endpoint
  (`/api/subscriptions/override`, or similar) can follow this exact
  pattern rather than inventing a new one.
- **Tenant-scoped Firestore rule helpers.** `firestore.rules` already
  defines `isMemberOf(businessId)` / `isOwnerOf(businessId)` /
  `isSuspended()` — a `subscriptions/{subscriptionId}` read rule (Admin/
  Manager of that business only) composes from these directly.
- **`MAX_SHOPS_PER_OWNER` location confirmed.** `src/context/AppContext.tsx:249`.
  Untouched by this module per Business Rule 3 — verified no other
  reference exists that this module would need to coordinate with.
- **Batched/transactional writes precedent.** `AppContext.tsx` already
  uses Firestore `writeBatch` for multi-document atomic writes elsewhere
  (e.g. Closings, Purchase Batches) — the same pattern is available for
  the trial-creation write once it's decided where that write lives
  (see Risk 1, below).

## 3. What Is Genuinely Greenfield (verified absent from code)

- **Background Worker: 0% built.** Architecture §4.8 describes it as
  "New" — this is not an overstatement. `package.json` defines exactly
  one runtime process (`"start": "node server.js"`); there is no second
  process, no `Procfile`, no cron dependency, no worker entry file
  anywhere in the repo. Architecture's own phrase "the existing
  single-process worker on Railway is extended" (§13.5) is describing a
  *target state*, not a current one — the worker does not exist yet.
  This is the single largest greenfield line item in this module and
  affects deliverables 2 (trial expiry evaluation) and 5 directly.
- **No `subscriptions` collection, type, or context anywhere** — the BDS
  says this explicitly and code search confirms it (zero matches for
  `subscription` outside the spec files themselves).
- **No webhook endpoint** — `server/index.ts` has no `/api/webhooks/*`
  route of any kind.

## 4. Risk Register

1. **Registration is a non-atomic, multi-step client write today —
   trial creation would become a fourth unguarded step.**
   `AuthView.tsx`'s registration flow (Step 1 Auth → Step 2 `users` doc →
   Step 3 `businesses` doc) is three sequential `try/catch` blocks, not a
   single transaction — a failure after Step 2 already leaves a user
   profile with no business doc today. Business Rule 4 ("no null
   subscription states, ever") is an absolute guarantee; adding
   subscription creation as an uncoordinated Step 4 in the same pattern
   would inherit and extend that existing partial-failure surface rather
   than closing it. This needs an explicit implementation-planning
   decision (batch the writes vs. move business+subscription creation
   server-side) — it is a pre-existing gap this module would make worse
   if not addressed, not something the BDS itself flagged.
2. **Two creation entry points, not one.** Trial creation must fire both
   at first-time Registration (`AuthView.tsx`) *and* at
   `AppContext.addShop` (adding a second/third Business under Owner
   Portfolio, Module #17) — these are two separate code paths today and
   must both be covered or Business Rule 4 breaks silently for
   Owner-Portfolio Businesses specifically.
3. **Background Worker is new shared infrastructure, not a Subscriptions-
   only concern.** Per Architecture §13.5, Notifications (#20) and later
   platform-analytics rollups (#18) are all expected to run on this same
   worker. Building it as part of #19 implicitly makes #19 the module
   that decides the worker's shape (job-type dedupe keys, watermark
   pattern per §4.8.1) for two modules that haven't started
   implementation yet. Worth flagging to the Product Architect as a
   sequencing question, not deciding unilaterally.
4. **Grace-period/transition timing is explicitly undefined.** §19.4
   states `past_due` → `suspended` timing is "Background Worker
   configuration, not fixed by this BDS" but *is* flagged as something
   "the eventual engineering implementation plan must define explicitly...
   before that work begins." This is a real ambiguity (not a
   BDS-expansion candidate) — it blocks Background Worker deliverable 5
   specifically, nothing else.

## 5. What Can Proceed Without the Four Open Payment-Provider Items

The BDS's "Explicitly Left Open" items (plan names/tiers, pricing,
processor vendor, legacy-migration mechanics) block **only** the pieces
that need a concrete plan or a concrete processor. Cross-checking each
deliverable against those four open items:

| Deliverable | Blocked by open items? | Why |
|---|---|---|
| 1. Data model / collection schema | **No** | Schema (§19.1) is processor- and plan-name-agnostic; `planId` is a reference field, not a hardcoded enum. |
| 2. Trial-at-Registration | **No** | Requires *a* trial-length default and *a* minimal Plan doc to reference — not final tier names or pricing. Needs one small Product decision: a placeholder/internal Plan id to ship V1 against (e.g. `plan_trial_v1`), not the real tier catalogue. |
| 3. Entitlement/feature-gating read path | **No** | The read contract (`entitlements.feature_flags`) is fully specified; which features actually gate what is a per-feature decision made elsewhere (§19.5 explicitly defers this), not blocking the framework itself. |
| 4. SuperAdmin override endpoint + audit | **No** | Independent of plan/pricing/processor — it's a state-mutation + audit-log transaction over an already-fully-specified schema. |
| 5. Background Worker trial-expiry evaluation | **Partially** | Trial → past_due transition logic can proceed once grace-period timing (Risk 4) is set by Product Architect — that's a small, scoped decision, not one of the four listed open items. Renewal-date evaluation for *paid* plans has no real data to act on until a processor exists. |
| 6. Payment webhook integration boundary | **Yes** | Genuinely blocked — a webhook shape can be sketched generically per §19.7, but cannot be built against a real processor's payload without vendor selection. |
| 7. Legacy migration | **Yes (mechanics only)** | The *shape* (no null states) is fixed and buildable now; the *exact* migration script/timing needs the still-open `grandfathered` vs. `legacy`-plan choice. |

**Net assessment:** Deliverables 1–4 (data model, trial creation, feature-
gating framework, SuperAdmin override) have no payment-provider
dependency and could be sequenced as a first implementation slice.
Deliverable 5 needs one narrow, scoped decision (grace-period timing) —
not vendor selection. Deliverables 6 and 7 are genuinely gated on the
four open items and shouldn't be scheduled until those are resolved.

## 6. Decisions Needed From the Product Architect Before Any Implementation Go-Ahead

1. Where the trial-subscription write lives architecturally: bundled into
   a batched/transactional Registration + `addShop` write, or moved
   server-side — this is an implementation-pattern question, not a
   business-rule question, but it changes which files are "affected
   files" for Rule 8 (Risk 1).
2. A placeholder V1 Plan id/definition to build the trial-creation and
   entitlement-read paths against, distinct from the still-open real
   tier catalogue (§5, row 2).
3. Grace-period / `past_due` → `suspended` timing (§19.4's own flagged
   gap) — narrow, scoped, needed only for Background Worker deliverable 5.
4. Sequencing call on the Background Worker itself: build the minimal
   version #19 needs now (own it), or treat "generalized Background
   Worker" as a shared-infrastructure task tracked outside any single
   module's implementation plan (Risk 3).

None of the above are business-rule ambiguities requiring a BDS amendment
— they're implementation-planning decisions the BDS itself either left
open on purpose or didn't need to address at the specification level.

---

**No source code, `firestore.rules`, schema, or migration was touched in
producing this assessment.** `src/`, `server/`, and `docs/architecture/*`
are unmodified. This document does not change Module #19's status —
`docs/specs/README.md` and `19-subscriptions.md` remain the source of
truth for that; this is a new, standalone engineering artifact, not an
edit to either.
