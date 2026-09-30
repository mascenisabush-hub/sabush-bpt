import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/Header';
import { NavigationTabs, TabType } from './components/NavigationTabs';
import { DashboardView } from './components/DashboardView';
import { StocksView } from './components/StocksView';
import { ProductCatalogView } from './components/ProductCatalogView';
import { AddStockView } from './components/AddStockView';
import { AddQuebraView } from './components/AddQuebraView';
import { CashFlowView } from './components/CashFlowView';
import { ReportsView } from './components/ReportsView';
import { InitialStockCountView } from './components/InitialStockCountView';
import { PeriodicStockCountView } from './components/PeriodicStockCountView';
import { DeclareBusinessWorthView } from './components/DeclareBusinessWorthView';
import { ClosingView } from './components/ClosingView';
import { BusinessTimelineView } from './components/timeline/BusinessTimelineView';
import { StartupInvestmentView } from './components/StartupInvestmentView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthView } from './components/AuthView';
import { QuickLoginScreen } from './components/QuickLoginScreen';
import AppLoadingScreen from './components/AppLoadingScreen';
import { SubscriptionStatusBanner } from './components/SubscriptionStatusBanner';
import { BusinessSuspendedBanner } from './components/BusinessSuspendedBanner';
import { SupportSessionBanner } from './components/SupportSessionBanner';
import { InstallAppBanner } from './components/InstallAppBanner';
import { SupportPointerOverlay } from './components/SupportPointerOverlay';
import { SupportDesktopCapture } from './components/SupportDesktopCapture';
import { Product } from './types';
import { NAV_TABS, canViewTab } from './data/navigationTabs';
import { useDocumentTitle, tabTitleKey } from './hooks/useDocumentTitle';

