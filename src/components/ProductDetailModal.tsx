import React from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { calculateBatch } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { X, History, AlertTriangle, CheckCircle2, Trash2, Package, Layers } from 'lucide-react';

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

  const activeBatch = productBatches.find(b => b.status === 'open');

  const handleDeleteProduct = () => {
    if (window.confirm(`Are you sure you want to delete "${product.name}" and all associated batch and loss records?`)) {
      deleteProduct(product.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div>
            <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              {product.name}
            </h2>
            <p className="text-xs text-slate-400">
              Complete batch history & loss log
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteProduct}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition flex items-center gap-1"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete Product</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Quick Actions Top Banner */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Quick Actions</span>
              <span className="text-xs text-slate-500">Add stock or record loss for this product</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddStock(product.name);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                + Add New Batch
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAddQuebra(product.id);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold transition"
              >
                + Record Loss
              </button>
            </div>
          </div>

          {/* Batches List */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Stock Batches ({productBatches.length})
            </h3>

            {productBatches.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
                No batches registered for this product yet.
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
                          ? 'bg-slate-950/90 border-amber-500/40'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      {/* Batch Status Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              batch.status === 'open'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {batch.status === 'open' ? 'Lote Ativo Aberto' : 'Fechado & Finalizado'}
                          </span>
                          <span className="text-xs text-slate-400">
                            Entrada: {formatDate(batch.dateEntered)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            {batch.status === 'open' ? 'Est. Lucro em Curso' : 'Lucro Finalizado'}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              calc.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatCurrency(calc.profit, currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {/* Warning flag */}
                      {calc.hasExceededWarning && (
                        <div className="mt-3 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 flex items-center gap-2 text-xs text-rose-300">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                          <span>⚠️ Atenção: As quebras registadas excedem a quantidade inicial do lote!</span>
                        </div>
                      )}

                      {/* Batch Numbers Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs my-3">
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Qtd Inicial</span>
                          <span className="font-bold text-slate-200">{batch.quantity} {batch.unit || 'un'}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Custo Unitar.</span>
                          <span className="font-semibold text-slate-200">{formatCurrency(batch.costPrice, currencySymbol)}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Venda Unitar.</span>
                          <span className="font-semibold text-slate-200">{formatCurrency(batch.sellingPrice, currencySymbol)}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Quebras</span>
                          <span className={`font-semibold ${calc.totalQuebraQuantity > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {calc.totalQuebraQuantity} {batch.unit || 'un'} ({formatCurrency(calc.quebraValue, currencySymbol)})
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Vendidas (Inferido)</span>
                          <span className="font-bold text-emerald-400">{calc.assumedUnitsSold} {batch.unit || 'un'}</span>
                        </div>
                      </div>

                      {/* Quebra Entries List for this batch */}
                      {batchQuebras.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/60">
                          <span className="text-[11px] font-semibold text-rose-300 block mb-2">
                            Recorded Loss Entries ({batchQuebras.length}):
                          </span>
                          <div className="space-y-1.5">
                            {batchQuebras.map(q => (
                              <div
                                key={q.id}
                                className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="text-slate-300 font-medium">{q.reason}</span>
                                  <span className="text-slate-500 text-[10px] block">
                                    {formatDate(q.date)} • {q.quantityLost} units lost ({formatCurrency(q.quantityLost * batch.costPrice, currencySymbol)})
                                  </span>
                                </div>
                                <button
                                  onClick={() => deleteQuebra(q.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                                  title="Delete loss entry"
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
