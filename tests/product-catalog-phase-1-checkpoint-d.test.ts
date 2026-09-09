// Owner Product Catalog — Phase 1, Checkpoint D (Identity resolution +
// registration write integration) — Implementation Authorization
// §3.2, §4.
//
// Source-inspection tests, matching this repository's established
// technique (no jsdom/testing-library harness exists in this repo).
//
// Scope: ONLY Checkpoint D — submitting the form now runs recognition
// first; only a confirmed-new path reaches registerCatalogProduct.
// Checkpoint E (Catalog list/edit behavior, EditProductModal wiring)
// is explicitly NOT covered here.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-1-checkpoint-d.test.ts

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
const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const periodicSrc = src('apps/tenant/src/components/PeriodicStockCountView.tsx');
const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('Product Catalog Phase 1 — Checkpoint D — Identity resolution + write integration', () => {
  describe('A — Reuse, not reimplementation', () => {
    it('imports findSimilarProducts unmodified from the existing, shared, pure library — the exact same import AddStockView.tsx and PeriodicStockCountView.tsx already use', () => {
      assert.match(catalogViewSrc, /import \{ findSimilarProducts \} from '\.\.\/lib\/productNameSimilarity';/);
      assert.match(addStockSrc, /import \{ findSimilarProducts \} from '\.\.\/lib\/productNameSimilarity';/);
      assert.match(periodicSrc, /from '\.\.\/lib\/productNameSimilarity'/);
    });

    it('does NOT import AddStockView\'s or PeriodicStockCountView\'s own resolution UI — this file builds its own, Catalog-specific rendering of the same governed flow, never an import of either host\'s UI', () => {
      assert.doesNotMatch(catalogViewSrc, /from '\.\/AddStockView'/);
      assert.doesNotMatch(catalogViewSrc, /from '\.\/PeriodicStockCountView'/);
    });

    it('does not define a second name-similarity/matching algorithm — the only scoring logic referenced is the imported findSimilarProducts call itself', () => {
      assert.doesNotMatch(catalogViewSrc, /computeNameSimilarity/);
      assert.doesNotMatch(catalogViewSrc, /levenshtein/i);
    });
  });

  describe('B — Recognition runs before creation (the checkpoint\'s own central invariant)', () => {
    it('handleSubmit calls findSimilarProducts with the trimmed name and the live products array, storing the result in candidates, before any call to submitRegistration', () => {
      const handleSubmitBody = extractFunctionBody(catalogViewSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
      const findIdx = handleSubmitBody.indexOf('findSimilarProducts(trimmedName, products)');
      const submitIdx = handleSubmitBody.indexOf('await submitRegistration(true)');
      assert.notEqual(findIdx, -1, 'Expected a findSimilarProducts call.');
      assert.notEqual(submitIdx, -1, 'Expected a submitRegistration call.');
      assert.ok(findIdx < submitIdx, 'findSimilarProducts must run before submitRegistration.');
    });

    it('when candidates are found, handleSubmit returns immediately after setting candidates state — it does not fall through to submitRegistration on the same call', () => {
      const handleSubmitBody = extractFunctionBody(catalogViewSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
      assert.match(handleSubmitBody, /if \(found\.length > 0\) \{\s*\n\s*setCandidates\(found\);\s*\n\s*return;\s*\n\s*\}/);
    });
  });

  describe('C — No silent duplicate creation (the checkpoint\'s own protected invariant, stated explicitly)', () => {
    it('registerCatalogProduct is called from exactly one place (submitRegistration), and every call site passes an explicit confirmedNewProduct value — never omitted, never left to default', () => {
      const callSites = catalogViewSrc.match(/registerCatalogProduct\(\{ \.\.\.buildPayload\(\), confirmedNewProduct \}\)/g) || [];
      assert.equal(callSites.length, 1, `Expected exactly one call site constructing the payload with an explicit confirmedNewProduct, found ${callSites.length}.`);
    });

    it('handleConfirmNew (the only path reachable after candidates are shown) explicitly passes confirmedNewProduct: true — never silently defaults, never left ambiguous', () => {
      const confirmBody = extractFunctionBody(catalogViewSrc, 'const handleConfirmNew = () => {');
      assert.match(confirmBody, /submitRegistration\(true\)/);
    });

    it('the initial, no-candidates submit path also explicitly passes true (the Owner\'s own unambiguous submit is treated as the explicit confirmation when nothing needed disambiguating) — never a bare/implicit call', () => {
      const handleSubmitBody = extractFunctionBody(catalogViewSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
      assert.match(handleSubmitBody, /await submitRegistration\(true\);/);
    });

    it('registerCatalogProduct itself (Checkpoint B) is untouched — its own exact-match safety check still runs underneath this UI, confirmed by re-checking its own source is unmodified since Checkpoint B', () => {
      const appContextSrc = src('apps/tenant/src/context/AppContext.tsx');
      assert.match(appContextSrc, /const existing = products\.find\(\(p\) => p\.name\.toLowerCase\(\) === trimmedName\.toLowerCase\(\)\);/);
      assert.match(appContextSrc, /if \(existing\) \{\s*\n\s*if \(!confirmedNewProduct\) \{\s*\n\s*throw new Error\(/);
    });
  });

  describe('D — Resolving as existing creates nothing', () => {
    it('handleUseExisting never calls registerCatalogProduct or submitRegistration — it only sets a message and resets the form', () => {
      const existingBody = extractFunctionBody(catalogViewSrc, 'const handleUseExisting = () => {');
      assert.doesNotMatch(existingBody, /registerCatalogProduct/);
      assert.doesNotMatch(existingBody, /submitRegistration/);
      assert.match(existingBody, /setSuccessMessage\(t\('productCatalog\.form\.existingResolvedMessage'\)\);/);
      assert.match(existingBody, /resetForm\(\);/);
    });
  });

  describe('E — Payload correctness at the actual call site', () => {
    it('submitRegistration spreads buildPayload() and the explicit confirmedNewProduct argument into the actual registerCatalogProduct call — the same payload shape Checkpoint C already proved is exactly the six authorized fields', () => {
      const submitBody = extractFunctionBody(catalogViewSrc, 'const submitRegistration = async (confirmedNewProduct: boolean) => {');
      assert.match(submitBody, /await registerCatalogProduct\(\{ \.\.\.buildPayload\(\), confirmedNewProduct \}\);/);
    });

    it('submitRegistration never adds any field beyond the spread — no costPrice, no quantity, no unrelated Product field appears anywhere in this function', () => {
      const submitBody = extractFunctionBody(catalogViewSrc, 'const submitRegistration = async (confirmedNewProduct: boolean) => {');
      assert.doesNotMatch(submitBody, /costPrice/);
      assert.doesNotMatch(submitBody, /quantity/i);
    });
  });

  describe('F — Submission safety (loading state prevents double-submit)', () => {
    it('handleSubmit bails out early if a submission is already in flight', () => {
      const handleSubmitBody = extractFunctionBody(catalogViewSrc, 'const handleSubmit = async (e: React.FormEvent) => {');
      assert.match(handleSubmitBody, /if \(isSubmitting\) return;/);
    });

    it('submitRegistration sets isSubmitting true before the await and false in a finally block — guaranteed to reset even if registerCatalogProduct throws', () => {
      const submitBody = extractFunctionBody(catalogViewSrc, 'const submitRegistration = async (confirmedNewProduct: boolean) => {');
      assert.match(submitBody, /setIsSubmitting\(true\);/);
      assert.match(submitBody, /\} finally \{\s*\n\s*setIsSubmitting\(false\);\s*\n\s*\}/);
    });

    it('the submit button is disabled while submitting, and also while unresolved candidates are being shown — preventing a second submit before the Owner has explicitly resolved the first', () => {
      assert.match(catalogViewSrc, /disabled=\{isSubmitting \|\| candidates\.length > 0\}/);
    });
  });

  describe('G — Success and failure states', () => {
    it('on success, the form closes, resets, and a success message is shown — using the existing green/CheckCircle2 convention already used elsewhere in this app for a positive confirmation', () => {
      const submitBody = extractFunctionBody(catalogViewSrc, 'const submitRegistration = async (confirmedNewProduct: boolean) => {');
      assert.match(submitBody, /setSuccessMessage\(t\('productCatalog\.form\.successMessage'\)\);/);
      assert.match(submitBody, /setShowForm\(false\);/);
      assert.match(submitBody, /resetForm\(\);/);
      assert.match(catalogViewSrc, /import \{ BookOpen, Plus, X, CheckCircle2 \} from 'lucide-react';/);
    });

    it('on failure, registerCatalogProduct\'s own thrown error message is surfaced directly to the Owner — never hidden, never replaced with a generic message when a specific one is available', () => {
      const submitBody = extractFunctionBody(catalogViewSrc, 'const submitRegistration = async (confirmedNewProduct: boolean) => {');
      assert.match(submitBody, /catch \(err\) \{\s*\n\s*setSubmitError\(err instanceof Error \? err\.message : t\('productCatalog\.form\.genericError'\)\);/);
    });

    it('the form does NOT report success when submission fails — success state is only ever set inside the try block, after the await resolves, never in the catch block', () => {
      const submitBody = extractFunctionBody(catalogViewSrc, 'const submitRegistration = async (confirmedNewProduct: boolean) => {');
      const catchBlock = submitBody.slice(submitBody.indexOf('} catch'), submitBody.indexOf('} finally'));
      assert.doesNotMatch(catchBlock, /setSuccessMessage/);
    });
  });

  describe('H — Stock / Business Worth safety (re-verified at this integration point, not merely assumed from Checkpoint B)', () => {
    it('no stock-writing or Business-Worth function is called from anywhere in this file', () => {
      assert.doesNotMatch(catalogViewSrc, /addStockBatch/);
      assert.doesNotMatch(catalogViewSrc, /recordStockCount/);
      assert.doesNotMatch(catalogViewSrc, /calculateInventoryTotals/);
    });

    it('no Firestore write function is called directly — every write is delegated to registerCatalogProduct alone', () => {
      assert.doesNotMatch(catalogViewSrc, /setDoc|updateDoc|addDoc|deleteDoc/);
    });
  });

  describe('I — costPrice remains structurally excluded at the actual integration point', () => {
    it('the word costPrice does not appear anywhere in the file\'s executable code (checked outside comments, consistent with the same check already applied in the Checkpoint B/C suites)', () => {
      const codeOnly = catalogViewSrc.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
      assert.doesNotMatch(codeOnly, /costPrice/);
    });
  });

  describe('J — i18n: resolution-UI keys exist in all three locales', () => {
    it('similarProductsFound, useExistingButton, confirmNewButton, existingResolvedMessage, successMessage, genericError all exist in pt/en/fr', () => {
      for (const localeSrc of [ptSrc, enSrc, frSrc]) {
        assert.match(localeSrc, /similarProductsFound: '[^']+',/);
        assert.match(localeSrc, /useExistingButton: '[^']+',/);
        assert.match(localeSrc, /confirmNewButton: '[^']+',/);
        assert.match(localeSrc, /existingResolvedMessage: '[^']+',/);
        assert.match(localeSrc, /successMessage: '[^']+',/);
        assert.match(localeSrc, /genericError: '[^']+',/);
      }
    });
  });

  describe('K — Regression: no other component in the tenant app calls registerCatalogProduct except this one', () => {
    it('AddStockView.tsx and PeriodicStockCountView.tsx still never reference registerCatalogProduct', () => {
      assert.doesNotMatch(addStockSrc, /registerCatalogProduct/);
      assert.doesNotMatch(periodicSrc, /registerCatalogProduct/);
    });
  });
});
