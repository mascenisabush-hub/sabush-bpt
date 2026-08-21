// [Unit-of-measure auto-detect — keyword fallback] A small, deliberately
// conservative list mapping common product-name keywords (Portuguese,
// Mozambican grocery context) to a typically-used purchase unit.
//
// This is a best-effort SUGGESTION, never an authoritative source —
// see detectSuggestedUnit in InitialStockCountView.tsx, which always
// prefers a real match against the owner's own catalog
// (Product.unitRelationship) first, and only falls through to this
// dictionary when no such match exists. A wrong guess here just
// pre-fills a field the owner can freely overwrite; it never blocks,
// validates against, or silently corrects anything.
//
// Kept intentionally small: only unambiguous, high-confidence terms
// are included. An ambiguous or regionally-inconsistent item (e.g.
// "leite" — sold loose, boxed, or bagged depending on the shop) is
// deliberately left OUT rather than guessed at, since no suggestion is
// safer than a confidently-wrong one. Extend by adding entries below;
// each `keywords` entry is matched as a case-insensitive substring
// against the typed product name, so keep keywords specific enough to
// avoid false positives (e.g. "sal" would also match "salsicha" —
// use "sal " or a longer word where a short one is ambiguous).
export interface UnitGuessEntry {
  keywords: string[];
  unit: string;
}

export const UNIT_GUESS_DICTIONARY: UnitGuessEntry[] = [
  // Bottled/canned drinks — near-universally sold to small shops by the case
  { keywords: ['cerveja', 'refrigerante', 'refresco', 'sumo', 'suco'], unit: 'cx' },
  // Bulk dry staples — typically bought by the sack
  { keywords: ['arroz', 'açúcar', 'acucar', 'farinha', 'feijão', 'feijao'], unit: 'saco' },
  // Cooking oil — near-universally litres
  { keywords: ['óleo', 'oleo'], unit: 'litro' },
  // Eggs — sold by the tray/carton in this market
  { keywords: ['ovo', 'ovos'], unit: 'cartela' },
  // Bread — sold individually
  { keywords: ['pão', 'pao'], unit: 'un' },
  // Bar soap — sold individually
  { keywords: ['sabonete'], unit: 'un' },
];
