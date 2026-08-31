Rule 8 Assessment

# Rule 8 Assessment — Retirement of Capital Inicial as an Active Sabush BPT Business Concept

**Status:** 🔶 **DRAFT — NOT YET SIGNED.** This is the required Rule 8 Assessment following the signed Product Architect acceptance of the [Capital Inicial Retirement Decision Proposal](./capital-inicial-retirement-decision-proposal.md) (`docs/engineering/capital-inicial-retirement-decision-proposal.md`, ACCEPTED AS PROPOSED, SABUSHIMIKE Masceni, 31 August 2026, commit `da6f7b8`). Per that acceptance's own explicit terms, it authorizes progression to **this** Rule 8 Assessment only — it does not itself constitute readiness, and this document does not authorize any code, test, `firestore.rules`, `firestore.indexes.json`, or other governance-document change.
**Repository state assessed:** `main` @ `da6f7b8`, working tree clean, verified at drafting time.
**Governing chain:** Decision Proposal (✅ Accepted, `da6f7b8`) → **this Rule 8 Assessment (draft)** → [not yet started] Implementation Plan → [not yet started] Implementation Authorization.
**Explicitly reused, not re-litigated:** this Assessment does not reopen any decision from the Business Worth Evolution chain (`BDR-pending-business-worth-evolution-measurement-model.md`, `POL-0010`, `business-worth-evolution-specification.md`, its own Rule 8 Assessment, or its Implementation Authorization) except the two items the Decision Proposal itself names as requiring reversal/amendment (§3, Findings GOV-1/GOV-2, below).

---

## 1. Current State Assessment

Re-verified by direct repository inspection at drafting time, per this repo's own established Rule 8 discipline (no reliance on a prior session's summary):

- **`stockCounts` create rule (`firestore.rules`):** the `type == 'initial'` branch remains exactly as previously traced — 4 sub-branches (legacy-shape original, new-shape original, and 2 active redo slots; the third redo slot, `initial-4`, has no further redo path per existing Void & Redo ceiling). Unchanged since the last investigation.
- **`stockCounts` update/delete rule:** unconditional refusal for `type == 'initial'`, Owner included — unchanged, and this proposal does not touch it (historical preservation, §2 of the Decision Proposal).
- **Supporting collections:** `voidRecords`, `initialStockRecoveryAuthorization`, `stockCountDrafts/initial` — all present, unchanged, all still functionally load-bearing for any legacy record still inside a correction window.
- **Server:** `initialStockRecoveryAuthorization.ts`, `initialStockRecoveryConsumption.ts` — both present, unchanged, both still the sole mechanism for SuperAdmin-Assisted Recovery.
- **`AppContext.tsx` consumers of `initialCapitalValue`/`initialStockCount`:** confirmed still exactly 4 (legacy `capitalGrowth`/`capitalGrowthPct`; `expectedCurrentStockValue`; Case B `getEstimatedBusinessWorth`; Void & Redo eligibility functions) plus the Timeline-logging and redo-reconstruction call sites — no new consumer introduced since the last investigation pass.
- **`resolveActiveBusinessWorthBaselineDate` (`calculations.ts` line 1489):** still contains the Capital Inicial fallback the Decision Proposal's §8 requires removed. **Unchanged — this is Finding FB-1, below, carried forward from the already-signed but unshipped §24 Post-Implementation Correction.**
- **`DeclareBusinessWorthView.tsx`:** confirmed, again, zero references to Capital Inicial.
- **Architecture:** `docs/architecture/05-business-lifecycle.md` §5.4 and `08-module-architecture.md` §8.6 remain unamended — they still name Initial Stock Count as an approved lifecycle stage and `InitialStockCountView.tsx` as an approved module mapping, exactly as found previously.
- **`BDR-pending-business-worth-evolution-measurement-model.md` Decision 1 (as corrected 23 August 2026):** remains unamended — it still affirmatively states a new business "may confirm Capital Inicial, may skip it entirely... or may do both, in either order."
- **Test surface:** 24 files (13 dedicated, 11 incidental) still reference Capital Inicial/Initial Stock, unchanged in count or content since the last pass.

**Nothing about the codebase itself has changed since the Decision Proposal was drafted** — this Current State Assessment confirms the Proposal's own factual basis still holds at `da6f7b8`, before any implementation work is planned against it.

## 2. Gap Analysis

The Decision Proposal names 12 items. Mapped against current state, three classes of gap exist:

