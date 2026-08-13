import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { StockCountType } from '../types';
import { findMostRecentBatchForProduct } from '../lib/restockObservation';
import { tallyStockCountRows, StockCountWorkingRow, StockCountTallyResult } from '../utils/stockCount';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

interface PeriodicStockCountViewProps {
  onComplete: () => void;
}

// A row keyed by its catalog Product id — one per Product document
// currently in `products` (Amendment Part 6/BDR-0009 Part 3's "active
// product" definition: exists in the collection = eligible). Never
// deleted from state when the operator hits "Remover" — only flagged
// `removed`, so it still resolves to Not Counted rather than vanishing
// from the tally entirely (Amendment Part 10).
type CatalogRowState = Record<string, StockCountWorkingRow>;

const TYPE_LABELS: Record<StockCountType, string> = {
  initial: 'Capital Inicial',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizada',
};

const TYPE_OPTIONS: { value: StockCountType; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizada' },
];

export const PeriodicStockCountView: React.FC<PeriodicStockCountViewProps> = ({ onComplete }) => {
  const {
    business,
    businessCategory,
    currencySymbol,
    recordStockCount,
    stockCounts,
    hasInitialStockCount,
    expectedCurrentStockValue,
    subscriptionBlocksNewRecords,
    products,
    batches,
    productsError,
  } = useApp();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createManualRow = (): StockCountWorkingRow => ({
    productId: undefined,
    productName: '',
    quantity: '',
    unit: suggestedUnits[0] || 'un',
    costPrice: '',
    sellingPrice: '',
  });

  // Builds one auto-populated working row from an existing catalog
  // Product — reference metadata pre-filled from its most recent
  // StockBatch (Amendment Part 11), falling back to the Product's own
  // reference cost/selling price, and left blank (never invented) when
  // neither exists. Quantity always starts blank ("not yet counted" —
  // BDR-0009 Part 4), never 0.
  const buildCatalogRow = (product: { id: string; name: string; costPrice?: number; sellingPrice?: number }): StockCountWorkingRow => {
    const latestBatch = findMostRecentBatchForProduct(batches, product.id);
    const costPrice = latestBatch ? String(latestBatch.costPrice) : product.costPrice != null ? String(product.costPrice) : '';
    const sellingPrice = latestBatch ? String(latestBatch.sellingPrice) : product.sellingPrice != null ? String(product.sellingPrice) : '';
    const unit = latestBatch?.unit ? latestBatch.unit : '';
    return {
      productId: product.id,
      productName: product.name,
      quantity: '',
      unit,
      costPrice,
      sellingPrice,
    };
  };

  const [type, setType] = useState<StockCountType>('monthly');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  // Keyed by productId so a re-render triggered by the products
  // listener (e.g. another device adding a product mid-count) can
  // merge in the new row without disturbing any quantity the operator
  // already typed into an existing one.
  const [catalogRows, setCatalogRows] = useState<CatalogRowState>({});
  const [manualRows, setManualRows] = useState<StockCountWorkingRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number>(0);
  const [savedTally, setSavedTally] = useState<StockCountTallyResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Mandatory Counted/Not Counted confirmation step before an actual
  // save (Amendment Part 9) — holds the tally computed from the
  // working list at the moment "Confirmar Contagem" was first pressed.
  const [pendingTally, setPendingTally] = useState<StockCountTallyResult | null>(null);

  // Auto-populate: every Product currently in the catalog gets a
  // working row (BDR-0009 Part 3 — "active" = exists in `products`).
  // Merge-only: a product already represented in `catalogRows` is left
  // untouched so an in-progress count survives the products listener
  // delivering an unrelated update. New products are added with a
  // fresh blank row; a product that no longer exists in `products` at
  // all (hard-deleted) is dropped, since Amendment Part 6 has nothing
  // left to source it from.
  useEffect(() => {
    setCatalogRows((prev) => {
      const next: CatalogRowState = {};
      for (const product of products) {
        next[product.id] = prev[product.id] || buildCatalogRow(product);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Past counts, most recent first, excluding the 'initial' one (shown separately as baseline)
  const pastCounts = [...stockCounts]
    .filter((s) => s.type !== 'initial')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const mostRecentCount = pastCounts[0] || null;
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 4]
  // Comparison baseline is now Expected Current Stock Value,
  // unconditionally — this supersedes the prior "most recent count,
  // falling back to Initial Capital" rule. `mostRecentCount` is kept
  // (used for the history list and the "since your last count" label
  // context below), but no longer feeds `comparisonBaseline`.
  const comparisonBaseline = expectedCurrentStockValue;

  const updateCatalogRow = (productId: string, fields: Partial<StockCountWorkingRow>) => {
    setCatalogRows((prev) => (prev[productId] ? { ...prev, [productId]: { ...prev[productId], ...fields } } : prev));
  };

  // Not a delete — flips `removed`, so the product stays represented
  // in the tally as Not Counted rather than disappearing from the
  // count entirely (Amendment Part 10).
  const handleRemoveCatalogRow = (productId: string) => {
    updateCatalogRow(productId, { removed: true, quantity: '' });
  };

  const handleRestoreCatalogRow = (productId: string) => {
    updateCatalogRow(productId, { removed: false });
  };

  const updateManualRow = (index: number, fields: Partial<StockCountWorkingRow>) => {
    setManualRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...fields } : row)));
  };

  const handleAddManualRow = () => setManualRows((prev) => [...prev, createManualRow()]);

  const handleRemoveManualRow = (index: number) => {
    setManualRows((prev) => prev.filter((_, i) => i !== index));
  };

  const visibleCatalogEntries = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    return Object.entries(catalogRows)
      .filter(([, row]) => !row.removed)
      .filter(([, row]) => !search || row.productName.toLowerCase().includes(search))
      .sort((a, b) => a[1].productName.localeCompare(b[1].productName));
  }, [catalogRows, productSearch]);

  const removedCatalogEntries = useMemo(
    () => Object.entries(catalogRows).filter(([, row]) => row.removed),
    [catalogRows]
  );

  // The full working list — every catalog row (visible, removed, or
  // still-blank alike) plus every manual row — is what actually gets
  // tallied. Search only ever affects what's displayed, never what's
  // counted, so a removed/filtered-out product is never silently
  // dropped from Not Counted.
  const allWorkingRows: StockCountWorkingRow[] = useMemo(
    () => [...Object.values(catalogRows), ...manualRows],
    [catalogRows, manualRows]
  );

  const liveTally = useMemo(() => tallyStockCountRows(allWorkingRows), [allWorkingRows]);

  const diff = liveTally.totalPurchaseValue - comparisonBaseline;
  const diffPct = comparisonBaseline > 0 ? (diff / comparisonBaseline) * 100 : 0;

  // Step 1 of 2: validate + compute the tally and hand off to the
  // mandatory Counted/Not Counted confirmation screen (Amendment Part
  // 9) — nothing is saved yet.
  const handleRequestConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === 'custom' && !label.trim()) {
      setError('Dê um nome a esta contagem personalizada (ex: "Antes da Época Festiva").');
      return;
    }

    const tally = tallyStockCountRows(allWorkingRows);
    if (tally.countedItems.length === 0) {
      setError('Introduza a quantidade física de pelo menos um produto antes de confirmar.');
      return;
    }
    for (const item of tally.countedItems) {
      if (item.costPrice < 0 || item.sellingPrice < 0) {
        setError(`Introduza um preço válido para "${item.productName}".`);
        return;
      }
    }

    setPendingTally(tally);
  };

  // Step 2 of 2: the operator has seen "N contados / M não contados"
  // and explicitly confirmed — now it actually saves.
  const handleConfirmSave = async () => {
    if (!pendingTally) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await recordStockCount({
        type,
        label: type === 'custom' ? label.trim() : undefined,
        date,
        items: pendingTally.countedItems.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
        })),
        expectedValueAtCount: expectedCurrentStockValue,
      });
      setSavedTotal(saved.totalValue);
      setSavedTally(pendingTally);
      setSavedMessage(`Contagem ${TYPE_LABELS[type]} registada com sucesso!`);
      setPendingTally(null);
      setTimeout(() => onComplete(), 2200);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar a contagem de stock.');
      setPendingTally(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h2 className="type-title">{savedMessage}</h2>
        <p className="text-sm text-gray-500">
          Valor Físico Total (a custo):{' '}
          <span className="font-display font-semibold text-[#0B1F3A] tabular-nums">
            {formatCurrency(savedTotal, currencySymbol)}
          </span>
        </p>
        {savedTally && (
          <p className="text-xs text-gray-400">
            {savedTally.countedItems.length} produtos contados
            {savedTally.notCountedProductNames.length > 0
              ? ` · ${savedTally.notCountedProductNames.length} não contados`
              : ''}
          </p>
        )}
      </div>
    );
  }

  // Mandatory Counted/Not Counted confirmation (Amendment Part 9) —
  // shown after "Confirmar Contagem" and before anything is actually
  // persisted.
  if (pendingTally) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-5">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
              <ClipboardList className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="type-title">Confirmar Contagem</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Reveja antes de guardar — esta contagem é uma fotografia do que existe fisicamente agora.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 text-center">
              <p className="font-display font-semibold text-2xl text-emerald-700 tabular-nums">{pendingTally.countedItems.length}</p>
              <p className="text-[11px] font-semibold text-emerald-700/80 mt-0.5">Produtos Contados</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3.5 text-center">
              <p className="font-display font-semibold text-2xl text-amber-700 tabular-nums">{pendingTally.notCountedProductNames.length}</p>
              <p className="text-[11px] font-semibold text-amber-700/80 mt-0.5">Produtos Não Contados</p>
            </div>
          </div>

          {pendingTally.notCountedProductNames.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-amber-800">
                Esta será uma contagem <strong>parcial</strong>. Os produtos não contados não entram no total nem
                recebem quantidade zero — não presuma que ficaram sem stock.
              </p>
            </div>
          )}

          <div className="rounded-xl bg-[var(--muted)] border border-[#E5E7EB] divide-y divide-[#E5E7EB] max-h-64 overflow-y-auto">
            {pendingTally.countedItems.map((item) => (
              <div key={item.productName} className="flex items-center justify-between gap-2 px-4 py-2 text-[12.5px]">
                <span className="text-[#111827] font-medium truncate">{item.productName}</span>
                <span className="text-gray-500 tabular-nums shrink-0">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>

          <div className="card-dark-gradient rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
            <span className="font-semibold text-white/70 text-[13px]">Valor Total da Contagem</span>
            <span className="font-display font-semibold text-[22px] text-[#D4AF37] tabular-nums leading-none">
              {formatCurrency(pendingTally.totalPurchaseValue, currencySymbol)}
            </span>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPendingTally(null)}
              disabled={isSaving}
              className="btn-secondary flex-1 py-3 px-4 text-sm disabled:opacity-60"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="btn-primary flex-1 py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isSaving ? 'A guardar...' : 'Confirmar Contagem'}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Shared field treatment — identical to Initial Stock Count so the two
  // counting screens read as one consistent system.
  const fieldClass =
    'w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 ' +
    'transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20';
  const fieldLabelClass = 'block type-label mb-1';
  const rowGridClass = 'grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_84px_76px_112px_112px_120px_28px] gap-x-2.5 gap-y-2.5 sm:items-end';

  if (subscriptionBlocksNewRecords) {
    return <SubscriptionBlockedNotice />;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <ClipboardList className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="type-title">Contagem de Stock Periódica</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Registe uma nova contagem física para acompanhar a evolução do seu capital.
            </p>
          </div>
        </div>

        {!hasInitialStockCount && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-2.5 text-xs text-gray-700">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
            <p className="leading-relaxed">
              Ainda não definiu o <strong className="text-[#111827] font-semibold">Capital Inicial</strong>. Esta contagem será guardada, mas recomendamos
              registar primeiro o Capital Inicial no Painel para poder comparar corretamente o crescimento do negócio.
            </p>
          </div>
        )}

        <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
          <p className="text-[12px] leading-relaxed text-gray-600">
            Esta contagem regista o que existe fisicamente em stock agora. Será comparada com o{' '}
            <strong className="text-[#111827] font-semibold">Valor Esperado de Stock</strong> — o Capital Inicial mais o
            valor (a custo) do stock em lote atualmente registado — para mostrar se o valor do seu inventário
            corresponde ao que o sistema esperava.
          </p>
        </div>

        {productsError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-rose-700">
                Não foi possível carregar os produtos. Isto não significa que o seu catálogo esteja vazio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-rose-700 hover:text-rose-900"
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={2.25} />
              Tentar novamente
            </button>
          </div>
        )}

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRequestConfirmation} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-w-2xl">
            <div>
              <label className={fieldLabelClass}>Tipo de Contagem</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as StockCountType)}
                className={`${fieldClass} font-semibold`}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={fieldLabelClass}>Data da Contagem</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${fieldClass} font-mono tabular-nums`}
              />
            </div>

            {type === 'custom' && (
              <div className="col-span-2 sm:col-span-1">
                <label className={fieldLabelClass}>Nome da Contagem</label>
                <input
                  type="text"
                  placeholder="Ex: Antes do Natal"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {/* Catalog-populated product grid — Amendment Part 7/11 */}
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12.5px] font-bold text-[#111827]">
                Produtos do Catálogo
                <span className="text-gray-400 font-normal ml-1.5">({visibleCatalogEntries.length})</span>
              </p>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2.25} />
                <input
                  type="text"
                  placeholder="Pesquisar produto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>

            {products.length === 0 && !productsError && (
              <p className="text-[12px] text-gray-400 italic mt-3">
                Ainda não tem produtos no catálogo. Adicione um manualmente abaixo.
              </p>
            )}

            {visibleCatalogEntries.length > 0 && (
              <>
                <div className={`hidden sm:grid ${rowGridClass.replace('sm:items-end', '')} pb-2 mb-1 mt-3 border-b border-[#E5E7EB]`}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Nome</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Qtd</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Unid</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Compra/Un</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Venda/Un</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Valor</span>
                  <span />
                </div>

                <div className="space-y-1">
                  {visibleCatalogEntries.map(([productId, row]) => {
                    const isBlank = row.quantity.trim() === '';
                    const q = isBlank ? 0 : Number(row.quantity) || 0;
                    const c = Number(row.costPrice) || 0;
                    return (
                      <div
                        key={productId}
                        className={`group ${rowGridClass} rounded-xl px-2.5 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]`}
                      >
                        <div className="col-span-2 sm:col-span-1 flex items-center">
                          <span className="text-[13px] font-semibold text-[#111827] truncate">{row.productName}</span>
                        </div>

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Qtd</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ainda não contado"
                            value={row.quantity}
                            onChange={(e) => updateCatalogRow(productId, { quantity: e.target.value })}
                            className={`${fieldClass} font-mono tabular-nums ${isBlank ? 'placeholder:text-amber-500/70' : ''}`}
                          />
                        </div>

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Unid</label>
                          <input
                            type="text"
                            placeholder="un"
                            value={row.unit}
                            onChange={(e) => updateCatalogRow(productId, { unit: e.target.value })}
                            className={`${fieldClass} font-mono text-center`}
                          />
                        </div>

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Compra/Un ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.costPrice}
                            onChange={(e) => updateCatalogRow(productId, { costPrice: e.target.value })}
                            className={`${fieldClass} font-mono tabular-nums`}
                          />
                        </div>

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Venda/Un ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.sellingPrice}
                            onChange={(e) => updateCatalogRow(productId, { sellingPrice: e.target.value })}
                            className={`${fieldClass} font-mono tabular-nums`}
                          />
                        </div>

                        <div className="flex items-end gap-1.5">
                          <div className="flex-1 min-w-0">
                            <label className={`${fieldLabelClass} sm:hidden`}>Valor</label>
                            <div
                              className={`w-full rounded-[10px] px-2.5 py-2 text-[13px] type-number tabular-nums truncate ${
                                isBlank ? 'bg-amber-50 text-amber-600' : 'bg-[#0B1F3A]/[0.04] text-[#0B1F3A]'
                              }`}
                            >
                              {isBlank ? 'Não contado' : formatCurrency(q * c, currencySymbol)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCatalogRow(productId)}
                            aria-label={`Remover ${row.productName}`}
                            className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {removedCatalogEntries.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-400 mr-1">Removidos desta contagem:</span>
                {removedCatalogEntries.map(([productId, row]) => (
                  <button
                    key={productId}
                    type="button"
                    onClick={() => handleRestoreCatalogRow(productId)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-1 transition-colors duration-150"
                  >
                    {row.productName}
                    <RotateCw className="w-2.5 h-2.5" strokeWidth={2.5} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual additions — products not yet in the catalog (Amendment Part 13) */}
          {manualRows.length > 0 && (
            <div>
              <p className="text-[12.5px] font-bold text-[#111827] mb-2">Adicionados Manualmente</p>
              <div className="space-y-1">
                {manualRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`group ${rowGridClass} rounded-xl px-2.5 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]`}
                  >
                    <div className="col-span-2 sm:col-span-1">
                      <label className={`${fieldLabelClass} sm:hidden`}>Nome</label>
                      <input
                        type="text"
                        placeholder="Ex: Arroz"
                        value={row.productName}
                        onChange={(e) => updateManualRow(idx, { productName: e.target.value })}
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label className={`${fieldLabelClass} sm:hidden`}>Qtd</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ainda não contado"
                        value={row.quantity}
                        onChange={(e) => updateManualRow(idx, { quantity: e.target.value })}
                        className={`${fieldClass} font-mono tabular-nums`}
                      />
                    </div>

                    <div>
                      <label className={`${fieldLabelClass} sm:hidden`}>Unid</label>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => updateManualRow(idx, { unit: e.target.value })}
                        className={`${fieldClass} font-mono text-center`}
                      />
                    </div>

                    <div>
                      <label className={`${fieldLabelClass} sm:hidden`}>Compra/Un ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.costPrice}
                        onChange={(e) => updateManualRow(idx, { costPrice: e.target.value })}
                        className={`${fieldClass} font-mono tabular-nums`}
                      />
                    </div>

                    <div>
                      <label className={`${fieldLabelClass} sm:hidden`}>Venda/Un ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.sellingPrice}
                        onChange={(e) => updateManualRow(idx, { sellingPrice: e.target.value })}
                        className={`${fieldClass} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="flex items-end gap-1.5">
                      <div className="flex-1 min-w-0">
                        <label className={`${fieldLabelClass} sm:hidden`}>Valor</label>
                        <div className="w-full bg-[#0B1F3A]/[0.04] rounded-[10px] px-2.5 py-2 text-[#0B1F3A] text-[13px] type-number tabular-nums truncate">
                          {row.quantity.trim() === ''
                            ? 'Não contado'
                            : formatCurrency((Number(row.quantity) || 0) * (Number(row.costPrice) || 0), currencySymbol)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveManualRow(idx)}
                        aria-label={`Remover produto ${idx + 1}`}
                        className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddManualRow}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[12.5px] transition-all duration-150 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
            <span>Adicionar produto que não está no catálogo</span>
          </button>

          {/* Total + comparison — hero serif figure, comparison line below a
              thin divider so both fit within the same navy surface. */}
          <div className="card-dark-gradient rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-white/70 text-[13px]">Valor Físico Contado até Agora</span>
              <span className="font-display font-semibold text-[22px] sm:text-[24px] text-[#D4AF37] tabular-nums leading-none">
                {formatCurrency(liveTally.totalPurchaseValue, currencySymbol)}
              </span>
            </div>

            {/* [Amendment v1.0] Shown whenever there's a meaningful baseline to
                compare against — i.e. Expected Current Stock Value is nonzero
                (Initial Capital confirmed, or batches already exist). This
                remains the one, aggregate, whole-business exception BDR-0009
                Part 5 explicitly permits — never decomposed per product. */}
            {comparisonBaseline > 0 && (
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                <span className="text-white/50">
                  vs. Valor Esperado ({formatCurrency(comparisonBaseline, currencySymbol)})
                </span>
                <span
                  className={`type-number tabular-nums flex items-center gap-1 ${
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-white/50'
                  }`}
                >
                  {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {diff >= 0 ? '+' : ''}
                  {formatCurrency(diff, currencySymbol)} ({diffPct >= 0 ? '+' : ''}
                  {diffPct.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>Rever e Confirmar Contagem {TYPE_LABELS[type]}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </form>
      </div>

      {/* History */}
      {pastCounts.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-gray-400" strokeWidth={2.25} />
              <span className="font-bold text-sm text-[#111827]">Histórico de Contagens ({pastCounts.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-1">
              {pastCounts.map((count) => (
                <div
                  key={count.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827]">
                      {count.label || TYPE_LABELS[count.type]}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(count.date)} · {count.items.length} produtos</p>
                  </div>
                  <div className="text-right">
                    <span className="type-number text-sm text-[#111827] tabular-nums block">
                      {formatCurrency(count.totalValue, currencySymbol)}
                    </span>
                    {/* [Amendment v1.0, Part 5] Historical snapshot — only
                        present on counts recorded after this amendment;
                        never recalculated from the live formula. */}
                    {typeof count.expectedValueAtCount === 'number' && (
                      <span className="text-[10px] text-gray-400 tabular-nums block mt-0.5">
                        vs. {formatCurrency(count.expectedValueAtCount, currencySymbol)} esperado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
