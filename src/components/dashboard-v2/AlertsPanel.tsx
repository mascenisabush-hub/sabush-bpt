import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateBatch } from '../../utils/calculations';

type AlertLevel = 'critical' | 'warning' | 'info';

const CONFIG: Record<AlertLevel, { icon: React.ElementType; dot: string; bg: string; text: string }> = {
  critical: { icon: AlertCircle, dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  warning: { icon: AlertTriangle, dot: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#B45309]' },
  info: { icon: Info, dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
};

// ============================================================
// REAL DATA ONLY — no generic "alerts" feature exists in the current
// system, so nothing is fabricated here. Each alert below maps to a
// signal the app genuinely already computes:
//   - hasExceededWarning (calculateBatch) — same warning icon shown
//     next to a product in DashboardView when quebras exceed stock.
//   - isBusinessProfileComplete — same profile-completion nudge shown
//     at the top of DashboardView, reusing the exact same trigger.
// If neither condition is present, we show an honest "all clear" state
// instead of inventing something to fill the panel.
// ============================================================
export const AlertsPanel: React.FC = () => {
  const { batches, quebras, products, isOwner, isBusinessProfileComplete } = useApp();

  const productMap = new Map(products.map(p => [p.id, p]));

  const exceededBatches = batches.filter(batch => {
    const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
    return calc.hasExceededWarning;
  });

  const alerts: { id: string; level: AlertLevel; message: string; onClick?: () => void }[] = [];

  exceededBatches.forEach(batch => {
    const name = productMap.get(batch.productId)?.name || 'Produto';
    alerts.push({
      id: `exceeded-${batch.id}`,
      level: 'critical',
      message: `${name}: quebras registadas excedem a quantidade do lote.`,
    });
  });

  if (isOwner && !isBusinessProfileComplete) {
    alerts.push({
      id: 'profile-incomplete',
      level: 'warning',
      message: 'Complete o perfil do seu negócio nas Definições.',
      onClick: () =>
        window.dispatchEvent(new CustomEvent('open-settings', { detail: { openProfileEdit: true } })),
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Alertas</h3>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="text-sm">Tudo em ordem — sem alertas no momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const cfg = CONFIG[alert.level];
            const Icon = cfg.icon;
            const Wrapper = alert.onClick ? 'button' : 'div';
            return (
              <Wrapper
                key={alert.id}
                onClick={alert.onClick}
                className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left ${cfg.bg} ${
                  alert.onClick ? 'hover:brightness-95 transition cursor-pointer' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
                <p className={`text-sm ${cfg.text}`}>{alert.message}</p>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
};
