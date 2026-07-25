import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { X, Tag, Save, Info } from 'lucide-react';

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
  const { updateProduct, currencySymbol } = useApp();

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category || '');
  const [supplier, setSupplier] = useState(product.supplier || '');
  const [sku, setSku] = useState(product.sku || '');
  const [barcode, setBarcode] = useState(product.barcode || '');
  const [costPrice, setCostPrice] = useState(product.costPrice != null ? String(product.costPrice) : '');
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice != null ? String(product.sellingPrice) : '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Por favor introduza o nome do produto.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProduct(product.id, {
        name: trimmedName,
        category: category.trim() || undefined,
        supplier: supplier.trim() || undefined,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        costPrice: costPrice.trim() ? parseFloat(costPrice) : undefined,
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
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
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
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Fornecedor</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora XYZ"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
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
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Código de Barras</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                Preço de Custo ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                Preço de Venda ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-gray-700">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Este preço serve para consulta rápida e como sugestão ao adicionar stock. Lotes já registados mantêm
              sempre o preço com que foram comprados — nada aqui altera investimentos ou lucros já calculados.
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
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};
