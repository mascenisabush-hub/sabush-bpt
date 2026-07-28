import React from 'react';
import { ReportKey } from './shared/reportTypes';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
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
  Info,
} from 'lucide-react';

interface ReportCategoryDef {
  key: ReportKey;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  colorClass: string;
}

// Categories not already promoted into the hero stat row below.
const CATEGORIES: ReportCategoryDef[] = [
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
    colorClass: 'bg-rose-50 text-rose-600',
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
  const { totalMarketValueAllTime, totalEmbeddedProfitAllTime, totalExpensesAllTime, businessWorth, currencySymbol } = useApp();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-title-lg">{t('reports.home.title')}</h2>
        <p className="text-[12.5px] text-gray-500 mt-1">{t('reports.home.subtitle')}</p>
      </div>

      {/* Hero stat row — live figures read straight from AppContext's
          already-computed totals (never recalculated here). Business
          Worth is the one flagship metric on this screen, so it's the
          only card using .card-dark-gradient; the rest stay light. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onSelect('business-worth')}
          className="group relative overflow-hidden text-left card-dark-gradient shadow-[var(--shadow-2)] rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-px cursor-pointer active:scale-[0.99] transition-all duration-[220ms]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-10 w-32 h-32 rounded-full bg-[#D4AF37]/[0.08] blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/10 text-[#D4AF37]">
                <Gem className="w-[15px] h-[15px]" />
              </div>
              <p className="kpi-label leading-tight truncate text-white/40">{t('reports.categories.businessWorth.title')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
          </div>
          <p className="relative leading-[1] truncate tabular-nums font-extrabold text-[28px] sm:text-[32px] tracking-[-0.03em] text-[#D4AF37]">
            {formatCurrency(businessWorth, currencySymbol)}
          </p>
          <p className="relative text-[11px] leading-snug mt-auto pt-1 font-medium text-white/35">
            {t('reports.categories.businessWorth.description')}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('inventory-valuation')}
          className="text-left card-premium is-interactive cursor-pointer active:scale-[0.99] rounded-2xl p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
                <Boxes className="w-[15px] h-[15px]" />
              </div>
              <p className="kpi-label leading-tight truncate">{t('reports.categories.inventoryValuation.title')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </div>
          <p className="leading-[1] truncate tabular-nums font-extrabold text-[28px] sm:text-[32px] tracking-[-0.03em] text-[#0B1F3A]">
            {formatCurrency(totalMarketValueAllTime, currencySymbol)}
          </p>
          <p className="text-[11px] leading-snug mt-auto pt-1 font-medium text-gray-500">
            {t('reports.categories.inventoryValuation.description')}
          </p>
        </button>

        <div className="card-premium rounded-2xl p-6 flex flex-col gap-4 cursor-default">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-[15px] h-[15px]" />
              </div>
              <p className="kpi-label leading-tight truncate">{t('reports.home.embeddedProfitLabel')}</p>
            </div>
            <span title={t('reports.home.embeddedProfitHint')}>
              <Info className="w-3.5 h-3.5 text-gray-300" />
            </span>
          </div>
          <p className={`leading-[1] truncate tabular-nums font-extrabold text-[28px] sm:text-[32px] tracking-[-0.03em] ${totalEmbeddedProfitAllTime >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)}
          </p>
          <p className="text-[11px] leading-snug mt-auto pt-1 font-medium text-gray-500">
            {t('reports.home.embeddedProfitDescription')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelect('expenses')}
          className="text-left card-premium is-interactive cursor-pointer active:scale-[0.99] rounded-2xl p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
                <Receipt className="w-[15px] h-[15px]" />
              </div>
              <p className="kpi-label leading-tight truncate">{t('reports.categories.expenses.title')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </div>
          <p className="leading-[1] truncate tabular-nums font-extrabold text-[28px] sm:text-[32px] tracking-[-0.03em] text-rose-600">
            {formatCurrency(totalExpensesAllTime, currencySymbol)}
          </p>
          <p className="text-[11px] leading-snug mt-auto pt-1 font-medium text-gray-500">
            {t('reports.categories.expenses.description')}
          </p>
        </button>
      </div>

      {/* Remaining categories — horizontal cards, scannable at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className="text-left card-premium is-interactive cursor-pointer active:scale-[0.99] rounded-2xl p-4 flex items-center gap-3.5"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${cat.colorClass}`}>
              <cat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="type-title !text-[13.5px]">{t(cat.titleKey)}</h3>
              <p className="text-[11px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{t(cat.descriptionKey)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
        <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
        <p className="text-[12px] leading-relaxed text-gray-600">{t('reports.home.footerNote')}</p>
      </div>
    </div>
  );
};
