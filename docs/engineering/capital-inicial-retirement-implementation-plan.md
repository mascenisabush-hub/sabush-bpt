Implementation Plan

# Implementation Plan — Retirement of Capital Inicial as an Active Sabush BPT Business Concept

**Status:** 🔶 **DRAFT — NOT AUTHORIZED.** This document is a planning artifact only. It does not authorize, and was not produced by, any code, test, `firestore.rules`, `firestore.indexes.json`, or governance-document change. The next gate is a separate Product Architect review/signature of this Plan, followed by a separate, signed Implementation Authorization — neither is created by this document.
**Governing chain:** [Decision Proposal](../engineering/capital-inicial-retirement-decision-proposal.md) (✅ Accepted) → [Rule 8 Assessment](../engineering/capital-inicial-retirement-rule8-assessment.md) (✅ Accepted, verdict READY AFTER DECISIONS) → GOV-1 resolved ([BDR Decision 1 corrected](../specs/BDR-pending-business-worth-evolution-measurement-model.md), [new Decision 39](../specs/BDR-pending-business-worth-evolution-measurement-model.md)) → GOV-2 resolved ([Architecture §5.4](../architecture/05-business-lifecycle.md), [§8.6](../architecture/08-module-architecture.md)) → [Specification §44](../specs/business-worth-evolution-specification.md) clarification accepted, including §44.3/Decision 39(k)'s establishment-vs-reading clarification → **this Implementation Plan (draft)**.
**Baseline investigated against:** `main` @ `35ed04e`, working tree clean, verified at drafting time — the exact commit the governance chain above is itself recorded against.

---

## 1. Baseline and Authorization Boundary

**Exact baseline commit:** `35ed04e`. `git fetch origin main` confirms `main`/`origin/main` synchronized at this commit at drafting time; no code, test, or rules file has changed since.

**Accepted governance artifacts this Plan is built from, and only from:**
1. `docs/engineering/capital-inicial-retirement-decision-proposal.md` — ✅ Accepted, signature recorded.
2. `docs/engineering/capital-inicial-retirement-rule8-assessment.md` — ✅ Accepted, verdict READY AFTER DECISIONS, signature recorded.
3. `docs/specs/BDR-pending-business-worth-evolution-measurement-model.md` — Decision 1 (corrected), Decision 39 (a)–(k), signatures recorded.
4. `docs/specs/business-worth-evolution-specification.md` — §44 (draft) and §44.3's clarification, signature recorded on the clarification paragraph specifically (§44's own overall header status is unaffected by that narrower acceptance — noted, not resolved, by this Plan).
5. `docs/architecture/05-business-lifecycle.md` §5.4 — amended.
6. `docs/architecture/08-module-architecture.md` §8.6 — amended.
7. The existing signed Business Worth Evolution Implementation Authorization — reused **only** where this Plan's own increments rely on already-authorized behavior (the shared Case A/B calculation functions, the `BusinessWorthSnapshot` write path, the existing Notifications platform) — never re-opened.

**What this Plan is authorized to plan for:** exactly BDR Decision 39(a)–(j) and 39(k)'s clarification, and Specification §44.1–§44.3, as already accepted. No item below introduces behavior beyond what those documents already settle.

**Explicitly outside this Plan's scope, and not addressed further:**
- Any redesign of Case A or Case B arithmetic (§9, unamended).
- Any redesign of Contagem, Cash Ledger, Receivables, Payables, or Owner-Declared Business Worth mechanics (all confirmed unaffected across every governance pass).
- Actual code-level deletion of `InitialStockCountView.tsx`, the Void & Redo subsystem, or SuperAdmin-Assisted Recovery — Decision 39(f) explicitly defers this to "a separate, later, non-urgent decision," not this Plan.
- §44's own overall Accepted/Draft status as a whole document — only §44.3's clarification paragraph carries a recorded acceptance; the surrounding §44.1/§44.2/§44 header remain in the state the governance chain already left them in.

---

## 2. Implementation Increments

### Increment 1 — Fecho Baseline Correction

**Governing basis:** BDR Decision 39(i); Specification §18/FR-25 (as corrected); the pre-existing, already-signed Implementation Authorization §24 ("Post-Implementation Correction — Fecho Baseline / Capital Inicial Fallback Removal").

**Exact current code** (`apps/tenant/src/utils/calculations.ts`, lines 1489–1507, `resolveActiveBusinessWorthBaselineDate`):
```ts
export function resolveActiveBusinessWorthBaselineDate(params: {
  snapshots: BusinessWorthSnapshot[] | null | undefined;
  initialStockCount: StockCount | null | undefined;
}): string | null {
  const { snapshots, initialStockCount } = params;
  const active = (snapshots ?? []).filter((s) => s.status === 'active');
  if (active.length > 0) {
    const latest = [...active].sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))[0];
    return new Date(toMillis(latest.confirmedAt)).toISOString().slice(0, 10);
  }
  if (!initialStockCount) return null;
  return initialStockCount.createdAt.slice(0, 10);   // ← the fallback to remove
}
```

**Behavior before:** when no active `BusinessWorthSnapshot` exists, falls back to the historical `initial` StockCount's `createdAt` as Fecho's baseline.
**Behavior after:** when no active `BusinessWorthSnapshot` exists, returns `null` unconditionally — no baseline, regardless of whether a historical Capital Inicial exists.

