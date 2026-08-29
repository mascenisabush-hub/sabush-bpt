Implementation Plan

# Implementation Plan — Smart Stock Entry Client-Side Image Preprocessing Reliability Fix

**Type:** Governance bridge document — translates a **READY** Rule 8
Assessment into a concrete, file-by-file, dependency-ordered
engineering execution plan, ready for a future, separate
Implementation Authorization to review. Does not itself authorize
implementation and does not modify code.

**Status:** **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION
AUTHORIZATION (29 August 2026).** See "Product Architect Acceptance,"
at the end of this document, for the complete signed decision. This
acceptance authorizes the Plan itself as the correct translation of
the READY Rule 8 Assessment into engineering scope — it does **not**
authorize implementation. A separate, distinct, signed **Implementation
Authorization** remains required before any application code, test, or
configuration file is written. Not created here; not authorized by
this acceptance alone.

**Governing chain:**
[BDR-0008](../specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md)
→ [Smart Stock Entry ADR](../architecture/10-smart-stock-entry-adr.md)
→ [Spec #4 Amendment](../specs/04-smart-stock-entry-amendment.md)
→ [Rule 8 Assessment](./smart-stock-entry-image-preprocessing-rule8-assessment.md)
(**READY**, amended §15) → **THIS Implementation Plan** → *(next: a
separate, explicit Product Architect acceptance, then a distinct,
signed Implementation Authorization — neither exists yet)*.

**Repository state verified fresh, this session:** `main`, commit
`ee1cb1c`, working tree clean (`git status --short` empty), confirmed
by `git fetch origin main` immediately before this Plan was drafted.

**This document does not:** modify `BDR-0008`, the Smart Stock Entry
ADR, spec amendment #4, the Governance Review Summary, or the Rule 8
Assessment. It does not modify any file under `apps/`, `server/`,
`tests/`, `firestore.rules`, `firestore.indexes.json`, or
`package.json`. It does not itself constitute Implementation
Authorization.

---

## 1. Governance State Verified Before Drafting

Confirmed this session, by direct read, not from memory of an earlier
turn:

| Document | Current status (as written) |
|---|---|
| [`BDR-0008`](../specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md) | "Drafted, awaiting Product Architect approval. Not yet approved." — unchanged since the Rule 8 Assessment. |
| [Smart Stock Entry ADR](../architecture/10-smart-stock-entry-adr.md) | "Drafted, awaiting Product Architect approval. Not yet approved." — unchanged. |
| [Spec #4 Amendment](../specs/04-smart-stock-entry-amendment.md) | "Drafted, awaiting Product Architect approval. Not yet approved." — unchanged. |
| [Governance Review Summary](../specs/smart-stock-entry-governance-review-summary.md) | "Governance direction ready for approval review. Not yet approved. Implementation not authorized." — unchanged. |
| [Rule 8 Assessment](./smart-stock-entry-image-preprocessing-rule8-assessment.md) | **READY** (§13, as amended by §15). |

**No contradiction found.** The same discrepancy the Rule 8 Assessment
itself already flagged (§2 of that document — the four upstream
documents' own status fields still read "not yet approved" despite
Smart Stock Entry Tier 1 being demonstrably live in the shipped code)
is unchanged and is not re-litigated here; this Plan treats the
Assessment's own resolution of that point as authoritative, per its
own instruction not to rely on memory where repository evidence is
available — the evidence was re-checked, not assumed.

## 2. Current Implementation Files Inspected, This Session

Re-read in full or by targeted search, not assumed from the Rule 8
Assessment's own text:

- `apps/tenant/src/components/AddStockView.tsx` — `handleFileSelected`
  (lines 1753–1798, confirmed unchanged at these line numbers since
  the Assessment); camera/upload entry points at lines 2461 and 2478,
  both calling the identical function.
- `apps/tenant/src/context/AppContext.tsx` — `scanPurchaseDocument`
  (lines 5689–5743); `SmartStockEntryFailureReason` union type (lines
  126–132: `'invalid_upload' | 'too_large' | 'unsupported_type' |
  'provider_unavailable' | 'unreadable' | 'network_error'`) —
  confirmed **six** existing reasons, not five as informally described
  earlier; `SmartStockEntryScanResult` (lines 134–136).
- `server/smartStockEntry.ts` — `MAX_IMAGE_BYTES = 8 * 1024 * 1024`
  (line 42), `validateExtractionUpload` (lines 92–121),
  `sniffImageMimeType` (lines 58–83) — confirmed unchanged.
- `server/index.ts` — `/api/smart-stock-entry/extract` route (lines
  229–332), its dedicated `smartStockEntryJsonParser = express.json({
  limit: '12mb' })` (line 227) registered before the app-wide parser —
  confirmed unchanged.
- `apps/tenant/src/i18n/locales/en.ts` (and `fr.ts`, `pt.ts`) —
  confirmed all **six** failure-reason strings already exist and are
  localized: `invalid_upload`, `too_large`, `unsupported_type`,
  `provider_unavailable`, `unreadable`, `network_error`
  (`en.ts:481–486`). No new key exists for any preprocessing-specific
  failure today.
- `package.json` — test runner convention confirmed: `tsx --test
  tests/<name>.test.ts` per suite, Node's built-in `node:test`, no
  `jsdom`/`happy-dom`/browser-DOM test environment present in
  `dependencies` or `devDependencies`. This is a material constraint
  on the Test Plan (§10 below) — `createImageBitmap`, `canvas`, and
  `Blob`/`ImageBitmap` decoding are **not available** in this
  repository's current automated test environment.
- `tests/smart-stock-entry.test.ts` — confirmed existing convention:
  pure-function tests against `server/smartStockEntry.ts`'s exported
  decision logic, plus one structural/source-inspection test (grepping
  `server/index.ts`'s route handler body for the absence of any
  Firestore write call). This Plan's own test approach (§10) follows
  the same two patterns.

No file outside this list was found to require inspection for this
Plan's scope.

## 3. Purpose

Make Smart Stock Entry receipt-photo processing more reliable on real
mobile devices by preprocessing the selected image **before** full
base64/JSON conversion, addressing the memory-amplification mechanism
the Rule 8 Assessment identified (§3, §6 of that document) as the
architecturally-supported (not device-log-proven) explanation for the
reported "memória insuficiente" symptom.

**Required pipeline order:**

```
Original File/Blob
  → decode/downscale
  → remove unnecessary image information
  → preserve information required for receipt extraction
  → re-encode to a bounded representation
  → THEN FileReader/base64
  → THEN JSON.stringify
  → THEN existing Smart Stock Entry request (scanPurchaseDocument, unchanged)
```

**Explicitly and permanently prohibited** (carried forward from Rule 8
Assessment §9A, restated here as the one ordering rule every design
choice below is checked against):

```
Original File
  → full-resolution FileReader/base64
  → JSON.stringify
  → attempt to resize afterward
```

This order is prohibited because it does not touch the memory-
amplification problem at all — the expensive full-resolution base64
materialization is exactly the step that must move to *after*
downscaling, not stay before it.

## 4. Product Architect Decision — Carried Forward, Not Re-Decided Here

This Plan does not re-open or re-argue the governing decision — it
implements it. Restated for traceability, exactly as recorded in the
Rule 8 Assessment (§9, §15):

**A. No normal original-size rejection.** No `if (file.size > X)
reject` gate exists as the standard path. A large original triggers
preprocessing, not refusal.

**B. Large/conservative initial representation.** The objective is
*"remove unnecessary image information while preserving the
information required for reliable receipt extraction,"* not maximum
compression. Receipt-text legibility has priority over minimizing
payload size.

**C. Numeric values are engineering parameters, not business rules.**
Selected below (§5), labeled **"INITIAL IMPLEMENTATION PARAMETERS —
SUBJECT TO REAL-WORLD VALIDATION,"** not claimed as empirically
proven, because no representative Sabush receipt-photo benchmark
corpus exists (Rule 8 Assessment §6, §7, §12).

**D. Server limit unchanged.** `MAX_IMAGE_BYTES = 8 * 1024 * 1024`
and the dedicated 12MB request parser (`server/index.ts:227`) are not
modified by this Plan and must not be modified by its implementation.

## 5. Initial Implementation Parameters — Subject to Real-World Validation

**These are conservative initial engineering choices, not proven
optima. No representative Sabush receipt-photo benchmark corpus
exists at the time of this Plan (Rule 8 Assessment §6, §7).** They are
selected reasoning from general, well-established properties of JPEG
compression, base64 encoding overhead, and typical phone-camera output
— not from any measurement against a real receipt photo.

| Parameter | Selected initial value | Reasoning |
|---|---|---|
| Maximum long-edge dimension | **2000px** | A typical modern phone photographs a receipt at 3000–4000px on the long edge. 2000px is roughly half that — large enough that a receipt filling most of the frame still renders small print (a 6–8pt price column) at a pixel density well above what OCR/vision extraction typically needs, while cutting total pixel count (and therefore raw decode memory and base64 payload) to roughly a quarter of a typical 4000px-long-edge original. This is deliberately **not** an aggressive target (e.g. 1024px, common for thumbnail-grade web images) — it favors the "large/conservative" instruction (§4B) over minimizing size. |
| Output format | **JPEG** (`image/jpeg`) | Universally supported by `canvas.toBlob()` across every target environment named in the Rule 8 Assessment (modern desktop/mobile browsers, Android WebView) — confirmed as the safer default in the Assessment's own browser-support analysis (§6). WebP `toBlob` encoding support is less uniform on older WebView builds, per that same analysis. Not frozen as permanent — an implementation consideration, tunable per §7 below. |
| JPEG quality | **0.85** (on the `canvas.toBlob` `0.0`–`1.0` scale) | A moderate-to-high quality setting. JPEG's own compression curve is such that quality above roughly 0.9 yields diminishing file-size reduction for a large increase in bytes, while quality meaningfully below ~0.7 begins visibly degrading thin lines and small text — exactly the receipt content (decimal points, thin digit strokes) the Rule 8 Assessment (§7) named as most vulnerable. 0.85 sits deliberately on the conservative/high side of that curve, prioritizing legibility over the marginal size reduction a lower value would buy. |
| "Already small" bypass threshold | Skip re-encoding only when the source image's **longest edge is already ≤ 2000px AND its original file size is already ≤ 2MB** | Both conditions must hold — dimension alone is not sufficient, since a small-dimension image can still carry a large byte size from an unusual encoding; byte size alone is not sufficient, since a small-byte-size image can still exceed the target dimension (e.g. a highly compressed but very high-resolution photo). Requiring both avoids the failure mode §8 (Rule 8 Assessment §15 item 4 / this Plan §8) warns against: an oversized-in-either-dimension image slipping past the optimization and reaching `FileReader`/base64 unprocessed. |
| Byte-size guard on the preprocessed output | **Soft target: keep the re-encoded Blob comfortably under 4MB** (roughly half the server's 8MB *decoded* ceiling, itself measured on decoded bytes, not the same measurement as the client-side JPEG Blob size — see note below) | Not a hard gate. If a preprocessed output happens to exceed this soft target despite the 2000px/0.85 settings (an edge case — an unusually complex, high-detail receipt image), no automatic second compression pass or rejection is added by this Plan (a two-pass retry loop is explicitly out of scope — §9). The output still proceeds to the existing server-side `validateExtractionUpload` check, which remains the authoritative, unchanged gate (§4D). This target exists only to catch a grossly mis-behaving preprocessing result during manual/device QA (§13), not as enforced application logic. |

**Note on units:** the server's `MAX_IMAGE_BYTES` (8MB) is measured on
**decoded** bytes (`Buffer.from(base64, 'base64').length` in
`server/smartStockEntry.ts:111`), not on the JPEG-encoded Blob size a
client-side `canvas.toBlob()` call produces. A JPEG-encoded Blob at
2000px/0.85 quality is typically in the low hundreds of KB to low
single-digit MB for a receipt-type image (mostly white background,
moderate detail) — comfortably under both the 4MB soft target above
and the 8MB server ceiling, with wide headroom. This Plan does not
claim a precise figure, consistent with §4C.

**Adjustability, restated:** every value in this table may be tuned
after implementation, based on real-world evidence (receipt text
needing more resolution, memory usage remaining excessive, network
payloads being unnecessarily large, or a different format/quality
performing better) — without reopening BDR-0008, the ADR, or spec
amendment #4 — per §7 below.

## 6. Technical Mechanism

**Primary path:**

```ts
const bitmap = await createImageBitmap(file, {
  resizeWidth: targetWidth,     // computed from the 2000px long-edge cap,
  resizeHeight: targetHeight,   // preserving aspect ratio — see §8
  resizeQuality: 'high',
  imageOrientation: 'from-image',
});
const canvas = new OffscreenCanvas(bitmap.width, bitmap.height) /* or
  document.createElement('canvas') if OffscreenCanvas is unavailable */;
const ctx = canvas.getContext('2d');
ctx.drawImage(bitmap, 0, 0);
const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  /* or canvas.toBlob(...) for the non-Offscreen path */;
```

**Explicitly documented, per the Rule 8 Assessment's own caution (§6)
that this must not be assumed universally safe:**

- **API availability.** `createImageBitmap` itself has broad modern
  support (Chrome, Firefox, Safari, Chromium-based WebView). The
  **`resizeWidth`/`resizeHeight`/`resizeQuality` options object**
  specifically is the less reliable half — some engines silently
  ignore the resize hint and return the bitmap at original
  dimensions. **This implementation must not depend on the resize
  hint alone** — the subsequent `canvas.drawImage`/`toBlob` step
  performs the actual downscaling regardless of whether the hint was
  honored, by drawing the (possibly still-original-size) bitmap onto
  a canvas sized to the target dimensions.
- **Browser/WebView implementation differences.** Low-end/older
  Android WebView builds are the least predictable of the three named
  target environments (modern desktop browser, modern mobile browser,
  Android WebView) — flagged as requiring real-device verification
  (§13), not assumed safe from desktop testing.
- **Native decoder memory limitations.** Decoding the *original* image
  — before any resize logic runs — still requires the browser/OS to
  allocate memory proportional to the original's pixel count. An
  extreme-resolution original can exhaust available memory during this
  initial decode, before this implementation's own code has a chance
  to act. This is the same unavoidable technical boundary the Rule 8
  Assessment names (§6, §9) — this Plan does not claim to eliminate it,
  only to reduce the amplification that happens *after* a successful
  decode (the base64/JSON stage).
- **EXIF orientation.** `imageOrientation: 'from-image'` is required
  on the `createImageBitmap` call so the decoded bitmap already
  reflects the photo's intended orientation (phones commonly store
  orientation as EXIF metadata rather than physically rotating pixel
  data). Since `createImageBitmap` is used as the primary decode path
  in all cases (not only when its resize hint is honored), this option
  is always in effect — there is no separate orientation step needed
  for the canvas re-encode.
- **Fallback behavior — no `<img>`+canvas fallback in this Plan.**
  Investigated and explicitly **not adopted**: an `<img src=
  URL.createObjectURL(file)>` + canvas fallback for browsers lacking
  `createImageBitmap` is a plausible alternative, but it introduces its
  own EXIF-orientation handling burden (a plain `<img>` element does
  **not** apply `imageOrientation: 'from-image'`-equivalent correction
  automatically in every browser, so a naive fallback risks silently
  shipping rotated receipts — exactly the correctness regression §10
  in the Rule 8 Assessment's Failure Modes section warns against). Per
  §9 below, this Plan resolves that risk by **not** building a second
  code path at all: where `createImageBitmap` is unavailable or
  throws, the implementation routes directly into the existing
  graceful Smart Stock Entry failure/manual-entry behavior (§8, §9),
  never into an untested orientation-risky fallback.
- **Supported formats.** JPEG, PNG, WebP — matching the server's own
  `SUPPORTED_IMAGE_MIME_TYPES` (`server/smartStockEntry.ts:35`) and
  Tier 1's existing scope. `createImageBitmap` accepts all three as
  input on every target environment. Output is always JPEG (§5) —
  the *input* format does not determine the *output* format.
- **Corrupt/unsupported images.** `createImageBitmap` rejects its
  returned promise for a corrupt or unrecognized image. Handled per
  §9's failure table.
- **Preprocessing failure / decode failure.** Any exception at any
  stage of `createImageBitmap` → `drawImage` → `toBlob`/`convertToBlob`
  is caught and routed to the existing graceful fallback (§9) — never
  an unhandled exception reaching the user, never a new business-
  failure category.

## 7. Parameter Tuning Boundary

The following are **implementation parameters, not business rules**:
long-edge dimension, quality, output encoding format, and the
"already small" optimization threshold (all of §5).

They may be tuned after implementation, based on real-world evidence,
**without reopening governance** (no BDR/ADR/spec amendment required),
**provided the implementation continues to obey all seven** of the
following:

1. No normal rejection solely because the original image is large.
2. Preprocessing occurs before full base64 conversion.
3. Information required for receipt extraction is preserved.
4. The existing Smart Stock Entry advisory/human-confirmation
   boundary (BDR-0008) is unchanged.
5. Existing server-side validation is unchanged.
6. No new business capability is introduced.
7. No unrelated data/business-rule change is introduced.

A tuning change that violates any one of these seven is no longer
routine parameter tuning and must return to a fresh governance review
at the appropriate stage — this boundary exists specifically so that
adjusting a pixel dimension or a quality number does not, by itself,
require rewriting BDR-0008, the ADR, or spec amendment #4 each time.

## 8. Original File Size — Explicit Prohibition

**This Plan does not implement `if (file.size > X) reject` as the
normal solution, anywhere.** The core behavior is: large original →
attempt preprocessing, not large original → refuse.

**On an early guard for pathological/corrupt inputs:** investigated
and **not included as a distinct code path in this Plan.** A
dedicated "reject absurdly-sized files before attempting to decode
them at all" guard was considered (e.g., for a multi-hundred-megabyte
file that is almost certainly not a legitimate receipt photo), but
this Plan does not add one, because:
- `createImageBitmap`'s own promise rejection on a decode failure
  already provides a natural, existing failure path (§6, §9) — a
  pathological input either decodes (and is then downscaled normally)
  or fails to decode (and routes into the same graceful fallback every
  other decode failure uses).
- Adding a separate byte-size pre-check specifically for this case
  risks recreating exactly the "normal size rejection" mechanism §4A
  prohibits, if its threshold is ever set low enough to catch a
  legitimate (if unusually large) phone photo.
- If real-world evidence later shows this omission causes a genuine
  problem (e.g., the browser hangs rather than rejecting cleanly on
  some pathological input), that is a concrete finding for the
  Parameter Tuning Boundary (§7) or, if it requires new logic beyond a
  parameter change, a future governance review — not something this
  Plan pre-solves speculatively without evidence.

**On genuine native-decoder failure:** if the browser's own decoder
cannot decode an extreme-resolution image at all, that is the
unavoidable technical boundary the Rule 8 Assessment already documents
(§6, §9). It routes into the existing graceful Smart Stock Entry/
manual-entry fallback (§9 below) and is never reported to the user as
an intentional rejection.

## 9. Already-Small Images

Per §5's table: an image bypasses re-encoding only when **both** its
longest edge is already ≤ 2000px **and** its original file size is
already ≤ 2MB. Both conditions are checked before any decode is
attempted (dimensions require a lightweight decode step regardless —
see implementation note below — but the byte-size check can happen
first, from `File.size`, with zero decode cost).

**Guard against reintroducing the original problem:** the
already-small bypass only ever *skips re-encoding of an image already
known to be small on both axes* — it never skips the *decision* of
whether preprocessing is needed. A file that is small in bytes but
large in dimensions (or vice versa) still goes through the full
`createImageBitmap` → downscale → re-encode path. This directly
implements the requirement in §5's table note and the Rule 8
Assessment §15 item 4.

**Implementation note:** determining actual pixel dimensions requires
at least a partial decode (`createImageBitmap` without resize options,
or reading `naturalWidth`/`naturalHeight` after decode) — there is no
way to read an image's pixel dimensions from `File.size` alone. The
practical shape of this bypass is therefore: decode once via
`createImageBitmap(file, { imageOrientation: 'from-image' })` (no
resize options yet), inspect the resulting bitmap's dimensions and the
original `File.size`, and only proceed to the canvas re-encode step if
either the dimension or the byte-size threshold is exceeded. **The
already-small case discards that dimension-check bitmap and returns
the original `File` object completely unmodified** — not
"re-oriented," since no canvas draw occurs for this path and the
original file's bytes (EXIF tag included, exactly as captured) are
what is actually sent onward. This is identical to today's current,
already-shipped behavior for every image (§3): no orientation problem
has been reported for it, so the bypass path introduces no regression
by leaving it untouched. Orientation *correction* (§6's
`imageOrientation: 'from-image'` actually being applied to what is
sent) only happens on the re-encode path, for images that don't
qualify for this bypass. **Every path still calls `createImageBitmap`
once, for the dimension check, before any base64 conversion** — an
oversized image by either measure is never able to reach
`FileReader`/base64 unprocessed, satisfying the Rule 8 Acceptance
Condition this optimization must not violate (Rule 8 Assessment §11,
item 2).

## 10. Camera + Upload — Shared Path

Both entry points already converge on the single `handleFileSelected`
function (`AddStockView.tsx:1753`, confirmed §2). This Plan's
preprocessing step is inserted as a single new call at the start of
`handleFileSelected`, before the existing `FileReader.readAsDataURL`
call — **not** duplicated per input method, and **not** implemented as
two separate utilities. No second implementation is created.

## 11. Failure Handling

All twelve scenarios, each mapped to an existing Smart Stock Entry
failure state — no new business-facing failure category is introduced
anywhere in this table:

| # | Scenario | Behavior |
|---|---|---|
| 1 | Successful preprocessing | Preprocessed Blob proceeds into the existing `FileReader.readAsDataURL` → base64 → `scanPurchaseDocument` path, unchanged from that point forward. |
| 2 | Already-small image | Original file, completely unmodified (per §9's correction — not re-oriented, since no canvas draw occurs on this path), proceeds into the same existing path — no re-encode performed. |
| 3 | `createImageBitmap` unavailable (API does not exist) | Routes to existing graceful fallback — client-side, treated identically to scenario 4 below (both surface as `unreadable`, matching the "we couldn't read this document reliably" existing string, `en.ts:485`). |
| 4 | `createImageBitmap` throws/rejects (decode failure) | Same as scenario 3 — `unreadable`. |
| 5 | Native decode failure (device memory boundary) | Same as scenario 3/4 — indistinguishable from the application's point of view from any other decode failure; still `unreadable`, never reported as an intentional size rejection (§8). |
| 6 | Canvas creation/context failure | Same as scenario 3/4 — `unreadable`. |
| 7 | `toBlob`/`convertToBlob` failure | Same as scenario 3/4 — `unreadable`. |
| 8 | Unsupported format at decode time | Same as scenario 3/4 — `unreadable` (the server's own `unsupported_type` reason remains for the case where a client-side check is bypassed entirely and an unsupported file reaches the server unprocessed — see scenario 12). |
| 9 | Corrupt image | Same as scenario 3/4 — `unreadable`. |
| 10 | Output unexpectedly exceeds intended bounds | Not blocked client-side (§5's soft 4MB target is not an enforced gate) — proceeds to the existing server-side `validateExtractionUpload`, which applies its own unchanged `too_large` check if the *decoded* size still exceeds 8MB (an expected-rare edge case given §5's headroom estimate). |
| 11 | Network failure after preprocessing | Unchanged — existing `network_error` handling in `scanPurchaseDocument` (`AppContext.tsx:5718–5720`) is untouched by this Plan. |
| 12 | Provider failure after preprocessing | Unchanged — existing `provider_unavailable` handling (`server/index.ts:296–310`) is untouched by this Plan. |

**Single new client-side failure reason used:** `unreadable` — already
exists in `SmartStockEntryFailureReason` (`AppContext.tsx:131`) and is
already localized in all three locales (`en.ts:485`, and the
equivalent `fr.ts`/`pt.ts` entries). **No new value is added to
`SmartStockEntryFailureReason`, and no new i18n key is required** —
confirmed against §2's inventory. If, during implementation, a
scenario is found where `unreadable` genuinely does not fit (not
anticipated by this Plan), that is a scope finding to report back, not
a reason to silently add a new failure category.

## 12. File Scope

**In scope, justified individually:**

| File | Why |
|---|---|
| `apps/tenant/src/components/AddStockView.tsx` | `handleFileSelected` gains one new call at its start (the preprocessing step) before the existing `FileReader.readAsDataURL` line — the single shared entry point for both camera and upload (§10). |
| A new file, e.g. `apps/tenant/src/utils/smartStockEntryImagePreprocessing.ts` | Houses the `createImageBitmap`/canvas/`toBlob` logic (§6) and the dimension/byte-size decision logic (§9) as a small, focused, independently-reasoned-about module — following this repository's own established pattern of isolating decision logic into its own file (e.g. `server/smartStockEntry.ts`'s own separation of pure logic from the route handler). |
| `tests/smart-stock-entry-image-preprocessing.test.ts` (new) | Tests for the new utility's pure/testable logic (§13). |
| `tests/smart-stock-entry.test.ts` (existing, touched only if needed) | Only if the existing structural test's "next sibling" boundary marker (`serverIndexSrc.indexOf("expressApp.use(express.json());", start)`, `smart-stock-entry.test.ts:53`) needs re-verification against `server/index.ts` — expected **not** to need changes, since this Plan does not touch `server/index.ts` at all (see exclusions below). Listed here only to be explicit that it was considered. |
| `package.json` | One new line, adding a `test:smart-stock-entry-image-preprocessing` script and its corresponding entry in `test:all`, following the exact existing convention (§2) — no dependency added, since `createImageBitmap`/canvas are native browser APIs requiring no npm package. |
| Localization files | **Not touched** — §11 confirms no new i18n key is required. Listed here only to record that this was explicitly checked, not overlooked. |

**Explicitly excluded, confirmed untouched by this Plan:**

- `server/smartStockEntry.ts`
- `server/index.ts`
- `AppContext.tsx`'s `scanPurchaseDocument` contract (its signature,
  its `SmartStockEntryFailureReason` union, and its call shape are all
  unchanged — `handleFileSelected` continues to call it exactly as
  today, just with a preprocessed `File`/`Blob` substituted for the
  original before the existing `FileReader` step)
- `firestore.rules`
- `firestore.indexes.json`
- Product Recognition Intelligence
- Product matching
- Stock Count
- Business Worth
- Supplier-wording memory
- `BDR-0008`
- Smart Stock Entry ADR
- Smart Stock Entry specification (spec #4 amendment)

**No file outside the anticipated list above was found, during this
session's investigation (§2), to be technically required.** If
implementation later discovers otherwise, that is a scope finding to
report back to the Product Architect, not something to resolve
silently.

## 13. Test Plan

**Constraint, confirmed §2:** this repository's test environment
(`node:test` via `tsx`, no jsdom/browser DOM) **cannot execute**
`createImageBitmap`, `canvas`, or `toBlob`/`convertToBlob` — these are
browser APIs, not available under plain Node.js. Per the originating
instruction, items requiring these APIs are identified as **manual/
browser/device QA**, not invented as automated coverage that would not
actually exercise the real browser behavior.

| # | Item | Coverage |
|---|---|---|
| A | Small JPEG | **Manual/device QA.** Verify the already-small bypass (§9) triggers correctly and the image reaches the server unmodified. |
| B | Large JPEG | **Manual/device QA.** Verify downscale-and-reencode triggers, output dimensions/format match §5, extraction still succeeds. |
| C | Large PNG | **Manual/device QA.** Same as B, PNG source, JPEG output (§6). |
| D | WebP | **Manual/device QA.** Same as B, WebP source. |
| E | Portrait image | **Manual/device QA.** Confirm aspect ratio is preserved when computing target width/height from the 2000px long-edge cap. |
| F | Landscape image | **Manual/device QA.** Same as E, landscape orientation. |
| G | EXIF orientation | **Manual/device QA.** A phone photo taken in a rotated physical orientation (EXIF-tagged, not pixel-rotated) must display correctly after preprocessing — this cannot be verified without a real EXIF-tagged photo and a real browser decode. |
| H | High-resolution image | **Manual/device QA**, specifically on a lower-memory Android device — the scenario most likely to reproduce the original reported symptom. |
| I | Corrupt image | **Automated (`tests/smart-stock-entry-image-preprocessing.test.ts`)** for the pure decision logic (e.g., a function that decides "attempt preprocessing" vs. "already-small bypass" given plain width/height/byte-size inputs, independent of whether the actual decode succeeds) — **plus manual/device QA** for the actual `createImageBitmap` rejection behavior on a genuinely corrupt file, which cannot be simulated in `node:test`. |
| J | Unsupported input | Same split as I — pure logic automated, actual browser decode behavior manual/device QA. |
| K | `createImageBitmap` failure | **Manual/device QA** (cannot be triggered in `node:test` without the API existing at all) — **plus an automated test** of the *fallback routing logic itself* (given a simulated/injected failure via a mockable seam in the new utility module, confirm the function returns the "use graceful fallback" signal rather than throwing an unhandled exception up to `handleFileSelected`). |
| L | canvas/toBlob failure | Same split as K. |
| M | Preprocessing output bounds | **Automated** — pure test of the target-dimension computation given various input width/height pairs against the 2000px cap (§5), confirming the long edge never exceeds 2000px and aspect ratio is preserved to within rounding. Does not test the actual encoded byte size (requires a real encode — manual/device QA). |
| N | No full-resolution base64 before preprocessing | **Automated, structural** — following the exact convention `tests/smart-stock-entry.test.ts` already uses for its Firestore-write-absence proof (§2): a source-inspection test on `AddStockView.tsx` confirming the new preprocessing call appears, in source order, before the existing `FileReader`/`readAsDataURL` call inside `handleFileSelected`. This is the single most important acceptance condition (Rule 8 Assessment §11 item 2) and is provable statically without a browser. |
| O | Camera and upload shared path | **Automated, structural** — confirms both call sites (`AddStockView.tsx:2461`, `:2478`) still invoke the identical `handleFileSelected` function, and that only one preprocessing call site exists in the file (no duplicate implementation). |
| P | Existing server validation unchanged | **Automated** — the existing `tests/smart-stock-entry.test.ts` suite already covers `validateExtractionUpload`/`MAX_IMAGE_BYTES`/`sniffImageMimeType`; this Plan's implementation must leave that suite passing unmodified, confirmed by re-running it, not by a new test. |
| Q | Graceful fallback | **Automated** for the routing logic (as in K/L) — confirms every failure path in §11's table resolves to the `unreadable` reason and never an unhandled exception — **plus manual/device QA** to confirm the actual user-facing UI (existing error banner, `AddStockView.tsx:2517–2522`) renders correctly when this path is hit for real. |
| R | Receipt-quality preservation strategy | **Not testable at all until real Sabush receipt photos exist** (§14) — explicitly not simulated or approximated by this Plan. |
| S | Already-small optimization | **Automated** — pure test of the bypass decision function (§9) against boundary values (exactly 2000px, exactly 2MB, one unit over/under each) confirming both conditions are required, not either alone. |
| T | No business/data-flow changes | **Automated, structural** — confirms `scanPurchaseDocument`'s call signature and the `SmartStockEntryFailureReason` union in `AppContext.tsx` are byte-for-byte unchanged (a source-diff-style check, matching this repository's existing "confirmed unchanged" pattern used elsewhere in this governance chain), and that no new Firestore read/write call is introduced anywhere in the new utility module. |

## 14. Real-World Validation (Deferred, Not Performed by This Plan)

**No benchmark results are fabricated anywhere in this Plan.** Because
no representative Sabush receipt-photo corpus exists today, the
following validation procedure is defined for **after** real photos
become available — it is a procedure, not a result:

1. For each of a representative set of real Sabush receipt/invoice
   photos, run extraction through **both** the existing (unprocessed)
   pipeline and the new preprocessed pipeline, and compare the
   extracted `product names`, `quantities` (including decimal
   quantities), `unit prices`, `totals`, `dates`, and `supplier names`
   field-by-field.
2. A field-level mismatch where the preprocessed pipeline is *worse*
   (a `detected` field becoming `review` or `not_found`, or a
   digit/decimal-point misread that the unprocessed pipeline did not
   make) is evidence the initial parameters (§5) are **too
   aggressive** and should be tuned toward a larger dimension/higher
   quality, per §7.
3. Device/memory-pressure behavior should be separately verified on,
   at minimum: a low-end Android device, a typical modern Android
   device, Android WebView specifically (since it is the least
   predictable environment per §6), and iPhone/iOS if the actual
   deployment target includes it.
4. The purpose of this procedure is explicitly **not** to establish a
   mathematically optimal parameter set — it is to detect whether
   §5's initial conservative choices are too aggressive (extraction
   degrades) or, less likely given how conservative they are, too weak
   (memory/network problems persist). Either finding feeds back into
   §7's tuning boundary, not a new governance cycle, unless it also
   violates one of §7's seven conditions.

## 15. Acceptance Criteria

Precise and testable, carried forward from and elaborating on Rule 8
Acceptance Conditions (Assessment §11):

- [ ] Both camera and upload are protected by the identical
      preprocessing path (§10; Test O).
- [ ] No full-resolution base64 conversion occurs before preprocessing,
      for any input (§3, §9; Test N).
- [ ] Preprocessed output is bounded to the §5 target dimension/format/
      quality (Test M).
- [ ] A large original image is normally accepted and preprocessed,
      never rejected solely for original file size (§8).
- [ ] Initial quality is conservative, per §5's stated reasoning, not
      aggressively compressed.
- [ ] Receipt information required for extraction is preserved to the
      extent achievable without a benchmark corpus (§5, §14 — full
      validation deferred).
- [ ] EXIF orientation is correct after preprocessing (§6; Test G,
      manual).
- [ ] Every failure scenario in §11's table degrades gracefully into
      the existing `unreadable` state — no unhandled exception, no new
      business-failure category (Test Q).
- [ ] Existing server-side validation (`MAX_IMAGE_BYTES`, magic-byte
      sniffing, the 12MB parser) is verified unchanged (Test P).
- [ ] No Smart Stock Entry business-rule change (Tier 1 scope, product-
      matching confidence rules, three-state field confidence model
      all unaffected) (Test T).
- [ ] No Firestore schema or data-model change of any kind.
- [ ] No Product Recognition Intelligence change.
- [ ] No change to BDR-0008's human-confirmation boundary — a
      preprocessed image still only ever produces a proposal, never an
      automatic write (Test T).
- [ ] All automated tests (§13's "Automated" rows) pass; the full
      existing `test:all` suite continues to pass unmodified.
- [ ] `npm run lint:tenant` (TypeScript typecheck for the affected
      `apps/tenant` scope) is clean.
- [ ] Real-device QA (§13's "Manual/device QA" rows, §14) is recorded
      once performed — not claimed in advance of being performed.

## 16. Governance / Authorization Boundary

**ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION AUTHORIZATION.**
*(Updated from DRAFTED — NOT ACCEPTED — NOT AUTHORIZED FOR
IMPLEMENTATION by the Product Architect Acceptance recorded below.)*

This Plan has been reviewed and explicitly accepted by the Product
Architect. A separate, distinct, signed Implementation Authorization
must still exist before any code in §12's file list may be written.
**No code may be written merely because this Plan is accepted.** No
implementation-authorization signature appears anywhere in this
document — only Plan-level acceptance, per the "Product Architect
Acceptance" section below.

---

## Product Architect Acceptance

**Status:** ✅ **ACCEPTED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE / SIGNATURE
>
> I accept the Implementation Plan for the Smart Stock Entry
> Client-Side Image Preprocessing Reliability Fix, including its full
> scope as defined in the Plan: the required preprocess-before-base64
> pipeline order (§3); the carried-forward governing direction (§4);
> the Initial Implementation Parameters (§5) — 2000px maximum long
> edge, JPEG output, quality 0.85, an already-small bypass requiring
> BOTH long edge ≤2000px AND original file ≤2MB, and an approximately
> 4MB soft output target that is explicitly not a hard client-side
> rejection limit; the technical mechanism (§6); the Parameter Tuning
> Boundary (§7); the explicit prohibition on original-file-size
> rejection (§8); the already-small image handling as corrected during
> final review (§9 — the bypass sends the original file completely
> unmodified, not "re-oriented"); the shared camera/upload path (§10);
> the failure-handling table (§11); the file scope and exclusions
> (§12); the test plan (§13); the deferred real-world validation
> procedure (§14); and the acceptance criteria (§15).
>
> The existing server-side `MAX_IMAGE_BYTES = 8MB` decoded limit and
> the 12MB request parser remain unchanged and authoritative, per §4D
> and §5's own note distinguishing the client-side soft target from
> the server's decoded-byte ceiling. Receipt legibility remains the
> controlling quality constraint, per §5 and §11 (Test R). The four
> numeric parameters in §5 remain tunable engineering parameters, not
> business rules, per §7's seven-condition boundary — future tuning
> does not require reopening BDR-0008, the Smart Stock Entry ADR, or
> spec amendment #4, provided those seven conditions continue to hold.
>
> This acceptance confirms no upstream governance artifact (BDR-0008,
> the ADR, spec amendment #4, the Governance Review Summary, or the
> READY Rule 8 Assessment) requires amendment as a result of this Plan.
>
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED
> Date: 29 August 2026

This acceptance takes effect immediately on the Plan document itself:
the engineering design, initial parameter selections, technical
mechanism, failure-handling table, file scope, test plan, and
acceptance criteria recorded in §§1–15 above are now the authoritative
Plan.

**This acceptance does not authorize implementation.** It accepts the
Plan as the correct translation of the READY Rule 8 Assessment into
engineering scope — it is not itself the separate, signed
**Implementation Authorization** §16 still requires, and no
application code, test, dependency, or configuration file may be
changed on the strength of this acceptance alone.

---

**Implementation Plan drafted → ACCEPTED.**
**Implementation Authorization still required, and not yet drafted.**
**No application code, test, or configuration file may be changed
until a separate, signed Implementation Authorization exists.**

---

## Governance Notes

- This document does not implement code, modify runtime behavior, or
  edit any `src/`, `apps/`, `server/`, `firestore.rules`,
  `firestore.indexes.json`, `package.json`, or test file. None were
  touched to produce it.
- This document does not modify `BDR-0008`, the Smart Stock Entry ADR,
  spec amendment #4, the Governance Review Summary, or the Rule 8
  Assessment — confirmed unchanged, this session (§1).
- This document does not create, and should not be treated as, an
  Implementation Authorization, even after Product Architect
  acceptance (see "Product Architect Acceptance" section above).
- This document selects initial numeric parameters (§5) exactly as
  instructed, explicitly labeled as unproven initial values, not
  empirically optimal ones — no benchmark result is fabricated
  anywhere in this document (§5, §14).

**Lifecycle:** Assessed (Rule 8) → Plan drafted → **Plan Accepted**
(this document, 29 August 2026). Not Authorized (for implementation),
not Implemented, not Verified, not Closed — no engineering work is
authorized by this record.
