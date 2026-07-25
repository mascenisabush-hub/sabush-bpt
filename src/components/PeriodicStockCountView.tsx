import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { StockCountType } from '../types';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowRight,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PeriodicStockCountViewProps {
  onComplete: () => void;
}

interface CountRowItem {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
}

const TYPE_LABELS: Record<StockCountType, string> = {
  initial: 'Capital Inicial',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizada',
};

const TYPE_OPTIONS: { value: StockCountType; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizada' },
];

export const PeriodicStockCountView: React.FC<PeriodicStockCountViewProps> = ({ onComplete }) => {
  const {
    businessCategory,
    currencySymbol,
    recordStockCount,
    stockCounts,
    hasInitialStockCount,
    initialCapitalValue,
  } = useApp();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createEmptyRow = (): CountRowItem => ({
    id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    productName: '',
    quantity: '',
    unit: suggestedUnits[0] || 'un',
    costPrice: '',
  });

  const [type, setType] = useState<StockCountType>('monthly');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [rows, setRows] = useState<CountRowItem[]>([createEmptyRow(), createEmptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);

  // Past counts, most recent first, excluding the 'initial' one (shown separately as baseline)
  const pastCounts = [...stockCounts]
    .filter((s) => s.type !== 'initial')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const mostRecentCount = pastCounts[0] || null;
  const comparisonBaseline = mostRecentCount ? mostRecentCount.totalValue : initialCapitalValue;

  const updateRow = (id: string, fields: Partial<CountRowItem>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...fields } : row)));
  };

  const handleAddRow = () => setRows((prev) => [...prev, createEmptyRow()]);

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const totalValue = rows.reduce((acc, row) => {
    const q = parseFloat(row.quantity) || 0;
    const c = parseFloat(row.costPrice) || 0;
    return acc + q * c;
  }, 0);

  const diff = totalValue - comparisonBaseline;
  const diffPct = comparisonBaseline > 0 ? (diff / comparisonBaseline) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === 'custom' && !label.trim()) {
      setError('Dê um nome a esta contagem personalizada (ex: "Antes da Época Festiva").');
      return;
    }

    const itemsToSave = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trimmedName = row.productName.trim();
      if (!trimmedName) continue;

      const numQty = parseFloat(row.quantity) || 0;
      const numCost = parseFloat(row.costPrice) || 0;

      if (numQty <= 0) {
        setError(`Introduza uma quantidade maior que zero para "${trimmedName}".`);
        return;
      }
      if (numCost < 0) {
        setError(`Introduza um custo válido para "${trimmedName}".`);
        return;
      }

      itemsToSave.push({
        productName: trimmedName,
        quantity: numQty,
        unit: row.unit || 'un',
        costPrice: numCost,
      });
    }

    if (itemsToSave.length === 0) {
      setError('Adicione pelo menos um produto com quantidade e custo.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await recordStockCount({
        type,
        label: type === 'custom' ? label.trim() : undefined,
        date,
        items: itemsToSave,
      });
      setSavedTotal(saved.totalValue);
      setSavedMessage(`Contagem ${TYPE_LABELS[type]} registada com sucesso!`);
      setTimeout(() => onComplete(), 1400);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar a contagem de stock.');
    } finally {
      setIsSaving(false);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-3">
        <CheckCircle2 className="w-14 h-14 text-emerald-600" />
        <h2 className="text-lg font-bold text-gray-900">{savedMessage}</h2>
        <p className="text-sm text-gray-500">
          Valor da Contagem: <span className="font-bold text-gray-800">{formatCurrency(savedTotal, currencySymbol)}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">Contagem de Stock Periódica</h2>
              <p className="text-[11px] text-gray-500">
                Registe uma nova contagem física para acompanhar a evolução do seu capital.
              </p>
            </div>
          </div>
        </div>

        {!hasInitialStockCount && (
          <div className="bg-amber-50 border border-amber-500/30 rounded-xl p-3 flex items-start space-x-2 text-xs text-gray-700">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Ainda não definiu o <strong>Capital Inicial</strong>. Esta contagem será guardada, mas recomendamos
              registar primeiro o Capital Inicial no Painel para poder comparar corretamente o crescimento do negócio.
            </p>
          </div>
        )}

        <div className="bg-indigo-50 border border-indigo-500/20 rounded-xl p-3 flex items-start space-x-2 text-xs text-gray-700">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            Esta contagem regista o que existe fisicamente em stock agora. Será comparada com{' '}
            {mostRecentCount ? 'a contagem mais recente' : 'o Capital Inicial'} para mostrar se o valor do seu
            inventário cresceu ou diminuiu.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">
                Tipo de Contagem
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as StockCountType)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs font-semibold"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">
                Data da Contagem
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs font-mono"
              />
            </div>

            {type === 'custom' && (
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">
                  Nome da Contagem
                </label>
                <input
                  type="text"
                  placeholder="Ex: Antes do Natal"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 text-xs"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={row.id} className="bg-slate-50 border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Produto #{idx + 1}</span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Arroz"
                      value={row.productName}
                      onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 text-xs"
                    />
                  </div>

                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Qtd</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-800 text-xs font-mono"
                      />
                    </div>
                    <div className="w-16">
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Unid</label>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-1 py-1 text-gray-800 text-xs text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">
                      Custo/Un ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.costPrice}
                      onChange={(e) => updateRow(row.id, { costPrice: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Valor Total</label>
                    <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 text-xs font-mono font-bold">
                      {formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.costPrice) || 0), currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-gray-200 hover:border-indigo-500/60 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 font-bold text-xs transition flex items-center justify-center space-x-2 group"
          >
            <Plus className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>+ Adicionar outro produto</span>
          </button>

          <div className="bg-white border-2 border-indigo-500/30 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-gray-800 text-sm">Valor Total da Contagem</span>
              <span className="font-black text-lg text-indigo-700 font-mono">
                {formatCurrency(totalValue, currencySymbol)}
              </span>
            </div>

            {(hasInitialStockCount || mostRecentCount) && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-500">
                  vs. {mostRecentCount ? `última contagem (${formatDate(mostRecentCount.date)})` : 'Capital Inicial'}
                </span>
                <span
                  className={`font-bold font-mono flex items-center gap-1 ${
                    diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-gray-500'
                  }`}
                >
                  {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {diff >= 0 ? '+' : ''}
                  {formatCurrency(diff, currencySymbol)} ({diffPct >= 0 ? '+' : ''}
                  {diffPct.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-sm transition shadow-lg shadow-indigo-50 flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <span>{isSaving ? 'A guardar...' : `Confirmar Contagem ${TYPE_LABELS[type]}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* History */}
      {pastCounts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-xl">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="font-bold text-sm text-gray-800">Histórico de Contagens ({pastCounts.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {pastCounts.map((count) => (
                <div
                  key={count.id}
                  className="flex items-center justify-between gap-2 bg-slate-50 border border-gray-100 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {count.label || TYPE_LABELS[count.type]}
                    </p>
                    <p className="text-[10px] text-gray-500">{formatDate(count.date)} · {count.items.length} produtos</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-gray-700">
                    {formatCurrency(count.totalValue, currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
