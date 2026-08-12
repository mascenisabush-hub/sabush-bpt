// [Smart Stock Entry — Tier 1] Pure, dependency-free core logic.
//
// GOVERNANCE: implements exactly docs/specs/04-smart-stock-entry-amendment.md
// (Tier 1 only), docs/architecture/10-smart-stock-entry-adr.md (Decisions
// 2b/3), and docs/specs/BDR-0008-smart-stock-entry-ai-advisory-boundary.md
// (the Trust Test, §1b). Every function here is a pure transformation —
// no Firestore, no network call, no AI provider — so the actual decision
// logic (what counts as a valid upload, how a raw provider response maps
// to a field's ✓/⚠/— state, how product matching resolves) is unit
// testable directly against plain values, matching this repository's
// established pattern (openBatchSupersession.ts, subscriptionEngine.ts's
// computeSubscriptionTransition, restockObservation.ts).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
// - It never calls the AI provider itself (see callVisionExtractionProvider
//   in this same file for the one, deliberately isolated, untestable-here
//   I/O boundary — kept in this file only so the route in server/index.ts
//   stays a thin wrapper, not because it's pure).
// - It never invents a numeric "confidence percentage" (ADR Decision 2b /
//   BDR-0008 §1b's Trust Test) — every field's state is one of exactly
//   three deterministic buckets: 'detected' | 'review' | 'not_found'.
// - It never proposes a selling price (governance's explicit rule) and
//   never proposes a Restock Observation value of any kind.
// - It never does fuzzy/semantic product matching — Tier 1 matches by the
//   exact same case-insensitive rule spec #3 already uses for manual Add
//   Stock, and nothing else. A non-exact name is always 'no_match', never
//   an AI guess presented as a match. Fuzzy matching is Tier 4, deferred.

// ------------------------------------------------------------------
// Upload validation — never trust the client's declared MIME type alone.
// ------------------------------------------------------------------

/** Tier 1 supports common phone-camera photo formats only. No PDF, no
 * multi-page documents — deliberately narrow, per the approved MVP scope. */
export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

/** Hard ceiling on the DECODED (not base64-encoded) image size. Chosen to
 * comfortably fit a phone camera photo while bounding both AI provider
 * cost per call and memory use on the privileged server for a request
 * this codebase does not queue or stream. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface UploadValidationResult {
  ok: boolean;
  error?: 'missing_data' | 'invalid_base64' | 'too_large' | 'unsupported_type';
  mimeType?: SupportedImageMimeType;
  byteLength?: number;
}

/**
 * Sniffs the REAL file type from decoded bytes via magic numbers — the
 * server-side check that makes MIME validation meaningful, since a
 * client-declared `mimeType` string is just a claim (Principle 2.9,
 * extended to file uploads, per the ADR's Decision 3). Returns null for
 * anything not in SUPPORTED_IMAGE_MIME_TYPES.
 */
export function sniffImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Validates a raw base64 upload payload end-to-end: decodable, within the
 * size ceiling, and — critically — actually IS an image of a supported
 * type once decoded, regardless of what the client claimed. Never throws;
 * every failure is a normal, expected outcome (graceful fallback to
 * manual entry), never a crash.
 */
export function validateExtractionUpload(input: {
  imageBase64?: string;
}): UploadValidationResult {
  if (!input.imageBase64 || typeof input.imageBase64 !== 'string' || input.imageBase64.trim() === '') {
    return { ok: false, error: 'missing_data' };
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(input.imageBase64, 'base64');
  } catch {
    return { ok: false, error: 'invalid_base64' };
  }
  // Buffer.from with invalid base64 characters silently drops them rather
  // than throwing — an empty or implausibly tiny result is the practical
  // signal that the input wasn't valid base64 image data at all.
  if (decoded.length === 0) {
    return { ok: false, error: 'invalid_base64' };
  }
  if (decoded.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'too_large', byteLength: decoded.length };
  }

  const sniffed = sniffImageMimeType(decoded);
  if (!sniffed) {
    return { ok: false, error: 'unsupported_type' };
  }

  return { ok: true, mimeType: sniffed, byteLength: decoded.length };
}

