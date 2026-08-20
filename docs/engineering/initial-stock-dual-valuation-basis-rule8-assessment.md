Rule 8 Assessment

# Rule 8 Assessment — Initial Stock Dual-Valuation-Basis (Selling-Price-Based Stock Valuation)

**Governing chain:** [`BDR-0014`](../specs/BDR-0014-initial-stock-dual-valuation-basis.md) (✅ Approved, all §5.A items resolved — §11) → [`10-initial-stock-dual-valuation-basis-amendment.md`](../specs/10-initial-stock-dual-valuation-basis-amendment.md) (✅ Accepted) → [`02-capital-growth-dual-basis-amendment.md`](../specs/02-capital-growth-dual-basis-amendment.md) (✅ Accepted) → [`initial-stock-dual-valuation-basis-specification.md`](../specs/initial-stock-dual-valuation-basis-specification.md) (per this session's explicit governance-state instruction: **Accepted by the Product Architect** — see §2's note on a documentation-sync discrepancy this assessment found and flags, not resolved by this document).

**Scope of this assessment:** the Specification's FR-1 through FR-10 and Invariants I-1 through I-8, translating `BDR-0014`'s four resolved §5.A decisions (§11: basis lives on the Initial Stock record; prospective-only; fixed once set; `capitalGrowth` follows the chosen basis) into a concrete technical direction. **Business Worth's own formula, Periodic Contagem's date/period model, and §19's originally narrower framing remain explicitly out of scope**, per `BDR-0014` §7/Decision 7 and the Specification's own §6 Non-Goals — this assessment does not touch, resolve, or assume any outcome for any of them.

**Lifecycle state:** Specification Accepted (per governing instruction) → **Assessed (this document)** → Implementation Authorization NOT YET CREATED → Implementation NOT YET AUTHORIZED.

**Baseline verified fresh:** `main = origin/main = 06de8e5f50951711f9f197e448f3f3c5e0c40a93`, working tree clean, confirmed via `git fetch` immediately before this assessment began. All four governing documents (`BDR-0014`, both amendments, the Specification) were read completely and fresh from the repository as part of this session, not from memory of prior sessions.

---

## 1. Objective

Determine whether the accepted Specification's ten Functional Requirements and eight Invariants are technically safe, fully bounded, and buildable against the actual current codebase — without inventing new business requirements, without silently resolving anything left to a future decision, and without smuggling implementation detail into a business-layer artifact. This assessment identifies exactly what must change, what must not change, where risk exists, and how that risk is controlled — for every item the governing task instruction named.

## 2. Governance Inputs

Read completely and fresh, in this session, before any code investigation began:

- `BDR-0014-initial-stock-dual-valuation-basis.md` — full document, including §11's four verbatim §5.A resolutions.
- `10-initial-stock-dual-valuation-basis-amendment.md` — full document.
- `02-capital-growth-dual-basis-amendment.md` — full document.
- `initial-stock-dual-valuation-basis-specification.md` — full document, all 9 numbered sections.

**Documentation-sync discrepancy found, flagged, not resolved here:** the Specification file's own header (line 6) and §9 (line 164) both still read *"Drafted, awaiting Product Architect approval... Not yet accepted"* / *"⏳ Pending... No implicit or inferred acceptance should be assumed from the drafting of this document."* The task instruction under which this Rule 8 Assessment was commissioned explicitly states the Specification is *"ACCEPTED by the Product Architect."* This assessment treats that instruction as the operative governance state for the purpose of proceeding with Rule 8 work — consistent with this repository's established practice of recording a Product Architect decision's substance directly from an explicit session instruction (the same practice `BDR-0014` §10/§11 themselves used). **This assessment does not itself edit the Specification file to update its status** — per this task's explicit instruction not to modify any Specification/BDR/reconciliation artifact. Updating that file's own status line to reflect the acceptance is flagged here as a small, separate documentation action for whoever next touches that file, not performed by this document.

## 3. Accepted Business/Specification Constraints

Restated, not re-decided, for traceability — every Finding below cites back to one of these:

1. Initial Stock retains **both** cost and selling valuation totals (FR-1).
2. Owner chooses **one basis** (Cost or Selling) before confirming Initial Stock (FR-2).
3. The choice applies to the **whole snapshot** — never per product, never per line/portion (FR-2, I-1).
4. Once confirmed, the basis is **permanently locked** for that count (FR-4, I-2).
5. Applies to **future** Initial Stock counts only — existing data is untouched (FR-5, I-4).
6. `capitalGrowth` follows the selected basis; `businessWorth`'s core formula does **not** change (FR-6, FR-7, I-6).
7. Neither valuation total is ever discarded, regardless of which basis is selected (FR-1, I-3).
8. The selected basis determines which retained valuation resolves as `initialCapitalValue` (FR-5).

