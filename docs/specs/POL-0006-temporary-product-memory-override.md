Decision Record

# POL-0006 — Temporary Product Memory Override

**Status:** Approved. Approved exactly as drafted; the temporary unit-relationship-factor substitution question remains explicitly OPEN, not resolved by this approval.
**Type:** Policy document, per the category established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md) §2. Operationalizes an approved Business Decision Record; does not itself decide strategic philosophy and does not itself define a technical implementation.
**Location note:** Filed in `docs/specs/`, unprefixed, under the cross-cutting `POL-NNNN` namespace established in [`19-governance-bdr-policy-framework.md`](./19-governance-bdr-policy-framework.md)'s Numbering Ledger addendum, following the pattern `POL-0001` established.
**Depends on:** [`BDR-0012`](./BDR-0012-product-unit-of-measure-product-memory.md) (Product Unit-of-Measure & Product Memory) — specifically §5.B item 5, §3 (purchase-side facts never derived from Product Memory), Decision 13 (Product Memory reuse), Decision 14 (permanent owner reconfiguration), and §5.A Item 6 (incomplete/unconvertible configuration — warn, allow entry).
**Followed by:** Not yet drafted, not derived by this record.

---

## Purpose

`BDR-0012` §5.B item 5 asks whether an owner can temporarily use a different value than currently-remembered Product Memory for a single purchase or count, without permanently changing that memory. This Policy answers what evidence actually supports, and marks explicitly what it does not.

## Guiding Principle

Decision 14 governs a *permanent* change to remembered Product Memory. This Policy addresses a categorically different question: a *non-persisted*, single-transaction departure. The two must not be confused — using a different value once, this Policy's subject, is not the same act as editing what will be remembered going forward, Decision 14's subject.

## What Is Already Evidenced, Not a New Decision

`BDR-0012` §3 already establishes, as an approved decision, that *"purchase-side facts (quantity, unit, cost) are batch-specific facts... and are never derived from Product Memory"* — Product Memory only supplies a **pre-fill default**, *"always shown for owner review, always editable."* The existing system already permits transaction-specific fields to be edited independently of prefilled values. That establishes technical/evidentiary precedent for the distinction between a remembered default and a transaction-specific value; it does not, by itself, constitute a separate governance decision authorizing every form of temporary Product Memory override.

**The actual Policy decision, stated plainly:** for ordinary transaction field values (cost, quantity, unit-of-entry), the owner may use a different value for a single transaction without changing Product Memory. This Policy's role is to confirm this explicitly, grounded in the precedent above, and to state plainly that using a different value for one entry never alters Product Memory unless the owner takes the separate, explicit reconfiguration action Decision 14 governs.

## What Is Not Evidenced — Explicit Open Point

Whether the owner should be able to temporarily apply a **different unit-*relationship* interpretation** — for example, treating a product's confirmed `1 Cx = 24 Un` as if it were `1 Cx = 20 Un` for one specific transaction only, without altering the saved relationship — is **not evidenced by any existing decision or worked example**. This is a materially different question from overriding a single field's *value* (already covered above): it would mean temporarily substituting a different *conversion factor* for the transaction. `BDR-0012` §5.A Item 6 already provides a separate, already-resolved mechanism for a unit that cannot be related to the confirmed configuration at all (warn, allow entry, no invented conversion) — but that is not the same as deliberately substituting one confirmed-style relationship for another, temporarily. **This Policy does not decide whether that capability should exist.** It is marked here as a genuine open point requiring explicit Product Architect clarification, not resolved by inference.

## Scope: Which Entry Surfaces Does the Evidenced Override Apply To?

Examined directly, per instruction, rather than assumed:

- **Purchase entry (Add Stock):** `StockBatch` records are independent, batch-specific documents (`BDR-0012` §3; Discovery Report Part I §3) — the existing pre-fill-but-always-editable pattern in `AddStockView.tsx` already demonstrates this.
- **Initial Stock:** `InitialStockDraftItem`/the confirmed `initial` `StockCount` follow the identical batch-specific, independently-editable-row pattern (Discovery Report Part I §1, §3).
- **Periodic Stock Count:** `StockCountItem`/`PeriodicStockDraftItem` follow the same pattern — each row's `costPrice`, `sellingPrice`, `quantity`, and `unit` are independently entered and editable per count event (Discovery Report Part I §5).
- **Smart Stock Entry:** the entire review screen, by `04-smart-stock-entry-amendment.md`'s own governance, is fully editable before any commit — an extracted or Recognition-informed value can already be changed for that one entry without altering anything remembered.

**The same underlying distinction between prefilled values and transaction-specific editable values is evidenced across these surfaces.** Whether this Policy's temporary-override rule is operationally identical across every surface is left to the subsequent Specification, subject to each surface's existing governance — Smart Stock Entry in particular has its own separate governance boundary (`04-smart-stock-entry-amendment.md`, `BDR-0008`) that this Policy does not narrow or expand.

## Product Memory Is Not Silently Overwritten

Consistent with `BDR-0012` Decision 14's own "explicit owner action" requirement: using a different value for one entry, under this Policy, never itself becomes the new remembered configuration. Product Memory changes only when the owner takes the separate, explicit reconfiguration action Decision 14 already governs — using an override once, however many times repeated across separate entries, does not accumulate into an implicit reconfiguration.

## Relationship to POL-0001, POL-0002, POL-0004, and Item 6

- **`POL-0001`/`POL-0002`** (fractional handling, rounding): apply identically regardless of whether a value came from Product Memory's default or a one-off override — both are just numbers once entered.
- **`POL-0004`** (purchase cost interpretation): its "per the recorded purchase unit" rule applies to whatever unit was actually used for that entry, override or not — no conflict.
- **`BDR-0012` §5.A Item 6:** remains the governing rule for a unit that cannot be related to the confirmed configuration at all — a distinct situation from this Policy's field-value override, as clarified in the open-point section above.

## Scope Exclusions

This Policy does **not** define:
- Whether the unresolved unit-*relationship*-substitution question (above) should be authorized — flagged as an explicit open point.
- A database schema, UI mechanism, or technical implementation for entering or displaying an override.
- Any resolution of `BDR-0012` §5.A Item 7 or any other still-open item.

## Governance Notes

- This record does not modify `BDR-0012`, the Discovery Report, `POL-0001` through `POL-0004`, or any other existing artifact.
- This record does not authorize a Specification, Rule 8 Assessment, or Implementation Authorization.
- This record explicitly leaves one scope question open (unit-relationship-factor substitution) rather than inferring an answer the evidence does not support.
