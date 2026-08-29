Decision Record

# Smart Stock Entry — Client-Side Image Preprocessing Reliability Fix — Rule 8 Assessment

**Status:** Read-only assessment, amended once (§15) to record a
Product Architect parameter-selection decision. **Not an
Implementation Plan. Not an Implementation Authorization. Does not
authorize coding.**
**Lifecycle state:** Designed → **Assessed** (this document; verdict
updated by §15's amendment — see §13). Per
`platform-engineering-governance-standard.md` §3, "Assessed" is a
readiness opinion, not a go-ahead — the transition to Authorized
requires a separate, explicit Product Architect decision and a
distinct Implementation Plan/Authorization document.
**Baseline verified fresh, this session (amendment):** `main`, commit
`2aef7d0`, working tree clean (`git status --short` empty), confirmed
immediately before this amendment began. Original Assessment baseline
(unchanged): `main`, commit `b5de365`.
**Governance classification:** Category 2 engineering work (see
§10). Enters the governance pipeline directly at Rule 8 Assessment,
per the Addendum to
[`19-governance-bdr-policy-framework.md`](../specs/19-governance-bdr-policy-framework.md)
("Scope Boundary: Standards-Conformance Corrections") — no new BDR
or Policy is created or required by this document.
**Does not modify:** `BDR-0008`, the Smart Stock Entry ADR, spec
amendment #4, or the Smart Stock Entry Governance Review Summary.
All four confirmed byte-for-byte unchanged as of this document (§2).

---

## 1. Status / Purpose / Baseline

This Assessment evaluates a proposed client-side image-preprocessing
fix for Smart Stock Entry's document-scan path (camera and file
upload). It exists to determine whether the mechanism described in
§6–§9 is implementation-ready, and under what conditions.

**Reported symptom (Product Architect, this session — not verified
against device logs or crash traces, and not otherwise recorded
anywhere in this repository):** a native/device-level "memória
insuficiente" ("insufficient memory") failure affecting both camera
capture and file upload. No device log, stack trace, or crash report
exists in this repository to corroborate the exact failure point.
This Assessment therefore treats the memory-pressure explanation in
§7 as a **strongly supported architectural explanation**, not a
proven root cause, and says so explicitly rather than overstating
certainty.

This document does **not** open a new BDR. Per §10 below, no new
business capability, business rule, or strategic question is being
answered — the governed behavior (advisory-only AI extraction,
human-confirmed) is unchanged; this is an engineering reliability fix
to how a photo reaches that already-governed pipeline.

## 2. Governance Artifacts Inspected

All four re-read in full, this session, against the current
repository state (not assumed from any earlier conversation):

