import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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
import { ClosingView } from './components/ClosingView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthView } from './components/AuthView';
import AppLoadingScreen from './components/AppLoadingScreen';
import { Product } from './types';

function MainApp() {
  const { currentUser, isAuthLoading, isStaff } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Pre-fill parameters when navigating from dashboard cards
  const [stockPrefillProduct, setStockPrefillProduct] = useState<string | undefined>(undefined);
  const [quebraPrefillProduct, setQuebraPrefillProduct] = useState<string | undefined>(undefined);

  // Detail Modal state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  // Restrict staff users to allowed tabs
  useEffect(() => {
    if (isStaff && (activeTab === 'dashboard' || activeTab === 'stocks' || activeTab === 'reports' || activeTab === 'initial-stock' || activeTab === 'add-withdrawal' || activeTab === 'stock-count' || activeTab === 'closing')) {
      setActiveTab('add-stock');
    }
  }, [isStaff, activeTab]);

  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      if (customEvent.detail) {
        if (isStaff && (customEvent.detail === 'dashboard' || customEvent.detail === 'stocks' || customEvent.detail === 'reports' || customEvent.detail === 'initial-stock' || customEvent.detail === 'add-withdrawal' || customEvent.detail === 'stock-count' || customEvent.detail === 'closing')) {
          setActiveTab('add-stock');
        } else {
          setActiveTab(customEvent.detail);
        }
      }
    };
    window.addEventListener('navigate-tab', handleCustomNav);
    return () => window.removeEventListener('navigate-tab', handleCustomNav);
  }, [isStaff]);

  if (isAuthLoading) {
    return <AppLoadingScreen message="A carregar dados do negócio..." />;
  }

  if (!currentUser) {
    return <AuthView />;
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
  <div className="min-h-screen bg-white text-gray-900 font-sans antialiased flex flex-col">
      <Header />
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12">
        {!isStaff && activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToAddStock={handleNavigateToAddStock}
            onNavigateToAddQuebra={handleNavigateToAddQuebra}
            onNavigateToInitialStockCount={handleNavigateToInitialStockCount}
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
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
