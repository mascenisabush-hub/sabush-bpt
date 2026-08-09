import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { X, History, ShieldCheck, Info, TrendingUp, Save } from 'lucide-react';

interface InitialStockPriceChangeModalProps {
  onClose: () => void;
}

// ============================================================
// [Initial Stock Valuation History] Lets the Owner record a price
// change affecting units still remaining from the original Initial
// Stock — WITHOUT touching the original 'initial' StockCount, which
// remains a permanently frozen historical snapshot (Initial Capital).
//
// Two panes:
//  1. Per-product current valuation — original figures, or the most
//     recent price-change event's figures if one exists (see
//     calculateInitialStockCurrentValuation in calculations.ts).
//  2. A form to record a NEW price-change event for a chosen product.
//     Framed throughout as "Registar Alteração de Preço" — never
//     "Editar Capital Inicial" — because that's exactly what it is:
//     a new, separate historical record, not an edit.
// ============================================================
export const InitialStockPriceChangeModal: React.FC<InitialStockPriceChangeModalProps> = ({ onClose }) => {
  const {
    currencySymbol,
    initialStockCount,
    initialStockCurrentValuation,
    initialStockPriceChangeEvents,
    recordInitialStockPriceChangeEvent,
    subscriptionBlocksNewRecords,
  } = useApp();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantityRemaining, setQuantityRemaining] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!initialStockCount) return null;

  const selectedProduct = initialStockCount.items.find((i) => i.productId === selectedProductId) || null;
  const selectedProductValuation = initialStockCurrentValuation.perProduct.find((p) => p.productId === selectedProductId) || null;
  const eventsForSelectedProduct = initialStockPriceChangeEvents
    .filter((e) => e.productId === selectedProductId)
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedProductId) {
      setError('Selecione um produto.');
      return;
    }
    const qty = parseFloat(quantityRemaining);
    const cost = parseFloat(newCostPrice);
    const selling = parseFloat(newSellingPrice);

    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Introduza uma quantidade restante maior que zero.');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError('Introduza um novo custo válido (não negativo).');
      return;
    }
    if (!Number.isFinite(selling) || selling < 0) {
      setError('Introduza um novo preço de venda válido (não negativo).');
      return;
    }

    setIsSaving(true);
    try {
      await recordInitialStockPriceChangeEvent({
        productId: selectedProductId,
        effectiveDate,
        quantityRemaining: qty,
        newCostPrice: cost,
        newSellingPrice: selling,
        reason: reason.trim() || undefined,
      });
      setSuccessMessage('Alteração de preço registada com sucesso.');
      setQuantityRemaining('');
      setNewCostPrice('');
      setNewSellingPrice('');
      setReason('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível registar a alteração de preço.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-gray-900 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#0B1F3A]" />
              Histórico de Valorização do Capital Inicial
            </h2>
            <p className="text-xs text-gray-500">
              Registe uma alteração de preço para as unidades que ainda restam — o Capital Inicial original nunca é alterado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-blue-50 border border-blue-500/20 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-gray-700">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Isto NÃO edita a Contagem Inicial de Stock — esse registo permanece histórico e imutável. Cada alteração
              de preço cria um novo evento, permanente e auditável, com a quantidade restante e os preços anterior/novo.
            </p>
          </div>

          {/* Original vs current, per product */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Produtos do Capital Inicial</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {initialStockCount.items.map((item) => {
                const valuation = initialStockCurrentValuation.perProduct.find((p) => p.productId === item.productId);
                const changed = !!valuation?.hasPriceChange;
                return (
                  <button
                    type="button"
                    key={item.productId}
                    onClick={() => {
                      setSelectedProductId(item.productId);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`w-full text-left p-3 flex items-center justify-between gap-3 transition ${
                      selectedProductId === item.productId ? 'bg-[#D4AF37]/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        {item.productName}
                        {changed && <TrendingUp className="w-3.5 h-3.5 text-[#0B1F3A]" />}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Original: {item.quantity} un. × {formatCurrency(item.costPrice, currencySymbol)}
                        {changed && valuation && (
                          <>
                            {' '}→ Atual: {valuation.quantity} un. × {formatCurrency(valuation.costPrice, currencySymbol)}
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-mono font-semibold text-[#0B1F3A]">
                      {formatCurrency(valuation ? valuation.investmentValue : item.quantity * item.costPrice, currencySymbol)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedProduct && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Registar Alteração de Preço — {selectedProduct.productName}</h3>

              {selectedProductValuation?.hasPriceChange && selectedProductValuation.latestEvent && (
                <p className="text-[11px] text-gray-500">
                  Última alteração: {selectedProductValuation.latestEvent.effectiveDate} —{' '}
                  {selectedProductValuation.latestEvent.quantityRemaining} un. restantes a{' '}
                  {formatCurrency(selectedProductValuation.latestEvent.newCostPrice, currencySymbol)}/un.
                </p>
              )}

              {subscriptionBlocksNewRecords ? (
                <div className="bg-amber-50 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-800">
                  A sua subscrição não permite novos registos neste momento.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                        Quantidade Restante/Afetada
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={quantityRemaining}
                        onChange={(e) => setQuantityRemaining(e.target.value)}
                        placeholder={`Máx. ${selectedProduct.quantity}`}
                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Data Efetiva</label>
                      <input
                        type="date"
                        required
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                        Novo Custo/Un ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newCostPrice}
                        onChange={(e) => setNewCostPrice(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
                        Novo Preço de Venda/Un ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newSellingPrice}
                        onChange={(e) => setNewSellingPrice(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Motivo/Comentário (opcional)</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: aumento do fornecedor"
                      className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-500/20 rounded-xl p-2.5 text-[11px] text-red-700">{error}</div>
                  )}
                  {successMessage && (
                    <div className="bg-green-50 border border-green-500/20 rounded-xl p-2.5 text-[11px] text-green-700">
                      {successMessage}
                    </div>
                  )}

                  <button type="submit" disabled={isSaving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60 w-full justify-center">
                    <Save className="w-4 h-4" />
                    {isSaving ? 'A registar...' : 'Registar Alteração de Preço'}
                  </button>
                </form>
              )}

              {eventsForSelectedProduct.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <h4 className="text-[11px] font-semibold uppercase text-gray-500 mb-1.5">Histórico deste produto</h4>
                  <div className="space-y-1.5">
                    {eventsForSelectedProduct.map((ev) => (
                      <div key={ev.id} className="text-[11px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                        {ev.effectiveDate} — {ev.quantityRemaining} un. restantes: {formatCurrency(ev.previousCostPrice, currencySymbol)} →{' '}
                        {formatCurrency(ev.newCostPrice, currencySymbol)}
                        {ev.reason ? ` (${ev.reason})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-gray-500">
            <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <p>
              Cada alteração é permanente e não pode ser editada ou apagada depois de registada — se precisar de corrigir
              um valor, registe uma nova alteração de preço.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
