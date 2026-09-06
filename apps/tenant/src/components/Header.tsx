import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { TrendingUp, DollarSign, HelpCircle, X, Check, Store, LogOut, Settings, User, ChevronDown, Bell, Search, Package } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { OwnerPortfolioModal } from './OwnerPortfolioModal';
import { ShopSwitcher } from './ShopSwitcher';
import { NAV_TABS, TabType } from '../data/navigationTabs';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { formatDate } from '../utils/formatters';
import { NotificationPriority } from '../types';
import { setPendingStocksSearch } from '../lib/pendingStocksSearch';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

// DESIGN_SYSTEM.md §Notifications: feed entries use the same
// left-border-color convention as the toast surface (navy =
// informational, warning = needs attention soon, error = needs
// attention now). `priority` (20.7, Amendment B) is the schema
// dimension that already encodes exactly that urgency distinction —
// `immediate` warrants interruption, `timeline` is routine activity,
// `daily_summary` is informational — so it drives the border color
// here, not `category`.
const PRIORITY_BORDER_COLOR: Record<NotificationPriority, string> = {
  immediate: '#DC2626', // --error
  timeline: '#D97706', // --warning
  daily_summary: '#0B1F3A', // --navy
};

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    business,
    userProfile,
    isOwner,
    isStaff,
    canManagerManageStaff,
    currencySymbol,
    setCurrencySymbol,
    businessCategory,
    isBusinessProfileComplete,
    logout,
    ownedBusinesses,
    products,
  } = useApp();

  const { t } = useLanguage();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const visibleTabs = isStaff ? NAV_TABS.filter(tab => !tab.ownerOnly) : NAV_TABS;

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // [Module #17 Owner Portfolio v0.2] Reachable only when the Admin
  // owns more than one shop — same gate ShopSwitcher's own chevron
  // already uses (ownedBusinesses.length > 1), not a new condition.
  const [showOwnerPortfolio, setShowOwnerPortfolio] = useState(false);
  const [settingsAutoOpenProfileEdit, setSettingsAutoOpenProfileEdit] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // [Fix — global search box was decorative only] A real, controlled
  // search over the product catalog (the one entity meaningful to
  // search "across the system" from any screen) — matches by name,
  // case-insensitive substring. Kept local to Header (not lifted into
  // App.tsx/context) since its only job is to jump elsewhere; the
  // actual filtered display lives wherever the Owner lands
  // (StocksView), exactly like the 'open-settings' CustomEvent just
  // below already does for a different cross-component jump, so this
  // reuses an established pattern rather than introducing a new one.
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);
  const trimmedGlobalSearch = globalSearchQuery.trim().toLowerCase();
  const globalSearchMatches = trimmedGlobalSearch
    ? products.filter((p) => p.name.toLowerCase().includes(trimmedGlobalSearch)).slice(0, 8)
    : [];

  const goToProductInStocks = (query: string) => {
    // Covers the "not yet mounted" race (see pendingStocksSearch.ts's own
    // comment) — set BEFORE switching tabs, always, regardless of
    // whether StocksView happens to be mounted already.
    setPendingStocksSearch(query);
    setActiveTab('stocks');
    // Covers the "already mounted" case (Owner searches again while
    // already on Stocks) — a mount effect alone would never re-fire here.
    window.dispatchEvent(new CustomEvent('navigate-to-stocks-search', { detail: { query } }));
    setGlobalSearchQuery('');
    setShowGlobalSearchResults(false);
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchQuery.trim()) return;
    goToProductInStocks(globalSearchQuery.trim());
  };

  // Close the profile menu on outside click — same behaviour users already
  // expect from any dropdown, just applied to the new consolidated menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (globalSearchRef.current && !globalSearchRef.current.contains(e.target as Node)) {
        setShowGlobalSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Allows other views (e.g. the "complete your profile" dashboard nudge) to
  // open Settings directly, without needing this state lifted into App.tsx.
  // detail.openProfileEdit jumps straight into the profile edit form.
  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      const detail = (e as CustomEvent<{ openProfileEdit?: boolean }>).detail;
      setSettingsAutoOpenProfileEdit(!!detail?.openProfileEdit);
      setShowSettingsModal(true);
    };
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  return (
    <>
      <header className="text-white" style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #132A4A 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-2">
          {/* Single unified row: business info (left) · action icons (center) ·
              profile (right). If the icon row doesn't fit next to the other
              two on narrower desktop widths, it simply wraps onto its own
              line below — everything still reads as one header block, no
              separate grey bar. */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            {/* Business name — falls back to a quiet placeholder, never a blank/generic app name */}
            {business?.name ? (
              <div className="min-w-0 shrink-0">
                {isOwner ? (
                  <div className="flex items-center gap-2.5">
                    <ShopSwitcher />
                    {/* [Module #17 Owner Portfolio v0.2] Same gate as
                        ShopSwitcher's own chevron — reachable only when
                        the Admin owns more than one shop. */}
                    {ownedBusinesses.length > 1 && (
                      <button
                        onClick={() => setShowOwnerPortfolio(true)}
                        className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors mb-0.5"
                      >
                        Portefólio
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#E8C65C] mb-1">
                    {t('header.myBusiness')}
                  </p>
                )}
                <h1 className="font-display font-semibold text-[26px] sm:text-[30px] leading-[1.08] tracking-tight text-white truncate">
                  {business.name}
                </h1>
                {/* [Readability Audit F-07, rendered-verification pass]
                    Both category and location previously shared one
                    `truncate` line with default flex-shrink, which
                    distributes the width deficit *proportionally* to
                    each span's own content size — confirmed via headless-
                    Chrome measurement that this let a long location
                    shrink a short category down to "Pa…" ("Padaria")
                    even though "Padaria" would trivially fit on its own.
                    Category (the more identity-defining field) now gets
                    `shrink-0` — it never shrinks below its own content —
                    plus a generous `max-w-[85%]` safety ceiling purely
                    for a pathologically long category string, so it can
                    never completely crowd out location. Location is the
                    one flexible element (`flex-1 min-w-0`) and absorbs
                    whatever space remains. A hard min-width floor on
                    location was tried and rejected: it occasionally forced
                    the *row itself* past its own max-width at the
                    narrowest breakpoint (confirmed via getBoundingClientRect
                    — a real, if small, regression) whenever a genuinely
                    long category was also present. Leaving location at
                    min-w-0 keeps the row's own width guarantee intact in
                    every case tested; the resulting worst-case shortfall
                    (a short place name losing a couple of pixels of its
                    last character at 390px alongside an unusually long
                    category) is negligible next to that guarantee.
                    Verified against long/short category × long/short
                    location combinations at 390/768/1280px: category is
                    fully visible in all 12 combinations tested; location
                    is fully visible whenever the two reasonably fit
                    together, and the row never overflows its own bounds
                    in any case. */}
                <p
                  className="text-[11px] text-white/50 flex items-center gap-1.5 max-w-[240px] sm:max-w-[360px] mt-1"
                  title={business?.contact ? t('header.contactTitle', { contact: business.contact }) : undefined}
                >
                  <span className="truncate shrink-0 max-w-[85%] text-white/75 font-bold">
                    {businessCategory || t('header.registeredBusiness')}
                  </span>
                  {business?.location && (
                    <>
                      <span className="text-white/25 shrink-0">·</span>
                      <span className="truncate flex-1 min-w-0 text-white/50">{business.location}</span>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/10 text-white/40 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-bold text-white/40">{t('header.profileNotSet')}</span>
              </div>
            )}

            {/* [Fix — this was a decorative, aria-hidden, non-interactive
                div, not a real input at all] Now a genuine product search:
                typing filters the catalog live, and picking a result (or
                pressing Enter) jumps to Stocks with that search term
                already applied there — see goToProductInStocks/the
                'navigate-to-stocks-search' listener in StocksView.tsx.
                Still desktop-only (hidden md:flex) — that visibility rule
                predates this fix and is unrelated to it. */}
            <div className="hidden md:flex flex-1 max-w-md mx-auto order-last lg:order-none" ref={globalSearchRef}>
              <form onSubmit={handleGlobalSearchSubmit} className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowGlobalSearchResults(true);
                  }}
                  onFocus={() => setShowGlobalSearchResults(true)}
                  placeholder={t('header.searchPlaceholder')}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3.5 py-1.5 text-[13px] text-[#111827] placeholder-gray-400 font-medium transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />

                {showGlobalSearchResults && trimmedGlobalSearch && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-lg elevation-2 max-h-72 overflow-y-auto z-40">
                    {globalSearchMatches.length === 0 ? (
                      <p className="px-3.5 py-3 text-[12.5px] text-gray-400">
                        {t('header.searchNoResults', { query: globalSearchQuery.trim() })}
                      </p>
                    ) : (
                      globalSearchMatches.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => goToProductInStocks(product.name)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-[#111827] hover:bg-[#F5F7FA] transition-colors"
                        >
                          <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{product.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Language — same switcher as the login/quick-login screens, so
                changing it here is the same global setting everywhere. */}
            <LanguageSwitcher className="hidden sm:inline-flex shrink-0" />

            {/* Notifications */}
            <div className="relative shrink-0" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                title={t('header.notifications')}
                className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl elevation-2 z-40 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-gray-500">{t('header.noNotifications')}</p>
                    </div>
                  ) : (
                    <ul>
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          style={{ borderLeftColor: PRIORITY_BORDER_COLOR[n.priority] }}
                          className="border-l-4 border-b border-b-gray-100 last:border-b-0 px-3 py-2.5 flex items-start gap-2 cursor-pointer hover:bg-[#F5F7FA] transition"
                        >
                          <span
                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              n.status === 'unread' ? 'bg-[#D4AF37]' : 'bg-white border border-[#D4AF37]'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="type-label mb-0.5">{formatDate(n.createdAt)}</p>
                            <p className="text-xs text-[#0B1F3A] font-semibold leading-snug">
                              {n.context.whatHappened}
                            </p>
                            <p className="text-xs text-gray-500 leading-snug mt-0.5">
                              {n.context.whyItMatters}
                            </p>
                            {n.context.recommendedAction && (
                              <p className="text-xs text-[#8A6D1F] leading-snug mt-1">
                                {n.context.recommendedAction}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Single profile control — every prior action still lives here, just consolidated */}
            <div className="relative shrink-0" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#0B1F3A] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">
                    {userProfile?.name || t('header.userFallback')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[#D4AF37] font-bold">
                    {isOwner ? t('header.roleOwner') : t('header.roleStaff')}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl elevation-2 py-2 z-40">
                  {(isOwner || canManagerManageStaff) && (
                    <button
                      onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-title transition"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      {t('header.settings')}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setShowCurrencyModal(true); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-title transition"
                    >
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      {t('header.currency')} <span className="ml-auto text-gray-400">{currencySymbol}</span>
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setShowHelpModal(true); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-title transition"
                    >
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      {t('header.helpAndConcept')}
                    </button>
                  )}
                  <div className="my-1.5 border-t" style={{ borderColor: 'var(--border)' }} />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('header.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* [Local layout compaction — global header space-management,
              first pass] Action nav row — same 13 tabs/handlers, same
              icons/labels/active-state/routing as before; only the
              chrome around each pill (padding, inter-item gap, top
              margin before the row) was tightened. Nothing here reads
              or writes NAV_TABS, isStaff, activeTab, or setActiveTab
              differently — visibleTabs/isActive/onClick are byte-
              identical to before this pass. The icon box (`w-7 h-7`)
              and label font size (`text-[12.5px]`) are UNCHANGED —
              the ~44px former button height was governed by the fixed
              28px icon box plus `py-2`'s 16px of padding; tightening
              that padding to `py-1` (8px) brings each button to ~36px
              — still a full pill with a clearly legible label, not an
              icon-only or truncated control. The nav may still wrap to
              two rows at typical desktop widths (unchanged from
              before, and explicitly acceptable per this pass's own
              scope) — those two rows are simply shorter now. */}
          <nav className="hidden md:flex items-center flex-wrap gap-1.5 pt-2">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={t(tab.labelKey)}
                  className={`flex items-center gap-2 pl-2 pr-3 py-1 rounded-2xl text-[12.5px] font-bold tracking-tight transition-all duration-150 active:scale-[0.97] border ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0B1F3A] border-transparent shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]'
                      : 'bg-white/[0.05] text-white/80 border-white/[0.14] hover:bg-white/10 hover:text-white hover:border-white/25'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-xl shrink-0 transition-colors duration-150 ${
                      isActive ? 'bg-[#0B1F3A] text-[#D4AF37]' : 'bg-white/[0.12] text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2.25} />
                  </span>
                  {t(tab.shortLabelKey)}
                </button>
              );
            })}
          </nav>


          {/* Small inline reminder — replaces the old full-width banner. Same action
              (jumps into Settings → profile edit), just quiet instead of dominant. */}
          {isOwner && !isBusinessProfileComplete && !reminderDismissed && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('open-settings', { detail: { openProfileEdit: true } })
                )
              }
              className="group flex items-center gap-1.5 pt-2.5 text-[11.5px] text-[#D4AF37] hover:text-[#E8C65C] transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="font-bold">{t('header.completeProfile')}</span>
              <X
                className="w-3 h-3 ml-1 text-white/30 group-hover:text-white/60"
                onClick={(e) => { e.stopPropagation(); setReminderDismissed(true); }}
              />
            </button>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          autoOpenProfileEdit={settingsAutoOpenProfileEdit}
        />
      )}

      {/* Owner Portfolio Modal — Module #17 v0.2 */}
      {showOwnerPortfolio && (
        <OwnerPortfolioModal onClose={() => setShowOwnerPortfolio(false)} />
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 text-gray-900 elevation-3">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" /> {t('header.currencyModal.title')}
              </h3>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 my-3">
              {t('header.currencyModal.description')}
            </p>

            <div className="grid grid-cols-2 gap-2 my-4 max-h-60 overflow-y-auto pr-1">
              {CURRENCY_OPTIONS.map(opt => {
                const isSelected = currencySymbol === opt.symbol;
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setCurrencySymbol(opt.symbol);
                      setShowCurrencyModal(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-gray-100/50 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCurrencyModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold transition"
            >
              {t('header.currencyModal.done')}
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 text-gray-900 elevation-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> {t('header.helpModal.title')}
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 text-sm text-gray-700 leading-relaxed">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <span className="font-bold text-blue-700 block mb-1">{t('header.helpModal.section1Title')}</span>
                <p dangerouslySetInnerHTML={{ __html: t('header.helpModal.section1Body') }} />
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <span className="font-bold text-blue-700 block mb-1">{t('header.helpModal.section2Title')}</span>
                <p>
                  {t('header.helpModal.section2Body')}
                  <br />
                  <code className="text-xs bg-white px-2 py-1 rounded text-blue-600 inline-block my-1 font-mono">
                    {t('header.helpModal.section2Formula')}
                  </code>
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <span className="font-bold text-blue-700 block mb-1">{t('header.helpModal.section3Title')}</span>
                <p dangerouslySetInnerHTML={{ __html: t('header.helpModal.section3Body') }} />
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <span className="font-bold text-blue-700 block mb-1">{t('header.helpModal.section4Title')}</span>
                <p dangerouslySetInnerHTML={{ __html: t('header.helpModal.section4Body') }} />
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-md"
            >
              {t('header.helpModal.gotIt')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