| Class | Items | Nature |
|---|---|---|
| **Governance gap** | §10(i) BDR Decision 1, §10(ii) Architecture §5.4/§8.6 | Documents that must be amended before an Implementation Plan can rely on them as settled — not yet done |
| **Unshipped-but-already-authorized work** | §8 (Fecho §24 correction) | Already signed elsewhere in this repo's governance; this proposal folds it into the same execution scope rather than treating it as new |
| **Net-new implementation, not yet planned** | §1, §6, §9, §11, §12 | Genuinely new code/rules work this Rule 8 Assessment must scope, not merely re-confirm |

## 3. Findings, by Assessment Dimension

### 1. Data Integrity
No finding. §2/§7 of the Decision Proposal require zero schema change to any existing document; the immutability tier already protecting `stockCounts/initial*` is untouched by this work.

### 2. Snapshot Integrity
No finding. `BusinessWorthSnapshot` creation logic (Case A/B) is unmodified by this proposal — Capital Inicial's retirement changes *who can create a new starting record*, not how a snapshot is computed once one exists.

### 3. Contagem Safety
**Finding CS-1 (NON-BLOCKING UI/UX ISSUE).** §6's proposed resolution (copy-only correction to Expected Current Stock Value's explanatory text in `PeriodicStockCountView.tsx`) needs its exact replacement wording decided at Implementation Plan stage — not a business decision, a copy-writing detail, but flagged so it isn't silently improvised mid-implementation.

### 4. Recovery Safety
**Finding RS-1 (IMPLEMENTATION GAP).** §9's proposed "grandfather in-flight windows, refuse new ones" resolution requires a precise cutover-timestamp mechanism in the `voidRecords`/`initialStockRecoveryAuthorization` `firestore.rules` branches. The Decision Proposal explicitly defers this exact mechanism to Rule 8 (§9's own text: "a Rule 8-stage detail, not decided further here"). **This Assessment's own scoping:** the mechanism should be a fixed cutover `Timestamp` constant compared against `resource.data.confirmedAt` (for the predecessor being voided) or `request.time` (for a fresh void attempt) — never an Owner-editable or client-suppliable value, mirroring the existing `confirmedAt == request.time` discipline already used throughout this rules file. Exact expression is an Implementation Plan-stage task.

### 5. Financial Model
No finding. Confirmed again: Case A never reads Capital Inicial; Case B (§5 of the Decision Proposal) is explicitly retained, unmodified, as a permanent, closed legacy accommodation. The financial formula itself is not touched by this proposal, consistent with the original governance instruction not to redesign it absent a genuine contradiction — none was found.

### 6. Historical Transition
No finding. §2/§5 already correctly specify "no forced migration, no fabricated conversion" — consistent with BDR Decisions 25/26, which this proposal does not amend or contradict.

### 7. Multi-Unit / Valuation
No finding. Untouched by this proposal.

### 8. Fecho
**Finding FB-1 (already GOVERNANCE-SETTLED, IMPLEMENTATION GAP only).** Confirmed again: `resolveActiveBusinessWorthBaselineDate` still falls back to `initialStockCount.createdAt`. Per §8 of the Decision Proposal, this ships as part of this retirement's Phase 1 rather than being separately re-authorized — the business decision (Implementation Authorization §24) is already signed; only the code change is outstanding. `tests/fecho-baseline-anchored-closing.test.ts` will need its fallback-path assertions updated, not re-decided.

### 9. Dashboard
No finding beyond §11/§12 of the Decision Proposal, both already fully scoped (exact files, exact entry points, exact 3-string rename) in that document.

### 10. Security / Tenant Isolation
**Finding SEC-1 (IMPLEMENTATION GAP).** Closing the `stockCounts` `type == 'initial'` create branches (§1) must preserve every existing `isOwnerOf(businessId)`/`subscriptionAllowsNewRecords` guard on the *other* branches in that same rule block — this is a surgical removal of specific sub-clauses, not a rewrite of the rule. Flagged so an Implementation Plan doesn't inadvertently touch the periodic-count creation path while editing an adjacent branch in the same `allow create` expression.

### 11. Auditability
No finding. Timeline events already logged for historical Capital Inicial confirmations are immutable append-only records (§2) — nothing about retirement requires or permits editing them.

### 12. Performance / Scale
No finding. Not applicable — no new query pattern, index, or hot path introduced.

### 13. Failure / Idempotency
No finding. Not applicable — no new write path introduced; §1 is a removal, not an addition.

### 14. Data Migration
No finding — confirmed, again, directly: **no migration is required or proposed.** §2/§4/§5 of the Decision Proposal are each independently achievable with zero data changes.