**Exact change:** remove the `initialStockCount` parameter and the two lines depending on it; the function becomes:
```ts
export function resolveActiveBusinessWorthBaselineDate(params: {
  snapshots: BusinessWorthSnapshot[] | null | undefined;
}): string | null {
  const { snapshots } = params;
  const active = (snapshots ?? []).filter((s) => s.status === 'active');
  if (active.length === 0) return null;
  const latest = [...active].sort((a, b) => toMillis(b.confirmedAt) - toMillis(a.confirmedAt))[0];
  return new Date(toMillis(latest.confirmedAt)).toISOString().slice(0, 10);
}
```

**Call sites to update** (`apps/tenant/src/context/AppContext.tsx`):
- Line 1369 — `fechoBaselineDate = resolveActiveBusinessWorthBaselineDate({ snapshots, initialStockCount })` → drop the `initialStockCount` argument.
- Line 6185 — `startDate = resolveActiveBusinessWorthBaselineDate({ snapshots, initialStockCount })` → same.

**Owner-facing message when no baseline exists:** already specified and approved (Specification §18): *"Estabeleça primeiro o Valor do Negócio através de uma Contagem ou de um Valor de Negócio Declarado para utilizar o Fecho."* Exact call site to verify/wire this message: wherever `fechoBaselineDate === null` is currently branched on in `ClosingView.tsx` (to be located and confirmed at implementation time — not located during this planning pass, flagged as an implementation-time file-confirmation step, not a new decision).

