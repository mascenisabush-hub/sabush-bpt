import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBatch, calculateInventoryTotals } from '../utils/calculations';
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
  Eye,
  Gem,
  TrendingUp,
  TrendingDown,
  Boxes,
} from 'lucide-react';
import { Product } from '../types';

interface DashboardViewProps {
  onNavigateToAddStock: (productName?: string) => void;
  onNavigateToAddQuebra: (productId?: string) => void;
  onNavigateToInitialStockCount: () => void;
  onSelectProductDetail: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToAddStock,
  onNavigateToAddQuebra,
  onNavigateToInitialStockCount,
  onSelectProductDetail,
}) => {
  const {
    products, batches, quebras, currencySymbol,
    hasInitialStockCount, initialCapitalValue,
    currentInventoryValue, latestStockCount,
    totalInvestmentValueAllTime, totalMarketValueAllTime, totalEmbeddedProfitAllTime,
    activeBatchCount, totalExpensesAllTime, totalWithdrawalsAllTime,
    businessWorth, capitalGrowth, capitalGrowthPct,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showWorthModal, setShowWorthModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'profit' | 'cost'>('name');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Business-wide Embedded Profit split by batch status. None of this is
  // realized income — it's potential profit still sitting in unsold stock.
  let finalizedEmbeddedProfit = 0;
  let estimatedEmbeddedProfit = 0;

  batches.forEach(batch => {
    const batchQuebras = quebras.filter(q => q.batchId === batch.id);
    const calc = calculateBatch(batch, batchQuebras);
    if (batch.status === 'closed') {
      finalizedEmbeddedProfit += calc.embeddedProfit;
    } else {
      estimatedEmbeddedProfit += calc.embeddedProfit;
    }
  });

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
    const aLatest = aBatches[0];
    const bLatest = bBatches[0];

    if (sortBy === 'cost') {
      return (bLatest?.costPrice || 0) - (aLatest?.costPrice || 0);
    }
    // embedded profit
    const aProfit = aBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.embeddedProfit;
    }, 0);
    const bProfit = bBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.embeddedProfit;
    }, 0);
    return bProfit - aProfit;
  });

  return (
    <div className="space-y-2.5 pb-6">
      {/* INITIAL CAPITAL banner (not yet set) or chip (already set) */}
      {!hasInitialStockCount ? (
        <button
          type="button"
          onClick={onNavigateToInitialStockCount}
          className="w-full flex items-center justify-between gap-2 bg-orange-50 border border-orange-500/30 rounded-2xl px-3.5 py-2.5 text-left hover:bg-orange-100/60 transition group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-xs font-bold text-orange-800 truncate">
              Ainda não definiu o seu Capital Inicial — registe o stock que já possui.
            </span>
          </div>
          <span className="text-[11px] font-bold text-orange-700 group-hover:underline shrink-0">Configurar &rarr;</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowWorthModal(true)}
          className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-left hover:border-indigo-500/40 hover:bg-indigo-50/40 transition group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 shrink-0">
              <Gem className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-semibold uppercase leading-tight">Valor do Negócio</p>
              <p className="font-bold text-gray-800 font-mono text-sm leading-tight">
                {formatCurrency(businessWorth, currencySymbol)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {capitalGrowth !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-[11px] font-bold font-mono ${
                  capitalGrowth > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {capitalGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {capitalGrowth >= 0 ? '+' : ''}
                {capitalGrowthPct.toFixed(1)}%
              </span>
            )}
            <span className="text-[11px] font-bold text-indigo-700 group-hover:underline">Detalhes &rarr;</span>
          </div>
        </button>
      )}

      {/* TOP BAR (single slim row) */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-2 sm:p-2.5 shadow-sm">
        {/* Left: Net Income Wallet Icon Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowBreakdownModal(true)}
            title="Rendimento Líquido - Clique para ver o resumo financeiro"
            className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 hover:bg-orange-500/20 hover:border-orange-500/50 flex items-center justify-center transition active:scale-95"
          >
            <Wallet className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Product Count & Sort Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-gray-500 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 hidden sm:inline-block">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </span>
          <span className="text-[11px] font-semibold text-gray-500 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 hidden sm:inline-flex items-center gap-1">
            <Boxes className="w-3 h-3 text-amber-600" />
            {activeBatchCount} {activeBatchCount === 1 ? 'lote ativo' : 'lotes ativos'}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              title="Filtrar / Ordenar"
              className="p-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-800 transition active:scale-95 flex items-center gap-1 text-xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-orange-600" />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl p-1 z-20 w-44 space-y-0.5 text-xs text-gray-700">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Ordenar Por
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'name' ? 'bg-orange-50 text-orange-700 font-bold' : 'hover:bg-gray-50'}`}
                  >
                    Nome (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('profit'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'profit' ? 'bg-orange-50 text-orange-700 font-bold' : 'hover:bg-gray-50'}`}
                  >
                    Maior Lucro
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('cost'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'cost' ? 'bg-orange-50 text-orange-700 font-bold' : 'hover:bg-gray-50'}`}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-gray-900">Lucro Embutido</h3>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 -mt-1">
              Lucro Embutido é o lucro potencial marcado no stock — nenhuma venda é registada nesta app, por isso este valor nunca é rendimento realizado.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="text-gray-500">Estimado (Lotes Abertos):</span>
                <span className="font-bold font-mono text-orange-700">
                  {formatCurrency(estimatedEmbeddedProfit, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="text-gray-500">Finalizado (Lotes Fechados):</span>
                <span className="font-bold font-mono text-orange-700">
                  {formatCurrency(finalizedEmbeddedProfit, currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-500/30">
                <span className="text-gray-800 font-bold">Lucro Embutido Total:</span>
                <span className={`text-base font-extrabold font-mono ${totalEmbeddedProfitAllTime >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">Despesas Gerais (até hoje):</span>
                <span className="font-bold font-mono text-rose-700">
                  − {formatCurrency(totalExpensesAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">Levantamentos do Dono (não afeta o lucro):</span>
                <span className="font-bold font-mono text-slate-600">
                  − {formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Business Worth Modal */}
      {showWorthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center space-x-2">
                <Gem className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Valor do Negócio</h3>
              </div>
              <button
                onClick={() => setShowWorthModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 -mt-1">
              Valor do Negócio = Valor de Mercado do Stock − Despesas − Levantamentos. Sem venda registada, não existe um valor de "caixa" real — por isso não inventamos um.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Boxes className="w-3.5 h-3.5 text-amber-600" /> Valor de Mercado do Stock:
                </span>
                <span className="font-bold font-mono text-gray-800">
                  {formatCurrency(totalMarketValueAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="text-gray-500">Custo do Stock (Investimento):</span>
                <span className="font-bold font-mono text-gray-800">
                  {formatCurrency(totalInvestmentValueAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">Despesas Gerais:</span>
                <span className="font-bold font-mono text-rose-700">
                  − {formatCurrency(totalExpensesAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">Levantamentos do Dono:</span>
                <span className="font-bold font-mono text-rose-700">
                  − {formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-500/30">
                <span className="text-gray-800 font-bold">Valor Total do Negócio:</span>
                <span className="text-base font-extrabold font-mono text-indigo-700">
                  {formatCurrency(businessWorth, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">Contagem Física Mais Recente:</span>
                <span className="font-bold font-mono text-slate-600">
                  {formatCurrency(currentInventoryValue, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">Capital Inicial (ponto de partida):</span>
                <span className="font-bold font-mono text-slate-600">
                  {formatCurrency(initialCapitalValue, currencySymbol)}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  capitalGrowth >= 0 ? 'bg-emerald-50 border-emerald-500/30' : 'bg-rose-50 border-rose-500/30'
                }`}
              >
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  {capitalGrowth >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  Crescimento do Capital:
                </span>
                <span className={`font-bold font-mono ${capitalGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {capitalGrowth >= 0 ? '+' : ''}
                  {formatCurrency(capitalGrowth, currencySymbol)} ({capitalGrowthPct >= 0 ? '+' : ''}
                  {capitalGrowthPct.toFixed(1)}%)
                </span>
              </div>

              {latestStockCount && (
                <p className="text-[10px] text-gray-400 text-center pt-1">
                  Stock atual baseado na contagem de {latestStockCount.date.split('-').reverse().join('/')}
                  {!hasInitialStockCount && ' · Defina o Capital Inicial para medir o crescimento.'}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowWorthModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Nenhum produto encontrado</h3>
          <p className="text-xs text-gray-500 my-2">
            {products.length === 0
              ? 'Adicione stock para criar o seu primeiro produto!'
              : 'Nenhum produto corresponde à sua pesquisa.'}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => onNavigateToAddStock()}
              className="mt-3 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition shadow-md active:scale-95"
            >
              + Adicionar Primeiro Lote
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-100/90 border-b border-gray-200/80 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="col-span-4 sm:col-span-5">Produto</div>
            <div className="col-span-2 text-right">
              Compra
              <span className="block text-[9px] text-gray-500 font-normal lowercase">/un</span>
            </div>
            <div className="col-span-2 text-right">
              Venda
              <span className="block text-[9px] text-gray-500 font-normal lowercase">/un</span>
            </div>
            <div className="col-span-2 sm:col-span-2 text-right">
              Lucro
              <span className="block text-[9px] text-gray-500 font-normal lowercase">Est. / Final</span>
            </div>
            <div className="col-span-2 sm:col-span-1 text-center pr-1">Ações</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200/60 max-h-[calc(100vh-190px)] overflow-y-auto">
            {filteredProducts.map(product => {
              const productBatches = batches.filter(b => b.productId === product.id);
              const activeBatch = productBatches.find(b => b.status === 'open');
              const closedBatches = productBatches.filter(b => b.status === 'closed');
              const latestBatch = productBatches[0];

              let activeCalc = null;
              if (activeBatch) {
                const activeQuebras = quebras.filter(q => q.batchId === activeBatch.id);
                activeCalc = calculateBatch(activeBatch, activeQuebras);
              }

              let productFinalizedProfit = 0;
              closedBatches.forEach(cb => {
                const cbQuebras = quebras.filter(q => q.batchId === cb.id);
                const cCalc = calculateBatch(cb, cbQuebras);
                productFinalizedProfit += cCalc.embeddedProfit;
              });

              const displayBatch = activeBatch || latestBatch;
              const costPriceText = displayBatch ? formatCurrency(displayBatch.costPrice, currencySymbol) : '-';
              const sellingPriceText = displayBatch ? formatCurrency(displayBatch.sellingPrice, currencySymbol) : '-';

              const displayProfit = activeBatch && activeCalc 
                ? activeCalc.embeddedProfit 
                : productFinalizedProfit;

              const isMenuOpen = openActionMenuId === product.id;

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-1 items-center px-3 py-2.5 hover:bg-gray-100/50 transition group"
                >
                  {/* PRODUTO */}
                  <div
                    onClick={() => onSelectProductDetail(product)}
                    className="col-span-4 sm:col-span-5 pr-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-orange-600 transition truncate">
                        {product.name}
                      </span>
                      {activeCalc?.hasExceededWarning && (
                        <span title="Aviso: Quebras excedem stock">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate font-mono">
                      {activeBatch
                        ? 'Lote ativo'
                        : closedBatches.length > 0
                        ? `${closedBatches.length} ${closedBatches.length === 1 ? 'lote fechado' : 'lotes fechados'}`
                        : 'Sem lote'}
                    </span>
                  </div>

                  {/* COMPRA */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-gray-700 font-mono block">
                      {costPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-gray-500 block font-sans">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* VENDA */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-medium text-gray-700 font-mono block">
                      {sellingPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-gray-500 block font-sans">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* LUCRO */}
                  <div className="col-span-2 sm:col-span-2 text-right">
                    <span
                      className={`text-xs font-bold font-mono block ${
                        displayProfit >= 0
                          ? activeBatch ? 'text-emerald-600' : 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(displayProfit, currencySymbol)}
                    </span>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {activeBatch ? 'Est.' : 'Final'}
                    </span>
                  </div>

                  {/* AÇÕES */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => onNavigateToAddStock(product.name)}
                      title="Adicionar Stock / Editar Lote"
                      className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-gray-50 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionMenuId(isMenuOpen ? null : product.id)}
                        title="Mais opções"
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenActionMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl p-1 z-20 w-40 text-xs space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onSelectProductDetail(product);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-orange-600" />
                              <span>Ver detalhes</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddStock(product.name);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 text-orange-600" />
                              <span>+ Add Stock</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddQuebra(product.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
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
