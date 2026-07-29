Business Domain Specification

# Expenses

Version 1.0
**Status:** ✅ Approved
**Module #8 of 20 — Phase 2: Capital Protection**
**Architecture references:** [Section 3.8.1](../architecture/03-domain-architecture.md)
(Expenses domain), [Section 6.8 & 7.7](../architecture/06-user-architecture.md)
(Permission Matrix / Data Ownership Summary), [Section 7.6](../architecture/07-data-architecture.md)
(Historical Data and Immutability — the "mutable until locked, then
frozen" rule), [Section 8.7](../architecture/08-module-architecture.md)
(Financial: Expenses & Withdrawals module)
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
for the `businessWorth = totalMarketValueAllTime − totalExpensesAllTime
− totalWithdrawalsAllTime` formula — this spec does not redefine it,
only the domain that feeds its middle term · [Breakages (spec #7)](./07-breakages.md)
for the shared pattern (free-text category/reason, delete-only
correction, the role-gating gap) this spec finds repeated here
**Implementation:** `src/components/AddExpenseView.tsx` (entry form),
`src/context/AppContext.tsx` (`addExpense` lines 1059–1085, `deleteExpense`
lines 1310–1313, `totalExpensesAllTime`/`businessWorth` lines 382–389),
`Expense` type (`src/types.ts`, lines 147–154), display/deletion in
`src/components/reports/ExpenseReport.tsx`, Firestore rules
(`firestore.rules`, lines 173–178)

---

## Purpose

**Why does this module exist?**

Expenses records real operating costs of running the business — rent,
utilities, transport, salaries, and the like — as one of the two direct
capital-reduction levers Business Worth is built from (spec #2), the
other being Withdrawals (module #9). Architecture 8.7 is explicit these
are kept as two deliberately separate record types, never merged,
because collapsing them would misstate both Business Worth (an
operating cost) and personal draw (an owner taking capital out) at the
same time. This module owns only the former.

## Business Problem

**What business problem does it solve?**

An Admin's sense of "how the business is doing" is meaningless if it
only counts stock value and ignores what it costs to keep the doors
open. Without a dedicated, always-visible ledger of operating costs,
rent and utilities either go untracked entirely or get mentally
subtracted from a gut-feel number that never reconciles with anything
real. Expenses solves this by making every operating cost a permanent,
timestamped, categorized record that directly and immediately reduces
the one number the Admin actually watches — Business Worth (spec #2) —
the moment it's entered, not at some future bookkeeping close-out.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — record and delete an Expense; the only role Firestore rules currently permit to delete one (`firestore.rules` lines 173–178: `allow delete: if isOwnerOf(businessId)`) |
| **Manager** | Same as Owner per Architecture 6.3's tier model — falls under Section 6.8's "Stock Entry, Products, Reports" bucket and Section 7.7's Data Ownership table, which states "Full" access to Expenses. The Firestore delete rule does not currently extend that "Full" to Manager (see Business Rules — the same gap spec #7 named for Quebras) |
| **Staff** | Can record an Expense (`navigationTabs.ts`: `add-expense` tab, `ownerOnly: false`) — matches Architecture 6.4. Section 7.7's Data Ownership table also states "Full" access for Staff, but the Firestore delete rule restricts delete to Owner only — an inconsistency between two Architecture sections that the implemented rule resolves in the stricter direction (see Business Rules) |
| **SuperAdmin** | No direct access to an individual business's Expense records — aggregated patterns only, consistent with every other tenant-financial domain (Architecture 3.1, 10.9) |

## User Stories

- As **Staff**, I want to record an operating cost — rent, a utility
  bill, a transport charge — with a category, so that it's captured the
  moment it happens rather than relying on someone reconstructing it
  later from memory or a paper receipt.
- As a **Business Owner**, I want every Expense to immediately reduce
  the Business Worth figure I check daily, so that I'm never looking at
  a number that quietly ignores what it costs to run the business.
- As a **Business Owner**, I want to see my expenses grouped by
  category, month, or year, so that I can spot which cost is growing and
  decide whether to act on it.
- As a **Business Owner**, I want confidence that an Expense already
  locked into a past Closing can't quietly change or disappear, so that
  a historical month's figures stay trustworthy months later.

## Business Rules

**What an Expense records**
- Date, a required free-text description, a required positive amount,
  and an optional free-text category (defaults to "Geral"/General if
  left blank) — `addExpense`, `AppContext.tsx` lines 1059–1085; `Expense`
  type, `types.ts` lines 147–154.
- Category is free text with quick-fill suggestion chips (rent,
  utilities, transport, salaries, maintenance, other) — the same
  free-text-plus-suggestions pattern spec #7 documented for Quebra
  reasons, not a fixed enum.

**All-time, not period-scoped**
- `totalExpensesAllTime` sums every Expense ever recorded, with no
  reset at any Closing (`AppContext.tsx` line 382; confirmed against
  `clearAllData`/`loadSampleData`, the only functions that ever bulk-remove
  or bulk-seed the collection, both explicit admin/demo actions, never a
  side effect of Closing). Business Worth (spec #2) is therefore a
  live, all-time figure — a Closing (module #11, not yet specified)
  records a period's snapshot alongside it, but never zeroes the running
  total out.

**Mutability — Architecture states a rule the code doesn't yet build**
- Architecture 7.6 states Expenses (like Withdrawals) are **"mutable
  until locked, then frozen"** — editable or removable freely until a
  Closing includes them in its frozen period snapshot, at which point
  they become historical inputs to an immutable record, and any
  correction afterward must be a new entry in the next open period, not
  a retroactive edit. Architecture 8.7 restates this as a concrete
  requirement: *"this module's edit/delete UI must check
  `closingId`/period-locked status before allowing a change."*
- **What's actually implemented is stricter on one side and looser on
  the other, and neither matches the spec:** there is no `updateExpense`
  function anywhere in `AppContext.tsx` — an Expense is never editable,
  locked or not, which is stricter than "mutable until locked." But
  `deleteExpense` (lines 1310–1313) has no check of any kind — no
  `closingId` field exists on the `Expense` type, and `Closing` (spec
  #11, not yet written) stores only aggregate totals, never the list of
  Expense IDs that fed them. So the one case Architecture 8.7 explicitly
  calls out — blocking a change *after* a Closing has locked the
  record — is not just unimplemented, there is currently no data-model
  field (`closingId`) to check even if the UI were updated. An Owner can
  delete an Expense from a month that's already been closed, and nothing
  will flag that the Closing's frozen `totalExpenses` snapshot (spec #11)
  no longer matches what a live recalculation from the `expenses`
  collection would produce.

**A permission-matrix inconsistency, stated precisely**
- Architecture Section 7.7's Data Ownership table lists Staff as having
  **"Full"** access to Expenses (and Quebras) — but the Firestore rule
  (`allow delete: if isOwnerOf(businessId)`) restricts delete to Owner
  only, matching spec #7's finding for Quebras exactly. This is an
  internal inconsistency between two Architecture sections (6.8/7.7 vs.
  the concrete rule), not a code bug — the implemented rule is the more
  conservative reading, and this spec records that as the deliberate,
  current behavior rather than silently picking one interpretation over
  the other.

**The same UI gap spec #7 already named for Quebras**
- The delete control (`ExpenseReport.tsx` line 217) renders
  unconditionally for anyone who can view the Expense Report, regardless
  of role, with no confirmation step and no error surfaced if Firestore
  rejects a non-Owner's delete attempt (no try/catch around the call).
  A Manager or Staff member sees an apparently-working delete button
  that silently does nothing.

**Never conflated with Withdrawals**
- An Expense is a business cost; a Withdrawal (module #9, not yet
  specified) is the owner taking capital out — Architecture 8.7,
  Principle 2.4 are explicit these must never be merged into one
  collection or one number, even though both subtract from Business
  Worth the same way.

## Functional Requirements

*Exactly what the module must do.*

1. Record an Expense with date (defaults to today), description, amount,
   and optional category — currently implemented (`AddExpenseView.tsx`).
2. Offer quick-fill category suggestions while accepting free text —
   currently implemented (`COMMON_CATEGORY_KEYS`).
3. Default an unset category to "Geral"/General, never leave it blank —
   currently implemented (`addExpense`, `category: category.trim() ||
   'Geral'`).
4. Feed every Expense into `totalExpensesAllTime`, subtracted from
   Business Worth the moment it's recorded, visible on the Dashboard
   (spec #1) and in the Business Worth breakdown modal — currently
   implemented.
5. Log a `TimelineEvent` (type `expense-recorded`) alongside every
   Expense creation, with its financial impact shown as a negative
   figure — currently implemented (`addExpense`, lines 1073–1084).
6. Support grouping and viewing Expenses by category, month, or year in
   the Expense Report, with export to PDF/Excel — currently implemented
   (`ExpenseReport.tsx`).
7. **Not currently implemented:** an `updateExpense` function, and a
   `closingId` (or equivalent) field on the `Expense` type recording
   which Closing, if any, has locked it — the concrete precondition
   Architecture 8.7's "mutable until locked, then frozen" rule depends
   on.
8. **Not currently implemented:** blocking edit/delete of an Expense
   once it belongs to a locked Closing period, per the same
   Architecture 8.7 rule — currently impossible to enforce at all
   without Functional Requirement #7's field existing first.
9. **Not currently implemented:** gating the delete control by role to
   match the Firestore rule, a confirmation step before delete, and a
   visible error if a delete attempt is rejected — the same gap named
   for Quebras in spec #7, repeated here.

## Non-functional Requirements

**Performance**
- Recording an Expense is a single `setDoc` write plus one
  `TimelineEvent` write — O(1). `totalExpensesAllTime` is a single
  reduce over the full collection, O(n) in expense count — immaterial
  at current scale (Architecture Section 11), worth revisiting only if
  a single business's expense history grows into the tens of thousands
  of records.

**Security**
- Tenant isolation via `isMemberOf(businessId)` for read/create/update,
  `isOwnerOf(businessId)` for delete (`firestore.rules` 173–178) — see
  Business Rules for the Architecture-internal inconsistency this
  resolves in the stricter direction, and the UI gap that doesn't yet
  reflect it.

**Accessibility**
- Amount and total figures use `.type-number`/tabular-nums consistently;
  category is shown as a labeled pill, not conveyed by color alone.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1), Stock Batches (spec #5), and
  Breakages (spec #7).

**Mobile**
- Form follows standard input sizing and spacing per
  [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) — full-width inputs,
  `min-h-[52px]` primary action button, same pattern as
  `AddQuebraView.tsx`.

## KPIs

**How do we know this module succeeds?**

- Every recorded Expense is reflected in Business Worth within the same
  render — no stale figures on Dashboard, Reports, or the breakdown
  modal.
- Time-to-record: an Admin or Staff member can log an expense in under
  15 seconds (category available as a one-tap chip, description and
  amount the only required typing).
- Zero Closing/live-total mismatches once Functional Requirements #7–8
  are implemented — a locked period's frozen `totalExpenses` (spec #11)
  should never be silently invalidated by a later delete.

## Future Enhancements

*Ideas — not implementation.*

- **Implement the `closingId` field and lock check** — the concrete
  work Architecture 8.7 already specifies: an Expense records which
  Closing (if any) has locked it, and edit/delete is blocked once set,
  per Functional Requirements #7–8.
- **Correction-as-new-record for a locked Expense** — once locked, a
  correction becomes a new entry in the next open period referencing
  what it corrects (Architecture 7.6's general pattern), rather than any
  retroactive edit.
- **Close the UI/rules gap** — gate the delete control by role, add a
  confirmation step, and surface delete errors, mirroring spec #7's
  Future Enhancements for Quebras exactly.
- **Resolve the Section 6.8/7.7 permission-matrix inconsistency**
  explicitly, as a documented product decision, rather than leaving the
  implemented Firestore rule as the only place the real answer lives.
- **Recurring Expenses** (e.g., monthly rent auto-suggested) — not
  currently supported, would reduce repetitive manual entry for
  predictable costs.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] An Expense can be recorded and immediately reduces Business Worth,
      visible everywhere that figure appears.
- [ ] The delete control is visible only to roles the Firestore rule
      actually permits, with a confirmation step and a visible error on
      failure.
- [ ] An Expense gains a `closingId` (or equivalent) field, and
      edit/delete is blocked once a Closing has locked it — closing the
      Architecture 8.7 gap this spec names.
- [ ] The Section 6.8/7.7 permission-matrix inconsistency has been
      explicitly resolved by product ownership, not left as an
      unreviewed side effect of whichever rule happened to ship first.
