# Supplier-Wording Recognition — Unit-Spelling Normalization — Implementation Authorization

**Type:** Governance bridge document (Stage 8, per
`platform-engineering-governance-standard.md` §2) — the formal record
that engineering governance is complete and implementation is
authorized to begin.
**Status:** ✅ **Authorized.** Signed by the Product Architect — see
"Signature," below. Implementation of unit-spelling equivalence as a
third candidate ground within Supplier-Wording Recognition, exactly as
scoped by §2, is authorized to begin.
**Basis:** [`ADR-0007`](../adr/ADR-0007-additive-product-recognition-layer-scope.md)
(Approved) and both its Addenda (Approved), [`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(Approved), [`POL-0011`](../specs/POL-0011-supplier-wording-recognition-unit-normalization-amendment.md)
(Approved), [`product-identity-alternative-name-specification.md`](../specs/product-identity-alternative-name-specification.md)
(✅ Accepted, 2026-08-19), [`product-identity-alternative-name-specification-unit-spelling-amendment.md`](../specs/product-identity-alternative-name-specification-unit-spelling-amendment.md)
(✅ Accepted, 2026-08-27), [Rule 8 Assessment A](./product-identity-alternative-name-specification-unit-spelling-rule8-assessment.md)
(✅ Assessed — READY).
**Repository state at this revision:** `HEAD = 448623e`, working tree
carries only this document and its sibling Authorization B as
untracked additions at drafting time — confirmed via `git status`
immediately before drafting.
**Nothing has been modified in `src/`, `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `ADR-0007`, `POL-0007`,
`POL-0011`, or either accepted Specification to produce this
document.**

---

## 1. Governance Completeness — What This Record Confirms

**Architecture Decision → Policy Amendment → Specification Amendment →
Rule 8 → Authorization (this document, pending) → Implementation →
Close-out**

| Stage | Document | Status |
|---|---|---|
| Architecture Decision | `ADR-0007` + Addenda 1–2 | ✅ Approved |
| Policy Amendment | `POL-0011` | ✅ Approved |
| Specification Amendment | `product-identity-alternative-name-specification-unit-spelling-amendment.md` | ✅ Accepted (2026-08-27) |
| Rule 8 | `product-identity-alternative-name-specification-unit-spelling-rule8-assessment.md` | ✅ Assessed — READY |
| **Authorization** | **This document** | ✅ **Authorized** — signed 2026-08-27 |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

## 2. What Is Authorized (Upon Signature — Not Yet)

Exactly the scope Rule 8 Assessment A defined as READY — no broader.
Implementation of unit-spelling equivalence as a third candidate
ground within the existing Supplier-Wording Recognition
candidate-detection path, following these Rule 8-resolved technical
decisions as the binding implementation basis:

- **Ground insertion (Finding A1):** a third branch inside the
  existing `detectSupplierWordingCandidates` loop
  (`apps/tenant/src/lib/supplierWordingMatching.ts`), alongside the
  two existing grounds — not a redesign of that function's structure.
  `SupplierWordingCandidate['grounds']`'s literal-type union gains
  exactly one new member (e.g. `'unit-spelling-equivalence'`).
- **Quantity-preservation mechanism (Finding A2):** the equivalence
  check must operate on a **tokenized, unit-only value**, isolating
  the leading numeric quantity from the trailing unit spelling before
  any equivalence lookup runs — never a comparison against the raw,
  undivided string. This is the specific, binding mechanism required
  to guarantee `"1L"`/`"2L"` remain structurally incapable of
  becoming equivalent, not merely a documentation promise.
- **Equivalence table (Finding A3 — Rule-8-deferred, resolved at
  implementation time):** the exact spelling-to-canonical-unit mapping
  (e.g. `L`/`Lt`/`Ltr`/`Liter`/`Litro` → one canonical form; `KG`/
  `Kilo`/`Quilo` → another) is an implementation-time engineering
  decision, explicitly delegated here by every document in the
  governing chain. It is **not** additional product scope, and it is
  **not** license to build a general-purpose or unrestricted
  transformation — the table must remain a small, fixed, enumerable
  set of unit-spelling equivalences, nothing broader.
- **Reuse-path isolation (Finding A4):** `findExistingSupplierWordingMatch`
  receives no change of any kind. The new ground's normalization logic
  must not be reachable from, imported into, or shared via a common
  helper with that function, except where such a helper is explicitly
  parameterized so each function's own strictness level remains
  independently fixed and unaffected by the other.
- **No new UI (Finding A5):** the existing candidate-confirmation
  banner (`AddStockView.tsx`, `handleConfirmSupplierWordingCandidate`/
  `handleDeclineSupplierWordingCandidates`) already handles any
  candidate generically, regardless of which ground produced it. No
  new confirmation interaction, banner variant, or ground-specific UI
  text is authorized or required.
- **Persistence (unchanged):** a candidate confirmed under the new
  ground is written through the existing `confirmSupplierWordingRelationship`
  (`AppContext.tsx`) exclusively — the sole writer, unchanged, no
  parallel writer of any kind.

### Permitted Files/Surfaces

- `apps/tenant/src/lib/supplierWordingMatching.ts` — the primary
  authorized change (new ground, new normalization helper — inline in
  this file, or as a small new co-located file; either structure is
  implementation-time discretion, not a scope question).
- `apps/tenant/src/types.ts` — only if the `SupplierWordingCandidate['grounds']`
  type (or its equivalent) needs the new literal member added; no
  other type in this file is authorized to change.
- `tests/supplier-wording-matching.test.ts` — extended with new cases
  (see §"Testing Requirements," below), or a new, adjacent test file
  if the implementation introduces a separate normalization module.

### Explicitly NOT Requiring Change (Confirmed by Rule 8, Not Assumed)

- `apps/tenant/src/lib/supplierWordingRecognition.ts` — Rule 8
  Assessment A confirmed this file's decision logic does not inspect
  which ground fired, only whether `candidates.length > 0`; it
  requires no change under the authorized scope.
- `apps/tenant/src/components/AddStockView.tsx` — requires no
  functional or UI change; at most, an unmodified type import
  continues to compile against the extended `grounds` union.
- `server/smartStockEntry.ts` — no relationship to this authorization's
  scope; `matchProductByExactName` is explicitly prohibited from
  changing (§3, below).

## 3. What Is Not Authorized

- **Any change to exact matching or `matchProductByExactName`** —
  `ADR-0007` §3's own non-negotiable constraint; no normalization of
  any kind may enter this path.
- **Any normalization of `findExistingSupplierWordingMatch`** — must
  remain byte-exact, trim-only, silent-reuse-only, exactly as it is
  today.
- **Any change to the existing `0.5` similarity threshold** — that
  threshold belongs to the separate catalog-wide capability
  (`findSimilarProducts`) and is unrelated to this capability's own
  reuse/candidate logic in the first place; not touched, not lowered,
  not referenced as a tuning knob for this work.
- **Automatic/fuzzy silent resolution of any kind** — every match
  under the new ground remains candidate-only.
- **Silent product attachment, automatic supplier-wording persistence,
  or any write bypassing owner confirmation.**
- **Product renaming, re-keying, merging, or any change to
  `Product.id`.**
- **Any new Product identity field.**
- **Structured brand/size/packaging extraction of any kind** — the new
  ground compares unit spelling within an already-typed name; it does
  not parse or store any structured attribute.
- **Any new AI/semantic matching capability** — the new ground is
  normalization-level (a fixed equivalence table), never a
  probabilistic or model-driven judgment.
- **Any new confirmation UI** — the existing confirm/decline banner is
  reused unchanged.
- **Any parallel supplier-wording writer** — `confirmSupplierWordingRelationship`
  remains exclusive.
- **Any change to the catalog-wide Similarity Suggestion capability**
  (`productNameSimilarity.ts`, `findSimilarProducts`) — governed
  entirely separately, by Authorization B. A shared unit-equivalence
  *table* (data) may reasonably be extracted as a constant later, if a
  future, separate authorization decides to do so — this authorization
  does not pre-approve that, and does not authorize any shared
  *comparison logic* between the two capabilities now.

## 4. Testing Requirements

At minimum, before this capability is considered Closed:

- **Positive normalization:** representative unit-spelling pairs
  equivalent under the approved vocabulary (e.g. `"Coca Cola 2L"` ↔
  `"Coca-Cola 2 Lt"`) produce a candidate.
- **Quantity protection:** `"Coca Cola 1L"` vs `"Coca Cola 2L"` — must
  **not** produce a candidate under the new ground; only the two
  existing grounds' own pre-existing behavior (unaffected by this
  work) may apply.
