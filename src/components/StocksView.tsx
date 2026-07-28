import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  calculatePurchaseBatchSummary,
  buildPurchaseBatchTimeline,
  PurchaseBatchSummary,
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

  return (
    <div className="space-y-4 pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {t('stocksView.title')}
            </h1>
            <p className="text-xs text-gray-500">
              {t('stocksView.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-2.5 px-3.5 text-xs font-mono shrink-0">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-bold">{t('stocksView.remainingInvestment')}</span>
            <span className="text-gray-800 font-bold">{formatCurrency(summaryTotals.investment, currencySymbol)}</span>
          </div>
          <div className="h-6 w-px bg-gray-50 mx-1"></div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-bold">{t('stocksView.marketValue')}</span>
            <span className="text-gray-700 font-bold">{formatCurrency(summaryTotals.market, currencySymbol)}</span>
          </div>
          <div className="h-6 w-px bg-gray-50 mx-1"></div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-sans font-bold">{t('stocksView.remainingEmbeddedProfit')}</span>
            <span className={`font-bold ${summaryTotals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(summaryTotals.profit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('stocksView.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] pl-10 pr-9 py-2 text-xs text-gray-800 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-2">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-xs text-gray-800 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
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
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-xs text-gray-800 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
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
              className="flex-1 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-xs text-gray-800 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-1.5 text-[11px] text-gray-600 font-semibold select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
          />
          {t('stocksView.showArchived')}
        </label>
      </div>

      {/* Batch List */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <Boxes className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('stocksView.emptyState')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSummaries.map((s) => (
            <button
              key={s.purchaseBatch.id}
              onClick={() => setSelectedSummary(s)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-blue-500/50 hover:shadow-md transition group"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="type-number text-sm text-gray-900 group-hover:text-blue-600 transition">
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
                    <span className="text-xs font-bold text-gray-800">
                      {formatCurrency(s.remainingInvestmentValue, currencySymbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.market')}</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {formatCurrency(s.remainingMarketValue, currencySymbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-sans font-semibold">{t('stocksView.embeddedProfit')}</span>
                    <span className={`text-xs font-bold ${s.remainingEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(s.remainingEmbeddedProfit, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* BATCH DETAIL MODAL — full Investment Ledger detail page       */}
      {/* ============================================================ */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl max-h-[92vh] flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 font-mono truncate">
                    {selectedSummary.purchaseBatch.batchNumber}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[selectedSummary.status]}`}>
                      {statusLabel(selectedSummary.status)}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    {formatDate(selectedSummary.purchaseBatch.date)} · {selectedSummary.purchaseBatch.supplier.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* Batch info */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-semibold">{t('stocksView.modal.supplier')}</span>
                    <span className="text-gray-800 font-semibold">{selectedSummary.purchaseBatch.supplier.name}</span>
                    {selectedSummary.purchaseBatch.supplier.phone && (
                      <span className="text-gray-500 block">{selectedSummary.purchaseBatch.supplier.phone}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-semibold">{t('stocksView.modal.createdBy')}</span>
                    <span className="text-gray-800 font-semibold">{selectedSummary.purchaseBatch.createdByName || '—'}</span>
                  </div>
                </div>
                {selectedSummary.purchaseBatch.notes && (
                  <div className="sm:col-span-2 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-semibold">{t('stocksView.modal.notes')}</span>
                      <span className="text-gray-800">{selectedSummary.purchaseBatch.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Investment Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">{t('stocksView.modal.totalInvestment')}</span>
                  <span className="text-sm font-bold text-gray-800 font-mono">
                    {formatCurrency(selectedSummary.totalInvestmentValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">{t('stocksView.modal.marketValue')}</span>
                  <span className="text-sm font-bold text-gray-700 font-mono">
                    {formatCurrency(selectedSummary.totalMarketValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">{t('stocksView.modal.embeddedProfit')}</span>
                  <span className={`text-sm type-number ${selectedSummary.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(selectedSummary.totalEmbeddedProfit, currencySymbol)}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">{t('stocksView.modal.remainingInvestment')}</span>
                  <span className="text-sm font-bold text-blue-700 font-mono">
                    {formatCurrency(selectedSummary.remainingInvestmentValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">{t('stocksView.modal.remainingMarket')}</span>
                  <span className="text-sm font-bold text-blue-700 font-mono">
                    {formatCurrency(selectedSummary.remainingMarketValue, currencySymbol)}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">{t('stocksView.modal.remainingProfit')}</span>
                  <span className={`text-sm type-number ${selectedSummary.remainingEmbeddedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatCurrency(selectedSummary.remainingEmbeddedProfit, currencySymbol)}
                  </span>
                </div>
              </div>

              {selectedSummary.inventoryLostValue > 0 && (
                <div className="bg-rose-50 border border-rose-500/20 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {t('stocksView.modal.inventoryLostWarning', { value: formatCurrency(selectedSummary.inventoryLostValue, currencySymbol) })}
                  </span>
                </div>
              )}

              {/* Product Table */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" /> {t('stocksView.modal.productsHeading')}
                </h3>
                <div className="border border-gray-200 rounded-2xl bg-white p-2 overflow-x-auto">
                  <table className="table-clean w-full text-left text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <th className="py-2 px-2.5">{t('stocksView.modal.table.product')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.qtyRemaining')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.costSell')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.remainingInvestment')}</th>
                        <th className="py-2 px-2.5 text-right">{t('stocksView.modal.table.embeddedProfit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {selectedSummary.lineItems.map((li) => (
                        <tr key={li.batch.id} className="hover:bg-white/60 transition">
                          <td className="py-2.5 px-2.5 font-semibold text-gray-900">
                            <span className="block font-bold">{li.product?.name || t('stocksView.modal.productRemoved')}</span>
                            <span className="text-[10px] font-normal text-gray-500 font-mono">
                              {t('stocksView.modal.table.statusPrefix')} {li.batch.status === 'open' ? t('common.batchStatus.open') : t('common.batchStatus.closed')}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right type-number text-gray-800">
                            {li.batch.quantity} → {li.remainingQuantity}{' '}
                            <span className="text-[10px] font-sans font-normal text-gray-500">{li.batch.unit || 'un'}</span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-gray-700">
                            {formatCurrency(li.batch.costPrice, currencySymbol)} / {formatCurrency(li.batch.sellingPrice, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-gray-700">
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
                <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> {t('stocksView.modal.timelineHeading')}
                </h3>
                <div className="space-y-2">
                  {selectedTimeline.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-white border border-gray-200 rounded-xl p-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
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
            <div className="pt-3 border-t border-gray-200 flex flex-wrap justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {isOwner && !isLegacy(selectedSummary) && (
                  selectedSummary.status === 'archived' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await unarchivePurchaseBatch(selectedSummary.purchaseBatch.id);
                        setSelectedSummary(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5"
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
                      className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" /> {t('stocksView.modal.archiveBatch')}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> {isExportingPdf ? t('stocksView.modal.generatingPdf') : t('stocksView.modal.exportPdf')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSummary(null)}
                className="px-5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition"
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
