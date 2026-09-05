# Periodic Contagem — Keyboard Shortcut Implementation Specification

**Status:** SPECIFICATION ONLY — no code, tests, governance artifacts, Decisions
44–56, or the Implementation Authorization were modified to produce this
document.

**Scope of investigation:** This specification is grounded in direct reading
of the current `apps/tenant/src/components/PeriodicStockCountView.tsx`
(8,149 lines) as it exists on `main` today, plus the sort-mode logic added by
Decision 60. No separate "keyboard/focus feasibility investigation" document
exists anywhere in this repository's committed history or branches — none of
the terms "keyboard," "shortcut," or "feasibility" appear in `git log --all`
or in `docs/`. If such an investigation happened in a prior conversation, its
conclusions are not present here to reconcile against; everything below is
derived from the component's actual current structure and handlers.

---

## 0. Governing structural fact

The entire editable Periodic Contagem view — date/label header, the unified
product search+list, the single active-product workspace, and the
accumulated/validated area — lives inside one:

```
<form onSubmit={handleRequestConfirmation} className="space-y-2">
```

(line 6320), which does not close until line 7960. The **only**
`type="submit"` element inside that form is the "Rever e Confirmar Contagem"
button at the very bottom (line 7954). Every other button inside the form —
including "Validar" (line 7109/`handleSaveManualRow`'s manual-row
counterpart), "Adicionar produto," "Voltar (deixar sem alterações)," and
"Começar de Novo" — is explicitly `type="button"`.

This means: **today, pressing Enter inside any text/number `<input>` inside
this form — the quantity field, the product-search field, a manual product
name, the date field, the label field, a free-text unit field — submits the
form and invokes `handleRequestConfirmation`**, which builds a tally and sets
`pendingTally`, immediately switching the entire view to the finalization
review screen (§ below). This is real, currently-shipping behavior, not a
hypothetical risk. Any Enter-key specification must explicitly neutralize
this for every field except the one place Enter is being deliberately
repurposed.

`pendingTally !== null` is a **separate top-level return branch**
(`if (pendingTally) { return (...) }`, line 5571) — an entirely different
render tree with no `<form>`, no quantity input, no search input, and no
unified list. None of the shortcuts specified below apply there by
construction, except where explicitly noted in § Governance Boundary.

---

## 1. Final shortcut table

| Key | Scope | Existing action invoked | New code required |
|---|---|---|---|
| **Enter** | Quantity input of the active (open) row, unvalidated | `handleSaveCatalogRow(productId)` or `handleSaveManualRow(index)` | `onKeyDown` + `preventDefault()` on the quantity input; **`preventDefault()` on every other in-form input** to stop accidental submission |
| **Ctrl/Cmd+Enter** | Quantity input of the active row | Same Validar call, then `handleUnifiedEntryClick(nextUnvalidatedEntry)` | `onKeyDown` handler + a "find next unvalidated entry" lookup over `visibleUnifiedListEntries` |
| **/** | Anywhere in the workspace except while typing in another text/number input | Focus `productSearch` `<input>` | New `searchInputRef`; document-level `keydown` listener |
| **↑ / ↓** | `productSearch` input has focus, or an unified-list row has focus | `handleUnifiedEntryClick(entry)` on Enter/select; arrows only move a highlighted/focus pointer | New local "highlighted index" state over `visibleUnifiedListEntries`; reuse existing `role="button"` rows (line 7806) |
| **Esc** | Historical modal → discard-confirm banner → active workspace, in that priority order | `setViewingCount(null)` → `setDiscardConfirmState('idle')` → `handleLeaveWorkspaceUnchanged()` | Single document-level `keydown` listener with the priority chain below |
| **N** | Anywhere in the workspace when no product is active, not while typing | `handleAddNewProductToWorkspace()` | Same document-level listener as `/`, gated on `!isWorkspaceActive` |
| **?** | Anywhere in the workspace, not while typing | Open a new, non-persisted `showShortcutHelp` panel (no existing action — new, display-only) | New minimal state; no business logic |

Every row above is additive UI wiring around handlers that already exist.
None introduces a second implementation of Validar, navigation, search,
Voltar, or discard.

---

## 2. Exact focus/state rules

### 2.1 Global suppression conditions (apply to every shortcut below)

A shortcut listener MUST NOT act if any of the following is true at keydown
time:

- `!isActiveContagemEditor` (Viewer) — a Viewer has no Validar button, no
  Adicionar-produto button, and no Começar-de-Novo button rendered at all
  today; shortcuts must not grant a Viewer capability the UI never gives
  them via click.
- The keydown event's target is inside an `<input>`, `<textarea>`, or
  `<select>` that **is not** the one specific element the shortcut is
  scoped to (e.g. `/` must not fire while the operator is typing "não" into
  a product name — the `n` would otherwise also risk colliding with the
  `N` shortcut discussion below; the concrete suppression rule is: single
  bare letter/`/`/`?` shortcuts never fire while `document.activeElement`
  is a form field, full stop).
- A native `window.confirm()` dialog is open. `handleSaveCatalogRow` and
  `handleSaveManualRow` both call `window.confirm(...)` synchronously when
  `quantity === 0` (lines ~2251 and ~3179). This is a blocking native
  dialog: no JS on the page runs while it is open, so no listener can fire
  during it regardless. The specification's obligation here is narrower:
  **after** the operator answers that dialog, the calling shortcut handler
  must not assume Validar succeeded — see § Ctrl/Cmd+Enter, "current row
  cannot be validated."

### 2.2 Per-shortcut scope

- **Enter / Ctrl+Enter**: scoped to the single quantity `<input>` currently
  rendered inside the active workspace (`isWorkspaceActive === true`). Under
  the Single-Product Workspace rule, exactly one such input exists at a
  time — the catalog quantity input (line 6913) or the manual-row quantity
  input (line ~7416), never both. There is no ambiguity about "which row."
- **/ and N**: document-level, active whenever the Periodic Contagem view is
  mounted and not blocked by subscription (`subscriptionBlocksNewRecords`
  for N only — `/` has no subscription gate today, since search itself
  creates nothing).