- **False-match protection:** representative genuinely-different
  products sharing a name/brand token must remain distinguished
  post-normalization — e.g. `"Coke 500ml"` vs `"Coke Zero 500ml"`,
  `"Arroz Tio Joao 25KG"` vs `"Arroz Tio Joao 10KG"` — confirming
  normalization does not erase a distinguishing token elsewhere in the
  name.
- **Existing-behavior regression:** exact matching continues to work
  unchanged; `findExistingSupplierWordingMatch`'s strict, byte-exact
  reuse remains strict (a normalized-but-not-byte-exact wording must
  **not** silently reuse an existing relationship); the existing two
  grounds continue to fire exactly as before; candidate confirmation
  UI behavior is unchanged for existing grounds.
- **Boundary test:** confirm the new ground's logic is not reachable
  from, or accidentally shared with, `productNameSimilarity.ts`'s
  catalog-wide comparison — the two remain structurally separate
  capabilities, per §3's own prohibition, above.

Do not invent test scenarios requiring functionality outside this
authorization's own scope (e.g. barcode/SKU matching, semantic
matching, or any catalog-wide behavior — none of which this
authorization touches).

## 5. Scope Discipline

Implementation must remain inside the boundary drawn by §2/§3, above,
and by Rule 8 Assessment A's own findings. If, during implementation,
engineering discovers that the approved scope is insufficient,
ambiguous, or requires a business-facing tradeoff not already settled
by `ADR-0007`, `POL-0007`, `POL-0011`, either accepted Specification,
or Rule 8 Assessment A — **that finding returns to Product
Architecture, not to engineering judgment.** Any scope change, however
small it appears from an engineering perspective, requires a new or
amended governance record before implementation proceeds on the
changed basis.

