Decision Record

# POL-0008 — Initial Stock Accidental Confirmation Recovery Policy ("Void & Redo")

**Status:** ✅ **Approved.** Number, all four Policy-level questions (visibility, expired draft, redo recovery, chain ceiling), and final approval all recorded by explicit Product Architect decision — see "Numbering" (below) and "Product Architect Decisions Resolving Remaining Policy-Level Questions" (below). No Policy-level open question remains.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record's "why/what philosophy" into the "how, specifically" operational rule a future Business Domain Specification will need. Does not itself decide strategic philosophy (that is `BDR-0015`'s role, already settled) and does not itself define a technical implementation (Firestore schema, security rules, timestamp mechanism, UI, or algorithm — all reserved for Specification/Rule 8/Implementation Authorization).
**Location note:** Intended to be filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace `19-governance-bdr-policy-framework.md`'s Numbering Ledger addendum establishes — the same namespace `POL-0001`–`POL-0007` already occupy — because this Policy's subject (Initial Stock confirmation recovery, with a direct read-path effect on Capital Growth) is cross-cutting in exactly the same sense that led `BDR-0004`, `BDR-0008`, `BDR-0009`, `BDR-0012`, `BDR-0013`, `BDR-0014`, and `BDR-0015` itself to be filed unprefixed.
**Depends on:** [`BDR-0015`](./BDR-0015-initial-stock-accidental-confirmation-recovery.md) (Approved) — specifically Decisions A–H recorded in its §9, and the narrow-exception framing of its §3. This Policy also depends on, without amending, [`BDR-0014`](./BDR-0014-initial-stock-dual-valuation-basis.md) and its accepted companion amendment [`10-initial-stock-dual-valuation-basis-amendment.md`](./10-initial-stock-dual-valuation-basis-amendment.md), so that this Policy's operational rules for the redo confirmation's basis do not conflict with the frozen cost/selling-basis mechanics those documents already establish (see "Relationship to the Dual-Valuation-Basis Rules," below).
**Does not amend:** `BDR-0015`, `BDR-0014`, either of `BDR-0014`'s companion amendments, `02-core-product-principles.md`, `10-stock-counts.md`, `10-initial-stock-valuation-history-amendment.md`, `firestore.rules`, or any application code.
**Followed by:** A Business Domain Specification (functional requirements and acceptance criteria for the eventual `initial-stock` module changes), a Rule 8 Assessment, and a signed Implementation Authorization — each its own separate, explicitly gated step, none of which this document performs or authorizes.

