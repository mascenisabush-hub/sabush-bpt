// [Feature — "did you mean an existing product?" suggestions]
// Owner-reported: a receipt scanned by Smart Stock Entry read a
// product as "Maquina Bic 1×2 emb" while the SAME real product already
// existed in the catalog as "Máquina Bic 1x2" — entered during Contagem
// (a stock count). Neither the exact-match rule used everywhere in
// this codebase (matchProductByExactName, server/smartStockEntry.ts;
// createEmptyRow's own products.find(...), AddStockView.tsx) nor the
// existing Supplier-Wording candidate detection
// (supplierWordingMatching.ts's own normalizeForCandidateDetection —
// case + accent folding only, via the shared normalize() in
// data/businessCategories.ts) recognized these as the same product:
// the "×" multiplication sign versus the letter "x", and the extra
// packaging-descriptor word "emb", are each individually enough to
// break both of those narrower comparisons. The practical result: a
// second, memory-less Product record for what is really the same
// item, plus a genuinely-existing Contagem-recorded price/unit that
// Smart Stock Entry could never find.
//
// SCOPE, DELIBERATELY NARROW AND SEPARATE FROM SUPPLIER WORDING:
// this module is catalog-wide (matches ANY existing product,
// regardless of which supplier a wording came from) and purely
// SUGGESTS — it never assigns a productId, never feeds a price
// prefill, and is never treated as a confirmed match by anything else
// in this codebase. It exists solely so the UI can ask "did you mean
// one of these?" and let the Owner pick — the same "detection is
// low-cost, always owner-reviewed" philosophy
// supplierWordingMatching.ts's own header already documents for its
// own, narrower supplier-scoped candidates. Selecting a suggestion
// simply rewrites the row's productName to the EXISTING product's own
// exact name, which then flows through the codebase's existing,
// unchanged, exact-match-only prefill logic completely normally — this
// module never bypasses that discipline, it only helps a real match
// actually reach it.
//
// Deliberately NOT wired into matchProductByExactName or
// findLatestRememberedProductMemory (which must remain exact-match
// only, per BDR-0008's Trust Test — "never an AI guess presented as a
// match") — this module is a UI-suggestion layer, never a resolver.

/**
 * Normalizes a product name for FORGIVING similarity comparison —
 * deliberately more aggressive than supplierWordingMatching.ts's own
 * normalizeForCandidateDetection (case + accent folding only): this
 * additionally treats the "×" multiplication sign as the letter "x"
 * (a common OCR/manual-typing interchange for dimensions like "1x2"),
 * and collapses every other run of non-alphanumeric characters
 * (punctuation, symbols, extra whitespace) into a single space
 * boundary between tokens. This is intentionally too permissive to
 * use for anything BUT a human-reviewed suggestion — see this file's
 * own header for why it is never wired into an auto-resolving match.
 */
export function normalizeForSimilarity(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (same range as businessCategories.ts's normalize())
    .replace(/×/g, 'x')
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // any run of non-letter/non-number becomes one space
    .trim()
    .replace(/\s+/g, ' ');
}

/** Splits an already-normalized name into its individual word tokens. */
export function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter((t) => t.length > 0);
}

/**
 * [POL-0012; similarity-confirmation-threshold-specification.md,
 * signal 3; Implementation Authorization B §2 "Signal insertion
 * (Finding B3)"] Small, fixed, enumerable spelling-to-canonical-unit
 * table ONLY — deliberately not a general-purpose or unrestricted
 * transformation, per the Authorization's own explicit constraint.
 * This is this capability's OWN, separate copy — NOT imported from or
 * shared with `supplierWordingMatching.ts`'s equivalent table
 * (Authorization B §2 "Equivalence table," Rule 8 Assessment B Finding
 * B5): the two capabilities must never share comparison logic, even if
 * the underlying data happens to be identical today. Canonical forms
 * match this app's own existing unit vocabulary
 * (getSuggestedUnitsForCategory, businessCategories.ts).
 */
const UNIT_SPELLING_EQUIVALENCE_TABLE: Record<string, string> = {
  l: 'l',
  lt: 'l',
  ltr: 'l',
  liter: 'l',
  liters: 'l',
  litro: 'l',
  litros: 'l',
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  ml: 'ml',
  mls: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  g: 'g',
  gr: 'g',
  grama: 'g',
  gramas: 'g',
  un: 'un',
  und: 'un',
  unid: 'un',
  unidade: 'un',
  unidades: 'un',
};

/**
 * [Implementation Authorization B §2 — binding mechanism, mirroring
 * Implementation Authorization A's identical Finding A2] A
 * token-canonicalization step COMPOSED WITH the existing `tokenize`
 * function (called on its output, below, inside
 * `computeNameSimilarity`) — `tokenize` itself is completely
 * unmodified. Operates on the already-split token ARRAY: an attached
 * quantity+unit token (e.g. `"2l"`, `"500ml"`) has only its trailing
 * unit-spelling portion canonicalized, quantity digits copied through
 * unchanged; a bare numeric token immediately followed by a bare,
 * recognized unit-spelling token (e.g. `"2"`, `"lt"`) is merged into
 * one combined canonical token (`"2l"`) so both spellings of the same
 * quantity+unit produce an identical token for the Jaccard set
 * comparison below — without ever equating two DIFFERENT quantity
 * values (`"1"` and `"2"` are never merged with each other, only each
 * with its own immediately-following unit spelling). A token not
 * matching either shape, or whose alphabetic portion is not in the
 * table above, is returned completely unchanged.
 */
