import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RefreshCw, X, Store, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface OwnerPortfolioModalProps {
  onClose: () => void;
}

// [Module #17 Owner Portfolio v0.2 addendum — Stage 8 Authorization
// signed 2026-08-17, corrected 2026-08-17] Presentation-only: one
// independent row per owned shop, each showing that shop's
// non-authoritative currentWorth cache and an explicit, per-shop
// refresh action. Never shown to a single-shop Admin (gated by the
// caller, same as ShopSwitcher's own chevron). Performs no
// aggregation, no cross-shop read in a single call, and never
// triggers a refresh automatically — every recalculation here is a
// direct, explicit consequence of the Admin clicking the refresh
// control on one specific row.
export const OwnerPortfolioModal: React.FC<OwnerPortfolioModalProps> = ({ onClose }) => {
  const { ownedBusinesses, refreshShopWorth } = useApp();

  // Per-row state, keyed by businessId — independent of any other
  // row's state, matching the addendum's "each shop is handled
  // independently" requirement exactly.
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Record<string, string>>({});

  const handleRefresh = async (businessId: string) => {
    setRefreshingIds((prev) => new Set(prev).add(businessId));
    setFailedIds((prev) => {
      const next = { ...prev };
      delete next[businessId];
      return next;
    });

    const result = await refreshShopWorth(businessId);

    setRefreshingIds((prev) => {
      const next = new Set(prev);
      next.delete(businessId);
      return next;
    });
    if (!result.success) {
      setFailedIds((prev) => ({ ...prev, [businessId]: result.error || 'Erro ao atualizar.' }));
    }
  };

  // pt-PT, day/month/hour/minute — coarser than a full timestamp but
  // enough to distinguish "just refreshed" from "days ago", which is
  // all the accepted specification actually requires (distinguishable,
  // not necessarily precise-to-the-second).
  const formatCalculatedAt = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header — same shell/typography as SettingsModal for consistency */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" /> Portefólio de Lojas
            </h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Valor de cada loja que possui — atualizado apenas quando pedir
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* One row per owned shop — never combined, never averaged */}
        <div className="overflow-y-auto p-3 space-y-1.5">
          {ownedBusinesses.map((b) => {
            const isRefreshing = refreshingIds.has(b.id);
            const failureMessage = failedIds[b.id];
            const cached = b.currentWorth;

            return (
              <div
                key={b.id}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0B1F3A]/5 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-[#0B1F3A]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{b.name}</p>

                  {cached ? (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-[15px] font-bold text-[#0B1F3A] font-mono">
                        {formatCurrency(cached.value, b.currencySymbol)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        em {formatCalculatedAt(cached.calculatedAt)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-0.5">Ainda não calculado</p>
                  )}

                  {failureMessage && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {failureMessage}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRefresh(b.id)}
                  disabled={isRefreshing}
                  title="Atualizar valor desta loja"
                  className="p-2 text-gray-400 hover:text-[#0B1F3A] hover:bg-[#0B1F3A]/5 rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
