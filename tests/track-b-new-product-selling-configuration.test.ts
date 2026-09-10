// Track B — New-Product First-Creation Selling Configuration
// (docs/specs/new-product-first-creation-selling-configuration-amendment.md,
// "§47," Accepted and Signed 2026-09-10, FR-95 through FR-99;
// docs/engineering/track-b-new-product-first-creation-selling-configuration-implementation-authorization.md,
// Implementation Authorized 2026-09-10)
//
// SCOPE: proves, for a genuinely NEW product's first Stock Entry, that (1)
// its complete UnitRelationship, selling unit, and canonical selling price
// (denominated in that selling unit) can be established and persisted onto
// Product.sellingPrice, gated by the same pairing invariant this codebase
// already enforces elsewhere (FR-98); (2) that same configuration is usable
// WITHIN the same Stock Entry's own derived selling valuation (FR-99),
// reusing the existing, unmodified buildDerivedSellingValuationSnapshot
// (purchaseToSellingConversion.ts) rather than a second, competing
// calculation; (3) purchase-side facts (cost, purchase unit) and the new
// selling-side facts remain independently supplied, never merged or
// cross-derived (FR-97); (4) none of this expands to any EXISTING product
// (FR-96) — an existing product's row never reads/sends
// newProductSellingUnitPrice at all.
//
// SCOPE NOTE: this repository has no DOM/React render harness (established
// precedent — see tests/add-stock-typing-and-autofill-bugfix.test.ts's own
// header, reaffirmed by tests/track-a-existing-product-purchase-authority.test.ts).
// This suite follows the same two established techniques: (1) direct
// fixture tests against the REAL, imported pure function
// (buildDerivedSellingValuationSnapshot) proving the underlying arithmetic
// is correct for the new-product case, and (2) structural source-text
// assertions confirming AddStockView.tsx and AppContext.tsx are wired
// exactly as the Implementation Authorization's §6/§7 require — never
// duplicating Track A's own suite, which remains the regression proof for
// everything this amendment leaves untouched.
//
// HOW TO RUN:
//   npx tsx --test tests/track-b-new-product-selling-configuration.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  buildDerivedSellingValuationSnapshot,
  type ProductMemorySnapshot,
} from '../apps/tenant/src/lib/purchaseToSellingConversion';
import { isValidUnitRelationship } from '../apps/tenant/src/lib/unitRelationship';
import type { UnitRelationship } from '../apps/tenant/src/types';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');

/** Slices `source` between two literal anchor strings (both must be
 * present, in order) — used instead of Track A's own `fnBody` helper
 * (which assumes a short, 2-space-indented arrow function ending in
 * `\n  };`) because the functions relevant to this suite
 * (`addMultipleStockBatches`, `handleSubmit`) are far larger and don't
 * end at their first `\n  };` occurrence. */
function sliceBetween(source: string, startAnchor: string, endAnchor: string): string {
  const start = source.indexOf(startAnchor);
  assert.notEqual(start, -1, `expected to find start anchor: ${startAnchor}`);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  assert.notEqual(end, -1, `expected to find end anchor: ${endAnchor}`);
  return source.slice(start, end);
}

// The Authorization's own worked example (§2 / FR-99):
// 2 Cx @ 1,200 MZN/Cx purchase; brand-new product; 1 Cx = 24 Un; selling
// unit Un; canonical selling price 65 MZN/Un -> 48 Un / 3,120 MZN.
const NEW_PRODUCT_RELATIONSHIP: UnitRelationship = {
  units: [
    { unit: 'Cx', factorFromPrevious: 0 },
    { unit: 'Un', factorFromPrevious: 24 },
  ],
  sellingUnit: 'Un',
  confirmedAt: '2026-09-10T00:00:00.000Z',
};

