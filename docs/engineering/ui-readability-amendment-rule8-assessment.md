# Rule 8 Assessment — UI Readability Amendment (Section C)

**Governing chain:** [`ui-readability-amendment.md`](./ui-readability-amendment.md)
(Approved) → this assessment.
**Scope of this assessment:** Exactly the 23 grouped items / ~65 lines in
Section C of the Proposed UI Readability Amendment. No broader scope
considered.
**Lifecycle state:** Approved → **Assessed** (this document). Reaching
"Assessed" is a readiness opinion, not authorization — per
`platform-engineering-governance-standard.md` §3.
**Baseline verified fresh:** working tree HEAD `bf11ec6`, working tree clean
(`git status --short` empty), re-confirmed immediately before this assessment
began (Non-Negotiable Principle 2).

---

## 1. Objective

Confirm the approved Section C scope still matches the actual current source
tree, line-for-line, before any implementation begins — per the explicit
"Important discrepancy rule" carried in the approval instruction and per this
repository's own Non-Negotiable Principle 2 ("every implementation session
re-verifies fresh state... not against memory of an earlier conversation
turn").

## 2. Method

Every one of Section C's 23 items was re-opened at its cited file:line and
compared against the exact "From" value the amendment records. No item was
assumed correct from the original audit pass.

## 3. Result

**38 of 39 individually re-checked anchor lines match exactly.** One
discrepancy found:

### Discrepancy — Item #23, `apps/superadmin/src/pages/BusinessDetail.tsx:264`

- **Section C records:** line 264 as part of the `#64748b` → `#94a3b8` group
  (alongside lines 108, 165, 177 in the same file).
- **Actual current line 264:** `<dt style={{ color: '#94a3b8' }}>{label}</dt>`
  — already `#94a3b8`, not `#64748b`.
- **Root cause:** mis-citation in the original amendment proposal, not
  post-audit drift (working tree HEAD is the same commit read during the
  original audit; this line simply didn't match the pattern it was grouped
  under).
- **Disposition:** **Not resolved by this assessment.** Per the governing
  instruction, a discrepancy between approved scope and actual source is
  reported, not silently reinterpreted, expanded, or corrected. Flagged to
  the approving stakeholder; implementation of item #23 is held pending an
  explicit decision on this one line (see accompanying report to the
  stakeholder). Lines 108, 165, and 177 in the same file are confirmed
  unaffected and match Section C exactly.

## 4. All other items — verification detail