- **↑ / ↓**: active once `productSearch` or any unified-list row (line
  7806, `role="button" tabIndex={0}`) holds focus. Arrow keys pressed while
  focus is inside the active workspace's own fields (quantity, unit, price)
  must NOT be captured — that would break native cursor/spinner behavior
  inside those inputs, which the investigation did not authorize touching.
- **Esc**: document-level, always active, priority-ordered (§ Esc below).
- **?**: document-level, same suppression as `/`/`N`.

---

## 3. Enter / form-submission handling

### 3.1 Principle

Enter's ONLY new behavior is: **while focused on the active row's quantity
input, and that row is not yet validated, Enter calls the existing Validar
handler and prevents the default form submission.** Every other field's
relationship to Enter is either preserved or explicitly neutralized —
nothing new is invented for them.

### 3.2 Field-by-field specification

| Field | Current Enter behavior | Specified Enter behavior |
|---|---|---|
| Quantity input (active row) | Submits form → `handleRequestConfirmation` → opens review screen | `preventDefault()`; call `handleSaveCatalogRow(productId)` / `handleSaveManualRow(index)`. If `row.quantity === 0`, the existing `window.confirm` still fires exactly as it does for a mouse click — no change to that flow. If the row fails `validateWorkingRowForSave` (e.g. invalid price already typed), the existing inline error state (`catalogRowSaveError`/`manualRowSaveError`) is set exactly as a click would; the row simply stays open, unvalidated. |
| Product search input | Submits form (bug) | `preventDefault()`; no-op. Search has no natural "primary action" for Enter to trigger (there's no single top result to select) — do not invent one. `stopPropagation()` not required; `preventDefault()` alone is sufficient since there is no other Enter listener above it. |
| Manual product-name input | Submits form (bug) | `preventDefault()`; no-op. |
| Date field (`type="date"`) | Submits form (bug) — note native date inputs already have unusual Enter semantics in some browsers | `preventDefault()`; no-op. |
| Label field (custom-type Contagem name) | Submits form (bug) | `preventDefault()`; no-op. |
| Unit field, when rendered as free-text `<input>` (line ~6957 path) | Submits form (bug) | `preventDefault()`; no-op. |
| Unit field, when rendered as `<select>` | Native `<select>` Enter behavior (commits the highlighted option, does not submit in most browsers) | Unchanged — native `<select>` Enter handling is left alone; do not attach a competing handler. |
| Cost/selling price inputs, other numeric fields on the active row | Submits form (bug) | `preventDefault()`; no-op. (Explicitly NOT wired to Validar — the specification's Enter target is the quantity field only, matching the "Search → select → quantity → validate" loop; wiring every field to Validar would let a stray Enter in the price field validate a row the operator hasn't finished editing.) |
| Finalization-review state (`pendingTally !== null`) | N/A — different render tree, no `<form>`/inputs from this list exist there | No handling needed or added; structurally out of reach. |
| Historical-count modal (`viewingCount !== null`) | N/A — read-only modal, no editable inputs | No Enter handling added. |
| Viewer mode | Same fields render, but every mutating button (`Validar`, `Adicionar`, `Começar de Novo`) is already absent from the DOM | Enter in the quantity input (if a Viewer could even reach an editable quantity field, which they cannot — Viewer fields are not rendered as active-workspace editable inputs at all) does nothing; `preventDefault()` is still applied defensively to block the pre-existing submit bug. |

### 3.3 Implementation shape

Do not add a global `preventDefault()` at the `<form onSubmit>` level (that
would also block the legitimate final submit button, which triggers the
same `onSubmit` handler). Instead, attach `onKeyDown` to each individual
input inside the form, checking `e.key === 'Enter'` and calling
`e.preventDefault()` before deciding whether to also invoke Validar. This
matches the existing pattern already used for the unified-list row
activation (`onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' ...))
handleEntryActivation(); }}`, line 7808) — the same per-element `onKeyDown`
idiom, not a new global mechanism.

The quantity input's own `onKeyDown` must also apply the plain-Enter
suppression rule from §2.1: it should only invoke Validar when `!e.shiftKey
&& !e.ctrlKey && !e.metaKey` — Ctrl/Cmd+Enter is a different action (§4) and
must not double-fire both handlers from a single keypress.

---

## 4. Ctrl/Cmd+Enter

### 4.1 Behavior

While focused on the active row's quantity input:
1. Run the exact same Validar call as plain Enter (§3.2).
2. If, and only if, Validar actually succeeded (see 4.2, "cannot be
   validated"), find the next unvalidated entry in
   `visibleUnifiedListEntries` and call the existing
   `handleUnifiedEntryClick(nextEntry)` on it — the same function every
   ordinary row click and the "Continuar de onde ficou" hint already use.
   This opens that product into the workspace exactly as a click would;
   no second activation mechanism is created.
3. After `handleUnifiedEntryClick` runs, programmatically focus that
   product's own quantity input (a new, small addition — the input needs a
   ref or a stable id so the handler can call `.focus()` on it once React
   has re-rendered the workspace for the new active product; use a
   `useEffect` keyed on `activeWorkspaceProductKey` that focuses the
   quantity input whenever it changes, rather than trying to focus
   synchronously inside the click handler before the DOM updates).

### 4.2 Edge cases

- **Row fails validation** (`validateWorkingRowForSave` returns a message):
  Validar does not run; `catalogRowSaveError`/`manualRowSaveError` is set
  exactly as today. Do not advance. The operator sees the same inline error
  they would from a mouse click on Validar.
- **`window.confirm` for quantity 0**: the confirm dialog blocks the
  keydown handler's own execution is already finished by the time the
  dialog opens (the call is synchronous inside `handleSaveCatalogRow`/
  `handleSaveManualRow`). If the operator clicks Cancel on that dialog, the
  function returns early *before* `updateCatalogRow(..., { validated: true
  })` runs — so from the shortcut handler's point of view, "did validation
  actually happen" cannot be read synchronously off a return value, because
  neither `handleSaveCatalogRow` nor `handleSaveManualRow` currently
  returns anything. **This is the one place the specification cannot avoid
  touching the shared handler's signature**: either (a) both handlers are
  changed to return `boolean` (true = validated, false = blocked/cancelled)
  so the keyboard path can decide whether to advance, or (b) the
  advance-to-next step is instead driven by watching `row.validated`
  transition to `true` via a `useEffect`, with no signature change. Option
  (b) requires no change to `handleSaveCatalogRow`/`handleSaveManualRow`
  themselves and is the one that best matches "do not create a second
  implementation of existing business logic" — it observes the existing
  state change rather than needing the handler to report it. **Recommended:
  Option (b).**
- **No next unvalidated product** (every remaining entry is already
  validated, or the list is empty): do nothing further after Validar
  succeeds. Do not open the review screen automatically — finalization is
  never triggered implicitly by this shortcut (see § Governance Boundary).
  Leave focus wherever it naturally lands (the just-validated row has now
  left the active workspace; per §9/Single-Active-Product Rule the
  workspace returns to its "no product active" state, so focus should move
  to the `productSearch` input as the natural next place to type — this
  mirrors what an operator would otherwise click next).
- **A save is pending** (`draftSaveState === 'saving'` or `'retrying'` for
  this row): Validar itself does not check `draftSaveState` today — a
  mouse click on Validar works regardless of autosave status, since Validar
  writes `validated: true` via the same `updateCatalogRow`/`updateManualRow`
  path as any other field edit, which schedules its own debounce
  independently. No new gating is needed; the keyboard path should behave
  identically to the mouse click and not add a precondition the click
  button doesn't have.
- **A conflict exists on this row** (`periodicStockDraftItemsByKey[key]
  ?.state === 'CONFLICT'`): the existing row-click handler
  (`handleEntryActivation`, line 7794) already special-cases this — it
  calls `scrollToConflictPanel()` instead of opening the row. But that
  check applies to *entering* a row from the list, not to Validar-ing a
  row *already open* in the workspace. Whether an already-open conflicted
  row can even reach Validar today is unchanged by this specification —
  Ctrl+Enter must not add a check that plain Validar doesn't already have.
  If the next-unvalidated-entry lookup encounters a conflicted entry,
  `handleUnifiedEntryClick` is still the function invoked; its own existing
  conflict handling (if any — none was found inside
  `handleUnifiedEntryClick` itself, only inside the list's separate
  `handleEntryActivation` wrapper at the render site) applies unchanged. **Flag: `handleUnifiedEntryClick` itself does not perform the
  `isRowConflicted` check that the render-site wrapper does — if the
  keyboard "advance to next" path calls `handleUnifiedEntryClick` directly
  rather than going through `handleEntryActivation`, a conflicted row could
  be opened by keyboard where a click would have redirected to the
  conflict panel instead. The advance-to-next lookup MUST replicate the
  same conflict check the render-site wrapper does (skip conflicted
  entries, or route to `scrollToConflictPanel()` if the only remaining
  unvalidated entries are conflicted) rather than calling
  `handleUnifiedEntryClick` on a conflicted entry.**
- **The Contagem is offline**: there is no `navigator.onLine` check or
  dedicated "offline" state anywhere in this component today —
  connectivity loss surfaces only indirectly, through `draftSaveState`
  reaching `'save-failed'` or `'save-unknown'` after a write attempt times
  out. There is nothing offline-specific for this shortcut to check that
  the existing UI doesn't already surface generically. No new behavior is
  specified for this case beyond what already happens to a mouse-clicked
  Validar.
- **The user is a Viewer**: excluded entirely by the global suppression
  rule (§2.1) — the quantity input a Viewer sees, if any, is not the
  active-workspace editable one this shortcut is scoped to.
- **The product list is filtered/searched**: the "next unvalidated entry"
  lookup must search `visibleUnifiedListEntries` (the already
  filtered-by-`productSearch`, sorted-by-`validatedSortMode`,
  active-product-excluded list) — never the unfiltered
  `unifiedListEntries`. This means advancing respects whatever the operator
  currently has typed into search, which is the intended behavior: if
  they've filtered down to "sumo," Ctrl+Enter should advance them through
  the "sumo" products, not jump to an unrelated one outside the filter.
- **The next product is outside the visible viewport**: after
  `handleUnifiedEntryClick` activates it, scroll the newly active
  workspace into view with `scrollIntoView({ behavior: 'smooth', block:
  'center' })` on the workspace container — the workspace itself, not the
  list row, since the list row disappears from the list once its product
  becomes the active one (per the Single-Active-Product Rule's existing
  `visibleUnifiedListEntries` filter).

---

## 5. Product navigation (↑ / ↓)

- **Focus requirement**: arrows are only captured while
  `document.activeElement` is the `productSearch` input, or one of the
  unified-list row `role="button"` elements (line 7806) already has focus.
  Arrows pressed while focus is inside the active workspace's own fields
  (quantity/unit/price) are never captured, to avoid breaking native
  number-input spinner behavior or `<select>` navigation.
- **Ordering source**: reuse `visibleUnifiedListEntries` exactly as
  rendered — the same array already sorted by `validatedSortMode` via
  `sortByValidatedMode` and filtered by `productSearch`. No second ordering
  system is introduced; the specification adds a "currently highlighted
  index" pointer over this same array, nothing more.
- **How the next/previous entry is determined**: increment/decrement the
  highlighted index within `visibleUnifiedListEntries`, clamped — see
  first/last behavior below.
- **Sort-mode respect**: automatic, since the array iterated is the
  already-sorted one; no shortcut-specific sort logic is needed for any of
  the seven existing modes (`name-asc`, `name-desc`, `value-desc`,
  `value-asc`, `entry-order`, `time-desc`, `time-asc`).
- **First/last product behavior**: pressing ↓ at the last entry, or ↑ at
  the first, is a no-op (does not wrap around). Wrapping was not requested
  and silently wrapping risks disorienting an operator mid-count who
  doesn't notice the jump back to the top.
- **Validated products**: NOT skipped. `visibleUnifiedListEntries` already
  contains both validated and unvalidated entries (the unified list was
  built specifically to merge what used to be two separate lists — see the
  "Single click handler for the unified list" comment, line ~4245) and
  arrow navigation should let the operator browse the whole list, including
  jumping back to review/edit an already-validated row. Skipping validated
  entries is a plausible-sounding "helpful" behavior that this
  specification deliberately does not add, since it would make arrow
  navigation behave differently from what the operator sees on screen.
- **Interaction with `handleUnifiedEntryClick`**: arrows only move the
  highlighted pointer; they never themselves open a product. Opening
  happens on Enter (while a row has focus) or click, both routed through
  the exact same `handleUnifiedEntryClick`/`handleEntryActivation` pair
  already wired to each row (line 7793–7808) — no new activation function.
- **Focus after selection**: once a row is activated (Enter or click) and
  the workspace re-renders for that product, focus moves to that row's
  quantity input — the same `useEffect`-driven focus described in §4.1
  step 3, reused for this path too, not a second implementation.

---

## 6. Search shortcut (`/`)

- `/` focuses `productSearch` via a new `searchInputRef` (the input
  currently has neither a ref nor an id — one must be added; this is the
  only structural change to the search `<input>` itself).
- No scrolling of the product list is needed before focusing — the search
  input sits above the list in normal document flow (line 7695), so
  focusing it is sufficient; the browser's own focus-scroll behavior
  handles bringing it into view if the page has scrolled past it.
- If `productSearch` already has focus, `/` is suppressed by the global
  rule (§2.1) — the browser will simply type a literal "/" character into
  the field, which is correct (a `/` can legitimately appear while
  refining a search term, though no current product names in the seed
  data appear to use one).
- Suppressed while `viewingCount !== null` (historical modal open) or while
  `discardConfirmState === 'confirming'` — neither should let a background
  shortcut silently shift focus out from under an open modal/confirmation.
- Suppressed for Viewers only in the sense that Viewers already have no
  meaningful use for search-then-Validar, but search itself is read-only
  and harmless — **no suppression needed for Viewers specifically**; `/`
  may focus search for a Viewer exactly as it would for an editor, since
  searching is not a mutating action.
- Ignored inside any other text/number input, per §2.1.

---

## 7. Esc behavior

### 7.1 Priority order (verified against actual state, not assumed)

1. **`viewingCount !== null`** (historical-count modal open) → `setViewingCount(null)`. This exactly matches the modal's own existing backdrop-click handler (`onClick={() => setViewingCount(null)}`, line 8049) — Esc simply gives keyboard-only operators the same exit the mouse already has.
2. **`discardConfirmState === 'confirming'`** (the inline "Descartar esta contagem por terminar?" banner, line 6414–6440) → `setDiscardConfirmState('idle')`. This exactly matches clicking its own "Cancelar" button — never `handleDiscardDraft` itself. Esc must never be wired to the destructive action.
3. **`isWorkspaceActive`** (a product is open in the active workspace) → `handleLeaveWorkspaceUnchanged()` — the same function the "Voltar (deixar sem alterações)" button (line 6631) calls. This never touches field values, exactly as that button doesn't.
4. **Otherwise** → no-op.

This ordering was independently re-derived from the component's actual
state variables and existing UI actions (`viewingCount`,
`discardConfirmState`, `isWorkspaceActive`) rather than assumed from the
prompt's example — it happens to match the example exactly, which is a
useful confirmation rather than a shortcut taken.

### 7.2 Explicit exclusion

The finalization review screen (`pendingTally !== null`) already has its
own "Voltar" button (`onClick={() => setPendingTally(null)}`, line 5741).
Wiring Esc to that as a fifth priority step would be a natural-seeming
extension, but it is **explicitly out of scope** for this specification —
the source investigation was scoped to the counting loop, not the review
screen, and adding it here would be scope creep beyond what was asked.
Flagged in § Governance Boundary as a candidate for a future, separate
decision if desired.

### 7.3 Non-destructive guarantee

Every action Esc can trigger above is already reachable via an existing,
non-destructive button in the current UI (a "cancel"/"close"/"back"
control, never a "confirm"/"discard"/"delete" one). Esc therefore inherits
that same non-destructive guarantee by construction — it never needs its
own separate safety review because it never invokes anything the UI
doesn't already expose as a safe action.

---

## 8. Add Product (`N`)

### 8.1 Preconditions, all of which must hold

- `!isWorkspaceActive` — the "Adicionar produto que não está no catálogo"
  button (line 6605) is only rendered at all when no product is currently
  open, per the Single-Product Workspace rule; `N` must not be reachable
  while a product is active, matching what's on screen.
- `!subscriptionBlocksNewRecords` — `handleAddNewProductToWorkspace` itself
  does not currently guard on this directly, but `handleAddManualRow` (the
  function it wraps) is invoked elsewhere behind this same gate (line
  4613); the button's own `disabled`/hidden state governs this in practice
  today. The keyboard path must match whatever the button's actual
  reachability is — if the button is visible and enabled, `N` acts; if the
  button is hidden or disabled under a subscription block, `N` is a no-op.
- `isActiveContagemEditor` (not a Viewer) — the button is not rendered for
  Viewers.
- `document.activeElement` is not a text/number input, per §2.1 — `N` is a
  letter that will legitimately appear inside product names ("Não," "Nata,"
  etc.) and inside search terms, so it must never fire while typing.
- No modal/overlay has priority: suppressed while `viewingCount !== null`
  or `discardConfirmState === 'confirming'`, same as `/`.

### 8.2 Action

Calls the existing `handleAddNewProductToWorkspace()` unchanged — creates a
new blank manual row and activates the workspace on it, exactly as a click
does. After activation, focus should move to the new row's product-name
field (the first field an operator needs for a genuinely new product),
via the same `activeWorkspaceProductKey`-keyed focus `useEffect` pattern
described in §4.1, adapted to target the name field instead of quantity for
this one entry path (a brand-new manual row has no name yet, so quantity
isn't the useful first field the way it is for an existing catalog
product).

### 8.3 F1 explicitly not used

Per the investigation's own explicit rejection list, `F1` is not used for
this action — no browser/OS reliability re-assessment was requested or
performed as part of this specification, so the existing rejection stands
unchanged.

---

## 9. Shortcut help (`?`)

A lightweight, non-persisted panel — new UI, no existing handler to reuse
because none exists for this today. Scope for THIS specification is
deliberately minimal, per "do not build it yet":

- **Trigger**: `?` (document-level, same suppression rules as `/`/`N`).
- **Content it should display** (when eventually built): the seven rows
  from § Final shortcut table, in the same order, using the same
  plain-language descriptions already used in this document — not a
  reproduction of internal handler names.
- **Closing**: `Esc` (added as a fifth priority step ahead of the three in
  §7.1 when the panel is open — a help panel is the most transient,
  least-consequential piece of UI in the whole shortcut set, so it should
  yield to Esc before anything else does), or a click outside the panel,
  matching the historical modal's own backdrop-click convention (line
  8049) for visual/behavioral consistency across the app's two overlay
  patterns.
