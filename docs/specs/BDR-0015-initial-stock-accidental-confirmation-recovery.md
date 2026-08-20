Business Decision Record

# BDR-0015 — Initial Stock Accidental Confirmation Recovery ("Void & Redo") — Business Decision Record

**Status:** Approved — Product Architect decision recorded verbatim in §9, below.
**Type:** Business Decision Record — a strategic decision about why this recovery capability exists and what narrow boundary it may operate within, per the category `19-governance-bdr-policy-framework.md` §2 establishes. Not a Policy (no "how, specifically" operational rule — draft-restoration mechanism, timer implementation, schema — is fixed here) and not a Business Domain Specification (no functional requirement or acceptance criterion for implementation is fixed here).
**BDR number:** `BDR-0015` — assigned per this repository's established discipline that a BDR number requires explicit assignment and is never inferred from the highest existing file on disk (`BDR-0012`'s own numbering note; `BDR-0013`'s own numbering note; `BDR-0014`'s own numbering note). Confirmed directly against current repo state before drafting: every `BDR-000N` reference across `docs/` (both the unprefixed `BDR-00NN-*.md` files and the module-prefixed `NN-bdr-00NN-*.md` files) accounts for numbers 0001 through 0014 continuously, with no gap and no reservation beyond 0014. `BDR-0015` is the next number in that same sequence.
**Location note:** Filed in `docs/specs/`, unprefixed — this capability is cross-cutting (Initial Stock confirmation, its draft state, and Capital Growth's read path), following the same unprefixed pattern already established for cross-cutting artifacts (`BDR-0004`, `BDR-0008`, `BDR-0009`, `BDR-0012`, `BDR-0013`, `BDR-0014`).
**Depends on:** A prior investigation session's Decision Interface (eight questions, referenced here as A–H) and the Product Architect's resolution of each, recorded verbatim in §9, below. This BDR treats that resolution as the decision it formalizes, not as something it re-derives or re-litigates.
**Does not amend:** `BDR-0014` (Initial Stock & Initial Capital Dual-Valuation-Basis), its two companion amendments (`10-initial-stock-dual-valuation-basis-amendment.md`, `02-capital-growth-dual-basis-amendment.md`), the accepted Specification, Rule 8 Assessment, or signed Implementation Authorization for that Dual-Valuation-Basis feature, `02-core-product-principles.md` itself, `10-initial-stock-valuation-history-amendment.md`, `10-stock-counts.md`, or any other existing artifact. §4, below, identifies exactly what this decision conflicts with and what remains open as a result.
**Followed by:** Per the established sequence (`Business Philosophy → BDR → Policy → Module Specifications → Rule 8 → Implementation`, `19-governance-bdr-policy-framework.md` §3) — not a single named artifact and not drafted here. §5 identifies, without designing, the categories of follow-on work this decision unlocks.

---

## 1. The Business Reality

An Owner confirming Initial Stock is a one-time, high-stakes action: `08-module-architecture.md` §8.6 and `07`/`02-core-product-principles.md` Principle 2.10 make the `initial` `StockCount` the one permanently immutable record in the schema, and `firestore.rules` enforces that immutability unconditionally, Owner included, once confirmed.

That same finality creates a real operational failure mode this BDR exists to address: an Owner can tap "Confirm" on Initial Stock before the draft is actually correct — a genuine misclick, an incomplete count confirmed too early, a value entered against the wrong product — and today has no recovery path at all. The confirmed record is immediately and permanently frozen, exactly as Principle 2.10 requires, with no distinction between "this is correct and final" and "this was accidental." The Owner's only option today is to live with an Initial Capital baseline they know is wrong, for the life of the business.

This BDR does not question whether Initial Stock should be immutable once genuinely final — Principle 2.10's underlying purpose (a business owner, or an investor doing diligence, must be able to trust that a historical number reflects what was true at the time) is not in dispute and is not reopened here. It addresses a narrower, previously unaddressed case: recovery from an accidental confirmation, in the brief window immediately after it happens, before any real reliance has formed on the confirmed figure.

## 2. The Approved Recovery Pattern — "Void & Redo"

The Product Architect's decision, resolving all eight questions (A–H) of the prior session's Decision Interface, approves **Option B — Void & Redo**, recorded verbatim in §9. In substance:

- An accidental early Initial Stock confirmation is recoverable, but only for **30 minutes**, timed from the **original confirmation's own timestamp** — a fixed window, not restartable and not extendable by the Owner (Decision B).
- Within that window, the Owner may trigger recovery, which resumes them from the **exact pre-confirmation draft state** — not a blank form, not a partial reconstruction (Decision C).
- The **original accidental confirmation is never edited or deleted.** It remains permanently visible in audit/history, explicitly marked as **voided** (Decision D).
- Recovery is **Owner-only** — no Manager or Staff role may trigger it, matching the authorization tier every other capital-affecting action in this schema already carries (Decision E).
- Once the 30-minute window closes, the original confirmation becomes completely final. **No recovery path exists after that point, under any circumstance** — the exception this BDR carves out has a hard, unconditional expiry (Decision F).
- Once a replacement ("redo") confirmation exists, it — and only it — is what Capital Growth and current business-state calculations read going forward (Decision G).
- The **Cost/Selling basis of the original confirmation is permanently unchangeable, even during the recovery window.** The redo confirmation is a wholly independent confirmation with its own, separately-chosen basis — recovering from an accidental confirmation is not a mechanism for revising a deliberately-chosen basis after the fact (Decision H).

## 3. This Is a Bounded Exception to Principle 2.10 — Not a Reversal of It

`02-core-product-principles.md` §2.10 states: *"Once a record represents a financial fact the owner needs to trust later (a Closing, a finalized batch, the Initial Stock Count, a completed audit-log entry), it is never edited in place. Corrections are new records that reference what they correct, and the original is preserved."* As written, this statement is unconditional — it names no carve-out, no time window, and no actor who may bypass it. `08-module-architecture.md` §8.6 restates this for Stock Counts specifically ("the one permanently immutable record in the entire schema... can never be edited or deleted by any role, including Admin"), and `firestore.rules`' own in-code comment for the `stockCounts` block names this explicitly as Architecture 8.6's **"no exceptions" immutability tier**, enforced at the Security Rules layer, not merely by UI omission.

This BDR authorizes exactly one, narrowly bounded exception to that unconditional statement — not a redefinition of Principle 2.10, not a general "immutable records may sometimes be corrected" precedent, and not a change to how any other Principle-2.10-governed record (Closings, finalized batches, completed audit-log entries) behaves. What makes it narrow, specifically:

1. **Time-boxed.** The exception exists only inside a fixed 30-minute window from the original confirmation's own timestamp. It is not restartable and not Owner-extendable (Decision B). Outside that window, Principle 2.10 applies with zero exception, exactly as it does today (Decision F).
2. **Owner-only.** No other role may invoke it, matching the authorization tier every other capital-affecting action already requires (Decision E) — this is not a broadening of who may touch an immutable record, only a narrow addition to what the Owner specifically may do, and only within the window.
3. **The original is never edited or deleted.** Void & Redo does not modify the frozen record Principle 2.10 protects — it adds a new record (the redo) and a status marker (voided) on the original. The original's own fields remain byte-for-byte exactly as confirmed (Decision D).
4. **The original's basis is never changed.** Even during the recovery window, the original's Cost/Selling basis is permanently unchangeable — recovery does not become a backdoor for revising a deliberately-chosen basis (Decision H). This is the same immutability discipline `BDR-0014` Decision 3 already requires of every historical Initial Stock fact, applied here to the voided-but-preserved original specifically.
5. **Exactly one fresh confirmation supersedes the original for calculation purposes**, and only once it exists (Decision G) — this is a substitution of which record downstream calculations read, not a mutation of either record.

Taken together, this is a single, named, bounded case carved into Principle 2.10 — not a rewrite of the principle's own wording, and not authority for any future "immutable, except when..." reasoning beyond this one case.

## 4. What This Conflicts With Today, and What Remains Open

**Direct conflicts, both already identified above and reconciled by the narrowness of §3:**

1. **`02-core-product-principles.md` §2.10's own unconditional statement** — it currently names no exception of any kind. This BDR is the first documented case that requires one.
2. **`firestore.rules`' current, unconditional `stockCounts` rule** (`allow update, delete: if isOwnerOf(businessId) && resource.data.get('type', null) != 'initial';`) — today this refuses update/delete for `type == 'initial'` with no time-boxed or role-based carve-out at all. Implementing Void & Redo will require this rule to change. **This BDR does not change `firestore.rules`, or decide how it should change** — that is explicitly out of scope (§5).

**Flagged, not decided, per the Governance Instruction for this session:** whether `02-core-product-principles.md` itself needs a cross-reference or amendment note pointing at this BDR — the way, for example, other principles' sections sometimes note where a documented exception is recorded (§1's own ordering rule: *"unless a documented exception is recorded in the relevant section"*) — is an open documentation-structure question this BDR surfaces rather than resolves. This BDR does not itself add, or authorize anyone else to silently add, such a cross-reference; that remains a decision for the Product Architect, at the Product Architect's discretion, potentially alongside or ahead of the Specification stage that follows this BDR.

