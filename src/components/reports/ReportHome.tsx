import React from 'react';
import { ReportKey } from './shared/reportTypes';
import { useLanguage } from '../../context/LanguageContext';
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
  titleKey: string;
  descriptionKey: string;
  colorClass: string;
}

const CATEGORIES: ReportCategoryDef[] = [
  {
    key: 'business-worth',
    icon: Gem,
    titleKey: 'reports.categories.businessWorth.title',
    descriptionKey: 'reports.categories.businessWorth.description',
    colorClass: 'bg-[#0B1F3A]/[0.06] text-[#0B1F3A]',
  },
  {
    key: 'inventory-valuation',
    icon: Boxes,
    titleKey: 'reports.categories.inventoryValuation.title',
    descriptionKey: 'reports.categories.inventoryValuation.description',
    colorClass: 'bg-[#0B1F3A]/[0.06] text-[#0B1F3A]',
  },
  {
    key: 'batch-performance',
    icon: Layers,
    titleKey: 'reports.categories.batchPerformance.title',
    descriptionKey: 'reports.categories.batchPerformance.description',
    colorClass: 'bg-purple-50 text-purple-600',
  },
  {
    key: 'capital-growth',
    icon: TrendingUp,
    titleKey: 'reports.categories.capitalGrowth.title',
    descriptionKey: 'reports.categories.capitalGrowth.description',
    colorClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'expenses',
    icon: Receipt,
    titleKey: 'reports.categories.expenses.title',
    descriptionKey: 'reports.categories.expenses.description',
    colorClass: 'bg-rose-50 text-rose-600',
  },
  {
    key: 'withdrawals',
    icon: HandCoins,
    titleKey: 'reports.categories.withdrawals.title',
    descriptionKey: 'reports.categories.withdrawals.description',
    colorClass: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'inventory-losses',
    icon: AlertTriangle,
    titleKey: 'reports.categories.inventoryLosses.title',
    descriptionKey: 'reports.categories.inventoryLosses.description',
    colorClass: 'bg-red-50 text-red-600',
  },
  {
    key: 'stock-verification',
    icon: ClipboardCheck,
    titleKey: 'reports.categories.stockVerification.title',
    descriptionKey: 'reports.categories.stockVerification.description',
    colorClass: 'bg-cyan-50 text-cyan-600',
  },
];

interface ReportHomeProps {
  onSelect: (key: ReportKey) => void;
}

export const ReportHome: React.FC<ReportHomeProps> = ({ onSelect }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('reports.home.title')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{t('reports.home.subtitle')}</p>
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
              <h3 className="font-bold text-sm text-gray-900">{t(cat.titleKey)}</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{t(cat.descriptionKey)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
