# HANDOFF — read this second (after CLAUDE.md)

This file is overwritten every session, not appended to. It should take
under 30 seconds to read. It answers exactly one question: **what's the
very next thing to do, and is anything mid-flight right now?**

For full history, status of *all* modules, or "why" something was
decided — that's `docs/specs/README.md` and `docs/specs/NN-*.md`, not
here. This file is short-term memory only.

---

## Right now

**Status:** Smart Stock Entry ("Tirar Foto"/"Carregar Documento")
failure — investigated, root cause found and fixed, typechecked,
built, tested, pushed to `main`. **Nothing mid-flight; working tree
clean.**

**Root cause (confirmed, not guessed):** `server/smartStockEntry.ts`
and `server/productRecognitionSemanticMatch.ts` both read
`process.env.SMART_STOCK_ENTRY_AI_API_KEY` — but `.env.example` and
`README.md` (both local-dev and Railway production instructions)
documented setting `GEMINI_API_KEY` instead, a name **zero code paths
in this repo ever read** (confirmed via grep across all `.ts` files).
Anyone configuring a deployment by following this repo's own
documented instructions would set the wrong variable name. Every scan
attempt — camera or upload, identical code path via
`handleFileSelected` — would then hit
`callVisionExtractionProvider`'s `if (!apiKey) throw
ProviderNotConfiguredError`, caught in `server/index.ts` and returned
to the client as a graceful `{ success: false, reason:
'provider_unavailable' }`, with nothing in server logs pointing at
why. This matches the reported symptom exactly: failure on both
"Tirar Foto" and "Carregar Documento", every time.

**Also checked and ruled out** (documented here so it isn't
re-investigated from scratch next time): the model name
(`gemini-3.5-flash-lite`) is current/GA per Google's own docs as of
today; `createPartFromBase64`'s signature and the `nullable` JSON
Schema field are both still valid in the pinned `@google/genai@2.13.0`
SDK; the Express route's own larger `express.json({ limit: '12mb' })`
parser is still correctly registered before the app-wide default
parser (the exact ordering bug a prior session's comment already
documents fixing once — not regressed). One adjacent, non-blocking
observation: Gemini 3.x now silently *ignores* the `temperature: 0`
parameter this code sets (deprecated as of the 3.x model family, per
Google's current docs) rather than erroring on it — so the
determinism fix that parameter was added for is quietly no longer in
effect. Not the cause of today's failure and not touched this
session; worth a follow-up look if scan-consistency complaints
resurface.

**What shipped:**
- `.env.example` — corrected to document `SMART_STOCK_ENTRY_AI_API_KEY`.
- `README.md` — both references (local dev, Railway production) corrected to the same name.
- `server/index.ts` — one new non-blocking startup `console.warn` if `SMART_STOCK_ENTRY_AI_API_KEY` is unset, so this class of misconfiguration is visible in server logs immediately next time, instead of only discoverable per-request. No behavior change, no new failure mode, doesn't block startup.

**IMPORTANT — this alone does not fix production.** Correcting the
repo's docs only prevents the mistake for *future* setups. The live
Railway deployment's actual environment variable must be checked and
corrected too — if it currently has `GEMINI_API_KEY` set (per the
old, wrong docs) instead of `SMART_STOCK_ENTRY_AI_API_KEY`, scanning
will keep failing until that's added in Railway's dashboard. This
requires Railway access this session does not have — flagged clearly
to the Owner, not silently assumed fixed.

**Verification:** `npx tsc --noEmit -p .` and `npm run build` both
clean. All Smart Stock Entry (3 files) and Product Recognition
semantic-match (2 files) tests pass.

**Still open from the prior session, unrelated to this fix:** the
`periodic-contagem-concept-b-compaction.test.ts` InfoHint-vs-test
conflict (2 failing tests, already on `main` since commit `8bb980d`)
still needs the Owner's decision — revert those two banners to
always-visible, or update the test. Not touched this session either;
this Smart Stock Entry investigation took priority per explicit
instruction to stop and investigate it first.
