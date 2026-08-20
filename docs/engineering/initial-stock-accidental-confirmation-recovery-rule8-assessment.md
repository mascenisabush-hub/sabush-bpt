# Rule 8 Assessment — Initial Stock Accidental Confirmation Recovery ("Void & Redo")

**Status:** Assessment complete. **Verdict: READY** (§15) — no remaining Product Architect decision. Governance action only — does not authorize implementation. A signed Implementation Authorization remains the required next gate, per `19-governance-bdr-policy-framework.md` §3.
**Governed by:** [`BDR-0015`](../specs/BDR-0015-initial-stock-accidental-confirmation-recovery.md) (Approved), [`POL-0008`](../specs/POL-0008-initial-stock-accidental-confirmation-recovery-policy.md) (Approved), [Initial Stock Accidental Confirmation Recovery Specification](../specs/initial-stock-accidental-confirmation-recovery-specification.md) (Accepted, signed by SABUSHIMIKE MASCENI, §23).
**Structural precedent:** [`initial-stock-dual-valuation-basis-rule8-assessment.md`](./initial-stock-dual-valuation-basis-rule8-assessment.md) — same module, most recent Rule 8 assessment of the Initial Stock confirmation path.
**This document does not:** modify `BDR-0015`, `POL-0008`, the accepted Specification, `firestore.rules`, `firestore.indexes.json`, or any application code. It does not create an Implementation Authorization. It assesses technical feasibility only.

> **⚠️ Amendment Notice:** the governing recovery-window figure this
> assessment's Finding B evaluates — **30 minutes** — has been amended to
> **12 hours** by the
> [Recovery Window Amendment](../specs/initial-stock-accidental-confirmation-recovery-window-amendment.md),
> which includes its own Rule 8 impact analysis (§5 of that document)
> concluding this assessment's **READY** verdict is reaffirmed, not
> reopened, for the 12-hour value — Finding B's mechanism
> (`serverTimestamp()` + `firestore.rules` time comparison) is
> duration-agnostic; only the literal `duration.value(30, 'm')` constant it
> enforces changes. No finding below is otherwise affected. The original
> text is preserved unedited as the historical record of the original
> assessment.

---

## 1. Fresh Repository Baseline

Verified directly, this session, before any assessment work:

