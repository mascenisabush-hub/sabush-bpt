// [Bug fix — a product whose only history is a Contagem count looked
// "waiting for setup"] Owner-reported: clicking a product on the
// Dashboard showed it as if it needed a fresh setup (prices, unit of
// measure), even right after a Contagem where that exact product's
// cost, selling price, and unit had genuinely been recorded.
//
// Root cause: ProductDetailModal.tsx only ever read `batches`
// (StockBatch — purchase history recorded via Add Stock) — it had NO
// code path that read stockCounts at all, so a product never yet
// purchased through Add Stock, only ever counted, always showed
// "Nenhum lote registado para este produto ainda" regardless of how
// much real Contagem history it actually had.
//
// Fix: a new, separate "Histórico de Contagens" section reads
// stockCounts directly, matching items to this product by productId OR
// by name (mirroring findLatestRememberedProductMemory's own
// dual-matching rule, productMemoryPriceResolution.ts), flattened
// across every count AND every matching item within each count
// (multi-unit valuation can produce more than one matching item per
// count). Only rendered when there's at least one real entry, so a
// product with ordinary purchase-batch history but no counts is
// unaffected.
//
// SCOPE: this repository has no DOM/React render harness — established
// precedent (see tests/add-stock-draft-save-error-visibility.test.ts's
// own header). Source-structure checks only.
//
// HOW TO RUN:
//   npx tsx --test tests/product-detail-modal-stock-count-history.test.ts

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function src(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf-8');
}

const modalSrc = src('apps/tenant/src/components/ProductDetailModal.tsx');

describe('ProductDetailModal.tsx — Contagem/stock count history is now read and displayed, not just batches', () => {
  it('stockCounts is destructured from useApp(), alongside the pre-existing batches', () => {
    assert.match(modalSrc, /const \{ batches, quebras, stockCounts, currencySymbol, deleteProduct, deleteQuebra, updateProduct \} = useApp\(\);/);
  });

  it('productStockCountEntries matches items by productId OR by normalized name, mirroring findLatestRememberedProductMemory\'s own dual-matching rule', () => {
    const idx = modalSrc.indexOf('const productStockCountEntries = stockCounts');
    assert.notEqual(idx, -1);
    const nearby = modalSrc.slice(idx, idx + 500);
    assert.match(nearby, /item\.productId === product\.id/);
    assert.match(nearby, /item\.productName\.trim\(\)\.toLowerCase\(\) === productStockCountName/);
  });

  it('flattens across every count AND every matching item within each count (multi-unit valuation can produce more than one matching item per count)', () => {
    const idx = modalSrc.indexOf('const productStockCountEntries = stockCounts');
    assert.notEqual(idx, -1);
    const nearby = modalSrc.slice(idx, idx + 500);
    assert.match(nearby, /\.flatMap\(count =>/);
  });

  it('sorts newest-first, matching the existing Batches list\'s own sort order', () => {
    const idx = modalSrc.indexOf('const productStockCountEntries = stockCounts');
    assert.notEqual(idx, -1);
    const nearby = modalSrc.slice(idx, idx + 600);
    assert.match(nearby, /\.sort\(\(a, b\) => new Date\(b\.count\.date\)\.getTime\(\) - new Date\(a\.count\.date\)\.getTime\(\)\)/);
  });

  it('the new section only renders when there is at least one real entry — never an empty/cluttering section for a product with ordinary batch-only history', () => {
    assert.match(modalSrc, /\{productStockCountEntries\.length > 0 && \(/);
  });

  it('displays quantity, cost price, and (when present) selling price per matched count entry', () => {
    const sectionIdx = modalSrc.indexOf('Histórico de Contagens');
    assert.notEqual(sectionIdx, -1);
    const nearby = modalSrc.slice(sectionIdx, sectionIdx + 3000);
    assert.match(nearby, /Quantidade Contada/);
    assert.match(nearby, /Preço de Custo/);
    assert.match(nearby, /typeof item\.sellingPrice === 'number'/);
    assert.match(nearby, /Preço de Venda/);
  });

  it('shows the count type label (Capital Inicial / Semanal / Mensal / etc.), matching PeriodicStockCountView.tsx\'s own TYPE_LABELS wording exactly', () => {
    assert.match(modalSrc, /initial: 'Capital Inicial',/);
    assert.match(modalSrc, /weekly: 'Semanal',/);
    assert.match(modalSrc, /monthly: 'Mensal',/);
    assert.match(modalSrc, /quarterly: 'Trimestral',/);
    assert.match(modalSrc, /yearly: 'Anual',/);
    assert.match(modalSrc, /custom: 'Personalizada',/);
  });

  it('the existing Batches section and its "no batches yet" empty state are completely unchanged — this fix only adds a new, separate section', () => {
    assert.match(modalSrc, /Nenhum lote registado para este produto ainda\./);
    assert.match(modalSrc, /Lotes de Stock \(\{productBatches\.length\}\)/);
  });
});
