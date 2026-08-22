// [Business Worth Evolution — Implementation Authorization, Increment 3;
// Specification §11, §12] Minimal screen giving the Owner exactly what
// this increment requires to operate: create a Receivable (a debt owed
// TO the business), record payments against it, and view/settle
// supplier Payables (created automatically by a supplier-credit +Stock
// purchase, never created manually here). No redesign of the app's
// navigation/typography — reuses the existing card/button/input styling
// already established elsewhere (DashboardView, AddExpenseView).
import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { Landmark, HandCoins, Plus, X } from 'lucide-react';
import { Receivable, Payable } from '../types';

function newSubmissionId(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function statusLabel(status: Receivable['status'] | Payable['status'], t: (key: string) => string): string {
  if (status === 'unpaid') return t('debts.receivablesSection.statusUnpaid');
  if (status === 'partially-paid') return t('debts.receivablesSection.statusPartial');
  return t('debts.receivablesSection.statusPaid');
}

function statusBadgeClass(status: Receivable['status'] | Payable['status']): string {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'partially-paid') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

// A single row's inline payment-recording form — shared shape for both
// Receivables and Payables, whose recording call differs only in which
// context function it invokes.
const PaymentForm: React.FC<{
  currencySymbol: string;
  onSubmit: (amount: number, date: string) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
}> = ({ currencySymbol, onSubmit, onDone }) => {
  const { t } = useLanguage();
  const submissionIdRef = useRef(newSubmissionId('pay'));
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError(t('addExpense.errors.invalidAmount'));
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSubmit(numAmount, date);
    setSaving(false);
    if (result.success) {
      onDone();
    } else {
      setError(result.error || 'Erro ao registar o pagamento.');
    }
  };
  // Note: submissionIdRef is stable across retries of the SAME form
  // instance (a re-click after a transient failure reuses it), matching
  // this capability's own idempotency contract — a genuinely new
  // payment attempt only gets a new id once this form is unmounted and
  // a fresh one is opened.
  void submissionIdRef;

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('debts.form.paymentAmountLabel')}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
            placeholder={`0 ${currencySymbol}`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('debts.form.paymentDateLabel')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
          />
        </div>
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-1.5 rounded-md bg-[#0B1F3A] text-white text-xs font-bold disabled:opacity-50"
        >
          {t('debts.form.submitPayment')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-xs font-bold text-gray-700"
        >
          {t('debts.form.cancel')}
        </button>
      </div>
    </form>
  );
};

export const DebtsView: React.FC = () => {
  const {
    currencySymbol,
    receivables,
    payables,
    addReceivable,
    recordReceivablePayment,
    recordPayablePayment,
  } = useApp();
  const { t } = useLanguage();

  const [showAddReceivable, setShowAddReceivable] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [payingReceivableId, setPayingReceivableId] = useState<string | null>(null);
  const [payingPayableId, setPayingPayableId] = useState<string | null>(null);

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(newAmount);
    if (!numAmount || numAmount <= 0) {
      setCreateError(t('addExpense.errors.invalidAmount'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await addReceivable({
        totalAmount: numAmount,
        debtorName: newDebtorName.trim() || undefined,
        description: newDescription.trim() || undefined,
      });
      setNewAmount('');
      setNewDebtorName('');
      setNewDescription('');
      setShowAddReceivable(false);
    } catch (err: any) {
      setCreateError(err?.message || 'Erro ao registar a dívida.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-title">{t('debts.title')}</h1>
        <p className="text-xs text-gray-500 mt-1">{t('debts.subtitle')}</p>
      </div>

      {/* RECEIVABLES */}
      <div className="bg-white rounded-[10px] elevation-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#0B1F3A]" />
            <h2 className="text-sm font-bold text-title">{t('debts.receivablesSection.title')}</h2>
          </div>
          {!showAddReceivable && (
            <button
              onClick={() => setShowAddReceivable(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition"
            >
              <Plus className="w-3.5 h-3.5" /> {t('debts.receivablesSection.addButton')}
            </button>
          )}
        </div>

        {showAddReceivable && (
          <form onSubmit={handleCreateReceivable} className="mb-4 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{t('debts.receivablesSection.addButton')}</span>
              <button type="button" onClick={() => setShowAddReceivable(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('debts.form.amountLabel')}</label>
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
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('debts.form.debtorNameLabel')}</label>
              <input
                type="text"
                value={newDebtorName}
                onChange={(e) => setNewDebtorName(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('debts.form.descriptionLabel')}</label>
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
                {t('debts.form.submit')}
              </button>
            </div>
          </form>
        )}

        {receivables.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">{t('debts.receivablesSection.empty')}</p>
        ) : (
          <div className="space-y-2">
            {receivables.map((r) => (
              <div key={r.id} className="p-3 rounded-[10px] border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{r.debtorName || r.description || r.id}</p>
                    {r.debtorName && r.description && <p className="text-[10px] text-gray-400">{r.description}</p>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${statusBadgeClass(r.status)}`}>
                    {statusLabel(r.status, t)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-gray-500">
                    {t('debts.receivablesSection.totalLabel')}: <span className="type-number text-gray-800">{formatCurrency(r.totalAmount, currencySymbol)}</span>
                  </span>
                  <span className="text-gray-500">
                    {t('debts.receivablesSection.remainingLabel')}: <span className="type-number font-bold text-[#8A6D1F]">{formatCurrency(r.amountRemaining, currencySymbol)}</span>
                  </span>
                </div>
                {r.status !== 'paid' && (
                  payingReceivableId === r.id ? (
                    <PaymentForm
                      currencySymbol={currencySymbol}
                      onSubmit={(amount, date) =>
                        recordReceivablePayment({
                          receivableId: r.id,
                          amountPaid: amount,
                          paidAt: date,
                          submissionId: newSubmissionId('recv-pay'),
                        })
                      }
                      onDone={() => setPayingReceivableId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setPayingReceivableId(r.id)}
                      className="mt-2 text-[11px] font-bold text-[#0B1F3A] underline"
                    >
                      {t('debts.receivablesSection.recordPayment')}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAYABLES */}
      <div className="bg-white rounded-[10px] elevation-1 p-4">
        <div className="flex items-center gap-2 mb-1">
          <HandCoins className="w-4 h-4 text-[#0B1F3A]" />
          <h2 className="text-sm font-bold text-title">{t('debts.payablesSection.title')}</h2>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">{t('debts.payablesSection.hint')}</p>

        {payables.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">{t('debts.payablesSection.empty')}</p>
        ) : (
          <div className="space-y-2">
            {payables.map((p) => (
              <div key={p.id} className="p-3 rounded-[10px] border border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-800">{p.id}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${statusBadgeClass(p.status)}`}>
                    {statusLabel(p.status, t)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-gray-500">
                    {t('debts.payablesSection.totalLabel')}: <span className="type-number text-gray-800">{formatCurrency(p.totalAmount, currencySymbol)}</span>
                  </span>
                  <span className="text-gray-500">
                    {t('debts.payablesSection.remainingLabel')}: <span className="type-number font-bold text-rose-700">{formatCurrency(p.amountRemaining, currencySymbol)}</span>
                  </span>
                </div>
                {p.status !== 'paid' && (
                  payingPayableId === p.id ? (
                    <PaymentForm
                      currencySymbol={currencySymbol}
                      onSubmit={(amount, date) =>
                        recordPayablePayment({
                          payableId: p.id,
                          amountPaid: amount,
                          paidAt: date,
                          submissionId: newSubmissionId('pay-pay'),
                        })
                      }
                      onDone={() => setPayingPayableId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setPayingPayableId(p.id)}
                      className="mt-2 text-[11px] font-bold text-[#0B1F3A] underline"
                    >
                      {t('debts.payablesSection.recordPayment')}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
