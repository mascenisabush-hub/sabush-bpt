Product Architect Decision Proposal

# Retirement of Capital Inicial as an Active Sabush BPT Business Concept

**Status:** 🔶 **PROPOSAL — AWAITING PRODUCT ARCHITECT SIGNATURE.** Not yet accepted, not yet authorized. Signing this proposal authorizes progression to a dedicated Rule 8 Assessment only — it does **not** authorize any code, `firestore.rules`, test, or governance-document change, and does not itself amend any document it names below.
**Prepared by:** Lead Software Engineer session, from direct repository investigation (two prior investigation passes, both read-only; working tree verified clean before and after each).
**Repository state investigated:** `main` @ `f88dfa3`.
**Governing basis this proposal sits on top of, without amending in place:** `BDR-pending-business-worth-evolution-measurement-model.md`, `POL-pending-business-worth-evolution-policy.md` (`POL-0010`), `business-worth-evolution-specification.md` (incl. §41–§43), `docs/engineering/business-worth-evolution-rule8-assessment.md`, `docs/engineering/business-worth-evolution-implementation-authorization.md` (incl. Revision 3 / §22–§31), `docs/architecture/05-business-lifecycle.md`, `docs/architecture/08-module-architecture.md`.
**Relationship to that basis:** this proposal does not reopen the Business Worth Evolution capability's own decisions (Contagem valuation, Cash Ledger, Receivables, Payables, Owner-Declared Business Worth) — those stand, unamended. It resolves the one item that capability's own governance chain left open: **what happens to Capital Inicial itself**, including one explicit reversal of a decision that chain made (§10, item (i), below).

---

## 1. Capital Inicial Creation — Permanently Disabled

**Decision proposed:** No business — new or existing — may create a new Capital Inicial confirmation after this proposal's effective date. This applies to the original confirmation and to every redo slot (`initial`, `initial-2`, `initial-3`, `initial-4`).

**What this requires, precisely:**
- `firestore.rules`: close the `stockCounts` `allow create` branch for `type == 'initial'` (all four sub-branches: legacy-shape, new-shape, and the two active redo slots not already exhausted).
- `apps/tenant/src/App.tsx` / `DashboardView.tsx` / `InitialStockPriceChangeModal.tsx`: remove the three creation-entry-point wirings to `onNavigateToInitialStockCount` (§11, below).
- `InitialStockCountView.tsx` itself is **not deleted** — see §9.

**What this does not require:** any change to the calculation layer beyond what's already true today (Capital Inicial already contributes to Current Business Worth in zero cases — Case A never reads it).

## 2. Historical Capital Inicial — Preserved

**Decision proposed:** Every existing `stockCounts/initial*` document, every `voidRecords` entry, every `initialStockRecoveryAuthorization` record, and every Timeline event referencing Capital Inicial remains exactly as it is — unedited, undeleted, unmigrated, permanently.

**Basis:** this is not a new decision — it restates and re-affirms BDR Decision 25 ("Historical Capital Inicial values remain untouched — never deleted, rewritten, or fabricated") and Decision 26 ("no destructive migration and no fabrication of historical financial-position data"), both already signed. This proposal changes nothing about them; it only confirms they continue to bind after Capital Inicial's active retirement.

**Consequence, confirmed by direct code trace:** `stockCounts/initial*` is already in Architecture §7.6's "truly immutable, no exceptions" tier (`update`/`delete` unconditionally refused, Owner included) — no additional protection needs to be added to preserve it; the existing protection already suffices.

## 3. New Businesses — Initial Investment + Contagem/Declaration

**Decision proposed:** A genuinely new business's establishment path becomes, exclusively:

```
Business creation
   → (optional, repeatable) +Stock / Expense activity, tracked via
      Startup Investment (Investimento Inicial)
   → whenever the Owner is ready: Contagem OR Declare Business Worth
   → first BusinessWorthSnapshot
   → Current Business Worth
```