| Item # | File | Lines checked | Result |
|---|---|---|---|
| 1 | `PeriodicStockCountView.tsx` | 531, 854–859, 953, 1150 | OK |
| 2 | `InitialStockCountView.tsx` | 345–350 | OK |
| 3 | `AddStockView.tsx` | 1228, 1744, 1751, 1758 | OK |
| 4 | `StocksView.tsx` | 233, 239, 245, 275, 280, 285, 421, 427, 433, 518, 524, 530, 572 | OK |
| 5 | `StocksView.tsx` | 536, 542, 548 | OK |
| 6 | `DashboardView.tsx` | 671–686 | OK |
| 7 | `DashboardView.tsx` | 747 | OK |
| 8 | `ProductDetailModal.tsx` | 122 | OK |
| 9 | `ProductDetailModal.tsx` | 200, 205 | OK |
| 10 | `ClosingView.tsx` | 367, 373, 379 | OK |
| 11 | `ClosingView.tsx` | 223 | OK |
| 12 | `PeriodicStockCountView.tsx` | 531 | OK (dup of item 1's anchor) |
| 13 | `Header.tsx` | 124 | OK |
| 14 | `ShopSwitcher.tsx` | 75 | OK |
| 15 | `DashboardView.tsx` | 243, 246 | OK |
| 16 | `Header.tsx` | 117 | OK |
| 17 | `ShopSwitcher.tsx` | 97 | OK |
| 18 | `SettingsModal.tsx` | 341–344 | OK |
| 19 | `DashboardView.tsx` (KpiCard) / `reports/ReportHome.tsx` | `DashboardView.tsx:107,126`; `ReportHome.tsx:100,107` | OK — anchors confirmed this pass (see §4a) |
| 20 | `reports/charts/MiniCharts.tsx` | 178 | OK |
| 21 | `BusinessDirectory.tsx` (superadmin) | 189, 190, 194, 196, 200, 202 | OK |
| 22 | `AuditTrail.tsx` (superadmin) | 140, 151 | OK |
| 23 | `BusinessDetail.tsx` (superadmin) | 108, 165, 177 OK; **264 discrepancy (above)** | Partial |

### §4a — Item 19 exact anchors (confirmed this pass)

- `apps/tenant/src/components/DashboardView.tsx:107` —
  `` <p className={`kpi-label leading-tight truncate ${isDark ? 'text-white/40' : ''}`}> `` (label)
- `apps/tenant/src/components/DashboardView.tsx:126` —
  `` <p className={`relative text-[11px] leading-snug mt-auto pt-1 font-medium ${isDark ? 'text-white/35' : 'text-gray-500'}`}> `` (description; note the light-mode branch already correctly uses `text-gray-500` — only the `isDark` branch is in scope)
- `apps/tenant/src/components/reports/ReportHome.tsx:100` —
  `<p className="kpi-label leading-tight truncate text-white/40">{t('reports.categories.businessWorth.title')}</p>`
- `apps/tenant/src/components/reports/ReportHome.tsx:107` —
  `<p className="relative text-[11px] leading-snug mt-auto pt-1 font-medium text-white/35">`

All four match Section C exactly; no discrepancy. `DashboardView.tsx:126`'s
edit is scoped to the `isDark ? 'text-white/35' : ...` branch only — the
`'text-gray-500'` light-mode branch is correct as-is and out of scope.

## 5. Findings summary

- **22 of 23 items:** clean, exact match to Section C, ready.
- **1 of 23 items (#23):** partial — 3 of 4 lines clean, 1 line
  (`BusinessDetail.tsx:264`) does not match the approved "From" value and is
  held pending stakeholder decision.
- No item found broader, narrower, or structurally different from how
  Section C described it (i.e., no case of a line matching by number but
  having unrelated surrounding markup changed).

## 6. Recommendation

**Ready for Implementation Authorization, with item #23 scoped to lines 108,
165, and 177 only, pending the stakeholder's explicit decision on line 264.**
This is a readiness opinion only — per the governing standard, it does not
itself authorize Stage 9. Implementation Authorization (Stage 8) requires a
separate, explicit sign-off.

---

## 7. Resolution — Item #23 / Line 264 (recorded post-review)

**Reviewed and explicitly resolved by the approving stakeholder**, in
response to this assessment's §3/§5 finding:

> "For Item #23 (`apps/superadmin/src/pages/BusinessDetail.tsx`), I
> explicitly resolve the reported discrepancy as follows: Lines 108, 165,
> and 177 remain approved for the `#64748b` → `#94a3b8` styling amendment.
> Line 264 is removed from the implementation scope because the current
> source already contains the intended `#94a3b8` value. Do not modify line
> 264. Do not create any replacement, cleanup, or compensating change for
> line 264. Record this as a scope correction based on the verified current
> source, not as a new design decision."

**Classification:** This is a **scope correction**, not a new design
decision — the original design intent for item #23 ("bring this file's
secondary-label color to `#94a3b8`, consistent with the rest of the file")
is unchanged; only the *citation* is corrected to match what the verified
source already shows. No new styling value, token, or rationale is
introduced. This is consistent with the governing standard's treatment of
a Rule 8-stage finding: reported, not silently resolved, and closed by an
explicit stakeholder decision rather than engineering judgment.

**Final scope for Item #23:** `BusinessDetail.tsx` lines 108, 165, 177 only.
Line 264 is out of scope — no change, no compensating edit, no cleanup.

## 8. Final approved implementation scope (post-resolution)

- **22 of 23 items:** unchanged, exactly as Section C and §4 above.
- **Item #23:** narrowed to lines 108, 165, 177 (line 264 removed).
- No other item's scope changed as a result of this resolution.

**Updated lifecycle state: Assessed → Resolved.** Ready for Stage 8
Implementation Authorization to be prepared and presented for signature.
