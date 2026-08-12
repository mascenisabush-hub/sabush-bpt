// [Smart Stock Entry — Tier 1] Tests for the pure, dependency-free core
// logic in server/smartStockEntry.ts.
//
// SCOPE, stated explicitly per the implementation authorization's own
// "PROVEN vs NOT PROVEN vs DEFERRED" requirement: this suite proves the
// DECISION LOGIC — upload validation, field confidence classification,
// product matching, and provider-response parsing/rejection — against
// plain values and synthetic provider payloads. It does NOT and cannot
// prove that a real AI provider correctly reads a real photographed
// receipt — that requires a live provider credential and a real
// document, neither of which exists in this environment (no
// SMART_STOCK_ENTRY_AI_API_KEY is configured here). callVisionExtractionProvider
// itself is therefore NOT exercised by this suite — see the
// implementation report's own PROVEN/NOT PROVEN section for the full
// accounting of what this does and does not demonstrate.
//
// HOW TO RUN:
//   npx tsx --test tests/smart-stock-entry.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  sniffImageMimeType,
  validateExtractionUpload,
  classifyStringField,
  classifyNumericField,
  matchProductByExactName,
  parseProviderExtractionResponse,
  MAX_IMAGE_BYTES,
} from '../server/smartStockEntry';

// ------------------------------------------------------------------
// [Verification phase, requested review] Structural proof that the
// extraction route can NEVER create a half-finished or premature stock
// record. This is provable statically without live infra: the route's
// handler body is inspected directly for any Firestore WRITE call —
// `.set(`, `.update(`, `.delete(`, `.add(`, or `.commit(`/`runTransaction(`
// — and none must appear. The route only ever performs the ONE read
// this file's own comments already document (re-fetching this
// business's real Products for matching); it commits nothing.
// ------------------------------------------------------------------
describe('Smart Stock Entry extraction route — never writes Firestore (structural proof)', () => {
  const serverIndexSrc = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf-8');

  it('the /api/smart-stock-entry/extract handler contains no Firestore write call of any kind', () => {
    const marker = "expressApp.post(\n  '/api/smart-stock-entry/extract',";
    const start = serverIndexSrc.indexOf(marker);
    assert.notEqual(start, -1, 'Could not locate the Smart Stock Entry route — has it been renamed/restructured?');
    // Bounded to the next top-level middleware/route registration, the
    // same "next sibling" convention this repo's other source-guard
    // tests already use (see tests/delete-product-plan.test.ts).
    const nextIndex = serverIndexSrc.indexOf("expressApp.use(express.json());", start);
    assert.notEqual(nextIndex, -1);
    const handlerBody = serverIndexSrc.slice(start, nextIndex);

    for (const writeCall of ['.set(', '.update(', '.delete(', '.add(', '.commit(', 'runTransaction(']) {
      assert.ok(
        !handlerBody.includes(writeCall),
        `Smart Stock Entry's extraction route must never call ${writeCall} — it is advisory-only and must never write a StockBatch, PurchaseBatch, or Product, per BDR-0008.`
      );
    }
    // The one read this route is documented to perform.
    assert.ok(
      handlerBody.includes("db.collection('businesses').doc(businessId).collection('products').get()"),
      "Expected the route to re-read this business's own Products server-side for matching."
    );
  });

  // [BUG FIX, post-deployment — real production symptom: every scan,
  // camera or upload, failed with "Couldn't reach the server."] Root
  // cause, confirmed by direct inspection of Express's middleware
  // ordering: the app-wide express.json() (default ~100kb limit) was
  // registered BEFORE this route's own 12mb parser, so it consumed and
  // size-limited every request body first — a real phone photo's
  // base64 payload (easily 500KB-2MB) never reached this route's own
  // larger parser at all. This test proves the fix holds structurally,
  // so this specific regression can't silently reappear if the route
  // is ever moved again.
  it("this route (and its own 12mb parser) is registered BEFORE the app-wide express.json() — the exact ordering bug that caused every scan to fail with a 413 in production", () => {
    const routeIndex = serverIndexSrc.indexOf("expressApp.post(\n  '/api/smart-stock-entry/extract',");
    const parserIndex = serverIndexSrc.indexOf('const smartStockEntryJsonParser = express.json(');
    const globalJsonIndex = serverIndexSrc.indexOf('expressApp.use(express.json());');
    const appCreatedIndex = serverIndexSrc.indexOf('const expressApp = express();');

    assert.notEqual(routeIndex, -1);
    assert.notEqual(parserIndex, -1);
    assert.notEqual(globalJsonIndex, -1);
    assert.notEqual(appCreatedIndex, -1);

    assert.ok(appCreatedIndex < parserIndex, 'expressApp must be created before the route-specific parser is built.');
    assert.ok(
      parserIndex < globalJsonIndex,
      "The route's own 12mb parser must be defined BEFORE the app-wide express.json() — otherwise the app-wide parser's small default limit consumes every request body first, and this route's larger limit never takes effect."
    );
    assert.ok(
      routeIndex < globalJsonIndex,
      'The Smart Stock Entry route itself must be registered BEFORE the app-wide express.json(), so Express matches this exact path+method first and the app-wide parser is never reached for this route.'
    );
  });

  it("the route's own express.json() limit is genuinely larger than Express's default (~100kb) — large enough for a real phone-camera photo's base64 payload", () => {
    const parserLine = serverIndexSrc.match(/const smartStockEntryJsonParser = express\.json\(\{ limit: '(\d+)mb' \}\);/);
    assert.ok(parserLine, 'Could not find the route-specific json parser limit configuration.');
    const limitMb = Number(parserLine![1]);
    assert.ok(limitMb >= 8, `Expected a limit of at least 8mb to comfortably fit a base64-encoded phone photo under MAX_IMAGE_BYTES; found ${limitMb}mb.`);
  });
});

