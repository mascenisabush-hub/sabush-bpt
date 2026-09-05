Implementation Authorization Proposal — DRAFT

# Implementation Authorization — Periodic Contagem Keyboard Shortcut Feature

**Type:** Governance bridge document — the formal record that
engineering governance is complete and implementation would be
authorized to begin, strictly within the scope defined below, **once
signed**. Does not itself perform implementation and does not modify
code, `firestore.rules`, schema, UI, or tests.

## 1. Authorization Status

**DRAFT — AWAITING PRODUCT ARCHITECT ACCEPTANCE.**

This is not yet an authorization. No code change is permitted on the
basis of this document until §9's signature block is completed by the
Product Architect. Prior to that signature, no code, `firestore.rules`,
schema, UI, or test file has been created, modified, or committed to
produce this document.

**Repository state at drafting:** `main = origin/main = 3787604`
("governance(keyboard-shortcuts): Specification, Implementation Plan,
and Rule 8 Assessment for Periodic Contagem Keyboard Shortcuts"),
working tree clean, confirmed via `git status --short` and
`git log -1 --oneline` immediately before this document was drafted.
Nothing has been modified in `apps/`, `server/`, `firestore.rules`,
`firestore.indexes.json`, `package.json`, `tests/`, Decisions 44–56, the
existing Decisions 44–56 Rule 8 Assessment, or the existing Decisions
44–56 Implementation Authorization to produce this document.

**No duplicate:** a repository-wide search for existing keyboard-
shortcut Implementation Authorization artifacts (`find docs -iname
"*keyboard*authoriz*"`) returns nothing prior to this document, and a
search for "keyboard" anywhere in `docs/` returns exactly the
specification, the Implementation Plan, and the Rule 8 Assessment this
document is chained from — no conflicting or duplicate authorization
exists.

## 2. Governance Basis

[Keyboard Shortcut Implementation Specification](../specs/periodic-contagem-keyboard-shortcuts-specification.md)
→ [Keyboard Shortcut Implementation Plan](./periodic-contagem-keyboard-shortcuts-implementation-plan.md)
(accepted by the Product Architect) →
[Rule 8 Assessment](./periodic-contagem-keyboard-shortcuts-rule8-assessment.md)
(✅ **READY FOR IMPLEMENTATION AUTHORIZATION**, commit `3787604`) →
**THIS Implementation Authorization** → *(next, only once §9 is signed:
implementation)*.

**Governance chain, explicit:**

```
Keyboard Shortcut Specification
  → Keyboard Shortcut Implementation Plan
  → Feature-Scoped Rule 8 Assessment (READY FOR IMPLEMENTATION AUTHORIZATION, 3787604)
  → Implementation Authorization (THIS DOCUMENT — pending §9 signature)
  → Implementation (not yet authorized)
```

**This authorization is deliberately narrower than, and does not
amend, extend, or reinterpret,** the existing
[Decisions 44–56 Implementation Authorization](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md).
That authorization's own §3 explicitly excludes any feature not present
in Decisions 44–56's own accepted governing artifacts — a keyboard-
interaction layer is not such a feature, which is precisely why this
separate authorization exists rather than an amendment to that one
(Rule 8 Assessment §15 of the Implementation Plan; carried forward here
unchanged).

## 3. Rule 8 Findings Carried Forward

The Rule 8 Assessment (`3787604`) recorded three findings, none of
which blocks this authorization. They are carried forward here,
unaltered, as the implementer's required attention points — not as open
governance questions:

- **2.A-1 — Informational.** The finalization review screen
  (`pendingTally !== null`) is a structurally separate render branch
  with no `<form>` and no quantity input in that tree — Enter-
  suppression logic is correctly unreachable there by construction, not
  merely by convention.
- **2.B-1 — Technical implementation detail.** `ctrlEnterRequestedRef`'s
  reset timing relative to React's effect batching must be handled
  safely: the ref is to be cleared **synchronously at the start of the
  relevant `useEffect` body**, before the advance action is dispatched,
  to avoid a double-advance on rapid repeated Ctrl/Cmd+Enter presses.
- **2.D-1 — Already resolved within the accepted plan.**
  `handleAddNewProductToWorkspace` does not itself enforce
  `subscriptionBlocksNewRecords`; the accepted Implementation Plan
  (Area F) already requires the check to be performed at the shortcut
  handler's call site, not inside the wrapped function.

**None of the above is a new business decision, and none may be treated
as license to alter any function's existing signature, internal logic,
or call sites beyond what is described here and in the Implementation
Plan.**

## 4. Authorized Implementation Scope

Implementation is authorized **only** for the following seven
shortcuts, exactly as specified in the governing specification and
Implementation Plan. No shortcut, scope rule, or suppression rule below
may be reinterpreted, narrowed, or expanded during implementation.

### 4.1 — Enter

- In the active, unvalidated quantity input (catalog or manual row):
  `preventDefault()`, then invoke the existing
  `handleSaveCatalogRow(productId)` / `handleSaveManualRow(index)` —
  unmodified, no new parameters, no new return value.
- In every other in-form text/number input this feature touches —
  product search, manual product-name, date, label, free-text unit,
  cost, selling-price — `preventDefault()` only; no other action.
- The `<select>`-rendered unit field receives no new handler; native
  `<select>` Enter behavior is left untouched.
- No global `preventDefault()` on the form's `onSubmit` or on the
  `<form>` element itself. Every suppression is per-input.

### 4.2 — Ctrl/Cmd+Enter

- Scoped to the active row's quantity input only.
- Invokes the exact same Validar call as plain Enter — no second
  implementation of Validar.
- Advances to the next unvalidated entry **only** after the row's
  `validated` field is observed transitioning to `true` — the accepted
  Option (b) design (§4.2 of the Implementation Plan; §2.B of the Rule 8
  Assessment) — never via a changed handler return value, and never via
  any other detection mechanism.
- The next-unvalidated lookup reads **`visibleUnifiedListEntries`**
  exclusively — never `unifiedListEntries` or
  `sortedUnifiedListEntries` — so the operator's active search filter
  and current `validatedSortMode` remain authoritative.
- The lookup skips any entry whose corresponding
  `periodicStockDraftItemsByKey[key]?.state === 'CONFLICT'`. If every
  remaining unvalidated entry is conflicted, the implementation calls
  `scrollToConflictPanel()` — it must never call
  `handleUnifiedEntryClick` directly on a conflicted entry.
- Never sets `pendingTally`, never calls `handleRequestConfirmation` or
  `handleConfirmSave`, under any input sequence or timing.
- Validation failure, or a cancelled zero-quantity `window.confirm`,
  must never advance — guaranteed by construction under Option (b),
  since `row.validated` cannot transition to `true` on either failure
  path (re-confirmed directly against `handleSaveCatalogRow`/
  `handleSaveManualRow`'s source in the Rule 8 Assessment, §2.B).

### 4.3 — `/`

- Focuses the existing `productSearch` input via a new `searchInputRef`.
- Suppressed while `document.activeElement` is any other text/number
  input.
- Suppressed while `viewingCount !== null` or `discardConfirmState ===
  'confirming'`.
- Available to a Viewer — search is read-only and introduces no
  mutation capability.

### 4.4 — ↑ / ↓

- Captured only while the search input or a unified-list row (via the
  existing `role="button" tabIndex={0}` pattern) has focus — never
  captured while focus is inside the active workspace's own
  quantity/unit/price fields.
- Move a highlighted pointer over **`visibleUnifiedListEntries`**, the
  same array Ctrl/Cmd+Enter's lookup uses — no second ordering,
  sorting, or filtering system.
- No wraparound at either boundary.
- Validated products remain navigable — never filtered out of arrow
  traversal.
- Activation (opening a highlighted row) continues to use the existing
  per-row `onKeyDown` (`Enter`/`Space` → the existing activation
  closure) — arrow-key code adds no second activation path.

### 4.5 — Esc

Exact five-step priority chain, evaluated in this order on every
keydown:

1. Shortcut-help panel open (`showShortcutHelp === true`) →
   close it.
2. `viewingCount !== null` (historical-count modal open) →
   `setViewingCount(null)`.
3. `discardConfirmState === 'confirming'` →
   `setDiscardConfirmState('idle')`.
4. `isWorkspaceActive` → `handleLeaveWorkspaceUnchanged()`.
5. Otherwise → no-op.

Esc must never call `handleDiscardDraft` or any other destructive
action, directly or indirectly. Esc on the finalization review branch
(`pendingTally !== null`) — i.e. wiring Esc to that screen's own
`setPendingTally(null)` "Voltar" — is **explicitly outside this
authorization's scope**, exactly as the specification (§7.2) and the
Implementation Plan (Area E) both already state; it is not implemented
as part of this feature.

### 4.6 — N

- Editor only (`isActiveContagemEditor`).
- Only while `!isWorkspaceActive`.
- Only while `!subscriptionBlocksNewRecords`, checked explicitly at the
  shortcut handler's call site (per Rule 8 Finding 2.D-1, §3 above) —
  `handleAddNewProductToWorkspace` itself is not modified to add this
  check internally.
- Suppressed while typing in any text field, and while
  `viewingCount !== null` or `discardConfirmState === 'confirming'`.
- Invokes the existing `handleAddNewProductToWorkspace()` unmodified.
- Focuses the new manual row's product-name field, not its quantity
  field, via the same `activeWorkspaceProductKey`-keyed focus mechanism
  used elsewhere in this feature.
- Grants a Viewer no capability the Viewer cannot already reach by
  mouse — a Viewer never satisfies the `isActiveContagemEditor` gate.

### 4.7 — `?`

- Opens a new, non-persisted, local `showShortcutHelp` boolean state.
- Display-only: reads no Contagem data, writes none, and mutates no
  field on `catalogRows`, `manualRows`, `pendingTally`, or
  `discardConfirmState`.
- Rendered as a `fixed inset-0 ... z-50` overlay matching the existing
  historical-count modal's structural pattern, with `role="dialog"` and
  `aria-modal="true"` (an accessibility property the existing historical
  modal itself does not yet have — this authorization does not require
  or permit retrofitting it onto that modal; only the new help panel
  carries it).
- Content: the seven shortcuts from §4 above, in plain operator-facing
  Portuguese, not internal handler names.
- Closes on Esc (highest priority in the chain, §4.5 step 1 above) or on
  an outside click on its own backdrop, matching the historical modal's
  existing backdrop-click convention.

## 5. Technical Boundaries — Explicit Prohibitions

Implementation under this authorization must **not**:

- Modify `handleRequestConfirmation`, `handleConfirmSave`,
  `resolvePeriodicConflict`, or `tallyStockCountRows` in any way.
- Introduce any new Firestore write path, new document shape, or new
  field on any persisted type (`StockCountWorkingRow`,
  `PeriodicStockDraftItem`, or any other).
- Modify `firestore.rules` or `firestore.indexes.json`.
- Change conflict semantics, finalization authority, or delegated-
  editor authority in any way.
- Change any offline/reconnect governance or behavior.
- Modify Decisions 44–56, the existing Decisions 44–56 Rule 8
  Assessment, or the existing Decisions 44–56 Implementation
  Authorization.
- Apply a global `preventDefault()` at the form's `onSubmit` or on the
  `<form>` element.
- Introduce a second sorting/filtering implementation distinct from
  `visibleUnifiedListEntries`/`sortByValidatedMode`.
- Introduce a second Validar implementation distinct from
  `handleSaveCatalogRow`/`handleSaveManualRow`.
- Introduce a global Ctrl/Cmd+Enter finalization shortcut, or any
  keyboard path that can set `pendingTally` other than the operator's
  own deliberate interaction with the existing submit button.
- Introduce F1, F2, Ctrl/Cmd+F, or Ctrl/Cmd+S as shortcuts, for any
  action.
- Perform any unrelated UI redesign of Periodic Contagem beyond the
  seven shortcuts named in §4 and their minimal, named focus/highlight
  affordances.

## 6. Finding K Boundary

Finding K's status, as recorded in
`docs/engineering/finding-k-real-environment-verification-evidence.md`
and reaffirmed by the Rule 8 Assessment (`3787604`, §2.H), remains:

**PARTIALLY VERIFIED — NOT FULLY RESOLVED.**

This authorization does not change, resolve, or narrow Finding K's
remaining browser/page-lifecycle/cross-tab verification requirement.
**No test, verification step, or implementation artifact produced under
this authorization may be cited as evidence toward resolving Finding
K.** This feature operates entirely within a single tab's existing UI
interaction layer and is orthogonal to Finding K's cache/session
isolation concern.

## 7. Authorized Files

Implementation under this authorization is restricted to exactly:

- `apps/tenant/src/components/PeriodicStockCountView.tsx`
- `tests/periodic-contagem-keyboard-shortcuts.test.ts` (new file)

**No other file** — no other application file, no server file, no
Firestore rules or index file, no schema/type file
(`apps/tenant/src/types.ts`), no context file
(`apps/tenant/src/context/AppContext.tsx`), and no governance artifact —
may be created, modified, or deleted under this authorization. If
implementation discovers a genuine necessity to touch any file outside
this list, that necessity must be separately identified and separately
governed before proceeding — this authorization does not itself extend
to cover such a discovery.

## 8. Testing Authorization

The 18 tests and the five named regression protections defined in the
accepted Implementation Plan (§9) are authorized as the required test
coverage for this feature, to be added in
`tests/periodic-contagem-keyboard-shortcuts.test.ts` using this
repository's established testing convention — `node:test` +
`node:assert`, source-text/regex assertions against the raw
`PeriodicStockCountView.tsx` source, run via `npx tsx --test` — exactly
as every existing Periodic Contagem test file already does. **No new
testing framework, DOM/React render harness, or test runner may be
introduced for this feature.** The Rule 8 Assessment's own honesty note
(§2.I) — that two of the eighteen tests can only be verified
structurally, not behaviorally, given this repository's existing
testing ceiling — is carried forward as an accepted, disclosed
limitation, not a defect to be engineered around by introducing new
tooling.

## 9. Completion Criteria

Implementation under this authorization is complete and successful only
if **all** of the following hold:

1. All seven authorized shortcuts (§4) behave exactly as specified —
   no behavior added, removed, or altered from what §4 describes.
2. No accidental form submission or finalization occurs from any Enter
   press in any field this feature touches.
3. Ctrl/Cmd+Enter advances to the next unvalidated entry only after
   genuine, successful validation — never on a failed validation or a
   cancelled zero-quantity confirmation.
4. No conflict is ever silently bypassed or auto-resolved — a
   `CONFLICT`-state entry is never opened directly by any shortcut path.
5. Viewer permissions are unchanged — no shortcut grants a Viewer any
   mutation capability not already reachable by mouse.
6. Existing search filtering (`productSearch`) and the existing
   validated sort mode (`validatedSortMode`) remain authoritative for
   every shortcut that navigates or advances through the product list.
7. No new persistence mechanism or Firestore write path is introduced
   anywhere in the diff.
8. Decisions 44–56, the existing Decisions 44–56 Rule 8 Assessment, and
   the existing Decisions 44–56 Implementation Authorization remain
   completely untouched.
9. None of the five explicitly rejected shortcuts (F1, F2, Ctrl/Cmd+F,
   Ctrl/Cmd+S, global Ctrl/Cmd+Enter-to-finalize) is present anywhere in
   the implementation.
10. No unrelated product or UI redesign is introduced.
11. All 18 required tests, plus the five named regression protections,
    are present and pass under this repository's established testing
    convention.
12. The complete diff touches only the two files named in §7 — no more,
    no fewer.

**This document does not claim any of the above is already implemented,
verified, or complete.** As of this draft's own writing, no
implementation exists.

## 10. Acceptance

**No implementation may begin until the Product Architect accepts and
signs this authorization.**

> I accept this Implementation Authorization and authorize
> implementation within the exact scope defined above.

**Product Architect:** SABUSHIMIKE MASCENI

**Date:** *[to be recorded upon acceptance]*