- Not built as part of this specification — this section only fixes its
  future shape so the shortcut table above has something concrete for `?`
  to point at.

---

## 10. Accessibility

- **Focus visibility**: every element these shortcuts move focus to
  (quantity input, search input, a unified-list row, a new manual row's
  name field) already has a visible focus style from the app's existing
  Tailwind focus classes used elsewhere in this file — no new focus-ring
  styling is introduced; the specification relies entirely on the
  existing design system's default focus treatment.
- **Keyboard-only operation**: every one of the seven shortcuts operates
  on state and handlers already reachable by keyboard via Tab+Enter/Space
  today (the unified-list rows already have `tabIndex={0}` and their own
  `onKeyDown` for Enter/Space, line 7806–7808). This specification makes
  the same actions reachable faster, not reachable for the first time —
  no new keyboard-only dead end is created.
- **Screen-reader implications**: none of the seven shortcuts change what
  is rendered or its DOM order — they only change what receives focus and
  when. A screen-reader user tabbing through the form encounters the exact
  same content either way. The one net-new consideration is the `?` help
  panel (§9), which should be a proper dialog with `role="dialog"` and
  `aria-modal="true"` when it is eventually built, matching the historical
  modal's own implicit pattern.
- **Shortcut hints visibility**: not shown inline on every field (would
  clutter a UI already using compact mobile-first spacing throughout this
  file); the `?` panel is the intended discovery mechanism, per §9.