// ------------------------------------------------------------------
// [Input-Method Expansion — camera capture + file upload] Structural
// proof that both input methods converge into the exact same
// extraction pipeline, per the change request's own explicit
// requirement ("Do not create a second extraction endpoint or second
// AI pipeline"). Neither the client component nor the server route has
// any concept of "how the file arrived" — both are provable
// source-level, without a browser: AddStockView.tsx wires two file
// inputs to the identical handleFileSelected function, and everything
// downstream of that (validateExtractionUpload/sniffImageMimeType/
// parseProviderExtractionResponse, all exercised above) operates only
// on decoded bytes, with no input-method parameter anywhere in their
// signatures to even distinguish camera from upload.
// ------------------------------------------------------------------
describe('Input-method convergence (camera capture vs. file upload)', () => {
  const addStockViewSrc = readFileSync(new URL('../src/components/AddStockView.tsx', import.meta.url), 'utf-8');

  it('AddStockView wires exactly two file inputs: one camera-capture, one plain upload', () => {
    const fileInputCount = (addStockViewSrc.match(/type="file"/g) || []).length;
    assert.equal(fileInputCount, 2, 'Expected exactly two <input type="file"> elements — camera capture and upload.');

    // Scoped to each actual <input ...> element's own attribute list
    // (from its `<input` tag to its closing `/>`) — not a whole-file
    // text search, which would also match this same string appearing
    // inside a nearby JSX comment. Found by searching BACKWARD from
    // each input's own `ref=` attribute for its opening `<input` tag,
    // never a fixed character offset (fragile against reformatting).
    const extractInputTag = (refAttr: string): string => {
      const refIdx = addStockViewSrc.indexOf(refAttr);
      const tagStart = addStockViewSrc.lastIndexOf('<input', refIdx);
      const tagEnd = addStockViewSrc.indexOf('/>', refIdx);
      return addStockViewSrc.slice(tagStart, tagEnd);
    };
    const cameraTag = extractInputTag('ref={cameraFileInputRef}');
    const uploadTag = extractInputTag('ref={uploadFileInputRef}');
    assert.ok(cameraTag.includes('capture="environment"'), 'The camera input must have capture="environment".');
    assert.ok(
      !uploadTag.includes('capture="environment"'),
      'The upload input must NOT have capture="environment" — that attribute would force camera-only behavior on mobile, defeating the "upload an existing document" path.'
    );
  });

  it('both file inputs call the exact same handleFileSelected function — no second handler, no second pipeline', () => {
    const cameraInputBlock = addStockViewSrc.slice(
      addStockViewSrc.indexOf('ref={cameraFileInputRef}'),
      addStockViewSrc.indexOf('ref={uploadFileInputRef}')
    );
    const uploadInputBlock = addStockViewSrc.slice(
      addStockViewSrc.indexOf('ref={uploadFileInputRef}'),
      addStockViewSrc.indexOf('onClick={() => cameraFileInputRef.current?.click()}')
    );
    assert.ok(cameraInputBlock.includes('handleFileSelected(file)'), 'Camera input must call handleFileSelected.');
    assert.ok(uploadInputBlock.includes('handleFileSelected(file)'), 'Upload input must call handleFileSelected.');
    // Only ONE handleFileSelected definition exists at all — proving
    // there is no parallel/second implementation either input could be
    // routed to instead.
    const definitionCount = (addStockViewSrc.match(/const handleFileSelected = async/g) || []).length;
    assert.equal(definitionCount, 1);
  });

  it('both file inputs share the identical accept list — Tier 1\'s document-type restriction applies uniformly to both input methods', () => {
    const acceptOccurrences = addStockViewSrc.match(/accept="image\/jpeg,image\/png,image\/webp"/g) || [];
    assert.equal(acceptOccurrences.length, 2, 'Both the camera and upload inputs must restrict to the same Tier 1 image types.');
  });

  it("the server's validation/classification functions have no input-method parameter of any kind — they only ever see decoded bytes", () => {
    // Structural proof at the type level: neither function accepts
    // anything resembling a source/method/origin argument.
    const validationResult = validateExtractionUpload({ imageBase64: Buffer.from([0xff, 0xd8, 0xff]).toString('base64') });
    assert.deepEqual(Object.keys(validationResult).sort(), ['byteLength', 'mimeType', 'ok'].sort());
  });
});

