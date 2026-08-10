import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { PackagePlus, CheckCircle2, ArrowRight, Tag, Plus, Trash2, Search, Sparkles, Info, X, Truck } from 'lucide-react';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import { PurchaseDraftLineItem } from '../types';

interface AddStockViewProps {
  initialProductName?: string;
  onComplete: () => void;
}

interface StockRowItem {
  id: string;
  productName: string;
  dateEntered: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  isDropdownOpen?: boolean;
  isUnitPopoverOpen?: boolean;
}

// [Durable Purchase Capture Amendment v1.0] Row <-> draft-line-item
// converters, directly modeled on InitialStockCountView's own
// rowToDraftItem/draftItemToRow — the UI-only fields (isDropdownOpen,
// isUnitPopoverOpen) are never persisted, same reasoning.
const rowToDraftLineItem = (row: StockRowItem): PurchaseDraftLineItem => ({
  id: row.id,
  productName: row.productName,
  dateEntered: row.dateEntered,
  quantity: parseFloat(row.quantity) || 0,
  unit: row.unit,
  costPrice: parseFloat(row.costPrice) || 0,
  sellingPrice: parseFloat(row.sellingPrice) || 0,
});

const draftLineItemToRow = (item: PurchaseDraftLineItem): StockRowItem => ({
  id: item.id,
  productName: item.productName,
  dateEntered: item.dateEntered || getTodayDateString(),
  quantity: item.quantity ? String(item.quantity) : '',
  unit: item.unit || 'un',
  costPrice: item.costPrice ? String(item.costPrice) : '',
  sellingPrice: item.sellingPrice ? String(item.sellingPrice) : '',
  isDropdownOpen: false,
  isUnitPopoverOpen: false,
});

