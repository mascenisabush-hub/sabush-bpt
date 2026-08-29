// Supplier-Wording Recognition — Matching Functions (Checkpoint 2 of the
// Implementation Authorization at
// docs/engineering/product-identity-alternative-name-implementation-authorization.md,
// signed 2026-08-19). Governing chain: BDR-0013, POL-0007,
// product-identity-alternative-name-specification.md, its Terminology
// Amendment, and the Rule 8 Assessment (Findings 4, 5, 18).
//
// SCOPE OF THIS FILE, EXACTLY: two pure functions and nothing else.
// Neither function reads or writes Firestore, touches any UI, ranks or
// orders candidates, presents a confirmation experience, persists
// anything, or is called from anywhere yet. Wiring into Add Stock or
// Smart Stock Entry, transaction-protected writes (Finding 13), and
// every other behavior are explicitly deferred to later, separately
// authorized checkpoints. Initial Stock has no supplier concept and is
// not a caller of this module, now or ever, per the accepted
// Terminology Amendment.
//
// Candidate detection and reuse matching are DELIBERATELY DIFFERENT
// strictness levels (Rule 8 Finding 5) — this is not an oversight, it
// mirrors the two behaviors' different risk profiles: a candidate is
// always owner-reviewed before anything is established (low cost if
// imperfect); reuse silently reattaches a wording to a product with no
// owner review at all (BDR-0013 item 3), so it must never risk a false
// positive. Do not unify these two functions or their thresholds.

import { normalize } from '../data/businessCategories';

/**
 * Candidate-detection normalization: reuses the existing `normalize()`
 * (case + accent folding, per Rule 8 Finding 4) and additionally
 * collapses whitespace runs to a single space and trims. Whitespace
 * collapsing is applied here, not inside the shared `normalize()`
 * itself, to avoid changing that function's existing, unrelated
 * behavior (category-name keyword detection in
 * `businessCategories.ts`) for a concern specific to this capability.
 * POL-0007's Candidate Grounds explicitly names "spacing" as part of
 * the normalization-level signal category this function implements.
 */
function normalizeForCandidateDetection(text: string): string {
  return normalize(text).trim().replace(/\s+/g, ' ');
}

/**
 * [POL-0011; product-identity-alternative-name-specification-unit-
 * spelling-amendment.md §2, ground (c); Implementation Authorization A
 * §2 "Equivalence table (Finding A3)"] Small, fixed, enumerable
 * spelling-to-canonical-unit table ONLY — deliberately not a
 * general-purpose or unrestricted transformation, per the
 * Authorization's own explicit constraint. Canonical forms chosen to
 * match this app's own existing unit vocabulary
 * (getSuggestedUnitsForCategory, businessCategories.ts: 'l', 'kg',
 * 'ml', 'g', 'un', among others) rather than inventing a parallel one.
 * Covers the worked examples both the Specification Amendment and
 * ADR-0007 name by name (`"2L"` ↔ `"2 Lt"`; `L`/`Lt`/`Ltr`/`Liter`/
 * `Litro`; `KG`/`Kilo`/`Quilo`), plus the two other common companion
 * units in the same product categories (`ml`, `g`) and the generic
 * counting unit (`un`). This table is intentionally NOT exported and
 * NOT shared with `productNameSimilarity.ts` (Implementation
 * Authorization B §2/§3) — each capability owns its own copy, per
 * Rule 8 Assessment A Finding A4 / Assessment B Finding B5's shared
 * requirement that the two surfaces never share comparison logic, only
 * potentially identical *data* if a future, separate authorization
 * decides to extract it as a shared constant.
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
 * [Implementation Authorization A §2, Finding A2 — binding mechanism]
 * Given an already-`normalizeForCandidateDetection`-normalized string,
 * canonicalizes every QUANTITY+UNIT-SPELLING occurrence — whether
 * attached (`"2l"`) or space-separated (`"2 lt"`) — to one canonical
 * `quantity+unit` form (both become `"2l"`), by tokenizing on
 * whitespace FIRST and isolating each word's leading numeric run from
 * its trailing unit-spelling run BEFORE any equivalence lookup runs.
 * The quantity digit itself is never looked up, folded, or compared
 * for equivalence against a different quantity — only the alphabetic
 * run immediately following it is ever checked against the table
 * above. This is what makes `"1l"`/`"2l"` structurally incapable of
 * becoming equivalent under this ground: their leading numeric tokens
 * (`"1"` vs `"2"`) are copied through unchanged, never equated: only a
 * `"1"` vs `"1"` (identical quantity) could ever produce identical
 * canonical output. A word not matching either recognized shape, or
 * whose unit spelling is not in the table above, is left completely
 * unchanged — this ground simply does not fire for it (grounds (a)/(b)
 * still apply as before, unaffected).
 */
