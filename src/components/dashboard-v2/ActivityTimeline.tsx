import React from 'react';
import { PackagePlus, AlertTriangle, Receipt, HandCoins } from 'lucide-react';
import { ACTIVITY_FEED, ActivityItem } from './dummyData';

const ICONS: Record<ActivityItem['type'], React.ElementType> = {
  compra: PackagePlus,
  quebra: AlertTriangle,
  despesa: Receipt,
  retirada: HandCoins,
};

const COLORS: Record<ActivityItem['type'], string> = {
  compra: 'bg-[#0B1F3A]/5 text-[#0B1F3A]',
  quebra: 'bg-red-50 text-red-600',
  despesa: 'bg-[#F59E0B]/10 text-[#B45309]',
  retirada: 'bg-[#D4AF37]/10 text-[#8A6D1D]',
};

export const ActivityTimeline: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Atividade Recente</h3>
      <div className="space-y-4">
        {ACTIVITY_FEED.map((item, idx) => {
          const Icon = ICONS[item.type];
          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${COLORS[item.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {idx < ACTIVITY_FEED.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                <p className="text-xs text-gray-500">{item.detail}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
