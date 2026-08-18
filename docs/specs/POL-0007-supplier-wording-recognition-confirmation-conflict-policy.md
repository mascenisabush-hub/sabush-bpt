Decision Record

# POL-0007 — Supplier-Wording Recognition, Confirmation & Conflict Policy

**Status:** Approved.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Cross-Cutting Policy Namespace addendum. Identifier `POL-0007` explicitly assigned by the Product Architect, recorded in [`BDR-0013`](./BDR-0013-product-identity-alternative-name-memory.md) §8 Governance Notes — not inferred from the highest existing number.
**Depends on:** [`BDR-0013`](./BDR-0013-product-identity-alternative-name-memory.md) (Product Identity, Name Correction & Alternative-Name Memory) — specifically §5 items 1 (what's remembered / supplier-aware priority), 3 (confirmation discipline), 4 (multiple possible matches), and 5 (one alternative name claimed by two products), and Decision 4 (suggest-then-confirm boundary).
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`BDR-0013` items 1, 3, 4, and 5 already establish, as approved business decisions, that BPT may propose that a newly-entered supplier wording refers to an already-known product; that the owner must explicitly confirm before any relationship is remembered; that a confirmed relationship is thereafter automatically reused; that if the owner does not recognize the proposed match the incoming item is a new product; that multiple plausible existing products may be shown together; and that a supplier wording already claimed by one product but appearing to belong to a different one must be flagged as a conflict. None of these items specifies what should cause BPT to propose a candidate match in the first place, what the resulting confirmation moment should minimally contain, or how the multiple-candidate and conflicting-wording cases are presented at a business level. This Policy addresses that operational gap — the same role `POL-0003` plays for the structurally identical `BDR-0012` Decisions 10–11.

## Guiding Principle

Consistent with `BDR-0013` Decision 4's own text — *"certainty is never a precondition for suggesting, and absence of certainty is never a license to decide silently"* — this Policy treats a plausible-but-uncertain signal as sufficient grounds to ask the owner, not as something requiring a high-confidence threshold before BPT may raise the question. This mirrors `POL-0003`'s own Guiding Principle for the adjacent `BDR-0012` capability, without extending or relying on `POL-0003` itself (see Relationship to `POL-0003`, below).

## Business Requirements Now Settled

The following are settled by this Policy, operationalizing `BDR-0013`'s already-approved decisions:

1. BPT may propose that a newly-entered supplier wording, encountered during stock entry, refers to an existing product (`BDR-0013` items 1, 3).
2. A proposal may be grounded in the candidate signals described below (Candidate Grounds), individually or together.
3. **Owner-initiated declaration, without a prior system proposal, is explicitly authorized by the Product Architect — but only during the supplier stock-entry workflow.** While recording stock received from a supplier, the owner may identify that the supplier's wording refers to an already-known product and explicitly establish that relationship themselves, even where BPT did not first propose it as a candidate. This is not a general Product Catalog operation: it does not authorize establishing a supplier-name relationship from a separate product-management screen, and remains bounded by the same explicit-owner-action requirement as a system-initiated proposal — it authorizes an additional way the relationship may be *initiated*, not a way it may be *established silently*.
4. A proposed or owner-declared candidate match is never an identity decision by the system (`BDR-0013` Decision 4).
5. The owner must explicitly confirm — "same product" or "different product" (new product) — before any relationship is remembered (`BDR-0013` item 3).
6. **When the owner indicates the proposed candidate is not the same product, the incoming item is treated as a new product.** There is no "reject alias" concept that separately blocks or complicates creating it — the owner records/creates the new product directly. The system must never force the owner to select an existing product merely because a candidate was suggested (`BDR-0013` item 3).
7. Once confirmed (whether system-proposed or owner-initiated, per requirement 3), that specific supplier-wording-to-product relationship is automatically recognized and reused on future occurrences of the same wording from the same supplier, without asking the owner to reconfirm (`BDR-0013` item 3).
8. When more than one existing product is a plausible candidate for the same supplier wording, all plausible candidates are shown together; the owner picks one or declares a new product; no candidate is presumed correct merely by being surfaced (`BDR-0013` item 4).
9. When a supplier wording is already an established alternative name for one product, but a later occurrence appears to the owner to belong to a different product, BPT must flag this specific conflict rather than silently reusing the existing relationship or silently creating a duplicate; if the owner determines it is a different product, distinguishing information is mandatory before that new product can be created (`BDR-0013` item 5; see Conflicting Supplier Wording, below).
10. The system must never silently establish, merge, or reassign a supplier-wording relationship under any of the above (`BDR-0013` Decision 4, Decision 5).

## Candidate Grounds for a Proposed Match

BPT may treat any of the following as business-level grounds to propose that a newly-entered supplier wording refers to an existing product:

- **Exact or normalization-level similarity to the product's Initial Stock name** — the same category of signal `POL-0003` already establishes as legitimate business grounds elsewhere in this platform (case, spacing, punctuation, and accent-level closeness), reused here as a *category* of permissible signal for this separate Policy's own domain — not by amending, broadening, or otherwise relying on `POL-0003` itself, which remains scoped exclusively to `BDR-0012`.
- **Exact or normalization-level similarity to another already-confirmed alternative name recorded for the same product**, regardless of which supplier that alternative name is associated with.

**This Policy does not claim these two grounds are sufficient to catch every case `BDR-0013` motivates.** The Discovery Report's own Example 2 ("Massa cotovelo" vs. "Bela 400g"/"Cotovelos Gobbeti") is not textually similar under either ground above — it is a genuinely semantic association, not a normalization-level one. **This Policy does not resolve how, or whether, BPT can automatically propose a match in a genuinely semantic case like that.** Where no candidate signal fires, business requirement 3 (above) remains the operative path: during supplier stock entry, the owner may still directly declare the relationship themselves, without waiting for a system-initiated proposal. This Policy does not invent, require, or preclude any future semantic-matching capability — that remains entirely undecided, for a future BDR/Policy/Specification to address if ever pursued.

## Multiple Candidates — No Presumed Ranking

When more than one existing product is plausible under the grounds above, this Policy establishes only the business rule that all plausible candidates are presented together, and that being surfaced — regardless of order or degree of similarity — never itself implies correctness. **This Policy does not decide how candidates are ordered, scored, or limited in number** (see Technical Boundary, below) — only that no such ordering may be treated as a decision the owner does not still have to make.

## Conflicting Supplier Wording — Distinguishing Information: ACCEPT, Mandatory

`BDR-0013` item 5 establishes that, in a conflict, the owner may create a new product and "there must be a way to add distinguishing information explaining what makes the new product different." **Whether providing that distinguishing information is mandatory before the new product can be created, or remains optional, is now resolved by explicit Product Architect decision: it is mandatory.**

This rule applies specifically to the conflict scenario item 5 describes — where a supplier wording is already an established alternative name for one product, and the owner determines that the current occurrence is a genuinely different product, not the one already associated with that wording. It must be kept distinct from the ordinary case of the owner simply choosing to use the already-known existing product for that wording (item 5's other resolution path, where no new product is created and no distinguishing information is required at all).

**When the owner determines the occurrence is a different product, distinguishing information must be provided before that new product can be created.** The new-product creation does not proceed, and is not treated as complete, until this requirement is satisfied. This is a business/data-quality requirement, adopted specifically because the entire purpose of this conflict-flagging capability (per item 5 and the "avoid duplicate products" purpose running through `BDR-0013`) would be undermined if a new product could be created in direct response to a flagged naming conflict without ever recording what actually distinguishes it from the product the wording was already associated with.

**This Policy does not decide:**
- what fields or content constitute distinguishing information;
- how it is captured, validated, or stored;
- any data model, schema, or database structure for it;
- any UI implementation or validation mechanism.

All of the above remain entirely for the later Specification (and, if needed, Rule 8) to determine — this Policy fixes only the business rule that the information is required, not what it consists of or how it is technically enforced.

## Owner-Initiated Declaration — Scope and Boundaries

Per explicit Product Architect decision, the owner may establish a supplier-wording-to-product relationship without a prior system proposal, **but only while the owner is within the supplier stock-entry workflow** — i.e., the same context `BDR-0013` item 3 already establishes as the trigger for system-proposed recognition (receiving/recording stock from a supplier, entering the supplier's receipt). Specifically:

- This authorization is **strictly bounded to supplier stock entry**. It is **not** a general Product Catalog operation, and does **not** authorize establishing a supplier-wording relationship from a separate product-management screen, at any other time, or through any other surface.
- An owner-initiated declaration remains **explicit owner action** — it carries the identical confirmation weight as a system-proposed match confirmed by the owner; it is not, and must never become, a lower-friction or implicit path to the same outcome.
- It does **not** authorize silent establishment under any circumstances — the same Decision 4/Decision 5 boundary applies identically regardless of whether BPT or the owner first identified the candidate relationship.
- It does **not** authorize automatic merging, renaming, migration, backfill, or historical reinterpretation — none of `BDR-0013`'s existing prohibitions are altered or narrowed by this authorization.
- Once established this way, the relationship is governed identically to a system-proposed, owner-confirmed relationship for every subsequent purpose (automatic reuse, conflict handling, correction) — this Policy does not create a second, parallel category of relationship with different rules depending on how it originated.

## Interaction With `BDR-0013` Item 7 — Acknowledged, Not Re-Decided

`BDR-0013` item 7 already establishes that a product entry within a purchase receipt/stock entry remains editable and deletable before that receipt is confirmed, and becomes immutable after. A supplier-wording proposal or owner-initiated declaration that is still pending or newly-confirmed within that same, not-yet-finalized stock entry is part of that same product entry, and is therefore already governed by item 7's existing rule — editable or removable, along with the rest of the entry, until the receipt is confirmed; immutable once it is. **This Policy does not create any new lifecycle rule for a supplier-wording relationship** — it only acknowledges that item 7's already-accepted rule already extends to it, exactly as it extends to every other aspect of a not-yet-confirmed product entry.

## Confirmation Experience — Minimum Shape

Whatever the eventual interaction design, it must, at minimum: present the specific candidate product to the owner, together with enough information — at minimum, that product's current Initial Stock name — for the owner to judge whether the incoming supplier wording refers to it, not a generic "possible match" notice with no context; offer exactly two resolutions — "same product" or "different product" (new product) — matching `BDR-0013` item 3's own YES/NO framing; and take no default action if the owner has not yet responded, consistent with Decision 4's "never decide silently" boundary. Where multiple candidates are shown (above), the same minimum information applies to each candidate individually.

## Reuse of an Already-Confirmed Relationship

`BDR-0013` item 3 already establishes that a confirmed supplier-wording-to-product relationship is automatically reused on a future occurrence of "the same remembered supplier wording" from the same supplier. **This Policy does not decide whether a future occurrence must match byte-for-byte, or whether normalization-level variation (case, spacing, punctuation, accent) is still treated as the same remembered wording for reuse purposes.** That is left to the Specification. Should normalization be applied at that stage, doing so would be consistent in *character* with the same signal category `POL-0003` already treats as legitimate elsewhere in this platform — but this Policy does not itself decide that question, extend `POL-0003`'s own approved scope to cover it, or require any particular technical approach.

## Relationship to `POL-0003`

`POL-0003` governs `BDR-0012` Decisions 10–11 only — duplicate-*product* suggestion, triggered by normalization-level name similarity or barcode/SKU agreement. This Policy governs a distinct BDR (`BDR-0013`) and a distinct business question — recognizing that a *supplier's own wording* for a product may differ from that product's Initial Stock name, not detecting whether two catalog entries are accidental duplicates of each other. `POL-0003`'s own text is not modified, broadened, or relied upon as authority by this Policy; where this Policy reuses a *category* of signal `POL-0003` also uses (normalization-level similarity), it does so as an independent statement for its own domain, not as an amendment to or extension of `POL-0003`.

## Technical Boundary

This Policy does not decide, and explicitly leaves to the later Specification:

- The specific similarity/matching algorithm or string-distance metric used to detect any candidate signal above.
- Any numeric confidence threshold.
- How multiple signals, or multiple candidates, are ranked, scored, weighted, or limited in number.
- The normalization method used for any similarity comparison.
- Whether reuse-matching (above) is byte-exact or normalized, and by what mechanism.
- The underlying data model, schema, alias-table structure, or storage mechanism for a candidate, a confirmed relationship, or distinguishing information.
- Any AI/OCR provider or model.
- The UI design, layout, or exact interaction flow for any confirmation moment, beyond the minimum shape stated above.
- Any migration, backfill, or automatic merge mechanism.

`BDR-0013` §6 already excludes all of the above from BDR-level decision-making; this Policy, operationalizing that BDR, does not reach further into that territory than the BDR itself authorized.

## Scope Exclusions

This Policy does **not** define:

- A specific similarity algorithm, string-distance metric, numeric confidence threshold, or signal-weighting/ranking scheme (see Technical Boundary, above).
- What fields, format, or content constitute distinguishing information (item 5 conflicts), or how it is captured, validated, or stored — the *requirement* that it be provided is now settled (ACCEPT, mandatory, above); its content and mechanism are not.
- Whether, or how, a future genuinely semantic-matching capability (beyond normalization-level similarity) might one day be authorized — explicitly out of scope, not precluded, not authorized.
- Exact UI copy, layout, or interaction flow for the confirmation moment, beyond the minimum shape stated above.
- Any resolution of `BDR-0013`'s items already fully resolved by the BDR itself (items 2, 6, 7, 8, 9) — this Policy does not revisit, narrow, or expand any of them.
- Any database schema, Firestore structure, or technical representation of a candidate, a confirmed relationship, or a conflict.

## Governance Notes

- This record does not modify `BDR-0013`, the Discovery Report, `POL-0001`–`POL-0006`, `BDR-0012`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record does not resolve `BDR-0013`'s already-fully-resolved items.
- This record does not broaden, amend, or rely on `POL-0003` as authority; `POL-0003`'s own approved scope is unaffected.
- The owner-initiated declaration rule (Business Requirement 3, above) reflects an explicit Product Architect decision, not an inference from `BDR-0013`'s text — it is strictly bounded to the supplier stock-entry workflow and does not extend to Product Catalog Editing or any other surface.
- The mandatory-distinguishing-information rule (Conflicting Supplier Wording, above) reflects an explicit Product Architect decision (Decision A), not an inference from `BDR-0013`'s text. It resolves only the business requirement that the information be provided before a new product can be created in this specific conflict case; it does not define what the information consists of or how it is technically captured, validated, or stored.
