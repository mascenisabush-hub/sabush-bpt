# Implementation Plan — Periodic Contagem Keyboard Shortcuts

**Type:** Planning document. Does not itself perform implementation and
does not modify code, `firestore.rules`, schema, tests, Decisions 44–56,
Rule 8, or the existing Implementation Authorization.

**Repository state at drafting:** `main = origin/main = 3ff931c`
("fix(periodic-contagem): entry-time sort now actually reorders existing
products"), working tree otherwise clean except for one untracked,
uncommitted file: `docs/specs/periodic-contagem-keyboard-shortcuts-specification.md`
(the governing specification this plan implements, added in the prior
step of this same work session). Confirmed directly against
`git status --short` and `git log -1 --oneline` immediately before
drafting this document. Nothing has been modified in `apps/`, `server/`,
`firestore.rules`, `firestore.indexes.json`, `package.json`, `tests/`,
Decisions 44–56, Rule 8, or the existing Implementation Authorization to
produce this plan.

**Governing chain for this feature:**
[Keyboard Shortcut Implementation Specification](../specs/periodic-contagem-keyboard-shortcuts-specification.md)
→ **THIS Implementation Plan** → *(next: Rule 8 Assessment for this
feature, then its own Implementation Authorization — neither exists yet;
see §15)*.

---

## 1. Purpose

Periodic Contagem's counting loop today is:

**Search (click into field, type) → select (click a row) → quantity
(click into field, type) → validate (click "Validar") → next product
(click again) → repeat.**

Every step but typing itself currently requires a mouse click. The
productivity objective of this feature is to collapse that loop to:

**Search (type) → select (arrow keys) → quantity (type) → validate +
advance (Ctrl/Cmd+Enter) → repeat**

for an operator physically counting stock, often on a device with an
attached keyboard, who currently reaches for the mouse between every
single product. This is **not** a keyboard-heavy redesign of Periodic
Contagem, and it changes nothing about what can be counted, how a count
is validated, or how a Contagem is finalized — it only adds faster paths
to actions that already exist and are already reachable by mouse today.

---

## 2. Governing specification

This plan implements, in full and without reinterpretation,
[`docs/specs/periodic-contagem-keyboard-shortcuts-specification.md`](../specs/periodic-contagem-keyboard-shortcuts-specification.md)
(15 sections, "Status: SPECIFICATION ONLY", produced in the immediately
preceding step of this work session). Every shortcut, scope rule,
suppression rule, and rejected-shortcut entry in that document is
authoritative for this plan. This plan does not add, remove, or
renegotiate any requirement the specification states — where the
specification left a point explicitly open (its own §4.2 and §15), this
plan carries that same point forward as open rather than resolving it
unilaterally (see §15 below, "Critical implementation-planning rule").

---

## 3. Current architecture (verified against actual source, not assumed)

All line numbers below were re-confirmed against
`apps/tenant/src/components/PeriodicStockCountView.tsx` at commit
`3ff931c` immediately before writing this plan.

- **The form boundary.** `<form onSubmit={handleRequestConfirmation}
  className="space-y-2">` opens at line 6320 and closes at line 7960.
  The only `type="submit"` element inside it is the "Rever e Confirmar
  Contagem" button at line 7954. Every other interactive button inside
  the form (`Validar`, `Adicionar produto`, `Voltar (deixar sem
  alterações)`, `Começar de Novo`) is `type="button"`. This is the exact
  mechanism the specification's §0/§3 addresses.
- **The unified product list.** `unifiedListEntries` (built around line
  4180) merges catalog and manual rows into one list, each carrying
  `activationKey`, `rowKey`, `kind` (`'catalog' | 'manual'`),
  `catalogProductId`/`manualRowIndex`, `validated`, `entrySequence`, and
  `firstWriteAt`. `filteredUnifiedListEntries` applies `productSearch`.
  `sortedUnifiedListEntries` applies `sortByValidatedMode` with
  `validatedSortMode` (one of `name-asc`, `name-desc`, `value-desc`,
  `value-asc`, `entry-order`, `time-desc`, `time-asc`).
  **`visibleUnifiedListEntries`** (line ~4232) additionally excludes the
  currently-active product's own entry while a workspace is open — this
  is the exact array this plan's navigation and next-unvalidated-entry
  lookup must read from, matching the specification's own requirement.
- **`handleUnifiedEntryClick(entry)`** (line 4254): a single router — if
  the entry is already `validated`, it calls
  `handleEditCatalogRow`/`handleEditManualRow` (the "queres editar?"
  confirmation path); otherwise it calls
  `handleSelectExistingProductForWorkspace(entry.activationKey)` to open
  it. This function itself performs **no** conflict check.
- **`handleEntryActivation`** — not a named function but the inline
  closure at the render site (line ~7793) wrapping each list row's
  `onClick`/`onKeyDown`. It layers two checks `handleUnifiedEntryClick`
  itself does not have: (1) `disabled` (`isWorkspaceActive`, i.e. a
  different product is already open) blocks activation entirely; (2)
  `isRowConflicted` (reading
  `periodicStockDraftItemsByKey[conflictRowKey]?.state === 'CONFLICT'`)
  redirects to `scrollToConflictPanel()` instead of opening the row. Any
  keyboard code path that activates a row **must** replicate this same
  two-check wrapper, not call `handleUnifiedEntryClick` directly — this
  is the exact gap the specification flags in its own §4.2.
- **Quantity inputs.** Exactly one renders at a time under the
  Single-Product Workspace rule: the catalog row's quantity `<input>`
  (line 6913, inside the `isWorkspaceActive`-gated block) or the manual
  row's quantity `<input>` (line ~7416, same gating). Both share
  `type="number" min="0" step="0.01"`.
- **`handleSaveCatalogRow(productId)`** (line 2239) and
  **`handleSaveManualRow(index)`** (line 3170): both (a) run
  `validateWorkingRowForSave`, setting an inline error and returning
  early on failure; (b) if `quantity === 0`, call a blocking
  `window.confirm(...)` and return early if the operator cancels; (c)
  otherwise call `updateCatalogRow`/`updateManualRow` with `validated:
  true` and an `entrySequence`. **Neither function returns a value.**
  This is the exact fact behind the specification's §4.2 flagged
  ambiguity — see §4/Area B below.
- **Existing form submission/finalization.** `handleRequestConfirmation`
  (line 4600) is the form's `onSubmit`. It tallies all rows, validates
  quantities/prices, awaits any in-flight draft writes, performs the
  identity-establishing draft write (§4b), and calls
  `setPendingTally(tally)`. `pendingTally !== null` then renders an
  **entirely separate top-level return branch** (line 5571) — no
  `<form>`, no quantity input, no unified list exist in that tree. This
  plan's shortcuts are therefore structurally unreachable there; no
  extra guard is needed to keep them out of the review screen.
- **`handleLeaveWorkspaceUnchanged`** (line 4415): the "Voltar (deixar
  sem alterações)" handler. Restores `validated: true` on every row that
  was validated before the workspace was opened for editing, touches no
  field values, and clears workspace-activation state. This is the exact
  function Esc must call for its "active workspace" priority step.
