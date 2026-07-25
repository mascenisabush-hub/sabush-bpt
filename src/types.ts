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
  // Links this per-product stock line back to the Purchase Batch (the
  // investment/purchase event) it was bought under. Optional because
  // batches created before this feature existed have no Purchase Batch —
  // those are still shown in the Investment Ledger, just grouped by date
  // instead, so no historical data is ever lost or hidden.
  purchaseBatchId?: string;
}

// ============================================================
// SUPPLIER (attached to a Purchase Batch, not to individual products)
// ============================================================
export interface Supplier {
  name: string;
  phone?: string;
  notes?: string;
}

// A Purchase Batch's status is always derived automatically from its line
// items' remaining quantities (see calculatePurchaseBatchSummary) — never
// stored/edited directly, except for 'archived' which is an explicit,
// reversible owner action to declutter old, fully-settled investments.
export type PurchaseBatchStatus = 'active' | 'partially_remaining' | 'fully_consumed' | 'archived';

// ============================================================
// PURCHASE BATCH — one real-world stock purchase / investment event.
// ============================================================
// A Purchase Batch is the "envelope" around one or more StockBatch line
// items (one per product) that were all bought together, on the same
// date, from the same supplier. This is what the Investment Ledger
// (Batch History) is built around. It never carries its own cost/price
// figures — those always come from its StockBatch line items via the
// existing Embedded Profit engine in calculations.ts.
export interface PurchaseBatch {
  id: string;
  batchNumber: string; // human-readable, permanent, e.g. "BAT-000001"
  batchSeq: number; // numeric sequence used to generate batchNumber
  date: string; // YYYY-MM-DD — purchase date
  supplier: Supplier;
  notes?: string;
  createdByName?: string; // display name of whoever recorded the purchase
  createdAt: string; // ISO string
  archived?: boolean;
  archivedAt?: string; // ISO string
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

// Owner Withdrawals: money taken out of the business by the owner for
// personal use. This is intentionally a SEPARATE concept from Expense —
// a withdrawal is not a business cost, it's capital leaving the business
// in the owner's hands. Never merge these two collections.
export interface Withdrawal {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason?: string; // e.g. Uso Pessoal, Salário, Família, Emergência, Casa, Veículo, Outro
  notes?: string;
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

// ============================================================
// CLOSINGS (Monthly/Yearly period locking)
// ============================================================
// A Closing permanently "locks" a calendar period (a month or a year).
// Once recorded, that period's figures (profit, expenses, withdrawals)
// are frozen as historical fact, alongside a snapshot of Business Worth
// at the moment of closing. Closings are never edited — only recorded
// or, in case of a mistake, deleted (which simply re-opens the period).
export type ClosingPeriodType = 'monthly' | 'yearly';

export interface Closing {
  id: string;
  periodType: ClosingPeriodType;
  periodLabel: string; // e.g. "Julho 2026" or "2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  // Embedded Profit is NOT realized income — no sales are ever recorded in
  // this app. It's the profit "built in" to inventory if it eventually
  // sells at the marked selling price. Never call this "netIncome" or
  // "revenue" anywhere in the UI.
  totalEmbeddedProfit: number;
  totalExpenses: number;
  totalWithdrawals: number;
  // Business Worth snapshot at the moment the period was closed.
  inventoryCostAtClose: number;
  inventoryMarketValueAtClose: number;
  businessWorthAtClose: number;
  closedAt: string; // ISO string
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

// ============================================================
// BATCH CALCULATIONS — no sales are ever recorded in this app.
// ============================================================
// A batch's remaining quantity (after quebras) has TWO independent
// values, always shown side by side, never netted into a single number
// that implies a sale happened:
//   - Investment Value = what was actually paid for the remaining stock
//     (remainingQuantity * costPrice)
//   - Market Value = what the remaining stock is marked to sell for
//     (remainingQuantity * sellingPrice)
//   - Embedded Profit = Market Value - Investment Value. This is
//     POTENTIAL profit baked into unsold inventory, never realized
//     income. Quebras reduce Investment Value and Market Value on the
//     exact same basis (remainingQuantity), so Embedded Profit shrinks
//     consistently on both sides.
export interface BatchCalculation {
  batch: StockBatch;
  totalQuebraQuantity: number;
  quebraValue: number; // quebra loss valued at cost
  remainingQuantity: number;
  investmentValue: number;
  marketValue: number;
  embeddedProfit: number;
  isEstimate: boolean; // true while batch is still 'open'
  hasExceededWarning: boolean;
}

export interface ProductReportDetail {
  product: Product;
  quantityEntered: number;
  totalInvestmentValue: number;
  quebras: {
    quebra: Quebra;
    batchCostPrice: number;
    value: number;
  }[];
  totalQuebraQuantity: number;
  totalQuebraValue: number;
  totalMarketValue: number;
  productEmbeddedProfit: number; // Market Value - Investment Value across all batches in range
  finalizedEmbeddedProfit: number; // from closed batches only
  estimatedEmbeddedProfit: number; // from still-open batches only
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  productDetails: ProductReportDetail[];
  totalEmbeddedProfit: number;
  totalExpenses: number;
  totalWithdrawals: number;
  expensesList: Expense[];
}

// ============================================================
// BUSINESS TIMELINE — chronological history of the business.
// ============================================================
// A TimelineEvent is a permanent, append-only record of something that
// happened in the business. It never drives any calculation — it is a
// read-only narration layer written alongside the existing collections at
// the moment each action already happens (see AppContext). Nothing here
// is ever edited; if a mistake needs correcting, a new event describing
// the correction is what would be added — the log itself stays intact.
export type TimelineActivityType =
  | 'initial-stock-count'
  | 'stock-batch-created'
  | 'stock-verification'
  | 'expense-recorded'
  | 'withdrawal-recorded'
  | 'quebra-recorded'
  | 'product-created'
  | 'business-profile-updated'
  | 'monthly-closing'
  | 'yearly-closing'
  | 'report-exported';

export interface TimelineFinancialImpact {
  label: string; // e.g. "Investimento", "Despesa", "Retirada", "Perda"
  amount: number; // signed value: negative for money/stock leaving the business
  tone: 'positive' | 'negative' | 'neutral';
}

export interface TimelineEvent {
  id: string;
  type: TimelineActivityType;
  date: string; // YYYY-MM-DD — the business date of the underlying record
  createdAt: string; // ISO string — exact moment the event was logged; used for time-of-day display and default sort
  userName: string; // display name of whoever performed the action
  title: string;
  description: string;
  financialImpact?: TimelineFinancialImpact[];
  // Free-form structured fields for the Detail View. Each activity type
  // populates only the keys relevant to it (e.g. a batch event carries
  // batchNumber/supplier/investment; an expense carries category/amount).
  details?: Record<string, string | number | undefined>;
  // Denormalized fields purely for filtering/search — never a source of truth.
  productName?: string;
  supplierName?: string;
  batchNumber?: string;
  expenseCategory?: string;
}
