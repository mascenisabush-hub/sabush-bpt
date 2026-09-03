Acceptance Record

# Product Architect Acceptance — Decision 44 Refinement: Single Active Editor + Live Read-Only Viewers Model

**Status:** ✅ **ACCEPTED — REQUIREMENTS ONLY.** Technical mechanism NOT
selected. A fresh Rule 8 Reassessment against this specific refined
model is REQUIRED before any Implementation Plan or Implementation
Authorization. This record does not itself constitute a Rule 8
Assessment, an Implementation Plan, or an Implementation Authorization.
**Product Architect:** SABUSHIMIKE MASCENI
**Date:** 3 September 2026
**Decision:** The Single Active Editor + Live Read-Only Viewers model is
accepted as the governing requirements refinement to Decision 44.
**Governs:**
- [`docs/specs/stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md`](../specs/stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md) (the refinement text this record accepts, in full)
- Refines: [`docs/specs/stock-count-data-loss-resilience-decision-44-amendment.md`](../specs/stock-count-data-loss-resilience-decision-44-amendment.md) (Decision 44, ✅ Accepted — requirements only — SABUSHIMIKE MASCENI, 3 September 2026), specifically narrowing §6 only
**Informed by:** [`docs/engineering/periodic-contagem-shared-live-data-decision-44-rule8-assessment.md`](./periodic-contagem-shared-live-data-decision-44-rule8-assessment.md) — verdict READY AFTER DECISIONS, four CRITICAL and two HIGH findings against the pre-refinement, open-ended shared-editing model

**Governing chain, updated by this record:**

```text
Decision 44 Amendment — ✅ Accepted (requirements only), 3 Sept 2026
              ↓
Rule 8 Reassessment for Decision 44 — verdict READY AFTER DECISIONS
              ↓
Decision 44 Refinement (Single Active Editor + Live Viewers) — DRAFTED
              ↓
THIS RECORD — ✅ Product Architect Acceptance of the Refinement (requirements only)
              ↓
Rule 8 Reassessment against the REFINED model — NOT YET PERFORMED (next gate)
              ↓
Resolve Decisions 44-S-A through 44-S-H
              ↓
Implementation Plan — NOT YET AMENDED
              ↓
Implementation Authorization — NOT GRANTED
              ↓
Implementation
```

---

## 1. What This Acceptance Covers

Signing this record accepts, as governing product requirements for
Periodic Contagem, replacing Decision 44 §6's previously open-ended
"multiple authorized users operate against the same Contagem" framing:

- **At most one active editing authority** may hold write access to a
  business's unfinished Periodic Contagem at any given time (INV-44-S01).
- **Editing authority belongs to a specific active session** — not
  merely to a user or a device in the abstract. The same user can hold
  authority on one device/session and not on another; the same device
  can hold it in one tab/session and not another (refinement §2).
- **Other authorized users/devices may observe the same business-owned
  Contagem state live, in read-only Viewer mode** (INV-44-S02,
  INV-44-S07).
- **Viewer mode must not be able to write quantity state**, regardless
  of what authorization tier the underlying user otherwise holds
  (INV-44-S03).
- **The same user opening a second device/session must not silently
  obtain a second editing authority** — it defaults to Viewer mode
  (refinement §4).
- **Multiple users/devices must not be able to edit simultaneously**
  under normal operation (INV-44-S04, "No Dual Editor").
- **Authority acquisition/takeover must be explicit and authoritative**
  — never inferred merely from opening the Contagem screen (refinement
  §6).
- **Former-editor reconnection must not blindly overwrite the current
  Editor's state** (INV-44-S06, "Stale Former Editor Protection").
- **Offline Editor behavior remains governed by the unresolved
  decisions in the refinement** — specifically Decision 44-S-E (Offline
  Editor Takeover) and Scenario D/F of refinement §6, none of which are
  resolved by this acceptance.
- **Finalization uniqueness, draft-resurrection prevention,
  post-finalization mutation protection, and shared-device/logout
  isolation remain unresolved governance/Rule 8 concerns** — explicitly
  Decision 44-D and Decision 44-F from the original Decision 44 Rule 8
  Assessment, both confirmed CRITICAL/HIGH and neither reduced by this
  refinement (refinement §10, §14, §21).
