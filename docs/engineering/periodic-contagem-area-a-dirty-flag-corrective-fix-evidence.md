TECHNICAL EVIDENCE RECORD — CORRECTIVE FIX VERIFICATION — NOT A GOVERNANCE DECISION, NOT A RULE 8 UPDATE

# Periodic Contagem Area A — Dirty-Flag Lifecycle Corrective Fix — Evidence Record

**Type:** Durable engineering evidence artifact. Records a completed
client-side corrective fix to Area A (genuine per-row live adoption,
Implementation Plan §4 Area A / Implementation Authorization §2 item
1) and its verification, for citation by any future review of this
thread. Does **not** change any Rule 8 classification (including
Finding K's), does not modify the Implementation Authorization, the
Implementation Plan, Decisions 44–56, or `firestore.rules`, and does
not create a Product Architect decision.

**Status recorded here:** the defect described below is **corrected
and verified at the source-text/unit-test level**. This document does
not claim browser-level or cross-tab verification, and does not touch
Finding K's own status, which remains **PARTIALLY VERIFIED — NOT
FULLY RESOLVED** exactly as the Rule 8 reassessment (`1e068ff`) left
it.

**Governing chain (for future citation):** Decisions 44–56 (✅
Accepted) → Rule 8 Reassessment (`02cd599`, READY AFTER DECISIONS) →
[Implementation Plan](./periodic-contagem-shared-live-data-decisions-44-56-implementation-plan.md)
(accepted as governing planning artifact) → [Implementation
Authorization](./periodic-contagem-shared-live-data-decisions-44-56-implementation-authorization.md)
(`67d60a7`, signed) → Area A implementation (`f0863ed`) → **the defect
this document records** → **the corrective fix this document records**
(`d9e9590`) → **THIS evidence record**.

**Repository state at this revision:** working tree clean immediately
before this document was added; `main == origin/main` at `1998d9c`
(which already contains `d9e9590`). No application code,
`firestore.rules`, schema, UI, Implementation Authorization,
Implementation Plan, or Rule 8 Assessment is modified to produce this
record — this document only cites and evidences work already committed
and pushed.

---

## 1. The Defect

**Context:** Area A (`f0863ed`) introduced `rowHasUnsavedLocalEditRef`
— a per-row flag, set the instant `scheduleRowDraftSave` schedules a
genuine edit, that protects a row from having an incoming remote
snapshot silently overwrite unsaved local work. The flag is meant to
clear once that exact edit's own save resolves.

**The gap:** `savePeriodicStockDraftItem()` rejects a write attempted
against a row whose current server-side state is already `'CONFLICT'`
by throwing a plain `Error` (no Firestore `.code` to branch on).
`classifyDraftSaveError()` therefore has no option but to classify
this as `'save-unknown'` — a branch that does not auto-retry. Before
the correction, nothing in that branch ever cleared
`rowHasUnsavedLocalEditRef` for the row. Consequence: if an operator
kept typing into an already-`CONFLICT` row, every subsequent save
attempt hit the same rejection, and the dirty flag could remain `true`
indefinitely — even after the conflict was later resolved through the
existing, unmodified `resolvePeriodicConflict` flow, the live-adoption
effect would keep refusing to adopt the now-authoritative resolved
value into that row's editable field, leaving stale UI and risking a
later spurious conflict.

**Classification (unchanged from how it was identified):** this was a
real client-side Area A synchronization/lifecycle defect, not a
server-side data-integrity failure — the existing transaction-based
conflict mechanism (Decision 55) remained correct throughout.

---

## 2. Corrective Mechanism Actually Implemented

Commit `d9e9590`, `apps/tenant/src/components/PeriodicStockCountView.tsx`,
inside `performRowSaveAttempt`'s `.catch` handler. The dirty flag is
cleared **only** when all three of the following hold together:

1. **`belongsToCurrentGeneration()` has already passed** (checked at
   the very top of the `.catch`, before any classification happens) —
   a superseded (older) rejected attempt can therefore never reach the
   new clearing logic at all, so it can never clear a genuinely
   *newer* edit's dirty protection. This is exactly what distinguishes
   "a local edit attempted after the row is already CONFLICT" (reaches
   this code, cleared) from "a genuinely newer local edit" (a newer
   generation exists, this callback already returned above it, that
   edit's own flag is untouched).
2. **The row's TRUE, current remote state — read from
   `latestPeriodicStockDraftItemsByKeyRef`**, a ref updated
   unconditionally on every render (never a value closed over when the
   attempt was first scheduled) — **is genuinely `'CONFLICT'`.**
3. **The clear happens as a direct, immediate reaction to *this*
   attempt's own rejection** — never merely because the live-adoption
   effect happened to observe `CONFLICT` state on some render. The
   naive alternative ("clear the dirty flag whenever the adoption
   effect observes CONFLICT") was explicitly considered and rejected:
   it would race a genuinely different, still in-progress edit on the
   same row that has not yet even attempted its own save (e.g. a
   second editor typing into a row a third party's write just
   conflicted), incorrectly clearing protection for that unrelated
   edit. Tying the clear to an actual rejection of *this* generation's
   own attempt avoids that race entirely.

**Independently confirmed, not merely asserted:**

- The live-adoption effect's `item.state === 'CONFLICT'` guard is a
  **separate, independent** check from the dirty-flag guard (two
  sequential `continue` statements, not one merged condition) — so a
  row that is still genuinely `CONFLICT` remains fully protected from
  adoption regardless of the dirty flag's value. Clearing the flag
  while a row is still conflicted introduces no window for a silent
  overwrite.
- Once `resolvePeriodicConflict` (unmodified) later flips the row back
  to `'ACCEPTED'` with the authoritative resolved value, the
  now-clean dirty flag no longer blocks the live-adoption effect from
  adopting it — no third gate was added to that effect.
- A genuinely new local edit made after that adoption re-establishes
  the dirty flag normally, through the entirely unmodified
  `scheduleRowDraftSave` path.
- The existing successful-save (ordinary `ACCEPTED`) dirty-clearing
  path, the transaction-based `runTransaction`/`CONFLICT`-creation
  mechanism (Decision 55), `resolvePeriodicConflict` itself, Owner/
  Admin finalization authority, Viewer restrictions, finalized-Contagem
  immutability, Finding K's listener gating, and `firestore.rules` are
  all unmodified by this fix.

---

## 3. Regression Coverage

`tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts`,
describe block **`'Bug fix — Area A dirty-flag lifecycle
(already-CONFLICT rejection)'`** — **11 tests**, covering:

1. a save rejected because the row is already `CONFLICT` clears the
   dirty flag, checking the TRUE current remote state via the
   dedicated live ref;
2. the live ref is updated unconditionally every render, never a stale
   closure;
3. a conflicted row remains protected from adoption independently of
   the dirty flag — the two guards are separate, not merged;
4. once resolution flips the row back to `ACCEPTED`, the now-clean
   dirty flag no longer blocks adoption of the resolved value;
5. a genuinely new local edit after resolution re-establishes the
   dirty flag through the unmodified `scheduleRowDraftSave` path;
6. the already-CONFLICT clear is reached only after
   `belongsToCurrentGeneration()` — a superseded (older) rejected
   attempt can never clear a newer edit's dirty flag;
7. existing same-row conflict detection/resolution (Decision 55) —
   `runTransaction`, `CONFLICT` creation, `resolvePeriodicConflict` —
   is untouched;
8. the existing successful-save dirty-clearing path (ordinary
   `ACCEPTED` save) is unchanged;
9. business-switch/resume/discard reset behavior is unchanged by this
   fix;
10. the fix does not modify `firestore.rules`, Decision 56 §7, or any
    Finding K listener gating;
11. the `fromCache` reconnect nuance remains documented as a
    deliberate, unaddressed limitation, not silently dropped.

---

## 4. Fresh Verification Results (this session)

Run directly against the current checkout (`main == origin/main` at
`1998d9c`, which already contains the corrective fix at `d9e9590`):

| Check | Result |
|---|---|
| Focused Area A test file (`tests/periodic-contagem-shared-live-data-decisions-44-56.test.ts`) | **63/63 PASS** (0 fail) |
| `npm run test:all` | **0 failures**, all suites |
| `npx tsc --noEmit -p apps/tenant` | Clean |
| Working tree | Clean before and after this evidence document was added |

No additional implementation commit was required or made — the fix
was already present and verified in `d9e9590` before this evidence
record was written.

---

## 5. Confirmations

- **Decision 55 conflict semantics are preserved.** No blind
  last-write-wins was introduced; a `CONFLICT` row remains governed
  exclusively by the existing transaction-based detection and the
  existing `resolvePeriodicConflict` resolution path, neither of which
  this fix touches.
- **No governance status changed by this fix or by this evidence
  record.** Decisions 44–56, the Rule 8 Assessment (including Finding
  K's `PARTIALLY VERIFIED` classification), the Implementation
  Authorization (`67d60a7`), the Implementation Plan, and
  `firestore.rules` are all unmodified.
- **No new Product Architect decision was created.**

## 6. Limitations, Unchanged

- No real browser/page-lifecycle verification of this fix has been
  performed.
- No production `persistentMultipleTabManager` cross-tab verification
  has been performed.
- The `fromCache` reconnect flash (a freshly-mounted listener's
  cache-only first emission briefly preceding a server-confirmed one)
  remains a documented, deliberately-unaddressed, benign nuance — not
  in scope for this fix and not addressed here.
- Finding K remains **PARTIALLY VERIFIED — NOT FULLY RESOLVED**,
  exactly as `1e068ff` left it; nothing in this document changes that.
