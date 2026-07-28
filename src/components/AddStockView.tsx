import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { PackagePlus, CheckCircle2, ArrowRight, Tag, Plus, Trash2, Search, Sparkles, Info, X, Truck } from 'lucide-react';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';

interface AddStockViewProps {
  initialProductName?: string;
  onComplete: () => void;
}

interface StockRowItem {
  id: string;
  productName: string;
  dateEntered: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  isDropdownOpen?: boolean;
  isUnitPopoverOpen?: boolean;
}

export const AddStockView: React.FC<AddStockViewProps> = ({ initialProductName, onComplete }) => {
  const { products, batches, addMultipleStockBatches, currencySymbol, businessCategory, isStaff } = useApp();
  const { t } = useLanguage();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createEmptyRow = (productName: string = ''): StockRowItem => {
    let initialCost = '';
    let initialSell = '';
    let initialUnit = suggestedUnits[0] || 'un';

    if (productName) {
      const match = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
      if (match) {
        const productBatches = batches.filter(b => b.productId === match.id);
        if (productBatches.length > 0) {
          const latest = productBatches[0];
          initialCost = String(latest.costPrice);
          initialSell = String(latest.sellingPrice);
          if (latest.unit) initialUnit = latest.unit;
        } else if (match.costPrice != null || match.sellingPrice != null) {
          // No batches yet — fall back to the product's reference price
          // (set via "Editar Detalhes") instead of the generic defaults.
          if (match.costPrice != null) initialCost = String(match.costPrice);
          if (match.sellingPrice != null) initialSell = String(match.sellingPrice);
        }
      }
    }

    return {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      productName,
      dateEntered: getTodayDateString(),
      quantity: '50',
      unit: initialUnit,
      costPrice: initialCost || '1.50',
      sellingPrice: initialSell || '3.00',
      isDropdownOpen: false,
      isUnitPopoverOpen: false,
    };
  };

  const [rows, setRows] = useState<StockRowItem[]>(() => [createEmptyRow(initialProductName || '')]);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Supplier applies to the whole purchase (batch), not to individual
  // product rows — every item added in this session was bought from the
  // same supplier, on the same purchase event.
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // If initialProductName changes from prop
  useEffect(() => {
    if (initialProductName && rows.length === 1 && !rows[0].productName) {
      setRows([createEmptyRow(initialProductName)]);
    }
  }, [initialProductName]);

  const updateRow = (id: string, fields: Partial<StockRowItem>) => {
    setRows(prev =>
      prev.map(row => (row.id === id ? { ...row, ...fields } : row))
    );
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, createEmptyRow('')]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const handleSelectProductForTool = (rowId: string, name: string) => {
    const match = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    let newCost = '';
    let newSell = '';
    let newUnit = suggestedUnits[0] || 'un';

    if (match) {
      const productBatches = batches.filter(b => b.productId === match.id);
      if (productBatches.length > 0) {
        const latest = productBatches[0];
        newCost = String(latest.costPrice);
        newSell = String(latest.sellingPrice);
        if (latest.unit) newUnit = latest.unit;
      } else if (match.costPrice != null || match.sellingPrice != null) {
        if (match.costPrice != null) newCost = String(match.costPrice);
        if (match.sellingPrice != null) newSell = String(match.sellingPrice);
      }
    }

    updateRow(rowId, {
      productName: name,
      costPrice: newCost || undefined,
      sellingPrice: newSell || undefined,
      unit: newUnit || undefined,
      isDropdownOpen: false,
    });
  };

  // Submission validation and handling
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate rows
    const itemsToSave = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trimmedName = row.productName.trim();
      const numQty = parseFloat(row.quantity) || 0;
      const numCost = parseFloat(row.costPrice) || 0;
      const numSell = parseFloat(row.sellingPrice) || 0;

      if (!trimmedName) {
        alert(t('addStock.errors.missingName', { n: i + 1 }));
        return;
      }

      if (numQty <= 0) {
        alert(t('addStock.errors.invalidQty', { n: i + 1, name: trimmedName }));
        return;
      }

      if (numCost < 0 || numSell < 0) {
        alert(t('addStock.errors.invalidPrice', { n: i + 1, name: trimmedName }));
        return;
      }

      itemsToSave.push({
        productName: trimmedName,
        dateEntered: row.dateEntered,
        quantity: numQty,
        unit: row.unit || 'un',
        costPrice: numCost,
        sellingPrice: numSell,
      });
    }

    // Call multi-batch handler — everything in this session is grouped
    // into one Purchase Batch (Investment Ledger entry) under this supplier.
    addMultipleStockBatches(
      itemsToSave,
      { name: supplierName, phone: supplierPhone, notes: '' },
      batchNotes
    );

    const messageText =
      itemsToSave.length === 1
        ? t('addStock.successMessageSingle', { product: itemsToSave[0].productName })
        : t('addStock.successMessageMultiple', { count: itemsToSave.length });

    setSubmittedMessage(messageText);
    setSupplierName('');
    setSupplierPhone('');
    setBatchNotes('');

    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  // Calculate totals across all rows (new batches, so remainingQuantity == quantity — no quebras yet)
  const totals = rows.reduce(
    (acc, row) => {
      const q = parseFloat(row.quantity) || 0;
      const c = parseFloat(row.costPrice) || 0;
      const s = parseFloat(row.sellingPrice) || 0;
      const investmentValue = q * c;
      const marketValue = q * s;
      return {
        totalInvestmentValue: acc.totalInvestmentValue + investmentValue,
        totalMarketValue: acc.totalMarketValue + marketValue,
        totalEmbeddedProfit: acc.totalEmbeddedProfit + (marketValue - investmentValue),
      };
    },
    { totalInvestmentValue: 0, totalMarketValue: 0, totalEmbeddedProfit: 0 }
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-5">
        {/* Title Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <PackagePlus className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="type-title">{t('addStock.title')}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('addStock.subtitle')}
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('addStock.successTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* SUPPLIER (applies to this whole purchase / batch) */}
            <div className="bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0B1F3A]/60 shrink-0" strokeWidth={2.25} />
                <span className="text-[12.5px] font-bold text-[#111827]">{t('addStock.supplier.sectionTitle')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block type-label mb-1">
                    {t('addStock.supplier.nameLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('addStock.supplier.namePlaceholder')}
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
                <div>
                  <label className="block type-label mb-1">
                    {t('addStock.supplier.phoneLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('addStock.supplier.phonePlaceholder')}
                    value={supplierPhone}
                    onChange={e => setSupplierPhone(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
              </div>
              <div>
                <label className="block type-label mb-1">
                  {t('addStock.supplier.notesLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('addStock.supplier.notesPlaceholder')}
                  value={batchNotes}
                  onChange={e => setBatchNotes(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <p className="text-[10.5px] text-gray-400">
                {t('addStock.supplier.unspecifiedHint')}
              </p>
            </div>

            {/* COMPACT TABLE */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              {/* Table Header (Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-1.5 items-center px-3 py-2.5 bg-[#FAFBFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wide text-gray-400">
                <div className="col-span-1 text-center">{t('addStock.table.batch')}</div>
                <div className="col-span-3">{t('addStock.table.product')}</div>
                <div className="col-span-2">{t('addStock.table.dateEntered')}</div>
                <div className="col-span-1 text-right">{t('addStock.table.quantity')}</div>
                <div className="col-span-1 text-center">{t('addStock.table.unit')}</div>
                <div className="col-span-1.5 text-right">{t('addStock.table.buyPrice')}</div>
                <div className="col-span-1.5 text-right">{t('addStock.table.sellPrice')}</div>
                {!isStaff ? (
                  <div className="col-span-1 text-right">{t('addStock.table.estProfit')}</div>
                ) : (
                  <div className="col-span-1 text-right">{t('addStock.table.action')}</div>
                )}
              </div>

              {/* Table Body / Dense Rows - Flush with no horizontal dividers */}
              <div className="space-y-0">
                {rows.map((row, index) => {
                  const numQty = parseFloat(row.quantity) || 0;
                  const numCost = parseFloat(row.costPrice) || 0;
                  const numSell = parseFloat(row.sellingPrice) || 0;
                  const rowCost = numQty * numCost;
                  const rowRevenue = numQty * numSell;
                  const rowProfit = rowRevenue - rowCost;

                  // Filter existing products for autocomplete
                  const searchLower = row.productName.trim().toLowerCase();
                  const filteredProducts = products.filter(p =>
                    p.name.toLowerCase().includes(searchLower)
                  );
                  const exactMatchExists = products.some(
                    p => p.name.toLowerCase() === searchLower
                  );

                  return (
                    <div
                      key={row.id}
                      className={`p-2 sm:p-2.5 transition-colors duration-150 group ${
                        index % 2 === 1 ? 'bg-[#FAFBFC]/60' : 'bg-transparent'
                      } hover:bg-[#D4AF37]/[0.04]`}
                    >
                      {/* Desktop Grid Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center text-xs">
                        {/* Lote # */}
                        <div className="col-span-1 text-center">
                          <span className="text-[10px] type-number text-[#0B1F3A] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-1.5 py-0.5 rounded-md">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Produto Autocomplete */}
                        <div className="col-span-3 relative">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder={t('addStock.productSearchPlaceholder')}
                              value={row.productName}
                              onFocus={() => updateRow(row.id, { isDropdownOpen: true })}
                              onChange={e =>
                                updateRow(row.id, {
                                  productName: e.target.value,
                                  isDropdownOpen: true,
                                })
                              }
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-medium pr-7"
                            />
                            <Search className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Autocomplete Dropdown Popup */}
                          {row.isDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => updateRow(row.id, { isDropdownOpen: false })}
                              />
                              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] max-h-48 overflow-y-auto z-30 divide-y divide-[#F1F3F6]">
                                {filteredProducts.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProductForTool(row.id, p.name)}
                                    className="w-full text-left px-3 py-2 hover:bg-[#FAFBFC] transition-colors duration-150 flex items-center justify-between text-xs text-[#111827]"
                                  >
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="text-[10px] text-gray-400 bg-[#F5F7FA] px-2 py-0.5 rounded border border-[#E5E7EB]">
                                      {t('addStock.existingTag')}
                                    </span>
                                  </button>
                                ))}

                                {row.productName.trim() && !exactMatchExists && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateRow(row.id, {
                                        productName: row.productName.trim(),
                                        isDropdownOpen: false,
                                      })
                                    }
                                    className="w-full text-left px-3 py-2 hover:bg-[#D4AF37]/[0.06] transition-colors duration-150 flex items-center gap-2 text-xs text-[#B8952F] font-semibold"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{t('addStock.createNew', { name: row.productName.trim() })}</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Data Entrada */}
                        <div className="col-span-2">
                          <input
                            type="date"
                            required
                            value={row.dateEntered}
                            onChange={e => updateRow(row.id, { dateEntered: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                          />
                        </div>

                        {/* Quantidade */}
                        <div className="col-span-1">
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.quantity}
                            onChange={e => updateRow(row.id, { quantity: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs text-right transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                          />
                        </div>

                        {/* Unidade + Popover */}
                        <div className="col-span-1 relative">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              required
                              placeholder="un"
                              value={row.unit}
                              onChange={e => updateRow(row.id, { unit: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-1.5 py-2 text-[#111827] text-xs text-center transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.id, { isUnitPopoverOpen: !row.isUnitPopoverOpen })
                              }
                              title={t('addStock.unitSuggestionsTitle')}
                              className="p-1.5 text-gray-400 hover:text-[#0B1F3A] bg-white border border-[#E5E7EB] rounded-[8px] hover:border-gray-300 transition-colors duration-150 shrink-0"
                            >
                              <Tag className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Unit Popover */}
                          {row.isUnitPopoverOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => updateRow(row.id, { isUnitPopoverOpen: false })}
                              />
                              <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] p-2.5 z-30 w-36 space-y-1.5">
                                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">
                                  {t('addStock.unitSuggestionsLabel')}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {suggestedUnits.map(u => (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={() =>
                                        updateRow(row.id, {
                                          unit: u,
                                          isUnitPopoverOpen: false,
                                        })
                                      }
                                      className={`text-[10px] px-2 py-1 rounded-md border font-mono transition-colors duration-150 ${
                                        row.unit.toLowerCase() === u.toLowerCase()
                                          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#B8952F] font-bold'
                                          : 'bg-white border-[#E5E7EB] text-gray-500 hover:text-[#111827] hover:border-gray-300'
                                      }`}
                                    >
                                      {u}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Preço Compra */}
                        <div className="col-span-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={row.costPrice}
                            onChange={e => updateRow(row.id, { costPrice: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs text-right transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                          />
                        </div>

                        {/* Preço Venda */}
                        <div className="col-span-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={row.sellingPrice}
                            onChange={e => updateRow(row.id, { sellingPrice: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs text-right transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                          />
                        </div>

                        {/* Lucro Estimado & Delete Button */}
                        <div className="col-span-1 flex items-center justify-end gap-1.5">
                          {!isStaff && (
                            <span
                              className={`type-number text-xs tabular-nums ${
                                rowProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                              title={t('addStock.totalProfitTitle', { value: formatCurrency(rowProfit, currencySymbol) })}
                            >
                              {formatCurrency(rowProfit, currencySymbol)}
                            </span>
                          )}

                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all duration-150"
                              title={t('addStock.removeBatch')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Compact Card/Row Layout (below md breakpoint) */}
                      <div className="md:hidden space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                          <span className="text-[10px] type-number text-[#0B1F3A] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-1.5 py-0.5 rounded-md">
                            {t('addStock.table.batch')} #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`type-number text-xs tabular-nums ${
                                rowProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {t('addStock.estProfitMobile', { value: formatCurrency(rowProfit, currencySymbol) })}
                            </span>
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors duration-150"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="col-span-2 relative">
                            <label className="block type-label mb-1">
                              {t('addStock.table.product')}
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={t('addStock.productSearchPlaceholder')}
                              value={row.productName}
                              onFocus={() => updateRow(row.id, { isDropdownOpen: true })}
                              onChange={e =>
                                updateRow(row.id, {
                                  productName: e.target.value,
                                  isDropdownOpen: true,
                                })
                              }
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                            />
                            {row.isDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => updateRow(row.id, { isDropdownOpen: false })}
                                />
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] max-h-40 overflow-y-auto z-30 divide-y divide-[#F1F3F6]">
                                  {filteredProducts.map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectProductForTool(row.id, p.name)}
                                      className="w-full text-left px-3 py-2 text-xs text-[#111827] hover:bg-[#FAFBFC] transition-colors duration-150"
                                    >
                                      {p.name}
                                    </button>
                                  ))}
                                  {row.productName.trim() && !exactMatchExists && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateRow(row.id, {
                                          productName: row.productName.trim(),
                                          isDropdownOpen: false,
                                        })
                                      }
                                      className="w-full text-left px-3 py-2 text-xs text-[#B8952F] font-semibold hover:bg-[#D4AF37]/[0.06] transition-colors duration-150"
                                    >
                                      {t('addStock.createNewShort', { name: row.productName.trim() })}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div>
                            <label className="block type-label mb-1">
                              {t('addStock.table.dateEntered')}
                            </label>
                            <input
                              type="date"
                              required
                              value={row.dateEntered}
                              onChange={e => updateRow(row.id, { dateEntered: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                            />
                          </div>

                          <div className="flex gap-1.5">
                            <div className="flex-1">
                              <label className="block type-label mb-1">
                                {t('addStock.table.quantity')}
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={row.quantity}
                                onChange={e => updateRow(row.id, { quantity: e.target.value })}
                                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                              />
                            </div>
                            <div className="w-16">
                              <label className="block type-label mb-1">
                                {t('addStock.table.unit')}
                              </label>
                              <input
                                type="text"
                                required
                                value={row.unit}
                                onChange={e => updateRow(row.id, { unit: e.target.value })}
                                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-1 py-2 text-[#111827] text-xs text-center transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block type-label mb-1">
                              {t('addStock.fields.costPrice', { symbol: currencySymbol })}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.costPrice}
                              onChange={e => updateRow(row.id, { costPrice: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="block type-label mb-1">
                              {t('addStock.fields.sellPrice', { symbol: currencySymbol })}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.sellingPrice}
                              onChange={e => updateRow(row.id, { sellingPrice: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action to Add Another Product Row */}
            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[12.5px] transition-all duration-150 flex items-center justify-center gap-2 group"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
              <span>{t('addStock.addAnotherProduct')}</span>
            </button>

            {/* Combined Total Summary Bar */}
            {!isStaff && (
              <div className="bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B8952F] shrink-0" strokeWidth={2.25} />
                  <span className="font-bold text-[#111827] text-[12.5px]">
                    {rows.length === 1
                      ? t('addStock.summary.titleOne', { count: rows.length })
                      : t('addStock.summary.titleOther', { count: rows.length })}
                  </span>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 text-[11px]">
                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.totalInvestment')}</span>
                    <span className="font-bold text-[#111827] font-mono tabular-nums">
                      {formatCurrency(totals.totalInvestmentValue, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.marketValue')}</span>
                    <span className="font-bold text-[#111827] font-mono tabular-nums">
                      {formatCurrency(totals.totalMarketValue, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.embeddedProfit')}</span>
                    <span
                      className={`type-number tabular-nums ${
                        totals.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(totals.totalEmbeddedProfit, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Auto-closing Notice */}
            <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-start gap-2.5">
              <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[11.5px] leading-relaxed text-gray-600">
                {t('addStock.autoCloseNotice')}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full py-3 px-4 text-sm"
            >
              <span>
                {rows.length > 1
                  ? t('addStock.submitMultiple', { count: rows.length })
                  : t('addStock.submitOne')}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
