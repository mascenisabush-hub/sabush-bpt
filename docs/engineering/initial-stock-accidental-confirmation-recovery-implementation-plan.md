Implementation Plan

# Implementation Plan — Initial Stock Accidental Confirmation Recovery ("Void & Redo")

**Type:** Governance bridge document — translates a **READY** Rule 8 Assessment into a concrete, file-by-file implementation plan, ready for Implementation Authorization sign-off. Does not itself authorize implementation and does not modify code.

**Status:** Draft — pending Implementation Authorization (see companion document, `initial-stock-accidental-confirmation-recovery-implementation-authorization.md`).

**Governing chain:** [`BDR-0015`](../specs/BDR-0015-initial-stock-accidental-confirmation-recovery.md) (✅ Approved) → [`POL-0008`](../specs/POL-0008-initial-stock-accidental-confirmation-recovery-policy.md) (✅ Approved) → [Initial Stock Accidental Confirmation Recovery Specification](../specs/initial-stock-accidental-confirmation-recovery-specification.md) (✅ Accepted, signed by SABUSHIMIKE MASCENI, §23) → [Rule 8 Assessment](./initial-stock-accidental-confirmation-recovery-rule8-assessment.md) (✅ **READY** — no remaining Product Architect decision, including the Option A subscription-gating exemption, §14).

**Repository state at this revision:** `main = origin/main = a65d98feafdf165a9132494fcfcedaefc5577785`, working tree clean. HEAD is the Rule 8 Assessment commit itself. Nothing has been modified in `apps/`, `server/`, `firestore.rules`, `firestore.indexes.json`, or `tests/` to produce this document.

**This document does not:** modify `BDR-0015`, `POL-0008`, the accepted Specification, the Rule 8 Assessment, `firestore.rules`, `firestore.indexes.json`, or any application code. It does not itself constitute Implementation Authorization — that is a separate, explicitly gated document (companion, below), which itself remains unsigned until Product Architect sign-off.

> **⚠️ Amendment Notice:** the recovery-window figure this Plan's Void-step
> and `firestore.rules` descriptions state — **30 minutes** — has been
> amended to **12 hours** by the
> [Recovery Window Amendment](../specs/initial-stock-accidental-confirmation-recovery-window-amendment.md).
> Per that amendment's §6, the code described here (already implemented,
> per the repository's commit history) still reflects the original
> 30-minute value; updating it to 12 hours requires a separate, explicit
> follow-up authorization, not yet granted. Every other element of this
> Plan is unaffected. The original text below is preserved unedited.

---

## 1. Purpose

This Plan converts the Rule 8 Assessment's Findings A–K into a concrete map of exactly which files change, what each change is, and how each functional requirement (FR-1–FR-27), invariant (I-1–I-8), and acceptance criterion (1–20) is satisfied. It introduces no new business decision, no new technical direction beyond what the Rule 8 Assessment already adopted (in particular, Finding G1 Direction 2 — additive void-record — and Finding K's Option A subscription exemption), and commits no code.

## 2. Scope Enumeration

### 2.1 In Scope

