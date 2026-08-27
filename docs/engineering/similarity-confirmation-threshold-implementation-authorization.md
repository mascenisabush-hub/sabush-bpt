# Catalog-Wide Similarity Suggestion — Unit-Spelling Normalization — Implementation Authorization

**Type:** Governance bridge document (Stage 8, per
`platform-engineering-governance-standard.md` §2) — the formal record
that engineering governance is complete and implementation is
authorized to begin.
**Status:** ✅ **Authorized.** Signed by the Product Architect — see
"Signature," below. Implementation of unit-spelling equivalence as a
third candidate signal within the catalog-wide Similarity Suggestion
capability, exactly as scoped by §2, is authorized to begin.
**Basis:** [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
(Approved) and both its Addenda (Approved), [`BDR-0012`](../specs/BDR-0012-product-unit-of-measure-product-memory.md)
(Approved, Decisions 10–11), [`POL-0003`](../specs/POL-0003-similarity-confirmation-threshold.md)
(Approved), [`POL-0012`](../specs/POL-0012-similarity-confirmation-threshold-unit-normalization-amendment.md)
(Approved), [`similarity-confirmation-threshold-specification.md`](../specs/similarity-confirmation-threshold-specification.md)
(✅ Accepted, 2026-08-27), [Rule 8 Assessment B](./similarity-confirmation-threshold-rule8-assessment.md)
(✅ Assessed — READY, within its own scope).
**Repository state at this revision:** `HEAD = 448623e`, working tree
carries only this document and its sibling Authorization A as
untracked additions at drafting time — confirmed via `git status`
immediately before drafting.
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `ADR-0007`, `BDR-0012`,
`POL-0003`, `POL-0012`, or the accepted Specification to produce this
document.**

---

## 1. Governance Completeness — What This Record Confirms

**Architecture Decision → Policy Amendment → Foundational Specification
→ Rule 8 → Authorization (this document, pending) → Implementation →
Close-out**

| Stage | Document | Status |
|---|---|---|
| Architecture Decision | `ADR-0007` + Addenda 1–2 | ✅ Approved |
| Business Decision (pre-existing) | `BDR-0012` | ✅ Approved |
| Policy Amendment | `POL-0012` | ✅ Approved |
| Foundational Specification | `similarity-confirmation-threshold-specification.md` | ✅ Accepted (2026-08-27) |
| Rule 8 | `similarity-confirmation-threshold-rule8-assessment.md` | ✅ Assessed — READY (within scope) |
| **Authorization** | **This document** | ✅ **Authorized** — signed 2026-08-27 |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

## 2. What Is Authorized (Upon Signature — Not Yet)

Exactly the scope Rule 8 Assessment B defined as READY — no broader.
Implementation of unit-spelling equivalence as a third candidate signal
within the existing catalog-wide Similarity Suggestion mechanism,
following these Rule 8-resolved technical decisions as the binding
implementation basis:

- **Signal insertion (Finding B3):** a token-canonicalization step
  composed with the existing `tokenize` function
  (`apps/tenant/src/lib/productNameSimilarity.ts`) — not a rewrite of
  `computeNameSimilarity`'s own Jaccard set-comparison logic. The
  existing, already-tested core algorithm is preserved unchanged; the
  new signal is additive.
- **Quantity-preservation mechanism (mirroring Rule 8 Assessment A's
  identical Finding A2):** the canonicalization must operate at the
  **token level**, after the existing `tokenize` function has already
  separated a name into individual word tokens — never merging or
  equating the leading numeric quantity token across different values.
  `"1L"` and `"2L"` must remain structurally incapable of becoming
  equivalent under this signal.
- **Equivalence table (Rule-8-deferred, resolved at implementation
  time, same discipline as Authorization A):** the exact
  spelling-to-canonical-unit mapping is an implementation-time
  decision. It is **not** additional product scope. If a genuinely
  identical table to Authorization A's own is used, it may be shared
  as a **constant/data value only** — the comparison logic consuming
  it must remain a separate call site in this file, never a shared
  function imported from or shared with `supplierWordingMatching.ts`
  (Rule 8 Assessment B Finding B5).
- **Candidate/suggestion-only boundary (Finding B4 — already a
  structural fact, not merely a rule to follow):** this capability has
  no persistence writer today. The new signal must not introduce one.
  A selected suggestion continues to only rewrite the local row's
  product-name field, exactly as `handleSelectProductForTool` already
  does — never a direct Firestore write of any kind.
- **No new UI, no confirmation-experience change (§5 of Rule 8
  Assessment B, binding on this authorization):** the existing
  suggestion banner is reused exactly as it exists today. See the
  dedicated boundary section below — this is the single most important
  constraint in this entire authorization.

### Permitted Files/Surfaces

- `apps/tenant/src/lib/productNameSimilarity.ts` — the primary
  authorized change (new signal, new token-canonicalization helper —
  inline in this file, or as a small new co-located file/constant;
  implementation-time discretion).
- `tests/product-name-similarity.test.ts` — extended with new cases
  (see §"Testing Requirements," below).

### Explicitly NOT Requiring Change (Confirmed by Rule 8, Not Assumed)

- `apps/tenant/src/components/AddStockView.tsx` — the suggestion
  banner (`similarProducts` computation and rendering,
  `handleSelectProductForTool`) requires **no** change. The new signal
  operates entirely inside `findSimilarProducts`'s own scoring; the
  UI that consumes its output is unaffected. **This file's
  confirmation-experience code in particular is explicitly prohibited
  from being touched — see §3 and the dedicated boundary section,
  below.**
- `apps/tenant/src/lib/supplierWordingMatching.ts`,
  `supplierWordingRecognition.ts`, `AppContext.tsx`'s
  `confirmSupplierWordingRelationship` — no relationship to this
  authorization's scope; governed entirely separately, by
  Authorization A.
- `server/smartStockEntry.ts` — no relationship to this authorization's
  scope; `matchProductByExactName` is explicitly prohibited from
  changing (§3, below).

## 3. What Is Not Authorized

- **Any change to exact matching or `matchProductByExactName`.**
- **Any change to `findExistingSupplierWordingMatch`** — unrelated to
  this capability entirely; not touched.
- **Any change to the existing `0.5` similarity threshold** — `ADR-0007`
  §3's own non-negotiable constraint; the approved solution is
  normalization of the comparison inputs, never a threshold reduction.
- **Automatic product resolution, automatic attachment, or automatic
  merging of any kind** — every match remains suggestion-only.
- **Product renaming, re-keying, merging, or any change to
  `Product.id`.**
- **Structured attribute extraction or any new Product schema field**
  — the new signal compares unit spelling within an already-typed
  name; it parses or stores nothing structured.
- **Writing to `Product.supplierWordings`, or any new persistence
  writer of any kind** — this capability remains suggestion-only,
  structurally, per Finding B4; this authorization does not change
  that.
- **Any change to Supplier-Wording Recognition's own memory behavior**
  — governed entirely separately, by Authorization A.
- **Any change to the confirmation UI** — see the dedicated boundary
  section, immediately below.
- **Resolving the deferred `POL-0003` confirmation-experience
  conformance question, in either direction** — see the dedicated
  boundary section, immediately below.

## 4. POL-0003 Confirmation-Experience Conformance — OPEN / OUT OF SCOPE

**This section is binding on implementation, not merely informative.**

The pre-existing question of whether the current suggestion banner's
interaction (select a suggestion, or take no action — no explicit
"different product" button) fully satisfies `POL-0003`'s own stated
minimum shape remains **OPEN / OUT OF SCOPE**, per `ADR-0007` Addendum
1 Ruling 2, reaffirmed in Addendum 2 Ruling 2, carried unchanged
through the Specification's own §6 and Rule 8 Assessment B's own §5.
**This authorization does not resolve it, and does not authorize
implementation to resolve it either, in any direction.**

Implementation under this authorization must **not**:
- add an explicit "different product" action as part of this work;
- remove or otherwise change the existing confirmation interaction in
  any way;
- reinterpret `POL-0003`'s own wording;
- declare, assert, or imply that the existing UI is compliant with
  `POL-0003`'s stated minimum shape;
- treat this implementation as an opportunity, occasion, or excuse to
  settle the previously deferred governance question.

**If implementation work discovers a genuine technical dependency that
makes the approved unit-spelling normalization impossible without
touching the confirmation UI, engineering must STOP and report that
conflict to the Product Architect — not resolve it autonomously.**
Based on Rule 8 Assessment B's own analysis (Finding B3, B4), no such
dependency is anticipated: the new signal operates entirely inside the
scoring function, upstream of and independent from whatever UI
eventually consumes its output. But if this expectation proves wrong
during actual implementation, that is a scope-return trigger, per §5,
below — never a reason to make the deferred decision by default.

## 5. Testing Requirements

At minimum, before this capability is considered Closed:

- **Positive normalization:** representative unit-spelling pairs
  equivalent under the approved vocabulary produce a higher similarity
  score / a candidate suggestion.
- **Quantity protection:** `"...1L"` vs `"...2L"` name pairs must not
  become more similar under the new signal than they already are today
  — the new signal must never fold the quantity token.
- **False-match protection:** `"Coke 500ml"` vs `"Coke Zero 500ml"`,
  `"Arroz Tio Joao 25KG"` vs `"Arroz Tio Joao 10KG"` — confirm the new
  signal does not cause a distinguishing token elsewhere in either name
  to be treated as less significant than it already is today.
- **Existing-behavior regression:** exact matching continues to work
  unchanged; the existing `0.5` threshold's behavior is unchanged for
  every case not specifically affected by the new signal; the existing
  two signals (name similarity, barcode/SKU — noting barcode/SKU
  remains unimplemented per Rule 8 Assessment B Finding B2,
  independent of this work) are unaffected.
- **Boundary test:** confirm no write to `Product.supplierWordings`
  occurs under any code path exercised by this capability, and confirm
  `confirmSupplierWordingRelationship` is never called from
  `productNameSimilarity.ts` or its consuming UI code.
- **Confirmation-UI non-regression:** confirm the suggestion banner's
  existing interaction (select-or-ignore) is byte-for-byte unchanged
  in behavior after this work — the explicit test that the deferred
  conformance question was genuinely not touched.

Do not invent test scenarios requiring functionality outside this
authorization's own scope (e.g. an explicit "different product"
button, barcode/SKU matching, or any Supplier-Wording Recognition
behavior — none of which this authorization touches).