- **Mobile behavior**: Periodic Contagem's existing UI is built mobile-first
  throughout this file (e.g. `sm:hidden`/`sm:grid` label patterns
  throughout the quantity/unit fields). None of these seven shortcuts
  depend on a physical keyboard being absent to function — they simply do
  nothing on a touch device with no hardware keyboard, since no keydown
  events fire. No shortcut here disables, hides, or alters any existing
  touch control.
- **Mobile should continue using existing touch controls**: yes,
  unconditionally — this specification adds zero new mobile-specific
  behavior and removes none of the existing tap targets (Validar button,
  row tap-to-open, search field tap-to-focus all continue working
  identically). A device with an attached hardware keyboard (e.g. a tablet
  with a keyboard case) gets the shortcuts for free with no extra work,
  since the underlying handlers are identical `keydown` listeners
  regardless of device class.

---

## 11. Fast counting workflow

The target loop — `Search → select → quantity → validate → next product →
quantity → validate → repeat` — maps onto the specified shortcuts as:

```
/  → type search term
↓  → highlight the wanted product
Enter (on the row) → open it (handleUnifiedEntryClick)
[type quantity]
Ctrl/Cmd+Enter → Validar + advance to next unvalidated product
[type quantity]
Ctrl/Cmd+Enter → Validar + advance...
```

