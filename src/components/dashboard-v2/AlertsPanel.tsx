import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { ALERTS, AlertItem } from './dummyData';

const CONFIG: Record<AlertItem['level'], { icon: React.ElementType; dot: string; bg: string; text: string }> = {
  critical: { icon: AlertCircle, dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  warning: { icon: AlertTriangle, dot: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#B45309]' },
  info: { icon: Info, dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
};

export const AlertsPanel: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Alertas</h3>
      <div className="space-y-2">
        {ALERTS.map(alert => {
          const cfg = CONFIG[alert.level];
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${cfg.bg}`}>
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
              <p className={`text-sm ${cfg.text}`}>{alert.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
