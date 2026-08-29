// Product Recognition Intelligence — Checkpoint 4 (Semantic/AI
// candidate discovery). Governing chain: ADR-0008 (Accepted) ->
// POL-0013 (Accepted) -> product-recognition-intelligence-rule8-
// assessment.md (READY) -> product-recognition-intelligence-
// implementation-plan.md §3 Checkpoint 4 -> product-recognition-
// intelligence-implementation-authorization.md §2 Checkpoint 4
// (Accepted/Authorized — SABUSHIMIKE MASCENI, 29 August 2026).
//
// SCOPE OF THIS FILE, EXACTLY: one isolated, async I/O-boundary
// function and nothing else — a sibling to callVisionExtractionProvider
// (server/smartStockEntry.ts)'s own pattern, kept in its own dedicated
// file rather than added to that file (that file's own header already
// fixes its scope at Smart Stock Entry; this is a different capability
// with a different governance chain, per this repository's established
// one-capability-per-file discipline).
//
// AUTHORIZATION §2 CONTRACT — every clause below is a binding,
// acceptance-testable requirement, not a design preference:
//
// - Input boundary: this function receives ONLY the caller-supplied
//   `products` array (id + name only — no other Product field) and the
//   single incoming wording string. It performs NO Firestore query of
//   its own, reads no environment-derived business data, and has no
//   way to reach any data beyond exactly what its caller passed in —
//   this is what makes it structurally incapable of leaking another
//   business's data, independent of how its caller is itself
//   tenant-scoped (server/index.ts's route handler is that caller, and
//   is responsible for only ever passing this function a single,
//   already-scoped business's own products, per the route's own
//   comment below).
// - Output boundary: zero or more `{ productId }` values — always a
//   plain array, never a confidence score, never raw model output,
//   never a free-text explanation. `productId` is always validated
//   against the INPUT `products` array before being returned — a
//   hallucinated id that doesn't match anything the caller supplied is
//   silently dropped, never surfaced.
// - Failure boundary: throws NEVER. Every failure mode (no provider
//   credential, provider error, timeout, non-JSON response, malformed
//   shape, empty product list) resolves to an empty array `[]` from
//   inside this function's own try/catch — the caller never needs its
//   own try/catch around this function, and a failure here can never
//   propagate to break anything else in the same request.
// - Latency boundary: a hard timeout (env-overridable, defaults to a
//   few seconds) bounds every provider call — a slow/hanging provider
//   resolves to `[]` at the timeout, never later.
// - Determinism note: reproducibility across model/provider versions is
//   explicitly not guaranteed (ADR-0008's own acknowledgment) — this is
//   an inherent property of this mechanism, not a defect.

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * The exact JSON shape requested from the model — a closed,
 * conservative schema: only ever a list of id strings, each expected
 * to be one of the ids in the `products` list this function itself
 * sends the model (never invented server-side, never provided by any
 * other caller). Kept independently from how the response is then
 * VALIDATED below (`sanitizeMatches`) — the validation step never
 * simply trusts that the model obeyed this schema, mirroring
 * server/smartStockEntry.ts's own parseProviderExtractionResponse
 * discipline (Failure Mode E).
 */
const SEMANTIC_MATCH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: { type: 'string' },
      description: 'Zero or more product ids from the given list that the wording plausibly refers to. Empty array if none are a plausible match.',
    },
  },
  required: ['matches'],
};

function buildPrompt(wording: string, products: Array<{ id: string; name: string }>): string {
  const catalogLines = products.map((p) => `- id "${p.id}": "${p.name}"`).join('\n');
  return (
    'You are matching one supplier/receipt product wording against a small ' +
    'business\'s own existing product catalog, to help avoid creating a ' +
    'duplicate product for something that already exists under a different ' +
    'name. The wording may be a translation, synonym, abbreviation, or ' +
    'otherwise-related name for an EXISTING catalog product — or it may ' +
    'genuinely be a new, different product not in the catalog at all. ' +
    'Only propose a catalog product if it is PLAUSIBLY the same real-world ' +
    'product as the wording — never propose a product merely because it is ' +
    'in the same general category (e.g. two different soft drinks, two ' +
    'different cleaning products, are NOT a match just because both are ' +
    'drinks/cleaning products). If genuinely unsure, or if nothing plausibly ' +
    'matches, return an empty list — a missed match is far less costly than ' +
    'a wrong one, since a human will always review every match you propose ' +
    'before anything is changed.\n\n' +
    `Incoming wording: "${wording}"\n\n` +
    'Existing catalog:\n' +
    catalogLines +
    '\n\nRespond with JSON matching the provided schema only — "matches" must ' +
    'contain only ids copied EXACTLY from the list above, never an invented id.'
  );
}

