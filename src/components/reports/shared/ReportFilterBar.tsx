import React from 'react';
import { getTodayDateString } from '../../../utils/formatters';
import { CalendarRange } from 'lucide-react';

export type DatePreset = 'this-month' | 'this-week' | 'last-30' | 'all-time' | 'custom';

export interface DateRangeState {
  startDate: string;
  endDate: string;
  preset: DatePreset;
}

export function useDateRange(): [DateRangeState, {
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  applyPreset: (p: Exclude<DatePreset, 'custom'>) => void;
}] {
  const todayStr = getTodayDateString();
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };
  const getDateNDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [state, setState] = React.useState<DateRangeState>({
    startDate: getFirstDayOfMonth(),
    endDate: todayStr,
    preset: 'this-month',
  });

  const applyPreset = (preset: Exclude<DatePreset, 'custom'>) => {
    if (preset === 'this-month') setState({ startDate: getFirstDayOfMonth(), endDate: todayStr, preset });
    else if (preset === 'this-week') setState({ startDate: getDateNDaysAgo(7), endDate: todayStr, preset });
    else if (preset === 'last-30') setState({ startDate: getDateNDaysAgo(30), endDate: todayStr, preset });
    else if (preset === 'all-time') setState({ startDate: '2020-01-01', endDate: '2030-12-31', preset });
  };

  return [
    state,
    {
      setStartDate: (d: string) => setState(s => ({ ...s, startDate: d, preset: 'custom' })),
      setEndDate: (d: string) => setState(s => ({ ...s, endDate: d, preset: 'custom' })),
      applyPreset,
    },
  ];
}

interface ReportFilterBarProps {
  range: DateRangeState;
  onStartDate: (d: string) => void;
  onEndDate: (d: string) => void;
  onPreset: (p: Exclude<DatePreset, 'custom'>) => void;
  extraFilters?: React.ReactNode;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ range, onStartDate, onEndDate, onPreset, extraFilters }) => {
  const presets: { key: Exclude<DatePreset, 'custom'>; label: string }[] = [
    { key: 'this-week', label: 'Esta Semana' },
    { key: 'this-month', label: 'Este Mês' },
    { key: 'last-30', label: 'Últimos 30 Dias' },
    { key: 'all-time', label: 'Desde Sempre' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 report-no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <CalendarRange className="w-4 h-4 text-blue-600" /> Filtros
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => onPreset(p.key)}
              className={`px-3 py-2 rounded-xl font-semibold transition border min-h-[38px] active:scale-95 ${
                range.preset === p.key
                  ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data Inicial</label>
          <input
            type="date"
            value={range.startDate}
            onChange={e => onStartDate(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data Final</label>
          <input
            type="date"
            value={range.endDate}
            onChange={e => onEndDate(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {extraFilters && <div className="pt-2 border-t border-gray-200 space-y-2">{extraFilters}</div>}
    </div>
  );
};