Capital Inicial does not appear anywhere in this path, as an option or otherwise.

**Basis, confirmed by direct trace, not assumption:** Startup Investment already correctly aggregates pre-establishment `PurchaseBatch`/`Expense` spending plus a residual `startupInvestmentEntries` collection for labor/wages/licenses, entirely independent of whether a Capital Inicial was ever confirmed (Spec §13; FR-16, FR-17, FR-52). Contagem and Owner-Declared Business Worth both already independently produce a `BusinessWorthSnapshot` with zero code-path dependency on Capital Inicial (`DeclareBusinessWorthView.tsx` — zero references, confirmed by direct grep). **No new capability needs to be built for this section — it is already fully functional today for any business that has always skipped Capital Inicial.**

## 4. Existing (Already-Operating) Businesses — Contagem/Declaration + Cash/Debts

**Decision proposed:** An already-operating business establishes or re-establishes its Business Worth exclusively through:
- Contagem of physical stock, valued at **selling price**;
- Owner-confirmed **physical cash position** (Cash Ledger);
- **Receivables** (money owed to the business) — contributing only once actually paid;
- **Payables/Dívida** (money the business owes) — contributing once as an outstanding liability, never double-counted on payment.

Capital Inicial has no role in this path, whether or not the business happens to have a historical Capital Inicial record (see §5 for the one narrow, time-limited exception during transition).

**Basis:** this is the live Case A formula, already shipped and unchanged by this proposal:
```
CurrentBusinessWorth = latest.measuredBusinessWorth
  + embeddedProfitSinceSnapshot
  − expensesSinceSnapshot
  − levantamentosSinceSnapshot
  + (payablesPositionChange + cashLedgerNet[customer-payment, supplier-payment])
```
This formula has never read Capital Inicial, at any point since Increment 1 shipped.

## 5. Case B / State 1a — Exact Treatment [DECISION PROPOSED]

**The question:** State 1a (a business with a preserved historical Capital Inicial and no `BusinessWorthSnapshot` yet) is, by definition, dependent on Capital Inicial's continued existence as a data source. Retiring Capital Inicial as an *active concept* does not automatically answer what happens to this state.

**Options considered:**
- **(a) Permanent legacy accommodation** — keep State 1a's logic exactly as shipped, indefinitely, but structurally closed to new membership (no business can enter it after this proposal, since no new Capital Inicial can ever be created). Each pre-existing State-1a business exits at its own pace, whenever it performs its own first post-retirement Contagem or Declaration — never forced, never scheduled.
- **(b) Time-boxed sunset** — require every pre-existing State-1a business to transition within a fixed grace period, after which Case B is retired and any business that hasn't transitioned reverts to UNKNOWN.
- **(c) Automatic conversion** — synthesize an Owner-Declared `BusinessWorthSnapshot` from each business's historical Capital Inicial value at cutover, closing State 1a immediately for everyone.

**Proposed resolution: Option (a).** Reasoning: (b) introduces a forced action/gate — the exact pattern this whole retirement is designed to remove — applied instead to the *exit* from a legacy state, which is inconsistent. (c) risks fabricating a snapshot the Owner never actually confirmed at that value, in tension with this codebase's own repeated "never a fabricated figure" discipline (`02-business-worth-engine.md`'s own governing comment; POL-0010 FIN-2). (a) requires zero new mechanism, contradicts no signed decision, and is a strict continuation of what Decision 25/26 already committed to ("historical Capital Inicial... used as the starting baseline for Estimated Business Worth during transition").

**Consequence of (a):** State 1a's code (`getEstimatedBusinessWorth` Case B branch) is retained permanently as a closed, non-growing legacy path. It requires no new governance beyond confirming this proposal's acceptance of it as intentional, not overlooked.

## 6. Expected Current Stock Value — Exact Treatment [DECISION PROPOSED]