## 4. Current-System Evidence

All of the following was verified directly against `main = 06de8e5` in this session, not carried over from memory of prior sessions.

- **`apps/tenant/src/types.ts`** — `StockCount`: exactly `id, type, label?, date, items, totalValue, createdAt, expectedValueAtCount?`. **No field exists today for a selling-basis total or a basis selector.** `InitialStockDraft`: exactly `items, date, updatedAt` — **also no such field.** `InitialStockDraftItem`/`StockCountItem` already carry `sellingPrice`/`sellingPrice?` per row (pre-existing, unrelated to this feature).
- **`apps/tenant/src/utils/stockCount.ts`**, `normalizeStockCountItems` (lines 47–76) — the **single, shared** finalization-time normalizer for both Initial Stock and Periodic Contagem. Its `totalValue` output is computed as `Number((quantity * costPrice).toFixed(2))`, summed per row, with an explicit code comment: *"sellingPrice is additional information only — it never participates in totalValue."* **No selling-basis total is computed anywhere in this function today.**
- **`apps/tenant/src/context/AppContext.tsx:784`** — `const initialCapitalValue = initialStockCount?.totalValue || 0;` — **one single expression**, the sole point of truth every consumer reads through (confirmed by exhaustive grep, below).
- **`apps/tenant/src/context/AppContext.tsx:822`** — `const businessWorth = totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime;` — confirmed, again, to contain **no `initialCapitalValue` term of any kind.**
- **`apps/tenant/src/context/AppContext.tsx:825–826`** — `capitalGrowth = businessWorth - initialCapitalValue; capitalGrowthPct = initialCapitalValue > 0 ? (capitalGrowth / initialCapitalValue) * 100 : 0;`
- **Every consumer of `initialCapitalValue`/`capitalGrowth`/`capitalGrowthPct`** (exhaustive grep across `apps/tenant/src`): `DashboardView.tsx`, `BusinessWorthReport.tsx`, `CapitalGrowthReport.tsx`, `InitialStockPriceChangeModal.tsx` — **every one destructures these values directly from `useApp()` context; none recomputes independently.**
- **`recordStockCount`** (`AppContext.tsx:2526–2712`) — single shared finalization function for both count types. Confirmed: `RecordStockCountParams` is a flat, additive-friendly interface (`type, label?, date, items, expectedValueAtCount?, submissionId?`). The final `newCount` object is written via `fsBatch.set(...)`, and the corresponding draft is deleted via `fsBatch.delete(...)`, **in the same Firestore batch**, committed once via a single `await fsBatch.commit()`. `logTimelineEvent` for `type === 'initial'` reads `newCount.totalValue` directly for its "Capital Inicial" financial-impact label.
- **`firestore.rules`** (`stockCounts`/`stockCountDrafts` blocks, lines 436–464) — `create` rules check only ownership/subscription; **no field-level schema validation exists for either collection.** The `type == 'initial'` update/delete refusal (line 447) is **unconditional and field-name-agnostic** — it blocks any modification to that document regardless of which fields would change.
- **`firestore.indexes.json`** — no `stockCounts`-related entries at all; no composite index exists for this collection today.
- **`InitialStockCountView.tsx:483`** — `await recordStockCount({ type: 'initial', date, items: itemsToSave });` — the single call site where a new parameter would need to be added.
- **`apps/tenant/src/utils/calculations.ts`, `calculateInitialStockCurrentValuation`** (own doc comment, lines 90–115) — explicitly states it *"Does not read, write, or otherwise participate in `initialCapitalValue`, `businessWorth`, `capitalGrowth`, or `expectedCurrentStockValue`"* — confirming Business Rule 11/Invariant I-7's independence requirement is **already true of the existing code**, not something this feature must newly build.
- **`Closing`** type (`types.ts:749–766`) — stores `businessWorthAtClose` but **no `initialCapitalValueAtClose`-equivalent field** — `capitalGrowth`/`initialCapitalValue` were never frozen per-Closing; `CapitalGrowthReport.tsx` already falls back to the **live** `initialCapitalValue` for the first period's comparison baseline. No Closing-related change is implied by this feature.
- **Existing tests:** `tests/initial-stock-confirmation.test.ts` — `'does not let selling price influence totalValue — investment basis stays cost * quantity'`; `tests/initial-stock-multi-portion-valuation.test.ts` — `'sellingPrice may also differ per portion without affecting totalValue (cost-basis rule unchanged)'`. Both directly assert the **current, cost-only** `totalValue` behavior and must continue passing, unmodified, after this feature ships. No test file anywhere in the repository currently references any "basis" selector concept (confirmed by a repo-wide grep) — this is genuinely new ground, not an extension of existing tested logic.
- **`tests/initial-stock-portion-grouping-wiring.test.ts`/`tests/periodic-stock-portion-grouping-wiring.test.ts`** — each contains an existing guard, `assert.doesNotMatch(source, /sellingBasisCapital/i)`, from the B5/B6 checkpoints, confirming those checkpoints correctly excluded this concept. This is a naming note for implementation, not a blocker (§15, Finding 11).