- **`setViewingCount`** (state declared line 1658): `null` when the
  historical-count modal is closed; a `StockCount` object when open. The
  modal itself (line 8047) is a `fixed inset-0 ... z-50` overlay whose
  own backdrop `onClick` already calls `setViewingCount(null)` — Esc
  must call the identical setter.
- **`setDiscardConfirmState`** (state declared line 1257, type `'idle' |
  'confirming' | 'discarding'`): the "Começar de Novo" toolbar control
  (line 6414). Its own "Cancelar" button sets `'idle'`; only its second,
  distinctly-labeled button calls the actually-destructive
  `handleDiscardDraft`. Esc must replicate the "Cancelar" button's
  effect only — never the destructive one.
- **`handleAddNewProductToWorkspace`** (line 4562): creates a new blank
  manual row via `handleAddManualRow` and activates the workspace on it.
  Only rendered/reachable in the UI while `!isWorkspaceActive` (its own
  button, line 6605, sits in the pre-workspace-active branch).
- **Current focus model.** There is exactly one existing keyboard
  interaction in this file today: each unified-list row has
  `tabIndex={disabled ? -1 : 0}` and an inline `onKeyDown` that fires the
  same activation closure on `Enter`/`Space` (line 7806–7808). No
  `ref`s, no `document`-level listeners, and no programmatic `.focus()`
  calls exist anywhere else in this component.