**The question:** `expectedCurrentStockValue = initialCapitalValue + totalInvestmentValueAllTime` is a separate, currently-shipping Module #10 feature (the Contagem reconciliation baseline, "Physical Counted Value − Expected Current Stock Value"), unrelated to the Business Worth Evolution chain, that unconditionally reads Capital Inicial.

**Options considered:**
- **(a) Leave the arithmetic and the UI copy exactly as-is.** For a business with no Capital Inicial, this already degrades to `0 + totalInvestmentValueAllTime` — a defined, intentional, non-error value (documented in `10-expected-stock-value-amendment.md` Part 2). Risk: the existing UI copy explicitly names "Capital Inicial" in its explanation (`PeriodicStockCountView.tsx`: *"...o Capital Inicial mais o valor... do stock em lote..."*), which becomes misleading terminology for any business that never had one.
- **(b) Keep the arithmetic unchanged; correct only the explanatory copy** so it no longer names Capital Inicial for a business that doesn't have one (e.g., "valor de compras registadas" in place of the Capital-Inicial-specific phrasing), while continuing to show the correct combined figure for a legacy business that still has one.
- **(c) Redesign the comparison baseline itself** (e.g., substitute Cash/Receivables/Payables terms, or key it off `BusinessWorthSnapshot`).

**Proposed resolution: Option (b).** Reasoning: (c) would redesign an already-approved Module #10 feature that is not part of the Business Worth formula at all — explicitly out of this proposal's authorized scope ("do not redesign the Business Worth formula unless the existing signed model genuinely depends on Capital Inicial in a way that contradicts this direction" — Expected Current Stock Value is not the Business Worth formula, and its dependency, while real, does not contradict this direction; it just needs its wording fixed). (a) leaves a real, user-visible terminology leak. (b) is the minimal, correct fix: **no formula change, a copy-only correction**, scoped to `PeriodicStockCountView.tsx` and its i18n strings.

## 7. Product Memory — Preserve Historical Usefulness

**Decision proposed:** `productMemoryPriceResolution.ts`'s existing behavior — treating a historical Capital Inicial confirmation as a valid source of "last remembered price," on equal footing with a periodic Contagem confirmation — is **preserved, unchanged, permanently.**

**Basis:** this is a direct, mechanical consequence of §2 (historical preservation). Because no historical Capital Inicial record is ever deleted, and because this function already reads whichever confirmation (`initial` or periodic) is most recent for a given product, **no code change is required here at all.** This section exists in this proposal only to make explicit what would otherwise be an easy-to-miss side effect: if a future, separate decision ever proposed deleting historical Capital Inicial records (which this proposal does not), any product whose only price history came from a Capital Inicial confirmation would silently lose that memory. Recording this dependency explicitly is this section's entire purpose.

## 8. Fecho — Implement the Already-Authorized Capital Inicial Fallback Removal

**Decision proposed:** Ship the already-signed but unbuilt correction (Implementation Authorization §24, "Post-Implementation Correction — Fecho Baseline / Capital Inicial Fallback Removal") as part of this retirement's Phase 1, not as a separate future decision.

**Current code, confirmed unchanged since the last investigation** (`calculations.ts`, `resolveActiveBusinessWorthBaselineDate`):
```js
if (active.length > 0) return latestSnapshot.confirmedAt-derived date;
if (!initialStockCount) return null;
return initialStockCount.createdAt;   // ← must be removed
```

**Required behavior, exactly as already signed:** Fecho's baseline resolves **exclusively** from the latest active `BusinessWorthSnapshot.confirmedAt`, of either `establishmentMethod`. When none exists, Fecho has no baseline — full stop, regardless of whether a historical Capital Inicial exists — and the Owner sees the already-approved message: *"Estabeleça primeiro o Valor do Negócio através de uma Contagem ou de um Valor de Negócio Declarado para utilizar o Fecho."*

