# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Smart Stock Entry crash — added an in-app-browser warning
(WhatsApp confirmed as the sharing channel) — typechecked, built,
tested, pushed to `main`. **Still not the confirmed root cause** —
this is a mitigation based on strong circumstantial evidence, not a
fix for a diagnosed bug. **Nothing mid-flight; working tree clean.**

**New lead, from the Owner directly:** the link that crashed was
shared via WhatsApp. Researched live: WKWebView (the engine WhatsApp's
— and Messenger's/Instagram's/Facebook's/Line's/TikTok's — in-app
browser runs on, on iOS) has multiple documented, version-specific
bugs and outright crashes specifically when a page's `<input
type="file" capture>` tries to trigger the native camera — an
OS/host-app-level failure, not a JS exception this codebase's error
handling can catch. This is the most likely explanation for the
crash, but — important — it is NOT confirmed. No stack trace was ever
obtained (the crash-report gap fixed two commits ago exists precisely
because of this).

**What shipped (a mitigation, not a confirmed fix):**
- `apps/tenant/src/lib/inAppBrowserDetection.ts` (new) — pure,
  independently tested UA-marker matching for WhatsApp/Facebook/
  Instagram/Line/WeChat/TikTok. Deliberately conservative — a false
  positive (warning a real-browser user) is worse than a missed
  detection, so this only matches specific, documented markers. Notes
  its own known gap: iOS WhatsApp doesn't reliably self-identify in
  its UA, so this under-detects that exact case rather than
  over-detecting.
- `AddStockView.tsx` — shows a small amber warning next to the Smart
  Stock Entry buttons when an in-app browser is detected, recommending
  the person open the link in their real browser (Chrome/Safari)
  instead, or use "Carregar Documento" with an already-taken photo as
  a workaround. **Never disables or hides the camera/upload buttons**
  — some in-app browser/OS combinations do work fine; this is
  informational only.
- `tests/in-app-browser-detection.test.ts` (new, 6 tests, all pass).

**Verification:** `npx tsc --noEmit -p .` and `npm run build` both
clean. All 12 Add Stock test files + the new detection test file pass.
Not tested against a real WhatsApp in-app browser (no such device in
this sandbox) — the warning's *trigger condition* is verified (UA
matching), but whether the underlying camera-crash theory is even
correct is still unconfirmed.

**Next likely step — the actual root cause is still open.** If the
crash recurs even with this warning shown (i.e. the person saw the
warning, tried a real browser instead, and it still crashed), that
would rule out the WhatsApp/WKWebView theory entirely and point back
to something in `AddStockView.tsx`'s own render path for scanned rows,
worth a fresh look at `buildRowFromProposalLineItem` and the AI-status-
badge rendering. If it doesn't recur, this mitigation was likely
sufficient even without ever confirming the exact mechanism.

**Still open from before this interrupt, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, on `main` since commit `8bb980d`) still
needs the Owner's decision.
