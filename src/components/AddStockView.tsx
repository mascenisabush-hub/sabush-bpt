import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { PackagePlus, CheckCircle2, ArrowRight, Tag, Plus, Trash2, Search, Sparkles, Info, X } from 'lucide-react';
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
          const latest = productBatches[productBatches.length - 1];
          initialCost = String(latest.costPrice);
          initialSell = String(latest.sellingPrice);
          if (latest.unit) initialUnit = latest.unit;
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
        const latest = productBatches[productBatches.length - 1];
        newCost = String(latest.costPrice);
        newSell = String(latest.sellingPrice);
        if (latest.unit) newUnit = latest.unit;
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
        alert(`Por favor introduza o nome do produto no Lote #${i + 1}.`);
        return;
      }

      if (numQty <= 0) {
        alert(`Por favor introduza uma quantidade maior que zero no Lote #${i + 1} (${trimmedName}).`);
        return;
      }

      if (numCost < 0 || numSell < 0) {
        alert(`Por favor introduza preços válidos no Lote #${i + 1} (${trimmedName}).`);
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

    // Call multi-batch handler
    addMultipleStockBatches(itemsToSave);

    const messageText =
      itemsToSave.length === 1
        ? `Lote de stock para "${itemsToSave[0].productName}" adicionado com sucesso!`
        : `${itemsToSave.length} lotes de stock adicionados com sucesso!`;

    setSubmittedMessage(messageText);

    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  // Calculate totals across all rows
  const totals = rows.reduce(
    (acc, row) => {
      const q = parseFloat(row.quantity) || 0;
      const c = parseFloat(row.costPrice) || 0;
      const s = parseFloat(row.sellingPrice) || 0;
      const cost = q * c;
      const revenue = q * s;
      return {
        totalCost: acc.totalCost + cost,
        totalRevenue: acc.totalRevenue + revenue,
        totalProfit: acc.totalProfit + (revenue - cost),
      };
    },
    { totalCost: 0, totalRevenue: 0, totalProfit: 0 }
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl space-y-4">
        {/* Title Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">Entrada Rápida de Stock</h2>
              <p className="text-[11px] text-slate-400">
                Registe vários produtos numa única sessão. Os lotes anteriores serão fechados automaticamente.
              </p>
            </div>
          </div>
        </div>

        {submittedMessage ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Stock Guardado com Sucesso!</h3>
            <p className="text-sm text-emerald-300 max-w-md mx-auto">{submittedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* COMPACT TABLE */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              {/* Table Header (Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-1.5 items-center px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-1 text-center">Lote</div>
                <div className="col-span-3">Produto</div>
                <div className="col-span-2">Data Entrada</div>
                <div className="col-span-1 text-right">Qtd</div>
                <div className="col-span-1 text-center">Unid</div>
                <div className="col-span-1.5 text-right">Compra</div>
                <div className="col-span-1.5 text-right">Venda</div>
                {!isStaff ? (
                  <div className="col-span-1 text-right">Lucro Est.</div>
                ) : (
                  <div className="col-span-1 text-right">Ação</div>
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
                      className={`p-1.5 sm:p-2 transition group ${
                        index % 2 === 1 ? 'bg-slate-900/40' : 'bg-transparent'
                      } hover:bg-slate-800/60`}
                    >
                      {/* Desktop Grid Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center text-xs">
                        {/* Lote # */}
                        <div className="col-span-1 text-center">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Produto Autocomplete */}
                        <div className="col-span-3 relative">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="Pesquisar/criar produto..."
                              value={row.productName}
                              onFocus={() => updateRow(row.id, { isDropdownOpen: true })}
                              onChange={e =>
                                updateRow(row.id, {
                                  productName: e.target.value,
                                  isDropdownOpen: true,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium pr-7"
                            />
                            <Search className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Autocomplete Dropdown Popup */}
                          {row.isDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => updateRow(row.id, { isDropdownOpen: false })}
                              />
                              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-800">
                                {filteredProducts.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProductForTool(row.id, p.name)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-800 transition flex items-center justify-between text-xs text-slate-200"
                                  >
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                      Existente
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
                                    className="w-full text-left px-3 py-2 hover:bg-emerald-950/80 transition flex items-center space-x-2 text-xs text-emerald-400 font-semibold"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>+ Criar novo produto "{row.productName.trim()}"</span>
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs text-right focus:outline-none focus:border-emerald-500 font-mono"
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
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1.5 text-slate-200 text-xs text-center focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.id, { isUnitPopoverOpen: !row.isUnitPopoverOpen })
                              }
                              title="Sugestões de unidades"
                              className="p-1 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 rounded-md hover:border-slate-700 transition shrink-0"
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
                              <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-2 z-30 w-36 space-y-1">
                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                                  Unidades:
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
                                      className={`text-[10px] px-2 py-1 rounded border font-mono transition ${
                                        row.unit.toLowerCase() === u.toLowerCase()
                                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs text-right focus:outline-none focus:border-emerald-500 font-mono"
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 text-xs text-right focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        {/* Lucro Estimado & Delete Button */}
                        <div className="col-span-1 flex items-center justify-end space-x-1.5">
                          {!isStaff && (
                            <span
                              className={`font-mono font-bold text-xs ${
                                rowProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                              title={`Lucro Total: ${formatCurrency(rowProfit, currencySymbol)}`}
                            >
                              {formatCurrency(rowProfit, currencySymbol)}
                            </span>
                          )}

                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                              title="Remover este lote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Compact Card/Row Layout (below md breakpoint) */}
                      <div className="md:hidden space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                            Lote #{index + 1}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-mono font-bold text-xs ${
                                rowProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              Lucro Est: {formatCurrency(rowProfit, currencySymbol)}
                            </span>
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2 relative">
                            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                              Produto
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Pesquisar/criar produto..."
                              value={row.productName}
                              onFocus={() => updateRow(row.id, { isDropdownOpen: true })}
                              onChange={e =>
                                updateRow(row.id, {
                                  productName: e.target.value,
                                  isDropdownOpen: true,
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs"
                            />
                            {row.isDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => updateRow(row.id, { isDropdownOpen: false })}
                                />
                                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-30 divide-y divide-slate-800">
                                  {filteredProducts.map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectProductForTool(row.id, p.name)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200"
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
                                      className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 font-semibold"
                                    >
                                      + Criar "{row.productName.trim()}"
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                              Data Entrada
                            </label>
                            <input
                              type="date"
                              required
                              value={row.dateEntered}
                              onChange={e => updateRow(row.id, { dateEntered: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono"
                            />
                          </div>

                          <div className="flex gap-1">
                            <div className="flex-1">
                              <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                                Qtd
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={row.quantity}
                                onChange={e => updateRow(row.id, { quantity: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono"
                              />
                            </div>
                            <div className="w-16">
                              <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                                Unid
                              </label>
                              <input
                                type="text"
                                required
                                value={row.unit}
                                onChange={e => updateRow(row.id, { unit: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-1 py-1 text-slate-200 text-xs text-center font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                              Custo ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.costPrice}
                              onChange={e => updateRow(row.id, { costPrice: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                              Venda ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.sellingPrice}
                              onChange={e => updateRow(row.id, { sellingPrice: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono"
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
              className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-slate-300 hover:text-emerald-300 font-bold text-xs transition flex items-center justify-center space-x-2 group"
            >
              <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>+ Adicionar outro produto</span>
            </button>

            {/* Combined Total Summary Bar */}
            {!isStaff && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-slate-200 font-sans">
                    Resumo ({rows.length} {rows.length === 1 ? 'lote' : 'lotes'})
                  </span>
                </div>

                <div className="flex items-center space-x-4 sm:space-x-6 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-sans uppercase text-[10px] mr-1">Custo Total:</span>
                    <span className="font-bold text-slate-200">
                      {formatCurrency(totals.totalCost, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-sans uppercase text-[10px] mr-1">Receita:</span>
                    <span className="font-bold text-slate-200">
                      {formatCurrency(totals.totalRevenue, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-sans uppercase text-[10px] mr-1">Lucro Projetado:</span>
                    <span
                      className={`font-bold ${
                        totals.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(totals.totalProfit, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Auto-closing Notice */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-2.5 flex items-start space-x-2 text-[11px] text-slate-300">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                Ao guardar, o lote ativo anterior de cada produto selecionado será automaticamente fechado.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 active:scale-[0.98]"
            >
              <span>
                Guardar {rows.length > 1 ? `${rows.length} Lotes` : 'Lote'} e Ativar Stock
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
