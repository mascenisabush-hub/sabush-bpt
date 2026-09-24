Acceptance Record

# Product Architect Acceptance — Periodic Contagem Data-Protection Decisions (PA-01 through PA-16)

**Status:** ✅ **ACCEPTED AND RECORDED.** Sixteen decisions (PA-01–PA-16),
delivered directly by the Product Architect in conversation, recorded
here against the repository state at this session's clone of `main`.
This acceptance does **not** itself constitute an Implementation Plan
Amendment or a signed Implementation Authorization item, does not
amend any existing signed BDR, POL, or Decision, and does not
authorize any code, test, `firestore.rules`, or schema change.

**Prepared by:** Claude (Lead Software Engineer role, this
repository), recording decisions the Product Architect delivered
directly, against repository state `main @
f3e9bdb3628d389fe0f04e3f1c09a8b002bef7bc`.

**Originating investigation:** an extended forensic and design
investigation into Periodic Contagem's manual-row persistence
(evidence register D1–D9 / D-01–D-16 across multiple prior sessions),
culminating in a Product Architect Decision Brief presenting sixteen
open decisions (PA-01–PA-16) for resolution.

**Full governance lineage this acceptance sits atop:**
1. The forensic investigation and evidence register (this session's history) — informational, not itself a governance artifact.
2. Contagem Product Architect Decision Brief — presenting PA-01 through PA-16 as open, undecided questions with options.
3. **This document** — Product Architect acceptance of a specific option for each.

## 1. Decisions recorded

| ID | Approved direction |
|---|---|
| PA-01 | Client-generated, unique, immutable row identity, independent of display position/name/array index. Retry preserves original identity rather than generating a new one on uncertain outcome. |
| PA-02 | Occupied-target definition: any row with meaningful user data or unresolved work, not merely non-blank `productName`. Truly-empty placeholders explicitly distinguished from incomplete-but-meaningful rows. |
| PA-03 | Retry must reconcile with authoritative server state; row-count growth alone is insufficient evidence. Uncertain outcomes are preserved as uncertain, with a safe recovery path — never falsely declared failed, never blindly repeated. |
| PA-04 | Prefer atomic reindexing where platform limits allow; where independent writes are necessary, require visible per-row outcomes and explicit partial-completion reporting — no silent failure swallowing. |
| PA-05 | Combine safe-skip for truly-empty rows with protection for rows holding meaningful data or unresolved work; a missing product name alone is not sufficient grounds to treat a row as discardable. |
| PA-06 | Explicit hybrid write contract — immutable fields, mutable fields, removable fields, and permitted conditions for each, defined explicitly, not left to generic save behavior. |
| PA-07 | Check Decision 55's exact scope/authority before any conflict-detection broadening; do not silently expand existing policy; record any amendment dependency and return it to the Product Architect. |
| PA-08 | Actionable per-row persistence states, plus a concise whole-draft summary, in understandable product language. |
| PA-09 | Confirmation requires included rows to satisfy approved persistence/validation requirements — a warning is not a substitute for persistence evidence; a distinct, safe recovery path exists for unresolved rows. |
| PA-10 | Document current reload/recovery limitations clearly. Local durable storage, if pursued, is a separate capability with its own lifecycle/reconciliation/staleness/privacy/cost analysis — never represented as server-confirmed. |
| PA-11 | Conservative automatic normalization for clear formatting differences only; broader matching suggests, never auto-merges; meaningful distinctions (size, unit, variant) preserved. |
| PA-12 | Non-blocking entry-time suggestions plus a final unresolved-identity review; never silent merging of rows or portions. |
| PA-13 | Group matching products for readability in the review presentation; each contributing portion remains separately persisted and historically distinct; grouping never alters identity, quantity, or economics; mixed-state display defined. |
| PA-14 | Layered validation — advisory at entry (live/on-blur where appropriate), authoritative before persistence/confirmation; local validation is never proof of server acceptance. |
| PA-15 | Local discard of a superseded response is retained, but is never treated as proof the corresponding server write did not commit — a superseded write whose outcome is uncertain must be verified/reconciled before the row is declared settled. |
| PA-16 | Staged test-infrastructure investment, prioritized toward high-risk persistence/identity/overwrite/reindex/concurrency/uncertainty/confirmation/mixed-state-UI behavior; source-level tests never claimed to establish what requires emulator/integration/UI testing. |

## 2. Risk and governance gap findings (recorded, not silently resolved)

**RISK-01 (Medium-High, PA-01/PA-04/PA-05):** a correctly-implemented PA-01 (identity fully independent of array position) would remove the underlying cause PA-04/PA-05 exist to guard against — a reindex would become a purely local display reorder, not a persistence operation requiring shifted-row re-saves. **This is not a contradiction** — PA-04/PA-05 remain valid for any transition period or partial implementation — but their long-term scope should be revisited once PA-01 ships, rather than treated as permanent, independent protections. **Requires:** Product Architect confirmation of intended long-term scope for PA-04/PA-05 once PA-01 is realized.

**RISK-02 (Medium, PA-01/PA-06):** PA-01's client-generated immutable identity implies a new persisted field on `PeriodicStockDraftItem` (`apps/tenant/src/types.ts` L1490–1573) — none of the type's 13 existing fields serve this purpose, confirmed by a complete field-by-field audit performed during this investigation. This is a genuine, additive schema change (consistent with the type's own existing "omit when absent" backward-compatibility discipline), not explicitly named as such in PA-01's own wording. **Requires:** acknowledgment that PA-01 entails a schema addition, folded into the eventual Rule 8 Assessment's Data Model section.

**RISK-03 (Low, PA-03):** "reconcile with authoritative server state" is technically achievable but has no design today. Not a contradiction with PA-06/PA-15, which are consistent with it — a genuine, acknowledged open design gap only.

**RISK-04 (Low, PA-07 vs. Decision 55):** a real, already-self-identified dependency — PA-07's own text correctly defers rather than silently resolving it.

**No other material conflicts, data-loss risks, confusion risks, or contradictions with existing signed BDRs/POLs/Decisions/architecture/Hard Rules were found** during this review, beyond the four items above, all explicitly returned to the Product Architect rather than resolved here.

## 3. Status

```
Product Architect direction, delivered directly (this session)
        ↓
PRODUCT ARCHITECT ACCEPTANCE — RECORDED  ◄── this document
        ↓
Rule 8 Assessment — NOT YET PREPARED (RISK-01 through RISK-04 should inform it)
        ↓
Implementation Plan Amendment — PENDING
        ↓
Implementation Authorization — PENDING
        ↓
Implementation — NOT AUTHORIZED
```

**The acceptance of these sixteen decisions does not itself authorize implementation.** A Rule 8 Assessment, incorporating RISK-01 through RISK-04 as explicit items to address, has not yet been prepared. No Implementation Plan Amendment or Implementation Authorization exists. **No application code, test, schema, or `firestore.rules` file was modified to produce this acceptance record.**
