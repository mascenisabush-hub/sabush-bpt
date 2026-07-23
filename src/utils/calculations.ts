import { StockBatch, Quebra, BatchCalculation, Product, ProductReportDetail, Expense, ReportSummary } from '../types';

/**
 * Calculates financial & stock figures for a single Stock Batch according to core business rules.
 */
export function calculateBatch(batch: StockBatch, batchQuebras: Quebra[]): BatchCalculation {
  const relevantQuebras = batchQuebras.filter(q => q.batchId === batch.id);
  const totalQuebraQuantity = relevantQuebras.reduce((sum, q) => sum + Number(q.quantityLost || 0), 0);
  const quebraValue = totalQuebraQuantity * batch.costPrice;
  
  const remainingQuantity = batch.quantity - totalQuebraQuantity;
  // If batch is closed or open, assumed units sold is remaining_quantity
  const assumedUnitsSold = remainingQuantity;
  
  const cost = batch.quantity * batch.costPrice;
  const revenue = assumedUnitsSold * batch.sellingPrice;
  const profit = revenue - cost;

  const isEstimate = batch.status === 'open';
  const hasExceededWarning = totalQuebraQuantity > batch.quantity;

  return {
    batch,
    totalQuebraQuantity,
    quebraValue,
    remainingQuantity,
    assumedUnitsSold,
    cost,
    revenue,
    profit,
    isEstimate,
    hasExceededWarning,
  };
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
 * Generates custom date range reports per product and overall business net income.
 */
export function generateReportSummary(
  startDate: string,
  endDate: string,
  products: Product[],
  batches: StockBatch[],
  quebras: Quebra[],
  expenses: Expense[]
): ReportSummary {
  // Filter batches in range
  const batchesInRange = batches.filter(b => isDateInRange(b.dateEntered, startDate, endDate));
  
  // Filter quebras in range
  const quebrasInRange = quebras.filter(q => isDateInRange(q.date, startDate, endDate));

  // Filter expenses in range
  const expensesInRange = expenses.filter(e => isDateInRange(e.date, startDate, endDate));

  const productDetails: ProductReportDetail[] = products.map(product => {
    const productBatchesInRange = batchesInRange.filter(b => b.productId === product.id);
    const productQuebrasInRange = quebrasInRange.filter(q => q.productId === product.id);

    let totalQuantityEntered = 0;
    let totalCost = 0;
    let totalRevenue = 0;
    let totalAssumedUnitsSold = 0;
    let finalizedProfit = 0;
    let estimatedProfit = 0;

    productBatchesInRange.forEach(batch => {
      // Find all quebras for this batch (even if quebra date differs slightly, or match quebras in range)
      const batchQuebras = quebras.filter(q => q.batchId === batch.id);
      const calc = calculateBatch(batch, batchQuebras);

      totalQuantityEntered += batch.quantity;
      totalCost += calc.cost;
      totalRevenue += calc.revenue;
      totalAssumedUnitsSold += calc.assumedUnitsSold;

      if (batch.status === 'closed') {
        finalizedProfit += calc.profit;
      } else {
        estimatedProfit += calc.profit;
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

    const productProfit = totalRevenue - totalCost;

    return {
      product,
      quantityEntered: totalQuantityEntered,
      totalCost,
      quebras: quebrasDetailed,
      totalQuebraQuantity,
      totalQuebraValue,
      assumedUnitsSold: totalAssumedUnitsSold,
      totalRevenue,
      productProfit,
      finalizedProfit,
      estimatedProfit,
    };
  });

  // Filter out products that have no activity in period if desired, or keep all products with activity
  const activeProductDetails = productDetails.filter(p => 
    p.quantityEntered > 0 || p.quebras.length > 0
  );

  const totalProductProfit = productDetails.reduce((sum, p) => sum + p.productProfit, 0);
  const totalExpenses = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netIncome = totalProductProfit - totalExpenses;

  return {
    startDate,
    endDate,
    productDetails: activeProductDetails.length > 0 ? activeProductDetails : productDetails,
    totalProductProfit,
    totalExpenses,
    netIncome,
    expensesList: expensesInRange,
  };
}
