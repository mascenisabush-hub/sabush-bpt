// [Smart Stock Entry — Client-Side Image Preprocessing Reliability
// Fix] Tests for the pure decision logic and structural/source-
// inspection proofs specified by:
// docs/engineering/smart-stock-entry-image-preprocessing-implementation-plan.md
// (ACCEPTED — §13 Test Plan) and
// docs/engineering/smart-stock-entry-image-preprocessing-implementation-authorization.md
// (ACCEPTED AND AUTHORIZED — §9 Testing Requirements).
//
// SCOPE, stated explicitly per the Authorization's own §9: this suite
// covers automated coverage only — pure decision logic
// (computeTargetDimensions, isAlreadySmallEnough), the one browser-API-
// unavailable fallback path that Node's own environment naturally
// exercises (no createImageBitmap global exists under plain Node.js,
// so preprocessSmartStockEntryImage's own "API unavailable" branch is
// genuinely exercised here, not mocked), and structural/source-
// inspection proofs against AddStockView.tsx and AppContext.tsx.
// It does NOT and cannot exercise the actual createImageBitmap decode/
// canvas re-encode path (downscale-and-reencode, EXIF orientation,
// actual JPEG output) — those require a real browser/WebView and are
// explicitly identified as manual/device QA in the Plan's own Test
// Plan (§13, items A–H) and the Authorization's own Testing
// Requirements (§9). This suite makes no claim otherwise.
//
// HOW TO RUN:
//   npx tsx --test tests/smart-stock-entry-image-preprocessing.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  computeTargetDimensions,
  isAlreadySmallEnough,
  preprocessSmartStockEntryImage,
  MAX_LONG_EDGE_PX,
  ALREADY_SMALL_MAX_BYTES,
  JPEG_OUTPUT_QUALITY,
  SOFT_OUTPUT_TARGET_BYTES,
} from '../apps/tenant/src/utils/smartStockEntryImagePreprocessing';

// ------------------------------------------------------------------
// Initial Implementation Parameters — confirms the exact accepted
// values are what's actually exported, per Plan §5 / Authorization §3.
// ------------------------------------------------------------------
describe('Initial Implementation Parameters match the accepted Plan/Authorization exactly', () => {
  it('MAX_LONG_EDGE_PX is 2000', () => {
    assert.equal(MAX_LONG_EDGE_PX, 2000);
  });
  it('JPEG_OUTPUT_QUALITY is 0.85', () => {
    assert.equal(JPEG_OUTPUT_QUALITY, 0.85);
  });
  it('ALREADY_SMALL_MAX_BYTES is 2MB', () => {
    assert.equal(ALREADY_SMALL_MAX_BYTES, 2 * 1024 * 1024);
  });
  it('SOFT_OUTPUT_TARGET_BYTES is ~4MB (a named reference only, not enforced anywhere in this module)', () => {
    assert.equal(SOFT_OUTPUT_TARGET_BYTES, 4 * 1024 * 1024);
    // Confirmed by source inspection, not just by absence of a test:
    // no comparison against this constant exists anywhere in the
    // module, per Plan §5 / Authorization §3 ("not an enforced
    // client-side gate and not a rejection mechanism").
    const src = readFileSync(
      new URL('../apps/tenant/src/utils/smartStockEntryImagePreprocessing.ts', import.meta.url),
      'utf-8'
    );
    const usageCount = (src.match(/SOFT_OUTPUT_TARGET_BYTES/g) || []).length;
    // Exactly one occurrence: the export declaration itself. Any
    // second occurrence would mean something in the module is now
    // comparing against it, which would need its own review.
    assert.equal(usageCount, 1, 'SOFT_OUTPUT_TARGET_BYTES must remain a named reference only, never compared against in code.');
  });
});

// ------------------------------------------------------------------
// computeTargetDimensions — pure, Test M (Plan §13): output never
// exceeds the 2000px cap, aspect ratio preserved, never upscales.
// ------------------------------------------------------------------
describe('computeTargetDimensions (pure)', () => {
  it('caps the long edge at maxLongEdge, preserving aspect ratio — landscape', () => {
    const result = computeTargetDimensions(4000, 3000, 2000);
    assert.equal(result.width, 2000);
    assert.equal(result.height, 1500);
  });

  it('caps the long edge at maxLongEdge, preserving aspect ratio — portrait', () => {
    const result = computeTargetDimensions(3000, 4000, 2000);
    assert.equal(result.width, 1500);
    assert.equal(result.height, 2000);
  });

  it('never upscales — a source already under the cap on both axes is returned unchanged', () => {
    const result = computeTargetDimensions(1200, 900, 2000);
    assert.equal(result.width, 1200);
    assert.equal(result.height, 900);
  });

  it('a source exactly at the cap on its long edge is returned unchanged', () => {
    const result = computeTargetDimensions(2000, 1500, 2000);
    assert.equal(result.width, 2000);
    assert.equal(result.height, 1500);
  });

  it('uses the default MAX_LONG_EDGE_PX (2000) when no explicit cap is passed', () => {
    const result = computeTargetDimensions(4000, 2000);
    assert.equal(result.width, 2000);
    assert.equal(result.height, 1000);
  });

  it('handles a square image', () => {
    const result = computeTargetDimensions(5000, 5000, 2000);
    assert.equal(result.width, 2000);
    assert.equal(result.height, 2000);
  });

  it('handles degenerate/invalid dimensions without throwing', () => {
    assert.doesNotThrow(() => computeTargetDimensions(0, 0, 2000));
    assert.doesNotThrow(() => computeTargetDimensions(-1, 100, 2000));
  });
});

