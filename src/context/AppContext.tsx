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
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_BATCHES, INITIAL_QUEBRAS, INITIAL_EXPENSES } from '../data/sampleData';

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

interface AppContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  business: Business | null;
  isAuthLoading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  products: Product[];
  batches: StockBatch[];
  quebras: Quebra[];
  expenses: Expense[];
  staffMembers: StaffMember[];
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  businessCategory: string;
  setBusinessCategory: (category: string) => void;
  addStockBatch: (params: AddStockParams) => Promise<{ productId: string; batchId: string }>;
  addMultipleStockBatches: (items: AddStockParams[]) => Promise<void>;
  addQuebra: (params: AddQuebraParams) => Promise<Quebra>;
  addExpense: (params: AddExpenseParams) => Promise<Expense>;
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
  const [quebras, setQuebras] = useState<Quebra[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const isOwner = userProfile?.role === 'owner';
  const isStaff = userProfile?.role === 'staff';

  const currencySymbol = business?.currencySymbol || 'MT';
  const businessCategory = business?.category || '';

  // Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setBusiness(null);
        setProducts([]);
        setBatches([]);
        setQuebras([]);
        setExpenses([]);
        setStaffMembers([]);
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
      setQuebras([]);
      setExpenses([]);
      setStaffMembers([]);
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

    return () => {
      unsubBusiness();
      unsubProducts();
      unsubBatches();
      unsubQuebras();
      unsubExpenses();
      unsubStaff();
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

  const addStockBatch = async ({ productName, dateEntered, quantity, unit, costPrice, sellingPrice }: AddStockParams) => {
    if (!userProfile?.businessId) throw new Error('Sem negócio associado.');

    const businessId = userProfile.businessId;
    const trimmedName = productName.trim();

    let product = products.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
    let productId = product?.id;

    if (!product) {
      productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      const newProd: Product = {
        id: productId,
        name: trimmedName,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'businesses', businessId, 'products', productId), newProd);
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

    return { productId: productId!, batchId: newBatchId };
  };

  const addMultipleStockBatches = async (items: AddStockParams[]) => {
    if (!userProfile?.businessId || !items.length) return;
    const businessId = userProfile.businessId;

    const fsBatch = createFirestoreBatch(db);

    // Track products updated/created in this loop
    const tempProducts = [...products];
    const tempBatches = [...batches];

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
      }

      // Close open batches for this product
      const openBatches = tempBatches.filter((b) => b.productId === productId && b.status === 'open');
      for (const b of openBatches) {
        const batchRef = doc(db, 'businesses', businessId, 'batches', b.id);
        fsBatch.update(batchRef, { status: 'closed' });
        b.status = 'closed';
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
      };

      const newBatchRef = doc(db, 'businesses', businessId, 'batches', newBatchId);
      fsBatch.set(newBatchRef, newBatch);
      tempBatches.push(newBatch);
    }

    await fsBatch.commit();
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
    return newExpense;
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
    for (const q of quebras) {
      await deleteDoc(doc(db, 'businesses', businessId, 'quebras', q.id));
    }
    for (const e of expenses) {
      await deleteDoc(doc(db, 'businesses', businessId, 'expenses', e.id));
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
        quebras,
        expenses,
        staffMembers,
        currencySymbol,
        setCurrencySymbol,
        businessCategory,
        setBusinessCategory,
        addStockBatch,
        addMultipleStockBatches,
        addQuebra,
        addExpense,
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
