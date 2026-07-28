import React from 'react';
import { TimelineEvent } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ACTIVITY_ICON, ACTIVITY_COLOR, getEventTime } from './timelineHelpers';
import { ChevronRight, User } from 'lucide-react';

interface TimelineEventCardProps {
  event: TimelineEvent;
  currencySymbol: string;
  onSelect: () => void;
  align?: 'left' | 'right'; // desktop alternation side; ignored on mobile
}

const IMPACT_TONE_CLASSES: Record<string, string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  neutral: 'text-gray-700',
};

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({ event, currencySymbol, onSelect, align = 'left' }) => {
  const Icon = ACTIVITY_ICON[event.type];
  const colorClass = ACTIVITY_COLOR[event.type];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition active:scale-[0.99] flex flex-col gap-3 ${
        align === 'right' ? 'sm:text-right' : ''
      }`}
    >
      <div className={`flex items-start gap-3 ${align === 'right' ? 'sm:flex-row-reverse' : ''}`}>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center justify-between gap-2 ${align === 'right' ? 'sm:flex-row-reverse' : ''}`}>
            <h4 className="font-bold text-sm text-gray-900 truncate">{event.title}</h4>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5 ${align === 'right' ? 'sm:justify-end' : ''}`}>
            <span>{formatDate(event.date)}</span>
            <span>·</span>
            <span>{getEventTime(event.createdAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {event.userName}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{event.description}</p>

      {event.financialImpact && event.financialImpact.length > 0 && (
        <div className={`flex flex-wrap gap-3 pt-2 border-t border-gray-100 ${align === 'right' ? 'sm:justify-end' : ''}`}>
          {event.financialImpact.map((fi, i) => (
            <div key={i} className={align === 'right' ? 'sm:text-right' : ''}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{fi.label}</p>
              <p className={`text-sm type-number ${IMPACT_TONE_CLASSES[fi.tone]}`}>
                {fi.amount < 0 ? '−' : ''}{formatCurrency(Math.abs(fi.amount), currencySymbol)}
              </p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
};
