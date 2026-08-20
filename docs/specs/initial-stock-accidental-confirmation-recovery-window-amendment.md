Decision Record — Parameter Amendment

# Initial Stock Accidental Confirmation Recovery ("Void & Redo") — Recovery Window Amendment

**Status:** ✅ **Approved** by direct Product Architect decision. See "Product
Architect Decision," below.
**Type:** Targeted parameter amendment to an already-approved feature. **This
is NOT a new Business Decision Record, NOT a new Policy, NOT a new
Specification, and NOT a restart of planning.** It changes exactly one
number — the Void & Redo recovery window's duration — inside the existing,
already-approved governance chain. Filed unprefixed in `docs/specs/`,
following the same unprefixed cross-cutting pattern `BDR-0015` and `POL-0008`
themselves already use, since it amends both directly.
**Amends (value only, everywhere the value appears):**
[`BDR-0015`](./BDR-0015-initial-stock-accidental-confirmation-recovery.md)
(Decision B, and every restatement of the 30-minute figure elsewhere in that
document), [`POL-0008`](./POL-0008-initial-stock-accidental-confirmation-recovery-policy.md)
(Rules B, F, J, L, Decisions 2/4/5), the accepted
[Specification](./initial-stock-accidental-confirmation-recovery-specification.md)
(Business Rules 2/6/10, FR-2/FR-8/FR-16, the Acceptance Criteria and
Confirmation #4 Clarification that restate the figure), and the
[Implementation Plan](../engineering/initial-stock-accidental-confirmation-recovery-implementation-plan.md)
and [Implementation Authorization](../engineering/initial-stock-accidental-confirmation-recovery-implementation-authorization.md)
(every acceptance-criteria/test-requirement line that names the figure). See
§3 for the exact line-level inventory.
**Does not amend:** any other rule, decision, business philosophy, or
technical direction in any of the above documents; the
[Rule 8 Assessment](../engineering/initial-stock-accidental-confirmation-recovery-rule8-assessment.md)'s
verdict (reaffirmed, not reopened — §5, below); `BDR-0014`, `POL-0006`, or any
other unrelated governance artifact; `businessWorth`; Initial Stock
terminology or boundaries; the Confirmation #4 ceiling; the Option A
subscription-gating exemption; or any code (`src/`, `apps/`, `server/`,
`firestore.rules`, `tests/`, indexes — see §7).
**Does not create:** a new BDR number, a new POL number, or a new
Specification version. `BDR-0015` remains `BDR-0015`; `POL-0008` remains
`POL-0008`.
**Repository state at this revision:** `main = origin/main =
1068a22c4f397ac56af8f295101bff8534592e38`, working tree clean, confirmed
immediately before this document was drafted. Nothing in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, or `tests/` has been modified to
produce this document.

---

## 0. Governance Chain (Unchanged)

`BDR-0015` → `POL-0008` → Initial Stock Accidental Confirmation Recovery
Specification → Rule 8 Assessment → Implementation Plan / Implementation
Authorization → Implementation.

This amendment is a parameter change *inside* that chain, not a new entry
point into it. The chain itself, and every stage's approval status, is
unchanged by this document.

## 1. Product Architect Decision

**Previous rule:** the Void & Redo recovery window is exactly **30 minutes**,
measured from a confirmation event's own frozen confirmation timestamp.

**New rule:** the Void & Redo recovery window is exactly **12 hours**,
measured from a confirmation event's own frozen confirmation timestamp.

**Rationale (operational, recorded verbatim from the decision):** users who
accidentally confirm Initial Stock may not discover the mistake within 30
minutes, leaving them unable to reopen the Initial Stock and continue. The
feature's purpose is unchanged: provide a narrow recovery path for accidental
Initial Stock confirmation. 30 minutes proved too short a window for that
purpose to reliably serve real Owners; 12 hours is judged long enough to
cover same-day discovery (e.g., an Owner who confirms in the morning and
reviews the business at close) while remaining a *bounded, time-boxed*
exception — not an open-ended one — consistent with `BDR-0015` §3's own
"time-boxed" framing (Decision B), which this amendment narrows in duration
only, not in kind.

**Measurement, restart, and extension — unchanged:**
- Still measured from **that confirmation event's own** frozen confirmation
  timestamp (`POL-0008` Rule B; unchanged in substance, only the duration
  changes).
- Still **does not restart** on any action (`POL-0008` Rule B — unchanged).
- Still **cannot be extended** by the Owner, any other role, or any support
  mechanism (`POL-0008` Rule B — unchanged).
- Still a **hard, unconditional expiry** once elapsed — no soft warning
  state, no grace period, no manual override (`BDR-0015` Decision F,
  `POL-0008` Rule F, Specification FR-16 — unchanged).

## 2. Scope — What This Amendment Is, Precisely

This is a **parameter amendment within the existing approved feature**, not a
new business capability. It changes one number (30 minutes → 12 hours)
everywhere that number appears as the recovery-window duration, and nothing
else. No new BDR is created. No new Policy is created. Every other rule
already approved for Void & Redo remains exactly as it was:

- Void & Redo remains the **sole** recovery mechanism.
- **Owner-only.**
- **Initial Stock only** — never StockBatch/Add Stock/Periodic Contagem.
- Recovery is still measured from the confirmation event's own **frozen**
  confirmation timestamp.
- The recovery window still **does not restart or extend**.
- **Exact pre-confirmation draft restoration** remains required.
- The **original confirmation is never edited or deleted**.
- A voided confirmation **remains permanently preserved and marked voided**.
- Once a redo exists, it **remains the sole active read path** for Initial
  Capital/current-state calculations.
- Original and redo valuation bases **remain independently selected and
  frozen** — no basis inheritance.
- **Every confirmation event gets its own independent recovery window** —
  now 12 hours instead of 30 minutes, but still independent, still
  non-restarting, still non-extending.
- **Maximum 3 recovery cycles / maximum 4 confirmation events** — unchanged.
- **Confirmation #4** still has its own recovery window (now 12 hours) for
  visibility/measurement, but Void & Redo against it is still completely
  unavailable — it still cannot be voided and still cannot produce
  Confirmation #5.
- **Subscription gating** — Void & Redo remains exempt from
  `subscriptionAllowsNewRecords`, in exactly the already-approved Option A
  narrow scope. Unaffected by this amendment.
- **`businessWorth` formula** — untouched.
- **Existing Initial Stock terminology and boundaries** — untouched.

## 3. Line-Level Inventory — Where "30 minutes" Currently Appears

Confirmed by direct, fresh grep of the governance chain this session (not
assumed from memory). Every one of the following is amended by this record
to read "12 hours" in substance (see §4 for how each source document is
marked, without being silently overwritten):

- **`BDR-0015`** — §3 (Decision B narrative, twice), §4 (Scope Exclusions
  reference to measuring the window), §6 (cross-BDR-0014 relationship
  narrative), §8 (Decision summary items 2 and 6), §9 (Decisions B and F,
  recorded verbatim), and the "Net shape" closing summary — 9 occurrences.
- **`POL-0008`** — Purpose section, Rule B (window measurement, stated
  twice), Rule D (original preserved), Rule F (hard expiry), Rule H
  (independent frozen bases), Rule J (each confirmation's own window,
  stated four times across the rule and its sub-bullets), Rule L (expired
  unused draft), the Scope Exclusions list, and Decisions 2, 3, 4, and 5 of
  the recorded Product Architect Decisions section — the single largest
  concentration of occurrences in the chain.
- **Specification** — the Recovery Window definition (§ "ACCEPTED" glossary
  entry), Business Rule 2, Business Rule 6, Business Rule 10, Invariant I-3,
  FR-2, FR-8, FR-16, the Acceptance Criteria list (items 2 and 8), and the
  §21 Confirmation #4 Clarification (items 1, 9, 10, and the closing
  bullet summary).
