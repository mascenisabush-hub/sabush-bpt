// [Business Worth Evolution — Implementation Authorization, Increment 10
// (Revision 3); Specification §42.1, §6 State 2, FR-61; BDR Decision 36;
// Implementation Authorization Amendment §23 item 1, §26] A DEDICATED,
// SEPARATE entry point from PeriodicStockCountView — per explicit
// Product Architect decision: Owner-Declared Business Worth is never a
// mode/toggle inside the Contagem flow. Contagem is a physical
// stock-count establishment event; this is an explicit declaration by
// an Owner who already knows the business's worth. Deliberately as
// simple as this establishment method itself is (a figure and a date) —
// no product list, no batch/unit entry, no physical count of any kind,
// matching Rule 8 Finding OD-3's own "single-document create, no paired
// StockCount write" design.
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { Gem, CheckCircle2, ArrowRight, Info } from 'lucide-react';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';

interface DeclareBusinessWorthViewProps {
  onComplete: () => void;
}

export const DeclareBusinessWorthView: React.FC<DeclareBusinessWorthViewProps> = ({ onComplete }) => {
  const { recordOwnerDeclaredBusinessWorth, currencySymbol, subscriptionBlocksNewRecords } = useApp();
  const { t } = useLanguage();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage(t('declareWorth.errors.invalidAmount'));
      return;
    }

    // [Rule 8 Finding OD-3] Submission-identity idempotency — a client
    // regenerates this per submit attempt (not per component mount), so
    // a genuine second declaration always gets its own id, while a
    // network retry of THIS SAME attempt would need to reuse the same
    // id to be treated as a retry rather than a duplicate. This
    // component does not currently implement retry-with-same-id (no
    // network-failure-specific retry path exists here yet) — every
    // submit is treated as a new attempt, matching this form's own
    // single-shot nature; a future retry-affordance, if added, would
    // need to preserve the same submissionId across the retry, not
    // generate a new one.
    const submissionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    setIsSaving(true);
    try {
      const result = await recordOwnerDeclaredBusinessWorth({
        declaredAmount: numAmount,
        date,
        submissionId,
      });

      if (!result.success) {
        setErrorMessage(result.error || t('declareWorth.errors.generic'));
        return;
      }

      setSubmittedMessage(
        t('declareWorth.successMessage', { amount: formatCurrency(numAmount, currencySymbol) })
      );

      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || t('declareWorth.errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  if (subscriptionBlocksNewRecords) {
    return <SubscriptionBlockedNotice />;
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8">
        {/* Title */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#8A6D1F] shrink-0">
            <Gem className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="type-title">{t('declareWorth.title')}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">{t('declareWorth.subtitle')}</p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('declareWorth.registeredTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            {/* [Specification §42.1, §42.3] Sets clear, honest expectations
                before submission — this is a declaration, not a count, and
                it will not carry the same drill-down detail a Contagem
                produces. */}
            <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
              <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-gray-600">{t('declareWorth.infoNote')}</p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-[12px] text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('declareWorth.dateLabel')}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('declareWorth.amountLabel', { symbol: currencySymbol })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 min-h-[52px] py-3.5 px-5 text-[15px] rounded-2xl disabled:opacity-60"
              >
                <span>{isSaving ? '...' : t('declareWorth.submitButton')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