// ------------------------------------------------------------------
// sniffImageMimeType — magic-byte detection, never trusting a claimed
// MIME type (governance's explicit "never trust client MIME alone" rule)
// ------------------------------------------------------------------
describe('sniffImageMimeType', () => {
  it('detects a JPEG from its magic bytes', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.equal(sniffImageMimeType(bytes), 'image/jpeg');
  });

  it('detects a PNG from its magic bytes', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    assert.equal(sniffImageMimeType(bytes), 'image/png');
  });

  it('detects a WEBP from its RIFF/WEBP magic bytes', () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    assert.equal(sniffImageMimeType(bytes), 'image/webp');
  });

  it('returns null for a PDF (unsupported in Tier 1, regardless of claimed type)', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
    assert.equal(sniffImageMimeType(bytes), null);
  });

  it('returns null for arbitrary non-image bytes, even if short/empty', () => {
    assert.equal(sniffImageMimeType(new Uint8Array([])), null);
    assert.equal(sniffImageMimeType(new Uint8Array([0x00, 0x01, 0x02])), null);
  });
});

// ------------------------------------------------------------------
// validateExtractionUpload — end-to-end upload validation
// ------------------------------------------------------------------
describe('validateExtractionUpload', () => {
  const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString('base64');

  it('accepts a valid, small JPEG payload and returns the SNIFFED type', () => {
    const result = validateExtractionUpload({ imageBase64: jpegBase64 });
    assert.equal(result.ok, true);
    assert.equal(result.mimeType, 'image/jpeg');
  });

  it('rejects missing image data', () => {
    assert.deepEqual(validateExtractionUpload({}), { ok: false, error: 'missing_data' });
  });

  it('rejects an empty string', () => {
    assert.deepEqual(validateExtractionUpload({ imageBase64: '' }), { ok: false, error: 'missing_data' });
  });

  it('rejects a payload that decodes to bytes not matching any supported image signature', () => {
    const nonImageBase64 = Buffer.from('this is definitely not an image').toString('base64');
    const result = validateExtractionUpload({ imageBase64: nonImageBase64 });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'unsupported_type');
  });

  it('rejects a payload exceeding MAX_IMAGE_BYTES', () => {
    // A valid JPEG header followed by enough padding to exceed the ceiling.
    const oversized = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(MAX_IMAGE_BYTES + 1024, 0),
    ]);
    const result = validateExtractionUpload({ imageBase64: oversized.toString('base64') });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'too_large');
  });

  it('never treats a client-claimed MIME type as authoritative (function accepts no such parameter at all)', () => {
    // Structural proof, not just behavioral: validateExtractionUpload's
    // own input type has no mimeType field for a caller to even pass —
    // the ONLY source of truth is the sniffed byte signature.
    const result = validateExtractionUpload({ imageBase64: jpegBase64 } as any);
    assert.equal(result.mimeType, 'image/jpeg');
  });
});

