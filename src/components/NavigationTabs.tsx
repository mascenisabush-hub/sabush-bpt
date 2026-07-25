import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Boxes, PackagePlus, AlertTriangle, Receipt, BarChart3, HandCoins, ClipboardList, Lock, History, Sparkles } from 'lucide-react';

export type TabType = 'dashboard' | 'stocks' | 'add-stock' | 'add-quebra' | 'add-expense' | 'add-withdrawal' | 'reports' | 'initial-stock' | 'stock-count' | 'closing' | 'timeline' | 'dashboard-v2';

interface NavigationTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab }) => {
  const { isStaff } = useApp();

  const allTabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Produtos',
      shortLabel: 'Produtos',
      icon: LayoutDashboard,
      color: 'emerald',
      ownerOnly: true,
    },
    {
      id: 'stocks' as TabType,
      label: 'Stocks',
      shortLabel: 'Stocks',
      icon: Boxes,
      color: 'amber',
      ownerOnly: true,
    },
    {
      id: 'add-stock' as TabType,
      label: 'Adicionar Stock',
      shortLabel: '+ Stock',
      icon: PackagePlus,
      color: 'emerald',
      ownerOnly: false,
    },
    {
      id: 'stock-count' as TabType,
      label: 'Contagem de Stock',
      shortLabel: 'Contagem',
      icon: ClipboardList,
      color: 'indigo',
      ownerOnly: true,
    },
    {
      id: 'add-quebra' as TabType,
      label: 'Adicionar Quebra',
      shortLabel: '+ Quebra',
      icon: AlertTriangle,
      color: 'rose',
      ownerOnly: false,
    },
    {
      id: 'add-expense' as TabType,
      label: 'Adicionar Despesa',
      shortLabel: '+ Despesa',
      icon: Receipt,
      color: 'purple',
      ownerOnly: false,
    },
    {
      id: 'add-withdrawal' as TabType,
      label: 'Registar Levantamento',
      shortLabel: '+ Levant.',
      icon: HandCoins,
      color: 'orange',
      ownerOnly: true,
    },
    {
      id: 'closing' as TabType,
      label: 'Fecho Mensal/Anual',
      shortLabel: 'Fecho',
      icon: Lock,
      color: 'teal',
      ownerOnly: true,
    },
    {
      id: 'reports' as TabType,
      label: 'Relatórios',
      shortLabel: 'Relatórios',
      icon: BarChart3,
      color: 'indigo',
      ownerOnly: true,
    },
    {
      id: 'timeline' as TabType,
      label: 'Linha do Tempo',
      shortLabel: 'Histórico',
      icon: History,
      color: 'blue',
      ownerOnly: true,
    },
    {
      id: 'dashboard-v2' as TabType,
      label: 'Dashboard (Novo)',
      shortLabel: 'Novo',
      icon: Sparkles,
      color: 'gold',
      ownerOnly: true,
    },
  ];

  const visibleTabs = isStaff ? allTabs.filter(t => !t.ownerOnly) : allTabs;

  return (
    <>
      {/* Desktop / Tablet Icon Action Bar — same tabs, no boxed pills, spacing
          does the separating instead of borders. Icon in blue, small gray
          label always visible below it, consistent gaps, subtle hover highlight. */}
      <nav className="hidden md:block bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 py-4">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`group flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition active:scale-[0.97] ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] transition ${isActive ? 'text-blue-600' : 'text-blue-500/80 group-hover:text-blue-600'}`} />
                  <span className={`text-[10.5px] font-semibold tracking-tight ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-40 px-2 py-1.5 shadow-2xl">
        <div className="flex items-center justify-around">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-1 rounded-xl text-[10px] font-medium transition active:scale-95 ${
                  isActive
                   ? 'text-blue-600 font-bold bg-blue-500/10'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-500/20 text-blue-600' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="mt-0.5 tracking-tight">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
