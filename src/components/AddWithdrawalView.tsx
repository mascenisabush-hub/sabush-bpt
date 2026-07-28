import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { HandCoins, CheckCircle2, ArrowRight, Info } from 'lucide-react';

interface AddWithdrawalViewProps {
  onComplete: () => void;
}

// Quick-suggestion chips — i18n keys, not literal text. Clicking a chip
// still fills the (free-text, unlocalized) reason input with the
// translated label in the active language.
const COMMON_REASON_KEYS = [
  'addWithdrawal.reasons.personalUse',
  'addWithdrawal.reasons.salary',
  'addWithdrawal.reasons.family',
  'addWithdrawal.reasons.emergency',
  'addWithdrawal.reasons.home',
  'addWithdrawal.reasons.vehicle',
  'addWithdrawal.reasons.other',
];

export const AddWithdrawalView: React.FC<AddWithdrawalViewProps> = ({ onComplete }) => {
  const { addWithdrawal, currencySymbol } = useApp();
  const { t } = useLanguage();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert(t('addWithdrawal.errors.invalidAmount'));
      return;
    }

    addWithdrawal({
      date,
      amount: numAmount,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSubmittedMessage(t('addWithdrawal.successMessage', { amount: formatCurrency(numAmount, currencySymbol) }));

    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8">
        {/* Title */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <HandCoins className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="type-title">{t('addWithdrawal.title')}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('addWithdrawal.subtitle')}
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('addWithdrawal.registeredTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
              <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: t('addWithdrawal.infoNote') }} />
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('addWithdrawal.withdrawalDate')}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/[0.12] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('addWithdrawal.amountLabel', { symbol: currencySymbol })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/[0.12] font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Reason Free Text & Suggestion Chips */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('addWithdrawal.reasonLabel')}
              </label>
              <input
                type="text"
                placeholder={t('addWithdrawal.reasonPlaceholder')}
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/[0.12] mb-2.5"
              />

              <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                <span className="text-[11px] text-gray-400 mr-1">{t('addWithdrawal.quickSuggestions')}</span>
                {COMMON_REASON_KEYS.map(key => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReason(label)}
                      className="px-3 py-1.5 rounded-lg bg-[#FAFBFC] hover:bg-[#D4AF37]/[0.08] text-gray-600 hover:text-[#0B1F3A] text-xs font-semibold transition-all duration-150 border border-[#E5E7EB] hover:border-[#D4AF37]/30 active:scale-95"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('addWithdrawal.notesLabel')}
              </label>
              <textarea
                rows={2}
                placeholder={t('addWithdrawal.notesPlaceholder')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/[0.12] resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary flex-1 min-h-[52px] py-3.5 px-5 text-[15px] rounded-2xl"
              >
                <span>{t('addWithdrawal.submitButton')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
