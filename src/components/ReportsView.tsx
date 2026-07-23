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
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { products, batches, quebras, expenses, currencySymbol, deleteExpense } = useApp();

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
    expenses
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Date Range Selector Bar */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" /> Profit & Loss Report
            </h2>
            <p className="text-xs text-slate-400">
              Select date range to evaluate profits, losses, and net income.
            </p>
          </div>

          {/* Quick Tap Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => handleApplyPreset('this-week')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'this-week'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleApplyPreset('this-month')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'this-month'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handleApplyPreset('last-30')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'last-30'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleApplyPreset('all-time')}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                activePreset === 'all-time'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Phone-Scannable Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Net Income Hero */}
        <div className={`border rounded-3xl p-5 shadow-md flex flex-col justify-between ${
          report.netIncome >= 0
            ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/40 text-emerald-300'
            : 'bg-gradient-to-br from-rose-950/80 to-slate-900 border-rose-500/40 text-rose-300'
        }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block opacity-90">
              Period Net Income
            </span>
            <div className="text-3xl font-black mt-1">
              {formatCurrency(report.netIncome, currencySymbol)}
            </div>
          </div>
          <span className="text-[11px] opacity-80 block mt-2">
            Product Profit − General Expenses
          </span>
        </div>

        {/* Total Product Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Product Profit
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(report.totalProductProfit, currencySymbol)}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 block mt-2">
            Sum of inferred product profits
          </span>
        </div>

        {/* Total Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              General Expenses
            </span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {formatCurrency(report.totalExpenses, currencySymbol)}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 block mt-2">
            {report.expensesList.length} overhead entries
          </span>
        </div>
      </div>

      {/* Per Product Breakdown Section (Mobile-First Cards) */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Product Profit Breakdown ({report.productDetails.length})
          </h3>
        </div>

        {report.productDetails.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
            No product batch or loss activity recorded for this date range.
          </div>
        ) : (
          <div className="space-y-3">
            {report.productDetails.map(detail => {
              const isExpanded = expandedProducts[detail.product.id] ?? true;

              return (
                <div
                  key={detail.product.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
                    <div>
                      <h4 className="font-bold text-base text-slate-100">{detail.product.name}</h4>
                      <span className="text-xs text-slate-400 block">
                        Stock Entered: {detail.quantityEntered} | Assumed Sold: {detail.assumedUnitsSold}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Product Net Profit
                      </span>
                      <span
                        className={`text-lg font-black ${
                          detail.productProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(detail.productProfit, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Batch Cost</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(detail.totalCost, currencySymbol)}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Revenue</span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(detail.totalRevenue, currencySymbol)}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Losses (Quebras)</span>
                      <span className={`font-semibold ${detail.totalQuebraQuantity > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {detail.totalQuebraQuantity} units ({formatCurrency(detail.totalQuebraValue, currencySymbol)})
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Units Sold</span>
                      <span className="font-bold text-emerald-400">
                        {detail.assumedUnitsSold} units
                      </span>
                    </div>
                  </div>

                  {/* Quebras List for this Product */}
                  {detail.quebras.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleExpandProduct(detail.product.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-rose-400 py-1.5 px-2 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/20 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Loss Entries ({detail.quebras.length})
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          {detail.quebras.map((q, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-medium text-slate-200 block">{q.quebra.reason}</span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDate(q.quebra.date)} • {q.quebra.quantityLost} units lost
                                </span>
                              </div>
                              <div className="text-right font-semibold text-rose-400">
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
      <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-purple-400" />
          General Overhead Expenses ({report.expensesList.length})
        </h3>

        {report.expensesList.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
            No general expenses recorded for this date range.
          </div>
        ) : (
          <div className="space-y-2">
            {report.expensesList.map(exp => (
              <div
                key={exp.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{exp.description}</span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">
                      {exp.category || 'General'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {formatDate(exp.date)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {formatCurrency(exp.amount, currencySymbol)}
                  </span>
                  <button
                    onClick={() => deleteExpense(exp.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition active:scale-95"
                    title="Delete expense"
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