## 5. What This BDR Does NOT Decide or Authorize

Consistent with the governance chain (`Business Philosophy → BDR → Policy → Module Specifications → Rule 8 → Implementation`), this BDR fixes only the business decision in §2–§3. It explicitly does **not** decide, design, or authorize:

- Any Firestore schema change (no field names, no document shape for a "voided" marker or a redo-linkage reference).
- Any "void" field design or status-representation mechanism.
- Any server-timestamp implementation detail for measuring the 30-minute window.
- Any `firestore.rules` change (§4 identifies that a change will eventually be required; this BDR does not write it).
- Any UI/interaction design for triggering, confirming, or displaying a Void & Redo action.
- Any draft-restoration mechanism (how "the exact pre-confirmation draft state," Decision C, is technically reconstructed or retained).
- Any migration or backfill strategy.

Each of these is reserved for the Specification, Rule 8 Assessment, and Implementation Authorization stages that must follow this BDR, per this repository's own governance chain.

## 6. Explicit Non-Modification of BDR-0014 and Its Governance Chain

**This BDR does not modify, reopen, or otherwise touch `BDR-0014`, its two companion amendments, the accepted Specification, the Rule 8 Assessment, or the signed Implementation Authorization for the Dual-Valuation-Basis feature.**

The reason is structural, not incidental: `BDR-0014` and this BDR govern two different moments in an Initial Stock record's lifecycle. `BDR-0014` governs what a confirmation *contains and means once it is final* — that both a cost and a selling valuation basis are preserved, and that the Owner may choose which basis Initial Capital displays, permanently, once set (`BDR-0014` Decisions 1–2, §5.A item 2). This BDR governs a narrow, time-boxed *pathway around* confirmation itself — recovering from an accidental one, within 30 minutes, before the normal finality `BDR-0014` assumes has had a chance to matter.

