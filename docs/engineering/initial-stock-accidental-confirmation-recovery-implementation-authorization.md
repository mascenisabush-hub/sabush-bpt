Implementation Authorization

# Implementation Authorization — Initial Stock Accidental Confirmation Recovery ("Void & Redo")

**Type:** Governance bridge document — the formal record that engineering governance is complete and implementation would be authorized to begin, once signed.

**Status:** ✅ **Authorized. Signed by the Product Architect** — see §10, below.

**Governing chain:** [`BDR-0015`](../specs/BDR-0015-initial-stock-accidental-confirmation-recovery.md) (✅ Approved, Decisions A–H — §9) → [`POL-0008`](../specs/POL-0008-initial-stock-accidental-confirmation-recovery-policy.md) (✅ Approved, Rules A–L, Decision 5) → [Initial Stock Accidental Confirmation Recovery Specification](../specs/initial-stock-accidental-confirmation-recovery-specification.md) (✅ Accepted, signed by SABUSHIMIKE MASCENI, §23, including the §21 Confirmation #4 Clarification) → [Rule 8 Assessment](./initial-stock-accidental-confirmation-recovery-rule8-assessment.md) (✅ **READY** — Findings A–K, no remaining Product Architect decision; the Option A subscription-gating exemption is itself already a recorded Product Architect decision, §14) → [Implementation Plan](./initial-stock-accidental-confirmation-recovery-implementation-plan.md) (drafted, companion document).

**Precedent note:** this document's structure follows the most recent, directly comparable precedent in this repository, [`initial-stock-dual-valuation-basis-implementation-authorization.md`](./initial-stock-dual-valuation-basis-implementation-authorization.md) — same module, same Initial Stock confirmation path, signed and Authorized.

**Repository state at this revision:** `main = origin/main = a65d98feafdf165a9132494fcfcedaefc5577785`, working tree clean, confirmed immediately before this document was drafted. **Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, `tests/`, `BDR-0015`, `POL-0008`, the accepted Specification, or the Rule 8 Assessment to produce this document.**

> **⚠️ Amendment Notice:** the recovery-window figure this Authorization's
> acceptance criteria and required-tests list state — **30 minutes** — has
> been amended to **12 hours** by the
> [Recovery Window Amendment](../specs/initial-stock-accidental-confirmation-recovery-window-amendment.md).
> **This original Authorization remains validly signed for the 30-minute
> implementation that was actually built from it** (see the amendment's
> §6): it is not revoked or invalidated by the amendment. Editing the
> already-implemented `firestore.rules`/`calculations.ts` 30-minute
> constants to 12 hours is a separate, not-yet-authorized follow-up step,
> per the amendment's §6/§7. The original text below is preserved unedited
> as the historical record of what was actually authorized and built.

---

## 1. Governance Completeness — What This Record Confirms

**Business Philosophy → BDR → Policy → Module Specification → Rule 8 → Implementation Plan → Authorization (this document) → Implementation**

| Stage | Document | Status |
|---|---|---|
| Business Decision | `BDR-0015` | ✅ Approved (Decisions A–H, §9) |
| Policy | `POL-0008` | ✅ Approved (Rules A–L, Decision 5) |
| Specification | Initial Stock Accidental Confirmation Recovery Specification | ✅ Accepted (§23, incl. §21 Confirmation #4 Clarification) |
| Rule 8 | Rule 8 Assessment | ✅ Assessed — **READY** (Findings A–K) |
| Implementation Plan | Implementation Plan (companion) | ✅ Drafted |
| **Authorization** | **This document** | ✅ **Authorized** — signed 2026-08-20 |
| Implementation | *(not started, pending this session's implementation work)* | ✅ Authorized to begin |

## 2. What This Authorization Would Cover (Once Signed)

Every item traces to a specific Rule 8 Finding and Implementation Plan element — see §4 for the full traceability chain.

1. **Additive schema fields on `StockCount`** (`apps/tenant/src/types.ts`): a server-enforced `confirmedAt` (`serverTimestamp()`), a `chainPosition: 1 | 2 | 3 | 4`, and an optional `redoesConfirmationId` — all additive/optional, following this codebase's established pattern (Rule 8 Findings B1, E1, F1).
2. **A new, additive, create-only void-record artifact** — recording a successful void without ever mutating the original confirmed `initial` `StockCount` document (Rule 8 Finding G1, **Direction 2, already adopted** as the Rule 8 technical decision). Exact collection/field naming remains an implementation-task detail, not fixed here.
3. **Read-path derivation change** (`AppContext.tsx:797`): `initialStockCount` updated to exclude any confirmation with a corresponding void-record — a single, already-centralized choke point, changed once, with no individual change required to any of its downstream consumers (Dashboard, both Reports, `InitialStockPriceChangeModal`, Timeline) (Rule 8 Finding F1).
4. **Guard fix** (`AppContext.tsx:2555`): `hasInitialStockCount` updated in lockstep with item 3, so a redo confirmation is not incorrectly blocked (Rule 8 Finding F2).
5. **New Void step**: single-Firestore-batch creation of the void-record artifact plus client-side draft reconstruction from the voided confirmation's own `items`/`initialCapitalBasis` — Owner-only, window-bounded, ceiling-bounded (Rule 8 Findings A1, D1, E1).
6. **New Redo step**: reuse of the existing, unmodified `recordStockCount` single-batch confirm pattern, extended to write `chainPosition`/`redoesConfirmationId` and a fresh, independent dual-valuation-basis selection (Rule 8 Findings D1, H1).
7. **`firestore.rules` changes**:
   - A new, narrow `allow create` rule for the void-record artifact: Owner-only, `request.time` within 30 minutes of the target confirmation's `confirmedAt`, target `chainPosition != 4`, no pre-existing void-record for that target (optimistic-concurrency precondition) — **exempt from `subscriptionAllowsNewRecords`**, per the recorded Option A decision (Rule 8 §14, Finding K1).
   - A narrowly-scoped addition to the redo confirmation's create path: Owner-only + valid-void-record-exists precondition, **also exempt from `subscriptionAllowsNewRecords`** for this write path specifically (Finding K1).
   - **The existing unconditional `stockCounts` `allow update, delete: ... != 'initial'` line is not modified.**
   - **The existing `stockCounts` `allow create: ... subscriptionAllowsNewRecords` line, governing an original (first) confirmation, is not modified.**
8. **UI — accidental-confirmation prevention** (`InitialStockCountView.tsx`): relocated/restyled Confirm action, explicit secondary-confirmation step, consequence messaging, and a recovery-window visibility/countdown element (FR-18–FR-21; Rule 8 Finding I1 — a confirmed gap, ordinary implementation work).
9. **UI — recovery flow and history**: an Owner-only Void & Redo entry point visible only within an open window and only when `chainPosition != 4`; the restored-draft editing screen (reusing the existing pre-confirmation draft UI unmodified); and history/audit visibility that unambiguously distinguishes every voided confirmation from the active one (FR-9, FR-10).
10. **The required tests**, per the Implementation Plan's §6 — draft-reconstruction unit tests; rules-emulator tests for Owner-only enforcement, the 30-minute boundary, the ceiling refusal against a 4th confirmation specifically, and immutability regression; concurrency tests; full regression of existing dual-valuation/multi-portion/Timeline suites; a backward-compatibility test proving a pre-existing `initial` record with no new fields is never eligible for recovery; a subscription-exemption scope test proving the exemption does not leak beyond the Void & Redo write path; and an interrupted-recovery test resolving through the existing zero-active-confirmation fallback.

**No `firestore.indexes.json` change is currently expected** — Rule 8 §10 found no new query pattern beyond an already-in-memory `.find()` over an already-fetched, small per-business collection; this is to be confirmed against the final query shape at implementation time, not re-decided by this authorization.

## 3. What This Authorization Would Not Cover

Every exclusion below is preserved exactly as the Specification's §18 Non-Goals, the Rule 8 Assessment's §13 Adversarial/Scope Analysis, and the Implementation Plan's §2.2 already established — none invented here:

- **Any recovery mechanism other than Void & Redo** (Specification FR-1; Rule 8 §13).
- **Any recovery path for Periodic Contagem, Add Stock, or any `StockBatch` entry** (Specification §3, §18).
- **Manager- or Staff-tier access to any part of Void & Redo**, under any circumstance (FR-14, FR-15).
- **A 4th recovery cycle, or a 5th confirmation event, under any circumstance** (FR-7, I-4).
- **Any success path for a Void & Redo attempt against Confirmation #4** — its window is display/measurement only; every attempt against it must be a failed attempt (FR-25), never a successful void (FR-8, I-5, §21 Clarification).
- **Any inheritance, default, or carry-over of a voided confirmation's basis to its replacement** (FR-6, I-6).
- **Any redesign of the dual-valuation-basis mechanism itself** — `resolveInitialCapitalValue`, `normalizeStockCountItems` reused with zero modification (FR-22–FR-24; Rule 8 Finding H1).
- **Any change to `businessWorth`'s own formula** — no term added, none removed (I-7; Rule 8 §13).
- **Any un-voiding, restoration-to-active, or edit of a voided confirmation, or of any void-record once written** (FR-11, I-2, I-8).
- **Any modification to the existing unconditional `type == 'initial'` `firestore.rules` refusal** — Direction 2 (Finding G1) exists precisely so this line requires zero change; this authorization does not permit touching it.
- **Any general subscription-enforcement bypass** — the exemption (Finding K1/Option A) is scoped exclusively to the Void & Redo write path (void-record create, redo confirmation create), expressed via Void & Redo-specific rule conditions (ownership, window, void-record existence), never via a shared, reusable "skip subscription check" helper other write paths could inherit (Option A item 3, verbatim).
- **Any change to the original (first) Initial Stock confirmation's own subscription gating** — line 441's `subscriptionAllowsNewRecords` precondition remains exactly as it is today for a business's first confirmation.
- **Any change to Periodic Contagem's date/period model, comparison mechanism, or `expectedCurrentStockValue`.**
- **Any migration or backfill of any existing `initial` `StockCount` record**, for any reason — a pre-existing record with no `confirmedAt`/`chainPosition` is treated as outside any recovery window by construction, never defaulted into eligibility (Rule 8 §11).
- **Any unrelated schema change** — no field beyond those named in §2 items 1–2 is authorized on any type.
- **Any additional Product Architect business decision** — none is needed; the Rule 8 Assessment found every question resolved, including the one genuine gap it surfaced (subscription-gating interaction), which is itself already resolved by the recorded Option A decision (Rule 8 §14).
- **Any expansion of this feature beyond the accepted Specification's 27 Functional Requirements and 8 Invariants** — this authorization's scope is exactly, and only, what §2 above lists.

## 4. Rule 8 → Implementation Traceability

| `BDR-0015`/`POL-0008` Decision | Specification Requirement | Rule 8 Finding | Authorized Implementation Consequence |
|---|---|---|---|
| Sole recovery path (Decision A / Rule A) | FR-1 | — | No alternate correction path exposed anywhere |
| Window measurement (Decision B / Rule B, J) | FR-2, FR-16 | Finding B1 | `serverTimestamp()` + rules `request.time` comparison |
| Exact draft restoration (Decision C / Rule C) | FR-3, FR-4 | Finding A1 | Reconstruction from voided confirmation's own `items`/`initialCapitalBasis`; fresh row ids only |
| Original preserved, marked voided (Decision D / Rule D) | FR-9, FR-10, FR-11 | Finding G1 (Direction 2, adopted) | Additive, create-only void-record artifact; original never mutated |
| Owner-only (Decision E / Rule E) | FR-14, FR-15 | Finding C1 | `isOwnerOf` at UI and rules layers |
| Hard expiry, no exception (Decision F / Rule F) | FR-16 | Finding B1 | Same server-time rule; no override path |
| Redo is sole read path (Decision G / Rule G) | FR-12, FR-13 | Finding F1 | Single choke-point derivation update, `AppContext.tsx:797` |
| Independent basis per confirmation (Decision H / Rule H) | FR-6, FR-22–FR-24 | Finding H1 | Zero change to dual-valuation mechanism; basis UI presented fresh at every confirmation |
| No silent rewriting (Rule I) | FR-11 | Finding G1 | Void-record is itself create-only, never updated |
| 3-cycle / 4-confirmation ceiling; #4 not voidable (Decision 5) | FR-7, FR-8, FR-25–FR-27, I-4, I-5 | Finding E1 | `chainPosition` tracking; void-record `allow create` refused when target `chainPosition == 4` |
| Recovery-window visibility (Rule K) | FR-21 | Finding I1 | New countdown/visibility UI element |
| Expired unused draft (Rule L) | FR-17 | Finding A1 | Reconstructed draft is transient/in-memory; nothing persists requiring separate cleanup |
| Subscription-gating exemption, Option A | — (new, Rule 8 §14) | Finding K1 | Narrow `subscriptionAllowsNewRecords` exemption on the Void & Redo write path only |
| `businessWorth` untouched (established) | I-7 | Rule 8 §13 | Zero changes to `businessWorth`'s own expression |
| Dual valuation untouched (established) | FR-22–FR-24 | Finding H1 | PASS — reused unmodified |
| Tenant isolation intact (implicit) | — | Rule 8 §8 | PASS — no new cross-tenant path; every new artifact scoped under `businesses/{businessId}` |

## 5. Risk Acknowledgment

- **The read-path derivation change (Finding F1) is the single highest-leverage change in this authorization** — low-blast-radius by construction (one already-centralized choke point) but requires a dedicated regression test against every named downstream consumer (Dashboard, both Reports, `InitialStockPriceChangeModal`, Timeline), not an assumption of correctness from the choke-point argument alone.
- **The subscription-gating exemption (Finding K1) is the one net-new rules-layer condition without a direct precedent elsewhere in this codebase** — every other prior exemption/amendment in this lineage has been additive fields, not altered gating logic on an existing `allow create` rule. This authorization requires the dedicated scope test named in the Implementation Plan §6 item 9 as a condition of considering this item complete, not merely desirable.
- **The void-record artifact's exact field/collection shape is intentionally left to implementation-task judgment**, constrained only by Direction 2's core requirement (create-only, never mutates the original) — this authorization does not pre-commit a name, and implementation must not silently drift from the create-only constraint while choosing that name.
- **The 4th confirmation's dual role (visible window, blocked recovery) is precise and easy to mis-implement** — Finding E1/§21's own text is explicit that the window must remain genuinely computable/displayable for Confirmation #4 while the void step itself is refused at the rules layer; an implementation that instead suppresses the window's display for #4, or that only blocks the redo step rather than the void step, would violate I-5 even though it might appear to produce the same net user-facing outcome. Implementation must be reviewed against this distinction specifically.

## 6. Testing Boundary (Carried Into Implementation)

At minimum, per the Implementation Plan's §6 and the Rule 8 Assessment's own §12: draft-reconstruction unit tests (byte-for-byte equivalence, single- and multi-portion); rules-emulator tests for Owner-only enforcement, the 30-minute boundary (both sides), the ceiling refusal against a 4th confirmation's void attempt specifically, and post-confirmation immutability of every non-void-record field; concurrency tests (two simultaneous void attempts; a void attempt racing the ceiling); full regression of `initial-stock-dual-valuation-basis*.test.ts`, `initial-stock-multi-portion-valuation.test.ts`, and `initial-stock-confirmation.test.ts`; a backward-compatibility test for pre-existing records with no new fields; a subscription-exemption scope test proving the exemption does not leak to any other write path; and an interrupted-recovery test resolving through the existing zero-active-confirmation fallback.

## 7. Rollback / Reversibility

Every field this authorization would introduce is additive and optional (`confirmedAt`, `chainPosition`, `redoesConfirmationId`), and the void-record artifact is itself a new, separately-collected artifact rather than a mutation of anything existing — a rollback requires no destructive migration of existing data. A rolled-back version of the read-path derivation (reverting to `stockCounts.find(s => s.type === 'initial')` with no void-record exclusion) would simply stop recognizing any void-record that exists, with no data loss, consistent with this codebase's established rollback posture for every prior amendment in this lineage. The new `firestore.rules` additions are themselves purely additive `allow create` grants — reverting them removes the capability without touching any existing rule's text.

## 8. Acceptance Criteria (Would Govern Implementation Completion)

Extracted directly from the accepted Specification's §20 and the Rule 8 Assessment's own Findings — none invented beyond what those two documents already support. See the Implementation Plan's §3 for the full mapping; restated here as the sign-off checklist:

1. Void & Redo is the only functional recovery path presented or permitted (FR-1).
2. A recovery attempt succeeds only within the active confirmation's own, unexpired, unelapsed 30-minute window, measured from its own server-recorded timestamp (FR-2, FR-16).
3. A successful recovery presents a draft state provably identical to the pre-confirmation state (FR-3).
4. The Owner can freely edit the restored draft before reconfirming (FR-4).
5. A redo confirmation is functionally indistinguishable from any other confirmation event in every requirement this Specification imposes (FR-5).
6. No confirmation event's basis selection is ever pre-filled, defaulted, or copied (FR-6, I-6).
7. At most 3 recovery cycles / 4 confirmation events are ever possible (FR-7, I-4).
8. Confirmation #4 exhibits its own 30-minute window for visibility/measurement, but Void & Redo is entirely unavailable against it — no attempt against it can succeed (FR-8, I-5).
9. Every confirmation event, up to 4, remains permanently visible in history with unambiguous voided/active status (FR-9, FR-10).
10. No historical fact of any voided confirmation is ever altered after being set, including its void-record once written (FR-11, I-8).
11. Capital Growth and every current-business-state consumer reads exclusively from the active confirmation, never from a voided one (FR-12, FR-13, I-1).
12. Only the Owner can trigger, or see as available, any part of Void & Redo (FR-14, FR-15).
13. Expiry is unconditional, permanent, and admits no override (FR-16).
14. The Confirm action is relocated to a safer position and requires an explicit secondary confirmation step, with consequence messaging (FR-18–FR-20).
15. The active recovery window's existence is discoverable throughout its duration (FR-21).
16. Every confirmation event preserves both valuation totals and makes its own independent basis selection, per the unmodified `BDR-0014` mechanism (FR-22–FR-24).
17. `businessWorth`'s own formula is provably unchanged (I-7).
18. Tenant isolation remains intact — no cross-business read/write path is introduced.
19. The subscription-gating exemption applies only to the Void & Redo write path and does not permit creation of any unrelated record while a business's subscription state would otherwise block it (Finding K1).
20. All tests named in §6 of this document (the Testing Boundary) pass, including full regression of the existing dual-valuation, multi-portion, and Timeline suites.
21. No migration or backfill of any kind occurs for any existing record (Rule 8 §11).

---

## 9. Explicit Gate Statement

**As of §10's signature below, implementation of this feature, strictly within §2's scope and §3's exclusions, is authorized.** Prior to this signature, no code, `firestore.rules`, `firestore.indexes.json`, or test file had been created, modified, or committed to produce this document or its companion Implementation Plan — that remains true as of the signature itself; implementation is the next, separate execution step this signature enables, not something this signature itself performs.

## 10. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** August 20, 2026

**Authorization decision (verbatim):**
> "I approve and authorize implementation of the Initial Stock Accidental Confirmation Recovery ('Void & Redo') feature exactly within the scope, constraints, and acceptance criteria defined in the Implementation Authorization."

**Confirmed as part of this signature:**

- [x] This authorization's scope (§2) is approved as stated.
- [x] This authorization's exclusions (§3) are approved as stated.
- [x] The subscription-gating exemption (§2 item 7, §5) is acknowledged as narrowly scoped to the Void & Redo write path only.
- [x] The Confirmation #4 dual-role risk (§5) is explicitly acknowledged.
- [x] No additional scope change is required beyond what §1–§8 of this document describe.

---

**This document, as signed, authorizes implementation strictly per §2's scope and §3's exclusions.** No code has been written and no schema or `firestore.rules` change has been made as of the filing of this signed authorization — implementation is the next, separate execution step this signature enables.

**Lifecycle:** Drafted → Product Architect review → **Authorized** (this step, signed). Implementation may now begin, strictly within §2/§3.
