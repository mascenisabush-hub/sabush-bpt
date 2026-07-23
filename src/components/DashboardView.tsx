import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBatch } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  X,
  Wallet,
  Pencil,
  MoreVertical,
  SlidersHorizontal,
  Plus,
  Eye
} from 'lucide-react';
import { Product } from '../types';

interface DashboardViewProps {
  onNavigateToAddStock: (productName?: string) => void;
  onNavigateToAddQuebra: (productId?: string) => void;
  onSelectProductDetail: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToAddStock,
  onNavigateToAddQuebra,
  onSelectProductDetail,
}) => {
  const { products, batches, quebras, expenses, currencySymbol } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'profit' | 'cost'>('name');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Business-wide high-level metrics
  let totalFinalizedProfit = 0;
  let totalRunningEstimatedProfit = 0;

  batches.forEach(batch => {
    const batchQuebras = quebras.filter(q => q.batchId === batch.id);
    const calc = calculateBatch(batch, batchQuebras);
    if (batch.status === 'closed') {
      totalFinalizedProfit += calc.profit;
    } else {
      totalRunningEstimatedProfit += calc.profit;
    }
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalProjectedNetIncome = (totalFinalizedProfit + totalRunningEstimatedProfit) - totalExpenses;

  // Filter products by search
  let filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    const aBatches = batches.filter(batch => batch.productId === a.id);
    const bBatches = batches.filter(batch => batch.productId === b.id);
    const aLatest = aBatches[aBatches.length - 1];
    const bLatest = bBatches[bBatches.length - 1];

    if (sortBy === 'cost') {
      return (bLatest?.costPrice || 0) - (aLatest?.costPrice || 0);
    }
    // profit
    const aProfit = aBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.profit;
    }, 0);
    const bProfit = bBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.profit;
    }, 0);
    return bProfit - aProfit;
  });

  return (
    <div className="space-y-2.5 pb-6">
      {/* TOP BAR (single slim row) */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-sm">
        {/* Left: Net Income Wallet Icon Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowBreakdownModal(true)}
            title="Rendimento Líquido - Clique para ver o resumo financeiro"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 flex items-center justify-center transition active:scale-95"
          >
            <Wallet className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Product Count & Sort Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 hidden sm:inline-block">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              title="Filtrar / Ordenar"
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition active:scale-95 flex items-center gap-1 text-xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-20 w-44 space-y-0.5 text-xs text-slate-300">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Ordenar Por
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'name' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'hover:bg-slate-800'}`}
                  >
                    Nome (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('profit'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'profit' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'hover:bg-slate-800'}`}
                  >
                    Maior Lucro
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('cost'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'cost' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'hover:bg-slate-800'}`}
                  >
                    Preço Custo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">Resumo Financeiro</h3>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Estimativa Ativa (Lotes Abertos):</span>
                <span className="font-bold font-mono text-amber-300">
                  {formatCurrency(totalRunningEstimatedProfit, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Lucros Finalizados (Lotes Fechados):</span>
                <span className="font-bold font-mono text-emerald-300">
                  {formatCurrency(totalFinalizedProfit, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Despesas Gerais:</span>
                <span className="font-bold font-mono text-rose-300">
                  − {formatCurrency(totalExpenses, currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <span className="text-slate-200 font-bold">Rendimento Líquido Projetado:</span>
                <span className={`text-base font-extrabold font-mono ${totalProjectedNetIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(totalProjectedNetIncome, currencySymbol)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Nenhum produto encontrado</h3>
          <p className="text-xs text-slate-400 my-2">
            {products.length === 0
              ? 'Adicione stock para criar o seu primeiro produto!'
              : 'Nenhum produto corresponde à sua pesquisa.'}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => onNavigateToAddStock()}
              className="mt-3 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md active:scale-95"
            >
              + Adicionar Primeiro Lote
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-4 sm:col-span-5">Produto</div>
            <div className="col-span-2 text-right">
              Compra
              <span className="block text-[9px] text-slate-500 font-normal lowercase">/un</span>
            </div>
            <div className="col-span-2 text-right">
              Venda
              <span className="block text-[9px] text-slate-500 font-normal lowercase">/un</span>
            </div>
            <div className="col-span-2 sm:col-span-2 text-right">
              Lucro
              <span className="block text-[9px] text-slate-500 font-normal lowercase">Est. / Final</span>
            </div>
            <div className="col-span-2 sm:col-span-1 text-center pr-1">Ações</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800/60 max-h-[calc(100vh-190px)] overflow-y-auto">
            {filteredProducts.map(product => {
              const productBatches = batches.filter(b => b.productId === product.id);
              const activeBatch = productBatches.find(b => b.status === 'open');
              const closedBatches = productBatches.filter(b => b.status === 'closed');
              const latestBatch = productBatches[productBatches.length - 1];

              let activeCalc = null;
              if (activeBatch) {
                const activeQuebras = quebras.filter(q => q.batchId === activeBatch.id);
                activeCalc = calculateBatch(activeBatch, activeQuebras);
              }

              let productFinalizedProfit = 0;
              closedBatches.forEach(cb => {
                const cbQuebras = quebras.filter(q => q.batchId === cb.id);
                const cCalc = calculateBatch(cb, cbQuebras);
                productFinalizedProfit += cCalc.profit;
              });

              const displayBatch = activeBatch || latestBatch;
              const costPriceText = displayBatch ? formatCurrency(displayBatch.costPrice, currencySymbol) : '-';
              const sellingPriceText = displayBatch ? formatCurrency(displayBatch.sellingPrice, currencySymbol) : '-';

              const displayProfit = activeBatch && activeCalc 
                ? activeCalc.profit 
                : productFinalizedProfit;

              const isMenuOpen = openActionMenuId === product.id;

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-1 items-center px-3 py-2.5 hover:bg-slate-800/50 transition group"
                >
                  {/* PRODUTO */}
                  <div
                    onClick={() => onSelectProductDetail(product)}
                    className="col-span-4 sm:col-span-5 pr-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-emerald-400 transition truncate">
                        {product.name}
                      </span>
                      {activeCalc?.hasExceededWarning && (
                        <span title="Aviso: Quebras excedem stock">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate font-mono">
                      {activeBatch
                        ? 'Lote ativo'
                        : closedBatches.length > 0
                        ? `${closedBatches.length} ${closedBatches.length === 1 ? 'lote fechado' : 'lotes fechados'}`
                        : 'Sem lote'}
                    </span>
                  </div>

                  {/* COMPRA */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-slate-300 font-mono block">
                      {costPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-slate-500 block font-sans">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* VENDA */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-slate-300 font-mono block">
                      {sellingPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-slate-500 block font-sans">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* LUCRO */}
                  <div className="col-span-2 sm:col-span-2 text-right">
                    <span
                      className={`text-xs font-bold font-mono block ${
                        displayProfit >= 0
                          ? activeBatch ? 'text-emerald-400' : 'text-emerald-300'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(displayProfit, currencySymbol)}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono">
                      {activeBatch ? 'Est.' : 'Final'}
                    </span>
                  </div>

                  {/* AÇÕES */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => onNavigateToAddStock(product.name)}
                      title="Adicionar Stock / Editar Lote"
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionMenuId(isMenuOpen ? null : product.id)}
                        title="Mais opções"
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenActionMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-20 w-40 text-xs space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onSelectProductDetail(product);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center space-x-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ver detalhes</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddStock(product.name);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center space-x-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                              <span>+ Add Stock</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddQuebra(product.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center space-x-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>+ Quebra</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