- **Initial Stock Count remains outside this decision**, separately
  governed, unchanged (refinement §15; Decision 44-G/44-S-H).
- Every durability, recovery, no-silent-loss, and tenant-isolation
  requirement already established by Decision 44 (and, beneath it,
  Decisions 38–42) remains fully intact and unweakened (refinement §1,
  §16).

## 2. What This Acceptance Does NOT Cover

Signing this record does **not**:

- Select, approve, or pre-commit to any technical mechanism for
  establishing, persisting, or transferring editing authority —
  lease, lock, heartbeat, transaction-based claim, deterministic
  identity, or any other candidate remain open technical/design
  questions for the next Rule 8 assessment, per the refinement's own
  §6/§18 and this task's explicit instruction.
- Resolve any of Decisions 44-S-A through 44-S-H (Viewer authorization,
  Editor authorization, Finalizer authorization, the authority
  acquisition/takeover model, offline-Editor takeover, former-Editor
  reconnection, the narrowed conflict mechanism, or the confirmation
  that Initial Stock Count stays out of scope). **All eight remain
  explicitly open**, exactly as the refinement itself left them.
- Reduce, close, or reclassify any CRITICAL or HIGH finding from the
  existing Rule 8 Reassessment for Decision 44 — in particular,
  cross-device finalization uniqueness (Decision 44-D) and shared-
  device/logout cache isolation (Decision 44-F) are explicitly
  reaffirmed as still fully open and unreduced by this refinement, per
  the refinement's own §21 assessment.
- Authorize a fresh Rule 8 Reassessment to be treated as already
  performed. **A new Rule 8 pass against this specific refined model —
  evaluating 44-S-A through 44-S-H — remains a required, separate, not-
  yet-performed gate.**
- Authorize any Implementation Plan, Implementation Authorization, code
  change, `firestore.rules` change, schema change, test change, or any
  other implementation artifact. None of these were touched to produce
  this record.

## 3. Acceptance-Readiness Check — Summary

Performed this session against the refinement text as drafted in
`docs/specs/stock-count-data-loss-resilience-decision-44-refinement-single-editor-viewers.md`,
confirmed internally consistent with, and non-contradictory to:

- Decision 44's own accepted requirements (Decision 44 §1–§25, and its
  own Acceptance Note) — the refinement narrows only §6 and explicitly
  restates preservation of everything else (refinement §1).
- The existing Rule 8 Reassessment for Decision 44 — the refinement's
  §21 self-assessment does not overstate what the model resolves;
  cross-checked against the Rule 8 artifact's own CRITICAL/HIGH
  findings (finalization uniqueness, cache isolation, stale-write
  protection) and found consistent, not contradicted.
- No numbering collision: "44-S-A" through "44-S-H" and "INV-44-S01"
  through "INV-44-S12" do not collide with any existing decision or
  invariant identifier already in use in this repository's governance
  trail (`Decision 38`–`44`, `INV-44-01`–`INV-44-14`).

No inconsistency was found requiring correction before acceptance.

## 4. Product Architect Decision Record

**Decision:** ✅ ACCEPTED — the Single Active Editor + Live Read-Only
Viewers model, and the twelve invariants INV-44-S01–INV-44-S12 stated
in the refinement's §17, are adopted as governing product requirements
for Periodic Contagem, narrowing (not replacing) Decision 44 §6. The
technical mechanism satisfying these requirements is explicitly NOT
decided by this acceptance and remains open per Decisions 44-S-A
through 44-S-H, to be resolved following a fresh Rule 8 Reassessment
against this refined model.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** 3 September 2026

**Acceptance Signature:** SABUSHIMIKE MASCENI

**Decision Notes:** Accepted as a requirements-level product decision
only, exactly as Decision 44 itself was accepted. A fresh Rule 8
Reassessment against the refined Single Active Editor + Live Viewers
model is the required next governance gate — it has not yet been
performed and is not authorized to begin by this record. This
acceptance does not authorize any code, schema, test, or Firestore
security-rule change, and does not authorize an Implementation Plan or
Implementation Authorization.
