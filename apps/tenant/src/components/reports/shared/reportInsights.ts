import { formatCurrency } from '../../../utils/formatters';

/**
 * Every function here turns numbers the caller already computed (from the
 * existing calculation engine) into a plain-language sentence. Nothing is
 * inferred beyond arithmetic on those numbers — no assumptions about why a
 * number moved.
 *
 * A `t` translate function (from useLanguage()) is threaded through so the
 * generated sentences come out in the active language — only the fixed
 * connective words/phrases are translated; labels and numbers passed in by
 * the caller are used as-is.
 */

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function trendInsight(
  t: TFunc,
  label: string,
  current: number,
  previous: number,
  currencySymbol: string
): string | null {
  const change = pctChange(current, previous);
  if (change === null) return null;
  const direction = change >= 0 ? t('reports.common.trendIncreased') : t('reports.common.trendDecreased');
  return t('reports.common.trendSentence', {
    label,
    direction,
    pct: Math.abs(change).toFixed(1),
    previous: formatCurrency(previous, currencySymbol),
    current: formatCurrency(current, currencySymbol),
  });
}

export function concentrationInsight(
  t: TFunc,
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
  if (sorted.length === 1) {
    return t('reports.common.concentrationSingle', { label: sorted[0].label, pct: pct.toFixed(0) });
  }
  return t('reports.common.concentrationMultiple', {
    count: sorted.length,
    entityLabelPlural,
    pct: pct.toFixed(0),
  });
}

export function shareInsight(t: TFunc, part: string, partValue: number, whole: string, wholeValue: number): string | null {
  if (wholeValue <= 0) return null;
  const pct = (partValue / wholeValue) * 100;
  return t('reports.common.shareOf', { part, pct: pct.toFixed(0), whole });
}
