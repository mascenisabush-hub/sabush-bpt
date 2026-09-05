Rule 8 Assessment — Periodic Contagem Keyboard Shortcuts

# Rule 8 Assessment — Periodic Contagem Keyboard Shortcuts

**STATUS:** ✅ **FINAL — RULE 8 ASSESSMENT COMPLETE.** This document does
not authorize implementation. A signed, feature-scoped Implementation
Authorization remains a required, subsequent gate — no such
authorization exists yet.

**Governing chain:**
[Keyboard Shortcut Implementation Specification](../specs/periodic-contagem-keyboard-shortcuts-specification.md)
→
[Keyboard Shortcut Implementation Plan](./periodic-contagem-keyboard-shortcuts-implementation-plan.md)
(accepted by the Product Architect) → **THIS Rule 8 Assessment** →
*(next: Product Architect acceptance of this assessment, then a
feature-scoped Implementation Authorization — neither exists yet — then,
only after that is signed, implementation)*.

**Repository state investigated:** `main = origin/main = 3ff931c`
("fix(periodic-contagem): entry-time sort now actually reorders existing
products"), working tree otherwise clean except for the two untracked
governance documents this assessment itself is chained from
(the specification and the Implementation Plan). Confirmed directly via
`git status --short` and `git log -1 --oneline` immediately before
drafting this assessment. **Nothing has been modified in `apps/`,
`server/`, `firestore.rules`, `firestore.indexes.json`, `package.json`,
`tests/`, Decisions 44–56, the existing Decisions 44–56 Rule 8
Assessment, or the existing Decisions 44–56 Implementation Authorization
to produce this document.**

**Scope of this assessment.** This is an assessment of the accepted
specification and Implementation Plan's safety and internal consistency
— it does not re-derive them from scratch. Where a claim in this
assessment needs re-verification against live source (line numbers,
handler names, current governance-document status), that re-verification
was performed directly against the commit above, not assumed to still
hold from the two prior documents. Findings are recorded in §2, using
the same "confirmed, not manufactured" discipline the Decision 60 Rule 8
Assessment established as precedent for this repository.

---

# 1. Executive Determination

## ✅ **READY FOR IMPLEMENTATION AUTHORIZATION**

Direct re-verification of the specification, the Implementation Plan,
and the live `PeriodicStockCountView.tsx` source finds no genuine
governance blocker. Every one of the ten assessment areas requested is
addressed below; three items surfaced during this assessment are
recorded as findings, but all three are **implementation-level
concerns already correctly anticipated and resolved within the accepted
Implementation Plan itself** — none requires a new Product Architect
decision, none requires reopening the specification or the plan, and
none blocks authorization. This assessment identifies zero material
blockers.

---

# 2. Assessment by Requested Area

## 2.A — Form/finalization safety

**Assessed:** the specification (§0, §3) and the Implementation Plan
(§3, Area A) both correctly identify that the *only* `type="submit"`
element inside `<form onSubmit={handleRequestConfirmation}>` (opens
line 6320, closes line 7960, re-verified against `3ff931c`) is the
"Rever e Confirmar Contagem" button at line 7954. Area A's proposed
mechanism — `e.preventDefault()` on every in-form text/number input's
`onKeyDown` for `Enter`, attached per-element rather than as a single
`preventDefault()` on the form's `onSubmit` itself — correctly prevents
accidental submission without disabling the legitimate submit path,
because the submit button's own click handler never routes through any
`onKeyDown` this plan adds.

Ctrl/Cmd+Enter's scope (Implementation Plan, Area B) is confined to the
quantity input and never references `handleRequestConfirmation`,
`setPendingTally`, or the submit button in any of its code paths — its
only two outcomes are "Validar" and "open the next unvalidated entry via
`handleUnifiedEntryClick`," neither of which can reach finalization.

**Finding 2.A-1 (informational, no action required):** `pendingTally !==
null` renders a structurally separate return branch (line 5571) with no
`<form>` and no quantity input in that tree. This means the Enter/
Ctrl+Enter suppression logic is not merely correct by design — it is
*unreachable* to test against the review screen at all, because none of
the elements it attaches to exist there. This was already noted
correctly in both governing documents; recorded here only to confirm it
was re-verified, not assumed, at assessment time. **Classification:
informational, not a finding requiring resolution.**

**Verdict on 2.A: safe.**

---

## 2.B — Validar behavior

**Assessed:** `handleSaveCatalogRow` (line 2239) and `handleSaveManualRow`
(line 3170) were re-read in full at `3ff931c`. Both (a) run
`validateWorkingRowForSave`, setting an inline error and returning early
on failure with no side effect on `row.validated`; (b) call a blocking
`window.confirm(...)` at line 2253/3180 when `quantity === 0`, returning
early with no side effect on `row.validated` if the operator cancels;
(c) otherwise call `updateCatalogRow`/`updateManualRow` with `validated:
true`. **Neither function returns a value** — re-confirmed directly,
not assumed from the prior documents.

**Option (b) state-transition observation — assessed for correctness.**
The Implementation Plan's Area B proposes watching `row.validated`
transition from falsy to `true` via a `useEffect`, gated by a
short-lived ref (`ctrlEnterRequestedRef`) set immediately before the
Ctrl/Cmd+Enter-triggered call and cleared immediately after the effect
consumes it. This is assessed as **correct and sufficient**, for a
specific, verifiable reason: both failure paths in
`handleSaveCatalogRow`/`handleSaveManualRow` (validation failure; a
cancelled `window.confirm`) return *before* the `validated: true` write
is ever reached — there is no code path in either function where
`row.validated` becomes `true` without the write actually having
occurred. A state-watch mechanism keyed on that exact field therefore
cannot produce a false positive (advancing when validation didn't
actually succeed) by construction, because the field it watches is only
ever set by the one line that represents genuine success. The
distinguishing ref (`ctrlEnterRequestedRef`) is necessary and correctly
scoped: without it, a *plain* Enter or a mouse-click Validar would also
trigger the same `useEffect`, which would violate the specification's
own requirement that plain Enter never auto-advances.

**Finding 2.B-1 (implementation-level detail, not a blocker):** the
Implementation Plan does not fully specify the reset timing for
`ctrlEnterRequestedRef` relative to React's render/effect batching —
specifically, whether the ref is cleared synchronously inside the
`useEffect` body (before or after the advance logic runs) or in a
follow-up microtask. This matters only for the edge case of two
Ctrl/Cmd+Enter presses in extremely rapid succession before the first
`useEffect` has fired. **Classification: technical implementation
concern, correctly deferred to implementation — not a specification gap
and not a governance question.** The Implementation Plan's own
instruction not to change existing handler signatures is unaffected
either way; this is recorded so the implementer clears the ref
synchronously at the start of the effect body, before dispatching the
advance action, which is the safe ordering and requires no design
decision beyond what Area B already establishes.

**Verdict on 2.B: safe**, with Finding 2.B-1 noted for implementation
attention.

---

## 2.C — Navigation safety

**Assessed:** the Implementation Plan's Area B and Area D both correctly
specify iteration over **`visibleUnifiedListEntries`** — re-verified at
line ~4232 as the array that is simultaneously filtered by
`productSearch`, sorted by `validatedSortMode` (via the unmodified
`sortByValidatedMode` function, all seven modes), and excludes the
currently-active product's own entry. Neither Area B's next-unvalidated
lookup nor Area D's arrow-navigation pointer reads from
`unifiedListEntries` or `sortedUnifiedListEntries` directly — confirmed
by re-reading the plan's own text, which explicitly calls this
distinction out in both areas.

**CONFLICT-entry handling — re-verified against source.** The render-site
row-activation wrapper (inline closure at line ~7793, referred to in
both governing documents as `handleEntryActivation`) performs a check
`handleUnifiedEntryClick` (line 4254) itself does **not** perform:
`isRowConflicted` (reading `periodicStockDraftItemsByKey[key]?.state ===
'CONFLICT'`), redirecting to `scrollToConflictPanel()` instead of
opening the row. This is the exact gap the specification flagged in its
own §4.2 and which the Implementation Plan's Area B explicitly closes by
having the next-unvalidated-entry helper replicate this same check
directly (skip conflicted entries; if none remain, call
`scrollToConflictPanel()` rather than calling `handleUnifiedEntryClick`
on a conflicted entry). This assessment confirms the plan's proposed
fix is structurally sound: it uses the identical key convention
(`catalog:${...}` / `manual:${...}`) and the identical `'CONFLICT'`
sentinel the existing render-site check already uses, so it cannot drift
out of sync with what a mouse click already does.

**No wraparound — assessed.** Area D specifies clamping, not modular
arithmetic, at both boundaries. This is a straightforward, low-risk
implementation detail with no governance implication.

**No interference with native input behavior — assessed.** Area D
scopes the arrow-key listener locally (to the search input and to
unified-list rows' own existing `onKeyDown`), explicitly *not* through
the shared document-level listener (Area H) that handles `/`/`N`/`?`/Esc.
This is the correct design choice: a document-level arrow-key listener
would need explicit exclusion logic for every quantity/unit/price field
individually, whereas the local-scoping approach makes such interference
structurally impossible rather than merely guarded against.

**Verdict on 2.C: safe.**

---

## 2.D — Authority / Viewer safety

**Assessed:** `isActiveContagemEditor` (destructured at line 683,
re-verified) is `true` only for the Owner/Admin or the current delegated
Editor. Every mutating shortcut named in the specification (Enter/
Ctrl+Enter → Validar; N → add product) is gated on this flag in the
Implementation Plan's Area A, B, and F respectively. This assessment
confirms the gating is inherited from the *same* flag the existing
click-driven buttons already condition their own rendering on — not an
independently-invented check that could drift out of sync with the
click path over time.

**N's compound precondition — assessed.** Area F requires all of:
`isActiveContagemEditor`, `!isWorkspaceActive` (matching
`handleAddNewProductToWorkspace`'s button's own current render
condition, line 6605), and `!subscriptionBlocksNewRecords`.

**Finding 2.D-1 (implementation-level detail, correctly identified by
the plan itself, not a new finding of this assessment — recorded here
for completeness):** `handleAddNewProductToWorkspace` does not check
`subscriptionBlocksNewRecords` internally; the Implementation Plan
already identifies this (Area F) and specifies adding the check at the
shortcut-handler call site rather than assuming the wrapped function
already guards it. This assessment confirms that treatment is correct
and sufficient — re-reading `handleAddNewProductToWorkspace` (line 4562)
confirms it indeed performs no such check, so the plan's explicit
call-site guard is necessary and is not, itself, a gap. **Classification:
already resolved by the plan; not a blocker.**

**Finalization authority — assessed.** No shortcut in either governing
document invokes `handleConfirmSave` or any finalization-authority
check; finalization's own authorization logic is untouched and
unreferenced by anything in scope.

**Verdict on 2.D: safe.**

---

## 2.E — Esc safety

**Assessed against the exact five-step priority chain in this request**
(shortcut-help panel → historical modal → discard-confirmation
cancellation → active-workspace Voltar → no-op):

This assessment notes a **terminology reconciliation, not a
substantive conflict**: the originally accepted specification and
Implementation Plan define Esc's priority chain as three steps (modal →
discard-confirm → workspace → no-op), with the shortcut-help panel's own
Esc-closing behavior specified *separately*, in the specification's §9
and the Implementation Plan's Area G, as "priority 0, evaluated before
the historical-modal check, while the panel is open." Re-reading both
sources confirms this is the same behavior the five-step ordering in
this assessment request describes — the "priority 0" language in Area G
and the "step 1, if open" language in this request describe an identical
outcome (help panel closes first, when open; the original three-step
chain applies otherwise). **No inconsistency exists between the
governing documents and this request; this is recorded only so a future
reader does not mistake differing phrasing for differing behavior.**

**Non-destructive guarantee — re-verified against source.** Every branch
in the chain calls a setter or function already reachable via an
existing non-destructive control:
`setViewingCount(null)` ≡ the historical modal's own backdrop `onClick`
(line 8049, re-verified); `setDiscardConfirmState('idle')` ≡ the
discard-confirm banner's own "Cancelar" button (line ~6422, re-verified);
`handleLeaveWorkspaceUnchanged` (line 4415, re-verified) ≡ the "Voltar
(deixar sem alterações)" button, which restores no field values and
performs no delete. `handleDiscardDraft` — the actually-destructive
action, reachable only via the discard banner's second, distinctly
labeled button — is referenced nowhere in either governing document's
Esc-handling logic. Confirmed directly, not assumed.

**Verdict on 2.E: safe.**

---

## 2.F — Browser/OS safety

**Assessed:** F1, F2, Ctrl/Cmd+F, and Ctrl/Cmd+S all remain rejected in
both governing documents, each for a distinct, previously-recorded
reason (function-key OS/browser interception for F1/F2; native
find-in-page collision for Ctrl/Cmd+F; native save-page collision for
Ctrl/Cmd+S, also unnecessary given the existing per-row autosave). None
of the four rejected shortcuts appears anywhere in the Implementation
Plan's proposed code paths — confirmed by re-reading the plan's Final
Shortcut Table and Areas A–H in full.

**Material browser/OS risk of the *accepted* mechanisms — assessed:**

- `/` and `N`: single printable characters, not reserved by any major
  browser when a page's own `keydown` listener has focus outside a
  native address bar/omnibox context (which is not reachable from this
  page). No material risk identified.
- `?`: not a reserved browser shortcut in any evaluated browser/OS
  combination. No material risk identified.
- `Enter`/`Ctrl+Enter`/`Cmd+Enter`: `Enter` has no browser-level reserved
  meaning outside form submission (which is precisely the behavior being
  corrected, not introduced); `Ctrl+Enter`/`Cmd+Enter` inside a text
  input has no standard browser-reserved meaning across evaluated
  browsers. No material risk identified.
- `Esc`: universally supported, no browser-reserved meaning in this
  context. No material risk identified.
- Arrow keys: reserved only for native scrolling/cursor movement when
  *not* inside a focused interactive element; the Implementation Plan's
  local-scoping (Area D) confines capture to the search input and
  unified-list rows, both legitimately focusable elements, so no
  page-scroll-hijacking risk is introduced.

**Verdict on 2.F: safe. No material browser/OS risk identified in any
accepted mechanism.**

---

## 2.G — Persistence / concurrency / conflict boundaries

**Assessed against Decisions 47, 50, 55, and Decision 56's boundaries,
each individually, re-verified against their own governing documents:**

- **Decision 47** (`stock-count-data-loss-resilience-decision-47-amendment.md`
  — Live Synchronization as Primary Conflict Avoidance): the
  Implementation Plan's only interaction with
  `periodicStockDraftItemsByKey` is a **read** (the CONFLICT-skip in
  Area B), using the same field and sentinel the existing render-site
  check already reads. No new synchronization mechanism, write, or
  listener is introduced. **Unaffected.**
- **Decision 50** (`stock-count-data-loss-resilience-decision-50-amendment.md`
  — Exactly-One Finalization Protection): re-confirmed in §2.A above —
  no shortcut reaches `handleRequestConfirmation`, `setPendingTally`, or
  `handleConfirmSave`. **Unaffected.**
- **Decision 55** (`stock-count-data-loss-resilience-decision-55-amendment.md`
  — Same-Row Concurrent Observation Conflict Semantics): the feature
  creates no conflict and resolves no conflict; its one read of conflict
  state is behaviorally identical to the existing mouse-click path's own
  redirect to `scrollToConflictPanel()`. **Unaffected.**
- **Decision 56 §7** (Clear-All-Data `delete`-path boundary, left
  explicitly unresolved by the existing Decisions 44–56 Implementation
  Authorization's own §4): neither governing document for this feature
  references `handleDiscardDraft`'s underlying delete mechanism, the
  Clear-All-Data capability, or `firestore.rules`' `delete` rule in any
  way. **Unaffected, and not implicated.**

**New write path — assessed:** every mutating shortcut calls an existing
function (`handleSaveCatalogRow`, `handleSaveManualRow`,
`handleAddNewProductToWorkspace`, `handleUnifiedEntryClick`,
`handleLeaveWorkspaceUnchanged`) with arguments identical in shape to
what the existing mouse-click handlers already pass. No new
`updateCatalogRow`/`updateManualRow` call shape, no new Firestore
document path, no new transaction. **No new write path exists anywhere
in either governing document.**

**Transaction behavior — assessed:** unchanged; no shortcut interacts
with `flushPeriodicStockDraftRows`, `recordStockCount`, or any
transaction-scoped function directly.

**Verdict on 2.G: safe. No change to any of Decisions 47, 50, 55, or 56's
boundaries.**

---

## 2.H — Finding K

**Confirmed directly against
`docs/engineering/finding-k-real-environment-verification-evidence.md`**
at `3ff931c`: Finding K's recorded status is
**`PARTIALLY VERIFIED — NOT FULLY RESOLVED`** (that document's own final
line, § "FINDING K STATUS AS OF THIS RECORD"). Neither the specification
nor the Implementation Plan for this keyboard-shortcuts feature
references Finding K, the cache/session isolation mechanism, or any
cross-tab/cross-device scenario. The feature operates entirely within a
single tab's existing UI interaction layer.

**This assessment confirms:** Finding K's status is **unchanged** by
this feature, and this feature's test plan (§9 of the Implementation
Plan) contributes **no evidence**, positive or negative, toward Finding
K's remaining browser/cross-tab verification requirement. No claim to
the contrary appears anywhere in either governing document.

**Verdict on 2.H: no impact; status unchanged and correctly not
claimed otherwise.**

---

## 2.I — Testing sufficiency

**Assessed:** the Implementation Plan's §9 proposes 18 tests (mirroring
the specification's own required 18) plus five named regression
protections, all using this repository's established convention —
`node:test` + `node:assert`, source-text/regex assertions against the
raw `.tsx` file, run via `npx tsx --test`. This assessment re-confirmed
the convention independently by reading
`tests/periodic-contagem-single-product-workspace.test.ts` directly:
the convention is real, is the established precedent (that file's own
header states "this repository has no DOM/React render harness"), and
the Implementation Plan does not misrepresent it.

**Gap assessment — is any gap material enough to block authorization?**
The Implementation Plan's own §9 already discloses, in its "Honesty
note," that two tests (advance-detection via the `useEffect`/ref
mechanism) can only be verified structurally (confirming the right
refs/conditions exist in source) rather than behaviorally (confirming
the effect actually fires correctly at runtime), because no render
harness exists in this repository to do otherwise. This assessment
evaluates that disclosed limitation as follows: it is **the same
limitation every existing Periodic Contagem test in this repository
already accepts** for equally state-transition-dependent logic (e.g.
existing tests for `handleUnifiedEntryClick`'s own routing logic are
themselves source-text/structural, not runtime-rendered). It is
therefore not a *new* category of test weakness introduced by this
feature — it is the repository's pre-existing, accepted testing ceiling,
applied consistently. **Classification: a disclosed test limitation,
correctly and honestly identified by the Implementation Plan itself —
not a material gap, and not grounds to block authorization.** Per this
assessment's own instruction not to introduce a new testing framework
merely because a stronger runtime test would be theoretically possible,
no such introduction is recommended here either.

