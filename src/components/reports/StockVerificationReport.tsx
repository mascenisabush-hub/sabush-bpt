import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, ReportEmptyState, ExpandChevron } from './shared/ReportUI';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { ClipboardCheck, Boxes, TrendingUp, TrendingDown } from 'lucide-react';
import { StockCount, StockCountType } from '../../types';

interface Props {
  onBack: () => void;
}

const TYPE_LABELS: Record<StockCountType, string> = {
  initial: 'Inicial',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizada',
};

interface ProductDiff {
  productId: string;
  productName: string;
  before: number;
  after: number;
  diffQty: number;
  diffValue: number;
}

function buildDiff(current: StockCount, previous: StockCount): ProductDiff[] {
  const map = new Map<string, ProductDiff>();
  previous.items.forEach(item => {
    map.set(item.productId, { productId: item.productId, productName: item.productName, before: item.quantity, after: 0, diffQty: 0, diffValue: 0 });
  });
  current.items.forEach(item => {
    const existing = map.get(item.productId) || { productId: item.productId, productName: item.productName, before: 0, after: 0, diffQty: 0, diffValue: 0 };
    existing.after = item.quantity;
    existing.productName = item.productName;
    map.set(item.productId, existing);
  });
  const prevValueByProduct = new Map(previous.items.map(i => [i.productId, i.totalValue]));
  const currValueByProduct = new Map(current.items.map(i => [i.productId, i.totalValue]));
  return Array.from(map.values())
    .map(d => ({
      ...d,
      diffQty: d.after - d.before,
      diffValue: (currValueByProduct.get(d.productId) || 0) - (prevValueByProduct.get(d.productId) || 0),
    }))
    .sort((a, b) => Math.abs(b.diffValue) - Math.abs(a.diffValue));
}

