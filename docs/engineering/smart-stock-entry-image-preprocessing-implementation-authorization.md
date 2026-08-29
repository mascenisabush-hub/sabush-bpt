# Smart Stock Entry — Client-Side Image Preprocessing Reliability Fix — Implementation Authorization

**Status:** ✅ **ACCEPTED AND AUTHORIZED (29 August 2026).** See
"Product Architect Acceptance / Signature," §10, below, for the
complete signed decision.

**Governing chain (sole authority for this Authorization):**
[BDR-0008](../specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md)
→ [Smart Stock Entry ADR](../architecture/10-smart-stock-entry-adr.md)
→ [Spec #4 Amendment](../specs/04-smart-stock-entry-amendment.md)
→ [Rule 8 Assessment](./smart-stock-entry-image-preprocessing-rule8-assessment.md)
(✅ **READY**, amended §15) →
[Implementation Plan](./smart-stock-entry-image-preprocessing-implementation-plan.md)
(✅ **ACCEPTED — AUTHORIZED TO PROCEED TO IMPLEMENTATION
AUTHORIZATION** — SABUSHIMIKE MASCENI, 29 August 2026) → **this
Authorization**.

**Baseline commit:** `4b63e09` (`main` = `origin/main`, verified via
`git fetch`/`git status` immediately before drafting — working tree
clean, nothing untracked, before this document was created). This
commit is the exact commit that recorded the Implementation Plan's
Product Architect Acceptance.

**This document does not modify application code, tests, dependencies,
configuration, Firestore rules, Firestore indexes, `BDR-0008`, the
Smart Stock Entry ADR, spec amendment #4, the Governance Review
Summary, the Rule 8 Assessment, or the Implementation Plan.** It
exists to record the Product Architect's formal, signed decision to
authorize engineering work — populated strictly from the already-
accepted Implementation Plan, introducing no new scope, no new
business decision, and no technical detail the Plan did not already
specify.

**One capability, stated once, governing everything below:** a
client-side image-preprocessing reliability fix for Smart Stock
Entry's existing document-scan path (camera and upload), so that a
large original receipt photo is normalized (decoded, downscaled,
re-encoded to a bounded representation) **before** it enters the
existing base64/JSON request pipeline, rather than being rejected for
its original size or sent at full resolution. This document authorizes
that capability **as one whole**, exactly as the Implementation Plan
defines it — it does not authorize any part of it (the preprocessing
mechanism, the already-small bypass, the failure-handling table) as a
separately-gated feature, and no section below may be treated as its
own separately-gated capability.

---

## 1. Governance Completeness — What This Record Confirms

- `BDR-0008`, the Smart Stock Entry ADR, spec amendment #4, and the
  Governance Review Summary each remain in their own recorded status
  (each still reads "Drafted, awaiting Product Architect approval" /
  "not yet approved" on their own status lines) — the same
  discrepancy the Rule 8 Assessment first flagged (its §2) and this
  Authorization does not re-litigate. What is fixed and load-bearing
  for this Authorization is the *behavioral boundary* those four
  documents describe (advisory-only AI extraction, human-confirmed,
  Tier 1 document scope, privileged-server-only AI calls, server-side
  validation as final authority) — unchanged, and confirmed unchanged
  again this session.
- The Rule 8 Assessment reached a verdict of **READY** (its §13, as
  amended by its §15), classifying this work as Category 2 engineering
  (no new BDR or Policy required), with the qualitative
  parameter-selection framework (large/conservative, receipt-
  legibility-first, JPEG as initial candidate, unchanged server
  ceilings, uniform graceful failure handling) recorded as binding
  Product Architect direction in its §15.
- The Implementation Plan translated that READY verdict into a
  concrete, file-by-file design — exact initial numeric parameters
  (§5), the exact technical mechanism (§6), an exact already-small
  bypass rule with its final-review correction applied (§9), an exact
  12-scenario failure-handling table (§11), an exact file scope with
  individually-justified files and an explicit exclusion list (§12),
  and an exact test plan distinguishing automated coverage from
  manual/device QA (§13) — and is itself **signed and ACCEPTED** by
  the Product Architect (recorded in the Plan document's own "Product
  Architect Acceptance" section, 29 August 2026).
- No unresolved Rule-8-level blocker remains. The only items the Plan
  itself still leaves open (§12 of the Plan: no telemetry/logging
  decision) are explicitly non-blocking for this Authorization, per
  the Plan's own scope discipline.

## 2. What Is Authorized

**Objective, exactly as fixed by the Plan (§3) and Rule 8 Assessment
(§9A):**

```
Original receipt image, regardless of original file size
  → client-side preprocessing (decode/downscale/re-encode to a
    bounded representation)
  → THEN FileReader.readAsDataURL / base64
  → THEN JSON.stringify
  → THEN the existing, unmodified Smart Stock Entry request
    (scanPurchaseDocument → POST /api/smart-stock-entry/extract)
```

**Explicitly and permanently prohibited**, carried forward unchanged
from the Rule 8 Assessment (§9A) and the Plan (§3):

```
Original File
  → full-resolution FileReader/base64
  → JSON.stringify
  → attempt to resize afterward
```

**The system must not reject an image merely because its original file
is large.** This is the one governed behavioral rule every item below
is checked against.

**Authorized engineering work, drawn directly from the Plan's file
scope (§12) — nothing added, nothing narrowed:**

1. Insert a single new preprocessing call at the start of
   `AddStockView.tsx`'s `handleFileSelected` function, before the
   existing `FileReader.readAsDataURL` call — the single shared entry
   point already used by both camera and upload (Plan §10, §12).
2. Create a new, small, focused client-side preprocessing utility
   module (Plan §12: e.g.
   `apps/tenant/src/utils/smartStockEntryImagePreprocessing.ts`)
   implementing the mechanism in §3 below.
3. Create automated tests for that utility's testable logic, following
   the exact split between automated and manual/device QA coverage the
   Plan's Test Plan (§13) defines — no automated test may claim to
   exercise real browser/`createImageBitmap`/canvas behavior this
   repository's test environment cannot execute (Plan §2, §13).
4. Add one new `package.json` test script and its corresponding
   `test:all` entry, following the exact existing convention (Plan
   §12) — no new npm dependency, since `createImageBitmap`/canvas are
   native browser APIs.
5. No localization change is authorized unless implementation
   discovers a genuine failure path the six existing
   `SmartStockEntryFailureReason` values and their existing, already-
   localized strings do not cover (Plan §11) — the Plan itself found
   none; this is not expected to be exercised, and if it is,
   implementation must report the finding rather than add a key
   silently.

## 3. Initial Implementation Parameters — Authorized As Recorded, Tunable As Recorded

**These are the exact values the Implementation Plan selected (its
§5), authorized here without alteration:**

| Parameter | Authorized initial value |
|---|---|
| Maximum long-edge dimension | **2000px** |
| Output format | **JPEG** (`image/jpeg`) |
| JPEG quality | **0.85** |
| Already-small bypass | Skip re-encoding **only when both**: source long edge ≤ 2000px **and** original file size ≤ 2MB |
| Preprocessed-output soft target | **~4MB** — an internal engineering guide for manual/device QA, **not an enforced client-side gate and not a rejection mechanism** |
| Server-side decoded-image ceiling | **`MAX_IMAGE_BYTES = 8 * 1024 * 1024` (8MB), unchanged and authoritative** |
| Server-side request-body parser | **12MB (`smartStockEntryJsonParser`), unchanged** |

**These are INITIAL IMPLEMENTATION PARAMETERS, not proven-optimal
values and not immutable business rules** — no representative Sabush
receipt-photo benchmark corpus exists (Rule 8 Assessment §6, §7; Plan
§5, §14). They remain tunable after implementation, based on
real-world evidence, **without reopening `BDR-0008`, the Smart Stock
Entry ADR, or spec amendment #4**, provided the implementation
continues to satisfy every one of the Plan's seven Parameter Tuning
Boundary conditions (Plan §7, restated verbatim, binding on this
Authorization):

1. No normal rejection solely because the original image is large.
2. Preprocessing occurs before full base64 conversion.
3. Information required for receipt extraction is preserved.
4. The existing Smart Stock Entry advisory/human-confirmation boundary
   (`BDR-0008`) is unchanged.
5. Existing server-side validation is unchanged.
6. No new business capability is introduced.
7. No unrelated data/business-rule change is introduced.

## 4. Non-Negotiables — Preserved, Binding on Implementation

Every item below is carried forward unaltered from the accepted Plan
and the READY Rule 8 Assessment. None may be reinterpreted,
loosened, or silently narrowed during implementation.

1. **Camera and upload converge on one path.** Both entry points
   continue to call the identical `handleFileSelected` function
   (`AddStockView.tsx`); no duplicated preprocessing implementation,
   no camera-only fix, no upload-only fix (Plan §10).
2. **The original file never reaches full-resolution base64 before
   preprocessing runs**, for any input, on any path — including the
   already-small bypass path, which still calls `createImageBitmap`
   once (for the dimension check) before any `FileReader`/base64 step
   (Plan §9).
3. **Preprocessing occurs strictly before** `FileReader.readAsDataURL`,
   the base64 extraction, `JSON.stringify`, and the `fetch` call (Plan
   §3, §12).
4. **Primary mechanism:** `createImageBitmap(file, { resizeWidth,
   resizeHeight, resizeQuality, imageOrientation: 'from-image' })`
   followed by canvas rendering and `toBlob`/`convertToBlob`
   re-encoding to JPEG — the canvas re-encode step performs the actual
   downscaling regardless of whether the engine honors the
   `resizeWidth`/`resizeHeight` hint, so this implementation must not
   depend on that hint alone (Plan §6).
5. **EXIF orientation** is correctly handled on the primary
   (re-encode) path via `imageOrientation: 'from-image'` (Plan §6).
   **The already-small bypass sends the original file completely
   unmodified** — it must not be described, documented, or implemented
   as "re-oriented," since no canvas draw occurs on that path (Plan
   §9, corrected during final Plan review).
6. **The preprocessing output proceeds through the existing, unmodified
   Smart Stock Entry request pipeline** (`scanPurchaseDocument`,
   `/api/smart-stock-entry/extract`) — this Authorization does not
   change that function's signature, its `SmartStockEntryFailureReason`
   union, or its call shape (Plan §12).
7. **Existing server-side validation remains completely unchanged**:
   authentication, business-membership re-verification, magic-byte MIME
   sniffing, the 8MB decoded-image ceiling, the dedicated 12MB request
   parser, and the existing AI-provider flow (Rule 8 Assessment §3;
   Plan §4D, §12).
8. **No new business-facing rejection based on original image size**,
   under any framing — no `if (file.size > X) reject` gate exists as
   the normal path anywhere in this implementation (Plan §8).
9. **Every genuine decode/preprocessing failure** —
   `createImageBitmap` unavailable, `createImageBitmap`
   throwing/rejecting, native decode failure (the unavoidable
   decoder-memory boundary, §5 below), canvas creation/context
   failure, `toBlob`/`convertToBlob` failure, an unsupported format at
   decode time, or a corrupt image — **routes into the existing
   graceful Smart Stock Entry failure/manual-entry behavior**, using
   the existing `unreadable` failure reason. No new
   `SmartStockEntryFailureReason` value and no new i18n key are
   authorized unless implementation discovers a genuine gap not
   anticipated by the Plan, in which case that is a finding to report,
   not a decision to make silently (Plan §11).
10. **No new business rule and no automatic/AI-based decision is
    introduced.** This is a client-side reliability fix to *how* an
    image reaches the already-governed extraction pipeline — it does
    not touch what that pipeline extracts, proposes, or confirms.
11. **Receipt legibility is the controlling quality constraint** — an
    implementation choice must never trade legibility for a smaller
    payload beyond what §3's parameters already specify (Rule 8
    Assessment §7; Plan §5).
12. **No silent change to `BDR-0008`'s advisory/human-confirmation
    boundary.** A preprocessed image still only ever produces a
    proposal; explicit human review, optional edit, and explicit
    confirmation through the existing Add Stock submission gesture
    remain exactly as they are today.
13. **No change to Product Recognition Intelligence, product matching,
    Stock Count, Business Worth, or supplier-wording memory.**
14. **No Firestore schema, rules, or index change of any kind.**

## 5. Failure/Decode Boundary — Explicitly Preserved

Client-side preprocessing substantially reduces the memory-
amplification problem, by preventing the original full-size image from
ever entering the base64/JSON pipeline. **It does not, and cannot,
eliminate the underlying native-decoder memory boundary**: application
code cannot guarantee that every browser/WebView will avoid allocating
a large native decode buffer for an extremely high-resolution source
image, because that allocation happens during the initial decode —
before this implementation's own downscaling logic has a chance to
run (Rule 8 Assessment §6, §9; Plan §6, §8).

**This is an unavoidable technical boundary, not a design defect.** If
a genuine native decode failure occurs, it must be handled exactly
like any other decode failure in §4 item 9 above — routed into the
existing graceful Smart Stock Entry/manual-entry fallback. **It must
never be converted, described, or implemented as an intentional
original-size rejection mechanism.** The distinction between "the
browser's own decoder failed" and "the application decided your file
was too big" is binding and must remain visible in code comments and
any user-facing copy touched by implementation.

## 6. Scope and Affected Files

**Authorized (drawn directly from Plan §12 — nothing added):**

| File | Authorized change |
|---|---|
| `apps/tenant/src/components/AddStockView.tsx` | One new call at the start of `handleFileSelected`, before the existing `FileReader.readAsDataURL` line. |
| New client-side preprocessing utility (e.g. `apps/tenant/src/utils/smartStockEntryImagePreprocessing.ts`) | New file — houses the mechanism in §4 item 4 and the already-small bypass decision logic in §4 item 5. |
| New test file (e.g. `tests/smart-stock-entry-image-preprocessing.test.ts`) | New file — automated coverage for the utility's pure/testable logic and the structural checks the Plan's Test Plan (§13) defines (preprocessing-before-base64 ordering, shared camera/upload path, failure-routing logic, bypass boundary values). |
| `tests/smart-stock-entry.test.ts` | Touched **only if** its existing structural boundary marker needs re-verification against an unrelated, incidental change — not expected, since `server/index.ts` is not touched by this work (Plan §12). |
| `package.json` | One new test script line and its `test:all` entry, exact existing convention. |

**No file outside this table is authorized by this document.** If
implementation discovers a file outside this list is technically
required, that is a scope finding to report back to the Product
Architect — not something to resolve silently (Plan §12).

## 7. Explicit Exclusions — Not Authorized By This Document

The following are explicitly **not** authorized, under any framing,
by this Authorization:

- Changing the existing 8MB (`MAX_IMAGE_BYTES`) server-side
  decoded-image limit.
- Changing the existing 12MB request-body parser limit.
- Changing `server/smartStockEntry.ts` or `server/index.ts` in any way.
- Changing AI-provider (Gemini) call behavior, prompt design, or
  provider selection.
- Changing `BDR-0008`, the Smart Stock Entry ADR, spec amendment #4, or
  the Governance Review Summary.
- Changing Product Recognition Intelligence.
- Changing product matching logic.
- Changing Stock Count.
- Changing Business Worth.
- Changing supplier-wording memory.
- Changing `firestore.rules` or `firestore.indexes.json`, or adding any
  Firestore collection.
- Introducing any new business-facing failure category beyond the
  existing `unreadable` reason, unless a genuine, previously
  unanticipated gap is found and reported (§4 item 9).
- Rejecting an original image solely because of its file size, under
  any framing.
- Any automatic or AI-based image-acceptance decision.
- Any change to the human-confirmation boundary `BDR-0008` establishes.
- Any redesign of Smart Stock Entry beyond this reliability fix.
- Implementing Tier 2/3/4 document intelligence, or any document type
  beyond Tier 1's existing scope.
- Adding HEIC/HEIF or any input format beyond the existing JPEG/PNG/
  WebP scope.

## 8. Acceptance Criteria — Precise, Testable, Derived From the Plan

Carried forward unaltered from the Plan's own Acceptance Criteria
(§15) and Rule 8 Acceptance Conditions (Assessment §11):

- [ ] Both camera and upload are protected by the identical
      preprocessing path.
- [ ] No full-resolution base64 conversion occurs before preprocessing,
      for any input, including the already-small bypass path.
- [ ] Preprocessed output is bounded to the §3 target dimension/
      format/quality.
- [ ] A large original image is normally accepted and preprocessed,
      never rejected solely for original file size.
- [ ] Initial quality is conservative, per §3's values, not
      aggressively compressed.
- [ ] The already-small bypass sends the original file completely
      unmodified — not re-oriented, not re-encoded.
- [ ] EXIF orientation is correct on the re-encode path.
- [ ] Every genuine failure scenario in §4 item 9 degrades gracefully
      into the existing `unreadable` state — no unhandled exception,
      no new business-failure category.
- [ ] Existing server-side validation (`MAX_IMAGE_BYTES`, magic-byte
      sniffing, the 12MB parser) is verified unchanged.
- [ ] No Smart Stock Entry business-rule change of any kind.
- [ ] No Firestore schema, rules, or data-model change.
- [ ] No Product Recognition Intelligence change.
- [ ] No change to `BDR-0008`'s human-confirmation boundary.
- [ ] All automated tests defined in Plan §13 pass; the full existing
      `test:all` suite continues to pass unmodified.
- [ ] `npm run lint:tenant` is clean for the affected scope.
- [ ] Real-device QA (Plan §13's manual/device QA rows, §14) is
      recorded once actually performed — never claimed in advance.

## 9. Testing Requirements

Exactly the split the Plan's Test Plan (§13) already defines — this
Authorization does not relax or expand it:

- **Automated (`node:test` via `tsx`):** pure decision-logic tests for
  the new preprocessing utility (target-dimension computation,
  already-small bypass boundary values, failure-routing logic) and
  structural/source-inspection tests (preprocessing-before-base64
  ordering, shared camera/upload path, no change to
  `scanPurchaseDocument`'s contract) — following the exact convention
  `tests/smart-stock-entry.test.ts` already uses for its own
  structural proofs.
- **Manual/device QA, explicitly not simulated as automated coverage:**
  small/large JPEG, large PNG, WebP, portrait/landscape aspect ratio,
  EXIF orientation, high-resolution images on a lower-memory Android
  device specifically, corrupt/unsupported input's actual browser
  decode behavior, and the actual user-facing error UI when the
  graceful-fallback path is hit for real.
- **Regression:** the full existing `test:all` suite, and specifically
  the existing `tests/smart-stock-entry.test.ts` suite, must continue
  to pass unmodified.
- **Deferred, not part of this Authorization's acceptance bar:** the
  real-world receipt-extraction validation procedure the Plan defines
  (§14) — a procedure for after real Sabush receipt photos exist, not
  a precondition for this implementation to ship, since none exist
  today.

## 10. Product Architect Acceptance / Signature

**Status: ✅ ACCEPTED AND AUTHORIZED (29 August 2026).**

> PRODUCT ARCHITECT ACCEPTANCE
> Product Architect: SABUSHIMIKE MASCENI
> Decision: ACCEPTED AND AUTHORIZED
> Date: 29 August 2026
>
> I accept and authorize the complete implementation defined by
> §§1–9 of this document, covering the full, unified capability:
> client-side image preprocessing for Smart Stock Entry's document-
> scan path, using the exact Initial Implementation Parameters in §3
> (2000px maximum long edge, JPEG, quality 0.85, the dual-condition
> already-small bypass, and the ~4MB soft, non-enforced output
> target), the exact technical mechanism and non-negotiables in §4,
> the preserved native-decoder failure boundary in §5, the exact file
> scope in §6, and the complete required test coverage in §9 — as one
> authorized capability, not several separately-gated ones.
>
> Nothing in §7 ("Explicit Exclusions") is granted by this signature.

**Effective upon this signature:** engineering implementation of the
complete capability defined in §2, subject to every non-negotiable in
§4, the preserved failure boundary in §5, every acceptance criterion
in §8, and the exclusions in §7, may now proceed. This includes,
unchanged from §§2–9 above:

- The single, unified preprocess-before-base64 pipeline, applied
  identically to camera and upload.
- The exact Initial Implementation Parameters in §3, tunable only
  within the seven-condition Parameter Tuning Boundary already
  defined there — unchanged by this signature.
- The already-small bypass sending the original file completely
  unmodified (§4 item 5) — not re-oriented, not re-encoded.
- The unavoidable native-decoder memory boundary (§5), preserved and
  distinguished from any intentional size rejection.
- Every non-negotiable in §4 and every exclusion in §7, exactly as
  written, unchanged by this signature.

Any discovered need to exceed these boundaries during implementation
returns to Product Architect review before proceeding — not resolved
silently.

---

## Governance Notes

- This document does not modify `BDR-0008`, the Smart Stock Entry ADR,
  spec amendment #4, the Governance Review Summary, the Rule 8
  Assessment, or the Implementation Plan — all remain byte-for-byte
  unchanged, confirmed this session.
- This document does not modify any application code, test,
  dependency, configuration file, Firestore rule, or Firestore index.
- Populated strictly from the already-accepted Implementation Plan; no
  new technical detail, scope, or business decision beyond what the
  Plan already specifies is introduced here.
- §10 is now signed: **ACCEPTED AND AUTHORIZED**, Product Architect
  SABUSHIMIKE MASCENI, 29 August 2026. This document, together with
  its signed §10, is now the authoritative Implementation Authorization
  for this capability.
- This signature authorizes engineering implementation strictly within
  §§2–9 of this document — it is not itself the implementation, and no
  application code, test, or schema is created by this signature; that
  work remains a separate, subsequent step, not begun by this
  document.
