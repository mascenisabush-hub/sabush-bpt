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

**Also (this session): Contagem valuation — price unit ≠ counted unit.** A deliberate price keeps its own
`sellingPriceBasisUnit` when the counted unit changes (Rule 2); values were quantity × price regardless (5 Un @ 480/Cx
= 2,400 instead of 100). Now one rule everywhere — `resolveSellingPricePerCountedUnit` (utils/stockCount.ts) converts
via the product's unit relationship; unconvertible → not valued ("Rever preço"), validation and "Rever e Confirmar"
blocked with the product named. `tallyStockCountRows(rows, costBasis, relationshipFor)`; tally item `sellingValue` is
passed to `recordStockCount` and used as-is by `normalizeStockCountItems` (snapshot = what the operator saw). Group
list uses entry `sellingValue`. Review screen lists "Não contados" names (5 inline + "Ver todos").
Test: tests/contagem-valuation-price-unit.test.ts.

**Also (this session): "Validar" = counts + saves (Owner decision).** Live total = validated rows only
(`onlyValidatedCounts`). Typing on catalog:/manual: rows arms NO server timer (local recovery snapshot still written
first; leave/hide flush unchanged); Validar saves immediately; a failed Validar sends a not-yet-counted safety copy
(`saveUnvalidatedSafetyCopy`). "Produtos por validar" panel (`pendingValidationEntries`, reason = the Validar checks)
+ amber reminder in the sticky bar; "Rever e Confirmar" blocked while any remain, naming them. Reopened (Editar)
products leave the total until re-validated. Test: tests/contagem-validar-counts-and-saves.test.ts.

**Also (this session): Contagem layout (Owner-requested).** Left = editing space only (`editingSpaceOpen`): a
blank entry (`entryPickerQuery` search over `productDisplayGroups` → `activateProductGroup`, or
`handleAddNewProductWithName`) or the open product; header ✕ = `handleCloseEditingSpace` (blank → close space; NEW
product → delete after one confirm, `suppressRemoveConfirmRef`; existing → Voltar). After Validar the blank entry
refocuses. Right = started products only (`isGroupStarted`), "por validar" first then latest `entrySequence` desc,
each unvalidated product shows its Validar reason; no sort selector (validatedSortMode still drives review/PDF).
Closed space → list `max-w-3xl mx-auto` + "Contar produto". The left "Produtos por validar" panel was removed (now
inside the list). Test: tests/contagem-editing-space-layout.test.ts.

**Also (this session): empty catalog ⇒ no "existing or new?" question.** `isConfirmedNewProductName(name)` =
`products.length === 0 || manualIdentityConfirmedNew.has(key)` drives the resolution panel, the NewProductInfoPanel,
the confirm gate and `confirmedNewProduct` on saved items (recordStockCount already skipped the check for an empty
catalog). Test: tests/contagem-empty-catalog-no-identity-question.test.ts.

**Also (this session): Business Data Reset ("Repor dados").** Settings → always visible to Owner/Admin →
BusinessDataResetModal (set password if none — never deletes; choose Tudo or areas; password + type APAGAR).
Server-only: POST /api/business/data-reset → verifyOwnerOnlyAction → checkClearDataPassword (shared with /verify, same
lockout) → executeBusinessDataReset (server/businessDataReset.ts: area→collections map, catalog⇒stock⇒worth,
NEVER_DELETED staff/payments/private/support*, recursiveDelete, clears business.currentWorth) → platform_audit_log
`business.data_reset`. Client clearAllData removed. **Decision 57 (keep finalized Contagem history on clear-all) is
superseded by the Owner's explicit instruction** for Tudo/Stock; clients still cannot delete stockCounts (rules).
Test: tests/business-data-reset.test.ts (incl. "every rules collection is classified").

**Next:** optional mobile layout for the live total (bottom bar on phones; shrink main nav on scroll) — Owner has
not decided.
