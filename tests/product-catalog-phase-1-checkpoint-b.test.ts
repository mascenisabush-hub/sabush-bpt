// Owner Product Catalog — Phase 1, Checkpoint B (Product registration
// write path) — Implementation Authorization §3.2, §4.
//
// Source-inspection tests, matching this repository's established
// technique for AppContext.tsx-based functions (no @testing-library/
// react or jsdom harness exists in this repo, and this function lives
// inside the provider closure, not independently importable — every
// assertion here is a precise structural/source-text check against
// registerCatalogProduct's own function body, not a rendered-DOM or
// live-Firestore check; see tests/business-worth-correction-recovery-
// ui.test.ts's own header for the same repository-wide convention).
//
// Scope: ONLY Checkpoint B — the write path itself, not yet wired to
// any UI. Checkpoint C (registration form/validation UI) and
// Checkpoint D (identity-resolution UI) are explicitly NOT covered
// here — they belong to their own, later, separately-authorized
// checkpoints. This suite therefore intentionally also asserts that
// ProductCatalogView.tsx (Checkpoint C's own file) remains untouched
// by this checkpoint's work.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-1-checkpoint-b.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

function extractFunctionBody(source: string, startMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert.notEqual(startIdx, -1, `Could not locate "${startMarker}" in source.`);
  // Balanced-brace scan from the function's own BODY opening brace
  // (after `=>`, if this marker is a function signature), not the
  // first `{` following the marker — a marker ending in a
  // destructured-params opening brace (e.g. `async ({`) would
  // otherwise cause the scan to stop at that destructuring's own
  // closing `}`, well before the actual function body. Bounded to a
  // small window right after the marker so a plain `interface Foo {`
  // marker (no `=>` at all nearby) correctly falls back to its own
  // very next `{`, rather than accidentally matching some unrelated
  // arrow function far later in the file.
  const nearbyWindow = source.slice(startIdx, startIdx + 400);
  const arrowOffset = nearbyWindow.indexOf('=>');
  const searchFrom = arrowOffset === -1 ? startIdx : startIdx + arrowOffset;
  const braceStart = source.indexOf('{', searchFrom);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return source.slice(startIdx, i + 1);
}

const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
const catalogViewSrc = src('apps/tenant/src/components/ProductCatalogView.tsx');
const fnBody = extractFunctionBody(appContextSrc, 'const registerCatalogProduct = async ({');

