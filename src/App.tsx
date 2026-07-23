import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { NavigationTabs, TabType } from './components/NavigationTabs';
import { DashboardView } from './components/DashboardView';
import { StocksView } from './components/StocksView';
import { AddStockView } from './components/AddStockView';
import { AddQuebraView } from './components/AddQuebraView';
import { AddExpenseView } from './components/AddExpenseView';
import { ReportsView } from './components/ReportsView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { BusinessCategoryModal } from './components/BusinessCategoryModal';
import { AuthView } from './components/AuthView';
import { Product } from './types';
import { TrendingUp } from 'lucide-react';

function MainApp() {
  const { currentUser, isAuthLoading, isStaff, businessCategory, setBusinessCategory } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Pre-fill parameters when navigating from dashboard cards
  const [stockPrefillProduct, setStockPrefillProduct] = useState<string | undefined>(undefined);
  const [quebraPrefillProduct, setQuebraPrefillProduct] = useState<string | undefined>(undefined);

  // Detail Modal state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  // First time category modal
  const [showFirstTimeCategory, setShowFirstTimeCategory] = useState(false);

  // Restrict staff users to allowed tabs
  useEffect(() => {
    if (isStaff && (activeTab === 'dashboard' || activeTab === 'stocks' || activeTab === 'reports')) {
      setActiveTab('add-stock');
    }
  }, [isStaff, activeTab]);

  useEffect(() => {
    if (!businessCategory && currentUser && !isStaff) {
      setShowFirstTimeCategory(true);
    }
  }, [businessCategory, currentUser, isStaff]);

  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<TabType>;
      if (customEvent.detail) {
        if (isStaff && (customEvent.detail === 'dashboard' || customEvent.detail === 'stocks' || customEvent.detail === 'reports')) {
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
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
          <TrendingUp className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-400">A carregar dados do negócio...</p>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      <Header />
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12">
        {!isStaff && activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToAddStock={handleNavigateToAddStock}
            onNavigateToAddQuebra={handleNavigateToAddQuebra}
            onSelectProductDetail={prod => setSelectedDetailProduct(prod)}
          />
        )}

        {!isStaff && activeTab === 'stocks' && <StocksView />}

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

      {/* First Time Setup Category Modal */}
      {!isStaff && showFirstTimeCategory && !businessCategory && (
        <BusinessCategoryModal
          currentCategory=""
          isFirstTimeSetup={true}
          onSelectCategory={cat => {
            setBusinessCategory(cat);
            setShowFirstTimeCategory(false);
          }}
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
