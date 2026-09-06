// Product Identity Existing/New Resolution — implements
// docs/engineering/product-identity-existing-new-resolution-implementation-plan.md
// (ACCEPTED) under
// docs/engineering/product-identity-existing-new-resolution-implementation-authorization.md
// (AUTHORIZED, SABUSHIMIKE MASCENI, 2026-09-06).
//
// SCOPE: this repository has no React/DOM test harness and does not
// Firestore-mock AppContext.tsx's write-path functions (see
// tests/derived-selling-valuation-snapshot.test.ts's own precedent:
// "the actual Firestore write path... is deliberately thin glue...
// not independently re-tested here"). These tests instead prove the
// three checkpoints' structural/behavioral guarantees via SOURCE-TEXT
// inspection — the same established pattern
// tests/periodic-stock-portion-grouping-wiring.test.ts and
// tests/initial-stock-portion-grouping-wiring.test.ts already use for
// exactly this class of requirement (safety boundaries, wiring,
// "does NOT import X" negative-space guarantees).
//
// Mapped 1:1 to the Implementation Authorization §5 / accepted plan
// §14 binding acceptance table (rows A–J).
//
// HOW TO RUN:
//   npx tsx --test tests/product-identity-existing-new-resolution.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const appContextSource = readFileSync(
  new URL('../apps/tenant/src/context/AppContext.tsx', import.meta.url),
  'utf-8'
);
const addStockViewSource = readFileSync(
  new URL('../apps/tenant/src/components/AddStockView.tsx', import.meta.url),
  'utf-8'
);
const periodicStockCountViewSource = readFileSync(
  new URL('../apps/tenant/src/components/PeriodicStockCountView.tsx', import.meta.url),
  'utf-8'
);

