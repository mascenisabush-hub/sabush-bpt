// Owner Product Catalog — Phase 1, Checkpoint A (Catalog surface/
// navigation) — Implementation Authorization §3.2, §4.
//
// Source-inspection tests, matching this repository's established
// technique for React-component coverage (no @testing-library/react
// or jsdom harness exists in this repo — every assertion here is a
// structural, source-text check, not a rendered-DOM check; see
// tests/business-worth-correction-recovery-ui.test.ts's own header
// for the same convention).
//
// Scope: ONLY Checkpoint A — an empty Catalog screen reachable by
// Owner, unreachable by Staff, with no write logic. Checkpoints B–E
// (registration, validation, identity resolution, list/edit) are
// explicitly NOT covered here — they belong to their own, later,
// separately-authorized checkpoints.
//
// HOW TO RUN:
//   npx tsx --test tests/product-catalog-phase-1-checkpoint-a.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

// Balanced-brace extraction, not a plain regex — a plain non-greedy
// regex has no notion of nesting depth and can easily latch onto an
// unrelated, much-later closing brace at the same indentation level
// (this exact bug was hit and fixed while writing this suite: a
// `[\s\S]*?\n  },` search for the VALUE block matched clear across
// the file, from the TYPE block's own opening brace to some entirely
// unrelated interface's closing brace hundreds of lines later).
// `occurrence` selects which match of `startMarker` to extract from,
// since `productCatalog: {` legitimately appears twice per locale
// file (once in the TranslationDict type, once in the value object).
function extractBlock(source: string, startMarker: string, occurrence: 1 | 2 = 1): string {
  let searchFrom = 0;
  let startIdx = -1;
  for (let n = 0; n < occurrence; n++) {
    startIdx = source.indexOf(startMarker, searchFrom);
    assert.notEqual(startIdx, -1, `Could not locate occurrence ${n + 1} of "${startMarker}".`);
    searchFrom = startIdx + startMarker.length;
  }
  const braceStart = source.indexOf('{', startIdx);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return source.slice(braceStart, i + 1);
}