/**
 * Discards any returned id that isn't one of the ids this function
 * itself sent the model — the Output boundary's own validation step.
 * Also silently de-duplicates (a model returning the same id twice is
 * still just one candidate).
 */
function sanitizeMatches(rawMatches: unknown, products: Array<{ id: string; name: string }>): Array<{ productId: string }> {
  if (!Array.isArray(rawMatches)) return [];
  const validIds = new Set(products.map((p) => p.id));
  const seen = new Set<string>();
  const result: Array<{ productId: string }> = [];
  for (const entry of rawMatches) {
    if (typeof entry !== 'string') continue;
    if (!validIds.has(entry)) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    result.push({ productId: entry });
  }
  return result;
}

/**
 * The one isolated I/O boundary this file exists for. See this file's
 * header for the full, binding contract — summarized: NEVER throws,
 * ALWAYS resolves (to `[]` on any failure), and touches no data beyond
 * exactly what its own arguments supply.
 */
export async function findSemanticProductMatches(
  wording: string,
  products: Array<{ id: string; name: string }>
): Promise<Array<{ productId: string }>> {
  try {
    const trimmed = wording.trim();
    if (!trimmed || products.length === 0) {
      return [];
    }

    const apiKey = process.env.SMART_STOCK_ENTRY_AI_API_KEY;
    if (!apiKey) {
      // [Failure boundary] No provider configured — a fully expected,
      // silent degrade, never an error surfaced anywhere. Mirrors
      // ProviderNotConfiguredError's MEANING in
      // callVisionExtractionProvider, without needing a thrown/caught
      // typed error at all, since this function's own contract is
      // "never throws" from the start.
      return [];
    }

    let GoogleGenAI: any;
    try {
      ({ GoogleGenAI } = await import('@google/genai'));
    } catch {
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    const timeoutMs = Number(process.env.PRODUCT_RECOGNITION_SEMANTIC_MATCH_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

    let response: any;
    try {
      response = await Promise.race([
        ai.models.generateContent({
          // Same model choice as callVisionExtractionProvider
          // (server/smartStockEntry.ts) for the same reason: Google's
          // own current, stable, production-recommended choice for
          // "high-volume extraction, routing, or classification" —
          // exactly this function's own job. Text-only here (no
          // image part), unlike that function's vision call.
          model: 'gemini-3.5-flash-lite',
          contents: [buildPrompt(trimmed, products)],
          config: {
            responseMimeType: 'application/json',
            responseSchema: SEMANTIC_MATCH_RESPONSE_SCHEMA,
            // [Determinism note, this file's own header] 0 is the
            // provider's minimum/most-deterministic setting — does not
            // guarantee byte-identical output, but removes the
            // avoidable, deliberate randomness a non-zero default
            // would otherwise leave uncontrolled, mirroring
            // callVisionExtractionProvider's own identical choice and
            // its own identical reasoning.
            temperature: 0,
          },
        }),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
    } catch {
      // [Failure boundary] Provider error OR timeout — both collapse
      // to the same outcome here, since this function's own contract
      // never distinguishes them to its caller (unlike
      // callVisionExtractionProvider, which throws distinct typed
      // errors for its own, different caller's needs).
      return [];
    }

    const text = response?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }

    if (typeof parsed !== 'object' || parsed === null || !('matches' in parsed)) {
      return [];
    }

    return sanitizeMatches((parsed as { matches: unknown }).matches, products);
  } catch {
    // [Failure boundary — final backstop] Any unexpected error
    // anywhere above (should already be caught by a narrower block,
    // but this outer boundary is what makes "never throws outward" a
    // structural guarantee, not just a convention followed by every
    // branch above it individually).
    return [];
  }
}