## 6. Scope Discipline

Implementation must remain inside the boundary drawn by §2/§3/§4,
above, and by Rule 8 Assessment B's own findings. If, during
implementation, engineering discovers that the approved scope is
insufficient, ambiguous, or requires a business-facing tradeoff not
already settled by `ADR-0007`, `BDR-0012`, `POL-0003`, `POL-0012`, the
accepted Specification, or Rule 8 Assessment B — **that finding returns
to Product Architecture, not to engineering judgment.** This applies
with particular force to §4's boundary: any perceived need to touch
the confirmation UI is, by definition, a scope question requiring
Product Architect input, never an engineering judgment call.

## 7. Independence From Authorization A

This authorization is entirely independent of the sibling
Implementation Authorization for `POL-0011`
(`product-identity-alternative-name-specification-unit-spelling-implementation-authorization.md`).
Signing this authorization does not signify, imply, or require signing
the other; each may be signed, deferred, or rejected on its own timing,
per `ADR-0007` Addendum 2's requirement that the two surfaces remain
separate through every governance stage, including this one.

## 8. Signature

**Signed.** Product Architect decision, recorded verbatim:

> "I, SABUSHIMIKE MASCENI, as Product Architect, have reviewed
> `POL-0012`, the accepted foundational Specification, and this
> Implementation Authorization. I ACCEPT and SIGN this Implementation
> Authorization. I confirm that the governance process for this
> capability — unit-spelling equivalence as a third candidate signal
> within the catalog-wide Similarity Suggestion mechanism — is
> complete, and I formally authorize engineering implementation
> strictly within the scope, constraints, permitted/prohibited files,
> and technical decisions recorded in §2–§5 of this document.
> Engineering may now proceed within
> `apps/tenant/src/lib/productNameSimilarity.ts` and its corresponding
> tests, and nowhere else, unless a new or amended governance record is
> issued first.
>
> **§4's boundary is explicitly reaffirmed at signature: the existing
> `POL-0003` confirmation-experience conformance question remains OPEN
> / OUT OF SCOPE.** This authorization does not resolve it, does not
> authorize any UI change to the existing suggestion banner, and does
> not permit implementation to treat this work as an occasion to settle
> that question in either direction.
>
> If, during implementation, the actual code requires changes outside
> the permitted files and surfaces named in §2 — including, especially,
> any perceived need to touch the confirmation UI — engineering must
> STOP and report the authorization conflict to me directly — never
> expand the authorized scope autonomously, however small or obviously
> necessary the change may appear.
>
> This authorization is independent of Implementation Authorization A
> (Supplier-Wording Recognition). Signing this document neither
> requires nor implies any decision on that sibling authorization."

