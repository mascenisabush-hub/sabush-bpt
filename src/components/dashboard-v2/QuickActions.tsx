import React from 'react';
import { PackagePlus, AlertTriangle, Receipt, HandCoins, ClipboardList, FileBarChart } from 'lucide-react';

const ACTIONS = [
  { label: 'Novo Lote', icon: PackagePlus },
  { label: 'Registrar Quebra', icon: AlertTriangle },
  { label: 'Registrar Despesa', icon: Receipt },
  { label: 'Registrar Retirada', icon: HandCoins },
  { label: 'Nova Contagem', icon: ClipboardList },
  { label: 'Gerar Relatório', icon: FileBarChart },
];

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
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 py-4 px-2 text-center hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0B1F3A] flex items-center justify-center group-hover:bg-[#D4AF37] transition-colors">
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
