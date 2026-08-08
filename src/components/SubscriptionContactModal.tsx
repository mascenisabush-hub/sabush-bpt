import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CreditCard, X } from 'lucide-react';

interface SubscriptionContactModalProps {
  onClose: () => void;
}

// Release Readiness Audit finding (19-v1-completion-review-and-release-readiness-audit.md,
// §2d): there was previously no subscribe/payment entry point anywhere
// in the client at all. This is the minimum honest version of one —
// deliberately NOT a payment form, since no processor is verified or
// wired yet (Payment Adapter remains explicitly unauthorized). It
// states plainly that in-app subscription is coming, rather than
// fabricating contact details (a phone number, an email) this
// component has no real source for. Replace `contactModal.message`
// in src/i18n/locales/*.ts with real contact instructions before
// release — flagged here, not silently left as a permanent gap.
export const SubscriptionContactModal: React.FC<SubscriptionContactModalProps> = ({ onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-gray-900 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#0B1F3A]" strokeWidth={2.25} />
              {t('subscription.contactModal.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <p className="text-sm text-gray-600 leading-relaxed">{t('subscription.contactModal.message')}</p>
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0B1F3A] text-white text-sm font-bold hover:bg-[#0B1F3A]/90 transition"
          >
            {t('subscription.contactModal.closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
