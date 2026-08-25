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
//
// [Manual data-entry error investigation, Finding 1 — Owner-requested]
// Before this, submitting this form was a single click with no review
// step at all, and no comparison to the business's own current Business
// Worth was ever shown — the single most exposed, highest-leverage
// manual entry point in the whole system, since one typed number
// directly and permanently becomes the new authoritative Business
// Worth, completely disconnected from inventory, sales, or any other
// verifiable fact. A two-step flow now mirrors Contagem's own "Rever e
// Confirmar" pattern: the form itself shows the CURRENT Business Worth
// for reference while typing (reusing DashboardView.tsx's own
// hasActiveBusinessWorthSnapshot/displayedBusinessWorth derivation, not
// a second, independently-invented one), and a review step shows the
// entered amount against that current value, with a non-blocking
// deviation warning (DEVIATION_WARNING_THRESHOLD, below) when they
// differ sharply — "warn, never block," matching this codebase's own
// established discipline everywhere else a genuine possibility of a
// mistake exists without being able to prove one occurred.
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { Gem, CheckCircle2, ArrowLeft, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';

interface DeclareBusinessWorthViewProps {
  onComplete: () => void;
}

// [Manual data-entry error investigation, Finding 1] A round, easily
// explained threshold — not tuned from any real data, since none of
// this codebase's other "warn on deviation" features (Mode A's own
// unit-mismatch warning, the reconciliation card) use a percentage
// threshold to compare against; this is a genuinely new judgment call.
// Deliberately generous enough that ordinary business growth/decline
// doesn't nag on every use, while still catching the classic
// order-of-magnitude typo (an extra or missing zero) this finding was
// written to address.
const DEVIATION_WARNING_THRESHOLD = 0.3;

export const DeclareBusinessWorthView: React.FC<DeclareBusinessWorthViewProps> = ({ onComplete }) => {
  const {
    recordOwnerDeclaredBusinessWorth,
    currencySymbol,
    subscriptionBlocksNewRecords,
    businessWorthSnapshots,
    currentBusinessWorth,
    estimatedBusinessWorth,
  } = useApp();
  const { t } = useLanguage();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // [Manual data-entry error investigation, Finding 1] The review step
  // itself — null means "still editing," a number means "the Owner has
  // requested a review of this exact typed amount." Cleared back to
  // null on "Voltar e Corrigir" so re-editing the amount always
  // requires a fresh review, never confirms a stale, already-changed
  // figure.
  const [reviewingAmount, setReviewingAmount] = useState<number | null>(null);

  // [Manual data-entry error investigation, Finding 1] Byte-for-byte
  // the SAME derivation DashboardView.tsx's own "Valor do Negócio" card
  // already uses — never a second, independently-invented notion of
  // "current" Business Worth. 'UNKNOWN' (a business with no Business
  // Worth history at all yet — e.g. this is its very first declaration)
  // becomes null; the review step below still shows in that case, just
  // without a current-value comparison or deviation warning, since
  // there is genuinely nothing yet to compare against.
  const hasActiveBusinessWorthSnapshot = businessWorthSnapshots.some((s) => s.status === 'active');
  const displayedBusinessWorth = hasActiveBusinessWorthSnapshot ? currentBusinessWorth : estimatedBusinessWorth;
  const currentValue = displayedBusinessWorth === 'UNKNOWN' ? null : displayedBusinessWorth;

  const deviationPercent =
    currentValue !== null && currentValue > 0 && reviewingAmount !== null
      ? Math.abs(reviewingAmount - currentValue) / currentValue
      : null;
  const showDeviationWarning = deviationPercent !== null && deviationPercent >= DEVIATION_WARNING_THRESHOLD;
  const isAboveCurrentValue = currentValue !== null && reviewingAmount !== null && reviewingAmount > currentValue;

  // [Manual data-entry error investigation, Finding 1] Step 1's own
  // "submit" — validates and moves to review, never writes anything.
  // The actual write only happens from handleConfirm (below), from the
  // review step's own explicit second click, mirroring Contagem's
  // "Rever e Confirmar Contagem" two-step shape exactly.
  const handleRequestReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage(t('declareWorth.errors.invalidAmount'));
      return;
    }
    setReviewingAmount(numAmount);
  };

  const handleConfirm = async () => {
    if (reviewingAmount === null) return;
    setErrorMessage(null);

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
        declaredAmount: reviewingAmount,
        date,
        submissionId,
      });

      if (!result.success) {
        setErrorMessage(result.error || t('declareWorth.errors.generic'));
        return;
      }

      setSubmittedMessage(
        t('declareWorth.successMessage', { amount: formatCurrency(reviewingAmount, currencySymbol) })
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
        ) : reviewingAmount !== null ? (
          // [Manual data-entry error investigation, Finding 1] The
          // review step — reviewingAmount is only ever set by
          // handleRequestReview's own validated parseFloat, so it is
          // always a genuine positive number here, never re-validated.
          <div className="space-y-5 mt-5">
            <div>
              <h3 className="text-[15px] font-bold text-[#111827]">{t('declareWorth.reviewTitle')}</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">{t('declareWorth.reviewSubtitle')}</p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-[12px] text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl divide-y divide-[#E5E7EB]">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-gray-500">{t('declareWorth.reviewAmountLabel')}</span>
                <span className="font-display font-semibold text-[#0B1F3A] tabular-nums">
                  {formatCurrency(reviewingAmount, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-gray-500">{t('declareWorth.reviewCurrentLabel')}</span>
                <span className="font-mono text-[13px] text-gray-600 tabular-nums">
                  {currentValue !== null ? formatCurrency(currentValue, currencySymbol) : '—'}
                </span>
              </div>
              {currentValue !== null && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[12px] text-gray-500">{t('declareWorth.reviewDifferenceLabel')}</span>
                  <span
                    className={`font-mono text-[13px] tabular-nums ${
                      reviewingAmount === currentValue
                        ? 'text-gray-500'
                        : isAboveCurrentValue
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {reviewingAmount === currentValue ? '—' : isAboveCurrentValue ? '+' : '−'}
                    {formatCurrency(Math.abs(reviewingAmount - currentValue), currencySymbol)}
                  </span>
                </div>
              )}
            </div>

            {currentValue === null && (
              <p className="text-[11px] text-gray-400 italic">{t('declareWorth.currentValueUnknownNote')}</p>
            )}

            {/* [Manual data-entry error investigation, Finding 1] Warn,
                never block — a genuinely large, deliberate change (real
                business growth, a corrected earlier mistake) must
                remain one click away, exactly as this codebase's other
                deviation warnings (Mode A's unit-mismatch note)
                already establish. This is a prompt to double-check, not
                a gate. */}
            {showDeviationWarning && deviationPercent !== null && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-[2px]" strokeWidth={2.25} />
                <p className="text-[12.5px] text-amber-800 leading-relaxed">
                  {t(
                    isAboveCurrentValue ? 'declareWorth.deviationWarningAbove' : 'declareWorth.deviationWarningBelow',
                    { percent: Math.round(deviationPercent * 100) }
                  )}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewingAmount(null)}
                disabled={isSaving}
                className="btn-secondary flex-1 min-h-[52px] py-3.5 px-5 text-[14px] rounded-2xl disabled:opacity-60"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
                <span>{t('declareWorth.backButton')}</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="btn-primary flex-1 min-h-[52px] py-3.5 px-5 text-[15px] rounded-2xl disabled:opacity-60"
              >
                <span>{isSaving ? '...' : t('declareWorth.submitButton')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequestReview} className="space-y-5 mt-5">
            {/* [Specification §42.1, §42.3] Sets clear, honest expectations
                before submission — this is a declaration, not a count, and
                it will not carry the same drill-down detail a Contagem
                produces. */}
            <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
              <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-gray-600">{t('declareWorth.infoNote')}</p>
            </div>

            {/* [Manual data-entry error investigation, Finding 1] The
                CURRENT Business Worth, shown here so the Owner has a
                live frame of reference while typing — not merely at
                review time. Omitted entirely (not a fabricated "—" row)
                when genuinely UNKNOWN, matching this codebase's own
                "absence, never fabrication" discipline. */}
            {currentValue !== null && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  {t('declareWorth.currentValueLabel')}
                </span>
                <span className="font-mono text-[13px] text-gray-600 tabular-nums">
                  {formatCurrency(currentValue, currencySymbol)}
                </span>
              </div>
            )}

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
                className="btn-primary flex-1 min-h-[52px] py-3.5 px-5 text-[15px] rounded-2xl disabled:opacity-60"
              >
                <span>{t('declareWorth.reviewButton')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
