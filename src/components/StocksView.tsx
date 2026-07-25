import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBatch } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Boxes, Calendar, Search, ChevronDown, ChevronUp, ShoppingBag, X, Sparkles, Filter } from 'lucide-react';
import { StockBatch } from '../types';

interface GroupedDayStocks {
  date: string; // YYYY-MM-DD
  batches: StockBatch[];
  totalInvestmentValue: number;
  totalMarketValue: number;
  totalEmbeddedProfit: number;
  allClosed: boolean;
}

export const StocksView: React.FC = () => {
  const { batches, quebras, products, currencySymbol } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Selected day group for isolated modal view
  const [selectedDayGroup, setSelectedDayGroup] = useState<GroupedDayStocks | null>(null);

  // Group and filter batches
  const groupedDays = useMemo(() => {
    // Helper map for quick product name lookup
    const productNameMap = new Map<string, string>();
    products.forEach(p => productNameMap.set(p.id, p.name.toLowerCase()));

    // Filter batches by date and query
    const filtered = batches.filter(b => {
      // Date filter
      if (selectedDate && b.dateEntered !== selectedDate) {
        return false;
      }

      // Search query filter (matches product name or date)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const pName = productNameMap.get(b.productId) || '';
        const dateStr = b.dateEntered.toLowerCase();
        const formattedDateStr = formatDate(b.dateEntered).toLowerCase();

        if (!pName.includes(query) && !dateStr.includes(query) && !formattedDateStr.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Group by dateEntered
    const groupsMap = new Map<string, StockBatch[]>();
    filtered.forEach(b => {
      const existing = groupsMap.get(b.dateEntered) || [];
      existing.push(b);
      groupsMap.set(b.dateEntered, existing);
    });

    // Convert map to sorted array (newest date first)
    const sortedDates = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(date => {
      const dayBatches = groupsMap.get(date) || [];
      let totalInvestmentValue = 0;
      let totalMarketValue = 0;
      let allClosed = dayBatches.length > 0;

      dayBatches.forEach(b => {
        // Quebra-aware: figures reflect remaining quantity, not the
        // original purchased quantity, so a lost/damaged unit doesn't
        // silently stay counted as still-sellable stock.
        const calc = calculateBatch(b, quebras.filter(q => q.batchId === b.id));
        totalInvestmentValue += calc.investmentValue;
        totalMarketValue += calc.marketValue;
        if (b.status !== 'closed') {
          allClosed = false;
        }
      });

      const totalEmbeddedProfit = totalMarketValue - totalInvestmentValue;

      return {
        date,
        batches: dayBatches,
        totalInvestmentValue,
        totalMarketValue,
        totalEmbeddedProfit,
        allClosed,
      };
    });
  }, [batches, quebras, products, searchQuery, selectedDate]);

  // Overall totals across current filtered view
  const summaryTotals = useMemo(() => {
    let investment = 0;
    let market = 0;
    groupedDays.forEach(g => {
      investment += g.totalInvestmentValue;
      market += g.totalMarketValue;
    });
    return {
      totalInvestmentValue: investment,
      totalMarketValue: market,
      totalEmbeddedProfit: market - investment,
    };
  }, [groupedDays]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Histórico de Stocks (Compras)
            </h1>
            <p className="text-xs text-gray-500">
              Jornal de entradas de stock agrupadas por dia, com Valor de Investimento, Valor de Mercado e Lucro Embutido (ajustados por quebras).
            </p>
          </div>
        </div>

        {/* Global summary badge for current filter */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-2.5 px-3.5 text-xs font-mono shrink-0">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-bold">Investimento Total</span>
            <span className="text-gray-800 font-bold">{formatCurrency(summaryTotals.totalInvestmentValue, currencySymbol)}</span>
          </div>
          <div className="h-6 w-px bg-gray-50 mx-1"></div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-bold">Lucro Embutido</span>
            <span className={`font-bold ${summaryTotals.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(summaryTotals.totalEmbeddedProfit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Text Search */}
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por produto ou data (ex.: Arroz, Julho)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Picker Filter */}
          <div className="sm:col-span-5 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            {(selectedDate || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSearchQuery('');
                }}
                className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition shrink-0 flex items-center gap-1"
                title="Limpar filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Items count */}
        {groupedDays.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-xs text-gray-500">
            <span>
              A mostrar <strong className="text-gray-800">{groupedDays.length}</strong> {groupedDays.length === 1 ? 'dia' : 'dias'} de compras
            </span>
            <span className="text-[11px] text-gray-500 font-sans">
              Clique numa linha para ver os produtos do dia
            </span>
          </div>
        )}
      </div>

      {/* Stocks Grouped List */}
      {groupedDays.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center max-w-lg mx-auto my-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Nenhuma compra de stock encontrada</h3>
          <p className="text-xs text-gray-500">
            {batches.length === 0
              ? 'Ainda não registou nenhuma entrada de stock. Use o separador "+ Stock" para adicionar.'
              : 'Nenhuma compra corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-100/90 border-b border-gray-200/80 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="col-span-3 sm:col-span-3">Data</div>
            <div className="col-span-3 text-right">Investimento</div>
            <div className="col-span-3 text-right">Mercado</div>
            <div className="col-span-3 text-right">Lucro Embutido</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200/60">
            {groupedDays.map(group => {
              return (
                <div
                  key={group.date}
                  onClick={() => setSelectedDayGroup(group)}
                  className="grid grid-cols-12 gap-1 items-center px-3 py-2.5 hover:bg-gray-100/60 transition cursor-pointer group"
                >
                  {/* DATA */}
                  <div className="col-span-3 sm:col-span-3 min-w-0 flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-orange-600 transition font-mono truncate">
                      {formatDate(group.date)}
                    </span>
                  </div>

                  {/* INVESTIMENTO */}
                  <div className="col-span-3 text-right font-mono">
                    <span className="text-xs font-semibold text-gray-800 block">
                      {formatCurrency(group.totalInvestmentValue, currencySymbol)}
                    </span>
                  </div>

                  {/* MERCADO */}
                  <div className="col-span-3 text-right font-mono">
                    <span className="text-xs font-semibold text-gray-700 block">
                      {formatCurrency(group.totalMarketValue, currencySymbol)}
                    </span>
                  </div>

                  {/* LUCRO EMBUTIDO */}
                  <div className="col-span-3 text-right font-mono">
                    <span
                      className={`text-xs font-bold block ${
                        group.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(group.totalEmbeddedProfit, currencySymbol)}
                    </span>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {group.allClosed ? 'Finalizado' : 'Estimado'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ISOLATED DAY DETAIL MODAL */}
      {selectedDayGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 font-mono">
                    {formatDate(selectedDayGroup.date)}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    {selectedDayGroup.batches.length}{' '}
                    {selectedDayGroup.batches.length === 1 ? 'produto comprado' : 'produtos comprados'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayGroup(null)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Totals Summary Bar inside Modal */}
            <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-wrap items-center justify-around gap-3 text-xs font-mono shrink-0">
              <div className="text-center">
                <span className="text-[10px] text-gray-500 block font-sans font-semibold uppercase">Investimento</span>
                <span className="font-bold text-gray-800 text-sm">
                  {formatCurrency(selectedDayGroup.totalInvestmentValue, currencySymbol)}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-50 hidden sm:block"></div>
              <div className="text-center">
                <span className="text-[10px] text-gray-500 block font-sans font-semibold uppercase">Mercado</span>
                <span className="font-bold text-gray-700 text-sm">
                  {formatCurrency(selectedDayGroup.totalMarketValue, currencySymbol)}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-50 hidden sm:block"></div>
              <div className="text-center">
                <span className="text-[10px] text-gray-500 block font-sans font-semibold uppercase">
                  {selectedDayGroup.allClosed ? 'Lucro Embutido (Final)' : 'Lucro Embutido (Est.)'}
                </span>
                <span
                  className={`font-bold text-sm ${
                    selectedDayGroup.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(selectedDayGroup.totalEmbeddedProfit, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Individual Batches Table */}
            <div className="overflow-y-auto flex-1 border border-gray-200 rounded-2xl bg-gray-100/60 p-2">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-2 px-2.5">Produto</th>
                    <th className="py-2 px-2.5 text-right">Qtd (Rest.)</th>
                    <th className="py-2 px-2.5 text-right">Investimento</th>
                    <th className="py-2 px-2.5 text-right">Mercado</th>
                    <th className="py-2 px-2.5 text-right">Lucro Embutido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {selectedDayGroup.batches.map(batch => {
                    const product = products.find(p => p.id === batch.productId);
                    const productName = product ? product.name : 'Produto Removido';
                    const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));

                    return (
                      <tr key={batch.id} className="hover:bg-white/60 transition">
                        <td className="py-2.5 px-2.5 font-semibold text-gray-900">
                          <span className="block font-bold">{productName}</span>
                          <span className="text-[10px] font-normal text-gray-500 font-mono">
                            Status: {batch.status === 'open' ? '🟢 Ativo' : '🔒 Fechado'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-gray-800">
                          {batch.quantity} → {calc.remainingQuantity}{' '}
                          <span className="text-[10px] font-sans font-normal text-gray-500">
                            {batch.unit || 'un'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-gray-700">
                          <div>{formatCurrency(batch.costPrice, currencySymbol)}</div>
                          <div className="text-[10px] text-gray-500">
                            Tot: {formatCurrency(calc.investmentValue, currencySymbol)}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-gray-700">
                          <div>{formatCurrency(batch.sellingPrice, currencySymbol)}</div>
                          <div className="text-[10px] text-gray-500">
                            Tot: {formatCurrency(calc.marketValue, currencySymbol)}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold">
                          <span className={calc.embeddedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {formatCurrency(calc.embeddedProfit, currencySymbol)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-gray-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDayGroup(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