- **Branch:** `main`
- **HEAD:** `bf5b5f82641fec6f318e2f22bdf97e154553e79e`
- **`origin/main`:** identical to HEAD after `git fetch origin main` (`bf5b5f8`)
- **Working tree:** clean, no unrelated changes
- **Commit containing the accepted Specification:** `bf5b5f8` — "Add Void & Redo governance chain: BDR-0015, POL-0008, accepted Specification" — confirmed present on disk at `docs/specs/BDR-0015-initial-stock-accidental-confirmation-recovery.md`, `docs/specs/POL-0008-initial-stock-accidental-confirmation-recovery-policy.md`, `docs/specs/initial-stock-accidental-confirmation-recovery-specification.md`, all carrying their approved/accepted status headers (verified by direct grep of each file's `**Status:**` line).

No reliance on conversation memory — every governance and code claim below was re-read or re-grepped fresh from disk this session.

## 2. Governance Inputs (Re-read Fresh)

- `BDR-0015` — Decisions A–H (§9), the narrow-exception framing (§3).
- `POL-0008` — Rules A–L, Decision 5 (3-recovery-cycle ceiling).
- The accepted Specification — Business Rules 1–14, Invariants I-1–I-8, FR-1–FR-27, Acceptance Criteria 1–20, §17 Rule-8 Technical Questions, §21 Product Architect Clarification (Confirmation #4).
- `10-stock-counts.md` — existing Initial Stock module spec, including its own FR-6 ("still open") and the Draft → Editable → Confirmed workflow.
- `02-core-product-principles.md` §2.10 — Immutability Where Trust Matters.
- `02-business-worth-engine.md` — `capitalGrowth`/`capitalGrowthPct` formulas, unaffected here.
- `10-initial-stock-valuation-history-amendment.md`, `10-initial-stock-dual-valuation-basis-amendment.md`, `02-capital-growth-dual-basis-amendment.md`, `initial-stock-dual-valuation-basis-specification.md`, and its own Rule 8 Assessment/Implementation Authorization — the dual-valuation mechanism this feature reuses unmodified.

The accepted Specification is treated as the authoritative functional-scope source throughout. No terminology or requirement below is silently corrected — where code evidence conflicts with a requirement, it is recorded as a finding, not resolved by reinterpreting the Specification.

## 3. Scope of This Assessment

Whether, and how, the accepted Specification's 27 functional requirements can be safely implemented against the actual current codebase — without deciding any new business rule, and without touching code, rules, indexes, or tests in this session.

## 4. Current-System Evidence

Investigated directly from disk this session (`apps/tenant/src/`, `server/`, `firestore.rules`):

- **`StockCount`/`StockCountItem` types** (`apps/tenant/src/types.ts:503–570`): the dual-valuation fields (`totalSellingValue`, `initialCapitalBasis`) already exist and are populated per-count by the shipped Dual-Valuation-Basis feature. `StockCountItem` has no client-side row id.
- **`InitialStockDraft`/`InitialStockDraftItem`** (`types.ts:572–610`): a single, fixed-id (`'initial'`) per-business document; `InitialStockDraftItem` carries a client-generated `id`, `productName`, `quantity`, `unit`, `costPrice`, `sellingPrice`, and the draft carries its own in-progress `initialCapitalBasis`.
- **Confirmation path** (`recordStockCount`, `AppContext.tsx:2551–2761`):
  - Hard-blocks a second `'initial'`-type count: `if (type === 'initial' && hasInitialStockCount) throw ...` (line 2555).
  - **Writes every `'initial'`-type count to a fixed document id `'initial'`** (line 2693) — a deliberate, comment-documented "Fix #3 — Initial Stock Count Singleton," explicitly relying on Firestore's create/update semantics plus `firestore.rules`' unconditional refusal of any update to a `type: 'initial'` document to make the singleton invariant race-proof, server-enforced (lines 2653–2670).
  - Confirmation and draft deletion happen in one Firestore batch (lines 2745–2761) — draft cleanup is atomic with confirmation, and a failed batch leaves the draft untouched.
  - Logs a Business Timeline entry (`logTimelineEvent`, type `'initial-stock-count'`) with `financialImpact` derived from `resolveInitialCapitalValue(newCount)` (lines 2763–2787).
- **Active-confirmation derivation** (`AppContext.tsx:797–809`): `initialStockCount = stockCounts.find(s => s.type === 'initial') || null`; `hasInitialStockCount = !!initialStockCount`; `initialCapitalValue = resolveInitialCapitalValue(initialStockCount)`. **This is a single, already-centralized choke point** — the code's own comment confirms every consumer (Dashboard, both Reports, `InitialStockPriceChangeModal`, the Timeline entry) reads through this one `initialCapitalValue` constant, not an independent derivation.
- **`resolveInitialCapitalValue`** (`calculations.ts:130`+): pure function, no Firestore/AppContext dependency, already handles the cost/selling basis resolution per `BDR-0014`.
- **`firestore.rules` — `stockCounts` block** (lines 436–447): `allow update, delete: if isOwnerOf(businessId) && resource.data.get('type', null) != 'initial';` — **unconditionally refuses any update or delete to a `type: 'initial'` document, for every role including Owner, with no time-boxing and no exception of any kind.** This is Architecture 8.6's documented "no exceptions" tier.
- **`firestore.rules` — `stockCountDrafts` block** (lines 455–464): Owner-only read/create/update/delete; `create`/`update` subscription-gated via `subscriptionAllowsNewRecords(businessId)`; `delete` is never subscription-gated.
- **`stockCounts` create rule** (line 441): `allow create: if isOwnerOf(businessId) && subscriptionAllowsNewRecords(businessId);` — the original Initial Stock confirmation is itself subscription-gated.
- **No `serverTimestamp()`/`FieldValue` usage found anywhere in `AppContext.tsx`** — every existing timestamp in this write path (`createdAt`, draft `updatedAt`, etc.) is a client-generated `new Date().toISOString()`. No precedent exists for a server-enforced timestamp on this write path.
- **No existing secondary-confirmation dialog on the Confirm action** (`InitialStockCountView.tsx:906–945`): the "Confirmar Capital Inicial" control is a plain `type="submit"` button with no "are you sure" step, no distinguishing visual treatment from other buttons on the form, and no window-visibility/countdown UI pattern exists anywhere in `apps/tenant/src/components/`.
- **`stockCountPortionGrouping.ts`**: existing, independently-tested multi-portion grouping logic (B5/B6) — confirms multi-portion products are already summed correctly today; this feature must not alter that module.

## 5. Findings — High-Risk Areas

### A. Exact draft restoration (FR-3, FR-4)

**Finding A1 — MAJOR (technical, resolvable within Rule 8 authority).** Today's `InitialStockDraft` (`stockCountDrafts/initial`) is deleted in the same atomic batch as confirmation (`AppContext.tsx:2750–2751`) — it does not exist after confirmation. FR-3 requires restoring "the exact pre-confirmation draft state" after a void, so the draft must be reconstructible from data that *does* survive.

**Evidence-based feasibility:** Comparing `InitialStockDraftItem` (`id`, `productName`, `quantity`, `unit`, `costPrice`, `sellingPrice`) against the confirmed `StockCountItem` (`productId`, `productName`, `quantity`, `unit`, `costPrice`, `sellingPrice`, `totalValue`), the confirmed item is a **strict superset** of the draft item's business-meaningful fields, minus only the client-generated row `id` — which is a UI list-key convenience, not business data, and is trivially regenerable per row on restoration without any data loss. The draft's snapshot-level `initialCapitalBasis` is also independently preserved on the confirmed `StockCount.initialCapitalBasis`. **No information is irretrievably lost between draft and confirmed state.**

**Proposed resolution (Rule 8 authority, not a business decision):** reconstruct the restored draft directly from the voided confirmation's own `items`/`initialCapitalBasis`, generating fresh client-side row ids. No new schema field is required to satisfy FR-3 itself.

### B. Authoritative 30-minute timing (Business Rule 2, FR-2, FR-8)

**Finding B1 — MAJOR (technical, resolvable within Rule 8 authority).** No `serverTimestamp()` pattern exists anywhere in this write path today; every timestamp is client-generated. A client-generated `createdAt` is vulnerable to client clock manipulation extending an apparent window.

**Proposed resolution:** use Firestore's `serverTimestamp()` sentinel (available from the client SDK, no Cloud Function required) for a new `confirmedAt` field on each confirmation event, and enforce the 30-minute check in `firestore.rules` using `request.time` (the server's trusted clock) compared against `resource.data.confirmedAt` — never a client-supplied value. This is consistent with this codebase's existing pattern of enforcing invariants at the Security Rules layer (the same layer that already enforces the singleton and immutability rules) rather than introducing a new Cloud Function boundary. Stale tabs/multi-tab/logout-login are non-issues under this design, since the check is server-time-based at write time, not client-clock-based at read time.

**Exactly-at-30-minute boundary:** must be defined inclusively or exclusively in the eventual rule expression (e.g., `request.time < resource.data.confirmedAt + duration.value(30, 'm')`); this is a routine implementation detail, not a business ambiguity — Business Rule 6/FR-16 already requires the boundary be unconditional either way.

### C. Owner-only authorization (Business Rule 5, FR-14, FR-15)

**Finding C1 — PASS (pattern already established, requires straightforward extension).** The existing `stockCounts` rule already distinguishes Owner (`isOwnerOf`) from broader membership (`isMemberOf`) at the rules layer, not merely in the UI. Extending this same pattern to gate the Void & Redo write path is a direct application of an existing, proven mechanism — not a new authorization model.

### D. Atomic Void & Redo (FR-2, FR-5, FR-25, FR-27)

**Finding D1 — MAJOR (technical, resolvable, requires careful design).** Void and Redo are, per the accepted Specification itself (FR-26, distinguishing an interrupted recovery), **two logically separate actions** — voiding restores a draft the Owner then edits before choosing to reconfirm — not a single atomic client transaction spanning both. This is consistent with Business Rule 3/FR-3's "resumes from the draft state... may edit before confirming" framing, and is not a technical shortcut this assessment is introducing.

What *does* need atomicity is: (a) the void step itself (marking the prior confirmation voided and reconstructing the draft, together, so a failure never leaves the prior confirmation "half-voided"), and (b) the redo step itself (the same single-batch confirm+draft-delete pattern `recordStockCount` already uses today, reused unmodified). **Both halves can reuse this codebase's existing, already-proven single-Firestore-batch pattern** (`fsBatch.set()`/`fsBatch.delete()` + `fsBatch.commit()`) — no new transaction primitive is required.

**Concurrency (FR-27):** preventing two simultaneous void attempts from both succeeding, or a concurrent attempt from exceeding the ceiling, requires the voiding write itself to be conditioned, at the Security Rules layer, on the document's *current* state at write time (e.g., a rule requiring `resource.data.get('voided', false) == false` as a precondition of the voiding write) — Firestore's own optimistic-concurrency semantics at the rules layer make a second simultaneous attempt against an already-voided document fail outright, satisfying I-1/I-4 without a Cloud Function or distributed lock. This is a standard, already-idiomatic pattern for this codebase (the existing singleton-id trick at line 2653–2670 relies on the identical mechanism).

### E. 3-cycle / 4-confirmation ceiling; Confirmation #4 blocked (Business Rule 10, FR-7, FR-8, I-4, I-5, §21 Clarification)

**Finding E1 — MAJOR (technical, resolvable, and load-bearing — assessed with the precision the Clarification requires).** No `recoveryCyclesUsed`/chain-position concept exists anywhere in the current schema. This is a genuinely new piece of state to introduce (a technical requirement, not a business one — the ceiling itself is fully decided).

**Verified against the exact §21 Clarification, not reinterpreted:** the technical design must ensure that once 3 recovery cycles are consumed, **the void step itself is refused for the resulting (4th) confirmation** — not merely that a redo cannot follow. This is directly achievable by having the voiding write's own Security Rules precondition include a check against the recovery-cycle count (e.g., refuse the voiding write if the confirmation being voided is itself the 4th in its chain), enforced at the same layer as the immutability rule itself — so a ceiling-blocked attempt fails the *write*, never partially succeeding. Under this design, Confirmation #4's window can still be computed and displayed client-side (satisfying FR-21's visibility requirement) purely from its own `confirmedAt` timestamp, entirely independent of whether the underlying void action would ever be permitted to succeed — these are two independent concerns (display vs. write authorization), which is exactly what §21/I-5 requires them to be.

**This finding is assessed as fully resolvable without exceeding Rule 8 authority** — nothing here reinterprets the ceiling; it only identifies the mechanism (a chain-position/cycle-count check gating the voiding write) that makes the already-decided rule enforceable under concurrency.

### F. Active confirmation read path (FR-12, FR-13)

**Finding F1 — MAJOR (structural conflict, resolvable, requires schema redesign).** The current "Fix #3" singleton design (fixed document id `'initial'`, one document ever, per business) is **structurally incompatible** with retaining up to 4 permanently-preserved confirmation events (FR-9). This is a genuine architectural conflict the investigation confirms directly — not a hypothetical one.

**Proposed resolution (Rule 8 authority):** move from "one fixed-id document" to "multiple `type: 'initial'` documents per business, distinguished by a chain-position/voided marker," with the *derivation* of `initialStockCount` (line 797) updated from `stockCounts.find(s => s.type === 'initial')` to `stockCounts.find(s => s.type === 'initial' && !s.voided)`. **Because this derivation is already the single, centralized choke point every consumer reads through (confirmed directly in code and its own comment), this is a low-blast-radius change** — Dashboard, both Reports, `InitialStockPriceChangeModal`, and the Timeline entry require no individual changes; they all continue reading the same `initialCapitalValue`/`hasInitialStockCount` constants.

**Finding F2 — MINOR.** The `hasInitialStockCount` guard in `recordStockCount` (line 2555) must be updated in lockstep with F1's derivation change, or a redo confirmation will be incorrectly blocked by the same guard that currently (correctly) prevents a second original confirmation.

### G. Historical immutability (Business Rule 4, 9, FR-9, FR-10, FR-11)

**Finding G1 — MAJOR (governance-sensitive technical design; resolvable without weakening the immutability guarantee).** `firestore.rules`' current unconditional refusal of any update to `type: 'initial'` is precisely the enforcement mechanism `BDR-0015` §3 item 3 states this feature must not weaken ("Void & Redo does not modify the frozen record Principle 2.10 protects").

**Two candidate technical directions, both within Rule 8 authority, neither requiring a new business decision:**
1. Narrowly carve a single, tightly-scoped exception into the existing rule — permitting exactly one field-limited, one-way transition (e.g., writing `voided: true`/`voidedAt` and nothing else) under strict preconditions (Owner-only, within the 30-minute/ceiling constraints of Findings B/D/E) — after which the same unconditional refusal re-applies to every other field, forever.
2. **Recommended:** never update the original document at all — instead, record the voiding as a *new*, separately-created, append-only record (e.g., co-located under the confirmation's own document or a small sibling collection), leaving the original `type: 'initial'` document literally byte-for-byte untouched, exactly as the current rule already guarantees. The "active confirmation" derivation (Finding F1) then treats a confirmation as voided if a corresponding void-record exists, rather than by reading a mutated field on the original.

Direction 2 is preferred because it preserves the *literal* truth of `firestore.rules`' existing comment ("refused unconditionally... not merely a UI omission") with zero modification to that rule's own text — the new capability is additive (a new, narrow `allow create` for the void-record artifact), not a carve-out inside the existing unconditional refusal. **Resolved: Direction 2 is adopted as this assessment's own Rule 8 technical decision** — choosing between two functionally-equivalent, business-rule-preserving technical designs is squarely within Rule 8 authority (a "how," not a "why"), and resolving it here rather than deferring it removes ambiguity from the eventual Implementation Plan. The exact field/collection naming remains an implementation-task detail, not fixed here.

### H. Dual valuation basis (FR-22–FR-24)

**Finding H1 — PASS.** The dual-valuation mechanism (`totalSellingValue`, `initialCapitalBasis`, `resolveInitialCapitalValue`) already operates per-`StockCount`-document, independently of any singleton assumption. Under Finding F1's multi-document model, each confirmation event (original and every redo) naturally gets its own independent `totalSellingValue`/`initialCapitalBasis` pair, with **zero modification** to `resolveInitialCapitalValue`, `normalizeStockCountItems`, or any dual-valuation code — satisfying FR-22–FR-24 by construction, not by new logic.

### I. Accidental-confirmation prevention UX (FR-18–FR-21)

**Finding I1 — MAJOR (genuine gap, confirmed directly, resolvable as ordinary UI implementation work).** The current Confirm action (`InitialStockCountView.tsx:937–944`) has no secondary confirmation step, no distinguishing placement, and no consequence messaging — directly confirming the motivating problem `BDR-0015`/`10-stock-counts.md` FR-6 already named. No countdown/window-visibility UI pattern exists anywhere in this codebase to reuse for FR-21; this is genuinely new UI work, not a redesign of anything existing. This finding does not expose any business ambiguity — FR-18–FR-21 already explicitly defer exact wording/component/placement to this stage, and nothing here decides them; it only confirms that (component design aside) the technical means to implement them (a confirmation dialog, a badge/timer element) are ordinary, already-common patterns for this stack (React) with no structural obstacle.

### J. Interrupted recovery (FR-26)

**Finding J1 — PASS (scope already correctly bounded by the accepted Specification).** For Confirmations #1–#3, an interruption between a successful void and a completed reconfirmation is a real, reachable technical state (browser close, connection failure, session expiry) — and is explicitly named, not silently assumed away, by FR-26 itself. Given Finding G1's Direction 2 (a separate void-record, not a mutation of the original), an interrupted recovery leaves: the original permanently and correctly marked voided (via its void-record), no redo confirmation, and the business's active-confirmation derivation (Finding F1) correctly resolving to "none" — matching the existing, already-governed `hasInitialStockCount: false`/`initialCapitalValue = 0` fallback path `05-business-lifecycle.md` §5.4 already documents for a business that has never confirmed Initial Stock. **No new fallback behavior needs to be invented** — the existing zero-active-confirmation code path, confirmed present in the codebase today for the onboarding-skip case, already produces the correct behavior for this interrupted-recovery case, with no additional design needed. Confirmation #4 cannot reach this state at all, per Finding E1 (the void step itself is refused for #4).

## 6. Findings Summary (Requirement Traceability)

| Area | Requirements | Verdict | Summary |
|---|---|---|---|
| A — Draft restoration | FR-3, FR-4, Business Rule 3 | MAJOR → resolvable | Confirmed item is a superset of draft item; reconstruction is lossless |
| B — Timing | Business Rule 2, 6, FR-2, FR-8, FR-16 | MAJOR → resolvable | No server-timestamp precedent exists; `serverTimestamp()` + rules `request.time` proposed |
| C — Owner-only | Business Rule 5, FR-14, FR-15 | PASS | Existing `isOwnerOf` pattern extends directly |
| D — Atomicity | FR-2, FR-5, FR-25, FR-27, I-1 | MAJOR → resolvable | Existing single-batch pattern reused; rules-layer optimistic concurrency for the ceiling |
| E — Ceiling / Confirmation #4 | Business Rule 10, FR-7, FR-8, I-4, I-5, §21 | MAJOR → resolvable, high-precision | Void step itself must be rules-refused for the 4th confirmation, not merely the redo |
| F — Read path | FR-12, FR-13, Business Rule 7 | MAJOR (structural) → resolvable | Singleton fixed-id model conflicts with multi-confirmation retention; single choke-point derivation limits blast radius |
| G — Immutability | Business Rule 4, 9, FR-9, FR-10, FR-11 | MAJOR (governance-sensitive) → resolved | Additive void-record (Direction 2) adopted as Rule 8's own technical decision; existing unconditional rule text untouched |
| H — Dual valuation | FR-22–FR-24, Business Rule 13 | PASS | No change needed to existing mechanism; works per-document already |
| I — Accidental-confirmation UX | FR-18–FR-21 | MAJOR (gap) → ordinary implementation | Confirmed gap in current UI; no structural obstacle to closing it |
| J — Interrupted recovery | FR-26 | PASS | Existing zero-active-confirmation fallback already covers this state |
| K — Subscription-gating exemption | (new, per Product Architect decision, Option A) | MAJOR → resolvable | Void & Redo write path exempt from `subscriptionAllowsNewRecords`, scoped narrowly, not a reusable bypass |
| Invariants I-1–I-8 | — | Addressed | I-1 (Finding D1/F1), I-2 (Finding G1), I-3 (Finding B1), I-4/I-5 (Finding E1), I-6 (unaffected, Finding H1), I-7 (unaffected — no `businessWorth` term touched anywhere in this design), I-8 (Finding G1) |
| Acceptance Criteria 1–20 | — | Addressed | Each traces to the Findings above via the Specification's own §19 Traceability Matrix; none requires a technical design this assessment could not resolve |
| §17 Rule-8 Technical Questions | — | Addressed | Every item in that list is answered or given a proposed direction by Findings A–J above |

No finding required inventing a requirement to lengthen this list; every MAJOR finding above corresponds to a genuine, evidence-based gap between the current codebase and an already-approved requirement.

## 7. Data Model Assessment

- **New field(s) required:** a chain-position/void indicator per confirmation event (Finding F1), a server-enforced `confirmedAt` (Finding B1), and — under Direction 2 (Finding G1, adopted) — a small additive void-record artifact rather than a mutated field on the original document. No exact field name, document shape, or collection layout is fixed by this assessment; that remains an Implementation Plan/Authorization detail, consistent with the Specification's own explicit deferral (§17), but the *architectural direction* (additive, non-mutating) is now settled.
- **No change required** to `StockCountItem`, `totalSellingValue`, `initialCapitalBasis`, or any dual-valuation field shape (Finding H1).
- **No change required** to `InitialStockDraftItem`'s shape (Finding A1) — only to how/when a draft-equivalent state is populated (reconstructed vs. freshly authored).

## 8. Security Analysis

- The Owner-only requirement (Finding C1) and the ceiling enforcement (Finding E1) both require Security Rules changes, not merely UI changes — consistent with this codebase's existing discipline (the current `stockCounts` rule already enforces immutability at this layer, not the UI).
- The adopted immutability direction (Finding G1, Direction 2) is deliberately chosen to avoid modifying the existing unconditional `type == 'initial'` refusal at all — minimizing the security-review surface of the eventual rules change to a narrow, additive `allow create` rule for a new artifact.
- Tenant isolation: no new cross-tenant read/write path is introduced anywhere in this design — every proposed new field/artifact remains scoped under the existing `businesses/{businessId}` path structure, matching every other collection in `firestore.rules`.

## 9. Concurrency Analysis

Covered in Finding D1/E1: Firestore's own optimistic-concurrency semantics at the Security Rules layer (a write's precondition checked against `resource.data` at write time) are sufficient to prevent (a) two simultaneous void attempts both succeeding, and (b) a concurrent attempt exceeding the 3-cycle ceiling — without introducing a Cloud Function, distributed lock, or new infrastructure. This mirrors the exact mechanism the existing singleton-id design (line 2653–2670) already relies on for a structurally identical race-safety guarantee.

## 10. Performance Analysis

No performance concern identified. The maximum data volume introduced per business is bounded and small (at most 4 confirmation events, each already the same size as today's single `initial` count); no new query pattern beyond `stockCounts.find(...)` (already an in-memory operation over an already-fetched, small per-business collection) is required.

## 11. Migration/Backfill Assessment

**Finding — no migration required.** Consistent with `BDR-0014`'s own prospective-only precedent and `BDR-0015`'s own framing:

- An existing `initial` record (confirmed before this capability exists) has no `confirmedAt` server-timestamp field, no chain-position, and no void-record. Under Finding F1's derivation (`!s.voided`), an old record with no void indicator is correctly treated as active, unchanged, exactly as today.
- Such a record must never become eligible for Void & Redo through any default-assignment or backfill — this must be a explicit implementation-time testing requirement (verify: a record missing the new timing/chain-position fields is treated as **outside** any recovery window, never as "always eligible" by an absent-field default). This is flagged here as a required test case, not a design gap.
- No existing business's `initialCapitalValue`, `hasInitialStockCount`, or Timeline history is altered by this feature's existence alone.

## 12. Testing Strategy

- Unit tests for the draft-reconstruction logic (Finding A1): confirm byte-for-byte equivalence between a voided confirmation's stored items and the restored draft, across single- and multi-portion products (reusing `stockCountPortionGrouping.ts`'s existing test fixtures where possible).
- Rules-emulator tests for: Owner-only enforcement, the 30-minute boundary (both sides), the ceiling refusal specifically against a 4th confirmation's void attempt, and that the original's non-void-record fields are never writable post-confirmation, exactly as today.
- Concurrency tests: two simultaneous void attempts against the same confirmation; a void attempt racing against the ceiling being reached.
- Regression tests: existing dual-valuation, multi-portion, and Timeline tests must pass unmodified, per Findings H1/J1's "no change" conclusions.
- A specific backward-compatibility test per §11's migration finding: an old `initial` record with none of the new fields must be provably ineligible for recovery.

## 13. Adversarial / Scope Analysis

Checked explicitly for scope creep beyond the accepted Specification:

- No new consumer of `initialCapitalValue` is introduced (Finding F1 confirms the existing consumer set is exhaustive and unchanged).
- No change to `businessWorth`'s formula is proposed anywhere in this assessment (I-7 unaffected).
- No change to Periodic Contagem, Add Stock, or Product Memory is proposed anywhere in this assessment.
- The dual-valuation mechanism is reused, not redesigned (Finding H1).
- Every UI requirement (Finding I1) is scoped to functional behavior only — no visual design, copy, or component choice is fixed here.

## 14. Governance-Boundary Violation Scan (Including Recorded Product Architect Decision)

For every proposed resolution above, checked against: *"Is this the technical means of satisfying an already-approved requirement, or does it introduce a new business decision?"*

- Findings A, B, C, D, F, H, I, J: purely technical means to already-fully-specified ends. No boundary concern.
- Finding E: technical means only — verified word-for-word against the §21 Clarification; the proposed rules-layer precondition on the voiding write is exactly "the ceiling blocks the entire Void & Redo operation... not merely the creation of the next confirmation," not a reinterpretation of it.
- Finding G: two technical directions were presented; Direction 2 is **adopted** as this assessment's own Rule 8 technical decision (§5.G), not deferred — choosing between two business-rule-preserving technical designs is within Rule 8 authority, even though the eventual rules-file change itself still requires Implementation Authorization sign-off before being written.
- **No proposed resolution changes:** the 30-minute window, the Owner-only rule, the 3-cycle ceiling, the 4-confirmation maximum, the Confirmation #4 blocked-recovery rule, independent basis selection, historical preservation, the `businessWorth` formula, or Void & Redo's status as the sole recovery path. Each was checked individually against this list per the governance instruction.

### Subscription/trial gating interaction — Product Architect Decision Recorded (Option A)

**Status:** ✅ **Resolved.** The existing `stockCounts` `allow create` rule already gates the *original* Initial Stock confirmation on `subscriptionAllowsNewRecords(businessId)` (line 441) — a lapsed-trial/expired business cannot create its first Initial Stock count. A redo confirmation is, technically, also a new document creation under Finding F1's model, so this assessment correctly surfaced the interaction as undecided by any prior governance artifact. It has since been resolved by explicit Product Architect decision, recorded verbatim below.

> **PRODUCT ARCHITECT DECISION — OPTION A**
>
> The Void & Redo mechanism is a safety/recovery capability for accidental Initial Stock confirmation and must NOT be blocked by the normal subscription/trial gate that governs creation of new records.
>
> 1. A business that has an active, valid Void & Redo recovery window must be allowed to use that recovery capability even if its normal subscription/trial state would otherwise prevent creation of new records.
> 2. The purpose is to ensure that an Owner who accidentally confirmed Initial Stock is not permanently blocked from correcting that accidental confirmation merely because the business is currently subject to the normal subscription/new-record restriction.
> 3. This is NOT authorization to bypass subscription enforcement generally. It applies ONLY to the narrowly defined Void & Redo recovery flow governed by `BDR-0015`, `POL-0008`, and the accepted Specification.
> 4. The existing 30-minute window remains fully enforced. The recovery must still be: Owner-only; limited to the active confirmation; measured from that confirmation's own timestamp; non-restartable; non-extendable; subject to the 3-recovery-cycle/4-confirmation-event ceiling; unavailable against Confirmation #4 itself, per the accepted Specification clarification.
> 5. Not permission to create unrelated records while subscription access is blocked.

**Incorporated as a new Finding K.**

**Finding K1 — MAJOR (technical, resolvable within Rule 8 authority, now unblocked by the decision above).** Both the void step and the redo step of Void & Redo must be **exempt** from the `subscriptionAllowsNewRecords(businessId)` precondition that gates the *original* Initial Stock confirmation and every other ordinary new-record creation in this schema.

**Proposed resolution:** the eventual Security Rules design (Findings D1/E1/G1) must scope its `allow create`/`allow` conditions for the Void & Redo write path (the void-record artifact, and the redo confirmation document) to check Owner-only + window/ceiling preconditions **without** including `subscriptionAllowsNewRecords(businessId)` as a precondition — a deliberate, narrow carve-out from the pattern every other `stockCounts`/`stockCountDrafts` write already follows, scoped exclusively to this one write path per the decision's own item 3. This must not be implemented as a general subscription-bypass flag reusable elsewhere — the eventual rule expression should reference the Void & Redo-specific conditions directly (ownership, window, ceiling), not a shared "skip subscription check" helper that other write paths could accidentally inherit.

This finding introduces no further open question — the decision above is definitive and directly actionable as a Security Rules design constraint.

## 15. Final Rule 8 Verdict

**READY.**

Every technical question this assessment investigated (Findings A–K) is resolvable within Rule 8 authority, with a concrete, evidence-based resolution or proposed direction for each — none requires reopening or reinterpreting any already-approved business decision. The one genuine gap this assessment surfaced — the subscription-gating interaction (§14) — was not addressed by any prior governance artifact, but has since been resolved by explicit Product Architect decision (Option A, recorded above) and incorporated as Finding K.

**No remaining Product Architect decision.** Every finding in this assessment (A–K) is now either PASS or MAJOR-resolved/resolvable entirely within Rule 8 authority. This assessment identifies no remaining blocker to drafting an Implementation Plan/Authorization.

## Verification Performed for This Assessment

- Re-read `BDR-0015`, `POL-0008`, and the accepted Specification completely and fresh from disk (this session).
- Re-read `10-stock-counts.md`, `02-core-product-principles.md` §2.10, and confirmed the `05-business-lifecycle.md` §5.4 zero-active-confirmation precedent.
- Directly inspected: `apps/tenant/src/types.ts` (StockCount/StockCountItem/InitialStockDraft), `apps/tenant/src/context/AppContext.tsx` (`recordStockCount`, `initialStockCount`/`hasInitialStockCount`/`initialCapitalValue` derivation), `apps/tenant/src/utils/calculations.ts` (`resolveInitialCapitalValue`), `apps/tenant/src/components/InitialStockCountView.tsx` (Confirm button/UX), `firestore.rules` (`stockCounts`, `stockCountDrafts` blocks), and confirmed no `serverTimestamp()`/countdown-UI precedent exists in the current codebase.
- Verified every finding above against exact, quoted current-code evidence — no finding was asserted without a direct code citation.
- Confirmed this document introduces no application code, `firestore.rules`, `firestore.indexes.json`, or test changes.
- Confirmed `BDR-0015`, `POL-0008`, and the accepted Specification remain byte-for-byte unmodified by this assessment (`git diff --stat` against each, run this session, empty).
- Confirmed no Implementation Authorization file was created.
- Confirmed only this Rule 8 Assessment file was created (`git status --porcelain`, run this session).