This is achievable with the current architecture using only additive UI
work: a handful of `onKeyDown` attachments, one new ref for the search
input, one small "highlighted index" state for arrow navigation, one
`useEffect` to move focus into a newly-activated workspace, and the
next-unvalidated-entry lookup over the already-existing
`visibleUnifiedListEntries`. No change to `catalogRows`/`manualRows` shape,
no change to any Firestore write path, no change to `tallyStockCountRows`,
`resolvePeriodicConflict`, or any of Decisions 44–56's own logic is
required anywhere in this loop.

---

## 12. Rejected shortcuts (recorded so they are not reintroduced accidentally)

| Rejected shortcut | Reason for rejection |
|---|---|
| **F1 → Adicionar produto** | Browser/OS reliability concern (F1 frequently opens native/OS help in various browsers and operating systems, hijacking the keypress before the page ever sees it); replaced with `N`, which has no such conflict once scoped away from text inputs. |
| **F2 → Ver lista de produtos** | Same class of reliability concern as F1 for function keys generally, plus there is no dedicated "ver lista de produtos" action distinct from what the always-visible unified list already provides — no existing handler for this shortcut to invoke. |
| **Ctrl/Cmd+F → product search** | Collides with the browser's own native "Find in page" shortcut, which the browser intercepts before the page's JS can; overriding a browser-reserved combination degrades the user's ability to use native find-in-page on this screen. `/` was chosen specifically because it has no browser-reserved meaning in a text context. |
| **Ctrl/Cmd+S → force save** | Collides with the browser's native "Save page" shortcut for the same reason as Ctrl/Cmd+F. It is also unnecessary: every row already autosaves via the existing per-row debounce (`scheduleRowDraftSave`) with no manual trigger needed, so there is no missing "save" action for a shortcut to expose. |
| **Global Ctrl/Cmd+Enter → finalization** | Explicitly rejected to avoid any keyboard path that can trigger `handleRequestConfirmation`/open the review screen without the operator's deliberate click on "Rever e Confirmar Contagem." Ctrl/Cmd+Enter in this specification is scoped strictly to the quantity input and strictly to Validar+advance — it must never bubble up to a form-level finalization shortcut. This mirrors the specification's own explicit instruction: "Do not make finalization automatic." |