> **⚠️ Amendment Notice:** this document's recovery-window figure — **30
> minutes** — has been amended to **12 hours** by the
> [Recovery Window Amendment](./initial-stock-accidental-confirmation-recovery-window-amendment.md).
> This affects Rule B, Rule F, Rule J, Rule L, and Decisions 2, 3, 4, and 5,
> below. Measurement (from each confirmation event's own frozen timestamp),
> no-restart, and no-extension are unchanged. Every other rule in this
> Policy — including the 3-recovery-cycle/4-confirmation-event ceiling —
> remains exactly as originally approved. The original text below is
> preserved unedited as the historical record of the original decision.

---

## Numbering

`19-governance-bdr-policy-framework.md`'s own Numbering Ledger addendum states, in terms that apply directly here: *"Assignment authority: until a more formal, repository-wide numbering rule is established, assigning a `POL-NNNN` number requires an explicit Product Architect decision, made each time... No `POL-NNNN` number may be inferred from repository state, from the highest previously-assigned number, or from any other document's convention."*

This document's prior draft correctly withheld self-assignment, noting only that `POL-0008` was the next sequential candidate. **`POL-0008` is now explicitly assigned to this Policy by direct Product Architect decision** (recorded in full under "Product Architect Decisions Resolving Remaining Policy-Level Questions," below), satisfying the Ledger's assignment-authority rule. This number was not inferred by this document — it was confirmed the same way `BDR-0012`–`BDR-0015` each required explicit numbering, and consistent with the Ledger's own precedent for `POL-19-012` ("do not use this number for any other topic without an explicit Product Architect decision").

## Purpose

`BDR-0015` establishes, as approved business philosophy, that an accidental early Initial Stock confirmation is recoverable via Void & Redo, within a fixed 30-minute window, Owner-only, without ever editing or deleting the original confirmation. This Policy answers the operational "how, specifically" questions that sit between that business decision and a future Specification — the same role `POL-0006` plays for `BDR-0012`'s temporary-override question — without deciding any technical implementation detail.

## Terminology — Preserved, Not Redefined

**Initial Stock** means the products physically counted when a business establishes its Initial Capital baseline — the confirmed `type: 'initial'` `StockCount` (`10-stock-counts.md` Purpose; Architecture §3.8.3, §8.6; Principle 2.10). **Initial Stock is not, and this Policy does not treat it as, the first supplier stock batch (`StockBatch`) entered via Add Stock after Initial Capital has already been established.** Every operational rule in this Policy applies exclusively to the `initial` Stock Count and its confirmation event — never to an ordinary purchase/restock event, regardless of how early in a business's lifecycle that purchase occurs. This distinction is load-bearing throughout: Void & Redo recovers an accidental *Initial Stock* confirmation specifically, and has no bearing on, and creates no analogous recovery mechanism for, any `StockBatch` entry.

## Operational Rules

Rules A–I below each operationalize one lettered Decision from `BDR-0015` §9; numbering mirrors that lettering for direct traceability. Rules J–L resolve Policy-level operational questions this Policy's own prior draft left open, now settled by explicit Product Architect decision (recorded in full below) rather than by inference.

**Rule A — Sole recovery path.** Void & Redo is the only recovery mechanism this Policy recognizes for an accidental Initial Stock confirmation. No other recovery path (manual support intervention, direct data correction, or any other means) is authorized by this Policy or by `BDR-0015`. Operationally: any future Specification must not introduce a second recovery mechanism without its own separate BDR-level authorization.

**Rule B — Window measurement.** The original confirmation's 30-minute recovery window is measured from **the original confirmation's own timestamp** — the moment the original `initial` Stock Count was confirmed — not from when the Owner opens the recovery flow, not from when any error is discovered, and not from any other event. That window does not restart on any action (viewing the voided record, attempting and abandoning a recovery flow, or any other interaction) and cannot be extended by the Owner, by any other role, or by any support mechanism. This measurement rule is not unique to the original confirmation — Rule J, below, extends the identical measurement principle (own timestamp; no restart; no extension) to a redo confirmation's own window. Operationally: whatever moment a future Specification designates as "a confirmation's own timestamp" must be a single, unambiguous, already-frozen fact of that specific confirmation — this Policy does not itself specify which existing or new field serves that role (a technical/schema question, out of scope here).

**Rule C — Exactness of restored draft state.** "Resumes from the exact pre-confirmation draft state" means the Owner sees, upon triggering recovery, precisely what the Initial Stock draft contained immediately before the original confirmation — the same products, portions, quantities, units, and cost/selling prices, with nothing added, removed, or altered by the recovery action itself. Operationally: whether this is achieved by retaining the pre-confirmation draft record, reconstructing it from the voided confirmation's own data, or some other technical means is explicitly a Rule 8/Specification question this Policy does not decide. What this Policy fixes is the business requirement the technical mechanism must satisfy: draft-state exactness, not draft-state approximation.

**Rule D — Original preserved and marked voided.** The original confirmation is never edited or deleted, under any part of the recovery flow, at any point before, during, or after the 30-minute window. It remains permanently visible in audit/history, carrying an explicit, unambiguous voided marker distinguishing it from a normal, non-voided confirmation. Operationally: this Policy requires that any consumer capable of displaying Initial Stock history (audit views, reports, SuperAdmin diligence views) be able to distinguish a voided original from an active confirmation — it does not specify the visual treatment, field name, or data shape that achieves this.

**Rule E — Owner-only authorization.** Triggering Void & Redo requires Owner-tier authorization, matching the tier every other capital-affecting action in this schema already requires (Initial Stock confirmation itself, Withdrawals, Closings). No Manager or Staff role may trigger recovery, view the recovery flow as an available action, or otherwise initiate any part of Void & Redo, regardless of any future Manager-tier permission grants elsewhere in the system. Operationally: this must be enforced at the same authorization layer (Security Rules, not merely UI omission) that already governs the original confirmation's own immutability — this Policy states the requirement; it does not write the rule.

**Rule F — Hard expiry, no exception.** Once 30 minutes elapse from the original confirmation's timestamp, the original confirmation is completely and permanently final. No recovery path exists after that point for that confirmation, under any circumstance — not Owner request, not support escalation, not any future policy amendment short of a new Product Architect decision reopening this question at the BDR level. Operationally: any future Specification must ensure that an expired recovery opportunity is unconditionally unavailable — no soft warning state, no grace period, no manual override.

**Rule G — Sole read path once redo exists.** Once a redo confirmation exists for a given business, it — and only it — is the Initial Stock confirmation that Capital Growth and every other current-business-state calculation reads. The voided original is never read by any live calculation, past this point; it exists solely as a permanent historical/audit fact (Rule D). Operationally: a future Specification must identify every existing consumer of `initialCapitalValue`/`initialStockCount` (the same set `BDR-0014` §4 item 4 and its companion `02-capital-growth-dual-basis-amendment.md` already enumerate for a different reason) and ensure each one resolves to the redo confirmation, never the voided original, once a redo exists. This Policy does not itself enumerate those consumers or specify how the switch is implemented.

**Rule H — Independent, frozen bases for original and redo.** The original confirmation's Cost/Selling basis (per `BDR-0014` Decision 2 and its companion amendment's frozen-pointer mechanism) remains permanently unchangeable, including throughout the 30-minute recovery window — voiding a confirmation does not unfreeze the basis choice that confirmation already made. The redo confirmation is a wholly new, independent Initial Stock confirmation event: it makes its own, separately-chosen basis decision, governed by the same `BDR-0014`/dual-valuation-amendment mechanics as any other Initial Stock confirmation, with no inheritance, default, or carry-over from the voided original's basis choice. Operationally: this Policy requires that a future Specification treat the redo confirmation's basis selection as a fresh instance of the existing dual-valuation-basis flow `BDR-0014` already governs — not as a special case requiring new rules.