## 5. Technical Findings

### Finding 1 — Selling-Valuation Total: Computation Point

**Severity:** MAJOR (Rule-8-resolvable)

**Current state vs. requirement:** `normalizeStockCountItems` computes only a cost-basis `totalValue` today. FR-1 requires a selling-basis total be computed and preserved as a first-class fact, not merely derivable in principle.

**Does current architecture support it:** Partially — every input (`quantity`, `sellingPrice`) is already present per row; only the accumulation itself is missing.

**What must change:** `normalizeStockCountItems`'s return shape gains an additive `totalSellingValue` field, computed by summing `quantity * sellingPrice` per row, in exact parallel to the existing `totalValue` accumulation — same rounding convention (`POL-0001`/`POL-0002`, matching the existing `.toFixed(2)` pattern), same per-row independence (no grouping/dedup), inheriting Finding 6's already-correct multi-portion summation for free.

**What must NOT change:** `totalValue` itself — its value, its meaning, its cost-only computation — must remain byte-identical to today, since it becomes the cost half of the two preserved totals (FR-1) and two existing tests assert this exact property (§4, above).

**Risk:** Because this function is **shared** by Periodic Contagem's own finalization path, this change also silently makes a selling total available for periodic counts — consistent with, not exceeding, `BDR-0014` Decision 7 (Periodic Contagem must also preserve both totals). **Control:** this assessment explicitly recommends the shared function compute the total uniformly (cheap, consistent, low-risk), while explicitly scoping any Implementation Authorization arising from this assessment to **Initial Stock's own UI/basis-selection work only** — wiring a displayed selling total or any basis concept into Periodic Contagem's own UI remains a distinct, not-yet-authorized follow-on, exactly mirroring how the product-memory-purchase-selling-valuation Rule 8 Assessment's own Finding 5 handled an analogous shared-dependency boundary without inventing new authorization.

**Governance classification:** Fully Rule-8-resolvable. No Product Architect decision required — FR-1 and Decision 7 already establish that both totals must exist for both surfaces; this Finding only selects where the shared computation lives.

### Finding 2 — Where the Basis Selector Lives, Technically, Including Pre-Confirmation Draft State

**Severity:** MAJOR (Rule-8-resolvable)

**Current state vs. requirement:** Neither `StockCount` nor `InitialStockDraft` has any field for this today. FR-3 requires the selected basis be persisted as part of the Initial Stock record itself, per `BDR-0014` §5.A item 4's resolution.

**Technical assessment:** The accepted amendment's own Part 2 already describes the confirmed-record side precisely (*"a field, also on the Initial Stock record itself... a pointer/selector, not a third valuation figure"*) — this Finding adds the one technical detail neither accepted document explicitly addressed: **the choice needs somewhere to live while it is being made, before confirmation, so it survives the same draft autosave/resurrection every other value on this screen already survives** (task item 20's explicit concern). `InitialStockDraft` is snapshot-level (its own `date` field already proves this pattern — not per-item), so a mirrored optional field there is the natural, symmetric extension: `InitialStockDraft.initialCapitalBasis?: 'cost' | 'selling'`, following the exact same additive-optional-field discipline this codebase already applies everywhere (`expectedValueAtCount?`, `restockObservation?`, `derivedSellingValuation?`). On the confirmed side: `StockCount.initialCapitalBasis?: 'cost' | 'selling'` — present only for `type === 'initial'`, absent (never `null`, never a placeholder) on every other type and on every pre-existing `'initial'` document.

