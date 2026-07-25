import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateReportSummary, isDateInRange } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ClosingPeriodType } from '../types';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  History,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  CalendarRange,
} from 'lucide-react';

interface ClosingViewProps {
  onComplete: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export const ClosingView: React.FC<ClosingViewProps> = ({ onComplete }) => {
  const {
    products,
    batches,
    quebras,
    expenses,
    withdrawals,
    closings,
    recordClosing,
    deleteClosing,
    isPeriodClosed,
    currencySymbol,
    cashOnHand,
    currentInventoryValue,
    businessWorth,
  } = useApp();

  const now = new Date();
  const [periodType, setPeriodType] = useState<ClosingPeriodType>('monthly');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-indexed

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodType === 'monthly') {
      const start = `${year}-${pad(month + 1)}-01`;
      const end = `${year}-${pad(month + 1)}-${pad(lastDayOfMonth(year, month))}`;
      return { startDate: start, endDate: end, periodLabel: `${MONTH_NAMES[month]} ${year}` };
    }
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, periodLabel: `${year}` };
  }, [periodType, year, month]);

  const alreadyClosed = isPeriodClosed(periodType, startDate, endDate);

  const preview = useMemo(
    () => generateReportSummary(startDate, endDate, products, batches, quebras, expenses),
    [startDate, endDate, products, batches, quebras, expenses]
  );

  const withdrawalsInRange = withdrawals.filter((w) => isDateInRange(w.date, startDate, endDate));
  const totalWithdrawalsInRange = withdrawalsInRange.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const sortedClosings = [...closings].sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) yearOptions.push(y);

  const handleClose = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const saved = await recordClosing({ periodType, periodLabel, startDate, endDate });
      setSavedMessage(`Período "${saved.periodLabel}" fechado com sucesso!`);
      setConfirming(false);
      setTimeout(() => onComplete(), 1600);
    } catch (err: any) {
      setError(err.message || 'Erro ao fechar o período.');
      setConfirming(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteClosing(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-3">
        <CheckCircle2 className="w-14 h-14 text-emerald-600" />
        <h2 className="text-lg font-bold text-gray-900">{savedMessage}</h2>
        <p className="text-sm text-gray-500">O período fica permanentemente registado no histórico.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">Fecho Mensal/Anual</h2>
              <p className="text-[11px] text-gray-500">
                Feche um período para bloquear os seus resultados permanentemente no histórico.
              </p>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Tipo</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as ClosingPeriodType)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs font-semibold"
            >
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          {periodType === 'monthly' && (
            <div>
              <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Mês</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Ano</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs font-mono"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-end">
            <div className="w-full bg-slate-50 border border-gray-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-gray-600">
              <CalendarRange className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{formatDate(startDate)} — {formatDate(endDate)}</span>
            </div>
          </div>
        </div>

        {alreadyClosed && (
          <div className="bg-amber-50 border border-amber-500/30 rounded-xl p-3 flex items-start space-x-2 text-xs text-gray-700">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              O período <strong>{periodLabel}</strong> já foi fechado. Consulte o histórico abaixo ou escolha outro período.
            </p>
          </div>
        )}

        {/* Preview */}
        <div className="bg-slate-50 border border-gray-100 rounded-xl p-3 sm:p-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Pré-visualização de {periodLabel}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white border border-gray-100 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Lucro Produtos</p>
              <p className="font-mono font-bold text-sm text-gray-800">{formatCurrency(preview.totalProductProfit, currencySymbol)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Despesas</p>
              <p className="font-mono font-bold text-sm text-rose-600">{formatCurrency(preview.totalExpenses, currencySymbol)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Levantamentos</p>
              <p className="font-mono font-bold text-sm text-orange-600">{formatCurrency(totalWithdrawalsInRange, currencySymbol)}</p>
            </div>
            <div className="bg-white border-2 border-teal-500/30 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Rendimento Líquido</p>
              <p className={`font-mono font-black text-sm ${preview.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(preview.netIncome, currencySymbol)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 text-xs">
            <span className="text-gray-500 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Valor do Negócio (agora)</span>
            <span className="font-mono font-bold text-gray-800">{formatCurrency(businessWorth, currencySymbol)}</span>
          </div>
          <p className="text-[10px] text-gray-400">
            Este é o valor que fica gravado como fotografia (snapshot) ao fechar o período — Caixa {formatCurrency(cashOnHand, currencySymbol)} + Inventário {formatCurrency(currentInventoryValue, currencySymbol)}.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-700 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {!confirming ? (
          <button
            type="button"
            disabled={alreadyClosed}
            onClick={() => setConfirming(true)}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition shadow-lg shadow-teal-50 flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <Lock className="w-4 h-4" />
            <span>Fechar {periodLabel}</span>
          </button>
        ) : (
          <div className="bg-white border-2 border-teal-500/40 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-700 font-semibold">
              Tem a certeza? Depois de fechado, este período fica permanentemente bloqueado e não pode ser editado.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleClose}
                className="flex-1 py-2.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-xs transition"
              >
                {isSaving ? 'A fechar...' : 'Sim, fechar período'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {sortedClosings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-xl">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="font-bold text-sm text-gray-800">Histórico de Fechos ({sortedClosings.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {sortedClosings.map((c, idx) => {
                const prev = sortedClosings[idx + 1];
                const diff = prev ? c.businessWorthAtClose - prev.businessWorthAtClose : null;
                return (
                  <div key={c.id} className="bg-slate-50 border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-teal-600" />
                          {c.periodLabel}
                          <span className="text-[10px] font-normal text-gray-400">
                            ({c.periodType === 'monthly' ? 'Mensal' : 'Anual'})
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatDate(c.startDate)} — {formatDate(c.endDate)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => handleDelete(c.id)}
                        title="Eliminar fecho (reabre o período)"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                      <div className="bg-white border border-gray-100 rounded-lg p-1.5">
                        <p className="text-[9px] text-gray-500">Líquido</p>
                        <p className={`font-mono font-bold text-[11px] ${c.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(c.netIncome, currencySymbol)}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-lg p-1.5">
                        <p className="text-[9px] text-gray-500">Levantado</p>
                        <p className="font-mono font-bold text-[11px] text-orange-600">
                          {formatCurrency(c.totalWithdrawals, currencySymbol)}
                        </p>
                      </div>
                      <div className="bg-white border border-teal-500/30 rounded-lg p-1.5">
                        <p className="text-[9px] text-gray-500">Valor Negócio</p>
                        <p className="font-mono font-bold text-[11px] text-teal-700">
                          {formatCurrency(c.businessWorthAtClose, currencySymbol)}
                        </p>
                      </div>
                    </div>

                    {diff !== null && (
                      <div className={`flex items-center justify-end gap-1 text-[10px] font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                        {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        <span>{diff >= 0 ? '+' : ''}{formatCurrency(diff, currencySymbol)} vs. fecho anterior</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