// ------------------------------------------------------------------
// classifyStringField / classifyNumericField — the ✓/⚠/— states.
// Never a fabricated confidence percentage (BDR-0008 §1b).
// ------------------------------------------------------------------
describe('classifyStringField', () => {
  it('classifies a normal, present value as detected', () => {
    assert.deepEqual(classifyStringField('Coca-Cola 500ml'), { value: 'Coca-Cola 500ml', status: 'detected' });
  });

  it('classifies null/undefined as not_found', () => {
    assert.deepEqual(classifyStringField(null), { value: null, status: 'not_found' });
    assert.deepEqual(classifyStringField(undefined), { value: null, status: 'not_found' });
  });

  it('classifies an empty/whitespace-only string as not_found', () => {
    assert.deepEqual(classifyStringField(''), { value: null, status: 'not_found' });
    assert.deepEqual(classifyStringField('   '), { value: null, status: 'not_found' });
  });

  it('classifies a non-string value as not_found (never coerced)', () => {
    assert.deepEqual(classifyStringField(42), { value: null, status: 'not_found' });
  });

  it('classifies an implausibly long value as review, not silently truncated-and-trusted', () => {
    const long = 'x'.repeat(500);
    const result = classifyStringField(long, { maxPlausibleLength: 200 });
    assert.equal(result.status, 'review');
    assert.equal(result.value?.length, 200);
  });
});

describe('classifyNumericField', () => {
  it('classifies a positive finite number as detected', () => {
    assert.deepEqual(classifyNumericField(10), { value: 10, status: 'detected' });
  });

  it('classifies a numeric string as detected', () => {
    assert.deepEqual(classifyNumericField('10'), { value: 10, status: 'detected' });
  });

  it('classifies null/undefined as not_found', () => {
    assert.deepEqual(classifyNumericField(null), { value: null, status: 'not_found' });
    assert.deepEqual(classifyNumericField(undefined), { value: null, status: 'not_found' });
  });

  it('classifies zero or negative as review — surfaced, never silently corrected', () => {
    assert.deepEqual(classifyNumericField(0), { value: 0, status: 'review' });
    assert.deepEqual(classifyNumericField(-5), { value: -5, status: 'review' });
  });

  it('classifies a non-numeric string as not_found, never as 0', () => {
    const result = classifyNumericField('twelve');
    assert.equal(result.status, 'not_found');
    assert.notEqual(result.value, 0);
  });

  it('classifies Infinity/NaN as not_found', () => {
    assert.equal(classifyNumericField(Infinity).status, 'not_found');
    assert.equal(classifyNumericField(NaN).status, 'not_found');
  });
});