### 15. Governance Consistency — the two blocking findings

**Finding GOV-1 (BLOCKING GOVERNANCE CONFLICT).** `BDR-pending-business-worth-evolution-measurement-model.md` Decision 1, as corrected 23 August 2026, remains unamended and currently states the opposite of Decision Proposal §1 ("may confirm Capital Inicial... or may do both, in either order"). **No Implementation Plan may be drafted against §1 of the Decision Proposal until Decision 1 is formally re-corrected by explicit Product Architect signature.** This is not a technical blocker — it is a documented, named contradiction between two signed artifacts that must not be allowed to coexist unresolved.

**Finding GOV-2 (BLOCKING GOVERNANCE CONFLICT).** `docs/architecture/05-business-lifecycle.md` §5.4 and `08-module-architecture.md` §8.6 remain unamended and still name Initial Stock Count as an approved, one-time lifecycle stage and approved module mapping respectively. Per `CLAUDE.md` Hard Rule #1, **no Implementation Plan may authorize removing this stage's user-facing availability (§1, §11 of the Decision Proposal) until Architecture itself is explicitly amended.** This is the first Architecture-tier amendment this capability's entire governance history has required — every prior document in the Business Worth Evolution chain sat below Architecture and never needed to touch it.

## 4. Assessment Against the Decision Proposal's Own 12 Items

| # | Item | Rule 8 status |
|---|---|---|
| 1 | Capital Inicial creation → permanently disabled | Blocked on GOV-1, GOV-2; technically scoped (SEC-1) |
| 2 | Historical Capital Inicial → preserved | No gap — zero change required |
| 3 | New businesses → Initial Investment + Contagem/Declaration | No gap — already fully functional today |
| 4 | Existing businesses → Contagem/Declaration + cash/debts | No gap — already fully functional today |
| 5 | Case B / State 1a → permanent legacy accommodation | No gap — zero code change, decision already made in Proposal §5 |
| 6 | Expected Current Stock Value → copy-only correction | CS-1 (non-blocking, copy-writing detail only) |
| 7 | Product Memory → preserve historical usefulness | No gap — automatic consequence of §2 |
| 8 | Fecho → implement §24 correction | FB-1 (implementation gap only; business decision already signed) |
| 9 | Void/Redo and SuperAdmin recovery → grandfather in-flight | RS-1 (implementation gap — exact rules mechanism to be scoped in Plan) |
| 10 | Architecture + BDR + Specification amendments | **GOV-1, GOV-2 — the two blocking items** |
| 11 | Remove from active navigation/UI | No gap — exact entry points and files already named in Proposal §11 |
| 12 | Rename Produtos → DASHBOARD | No gap — fully independent, SAFE/NO IMPACT, may proceed on its own schedule regardless of GOV-1/GOV-2 |

## 5. Formal Decision Table

| Finding | Classification | Blocks Implementation Plan? |
|---|---|---|
| GOV-1 — BDR Decision 1 unamended | GOVERNANCE CONFLICT | **Yes, for item 1/11** |
| GOV-2 — Architecture §5.4/§8.6 unamended | GOVERNANCE CONFLICT | **Yes, for item 1/11** |
| FB-1 — Fecho fallback still shipped | IMPLEMENTATION GAP | No — already-authorized, may proceed once Plan drafted |
| RS-1 — cutover mechanism unscoped | IMPLEMENTATION GAP | No — Plan-stage detail |
| SEC-1 — rules-branch surgical-removal care | IMPLEMENTATION GAP | No — Plan-stage detail |
| CS-1 — Expected Current Stock Value copy | NON-BLOCKING UI/UX | No |
| Item 12 (Dashboard rename) | SAFE / NO IMPACT | No — fully severable |

## 6. What This Assessment Does NOT Decide

- It does not itself amend BDR Decision 1, Architecture §5.4/§8.6, or draft the Specification addition §10(iii) names — those remain separate, explicit Product Architect actions.
- It does not choose the exact cutover-timestamp value/mechanism for RS-1, or the exact replacement copy for CS-1 — both are Implementation Plan-stage technical choices within already-decided direction.
- It does not reopen Case A, Case B's arithmetic, the Cash Ledger/Receivables/Payables model, or Owner-Declared Business Worth — all confirmed unaffected and out of this Assessment's scope.
- It does not authorize any code, test, `firestore.rules`, or `firestore.indexes.json` change.

## 7. Verdict

**READY AFTER DECISIONS.**