function canonicalizeUnitSpellings(normalized: string): string {
  const words = normalized.split(' ');
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Attached: a leading numeric run directly followed by a trailing
    // alphabetic run, e.g. "2l", "500ml", "25kg" — no space to split on.
    const attached = word.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
    if (attached) {
      const [, qty, unitSpelling] = attached;
      const canonicalUnit = UNIT_SPELLING_EQUIVALENCE_TABLE[unitSpelling];
      out.push(canonicalUnit ? `${qty}${canonicalUnit}` : word);
      continue;
    }
    // Space-separated: this word is purely numeric, and the very next
    // word is purely alphabetic and a recognized unit spelling, e.g.
    // "2" followed by "lt".
    const isNumericOnly = /^\d+(?:[.,]\d+)?$/.test(word);
    const nextWord = words[i + 1];
    if (isNumericOnly && nextWord) {
      const canonicalUnit = /^[a-z]+$/.test(nextWord) ? UNIT_SPELLING_EQUIVALENCE_TABLE[nextWord] : undefined;
      if (canonicalUnit) {
        out.push(`${word}${canonicalUnit}`);
        i++; // consume the unit-spelling word too — already emitted above.
        continue;
      }
    }
    out.push(word);
  }
  return out.join(' ');
}

/**
 * [Checkpoint 1 — local, deliberately NOT imported from
 * productNameSimilarity.ts; see this file's own header and the
 * existing "ground (c) architectural boundary" test suite, which
 * requires this file's only import to remain `normalize()` from
 * `../data/businessCategories`. The Implementation Plan explicitly
 * allows this primitive to live in productNameSimilarity.ts "or a
 * sibling module" — this is that sibling copy, structurally identical
 * to productNameSimilarity.ts's own `damerauLevenshteinDistance`, but
 * owned independently by this file, exactly like the two files'
 * already-separate UNIT_SPELLING_EQUIVALENCE_TABLE copies above.]
 * Damerau-Levenshtein edit distance (insertions, deletions,
 * substitutions, and adjacent transpositions each cost 1).
 */
function damerauLevenshteinDistance(a: string, b: string): number {
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
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, d[i - 2][j - 2] + cost);
      }
      d[i][j] = best;
    }
  }
  return d[al][bl];
}

/**
 * [Checkpoint 1 — local copy, see note above] Fixed, conservative
 * per-token edit-distance ceiling: tokens of length >= 4 tolerate a
 * distance of up to 2; tokens of length 2-3 tolerate 1; single-
 * character tokens require an exact match (ceiling 0).
 */
function characterSpellingVariationCeiling(tokenLength: number): number {
  if (tokenLength >= 4) return 2;
  if (tokenLength >= 2) return 1;
  return 0;
}

