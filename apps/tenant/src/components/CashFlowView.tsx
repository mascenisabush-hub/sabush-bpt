// [Cash Flow consolidation — Product Architect decision] Screen giving
// the Owner exactly what this increment requires to operate: create a
// Receivable (a debt owed TO the business), record payments against
// it, and view/settle supplier Payables (created automatically by a
// supplier-credit +Stock purchase — AND, per the "Owner-recorded
// opening-balance debts" addition below, also creatable directly here,
// for an existing business's pre-system supplier debt). No redesign of
// the app's navigation/typography — reuses the existing
// card/button/input styling already established elsewhere
// (DashboardView, AddExpenseView).
//
// [Owner-recorded cash position] Also adds a third card, entirely new:
// letting the Owner declare "cash the business currently has," any time
// they like — most importantly once, when first onboarding an existing
// business, so its true starting cash isn't silently treated as zero.
// See CashPositionDeclaration's own type comment (types.ts) for the full
// design and how this reaches Business Worth.
//
// [Cash Flow consolidation] Formerly DebtsView.tsx ("Dívidas") — renamed
// and expanded per explicit Product Architect decision: "Dívidas"
// (Debts) was an inaccurate umbrella term for a screen that already
// tracked Receivables (money owed TO the business, the opposite of a
// debt from its own perspective) and Cash Position (unrelated to debt
// at all), alongside Payables (the one part "Dívidas" did describe).
// Two more screens — AddExpenseView and AddWithdrawalView, both genuine
// dated cash-outflow events, formerly their own separate top-nav tabs
// (add-expense/add-withdrawal) — are now embedded here as two further
// collapsible sections (EXPENSES, WITHDRAWALS, below), reusing those
// components' own, unmodified form/submission logic entirely; only the
// onComplete callback differs (collapses the section here, rather than
// navigating to a different top-level tab, since there is no longer a
// separate route to return from). declare-worth (Declarar Valor do
// Negócio) was deliberately EXCLUDED from this consolidation — it is
// not a cash movement at all (its own subtitle: an alternative to doing
// a physical Contagem, not a companion to tracking cash) and remains
// its own separate tab, unchanged.
//
// [Permission note] Merging AddExpenseView in means expense-recording,
// previously available to Staff as well as Owner, is now reachable only
// through this Owner-only screen — an explicit, accepted trade-off of
// this consolidation, not an oversight. A configurable per-staff
// permission system (rather than the current fixed ownerOnly boolean)
// was raised as a valuable direction for a future, separate change.
import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { Landmark, HandCoins, Wallet, Plus, X, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { Receivable, Payable, type SupplierRecord } from '../types';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import { AddExpenseView } from './AddExpenseView';
import { AddWithdrawalView } from './AddWithdrawalView';

function newSubmissionId(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function statusLabel(status: Receivable['status'] | Payable['status'], t: (key: string) => string): string {
  if (status === 'unpaid') return t('cashFlow.receivablesSection.statusUnpaid');
  if (status === 'partially-paid') return t('cashFlow.receivablesSection.statusPartial');
  return t('cashFlow.receivablesSection.statusPaid');
}

function statusBadgeClass(status: Receivable['status'] | Payable['status']): string {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'partially-paid') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

// [Bug fix — auto-created Payables displayed a meaningless raw document
// ID instead of the supplier's name] Payable.supplierName is, by its
// own documented contract (types.ts), "Never set on the automatic path"
// — the exact path every +Stock supplier-credit purchase uses
// (addMultipleStockBatches only ever writes supplierId there, never a
// name). Without this resolution, {p.supplierName || p.description ||
// p.id} fell all the way through to the raw document id for every
// single auto-created Payable — the overwhelming majority of real-world
// entries in this list, since manual/opening-balance Payables
// (isManualEntry) are the narrower case. Resolves supplierId against
// the live suppliers array (already fetched for this screen's own
// receivable/payable-adding forms elsewhere) — never a second,
// independently-invented lookup or a new Firestore read.
function resolvePayableDisplayName(p: Payable, suppliers: SupplierRecord[], t: (key: string) => string): string {
  if (p.supplierName) return p.supplierName;
  if (p.supplierId) {
    const matched = suppliers.find((s) => s.id === p.supplierId);
    if (matched) return matched.name;
  }
  if (p.description) return p.description;
  // Genuinely nothing to identify this by (a supplierId that no longer
  // resolves to any existing SupplierRecord, or an automatic Payable
  // with neither) — an honest, translated placeholder, never the raw
  // document id, which was never meant to be Owner-facing at all.
  return t('cashFlow.payablesSection.unknownSupplier');
}

// A single row's inline payment-recording form — shared shape for both
// Receivables and Payables, whose recording call differs only in which
// context function it invokes.
const PaymentForm: React.FC<{
  currencySymbol: string;
  onSubmit: (amount: number, date: string, submissionId: string) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
}> = ({ currencySymbol, onSubmit, onDone }) => {
  const { t } = useLanguage();
  const submissionIdRef = useRef(newSubmissionId('pay'));
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [Finding 3 fix — no leave-page warning] Same rationale as
  // AddExpenseView.tsx's own identical addition — a payment amount
  // typed here and then lost to an accidental tab close is real,
  // avoidable data loss.
  useUnsavedChangesWarning(amount.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError(t('addExpense.errors.invalidAmount'));
      return;
    }
    setSaving(true);
    setError(null);
    // [Bug fix — duplicate-payment risk on retry] submissionIdRef.current
    // is passed here, not a freshly generated id — this is the entire
    // point of the ref: a re-click after a transient failure (network
    // blip, timeout) reuses the SAME id, so recordReceivablePayment/
    // recordPayablePayment's own transaction-based idempotency check
    // (a deterministic doc id at businesses/{id}/receivablePayments/
    // {submissionId}) recognizes the retry and safely no-ops instead of
    // recording the same payment twice. Previously this call site
    // generated a brand-new id on every submit, silently defeating that
    // protection — the exact bug this fix corrects.
    const result = await onSubmit(numAmount, date, submissionIdRef.current);
    setSaving(false);
    if (result.success) {
      onDone();
    } else {
      setError(result.error || 'Erro ao registar o pagamento.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.paymentAmountLabel')}</label>
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
          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.paymentDateLabel')}</label>
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
          {t('cashFlow.form.submitPayment')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-xs font-bold text-gray-700"
        >
          {t('cashFlow.form.cancel')}
        </button>
      </div>
    </form>
  );
};

export const CashFlowView: React.FC = () => {
  const {
    currencySymbol,
    receivables,
    payables,
    addReceivable,
    addPayable,
    recordReceivablePayment,
    recordPayablePayment,
    cashPositionDeclarations,
    addCashPositionDeclaration,
    // [Bug fix — auto-created Payables displayed a meaningless raw
    // document ID instead of the supplier's name] Needed to resolve
    // Payable.supplierId back to an actual name — see
    // resolvePayableDisplayName's own comment, below, for the full
    // history.
    suppliers,
  } = useApp();
  const { t } = useLanguage();

  const [showAddReceivable, setShowAddReceivable] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showAddPayable, setShowAddPayable] = useState(false);
  const [newPayableAmount, setNewPayableAmount] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newPayableDescription, setNewPayableDescription] = useState('');
  const [creatingPayable, setCreatingPayable] = useState(false);
  const [createPayableError, setCreatePayableError] = useState<string | null>(null);

  const [payingReceivableId, setPayingReceivableId] = useState<string | null>(null);
  const [payingPayableId, setPayingPayableId] = useState<string | null>(null);

  const [showUpdateCash, setShowUpdateCash] = useState(false);
  // [Cash Flow consolidation] Toggle state for the two embedded
  // sections below (EXPENSES, WITHDRAWALS) — matching the same
  // show/hide pattern already used for showAddReceivable/showAddPayable
  // above, not a new interaction pattern.
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddWithdrawal, setShowAddWithdrawal] = useState(false);
  const [showCashHistory, setShowCashHistory] = useState(false);
  const [newCashAmount, setNewCashAmount] = useState('');
  const [newCashDate, setNewCashDate] = useState(getTodayDateString());
  const [savingCash, setSavingCash] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);

  // [Finding 3 fix — no leave-page warning] Covers whichever of this
  // screen's three quick-add forms (Nova Dívida a Receber, Nova
  // Dívida, Atualizar Posição de Caixa) is currently open and has real
  // content typed into it — same rationale as AddExpenseView.tsx's own
  // identical addition. At most one of these is normally open at a
  // time (each is its own toggle button), but the condition is written
  // to cover any combination safely regardless.
  useUnsavedChangesWarning(
    (showAddReceivable && (newAmount.trim() !== '' || newDebtorName.trim() !== '' || newDescription.trim() !== '')) ||
    (showAddPayable && (newPayableAmount.trim() !== '' || newSupplierName.trim() !== '' || newPayableDescription.trim() !== '')) ||
    (showUpdateCash && newCashAmount.trim() !== '')
  );

  // [Owner-recorded cash position] cashPositionDeclarations arrives
  // newest-first (AppContext's own onSnapshot sort) — index 0 is always
  // the current figure, if any declaration exists yet.
  const currentCashPosition = cashPositionDeclarations.length > 0 ? cashPositionDeclarations[0] : null;

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

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(newPayableAmount);
    if (!numAmount || numAmount <= 0) {
      setCreatePayableError(t('addExpense.errors.invalidAmount'));
      return;
    }
    setCreatingPayable(true);
    setCreatePayableError(null);
    try {
      await addPayable({
        totalAmount: numAmount,
        supplierName: newSupplierName.trim() || undefined,
        description: newPayableDescription.trim() || undefined,
      });
      setNewPayableAmount('');
      setNewSupplierName('');
      setNewPayableDescription('');
      setShowAddPayable(false);
    } catch (err: any) {
      setCreatePayableError(err?.message || 'Erro ao registar a dívida.');
    } finally {
      setCreatingPayable(false);
    }
  };

  const handleUpdateCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(newCashAmount);
    if (!(numAmount >= 0) || Number.isNaN(numAmount)) {
      setCashError(t('addExpense.errors.invalidAmount'));
      return;
    }
    setSavingCash(true);
    setCashError(null);
    try {
      await addCashPositionDeclaration({
        amount: numAmount,
        declaredAt: newCashDate ? new Date(newCashDate).toISOString() : undefined,
      });
      setNewCashAmount('');
      setNewCashDate(getTodayDateString());
      setShowUpdateCash(false);
    } catch (err: any) {
      setCashError(err?.message || 'Erro ao registar a posição de caixa.');
    } finally {
      setSavingCash(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-title">{t('cashFlow.title')}</h1>
        <p className="text-xs text-gray-500 mt-1">{t('cashFlow.subtitle')}</p>
      </div>

      {/* CASH POSITION */}
      <div className="bg-white rounded-[10px] elevation-1 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-[#0B1F3A]" />
          <h2 className="text-sm font-bold text-title">{t('cashFlow.cashPositionSection.title')}</h2>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">{t('cashFlow.cashPositionSection.subtitle')}</p>

        {currentCashPosition ? (
          <div className="flex items-center justify-between p-3 rounded-[10px] border border-gray-100 bg-[#0B1F3A]/[0.02]">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('cashFlow.cashPositionSection.currentLabel')}</p>
              <p className="text-lg font-bold text-[#0B1F3A] type-number">{formatCurrency(currentCashPosition.amount, currencySymbol)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {t('cashFlow.cashPositionSection.asOfLabel')} {formatDate(currentCashPosition.declaredAt)}
              </p>
            </div>
            {!showUpdateCash && (
              <button
                onClick={() => {
                  setNewCashAmount(String(currentCashPosition.amount));
                  setShowUpdateCash(true);
                }}
                className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition shrink-0"
              >
                {t('cashFlow.cashPositionSection.updateButton')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-[10px] border border-dashed border-gray-200">
            <p className="text-xs text-gray-400">{t('cashFlow.cashPositionSection.empty')}</p>
            {!showUpdateCash && (
              <button
                onClick={() => setShowUpdateCash(true)}
                className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> {t('cashFlow.cashPositionSection.updateButton')}
              </button>
            )}
          </div>
        )}

        {showUpdateCash && (
          <form onSubmit={handleUpdateCash} className="mt-3 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{t('cashFlow.cashPositionSection.updateButton')}</span>
              <button type="button" onClick={() => setShowUpdateCash(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.cashAmountLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCashAmount}
                  onChange={(e) => setNewCashAmount(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
                  placeholder={`0 ${currencySymbol}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.cashDateLabel')}</label>
                <input
                  type="date"
                  value={newCashDate}
                  onChange={(e) => setNewCashDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
                />
              </div>
            </div>
            {cashError && <p className="text-[11px] text-rose-600">{cashError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingCash}
                className="flex-1 py-1.5 rounded-md bg-[#0B1F3A] text-white text-xs font-bold disabled:opacity-50"
              >
                {t('cashFlow.form.submit')}
              </button>
              <button
                type="button"
                onClick={() => setShowUpdateCash(false)}
                className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-xs font-bold text-gray-700"
              >
                {t('cashFlow.form.cancel')}
              </button>
            </div>
          </form>
        )}

        {cashPositionDeclarations.length > 1 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowCashHistory((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700"
            >
              {showCashHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {t('cashFlow.cashPositionSection.history')}
            </button>
            {showCashHistory && (
              <div className="mt-2 space-y-1.5">
                {cashPositionDeclarations.slice(1).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-1.5 rounded-md border border-gray-100 text-xs">
                    <span className="text-gray-400">{formatDate(entry.declaredAt)}</span>
                    <span className="type-number text-gray-600">{formatCurrency(entry.amount, currencySymbol)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECEIVABLES */}
      <div className="bg-white rounded-[10px] elevation-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#0B1F3A]" />
            <h2 className="text-sm font-bold text-title">{t('cashFlow.receivablesSection.title')}</h2>
          </div>
          {!showAddReceivable && (
            <button
              onClick={() => setShowAddReceivable(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition"
            >
              <Plus className="w-3.5 h-3.5" /> {t('cashFlow.receivablesSection.addButton')}
            </button>
          )}
        </div>

        {showAddReceivable && (
          <form onSubmit={handleCreateReceivable} className="mb-4 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{t('cashFlow.receivablesSection.addButton')}</span>
              <button type="button" onClick={() => setShowAddReceivable(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.amountLabel')}</label>
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
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.debtorNameLabel')}</label>
              <input
                type="text"
                value={newDebtorName}
                onChange={(e) => setNewDebtorName(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.descriptionLabel')}</label>
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
                {t('cashFlow.form.submit')}
              </button>
            </div>
          </form>
        )}

        {receivables.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">{t('cashFlow.receivablesSection.empty')}</p>
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
                    {t('cashFlow.receivablesSection.totalLabel')}: <span className="type-number text-gray-800">{formatCurrency(r.totalAmount, currencySymbol)}</span>
                  </span>
                  <span className="text-gray-500">
                    {t('cashFlow.receivablesSection.remainingLabel')}: <span className="type-number font-bold text-[#8A6D1F]">{formatCurrency(r.amountRemaining, currencySymbol)}</span>
                  </span>
                </div>
                {r.status !== 'paid' && (
                  payingReceivableId === r.id ? (
                    <PaymentForm
                      currencySymbol={currencySymbol}
                      onSubmit={(amount, date, submissionId) =>
                        recordReceivablePayment({
                          receivableId: r.id,
                          amountPaid: amount,
                          paidAt: date,
                          submissionId,
                        })
                      }
                      onDone={() => setPayingReceivableId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setPayingReceivableId(r.id)}
                      className="mt-2 text-[11px] font-bold text-[#0B1F3A] underline"
                    >
                      {t('cashFlow.receivablesSection.recordPayment')}
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
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-[#0B1F3A]" />
            <h2 className="text-sm font-bold text-title">{t('cashFlow.payablesSection.title')}</h2>
          </div>
          {!showAddPayable && (
            <button
              onClick={() => setShowAddPayable(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition"
            >
              <Plus className="w-3.5 h-3.5" /> {t('cashFlow.payablesSection.addButton')}
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mb-3">{t('cashFlow.payablesSection.hint')}</p>

        {showAddPayable && (
          <form onSubmit={handleCreatePayable} className="mb-4 p-3 bg-gray-50 rounded-[10px] border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{t('cashFlow.payablesSection.addButton')}</span>
              <button type="button" onClick={() => setShowAddPayable(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.amountLabel')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPayableAmount}
                onChange={(e) => setNewPayableAmount(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
                placeholder={`0 ${currencySymbol}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.supplierNameLabel')}</label>
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cashFlow.form.descriptionLabel')}</label>
              <input
                type="text"
                value={newPayableDescription}
                onChange={(e) => setNewPayableDescription(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-300"
              />
            </div>
            {createPayableError && <p className="text-[11px] text-rose-600">{createPayableError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingPayable}
                className="flex-1 py-1.5 rounded-md bg-[#0B1F3A] text-white text-xs font-bold disabled:opacity-50"
              >
                {t('cashFlow.form.submit')}
              </button>
            </div>
          </form>
        )}

        {payables.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">{t('cashFlow.payablesSection.empty')}</p>
        ) : (
          <div className="space-y-2">
            {payables.map((p) => {
              // [Bug fix — auto-created Payables displayed a meaningless
              // raw document ID instead of the supplier's name] See
              // resolvePayableDisplayName's own comment, above. The
              // secondary description line below only shows p.description
              // when it genuinely adds information beyond the resolved
              // title — previously this required BOTH supplierName and
              // description to be present, which never happened for the
              // automatic path this fix targets (supplierName is never
              // set there at all).
              const displayName = resolvePayableDisplayName(p, suppliers, t);
              const showDescriptionAsSubtitle = !!p.description && p.description !== displayName;
              return (
              <div key={p.id} className="p-3 rounded-[10px] border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{displayName}</p>
                    {showDescriptionAsSubtitle && <p className="text-[10px] text-gray-400">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isManualEntry && (
                      <span className="text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-200">
                        {t('cashFlow.payablesSection.manualBadge')}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${statusBadgeClass(p.status)}`}>
                      {statusLabel(p.status, t)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-gray-500">
                    {t('cashFlow.payablesSection.totalLabel')}: <span className="type-number text-gray-800">{formatCurrency(p.totalAmount, currencySymbol)}</span>
                  </span>
                  <span className="text-gray-500">
                    {t('cashFlow.payablesSection.remainingLabel')}: <span className="type-number font-bold text-rose-700">{formatCurrency(p.amountRemaining, currencySymbol)}</span>
                  </span>
                </div>
                {p.status !== 'paid' && (
                  payingPayableId === p.id ? (
                    <PaymentForm
                      currencySymbol={currencySymbol}
                      onSubmit={(amount, date, submissionId) =>
                        recordPayablePayment({
                          payableId: p.id,
                          amountPaid: amount,
                          paidAt: date,
                          submissionId,
                        })
                      }
                      onDone={() => setPayingPayableId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setPayingPayableId(p.id)}
                      className="mt-2 text-[11px] font-bold text-[#0B1F3A] underline"
                    >
                      {t('cashFlow.payablesSection.recordPayment')}
                    </button>
                  )
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* [Cash Flow consolidation] EXPENSES — formerly the standalone
          "add-expense" tab. AddExpenseView's own form/submission logic
          is completely unmodified; only onComplete differs (collapses
          this section instead of navigating to a different top-level
          tab, since add-expense is no longer a separate route). */}
      <div className="bg-white rounded-[10px] elevation-1 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#0B1F3A]" />
            <h2 className="text-sm font-bold text-title">{t('cashFlow.expensesSection.title')}</h2>
          </div>
          {!showAddExpense && (
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition"
            >
              <Plus className="w-3.5 h-3.5" /> {t('cashFlow.expensesSection.addButton')}
            </button>
          )}
        </div>
        {!showAddExpense && (
          <p className="text-[10px] text-gray-400 mt-1">{t('cashFlow.expensesSection.subtitle')}</p>
        )}
        {showAddExpense && (
          <div className="mt-3">
            <div className="flex justify-end mb-1">
              <button type="button" onClick={() => setShowAddExpense(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <AddExpenseView onComplete={() => setShowAddExpense(false)} />
          </div>
        )}
      </div>

      {/* [Cash Flow consolidation] WITHDRAWALS — formerly the standalone
          "add-withdrawal" tab. Same reasoning as EXPENSES above —
          AddWithdrawalView's own form/submission logic is completely
          unmodified. */}
      <div className="bg-white rounded-[10px] elevation-1 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-[#0B1F3A]" />
            <h2 className="text-sm font-bold text-title">{t('cashFlow.withdrawalsSection.title')}</h2>
          </div>
          {!showAddWithdrawal && (
            <button
              onClick={() => setShowAddWithdrawal(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#0B1F3A] bg-[#0B1F3A]/[0.06] px-3 py-1.5 rounded-md hover:bg-[#0B1F3A]/10 transition"
            >
              <Plus className="w-3.5 h-3.5" /> {t('cashFlow.withdrawalsSection.addButton')}
            </button>
          )}
        </div>
        {!showAddWithdrawal && (
          <p className="text-[10px] text-gray-400 mt-1">{t('cashFlow.withdrawalsSection.subtitle')}</p>
        )}
        {showAddWithdrawal && (
          <div className="mt-3">
            <div className="flex justify-end mb-1">
              <button type="button" onClick={() => setShowAddWithdrawal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <AddWithdrawalView onComplete={() => setShowAddWithdrawal(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

