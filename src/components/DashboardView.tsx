import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBatch, calculateInventoryTotals } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  X,
  Wallet,
  Pencil,
  MoreVertical,
  SlidersHorizontal,
  Plus,
  Eye,
  Gem,
  TrendingUp,
  TrendingDown,
  Boxes,
  Landmark,
  Tag,
  Receipt,
  HandCoins,
} from 'lucide-react';
import { Product } from '../types';
import { EditProductModal } from './EditProductModal';

interface DashboardViewProps {
  onNavigateToAddStock: (productName?: string) => void;
  onNavigateToAddQuebra: (productId?: string) => void;
  onNavigateToInitialStockCount: () => void;
  onSelectProductDetail: (product: Product) => void;
}

// ============================================================
// KPI CARD — a single dashboard metric: icon, title, value, and a
// short plain-language explanation. Reused for all 9 top-level cards
// so the owner can read the health of the business without opening
// any modal. Purely presentational — no calculations happen here,
// every value is passed in already computed by the existing engine.
// ============================================================
interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
  label: string;
  value: string;
  valueClass?: string;
  description: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  highlight?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon: Icon,
  iconBgClass,
  iconTextClass,
  label,
  value,
  valueClass,
  description,
  onClick,
  badge,
  highlight,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`h-full text-left bg-white rounded-2xl p-6 flex flex-col gap-4 transition ${
      highlight ? 'bg-[#B8791A]/[0.04]' : ''
    } ${onClick ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(10,28,56,0.14)] cursor-pointer active:scale-[0.98]' : 'cursor-default'} italic`}
    style={{ boxShadow: '0 1px 3px rgba(10,28,56,0.06), 0 1px 2px rgba(10,28,56,0.04)' }}
  >
    <div className="flex items-start justify-between gap-1">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass} ${iconTextClass}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      {badge}
    </div>
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 leading-tight italic">
        {label}
      </p>
      <p className={`text-2xl sm:text-[26px] font-extrabold font-mono mt-1.5 leading-tight truncate ${valueClass || 'text-[#1B3966]'} italic`}>
        {value}
      </p>
    </div>
    <p className="text-[11px] text-gray-500 leading-snug mt-auto italic">
      {description}
    </p>
  </button>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToAddStock,
  onNavigateToAddQuebra,
  onNavigateToInitialStockCount,
  onSelectProductDetail,
}) => {
  const {
    products, batches, quebras, currencySymbol,
    hasInitialStockCount, initialCapitalValue,
    currentInventoryValue, latestStockCount,
    totalInvestmentValueAllTime, totalMarketValueAllTime, totalEmbeddedProfitAllTime,
    activeBatchCount, totalExpensesAllTime, totalWithdrawalsAllTime,
    businessWorth, capitalGrowth, capitalGrowthPct,
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showWorthModal, setShowWorthModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'profit' | 'cost'>('name');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Business-wide Embedded Profit split by batch status. None of this is
  // realized income — it's potential profit still sitting in unsold stock.
  // Also aggregate total Quebra (inventory loss) value at cost, reusing
  // the same per-batch calculation — no new formula, just a sum.
  let finalizedEmbeddedProfit = 0;
  let estimatedEmbeddedProfit = 0;
  let totalQuebraValueAllTime = 0;

  batches.forEach(batch => {
    const batchQuebras = quebras.filter(q => q.batchId === batch.id);
    const calc = calculateBatch(batch, batchQuebras);
    if (batch.status === 'closed') {
      finalizedEmbeddedProfit += calc.embeddedProfit;
    } else {
      estimatedEmbeddedProfit += calc.embeddedProfit;
    }
    totalQuebraValueAllTime += calc.quebraValue;
  });

  // Distinct category/supplier options derived from existing products,
  // used to populate the filter dropdowns below.
  const categoryOptions = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const supplierOptions = Array.from(new Set(products.map(p => p.supplier).filter(Boolean))) as string[];

  // Filter products by search (name, SKU, barcode, category, supplier)
  // and by the category/supplier dropdowns.
  let filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.supplier || '').toLowerCase().includes(query);

    if (!matchesQuery) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (supplierFilter && p.supplier !== supplierFilter) return false;
    return true;
  });

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    const aBatches = batches.filter(batch => batch.productId === a.id);
    const bBatches = batches.filter(batch => batch.productId === b.id);
    const aLatest = aBatches[0];
    const bLatest = bBatches[0];

    if (sortBy === 'cost') {
      return (bLatest?.costPrice || 0) - (aLatest?.costPrice || 0);
    }
    // embedded profit
    const aProfit = aBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.embeddedProfit;
    }, 0);
    const bProfit = bBatches.reduce((acc, batch) => {
      const calc = calculateBatch(batch, quebras.filter(q => q.batchId === batch.id));
      return acc + calc.embeddedProfit;
    }, 0);
    return bProfit - aProfit;
  });

  return (
    <div className="space-y-8 pb-6">
      {/* Business profile completion reminder now lives in the Header as a
          small inline nudge — see Header.tsx. Kept out of the dashboard body
          so nothing here competes with the KPI cards for attention. */}


      {/* PRIMARY KPI GRID — the 6 core numbers, 2 rows x 3 columns.
          Every value here reuses the existing calculation engine
          (calculateBatch / calculateInventoryTotals / AppContext);
          this is presentation only, nothing is recalculated.
          Color coding: navy = neutral, gold = business worth,
          green = profit, red = expenses. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        <KpiCard
          icon={Landmark}
          iconBgClass={hasInitialStockCount ? 'bg-[#1B3966]/[0.06]' : 'bg-[#B8791A]/10'}
          iconTextClass={hasInitialStockCount ? 'text-[#1B3966]' : 'text-[#B8791A]'}
          label="Capital Inicial do Negócio"
          value={hasInitialStockCount ? formatCurrency(initialCapitalValue, currencySymbol) : 'Não definido'}
          valueClass={hasInitialStockCount ? 'text-[#1B3966]' : 'text-[#B8791A]'}
          description={
            hasInitialStockCount
              ? 'O valor verificado do stock registado quando começou a usar o Sabush.'
              : 'Toque para registar o stock que já possui e definir o ponto de partida.'
          }
          onClick={!hasInitialStockCount ? onNavigateToInitialStockCount : undefined}
          highlight={!hasInitialStockCount}
        />

        <KpiCard
          icon={Package}
          iconBgClass="bg-[#1B3966]/[0.06]"
          iconTextClass="text-[#1B3966]"
          label="Custo do Stock Atual"
          value={formatCurrency(totalInvestmentValueAllTime, currencySymbol)}
          valueClass="text-[#1B3966]"
          description="O valor investido no stock que ainda resta."
        />

        <KpiCard
          icon={Tag}
          iconBgClass="bg-[#1B3966]/[0.06]"
          iconTextClass="text-[#1B3966]"
          label="Valor de Mercado do Stock"
          value={formatCurrency(totalMarketValueAllTime, currencySymbol)}
          valueClass="text-[#1B3966]"
          description="O valor estimado de venda do stock que ainda resta."
        />

        <KpiCard
          icon={Wallet}
          iconBgClass="bg-emerald-500/10"
          iconTextClass="text-emerald-600"
          label="Lucro Embutido"
          value={formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)}
          valueClass={totalEmbeddedProfitAllTime >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          description="O lucro potencial contido no stock que ainda resta."
          onClick={() => setShowBreakdownModal(true)}
        />

        <KpiCard
          icon={Gem}
          iconBgClass="bg-[#B8791A]/10"
          iconTextClass="text-[#B8791A]"
          label="Valor do Negócio"
          value={formatCurrency(businessWorth, currencySymbol)}
          valueClass="text-[#B8791A]"
          description="O valor estimado atual do negócio, com base no stock verificado e nos ajustes registados."
          onClick={() => setShowWorthModal(true)}
          badge={
            hasInitialStockCount && capitalGrowth !== 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-mono ${
                  capitalGrowth > 0 ? 'text-emerald-600' : 'text-rose-600'
                } italic`}
              >
                {capitalGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {capitalGrowth >= 0 ? '+' : ''}
                {capitalGrowthPct.toFixed(1)}%
              </span>
            ) : null
          }
        />

        <KpiCard
          icon={Receipt}
          iconBgClass="bg-rose-500/10"
          iconTextClass="text-rose-600"
          label="Despesas Gerais"
          value={formatCurrency(totalExpensesAllTime, currencySymbol)}
          valueClass="text-rose-700"
          description="Custos operacionais registados pelo negócio."
        />
      </div>

      {/* SECONDARY METRICS — same existing cards/data (Levantamentos, Quebras,
          Lotes Ativos), nothing removed. Set apart in a very light grey
          section rather than a border, so the primary 6 above keep focus. */}
      <div className="bg-[#F7F8FA] rounded-2xl p-5 sm:p-6">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-4 px-1 italic">
          Outros Indicadores
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <KpiCard
            icon={HandCoins}
            iconBgClass="bg-[#B8791A]/10"
            iconTextClass="text-[#B8791A]"
            label="Levantamentos do Dono"
            value={formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
            valueClass="text-[#B8791A]"
            description="Dinheiro retirado intencionalmente pelo dono."
          />

          <KpiCard
            icon={AlertTriangle}
            iconBgClass="bg-red-500/10"
            iconTextClass="text-red-600"
            label="Perdas de Stock (Quebras)"
            value={formatCurrency(totalQuebraValueAllTime, currencySymbol)}
            valueClass="text-red-700"
            description="Valor perdido por produtos danificados, expirados ou em falta."
          />

          <KpiCard
            icon={Boxes}
            iconBgClass="bg-[#1B3966]/[0.06]"
            iconTextClass="text-[#1B3966]"
            label="Lotes Ativos"
            value={String(activeBatchCount)}
            valueClass="text-[#1B3966]"
            description="Número de lotes de stock que contribuem atualmente para o inventário."
          />
        </div>
      </div>

      {/* TOP BAR (single slim row) */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 sm:p-3 shadow-sm">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none italic" />
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#B8791A] transition font-bold italic"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-0.5 italic"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category / Supplier Filters */}
        {categoryOptions.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="hidden sm:block bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#B8791A] shrink-0 max-w-[140px] italic"
          >
            <option value="">Todas Categorias</option>
            {categoryOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {supplierOptions.length > 0 && (
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="hidden sm:block bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#B8791A] shrink-0 max-w-[140px] italic"
          >
            <option value="">Todos Fornecedores</option>
            {supplierOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Right: Product Count & Sort Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 hidden sm:inline-block italic">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </span>
          <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 hidden sm:inline-flex items-center gap-1 italic">
            <Boxes className="w-3 h-3 text-amber-600 italic" />
            {activeBatchCount} {activeBatchCount === 1 ? 'lote ativo' : 'lotes ativos'}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              title="Filtrar / Ordenar"
              className="p-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-800 transition active:scale-95 flex items-center gap-1 text-xs italic"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#1B3966] italic" />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl p-1 z-20 w-44 space-y-0.5 text-xs text-gray-700 italic">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 italic">
                    Ordenar Por
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'name' ? 'bg-[#B8791A]/10 text-[#B8791A] font-bold' : 'hover:bg-gray-50'} italic`}
                  >
                    Nome (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('profit'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'profit' ? 'bg-[#B8791A]/10 text-[#B8791A] font-bold' : 'hover:bg-gray-50'} italic`}
                  >
                    Maior Lucro
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('cost'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${sortBy === 'cost' ? 'bg-[#B8791A]/10 text-[#B8791A] font-bold' : 'hover:bg-gray-50'} italic`}
                  >
                    Preço Custo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[#1B3966] italic" />
                <h3 className="text-base font-bold text-title italic">Lucro Embutido</h3>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition italic"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 -mt-1 italic">
              Lucro Embutido é o lucro potencial marcado no stock — nenhuma venda é registada nesta app, por isso este valor nunca é rendimento realizado.
            </p>

            <div className="space-y-2.5 text-xs italic">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="text-gray-500 italic">Estimado (Lotes Abertos):</span>
                <span className="font-bold font-mono text-[#9C6613] italic">
                  {formatCurrency(estimatedEmbeddedProfit, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="text-gray-500 italic">Finalizado (Lotes Fechados):</span>
                <span className="font-bold font-mono text-[#9C6613] italic">
                  {formatCurrency(finalizedEmbeddedProfit, currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between p-3 rounded-xl bg-[#B8791A]/10 border border-[#B8791A]/30">
                <span className="text-gray-800 font-bold italic">Lucro Embutido Total:</span>
                <span className={`text-base font-extrabold font-mono ${totalEmbeddedProfitAllTime >= 0 ? 'text-emerald-600' : 'text-rose-600'} italic`}>
                  {formatCurrency(totalEmbeddedProfitAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500 italic">Despesas Gerais (até hoje):</span>
                <span className="font-bold font-mono text-rose-700 italic">
                  − {formatCurrency(totalExpensesAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500 italic">Levantamentos do Dono (não afeta o lucro):</span>
                <span className="font-bold font-mono text-slate-600 italic">
                  − {formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition italic"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Business Worth Modal */}
      {showWorthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center space-x-2">
                <Gem className="w-5 h-5 text-indigo-600 italic" />
                <h3 className="text-base font-bold text-title italic">Valor do Negócio</h3>
              </div>
              <button
                onClick={() => setShowWorthModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition italic"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 -mt-1 italic">
              Valor do Negócio = Valor de Mercado do Stock − Despesas − Levantamentos. Sem venda registada, não existe um valor de "caixa" real — por isso não inventamos um.
            </p>

            <div className="space-y-2.5 text-xs italic">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="flex items-center gap-1.5 text-gray-500 italic">
                  <Boxes className="w-3.5 h-3.5 text-amber-600 italic" /> Valor de Mercado do Stock:
                </span>
                <span className="font-bold font-mono text-gray-800 italic">
                  {formatCurrency(totalMarketValueAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <span className="text-gray-500 italic">Custo do Stock (Investimento):</span>
                <span className="font-bold font-mono text-gray-800 italic">
                  {formatCurrency(totalInvestmentValueAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500 italic">Despesas Gerais:</span>
                <span className="font-bold font-mono text-rose-700 italic">
                  − {formatCurrency(totalExpensesAllTime, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500 italic">Levantamentos do Dono:</span>
                <span className="font-bold font-mono text-rose-700 italic">
                  − {formatCurrency(totalWithdrawalsAllTime, currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-500/30">
                <span className="text-gray-800 font-bold italic">Valor Total do Negócio:</span>
                <span className="text-base font-extrabold font-mono text-indigo-700 italic">
                  {formatCurrency(businessWorth, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500 italic">Contagem Física Mais Recente:</span>
                <span className="font-bold font-mono text-slate-600 italic">
                  {formatCurrency(currentInventoryValue, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 border-dashed">
                <span className="text-gray-500 italic">Capital Inicial (ponto de partida):</span>
                <span className="font-bold font-mono text-slate-600 italic">
                  {formatCurrency(initialCapitalValue, currencySymbol)}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  capitalGrowth >= 0 ? 'bg-emerald-50 border-emerald-500/30' : 'bg-rose-50 border-rose-500/30'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold text-gray-700 italic">
                  {capitalGrowth >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 italic" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600 italic" />
                  )}
                  Crescimento do Capital:
                </span>
                <span className={`font-bold font-mono ${capitalGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'} italic`}>
                  {capitalGrowth >= 0 ? '+' : ''}
                  {formatCurrency(capitalGrowth, currencySymbol)} ({capitalGrowthPct >= 0 ? '+' : ''}
                  {capitalGrowthPct.toFixed(1)}%)
                </span>
              </div>

              {latestStockCount && (
                <p className="text-[10px] text-gray-400 text-center pt-1 italic">
                  Stock atual baseado na contagem de {latestStockCount.date.split('-').reverse().join('/')}
                  {!hasInitialStockCount && ' · Defina o Capital Inicial para medir o crescimento.'}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowWorthModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs transition italic"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center max-w-lg mx-auto my-6 shadow-sm italic">
          <div className="w-12 h-12 rounded-2xl bg-[#B8791A]/10 border border-[#B8791A]/30 flex items-center justify-center text-[#B8791A] mx-auto mb-3 italic">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 italic">Nenhum produto encontrado</h3>
          <p className="text-xs text-gray-500 my-2 italic">
            {products.length === 0
              ? 'Adicione stock para criar o seu primeiro produto!'
              : 'Nenhum produto corresponde à sua pesquisa.'}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => onNavigateToAddStock()}
              className="mt-3 px-4 py-2.5 rounded-xl bg-[#1B3966] hover:bg-[#274B82] text-white font-bold text-xs transition shadow-md active:scale-95 italic"
            >
              + Adicionar Primeiro Lote
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-4 py-3 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400 italic">
            <div className="col-span-4 sm:col-span-5">Produto</div>
            <div className="col-span-2 text-right italic">
              Compra
              <span className="block text-[9px] text-gray-500 font-bold lowercase italic">/un</span>
            </div>
            <div className="col-span-2 text-right italic">
              Venda
              <span className="block text-[9px] text-gray-500 font-bold lowercase italic">/un</span>
            </div>
            <div className="col-span-2 sm:col-span-2 text-right italic">
              Lucro
              <span className="block text-[9px] text-gray-500 font-bold lowercase italic">Est. / Final</span>
            </div>
            <div className="col-span-2 sm:col-span-1 text-center pr-1 italic">Ações</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 max-h-[calc(100vh-190px)] overflow-y-auto">
            {filteredProducts.map(product => {
              const productBatches = batches.filter(b => b.productId === product.id);
              const activeBatch = productBatches.find(b => b.status === 'open');
              const closedBatches = productBatches.filter(b => b.status === 'closed');
              const latestBatch = productBatches[0];

              let activeCalc = null;
              if (activeBatch) {
                const activeQuebras = quebras.filter(q => q.batchId === activeBatch.id);
                activeCalc = calculateBatch(activeBatch, activeQuebras);
              }

              let productFinalizedProfit = 0;
              closedBatches.forEach(cb => {
                const cbQuebras = quebras.filter(q => q.batchId === cb.id);
                const cCalc = calculateBatch(cb, cbQuebras);
                productFinalizedProfit += cCalc.embeddedProfit;
              });

              const displayBatch = activeBatch || latestBatch;
              const costPriceText = displayBatch ? formatCurrency(displayBatch.costPrice, currencySymbol) : '-';
              const sellingPriceText = displayBatch ? formatCurrency(displayBatch.sellingPrice, currencySymbol) : '-';

              const displayProfit = activeBatch && activeCalc 
                ? activeCalc.embeddedProfit 
                : productFinalizedProfit;

              const isMenuOpen = openActionMenuId === product.id;

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-1 items-center px-3 py-2.5 hover:bg-gray-100/50 transition group"
                >
                  {/* PRODUTO */}
                  <div
                    onClick={() => onSelectProductDetail(product)}
                    className="col-span-4 sm:col-span-5 pr-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-[#1B3966] transition truncate italic">
                        {product.name}
                      </span>
                      {activeCalc?.hasExceededWarning && (
                        <span title="Aviso: Quebras excedem stock">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 italic" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate font-mono italic">
                      {activeBatch
                        ? 'Lote ativo'
                        : closedBatches.length > 0
                        ? `${closedBatches.length} ${closedBatches.length === 1 ? 'lote fechado' : 'lotes fechados'}`
                        : 'Sem lote'}
                    </span>
                    {(product.category || product.supplier || product.sku) && (
                      <span className="text-[9px] text-gray-400 block truncate italic">
                        {[product.category, product.supplier, product.sku && `SKU: ${product.sku}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </div>

                  {/* COMPRA */}
                  <div className="col-span-2 text-right italic">
                    <span className="text-xs font-bold text-gray-700 font-mono block italic">
                      {costPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-gray-500 block font-sans italic">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* VENDA */}
                  <div className="col-span-2 text-right italic">
                    <span className="text-xs font-bold text-gray-700 font-mono block italic">
                      {sellingPriceText}
                    </span>
                    {displayBatch?.unit && (
                      <span className="text-[9px] text-gray-500 block font-sans italic">/{displayBatch.unit}</span>
                    )}
                  </div>

                  {/* LUCRO */}
                  <div className="col-span-2 sm:col-span-2 text-right italic">
                    <span
                      className={`text-xs font-bold font-mono block ${
                        displayProfit >= 0
                          ? activeBatch ? 'text-emerald-600' : 'text-emerald-700'
                          : 'text-rose-600'
                      } italic`}
                    >
                      {formatCurrency(displayProfit, currencySymbol)}
                    </span>
                    <span className="text-[9px] text-gray-500 block font-mono italic">
                      {activeBatch ? 'Est.' : 'Final'}
                    </span>
                  </div>

                  {/* AÇÕES */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => onNavigateToAddStock(product.name)}
                      title="Adicionar Stock / Editar Lote"
                      className="p-1.5 text-gray-500 hover:text-[#1B3966] hover:bg-gray-50 rounded-lg transition italic"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionMenuId(isMenuOpen ? null : product.id)}
                        title="Mais opções"
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition italic"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenActionMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl p-1 z-20 w-40 text-xs space-y-0.5 italic">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onSelectProductDetail(product);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5 italic"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#1B3966] italic" />
                              <span>Ver detalhes</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddStock(product.name);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5 italic"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#1B3966] italic" />
                              <span>+ Add Stock</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onNavigateToAddQuebra(product.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5 italic"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-[#1B3966] italic" />
                              <span>+ Quebra</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setEditingProduct(product);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-800 transition flex items-center space-x-1.5 italic"
                            >
                              <Tag className="w-3.5 h-3.5 text-[#1B3966] italic" />
                              <span>Editar Detalhes</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingProduct && (
        <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} />
      )}
    </div>
  );
};