## 6. Independence From Authorization B

This authorization is entirely independent of the sibling
Implementation Authorization for `POL-0012`
(`similarity-confirmation-threshold-implementation-authorization.md`).
Signing this authorization does not signify, imply, or require signing
the other; each may be signed, deferred, or rejected on its own timing,
per `ADR-0007` Addendum 2's requirement that the two surfaces remain
separate through every governance stage, including this one.

## 7. Signature

**Signed.** Product Architect decision, recorded verbatim:

> "I, SABUSHIMIKE MASCENI, as Product Architect, have reviewed
> `POL-0011`, the accepted Specification Amendment, and this
> Implementation Authorization. I ACCEPT and SIGN this Implementation
> Authorization. I confirm that the governance process for this
> capability — unit-spelling equivalence as a third candidate ground
> within Supplier-Wording Recognition — is complete, and I formally
> authorize engineering implementation strictly within the scope,
> constraints, permitted/prohibited files, and technical decisions
> recorded in §2–§5 of this document. Engineering may now proceed
> within `apps/tenant/src/lib/supplierWordingMatching.ts` and its
> corresponding tests, and nowhere else, unless a new or amended
> governance record is issued first.
>
> If, during implementation, the actual code requires changes outside
> the permitted files and surfaces named in §2, engineering must STOP
> and report the authorization conflict to me directly — never expand
> the authorized scope autonomously, however small or obviously
> necessary the change may appear.
>
> This authorization is independent of Implementation Authorization B
> (catalog-wide Similarity Suggestion). Signing this document neither
> requires nor implies any decision on that sibling authorization."

**Date:** 2026-08-27.

**Authorization scope, as explicitly stated at signature:** applies
only to the implementation scope defined in §2 of this document, itself
bound to Rule 8 Assessment A's findings and the accepted Specification
Amendment. Implementation shall remain strictly within the approved
boundaries in §2/§3, above. No additional functionality, architectural
redesign, feature expansion, semantic/AI matching, threshold change, or
change to the catalog-wide Similarity Suggestion capability is
authorized.

**Governance requirements attached to this authorization, in effect for
the duration of implementation:**
- Any newly discovered architectural ambiguity, or any need to touch a
  file outside §2's permitted list, shall be reported immediately, not
  resolved silently or autonomously.
- Any scope expansion shall return to Product Architect review before
  proceeding.
- No business rule may be changed during implementation.
- No specification, policy, amendment, or Rule 8 Assessment may be
  modified unless separately authorized.

Claude begins changing the runtime files listed in §2 following this
signature.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or
  change any `src/`, `apps/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, or `docs/specs/*` file. None were touched
  to produce it.
- This record does not modify `ADR-0007`, `POL-0007`, `POL-0011`,
  either accepted Specification, or Rule 8 Assessment A — it sits
  downstream of all of them, authorizing based on their settled
  content, not amending it.
- This record does not pre-authorize any future phase of this
  capability's own possible extensions beyond the exact scope in §2.

**Lifecycle:** Designed → Proposed → **Authorized (signed)**. Stage 9
(Incremental Implementation) may now begin, strictly within the
boundaries this document records.
