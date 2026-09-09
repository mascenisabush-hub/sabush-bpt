# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Smart Stock Entry crash investigation — **AI pipeline
cleared, root crash cause NOT found, pivoted to a diagnosability fix**
— typechecked, built, pushed to `main`. **Nothing mid-flight; working
tree clean.**

**What actually happened:** the reported "failure during Tirar
Foto/Carregar Documento" was NOT the graceful Smart Stock Entry
failure banner this file's previous session investigated
(`SMART_STOCK_ENTRY_AI_API_KEY` docs mismatch, already fixed, commit
`1972d51`) — it was the app's generic `ErrorBoundary` crash screen
("Algo correu mal"), meaning a full React render-tree crash, not a
graceful in-feature failure.

**Verified live, via the Owner's own Railway console (not guessed):**
- `SMART_STOCK_ENTRY_AI_API_KEY` IS correctly set in production.
- A raw `GET .../models/gemini-3.5-flash-lite?key=...` call succeeds.
- A full `generateContent` call with the exact schema/config/temperature this code uses succeeds (text-only).
- The exact SDK call this code makes — `GoogleGenAI` + `createPartFromBase64` with a real image, same schema/config — **succeeds end-to-end**, returning a correct extraction.

**So the entire AI pipeline is confirmed working in production.** The
crash is somewhere else — most likely in `AddStockView.tsx`'s render
of a scanned row (`buildRowFromProposalLineItem` / the AI-specific
status-badge rendering / the mobile card layout), but static reading
of those paths (including the server's `parseProviderExtractionResponse`,
which does guarantee every `FieldState` object always exists, never
undefined) didn't surface an obvious unguarded property access either.

**Why this wasn't resolved further this session:** the crash happened
on a real client's phone, reported secondhand — no direct DevTools
access, and deliberately NOT pursued further via the client (Owner's
explicit call: inconveniencing a new customer to get a browser
console screenshot isn't acceptable). The one channel that should have
caught this automatically — `reportClientError` → `POST
/api/client-error` → Railway logs — **produced zero log entries**,
confirmed by searching Railway's Deploy Logs for `client-error`. That
gap is real and is what got fixed this session instead.

**What shipped (a diagnosability fix, not the crash fix itself):**
- `ErrorBoundary.tsx` — the crash screen now shows the actual error message + stack trace inline, in a collapsed "Detalhes técnicos" section with a copy button. Anyone who hits this screen — including a client — can now screenshot or copy the real error without DevTools or server access.
- `reportClientError.ts` — now fires BOTH `sendBeacon` and a `keepalive` fetch (previously either/or), since `sendBeacon`'s return value only confirms queuing, not delivery, and it has known silent-failure gaps on some mobile browsers. Worst case: one harmless duplicate log line. Given a real report already went missing once, this is cheap insurance.

**Verification:** `npx tsc --noEmit -p .` and `npm run build` both
clean. Not tested against a live crash (nothing to reproduce it with
in this sandbox) — this is a genuinely untested-in-anger fix, flagged
as such.

**Next likely step:** if/when this crash recurs, the next report
(even from a client, even secondhand) should come with a screenshot of
the "Detalhes técnicos" section already attached — that will very
likely resolve this in one step instead of the multi-turn live
diagnostic session this one required. Once that text is available,
resume investigating the render path it names.

**Still open from before this interrupt, untouched this session:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, on `main` since commit `8bb980d`) still
needs the Owner's decision.
