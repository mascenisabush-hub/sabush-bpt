Business Decision Record

# BDR-0013 — Product Identity, Name Correction & Alternative-Name Memory — Business Decision Record

**Status:** DRAFT — proposed for Product Architect review. Not accepted. Not authorized for implementation.
**BDR number:** `BDR-0013` — explicit Product Architect assignment, per this repository's established discipline (`BDR-0012`'s own numbering, `POL-0005`/`POL-0006`) that a BDR number requires explicit assignment and is never inferred from the highest existing number. This assignment was made only after a fresh, exhaustive numbering investigation established that the apparent gapless sequence (`BDR-0001`–`BDR-0012`) was not, by itself, a legitimate basis for assignment — matching the same standard already applied to `BDR-0012`'s own numbering.
**Location note:** Filed in `docs/specs/`, unprefixed — this capability is cross-cutting (Product Catalog, Add Stock, Initial Stock, Periodic Contagem, Smart Stock Entry), following the same unprefixed naming pattern already established for cross-cutting artifacts in this repository (`BDR-0004`, `BDR-0008`, `BDR-0009`, `BDR-0012`, and this same broader initiative's own Discovery Report, Specification, and reconciliation amendment).
**Depends on:** [`product-identity-alternative-name-discovery.md`](./product-identity-alternative-name-discovery.md) (Investigation only; findings accepted as the basis for this draft, per its §15).
**Does not amend:** `BDR-0012`, `POL-0001`–`POL-0006`, the accepted UOM Specification, `BDR-0009`, `03-products.md`, or `04-smart-stock-entry-amendment.md`. This is a new, separate BDR for a genuinely adjacent capability, not an amendment to any of these.

---

## 1. The Business Reality

Two examples, evidenced directly in the Discovery Report (§1), motivate this BDR:

A product package physically reads "Castle Lite 330ml"; the business commonly calls it "Lite 330ml," and suppliers consistently use "Lite 330ml" too. Separately, a business knows a product as "Bela 400g" or "Cotovelos Gobbeti," while a supplier's receipt says "Massa cotovelo" — a different string for the same physical product.

The Discovery Report confirmed, directly against live code (its §3–§6), that no mechanism exists anywhere in this system for a product to be known by more than one name, and that this is a genuinely separate governance domain from `BDR-0012`'s unit-of-measure capability (Discovery Report §9).

## 2. Conceptual Vocabulary — Preserved From the Discovery Report

The following distinctions, established in the Discovery Report's §2, are carried forward unchanged and must not be conflated anywhere in this BDR or anything built from it: **Product identity**; **`Product.name`**; **owner correction**; **supplier wording**; **alternative name/alias**; **name normalization** (`POL-0003`'s existing subject); **semantic identity resolution**; **UOM Recognition** (`BDR-0012` Decision 17 — unit-of-measure structure only, never product naming).

## 3. Decisions Formally Established

**Decision 1 — DIRECTLY EVIDENCED, restated, not newly decided.** Product identity and `Product.name` remain exactly as `03-products.md` and `BDR-0012` §3 already establish — unaffected by this BDR. This BDR does not redefine what a `Product` is.

**Decision 2 — DIRECTLY EVIDENCED, restated, not newly decided.** Correcting a captured or extracted name before a product is created or saved (Discovery Report §7, Reading A) is already-existing, ordinary field-editing behavior. It requires no new decision and is not further authorized or restricted by this BDR.

**Decision 3 — REQUIRED BUSINESS DECISION.** A genuine business need exists, evidenced by both motivating examples and the Discovery Report's §11 risk analysis (duplicate products, repeated correction burden, inconsistent identity across suppliers, owner uncertainty), for BPT to eventually be capable of remembering that more than one name string may refer to the same confirmed Product identity. **This BDR proposes authorizing that capability to exist in principle** — not any specific shape of it (§5, below, preserves every shape question as explicitly open).