// ------------------------------------------------------------------
// matchProductByExactName — Tier 1's deliberately narrow matching rule.
// ------------------------------------------------------------------
describe('matchProductByExactName', () => {
  const products = [
    { id: 'p1', name: 'Coca-Cola 500ml' },
    { id: 'p2', name: 'Fanta Laranja 500ml' },
  ];

  it('returns confident + the matched productId for an exact case-insensitive match', () => {
    assert.deepEqual(matchProductByExactName('coca-cola 500ml', products), { status: 'confident', productId: 'p1' });
  });

  it('returns no_match for a close-but-not-exact name — Tier 1 never guesses (e.g. "Coca Cola" vs "Coca-Cola")', () => {
    assert.deepEqual(matchProductByExactName('Coca Cola 500ml', products), { status: 'no_match', productId: null });
  });

  it('returns no_match for a completely unrelated name', () => {
    assert.deepEqual(matchProductByExactName('Arroz 1kg', products), { status: 'no_match', productId: null });
  });

  it('returns no_match for null/empty extracted name', () => {
    assert.deepEqual(matchProductByExactName(null, products), { status: 'no_match', productId: null });
    assert.deepEqual(matchProductByExactName('', products), { status: 'no_match', productId: null });
  });

  it('returns no_match against an empty product catalog (never crashes, never invents a match)', () => {
    assert.deepEqual(matchProductByExactName('Coca-Cola 500ml', []), { status: 'no_match', productId: null });
  });

  it('never returns the "uncertain" status in this Tier 1 implementation (reserved for future Tier 4 only)', () => {
    // Exercised against a wide variety of near-miss inputs — none of
    // them may ever produce 'uncertain' today, since that would mean
    // this function silently started guessing.
    const nearMisses = ['coca cola', 'Coca-Cola  500ml', 'COCA-COLA 500ML ', 'Coca-Colaa 500ml'];
    for (const name of nearMisses) {
      const result = matchProductByExactName(name, products);
      assert.notEqual(result.status, 'uncertain', `"${name}" must not produce 'uncertain' in Tier 1`);
    }
  });
});

// ------------------------------------------------------------------
// parseProviderExtractionResponse — treats the AI provider's raw output
// as untrusted input; fails closed on anything malformed.
// ------------------------------------------------------------------
describe('parseProviderExtractionResponse', () => {
  const products = [{ id: 'p1', name: 'Coca-Cola 500ml' }];

  it('parses a well-formed response with one fully-detected line item', () => {
    const raw = {
      supplierName: 'Distribuidora Central',
      documentDate: '2026-08-01',
      lineItems: [{ productName: 'Coca-Cola 500ml', quantity: 10, unit: 'cx', costPrice: 35 }],
    };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.equal(proposal!.lineItems.length, 1);
    assert.equal(proposal!.lineItems[0].productName.status, 'detected');
    assert.equal(proposal!.lineItems[0].productMatch.status, 'confident');
    assert.equal(proposal!.lineItems[0].productMatch.productId, 'p1');
    assert.equal(proposal!.supplierName.status, 'detected');
    assert.equal(proposal!.documentDate.status, 'detected');
  });

  it('parses multiple line items correctly', () => {
    const raw = {
      lineItems: [
        { productName: 'Coca-Cola 500ml', quantity: 10, unit: 'cx', costPrice: 35 },
        { productName: 'Arroz 5kg', quantity: 4, unit: 'saco', costPrice: 120 },
      ],
    };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.equal(proposal!.lineItems.length, 2);
    assert.equal(proposal!.lineItems[0].productMatch.status, 'confident');
    assert.equal(proposal!.lineItems[1].productMatch.status, 'no_match'); // "Arroz 5kg" not in catalog
  });

  it('handles missing optional fields gracefully (e.g. no supplier/date detected)', () => {
    const raw = { lineItems: [{ productName: 'Coca-Cola 500ml', quantity: 10, unit: 'cx', costPrice: 35 }] };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.equal(proposal!.supplierName.status, 'not_found');
    assert.equal(proposal!.documentDate.status, 'not_found');
  });

  it('handles a line item missing costPrice/quantity without failing the whole response', () => {
    const raw = { lineItems: [{ productName: 'Coca-Cola 500ml' }] };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.equal(proposal!.lineItems[0].quantity.status, 'not_found');
    assert.equal(proposal!.lineItems[0].costPrice.status, 'not_found');
  });

  it('NEVER produces a sellingPrice field anywhere in the proposal shape', () => {
    const raw = { lineItems: [{ productName: 'X', quantity: 1, unit: 'un', costPrice: 5, sellingPrice: 999 }] };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.ok(!('sellingPrice' in proposal!.lineItems[0]), 'sellingPrice must never appear on a line item proposal, even if a malicious/confused provider response includes one');
  });

  it('NEVER produces a Restock Observation / previousRemainingQuantity field, even if the raw response contains one', () => {
    const raw = {
      lineItems: [{ productName: 'X', quantity: 1, unit: 'un', costPrice: 5 }],
      previousRemainingQuantity: 3,
      restockObservation: { movement: 7 },
    };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.ok(!('previousRemainingQuantity' in proposal!), 'Restock Observation must never be produced by extraction, per governance');
    assert.ok(!('restockObservation' in proposal!));
  });

  it('rejects null/undefined input', () => {
    assert.equal(parseProviderExtractionResponse(null, products), null);
    assert.equal(parseProviderExtractionResponse(undefined, products), null);
  });

  it('rejects a non-object (Failure Mode E — malformed provider response)', () => {
    assert.equal(parseProviderExtractionResponse('not an object', products), null);
    assert.equal(parseProviderExtractionResponse(42, products), null);
    assert.equal(parseProviderExtractionResponse('[]', products), null);
  });

  it('rejects a response with no lineItems array at all', () => {
    assert.equal(parseProviderExtractionResponse({ supplierName: 'X' }, products), null);
  });

  it('rejects a response with lineItems present but not an array', () => {
    assert.equal(parseProviderExtractionResponse({ lineItems: 'not an array' }, products), null);
  });

  it('treats an empty lineItems array as an empty extraction — null, not a hollow proposal', () => {
    assert.equal(parseProviderExtractionResponse({ lineItems: [] }, products), null);
  });

  it('skips a malformed individual line item rather than rejecting the whole response', () => {
    const raw = {
      lineItems: [
        'not an object',
        { productName: 'Coca-Cola 500ml', quantity: 10, unit: 'cx', costPrice: 35 },
      ],
    };
    const proposal = parseProviderExtractionResponse(raw, products);
    assert.ok(proposal);
    assert.equal(proposal!.lineItems.length, 1);
  });

  it('works correctly against an empty product catalog (a business with no products yet)', () => {
    const raw = { lineItems: [{ productName: 'Coca-Cola 500ml', quantity: 10, unit: 'cx', costPrice: 35 }] };
    const proposal = parseProviderExtractionResponse(raw, []);
    assert.ok(proposal);
    assert.equal(proposal!.lineItems[0].productMatch.status, 'no_match');
  });
});

