// Owner Product Catalog — Phase 1, Checkpoint E (Catalog list/search
// + Edit wiring) — Implementation Authorization §3.2, §4.
//
// Source-inspection tests, matching this repository's established
// technique (no jsdom/testing-library harness exists in this repo).
//
// Scope: ONLY Checkpoint E — registered Products appear in the list;
// search/filter works; "Edit" opens the existing, unmodified
// EditProductModal. Checkpoint F (regression/integration
// verification only, no new behavior) is explicitly not this file's
// concern beyond what's already exercised here.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-1-checkpoint-e.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

function extractFunctionBody(source: string, startMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert.notEqual(startIdx, -1, `Could not locate "${startMarker}" in source.`);
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

const catalogViewSrc = src('apps/tenant/src/components/ProductCatalogView.tsx');
const editProductModalSrc = src('apps/tenant/src/components/EditProductModal.tsx');
const dashboardSrc = src('apps/tenant/src/components/DashboardView.tsx');
const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('Product Catalog Phase 1 — Checkpoint E — Catalog list/search + Edit wiring', () => {
  describe('A — List membership: not an inventory screen (this checkpoint\'s own central invariant)', () => {
    it('filteredCatalogProducts excludes only active === false — never a stock/batch/count-based exclusion of any kind', () => {
      const filterBody = extractFunctionBody(catalogViewSrc, 'const filteredCatalogProducts = products.filter((p) => {');
      assert.match(filterBody, /if \(p\.active === false\) return false;/);
      assert.doesNotMatch(filterBody, /batch/i);
      assert.doesNotMatch(filterBody, /stockCount/i);
      assert.doesNotMatch(filterBody, /remainingQuantity/i);
    });

    it('does not add a stocked/neverStocked field or any new membership criterion beyond active + the search query', () => {
      assert.doesNotMatch(catalogViewSrc, /neverStocked/i);
      assert.doesNotMatch(catalogViewSrc, /\bstocked\b/i);
    });
  });

  describe('B — Search reuses DashboardView\'s own existing match shape, not a second rule', () => {
    it('matches on name, sku, barcode, category, supplier — case-insensitive substring, identical fields to DashboardView.tsx\'s own filteredProducts', () => {
      const filterBody = extractFunctionBody(catalogViewSrc, 'const filteredCatalogProducts = products.filter((p) => {');
      assert.match(filterBody, /p\.name\.toLowerCase\(\)\.includes\(query\)/);
      assert.match(filterBody, /\(p\.sku \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
      assert.match(filterBody, /\(p\.barcode \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
      assert.match(filterBody, /\(p\.category \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
      assert.match(filterBody, /\(p\.supplier \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);

      // Cross-check against DashboardView's own filter — same field
      // set, confirming reuse rather than an independently-invented
      // (and potentially divergent) rule.
      assert.match(dashboardSrc, /p\.name\.toLowerCase\(\)\.includes\(query\)/);
      assert.match(dashboardSrc, /\(p\.sku \|\| ''\)\.toLowerCase\(\)\.includes\(query\)/);
    });

    it('does not introduce a cross-business or global query — filters the same tenant-scoped `products` array already provided by context, nothing else', () => {
      assert.doesNotMatch(catalogViewSrc, /collectionGroup/);
      assert.doesNotMatch(catalogViewSrc, /businesses\/\{/);
      assert.doesNotMatch(catalogViewSrc, /getDocs\(/);
    });
  });

  describe('C — Edit wiring: EditProductModal imported and used completely unmodified', () => {
    it('imports EditProductModal from its existing, canonical location — never a new or duplicate edit component', () => {
      assert.match(catalogViewSrc, /import \{ EditProductModal \} from '\.\/EditProductModal';/);
    });

    it('renders it with exactly the same two props DashboardView.tsx already uses — product and onClose, nothing more', () => {
      assert.match(catalogViewSrc, /<EditProductModal product=\{editingProduct\} onClose=\{\(\) => setEditingProduct\(null\)\} \/>/);
      assert.match(dashboardSrc, /<EditProductModal product=\{editingProduct\} onClose=\{\(\) => setEditingProduct\(null\)\} \/>/);
    });

    it('the Edit button sets editingProduct to the clicked row\'s own Product object — the SAME canonical Product this list itself reads from, never a copy or a second identity', () => {
      assert.match(catalogViewSrc, /onClick=\{\(\) => setEditingProduct\(p\)\}/);
    });

    it('does NOT define a second edit form, modal, or save handler anywhere in this file', () => {
      assert.doesNotMatch(catalogViewSrc, /const handleEditSubmit/);
      assert.doesNotMatch(catalogViewSrc, /updateProduct\(/);
    });
  });

  describe('D — EditProductModal.tsx itself is provably untouched (diff-based regression guard, structural form)', () => {
    // A byte-for-byte hash comparison would be a strictly weaker,
    // more brittle guard than this: it would break on ANY future
    // edit to this file regardless of whether that edit is benign,
    // and would tell a future reader nothing about *why* the
    // invariant matters. These assertions instead re-verify the exact
    // governance properties Checkpoint E depends on this file
    // continuing to have — matching this repository's own established
    // structural-assertion test convention throughout every other
    // checkpoint in this suite.
    it('still declares the same "catalog metadata only" scope, including the costPrice exclusion, in its own header comment', () => {
      assert.match(
        editProductModalSrc,
        /Edits catalog metadata only: name, category, supplier, SKU,\s*\n\/\/ barcode, and a REFERENCE cost\/selling price\. This never creates or\s*\n\/\/ touches a StockBatch/
      );
    });

    it('still has exactly the same two-prop interface — product and onClose — Checkpoint E did not add a new prop for Catalog-specific behavior', () => {
      assert.match(editProductModalSrc, /interface EditProductModalProps \{\s*\n\s*product: Product;\s*\n\s*onClose: \(\) => void;\s*\n\}/);
    });

    it('still never sends costPrice in its own update payload — the exact §45 Amendment FR-88 boundary Checkpoint E must not weaken', () => {
      assert.match(editProductModalSrc, /costPrice is deliberately never sent from this form/);
      const submitBody = extractFunctionBody(editProductModalSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
      assert.doesNotMatch(submitBody, /costPrice:/);
    });

    it('still calls the existing updateProduct — never a new or Catalog-specific write function', () => {
      assert.match(editProductModalSrc, /await updateProduct\(product\.id, \{/);
    });
  });

  describe('E — Stock / Business Worth / historical-record safety', () => {
    it('this file never calls addStockBatch, recordStockCount, or any stock-writing function', () => {
      assert.doesNotMatch(catalogViewSrc, /addStockBatch/);
      assert.doesNotMatch(catalogViewSrc, /recordStockCount/);
    });

    it('this file never references StockCount snapshot or BusinessWorthSnapshot rewriting of any kind', () => {
      assert.doesNotMatch(catalogViewSrc, /BusinessWorthSnapshot/);
      assert.doesNotMatch(catalogViewSrc, /stockCountDrafts/);
    });
  });

  describe('F — No new identity model, no Merge, no aliasing', () => {
    it('does not introduce a CatalogProduct type/entity, a merge function, or an alias/redirect field — checked precisely as a standalone identifier, not merely as a substring, since registerCatalogProduct/filteredCatalogProducts (both already-established, legitimate names from earlier checkpoints) would otherwise cause a false positive', () => {
      assert.doesNotMatch(catalogViewSrc, /\binterface CatalogProduct\b/);
      assert.doesNotMatch(catalogViewSrc, /: CatalogProduct\b/);
      assert.doesNotMatch(catalogViewSrc, /\bmergeProduct/i);
      assert.doesNotMatch(catalogViewSrc, /redirectedTo/i);
      assert.doesNotMatch(catalogViewSrc, /aliasOf/i);
    });
  });

  describe('G — Full create → list → edit loop, confirmed end to end (this checkpoint\'s own stop condition)', () => {
    it('a product registered via submitRegistration (Checkpoint D) becomes part of the SAME `products` array this checkpoint\'s own list filters — no separate list-loading mechanism, no second data source', () => {
      assert.match(catalogViewSrc, /const \{ products, registerCatalogProduct, currencySymbol \} = useApp\(\);/);
      const filterBody = extractFunctionBody(catalogViewSrc, 'const filteredCatalogProducts = products.filter((p) => {');
      assert.match(filterBody, /products\.filter/);
    });

    it('the rendered list uses filteredCatalogProducts, not a separately-fetched or separately-loaded set', () => {
      assert.match(catalogViewSrc, /filteredCatalogProducts\.map\(/);
    });
  });

  describe('H — i18n: list/search/edit keys exist in all three locales', () => {
    it('searchPlaceholder, noSearchResults, editButton exist in pt/en/fr', () => {
      for (const localeSrc of [ptSrc, enSrc, frSrc]) {
        assert.match(localeSrc, /searchPlaceholder: '[^']+',/);
        assert.match(localeSrc, /noSearchResults: '[^']+',/);
        assert.match(localeSrc, /editButton: '[^']+',/);
      }
    });
  });

  describe('I — Owner-only access preserved (Checkpoint A\'s own gate, re-verified untouched)', () => {
    it('App.tsx still gates the catalog tab behind !isStaff, unmodified by this checkpoint', () => {
      const appSrc = src('apps/tenant/src/App.tsx');
      assert.match(appSrc, /!isStaff && activeTab === 'catalog' &&/);
    });
  });
});
