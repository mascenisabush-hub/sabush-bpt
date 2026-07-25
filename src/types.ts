export type UserRole = 'owner' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerUid: string;
  category: string;
  currencySymbol: string;
  createdAt: string;
  contact?: string;
  location?: string;
  email?: string;
}

export interface StaffMember {
  uid: string;
  email: string;
  name: string;
  businessId: string;
  createdAt: string;
}

export type BatchStatus = 'open' | 'closed';

export interface Quebra {
  id: string;
  batchId: string;
  productId: string;
  date: string; // YYYY-MM-DD
  quantityLost: number;
  reason: string;
  createdAt: string; // ISO string
}

export interface StockBatch {
  id: string;
  productId: string;
  dateEntered: string; // YYYY-MM-DD
  quantity: number;
  unit?: string; // unit of measure e.g. un, cx, kg, saco
  costPrice: number; // per unit
  sellingPrice: number; // per unit
  status: BatchStatus;
  createdAt: string; // ISO string
}

export interface Product {
  id: string;
  name: string;
  createdAt: string; // ISO string
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category?: string;
  createdAt: string; // ISO string
}

// ============================================================
// STOCK COUNTS (Capital baseline + periodic physical counts)
// ============================================================
// IMPORTANT: A StockCount is NOT a purchase and NOT a batch. It records
// what the owner physically counts as already owned, at a point in time,
// for the purpose of establishing/verifying business capital. The very
// first StockCount a business ever records (type: 'initial') becomes the
// permanent INITIAL BUSINESS CAPITAL baseline and can never be re-created
// or edited afterwards — everything else is measured against it.
export type StockCountType = 'initial' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface StockCountItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
  costPrice: number; // cost per unit at the time of the count
  totalValue: number; // quantity * costPrice
}

export interface StockCount {
  id: string;
  type: StockCountType;
  label?: string; // owner-given label, mainly used for 'custom' counts
  date: string; // YYYY-MM-DD
  items: StockCountItem[];
  totalValue: number; // sum of all items' totalValue = inventory value at this count
  createdAt: string; // ISO string
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export interface BatchCalculation {
  batch: StockBatch;
  totalQuebraQuantity: number;
  quebraValue: number;
  remainingQuantity: number;
  assumedUnitsSold: number;
  cost: number;
  revenue: number;
  profit: number;
  isEstimate: boolean;
  hasExceededWarning: boolean;
}

export interface ProductReportDetail {
  product: Product;
  quantityEntered: number;
  totalCost: number;
  quebras: {
    quebra: Quebra;
    batchCostPrice: number;
    value: number;
  }[];
  totalQuebraQuantity: number;
  totalQuebraValue: number;
  assumedUnitsSold: number;
  totalRevenue: number;
  productProfit: number; // includes finalized profit + running estimates depending on option
  finalizedProfit: number;
  estimatedProfit: number;
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  productDetails: ProductReportDetail[];
  totalProductProfit: number;
  totalExpenses: number;
  netIncome: number;
  expensesList: Expense[];
}