// ------------------------------------------------------------------
// isAlreadySmallEnough — pure, Test S (Plan §13): BOTH conditions
// required, never either alone. Directly proves Test items 12–14 of
// the Authorization's §9 Testing Requirements list.
// ------------------------------------------------------------------
describe('isAlreadySmallEnough (pure) — the already-small bypass requires BOTH conditions', () => {
  it('bypasses when both long edge and byte size are within bounds', () => {
    assert.equal(isAlreadySmallEnough(1200, 900, 500_000), true);
  });

  it('does NOT bypass a file that is small in dimension but large in bytes (Authorization §9 Testing Requirement 13)', () => {
    // <=2000px long edge, but >2MB — an unusually large encoding.
    assert.equal(isAlreadySmallEnough(1200, 900, 3 * 1024 * 1024), false);
  });

  it('does NOT bypass a file that is small in bytes but large in dimension (Authorization §9 Testing Requirement 14)', () => {
    // <=2MB, but long edge >2000px — a highly compressed, high-resolution photo.
    assert.equal(isAlreadySmallEnough(4000, 3000, 500_000), false);
  });

  it('boundary: exactly 2000px long edge and exactly 2MB both bypass (inclusive thresholds)', () => {
    assert.equal(isAlreadySmallEnough(2000, 1000, ALREADY_SMALL_MAX_BYTES), true);
  });

  it('boundary: one pixel over the long-edge cap does NOT bypass, even with a tiny file', () => {
    assert.equal(isAlreadySmallEnough(2001, 1000, 1000), false);
  });

  it('boundary: one byte over the byte-size cap does NOT bypass, even with tiny dimensions', () => {
    assert.equal(isAlreadySmallEnough(100, 100, ALREADY_SMALL_MAX_BYTES + 1), false);
  });

  it('neither condition met — does not bypass', () => {
    assert.equal(isAlreadySmallEnough(4000, 3000, 5 * 1024 * 1024), false);
  });
});

// ------------------------------------------------------------------
// preprocessSmartStockEntryImage — the one browser-API-dependent
// function. Node's own test environment has no createImageBitmap
// global, so the "API unavailable" branch below is genuinely
// exercised, not mocked (Authorization §9: "manual/device QA... plus
// an automated test of the fallback routing logic itself").
// ------------------------------------------------------------------
describe('preprocessSmartStockEntryImage — graceful fallback when createImageBitmap is unavailable (genuinely exercised, not mocked, since Node has no such global)', () => {
  it('resolves { ok: false } rather than throwing, when createImageBitmap does not exist', async () => {
    assert.equal(typeof (globalThis as { createImageBitmap?: unknown }).createImageBitmap, 'undefined');
    // A minimal File-shaped stub is sufficient — the function must
    // never reach past the createImageBitmap-availability check for
    // this case, so the stub's contents are never actually read.
    const stubFile = { size: 123, type: 'image/jpeg' } as unknown as File;
    const result = await preprocessSmartStockEntryImage(stubFile);
    assert.deepEqual(result, { ok: false });
  });

  it('never throws for a null/undefined-like stub either — the same graceful path', async () => {
    const stubFile = {} as unknown as File;
    await assert.doesNotReject(() => preprocessSmartStockEntryImage(stubFile));
  });
});

