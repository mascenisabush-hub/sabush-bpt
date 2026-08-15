import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock } from 'lucide-react';

// SuperAdmin V1 Operational Control Plane, Phase C (ADR-0006, Gap 1).
// Mirrors SubscriptionStatusBanner.tsx's 'expired' state (same visual
// tier — rose/error, Lock icon — same reasoning: a persistent, no-
// action-needed-here informational banner, not a modal or a full
// blocking screen, per the Phase C Pre-Implementation Verification's
// "smallest architecture-aligned solution" recommendation). Deliberately
// does NOT imply the user's own account was disabled — Firebase Auth
// is never touched by business suspension (AppContext.tsx's
// businessSuspended field comment). No action button — unlike the
// subscription banners, there's nothing the tenant themselves can do
// to resolve a SuperAdmin-issued suspension; the contact hint is
// informational only.
export const BusinessSuspendedBanner: React.FC = () => {
  const { businessSuspended } = useApp();
  const { t } = useLanguage();

  if (!businessSuspended) return null;

  return (
    <div className="bg-rose-50 border-b border-rose-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center gap-2">
        <Lock className="w-4 h-4 shrink-0 text-rose-600" strokeWidth={2.25} />
        <span className="font-bold text-[13px] text-rose-800">{t('subscription.businessSuspension.banner.title')}</span>
        <span className="text-[13px] text-rose-700">· {t('subscription.businessSuspension.banner.message')}</span>
        <span className="text-[13px] text-rose-700 hidden sm:inline">· {t('subscription.businessSuspension.banner.contactHint')}</span>
      </div>
    </div>
  );
};