- **Conflict handling.** `periodicStockDraftItemsByKey` is keyed
  `catalog:${productId}` / `manual:${index}`; a row's `state ===
  'CONFLICT'` is the authoritative signal (read from the live-adopted
  server draft item, not the local `entry.validated` flag, which the
  live-adoption effect deliberately leaves untouched for a CONFLICT row —
  see the render-site comment at line ~7780). `resolvePeriodicConflict`
  is the only function that clears a conflict; nothing in this plan
  calls or wraps it.
- **Viewer gating.** `isActiveContagemEditor` (prop, destructured line
  683) is `true` for the Owner/Admin or the current delegated Editor,
  `false` for a Viewer. Every mutating control in this file (`Validar`,
  `Adicionar produto`, `Começar de Novo`) is already conditionally
  rendered on this flag or on `isActiveContagemEditor`-derived gates.
  This plan adds no new check the existing render logic doesn't already
  make — see Area A/B/F below for exactly how each shortcut inherits
  this for free rather than needing a duplicated check.

---

## 4. Implementation areas

### Area A — Enter safety and quantity validation

**Plan.** Attach `onKeyDown` directly to the two existing quantity
`<input>` elements (catalog, line 6913; manual, line ~7416) and to every
other in-form text/number `<input>` the specification's §3.2 table
names (product search, manual product-name, date, label, free-text
unit). Each handler:

1. Checks `e.key === 'Enter'`.
2. Calls `e.preventDefault()` unconditionally (this is what stops the
   pre-existing accidental-submit bug for every field it's attached to).
3. **Only** on the quantity input, and only when `!e.ctrlKey &&
   !e.metaKey` (to avoid double-firing alongside Ctrl/Cmd+Enter, Area B)
   and the row is not already `validated`, calls the existing
   `handleSaveCatalogRow(productId)` / `handleSaveManualRow(index)` —
   the exact function the row's own "Validar" button already calls, with
   no parameters or behavior changed.

No handler is attached to a `<select>`-rendered unit field — native
`<select>` Enter handling is left completely alone, per the
specification's own table entry for that case.

**Catalog/manual row handling.** Both quantity inputs get their own,
separately-scoped `onKeyDown` — there is exactly one of each rendered at
a time, so there is never a question of which row's handler fires.

**Preservation of existing validation/error behavior.** The Enter
handler calls the exact same function a mouse click on "Validar" calls,
with the exact same arguments. `validateWorkingRowForSave`'s inline
error state (`catalogRowSaveError`/`manualRowSaveError`), the
`window.confirm` for a zero quantity, and the `entrySequence` assignment
are all reached identically either way — nothing about their internal
logic is touched, referenced, or duplicated.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only (adds `onKeyDown` props to existing JSX elements; no new functions
beyond a tiny shared `suppressEnterSubmit` inline handler reused across
the non-quantity fields to avoid repeating the same three-line arrow
function six times).

---

### Area B — Ctrl/Cmd+Enter validation + advance

**Successful-validation detection — the specification's flagged
ambiguity, resolved here as recommended, not silently.** Neither
`handleSaveCatalogRow` nor `handleSaveManualRow` returns a value today,
and both can exit early (validation failure, or a cancelled
zero-quantity `window.confirm`) with no signal the caller can read
synchronously. Per the specification's §4.2/§15, and per this plan's own
governing instruction not to change an existing handler's signature
unless the architecture demonstrates it's necessary: **this plan adopts
Option (b) — watch `row.validated` transition to `true` via a
`useEffect`, rather than changing either handler's return type.**

Concretely: capture the active row's `validated` value in a ref
immediately before calling the Enter/Ctrl+Enter handler
(`wasValidatedBeforeRef.current = row.validated`). A `useEffect`
dependent on the active row's `validated` field fires the "advance"
logic only when it observes a transition from `false`/`undefined` to
`true` **and** a flag recording that the transition was requested via
Ctrl/Cmd+Enter (a short-lived ref, cleared immediately after use, so
Enter-alone never triggers advancement and a later, unrelated
`validated` change — e.g. from `handleLeaveWorkspaceUnchanged`'s own
restore path — never spuriously advances). This requires zero changes
to `handleSaveCatalogRow`, `handleSaveManualRow`, or any other existing
function's signature or internals — confirmed necessary-to-avoid by
inspection, not assumed: both handlers' full bodies were read in
producing this plan (§3 above), and nothing about their control flow
prevents observing the resulting state change externally.

**Next-entry lookup.** A new, pure helper —
`findNextUnvalidatedEntry(entries, activationKeyToSkip)` — iterates
**`visibleUnifiedListEntries`** (never `unifiedListEntries` or
`sortedUnifiedListEntries`, both of which are pre-filter/pre-exclusion)
in order, returning the first entry where `!entry.validated`. This
automatically respects the operator's current `productSearch` filter
and `validatedSortMode`, per the specification's requirement, with no
second ordering system.

**Skipping conflicted entries.** The helper additionally skips any
entry where `periodicStockDraftItemsByKey[conflictKey(entry)]?.state
=== 'CONFLICT'` (using the identical key convention —
`catalog:${entry.catalogProductId}` / `manual:${entry.manualRowIndex}`
— the render-site `isRowConflicted` check already uses at line ~7780).
If every remaining unvalidated entry is conflicted, the helper returns
`null` and the advance step calls `scrollToConflictPanel()` instead of
opening anything — replicating `handleEntryActivation`'s own two-check
wrapper (§3 above) rather than calling `handleUnifiedEntryClick`
directly on a conflicted entry, which closes the exact gap the
specification's §4.2 flagged.

**No automatic finalization.** The advance step's only two possible
outcomes are "open the next unvalidated entry via
`handleUnifiedEntryClick`" or "do nothing further." Neither path reads,
sets, nor references `pendingTally`, calls `handleRequestConfirmation`,
or interacts with the submit button in any way.

**No-next-entry behavior.** When `findNextUnvalidatedEntry` returns
`null` (list exhausted, not merely conflict-blocked), do nothing beyond
the Validar that already happened. Per the specification, focus is left
to move naturally — the workspace has returned to its "no product
active" state (Single-Product Workspace rule), so the search input is
the sensible next focus target; the same focus-management `useEffect`
described below handles this as one of its cases rather than a special
one-off.

**Focus transfer to next quantity field.** A `useEffect` keyed on
`activeWorkspaceProductKey` (the existing state variable driving which
product is open) runs `.focus()` on the currently-rendered quantity
input's ref whenever that key changes to a new, non-null product. This
is the single focus-management mechanism reused by Ctrl/Cmd+Enter (Area
B), arrow-key Enter-to-open (Area D), and N (Area F) alike — never a
separate implementation per shortcut.

**Handling of failed validation.** If `validateWorkingRowForSave`
rejects the row, `row.validated` never transitions to `true`, so the
`useEffect` above never fires the advance step — the operator sees
exactly the same inline error a failed mouse-click "Validar" would
produce, and remains on the same row with focus undisturbed.

**Handling of a cancelled zero-quantity confirmation.** Identical
reasoning: cancelling `window.confirm` means `updateCatalogRow`'s
`validated: true` call is never reached, so `row.validated` never
transitions, so no advance occurs. This is precisely why Option (b) was
chosen over a return-value approach that would have needed the
`window.confirm` branch to explicitly report `false` — the state-watch
approach gets this case correct with no extra code path.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

### Area C — Product search focus (`/`)

**Search input ref.** The `productSearch` `<input>` (line ~7695) gets a
new `searchInputRef = useRef<HTMLInputElement>(null)`, attached via
`ref={searchInputRef}`. This is the only structural change to that
element.

**Focus behavior.** The shared document-level listener (Area H) calls
`searchInputRef.current?.focus()` on `/`.

**Suppression while typing.** Per the specification's global suppression
rule (§2.1): the listener checks
`document.activeElement?.tagName` against `INPUT`/`TEXTAREA`/`SELECT`
before acting on `/`, `N`, or `?`; if the active element is itself the
search input, focusing it again is a harmless no-op, so no special-case
is needed there — the browser will insert a literal "/" character as
expected.

**Modal/confirmation suppression.** The listener additionally checks
`viewingCount === null && discardConfirmState !== 'confirming'` before
acting on `/` (and on `N`, `?`) — both read from component state already
in scope via closure (see Area H's stale-closure handling).

**Viewer behavior.** No Viewer-specific gate is added for `/` —
searching is read-only and the search input renders identically for a
Viewer and an editor today; per the specification, restricting it would
add a restriction the current UI doesn't have.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

### Area D — Arrow navigation

**Highlighted index.** One new local state,
`const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)`,
indexing into `visibleUnifiedListEntries`.

**Reuse of `visibleUnifiedListEntries`.** The only array iterated —
identical to Area B's next-entry lookup, so both features automatically
stay consistent with each other and with whatever the operator currently
sees on screen.

**Existing sort modes.** No sort-mode-aware logic is added; the array
arrives pre-sorted by the existing `sortByValidatedMode`/
`validatedSortMode` machinery untouched.

**First/last boundaries.** `↓` at the last index and `↑` at index `0` (or
`null`, before any row is highlighted) are no-ops — no wraparound, per
the specification's explicit choice.

**Row focus.** Rather than moving DOM focus itself on every arrow press
(which would fight the existing `tabIndex`/`onKeyDown` pattern already
on each row), the highlighted index drives a CSS highlight class applied
to the corresponding row, and **also** calls `.focus()` on that row's
own DOM node (rows need a `ref` callback added, keyed by `rowKey`, into
a `Map<string, HTMLDivElement>` populated during render) — so the
existing per-row `onKeyDown` (line 7808, already listening for
`Enter`/`Space`) continues to be the single activation path with no
duplication; arrow-key highlighting simply moves which row has that
existing listener focused.

**Enter activation.** Deliberately **not** duplicated — the row's own
existing `onKeyDown` (line 7808) already handles `Enter`/`Space` via
`handleEntryActivation`, which already contains the conflict/disabled
checks Area B's lookup also replicates. Arrow-key navigation only needs
to move focus onto a row; activating it is already solved.

**No interception inside quantity/unit/price fields.** The arrow-key
listener is scoped narrowly: it only acts when
`document.activeElement` is the search input or a unified-list row's own
DOM node (checked via the same ref `Map` used for focus, above) — never
document-level for arrows the way `/`/`N`/`?`/Esc are. This is
implemented as a **local** `onKeyDown` on the search input and on each
row's existing `onKeyDown` (extending it, not replacing it), not the
shared document-level listener from Area H — this keeps native
number-input spinner/cursor behavior in the quantity/unit/price fields
completely untouched, exactly as the specification requires.

**No second sorting/filtering system.** Confirmed by construction: the
highlighted index is a pointer into an array this plan does not
re-sort, re-filter, or copy.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

### Area E — Esc behavior

**Priority hierarchy, exactly as specified:**

```
1. viewingCount !== null            → setViewingCount(null)
2. discardConfirmState === 'confirming' → setDiscardConfirmState('idle')
3. isWorkspaceActive                → handleLeaveWorkspaceUnchanged()
4. otherwise                        → no-op
```

Implemented as a single `if / else if / else if` chain (not three
independent listeners) inside the shared document-level handler (Area
H), evaluated in this exact order every keydown so that if more than one
condition is somehow simultaneously true, only the highest-priority
action fires — matching the specification's own explicit test case for
this (§14 item 13 of the specification).

**Non-destructive guarantee.** Every branch calls a setter or function
already reachable via an existing non-destructive button
(`setViewingCount(null)` ≡ the modal's own backdrop click;
`setDiscardConfirmState('idle')` ≡ its own "Cancelar" button;
`handleLeaveWorkspaceUnchanged` ≡ the "Voltar" button). `handleDiscardDraft`
(the actually-destructive action) is never referenced anywhere in this
Area's code.

**Finalization-review Esc — explicitly excluded, not implemented.** The
review screen's own "Voltar" (`setPendingTally(null)`, line 5741) is
**not** wired to Esc as part of this plan. This is recorded here as an
excluded future possibility only, per the specification's own §7.2 and
this plan's own §16 below — not a planning gap, a deliberate scope
boundary.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

### Area F — N / Add Product

**Preconditions, all required:**

- `isActiveContagemEditor` (Viewer excluded).
- `!isWorkspaceActive` (matches the button's own current render
  condition at line 6605 — this plan does not change when that button
  itself appears, only adds a keyboard path to the same reachable
  state).
- `!subscriptionBlocksNewRecords` — checked directly in the shortcut
  handler, mirroring the gate already applied elsewhere in this file
  (e.g. line 4613) to writes that create new records, even though
  `handleAddNewProductToWorkspace` itself does not check it internally
  today; the keyboard path must not become more permissive than the
  button's actual current reachability, so this plan adds the check at
  the shortcut-handler call site rather than assuming the wrapped
  function already guards it.
- `document.activeElement` is not a text/number input (part of the
  shared suppression check, Area H).
- `viewingCount === null && discardConfirmState !== 'confirming'` (same
  modal-priority check as `/`).

**Action.** Calls `handleAddNewProductToWorkspace()` unchanged.

**Focus new manual product-name field.** Reuses the same
`activeWorkspaceProductKey`-keyed focus `useEffect` from Area B, with one
addition: when the newly-activated product corresponds to
`activeNewManualRowIndex` (i.e., a brand-new, still-nameless manual row —
the existing state this file already uses to distinguish this exact
case, per its own comment at line ~997), the effect focuses the manual
row's product-name input instead of its quantity input, since a
brand-new row has no name yet and quantity is not the useful first field.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

### Area G — Shortcut Help

**Non-persisted, display-only.** One new local boolean,
`const [showShortcutHelp, setShowShortcutHelp] = useState(false)`. No
Firestore read/write, no `AppContext` involvement, no persistence across
sessions or reloads — resets to `false` on every mount, by construction.

**Dialog/accessibility behavior.** Rendered as a `fixed inset-0 ... z-50`
overlay following the exact same structural pattern as the existing
historical-count modal (line 8047: dimmed backdrop with
`onClick={() => setShowShortcutHelp(false)}`, inner panel with
`onClick={(e) => e.stopPropagation()}`) for visual/behavioral
consistency with the app's one other overlay pattern — not a new modal
idiom. The panel itself carries `role="dialog"` and `aria-modal="true"`,
which the existing historical modal does not currently have (a gap in
the existing pattern, not introduced by this plan, and out of scope to
retrofit here — see §16).

**Esc closing with highest priority while open.** When
`showShortcutHelp === true`, it becomes priority **0** in Area E's
chain — evaluated before the historical-modal check — since a help
panel is the most transient, least consequential piece of UI in the
whole feature and should never make the operator dismiss something more
consequential first to reach it.

**Content.** The seven shortcuts from the specification's §1 table, in
the same order, in plain operator-facing language (Portuguese, matching
the rest of this view's UI copy) — not internal handler/function names.

**No Contagem-state mutation.** Opening or closing this panel touches
only `showShortcutHelp`; it reads no Contagem data and writes none.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

### Area H — Shared keyboard listener and lifecycle

**One shared document-level listener** for `/`, `N`, `?`, and Esc — not
four separate ones. (Enter/Ctrl+Enter, Area A/B, and the arrow keys,
Area D, are deliberately **per-element** `onKeyDown` handlers, not part
of this shared listener — matching the specification's own explicit
instruction not to prescribe a global listener for Enter, and Area D's
own requirement to stay scoped to specific focused elements rather than
document-wide.)

**Lifecycle.**

```
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) { /* ... */ }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [/* exact dependency list below */]);
```

Exactly one `addEventListener` call, exactly one matching
`removeEventListener` in the cleanup — no possibility of duplicate
listeners across re-renders, since the effect re-runs (removing the old
listener first) only when its dependency array actually changes.

**Avoiding stale closures.** The handler closes over `isWorkspaceActive`,
`viewingCount`, `discardConfirmState`, `isActiveContagemEditor`,
`subscriptionBlocksNewRecords`, and the data needed for Esc's third
branch. Every one of these must be in the effect's dependency array, or
the handler will act on stale values captured at mount time — a
concrete, real risk given how many of these flip during a normal
counting session (e.g. `isWorkspaceActive` changes every time a product
is opened/closed). The dependency array is therefore deliberately
**not** empty; it is:
`[isWorkspaceActive, viewingCount, discardConfirmState, isActiveContagemEditor, subscriptionBlocksNewRecords]`
plus the stable function references (`setViewingCount`,
`setDiscardConfirmState`, `handleLeaveWorkspaceUnchanged`,
`handleAddNewProductToWorkspace`) which React guarantees stable identity
for setters but **not** necessarily for `handleLeaveWorkspaceUnchanged`/
`handleAddNewProductToWorkspace` themselves, since neither is currently
wrapped in `useCallback`. This plan does **not** propose wrapping either
in `useCallback` merely to stabilize this dependency array — that would
be a change to an existing, already-authorized function's declaration
for a purely UI-lifecycle reason. Instead, the effect re-subscribes on
every render in which any of the primitive dependencies above change,
which is the correct and sufficient behavior even if it means the
listener is occasionally torn down and re-added slightly more often than
the absolute minimum — a negligible cost for a `keydown` listener.

**Active state checks / focus checks / modal priority / Viewer gating.**
All performed inside the single `handleKeyDown` function body, in this
order, before dispatching to any individual shortcut's action: (1) is
the target a form field not matching the shortcut's own required scope
→ return; (2) is a modal/confirmation open that should take priority →
handle Esc's chain or return for `/`/`N`/`?`; (3) is the user a Viewer →
return, for `N` only (per §2.1, `/` and `?` are not Viewer-restricted).

**Duplicate-listener avoidance.** Guaranteed by the single `useEffect`
with a single cleanup, as above — no second `addEventListener` call
exists anywhere else in this plan.

**Files touched:** `apps/tenant/src/components/PeriodicStockCountView.tsx`
only.

---

## 5. Focus architecture

| Target | Mechanism | Why |
|---|---|---|
| Product search input | `searchInputRef` (`useRef<HTMLInputElement>`) | Only element needing imperative `.focus()` from a global (`/`) trigger. |
| Active quantity input (catalog or manual) | `activeQuantityInputRef` (`useRef<HTMLInputElement>`, re-pointed via a `ref` callback each time the active row renders) | Needed for the post-Validar-advance and post-N focus moves (Areas B, F); a single ref is sufficient since exactly one quantity input renders at a time. |
| Manual product-name input (new-row case only) | `activeNameInputRef` (`useRef<HTMLInputElement>`) | Distinct target from quantity specifically for the brand-new-manual-row case (Area F). |
| Unified-list row / highlight | `rowRefsMap` (`useRef<Map<string, HTMLDivElement>>`), keyed by each entry's existing `rowKey` | Needed so the highlighted-index state (Area D) can call `.focus()` on the corresponding row's already-existing `role="button"` element, reusing its already-existing `onKeyDown` rather than adding a second one. |

No refs are added beyond these four. No additional local state is added
beyond `highlightedIndex` (Area D) and `showShortcutHelp` (Area G) —
every other piece of new "state" needed (e.g. "was this validation
triggered by Ctrl/Cmd+Enter") is a `ref`, not `state`, precisely because
it never needs to trigger a re-render and must not participate in
persistence (see §6).

---

## 6. State model

| Name | React state or ref? | Why it exists | Lifecycle / reset | Affects persistence? | Affects Contagem business state? |
|---|---|---|---|---|---|
| `searchInputRef` | ref | Imperative focus target for `/` | Lives for the component's lifetime | No | No |
| `activeQuantityInputRef` | ref | Imperative focus target after advance/N | Re-pointed on every active-row render | No | No |
| `activeNameInputRef` | ref | Imperative focus target for brand-new manual rows | Re-pointed on every new-row render | No | No |
| `rowRefsMap` | ref (`Map`) | Lets arrow-key highlighting focus an existing row DOM node | Entries added/removed as `visibleUnifiedListEntries` changes; cleared entries are simply dropped from the map, never explicitly reset | No | No |
| `highlightedIndex` | state | Drives which row shows the arrow-key highlight | Resets to `null` whenever `visibleUnifiedListEntries` changes shape in a way that invalidates the current index (e.g. search text changes) | No | No |
| `wasValidatedBeforeRef` / `ctrlEnterRequestedRef` | ref | Distinguishes "Validar succeeded because of Ctrl/Cmd+Enter, should advance" from "Validar succeeded because of plain Enter or a mouse click, should not advance" (§4/Area B) | Set immediately before calling Validar, cleared immediately after the advance `useEffect` consumes it | No | No |
| `showShortcutHelp` | state | Controls the help panel's visibility | Resets to `false` on mount; toggled by `?`/Esc/backdrop click only | No | No |

Every row in this table is UI-only, by construction: none of them is
read by `handleRequestConfirmation`, `recordStockCount`,
`flushPeriodicStockDraftRows`, `resolvePeriodicConflict`, or any other
function that writes to Firestore or determines Contagem business
outcome. None of them is included in any object passed to
`updateCatalogRow`, `updateManualRow`, or any draft-write payload. The
keyboard system adds **zero** new fields to `StockCountWorkingRow`,
`PeriodicStockDraftItem`, or any persisted type.

---

## 7. Conflict/concurrency preservation

This plan changes **none** of the following, and demonstrates why below
rather than merely asserting it:

- **Decision 47 (Live Synchronization as Primary Conflict Avoidance).**
  This plan adds no new write path and no new read path into
  `periodicStockDraftItemsByKey`'s live-adoption mechanism — the one
  place it *reads* that state (the CONFLICT-skip in Area B's
  next-unvalidated lookup) uses the exact same field, the exact same key
  convention, and the exact same `'CONFLICT'` sentinel the existing
  render-site check already uses. No new synchronization behavior is
  introduced.
- **Decision 50 (Exactly-One Finalization Protection).** No shortcut in
  this plan calls `handleRequestConfirmation`, sets `pendingTally`, or
  calls `handleConfirmSave`/`recordStockCount`. The only submit path
  remains the one, unmodified `type="submit"` button. Ctrl/Cmd+Enter's
  own "no automatic finalization" property is demonstrated structurally
  in Area B above, not merely stated.
- **Decision 55 (Same-Row Concurrent Observation Conflict Semantics).**
  Untouched — this plan neither creates nor resolves a conflict; its one
  interaction with conflict state is read-only (skip conflicted entries
  when advancing), identical in effect to what a mouse-operating user
  already experiences via `handleEntryActivation`'s existing redirect to
  `scrollToConflictPanel()`.
- **Delegated Editor authority / Viewer restrictions.** Every shortcut
  that performs a mutating action (Enter/Ctrl+Enter → Validar; N → add
  product) is gated on `isActiveContagemEditor`, inherited from the same
  flag the existing buttons already gate on — no shortcut introduces an
  independent authority check that could drift out of sync with the
  click-path checks.
- **Finalizer authorization.** Not touched — finalization's own
  authorization logic (inside `handleConfirmSave`, unmodified) is never
  invoked from any shortcut in this plan.
- **Transaction-based saves.** `updateCatalogRow`/`updateManualRow` and
  their underlying debounced/transactional write mechanisms are called
  by the keyboard shortcuts with **identical arguments** to what the
  existing mouse-click handlers already pass — no new call signature, no
  new batching, no new transaction.
- **Offline/reconnect persistence.** Not touched — this plan adds no
  network-awareness of its own; `draftSaveState`'s existing
  `saving`/`retrying`/`save-failed`/`save-unknown` machinery is
  unaffected and unreferenced by any shortcut except in the sense that a
  keyboard-triggered Validar produces the exact same downstream autosave
  behavior a mouse-triggered one already does.

Every shortcut in this plan is, without exception, a faster way to
invoke a function that already exists, already ships, and is already
independently authorized. No new write path is created anywhere in this
plan.

---

## 8. Finding K boundary

**Finding K remains `PARTIALLY VERIFIED — NOT FULLY RESOLVED`**, per
`docs/engineering/finding-k-real-environment-verification-evidence.md`
§ "FINDING K STATUS AS OF THIS RECORD." This plan does not exercise,
test, or claim evidence toward Finding K's remaining browser/cross-tab
verification requirement — adding keyboard shortcuts to a single tab's
UI interaction layer is orthogonal to Finding K's cache/session
isolation concern, and no test in §9 below is offered, or should be
read, as contributing toward that verification. **No Finding K status
change is part of this plan.**

---

## 9. Testing plan

**Established convention, confirmed by direct inspection, not assumed:**
this repository has **no DOM/React render harness**. Existing Periodic
Contagem test files (e.g.
`tests/periodic-contagem-single-product-workspace.test.ts`,
`tests/periodic-contagem-validar-decision-40.test.ts`) use `node:test` +
`node:assert` with **regex/string assertions against the raw
`PeriodicStockCountView.tsx` source text** — reading the file with
`readFileSync`, locating named functions/JSX regions via string
anchors, and asserting on their structure (e.g. confirming a given
`useState` call's generic type, confirming a handler is called inside a
given bounded section, confirming a `disabled` condition's exact
expression). This plan follows that exact established technique — it
does **not** introduce React Testing Library, jsdom, Playwright, or any
other DOM-rendering framework the repository does not already use,
per the instruction not to invent a testing framework that does not
exist here. Run via `npx tsx --test tests/<file>.test.ts`, matching
every existing test file's own documented "HOW TO RUN" convention.

A single new file,
`tests/periodic-contagem-keyboard-shortcuts.test.ts`, is proposed,
grouped exactly as follows (mapping directly onto the specification's
18 required tests, §14):

**Enter**
- Test 1 — quantity input's `onKeyDown` source calls
  `handleSaveCatalogRow`/`handleSaveManualRow`, and its own body calls
  `e.preventDefault()` before doing so (source-text assertion on the
  handler's literal body).
- Test 2 — search, manual-name, date, label, and free-text-unit inputs
  each have an `onKeyDown` whose body calls `e.preventDefault()` and
  does **not** reference `handleSaveCatalogRow`/`handleSaveManualRow`
  or `handleRequestConfirmation`.
- Test 3 — the `<select>`-rendered unit field's JSX block contains no
  `onKeyDown` prop at all (regression guard, confirming no handler was
  accidentally attached there).

**Ctrl/Cmd+Enter**
- Test 4 — the quantity input's `onKeyDown` body branches on
  `e.ctrlKey || e.metaKey` before invoking the advance path.
- Test 5 — the next-unvalidated-entry helper's source references
  `visibleUnifiedListEntries` and does **not** reference
  `unifiedListEntries` or `sortedUnifiedListEntries` directly.
- Test 6 — the advance `useEffect`'s condition includes a check against
  `validateWorkingRowForSave`'s failure path being unreachable from it
  (i.e., confirms the advance effect is keyed on `row.validated`
  transitioning, not on the Enter keypress itself — a structural,
  source-level check that the two are decoupled).
- Test 7 — confirms `wasValidatedBeforeRef`/`ctrlEnterRequestedRef` (or
  equivalently-named refs) exist and are read inside the advance
  `useEffect`'s condition — verifying the cancelled-`window.confirm`
  case cannot spuriously advance (structural presence/reference check;
  this repository's source-text convention cannot execute the actual
  `window.confirm` interaction, so this test verifies the mechanism's
  presence rather than its runtime outcome — see the note at the end of
  this section).
- Test 8 — the next-unvalidated-entry helper returns `null`/`undefined`
  when given an all-validated array (a plain unit test of the helper
  function in isolation, importable and directly callable — this one
  *can* run as ordinary logic, not source-text inspection, since the
  helper is pure).
- Test 9 — the helper's source references
  `periodicStockDraftItemsByKey` and the literal `'CONFLICT'` string
  inside its filtering logic, and a direct call to the helper with a
  fixture array containing one `CONFLICT`-state entry and one ordinary
  unvalidated entry returns the ordinary one, skipping the conflicted
  one.

**Search**
- Test 10 — the shared `keydown` handler's source contains a branch for
  `e.key === '/'` guarded by the same active-element/modal-state checks
  used for `N`/`?` (source-text structural check, plus a direct call to
  an extracted/exported version of the suppression-predicate function
  with fixture DOM-like inputs where feasible).

**Arrows**
- Test 12 (numbering follows the specification's own list) — the
  highlighted-index state's `useState` call is typed `number | null`;
  its update logic (extracted and tested as a pure function, e.g.
  `nextHighlightedIndex(current, direction, length)`) never returns a
  value `< 0` or `>= length`, confirming no wraparound, across a table
  of boundary fixtures.

**Esc**
- Tests 13–16 — the shared handler's Esc branch, extracted as its own
  pure decision function `resolveEscAction({ viewingCount,
  discardConfirmState, isWorkspaceActive })` returning one of
  `'close-modal' | 'cancel-discard' | 'leave-workspace' | 'noop'`, is
  unit-tested directly across all combinations, including the
  simultaneous-conditions case — this is both easier to test precisely
  and safer than asserting on the shape of an inline `if/else if` chain
  in the source text.

**N**
- Test 11 — the `N` branch's guard condition, read from source text,
  includes `isActiveContagemEditor`, `!isWorkspaceActive`, and
  `!subscriptionBlocksNewRecords`; a fixture-driven direct call (if the
  guard is also extracted as a pure predicate, recommended for
  testability) confirms all three must hold.

**?**
- Test 18 — opening and closing `showShortcutHelp` via a small
  extracted reducer/toggle function is confirmed not to reference
  `catalogRows`, `manualRows`, `pendingTally`, or `discardConfirmState`
  as write targets (source-text scan of the toggle function's body for
  any `set*` call other than `setShowShortcutHelp`).

**Viewer restrictions**
- Test 17 — every mutating shortcut's guard (Enter/Ctrl+Enter → Validar;
  N → add product) is confirmed, via source-text inspection, to include
  `isActiveContagemEditor` in its condition.

**Regression protections (beyond the specification's numbered 18)**
- Accidental finalization: a repository-wide grep-style assertion (as
  part of this same test file) that `handleRequestConfirmation` is
  referenced in exactly one place in `PeriodicStockCountView.tsx` — the
  form's own `onSubmit` prop — confirming no shortcut handler added by
  this feature newly references it.
- Existing conflict flow: `resolvePeriodicConflict` is referenced in
  exactly the same call sites that existed before this feature (a
  simple count-of-occurrences check against a recorded baseline),
  confirming no new call site was added.
- Finalization protection: `setPendingTally` is referenced in exactly
  the same call sites as before this feature.
- Immutability of Decisions 44–56 areas: `firestore.rules`,
  `apps/tenant/src/types.ts`, and `apps/tenant/src/context/AppContext.tsx`
  are unchanged (a file-hash or `git diff --stat` check against the
  commit this plan was drafted at, run as part of CI rather than as a
  `node:test` assertion — recorded here as a requirement, not a test-file
  assertion, since it is a repository-level check rather than a
  source-text one).
- Viewer behavior: none of the seven shortcuts' guard conditions,
  scanned in source text, omit the `isActiveContagemEditor` check where
  Area A/B/F require it.

**Honesty note on test 6/7's limits.** This repository's source-text
testing convention can verify that the *code* references the right
refs, functions, and conditions — it cannot execute a real
`window.confirm()` dialog or a real React re-render to observe the
`useEffect` actually firing at runtime, because there is no render
harness to do so. Tests 6 and 7 above are therefore structural
(confirming the mechanism exists and is wired correctly) rather than
behavioral (confirming it behaves correctly when actually run) — this
is the same limitation every existing test in this repository's
Periodic Contagem suite already accepts, not a new gap introduced by
this plan. If a stronger behavioral guarantee is wanted here, that would
require introducing a render harness — a decision outside this plan's
scope (see §16).

---

## 10. Browser/OS considerations

- **F1 rejected** — browser/OS reliability concern (F1 commonly opens
  native/OS help before the page's own JS ever sees the keypress).
  Recorded, not reconsidered.
- **F2 rejected** — same class of function-key reliability concern, and
  no distinct existing action for it to invoke beyond what the
  always-visible unified list already provides.
- **Ctrl/Cmd+F rejected** — collides with the browser's native
  "Find in page." Overriding it would degrade the operator's ability to
  use native find-in-page on this screen.
- **Ctrl/Cmd+S rejected** — collides with the browser's native
  "Save page," and is unnecessary regardless, since every row already
  autosaves via the existing per-row debounce with no manual trigger
  needed.
- **Enter form behavior** — see Area A; the pre-existing accidental-
  submit bug is neutralized field-by-field, not via a global
  `preventDefault()` on the form.
- **Esc behavior** — a standard, universally-supported key with no
  browser-reserved meaning in this context; no cross-browser caveat
  applies.
- **Desktop vs. mobile** — all seven shortcuts are `keydown`-driven; a
  touch-only mobile device simply never fires these events, so none of
  this feature's code paths execute there, and no existing mobile touch
  control is altered, hidden, or disabled by this plan.
- **Physical keyboard on tablets** — a tablet with an attached keyboard
  (e.g. a keyboard case) receives every shortcut for free, since the
  underlying mechanism is ordinary DOM `keydown` events with no
  device-class branching anywhere in this plan.

---

## 11. Accessibility

- **Visible focus** — every element these shortcuts move focus to
  already inherits this app's existing default Tailwind focus-ring
  styling; no new focus-visible CSS is introduced.
- **Keyboard-only operation** — every action reachable by a shortcut in
  this plan was already reachable by keyboard via Tab, in combination
  with each row's own pre-existing `tabIndex`/`onKeyDown` (line
  7806–7808) — this plan makes those actions faster, not reachable for
  the first time.
- **Screen readers** — no DOM structure or ordering changes; the one net
  -new piece of UI (the `?` help panel, Area G) is a proper
  `role="dialog" aria-modal="true"` element.
- **Help-panel semantics** — see Area G; matches, and slightly improves
  on, the existing historical-modal's overlay pattern.
- **Non-interference with native input behavior** — explicitly verified
  area-by-area: Area D's arrow-key scoping excludes the
  quantity/unit/price fields entirely (native number-spinner and
  `<select>` arrow behavior is preserved); Area A attaches no handler to
  `<select>` elements; the shared listener (Area H) never captures
  arrow keys at the document level.
- **Mobile/touch preservation** — see § Browser/OS above; no touch
  control is altered by this plan.

---

## 12. Files

**Exactly one file changes in implementation:**

- `apps/tenant/src/components/PeriodicStockCountView.tsx`

**Exactly one new test file is added:**

- `tests/periodic-contagem-keyboard-shortcuts.test.ts`

No other file in the repository — not `firestore.rules`, not
`apps/tenant/src/types.ts`, not `apps/tenant/src/context/AppContext.tsx`,
not `server/index.ts`, not `package.json`, not any governance artifact
under `docs/` — is touched by implementation. This is the smallest
possible file set capable of delivering the specification in full: every
shortcut's target state and handlers already live inside
`PeriodicStockCountView.tsx`, so no cross-file wiring is required.

---

## 13. Implementation sequence

Ordered to front-load the highest-risk item (the pre-existing accidental-
submit bug) and to build shared infrastructure (refs, the document
listener) before anything depends on it:

1. **Enter safety** (Area A) — fixes the real, currently-shipping bug
   first, independent of every other shortcut; lowest-risk to ship alone
   if the rest of this sequence were ever paused.
2. **Focus architecture** (§5 refs) — `searchInputRef`,
   `activeQuantityInputRef`, `activeNameInputRef`, `rowRefsMap`, created
   before anything needs to call `.focus()` on them.
3. **Search focus** (Area C, `/`) — simplest shared-listener consumer;
   validates the Area H listener pattern on the lowest-stakes shortcut
   before higher-stakes ones (N, Esc) are layered on.
4. **Shared keyboard listener and lifecycle** (Area H) — built out fully
   once `/` has proven the pattern; `N`, `?`, and Esc's branches are
   added to the same handler next.
5. **Esc** (Area E) — every branch it calls already exists and is
   already safe; sequenced before Ctrl/Cmd+Enter deliberately, so Esc's
   own tests can be written and passing independent of the more complex
   validation+advance logic.
6. **N / Add Product** (Area F) — depends on the shared listener (step
   4) and the focus architecture (step 2); no dependency on arrow
   navigation or Ctrl/Cmd+Enter.
7. **Arrow navigation** (Area D) — depends on `rowRefsMap` (step 2);
   independent of Ctrl/Cmd+Enter, so it can be built and tested before
   the most structurally involved piece.
8. **Ctrl/Cmd+Enter validation + advance** (Area B) — sequenced last
   among the interactive features deliberately, since it is the one
   area requiring the state-watch mechanism (§4/Area B) and the
   conflict-skip replication — the highest-complexity piece, built once
   every simpler piece it depends on (focus architecture, the
   next-unvalidated lookup's reuse of `visibleUnifiedListEntries`) is
   already in place and tested.
9. **Shortcut help** (Area G) — lowest-risk, purely additive, display-
   only; sequenced after every functional shortcut exists so its content
   (§ Area G) can accurately describe them.
10. **Tests** (§9) — written alongside each area above as it lands, not
    deferred to the end; this numbered step represents final test-suite
    completeness review once all nine areas are in place.
11. **Full regression verification** — run the complete existing test
    suite (`npx tsx --test tests/*.test.ts` or the repository's
    established equivalent invocation) to confirm zero pre-existing
    tests were broken, plus the manual accidental-finalization and
    Viewer-restriction spot-checks named in §9's regression section.

This order was chosen because each step's dependencies are satisfied by
an earlier step, and the single highest-real-world-risk item (Enter
currently able to trigger finalization) ships first rather than last.

---

## 14. Acceptance criteria

Implementation is complete and acceptable when **all** of the following
hold:

1. Enter in the active row's quantity input calls Validar and never
   submits the form.
2. Enter in every other named field (search, manual name, date, label,
   free-text unit) never submits the form and does nothing else.
3. Ctrl+Enter and Cmd+Enter both validate the active row and, only on
   genuine success, advance to the next unvalidated entry from
   `visibleUnifiedListEntries`.
4. The advance step never opens a `CONFLICT`-state entry directly; it
   either skips to the next non-conflicted unvalidated entry or, if none
   exists, defers to `scrollToConflictPanel()`.
5. No shortcut, under any combination of inputs, can set `pendingTally`
   or otherwise reach the finalization review screen — finalization
   remains reachable only via the existing submit button.
6. `/` focuses search; `N` opens a new manual product only when no
   workspace is active, the operator is an editor, and the subscription
   does not block new records; `?` opens/closes a display-only help
   panel with no state mutation beyond its own visibility.
7. ↑/↓ move a highlighted pointer over `visibleUnifiedListEntries`
   without wraparound, and never intercept arrow keys inside the active
   workspace's quantity/unit/price fields.
8. Esc's three-branch priority chain (modal → discard-confirm →
   workspace) behaves exactly as specified, and never invokes
   `handleDiscardDraft` or any other destructive action.
9. None of the seven shortcuts grants a Viewer (`isActiveContagemEditor
   === false`) any capability not already reachable by that Viewer via
   mouse.
10. No conflict-resolution semantics, transaction/write path, or
    persistence behavior differs in any way from before this feature —
    demonstrated in §7, not merely asserted.
11. No business logic, data model, or Firestore rule changes anywhere in
    the diff.
12. None of the five explicitly rejected shortcuts (F1, F2, Ctrl/Cmd+F,
    Ctrl/Cmd+S, global Ctrl/Cmd+Enter-to-finalize) is present anywhere
    in the implementation.
13. The diff touches exactly the two files named in §12 — no more, no
    fewer.
14. The full pre-existing test suite continues to pass unmodified,
    alongside the new test file from §9.

---

## 15. Governance impact

**Inspected, not assumed:** the existing
[`periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md`](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md)
is explicit about its own boundaries. Its §3 ("What This Authorization
Does NOT Cover") states it does not authorize "any change outside the
file-by-file scope in Implementation Plan §5" (a named, closed list that
does not include a keyboard-shortcuts feature), "any feature, mechanism,
or behavior not present in the accepted governing artifacts (Decisions
44–56, the Rule 8 Reassessment, the Technical Design, the Finding K
Mechanism Analysis, and the Implementation Plan)," and "unrelated module
work — nothing outside Periodic Contagem's shared live data, authority,
conflict, finalization, and cache-isolation mechanisms as scoped in §2."
A keyboard-interaction layer is none of those things — it is UI wiring
around already-authorized actions, not a live-data, authority, conflict,
finalization, or cache-isolation mechanism itself.

**Conclusion, following directly from that inspection:**

- **No new Product Architect Decision is required.** This feature
  invents no new business rule, changes no authority model, and alters
  no conflict/finalization/persistence semantics — every action it
  wires a key to is already an accepted, decided behavior.
- **No Rule 8 amendment is required.** Rule 8's existing assessments for
  Decisions 44–56 concern the mechanisms this plan explicitly does not
  touch (§7 above demonstrates this by area). This plan's own
  UI-only nature means a **separate, feature-scoped Rule 8 Assessment**
  is the correct next artifact — not an amendment to an existing one
  covering unrelated mechanisms.
- **No amendment to the existing Implementation Authorization is
  appropriate**, precisely because that authorization's own §3 already
  states it does not cover work outside its named scope — amending it to
  cover this feature would be exactly the "reinterpretation... into a
  broader redesign" this plan's own governing instruction prohibits.
- **A separate Implementation Plan and separate Implementation
  Authorization for this UI feature is the correct governance path** —
  which is precisely what is underway: this document **is** that
  separate Implementation Plan. A new, feature-scoped Rule 8 Assessment
  must follow this plan, and a new, feature-scoped Implementation
  Authorization must follow that assessment, before any code is written.

**This plan does not authorize implementation.** Per SABUSH BPT's
governance chain (BDR → Policy → Specification → Rule 8 Assessment →
Implementation Plan → signed Implementation Authorization), this
Implementation Plan is one step short of authorization. **A Rule 8
Assessment for this specific feature does not yet exist and must be
produced and accepted before an Implementation Authorization can be
drafted or signed.**

---

## 16. Explicit exclusions

This plan does **not** include, and implementation must not introduce:

- F1 as a shortcut, for any action.
- F2 as a shortcut, for any action.
- Ctrl/Cmd+F as a shortcut, for any action.
- Ctrl/Cmd+S as a shortcut, for any action.
- A global Ctrl/Cmd+Enter finalization shortcut, or any keyboard path
  reaching `pendingTally`/`handleRequestConfirmation` other than the
  existing submit button.
- Esc wired to the finalization review screen's own "Voltar"
  (`setPendingTally(null)`) — recorded in the specification (§7.2) and
  reaffirmed here (Area E) as a deliberate, explicit exclusion, not an
  oversight.
- Any new business logic, business rule, or Contagem authority change.
- Any new persistence behavior, new Firestore write path, or new field
  on any persisted type.
- Any new conflict-resolution logic, or any change to
  `resolvePeriodicConflict` or the CONFLICT-state detection mechanism.
- Any change to Decision 56 §7's own unresolved Clear-All-Data
  `delete`-path boundary — untouched, unreferenced, and not implicated
  by anything in this plan.
- Any claim toward, or test contributing to, Finding K's remaining
  browser/cross-tab verification requirement (§8 above).
- Any unrelated UI redesign of Periodic Contagem beyond the seven named
  shortcuts and the minimal focus/highlight affordances each one
  requires.
- Retrofitting `role="dialog"`/`aria-modal` onto the existing historical-
  count modal (noted as a gap in Area G, explicitly left alone here as
  out of this feature's scope).
- Introducing a DOM/React render-testing harness this repository does
  not currently have (§9's honesty note records this as a limitation,
  not a problem this plan attempts to solve).

---

### Implementation Gate

- **Is the plan complete?** Yes — all 16 requested sections are
  produced, grounded in direct inspection of the current source and the
  governing specification, with the one specification-level ambiguity
  (§4.2 of the specification; Area B above) explicitly resolved to
  Option (b) and justified rather than silently assumed.
- **Is any decision still required?** Yes, one governance-track item:
  a feature-scoped **Rule 8 Assessment** for this keyboard-shortcuts
  feature does not yet exist and must be produced next. No open
  design-level ambiguity remains within this plan itself — Option (b)
  in Area B is a recommendation this plan adopts and justifies, not an
  unresolved question carried forward.
- **Is a separate Implementation Authorization required?** Yes — per §15,
  the existing Decisions 44–56 Implementation Authorization does not
  and should not cover this feature; a new, feature-scoped
  Implementation Authorization is required, and it cannot be drafted
  before its own Rule 8 Assessment exists and is accepted.
- **May implementation begin yet?** **No.** This plan stops at the
  planning gate, as instructed. The next required step is a Rule 8
  Assessment for this feature, followed by a signed, feature-scoped
  Implementation Authorization — only after which may any code in
  `apps/tenant/src/components/PeriodicStockCountView.tsx` or
  `tests/periodic-contagem-keyboard-shortcuts.test.ts` actually be
  written.
