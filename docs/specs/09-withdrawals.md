Business Domain Specification

# Withdrawals

Version 1.0
**Status:** ✅ Approved
**Module #9 of 20 — Phase 2: Capital Protection**
**Architecture references:** [Section 3.8.2](../architecture/03-domain-architecture.md)
(Withdrawals domain), [Section 6.1, 6.3 & 6.8](../architecture/06-user-architecture.md)
(current two-role state; Manager tier, "if granted"; Permission Matrix —
Withdrawals: Admin ✅, Manager ✅ if granted, Staff ❌), [Section 7.6](../architecture/07-data-architecture.md)
(mutable-until-locked rule, same as Expenses), [Section 8.7](../architecture/08-module-architecture.md)
(Financial: Expenses & Withdrawals module)
**Depends on:** [Business Worth Engine (spec #2)](./02-business-worth-engine.md)
for the `businessWorth = totalMarketValueAllTime − totalExpensesAllTime
− totalWithdrawalsAllTime` formula · [Expenses (spec #8)](./08-expenses.md)
for the shared "mutable until locked, then frozen" gap this spec finds
repeated here, and the contrast this module provides against it
**Implementation:** `src/components/AddWithdrawalView.tsx` (entry form),
`src/context/AppContext.tsx` (`addWithdrawal` lines 1093–1123,
`deleteWithdrawal` lines 1125–1128, `totalWithdrawalsAllTime`/
`businessWorth` lines 382–389), `Withdrawal` type (`src/types.ts`, lines
160–167), `src/components/reports/WithdrawalReport.tsx`, nav gating
(`src/data/navigationTabs.ts` line 27, `ownerOnly: true`), `App.tsx`
(`!isStaff` routing guards), Firestore rules (`firestore.rules` lines
191–193)

---

## Purpose

**Why does this module exist?**

Withdrawals records capital the owner takes out of the business for
personal use — the second of the two direct capital-reduction levers
Business Worth is built from (spec #2), the first being Expenses (spec
#8). Architecture 8.7 and Principle 2.4 are explicit these are kept
strictly separate: an Expense is a real operating cost of running the
business; a Withdrawal is the owner's own capital leaving in their own
hands. Both reduce Business Worth identically in the formula, but
conflating them into one collection would misstate both what the
business actually costs to run and what the owner has personally taken
out — two different questions an Admin needs answered separately.

## Business Problem

**What business problem does it solve?**

Without a dedicated record, "money the owner took for personal use"
either goes untracked or gets mixed in with real business costs,
corrupting both figures at once — the business looks like it costs more
to run than it does, and the owner loses track of how much capital
they've actually drawn out over time. Withdrawals solves this by giving
personal draws their own permanent, dated, optionally-reasoned record,
kept structurally apart from Expenses, so Business Worth still comes out
correct while the two very different questions ("what does the business
cost?" vs. "what has the owner taken out?") each have a clean answer.

## Users

| Role | Access |
|---|---|
| **Owner** | Full access — the only role that can record, view, or delete a Withdrawal at every layer: nav tab (`ownerOnly: true`), `App.tsx` routing (`!isStaff` guards on both the form and the Report), and Firestore rules (`allow read, create, update, delete: if isOwnerOf(businessId)` — all four actions, not just delete) |
| **Manager** | Architecture 6.3/6.8 describe Manager as able to record a Withdrawal **"if granted"** by the Admin — but Manager does not exist as an implemented role today (Architecture 6.1's own "named honestly" note: `UserRole` is only `'owner' \| 'staff'`). Until Manager exists in code, this access tier is architecturally intended but not yet buildable, not a bug |
| **Staff** | No access at any layer — matches Architecture 6.8's Permission Matrix exactly (Withdrawals: Staff ❌), and unlike Quebras (spec #7) or Expenses (spec #8), this module gates consistently end-to-end: nav tab, routing, *and* Firestore rule all agree |
| **SuperAdmin** | No direct access to an individual business's Withdrawal records — aggregated patterns only, consistent with every other tenant-financial domain (Architecture 3.1, 10.9) |

## User Stories

- As a **Business Owner**, I want to record money I've taken out for
  personal use, with an optional reason, so that I have an honest
  running account of my own draws separate from the business's actual
  costs.
- As a **Business Owner**, I want a Withdrawal to reduce Business Worth
  the same way an Expense does, so that the one number I check daily
  never overstates capital that's already left the business in my own
  hands.
- As a **Business Owner**, I want to see my withdrawals grouped by month
  or reason, so that I can see the pattern of what I've drawn and why.
- As a **Business Owner**, I want confidence that Staff can never record
  or see a Withdrawal, so that my personal draws stay private even from
  someone I trust to run day-to-day stock and sales recording.

## Business Rules

**What a Withdrawal records**
- Date, a required positive amount, and an *optional* free-text reason
  and notes (`AddWithdrawalView.tsx`; `Withdrawal` type, `types.ts` lines
  160–167) — description is optional here, deliberately, unlike Expenses
  (spec #8) where it's required. This asymmetry is intentional, not an
  oversight: a Withdrawal is the owner's own capital, and the app does
  not require the owner to justify taking out their own money the way it
  requires a reason for an inventory loss (Quebra) or a description for
  an operating cost (Expense).

**Owner-only, end-to-end — the one module in this pair without a gap**
- Withdrawals is gated identically at every layer: `navigationTabs.ts`
  (`ownerOnly: true`), `App.tsx` (`!isStaff && activeTab ===
  'add-withdrawal'` / `'reports'`), and Firestore rules (`allow read,
  create, update, delete: if isOwnerOf(businessId)` — read included,
  not just write). This is a deliberate contrast worth naming plainly:
  spec #7 (Quebras) and spec #8 (Expenses) both found a UI/rules
  mismatch where the delete button rendered for roles the backend would
  silently reject. Withdrawals has no equivalent gap, because Staff
  cannot reach the screen in the first place — there's no button to
  mis-gate.

**Never conflated with Expenses**
- A Withdrawal never appears in, or is summed into, the Expense
  collection or `totalExpensesAllTime` — Architecture 8.7, Principle
  2.4. Both terms are subtracted from Business Worth in the same
  formula (spec #2), but always as two separate, separately-labeled
  figures, never merged into one "money out" total anywhere in the UI.

**Same immutability gap as Expenses, repeated here**
- Architecture 7.6's "mutable until locked, then frozen" rule names
  Expenses *and* Withdrawals together. Exactly as spec #8 found for
  Expenses: there is no `updateWithdrawal` function anywhere (stricter
  than "mutable" — a Withdrawal is never editable at all, locked or
  not), and `deleteWithdrawal` (lines 1125–1128) has no check of any
  kind — no `closingId` field on the `Withdrawal` type, and `Closing`
  (spec #11, not yet written) stores only aggregate totals, not the
  underlying record IDs it locked. An Owner can delete a Withdrawal from
  an already-closed period today, and nothing will flag that the
  Closing's frozen `totalWithdrawals` snapshot no longer matches a live
  recalculation. This is the same gap spec #8 named, not a new one —
  restated here because it affects this module's data identically and
  should be closed for both at once, not module-by-module.

**A loose term worth flagging, lightly**
- The form's own info note describes a Withdrawal as reducing
  "Available Capital" (`addWithdrawal.infoNote`, `en.ts` line 385) — but
  no figure named "Available Capital" is computed or displayed anywhere
  else in the app; the note is informal language for Business Worth
  (spec #2). Minor, but the same category of looseness spec #6 flagged
  for "finalized" — worth tightening to the actual term the rest of the
  product uses, so the two don't read as two different things to an
  Admin who happens to notice both.

## Functional Requirements

*Exactly what the module must do.*

1. Record a Withdrawal with date (defaults to today), a required
   amount, and optional reason/notes — currently implemented
   (`AddWithdrawalView.tsx`).
2. Offer quick-fill reason suggestions (personal use, salary, family,
   emergency, home, vehicle, other) while accepting free text or leaving
   it blank — currently implemented (`COMMON_REASON_KEYS`).
3. Restrict every access path — entry form, viewing, and deletion — to
   the Owner role only, at the nav, routing, and Firestore-rule layers
   simultaneously — currently implemented and correctly consistent
   (Business Rules, above).
4. Feed every Withdrawal into `totalWithdrawalsAllTime`, subtracted from
   Business Worth the moment it's recorded — currently implemented.
5. Log a `TimelineEvent` (type `withdrawal-recorded`) alongside every
   Withdrawal creation, with its financial impact shown as a negative
   figure — currently implemented (`addWithdrawal`, lines 1107–1120).
6. Support grouping and viewing Withdrawals by month or reason in the
   Withdrawal Report, with export to PDF/Excel — currently implemented
   (`WithdrawalReport.tsx`).
7. **Not currently implemented:** an `updateWithdrawal` function and a
   `closingId` (or equivalent) field, matching Functional Requirement #7
   already named in spec #8 for Expenses — the same underlying gap,
   affecting both collections.
8. **Not currently implemented:** blocking edit/delete of a Withdrawal
   once it belongs to a locked Closing period — depends on Functional
   Requirement #7 existing first, exactly as spec #8 stated for
   Expenses.
9. **Not currently implemented:** a confirmation step before a
   Withdrawal delete completes (`WithdrawalReport.tsx` line 164 has no
   confirm dialog) — a smaller-severity version of the gap spec #7/#8
   named, since role-gating here is already correct; only the missing
   "are you sure?" step remains.
10. **[Amendment v1.0] Not currently implemented:** blocking *creation*
    of a new Withdrawal whose `date` falls inside an already-closed
    period, matching Functional Requirement #10 in spec #8 — see
    [Closing Integrity Amendment](./08-09-11-closing-integrity-amendment.md)
    Decisions Record, Q1/Q2 — approved.
11. **[Amendment v1.0] Not currently implemented:** future-dated
    Withdrawals remain unrestricted (Amendment Q3 — no change).

## Non-functional Requirements

**Performance**
- Recording a Withdrawal is a single `setDoc` write plus one
  `TimelineEvent` write — O(1). `totalWithdrawalsAllTime` is a single
  reduce over the full collection, O(n) — immaterial at current scale
  (Architecture Section 11), same as Expenses (spec #8).

**Security**
- The one module in Phase 2 so far with no security/UI mismatch:
  `isOwnerOf(businessId)` gates read, create, update, *and* delete
  identically, and every UI entry point agrees. Worth stating as the
  positive baseline the other modules' gaps should be brought up to,
  not the other way around.

**Accessibility**
- Amount and total figures use `.type-number`/tabular-nums consistently;
  the info note pairs its explanatory icon with text, never color alone.

**Offline**
- Not currently implemented, consistent with the platform-wide gap
  already named in Dashboard (spec #1), Stock Batches (spec #5),
  Breakages (spec #7), and Expenses (spec #8).

**Mobile**
- Form follows standard input sizing and spacing per
  [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) — full-width inputs,
  `min-h-[52px]` primary action button, same pattern as
  `AddExpenseView.tsx`.

## KPIs

**How do we know this module succeeds?**

- Every recorded Withdrawal is reflected in Business Worth within the
  same render, and is never visible to a Staff session at any layer —
  both are checkable invariants, not just expectations.
- Time-to-record: an Owner can log a withdrawal in under 15 seconds
  (reason optional and one-tap where given at all).
- Zero Closing/live-total mismatches once Functional Requirements #7–8
  are implemented — shared with spec #8's identical KPI, since both
  modules need the same fix to satisfy it.

## Future Enhancements

*Ideas — not implementation.*

- **Implement the shared `closingId` field and lock check** for both
  Expenses and Withdrawals together (spec #8's Future Enhancements,
  restated here) — one fix, two modules.
- **Build the Manager tier** (Architecture 6.3) so "Manager, if granted"
  becomes a real, checkable permission for Withdrawals rather than an
  architecturally-intended state with no implementation path yet.
- **Add a confirmation step** before a Withdrawal delete completes
  (Functional Requirement #9).
- **Tighten "Available Capital"** in the info note to match Business
  Worth's actual name (spec #2), closing the small terminology gap
  named above.

## Acceptance Criteria

**When can this module be considered complete?**

- [ ] A Withdrawal can be recorded and immediately reduces Business
      Worth, visible everywhere that figure appears, while remaining
      fully invisible to any Staff session.
- [ ] A Withdrawal gains a `closingId` (or equivalent) field, and
      edit/delete is blocked once a Closing has locked it — the same
      fix spec #8 requires for Expenses, applied here too.
- [ ] A confirmation step exists before a Withdrawal delete completes.
- [ ] A product decision has been made on whether/when the Manager tier
      (Architecture 6.3) will be implemented, so "if granted" access to
      Withdrawals has a concrete path rather than remaining permanently
      aspirational.
- [ ] **[Amendment v1.0]** A new Withdrawal cannot be created with a
      `date` inside an already-closed period.
- [ ] **[Amendment v1.0]** An Owner can reopen a closed period
      (admin-only, logged), correct or add Withdrawals, then re-close
      it — the sanctioned correction path for a locked record.