**No new decision is required here** — this is execution of governance that already exists and is already signed; it should not be re-litigated, only implemented, with its own named regression check (`tests/fecho-baseline-anchored-closing.test.ts`, currently exercising the fallback this removes — that test needs updating, not the behavior it tests re-deciding).

## 9. Void & Redo / SuperAdmin-Assisted Recovery — Legacy Handling [DECISION PROPOSED]

**The question:** these two mechanisms (`voidRecords`/`firestore.rules`, `initialStockRecoveryAuthorization.ts`/`initialStockRecoveryConsumption.ts`) exist solely to correct a Capital Inicial confirmation. §1 disables *creating new* Capital Inicial confirmations — it does not by itself say what happens to a legacy business that is still, at the moment of cutover, inside an active correction window.

**Options considered:**
- **(a) Freeze both mechanisms immediately at cutover** — no Void & Redo or SuperAdmin authorization may be invoked after this proposal takes effect, even for a window that was already open. Risk: a business mid-correction loses its remaining eligibility abruptly, with no recourse.
- **(b) Grandfather in-flight windows; refuse new ones going forward.** Any Void & Redo window (12-hour Owner) or SuperAdmin authorization (48-hour) already open at the moment of cutover remains valid until its own natural, already-governed expiry. No new void may be *initiated* on a record that was not already inside an active correction at cutover. Once every such window naturally expires — bounded, on the order of days, never indefinite — the mechanism becomes permanently dormant; its actual code/rules removal is deferred to a separate, later, non-urgent housekeeping decision, not decided here.
- **(c) Keep both mechanisms live indefinitely** for any legacy Capital Inicial record, forever, regardless of cutover timing.

**Proposed resolution: Option (b).** Reasoning: (a) is abrupt and punitive toward a business with a legitimate, already-governed correction in progress, for no safety reason. (c) keeps a whole governed subsystem (rules branches, two server files, three dedicated test files, a 4-confirmation ceiling) permanently open-ended for a purpose (§1) that has just been explicitly closed — an unnecessary, indefinite maintenance burden with no corresponding benefit once every in-flight window has naturally expired. (b) closes the door going forward, honors every commitment already made to a business mid-correction, and defers the only genuinely optional part (actual code deletion) to a future, lower-stakes decision — consistent with this proposal's own instruction not to conflate "remove as workflow" with "remove from schema."

**What this requires, precisely:** a single `firestore.rules` change to the redo-branch `allow create` guard, adding a cutover-timestamp condition scoped only to the redo branches (the original-confirmation branches are already closed by §1) — a Rule 8-stage detail, not decided further here.

## 10. Governance Amendments Required

**This is the section most likely to be underestimated if this proposal is treated as "just an implementation task."** Direct trace of what actually needs amending:

**(i) `BDR-pending-business-worth-evolution-measurement-model.md`, Decision 1 — a required reversal, not an extension.** Decision 1, as corrected 23 August 2026, currently reads: *"a new business may confirm Capital Inicial, may skip it entirely... or may do both, in either order."* This is a specific, deliberate, recently-signed decision that **affirmatively preserves Capital Inicial as an available option.** §1 of this proposal directly reverses it. This cannot be treated as a Specification-level or implementation-level detail — it requires its own explicit Product Architect corrective pass to Decision 1, on the record, the same way the 23 August correction itself was made.

**(ii) `docs/architecture/05-business-lifecycle.md` §5.4 and `08-module-architecture.md` §8.6 — an Architecture-tier amendment, the first this capability has ever required.** Architecture §5.4 names "Initial Stock Count" as a named, one-time, ordered lifecycle stage for a new business; §8.6 names `InitialStockCountView.tsx` in the approved module map. Per `CLAUDE.md`'s own Hard Rule #1 ("Never change approved architecture without explicitly explaining why"), retiring this stage requires an explicit Architecture amendment — every other document in the Business Worth Evolution chain (BDR, POL, Specification, Rule 8, Plan, Authorization) sits *below* Architecture in the pyramid and has never needed to touch it. This proposal is the first to require doing so.

