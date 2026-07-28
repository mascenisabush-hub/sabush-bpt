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
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h2 className="type-title">{savedMessage}</h2>
        <p className="text-sm text-gray-500">
          Valor da Contagem:{' '}
          <span className="font-display font-semibold text-[#0B1F3A] tabular-nums">
            {formatCurrency(savedTotal, currencySymbol)}
          </span>
        </p>
      </div>
    );
  }

  // Shared field treatment — identical to Initial Stock Count so the two
  // counting screens read as one consistent system.
  const fieldClass =
    'w-full bg-white border border-[#E5E7EB] rounded-[9px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 ' +
    'transition-all duration-150 focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/[0.12]';
  const fieldLabelClass = 'block type-label mb-1';
  const rowGridClass = 'grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_84px_76px_120px_128px_28px] gap-x-2.5 gap-y-2.5 sm:items-end';

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <ClipboardList className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="type-title">Contagem de Stock Periódica</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Registe uma nova contagem física para acompanhar a evolução do seu capital.
            </p>
          </div>
        </div>

        {!hasInitialStockCount && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-2.5 text-xs text-gray-700">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
            <p className="leading-relaxed">
              Ainda não definiu o <strong className="text-[#111827] font-semibold">Capital Inicial</strong>. Esta contagem será guardada, mas recomendamos
              registar primeiro o Capital Inicial no Painel para poder comparar corretamente o crescimento do negócio.
            </p>
          </div>
        )}

        <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
          <p className="text-[12px] leading-relaxed text-gray-600">
            Esta contagem regista o que existe fisicamente em stock agora. Será comparada com{' '}
            {mostRecentCount ? 'a contagem mais recente' : 'o Capital Inicial'} para mostrar se o valor do seu
            inventário cresceu ou diminuiu.
          </p>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-w-2xl">
            <div>
              <label className={fieldLabelClass}>Tipo de Contagem</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as StockCountType)}
                className={`${fieldClass} font-semibold`}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={fieldLabelClass}>Data da Contagem</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${fieldClass} font-mono tabular-nums`}
              />
            </div>

            {type === 'custom' && (
              <div className="col-span-2 sm:col-span-1">
                <label className={fieldLabelClass}>Nome da Contagem</label>
                <input
                  type="text"
                  placeholder="Ex: Antes do Natal"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {/* Product grid — same column-aligned system as Initial Stock Count */}
          <div>
            <div className={`hidden sm:grid ${rowGridClass.replace('sm:items-end', '')} pb-2 mb-1 border-b border-[#E5E7EB]`}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Nome</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Qtd</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Unid</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Custo/Un</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Valor Total</span>
              <span />
            </div>

            <div className="space-y-1">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className={`group ${rowGridClass} rounded-xl px-2.5 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]`}
                >
                  <div className="col-span-2 sm:col-span-1">
                    <label className={`${fieldLabelClass} sm:hidden`}>Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Arroz"
                      value={row.productName}
                      onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label className={`${fieldLabelClass} sm:hidden`}>Qtd</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                      className={`${fieldClass} font-mono tabular-nums`}
                    />
                  </div>

                  <div>
                    <label className={`${fieldLabelClass} sm:hidden`}>Unid</label>
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                      className={`${fieldClass} font-mono text-center`}
                    />
                  </div>

                  <div>
                    <label className={`${fieldLabelClass} sm:hidden`}>Custo/Un ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.costPrice}
                      onChange={(e) => updateRow(row.id, { costPrice: e.target.value })}
                      className={`${fieldClass} font-mono tabular-nums`}
                    />
                  </div>

                  <div className="flex items-end gap-1.5">
                    <div className="flex-1 min-w-0">
                      <label className={`${fieldLabelClass} sm:hidden`}>Valor Total</label>
                      <div className="w-full bg-[#0B1F3A]/[0.04] rounded-[9px] px-2.5 py-2 text-[#0B1F3A] text-[13px] type-number tabular-nums truncate">
                        {formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.costPrice) || 0), currencySymbol)}
                      </div>
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        aria-label={`Remover produto ${idx + 1}`}
                        className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#2563EB]/50 hover:bg-[#2563EB]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[12.5px] transition-all duration-150 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-3.5 h-3.5 text-[#2563EB] group-hover:scale-110 transition-transform duration-150" />
            <span>Adicionar outro produto</span>
          </button>

          {/* Total + comparison — hero serif figure, comparison line below a
              thin divider so both fit within the same navy surface. */}
          <div className="card-dark-gradient rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-white/70 text-[13px]">Valor Total da Contagem</span>
              <span className="font-display font-semibold text-[22px] sm:text-[24px] text-[#2563EB] tabular-nums leading-none">
                {formatCurrency(totalValue, currencySymbol)}
              </span>
            </div>

            {(hasInitialStockCount || mostRecentCount) && (
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                <span className="text-white/50">
                  vs. {mostRecentCount ? `última contagem (${formatDate(mostRecentCount.date)})` : 'Capital Inicial'}
                </span>
                <span
                  className={`type-number tabular-nums flex items-center gap-1 ${
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-white/50'
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
            className="btn-primary w-full py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{isSaving ? 'A guardar...' : `Confirmar Contagem ${TYPE_LABELS[type]}`}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </form>
      </div>

      {/* History */}
      {pastCounts.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-gray-400" strokeWidth={2.25} />
              <span className="font-bold text-sm text-[#111827]">Histórico de Contagens ({pastCounts.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-1">
              {pastCounts.map((count) => (
                <div
                  key={count.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827]">
                      {count.label || TYPE_LABELS[count.type]}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(count.date)} · {count.items.length} produtos</p>
                  </div>
                  <span className="type-number text-sm text-[#111827] tabular-nums">
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
