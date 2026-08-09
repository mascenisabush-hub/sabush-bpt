# Rule 8 Assessment — Module #10 Expected Current Stock Value & Persistent Initial Stock

**Governing spec:** [`10-expected-stock-value-amendment.md`](../specs/10-expected-stock-value-amendment.md)
(✅ Approved) amending [`10-stock-counts.md`](../specs/10-stock-counts.md)
(v1.1)
**Scope of this assessment:** the minimum change set described in the
amendment's Parts 1–5. Nothing outside that scope (Modules #18/#19/#20,
Business Worth formula, Dashboard, unrelated `AppContext` refactoring)
is evaluated or touched.

---

## Affected files

| File | Change |
|---|---|
| `src/types.ts` | New `InitialStockDraftItem` / draft-related types; `StockCount.expectedValueAtCount?: number` added (optional, non-breaking) |
| `src/context/AppContext.tsx` | New `expectedCurrentStockValue` derived figure; new draft state (`initialStockDraft`) + listener; new `saveInitialStockDraftItems` function; `recordStockCount` extended to accept `expectedValueAtCount` for periodic counts and to clear the draft atomically on `initial` confirmation |
| `src/components/InitialStockCountView.tsx` | Rebuilt around the draft: loads existing draft on mount, autosaves add/edit/delete, "Confirmar Capital Inicial" now confirms the persisted draft rather than a one-shot local form |
| `src/components/PeriodicStockCountView.tsx` | `comparisonBaseline` now reads `expectedCurrentStockValue` instead of `mostRecentCount?.totalValue ?? initialCapitalValue`; passes `expectedValueAtCount` into `recordStockCount`; copy referencing "última contagem" as the comparison target updated to "Valor Esperado" |
| `firestore.rules` | `stockCounts` match block: `update`/`delete` refused when `resource.data.type == 'initial'`; new `stockCountDrafts` match block (Owner-only, gated by `subscriptionAllowsNewRecords`) |
| `docs/specs/10-stock-counts.md`, `docs/specs/02-business-worth-engine.md`, `docs/specs/README.md` | Already updated (governance step, precedes this assessment) |

No `server/` change. No `firestore.indexes.json` change (drafts are a
single doc per business, read by ID — no query, no index needed).

## Data-model changes

- New optional field `StockCount.expectedValueAtCount?: number` —
  additive, does not change any existing document's shape, does not
  require a migration. Absent on every pre-amendment record by design
  (Part 5 of the amendment).
- New collection `businesses/{businessId}/stockCountDrafts/{docId}`,
  single document with a fixed id (`initial`), holding an items array
  and `updatedAt`. Does not exist for a business until the Owner starts
  an Initial Stock draft; deleted the moment that business confirms
  Initial Stock. No relationship to any other collection — consistent
  with the amendment's own finding that `StockCount`/`StockBatch` are
  structurally unlinked.

## Firestore security

- `stockCounts`: `create` unchanged. `update`/`delete` narrowed from
  "any Owner, any type" to "any Owner, any type **except** `initial`" —
  a strict tightening, not a loosening.
