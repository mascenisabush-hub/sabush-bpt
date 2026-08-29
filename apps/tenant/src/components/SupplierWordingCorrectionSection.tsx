import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { Trash2, ArrowRightLeft, X as XIcon } from 'lucide-react';

// Owner-Controlled Correction of a Remembered Supplier-Wording
// Relationship (Implementation Authorization at
// docs/engineering/product-identity-alternative-name-relationship-correction-implementation-authorization.md,
// signed SABUSHIMIKE MASCENI, 29 August 2026). Governing chain:
// BDR-0013, the accepted Amendment, the READY Rule 8 Assessment, and
// the accepted Implementation Plan.
//
// Sole authorized UI surface (Authorization §2.D): rendered exclusively
// from within ProductDetailModal.tsx — a small, locally-rendered
// subcomponent, per the Implementation Plan's own §7 discretion, kept
// separate purely to avoid growing that file further, not a new
// top-level route or a Product Catalog redesign of any kind.
//
// Every action requires an explicit Owner confirmation step
// (window.confirm for removal, matching this file's own established
// destructive-action pattern; an inline destination pick + explicit
// "Confirmar Redirecionamento" click + window.confirm for redirect) —
// never a single, unconfirmed click. Cancelling either flow makes no
// context call at all: no write, no TimelineEvent (Authorization §2.F
// Scenario D).

interface SupplierWordingCorrectionSectionProps {
  product: Product;
}