function canonicalizeTokensForUnitSpelling(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // Attached: a leading numeric run directly followed by a trailing
    // alphabetic run, e.g. "2l", "500ml", "25kg".
    const attached = token.match(/^(\d+)([a-z]+)$/);
    if (attached) {
      const [, qty, unitSpelling] = attached;
      const canonicalUnit = UNIT_SPELLING_EQUIVALENCE_TABLE[unitSpelling];
      out.push(canonicalUnit ? `${qty}${canonicalUnit}` : token);
      continue;
    }
    // Two separate tokens: this token is purely numeric, and the very
    // next token is purely alphabetic and a recognized unit spelling.
    const isNumericOnly = /^\d+$/.test(token);
    const nextToken = tokens[i + 1];
    if (isNumericOnly && nextToken) {
      const canonicalUnit = /^[a-z]+$/.test(nextToken) ? UNIT_SPELLING_EQUIVALENCE_TABLE[nextToken] : undefined;
      if (canonicalUnit) {
        out.push(`${token}${canonicalUnit}`);
        i++; // consume the unit-spelling token too — already emitted above.
        continue;
      }
    }
    out.push(token);
  }
  return out;
}

/**
 * Jaccard similarity (intersection / union) between two names' token
 * sets, computed after normalizeForSimilarity — 0 (nothing in common)
 * to 1 (identical token sets). Chosen over a raw edit-distance metric
 * specifically because the real-world cases this exists for are
 * dominated by EXTRA or MISSING whole words (a packaging descriptor
 * like "emb"/"cx" appended by OCR, or omitted when typed by hand) —
 * token-set overlap tolerates that directly, where a character-level
 * distance would penalize a single missing/extra word heavily even
 * when the rest of the name matches perfectly.
 */
export function computeNameSimilarity(a: string, b: string): number {
  const tokensA = new Set(canonicalizeTokensForUnitSpelling(tokenize(normalizeForSimilarity(a))));
  const tokensB = new Set(canonicalizeTokensForUnitSpelling(tokenize(normalizeForSimilarity(b))));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersectionSize = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionSize++;
  }
  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

// ---------------------------------------------------------------------
// [Product Recognition Intelligence — Checkpoint 1] Bounded per-token
// edit distance. Governing chain: ADR-0008 (Accepted) → POL-0013
// (Accepted) → product-recognition-intelligence-rule8-assessment.md
// (READY) → product-recognition-intelligence-implementation-plan.md §3
// Checkpoint 1 → product-recognition-intelligence-implementation-
// authorization.md §2 Checkpoint 1 (Accepted/Authorized — SABUSHIMIKE
// MASCENI, 29 August 2026).
//
// A single pure, exported Damerau-Levenshtein distance function, kept
// HERE (not inside supplierWordingMatching.ts) so it is a plain,
// independently-testable primitive `supplierWordingMatching.ts` can
// import and apply per-token — mirroring how that file already keeps
// its own comparison logic separate from this one (see this file's own
// header: the two capabilities never share comparison logic). This
// function itself makes no candidate-detection decision, applies no
// ceiling, and is not specific to product names in any way — it is
// pure string-distance math only.
// ---------------------------------------------------------------------

/**
 * Damerau-Levenshtein edit distance (insertions, deletions,
 * substitutions, and adjacent transpositions each cost 1) between two
 * strings. Standard dynamic-programming implementation, O(|a| * |b|)
 * time/space — acceptable here since callers apply this per TOKEN
 * (a handful of characters each), never to whole strings/documents.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () => new Array<number>(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, d[i - 2][j - 2] + cost); // transposition
      }
      d[i][j] = best;
    }
  }
  return d[al][bl];
}

/**
 * [Implementation Plan §3 Checkpoint 1 — Plan-level proposal, open to
 * Authorization override, not itself a governance re-decision] Fixed,
 * conservative per-token edit-distance ceiling used by
 * `supplierWordingMatching.ts`'s `character-spelling-variation` ground:
 * longer tokens (length >= 4) tolerate a distance of up to 2 (catches
 * "Pedasco"/"Pedaço"-class variation); short tokens (length 2-3)
 * tolerate only 1, to bound short-word collision risk the Rule 8
 * investigation flagged; single-character tokens require an exact
 * match (ceiling 0) — a distance-1 "match" on a one-character token is
 * meaningless noise, not a spelling variant.
 */
export function characterSpellingVariationCeiling(tokenLength: number): number {
  if (tokenLength >= 4) return 2;
  if (tokenLength >= 2) return 1;
  return 0;
}

export interface SimilarProductSuggestion {
  id: string;
  name: string;
  score: number; // 0..1, higher is more similar
}

/**
 * Finds existing products whose name is similar to `query` under the
 * forgiving comparison above, sorted most-similar-first. Returns an
 * empty array for a blank query or when nothing clears `threshold`
 * (default 0.5 — at least half of the combined, deduplicated word set
 * shared between the two names; chosen so a single differing word out
 * of two, e.g. "Máquina Bic" vs "Máquina Bic Nova", still qualifies,
 * while two names sharing only one short/common word out of several
 * do not). Capped at `maxResults` (default 3) — this is a short,
 * skimmable suggestion list, not an exhaustive search result.
 *
 * Pure: no Firestore reads, no side effects, never assigns or resolves
 * anything — see this file's own header for the full reasoning.
 */
export function findSimilarProducts(
  query: string,
  products: Array<{ id: string; name: string }>,
  opts: { threshold?: number; maxResults?: number } = {}
): SimilarProductSuggestion[] {
  const threshold = opts.threshold ?? 0.5;
  const maxResults = opts.maxResults ?? 3;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const scored: SimilarProductSuggestion[] = [];
  for (const p of products) {
    const score = computeNameSimilarity(trimmedQuery, p.name);
    if (score >= threshold) {
      scored.push({ id: p.id, name: p.name, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}
