# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** SuperAdmin V1 — both authorized slices are implemented, tested,
deployed, and production-verified. **Nothing mid-flight; working tree
clean.**

**Slice 1 — Payment Operations V1 Launch Slice** (ADR-0005,
`docs/specs/18-19-payment-operations-slice.md`). Implemented across
checkpoints `7c11ad0`..`15154c8`. Replaces the CLI-only
`server/scripts/confirmPayment.ts` as the primary way an operator
confirms/rejects a customer's manually-submitted payment, without
touching the existing, unmodified Module #19 payment/subscription
engine.

**Slice 2 — SuperAdmin V1 Operational Control Plane** (ADR-0006,
`docs/specs/18-superadmin-v1-operational-control-plane-slice.md`). Four
phases, all implemented and deployed:

1. **Internal Account Management** (`8a8c5ce`) — provision/revoke
   `platform_operators` records in-app; self-escalation and
   last-SuperAdmin lockout enforced server-side; `server/operatorManagement.ts`.
2. **Business Visibility** (`1d8442e`) — audited, justification-gated
   business lookup; `server/businessVisibility.ts`; owner email
   exposed only in single-business detail, never in search results.
3. **Business Suspend/Reactivate** (`3333fb5`, real-defect fix
   `65acf8a`→`b40d685`, Rules-emulator PASS recorded `0a35132`) —
   `businesses/{businessId}.suspended`, `isBusinessSuspended()` folded
   into `isMemberOf()`, `server/businessSuspension.ts`. **A real
   production defect was found and fixed here**: the first version of
   `isBusinessSuspended()` threw on a missing business document
   (`get()` fails outright on a nonexistent path — not merely returns
   null); the corrected version guards with `exists()` first, matching
   `hasSubscription()`'s already-proven pattern. Confirmed via a real
   Firestore emulator run: 119 tests, 28 suites, 0 failures.
4. **Audit Center Filtering** (`0e774ff`) — `server/auditLogQuery.ts`,
   filterable by business/actor/action-type/date-range, all
   combinable; 7 new composite indexes in `firestore.indexes.json`.
   Query-verified against a real Firestore engine: 14/14 passing
   (`tests/superadmin-audit-log-firestore-query.test.ts`, commit
   `b3a78ed`).

**Production deployment — completed and independently verified, not
assumed:**
- `firestore.rules` deployed to `sabush-bpt`, confirmed live via
  Firebase Console (the corrected `isBusinessSuspended()` visible in
  the published ruleset).
- `firestore.indexes.json`'s 7 new `platform_audit_log` composite
  indexes deployed; all 7 confirmed `Enabled` in Console (not just
  "deploy command succeeded" — build status checked separately, since
  a successful deploy does not mean immediately queryable).
- Railway (`sabush-bpt-superadmin` service) confirmed running this
  exact code — verified via the deployed commit's message matching
  `b3a78ed` exactly in Railway's own deployment metadata, not inferred
  from GitHub sync status.
- **Real production browser verification performed** (not source-code
  inspection, not automated tests): suspended a real test business via
  SuperAdmin → confirmed the tenant-side suspension banner and blocked
  writes ("Missing or insufficient permissions") → confirmed the
  `business.suspended` audit entry → reactivated → confirmed recovery
  (a write succeeded immediately after) → confirmed the
  `business.reactivated` audit entry. No stop-condition failures.

**Known, non-blocking open items:**
- `docs/specs/README.md` and this file were both stale on SuperAdmin's
  actual status until this update — corrected now; watch for the same
  drift recurring after future phases.
- A same-tab business-switch UX observation surfaced during production
  testing (dashboard figures didn't refresh without a hard reload when
  switching businesses via the in-app switcher) — code review of the
  reactive chain (`switchShop()` → live `users/{uid}` listener →
  `activeBusinessId`-keyed effect) found nothing wrong on paper;
  unresolved, needs its own dedicated investigation, not blocking.
- `npm audit`: 14 vulnerabilities (11 moderate, 3 high) in `xlsx`
  (SheetJS), no upstream fix available. Confirmed via code inspection:
  used only to *generate* Excel exports from trusted internal data,
  never to *parse* untrusted input — both known CVEs are parse-time
  vulnerabilities, so real exploitability is low, but tracked, not
  dismissed.
