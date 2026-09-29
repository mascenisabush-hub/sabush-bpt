# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Session 2026-09-29 (Contagem: always-visible live total + last-entered
product) — read first

**Status: implemented, tested, typechecked, built. Committed to `main`.
Nothing mid-flight.**

**What changed (`PeriodicStockCountView.tsx` + one measurement hook in
`App.tsx`), scoped exactly to the requested UX task — no redesign, no
new persistence, no Business Worth/live-total formula change:**

1. **Sticky summary bar** near the top of the Contagem form: live total
   (`liveTally.totalSellingValue`, the SAME value/expression the
   existing bottom card and PDF export already use — now 3 reuses of
   the identical expression, not a new formula) + the existing
   `draftSaveState` mapped to the three required labels (Rascunho
   guardado / A guardar… / Falha ao guardar).
2. **"Último produto registado" strip**, folded into the same sticky
   bar: shows name/qty/unit/value and a saved/saving/failed icon
   sourced from the row's existing `persistenceState`
   (`derivePeriodicRowPersistenceState` — unmodified). Tapping it calls
   the existing `handleUnifiedEntryClick` — no new edit path.
3. **`lastEnteredEntry`** (new `useMemo`, declared next to
   `groupableUnifiedEntries`): the row with the highest existing
   `entrySequence`. Deliberately independent of `validatedSortMode`, so
   changing sort never changes this strip.
4. **Default sort changed** from `'name-asc'` to `'entry-order'`
   ("Ordem de registo") — but ONLY the initial `useState` value. The
   pre-existing restore effect (`sortModeRestoredRef`) still overwrites
   it the instant a saved `periodicContagemUserPrefs.sortMode` loads,
   so any user with an existing preference is unaffected; only users
   with no saved preference get the new default.
5. **Header-overlap avoidance**: added `data-app-sticky-header` to
   App.tsx's existing sticky header wrapper (attribute only, zero
   visual/behavioral change to it) so the new bar can measure that
   header's real rendered height at runtime (`ResizeObserver`) and
   position itself directly below it — works at every breakpoint
   without hardcoding a pixel offset that would drift if that header's
   own content ever changes height.

**Explicitly NOT touched:** Business Worth calculation, live-total
formula, Firestore schema/rules, save-state architecture,
`entrySequence`'s own semantics (still session-local/ephemeral, still
only advanced on a row's first Validar), `sourceRowKey`, confirmation
gating, any other module.

**Tests:**
- Ran the full non-emulator Contagem/Periodic suite (76 files) on
  clean `main` and again with this change, diffed pass/fail counts
  per file. **Zero regressions.** The only diffs are the two tests I
  added/re-pinned myself (below) — every other pre-existing failure
  (single-product-workspace's 11, unified-list-name-and-pdf's 3,
  concept-c-validated-compaction's 12, validar-decision-40's 6, etc.)
  is byte-identical to clean main; none are new and none are caused by
  this change.
- `tests/periodic-contagem-single-product-workspace.test.ts`: re-pinned
  the stale "defaults to name-asc" assertion into a passing type-only
  check, plus two new tests — one confirming the new `entry-order`
  default, one confirming the persisted-preference restore effect
  still overrides it unconditionally.
- `tests/periodic-contagem-unified-list-name-and-pdf.test.ts`: re-pinned
  the "exactly 2 reuses of `formatCurrency(liveTally.totalSellingValue,
  ...)`" assertion to 3 (the sticky bar is a legitimate third reuse of
  the identical expression, per §7's own "only one source of truth"
  requirement — not a new calculation).
- `npx tsc --noEmit -p apps/tenant`: clean.
- `npm run build`: clean (pre-existing CSS/chunk-size warnings only,
  unrelated).

**Not verified (no DOM/React render harness in this repo — same
limitation every other Contagem test file already discloses):** actual
pixel height of the sticky bar in a real browser (spec's ~44–56px
target on mobile is a two-row bar — live-total row + last-entered row —
so likely a bit taller than 56px combined; flagged, not silently
assumed). Recommend an eyeball pass on a real phone before considering
this fully done.

## Next session should

1. If the sticky-bar height needs tightening to the 44–56px target more
   strictly, that's a follow-up visual pass, not a functional gap.
2. Otherwise nothing is mid-flight from this session — pick the next
   task per `docs/specs/README.md`.

---

## Prior sessions (compacted — see git log / docs/specs for full detail)

- **2026-09-28 (f)**: fixed row delete silently failing live in
  Contagem — root cause was `firestore.rules`'s tombstone path
  (`stockCountDrafts/periodic/tombstones`, added 2026-09-25) likely
  never deployed, so a permission-denied on delete was swallowed with
  no fallback. Fix: permission-denied on that path now falls back to a
  plain row delete + console warning; `handleRemoveManualRow` catches
  any error, keeps the row, restores its cancelled save, and shows the
  reason. **OWED (owner, still open):** `firebase deploy --only
  firestore:rules --project sabush-bpt` so tombstones work as
  designed rather than relying on the fallback. Commit `a6fc4f9`.
- **2026-09-28 (e)**: Enter now validates the open Contagem product
  from anywhere on the page (Ctrl/Cmd+Enter still advances). Commit
  `9ea775d`.
- **2026-09-28 (d)**: one-click validation for multi-portion products
  in the Contagem workspace (was per-portion). Commit `1402c13`.
- **2026-09-28 (c)**: fixed rows added via Adicionar produto/Porção
  being undeletable (missing stable key before first save); also
  Audit Center filter was missing 9 `support_session.*` action types.
  Full suite (257 files) run individually → 0 failures. Commits
  `56f8b00`, `e89ba4a`.
- **2026-09-28 (b)**: fixed a mixed-validated portion group staying
  partially hidden/uneditable when reopened. Commit `911c049`.
- **2026-09-28 (earlier)**: 3 Contagem UX-blocker fixes (draft-listener
  reconnection backoff, stale-conflict banner wording, retry-meta-first
  ordering) — commits `9953d70`, `06995fd`, `34de279`. Test triage of
  the pre-existing 83 stale-pin failures across 32 files is still open
  (tracked, not blocking).
- **2026-09-20 EMERGENCY (Product Architect-directed)**: SuperAdmin
  Direct Subscription Activation built outside the signed governance
  chain — **still needs a retroactive BDR/Policy/Spec/Rule 8/
  Authorization record**, none exists yet
  (`server/superadminDirectActivation.ts`). Also landed: withdrawal
  `notes: undefined` Firestore-write bug fix (payment submission only —
  `addWithdrawal` in `AppContext.tsx` has the same bug class,
  **unfixed**); admin-panel-unreachable investigation inconclusive,
  diagnostics on untested branch `wip/admin-panel-diagnostics`.
- **SuperAdmin Agent Attended Support Session**: Implementation
  Authorization signed; Checkpoints 1–8 (incl. full validation) are
  **closed**. Explicitly deferred (not gaps): Support View State
  publish mechanism, operator-side Pointer publishing, any operator
  navigation screen for `SupportDesktopViewer`, operator-facing
  disconnect UI, TURN/relay provisioning. Full detail:
  `docs/engineering/superadmin-agent-attended-support-session-implementation-authorization.md`.