**Tests to update** (`tests/fecho-baseline-anchored-closing.test.ts`):
- Test 7 ("Case B — no snapshot yet, State 1a: baseline is the initial StockCount's own createdAt") — **must be updated**: new expected behavior is `null`, not the StockCount's `createdAt`. Rename to reflect the corrected behavior (e.g., "no snapshot yet: baseline is null, never Capital Inicial's date, even when a historical initial StockCount exists").
- Test 8 ("createdAt is used even when confirmedAt IS present") — **must be retired**: it specifically tests the fallback's own internal preference rule (createdAt over confirmedAt), which no longer exists once the fallback itself is removed. Retiring this test is not "blindly deleting" — it tests a mechanism (the fallback's field-choice) that the accepted governance explicitly requires removed, not one whose test coverage is merely inconvenient.
- Test 9 ("Case A takes priority over Case B when both exist") — **must be updated**: the assertion itself (Case A wins) remains correct, but the test's own framing ("Case B") and its `initialStockCount` parameter must be adjusted to reflect that Case B provides no baseline at all going forward — this test's *value* (proving Case A's priority) is retained; its *setup* changes.
- Tests 1, 2, 3, 4, 5, 6, 10 — **remain unchanged**, all Case A/no-baseline behavior, unaffected by removing the Capital Inicial fallback.

**Rollback:** fully independent — a single pure function and its two call sites, no schema/rules involvement, no data written or read differently. Revertible by re-adding the parameter and fallback line; affects no persisted data.

---

### Increment 2 — Disable New Capital Inicial Creation

**Governing basis:** BDR Decision 39(a); Rule 8 Finding SEC-1.

**Exact current rule** (`firestore.rules`, `stockCounts` collection, lines 657–724, `allow create`):
```
allow create: if isOwnerOf(businessId) && (
  (request.resource.data.get('type', null) != 'initial' &&
    subscriptionAllowsNewRecords(businessId)) ||

  (request.resource.data.get('type', null) == 'initial' &&
    stockCountId == 'initial' &&
    !('chainPosition' in request.resource.data) &&
    subscriptionAllowsNewRecords(businessId)) ||                    // ← BRANCH TO CLOSE (legacy shape)

  (request.resource.data.get('type', null) == 'initial' &&
    stockCountId == 'initial' &&
    request.resource.data.get('chainPosition', null) == 1 &&
    request.resource.data.get('confirmedAt', null) == request.time &&
    subscriptionAllowsNewRecords(businessId)) ||                    // ← BRANCH TO CLOSE (new full shape)

  (request.resource.data.get('type', null) == 'initial' &&
    request.resource.data.get('confirmedAt', null) == request.time &&
    ( /* chainPosition 2, 3, 4 redo branches */ )
  )                                                                  // ← BRANCH TO PRESERVE UNCHANGED — see finding below
);
```

**Precise surgical change:** remove only the two "original confirmation" sub-branches (legacy-shape, no `chainPosition`; new-shape, `chainPosition == 1`). **The three redo sub-branches (`chainPosition` 2/3/4) are left completely untouched.** The non-`'initial'` (periodic Contagem) branch is left completely untouched.

**Why the redo branches must NOT be closed — this is the star finding of this Plan, resolving Rule 8 Finding RS-1 without inventing a new mechanism:** a redo branch is reachable only if a `voidRecords/{predecessor}` document already exists for the exact predecessor slot (`initial`, `initial-2`, or `initial-3`). A `voidRecords` document, in turn, can only ever be created while `initialStockConfirmationVoidable()` or `initialStockRecoveryAuthorizationActive()` (both unmodified by this Plan) return true — both of which are already self-limiting to a real, per-record time window (12 hours from that specific confirmation's own `confirmedAt`, or the SuperAdmin authorization's own `expiresAt`), verified server-side against `request.time`, never a client-supplied value. Once the two original-confirmation branches above are closed, **no business can ever create a new chain to begin with** — so no `voidRecords` document for a chain that didn't already exist before cutover can ever come into being. The redo branches therefore automatically, and without any new cutover-timestamp condition, satisfy Decision 39(f)'s exact requirement: an already-open recovery cycle on an already-existing chain continues to work exactly as before, while no new chain can ever start. **No new rules text is required for grandfathering — closing only the two original-confirmation branches is the complete, correct, minimal mechanism.**

**Behavior before:** a business with no Capital Inicial can create one via either shape; a business already inside a Void & Redo cycle can redo up to Confirmation #4.
**Behavior after:** no business can ever create a new original Capital Inicial confirmation. A business already inside a legitimate, already-open Void & Redo cycle (predecessor already voided, `voidRecords` document already exists) can still complete that cycle exactly as before, up to the existing Confirmation #4 ceiling.

**`firestore.indexes.json`:** no change identified — this rule change removes reachability of two boolean branches; it does not alter any query shape.

**Tests to update** (`tests/firestore-rules.test.ts` — the large emulator suite; exact new-test locations to be confirmed against the file's existing `stockCounts create` test grouping at implementation time):
- New test: attempting to create `stockCounts/initial` with no `chainPosition` (legacy shape) is **denied**, even for a business with zero existing Capital Inicial records and an otherwise-valid Owner session.
- New test: attempting to create `stockCounts/initial` with `chainPosition: 1` (new shape) is **denied** identically.
- Existing tests proving periodic Contagem creation succeeds — **must remain passing unmodified**, confirming the non-`'initial'` branch is untouched.
- Existing Void & Redo tests (`tests/initial-stock-void-redo.test.ts`) proving a redo succeeds given a valid predecessor `voidRecords` document — **must remain passing unmodified**, confirming the redo branches are untouched.

**Rollback:** independent at the rules layer — re-adding the two removed `||` clauses restores prior behavior exactly. Affects no existing data (a rules change never touches persisted documents); the only effect is on future write attempts.

---

### Increment 3 — Grandfather Legacy In-Flight Recovery (Server-Side Only)

**Governing basis:** BDR Decision 39(f); Rule 8 Finding RS-1.

**Finding, precisely: no `firestore.rules` change is required for this increment at all, beyond Increment 2 above.** Traced exhaustively:
- **`voidRecords` create rule** (lines 1158–1189): unaffected by Increment 2, self-limiting via each target record's own real `confirmedAt + 12h` (Owner path) or the Authorization document's own `expiresAt` (SuperAdmin-granted path) — both already compared against `request.time`, never a client value. No new condition needed.
- **`stockCounts` redo branches**: unaffected by Increment 2 (preserved exactly), gated behind an already-existing, already-time-proven `voidRecords` document — no new chain reachable after cutover, per Increment 2's own finding above.
- **`initialStockRecoveryAuthorization` collection**: `allow create: if false` at the rules layer already — creation happens exclusively server-side via `grantInitialStockRecoveryAuthorization()` (`server/initialStockRecoveryAuthorization.ts`, line 126), using the Admin SDK inside a transaction, entirely bypassing this rules file.

**The one genuine gap, requiring a server-code change (not a rules change):** `grantInitialStockRecoveryAuthorization()` has no cutover awareness today — a SuperAdmin operator could, in principle, grant a **brand-new** 48-hour authorization window against an old, already-existing `initial` confirmation at any point in the future, which is exactly "a new correction window opened after cutover" that Decision 39(f) requires refused. Unlike a Void & Redo window (which can only be "in-flight" if it was already open before cutover, by construction of the timestamp checks), a not-yet-granted SuperAdmin authorization has no such natural self-limitation — grandfathering does not apply to it, because there is no "already open" state for an authorization that has not yet been granted.

**Exact change:** add one new precondition, function-local, at the top of `grantInitialStockRecoveryAuthorization()`'s existing validation sequence (mirroring its existing `{ outcome, message }` pattern exactly):
```ts
if (isPastCapitalInicialRetirementCutover(clock.now())) {
  return { outcome: 'retirement-cutover-reached', message: 'A Recuperação Assistida de Capital Inicial já não está disponível — o Capital Inicial foi retirado como funcionalidade ativa.' };
}
```
`isPastCapitalInicialRetirementCutover` — a new, small, pure function taking the already-injected `clock` (this file's existing `TimestampFactory` pattern, already used for testability) and comparing against a fixed cutover constant, to be defined at implementation time (not this planning pass) as the exact moment Increment 2 ships. **This is the only genuinely new logic this entire Plan introduces anywhere in `server/`.**

**What is explicitly NOT changed:** `server/initialStockRecoveryConsumption.ts` (the Owner-side consumption of an *already-granted* authorization) — an authorization granted before cutover must remain fully consumable after cutover, within its own already-set `expiresAt`, exactly as Decision 39(f) requires ("grandfather already-in-flight ... windows"). No change to this file.

**Tests to add** (`tests/superadmin-initial-stock-recovery-authorization.test.ts`):
- Granting a new authorization before the cutover — succeeds, unchanged.
- Granting a new authorization after the cutover — denied with the new `retirement-cutover-reached` outcome.
- Consuming an authorization granted before cutover, attempted after cutover but within its own `expiresAt` — **still succeeds** (`tests/superadmin-initial-stock-recovery-consumption.test.ts`, no change to this file's own tests expected, confirmed as a regression check rather than a new test).

**Rollback:** fully independent — a single new precondition in one server function. Reverting removes the check; no persisted data is touched by this change in either direction.

---

### Increment 4 — Remove Capital Inicial as an Active Establishment/Navigation Path

**Governing basis:** BDR Decision 39(a), 39(l as originally item L in the source instruction)/Decision Proposal §11; Rule 8's non-blocking UI items.

**Exact current entry points, traced and confirmed unchanged since original investigation:**

| # | File | Current behavior | Required change |
|---|---|---|---|
| 1 | `DashboardView.tsx`, primary Business Worth KPI card (`displayedBusinessWorthValue === null`) | `onClick={onNavigateToInitialStockCount}` | Repoint to a Contagem/Declare choice — see below |
| 2 | `DashboardView.tsx`, Business Worth Modal "Capital Inicial" row | `onClick` → `onNavigateToInitialStockCount` when `!hasInitialStockCount` | Remove this branch for a business with no historical record; the row itself should not render in that case |
| 3 | `InitialStockPriceChangeModal.tsx`, no-record fallback | Offers `onOpenInitialStockScreen` | Remove the "create one now" offer |

**Exact replacement mechanism — reuses only already-built, already-governed screens, introduces no new one:** the two already-existing nav destinations `stock-count` (Contagem, `PeriodicStockCountView`) and `declare-worth` (`DeclareBusinessWorthView`) are the only two targets this increment may route to, per BDR Decision 1 (as corrected)/Decision 36. `App.tsx`'s existing `handleNavigateToInitialStockCount` (currently `setActiveTab('initial-stock')`) is replaced with a small chooser — exact UI shape (inline two-button choice vs. a small modal) is an implementation-time presentation detail within already-decided direction, not a new decision.

**i18n copy to update** (`pt.ts`/`en.ts`/`fr.ts`, key `dashboard.kpi.initialCapital.descUnset`, currently *"Toque para registar o stock que já possui e definir o ponto de partida."*): must no longer direct the Owner toward Capital Inicial; replacement copy should describe the Contagem/Declare choice. Exact replacement string is a copy-writing detail for implementation time, not decided here.

**Explicitly NOT touched by this increment:** `InitialStockCountView.tsx` itself (remains reachable for historical viewing/correction, per Increment 5 below); `ProductDetailModal.tsx`'s per-product count-history row (a read-only historical display, not a creation path, confirmed out of scope).

**Tests to add/update:**
- A new test (or update to an existing Dashboard test, exact file to be confirmed at implementation time) confirming the null-state KPI card no longer navigates to `initial-stock`.
- No existing test currently asserts the *old* CTA behavior by name in a way discovered during investigation — flagged as an implementation-time confirmation step, not assumed absent.

**Rollback:** independent at the component layer — reverting the three `onClick`/copy changes restores prior UI behavior; affects no data, since none of these three entry points write anything themselves (they only navigate).

---

### Increment 5 — Legacy Capital Inicial Surfaces (Preservation Verification, No Code Expected)

**Governing basis:** BDR Decision 39(b), (e), (h); Specification §44.2, §44.3.

**This increment is a verification pass, not expected to require any code change**, given every mechanism it covers is already unconditionally preserved by construction:
- **Historical records remain readable:** no read path to `stockCounts` is touched by any other increment; Increment 2 only closes a `create` branch.
- **State 1a / Case B remains:** `getEstimatedBusinessWorth`'s Case B branch is untouched by every other increment in this Plan — Increment 1 only removes Fecho's own separate baseline-resolution fallback, a different function entirely.
- **Product Memory historical lookup remains:** `productMemoryPriceResolution.ts` is untouched by every increment in this Plan; its behavior is an automatic consequence of historical-record preservation, requiring no code change (Specification §44.2, declarative).
- **Legitimate legacy correction/viewing:** `InitialStockCountView.tsx`'s viewing/correction paths (Void & Redo, SuperAdmin recovery) remain reachable, per Increment 3's finding that no rules change beyond Increment 2 is needed.

**Required action for this increment:** a targeted regression run of the existing tests already covering each of the above (`tests/business-worth-estimated-and-dashboard.test.ts`, `tests/product-memory-price-resolution.test.ts`, `tests/product-detail-modal-stock-count-history.test.ts`, `tests/initial-stock-void-redo.test.ts`) after Increments 1–4 ship, confirming none regress. **No new test is authored by this increment** — its entire function is to prove the other increments didn't accidentally break something Decision 39 requires preserved.

---

### Increment 6 — Expected Current Stock Value Terminology

**Governing basis:** BDR Decision 39(g); Specification §44.1, FR-70.

**Exact finding, corrected from the source instruction's assumption:** this copy is **not** sourced from an i18n key at all — it is hardcoded directly in JSX, Portuguese-only, at `apps/tenant/src/components/PeriodicStockCountView.tsx`, lines 3635–3636:
```jsx
Esta contagem regista o que existe fisicamente em stock agora. Será comparada com o{' '}
<strong className="text-[#111827] font-semibold">Valor Esperado de Stock</strong> — o Capital Inicial mais o
valor (a custo) do stock em lote atualmente registado — para mostrar se o valor do seu inventário
corresponde ao que o sistema esperava.
```
There is no `en.ts`/`fr.ts` equivalent key to update in parallel — this string exists only in this one component, in Portuguese, un-internationalized. This is reported precisely rather than assumed to follow the app's usual i18n-key pattern, per the instruction not to guess.

**Exact change — copy only, arithmetic untouched (FR-70):** the phrase "o Capital Inicial mais o" must not name Capital Inicial for a business without one. Two options, both consistent with FR-70, neither decided here (a copy-writing detail, not a business decision):
- (a) Conditional copy: render one of two variants depending on `hasInitialStockCount`, preserving the current wording verbatim for a legacy business that has one, and a generic wording ("o valor de compras registadas") for a business that doesn't.
- (b) Single generic wording for all businesses, dropping the Capital-Inicial-specific phrase unconditionally, accepting a minor loss of precision for the shrinking legacy population that does have one.

**`expectedCurrentStockValue` formula itself (`AppContext.tsx` line 1450, `initialCapitalValue + totalInvestmentValueAllTime`): explicitly and completely unchanged by this increment**, per FR-70's own explicit boundary.

**Tests to add:** a new test asserting the explanatory copy does not contain the literal string "Capital Inicial" when `hasInitialStockCount` is false (if option (a) above is chosen) — exact test file/location to be determined at implementation time, likely a new addition to an existing `PeriodicStockCountView`-adjacent test file, none of which currently exercises this specific copy (confirmed by investigation — no existing test asserts this string).

---

### Increment 7 — Reports / Terminology (Three-Surface Correction)

**Governing basis:** this is the pre-existing, already-authorized Increment 10 item 7 of the Business Worth Evolution Implementation Authorization ("Dashboard/report three-surface terminology correction," Specification §32) — **not a new item this Plan introduces**, but one this Plan confirms remains outstanding and correctly sequenced here.

**Exact files, already named in that prior Authorization:** the Dashboard Business Worth summary modal (`DashboardView.tsx`), `apps/tenant/src/components/reports/CapitalGrowthReport.tsx`, `apps/tenant/src/components/reports/BusinessWorthReport.tsx`.

**Scope, restated, not redesigned:** each surface must display "Business Worth" (Estimated, where applicable) pre-establishment and "Current Business Worth" post-establishment (either method), with historical Capital Inicial data relocated to display only, never deleted — exactly as that prior Authorization's own AC-R3-7 already specifies. **No formula in either report is changed** — `CapitalGrowthReport.tsx`'s and `BusinessWorthReport.tsx`'s existing `hasInitialStockCount`-driven display branches (confirmed present at lines 18/22, 48, 61, 74, 89, 103, 108, 143, 155, 167 across the two files) are a display-layer concern this increment corrects the *labels* of, not the *values*.

**This Plan does not re-derive new requirements for this increment** — it is sequenced here because it is a natural companion to Increment 6's terminology work, not because this Plan's own governance chain introduces anything beyond what the prior Authorization already settled.

---

### Increment 8 — "Produtos" → "Dashboard" Rename

**Governing basis:** BDR Decision 39(j)/(m); Decision Proposal §12 — confirmed independent of every other increment, SAFE/NO IMPACT.

**Exact 3-string change:**
- `apps/tenant/src/i18n/locales/en.ts`, line 235: `dashboard: { label: 'Products', shortLabel: 'Products' }` → `{ label: 'Dashboard', shortLabel: 'Dashboard' }`.
- `apps/tenant/src/i18n/locales/pt.ts`, line 1387: `dashboard: { label: 'Produtos', shortLabel: 'Produtos' }` → `{ label: 'Dashboard', shortLabel: 'Dashboard' }`.
- `apps/tenant/src/i18n/locales/fr.ts`, line 235: `dashboard: { label: 'Produits', shortLabel: 'Produits' }` → `{ label: 'Dashboard', shortLabel: 'Dashboard' }`.

(Exact casing — `Dashboard` vs `DASHBOARD` — is a copy-style detail for implementation time; the source Decision Proposal used all-caps in its own text but this is not itself a fixed business requirement.)

**Confirmed unchanged, by direct code trace, not assumption:** `navigationTabs.ts`'s `id: 'dashboard'`, its `icon: LayoutDashboard`, and its route — no other file references this label string (confirmed by repository-wide grep in the original investigation; re-confirmed unaffected by every intervening governance change, since none of those touched `apps/`).

**Tests:** none currently assert this literal string (confirmed by investigation) — no test file requires updating for this increment.

**Rollback:** trivial — three string reverts, no data, no logic.

---

### Increment 9 — Test and Regression Matrix

**Full test classification, per the instruction's own three categories:**

| Test file | Classification | Reason |
|---|---|---|
| `tests/fecho-baseline-anchored-closing.test.ts` | **Must be updated** | Tests 7, 9 updated; test 8 retired (Increment 1) |
| `tests/firestore-rules.test.ts` | **Must be updated** | New create-denial tests added for the two closed branches (Increment 2); existing periodic/redo tests must keep passing unmodified |
| `tests/initial-stock-void-redo.test.ts` | **Must remain, unmodified** | Proves the redo branches still work — a regression guard for Increment 2's own "redo untouched" claim |
| `tests/superadmin-initial-stock-recovery-authorization.test.ts` | **Must be updated** | New cutover-denial test added (Increment 3) |
| `tests/superadmin-initial-stock-recovery-consumption.test.ts` | **Must remain, unmodified** | Regression guard proving pre-cutover-granted authorizations still consume correctly |
| `tests/initial-stock-confirmation.test.ts` | **Must be updated** | Currently exercises successful `initial` confirmation creation — the "happy path" it tests is retired; must be re-scoped to prove creation is now denied, or split so any still-valid sub-behavior (e.g., item-level validation logic reused elsewhere) is preserved separately. **Exact reclassification of individual test cases within this file is an implementation-time task**, not fully resolved by this Plan — flagged, not guessed. |
| `tests/initial-stock-dual-valuation-basis.test.ts`, `-wiring.test.ts` | **Must remain, unmodified** | Test the valuation-basis mechanics of an *existing* Capital Inicial record, unaffected by closing the creation path |
| `tests/initial-stock-grouped-ux.test.ts`, `-live-total-valuation-basis.test.ts`, `-multi-level-unit-chain.test.ts`, `-multi-portion-valuation.test.ts`, `-portion-grouping-wiring.test.ts`, `-price-change.test.ts` | **Must remain, unmodified** | All exercise the entry-form UX/valuation mechanics of the (still-existing, just no-longer-reachable-for-new-records) `InitialStockCountView.tsx` component's internal logic — none of these are creation-path-denial tests; reclassification deferred to implementation time pending direct inspection of whether each specifically drives through the create action or only through the component's internal computation, which this planning pass did not exhaustively re-verify test-by-test |
| `tests/superadmin-assisted-initial-stock-recovery.test.ts` | **Must remain, unmodified**, pending confirmation it does not itself attempt a post-cutover grant scenario already covered by Increment 3's new test | |
| `tests/expected-stock-value.test.ts` | **Must remain, unmodified** | Tests the `expectedCurrentStockValue` arithmetic, explicitly unchanged by Increment 6 |
| `tests/owner-portfolio-currentworth.test.ts` | **Must remain, unmodified** | Confirmed no Capital Inicial creation dependency |
| `tests/business-worth-cash-receivables-payables.test.ts` | **Must remain, unmodified** | Confirmed no Capital Inicial creation dependency |
| `tests/startup-investment.test.ts` | **Must remain, unmodified** | Confirmed no dependency on Capital Inicial creation |
| `tests/business-worth-estimated-and-dashboard.test.ts` | **Must remain, unmodified**, used as an Increment 5 regression check | |
| `tests/product-detail-modal-stock-count-history.test.ts` | **Must remain, unmodified**, used as an Increment 5 regression check | |
| `tests/product-memory-price-resolution.test.ts` | **Must remain, unmodified**, used as an Increment 5 regression check | |
| `tests/stock-count-label-undefined-fix.test.ts`, `stock-count-row-grouping.test.ts`, `stockcount-selling-price-basis-unit.test.ts` | **Must remain, unmodified** | Generic Stock Count mechanics, no creation-path dependency identified |
| `tests/add-stock-flush-on-exit.test.ts`, `draft-save-server-verification.test.ts`, `periodic-contagem-*`, `periodic-stock-*` | **Must remain, unmodified** | Confirmed periodic-Contagem-only, unaffected by any increment in this Plan |

**Acceptance-level test matrix required across increments (mapped to the instruction's own list):**
- New Capital Inicial creation rejected → Increment 2, new tests.
- Periodic Contagem still allowed → Increment 2, existing tests, regression-checked.
- Historical Capital Inicial still readable → Increment 5, regression-checked.
- Case B still works → Increment 5, regression-checked via `business-worth-estimated-and-dashboard.test.ts`.
- Case A unaffected → Increment 1/5, regression-checked.
- Contagem establishment works → out of this Plan's scope (already-shipped, unaffected behavior) — regression-checked, not newly tested.
- Owner-Declared establishment works → same.
- Fecho has no Capital Inicial fallback → Increment 1, new/updated tests.
- In-flight recovery windows remain valid → Increment 3, regression-checked via `initial-stock-void-redo.test.ts` and `superadmin-initial-stock-recovery-consumption.test.ts`.
- New recovery attempts refused → Increment 3, new test.
- Expected Current Stock Value arithmetic unchanged → Increment 6, regression-checked via `expected-stock-value.test.ts`.
- Product Memory historical behavior preserved → Increment 5, regression-checked.
- Dashboard CTA no longer routes to Capital Inicial → Increment 4, new test.
- Produtos renamed to Dashboard → Increment 8, no test needed (no test asserts the string today).

---

## 3. Security / Rules Analysis

- **Tenant isolation:** unaffected by every increment — Increment 2 removes reachability of two `||` branches within an already-tenant-scoped `match /businesses/{businessId}/stockCounts/{stockCountId}` block; no cross-tenant read/write path is introduced or altered.
- **`isOwnerOf`:** unchanged on every touched rule — Increment 2's surviving branches (periodic, redo) keep their existing `isOwnerOf(businessId)` guard verbatim.
- **`subscriptionAllowsNewRecords`:** the two closed branches currently carry this guard; removing them removes the guard along with the branch — no orphaned or weakened guard results, since the entire branch is deleted, not narrowed.
- **`request.time`:** Increment 3's new server-side cutover check uses the same trusted-clock discipline (`clock.now()`, this file's existing injected `TimestampFactory`) already used throughout this file — no client-supplied timestamp is introduced.
- **`resource.data` timestamps:** untouched — Increment 2 does not modify the redo branches' existing `confirmedAt == request.time` verification.
- **Cutover enforcement:** resolved precisely in Increment 3's finding — enforced at the rules layer implicitly (via Increment 2's closure preventing any new chain) for Void & Redo, and explicitly at the server layer (a new precondition) for SuperAdmin-granted authorizations only, since that is the sole path with no natural self-limitation.
- **Periodic Contagem rules:** confirmed untouched by direct inspection of the exact `allow create`/`allow update, delete` text — the non-`'initial'` branch and the unconditional-refusal-for-`'initial'`-only `update, delete` rule are both left byte-for-byte as they are today.

---

## 4. Data Preservation

Explicitly, and by construction of every increment above:
- **No historical `stockCounts/initial*` document is deleted** — no increment issues a `delete`; Increment 2 only removes reachability of a `create` branch.
- **No historical record is rewritten** — no increment issues an `update` to any `stockCounts` document of any type.
- **No `BusinessWorthSnapshot` is fabricated** — Increment 1 removes a *display*-layer fallback (Fecho's baseline resolution); it does not create, backfill, or infer any snapshot document. No increment writes to the `businessWorthSnapshots` collection at all.
- **No snapshot is backfilled** — confirmed, no increment in this Plan writes any new document to that collection for a historical event.
- **No historical Timeline event is altered** — no increment touches `logTimelineEvent` or any existing Timeline document; the "Capital Inicial registado" event type remains exactly as historically written for every existing business.

---

## 5. Migration

**No data migration is required.** Every increment in this Plan is achievable as a pure code/rules change against the existing data model, with zero transformation of existing documents. This matches the expected direction the governing instruction anticipated; investigation found no fact requiring deviation from it.

---

## 6. File-by-File Scope

**Files to modify:**
| Increment | File |
|---|---|
| 1 | `apps/tenant/src/utils/calculations.ts` (`resolveActiveBusinessWorthBaselineDate`) |
| 1 | `apps/tenant/src/context/AppContext.tsx` (2 call sites, lines 1369, 6185) |
| 1 | `apps/tenant/src/components/ClosingView.tsx` (no-baseline message wiring — exact location to be confirmed at implementation time) |
| 2 | `firestore.rules` (`stockCounts` `allow create`, lines 657–724) |
| 3 | `server/initialStockRecoveryAuthorization.ts` (`grantInitialStockRecoveryAuthorization`, line 126) |
| 4 | `apps/tenant/src/App.tsx` (`handleNavigateToInitialStockCount`) |
| 4 | `apps/tenant/src/components/DashboardView.tsx` (KPI card onClick, Business Worth Modal row) |
| 4 | `apps/tenant/src/components/InitialStockPriceChangeModal.tsx` (no-record fallback) |
| 4 | `apps/tenant/src/i18n/locales/{en,pt,fr}.ts` (`dashboard.kpi.initialCapital.descUnset`) |
| 6 | `apps/tenant/src/components/PeriodicStockCountView.tsx` (lines 3635–3636, hardcoded copy) |
| 7 | `apps/tenant/src/components/DashboardView.tsx`, `reports/CapitalGrowthReport.tsx`, `reports/BusinessWorthReport.tsx` (terminology only — pre-existing, already-authorized item) |
| 8 | `apps/tenant/src/i18n/locales/{en,pt,fr}.ts` (`nav.tabs.dashboard.label`/`.shortLabel`) |

**Files to test (new or updated tests):**
`tests/fecho-baseline-anchored-closing.test.ts`, `tests/firestore-rules.test.ts`, `tests/superadmin-initial-stock-recovery-authorization.test.ts`, `tests/initial-stock-confirmation.test.ts`, plus one new test location for Increment 4's Dashboard CTA change and one for Increment 6's copy assertion (exact file to be created or extended at implementation time).

**Files that must NOT be modified by this implementation, confirmed explicitly:**
`apps/tenant/src/utils/calculations.ts`'s Case A/Case B formula functions (`getCurrentBusinessWorth`, `getEstimatedBusinessWorth`, `computeMeasuredBusinessWorth`) beyond Increment 1's own narrow function; `apps/tenant/src/lib/productMemoryPriceResolution.ts`; `server/initialStockRecoveryConsumption.ts`; `InitialStockCountView.tsx`'s own internal viewing/correction logic; any `firestore.indexes.json` entry; `ProductDetailModal.tsx`; every file listed as "must remain, unmodified" in §2's Increment 9 table.

---

## 7. Acceptance Criteria

- AC-1: A create attempt on `stockCounts/initial` with no `chainPosition`, or with `chainPosition: 1`, is denied for every business, verified against a real Firestore Rules Emulator, not source inspection alone.
- AC-2: A create attempt on `stockCounts` with any non-`'initial'` type continues to succeed, byte-for-byte unchanged, for an Owner with an active subscription.
- AC-3: A redo create (`initial-2`/`initial-3`/`initial-4`) given a valid, pre-existing `voidRecords` document for the correct predecessor continues to succeed, unchanged.
- AC-4: `resolveActiveBusinessWorthBaselineDate` returns `null` whenever no active `BusinessWorthSnapshot` exists, regardless of whether a historical `initial` StockCount exists, verified by unit test.
- AC-5: `grantInitialStockRecoveryAuthorization` denies any new grant attempt made after the defined cutover, with the exact `retirement-cutover-reached` outcome, verified by unit test.
- AC-6: `grantInitialStockRecoveryAuthorization` continues to succeed for any grant attempt made before the cutover, unchanged.
- AC-7: Consuming an authorization granted before cutover succeeds after cutover, within its own `expiresAt`, unchanged.
- AC-8: The Dashboard's null-state Business Worth KPI card no longer navigates to `InitialStockCountView`; it navigates to the Contagem/Declare choice.
- AC-9: `expectedCurrentStockValue`'s numeric output is provably identical, before and after Increment 6, for the same input data — verified by unit test, not visual inspection.
- AC-10: No existing test proving historical Capital Inicial data remains readable, drillable, or usable by Product Memory/Case B regresses.
- AC-11: The three nav-label strings render as intended in all three locales, with `id: 'dashboard'`, its route, and its icon confirmed unchanged by direct code diff.
- AC-12: Zero historical `stockCounts`, `voidRecords`, `initialStockRecoveryAuthorization`, or Timeline document is deleted, rewritten, or its field values altered, verified by a before/after data snapshot comparison in the emulator test suite.

---

## 8. Rollback / Failure Safety

| Increment | What could go wrong | Detected by | Independently revertible? | Affects existing data? |
|---|---|---|---|---|
| 1 | A caller not updated for the removed parameter fails to compile | TypeScript build (`npx tsc --noEmit`), immediate | Yes — revert the function/call sites | No |
| 2 | A legitimate redo is accidentally blocked by an overly broad rule edit | `tests/initial-stock-void-redo.test.ts` regression failure in the Firestore Rules Emulator | Yes — revert the two removed clauses | No |
| 3 | A legitimate post-cutover consumption of a pre-cutover grant is accidentally blocked | `tests/superadmin-initial-stock-recovery-consumption.test.ts` regression failure | Yes — revert the new precondition | No |
| 4 | The Contagem/Declare chooser fails to render, leaving a business with no path to establish Business Worth | Manual QA / new Dashboard test failure | Yes — revert `onClick` targets | No |
| 5 | A regression is found in a "must remain unmodified" test | The named regression test itself fails | N/A — this increment makes no change to revert | No |
| 6 | The conditional copy branch renders incorrectly for a legacy business | New copy-assertion test failure | Yes — revert the JSX change | No |
| 7 | A report mislabels a figure | Existing report tests / new terminology test failure | Yes — revert label text | No |
| 8 | An unrelated label accidentally changes alongside the intended three | Direct diff review before merge | Yes — revert the three string edits | No |

No increment in this Plan writes, migrates, or transforms persisted data in either direction — every rollback is a pure code/rules revert with no data-recovery step required.

---

## 9. Governance Mapping

| Implementation item | Decision Proposal § | Rule 8 Finding | BDR Decision 39 | Specification § | Architecture | Prior Authorization reused |
|---|---|---|---|---|---|---|
| Increment 1 (Fecho) | §8 | FB-1 | 39(i) | §18/FR-25 | — | §24 (already signed) |
| Increment 2 (creation disabled) | §1, §11 | SEC-1 | 39(a) | §44 (context) | §5.4, §8.6 | — |
| Increment 3 (grandfathering) | §9 | RS-1 | 39(f) | — | — | Void & Redo (`BDR-0015`/`POL-0008`), SuperAdmin Recovery (`BDR-0016`/`POL-0009`) mechanics reused unmodified |
| Increment 4 (nav/UI) | §11 | — | 39(a), 39(c) | §44 (context) | §5.4 | Contagem/Declare screens (Increments 1–10 of base Authorization) reused unmodified |
| Increment 5 (legacy preservation) | §2, §5 | — | 39(b), 39(e), 39(h) | §44.2, §44.3 | — | Case B/Product Memory mechanics reused unmodified |
| Increment 6 (Expected Current Stock Value copy) | §6 | CS-1 | 39(g) | §44.1/FR-70 | — | `10-expected-stock-value-amendment.md` (unmodified) |
| Increment 7 (reports terminology) | — | — | 39(j) references only | §32 | — | Base Authorization §22–§29 (Increment 10 item 7, already authorized, not yet shipped) |
| Increment 8 (rename) | §12 | — | 39(j) | — | — | — |
| Increment 9 (tests) | — | all findings | all items | all sections | — | — |

No row above introduces a requirement not traceable to the accepted governance chain named in §1.

---

## 10. Final Implementation Gate

**IMPLEMENTATION PLAN STATUS: DRAFT — NOT AUTHORIZED.**

This document is a plan only. It does not authorize any code, test, `firestore.rules`, or `firestore.indexes.json` change. The next gate is a separate Product Architect review and signature of this Implementation Plan, exactly as this repository's established pattern requires (mirroring the Business Worth Evolution capability's own Plan → Authorization sequence) — followed by a separate, signed Implementation Authorization, which itself must specify the one-increment-at-a-time execution discipline this repository consistently applies to every prior capability. Neither the Plan's acceptance nor an Implementation Authorization is created, drafted, or implied by this document.

---

## Product Architect Acceptance — Recorded

**Status: ✅ ACCEPTED AS PLANNED — SIGNED (31 August 2026).** Recorded additively below, per this repository's established signature-recording convention — every section above, including §10's own "DRAFT — NOT AUTHORIZED" status line, is preserved unedited as the historical record of what was circulated for review; this section is the actual, dated act of acceptance.

> I ACCEPT the Implementation Plan — Retirement of Capital Inicial as an Active Sabush BPT Business Concept.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ✅ ACCEPTED AS PLANNED

**This acceptance confirms I have reviewed and accepted, in full:**
- Increment 1 — Fecho Baseline Correction.
- Increment 2 — disabling new Capital Inicial creation.
- Increment 3 — grandfathering legitimate in-flight recovery windows.
- Increment 4 — removal of Capital Inicial from active establishment/navigation paths.
- Increment 5 — preservation of legacy Capital Inicial functionality/data.
- Increment 6 — Expected Current Stock Value terminology correction.
- Increment 7 — reports terminology correction.
- Increment 8 — "Produtos" → "Dashboard".
- Increment 9 — the regression/test matrix.
- §7's Acceptance Criteria.
- §8's rollback/failure-safety provisions.
- §9's governance mapping and §1's implementation boundaries.

**Authorization boundary — stated explicitly.** This signature **accepts the Implementation Plan** and **authorizes progression to the next governance gate: preparation/recording of a separate Implementation Authorization.** It does **NOT** itself authorize:
- immediate code implementation;
- modification of `firestore.rules`;
- modification of application code;
- modification of server code;
- modification of tests;
- modification of `firestore.indexes.json`;
- deletion or migration of historical Capital Inicial data;
- deletion of `InitialStockCountView.tsx`;
- deletion of the Void & Redo subsystem;
- deletion of SuperAdmin-Assisted Recovery;
- or any implementation work not covered by a subsequently signed Implementation Authorization.

Each of the above remains a separate, later, explicitly-gated step, to be taken only on its own separate instruction.