**(iii) A new or amended Specification section** covering: the Expected Current Stock Value terminology correction (§6), the explicit Product Memory preservation statement (§7), and the State 1a permanent-legacy-accommodation decision (§5) — none of which any existing Specification currently addresses, because the existing Business Worth Evolution Specification was never scoped to "what if Capital Inicial creation is fully disabled," only to "what if it's no longer an establishment mechanism."

**(iv) A dedicated Rule 8 Assessment, scoped specifically to retirement.** The existing `business-worth-evolution-rule8-assessment.md` evaluated a materially smaller change (de-prioritizing Capital Inicial's calculation role) — it never assessed closing the `stockCounts` create-rule branch, the Void & Redo cutover question (§9), or the Architecture amendment. Reusing that Rule 8 Assessment's "READY FOR IMPLEMENTATION" verdict for this proposal would be a governance error — a new one is required.

**(v) A new Implementation Plan and Implementation Authorization**, following this repository's own established one-item-at-a-time discipline, once (i)–(iv) above are each separately signed.

**What does NOT need to change:** the Business Worth formula itself (Case A, Case B's arithmetic, the Cash Ledger/Receivables/Payables model) — none of it depends on Capital Inicial in a way this proposal contradicts; §1–§9 above are compatible with every existing formula, unmodified.

## 11. Remove Capital Inicial from Active Navigation/UI

**Decision proposed:** the three confirmed creation-entry points are removed/repointed; the historical/correction surfaces are kept.

| Entry point | File | Disposition |
|---|---|---|
| Dashboard primary Business Worth KPI card (State 1, `displayedBusinessWorthValue === null`) | `DashboardView.tsx` | Repoint from `onNavigateToInitialStockCount` to a Contagem/Declare chooser |
| Business Worth Modal's "Capital Inicial" breakdown row | `DashboardView.tsx` | Remove for a business with no historical record; keep, read-only, for one that has |
| `InitialStockPriceChangeModal`'s no-record fallback | `InitialStockPriceChangeModal.tsx` | Remove the "create one now" offer |
| Void & Redo entry (Owner) | `InitialStockCountView.tsx` | Kept, per §9(b), until natural expiry |
| SuperAdmin-Assisted Recovery entry | `apps/superadmin/.../BusinessDetail.tsx` | Kept, per §9(b), until natural expiry |
| `ProductDetailModal`'s per-product count-history row labeled "Capital Inicial" | `ProductDetailModal.tsx` | Kept, unchanged — historical display, not a creation path |

`InitialStockCountView.tsx` is **not deleted** in this proposal — it becomes a correction/redo-only surface for a shrinking legacy population, per §5 and §9. Its outright deletion is explicitly deferred, not decided here.

## 12. Rename "Produtos" → "DASHBOARD"

**Decision proposed:** approved, independent of every decision above.

**Exact change, confirmed by direct trace, unchanged from prior investigation:**
- `apps/tenant/src/i18n/locales/en.ts` line 235: `dashboard: { label: 'Products', shortLabel: 'Products' }` → `{ label: 'DASHBOARD', shortLabel: 'DASHBOARD' }` (or a lower-case product-standard casing — a copy-style detail, not a governance question).
- `apps/tenant/src/i18n/locales/pt.ts` line 1387: `dashboard: { label: 'Produtos', shortLabel: 'Produtos' }` → `{ label: 'DASHBOARD', shortLabel: 'DASHBOARD' }`.
- `apps/tenant/src/i18n/locales/fr.ts` line 235: `dashboard: { label: 'Produits', shortLabel: 'Produits' }` → `{ label: 'DASHBOARD', shortLabel: 'DASHBOARD' }`.

**Confirmed unchanged:** the tab's internal `id: 'dashboard'` (`navigationTabs.ts`), its icon (`LayoutDashboard`), and its route — no evidence anywhere in the codebase supports changing any of these; the mislabeling was in display text only. No test references this string. **Classification: SAFE / NO IMPACT**, and entirely severable from §1–§11 — it can be authorized and shipped on its own schedule.

---

## What This Proposal Does and Does Not Authorize

**If signed, this proposal authorizes:** progression to a dedicated Rule 8 Assessment scoped exactly to §1–§11 (per §10(iv)), and independently, a small Rule 8/Implementation pass for §12 alone.

**If signed, this proposal does NOT:**
- Modify any code, test, `firestore.rules`, or `firestore.indexes.json` file.
- Modify `BDR-pending-business-worth-evolution-measurement-model.md`, `docs/architecture/05-business-lifecycle.md`, `08-module-architecture.md`, or any other governance document named above — each requires its own separate, explicit amendment (§10), not performed by this signature.
- Authorize deletion of any historical record, of `InitialStockCountView.tsx`, of the Void & Redo/SuperAdmin-recovery code, or of any test file.
- Reopen any decision from the Business Worth Evolution chain not named in §1–§9 above (Contagem's selling-price valuation, the Cash Ledger model, Receivables/Payables mechanics, Owner-Declared Business Worth — all unaffected).

**Open items this proposal explicitly flags rather than silently resolving:** the exact cutover timestamp mechanism for §9's grandfathering rule, and the exact final disposition (keep forever vs. later deletion) of the Void & Redo/SuperAdmin-recovery code once dormant — both are correctly Rule 8-stage technical questions, not Product-Architect-stage business decisions, and are named here so they are not lost.

---

## Signature

> I have reviewed this Decision Proposal for the Retirement of Capital Inicial, including the proposed resolutions at §5 (State 1a: permanent, closed legacy accommodation), §6 (Expected Current Stock Value: copy-only correction, arithmetic unchanged), and §9 (Void & Redo/SuperAdmin recovery: grandfather in-flight windows, refuse new ones, defer code removal). I understand this signature authorizes progression to a dedicated Rule 8 Assessment only, and does not itself modify any code, test, or governance document named above — each requires its own separate signature.
>
> **Product Architect:** _______________________________
> **Date:** _______________________________
> **Decision:** ☐ ACCEPTED AS PROPOSED &nbsp;&nbsp; ☐ ACCEPTED WITH MODIFICATIONS (specify) &nbsp;&nbsp; ☐ NOT ACCEPTED

---

## Signature — Recorded

**Status: ✅ ACCEPTED AS PROPOSED — SIGNED (31 August 2026).** Recorded additively below, per this repository's established signature-recording convention (mirroring, e.g., `business-worth-evolution-implementation-authorization.md` §15/§31) — the pending signature block immediately above is preserved unedited as the historical record of what was circulated for review; this section is the actual, dated act of signature.

> I ACCEPT THE PROPOSAL AS PROPOSED.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ✅ ACCEPTED AS PROPOSED

**What this signature authorizes:** progression to a dedicated Rule 8 Assessment only, scoped exactly as this proposal's own §10(iv) describes.

**What this signature does NOT authorize:** implementation, any code change, any test change, any `firestore.rules` change, any `firestore.indexes.json` change, or any other downstream execution activity. This is a Product Architect decision acceptance, not an Implementation Authorization — those remain separate, later, explicitly-gated steps, exactly as this proposal's own "What This Proposal Does and Does Not Authorize" section already states.

**What this signature does NOT amend:** `BDR-pending-business-worth-evolution-measurement-model.md`, `docs/architecture/05-business-lifecycle.md`, `08-module-architecture.md`, or any Specification named in §10 — each still requires its own separate, explicit signature before Rule 8 may rely on it as settled. This acceptance record confirms the Product Architect's decision on the proposal as a whole; it does not itself perform any of the governance amendments §10 identifies as required.