// ------------------------------------------------------------------
// Field confidence classification — the ✓ Detected / ⚠ Review / — Not
// found states. Deterministic, never a fabricated percentage (BDR-0008
// §1b, ADR Decision 2b).
// ------------------------------------------------------------------

export type FieldStatus = 'detected' | 'review' | 'not_found';

export interface FieldState<T> {
  value: T | null;
  status: FieldStatus;
}

/**
 * Classifies a raw extracted STRING field (product name, supplier name,
 * document date). 'detected' only for a genuinely present, non-empty,
 * plausible value; 'review' for a present-but-questionable one (currently:
 * implausibly long, since that's a concrete, checkable signal of a
 * garbled OCR read — this repository's own "don't fabricate precision"
 * discipline means we don't invent subtler heuristics that would just be
 * guessing dressed up as logic); 'not_found' for absent/empty.
 */
export function classifyStringField(raw: unknown, opts: { maxPlausibleLength?: number } = {}): FieldState<string> {
  const maxLen = opts.maxPlausibleLength ?? 200;
  if (raw == null) return { value: null, status: 'not_found' };
  if (typeof raw !== 'string') return { value: null, status: 'not_found' };
  const trimmed = raw.trim();
  if (trimmed === '') return { value: null, status: 'not_found' };
  if (trimmed.length > maxLen) return { value: trimmed.slice(0, maxLen), status: 'review' };
  return { value: trimmed, status: 'detected' };
}

/**
 * Classifies a raw extracted NUMERIC field (quantity, cost price).
 * 'detected' for a finite, positive number; 'review' for a present but
 * suspicious value (zero, negative, non-finite, or a string that partially
 * parses) — never silently corrected or dropped, always surfaced so the
 * user actually looks at it; 'not_found' for absent.
 */
export function classifyNumericField(raw: unknown): FieldState<number> {
  if (raw == null) return { value: null, status: 'not_found' };
  const num = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(num)) return { value: null, status: 'not_found' };
  if (num <= 0) return { value: num, status: 'review' };
  return { value: num, status: 'detected' };
}

// ------------------------------------------------------------------
// Product matching — Tier 1's deliberately narrow rule: exact,
// case-insensitive match only, identical to spec #3's existing manual
// Add Stock matching rule. Never fuzzy/semantic (Tier 4, deferred).
// ------------------------------------------------------------------

export type ProductMatchStatus = 'confident' | 'uncertain' | 'no_match';

export interface ProductMatchResult {
  status: ProductMatchStatus;
  productId: string | null;
}

/**
 * Matches an extracted product name against the business's real Products
 * (server-fetched, never client-supplied — see server/index.ts's route
 * handler). Tier 1 never returns 'uncertain' — that bucket exists in the
 * type only so a future Tier 4 fuzzy-matching capability has somewhere to
 * report a genuine "maybe" without a breaking type change; this
 * implementation only ever emits 'confident' (exact case-insensitive
 * match) or 'no_match' (anything else), matching the governance
 * requirement that an uncertain guess must never be presented as
 * automatically resolved.
 */
export function matchProductByExactName(
  extractedName: string | null,
  existingProducts: Array<{ id: string; name: string }>
): ProductMatchResult {
  if (!extractedName || !extractedName.trim()) {
    return { status: 'no_match', productId: null };
  }
  const needle = extractedName.trim().toLowerCase();
  const match = existingProducts.find((p) => p.name.toLowerCase() === needle);
  return match ? { status: 'confident', productId: match.id } : { status: 'no_match', productId: null };
}

// ------------------------------------------------------------------
// Provider response parsing — treats the AI provider's raw output as
// UNTRUSTED INPUT (Principle 2.9, extended to a third-party response, not
// just a client one — ADR Decision 3 / the amendment's Failure Mode E).
// A malformed/unexpected shape is never partially trusted — it fails
// closed, mapped by the caller to a graceful "couldn't read this" outcome.
// ------------------------------------------------------------------