**Date:** 2026-08-27.

**Authorization scope, as explicitly stated at signature:** applies
only to the implementation scope defined in §2 of this document, itself
bound to Rule 8 Assessment B's findings and the accepted foundational
Specification. Implementation shall remain strictly within the
approved boundaries in §2/§3/§4, above. No additional functionality,
architectural redesign, feature expansion, semantic/AI matching,
threshold change, confirmation-UI change, or change to the
Supplier-Wording Recognition capability is authorized.

**Governance requirements attached to this authorization, in effect for
the duration of implementation:**
- Any newly discovered architectural ambiguity, or any need to touch a
  file outside §2's permitted list — most of all the confirmation
  UI — shall be reported immediately, not resolved silently or
  autonomously.
- Any scope expansion shall return to Product Architect review before
  proceeding.
- No business rule may be changed during implementation.
- No specification, policy, amendment, or Rule 8 Assessment may be
  modified unless separately authorized.
- The deferred `POL-0003` conformance question shall remain exactly as
  open as it is today throughout implementation.

Claude begins changing the runtime files listed in §2 following this
signature.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `src/`, `apps/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, or `docs/specs/*` file. None were touched
  to produce it.
- This record does not modify `ADR-0007`, `BDR-0012`, `POL-0003`,
  `POL-0012`, the accepted Specification, or Rule 8 Assessment B — it
  sits downstream of all of them, authorizing based on their settled
  content, not amending it.
- This record does not resolve, narrow, or in any way touch the
  deferred `POL-0003` confirmation-experience conformance question —
  restated here for the final time in this document's own governance
  chain, given how consequential a silent resolution of that question
  would be if this boundary were ever missed during implementation.
- This record does not pre-authorize any future phase of this
  capability's own possible extensions beyond the exact scope in §2
  (e.g. the still-unimplemented barcode/SKU signal, Finding B2 —
  explicitly a separate, future authorization's subject, not this
  one's).

**Lifecycle:** Designed → Proposed → **Authorized (signed)**. Stage 9
(Incremental Implementation) may now begin, strictly within the
boundaries this document records.
