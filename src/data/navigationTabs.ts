import { LayoutDashboard, Boxes, PackagePlus, AlertTriangle, Receipt, BarChart3, HandCoins, ClipboardList, Lock, History } from 'lucide-react';

export type TabType = 'dashboard' | 'stocks' | 'add-stock' | 'add-quebra' | 'add-expense' | 'add-withdrawal' | 'reports' | 'initial-stock' | 'stock-count' | 'closing' | 'timeline';

export interface NavTabDefinition {
  id: TabType;
  /** i18n key under `nav.tabs.<key>.label` — resolved via t() at render time. */
  labelKey: string;
  /** i18n key under `nav.tabs.<key>.shortLabel` — resolved via t() at render time. */
  shortLabelKey: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
  ownerOnly: boolean;
}

// Single source of truth for the app's action buttons — same 11 tabs used by
// both the header action row (desktop) and the bottom bar (mobile). Labels
// are i18n keys, not literal text — consumers must call t(tab.labelKey) /
// t(tab.shortLabelKey) to resolve them in the active language.
export const NAV_TABS: NavTabDefinition[] = [
  { id: 'dashboard', labelKey: 'nav.tabs.dashboard.label', shortLabelKey: 'nav.tabs.dashboard.shortLabel', icon: LayoutDashboard, color: 'emerald', ownerOnly: true },
  { id: 'stocks', labelKey: 'nav.tabs.stocks.label', shortLabelKey: 'nav.tabs.stocks.shortLabel', icon: Boxes, color: 'amber', ownerOnly: true },
  { id: 'add-stock', labelKey: 'nav.tabs.addStock.label', shortLabelKey: 'nav.tabs.addStock.shortLabel', icon: PackagePlus, color: 'emerald', ownerOnly: false },
  { id: 'stock-count', labelKey: 'nav.tabs.stockCount.label', shortLabelKey: 'nav.tabs.stockCount.shortLabel', icon: ClipboardList, color: 'indigo', ownerOnly: true },
  { id: 'add-quebra', labelKey: 'nav.tabs.addQuebra.label', shortLabelKey: 'nav.tabs.addQuebra.shortLabel', icon: AlertTriangle, color: 'rose', ownerOnly: false },
  { id: 'add-expense', labelKey: 'nav.tabs.addExpense.label', shortLabelKey: 'nav.tabs.addExpense.shortLabel', icon: Receipt, color: 'purple', ownerOnly: false },
  { id: 'add-withdrawal', labelKey: 'nav.tabs.addWithdrawal.label', shortLabelKey: 'nav.tabs.addWithdrawal.shortLabel', icon: HandCoins, color: 'orange', ownerOnly: true },
  { id: 'closing', labelKey: 'nav.tabs.closing.label', shortLabelKey: 'nav.tabs.closing.shortLabel', icon: Lock, color: 'teal', ownerOnly: true },
  { id: 'reports', labelKey: 'nav.tabs.reports.label', shortLabelKey: 'nav.tabs.reports.shortLabel', icon: BarChart3, color: 'indigo', ownerOnly: true },
  { id: 'timeline', labelKey: 'nav.tabs.timeline.label', shortLabelKey: 'nav.tabs.timeline.shortLabel', icon: History, color: 'blue', ownerOnly: true },
];