describe('Product Catalog Phase 1 — Checkpoint B — Product registration write path', () => {
  describe('A — RegisterCatalogProductParams: exactly the six authorized fields, no more', () => {
    it('the interface declares name, sellingPrice, category, supplier, sku, barcode, confirmedNewProduct — and nothing else', () => {
      const ifaceBody = extractFunctionBody(appContextSrc, 'interface RegisterCatalogProductParams');
      assert.match(ifaceBody, /name: string;/);
      assert.match(ifaceBody, /sellingPrice: number;/);
      assert.match(ifaceBody, /category\?: string;/);
      assert.match(ifaceBody, /supplier\?: string;/);
      assert.match(ifaceBody, /sku\?: string;/);
      assert.match(ifaceBody, /barcode\?: string;/);
      assert.match(ifaceBody, /confirmedNewProduct\?: boolean;/);
      assert.doesNotMatch(ifaceBody, /costPrice/);
      assert.doesNotMatch(ifaceBody, /unitRelationship/);
      assert.doesNotMatch(ifaceBody, /quantity/);
    });

    it('is exposed on the context type and the provider value object, exactly like updateProduct immediately above it', () => {
      assert.match(appContextSrc, /registerCatalogProduct: \(params: RegisterCatalogProductParams\) => Promise<string>;/);
      assert.match(appContextSrc, /^        registerCatalogProduct,$/m);
    });
  });

  describe('B — Required-field validation', () => {
    it('rejects an empty/whitespace-only name before any Firestore write', () => {
      const nameCheckIdx = fnBody.indexOf('if (!trimmedName)');
      const firstWriteIdx = fnBody.indexOf('await setDoc(');
      assert.notEqual(nameCheckIdx, -1, 'Expected an explicit empty-name guard.');
      assert.ok(nameCheckIdx < firstWriteIdx, 'The name guard must run before the write.');
      assert.match(fnBody, /const trimmedName = name\.trim\(\);\s*\n\s*if \(!trimmedName\) \{\s*\n\s*throw new Error\(/);
    });

    it('rejects a missing/invalid/negative sellingPrice using the same Number.isFinite + >= 0 shape addStockBatch already uses for costPrice, before any Firestore write', () => {
      const priceCheckIdx = fnBody.indexOf('if (!Number.isFinite(sellingPrice)');
      const firstWriteIdx = fnBody.indexOf('await setDoc(');
      assert.notEqual(priceCheckIdx, -1);
      assert.ok(priceCheckIdx < firstWriteIdx);
      assert.match(fnBody, /if \(!Number\.isFinite\(sellingPrice\) \|\| sellingPrice < 0\) \{\s*\n\s*throw new Error\(/);
    });

    it('a valid name + sellingPrice reaches the actual Product write (no further gate blocks the happy path)', () => {
      // Exactly four throw sites in the whole function: no active
      // business, empty name, invalid price, and unresolved identity —
      // confirmed by an exhaustive count, not merely individual
      // presence checks. No other gate exists between validation and
      // the write.
      const throwCount = (fnBody.match(/throw new Error\(/g) || []).length;
      assert.equal(throwCount, 4, 'Expected exactly four throw sites: no active business, empty name, invalid price, unresolved identity.');
    });
  });

  describe('C — No silent duplicate creation (reuses the existing safety boundary, does not invent a second one)', () => {
    it('looks up an existing product by exact case-insensitive name match, mirroring addStockBatch\'s own identical lookup', () => {
      assert.match(fnBody, /const existing = products\.find\(\(p\) => p\.name\.toLowerCase\(\) === trimmedName\.toLowerCase\(\)\);/);
    });

    it('throws when a match exists and confirmedNewProduct was not explicitly set — never silently creates a duplicate', () => {
      assert.match(fnBody, /if \(existing\) \{\s*\n\s*if \(!confirmedNewProduct\) \{\s*\n\s*throw new Error\(/);
    });

    it('even with confirmedNewProduct explicitly true, a name match still returns the EXISTING product\'s id rather than creating a second Product — defense in depth, confirmed structurally: the setDoc call is unreachable from inside the `if (existing)` branch', () => {
      const existingBranch = fnBody.slice(fnBody.indexOf('if (existing) {'), fnBody.indexOf('const productId ='));
      assert.match(existingBranch, /return existing\.id;/);
      assert.doesNotMatch(existingBranch, /setDoc/);
    });
  });

  describe('D — Cost-price boundary (mandatory Checkpoint B invariant)', () => {
    it('the function body never references costPrice, under any name or form', () => {
      assert.doesNotMatch(fnBody, /costPrice/);
    });

    it('the written Product object literal contains exactly: id, name, createdAt, sellingPrice, and conditionally category/supplier/sku/barcode — nothing else', () => {
      const literalMatch = fnBody.match(/const newProduct: Product = \{([\s\S]*?)\};/);
      assert.ok(literalMatch, 'Expected the newProduct object literal.');
      const literal = literalMatch![1];
      assert.match(literal, /id: productId,/);
      assert.match(literal, /name: trimmedName,/);
      assert.match(literal, /createdAt: new Date\(\)\.toISOString\(\),/);
      assert.match(literal, /sellingPrice: Number\(sellingPrice\),/);
      assert.match(literal, /\.\.\.\(category\?\.trim\(\) \? \{ category: category\.trim\(\) \} : \{\}\),/);
      assert.match(literal, /\.\.\.\(supplier\?\.trim\(\) \? \{ supplier: supplier\.trim\(\) \} : \{\}\),/);
      assert.match(literal, /\.\.\.\(sku\?\.trim\(\) \? \{ sku: sku\.trim\(\) \} : \{\}\),/);
      assert.match(literal, /\.\.\.\(barcode\?\.trim\(\) \? \{ barcode: barcode\.trim\(\) \} : \{\}\),/);
      // Exactly 4 conditional spreads + 4 unconditional fields = 8 own
      // lines inside the literal — a stronger, exhaustive count, not
      // merely a set of individual presence checks.
      const fieldLines = literal.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      assert.equal(fieldLines.length, 8, `Expected exactly 8 lines in the object literal, found ${fieldLines.length}: ${JSON.stringify(fieldLines)}`);
    });

    it('never sets active or unitRelationship — matching addStockBatch\'s own convention for a first-time product (absence is not an error state)', () => {
      assert.doesNotMatch(fnBody, /active:/);
      assert.doesNotMatch(fnBody, /unitRelationship/);
    });
  });

  describe('E — Stock separation (mandatory Checkpoint B invariant)', () => {
    it('the function body never references the batches or stockCounts collections, in any form', () => {
      assert.doesNotMatch(fnBody, /batches/);
      assert.doesNotMatch(fnBody, /stockCounts/);
      assert.doesNotMatch(fnBody, /StockBatch/);
      assert.doesNotMatch(fnBody, /StockCount/);
    });

    it('performs exactly one Firestore write in its entire body — a single setDoc, nothing else', () => {
      const setDocCount = (fnBody.match(/setDoc\(/g) || []).length;
      const otherWriteCount = (fnBody.match(/updateDoc\(|addDoc\(|deleteDoc\(|writeBatch\(|runTransaction\(/g) || []).length;
      assert.equal(setDocCount, 1, 'Expected exactly one setDoc call.');
      assert.equal(otherWriteCount, 0, 'Expected no other Firestore write of any kind.');
    });
  });

  describe('F — Tenant isolation', () => {
    it('requires an active business and writes to the exact existing tenant-scoped Product path, identical in shape to addStockBatch\'s own write', () => {
      assert.match(fnBody, /if \(!activeBusinessId\) throw new Error\('Sem negócio associado\.'\);/);
      assert.match(fnBody, /const businessId = activeBusinessId;/);
      assert.match(fnBody, /await setDoc\(doc\(db, 'businesses', businessId, 'products', productId\), newProduct\);/);
    });
  });

  describe('G — Regression: existing Product creation paths are untouched', () => {
    it('addStockBatch\'s own Product-creation block (including its costPrice memory write) is byte-for-byte present, unmodified', () => {
      assert.match(
        appContextSrc,
        /productId = 'prod-' \+ Date\.now\(\) \+ '-' \+ Math\.random\(\)\.toString\(36\)\.substr\(2, 4\);/
      );
      assert.match(appContextSrc, /\.\.\.\(Number\.isFinite\(costPrice\) && costPrice >= 0 \? \{ costPrice: Number\(costPrice\) \} : \{\}\),/);
    });

    it('updateProduct itself is unmodified — still the same generic, unrestricted Partial<Product> updater; Checkpoint B did not add a costPrice guard to it', () => {
      const updateProductBody = extractFunctionBody(appContextSrc, 'const updateProduct = async (id: string, updates: Partial<Product>) => {');
      assert.match(updateProductBody, /const payload: Partial<Product> = \{ \.\.\.updates, updatedAt: new Date\(\)\.toISOString\(\) \};/);
    });

    it('recordStockCount is untouched (a lighter existence check — full behavioral coverage belongs to its own existing test suites, not duplicated here)', () => {
      assert.match(appContextSrc, /const recordStockCount = async \(/);
    });
  });

  describe('H — Not yet wired to any UI (Checkpoint B\'s own stop condition)', () => {
    it('ProductCatalogView.tsx (Checkpoint C\'s own file) does not call registerCatalogProduct — the function exists in isolation, unconnected to any screen', () => {
      assert.doesNotMatch(catalogViewSrc, /registerCatalogProduct/);
    });

    it('no other component in the tenant app calls registerCatalogProduct either', () => {
      // A light repo-wide check via the same file this test already
      // has loaded, plus AddStockView/PeriodicStockCountView — the
      // only other screens with any product-creation involvement at
      // all, confirmed as the right scope by the Implementation Plan's
      // own file-scope table (§12).
      const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
      const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
      assert.doesNotMatch(addStockSrc, /registerCatalogProduct/);
      assert.doesNotMatch(periodicSrc, /registerCatalogProduct/);
    });
  });
});
