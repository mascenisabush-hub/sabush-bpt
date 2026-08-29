// [Smart Stock Entry — Client-Side Image Preprocessing Reliability Fix]
//
// GOVERNANCE: implements exactly
// docs/engineering/smart-stock-entry-image-preprocessing-rule8-assessment.md
// (READY, amended §15),
// docs/engineering/smart-stock-entry-image-preprocessing-implementation-plan.md
// (ACCEPTED — SABUSHIMIKE MASCENI, 29 August 2026), and
// docs/engineering/smart-stock-entry-image-preprocessing-implementation-authorization.md
// (ACCEPTED AND AUTHORIZED — SABUSHIMIKE MASCENI, 29 August 2026).
//
// Pure, dependency-free decision logic (computeTargetDimensions,
// isAlreadySmallEnough) is exported separately from the one
// browser-API-dependent function (preprocessSmartStockEntryImage) so
// the decision logic can be unit tested directly in this repository's
// node:test environment, which has no browser DOM and cannot execute
// createImageBitmap/canvas/toBlob — the same separation
// server/smartStockEntry.ts already uses between its pure logic and
// its one I/O boundary (callVisionExtractionProvider).
//
// GOVERNED BEHAVIOR — do not change without a fresh governance review
// (Authorization §4 Non-Negotiables):
// - This module's own createImageBitmap call is the ONLY decode step
//   that ever touches the original file before any base64 conversion.
//   Callers (AddStockView.handleFileSelected) MUST call
//   preprocessSmartStockEntryImage BEFORE FileReader.readAsDataURL,
//   never after.
// - A large original image is NEVER rejected here merely because of
//   its original file size — every path either preprocesses it or
//   routes to the graceful { ok: false } fallback on a genuine decode
//   failure. No `if (file.size > X) return { ok: false }` gate exists
//   anywhere in this module.
// - The already-small bypass sends the ORIGINAL File object completely
//   unmodified — never "re-oriented", since no canvas draw occurs on
//   that path (Plan §9, corrected during final Plan review;
//   Authorization §4 item 5).
//
// TUNABLE (Authorization §3, Plan §5/§7) — may be changed later based
// on real-world evidence WITHOUT reopening BDR-0008, the Smart Stock
// Entry ADR, or spec amendment #4, provided the governed behavior
// above and the Plan's seven-condition Parameter Tuning Boundary both
// continue to hold:

/** Maximum long-edge dimension, in pixels, for the re-encoded output.
 * INITIAL IMPLEMENTATION PARAMETER — SUBJECT TO REAL-WORLD VALIDATION
 * (no representative Sabush receipt-photo benchmark corpus exists at
 * the time this value was chosen — Rule 8 Assessment §6/§7, Plan
 * §5). Deliberately large/conservative, not aggressive. */
export const MAX_LONG_EDGE_PX = 2000;

/** JPEG re-encode quality, on canvas.toBlob's 0.0–1.0 scale.
 * INITIAL IMPLEMENTATION PARAMETER — SUBJECT TO REAL-WORLD VALIDATION,
 * chosen conservatively to prioritize receipt legibility (thin digits,
 * decimal points) over minimizing payload size (Plan §5). */
export const JPEG_OUTPUT_QUALITY = 0.85;

/** Already-small bypass byte-size threshold (2MB). Combined with
 * MAX_LONG_EDGE_PX below via isAlreadySmallEnough — BOTH conditions
 * are required, never either alone (Rule 8 Assessment §15 item 4;
 * Plan §5, §9). INITIAL IMPLEMENTATION PARAMETER — SUBJECT TO
 * REAL-WORLD VALIDATION. */
export const ALREADY_SMALL_MAX_BYTES = 2 * 1024 * 1024;

/** Soft engineering guide only (Plan §5, Authorization §3) — NOT an
 * enforced client-side gate and NOT a rejection threshold. Retained
 * here purely as a named reference for manual/device QA (Plan §13,
 * Test M) — no code path in this module compares an output Blob's
 * size against this constant. */
export const SOFT_OUTPUT_TARGET_BYTES = 4 * 1024 * 1024;

export interface TargetDimensions {
  width: number;
  height: number;
}

/**
 * Pure. Computes bounded target dimensions from a source width/height,
 * capping the long edge at maxLongEdge while preserving aspect ratio.
 * Never upscales — a source already at or under maxLongEdge on both
 * axes returns its own dimensions unchanged. (Callers are expected to
 * use isAlreadySmallEnough/the already-small bypass in that case
 * instead of re-encoding at all, but this function is safe either
 * way.)
 */
