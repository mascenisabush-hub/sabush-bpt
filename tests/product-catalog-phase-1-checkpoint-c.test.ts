// Owner Product Catalog — Phase 1, Checkpoint C (Registration form +
// validation) — Implementation Authorization §3.2, §4.
//
// Source-inspection tests, matching this repository's established
// technique (no jsdom/testing-library harness exists in this repo).
//
// Scope: ONLY Checkpoint C — the form itself, validated, NOT yet
// wired to registerCatalogProduct (per the Implementation Plan's own
// literal Checkpoint C definition: "does NOT yet call
// registerCatalogProduct — submission is a no-op or logs only").
// Checkpoint D (identity resolution + actually reaching the write
// path) is explicitly NOT covered here.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-1-checkpoint-c.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const catalogViewSrc = src('apps/tenant/src/components/ProductCatalogView.tsx');
const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('Product Catalog Phase 1 — Checkpoint C — Registration form + validation', () => {
  describe('A — Form presence: exactly the six authorized fields, nothing else', () => {
    it('renders name, sellingPrice, category, supplier, sku, barcode controlled inputs', () => {
      assert.match(catalogViewSrc, /value=\{name\}/);
      assert.match(catalogViewSrc, /value=\{sellingPrice\}/);
      assert.match(catalogViewSrc, /value=\{category\}/);
      assert.match(catalogViewSrc, /value=\{supplier\}/);
      assert.match(catalogViewSrc, /value=\{sku\}/);
      assert.match(catalogViewSrc, /value=\{barcode\}/);
    });

    it('has exactly six input elements in the form — no extra field was added', () => {
      const inputCount = (catalogViewSrc.match(/<input\b/g) || []).length;
      assert.equal(inputCount, 6, `Expected exactly 6 <input> elements, found ${inputCount}.`);
    });

    it('does NOT contain a purchase-cost field, input, or state variable, in any form (checked outside this file\'s own explanatory comments, which legitimately name the excluded field to document why it is absent)', () => {
      const codeOnly = catalogViewSrc
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      assert.doesNotMatch(codeOnly, /costPrice/);
    });

    it('does NOT contain a stock/purchase quantity field (checked outside comments, same reasoning as above)', () => {
      const codeOnly = catalogViewSrc
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      assert.doesNotMatch(codeOnly, /\bquantity\b/i);
      assert.doesNotMatch(codeOnly, /stockCount/i);
      assert.doesNotMatch(codeOnly, /purchaseUnit/i);
    });

    it('does NOT contain UnitRelationship configuration UI', () => {
      assert.doesNotMatch(catalogViewSrc, /unitRelationship/i);
      assert.doesNotMatch(catalogViewSrc, /UnitRelationshipChainEditor/);
    });

    it('does NOT contain Merge controls', () => {
      assert.doesNotMatch(catalogViewSrc, /[Mm]erge/);
    });

    it('does NOT contain Never-Stocked/Out-of-Stock status controls', () => {
      assert.doesNotMatch(catalogViewSrc, /[Nn]ever[- ][Ss]tocked/);
      assert.doesNotMatch(catalogViewSrc, /[Oo]ut[- ]of[- ][Ss]tock/);
    });
  });

  describe('B — Validation', () => {
    it('the validate function rejects an empty/whitespace-only trimmed name, setting an error state, before the payload is ever constructed', () => {
      assert.match(catalogViewSrc, /const trimmedName = name\.trim\(\);\s*\n\s*if \(!trimmedName\) \{\s*\n\s*setNameError\(/);
    });

    it('the validate function rejects a missing/invalid/negative sellingPrice using the same Number.isFinite + >= 0 shape registerCatalogProduct itself already enforces (Checkpoint B), not a different rule', () => {
      assert.match(catalogViewSrc, /!Number\.isFinite\(parsedPrice\) \|\| parsedPrice < 0/);
    });

    it('handleSubmit calls validate() and returns early on failure, before constructing any payload', () => {
      assert.match(catalogViewSrc, /const handleSubmit = \(e: React\.FormEvent\) => \{\s*\n\s*e\.preventDefault\(\);\s*\n\s*if \(!validate\(\)\) return;/);
    });
  });

  describe('C — Payload shape (constructed, never sent — see D below)', () => {
    it('the constructed payload contains name, sellingPrice, and only the four authorized optional fields, conditionally', () => {
      const payloadMatch = catalogViewSrc.match(/const payload = \{([\s\S]*?)\};/);
      assert.ok(payloadMatch, 'Expected a payload object literal in handleSubmit.');
      const payload = payloadMatch![1];
      assert.match(payload, /name: name\.trim\(\),/);
      assert.match(payload, /sellingPrice: parseFloat\(sellingPrice\),/);
      assert.match(payload, /\.\.\.\(category\.trim\(\) \? \{ category: category\.trim\(\) \} : \{\}\),/);
      assert.match(payload, /\.\.\.\(supplier\.trim\(\) \? \{ supplier: supplier\.trim\(\) \} : \{\}\),/);
      assert.match(payload, /\.\.\.\(sku\.trim\(\) \? \{ sku: sku\.trim\(\) \} : \{\}\),/);
      assert.match(payload, /\.\.\.\(barcode\.trim\(\) \? \{ barcode: barcode\.trim\(\) \} : \{\}\),/);
      const fieldLines = payload.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      assert.equal(fieldLines.length, 6, `Expected exactly 6 lines in the payload literal, found ${fieldLines.length}.`);
    });

    it('the payload never contains costPrice or any purchase/stock field', () => {
      const payloadMatch = catalogViewSrc.match(/const payload = \{([\s\S]*?)\};/);
      assert.doesNotMatch(payloadMatch![1], /costPrice/);
      assert.doesNotMatch(payloadMatch![1], /quantity/i);
    });
  });

  describe('D — Integration boundary: registerCatalogProduct is NOT called (Checkpoint C\'s own stop condition)', () => {
    it('registerCatalogProduct is never destructured from context, and never called as a function — the only two mentions in this file are inside an explanatory comment and the console.log documentation string, both legitimate, neither a functional call', () => {
      assert.doesNotMatch(catalogViewSrc, /const \{[^}]*registerCatalogProduct[^}]*\}\s*=\s*useApp\(\)/);
      assert.doesNotMatch(catalogViewSrc, /registerCatalogProduct\(payload\)/);
      assert.doesNotMatch(catalogViewSrc, /registerCatalogProduct\(\{/);
      assert.doesNotMatch(catalogViewSrc, /await registerCatalogProduct/);
    });

    it('useApp() is never called — this component does not read context at all yet, confirming no write path of any kind is reachable from it', () => {
      assert.doesNotMatch(catalogViewSrc, /useApp\(\)/);
    });

    it('no Firestore write function of any kind is referenced', () => {
      assert.doesNotMatch(catalogViewSrc, /setDoc|updateDoc|addDoc|deleteDoc/);
    });

    it('no stock-writing or Business-Worth function is referenced', () => {
      assert.doesNotMatch(catalogViewSrc, /addStockBatch/);
      assert.doesNotMatch(catalogViewSrc, /recordStockCount/);
      assert.doesNotMatch(catalogViewSrc, /calculateInventoryTotals/);
    });

    it('the submit handler ends in a console.log, not a function call — confirmed as the literal last statement of handleSubmit, not merely present somewhere in the file', () => {
      const handleSubmitBody = catalogViewSrc.slice(
        catalogViewSrc.indexOf('const handleSubmit = (e: React.FormEvent) => {'),
        catalogViewSrc.indexOf('return (', catalogViewSrc.indexOf('const handleSubmit'))
      );
      const trimmed = handleSubmitBody.trim();
      assert.ok(trimmed.endsWith('};') || /console\.log\([^)]*\);\s*\};\s*$/.test(trimmed), 'Expected handleSubmit to end with the console.log call.');
      assert.match(handleSubmitBody, /console\.log\(/);
    });
  });

  describe('E — Regression: no identity-resolution logic present yet (that is Checkpoint D)', () => {
    it('findSimilarProducts is not imported or referenced', () => {
      assert.doesNotMatch(catalogViewSrc, /findSimilarProducts/);
    });
  });

  describe('F — i18n: productCatalog.form keys exist in all three locales, type-consistent', () => {
    it('pt.ts declares the form type block with all twelve keys', () => {
      const formTypeMatch = ptSrc.match(/form: \{\s*title: string;[\s\S]*?cancelButton: string;\s*\};/);
      assert.ok(formTypeMatch, 'Expected productCatalog.form type block.');
    });

    it('all three locales provide a matching form value block with the exact same keys', () => {
      for (const localeSrc of [ptSrc, enSrc, frSrc]) {
        assert.match(localeSrc, /form: \{\s*title: '[^']*',/);
        assert.match(localeSrc, /nameLabel: '[^']*',/);
        assert.match(localeSrc, /sellingPriceLabel: '[^']*',/);
        assert.match(localeSrc, /categoryLabel: '[^']*',/);
        assert.match(localeSrc, /supplierLabel: '[^']*',/);
        assert.match(localeSrc, /skuLabel: '[^']*',/);
        assert.match(localeSrc, /barcodeLabel: '[^']*',/);
        assert.match(localeSrc, /nameRequiredError: '[^']*',/);
        assert.match(localeSrc, /sellingPriceRequiredError: '[^']*',/);
        assert.match(localeSrc, /submitButton: '[^']*',/);
        assert.match(localeSrc, /cancelButton: '[^']*',/);
      }
    });

    it('addProductButton exists in all three locales', () => {
      for (const localeSrc of [ptSrc, enSrc, frSrc]) {
        assert.match(localeSrc, /addProductButton: '[^']+',/);
      }
    });
  });

  describe('G — Uses existing design-system classes, not a new visual language', () => {
    it('reuses the existing btn-primary/btn-secondary classes, not custom button styling', () => {
      assert.match(catalogViewSrc, /className="btn-primary/);
      assert.match(catalogViewSrc, /className="btn-secondary/);
    });

    it('reuses the existing sanitizeDecimalInput helper for the price field, not a new numeric-input rule', () => {
      assert.match(catalogViewSrc, /import \{ sanitizeDecimalInput \} from '\.\.\/lib\/decimalInputSanitizer';/);
      assert.match(catalogViewSrc, /onChange=\{\(e\) => setSellingPrice\(sanitizeDecimalInput\(e\.target\.value\)\)\}/);
    });
  });
});