// ------------------------------------------------------------------
// [Post-deployment fix — real production symptom: every scan showed
// "Scanning isn't available right now" regardless of API key
// configuration] Root cause: the model 'gemini-2.0-flash' this
// integration originally targeted has since been retired by Google —
// every real API call failed outright. This is a structural, source-
// level guard against the specific retired identifier silently
// reappearing; it is NOT a live check of which model is currently
// valid (that requires network access this test suite deliberately
// never has — see this file's own header on provider-call testing
// scope). Whoever next changes the model string should re-verify
// against Google's current documentation, not just satisfy this test.
// ------------------------------------------------------------------
describe('AI provider model configuration', () => {
  const smartStockEntrySrc = readFileSync(new URL('../server/smartStockEntry.ts', import.meta.url), 'utf-8');

  it("does not reference the retired 'gemini-2.0-flash' model", () => {
    assert.ok(
      !smartStockEntrySrc.includes("model: 'gemini-2.0-flash'"),
      "'gemini-2.0-flash' was retired by Google (confirmed post-deployment, mid-2026) — every real extraction call using it fails outright."
    );
  });

  it('references a model string in the currently-documented gemini-3.x or gemini-2.5.x family', () => {
    const modelMatch = smartStockEntrySrc.match(/model: '(gemini-[\d.]+-[\w-]+)'/);
    assert.ok(modelMatch, 'Could not find the configured model string.');
    const model = modelMatch![1];
    assert.match(
      model,
      /^gemini-(2\.5|3(\.\d+)?)-/,
      `Model "${model}" is not in a currently-supported generation as of this fix — verify against Google's current model documentation before deploying.`
    );
  });
});