- **Rule 8 Assessment** — Finding B's heading and body (the *mechanism* for
  enforcing the window: `serverTimestamp()` + `firestore.rules`
  `duration.value(30, 'm')` against `request.time`), the boundary-inclusivity
  note, Finding G's exception-carve-out description, the required-tests list,
  and the Findings-unaffected summary in §14/§16. **The mechanism itself is
  unaffected by this amendment — only the literal duration constant it
  enforces changes** (see §5, Rule 8 impact).
- **Implementation Plan** — the Void step description (Finding D1/A1) and the
  new `firestore.rules` rule description, both of which currently state
  "30 minutes" as the gate condition; the rules-emulator test-plan entry for
  the 30-minute boundary.
- **Implementation Authorization** — the `firestore.rules` rule description
  (§ acceptance criteria), the required-tests list (twice), and the
  Acceptance Criteria restatement of FR-2/FR-16.
- **Application code** (not amended by this record — listed here only for
  completeness of the inventory, per §7's STOP BEFORE CODE boundary):
  `firestore.rules:231` (`duration.value(30, 'm')` — the sole
  server-authoritative enforcement point) and
  `apps/tenant/src/utils/calculations.ts:135` (`30 * 60 * 1000` — the
  client-side display/countdown mirror of the same constant). Both are
  narrative/comment-referenced elsewhere (`AppContext.tsx`, `types.ts`) but
  these two lines are the only places the number is actually hard-coded.

## 4. How Each Source Document Is Marked

Consistent with this repository's established discipline for amending an
already-approved record without silently overwriting it (the same
"flagged, not silently left inconsistent" precedent used for
`19-pol-013-payment-reversal-grace-period-reset-amendment.md` against
`19-pol-010-payment-reversal-policy.md`): **none of `BDR-0015`, `POL-0008`,
the Specification, the Rule 8 Assessment, the Implementation Plan, or the
Implementation Authorization has its original body text rewritten by this
record.** Each document's original "30 minutes" language is preserved
intact as the historical record of what was first decided and why 30
minutes was initially chosen (§1 of `BDR-0015` still explains the original
reasoning; that reasoning is not invalidated, only superseded on the single
duration parameter).

Instead, a short, clearly-marked **Amendment Notice** has been inserted
immediately below each document's own header metadata block, reading in
substance: *"This document's recovery-window figure (30 minutes) has been
amended to 12 hours by [this amendment]. Measurement, no-restart, and
no-extension rules are unchanged. Wherever this document states '30
minutes,' the current, governing figure is 12 hours. All other rules in
this document remain exactly as originally approved."* This makes the
amendment impossible to miss at the top of each file while leaving the
original decision narrative — including its original numbers — fully
intact and readable as history, exactly as this repository already does
for its other amendments.

## 5. Rule 8 Impact — Assessed, Not Re-Litigated

Per the governance instruction not to redo the entire Rule 8 assessment
unnecessarily, the following checks were run specifically against the
30→12h change, against the existing Rule 8 Assessment's own Findings A–K:

1. **Timestamp authority remains safe.** Finding B's mechanism —
   `serverTimestamp()` on `confirmedAt`, compared against `request.time` in
   `firestore.rules`, never a client-supplied value — is duration-agnostic.
   Extending the comparison window from `duration.value(30, 'm')` to
   `duration.value(12, 'h')` changes only the literal argument to
   `duration.value()`; the trust boundary (server clock only) is identical.
   **Safe, unchanged.**
2. **Security rules remain Owner-only and time-bounded.** The rule is still
   a bounded window — 12 hours is a longer bound, not an unbounded one. The
   Owner-only precondition is untouched; nothing about the amendment removes
   or weakens the Owner-only gate. **Safe, unchanged.**
3. **No tenant-isolation issue.** The window duration has no bearing on
   tenant scoping — the existing rule's business-scoped path
   (`businesses/$(businessId)/stockCounts/$(stockCountId)`) is untouched by
   this amendment. **Safe, unchanged.**
4. **Original immutability is not weakened.** The original confirmation is
   still never edited or deleted under any part of the flow, at any point
   before, during, or after the (now longer) window — Rule D's guarantee is
   about *what happens to the original record*, not about *how long the
   window is*. A longer window means a longer period during which a voided
   copy *could* be created, not a longer period during which the original
   itself becomes editable. **Safe, unchanged.**
5. **Draft restoration remains safe.** The restoration mechanism
   (client-side reconstruction from the void-record artifact, Finding D1/A1)
   does not depend on how long ago the original was confirmed — it restores
   from whatever the void-record artifact captured, whether written 5
   minutes or 11 hours after confirmation. **Safe, unchanged.**
6. **Concurrency/atomicity remain safe.** The optimistic-concurrency
   precondition (no pre-existing void-record for the target) and the
   single-batch write are duration-independent. A 12-hour window does not
   introduce a new concurrency surface beyond what already exists for a
   30-minute one — if anything, it is the same finite state machine with a
   larger but still-finite time parameter. **Safe, unchanged.**
7. **Confirmation #4 ceiling remains unchanged.** The ceiling is a count
   (3 recovery cycles / 4 confirmation events), not a time-based rule; it is
   fully orthogonal to the window's duration. **Unchanged.**
8. **Option A subscription exemption remains unchanged.** The exemption is
   scoped to the Void & Redo write path itself, not to any time value within
   it. **Unchanged.**
9. **Performance/storage implications of a 12-hour retention window.** The
   only state kept "alive" for recovery purposes during the window is the
   confirmed record itself plus whatever the void-record/draft-reconstruction
   path already reads to rebuild the pre-confirmation draft (Finding D1/A1) —
   no new storage artifact is introduced by lengthening the window, and
   nothing is retained *longer* than it already is today: the original
   confirmation is retained forever regardless of window length (Rule D), and
   the void-record artifact, once created, is likewise permanent (Rule D
   applies to it too). Extending the window from 30 minutes to 12 hours does
   not change what is stored or for how long anything is stored — it only
   changes how long the Owner has to *trigger* the void action in the first
   place. **No new performance or storage cost identified.**
10. **Whether any existing Rule 8 finding needs modification.** None do, in
    substance. Finding B's *mechanism* is reaffirmed as-is; only the literal
    duration constant it enforces (`duration.value(30, 'm')` →
    `duration.value(12, 'h')`) changes, which is an argument change to an
    already-approved mechanism, not a new finding.

**Verdict:** the existing Rule 8 Assessment's verdict — **READY** — remains
valid and is **reaffirmed, not reopened**, for the 12-hour window. No new
Rule 8 Assessment, and no `-v2`, is required. This section constitutes the
complete record of that reaffirmation.

## 6. Implementation Authorization — Status

The existing Implementation Authorization is **✅ Authorized, signed**, and
remains valid **for everything it authorized except the literal "30
minutes" values in its acceptance criteria and required-tests list**, which
this amendment supersedes to "12 hours." Because implementation of the
*original* (30-minute) rule has **already occurred** — `firestore.rules:231`
and `apps/tenant/src/utils/calculations.ts:135` currently hard-code 30
minutes, and dedicated tests already exist
(`tests/initial-stock-void-redo.test.ts`) against that value — this
amendment's governance approval of "12 hours" does **not**, by itself,
authorize editing those files or that test. A follow-up code change (two
constants: `firestore.rules:231`'s `duration.value(30, 'm')` →
`duration.value(12, 'h')`, and `calculations.ts:135`'s `30 * 60 * 1000` →
`12 * 60 * 60 * 1000`, plus updated/added boundary tests) is required before
the 12-hour rule takes effect in the running system. **That code change is
explicitly out of scope for this record** (§7) and requires either (a) an
explicit confirmation that this amendment itself is sufficient authorization
for that narrow, parameter-only code change, or (b) a short, separate
Implementation Authorization addendum, at the Product Architect's discretion
— this record does not presume which.

## 7. STOP BEFORE CODE

This record does not modify, and was not produced by modifying,
`src/`, `apps/`, `server/`, `firestore.rules`, `tests/`, or any Firestore
index definition. No code, test, or index file has been touched. Confirmed
by `git status` (clean except this document and the six Amendment Notice
insertions listed in §4) immediately before and after drafting.

## 8. Governance Notes

- **No new BDR.** `BDR-0015` is not renumbered, superseded, or reopened as a
  business decision — its underlying philosophy (a narrow, time-boxed,
  Owner-only exception) is unchanged; only the box's size changes.
- **No new Policy.** `POL-0008` is not renumbered or reopened at the policy
  level — its operational rules (measurement, no-restart, no-extension,
  original preservation, independent per-confirmation windows, the 3-cycle
  ceiling) are unchanged; only the duration parameter inside Rule B/J
  changes.
- **No new Specification version.** The accepted Specification's functional
  requirements and acceptance criteria are unchanged in kind — only the
  literal duration figure they reference changes.
- This record does not authorize implementation of the 12-hour value. A
  separate, explicit decision (§6) remains required before
  `firestore.rules` or `calculations.ts` may be edited.

**Lifecycle:** Designed → **Approved** (governance parameter amendment
only). Not Implemented for the new value — the existing 30-minute
implementation remains the live, running behavior until the follow-up code
change in §6 is separately authorized and completed.
