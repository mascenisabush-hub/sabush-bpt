# Supplier-Wording Recognition, Confirmation & Conflict — Implementation Authorization

**Type:** Governance bridge document (Stage 8, per
`platform-engineering-governance-standard.md` §2) — the formal record
that engineering governance is complete and implementation is
authorized to begin.
**Status:** ✅ **Authorized.** Signed by the Product Architect — see
"Signature," below. Implementation of the Supplier-Wording Recognition,
Confirmation & Conflict capability, exactly as scoped by §2, is
authorized to begin.
**Basis:** [`BDR-0013`](../specs/BDR-0013-product-identity-alternative-name-memory.md)
(Approved, all nine §5 items ACCEPT), [`POL-0007`](../specs/POL-0007-supplier-wording-recognition-confirmation-conflict-policy.md)
(Approved), [Specification](../specs/product-identity-alternative-name-specification.md)
(✅ Accepted, 2026-08-19), [Terminology Amendment](../specs/product-identity-alternative-name-terminology-amendment.md)
(✅ Accepted), [Rule 8
Assessment](./product-identity-alternative-name-rule8-assessment.md)
(✅ Assessed — READY).
**Repository state at this revision:** local `main` HEAD `e354a1b`
(Terminology Amendment acceptance) — one commit ahead of
`origin/main` (`01d3522`); this document and the Terminology Amendment
exist locally, not yet pushed.
**Nothing has been modified in `src/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `BDR-0013`, or `POL-0007` to produce this
document.**

---

## 1. Governance Completeness — What This Record Confirms

**Business Decision → Policy → Specification → Amendment → Rule 8 →
Authorization (this document) → Implementation → Close-out**

| Stage | Document | Status |
|---|---|---|
| Business Decision | `BDR-0013` | ✅ Approved (all nine §5 items ACCEPT) |
| Policy | `POL-0007` | ✅ Approved |
| Specification | `product-identity-alternative-name-specification.md` | ✅ Accepted (2026-08-19) |
| Specification Amendment | Terminology Amendment (§3 step 1 / §3a) | ✅ Accepted |
| Rule 8 | `product-identity-alternative-name-rule8-assessment.md` | ✅ Assessed — READY |
| **Authorization** | **This document** | ✅ **Authorized** — signed 2026-08-19 |
| Implementation | — | Not begun |
| Close-out | — | Not begun |

## 2. What Is Authorized

Exactly the scope the Rule 8 Assessment defined as READY — no broader.
Implementation of the Supplier-Wording Recognition, Confirmation &
Conflict capability, following these Rule 8-resolved technical
decisions as the binding implementation basis:

- **Data model (Finding 1):** an inline array of supplier-wording
  relationships on `Product` — no dedicated subcollection, no change to
  `deleteProductPlan.ts`.
- **Supplier identity (Finding 2):** every relationship keyed to
  `SupplierRecord.id`.
- **Tenant isolation (Finding 3):** no new `firestore.rules` block —
  the array model inherits `Product`'s existing isolation.
- **Candidate detection (Finding 4):** the existing `normalize()`
  function (`businessCategories.ts`) as the starting normalization
  mechanism, normalization-level similarity only — never semantic/AI
  matching.
- **Reuse matching (Finding 5):** byte-exact matching (whitespace-trimmed
  only), deliberately stricter than candidate detection, per the
  Specification's own §6 allowance.
- **Multiple candidates (Finding 6):** the existing three-option pattern
  (Confirm / Choose a different product / Create new) from
  `04-smart-stock-entry-amendment.md`, extended to multiple candidates.
- **Surface scope (Findings 8, 10, corrected by the Terminology
  Amendment):** candidate detection, confirmation, and owner-initiated
  declaration are built **exclusively into Add Stock and Smart Stock
  Entry**. **Initial Stock receives zero changes of any kind** — no new
  field, no new UI, no supplier concept introduced there. Initial
  Stock's participation in this capability is satisfied entirely by its
  existing, unchanged role in establishing `Product.name`.
- **Conflict handling (Finding 9):** distinguishing information enforced
  as an ordinary required-field creation-gate; specific field shape left
  to implementation-time engineering judgment.
- **Concurrency (Finding 13 — MAJOR, resolved):** relationship
  establishment wrapped in a Firestore transaction, mirroring the
  existing open-batch lock-document pattern (`AppContext.tsx` line
  1684).
- **Performance/indexing (Finding 15):** no new Firestore index; reuse
  of the existing in-memory candidate set already loaded for the
  pre-existing exact-match check.
- **API/server/client boundary (Finding 18):** a shared, pure matching
  function callable from both Add Stock (client) and Smart Stock Entry
  (server), mirroring `matchProductByExactName`'s existing shape.
- **Observability (Finding 19):** a confirmation timestamp is required;
  provenance and actor identity are optional, implementation-time
  discretion.
- **Draft/finalization lifecycle (Finding 12):** pending relationships
  live in existing draft/component state; nothing is written to
  `Product` until the entry's own existing finalization step.
- **Testing (Finding 20):** the full scenario boundary enumerated there
  (first encounter, candidate proposal, confirmation, NO/new-product
  path, repeated wording, multiple candidates, conflict + distinguishing
  information, owner-initiated declaration, both surfaces, draft
  abandonment, finalization, concurrent confirmation, cross-tenant
  isolation, failure/retry, the two additional failure modes Finding 14
  surfaced) must be covered before this capability is considered
  Closed.

This authorization covers new work in: `apps/tenant/src/types.ts`
(`Product`, new optional array field), `apps/tenant/src/components/AddStockView.tsx`,
`server/smartStockEntry.ts`, a new shared pure matching function (new
file, location left to the Implementation Plan), and their corresponding
test files. **No file inside `apps/tenant/src/components/InitialStockCountView.tsx`
or any Initial Stock code path is authorized to change.**

## 3. What Is Not Authorized

- **`BDR-0013` item 9 (historical duplicates)** — explicitly out of
  scope for this Specification (§12) and this Authorization. No
  migration, backfill, or historical-duplicate scanning of any kind.
- **Any semantic/AI-based candidate matching** — Finding 4 and
  `POL-0007`'s own Candidate Grounds fix normalization-level similarity
  only; building anything beyond that is not authorized.
- **Any Initial Stock UI change, field, or supplier concept** — Finding
  10 and the Terminology Amendment together fix this as zero-change;
  discovering mid-implementation that Initial Stock "needs" a change
  returns to Product Architecture, not to engineering judgment (§4,
  below).
- **A dedicated subcollection for supplier-wording relationships** — the
  array-on-`Product` model (Finding 1) is the authorized structure. A
  future, evidenced scale concern is the only stated path to revisiting
  this, and even then requires its own separate authorization.
- **Product Catalog Editing integration** — `BDR-0013` item 8 excludes
  it from this general capability; only the item 9 exception applies,
  and item 9 is itself out of scope (above).

## 4. Scope Discipline

Implementation must remain inside the boundary drawn by §2/§3, above,
and by the Rule 8 Assessment's own findings. If, during implementation,
engineering discovers that the approved scope is insufficient,
ambiguous, or requires a business-facing tradeoff not already settled by
`BDR-0013`, `POL-0007`, the Specification, the Terminology Amendment, or
the Rule 8 Assessment — **that finding returns to Product Architecture,
not to engineering judgment.** Any scope change, however small it
appears from an engineering perspective, requires a new or amended
governance record before implementation proceeds on the changed basis.

## 5. Signature

**Signed.** Product Architect decision, recorded verbatim:

> "I, SABUSHIMIKE Masceni, as Product Architect, have reviewed the
> amended Specification, the completed Rule 8 Assessment, and the
> Implementation Authorization. I ACCEPT and SIGN the Implementation
> Authorization. I confirm that the governance process for this
> capability is complete and I formally authorize engineering
> implementation strictly within the scope, constraints, acceptance
> criteria, and technical decisions recorded in the Implementation
> Authorization. Engineering may now proceed. Do not expand the
> authorized scope or introduce decisions outside the recorded
> Specification, Rule 8 Assessment, and Implementation Authorization
> without returning through the appropriate governance gate."

**Date:** August 19, 2026.

**Authorization scope, as explicitly stated at signature:** applies
only to the implementation scope defined in §2 of this document, itself
bound to the Rule 8 Assessment's findings and the amended Specification
(Terminology Amendment, ✅ Accepted). Implementation shall remain
strictly within the approved boundaries in §2/§3, above. No additional
functionality, architectural redesign, feature expansion, `BDR-0013`
item 9 work, semantic/AI matching, or Initial Stock change is
authorized.

**Governance requirements attached to this authorization, in effect for
the duration of implementation:**
- Any newly discovered architectural ambiguity shall be reported
  immediately, not resolved silently.
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
  change any `src/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, or `docs/specs/*` file. None were touched to
  produce it.
- This record does not modify `BDR-0013`, `POL-0007`, the Specification,
  the Terminology Amendment, or the Rule 8 Assessment — it sits
  downstream of all of them, authorizing based on their settled content,
  not amending it.
- This record does not pre-authorize `BDR-0013` item 9 or any future
  phase of this capability's own possible extensions.

**Lifecycle:** Designed → Proposed → **Authorized (signed)**. Stage 9
(Incremental Implementation) may now begin, strictly within the
boundaries this document records.