/**
 * [Checkpoint 1, ground 'character-spelling-variation' —
 * product-recognition-intelligence-implementation-plan.md §3] Decides
 * whether `needleTokens` (the incoming wording's own tokens, already
 * `normalizeForCandidateDetection`-normalized and space-split) are a
 * plausible character/typo/OCR-adjacent spelling variation of
 * `targetTokens` (a compared product name's or alternative wording's
 * own tokens, normalized the same way) — composing WITH, not
 * replacing, the existing exact-match grounds (a)/(b)/(c) above.
 *
 * Per-token, not whole-string (Rule 8's own investigation finding:
 * whole-string edit distance penalizes extra/missing words the
 * existing token-based grounds already tolerate). Every token of the
 * SHORTER token list must find a distinct token in the LONGER list
 * within `characterSpellingVariationCeiling`'s per-token-length
 * ceiling (greedy nearest-first assignment, each target token
 * consumed at most once) — extra, unmatched tokens on the longer side
 * are tolerated (mirrors `computeNameSimilarity`'s own tolerance for a
 * single extra/missing word). Fires only when at least one matched
 * pair is a genuine near-miss (distance > 0) — an all-exact match is
 * already grounds (a)/(b)'s own territory, not this ground's.
 */
function isCharacterSpellingVariation(needleTokens: string[], targetTokens: string[]): boolean {
  if (needleTokens.length === 0 || targetTokens.length === 0) return false;
  const [shorter, longer] = needleTokens.length <= targetTokens.length
    ? [needleTokens, targetTokens]
    : [targetTokens, needleTokens];

  const longerUsed = new Array(longer.length).fill(false);
  let hadNearMiss = false;

  for (const shortToken of shorter) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < longer.length; i++) {
      if (longerUsed[i]) continue;
      const distance = damerauLevenshteinDistance(shortToken, longer[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) return false;
    const ceiling = characterSpellingVariationCeiling(Math.min(shortToken.length, longer[bestIndex].length));
    if (bestDistance > ceiling) return false;
    if (bestDistance > 0) hadNearMiss = true;
    longerUsed[bestIndex] = true;
  }

  return hadNearMiss;
}

/**
 * [Checkpoint 1, Contradiction Check —
 * product-recognition-intelligence-implementation-plan.md §3, Rule 8
 * Assessment's schema-free numeric/variant check] Extracts every
 * canonical quantity+unit token (reusing `canonicalizeUnitSpellings`
 * above — the SAME per-word numeric+unit-spelling canonicalization
 * grounds (c) already uses, applied here for comparison rather than
 * equivalence) from an already-`normalizeForCandidateDetection`-
 * normalized string, as a Set.
 */
function extractQuantityUnitTokens(normalized: string): Set<string> {
  const canonicalized = canonicalizeUnitSpellings(normalized);
  const tokens = new Set<string>();
  for (const word of canonicalized.split(' ')) {
    if (/^\d+(?:[.,]\d+)?[a-z]+$/.test(word)) {
      tokens.add(word);
    }
  }
  return tokens;
}

/**
 * True when the incoming wording and a compared string (a product
 * name or one of its alternative wordings) each name at least one
 * quantity+unit token, and those two sets of tokens are entirely
 * disjoint — e.g. "2l" on one side, "1l" on the other. This is the
 * schema-free "size/quantity disagreement" the Contradiction Check
 * exists for (Coca Cola 2L vs Coca Cola 1L, ADR-0008 §7's own accepted
 * acceptance example). Deliberately conservative: a wording naming NO
 * quantity+unit token at all never contradicts anything (nothing to
 * disagree about), and any OVERLAP (shared quantity+unit token) is
 * never a contradiction, even if other quantity tokens also differ —
 * this stays a binary, schema-free signal, never a scored comparison.
 */
function hasQuantityUnitContradiction(needleNormalized: string, targetNormalized: string): boolean {
  const needleTokens = extractQuantityUnitTokens(needleNormalized);
  const targetTokens = extractQuantityUnitTokens(targetNormalized);
  if (needleTokens.size === 0 || targetTokens.size === 0) return false;
  for (const t of needleTokens) {
    if (targetTokens.has(t)) return false;
  }
  return true;
}