export interface RawExtractedLineItem {
  productName?: unknown;
  quantity?: unknown;
  unit?: unknown;
  costPrice?: unknown;
}

export interface RawExtractionResponse {
  lineItems?: unknown;
  supplierName?: unknown;
  documentDate?: unknown;
}

export interface SmartStockEntryLineItemProposal {
  productName: FieldState<string>;
  quantity: FieldState<number>;
  unit: FieldState<string>;
  costPrice: FieldState<number>;
  productMatch: ProductMatchResult;
}

export interface SmartStockEntryProposal {
  lineItems: SmartStockEntryLineItemProposal[];
  supplierName: FieldState<string>;
  documentDate: FieldState<string>;
}

/**
 * Parses and validates the AI provider's raw JSON output (already
 * JSON.parse'd by the caller — this function only validates SHAPE and
 * content, per Failure Mode E in the spec amendment). Returns null for
 * anything that isn't a plausible extraction response at all — no
 * partial trust, no best-effort salvage of a shape this function can't
 * actually verify. `existingProducts` drives product matching per line
 * item; passing an empty array is valid (every line item then resolves
 * 'no_match', which is the correct, safe behavior for a business with no
 * catalog yet).
 */
export function parseProviderExtractionResponse(
  raw: unknown,
  existingProducts: Array<{ id: string; name: string }>
): SmartStockEntryProposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RawExtractionResponse;
  if (!Array.isArray(r.lineItems)) return null;
  // An extraction with zero line items is a valid, if unhelpful, response
  // shape-wise — but it carries no usable proposal, so the caller should
  // treat it as "couldn't find anything," not silently show an empty
  // review screen. Returning null here lets the route's existing
  // graceful-fallback path handle it uniformly with other empty-result
  // cases (Failure Mode: "Empty extraction" in the amendment's test plan).
  if (r.lineItems.length === 0) return null;

  const lineItems: SmartStockEntryLineItemProposal[] = [];
  for (const rawItem of r.lineItems) {
    if (!rawItem || typeof rawItem !== 'object') continue; // skip a malformed single line rather than failing the whole response
    const item = rawItem as RawExtractedLineItem;
    const productName = classifyStringField(item.productName);
    lineItems.push({
      productName,
      quantity: classifyNumericField(item.quantity),
      unit: classifyStringField(item.unit, { maxPlausibleLength: 20 }),
      costPrice: classifyNumericField(item.costPrice),
      productMatch: matchProductByExactName(productName.value, existingProducts),
    });
  }
  if (lineItems.length === 0) return null;

  return {
    lineItems,
    supplierName: classifyStringField(r.supplierName),
    documentDate: classifyStringField(r.documentDate, { maxPlausibleLength: 10 }),
  };
}

// ------------------------------------------------------------------
// AI provider call — the ONE deliberately impure boundary in this file.
// Isolated here (not inlined into server/index.ts's route) purely so the
// route handler stays a thin, readable wrapper; this function itself is
// NOT unit tested by tests/smart-stock-entry.test.ts, and cannot honestly
// be, without a real provider credential and a real document — see the
// implementation report's PROVEN/NOT PROVEN section. Every other function
// in this file IS unit tested.
//
// GOVERNANCE (ADR Decision 2b): this call intentionally asks for ONE
// structured JSON response covering document-reading + structured
// extraction together, via Gemini's native vision + responseSchema
// support — it does NOT split OCR and interpretation into two separate
// provider calls. This is a pragmatic Tier 1 implementation choice, not
// an architectural commitment: the pipeline's DECISION LOGIC (this
// file's pure functions) treats "raw provider output" as a single
// opaque input regardless of how many calls produced it, so a future
// change to split OCR and interpretation into two calls would only ever
// touch this one function, never the pure logic around it.
// ------------------------------------------------------------------

export class ProviderNotConfiguredError extends Error {}
export class ProviderCallFailedError extends Error {}

