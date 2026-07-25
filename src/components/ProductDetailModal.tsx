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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-gray-900 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-white/90 sticky top-0 z-10">
          <div>
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {product.name}
            </h2>
            <p className="text-xs text-gray-500">
              Histórico completo de lotes e registo de perdas
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteProduct}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 text-xs font-semibold transition flex items-center gap-1"
              title="Eliminar Produto"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Eliminar Produto</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Quick Actions Top Banner */}
          <div className="bg-gray-100/60 p-4 rounded-xl border border-gray-300/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-800 block">Ações Rápidas</span>
              <span className="text-xs text-gray-500">Adicione stock ou registe uma perda para este produto</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddStock(product.name);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                + Adicionar Lote
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddQuebra(product.id);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                + Registar Perda
              </button>
            </div>
          </div>

          {/* Batches List */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Lotes de Stock ({productBatches.length})
            </h3>

            {productBatches.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-xs">
                Nenhum lote registado para este produto ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {productBatches.map(batch => {
                  const batchQuebras = quebras.filter(q => q.batchId === batch.id);
                  const calc = calculateBatch(batch, batchQuebras);

                  return (
                    <div
                      key={batch.id}
                      className={`rounded-2xl border p-4 transition ${
                        batch.status === 'open'
                          ? 'bg-amber-50/60 border-amber-400/60'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Batch Status Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              batch.status === 'open'
                                ? 'bg-amber-100 text-amber-800 border border-amber-400/50'
                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                          >
                            {batch.status === 'open' ? 'Lote Ativo Aberto' : 'Fechado & Finalizado'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Entrada: {formatDate(batch.dateEntered)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 block uppercase font-semibold">
                            {batch.status === 'open' ? 'Lucro Embutido (Est.)' : 'Lucro Embutido (Final)'}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              calc.embeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(calc.embeddedProfit, currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {/* Warning flag */}
                      {calc.hasExceededWarning && (
                        <div className="mt-3 bg-rose-50 border border-rose-300 rounded-lg p-2 flex items-center gap-2 text-xs text-rose-800">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>⚠️ Atenção: As quebras registadas excedem a quantidade inicial do lote!</span>
                        </div>
                      )}

                      {/* Batch Numbers Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs my-3">
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px]">Qtd Inicial → Restante</span>
                          <span className="font-bold text-gray-800">{batch.quantity} → {calc.remainingQuantity} {batch.unit || 'un'}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px]">Quebras</span>
                          <span className={`font-semibold ${calc.totalQuebraQuantity > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                            {calc.totalQuebraQuantity} {batch.unit || 'un'} ({formatCurrency(calc.quebraValue, currencySymbol)})
                          </span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px]">Valor de Investimento</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(calc.investmentValue, currencySymbol)}</span>
                          <span className="text-[9px] text-gray-400 block">{formatCurrency(batch.costPrice, currencySymbol)}/{batch.unit || 'un'}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <span className="text-gray-500 block text-[10px]">Valor de Mercado</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(calc.marketValue, currencySymbol)}</span>
                          <span className="text-[9px] text-gray-400 block">{formatCurrency(batch.sellingPrice, currencySymbol)}/{batch.unit || 'un'}</span>
                        </div>
                      </div>

                      {/* Quebra Entries List for this batch */}
                      {batchQuebras.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-[11px] font-semibold text-rose-700 block mb-2">
                            Perdas Registadas ({batchQuebras.length}):
                          </span>
                          <div className="space-y-1.5">
                            {batchQuebras.map(q => (
                              <div
                                key={q.id}
                                className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="text-gray-800 font-medium">{q.reason}</span>
                                  <span className="text-gray-500 text-[10px] block">
                                    {formatDate(q.date)} • {q.quantityLost} unidades perdidas ({formatCurrency(q.quantityLost * batch.costPrice, currencySymbol)})
                                  </span>
                                </div>
                                <button
                                  onClick={() => deleteQuebra(q.id)}
                                  className="p-1 rounded text-gray-500 hover:text-rose-600 hover:bg-gray-100 transition"
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
        <div className="p-4 border-t border-gray-200 bg-white/90 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
