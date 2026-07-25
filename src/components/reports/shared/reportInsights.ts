import { formatCurrency } from '../../../utils/formatters';

/**
 * Every function here turns numbers the caller already computed (from the
 * existing calculation engine) into a plain-language sentence. Nothing is
 * inferred beyond arithmetic on those numbers — no assumptions about why a
 * number moved.
 */

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function trendInsight(label: string, current: number, previous: number, currencySymbol: string): string | null {
  const change = pctChange(current, previous);
  if (change === null) return null;
  const direction = change >= 0 ? 'aumentou' : 'diminuiu';
  return `${label} ${direction} ${Math.abs(change).toFixed(1)}% em relação ao período anterior (${formatCurrency(previous, currencySymbol)} → ${formatCurrency(current, currencySymbol)}).`;
}

export function concentrationInsight(
  entityLabelPlural: string,
  items: { label: string; value: number }[],
  totalValue: number,
  topN: number = 3
): string | null {
  if (!items.length || totalValue <= 0) return null;
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, topN);
  const sum = sorted.reduce((s, i) => s + i.value, 0);
  const pct = (sum / totalValue) * 100;
  if (pct < 40) return null;
  return `${sorted.length === 1 ? sorted[0].label : `${sorted.length} ${entityLabelPlural}`} representa${sorted.length === 1 ? '' : 'm'} ${pct.toFixed(0)}% do total.`;
}

export function shareInsight(part: string, partValue: number, whole: string, wholeValue: number): string | null {
  if (wholeValue <= 0) return null;
  const pct = (partValue / wholeValue) * 100;
  return `${part} corresponde a ${pct.toFixed(0)}% de ${whole}.`;
}
