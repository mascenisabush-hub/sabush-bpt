import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Download, X } from 'lucide-react';

// [Feature — Owner-requested: "facilitate downloading (make it easy)"]
// Surfaces the browser's own native install prompt (the
// `beforeinstallprompt` event) as a single visible, one-click banner,
// instead of leaving installation buried in each browser's own menu.
// Reuses the exact same full-width banner convention already used by
// SubscriptionStatusBanner/BusinessSuspendedBanner/SupportSessionBanner
// (same outer classes, same max-w-7xl inner container, same icon+text
// left / action right layout) — a new banner in the same established
// family, not a new visual pattern.
//
// Platform note: `beforeinstallprompt` only fires on Chromium-based
// browsers (Chrome, Edge, most Android browsers) that judge the app
// installable — this is a browser/OS capability, not something this
// codebase controls. Safari (desktop and iOS) never fires this event
// at all; there is no equivalent programmatic prompt for it — a Safari
// user's own path is the browser's manual "Add to Home Screen"/"Add
// to Dock" action, which this banner cannot trigger. This component
// simply renders nothing on a platform that never dispatches the
// event, rather than showing a broken or dead button.
//
// Dismissal persists in localStorage (`sabush.installBannerDismissed`),
// matching this app's existing localStorage-with-`sabush.`-prefix
// convention (see AuthView.tsx's remembered-accounts key) — dismissed
// once, not shown again every page load, and never shown again at all
// once the app is actually installed (the `appinstalled` event clears
// the prompt state outright).
const DISMISSED_KEY = 'sabush.installBannerDismissed';

export const InstallAppBanner: React.FC = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    // The browser's own prompt resolves with the user's actual choice
    // ('accepted' | 'dismissed') — either way, this specific deferred
    // event can only be used once, so it's cleared here regardless of
    // outcome. A future eligible visit fires a fresh
    // beforeinstallprompt event on its own; nothing further to do here.
    try {
      await deferredPrompt.userChoice;
    } catch {
      // Ignore — a rejected/aborted prompt still leaves the app in a
      // perfectly normal, un-installed state.
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Best-effort only — a Safari-style private-browsing rejection
      // here just means the banner may reappear next visit, not a
      // functional problem.
    }
  };

  return (
    <div className="bg-[#0B1F3A]/[0.04] border-b border-[#0B1F3A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] text-[#0B1F3A]">
          <Download className="w-4 h-4 shrink-0 text-[#0B1F3A]/70" strokeWidth={2.25} />
          <span className="font-bold">{t('installApp.banner.title')}</span>
          <span className="text-[#0B1F3A]/70 hidden sm:inline">· {t('installApp.banner.subtitle')}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1 rounded-lg bg-[#0B1F3A] text-white text-[12px] font-bold hover:bg-[#14294A] transition"
          >
            {t('installApp.banner.installButton')}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-[#0B1F3A]/40 hover:text-[#0B1F3A]/70 hover:bg-[#0B1F3A]/5 transition"
            aria-label={t('installApp.banner.dismiss')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