// ------------------------------------------------------------------
// Structural proof, Test N (Plan §13) — the single most important
// acceptance condition (Rule 8 Assessment §11 item 2; Authorization §4
// item 2/3): preprocessing must occur, in source order, before the
// existing FileReader.readAsDataURL call inside handleFileSelected.
// ------------------------------------------------------------------
describe('AddStockView.tsx — preprocessing occurs before FileReader/base64 (structural)', () => {
  const addStockViewSrc = readFileSync(new URL('../apps/tenant/src/components/AddStockView.tsx', import.meta.url), 'utf-8');

  it('imports preprocessSmartStockEntryImage from the new utility module', () => {
    assert.ok(
      addStockViewSrc.includes("import { preprocessSmartStockEntryImage } from '../utils/smartStockEntryImagePreprocessing';"),
      'Expected AddStockView.tsx to import preprocessSmartStockEntryImage from the new utility.'
    );
  });

  it('handleFileSelected calls preprocessSmartStockEntryImage exactly once, before its own FileReader.readAsDataURL call', () => {
    const handlerStart = addStockViewSrc.indexOf('const handleFileSelected = async');
    assert.notEqual(handlerStart, -1, 'Could not locate handleFileSelected — has it been renamed?');
    // Bounded to the next top-level function/handler definition, the
    // same "next sibling" convention this repo's other source-guard
    // tests already use.
    const nextHandlerIndex = addStockViewSrc.indexOf('\n  const ', handlerStart + 1);
    const handlerBody = addStockViewSrc.slice(handlerStart, nextHandlerIndex === -1 ? undefined : nextHandlerIndex);

    const preprocessCallIndex = handlerBody.indexOf('preprocessSmartStockEntryImage(file)');
    const readAsDataURLIndex = handlerBody.indexOf('.readAsDataURL(');

    assert.notEqual(preprocessCallIndex, -1, 'handleFileSelected must call preprocessSmartStockEntryImage.');
    assert.notEqual(readAsDataURLIndex, -1, 'handleFileSelected must still call readAsDataURL.');
    assert.ok(
      preprocessCallIndex < readAsDataURLIndex,
      'preprocessSmartStockEntryImage must be called BEFORE readAsDataURL — the original file must never be converted to full-resolution base64 before preprocessing (Authorization §2, §4 item 2/3).'
    );

    // Exactly one call site — no duplicated implementation.
    const callCount = (addStockViewSrc.match(/preprocessSmartStockEntryImage\(/g) || []).length;
    assert.equal(callCount, 1, 'Expected exactly one call to preprocessSmartStockEntryImage — no duplicated preprocessing implementation.');
  });

  it('readAsDataURL is called on the preprocessed result (preparedFile), not the original raw file', () => {
    assert.ok(
      addStockViewSrc.includes('reader.readAsDataURL(preparedFile);'),
      'Expected readAsDataURL to be called on preparedFile (the preprocessing result), not the original file parameter.'
    );
  });

  it('a preprocessing failure routes into the existing graceful "unreadable" state — no new failure category', () => {
    const handlerStart = addStockViewSrc.indexOf('const handleFileSelected = async');
    const preprocessCallIndex = addStockViewSrc.indexOf('preprocessSmartStockEntryImage(file)', handlerStart);
    const nearbyBlock = addStockViewSrc.slice(preprocessCallIndex, preprocessCallIndex + 400);
    assert.ok(
      nearbyBlock.includes("setScanErrorReason('unreadable')"),
      'A preprocessing failure must set the existing \'unreadable\' failure reason, not a new one.'
    );
  });

  it('both camera and upload still call the identical handleFileSelected function (regression — unchanged by this fix)', () => {
    // This exact guarantee is already proven by the existing
    // tests/smart-stock-entry.test.ts suite ("both file inputs call
    // the exact same handleFileSelected function"); re-asserted here,
    // narrowly, as a direct regression check tied to this specific
    // change, per Authorization §9 Testing Requirement 19.
    const definitionCount = (addStockViewSrc.match(/const handleFileSelected = async/g) || []).length;
    assert.equal(definitionCount, 1, 'Expected exactly one handleFileSelected definition — no second, camera-only or upload-only implementation.');
    assert.ok(addStockViewSrc.includes("handleFileSelected(file, 'camera')"));
    assert.ok(addStockViewSrc.includes("handleFileSelected(file, 'upload')"));
  });
});

// ------------------------------------------------------------------
// Structural proof, Test T (Plan §13) — scanPurchaseDocument's
// contract (AppContext.tsx) is confirmed untouched by this fix.
// ------------------------------------------------------------------
describe("AppContext.tsx's scanPurchaseDocument contract is unchanged (structural, Authorization §9 Testing Requirement 20)", () => {
  const appContextSrc = readFileSync(new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url), 'utf-8');

  it('scanPurchaseDocument keeps its exact existing (imageBase64, mimeType) signature', () => {
    assert.ok(
      appContextSrc.includes('const scanPurchaseDocument = async (\n    imageBase64: string,\n    mimeType: string\n  ): Promise<SmartStockEntryScanResult> => {'),
      'scanPurchaseDocument\'s signature must remain exactly (imageBase64: string, mimeType: string) — this fix must not change its contract.'
    );
  });

  it('SmartStockEntryFailureReason still has exactly its six existing values — no new failure category introduced', () => {
    const match = appContextSrc.match(/export type SmartStockEntryFailureReason =\s*([\s\S]*?);/);
    assert.ok(match, 'Could not locate the SmartStockEntryFailureReason type.');
    const values = match![1].match(/'[a-z_]+'/g) || [];
    assert.deepEqual(
      values,
      ["'invalid_upload'", "'too_large'", "'unsupported_type'", "'provider_unavailable'", "'unreadable'", "'network_error'"],
      'SmartStockEntryFailureReason must keep exactly its six existing values, unchanged — this fix introduces no new business-facing failure category.'
    );
  });
});
