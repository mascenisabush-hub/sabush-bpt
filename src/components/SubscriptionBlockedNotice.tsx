import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock } from 'lucide-react';
import { SubscriptionContactModal } from './SubscriptionContactModal';

// Release Readiness Audit finding (19-v1-completion-review-and-release-readiness-audit.md,
// §2c): a blocked write (subscriptionBlocksNewRecords === true,
// mirroring firestore.rules' own subscriptionAllowsNewRecords())
// previously surfaced as a raw, unexplained Firebase permission-
// denied error via alert(). This component is meant to be rendered
// INSTEAD OF an entry form's own fields (an early return in the
// caller) once that condition is true — pre-empting the write
// attempt entirely with a clear, business-meaningful explanation,
// rather than letting it fail first and trying to reword the error
// after the fact. Historical data remains fully visible everywhere
// else in the product (POL-19-003 Read-Only Preservation) — this
// notice explicitly says so, so it never reads as "your data is
// gone."
export const SubscriptionBlockedNotice: React.FC = () => {
  const { subscription } = useApp();
  const { t } = useLanguage();
  const [showContactModal, setShowContactModal] = useState(false);

  const isExpired = subscription?.status === 'expired';
  const message = isExpired
    ? t('subscription.blockedNotice.expiredMessage')
    : t('subscription.blockedNotice.trialCompletedMessage');

  return (
    <>
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-rose-50 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" strokeWidth={2.25} />
          </div>
          <h3 className="text-lg font-bold text-rose-900">{t('subscription.blockedNotice.title')}</h3>
          <p className="text-sm text-rose-800 leading-relaxed max-w-md mx-auto">{message}</p>
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition"
          >
            {t('subscription.blockedNotice.contactButton')}
          </button>
        </div>
      </div>
      {showContactModal && <SubscriptionContactModal onClose={() => setShowContactModal(false)} />}
    </>
  );
};
