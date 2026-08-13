import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/formatters';
import { Clock, AlertTriangle, Lock } from 'lucide-react';
import { SubscriptionContactModal } from './SubscriptionContactModal';

// Release Readiness Audit finding (19-v1-completion-review-and-release-readiness-audit.md,
// §2a): the client previously had zero in-app visibility of trial or
// subscription status. This banner is the minimum fix — informational
// for Trial Active (no urgency yet), warning-tier for Grace Period
// (DESIGN_SYSTEM.md's --warning/amber, matching the same severity
// tier Header.tsx's own PRIORITY_BORDER_COLOR already uses for
// 'timeline'-priority items), error-tier for Expired (--error/rose,
// matching 'immediate'-priority items). Renders nothing for
// 'active' — a healthy subscription shouldn't add persistent chrome.
// Renders nothing at all for Staff (Architecture 6.8 — subscription
// management is Owner/Manager territory; a Staff account has no
// action to take here and the [Subscribe]/[Contact Support] button
// would be a dead end for them).
export const SubscriptionStatusBanner: React.FC = () => {
  const {
    subscription,
    subscriptionTrialDaysRemaining,
    subscriptionGracePeriodDaysRemaining,
    isStaff,
  } = useApp();
  const { t } = useLanguage();
  const [showContactModal, setShowContactModal] = useState(false);

  if (isStaff || !subscription) return null;

  if (subscription.status === 'trial_active') {
    return (
      <>
        <div className="bg-[#0B1F3A]/[0.04] border-b border-[#0B1F3A]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] text-[#0B1F3A]">
              <Clock className="w-4 h-4 shrink-0" strokeWidth={2.25} />
              <span className="font-bold">{t('subscription.banner.trialActive.title')}</span>
              {subscriptionTrialDaysRemaining != null && (
                <span className="text-[#0B1F3A]/70">
                  · {t('subscription.banner.trialActive.daysRemaining', { days: subscriptionTrialDaysRemaining })}
                </span>
              )}
              {subscription.trialEndsAt && (
                <span className="text-[#0B1F3A]/70 hidden sm:inline">
                  · {t('subscription.banner.trialActive.endsOn', { date: formatDate(subscription.trialEndsAt) })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="px-3 py-1 rounded-lg bg-[#0B1F3A] text-white text-[12px] font-bold hover:bg-[#0B1F3A]/90 transition shrink-0"
            >
              {t('subscription.banner.trialActive.subscribeButton')}
            </button>
          </div>
        </div>
        {showContactModal && <SubscriptionContactModal onClose={() => setShowContactModal(false)} />}
      </>
    );
  }

  if (subscription.status === 'grace_period') {
    return (
      <>
        <div className="bg-amber-50 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" strokeWidth={2.25} />
              <span className="font-bold">{t('subscription.banner.gracePeriod.title')}</span>
              {subscriptionGracePeriodDaysRemaining != null && (
                <span className="text-amber-700">
                  · {t('subscription.banner.gracePeriod.daysRemaining', { days: subscriptionGracePeriodDaysRemaining })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="px-3 py-1 rounded-lg bg-amber-600 text-white text-[12px] font-bold hover:bg-amber-700 transition shrink-0"
            >
              {t('subscription.banner.gracePeriod.subscribeButton')}
            </button>
          </div>
        </div>
        {showContactModal && <SubscriptionContactModal onClose={() => setShowContactModal(false)} />}
      </>
    );
  }

  if (subscription.status === 'expired') {
    return (
      <>
        <div className="bg-rose-50 border-b border-rose-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] text-rose-800">
              <Lock className="w-4 h-4 shrink-0 text-rose-600" strokeWidth={2.25} />
              <span className="font-bold">{t('subscription.banner.expired.title')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[12px] font-bold hover:bg-rose-700 transition shrink-0"
            >
              {t('subscription.banner.expired.contactButton')}
            </button>
          </div>
        </div>
        {showContactModal && <SubscriptionContactModal onClose={() => setShowContactModal(false)} />}
      </>
    );
  }

  // trial_pending / trial_completed: no banner. trial_pending is a
  // momentary state (Business Rule 4); trial_completed's own blocked-
  // write notice (SubscriptionBlockedNotice.tsx) covers that case
  // directly on the screens where it actually matters, avoiding a
  // second, redundant banner saying the same thing twice.
  return null;
};