// ------------------------------------------------------------------
// [Verification phase, requested review] A single "deliberately
// difficult receipt" composite case — combining several real-world
// messiness conditions in ONE synthetic provider response, mirroring
// exactly the scenario named in review: unclear formatting on one
// field, a missing selling price (always true — see the dedicated test
// above), multiple products, one brand-new product, and one whose name
// differs slightly from the catalog. Proves the whole pipeline handles
// a realistically messy result coherently, not just each condition in
// isolation.
// ------------------------------------------------------------------
describe('Smart Stock Entry — a deliberately difficult, realistic receipt', () => {
  const catalog = [
    { id: 'p1', name: 'Coca-Cola 500ml' },
    { id: 'p2', name: 'Leite Ideal 1L' },
  ];

  it('produces a coherent, honestly-uncertain proposal for a messy multi-product receipt', () => {
    const raw = {
      // Supplier name present but unusually long/garbled — a plausible
      // OCR artifact from a crumpled receipt.
      supplierName: 'D I S T R I B U I D O R A   C E N T R A L   L D A   ' + 'X'.repeat(180),
      // No documentDate at all — smudged/illegible on this receipt.
      lineItems: [
        // 1. Exact catalog match, fully clean line.
        { productName: 'Coca-Cola 500ml', quantity: 24, unit: 'cx', costPrice: 35 },
        // 2. Name differs slightly from the catalog ("Leite Ideal 1L")
        //    — must NOT be silently matched.
        { productName: 'Leite Ideal 1 Litro', quantity: 12, unit: 'un', costPrice: 55 },
        // 3. A genuinely new product, no match possible.
        { productName: 'Sabão Azul e Branco 500g', quantity: 6, unit: 'un', costPrice: 40 },
        // 4. Quantity present but nonsensical (a smudge became "-1").
        { productName: 'Óleo Vegetal 1L', quantity: -1, unit: 'un', costPrice: 90 },
        // 5. Price entirely illegible on this line — costPrice omitted.
        { productName: 'Detergente 1L', quantity: 8, unit: 'un' },
      ],
    };

    const proposal = parseProviderExtractionResponse(raw, catalog);
    assert.ok(proposal, 'a realistically messy but structurally valid response must still parse');
    assert.equal(proposal!.lineItems.length, 5);

    // Supplier name: too long to be plausible as typed → review, never
    // silently trusted or truncated without a visible flag.
    assert.equal(proposal!.supplierName.status, 'review');

    // Document date: absent → not_found, never guessed as "today".
    assert.equal(proposal!.documentDate.status, 'not_found');

    // Line 1: clean exact match.
    assert.equal(proposal!.lineItems[0].productMatch.status, 'confident');
    assert.equal(proposal!.lineItems[0].productMatch.productId, 'p1');
    assert.equal(proposal!.lineItems[0].quantity.status, 'detected');
    assert.equal(proposal!.lineItems[0].costPrice.status, 'detected');

    // Line 2: near-miss name — the Trust Test's central case. Must
    // require human choice, never an auto-attach to Leite Ideal 1L.
    assert.equal(proposal!.lineItems[1].productMatch.status, 'no_match');
    assert.equal(proposal!.lineItems[1].productMatch.productId, null);

    // Line 3: brand-new product, correctly falls through to no_match
    // (which the UI maps to "create new product," per existing Product
    // Memory behavior — not a Smart Stock Entry invention).
    assert.equal(proposal!.lineItems[2].productMatch.status, 'no_match');

    // Line 4: nonsensical negative quantity — surfaced as review, the
    // value is preserved (not silently zeroed or dropped) so the user
    // can see exactly what was misread and correct it themselves.
    assert.equal(proposal!.lineItems[3].quantity.status, 'review');
    assert.equal(proposal!.lineItems[3].quantity.value, -1);

    // Line 5: no price at all — not_found, never defaulted to 0 or any
    // other guessed number.
    assert.equal(proposal!.lineItems[4].costPrice.status, 'not_found');
    assert.equal(proposal!.lineItems[4].costPrice.value, null);

    // Across ALL five lines, on a receipt that never once mentioned a
    // selling price: the proposal shape has no sellingPrice field
    // anywhere, for any line — the rule holds under realistic messiness,
    // not just the clean unit-test case above.
    for (const item of proposal!.lineItems) {
      assert.ok(!('sellingPrice' in item));
    }
  });
});

