Business Domain Specification — Amendment

# Module #20 Specification Amendment — Notification Delivery Priority vs Business Importance

Version 1.1 (revised per Product Architect review — see "Revision
History," below)
**Status:** ✅ Accepted (2026-08-05). See "Product Architect
Acceptance," below.
**Implementation status:** Not yet built. This amendment is
documentation only — it does not itself implement code, modify runtime
behavior, or change `firestore.rules`, `src/`, or `server/`. Phase 3
implementation (all three producers) may now resume under the already
signed Phase 3 Implementation Authorization, writing both `priority`
and `importance` per §3/§6 below.
**Amends (once Accepted):** [Notifications (spec #20)](./20-notifications.md)
— proposed v1.2 → v1.3, specifically §20.1 (Data Model) and §20.7
(Communication Priority Tiers).
**Does not amend:** BDR-0005, BDR-0006, BDR-0007, ADR-0002/0003/0004,
or any Decision Gate. This is a specification-level reconciliation,
not a change to any accepted business policy — see "What This
Amendment Does Not Decide," below.
**Origin:** discovered during Phase 3 Rule 8 implementation (this
session) while building the `BusinessEvent` → Notification Platform
evaluation layer BDR-0006/BDR-0007 require. Reported and implementation
paused immediately, per the Phase 3 Authorization's own Scope
Discipline (§4) and this repository's standing process — not resolved
by engineering judgment.

---

## 1. Problem Statement

During Phase 3 implementation, engineering identified that the
accepted Notification Specification and BDR-0006 use the same term —
"priority" / "Communication Priority" — to describe two different
concepts:

- **`20-notifications.md` §20.1/§20.7 (Amendment v1.1, Accepted)**
  fixes `priority` as a **delivery-strategy** field: `'immediate' |
  'timeline' | 'daily_summary'`. §20.7 states this explicitly — "This
  governs delivery behavior... priority affects delivery timing/
  grouping only." Amendment v1.1's own section heading calls this
  "Communication Priority."
- **BDR-0006 §6 (Accepted)** independently defines "Communication
  Priority" as a **business-importance** scale: `Immediate | High |
  Normal | Low`. BDR-0007 §5 then maps each Phase 3 `eventType`
  directly onto this four-value scale.

Neither document was checked against the other before Acceptance; each
is internally consistent on its own. Five of six Phase 3 events happen
to read the same under either scale (`Immediate` in both); `inventory.
risk.breakage`'s `High` has no corresponding value in the existing
three-value field. This is what surfaced the collision during
implementation, not during review.

This ambiguity must be removed before implementation resumes — writing
either field without resolving it would require engineering to guess
which of two different, Accepted meanings "priority" carries for a
given event.

## 2. Why Reconciliation Is Required

The two concepts are not competing definitions of the same thing —
they answer different questions, and a real notification can vary them
independently:

- **Delivery strategy** (`priority`, §20.1/§20.7): *when/how does this
  reach the owner* — interrupt now, fold into the Business Timeline, or
  fold into a periodic digest.
- **Business importance** (BDR-0006 §6): *how significant is the
  underlying business fact*, independent of how or when it's
  eventually communicated. BDR-0006 §3/§4's own core principle already
  separates "business modules determine what occurred" from "the
  Notification Platform determines... communication" — importance is a
  property of the BusinessEvent's business meaning, not of the
  Notification Platform's delivery mechanics. Communication merely
  reflects that importance; it isn't the same thing as it.

Collapsing the two onto one field would force a decision neither
BDR-0006 nor `20-notifications.md` actually made — e.g., whether a
`High`-importance Inventory Risk event must always interrupt the owner
immediately, or could ever fold into a digest. That's a business
question, not an implementation detail, and belongs to Product
Architecture, not to whichever engineer happens to hit the collision
first.

## 3. Proposed Reconciliation

Keep both properties, as two separate fields, each meaning exactly what
its own accepted source already defines:

| Field | Meaning | Values | Owner |
|---|---|---|---|
| `priority` | Delivery strategy — when/how the notification is surfaced within the in-app channel | `immediate` / `timeline` / `daily_summary` | Notification Platform (§20.1/§20.7, unchanged) |
| `importance` | Business significance of the underlying BusinessEvent | `immediate` / `high` / `normal` / `low` | BusinessEvent / BDR-0006 §6 (new field, lower-cased to match this repo's existing literal-union convention) |

- **`priority`** — unchanged in name, values, and meaning. No existing
  Phase 1/2 data, code, or UI referencing `priority` changes meaning or
  shape.
- **`importance`** (new field, chosen over `communicationPriority` —
  BDR-0006 is a property of the BusinessEvent's significance, not of
  the communication mechanism itself, so naming it after "importance"
  keeps `BusinessEvent → importance → Notification Policy → priority`
  a cleaner, more accurate pipeline than naming it after communication
  a second time). Required, non-null, on every notification going
  forward — same "required on every document" rule already governing
  `context`/`priority` (§20.1).

A single notification can freely combine any `priority` with any
`importance` — e.g. a `high`-importance Inventory Risk event that the
owner has configured (future capability, not V1) to receive as a
`daily_summary` remains fully expressible. Today, V1 simply always
sets `priority: 'immediate'` for Phase 3's Notify-outcome events
(§9.1–9.3 all resolve to Notify; nothing in this amendment revisits
whether Phase 3 events should interrupt), while `importance` carries
the BDR-0006/BDR-0007 value un-collapsed.

## 4. Migration Statement

Existing notifications remain valid as-is. Existing `priority` values
continue to mean exactly what they meant before this amendment —
delivery strategy, per §20.7. **No migration of any Phase 1 or Phase 2
notification document is required.** Documents written before this
amendment simply have no `importance` value; nothing reads that field
for them, and nothing in this amendment requires backfilling one.
`importance` becomes required only for notifications written *after*
Acceptance, starting with Phase 3's own writes.

## 5. What This Amendment Does Not Decide

- Does not reopen BDR-0006 §5/§6 (Notify/Batch/Suppress outcomes, the
  four-tier importance scale itself) or BDR-0007's per-eventType
  mapping — both are adopted as-is, onto the new field.
- Does not reopen §20.7's three-tier delivery taxonomy or its purpose.
- Does not decide which `importance` value maps to which `priority`
  value for any *future* event type — that remains a per-eventType
  engineering-planning decision within whatever this amendment settles,
  same as §20.7 already leaves the tier-mapping "not decided by this
  amendment... see Explicitly Left Open."
- Does not touch Decision Gates 1–4, any Business Rule not named above,
  or any ADR.
- Does not change `firestore.rules`' existing `/notifications/{id}`
  read/write rules — `importance` is additive data, not a new
  access-control dimension.

## 6. Phase 3 Consequence, Once Accepted

Every Phase 3 notification the `BusinessEvent` evaluation layer writes
sets **both** fields: `priority: 'immediate'` (all three Phase 3
producers' events are Notify-outcome, owner-facing, per BDR-0006 §9)
and `importance` taken directly from BDR-0007 §5's mapping
(`'immediate'` for `closing.*`/`trial.*`, `'high'` for
`inventory.risk.breakage`) — no value invented, no engineering
discretion beyond the field split itself.

---

## Product Architect Acceptance

**Status:** ✅ Accepted.

> After reviewing the Notification Priority Reconciliation Amendment
> (revision committed locally as `92329e5`), I confirm that this
> amendment correctly reconciles the terminology conflict identified
> during Phase 3 implementation.
>
> This amendment does not change previously accepted business policy.
> It clarifies the distinction between:
>
> - `importance` — the business significance of a BusinessEvent (as
>   defined by BDR-0006), and
> - `priority` — the Notification Platform's delivery strategy (as
>   defined by Module #20).
>
> Existing Phase 1 and Phase 2 behavior remains unchanged, and no
> migration of existing notification documents is required.
>
> The amendment is therefore Accepted and becomes the governing
> interpretation for Module #20.

**Product Architect:** Sabushimike Masceni Dieudonne
**Date:** 2026-08-05

---

## Revision History

- **v1.0 (prior turn):** initial draft, proposed a
  `communicationPriority` field with no Problem Statement/rationale
  section and no migration statement.
- **v1.1 (current turn):** revised per Product Architect review — added
  §1 (Problem Statement) and §2 (Why Reconciliation Is Required) ahead
  of the proposed resolution; renamed the new field from
  `communicationPriority` to `importance`; added the §3 relationship
  table; added §4 (Migration Statement). No change to the substance of
  the proposed resolution itself (still two separate fields, still
  `priority` unchanged) — only to how it's justified, named, and
  documented.

## Governance Notes

- No `src/`, `server/`, or `firestore.rules` file has been modified to
  produce this document.
- No ADR or BDR is modified or reopened by this document.
- Once Accepted, `20-notifications.md` §20.1 and §20.7 require an
  in-place edit adding the `importance` field and a short
  cross-reference to BDR-0006/BDR-0007, following the same
  `[Amendment vX.X]`-tagging convention already used for v1.1/v1.2 —
  that edit is a mechanical follow-up to Acceptance, not a separate
  decision.
- This does not change the Phase 3 Implementation Authorization's
  scope (§2/§3) — it changes what shape the already-authorized
  Notification Platform evaluation layer writes, not what is
  authorized to be built.
