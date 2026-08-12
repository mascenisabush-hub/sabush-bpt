Governance Review Summary

# Smart Stock Entry — Governance Review Summary

**Status:** Governance direction ready for approval review. **Not yet
approved. Implementation not authorized.**
**Purpose:** Consolidate the three governance artifacts below into one
document the Product Architect/owner can review and explicitly approve
or reject, per the originating task's own two-stage process
(governance approval, then a separate implementation authorization).
This document decides nothing on its own — it summarizes, and points
to, the three documents that carry the actual decisions.
**Governed artifacts:**
1. [BDR-0008 — Smart Stock Entry: AI-Assisted, Human-Confirmed Data
   Capture](./BDR-0008-smart-stock-entry-ai-advisory-boundary.md)
2. [Architecture Decision Record — Smart Stock Entry's AI Integration
   Shape](../architecture/10-smart-stock-entry-adr.md)
3. [Smart Stock Entry Amendment](./04-smart-stock-entry-amendment.md)
   (spec #4)

---

## 1. What Each Document Decides

| Document | Answers | Does not answer |
|---|---|---|
| BDR-0008 | Why this capability may exist; the advisory-only/human-confirmation boundary; the "found vs. guessed" trust test | Where it's built, how it's built, what it must do field-by-field |
| Smart Stock Entry ADR | Domain placement (Purchase Batches, not AI Intelligence); system-level integration shape (synchronous, privileged-server-only); `PurchaseDraft` compatibility, verified against code; security controls specific to untrusted-document input | Business rules, UX, failure-mode behavior, provider selection |
| Spec #4 Amendment | Functional requirements, document-tier scope (MVP = Tier 1 only), product-matching confidence rules, UX journey, the full A–R failure-mode table, explicit out-of-scope list | Any architectural or strategic question already fixed above |

## 2. The Five Concerns Raised in Review, and How Each Was Resolved

**1. `PurchaseDraft` misuse risk.** Resolved by direct code inspection
(ADR Decision 2a), not by assertion: `purchaseDrafts/{uid}` is a
single, always-fully-overwritten document. A server-side "stage the
proposal" write would have silently discarded whatever the user had
already typed. The fix: the AI proposal is merged into `AddStockView`'s
existing local `rows` state — the same state manual typing already
lives in — and the existing, unmodified autosave persists it from
there. `PurchaseDraft`'s lifecycle is provably unchanged, since Smart
Stock Entry is never given a write path to that collection at all.

**2. AI becoming a second source of truth.** Resolved by BDR-0008 §1a:
a finalized `StockBatch`/`PurchaseBatch` carries no field, flag, or
marker recording that AI was involved. AI has no persistent object of
its own downstream of confirmation, and therefore cannot become a
parallel authority to Product/StockBatch.

**3. Premature provider/model coupling.** Resolved by ADR Decision 2b:
document reading/OCR, structured extraction, and product matching are
fixed as separate pipeline *stages*, with no commitment to which
provider or model serves which stage, or whether they're one call or
several. This is deferred deliberately, consistent with Section
10.10's "do not build AI" discipline.

**4. Silent low-confidence product matching.** Resolved by the spec
amendment's Business Rules (Part C): an explicit, required "we
couldn't confidently match this product — choose or create" state,
visually and structurally distinct from a confident match. No
low-confidence guess is ever pre-selected with the same visual weight
as a real match.

**5. MVP scope risk / overengineering.** Resolved by narrowing to a
four-tier roadmap, with **Tier 1 only** (clear printed receipts/
invoices with structured, machine-legible line items) authorized for
initial build. Tiers 2–4 (supplier sheets, poor-quality/handwritten
documents, smarter matching) are explicitly deferred, with graceful,
non-blocking degradation defined for anyone who tries them anyway.

## 3. The Governing Trust Test (Added at Owner Direction)

Elevated into BDR-0008 §1b as a durable principle, not left as a
review comment, because it is exactly the kind of decision a BDR
exists to protect long-term:

> **Does this make recording a legitimate stock purchase materially
> faster, without making the business owner less certain about what
> SABUSH actually recorded? If yes, it belongs. If the AI ever says
> "I found this" when it actually means "I guessed this," the feature
> is violating SABUSH's trust model.**

This is now a standing test against which every future change to this
feature — not just its initial build — must be checked. A change that
would make an uncertain extraction *look* certain (dropping the ⚠
Review indicator, giving a low-confidence guess the same visual weight
as a typed value) is a violation of BDR-0008, requiring that BDR to be
explicitly reopened, not a routine UX tweak.

## 4. Explicit Decisions Requiring Owner Approval

Each of the following is a genuine product/business decision this
governance package makes, presented here for explicit sign-off rather
than assumed correct by default:

- [ ] **Domain placement:** Smart Stock Entry is an assisted input
      method inside the Purchase Batches domain (spec #4) — **not**
      part of the AI Intelligence domain (spec #15), which remains
      entirely about predictive/diagnostic insight and is unaffected
      by this feature.
- [ ] **Advisory-only boundary:** no AI-extracted value ever becomes
      an authoritative record without explicit human confirmation
      through the existing Add Stock submission gesture — no
      exceptions, no subscription tier, no "trusted user" override.
- [ ] **`PurchaseDraft` integration shape:** the proposal is merged
      into `AddStockView`'s local state, never written to
      `purchaseDrafts` directly by any AI-specific code path.
- [ ] **MVP document scope:** Tier 1 only (clear printed receipts/
      invoices) is authorized for initial build; Tiers 2–4 are
      deferred.
- [ ] **Product-matching confidence rule:** a required, visually
      distinct "couldn't confidently match" state whenever confidence
      is insufficient — never a silent best-guess selection.
- [ ] **No selling-price invention, no Restock Observation inference:**
      both remain exactly as already governed by spec #3/#5 and the
      Restock Observation Amendment — this feature adds no exception.
- [ ] **The Trust Test (§3 above)** as a standing acceptance principle
      for this feature's entire lifecycle, not just its first release.

## 5. Unresolved / Deferred Decisions (Not Blocking Governance Approval)

These are named, explicitly deferred, and do not need to be resolved
before governance approval — but implementation cannot proceed past
the point each one is needed without a separate, narrow decision:

1. **AI/vision provider and model selection**, and its actual
   cost-per-call — an implementation detail per Section 10.10, decided
   once governance is approved, not part of this package.
2. **Original document retention** — whether/how long an uploaded
   image is kept beyond the extraction call. Recommendation on file
   (ephemeral-only for MVP) but not decided as a binding rule here.
3. **Subscription-tier gating for the extraction step itself** (the
   confirmed write is already gated automatically) — a module #19
   business decision, to be staged via Feature Flags (9.5) if/when
   made.
4. **Per-business/per-day usage ceiling** on extraction calls, as a
   cost-control measure — recommended in the ADR (Decision 4), not
   yet a binding design.

## 6. Implementation Boundary

**If this governance package is approved, that approval authorizes:**
- Drafting a detailed implementation plan (routes, UI components,
  exact confidence-threshold logic) for Tier 1 MVP only.
- Beginning implementation **only after** a separate, explicit
  implementation authorization is given — governance approval and
  implementation authorization remain two distinct steps, per the
  originating task's own instruction and the owner's stated process.

**Approval of this package does NOT authorize, by itself:**
- Any code being written.
- Any Firestore rule change.
- Any change to `calculations.ts`, Business Worth, Embedded Profit,
  Stock Count, or Quebra logic.
- Selection of an AI provider or any spend commitment.
- Any Tier 2–4 document-type work.

## 7. Consolidated Acceptance Criteria

Pulled together from all three documents, as the single checklist this
feature's eventual build will be judged against:

- [ ] No code path ever allows an AI-extracted value to reach a
      `StockBatch`, `Product`, or `PurchaseBatch` write without
      explicit human confirmation identical in kind to today's Add
      Stock submission.
- [ ] No confidence state collapses "confidently detected" and
      "guessed/low-confidence" into the same visual presentation.
- [ ] A failed, ambiguous, or rejected extraction never blocks manual
      Add Stock.
- [ ] `PurchaseDraft`'s existing lifecycle, meaning, and finalization
      behavior are unchanged — verified, not merely assumed, by the
      "never a direct write path" rule (ADR Decision 2a).
- [ ] No `StockBatch`/`PurchaseBatch` record ever carries a trace that
      AI was involved in proposing its values.
- [ ] Document reading/OCR, structured extraction, and product
      matching remain separable pipeline stages — no provider lock-in
      baked into the route's contract.
- [ ] Product matching below a defined confidence threshold always
      shows the explicit "couldn't confidently match" state.
- [ ] Every field in Part G's failure-mode table (A–R, spec amendment)
      has the defined behavior, none of them blocking.
- [ ] Tier 1 is the only document class this build targets; Tier 2–4
      documents degrade gracefully but receive no dedicated accuracy
      work.
- [ ] No change to Business Worth, Embedded Profit, Stock Value,
      Restock Observation semantics, or any historical `StockBatch`.

## 8. Recommendation

**Governance direction: ready for approval.**
**Implementation authorization: not yet — pending explicit sign-off on
Part 4 above.**

Once Part 4's checklist is explicitly approved (or amended and
re-approved), the next step is a separate, distinct implementation
authorization message — this document does not constitute one, and
none of the three governed artifacts should be treated as
implementation-ready until that separate authorization is given.