| Artifact | Current recorded status (as written in the file) | Relevant to this Assessment |
|---|---|---|
| [`BDR-0008`](../specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md) | "Drafted, awaiting Product Architect approval. Not yet approved." | The advisory-only / human-confirmation boundary (§3, §4) this Assessment does not touch. |
| [Smart Stock Entry ADR](../architecture/10-smart-stock-entry-adr.md) | "Drafted, awaiting Product Architect approval. Not yet approved." | Decision 2/2a/2b (pipeline shape, privileged-server-only), Decision 3 (server-side validation controls) this Assessment does not touch. |
| [Spec #4 Amendment](../specs/04-smart-stock-entry-amendment.md) | "Drafted, awaiting Product Architect approval. Not yet approved." | Tier 1 MVP document scope, which this Assessment does not touch or expand. |
| [Governance Review Summary](../specs/smart-stock-entry-governance-review-summary.md) | "Governance direction ready for approval review. Not yet approved. Implementation not authorized." | Consolidates the above three; not touched. |

**Discrepancy noted, not resolved by this Assessment:** all four
documents' own status fields still read "not yet approved" /
"implementation not authorized," yet Smart Stock Entry Tier 1 is
demonstrably implemented and live in this repository (`server/index.ts`'s
`/api/smart-stock-entry/extract` route; `AddStockView.tsx`'s
`handleFileSelected`; commit history including `Add Smart Stock Entry
(Tier 1) — AI-assisted, human-confirmed purchase document scanning`
and a later `[BUG FIX] ... express.json() parser` fix). No
Implementation Authorization document for Smart Stock Entry Tier 1
was found anywhere in `docs/engineering/` or git history. This
Assessment does not attempt to reconcile that discrepancy — it is
flagged here as an observation about the four artifacts' own recorded
status text, not adjudicated, and it does not change what this
Assessment treats as governed: the *behavioral boundary* those four
documents describe (advisory-only, human-confirmed, Tier 1 scope,
privileged-server-only AI calls) is treated as the fixed reference
point regardless of the documents' own approval-status field, because
that boundary is what the shipped code actually implements today.

## 3. Current State Assessment — Verified Against Source, This Session

**Client pipeline (`apps/tenant/src/components/AddStockView.tsx`,
`handleFileSelected`, lines ~1753–1798, confirmed by direct read):**

```
File (camera or file-picker)
  → handleFileSelected(file, method)
  → FileReader.readAsDataURL(file)      [full-resolution, synchronous]
  → base64 string (data: prefix stripped)
  → AppContext.scanPurchaseDocument(base64, mimeType)
  → JSON.stringify({ businessId, imageBase64, mimeType })
  → fetch POST /api/smart-stock-entry/extract
```

Confirmed directly in `AppContext.tsx` (`scanPurchaseDocument`, lines
~5689–5743): the exact `fetch`/`JSON.stringify` shape above, no
preprocessing step of any kind between receiving the raw base64
string and sending the request body.

**Camera and upload convergence:** confirmed — both UI entry points
in `AddStockView.tsx` (lines ~2461, ~2478) call the identical
`handleFileSelected(file, method)` function, differing only in the
`method` label passed through for scan-state UI purposes. There is
exactly one client-side processing path, not two.

**Absence of client-side preprocessing — confirmed by repository-wide
search, not assumed:** no occurrence anywhere in `src/`, `apps/`, or
`server/` of `createImageBitmap`, canvas-based resizing, `toBlob`,
or any other image-dimension/compression handling. No file-size
guard exists on the client before `readAsDataURL` is called.

**Server-side controls already in place (`server/smartStockEntry.ts`,
`server/index.ts`, confirmed unchanged and not to be modified by this
Assessment):**
- `MAX_IMAGE_BYTES = 8 * 1024 * 1024` — hard ceiling on the
  **decoded** (not base64) image size (`smartStockEntry.ts:42`).
- `validateExtractionUpload` rejects with `too_large` if decoded
  bytes exceed that ceiling, and independently sniffs real file type
  from magic bytes (`sniffImageMimeType`) rather than trusting the
  client's declared MIME type (`smartStockEntry.ts:58–121`).
- The route's own dedicated body parser, `smartStockEntryJsonParser
  = express.json({ limit: '12mb' })`, registered **before** the
  app-wide `express.json()` (default ~100kb) specifically so a real
  phone-camera base64 payload is not rejected at the framework layer
  before the route's own logic runs (`server/index.ts:187–227`,
  itself the subject of an earlier, already-shipped bug fix
  documented inline).
- Business-membership re-verification and product-list re-read from
  Firestore (never trusting client-supplied data), per Principle 2.9
  — unchanged, unaffected by this Assessment.

**Conclusion:** the reported symptom is architecturally consistent
with the pipeline as read. A full-resolution phone-camera photo
(commonly 4000×3000px or larger, several MB as raw bytes) is base64-
encoded entirely in browser memory via `FileReader.readAsDataURL`
before any size check occurs — the ~8MB *decoded* server-side ceiling
and the 12MB *request-body* ceiling both operate only after the
client has already fully materialized the base64 string in memory
and (for the request-body ceiling) after network transmission has
begun. On a lower-memory Android/WebView environment, materializing
that string, the `JSON.stringify` wrapper around it, and the
subsequent `fetch` body can plausibly exceed available heap before
the request is ever sent or rejected. This matches the reported
"memória insuficiente" symptom's shape, without this Assessment
claiming it as a proven root cause (§1).

## 4. Gap Analysis

| Governed requirement (already fixed, unaffected) | Current gap this Assessment addresses |
|---|---|
| Server never trusts client-declared size/type (ADR Decision 3) | Gap sits entirely client-side, upstream of the server — the server's controls are correct but currently unreachable-in-time for a request that fails in-browser before it is sent. |
| Advisory-only, human-confirmed extraction (BDR-0008) | Unaffected — this fix changes nothing about what happens to a successfully-received image once it reaches the existing extraction/proposal/confirmation flow. |
| Tier 1 MVP document scope (spec #4) | Unaffected — this fix does not expand document types, does not touch extraction/matching logic. |
| — | **No client-side preprocessing exists at all.** A large original file is never intentionally rejected today (correct, per the Product Architect's binding direction below), but it is also never reduced — it is sent at full resolution, which is the mechanism believed responsible for the reported failure. |

## 5. Business / Governance Impact

**None to the governed business rules.** This is a reliability fix to
*how* a photo reaches the already-approved extraction pipeline, not a
change to what the pipeline does, what it extracts, what it proposes,
or how a human confirms it. No field, confidence state, product-
matching rule, or Business Worth/Stock Batch semantic is touched.

## 6. Technical / Architectural Risks

- **Native decoder memory boundary (unavoidable).** Even with
  application-level preprocessing, the browser/OS must still decode
  the *original* image into memory before any resizing logic (native
  or `createImageBitmap`-based) can act on it. An extreme-resolution
  original (e.g. a 50+ megapixel photo) can still exhaust available
  memory during that initial native decode, before any code this
  fix introduces has a chance to run. This is a genuine technical
  boundary, not a design flaw in the proposed fix — §9 below
  distinguishes this explicitly from an intentional application-level
  rejection, which remains prohibited (§9, Failure Boundary 1).
- **`createImageBitmap({ resizeWidth, resizeHeight, resizeQuality })`
  browser/WebView support is not uniform.** The API itself
  (`createImageBitmap`) has broad modern support across Chrome,
  Firefox, Safari, and Chromium-based WebViews. The **resize options
  object** (`resizeWidth`/`resizeHeight`/`resizeQuality`) is a
  secondary parameter historically supported unevenly across engines
  and versions — some implementations honor it, some silently ignore
  the resize hint and return the bitmap at original dimensions
  (requiring the subsequent canvas `drawImage`/`toBlob` step to do
  the actual downscaling regardless), and older or lower-tier Android
  WebView builds are the least predictable of the three target
  environments named in §1. **This Assessment does not claim
  universal safety** — it is why Rule 8 Acceptance Condition 14 (§11)
  requires explicit real-device verification, and why the
  architecture below routes through canvas `toBlob` re-encoding
  regardless of whether `createImageBitmap`'s own resize hint is
  honored, rather than depending on it.
- **`imageOrientation: 'from-image'` is required, not optional, for
  correctness.** Phone cameras commonly write EXIF orientation
  metadata rather than physically rotating pixel data. Without this
  option (or equivalent manual EXIF handling), a preprocessed image
  can silently rotate 90°/180°/270° relative to how it displayed in
  the camera/gallery UI — a correctness regression a receipt-
  extraction pipeline cannot tolerate, since a sideways receipt
  materially degrades OCR/extraction quality. This is why Rule 8
  Acceptance Condition 7 (§11) exists.
- **`canvas.toBlob()` callback-based API and JPEG re-encoding are
  broadly supported** across all three target environments and carry
  materially lower risk than the `resizeWidth`/`resizeHeight` hint
  above — treated here as the reliable half of the mechanism, with
  `createImageBitmap`'s own resize behavior treated as the
  unreliable half that the architecture must not depend on alone.
- **No representative Sabush receipt images exist yet.** No dimension,
  format, or quality value proposed anywhere in this Assessment or in
  a future Implementation Plan can be empirically validated against
  real receipt photos until such a set exists. This Assessment does
  not claim otherwise anywhere below.

## 7. Data and Receipt-Recognition Quality Risk

Downscaling and re-encoding are lossy by construction. The risk this
Assessment names explicitly, rather than leaving implicit:
- Small/dense print (unit prices, quantities, decimal points) is the
  receipt content most vulnerable to degradation from aggressive
  downscaling or low JPEG quality.
- The objective this Assessment fixes is **not** "smallest possible
  output." It is: *remove unnecessary image information while
  preserving the information required to reliably extract receipt
  data* — stated identically to the Product Architect's direction in
  §9, so a future Implementation Plan cannot drift toward
  aggressive-compression-as-default under a generic "reduce payload
  size" framing.
- This risk is the direct reason numeric parameter selection (target
  long-edge dimension, format, quality) is explicitly deferred to a
  future Implementation Plan rather than fixed by this Assessment
  (§9C, §12) — and even there, must be labeled as an initial,
  unvalidated value, never presented as empirically optimal.

## 8. Failure Modes

| Scenario | Required behavior |
|---|---|
| Preprocessing succeeds, output within bounds | Existing pipeline proceeds unchanged (base64 → JSON → `/api/smart-stock-entry/extract`). |
| `createImageBitmap` unsupported or throws | Graceful fallback — routes into Smart Stock Entry's existing failure/manual-entry behavior (BDR-0008 §4's existing pattern: a failed extraction never blocks manual Add Stock). No new business-failure category is introduced. |
| Corrupt or unsupported source image | Same graceful fallback as above — consistent with the server's own existing `unreadable`/`unsupported_type` handling, not a new client-side error taxonomy. |
| Native decode itself fails (device memory boundary, §6) | Same graceful fallback — this is the "unavoidable technical boundary" case named explicitly in §9, distinct from an intentional size rejection, and must not be reported to the user as if the system rejected their file on purpose. |
| Preprocessed output still exceeds the server's 8MB decoded ceiling (edge case) | Server-side `too_large` handling (already implemented, unchanged) applies exactly as it does today — this fix does not weaken or bypass that ceiling (§9B, §11). |

## 9. Product Architect Direction (Binding, This Session)

Recorded here, distinguished explicitly into the four categories the
Product Architect's own governance instruction requires, so future
parameter tuning does not create unnecessary governance churn:

**A. Governed behavior (immutable, not a tunable parameter):**
Large original receipt images are **not** intentionally rejected
merely because of original file size. `Original File/Blob → preprocess
(decode + downscale) → remove unnecessary image information while
preserving information required for receipt extraction → re-encode to
a bounded representation → base64 → JSON/network request` is the
required order. The following is explicitly and permanently
prohibited: `File → full-resolution base64 → attempt to resize
afterward`.

**B. Engineering mechanism (fixed by this Assessment):**
Preprocess before base64/JSON, via `createImageBitmap` (with
`imageOrientation: 'from-image'`) followed by canvas `toBlob()`
re-encoding, per §6's reliability analysis. Server-side validation
(the 8MB decoded ceiling, magic-byte MIME sniffing, the 12MB body
parser) remains completely unchanged and remains the final security/
abuse authority — this fix does not replace, weaken, or duplicate any
server-side control.

**C. Initial engineering parameters (explicitly NOT fixed by this
Assessment):**
A specific target long-edge dimension, output format, and JPEG/WebP
quality are **not** selected here. The Product Architect has directed
that when they are selected (in a future Implementation Plan), the
choice should favor a **large/conservative** initial target over
aggressive compression — but no specific number is claimed as
empirically validated by this Assessment, because no representative
Sabush receipt benchmark set exists yet (§6, §7). Any future
Implementation Plan selecting these values must label them explicitly
as **"INITIAL IMPLEMENTATION PARAMETERS — SUBJECT TO REAL-WORLD
VALIDATION,"** not as proven-optimal.

**D. Future tunability (the parameter-tuning boundary):**
The numeric values chosen in C are engineering implementation
parameters, not immutable business rules. If real-world evidence
later shows receipt-extraction degradation, small-text loss,
decimal-price/quantity recognition problems, browser/WebView
incompatibility, insufficient memory reduction, or other concrete
device-level reliability problems, those numeric parameters **may be
tuned without reopening or amending BDR-0008, the ADR, or spec
amendment #4** — provided all of the following remain unchanged:
- the preprocess-before-base64 architecture (§9A/§9B);
- original-size rejection is still not introduced;
- Tier 1 document scope is unchanged;
- BDR-0008's advisory/human-confirmation boundary is unchanged;
- server-side validation remains authoritative and unmodified;
- no new business rule is introduced;
- no new data-storage or Firestore schema behavior is introduced.

A change that violates any one of those seven conditions is no longer
routine parameter tuning and must return to a fresh governance review
at the appropriate stage, not be treated as covered by this Assessment.

## 10. Governance Classification

**Category 2 — engineering reliability fix, not a new business
capability.** Tested against the Addendum in
`19-governance-bdr-policy-framework.md` ("Scope Boundary:
Standards-Conformance Corrections"): this change answers none of the
questions a Business Decision Record exists to answer — it does not
change *why* Smart Stock Entry exists, *what customer value* it
creates, or *what business philosophy* governs it. The already-
approved-in-substance business decision (advisory-only AI extraction,
human-confirmed, per BDR-0008) is unchanged; this fix only changes how
reliably a photo reaches that already-decided pipeline. Per that
Addendum, a change of this shape enters the governance pipeline
directly at Rule 8 Assessment → Implementation Authorization, and does
not require a new BDR or Policy.

## 11. Rule 8 Acceptance Conditions

Concrete and testable. A future Implementation Plan/Authorization must
be checked against every one of these before Stage 9 (Incremental
Implementation) begins:

1. Both camera and upload use the identical client-side preprocessing
   path — no divergent logic per input method.
2. The original `File`/`Blob` never enters full-resolution base64
   encoding before preprocessing runs.
3. Preprocessing (decode → downscale → re-encode) completes before
   `JSON.stringify` is called on the request body.
4. Output image dimensions are bounded by an explicit maximum
   long-edge value.
5. The bounded output is a materially smaller/bounded representation
   than the unprocessed original, for typical modern phone-camera
   photos.
6. Receipt information is preserved sufficiently for extraction — not
   validated by this Assessment (no benchmark set exists), but
   required as an acceptance condition once real receipt examples are
   available (§7, §12).
7. EXIF orientation is correctly applied (`imageOrientation:
   'from-image'` or equivalent) — a sideways/rotated output is a
   failed acceptance check regardless of file-size success.
8. JPEG, PNG, and WebP source handling is each explicitly tested — not
   assumed uniform from JPEG behavior alone.
9. Corrupt, unsupported, or decode-failure paths degrade gracefully
   into the existing Smart Stock Entry failure/manual-entry flow
   (§8) — no new business-failure category, no unhandled exception
   reaching the user.
10. The existing server-side validation (8MB decoded ceiling,
    magic-byte MIME sniffing, 12MB request-body parser) is verified
    unchanged before and after this fix ships.
11. No Smart Stock Entry business rule changes — Tier 1 scope,
    product-matching confidence rules, and the three-state field
    confidence model (§BDR-0008 §1b) are unaffected.
12. No change to BDR-0008's advisory/human-confirmation boundary — a
    preprocessed image still only ever produces a proposal, never an
    automatic write.
13. No Firestore schema or data-model change of any kind.
14. Low-end Android/WebView behavior is explicitly flagged as
    requiring real-device verification (§6) — not assumed safe from
    desktop-browser testing alone.
15. The specific long-edge dimension, format, and quality values may
    be tuned post-launch, based on real-world evidence, without
    requiring a fresh BDR/ADR/spec amendment — provided §9D's seven
    conditions all continue to hold.

## 12. Open Engineering Decisions (Deferred to a Future Implementation Plan)

**Updated by §15.** Items 1–3 remain open (numeric values are
Implementation Plan-level work, not Rule 8-level work, per §9C/§15);
item 4 is now resolved at the policy level; item 5 remains open and
out of scope for this fix:

1. **Open.** The exact target long-edge dimension (pixels) — to be
   chosen within §15 item 2's large/conservative framework.
2. **Open.** The exact output format (JPEG vs. WebP — JPEG confirmed
   by §15 item 3 as the likely initial candidate for universal
   decoder/encoder support across the three target environments named
   in §1; WebP encoding support via `toBlob` is less uniform on older
   WebView builds; not frozen as permanent).
3. **Open.** The exact JPEG/WebP quality value — to be chosen within
   §15 item 2's framework, prioritizing receipt legibility (§15 item
   7) over payload size.
4. **Resolved by §15 item 5.** A browser/WebView where
   `createImageBitmap` is unavailable, or any other catchable
   preprocessing/decode failure, routes into the existing graceful
   Smart Stock Entry/manual-entry failure path (§8) uniformly — no
   separate per-cause fallback design is required.
5. Whether any telemetry/logging is added client-side to observe
   real-world preprocessing outcomes (output size, failure rate) —
   not decided here, and would itself need a narrow privacy/data
   review before being added, consistent with this repository's
   existing discipline for any new client-side data collection. Not a
   blocker for a future Implementation Plan to proceed without it.

Items 1–3 and 5 are legitimate, narrow decisions for the
Implementation Plan stage — none of them reopens BDR-0008, the ADR,
or spec #4, and per §13 (as amended by §15) none of them blocks this
Assessment's own readiness verdict.

## 13. Implementation-Readiness Verdict

**READY.** *(Updated by §15's amendment — originally READY AFTER
DECISIONS; see superseded reasoning below.)*

The decision this Assessment was waiting on was the qualitative
parameter-selection **framework** (large/conservative, receipt-
legibility-first, JPEG as initial candidate, unchanged server ceilings,
graceful handling of every decode/support failure) — not the exact
numeric values themselves. §15 records that framework as the Product
Architect's binding direction. The exact long-edge dimension and
quality value (§12 items 1 and 3) are ordinary Implementation Plan-
stage decisions in this repository's convention (selected, and
explicitly labeled "INITIAL IMPLEMENTATION PARAMETERS — SUBJECT TO
REAL-WORLD VALIDATION" per §9C, when the Implementation Plan is
written) — their being unpicked here does not, by itself, block this
Assessment's own readiness the way an unresolved *behavioral or
architectural* question would.

No other genuine Rule 8 blocker remains: the mechanism (§9B:
`createImageBitmap` + canvas `toBlob` re-encoding, preprocessing
strictly before base64) is a well-understood, broadly-supported
web-platform pattern (§6); the governed behavioral boundary is
unambiguous (§9A, §10, reconfirmed by §15); every failure mode,
including the unavoidable native-decoder boundary, now has a single,
uniform, already-defined fallback (§8, §15 item 5); and the server-
side ceilings this fix must respect are explicitly reconfirmed
unchanged (§15 item 6).

**Superseded reasoning (original verdict, retained for record):** this
Assessment originally read READY AFTER DECISIONS, treating §12's then-
open items (specific dimension/format/quality values, and the
`createImageBitmap`-unavailable fallback) as blocking. §15 resolves
the fallback question directly and clarifies that the remaining
numeric-value items were never a Rule 8-level blocker to begin with —
they are Implementation Plan inputs.

This verdict still does **not** authorize Stage 9 (Incremental
Implementation). Per `platform-engineering-governance-standard.md`
§3, moving from Assessed to Authorized requires a separate,
explicit Implementation Plan (which will select §12 items 1/3's exact
values, labeled per §9C) followed by a distinct, signed Implementation
Authorization — neither of which this document is or creates (§15's
closing note).

## 14. Scope Discipline / Change-Control Statement

**This Assessment concerns only** client-side image preprocessing
occurring strictly between file selection and the existing
`scanPurchaseDocument` call, inside `AddStockView.tsx` and a new,
small, dedicated preprocessing utility. Likely future implementation
scope: `AddStockView.tsx`, a new preprocessing utility module, and
tests. Localization strings only if a new user-facing failure message
proves genuinely necessary.

**Explicitly out of scope, unaffected, and not to be touched by any
future Implementation Plan derived from this Assessment:** the server
`smartStockEntry` extraction logic; the 8MB server-side decoded-image
limit; the 12MB request-body parser; `firestore.rules`; Product
Recognition Intelligence; Stock Count; Business Worth; supplier-
wording memory; product matching; `BDR-0008`; the Smart Stock Entry
ADR; the Smart Stock Entry specification amendment (spec #4).

---

## 15. Product Architect Decision — Parameter-Selection Framework (Addendum, This Session)

**Type:** Non-normative governance amendment to this Rule 8 Assessment
only. Does not reopen, reverse, or reinterpret §1–§14 above except
where §13's verdict is explicitly updated below. Does not amend
`BDR-0008`, the Smart Stock Entry ADR, or spec amendment #4 — none of
the three were opened, read for editing, or modified to produce this
addendum.
**Recorded, not signed:** this section records a Product Architect
direction as **binding guidance for a future Implementation Plan**, in
the same unsigned form already used in §9 above. It is **not** a
signed Stage 8 Implementation Authorization — see the note on
signature form at the end of this section.

This session's direction confirms and sharpens §9's four-category
framework, without selecting any final numeric value (per §9C, still
deferred):

1. **Original file size is confirmed, again, as never a normal
   rejection criterion** (restates §9A — no change in substance,
   confirmed explicitly this session as the Product Architect's
   binding decision for the future implementation).
2. **The initial output target must be large/conservative, not
   aggressive.** Given that Smart Stock Entry extracts product names,
   quantities (including decimal quantities), unit prices, totals,
   dates, and supplier information, the first implementation must
   deliberately choose a relatively large maximum output dimension and
   moderate quality — prioritizing preservation of small receipt text
   over minimizing payload size. An artificially tiny image chosen
   merely to minimize bandwidth or memory is explicitly rejected as a
   starting point.
3. **JPEG is confirmed as the likely initial output format**, evaluated
   as such because of its broad canvas re-encoding support (§6, §12
   item 2) — **not** frozen as a permanent governance decision. PNG/
   WebP remain implementation considerations, to be documented if they
   matter, not decided here.
4. **The "already sufficiently small" optimization is permitted** as an
   engineering optimization (skip re-encoding when the source is
   already within the selected bounds) — explicitly **not** a business
   rule — provided it cannot reintroduce the original problem: an
   oversized image must never reach `FileReader`/base64 before a
   preprocessing decision (skip-or-resize) has actually been made
   about it.
5. **The native-decoder memory boundary (§6, §9's failure-boundary
   distinction) is reconfirmed, explicitly, as not eliminated by this
   fix.** A catchable preprocessing/decode failure routes into the
   existing graceful Smart Stock Entry/manual-entry behavior (§8) and
   is explicitly restated as **not** an instance of intentional
   original-size rejection (§9A) — this resolves §12 item 4 (the
   `createImageBitmap`-unavailable/decode-failure fallback question)
   at the policy level: every such failure, regardless of specific
   cause, degrades gracefully via the same existing §8 path. No new
   per-cause fallback behavior needs separate design.
6. **The existing server-side `MAX_IMAGE_BYTES` (8MB decoded) and the
   12MB request-body parser are reconfirmed as unchanged and must not
   be raised to accommodate a larger client-side target** — the
   client-side initial target must be selected with those existing
   ceilings in mind, not the reverse.
7. **Receipt-information preservation is reconfirmed as the controlling
   quality constraint** for a future Implementation Plan (restates §7
   — no change in substance): settings that unnecessarily destroy
   small decimal numbers, thin digits, product names, price columns,
   quantities, dates, supplier names, or totals are out of bounds
   regardless of payload-size benefit.

**What remains explicitly unresolved by this addendum, unchanged from
§12:** the exact target long-edge dimension (§12 item 1) and the exact
JPEG/WebP quality value (§12 item 3). This addendum records the
*framework* those numbers must be chosen within (large/conservative,
receipt-legibility-first, JPEG as the likely initial format) — it does
not itself pick a number, and this document does not claim any
number as empirically proven, because no representative Sabush
receipt benchmark corpus exists (§6, §7, unchanged).

**On signature form:** the originating instruction for this session
asked for a marked "Product Architect Decision / Acceptance" section
with a name/decision/date signature block, but only if this
repository's existing governance workflow permits recording a signed
acceptance directly inside a Rule 8 Assessment. Investigation, this
session, of every existing document in `docs/engineering/` carrying a
`Product Architect: <name>` / signed-acceptance block found that
pattern used **only** in dedicated `*-implementation-authorization.md`
files and in the one precedent for an after-the-fact acceptance,
`18-superadmin-business-directory-retrospective-acceptance.md` — never
inline within a `*-rule8-assessment.md` file. No precedent exists in
this repository for a signed Product Architect acceptance recorded
directly inside a Rule 8 Assessment. Per the originating instruction's
own fallback ("if the workflow requires a separate acceptance
artifact, stop and report that rather than inventing one"), **no
signature block is added here.** This section records the parameter-
selection framework as binding direction, in the same unsigned form
§9 already uses, and a formal, signed Stage 8 Implementation
Authorization — a separate document — remains the correct place for
a dated Product Architect signature once an Implementation Plan
exists to authorize.

## Governance Notes

- This document does not implement code, modify runtime behavior, or
  edit any `src/`, `apps/`, `server/`, or `firestore.rules` file. None
  were touched to produce it or this amendment — confirmed by `git
  status` in the accompanying report.
- This document does not modify `BDR-0008`, the Smart Stock Entry ADR,
  spec amendment #4, or the Governance Review Summary — confirmed
  unchanged, both when this Assessment was first written and again for
  this amendment.
- This document does not create, and should not be treated as, an
  Implementation Plan or an Implementation Authorization. §15's
  addendum does not change that.
- This document does not select final numeric preprocessing parameters
  (§12, still open after §15) and does not claim any extraction-
  accuracy or benchmark evidence that does not exist (§6, §7).
- §15 records a Product Architect decision as unsigned binding
  guidance, consistent with §9's existing form — it does not
  fabricate a signed acceptance block; see §15's closing note for why.

**Lifecycle:** Designed → **Assessed** (this document; §13's verdict
updated to **READY** by §15's amendment). Not Authorized, Implemented,
Verified, or Closed — no engineering work is authorized by this
record.