**Decision 4 — REQUIRED BUSINESS DECISION, boundary-setting.** If authorized, this capability must follow the same discipline this platform already applies to every analogous AI-assisted or suggestion-based capability (`BDR-0012` Decision 12; `POL-0003`'s own confirm-before-acting discipline): a candidate alternative-name association may be **suggested**, but may **never be established, merged, or acted upon without explicit owner confirmation**. Certainty is never a precondition for suggesting, and absence of certainty is never a license to decide silently.

**Decision 5 — REQUIRED BUSINESS DECISION.** This capability, however eventually shaped, is never authorized to silently merge two existing `Product` records, silently rename a product, or silently reinterpret any historical record. Any of these actions, if ever performed, requires the same explicit owner confirmation Decision 4 already establishes. This decision governs silent versus confirmed action only — it does not itself authorize confirmed merging of any pre-existing historical duplicate products; whether that should ever occur at all remains item 9's open question, below, unaffected by this decision either way.

## 4. Relationship to Existing Governance — Explicit, Not Assumed

**`POL-0003` is not broadened by this BDR.** `POL-0003`'s approved signal remains exactly *"name similarity, after normalization (case, spacing, punctuation, and accent differences)"* — a narrow, normalization-level boundary. Neither motivating example in this BDR falls within that boundary (Discovery Report §6). If this capability is eventually built, it would require its own new confirmation-discipline Policy, analogous in *shape* to `POL-0003` but governing a different, semantic-level signal — not an extension of `POL-0003` itself, and not decided by this BDR (§5, below).

**`BDR-0012` Decision 13 (Product Memory) is not expanded to cover names.** Decision 13 enumerates exactly *"unit relationship, selling unit, and reference prices"* — this BDR does not add "alternative name" to that enumerated list. If an alternative-name concept is ever built, whether it lives conceptually alongside Product Memory or as its own distinct structure is itself left open (§5, below), not decided here.

**`BDR-0012` Decision 17 (Recognition) is not expanded to product-name recognition.** Decision 17 is, and remains, scoped explicitly to unit-of-measure structure. This BDR does not rename, extend, or reuse "Recognition" as a term for any product-naming capability — any future proposal capability for names would need its own name and its own decision, not inherit Decision 17's.

**Existing exact-name matching code is not treated as authorization for anything.** The Discovery Report (§4) confirmed exact-match-only matching at three independent code locations, including a doc comment explicitly deferring fuzzy/alias matching as unbuilt future work. That deferral is acknowledged, not activated, by this BDR.

## 5. Open Decisions — Preserved Exactly From the Discovery Report, Not Resolved Here

*(Each item's status: OPEN / NOT DECIDED, per the decision-discipline this BDR is held to. None is resolved by inference from a similar mechanism elsewhere in this platform.)*

1. **What exactly should be remembered — OPEN.** Canonical name only, general alternative names, supplier-specific names, multiple aliases, historical names, or OCR-correction history. No evidence distinguishes between these possibilities.
2. **Supplier-specific or general — OPEN.** Whether an alternative name is scoped to one supplier or general to the business.
3. **Confirmation discipline, in detail — OPEN.** Decision 4 (§3, above) establishes the *boundary* (suggest, never decide silently) — but the exact confirmation experience, and whether `POL-0003`'s existing minimum-shape pattern is reused, adapted, or replaced, is not decided. This item is therefore a partial decision, not a fully open question: the floor is fixed (Decision 4), the shape above that floor is not.
4. **Multiple possible matches — OPEN.** Whether the system should suggest one, several, require owner selection, or refuse to suggest at all when more than one product plausibly matches a given name.
5. **One alternative name claimed by two products — OPEN.** No decision on how this conflict is resolved.
6. **Example 1's Reading A vs. Reading B — OPEN.** Whether a one-time correction to `Product.name` fully satisfies the business need, or whether repeated automatic recognition of the same package/supplier wording on future encounters is also required — and, if the latter, this question is inseparable from question 1, above.
7. **Lifecycle/correction of an already-confirmed alternative-name association — OPEN.** Whether such an association can be removed, replaced, or disassociated, and how, is not decided.
8. **Surface scope — OPEN.** Whether this capability applies to Initial Stock, Add Stock, Periodic Contagem, Smart Stock Entry, and/or product catalog editing — individually, all, or some subset. The business requirement as described is general; evidence does not establish universal applicability.
9. **Historical/pre-existing duplicate products — OPEN.** Whether any product duplication already existing today should ever be addressed retroactively is not decided. **This BDR authorizes no migration, backfill, or historical reinterpretation of any kind**, regardless of how this question is eventually resolved.

## 6. What This BDR Decides, and What It Does Not

**Decides:** that a business need for alternative-name memory is evidenced (Decision 3); that if built, it must follow a suggest-then-confirm discipline and never silently merge, rename, or reinterpret (Decisions 4–5); that this is a separate governance domain from `BDR-0012`, `POL-0003`, and Decision 17 specifically (§4).

**Does not decide — deferred to a future Policy/Specification/Rule 8, or left genuinely open:** any of the nine items in §5; a data model or schema for storing alternative names; a matching or similarity algorithm; an AI provider or model; a confidence threshold; a UI design; surface-by-surface implementation detail; historical migration or backfill of any kind.

## 7. Business Acceptance Criteria

1. No repository artifact is silently altered by this BDR — `BDR-0012`, `POL-0001`–`POL-0006`, the accepted UOM Specification, `BDR-0009`, and `04-smart-stock-entry-amendment.md` remain exactly as they are.
2. `POL-0003`'s approved scope is unchanged.
3. Decision 17 remains scoped to unit-of-measure structure only.
4. Every one of the nine questions in §5 remains explicitly open, not silently resolved.
5. No technical architecture, schema, algorithm, AI provider, or UI is committed anywhere in this document.
6. No historical migration or backfill is authorized.

## 8. Governance Notes

- This is a draft only. No repository file other than this new BDR has been created or modified.
- The Discovery Report (`product-identity-alternative-name-discovery.md`) remains `Investigation only`, unmodified by this draft.
- This BDR does not itself authorize a Policy, Specification, Rule 8 Assessment, or Implementation Authorization.

## 9. Next Governance Step

If accepted: explicit Product Architect resolution of each of the nine open items in §5, mirroring exactly the same one-at-a-time, evidence-gated resolution process `BDR-0012` §5.A underwent — followed by any resulting Policy work, a Specification, Rule 8, and Implementation Authorization, in that order, per this repository's established governance sequence (`19-governance-bdr-policy-framework.md`).
