Periodic Contagem — Unit/Selling-Price Validation, Live-Total Integrity, Finalization Safety (§48 + Decisions A/B/C)

**Status:** ✅ **SIGNED AND AUTHORIZED FOR IMPLEMENTATION.**

Prepared following review of the complete Rule 8 Assessment
(`docs/engineering/periodic-contagem-validation-live-total-persistence-safety-rule8-assessment.md`,
committed `d33af68`), which found no remaining independent blocker for
the scope below. Signed by the Product Architect (§5). Implementation
of exactly the scope in §1 may now proceed; nothing here authorizes
deployment.

---

## 1. What This Authorization Covers (once signed)

### 1a. Unit and Selling Price validation (§48 C/D)

`validateWorkingRowForSave` (`PeriodicStockCountView.tsx`) extended
with two additional checks, in the same function, same style as the
existing quantity check:

- **Unit:** blank is rejected. Exact message: *"Introduza a unidade
  contada."* (Portuguese, matching every existing message in this
  function's own style — no technical terminology.)
- **Selling Price:** blank, zero, negative, or non-numeric is
  rejected. Exact message: *"Introduza um preço de venda válido,
  maior que zero."*

No enum, whitelist, or new unit-relationship rule is introduced. This
is exactly, and only, the two checks §48 C/D specify.

### 1b. Progression requires safe persistence state, not validated alone (Decision A)

`advanceAfterValidation` and the auto-close-workspace effect
(`PeriodicStockCountView.tsx`), both currently keyed on `row.validated`
alone, extended to also require `persistenceState` to be in the
permitted set: `saved`, or transiently `saving` (held briefly, no
error shown — Decision A3). `conflict`, `save-blocked`,
`occupied-target-rejected`, and `save-unknown` all continue to block,
using the `persistenceState` already computed by this session's own
prior PA-08 wiring -- no new derivation logic, only a new consumer of
an existing one.

### 1c. Live-total honesty (§48 E, Decision B's live-total half)

`tallyStockCountRows` (`stockCount.ts`), extended with the identical
validity check from 1a (Unit non-blank, Selling Price positive),
applied the same way blank quantity already is: a row failing this
check is excluded from `countedItems`/the summed totals and added to
`notCountedProductNames`, exactly mirroring the existing pattern for
blank quantity -- not a new mechanism, an application of the one that
already exists. The row itself remains fully visible in the rendered
list at all times -- this exclusion is from the sum, not from what the
owner sees; nothing here causes a row to disappear from view.

### 1d. Finalization client-side gate (Decision B)

`handleRequestConfirmation`/`handleConfirmSave`
(`PeriodicStockCountView.tsx`), each already containing two gates
(`migrationStatus === 'blocked'`, `unresolvedRecoveryEvidence`),
extended with a third, in the identical style: block if any group's
`persistenceState` is `conflict`, `save-blocked`,
`occupied-target-rejected`, or `save-unknown`. Message reuses the same
human-language pattern already established by the two existing gates.

### 1e. Recovery evidence surfaced proactively on resume (Decision C)

`handleResumeDraft`, after computing `unresolvedRecoveryEvidence`
(already wired, this session's own prior work), additionally sets a
visible banner state immediately -- reusing the exact existing message
text already used at finalization-attempt time, only shown earlier,
not reworded.

### 1f. Visible labels for the three user-action-required PA-08 states (§48 C.1)

The three `sr-only` labels (`save-blocked`, `occupied-target-rejected`,
`save-unknown`) in the render loop's status-icon block become
visible, non-`sr-only` text, in place. `saving` and `conflict` are
unchanged -- no new treatment, per the original C.1 classification
(saving is transient and correctly silent; conflict already has
adequate visible treatment).

---

## 2. What This Authorization Does Not Cover

- Save-unknown listener-reconciliation (Phase 3) -- explicitly out of
  scope, per §48's own non-decision; not authorized here or by any
  document in this chain.
- Any new Firestore rules change, any new aggregate counter -- per the
  Rule 8 Assessment's own §18.B resolution, none is currently required
  for Save-blocked or Occupied-target-rejected; Conflict's existing
  `openConflictCount` protection is untouched.
- Cost Price in any form -- remains fully outside Contagem, per §44,
  unaltered by anything in this authorization.
- Any change to product identity, stable row identity, migration,
  tombstones, grouping, or the Business Worth Engine.
- `InitialStockCountView.tsx` -- untouched.
- Any UI redesign beyond the specific, narrow changes in §1 above.

---

## 3. Precise Acceptance Criteria

1. A row with blank Unit cannot be validated ("Validar" refuses,
   showing the exact message in §1a); once corrected, it validates
   normally.
2. A row with blank, zero, negative, or non-numeric Selling Price
   cannot be validated, with the exact message in §1a; a positive
   numeric value validates normally.
3. A validated row whose `persistenceState` is not `saved`/transiently
   `saving` cannot be advanced past via Ctrl/Cmd+Enter, nor
   auto-close its workspace, until it reaches a safe state.
4. An unvalidated or invalid-Unit/Selling-Price row is excluded from
   `liveTally`'s summed totals but remains fully visible in the
   rendered list, distinguishable from a row genuinely not yet
   started.
5. Finalization (`handleRequestConfirmation`/`handleConfirmSave`)
   cannot proceed while any group's `persistenceState` is `conflict`,
   `save-blocked`, `occupied-target-rejected`, or `save-unknown`.
6. On resume, unresolved recovery evidence is shown immediately, not
   only at finalization attempt.
7. Sighted users see visible text for `save-blocked`,
   `occupied-target-rejected`, and `save-unknown` -- not merely an
   icon.
8. No change to any already-passing existing Contagem test's own
   asserted behavior for a row that is fully valid and safely
   persisted -- every scenario in that category is explicitly
   unaffected by this authorization.

---

## 4. Governance Gates

- Rule 8 Assessment:
  `docs/engineering/periodic-contagem-validation-live-total-persistence-safety-rule8-assessment.md`
  (`d33af68`) -- reviewed as a whole for this authorization; no
  remaining independent blocker found for the scope in §1.
- §48 amendment:
  `docs/specs/periodic-contagem-validation-live-total-persistence-safety-amendment.md`
  (`70d2cfc`) -- the signed source decision this authorization
  implements.
- §44 amendment (Cost Price Removal) -- unaltered, reaffirmed, not
  reopened.
- Tests required before this authorization's own scope can be
  considered complete: unit tests for every explicit Unit/Selling-Price
  case; progression tests for both mechanisms (manual, auto-close),
  including confirmation that an unrelated, valid product remains
  unaffected while one row is held; live-total tests confirming a
  valid row's sum is unchanged and an invalid row is honestly excluded
  without disappearing from view; finalization tests per blocking
  state; and the full existing regression suite already identified in
  the Rule 8 Assessment (`periodic-contagem-cost-price-removal.test.ts`,
  `periodic-contagem-validar-decision-40.test.ts`,
  `periodic-contagem-shared-live-data-decisions-44-56.test.ts` and its
  emulator counterpart) remaining green throughout.
- Typecheck (`npx tsc --noEmit -p apps/tenant`) clean before any
  commit, per this repository's own standing discipline.

---

## 5. Product Architect Signature

**Status:** ✅ **Signed and Authorized.**

This authorization is signed. It authorizes exactly the scope in §1,
nothing more.

**Product Architect:** SABUSHIMIKE MASCENI
**Decision:** ACCEPTED / SIGNED
**Authorization:** AUTHORIZED FOR IMPLEMENTATION
**Date:** 27 September 2026