- **One real, flagged behavior change found by this check, not a
  hypothetical:** `clearAllData` (`AppContext.tsx`) deletes every
  `stockCounts` document — `initial` included — via a sequential loop
  of individual `deleteDoc()` calls (not a batch). Once this rule
  ships, that call would be rejected by Firestore for the `initial`
  document specifically, and — because the loop is sequential and
  unguarded — would throw and abort before reaching `withdrawals` and
  `timelineEvents`, silently leaving those undeleted. **This is the
  same situation the Closing Integrity Amendment already found and
  fixed for Closings** (`AppContext.tsx`'s own comment on that change:
  "Clear All Data no longer removes Closing or ClosedPeriod records...
  flagged here, not silently decided"). This implementation applies the
  identical fix: `clearAllData` skips the `initial` `stockCounts`
  document specifically (continues deleting every other type), with a
  comment naming this exact precedent. This is a direct, intended
  consequence of Architecture 8.6's already-approved "no exceptions"
  rule — not a new decision this assessment is making unilaterally —
  but it is a real product-facing behavior change ("Limpar Todos os
  Dados" no longer removes the Initial Capital baseline) worth stating
  plainly rather than leaving for someone to discover later.
- `stockCountDrafts`: new block, Owner-only
  (`isOwnerOf(businessId) && subscriptionAllowsNewRecords(businessId)`
  for write, `isOwnerOf(businessId)` for read) — narrower than
  `stockCounts`' own read rule (`isMemberOf`), intentionally: a draft
  is provisional and pre-decisional, so Staff/Manager visibility is not
  extended to it. This matches spec #10's Users table, which already
  gates both Stock Count screens `ownerOnly` at the UI layer — this is
  the first time that intent is also enforced at the rules layer for
  any part of this module.

## Tenant isolation

Unaffected — every new/changed rule is scoped inside the existing
`match /businesses/{businessId}` block and uses the same
`isOwnerOf(businessId)`/`isMemberOf(businessId)` helpers every other
collection in this file already uses. No cross-tenant read/write path
is introduced.

## Atomicity

Confirmation (draft → permanent `initial` `stockCounts` record) is one
Firestore batch write containing: any new `Product` find-or-create
writes (unchanged from today), the new `stockCounts/{initial-id}`
document, and a `delete` of the draft document. A Firestore client
`WriteBatch` is all-or-nothing — there is no partial-commit state to
guard against, and no server-side transaction is needed (the existing
`recordStockCount` already uses this exact pattern for products +
count; this amendment adds one more `delete()` call to the same batch).

## Initial Capital immutability

Covered under Firestore security above — this is the change spec #10
Functional Requirement #5 named as its most consequential gap, now
closed at the rules layer.

## Draft lifecycle

Single document per business, id fixed at `initial` (a second concurrent
initial-stock draft cannot exist by construction — same id every time).
`hasInitialStockCount` continues to gate confirmation exactly as today;
the draft's existence is irrelevant to that check. A confirmed business
attempting to reopen the draft view still hits the existing
`hasInitialStockCount` guard in `recordStockCount` — unchanged.

## Expected Value calculation correctness

`expectedCurrentStockValue = initialCapitalValue + totalInvestmentValueAllTime`,
both already computed, tested (implicitly, via existing
`calculateInventoryTotals` tests) figures in `AppContext`. No new math
is introduced in `calculations.ts` — the zero-dependency guarantee
(spec #2, Functional Requirement #5) is unmodified. Degenerate case
(`initialCapitalValue === 0`, i.e. Initial Stock never confirmed)
produces `0 + totalInvestmentValueAllTime`, a defined number, never
`NaN`/`Infinity` — same pattern `capitalGrowthPct` already established.

## StockBatch/Initial Stock double-counting

Resolved in the amendment (Part 2): no code path has ever linked the
two, so no double-counting risk exists to guard against. Nothing in
this implementation introduces such a link.

## Quebra handling

No new Quebra logic. `totalInvestmentValueAllTime` already reflects
`remainingQuantity` (post-Quebra) — reused as-is.

## Historical Contagem behavior

New field is additive and optional; existing `StockCount` documents are
untouched (no migration script, no batch rewrite). `PeriodicStockCountView.tsx`'s
history list renders `expectedValueAtCount` only when present, falling
back to no comparison line for pre-amendment records — never a fabricated
retroactive value.

## Backward compatibility

- Existing businesses with an already-confirmed `initial` `stockCounts`
  record: unaffected — the new immutability rule only *restricts*
  writes that were never legitimately made; `expectedCurrentStockValue`
  computes correctly off their existing `initialCapitalValue`.
- Existing businesses with no `initial` count yet: `InitialStockCountView`
  now checks for an existing draft on mount (none will exist for a
  business that hasn't used the new flow) and behaves identically to a
  fresh empty draft.
- Existing periodic `StockCount` records: read unchanged; `totalValue`
  and all other fields untouched; only lack the new optional
  `expectedValueAtCount`.

## Test coverage

New/updated Vitest coverage required before this is considered
complete (see Implementation Plan): `expectedCurrentStockValue`
degenerate and non-degenerate cases; `recordStockCount` writing
`expectedValueAtCount` for periodic types and omitting it for `initial`;
draft save/load round-trip; confirmation clearing the draft in the same
batch. Firestore rules coverage for the tightened `stockCounts` rule
and new `stockCountDrafts` rule is written but, per this sandbox's
standing network limitation (`storage.googleapis.com` not allowlisted),
**not executable here** — same gap named in every prior session's
close-out. This must not be reported as passing; it is written and
owed a manual local-environment run before production deploy, exactly
as every prior `firestore.rules` change in this repo's history has
been handled.

## Build impact

`tsc --noEmit` and `npm run build` must both stay clean — verified
after implementation, reported in the Implementation completion
summary, not assumed here.

## Validation impact

No existing validation logic (numeric guards, required-field checks)
changes. The draft workflow reuses the same per-row validation
(`quantity > 0`, `costPrice >= 0`) `InitialStockCountView.tsx` already
enforces at confirm time; the draft itself permits incomplete/partial
rows to be saved (that's the point of a draft), validation is only
enforced at confirmation, unchanged from today's single-shot form's own
validate-then-submit behavior.

---

## Readiness determination

**Governance Readiness: Ready.** All decisions in Parts 1–5 of the
amendment are settled and Approved; the StockBatch ambiguity (the one
item explicitly flagged as needing resolution before implementation) is
resolved with a data-model-grounded finding, not a guess. Scope is
narrow, additive, and does not touch Modules #18/#19/#20 or the
Business Worth formula. Proceeding to the Implementation Plan.
