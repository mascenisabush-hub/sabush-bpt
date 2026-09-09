// Owner Product Catalog — Phase 1, Checkpoint C (Registration form +
// validation) — Implementation Authorization §3.2, §4.
//
// Source-inspection tests, matching this repository's established
// technique (no jsdom/testing-library harness exists in this repo).
//
// Scope: Checkpoint C's own, still-valid claims — the six-field form
// exists, is styled per this repo's existing conventions, and its
// field-level validation is correct. Checkpoint C's original claim
// that the write path was NOT yet reachable was always a checkpoint-
// time-scoped assertion, not a permanent one; Checkpoint D has since
// legitimately wired registerCatalogProduct in, superseding that
// specific claim (not weakening it — the underlying safety invariant,
// "no silent duplicate creation," is now verified more precisely by
// the dedicated Checkpoint D test suite). Sections that tested the
// now-superseded "not yet wired" state have been updated accordingly,
// each with its own note explaining why.
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

    it('handleSubmit calls validate() and returns early on failure, before any candidate search or write attempt — the async signature reflects Checkpoint D\'s own await of registerCatalogProduct, not a change to this checkpoint\'s own validation-first guarantee', () => {
      assert.match(catalogViewSrc, /const handleSubmit = async \(e: React\.FormEvent\) => \{\s*\n\s*e\.preventDefault\(\);\s*\n\s*if \(!validate\(\)\) return;/);
    });
  });

  describe('C — Payload shape (built by buildPayload, a separate function Checkpoint D introduced so both the initial submit path and the post-resolution confirm path construct an identical payload from one place, never two)', () => {
    it('buildPayload returns name, sellingPrice, and only the four authorized optional fields, conditionally', () => {
      const payloadMatch = catalogViewSrc.match(/const buildPayload = \(\) => \(\{([\s\S]*?)\}\);/);
      assert.ok(payloadMatch, 'Expected a buildPayload function returning an object literal.');
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

    it('buildPayload never includes costPrice or any purchase/stock field', () => {
      const payloadMatch = catalogViewSrc.match(/const buildPayload = \(\) => \(\{([\s\S]*?)\}\);/);
      assert.doesNotMatch(payloadMatch![1], /costPrice/);
      assert.doesNotMatch(payloadMatch![1], /quantity/i);
    });
  });

  describe('D — Integration boundary, as of Checkpoint D: registerCatalogProduct IS now reachable, but only through this file\'s own controlled path — never bypassed by handleSubmit directly, always through submitRegistration', () => {
    it('registerCatalogProduct is destructured from context and awaited, exactly once, inside submitRegistration — never called directly from handleSubmit or handleConfirmNew themselves', () => {
      assert.match(catalogViewSrc, /const \{ products, registerCatalogProduct \} = useApp\(\);/);
      const callCount = (catalogViewSrc.match(/await registerCatalogProduct\(/g) || []).length;
      assert.equal(callCount, 1, `Expected exactly one call site for registerCatalogProduct, found ${callCount}.`);
    });

    it('no Firestore write function is referenced directly — every write is delegated to the single, already-tested registerCatalogProduct function', () => {
      assert.doesNotMatch(catalogViewSrc, /setDoc|updateDoc|addDoc|deleteDoc/);
    });

    it('no stock-writing or Business-Worth function is referenced', () => {
      assert.doesNotMatch(catalogViewSrc, /addStockBatch/);
      assert.doesNotMatch(catalogViewSrc, /recordStockCount/);
      assert.doesNotMatch(catalogViewSrc, /calculateInventoryTotals/);
    });
  });

  describe('E — Identity-resolution wiring now exists (Checkpoint D) — full behavioral proof lives in the dedicated Checkpoint D test suite, this is presence-only', () => {
    it('findSimilarProducts is imported and used exactly as AddStockView.tsx/PeriodicStockCountView.tsx already import it — reused, not reimplemented', () => {
      assert.match(catalogViewSrc, /import \{ findSimilarProducts \} from '\.\.\/lib\/productNameSimilarity';/);
    });
  });

  describe('F — i18n: productCatalog.form field-level keys exist in all three locales, type-consistent (Checkpoint D added its own resolution-UI keys alongside these — checked for presence, not for the block containing only these keys)', () => {
    it('pt.ts declares string types for the field-level keys inside productCatalog.form', () => {
      assert.match(ptSrc, /nameLabel: string;/);
      assert.match(ptSrc, /sellingPriceLabel: string;/);
      assert.match(ptSrc, /categoryLabel: string;/);
      assert.match(ptSrc, /supplierLabel: string;/);
      assert.match(ptSrc, /skuLabel: string;/);
      assert.match(ptSrc, /barcodeLabel: string;/);
      assert.match(ptSrc, /nameRequiredError: string;/);
      assert.match(ptSrc, /sellingPriceRequiredError: string;/);
      assert.match(ptSrc, /submitButton: string;/);
      assert.match(ptSrc, /cancelButton: string;/);
    });

    it('all three locales provide matching form value keys', () => {
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

    it('the now-outdated notYetAvailableNote key has been removed from all three locales — it became factually wrong the moment Checkpoint D made saving actually work', () => {
      for (const localeSrc of [ptSrc, enSrc, frSrc]) {
        assert.doesNotMatch(localeSrc, /notYetAvailableNote/);
      }
      assert.doesNotMatch(catalogViewSrc, /notYetAvailableNote/);
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