/**
 * [Checkpoint 4 — public wrapper, used by supplierWordingRecognition.ts]
 * Same Contradiction Check as `hasQuantityUnitContradiction` above, but
 * taking RAW (not yet normalized) strings and doing the normalization
 * itself — needed because the async composition in
 * supplierWordingRecognition.ts applies this check to Semantic/AI
 * candidates too (Non-Negotiable: "Contradictions remain blocking and
 * cannot be overridden by a positive result from another mechanism" —
 * this is what makes that binding on Checkpoint 4's own candidates,
 * not only Checkpoints 1-2's).
 */
export function hasSupplierWordingContradiction(wording: string, productName: string): boolean {
  return hasQuantityUnitContradiction(normalizeForCandidateDetection(wording), normalizeForCandidateDetection(productName));
}

// ---------------------------------------------------------------------
// [Product Recognition Intelligence — Checkpoint 2] Abbreviation,
// curated synonym, curated translation. Governing chain: ADR-0008
// (Accepted) -> POL-0013 (Accepted) ->
// product-recognition-intelligence-rule8-assessment.md (READY) ->
// product-recognition-intelligence-implementation-plan.md Sec3
// Checkpoint 2 -> product-recognition-intelligence-implementation-
// authorization.md Sec2 Checkpoint 2 (Accepted/Authorized).
//
// [DESIGN NOTE — deliberately inline in THIS file, not a separate
// productNamingTables.ts module] The Implementation Plan itself
// proposed "a new productNamingTables.ts (or equivalently named
// module)" — an implementation-level, Plan-level proposal, not a
// governance-fixed requirement. This file's own pre-existing
// architectural-boundary test suite (tests/supplier-wording-
// matching.test.ts, "ground (c) architectural boundary") independently
// asserts, and Acceptance Criterion 17 requires to keep passing
// UNMODIFIED, that this file's import list stays exactly one line
// (normalize() from ../data/businessCategories) — a genuine existing
// constraint a separate importable tables module would violate. Per
// the Authorization Sec6 ("choose the smallest implementation
// consistent with the Plan and document it" for an ambiguous,
// in-scope detail), the three tables are defined directly here
// instead — still fixed, auditable, module-level, plain-object-literal
// constants, reviewable in a single PR diff, mirroring
// UNIT_SPELLING_EQUIVALENCE_TABLE's own exact shape and this file's
// existing pattern of owning its data outright rather than importing
// it.
//
// SHIPPED EMPTY BY DESIGN (Implementation Plan Sec3 Checkpoint 2's own
// proposal): an empty table produces zero false candidates under any
// input (proven by this checkpoint's own negative test). Populating a
// table is a reviewable DATA change, made incrementally against real
// supplier/receipt evidence encountered with the business owner — do
// not pre-populate these with guessed entries.
// ---------------------------------------------------------------------

/** [Ground 'abbreviation-match'] Curated short-form -> canonical-word
 * table. Empty by default — see note above. */
export const ABBREVIATION_TABLE: Record<string, string> = {};

/** [Ground 'synonym-match'] Curated same-language synonym table.
 * Empty by default — see note above. */
export const SYNONYM_TABLE: Record<string, string> = {};

/** [Ground 'translation-match'] Curated cross-language translation
 * table (e.g. "lixivia" -> "bleach", ADR-0008 Sec7's own accepted
 * acceptance example). Empty by default — see note above. */
export const TRANSLATION_TABLE: Record<string, string> = {};

/**
 * Maps every whitespace-separated word of an already-
 * `normalizeForCandidateDetection`-normalized string through `table`,
 * leaving any word with no entry unchanged — the same
 * "unrecognized word/spelling is left alone" discipline
 * `canonicalizeUnitSpellings` already establishes for ground (c). An
 * empty table is therefore always a no-op (identity function),
 * which is exactly what makes an empty table zero-risk (Implementation
 * Plan Sec3 Checkpoint 2).
 */
