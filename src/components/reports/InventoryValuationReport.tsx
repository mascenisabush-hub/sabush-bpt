import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateBatch } from '../../utils/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReportHeader, ReportSection, ReportKpiCard, InsightBanner, PillToggle, ReportEmptyState } from './shared/ReportUI';
import { exportReportPdf, exportReportExcel, printCurrentReport } from './shared/reportExport';
import { concentrationInsight } from './shared/reportInsights';
import { BarChartHorizontal } from './charts/MiniCharts';
import { Boxes, Gem, TrendingUp, Package, Layers, Percent, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type GroupBy = 'supplier' | 'batch' | 'product';

export const InventoryValuationReport: React.FC<Props> = ({ onBack }) => {
  const { business, currencySymbol, products, batches, purchaseBatches, quebras, activeBatchCount } = useApp();
  const [groupBy, setGroupBy] = useState<GroupBy>('supplier');

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const purchaseBatchByLineId = useMemo(() => {
    const map = new Map<string, string>(); // stockBatch.id -> purchaseBatch id
    batches.forEach(b => {
      if (b.purchaseBatchId) map.set(b.id, b.purchaseBatchId);
    });
    return map;
  }, [batches]);
  const purchaseBatchMap = useMemo(() => new Map(purchaseBatches.map(pb => [pb.id, pb])), [purchaseBatches]);

  const perBatchCalcs = useMemo(
    () => batches.map(b => ({ batch: b, calc: calculateBatch(b, quebras) })),
    [batches, quebras]
  );

  const totalInvestmentValue = perBatchCalcs.reduce((s, x) => s + x.calc.investmentValue, 0);
  const totalMarketValue = perBatchCalcs.reduce((s, x) => s + x.calc.marketValue, 0);
  const totalEmbeddedProfit = totalMarketValue - totalInvestmentValue;
  const avgMargin = totalInvestmentValue > 0 ? (totalEmbeddedProfit / totalInvestmentValue) * 100 : 0;

  // Per-product aggregation (always computed — used for KPIs and Product grouping)
  const perProduct = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; investment: number; market: number; profit: number }>();
    perBatchCalcs.forEach(({ batch, calc }) => {
      const p = productMap.get(batch.productId);
      const name = p?.name || 'Produto Removido';
      const existing = map.get(batch.productId) || { productId: batch.productId, name, investment: 0, market: 0, profit: 0 };
      existing.investment += calc.investmentValue;
      existing.market += calc.marketValue;
      existing.profit += calc.embeddedProfit;
      map.set(batch.productId, existing);
    });
    return Array.from(map.values()).filter(p => p.market !== 0 || p.investment !== 0);
  }, [perBatchCalcs, productMap]);

  const highestValueProduct = perProduct.length ? [...perProduct].sort((a, b) => b.market - a.market)[0] : null;
  const lowestValueProduct = perProduct.length ? [...perProduct].sort((a, b) => a.market - b.market)[0] : null;

  // Grouping data (supplier / batch / product) built purely from calculateBatch results
  const grouped = useMemo(() => {
    if (groupBy === 'product') {
      return perProduct.map(p => ({ key: p.productId, label: p.name, investment: p.investment, market: p.market, profit: p.profit }));
    }
    if (groupBy === 'batch') {
      const map = new Map<string, { key: string; label: string; investment: number; market: number; profit: number }>();
      perBatchCalcs.forEach(({ batch, calc }) => {
        const pbId = purchaseBatchByLineId.get(batch.id);
        const pb = pbId ? purchaseBatchMap.get(pbId) : undefined;
        const key = pb?.id || `sem-lote-${batch.dateEntered}`;
        const label = pb ? `${pb.batchNumber} — ${formatDate(pb.date)}` : `Sem Lote (${formatDate(batch.dateEntered)})`;
        const existing = map.get(key) || { key, label, investment: 0, market: 0, profit: 0 };
        existing.investment += calc.investmentValue;
        existing.market += calc.marketValue;
        existing.profit += calc.embeddedProfit;
        map.set(key, existing);
      });
      return Array.from(map.values());
    }
    // supplier
    const map = new Map<string, { key: string; label: string; investment: number; market: number; profit: number }>();
    perBatchCalcs.forEach(({ batch, calc }) => {
      const pbId = purchaseBatchByLineId.get(batch.id);
      const pb = pbId ? purchaseBatchMap.get(pbId) : undefined;
      const key = pb?.supplier.name || 'Fornecedor Não Especificado';
      const existing = map.get(key) || { key, label: key, investment: 0, market: 0, profit: 0 };
      existing.investment += calc.investmentValue;
      existing.market += calc.marketValue;
      existing.profit += calc.embeddedProfit;
      map.set(key, existing);
    });
    return Array.from(map.values());
  }, [groupBy, perProduct, perBatchCalcs, purchaseBatchByLineId, purchaseBatchMap]);

  const groupedSorted = [...grouped].filter(g => g.market !== 0 || g.investment !== 0).sort((a, b) => b.market - a.market);

  const insights = useMemo(() => {
    const lines: string[] = [];
    const concEntity = groupBy === 'supplier' ? 'fornecedores' : groupBy === 'batch' ? 'lotes' : 'produtos';
    const c = concentrationInsight(concEntity, groupedSorted.map(g => ({ label: g.label, value: g.market })), totalMarketValue);
    if (c) lines.push(c);
    if (highestValueProduct) {
      lines.push(`${highestValueProduct.name} é o produto de maior valor em stock, com ${formatCurrency(highestValueProduct.market, currencySymbol)} em valor de mercado.`);
    }
    if (avgMargin !== 0) {
      lines.push(`A margem média ponderada do inventário atual é de ${avgMargin.toFixed(1)}%.`);
    }
    return lines;
  }, [groupBy, groupedSorted, totalMarketValue, highestValueProduct, currencySymbol, avgMargin]);

  const groupLabel = groupBy === 'supplier' ? 'Fornecedor' : groupBy === 'batch' ? 'Lote de Compra' : 'Produto';

  const handleExportPdf = () => {
    exportReportPdf(
      'Avaliação de Inventário',
      business?.name || 'Sabush',
      `Agrupado por ${groupLabel}`,
      [
        { label: 'Custo do Inventário Atual', value: formatCurrency(totalInvestmentValue, currencySymbol) },
        { label: 'Valor de Mercado Atual', value: formatCurrency(totalMarketValue, currencySymbol) },
        { label: 'Lucro Embutido', value: formatCurrency(totalEmbeddedProfit, currencySymbol) },
        { label: 'Número de Produtos', value: String(perProduct.length) },
        { label: 'Lotes Ativos', value: String(activeBatchCount) },
        { label: 'Margem Média Ponderada', value: `${avgMargin.toFixed(1)}%` },
        { label: 'Produto de Maior Valor', value: highestValueProduct ? `${highestValueProduct.name} (${formatCurrency(highestValueProduct.market, currencySymbol)})` : '—' },
        { label: 'Produto de Menor Valor', value: lowestValueProduct ? `${lowestValueProduct.name} (${formatCurrency(lowestValueProduct.market, currencySymbol)})` : '—' },
      ],
      [
        {
          title: `Inventário por ${groupLabel}`,
          columns: [groupLabel, 'Valor de Investimento', 'Valor de Mercado', 'Lucro Embutido'],
          rows: groupedSorted.map(g => [g.label, formatCurrency(g.investment, currencySymbol), formatCurrency(g.market, currencySymbol), formatCurrency(g.profit, currencySymbol)]),
        },
      ]
    );
  };

  const handleExportExcel = () => {
    exportReportExcel(
      'Avaliação de Inventário',
      [
        { label: 'Custo do Inventário Atual', value: formatCurrency(totalInvestmentValue, currencySymbol) },
        { label: 'Valor de Mercado Atual', value: formatCurrency(totalMarketValue, currencySymbol) },
        { label: 'Lucro Embutido', value: formatCurrency(totalEmbeddedProfit, currencySymbol) },
        { label: 'Número de Produtos', value: String(perProduct.length) },
        { label: 'Lotes Ativos', value: String(activeBatchCount) },
        { label: 'Margem Média Ponderada', value: `${avgMargin.toFixed(1)}%` },
      ],
      [
        {
          title: `Por ${groupLabel}`,
          columns: [groupLabel, 'Investimento', 'Mercado', 'Lucro Embutido'],
          rows: groupedSorted.map(g => [g.label, g.investment, g.market, g.profit]),
        },
      ]
    );
  };

  return (
    <div className="space-y-4 pb-12 report-print-area">
      <ReportHeader
        title="Avaliação de Inventário"
        description="Quanto inventário existe hoje e o que vale."
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={printCurrentReport}
      />

      <InsightBanner insights={insights} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportKpiCard icon={Boxes} label="Custo do Inventário" value={formatCurrency(totalInvestmentValue, currencySymbol)} />
        <ReportKpiCard icon={Gem} label="Valor de Mercado" value={formatCurrency(totalMarketValue, currencySymbol)} tone="accent" />
        <ReportKpiCard icon={TrendingUp} label="Lucro Embutido" value={formatCurrency(totalEmbeddedProfit, currencySymbol)} tone={totalEmbeddedProfit >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard icon={Percent} label="Margem Média" value={`${avgMargin.toFixed(1)}%`} />
        <ReportKpiCard icon={Package} label="Número de Produtos" value={String(perProduct.length)} />
        <ReportKpiCard icon={Layers} label="Lotes Ativos" value={String(activeBatchCount)} />
        <ReportKpiCard icon={ArrowUp} label="Produto de Maior Valor" value={highestValueProduct ? formatCurrency(highestValueProduct.market, currencySymbol) : '—'} sub={highestValueProduct?.name} tone="positive" />
        <ReportKpiCard icon={ArrowDown} label="Produto de Menor Valor" value={lowestValueProduct ? formatCurrency(lowestValueProduct.market, currencySymbol) : '—'} sub={lowestValueProduct?.name} />
      </div>

      <ReportSection
        title={`Inventário por ${groupLabel}`}
        icon={Layers}
        right={
          <PillToggle
            value={groupBy}
            onChange={v => setGroupBy(v as GroupBy)}
            options={[
              { value: 'supplier', label: 'Fornecedor' },
              { value: 'batch', label: 'Lote' },
              { value: 'product', label: 'Produto' },
            ]}
          />
        }
      >
        {groupedSorted.length === 0 ? (
          <ReportEmptyState message="Sem inventário registado ainda." />
        ) : (
          <BarChartHorizontal currencySymbol={currencySymbol} data={groupedSorted.slice(0, 12).map(g => ({ label: g.label, value: g.market }))} />
        )}
      </ReportSection>

      <ReportSection title="Detalhe" icon={Boxes}>
        {groupedSorted.length === 0 ? (
          <ReportEmptyState message="Sem dados para mostrar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2 font-semibold">{groupLabel}</th>
                  <th className="py-2 pr-2 font-semibold text-right">Investimento</th>
                  <th className="py-2 pr-2 font-semibold text-right">Mercado</th>
                  <th className="py-2 pr-2 font-semibold text-right">Lucro Embutido</th>
                </tr>
              </thead>
              <tbody>
                {groupedSorted.map(g => (
                  <tr key={g.key} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-semibold text-gray-800">{g.label}</td>
                    <td className="py-2 pr-2 text-right font-mono text-gray-700">{formatCurrency(g.investment, currencySymbol)}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-gray-900">{formatCurrency(g.market, currencySymbol)}</td>
                    <td className={`py-2 pr-2 text-right font-mono font-bold ${g.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(g.profit, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
    </div>
  );
};
