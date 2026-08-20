# UI Readability Amendment — Implementation Authorization

**Type:** Governance bridge document (Stage 8, per
`platform-engineering-governance-standard.md` §2) — the formal record that
engineering governance is complete and implementation is authorized to begin.
**Status:** ✅ **Authorized.** Signed by the Product Architect — see
"Signature," below. Implementation of the UI Readability Amendment, exactly
as scoped by §2, is authorized to begin.
**Basis:** [`ui-readability-amendment.md`](./ui-readability-amendment.md)
(✅ Approved) → [`ui-readability-amendment-rule8-assessment.md`](./ui-readability-amendment-rule8-assessment.md)
(✅ Assessed → **Resolved**, including the explicit Item #23 / line 264
resolution recorded in that document's §7).
**Repository state at this revision:** working tree HEAD `bf11ec6`, working
tree clean, re-confirmed during the Rule 8 Assessment.
**Nothing has been modified in `apps/`, `server/`, `firestore.rules`, or any
other runtime file to produce this document.** Only `docs/engineering/`
governance artifacts exist so far.

---

## 1. Governance Completeness — What This Record Confirms

**Audit → Proposed Amendment → Approval → Amendment Record → Rule 8
Assessment → Resolution → Authorization (this document) → Implementation →
Close-out**

| Stage | Document | Status |
|---|---|---|
| Audit | System-wide UI Readability & Visual-Quality Audit | ✅ Delivered |
| Proposed Amendment | Proposed UI Readability Amendment (Sections A–C) | ✅ Delivered |
| Approval | Stakeholder review, this conversation | ✅ Approved (Sections A–C, as the implementation scope) |
| Amendment Record | `ui-readability-amendment.md` | ✅ Approved |
| Rule 8 Assessment | `ui-readability-amendment-rule8-assessment.md` | ✅ Assessed |
| Discrepancy Resolution | Same document, §7 (Item #23 / line 264) | ✅ Resolved by explicit stakeholder decision |
| **Authorization** | **This document** | 🕓 **Proposed — awaiting signature** |
| Implementation | — | Not begun |
| Verification | — | Not begun |
| Close-out | — | Not begun |

## 2. What Will Be Authorized (upon signature)

Exactly the final scope recorded in the Rule 8 Assessment §8 — **22 fully
verified items, plus Item #23 narrowed to 3 lines** — no broader, no
narrower:

1. `PeriodicStockCountView.tsx:531,854–859,953,1150` — `text-gray-400` → `text-gray-500`
2. `InitialStockCountView.tsx:345–350` — `text-gray-400` → `text-gray-500`
3. `AddStockView.tsx:1228,1744,1751,1758` — `text-gray-400` → `text-gray-500`
4. `StocksView.tsx:233,239,245,275,280,285,421,427,433,518,524,530,572` — `text-gray-400` → `text-gray-500`
5. `StocksView.tsx:536,542,548` — `text-[#0B1F3A]/60` → `text-gray-500`
6. `DashboardView.tsx:671–686` — `text-gray-400` → `text-gray-500`
7. `DashboardView.tsx:747` — `text-[9px] text-gray-400` → `text-[10px] text-gray-500`
8. `ProductDetailModal.tsx:122` — `text-gray-400` → `text-gray-500`
9. `ProductDetailModal.tsx:200,205` — `text-[9px] text-gray-400` → `text-[10px] text-gray-500`
10. `ClosingView.tsx:367,373,379` — `text-[9px] text-gray-500` → `text-[10px] text-gray-500`
11. `ClosingView.tsx:223` — `text-gray-400` → `text-gray-500`
12. `PeriodicStockCountView.tsx:531` — (covered under item 1's anchor list; no separate line)
13. `Header.tsx:124` — `text-[#D4AF37]` → `text-[#8A6D1F]`
14. `ShopSwitcher.tsx:75` — `text-[#D4AF37]` → `text-[#8A6D1F]`
15. `DashboardView.tsx:243,246` — `text-[#D4AF37]` → `text-[#8A6D1F]` (unset-state Initial Capital card only)
16. `Header.tsx:117` — `text-gray-400` → `text-gray-500`
17. `ShopSwitcher.tsx:97` — `text-gray-400` → `text-gray-500`
18. `SettingsModal.tsx:341–344` — `text-gray-400` → `text-gray-500`
19. `DashboardView.tsx:107,126` + `reports/ReportHome.tsx:100,107` — `text-white/40`→`text-white/65`; `text-white/35`→`text-white/60` (dark-card `isDark` branch only; `DashboardView.tsx:126`'s light-mode `text-gray-500` branch is unaffected)
20. `reports/charts/MiniCharts.tsx:178` — `text-gray-400` → `text-gray-500`
21. `apps/superadmin/.../BusinessDirectory.tsx:189,190,194,196,200,202` — `#64748b` → `#94a3b8`
22. `apps/superadmin/.../AuditTrail.tsx:140,151` — `#64748b` → `#94a3b8`
23. `apps/superadmin/.../BusinessDetail.tsx:108,165,177` **only** — `#64748b` → `#94a3b8`. **Line 264 excluded — already `#94a3b8`; no edit, no compensating change, per the explicit Rule 8 Resolution (§7 of the Rule 8 Assessment).**

## 3. Styling-Only Constraints (binding on implementation)

- Every change in §2 is a `className`/inline-`style` color or `font-size`
  value substitution only.
- Every substituted value is either already documented in `DESIGN_SYSTEM.md`
  (`--muted-foreground` / Tailwind `gray-500`; the darkened-gold values
  `#8A6D1F`/`#B8952F`) or already in active use elsewhere in the same file
  for the same purpose (`#94a3b8` in the superadmin files; `text-[10px]` as
  the existing caption-size floor).
- No new CSS class, no new color, no new design token, of any kind.
- No change outside the exact file:line list in §2 — no opportunistic
  cleanup, no adjacent-line "while I'm in there" edits.
- No blind/global find-and-replace — each edit is applied at its specific
  cited location only.

## 4. Explicitly Not Authorized

- **Any workflow, business-logic, state, props, hooks, handler, routing, or
  data-flow change**, anywhere, for any reason. If implementation
  encounters a spot where the styling fix appears to require or suggest a
  structural change, that finding **returns to this governance chain**, not
  to engineering judgment.
- **Any UI change outside the 23 items in §2** — including any of the
  Section B exclusions from the Proposed UI Readability Amendment
  (decorative icons, placeholders, disabled states, empty states, the
  semantic-neutral zero-variance gray coding in `ClosingView.tsx` /
  `StockVerificationReport.tsx`, hover-only micro-actions, the "locked"
  record badge, timeline event captions, instructional disclaimers,
  transient loading copy). These remain untouched.
- **`BusinessDetail.tsx:264`** — explicitly excluded per the Rule 8
  Resolution. No edit, no replacement, no compensating change of any kind
  to this line.
- **Any new component, new class, new color, or new design-system token.**
- **Any redesign** of any screen, card, or layout.

## 5. Scope Discipline & Discrepancy Handling (in effect throughout implementation)

- Implementation must remain strictly inside §2's boundary. If, during
  implementation, engineering finds that any cited line no longer matches
  what §2 records (content, surrounding markup, or the class itself has
  changed since this authorization was signed), **that is stopped and
  reported immediately** — not silently reinterpreted, expanded, or
  worked around — exactly as the Item #23/line-264 discrepancy was handled
  at the Rule 8 stage.
- Any ambiguity discovered mid-implementation about which token to apply,
  or any suggestion that a listed fix requires touching a file/line not in
  §2, returns to this governance chain before proceeding.
- No specification, amendment, Rule 8 Assessment, or this Authorization may
  be modified during implementation except through its own explicit,
  separate governance step.

## 6. Signature

**Signed.** Product Architect decision, recorded verbatim:

> "I explicitly authorize implementation of the UI Readability Amendment
> under Stage 8. I accept and authorize §§2–5 of the Implementation
> Authorization exactly as written. The authorized implementation scope is
> strictly limited to the 22 verified items plus Item #23 limited to
> `BusinessDetail.tsx` lines 108, 165, and 177. I explicitly confirm that:
> `BusinessDetail.tsx:264` is excluded and must not be modified; no source
> changes outside the authorized §2 scope are permitted; the implementation
> is styling-only; no workflow, business logic, state, props, hooks,
> handlers, routing, data flow, or product behavior may be changed; no new
> colors, CSS classes, design tokens, components, or design patterns may be
> introduced; no redesign or opportunistic cleanup is authorized; no
> blind/global replacements are authorized; any discrepancy between the
> authorized scope and the current source must stop implementation and be
> reported before proceeding; any ambiguity requiring a change outside the
> authorized scope must return to the governance chain for separate
> approval. This constitutes my explicit Stage 8 Implementation
> Authorization. Authorization: APPROVED — IMPLEMENTATION MAY BEGIN."

**Signed by:** SABUSHIMIKE Masceni, Product Architect.
**Date:** August 19, 2026.

**Authorization scope, as explicitly stated at signature:** applies only to
the implementation scope defined in §2 of this document — 22 fully verified
items plus Item #23 limited to `BusinessDetail.tsx:108,165,177`
(`BusinessDetail.tsx:264` explicitly excluded, no edit of any kind). No
additional functionality, redesign, or scope expansion is authorized.

**Governance requirements attached to this authorization, in effect for the
duration of implementation:**
- Any newly discovered discrepancy between authorized scope and current
  source shall stop implementation and be reported immediately, not
  resolved silently.
- Any ambiguity requiring a change outside the authorized scope shall
  return to the governance chain before proceeding.
- No business rule, workflow, state, props, hooks, handler, routing, or
  data flow may be changed during implementation.
- No governance record in this chain may be modified during implementation
  except through its own separate governance step.

Claude begins changing the runtime files listed in §2 following this
signature.

---

## Governance Notes

- This record does not implement code, modify runtime behavior, or change
  any `apps/`, `server/`, `firestore.rules`, or `firestore.indexes.json`
  file. None were touched to produce it.
- This record does not modify the Amendment or the Rule 8 Assessment — it
  sits downstream of both, authorizing based on their settled content.
- This record does not pre-authorize any future UI-readability pass beyond
  the 22.75 items (22 full items + Item #23's 3-line remainder) listed in §2
  — including the previously-deferred "locked" badge and timeline-caption
  candidates noted in the original Proposed Amendment's Section B, which
  remain out of scope unless separately proposed and approved.

**Lifecycle:** Approved → Assessed → Resolved → **Authorized (signed,
2026-08-19)**. Stage 9 (Incremental Implementation) begins now, strictly
within §2's boundary.
