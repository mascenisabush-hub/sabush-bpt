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

/** A candidate product a supplier wording might refer to, with the
 * ground(s) that make it plausible. Detection only — being returned
 * here is never itself a decision (BDR-0013 Decision 4); the owner
 * still confirms or declines every candidate this surfaces. */
export interface SupplierWordingCandidate {
  productId: string;
  /** Which candidate ground(s) fired, per POL-0007's Candidate Grounds
   * section — a wording may match on multiple grounds simultaneously.
   * 'unit-spelling-equivalence' is ground (c), added by POL-0011 /
   * product-identity-alternative-name-specification-unit-spelling-amendment.md. */
  grounds: Array<'initial-stock-name' | 'existing-alternative-wording' | 'unit-spelling-equivalence'>;
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
  const candidates: SupplierWordingCandidate[] = [];

  for (const product of existingProducts) {
    const grounds: SupplierWordingCandidate['grounds'] = [];

    if (normalizeForCandidateDetection(product.name) === needle) {
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
    const productNameNormalized = normalizeForCandidateDetection(product.name);
    const nameMatchesViaUnitSpelling =
      productNameNormalized !== needle && canonicalizeUnitSpellings(productNameNormalized) === needleUnitCanonical;
    const alternativeWordingMatchesViaUnitSpelling = (product.supplierWordings ?? []).some((relationship) => {
      const wordingNormalized = normalizeForCandidateDetection(relationship.wording);
      return wordingNormalized !== needle && canonicalizeUnitSpellings(wordingNormalized) === needleUnitCanonical;
    });
    if (nameMatchesViaUnitSpelling || alternativeWordingMatchesViaUnitSpelling) {
      grounds.push('unit-spelling-equivalence');
    }

    if (grounds.length > 0) {
      candidates.push({ productId: product.id, grounds });
    }
  }

  return candidates;
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
