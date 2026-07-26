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
      {/* Desktop / Tablet Icon Action Bar — a premium, evenly spaced row of
          soft rounded icon buttons. Icon sits in a navy tile that turns gold
          on hover/active; a minimal label stays visible underneath. Very
          light grey (bg-[#F7F8FA]) separates the whole row from the white
          page above/below it instead of a hard border. */}
      <nav className="hidden md:block bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-3 py-4">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className="group flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-2xl transition active:scale-[0.96]"
                >
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 shadow-sm ${
                      isActive
                        ? 'bg-[#B8791A] shadow-[0_4px_14px_-4px_rgba(184,121,26,0.55)]'
                        : 'bg-[#0A1C38] group-hover:bg-[#B8791A] group-hover:shadow-[0_4px_14px_-4px_rgba(184,121,26,0.45)]'
                    }`}
                  >
                    <Icon className="w-[17px] h-[17px] text-white" strokeWidth={2} />
                  </span>
                  <span
                    className={`text-[10.5px] font-semibold tracking-tight transition-colors ${
                      isActive ? 'text-[#B8791A]' : 'text-gray-500 group-hover:text-[#0A1C38]'
                    }`}
                  >
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A1C38] z-40 px-2 py-1.5 shadow-[0_-4px_20px_rgba(10,28,56,0.25)]">
        <div className="flex items-center justify-around overflow-x-auto">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-1 rounded-xl text-[10px] font-medium transition active:scale-95 ${
                  isActive ? 'text-[#B8791A] font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-[#B8791A]/15' : ''}`}>
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