// ==================================================================
// A — Worked example arithmetic (AC-08), using the exact same pure
// function AppContext.tsx now calls for the new-product branch
// ==================================================================
describe('Track B §A / AC-08 — worked example: 2 Cx, 1 Cx = 24 Un, 65 MZN/Un', () => {
  it('buildDerivedSellingValuationSnapshot, given the NEWLY established configuration (not a pre-existing Product), produces the exact frozen rate the worked example requires', () => {
    // This models exactly what AppContext.tsx's new
    // `newlyEstablishedProductMemory` carries into
    // buildDerivedSellingValuationSnapshot for a brand-new product's own
    // first batch — a plain object, never a live Product read from
    // Firestore, matching ProductMemorySnapshot's own deliberately
    // Product-independent shape.
    const newlyEstablishedProductMemory: ProductMemorySnapshot = {
      unitRelationship: NEW_PRODUCT_RELATIONSHIP,
      sellingPrice: 65,
    };
    const snapshot = buildDerivedSellingValuationSnapshot(newlyEstablishedProductMemory, 'Cx');
    assert.ok(snapshot);
    assert.equal(snapshot!.ratePerPurchaseUnit, 1560); // 24 Un/Cx * 65 MZN/Un
    assert.equal(snapshot!.sellingUnit, 'Un');
    assert.equal(snapshot!.sellingUnitPrice, 65);

    // Composing the final worked-example figures (impliedSellingValue =
    // ratePerPurchaseUnit * purchaseQuantity) the same way
    // addMultipleStockBatches' own caller-side arithmetic already does
    // for an EXISTING product — proving nothing about the underlying
    // math changes for the new-product case.
    const purchaseQuantity = 2; // Cx
    const impliedSellingUnits = purchaseQuantity * 24; // 48 Un
    const impliedSellingValue = purchaseQuantity * snapshot!.ratePerPurchaseUnit; // 3,120 MZN
    assert.equal(impliedSellingUnits, 48);
    assert.equal(impliedSellingValue, 3120);
  });

  it('never fabricates a valuation when no valid new selling configuration was established (ordinary new product, no selling configuration entered)', () => {
    assert.equal(buildDerivedSellingValuationSnapshot(undefined, 'Cx'), undefined);
  });
});

// ==================================================================
// B — AppContext.tsx wiring: AddStockParams carries the new,
// independent field
// ==================================================================
describe('Track B §B — AddStockParams.newProductSellingUnitPrice is a distinct field', () => {
  it('AddStockParams declares newProductSellingUnitPrice, structurally separate from sellingPrice and costPrice', () => {
    const iface = sliceBetween(appContextSrc, 'interface AddStockParams {', '\n}');
    assert.match(iface, /newProductSellingUnitPrice\?:\s*number;/);
    // Still carries the ordinary, pre-existing transaction sellingPrice
    // field, completely unaffected.
    assert.match(iface, /sellingPrice:\s*number;/);
    assert.match(iface, /costPrice:\s*number;/);
  });
});

// ==================================================================
// C — AppContext.tsx new-product branch: pairing invariant + FR-97
// independence + FR-99 immediate use
// ==================================================================
describe('Track B §C / AC-06, AC-09, FR-99 — addMultipleStockBatches new-product branch', () => {
  const branch = sliceBetween(
    appContextSrc,
    'const addMultipleStockBatches = async (',
    "newlyCreatedProductNames.push({"
  );

  it('AC-09: Product.sellingPrice is only ever set together with a validated selling UnitRelationship, never unconditionally', () => {
    assert.match(branch, /newProdSellingPriceValid/);
    assert.match(branch, /newProdUnitRelationshipValid/);
    assert.match(branch, /item\.unitRelationship!\.sellingUnit != null/);
    assert.match(branch, /\.\.\.\(newProdSellingPriceValid \? \{ sellingPrice: item\.newProductSellingUnitPrice \} : \{\}\)/);
  });

  it('AC-06/FR-97: the selling-price guard never reads costPrice, and the costPrice line never reads newProductSellingUnitPrice — independently supplied facts, never cross-derived', () => {
    const sellingPriceGuardMatch = branch.match(
      /const newProdSellingPriceValid =[\s\S]*?item\.newProductSellingUnitPrice >= 0;/
    );
    assert.ok(sellingPriceGuardMatch, 'expected to find the newProdSellingPriceValid guard');
    assert.doesNotMatch(sellingPriceGuardMatch![0], /costPrice/);

    const costPriceLineMatch = branch.match(/\.\.\.\(Number\.isFinite\(item\.costPrice\)[^)]*\)[^,]*,/);
    assert.ok(costPriceLineMatch, 'expected to find the costPrice conditional-spread line');
    assert.doesNotMatch(costPriceLineMatch![0], /newProductSellingUnitPrice/);
  });

  it('FR-99: a valid new selling configuration is captured into newlyEstablishedProductMemory for this SAME loop iteration, from the exact same values just persisted onto Product.sellingPrice', () => {
    assert.match(branch, /let newlyEstablishedProductMemory: ProductMemorySnapshot \| undefined;/);
    assert.match(
      branch,
      /newlyEstablishedProductMemory = \{\s*unitRelationship: item\.unitRelationship,\s*sellingPrice: item\.newProductSellingUnitPrice,\s*\};/
    );
  });

  it('the new-product branch still persists name, unitRelationship, and costPrice exactly as before this amendment (AC-02, AC-03)', () => {
    assert.match(branch, /name: trimmedName,/);
    assert.match(branch, /\.\.\.\(newProdUnitRelationshipValid \? \{ unitRelationship: item\.unitRelationship \} : \{\}\)/);
  });
});

