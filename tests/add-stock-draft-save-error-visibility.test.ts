// [Bug fix — silent draft-save failure] Owner-reported: took a receipt
// photo on a phone, wanted to edit on a computer, but the draft wasn't
// there. Investigated and found the autosave's own error handling
// reverted to 'idle' on ANY failure (permissions, network, anything)
// with zero visible sign anything went wrong — an Owner watching
// "Guardando..." simply saw it vanish, with no way to know their data
// never reached the server at all. Whether this was the actual cause
// of the specific report couldn't be confirmed with certainty, but the
// silent-failure gap is real regardless and directly explains the
// exact symptom described ("not sure if I saw a saved confirmation").
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-mobile-caption-and-candidate-price-fill.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/add-stock-draft-save-error-visibility.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const addStockSrc = src('apps/tenant/src/components/AddStockView.tsx');

describe('AddStockView.tsx — draft autosave failure is now visible, never silent', () => {
  it('draftSaveState\'s type includes an \'error\' state, alongside idle/saving/saved', () => {
    assert.match(addStockSrc, /useState<'idle' \| 'saving' \| 'saved' \| 'error'>\('idle'\)/);
  });

  it('the autosave .catch no longer reverts to \'idle\' — it sets \'error\' and logs diagnostic detail', () => {
    const start = addStockSrc.indexOf(".then(() => {\n          setDraftSaveState('saved');");
    assert.notEqual(start, -1, 'Expected the fixed .then/.catch handler to exist');
    const end = addStockSrc.indexOf('});', addStockSrc.indexOf('.catch((err) => {', start));
    const body = addStockSrc.slice(start, end);
    assert.match(body, /console\.error\('\[AddStockView\] purchase draft autosave failed', err\)/);
    assert.match(body, /setDraftSaveState\('error'\)/);
    assert.doesNotMatch(body, /setDraftSaveState\('idle'\)/);
  });

  it('a manual retry handler exists, re-attempting with the CURRENT form state, not a stale closure from the failed attempt', () => {
    const start = addStockSrc.indexOf('const handleRetryDraftSave = () => {');
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n  };', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /savePurchaseDraft\(\s*rows\.map\(rowToDraftLineItem\),/);
    assert.match(body, /setDraftSaveState\('saving'\)/);
    assert.match(body, /setDraftSaveState\('saved'\);/);
  });

  it('the error state renders a visible, distinctly-colored indicator with a retry button — not merely absent/blank like the old silent failure', () => {
    const start = addStockSrc.indexOf("{draftSaveState === 'error' && (");
    assert.notEqual(start, -1);
    const end = addStockSrc.indexOf('\n              )}', start);
    const body = addStockSrc.slice(start, end);
    assert.match(body, /text-rose-600/);
    assert.match(body, /t\('addStock\.draft\.saveErrorIndicator'\)/);
    assert.match(body, /onClick=\{handleRetryDraftSave\}/);
    assert.match(body, /t\('addStock\.draft\.retryButton'\)/);
  });

  it('hasDraftContent (which gates whether this whole indicator row renders at all) does not depend on draftSaveState — the error indicator can always render when there is content to be worried about', () => {
    const start = addStockSrc.indexOf('const hasDraftContent =');
    const end = addStockSrc.indexOf(';', start);
    const body = addStockSrc.slice(start, end);
    assert.doesNotMatch(body, /draftSaveState/);
  });
});

describe('i18n — saveErrorIndicator/retryButton present in all three locales', () => {
  it('the shared TranslationDict interface (declared once, in pt.ts) includes both keys', () => {
    const ptSrc = src('apps/tenant/src/i18n/locales/pt.ts');
    assert.match(ptSrc, /saveErrorIndicator: string;/);
    assert.match(ptSrc, /retryButton: string;/);
  });

  for (const locale of ['pt', 'en', 'fr']) {
    it(`${locale}.ts declares both keys with a non-empty value`, () => {
      const localeSrc = src(`apps/tenant/src/i18n/locales/${locale}.ts`);
      const valueMatch = localeSrc.match(/saveErrorIndicator: ['"][^'"]+['"],/);
      assert.notEqual(valueMatch, null, `${locale}.ts must have a non-empty saveErrorIndicator value`);
      const retryMatch = localeSrc.match(/retryButton: ['"][^'"]+['"],/);
      assert.notEqual(retryMatch, null, `${locale}.ts must have a non-empty retryButton value`);
    });
  }
});
