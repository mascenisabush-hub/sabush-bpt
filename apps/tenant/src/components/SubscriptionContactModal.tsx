import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/formatters';
import { CreditCard, X, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import type { PaymentMethod } from '../types';
import { SUBSCRIPTION_PLAN_PRICE_MZN, PAYMENT_METHODS } from '../data/subscriptionPlan';

interface SubscriptionContactModalProps {
  onClose: () => void;
}

// Module #19 V1 Manual Payment Bridge (temporary — PaySuite/PayTED
// automated integration remains deferred; see
// docs/engineering/19-v1-payment-adapter-contract-and-test-matrix.md).
// Kept as the same export name/component the Release Readiness Audit's
// placeholder used (SubscriptionStatusBanner.tsx and
// SubscriptionBlockedNotice.tsx already import it), now with real
// functional content instead of a "contact us" placeholder.
//
// This component only ever writes a 'pending' Payment via
// useApp().submitPayment() — it never touches subscription state in
// any way. Confirmation happens entirely outside the client, via
// server/scripts/confirmPayment.ts.
export const SubscriptionContactModal: React.FC<SubscriptionContactModalProps> = ({ onClose }) => {
  const { payments, submitPayment, subscription } = useApp();
  const { t } = useLanguage();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // [Track B — Payment Activation UX correctness fix] Auto-close on a
  // genuine transition to 'active' while this modal is mounted mid
  // pending-payment workflow. `justSubmitted` (above) never resets on
  // its own — once a payment is submitted, this modal would otherwise
  // keep showing "aguardando confirmação" forever for the remaining
  // lifetime of this mounted instance, even long after the backend has
  // actually confirmed the payment and activated the subscription. The
  // realtime `subscription` listener (AppContext) is the authoritative
  // signal that resolves this: once it reports 'active', the pending
  // workflow this modal exists for is genuinely finished.
  //
  // Deliberately a TRANSITION check, not a "current value" check —
  // `previousStatusRef` tracks the status as of this modal's own prior
  // render, so opening the modal while the business is already 'active'
  // (whatever future call site might do that) does NOT auto-close it;
  // only an actual non-active -> active change observed while mounted
  // does. `previousStatus == null` covers both "not yet loaded" and
  // "this is the first render" — neither counts as a real prior
  // non-active state, so a subscription that resolves to 'active' on
  // its very first snapshot (no prior known status) is correctly
  // treated the same as "already active when opened," not as a
  // transition.
  const previousStatusRef = useRef(subscription?.status);
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = subscription?.status;
    if (previousStatus != null && previousStatus !== 'active' && subscription?.status === 'active') {
      onClose();
    }
  }, [subscription?.status, onClose]);

  // Most recent submission drives the view — payments is already
  // sorted newest-first by AppContext's own listener.
  const latestPayment = payments[0] ?? null;
  const showPendingView = !justSubmitted && latestPayment?.status === 'pending';
  const showRejectedView = !justSubmitted && latestPayment?.status === 'rejected' && !showPendingView;

  async function handleSubmit() {
    if (!selectedMethod) {
      setError(t('subscription.subscribe.errorMissingMethod'));
      return;
    }
    if (!reference.trim()) {
      setError(t('subscription.subscribe.errorMissingReference'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitPayment({ method: selectedMethod, reference, notes: notes || undefined });
      setJustSubmitted(true);
    } catch (err: any) {
      setError(err?.message || t('subscription.subscribe.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedMethodConfig = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-gray-900 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0B1F3A]" strokeWidth={2.25} />
            {t('subscription.subscribe.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {(showPendingView || justSubmitted) && (
            <div className="bg-amber-50 border border-amber-500/30 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" strokeWidth={2.25} />
              </div>
              <h3 className="font-bold text-amber-900">{t('subscription.subscribe.pendingTitle')}</h3>
              <p className="text-sm text-amber-800 leading-relaxed">{t('subscription.subscribe.pendingMessage')}</p>
              {latestPayment && (
                <div className="text-left bg-white/60 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div>
                    <span className="font-bold">{t('subscription.subscribe.pendingMethod')}:</span>{' '}
                    {t(`subscription.paymentMethods.${latestPayment.method}.label`)}
                  </div>
                  <div>
                    <span className="font-bold">{t('subscription.subscribe.pendingReference')}:</span> {latestPayment.reference}
                  </div>
                  <div>
                    <span className="font-bold">{t('subscription.subscribe.pendingSubmittedAt')}:</span>{' '}
                    {formatDate(latestPayment.submittedAt)}
                  </div>
                </div>
              )}
            </div>
          )}

          {showRejectedView && (
            <div className="bg-rose-50 border border-rose-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <XCircle className="w-4 h-4" strokeWidth={2.25} />
                {t('subscription.subscribe.rejectedTitle')}
              </div>
              {latestPayment?.rejectionReason && (
                <p className="text-sm text-rose-700">{latestPayment.rejectionReason}</p>
              )}
              <p className="text-xs text-rose-700">{t('subscription.subscribe.rejectedRetryHint')}</p>
            </div>
          )}

          {!showPendingView && !justSubmitted && (
            <>
              <div className="bg-[#0B1F3A]/[0.04] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#0B1F3A]">{SUBSCRIPTION_PLAN_PRICE_MZN} MZN</div>
                <div className="text-xs text-[#0B1F3A]/70">{t('subscription.subscribe.priceLabel')}</div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">{t('subscription.subscribe.chooseMethod')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`text-left px-4 py-3 rounded-xl border transition ${
                        selectedMethod === m.id
                          ? 'border-[#0B1F3A] bg-[#0B1F3A]/[0.04]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-gray-900">{t(m.labelKey)}</div>
                      <div className="text-xs text-gray-500">{m.destination}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethodConfig && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
                  {t('subscription.subscribe.payTo')} <span className="font-bold">{selectedMethodConfig.destination}</span>
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700 mb-1 block">{t('subscription.subscribe.referenceLabel')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t('subscription.subscribe.referencePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 mb-1 block">{t('subscription.subscribe.notesLabel')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-2 shrink-0">
          {!showPendingView && !justSubmitted && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#0B1F3A] text-white text-sm font-bold hover:bg-[#0B1F3A]/90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                t('subscription.subscribe.submitting')
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t('subscription.subscribe.submitButton')}
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition"
          >
            {t('subscription.contactModal.closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
