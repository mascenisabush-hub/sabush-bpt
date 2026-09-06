import React, { useState, useEffect } from 'react';
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
  Tag,
  Receipt,
  HandCoins,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../types';
import { EditProductModal } from './EditProductModal';
import { InitialStockPriceChangeModal } from './InitialStockPriceChangeModal';
import { useLanguage } from '../context/LanguageContext';
import { findLatestRememberedProductMemory } from '../lib/productMemoryPriceResolution';
import { isValidUnitRelationship } from '../lib/unitRelationship';
import { getConversionFactor } from '../lib/purchaseToSellingConversion';

interface DashboardViewProps {
  onNavigateToAddStock: (productName?: string) => void;
  onNavigateToAddQuebra: (productId?: string) => void;
  // [Capital Inicial Retirement — Implementation Authorization
  // Increment 4] Repurposed: no longer an unconditional "create
  // Capital Inicial" trigger. Still used to open InitialStockCountView
  // for reviewing an EXISTING historical confirmation (destination
  // defaults to 'initial-stock' for that call site), and now also the
  // target the new establishment chooser below calls with an explicit
  // 'stock-count' or 'declare-worth' destination.
  onNavigateToInitialStockCount: (destination?: 'initial-stock' | 'stock-count' | 'declare-worth') => void;
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 8] Navigates to the existing Periodic Stock Count screen (the same
  // screen an ordinary Contagem already uses) — a correction/recovery
  // reuses that exact entry form, distinguished only by the pending
  // correction-mode banner PeriodicStockCountView itself renders.
  onNavigateToStockCount: () => void;
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
          the icon, not a headline. Badge (if any) floats to the far end.
          [Readability Audit F-01, rendered-verification pass] The label
          was `truncate` (1-line ellipsis), but real puppeteer screenshots
          at the actual xl:grid-cols-6 breakpoint showed it wasn't even
          eliding cleanly — it was visually spilling past the card edge
          with no "…" at all. Two compounding root causes, both confirmed
          by direct DOM measurement (scrollWidth vs clientWidth,
          getBoundingClientRect vs the card's own rect):
            1. A flex item's default min-width:auto (content-based)
               silently defeats overflow-hidden/ellipsis unless the item
               itself also gets min-w-0 (the *row* already had it; the
               label itself did not).
            2. This whole icon+label+badge row is a direct child of the
               card's flex-col container. A column-flex child's cross-
               axis (width) size defaults to stretch, but Chrome does not
               actually stretch it down to the container's width once its
               own content is wider — it needs an explicit w-full, not an
               implicit stretch, to be reliably capped at the card's
               width (confirmed the same issue independently affects the
               KPI value figure below).
          Fixed both, and — per the audit's explicit preference for
          showing complete terminology over an ellipsis — switched the
          label from 1-line truncate to a 2-line clamp, with break-words
          as a last-resort fallback for the one real label ("Levantamentos
          do Dono") whose single longest word still doesn't fit on one
          line at the narrowest supported (390px, 2-column) width.
          Verified clean (no card-boundary overflow at all) at
          390/768/1024/1280/1440/1920px against the three longest real
          Portuguese labels ("Custo do Stock Atual", "Levantamentos do
          Dono", "Perdas de Stock (Quebras)") via headless-Chrome
          screenshots + getBoundingClientRect measurement, not just a
          source-code width estimate. */}
      <div className="relative flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? 'bg-white/[0.12] text-[#D4AF37] border border-white/[0.14]' : `${iconBgClass} ${iconTextClass}`
            }`}
          >
            <Icon className="w-[15px] h-[15px]" />
          </div>
          <p className={`kpi-label leading-tight line-clamp-2 min-w-0 break-words ${isDark ? 'text-white/80' : ''}`}>
            {label}
          </p>
        </div>
        {badge}
      </div>

      {/* The number is the entire reason this card exists — it dominates
          the card by size and weight so it reads before anything else.
          min-w-0 + w-full added for the identical reason as the label
          row above: without them, this flex-col child's default
          min-width:auto/implicit-stretch silently defeats `truncate`'s
          overflow-hidden/ellipsis — the figure would visually spill past
          the card edge instead of eliding cleanly. Confirmed via the
          same rendered-verification pass; this only visibly engages for
          an unusually large figure at the narrowest widths, but the
          underlying bug existed regardless of figure size. */}
      <p
        className={`relative leading-[1] truncate min-w-0 w-full tabular-nums font-extrabold ${
          isDark
            ? `text-[32px] sm:text-[36px] tracking-[-0.035em] ${valueClass || 'text-[#D4AF37]'}`
            : `text-[28px] sm:text-[32px] tracking-[-0.03em] ${valueClass || 'text-[#0B1F3A]'}`
        }`}
      >
        {value}
      </p>

      {/* Was text-[11px] text-gray-500 — read as placeholder text next to
          the bold KPI number above it. Bumped per Dashboard Readability
          Refinement: 13px, #374151 (existing secondary-text token),
          looser line-height — stays visually secondary to the number,
          but no longer illegible. */}
      <p className={`relative text-[13px] leading-[1.45] mt-auto pt-1 font-medium ${isDark ? 'text-white/70' : 'text-[#374151]'}`}>
        {description}
      </p>
    </button>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToAddStock,
  onNavigateToAddQuebra,
  onNavigateToInitialStockCount,
  onNavigateToStockCount,
  onSelectProductDetail,
}) => {
  const {
    products, batches, stockCounts, quebras, currencySymbol,
    hasInitialStockCount, initialCapitalValue,
    currentInventoryValue, latestStockCount,
    totalInvestmentValueAllTime, totalMarketValueAllTime, totalEmbeddedProfitAllTime,
    activeBatchCount, totalExpensesAllTime, totalWithdrawalsAllTime,
    businessWorth, capitalGrowth, capitalGrowthPct,
    currentBusinessWorth, estimatedBusinessWorth, businessWorthSnapshots,
    // [Business Worth Evolution — Implementation Authorization, Increment 8]
    businessWorthCorrectionEligibility,
    startBusinessWorthCorrection, checkBusinessWorthAuthorizedRecoveryEligibility,
    latestActiveBusinessWorthSnapshot,
  } = useApp();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showWorthModal, setShowWorthModal] = useState(false);
  const [showWorthHistoryModal, setShowWorthHistoryModal] = useState(false);
  const [showInitialStockValuationModal, setShowInitialStockValuationModal] = useState(false);
  // [Decision 43 §13] Authoritative, listener-independent re-check of
  // the "recover via SuperAdmin authorization" action's own
  // eligibility, obtained fresh whenever the history modal — the only
  // place this action is offered — opens. The ambient
  // `businessWorthAuthorizedRecoveryEligibility` context value is no
  // longer consumed by this component at all; the button's actual
  // gating condition, below, now uses this
  // authoritative result instead, so a `businessWorthRecoveryAuthorization`
  // listener failure can never hide a genuinely active grant. `null`
  // means "not yet checked" (or the check failed) — the action is not
  // offered in that state, matching this operation's own accepted
  // fail-safe treatment (Implementation Plan §17): a hidden action
  // that firestore.rules would have allowed is a minor inconvenience,
  // never a correctness problem, and never worse than what the prior,
  // purely-ambient-listener behavior already risked.
  const [authoritativeBusinessWorthRecoveryEligibility, setAuthoritativeBusinessWorthRecoveryEligibility] = useState<{ eligible: boolean; msRemaining: number } | null>(null);
  useEffect(() => {
    if (!showWorthHistoryModal || !latestActiveBusinessWorthSnapshot || businessWorthCorrectionEligibility.eligible) {
      // Not worth an extra Firestore round-trip when the modal is
      // closed, there is no current snapshot to check against, or the
      // ordinary (non-authorized) correction window is still open —
      // the authorized-recovery button never renders in either of the
      // latter two cases regardless of this check's own result.
      setAuthoritativeBusinessWorthRecoveryEligibility(null);
      return;
    }
    let cancelled = false;
    checkBusinessWorthAuthorizedRecoveryEligibility(latestActiveBusinessWorthSnapshot)
      .then((result) => {
        if (!cancelled) setAuthoritativeBusinessWorthRecoveryEligibility({ eligible: result.eligible, msRemaining: result.msRemaining });
      })
      .catch((err) => {
        console.error('[DashboardView] authoritative business-worth recovery eligibility check failed', err);
        if (!cancelled) setAuthoritativeBusinessWorthRecoveryEligibility({ eligible: false, msRemaining: 0 });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWorthHistoryModal, latestActiveBusinessWorthSnapshot?.id, businessWorthCorrectionEligibility.eligible]);
  // [Capital Inicial Retirement — Implementation Authorization
  // Increment 4] The KPI card's null-state click now opens this
  // chooser instead of navigating straight to Capital Inicial
  // creation — a small dialog offering only the two already-built,
  // already-governed establishment screens (Contagem / Owner-Declared
  // Business Worth). No new establishment mechanism.
  const [showEstablishWorthChooser, setShowEstablishWorthChooser] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'profit' | 'cost'>('name');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // [Business Worth Evolution — Implementation Authorization, Increment 2;
  // Specification §32, FR-4, FR-59] The existing Business Worth card (and
  // its click-through modal, below) is rewired to read the authoritative
  // shared calculation instead of the legacy `businessWorth` figure:
  // Current Business Worth once this business has an active
  // BusinessWorthSnapshot (State 3), or Estimated Business Worth before
  // that (State 1a) — never presented as though it were the measured
  // Current figure. `businessWorth`/`capitalGrowth`/`capitalGrowthPct`
  // themselves are UNCHANGED above — Reports/Closings (out of this
  // increment's scope) still read them exactly as before; only what this
  // one card displays is rewired here.
  const hasActiveBusinessWorthSnapshot = businessWorthSnapshots.some((s) => s.status === 'active');
  const displayedBusinessWorth = hasActiveBusinessWorthSnapshot ? currentBusinessWorth : estimatedBusinessWorth;
  const displayedBusinessWorthIsEstimated = !hasActiveBusinessWorthSnapshot && displayedBusinessWorth !== 'UNKNOWN';
  const displayedBusinessWorthValue = displayedBusinessWorth === 'UNKNOWN' ? null : displayedBusinessWorth;

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
  // [Feature — Owner-requested "black list" for discontinued products]
  // An inactive product (active === false) never appears in this
  // catalog list at all — it's still fully intact in Firestore (batch/
  // quebra/count history untouched), just not shown here. The only way
  // back is Add Stock's own reactivation prompt when that product's
  // name is matched again, not a toggle on this screen.
  let filteredProducts = products.filter(p => {
    if (p.active === false) return false;
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


      {/* PRIMARY KPI GRID — 5 core numbers (was 6; Capital Inicial's own
          card is retired below, replaced by Valor do Negócio — Owner's
          explicit choice: the evolving, comprehensive figure Business
          Worth already is, in the most prominent slot, rather than the
          static starting baseline that used to occupy it). Every value
          here reuses the existing calculation engine (calculateBatch /
          calculateInventoryTotals / AppContext); this is presentation
          only, nothing is recalculated. Color coding: navy = neutral,
          gold = business worth, green = profit, red = expenses. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* [Owner-requested — replaces the Capital Inicial card] Same
            underlying displayedBusinessWorth/displayedBusinessWorthValue
            this card already computed at its old, less prominent slot
            (further below in git history) — this is purely a position +
            presentation change, never a second calculation. Before any
            figure exists at all (displayedBusinessWorthValue === null —
            State 1, Specification §6: no historical Capital Inicial AND
            no BusinessWorthSnapshot yet), this card takes over Capital
            Inicial's own former "action card" nudge treatment
            (light/gold, is-action pulse). [Capital Inicial Retirement —
            Implementation Authorization Increment 4] It no longer routes
            straight to Capital Inicial creation — it opens the
            establishment chooser (showEstablishWorthChooser) between
            Contagem and Owner-Declared Business Worth instead. The
            moment a figure exists (Estimated — State 1a, or Current —
            State 3), it switches to the dark/gold "Highlight Card"
            treatment and the existing click-through Business Worth
            modal, exactly as this card already behaved at its old
            slot. */}
        <KpiCard
          icon={Gem}
          iconBgClass="bg-[#D4AF37]/10"
          iconTextClass={displayedBusinessWorthValue === null ? 'text-[#8A6D1F]' : 'text-[#D4AF37]'}
          label={t('dashboard.kpi.businessWorth.label')}
          value={
            displayedBusinessWorthValue === null
              ? t('dashboard.kpi.businessWorth.unknown')
              : formatCurrency(displayedBusinessWorthValue, currencySymbol)
          }
          valueClass={displayedBusinessWorthValue === null ? 'text-[#8A6D1F]' : 'text-[#D4AF37]'}
          description={
            displayedBusinessWorthValue === null
              ? t('dashboard.kpi.initialCapital.descUnset')
              : t('dashboard.kpi.businessWorth.desc')
          }
          onClick={displayedBusinessWorthValue === null ? () => setShowEstablishWorthChooser(true) : () => setShowWorthModal(true)}
          action={displayedBusinessWorthValue === null}
          variant={displayedBusinessWorthValue === null ? 'light' : 'dark'}
          badge={
            displayedBusinessWorthValue === null ? undefined : displayedBusinessWorthIsEstimated ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-2 py-0.5">
                {t('dashboard.kpi.businessWorth.estimatedLabel')}
              </span>
            ) : hasInitialStockCount && capitalGrowth !== 0 ? (
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
          icon={Receipt}
          iconBgClass="bg-rose-500/10"
          iconTextClass="text-rose-600"
          label={t('dashboard.kpi.expenses.label')}
          value={formatCurrency(totalExpensesAllTime, currencySymbol)}
          valueClass="text-rose-700"
          description={t('dashboard.kpi.expenses.desc')}
        />
      </div>

      {/* [Owner-requested] The Capital Inicial figure itself (initialCapitalValue)
          is NOT deleted or hidden anywhere else this codebase already
          shows it — showInitialStockValuationModal, the Contagem
          screens, and Reports all still read it exactly as before. Only
          its own dedicated KPI card, above, is retired; a business's
          historical starting point remains fully visible and unchanged
          everywhere else it already lived. */}

      {/* SECONDARY METRICS — same existing cards/data (Levantamentos, Quebras,
          Lotes Ativos), nothing removed. Set apart with a border on a white
          surface (not a gray fill) so the primary 6 above keep focus while
          the page stays on the white/navy/gold palette.
          [Readability Audit F-01] Grid was `xl:grid-cols-6` for only 3
          real cards — a leftover from before the Capital Inicial card
          (see retirement note above) was removed from this row. With 6
          tracks and 3 cards, each card was squeezed into 1/6 of the row
          width at exactly the breakpoint meant to have the *most* room,
          which was the direct cause of the label/value overflow this
          fix addresses. Capped at 4 columns (matching `lg:`, one spare
          column, consistent with how this row already renders at `lg`)
          so column count never *decreases* as the viewport grows wider —
          confirmed via rendered screenshots this alone removes most of
          the overflow risk even before the line-clamp/min-w-0 fixes
          above are counted. */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
        <p className="kpi-label mb-5 px-1">
          {t('dashboard.otherIndicators')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
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

            <p className="text-[13px] text-[#374151] -mt-1">
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

            <p className="text-[13px] text-[#374151] -mt-1">
              {t('dashboard.worthModal.explanation')}
            </p>

            {displayedBusinessWorthIsEstimated && (
              <p className="text-[11px] text-[#8A6D1F] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-[10px] px-3 py-2 -mt-1">
                {t('dashboard.worthModal.estimatedNotice')}
              </p>
            )}

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
                <span className="text-gray-800 font-bold">
                  {t(displayedBusinessWorthIsEstimated ? 'dashboard.worthModal.totalLabelEstimated' : 'dashboard.worthModal.totalLabel')}
                </span>
                <span className="text-base font-extrabold font-mono text-[#8A6D1F]">
                  {displayedBusinessWorthValue === null
                    ? t('dashboard.kpi.businessWorth.unknown')
                    : formatCurrency(displayedBusinessWorthValue, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 mt-1">
                <span className="text-gray-500">{t('dashboard.worthModal.latestCount')}</span>
                <span className="type-number text-slate-600">
                  {formatCurrency(currentInventoryValue, currencySymbol)}
                </span>
              </div>

              {/* [Capital Inicial Retirement — Implementation
                  Authorization Increment 4] This row no longer offers
                  Capital Inicial creation for a business with no
                  historical record — it simply does not render in that
                  case. When a historical record DOES exist, it still
                  opens the existing valuation/history view unchanged. */}
              {hasInitialStockCount && (
                <button
                  type="button"
                  onClick={() => {
                    setShowWorthModal(false);
                    setShowInitialStockValuationModal(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-[10px] hover:bg-gray-50 transition text-left"
                >
                  <span className="text-gray-500 underline decoration-dotted underline-offset-2">{t('dashboard.worthModal.initialCapital')}</span>
                  <span className="type-number text-slate-600">
                    {formatCurrency(initialCapitalValue, currencySymbol)}
                  </span>
                </button>
              )}

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
                </p>
              )}
            </div>

            {/* [Business Worth Evolution — Implementation Authorization,
                Increment 2; Specification §32 FR-47] Click-through into the
                Business Worth history view — every confirmed
                BusinessWorthSnapshot, ordered, drillable. */}
            <button
              onClick={() => {
                setShowWorthModal(false);
                setShowWorthHistoryModal(true);
              }}
              className="w-full py-2 rounded-[10px] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#8A6D1F] font-bold text-xs transition"
            >
              {t('dashboard.worthModal.viewHistory')}
            </button>

            <button
              onClick={() => setShowWorthModal(false)}
              className="w-full py-2 rounded-[10px] bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* [Capital Inicial Retirement — Implementation Authorization
          Increment 4] The establishment chooser — replaces the old
          direct route from the null-state KPI card into Capital
          Inicial creation. Offers only the two already-built,
          already-governed establishment screens; no new mechanism. */}
      {showEstablishWorthChooser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl text-gray-900 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Gem className="w-5 h-5 text-[#D4AF37]" />
                Estabelecer o Valor do Negócio
              </h2>
              <button
                type="button"
                onClick={() => setShowEstablishWorthChooser(false)}
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">Escolha como quer estabelecer o Valor do Negócio.</p>
              <button
                type="button"
                onClick={() => {
                  setShowEstablishWorthChooser(false);
                  onNavigateToInitialStockCount('stock-count');
                }}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Fazer uma Contagem de Stock</p>
                    <p className="text-[11px] text-gray-500">Conte fisicamente o stock que já possui.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEstablishWorthChooser(false);
                  onNavigateToInitialStockCount('declare-worth');
                }}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                    <Gem className="w-4.5 h-4.5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Declarar o Valor do Negócio</p>
                    <p className="text-[11px] text-gray-500">Já sabe o valor? Declare-o directamente.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [Business Worth Evolution — Implementation Authorization,
          Increment 2; Specification §8, §32 FR-47] Business Worth History
          — every confirmed BusinessWorthSnapshot for this business,
          ordered newest-first, including the current record. No
          redesign — reuses the exact same modal shell/styling as the
          Business Worth Modal above. */}
      {showWorthHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 elevation-3 space-y-4 animate-fadeIn max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-2">
                <Gem className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-bold text-title">{t('dashboard.historyModal.title')}</h3>
              </div>
              <button
                onClick={() => setShowWorthHistoryModal(false)}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-[10px] hover:bg-gray-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[13px] text-[#374151] -mt-1">
              {t('dashboard.historyModal.subtitle')}
            </p>

            {businessWorthSnapshots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                {t('dashboard.historyModal.empty')}
              </p>
            ) : (
              <div className="space-y-1 text-xs overflow-y-auto">
                {[...businessWorthSnapshots]
                  .sort((a, b) => {
                    const aMs = (a.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
                    const bMs = (b.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
                    return bMs - aMs;
                  })
                  .map((snapshot, index) => {
                    const confirmedMs = (snapshot.confirmedAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0;
                    const confirmedDate = confirmedMs ? new Date(confirmedMs) : null;
                    return (
                      <div
                        key={snapshot.id}
                        className="flex flex-col gap-1.5 px-4 py-3 rounded-[10px] border border-gray-100 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex flex-col">
                            <span className="text-gray-700 font-semibold flex items-center gap-1.5">
                              {index === 0 && snapshot.status === 'active' && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                                  {t('dashboard.historyModal.current')}
                                </span>
                              )}
                              {snapshot.status === 'corrected' && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                  {t('dashboard.historyModal.corrected')}
                                </span>
                              )}
                              {snapshot.status === 'superseded-by-recovery' && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                  {t('dashboard.historyModal.recovered')}
                                </span>
                              )}
                              {/* [Business Worth Evolution — Implementation
                                  Authorization, Increment 10 (Revision 3);
                                  Specification §42.1, FR-61] establishmentMethod
                                  is provenance/display metadata only — this
                                  badge is the "visibly distinguished in every
                                  UI surface that displays snapshot history"
                                  requirement FR-61 names. Absent on every
                                  pre-Increment-10 snapshot (never backfilled),
                                  which is why this only renders when the field
                                  is genuinely present and equal to
                                  'owner-declared' — a Contagem-sourced snapshot,
                                  old or new, renders no badge here, matching
                                  this component's existing "no badge = ordinary
                                  Contagem" convention for the status field
                                  above. */}
                              {snapshot.establishmentMethod === 'owner-declared' && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-1.5 py-0.5">
                                  {t('dashboard.historyModal.ownerDeclared')}
                                </span>
                              )}
                              {confirmedDate
                                ? t('dashboard.historyModal.measuredOn', { date: confirmedDate.toLocaleDateString() })
                                : snapshot.id}
                            </span>
                          </span>
                          <span className="type-number text-[#8A6D1F] font-bold">
                            {formatCurrency(snapshot.measuredBusinessWorth, currencySymbol)}
                          </span>
                        </div>

                        {/* [Business Worth Evolution — Implementation
                            Authorization, Increment 10 (Revision 3);
                            Specification §42.3, FR-69] "Absence, never
                            fabrication" made visible: an Owner-Declared
                            snapshot genuinely has no physical/financial
                            drill-down detail (productValuationTotal,
                            embeddedProfitTotal, cashPosition, etc. are all
                            genuinely absent, never a fabricated zero) — this
                            notice states that plainly rather than rendering
                            those fields blank/zero, which FR-69 explicitly
                            forbids being mistaken for an error or a defect. */}
                        {snapshot.establishmentMethod === 'owner-declared' && (
                          <p className="text-[10px] text-gray-400 italic">
                            {t('dashboard.historyModal.ownerDeclaredNotice')}
                          </p>
                        )}

                        {/* [Business Worth Evolution — Implementation
                            Authorization, Increment 8; Specification
                            §25, §26, FR-38, FR-40] Only ever rendered
                            for the business's own current (index 0,
                            status 'active') snapshot — never any other
                            row, so the target snapshot id is always
                            this component's own already-known
                            latestActiveBusinessWorthSnapshot, never a
                            free-typed or otherwise arbitrary value.
                            firestore.rules independently and
                            authoritatively re-verifies eligibility
                            regardless of this display. */}
                        {index === 0 && snapshot.status === 'active' && businessWorthCorrectionEligibility.eligible && (
                          <button
                            onClick={() => {
                              startBusinessWorthCorrection(snapshot.id, 'owner-correction');
                              setShowWorthHistoryModal(false);
                              onNavigateToStockCount();
                            }}
                            className="w-full py-1.5 rounded-[8px] bg-[#0B1F3A]/5 hover:bg-[#0B1F3A]/10 text-[#0B1F3A] font-bold text-[11px] transition"
                          >
                            {t('dashboard.historyModal.correctAction', {
                              hours: String(Math.max(1, Math.ceil(businessWorthCorrectionEligibility.msRemaining / (60 * 60 * 1000)))),
                            })}
                          </button>
                        )}
                        {index === 0 && snapshot.status === 'active' && !businessWorthCorrectionEligibility.eligible && authoritativeBusinessWorthRecoveryEligibility?.eligible === true && (
                          <button
                            onClick={() => {
                              startBusinessWorthCorrection(snapshot.id, 'superadmin-authorized-recovery');
                              setShowWorthHistoryModal(false);
                              onNavigateToStockCount();
                            }}
                            className="w-full py-1.5 rounded-[8px] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#8A6D1F] font-bold text-[11px] transition"
                          >
                            {t('dashboard.historyModal.recoverAction', {
                              hours: String(Math.max(1, Math.ceil(authoritativeBusinessWorthRecoveryEligibility.msRemaining / (60 * 60 * 1000)))),
                            })}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            <button
              onClick={() => setShowWorthHistoryModal(false)}
              className="w-full py-2 rounded-[10px] bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition"
            >
              {t('dashboard.historyModal.close')}
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
              // [§45 Amendment FR-87/FR-88/FR-13; Implementation
              // Authorization §2 item 8] Selling Price/Unit are
              // Contagem-owned memory (§45 §11) — prefer
              // Product.sellingPrice/unitRelationship.sellingUnit,
              // already correctly denominated together (the write side,
              // recordStockCount, always stores them as a matched
              // pair — see AppContext.tsx's sellingMemoryByProductName).
              // Falls back to findLatestRememberedProductMemory (already
              // existing, reused verbatim, unmodified) for a product
              // predating this feature, then to the latest batch's own
              // selling price as today's final fallback — never
              // fabricated. Cost remains purchase-workflow-sourced
              // (§45 §11): Product.costPrice once Add Stock populates it
              // (FR-86), else the latest batch's own cost. Cost Unit has
              // no dedicated Product field (the Plan's own
              // smallest-change decision, §45 Implementation Plan §7
              // item 7) — it remains the latest batch's own unit
              // regardless of which source supplies the Cost value.
              const confirmedSellingUnit = isValidUnitRelationship(product.unitRelationship) ? product.unitRelationship?.sellingUnit : undefined;
              let sellingPriceValue = product.sellingPrice;
              let sellingUnitLabel = confirmedSellingUnit;
              if (sellingPriceValue == null) {
                const memory = findLatestRememberedProductMemory(product.id, product.name, batches, stockCounts, confirmedSellingUnit);
                if (memory) {
                  sellingPriceValue = memory.sellingPrice;
                  sellingUnitLabel = sellingUnitLabel || memory.unit;
                }
              }
              const costPriceValue = product.costPrice;
              const costPriceText =
                costPriceValue != null ? formatCurrency(costPriceValue, currencySymbol) : displayBatch ? formatCurrency(displayBatch.costPrice, currencySymbol) : '-';
              const sellingPriceText =
                sellingPriceValue != null ? formatCurrency(sellingPriceValue, currencySymbol) : displayBatch ? formatCurrency(displayBatch.sellingPrice, currencySymbol) : '-';
              const sellingUnitText = sellingUnitLabel || displayBatch?.unit;

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
                    {isValidUnitRelationship(product.unitRelationship) && product.unitRelationship!.units.length > 1 && (
                      <span className="text-[10px] text-gray-500 block truncate font-mono">
                        1 {product.unitRelationship!.units[0].unit}
                        {product.unitRelationship!.units.slice(1).map((u, i) => {
                          const factor = getConversionFactor(product.unitRelationship!, product.unitRelationship!.units[0].unit, u.unit);
                          return (
                            <span key={i}>
                              {' '}= {factor ?? '?'} {u.unit}
                            </span>
                          );
                        })}
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
                    {sellingUnitText && (
                      <span className="text-[9px] text-gray-500 block font-sans">/{sellingUnitText}</span>
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