export function canonicalizeViaTable(normalized: string, table: Record<string, string>): string {
  if (Object.keys(table).length === 0) return normalized;
  return normalized
    .split(' ')
    .map((word) => table[word] ?? word)
    .join(' ');
}

/**
 * Generic "does this table ground fire for this product" test, shared
 * by 'abbreviation-match', 'synonym-match', and 'translation-match' —
 * they differ only in which table they consult, never in the matching
 * rule itself (Implementation Plan Sec3 Checkpoint 2: all three "mirror
 * UNIT_SPELLING_EQUIVALENCE_TABLE's existing shape exactly"). Same
 * "must differ from an already-exact match" discipline as ground (c)
 * above (POL-0011): an already-byte-equal wording is grounds (a)/(b)'s
 * own territory, not this ground's.
 */
export function firesViaTable(
  needle: string,
  needleTableCanonical: string,
  productNameNormalized: string,
  supplierWordings: Array<{ wording: string }> | undefined,
  table: Record<string, string>
): boolean {
  if (Object.keys(table).length === 0) return false;
  const nameMatches =
    productNameNormalized !== needle && canonicalizeViaTable(productNameNormalized, table) === needleTableCanonical;
  const alternativeWordingMatches = (supplierWordings ?? []).some((relationship) => {
    const wordingNormalized = normalizeForCandidateDetection(relationship.wording);
    return wordingNormalized !== needle && canonicalizeViaTable(wordingNormalized, table) === needleTableCanonical;
  });
  return nameMatches || alternativeWordingMatches;
}

/** A candidate product a supplier wording might refer to, with the
 * ground(s) that make it plausible. Detection only — being returned
 * here is never itself a decision (BDR-0013 Decision 4); the owner
 * still confirms or declines every candidate this surfaces. */
export interface SupplierWordingCandidate {
  productId: string;
  /** Which candidate ground(s) fired, per POL-0007's Candidate Grounds
   * section — a wording may match on multiple grounds simultaneously.
   * 'unit-spelling-equivalence' is ground (c), added by POL-0011 /
   * product-identity-alternative-name-specification-unit-spelling-amendment.md.
   * 'character-spelling-variation', 'abbreviation-match',
   * 'synonym-match', and 'translation-match' are added by
   * ADR-0008/POL-0013's Product Recognition Intelligence capability
   * (Checkpoints 1-2, product-recognition-intelligence-implementation-
   * authorization.md §2) — additive only, every existing value's
   * meaning and firing condition is unchanged. 'semantic-match'
   * (Checkpoint 4) is produced by the isolated AI mechanism in
   * supplierWordingRecognition.ts, never by this file — listed here
   * only so a single closed union describes every possible ground a
   * caller may see on a `SupplierWordingCandidate`. */
  grounds: Array<
    | 'initial-stock-name'
    | 'existing-alternative-wording'
    | 'unit-spelling-equivalence'
    | 'character-spelling-variation'
    | 'abbreviation-match'
    | 'synonym-match'
    | 'translation-match'
    | 'semantic-match'
  >;
}

/** [Checkpoint 1 — Contradiction Check] A candidate that a positive
 * ground (from any mechanism) would otherwise propose, but which this
 * schema-free numeric/variant check found a disagreement for — e.g. a
 * differing quantity+unit token pair ("2L" vs "1L"). Per the
 * Authorization's Non-Negotiables §3: "A triggered contradiction
 * remains blocking... regardless of how many positive grounds... agree;
 * accumulated positive evidence may never override it." Exposed
 * separately from `SupplierWordingCandidate` (never silently merged
 * into it) so a contradicted product is structurally incapable of
 * being returned as an ordinary, un-flagged candidate — the caller
 * decides, per Checkpoint 3, whether/how to surface the fact that a
 * product was considered and suppressed. */