Nothing in `BDR-0014` is reopened by this BDR, because Decision H (§2, above) keeps the original confirmation's basis exactly as immutable as `BDR-0014` already requires: even during the recovery window, the original's Cost/Selling basis cannot change, and the redo confirmation makes its own independent, separately-chosen basis decision — exactly the same one-time, fixed-once-set choice `BDR-0014` §5.A item 2 already governs for any Initial Stock confirmation. Void & Redo produces a second confirmation event; it does not alter what `BDR-0014` says a confirmation event means.

## 7. Business Acceptance Criteria

1. An accidental Initial Stock confirmation is recoverable via Void & Redo, and only via Void & Redo — no other recovery path is authorized (Decision A).
2. The recovery window is exactly 30 minutes from the original confirmation's own timestamp, is not restartable, and is not Owner-extendable (Decision B).
3. Triggering recovery resumes the Owner from the exact pre-confirmation draft state (Decision C).
4. The original confirmation is never edited or deleted; it remains permanently visible in audit/history, explicitly marked voided (Decision D).
5. Only the Owner may trigger recovery — no Manager or Staff access (Decision E).
6. After 30 minutes elapse, no recovery path exists under any circumstance, and the original confirmation is completely final (Decision F).
7. Once a redo confirmation exists, it is the only Initial Stock confirmation Capital Growth and current business-state calculations read (Decision G).
8. The original confirmation's Cost/Selling basis never changes, including during the recovery window; the redo confirmation has its own independent, separately-chosen basis (Decision H).
9. No historically confirmed fact of the original — including its now-voided status marker — is itself later editable once written, consistent with Principle 2.10's own discipline applied to the voided record.
10. No technical architecture, schema, algorithm, or UI is committed anywhere in this document (§5).

