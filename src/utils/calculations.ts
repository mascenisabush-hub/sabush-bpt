import { StockBatch, Quebra, BatchCalculation, Product, ProductReportDetail, Expense, ReportSummary, Withdrawal } from '../types';

/**
 * Calculates Investment Value / Market Value / Embedded Profit for a single
 * Stock Batch. IMPORTANT: this app never records sales, so nothing here is
 * "revenue" or "profit realized" — it is potential profit embedded in
 * unsold inventory. Quebras (losses) reduce remaining quantity, which
 * reduces Investment Value and Market Value on the exact same basis.
 */
export function calculateBatch(batch: StockBatch, batchQuebras: Quebra[]): BatchCalculation {
  const relevantQuebras = batchQuebras.filter(q => q.batchId === batch.id);
  const totalQuebraQuantity = relevantQuebras.reduce((sum, q) => sum + Number(q.quantityLost || 0), 0);
  const quebraValue = totalQuebraQuantity * batch.costPrice;

  // [Business Calculation Compliance Audit V-5] Financial valuation must
  // never go negative, even if logged quebra quantity exceeds the batch's
  // original quantity (a data-entry edge case). `totalQuebraQuantity` above
  // is left untouched — it is the audit-trail record of what was actually
  // logged, not a valuation figure — and `hasExceededWarning` below still
  // fires exactly as before, so the fact that excessive quebra occurred is
  // fully preserved. Only the *quantity used for valuation* is floored.
  const remainingQuantity = Math.max(0, batch.quantity - totalQuebraQuantity);

  // Both values computed off the SAME basis (remainingQuantity) — a quebra
  // reduces Investment Value and Market Value identically, never one alone.
  const investmentValue = remainingQuantity * batch.costPrice;
  const marketValue = remainingQuantity * batch.sellingPrice;
  const embeddedProfit = marketValue - investmentValue;

  const isEstimate = batch.status === 'open';
  const hasExceededWarning = totalQuebraQuantity > batch.quantity;

  return {
    batch,
    totalQuebraQuantity,
    quebraValue,
    remainingQuantity,
    investmentValue,
    marketValue,
    embeddedProfit,
    isEstimate,
    hasExceededWarning,
  };
}

/**
 * Groups a Quebra list by batchId once, so callers iterating many batches
 * can look up each batch's quebras in O(1) instead of filtering the full
 * list per batch. Same semantics as `quebras.filter(q => q.batchId === id)`
 * — batches with no quebras simply have no entry (callers use `?? []`).
 */
export function groupQuebrasByBatch(quebras: Quebra[]): Map<string, Quebra[]> {
  const map = new Map<string, Quebra[]>();
  for (const q of quebras) {
    const existing = map.get(q.batchId);
    if (existing) {
      existing.push(q);
    } else {
      map.set(q.batchId, [q]);
    }
  }
  return map;
}

/**
 * Aggregates Investment Value, Market Value and Embedded Profit across a
 * set of batches. This is the single source of truth for any aggregate
 * inventory figure (Dashboard cards, Reports, Closings) — nothing else
 * should re-derive these totals independently.
 */
export function calculateInventoryTotals(batches: StockBatch[], quebras: Quebra[]) {
  let totalInvestmentValue = 0;
  let totalMarketValue = 0;
  let totalEmbeddedProfit = 0;
  let activeBatchCount = 0;

  const quebrasByBatch = groupQuebrasByBatch(quebras);

  batches.forEach((batch) => {
    const calc = calculateBatch(batch, quebrasByBatch.get(batch.id) ?? []);
    totalInvestmentValue += calc.investmentValue;
    totalMarketValue += calc.marketValue;
    totalEmbeddedProfit += calc.embeddedProfit;
    if (calc.remainingQuantity > 0) activeBatchCount += 1;
  });

  return { totalInvestmentValue, totalMarketValue, totalEmbeddedProfit, activeBatchCount };
}

/**
 * Checks if adding a new quebra quantity will cause total losses to exceed batch's initial stock.
 */
