Specification — NOT A DECISION, NOT RULE 8, NOT AN IMPLEMENTATION AUTHORIZATION

# Periodic Contagem Keyboard Shortcuts — Implementation Specification

**Status: SPECIFICATION ONLY. Not implemented. Not authorized for implementation.** This document does not modify, reopen, or reinterpret Decisions 44–56, any Rule 8 Assessment, or any Implementation Authorization. It records a UI interaction specification, produced from a prior feasibility investigation (same repository state, `main @ 3ff931c`), for a future, separately-gated Implementation Plan/Authorization to build against, should the Product Architect choose to proceed. No code, test, or `firestore.rules` change is included here or was made to produce this document.

**Governing basis:** the prior feasibility investigation into keyboard shortcuts for `PeriodicStockCountView` (conversational record, not a committed artifact) — this specification restates its load-bearing conclusions where necessary but does not re-derive its evidence.

---

## 1. Keyboard Shortcut Specification

### 1.1 — `Enter` (quantity field only) → Validar

**Trigger:** `keydown`, `key === 'Enter'`, no modifier keys held.
**Scope:** The quantity `<input>` of the currently open, active workspace row (catalog or manual).
**Preconditions:** A workspace is active (`isWorkspaceActive`); the row is not already validated (its quantity input is not `disabled`, so this is structurally guaranteed — a disabled input cannot receive `keydown`); `document.activeElement` is exactly this quantity input.
**Suppression rules:** Never fires from any other field (search, product name, unit, date, label). Never fires while `viewingCount` is open (no inputs live there today, but the handler must not be globally attached). Never fires while a native `window.confirm()` dialog is on-screen — automatic, since browsers block all page JS, including `keydown`, until the dialog resolves.
**Existing action invoked:** `handleSaveCatalogRow(productId)` / `handleSaveManualRow(index)` — unmodified. Both already contain the existing quantity-0 `window.confirm()` guard and the existing `validateWorkingRowForSave` validation-message path; Enter must reach these exactly as a click on the existing Validar button does, with no bypass and no duplicate validation logic.
**Event handling:** `e.preventDefault()` on this specific input's own `onKeyDown`, required (see §4). `stopPropagation()` not required. No focus movement as part of this shortcut alone.

### 1.2 — `Ctrl+Enter` / `Cmd+Enter` (quantity field only) → Validar, then advance

**Trigger:** `keydown`, `key === 'Enter'`, `(e.ctrlKey || e.metaKey) === true`.
**Scope:** Identical to §1.1.
**Preconditions:** Identical to §1.1, plus: validation must actually succeed before any advance is attempted.
**Existing action invoked:** `handleSaveCatalogRow`/`handleSaveManualRow` (the exact same call as plain Enter), immediately followed — only if that call did not return early — by the new "advance to next unvalidated" navigation described in §5.
**Determining success without a new return value:** `handleSaveCatalogRow`/`handleSaveManualRow` are currently `void`-returning and exit early on a validation-message failure or a declined quantity-0 confirmation. This specification requires one minimal, additive change to each function's own signature: return a `boolean` (`true` on reaching the point where the row is actually committed as validated, `false` on any early `return`), with every existing early-return statement changed to `return false;` and a final `return true;` added at the natural end. This is the one narrow, explicit exception to "never duplicate business logic" — it is the minimum signal needed for the caller to know whether to advance; every line of existing validation/confirmation logic inside the function is otherwise untouched.

**Edge cases:**
- **No next unvalidated product exists:** advance is a no-op — no error, no dialog. Focus recommendation: return to the search input (implementation choice, not a governance question).
- **Validation fails / quantity-0 confirm declined:** no advance — identical to a failed click on Validar.
- **A save is already pending on this row:** irrelevant — `handleSaveCatalogRow` sets `validated: true` synchronously and reuses the row's own existing debounce save; there is no separate "pending" state to wait for.
- **A conflict exists on this row:** cannot occur — a `CONFLICT`-state row is redirected to the conflict panel (Decision 59 fix) and is never opened as an ordinary workspace, so this shortcut is unreachable from it by construction.
- **Offline:** no special handling — this component has no existing offline-detection state at all; the app's existing Firestore offline-persistence layer already queues the write exactly as it does for a click-triggered Validar.
- **Viewer:** cannot occur — the quantity input is never rendered enabled/reachable for a Viewer.
- **List is filtered/searched:** the "next unvalidated" computation operates on `visibleUnifiedListEntries`, which is already search-filtered.
- **Next product outside the viewport:** the navigation function must call `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`, reusing the same pattern already established for `scrollToConflictPanel` (Decision 59) — not reinvented.