export const SupplierWordingCorrectionSection: React.FC<SupplierWordingCorrectionSectionProps> = ({ product }) => {
  const { products, suppliers, removeSupplierWordingRelationship, redirectSupplierWordingRelationship } = useApp();

  const relationships = product.supplierWordings ?? [];

  // Only one row's redirect picker is open at a time — keyed by
  // `${supplierRecordId}::${wording}`, matching this capability's own
  // identity key exactly.
  const [expandedRedirectKey, setExpandedRedirectKey] = useState<string | null>(null);
  const [redirectDestinationDraft, setRedirectDestinationDraft] = useState<string>('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string>>({});

  if (relationships.length === 0) {
    // [Authorization §2.D] "a new section, visible only when the
    // product has remembered wordings" — nothing rendered otherwise.
    return null;
  }

  const keyFor = (supplierRecordId: string, wording: string) => `${supplierRecordId}::${wording}`;

  const supplierNameFor = (supplierRecordId: string): string =>
    suppliers.find((s) => s.id === supplierRecordId)?.name || 'Fornecedor desconhecido';

  const otherProducts = products.filter((p) => p.id !== product.id);

  const clearError = (key: string) => {
    setErrorByKey((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // [Non-Negotiable — Owner is always the decision-maker] A plain
  // window.confirm gate, mirroring handleDeleteProduct/
  // handleInactivateProduct's own existing pattern in this same
  // ProductDetailModal.tsx. Cancelling this dialog makes no context
  // call at all.
  const handleRemove = async (supplierRecordId: string, wording: string) => {
    const key = keyFor(supplierRecordId, wording);
    if (
      !window.confirm(
        `Remover a relação "${wording}" (${supplierNameFor(supplierRecordId)})? Esta palavra deixa de estar associada a "${product.name}" e voltará ao fluxo normal de reconhecimento na próxima ocorrência.`
      )
    ) {
      return;
    }
    setBusyKey(key);
    clearError(key);
    try {
      await removeSupplierWordingRelationship(product.id, supplierRecordId, wording);
    } catch (err: any) {
      setErrorByKey((prev) => ({ ...prev, [key]: err?.message || 'Erro ao remover a relação.' }));
    } finally {
      setBusyKey(null);
    }
  };

  const handleStartRedirect = (supplierRecordId: string, wording: string) => {
    const key = keyFor(supplierRecordId, wording);
    setExpandedRedirectKey(key);
    setRedirectDestinationDraft('');
    clearError(key);
  };

  const handleCancelRedirect = () => {
    // [Authorization §2.F Scenario D] Cancelling makes no context call
    // at all — no write, no TimelineEvent.
    setExpandedRedirectKey(null);
    setRedirectDestinationDraft('');
  };

  const handleConfirmRedirect = async (supplierRecordId: string, wording: string) => {
    const key = keyFor(supplierRecordId, wording);
    const destinationProductId = redirectDestinationDraft;
    const destinationProduct = otherProducts.find((p) => p.id === destinationProductId);
    if (!destinationProduct) return;

    if (
      !window.confirm(
        `Redirecionar a relação "${wording}" (${supplierNameFor(supplierRecordId)}) de "${product.name}" para "${destinationProduct.name}"? A partir de agora, esta palavra do fornecedor será associada automaticamente a "${destinationProduct.name}".`
      )
    ) {
      return;
    }

    // [Implementation Plan §4.3 — Plan-level proposal] Every OTHER
    // product (excluding source and the chosen destination) whose
    // already-loaded supplierWordings appears to hold this exact pair
    // — a defensive, already-loaded-data conflict check, not a new
    // collection scan.
    const additionalConflictCheckProductIds = products
      .filter((p) => p.id !== product.id && p.id !== destinationProductId)
      .filter((p) =>
        (p.supplierWordings ?? []).some(
          (r) => r.supplierRecordId === supplierRecordId && r.wording.trim() === wording.trim()
        )
      )
      .map((p) => p.id);

    setBusyKey(key);
    clearError(key);
    try {
      await redirectSupplierWordingRelationship(
        product.id,
        destinationProductId,
        supplierRecordId,
        wording,
        additionalConflictCheckProductIds
      );
      setExpandedRedirectKey(null);
      setRedirectDestinationDraft('');
    } catch (err: any) {
      setErrorByKey((prev) => ({ ...prev, [key]: err?.message || 'Erro ao redirecionar a relação.' }));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <ArrowRightLeft className="w-3.5 h-3.5 text-[#0B1F3A]/60" strokeWidth={2.25} />
        Palavras de Fornecedor Memorizadas ({relationships.length})
      </h3>
      <div className="space-y-2">
        {relationships.map((relationship) => {
          const key = keyFor(relationship.supplierRecordId, relationship.wording);
          const isBusy = busyKey === key;
          const isRedirecting = expandedRedirectKey === key;
          const rowError = errorByKey[key];

          return (
            <div key={key} className="rounded-2xl border border-[#E5E7EB] bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[#111827] font-semibold block truncate">{relationship.wording}</span>
                  <span className="text-gray-500 text-[10.5px] block mt-0.5">
                    Fornecedor: {supplierNameFor(relationship.supplierRecordId)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStartRedirect(relationship.supplierRecordId, relationship.wording)}
                    disabled={isBusy}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#0B1F3A] hover:bg-[#0B1F3A]/[0.06] transition-colors duration-150 disabled:opacity-50"
                    title="Redirecionar para outro produto"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(relationship.supplierRecordId, relationship.wording)}
                    disabled={isBusy}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-150 disabled:opacity-50"
                    title="Remover relação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isRedirecting && (
                <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-2.5">
                  <label className="block text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide">
                    Redirecionar para
                  </label>
                  <select
                    value={redirectDestinationDraft}
                    onChange={(e) => setRedirectDestinationDraft(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-[#111827] text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="">Selecionar produto de destino...</option>
                    {otherProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirmRedirect(relationship.supplierRecordId, relationship.wording)}
                      disabled={isBusy || !redirectDestinationDraft}
                      className="px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white text-xs font-bold transition-colors duration-150 disabled:opacity-50"
                    >
                      {isBusy ? 'A redirecionar...' : 'Confirmar Redirecionamento'}
                    </button>
                    <button
                      onClick={handleCancelRedirect}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-colors duration-150 flex items-center gap-1 disabled:opacity-50"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {rowError && (
                <div className="mt-2.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                  {rowError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
