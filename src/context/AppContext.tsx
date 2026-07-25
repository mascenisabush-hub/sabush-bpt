import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch as createFirestoreBatch,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  Product,
  StockBatch,
  Quebra,
  Expense,
  UserProfile,
  Business,
  StaffMember,
  StockCount,
  StockCountType,
  Withdrawal,
  Closing,
  ClosingPeriodType,
  PurchaseBatch,
  Supplier,
  TimelineEvent,
  TimelineActivityType,
  TimelineFinancialImpact,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_BATCHES, INITIAL_QUEBRAS, INITIAL_EXPENSES } from '../data/sampleData';
import { calculateInventoryTotals, generateReportSummary, isDateInRange } from '../utils/calculations';
import { generateBatchNumber, getNextBatchSeq } from '../utils/purchaseBatchCalculations';
import { getTodayDateString } from '../utils/formatters';

interface AddStockParams {
  productName: string;
  dateEntered: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
}

interface AddQuebraParams {
  productId: string;
  batchId: string;
  date: string;
  quantityLost: number;
  reason: string;
}

interface AddExpenseParams {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

interface AddWithdrawalParams {
  date: string;
  amount: number;
  reason?: string;
  notes?: string;
}

interface RecordStockCountItemInput {
  productName: string;
  quantity: number;
  unit?: string;
  costPrice: number;
}

interface RecordStockCountParams {
  type: StockCountType;
  label?: string;
  date: string;
  items: RecordStockCountItemInput[];
}

interface RecordClosingParams {
  periodType: ClosingPeriodType;
  periodLabel: string;
  startDate: string;
  endDate: string;
}

interface AppContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  business: Business | null;
  isAuthLoading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  products: Product[];
  batches: StockBatch[];
  purchaseBatches: PurchaseBatch[];
  quebras: Quebra[];
  expenses: Expense[];
  stockCounts: StockCount[];
  withdrawals: Withdrawal[];
  staffMembers: StaffMember[];
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  businessCategory: string;
  setBusinessCategory: (category: string) => void;
  isBusinessProfileComplete: boolean;
  updateBusinessProfile: (profile: { name: string; category: string; contact: string; location: string; email: string }) => Promise<void>;
  addStockBatch: (params: AddStockParams) => Promise<{ productId: string; batchId: string }>;
  addMultipleStockBatches: (items: AddStockParams[], supplier?: Supplier, notes?: string) => Promise<{ purchaseBatchId: string | null }>;
  archivePurchaseBatch: (id: string) => Promise<void>;
  unarchivePurchaseBatch: (id: string) => Promise<void>;
  addQuebra: (params: AddQuebraParams) => Promise<Quebra>;
  addExpense: (params: AddExpenseParams) => Promise<Expense>;
  addWithdrawal: (params: AddWithdrawalParams) => Promise<Withdrawal>;
  deleteWithdrawal: (id: string) => Promise<void>;
  hasInitialStockCount: boolean;
  initialStockCount: StockCount | null;
  initialCapitalValue: number;
  recordStockCount: (params: RecordStockCountParams) => Promise<StockCount>;
  // Ground-truth physical count value (from the latest Stock Count), kept
  // separate from the batch-derived figures below. See the computation
  // block in AppProvider for the full rationale.
  latestStockCount: StockCount | null;
  currentInventoryValue: number;
  // Batch-derived, all-time inventory figures. Nothing here is "sold" or
  // "realized" — this app never records sales. Business Worth is honestly
  // built from Inventory Market Value minus what has actually left the
  // business (expenses, withdrawals) — never from an assumed cash ledger.
  totalInvestmentValueAllTime: number;
  totalMarketValueAllTime: number;
  totalEmbeddedProfitAllTime: number;
  activeBatchCount: number;
  totalExpensesAllTime: number;
  totalWithdrawalsAllTime: number;
  businessWorth: number;
  capitalGrowth: number;
  capitalGrowthPct: number;
  // Monthly/Yearly Closings — permanently lock a period's figures.
  closings: Closing[];
  recordClosing: (params: RecordClosingParams) => Promise<Closing>;
  deleteClosing: (id: string) => Promise<void>;
  isPeriodClosed: (periodType: ClosingPeriodType, startDate: string, endDate: string) => boolean;
  // Business Timeline — chronological history log (see types.ts). Populated
  // automatically by the actions above; logReportExport is the one manual
  // hook, called by the Reports screen when a report is exported/printed.
  timelineEvents: TimelineEvent[];
  logReportExport: (reportTitle: string) => Promise<void>;
  deleteQuebra: (id: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addStaffMember: (name: string, email: string, password: string) => Promise<void>;
  deleteStaffMember: (staffUid: string) => Promise<void>;
  createBusinessForOwner: (businessName: string, category: string, currencySymbol?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [purchaseBatches, setPurchaseBatches] = useState<PurchaseBatch[]>([]);
  const [quebras, setQuebras] = useState<Quebra[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  const isOwner = userProfile?.role === 'owner';
  const isStaff = userProfile?.role === 'staff';

  const currencySymbol = business?.currencySymbol || 'MT';
  const businessCategory = business?.category || '';

  // The one-and-only 'initial' StockCount establishes the permanent
  // Initial Business Capital baseline (see types.ts for the rationale).
  const initialStockCount = stockCounts.find((s) => s.type === 'initial') || null;
  const hasInitialStockCount = !!initialStockCount;
  const initialCapitalValue = initialStockCount?.totalValue || 0;

  // ============================================================
  // BUSINESS WORTH — no fabricated cash ledger.
  // ============================================================
  // Sabush never records sales, so there is no real "cash on hand" figure
  // to compute — a previous version of this app faked one by assuming
  // every remaining unit in every batch had been sold. That assumption
  // leaked into Business Worth and made it silently wrong. We don't
  // invent a substitute cash figure here.
  //
  // Current Inventory Value (ground truth) comes from the most recent
  // physical Stock Count — the owner's own snapshot of what's physically
  // on the shelf, at cost. It's kept as a separate, honest number and
  // used for stock-recount comparisons, not folded into Business Worth.
  const latestStockCount = stockCounts.length > 0
    ? [...stockCounts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const currentInventoryValue = latestStockCount?.totalValue || 0;

  // Batch-derived figures: Investment Value (what was paid), Market Value
  // (what it's marked to sell for) and Embedded Profit (the difference) —
  // all POTENTIAL, none realized. This is the single source of truth used
  // everywhere else (Dashboard, Reports, Closings).
  const {
    totalInvestmentValue: totalInvestmentValueAllTime,
    totalMarketValue: totalMarketValueAllTime,
    totalEmbeddedProfit: totalEmbeddedProfitAllTime,
    activeBatchCount,
  } = calculateInventoryTotals(batches, quebras);

  const totalExpensesAllTime = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalWithdrawalsAllTime = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  // Business Worth = Inventory Market Value − Expenses − Withdrawals.
  // Both Expenses and Withdrawals are real money that has actually left
  // the business; Inventory Market Value is what's genuinely on the shelf
  // valued at asking price. No assumed sale, no fabricated cash figure.
  const businessWorth = totalMarketValueAllTime - totalExpensesAllTime - totalWithdrawalsAllTime;
  // Growth is measured against the Initial Business Capital baseline —
  // the whole reason that baseline is permanent and never editable.
  const capitalGrowth = businessWorth - initialCapitalValue;
  const capitalGrowthPct = initialCapitalValue > 0 ? (capitalGrowth / initialCapitalValue) * 100 : 0;

  // A business is considered "complete" once it has a category plus the core
  // contact-card fields. Businesses created before these fields existed will
  // be missing them and get prompted once to fill the gap.
  const isBusinessProfileComplete = !!(
    business &&
    business.category &&
    business.contact &&
    business.location &&
    business.email
  );

  // Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setBusiness(null);
        setProducts([]);
        setBatches([]);
        setPurchaseBatches([]);
        setQuebras([]);
        setExpenses([]);
        setStockCounts([]);
        setWithdrawals([]);
        setClosings([]);
        setStaffMembers([]);
        setTimelineEvents([]);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to User Profile when auth user exists
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    }, (error) => {
      console.error('Error fetching user profile:', error);
      setIsAuthLoading(false);
    });

    return () => unsubscribeUser();
  }, [currentUser]);

