import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateBatch, isQuebraExceedingWarning } from '../utils/calculations';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { AlertTriangle, CheckCircle2, Info, ArrowRight, X } from 'lucide-react';

interface AddQuebraViewProps {
  initialProductId?: string;
  onComplete: () => void;
}

// Quick-suggestion chips for the reason field — i18n keys, not literal text.
// Clicking a chip still fills the (free-text, unlocalized) reason field with
// the translated label in the active language.
const COMMON_REASON_KEYS = [
  'addQuebra.reasons.expired',
  'addQuebra.reasons.broken',
  'addQuebra.reasons.packagingDamaged',
  'addQuebra.reasons.transportLoss',
  'addQuebra.reasons.spoiledMold',
  'addQuebra.reasons.customerSample',
];

export const AddQuebraView: React.FC<AddQuebraViewProps> = ({ initialProductId, onComplete }) => {
  const { products, batches, quebras, addQuebra, currencySymbol } = useApp();
  const { t } = useLanguage();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [quantityLost, setQuantityLost] = useState<string>('1');
  const [reason, setReason] = useState<string>('');

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Set initial product and batch
  useEffect(() => {
    if (initialProductId && products.some(p => p.id === initialProductId)) {
      setSelectedProductId(initialProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [initialProductId, products]);

  // When product changes, auto-select its active open batch, or latest batch
  useEffect(() => {
    if (selectedProductId) {
      const productBatches = batches.filter(b => b.productId === selectedProductId);
      const active = productBatches.find(b => b.status === 'open');
      if (active) {
        setSelectedBatchId(active.id);
      } else if (productBatches.length > 0) {
        setSelectedBatchId(productBatches[0].id);
      } else {
        setSelectedBatchId('');
      }
    }
  }, [selectedProductId, batches]);

  // Product batches
  const availableBatches = batches.filter(b => b.productId === selectedProductId);
  const targetBatch = batches.find(b => b.id === selectedBatchId);

  // Calculate current state of target batch
  let batchCalc = null;
  let isWarning = false;
  let remainingAfterLoss = 0;

  if (targetBatch) {
    const existingBatchQuebras = quebras.filter(q => q.batchId === targetBatch.id);
    batchCalc = calculateBatch(targetBatch, existingBatchQuebras);
    
    const numLoss = parseFloat(quantityLost) || 0;
    remainingAfterLoss = batchCalc.remainingQuantity - numLoss;
    isWarning = isQuebraExceedingWarning(targetBatch, existingBatchQuebras, numLoss);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId || !selectedBatchId) {
      alert(t('addQuebra.errors.selectProductBatch'));
      return;
    }

    const numLoss = parseFloat(quantityLost);
    if (!numLoss || numLoss <= 0) {
      alert(t('addQuebra.errors.invalidQuantity'));
      return;
    }

    if (!reason.trim()) {
      alert(t('addQuebra.errors.missingReason'));
      return;
    }

    // addQuebra is async and can reject (missing activeBusinessId, or a
    // Firestore write/timeline-log failure) — this must be awaited and
    // caught, or the rejection is silently swallowed and the UI shows
    // "success" for a quebra that was never actually recorded. Same class
    // of bug already fixed in AddExpenseView/AddWithdrawalView.
    setIsSaving(true);
    try {
      await addQuebra({
        productId: selectedProductId,
        batchId: selectedBatchId,
        date,
        quantityLost: numLoss,
        reason: reason.trim(),
      });

      setSubmittedMessage(
        numLoss === 1
          ? t('addQuebra.successMessageOne', { count: numLoss })
          : t('addQuebra.successMessageOther', { count: numLoss })
      );

      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Erro ao registar a quebra.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-6">
        {/* Header — compact, single line, danger-tinted icon chip since this
            screen registers a loss (not a neutral action). */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="type-title">{t('addQuebra.title')}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('addQuebra.subtitle')}
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-rose-600" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('addQuebra.registeredTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            {t('addQuebra.emptyState')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Product Selector */}
            <div>
              <label className="block type-label mb-1.5">
                {t('addQuebra.selectProduct')}
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selector */}
            <div>
              <label className="block type-label mb-1.5">
                {t('addQuebra.selectBatch')}
              </label>
              {availableBatches.length === 0 ? (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  {t('addQuebra.noBatchesForProduct')}
                </div>
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2.5 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                >
                  {availableBatches.map(b => {
                    const statusText = b.status === 'open' ? t('addQuebra.batchStatusOpen') : t('addQuebra.batchStatusClosed');
                    return (
                      <option key={b.id} value={b.id}>
                        {formatDate(b.dateEntered)} — {t('addQuebra.qtyLabel')}: {b.quantity} {b.unit || 'un'} @ {formatCurrency(b.costPrice, currencySymbol)} ({statusText})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Date & Quantity Lost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block type-label mb-1.5">
                  {t('addQuebra.lossDate')}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2.5 text-[#111827] text-sm font-mono tabular-nums transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>

              <div>
                <label className="block type-label mb-1.5">
                  {t('addQuebra.lossQuantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityLost}
                  onChange={e => setQuantityLost(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2.5 text-[#111827] text-sm font-mono tabular-nums transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
            </div>

            {/* Warning Banner if Loss > Remaining Quantity */}
            {isWarning && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2.25} />
                <div>
                  <span className="font-bold text-rose-700 block mb-0.5">{t('addQuebra.warningTitle')}</span>
                  <p dangerouslySetInnerHTML={{ __html: t('addQuebra.warningBody', { qty: quantityLost, remaining: batchCalc?.remainingQuantity ?? 0 }) }} />
                </div>
              </div>
            )}

            {/* Remaining Stock Preview */}
            {targetBatch && batchCalc && (
              <div className="bg-[var(--muted)] rounded-xl px-4 py-3.5 border border-[#E5E7EB] flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] font-semibold uppercase tracking-wide">{t('addQuebra.currentBatchStock')}</span>
                  <span className="font-bold text-[#111827] font-mono tabular-nums">{t('addQuebra.unitsValue', { qty: batchCalc.remainingQuantity })}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                <div>
                  <span className="text-gray-500 block text-[10px] font-semibold uppercase tracking-wide">{t('addQuebra.stockAfterLoss')}</span>
                  <span className={`type-number tabular-nums ${remainingAfterLoss < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {t('addQuebra.unitsValue', { qty: remainingAfterLoss })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-semibold uppercase tracking-wide">{t('addQuebra.lostCostValue')}</span>
                  <span className="font-bold text-rose-600 font-mono tabular-nums">
                    {formatCurrency((parseFloat(quantityLost) || 0) * targetBatch.costPrice, currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            {/* Reason Free Text & Suggestion Chips */}
            <div>
              <label className="block type-label mb-1.5">
                {t('addQuebra.reasonLabel')}
              </label>
              <input
                type="text"
                required
                placeholder={t('addQuebra.reasonPlaceholder')}
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3.5 py-2.5 text-[#111827] text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 mb-2.5"
              />

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] text-gray-500 mr-0.5">{t('addQuebra.quickSuggestions')}</span>
                {COMMON_REASON_KEYS.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(t(key))}
                    className="px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[#D4AF37]/[0.08] hover:text-[#0B1F3A] text-gray-600 text-xs font-semibold border border-[#E5E7EB] hover:border-[#D4AF37]/40 transition-all duration-150 active:scale-95"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button — kept rose (not gold) since this action
                registers a loss; matches the rose/danger semantics used
                for negative figures and errors elsewhere in the app. */}
            <div className="flex items-center pt-1">
              <button
                type="submit"
                disabled={!selectedBatchId || isSaving}
                className="w-full min-h-[52px] py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all duration-150 shadow-[0_10px_24px_-8px_rgba(225,29,72,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <span>{isSaving ? '...' : t('addQuebra.submitButton')}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