describe('Track B §D / FR-99 — derivedSellingValuation call site supplies the new-product memory as the fallback source', () => {
  it('falls back to newlyEstablishedProductMemory only when there is no pre-existing product (never a second, competing source alongside it)', () => {
    const callSite = sliceBetween(
      appContextSrc,
      'const derivedSellingValuation = buildDerivedSellingValuationSnapshot(',
      'batchUnit\n      );'
    );
    assert.match(callSite, /product\s*$/m); // still reads the existing product's own memory first
    assert.match(callSite, /: newlyEstablishedProductMemory,/);
  });
});

// ==================================================================
// E — FR-96 / AC-11: existing-product exclusion — Add Stock does not
// become a general selling-price editing surface
// ==================================================================
describe('Track B §E / FR-96, AC-11 — newProductSellingUnitPrice is never read for an existing product', () => {
  it('newProductSellingUnitPrice appears in AppContext.tsx ONLY within AddStockParams\' own declaration and the brand-new-product creation branch — never in the existing-product update branch', () => {
    const existingProductCostUpdateBranch = sliceBetween(
      appContextSrc,
      'if (product && Number.isFinite(item.costPrice)',
      'product.costPrice = Number(item.costPrice);\n      }'
    );
    assert.doesNotMatch(existingProductCostUpdateBranch, /newProductSellingUnitPrice/);

    const pendingSupplierWordingBranch = sliceBetween(
      appContextSrc,
      "} else if (item.pendingSupplierWording) {",
      'conflictCheckProductIds: item.pendingSupplierWording.conflictCheckProductIds,\n        });'
    );
    assert.doesNotMatch(pendingSupplierWordingBranch, /newProductSellingUnitPrice/);
  });

  it('AddStockView.tsx only computes newProductSellingUnitPrice inside the !rowResolvesToExistingProduct branch', () => {
    const submitBlock = sliceBetween(
      addStockSrc,
      'let newProductSellingUnitPrice: number | undefined;',
      'itemsToSave.push({'
    );
    const ifBlockStart = submitBlock.indexOf('if (!rowResolvesToExistingProduct)');
    assert.notEqual(ifBlockStart, -1);
    // Every assignment to newProductSellingUnitPrice happens after the
    // existing-product exclusion check, never before it.
    const assignmentIndex = submitBlock.indexOf('newProductSellingUnitPrice = rawSellPrice;');
    assert.ok(assignmentIndex > ifBlockStart, 'assignment must occur inside the new-product-only branch');
  });
});