  // Listen to Business and Subcollections when userProfile and businessId exist
  useEffect(() => {
    if (!userProfile?.businessId) {
      setBusiness(null);
      setProducts([]);
      setBatches([]);
      setPurchaseBatches([]);
      setQuebras([]);
      setExpenses([]);
      setStockCounts([]);
      setWithdrawals([]);
      setClosings([]);
      setStaffMembers([]);
      setTimelineEvents([]);
      return;
    }

    const businessId = userProfile.businessId;

    // 1. Business doc listener
    const businessRef = doc(db, 'businesses', businessId);
    const unsubBusiness = onSnapshot(
      businessRef,
      (snap) => {
        if (snap.exists()) {
          setBusiness(snap.data() as Business);
        }
      },
      (err) => console.error('Error fetching business:', err)
    );

    // 2. Products collection
    const productsRef = collection(db, 'businesses', businessId, 'products');
    const unsubProducts = onSnapshot(
      productsRef,
      (snap) => {
        const list: Product[] = [];
        snap.forEach((doc) => list.push(doc.data() as Product));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(list);
      },
      (err) => console.error('Error fetching products:', err)
    );

    // 3. Batches collection
    const batchesRef = collection(db, 'businesses', businessId, 'batches');
    const unsubBatches = onSnapshot(
      batchesRef,
      (snap) => {
        const list: StockBatch[] = [];
        snap.forEach((doc) => list.push(doc.data() as StockBatch));
        list.sort((a, b) => new Date(b.dateEntered).getTime() - new Date(a.dateEntered).getTime());
        setBatches(list);
      },
      (err) => console.error('Error fetching batches:', err)
    );

    // 3b. Purchase Batches collection (Investment Ledger — one doc per
    // real-world purchase/investment event, grouping one or more of the
    // per-product StockBatch line items above).
    const purchaseBatchesRef = collection(db, 'businesses', businessId, 'purchaseBatches');
    const unsubPurchaseBatches = onSnapshot(
      purchaseBatchesRef,
      (snap) => {
        const list: PurchaseBatch[] = [];
        snap.forEach((doc) => list.push(doc.data() as PurchaseBatch));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPurchaseBatches(list);
      },
      (err) => console.error('Error fetching purchase batches:', err)
    );

    // 4. Quebras collection
    const quebrasRef = collection(db, 'businesses', businessId, 'quebras');
    const unsubQuebras = onSnapshot(
      quebrasRef,
      (snap) => {
        const list: Quebra[] = [];
        snap.forEach((doc) => list.push(doc.data() as Quebra));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setQuebras(list);
      },
      (err) => console.error('Error fetching quebras:', err)
    );

    // 5. Expenses collection
    const expensesRef = collection(db, 'businesses', businessId, 'expenses');
    const unsubExpenses = onSnapshot(
      expensesRef,
      (snap) => {
        const list: Expense[] = [];
        snap.forEach((doc) => list.push(doc.data() as Expense));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(list);
      },
      (err) => console.error('Error fetching expenses:', err)
    );

    // 5b. Stock Counts collection (Initial Capital + periodic counts)
    const stockCountsRef = collection(db, 'businesses', businessId, 'stockCounts');
    const unsubStockCounts = onSnapshot(
      stockCountsRef,
      (snap) => {
        const list: StockCount[] = [];
        snap.forEach((doc) => list.push(doc.data() as StockCount));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setStockCounts(list);
      },
      (err) => console.error('Error fetching stock counts:', err)
    );

    // 5c. Withdrawals collection (money the owner has taken out — NOT an expense)
    const withdrawalsRef = collection(db, 'businesses', businessId, 'withdrawals');
    const unsubWithdrawals = onSnapshot(
      withdrawalsRef,
      (snap) => {
        const list: Withdrawal[] = [];
        snap.forEach((doc) => list.push(doc.data() as Withdrawal));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWithdrawals(list);
      },
      (err) => console.error('Error fetching withdrawals:', err)
    );

    // 5d. Closings collection (Monthly/Yearly period locks)
    const closingsRef = collection(db, 'businesses', businessId, 'closings');
    const unsubClosings = onSnapshot(
      closingsRef,
      (snap) => {
        const list: Closing[] = [];
        snap.forEach((doc) => list.push(doc.data() as Closing));
        list.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        setClosings(list);
      },
      (err) => console.error('Error fetching closings:', err)
    );

    // 6. Staff collection
    const staffRef = collection(db, 'businesses', businessId, 'staff');
    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        const list: StaffMember[] = [];
        snap.forEach((doc) => list.push(doc.data() as StaffMember));
        setStaffMembers(list);
      },
      (err) => console.error('Error fetching staff:', err)
    );