## 8. Governance Notes

- This is a Business Decision Record only. No `src/`, `server/`, `firestore.rules`, or `tests/` file is touched by this document.
- This BDR does not modify `BDR-0014` or any artifact in its governance chain (§6).
- This BDR does not modify `02-core-product-principles.md`; it flags, without deciding, whether that document needs a cross-reference/amendment note as a consequence of this exception existing (§4).
- No `POL-NNNN` or `POL-NN-###` number is assigned by this document, per `19-governance-bdr-policy-framework.md`'s explicit assignment-authority rule.
- `docs/specs/README.md` is not modified by this document.
- Per the Governance Instruction for this session, this BDR stops here for Product Architect review/approval before any further governance step (Specification, Rule 8 Assessment, or Implementation Authorization) proceeds.

## 9. Product Architect Decision (Recorded Verbatim)

**Status:** ✅ **Approved**, as communicated directly in the prior investigation session's Decision Interface, reproduced here per this repository's established practice of recording a Product Architect decision's substance directly in the governing artifact (see, e.g., `BDR-0014` §10–§11's own precedent).

> **Option B — Void & Redo is APPROVED.**
>
> **A.** Accidental early confirmation IS recoverable for 30 minutes via a Void & Redo mechanism.
> **B.** The 30-minute window begins at the ORIGINAL confirmation timestamp — not restartable, not owner-extendable.
> **C.** During recovery, the owner resumes from the exact pre-confirmation draft state.
> **D.** The original accidental confirmation remains permanently visible in audit/history, explicitly marked as voided.
> **E.** Recovery is owner-only — no Manager/Staff access, matching every other capital-affecting action's existing authorization tier.
> **F.** Once 30 minutes expire, the original confirmation is completely final — no recovery path exists after that point, under any circumstance.
> **G.** The replacement (redo) confirmation is the ONLY Initial Stock confirmation Capital Growth and current business-state calculations read, once one exists.
> **H.** The Cost/Selling basis of the ORIGINAL confirmation is permanently unchangeable, even during recovery — the redo confirmation gets its own independent, separately-chosen basis.
>
> **Net shape:** A new BDR authorizing one narrow, time-boxed, owner-only exception to Architecture Principle 2.10 — the original confirmed 'initial' StockCount is never edited or deleted, remains visible as voided historical fact with its basis frozen exactly as recorded, and a fresh confirmation completed within 30 minutes of the original becomes the sole record Capital Growth/current state reads going forward. After 30 minutes, no exception applies and the original stands as final, exactly as Principle 2.10 already requires today.

**This acceptance authorizes exactly what §2–§4 of this document describe — nothing more.** It does not authorize a Firestore schema, a "void" field design, a server-timestamp implementation, a security-rule change, a UI, a draft-restoration mechanism, or a migration (§5) — each remains its own, separately-gated future step.
