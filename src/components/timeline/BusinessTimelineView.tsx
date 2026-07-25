import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TimelineActivityType, TimelineEvent } from '../../types';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import { ReportFilterBar, useDateRange } from '../reports/shared/ReportFilterBar';
import { ReportKpiCard, ReportEmptyState } from '../reports/shared/ReportUI';
import { TimelineEventCard } from './TimelineEventCard';
import { TimelineDetailModal } from './TimelineDetailModal';
import {
  ALL_ACTIVITY_TYPES,
  ACTIVITY_LABEL,
  distinctValues,
  filterTimelineEvents,
  groupByMonth,
} from './timelineHelpers';
import {
  History,
  Search,
  SlidersHorizontal,
  CalendarCheck,
  CalendarDays,
  CalendarRange as CalendarRangeIcon,
  PackagePlus,
  Receipt,
  ClipboardCheck,
} from 'lucide-react';

export const BusinessTimelineView: React.FC = () => {
  const { timelineEvents, purchaseBatches, expenses, stockCounts, currencySymbol } = useApp();

  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<TimelineActivityType[]>([]);
  const [userNameFilter, setUserNameFilter] = useState('');
  const [productNameFilter, setProductNameFilter] = useState('');
  const [supplierNameFilter, setSupplierNameFilter] = useState('');
  const [batchNumberFilter, setBatchNumberFilter] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');

  const [range, { setStartDate, setEndDate, applyPreset }] = useDateRange();
  // The Timeline is a history view — default to showing everything ever
  // recorded, rather than the "this month" default used by the Reports
  // screen's KPI-style reports.
  useEffect(() => {
    applyPreset('all-time');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // QUICK STATISTICS — computed from the full, unfiltered log so the
  // top-of-page snapshot never shifts just because someone is mid-search.
  // ============================================================
  const todayStr = getTodayDateString();
  const weekAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const monthStartStr = todayStr.slice(0, 7) + '-01';

  const activitiesToday = useMemo(() => timelineEvents.filter((e) => e.date === todayStr).length, [timelineEvents, todayStr]);
  const activitiesThisWeek = useMemo(
    () => timelineEvents.filter((e) => e.date >= weekAgoStr && e.date <= todayStr).length,
    [timelineEvents, weekAgoStr, todayStr]
  );
  const activitiesThisMonth = useMemo(
    () => timelineEvents.filter((e) => e.date >= monthStartStr && e.date <= todayStr).length,
    [timelineEvents, monthStartStr, todayStr]
  );

  const latestBatch = useMemo(
    () => (purchaseBatches.length ? [...purchaseBatches].sort((a, b) => b.date.localeCompare(a.date))[0] : null),
    [purchaseBatches]
  );
  const latestExpense = useMemo(
    () => (expenses.length ? [...expenses].sort((a, b) => b.date.localeCompare(a.date))[0] : null),
    [expenses]
  );
  const latestStockVerification = useMemo(() => {
    const verifications = stockCounts.filter((s) => s.type !== 'initial');
    return verifications.length ? [...verifications].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  }, [stockCounts]);

  // ============================================================
  // FILTER OPTIONS — derived from whatever activity actually happened, so
  // dropdowns never show a product/supplier/batch that has no history.
  // ============================================================
  const userOptions = useMemo(() => distinctValues(timelineEvents, 'userName'), [timelineEvents]);
  const productOptions = useMemo(() => distinctValues(timelineEvents, 'productName'), [timelineEvents]);
  const supplierOptions = useMemo(() => distinctValues(timelineEvents, 'supplierName'), [timelineEvents]);
  const batchOptions = useMemo(() => distinctValues(timelineEvents, 'batchNumber'), [timelineEvents]);
  const categoryOptions = useMemo(() => distinctValues(timelineEvents, 'expenseCategory'), [timelineEvents]);

  const filtered = useMemo(
    () =>
      filterTimelineEvents(timelineEvents, {
        startDate: range.startDate,
        endDate: range.endDate,
        search,
        types: selectedTypes,
        userName: userNameFilter,
        productName: productNameFilter,
        supplierName: supplierNameFilter,
        batchNumber: batchNumberFilter,
        expenseCategory: expenseCategoryFilter,
      }),
    [
      timelineEvents,
      range,
      search,
      selectedTypes,
      userNameFilter,
      productNameFilter,
      supplierNameFilter,
      batchNumberFilter,
      expenseCategoryFilter,
    ]
  );

  const monthGroups = useMemo(() => groupByMonth(filtered), [filtered]);

  const toggleType = (type: TimelineActivityType) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const hasAnyEvents = timelineEvents.length > 0;

  return (
    <div className="space-y-4 pb-12">
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" /> Linha do Tempo do Negócio
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          O histórico cronológico completo do negócio — o que aconteceu e quando aconteceu.
        </p>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <ReportKpiCard icon={CalendarCheck} label="Hoje" value={String(activitiesToday)} tone="accent" />
        <ReportKpiCard icon={CalendarDays} label="Esta Semana" value={String(activitiesThisWeek)} tone="accent" />
        <ReportKpiCard icon={CalendarRangeIcon} label="Este Mês" value={String(activitiesThisMonth)} tone="accent" />
        <ReportKpiCard
          icon={PackagePlus}
          label="Último Lote"
          value={latestBatch ? latestBatch.batchNumber : '—'}
          sub={latestBatch ? formatDate(latestBatch.date) : undefined}
        />
        <ReportKpiCard
          icon={Receipt}
          label="Última Despesa"
          value={latestExpense ? latestExpense.description : '—'}
          sub={latestExpense ? formatDate(latestExpense.date) : undefined}
        />
        <ReportKpiCard
          icon={ClipboardCheck}
          label="Última Verificação"
          value={latestStockVerification ? (latestStockVerification.label || latestStockVerification.type) : '—'}
          sub={latestStockVerification ? formatDate(latestStockVerification.date) : undefined}
        />
      </div>

      {/* Search — always visible */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-2 sm:p-2.5 shadow-sm">
        <Search className="w-4 h-4 text-gray-400 ml-1.5 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por produto, lote, fornecedor, despesa, motivo ou notas..."
          className="flex-1 bg-transparent border-none outline-none text-sm px-1 py-1.5 min-w-0"
        />
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 shrink-0 ${
            showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
        </button>
      </div>

      {showFilters && (
        <ReportFilterBar
          range={range}
          onStartDate={setStartDate}
          onEndDate={setEndDate}
          onPreset={applyPreset}
          extraFilters={
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Tipo de Atividade
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ACTIVITY_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition active:scale-95 ${
                        selectedTypes.includes(type)
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {ACTIVITY_LABEL[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FilterSelect label="Utilizador" value={userNameFilter} onChange={setUserNameFilter} options={userOptions} />
                <FilterSelect label="Produto" value={productNameFilter} onChange={setProductNameFilter} options={productOptions} />
                <FilterSelect label="Fornecedor" value={supplierNameFilter} onChange={setSupplierNameFilter} options={supplierOptions} />
                <FilterSelect label="Lote" value={batchNumberFilter} onChange={setBatchNumberFilter} options={batchOptions} />
                <FilterSelect
                  label="Categoria de Despesa"
                  value={expenseCategoryFilter}
                  onChange={setExpenseCategoryFilter}
                  options={categoryOptions}
                />
              </div>
            </div>
          }
        />
      )}

      {/* Timeline body */}
      {!hasAnyEvents ? (
        <ReportEmptyState message="Ainda não há histórico registado. As ações do dia a dia (stock, despesas, retiradas, fechos...) vão aparecer aqui automaticamente." />
      ) : filtered.length === 0 ? (
        <ReportEmptyState message="Nenhuma atividade corresponde aos filtros aplicados." />
      ) : (
        <div className="space-y-8">
          {monthGroups.map((group) => (
            <div key={group.key} className="space-y-4">
              {/* Monthly Summary header */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-gray-900">{group.label}</h3>
                  <span className="text-[11px] font-semibold text-gray-500">{group.events.length} Atividades</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {group.breakdown.map((b) => (
                    <span
                      key={b.type}
                      className="text-[10.5px] font-semibold px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600"
                    >
                      {b.count} {b.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vertical timeline for this month */}
              <div className="relative">
                <div className="absolute left-[19px] sm:left-1/2 top-2 bottom-2 w-px bg-gray-200 sm:-translate-x-1/2" />
                <div className="space-y-4">
                  {group.events.map((event, idx) => {
                    const isLeft = idx % 2 === 0;
                    return (
                      <div key={event.id} className="relative">
                        <div className="absolute left-[19px] sm:left-1/2 top-4 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow z-10" />

                        {/* Mobile: single column, offset from the line */}
                        <div className="sm:hidden pl-10">
                          <TimelineEventCard
                            event={event}
                            currencySymbol={currencySymbol}
                            onSelect={() => setSelectedEvent(event)}
                          />
                        </div>

                        {/* Desktop: alternating columns either side of the line */}
                        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-8">
                          <div className={isLeft ? 'pr-8' : 'pr-8 invisible'}>
                            {isLeft && (
                              <TimelineEventCard
                                event={event}
                                currencySymbol={currencySymbol}
                                onSelect={() => setSelectedEvent(event)}
                              />
                            )}
                          </div>
                          <div className={!isLeft ? 'pl-8' : 'pl-8 invisible'}>
                            {!isLeft && (
                              <TimelineEventCard
                                event={event}
                                currencySymbol={currencySymbol}
                                onSelect={() => setSelectedEvent(event)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEvent && (
        <TimelineDetailModal event={selectedEvent} currencySymbol={currencySymbol} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};

// ============================================================
// Small reusable dropdown used for the Product/Supplier/Batch/User/
// Expense-Category filters. Hidden entirely when there are no options for
// that dimension, so the filter panel never shows an empty, useless select.
// ============================================================
const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => {
  if (options.length === 0) return null;
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500"
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};
