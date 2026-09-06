// [Business Worth Evolution — Implementation Authorization, Increment 5;
// Specification §13] Minimal Owner-only screen for Startup Investment:
// record a residual StartupInvestmentEntry (labor/wages/transport/
// preparation/license/other — FR-17) and view the report-time aggregate
// (referenced +Stock/Expense spending within the resolved date investmentWindow,
// plus these entries — FR-16). No redesign of the app's navigation/
// typography — reuses the existing card/button/input styling already
// established by DebtsView/AddExpenseView.
//
// [FR-52] This screen NEVER computes or displays a Startup-Investment-
// vs-Business-Worth "shortfall," "loss," or "performance" figure — it
// shows only the Startup Investment total on its own, never alongside
// (let alone netted against) any Business Worth value.
import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { resolveStartupInvestmentWindow, computeStartupInvestmentTotal } from '../utils/calculations';
import { PiggyBank, Plus, X } from 'lucide-react';
import { StartupInvestmentEntry } from '../types';

function newSubmissionId(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

const CATEGORY_KEYS: StartupInvestmentEntry['category'][] = ['labor', 'wages', 'transport', 'preparation', 'license', 'other'];

export const StartupInvestmentView: React.FC = () => {
  const {
    currencySymbol,
    business,
    stockCounts,
    batches,
    expenses,
    startupInvestmentEntries,
    addStartupInvestmentEntry,
  } = useApp();
  const { t } = useLanguage();

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newCategory, setNewCategory] = useState<StartupInvestmentEntry['category']>('other');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRecordedAt, setNewRecordedAt] = useState(getTodayDateString());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const submissionIdRef = useRef(newSubmissionId('si'));

  // [Rule 8 Finding 6-A] The `initial` StockCount anchors both the investmentWindow
  // resolution below and, for a genuinely new business, the investmentWindow's own
  // end date — never re-derived from anywhere else.
  const initialStockCount = useMemo(
    () => stockCounts.find((sc) => sc.type === 'initial') || null,
    [stockCounts]
  );

  const investmentWindow = useMemo(
    () =>
      business
        ? resolveStartupInvestmentWindow({ businessCreatedAt: business.createdAt, initialStockCount })
        : null,
    [business, initialStockCount]
  );

  const report = useMemo(
    () =>
      computeStartupInvestmentTotal({
        window: investmentWindow,
        batches,
        expenses,
        entries: startupInvestmentEntries,
      }),
    [investmentWindow, batches, expenses, startupInvestmentEntries]
  );

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(newAmount);
    if (!numAmount || numAmount <= 0) {
      setCreateError(t('addExpense.errors.invalidAmount'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await addStartupInvestmentEntry({
        category: newCategory,
        amount: numAmount,
        description: newDescription.trim() || undefined,
        recordedAt: newRecordedAt ? new Date(newRecordedAt).toISOString() : undefined,
        submissionId: submissionIdRef.current,
      });
      setNewAmount('');
      setNewDescription('');
      setNewCategory('other');
      setNewRecordedAt(getTodayDateString());
      submissionIdRef.current = newSubmissionId('si');
      setShowAddEntry(false);
    } catch (err: any) {
      setCreateError(err?.message || 'Erro ao registar o Investimento Inicial.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <PiggyBank className="w-5 h-5 text-violet-600" />
        <h1 className="type-title">{t('startupInvestment.title')}</h1>
      </div>
      <p className="text-sm text-gray-500">{t('startupInvestment.subtitle')}</p>

      {/* [FR-52] Startup Investment shown entirely on its own — no
          Business Worth value appears anywhere on this screen. */}
      <div className="p-4 bg-white rounded-[14px] border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{t('startupInvestment.reportSection.totalLabel')}</span>
          <span className="text-lg font-bold text-[#0B1F3A]">{formatCurrency(report.total, currencySymbol)}</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{t('startupInvestment.reportSection.purchasesLabel')}</span>
            <span>{formatCurrency(report.referencedPurchasesTotal, currencySymbol)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('startupInvestment.reportSection.expensesLabel')}</span>
            <span>{formatCurrency(report.referencedExpensesTotal, currencySymbol)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('startupInvestment.reportSection.entriesLabel')}</span>
            <span>{formatCurrency(report.entriesTotal, currencySymbol)}</span>
          </div>
        </div>
        {!investmentWindow && (
          <p className="text-[11px] text-gray-500">{t('startupInvestment.reportSection.noBaselineYet')}</p>
        )}
      </div>

      <div className="p-4 bg-white rounded-[14px] border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">{t('startupInvestment.entriesSection.title')}</span>
          {!showAddEntry && (
            <button
              onClick={() => setShowAddEntry(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 text-violet-700 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('startupInvestment.entriesSection.addButton')}
            </button>
          )}
        </div>

        {showAddEntry && (
          <form onSubmit={handleCreateEntry} className="mb-3 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('startupInvestment.form.categoryLabel')}</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as StartupInvestmentEntry['category'])}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
                >
                  {CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(`startupInvestment.categories.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('startupInvestment.form.amountLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
                  placeholder={`0 ${currencySymbol}`}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('startupInvestment.form.dateLabel')}</label>
              <input
                type="date"
                value={newRecordedAt}
                onChange={(e) => setNewRecordedAt(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('startupInvestment.form.descriptionLabel')}</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
              />
            </div>
            {createError && <p className="text-[11px] text-rose-600">{createError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-1.5 rounded-md bg-[#0B1F3A] text-white text-xs font-bold disabled:opacity-50"
              >
                {t('startupInvestment.form.submit')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddEntry(false)}
                className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-xs font-bold text-gray-700"
              >
                {t('startupInvestment.form.cancel')}
              </button>
            </div>
          </form>
        )}

        {startupInvestmentEntries.length === 0 ? (
          <p className="text-xs text-gray-500">{t('startupInvestment.entriesSection.empty')}</p>
        ) : (
          <div className="space-y-2">
            {startupInvestmentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-md border border-gray-100">
                <div>
                  <div className="text-xs font-semibold text-gray-700">{t(`startupInvestment.categories.${entry.category}`)}</div>
                  {entry.description && <div className="text-[11px] text-gray-500">{entry.description}</div>}
                </div>
                <div className="text-xs font-bold text-gray-700">{formatCurrency(entry.amount, currencySymbol)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StartupInvestmentView;
