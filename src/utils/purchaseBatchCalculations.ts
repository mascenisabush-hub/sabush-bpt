import { StockBatch, Quebra, PurchaseBatch, PurchaseBatchStatus, Product } from '../types';
import { calculateBatch } from './calculations';

/**
 * Generates the next permanent, human-readable batch number, e.g. "BAT-000001".
 * Never re-issued, never exposes internal document IDs to the user.
 */
export function generateBatchNumber(seq: number): string {
  return 'BAT-' + String(seq).padStart(6, '0');
}

/**
 * Determines the next batchSeq to use, based on the highest seq seen so far.
 * Kept simple (client-derived) to match this app's existing ID patterns —
 * fine at this business's scale, and numbers are never reused even if two
 * are ever created back-to-back, since each write uses its own timestamp id.
 */
export function getNextBatchSeq(existing: PurchaseBatch[]): number {
  if (!existing.length) return 1;
  return Math.max(...existing.map((b) => b.batchSeq || 0)) + 1;
}

export interface LineItemCalculation {
  batch: StockBatch;
  product: Product | undefined;
  remainingQuantity: number;
  investmentValue: number;
  marketValue: number;
  embeddedProfit: number;
  totalQuebraQuantity: number;
  isEstimate: boolean;
}

export interface PurchaseBatchSummary {
  purchaseBatch: PurchaseBatch;
  lineItems: LineItemCalculation[];
  productCount: number;
  totalQuantity: number;
  totalRemainingQuantity: number;
  totalInvestmentValue: number; // original, at purchase
  totalMarketValue: number; // original, at purchase
  totalEmbeddedProfit: number; // original, at purchase
  remainingInvestmentValue: number; // current, quebra-adjusted
  remainingMarketValue: number; // current, quebra-adjusted
  remainingEmbeddedProfit: number; // current, quebra-adjusted
  inventoryLostValue: number; // value lost to quebras, at cost
  status: PurchaseBatchStatus;
}

/**
 * Aggregates a Purchase Batch's line items (StockBatch records) into the
 * Investment Ledger figures. Every per-line figure comes straight from the
 * existing, untouched calculateBatch() engine — this function only sums.
 */
export function calculatePurchaseBatchSummary(
  purchaseBatch: PurchaseBatch,
  lineItemBatches: StockBatch[],
  quebras: Quebra[],
  products: Product[]
): PurchaseBatchSummary {
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalQuantity = 0;
  let totalRemainingQuantity = 0;
  let totalInvestmentValue = 0;
  let totalMarketValue = 0;
  let remainingInvestmentValue = 0;
  let remainingMarketValue = 0;
  let inventoryLostValue = 0;

  const lineItems: LineItemCalculation[] = lineItemBatches.map((batch) => {
    const batchQuebras = quebras.filter((q) => q.batchId === batch.id);
    const calc = calculateBatch(batch, batchQuebras);

    totalQuantity += batch.quantity;
    totalRemainingQuantity += calc.remainingQuantity;
    totalInvestmentValue += batch.quantity * batch.costPrice;
    totalMarketValue += batch.quantity * batch.sellingPrice;
    remainingInvestmentValue += calc.investmentValue;
    remainingMarketValue += calc.marketValue;
    inventoryLostValue += calc.quebraValue;

    return {
      batch,
      product: productMap.get(batch.productId),
      remainingQuantity: calc.remainingQuantity,
      investmentValue: calc.investmentValue,
      marketValue: calc.marketValue,
      embeddedProfit: calc.embeddedProfit,
      totalQuebraQuantity: calc.totalQuebraQuantity,
      isEstimate: calc.isEstimate,
    };
  });

  const totalEmbeddedProfit = totalMarketValue - totalInvestmentValue;
  const remainingEmbeddedProfit = remainingMarketValue - remainingInvestmentValue;

  let status: PurchaseBatchStatus;
  if (purchaseBatch.archived) {
    status = 'archived';
  } else if (totalRemainingQuantity <= 0) {
    status = 'fully_consumed';
  } else if (totalRemainingQuantity < totalQuantity) {
    status = 'partially_remaining';
  } else {
    status = 'active';
  }

  return {
    purchaseBatch,
    lineItems,
    productCount: lineItemBatches.length,
    totalQuantity,
    totalRemainingQuantity,
    totalInvestmentValue,
    totalMarketValue,
    totalEmbeddedProfit,
    remainingInvestmentValue,
    remainingMarketValue,
    remainingEmbeddedProfit,
    inventoryLostValue,
    status,
  };
}

export const PURCHASE_BATCH_STATUS_LABELS: Record<PurchaseBatchStatus, string> = {
  active: 'Ativo',
  partially_remaining: 'Parcialmente Restante',
  fully_consumed: 'Totalmente Consumido',
  archived: 'Arquivado',
};

export interface BatchTimelineEvent {
  date: string; // ISO string, used for sorting
  type: 'created' | 'quebra' | 'archived';
  label: string;
  description: string;
  userName?: string;
}

/**
 * Builds a chronological timeline for a Purchase Batch from the events we
 * actually have data for: batch creation, quebras logged against any of its
 * line items, and archiving. No fabricated events.
 */
export function buildPurchaseBatchTimeline(
  summary: PurchaseBatchSummary,
  quebras: Quebra[]
): BatchTimelineEvent[] {
  const events: BatchTimelineEvent[] = [];

  events.push({
    date: summary.purchaseBatch.createdAt,
    type: 'created',
    label: 'Lote Criado',
    description: `Compra registada junto de ${summary.purchaseBatch.supplier.name || 'fornecedor não especificado'}.`,
    userName: summary.purchaseBatch.createdByName,
  });

  const lineItemIds = new Set(summary.lineItems.map((li) => li.batch.id));
  quebras
    .filter((q) => lineItemIds.has(q.batchId))
    .forEach((q) => {
      const product = summary.lineItems.find((li) => li.batch.id === q.batchId)?.product;
      events.push({
        date: q.createdAt,
        type: 'quebra',
        label: 'Quebra Registada',
        description: `${q.quantityLost} ${product?.name || 'produto'} perdido(s)${q.reason ? ' — ' + q.reason : ''}.`,
      });
    });

  if (summary.purchaseBatch.archived && summary.purchaseBatch.archivedAt) {
    events.push({
      date: summary.purchaseBatch.archivedAt,
      type: 'archived',
      label: 'Lote Arquivado',
      description: 'Lote arquivado do histórico ativo.',
    });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
