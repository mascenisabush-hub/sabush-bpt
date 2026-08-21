Decision Record

# POL-0009 — SuperAdmin-Assisted Initial Stock Recovery Policy

**Status:** ✅ **Approved.** Numbering and all Policy-level questions — authorization duration (48 hours, exact figure now confirmed), single-active-Authorization-per-business, and current-confirmation-only — are resolved by explicit Product Architect decision, recorded verbatim below. No Policy-level open question remains.
**Type:** Policy document, per the category `19-governance-bdr-policy-framework.md` §2 establishes. Operationalizes `BDR-0016`'s approved "why/what philosophy" into the "how, specifically" operational rule a future Specification will need. Does not itself decide strategic philosophy (that is `BDR-0016`'s role) and does not itself define a technical implementation (Firestore schema, security rules, timestamp mechanism, UI, or algorithm — all reserved for Specification/Rule 8/Implementation Authorization).
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace `19-governance-bdr-policy-framework.md`'s Numbering Ledger addendum establishes — the same namespace `POL-0001`–`POL-0008` already occupy — because this Policy's subject (a SuperAdmin platform action with a direct effect on a specific tenant's Initial Stock/Capital Growth state) is cross-cutting in the same sense that led `BDR-0015`/`POL-0008` to be filed unprefixed.
**Depends on:** [`BDR-0016`](./BDR-0016-superadmin-assisted-initial-stock-recovery.md) (Draft) — specifically the decisions recorded in its §2–§7 and the two open questions its §9 surfaces, now resolved below by explicit Product Architect decision. This Policy also depends on, without amending, [`BDR-0015`](./BDR-0015-initial-stock-accidental-confirmation-recovery.md) and [`POL-0008`](./POL-0008-initial-stock-accidental-confirmation-recovery-policy.md) — every operational rule below is written to compose with, not duplicate or override, `POL-0008`'s Rules A–L.
**Does not amend:** `BDR-0016`, `BDR-0015`, `POL-0008`, the accepted Void & Redo Specification, its Rule 8 Assessment, its signed Implementation Authorization, `BDR-0014` and its dual-valuation-basis chain, `BDR-0011`, `ADR-0005`, or `02-core-product-principles.md`.
**Followed by:** A Business Domain Specification (functional requirements and acceptance criteria), a Rule 8 Assessment, and a signed Implementation Authorization — each its own separate, explicitly gated step, none of which this document performs or authorizes.

---

## Numbering and Product Architect Decisions (Recorded Verbatim)

**Status:** ✅ Numbering explicitly assigned. All Policy-level questions resolved by explicit Product Architect decision, reproduced here per this repository's established practice (`BDR-0014` §10–§11, `BDR-0015` §9, `POL-0008` precedent).

> **1. POLICY NUMBER** — `POL-0009` is explicitly assigned to this Policy, per the same Product Architect decision recorded in `BDR-0016` §9 ("I am the Product Architect, and I explicitly assign the next governance numbers... POL-0009 = SuperAdmin-Assisted Initial Stock Recovery Policy").
>
> **2. AUTHORIZATION DURATION — APPROVED at 48 hours.**
> `authorizedAt` is the server-recorded grant time. Authorization expires 48 hours after `authorizedAt`. This is completely separate from the normal 12-hour `confirmedAt` recovery window. No extension or automatic renewal.
>
> **3. SINGLE ACTIVE AUTHORIZATION PER BUSINESS — APPROVED.**
> A business may have at most one active, unconsumed SuperAdmin recovery Authorization at a time. Do not allow multiple simultaneous active authorizations for the same business. This is an operational safety constraint, not a new recovery mechanism.
>
> **4. CURRENT-CONFIRMATION-ONLY — APPROVED.**
> SuperAdmin may authorize only the business's currently active Initial Stock confirmation. Historical/non-current confirmations cannot be newly authorized. This must be enforced technically, not merely described as a UI convention.
>
> **5. CEILING ACCOUNTING FOR LEGACY CONFIRMATIONS — APPROVED** (recorded in `BDR-0016` §9, restated here for direct Policy traceability): a legacy confirmation, once it undergoes its first authorized recovery, is treated as **Confirmation #1** for chain-ceiling purposes — identically to how any ordinary first Initial Stock confirmation is treated under `POL-0008` Rule J. That first authorized recovery consumes **recovery cycle 1** of the existing 3-cycle ceiling, producing Confirmation #2, after which the chain proceeds under `POL-0008` Rule J's existing counting scheme exactly as it would for any non-legacy chain — up to the same maximum of 4 confirmation events. No new or separate ceiling is created for legacy confirmations.

**This decision resolves every open question `BDR-0016` §9 and this Policy's prior draft surfaced.** It does not modify any `BDR-0015`/`POL-0008` decision, does not modify `BDR-0014`, and does not decide Firestore schema, field names, timestamps, security rules, or UI — each remains reserved for Specification/Rule 8/Implementation Authorization.

## Purpose

`BDR-0016` establishes, as approved business philosophy, that a legacy or expired-window Initial Stock confirmation may become eligible for the existing Void & Redo mechanism through a governed SuperAdmin authorization, Owner-consumed, one-time, time-bounded, and auditable. This Policy answers the operational "how, specifically" questions between that business decision and a future Specification — the same role `POL-0008` plays for `BDR-0015`.

## Terminology — Preserved, Not Redefined

**Initial Stock**, **Void & Redo**, **the original confirmation**, **the redo confirmation**, and **chain position** all carry exactly the meaning `POL-0008`'s own Terminology section already fixes. This Policy adds two new terms, scoped precisely so they do not overload existing vocabulary:

- **Authorization** (this Policy's term, not to be confused with the signed governance "Implementation Authorization" artifact used elsewhere in this repository's process) — the SuperAdmin-granted artifact this Policy defines: a scoped, time-bounded permission that makes one specific, otherwise-ineligible confirmation eligible to enter the existing Void & Redo flow. An Authorization is not itself a Void, not itself a Redo, and not itself a confirmation event of any kind.
- **`authorizedAt`** — the server-recorded moment an Authorization is granted. Distinct from, and never a substitute for, `confirmedAt` (the moment a Stock Count confirmation occurred) or any future void-record timestamp `POL-0008`/Specification-stage work introduces. `authorizedAt` is never written onto the original `StockCount`.

## Operational Rules

**Rule M — Eligibility gate, not a new recovery mechanism.** An Authorization does exactly one thing: it makes a specific, named, otherwise-ineligible confirmation eligible to enter the Void & Redo flow `POL-0008` already fully governs. Once a confirmation is eligible — whether because it fell inside its own ordinary window (`POL-0008` Rule B/J) or because a valid, unconsumed Authorization exists for it — every subsequent step (draft restoration, Owner edits, basis reselection, reconfirmation, the original's preservation-and-voiding) follows `POL-0008` Rules C–I identically, with no branch, special case, or alternate path introduced by this Policy. Operationally: a future Specification must not introduce a second void/redo/confirm sequence for the authorized case — it must reuse the one `POL-0008` already defines.

**Rule N — SuperAdmin issues; SuperAdmin does not act on the confirmation.** SuperAdmin's write surface under this Policy is limited to requesting/granting an Authorization (and, implicitly, its unconsumed expiry). SuperAdmin never creates a void-record, never creates a redo confirmation, never edits any field of the original `StockCount`, and never selects a valuation basis. Operationally: this must be enforced at the same authorization layer (Security Rules) that already enforces `POL-0008` Rule E's Owner-only execution — a SuperAdmin-tier credential must be structurally incapable of performing the Owner-tier write, not merely prevented by UI omission.

**Rule O — One exact confirmation per Authorization.** An Authorization names exactly one confirmation (by whatever stable identifier the Specification/Rule 8 stage defines) and is valid for that confirmation alone. It confers no authority over any other confirmation, past or future, for the same business or any other. Operationally: a future Specification must ensure an Authorization's scope check is structurally tied to the named confirmation, not to the business or the Owner generally.

**Rule P — One business's Authorizations do not cross tenant boundaries.** An Authorization is scoped to the single business (tenant) whose confirmation it names, consistent with this repository's tenant-isolation discipline (`12-security-architecture.md`; `07-data-architecture.md`). No Authorization may be interpreted, consumed, or validated against any confirmation belonging to a different business.

**Rule Q — Owner-consumed, one-time.** Only the business's Owner may consume a valid, unexpired Authorization to proceed into the Void & Redo flow — matching `POL-0008` Rule E's existing Owner-only tier. Once consumed (i.e., once the Owner has used it to enter the flow and the resulting void-record/redo-confirmation sequence has begun per `POL-0008`), the Authorization is spent and may not be reused, re-presented, or consumed a second time, even if the underlying Void & Redo attempt is later abandoned before completion. Operationally: a future Specification must define consumption as a single, atomic, one-way transition — no partial-consumption state that could be reused.

**Rule R — Time-bounded; non-renewable; no silent extension.** An Authorization is valid for a fixed duration of **48 hours** from its own `authorizedAt`, by explicit, final Product Architect decision (see "Numbering and Product Architect Decisions," above) — completely separate from, and not to be confused with, the normal 12-hour `confirmedAt` recovery window `POL-0008` governs. Measured identically to how `POL-0008` Rule B already measures a confirmation's own window: from the Authorization's own timestamp, not from when the Owner opens the recovery flow, not from any other event. The window does not restart on any action and cannot be extended by the Owner, by SuperAdmin, or by any other mechanism short of SuperAdmin granting an entirely new, separately-issued Authorization — no extension or automatic renewal, ever. Operationally: this is the same "own timestamp; no restart; no extension" discipline `POL-0008` Rule B/J already establish, applied to a new artifact type rather than to a confirmation.

**Rule S — Never fabricates or backfills `confirmedAt`.** Granting, consuming, or expiring an Authorization never writes, backdates, or implies a `confirmedAt` value for the original confirmation. Where the original confirmation is legacy and has no `confirmedAt` at all, it continues to have none — an Authorization does not retroactively manufacture one. Operationally: a future Specification's schema design must keep `authorizedAt` and `confirmedAt` as structurally distinct fields with no code path that copies, derives, or infers one from the other.

**Rule T — Single active Authorization per business.** At most one unconsumed, unexpired Authorization may exist for a given business at any time, regardless of how many confirmations in that business's history might otherwise qualify — by explicit Product Architect decision (see "Numbering and Product Architect Decisions," above): "Do not allow multiple simultaneous active authorizations for the same business... This is an operational safety constraint, not a new recovery mechanism." Operationally: a future Specification must treat "does an active Authorization already exist for this business" as a precondition SuperAdmin's request path checks, atomically, before granting a new one.

**Rule U — Only the current (not-yet-superseded) confirmation is eligible.** An Authorization may name only the confirmation that is, at the time of granting, the business's current Initial Stock confirmation — the one `POL-0008` Rule G identifies as what Capital Growth and current-business-state calculations actually read. A confirmation that has already been voided and superseded by a later confirmation is not itself independently eligible for a fresh Authorization; if the business's *current* confirmation is itself later or expired-window, that current confirmation is what an Authorization may name — by explicit Product Architect decision (see "Numbering and Product Architect Decisions," above): "SuperAdmin may authorize only the business's currently active Initial Stock confirmation. Historical/non-current confirmations cannot be newly authorized. This must be enforced technically, not merely described as a UI convention." Operationally: this is a substantive eligibility check the Specification/Rule 8 stage must enforce at the same layer that already enforces every other Owner-tier write precondition — not a client-side or UI-only restriction.

**Rule V — Mandatory recorded justification.** Every Authorization request must carry a recorded, non-empty justification, consistent with this repository's existing platform-operator audit convention (`09-superadmin-architecture.md` §9.6's `justification` field, §9.7's identical requirement for Support Session issuance). Operationally: a future Specification must make justification a required, not optional, input to the grant action, and must ensure it is captured in the platform Audit Log alongside the grant.

**Rule W — Ceiling accounting for legacy confirmations (per Product Architect decision, above).** A legacy confirmation's first authorized recovery is treated as **Confirmation #1** for `POL-0008` Rule J's existing chain-ceiling counting scheme, consuming recovery cycle 1 of the existing 3-cycle maximum and producing Confirmation #2. From that point forward, the chain is governed by `POL-0008` Rule J exactly as any non-legacy chain — up to the same maximum of 4 confirmation events total. This Rule does not create a separate or additional ceiling for legacy confirmations; it resolves how they enter the one ceiling that already exists.

**Rule X — Expired-window (non-legacy) confirmations follow the identical eligibility gate.** A confirmation that is not legacy, but whose own `POL-0008` Rule B/J window has already elapsed, is treated identically to a legacy confirmation for the purposes of this Policy: it is not independently eligible for Void & Redo, and becomes eligible only through a valid Authorization under Rules M–V, above. Its own chain-position accounting (however many recovery cycles it may have already consumed, if any, before its most recent window expired) is unaffected and unmodified by this Policy — Rule W's "treat as Confirmation #1" resolution applies specifically to the legacy case, where no prior chain-position accounting exists at all; an expired-window confirmation that already has real chain-position history continues to be counted from that real history, not reset to Confirmation #1.

**Rule Y — Subscription-gating exemption, inherited and narrowly re-scoped.** Per `BDR-0016` §6, the Authorization-gated Void & Redo write path (Authorization consumption, void-record creation, redo confirmation creation) is exempt from `subscriptionAllowsNewRecords(businessId)`, identically in spirit to the existing Finding K1/Option A exemption already governing ordinary Void & Redo. The Authorization **grant** action itself (a SuperAdmin platform-operator action, not a tenant write) is not a tenant record creation and is not subject to `subscriptionAllowsNewRecords` in the first place. Operationally: a future Specification/Rule 8 stage must express this exemption via this-path-specific rule conditions, never via a shared, reusable "skip subscription check" helper (identical constraint to Option A item 3).

**Rule Z — No silent rewriting.** Consistent with `POL-0008` Rule I, no mechanism introduced to satisfy Rules M–Y may, as a side effect, edit, delete, or silently reinterpret any historical fact — of the original confirmation, of any prior void-record, or of the Authorization itself once granted, consumed, or expired. An Authorization's own history (granted, consumed or expired, by whom, when, why) is itself a permanent audit fact once written.

## Scope Exclusions — Technical Implementation Not Decided Here

Consistent with `BDR-0016` §8 and the Policy/Specification boundary, this Policy does **not** decide:

- Firestore schema or field names for the Authorization artifact, its status values, or its linkage to a confirmation.
- The `firestore.rules` implementation of the SuperAdmin-grant / Owner-consume authorization tiers.
- The exact identifier scheme used to name "one exact confirmation," particularly for legacy confirmations that may lack a stable existing identifier for this purpose.
- The UI/interaction design for requesting, reviewing, granting, or consuming an Authorization.
- Where/how the Authorization Audit Log entry is stored relative to the existing `platform_audit_log/{id}` schema (`09-superadmin-architecture.md` §9.6).
- Database transaction design for grant/consume/expire.
- Migration or backfill strategy identifying which existing confirmations are legacy.

Each of these is reserved for the Specification, Rule 8 Assessment, and Implementation Authorization stages that must follow.

## Genuine Open Questions — Not Silently Resolved

**No Policy-level open question remains.** The exact 48-hour figure (Rule R), the single-active-Authorization constraint (Rule T), and the current-confirmation-only constraint (Rule U) were each surfaced as proposals/operational judgment in this Policy's prior draft and are now each resolved by explicit, final Product Architect decision (see "Numbering and Product Architect Decisions," above). This section is retained, empty of open items, to preserve the document's demonstrated discipline of surfacing rather than silently resolving open questions — should a future review of this Policy identify a new one, it belongs here.

## Business Acceptance Criteria

1. Every operational rule (M–Z, above) is stated in terms a future Specification can convert directly into functional requirements, without requiring reinterpretation of `BDR-0016`.
2. No rule in this Policy conflicts with, narrows, or silently extends any Decision in `BDR-0016` or any Rule already established in `POL-0008`.
3. The Authorization-vs.-confirmation-vs.-Implementation-Authorization terminology distinction is preserved and applied consistently throughout.
4. No technical implementation detail (schema, rules, timestamp mechanism, UI, transaction, API, migration, algorithm) is committed by this document.
5. The authorization duration (48 hours) is stated as a final, confirmed Product Architect decision, not a proposal (Rule R).
6. Ceiling accounting for legacy confirmations is stated precisely, per explicit Product Architect decision (Rule W).
7. The subscription-gating exemption is stated as inherited and narrowly re-scoped, not broadened (Rule Y).
8. SuperAdmin's write surface is stated as strictly limited to Authorization grant/expiry — never a confirmation-affecting write (Rule N).
9. Single-active-Authorization (Rule T) and current-confirmation-only (Rule U) are stated as final, confirmed Product Architect decisions, each requiring technical (not merely UI) enforcement.

## Governance Notes

- This is a Policy document only. No `src/`, `server/`, `firestore.rules`, or `tests/` file is touched by this document.
- This Policy does not modify `BDR-0016`, `BDR-0015`, `POL-0008`, `BDR-0014`, `BDR-0011`, `ADR-0005`, or Architecture Principle 2.10.
- This Policy does not create a Specification, Rule 8 Assessment, or Implementation Authorization.
- This Policy's identifier, `POL-0009`, is explicitly assigned by direct Product Architect decision, recorded in `BDR-0016` §9 and restated above.
- `docs/specs/README.md` and `19-governance-bdr-policy-framework.md`'s Numbering Ledger are not modified by this document; recording `POL-0009` in the Ledger's table is a follow-on documentation step, not performed here.

## Next Governance Step

Per `19-governance-bdr-policy-framework.md` §3's governing hierarchy: the next governance step is a Business Domain Specification covering SuperAdmin-Assisted Initial Stock Recovery's functional requirements, informed by this Policy's Rules M–Z. Not drafted, started, or authorized by this document — drafted as a separate, companion document in this same governance pass, per the Product Architect's instruction.

**Lifecycle:** Drafted → Product Architect review → **Approved** (this step, with all Policy-level questions now resolved). Not yet Specified as Accepted. Not Implemented.