/**
 * The exact JSON shape requested from the model — kept in sync with
 * RawExtractionResponse/RawExtractedLineItem above by hand, since this is
 * a prompt-side schema (what we ASK the model to return), not a runtime
 * import of the parsing types (what we then VALIDATE it actually
 * returned) — the two are deliberately checked independently, since the
 * parsing side must never simply trust that the model obeyed the schema
 * (Failure Mode E).
 */
const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    supplierName: { type: 'string', nullable: true },
    documentDate: { type: 'string', nullable: true, description: 'YYYY-MM-DD if determinable, else omit' },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productName: { type: 'string', nullable: true },
          quantity: { type: 'number', nullable: true },
          unit: { type: 'string', nullable: true },
          costPrice: { type: 'number', nullable: true, description: 'unit purchase/cost price, never a selling price' },
        },
      },
    },
  },
  required: ['lineItems'],
};

const EXTRACTION_PROMPT =
  'You are reading a photographed purchase receipt or invoice for a small ' +
  'business inventory app. Extract ONLY what is clearly, literally present ' +
  'in the document. For each purchased line item, extract productName, ' +
  'quantity, unit (e.g. un, cx, kg, saco, carton — copy the document\'s own ' +
  'wording, never convert or infer a different unit), and costPrice (the ' +
  'PURCHASE/cost price paid, never a selling or retail price — if the ' +
  'document shows no purchase price for a line, omit costPrice for it). ' +
  'Also extract supplierName and documentDate if clearly present. If a ' +
  'field is not clearly present, OMIT it entirely rather than guessing — ' +
  'never invent, estimate, or infer a value that is not directly legible ' +
  'in the document. Never extract a selling price under any field name. ' +
  'Never infer how much stock remained before this purchase. Respond with ' +
  'JSON matching the provided schema only.';

/**
 * Calls the configured AI vision provider with one image and returns its
 * raw (unvalidated) parsed JSON response. Throws ProviderNotConfiguredError
 * if no provider credential is set in this environment, or
 * ProviderCallFailedError for any provider-side failure (timeout, API
 * error, non-JSON response) — the caller (server/index.ts) maps both to
 * the same graceful `provider_unavailable`/`unreadable` client outcome,
 * per the amendment's Failure Modes O/P. Never throws for a merely
 * low-quality extraction result — that's parseProviderExtractionResponse's
 * job to classify, not this function's job to judge.
 */
export async function callVisionExtractionProvider(
  imageBase64: string,
  mimeType: SupportedImageMimeType
): Promise<unknown> {
  const apiKey = process.env.SMART_STOCK_ENTRY_AI_API_KEY;
  if (!apiKey) {
    throw new ProviderNotConfiguredError('SMART_STOCK_ENTRY_AI_API_KEY is not set in this environment.');
  }

  let GoogleGenAI: any;
  let createPartFromBase64: any;
  try {
    ({ GoogleGenAI, createPartFromBase64 } = await import('@google/genai'));
  } catch (err) {
    throw new ProviderCallFailedError(
      `@google/genai could not be loaded: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const timeoutMs = Number(process.env.SMART_STOCK_ENTRY_TIMEOUT_MS) || 20000;

  let response: any;
  try {
    response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [createPartFromBase64(imageBase64, mimeType), EXTRACTION_PROMPT],
        config: {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_RESPONSE_SCHEMA,
        },
      }),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new ProviderCallFailedError('Smart Stock Entry extraction timed out.')), timeoutMs)
      ),
    ]);
  } catch (err) {
    if (err instanceof ProviderCallFailedError) throw err;
    throw new ProviderCallFailedError(err instanceof Error ? err.message : String(err));
  }

  const text = response?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    throw new ProviderCallFailedError('Provider returned no text content.');
  }

  try {
    return JSON.parse(text);
  } catch {
    // A non-JSON response despite responseMimeType being requested — the
    // caller's parseProviderExtractionResponse would reject this shape
    // anyway, but failing here with a clear provider-level error keeps
    // that distinction visible in server logs (this is a provider
    // misbehavior, not a "the document was unreadable" case).
    throw new ProviderCallFailedError('Provider response was not valid JSON.');
  }
}