export function isQuebraExceedingWarning(batch: StockBatch, existingQuebras: Quebra[], newQuantity: number): boolean {
  const batchQuebras = existingQuebras.filter(q => q.batchId === batch.id);
  const currentLoss = batchQuebras.reduce((sum, q) => sum + Number(q.quantityLost || 0), 0);
  return (currentLoss + Number(newQuantity || 0)) > batch.quantity;
}

/**
 * Helper to check if date string YYYY-MM-DD falls within [start, end] inclusive.
 */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  // Standard string comparison YYYY-MM-DD works natively!
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

/**
 * Generates custom date range reports per product and overall business
 * Embedded Profit. Nothing here implies a sale occurred.
 */
export function generateReportSummary(
  startDate: string,
  endDate: string,
  products: Product[],
  batches: StockBatch[],
  quebras: Quebra[],
  expenses: Expense[],
  withdrawals: Withdrawal[] = []
): ReportSummary {
  // Filter batches in range
  const batchesInRange = batches.filter(b => isDateInRange(b.dateEntered, startDate, endDate));

  // Filter quebras in range
  const quebrasInRange = quebras.filter(q => isDateInRange(q.date, startDate, endDate));

  // Filter expenses in range
  const expensesInRange = expenses.filter(e => isDateInRange(e.date, startDate, endDate));

  // Filter withdrawals in range
  const withdrawalsInRange = withdrawals.filter(w => isDateInRange(w.date, startDate, endDate));

  // Grouped once for the whole report, not re-filtered per batch/product.
  const allQuebrasByBatch = groupQuebrasByBatch(quebras);

  const productDetails: ProductReportDetail[] = products.map(product => {
    const productBatchesInRange = batchesInRange.filter(b => b.productId === product.id);
    const productQuebrasInRange = quebrasInRange.filter(q => q.productId === product.id);

    let totalQuantityEntered = 0;
    let totalInvestmentValue = 0;
    let totalMarketValue = 0;
    let finalizedEmbeddedProfit = 0;
    let estimatedEmbeddedProfit = 0;

    productBatchesInRange.forEach(batch => {
      // Find all quebras for this batch (not just ones in range — a batch's
      // remaining quantity depends on every quebra ever logged against it).
      const batchQuebras = allQuebrasByBatch.get(batch.id) ?? [];
      const calc = calculateBatch(batch, batchQuebras);

      totalQuantityEntered += batch.quantity;
      totalInvestmentValue += calc.investmentValue;
      totalMarketValue += calc.marketValue;

      if (batch.status === 'closed') {
        finalizedEmbeddedProfit += calc.embeddedProfit;
      } else {
        estimatedEmbeddedProfit += calc.embeddedProfit;
      }
    });

    // Detail each quebra for this product in range
    const quebrasDetailed = productQuebrasInRange.map(q => {
      const linkedBatch = batches.find(b => b.id === q.batchId);
      const batchCostPrice = linkedBatch ? linkedBatch.costPrice : 0;
      return {
        quebra: q,
        batchCostPrice,
        value: q.quantityLost * batchCostPrice,
      };
    });

    const totalQuebraQuantity = quebrasDetailed.reduce((sum, item) => sum + item.quebra.quantityLost, 0);
    const totalQuebraValue = quebrasDetailed.reduce((sum, item) => sum + item.value, 0);

    const productEmbeddedProfit = totalMarketValue - totalInvestmentValue;

    return {
      product,
      quantityEntered: totalQuantityEntered,
      totalInvestmentValue,
      quebras: quebrasDetailed,
      totalQuebraQuantity,
      totalQuebraValue,
      totalMarketValue,
      productEmbeddedProfit,
      finalizedEmbeddedProfit,
      estimatedEmbeddedProfit,
    };
  });

  // Filter out products that have no activity in period if desired, or keep all products with activity
  const activeProductDetails = productDetails.filter(p =>
    p.quantityEntered > 0 || p.quebras.length > 0
  );

  const totalEmbeddedProfit = productDetails.reduce((sum, p) => sum + p.productEmbeddedProfit, 0);
  const totalExpenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalWithdrawals = withdrawalsInRange.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  return {
    startDate,
    endDate,
    productDetails: activeProductDetails.length > 0 ? activeProductDetails : productDetails,
    totalEmbeddedProfit,
    totalExpenses,
    totalWithdrawals,
    expensesList: expensesInRange,
  };
}
