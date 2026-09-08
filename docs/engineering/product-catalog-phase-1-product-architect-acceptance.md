Acceptance Record

# Product Architect Acceptance — Owner Product Catalog Phase 1

**Status:** ✅ **ACCEPTED AND SIGNED.** See §6, below. Acceptance covers Decisions 1–9 exactly as proposed in the Decision Proposal referenced below. This acceptance does **not** authorize a Rule 8 Assessment, an Implementation Plan, an Implementation Authorization, or any code, schema, `firestore.rules`, or test change — all of these remain separate, later gates.

**Prepared by:** Claude (Lead Software Engineer role, this repository), recording an acceptance the Product Architect has already communicated, against repository state at this session's clone of `main`.

**Governs (originating proposal, preserved unchanged as the historical proposal artifact — not itself amended by this acceptance):**
- [`docs/engineering/product-catalog-phase-1-decision-proposal.md`](./product-catalog-phase-1-decision-proposal.md)

**Evidence base this proposal — and therefore this acceptance — sits on top of, unamended:** the three prior Product Catalog investigations conducted this session (Catalog architecture/reuse of `Product`; registration fields and never-stocked derivation; Product Merge governance/reference map), and the preceding Product Architect Decision Brief synthesizing them — none committed as separate repository artifacts, all preserved in the conversational record this proposal was drafted from.

---

## 1. What This Acceptance Covers

Signing this record accepts, exactly as stated in the Decision Proposal §5:

- **Decision 1** — a dedicated, Owner-only Product Catalog surface, separate from Dashboard and from Stocks.
- **Decision 2** — the existing `Product` entity remains the sole canonical identity; no `CatalogProduct` entity is introduced.
- **Decision 3** — Phase 1 registration fields: required `name`, `sellingPrice`; optional `category`, `supplier`, `sku`, `barcode`; `costPrice` excluded.
- **Decision 4** — Catalog registration is identity-only: zero stock, zero `StockBatch`, zero `StockCount`, zero Business Worth impact until real economic activity exists.
- **Decision 5** — the existing, already-signed Product Identity Existing/New Resolution mechanism remains the sole, authoritative recognition path for a Catalog-registered product later encountered in +Stock or Contagem.
- **Decision 6** — UnitRelationship configuration is excluded from Phase 1; `confirmProductUnitRelationship` remains available, unmodified, for a future explicit phase.
- **Decision 7** — Product Merge is explicitly excluded from Phase 1 and requires its own, separate future governance decision.
- **Decision 8** — Never-Stocked vs. Out-of-Stock visible UI is deferred from Phase 1.
- **Decision 9** — the existing Product Memory lifecycle remains fully authoritative and is not redesigned.

Signing this record does **not**:

- Perform a Rule 8 Assessment against any of the nine decisions.
- Produce or amend an Implementation Plan or Implementation Authorization.
- Change any `Product`, `StockBatch`, `StockCount`, or other schema.
- Change any recognition logic, Add Stock, Contagem, Product Memory, Business Worth, or pricing behavior.
- Grant any implementation authority, directly or by implication.
- Retroactively represent the original Decision Proposal as having been accepted at the time it was written — the proposal document itself is left unmodified and remains identifiable as a proposal, dated to its own original recording.

## 2. Decisions 1–9 — Accepted Wording

**ACCEPTED**, verbatim from the Decision Proposal §5:

> **Decision 1.** Approve a dedicated Owner-only Catalog surface, separate from Dashboard and from Stocks... Not a POS, not a purchase-entry screen, not a stock-count screen, not a Contagem replacement, not a Business Worth surface.
>
> **Decision 2.** Approve reuse of the existing `Product` entity. No separate `CatalogProduct` entity is proposed.
>
> **Decision 3.** Approve: required `name`, `sellingPrice`; optional `category`, `supplier`, `sku`, `barcode`; excluded `costPrice`, explicitly preserving §45 Amendment FR-88's existing boundary.
>
> **Decision 4.** Approve that Catalog registration is identity-only: no `StockBatch`, no `StockCount`, no physical inventory, no Business Worth contribution merely from existing.
>
> **Decision 5.** Approve continued, unmodified reuse of the existing, already-signed Product Identity Existing/New Resolution mechanism. No second identity-resolution system is proposed.
>
> **Decision 6.** Approve that UnitRelationship configuration is not part of Phase 1 registration. `confirmProductUnitRelationship` remains available, unmodified, for a future explicit phase/screen.
>
> **Decision 7.** Approve that Product Merge is explicitly out of scope for Phase 1... deferred because the current architecture does not yet define: canonical/losing Product lifecycle, merge model, metadata conflict resolution, or post-merge recognition/alias behavior.
>
> **Decision 8.** Approve deferring the Never-Stocked vs. Out-of-Stock distinction from Phase 1's visible UI.
>
> **Decision 9.** Approve that the existing Product Memory lifecycle remains fully authoritative and unmodified.

## 3. Explicit Scope Boundaries Reaffirmed (Decision Proposal §6)

This acceptance does **not** authorize: Product Merge implementation; UnitRelationship configuration UI; Never-Stocked/Out-of-Stock UI; Product Memory redesign; a new Product identity model; a new `CatalogProduct` collection/entity; changes to Contagem calculation logic; changes to Business Worth formulas; changes to purchase-cost ownership; automatic duplicate creation; automatic merge; or any automatic identity decision made without explicit Owner authority.

## 4. Deferred Decisions Reaffirmed (Decision Proposal §7)

- Product Merge, in full — requires its own future governance decision.
- UnitRelationship configuration screen — technically ready via `confirmProductUnitRelationship`, deferred as a scope choice.
- Never-Stocked/Out-of-Stock visible UI — technically derivable, deferred as a scope choice.

None of these three is authorized, expanded, or narrowed by this acceptance — each remains exactly as deferred in the accepted proposal.

## 5. Permission / Tenant-Isolation Boundary Reaffirmed (Decision Proposal §10)

The Catalog surface remains Owner-only via the existing `!isStaff` client-side gating pattern (`App.tsx:134`) — no new permission tier, no `firestore.rules` change. Tenant isolation is inherited unmodified from the existing `isMemberOf(businessId)` definition.

## 6. Signature

Decision 1: I ACCEPT

Decision 2: I ACCEPT

Decision 3: I ACCEPT

Decision 4: I ACCEPT

Decision 5: I ACCEPT

Decision 6: I ACCEPT

Decision 7: I ACCEPT

Decision 8: I ACCEPT

Decision 9: I ACCEPT

**Product Architect:** SABUSHIMIKE MASCENI

Date: 2026-09-08

This acceptance closes the Product Architect Decision Proposal gate for all nine decisions. It authorizes proceeding to a Rule 8 Assessment against the accepted decisions as a next, separate step — it does not perform that Rule 8 Assessment itself, and no further governance or implementation step may proceed until that Rule 8 Assessment is separately requested and completed.

---

## 7. Governance Status After This Acceptance

```
Three Investigations (Catalog architecture; registration fields/
never-stocked derivation; Product Merge governance)
        ↓
Product Architect Decision Brief
        ↓
Product Architect Decision Proposal
        ↓
PRODUCT ARCHITECT ACCEPTANCE — COMPLETE  ◄── this document
        ↓
RULE 8 ASSESSMENT — PENDING
        ↓
Specification Amendment — ONLY IF RULE 8 REQUIRES IT
        ↓
Implementation Planning — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**Implementation remains NOT authorized by this document.**
**Rule 8 remains PENDING and is not performed by this document.**
**No application code, test, schema, or `firestore.rules` file was modified to produce this acceptance record.**
