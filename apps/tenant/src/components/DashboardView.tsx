import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBatch, calculateInventoryTotals } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  X,
  Wallet,
  Pencil,
  MoreVertical,
  SlidersHorizontal,
  Plus,
  Eye,
  Gem,
  TrendingUp,
  TrendingDown,
  Boxes,
  Landmark,
  Tag,
  Receipt,
  HandCoins,
} from 'lucide-react';
import { Product } from '../types';
import { EditProductModal } from './EditProductModal';
import { InitialStockPriceChangeModal } from './InitialStockPriceChangeModal';
import { useLanguage } from '../context/LanguageContext';

interface DashboardViewProps {
  onNavigateToAddStock: (productName?: string) => void;
  onNavigateToAddQuebra: (productId?: string) => void;
  onNavigateToInitialStockCount: () => void;
  onSelectProductDetail: (product: Product) => void;
}

// ============================================================
// KPI CARD — a single dashboard metric: icon, title, value, and a
// short plain-language explanation. Reused for all 9 top-level cards
// so the owner can read the health of the business without opening
// any modal. Purely presentational — no calculations happen here,
// every value is passed in already computed by the existing engine.
// ============================================================
interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
  label: string;
  value: string;
  valueClass?: string;
  description: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  /** Renders the gold-tint "Action Card" treatment (.card-premium.is-action)
   *  for drawing attention to an important action, e.g. "set your Initial
   *  Capital". Not to be confused with the dark navy "Highlight Card"
   *  (variant='dark' below) — different variant, different job. */
  action?: boolean;
  /** 'dark' renders the premium navy "Highlight Card" treatment used to make
   *  a metric stand out (e.g. Lucro Embutido, Valor do Negócio). Same data,
   *  same click behaviour — only the surface changes. */
  variant?: 'light' | 'dark';
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon: Icon,
  iconBgClass,
  iconTextClass,
  label,
  value,
  valueClass,
  description,
  onClick,
  badge,
  action,
  variant = 'light',
}) => {
  const isDark = variant === 'dark';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group h-full text-left p-6 flex flex-col gap-4 rounded-2xl transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isDark
          ? 'relative overflow-hidden card-dark-gradient shadow-[var(--shadow-2)]'
          : `card-premium ${action ? 'is-action' : ''}`
      } ${onClick ? (isDark ? 'hover:-translate-y-px cursor-pointer active:scale-[0.99]' : 'is-interactive cursor-pointer active:scale-[0.99]') : 'cursor-default'}`}
    >
      {isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 w-32 h-32 rounded-full bg-[#D4AF37]/[0.08] blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
      {/* Icon + label share one quiet row — the label is a caption for
          the icon, not a headline. Badge (if any) floats to the far end. */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? 'bg-white/10 text-[#D4AF37]' : `${iconBgClass} ${iconTextClass}`
            }`}
          >
            <Icon className="w-[15px] h-[15px]" />
          </div>
          <p className={`kpi-label leading-tight truncate ${isDark ? 'text-white/65' : ''}`}>
            {label}
          </p>
        </div>
        {badge}
      </div>

      {/* The number is the entire reason this card exists — it dominates
          the card by size and weight so it reads before anything else. */}
      <p
        className={`relative leading-[1] truncate tabular-nums font-extrabold ${
          isDark
            ? `text-[32px] sm:text-[36px] tracking-[-0.035em] ${valueClass || 'text-[#D4AF37]'}`
            : `text-[28px] sm:text-[32px] tracking-[-0.03em] ${valueClass || 'text-[#0B1F3A]'}`
        }`}
      >
        {value}
      </p>

      <p className={`relative text-[11px] leading-snug mt-auto pt-1 font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
        {description}
      </p>
    </button>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToAddStock,
  onNavigateToAddQuebra,
  onNavigateToInitialStockCount,
  onSelectProductDetail,
}) => {
  const {
    products, batches, quebras, currencySymbol,
    hasInitialStockCount, initialCapitalValue,
    currentInventoryValue, latestStockCount,
    totalInvestmentValueAllTime, totalMarketValueAllTime, totalEmbeddedProfitAllTime,
    activeBatchCount, totalExpensesAllTime, totalWithdrawalsAllTime,
    businessWorth, capitalGrowth, capitalGrowthPct,
  } = useApp();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showWorthModal, setShowWorthModal] = useState(false);
  const [showInitialStockValuationModal, setShowInitialStockValuationModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'profit' | 'cost'>('name');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Business-wide Embedded Profit split by batch status. None of this is
  // realized income — it's potential profit still sitting in unsold stock.
  // Also aggregate total Quebra (inventory loss) value at cost, reusing
  // the same per-batch calculation — no new formula, just a sum.
  let finalizedEmbeddedProfit = 0;
  let estimatedEmbeddedProfit = 0;
  let totalQuebraValueAllTime = 0;

  batches.forEach(batch => {
    const batchQuebras = quebras.filter(q => q.batchId === batch.id);
    const calc = calculateBatch(batch, batchQuebras);
    if (batch.status === 'closed') {
      finalizedEmbeddedProfit += calc.embeddedProfit;
    } else {
      estimatedEmbeddedProfit += calc.embeddedProfit;
    }
    totalQuebraValueAllTime += calc.quebraValue;
  });

  // Distinct category/supplier options derived from existing products,
  // used to populate the filter dropdowns below.
  const categoryOptions = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const supplierOptions = Array.from(new Set(products.map(p => p.supplier).filter(Boolean))) as string[];

  // Filter products by search (name, SKU, barcode, category, supplier)
  // and by the category/supplier dropdowns.
  let filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.supplier || '').toLowerCase().includes(query);

    if (!matchesQuery) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (supplierFilter && p.supplier !== supplierFilter) return false;
    return true;
  });

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    const aBatches = batches.filter(batch => batch.productId === a.id);
    const bBatches = batches.filter(batch => batch.productId === b.id);
    const aLatest = aBatches[0];
    const bLatest = bBatches[0];

    if (sortBy === 'cost') {
      return (bLatest?.costPrice || 0) - (aLatest?.costPrice || 0);
    }
    // embedded profit
    const aProfit = aBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.embeddedProfit;
    }, 0);
    const bProfit = bBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.embeddedProfit;
    }, 0);
    return bProfit - aProfit;
  });

  return (
    <div className="space-y-8 pb-6">
      {/* Business profile completion reminder now lives in the Header as a
          small inline nudge — see Header.tsx. Kept out of the dashboard body
          so nothing here competes with the KPI cards for attention. */}


      {/* PRIMARY KPI GRID — the 6 core numbers, 2 rows x 3 columns.
          Every value here reuses the existing calculation engine
          (calculateBatch / calculateInventoryTotals / AppContext);
          this is presentation only, nothing is recalculated.
          Color coding: navy = neutral, gold = business worth,
          green = profit, red = expenses. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <KpiCard
          icon={Landmark}
          iconBgClass={hasInitialStockCount ? 'bg-[#0B1F3A]/[0.06]' : 'bg-[#D4AF37]/10'}
          iconTextClass={hasInitialStockCount ? 'text-[#0B1F3A]' : 'text-[#8A6D1F]'}
          label={t('dashboard.kpi.initialCapital.label')}
          value={hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : t('dashboard.kpi.initialCapital.notSet')}
          valueClass={hasInitialStockCount ? 'text-[#0B1F3A]' : 'text-[#8A6D1F]'}
          description={
            hasInitialStockCount
              ? t('dashboard.kpi.initialCapital.descSet')
              : t('dashboard.kpi.initialCapital.descUnset')
          }
          onClick={!hasInitialStockCount ? onNavigateToInitialStockCount : () => setShowInitialStockValuationModal(true)}
          action={!hasInitialStockCount}
        />

        <KpiCard
          icon={Package}
          iconBgClass="bg-[#0B1F3A]/[0.06]"
          iconTextClass="text-[#0B1F3A]"
          label={t('dashboard.kpi.stockCost.label')}
          value={formatCurrency(totalInvestmentValueAllTime, currencySymbol)}
          valueClass="text-[#0B1F3A]"
          description={t('dashboard.kpi.stockCost.desc')}
        />

        <KpiCard
          icon={Tag}
          iconBgClass="bg-[#0B1F3A]/[0.06]"
          iconTextClass="text-[#0B1F3A]"
          label={t('dashboard.kpi.marketValue.label')}
          value={formatCurrency(totalMarketValueAllTime, currencySymbol)}
          valueClass="text-[#0B1F3A]"
          description={t('dashboard.kpi.marketValue.desc')}
        />

        <KpiCard
          icon={Wallet}
          iconBgClass="bg-emerald-500/10"
          iconTextClass="text-emerald-600"
          label={t('dashboard.kpi.embeddedProfit.label')}
          value={formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)}
          valueClass={totalEmbeddedProfitAllTime >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          description={t('dashboard.kpi.embeddedProfit.desc')}
          onClick={() => setShowBreakdownModal(true)}
          variant="dark"
        />

        <KpiCard
          icon={Gem}
          iconBgClass="bg-[#D4AF37]/10"
          iconTextClass="text-[#D4AF37]"
          label={t('dashboard.kpi.businessWorth.label')}
          value={formatCurrency(businessWorth, currencySymbol)}
          valueClass="text-[#D4AF37]"
          description={t('dashboard.kpi.businessWorth.desc')}
          onClick={() => setShowWorthModal(true)}
          variant="dark"
          badge={
            hasInitialStockCount && capitalGrowth !== 0 ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] type-number ${
                  capitalGrowth > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {capitalGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {capitalGrowth >= 0 ? '+' : ''}
                {capitalGrowthPct.toFixed(1)}%
              </span>
            ) : null
          }
        />

        <KpiCard
          icon={Receipt}
          iconBgClass="bg-rose-500/10"
          iconTextClass="text-rose-600"
          label={t('dashboard.kpi.expenses.label')}
          value={formatCurrency(totalExpensesAllTime, currencySymbol)}
          valueClass="text-rose-700"
          description={t('dashboard.kpi.expenses.desc')}
        />
      </div>

      {/* SECONDARY METRICS — same existing cards/data (Levantamentos, Quebras,
          Lotes Ativos), nothing removed. Set apart with a border on a white
          surface (not a gray fill) so the primary 6 above keep focus while
          the page stays on the white/navy/gold palette. */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
        <p className="kpi-label mb-4 px-1">
          {t('dashboard.otherIndicators')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          <KpiCard
            icon={HandCoins}
            iconBgClass="bg-[#D4AF37]/10"
            iconTextClass="text-[#D4AF37]"
            label={t('dashboard.kpi.withdrawals.label')}
            value={formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
            valueClass="text-[#D4AF37]"
            description={t('dashboard.kpi.withdrawals.desc')}
          />

          <KpiCard
            icon={AlertTriangle}
            iconBgClass="bg-rose-500/10"
            iconTextClass="text-rose-600"
            label={t('dashboard.kpi.quebraLoss.label')}
            value={formatCurrency(totalQuebraValueAllTime, currencySymbol)}
            valueClass="text-rose-700"
            description={t('dashboard.kpi.quebraLoss.desc')}
          />

          <KpiCard
            icon={Boxes}
            iconBgClass="bg-[#0B1F3A]/[0.06]"
            iconTextClass="text-[#0B1F3A]"
            label={t('dashboard.kpi.activeBatches.label')}
            value={String(activeBatchCount)}
            valueClass="text-[#0B1F3A]"
            description={t('dashboard.kpi.activeBatches.desc')}
          />
        </div>
      </div>

      {/* TOP BAR (single slim row) */}
      <div className="flex items-center gap-2 card-premium rounded-2xl p-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('dashboard.toolbar.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F7FA] border border-transparent rounded-[10px] pl-10 pr-8 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#D4AF37] transition font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category / Supplier Filters */}
        {categoryOptions.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="hidden sm:block bg-[#F5F7FA] border border-transparent rounded-[10px] px-2 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:bg-white focus:border-[#D4AF37] shrink-0 max-w-[140px]"
          >
            <option value="">{t('dashboard.toolbar.allCategories')}</option>
            {categoryOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {supplierOptions.length > 0 && (
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="hidden sm:block bg-[#F5F7FA] border border-transparent rounded-[10px] px-2 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:bg-white focus:border-[#D4AF37] shrink-0 max-w-[140px]"
          >
            <option value="">{t('dashboard.toolbar.allSuppliers')}</option>
            {supplierOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Right: Product Count & Sort Button */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-gray-600 bg-[#F5F7FA] px-4 py-2 rounded-[10px] hidden sm:inline-block">
            {t(products.length === 1 ? 'dashboard.toolbar.productCountOne' : 'dashboard.toolbar.productCountOther', { count: products.length })}
          </span>
          <span className="text-[11px] font-bold text-gray-600 bg-[#F5F7FA] px-4 py-2 rounded-[10px] hidden sm:inline-flex items-center gap-1">
            <Boxes className="w-3 h-3 text-[#D4AF37]" />
            {t(activeBatchCount === 1 ? 'dashboard.toolbar.activeBatchOne' : 'dashboard.toolbar.activeBatchOther', { count: activeBatchCount })}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              title={t('dashboard.toolbar.filterSort')}
              className="p-2 rounded-[10px] bg-[#F5F7FA] hover:bg-[#EEF0F3] text-gray-600 hover:text-[#0B1F3A] transition active:scale-95 flex items-center gap-1 text-xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#0B1F3A]" />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-[10px] elevation-3 p-1 z-20 w-44 space-y-1 text-xs text-gray-700">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {t('dashboard.toolbar.sortBy')}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2 py-2 rounded-lg transition ${sortBy === 'name' ? 'bg-[#D4AF37]/10 text-[#D4AF37] font-bold' : 'hover:bg-gray-50'}`}
                  >
                    {t('dashboard.toolbar.sortName')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('profit'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2 py-2 rounded-lg transition ${sortBy === 'profit' ? 'bg-[#D4AF37]/10 text-[#D4AF37] font-bold' : 'hover:bg-gray-50'}`}
                  >
                    {t('dashboard.toolbar.sortProfit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('cost'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2 py-2 rounded-lg transition ${sortBy === 'cost' ? 'bg-[#D4AF37]/10 text-[#D4AF37] font-bold' : 'hover:bg-gray-50'}`}
                  >
                    {t('dashboard.toolbar.sortCost')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 elevation-3 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[#0B1F3A]" />
                <h3 className="text-base font-bold text-title">{t('dashboard.breakdownModal.title')}</h3>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-[10px] hover:bg-gray-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 -mt-1">
              {t('dashboard.breakdownModal.explanation')}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-4 rounded-[10px] bg-white border border-gray-200">
                <span className="text-gray-500">{t('dashboard.breakdownModal.estimatedOpen')}</span>
                <span className="type-number text-[#B8952F]">
                  {formatCurrency(estimatedEmbeddedProfit, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[10px] bg-white border border-gray-200">
                <span className="text-gray-500">{t('dashboard.breakdownModal.finalizedClosed')}</span>
                <span className="type-number text-[#B8952F]">
                  {formatCurrency(finalizedEmbeddedProfit, currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between p-4 rounded-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <span className="text-gray-800 font-bold">{t('dashboard.breakdownModal.totalLabel')}</span>
                <span className={`text-base font-extrabold font-mono ${totalEmbeddedProfitAllTime >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[10px] bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">{t('dashboard.breakdownModal.expensesLabel')}</span>
                <span className="type-number text-rose-700">
                  − {formatCurrency(totalExpensesAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[10px] bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500">{t('dashboard.breakdownModal.withdrawalsLabel')}</span>
                <span className="type-number text-slate-600">
                  − {formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-2 rounded-[10px] bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Business Worth Modal */}
      {showWorthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 elevation-3 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-2">
                <Gem className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-bold text-title">{t('dashboard.worthModal.title')}</h3>
              </div>
              <button
                onClick={() => setShowWorthModal(false)}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-[10px] hover:bg-gray-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 -mt-1">
              {t('dashboard.worthModal.explanation')}
            </p>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2 text-gray-500">
                  <Boxes className="w-3.5 h-3.5 text-amber-600" /> {t('dashboard.worthModal.marketValue')}
                </span>
                <span className="type-number text-gray-800">
                  {formatCurrency(totalMarketValueAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-gray-500">{t('dashboard.worthModal.stockCost')}</span>
                <span className="type-number text-gray-800">
                  {formatCurrency(totalInvestmentValueAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-gray-500">{t('dashboard.worthModal.expenses')}</span>
                <span className="type-number text-rose-700">
                  − {formatCurrency(totalExpensesAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-gray-500">{t('dashboard.worthModal.withdrawals')}</span>
                <span className="type-number text-rose-700">
                  − {formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between px-4 py-3.5 rounded-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <span className="text-gray-800 font-bold">{t('dashboard.worthModal.totalLabel')}</span>
                <span className="text-base font-extrabold font-mono text-[#8A6D1F]">
                  {formatCurrency(businessWorth, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 mt-1">
                <span className="text-gray-500">{t('dashboard.worthModal.latestCount')}</span>
                <span className="type-number text-slate-600">
                  {formatCurrency(currentInventoryValue, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-gray-500">{t('dashboard.worthModal.initialCapital')}</span>
                <span className="type-number text-slate-600">
                  {formatCurrency(initialCapitalValue, currencySymbol)}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-4 rounded-[10px] border ${
                  capitalGrowth >= 0 ? 'bg-emerald-50 border-emerald-500/30' : 'bg-rose-50 border-rose-500/30'
                }`}
              >
                <span className="flex items-center gap-2 font-bold text-gray-700">
                  {capitalGrowth >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  {t('dashboard.worthModal.growth')}
                </span>
                <span className={`type-number ${capitalGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {capitalGrowth >= 0 ? '+' : ''}
                  {formatCurrency(capitalGrowth, currencySymbol)} ({capitalGrowthPct >= 0 ? '+' : ''}
                  {capitalGrowthPct.toFixed(1)}%)
                </span>
              </div>

              {latestStockCount && (
                <p className="text-[10px] text-gray-400 text-center pt-1">
                  {t('dashboard.worthModal.basedOnCount', { date: latestStockCount.date.split('-').reverse().join('/') })}
                  {!hasInitialStockCount && t('dashboard.worthModal.defineInitialCapital')}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowWorthModal(false)}
              className="w-full py-2 rounded-[10px] bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-[10px] p-8 text-center max-w-lg mx-auto my-6 elevation-1">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mx-auto mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">{t('dashboard.table.emptyTitle')}</h3>
          <p className="text-xs text-gray-500 my-2">
            {products.length === 0
              ? t('dashboard.table.emptyNoProducts')
              : t('dashboard.table.emptyNoMatch')}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => onNavigateToAddStock()}
              className="mt-4 px-4 py-2 rounded-[10px] bg-[#0B1F3A] hover:bg-[#14294A] text-white font-bold text-xs transition shadow-md active:scale-95"
            >
              {t('dashboard.table.addFirstBatch')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[10px] overflow-hidden elevation-1">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-4 py-4 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="col-span-4 sm:col-span-5">{t('dashboard.table.headerProduct')}</div>
            <div className="col-span-2 text-right">
              {t('dashboard.table.headerBuy')}
              <span className="block text-[9px] text-gray-500 font-bold lowercase">{t('dashboard.table.perUnit')}</span>
            </div>
            <div className="col-span-2 text-right">
              {t('dashboard.table.headerSell')}
              <span className="block text-[9px] text-gray-500 font-bold lowercase">{t('dashboard.table.perUnit')}</span>
            </div>
            <div className="col-span-2 sm:col-span-2 text-right">
              {t('dashboard.table.headerProfit')}
              <span className="block text-[9px] text-gray-500 font-bold lowercase">{t('dashboard.table.estFinal')}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 text-center pr-1">{t('dashboard.table.headerActions')}</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 max-h-[calc(100vh-190px)] overflow-y-auto">
            {filteredProducts.map(product => {
              const productBatches = batches.filter(b => b.productId === product.id);
              const activeBatch = productBatches.find(b => b.status === 'open');
              const closedBatches = productBatches.filter(b => b.status === 'closed');
              const latestBatch = productBatches[0];

              let activeCalc = null;
              if (activeBatch) {
                const activeQuebras = quebras.filter(q => q.batchId === activeBatch.id);
                activeCalc = calculateBatch(activeBatch, activeQuebras);
              }

              let productFinalizedProfit = 0;
              closedBatches.forEach(cb => {
                const cbQuebras = quebras.filter(q => q.batchId === cb.id);
                const cCalc = calculateBatch(cb, cbQuebras);
                productFinalizedProfit += cCalc.embeddedProfit;
              });

              const displayBatch = activeBatch || latestBatch;
              const costPriceText = displayBatch ? formatCurrency(displayBatch.costPrice, currencySymbol) : '-';
              const sellingPriceText = displayBatch ? formatCurrency(displayBatch.sellingPrice, currencySymbol) : '-';

              const displayProfit = activeBatch && activeCalc 
                ? activeCalc.embeddedProfit 
                : productFinalizedProfit;

              const isMenuOpen = openActionMenuId === product.id;

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-1 items-center px-4 py-2 hover:bg-gray-100/50 transition group"
                >
                  {/* PRODUTO */}
                  <div
                    onClick={() => onSelectProductDetail(product)}
                    className="col-span-4 sm:col-span-5 pr-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-[#0B1F3A] transition truncate">
                        {product.name}
                      </span>
                      {activeCalc?.hasExceededWarning && (
                        <span title={t('dashboard.table.exceededWarning')}>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate font-mono">
                      {activeBatch
                        ? t('dashboard.table.activeBatch')
                        : closedBatches.length > 0
                        ? t(closedBatches.length === 1 ? 'dashboard.table.closedBatchOne' : 'dashboard.table.closedBatchOther', { count: closedBatches.length })
                        : t('dashboard.table.noBatch')}
                    </span>
                    {(product.category || product.supplier || product.sku) && (
                      <span className="text-[10px] text-gray-500 block truncate">
                        {[product.category, product.supplier, product.sku && t('dashboard.table.skuLabel', { sku: product.sku })]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </div>

                  {/* COMPRA */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-bold text-gray-700 font-mono block">
                      {costPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-gray-500 block font-sans">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* VENDA */}
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-bold text-gray-700 font-mono block">
                      {sellingPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-gray-500 block font-sans">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* LUCRO */}
                  <div className="col-span-2 sm:col-span-2 text-right">
                    <span
                      className={`text-xs type-number block ${
                        displayProfit >= 0
                          ? activeBatch ? 'text-emerald-600' : 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(displayProfit, currencySymbol)}
                    </span>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {activeBatch ? t('dashboard.table.est') : t('dashboard.table.final')}
                    </span>
                  </div>

                  {/* AÇÕES */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => onNavigateToAddStock(product.name)}
                      title={t('dashboard.table.editStock')}
                      className="p-2 text-gray-500 hover:text-[#0B1F3A] hover:bg-gray-50 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionMenuId(isMenuOpen ? null : product.id)}
                        title={t('dashboard.table.moreOptions')}
                        className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenActionMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-[10px] elevation-3 p-1 z-20 w-40 text-xs space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onSelectProductDetail(product);
                              }}
                              className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#0B1F3A]" />
                              <span>{t('dashboard.table.viewDetails')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddStock(product.name);
                              }}
                              className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-2"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#0B1F3A]" />
                              <span>{t('dashboard.table.addStock')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddQuebra(product.id);
                              }}
                              className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-2"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-[#0B1F3A]" />
                              <span>{t('dashboard.table.addQuebra')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setEditingProduct(product);
                              }}
                              className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-2"
                            >
                              <Tag className="w-3.5 h-3.5 text-[#0B1F3A]" />
                              <span>{t('dashboard.table.editDetails')}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingProduct && (
        <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} />
      )}

      {showInitialStockValuationModal && (
        <InitialStockPriceChangeModal
          onClose={() => setShowInitialStockValuationModal(false)}
          onOpenInitialStockScreen={onNavigateToInitialStockCount}
        />
      )}
    </div>
  );
};