Not "READY FOR IMPLEMENTATION" — two named, specific, resolvable governance conflicts (GOV-1, GOV-2) must be closed by explicit Product Architect signature before an Implementation Plan may be drafted for items 1 and 11 of the Decision Proposal. Every other item (2–9, 12) has no blocking finding and could, in principle, proceed independently once its own narrow implementation-detail items (FB-1, RS-1, SEC-1, CS-1) are addressed in a Plan — **item 12 (the Dashboard rename) in particular has zero dependency on GOV-1/GOV-2 and could be sequenced first, entirely independently, exactly as the Decision Proposal itself already states.**

---

## Next Governance Step

This Assessment does not authorize itself into an Implementation Plan. Per this repository's established pattern, the required sequence from here is:

1. Product Architect resolves GOV-1 (a corrective pass to BDR Decision 1, mirroring the 23 August 2026 correction's own form).
2. Product Architect resolves GOV-2 (an Architecture amendment to `05-business-lifecycle.md` §5.4 and `08-module-architecture.md` §8.6).
3. Product Architect authorizes/accepts the Specification addition named in Decision Proposal §10(iii).
4. Only then: an Implementation Plan may be drafted, addressing FB-1, RS-1, SEC-1, and CS-1 as scoped technical items within it.
5. Item 12 (Dashboard rename) may proceed on its own, separate, smaller Plan/Authorization at any point — it has no dependency on steps 1–4.

Nothing above is performed by this document. This Assessment stops here, pending Product Architect review and signature.

## Signature

> I have reviewed this Rule 8 Assessment for the Retirement of Capital Inicial, including its verdict (READY AFTER DECISIONS) and the two blocking governance findings (GOV-1, GOV-2) it identifies. I understand this signature does not authorize an Implementation Plan for items 1/11 until GOV-1 and GOV-2 are separately resolved, and does not itself amend any document named above.
>
> **Product Architect:** _______________________________
> **Date:** _______________________________
> **Decision:** ☐ ACCEPTED AS ASSESSED &nbsp;&nbsp; ☐ ACCEPTED WITH MODIFICATIONS (specify) &nbsp;&nbsp; ☐ NOT ACCEPTED

---

## Signature — Recorded

**Status: ✅ ACCEPTED AS ASSESSED — SIGNED (31 August 2026).** Recorded additively below, per this repository's established signature-recording convention — the pending signature block immediately above is preserved unedited as the historical record of what was circulated for review; this section is the actual, dated act of signature.

> I ACCEPT THE RULE 8 ASSESSMENT AS ASSESSED.
>
> **Product Architect:** SABUSHIMIKE MASCENI
> **Date:** 31 August 2026
> **Decision:** ✅ ACCEPTED AS ASSESSED

**Verdict — unchanged by this acceptance:** **READY AFTER DECISIONS.** This acceptance does not, and could not, elevate the verdict to READY FOR IMPLEMENTATION — it confirms the Product Architect has reviewed and agrees with the Assessment exactly as drafted, including that verdict and everything it rests on.

**The two blocking governance findings are explicitly reaffirmed, unresolved, by this acceptance:**
- **GOV-1** — `BDR-pending-business-worth-evolution-measurement-model.md` Decision 1 (as corrected 23 August 2026) remains unamended and still contradicts Decision Proposal §1. It must be formally corrected before an Implementation Plan may rely on it.
- **GOV-2** — `docs/architecture/05-business-lifecycle.md` §5.4 and `08-module-architecture.md` §8.6 remain unamended. They must be formally amended before an Implementation Plan may authorize removing Capital Inicial's user-facing availability.

**The Assessment's stated sequence is explicitly reaffirmed, unchanged, by this acceptance:**
1. Resolve GOV-1.
2. Resolve GOV-2.
3. Resolve/accept the required Specification addition (Decision Proposal §10(iii)).
4. Only then may an Implementation Plan be drafted.
5. Only after the appropriate downstream governance gates (a signed Implementation Authorization, per this repository's established one-item-at-a-time discipline) may implementation proceed.

**What this signature authorizes:** acceptance of this Rule 8 Assessment's findings and verdict as the record of state at this point in governance. Nothing more.

**What this signature does NOT authorize:** implementation of any kind; an Implementation Plan; an Implementation Authorization; amendment of BDR Decision 1; amendment of Architecture §5.4 or §8.6; amendment of the Business Worth Specification; any code, test, `firestore.rules`, or `firestore.indexes.json` change. Each of those remains a separate, later, explicitly-gated step, to be taken only on its own separate instruction.