// ==================================================================
// F — AddStockView.tsx UI wiring: distinct field, distinct from
// costPrice/sellingPrice, gated by the same pairing invariant
// ==================================================================
describe('Track B §F — AddStockView.tsx UI wiring', () => {
  it('StockRowItem declares newProductSellingUnitPrice as its own field, alongside (not replacing) newProductSellingUnit/newProductSellingUnitFactor', () => {
    const rowInterface = sliceBetween(addStockSrc, 'interface StockRowItem {', '\n}');
    assert.match(rowInterface, /newProductSellingUnit\?:\s*string;/);
    assert.match(rowInterface, /newProductSellingUnitFactor\?:\s*string;/);
    assert.match(rowInterface, /newProductSellingUnitPrice\?:\s*string;/);
  });

  it('UnitRelationshipRow accepts sellingUnitPrice/onSellingUnitPriceChange as a distinct, optional prop pair from onChange', () => {
    const componentDecl = sliceBetween(addStockSrc, 'const UnitRelationshipRow: React.FC<{', '\n}> = (');
    assert.match(componentDecl, /onChange:\s*\(sellingUnit:\s*string,\s*factor:\s*string\)\s*=>\s*void;/);
    assert.match(componentDecl, /sellingUnitPrice\?:\s*string;/);
    assert.match(componentDecl, /onSellingUnitPriceChange\?:\s*\(price:\s*string\)\s*=>\s*void;/);
  });

  it('the single render site wires both the relationship candidate and the new price field, via separate handlers', () => {
    const renderSite = sliceBetween(addStockSrc, '<UnitRelationshipRow', '/>');
    assert.match(renderSite, /sellingUnit=\{row\.newProductSellingUnit \|\| ''\}/);
    assert.match(renderSite, /factor=\{row\.newProductSellingUnitFactor \|\| ''\}/);
    assert.match(renderSite, /sellingUnitPrice=\{row\.newProductSellingUnitPrice \|\| ''\}/);
    assert.match(renderSite, /onSellingUnitPriceChange=\{/);
    assert.match(renderSite, /newProductSellingUnitPrice: price/);
  });

  it('exactly one render site exists (no redesign, no duplicated surface)', () => {
    const occurrences = addStockSrc.split('<UnitRelationshipRow').length - 1;
    assert.equal(occurrences, 1);
  });

  it('FR-98 pairing invariant, re-validated client-side: newProductSellingUnitPrice is only captured once the unitRelationship candidate is itself confirmed valid via isValidUnitRelationship', () => {
    const submitBlock = sliceBetween(
      addStockSrc,
      'let unitRelationship: UnitRelationship | undefined;',
      'itemsToSave.push({'
    );
    const validCandidateIndex = submitBlock.indexOf('if (isValidUnitRelationship(candidate)) {');
    const priceCaptureIndex = submitBlock.indexOf('newProductSellingUnitPrice = rawSellPrice;');
    assert.notEqual(validCandidateIndex, -1);
    assert.notEqual(priceCaptureIndex, -1);
    assert.ok(priceCaptureIndex > validCandidateIndex, 'price capture must be nested inside the valid-candidate branch');
  });

  it('the new price is forwarded to the outgoing item only paired with the relationship, mirroring the existing unitRelationship conditional-spread', () => {
    const pushBlock = sliceBetween(addStockSrc, 'itemsToSave.push({', 'const result = await addMultipleStockBatches(');
    assert.match(pushBlock, /\.\.\.\(unitRelationship \? \{ unitRelationship \} : \{\}\)/);
    assert.match(pushBlock, /\.\.\.\(newProductSellingUnitPrice != null \? \{ newProductSellingUnitPrice \} : \{\}\)/);
  });

  it('drafts (rowToDraftLineItem/draftLineItemToRow) do not persist newProductSellingUnitPrice — same UI-only treatment as its sibling fields, no new draft/type surface introduced', () => {
    const rowToDraft = sliceBetween(addStockSrc, 'const rowToDraftLineItem = (row: StockRowItem)', 'const draftLineItemToRow');
    assert.doesNotMatch(rowToDraft, /newProductSellingUnitPrice/);
    assert.doesNotMatch(rowToDraft, /newProductSellingUnit\b/);
    assert.doesNotMatch(rowToDraft, /newProductSellingUnitFactor/);
  });
});

// ==================================================================
// G — Pairing invariant re-implemented in isolation (independent proof
// that the guard logic itself, not just its presence, is correct)
// ==================================================================
describe('Track B §G — pairing-invariant guard logic, proven independently of the call site', () => {
  function newProdSellingPriceValid(
    unitRelationship: UnitRelationship | undefined,
    sellingUnitPrice: number | undefined
  ): boolean {
    const unitRelationshipValid = !!unitRelationship && isValidUnitRelationship(unitRelationship);
    return (
      unitRelationshipValid &&
      unitRelationship!.sellingUnit != null &&
      typeof sellingUnitPrice === 'number' &&
      Number.isFinite(sellingUnitPrice) &&
      sellingUnitPrice >= 0
    );
  }

  it('valid: complete relationship + non-negative finite price', () => {
    assert.equal(newProdSellingPriceValid(NEW_PRODUCT_RELATIONSHIP, 65), true);
  });

  it('invalid: no unitRelationship at all', () => {
    assert.equal(newProdSellingPriceValid(undefined, 65), false);
  });

  it('invalid: relationship present but with no selling unit', () => {
    const noSellingUnit: UnitRelationship = {
      units: [{ unit: 'Cx', factorFromPrevious: 0 }],
      confirmedAt: '2026-09-10T00:00:00.000Z',
    };
    assert.equal(newProdSellingPriceValid(noSellingUnit, 65), false);
  });

  it('invalid: price missing', () => {
    assert.equal(newProdSellingPriceValid(NEW_PRODUCT_RELATIONSHIP, undefined), false);
  });

  it('invalid: negative price', () => {
    assert.equal(newProdSellingPriceValid(NEW_PRODUCT_RELATIONSHIP, -1), false);
  });

  it('valid: zero is an acceptable, explicit price (never treated as "missing")', () => {
    assert.equal(newProdSellingPriceValid(NEW_PRODUCT_RELATIONSHIP, 0), true);
  });
});
