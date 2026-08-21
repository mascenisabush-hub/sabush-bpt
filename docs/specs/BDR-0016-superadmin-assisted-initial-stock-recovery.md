Business Decision Record

# BDR-0016 — SuperAdmin-Assisted Initial Stock Recovery — Business Decision Record

**Status:** ✅ **Approved.** Numbering, business philosophy (§2–§7), and both open questions §9 originally surfaced (authorization duration; legacy ceiling accounting) are now resolved by explicit Product Architect decision, recorded verbatim in §9.
**Type:** Business Decision Record — a strategic decision about why a SuperAdmin-assisted recovery capability should exist and what narrow boundary it may operate within, per the category `19-governance-bdr-policy-framework.md` §2 establishes. Not a Policy (the "how, specifically" operational rules — authorization artifact shape, chain-ceiling accounting, audit fields — are not fixed here) and not a Business Domain Specification (no functional requirement or acceptance criterion for implementation is fixed here).
**BDR number:** `BDR-0016` — explicitly assigned by direct Product Architect decision (recorded verbatim in §9), per `19-governance-bdr-policy-framework.md`'s Numbering Ledger assignment-authority rule ("assigning a `POL-NNNN`/`BDR-NNNN` number requires an explicit Product Architect decision, made each time... No number may be inferred from repository state, from the highest previously-assigned number, or from any other document's convention"). This document also confirms, by direct inspection of `docs/specs/` at the time of drafting, that `BDR-0001` through `BDR-0015` account for the sequence continuously with no gap and no reservation beyond `BDR-0015` — `BDR-0016` is the next number in that sequence, consistent with the numbering the Product Architect assigned.
**Location note:** Filed in `docs/specs/`, unprefixed — this capability is cross-cutting (SuperAdmin platform-operator action, Initial Stock confirmation state, and the same Capital Growth read-path Void & Redo already governs), following the same unprefixed pattern already established for `BDR-0004`, `BDR-0008`, `BDR-0009`, `BDR-0012`, `BDR-0013`, `BDR-0014`, and `BDR-0015`.
**Depends on:** [`BDR-0015`](./BDR-0015-initial-stock-accidental-confirmation-recovery.md) (Approved) and [`POL-0008`](./POL-0008-initial-stock-accidental-confirmation-recovery-policy.md) (Approved) — this BDR builds directly on top of the Void & Redo mechanism those two documents already establish, rather than creating a second, parallel recovery system (per the Product Architect's explicit instruction that there must be **one** governed recovery mechanism). Also depends on, without amending, [`BDR-0011`](./BDR-0011-superadmin-subscription-operations.md) (SuperAdmin Subscription Operations) and [`ADR-0005`](../adr/ADR-0005-superadmin-payment-operations-boundary.md) (SuperAdmin Payment Operations Boundary) — the two existing artifacts that already govern where SuperAdmin's operational authority begins and ends — so that this BDR's boundary claims are checked against real precedent rather than asserted from scratch. Also depends on `09-superadmin-architecture.md` §9.6 (platform Audit Log) and §9.7 (Support Session justification/time-box precedent) for the actor model and audit conventions a SuperAdmin-facing capability must fit into.
**Does not amend:** `BDR-0015`, `POL-0008`, the accepted Void & Redo Specification, its Rule 8 Assessment, its signed Implementation Authorization, the Recovery Window Amendment, `BDR-0014` or its dual-valuation-basis governance chain, `BDR-0011`, `ADR-0005`, `02-core-product-principles.md`, or any other existing artifact. §4, below, identifies exactly what this decision extends and what it explicitly does not touch.
**Followed by:** Per the established sequence (`Business Philosophy → BDR → Policy → Module Specifications → Rule 8 → Implementation`, `19-governance-bdr-policy-framework.md` §3) — `POL-0009` and a Specification are the next artifacts, both addressed in this same governance pass; Rule 8 Assessment and Implementation Authorization remain future, separately-gated steps not performed here.

---

## 1. The Business Reality

`BDR-0015`/`POL-0008` (Void & Redo) solved the general case of an accidental Initial Stock confirmation: the Owner has a 12-hour window (per the Recovery Window Amendment), measured from the confirmation's own timestamp, to trigger recovery themselves. That mechanism is deliberately narrow and Owner-only, and this BDR does not reopen any part of it.

Two real cases fall outside what Void & Redo can reach, and today have **no recovery path at all**:

1. **Legacy confirmations.** An `initial` `StockCount` confirmed before Void & Redo existed carries no `confirmedAt`/chain metadata for the mechanism to measure a window from in the first place. These businesses are not mid-window and not past-window — they were never inside the mechanism's reach to begin with.
2. **Expired-window confirmations.** An Owner who did not notice the accident inside the 12-hour window — genuinely plausible for a small/micro business owner who may not check the app daily — is, today, in exactly the state `POL-0008` Rule F requires: "completely and permanently final... no recovery path exists after that point, under any circumstance." That finality is correct as a default. It is also, in practice, indistinguishable from "we will never help this legitimate customer," which is a different claim than the one Rule F was written to make.

The Product Architect's stated objective is narrow and specific: *any legitimate customer who accidentally confirmed Initial Stock before finishing should have a governed path to recover and continue* — not a general database-editing capability, and not a second, independent recovery system running alongside Void & Redo.

## 2. The Proposed Capability — SuperAdmin-Assisted Initial Stock Recovery

This BDR proposes a narrow extension: a **SuperAdmin authorization step** that, when granted, makes the existing Void & Redo mechanism available to a specific confirmation that Void & Redo's own eligibility rules would otherwise exclude — because it is legacy, or because its window has expired. It is not a new recovery *mechanism*; it is a governed *unlock* of the one that already exists, for a bounded set of otherwise-ineligible cases.

Concretely, the shape the Product Architect has already fixed, which this BDR formalizes as approved business philosophy:

- **SuperAdmin authorizes; SuperAdmin does not act.** SuperAdmin's role ends at issuing a scoped, auditable authorization for one exact confirmation. SuperAdmin never performs Void & Redo, never edits the `StockCount`, never selects a valuation basis, and never reconfirms Initial Stock on the business's behalf.
- **Owner still does everything Void & Redo already requires of an Owner.** Once authorized, the Owner — and only the Owner — executes Void & Redo exactly as `BDR-0015`/`POL-0008` already define it: reviewing/reconstructing the restored draft, editing quantities/items, independently choosing the Cost/Selling basis, and reconfirming.
- **One governed mechanism, not two.** The authorized recovery, once granted, runs through the identical Void & Redo flow — the same original-preserved-and-voided discipline (`POL-0008` Rule D), the same independent-basis discipline (Rule H), the same "no silent rewriting" discipline (Rule I). This BDR does not define a parallel void/redo/confirm sequence; it defines what makes an otherwise-ineligible confirmation eligible to enter the sequence that already exists.
- **Timestamp integrity is absolute.** `confirmedAt` continues to mean, exclusively, the actual server-recorded moment a confirmation occurred. A SuperAdmin authorization introduces its own, distinct timestamp concept — an *authorization* event, not a confirmation event — and that authorization timestamp is never written onto the original `StockCount`, never backdated, and never used to fabricate or imply a `confirmedAt` that did not occur. The original confirmation remains exactly as immutable as `POL-0008` Rule D already requires.
- **The ceiling is not reopened.** The existing 3-recovery-cycle / 4-confirmation-event ceiling (`POL-0008` Rule J, Decision 5) is unchanged by this BDR. Confirmation #4 remains unvoidable under every path, including this one. There is no path — authorized or otherwise — to a 5th confirmation. §9 records the Product Architect's decision on how a legacy confirmation's *first* authorized recovery is counted against that already-fixed ceiling; the ceiling's numeric value itself is not reopened.

## 3. This Extends Void & Redo's Reach — It Does Not Weaken Its Discipline

`BDR-0015` §3 already establishes that Void & Redo is a narrow, bounded exception to Architecture Principle 2.10, not a general precedent for "immutable, except when...". This BDR's own boundary is drawn the same way, for the same reason — every discipline `BDR-0015`/`POL-0008` already established for *who* may act and *what* may never change applies identically here:

1. **Still Owner-executed.** SuperAdmin's authorization does not create a second actor who can perform Void & Redo. `POL-0008` Rule E (Owner-only execution) is unchanged; this BDR adds a precondition to *reaching* that execution, not a new executor.
2. **Still original-preserved.** The original confirmation is never edited or deleted under this path any more than under the ordinary path. `POL-0008` Rule D governs identically.
3. **Still basis-frozen.** `POL-0008` Rule H (original basis permanently unchangeable; redo makes its own independent choice) governs identically — SuperAdmin authorization does not touch valuation basis in any way.
4. **Still ceiling-bounded.** No authorized path reaches Confirmation #5. §2, above.
5. **Adds, rather than relaxes, an audit surface.** Where ordinary Void & Redo has no SuperAdmin involvement to audit, this path introduces a new, mandatory, auditable event (the authorization grant) that does not exist in the ordinary case — this is additive scrutiny on the narrow set of cases that need it, not reduced scrutiny anywhere.

What is genuinely new, and is exactly what this BDR exists to authorize: a governed, narrow, auditable SuperAdmin **gate** in front of Void & Redo's existing eligibility check, for legacy and expired-window confirmations specifically — nothing about Void & Redo's own internal discipline changes for any confirmation that reaches it, whether it arrived there normally or through this gate.

## 4. Relationship to Existing SuperAdmin Governance — Explicit Non-Merge

**This BDR does not modify, reopen, extend, or otherwise touch `BDR-0011` (SuperAdmin Subscription Operations) or `ADR-0005` (SuperAdmin Payment Operations Boundary).** The Product Architect has been explicit that this must remain a separate governance matter, and the reason is structural, not incidental:

- `BDR-0011` governs whether and how SuperAdmin may **observe or intervene in subscription state** — a materially different capital-affecting surface than Initial Stock. Its own recorded outcome (Part 14 addendum) is **"B — Monitor first"**: not implemented, with a defined revisit condition. This BDR does not rely on, does not change, and is not unblocked or blocked by that outcome. A future decision to revisit `BDR-0011` remains entirely its own matter.
- `ADR-0005` governs SuperAdmin's existing, narrower Payment Operations capability — confirming or rejecting an **already-existing**, Owner-created `payments/{paymentId}` document. Nothing in this BDR extends that boundary; this BDR's SuperAdmin action (authorizing a Void & Redo eligibility unlock for one confirmation) is a different capability entirely, with its own governance chain, per `19-governance-bdr-policy-framework.md` §3's own instruction that "each capability must have its own governance."
- One narrow point of contact does exist and is addressed directly, not silently: §6, below, formalizes that this BDR's authorized recovery inherits the Void & Redo write path's existing subscription-gating exemption (Rule 8 Finding K1/Option A, already resolved for ordinary Void & Redo) — and explicitly does **not** authorize any broader SuperAdmin subscription/platform-access capability. That broader question remains `BDR-0011`'s alone.

**This is not the general SuperAdmin operational principle finding a new capability by extension.** §7, below, addresses that distinction directly.

## 5. Product Objective and Boundary, Stated Precisely

**Objective:** any legitimate customer who accidentally confirmed Initial Stock before finishing should have a governed path to recover and continue the Initial Stock process, even where the existing Owner-only Void & Redo window has already expired or never applied (legacy confirmations).

**Boundary — what this explicitly is not:**

- Not unrestricted database-editing power for SuperAdmin. SuperAdmin's write surface under this capability is limited to issuing (and, implicitly, allowing to expire) a scoped authorization artifact — never a write to the `StockCount` itself, never a write of any kind to business financial data.
- Not a SuperAdmin substitute for Owner judgment. Every decision Void & Redo already reserves for the Owner (what the corrected draft should contain, which valuation basis to select, whether/when to reconfirm) remains the Owner's alone.
- Not a precedent that "legitimate customer problems" alone justifies a SuperAdmin capability. §7 states this explicitly.

## 6. Subscription-Gating Interaction — Inherits the Existing Exemption, Narrowly

The ordinary Void & Redo write path (void-record creation, redo confirmation creation) is already exempt from `subscriptionAllowsNewRecords(businessId)`, per the Rule 8 Assessment's Finding K1 and the Product Architect's recorded Option A decision for `BDR-0015`/`POL-0008` — because a safety/recovery capability for an accidental confirmation must not be blocked by the ordinary new-record subscription gate, and because that exemption is expressed narrowly, via Void-&-Redo-specific rule conditions, never as a reusable "skip subscription check" mechanism (Option A item 3, verbatim).

This BDR decides, as business philosophy, that **the same reasoning applies identically to SuperAdmin-authorized recovery**: a business whose subscription state would otherwise block new-record creation must not, for that reason alone, be denied the ability to correct a legitimate accidental Initial Stock confirmation via this path. This BDR therefore authorizes that the SuperAdmin-authorized recovery write path — like the ordinary Void & Redo write path it feeds into — inherit that same exemption.

**This is not a broadening of the exemption's scope, and this BDR does not authorize any general subscription-enforcement bypass.** It applies only to the Initial Stock recovery write path this BDR and `BDR-0015` together govern. It does not authorize SuperAdmin to create, modify, or unlock any other record type while a business's subscription state would otherwise block it, and it is not authority for any future capability to claim the same exemption by analogy — each future capability requiring a subscription-gating exemption must obtain its own Product Architect decision, exactly as this one has.

The precise rule expression (how the exemption is scoped at the Security Rules layer for this specific new write path) is reserved for Rule 8, per §8, below.

## 7. General SuperAdmin Principle — Named, and Explicitly Bounded

The Product Architect has stated a general operational principle: legitimate customer problems should be resolvable by SuperAdmin through governed mechanisms, without this becoming unrestricted database-editing power. This BDR records that principle **for the record**, because it is the reasoning this specific capability is an instance of — but this BDR does **not** treat the principle itself as self-executing authority for any capability beyond the one it defines here.

Stated precisely, so it cannot be read as broader than intended: the general principle explains *why* this BDR exists; it does not, by itself, authorize any other SuperAdmin capability, present or future. Every future SuperAdmin capability this principle might motivate — subscription intervention (`BDR-0011`'s own separate, unresolved question), data correction in any other module, or anything else — requires its **own** BDR, its **own** Policy, its **own** Specification, and its **own** Rule 8 Assessment, exactly as this one does. This BDR is authority for SuperAdmin-Assisted Initial Stock Recovery, precisely as scoped in §2–§6. It is not, and does not purport to be, authority for anything else.

## 8. What This BDR Does NOT Decide or Authorize

Consistent with the governance chain, this BDR fixes only the business decision in §2–§7. It explicitly does **not** decide, design, or authorize:

- Any Firestore schema change (no field names, no document shape for the authorization artifact).
- The precise authorization artifact data model beyond the properties the Product Architect has already fixed (business-scoped, tied to one exact confirmation, SuperAdmin-granted, Owner-consumed, one-time, time-bounded, audited, immune to Owner/Manager/Staff creation or alteration, unable to modify the original `StockCount`) — the concrete shape is `POL-0009`'s role.
- The authorization's validity duration is fixed at 48 hours by explicit Product Architect decision (§9) — this BDR does not itself derive that figure from business philosophy alone.
- How a legacy confirmation's first authorized recovery is counted against the existing 3-cycle/4-confirmation ceiling is fixed by explicit Product Architect decision (§9).
- Any `firestore.rules` change.
- Any UI/interaction design for requesting, granting, or consuming an authorization.
- Any migration or backfill strategy for legacy confirmations.
- Any algorithm for locating or validating an authorization.

Each of these is reserved for the Policy, Specification, Rule 8 Assessment, and Implementation Authorization stages that follow this BDR.

## 9. Product Architect Decision and Open Questions

**Numbering — recorded verbatim, per this repository's established practice of recording a Product Architect decision's substance directly in the governing artifact** (`BDR-0014` §10–§11, `BDR-0015` §9, `POL-0008` "Numbering" section precedent):

> I am the Product Architect, and I explicitly assign the next governance numbers:
> `BDR-0016` = SuperAdmin-Assisted Initial Stock Recovery.
> `POL-0009` = SuperAdmin-Assisted Initial Stock Recovery Policy.
> This is an explicit Product Architect numbering decision made now for this capability.

This satisfies the Numbering Ledger's assignment-authority rule for both identifiers, confirmed collision-free against the current repository state (§/BDR number, above).

**Business-philosophy decisions this BDR treats as approved**, per the Product Architect's own framing of the objective and boundary (§5–§7, above): the existence of the capability; the Owner/SuperAdmin separation (§2); the one-mechanism requirement; the timestamp-integrity requirement; the unchanged ceiling; the inherited, narrowly-scoped subscription exemption (§6); and the non-merge with `BDR-0011`/`ADR-0005` (§4).

**Two genuine open questions this BDR surfaces rather than resolves**, per the Product Architect's own instruction not to assume them:

- **Authorization validity duration.** How long a SuperAdmin-granted authorization remains valid before it expires unconsumed. This BDR does not propose a number. For reference only (not a proposal): this repository's one existing precedent for a SuperAdmin-issued, time-boxed, single-target credential is the Support Session's 60-minute, non-renewable window (`09-superadmin-architecture.md` §9.7) — a different capability (read-only data access) with a different risk profile, offered here only as an existing data point, not as this capability's answer.
- **Chain-ceiling accounting for a legacy confirmation's first authorized recovery.** Whether a legacy confirmation — which predates the chain-position concept entirely — should be treated as occupying "Confirmation #1" position for ceiling-counting purposes once it undergoes its first (necessarily SuperAdmin-authorized) recovery, consistent with `POL-0008` Rule J's existing counting scheme, or whether some other accounting is intended. The ceiling's numeric value (3 cycles / 4 confirmations) is not reopened by this question — only how a legacy confirmation, which has no pre-existing count, enters that already-fixed scheme.

**Both are now resolved, by explicit Product Architect decision, recorded verbatim below:**

> **1. AUTHORIZATION DURATION — APPROVED at 48 hours.**
> `authorizedAt` is the server-recorded grant time. Authorization expires 48 hours after `authorizedAt`. This is completely separate from the normal 12-hour `confirmedAt` recovery window (`POL-0008`/Recovery Window Amendment). No extension or automatic renewal.
>
> **2. SINGLE ACTIVE AUTHORIZATION PER BUSINESS — APPROVED.**
> A business may have at most one active, unconsumed SuperAdmin recovery Authorization at a time. Do not allow multiple simultaneous active authorizations for the same business. This is an operational safety constraint, not a new recovery mechanism.
>
> **3. CURRENT-CONFIRMATION-ONLY — APPROVED.**
> SuperAdmin may authorize only the business's currently active Initial Stock confirmation. Historical/non-current confirmations cannot be newly authorized. This must be enforced technically, not merely described as a UI convention.

These three decisions, together with the numbering decision at the top of this section, resolve every open item this BDR surfaced. `POL-0009` and the Specification incorporate them directly, no longer as proposals.