**Verdict on 2.I: sufficient. No material test gap identified.**

---

## 2.J — Scope integrity

**Assessed:** the Implementation Plan's §12 names exactly two files:
`apps/tenant/src/components/PeriodicStockCountView.tsx` (implementation)
and `tests/periodic-contagem-keyboard-shortcuts.test.ts` (tests). Every
Area (A through H) in the plan was re-read specifically to check for any
reference to `firestore.rules`, `apps/tenant/src/types.ts`,
`apps/tenant/src/context/AppContext.tsx`, `server/index.ts`,
`firestore.indexes.json`, or `package.json` — **none appears anywhere in
either governing document.** Every new piece of state/ref the plan
introduces (§6 of the plan: `searchInputRef`, `activeQuantityInputRef`,
`activeNameInputRef`, `rowRefsMap`, `highlightedIndex`,
`wasValidatedBeforeRef`/`ctrlEnterRequestedRef`, `showShortcutHelp`) is
explicitly local to the one component file and explicitly excluded from
any persisted type or write payload — confirmed by the plan's own §6
table, which this assessment re-checked line-by-line against the "Does
this affect persistence?"/"Does this affect Contagem business state?"
columns, all answered "No" throughout.

**Verdict on 2.J: safe. Scope is correctly confined to the two named
files.**