**What must NOT change:** No change to `StockCountItem`/`InitialStockDraftItem` (per-row shapes) — the basis is snapshot-level, never per-row, matching I-1 exactly.

**Governance classification:** Fully Rule-8-resolvable. Extending "a field on the Initial Stock record" symmetrically to its own pre-confirmation draft record is a technical elaboration of an already-accepted principle, not a new business decision — losing the in-progress selection on a page refresh would be a real UX regression relative to every other field on this same screen, not a business question requiring separate authorization.

### Finding 3 — Confirmation-Time Wiring, Immutability Enforcement, Atomicity

**Severity:** MINOR (Rule-8-resolvable)

**Evidence:** `RecordStockCountParams` is flat and additive-friendly; the `stockCounts` `type == 'initial'` immutability rule (`firestore.rules:447`) is **unconditional and field-name-agnostic** — it already, automatically, covers any new field added to the same document the moment that field exists, with **zero `firestore.rules` change required**. The existing `fsBatch.commit()` (`AppContext.tsx:2712`) already atomically bundles the `stockCounts` write and the draft deletion.

**What must change:** Add `initialCapitalBasis?: 'cost' | 'selling'` to `RecordStockCountParams`, populated only by `InitialStockCountView.tsx`'s own call site (`InitialStockCountView.tsx:483`) — never by `PeriodicStockCountView.tsx`, mirroring exactly how `expectedValueAtCount` is today populated only by the periodic caller and never the initial one, in reverse. Write it into `newCount` using the same `...(condition ? {field} : {})` conditional-spread discipline this exact function already uses for `label`/`expectedValueAtCount`, so an unselected/undefined basis is never written as literal `undefined` (a documented, previously-fixed bug class in this exact function).

**What must NOT change:** No new Firestore batch, no new transaction, no new atomicity mechanism — the existing single-commit pattern already provides everything I-2 (frozen at confirmation) needs.

**Governance classification:** Fully Rule-8-resolvable. This is a direct, mechanical consequence of FR-3/FR-4 with no open business question.

### Finding 4 — `initialCapitalValue` Resolution Logic — the Central Change

**Severity:** MAJOR (Rule-8-resolvable; the single most consequential resolvable finding)

**Evidence:** `initialCapitalValue = initialStockCount?.totalValue || 0` is one expression, confirmed the single point of truth for every consumer.

**Technical assessment:** This one line must become a resolution — cost total if `initialCapitalBasis` is absent or `'cost'`; selling total if `'selling'`. Per this repository's established "pure function first" discipline (`purchaseToSellingConversion.ts`, `stockCountPortionGrouping.ts`, every Increment B checkpoint), this should be extracted into a small, pure, independently-testable function (e.g. `resolveInitialCapitalValue(initialStockCount)`), not left as an inline ternary buried in `AppContext.tsx` — matching this repository's own convention that business-meaning-bearing calculations get their own dedicated, unit-tested function rather than an anonymous inline expression. A defensive fallback to the cost total should apply if `initialCapitalBasis === 'selling'` but `totalSellingValue` is somehow absent (should not occur under Finding 1's design, since both totals are always computed together at the same write, but matches this codebase's existing `|| 0`/defensive-fallback discipline elsewhere).

**What must NOT change:** The formula shapes of `businessWorth`, `capitalGrowth`, `capitalGrowthPct` themselves (FR-6, FR-7) — only what `initialCapitalValue` resolves to changes; every downstream consumer (§4, above) requires zero changes of its own, since all of them read through this single point.

**Governance classification:** Fully Rule-8-resolvable. FR-5/FR-6 and `02-capital-growth-dual-basis-amendment.md` Part 1 already fully specify the required behavior; this Finding only names the technical shape (a pure, extractable function) that satisfies it cleanly and testably.

### Finding 5 — Scope Boundary: `currentInventoryValue` Must NOT Resolve Basis-Aware; Timeline Logging MUST

**Severity:** MINOR (Rule-8-resolvable, boundary clarification with one required fix)

**Evidence:** `currentInventoryValue = latestStockCount?.totalValue || 0` (`AppContext.tsx`) reads whichever count — Initial **or Periodic** — is most recent by date. This is a **different figure** from `initialCapitalValue`, governed by Expected Current Stock Value's own, separate, cost-basis convention (`10-expected-stock-value-amendment.md`), explicitly untouched by this Specification (§6 Non-Goals). It must continue reading raw `totalValue` unconditionally — a Periodic Contagem count never carries a basis pointer at all (Decision 7), so resolving it "basis-aware" would be meaningless for roughly half of what this variable can point to, and is not requested by any FR.

