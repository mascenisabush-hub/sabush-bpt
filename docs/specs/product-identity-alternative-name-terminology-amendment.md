Business Domain Specification — Terminology Amendment

# Supplier-Wording Recognition, Confirmation & Conflict — Initial Stock Terminology Amendment

**Status:** 🟡 Proposed, pending Product Architect acceptance. See "Product
Architect Acceptance," below.
**Amends:** [`product-identity-alternative-name-specification.md`](./product-identity-alternative-name-specification.md)
(✅ Accepted, 2026-08-19) §3 step 1 and §3a only — narrowly, exactly the
wording identified in §1 below. No other section of the Specification is
touched.
**Does not amend:** `BDR-0013`, `POL-0007`, or any part of the
Specification not explicitly named in §1 — see §3 for the complete
preserved-boundary list.
**Origin:** Identified directly by the [Rule 8 Assessment](../engineering/product-identity-alternative-name-rule8-assessment.md)
(✅ Assessed — READY), Finding 10 and §0. Not a new gap — the Rule 8
Assessment found it, declined to fix it (out of its own stage's
authority), and explicitly flagged it as "a candidate for a future
Stage 2 Specification amendment," per
`platform-engineering-governance-standard.md` §2. This amendment is that
follow-up.
**Depends on:** The Rule 8 Assessment's §0 terminology clarification,
itself recorded there as "an explicit Product Architect clarification of
BDR-0013's own already-approved meaning... a clarification, not a new
business decision."

---

## 1. Problem Statement

The accepted Specification's §3 step 1 and §3a each literally list
**Initial Stock** as a surface where a supplier wording is entered, or
where the owner may initiate a supplier-wording declaration. Direct code
evidence (`InitialStockCountView.tsx`: zero supplier references;
`InitialStockDraftItem`/`CountRowItem`: no supplier field of any kind)
confirms this is not what Initial Stock actually is or does — and the
Product Architect's own clarification (Rule 8 Assessment §0) confirms
this was never the intent. Initial Stock establishes a product's
primary/reference identity (`Product.name`, `BDR-0013` item 2); the
supplier-wording recognition capability this Specification governs
operates only where a supplier's own wording is actually encountered —
Add Stock and Smart Stock Entry, which this repository's own governance
lineage already refers to jointly as "supplier stock entry"
(`POL-0007` Business Requirement 3 already uses exactly this term, and
already scopes owner-initiated declaration to it alone — `POL-0007`
itself was never inconsistent; only the Specification's own §3/§3a
wording was).

**Directly superseded wording, quoted exactly:**