- **Module #18 Phase E (Business Directory) — CLOSED.** Implemented
  across checkpoints `542d53f`..`933ee85`; retrospectively accepted
  into the governed baseline via `18-superadmin-business-directory-retrospective-acceptance.md`
  (implementation began before the required Rule 8/Authorization gates
  completed — that historical fact is preserved as written, not
  erased); verified (81 non-emulator tests + 18/18 emulator tests) and
  confirmed live via direct production behavioral verification
  (`adminbpt.sabushtech.com`'s "Directório" page). Full record:
  `docs/engineering/18-superadmin-business-directory-closeout.md`.

## Prior status — Fix #8 (Production Observability) — superseded above, kept for continuity

**Objective:** answer one question — "if something important breaks
for a pilot customer, will SABUSH know about it and have enough
information to diagnose it?" — with the smallest change that does so.
Deliberately NOT an observability platform: no Sentry/Datadog/etc., no
analytics, no dashboards, no per-request telemetry pipeline.

**What shipped:**

- `server/alerting.ts` (new) — the one alerting primitive.
  `reportCriticalFailure(tag, message, meta)` always logs in the exact
  structured shape every other module already uses
  (`console.error('[tag] message', meta)`, so Railway's existing log
  ingestion is unaffected), and additionally POSTs `{ text: ... }` to
  `ALERT_WEBHOOK_URL` if that env var is set (any Slack- or
  Discord-compatible incoming webhook — zero new npm dependency, uses
  Node's global `fetch`). Unset → pure no-op, zero deploy risk. A
  per-failure-signature cooldown (`ALERT_COOLDOWN_MS`, default 15 min)
  stops a repeatedly-failing job from paging on every tick.
- Wired into the **4 confirmed swallowed sweep-level query failures**
  (`trialNotificationProducer.ts`, `closingNotificationProducer.ts`,
  `breakageNotificationProducer.ts`, `subscriptionEngine.ts`'s
  grace-period sweep) — each previously caught its top-level Firestore
  query error, logged it, and `return`ed with nothing upstream ever
  told the whole sweep produced nothing that cycle.
  `subscriptionEngine.ts` uses the same direct
  `import { reportCriticalFailure } from './alerting'` as the other
  three producers — no injected callback, no new dependency-inversion
  layer; its file-local, dependency-free-of-other-modules convention
  (documented in its own header) is unchanged.
- `backgroundWorker.ts`'s single job-run-failed catch — one generic
  wiring point covering any registered job's `execute()` throwing,
  current or future.
- `server/index.ts`: `process.on('uncaughtException')` (alerts, then
  `exit(1)` so Railway restarts cleanly) and `process.on(
  'unhandledRejection')` (alerts only, matches this codebase's
  existing per-failure isolation principle); a final 4-arg Express
  error-handling middleware as a backstop only — no existing
  route-level try/catch touched, so expected `401`/`403` auth
  rejections are unaffected and do not generate alert noise.
- `POST /api/client-error` (new endpoint, unauthenticated by design —
  a crash can happen before a session exists) — a fixed relay into
  `reportCriticalFailure`, not a generic proxy: it accepts no
  destination/URL/header from the caller, every field is length-capped
  before touching a log line, and nothing is persisted to Firestore.
- Client: `src/components/ErrorBoundary.tsx` (new) wraps `<App/>` in
  `src/main.tsx`; `window.addEventListener('error'/'unhandledrejection'
  , ...)` also added in `main.tsx` for the two crash classes a React
  Error Boundary structurally can't catch. Both report through
  `src/lib/reportClientError.ts` (new) — `sendBeacon`-based, capped at
  5 reports per browser session, never throws.
- `.env.example` documents `ALERT_WEBHOOK_URL` / `ALERT_COOLDOWN_MS`.

**Explicitly NOT part of this fix, by design:** no deliberate
test-alert HTTP trigger/endpoint exists — testing the alert path is a
controlled, manual, out-of-band step (e.g. configure
`ALERT_WEBHOOK_URL` against a real webhook and cause one of the wired
failures deliberately), not a shipped production endpoint.

**Verification, this session:**

- `npx tsc --noEmit -p .` — clean.
- `npm run test:all` — **15 suites, 262/262 passing, 0 failed, 0
  skipped.**
- `npm run build` — clean; only pre-existing, unrelated warnings (a
  CSS dangling-combinator notice and a >500kB chunk-size notice) —
  neither touches any file this fix changed.
- `git diff --check` — clean, no whitespace errors.
- Firestore emulator (`test:rules:emulator`) — attempted fresh,
  **ENVIRONMENT-BLOCKED**: `403: Host not in allowlist:
  storage.googleapis.com`, the same standing sandbox limitation named
  in prior sessions. Not claimed as passing. The non-emulator
  `test:rules` (pure logic, no live Firestore) already ran clean as
  part of `test:all`, and this fix touches no `firestore.rules` or
  `firestore.indexes.json` content at all.
- Diff audited file-by-file: no secrets/tokens/webhook URLs/PINs
  committed (`.env.example`'s webhook line is a placeholder,
  `XXX/YYY/ZZZ`, commented out); `package-lock.json`/`bun.lock`
  unchanged (a local `npm install` only populated the gitignored
  `node_modules/`); no Firestore rules/indexes changed; no production
  data touched; no unrelated refactoring.

**Production configuration remaining, explicitly:**
`ALERT_WEBHOOK_URL` must still be configured in the production
environment before external alerts become operational. Implementation
being complete and tested does **not** mean production alerting is
active — every alert path degrades to "logged to stdout only" (exactly
today's pre-Fix-#8 behavior) until that env var is set on Railway, and
a controlled test of the live path (deliberately triggering one of the
wired failures against a real webhook) is a separate, not-yet-done
operational step.

**Next actionable item:** configure `ALERT_WEBHOOK_URL` in the
production Railway environment, then perform one controlled real-world
test of the alert path (e.g. temporarily point a test webhook at it and
trigger a known sweep/job failure) before relying on it for a real
pilot-customer incident.

## Prior status — Module #4 Multi-Supplier Purchase Event amendment (superseded above, kept for continuity)

**Status:** Module #4 (Purchase Batches) — **Multi-Supplier Purchase
Event amendment: IMPLEMENTED, TESTED, VERIFIED, AND CLOSED.** All 7
phases of the approved Implementation Plan are complete, committed,
and pushed to `main`. Nothing is mid-flight.

**Phase status:**

| Phase | Status |
|---|---|
| Phase 1 — Types | ✅ COMPLETED |
| Phase 2 — AppContext (finalization + carry-forward) | ✅ COMPLETED |
| Phase 3 — Add Stock UI ("Add Another Supplier") | ✅ COMPLETED |
| Phase 4 — Investment Ledger grouping | ✅ COMPLETED |
| Phase 5 — Firestore security rules | ✅ COMPLETED |
| Phase 6 — Regression tests | ✅ COMPLETED |
| Phase 7 — Final closure | ✅ COMPLETED (this entry) |

**What shipped, briefly** (full detail in each phase's own commit —
`git log` — and in the "Prior status" section below, kept for
continuity):

- **Model D**: an optional `purchaseEventId?: string` correlation
  field on `PurchaseBatch` and `PurchaseDraft` — **no new Firestore
  collection.** `PurchaseBatch`'s own meaning (one supplier's
  delivery) is unchanged.
- `attachPurchaseEventId` — retroactively tags an already-finalized
  `PurchaseBatch`, reusing the existing, unmodified `purchaseBatches`
  update rule.
- The "Adicionar Outro Fornecedor a Esta Compra" action on Add Stock's
  success screen — the only place a correlation is ever started
  (lazy, explicit-click-only, never a default). Deliberately designed
  around two code-discovered findings: Staff never unmount on the
  same-tab route after a submit, and `submittedMessage` was never
  otherwise reset for them — so this action performs a true in-place
  local reset and cancels the pre-existing auto-redirect timeout,
  never depending on `onComplete()`/tab navigation.
- An opt-in "Agrupar por Evento de Compra" view in the Investment
  Ledger — aggregate investment/market-value/embedded-profit summed
  from already-computed `PurchaseBatchSummary` figures (no new
  calculation function), with an ungrouped fallback for every
  historical `PurchaseBatch`.
- `firestore.rules`' `purchaseBatches` create rule validates
  `purchaseEventId`'s shape additively, mirroring the existing
  `supplierId` check.

**Verification, fresh, this session:**

- Governance re-read directly from the repo (amendment, Rule 8
  Assessment, Implementation Plan, spec #4, `docs/specs/README.md`) —
  no drift found between what's documented and what's implemented;
  all six phases confirmed present in actual code, not just claimed
  (`grep` against `types.ts`, `AppContext.tsx`, `AddStockView.tsx`,
  `StocksView.tsx`, `purchaseBatchCalculations.ts`, `firestore.rules`,
  and both test files).
- `npm run test:all` — **13 suites, 243/243 passing, 0 failed, 0
  skipped.**
- `npx tsc --noEmit -p .` — clean.
- `npm run build` — clean; only pre-existing, unrelated warnings
  (chunk size, dynamic-import overlap) — none introduced by this
  amendment, none touched.
- Firestore emulator — attempted fresh, **ENVIRONMENT-BLOCKED**:
  `403: Host not in allowlist: storage.googleapis.com`. Not claimed as
  passing. Rules were statically/security-reviewed instead (Phase 5's
  own commit, reconfirmed here) — this is the same standing sandbox
  limitation named in every session since this repository's first
  `firestore.rules` change.

**Security/data integrity, explicitly confirmed:** no migration or
historical backfill performed; no new Firestore collection introduced;
no payment/credit/debt logic anywhere; `PurchaseBatch.supplier`
semantics unchanged; `purchaseDrafts` ownership/concurrency model
unchanged; tenant isolation unchanged; `calculateBatch`,
`calculateInventoryTotals`, `calculatePurchaseBatchSummary` — zero
new reads, zero formula changes; `purchaseEventId` remains fully
optional everywhere; malformed values are rejected by the Phase 5
create-rule shape check; every legacy `PurchaseBatch` without
`purchaseEventId` continues to load, calculate, and display exactly
as before.

**Open, separate item — NOT part of this amendment, discovered
live in production, not yet resolved:** a live "Missing or
insufficient permissions" error was reported on `bpt.sabushtech.com`
when using Add Stock. Investigation (this session, in-conversation,
not yet a repo artifact) found no defect in this repository's own
`firestore.rules` — the most likely cause is that the **live Firebase
project's deployed rules are stale**, predating the `suppliers`/
`purchaseDrafts` collections entirely: this repository has **no
automated `firestore.rules`/`firestore.indexes.json` deployment step**
(confirmed absent — no `.firebaserc`, no deploy script in
`package.json` or CI), a gap already flagged once before in
`docs/engineering/19-v1-completion-review-and-release-readiness-audit.md`
§3c and never resolved. **Action needed, outside this repository:**
someone with Firebase CLI access must run
`firebase deploy --only firestore:rules` against current `HEAD`.
Explicitly deferred by direct instruction — not investigated further
or fixed as part of this Phase 7 closure.

**Next actionable item:** the live rules-deployment gap above is the
most concrete, real next step whenever picked up. At the governance
layer, nothing further is queued for Module #4 — the excluded
payment/credit/supplier-debt track (first amendment's Part 11) remains
a separate, not-yet-started future decision, unrelated to this closure.

## Prior status — Module #4 Durable Purchase Capture implementation + undefined-field bug fix (superseded above, kept for continuity)

Governance sequence completed and pushed to `main` across three prior
sessions, in order: (1) investigation-only pass tracing the current Add
Stock flow, supplier handling, persistence behavior, and valuation
calculations; (2) the formal
[`04-durable-purchase-capture-and-suppliers-amendment.md`](./docs/specs/04-durable-purchase-capture-and-suppliers-amendment.md)
(✅ Approved — business specification), with `docs/specs/04-purchase-batches.md`
bumped to Version 1.1 and `docs/specs/README.md` updated; (3) the
[Rule 8 Assessment](./docs/engineering/04-durable-purchase-capture-and-suppliers-rule8-assessment.md)
(Governance Readiness: Ready) and
[Implementation Plan](./docs/engineering/04-durable-purchase-capture-and-suppliers-implementation-plan.md),
resolving both decisions implementation needed: draft concurrency (one
`PurchaseDraft` per `(businessId, uid)`, keyed by the owning user's own
Firebase Auth `uid`) and access/permissions (reuses Module #16's
existing Staff/Manager/Owner model verbatim, no new tier). All commits
pushed; `git log` on `main`: `c70adad` (Rule 8 + plan), `96b3bd2`
(amendment). Explicitly excludes all payment/cash/credit/supplier-debt/
accounts-payable capability — a separate, not-yet-started governance
track per the amendment's Part 11.

## Prior status — Module #10 Initial Stock Valuation History implementation (superseded above, kept for continuity)
  the Worth-First Scope Test question the original investigation
  flagged as genuinely open (does supplier-payable tracking cross into
  the ERP/accounts-payable territory Architecture 1.8/2.2 excludes).

## Prior status — Module #10 Initial Stock Valuation History implementation (superseded above, kept for continuity)

**Status:** Module #10 (Stock Counts) — **new feature, narrow scope**:
Initial Stock Valuation History / Price Change Events, implemented and
verified this session per an explicit task prompt ("Initial Stock
Valuation History / Price Change Events"). Followed this repo's own
precedent (the sellingPrice addition below, implemented off a task
prompt and flagged afterward): implemented narrowly, flagging a formal
BDS amendment as still owed.

> **Update, from the governance session directly above:** the formal
> amendment flagged as owed by this section (open item #1, below) is
> now closed — see
> [`10-initial-stock-valuation-history-amendment.md`](./docs/specs/10-initial-stock-valuation-history-amendment.md).
> Open items #2 (Firestore emulator) and #3 (Expected Current Stock
> Value wiring) remain open exactly as stated below — the governance
> session did not change either.

**What this feature is:** lets the Owner record a price change affecting
units still remaining from the original Initial Stock, WITHOUT editing
that Initial Stock record — the confirmed `'initial'` StockCount and
`initialCapitalValue` remain exactly as immutable as before. Each price
change is a separate, permanent, auditable event.

**What changed:**

1. **New type `InitialStockPriceChangeEvent`** (`src/types.ts`):
   `id, businessId, productId, productName, effectiveDate,
   quantityRemaining, previousCostPrice, previousSellingPrice,
   newCostPrice, newSellingPrice, reason?, createdAt, createdBy`.
   `quantityRemaining` is deliberately Owner-entered, not
   system-derived — this app has no sales ledger, so there is no
   reliable way to compute "units still remaining" from existing data.
2. **New Firestore collection** `businesses/{businessId}/initialStockPriceChangeEvents`
   — `firestore.rules`: read = any team member, create = Owner-only with
   field-shape validation (own businessId, own uid as createdBy, positive
   quantity, non-negative prices), **update/delete = `false`
   unconditionally** — same "no exceptions" immutability tier as the
   `'initial'` StockCount itself.
3. **New pure function `calculateInitialStockCurrentValuation()`**
   (`src/utils/calculations.ts`) — per product, uses the most recent
   price-change event (by effectiveDate, tie-broken by createdAt) if one
   exists, else falls back to the original Initial Stock item's own
   quantity/prices. No Firestore/AppContext dependency; fully backward
   compatible (zero events → identical to today's figures).
4. **`AppContext.tsx`** — new `initialStockPriceChangeEvents` state +
   listener, new `recordInitialStockPriceChangeEvent()` action
   (Owner-only, validates quantity/prices, derives the previous-price
   snapshot from the latest existing event or the original item), and a
   new derived `initialStockCurrentValuation` field. **Deliberately NOT
   wired into `expectedCurrentStockValue`/`businessWorth`/
   `capitalGrowth`** — the task's own explicit instruction was not to
   silently change that formula; doing so remains a separate,
   not-yet-authorized decision. `clearAllData` explicitly does not
   attempt to delete this collection (same reasoning as its existing
   `'initial'`-StockCount skip).
5. **New UI** — `InitialStockPriceChangeModal.tsx`, reachable from the
   Dashboard's Initial Capital KPI card once Initial Stock is confirmed
   (previously that click did nothing). Shows original-vs-current
   valuation per product and a form to record a new event, framed as
   "Registar Alteração de Preço" throughout — never "Editar Capital
   Inicial."
6. **8 new tests** (`tests/initial-stock-price-change.test.ts`) — basic
   event, no event, multiple events (including a same-day tie-break),
   historical immutability, backward compatibility with a missing
   `sellingPrice`. New `firestore.rules` coverage
   (`tests/firestore-rules.test.ts`, `initialStockPriceChangeEvents`
   describe block) — written and typechecked but **not executed**, same
   standing `storage.googleapis.com` emulator-download network-egress
   gap as every prior session in this file.
7. **Verified:** `tsc --noEmit` clean, `npm run build` clean,
   `npm run test:all` — **189/189 passing**, zero regressions.
8. **Diff scope, checked explicitly before commit:** 9 files (2 new —
   `InitialStockPriceChangeModal.tsx`,
   `tests/initial-stock-price-change.test.ts`; 7 modified — `types.ts`,
   `calculations.ts`, `AppContext.tsx`, `DashboardView.tsx`,
   `firestore.rules`, `tests/firestore-rules.test.ts`, `package.json`
   for the new test script). Every change to `AppContext.tsx` and
   `calculations.ts` is additive — confirmed via `git diff` that the
   only removed lines are the two import statements, each replaced by
   an extended version. Business Worth, Capital Growth, StockBatch
   pricing, and Modules #17/#18/#19/#20 are untouched.

**Open item for next session (or before production deploy):**
1. A formal `docs/specs/10-*` amendment (or new BDS) authorizing this
   feature is still owed — this session's task prompt functioned as
   authorization the same way the sellingPrice addition's prompt did,
   but neither has been formalized into spec text yet; both are open.
2. The Firestore rules emulator run for the new
   `initialStockPriceChangeEvents` coverage — same standing sandbox
   network gap, needs to run in an environment with real egress before
   production deploy.
3. Whether/how `initialStockCurrentValuation` should ever feed into
   `expectedCurrentStockValue` was explicitly left as an open,
   not-yet-authorized product decision — flagged, not decided, per the
   task's own instruction.

---

## Prior status — Module #10 selling price enhancement (superseded above, kept for continuity)

**Status:** Module #10 (Stock Counts) — **narrow enhancement**: both
Initial Stock and Periodic Contagem now capture `sellingPrice` per unit
alongside the existing `costPrice`, per an explicit task prompt from
the Product Architect ("Add Selling Price to Initial Stock & Periodic
Contagem"). Implemented and verified this session, **but not yet
formally reflected in `docs/specs/10-stock-counts.md`** — flagging
that explicitly per this repo's own governance rule (do not silently
edit spec docs to make an implementation look pre-approved). The task
prompt itself functioned as the authorization; a spec-text update
covering the new field is still an open item for whoever picks this up
next.

**What changed:**

1. **`StockCountItem.sellingPrice` and `InitialStockDraftItem.sellingPrice`**
   (`src/types.ts`) — both **optional**, so every historical
   `stockCounts`/`stockCountDrafts` document written before this change
   remains readable as-is; nothing is backfilled.
2. **`normalizeStockCountItems()`** (`src/utils/stockCount.ts`) now
   accepts/returns `sellingPrice` (defaults to 0 via the same
   `Number(x) || 0` coercion as `costPrice`), but it **never
   participates in `totalValue`** — `totalValue` stays `quantity *
   costPrice`, the investment basis, unchanged.
3. **`AppContext.recordStockCount`** passes the normalized
   `sellingPrice` straight through into the persisted `StockCountItem`
   — no other logic in `recordStockCount` touched.
4. **UI** — `InitialStockCountView.tsx` and `PeriodicStockCountView.tsx`
   both got a new "Venda/Un" column (controlled input, same validation
   pattern as Custo/Un: reject negative, allow 0), and Initial Stock's
   draft round-trip (`rowToDraftItem`/`draftItemToRow`, autosave
   "has content" check) now carries `sellingPrice` too — the
   `initialStockDraftLoaded`/`loadedForBusinessId` business-switch fix
   from the prior session was **not touched** and still passes its own
   regression tests.
5. **Expected Current Stock Value, Investment Value, and Market Value
   formulas were NOT touched** — this was the task's explicit hard
   boundary, and `calculations.ts` was not part of this diff at all.
6. **4 new tests** added to `tests/initial-stock-confirmation.test.ts`
   (`describe('selling price', …)`): accepts a submitted value, accepts
   an explicit 0, defaults missing/invalid input to 0, and confirms
   `sellingPrice` never leaks into `totalValue`. One pre-existing exact-
   shape assertion was updated to include the new field (the assertion
   itself, not its intent, changed). **11/11 passing** in this suite
   (7 prior + 4 new); `npm run test:all` — all suites green, no
   regressions elsewhere.
7. **Verified:** `tsc --noEmit` clean, `npm run build` clean (client +
   server). Firestore rules emulator re-attempted — **still blocked**
   by the same standing `storage.googleapis.com` network-egress gap as
   every prior session (`Error: download failed, status 403: Host not
   in allowlist`) — not claimed as passing.
8. **Diff scope, checked explicitly before commit:** exactly 6 files
   touched (`src/types.ts`, `src/utils/stockCount.ts`,
   `src/context/AppContext.tsx`, `InitialStockCountView.tsx`,
   `PeriodicStockCountView.tsx`, the one test file) — no
   `firestore.rules` change was needed (that file has no field-level
   schema validation on `stockCounts`/`stockCountDrafts`), and Modules
   #18/#19/#20, Business Worth/Capital Growth formulas, and Add Stock's
   pricing architecture were not reopened.

**Open item for next session (or before production deploy):** decide
whether `docs/specs/10-stock-counts.md` gets a `[Amendment]`-tagged
update documenting the new `sellingPrice` field, matching the pattern
already used for the Expected Stock Value amendment below — this
session implemented the field but deliberately did not touch spec text
itself.

---

## Prior status — Module #10 Expected Stock Value & Persistent Initial Stock (superseded above, kept for continuity)

**Status:** Module #10 (Stock Counts) amended and implemented this
session — **Expected Current Stock Value & Persistent Initial Stock**
([`10-expected-stock-value-amendment.md`](./docs/specs/10-expected-stock-value-amendment.md),
✅ Approved). Explicit Product Architect authorization, following the
full governance sequence (amendment → spec update → Rule 8 → plan →
implementation → verification), not a shortcut. Origin: the Customer &
Commercial Validation gate (Module #19) cannot produce meaningful
evidence if customers can't safely complete Initial Stock — this is a
controlled validation-enablement exception, not a reopening of the
wider project. Modules #18, #19, and #20 are untouched and remain in
their previously closed/accepted state.

**What changed:**

1. **Initial Stock is now Draft → Editable → Confirmed**, not a
   single-shot form. Persistent per-business draft
   (`stockCountDrafts/initial`, Owner-only), autosaved, survives
   refresh/logout/device change. Confirmation is atomic with draft
   cleanup (same Firestore batch).
2. **New `stockCounts` immutability enforcement** — `initial` count
   `update`/`delete` now refused unconditionally at the Security Rules
   layer, closing spec #10's own named Functional Requirement #5 gap.
   **One flagged consequence:** `clearAllData` can no longer delete the
   `initial` `stockCounts` document either — fixed (skips it, continues
   deleting everything else), same pattern already established for
   Closings by the Closing Integrity Amendment.
3. **New Expected Current Stock Value** (`Confirmed Initial Capital +
   StockBatch cost value`, Quebra already netted via
   `remainingQuantity`) is now Contagem's comparison baseline,
   replacing "most recent count / Initial Capital fallback" —
   supersedes spec #10's prior stated rule outright, not in parallel.
   Persisted per-count as `expectedValueAtCount` going forward;
   historical counts unchanged, not backfilled.
4. **StockBatch/Initial Stock double-counting ambiguity resolved**,
   grounded in the actual data model, not inferred: the two have never
   had any field or write path linking them, so they're separate,
   non-overlapping value pools by construction — both are always
   included, unconditionally, regardless of creation order.
5. **6 new tests** (`tests/expected-stock-value.test.ts`) verify the
   composition against the real `calculateInventoryTotals` export —
   no reimplementation of the math. New `firestore.rules` coverage for
   both the tightened `stockCounts` rule and the new
   `stockCountDrafts` rule was written but **not executable here** —
   same standing `storage.googleapis.com` emulator-download gap as
   every prior session (confirmed again this session, not assumed).
6. **Verified:** `tsc --noEmit` clean, `npm run build` clean, `npm run
   test:all` — 166/166 passing (160 pre-existing + 6 new), zero
   regressions.
7. **Nothing has been committed yet this session** — see
   `docs/engineering/10-rule8-assessment.md` and
   `10-expected-stock-value-implementation-plan.md` for the full
   governed sequence and scope boundary before committing/pushing.
8. **Second-pass fixes, from Product Architect review before commit
   authorization:**
   - **Confirmation data-flow re-verified**: `recordStockCount` never
     read `initialStockDraft`; `handleSubmit` already passed the live,
     synchronously-read `rows` state explicitly. No defect there — but
     the review correctly pushed for re-inspection rather than trusting
     the first "clean" report at face value, which is how this next
     item was actually found:
   - **Real defect found and fixed: Initial Stock draft load race.**
     `initialStockDraft === null` (AppContext's default) was
     indistinguishable from "Firestore confirmed no draft exists" —
     since `onSnapshot`'s first callback is always asynchronous, a
     previously-saved draft would essentially never load back into the
     form on a fresh mount. Fixed with a new `initialStockDraftLoaded`
     flag that only becomes true after Firestore's real first answer.
   - **Real defect found and fixed: business-switch draft staleness.**
     `InitialStockCountView` is never remounted when an Owner switches
     shops (`ShopSwitcher` lives in a permanent `Header` sibling) — its
     local `draftLoaded` latch would never re-arm for the newly active
     business. Required a fix at **two layers**: `AppContext`'s own
     `initialStockDraft`/`initialStockDraftLoaded` only reset when
     `activeBusinessId` became falsy, never on a direct A→B switch
     (now reset unconditionally on every change); and the view now
     tracks `loadedForBusinessId` and resets all local state
     (rows/date/draftLoaded) the moment `activeBusinessId` diverges
     from it, which also cancels any in-flight autosave debounce for
     the old business via the existing cleanup mechanism.
   - **Doc fix:** the amendment document had two contradictory
     `**Implementation**` lines (one saying "implemented this session,"
     one saying "none yet, before any code was touched" — a leftover
     from when the document was first drafted). Now clearly
     distinguishes drafting-time state (historical) from current status.
   - **New regression tests:** `tests/initial-stock-confirmation.test.ts`
     — 7 tests total (normal confirmation; immediate confirmation
     before debounce; last-second edit; failed-confirmation-preserves-
     draft via batch-ordering guards; no-closure-over-draft guard;
     business-switch reset-ordering guard). All source-level guards are
     labeled honestly as such — this repo has no jsdom/testing-
     library/vitest, so true component-timing tests aren't achievable
     without introducing a new test harness, which would itself be
     scope creep beyond this fix.
   - **Re-verified after both fixes:** `tsc --noEmit` clean, `npm run
     build` clean, `npm run test:all` — **173/173 passing** (166 prior
     + 7 in the new confirmation suite — the expected-stock-value suite
     stayed at 6). Firestore rules emulator re-attempted — **still
     blocked** by the same standing `storage.googleapis.com` network
     gap; not claimed as passing.
   - **Still not committed.** Awaiting Product Architect commit
     authorization per the desired final state: implementation complete
     → defects resolved → verification clean → emulator limitation
     explicitly recorded → awaiting commit.

**If the next session's task touches Module #10:** read the amendment
document's Part 7 (explicit non-goals) first — localization and a
post-confirmation correction mechanism remain open items, deliberately
out of scope for this change.

**If the next session's task is something else entirely:** verify
`docs/specs/README.md` directly rather than trusting any summary,
including this one.

---

## Prior status — Module #19 V1 close-out (superseded above, kept for continuity)

**Status:** Module #19 (Subscriptions) V1 — **formally closed**
(`docs/specs/19-v1-formal-completion-closeout.md`, decision: CLOSED —
V1 COMPLETE). Independently re-verified in a dedicated closeout audit
— all seven Engine transitions, the Manual Payment Bridge, security
boundaries, and 164/164 tests re-confirmed against the actual
repository, not assumed from any prior session's own claim. The
project has shifted to Customer & Commercial Validation.
**No further engineering work is authorized until real customer
evidence justifies it** — see
[`19-v1-customer-validation-plan.md`](./docs/engineering/19-v1-customer-validation-plan.md)
for the test design and evidence-capture template; §5 of that document
is where results go once the test actually runs — **it is currently
empty, no test has been run yet.** Verify `main` == `origin/main`
yourself before trusting anything below — this note does not update
itself.

**What's true right now:**

1. **The V1 Subscription Lifecycle Engine is complete, tested, and
   unmodified since.** `server/subscriptionEngine.ts` — all seven
   governed state transitions (trial_completed→active,
   active→grace_period, grace_period repeat-reversal no-op,
   grace_period→active recovery, grace_period→expired on time-elapse,
   expired repeat-reversal no-op, expired→active recovery), 27 tests,
   processor-independent by construction. Confirmed unchanged this
   session — its only references to any payment processor are two
   comments explicitly stating it has none.
2. **PaySuite verification stalled on document/KYB friction.**
   Investigated directly (browser session, real dashboard access) —
   confirmed a real sandbox environment, real API keys, real webhook-
   secret infrastructure exist, but payment methods were never
   activated on the account (checkout showed no M-Pesa/e-Mola/card
   options at all) — an "Integração" screen showed a pending request,
   never resolved.
3. **PayTED was investigated as an alternative — also stalled**, same
   class of account-activation friction, confirmed via the same kind
   of direct dashboard access (sandbox exists, keys exist, checkout
   had no payment methods to select).
4. **Two "too-good-to-be-true" alternative processors (NetShop,
   Debito Pay) were researched and explicitly rejected** — both had
   suspiciously complete marketing sites answering every open
   technical question perfectly, zero independent corroboration
   anywhere (no news, no registry listing, no third-party review), and
   in Debito Pay's case, a real red flag (its own "investor relations"
   page hosted under an unrelated domain). Do not pursue either without
   independent verification first (Mozambique company registry, Banco
   de Moçambique's licensed-PSP list) — flagged clearly, not silently
   forgotten.
5. **Given both real processors stalled on the same activation
   friction, the V1 launch strategy pivoted to a Manual Payment Bridge**
   — implemented this session, per explicit Product Architect
   authorization. Customer submits a payment reference (M-Pesa/e-Mola/
   Millennium BIM, `src/data/subscriptionPlan.ts` holds the real
   destination numbers) via `SubscriptionContactModal.tsx`; this only
   ever writes a `'pending'` Payment record
   (`businesses/{businessId}/payments/{paymentId}`) — never touches
   subscription state directly. Confirmation happens exclusively via
   `server/scripts/confirmPayment.ts`, run by hand with
   `FIREBASE_SERVICE_ACCOUNT_BASE64` access — deliberately NOT an
   in-app role (Module #18/SuperAdmin has no `platformRole` mechanism
   built or authorized yet; inventing one was an explicit Stop
   Condition this session correctly avoided). Confirmation calls the
   unmodified `applyLifecycleEvent()` — the Engine remains the sole
   owner of subscription-state transitions, exactly as designed.
6. **11 new tests** (`tests/payment-confirmation.test.ts`) cover
   idempotency (including the specific partial-failure scenario where
   a payment is marked confirmed but the lifecycle call fails
   separately — always safe to retry, reasoned through explicitly in
   `server/paymentConfirmation.ts`'s own header), concurrent
   confirmation, reject/confirm conflicts, and tenant isolation. New
   `firestore.rules` coverage for `payments` written but **not yet
   run** — this sandbox's standing network limitation
   (`storage.googleapis.com` not allowlisted) blocks the emulator JAR
   download, same gap as every prior session.
7. **Also fixed this session, all independently verified:** the
   missing `subscriptions` composite index for the grace-period-expiry
   sweep (was silently non-functional in production); CI now runs all
   8 test suites (was 2 of 8); a documented backup/recovery procedure;
   in-app trial/subscription status visibility (a persistent banner);
   a business-meaningful message when a write is blocked by
   subscription status (was a raw Firebase error). Railway's earlier
   deploy failure was also independently confirmed resolved (screenshot
   showed "Active," not "Failed").
8. **Nothing has been committed yet this session.** Everything above
   is sitting in the working tree, verified (`tsc --noEmit` clean, 164
   tests passing across 8 suites, build clean) but not yet reviewed as
   a final diff, not committed, not pushed — per this task's own git
   discipline instruction to hold until explicitly told.

**If the next session's task is anything Module #19 payment-related:**
read `server/paymentConfirmation.ts`'s own header first — it explains
the deliberate two-step (not-atomic) design and exactly why re-running
confirmPayment() is always safe. Do not attempt to make the Payment
transition and the lifecycle transition one atomic operation — Firestore
doesn't support nested Admin SDK transactions, and the current design
already handles the partial-failure case correctly.

**If the next session's task is something else entirely:** this file
had drifted badly stale before this rewrite (Module #20's own work,
several sessions of Module #19 governance/engine work, and this
session's implementation had accumulated with zero HANDOFF.md updates
in between) — don't assume the next drift-check will be this thorough;
verify `docs/specs/README.md` directly rather than trusting any
summary, including this one.

---

## Prior status (superseded above, kept for continuity)

**Status:** Module #20 (Notifications) **Phase 3 (Background Worker
Scheduled Triggers) is implemented, tested, and formally closed.**
`main` == `origin/main` at `32bafbf` (confirmed via fresh `git fetch`,
not assumed).

**What's true right now:**

1. **Phase 1, Phase 2, and Phase 3 are all implemented, verified, and
   closed.** [`20-phase1-closeout.md`](./docs/engineering/20-phase1-closeout.md),
   [`20-phase2-closeout.md`](./docs/engineering/20-phase2-closeout.md),
   [`20-phase3-closeout.md`](./docs/engineering/20-phase3-closeout.md).
2. **All six BDR-0007 `eventType`s exist and are wired**, across three
   producers: `trial-engine` (`trial.ending_soon`, `trial.ending_tomorrow`
   — Checkpoint 3), `closing-integrity` (`closing.approaching`,
   `closing.due`, `closing.overdue` — Checkpoint 4), `breakage-tracking`
   (`inventory.risk.breakage` — Checkpoint 5). Confirmed by direct grep
   at close-out, not assumed.
3. **ADR-0002, ADR-0003, ADR-0004 are all Accepted and now implemented
   in code** — `server/backgroundWorker.ts` (`registerJob()`),
   `server/notificationPlatform.ts` (`BusinessEvent` contract,
   `evaluateBusinessEvent()` pipeline), all three producers built
   against both.
4. **126/126 executable tests pass** (calculations, notification-platform,
   staff-notifications, trial/closing/breakage producers) — no
   regressions across any checkpoint. `tsc --noEmit` clean, `npm run
   build` clean. The Firestore emulator rules test remains
   execution-blocked by this sandbox's network egress allowlist (same
   standing limitation as every prior phase) — a manual local-environment
   verification step still owed before production deploy, not a code
   defect.
5. **Not yet started:** Module #20 Completion Review (module-level,
   distinct from this phase-level close-out), Phase 4 (Tenant User
   Experience beyond the existing bell dropdown), Phase 5 (Payment
   Webhook), Phase 6 (additional delivery channels), and Stock Counts
   Inventory Risk (BDR-0007 §4.2 explicit deferral — no eventType
   exists to build against). None assessed, none authorized, none
   begun.
6. **Template copy across all six eventTypes** (`en`/`pt`/`fr`) is
   first-draft engineering wording, flagged at every checkpoint as
   **not** Product-Architect-approved — open for review, doesn't block
   functional correctness.

**If the next session's task is "Module #20 Completion Review":** read
[`20-phase3-closeout.md`](./docs/engineering/20-phase3-closeout.md) and
the three phase close-outs it lists first — this review is module-wide,
not phase-scoped, and should independently re-verify ADR-0002/0003/0004
conformance and Notification Platform ownership boundaries across all
three phases, not just re-read this file's own summary of them.

**If the next session's task is something else entirely:** the two
items below are known, already-flagged debt that doesn't block
anything, but should be kept in mind — no other documentation drift is
currently known.

- Template copy (item 6, above) remains unreviewed by the Product
  Architect.
- The emulator-run manual verification step (item 4, above) is still
  owed before any production deploy touching `firestore.rules` or
  `firestore.indexes.json` changes from Phase 1–3.

The rest of this file, below this section, describes older sessions
(Module #19 Phase 1/2, the owner→admin migration) and is historical
context only — not current status.

---

## Prior status — owner→admin migration history (superseded, kept for continuity)

**Status:** Stage 2 Compatibility Gap Correction implemented, validated,
and **committed** as `2006cd6`. (Previously noted here as "not yet
committed" — that was stale; corrected on this update.)

**What this fixed:** Stage 2 (`e10dede`) started writing `role: 'admin'`
for new self-registrations, and `firestore.rules`' `isOwnerOf()` already
treated `'owner'`/`'admin'` as equivalent (Stage 1). But two application-
layer checks were never updated to match: `AppContext.tsx`'s `isOwner`
derivation (client — caused every post-Stage-2 admin account to lose all
owner-level UI capability, though the account's own single shop still
loaded via a fallback) and `server/index.ts`'s `verifyStaffManagementAction`
(server — caused `403 permission-denied` on all 5 privileged staff
endpoints: delete, suspend, reactivate, reset-pin, set-tier). This was a
functional gap, not a security issue — the failure mode was denying
access that should have been granted, never granting access that
shouldn't have been. Classified and authorized as a **Stage 2 completion
correction**, not a new migration stage, not a role redesign.

**Files changed (exactly 3, as authorized):**
- `src/types.ts` — `UserRole` widened from `'owner' | 'staff'` to
  `'owner' | 'admin' | 'staff'`.
- `src/context/AppContext.tsx` — `isOwner` now
  `role === 'owner' || role === 'admin'`.
- `server/index.ts` — `verifyStaffManagementAction`'s `isAdmin` now
  checks both values.

**Explicitly not touched, per the authorized boundary:** `AuthView.tsx`
(its separate `roleMode` login-tab UI state was investigated and
confirmed unrelated to `users/{uid}.role` — no change needed),
`firestore.rules` (already correct since Stage 1), `scripts/migrate-owner-to-admin.ts`
(Stage 3, untouched), any database document, any SaaS module (#17–#20).

**Validation completed:**
- `tsc --noEmit` — clean.
- `npm run build` (`vite build` + `build:server`) — succeeded; only
  pre-existing, unrelated warnings (CSS lint, chunk size, dynamic
  import) — no new errors.
- Diff reviewed — exactly the 3 authorized files, no unrelated changes.
- Regression check — confirmed `isStaff`/`role === 'staff'` branches
  (unaffected by the rename) remain unchanged in both files.
- **Not run at runtime** — same sandbox limitation as Stage 3: no
  Firebase network egress here, so an actual affected-account login/
  action flow has not been exercised end-to-end. That remains a manual
  verification step.

**Stage 3 (backfill) and Stage 4 (compatibility removal): unchanged by
this correction, still not executed/not authorized.**
`scripts/migrate-owner-to-admin.ts` (Analyzed, commit `0f7a4e5`) is
untouched. Per this correction's own authorization terms, no Stage 3
execution or further migration work proceeds until this checkpoint is
reviewed.

---

## Backend reliability — staff endpoints (current)

**Status:** Working tree clean, branch up to date with `origin/main`.
`f39b80f` is pushed (previously noted here as "local only, not pushed" —
that was stale; corrected on this update).

- `de328e6` (pushed) — staged partial-failure handling for
  `/api/staff/suspend` and `/api/staff/reactivate`.
- `f39b80f` (pushed) — staged partial-failure handling for
  `/api/staff/delete` and `/api/staff/set-tier`, completing the same
  pattern for the remaining two endpoints.
- `8a1e6ee` (pushed, docs-only) — aligned this file and
  `docs/architecture/04-system-architecture.md` §4.4 with the shipped
  staff-reliability pattern; no code changes.
- `480dafe`, `b394ace` (pushed, CI-only) — added a GitHub Actions
  workflow running `firestore.rules` emulator validation, plus the Java
  21 setup step the emulator requires. No application code touched; not
  previously recorded in this file.

All four privileged staff endpoints now follow the same staged pattern
(authorize → effective mutation → non-critical downstream stages
isolated so a Firestore-sync or timeline/audit failure after the
primary action already succeeded is reported as
`partialFailure`/`auditLogged: false`, not a misleading `500`):
- `/api/staff/delete`
- `/api/staff/suspend`
- `/api/staff/reactivate`
- `/api/staff/set-tier`

**`/api/staff/reset-pin` was explicitly not included** — remains on its
original error-handling shape, unchanged, out of scope for this pass.

**Nothing awaiting push.** This section is fully landed.

---

**Prior status (superseded above, kept for continuity):** Product
Architect Accepted Stage 1 and authorized Stage 2 only. Stage 2
(`e10dede`) implemented and reached Analyzed — new self-registrations
now persist `role: 'admin'` in both write paths (`AuthView.tsx`); no
other file changed; `tsc --noEmit`/`npm run build` clean;
`npm run test:rules` and a live registration smoke test both
Execution-blocked-by-environment (Firestore emulator unreachable in
this sandbox — network egress allowlist excludes
`storage.googleapis.com`).

**Latest artifact (most recent):**
`docs/engineering/phase0-owner-admin-migration-implementation-plan.md`
— a Stage 1–6 execution plan for the `owner`→`admin` rename (dual-read
rules → new-write path → backfill → identifier rename → full
verification → close the compatibility window), each stage with its
own commit boundary, verification checkpoint, rollback path, and
acceptance criteria. This is a plan document, not code — it does not
begin Stage 1 and does not itself authorize starting Phase 0A.

**Scope decisions this session (Product Architect, now settled, not
open):** rename boundary is limited to technical-authorization
identifiers (`UserRole`, `isOwnerOf`, `isOwnerOrGrantedManager`,
`ownedBusinessIds`, `isOwner`, related internal identifiers, i18n
**key names** only, test constants) — explicitly **excludes**
`ownerUid` (business-ownership field, different domain) and all
user-facing "Owner" product terminology (Owner Withdrawals, Owner
Portfolio, translated label values). Dual-read migration strategy is
adopted as the required implementation approach. Module #18's
dependency on this rename reclassified from "unaffected" to **low
dependency** (a future Support Session/impersonation feature may rely
on the renamed role model; not blocking).

**Prior artifacts (same session, earlier, unchanged):**
`docs/engineering/platform-infrastructure-readiness-assessment.md` —
Background Worker confirmed 0% built; no CI secret-scan pipeline
exists; Manager-tier migration confirmed done.
`docs/engineering/19-subscriptions-implementation-readiness.md` (v2) —
scope split, dependency analysis, Registration's non-atomic write path
flagged.

**Nothing has been implemented.** No `src/`, `server/`,
`firestore.rules`, `docs/specs/*`, or `docs/architecture/*` file has
been touched this session — confirmed by diff. All new artifacts live
under `docs/engineering/` only. Starting Stage 1 of the plan above
still requires a separate, explicit Product Architect go-ahead.

**Module status (superseded for #19 by the "Right now" section at the
top of this file — Phase 1 is implemented and closed; the note below is
stale for #19, kept for #17/#18/#20 accuracy):** Modules #17, #18, and
#20 remain Accepted/Approved (docs & business rules) — none has
implementation authorization. Build order: `#19 → #20 → #18`; #18's own
BDS additionally gates its runtime implementation on #19/#20 holding
real data. Module #15 (AI Intelligence) remains drafted, not
implemented.

**Anything mid-flight / blocked:** Nothing blocked at the repository
level, nothing uncommitted. Do not begin #17, #18, or #20
implementation, schema, or `firestore.rules` work — not authorized.
#19 Phase 1 is closed; #19 Phase 2 (Trial Engine) is not authorized and
has not begun — requires its own Rule 8 Assessment first (see "Right
now," top of file). Per this session's Platform Infrastructure finding,
also hold off on Background Worker implementation before Phase 0
completion (or an explicit, stated Product Architect exception) — see
above.

**Known gaps flagged but not yet scheduled:**
- `Header.tsx`'s role label still only distinguishes Owner/Staff — a
  Manager sees "Staff" with no tier indicator in the header itself
  (SettingsModal shows it correctly). Cosmetic, noted as future
  enhancement in BDS #16.
- `clearAllData` no longer removes Closings (they can no longer be
  deleted at all) — flagged for a product decision on whether its copy
  should change, not yet decided.
- The tenant-isolation audit findings document notes its own evidence
  is based on operator-reported terminal output/screenshot, not a
  full attached raw log file — a nice-to-have follow-up, not a
  blocker, per that document's own Section 6/Appendix A.

---

## How to update this file (every session, before you stop)

Replace the "Right now" section above with the current truth. Keep it to
these four fields. If you're stopping mid-task (not just at a clean
module boundary), say so explicitly in "mid-flight" — including which
files you'd already touched and whether they're committed or still
local/uncommitted. An uncommitted local change is invisible to the next
session/engineer, so either commit it (even as a clearly-marked WIP
commit) or describe it here in enough detail to redo it.