---

## 13. Implementation boundaries

This specification authorizes, when implemented:

- New `onKeyDown` handlers attached to existing `<input>` elements
  (quantity, search, product name, date, label, unit-as-text) inside
  `PeriodicStockCountView.tsx`.
- One new `ref` (or `id`) on the `productSearch` input for programmatic
  `.focus()`.
- One new small piece of local state for the arrow-navigation highlighted
  index, scoped to this component.
- One new `useEffect` that focuses the active workspace's quantity (or,
  for a brand-new manual row, name) input when `activeWorkspaceProductKey`
  changes.
- One new, minimal `showShortcutHelp` boolean state and a display-only
  panel for `?` (content only, per §9 — not built as part of this pass if
  the Product Architect prefers to defer it to implementation time).
- A "find next unvalidated entry in `visibleUnifiedListEntries`, skipping
  conflicted rows" helper function — pure, reads existing state, writes
  nothing.
- A document-level `keydown` listener (one, shared across `/`, `N`, `?`,
  and Esc's global cases) added via `useEffect` with cleanup on unmount.

This specification does NOT authorize, and implementation must not
introduce:

- Any change to `handleRequestConfirmation`, `handleConfirmSave`,
  `resolvePeriodicConflict`, `tallyStockCountRows`, or any Firestore write
  path.
- Any change to Decisions 44–56, Rule 8, or the existing Implementation
  Authorization for Periodic Contagem.
- A second product-ordering, sort, or filtering system distinct from
  `visibleUnifiedListEntries`/`sortByValidatedMode`.
- A second implementation of Validar, distinct from
  `handleSaveCatalogRow`/`handleSaveManualRow`.
- A global `preventDefault()` on the form's `onSubmit` or on the `<form>`
  element itself.
- Any keyboard path that can reach finalization (`pendingTally` being set)
  other than the operator's own deliberate click/Enter on the actual
  "Rever e Confirmar Contagem" submit button, which is unaffected by this
  specification.
- Any new capability for a Viewer that a Viewer cannot already reach by
  mouse.
- Any change to `firestore.rules` or conflict semantics.

The one point requiring a small, explicit decision before implementation is
flagged in §4.2 and repeated in §14 below (advance-after-Validar detection
strategy) — everything else in this document is ready to implement as
written.

---

## 14. Tests that implementation must provide

1. Enter in the active row's quantity input calls the correct Validar
   handler (`handleSaveCatalogRow` for a catalog row, `handleSaveManualRow`
   for a manual row) and does **not** trigger `handleRequestConfirmation`
   / set `pendingTally`.
2. Enter in the product-search input, manual-product-name input, date
   input, label input, and a free-text unit input each individually do
   **not** trigger `handleRequestConfirmation` / set `pendingTally`.
3. Enter inside a `<select>`-rendered unit field is unaffected by any new
   handler (regression guard — confirms no competing listener was
   attached to `<select>` elements).
4. Ctrl+Enter and Cmd+Enter in the quantity input both call Validar (cross-
   platform parity).
5. Ctrl+Enter after a successful Validar activates the next unvalidated
   entry from `visibleUnifiedListEntries` (not `unifiedListEntries` —
   confirms the search-filter-respecting requirement from §4.2).
6. Ctrl+Enter when the row fails `validateWorkingRowForSave` does not
   advance and leaves the existing inline error state exactly as a failed
   mouse-click Validar would.
7. Ctrl+Enter on a quantity-zero row that the operator cancels via
   `window.confirm` does not advance (confirms the Option-(b) `validated`
   state-watch approach from §4.2 correctly distinguishes "confirmed" from
   "cancelled").
8. Ctrl+Enter when no unvalidated entries remain is a no-op beyond the
   Validar itself — does not open the review screen, does not throw.
9. Ctrl+Enter's next-unvalidated lookup skips a `CONFLICT`-state entry
   rather than opening it directly via `handleUnifiedEntryClick` (confirms
   the §4.2 flagged gap is actually closed in the implementation, not just
   noted here).
10. `/` focuses the search input from anywhere in the workspace except
    while another text input already has focus, and except while
    `viewingCount` or `discardConfirmState === 'confirming'` is active.
11. `N` opens a new manual row via `handleAddNewProductToWorkspace` only
    when `!isWorkspaceActive`, is a no-op while a workspace is active, and
    is a no-op while typing in any text field (including one containing
    the letter "n").
12. ↑/↓ move a highlighted index over `visibleUnifiedListEntries` without
    wrapping past the first/last entry, and without capturing arrow keys
    while focus is inside the active workspace's own quantity/unit/price
    fields.
13. Esc closes the historical modal when `viewingCount !== null`, in
    preference over the other two Esc cases, when more than one condition
    is somehow simultaneously true.
14. Esc resets `discardConfirmState` to `'idle'` (never calls
    `handleDiscardDraft`) when the discard-confirm banner is showing and
    no modal is open.
15. Esc calls `handleLeaveWorkspaceUnchanged` when a workspace is active
    and neither of the above two conditions holds, and confirms no field
    values are altered by it (matching the existing button's own
    guarantee).
16. Esc is a no-op when none of the three conditions hold.
17. None of the seven shortcuts fire for a Viewer (`isActiveContagemEditor
    === false`) in any state.
18. `?` opens and closes the help panel without altering any Contagem
    state (`catalogRows`, `manualRows`, `pendingTally`, `discardConfirmState`
    all unchanged before/after).

---

## 15. Governance impact

- **No amendment to Decisions 44–56 is required.** Every action this
  specification wires a shortcut to is an existing, already-authorized
  action; nothing here changes Contagem authority, conflict semantics,
  persistence semantics, or finalization authority.
- **One implementation-level decision is needed before coding starts**,
  not a governance one: §4.2's choice between (a) changing
  `handleSaveCatalogRow`/`handleSaveManualRow` to return a boolean, or (b)
  watching `row.validated` transition via `useEffect`. This specification
  recommends (b) as requiring zero changes to existing, already-authorized
  handler signatures — flagged explicitly rather than resolved unilaterally
  here, per the instruction to surface rather than decide governance-
  adjacent structural choices.
- **One scope boundary is flagged, not resolved**: Esc-to-Voltar on the
  finalization review screen (`pendingTally !== null`) is a natural
  extension of §7 but was outside what this specification was asked to
  cover (the source request scoped Esc's priority chain to the modal →
  discard-confirm → active-workspace triad only). If wanted, it should be
  its own small follow-up decision, not folded into this one.
- **No Firestore rules, conflict resolution, sort-mode, or persistence
  logic is touched**, so no Rule 8 Assessment is required for this
  specification's implementation — it is UI-interaction wiring exclusively,
  around handlers whose own Rule 8 Assessments already exist and are
  unaffected.

---

*End of specification. No code, tests, or governance artifacts were
modified in producing this document, and none should be until this
specification receives its own Implementation Plan and signed
Implementation Authorization, per standard practice.*