export const StockVerificationReport: React.FC<Props> = ({ onBack }) => {
  const { business, currencySymbol, stockCounts } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedCounts = useMemo(() => [...stockCounts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)), [stockCounts]);

  const verifications = useMemo(() => {
    return sortedCounts.slice(1).map((count, idx) => {
      const previous = sortedCounts[idx]; // idx corresponds to i-1 since we sliced from 1
      const diffs = buildDiff(count, previous);
      const productsAdjusted = diffs.filter(d => d.diffQty !== 0).length;
      const financialImpact = count.totalValue - previous.totalValue;
      return { count, previous, diffs, productsAdjusted, financialImpact };
    }).reverse(); // most recent first
  }, [sortedCounts]);

  const latest = verifications[0] || null;

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (stockCounts.length === 0) {
      lines.push('Ainda não foi registada nenhuma contagem de stock.');
      return lines;
    }
    if (stockCounts.length === 1) {
      lines.push('Apenas a Contagem Inicial foi registada. Faça uma nova recontagem para ver comparações.');
      return lines;
    }
    if (latest) {
      lines.push(
        `Na verificação mais recente (${formatDate(latest.count.date)}), ${latest.productsAdjusted} de ${latest.count.items.length} produtos tiveram a quantidade ajustada.`
      );
      lines.push(
        latest.financialImpact >= 0
          ? `O valor do inventário aumentou ${formatCurrency(latest.financialImpact, currencySymbol)} desde a contagem anterior.`
          : `O valor do inventário diminuiu ${formatCurrency(Math.abs(latest.financialImpact), currencySymbol)} desde a contagem anterior.`
      );
    }
    return lines;
  }, [stockCounts, latest, currencySymbol]);

  const handleExportPdf = () => {
    exportReportPdf(
      'Verificação de Stock',
      business?.name || 'Sabush',
      latest ? `Última verificação: ${formatDate(latest.count.date)}` : '',
      latest
        ? [
            { label: 'Data', value: formatDate(latest.count.date) },
            { label: 'Produtos Contados', value: String(latest.count.items.length) },
            { label: 'Produtos Ajustados', value: String(latest.productsAdjusted) },
            { label: 'Inventário Antes', value: formatCurrency(latest.previous.totalValue, currencySymbol) },
            { label: 'Inventário Depois', value: formatCurrency(latest.count.totalValue, currencySymbol) },
            { label: 'Impacto Financeiro', value: formatCurrency(latest.financialImpact, currencySymbol) },
          ]
        : [],
      [
        {
          title: 'Histórico de Verificações',
          columns: ['Data', 'Tipo', 'Produtos Contados', 'Produtos Ajustados', 'Antes', 'Depois', 'Impacto'],
          rows: verifications.map(v => [
            formatDate(v.count.date),
            TYPE_LABELS[v.count.type],
            v.count.items.length,
            v.productsAdjusted,
            formatCurrency(v.previous.totalValue, currencySymbol),
            formatCurrency(v.count.totalValue, currencySymbol),
            formatCurrency(v.financialImpact, currencySymbol),
          ]),
        },
        ...(latest
          ? [
              {
                title: `Diferenças por Produto — ${formatDate(latest.count.date)}`,
                columns: ['Produto', 'Antes', 'Depois', 'Diferença (Qtd)', 'Diferença (Valor)'],
                rows: latest.diffs.map(d => [d.productName, d.before, d.after, d.diffQty, formatCurrency(d.diffValue, currencySymbol)]),
              },
            ]
          : []),
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Verificação de Stock',
      latest
        ? [
            { label: 'Produtos Ajustados', value: String(latest.productsAdjusted) },
            { label: 'Impacto Financeiro', value: formatCurrency(latest.financialImpact, currencySymbol) },
          ]
        : [],
      [
        {
          title: 'Histórico de Verificações',
          columns: ['Data', 'Tipo', 'Produtos Contados', 'Produtos Ajustados', 'Antes', 'Depois', 'Impacto'],
          rows: verifications.map(v => [formatDate(v.count.date), TYPE_LABELS[v.count.type], v.count.items.length, v.productsAdjusted, v.previous.totalValue, v.count.totalValue, v.financialImpact]),
        },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Verificação de Stock"
        description="O que mudou entre cada recontagem física e a anterior."
        onBack={onBack}
        onExportPdf={verifications.length ? handleExportPdf : undefined}
        onExportExcel={verifications.length ? handleExportExcel : undefined}
        onPrint={verifications.length ? printCurrentReport : undefined}
      />

      <InsightBanner insights={insights} />

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ReportKpiCard icon={Boxes} label="Inventário Antes" value={formatCurrency(latest.previous.totalValue, currencySymbol)} />
          <ReportKpiCard icon={Boxes} label="Inventário Depois" value={formatCurrency(latest.count.totalValue, currencySymbol)} tone="accent" />
          <ReportKpiCard
            icon={latest.financialImpact >= 0 ? TrendingUp : TrendingDown}
            label="Impacto Financeiro"
            value={formatCurrency(latest.financialImpact, currencySymbol)}
            tone={latest.financialImpact >= 0 ? 'positive' : 'negative'}
          />
          <ReportKpiCard icon={ClipboardCheck} label="Produtos Ajustados" value={`${latest.productsAdjusted} / ${latest.count.items.length}`} />
        </div>
      )}

      <ReportSection title={`Histórico de Verificações (${verifications.length})`} icon={ClipboardCheck}>
        {verifications.length === 0 ? (
          <ReportEmptyState message={stockCounts.length === 0 ? 'Nenhuma contagem de stock registada ainda.' : 'Registe uma nova recontagem para comparar com a Contagem Inicial.'} />
        ) : (
          <div className="space-y-3">
            {verifications.map(v => {
              const isExpanded = expandedId === v.count.id;
              return (
                <div key={v.count.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : v.count.id)} className="w-full flex items-center justify-between text-left">
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">
                        {v.count.label || TYPE_LABELS[v.count.type]} — {formatDate(v.count.date)}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {v.count.items.length} produtos contados · {v.productsAdjusted} ajustados
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono font-bold text-sm ${v.financialImpact >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(v.financialImpact, currencySymbol)}
                      </span>
                      <ExpandChevron expanded={isExpanded} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto pt-2 border-t border-gray-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-200">
                            <th className="py-2 pr-2 font-semibold">Produto</th>
                            <th className="py-2 pr-2 font-semibold text-right">Antes</th>
                            <th className="py-2 pr-2 font-semibold text-right">Depois</th>
                            <th className="py-2 pr-2 font-semibold text-right">Dif. Qtd</th>
                            <th className="py-2 pr-2 font-semibold text-right">Dif. Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.diffs.map(d => (
                            <tr key={d.productId} className="border-b border-gray-100">
                              <td className="py-2 pr-2 font-semibold text-gray-800">{d.productName}</td>
                              <td className="py-2 pr-2 text-right font-mono text-gray-600">{d.before}</td>
                              <td className="py-2 pr-2 text-right font-mono text-gray-600">{d.after}</td>
                              <td className={`py-2 pr-2 text-right font-mono font-bold ${d.diffQty === 0 ? 'text-gray-400' : d.diffQty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {d.diffQty > 0 ? '+' : ''}{d.diffQty}
                              </td>
                              <td className={`py-2 pr-2 text-right font-mono font-bold ${d.diffValue === 0 ? 'text-gray-400' : d.diffValue > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(d.diffValue, currencySymbol)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ReportSection>
    </div>
  );
};
