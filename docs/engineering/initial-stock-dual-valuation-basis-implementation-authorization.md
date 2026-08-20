Implementation Authorization

# Implementation Authorization — Initial Stock Dual-Valuation-Basis (Selling-Price-Based Stock Valuation)

**Type:** Governance bridge document — the formal record that engineering governance is complete and implementation would be authorized to begin, once signed.

**Status:** ✅ **Authorized. Signed by the Product Architect** — see §10, below.

**Governing chain:** [`BDR-0014`](../specs/BDR-0014-initial-stock-dual-valuation-basis.md) (✅ Approved, all §5.A items resolved — §11) → [`10-initial-stock-dual-valuation-basis-amendment.md`](../specs/10-initial-stock-dual-valuation-basis-amendment.md) (✅ Accepted) → [`02-capital-growth-dual-basis-amendment.md`](../specs/02-capital-growth-dual-basis-amendment.md) (✅ Accepted) → [`initial-stock-dual-valuation-basis-specification.md`](../specs/initial-stock-dual-valuation-basis-specification.md) (Accepted, per explicit Product Architect governance-state instruction — see that Specification's own §9 for a documentation-sync note this authorization does not resolve) → [`initial-stock-dual-valuation-basis-rule8-assessment.md`](./initial-stock-dual-valuation-basis-rule8-assessment.md) (Overall Verdict: **READY** — every Finding either PASS or fully Rule-8-resolvable; no new Product Architect decision required).

**Precedent note:** no formal Implementation Authorization exists for this feature's Initial Stock predecessor — `10-initial-stock-valuation-history-amendment.md`'s own header states plainly that its underlying capability *"were all built off direct task prompts across two prior sessions, before this governance record existed"* and that the amendment document itself *"settles that debt after the fact; it is a governance record for an existing capability, not an authorization to build a new one."* No such gap is being repeated here — this document exists precisely so implementation, if and when authorized, follows the signature, not the reverse. This document's structure instead follows the most recent, directly comparable precedent in this repository, [`product-memory-purchase-selling-valuation-implementation-authorization.md`](./product-memory-purchase-selling-valuation-implementation-authorization.md) (signed, Authorized).

**Repository state at this revision:** `main = origin/main = 06de8e5f50951711f9f197e448f3f3c5e0c40a93`, working tree clean, confirmed via `git fetch` immediately before this document was drafted. **Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `tests/`, `BDR-0014`, either companion amendment, the Specification, or the Rule 8 Assessment to produce this document.**

---

## 1. Governance Completeness — What This Record Confirms

**Business Decision → Reconciliation → Specification → Rule 8 → Authorization (this document) → Implementation**

| Stage | Document | Status |
|---|---|---|
| Business Decision | `BDR-0014` | ✅ Approved (all §5.A items resolved — §11) |
| Reconciliation (Initial Stock/Initial Capital) | `10-initial-stock-dual-valuation-basis-amendment.md` | ✅ Accepted |
| Reconciliation (Capital Growth) | `02-capital-growth-dual-basis-amendment.md` | ✅ Accepted |
| Specification | `initial-stock-dual-valuation-basis-specification.md` | ✅ Accepted |
| Rule 8 | `initial-stock-dual-valuation-basis-rule8-assessment.md` | ✅ Assessed — **READY** |
| **Authorization** | **This document** | ✅ **Authorized** — signed 2026-08-20 |
| Implementation | *(not started)* | ❌ Not authorized |

## 2. What This Authorization Covers (Once Signed)

Every item below traces to a specific Rule 8 Finding — see §4's traceability table for the full chain back to the originating `BDR-0014` decision.

1. **Extend `normalizeStockCountItems`** (`apps/tenant/src/utils/stockCount.ts`) to additionally compute and return `totalSellingValue` — the sum of `quantity × sellingPrice` across all portions, in exact parallel to the existing, **unchanged**, `totalValue` (cost) accumulation (Rule 8 Finding 1).
2. **Add `totalSellingValue?: number` and `initialCapitalBasis?: 'cost' | 'selling'` to the `StockCount` type** (`apps/tenant/src/types.ts`) — both additive/optional; `initialCapitalBasis` present only for `type === 'initial'` (Rule 8 Finding 1, 2).
3. **Add `initialCapitalBasis?: 'cost' | 'selling'` to the `InitialStockDraft` type** (`apps/tenant/src/types.ts`) — so the owner's in-progress selection survives autosave/resurrection exactly as every other field on this screen already does (Rule 8 Finding 2).
4. **Add a basis-selection UI control to `InitialStockCountView.tsx`**, presented once per confirmation, for the whole snapshot — never per product, never per portion — before the existing "Confirmar Capital Inicial" action (Rule 8 Finding 2; Specification FR-2, Invariant I-1).
5. **Extend `RecordStockCountParams` and the `recordStockCount` call site** (`apps/tenant/src/context/AppContext.tsx`, `apps/tenant/src/components/InitialStockCountView.tsx:483`) to pass the selected basis through to confirmation, written into the same, already-atomic `fsBatch.commit()` this function already uses — no new transaction, no new batch (Rule 8 Finding 3, 9).
6. **Extract a pure, independently-testable resolution function** (e.g. `resolveInitialCapitalValue`) replacing the single-line expression at `AppContext.tsx:784`, resolving `initialCapitalValue` to the cost total (absent basis, or explicit `'cost'`) or the selling total (explicit `'selling'`), with a defensive fallback to cost if the selling total is somehow absent (Rule 8 Finding 4).
7. **Fix the Initial Stock confirmation Timeline entry** (`AppContext.tsx`, inside `recordStockCount`'s `if (type === 'initial')` Timeline-logging block) to use the resolved value from item 6, computed once at confirmation time, instead of reading `newCount.totalValue` directly (Rule 8 Finding 5 — **the Timeline finding; see §5, below, for why this is explicitly in scope**).
8. **The required tests**, per the Rule 8 Assessment's own §15/Finding 11 test plan: pure-function coverage for the extended `normalizeStockCountItems` (including a byte-identical-`totalValue` regression check against the two existing tests that already assert cost-only behavior); pure-function coverage for the new resolution function (all four resolution paths plus the no-count case); a source-level guard that the basis choice is presented once per confirmation, never per product/portion; a `git diff`-based regression check that `businessWorth`'s own formula text is unchanged; a draft-autosave/resurrection round-trip test for the selected-but-unconfirmed basis; and a confirmation-immutability regression proving no code path can update an already-confirmed `'initial'` `StockCount`'s `initialCapitalBasis` field.

**No `firestore.rules` or `firestore.indexes.json` change is authorized or required** — Rule 8 Findings 7 and 8 confirmed both directly against the actual rules/index files: no field-level schema validation exists on either affected collection, the existing `type == 'initial'` immutability block is unconditional and already covers any new field on that same document, and no new query pattern is introduced.

## 3. What This Authorization Does Not Cover

Every exclusion below is preserved exactly as the Specification's §6 Non-Goals and the Rule 8 Assessment's §17 already established — none is invented here:

- **Any change to `businessWorth`'s core formula** (`totalMarketValueAllTime − totalExpensesAllTime − totalWithdrawalsAllTime`) — confirmed to contain no `initialCapitalValue` term today, and none may be added (Specification I-6; Rule 8 Finding 14).
- **Any rewrite of an existing, already-confirmed Initial Stock record**, in whole or in part — every already-confirmed `'initial'` `StockCount` continues resolving to the cost total, forever, exactly as today (Specification I-4; Rule 8 Finding 10).
- **Any migration or backfill of historical Initial Stock data**, of any kind, for any reason (Specification §6; Rule 8 Finding 10, 16).
- **Any change to unrelated stock-purchase valuation behavior** — Add Stock, Smart Stock Entry, `StockBatch.sellingPrice`/`costPrice` semantics, and Product Memory semantics are all confirmed unaffected and out of scope (Rule 8 Finding 14).
- **Any per-product or per-line/per-portion valuation-basis selection** — the basis is a single, whole-snapshot value, never finer-grained (Specification FR-2, FR-3, Invariant I-1).
- **Any mechanism allowing the selected basis to be changed after confirmation** — no edit path, no re-confirmation flow, no administrative override, under any circumstance (Specification FR-4, Invariant I-2).
- **Any implementation that discards either valuation total** — both the cost total and the selling total must always be computed and preserved together, regardless of which basis is selected (Specification FR-1, Invariant I-3).
- **Any redesign of unrelated Initial Stock behavior** — B5's existing multi-portion grouping/summation mechanism, the existing draft autosave/resurrection architecture, and the existing singleton/immutability enforcement are all reused unmodified, never redesigned (Rule 8 Finding 6, 9).
- **Any alteration to Periodic Contagem's UI, basis-selection capability, or date/period model** — `BDR-0014` Decision 7 explicitly excludes a basis choice from Periodic Contagem; `normalizeStockCountItems`'s extension (item 1, §2 above) makes a selling total *available* to that shared function's other caller, but wiring any basis concept or displayed selling total into `PeriodicStockCountView.tsx` itself is a distinct, not-yet-authorized follow-on (Rule 8 Finding 1's explicit scope note).
- **Any unrelated schema change** — no field beyond the three named in §2 (items 2–3) is authorized on any type.
- **Any `firestore.rules` or `firestore.indexes.json` change** — Rule 8 Findings 7 and 8 determined neither is required; none is authorized here either.
- **Any additional Product Architect business decision** — none is needed; the Rule 8 Assessment found every question already resolved by the accepted governance chain.
- **Any expansion of this feature beyond the accepted Specification's ten Functional Requirements and eight Invariants** — this authorization's scope is exactly, and only, what §2 above lists.
- **`product-memory-purchase-selling-valuation-specification.md` §19's originally narrower framing** — superseded by `BDR-0014`'s broader resolution; not reopened by this authorization.

## 4. Rule 8 → Implementation Traceability

| `BDR-0014` Business Rule | Specification Requirement | Rule 8 Finding | Authorized Implementation Consequence |
|---|---|---|---|
| Both valuation bases preserved (Decision 1) | FR-1, I-3 | Finding 1 | `normalizeStockCountItems` additive `totalSellingValue` |
| Owner chooses basis before confirmation (Decision 2) | FR-2 | Finding 2 | New UI control on `InitialStockCountView.tsx` |
| Choice applies to whole snapshot only (§5.A item 4) | FR-2, FR-3, I-1 | Finding 2 | Single field on `StockCount`/`InitialStockDraft`, never per-row |
| Choice survives draft editing before confirmation | FR-3 (implied by "before confirmation") | Finding 2 | Mirrored optional field on `InitialStockDraft` |
| Locked permanently at confirmation (§5.A item 2) | FR-4, I-2 | Finding 3 | Existing unconditional `type == 'initial'` rule; `RecordStockCountParams` extension |
| Prospective only; existing untouched (§5.A item 1) | FR-5, I-4 | Finding 4, 10 | Resolution function defaults absent-basis → cost; zero migration |
| `capitalGrowth` follows selected basis (§5.A item 3) | FR-6 | Finding 4 | `resolveInitialCapitalValue`; single-line replacement at `AppContext.tsx:784` |
| `businessWorth` formula unchanged (§7) | FR-7, I-6 | Finding 14 | Zero changes to `businessWorth`'s own expression |
| Neither valuation ever discarded (Decision 1, I-3) | FR-1, I-3 | Finding 1, 2 | Both totals always computed together; basis field is a pointer, never a value |
| Multi-portion behavior preserved (Decisions 1, 5) | FR-9, I-8 | Finding 6 | PASS — B5's existing summation inherited unmodified |
| Raw per-portion facts unchanged (Decision 3) | FR-8, I-5 | Finding 10 | PASS — additive-only fields, no rewrite of existing facts |
| Later purchases independent (Decision 4) | FR-10 | Finding 14 | PASS — `StockBatch`/Add Stock untouched |
| `InitialStockPriceChangeEvent` independence (Business Rule 11) | FR §3 item 11, I-7 | Finding 12 | PASS — already independent by construction |
| Tenant isolation intact (implicit) | — | Finding 7 | PASS — zero `firestore.rules` change |
| *(Rule-8-originated, not in original BDR text)* | FR-5 ("wherever `initialCapitalValue` is read") | Finding 5 | Timeline-logging fix — §5, below |

## 5. The Timeline Finding — Explicitly In Scope

The Rule 8 Assessment identified, by direct code inspection rather than by inference from the accepted documents' own text, that `recordStockCount`'s Timeline-logging call for `type === 'initial'` currently reads `newCount.totalValue` **directly** — always the cost total, regardless of any future basis selection. Left unfixed, a business that selects Selling Price as its basis would see its own historical Timeline record for "Capital Inicial" permanently display the cost figure, inconsistent with every other consumer of `initialCapitalValue` (Dashboard, both Reports, `capitalGrowth` itself). This is a direct, mechanical consequence of Specification FR-5's own text — *"wherever `initialCapitalValue` is read... it must resolve to whichever of the two preserved totals the frozen selected basis points to"* — the Timeline entry is one such place FR-5 already covers; Rule 8 Finding 5 only names the specific code that must change to honor it.

**This item is explicitly included in the authorized scope (§2, item 7) and must not be silently omitted during implementation merely because the core valuation formula change (§2, item 6) is comparatively simple.**

## 6. Risk Acknowledgment

- The one Rule 8 Finding that extends slightly beyond the accepted documents' own literal text — mirroring the basis field onto the pre-confirmation `InitialStockDraft`, not only the confirmed `StockCount` (Finding 2) — was explicitly classified in the Rule 8 Assessment as a technical elaboration of the already-accepted "field on the Initial Stock record" principle, not a new business decision, with reasoning given for why separate authorization is not required. This authorization adopts that classification; if the Product Architect disagrees on review, that disagreement should be resolved before signing, not silently implemented either way.
- `normalizeStockCountItems` is a **shared** function between Initial Stock and Periodic Contagem finalization. Extending its return shape is low-risk (additive field, existing `totalValue` behavior provably unchanged by two existing regression tests) but does make a selling total newly *computable* for periodic counts as a side effect of the shared code path — explicitly **not** wired into any Periodic Contagem UI or persisted display by this authorization (§3, above).
- Every new field this authorization introduces is additive and optional (`StockCount.totalSellingValue?`, `StockCount.initialCapitalBasis?`, `InitialStockDraft.initialCapitalBasis?`) — consistent with this codebase's established backward-compatibility pattern for every prior amendment in this lineage.

## 7. Testing Boundary (Carried Into Implementation Plan)

At minimum, per Rule 8 Finding 11 and this authorization's §2 item 8: `normalizeStockCountItems` extension correctness (multi-portion, mixed unit/price, zero rows, `totalValue` byte-identical to today); the resolution function's four paths (absent → cost, `'cost'` → cost, `'selling'` → selling, `'selling'` with missing selling total → defensive fallback to cost) plus the no-`initialStockCount`-at-all case; whole-snapshot-only basis presentation (never per-product/portion); `businessWorth` formula-text regression (`git diff` line-count check, matching this repository's own established verification method for an identical claim in the predecessor Rule 8 governance record); draft autosave/resurrection round-trip for the selected-but-unconfirmed basis; confirmation immutability (no code path can alter `initialCapitalBasis` on an already-confirmed count); and the Timeline-logging fix (§5, above) reflecting the resolved value, not the raw cost total.

## 8. Rollback / Reversibility

Every field this authorization introduces is additive and optional — a rollback requires no destructive migration of existing data. An already-confirmed `StockCount` with `initialCapitalBasis` set would simply have that field ignored by a rolled-back version of the resolution function (reverting to always reading `totalValue`), with no data loss, consistent with this codebase's established rollback posture for every prior amendment in this lineage.

## 9. Acceptance Criteria

Extracted directly from the accepted Specification's §7 and the Rule 8 Assessment's own findings — none invented beyond what those two documents already support:

1. A confirmed Initial Stock snapshot has both a cost valuation total and a selling valuation total, both preserved (Specification §7.1; Rule 8 Finding 1).
2. The owner is offered exactly one basis choice — Cost or Selling Price — before confirming Initial Stock (Specification §7.2; Rule 8 Finding 2).
3. The choice applies to the entire Initial Stock count — never per product, never per portion (Specification §7.2, Invariant I-1).
4. The in-progress selection survives draft autosave and resurrection, exactly as every other field on the same screen (Rule 8 Finding 2, §14/§20 of the Rule 8 Assessment's own investigation scope).
5. Once confirmed, the selected basis is immutable — no edit path, re-confirmation, or override exists anywhere (Specification §7.4, Invariant I-2).
6. Every Initial Stock count confirmed before this capability exists remains completely unchanged in behavior and reported figure (Specification §7.11, Invariant I-4).
7. A future Cost-basis Initial Stock count continues to behave exactly as Initial Stock does today (Specification §7.5).
8. A future Selling-basis Initial Stock count resolves `initialCapitalValue` to the selling total, consistently, everywhere it is read (Specification §7.5).
9. `capitalGrowth`/`capitalGrowthPct` use the resolved `initialCapitalValue`, formula shape unchanged, division-by-zero guard intact (Specification §7.6).
10. `businessWorth`'s own formula is provably unchanged — no term added, none removed (Specification §7.7, Invariant I-6).
11. The Initial Stock confirmation Timeline entry reflects the resolved, selected-basis figure, not the raw cost total unconditionally (Rule 8 Finding 5; §5, above).
12. Tenant isolation remains intact — no cross-business read/write path is introduced (Rule 8 Finding 7).
13. Existing, already-passing tests for Initial Stock confirmation and multi-portion valuation continue to pass unmodified (Rule 8 Finding 11; existing tests: `'does not let selling price influence totalValue'`, `'sellingPrice may also differ per portion without affecting totalValue'`).
14. All tests named in §7 of this document (the Testing Boundary) pass.
15. No migration or backfill of any kind occurs, for any existing record (Specification §6; Rule 8 Finding 10, 16).

---

## 10. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** August 20, 2026

**Authorization decision (verbatim):**
> "I accept the Implementation Authorization for BDR-0014 as drafted. I confirm that the governance process is complete and I formally authorize implementation strictly within the scope, constraints, exclusions, and acceptance criteria recorded in the Implementation Authorization."

**Confirmed as part of this signature:**

- [x] This authorization's scope (§2) is approved as stated.
- [x] This authorization's exclusions (§3) are approved as stated.
- [x] The Timeline finding (§5) is explicitly acknowledged as in scope.
- [x] No additional scope change is required beyond what §1–§9 of this document describe.

---

**This document, as signed, authorizes implementation strictly per §2's scope and §3's exclusions.** No code has been written, and no schema or `firestore.rules` change has been made, as of the filing of this signed authorization — implementation is the next, separate execution step this signature enables, not something this signature itself performs.
