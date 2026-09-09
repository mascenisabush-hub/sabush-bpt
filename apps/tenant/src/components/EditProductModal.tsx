import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { X, Tag, Save } from 'lucide-react';
import { findLatestRememberedProductMemory } from '../lib/productMemoryPriceResolution';
import { isValidUnitRelationship, type UnitRelationshipProposal } from '../lib/unitRelationship';
import { InfoHint } from './InfoHint';
import { findMostRecentBatchForProduct } from '../lib/restockObservation';
// [Bug fix — "digits typed are hidden" on decimal entry] See this
// function's own header comment (decimalInputSanitizer.ts) for the
// full root-cause explanation — reused unmodified from the identical
// fix already applied elsewhere in this app.
import { sanitizeDecimalInput } from '../lib/decimalInputSanitizer';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
}

// [Product Catalog Phase 2 — Checkpoint 2, Specification §11] Pure,
// module-level helper — whether a candidate unit-relationship (rows +
// sellingUnit, as entered in this form) is structurally identical to
// the product's current confirmed relationship. Used only to decide
// whether confirmProductUnitRelationship needs to be called at all —
// "unchanged relationship: no write occurs" (Implementation Plan §M).
// An empty candidate against a valid current relationship is NOT
// treated as equal — see handleSubmit's own comment for why clearing
// the rows is deliberately a no-op, never a silent deletion.
function unitRelationshipCandidateEqualsCurrent(
  current: Product['unitRelationship'],
  units: { unit: string; factorFromPrevious: number }[],
  sellingUnit: string
): boolean {
  if (!isValidUnitRelationship(current) || !current) return units.length === 0;
  if (current.units.length !== units.length) return false;
  for (let i = 0; i < units.length; i++) {
    if (current.units[i].unit.trim().toLowerCase() !== units[i].unit.trim().toLowerCase()) return false;
    if (i > 0 && current.units[i].factorFromPrevious !== units[i].factorFromPrevious) return false;
  }
  const currentSellingUnit = (current.sellingUnit || '').trim().toLowerCase();
  const candidateSellingUnit = (sellingUnit || '').trim().toLowerCase();
  return currentSellingUnit === candidateSellingUnit;
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
  const { updateProduct, confirmProductUnitRelationship, currencySymbol, batches, stockCounts } = useApp();

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category || '');
  const [supplier, setSupplier] = useState(product.supplier || '');
  const [sku, setSku] = useState(product.sku || '');
  const [barcode, setBarcode] = useState(product.barcode || '');
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice != null ? String(product.sellingPrice) : '');
  const [isSaving, setIsSaving] = useState(false);

  // [Product Catalog Phase 2 — Checkpoint 2, Specification §6] New —
  // editable unit-relationship state, prefilled from the product's own
  // already-confirmed relationship (if valid), or a single empty row
  // if the product has none yet. Editing (not merely displaying) this
  // is exactly what Checkpoint 2 authorizes for Catálogo (Plan §H) —
  // routed through the Checkpoint-1-extended confirmProductUnitRelationship
  // on submit, never a second, parallel confirmation mechanism.
  const [unitRows, setUnitRows] = useState<{ unit: string; factorFromPrevious: string }[]>(
    isValidUnitRelationship(product.unitRelationship) && product.unitRelationship
      ? product.unitRelationship.units.map((u, i) => ({ unit: u.unit, factorFromPrevious: i === 0 ? '1' : String(u.factorFromPrevious) }))
      : [{ unit: '', factorFromPrevious: '1' }]
  );
  const [sellingUnit, setSellingUnit] = useState(
    isValidUnitRelationship(product.unitRelationship) ? product.unitRelationship?.sellingUnit || '' : ''
  );
  const [unitRelationshipError, setUnitRelationshipError] = useState<string | null>(null);

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

    // [Product Catalog Phase 2 — Checkpoint 2, Specification §11]
    // Factor validation for any level beyond the top-level/default
    // unit — mirrors isValidUnitRelationship's own finite/positive
    // check, surfaced here as a clear client-side error before any
    // write is attempted.
    const filledUnitRows = unitRows.filter((r) => r.unit.trim());
    const candidateUnits = filledUnitRows.map((r, i) => ({
      unit: r.unit.trim(),
      factorFromPrevious: i === 0 ? 1 : parseFloat(r.factorFromPrevious),
    }));
    for (let i = 1; i < candidateUnits.length; i++) {
      if (!Number.isFinite(candidateUnits[i].factorFromPrevious) || candidateUnits[i].factorFromPrevious <= 0) {
        setUnitRelationshipError('Introduza um fator de conversão válido (maior que zero) para cada nível.');
        return;
      }
    }

    const trimmedSellingPrice = sellingPrice.trim();
    if (trimmedSellingPrice !== '') {
      const parsedSellingPrice = parseFloat(trimmedSellingPrice);
      if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
        alert('O preço de venda deve ser um valor válido.');
        return;
      }
    }

    // [Product Catalog Phase 2 — Checkpoint 2, Specification §6/§10,
    // Implementation Authorization §3.2(B)] Determine the sellingUnit
    // that will actually be in effect once this submit completes —
    // either the newly-confirmed candidate's own sellingUnit (only
    // when the relationship is actually about to be written) or the
    // product's already-confirmed one (when the relationship is left
    // untouched) — and refuse the entire submit, before any write, if
    // a non-null sellingPrice would end up paired with an absent or
    // invalid sellingUnit. Validation-before-write, matching the
    // accepted Implementation Plan §L exactly. [Not an authorized
    // capability of this checkpoint: clearing an existing confirmed
    // relationship entirely — if the owner empties every unit row, the
    // relationship write is simply skipped (below), leaving the
    // existing confirmed relationship exactly as it was, never
    // silently discarded (Decision 1; Authorization §3.2(C)).]
    const relationshipChanged = !unitRelationshipCandidateEqualsCurrent(product.unitRelationship, candidateUnits, sellingUnit);
    const willWriteRelationship = relationshipChanged && candidateUnits.length > 0;
    const effectiveSellingUnit = willWriteRelationship
      ? candidateUnits.some((u) => u.unit.trim().toLowerCase() === sellingUnit.trim().toLowerCase())
        ? sellingUnit.trim()
        : undefined
      : isValidUnitRelationship(product.unitRelationship)
        ? product.unitRelationship?.sellingUnit
        : undefined;

    if (trimmedSellingPrice !== '' && !effectiveSellingUnit) {
      setUnitRelationshipError(
        'Para definir um preço de venda é necessária uma unidade de venda válida — configure a relação de unidades e selecione a unidade de venda acima.'
      );
      return;
    }
    setUnitRelationshipError(null);

    setIsSaving(true);
    try {
      // [Implementation Plan §G, §M] unitRelationship changes route
      // through the Checkpoint-1-extended confirmProductUnitRelationship
      // — the one function already built and old-state-aware for
      // exactly this action — never a second, parallel confirmation
      // mechanism. Its own pre-write check (evaluateUnitRelationshipReplacement)
      // refuses the write if this would strand the product's current
      // sellingUnit without the owner having supplied a valid
      // replacement in this same candidate (Decision 1) — surfaced to
      // the owner via the catch block below, exactly as
      // handleReactivateProduct's own reused error-handling pattern
      // does elsewhere in this codebase (Plan §I, §6).
      if (willWriteRelationship) {
        await confirmProductUnitRelationship(product.id, {
          units: candidateUnits,
          ...(sellingUnit.trim() ? { sellingUnit: sellingUnit.trim() } : {}),
        } as UnitRelationshipProposal);
      }

      // [§45 Amendment FR-88; Implementation Authorization §2 item 8]
      // costPrice is deliberately never sent from this form — Cost/Cost
      // Unit are purchase-workflow-owned (Add Stock/Smart Stock Entry,
      // §45 §11) and read-only from the Product Catalog. Editing here
      // updates the SAME Product.sellingPrice memory §45's Contagem-side
      // write path (recordStockCount) establishes and governs — the
      // same authority, reached through a second entry point, per
      // FR-88 exactly.
      // [Bug fix — "Function updateDoc() called with invalid data.
      // Unsupported field value: undefined" on save] A literal
      // `field: undefined` still leaves that key present on the object
      // (unlike an absent key), and Firestore's updateDoc rejects any
      // payload containing one — so saving with any of these four
      // fields left blank threw immediately, before the write ever
      // reached Firestore, for every product missing one of them.
      // Conditional spread (the same pattern this codebase already
      // uses everywhere else a field is genuinely optional, e.g.
      // registerCatalogProduct) omits the key entirely when blank
      // instead of sending it as undefined — Firestore then simply
      // leaves that field untouched, exactly this form's original
      // intent, with no invalid-payload error.
      await updateProduct(product.id, {
        name: trimmedName,
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(supplier.trim() ? { supplier: supplier.trim() } : {}),
        ...(sku.trim() ? { sku: sku.trim() } : {}),
        ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
        ...(sellingPrice.trim() ? { sellingPrice: parseFloat(sellingPrice) } : {}),
      });
      onClose();
    } catch (err) {
      setUnitRelationshipError(err instanceof Error ? err.message : 'Não foi possível guardar as alterações.');
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
                type="text"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(sanitizeDecimalInput(e.target.value))}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          {/* [Product Catalog Phase 2 — Checkpoint 2, Specification §6,
              Implementation Plan §H] Editable, not merely displayed —
              a chain of one or more units, each level's factor
              relative to the previous one, plus a selling-unit
              selector scoped to whichever units are currently entered.
              Prefilled from the product's existing confirmed
              relationship, if any; always rendered (not gated behind
              an existing relationship) so a product with none yet can
              have one configured here too. */}
          <div className="space-y-2">
            <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Relação de Unidades</label>
            {unitRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.unit}
                  onChange={(e) => {
                    const next = [...unitRows];
                    next[idx] = { ...next[idx], unit: e.target.value };
                    setUnitRows(next);
                  }}
                  placeholder={idx === 0 ? 'Ex: Caixa' : 'Ex: Unidade'}
                  className="flex-1 bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
                {idx > 0 && (
                  <>
                    <span className="text-[12px] text-gray-400 shrink-0">=</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.factorFromPrevious}
                      onChange={(e) => {
                        const next = [...unitRows];
                        next[idx] = { ...next[idx], factorFromPrevious: sanitizeDecimalInput(e.target.value) };
                        setUnitRows(next);
                      }}
                      placeholder="1"
                      className="w-16 bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setUnitRows(unitRows.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setUnitRows([...unitRows, { unit: '', factorFromPrevious: '1' }])}
              className="text-[12px] font-semibold text-[#0B1F3A] hover:underline"
            >
              + Adicionar nível
            </button>

            {unitRows.some((r) => r.unit.trim()) && (
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1 mt-2">Unidade de Venda</label>
                <select
                  value={sellingUnit}
                  onChange={(e) => setSellingUnit(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                >
                  <option value="">Selecione a unidade de venda</option>
                  {unitRows
                    .filter((r) => r.unit.trim())
                    .map((r) => (
                      <option key={r.unit} value={r.unit.trim()}>
                        {r.unit.trim()}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {unitRelationshipError && <p className="text-[12px] text-rose-600 mt-1">{unitRelationshipError}</p>}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <InfoHint>
              O Custo vem da última compra registada (Add Stock / Smart Stock Entry) e não pode ser editado aqui. O
              Preço de Venda é a memória estabelecida na Contagem — edite-o aqui quando o preço real mudar; a
              alteração nunca afeta o custo registado.
            </InfoHint>
            <span>Como funcionam o Custo e o Preço de Venda?</span>
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
