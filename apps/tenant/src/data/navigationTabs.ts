import { LayoutDashboard, Boxes, PackagePlus, AlertTriangle, Receipt, BarChart3, HandCoins, ClipboardList, Lock, History, Landmark, PiggyBank, Gem } from 'lucide-react';

export type TabType = 'dashboard' | 'stocks' | 'add-stock' | 'add-quebra' | 'add-expense' | 'add-withdrawal' | 'reports' | 'initial-stock' | 'stock-count' | 'declare-worth' | 'closing' | 'timeline' | 'debts' | 'startup-investment';

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
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 10 (Revision 3); Specification §42.1, §6 State 2; BDR Decision 36]
  // A DEDICATED, SEPARATE entry point from 'stock-count' above — per
  // explicit Product Architect decision (Implementation Authorization
  // Amendment §26): Owner-Declared Business Worth is never a mode/toggle
  // inside the Contagem flow. Contagem is a physical stock-count
  // establishment event; this is an explicit declaration by an Owner who
  // already knows the business's worth — two different establishment
  // methods, kept clearly distinguishable in the UX by being two
  // separate tabs, not a shared one with a switch.
  { id: 'declare-worth', labelKey: 'nav.tabs.declareWorth.label', shortLabelKey: 'nav.tabs.declareWorth.shortLabel', icon: Gem, color: 'sky', ownerOnly: true },
  { id: 'add-quebra', labelKey: 'nav.tabs.addQuebra.label', shortLabelKey: 'nav.tabs.addQuebra.shortLabel', icon: AlertTriangle, color: 'rose', ownerOnly: false },
  { id: 'add-expense', labelKey: 'nav.tabs.addExpense.label', shortLabelKey: 'nav.tabs.addExpense.shortLabel', icon: Receipt, color: 'purple', ownerOnly: false },
  { id: 'add-withdrawal', labelKey: 'nav.tabs.addWithdrawal.label', shortLabelKey: 'nav.tabs.addWithdrawal.shortLabel', icon: HandCoins, color: 'orange', ownerOnly: true },
  { id: 'closing', labelKey: 'nav.tabs.closing.label', shortLabelKey: 'nav.tabs.closing.shortLabel', icon: Lock, color: 'teal', ownerOnly: true },
  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §11, §12, §33] Receivables/Payables — Owner-only, same
  // tier as add-withdrawal above.
  { id: 'debts', labelKey: 'nav.tabs.debts.label', shortLabelKey: 'nav.tabs.debts.shortLabel', icon: Landmark, color: 'blue', ownerOnly: true },
  // [Business Worth Evolution — Implementation Authorization, Increment 5;
  // Specification §13, §33] Startup Investment — Owner-only, same tier as
  // debts above.
  { id: 'startup-investment', labelKey: 'nav.tabs.startupInvestment.label', shortLabelKey: 'nav.tabs.startupInvestment.shortLabel', icon: PiggyBank, color: 'violet', ownerOnly: true },
  { id: 'reports', labelKey: 'nav.tabs.reports.label', shortLabelKey: 'nav.tabs.reports.shortLabel', icon: BarChart3, color: 'indigo', ownerOnly: true },
  { id: 'timeline', labelKey: 'nav.tabs.timeline.label', shortLabelKey: 'nav.tabs.timeline.shortLabel', icon: History, color: 'blue', ownerOnly: true },
];