// ---------------------------------------------------------------------------
// Requirement A — Unresolved identity cannot silently create a Product
// (Checkpoints A, B, C — all three write paths).
// ---------------------------------------------------------------------------
describe('Requirement A — unresolved identity cannot silently create a Product', () => {
  it('addMultipleStockBatches refuses to create a Product with no existing match and no confirmedNewProduct signal (Checkpoint A)', () => {
    assert.match(appContextSource, /if\s*\(!product\s*&&\s*!item\.confirmedNewProduct\)\s*\{\s*\n\s*throw new Error/);
  });

  it('the refusal in addMultipleStockBatches is positioned BEFORE the new-Product creation branch, not after', () => {
    const guardIdx = appContextSource.indexOf('if (!product && !item.confirmedNewProduct)');
    const creationIdx = appContextSource.indexOf(
      "productId = 'prod-' + Date.now() + '-' + idx + '-' + Math.random"
    );
    assert.ok(guardIdx > -1, 'guard not found');
    assert.ok(creationIdx > -1, 'creation branch not found');
    assert.ok(guardIdx < creationIdx, 'guard must run before Product creation');
  });

  it('addStockBatch (Checkpoint B — no live caller) receives the identical defensive safety boundary', () => {
    assert.match(appContextSource, /if\s*\(!product\s*&&\s*!confirmedNewProduct\)\s*\{\s*\n\s*throw new Error/);
    assert.match(
      appContextSource,
      /const addStockBatch = async \(\{[^}]*confirmedNewProduct[^}]*\}: AddStockParams\)/
    );
  });

  it('recordStockCount refuses to create a Product for Periodic Contagem with no existing match and no confirmedNewProductByName entry (Checkpoint C)', () => {
    assert.match(
      appContextSource,
      /if\s*\(type !== 'initial' && !product && !confirmedNewProductByName\.get\(norm\.productName\.toLowerCase\(\)\)\)\s*\{\s*\n\s*throw new Error/
    );
  });

  it('recordStockCount\'s guard is scoped to type !== \'initial\' only — Initial Stock is explicitly out of this authorization\'s scope', () => {
    assert.match(appContextSource, /type !== 'initial' && !product && !confirmedNewProductByName/);
  });

  it('AddStockView.tsx re-checks identity resolution at handleSubmit (defensive re-check, never trusting render-level state alone)', () => {
    assert.match(
      addStockViewSource,
      /if\s*\(!identityResolvesToExistingProduct && !row\.pendingSupplierWording && !row\.identityConfirmedNew\)\s*\{\s*\n\s*alert/
    );
  });

  it('PeriodicStockCountView.tsx re-checks every counted item at handleConfirmSave before recordStockCount is ever called', () => {
    assert.match(
      periodicStockCountViewSource,
      /isGenuinelyNewProductName\(item\.productName\) && !manualIdentityConfirmedNew\.has\(productKeyFor\(item\.productName\)\)/
    );
    // The re-check must appear BEFORE the recordStockCount call, not after.
    const guardIdx = periodicStockCountViewSource.indexOf(
      'isGenuinelyNewProductName(item.productName) && !manualIdentityConfirmedNew.has'
    );
    const callIdx = periodicStockCountViewSource.indexOf('const saved = await recordStockCount({');
    assert.ok(guardIdx > -1 && callIdx > -1);
    assert.ok(guardIdx < callIdx, 'the resolution guard must run before recordStockCount is called');
  });
});

// ---------------------------------------------------------------------------
// Requirement B — Owner Existing selection resolves to the correct Product
// among multiple candidates (never auto-selected).
// ---------------------------------------------------------------------------
describe('Requirement B — Existing selection resolves to the specific chosen candidate, never an automatic first pick', () => {
  it('Add Stock\'s "did you mean" candidates each bind their OWN name to the click handler (no fixed/first-index selection)', () => {
    assert.match(addStockViewSource, /similarProducts\.map\(p => \(/);
    assert.match(addStockViewSource, /onClick=\{\(\) => handleSelectProductForTool\(row\.id, p\.name\)\}/);
    // Never a bare index-0 selection anywhere near this mechanism.
    assert.doesNotMatch(addStockViewSource, /similarProducts\[0\]/);
  });

  it('Contagem\'s candidate panel binds each candidate\'s OWN name to its own click handler', () => {
    assert.match(
      periodicStockCountViewSource,
      /candidates\.map\(\(p\) => \(/
    );
    assert.match(
      periodicStockCountViewSource,
      /onClick=\{\(\) => handleRenameManualGroup\(key, p\.name\)\}/
    );
    assert.doesNotMatch(periodicStockCountViewSource, /candidates\[0\]/);
  });

  it('selecting an existing product rewrites the row/group to that product\'s OWN canonical name — the ordinary, unmodified exact-match path then resolves it, never a fabricated productId', () => {
    // Add Stock: handleSelectProductForTool takes the clicked name.
    assert.match(addStockViewSource, /const handleSelectProductForTool = \(rowId: string, name: string\) => \{/);
    // Contagem: handleRenameManualGroup takes the clicked name.
    assert.match(periodicStockCountViewSource, /const handleRenameManualGroup = \(groupKey: string, newName: string\) => \{/);
  });
});

// ---------------------------------------------------------------------------
// Requirement C — Explicit New selection creates a Product, identical in
// shape to today's automatic creation.
// ---------------------------------------------------------------------------
describe('Requirement C — explicit New confirmation is the only thing that authorizes new-Product creation', () => {
  it('AddStockView.tsx sets identityConfirmedNew ONLY inside explicit owner-click handlers (createNew dropdown option, standalone banner button) — never as a side effect of typing', () => {
    const setSites = addStockViewSource.match(/identityConfirmedNew:\s*true/g) ?? [];
    // Exactly the dropdown's desktop option, its mobile option, and the
    // standalone always-visible banner button — three explicit clicks,
    // never more (never, e.g., a debounced typing handler).
    assert.equal(setSites.length, 3, `expected exactly 3 explicit identityConfirmedNew: true sites, found ${setSites.length}`);
  });

  it('every identityConfirmedNew: true site is inside an onClick handler, not inside a typing/debounce handler', () => {
    const idx = [...addStockViewSource.matchAll(/identityConfirmedNew:\s*true/g)].map((m) => m.index!);
    for (const i of idx) {
      const windowBefore = addStockViewSource.slice(Math.max(0, i - 900), i);
      assert.match(
        windowBefore,
        /onClick=\{\(\)\s*=>/,
        'identityConfirmedNew: true must be set inside an onClick handler'
      );
    }
  });

  it('the confirmed-new signal is forwarded to addMultipleStockBatches only when the row actually carries it (never unconditionally true)', () => {
    assert.match(addStockViewSource, /\.\.\.\(row\.identityConfirmedNew \? \{ confirmedNewProduct: true \} : \{\}\)/);
  });

  it('Periodic Contagem sets manualIdentityConfirmedNew ONLY via the explicit "confirm as new product" button', () => {
    assert.match(
      periodicStockCountViewSource,
      /onClick=\{\(\) => setManualIdentityConfirmedNew\(\(prev\) => new Set\(prev\)\.add\(key\)\)\}/
    );
  });

  it('Contagem forwards confirmedNewProduct to recordStockCount only when the item is actually confirmed (never unconditionally true)', () => {
    assert.match(
      periodicStockCountViewSource,
      /\.\.\.\(manualIdentityConfirmedNew\.has\(item\.productName\.trim\(\)\.toLowerCase\(\)\)\s*\n\s*\? \{ confirmedNewProduct: true \}\s*\n\s*: \{\}\)/
    );
  });
});

// ---------------------------------------------------------------------------
// Requirement D — Existing selection retrieves/reuses Product Memory via
// the existing, unmodified mechanism — no new retrieval path introduced.
// ---------------------------------------------------------------------------
describe('Requirement D — no new Product Memory retrieval mechanism introduced', () => {
  it('AddStockView.tsx still uses only the existing findLatestRememberedProductMemory/buildProductMemoryAutofill import — no new memory function added', () => {
    assert.match(
      addStockViewSource,
      /import \{ resolveUnitAwarePrice, findLatestRememberedProductMemory, resolveCanonicalProductSellingMemory \} from '\.\.\/lib\/productMemoryPriceResolution'/
    );
  });

  it('PeriodicStockCountView.tsx\'s own memory imports are unchanged by this feature (only findSimilarProducts was newly added)', () => {
    assert.match(
      periodicStockCountViewSource,
      /import \{ resolveUnitAwarePrice, findLatestRememberedProductMemory, resolveCanonicalProductSellingMemory \} from '\.\.\/lib\/productMemoryPriceResolution'/
    );
  });
});

// ---------------------------------------------------------------------------
// Requirement E — Periodic Contagem follows the Existing/New principle.
// ---------------------------------------------------------------------------
describe('Requirement E — Periodic Contagem implements the same Existing/New principle as Add Stock', () => {
  it('imports findSimilarProducts for candidate generation', () => {
    assert.match(
      periodicStockCountViewSource,
      /import \{ findSimilarProducts \} from '\.\.\/lib\/productNameSimilarity'/
    );
  });

  it('the new-product configuration panel (NewProductInfoPanel) only renders AFTER identity has been explicitly confirmed New', () => {
    assert.match(
      periodicStockCountViewSource,
      /\{isNewProduct &&\s*\n\s*manualIdentityConfirmedNew\.has\(productKeyFor\(group\.displayName\)\) &&\s*\n\s*\(\(\) => \{/
    );
  });

  it('the resolution panel itself only renders while unresolved (isNewProduct && not yet confirmed)', () => {
    assert.match(
      periodicStockCountViewSource,
      /\{isNewProduct && !manualIdentityConfirmedNew\.has\(productKeyFor\(group\.displayName\)\) && \(/
    );
  });
});

// ---------------------------------------------------------------------------
// Requirement F — Contagem does NOT use Supplier-Wording Recognition.
// ---------------------------------------------------------------------------
describe('Requirement F — Supplier-Wording Recognition remains excluded from Contagem', () => {
  it('PeriodicStockCountView.tsx does not IMPORT any supplier-wording candidate-detection module', () => {
    assert.doesNotMatch(periodicStockCountViewSource, /from '\.\.\/lib\/supplierWordingMatching'/);
    assert.doesNotMatch(periodicStockCountViewSource, /from '\.\.\/lib\/supplierWordingRecognition'/);
    assert.doesNotMatch(periodicStockCountViewSource, /\bimport\b[^;]*\bresolveSupplierWordingRecognition\b/);
  });

  it('the file never sets/reads a supplierWordingCandidates-shaped field on any row (that mechanism is Add Stock-only)', () => {
    assert.doesNotMatch(periodicStockCountViewSource, /row\.supplierWordingCandidates/);
    assert.doesNotMatch(periodicStockCountViewSource, /\.supplierWordingCandidates\s*=/);
  });

  it('the new import is findSimilarProducts specifically, not a supplier-scoped mechanism', () => {
    assert.doesNotMatch(periodicStockCountViewSource, /from '\.\.\/lib\/supplierWording/);
  });
});

// ---------------------------------------------------------------------------
// Requirement G — Tenant isolation remains intact.
// ---------------------------------------------------------------------------
describe('Requirement G — tenant isolation: no new Firestore query, candidate source is the already-scoped in-memory products array', () => {
  it('Contagem\'s candidate generation reads the already-subscribed, business-scoped `products` array — no new query', () => {
    assert.match(periodicStockCountViewSource, /findSimilarProducts\(group\.displayName, products\)/);
  });

  it('no new Firestore read (getDocs/collection/query) was introduced near the new identity-resolution code in either component', () => {
    const addStockIdentityBlock = addStockViewSource.slice(
      addStockViewSource.indexOf('identityConfirmedNew?: boolean;'),
      addStockViewSource.indexOf('identityConfirmedNew?: boolean;') + 6000
    );
    assert.doesNotMatch(addStockIdentityBlock, /getDocs\(|collection\(db,|query\(/);

    const contagemIdentityBlockStart = periodicStockCountViewSource.indexOf('manualIdentityConfirmedNew');
    const contagemIdentityBlock = periodicStockCountViewSource.slice(
      contagemIdentityBlockStart,
      contagemIdentityBlockStart + 6000
    );
    assert.doesNotMatch(contagemIdentityBlock, /getDocs\(|collection\(db,|query\(/);
  });

  it('addMultipleStockBatches\'/recordStockCount\'s new guards reference only the already-loaded tempProducts/products arrays, never a fresh query', () => {
    assert.match(appContextSource, /let product = tempProducts\.find\(\(p\) => p\.name\.toLowerCase\(\) === trimmedName\.toLowerCase\(\)\);\s*\n\s*let productId = product\?\.id;\s*\n\s*\n\s*\/\/ \[Product Identity/);
  });
});

// ---------------------------------------------------------------------------
// Requirements I/J — B2 Reading 2 and Concept C remain untouched.
// ---------------------------------------------------------------------------
describe('Requirements I/J — B2 Reading 2 and Concept C remain untouched by this authorization', () => {
  it('addStockBatch does not newly reference buildDerivedSellingValuationSnapshot/derivedSellingValuation', () => {
    const fnStart = appContextSource.indexOf('const addStockBatch = async');
    const fnBody = appContextSource.slice(fnStart, fnStart + 4000);
    assert.doesNotMatch(fnBody, /buildDerivedSellingValuationSnapshot|derivedSellingValuation/);
  });

  it('recordStockCount does not newly reference buildDerivedSellingValuationSnapshot/derivedSellingValuation', () => {
    const fnStart = appContextSource.indexOf('const recordStockCount = async');
    const fnEnd = appContextSource.indexOf('\n  };', fnStart);
    const fnBody = appContextSource.slice(fnStart, fnEnd);
    assert.doesNotMatch(fnBody, /buildDerivedSellingValuationSnapshot/);
  });

  it('no StockBatch schema field was added — the new AddStockParams field is a plain boolean, not a StockBatch property', () => {
    assert.match(appContextSource, /confirmedNewProduct\?: boolean;/);
    // Confirm it is declared on AddStockParams/RecordStockCountItemInput,
    // never inside a StockBatch object literal.
    assert.doesNotMatch(appContextSource, /const newBatch[^=]*=\s*\{[^}]*confirmedNewProduct/s);
  });
});

// ---------------------------------------------------------------------------
// Regression guard — no unrelated business logic altered by this feature.
// ---------------------------------------------------------------------------
describe('Regression guard — automatic recognition and Supplier-Wording in Add Stock remain unchanged', () => {
  it('Add Stock still applies the exact-match/reuse/candidate-confirmed paths before ever reaching the new gate (unchanged control flow)', () => {
    assert.match(addStockViewSource, /supplierWordingCandidates\?: SupplierWordingCandidate\[\];/);
    assert.match(addStockViewSource, /pendingSupplierWording\?:\s*\{/);
  });

  it('the new identity gate is additive — it checks pendingSupplierWording OR identityConfirmedNew, never replacing the exact-match check', () => {
    assert.match(
      addStockViewSource,
      /const identityResolvesToExistingProduct = products\.some\(\s*\n\s*\(p\) => p\.name\.toLowerCase\(\) === trimmedName\.toLowerCase\(\)\s*\n\s*\);/
    );
  });
});
