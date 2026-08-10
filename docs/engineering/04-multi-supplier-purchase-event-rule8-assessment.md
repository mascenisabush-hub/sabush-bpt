# Rule 8 Assessment — Multi-Supplier Purchase Event

**Governing spec:** [`04-multi-supplier-purchase-event-amendment.md`](../specs/04-multi-supplier-purchase-event-amendment.md)
(✅ Approved), amending Module #4 additively alongside the already-
implemented [Durable Purchase Capture and Reusable Suppliers Amendment](../specs/04-durable-purchase-capture-and-suppliers-amendment.md).
**Scope of this assessment:** the minimum change set needed to close
the amendment's Purchase Event correlation capability (Parts 1–20 of
that document). Nothing outside that scope is evaluated.

---

## 1. Business rule clarity

Clear. The amendment's Part 7 (Event Lifecycle) resolves the one
genuinely open question the investigation identified — how the Admin
distinguishes "continue this purchase with another supplier" from "a
separate purchase" — concretely and unambiguously: lazy, explicit-
click-only assignment, no upfront declaration, no "unfinished event"
state to manage.

## 2. Architecture alignment

Strong. No architecture document requires an edit — confirmed by
direct precedent (the structurally identical `supplierId` amendment
touched none). Reuses Architecture 2.6 (Simplicity Over Completeness)
explicitly, as the stated reason no new collection is introduced.

## 3. Data model safety

`PurchaseBatch.purchaseEventId?: string` and
`PurchaseDraft.purchaseEventId?: string` — both additive-optional,
identical shape to the already-shipped, already-safe
`PurchaseBatch.supplierId?: string`. No existing field is renamed,
retyped, or repurposed.

## 4. Backward compatibility

Confirmed safe: every existing `PurchaseBatch` simply lacks
`purchaseEventId`; the Investment Ledger's fallback (ungrouped display
for anything without it) already exists in shape for the analogous
`purchaseBatchId`-absent case (`StocksView.tsx`'s `legacyByDate`
logic) — the new fallback is the same pattern one level up. No
migration, no backfill, no rewrite.

## 5. Security

One additive `firestore.rules` change: a field-shape check on
`purchaseBatches`' `create` rule, identical in form to the existing
`supplierId` check:

```
(!('purchaseEventId' in request.resource.data) || request.resource.data.purchaseEventId is string)
```

The retroactive assignment (tagging an already-finalized
`PurchaseBatch` with a `purchaseEventId` when the Admin clicks "Add
Another Supplier") uses the *existing, unmodified* `purchaseBatches`
`update` rule (`isMemberOf`-only) — no new rule, no new authorization
tier. `purchaseDrafts` needs no rule change at all.

## 6. Tenant isolation

Unaffected. `purchaseEventId` is a plain string value inside documents
already scoped under `businesses/{businessId}` — no new cross-tenant
read/write path, no new rule function.

## 7. Draft behavior

`savePurchaseDraft` (`AppContext.tsx`) needs exactly one additional
conditionally-spread optional field, following the exact pattern
already used (and, since the recent bug fix, proven correct) for every
other optional `PurchaseDraft` field — `purchaseEventId` must be
omitted, not set to `undefined`, when absent, consistent with the
`AppContext.tsx:2032-2043` fix already shipped in `0c71631`.

## 8. UX clarity

Resolved concretely by the amendment's Part 7/8, directly informed by
two code-verified findings (the Staff no-unmount routing quirk, and
`submittedMessage`'s never-reset state) that a naive design would have
walked directly into. The recommended "Add Another Supplier" action
explicitly avoids `onComplete()`/tab-navigation dependency for exactly
this reason.

## 9. Valuation boundary

Confirmed unchanged by direct inspection: `calculateBatch`,
`calculateInventoryTotals`, `calculatePurchaseBatchSummary` read no
new field, before or after. Event totals are addition over
already-computed `PurchaseBatchSummary` output.

## 10. Payment boundary

Confirmed: no payment/credit/debt field, type, or concept anywhere in
the amendment's scope.

## 11. Reporting behavior

The Investment Ledger's new grouping view is additive and opt-in — the
default, ungrouped view is unchanged, so no existing report or export
built against today's flat `PurchaseBatchSummary[]` output breaks.

## 12. Testing strategy

Following this repository's established pattern for
`AppContext`-coupled logic (no live Firestore in this sandbox, ever):

- **Pure/testable:** a small helper, analogous to
  `resolveSupplierForPurchase`, for deciding whether a given
  finalize/autosave call should include `purchaseEventId` — if any
  non-trivial logic beyond "pass it through if present" emerges during
  implementation, extract it the same way, for the same reason.
- **Firestore write-safety regression:** extend the existing
  `tests/purchase-draft-and-suppliers.test.ts` "Firestore write-safety"
  describe block with `purchaseEventId` blank/populated cases, matching
  the exact pattern already proven for `supplierId`/`supplierPhone`/
  etc. — this is directly required given the amendment adds another
  optional field to the same two write sites (`savePurchaseDraft`,
  `PurchaseBatch` construction) already shown vulnerable to the
  undefined-field bug once.
- **Investment Ledger grouping:** a focused unit test for the new
  grouping `useMemo`'s logic (extracted as a pure function if
  practical, mirroring `calculatePurchaseBatchSummary`'s own
  separation of pure aggregation from component rendering), covering:
  ungrouped fallback, two-batch group, three-supplier group matching
  the amendment's own worked example.
- **Emulator-only, not run here (standing limitation):**
  `firestore.rules`' new field-shape check and the retroactive `update`
  write — same `storage.googleapis.com` sandbox gap named in every
  prior session, not new to this amendment.

## 13. Migration requirement

None. Confirmed independently in Section 4.

## 14. Performance

Negligible. The Investment Ledger's grouping view is a client-side
`useMemo` over an array already loaded in full (`allSummaries`) — no
new Firestore query, no new listener, no new index. The retroactive
`purchaseEventId` update is a single-document `updateDoc`, not a
batch, not a query.

## 15. Implementation risk

Low, with one real risk named explicitly rather than hidden: the
"Add Another Supplier" reset must be implemented as a true in-place
state reset, not a call to `onComplete()` — if a future implementer
reaches for the existing success-screen "Concluir" pattern without
re-reading Part 7's two findings, they will silently reintroduce the
Staff dead-end. This is flagged here specifically so the Implementation
Plan's own Phase for this UI change calls it out as a required review
point, not an incidental detail to be rediscovered.

## 16. Readiness Determination

**Governance Readiness: Ready.** No unresolved decision remains that
this assessment needed to surface — the one genuinely open product
question (event lifecycle/UX) was resolved in the amendment itself,
grounded in concrete code findings rather than assumption. Proceeding
to the Implementation Plan.