export const AddStockView: React.FC<AddStockViewProps> = ({ initialProductName, onComplete }) => {
  const {
    products,
    batches,
    suppliers,
    addMultipleStockBatches,
    currencySymbol,
    businessCategory,
    isStaff,
    subscriptionBlocksNewRecords,
    purchaseDraft,
    purchaseDraftLoaded,
    savePurchaseDraft,
    clearPurchaseDraft,
    attachPurchaseEventId,
    activeBusinessId,
  } = useApp();
  const { t } = useLanguage();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createEmptyRow = (productName: string = ''): StockRowItem => {
    let initialCost = '';
    let initialSell = '';
    let initialUnit = suggestedUnits[0] || 'un';

    if (productName) {
      const match = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
      if (match) {
        const productBatches = batches.filter(b => b.productId === match.id);
        if (productBatches.length > 0) {
          const latest = productBatches[0];
          initialCost = String(latest.costPrice);
          initialSell = String(latest.sellingPrice);
          if (latest.unit) initialUnit = latest.unit;
        } else if (match.costPrice != null || match.sellingPrice != null) {
          // No batches yet — fall back to the product's reference price
          // (set via "Editar Detalhes") instead of the generic defaults.
          if (match.costPrice != null) initialCost = String(match.costPrice);
          if (match.sellingPrice != null) initialSell = String(match.sellingPrice);
        }
      }
    }

    return {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      productName,
      dateEntered: getTodayDateString(),
      quantity: '50',
      unit: initialUnit,
      costPrice: initialCost || '1.50',
      sellingPrice: initialSell || '3.00',
      isDropdownOpen: false,
      isUnitPopoverOpen: false,
    };
  };

  const [rows, setRows] = useState<StockRowItem[]>(() => [createEmptyRow(initialProductName || '')]);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [date, setDate] = useState(getTodayDateString());
  const [isSaving, setIsSaving] = useState(false);

  // Supplier applies to the whole purchase (batch), not to individual
  // product rows — every item added in this session was bought from the
  // same supplier, on the same purchase event.
  //
  // [Durable Purchase Capture Amendment v1.0] supplierId is set only
  // when an EXISTING SupplierRecord was selected from the autocomplete
  // below — in that case name/phone/notes below mirror that record's
  // current values and are read-only in the UI (editing an existing
  // supplier's details is a separate, Owner-only action, out of scope
  // here — see the Rule 8 Assessment). When supplierId is unset, the
  // three fields are plain, editable free text for a not-yet-created
  // supplier, exactly as before this amendment.
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [batchNotes, setBatchNotes] = useState('');

  // [Durable Purchase Capture Amendment v1.0] Draft lifecycle state —
  // directly modeled on InitialStockCountView's own draftLoaded/
  // draftSaveState/skipNextAutosave/loadedForBusinessId, adapted from a
  // per-business draft to a per-(business, user) one. See Rule 8
  // Assessment, Section 12 for the full lifecycle this implements.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [wasRestoredFromDraft, setWasRestoredFromDraft] = useState(false);
  const skipNextAutosave = useRef(false);
  // [Multi-Supplier Purchase Event Amendment v1.0, Part 7] Purely
  // local, in-memory correlation state for an in-progress multi-
  // supplier chain — undefined until the Admin explicitly clicks "Add
  // Another Supplier" for the first time (lazy assignment, amendment
  // Part 7's central discipline: never assigned by default).
  // currentPurchaseEventId, once set, is passed directly into every
  // subsequent addMultipleStockBatches/savePurchaseDraft call in this
  // same chain. justFinalizedPurchaseBatchId remembers the most
  // recently finalized PurchaseBatch's id specifically so the FIRST
  // "Add Another Supplier" click can retroactively tag that one
  // already-created batch (it was created before any correlation
  // decision existed, so it can't have received purchaseEventId at
  // creation time the way every later batch in the chain can).
  const [currentPurchaseEventId, setCurrentPurchaseEventId] = useState<string | undefined>(undefined);
  const [justFinalizedPurchaseBatchId, setJustFinalizedPurchaseBatchId] = useState<string | undefined>(undefined);
  // Holds the pending setTimeout(() => onComplete(), ...) handle from
  // the success screen so "Add Another Supplier" can cancel it —
  // without this, onComplete() would still fire on its own schedule
  // and (for Owner/Manager) unmount this component mid-chain, silently
  // discarding currentPurchaseEventId and any newly-typed rows. This
  // is exactly the class of hazard the amendment's Part 7 findings
  // warn about, applied to the timer specifically, not just routing.
  const pendingCompleteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // [Fix — business-switch draft staleness, Option B, mirrored from
  // InitialStockCountView] AddStockView is not remounted on a business
  // switch (selected only by activeTab), so this component's own
  // "loaded once" latch must be re-armed explicitly when the active
  // business changes, or the previous business's already-loaded rows
  // would keep showing under the new one.
  const [loadedForBusinessId, setLoadedForBusinessId] = useState<string | null>(activeBusinessId ?? null);

  useEffect(() => {
    if (activeBusinessId === loadedForBusinessId) return;
    setLoadedForBusinessId(activeBusinessId ?? null);
    setRows([createEmptyRow('')]);
    setDate(getTodayDateString());
    setSupplierId(undefined);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierNotes('');
    setBatchNotes('');
    setSubmittedMessage(null);
    setIsSaving(false);
    setDraftSaveState('idle');
    setWasRestoredFromDraft(false);
    // [Multi-Supplier Purchase Event Amendment v1.0] A Purchase Event
    // cannot span two businesses (PurchaseBatch is already business-
    // scoped, amendment Part 7) — reset unconditionally, same as every
    // other local field above. Also cancel any pending success-screen
    // auto-redirect, since it captured the PREVIOUS business's onComplete
    // closure.
    setCurrentPurchaseEventId(undefined);
    setJustFinalizedPurchaseBatchId(undefined);
    if (pendingCompleteTimeout.current) {
      clearTimeout(pendingCompleteTimeout.current);
      pendingCompleteTimeout.current = null;
    }
    skipNextAutosave.current = false;
    setDraftLoaded(false); // re-arms the load effect below for the new business
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  // Load the existing Purchase Draft (if any) exactly once, the first
  // time Firestore's real answer becomes available for the CURRENT
  // (business, user) pair — this is what makes the draft survive
  // refresh/logout/device change: it's read from Firestore, not from
  // anything local. Directly modeled on InitialStockCountView's own
  // load effect; see that component's comment for the full race this
  // avoids (onSnapshot's first callback is always asynchronous).
  useEffect(() => {
    if (draftLoaded) return;
    if (loadedForBusinessId !== activeBusinessId) return; // still catching up to a business switch — the reset effect above will re-run this once it settles
    if (!purchaseDraftLoaded) return; // Firestore hasn't answered yet — wait
    if (purchaseDraft === null) {
      // Firestore has now confirmed: no draft exists for this user on
      // this business yet — if a product name was handed in via props
      // (e.g. "add stock for this product" from elsewhere in the app),
      // seed the one initial row with it; otherwise keep the single
      // default empty row.
      if (initialProductName) {
        setRows([createEmptyRow(initialProductName)]);
      }
      setDraftLoaded(true);
      return;
    }
    // Defense in depth: if the user has already started typing into the
    // default row during the (small, but non-zero) window before
    // Firestore's answer arrived, don't clobber their in-progress input
    // with an older saved draft — their current typing wins, and it
    // will autosave over the old draft shortly.
    const userHasStartedTyping = rows.some(
      (r) => r.productName.trim() || r.quantity || r.costPrice || r.sellingPrice
    );
    if (!userHasStartedTyping) {
      skipNextAutosave.current = true;
      if (purchaseDraft.items.length > 0) {
        setRows(purchaseDraft.items.map(draftLineItemToRow));
        setWasRestoredFromDraft(true);
      }
      setDate(purchaseDraft.date);
      setSupplierId(purchaseDraft.supplierId);
      setSupplierName(purchaseDraft.supplierName || '');
      setSupplierPhone(purchaseDraft.supplierPhone || '');
      setSupplierNotes(purchaseDraft.supplierNotes || '');
      setBatchNotes(purchaseDraft.notes || '');
    }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseDraft, purchaseDraftLoaded, loadedForBusinessId, activeBusinessId]);

  // Autosave to the persistent draft on every meaningful change,
  // debounced (same 800ms interval as Module #10's Initial Stock
  // draft) so a fast typist doesn't trigger a write per keystroke.
  // Never runs before the initial load above, and never runs while a
  // submit is already in flight or has just succeeded (submittedMessage
  // set) — nothing left to draft once finalization has started/finished.
  useEffect(() => {
    if (!draftLoaded || isSaving || submittedMessage) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const hasAnyContent =
      rows.some((r) => r.productName.trim() || r.quantity || r.costPrice || r.sellingPrice) ||
      supplierName.trim() ||
      batchNotes.trim();
    if (!hasAnyContent) return;

    setDraftSaveState('saving');
    const handle = setTimeout(() => {
      savePurchaseDraft(
        rows.map(rowToDraftLineItem),
        { supplierId, supplierName: supplierName || undefined, supplierPhone: supplierPhone || undefined, supplierNotes: supplierNotes || undefined },
        date,
        batchNotes || undefined,
        // [Multi-Supplier Purchase Event Amendment v1.0, Part 6] carries
        // the correlation forward through an interruption while
        // entering a SECOND (or later) supplier's products — undefined
        // for a normal, unextended purchase, matching today's behavior
        // exactly.
        currentPurchaseEventId
      )
        .then(() => setDraftSaveState('saved'))
        .catch(() => setDraftSaveState('idle'));
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, date, supplierId, supplierName, supplierPhone, supplierNotes, batchNotes, draftLoaded, currentPurchaseEventId]);

  // Explicit discard — clears the persisted draft and resets the form
  // to a single empty row, per the amendment's "must be discardable"
  // requirement. Distinct from finalization's automatic clear.
  const handleDiscardDraft = () => {
    if (!window.confirm(t('addStock.draft.discardConfirm'))) return;
    skipNextAutosave.current = true;
    setRows([createEmptyRow('')]);
    setDate(getTodayDateString());
    setSupplierId(undefined);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierNotes('');
    setBatchNotes('');
    setDraftSaveState('idle');
    setWasRestoredFromDraft(false);
    clearPurchaseDraft().catch(() => {
      // Best-effort — if this fails (e.g. transient network issue), the
      // local form is already reset; the next autosave (now empty
      // content, so it won't fire — see hasAnyContent above) simply
      // leaves whatever was last persisted. Not surfaced as a blocking
      // error since the user's immediate intent (start over locally)
      // already succeeded.
    });
  };

  const updateRow = (id: string, fields: Partial<StockRowItem>) => {
    setRows(prev =>
      prev.map(row => (row.id === id ? { ...row, ...fields } : row))
    );
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, createEmptyRow('')]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const handleSelectProductForTool = (rowId: string, name: string) => {
    const match = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    let newCost = '';
    let newSell = '';
    let newUnit = suggestedUnits[0] || 'un';

    if (match) {
      const productBatches = batches.filter(b => b.productId === match.id);
      if (productBatches.length > 0) {
        const latest = productBatches[0];
        newCost = String(latest.costPrice);
        newSell = String(latest.sellingPrice);
        if (latest.unit) newUnit = latest.unit;
      } else if (match.costPrice != null || match.sellingPrice != null) {
        if (match.costPrice != null) newCost = String(match.costPrice);
        if (match.sellingPrice != null) newSell = String(match.sellingPrice);
      }
    }

    updateRow(rowId, {
      productName: name,
      costPrice: newCost || undefined,
      sellingPrice: newSell || undefined,
      unit: newUnit || undefined,
      isDropdownOpen: false,
    });
  };

  // [Durable Purchase Capture Amendment v1.0] Selecting an existing
  // SupplierRecord fills name/phone/notes from its current data and
  // locks those fields (Rule 8 Assessment, Section 13 — editing an
  // existing supplier's own details is a separate, out-of-scope
  // action; the finalization function resolves the historical snapshot
  // from the record's CURRENT data by supplierId regardless of what's
  // shown here, so keeping these fields read-only avoids the form
  // implying an edit that wouldn't actually be saved).
  const handleSelectSupplier = (s: { id: string; name: string; phone?: string; notes?: string }) => {
    setSupplierId(s.id);
    setSupplierName(s.name);
    setSupplierPhone(s.phone || '');
    setSupplierNotes(s.notes || '');
    setIsSupplierDropdownOpen(false);
  };

  // Clears the selection, returning to free-text entry for a
  // not-yet-created supplier (or a different existing one via search).
  const handleChangeSupplier = () => {
    setSupplierId(undefined);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierNotes('');
  };

  // Submission validation and handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate rows
    const itemsToSave = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trimmedName = row.productName.trim();
      const numQty = parseFloat(row.quantity) || 0;
      const numCost = parseFloat(row.costPrice) || 0;
      const numSell = parseFloat(row.sellingPrice) || 0;

      if (!trimmedName) {
        alert(t('addStock.errors.missingName', { n: i + 1 }));
        return;
      }

      if (numQty <= 0) {
        alert(t('addStock.errors.invalidQty', { n: i + 1, name: trimmedName }));
        return;
      }

      if (numCost < 0 || numSell < 0) {
        alert(t('addStock.errors.invalidPrice', { n: i + 1, name: trimmedName }));
        return;
      }

      itemsToSave.push({
        productName: trimmedName,
        dateEntered: row.dateEntered,
        quantity: numQty,
        unit: row.unit || 'un',
        costPrice: numCost,
        sellingPrice: numSell,
      });
    }

    // Call multi-batch handler — everything in this session is grouped
    // into one Purchase Batch (Investment Ledger entry) under this supplier.
    // addMultipleStockBatches is async (a Firestore batch write that can
    // reject — missing activeBusinessId, network failure, permission
    // denial) — this must be awaited and caught, or the rejection is
    // silently swallowed and the UI reports a successful stock intake that
    // was never actually saved. Same class of bug already fixed in
    // AddExpenseView/AddWithdrawalView/AddQuebraView.
    //
    // [Durable Purchase Capture Amendment v1.0] supplierId is passed
    // through when an existing SupplierRecord was selected — the
    // function resolves the historical snapshot (name/phone/notes)
    // from that record's current data itself (Rule 8 Assessment,
    // Section 13); the free-text fields below still cover the
    // not-yet-created-supplier case exactly as before this amendment.
    // On success, addMultipleStockBatches also deletes this user's
    // Purchase Draft atomically in the same Firestore batch — no
    // separate clearPurchaseDraft() call is needed or made here; if
    // this call fails/rejects, the draft is guaranteed to remain
    // exactly as it was (same Firestore batch atomicity), so the
    // catch block below deliberately does NOT touch the draft either.
    //
    // [Multi-Supplier Purchase Event Amendment v1.0] currentPurchaseEventId
    // is undefined for a normal, unextended purchase (unchanged
    // behavior) — set only once the Admin has already clicked "Add
    // Another Supplier" earlier in this same chain, in which case this
    // NEW batch is correlated at creation time directly (no retroactive
    // tag needed for it — only the very first batch in a chain needs
    // that, handled in handleAddAnotherSupplier below).
    setIsSaving(true);
    try {
      const result = await addMultipleStockBatches(
        itemsToSave,
        { name: supplierName, phone: supplierPhone, notes: supplierNotes },
        batchNotes,
        supplierId,
        currentPurchaseEventId
      );

      const messageText =
        itemsToSave.length === 1
          ? t('addStock.successMessageSingle', { product: itemsToSave[0].productName })
          : t('addStock.successMessageMultiple', { count: itemsToSave.length });

      setSubmittedMessage(messageText);
      setJustFinalizedPurchaseBatchId(result.purchaseBatchId ?? undefined);
      setSupplierId(undefined);
      setSupplierName('');
      setSupplierPhone('');
      setSupplierNotes('');
      setBatchNotes('');
      setWasRestoredFromDraft(false);

      // [Multi-Supplier Purchase Event Amendment v1.0] The handle is
      // stored so handleAddAnotherSupplier can cancel it — without
      // this, onComplete() would still fire on its own schedule even
      // after the Admin chooses to continue the purchase, and (for
      // Owner/Manager, whose activeTab actually changes) unmount this
      // component mid-chain. Extended from the pre-amendment 1200ms to
      // give a human enough time to actually read and click the new
      // "Add Another Supplier" action the success screen now shows —
      // 1200ms was tuned for an auto-redirect with nothing to click;
      // it is not long enough once there's a decision to make.
      pendingCompleteTimeout.current = setTimeout(() => {
        pendingCompleteTimeout.current = null;
        onComplete();
      }, 5000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao registar a entrada de stock.');
    } finally {
      setIsSaving(false);
    }
  };

  // [Multi-Supplier Purchase Event Amendment v1.0, Part 7] "Adicionar
  // Outro Fornecedor a Esta Compra" — the ONLY way a purchaseEventId is
  // ever assigned (lazy, explicit-click-only, never a default).
  //
  // CRITICAL, per the Rule 8 Assessment's own required review point:
  // this performs a true IN-PLACE local reset. It must never call
  // onComplete() or rely on tab navigation — that plumbing is proven
  // unreliable for exactly this scenario (see the two findings recorded
  // in the amendment's Part 7: Staff never unmount on the same-tab
  // route, and submittedMessage is never otherwise reset for them).
  const handleAddAnotherSupplier = async () => {
    // Cancel the pending auto-redirect first — it captured this exact
    // moment's onComplete() closure and must never fire now that the
    // Admin has chosen to continue instead of finishing.
    if (pendingCompleteTimeout.current) {
      clearTimeout(pendingCompleteTimeout.current);
      pendingCompleteTimeout.current = null;
    }

    let eventId = currentPurchaseEventId;
    if (!eventId) {
      // First extension in this chain — generate the correlation value
      // (client-generated, matching this codebase's existing
      // ID-generation convention) and retroactively tag the batch that
      // was JUST finalized, since it was created before any
      // correlation decision existed and so couldn't have received
      // purchaseEventId at creation time the way every later batch in
      // this same chain now will (passed directly into
      // addMultipleStockBatches above).
      eventId = 'pevent-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      if (justFinalizedPurchaseBatchId) {
        try {
          await attachPurchaseEventId(justFinalizedPurchaseBatchId, eventId);
        } catch (err) {
          // Degraded, not data-losing: if this retroactive tag fails
          // (transient network issue), the FIRST batch in the chain
          // simply won't be correlated — it remains a fully valid,
          // correctly-valued PurchaseBatch on its own, exactly as
          // every PurchaseBatch already is (amendment Part 7's own "no
          // unfinished event state" principle). Every batch from here
          // on will still correlate correctly with each other, since
          // eventId is now known locally regardless of whether this
          // one retroactive write succeeded. Not surfaced as a
          // blocking error — the Admin's intent (continue the
          // purchase) still succeeds.
        }
      }
      setCurrentPurchaseEventId(eventId);
    }

    // True in-place reset — no onComplete(), no tab navigation.
    skipNextAutosave.current = true;
    setSubmittedMessage(null);
    setRows([createEmptyRow('')]);
    setDate(getTodayDateString());
    setSupplierId(undefined);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierNotes('');
    setBatchNotes('');
    setWasRestoredFromDraft(false);
    setDraftSaveState('idle');
  };

  // Calculate totals across all rows (new batches, so remainingQuantity == quantity — no quebras yet)
  const totals = rows.reduce(
    (acc, row) => {
      const q = parseFloat(row.quantity) || 0;
      const c = parseFloat(row.costPrice) || 0;
      const s = parseFloat(row.sellingPrice) || 0;
      const investmentValue = q * c;
      const marketValue = q * s;
      return {
        totalInvestmentValue: acc.totalInvestmentValue + investmentValue,
        totalMarketValue: acc.totalMarketValue + marketValue,
        totalEmbeddedProfit: acc.totalEmbeddedProfit + (marketValue - investmentValue),
      };
    },
    { totalInvestmentValue: 0, totalMarketValue: 0, totalEmbeddedProfit: 0 }
  );

  // [Durable Purchase Capture Amendment v1.0] Supplier autocomplete
  // filtering — same shape as the Product autocomplete's own
  // filteredProducts/exactMatchExists computed per-row below, applied
  // here once for the single supplier field.
  const supplierSearchLower = supplierName.trim().toLowerCase();
  const filteredSuppliers = supplierSearchLower
    ? suppliers.filter((s) => s.name.toLowerCase().includes(supplierSearchLower))
    : suppliers;
  const exactSupplierMatchExists = suppliers.some((s) => s.name.toLowerCase() === supplierSearchLower);
  const hasDraftContent =
    rows.some((r) => r.productName.trim() || r.quantity || r.costPrice || r.sellingPrice) ||
    supplierName.trim() ||
    batchNotes.trim();

  // Release Readiness Audit finding — pre-empt the write with a clear
  // explanation instead of letting firestore.rules' subscriptionAllowsNewRecords()
  // reject it and surface a raw permission-denied error.
  if (subscriptionBlocksNewRecords) {
    return <SubscriptionBlockedNotice />;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-5">
        {/* Title Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <PackagePlus className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="type-title">{t('addStock.title')}</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t('addStock.subtitle')}
            </p>
          </div>
        </div>

        {/* [Durable Purchase Capture Amendment v1.0] Draft status bar —
            shown only while actively editing (not once submitted), and
            only when there's something meaningful to say: a restored
            banner if a prior draft was just loaded, an autosave status
            indicator, and a discard action, but only once there's
            actual draft content — an empty, never-touched form has
            nothing to discard and nothing to report. */}
        {!submittedMessage && wasRestoredFromDraft && (
          <div className="bg-[#D4AF37]/[0.08] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
            <Info className="w-3.5 h-3.5 text-[#B8952F] shrink-0 mt-[3px]" strokeWidth={2.25} />
            <p className="text-[11.5px] leading-relaxed text-[#5c4a1a]">
              {t('addStock.draft.restoredNotice')}
            </p>
          </div>
        )}

        {!submittedMessage && hasDraftContent && (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-gray-400 flex items-center gap-1.5">
              {draftSaveState === 'saving' && t('addStock.draft.savingIndicator')}
              {draftSaveState === 'saved' && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {t('addStock.draft.savedIndicator')}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-gray-400 hover:text-rose-600 font-semibold transition-colors duration-150 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              {t('addStock.draft.discardButton')}
            </button>
          </div>
        )}

        {submittedMessage ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" strokeWidth={2.25} />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">{t('addStock.successTitle')}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{submittedMessage}</p>
            {/* [Multi-Supplier Purchase Event Amendment v1.0, Part 7/8]
                The only place a Purchase Event correlation is ever
                started — lazy, explicit-click-only. Not clicking this
                simply lets the existing auto-redirect run its course,
                exactly as before this amendment. */}
            <button
              type="button"
              onClick={handleAddAnotherSupplier}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#B8952F] hover:underline"
            >
              <Truck className="w-3.5 h-3.5" strokeWidth={2.25} />
              {t('addStock.event.addAnotherSupplier')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* SUPPLIER (applies to this whole purchase / batch) */}
            <div className="bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0B1F3A]/60 shrink-0" strokeWidth={2.25} />
                <span className="text-[12.5px] font-bold text-[#111827]">{t('addStock.supplier.sectionTitle')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 relative">
                  <label className="block type-label mb-1">
                    {t('addStock.supplier.nameLabel')}
                  </label>
                  {supplierId ? (
                    // Existing SupplierRecord selected — read-only display,
                    // per handleSelectSupplier's own comment: editing an
                    // existing supplier's own details is a separate,
                    // out-of-scope action, so this form never implies it.
                    <div className="flex items-center justify-between gap-2 bg-white border border-[#D4AF37]/40 rounded-[10px] px-2.5 py-2">
                      <span className="text-[13px] text-[#111827] font-semibold truncate">{supplierName}</span>
                      <button
                        type="button"
                        onClick={handleChangeSupplier}
                        className="text-[11px] font-semibold text-[#B8952F] hover:underline shrink-0"
                      >
                        {t('addStock.supplier.changeSupplier')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={t('addStock.supplier.searchPlaceholder')}
                          value={supplierName}
                          onFocus={() => setIsSupplierDropdownOpen(true)}
                          onChange={(e) => {
                            setSupplierName(e.target.value);
                            setIsSupplierDropdownOpen(true);
                          }}
                          className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 pr-7"
                        />
                        <Search className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {isSupplierDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsSupplierDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] max-h-48 overflow-y-auto z-30 divide-y divide-[#F1F3F6]">
                            {filteredSuppliers.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleSelectSupplier(s)}
                                className="w-full text-left px-3 py-2 hover:bg-[#FAFBFC] transition-colors duration-150 flex items-center justify-between text-xs text-[#111827]"
                              >
                                <span className="font-semibold">{s.name}</span>
                                <span className="text-[10px] text-gray-400 bg-[#F5F7FA] px-2 py-0.5 rounded border border-[#E5E7EB]">
                                  {t('addStock.supplier.existingTag')}
                                </span>
                              </button>
                            ))}

                            {supplierName.trim() && !exactSupplierMatchExists && (
                              <button
                                type="button"
                                onClick={() =>
                                  setIsSupplierDropdownOpen(false)
                                }
                                className="w-full text-left px-3 py-2 text-xs text-[#B8952F] font-semibold hover:bg-[#D4AF37]/[0.06] transition-colors duration-150"
                              >
                                {t('addStock.supplier.createNewShort', { name: supplierName.trim() })}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="block type-label mb-1">
                    {t('addStock.supplier.phoneLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('addStock.supplier.phonePlaceholder')}
                    value={supplierPhone}
                    disabled={!!supplierId}
                    onChange={e => setSupplierPhone(e.target.value)}
                    className={`w-full border rounded-[10px] px-2.5 py-2 text-[13px] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 ${
                      supplierId
                        ? 'bg-[#F5F7FA] border-[#E5E7EB] text-gray-500 cursor-not-allowed'
                        : 'bg-white border-[#E5E7EB] text-[#111827]'
                    }`}
                  />
                </div>
              </div>
              {supplierId && (
                <p className="text-[10.5px] text-[#B8952F]">
                  {t('addStock.supplier.selectedHint')}
                </p>
              )}
              <div>
                <label className="block type-label mb-1">
                  {t('addStock.supplier.notesLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('addStock.supplier.notesPlaceholder')}
                  value={batchNotes}
                  onChange={e => setBatchNotes(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <p className="text-[10.5px] text-gray-400">
                {t('addStock.supplier.unspecifiedHint')}
              </p>
            </div>

            {/* COMPACT TABLE */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              {/* Table Header (Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-1.5 items-center px-3 py-2.5 bg-[#FAFBFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wide text-gray-400">
                <div className="col-span-1 text-center">{t('addStock.table.batch')}</div>
                <div className="col-span-3">{t('addStock.table.product')}</div>
                <div className="col-span-2">{t('addStock.table.dateEntered')}</div>
                <div className="col-span-1 text-right">{t('addStock.table.quantity')}</div>
                <div className="col-span-1 text-center">{t('addStock.table.unit')}</div>
                <div className="col-span-1.5 text-right">{t('addStock.table.buyPrice')}</div>
                <div className="col-span-1.5 text-right">{t('addStock.table.sellPrice')}</div>
                {!isStaff ? (
                  <div className="col-span-1 text-right">{t('addStock.table.estProfit')}</div>
                ) : (
                  <div className="col-span-1 text-right">{t('addStock.table.action')}</div>
                )}
              </div>

              {/* Table Body / Dense Rows - Flush with no horizontal dividers */}
              <div className="space-y-0">
                {rows.map((row, index) => {
                  const numQty = parseFloat(row.quantity) || 0;
                  const numCost = parseFloat(row.costPrice) || 0;
                  const numSell = parseFloat(row.sellingPrice) || 0;
                  const rowCost = numQty * numCost;
                  const rowRevenue = numQty * numSell;
                  const rowProfit = rowRevenue - rowCost;

                  // Filter existing products for autocomplete
                  const searchLower = row.productName.trim().toLowerCase();
                  const filteredProducts = products.filter(p =>
                    p.name.toLowerCase().includes(searchLower)
                  );
                  const exactMatchExists = products.some(
                    p => p.name.toLowerCase() === searchLower
                  );

                  return (
                    <div
                      key={row.id}
                      className={`p-2 sm:p-2.5 transition-colors duration-150 group ${
                        index % 2 === 1 ? 'bg-[#FAFBFC]/60' : 'bg-transparent'
                      } hover:bg-[#D4AF37]/[0.04]`}
                    >
                      {/* Desktop Grid Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center text-xs">
                        {/* Lote # */}
                        <div className="col-span-1 text-center">
                          <span className="text-[10px] type-number text-[#0B1F3A] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-1.5 py-0.5 rounded-md">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Produto Autocomplete */}
                        <div className="col-span-3 relative">
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder={t('addStock.productSearchPlaceholder')}
                              value={row.productName}
                              onFocus={() => updateRow(row.id, { isDropdownOpen: true })}
                              onChange={e =>
                                updateRow(row.id, {
                                  productName: e.target.value,
                                  isDropdownOpen: true,
                                })
                              }
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-medium pr-7"
                            />
                            <Search className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Autocomplete Dropdown Popup */}
                          {row.isDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => updateRow(row.id, { isDropdownOpen: false })}
                              />
                              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] max-h-48 overflow-y-auto z-30 divide-y divide-[#F1F3F6]">
                                {filteredProducts.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProductForTool(row.id, p.name)}
                                    className="w-full text-left px-3 py-2 hover:bg-[#FAFBFC] transition-colors duration-150 flex items-center justify-between text-xs text-[#111827]"
                                  >
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="text-[10px] text-gray-400 bg-[#F5F7FA] px-2 py-0.5 rounded border border-[#E5E7EB]">
                                      {t('addStock.existingTag')}
                                    </span>
                                  </button>
                                ))}

                                {row.productName.trim() && !exactMatchExists && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateRow(row.id, {
                                        productName: row.productName.trim(),
                                        isDropdownOpen: false,
                                      })
                                    }
                                    className="w-full text-left px-3 py-2 hover:bg-[#D4AF37]/[0.06] transition-colors duration-150 flex items-center gap-2 text-xs text-[#B8952F] font-semibold"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{t('addStock.createNew', { name: row.productName.trim() })}</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Data Entrada */}
                        <div className="col-span-2">
                          <input
                            type="date"
                            required
                            value={row.dateEntered}
                            onChange={e => updateRow(row.id, { dateEntered: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                          />
                        </div>

                        {/* Quantidade */}
                        <div className="col-span-1">
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.quantity}
                            onChange={e => updateRow(row.id, { quantity: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs text-right transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                          />
                        </div>

                        {/* Unidade + Popover */}
                        <div className="col-span-1 relative">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              required
                              placeholder="un"
                              value={row.unit}
                              onChange={e => updateRow(row.id, { unit: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-1.5 py-2 text-[#111827] text-xs text-center transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.id, { isUnitPopoverOpen: !row.isUnitPopoverOpen })
                              }
                              title={t('addStock.unitSuggestionsTitle')}
                              className="p-1.5 text-gray-400 hover:text-[#0B1F3A] bg-white border border-[#E5E7EB] rounded-[8px] hover:border-gray-300 transition-colors duration-150 shrink-0"
                            >
                              <Tag className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Unit Popover */}
                          {row.isUnitPopoverOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => updateRow(row.id, { isUnitPopoverOpen: false })}
                              />
                              <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] p-2.5 z-30 w-36 space-y-1.5">
                                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">
                                  {t('addStock.unitSuggestionsLabel')}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {suggestedUnits.map(u => (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={() =>
                                        updateRow(row.id, {
                                          unit: u,
                                          isUnitPopoverOpen: false,
                                        })
                                      }
                                      className={`text-[10px] px-2 py-1 rounded-md border font-mono transition-colors duration-150 ${
                                        row.unit.toLowerCase() === u.toLowerCase()
                                          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#B8952F] font-bold'
                                          : 'bg-white border-[#E5E7EB] text-gray-500 hover:text-[#111827] hover:border-gray-300'
                                      }`}
                                    >
                                      {u}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Preço Compra */}
                        <div className="col-span-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={row.costPrice}
                            onChange={e => updateRow(row.id, { costPrice: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs text-right transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                          />
                        </div>

                        {/* Preço Venda */}
                        <div className="col-span-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={row.sellingPrice}
                            onChange={e => updateRow(row.id, { sellingPrice: e.target.value })}
                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs text-right transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                          />
                        </div>

                        {/* Lucro Estimado & Delete Button */}
                        <div className="col-span-1 flex items-center justify-end gap-1.5">
                          {!isStaff && (
                            <span
                              className={`type-number text-xs tabular-nums ${
                                rowProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                              title={t('addStock.totalProfitTitle', { value: formatCurrency(rowProfit, currencySymbol) })}
                            >
                              {formatCurrency(rowProfit, currencySymbol)}
                            </span>
                          )}

                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all duration-150"
                              title={t('addStock.removeBatch')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Compact Card/Row Layout (below md breakpoint) */}
                      <div className="md:hidden space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                          <span className="text-[10px] type-number text-[#0B1F3A] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-1.5 py-0.5 rounded-md">
                            {t('addStock.table.batch')} #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`type-number text-xs tabular-nums ${
                                rowProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {t('addStock.estProfitMobile', { value: formatCurrency(rowProfit, currencySymbol) })}
                            </span>
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors duration-150"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="col-span-2 relative">
                            <label className="block type-label mb-1">
                              {t('addStock.table.product')}
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={t('addStock.productSearchPlaceholder')}
                              value={row.productName}
                              onFocus={() => updateRow(row.id, { isDropdownOpen: true })}
                              onChange={e =>
                                updateRow(row.id, {
                                  productName: e.target.value,
                                  isDropdownOpen: true,
                                })
                              }
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                            />
                            {row.isDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => updateRow(row.id, { isDropdownOpen: false })}
                                />
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_16px_40px_-12px_rgba(11,31,58,0.22)] max-h-40 overflow-y-auto z-30 divide-y divide-[#F1F3F6]">
                                  {filteredProducts.map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectProductForTool(row.id, p.name)}
                                      className="w-full text-left px-3 py-2 text-xs text-[#111827] hover:bg-[#FAFBFC] transition-colors duration-150"
                                    >
                                      {p.name}
                                    </button>
                                  ))}
                                  {row.productName.trim() && !exactMatchExists && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateRow(row.id, {
                                          productName: row.productName.trim(),
                                          isDropdownOpen: false,
                                        })
                                      }
                                      className="w-full text-left px-3 py-2 text-xs text-[#B8952F] font-semibold hover:bg-[#D4AF37]/[0.06] transition-colors duration-150"
                                    >
                                      {t('addStock.createNewShort', { name: row.productName.trim() })}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div>
                            <label className="block type-label mb-1">
                              {t('addStock.table.dateEntered')}
                            </label>
                            <input
                              type="date"
                              required
                              value={row.dateEntered}
                              onChange={e => updateRow(row.id, { dateEntered: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                            />
                          </div>

                          <div className="flex gap-1.5">
                            <div className="flex-1">
                              <label className="block type-label mb-1">
                                {t('addStock.table.quantity')}
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={row.quantity}
                                onChange={e => updateRow(row.id, { quantity: e.target.value })}
                                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                              />
                            </div>
                            <div className="w-16">
                              <label className="block type-label mb-1">
                                {t('addStock.table.unit')}
                              </label>
                              <input
                                type="text"
                                required
                                value={row.unit}
                                onChange={e => updateRow(row.id, { unit: e.target.value })}
                                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-1 py-2 text-[#111827] text-xs text-center transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block type-label mb-1">
                              {t('addStock.fields.costPrice', { symbol: currencySymbol })}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.costPrice}
                              onChange={e => updateRow(row.id, { costPrice: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="block type-label mb-1">
                              {t('addStock.fields.sellPrice', { symbol: currencySymbol })}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={row.sellingPrice}
                              onChange={e => updateRow(row.id, { sellingPrice: e.target.value })}
                              className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action to Add Another Product Row */}
            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[12.5px] transition-all duration-150 flex items-center justify-center gap-2 group"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
              <span>{t('addStock.addAnotherProduct')}</span>
            </button>

            {/* Combined Total Summary Bar */}
            {!isStaff && (
              <div className="bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B8952F] shrink-0" strokeWidth={2.25} />
                  <span className="font-bold text-[#111827] text-[12.5px]">
                    {rows.length === 1
                      ? t('addStock.summary.titleOne', { count: rows.length })
                      : t('addStock.summary.titleOther', { count: rows.length })}
                  </span>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 text-[11px]">
                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.totalInvestment')}</span>
                    <span className="font-bold text-[#111827] font-mono tabular-nums">
                      {formatCurrency(totals.totalInvestmentValue, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.marketValue')}</span>
                    <span className="font-bold text-[#111827] font-mono tabular-nums">
                      {formatCurrency(totals.totalMarketValue, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.embeddedProfit')}</span>
                    <span
                      className={`type-number tabular-nums ${
                        totals.totalEmbeddedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(totals.totalEmbeddedProfit, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Auto-closing Notice */}
            <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-start gap-2.5">
              <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[11.5px] leading-relaxed text-gray-600">
                {t('addStock.autoCloseNotice')}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary w-full py-3 px-4 text-sm disabled:opacity-60"
            >
              <span>
                {isSaving
                  ? '...'
                  : rows.length > 1
                  ? t('addStock.submitMultiple', { count: rows.length })
                  : t('addStock.submitOne')}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