    // 7. Timeline Events collection (Business Timeline — see types.ts).
    // Sorted by createdAt (the moment the event was logged) so entries
    // read newest-first even when several happen on the same business date.
    const timelineRef = collection(db, 'businesses', businessId, 'timelineEvents');
    const unsubTimeline = onSnapshot(
      timelineRef,
      (snap) => {
        const list: TimelineEvent[] = [];
        snap.forEach((doc) => list.push(doc.data() as TimelineEvent));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTimelineEvents(list);
      },
      (err) => console.error('Error fetching timeline events:', err)
    );

    return () => {
      unsubBusiness();
      unsubProducts();
      unsubBatches();
      unsubPurchaseBatches();
      unsubQuebras();
      unsubExpenses();
      unsubStockCounts();
      unsubWithdrawals();
      unsubClosings();
      unsubStaff();
      unsubTimeline();
    };
  }, [userProfile?.businessId]);

  // Actions
  const setCurrencySymbol = async (symbol: string) => {
    if (!userProfile?.businessId) return;
    await updateDoc(doc(db, 'businesses', userProfile.businessId), {
      currencySymbol: symbol,
    });
  };

  const setBusinessCategory = async (category: string) => {
    if (!userProfile?.businessId) return;
    await updateDoc(doc(db, 'businesses', userProfile.businessId), {
      category,
    });
  };

  const updateBusinessProfile = async (profile: { name: string; category: string; contact: string; location: string; email: string }) => {
    if (!userProfile?.businessId) return;
    await updateDoc(doc(db, 'businesses', userProfile.businessId), {
      name: profile.name.trim(),
      category: profile.category.trim(),
      contact: profile.contact.trim(),
      location: profile.location.trim(),
      email: profile.email.trim(),
    });

    await logTimelineEvent({
      type: 'business-profile-updated',
      date: getTodayDateString(),
      title: 'Perfil do Negócio Atualizado',
      description: `Informações de "${profile.name.trim()}" foram atualizadas.`,
      details: {
        name: profile.name.trim(),
        category: profile.category.trim(),
        contact: profile.contact.trim(),
        location: profile.location.trim(),
        email: profile.email.trim(),
      },
    });
  };

  const createBusinessForOwner = async (businessName: string, category: string, symbol: string = 'MT') => {
    if (!currentUser) return;
    const businessId = 'bus-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    const newBusiness: Business = {
      id: businessId,
      name: businessName.trim(),
      ownerUid: currentUser.uid,
      category: category.trim(),
      currencySymbol: symbol,
      createdAt: new Date().toISOString(),
    };

    // Save business doc
    await setDoc(doc(db, 'businesses', businessId), newBusiness);

    // Update or create user profile with businessId
    const profile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Dono do Negócio',
      role: 'owner',
      businessId: businessId,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', currentUser.uid), profile);
  };

  // ============================================================
  // BUSINESS TIMELINE LOGGING
  // ============================================================
  // Writes one append-only history entry alongside an action that already
  // happened elsewhere in this file. Never touches — and is never touched
  // by — any calculation. If logging fails for any reason, it is swallowed
  // so the underlying business action (which already succeeded) is never
  // rolled back or reported as failed just because its history entry didn't
  // get written.
  const logTimelineEvent = async (input: {
    type: TimelineActivityType;
    date: string;
    title: string;
    description: string;
    financialImpact?: TimelineFinancialImpact[];
    details?: Record<string, string | number | undefined>;
    productName?: string;
    supplierName?: string;
    batchNumber?: string;
    expenseCategory?: string;
  }) => {
    if (!userProfile?.businessId) return;
    const newEvent: TimelineEvent = {
      id: 'tl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: input.type,
      date: input.date,
      createdAt: new Date().toISOString(),
      userName: userProfile.name || 'Utilizador',
      title: input.title,
      description: input.description,
      financialImpact: input.financialImpact,
      details: input.details,
      productName: input.productName,
      supplierName: input.supplierName,
      batchNumber: input.batchNumber,
      expenseCategory: input.expenseCategory,
    };
    try {
      await setDoc(doc(db, 'businesses', userProfile.businessId, 'timelineEvents', newEvent.id), newEvent);
    } catch (err) {
      console.error('Error logging timeline event:', err);
    }
  };

  // Report exports have no other collection to hook into — the Reports
  // screen calls this directly whenever a PDF/Excel export or print action
  // completes.
  const logReportExport = async (reportTitle: string) => {
    await logTimelineEvent({
      type: 'report-exported',
      date: getTodayDateString(),
      title: 'Relatório Exportado',
      description: `Relatório "${reportTitle}" foi exportado.`,
      details: { reportTitle },
    });
  };

  const addStockBatch = async ({ productName, dateEntered, quantity, unit, costPrice, sellingPrice }: AddStockParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');

    const businessId = userProfile.businessId;
    const trimmedName = productName.trim();

    let product = products.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
    let productId = product?.id;
    let isNewProduct = false;

    if (!product) {
      productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      const newProd: Product = {
        id: productId,
        name: trimmedName,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'businesses', businessId, 'products', productId), newProd);
      isNewProduct = true;
    }

    // Close any active open batch for this product
    const openBatches = batches.filter((b) => b.productId === productId && b.status === 'open');
    for (const b of openBatches) {
      await updateDoc(doc(db, 'businesses', businessId, 'batches', b.id), { status: 'closed' });
    }

    // Create new batch
    const newBatchId = 'batch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newBatch: StockBatch = {
      id: newBatchId,
      productId: productId!,
      dateEntered,
      quantity: Number(quantity),
      unit: unit ? unit.trim() : 'un',
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', businessId, 'batches', newBatchId), newBatch);

    if (isNewProduct) {
      await logTimelineEvent({
        type: 'product-created',
        date: dateEntered,
        title: 'Produto Criado',
        description: `"${trimmedName}" foi adicionado como novo produto.`,
        productName: trimmedName,
        details: { productName: trimmedName },
      });
    }

    const investmentValue = Number(quantity) * Number(costPrice);
    const marketValue = Number(quantity) * Number(sellingPrice);
    await logTimelineEvent({
      type: 'stock-batch-created',
      date: dateEntered,
      title: 'Stock Adicionado',
      description: `${quantity} ${unit ? unit.trim() : 'un'} de "${trimmedName}" adicionado(s) ao stock.`,
      productName: trimmedName,
      financialImpact: [
        { label: 'Investimento', amount: investmentValue, tone: 'neutral' },
        { label: 'Lucro Embutido', amount: marketValue - investmentValue, tone: 'positive' },
      ],
      details: {
        productName: trimmedName,
        quantity,
        unit: unit ? unit.trim() : 'un',
        costPrice,
        sellingPrice,
        investmentValue,
        marketValue,
        embeddedProfit: marketValue - investmentValue,
      },
    });

    return { productId: productId!, batchId: newBatchId };
  };

  const addMultipleStockBatches = async (items: AddStockParams[], supplier?: Supplier, notes?: string) => {
    if (!userProfile?.businessId || !items.length) return { purchaseBatchId: null };
    const businessId = userProfile.businessId;

    const fsBatch = createFirestoreBatch(db);

    // Track products updated/created in this loop
    const tempProducts = [...products];
    const tempBatches = [...batches];
    const newlyCreatedProductNames: string[] = [];
    let totalInvestmentValue = 0;
    let totalMarketValue = 0;
    const lineItemSummaries: { productName: string; quantity: number; unit: string }[] = [];

    // Create the Purchase Batch envelope (the Investment Ledger entry) that
    // will group every line item created below under one supplier/date/
    // batch number. This never touches cost/price figures — those still
    // live entirely on the StockBatch line items and the existing
    // Embedded Profit engine in calculations.ts.
    const newBatchSeq = getNextBatchSeq(purchaseBatches);
    const newPurchaseBatchId = 'pbatch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newPurchaseBatch: PurchaseBatch = {
      id: newPurchaseBatchId,
      batchNumber: generateBatchNumber(newBatchSeq),
      batchSeq: newBatchSeq,
      date: items[0].dateEntered,
      supplier: {
        name: (supplier?.name || '').trim() || 'Fornecedor Não Especificado',
        phone: supplier?.phone?.trim() || undefined,
        notes: supplier?.notes?.trim() || undefined,
      },
      notes: notes?.trim() || undefined,
      createdByName: userProfile.name,
      createdAt: new Date().toISOString(),
    };
    fsBatch.set(doc(db, 'businesses', businessId, 'purchaseBatches', newPurchaseBatchId), newPurchaseBatch);

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const trimmedName = item.productName.trim();
      if (!trimmedName) continue;

      let product = tempProducts.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
      let productId = product?.id;

      if (!product) {
        productId = 'prod-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
        const newProd: Product = {
          id: productId,
          name: trimmedName,
          createdAt: new Date().toISOString(),
        };
        const prodRef = doc(db, 'businesses', businessId, 'products', productId);
        fsBatch.set(prodRef, newProd);
        tempProducts.push(newProd);
        newlyCreatedProductNames.push(trimmedName);
      }

      // Close open batches for this product
      const openBatches = tempBatches.filter((b) => b.productId === productId && b.status === 'open');
      for (const b of openBatches) {
        const batchRef = doc(db, 'businesses', businessId, 'batches', b.id);
        fsBatch.update(batchRef, { status: 'closed' });
        const idx = tempBatches.findIndex((tb) => tb.id === b.id);
        if (idx !== -1) {
          tempBatches[idx] = { ...tempBatches[idx], status: 'closed' };
        }
      }

      // Add new batch
      const newBatchId = 'batch-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
      const newBatch: StockBatch = {
        id: newBatchId,
        productId: productId!,
        dateEntered: item.dateEntered,
        quantity: Number(item.quantity),
        unit: item.unit ? item.unit.trim() : 'un',
        costPrice: Number(item.costPrice),
        sellingPrice: Number(item.sellingPrice),
        status: 'open',
        createdAt: new Date().toISOString(),
        purchaseBatchId: newPurchaseBatchId,
      };

      const newBatchRef = doc(db, 'businesses', businessId, 'batches', newBatchId);
      fsBatch.set(newBatchRef, newBatch);
      tempBatches.push(newBatch);

      totalInvestmentValue += Number(item.quantity) * Number(item.costPrice);
      totalMarketValue += Number(item.quantity) * Number(item.sellingPrice);
      lineItemSummaries.push({
        productName: trimmedName,
        quantity: Number(item.quantity),
        unit: item.unit ? item.unit.trim() : 'un',
      });
    }

    await fsBatch.commit();

    for (const newProductName of newlyCreatedProductNames) {
      await logTimelineEvent({
        type: 'product-created',
        date: items[0].dateEntered,
        title: 'Produto Criado',
        description: `"${newProductName}" foi adicionado como novo produto.`,
        productName: newProductName,
        details: { productName: newProductName },
      });
    }

    const supplierName = newPurchaseBatch.supplier.name;
    await logTimelineEvent({
      type: 'stock-batch-created',
      date: newPurchaseBatch.date,
      title: 'Lote de Compra Criado',
      description: `Lote ${newPurchaseBatch.batchNumber} registado junto de ${supplierName}, com ${lineItemSummaries.length} produto(s).`,
      productName: lineItemSummaries.length === 1 ? lineItemSummaries[0].productName : undefined,
      supplierName,
      batchNumber: newPurchaseBatch.batchNumber,
      financialImpact: [
        { label: 'Investimento', amount: totalInvestmentValue, tone: 'neutral' },
        { label: 'Lucro Embutido', amount: totalMarketValue - totalInvestmentValue, tone: 'positive' },
      ],
      details: {
        batchNumber: newPurchaseBatch.batchNumber,
        supplierName,
        notes: newPurchaseBatch.notes,
        products: lineItemSummaries.map((li) => `${li.quantity} ${li.unit} ${li.productName}`).join(', '),
        investmentValue: totalInvestmentValue,
        marketValue: totalMarketValue,
        embeddedProfit: totalMarketValue - totalInvestmentValue,
      },
    });

    return { purchaseBatchId: newPurchaseBatchId };
  };

  // Archiving is a reversible, explicit action (never automatic) that
  // simply hides a fully-settled Purchase Batch from the default active
  // ledger view — it does not touch any StockBatch line item or figure.
  const archivePurchaseBatch = async (id: string) => {
    if (!userProfile?.businessId) return;
    await updateDoc(doc(db, 'businesses', userProfile.businessId, 'purchaseBatches', id), {
      archived: true,
      archivedAt: new Date().toISOString(),
    });
  };

  const unarchivePurchaseBatch = async (id: string) => {
    if (!userProfile?.businessId) return;
    await updateDoc(doc(db, 'businesses', userProfile.businessId, 'purchaseBatches', id), {
      archived: false,
      archivedAt: null,
    });
  };

  const addQuebra = async ({ productId, batchId, date, quantityLost, reason }: AddQuebraParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');

    const newQuebra: Quebra = {
      id: 'quebra-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      productId,
      batchId,
      date,
      quantityLost: Number(quantityLost),
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', userProfile.businessId, 'quebras', newQuebra.id), newQuebra);

    const relatedBatch = batches.find((b) => b.id === batchId);
    const relatedProduct = products.find((p) => p.id === productId);
    const lossValue = relatedBatch ? Number(quantityLost) * relatedBatch.costPrice : 0;

    await logTimelineEvent({
      type: 'quebra-recorded',
      date,
      title: 'Quebra Registada',
      description: `${quantityLost} ${relatedBatch?.unit || 'un'} de "${relatedProduct?.name || 'produto'}" perdido(s) — ${reason.trim()}.`,
      productName: relatedProduct?.name,
      financialImpact: [{ label: 'Perda', amount: -lossValue, tone: 'negative' }],
      details: {
        productName: relatedProduct?.name,
        quantityLost,
        reason: reason.trim(),
        lossValue,
      },
    });

    return newQuebra;
  };

  const addExpense = async ({ date, description, amount, category }: AddExpenseParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');

    const newExpense: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date,
      description: description.trim(),
      amount: Number(amount),
      category: category ? category.trim() : 'Geral',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', userProfile.businessId, 'expenses', newExpense.id), newExpense);

    await logTimelineEvent({
      type: 'expense-recorded',
      date,
      title: 'Despesa Registada',
      description: newExpense.description,
      expenseCategory: newExpense.category,
      financialImpact: [{ label: 'Despesa', amount: -newExpense.amount, tone: 'negative' }],
      details: {
        description: newExpense.description,
        category: newExpense.category,
        amount: newExpense.amount,
      },
    });

    return newExpense;
  };

  // Owner Withdrawals: money taken by the owner for personal use. This is
  // NOT an expense — it reduces available business capital directly,
  // without affecting profit/loss the way an operating expense does.
  const addWithdrawal = async ({ date, amount, reason, notes }: AddWithdrawalParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');

    const newWithdrawal: Withdrawal = {
      id: 'wd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date,
      amount: Number(amount),
      reason: reason ? reason.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', userProfile.businessId, 'withdrawals', newWithdrawal.id), newWithdrawal);

    await logTimelineEvent({
      type: 'withdrawal-recorded',
      date,
      title: 'Retirada do Proprietário',
      description: newWithdrawal.reason
        ? `Retirada para "${newWithdrawal.reason}".`
        : 'Retirada registada.',
      financialImpact: [{ label: 'Retirada', amount: -newWithdrawal.amount, tone: 'negative' }],
      details: {
        reason: newWithdrawal.reason,
        notes: newWithdrawal.notes,
        amount: newWithdrawal.amount,
      },
    });

    return newWithdrawal;
  };

  const deleteWithdrawal = async (id: string) => {
    if (!userProfile?.businessId) return;
    await deleteDoc(doc(db, 'businesses', userProfile.businessId, 'withdrawals', id));
  };

  // Records a physical Stock Count. This is NEVER a purchase and NEVER
  // creates/touches a StockBatch — it simply records what the owner
  // physically counted as already owned, at a point in time.
  //
  // type === 'initial' is special: it can only ever be recorded once per
  // business. Once set, it becomes the permanent Initial Business Capital
  // baseline that everything else (capital growth, business worth) is
  // measured against, so it is intentionally never editable or repeatable.
  const recordStockCount = async ({ type, label, date, items }: RecordStockCountParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');
    if (!items.length) throw new Error('Adicione pelo menos um produto à contagem.');

    if (type === 'initial' && hasInitialStockCount) {
      throw new Error('O Capital Inicial já foi definido e não pode ser registado novamente.');
    }

    const businessId = userProfile.businessId;
    const fsBatch = createFirestoreBatch(db);
    const tempProducts = [...products];

    const countItems: StockCount['items'] = [];
    let totalValue = 0;

    for (const raw of items) {
      const trimmedName = raw.productName.trim();
      if (!trimmedName) continue;

      // Find or create the product, exactly like addStockBatch does —
      // a Stock Count can introduce products the business hasn't
      // purchased through a batch yet (e.g. inventory owned before
      // starting to use this system).
      let product = tempProducts.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
      let productId = product?.id;

      if (!product) {
        productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        const newProd: Product = {
          id: productId,
          name: trimmedName,
          createdAt: new Date().toISOString(),
        };
        fsBatch.set(doc(db, 'businesses', businessId, 'products', productId), newProd);
        tempProducts.push(newProd);
      }

      const quantity = Number(raw.quantity) || 0;
      const costPrice = Number(raw.costPrice) || 0;
      const itemTotal = Number((quantity * costPrice).toFixed(2));
      totalValue += itemTotal;

      countItems.push({
        productId: productId!,
        productName: trimmedName,
        quantity,
        unit: raw.unit ? raw.unit.trim() : 'un',
        costPrice,
        totalValue: itemTotal,
      });
    }

    if (!countItems.length) throw new Error('Adicione pelo menos um produto válido à contagem.');

    const newCount: StockCount = {
      id: (type === 'initial' ? 'stockcount-initial-' : 'stockcount-') + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type,
      label: label?.trim() || undefined,
      date,
      items: countItems,
      totalValue: Number(totalValue.toFixed(2)),
      createdAt: new Date().toISOString(),
    };

    fsBatch.set(doc(db, 'businesses', businessId, 'stockCounts', newCount.id), newCount);
    await fsBatch.commit();

    if (type === 'initial') {
      await logTimelineEvent({
        type: 'initial-stock-count',
        date,
        title: 'Contagem Inicial de Stock Concluída',
        description: `Capital inicial do negócio estabelecido com ${countItems.length} produto(s).`,
        financialImpact: [{ label: 'Capital Inicial', amount: newCount.totalValue, tone: 'neutral' }],
        details: {
          productCount: countItems.length,
          totalValue: newCount.totalValue,
        },
      });
    } else {
      await logTimelineEvent({
        type: 'stock-verification',
        date,
        title: 'Verificação de Stock Concluída',
        description: `Contagem física de stock (${label?.trim() || type}) com ${countItems.length} produto(s).`,
        financialImpact: [{ label: 'Valor Contado', amount: newCount.totalValue, tone: 'neutral' }],
        details: {
          countType: type,
          label: label?.trim(),
          productCount: countItems.length,
          totalValue: newCount.totalValue,
        },
      });
    }

    return newCount;
  };

  // A period is "closed" if any existing Closing of the same type shares
  // its exact start/end range. Prevents accidentally closing the same
  // month or year twice.
  const isPeriodClosed = (periodType: ClosingPeriodType, startDate: string, endDate: string) => {
    return closings.some(
      (c) => c.periodType === periodType && c.startDate === startDate && c.endDate === endDate
    );
  };

  // Records a Monthly or Yearly Closing. This permanently locks the period's
  // figures (product profit, expenses, net income, withdrawals) as historical
  // fact, plus a snapshot of Business Worth (Cash on Hand + Current Inventory
  // Value) at the moment of closing. Closings are never edited — only
  // recorded or deleted (deleting simply re-opens the period).
  const recordClosing = async ({ periodType, periodLabel, startDate, endDate }: RecordClosingParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');

    if (isPeriodClosed(periodType, startDate, endDate)) {
      throw new Error('Este período já foi fechado anteriormente.');
    }

    const report = generateReportSummary(startDate, endDate, products, batches, quebras, expenses, withdrawals);

    const newClosing: Closing = {
      id: 'closing-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      periodType,
      periodLabel: periodLabel.trim(),
      startDate,
      endDate,
      totalEmbeddedProfit: report.totalEmbeddedProfit,
      totalExpenses: report.totalExpenses,
      totalWithdrawals: report.totalWithdrawals,
      inventoryCostAtClose: totalInvestmentValueAllTime,
      inventoryMarketValueAtClose: totalMarketValueAllTime,
      businessWorthAtClose: businessWorth,
      closedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', userProfile.businessId, 'closings', newClosing.id), newClosing);

    await logTimelineEvent({
      type: periodType === 'monthly' ? 'monthly-closing' : 'yearly-closing',
      date: endDate,
      title: periodType === 'monthly' ? 'Fecho Mensal Concluído' : 'Fecho Anual Concluído',
      description: `Período "${periodLabel.trim()}" fechado e bloqueado permanentemente.`,
      financialImpact: [
        { label: 'Lucro Embutido', amount: newClosing.totalEmbeddedProfit, tone: 'positive' },
        { label: 'Despesas', amount: -newClosing.totalExpenses, tone: 'negative' },
        { label: 'Retiradas', amount: -newClosing.totalWithdrawals, tone: 'negative' },
      ],
      details: {
        periodLabel: periodLabel.trim(),
        startDate,
        endDate,
        totalEmbeddedProfit: newClosing.totalEmbeddedProfit,
        totalExpenses: newClosing.totalExpenses,
        totalWithdrawals: newClosing.totalWithdrawals,
        businessWorthAtClose: newClosing.businessWorthAtClose,
      },
    });

    return newClosing;
  };

  const deleteClosing = async (id: string) => {
    if (!userProfile?.businessId) return;
    await deleteDoc(doc(db, 'businesses', userProfile.businessId, 'closings', id));
  };

  const deleteQuebra = async (id: string) => {
    if (!userProfile?.businessId) return;
    await deleteDoc(doc(db, 'businesses', userProfile.businessId, 'quebras', id));
  };

  const deleteExpense = async (id: string) => {
    if (!userProfile?.businessId) return;
    await deleteDoc(doc(db, 'businesses', userProfile.businessId, 'expenses', id));
  };

  const deleteProduct = async (id: string) => {
    if (!userProfile?.businessId) return;
    const businessId = userProfile.businessId;

    await deleteDoc(doc(db, 'businesses', businessId, 'products', id));

    // Delete associated batches and quebras
    const prodBatches = batches.filter((b) => b.productId === id);
    for (const b of prodBatches) {
      await deleteDoc(doc(db, 'businesses', businessId, 'batches', b.id));
    }

    const prodQuebras = quebras.filter((q) => q.productId === id);
    for (const q of prodQuebras) {
      await deleteDoc(doc(db, 'businesses', businessId, 'quebras', q.id));
    }
  };

  const addStaffMember = async (name: string, email: string, password: string) => {
    if (!userProfile?.businessId || !isOwner) throw new Error('Apenas o dono pode adicionar funcionários.');

    const businessId = userProfile.businessId;
    const secondaryAppName = `staff-app-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = (await import('firebase/auth')).getAuth(secondaryApp);
    const createFn = (await import('firebase/auth')).createUserWithEmailAndPassword;

    try {
      const userCred = await createFn(secondaryAuth, email.trim(), password);
      const staffUid = userCred.user.uid;

      const staffProfile: UserProfile = {
        uid: staffUid,
        email: email.trim(),
        name: name.trim(),
        role: 'staff',
        businessId: businessId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', staffUid), staffProfile);

      const staffData: StaffMember = {
        uid: staffUid,
        email: email.trim(),
        name: name.trim(),
        businessId: businessId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'businesses', businessId, 'staff', staffUid), staffData);
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  const deleteStaffMember = async (staffUid: string) => {
    if (!userProfile?.businessId || !isOwner) return;
    await deleteDoc(doc(db, 'businesses', userProfile.businessId, 'staff', staffUid));
    await deleteDoc(doc(db, 'users', staffUid));
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loadSampleData = async () => {
    if (!userProfile?.businessId || !isOwner) return;
    const businessId = userProfile.businessId;

    const fsBatch = createFirestoreBatch(db);

    INITIAL_PRODUCTS.forEach((p) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'products', p.id), p);
    });

    INITIAL_BATCHES.forEach((b) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'batches', b.id), b);
    });

    INITIAL_QUEBRAS.forEach((q) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'quebras', q.id), q);
    });

    INITIAL_EXPENSES.forEach((e) => {
      fsBatch.set(doc(db, 'businesses', businessId, 'expenses', e.id), e);
    });

    await fsBatch.commit();
  };

  const clearAllData = async () => {
    if (!userProfile?.businessId || !isOwner) return;
    const businessId = userProfile.businessId;

    for (const p of products) {
      await deleteDoc(doc(db, 'businesses', businessId, 'products', p.id));
    }
    for (const b of batches) {
      await deleteDoc(doc(db, 'businesses', businessId, 'batches', b.id));
    }
    for (const pb of purchaseBatches) {
      await deleteDoc(doc(db, 'businesses', businessId, 'purchaseBatches', pb.id));
    }
    for (const q of quebras) {
      await deleteDoc(doc(db, 'businesses', businessId, 'quebras', q.id));
    }
    for (const e of expenses) {
      await deleteDoc(doc(db, 'businesses', businessId, 'expenses', e.id));
    }
    for (const s of stockCounts) {
      await deleteDoc(doc(db, 'businesses', businessId, 'stockCounts', s.id));
    }
    for (const w of withdrawals) {
      await deleteDoc(doc(db, 'businesses', businessId, 'withdrawals', w.id));
    }
    for (const c of closings) {
      await deleteDoc(doc(db, 'businesses', businessId, 'closings', c.id));
    }
    for (const t of timelineEvents) {
      await deleteDoc(doc(db, 'businesses', businessId, 'timelineEvents', t.id));
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userProfile,
        business,
        isAuthLoading,
        isOwner,
        isStaff,
        products,
        batches,
        purchaseBatches,
        quebras,
        expenses,
        stockCounts,
        withdrawals,
        staffMembers,
        currencySymbol,
        setCurrencySymbol,
        businessCategory,
        setBusinessCategory,
        isBusinessProfileComplete,
        updateBusinessProfile,
        addStockBatch,
        addMultipleStockBatches,
        archivePurchaseBatch,
        unarchivePurchaseBatch,
        addQuebra,
        addExpense,
        addWithdrawal,
        deleteWithdrawal,
        hasInitialStockCount,
        initialStockCount,
        initialCapitalValue,
        recordStockCount,
        latestStockCount,
        currentInventoryValue,
        totalInvestmentValueAllTime,
        totalMarketValueAllTime,
        totalEmbeddedProfitAllTime,
        activeBatchCount,
        totalExpensesAllTime,
        totalWithdrawalsAllTime,
        businessWorth,
        capitalGrowth,
        capitalGrowthPct,
        closings,
        recordClosing,
        deleteClosing,
        isPeriodClosed,
        timelineEvents,
        logReportExport,
        deleteQuebra,
        deleteExpense,
        deleteProduct,
        addStaffMember,
        deleteStaffMember,
        createBusinessForOwner,
        logout,
        loadSampleData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
