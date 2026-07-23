import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Boxes, Calendar, Search, ChevronDown, ChevronUp, ShoppingBag, X, Sparkles, Filter } from 'lucide-react';
import { StockBatch } from '../types';

interface GroupedDayStocks {
  date: string; // YYYY-MM-DD
  batches: StockBatch[];
  totalCompra: number;
  totalVenda: number;
  lucroSeTudoVender: number;
}

export const StocksView: React.FC = () => {
  const { batches, products, currencySymbol } = useApp();
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
      let totalCompra = 0;
      let totalVenda = 0;
      let allClosed = dayBatches.length > 0;

      dayBatches.forEach(b => {
        totalCompra += Number(b.quantity) * Number(b.costPrice);
        totalVenda += Number(b.quantity) * Number(b.sellingPrice);
        if (b.status !== 'closed') {
          allClosed = false;
        }
      });

      const lucroSeTudoVender = totalVenda - totalCompra;

      return {
        date,
        batches: dayBatches,
        totalCompra,
        totalVenda,
        lucroSeTudoVender,
        allClosed,
      };
    });
  }, [batches, products, searchQuery, selectedDate]);

  // Overall totals across current filtered view
  const summaryTotals = useMemo(() => {
    let compra = 0;
    let venda = 0;
    groupedDays.forEach(g => {
      compra += g.totalCompra;
      venda += g.totalVenda;
    });
    return {
      totalCompra: compra,
      totalVenda: venda,
      lucroPotencial: venda - compra,
    };
  }, [groupedDays]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Histórico de Stocks (Compras)
            </h1>
            <p className="text-xs text-slate-400">
              Jornal de entradas de stock agrupadas por dia com totais de compra, venda e lucro potencial.
            </p>
          </div>
        </div>

        {/* Global summary badge for current filter */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2.5 px-3.5 text-xs font-mono shrink-0">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Compra Total</span>
            <span className="text-slate-200 font-bold">{formatCurrency(summaryTotals.totalCompra, currencySymbol)}</span>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-1"></div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Lucro Potencial</span>
            <span className={`font-bold ${summaryTotals.lucroPotencial >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {formatCurrency(summaryTotals.lucroPotencial, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Text Search */}
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por produto ou data (ex.: Arroz, Julho)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {(selectedDate || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSearchQuery('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition shrink-0 flex items-center gap-1"
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
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs text-slate-400">
            <span>
              A mostrar <strong className="text-slate-200">{groupedDays.length}</strong> {groupedDays.length === 1 ? 'dia' : 'dias'} de compras
            </span>
            <span className="text-[11px] text-slate-500 font-sans">
              Clique numa linha para ver os produtos do dia
            </span>
          </div>
        )}
      </div>

      {/* Stocks Grouped List */}
      {groupedDays.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto my-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Nenhuma compra de stock encontrada</h3>
          <p className="text-xs text-slate-400">
            {batches.length === 0
              ? 'Ainda não registou nenhuma entrada de stock. Use o separador "+ Stock" para adicionar.'
              : 'Nenhuma compra corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-3 sm:col-span-3">Data</div>
            <div className="col-span-3 text-right">Total Compra</div>
            <div className="col-span-3 text-right">Total Venda</div>
            <div className="col-span-3 text-right">Lucro</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800/60">
            {groupedDays.map(group => {
              return (
                <div
                  key={group.date}
                  onClick={() => setSelectedDayGroup(group)}
                  className="grid grid-cols-12 gap-1 items-center px-3 py-2.5 hover:bg-slate-800/60 transition cursor-pointer group"
                >
                  {/* DATA */}
                  <div className="col-span-3 sm:col-span-3 min-w-0 flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-emerald-400 transition font-mono truncate">
                      {formatDate(group.date)}
                    </span>
                  </div>

                  {/* TOTAL COMPRA */}
                  <div className="col-span-3 text-right font-mono">
                    <span className="text-xs font-semibold text-slate-200 block">
                      {formatCurrency(group.totalCompra, currencySymbol)}
                    </span>
                  </div>

                  {/* TOTAL VENDA */}
                  <div className="col-span-3 text-right font-mono">
                    <span className="text-xs font-semibold text-slate-300 block">
                      {formatCurrency(group.totalVenda, currencySymbol)}
                    </span>
                  </div>

                  {/* LUCRO */}
                  <div className="col-span-3 text-right font-mono">
                    <span
                      className={`text-xs font-bold block ${
                        group.lucroSeTudoVender >= 0
                          ? group.allClosed
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(group.lucroSeTudoVender, currencySymbol)}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono">
                      {group.allClosed ? 'Finalizado' : 'Potencial'}
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-100 flex items-center gap-2 font-mono">
                    {formatDate(selectedDayGroup.date)}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedDayGroup.batches.length}{' '}
                    {selectedDayGroup.batches.length === 1 ? 'produto comprado' : 'produtos comprados'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayGroup(null)}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Totals Summary Bar inside Modal */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-around gap-3 text-xs font-mono shrink-0">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block font-sans font-semibold uppercase">Total Compra</span>
                <span className="font-bold text-slate-200 text-sm">
                  {formatCurrency(selectedDayGroup.totalCompra, currencySymbol)}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block font-sans font-semibold uppercase">Total Venda</span>
                <span className="font-bold text-slate-300 text-sm">
                  {formatCurrency(selectedDayGroup.totalVenda, currencySymbol)}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block font-sans font-semibold uppercase">
                  {selectedDayGroup.allClosed ? 'Lucro Finalizado' : 'Lucro Potencial'}
                </span>
                <span
                  className={`font-bold text-sm ${
                    selectedDayGroup.lucroSeTudoVender >= 0
                      ? selectedDayGroup.allClosed
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(selectedDayGroup.lucroSeTudoVender, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Individual Batches Table */}
            <div className="overflow-y-auto flex-1 border border-slate-800 rounded-2xl bg-slate-950/60 p-2">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10">
                  <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2 px-2.5">Produto</th>
                    <th className="py-2 px-2.5 text-right">Qtd</th>
                    <th className="py-2 px-2.5 text-right">Compra</th>
                    <th className="py-2 px-2.5 text-right">Venda</th>
                    <th className="py-2 px-2.5 text-right">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {selectedDayGroup.batches.map(batch => {
                    const product = products.find(p => p.id === batch.productId);
                    const productName = product ? product.name : 'Produto Removido';
                    const batchCompra = batch.quantity * batch.costPrice;
                    const batchVenda = batch.quantity * batch.sellingPrice;
                    const batchLucro = batchVenda - batchCompra;

                    return (
                      <tr key={batch.id} className="hover:bg-slate-900/60 transition">
                        <td className="py-2.5 px-2.5 font-semibold text-slate-100">
                          <span className="block font-bold">{productName}</span>
                          <span className="text-[10px] font-normal text-slate-400 font-mono">
                            Status: {batch.status === 'open' ? '🟢 Ativo' : '🔒 Fechado'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-200">
                          {batch.quantity}{' '}
                          <span className="text-[10px] font-sans font-normal text-slate-400">
                            {batch.unit || 'un'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-300">
                          <div>{formatCurrency(batch.costPrice, currencySymbol)}</div>
                          <div className="text-[10px] text-slate-500">
                            Tot: {formatCurrency(batchCompra, currencySymbol)}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-300">
                          <div>{formatCurrency(batch.sellingPrice, currencySymbol)}</div>
                          <div className="text-[10px] text-slate-500">
                            Tot: {formatCurrency(batchVenda, currencySymbol)}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold">
                          <span className={batchLucro >= 0 ? 'text-amber-300' : 'text-rose-400'}>
                            {formatCurrency(batchLucro, currencySymbol)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDayGroup(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
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
