# Explicit Existing/New Product Identity Resolution (Add Stock, Smart Stock Entry, Periodic Contagem) — Implementation Plan

**GOVERNANCE GATE: IMPLEMENTATION PLAN**

**IMPLEMENTATION: NOT AUTHORIZED**
**IMPLEMENTATION AUTHORIZATION: NOT GRANTED — separate, subsequent gate**
**CODE CHANGES: NOT PERFORMED BY THIS DOCUMENT**
**COMMIT/PUSH: NOT PERFORMED**

This is a plan only. No code, schema, test, or Firestore-rules file is
modified by this document. It translates already-accepted decisions
into a concrete, boundaried implementation scope for a subsequent
Implementation Authorization to approve or reject.

---

## 1. Purpose / Governing Authorization

This plan implements exactly, and only, what has been accepted through
the following governance chain — it makes no new business decision:

- **Decision A** and **Decision A-Contagem** (Product Recognition /
  Existing vs New), as accepted in
  [`product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md`](./product-recognition-and-cost-selling-unit-architecture-product-architect-acceptance.md)
  and
  [`recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md`](./recognition-and-cost-selling-unit-rule8-decision-clarification-product-architect-acceptance.md).
- As specified in **§4a and §7a** of
  [`docs/specs/product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md)
  (Accepted 2026-09-06).
- Cleared by the **Targeted Rule 8 Re-check**
  ([`RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_TARGETED_RECHECK.md`](./RECOGNITION_AND_COST_SELLING_UNIT_RULE_8_TARGETED_RECHECK.md)),
  verdict **READY FOR IMPLEMENTATION PLANNING**.

**Explicitly not in this plan's scope** (per the same governance chain,
and reconfirmed below in §18): B2, Concept C's authority or reach,
`StockBatch` schema, Business Worth, Closing, Supplier-Wording
Recognition's own algorithm/candidate mechanism (unchanged), Initial
Stock (not named by Decision A-Contagem), and any fuzzy-matching
algorithm, AI model, confidence threshold, or UI design (all
consistently left to this plan/Rule 8's own authority by every prior
governance artifact, and resolved here only to the extent needed to
produce a boundaried, buildable scope — not to invent new business
rules).

## 2. Scope

**In scope — the single governing behavior change:**

> Wherever automatic recognition cannot establish sufficient confidence
> and no owner-reviewed candidate exists or is accepted, finalization
> must present an explicit Existing Product / New Product resolution
> before completing — instead of silently creating a new Product. This
> applies to Add Stock (single- and multi-item), Smart Stock Entry
> (via the same Add Stock finalization it already feeds), and Periodic
> Contagem — not Initial Stock.

**Three call sites, one shared new mechanism:**

| Entry surface | Existing finalization function | Current behavior at "no match" |
|---|---|---|
| Multi-item Add Stock (incl. Smart Stock Entry rows) | `addMultipleStockBatches` (`AppContext.tsx`) | Silent `Product` creation, per-item loop |
| Single-item Add Stock | `addStockBatch` (`AppContext.tsx`) | Silent `Product` creation, when called — **corrected during governance review: this function is currently exposed on `AppContext`'s value/type but has zero live callers anywhere in the codebase (verified: `grep` across every `.tsx`/`.ts` file outside `AppContext.tsx` itself returns no invocation) — `AddStockView.tsx` calls only `addMultipleStockBatches`, for both single- and multi-row submissions** |
| Periodic Contagem | `recordStockCount` (`AppContext.tsx`) | Silent `Product` creation |

**Out of scope:** Initial Stock's own product-creation path (not named
by any accepted decision); any change to how Supplier-Wording
Recognition itself detects or ranks candidates (§3/§6 of the
Specification, unaffected per §4a/§7a); any change to Product Memory
retrieval functions themselves (`findLatestRememberedProductMemory`,
`buildProductMemoryAutofill`) — they are reused unmodified, only
invoked from a new call site.

## 3. Current Architecture — Reconfirmed Fresh, This Session

Reconfirmed directly against the current repository state (not merely
assumed from the earlier evidence investigation, which itself remains
the primary source):

- `addMultipleStockBatches` (`AppContext.tsx`) resolves each line
  item's product via
  `tempProducts.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase())`
  and, on no match, mints a new `productId` and queues a new `Product`
  document in the same Firestore batch as the stock write — no gate.
- `addStockBatch` (`AppContext.tsx`) does the identical exact-match
  check and identical unconditional new-Product creation on miss.
- `recordStockCount` (`AppContext.tsx`) does the identical exact-match
  check (by `Product.id` if already resolved in-session, otherwise by
  normalized name) and identical unconditional new-Product creation on
  miss.
- `AddStockView.tsx`'s row state already carries an established pattern
  for "a resolution is pending, gate submission until it's cleared":
  `supplierWordingCandidates?: SupplierWordingCandidate[]` (blocks
  `handleSubmit` today via `if (row.supplierWordingCandidates &&
  row.supplierWordingCandidates.length > 0) { alert(...); return; }`),
  `supplierWordingConflictPending?: boolean` (gates on missing
  distinguishing info), and `pendingSupplierWording?: { wording,
  productId, origin, conflictCheckProductIds }` (carries a *resolved*
  identity through to finalization). This plan's new mechanism follows
  this same established shape rather than inventing a new one.
- `findSimilarProducts` (`productNameSimilarity.ts`) is already
  supplier-agnostic, already computes catalog-wide Jaccard-token
  similarity against the in-memory `products` array, and is already
  wired into `AddStockView.tsx` as a non-blocking "did you mean"
  suggestion — the closest existing building block for a
  supplier-independent candidate signal.
- `PeriodicStockCountView.tsx`/`InitialStockCountView.tsx` currently
  import no candidate or similarity mechanism at all — confirmed,
  `grep` for `findSimilarProducts`/`supplierWording*` in both files
  returns zero matches.

## 4. Implementation Design

### 4.1 New shared concept: "Identity Resolution Required"

A new, minimal, three-state signal — mirroring §4a/§7a's own governing
text exactly — is needed wherever a row/line/count-item is about to
finalize with no already-resolved `productId`:

1. **Automatic confident recognition** — unchanged; no new signal
   needed; existing exact-match/reuse/candidate-confirmed paths already
   produce a `productId` and skip the new step entirely.
2. **Unresolved** — no confident match, and no accepted candidate.
   **New:** finalization must not proceed for this item until state 3
   is reached.
3. **Explicit owner-confirmed New Product** — **new:** a boolean-like
   signal, set only by an explicit owner action, following the same
   shape as `pendingSupplierWording.origin` above (e.g.
   `identityResolution: { productId: string } | { confirmedNew: true }`
   conceptually — exact field name, shape, and location are an
   implementation-detail choice within this plan's own authority, not
   a new business decision).

This signal is **UI-state only until finalization**, exactly like
`pendingSupplierWording` — never persisted before the entry itself is
confirmed (consistent with §8 of the Specification, unaffected).

### 4.2 Add Stock / Smart Stock Entry (multi-item and single-item)

- **Multi-item (`AddStockView.tsx` rows → `addMultipleStockBatches`):**
  extend the existing per-row gating already used for
  `supplierWordingCandidates`/`supplierWordingConflictPending`. When a
  row's typed `productName` resolves to no exact match, no reused
  relationship, and no accepted Supplier-Wording candidate, the row
  enters "Unresolved" (state 2). The owner is offered a resolution
  control (search-and-select against the existing in-memory `products`
  array — the same data source `findSimilarProducts` already uses, no
  new query) to pick an Existing Product, or an explicit "confirm as
  new product" action. `handleSubmit`'s existing blocking check (today:
  `supplierWordingCandidates.length > 0`) is extended to also block on
  any row still in state 2. `addMultipleStockBatches` itself needs no
  new recognition logic — it already receives, per item, whatever
  `productId` the row resolved to; it now additionally may receive an
  explicit "this is confirmed new" signal, which it uses only to
  bypass what would otherwise be an assertion that every row arriving
  here is either matched or explicitly confirmed (a safety check, not
  new business logic).
- **Single-item (`addStockBatch`):** **corrected during governance
  review.** No live UI component currently calls this function — the
  only UI for adding stock, `AddStockView.tsx`, calls exclusively
  `addMultipleStockBatches`, for both single-row and multi-row
  submissions alike (confirmed by direct trace, this review). This
  function remains exported on `AppContext`'s value and type
  (`AppContext.tsx:669`, `:8400`) and is referenced only in comments
  elsewhere (`openBatchSupersession.ts`, `unitRelationship.ts`,
  `types.ts`, `server/index.ts`) — it is either legacy/superseded code
  retained for an as-yet-unidentified caller, or dead code candidate
  for future removal; this plan does not decide which. **Checkpoint B
  is re-scoped accordingly (§5, below): the same safety-boundary
  pattern (reject an item with no `productId` and no confirmed-new
  signal) is still added to this function defensively, in case a
  future or undiscovered caller exists, but no new resolution UI is
  built for it, since there is no live surface to build one into.**
- **Smart Stock Entry:** requires no separate change — its own rows
  already funnel into the same `AddStockView.tsx` state and the same
  `addMultipleStockBatches` call, per the existing, already-signed
  Supplier-Wording-recognition unification. The new gating applies to
  those rows automatically once built into the shared row/finalization
  logic.

### 4.3 Periodic Contagem

- **`PeriodicStockCountView.tsx` (and, per §7a's own "Periodic Contagem"
  scoping — confirmed not to include Initial Stock —
  `InitialStockCountView.tsx` is explicitly NOT touched):** a new,
  supplier-independent resolution step is added for a count line whose
  typed/entered product name does not resolve to an exact match. Per
  §7a's explicit boundary, this must not use Supplier-Wording
  Recognition — the plan proposes reusing the same underlying
  `findSimilarProducts` mechanism already proven in Add Stock (it is
  already supplier-agnostic and already operates only against the
  active business's own in-memory `products` array), surfaced as an
  owner-facing "select existing / confirm new" control analogous to
  Add Stock's own. **Clarified during governance review:**
  `findSimilarProducts`'s role here is strictly to populate a
  **candidate list within the new, blocking resolution control** — it
  never assigns a `productId` on its own (confirmed, per its own
  design: "purely suggests... never assigns a productId"), and
  finalization is gated by the new safety boundary in
  `recordStockCount` (§4.3, below), not by this function's output. The
  owner must explicitly select one candidate (or confirm New) before
  the line resolves — an unresolved line with multiple, equally
  plausible candidates is never auto-resolved to any of them. This
  differs from how `findSimilarProducts` is used in Add Stock today
  (a non-blocking "did you mean" suggestion the owner may freely
  ignore) — in this new Contagem control, the same function's output is
  the candidate list for a **blocking** resolution step, not an
  optional aside. **Which exact mechanism (reusing `findSimilarProducts`
  vs. a new, Contagem-specific one) is confirmed here as this plan's
  own choice, consistent with §7a's explicit deferral of "which
  mechanism" to Rule 8/implementation — reusing the existing,
  already-tested function is preferred as the minimal-change option.**
- **`recordStockCount` (`AppContext.tsx`):** gains the identical
  "receive `productId` or explicit confirmed-new signal" safety
  boundary as `addMultipleStockBatches` — no new recognition logic
  inside this function itself.

### 4.4 Product Memory retrieval on Existing-Product resolution

No new retrieval mechanism. When any of the three surfaces resolves an
item to an Existing Product via the new step, it calls the existing,
unmodified `findLatestRememberedProductMemory`/`buildProductMemoryAutofill`
exactly as the existing exact-match and reuse paths already do —
confirmed in the evidence investigation to be resolution-path-agnostic.

## 5. Checkpoint / Phased Implementation Sequence

1. **Checkpoint A** — Add Stock / Smart Stock Entry (multi-item): new
   resolution UI + `handleSubmit` gating + `addMultipleStockBatches`
   safety boundary. Highest-traffic surface; existing
   `supplierWordingCandidates` pattern to extend is already proven
   here.
2. **Checkpoint B** — Single-item Add Stock (`addStockBatch`):
   **re-scoped per governance review** — defensive safety-boundary only
   (no live UI calls this function today; no new resolution UI is
   built for it in this checkpoint). Lowest priority; may be deferred
   without leaving any currently-reachable path ungated, since nothing
   currently reaches this function.
3. **Checkpoint C** — Periodic Contagem: new resolution UI (reusing
   `findSimilarProducts`) + `recordStockCount` safety boundary.

Each checkpoint is independently shippable and independently testable
(§14, below) — Checkpoint C does not depend on A/B being complete,
since Contagem's own mechanism is separate per §7a.

## 6. Exact Files Expected to Change

| File | Change |
|---|---|
| `apps/tenant/src/components/AddStockView.tsx` | New row-state field(s) for the Unresolved/Confirmed-New signal (Checkpoint A); new resolution UI; extend `handleSubmit`'s existing blocking check |
| `apps/tenant/src/context/AppContext.tsx` — `addMultipleStockBatches` | Accept and honor the new per-item signal; safety boundary (assert every item is matched or confirmed-new) |
| `apps/tenant/src/context/AppContext.tsx` — `addStockBatch` | Defensive safety boundary only (Checkpoint B, re-scoped — no live caller exists; no resolution UI needed) |
| `apps/tenant/src/context/AppContext.tsx` — `recordStockCount` | Same signal/boundary, Contagem shape (Checkpoint C) |
| `apps/tenant/src/components/PeriodicStockCountView.tsx` | New resolution UI, reusing `findSimilarProducts` (Checkpoint C) |

## 7. Exact Files Expected to Be Added

None anticipated as new files — this plan reuses existing modules
(`productNameSimilarity.ts`, `productMemoryPriceResolution.ts`)
without modification. If Checkpoint C's UI grows large enough to
warrant extraction, a new component file may be introduced at build
time — not decided here.

## 8. Data-Flow / Transaction Behavior

Unaffected. The new signal changes *when* finalization may proceed (a
pre-condition check), not the shape or transactional behavior of the
existing Firestore batch writes in `addMultipleStockBatches`,
`addStockBatch`, or `recordStockCount`. No new document, subcollection,
or write path is introduced.

## 9. UI Behavior

Not designed here (per §4a/§7a's own explicit deferral). At minimum,
each surface needs: a way to search/select an existing Product
(reusing existing in-memory `products` data — no new query), and a
distinct, explicit "confirm as new product" action. Exact layout,
copy, and interaction flow are implementation choices within this
plan's own authority, to be resolved during build, consistent with how
every prior Specification in this lineage has left equivalent UI
questions.

## 10. Audit Behavior

The existing `logTimelineEvent` mechanism (already used for product
creation) is expected to record which resolution path a new Product
came through (automatic vs. explicit owner-confirmed) — this is an
extension of an existing audit call, not a new audit subsystem.

## 11. Security / Tenant Isolation

No change. The new resolution UI operates only against the
already-subscribed, business-scoped `products` array in
`AppContext.tsx` (`businesses/{businessId}/products`) — no new query,
no new Firestore rule, no cross-business reference of any kind,
consistent with Decision A-Contagem's own explicit constraint.

## 12. Failure Modes and Recovery

| Failure | Expected behavior |
|---|---|
| Resolution UI fails to load / `products` array not yet synced | Row/line remains Unresolved; submission blocked — mirrors the existing `supplierWordingCandidates` fallback pattern (§10 of the Specification) |
| Owner abandons mid-resolution | No partial state persisted — mirrors §8's existing pre-confirmation transience rule |
| Owner confirms New, then edits the name before finalizing | The confirmed-new signal must be cleared and re-evaluated against the new text — mirrors the existing `supplierWordingDeclined`/candidate-clearing behavior on text change |

## 13. Concurrency Strategy

Unaffected — no change to `addMultipleStockBatches`'s existing
open-batch/transaction handling, or to `recordStockCount`'s existing
write pattern. The new signal is resolved entirely client-side before
any Firestore write begins.

## 14. Test Plan — Full Coverage Map

Mapped directly to this task's own required proof points:

| Requirement | Test target |
|---|---|
| Unresolved → Existing/New resolution required | New unit test on `addMultipleStockBatches`/`addStockBatch`/`recordStockCount`'s new safety boundary: an item with no `productId` and no confirmed-new signal must not silently create a `Product` — assert the function throws/rejects or otherwise refuses, rather than proceeding |
| Owner Existing selection resolves to the correct Product among multiple candidates | New test, added during governance review: with two or more plausible candidates presented, selecting a specific one resolves the item to that exact `productId` — not merely "any" existing product — proving the "no automatic selection on ambiguity" requirement is met by the owner's explicit choice, not by the mechanism itself |
| Explicit New → creates Product | New test: an item with the confirmed-new signal set does create a new `Product`, identical in shape to today's automatic creation |
| Existing → retrieves Product Memory | New test: an item resolved via the new UI to an existing `productId` triggers the same `findLatestRememberedProductMemory` call/result as the existing exact-match path — reuse of existing test fixtures from `product-name-similarity.test.ts`/`smart-stock-entry.test.ts` where applicable |
| Contagem follows the same identity principle | New test on `recordStockCount`'s safety boundary, mirroring the Add Stock test |
| Supplier-Wording remains excluded from Contagem | New test asserting `PeriodicStockCountView.tsx`'s own source does not import `supplierWordingRecognition.ts`/`supplierWordingMatching.ts` — mirroring the existing pattern in `initial-stock-portion-grouping-wiring.test.ts`/`periodic-stock-portion-grouping-wiring.test.ts` (source-scan assertions) |
| Tenant isolation remains intact | New test confirming the resolution UI's candidate source is the already-scoped `products` array and that no new Firestore query is introduced — a code-level/source-scan assertion, consistent with the existing wiring tests' own style |
| Remembered selling-unit/price/unit-relationship behavior preserved | Re-run existing `product-name-similarity.test.ts`, `supplier-wording-matching.test.ts`, `derived-selling-valuation-snapshot.test.ts`, `derived-transaction-valuation-quebra.test.ts` unmodified — all must continue passing with zero changes, proving no regression |
| B2 Reading 2 and Concept C remain untouched | Re-run `derived-selling-valuation-snapshot.test.ts`/`derived-transaction-valuation-quebra.test.ts` (unmodified) plus a source-scan assertion that neither `addStockBatch` nor `recordStockCount` newly references `buildDerivedSellingValuationSnapshot`/`derivedSellingValuation` — proving this plan does not, even incidentally, extend Concept C's reach (that remains a separate, not-yet-made decision per Decision C) |

No test is written by this document — this is the coverage map an
Implementation Authorization would hold the eventual PR to.

## 15. Regression Protection

The existing 195-test suite (evidence investigation Part C) must
continue passing unmodified — none of it is expected to require
changes, since this plan adds a new pre-condition gate rather than
altering any existing recognition, conversion, or valuation function's
own behavior.

## 16. Explicit Out-of-Scope List

- Initial Stock (not named by Decision A-Contagem).
- Any change to Supplier-Wording Recognition's own detection/ranking
  logic, or to `findSimilarProducts`'s own algorithm/threshold.
- Any change to Concept C's reach, authority, or call sites (Decision C
  — separate, not-yet-made decision).
- Any change to `StockBatch`, `Product`, or `StockCountItem` schema.
- Any change to Business Worth, Closing, or B2/selling-basis semantics.
- Barcode/SKU behavior.
- Migration or backfill of any historical `Product`.
- **Corrected during governance review, resolved:** the single-item
  `addStockBatch` call site has been traced in full (§4.2, above) —
  it has no live caller anywhere in the codebase today. §5's Checkpoint
  B is re-scoped to a defensive safety boundary only; this is no longer
  an open question.

## 17. Rollback Strategy

Each checkpoint (§5) is an additive, independently revertible change —
reverting the new gating in any one surface returns that surface to
today's exact current behavior (silent creation on miss), with no data
migration implied in either direction, since no schema changes.

## 18. Traceability to Amendment + Rule 8 Requirements

Direct mapping, confirming full coverage of the accepted decisions:

- Decision A → §4.1–4.2, above.
- Decision A-Contagem → §4.3, above.
- §4a's three-state model → §4.1, above (states 1–3 mapped 1:1).
- §7a's "no Supplier-Wording in Contagem" / "no cross-business" /
  "no auto-select ambiguous" → §4.3, §11, above.
- Decision B2 Reading 2 / Decision C — reconfirmed untouched, §16
  above and §14's own dedicated regression test row.

## 19. Acceptance Criteria

- All three checkpoints implement the identical three-state model,
  with no divergence in what "resolved" vs. "confirmed new" means
  across surfaces.
- Zero changes to any file governing B2, Concept C, Business Worth, or
  Closing.
- The full existing 195-test suite passes unmodified.
- The new test coverage in §14 is added and passes.
- No new Firestore query pattern; no new schema field beyond the
  client-side, non-persisted resolution signal described in §4.1.

## 20. Implementation Authorization Dependency

**This plan does not authorize implementation.** A separate
Implementation Authorization, reviewing this plan specifically, is the
next required gate before any code in §6 may be written.

---

## Product Architect Acceptance

**Status:** ✅ **ACCEPTED (2026-09-06).**

> I formally accept this Implementation Plan as the implementation
> blueprint for the already-approved Product Identity Existing/New
> Resolution architecture, exactly as reviewed in
> [`product-identity-existing-new-resolution-implementation-plan-governance-review.md`](./product-identity-existing-new-resolution-implementation-plan-governance-review.md)
> (verdict: READY FOR PRODUCT ARCHITECT ACCEPTANCE), including both
> corrections that review made to §2, §4.2, §4.3, §5, §6, §14, and §16.
> No further change is made by this acceptance.
>
> This acceptance confirms:
>
> 1. Decision A remains the governing product-identity rule: unresolved
>    identity cannot silently create a Product; only explicit
>    owner-confirmed New Product may do so.
> 2. Periodic Contagem is included under the Existing/New principle
>    (§4.3, §7a) while Supplier-Wording Recognition remains excluded
>    from Contagem — unchanged.
> 3. The proposed use of `findSimilarProducts` in Contagem is accepted
>    **only** as a candidate-generation mechanism inside an
>    owner-authoritative, blocking resolution flow — it must never
>    independently select or create a Product, per §4.3 as corrected.
> 4. The plan's finding that `addStockBatch` has no live callers
>    anywhere in the current codebase is accepted, and its treatment as
>    a defensive safety boundary only (no new resolution UI) is
>    accepted, per §4.2/§5/§6 as corrected.
> 5. B2 Reading 2 remains unchanged — no independently competing
>    selling basis, no `StockBatch` schema change, per §16.
> 6. Concept C remains unchanged, Derived/Frozen only, per §16, guarded
>    by the source-scan regression test in §14.
> 7. The implementation scope (§2, §4–§6), checkpoint sequence (§5),
>    and test strategy (§14) contained in the plan are accepted as
>    written.
> 8. No unrelated redesign is authorized — the explicit out-of-scope
>    list in §16 remains fully binding.
>
> **This acceptance does not constitute Implementation Authorization.**
> No application code, test, schema, or Firestore-rules file may be
> changed on the strength of this acceptance alone. Implementation
> Authorization remains a separate, subsequent, not-yet-performed
> governance gate.
>
> **Product Architect:** SABUSHIMIKE MASCENI.
> **Date:** 2026-09-06.

**Implementation Plan drafted → reviewed → ACCEPTED.**
**Implementation Authorization still required.**
**No application code may be changed until the Product Architect signs
the separate Implementation Authorization.**
