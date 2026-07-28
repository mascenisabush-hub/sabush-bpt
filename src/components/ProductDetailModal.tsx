import React from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { calculateBatch } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { X, AlertTriangle, Trash2, Package, Layers } from 'lucide-react';

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
  const { batches, quebras, currencySymbol, deleteProduct, deleteQuebra } = useApp();

  const productBatches = batches
    .filter(b => b.productId === product.id)
    .sort((a, b) => new Date(b.dateEntered).getTime() - new Date(a.dateEntered).getTime());

  const handleDeleteProduct = () => {
    if (window.confirm(`Tem a certeza que pretende eliminar "${product.name}" e todos os lotes e perdas associados?`)) {
      deleteProduct(product.id);
      onClose();
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
              <h2 className="font-bold text-[17px] sm:text-lg text-[#111827] tracking-tight leading-tight truncate">
                {product.name}
              </h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Histórico completo de lotes e registo de perdas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeleteProduct}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5"
              title="Eliminar Produto"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">Eliminar Produto</span>
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
                className="px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#c19d2e] text-[#0B1F3A] text-xs font-bold transition-colors duration-150"
              >
                + Adicionar Lote
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddQuebra(product.id);
                }}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors duration-150"
              >
                + Registar Perda
              </button>
            </div>
          </div>

          {/* Batches List */}
          <div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                            className={`text-sm font-bold font-mono tabular-nums ${
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
                          <span className={`font-bold font-mono tabular-nums ${calc.totalQuebraQuantity > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                            {calc.totalQuebraQuantity} {batch.unit || 'un'} ({formatCurrency(calc.quebraValue, currencySymbol)})
                          </span>
                        </div>
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Valor de Investimento</span>
                          <span className="font-bold text-[#111827] font-mono tabular-nums">{formatCurrency(calc.investmentValue, currencySymbol)}</span>
                          <span className="text-[9px] text-gray-400 block font-mono">{formatCurrency(batch.costPrice, currencySymbol)}/{batch.unit || 'un'}</span>
                        </div>
                        <div className="bg-[var(--muted)] p-2.5 rounded-lg border border-[#E5E7EB]">
                          <span className="text-gray-500 block text-[9.5px] font-semibold uppercase tracking-wide">Valor de Mercado</span>
                          <span className="font-bold text-[#111827] font-mono tabular-nums">{formatCurrency(calc.marketValue, currencySymbol)}</span>
                          <span className="text-[9px] text-gray-400 block font-mono">{formatCurrency(batch.sellingPrice, currencySymbol)}/{batch.unit || 'un'}</span>
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
                                  onClick={() => deleteQuebra(q.id)}
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