**A genuine required fix, found by this investigation, not previously named in either accepted document:** `recordStockCount`'s Timeline logging for `type === 'initial'` (`AppContext.tsx`, inside the `if (type === 'initial')` block) currently reads `newCount.totalValue` **directly** — always the cost total, regardless of the selected basis. FR-5's own text ("wherever `initialCapitalValue` is read... Dashboard, Reports, `capitalGrowth`'s own computation") should, on its own logic, also cover this Timeline entry — otherwise a selling-basis business would see its own historical Timeline record permanently show the cost figure for "Capital Inicial," inconsistent with every other consumer.

**Recommendation:** Compute the resolved value once, synchronously, at the point of confirmation (the basis is already known at that moment — no need to wait for a context re-render), using Finding 4's resolution function, and pass that resolved figure into the Timeline event instead of `newCount.totalValue` directly.

**Governance classification:** Fully Rule-8-resolvable. This is a straightforward, mechanical extension of FR-5's own already-stated scope ("wherever... is read"), not a new business decision — but it is flagged explicitly here so it is not silently missed during implementation, consistent with this repository's discipline of naming every consumer a change touches.

### Finding 6 — Multi-Portion Summation Is Already Correct by Construction

**Severity:** PASS (verification only)

**Evidence:** `normalizeStockCountItems` already sums every row independently with no product-level grouping or deduplication (confirmed exhaustively by B5's own Rule 8 Finding 4 and re-verified fresh here). Extending it to also accumulate `totalSellingValue` in parallel (Finding 1) inherits this already-correct behavior automatically — B5's multi-portion capability requires zero additional logic to remain correct for the new total.

**Recommendation:** No change to B5's summation mechanism, `stockCountPortionGrouping.ts`, or `InitialStockCountView.tsx`'s grouped-row rendering. This Finding confirms, it does not modify.

### Finding 7 — Tenant Isolation / Firestore Security Rules

**Severity:** PASS

**Evidence:** Confirmed directly against `firestore.rules` text (§4, above) — no field-level validation exists on either affected collection; the `type == 'initial'` immutability tier is unconditional and automatically extends to any new field on that document.

**Recommendation:** No `firestore.rules` change required for anything in this assessment's scope.

### Finding 8 — Firestore Indexes

**Severity:** PASS

**Evidence:** No `stockCounts`-related composite index exists today; this feature introduces no new query, `where`, or `orderBy` pattern — only new fields on an already-fetched document.

**Recommendation:** No `firestore.indexes.json` change required.

### Finding 9 — Concurrency, Atomicity, Failure/Recovery

**Severity:** PASS

**Evidence:** The existing single `fsBatch.commit()` already atomically bundles the `stockCounts` write and the `stockCountDrafts` deletion; a failed commit already leaves the draft fully intact today, and an existing regression test (`'the stockCounts write and the stockCountDrafts delete are queued on the same batch before a single commit'`) already protects this property directly against `recordStockCount`'s own source text.

**Recommendation:** Add the new fields (Findings 1–3) to the same, already-atomic write path. No new transaction, retry logic, or idempotency mechanism is required — the existing deterministic-id/single-batch design (already covering `'initial'`'s own singleton race-proofing) already covers whatever new fields are added to the same document.

### Finding 10 — Backward Compatibility for Existing/Historical Records

**Severity:** PASS

**Evidence:** Every prior additive field on `StockCount`/`InitialStockDraft`-family types in this codebase (`expectedValueAtCount?`, `restockObservation?`, `derivedSellingValuation?`) already follows the identical "optional field, absent on pre-existing records, no migration" pattern I-4 requires. `firestore.rules`' unconditional immutability block (Finding 7) makes any retroactive rewrite of an existing `'initial'` document structurally impossible even if attempted.

**Recommendation:** No migration or backfill script of any kind. Finding 4's resolution function's own `absent → cost` default is the entire backward-compatibility mechanism required.

### Finding 11 — Testing Strategy

**Severity:** MINOR (Rule-8-resolvable, informational)

**Evidence:** Two existing tests assert the current cost-only `totalValue` behavior and must continue passing unmodified (§4, above) — confirming the additive design carries no regression risk to them. No existing test anywhere references a "basis" concept — this is genuinely new test surface, not an extension of tested logic. Two existing B5/B6 wiring-guard tests contain a literal-string check, `doesNotMatch(source, /sellingBasisCapital/i)` — not a design constraint, but a naming note: whatever identifier the eventual implementation chooses should avoid that exact literal string, or that guard should be knowingly updated as part of implementation (not this assessment).

**New tests required at implementation time** (named here for Rule 8 completeness; not created by this document):
- Pure-function tests for the extended `normalizeStockCountItems` (`totalSellingValue` computed correctly, multi-portion, mixed unit/price, zero rows, and — critically — `totalValue` remains byte-identical to today's existing test expectations).
- Pure-function tests for the new `resolveInitialCapitalValue`-equivalent (absent basis → cost; `'cost'` → cost; `'selling'` → selling; `'selling'` with missing `totalSellingValue` → defensive fallback to cost; no `initialStockCount` at all → 0).
- Source-level guard confirming the basis choice is presented and captured once per confirmation, never per product/portion (mirroring this repository's established no-DOM-harness pattern).
- Regression confirmation that `businessWorth`'s own formula text is unchanged (`git diff` line-count check, matching the precedent Rule 8 Assessment's own Finding 5/verification method for an identical claim).
- Draft round-trip test: a selected-but-not-yet-confirmed basis survives `InitialStockDraft` autosave/resurrection.
- Confirmation-immutability regression: no code path exists that could update an already-confirmed `'initial'` `StockCount`'s `initialCapitalBasis` field.

**Governance classification:** Rule-8-resolvable; a testing plan, not a business decision.

### Finding 12 — `InitialStockPriceChangeEvent` Independence (Business Rule 11 / I-7)

**Severity:** PASS (verification only)

**Evidence:** `calculateInitialStockCurrentValuation`'s own doc comment already explicitly disclaims touching `initialCapitalValue`/`businessWorth`/`capitalGrowth`/`expectedCurrentStockValue`. No code path connects `InitialStockPriceChangeEvent`/`InitialStockPriceChangeModal.tsx` to the basis-resolution mechanism this assessment recommends.

**Recommendation:** No change to `calculateInitialStockCurrentValuation`, `InitialStockPriceChangeEvent`, or `InitialStockPriceChangeModal.tsx`. I-7 already holds by construction; implementation must simply avoid introducing any new connection between the two mechanisms.

### Finding 13 — Performance

**Severity:** PASS

**Evidence:** No new Firestore query or listener; one extra field read on an already-fetched document, one extra field written in an already-atomic batch. Negligible at any realistic scale.

### Finding 14 — Scope-Boundary Confirmation: `businessWorth`, Periodic Contagem UI, Add Stock

**Severity:** PASS (verification only)

**Evidence:** Confirmed fresh: `businessWorth`'s formula (`AppContext.tsx:822`) contains no `initialCapitalValue` term before this investigation and this assessment recommends adding none. `PeriodicStockCountView.tsx` and `AddStockView.tsx`/Smart Stock Entry are unrelated code paths — Finding 1's shared-function extension touches only `normalizeStockCountItems`'s return shape, never either component's own UI logic.

**Recommendation:** Any Implementation Authorization arising from this assessment must explicitly state that `businessWorth`, Periodic Contagem's UI/basis-selection, and Add Stock/Smart Stock Entry are unaffected and out of scope — consistent with `BDR-0014` §7 and Decision 7.

## 6. Finding-by-Finding Rule 8 Decisions

| # | Finding | Severity | Classification | Decision |
|---|---|---|---|---|
| 1 | Selling-valuation total computation point | MAJOR | Rule-8-resolvable | Extend `normalizeStockCountItems` additively; scope UI wiring to Initial Stock only |
| 2 | Basis-selector location, including draft state | MAJOR | Rule-8-resolvable | New optional field on `StockCount` and mirrored on `InitialStockDraft` |
| 3 | Confirmation wiring, immutability, atomicity | MINOR | Rule-8-resolvable | New `RecordStockCountParams` field; reuse existing atomic batch; zero rules change |
| 4 | `initialCapitalValue` resolution logic | MAJOR | Rule-8-resolvable | Extract a pure, testable resolution function |
| 5 | `currentInventoryValue` boundary; Timeline logging fix | MINOR | Rule-8-resolvable | `currentInventoryValue` untouched; Timeline logging updated to use resolved value |
| 6 | Multi-portion summation | — | Verification | PASS — no change needed |
| 7 | Tenant isolation / security rules | — | Verification | PASS — no `firestore.rules` change |
| 8 | Firestore indexes | — | Verification | PASS — no index change |
| 9 | Concurrency / atomicity / failure recovery | — | Verification | PASS — existing single-batch commit suffices |
| 10 | Backward compatibility | — | Verification | PASS — optional-field pattern, no migration |
| 11 | Testing strategy | MINOR | Rule-8-resolvable | Test plan named (§5, Finding 11) |
| 12 | `InitialStockPriceChangeEvent` independence | — | Verification | PASS — already independent by construction |
| 13 | Performance | — | Verification | PASS — negligible |
| 14 | Scope boundary (`businessWorth`, Periodic Contagem, Add Stock) | — | Verification | PASS — confirmed unaffected |

## 7. Data Model Assessment

**Additive only, on two existing types, both consistent with this codebase's own established pattern for every prior optional-field addition to this same document family:**

```
StockCount {
  ...unchanged...
  totalSellingValue?: number;          // Finding 1 — sum of quantity * sellingPrice, per portion, present on every count confirmed after this feature ships (both Initial and Periodic, per Decision 7); absent on every historical count
  initialCapitalBasis?: 'cost' | 'selling';  // Finding 2 — ONLY ever present for type === 'initial'; absent on every historical 'initial' count and on every periodic count of any kind
}

InitialStockDraft {
  ...unchanged...
  initialCapitalBasis?: 'cost' | 'selling';  // Finding 2 — mirrors the confirmed field, survives autosave/resurrection; discarded (never migrated) once the draft is deleted at confirmation
}
```

No change to `StockCountItem`, `InitialStockDraftItem`, `PeriodicStockDraftItem`, `Product`, `StockBatch`, or any other type. No change to any collection's document-id scheme.

## 8. Lifecycle/Confirmation Assessment

Owner opens Initial Stock → enters portions (unchanged) → selects Cost or Selling basis, once, for the whole snapshot (new UI control, likely near the existing "Confirmar Capital Inicial" button, per FR-2's "before the snapshot is confirmed" placement) → selection autosaves into `InitialStockDraft.initialCapitalBasis` alongside every other field (Finding 2) → owner clicks Confirm → `handleSubmit` passes the selection into `recordStockCount` (Finding 3) → `normalizeStockCountItems` computes both totals (Finding 1) → `newCount` is written, with both totals and the basis, inside the existing single atomic `fsBatch.commit()` (Finding 3/9) → `firestore.rules`' existing unconditional `type == 'initial'` block makes the entire document, including these new fields, permanently immutable from that instant forward (Finding 3/7) → every future read of `initialCapitalValue` resolves through Finding 4's function.

## 9. Capital Growth Impact Assessment

`capitalGrowth`/`capitalGrowthPct`'s own formulas are unchanged in shape (Finding 4). Every consumer — `DashboardView.tsx`, `BusinessWorthReport.tsx`, `CapitalGrowthReport.tsx`, `InitialStockPriceChangeModal.tsx` — requires zero code changes of its own, since all read `initialCapitalValue`/`capitalGrowth`/`capitalGrowthPct` from the same single context values (§4, above). `Closing`'s own `businessWorthAtClose` snapshot is unaffected — Closings never froze `initialCapitalValue` in the first place (Finding, §4 evidence on `Closing`'s type). The one required fix beyond the formula itself is Finding 5's Timeline-logging correction.

## 10. Backward Compatibility

See Finding 10. PASS, no migration, no backfill, matching I-4 exactly and confirmed structurally impossible to violate given Finding 7's evidence.

## 11. Tenant Isolation/Security

See Finding 7. PASS, zero `firestore.rules` change required.

## 12. Concurrency/Atomicity

See Finding 9. PASS, existing single-batch-commit design already sufficient.

## 13. Performance

See Finding 13. PASS, negligible.

## 14. Failure/Recovery

See Finding 9 — a failed confirmation leaves the draft (including its own `initialCapitalBasis` selection) fully intact, exactly as every other field on this screen already behaves today, protected by the same existing regression test.

## 15. Testing Strategy

See Finding 11 for the full named test plan.

## 16. Migration/Backfill Assessment

None required, none proposed, none possible without violating I-4 and the unconditional immutability rule (Finding 7). See Finding 10.

## 17. Explicitly Out of Scope

Consistent with `BDR-0014` §6/§7 and the Specification's own §6:

- `businessWorth`'s own formula (unaffected — Finding 14).
- Periodic Contagem's UI, basis-selection, or date/period model (Finding 1's scope note, Finding 14).
- Add Stock / Smart Stock Entry valuation logic (Finding 14).
- Any retroactive migration or backfill (Finding 10, 16).
- `product-memory-purchase-selling-valuation-specification.md` §19's original, narrower framing (superseded by `BDR-0014`'s broader resolution, per the Specification's own §6).
- Any Policy (`POL-NNNN`) document — none is drafted or assigned by this assessment.
- Any UI visual design beyond the functional requirement that the choice be presented once, before confirmation, for the whole snapshot.

## 18. Governance Boundary Violation Scan

Explicit check, performed against every Finding above: does any Finding smuggle a business decision into what should be a technical one, or a technical detail into what should remain a business-layer artifact?

- **Findings 1, 5** (extending a shared function; fixing Timeline logging) — both are mechanical consequences of already-accepted FRs (FR-1, FR-5), not new business decisions. Flagged explicitly in each Finding's own text so this is auditable, not asserted blindly.
- **Finding 2** (draft-state mirroring) — the only Finding that goes slightly beyond what the accepted documents explicitly wrote down. Classified explicitly as a technical elaboration of an already-accepted principle (§5.A item 4's "field on the Initial Stock record"), not a new decision, with reasoning given for why it does not require separate Product Architect authorization.
- **No Finding proposes a UI design, a specific field name binding, or a schema beyond what is necessary to satisfy an already-accepted FR/Invariant** — Section 7's data model is the minimum additive shape the Findings above require, nothing more.
- **No Finding reopens, reinterprets, or narrows any of `BDR-0014`'s four §5.A resolutions, or either companion amendment's own text.**

**No violation found.**

## 19. Final Rule 8 Verdict

**READY.**

Every Finding in this assessment is either a **PASS** (existing architecture already satisfies the requirement, verified directly, no change needed) or **fully Rule-8-resolvable** (a technical shape selected from what the accepted governance chain already fixes, with no open business question). **No Finding in this assessment requires a new Product Architect decision.** The accepted `BDR-0014`, its two companion amendments, and the Specification already fixed every business-level question this assessment needed; this document only selects among already-conforming technical shapes (Findings 1–5, 11) or confirms existing architecture already satisfies an accepted requirement (Findings 6–10, 12–14).

**"READY" means technically ready for the next governance gate — Implementation Authorization. It does not mean implementation is authorized.** No code, `firestore.rules`, index, or test file has been created or modified to produce this assessment.

---

## Verification Performed for This Assessment

- All four governing documents (`BDR-0014`, both amendments, the Specification) read completely and fresh from the repository, not from memory of prior sessions in this project.
- `apps/tenant/src/types.ts` — `StockCount`, `InitialStockDraft`, `InitialStockDraftItem`, `StockCountItem`, `Closing` read directly to confirm exact current shapes.
- `apps/tenant/src/utils/stockCount.ts` — `normalizeStockCountItems` read in full.
- `apps/tenant/src/context/AppContext.tsx` — `initialCapitalValue`/`businessWorth`/`capitalGrowth`/`capitalGrowthPct` definitions, `recordStockCount` in full (product resolution, `newCount` construction, `fsBatch` write/delete/commit sequence, Timeline logging), `RecordStockCountParams` interface — all read directly.
- `firestore.rules` — `stockCounts`/`stockCountDrafts` blocks read directly.
- `firestore.indexes.json` — grepped for any `stockCounts`-related entry (none found).
- Every consumer of `initialCapitalValue`/`capitalGrowth` across `apps/tenant/src` located via exhaustive grep and individually confirmed to read from context, not recompute independently.
- `apps/tenant/src/components/InitialStockCountView.tsx:483` — the exact `recordStockCount` call site read directly.
- `apps/tenant/src/utils/calculations.ts` — `calculateInitialStockCurrentValuation`'s own doc comment read to confirm I-7's independence already holds.
- `tests/initial-stock-confirmation.test.ts`, `tests/initial-stock-multi-portion-valuation.test.ts`, `tests/initial-stock-portion-grouping-wiring.test.ts`, `tests/periodic-stock-portion-grouping-wiring.test.ts` — read directly to confirm existing regression coverage and naming-collision risk.
- No `src/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` file was modified to produce this assessment.
- No Specification, BDR, or reconciliation-amendment artifact was modified to produce this assessment.
- No Implementation Authorization was created.

**This document does not itself authorize implementation.** It is a readiness opinion only, per this repository's established Rule 8 discipline — an explicit, separate Implementation Authorization remains the required next gate.