export interface SupplierWordingContradiction {
  productId: string;
  /** Plain-data reason code, never a free-text explanation — mirrors
   * `grounds`' own closed-enum discipline. Checkpoint 3 maps this to
   * the actual displayed copy; this file makes no UI decision. */
  reason: 'quantity-unit-mismatch';
}

/**
 * Candidate detection (Rule 8 Finding 4): proposes existing products a
 * newly-entered supplier wording might refer to, using
 * normalization-level similarity only (case and accent via the shared
 * `normalize()`, plus whitespace-run collapsing applied locally — see
 * `normalizeForCandidateDetection` below) — never semantic/AI matching,
 * per POL-0007's Candidate Grounds and Technical Boundary. Checks two grounds per POL-0007: (a)
 * normalized equality to a product's `Product.name` (Initial Stock
 * name); (b) normalized equality to any of that product's own
 * already-confirmed alternative wordings (any supplier — POL-0007's
 * "regardless of which supplier that alternative name is associated
 * with"). Returns every plausible candidate, unordered beyond input
 * order — no ranking, scoring, or maximum count is implemented here
 * (Specification §3 step 4, explicitly deferred; multiple-candidate
 * presentation itself is a later, separately authorized checkpoint).
 * Pure: no Firestore reads, no side effects — the caller supplies the
 * product/wording data already in memory, mirroring
 * `matchProductByExactName`'s existing shape in `server/smartStockEntry.ts`.
 */