const appSrc = src('apps/tenant/src/App.tsx');
const navTabsSrc = src('apps/tenant/src/data/navigationTabs.ts');
const catalogViewSrc = src('apps/tenant/src/components/ProductCatalogView.tsx');
const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('Product Catalog Phase 1 — Checkpoint A — Catalog surface/navigation', () => {
  describe('A — navigationTabs.ts: catalog is a real, Owner-only tab', () => {
    it("'catalog' is a member of TabType", () => {
      assert.match(navTabsSrc, /export type TabType =[\s\S]*?'catalog'/);
    });

    it("the catalog NavTabDefinition entry exists, is ownerOnly: true, and uses the i18n-key convention every other tab already uses (never a literal label)", () => {
      const entryMatch = navTabsSrc.match(/\{ id: 'catalog', labelKey: '([^']+)', shortLabelKey: '([^']+)', icon: \w+, color: '\w+', ownerOnly: true \}/);
      assert.ok(entryMatch, 'Expected a catalog NavTabDefinition entry with ownerOnly: true, matching the exact shape every other entry already uses.');
      assert.equal(entryMatch![1], 'nav.tabs.catalog.label');
      assert.equal(entryMatch![2], 'nav.tabs.catalog.shortLabel');
    });

    it('catalog is distinct from both dashboard and stocks — a genuinely new tab id, not a repurposing of an existing one', () => {
      const catalogEntries = (navTabsSrc.match(/id: 'catalog'/g) || []).length;
      assert.equal(catalogEntries, 1, 'Expected exactly one catalog tab entry.');
    });
  });

  describe('B — App.tsx: Owner-only gating, mirroring every other Owner-only tab', () => {
    it("ProductCatalogView is imported", () => {
      assert.match(appSrc, /import \{ ProductCatalogView \} from '\.\/components\/ProductCatalogView';/);
    });

    it("the catalog tab is gated behind !isStaff, the exact same pattern 'stocks' and 'dashboard' already use — Staff cannot reach it", () => {
      assert.match(appSrc, /!isStaff && activeTab === 'catalog' &&/);
      // Regression guard: the pre-existing gates for other Owner-only
      // tabs must still be present, unmodified, alongside the new one.
      assert.match(appSrc, /!isStaff && activeTab === 'stocks' &&/);
      assert.match(appSrc, /!isStaff && activeTab === 'dashboard' &&/);
    });

    it('ProductCatalogView is mounted with zero props, identical in shape to StocksView\'s own mount — no premature wiring of registration/search callbacks that belong to later checkpoints', () => {
      assert.match(appSrc, /!isStaff && activeTab === 'catalog' && <ProductCatalogView \/>/);
    });

    it('no other existing tab mount was disturbed — spot-check a sample of pre-existing Owner-only and Staff-accessible tabs still present', () => {
      assert.match(appSrc, /!isStaff && activeTab === 'stock-count' &&/);
      assert.match(appSrc, /!isStaff && activeTab === 'declare-worth' &&/);
      assert.match(appSrc, /activeTab === 'add-stock' &&/);
    });
  });

  describe('C — ProductCatalogView.tsx: exists, renders, and does NOT anticipate later checkpoints', () => {
    it('is a zero-prop React.FC, matching the mount site in App.tsx (no props passed, none expected)', () => {
      assert.match(catalogViewSrc, /export const ProductCatalogView: React\.FC = \(\) => \{/);
    });

    it('renders the page title and an empty-state message via i18n keys, never literal hardcoded UI text', () => {
      assert.match(catalogViewSrc, /t\('productCatalog\.title'\)/);
      assert.match(catalogViewSrc, /t\('productCatalog\.subtitle'\)/);
      assert.match(catalogViewSrc, /t\('productCatalog\.emptyState'\)/);
    });

    it('never calls a Firestore write function directly — this remains true even now that Checkpoint D has wired registerCatalogProduct in: this file always delegates to that single, already-tested function (Checkpoint B), never touches setDoc/updateDoc/etc. itself', () => {
      assert.doesNotMatch(catalogViewSrc, /setDoc|updateDoc|addDoc|deleteDoc/);
    });

    it('Checkpoint D has since wired registerCatalogProduct and findSimilarProducts into this file — expected, not a defect of Checkpoint A\'s own original claim (which only ever asserted the state "as of Checkpoint A"); the full, precise, exhaustive proof of correct, safe wiring lives in the dedicated Checkpoint D test suite, not duplicated here', () => {
      assert.match(catalogViewSrc, /registerCatalogProduct/);
      assert.match(catalogViewSrc, /findSimilarProducts/);
    });

    it('does NOT contain a costPrice field, input, or state variable, checked outside this file\'s own explanatory comments — Checkpoint C (this file\'s own registration form, added since this test was first written) intentionally still excludes it, per its own dedicated, more thorough test suite', () => {
      const codeOnly = catalogViewSrc.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
      assert.doesNotMatch(codeOnly, /costPrice/);
    });

    it('Checkpoint D now legitimately reads `products` from context (needed for findSimilarProducts) and this screen is no longer unconditionally empty once a registration succeeds — expected, superseding Checkpoint A\'s original "still empty" claim; see the dedicated Checkpoint D/E suites for the full proof this is done safely', () => {
      assert.match(catalogViewSrc, /const \{ products, registerCatalogProduct, currencySymbol \} = useApp\(\);/);
    });
  });

  describe('D — i18n: productCatalog keys exist in all three locales, type-consistent', () => {
    it('pt.ts declares the productCatalog type block containing title, subtitle, emptyState (Checkpoint C has since extended this same block with its own form keys — checked for presence via balanced-brace extraction, not a plain regex, since a plain non-greedy search across a file this size can latch onto an unrelated, far-later closing brace)', () => {
      const typeBlock = extractBlock(ptSrc, 'productCatalog: {', 1);
      assert.match(typeBlock, /title: string;/);
      assert.match(typeBlock, /subtitle: string;/);
      assert.match(typeBlock, /emptyState: string;/);
      const valueBlock = extractBlock(ptSrc, 'productCatalog: {', 2);
      assert.match(valueBlock, /title: '[^']+',/);
      assert.match(valueBlock, /subtitle: '[^']+',/);
      assert.match(valueBlock, /emptyState: '[^']+',/);
    });

    it('en.ts and fr.ts each provide a matching productCatalog value block containing title, subtitle, emptyState', () => {
      for (const localeSrc of [enSrc, frSrc]) {
        const valueBlock = extractBlock(localeSrc, 'productCatalog: {', 1);
        assert.match(valueBlock, /title: '[^']+',/);
        assert.match(valueBlock, /subtitle: '[^']+',/);
        assert.match(valueBlock, /emptyState: '[^']+',/);
      }
    });

    it('all three locales declare nav.tabs.catalog with label and shortLabel', () => {
      for (const localeSrc of [ptSrc, enSrc, frSrc]) {
        assert.match(localeSrc, /catalog: \{ label: '[^']+', shortLabel: '[^']+' \}/);
      }
    });
  });

  describe('E — Regression: NavigationTabs.tsx / Header.tsx ownerOnly filtering already covers the new tab with no changes required', () => {
    it('both nav-rendering components already filter by ownerOnly generically (not per-tab-id), so the new catalog entry is automatically hidden from Staff with no additional code', () => {
      const navComponentSrc = src('apps/tenant/src/components/NavigationTabs.tsx');
      const headerSrc = src('apps/tenant/src/components/Header.tsx');
      assert.match(navComponentSrc, /NAV_TABS\.filter\(tab => !tab\.ownerOnly\)/);
      assert.match(headerSrc, /NAV_TABS\.filter\(tab => !tab\.ownerOnly\)/);
    });
  });
});