---

# 3. Consolidated Findings

| # | Finding | Classification | Blocks authorization? |
|---|---|---|---|
| 2.A-1 | The finalization review screen is a structurally separate render branch with no form/quantity input, making Enter-suppression logic correctly unreachable there | Informational — confirms a design fact already stated in the governing documents | No |
| 2.B-1 | `ctrlEnterRequestedRef` reset timing relative to React's effect batching is not fully pinned down in the plan | Technical implementation detail | No — resolve during implementation by clearing the ref synchronously at the start of the effect body, before dispatching the advance action |
| 2.D-1 | `handleAddNewProductToWorkspace` does not itself check `subscriptionBlocksNewRecords`; the plan already adds this check at the shortcut call site | Already correctly resolved within the accepted Implementation Plan (Area F) | No |

**No finding in this table rises to the level of a genuine, unresolved
governance question.** None requires a new Product Architect Decision.
None requires reopening, narrowing, or expanding the accepted
specification or Implementation Plan. All three are the kind of
ordinary implementation-level judgment calls Rule 8 is meant to
distinguish from actual blockers — and this assessment makes that
distinction explicitly, per the instruction not to confuse a technical
concern, a test limitation, or a recommendation with a genuine blocker.

---

# 4. Explicit Exclusions (carried forward, re-confirmed unchanged)

