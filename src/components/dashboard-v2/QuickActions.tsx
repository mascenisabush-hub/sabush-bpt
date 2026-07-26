import React from 'react';
import { PackagePlus, AlertTriangle, Receipt, HandCoins, ClipboardList, FileBarChart } from 'lucide-react';
import { TabType } from '../NavigationTabs';

// ============================================================
// REAL DATA / REAL ACTIONS ONLY — every button below maps 1:1 to an
// existing tab already present in NavigationTabs.tsx, and is triggered
// via the exact same 'navigate-tab' window event App.tsx already
// listens for (see handleCustomNav in App.tsx). No new navigation,
// no new handlers — this only reuses what exists.
// ============================================================
const ACTIONS: { label: string; icon: React.ElementType; tab: TabType }[] = [
  { label: 'Novo Lote', icon: PackagePlus, tab: 'add-stock' },
  { label: 'Registrar Quebra', icon: AlertTriangle, tab: 'add-quebra' },
  { label: 'Registrar Despesa', icon: Receipt, tab: 'add-expense' },
  { label: 'Registrar Retirada', icon: HandCoins, tab: 'add-withdrawal' },
  { label: 'Nova Contagem', icon: ClipboardList, tab: 'stock-count' },
  { label: 'Gerar Relatório', icon: FileBarChart, tab: 'reports' },
];

function navigateTo(tab: TabType) {
  window.dispatchEvent(new CustomEvent('navigate-tab', { detail: tab }));
}

export const QuickActions: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigateTo(action.tab)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 py-4 px-2 text-center hover:border-[#B8791A] hover:bg-[#B8791A]/5 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#1B3966] flex items-center justify-center group-hover:bg-[#B8791A] transition-colors">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-[#111827] leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
