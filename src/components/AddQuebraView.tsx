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

  const handleSubmit = (e: React.FormEvent) => {
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

    addQuebra({
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
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
        {/* Title */}
        <div className="flex items-center space-x-3 pb-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900">{t('addQuebra.title')}</h2>
            <p className="text-xs text-gray-500">
              {t('addQuebra.subtitle')}
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('addQuebra.registeredTitle')}</h3>
            <p className="text-sm text-rose-700 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            {t('addQuebra.emptyState')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 my-5">
            {/* Product Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('addQuebra.selectProduct')}
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-rose-500"
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
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('addQuebra.selectBatch')}
              </label>
              {availableBatches.length === 0 ? (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-300 p-3 rounded-xl">
                  {t('addQuebra.noBatchesForProduct')}
                </div>
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-rose-500 font-mono"
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
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('addQuebra.lossDate')}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('addQuebra.lossQuantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityLost}
                  onChange={e => setQuantityLost(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* Warning Banner if Loss > Remaining Quantity */}
            {isWarning && (
              <div className="bg-rose-50 border border-rose-500/50 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-rose-300 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-700 block mb-0.5">{t('addQuebra.warningTitle')}</span>
                  <p dangerouslySetInnerHTML={{ __html: t('addQuebra.warningBody', { qty: quantityLost, remaining: batchCalc?.remainingQuantity ?? 0 }) }} />
                </div>
              </div>
            )}

            {/* Remaining Stock Preview */}
            {targetBatch && batchCalc && (
              <div className="bg-white rounded-xl p-3.5 border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">{t('addQuebra.currentBatchStock')}</span>
                  <span className="font-bold text-gray-800">{t('addQuebra.unitsValue', { qty: batchCalc.remainingQuantity })}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 block text-[10px]">{t('addQuebra.stockAfterLoss')}</span>
                  <span className={`font-bold ${remainingAfterLoss < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {t('addQuebra.unitsValue', { qty: remainingAfterLoss })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">{t('addQuebra.lostCostValue')}</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency((parseFloat(quantityLost) || 0) * targetBatch.costPrice, currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            {/* Reason Free Text & Suggestion Chips */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('addQuebra.reasonLabel')}
              </label>
              <input
                type="text"
                required
                placeholder={t('addQuebra.reasonPlaceholder')}
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-rose-500 mb-2"
              />

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[11px] text-gray-500 self-center mr-1">{t('addQuebra.quickSuggestions')}</span>
                {COMMON_REASON_KEYS.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(t(key))}
                    className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-medium transition border border-gray-300/60 active:scale-95"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={!selectedBatchId}
                className="flex-1 min-h-[56px] py-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-base transition shadow-lg shadow-rose-50 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.98]"
              >
                <span>{t('addQuebra.submitButton')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
