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
  deleteField,
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
  ClosedPeriod,
  ClosingPeriodType,
  PurchaseBatch,
  Supplier,
  TimelineEvent,
  TimelineActivityType,
  TimelineFinancialImpact,
  PairedDevice,
  StaffTier,
  ManagerPermissions,
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
  // BDS #16 — Manager is a Staff account with staffTier === 'manager'.
  // isManager is true regardless of which permissions are granted; the
  // two derived booleans below reflect the actual per-permission grants
  // (both false for every plain Staff account and for a Manager with
  // nothing granted yet).
  isManager: boolean;
  canManagerCloseBooks: boolean;
  canManagerManageStaff: boolean;
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
  // [Closing Integrity Amendment v1.0] Replaces the old deleteClosing —
  // a Closing is never deleted, only reopened (Owner-only, logged,
  // supersedes in place). See reopenClosing's own comment for the full
  // rule.
  reopenClosing: (id: string, reason?: string) => Promise<void>;
  // One-time, idempotent, Owner-only migration for Closings recorded
  // before this amendment shipped — see its own comment for exact behavior.
  backfillClosingLocks: () => Promise<{ closingsIndexed: number; expensesLocked: number; withdrawalsLocked: number }>;
  isPeriodClosed: (periodType: ClosingPeriodType, startDate: string, endDate: string) => boolean;
  // Business Timeline — chronological history log (see types.ts). Populated
  // automatically by the actions above; logReportExport is the one manual
  // hook, called by the Reports screen when a report is exported/printed.
  timelineEvents: TimelineEvent[];
  logReportExport: (reportTitle: string) => Promise<void>;
  deleteQuebra: (id: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addStaffMember: (name: string, email: string, password: string) => Promise<void>;
  deleteStaffMember: (staffUid: string, reason?: string) => Promise<void>;
  suspendStaffMember: (staffUid: string, reason?: string) => Promise<void>;
  reactivateStaffMember: (staffUid: string) => Promise<void>;
  resetStaffPin: (staffUid: string, newPin: string) => Promise<void>;
  // BDS #16 — Admin-only. Promotes/demotes a Staff member's tier and, for
  // 'manager', sets which permissions are granted. Passing 'staff'
  // always clears both permissions server-side, regardless of what's
  // passed in managerPermissions.
  setStaffTier: (staffUid: string, staffTier: StaffTier, managerPermissions?: Partial<ManagerPermissions>) => Promise<void>;
  // Device pairing for PIN-based quick login (shared shop devices) — see
  // AppContext's DEVICE PAIRING section for details. null on devices that
  // have never been paired (e.g. a staff member's personal phone).
  pairedDevice: PairedDevice | null;
  pairDevice: () => void;
  unpairDevice: () => void;
  suspensionNotice: string | null;
  clearSuspensionNotice: () => void;
  // Multi-shop support (owners only, up to MAX_SHOPS_PER_OWNER shops).
  // `activeBusinessId` is the shop currently being viewed/operated on —
  // every other field/action in this context (business, products,
  // batches, etc.) is already scoped to it.
  ownedBusinesses: Business[];
  activeBusinessId: string | null;
  maxShopsPerOwner: number;
  addShop: (businessName: string, category: string, currencySymbol?: string) => Promise<void>;
  switchShop: (businessId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Set only when a staff account gets force-signed-out mid-session because
  // an owner suspended it (see the profile listener below). Survives the
  // logout itself (unlike userProfile, which gets cleared) so the login
  // screen can show *why* they were logged out, then it's cleared once shown.
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);
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
  // [Closing Integrity Amendment v1.0] Lock-index docs — see ClosedPeriod
  // type in types.ts for why this collection exists. Not shown anywhere
  // in the UI; consumed only by backfillClosingLocks and recordClosing/
  // reopenClosing's own writes.
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // [Phase 0 Stage 2 Compatibility Correction] Must match firestore.rules'
  // isOwnerOf(), which already treats 'owner' and 'admin' as equivalent
  // (Stage 1). This was the missing synchronization point: Stage 2 started
  // writing 'admin' for new registrations, but this check still only
  // recognized 'owner', so every account created after Stage 2 shipped
  // lost all owner-level app capability (while still passing the rules
  // layer). Fixed here, not a new role model.
  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';
  const isStaff = userProfile?.role === 'staff';
  // BDS #16 — additive on top of isStaff, never a replacement for it.
  // Every existing `isStaff` check in the app is unaffected; these three
  // are new, narrower checks used only where Manager delegation applies.
  const isManager = isStaff && userProfile?.staffTier === 'manager';
  const canManagerCloseBooks = isManager && userProfile?.managerPermissions?.closings === true;
  const canManagerManageStaff = isManager && userProfile?.managerPermissions?.staffManagement === true;

  const MAX_SHOPS_PER_OWNER = 10;

  // ============================================================
  // MULTI-SHOP SUPPORT (owners only, up to MAX_SHOPS_PER_OWNER shops).
  // ============================================================
  // Staff accounts stay single-shop, always resolved from the legacy
  // `businessId` field on their profile — unchanged from before.
  //
  // Owners: `businessIds` is the real list. Owner accounts created before
  // this feature existed only have the legacy singular `businessId` field
  // and no `businessIds` array yet — rather than running a bulk migration,
  // we derive the list on the fly (falls back to a one-item array built
  // from `businessId`). The first time such an owner adds a second shop,
  // `addShop` persists this derived list for real (see below), so the
  // lazy fallback here only ever matters before that first write.
  const ownedBusinessIds: string[] = isOwner
    ? (userProfile?.businessIds?.length ? userProfile.businessIds : (userProfile?.businessId ? [userProfile.businessId] : []))
    : [];

  // The shop currently being viewed/operated on. For owners this is
  // `activeBusinessId` (validated against the owned list, since a stale
  // value could in theory point at a shop no longer in the array) falling
  // back to the first owned shop. For staff it's simply their one shop.
  const activeBusinessId: string | null = isOwner
    ? (userProfile?.activeBusinessId && ownedBusinessIds.includes(userProfile.activeBusinessId)
        ? userProfile.activeBusinessId
        : (ownedBusinessIds[0] || null))
    : (userProfile?.businessId || null);

  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);

  // Live-listen to every shop an owner has, so the shop switcher shows
  // up-to-date names without a separate fetch each time it opens.
  useEffect(() => {
    if (!isOwner || ownedBusinessIds.length === 0) {
      setOwnedBusinesses([]);
      return;
    }

    const unsubs = ownedBusinessIds.map((id) =>
      onSnapshot(
        doc(db, 'businesses', id),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as Business;
          setOwnedBusinesses((prev) => {
            const next = prev.filter((b) => b.id !== id);
            next.push(data);
            // Keep the same order as ownedBusinessIds for a stable menu.
            return ownedBusinessIds
              .map((oid) => next.find((b) => b.id === oid))
              .filter((b): b is Business => !!b);
          });
        },
        (err) => console.error('Error fetching owned business', id, err)
      )
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, JSON.stringify(ownedBusinessIds)]);

  const currencySymbol = business?.currencySymbol || 'MT';
  const businessCategory = business?.category || '';

  // ============================================================
  // DEVICE PAIRING for PIN-based quick login (shared shop devices).
  // ============================================================
  // Stored ONLY in this browser's localStorage — never synced to
  // Firestore, never visible to anyone else. It's purely a local cache
  // of "which shop is this specific device set up for" + that shop's
  // staff names, so the logged-out screen on a shared device can show a
  // name-picker + PIN pad instead of asking for a full email each time.
  // The PIN itself is never cached here — it's the staff member's real
  // Firebase Auth password, typed fresh at each login.
  const DEVICE_PAIRING_KEY = 'sabush_device_pairing';

  const [pairedDevice, setPairedDeviceState] = useState<PairedDevice | null>(() => {
    try {
      const raw = localStorage.getItem(DEVICE_PAIRING_KEY);
      return raw ? (JSON.parse(raw) as PairedDevice) : null;
    } catch {
      return null;
    }
  });

  const persistPairedDevice = (value: PairedDevice | null) => {
    setPairedDeviceState(value);
    try {
      if (value) {
        localStorage.setItem(DEVICE_PAIRING_KEY, JSON.stringify(value));
      } else {
        localStorage.removeItem(DEVICE_PAIRING_KEY);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — pairing just
      // won't persist across reloads; not worth failing the action for.
    }
  };

  const pairDevice = () => {
    if (!isOwner || !activeBusinessId || !business) {
      throw new Error('Apenas o dono, com uma loja selecionada, pode configurar este dispositivo.');
    }
    persistPairedDevice({
      businessId: activeBusinessId,
      businessName: business.name,
      // Suspended/removed staff never appear on the PIN pad — filtered
      // out here so a device doesn't keep advertising an account that
      // can't log in anyway.
      staff: staffMembers.filter((s) => !s.suspended).map((s) => ({ uid: s.uid, name: s.name, email: s.email })),
      pairedAt: new Date().toISOString(),
    });
  };

  const unpairDevice = () => {
    persistPairedDevice(null);
  };

  // Keep the cached staff list fresh automatically while the owner is
  // using this same device for this same shop — so adding/removing/
  // suspending staff shows up on the PIN pad without a manual re-pair.
  useEffect(() => {
    if (!isOwner || !pairedDevice || pairedDevice.businessId !== activeBusinessId) return;
    const freshStaff = staffMembers.filter((s) => !s.suspended).map((s) => ({ uid: s.uid, name: s.name, email: s.email }));
    const changed = JSON.stringify(freshStaff) !== JSON.stringify(pairedDevice.staff);
    const nameChanged = business?.name && business.name !== pairedDevice.businessName;
    if (changed || nameChanged) {
      persistPairedDevice({ ...pairedDevice, staff: freshStaff, businessName: business?.name || pairedDevice.businessName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, activeBusinessId, JSON.stringify(staffMembers), business?.name]);

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
        // A staff account can be suspended by its owner at any time (see
        // suspendStaffMember / server/index.ts). Firebase Auth disabling
        // blocks all *future* logins immediately, but an already-open
        // session's ID token can otherwise keep working until it naturally
        // expires. Catching `suspended` here, live, closes that gap —
        // the moment this doc updates, we sign the session out ourselves.
        if (profile.role === 'staff' && profile.suspended === true) {
          setSuspensionNotice('A sua conta foi suspensa pelo dono do negócio. Contacte-o para mais informações.');
          setUserProfile(null);
          signOut(auth).catch((err) => console.error('Error signing out suspended staff session:', err));
        } else {
          setUserProfile(profile);
        }
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
    if (!activeBusinessId) {
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

    const businessId = activeBusinessId;

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

    // 5e. [Closing Integrity Amendment v1.0] ClosedPeriod lock-index docs
    const closedPeriodsRef = collection(db, 'businesses', businessId, 'closedPeriods');
    const unsubClosedPeriods = onSnapshot(
      closedPeriodsRef,
      (snap) => {
        const list: ClosedPeriod[] = [];
        snap.forEach((doc) => list.push(doc.data() as ClosedPeriod));
        setClosedPeriods(list);
      },
      (err) => console.error('Error fetching closed periods:', err)
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
      unsubClosedPeriods();
      unsubStaff();
      unsubTimeline();
    };
  }, [activeBusinessId]);

  // Actions
  const setCurrencySymbol = async (symbol: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId), {
      currencySymbol: symbol,
    });
  };

  const setBusinessCategory = async (category: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId), {
      category,
    });
  };

  const updateBusinessProfile = async (profile: { name: string; category: string; contact: string; location: string; email: string }) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId), {
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

  // ============================================================
  // MULTI-SHOP: add a new shop (up to MAX_SHOPS_PER_OWNER) and make it
  // the active one, or switch which existing shop is active.
  // ============================================================
  // Module #19 Phase 1 (ADR-0001) — addShop now calls the Business
  // Provisioning Orchestrator instead of writing businesses/users
  // directly from the client. This is the "equivalent, though smaller"
  // atomicity gap the Registration & Subscription Creation Architecture
  // Decision's Future Work section named: the same server endpoint that
  // handles Registration also creates addShop's business record, updates
  // the owner's shop list, AND — Business Rule 4, "no null subscription
  // states, ever" — the new shop's initial 'trial_pending' subscription,
  // in one Firestore transaction. The client-side MAX_SHOPS_PER_OWNER
  // check below remains as an immediate UX guard (fail fast without a
  // round-trip); the server independently re-verifies it against the
  // caller's actual profile, never trusting this check alone (Rule 8
  // Assessment, Security Impact).
  const addShop = async (businessName: string, category: string, symbol: string = 'MT') => {
    if (!currentUser || !isOwner) throw new Error('Apenas o dono pode criar uma nova loja.');

    if (ownedBusinessIds.length >= MAX_SHOPS_PER_OWNER) {
      throw new Error(`Limite de ${MAX_SHOPS_PER_OWNER} lojas por conta atingido.`);
    }

    const idToken = await currentUser.getIdToken();

    let response: Response;
    try {
      response = await fetch('/api/provisioning/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'addShop',
          businessName: businessName.trim(),
          category: category.trim(),
          currencySymbol: symbol,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Não foi possível criar a nova loja. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const switchShop = async (businessId: string) => {
    if (!currentUser || !isOwner) return;
    if (!ownedBusinessIds.includes(businessId)) {
      throw new Error('Essa loja não pertence a esta conta.');
    }
    await updateDoc(doc(db, 'users', currentUser.uid), {
      activeBusinessId: businessId,
    });
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
    if (!activeBusinessId) return;
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
      await setDoc(doc(db, 'businesses', activeBusinessId, 'timelineEvents', newEvent.id), newEvent);
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
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const businessId = activeBusinessId;
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
    if (!activeBusinessId || !items.length) return { purchaseBatchId: null };
    const businessId = activeBusinessId;

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
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId, 'purchaseBatches', id), {
      archived: true,
      archivedAt: new Date().toISOString(),
    });
  };

  const unarchivePurchaseBatch = async (id: string) => {
    if (!activeBusinessId) return;
    await updateDoc(doc(db, 'businesses', activeBusinessId, 'purchaseBatches', id), {
      archived: false,
      archivedAt: null,
    });
  };

  const addQuebra = async ({ productId, batchId, date, quantityLost, reason }: AddQuebraParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const newQuebra: Quebra = {
      id: 'quebra-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      productId,
      batchId,
      date,
      quantityLost: Number(quantityLost),
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', activeBusinessId, 'quebras', newQuebra.id), newQuebra);

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

  // [Closing Integrity Amendment v1.0 — Q1/Q2] A closed period must mean
  // the same thing the day it closes and years later: no new Expense or
  // Withdrawal may be *backdated* into it, even though nothing here
  // touches an existing record. Checks only 'active' Closings — a
  // reopened one no longer counts, by design (reopenClosing). This is the
  // client-side half of the guard; firestore.rules enforces the same
  // check independently via the closedPeriods lock index, since
  // client-side gating alone is never sufficient (CLAUDE.md Rule 7).
  const findClosedPeriodConflict = (date: string): Closing | undefined =>
    closings.find((c) => (c.status ?? 'active') === 'active' && isDateInRange(date, c.startDate, c.endDate));

  const addExpense = async ({ date, description, amount, category }: AddExpenseParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const conflict = findClosedPeriodConflict(date);
    if (conflict) {
      throw new Error(
        `Não é possível registar uma despesa em ${date} — este período ("${conflict.periodLabel}") já foi fechado. Para corrigir um período fechado, reabra-o primeiro em Fechos.`
      );
    }

    const newExpense: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date,
      description: description.trim(),
      amount: Number(amount),
      category: category ? category.trim() : 'Geral',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', activeBusinessId, 'expenses', newExpense.id), newExpense);

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
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

    const conflict = findClosedPeriodConflict(date);
    if (conflict) {
      throw new Error(
        `Não é possível registar uma retirada em ${date} — este período ("${conflict.periodLabel}") já foi fechado. Para corrigir um período fechado, reabra-o primeiro em Fechos.`
      );
    }

    const newWithdrawal: Withdrawal = {
      id: 'wd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date,
      amount: Number(amount),
      reason: reason ? reason.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'businesses', activeBusinessId, 'withdrawals', newWithdrawal.id), newWithdrawal);

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

  // [Closing Integrity Amendment v1.0] Same lock check as deleteExpense —
  // see that comment.
  const deleteWithdrawal = async (id: string) => {
    if (!activeBusinessId) return;
    const target = withdrawals.find((w) => w.id === id);
    if (target?.closingId) {
      throw new Error('Esta retirada pertence a um período já fechado e não pode ser removida. Reabra o período em Fechos para a corrigir.');
    }
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'withdrawals', id));
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
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!items.length) throw new Error('Adicione pelo menos um produto à contagem.');

    if (type === 'initial' && hasInitialStockCount) {
      throw new Error('O Capital Inicial já foi definido e não pode ser registado novamente.');
    }

    const businessId = activeBusinessId;
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
  // A 'reopened' Closing no longer counts as blocking its period — a new
  // Closing can be recorded once corrections are made (Amendment v1.0, Q4).
  const isPeriodClosed = (periodType: ClosingPeriodType, startDate: string, endDate: string) => {
    return closings.some(
      (c) => c.periodType === periodType && c.startDate === startDate && c.endDate === endDate && (c.status ?? 'active') === 'active'
    );
  };

  // [Closing Integrity Amendment v1.0] Deterministic id for the
  // ClosedPeriod lock-index doc — firestore.rules derives this exact same
  // id from an incoming Expense/Withdrawal's own `date` field (via
  // string.split('-'), since rules can't slice/query). Keep both sides in
  // sync if this ever changes.
  const closedPeriodKey = (periodType: ClosingPeriodType, startDate: string): string => {
    const [year, month] = startDate.split('-');
    return periodType === 'monthly' ? `monthly:${year}-${month}` : `yearly:${year}`;
  };

  // Splits a flat list of batch operations into ≤498-write chunks (leaving
  // headroom under Firestore's 500-write batch limit) so a single very
  // large Closing (many expenses/withdrawals in one period) can never
  // silently fail past that ceiling.
  const commitInChunks = async (ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void>) => {
    const CHUNK = 498;
    for (let i = 0; i < ops.length; i += CHUNK) {
      const batch = createFirestoreBatch(db);
      ops.slice(i, i + CHUNK).forEach((op) => op(batch));
      await batch.commit();
    }
  };

  // Records a Monthly or Yearly Closing. This permanently locks the period's
  // figures (product profit, expenses, net income, withdrawals) as historical
  // fact, plus a snapshot of Business Worth (Cash on Hand + Current Inventory
  // Value) at the moment of closing.
  //
  // [Closing Integrity Amendment v1.0] Closing is no longer just "record a
  // snapshot" — it now also locks its *inputs*, not only freezing the
  // *result*: every Expense/Withdrawal this snapshot actually counted gets
  // closingId/lockedAt attached (Option B), and a ClosedPeriod lock-index
  // doc is written so firestore.rules can independently block a new
  // backdated Expense/Withdrawal from landing inside this period later.
  // Closings are never edited or deleted — only recorded, or reopened
  // (reopenClosing), which supersedes this one in place.
  const recordClosing = async ({ periodType, periodLabel, startDate, endDate }: RecordClosingParams) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');

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
      status: 'active',
    };

    const lockedAt = newClosing.closedAt;
    const periodKey = closedPeriodKey(periodType, startDate);
    const closedPeriod: ClosedPeriod = {
      id: periodKey,
      periodType,
      startDate,
      endDate,
      closingId: newClosing.id,
      closedAt: newClosing.closedAt,
    };

    const expensesToLock = expenses.filter((e) => !e.closingId && isDateInRange(e.date, startDate, endDate));
    const withdrawalsToLock = withdrawals.filter((w) => !w.closingId && isDateInRange(w.date, startDate, endDate));

    const ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void> = [
      (b) => b.set(doc(db, 'businesses', activeBusinessId!, 'closings', newClosing.id), newClosing),
      (b) => b.set(doc(db, 'businesses', activeBusinessId!, 'closedPeriods', periodKey), closedPeriod),
      ...expensesToLock.map((e) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'expenses', e.id), { closingId: newClosing.id, lockedAt })
      ),
      ...withdrawalsToLock.map((w) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'withdrawals', w.id), { closingId: newClosing.id, lockedAt })
      ),
    ];
    await commitInChunks(ops);

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

  // [Closing Integrity Amendment v1.0 — Q4: period reopening, Owner-only,
  // logged] Replaces the old deleteClosing, which literally deleted the
  // Closing document. The amendment decided a Closing is never deleted —
  // reopening supersedes it in place (status: 'reopened'), so the original
  // frozen snapshot remains a permanent historical record of what this
  // Closing captured at close time (Architecture 8.8: "re-opens the
  // period; never edits the frozen figures retroactively"). Every Expense/
  // Withdrawal this Closing had locked is unlocked (closingId/lockedAt
  // cleared) so it can be corrected; a brand-new Closing is required to
  // re-lock the period afterward — recordClosing above will accept one,
  // since isPeriodClosed ignores a 'reopened' Closing.
  //
  // Deliberately Owner-only — NOT covered by a Manager's granted
  // 'closings' permission (BDS #16), since that permission governs
  // *recording* a Closing, not undoing one (Amendment v1.0 Decisions
  // Record). Enforced here and, independently, in firestore.rules.
  const reopenClosing = async (id: string, reason?: string) => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode reabrir um período fechado.');

    const target = closings.find((c) => c.id === id);
    if (!target) throw new Error('Fecho não encontrado.');
    if ((target.status ?? 'active') !== 'active') {
      throw new Error('Este período já foi reaberto anteriormente.');
    }

    const reopenedAt = new Date().toISOString();
    const closingUpdate: Record<string, unknown> = {
      status: 'reopened',
      reopenedAt,
      reopenedByUid: currentUser?.uid || '',
      reopenedByName: userProfile?.name || '',
    };
    if (reason && reason.trim()) closingUpdate.reopenReason = reason.trim();

    const lockedExpenses = expenses.filter((e) => e.closingId === id);
    const lockedWithdrawals = withdrawals.filter((w) => w.closingId === id);

    const ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void> = [
      (b) => b.update(doc(db, 'businesses', activeBusinessId!, 'closings', id), closingUpdate),
      (b) => b.delete(doc(db, 'businesses', activeBusinessId!, 'closedPeriods', closedPeriodKey(target.periodType, target.startDate))),
      ...lockedExpenses.map((e) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'expenses', e.id), { closingId: deleteField(), lockedAt: deleteField() })
      ),
      ...lockedWithdrawals.map((w) => (b: ReturnType<typeof createFirestoreBatch>) =>
        b.update(doc(db, 'businesses', activeBusinessId!, 'withdrawals', w.id), { closingId: deleteField(), lockedAt: deleteField() })
      ),
    ];
    await commitInChunks(ops);

    await logTimelineEvent({
      type: 'period-reopened',
      date: reopenedAt.slice(0, 10),
      title: 'Período Reaberto',
      description: `Período "${target.periodLabel}" reaberto por ${userProfile?.name || 'Dono'}${reason && reason.trim() ? ` — ${reason.trim()}` : ''}. As despesas e retiradas deste período foram desbloqueadas para correção.`,
      details: {
        periodLabel: target.periodLabel,
        startDate: target.startDate,
        endDate: target.endDate,
        ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
      },
    });
  };

  // [Closing Integrity Amendment v1.0 — backfill decision] One-time,
  // idempotent, Owner-only migration: attaches closingId/lockedAt to every
  // Expense/Withdrawal that falls inside an already-recorded (pre-amendment)
  // active Closing's range but doesn't have a lock yet, and writes the
  // ClosedPeriod lock-index doc for any active Closing missing one. Safe to
  // run more than once — anything already locked/indexed is skipped, so
  // this can be re-run harmlessly if it's ever interrupted partway.
  const backfillClosingLocks = async (): Promise<{ closingsIndexed: number; expensesLocked: number; withdrawalsLocked: number }> => {
    if (!activeBusinessId) throw new Error('Sem negócio associado.');
    if (!isOwner) throw new Error('Apenas o dono pode aplicar esta migração.');

    const activeClosings = closings.filter((c) => (c.status ?? 'active') === 'active');
    const existingPeriodKeys = new Set(closedPeriods.map((p) => p.id));

    const ops: Array<(batch: ReturnType<typeof createFirestoreBatch>) => void> = [];
    let closingsIndexed = 0;
    let expensesLocked = 0;
    let withdrawalsLocked = 0;

    for (const c of activeClosings) {
      const periodKey = closedPeriodKey(c.periodType, c.startDate);
      if (!existingPeriodKeys.has(periodKey)) {
        const closedPeriod: ClosedPeriod = {
          id: periodKey,
          periodType: c.periodType,
          startDate: c.startDate,
          endDate: c.endDate,
          closingId: c.id,
          closedAt: c.closedAt,
        };
        ops.push((b) => b.set(doc(db, 'businesses', activeBusinessId!, 'closedPeriods', periodKey), closedPeriod));
        closingsIndexed++;
      }

      const lockedAt = c.closedAt;
      expenses
        .filter((e) => !e.closingId && isDateInRange(e.date, c.startDate, c.endDate))
        .forEach((e) => {
          ops.push((b) => b.update(doc(db, 'businesses', activeBusinessId!, 'expenses', e.id), { closingId: c.id, lockedAt }));
          expensesLocked++;
        });
      withdrawals
        .filter((w) => !w.closingId && isDateInRange(w.date, c.startDate, c.endDate))
        .forEach((w) => {
          ops.push((b) => b.update(doc(db, 'businesses', activeBusinessId!, 'withdrawals', w.id), { closingId: c.id, lockedAt }));
          withdrawalsLocked++;
        });
    }

    await commitInChunks(ops);
    return { closingsIndexed, expensesLocked, withdrawalsLocked };
  };

  const deleteQuebra = async (id: string) => {
    if (!activeBusinessId) return;
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'quebras', id));
  };

  // [Closing Integrity Amendment v1.0 — protects existing records, the
  // "Half 1" gap specs #8/#9 already named]. firestore.rules enforces this
  // independently (allow delete only if resource.data.closingId is absent) —
  // this client-side check exists purely to fail fast with a clear message
  // instead of a raw permission-denied.
  const deleteExpense = async (id: string) => {
    if (!activeBusinessId) return;
    const target = expenses.find((e) => e.id === id);
    if (target?.closingId) {
      throw new Error('Esta despesa pertence a um período já fechado e não pode ser removida. Reabra o período em Fechos para a corrigir.');
    }
    await deleteDoc(doc(db, 'businesses', activeBusinessId, 'expenses', id));
  };

  // Edits catalog metadata only (name, category, supplier, sku, barcode,
  // reference cost/selling price). Never touches batches, quebras, or any
  // Investment/Market/Profit figure — those are always derived from the
  // StockBatch records themselves, untouched by this function.
  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    const payload: Partial<Product> = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'businesses', businessId, 'products', id), payload as any);
  };

  const deleteProduct = async (id: string) => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

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
    if (!activeBusinessId || (!isOwner && !canManagerManageStaff)) throw new Error('Apenas o dono ou um gestor autorizado pode adicionar funcionários.');

    const businessId = activeBusinessId;
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

  // Deleting a staff member must fully revoke their access — including
  // their Firebase Authentication account, which the client SDK has no
  // permission to delete for anyone but itself. That privileged step (plus
  // the matching Firestore cleanup and audit entry) happens server-side,
  // on our own Express/Node server (server/index.ts) authenticated with a
  // Firebase Admin SDK service account. Deliberately NOT a Cloud Function —
  // Cloud Functions requires the Blaze billing plan; this runs on the same
  // Railway service that already hosts the app.
  const deleteStaffMember = async (staffUid: string, reason?: string) => {
    if (!activeBusinessId || (!isOwner && !canManagerManageStaff)) {
      throw new Error('Apenas o dono ou um gestor autorizado pode remover funcionários.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();

    let response: Response;
    try {
      response = await fetch('/api/staff/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          staffUid,
          businessId: activeBusinessId,
          reason,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Erro ao remover funcionário. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const _staffActionRequest = async (
    endpoint: 'suspend' | 'reactivate',
    staffUid: string,
    reason?: string
  ) => {
    if (!activeBusinessId || (!isOwner && !canManagerManageStaff)) {
      throw new Error('Apenas o dono ou um gestor autorizado pode gerir funcionários.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();

    let response: Response;
    try {
      response = await fetch(`/api/staff/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          staffUid,
          businessId: activeBusinessId,
          reason,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = endpoint === 'suspend'
        ? 'Erro ao suspender funcionário. Tente novamente.'
        : 'Erro ao reativar funcionário. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  // Reversible alternative to deleteStaffMember: blocks the staff member's
  // access entirely (Firebase Auth account disabled + refresh tokens
  // revoked server-side) without touching any data they've entered.
  const suspendStaffMember = async (staffUid: string, reason?: string) => {
    await _staffActionRequest('suspend', staffUid, reason);
  };

  const reactivateStaffMember = async (staffUid: string) => {
    await _staffActionRequest('reactivate', staffUid);
  };

  // BDS #16 — Admin-only. Promotes/demotes staffTier and sets which
  // Manager permissions are granted. Deliberately not routed through
  // _staffActionRequest: that helper allows a granted Manager, and tier/
  // permission changes must never be delegable, even to a Manager with
  // staffManagement granted.
  const setStaffTier = async (
    staffUid: string,
    staffTier: StaffTier,
    managerPermissions?: Partial<ManagerPermissions>
  ) => {
    if (!activeBusinessId || !isOwner) {
      throw new Error('Apenas o dono pode alterar o nível de um funcionário.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();
    let response: Response;
    try {
      response = await fetch('/api/staff/set-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          staffUid,
          businessId: activeBusinessId,
          staffTier,
          managerPermissions,
        }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Erro ao atualizar o nível do funcionário. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const resetStaffPin = async (staffUid: string, newPin: string) => {
    if (!/^\d{6}$/.test(newPin)) {
      throw new Error('O PIN deve ter exatamente 6 dígitos numéricos.');
    }
    if (!activeBusinessId || !isOwner) {
      throw new Error('Apenas o dono pode redefinir o PIN de um funcionário.');
    }
    if (!currentUser) {
      throw new Error('A sua sessão expirou. Inicie sessão novamente.');
    }

    const idToken = await currentUser.getIdToken();
    let response: Response;
    try {
      response = await fetch('/api/staff/reset-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ staffUid, businessId: activeBusinessId, newPin }),
      });
    } catch {
      throw new Error('Sem ligação ao servidor. Verifique a sua internet e tente novamente.');
    }

    if (!response.ok) {
      let message = 'Erro ao redefinir o PIN. Tente novamente.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loadSampleData = async () => {
    if (!activeBusinessId || !isOwner) return;
    const businessId = activeBusinessId;

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
    if (!activeBusinessId || !isOwner) return;
    const businessId = activeBusinessId;

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
    // [Closing Integrity Amendment v1.0] Closings can no longer be
    // deleted at all (firestore.rules: allow delete: if false — a Closing
    // is permanent, only ever superseded via reopenClosing). "Clear All
    // Data" therefore no longer removes Closing or ClosedPeriod records —
    // attempting to would simply fail against the rule. This is a real,
    // deliberate behavior change from before this amendment (when
    // deleteClosing did a plain deleteDoc) and is worth a product decision
    // on whether "Limpar Todos os Dados" should still claim to wipe
    // literally everything, or whether its copy should be updated to
    // reflect that Closings now survive a reset by design — flagged here,
    // not silently decided.
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
        isManager,
        canManagerCloseBooks,
        canManagerManageStaff,
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
        reopenClosing,
        backfillClosingLocks,
        isPeriodClosed,
        timelineEvents,
        logReportExport,
        deleteQuebra,
        deleteExpense,
        updateProduct,
        deleteProduct,
        addStaffMember,
        deleteStaffMember,
        suspendStaffMember,
        reactivateStaffMember,
        resetStaffPin,
        setStaffTier,
        pairedDevice,
        pairDevice,
        unpairDevice,
        suspensionNotice,
        clearSuspensionNotice: () => setSuspensionNotice(null),
        ownedBusinesses,
        activeBusinessId,
        maxShopsPerOwner: MAX_SHOPS_PER_OWNER,
        addShop,
        switchShop,
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