export function computeTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge: number = MAX_LONG_EDGE_PX
): TargetDimensions {
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
    return { width: sourceWidth, height: sourceHeight };
  }
  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= maxLongEdge) {
    return { width: sourceWidth, height: sourceHeight };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

/**
 * Pure. The already-small bypass decision (Rule 8 Assessment §15 item
 * 4; Plan §5, §9): BOTH the long edge and the original byte size must
 * be within bounds. Dimension alone is not sufficient — a
 * small-dimension image can still carry an unusually large byte size
 * from an unusual encoding. Byte size alone is not sufficient — a
 * small file can still exceed the target dimension (e.g. a highly
 * compressed but very high-resolution photo).
 */
export function isAlreadySmallEnough(
  sourceWidth: number,
  sourceHeight: number,
  originalFileBytes: number,
  maxLongEdge: number = MAX_LONG_EDGE_PX,
  maxBytes: number = ALREADY_SMALL_MAX_BYTES
): boolean {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  return longEdge <= maxLongEdge && originalFileBytes <= maxBytes;
}

export type SmartStockEntryPreprocessResult =
  | { ok: true; file: File | Blob; bypassed: boolean }
  | { ok: false };

/**
 * The one browser-API-dependent function in this module. Decodes the
 * original file via createImageBitmap (with imageOrientation:
 * 'from-image', so the decoded bitmap already reflects the photo's
 * intended orientation), applies the already-small bypass decision
 * once dimensions are known, and otherwise downscales/re-encodes to a
 * bounded JPEG via canvas.
 *
 * Never throws. Every failure — createImageBitmap unavailable,
 * createImageBitmap rejecting (corrupt/unsupported input, or the
 * unavoidable native-decoder memory boundary the Rule 8 Assessment
 * documents, §6/§9), canvas creation/context failure, or
 * toBlob/convertToBlob failure — resolves { ok: false }, which the
 * caller routes into the existing graceful Smart Stock Entry
 * 'unreadable' failure state (Authorization §4 item 9). This function
 * never distinguishes "file too large" as its own case — a large
 * original is downscaled like any other oversized input, never
 * rejected for its size (Authorization §2, §4 item 8).
 */
export async function preprocessSmartStockEntryImage(
  file: File
): Promise<SmartStockEntryPreprocessResult> {
  if (typeof createImageBitmap !== 'function') {
    // API unavailable entirely in this browser/WebView — graceful
    // fallback, not a rejection (Plan §11 scenario 3).
    return { ok: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Decode failure: corrupt input, unsupported format, or the
    // unavoidable native-decoder memory boundary — all resolve
    // identically here (Plan §11 scenarios 4/5/8/9).
    return { ok: false };
  }

  try {
    if (isAlreadySmallEnough(bitmap.width, bitmap.height, file.size)) {
      // Already-small bypass: discard this dimension-check bitmap and
      // send the ORIGINAL File completely unmodified. Not
      // "re-oriented" — no canvas draw occurs on this path (Plan §9,
      // corrected during final Plan review; Authorization §4 item 5).
      bitmap.close?.();
      return { ok: true, file, bypassed: true };
    }

    const target = computeTargetDimensions(bitmap.width, bitmap.height);
    const blob = await downscaleBitmapToJpegBlob(bitmap, target);
    bitmap.close?.();

    if (!blob) {
      return { ok: false };
    }
    return { ok: true, file: blob, bypassed: false };
  } catch {
    // Canvas creation/context failure, or any other unexpected error
    // during the re-encode step — same graceful fallback (Plan §11
    // scenarios 6/7; Authorization §4 item 9).
    bitmap.close?.();
    return { ok: false };
  }
}

/**
 * Draws the already-oriented bitmap onto a canvas sized to the target
 * dimensions and re-encodes to JPEG. Performs the actual downscaling
 * itself via canvas drawImage — this does not depend on
 * createImageBitmap's own resizeWidth/resizeHeight hint being honored
 * by the engine, since that hint is not requested at all here; the
 * canvas draw is what guarantees the bound (Plan §6).
 */
async function downscaleBitmapToJpegBlob(
  bitmap: ImageBitmap,
  target: TargetDimensions
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(target.width, target.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);
    return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_OUTPUT_QUALITY });
  }

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, target.width, target.height);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', JPEG_OUTPUT_QUALITY);
  });
}