1. **Schema additions** (additive/optional only, per this codebase's established backward-compatibility pattern):
   - `StockCount`: a server-enforced confirmation timestamp (`confirmedAt`, Firestore `serverTimestamp()`), a chain-position indicator (e.g. `chainPosition: 1 | 2 | 3 | 4`), and a link back to the confirmation it replaced, if any (e.g. `redoesConfirmationId?: string`).
   - A new, small, additive **void-record artifact** (Finding G1, Direction 2) — created once per successful void, never mutating the original `initial` `StockCount` document. Exact collection/field naming is an implementation-task (not Plan-level) decision, consistent with the Rule 8 Assessment's own deferral (§7), but the architectural direction — additive, non-mutating, append-only — is fixed by Finding G1 and carried forward here unchanged.
   - `InitialStockDraft`-equivalent restoration data: no new persisted field is required (Finding A1) — the restored draft is reconstructed in-memory from the voided confirmation's own `items`/`initialCapitalBasis` at the moment of void, using the existing `InitialStockDraft`/`InitialStockDraftItem` shape unmodified.
2. **Read-path change**: `initialStockCount` derivation (`AppContext.tsx:797`) updated from `stockCounts.find(s => s.type === 'initial')` to a derivation that additionally excludes any confirmation with a corresponding void-record (Finding F1) — the single, already-centralized choke point every consumer (Dashboard, both Reports, `InitialStockPriceChangeModal`, Timeline) reads through, changed once.
3. **Confirmation guard fix** (`recordStockCount`, `AppContext.tsx:2555`): `hasInitialStockCount` guard updated in lockstep with the read-path change so a redo confirmation is not incorrectly blocked by the same guard that (correctly) prevents an unrelated second original confirmation (Finding F2).
4. **New Void step**: a function that, within a single Firestore batch, creates the void-record artifact for the currently active confirmation and reconstructs the restorable draft client-side (Finding D1, A1) — Owner-only, gated on: the confirmation's own `confirmedAt` + 30 minutes not yet elapsed (server-time-based, Finding B1), and the confirmation's own `chainPosition` being 1, 2, or 3 (never 4, Finding E1).
5. **New Redo step**: reconfirmation reusing the existing, unmodified `recordStockCount` single-batch confirm pattern (Finding D1), extended to write the new `chainPosition` (previous + 1), `redoesConfirmationId`, and a fresh, independent dual-valuation-basis selection (Finding H1 — zero change to `resolveInitialCapitalValue`/`normalizeStockCountItems`).
6. **`firestore.rules` changes** (Findings B1, C1, D1, E1, G1, K1):
   - A new, narrow `allow create` rule for the void-record artifact: Owner-only, `request.time` within 30 minutes of the target confirmation's `confirmedAt`, target confirmation's `chainPosition != 4`, target confirmation has no existing void-record (optimistic-concurrency precondition, Finding D1) — and **exempt from `subscriptionAllowsNewRecords`** (Finding K1/Option A).
   - The `stockCounts` `allow create` rule for a redo confirmation similarly scoped Owner-only + valid-void-record-exists precondition, and **exempt from `subscriptionAllowsNewRecords`** for the Void & Redo write path specifically (Finding K1/Option A) — the exemption expressed via the Void & Redo-specific conditions directly (ownership, window, void-record existence), never via a shared "skip subscription check" helper (Finding K1's explicit constraint).
   - **The existing unconditional `stockCounts` `allow update, delete: ... != 'initial'` refusal is not modified** — Direction 2 (Finding G1) is chosen precisely so this line requires zero change.
   - **The original Initial Stock confirmation's own `allow create` rule (line 441) is unchanged** — still gated on `subscriptionAllowsNewRecords`, exactly as today; the exemption applies only to the Void & Redo write path (void-record create, redo confirmation create), never to an original confirmation.
7. **`firestore.indexes.json`**: assessed for any new composite index required by the read-path change (e.g. querying `stockCounts` by `businessId` + `type` + chain-position/void-status); Rule 8 §10 found no new query pattern beyond an already-in-memory `.find()` over an already-fetched, small per-business collection — this Plan carries that finding forward as "no new index expected," to be confirmed against the actual query shape chosen at implementation time, not re-decided here.
8. **UI — Accidental-confirmation prevention** (`InitialStockCountView.tsx`, FR-18–FR-21, Finding I1): relocate/restyle the Confirm action, add an explicit secondary-confirmation dialog, add consequence messaging, and add a recovery-window visibility/countdown element. No copy, layout, or component library choice is fixed by this Plan — implementation-task detail only, consistent with the Specification's own explicit deferral (§17).
9. **UI — Recovery flow**: a Void & Redo entry point (Owner-only, visible only within an active window and only when `chainPosition != 4`), the restored-draft editing screen (reusing the existing pre-confirmation draft UI unmodified, FR-4), and history/audit visibility distinguishing voided from active confirmations (FR-9, FR-10).
10. **Tests**: per §12 below, mapped 1:1 to the Rule 8 Assessment's own Testing Strategy (§12 of that document).

### 2.2 Explicit Exclusions

Carried forward verbatim from the Specification's §18 Non-Goals and the Rule 8 Assessment's own scope discipline (§13) — none invented here:

- Any recovery mechanism other than Void & Redo (FR-1).
- Any recovery path for Periodic Contagem, Add Stock, or any `StockBatch` entry (Specification §3, §18).
- Manager- or Staff-tier access to any part of Void & Redo, under any circumstance (FR-14, FR-15).
- A 4th recovery cycle or a 5th confirmation event, under any circumstance (FR-7, I-4).
- Any success path for a Void & Redo attempt against Confirmation #4 — its window is visible/measurable only; every attempt against it is FR-25 (failed, unchanged), never FR-26 (successful void) (FR-8, I-4, I-5).
- Any inheritance, default, or carry-over of a voided confirmation's basis to its replacement (FR-6, I-6).
- Any redesign of the dual-valuation-basis mechanism (`resolveInitialCapitalValue`, `normalizeStockCountItems`) — reused unmodified (FR-22–FR-24).
- Any change to `businessWorth`'s own formula — no term added, none removed (I-7).
- Any un-voiding, restoration-to-active, or edit of a voided confirmation, or of its void-record once written (FR-11, I-2, I-8).
- Any weakening of the existing unconditional `type == 'initial'` `firestore.rules` refusal — it is not touched (Finding G1, Direction 2).
- Any general subscription-enforcement bypass — the exemption (Finding K1) is scoped exclusively to the Void & Redo write path, expressed via Void & Redo-specific rule conditions, never a reusable "skip subscription check" mechanism (Option A item 3).
- Any change to Periodic Contagem's date/period model, comparison mechanism, or `expectedCurrentStockValue`.
- Any migration or backfill of any existing `initial` `StockCount` record (§11, below).
- Any change to unrelated `StockCountItem`/`totalSellingValue`/`initialCapitalBasis` field shapes.

## 3. Acceptance Criterion → Implementation Mapping

| Specification Acceptance Criterion | Implementation Element |
|---|---|
| 1. Void & Redo is the only recovery path (FR-1) | No alternate correction path is exposed anywhere in `InitialStockCountView.tsx`, `AppContext.tsx`, or `firestore.rules`; the existing unconditional immutability rule remains the enforcement backstop |
| 2. Recovery succeeds only within the active confirmation's unexpired window (FR-2) | Void-record `allow create` rule: `request.time < target.confirmedAt + duration.value(30,'m')`, server-time-based |
| 3. Restored draft is provably identical to pre-confirmation state (FR-3) | Draft reconstructed from the voided confirmation's own `items`/`initialCapitalBasis`, fresh client-side row ids only (Finding A1) |
| 4. Owner can freely edit the restored draft (FR-4) | Restored state feeds the existing, unmodified pre-confirmation draft editing UI |
| 5. Redo is a full, independent confirmation event (FR-5) | Redo reuses `recordStockCount`'s existing single-batch confirm path unmodified, writing its own `chainPosition`/`confirmedAt`/basis |
| 6. No basis inherited across confirmations (FR-6, I-6) | Basis-selection UI (existing, from the Dual-Valuation-Basis feature) is presented fresh at every confirmation event, including every redo; no default/copy path exists |
| 7. At most 3 recovery cycles / 4 confirmation events (FR-7, I-4) | `chainPosition` tracked per confirmation; void-record `allow create` refused when target `chainPosition == 4` |
| 8. Confirmation #4's window is visible/measurable only; never voidable (FR-8, I-5) | Client computes/displays the window from `confirmedAt` regardless of `chainPosition`; the void-record `allow create` rule's `chainPosition != 4` precondition makes every attempt against #4 fail at the rules layer, independent of the UI |
| 9. Every confirmation event permanently visible in history (FR-9) | History/audit view queries all `type: 'initial'` confirmations for the business, not only the active one |
| 10. Voided confirmations unambiguously distinguishable (FR-10) | History view joins each confirmation against the void-record collection/field to render an explicit voided marker |
| 11. No historical fact of a voided confirmation is rewritten (FR-11, I-8) | Direction 2: the original document is never targeted by any Void & Redo write; the void-record is itself create-only, never updated |
| 12–13. Capital Growth/current-state reads only the active confirmation (FR-12, FR-13, I-1) | Single choke-point derivation update at `AppContext.tsx:797` (Finding F1) |
| 14–15. Owner-only, no Manager/Staff visibility (FR-14, FR-15) | `isOwnerOf` gate at both the UI layer and the `firestore.rules` layer (Finding C1) |
| 16. Expiry is unconditional and permanent (FR-16) | Same server-time-based rule as criterion 2; no override path anywhere |
| 17. Expired unused draft has no continuing recovery purpose (FR-17) | Reconstructed draft state is transient/in-memory (Finding A1) — nothing persists past an unused window that would need separate cleanup |
| 18. Safer Confirm placement, secondary confirmation, consequence messaging (FR-18–FR-20) | `InitialStockCountView.tsx` UI changes, §2.1 item 8 |
| 19. Active window discoverable throughout its duration (FR-21) | Visibility/countdown UI element, §2.1 item 8–9 |
| 20. Dual valuation reused unmodified (FR-22–FR-24) | Zero changes to `resolveInitialCapitalValue`, `normalizeStockCountItems` (Finding H1) |

## 4. Firestore Rule / Schema / Read-Path Change Inventory

**Schema (additive only):**
- `StockCount.confirmedAt` (new, server `serverTimestamp()`) — every confirmation event.
- `StockCount.chainPosition` (new, `1 | 2 | 3 | 4`) — every confirmation event; absent/defaulted-to-1 semantics for pre-existing records (§11).
- `StockCount.redoesConfirmationId?` (new, optional) — present only on a redo confirmation.
- New void-record artifact (collection or sibling document, exact shape an implementation-task decision) — one per successful void, referencing the voided confirmation's id; create-only, never updated (Finding G1 Direction 2).

**`firestore.rules`:**
- New `allow create` rule for the void-record artifact (Owner-only, window-bounded, `chainPosition != 4`, no pre-existing void-record for that target, exempt from `subscriptionAllowsNewRecords`).
- Amended `stockCounts` `allow create` rule (or a parallel rule scoped to the redo case) adding an Owner-only + valid-void-record-exists path that is exempt from `subscriptionAllowsNewRecords`, without altering the existing ordinary-create path's own gating.
- **No change** to the existing `stockCounts` `allow update, delete: ... != 'initial'` line (Finding G1 Direction 2's entire purpose).
- **No change** to the existing `stockCounts` `allow create: ... subscriptionAllowsNewRecords` line for an original (first) confirmation.

**Read path:**
- `AppContext.tsx:797` — `initialStockCount` derivation updated to exclude confirmations with a corresponding void-record (Finding F1).
- `AppContext.tsx:2555` — `hasInitialStockCount` guard updated in lockstep (Finding F2).

**`firestore.indexes.json`:** assessed, no new composite index currently expected (Rule 8 §10); to be confirmed against the final query shape at implementation time — not re-decided by this Plan.

## 5. Tenant Isolation and Authorization Boundary Verification

- Every new field and the new void-record artifact remain scoped under the existing `businesses/{businessId}` path structure — no new top-level or cross-tenant-readable collection is introduced, matching every other collection in `firestore.rules` (Rule 8 §8).
- The Owner-only authorization tier is enforced identically to every other capital-affecting action in this schema (`isOwnerOf`), at the Security Rules layer, not merely the UI layer (Finding C1) — this is a direct extension of an already-proven pattern, not a new authorization model.
- The subscription exemption (Finding K1/Option A) is expressed as Void & Redo-specific rule conditions (ownership + window + ceiling), never as a shared, reusable "skip subscription check" flag — verified against Option A item 3's explicit constraint that this "is NOT authorization to bypass subscription enforcement generally."
- The existing unconditional `type == 'initial'` immutability rule — Architecture 8.6's "no exceptions" tier — is not modified in any way; the entire recovery mechanism is additive alongside it, never a carve-out inside it.
- No plan element grants Manager or Staff any new read or write path; `isMemberOf`-tier read access to `stockCounts` is unchanged.

## 6. Testing Requirements

Directly carried from the Rule 8 Assessment's own §12 Testing Strategy, made concrete:

1. **Unit — draft reconstruction** (Finding A1): byte-for-byte equivalence between a voided confirmation's stored `items`/`initialCapitalBasis` and the reconstructed draft, across single- and multi-portion products, reusing `stockCountPortionGrouping.ts`'s existing fixtures where applicable.
2. **Rules-emulator — Owner-only enforcement**: Manager/Staff attempts at both the void-record create and the redo confirmation create are refused.
3. **Rules-emulator — 30-minute boundary**: both sides of the boundary (just inside, just outside) for both the void step and, transitively, the ceiling-blocked case.
4. **Rules-emulator — ceiling refusal**: a void attempt against a `chainPosition == 4` confirmation is refused at the rules layer specifically, not merely unreachable via the UI.
5. **Rules-emulator — immutability regression**: the original `initial` `StockCount` document's non-void-record fields remain unwritable post-confirmation, exactly as today, for every confirmation in a chain.
6. **Concurrency**: two simultaneous void attempts against the same confirmation (only one may succeed); a void attempt racing against the ceiling being reached by another completed cycle.
7. **Regression**: existing dual-valuation (`initial-stock-dual-valuation-basis*.test.ts`), multi-portion (`initial-stock-multi-portion-valuation.test.ts`), and Timeline/`initial-stock-confirmation.test.ts` suites pass unmodified.
8. **Backward compatibility**: an old `initial` record with none of the new fields (`confirmedAt`, `chainPosition`) is provably treated as outside any recovery window and ineligible for Void & Redo — never as "always eligible" via an absent-field default.
9. **Subscription-exemption scope test**: a business in a blocked-subscription state can still complete a valid Void & Redo (void + redo) within an open window, but cannot create an unrelated new record of any other type while blocked — proving the exemption does not leak beyond this one write path.
10. **Interrupted-recovery test** (FR-26): a successful void with no completed redo for Confirmations #1–#3 resolves through the existing, already-governed zero-active-confirmation fallback path (`hasInitialStockCount: false`), with no new fallback logic invented.
11. **UI**: secondary-confirmation step cannot be bypassed; recovery-window visibility element renders and updates while a window is open; Confirm action is not reachable via an ordinary editing interaction.

## 7. Risks Carried Forward From Rule 8

- The read-path derivation change (Finding F1) is low-blast-radius by construction (single choke point) but must be verified against every listed consumer (Dashboard, both Reports, `InitialStockPriceChangeModal`, Timeline) with a regression test each, not assumed correct from the choke-point argument alone.
- The void-record artifact's exact shape is an implementation-task decision, not fixed by this Plan or the Rule 8 Assessment — it must honor Direction 2's core constraint (create-only, never mutates the original) regardless of the exact field/collection names chosen.
- The subscription exemption is the one net-new rules-layer condition not modeled on an existing pattern in this codebase (every other exemption precedent is additive fields, not altered gating logic) — its rules-emulator test coverage (§6 item 9) is treated as required, not optional.

## 8. Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3 and the Rule 8 process (`Current State Assessment → Gap Analysis → Risks → Implementation Plan → approval gate → implementation`): this Plan is the Implementation Plan stage. The next step is the companion Implementation Authorization document, presented for Product Architect signature. **No code, `firestore.rules`, `firestore.indexes.json`, or test file has been created, modified, or committed to produce this Plan.**

**Lifecycle:** Drafted (this document) → Implementation Authorization (drafted, pending signature) → Product Architect sign-off → Implementation. Not yet authorized. Not implemented.
