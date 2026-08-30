import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { X, Tag, Save, Info } from 'lucide-react';
import { findLatestRememberedProductMemory } from '../lib/productMemoryPriceResolution';
import { isValidUnitRelationship } from '../lib/unitRelationship';
import { getConversionFactor } from '../lib/purchaseToSellingConversion';
import { findMostRecentBatchForProduct } from '../lib/restockObservation';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
}

// ============================================================
// Edits catalog metadata only: name, category, supplier, SKU,
// barcode, and a REFERENCE cost/selling price. This never creates or
// touches a StockBatch, and never affects Investment/Market/Profit
// calculations — those always come from the actual batches (see
// calculations.ts). This is purely so the owner can look up or
// correct a product's listed price when the market changes, without
// having to log a new stock entry.
// ============================================================
export const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose }) => {
  const { updateProduct, currencySymbol, batches, stockCounts } = useApp();

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category || '');
  const [supplier, setSupplier] = useState(product.supplier || '');
  const [sku, setSku] = useState(product.sku || '');
  const [barcode, setBarcode] = useState(product.barcode || '');
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice != null ? String(product.sellingPrice) : '');
  const [isSaving, setIsSaving] = useState(false);

  // [§45 Amendment FR-88; Implementation Authorization §2 item 8]
  // Read-only Cost/Cost Unit/Selling Unit resolution, mirroring
  // DashboardView.tsx's own identical catalog-row resolution: Cost
  // prefers Product.costPrice (§45 §11, purchase-workflow-owned),
  // falling back to the latest batch's own cost — never fabricated.
  // Selling Unit comes from the confirmed unitRelationship.sellingUnit
  // when present, else findLatestRememberedProductMemory's own
  // returned unit (for a product predating this feature), else the
  // latest batch's own unit. Cost Unit has no dedicated Product field
  // (the Plan's own smallest-change decision) — always the latest
  // batch's own unit.
  const latestBatch = findMostRecentBatchForProduct(batches, product.id);
  const confirmedSellingUnit = isValidUnitRelationship(product.unitRelationship) ? product.unitRelationship?.sellingUnit : undefined;
  const rememberedMemory =
    product.sellingPrice == null ? findLatestRememberedProductMemory(product.id, product.name, batches, stockCounts, confirmedSellingUnit) : null;
  const costPriceDisplay = product.costPrice != null ? product.costPrice : latestBatch?.costPrice;
  const costUnitDisplay = latestBatch?.unit;
  const sellingUnitDisplay = confirmedSellingUnit || rememberedMemory?.unit || latestBatch?.unit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Por favor introduza o nome do produto.');
      return;
    }

    setIsSaving(true);
    try {
      // [§45 Amendment FR-88; Implementation Authorization §2 item 8]
      // costPrice is deliberately never sent from this form — Cost/Cost
      // Unit are purchase-workflow-owned (Add Stock/Smart Stock Entry,
      // §45 §11) and read-only from the Product Catalog. Editing here
      // updates the SAME Product.sellingPrice memory §45's Contagem-side
      // write path (recordStockCount) establishes and governs — the
      // same authority, reached through a second entry point, per
      // FR-88 exactly.
      await updateProduct(product.id, {
        name: trimmedName,
        category: category.trim() || undefined,
        supplier: supplier.trim() || undefined,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        sellingPrice: sellingPrice.trim() ? parseFloat(sellingPrice) : undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-gray-900 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Editar Produto
            </h2>
            <p className="text-xs text-gray-500">Dados do catálogo — não altera lotes existentes</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3.5">
          <div>
            <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Nome do Produto</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Categoria</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Bebidas"
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Fornecedor</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora XYZ"
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Código de Barras</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                Custo{costUnitDisplay ? ` (${currencySymbol}/${costUnitDisplay})` : ` (${currencySymbol})`}
              </label>
              <div className="w-full bg-gray-50 border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-700 font-mono">
                {costPriceDisplay != null ? costPriceDisplay.toFixed(2) : '—'}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                Preço de Venda{sellingUnitDisplay ? ` (${currencySymbol}/${sellingUnitDisplay})` : ` (${currencySymbol})`}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          {isValidUnitRelationship(product.unitRelationship) && product.unitRelationship!.units.length > 1 && (
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Relação de Unidades</label>
              <p className="text-sm text-gray-700 font-mono">
                1 {product.unitRelationship!.units[0].unit}
                {product.unitRelationship!.units.slice(1).map((u, i) => {
                  const factor = getConversionFactor(product.unitRelationship!, product.unitRelationship!.units[0].unit, u.unit);
                  return (
                    <span key={i}>
                      {' '}= {factor ?? '?'} {u.unit}
                    </span>
                  );
                })}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-gray-700">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p>
              O Custo vem da última compra registada (Add Stock / Smart Stock Entry) e não pode ser editado aqui. O
              Preço de Venda é a memória estabelecida na Contagem — edite-o aqui quando o preço real mudar; a
              alteração nunca afeta o custo registado.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};
