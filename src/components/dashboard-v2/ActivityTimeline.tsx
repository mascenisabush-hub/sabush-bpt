import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import { ACTIVITY_ICON, ACTIVITY_COLOR, getEventTime } from '../timeline/timelineHelpers';

// ============================================================
// REAL DATA ONLY — reuses the existing Business Timeline feature
// (TimelineEvent + ACTIVITY_ICON/ACTIVITY_COLOR/getEventTime from
// timelineHelpers.ts, the same helpers BusinessTimelineView.tsx uses).
// Shows the 5 most recent events, newest first. No new logic.
// ============================================================
export const ActivityTimeline: React.FC = () => {
  const { timelineEvents } = useApp();

  const recent = [...timelineEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-full">
      <h3 className="text-sm font-bold text-[#111827] mb-4">Atividade Recente</h3>

      {recent.length === 0 ? (
        <div className="text-center text-xs text-gray-400 py-8">Nenhuma atividade registada ainda.</div>
      ) : (
        <div className="space-y-4">
          {recent.map((item, idx) => {
            const Icon = ACTIVITY_ICON[item.type];
            return (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${ACTIVITY_COLOR[item.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {idx < recent.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                </div>
                <div className="pb-4 min-w-0">
                  <p className="text-sm font-semibold text-[#111827] truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDate(item.date)} · {getEventTime(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
