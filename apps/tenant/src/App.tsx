import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/Header';
import { NavigationTabs, TabType } from './components/NavigationTabs';
import { DashboardView } from './components/DashboardView';
import { StocksView } from './components/StocksView';
import { AddStockView } from './components/AddStockView';
import { AddQuebraView } from './components/AddQuebraView';
import { AddExpenseView } from './components/AddExpenseView';
import { AddWithdrawalView } from './components/AddWithdrawalView';
import { ReportsView } from './components/ReportsView';
import { InitialStockCountView } from './components/InitialStockCountView';
import { PeriodicStockCountView } from './components/PeriodicStockCountView';
import { DeclareBusinessWorthView } from './components/DeclareBusinessWorthView';
import { ClosingView } from './components/ClosingView';
import { BusinessTimelineView } from './components/timeline/BusinessTimelineView';
import { DebtsView } from './components/DebtsView';
import { StartupInvestmentView } from './components/StartupInvestmentView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthView } from './components/AuthView';
import { QuickLoginScreen } from './components/QuickLoginScreen';
import AppLoadingScreen from './components/AppLoadingScreen';
import { SubscriptionStatusBanner } from './components/SubscriptionStatusBanner';
import { BusinessSuspendedBanner } from './components/BusinessSuspendedBanner';
import { Product } from './types';
import { useDocumentTitle, tabTitleKey } from './hooks/useDocumentTitle';

function MainApp() {
  const { currentUser, isAuthLoading, isStaff, pairedDevice } = useApp();
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

  // Restrict staff users to allowed tabs
  useEffect(() => {
    if (isStaff && (activeTab === 'dashboard' || activeTab === 'stocks' || activeTab === 'reports' || activeTab === 'initial-stock' || activeTab === 'add-withdrawal' || activeTab === 'stock-count' || activeTab === 'closing' || activeTab === 'timeline' || activeTab === 'debts' || activeTab === 'startup-investment')) {
      setActiveTab('add-stock');
    }
  }, [isStaff, activeTab]);

  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      if (customEvent.detail) {
        if (isStaff && (customEvent.detail === 'dashboard' || customEvent.detail === 'stocks' || customEvent.detail === 'reports' || customEvent.detail === 'initial-stock' || customEvent.detail === 'add-withdrawal' || customEvent.detail === 'stock-count' || customEvent.detail === 'closing' || customEvent.detail === 'timeline' || customEvent.detail === 'debts' || customEvent.detail === 'startup-investment')) {
          setActiveTab('add-stock');
        } else {
          setActiveTab(customEvent.detail);
        }
      }
    };
    window.addEventListener('navigate-tab', handleCustomNav);
    return () => window.removeEventListener('navigate-tab', handleCustomNav);
  }, [isStaff]);

  // Browser tab title. While logged out, AuthView / QuickLoginScreen own
  // the title themselves (they know which auth screen is showing); passing
  // '' here leaves whatever they've set alone instead of overwriting it.
  useDocumentTitle(
    isAuthLoading ? t('common.loading') : !currentUser ? '' : t(tabTitleKey(activeTab))
  );

  if (isAuthLoading) {
    return <AppLoadingScreen message="A carregar dados do negócio..." />;
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

  const handleNavigateToInitialStockCount = () => {
    setActiveTab('initial-stock');
  };

  return (
  <div className="min-h-screen bg-[#FBF9F4] text-gray-900 font-sans antialiased flex flex-col">
      <div className="sticky top-0 z-30 bg-white border-b border-[#EEF0F3] shadow-[0_1px_0_rgba(11,31,58,0.02)]">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <SubscriptionStatusBanner />
      <BusinessSuspendedBanner />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-24 md:pb-12">
        {!isStaff && activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToAddStock={handleNavigateToAddStock}
            onNavigateToAddQuebra={handleNavigateToAddQuebra}
            onNavigateToInitialStockCount={handleNavigateToInitialStockCount}
            onNavigateToStockCount={() => setActiveTab('stock-count')}
            onSelectProductDetail={prod => setSelectedDetailProduct(prod)}
          />
        )}

        {!isStaff && activeTab === 'initial-stock' && (
          <InitialStockCountView
            onComplete={() => setActiveTab('dashboard')}
            onSkip={() => setActiveTab('dashboard')}
          />
        )}

        {!isStaff && activeTab === 'stocks' && <StocksView />}

        {!isStaff && activeTab === 'stock-count' && (
          <PeriodicStockCountView onComplete={() => setActiveTab('dashboard')} />
        )}

        {!isStaff && activeTab === 'declare-worth' && (
          <DeclareBusinessWorthView onComplete={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'add-stock' && (
          <AddStockView
            initialProductName={stockPrefillProduct}
            onComplete={() => {
              setStockPrefillProduct(undefined);
              setActiveTab(isStaff ? 'add-stock' : 'dashboard');
            }}
          />
        )}

        {activeTab === 'add-quebra' && (
          <AddQuebraView
            initialProductId={quebraPrefillProduct}
            onComplete={() => {
              setQuebraPrefillProduct(undefined);
              setActiveTab(isStaff ? 'add-quebra' : 'dashboard');
            }}
          />
        )}

        {activeTab === 'add-expense' && (
          <AddExpenseView
            onComplete={() => {
              setActiveTab(isStaff ? 'add-expense' : 'dashboard');
            }}
          />
        )}

        {!isStaff && activeTab === 'add-withdrawal' && (
          <AddWithdrawalView
            onComplete={() => setActiveTab('dashboard')}
          />
        )}

        {!isStaff && activeTab === 'closing' && (
          <ClosingView onComplete={() => setActiveTab('dashboard')} />
        )}

        {!isStaff && activeTab === 'reports' && <ReportsView />}

        {!isStaff && activeTab === 'timeline' && <BusinessTimelineView />}

        {/* [Business Worth Evolution — Implementation Authorization,
            Increment 3; Specification §11, §12, §33] Owner-only, same
            gating as add-withdrawal/closing above. */}
        {!isStaff && activeTab === 'debts' && <DebtsView />}

        {/* [Business Worth Evolution — Implementation Authorization,
            Increment 5; Specification §13, §33] Owner-only, same gating
            as debts above. */}
        {!isStaff && activeTab === 'startup-investment' && <StartupInvestmentView />}
      </main>

      {/* Product Detail Modal */}
      {!isStaff && selectedDetailProduct && (
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
