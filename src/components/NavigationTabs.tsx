import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Boxes, PackagePlus, AlertTriangle, Receipt, BarChart3 } from 'lucide-react';

export type TabType = 'dashboard' | 'stocks' | 'add-stock' | 'add-quebra' | 'add-expense' | 'reports';

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
      id: 'reports' as TabType,
      label: 'Relatórios',
      shortLabel: 'Relatórios',
      icon: BarChart3,
      color: 'indigo',
      ownerOnly: true,
    },
  ];

  const visibleTabs = isStaff ? allTabs.filter(t => !t.ownerOnly) : allTabs;

  return (
    <>
      {/* Desktop / Tablet Top Nav Bar */}
      <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-14 z-20 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 gap-2">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-3 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'bg-slate-900/50 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
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
                    ? 'text-emerald-400 font-bold bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/20 text-emerald-400' : ''}`}>
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
