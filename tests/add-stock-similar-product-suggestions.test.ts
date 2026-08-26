// [Feature — "did you mean an existing product?" suggestions,
// AddStockView.tsx wiring] See productNameSimilarity.ts's own header
// and tests/product-name-similarity.test.ts for the pure-function
// core and the owner-reported scenario this exists for. This suite
// covers the UI wiring in AddStockView.tsx: similarProducts is
// computed per-row and surfaced in three places — the desktop
// dropdown, the mobile dropdown, and a proactive, always-visible
// banner right where a non-exact-match row is about to be treated as
// a brand-new product needing its own unit-relationship setup.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-similar-product-suggestions.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');
const ptLocaleSrc = src('apps/tenant/src/i18n/locales/pt.ts');
const enLocaleSrc = src('apps/tenant/src/i18n/locales/en.ts');
const frLocaleSrc = src('apps/tenant/src/i18n/locales/fr.ts');

describe('AddStockView.tsx — findSimilarProducts is imported and computed per-row, excluding exact/substring matches', () => {
  it('imports findSimilarProducts from productNameSimilarity.ts', () => {
    assert.match(addStockSrc, /import \{ findSimilarProducts \} from '\.\.\/lib\/productNameSimilarity';/);
  });

  it('similarProducts is only computed when there is real text and no exact match — never when a real match already exists', () => {
    const idx = addStockSrc.indexOf('const similarProducts =');
    assert.notEqual(idx, -1);
    const nearby = addStockSrc.slice(idx, idx + 400);
    assert.match(nearby, /row\.productName\.trim\(\) && !exactMatchExists/);
  });

  it('similarProducts excludes anything already surfaced via the substring-based filteredProducts, so nothing is suggested twice under two different badges', () => {
    const idx = addStockSrc.indexOf('const similarProducts =');
    assert.notEqual(idx, -1);
    const nearby = addStockSrc.slice(idx, idx + 400);
    assert.match(nearby, /filter\(\s*\(s\) => !filteredProducts\.some\(\(fp\) => fp\.id === s\.id\)/);
  });
});

describe('AddStockView.tsx — selecting a suggestion reuses the existing, unchanged, exact-match-only prefill logic', () => {
  it('every similarProducts suggestion button calls handleSelectProductForTool (the same function the substring dropdown already uses) — never a separate, bypassing code path', () => {
    let searchIdx = 0;
    let checked = 0;
    while (true) {
      const mapIdx = addStockSrc.indexOf('similarProducts.map(p => (', searchIdx);
      if (mapIdx === -1) break;
      const block = addStockSrc.slice(mapIdx, mapIdx + 500);
      assert.match(block, /onClick=\{\(\) => handleSelectProductForTool\(row\.id, p\.name\)\}/);
      checked++;
      searchIdx = mapIdx + 1;
    }
    assert.ok(checked >= 2, 'Expected similarProducts to be rendered (and wired to handleSelectProductForTool) in at least two places');
  });

  it('the proactive always-visible banner (shown when a row is about to be treated as a new product) also calls handleSelectProductForTool for each suggestion', () => {
    const bannerIdx = addStockSrc.indexOf("t('addStock.similarProduct.warning')");
    assert.notEqual(bannerIdx, -1);
    const nearby = addStockSrc.slice(bannerIdx, bannerIdx + 700);
    assert.match(nearby, /onClick=\{\(\) => handleSelectProductForTool\(row\.id, p\.name\)\}/);
  });

  it('the proactive banner only shows for a non-exact-match row that actually has at least one similar suggestion — never an empty/pointless banner', () => {
    const bannerConditionIdx = addStockSrc.indexOf(
      "row.productName.trim() && !exactMatchExists && similarProducts.length > 0"
    );
    assert.notEqual(bannerConditionIdx, -1);
  });

  it('the badge distinguishing a similarity suggestion ("maybeTag") is visually and textually distinct from a confirmed substring match ("existingTag") — never presented identically to a real match', () => {
    assert.match(addStockSrc, /t\('addStock\.maybeTag'\)/);
    assert.match(addStockSrc, /t\('addStock\.existingTag'\)/);
  });
});

describe('i18n — maybeTag and similarProduct.warning are defined in all three locales', () => {
  for (const [name, localeSrc] of [
    ['pt', ptLocaleSrc],
    ['en', enLocaleSrc],
    ['fr', frLocaleSrc],
  ] as const) {
    it(`${name}.ts defines addStock.maybeTag`, () => {
      assert.match(localeSrc, /maybeTag: '/);
    });
    it(`${name}.ts defines addStock.similarProduct.warning`, () => {
      assert.match(localeSrc, /similarProduct: \{\s*\n\s*warning: /);
    });
  }
});
