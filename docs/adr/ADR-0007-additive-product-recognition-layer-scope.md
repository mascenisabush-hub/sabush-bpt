# ADR-0007 — Additive Product Recognition Layer Scope

**Status:** Approved (scope decision only — not implementation
authorization).
**Type:** Architecture Decision Record.
**Basis:** Product Architect Decision, this session — resolving the
single open question the read-only additive-recognition investigation
left unresolved (Section 9 / Section 13 item 1 there), following
review of the accompanying Product Architect Decision Brief.
**Decision authority:** Product Architect — SABUSHIMIKE MASCENI.
**Date:** 2026-08-27.
**Source documents:** read-only investigation at repository HEAD
`2965310e0fa21c61d43cfad71c494294f790465d`
(`additive-product-recognition-investigation.md`) and
`product-architect-decision-brief-recognition-layer-scope.md`.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `BDR-0013`, or `POL-0007` to produce this
document.**

---

## 1. Decision

**Option D is approved: the new unit-spelling normalization capability
shall operate in both existing recognition surfaces, kept as two
separate additions, architecturally and conceptually distinct.**

1. **Supplier-Wording Recognition** (`supplierWordingMatching.ts`,
   `supplierWordingRecognition.ts`)
   - Remains governed by the existing BDR-0013 / POL-0007 framework.
   - Remains supplier-scoped.
   - Normalized unit matching (e.g. `2L` / `2 Lt` / `2 Ltr`) may
     generate a candidate, alongside the two grounds
     `detectSupplierWordingCandidates` already checks
     (`initial-stock-name`, `existing-alternative-wording`).
   - A confirmed candidate may become an entry in
     `Product.supplierWordings`, exactly as any other confirmed
     candidate does today.
   - The existing Owner confirmation UI and the existing mandatory
     conflict/distinguishing-information gate remain the sole
     authoritative path to confirmation — unchanged.

2. **Catalog-wide Similarity Suggestion** (`productNameSimilarity.ts`)
   - Remains catalog-wide (not supplier-scoped).
   - Remains a suggestion-only mechanism.
   - Never silently resolves a product.
   - Never writes to `Product.supplierWordings`.
   - Remains conceptually separate from learned supplier-wording
     relationships — no shared implementation that would blur this
     boundary is authorized by this decision.

## 2. Rationale

The investigation demonstrated, by hand-tracing the actual
`computeNameSimilarity` algorithm against real examples, that the same
underlying gap — unit-spelling variants (`2L` vs `2 Lt`) tokenizing
differently and falling below existing similarity thresholds — affects
**both** recognition surfaces identically. Nothing about the gap
itself favors closing it in only one surface: a supplier-only fix
would leave catalog-wide suggestions still missing these variants, and
a catalog-only fix would leave supplier candidate detection with the
same gap.