function MainApp() {
  const { currentUser, isAuthLoading, can, pairedDevice } = useApp();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  // A paired device defaults to the PIN quick-login screen when logged
  // out; this lets the owner (or anyone who needs a full email/password
  // login) drop back to the normal AuthView from there.
  const [forceOwnerLogin, setForceOwnerLogin] = useState(false);
  
  // Pre-fill parameters when navigating from dashboard cards
  const [stockPrefillProduct, setStockPrefillProduct] = useState<string | undefined>(undefined);
  const [quebraPrefillProduct, setQuebraPrefillProduct] = useState<string | undefined>(undefined);

  // Detail Modal state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  // Owner-Granted Permissions: only tabs the person may view are reachable.
  // If the current tab is not (first load, or the owner just changed the
  // permissions live), fall back to the first tab they can see.
  const canOpenTab = (tab: TabType) => canViewTab(can, tab);
  const firstOpenableTab = (): TabType | null =>
    (NAV_TABS.find(tab => canOpenTab(tab.id))?.id as TabType | undefined) ?? null;

  useEffect(() => {
    if (!currentUser || canOpenTab(activeTab)) return;
    const fallback = firstOpenableTab();
    if (fallback) setActiveTab(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeTab, JSON.stringify(NAV_TABS.map(tab => canOpenTab(tab.id)))]);

  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      if (customEvent.detail) {
        if (!canOpenTab(customEvent.detail)) {
          const fallback = firstOpenableTab();
          if (fallback) setActiveTab(fallback);
        } else {
          setActiveTab(customEvent.detail);
        }
      }
    };
    window.addEventListener('navigate-tab', handleCustomNav);
    return () => window.removeEventListener('navigate-tab', handleCustomNav);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can]);

  // Browser tab title. While logged out, AuthView / QuickLoginScreen own
  // the title themselves (they know which auth screen is showing); passing
  // '' here leaves whatever they've set alone instead of overwriting it.
  useDocumentTitle(
    isAuthLoading ? t('common.loading') : !currentUser ? '' : t(tabTitleKey(activeTab))
  );

  if (isAuthLoading) {
    return <AppLoadingScreen message="A preparar dados do negócio..." />;
  }

  if (!currentUser) {
    if (pairedDevice && !forceOwnerLogin) {
      return <QuickLoginScreen onUseOwnerLogin={() => setForceOwnerLogin(true)} />;
    }
    return <AuthView onBackToQuickLogin={pairedDevice ? () => setForceOwnerLogin(false) : undefined} />;
  }

  const handleNavigateToAddStock = (productName?: string) => {
    setStockPrefillProduct(productName);
    setActiveTab('add-stock');
  };

  const handleNavigateToAddQuebra = (productId?: string) => {
    setQuebraPrefillProduct(productId);
    setActiveTab('add-quebra');
  };

  // [Capital Inicial Retirement — Implementation Authorization
  // Increment 4] No longer unconditionally opens Capital Inicial
  // creation. Still used for the still-authorized purposes of (a)
  // opening InitialStockCountView to review/correct an EXISTING
  // historical confirmation (Increment 4 explicitly does not retire
  // that access path — see InitialStockPriceChangeModal.tsx's own
  // "Rever ecrã de Capital Inicial" affordance) and (b) as the target
  // of DashboardView's new establishment chooser, which now picks
  // between the two authorized establishment screens instead.
  const handleNavigateToInitialStockCount = (destination: 'initial-stock' | 'stock-count' | 'declare-worth' = 'initial-stock') => {
    setActiveTab(destination);
  };

  return (
  <div className="min-h-screen bg-[#FBF9F4] text-gray-900 font-sans antialiased flex flex-col">
      {/* [CONTAGEM — Always-Visible Live Total + Last Entered Product]
          `data-app-sticky-header` is a measurement hook only (no
          visual/behavioral change) — PeriodicStockCountView reads this
          element's own rendered height at runtime so its own sticky
          summary bar can position itself directly below this existing
          sticky header, at every breakpoint, without a second
          overlapping sticky element and without hardcoding a pixel
          value that would drift whenever this header's real content
          (business name, notifications, etc.) changes its height. */}
      <div data-app-sticky-header className="sticky top-0 z-30 bg-white border-b border-[#EEF0F3] shadow-[0_1px_0_rgba(11,31,58,0.02)]">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <SubscriptionStatusBanner />
      <BusinessSuspendedBanner />
      <SupportSessionBanner />
      <InstallAppBanner />
      <SupportPointerOverlay />
      <SupportDesktopCapture />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-24 md:pb-12">
        {canOpenTab('dashboard') && activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToAddStock={handleNavigateToAddStock}
            onNavigateToAddQuebra={handleNavigateToAddQuebra}
            onNavigateToInitialStockCount={handleNavigateToInitialStockCount}
            onNavigateToStockCount={() => setActiveTab('stock-count')}
            onSelectProductDetail={prod => setSelectedDetailProduct(prod)}
          />
        )}

        {canOpenTab('initial-stock') && activeTab === 'initial-stock' && (
          <InitialStockCountView
            onComplete={() => setActiveTab('dashboard')}
            onSkip={() => setActiveTab('dashboard')}
          />
        )}

        {canOpenTab('stocks') && activeTab === 'stocks' && <StocksView />}

        {/* [Owner Product Catalog — Phase 1, Checkpoint A] Zero props —
            identical mount pattern to StocksView immediately above.
            Registration/search/edit wiring is Checkpoints B–E, not
            implemented here. */}
        {canOpenTab('catalog') && activeTab === 'catalog' && <ProductCatalogView />}

        {canOpenTab('stock-count') && activeTab === 'stock-count' && (
          <PeriodicStockCountView onComplete={() => setActiveTab('dashboard')} />
        )}

        {canOpenTab('declare-worth') && activeTab === 'declare-worth' && (
          <DeclareBusinessWorthView onComplete={() => setActiveTab('dashboard')} />
        )}

        {canOpenTab('add-stock') && activeTab === 'add-stock' && (
          <AddStockView
            initialProductName={stockPrefillProduct}
            onComplete={() => {
              setStockPrefillProduct(undefined);
              setActiveTab(canOpenTab('dashboard') ? 'dashboard' : 'add-stock');
            }}
          />
        )}

        {canOpenTab('add-quebra') && activeTab === 'add-quebra' && (
          <AddQuebraView
            initialProductId={quebraPrefillProduct}
            onComplete={() => {
              setQuebraPrefillProduct(undefined);
              setActiveTab(canOpenTab('dashboard') ? 'dashboard' : 'add-quebra');
            }}
          />
        )}

        {canOpenTab('closing') && activeTab === 'closing' && (
          <ClosingView onComplete={() => setActiveTab('dashboard')} />
        )}

        {canOpenTab('reports') && activeTab === 'reports' && <ReportsView />}

        {canOpenTab('timeline') && activeTab === 'timeline' && <BusinessTimelineView />}

        {/* [Cash Flow consolidation — Product Architect decision] Formerly
            three separate tabs (add-expense, add-withdrawal, debts) — see
            CashFlowView.tsx's own header comment for the full rationale.
            Owner-only, same gating debts/add-withdrawal already had;
            add-expense was previously available to Staff too — an
            explicit, accepted trade-off of this consolidation. */}
        {canOpenTab('cash-flow') && activeTab === 'cash-flow' && <CashFlowView />}

        {/* [Business Worth Evolution — Implementation Authorization,
            Increment 5; Specification §13, §33] Owner-only, same gating
            as debts above. */}
        {canOpenTab('startup-investment') && activeTab === 'startup-investment' && <StartupInvestmentView />}
      </main>

      {/* Product Detail Modal */}
      {canOpenTab('stocks') && selectedDetailProduct && (
        <ProductDetailModal
          product={selectedDetailProduct}
          onClose={() => setSelectedDetailProduct(null)}
          onNavigateToAddStock={handleNavigateToAddStock}
          onNavigateToAddQuebra={handleNavigateToAddQuebra}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AppProvider>
    </LanguageProvider>
  );
}
