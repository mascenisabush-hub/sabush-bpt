import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  calculatePurchaseBatchSummary,
  buildPurchaseBatchTimeline,
  groupSummariesByPurchaseEvent,
  PurchaseBatchSummary,
  PurchaseEventGroup,
} from '../utils/purchaseBatchCalculations';
import { exportPurchaseBatchToPdf } from '../utils/batchPdfExport';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Boxes,
  Calendar,
  Search,
  X,
  Truck,
  Archive,
  ArchiveRestore,
  Download,
  Package,
  Clock,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { PurchaseBatch, PurchaseBatchStatus, StockBatch } from '../types';

const STATUS_STYLES: Record<PurchaseBatchStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-500/30',
  partially_remaining: 'bg-amber-50 text-amber-700 border-amber-500/30',
  fully_consumed: 'bg-gray-100 text-gray-600 border-gray-300',
  archived: 'bg-gray-100 text-gray-500 border-gray-300',
};

export const StocksView: React.FC = () => {
  const {
    batches,
    purchaseBatches,
    quebras,
    products,
    business,
    isOwner,
    currencySymbol,
    archivePurchaseBatch,
    unarchivePurchaseBatch,
  } = useApp();
  const { t } = useLanguage();

  const statusLabel = (status: PurchaseBatchStatus) => t(`common.purchaseBatchStatus.${status}`);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseBatchStatus>('all');
  const [showArchived, setShowArchived] = useState(false);
  // [Multi-Supplier Purchase Event Amendment v1.0, Part 10] Opt-in —
  // defaults to off, so the default view is byte-for-byte identical to
  // today's for every business that has never used "Add Another
  // Supplier." Purely a display toggle; changes nothing about what
  // filteredSummaries contains or how it's computed.
  const [groupByEvent, setGroupByEvent] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<PurchaseBatchSummary | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ============================================================
  // Build one summary per real Purchase Batch, PLUS one synthetic summary
  // per date for any legacy StockBatch line items that predate this
  // feature (no purchaseBatchId). Nothing historical is ever hidden or
  // lost — old data just shows up under a "Histórico (Pré-Atualização)"
  // placeholder supplier, grouped the way it always was (by date).
  // ============================================================
  const allSummaries = useMemo(() => {
    const grouped = new Map<string, StockBatch[]>();
    const legacyByDate = new Map<string, StockBatch[]>();

    batches.forEach((b) => {
      if (b.purchaseBatchId) {
        const existing = grouped.get(b.purchaseBatchId) || [];
        existing.push(b);
        grouped.set(b.purchaseBatchId, existing);
      } else {
        const existing = legacyByDate.get(b.dateEntered) || [];
        existing.push(b);
        legacyByDate.set(b.dateEntered, existing);
      }
    });

    const summaries: PurchaseBatchSummary[] = [];

    purchaseBatches.forEach((pb) => {
      const lineItems = grouped.get(pb.id) || [];
      summaries.push(calculatePurchaseBatchSummary(pb, lineItems, quebras, products));
    });

    // Synthetic envelopes for pre-feature data, one per legacy date.
    Array.from(legacyByDate.entries()).forEach(([date, lineItems], idx) => {
      const syntheticBatch: PurchaseBatch = {
        id: 'legacy-' + date,
        batchNumber: 'LEGADO',
        batchSeq: -1 - idx,
        date,
        supplier: { name: t('stocksView.legacySupplierName') },
        createdAt: lineItems[0]?.createdAt || date,
      };
      summaries.push(calculatePurchaseBatchSummary(syntheticBatch, lineItems, quebras, products));
    });

    return summaries.sort((a, b) => new Date(b.purchaseBatch.date).getTime() - new Date(a.purchaseBatch.date).getTime());
  }, [batches, purchaseBatches, quebras, products]);

  const supplierOptions = useMemo(() => {
    const names = new Set<string>();
    allSummaries.forEach((s) => names.add(s.purchaseBatch.supplier.name));
    return Array.from(names).sort();
  }, [allSummaries]);

  const filteredSummaries = useMemo(() => {
    const productNameMap = new Map<string, string>();
    products.forEach((p) => productNameMap.set(p.id, p.name.toLowerCase()));

    return allSummaries.filter((s) => {
      if (!showArchived && s.status === 'archived') return false;

      if (selectedDate && s.purchaseBatch.date !== selectedDate) return false;

      if (supplierFilter && s.purchaseBatch.supplier.name !== supplierFilter) return false;

      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesBatchNumber = s.purchaseBatch.batchNumber.toLowerCase().includes(query);
        const matchesSupplier = s.purchaseBatch.supplier.name.toLowerCase().includes(query);
        const matchesDate = formatDate(s.purchaseBatch.date).toLowerCase().includes(query);
        const matchesProduct = s.lineItems.some((li) =>
          (productNameMap.get(li.batch.productId) || '').includes(query)
        );
        if (!matchesBatchNumber && !matchesSupplier && !matchesDate && !matchesProduct) return false;
      }

      return true;
    });
  }, [allSummaries, showArchived, selectedDate, supplierFilter, statusFilter, searchQuery, products]);

  const summaryTotals = useMemo(() => {
    return filteredSummaries.reduce(
      (acc, s) => {
        acc.investment += s.remainingInvestmentValue;
        acc.market += s.remainingMarketValue;
        acc.profit += s.remainingEmbeddedProfit;
        return acc;
      },
      { investment: 0, market: 0, profit: 0 }
    );
  }, [filteredSummaries]);

  // [Multi-Supplier Purchase Event Amendment v1.0, Part 10] Computed
  // from filteredSummaries (not allSummaries) specifically so existing
  // filters (date/supplier/status/search/archived) still apply
  // correctly to the grouped view — a filtered-out PurchaseBatch must
  // not silently reappear inside an event group. No new calculation:
  // groupSummariesByPurchaseEvent only sums figures
  // calculatePurchaseBatchSummary already produced.
  const groupedView = useMemo(() => groupSummariesByPurchaseEvent(filteredSummaries), [filteredSummaries]);

  const selectedTimeline = useMemo(() => {
    if (!selectedSummary) return [];
    return buildPurchaseBatchTimeline(selectedSummary, quebras);
  }, [selectedSummary, quebras]);

  const handleExportPdf = async () => {
    if (!selectedSummary || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportPurchaseBatchToPdf(selectedSummary, selectedTimeline, currencySymbol, business?.name || 'Sabush');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isLegacy = (s: PurchaseBatchSummary) => s.purchaseBatch.batchSeq < 0;

  // Extracted, unmodified from the original single-list rendering, so
  // it can be reused identically by both the default ungrouped view
  // and the grouped-by-Purchase-Event view's member cards — same
  // click behavior (opens the existing detail modal), same markup.
  const renderSummaryCard = (s: PurchaseBatchSummary) => (
    <button
      key={s.purchaseBatch.id}
      onClick={() => setSelectedSummary(s)}
      className="w-full text-left bg-white border border-[#E5E7EB] rounded-2xl p-4 transition-all duration-150 hover:border-[#D4AF37]/40 hover:shadow-[0_8px_24px_-14px_rgba(11,31,58,0.18)] group"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <Package className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-number text-sm text-[#111827] group-hover:text-[#B8952F] transition-colors duration-150">
                {s.purchaseBatch.batchNumber}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status]}`}>
                {statusLabel(s.status)}
              </span>
              {isLegacy(s) && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-300">
                  {t('stocksView.legacyBadge')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(s.purchaseBatch.date)}
              </span>
              <span className="flex items-center gap-1 truncate">
                <Truck className="w-3 h-3 shrink-0" /> {s.purchaseBatch.supplier.name}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />{' '}
                {s.productCount === 1
                  ? t('stocksView.productCountOne', { count: s.productCount })
                  : t('stocksView.productCountOther', { count: s.productCount })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right font-mono">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.invested')}</span>
            <span className="text-xs type-number text-[#111827]">
              {formatCurrency(s.remainingInvestmentValue, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.market')}</span>
            <span className="text-xs type-number text-gray-700">
              {formatCurrency(s.remainingMarketValue, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.embeddedProfit')}</span>
            <span className={`text-xs type-number ${s.remainingEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(s.remainingEmbeddedProfit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_8px_24px_-14px_rgba(11,31,58,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <Boxes className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="type-title-lg flex items-center gap-2">
              {t('stocksView.title')}
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('stocksView.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl p-2.5 px-4 text-xs shrink-0">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">{t('stocksView.remainingInvestment')}</span>
            <span className="type-number text-[#111827]">{formatCurrency(summaryTotals.investment, currencySymbol)}</span>
          </div>
          <div className="h-6 w-px bg-[#E5E7EB]"></div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">{t('stocksView.marketValue')}</span>
            <span className="type-number text-gray-700">{formatCurrency(summaryTotals.market, currencySymbol)}</span>
          </div>
          <div className="h-6 w-px bg-[#E5E7EB]"></div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">{t('stocksView.remainingEmbeddedProfit')}</span>
            <span className={`type-number ${summaryTotals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(summaryTotals.profit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('stocksView.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] pl-10 pr-9 py-2 text-xs text-[#111827] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-2">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-xs text-[#111827] transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="">{t('stocksView.allSuppliers')}</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-xs text-[#111827] transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="all">{t('stocksView.allStatuses')}</option>
              <option value="active">{t('common.purchaseBatchStatus.active')}</option>
              <option value="partially_remaining">{t('common.purchaseBatchStatus.partially_remaining')}</option>
              <option value="fully_consumed">{t('common.purchaseBatchStatus.fully_consumed')}</option>
              <option value="archived">{t('common.purchaseBatchStatus.archived')}</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-xs text-[#111827] font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="p-2 text-gray-400 hover:text-gray-600 border border-[#E5E7EB] rounded-[10px] transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 font-semibold select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            {t('stocksView.showArchived')}
          </label>
          {/* [Multi-Supplier Purchase Event Amendment v1.0, Part 8/10] */}
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 font-semibold select-none">
            <input
              type="checkbox"
              checked={groupByEvent}
              onChange={(e) => setGroupByEvent(e.target.checked)}
              className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            {t('stocksView.groupByEvent')}
          </label>
        </div>
      </div>

      {/* Batch List */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center">
          <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-sm text-gray-500">{t('stocksView.emptyState')}</p>
        </div>
      ) : groupByEvent ? (
        // [Multi-Supplier Purchase Event Amendment v1.0, Part 10] Every
        // group renders its aggregate header, then its own member cards
        // via the exact same renderSummaryCard used by the default view
        // below — same click behavior, same detail modal, unchanged.
        // ungrouped summaries (the overwhelming majority, by design —
        // amendment Part 7) render exactly as the default view does,
        // with no group header at all — the fallback the amendment's
        // Part 10 requires.
        <div className="space-y-4">
          {groupedView.grouped.map((group) => (
            <div key={group.purchaseEventId} className="space-y-2">
              <div className="bg-[#0B1F3A]/[0.03] border border-[#0B1F3A]/10 rounded-2xl p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#0B1F3A]">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(group.date)}
                      <span className="text-gray-400 font-semibold">
                        {group.summaries.length === 1
                          ? t('stocksView.event.batchCountOne', { count: group.summaries.length })
                          : t('stocksView.event.batchCountOther', { count: group.summaries.length })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 flex-wrap">
                      <Truck className="w-3 h-3 shrink-0" />
                      {group.supplierNames.join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.invested')}</span>
                      <span className="text-xs type-number text-[#111827]">
                        {formatCurrency(group.remainingInvestmentValue, currencySymbol)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.market')}</span>
                      <span className="text-xs type-number text-gray-700">
                        {formatCurrency(group.remainingMarketValue, currencySymbol)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.embeddedProfit')}</span>
                      <span className={`text-xs type-number ${group.remainingEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(group.remainingEmbeddedProfit, currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 pl-3">{group.summaries.map((s) => renderSummaryCard(s))}</div>
            </div>
          ))}
          {groupedView.ungrouped.length > 0 && (
            <div className="space-y-2.5">{groupedView.ungrouped.map((s) => renderSummaryCard(s))}</div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">{filteredSummaries.map((s) => renderSummaryCard(s))}</div>
      )}

      {/* ============================================================ */}
      {/* BATCH DETAIL MODAL — full Investment Ledger detail page       */}
      {/* ============================================================ */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-[0_24px_64px_-16px_rgba(11,31,58,0.35)] max-h-[92vh] flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
                  <Package className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base text-[#111827] flex items-center gap-2 font-mono truncate">
                    {selectedSummary.purchaseBatch.batchNumber}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[selectedSummary.status]}`}>
                      {statusLabel(selectedSummary.status)}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(selectedSummary.purchaseBatch.date)} · {selectedSummary.purchaseBatch.supplier.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="p-2 text-gray-400 hover:text-[#111827] hover:bg-gray-50 rounded-xl transition-colors duration-150 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* Batch info */}
              <div className="bg-[#FAFBFC] border border-[#E5E7EB] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold tracking-wide">{t('stocksView.modal.supplier')}</span>
                    <span className="text-[#111827] font-semibold">{selectedSummary.purchaseBatch.supplier.name}</span>
                    {selectedSummary.purchaseBatch.supplier.phone && (
                      <span className="text-gray-500 block">{selectedSummary.purchaseBatch.supplier.phone}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold tracking-wide">{t('stocksView.modal.createdBy')}</span>
                    <span className="text-[#111827] font-semibold">{selectedSummary.purchaseBatch.createdByName || '—'}</span>
                  </div>
                </div>
                {selectedSummary.purchaseBatch.notes && (
                  <div className="sm:col-span-2 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold tracking-wide">{t('stocksView.modal.notes')}</span>
                      <span className="text-[#111827]">{selectedSummary.purchaseBatch.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Investment Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block tracking-wide">{t('stocksView.modal.totalInvestment')}</span>
                  <span className="text-sm type-number text-[#111827]">
                    {formatCurrency(selectedSummary.totalInvestmentValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block tracking-wide">{t('stocksView.modal.marketValue')}</span>
                  <span className="text-sm type-number text-gray-700">
                    {formatCurrency(selectedSummary.totalMarketValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block tracking-wide">{t('stocksView.modal.embeddedProfit')}</span>
                  <span className={`text-sm type-number ${selectedSummary.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(selectedSummary.totalEmbeddedProfit, currencySymbol)}
                  </span>
                </div>
                <div className="bg-[#D4AF37]/[0.06] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block tracking-wide">{t('stocksView.modal.remainingInvestment')}</span>
                  <span className="text-sm type-number text-[#0B1F3A]">
                    {formatCurrency(selectedSummary.remainingInvestmentValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-[#D4AF37]/[0.06] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block tracking-wide">{t('stocksView.modal.remainingMarket')}</span>
                  <span className="text-sm type-number text-[#0B1F3A]">
                    {formatCurrency(selectedSummary.remainingMarketValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-[#D4AF37]/[0.06] border border-[#D4AF37]/25 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block tracking-wide">{t('stocksView.modal.remainingProfit')}</span>
                  <span className={`text-sm type-number ${selectedSummary.remainingEmbeddedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatCurrency(selectedSummary.remainingEmbeddedProfit, currencySymbol)}
                  </span>
                </div>
              </div>

              {selectedSummary.inventoryLostValue > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
                  <span>
                    {t('stocksView.modal.inventoryLostWarning', { value: formatCurrency(selectedSummary.inventoryLostValue, currencySymbol) })}
                  </span>
                </div>
              )}

              {/* Product Table */}
              <div>
                <h3 className="text-xs font-bold text-[#111827] mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#B8952F]" strokeWidth={2.25} /> {t('stocksView.modal.productsHeading')}
                </h3>
                <div className="border border-[#E5E7EB] rounded-2xl bg-[#FAFBFC] p-2 overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        <th className="py-2 px-2.5">{t('stocksView.modal.table.product')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.qtyRemaining')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.costSell')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.remainingInvestment')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.embeddedProfit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]/60">
                      {selectedSummary.lineItems.map((li) => (
                        <tr key={li.batch.id} className="hover:bg-white transition-colors duration-150">
                          <td className="py-2.5 px-2.5 font-semibold text-[#111827]">
                            <span className="block font-bold">{li.product?.name || t('stocksView.modal.productRemoved')}</span>
                            <span className="text-[10px] font-normal text-gray-500 font-mono">
                              {t('stocksView.modal.table.statusPrefix')} {li.batch.status === 'open' ? t('common.batchStatus.open') : t('common.batchStatus.closed')}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right type-number text-[#111827]">
                            {li.batch.quantity} → {li.remainingQuantity}{' '}
                            <span className="text-[10px] font-sans font-normal text-gray-500">{li.batch.unit || 'un'}</span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-gray-700 tabular-nums">
                            {formatCurrency(li.batch.costPrice, currencySymbol)} / {formatCurrency(li.batch.sellingPrice, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-gray-700 tabular-nums">
                            {formatCurrency(li.investmentValue, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right type-number">
                            <span className={li.embeddedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                              {formatCurrency(li.embeddedProfit, currencySymbol)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-bold text-[#111827] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#B8952F]" strokeWidth={2.25} /> {t('stocksView.modal.timelineHeading')}
                </h3>
                <div className="space-y-2">
                  {selectedTimeline.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-white border border-[#E5E7EB] rounded-xl p-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{ev.label}</span>
                          <span className="text-[10px] text-gray-500 font-mono shrink-0">
                            {new Date(ev.date).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {isOwner && !isLegacy(selectedSummary) && (
                  selectedSummary.status === 'archived' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await unarchivePurchaseBatch(selectedSummary.purchaseBatch.id);
                        setSelectedSummary(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors duration-150 flex items-center gap-1.5"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" /> {t('stocksView.modal.reactivateBatch')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await archivePurchaseBatch(selectedSummary.purchaseBatch.id);
                        setSelectedSummary(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold transition-colors duration-150 flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" /> {t('stocksView.modal.archiveBatch')}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="btn-primary px-3.5 py-2 text-xs disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" /> {isExportingPdf ? t('stocksView.modal.generatingPdf') : t('stocksView.modal.exportPdf')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSummary(null)}
                className="px-5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#111827] text-xs font-bold transition-colors duration-150"
              >
                {t('stocksView.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
