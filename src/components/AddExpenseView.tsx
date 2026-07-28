import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { Receipt, CheckCircle2, ArrowRight } from 'lucide-react';

interface AddExpenseViewProps {
  onComplete: () => void;
}

// Quick-suggestion chips — i18n keys, not literal text. Clicking a chip
// still fills the (free-text, unlocalized) category input with the
// translated label in the active language.
const COMMON_CATEGORY_KEYS = [
  'addExpense.categories.rent',
  'addExpense.categories.utilities',
  'addExpense.categories.transport',
  'addExpense.categories.salaries',
  'addExpense.categories.maintenance',
  'addExpense.categories.other',
];

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({ onComplete }) => {
  const { addExpense, currencySymbol } = useApp();
  const { t } = useLanguage();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert(t('addExpense.errors.missingDescription'));
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert(t('addExpense.errors.invalidAmount'));
      return;
    }

    addExpense({
      date,
      description: description.trim(),
      amount: numAmount,
      category: category.trim() || undefined,
    });

    setSubmittedMessage(t('addExpense.successMessage', { amount: formatCurrency(numAmount, currencySymbol) }));

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
            <Receipt className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-bold text-[17px] sm:text-lg text-[#111827] tracking-tight leading-tight">{t('addExpense.title')}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('addExpense.subtitle')}
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('addExpense.registeredTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-5">
            {/* Description */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('addExpense.descriptionLabel')}
              </label>
              <input
                type="text"
                required
                placeholder={t('addExpense.descriptionPlaceholder')}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/[0.12]"
              />
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('addExpense.expenseDate')}
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
                  {t('addExpense.amountLabel', { symbol: currencySymbol })}
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

            {/* Category Free Text & Suggestion Chips */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('addExpense.categoryLabel')}
              </label>
              <input
                type="text"
                placeholder={t('addExpense.categoryPlaceholder')}
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 text-[#111827] text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/[0.12] mb-2.5"
              />

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                <span className="text-[11px] text-gray-400 mr-1">{t('addExpense.quickSuggestions')}</span>
                {COMMON_CATEGORY_KEYS.map(key => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(label)}
                      className="px-3 py-1.5 rounded-lg bg-[#FAFBFC] hover:bg-[#D4AF37]/[0.08] text-gray-600 hover:text-[#0B1F3A] text-xs font-semibold transition-all duration-150 border border-[#E5E7EB] hover:border-[#D4AF37]/30 active:scale-95"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary flex-1 min-h-[52px] py-3.5 px-5 text-[15px] rounded-2xl"
              >
                <span>{t('addExpense.submitButton')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
