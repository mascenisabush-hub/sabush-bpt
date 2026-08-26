import React, { useState } from 'react';
import { Product, StockCountType } from '../types';
import { useApp } from '../context/AppContext';
import { calculateBatch } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { X, AlertTriangle, Trash2, EyeOff, Package, Layers, ClipboardList } from 'lucide-react';

// [Bug fix — a product whose only history is a Contagem count looked
// "waiting for setup"] Owner-reported: clicking a product on the
// Dashboard showed it as if it needed a fresh setup (prices, unit of
// measure), even right after a Contagem where that exact product's
// cost, selling price, and unit had genuinely been recorded. Root
// cause: this modal only ever read `batches` (StockBatch — purchase
// history recorded via Add Stock) — it had NO code path that read
// stockCounts at all, so a product never yet purchased through Add
// Stock, only ever counted, always showed "Nenhum lote registado para
// este produto ainda" regardless of how much real Contagem history it
// actually had. Mirrors TYPE_LABELS' exact wording from
// PeriodicStockCountView.tsx (kept as a small local copy rather than a
// new shared export, matching this modal's own existing preference for
// self-contained display logic over cross-file coupling for a single
// label map).
const STOCK_COUNT_TYPE_LABELS: Record<StockCountType, string> = {
  initial: 'Capital Inicial',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizada',
};

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onNavigateToAddStock: (productName: string) => void;
  onNavigateToAddQuebra: (productId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onNavigateToAddStock,
  onNavigateToAddQuebra,
}) => {
  const { batches, quebras, stockCounts, currencySymbol, deleteProduct, deleteQuebra, updateProduct } = useApp();

  const productBatches = batches
    .filter(b => b.productId === product.id)
    .sort((a, b) => new Date(b.dateEntered).getTime() - new Date(a.dateEntered).getTime());

  // [Bug fix — see this file's header] Every StockCount item that
  // refers to this product, across every confirmed count (both
  // 'initial'/Capital Inicial and every periodic Contagem type) —
  // matched by productId OR by name, mirroring
  // findLatestRememberedProductMemory's own dual-matching rule
  // (productMemoryPriceResolution.ts) for consistency with how this
  // exact same data is otherwise resolved elsewhere in the app. A
  // single Contagem can contain more than one matching item for the
  // same product (multi-unit valuation — some portions counted in Cx,
  // some in Un, each independently priced), so this flattens across
  // both counts AND each count's own items, not one row per count.
  const productStockCountName = product.name.trim().toLowerCase();
  const productStockCountEntries = stockCounts
    .flatMap(count =>
      count.items
        .filter(
          item =>
            item.productId === product.id ||
            item.productName.trim().toLowerCase() === productStockCountName
        )
        .map(item => ({ count, item }))
    )
    .sort((a, b) => new Date(b.count.date).getTime() - new Date(a.count.date).getTime());

  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // [Feature — Owner-requested "black list" for discontinued products]
  // The reversible, non-destructive alternative to handleDeleteProduct
  // below: keeps every batch/quebra/count record intact, just flips
  // one field. Owner-requested explicit confirmation before it takes
  // effect — same pattern as the destructive delete action, even
  // though this one is easily undone (see AddStockView's reactivation
  // prompt) rather than permanent.
  const handleInactivateProduct = async () => {
    if (!window.confirm(`Marcar "${product.name}" como inativo? Deixa de aparecer na Contagem, mas todo o histórico é mantido. Podes reativá-lo mais tarde ao repor stock em Adicionar Stock.`)) {
      return;
    }
    setIsArchiving(true);
    try {
      await updateProduct(product.id, { active: false });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao marcar o produto como inativo.');
    } finally {
      setIsArchiving(false);
    }
  };

  // deleteProduct is async and cascades across multiple sequential
  // Firestore calls (the product doc, then each of its batches, then each
  // of its quebras) — any of which can reject. This must be awaited and
  // caught, or a rejection is silently swallowed while the modal closes as
  // if the whole cascade succeeded. Same class of bug already fixed in
  // AddExpenseView/AddWithdrawalView/AddQuebraView (BDS #07: no
  // silent-failure writes/deletes).
  const handleDeleteProduct = async () => {
    if (!window.confirm(`Tem a certeza que pretende eliminar "${product.name}" e todos os lotes e perdas associados?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao eliminar o produto.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_24px_64px_-16px_rgba(11,31,58,0.35)] text-[#111827] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
              <Package className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-[17px] sm:text-lg text-[#111827] tracking-tight leading-tight truncate flex items-center gap-2">
                {product.name}
                {product.active === false && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                    Inativo
                  </span>
                )}
              </h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Histórico completo de lotes e registo de perdas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {product.active !== false && (
              <button
                onClick={handleInactivateProduct}
                disabled={isArchiving || isDeleting}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-60"
                title="Marcar como Inativo"
              >
                <EyeOff className="w-4 h-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">{isArchiving ? 'A marcar...' : 'Marcar Inativo'}</span>
              </button>
            )}

            <button
              onClick={handleDeleteProduct}
              disabled={isDeleting || isArchiving}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-60"
              title="Eliminar Produto"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">{isDeleting ? 'A eliminar...' : 'Eliminar Produto'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#111827] transition-colors duration-150"
            >
              <X className="w-4.5 h-4.5" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Actions Top Banner */}
          <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[12.5px] font-bold text-[#111827] block">Ações Rápidas</span>
              <span className="text-[11.5px] text-gray-500">Adicione stock ou registe uma perda para este produto</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddStock(product.name);
                }}
                className="lift px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#c19d2e] text-[#0B1F3A] text-xs font-bold transition-colors duration-150"
              >
                + Adicionar Lote
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddQuebra(product.id);
                }}
                className="lift px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors duration-150"
              >
                + Registar Perda
              </button>
            </div>
          </div>

          {/* Batches List */}
          <div>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#0B1F3A]/60" strokeWidth={2.25} />
              Lotes de Stock ({productBatches.length})
            </h3>

            {productBatches.length === 0 ? (
              <div className="text-center py-8 bg-[var(--muted)] rounded-xl border border-[#E5E7EB] text-gray-500 text-xs">
                Nenhum lote registado para este produto ainda.
              </div>
            ) : (
              <div className="space-y-3.5">
                {productBatches.map(batch => {
                  const batchQuebras = quebras.filter(q => q.batchId === batch.id);
                  const calc = calculateBatch(batch, batchQuebras);

                  return (
                    <div
                      key={batch.id}
                      className={`rounded-2xl border p-4 transition-colors duration-150 ${
                        batch.status === 'open'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      {/* Batch Status Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide ${
                              batch.status === 'open'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {batch.status === 'open' ? 'Lote Ativo Aberto' : 'Fechado & Finalizado'}
                          </span>
                          <span className="text-[11.5px] text-gray-500">
                            Entrada: {formatDate(batch.dateEntered)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9.5px] text-gray-500 block uppercase font-bold tracking-wide">
                            {batch.status === 'open' ? 'Lucro Embutido (Est.)' : 'Lucro Embutido (Final)'}
                          </span>
                          <span
                            className={`text-sm type-number tabular-nums ${
                              calc.embeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(calc.embeddedProfit, currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {/* Warning flag */}
                      {calc.hasExceededWarning && (
                        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2 text-[11.5px] text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" strokeWidth={2.25} />
                          <span>Atenção: as quebras registadas excedem a quantidade inicial do lote!</span>
                        </div>
                      )}

                      {/* Batch Numbers Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs my-3">
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Qtd Inicial → Restante</span>
                          <span className="font-bold text-[#111827] font-mono tabular-nums">{batch.quantity} → {calc.remainingQuantity} {batch.unit || 'un'}</span>
                        </div>
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Quebras</span>
                          <span className={`type-number tabular-nums ${calc.totalQuebraQuantity > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                            {calc.totalQuebraQuantity} {batch.unit || 'un'} ({formatCurrency(calc.quebraValue, currencySymbol)})
                          </span>
                        </div>
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Valor de Investimento</span>
                          <span className="font-bold text-[#111827] font-mono tabular-nums">{formatCurrency(calc.investmentValue, currencySymbol)}</span>
                          <span className="text-[10px] text-gray-500 block font-mono">{formatCurrency(batch.costPrice, currencySymbol)}/{batch.unit || 'un'}</span>
                        </div>
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Valor de Mercado</span>
                          <span className="font-bold text-[#111827] font-mono tabular-nums">{formatCurrency(calc.marketValue, currencySymbol)}</span>
                          <span className="text-[10px] text-gray-500 block font-mono">{formatCurrency(batch.sellingPrice, currencySymbol)}/{batch.unit || 'un'}</span>
                        </div>
                      </div>

                      {/* Quebra Entries List for this batch */}
                      {batchQuebras.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/[0.06]">
                          <span className="text-[10.5px] font-bold text-rose-700 uppercase tracking-wide block mb-2">
                            Perdas Registadas ({batchQuebras.length})
                          </span>
                          <div className="space-y-1.5">
                            {batchQuebras.map(q => (
                              <div
                                key={q.id}
                                className="bg-[var(--muted)] px-2.5 py-2 rounded-lg border border-[#E5E7EB] flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="text-[#111827] font-semibold block truncate">{q.reason}</span>
                                  <span className="text-gray-500 text-[10px] block mt-0.5">
                                    {formatDate(q.date)} • {q.quantityLost} unidades perdidas ({formatCurrency(q.quantityLost * batch.costPrice, currencySymbol)})
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    // [Fix #7 — Destructive Operations Safety]
                                    // Previously fired deleteQuebra with no
                                    // confirmation — removing a loss record
                                    // increases this batch's remaining stock
                                    // (and therefore its Investment/Market
                                    // Value), so a stray tap here silently
                                    // inflated Business Worth. Now explicit
                                    // about which record is being removed,
                                    // matching InventoryLossReport's fix.
                                    if (!window.confirm(
                                      `Tem a certeza que pretende eliminar este registo de perda — ${q.quantityLost} unidades em ${formatDate(q.date)} (${q.reason})? Esta ação não pode ser desfeita.`
                                    )) return;
                                    deleteQuebra(q.id).catch((err: any) => alert(err?.message || 'Erro ao remover.'));
                                  }}
                                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-150"
                                  title="Eliminar registo de perda"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* [Bug fix — see this file's header] Contagem/Stock Count
              History — only rendered when there's at least one real
              entry, so a product with genuine purchase-batch history
              but no counts (the ordinary, common case) isn't cluttered
              with an empty section; a product with ONLY count history
              (the case this fix targets) now shows that history here
              instead of silently looking unconfigured. Deliberately
              much simpler than the Batches cards above — a count
              entry has no quebra/embedded-profit concept of its own,
              it's a point-in-time record, not an ongoing batch. */}
          {productStockCountEntries.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-[#0B1F3A]/60" strokeWidth={2.25} />
                Histórico de Contagens ({productStockCountEntries.length})
              </h3>
              <div className="space-y-2">
                {productStockCountEntries.map(({ count, item }, i) => (
                  <div
                    key={`${count.id}-${i}`}
                    className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                          {STOCK_COUNT_TYPE_LABELS[count.type]}
                          {count.type === 'custom' && count.label ? ` — ${count.label}` : ''}
                        </span>
                        <span className="text-[11.5px] text-gray-500">{formatDate(count.date)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-2.5">
                      <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                        <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Quantidade Contada</span>
                        <span className="font-bold text-[#111827] font-mono tabular-nums">{item.quantity} {item.unit || 'un'}</span>
                      </div>
                      <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                        <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Preço de Custo</span>
                        <span className="font-bold text-[#111827] font-mono tabular-nums">{formatCurrency(item.costPrice, currencySymbol)}/{item.unit || 'un'}</span>
                      </div>
                      {typeof item.sellingPrice === 'number' && (
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Preço de Venda</span>
                          <span className="font-bold text-[#111827] font-mono tabular-nums">{formatCurrency(item.sellingPrice, currencySymbol)}/{item.unit || 'un'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#E5E7EB] text-gray-600 hover:bg-gray-50 hover:border-gray-300 text-sm font-bold transition-all duration-150"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
