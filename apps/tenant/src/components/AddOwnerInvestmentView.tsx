import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { ArrowDownToLine, CheckCircle2, ArrowRight } from 'lucide-react';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
// Same duplicate-submission-protection fix as AddWithdrawalView.tsx /
// AddExpenseView.tsx — see either file's own comment for the full
// rationale. Reused unmodified.
import { sanitizeDecimalInput } from '../lib/decimalInputSanitizer';

// Same small local helper as AddWithdrawalView.tsx's own identical
// function — see that file's own comment for the full rationale.
function newSubmissionId(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

interface AddOwnerInvestmentViewProps {
  onComplete: () => void;
}

// Implementation Authorization §45 / AC-OI-UI-1 (OI-PA-3, OI-PA-4):
// dedicated Owner Investment entry point, mirroring AddWithdrawalView.tsx's
// structural pattern exactly. Required: date, amount. Optional: description.
// No other field is authorized — see §45's own "do not add" list.
export const AddOwnerInvestmentView: React.FC<AddOwnerInvestmentViewProps> = ({ onComplete }) => {
  const { addOwnerInvestment, currencySymbol, subscriptionBlocksNewRecords } = useApp();
  const { t } = useLanguage();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Stable across retries of the same in-progress submission; reset to a
  // fresh id only after a successful save (below) — same idempotency
  // pattern as AddWithdrawalView.tsx/AddExpenseView.tsx.
  const submissionIdRef = useRef(newSubmissionId('oi'));

  useUnsavedChangesWarning(
    !submittedMessage && (amount.trim() !== '' || description.trim() !== '')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert(t('addOwnerInvestment.errors.invalidAmount'));
      return;
    }

    // Must await/catch — addOwnerInvestment() can reject (e.g. a
    // backdated-into-a-closed-period investment); a rejected write must
    // never silently show "success" anyway. Same discipline as
    // AddWithdrawalView.tsx/AddExpenseView.tsx.
    setIsSaving(true);
    try {
      await addOwnerInvestment({
        date,
        amount: numAmount,
        description: description.trim() || undefined,
        submissionId: submissionIdRef.current,
      });

      submissionIdRef.current = newSubmissionId('oi');
      setSubmittedMessage(t('addOwnerInvestment.successMessage', { amount: formatCurrency(numAmount, currencySymbol) }));

      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Erro ao registar o investimento do proprietário.');
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
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <ArrowDownToLine className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="type-title">
              {t('addOwnerInvestment.title')}
            </h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('addOwnerInvestment.subtitle')}
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('addOwnerInvestment.registeredTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('addOwnerInvestment.dateLabel')}
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
                  {t('addOwnerInvestment.amountLabel', { symbol: currencySymbol })}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(sanitizeDecimalInput(e.target.value))}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                />
              </div>
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('addOwnerInvestment.descriptionLabel')}
              </label>
              <textarea
                rows={2}
                placeholder={t('addOwnerInvestment.descriptionPlaceholder')}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 min-h-[52px] py-3.5 px-5 text-[15px] rounded-2xl disabled:opacity-60"
              >
                <span>{isSaving ? '...' : t('addOwnerInvestment.submitButton')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