This assessment confirms none of the following is introduced, implied,
or required by anything in the specification, the Implementation Plan,
or this assessment itself:

- F1, F2, Ctrl/Cmd+F, or Ctrl/Cmd+S as shortcuts, for any action.
- A global Ctrl/Cmd+Enter finalization shortcut, or any keyboard path
  reaching `pendingTally`/`handleRequestConfirmation` other than the
  existing submit button.
- Esc wired to the finalization review screen's own "Voltar"
  (`setPendingTally(null)`) — remains a deliberate, explicit exclusion
  in both governing documents, reaffirmed here.
- Any new business logic, business rule, or Contagem authority change.
- Any new persistence behavior, new Firestore write path, or new field
  on any persisted type.
- Any new conflict-resolution logic, or any change to
  `resolvePeriodicConflict` or the CONFLICT-state detection mechanism.
- Any change to Decision 56 §7's own unresolved Clear-All-Data
  `delete`-path boundary.
- Any claim toward, or test contributing to, Finding K's remaining
  browser/cross-tab verification requirement.
- Any unrelated UI redesign of Periodic Contagem beyond the seven named
  shortcuts and their minimal focus/highlight affordances.
- Introduction of a DOM/React render-testing harness this repository
  does not currently have.
- Modification of `firestore.rules`, `firestore.indexes.json`,
  `package.json`, `apps/tenant/src/types.ts`,
  `apps/tenant/src/context/AppContext.tsx`, `server/index.ts`, Decisions
  44–56, the existing Decisions 44–56 Rule 8 Assessment, or the existing
  Decisions 44–56 Implementation Authorization.

