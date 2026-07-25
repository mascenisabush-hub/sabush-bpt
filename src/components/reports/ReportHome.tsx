import React from 'react';
import { ReportKey } from './shared/reportTypes';
import {
  Gem,
  Boxes,
  Layers,
  TrendingUp,
  Receipt,
  HandCoins,
  AlertTriangle,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react';

interface ReportCategoryDef {
  key: ReportKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  colorClass: string;
}

const CATEGORIES: ReportCategoryDef[] = [
  {
    key: 'business-worth',
    icon: Gem,
    title: 'Valor do Negócio',
    description: 'Quanto vale o negócio hoje: capital, inventário, lucro embutido, despesas e retiradas.',
    colorClass: 'bg-orange-50 text-orange-600',
  },
  {
    key: 'inventory-valuation',
    icon: Boxes,
    title: 'Inventário',
    description: 'Quanto inventário existe, o seu valor de custo e de mercado, agrupado por fornecedor, lote ou produto.',
    colorClass: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'batch-performance',
    icon: Layers,
    title: 'Desempenho de Lotes',
    description: 'Que lotes de compra geraram mais lucro embutido, ordenados por rentabilidade ou investimento.',
    colorClass: 'bg-purple-50 text-purple-600',
  },
  {
    key: 'capital-growth',
    icon: TrendingUp,
    title: 'Crescimento de Capital',
    description: 'Como o capital do negócio evoluiu desde o capital inicial até hoje.',
    colorClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'expenses',
    icon: Receipt,
    title: 'Despesas',
    description: 'Para onde vai o dinheiro: despesas agrupadas por categoria, mês e ano.',
    colorClass: 'bg-rose-50 text-rose-600',
  },
  {
    key: 'withdrawals',
    icon: HandCoins,
    title: 'Retiradas do Proprietário',
    description: 'Quanto o proprietário retirou do negócio, quando e para quê.',
    colorClass: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'inventory-losses',
    icon: AlertTriangle,
    title: 'Perdas de Inventário',
    description: 'Onde o negócio está a perder dinheiro: quebras por produto, motivo e período.',
    colorClass: 'bg-red-50 text-red-600',
  },
  {
    key: 'stock-verification',
    icon: ClipboardCheck,
    title: 'Contagens de Stock',
    description: 'Cada recontagem física de stock: o que mudou entre uma contagem e a seguinte.',
    colorClass: 'bg-cyan-50 text-cyan-600',
  },
];

interface ReportHomeProps {
  onSelect: (key: ReportKey) => void;
}

export const ReportHome: React.FC<ReportHomeProps> = ({ onSelect }) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">Centro de Inteligência de Negócio</h2>
      <p className="text-xs text-gray-500 mt-0.5">
        Escolha uma categoria para entender melhor o seu negócio — não apenas números, mas o que eles significam.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {CATEGORIES.map(cat => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className="text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition active:scale-[0.98] flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.colorClass}`}>
              <cat.icon className="w-5 h-5" />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 mt-2" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">{cat.title}</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{cat.description}</p>
          </div>
        </button>
      ))}
    </div>
  </div>
);
