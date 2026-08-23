import {
  ClipboardCheck,
  PackagePlus,
  Receipt,
  HandCoins,
  AlertTriangle,
  Boxes,
  Building2,
  Lock,
  FileDown,
  UserMinus,
  UserX,
  UserCheck,
  LockOpen,
} from 'lucide-react';
import { TimelineActivityType, TimelineEvent } from '../../types';
import { isDateInRange } from '../../utils/calculations';

// ============================================================
// PRESENTATION MAPS — one entry per TimelineActivityType.
// ============================================================
export const ACTIVITY_ICON: Record<TimelineActivityType, React.ComponentType<{ className?: string }>> = {
  'initial-stock-count': ClipboardCheck,
  'stock-batch-created': PackagePlus,
  'stock-verification': ClipboardCheck,
  'expense-recorded': Receipt,
  'withdrawal-recorded': HandCoins,
  'quebra-recorded': AlertTriangle,
  'product-created': Boxes,
  'business-profile-updated': Building2,
  'monthly-closing': Lock,
  'yearly-closing': Lock,
  // [Business Worth Evolution — Implementation Authorization §18,
  // Increment 6] Fecho's own timeline event — same "frozen period" concept
  // as monthly/yearly closing, so it reuses the same Lock icon.
  'fecho-closing': Lock,
  'report-exported': FileDown,
  'staff-removed': UserMinus,
  'staff-suspended': UserX,
  'staff-reactivated': UserCheck,
  'period-reopened': LockOpen,
};

export const ACTIVITY_COLOR: Record<TimelineActivityType, string> = {
  'initial-stock-count': 'bg-indigo-50 text-indigo-600 border-indigo-200',
  'stock-batch-created': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'stock-verification': 'bg-cyan-50 text-cyan-600 border-cyan-200',
  'expense-recorded': 'bg-rose-50 text-rose-600 border-rose-200',
  'withdrawal-recorded': 'bg-amber-50 text-amber-600 border-amber-200',
  'quebra-recorded': 'bg-red-50 text-red-600 border-red-200',
  'product-created': 'bg-blue-50 text-blue-600 border-blue-200',
  'business-profile-updated': 'bg-purple-50 text-purple-600 border-purple-200',
  'monthly-closing': 'bg-teal-50 text-teal-600 border-teal-200',
  'yearly-closing': 'bg-teal-50 text-teal-600 border-teal-200',
  // [Increment 6] Same teal "frozen period" family as monthly/yearly.
  'fecho-closing': 'bg-teal-50 text-teal-600 border-teal-200',
  'report-exported': 'bg-gray-100 text-gray-600 border-gray-200',
  'staff-removed': 'bg-slate-100 text-slate-600 border-slate-300',
  'staff-suspended': 'bg-orange-50 text-orange-600 border-orange-200',
  'staff-reactivated': 'bg-green-50 text-green-600 border-green-200',
  'period-reopened': 'bg-yellow-50 text-yellow-700 border-yellow-300',
};

export const ACTIVITY_LABEL: Record<TimelineActivityType, string> = {
  'initial-stock-count': 'Contagem Inicial',
  'stock-batch-created': 'Stock',
  'stock-verification': 'Verificação de Stock',
  'expense-recorded': 'Despesa',
  'withdrawal-recorded': 'Retirada',
  'quebra-recorded': 'Quebra',
  'product-created': 'Produto',
  'business-profile-updated': 'Perfil do Negócio',
  'monthly-closing': 'Fecho Mensal',
  'yearly-closing': 'Fecho Anual',
  // [Increment 6] Fecho's own label, distinct from the calendar-aligned
  // "Fecho Mensal"/"Fecho Anual" above.
  'fecho-closing': 'Fecho',
  'report-exported': 'Relatório',
  'staff-removed': 'Funcionário Removido',
  'staff-suspended': 'Funcionário Suspenso',
  'staff-reactivated': 'Funcionário Reativado',
  'period-reopened': 'Período Reaberto',
};

export const ALL_ACTIVITY_TYPES: TimelineActivityType[] = [
  'initial-stock-count',
  'stock-batch-created',
  'stock-verification',
  'quebra-recorded',
  'expense-recorded',
  'withdrawal-recorded',
  'product-created',
  'monthly-closing',
  'yearly-closing',
  'fecho-closing',
  'business-profile-updated',
  'report-exported',
  'staff-removed',
  'staff-suspended',
  'staff-reactivated',
  'period-reopened',
];

export function getEventTime(createdAt: string): string {
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function monthKey(dateStr: string): string {
  return (dateStr || '').slice(0, 7); // YYYY-MM
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] ?? m} ${y}`;
}

// ============================================================
// GROUPING — chronological (newest month first), each month's events
// newest first, plus a per-type breakdown used for the Monthly Summary.
// ============================================================
export interface MonthGroup {
  key: string;
  label: string;
  events: TimelineEvent[];
  breakdown: { type: TimelineActivityType; label: string; count: number }[];
}

export function groupByMonth(events: TimelineEvent[]): MonthGroup[] {
  const map = new Map<string, TimelineEvent[]>();
  events.forEach((e) => {
    const key = monthKey(e.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const counts = new Map<TimelineActivityType, number>();
      sorted.forEach((e) => counts.set(e.type, (counts.get(e.type) || 0) + 1));
      const breakdown = Array.from(counts.entries())
        .map(([type, count]) => ({ type, label: ACTIVITY_LABEL[type], count }))
        .sort((a, b) => b.count - a.count);
      return { key, label: monthLabel(key), events: sorted, breakdown };
    });
}

// ============================================================
// FILTERING — every field is optional; an empty/undefined filter means
// "no restriction on this dimension".
// ============================================================
export interface TimelineFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
  types?: TimelineActivityType[]; // empty/undefined = all types
  userName?: string;
  productName?: string;
  supplierName?: string;
  batchNumber?: string;
  expenseCategory?: string;
}

export function filterTimelineEvents(events: TimelineEvent[], filters: TimelineFilters): TimelineEvent[] {
  const search = (filters.search || '').trim().toLowerCase();

  return events.filter((e) => {
    if (filters.startDate || filters.endDate) {
      if (!isDateInRange(e.date, filters.startDate || '', filters.endDate || '')) return false;
    }
    if (filters.types && filters.types.length > 0 && !filters.types.includes(e.type)) return false;
    if (filters.userName && e.userName !== filters.userName) return false;
    if (filters.productName && e.productName !== filters.productName) return false;
    if (filters.supplierName && e.supplierName !== filters.supplierName) return false;
    if (filters.batchNumber && e.batchNumber !== filters.batchNumber) return false;
    if (filters.expenseCategory && e.expenseCategory !== filters.expenseCategory) return false;

    if (search) {
      const haystack = [
        e.productName,
        e.batchNumber,
        e.supplierName,
        e.description,
        e.title,
        e.details?.reason,
        e.details?.notes,
        e.expenseCategory,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(' | ');
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

/** Distinct, sorted, non-empty values for a given field — used to build filter dropdown options. */
export function distinctValues<K extends keyof TimelineEvent>(events: TimelineEvent[], key: K): string[] {
  const set = new Set<string>();
  events.forEach((e) => {
    const v = e[key];
    if (v) set.add(String(v));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