**Rule I — No silent rewriting.** Consistent with Rule D and with `BDR-0015` §3 item 3, no operational mechanism introduced to satisfy Rules A–H may, as a side effect, edit, delete, or silently reinterpret any historical fact of the original confirmation — including its voided marker, once set. A future Specification must treat the voided marker itself as a one-way, permanently frozen fact, exactly as `BDR-0015` §3 item 4 already requires for the original's basis.

**Rule J — Each confirmation event carries its own independent recovery window, up to a 3-recovery-cycle ceiling; the original's window never restarts.** A redo confirmation, once it exists, is itself a new Initial Stock confirmation event — and, as such, is covered by every rule in this Policy (A–I) exactly as the original was, including its own, independent 30-minute Void & Redo recovery window, measured from **that redo confirmation's own timestamp** (per the Product Architect decision recorded below) — subject to the recovery-cycle ceiling stated later in this Rule. To state the full sequence precisely, distinguishing each confirmation's own window:

- **The original confirmation** has its own 30-minute window, from its own timestamp (Rule B). If unused, it expires under Rule F and becomes permanently final. If used, Void & Redo voids it (Rule D) and produces a redo confirmation — the original's window is consumed by this act, not restarted or extended; Rule B's "never restarts or extends" language governs the original specifically and is unaffected by this Rule.
- **The redo confirmation**, once it exists, has its **own** 30-minute window, from **its own** timestamp — a new instance of the same rule (Rule B's measurement principle), applied to a new confirmation event. This window is independent of, and unrelated in duration or start point to, the original's now-expired or now-consumed window.
- If the redo confirmation is itself voided within its own window, the same pattern repeats: the redo becomes a voided historical fact (Rule D applies to it exactly as to any voided confirmation), a further replacement confirmation is produced, and that replacement receives its own 30-minute window in turn — **up to the 3-recovery-cycle ceiling** stated below; once consumed, the pattern does not repeat further.

**This Policy does not authorize an unlimited or indefinite chain of recovery. A single Initial Stock setup may undergo a maximum of 3 Void & Redo recovery cycles — meaning at most 4 confirmation events in the chain (the original, plus up to 3 replacements)** (per the Product Architect decision recorded below). Precisely: Confirmation #1 (the original) may be recovered — recovery cycle 1 — producing Confirmation #2; Confirmation #2 may be recovered — recovery cycle 2 — producing Confirmation #3; Confirmation #3 may be recovered — recovery cycle 3 — producing Confirmation #4. Once these 3 recovery cycles are consumed, Confirmation #4 receives its own independent 30-minute window exactly as every confirmation before it did (this Rule's own independent-window guarantee is unchanged and unweakened by the ceiling), but it may not itself be voided and redone — no 4th recovery cycle, and no 5th confirmation, is permitted under this mechanism. This is a ceiling on **recovery cycles**, not on confirmation events considered individually — each of the (at most 4) confirmation events still independently receives its own full, unshortened 30-minute window (Rule B's measurement principle, unaltered); what the ceiling limits is how many times that window may be used to produce a further replacement.

**Rule K — Recovery-window visibility is a business requirement.** The Owner must be clearly informed that a Void & Redo recovery window exists and, while it remains open, that it is currently active for the confirmation in question. This is a business/functional requirement, not a technical or design one: this Policy does not decide the wording, visual treatment, countdown mechanism, notification channel, or any other implementation detail of how that awareness is created — only that the Owner must not be left to independently know or guess that recovery is available. This applies identically to the original confirmation's window (Rule B) and to any redo confirmation's own window (Rule J).

**Rule L — An expired, unused draft has no continuing recovery purpose.** Once a confirmation's own 30-minute window (Rule B; Rule J for a redo) elapses without recovery having been triggered, the pre-confirmation draft state Rule C describes no longer serves any recovery function for that confirmation — Rule F's hard expiry means there is nothing left for that draft data to restore. This Policy does not decide whether the draft is deleted, retained, archived, or stored in any particular way once this point is reached; that lifecycle/storage question is reserved for Specification/Rule 8, per the Scope Exclusions below. What this Policy fixes is only the business fact: past expiry, an unused draft's recovery purpose has ended.

## Relationship to the Dual-Valuation-Basis Rules (`BDR-0014` and Its Companion Amendment)

This Policy does not modify, narrow, or reinterpret `BDR-0014`, its companion amendments, or their accepted mechanics. The relationship is additive and non-conflicting by construction:

- `BDR-0014`/its amendment govern **what a single Initial Stock confirmation contains and means once final** — two frozen valuation totals, plus a frozen pointer selecting which one is "Initial Capital." Nothing in that mechanism assumes there is exactly one confirmation ever created for a business; it governs the shape of *a* confirmation.
- `BDR-0015`/this Policy govern **a pathway that may produce a second confirmation event** (the redo) when the first was accidental. Rule H is explicit that the redo confirmation undergoes that identical, unmodified `BDR-0014` mechanism independently — it is not a special or partial confirmation, and its basis pointer is frozen exactly as any other confirmation's would be, at the moment of its own confirmation.
- The voided original retains its own frozen valuation totals and basis pointer forever (Rule D, Rule H) — `BDR-0014`'s immutability guarantee is not weakened for the voided record; it is exactly as strong as it is for any confirmed-and-never-voided record. The only thing that changes is which confirmation downstream calculations read (Rule G) — a substitution of read target, not a mutation of either record's own contents.

No amendment to `BDR-0014`, its companion amendments, the accepted Specification, the Rule 8 Assessment, or the signed Implementation Authorization for the Dual-Valuation-Basis feature is required or proposed by this Policy.

## Scope Exclusions — Technical Implementation Not Decided Here

Consistent with `BDR-0015` §5 and the Policy/Specification boundary `19-governance-bdr-policy-framework.md` §2 draws, this Policy does **not** decide:

- Firestore schema or field names (for the voided marker, the redo-to-original linkage, or any other data element).
- The timestamp implementation used to measure the 30-minute window (server timestamp vs. client-submitted vs. any other mechanism).
- The `firestore.rules` implementation of Owner-only, time-boxed recovery authorization.
- The draft-storage mechanism achieving Rule C's exactness requirement.
- The exact UI/interaction layout for triggering, confirming, or displaying Void & Redo.
- Database transaction design for the void-and-create-redo operation.
- API design for any endpoint or function implementing this flow.
- Migration or backfill strategy for any Initial Stock count confirmed before this capability exists.
- Any algorithm (e.g., how "current-business-state calculations" locate the correct confirmation to read).

Each of these remains reserved for the Specification, Rule 8 Assessment, and Implementation Authorization stages that must follow.

## Genuine Open Questions — Not Silently Resolved

The Policy's prior draft flagged three operational-layer questions (visibility, expired draft, redo recovery), each resolved by explicit Product Architect decision and incorporated into Rules J, K, and L. A fourth question — whether a ceiling should exist on how many times a confirmation can be voided and redone in succession — was subsequently surfaced by that same round of decisions and is now also resolved: the Product Architect has set a maximum of 3 Void & Redo recovery cycles per Initial Stock setup (at most 4 confirmation events), recorded as Decision 5 below and incorporated into Rule J.

**No Policy-level open question remains.** This section is retained, empty of open items, to preserve the document's demonstrated discipline of surfacing rather than silently resolving open questions — should a future review of this Policy identify a new one, it belongs here.

## Product Architect Decisions Resolving Remaining Policy-Level Questions (Recorded Verbatim)

**Status:** ✅ **Approved**, as communicated directly following review of this Policy's prior draft, reproduced here per this repository's established practice of recording a Product Architect decision's substance directly in the governing artifact (`BDR-0014` §10–§11, `BDR-0015` §9 precedent).

> **1. POLICY NUMBER** — Explicitly assign: `POL-0008`. Title: *Initial Stock Accidental Confirmation Recovery Policy ("Void & Redo")*.
>
> **2. RECOVERY-WINDOW VISIBILITY** — ACCEPT: the Owner must be clearly informed that the Void & Redo recovery window exists and that the 30-minute window is active. This is a business/functional requirement only; UI design, wording, countdown implementation, and technical mechanism belong to Specification/Rule 8.
>
> **3. EXPIRED UNUSED DRAFT** — ACCEPT: once the 30-minute recovery window expires without recovery, the pre-confirmation draft has no continuing recovery purpose. Whether the draft is deleted, retained, archived, or stored in any particular way remains a Specification/Rule 8 technical/lifecycle question, not decided here.
>
> **4. REDO RECOVERY** — ACCEPT: the redo confirmation is itself a new Initial Stock confirmation and receives its own independent 30-minute Void & Redo recovery window from its own confirmation timestamp. Sequence: original confirmation → 30-minute recovery window → Void & Redo → exact pre-confirmation draft restored → Owner edits/reviews → fresh Cost/Selling basis selection → redo confirmation → redo gets its own independent 30-minute recovery window. The original confirmation's 30-minute window never restarts or extends. Each confirmation event has its own independent 30-minute window. **Not** to be interpreted as authorizing an unlimited or indefinite chain of recovery — the Policy states the precise business rule (Rule J) and identifies the additional technical constraint this raises for Specification/Rule 8 (resolved below, Decision 5).
>
> **5. CHAIN CEILING** — ACCEPT: Void & Redo may occur for a maximum of 3 recovery cycles for a single Initial Stock setup. Interpreted precisely: Confirmation #1 (the original) receives its own 30-minute recovery window; if recovered, that is recovery cycle 1, producing Confirmation #2. Confirmation #2 receives its own independent 30-minute recovery window; if recovered, that is recovery cycle 2, producing Confirmation #3. Confirmation #3 receives its own independent 30-minute recovery window; if recovered, that is recovery cycle 3, producing Confirmation #4. Confirmation #4 receives its own independent 30-minute recovery window like every confirmation before it — but once the 3 recovery cycles are consumed, no further Void & Redo is permitted: Confirmation #4 may not itself be voided and redone. There can therefore be at most 4 confirmation events in the chain — the original plus 3 replacements — and no 5th confirmation may be created through this mechanism. Each confirmation's own 30-minute window remains measured from that confirmation's own timestamp; the original confirmation's window never restarts or extends, and the same applies to every subsequent confirmation. This is a ceiling of 3 **recovery cycles**, not a ceiling of 3 confirmation events — it permits up to 4 confirmation events.

**This decision incorporates directly into Rules J, K, and L, above, and resolves all four questions the "Genuine Open Questions" section has raised across this Policy's drafting and review — including the chain-ceiling question, now resolved by Decision 5.** It does not modify any previously accepted `BDR-0015` decision, does not modify `BDR-0014` or its dual-valuation-basis governance chain, and does not modify Architecture Principle 2.10 itself. It does not decide Firestore schema, field names, timestamps, security rules, transactions, draft-storage mechanisms, UI layout, API design, or algorithms — each remains reserved for Specification/Rule 8/Implementation Authorization, per the Scope Exclusions above.

## Business Acceptance Criteria

1. Every operational rule (A–I, above) is stated in terms a future Specification can convert directly into functional requirements, without requiring reinterpretation of `BDR-0015`.
2. No rule in this Policy conflicts with, narrows, or silently extends any Decision in `BDR-0015` §9 or `BDR-0014`'s dual-valuation mechanics.
3. The Initial-Stock-vs.-first-supplier-batch terminology distinction is preserved and applied consistently throughout.
4. No technical implementation detail (schema, rules, timestamp mechanism, UI, transaction, API, migration, algorithm) is committed by this document.
5. Recovery-window visibility is stated as a business/functional requirement only (Rule K), with no UI/wording/mechanism decided.
6. An expired, unused draft's loss of recovery purpose is stated as a business fact only (Rule L), with no deletion/retention/storage decision made.
7. Each confirmation event's independent 30-minute window — original and any subsequent redo alike — is stated precisely (Rule J), and is now bounded by an explicit ceiling: a maximum of 3 Void & Redo recovery cycles per Initial Stock setup, permitting at most 4 confirmation events (the original plus up to 3 replacements) — never an unlimited or indefinite chain.
8. No Policy-level open question remains; the chain-ceiling question is resolved (Decision 5) and no other question is outstanding.

## Governance Notes

- This is a Policy document only. No `src/`, `server/`, `firestore.rules`, or `tests/` file is touched by this document.
- This Policy does not modify `BDR-0015`, `BDR-0014`, either `BDR-0014` companion amendment, or Architecture Principle 2.10 itself.
- This Policy does not create a Specification, Rule 8 Assessment, or Implementation Authorization.
- This Policy's identifier, `POL-0008`, is explicitly assigned by direct Product Architect decision (above), per `19-governance-bdr-policy-framework.md`'s Numbering Ledger assignment-authority rule.
- `docs/specs/README.md` and `19-governance-bdr-policy-framework.md`'s Numbering Ledger are not modified by this document; recording `POL-0008` in the Ledger's `POL-NNNN` table is a follow-on documentation step, not performed here.

## Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3's governing hierarchy, now that `POL-0008` is Approved and its remaining Policy-level question (chain ceiling) is resolved (Decision 5): the next governance step is a Business Domain Specification covering the Initial Stock module's Void & Redo functional requirements, informed by this Policy's Rules A–L, including the 3-recovery-cycle/4-confirmation-event ceiling. Not drafted, started, or authorized by this document.

**Lifecycle:** Drafted → Product Architect review → **Approved** (this step, with all Policy-level questions now resolved). Not yet Specified. Not Implemented.
