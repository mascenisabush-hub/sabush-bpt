# UI Readability Amendment — Section C Styling Corrections

**Type:** Specification/Standards-conformance amendment. Not an architecture
decision, not a new business rule, not itself an Implementation Authorization.
**Governing standard:** `docs/engineering/platform-engineering-governance-standard.md`
(the eleven-stage sequence; lifecycle vocabulary in §3).
**Governs:** Conformance of existing implementation to the already-approved
`DESIGN_SYSTEM.md` (Principle 2.11, `docs/architecture/02-core-product-principles.md`
§2.11 — "No screen ships outside the established design system... without that
system being updated first"). This amendment does **not** update or extend
`DESIGN_SYSTEM.md` — every proposed value is a token/color already documented
there or already in active use elsewhere in the same file. It corrects
implementation that had drifted from the already-approved standard.
**Lifecycle state:** Proposed → **Approved** (this document records that state).
Approved is not Authorized — see §4 below and the governance standard §3.

---

## 1. Basis

- System-wide UI Readability & Visual-Quality Audit (delivered this session):
  identified ~125 `text-gray-400` occurrences plus raw-gold, opacity, and
  superadmin-slate items, individually reviewed against measured WCAG contrast.
- Proposed UI Readability Amendment (delivered this session): classified every
  occurrence into "genuine defect" vs. "legitimate secondary use," and produced
  23 grouped styling amendments (Section C) covering ~65 lines, plus an explicit
  list of exclusions (Section B) with reasoning.
- Product-Architect-equivalent review (this session, prior turn): **Sections A–C
  approved as the implementation scope**, exactly as written, with the explicit
  instruction that this approval is of the specification amendment only, not
  automatic implementation authorization.

## 2. Scope approved

Exactly the 23 grouped changes in Section C of the Proposed UI Readability
Amendment — see that document for the full per-item file/line/from/to table.
Summarized by category:

1. Financial/stock-count field labels and column headers: `text-gray-400` →
   `text-gray-500` (items 1–4, 6, 8, 12, 16–18, 20).
2. Navy-at-60%-opacity secondary labels → `text-gray-500` (item 5).
3. Sub-10px labels on financial data → `text-[10px]` + color correction where
   applicable (items 7, 9, 10).
4. Raw gold text on white/light surfaces → documented darkened-gold value
   `#8A6D1F` (items 13–15).
5. Dark-KPI-card supporting text opacity → `text-white/60` / `text-white/65`
   (item 19).
6. Superadmin operational/status text: `#64748b` → `#94a3b8` (items 21–23).

## 3. Constraints carried forward from approval (binding on implementation)

- No product redesign, workflow change, business-logic change, state/props/
  hooks/handler/routing/data-flow change.
- No new components, no new CSS classes, no new colors or design tokens.
- No opportunistic cleanup outside the 23 approved items.
- No blind/global replacements — every occurrence was individually classified;
  Section B's exclusions (decorative icons, placeholders, disabled states, empty
  states, semantic-neutral variance color, hover-only micro-actions, transient
  copy, instructional disclaimers) are preserved unchanged.

## 4. What this document does not do

Per the governing standard's lifecycle vocabulary (§3) and Non-Negotiable
Principle 6 ("a governance artifact records; it does not decide") and Principle 7
("numbering is not authorization"): **this record does not itself authorize
Stage 9 (Incremental Implementation).** A separate Rule 8 Assessment (Stage 7)
must first re-verify the current working tree against Section C's exact
locations, and a separate Implementation Authorization (Stage 8) must be
explicitly signed before any source file is modified. See the accompanying
Rule 8 Assessment for this amendment.