export function detectSupplierWordingCandidates(
  wording: string,
  existingProducts: Array<{
    id: string;
    name: string;
    supplierWordings?: Array<{ wording: string }>;
  }>
): SupplierWordingCandidate[] {
  const trimmed = wording.trim();
  if (!trimmed) {
    return [];
  }
  const needle = normalizeForCandidateDetection(trimmed);
  const needleUnitCanonical = canonicalizeUnitSpellings(needle);
  const needleAbbreviationCanonical = canonicalizeViaTable(needle, ABBREVIATION_TABLE);
  const needleSynonymCanonical = canonicalizeViaTable(needle, SYNONYM_TABLE);
  const needleTranslationCanonical = canonicalizeViaTable(needle, TRANSLATION_TABLE);
  const needleTokens = needle.split(' ').filter((t) => t.length > 0);
  const candidates: SupplierWordingCandidate[] = [];

  for (const product of existingProducts) {
    const grounds: SupplierWordingCandidate['grounds'] = [];
    const productNameNormalized = normalizeForCandidateDetection(product.name);

    if (productNameNormalized === needle) {
      grounds.push('initial-stock-name');
    }

    const hasMatchingAlternativeWording = (product.supplierWordings ?? []).some(
      (relationship) => normalizeForCandidateDetection(relationship.wording) === needle
    );
    if (hasMatchingAlternativeWording) {
      grounds.push('existing-alternative-wording');
    }

    // [POL-0011, ground (c)] Independent of (a)/(b) above — a third
    // branch inside this same loop, not a redesign (Finding A1). Per
    // the Specification Amendment's own wording ("...where the
    // incoming wording and the compared name DIFFER ONLY in unit
    // spelling"), this ground requires the raw normalized strings to
    // NOT already be byte-equal — an already-exact match is grounds
    // (a)/(b)'s own territory, not a "differs in unit spelling" case
    // at all. This also preserves grounds (a)/(b)'s exact pre-existing
    // observable behavior (Authorization A §4 "Existing-behavior
    // regression"): a wording that already matched only (a) and/or (b)
    // must keep reporting exactly those grounds, not gain
    // 'unit-spelling-equivalence' merely because canonicalizing an
    // already-identical string is a no-op.
    const nameMatchesViaUnitSpelling =
      productNameNormalized !== needle && canonicalizeUnitSpellings(productNameNormalized) === needleUnitCanonical;
    const alternativeWordingMatchesViaUnitSpelling = (product.supplierWordings ?? []).some((relationship) => {
      const wordingNormalized = normalizeForCandidateDetection(relationship.wording);
      return wordingNormalized !== needle && canonicalizeUnitSpellings(wordingNormalized) === needleUnitCanonical;
    });
    if (nameMatchesViaUnitSpelling || alternativeWordingMatchesViaUnitSpelling) {
      grounds.push('unit-spelling-equivalence');
    }

    // [Checkpoint 1, ground 'character-spelling-variation' — additive,
    // independent of (a)/(b)/(c) above, same loop, same product] Fires
    // when the wording is a bounded per-token edit-distance variation
    // of the product's own name OR of any of its already-confirmed
    // alternative wordings.
    const nameIsSpellingVariation = isCharacterSpellingVariation(
      needleTokens,
      productNameNormalized.split(' ').filter((t) => t.length > 0)
    );
    const alternativeWordingIsSpellingVariation = (product.supplierWordings ?? []).some((relationship) =>
      isCharacterSpellingVariation(
        needleTokens,
        normalizeForCandidateDetection(relationship.wording).split(' ').filter((t) => t.length > 0)
      )
    );
    if (nameIsSpellingVariation || alternativeWordingIsSpellingVariation) {
      grounds.push('character-spelling-variation');
    }

    // [Checkpoint 2, grounds 'abbreviation-match' / 'synonym-match' /
    // 'translation-match' — additive, independent of every ground
    // above, same loop, same product] Each table is checked
    // separately, so a wording can fire more than one of these three
    // simultaneously if it happens to match via more than one curated
    // table — never merged into a single generic ground, per the
    // Authorization's own closed-enum, per-mechanism `grounds` values.
    if (firesViaTable(needle, needleAbbreviationCanonical, productNameNormalized, product.supplierWordings, ABBREVIATION_TABLE)) {
      grounds.push('abbreviation-match');
    }
    if (firesViaTable(needle, needleSynonymCanonical, productNameNormalized, product.supplierWordings, SYNONYM_TABLE)) {
      grounds.push('synonym-match');
    }
    if (firesViaTable(needle, needleTranslationCanonical, productNameNormalized, product.supplierWordings, TRANSLATION_TABLE)) {
      grounds.push('translation-match');
    }

    if (grounds.length > 0) {
      // [Checkpoint 1, Contradiction Check — post-union within this
      // mechanism's own candidates, per the Implementation Plan §2
      // aggregation contract: "runs once per candidate... after the
      // union step, never once per mechanism"] Checked once per
      // product, against that product's own canonical name only — a
      // contradicted product is excluded from this mechanism's own
      // returned candidates entirely (suppressed, per Acceptance
      // Criterion 2's "does not produce an un-flagged candidate");
      // `detectSupplierWordingContradictions` below exposes the same
      // finding separately, for callers (Checkpoint 3's UI) that need
      // to explain why.
      if (hasQuantityUnitContradiction(needle, productNameNormalized)) {
        continue;
      }
      candidates.push({ productId: product.id, grounds });
    }
  }

  return candidates;
}

/**
 * [Checkpoint 1, Contradiction Check] Companion to
 * `detectSupplierWordingCandidates` above — same iteration, same
 * per-product contradiction test, but returns the products that WERE
 * suppressed by it, instead of the ones that weren't. Deliberately a
 * separate function, not a second return value bolted onto
 * `detectSupplierWordingCandidates` (Acceptance Criterion 17: every
 * existing call site and test of that function must keep working,
 * unmodified, with its existing `SupplierWordingCandidate[]` shape).
 * Only reports a contradiction for a product that a positive ground
 * ((a)/(b)/(c)/'character-spelling-variation') would otherwise have
 * proposed — a product with no positive ground at all was never a
 * candidate in the first place, so there is nothing here to suppress
 * or explain.
 */
