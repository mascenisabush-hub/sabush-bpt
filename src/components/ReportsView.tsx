import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateReportSummary } from '../utils/calculations';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { 
  BarChart3, 
  Receipt, 
  AlertTriangle, 
  Package, 
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { products, batches, quebras, expenses, withdrawals, currencySymbol, deleteExpense } = useApp();

  // Date range presets helper
  const todayStr = getTodayDateString();

  const getDateNDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFirstDayOfMonth = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // State for start and end dates
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [activePreset, setActivePreset] = useState<'this-month' | 'this-week' | 'last-30' | 'all-time' | 'custom'>('this-month');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleExpandProduct = (productId: string) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleApplyPreset = (preset: 'this-month' | 'this-week' | 'last-30' | 'all-time') => {
    setActivePreset(preset);
    if (preset === 'this-month') {
      setStartDate(getFirstDayOfMonth());
      setEndDate(todayStr);
    } else if (preset === 'this-week') {
      setStartDate(getDateNDaysAgo(7));
      setEndDate(todayStr);
    } else if (preset === 'last-30') {
      setStartDate(getDateNDaysAgo(30));
      setEndDate(todayStr);
    } else if (preset === 'all-time') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Generate Report
  const report = generateReportSummary(
    startDate,
    endDate,
    products,
    batches,
    quebras,
    expenses,
    withdrawals
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Date Range Selector Bar */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" /> Relatório de Lucros e Perdas
            </h2>
            <p className="text-xs text-gray-500">
              Selecione um intervalo de datas para avaliar lucros, perdas e rendimento líquido.
            </p>
          </div>

          {/* Quick Tap Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => handleApplyPreset('this-week')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'this-week'
                  ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => handleApplyPreset('this-month')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'this-month'
                  ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => handleApplyPreset('last-30')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'last-30'
                  ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              onClick={() => handleApplyPreset('all-time')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'all-time'
                  ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Desde Sempre
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Phone-Scannable Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Embedded Profit Hero */}
        <div className={`border rounded-3xl p-5 shadow-md flex flex-col justify-between ${
          report.totalEmbeddedProfit >= 0
            ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300 text-emerald-800'
            : 'bg-gradient-to-br from-rose-50 to-white border-rose-300 text-rose-800'
        }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block opacity-90">
              Lucro Embutido do Período
            </span>
            <div className="text-3xl font-black mt-1">
              {formatCurrency(report.totalEmbeddedProfit, currencySymbol)}
            </div>
          </div>
          <span className="text-[11px] opacity-80 block mt-2">
            Potencial, não realizado — nenhuma venda é registada nesta app
          </span>
        </div>

        {/* Total Withdrawals */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Levantamentos do Dono
            </span>
            <div className="text-2xl font-bold text-slate-600 mt-1">
              {formatCurrency(report.totalWithdrawals, currencySymbol)}
            </div>
          </div>
          <span className="text-[11px] text-gray-500 block mt-2">
            Não afeta o Lucro Embutido
          </span>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Despesas Gerais
            </span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {formatCurrency(report.totalExpenses, currencySymbol)}
            </div>
          </div>
          <span className="text-[11px] text-gray-500 block mt-2">
            {report.expensesList.length} despesas gerais
          </span>
        </div>
      </div>

      {/* Per Product Breakdown Section (Mobile-First Cards) */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Lucro por Produto ({report.productDetails.length})
          </h3>
        </div>

        {report.productDetails.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs bg-gray-50 rounded-2xl border border-gray-200">
            Nenhuma atividade de stock ou perdas registada para este intervalo de datas.
          </div>
        ) : (
          <div className="space-y-3">
            {report.productDetails.map(detail => {
              const isExpanded = expandedProducts[detail.product.id] ?? true;

              return (
                <div
                  key={detail.product.id}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-200">
                    <div>
                      <h4 className="font-bold text-base text-gray-900">{detail.product.name}</h4>
                      <span className="text-xs text-gray-500 block">
                        Stock Entrado: {detail.quantityEntered}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                        Lucro Embutido do Produto
                      </span>
                      <span
                        className={`text-lg font-black ${
                          detail.productEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(detail.productEmbeddedProfit, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                      <span className="text-gray-500 block text-[10px]">Valor de Investimento</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(detail.totalInvestmentValue, currencySymbol)}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                      <span className="text-gray-500 block text-[10px]">Valor de Mercado</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(detail.totalMarketValue, currencySymbol)}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                      <span className="text-gray-500 block text-[10px]">Perdas (Quebras)</span>
                      <span className={`font-semibold ${detail.totalQuebraQuantity > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                        {detail.totalQuebraQuantity} un ({formatCurrency(detail.totalQuebraValue, currencySymbol)})
                      </span>
                    </div>
                  </div>

                  {/* Quebras List for this Product */}
                  {detail.quebras.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleExpandProduct(detail.product.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-rose-700 py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300/60 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Perdas Registadas ({detail.quebras.length})
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          {detail.quebras.map((q, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-medium text-gray-800 block">{q.quebra.reason}</span>
                                <span className="text-[10px] text-gray-500">
                                  {formatDate(q.quebra.date)} • {q.quebra.quantityLost} unidades perdidas
                                </span>
                              </div>
                              <div className="text-right font-semibold text-rose-600">
                                {formatCurrency(q.value, currencySymbol)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* General Business Expenses Section (Mobile-First Cards) */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-orange-600" />
          Despesas Gerais do Negócio ({report.expensesList.length})
        </h3>

        {report.expensesList.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs bg-gray-50 rounded-2xl border border-gray-200">
            Nenhuma despesa geral registada para este intervalo de datas.
          </div>
        ) : (
          <div className="space-y-2">
            {report.expensesList.map(exp => (
              <div
                key={exp.id}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between text-xs hover:border-gray-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{exp.description}</span>
                    <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-500/30 text-[10px] font-semibold">
                      {exp.category || 'Geral'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block">
                    {formatDate(exp.date)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatCurrency(exp.amount, currencySymbol)}
                  </span>
                  <button
                    onClick={() => deleteExpense(exp.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-gray-100 transition active:scale-95"
                    title="Eliminar despesa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
