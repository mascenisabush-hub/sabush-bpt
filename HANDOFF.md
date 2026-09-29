# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Session 2026-09-29 (b) — Firestore usage, Contagem warnings, Business Worth fixes — read first

**Status: all committed to `main` (5dd8f23 → c23e4a0), typechecked, built, full suite 0 failures
(emulator-only suites not run). Nothing mid-flight.** Previous entry (sticky live total, c92efa8) still applies.

**What changed**
1. **Firestore usage (5dd8f23):** row saves while typing wait `ROW_SAVE_IDLE_DELAY_MS` (5000, was 800); validate/
   remove save immediately; local recovery snapshot still written synchronously first; Rever/confirm flush pending
   rows. Fix: catalog-row recovery snapshot lagged one edit. `savePeriodicStockDraftItem` reads draft meta only on
   create/CONFLICT.
2. **Contagem warnings (8c7c540):** recovery / unsaved-row / identity warnings name the products (≤5 + "e mais N");
   the "alterações não confirmadas" warning is re-stated or cleared when its rows resolve (was stale).
3. **Business Worth (058ce8b, c23e4a0), Owner-confirmed model:** snapshot = stock + counted cash − supplier debts
   (`computeMeasuredBusinessWorth` no longer subtracts all-time expenses/withdrawals when Caixa cash is present —
   Caixa is the cash remaining after them). Live worth: supplier-credit purchases now neutral at cost (adds back
   Payables with `sourcePurchaseBatchId` created after the snapshot; Example C 480k → 505k). Corrections exclude the
   snapshot they replace from baselines. Since-last-count figures by `createdAt` in (prev confirmedAt, now]; cash
   reconciliation as of confirmation.

**Owner-facing consequences / owed**
- Past snapshots are immutable and understated by the old double subtraction → the NEXT Contagem will show one
  positive reconciliation difference (catch-up, not a new problem).
- `firestore.rules` is not deployed by CI — deploy from an up-to-date `main` (`git pull` first!). On 2026-09-28 the
  Owner deployed from a stale local `main` (832 commits behind) and broke Contagem until redeployed.
- Firebase Spark daily quota was exhausted on 2026-09-28 → recommend Blaze + budget alert.
- Emulator suites (rules) need `storage.googleapis.com` (sandbox) or a machine with Java 21.
- The GitHub PAT used in chat must be revoked.

**Also (this session):** outdated-browser notice — ES5 inline script in `apps/tenant/index.html` (before the module
bundle) checks color-mix, CSSPropertyRule (@property), crypto.randomUUID, IndexedDB; shows a PT/EN overlay with
"Continuar mesmo assim" (session dismiss). Supported floor: iOS/Safari 16.4+, Chrome 111+, Firefox 128+ (Tailwind v4).
Test: tests/outdated-browser-notice.test.ts runs the script against simulated browsers.

**Next:** optional mobile layout for the live total (bottom bar on phones; shrink main nav on scroll) — Owner has
not decided.