1. **Specification §3, step 1 (Trigger):** *"during Initial Stock, Add
   Stock, or Smart Stock Entry (item 8's surface scope), when a supplier
   wording is entered or extracted that does not match an
   already-confirmed relationship for the current supplier."*
2. **Specification §3a (Owner-Initiated Declaration):** *"the owner may,
   while within the Initial Stock, Add Stock, or Smart Stock Entry
   workflow specifically, directly identify that a supplier wording
   refers to a specific existing product without a system-proposed
   candidate first appearing."*

## 2. Why Amendment Is Required

The Rule 8 Assessment's own Finding 10 states the reasoning plainly:
*"the accepted Specification's own §3 step 1... and §3a... both
literally list Initial Stock as a surface where a supplier wording is
entered or where owner-initiated declaration is available — this is
inconsistent with the now-clarified business meaning and should be
corrected via a future Specification amendment."* Leaving this
uncorrected would mean the Specification's own literal text continues
to instruct a future reader (engineering, or a later governance session
with no memory of this clarification) to build supplier-wording
recognition into Initial Stock — a capability `BDR-0013` item 8 never
actually required there, and one Initial Stock's own architecture
(zero supplier concept) cannot support without inventing new scope no
governing document authorizes. The Rule 8 Assessment correctly declined
to fix this itself (Rule 8's own authority does not extend to editing
an Accepted Specification's text) and instead applied the corrected
meaning directly while flagging the wording for this exact, separate
Stage 2 gate.

## 3. Proposed Correction

### 3.1 Specification §3, Step 1 — Corrected

Replace the step 1 trigger wording with:

> 1. **Trigger:** during Add Stock or Smart Stock Entry — the two
> surfaces where a supplier's own wording for a product is actually
> encountered ("supplier stock entry," per `POL-0007` Business
> Requirement 3) — when a supplier wording is entered or extracted that
> does not match an already-confirmed relationship for the current
> supplier. **Initial Stock is not a trigger surface for this step**:
> it establishes a product's primary/reference identity (`Product.name`,
> `BDR-0013` item 2) and requires no supplier context of any kind
> (confirmed by direct code inspection: `InitialStockCountView.tsx`
> carries zero supplier references). `BDR-0013` item 8's inclusion of
> Initial Stock in this capability's surface scope is satisfied entirely
> by that identity-origin role — a product first created during Initial
> Stock is already a fully eligible target for a supplier-wording
> relationship established later during Add Stock or Smart Stock Entry,
> with no special wiring required. **The precise matching criterion**
> used to determine whether an incoming wording counts as a repeat of an
> already-confirmed relationship — exact or normalization-tolerant — is
> not decided here and remains explicitly deferred to Rule 8 (see §6).
> This trigger definition intentionally makes no commitment on that
> question; if the incoming wording matches under whatever criterion
> Rule 8 eventually settles, §6's reuse behavior applies instead of this
> candidate-detection flow.

### 3.2 Specification §3a — Corrected

Replace the opening sentence with:

> Per `POL-0007`'s explicit authorization, the owner may, while within
> the Add Stock or Smart Stock Entry workflow specifically — **not**
> Initial Stock, which has no supplier concept to declare a relationship
> against — directly identify that a supplier wording refers to a
> specific existing product without a system-proposed candidate first
> appearing.

The remainder of §3a (provenance treatment, the Product Catalog Editing
exclusion, the item 9 exception boundary) is unchanged and continues to
apply exactly as accepted.

### 3.3 What Is Not Changed

- `BDR-0013` item 8's business-level inclusion of Initial Stock in this
  capability's surface scope is **not narrowed**. It is preserved,
  exactly as the Rule 8 Assessment's §0 and Finding 10 already
  established: Initial Stock participates through its existing,
  unchanged role as the surface that establishes `Product.name`, the
  reference identity every later supplier-wording relationship points
  back to — not through running any candidate-detection, confirmation,
  or declaration UI itself.
- §2, §2a, §4, §5, §6, §7 (its own already-correct text distinguishing
  Initial Stock's role from Add Stock's/Smart Stock Entry's), §8, §9,
  §10, §11, §12, and the Governance Notes of the Specification are
  **entirely untouched** by this amendment.
- No new field, schema, algorithm, or UI is introduced. This amendment
  corrects wording only — it makes the Specification's text match a
  meaning the governing chain (`BDR-0013`, `POL-0007`) already had, not
  a new decision.

## 4. Migration Statement

Not applicable. No implementation of this capability has begun (Rule 8
Assessment confirmed: no code, schema, or rules changes have been made
for this capability at any point). This amendment corrects a
not-yet-implemented Specification's own text before implementation
begins — there is nothing to migrate.

## 5. What This Amendment Does Not Decide

- Does not resolve any of the technical questions the Specification
  itself already deferred to Rule 8 (storage structure, normalization
  method, reuse-matching strictness, distinguishing-information field
  shape, concurrency mechanism, observability fields) — all of those
  remain exactly as the Rule 8 Assessment already resolved them.
- Does not reopen `BDR-0013` item 8, item 2, or any other already-ACCEPT
  item.
- Does not authorize implementation, additional Rule 8 work, or
  Implementation Authorization — those remain separate, later gates.

## 6. Preserved Boundaries — Explicitly Confirmed Unaffected

`BDR-0013` (all nine §5 items, unchanged), `POL-0007` (all ten Business
Requirements, unchanged — its own text already used the correct
"supplier stock entry" scoping this amendment brings the Specification
into alignment with), and every section of the Specification not named
in §3.1/§3.2, above.

## Governance Notes

- No `src/`, `apps/`, `server/`, or `firestore.rules` file has been
  modified to produce this document.
- The Specification is not edited in place — consistent with this
  repository's established "amend additively, never rewrite" pattern.
  A reader must consult this amendment alongside the original
  Specification; §3.1/§3.2 above are the authoritative corrected text
  for §3 step 1 and §3a going forward.
- The Rule 8 Assessment (already ✅ Assessed — READY) required no
  rework to produce this amendment — it already built its findings
  against the corrected meaning this amendment now formalizes in the
  Specification's own text (Finding 10, explicitly).
- This amendment does not modify `BDR-0013` or `POL-0007`.

---

## Product Architect Acceptance

**Status:** 🟡 Proposed — pending explicit Product Architect review and
acceptance. Not yet Accepted. This amendment does not take effect, and
the Specification's §3 step 1/§3a wording remains as originally
Accepted, until acceptance is recorded here.
