export interface SummaryCardData {
  id: string;
  title: string;
  value: number;
  trend: number; // signed percentage
  icon: 'investment' | 'market' | 'profit' | 'worth' | 'expenses' | 'withdrawals';
}

export const SUMMARY_CARDS: SummaryCardData[] = [
  { id: 'investment', title: 'Valor de Investimento', value: 842_500, trend: 4.2, icon: 'investment' },
  { id: 'market', title: 'Valor de Mercado', value: 1_186_300, trend: 6.8, icon: 'market' },
  { id: 'profit', title: 'Lucro Embutido', value: 343_800, trend: 9.1, icon: 'profit' },
  { id: 'worth', title: 'Valor do Negócio', value: 1_402_900, trend: 3.4, icon: 'worth' },
  { id: 'expenses', title: 'Despesas (Mês)', value: 68_450, trend: -2.1, icon: 'expenses' },
  { id: 'withdrawals', title: 'Retiradas (Mês)', value: 45_000, trend: -5.6, icon: 'withdrawals' },
];

export const PROFIT_TREND: { label: string; value: number }[] = [
  { label: 'Jan', value: 210_000 },
  { label: 'Fev', value: 232_000 },
  { label: 'Mar', value: 221_000 },
  { label: 'Abr', value: 258_000 },
  { label: 'Mai', value: 275_000 },
  { label: 'Jun', value: 296_000 },
  { label: 'Jul', value: 343_800 },
];

export const INVENTORY_COMPOSITION: { label: string; value: number; color: string }[] = [
  { label: 'Bebidas', value: 38, color: '#0B1F3A' },
  { label: 'Alimentação', value: 27, color: '#D4AF37' },
  { label: 'Limpeza', value: 18, color: '#F59E0B' },
  { label: 'Outros', value: 17, color: '#94A3B8' },
];

export interface PurchaseBatchRow {
  id: string;
  batchNumber: string;
  supplier: string;
  date: string;
  products: number;
  investment: number;
  status: 'Ativo' | 'Parcial' | 'Consumido' | 'Arquivado';
}

export const RECENT_BATCHES: PurchaseBatchRow[] = [
  { id: '1', batchNumber: 'BAT-000114', supplier: 'Distribuidora Maputo Lda', date: '22 Jul 2026', products: 6, investment: 128_400, status: 'Ativo' },
  { id: '2', batchNumber: 'BAT-000113', supplier: 'Fresh Foods Moçambique', date: '19 Jul 2026', products: 4, investment: 76_200, status: 'Parcial' },
  { id: '3', batchNumber: 'BAT-000112', supplier: 'Bebidas do Índico', date: '15 Jul 2026', products: 10, investment: 214_900, status: 'Ativo' },
  { id: '4', batchNumber: 'BAT-000111', supplier: 'Clean & Co', date: '10 Jul 2026', products: 3, investment: 32_150, status: 'Consumido' },
  { id: '5', batchNumber: 'BAT-000110', supplier: 'Distribuidora Maputo Lda', date: '02 Jul 2026', products: 5, investment: 98_700, status: 'Arquivado' },
];

export interface ActivityItem {
  id: string;
  type: 'compra' | 'quebra' | 'despesa' | 'retirada';
  title: string;
  detail: string;
  time: string;
}

export const ACTIVITY_FEED: ActivityItem[] = [
  { id: '1', type: 'compra', title: 'Compra criada', detail: 'BAT-000114 · Distribuidora Maputo Lda', time: 'Há 2 horas' },
  { id: '2', type: 'quebra', title: 'Quebra registada', detail: 'Cerveja Laurentina · 4 un', time: 'Há 5 horas' },
  { id: '3', type: 'despesa', title: 'Despesa registada', detail: 'Combustível · 3.200 MT', time: 'Ontem' },
  { id: '4', type: 'retirada', title: 'Retirada registada', detail: 'Uso Pessoal · 15.000 MT', time: 'Ontem' },
  { id: '5', type: 'compra', title: 'Compra criada', detail: 'BAT-000113 · Fresh Foods Moçambique', time: '2 dias atrás' },
];

export interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
}

export const ALERTS: AlertItem[] = [
  { id: '1', level: 'critical', message: 'Lote BAT-000108 com quebras acima da quantidade original.' },
  { id: '2', level: 'warning', message: '3 produtos com stock abaixo do mínimo recomendado.' },
  { id: '3', level: 'warning', message: 'Fecho mensal de Junho ainda não foi realizado.' },
  { id: '4', level: 'info', message: 'Novo relatório de Valor do Negócio disponível para exportação.' },
];