---

# 5. Whether a New Product Architect Decision Is Required

**No.** Every action wired to a shortcut in the accepted specification
and Implementation Plan is an already-decided, already-authorized
behavior (Validar, search, list navigation, Voltar, discard-cancel,
add-product). This feature introduces no new business rule, no new
authority model, and no change to conflict, finalization, or persistence
semantics anywhere in scope. The three findings in §3 are
implementation-level judgment calls with a clear, safe resolution
already available within the accepted governing documents — none of
them is a genuine unresolved governance question of the kind that would
require a new Product Architect Decision under this repository's
established process (contrast with, for example, Decision 60's own Rule
8 Assessment, which correctly escalated two genuinely open *product*
questions — acceptable UX friction, and a conflict with an
already-signed prior decision — neither of which has any analogue here).

---

# 6. Rule 8 Verdict

## ✅ **READY FOR IMPLEMENTATION AUTHORIZATION**

This assessment finds the accepted Keyboard Shortcut Implementation
Specification and Keyboard Shortcut Implementation Plan safe, internally
consistent, and free of any genuine governance blocker. All ten
requested assessment areas were evaluated directly against the current
repository state and the two governing documents; three findings were
identified, all classified as implementation-level details already
correctly anticipated (Findings 2.B-1, 2.D-1) or purely informational
(Finding 2.A-1) — none blocks authorization, and none requires a new
Product Architect Decision.

**This verdict does not itself authorize implementation.** Per this
repository's established governance chain, the next required steps are:
(1) Product Architect acceptance of this assessment, if required by the
established process for a feature of this scope; (2) drafting and
signing a separate, feature-scoped Implementation Authorization
constrained to exactly the two files named in §2.J. **No code may be
written until that Authorization is signed.**

---

*End of Rule 8 Assessment. No application code, test code, `firestore.rules`,
schema, Decisions 44–56, the existing Decisions 44–56 Rule 8 Assessment,
or the existing Decisions 44–56 Implementation Authorization were
modified in producing this document.*
