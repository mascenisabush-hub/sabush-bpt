import { LayoutDashboard, Boxes, PackagePlus, AlertTriangle, Receipt, BarChart3, HandCoins, ClipboardList, Lock, History, Sparkles } from 'lucide-react';

export type TabType = 'dashboard' | 'stocks' | 'add-stock' | 'add-quebra' | 'add-expense' | 'add-withdrawal' | 'reports' | 'initial-stock' | 'stock-count' | 'closing' | 'timeline' | 'dashboard-v2';

export interface NavTabDefinition {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
  ownerOnly: boolean;
}

// Single source of truth for the app's action buttons — same 11 tabs used by
// both the header action row (desktop) and the bottom bar (mobile).
export const NAV_TABS: NavTabDefinition[] = [
  { id: 'dashboard', label: 'Produtos', shortLabel: 'Produtos', icon: LayoutDashboard, color: 'emerald', ownerOnly: true },
  { id: 'stocks', label: 'Stocks', shortLabel: 'Stocks', icon: Boxes, color: 'amber', ownerOnly: true },
  { id: 'add-stock', label: 'Adicionar Stock', shortLabel: '+ Stock', icon: PackagePlus, color: 'emerald', ownerOnly: false },
  { id: 'stock-count', label: 'Contagem de Stock', shortLabel: 'Contagem', icon: ClipboardList, color: 'indigo', ownerOnly: true },
  { id: 'add-quebra', label: 'Adicionar Quebra', shortLabel: '+ Quebra', icon: AlertTriangle, color: 'rose', ownerOnly: false },
  { id: 'add-expense', label: 'Adicionar Despesa', shortLabel: '+ Despesa', icon: Receipt, color: 'purple', ownerOnly: false },
  { id: 'add-withdrawal', label: 'Registar Levantamento', shortLabel: '+ Levant.', icon: HandCoins, color: 'orange', ownerOnly: true },
  { id: 'closing', label: 'Fecho Mensal/Anual', shortLabel: 'Fecho', icon: Lock, color: 'teal', ownerOnly: true },
  { id: 'reports', label: 'Relatórios', shortLabel: 'Relatórios', icon: BarChart3, color: 'indigo', ownerOnly: true },
  { id: 'timeline', label: 'Linha do Tempo', shortLabel: 'Histórico', icon: History, color: 'blue', ownerOnly: true },
  { id: 'dashboard-v2', label: 'Dashboard (Novo)', shortLabel: 'Novo', icon: Sparkles, color: 'gold', ownerOnly: true },
];
