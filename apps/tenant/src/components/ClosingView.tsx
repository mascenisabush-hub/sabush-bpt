import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateReportSummary, isDateInRange } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ClosingPeriodType, Closing } from '../types';
import {
  Lock,
  LockOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarRange,
  Loader2,
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
    recordFechoClosing,
    reopenClosing,
    isPeriodClosed,
    currencySymbol,
    totalMarketValueAllTime,
    businessWorth,
    fechoBaselineDate,
    getEstimatedBusinessWorthAsOf,
    isOwner,
  } = useApp();

  const now = new Date();
  const [periodType, setPeriodType] = useState<ClosingPeriodType>('monthly');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-indexed
  // [Increment 6] Fecho's own end date — the ONLY date the Owner chooses
  // for a Fecho; the start date is never owner-chosen (FR-25) and comes
  // from fechoBaselineDate instead, below.
  const [fechoEndDate, setFechoEndDate] = useState<string>(
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  // [Closing Integrity Amendment v1.0] Reopening replaces the old delete
  // flow — Owner-only (enforced in AppContext + firestore.rules; the
  // button below is hidden for anyone else, not just relying on that
  // enforcement, since a visible-but-rejected control is exactly the gap
  // BDS #7/#8 flagged elsewhere in this codebase).
  const [closingPendingReopen, setClosingPendingReopen] = useState<Closing | null>(null);
  const [reopenReasonDraft, setReopenReasonDraft] = useState('');
  const [reopenLoading, setReopenLoading] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodType === 'monthly') {
      const start = `${year}-${pad(month + 1)}-01`;
      const end = `${year}-${pad(month + 1)}-${pad(lastDayOfMonth(year, month))}`;
      return { startDate: start, endDate: end, periodLabel: `${MONTH_NAMES[month]} ${year}` };
    }
    if (periodType === 'custom') {
      // [Increment 6, FR-25] startDate is always fechoBaselineDate — never
      // independently owner-chosen. A missing baseline is handled by the
      // disabled-close-button/empty-state below, not here.
      const start = fechoBaselineDate ?? '';
      return { startDate: start, endDate: fechoEndDate, periodLabel: `Fecho ${formatDate(start)} — ${formatDate(fechoEndDate)}` };
    }
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, periodLabel: `${year}` };
  }, [periodType, year, month, fechoBaselineDate, fechoEndDate]);

  const alreadyClosed = isPeriodClosed(periodType, startDate, endDate);

  const preview = useMemo(
    () => generateReportSummary(startDate, endDate, products, batches, quebras, expenses, withdrawals),
    [startDate, endDate, products, batches, quebras, expenses, withdrawals]
  );

  const withdrawalsInRange = withdrawals.filter((w) => isDateInRange(w.date, startDate, endDate));
  const totalWithdrawalsInRange = withdrawalsInRange.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  // [Increment 6, FR-25's own 5 required Fecho lines: embedded profits,
  // Levantamentos, expenses, breakages, Estimated Business Worth as of the
  // selected end date] `preview` above already covers the first three;
  // breakages (Quebras) were never previously surfaced by this view at
  // all — only Fecho requires them.
  const totalQuebraValueInRange = preview.productDetails.reduce((sum, p) => sum + p.totalQuebraValue, 0);

  // [FR-53] Never the old pre-Evolution `businessWorth` — the shared §9
  // Estimated Business Worth calculation evaluated as of the selected end
  // date, the exact same call recordFechoClosing itself makes at save
  // time.
  const fechoEstimatedWorth = periodType === 'custom' ? getEstimatedBusinessWorthAsOf(endDate) : null;

  const sortedClosings = [...closings].sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) yearOptions.push(y);

  const handleClose = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const saved =
        periodType === 'custom'
          ? await recordFechoClosing(endDate, periodLabel)
          : await recordClosing({ periodType, periodLabel, startDate, endDate });
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

  const handleConfirmReopen = async () => {
    if (!closingPendingReopen) return;
    setReopenLoading(true);
    setReopenError(null);
    try {
      await reopenClosing(closingPendingReopen.id, reopenReasonDraft.trim() || undefined);
      setClosingPendingReopen(null);
      setReopenReasonDraft('');
    } catch (err: any) {
      setReopenError(err?.message || 'Erro ao reabrir o período.');
    } finally {
      setReopenLoading(false);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h2 className="type-title">{savedMessage}</h2>
        <p className="text-sm text-gray-500">O período fica permanentemente registado no histórico.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <Lock className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="type-title">Fechos</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Feche um período para bloquear os seus resultados permanentemente no histórico.
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block type-label mb-1">Tipo</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as ClosingPeriodType)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs font-semibold transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
              <option value="custom">Fecho (desde a última Contagem)</option>
            </select>
          </div>

          {periodType === 'monthly' && (
            <div>
              <label className="block type-label mb-1">Mês</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {periodType !== 'custom' && (
            <div>
              <label className="block type-label mb-1">Ano</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'custom' && (
            <div>
              {/* [Increment 6, FR-25] The end date is the ONLY date the
                  Owner picks for a Fecho — the start date below is always
                  the active baseline, shown read-only, never an input. */}
              <label className="block type-label mb-1">Até</label>
              <input
                type="date"
                value={fechoEndDate}
                onChange={(e) => setFechoEndDate(e.target.value)}
                min={fechoBaselineDate ?? undefined}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          )}

          <div className="col-span-2 sm:col-span-1 flex items-end">
            <div className="w-full bg-[#FAFBFC] border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 flex items-center gap-1.5 text-[11px] text-gray-600">
              <CalendarRange className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {periodType === 'custom' && !fechoBaselineDate ? (
                <span className="text-amber-600">Sem base ativa ainda</span>
              ) : (
                <span>{formatDate(startDate)} — {formatDate(endDate)}</span>
              )}
            </div>
          </div>
        </div>

        {periodType === 'custom' && (
          <p className="text-[10.5px] leading-relaxed text-gray-400">
            O início do Fecho é sempre a última base ativa (a Contagem mais recente, ou o Capital Inicial histórico) —
            nunca uma data escolhida pelo dono. Apenas a data final é escolhida acima.
          </p>
        )}

        {alreadyClosed && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-gray-700">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.25} />
            <p>
              O período <strong>{periodLabel}</strong> já foi fechado. Consulte o histórico abaixo ou escolha outro período.
            </p>
          </div>
        )}

        {/* Preview */}
        <div className="bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl p-4 sm:p-5 space-y-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Pré-visualização de {periodLabel}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500">Lucro Embutido</p>
              <p className="type-number text-sm text-[#111827] tabular-nums">{formatCurrency(preview.totalEmbeddedProfit, currencySymbol)}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500">Despesas</p>
              <p className="type-number text-sm text-rose-600 tabular-nums">{formatCurrency(preview.totalExpenses, currencySymbol)}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500">Levantamentos</p>
              <p className="type-number text-sm text-[#0B1F3A] tabular-nums">{formatCurrency(totalWithdrawalsInRange, currencySymbol)}</p>
            </div>
            <div className="bg-[#D4AF37]/[0.06] border border-[#D4AF37]/25 rounded-lg p-2.5">
              {periodType === 'custom' ? (
                <>
                  <p className="text-[10px] text-gray-500">Quebras</p>
                  <p className="type-number text-sm text-rose-600 tabular-nums">
                    {formatCurrency(totalQuebraValueInRange, currencySymbol)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-gray-500">Valor de Mercado do Stock</p>
                  <p className="font-display font-semibold text-sm text-[#0B1F3A] tabular-nums">
                    {formatCurrency(totalMarketValueAllTime, currencySymbol)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E5E7EB] text-xs">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" strokeWidth={2.25} />
              {periodType === 'custom' ? `Valor Estimado do Negócio (em ${formatDate(endDate)})` : 'Valor do Negócio (agora)'}
            </span>
            <span className="type-number text-[#111827] tabular-nums">
              {periodType === 'custom'
                ? fechoEstimatedWorth === 'UNKNOWN' || fechoEstimatedWorth === null
                  ? '—'
                  : formatCurrency(fechoEstimatedWorth, currencySymbol)
                : formatCurrency(businessWorth, currencySymbol)}
            </span>
          </div>
          <p className="text-[10.5px] leading-relaxed text-gray-400">
            {periodType === 'custom'
              ? 'Este é o Valor Estimado do Negócio à data final escolhida — o mesmo cálculo usado em qualquer outra leitura do Valor do Negócio, desde a última base ativa. Nenhuma venda é registada nesta app, por isso este número nunca representa dinheiro em caixa.'
              : `Este é o valor que fica gravado como fotografia (snapshot) ao fechar o período — Valor de Mercado do Stock ${formatCurrency(totalMarketValueAllTime, currencySymbol)} − Despesas − Levantamentos. Nenhuma venda é registada nesta app, por isso este número nunca representa dinheiro em caixa.`}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2.25} />
            <p>{error}</p>
          </div>
        )}

        {!confirming ? (
          <button
            type="button"
            disabled={alreadyClosed || (periodType === 'custom' && !fechoBaselineDate)}
            onClick={() => setConfirming(true)}
            className="btn-primary w-full py-3 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Lock className="w-4 h-4" strokeWidth={2.25} />
            <span>Fechar {periodLabel}</span>
          </button>
        ) : (
          <div className="bg-[#0B1F3A]/[0.03] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
            <p className="text-xs text-[#111827] font-semibold leading-relaxed">
              Tem a certeza? Depois de fechado, este período fica permanentemente bloqueado e não pode ser editado.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-[#E5E7EB] text-gray-600 font-semibold text-xs hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleClose}
                className="btn-primary flex-1 py-2.5 px-3 text-xs disabled:opacity-60"
              >
                {isSaving ? 'A fechar...' : 'Sim, fechar período'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {sortedClosings.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" strokeWidth={2.25} />
              <span className="font-bold text-sm text-[#111827]">Histórico de Fechos ({sortedClosings.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {sortedClosings.map((c, idx) => {
                const prev = sortedClosings[idx + 1];
                const diff = prev ? c.businessWorthAtClose - prev.businessWorthAtClose : null;
                const isReopened = c.status === 'reopened';
                return (
                  <div key={c.id} className={`group border rounded-xl p-3.5 space-y-2 transition-colors duration-150 ${isReopened ? 'bg-yellow-50/50 border-yellow-200' : 'bg-[#FAFBFC] border-[#E5E7EB] hover:border-[#D4AF37]/25'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                          {isReopened ? (
                            <LockOpen className="w-3 h-3 text-yellow-700" strokeWidth={2.25} />
                          ) : (
                            <Lock className="w-3 h-3 text-[#B8952F]" strokeWidth={2.25} />
                          )}
                          {c.periodLabel}
                          <span className="text-[10px] font-normal text-gray-400">
                            ({c.periodType === 'monthly' ? 'Mensal' : c.periodType === 'yearly' ? 'Anual' : 'Fecho'})
                          </span>
                          {isReopened && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full px-1.5 py-0.5">
                              Reaberto
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatDate(c.startDate)} — {formatDate(c.endDate)}
                        </p>
                        {isReopened && c.reopenedAt && (
                          <p className="text-[10px] text-yellow-700 mt-0.5">
                            Reaberto por {c.reopenedByName || 'Dono'} em {formatDate(c.reopenedAt.slice(0, 10))}
                            {c.reopenReason ? ` — ${c.reopenReason}` : ''}
                          </p>
                        )}
                      </div>
                      {/* [UI Discoverability & Readability Corrections —
                          Item 2] Was opacity-0 group-hover:opacity-100 with
                          no sm: mobile-safe prefix and no
                          group-focus-within fallback at all — on a touch
                          device (no hover) this correction action could be
                          effectively unreachable. Now uses the same
                          mobile-safe row-action pattern already
                          established elsewhere (visible by default,
                          hover-revealed only at sm:+, keyboard/focus
                          accessible). No change to onClick, title, icon,
                          or the isOwner/!isReopened gating. */}
                      {isOwner && !isReopened && (
                        <button
                          type="button"
                          onClick={() => {
                            setReopenError(null);
                            setReopenReasonDraft('');
                            setClosingPendingReopen(c);
                          }}
                          title="Reabrir período (permite corrigir despesas/retiradas)"
                          className="p-1.5 text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-all duration-150"
                        >
                          <LockOpen className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                      <div className="bg-white border border-[#E5E7EB] rounded-lg p-1.5">
                        <p className="text-[10px] text-gray-500">Lucro Embutido</p>
                        <p className={`type-number text-[11px] tabular-nums ${c.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(c.totalEmbeddedProfit, currencySymbol)}
                        </p>
                      </div>
                      <div className="bg-white border border-[#E5E7EB] rounded-lg p-1.5">
                        <p className="text-[10px] text-gray-500">Levantado</p>
                        <p className="type-number text-[11px] text-[#0B1F3A] tabular-nums">
                          {formatCurrency(c.totalWithdrawals, currencySymbol)}
                        </p>
                      </div>
                      <div className="bg-[#D4AF37]/[0.06] border border-[#D4AF37]/25 rounded-lg p-1.5">
                        <p className="text-[10px] text-gray-500">Valor Negócio</p>
                        <p className="type-number text-[11px] text-[#0B1F3A] tabular-nums">
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

      {closingPendingReopen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                <LockOpen className="w-5 h-5 text-yellow-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Reabrir Período</h3>
                <p className="text-[11px] text-gray-500">Desbloqueia despesas e retiradas deste período para correção.</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Período</span>
                  <span className="font-bold text-gray-900">{closingPendingReopen.periodLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Intervalo</span>
                  <span className="font-mono text-gray-900">{formatDate(closingPendingReopen.startDate)} — {formatDate(closingPendingReopen.endDate)}</span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-yellow-800 leading-relaxed">
                  O registo original de fecho <span className="font-bold">não é apagado</span> — fica marcado como
                  "Reaberto" para histórico. As despesas e retiradas deste período ficam editáveis/removíveis novamente
                  até fechar o período outra vez.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Motivo (opcional)</label>
                <input
                  type="text"
                  value={reopenReasonDraft}
                  onChange={e => setReopenReasonDraft(e.target.value)}
                  placeholder="Ex: Despesa registada com valor errado"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-600"
                />
              </div>

              {reopenError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {reopenError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setClosingPendingReopen(null);
                  setReopenError(null);
                }}
                disabled={reopenLoading}
                className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                disabled={reopenLoading}
                className="px-4 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {reopenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LockOpen className="w-3.5 h-3.5" />}
                {reopenLoading ? 'A reabrir...' : 'Reabrir Período'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