export function detectSupplierWordingContradictions(
  wording: string,
  existingProducts: Array<{
    id: string;
    name: string;
    supplierWordings?: Array<{ wording: string }>;
  }>
): SupplierWordingContradiction[] {
  const trimmed = wording.trim();
  if (!trimmed) return [];
  const needle = normalizeForCandidateDetection(trimmed);
  const needleUnitCanonical = canonicalizeUnitSpellings(needle);
  const needleAbbreviationCanonical = canonicalizeViaTable(needle, ABBREVIATION_TABLE);
  const needleSynonymCanonical = canonicalizeViaTable(needle, SYNONYM_TABLE);
  const needleTranslationCanonical = canonicalizeViaTable(needle, TRANSLATION_TABLE);
  const needleTokens = needle.split(' ').filter((t) => t.length > 0);
  const contradictions: SupplierWordingContradiction[] = [];

  for (const product of existingProducts) {
    const productNameNormalized = normalizeForCandidateDetection(product.name);
    const hasAnyPositiveGround =
      productNameNormalized === needle ||
      (product.supplierWordings ?? []).some((r) => normalizeForCandidateDetection(r.wording) === needle) ||
      (productNameNormalized !== needle && canonicalizeUnitSpellings(productNameNormalized) === needleUnitCanonical) ||
      (product.supplierWordings ?? []).some((r) => {
        const wn = normalizeForCandidateDetection(r.wording);
        return wn !== needle && canonicalizeUnitSpellings(wn) === needleUnitCanonical;
      }) ||
      isCharacterSpellingVariation(needleTokens, productNameNormalized.split(' ').filter((t) => t.length > 0)) ||
      (product.supplierWordings ?? []).some((r) =>
        isCharacterSpellingVariation(
          needleTokens,
          normalizeForCandidateDetection(r.wording).split(' ').filter((t) => t.length > 0)
        )
      ) ||
      firesViaTable(needle, needleAbbreviationCanonical, productNameNormalized, product.supplierWordings, ABBREVIATION_TABLE) ||
      firesViaTable(needle, needleSynonymCanonical, productNameNormalized, product.supplierWordings, SYNONYM_TABLE) ||
      firesViaTable(needle, needleTranslationCanonical, productNameNormalized, product.supplierWordings, TRANSLATION_TABLE);

    if (hasAnyPositiveGround && hasQuantityUnitContradiction(needle, productNameNormalized)) {
      contradictions.push({ productId: product.id, reason: 'quantity-unit-mismatch' });
    }
  }

  return contradictions;
}

/**
 * Reuse matching (Rule 8 Finding 5): determines whether an incoming
 * supplier wording is a repeat of an already-confirmed relationship
 * for the same supplier, per BDR-0013 item 3's "automatically
 * recognizes/reuses... without asking the owner to reconfirm."
 * Deliberately stricter than candidate detection — byte-exact,
 * whitespace-trimmed only, no further normalization (no case-folding,
 * no accent-stripping). This asymmetry is required, not incidental:
 * reuse is the one path in this capability with no owner review at
 * all, so a false-positive match here would silently misattach a
 * wording to the wrong product — exactly what BDR-0013 Decision 4/5
 * exist to prevent. Scoped to a single supplier's own already-confirmed
 * relationships only, per BDR-0013 item 3's "same wording from the
 * same supplier." Pure: no Firestore reads, no side effects, no write
 * of any kind — this function only answers "does a match already
 * exist," never establishes one.
 */
export function findExistingSupplierWordingMatch(
  wording: string,
  supplierRecordId: string,
  confirmedRelationshipsForSupplier: Array<{
    supplierRecordId: string;
    wording: string;
    productId: string;
  }>
): { productId: string } | null {
  const needle = wording.trim();
  if (!needle) {
    return null;
  }
  const match = confirmedRelationshipsForSupplier.find(
    (relationship) =>
      relationship.supplierRecordId === supplierRecordId &&
      relationship.wording.trim() === needle
  );
  return match ? { productId: match.productId } : null;
}