### 1.3 — `/` → Focus product search

**Trigger:** `keydown`, `key === '/'`, no modifier keys.
**Scope:** `document`-level.
**Preconditions:** `document.activeElement` is not an `<input>`, `<textarea>`, or `<select>`.
**Suppression rules:** Suppressed whenever any text/number field has focus. Suppressed while `viewingCount` is open. Works identically for a Viewer.
**Existing action invoked:** None exists to reuse — requires new, additive UI wiring: a `ref` attached to the existing search `<input>` (currently has neither a `ref` nor an `id`), calling `.focus()` on it. The search input's own state/filtering logic is completely unmodified.
**Scroll-into-view:** Required only when the list is not already the only thing on screen — same `scrollIntoView` pattern as above.
**If search is already focused:** no-op (the handler never fires, per the precondition, so the browser's native `/`-typing behavior applies normally).

### 1.4 — `↑` / `↓` → Navigate unvalidated products

**Trigger:** `keydown`, `key === 'ArrowDown'` / `key === 'ArrowUp'`, no modifier keys.
**Scope:** Fires only when focus is on the search input, or on the currently-open workspace's own outer container carrying a new, dedicated `data-workspace-nav-root` marker — deliberately not "anywhere inside the workspace," to avoid capturing arrow keys typed inside the unit/price/name fields.
**Algorithm:** Reuses `sortedUnifiedListEntries` (already sorted per whichever of the six existing modes is currently selected — no second ordering system). Find the index of the entry whose `activationKey === activeWorkspaceProductKey` (or `-1` if focus is on search with no workspace open); scan forward (↓) or backward (↑), skipping any `entry.validated === true`, and open the first unvalidated match via the existing `handleUnifiedEntryClick(entry)` — never a new activation path.
**First/last behavior:** No wraparound (flagged as a product preference in §10, not decided here).
**Validated products:** always skipped.
**Focus after navigation:** the newly-opened row's quantity input should receive focus automatically — requires one new shared auto-focus-on-workspace-open effect (see §5), not duplicated per shortcut.

### 1.5 — `Esc` → Priority-ordered close/cancel/back

**Trigger:** `keydown`, `key === 'Escape'`.
**Scope:** `document`-level; target depends on state. Deliberately not suppressed while a text field has focus (universal convention; confirmed safe — Esc triggers no native form submission or other destructive default from inside a field).

**Exact priority order, verified against the actual current state model:**
1. `viewingCount !== null` → `setViewingCount(null)`. (The one true modal in the component; currently has no keyboard close path at all — a pure accessibility fix riding along with this shortcut.)
2. Else, `discardConfirmState !== 'idle'` → `setDiscardConfirmState('idle')` (cancels without discarding — mirrors clicking "Cancelar").
3. Else, `isWorkspaceActive` → `handleLeaveWorkspaceUnchanged()` (Voltar) — reuses the existing, already-correct in-flight-edit-safe restoration logic verbatim.
4. Else → no-op.

**Never a destructive action** — confirmed: none of steps 1–3 delete or discard anything.

### 1.6 — `N` (potentially useful) → Adicionar produto

**Trigger:** `keydown`, `key === 'n'` or `'N'`, no modifier keys.
**Scope:** `document`-level.
**Preconditions:** No workspace currently active; `isActiveContagemEditor` true; `!subscriptionBlocksNewRecords`.
**Suppression rules:** Suppressed whenever any text/number field has focus (same shared `isTypingTarget` check as `/`); suppressed while `viewingCount` is open; suppressed for a Viewer (the one shortcut that DOES need its own explicit check, since its target button is conditionally rendered rather than merely disabled).
**Existing action invoked:** `handleAddNewProductToWorkspace()`, unmodified.

### 1.7 — `?` (potentially useful) → Show shortcut help

**Trigger:** `keydown`, `key === '?'`, no modifier keys.
**Scope:** `document`-level, suppressed under the same `isTypingTarget` check, and suppressed while `viewingCount` is open.
**Behavior:** Toggles a new, small, dismissible inline panel (not a `fixed inset-0` modal — consistent with this component's existing preference for inline panels over overlays, confirmed by the investigation to be the dominant pattern here). Displays: the final shortcut table (§2). Closes via `Esc` (added to the same priority chain in §1.5, ahead of step 1) or an explicit close control.

---

## 2. Final Shortcut Table

| Shortcut | Action | Scope | Existing handler reused |
|---|---|---|---|
| `Enter` | Validar current row | Quantity field only | `handleSaveCatalogRow` / `handleSaveManualRow` |
| `Ctrl/Cmd+Enter` | Validar + advance | Quantity field only | Same, + new next-unvalidated nav |
| `/` | Focus product search | Document (suppressed in fields) | None — new `ref` |
| `↑` / `↓` | Navigate unvalidated products | Search input or workspace root (not inner fields) | `handleUnifiedEntryClick` |
| `Esc` | Priority-ordered close/cancel/back | Document, always active | `setViewingCount(null)` / `setDiscardConfirmState('idle')` / `handleLeaveWorkspaceUnchanged` |
| `N` | Adicionar produto | Document (suppressed in fields) | `handleAddNewProductToWorkspace` |
| `?` | Show shortcut help | Document (suppressed in fields/modal) | None — new inline panel |

---

## 3. Exact Focus/State Rules

- Every non-Enter, non-Esc shortcut (`/`, `↑`/`↓`, `N`, `?`) checks `document.activeElement`'s tag against `INPUT`/`TEXTAREA`/`SELECT` and bails if matched — one shared helper (`isTypingTarget`), written once, reused by all of them.
- `Enter`/`Ctrl+Enter` are the deliberate exception — scoped via a local `onKeyDown` on the quantity field itself, not the shared suppression check, because their purpose is to act *because* that field has focus.
- `Esc` is the other deliberate exception — never suppressed by the typing-target check.
- No shortcut needs its own redundant `isActiveContagemEditor` check beyond what the DOM already enforces, except `N` (§1.6), whose target is conditionally rendered rather than merely disabled.

---

## 4. Enter / Form-Submission Handling

The entire editable view is one `<form onSubmit={handleRequestConfirmation}>` (confirmed directly in the investigation, not assumed) — pressing Enter in *any* single-line input inside it today already triggers the finalization-review flow. This must be closed off per field, explicitly, never via a single blanket form-level intercept:

| Field | Current risk | Required behavior |
|---|---|---|
| Quantity input (active row) | Submits the form today | New `onKeyDown` → `e.preventDefault()` → Validar (§1.1) |
| Product search | Submits the form today | New `onKeyDown` → `e.preventDefault()` only, no other action |
| Manual product-name input | Submits the form today | Same bare `e.preventDefault()` |
| Unit field (free-text fallback) | Submits the form today | Same bare `e.preventDefault()` |
| Date / custom-label fields | Submits the form today | Same bare `e.preventDefault()` |
| Any other text/number input in the form | Submits the form today | Same bare `e.preventDefault()`, as a general rule |
| Finalization-review state (`pendingTally`) | Unconfirmed whether structurally inside the same form | To be confirmed at implementation time — not assumed here |
| Historical-count modal (`viewingCount`) | No inputs exist inside it today | No Enter handling needed unless a future change adds one |
| Viewer mode | Same form exists, but Viewer cannot reach an enabled input | Covered by the same field-level fix — disabled inputs cannot receive `keydown` |

The finalization action itself is never removed or hidden — the existing `type="submit"` button continues to work exactly as today; only the implicit, easy-to-trigger-by-accident Enter-anywhere path into it is closed off, field by field.

---

## 5. Fast Counting Workflow

`/ → search → select → quantity → Ctrl/Cmd+Enter → next` **is achievable with the current architecture using only additive UI work**:

1. `/` — new, focuses search.
2. Type a query — existing `productSearch`, unmodified.
3. Select (click) — existing `handleUnifiedEntryClick`, unmodified.
4. Quantity field receives focus — new: an auto-focus effect firing whenever `activeWorkspaceProductKey` changes to non-null. Built once, shared by this step, §1.4's arrow-navigation, and §1.2's advance.
5. Type quantity — existing.
6. `Ctrl/Cmd+Enter` — new, validates and advances, landing back at step 4.

**Open question, not resolved here:** whether plain `Enter` on a focused search result should also select it, making step 3 keyboard-only too. Outside the originally requested shortcut set — flagged in §10 as a possible follow-up.

---

## 6. Accessibility / Mobile Behavior

- **Focus visibility:** no existing `:focus` styling is removed or hidden by anything in this specification.
- **Keyboard-only operation:** every shortcut is additive on top of already-fully-mouse-operable controls; a mouse-only operator loses nothing.
- **Screen readers:** no accessible name, role, or live-region behavior already in place is changed.
- **Shortcut hints:** recommend a small, dismissible `?`-triggered panel rather than persistent on-screen key labels, which would add visual noise to an already data-dense page.
- **Mobile:** should NOT receive any of this. Mobile numeric keypads do not reliably dispatch identical `Enter`/`Ctrl`/arrow-key events, and touch has no physical keyboard. Recommend gating the entire shortcut system behind a coarse pointer/breakpoint check (e.g. the same `lg` breakpoint already used elsewhere in this file) so mobile continues using its existing, unmodified touch controls with zero behavioral change.

---

## 7. Rejected Shortcuts (recorded so they are not reintroduced)

| Shortcut | Reason for rejection |
|---|---|
| `F1` → Adicionar produto | Reserved for browser/OS Help in a way `preventDefault()` cannot reliably suppress across browsers. Superseded by `N`. |
| `F2` → Ver lista de produtos | Confirmed reserved-key risk (Windows especially); superseded by `/`. |
| `Ctrl/Cmd+F` → product search | Would hijack the browser's own native page-search. |
| `Ctrl/Cmd+S` → force save | No unsaved state exists for it to resolve; the app already autosaves on debounce. |
| Global `Ctrl/Cmd+Enter` (finalization, not row-scoped) | Finalization is rare and destructive/high-stakes; a global shortcut risks accidental early finalization. The row-scoped `Ctrl/Cmd+Enter` (§1.2) is unaffected by this rejection. |

---

## 8. Implementation Boundaries

**In scope for a future Implementation Plan:** new scoped `onKeyDown` handlers (quantity input, search input, every other text/number field, one `document`-level listener for `/`/arrows/Esc/N/?); new `ref`s (search input, active row's quantity input); the one narrow `boolean`-return change to `handleSaveCatalogRow`/`handleSaveManualRow`; a new next/previous-unvalidated navigation function built on existing `sortedUnifiedListEntries`/`handleUnifiedEntryClick`; a new auto-focus-on-workspace-open effect; a new shared `isTypingTarget` helper; a new dismissible shortcut-help panel (if `?` is approved); a new mobile/desktop gating check.

**Explicitly out of scope:** `resolvePeriodicConflict`, `savePeriodicStockDraftItem`, any Firestore write path (every shortcut only ever calls an existing, unmodified handler); `firestore.rules`; any conflict-resolution business logic; any authority/Viewer model; any persistence/debounce timing; finalization's own authority or logic (only the incidental Enter-path-into-it is addressed, per §4).

---

## 9. Tests Implementation Must Provide

Matching this repository's own established structural/regex test style:

- Confirms the quantity input's own `onKeyDown` calls `e.preventDefault()` before invoking Validar, scoped to that input, not a document-level listener.
- Confirms every other text/number field in the form has its own Enter-suppressing `onKeyDown`, enumerated.
- Confirms `handleSaveCatalogRow`/`handleSaveManualRow` return `true`/`false` correctly, with no existing early-return branch altered in substance.
- Confirms the Esc priority order matches §1.5 exactly, as literal source structure.
- Confirms arrow-key navigation reuses `handleUnifiedEntryClick`/`sortedUnifiedListEntries` — never a second implementation.
- Confirms the mobile gate exists and no keyboard listener attaches below the chosen breakpoint.
- Confirms none of the rejected shortcuts (§7) are wired anywhere in the file — a regression guard against accidental reintroduction.

Not written here, per instruction — this is the specification of what a future implementation must be tested against.

---

## 10. Governance Impact

**None of this specification requires reopening Decisions 44–56, Rule 8, or the Implementation Authorization** — every action any shortcut triggers is an already-existing, already-governed handler; nothing introduces a new business rule, changes Contagem authority, conflict semantics, persistence semantics, or finalization authority, and nothing touches `firestore.rules`.

**Flagged, not resolved:**
1. Whether ↑/↓ should wrap around at the first/last unvalidated product (§1.4) — defaults to no-wraparound here; a Product Architect preference, not a technical constraint.
2. Whether the finalization-review screen (`pendingTally`) is structurally inside or outside the same `<form>` — needs a direct check at implementation time (§4), not assumed here.
3. Whether plain `Enter` on a focused search result should also select it (§5) — outside the originally requested shortcut set, a possible follow-up.