At the same time, the investigation confirmed these two surfaces are
*deliberately* different concepts in the existing codebase — one
governed, learned, and supplier-scoped (`supplierWordingMatching.ts`'s
own header ties it to BDR-0013/POL-0007's governance chain); the other
explicitly ungoverned, catalog-wide, and suggestion-only
(`productNameSimilarity.ts`'s own header states it is "deliberately
NOT wired into `matchProductByExactName` or
`findLatestRememberedProductMemory`"). Option D preserves this existing
distinction rather than collapsing it, at the acknowledged cost of
building and maintaining two separate additions rather than one.

## 3. Non-Negotiable Constraints (binding on any future implementation of this decision)

Carried forward unchanged from the Owner's review of the Decision
Brief. Any BDR, POL, Specification, or implementation that follows
this ADR must preserve every one of these without exception:

- Exact matching remains the authoritative baseline, unchanged.
- `matchProductByExactName` (`server/smartStockEntry.ts`) remains
  untouched.
- Existing client-side exact-match behavior (every
  `.toLowerCase() === .toLowerCase()` call site) remains untouched.
- `findExistingSupplierWordingMatch` remains byte-exact, trim-only —
  it must not receive normalization of any kind. Its strictness is
  deliberate (no Owner review sits on that path) and stays exactly as
  strict as it is today.
- The existing similarity threshold in `findSimilarProducts` remains
  unchanged at `0.5`.
- The enhancement normalizes unit **spelling** only, never quantity.
  `2L` and `2 Lt` may become equivalent candidates; `1L` and `2L` must
  remain distinct. This is the specific property that keeps the
  investigation's own false-match analysis (different products with a
  shared brand/name token) correctly unmatched.
- No automatic/fuzzy resolution is authorized by this decision — every
  new match remains candidate-only.
- New recognition output must use the existing Owner confirmation
  path — no new confirmation UI is authorized.
- Confirmed supplier-wording relationships continue through the
  existing `confirmSupplierWordingRelationship` writer
  (`AppContext.tsx`) exclusively. No parallel persistence mechanism is
  authorized.
- No structured brand/size/packaging extraction is authorized by this
  decision (investigation Section 6). If structured extraction is
  considered later, that requires its own, separate Product Architect
  decision — this ADR does not pre-authorize it, and does not
  pre-authorize using such extraction as a positive matching signal
  even then (veto-only, per the investigation's own risk analysis, is
  the only use the investigation found defensible — and even that
  remains undecided pending the separate decision this section
  requires).
- Existing `Product.id` values and product identity remain unchanged.
  No renaming, re-keying, or merging of existing Products is
  authorized.

## 4. Explicitly Not Authorized By This ADR

This ADR settles scope only. It does **not** authorize:

- BDR drafting or amendment
- POL drafting or amendment
- Specification creation or amendment
- Rule 8 Assessment
- Implementation Planning / Implementation Authorization
- Any change to `src/`, `server/`, `firestore.rules`, or
  `firestore.indexes.json`
- Any test changes
- Any commit or push

## 5. Governance Sequence (unchanged, restated for this decision)

This ADR (scope) → BDR amendment or new BDR (business decision,
likely amending BDR-0013 given Option D extends its governed surface)
→ POL amendment or new POL (likely amending POL-0007 for the same
reason) → Specification → Rule 8 Assessment → Implementation
Authorization → Implementation → Close-out. Each stage requires its
own explicit Product Architect sign-off before the next begins, per
this repository's established governance process. This ADR authorizes
only the first stage: **which surfaces the future capability may
touch, and under what constraints.**

## 6. Open Items This ADR Does Not Resolve

Per the source Decision Brief's own Section 3, deferred to whichever
BDR/POL/Specification work follows:

- The exact unit-token equivalence table contents (`L`/`Lt`/`Ltr`/
  `Liter`/`Litro`, `KG`/`Kilo`/`Quilo`, and any further OCR/unit
  variants) — a real-world business-language decision, not resolved
  by this ADR.
- Whether the reserved server-side `'uncertain'` tier in
  `ProductMatchStatus` (`server/smartStockEntry.ts`) is populated as
  part of realizing this decision, or deferred further.
- The precise mechanism by which `productNameSimilarity.ts` receives
  the new normalization (a new parameter, a separate pre-processing
  function, or another shape) — an implementation-specification
  concern, not an architecture concern this ADR resolves.

---

## Addendum — Governance Route, Conformance Gap Handling & Policy Numbering

**Type:** Addendum recording three Product Architect rulings, following
the read-only governance-route investigation and the accompanying
"Recognition Policy Amendments" Decision Brief. Not a Business
Decision Record, not a Policy, not a Specification, not an
implementation authorization. Does not reopen, reverse, or reinterpret
Sections 1–6 above.
**Approved by:** SABUSHIMIKE MASCENI, Product Architect.
**Date:** 27 August 2026.
**Source documents:** the governance-route investigation (established
that Supplier-Wording Recognition traces to `BDR-0013`/`POL-0007` and
catalog-wide duplicate-product suggestion traces to `BDR-0012`/
`POL-0003`, per `POL-0007`'s own "Relationship to `POL-0003`" section)
and the "Recognition Policy Amendments" Product Architect Decision
Brief built from it.

### Ruling 1 — Governance Route: APPROVED, YES

ADR-0007's approved scope (§1, above) proceeds through **two separate
Policy amendments**, not a BDR amendment and not a new BDR:

1. A `POL-0007` amendment, covering the Supplier-Wording Recognition
   half — remains supplier-scoped, remains governed by `BDR-0013`/
   `POL-0007`.
2. A `POL-0003` amendment, covering the catalog-wide Similarity
   Suggestion / duplicate-product half — remains catalog-wide, remains
   suggestion-only, remains separate from supplier-wording memory.

Explicitly recorded: `BDR-0012` is not reopened. `BDR-0013` is not
reopened. No new BDR is created. The two Policy amendments remain
separate governance artifacts — this ruling is itself an application
of §1's own "kept as two separate additions," carried through to the
governance-artifact level, not merely the technical one.

### Ruling 2 — Existing POL-0003 Conformance Gap: APPROVED, Option B

The pre-existing gap the governance-route investigation surfaced
(`productNameSimilarity.ts`'s confirmation UI not clearly offering
POL-0003's own stated "same product" / "different product" two-option
minimum shape) is **recorded separately for later governance/
remediation** — not folded into the POL-0003 amendment this addendum
authorizes routing toward.

Explicitly recorded: this ruling does not incorporate the conformance
issue into the normalization amendment; does not silently change
POL-0003's wording; does not authorize any UI change; and is not to be
read as acceptance that the current UI is permanently compliant. It
remains open, tracked separately, pending its own future decision.
Basis: scope discipline — ADR-0007 concerns additive unit-spelling
normalization; the conformance gap predates ADR-0007 and is a
materially separate matter.

### Ruling 3 — Policy Amendment Numbering: APPROVED, Option A (corrected)

Assigned identifiers:

- **`POL-0011`** → the `POL-0007` amendment (Ruling 1, item 1).
- **`POL-0012`** → the `POL-0003` amendment (Ruling 1, item 2).

**Correction from the Decision Brief's original proposal:** the brief
initially proposed `POL-0010`/`POL-0011`. Before recording, `POL-0010`
was confirmed — by direct inspection, not inference — to already be
assigned, on `main` (commit `c5bfa46`, clean tree), to "Business Worth
Evolution & Measurement Model Policy"
(`docs/specs/POL-pending-business-worth-evolution-policy.md`), a real,
substantially-developed, already-numbered policy with its own
Specification and accepted amendments. That document's own text
states `POL-0011` was the next available slot at that time, not
`POL-0010`. Assigning `POL-0010` here would have collided with an
existing, unrelated, already-approved Policy. **This addendum
therefore assigns `POL-0011` and `POL-0012` — not `POL-0010`/
`POL-0011` — as the corrected, verified-collision-free numbers.** This
correction was itself a Product Architect decision, not an inference
made unilaterally on the Product Architect's behalf — the numbering
conflict was identified and reported before any number was recorded,
and the corrected numbers were then explicitly confirmed.

These identifiers must not be renumbered merely because other Policies
subsequently appear, per the Numbering Ledger's own "no renumbering
above `POL-0008` without an explicit Product Architect decision" rule
(`19-governance-bdr-policy-framework.md`).

### What This Addendum Authorizes

Exactly the governance route and the two numbering assignments above.
Nothing else.

### What This Addendum Does Not Authorize

- Drafting `POL-0011` or `POL-0012`.
- Any modification to `POL-0003` or `POL-0007`.
- Any BDR creation or modification.
- Any Specification, Rule 8 Assessment, or Implementation Authorization.
- Any change to `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, or any test file.
- Any resolution of the POL-0003 conformance gap (Ruling 2) — it
  remains open, tracked separately.
- Any commit or push arising from this addendum's own recording.

### Governance Notes

- This addendum does not modify Sections 1–6 above, or any other
  existing artifact — `BDR-0012`, `BDR-0013`, `POL-0003`, and
  `POL-0007` are all confirmed unmodified.
- The `POL-0010` numbering conflict this addendum documents was
  discovered during the governance-route investigation's numbering
  check and confirmed again immediately before this addendum was
  written — both checks independently found the same conflict.
- This addendum's own numbering assignments (`POL-0011`, `POL-0012`)
  are recorded here for the first time; the Numbering Ledger in
  `19-governance-bdr-policy-framework.md` itself is not modified by
  this addendum — updating that Ledger's table remains a follow-on
  documentation step, not performed here, mirroring the same deferral
  `POL-0010`'s own Governance Notes recorded for its own number.

**Lifecycle:** Designed → **Approved** (addendum recording three
Product Architect rulings). Not Drafted (either Policy amendment), not
Specified, not Implemented.

---

## Addendum 2 — Specification Readiness & Drafting Route (POL-0011 / POL-0012)

**Type:** Addendum recording three Product Architect rulings, following
the read-only Specification-readiness investigation and the
accompanying "Specification Readiness / Drafting Decision Brief" built
from it. Not a Business Decision Record, not a Policy, not a
Specification, not an implementation authorization. Does not reopen,
reverse, or reinterpret Sections 1–6 above or Addendum 1.
**Approved by:** SABUSHIMIKE MASCENI, Product Architect.
**Date:** 27 August 2026.
**Source documents:** the Specification-readiness investigation
(established that `product-identity-alternative-name-specification.md`
already exists and covers `POL-0007`'s capability, Accepted 2026-08-19,
while no Specification exists anywhere in this repository for
`POL-0003`'s capability — confirmed by two other accepted
Specifications, `product-unit-of-measure-specification.md` §12 and
`product-memory-purchase-selling-valuation-specification.md`'s own
"Explicitly Out of Scope" section, each explicitly naming `POL-0003`'s
similarity mechanism as outside their own scope) and the "Specification
Readiness / Drafting Decision Brief" built from it.

### Ruling 1 — Specification Routing: APPROVED, YES

- `POL-0011` → a **targeted Specification Amendment** to the
  already-accepted `product-identity-alternative-name-specification.md`
  — adding the newly-approved third candidate-detection ground
  (unit-spelling equivalence, per `POL-0011`) to that Specification's
  §3 step 2, which already enumerates its two existing grounds by
  name. The accepted Specification itself is not edited in place.
- `POL-0012` → a **new, foundational Specification** for the
  catalog-wide Similarity Suggestion capability governed by `POL-0003`
  — since no Specification for that capability has ever existed, this
  is not an amendment to anything; it must cover `POL-0003`'s original
  two signals together with `POL-0012`'s new third signal.

No BDR is reopened or created by this ruling.

### Ruling 2 — Deferred POL-0003 Conformance Issue: APPROVED, YES

The pre-existing `POL-0003` confirmation-experience/conformance
question (identified during the earlier governance-route investigation;
recorded as open in Addendum 1, Ruling 2, Option B) remains, in the new
foundational Specification authorized by Ruling 1 above:

- explicitly open;
- explicitly outside that Specification's own scope;
- separately routed for its own future governance/remediation.

That Specification must not require a UI change, declare the existing
UI compliant, reinterpret `POL-0003`'s own wording, or resolve Option
A, B, or C from the Decision Brief that first framed those options
(Addendum 1's own predecessor brief). Any screen/interaction section
the new Specification includes must describe only the governance
boundary and cross-reference this unresolved matter — mirroring
exactly how `product-identity-alternative-name-specification.md` §12
already handles `BDR-0013` item 9 (historical duplicates): named,
explicitly excluded, not resolved by inference or by the Specification's
own existence.

### Ruling 3 — Acceptance Gates: APPROVED, YES

The two Specification artifacts authorized by Ruling 1 must each carry
their own, independently-dated "Product Architect Acceptance" section
— the established convention this repository already uses for every
Specification-type document (`product-identity-alternative-name-specification.md`,
Accepted 2026-08-19; `product-unit-of-measure-specification.md`,
Accepted 2026-08-18; `product-unit-of-measure-reconciliation-amendment.md`,
Accepted 2026-08-18 — three closely related, cross-referencing
documents, each accepted separately, none sharing another's acceptance
statement). One Specification's acceptance must never be interpreted
as acceptance of the other, matching this same precedent and
`ADR-0007`'s own foundational instruction to keep the two recognition
surfaces genuinely separate all the way through the governance chain,
not merely at the Policy layer.

### What This Addendum Authorizes

Drafting exactly two Specification artifacts, scoped exactly as Ruling
1 describes, each subject to Ruling 2's exclusion and Ruling 3's
separate-acceptance requirement. Nothing else.

### What This Addendum Does Not Authorize

- Either Specification being treated as accepted — drafting is
  authorized; acceptance is a separate, subsequent, independently-dated
  act for each document.
- Any resolution of the deferred `POL-0003` conformance question.
- Any Rule 8 Assessment or Implementation Authorization.
- Any change to `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, or any test file.
- Any commit or push.

### Governance Notes

- This addendum does not modify Sections 1–6 above or Addendum 1 —
  `BDR-0012`, `BDR-0013`, `POL-0003`, `POL-0007`, `POL-0011`, and
  `POL-0012` are all confirmed unmodified by this addendum itself.
- This addendum does not modify
  `product-identity-alternative-name-specification.md`,
  `product-unit-of-measure-specification.md`, or
  `product-unit-of-measure-reconciliation-amendment.md`.
- Drafting authorized by this addendum follows immediately, in the
  same session, as its own separately-tracked step — each resulting
  Specification's own "Product Architect Acceptance" section, once
  added, is the actual acceptance act for that document, not this
  addendum.

**Lifecycle:** Designed → **Approved** (addendum recording three
Product Architect rulings). Drafting of both Specification artifacts
authorized; neither is itself Accepted, Specified further, or
Implemented by this addendum.
