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
  const tokensA = new Set(tokenize(normalizeForSimilarity(a)));
  const tokensB = new Set(tokenize(normalizeForSimilarity(b)));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersectionSize = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionSize++;
  }
  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
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
