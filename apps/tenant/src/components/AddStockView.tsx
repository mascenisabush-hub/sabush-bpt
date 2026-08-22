import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { PackagePlus, CheckCircle2, ArrowRight, Tag, Plus, Trash2, Search, Sparkles, Info, X, Truck, ScanLine, Loader2, CheckCircle, AlertTriangle, MinusCircle, Camera, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import { PurchaseDraftLineItem, UnitRelationship } from '../types';
import type { SmartStockEntryLineItemProposal, SmartStockEntryFailureReason } from '../context/AppContext';
import { type SupplierWordingCandidate } from '../lib/supplierWordingMatching';
import { resolveSupplierWordingRecognition, resolveScanRowSupplierWording } from '../lib/supplierWordingRecognition';
import { isValidUnitRelationship } from '../lib/unitRelationship';
import { getCurrentUnresolvedRowId, getRowsToDisplay, isReceiptReadyForFinalReview } from '../lib/receiptSequencing';

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
  // [Restock Observation Amendment v1.0] Optional, existing-product-only
  // field: "how much was physically left before this restock". Empty
  // string means "not entered" / "I don't know" — NEVER treated as 0.
  // `previousCycleQuantity` is the most recent prior batch's quantity
  // for the selected product, resolved client-side purely to drive this
  // field's visibility and its explanatory copy — it is never itself
  // submitted; AppContext re-resolves it server-side from `batches`
  // before computing the actual observation.
  previousRemainingQuantity: string;
  previousCycleQuantity?: number;
  // [Smart Stock Entry — Tier 1] Present ONLY for a row populated by a
  // scan proposal, purely to drive the Review Extraction status strip
  // below (BDR-0008's Trust Test — uncertainty must stay visible).
  // Deliberately absent from rowToDraftLineItem/draftLineItemToRow
  // (below) and never sent to addMultipleStockBatches — per the ADR's
  // Decision 2a and BDR-0008 §1a, AI leaves no trace once a row is
  // edited/confirmed like any other. A row this came from is, from that
  // point on, indistinguishable in persisted data from one typed by hand.
  smartEntrySource?: 'ai';
  smartEntryFieldStatus?: {
    productName: 'detected' | 'review' | 'not_found';
    quantity: 'detected' | 'review' | 'not_found';
    unit: 'detected' | 'review' | 'not_found';
    costPrice: 'detected' | 'review' | 'not_found';
  };
  smartEntryProductMatchStatus?: 'confident' | 'uncertain' | 'no_match';

  // [Supplier-Wording Recognition — Checkpoint 3, BDR-0013/POL-0007]
  // Set only when this row's typed productName resolved — via a silent
  // reuse-match, an owner-confirmed candidate, or an owner-initiated
  // declaration (all three governed identically once established,
  // POL-0007) — to an EXISTING product whose canonical name differs
  // from what was actually typed/received. `productName` above is
  // rewritten to that product's canonical name the moment this is set,
  // so every other part of this form (price/unit prefill, submission,
  // exact-match checks) keeps working completely unchanged — this field
  // exists solely to carry the ORIGINAL wording through to finalization,
  // where the actual relationship write happens (Specification §8 —
  // nothing persisted to Product before finalization). `origin: 'reused'`
  // never produces a new write (already confirmed previously); the other
  // two do, transaction-protected (Rule 8 Finding 13).
  pendingSupplierWording?: {
    wording: string;
    productId: string;
    origin: 'reused' | 'confirmed' | 'owner-initiated';
    // The OTHER candidate productIds shown alongside this one, if any —
    // re-checked fresh at finalization so a conflicting concurrent
    // confirmation onto one of them is caught (Rule 8 Finding 13).
    conflictCheckProductIds: string[];
  };
  // Plausible existing-product candidates currently being offered to the
  // owner for this row's typed wording (Specification §3 steps 2–4) —
  // cleared the moment the owner confirms one, declines all of them, or
  // the typed text changes again. Undefined whenever no candidates are
  // being shown (including once resolved either way).
  supplierWordingCandidates?: SupplierWordingCandidate[];
  // True once the owner has explicitly declined every candidate offered
  // for the CURRENT productName value (Specification §4 — New-Product
  // Path) — suppresses re-showing the same candidates for the same text.
  // Never itself persists anything (POL-0007 requirement 6 — no
  // "rejected alias" concept of any kind).
  supplierWordingDeclined?: boolean;
  // [POL-0007 — Conflicting Supplier Wording, mandatory distinguishing
  // information] Set true only when the owner declined a candidate whose
  // proposed grounds included an already-confirmed alternative-wording
  // match — i.e. this exact wording is already an established name for
  // that other product (BDR-0013 item 5's conflict). Gates submission
  // for this row until distinguishingInfo (below) is non-empty.
  supplierWordingConflictPending?: boolean;
  supplierWordingDistinguishingInfo?: string;
  // [Product Memory / UOM — Increment A, Checkpoint 2b] UI-only fields,
  // never persisted (see rowToDraftLineItem, below — deliberately
  // excludes both, same "UI-only, never persisted" treatment as
  // isDropdownOpen/isUnitPopoverOpen already receive). Deliberately
  // scoped to a single optional second unit (a two-level relationship:
  // this row's own `unit` as the top-level/purchase unit, plus one
  // further "selling" unit and how many of it make one `unit`) — the
  // identical scoping InitialStockCountView.tsx's own Checkpoint 2a
  // already established for this same concept; see that file's
  // CountRowItem for the fuller rationale, unchanged here. This
  // capability is STRICTLY SEPARATE from supplierWordingCandidates/
  // pendingSupplierWording above — one identifies which existing
  // Product a wording refers to (BDR-0013/POL-0007); this establishes
  // a genuinely NEW product's unit-of-measure structure (BDR-0012) —
  // they are never merged, and this section is only ever shown for a
  // row that is NOT resolving to an existing product at all (see
  // exactMatchExists in the row-render closure, below).
  newProductSellingUnit?: string;
  newProductSellingUnitFactor?: string;
}

// [Restock Observation Amendment v1.0] The one sentinel value the
// "previous remaining quantity" input can hold besides a numeric
// string or blank — set only by the explicit "I don't know" toggle
// below. Centralized here so every place that checks/clears it stays
// in sync with the toggle's own behavior.
const UNKNOWN_PREVIOUS_REMAINING = 'unknown';

// True only when the operator has actually typed a real (attempted)
// quantity — i.e. neither blank ("not yet entered") nor the explicit
// "I don't know" sentinel. Both of the latter mean the same thing to
// AppContext (no observation persisted) but are kept visually distinct
// in the UI so a genuinely blank field doesn't look like a deliberate
// "I don't know" choice.
const hasKnownPreviousRemainingInput = (value: string): boolean =>
  value.trim() !== '' && value !== UNKNOWN_PREVIOUS_REMAINING;

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
  // [Restock Observation Amendment v1.0] Blank input, and the explicit
  // "I don't know" sentinel, never become 0 (or NaN) in the draft
  // either — "not yet entered"/"unknown" must survive a save/restore
  // cycle as such, never silently turn into a real number.
  ...(hasKnownPreviousRemainingInput(row.previousRemainingQuantity)
    ? { previousRemainingQuantity: parseFloat(row.previousRemainingQuantity) }
    : {}),
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
  previousRemainingQuantity:
    item.previousRemainingQuantity != null ? String(item.previousRemainingQuantity) : '',
  // previousCycleQuantity is deliberately NOT restored from the draft —
  // it's always freshly re-resolved against the live `products`/
  // `batches` state right after restore (see the draft-load effect
  // below), since it may have changed since the draft was saved.
});

// [Product Memory / UOM — Increment A, Checkpoint 2b] Identical
// component/behavior to InitialStockCountView.tsx's own
// UnitRelationshipRow (Checkpoint 2a) — deliberately duplicated rather
// than extracted into a shared file in this checkpoint, so each
// already-committed surface's own tested behavior is never put at risk
// by a shared-dependency refactor. A future cleanup checkpoint may
// consolidate these; that is a pure refactor with no business-rule
// content and is not performed here.
const UnitRelationshipRow: React.FC<{
  purchaseUnit: string;
  sellingUnit: string;
  factor: string;
  onChange: (sellingUnit: string, factor: string) => void;
}> = ({ purchaseUnit, sellingUnit, factor, onChange }) => {
  const [expanded, setExpanded] = useState(!!(sellingUnit || factor));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-400 hover:text-[#0B1F3A] transition-colors duration-150 py-0.5"
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        <span>Produto novo — configurar relação de unidades (opcional)</span>
      </button>
    );
  }

  return (
    <div className="mt-2 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150"
      >
        <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
        <span>Relação de unidades para este produto novo (opcional)</span>
      </button>
      <div className="flex flex-wrap items-end gap-2.5 text-[12.5px]">
        <span className="text-gray-500 pb-2">
          1 <strong className="text-[#111827]">{purchaseUnit || 'un'}</strong> =
        </span>
        <div>
          <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Quantidade</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={factor}
            onChange={(e) => onChange(sellingUnit, e.target.value)}
            placeholder="Ex: 24"
            className="w-24 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono tabular-nums focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Unidade de venda</label>
          <input
            type="text"
            value={sellingUnit}
            onChange={(e) => onChange(e.target.value, factor)}
            placeholder="Ex: Un"
            className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">
        Deixe em branco se não quiser configurar agora — pode fazê-lo mais tarde na ficha do produto.
      </p>
    </div>
  );
};

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
    scanPurchaseDocument,
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

    // [Restock Observation Amendment v1.0] Only set for an existing
    // product that already has at least one prior batch — that batch's
    // quantity is the "previous cycle" the optional field below
    // compares against. undefined for a brand-new product, which is
    // exactly what hides the field for it further down.
    const previousCycleQuantity = resolvePreviousCycleQuantity(productName);

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
      previousRemainingQuantity: '',
      previousCycleQuantity,
    };
  };

  // [Restock Observation Amendment v1.0] Shared resolver for
  // `previousCycleQuantity` — the most recent prior batch's quantity
  // for an existing product, purely to drive the optional field's
  // visibility client-side (see StockRowItem's own comment). Used by
  // createEmptyRow, handleSelectProductForTool, and the draft-restore
  // effect below, so all three stay in sync with the same rule: only
  // an existing product with at least one prior batch gets a value.
  const resolvePreviousCycleQuantity = (productName: string): number | undefined => {
    if (!productName) return undefined;
    const match = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!match) return undefined;
    const productBatches = batches.filter(b => b.productId === match.id);
    return productBatches.length > 0 ? productBatches[0].quantity : undefined;
  };

  const [rows, setRows] = useState<StockRowItem[]>(() => [createEmptyRow(initialProductName || '')]);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [date, setDate] = useState(getTodayDateString());
  const [isSaving, setIsSaving] = useState(false);

  // [Smart Stock Entry — Tier 1] Scan state — purely local UI state, never
  // persisted. 'idle' | 'processing' | 'error'. On success, rows are
  // merged directly into `rows` above (see handleFileSelected) and this
  // resets to 'idle' — there is no separate "review extraction" screen
  // model to keep in sync; the review surface IS AddStockView's existing
  // form, exactly per the ADR.
  const [scanState, setScanState] = useState<'idle' | 'processing' | 'error'>('idle');
  const [scanErrorReason, setScanErrorReason] = useState<SmartStockEntryFailureReason | null>(null);
  // [Smart Stock Entry — Tier 1, input-method expansion] Two separate
  // hidden file inputs, not one — the ONLY difference between them is
  // the `capture` attribute (camera vs. normal file/gallery picker).
  // Both wire to the exact same handleFileSelected below, which is
  // already input-agnostic (it only ever sees a File object) — this is
  // an input-method UI change, not a new pipeline.
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

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
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 3; Specification §12 Case 2, FR-14] Owner's own explicit declaration
  // that this purchase was acquired on supplier credit rather than paid
  // immediately — the only signal that determines whether a Payable is
  // created alongside this purchase. Defaults to false (Case 1, paid
  // immediately) — this feature never assumes credit.
  const [supplierCredit, setSupplierCredit] = useState(false);
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
        // [Restock Observation Amendment v1.0] previousCycleQuantity is
        // never itself stored in the draft (see PurchaseDraftLineItem's
        // own comment) — re-resolve it fresh against current products/
        // batches right after restore, so the field's visibility is
        // always based on live data, not a possibly-stale snapshot.
        setRows(
          purchaseDraft.items
            .map(draftLineItemToRow)
            .map(row => ({
              ...row,
              previousCycleQuantity: resolvePreviousCycleQuantity(row.productName),
            }))
        );
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

    // [Restock Observation Amendment v1.0] See createEmptyRow's own
    // comment — resolved identically here so re-selecting a different
    // existing product mid-form updates the field's availability too.
    const previousCycleQuantity = resolvePreviousCycleQuantity(name);

    // [Supplier-Wording Recognition — Checkpoint 3, Owner-Initiated
    // Declaration, POL-0007 Business Requirement 3] If the owner had
    // typed a WORDING that did not already exactly match any product
    // (genuinely a supplier's own wording, not just re-picking an
    // already-correct name) and then picked an existing product from
    // this very dropdown, that action itself is the owner directly
    // identifying that the wording refers to this product — no
    // system-proposed candidate is required for this authorization
    // (Specification §3a, as corrected by the accepted Terminology
    // Amendment: Add Stock only). Captured here; the actual relationship
    // write happens at finalization once the supplier's identity is
    // resolved (Specification §8) — see handleSubmit.
    const row = rows.find(r => r.id === rowId);
    const typedWording = row?.productName?.trim();
    const typedWordingAlreadyExactMatch =
      !typedWording || products.some(p => p.name.toLowerCase() === typedWording.toLowerCase());

    updateRow(rowId, {
      productName: name,
      costPrice: newCost || undefined,
      sellingPrice: newSell || undefined,
      unit: newUnit || undefined,
      isDropdownOpen: false,
      // Switching products resets any previously-entered observation —
      // it was physically describing the OLD product's prior cycle and
      // must never carry over as if it described the new one.
      previousRemainingQuantity: '',
      previousCycleQuantity,
      pendingSupplierWording:
        typedWording && !typedWordingAlreadyExactMatch && match
          ? {
              wording: typedWording,
              productId: match.id,
              origin: 'owner-initiated',
              conflictCheckProductIds: (row?.supplierWordingCandidates ?? [])
                .map(c => c.productId)
                .filter(id => id !== match.id),
            }
          : undefined,
      supplierWordingCandidates: undefined,
      supplierWordingDeclined: false,
      supplierWordingConflictPending: false,
      supplierWordingDistinguishingInfo: undefined,
    });
  };

  // [Supplier-Wording Recognition — Checkpoint 3] Re-evaluates recognition
  // for a row every time its typed productName changes — called from
  // BOTH the desktop and mobile productName onChange handlers below, so
  // the two layouts never drift out of sync. The actual decision (which
  // of the four recognition states applies) is delegated entirely to the
  // pure, independently-tested resolveSupplierWordingRecognition
  // (supplierWordingRecognition.ts) — this function only translates that
  // decision into React state.
  const applySupplierWordingCheck = (rowId: string, newName: string) => {
    const trimmed = newName.trim();
    const cleared: Partial<StockRowItem> = {
      productName: newName,
      isDropdownOpen: true,
      pendingSupplierWording: undefined,
      supplierWordingCandidates: undefined,
      supplierWordingDeclined: false,
      supplierWordingConflictPending: false,
      supplierWordingDistinguishingInfo: undefined,
    };

    const outcome = resolveSupplierWordingRecognition(trimmed, supplierId, products);

    switch (outcome.type) {
      case 'none':
      case 'no-candidates':
        updateRow(rowId, cleared);
        return;
      case 'reused': {
        const matchedProduct = products.find(p => p.id === outcome.productId);
        if (!matchedProduct) {
          // Defensive only — resolveSupplierWordingRecognition derived
          // this id from the SAME `products` array, so this can't
          // actually diverge; falls back to ordinary behavior if it ever did.
          updateRow(rowId, cleared);
          return;
        }
        updateRow(rowId, {
          ...cleared,
          productName: matchedProduct.name,
          previousCycleQuantity: resolvePreviousCycleQuantity(matchedProduct.name),
          pendingSupplierWording: {
            wording: trimmed,
            productId: matchedProduct.id,
            origin: 'reused',
            conflictCheckProductIds: [],
          },
        });
        return;
      }
      case 'candidates':
        updateRow(rowId, { ...cleared, supplierWordingCandidates: outcome.candidates });
        return;
    }
  };

  const handleConfirmSupplierWordingCandidate = (rowId: string, productId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const matchedProduct = products.find(p => p.id === productId);
    if (!matchedProduct) return;
    const wording = row.productName.trim();
    const previousCycleQuantity = resolvePreviousCycleQuantity(matchedProduct.name);
    updateRow(rowId, {
      productName: matchedProduct.name,
      previousCycleQuantity,
      pendingSupplierWording: {
        wording,
        productId: matchedProduct.id,
        origin: 'confirmed',
        conflictCheckProductIds: (row.supplierWordingCandidates ?? [])
          .map(c => c.productId)
          .filter(id => id !== productId),
      },
      supplierWordingCandidates: undefined,
      supplierWordingDeclined: false,
    });
  };

  // [POL-0007 requirement 6 — no "rejected alias" concept] Declining
  // simply proceeds to the ordinary new-product path (Specification §4)
  // — nothing is recorded about the decline itself. The one exception is
  // the mandatory-distinguishing-information gate (POL-0007,
  // "Conflicting Supplier Wording"): if ANY declined candidate's
  // proposed grounds included an already-confirmed alternative wording
  // (i.e. this exact wording already names a different product), this
  // specific occurrence is the conflict BDR-0013 item 5 describes, and
  // the new product's creation is gated on distinguishing information.
  const handleDeclineSupplierWordingCandidates = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    const hadWordingConflict = (row?.supplierWordingCandidates ?? []).some(c =>
      c.grounds.includes('existing-alternative-wording')
    );
    updateRow(rowId, {
      supplierWordingCandidates: undefined,
      supplierWordingDeclined: true,
      supplierWordingConflictPending: hadWordingConflict,
    });
  };

  // [Smart Stock Entry — Tier 1] Builds one StockRowItem from a single
  // proposed line item. This is the ONLY place scan results turn into
  // row fields — the same shape every other row already has, so nothing
  // downstream (updateRow, handleSubmit, autosave) needs to know this
  // row came from a scan at all.
  //
  // Product matching rule (per governance): the server already decided
  // 'confident' (exact case-insensitive match) or 'no_match' — this
  // function NEVER re-guesses or loosens that decision client-side. A
  // 'confident' match additionally reuses Product Memory's EXISTING
  // prefill behavior (latest batch price/unit) — the exact same logic
  // handleSelectProductForTool already applies for manual selection,
  // not a new prefill path invented for scanning.
  const buildRowFromProposalLineItem = (item: SmartStockEntryLineItemProposal): StockRowItem => {
    let productName = item.productName.value || '';
    let costPrice = item.costPrice.value != null ? String(item.costPrice.value) : '';
    let unit = item.unit.value || (suggestedUnits[0] || 'un');
    const quantity = item.quantity.value != null ? String(item.quantity.value) : '';
    // Selling price is NEVER proposed by the scan (governance's explicit
    // rule) — it is only ever filled from Product Memory's own existing
    // history, exactly as a manual selection would, never invented here.
    let sellingPrice = '';
    let previousCycleQuantity: number | undefined;

    // [Supplier-Wording Recognition — Checkpoint 4] The server's own
    // exact-name match (item.productMatch) has no knowledge of
    // supplier-wording candidates or reuse (Checkpoint 3), which live
    // entirely client-side. resolveScanRowSupplierWording (pure,
    // independently tested — supplierWordingRecognition.ts) decides,
    // from EITHER the server's match or a client-side recognition
    // outcome, which product (if any) this row should be treated as
    // matching — composing the SAME resolveSupplierWordingRecognition
    // manual entry uses, never a second implementation of it.
    const decision = resolveScanRowSupplierWording(
      item.productName.value || '',
      item.productMatch,
      supplierId,
      products
    );
    const pendingSupplierWording = decision.pendingSupplierWording;
    const supplierWordingCandidates = decision.supplierWordingCandidates;

    if (decision.matchedProductId) {
      const matched = products.find(p => p.id === decision.matchedProductId);
      if (matched) {
        // Use the catalog's own canonical name, not the raw OCR text,
        // once matched — identical to what selecting an existing product
        // from the autocomplete (or a manual-entry reuse match) already
        // does. Applies uniformly whether the match came from the
        // server's exact-name check or a client-side reuse match.
        productName = matched.name;
        const productBatches = batches.filter(b => b.productId === matched.id);
        if (productBatches.length > 0) {
          const latest = productBatches[0];
          sellingPrice = String(latest.sellingPrice);
          if (!item.unit.value) unit = latest.unit || unit;
          if (!costPrice) costPrice = String(latest.costPrice);
          previousCycleQuantity = latest.quantity;
        } else {
          if (!costPrice && matched.costPrice != null) costPrice = String(matched.costPrice);
          if (matched.sellingPrice != null) sellingPrice = String(matched.sellingPrice);
        }
      }
    }

    return {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      productName,
      dateEntered: getTodayDateString(),
      quantity,
      unit,
      costPrice,
      sellingPrice,
      isDropdownOpen: false,
      isUnitPopoverOpen: false,
      previousRemainingQuantity: '',
      previousCycleQuantity,
      smartEntrySource: 'ai',
      smartEntryFieldStatus: {
        productName: item.productName.status,
        quantity: item.quantity.status,
        unit: item.unit.status,
        costPrice: item.costPrice.status,
      },
      smartEntryProductMatchStatus: item.productMatch.status,
      pendingSupplierWording,
      supplierWordingCandidates,
    };
  };

  // [Smart Stock Entry — Tier 1] Reads the chosen file, calls the
  // server's extraction route, and — on success — merges the proposal
  // directly into `rows`. This function NEVER writes to purchaseDrafts
  // itself (ADR Decision 2a): it only calls setRows, the exact same
  // state manual typing already mutates, and the existing autosave
  // effect (unchanged) persists the result from there.
  //
  // Any failure (unsupported file, network error, provider unavailable,
  // unreadable document) is handled gracefully — rows are left exactly
  // as they were, and the user can always continue manually. Nothing is
  // ever written to Firestore by this function.
  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file) return;
    setScanState('processing');
    setScanErrorReason(null);

    let base64: string;
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('unreadable'));
            return;
          }
          // Strip the "data:<mime>;base64," prefix — the server expects
          // raw base64 only.
          const commaIndex = result.indexOf(',');
          resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
        };
        reader.onerror = () => reject(new Error('unreadable'));
        reader.readAsDataURL(file);
      });
    } catch {
      setScanState('error');
      setScanErrorReason('unreadable');
      return;
    }

    const result = await scanPurchaseDocument(base64, file.type || 'application/octet-stream');

    if (result.success === false) {
      setScanState('error');
      setScanErrorReason(result.reason);
      return;
    }

    const newRows = result.proposal.lineItems.map(buildRowFromProposalLineItem);
    setRows(prev => {
      // Drop any still-pristine, never-typed-into default row before
      // appending the scan's rows, so a fresh Add Stock screen doesn't
      // end up with one useless empty row alongside the real ones —
      // but never drop a row the user has already started filling in.
      const kept = prev.filter(
        r => r.productName.trim() || r.quantity !== '50' || r.costPrice !== '1.50' || r.sellingPrice !== '3.00'
      );
      return [...kept, ...newRows];
    });

    // [Smart Stock Entry — Tier 1] Supplier/date, when the document
    // clearly contained them — free-text only, never an existing
    // SupplierRecord auto-selected (that remains a separate, explicit
    // user action via the existing supplier autocomplete below).
    if (result.proposal.supplierName.value && !supplierId && !supplierName.trim()) {
      setSupplierName(result.proposal.supplierName.value);
    }
    if (result.proposal.documentDate.value && /^\d{4}-\d{2}-\d{2}$/.test(result.proposal.documentDate.value)) {
      setDate(result.proposal.documentDate.value);
    }

    setScanState('idle');
  };

  // Explicit "reject this scan" — removes only the AI-sourced rows,
  // never anything the user typed manually. Per governance: rejecting
  // the extraction must always fall through cleanly to normal manual
  // Add Stock, never leave the user stuck.
  const handleRejectScan = () => {
    setRows(prev => {
      const remaining = prev.filter(r => r.smartEntrySource !== 'ai');
      return remaining.length > 0 ? remaining : [createEmptyRow('')];
    });
    setScanState('idle');
    setScanErrorReason(null);
  };

  // [Smart Stock Entry — Tier 1] Small, shared status icon for the
  // ✓ Detected / ⚠ Review / — Not found states (BDR-0008's Trust
  // Test) — used by the per-row status strip below. Never a numeric
  // percentage, per the ADR's own explicit instruction against
  // fabricated precision.
  const renderFieldStatusBadge = (label: string, status: 'detected' | 'review' | 'not_found') => (
    <span
      key={label}
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md ${
        status === 'detected'
          ? 'text-emerald-700 bg-emerald-50'
          : status === 'review'
          ? 'text-amber-700 bg-amber-50'
          : 'text-gray-400 bg-gray-50'
      }`}
    >
      {status === 'detected' ? (
        <CheckCircle className="w-3 h-3" />
      ) : status === 'review' ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <MinusCircle className="w-3 h-3" />
      )}
      {label}
    </span>
  );

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

      // [POL-0007 — Conflicting Supplier Wording, mandatory distinguishing
      // information] The new product's creation does not complete until
      // this is provided (Specification §5) — enforced here as an
      // ordinary required-field creation-gate (Rule 8 Finding 9), same
      // pattern as every other row-level validation above.
      if (row.supplierWordingConflictPending && !row.supplierWordingDistinguishingInfo?.trim()) {
        alert(t('addStock.supplierWording.distinguishingInfoRequiredError', { n: i + 1 }));
        return;
      }

      // [Increment B, Checkpoint B1 — Consolidated Specification §8]
      // Defensive re-check, independent of the UI-level queue gating
      // (getCurrentUnresolvedRowId/getRowsToDisplay, below in the
      // render) that normally keeps the Submit button itself from
      // rendering until every row is resolved. Mirrors this file's own
      // established pattern (Product Memory/UOM's unitRelationship is
      // re-validated here too, not merely trusted from what the UI
      // showed) — a still-pending candidate list must never reach
      // addMultipleStockBatches; that would silently create a new
      // product for a wording the owner had not yet actually resolved,
      // exactly the outcome §8/§11's one-at-a-time-then-atomic rule
      // exists to prevent.
      if (row.supplierWordingCandidates && row.supplierWordingCandidates.length > 0) {
        alert(t('addStock.supplierWording.unresolvedCandidatesError', { n: i + 1 }));
        return;
      }

      // [Product Memory / UOM — Increment A, Checkpoint 2b] Built ONLY
      // when no existing product currently matches this row's name —
      // re-checked HERE at the point of use, not merely trusted from
      // whatever the UI section happened to show (the same discipline
      // every other write path from Checkpoint 1 already follows).
      // PURCHASE FACTS ARE NEVER TOUCHED BY THIS: row.unit/quantity/
      // costPrice above are read completely unchanged; this only ever
      // ADDS an optional unitRelationship candidate for a brand-new
      // product to the item being sent to addMultipleStockBatches — see
      // AddStockParams.unitRelationship's own comment (AppContext.tsx,
      // Checkpoint 1) for the backend guarantee that this is never read
      // for an existing product's creation branch.
      let unitRelationship: UnitRelationship | undefined;
      const rowResolvesToExistingProduct = products.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
      if (!rowResolvesToExistingProduct) {
        const sellingUnit = (row.newProductSellingUnit || '').trim();
        const factor = parseFloat(row.newProductSellingUnitFactor || '');
        if (sellingUnit && Number.isFinite(factor) && factor > 0) {
          const candidate: UnitRelationship = {
            units: [
              { unit: row.unit || 'un', factorFromPrevious: 0 },
              { unit: sellingUnit, factorFromPrevious: factor },
            ],
            sellingUnit,
            confirmedAt: new Date().toISOString(),
          };
          if (isValidUnitRelationship(candidate)) {
            unitRelationship = candidate;
          }
        }
      }

      itemsToSave.push({
        productName: trimmedName,
        dateEntered: row.dateEntered,
        quantity: numQty,
        unit: row.unit || 'un',
        costPrice: numCost,
        sellingPrice: numSell,
        // [Restock Observation Amendment v1.0] Blank input and the
        // explicit "I don't know" sentinel are both passed through as
        // "no field at all", never coerced to 0 or forwarded as the
        // literal string "unknown" — AppContext treats their absence
        // as "I don't know" and persists no observation for this line
        // item. Only meaningful when this row is for an existing
        // product with a prior cycle in the first place
        // (row.previousCycleQuantity), which the UI already gates the
        // field's visibility on.
        ...(hasKnownPreviousRemainingInput(row.previousRemainingQuantity)
          ? { previousRemainingQuantity: row.previousRemainingQuantity.trim() }
          : {}),
        // [Supplier-Wording Recognition — Checkpoint 3] A silent reuse
        // (origin 'reused') needs no NEW write at all — already
        // confirmed previously — so it's deliberately excluded here;
        // only a genuinely new relationship (owner-confirmed or
        // owner-initiated) is forwarded to AppContext.
        ...(row.pendingSupplierWording && row.pendingSupplierWording.origin !== 'reused'
          ? {
              pendingSupplierWording: {
                wording: row.pendingSupplierWording.wording,
                provenance:
                  row.pendingSupplierWording.origin === 'owner-initiated'
                    ? ('owner-initiated' as const)
                    : ('system-proposed' as const),
                conflictCheckProductIds: row.pendingSupplierWording.conflictCheckProductIds,
              },
            }
          : {}),
        // [Supplier-Wording Recognition — Checkpoint 5, POL-0007
        // "Conflicting Supplier Wording"] Only ever set alongside the
        // conflict gate validated above — a row reaching this point with
        // supplierWordingConflictPending true is, by construction,
        // creating a genuinely NEW product (the owner declined the
        // conflicting candidate), never one carrying pendingSupplierWording.
        ...(row.supplierWordingConflictPending && row.supplierWordingDistinguishingInfo?.trim()
          ? { distinguishingInfo: row.supplierWordingDistinguishingInfo.trim() }
          : {}),
        // [Product Memory / UOM — Increment A, Checkpoint 2b]
        ...(unitRelationship ? { unitRelationship } : {}),
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
        currentPurchaseEventId,
        supplierCredit
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
      setSupplierCredit(false);
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

  // [Increment B, Checkpoint B1 — Consolidated Specification §8] The
  // one-at-a-time unresolved-product queue. `currentUnresolvedRowId` is
  // the single row (if any) the owner must resolve right now (§8 Step
  // 3); `readyForFinalReview` gates §11's whole-receipt review screen
  // (recognized + newly-resolved rows together, one atomic
  // confirmation) — it stays false, and only the current unresolved
  // row is rendered (rowsToDisplay, used below in place of `rows`),
  // until the queue is empty. This introduces no new matching/
  // candidate-detection logic — it only sequences the already-
  // implemented per-row supplier-wording confirmation UI (Rule 8
  // Finding 6). An ordinary single-row entry with nothing pending is
  // unaffected: rowsToDisplay === rows and readyForFinalReview is true
  // immediately, exactly as before this checkpoint.
  const currentUnresolvedRowId = getCurrentUnresolvedRowId(rows);
  const readyForFinalReview = isReceiptReadyForFinalReview(rows);
  const rowsToDisplay = getRowsToDisplay(rows);
  const currentUnresolvedRowNumber = currentUnresolvedRowId
    ? rows.findIndex((r) => r.id === currentUnresolvedRowId) + 1
    : null;

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
            {/* [Smart Stock Entry — Tier 1] Optional document entry
                point. Always sits alongside manual entry, never
                replaces it — per BDR-0008, a failed/rejected scan must
                fall straight through to the exact same form below with
                zero friction. Two input methods (camera capture, file
                upload) — both converge into the exact same
                handleFileSelected -> existing extraction pipeline
                below; the distinction is input-method only. */}
            <div className="bg-[#FAFBFC] border border-dashed border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
                  <ScanLine className="w-4.5 h-4.5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-[#111827]">{t('addStock.smartEntry.title')}</p>
                  <p className="text-[11px] text-gray-500">{t('addStock.smartEntry.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {rows.some(r => r.smartEntrySource === 'ai') && (
                  <button
                    type="button"
                    onClick={handleRejectScan}
                    className="text-[11.5px] font-semibold text-gray-500 hover:text-rose-600 transition-colors duration-150"
                  >
                    {t('addStock.smartEntry.rejectScan')}
                  </button>
                )}
                {/* Camera capture input — `capture="environment"` is
                    honored by mobile browsers that support it and
                    harmlessly ignored by desktop browsers, which fall
                    back to a normal file dialog (per the request's own
                    "may use camera capture where available" wording). */}
                <input
                  ref={cameraFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    handleFileSelected(file);
                    e.target.value = '';
                  }}
                />
                {/* Upload input — no `capture` attribute, so this always
                    opens the device's normal file/gallery picker,
                    regardless of platform. Same accept list, same
                    handler — the existing extraction pipeline treats
                    both identically once a File reaches
                    handleFileSelected. */}
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    handleFileSelected(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={scanState === 'processing'}
                  onClick={() => cameraFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#0B1F3A] bg-white border border-[#E5E7EB] hover:border-[#D4AF37]/50 rounded-[10px] px-3 py-2 transition-colors duration-150 disabled:opacity-60"
                >
                  {scanState === 'processing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-[#B8952F]" />
                  )}
                  {t('addStock.smartEntry.takePictureButton')}
                </button>
                <button
                  type="button"
                  disabled={scanState === 'processing'}
                  onClick={() => uploadFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#0B1F3A] bg-white border border-[#E5E7EB] hover:border-[#D4AF37]/50 rounded-[10px] px-3 py-2 transition-colors duration-150 disabled:opacity-60"
                >
                  {scanState === 'processing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#B8952F]" />
                  )}
                  {t('addStock.smartEntry.uploadButton')}
                </button>
                {scanState === 'processing' && (
                  <span className="text-[11px] text-gray-500">{t('addStock.smartEntry.processing')}</span>
                )}
              </div>
            </div>

            {/* [Smart Stock Entry — Tier 1] Graceful failure banner.
                Never blocks the form below — manual entry is already
                right there, unaffected. */}
            {scanState === 'error' && scanErrorReason && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
                  <p className="text-[11.5px] leading-relaxed text-amber-800">
                    {t(`addStock.smartEntry.errors.${scanErrorReason}`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setScanState('idle'); setScanErrorReason(null); }}
                  className="text-amber-600 hover:text-amber-800 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
              {/* [Business Worth Evolution — Implementation Authorization,
                  Increment 3; Specification §12 Case 2, FR-14] The only
                  UI control this increment adds to +Stock — an explicit
                  Owner declaration that this purchase was on supplier
                  credit. Unchecked (the default) is Case 1 (paid
                  immediately) — completely unmodified +Stock behavior. */}
              <label className="flex items-center gap-2 text-[12px] text-[#111827] cursor-pointer">
                <input
                  type="checkbox"
                  checked={supplierCredit}
                  onChange={e => setSupplierCredit(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E7EB] text-[#0B1F3A] focus:ring-[#D4AF37]/30"
                />
                {t('addStock.supplier.creditCheckboxLabel')}
              </label>
              <p className="text-[10.5px] text-gray-400">
                {t('addStock.supplier.unspecifiedHint')}
              </p>
            </div>

            {/* [Increment B, Checkpoint B1 — Consolidated Specification
                §8] Unresolved-product progress banner. Shown only while
                the queue is non-empty; below it, only ONE row (the
                current unresolved one) is rendered — never the rest of
                the receipt (§8 Step 3: "the owner sees exactly that one
                line's resolution choice — not the rest of the
                receipt"). Disappears the moment the queue empties and
                the full receipt (§11) is shown for one whole-receipt
                review + one atomic confirmation. */}
            {!readyForFinalReview && rows.length > 1 && (
              <div className="bg-[#FFF8E6] border border-[#D4AF37]/40 rounded-xl px-4 py-3 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#B8952F] shrink-0" strokeWidth={2.25} />
                <p className="text-[11.5px] leading-relaxed text-[#7A5C12] font-medium">
                  {t('addStock.sequencing.resolveBeforeReview', {
                    n: currentUnresolvedRowNumber ?? 0,
                    total: rows.length,
                  })}
                </p>
              </div>
            )}

            {/* COMPACT TABLE */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              {/* Table Header (Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-1.5 items-center px-3 py-2.5 bg-[#FAFBFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wide text-gray-500">
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
                {rowsToDisplay.map((row) => {
                  // [Increment B, Checkpoint B1] `index` below must
                  // reflect the row's TRUE position in the full receipt
                  // (`rows`), never its position within the filtered
                  // `rowsToDisplay` — otherwise the "#N" batch label
                  // would renumber as unresolved rows drop out of the
                  // queue, which would misidentify which physical
                  // receipt line the owner is looking at.
                  const index = rows.findIndex((r) => r.id === row.id);
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
                              onChange={e => applySupplierWordingCheck(row.id, e.target.value)}
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

                      {/* [Smart Stock Entry — Tier 1] Review Extraction
                          status strip — shown ONLY for a row that came
                          from a scan (row.smartEntrySource === 'ai').
                          This is the visible-uncertainty surface BDR-0008
                          §1b's Trust Test requires: every extracted
                          field's ✓/⚠/— state, plus the product-match
                          outcome, spelled out in plain language rather
                          than implied by styling alone. A manually-typed
                          row never shows this — it has nothing to report. */}
                      {row.smartEntrySource === 'ai' && row.smartEntryFieldStatus && (
                        <div className="mt-2 pt-2 border-t border-[#E5E7EB]/70 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <ScanLine className="w-3 h-3 text-[#B8952F] shrink-0" />
                            {renderFieldStatusBadge(t('addStock.smartEntry.fields.product'), row.smartEntryFieldStatus.productName)}
                            {renderFieldStatusBadge(t('addStock.smartEntry.fields.quantity'), row.smartEntryFieldStatus.quantity)}
                            {renderFieldStatusBadge(t('addStock.smartEntry.fields.unit'), row.smartEntryFieldStatus.unit)}
                            {renderFieldStatusBadge(t('addStock.smartEntry.fields.costPrice'), row.smartEntryFieldStatus.costPrice)}
                            {row.smartEntryProductMatchStatus === 'no_match' && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md text-amber-700 bg-amber-50">
                                <AlertTriangle className="w-3 h-3" />
                                {t('addStock.smartEntry.noConfidentMatch')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* [Restock Observation Amendment v1.0] Optional,
                          existing-product-only physical observation.
                          Shown for any existing product with a known
                          prior cycle — never for a brand-new product
                          (row.previousCycleQuantity stays undefined for
                          those), and never required. Spans full width,
                          shared by both the desktop and mobile layouts
                          above/below, so this markup isn't duplicated
                          per breakpoint. */}
                      {row.previousCycleQuantity != null && (
                        <div className="mt-2 pt-2 border-t border-[#E5E7EB]/70">
                          <label className="block type-label mb-1">
                            {t('addStock.restockObservation.label')}
                            <span className="ml-1 text-gray-400 font-normal normal-case">
                              ({t('addStock.restockObservation.optional')})
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder={t('addStock.restockObservation.placeholder')}
                              value={
                                row.previousRemainingQuantity === UNKNOWN_PREVIOUS_REMAINING
                                  ? ''
                                  : row.previousRemainingQuantity
                              }
                              disabled={row.previousRemainingQuantity === UNKNOWN_PREVIOUS_REMAINING}
                              onChange={e =>
                                updateRow(row.id, { previousRemainingQuantity: e.target.value })
                              }
                              className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-1.5 text-[#111827] text-xs transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-mono tabular-nums disabled:opacity-50 disabled:bg-[#F5F7FA]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.id, {
                                  previousRemainingQuantity:
                                    row.previousRemainingQuantity === UNKNOWN_PREVIOUS_REMAINING
                                      ? ''
                                      : UNKNOWN_PREVIOUS_REMAINING,
                                })
                              }
                              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-[10px] border transition-colors duration-150 shrink-0 ${
                                row.previousRemainingQuantity === UNKNOWN_PREVIOUS_REMAINING
                                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#B8952F]'
                                  : 'bg-white border-[#E5E7EB] text-gray-500 hover:text-[#111827] hover:border-gray-300'
                              }`}
                            >
                              {t('addStock.restockObservation.dontKnow')}
                            </button>
                          </div>
                          <p className="mt-1 text-[10.5px] leading-relaxed text-gray-400">
                            {t('addStock.restockObservation.helperText')}
                          </p>
                        </div>
                      )}

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
                              onChange={e => applySupplierWordingCheck(row.id, e.target.value)}
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

                      {/* [Supplier-Wording Recognition — Checkpoint 3]
                          One shared panel for both the desktop and mobile
                          layouts above — POL-0007's Confirmation
                          Experience minimum shape: each candidate shown
                          with, at minimum, its current Product.name;
                          exactly two resolutions; no default action. */}
                      {row.supplierWordingCandidates && row.supplierWordingCandidates.length > 0 && (
                        <div className="mt-2 bg-[#FFFBEA] border border-[#D4AF37]/30 rounded-xl px-3 py-2.5 space-y-2">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#B8952F] shrink-0 mt-[2px]" strokeWidth={2.25} />
                            <div>
                              <p className="text-[11.5px] font-bold text-[#0B1F3A]">
                                {t('addStock.supplierWording.candidateTitle')}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-0.5">
                                {t('addStock.supplierWording.candidateHint')}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {row.supplierWordingCandidates.map(candidate => {
                              const candidateProduct = products.find(p => p.id === candidate.productId);
                              if (!candidateProduct) return null;
                              return (
                                <div
                                  key={candidate.productId}
                                  className="flex items-center justify-between gap-2 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5"
                                >
                                  <span className="text-[12px] font-semibold text-[#111827] truncate">
                                    {candidateProduct.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmSupplierWordingCandidate(row.id, candidate.productId)}
                                    className="shrink-0 text-[11px] font-bold text-white bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 rounded-md px-2.5 py-1 transition-colors duration-150"
                                  >
                                    {t('addStock.supplierWording.confirmButton')}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeclineSupplierWordingCandidates(row.id)}
                            className="text-[11px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150"
                          >
                            {t('addStock.supplierWording.noneOfTheseButton')}
                          </button>
                        </div>
                      )}

                      {row.pendingSupplierWording?.origin === 'reused' && (
                        <div className="mt-2 flex items-start gap-2 bg-[#F0FDF4] border border-emerald-200 rounded-xl px-3 py-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-[1px]" strokeWidth={2.25} />
                          <p className="text-[11px] text-emerald-800 leading-snug">
                            {t('addStock.supplierWording.reusedNotice')}
                          </p>
                        </div>
                      )}

                      {row.supplierWordingConflictPending && (
                        <div className="mt-2 bg-[#FEF2F2] border border-rose-200 rounded-xl px-3 py-2.5 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-[1px]" strokeWidth={2.25} />
                            <p className="text-[11px] text-rose-800 leading-snug">
                              {t('addStock.supplierWording.conflictWarning')}
                            </p>
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-bold text-rose-900 mb-1">
                              {t('addStock.supplierWording.distinguishingInfoLabel')}
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={t('addStock.supplierWording.distinguishingInfoPlaceholder')}
                              value={row.supplierWordingDistinguishingInfo || ''}
                              onChange={e =>
                                updateRow(row.id, { supplierWordingDistinguishingInfo: e.target.value })
                              }
                              className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-[12px] text-[#111827] placeholder-gray-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                            />
                          </div>
                        </div>
                      )}

                      {/* [Product Memory / UOM — Increment A, Checkpoint
                          2b] Shown ONLY for a row that does NOT resolve
                          to an existing product (exactMatchExists,
                          computed per-row above) — never re-shown, never
                          re-asked, for an already-known product (UOM
                          Specification §3 step 5's "never re-run" rule).
                          Strictly separate from the supplier-wording
                          blocks immediately above — identifying which
                          product a wording refers to is not the same
                          question as establishing a brand-new product's
                          unit relationship. Entirely optional: leaving
                          it blank changes nothing from today's behavior. */}
                      {row.productName.trim() && !exactMatchExists && (
                        <UnitRelationshipRow
                          purchaseUnit={row.unit || 'un'}
                          sellingUnit={row.newProductSellingUnit || ''}
                          factor={row.newProductSellingUnitFactor || ''}
                          onChange={(sellingUnit, factor) =>
                            updateRow(row.id, { newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* [Increment B, Checkpoint B1 — Consolidated Specification
                §8/§11] Everything below this point — adding another
                receipt line, the combined totals summary, the
                auto-closing notice, and the final Submit action — is
                part of the WHOLE-RECEIPT review (§11) and must not
                appear until the unresolved queue is empty. This is the
                render-level enforcement of "the full receipt review is
                NOT shown as the final confirmation surface until all
                unresolved products are resolved... once all are
                resolved, the complete receipt is shown, the owner
                confirms once, the entire receipt commits atomically."
                An ordinary receipt with nothing ever unresolved
                (readyForFinalReview true from the start) is completely
                unaffected — this section renders exactly as it did
                before this checkpoint. */}
            {readyForFinalReview && (
              <>
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
                        <span className="text-gray-500 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.totalInvestment')}</span>
                        <span className="font-bold text-[#111827] font-mono tabular-nums">
                          {formatCurrency(totals.totalInvestmentValue, currencySymbol)}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.marketValue')}</span>
                        <span className="font-bold text-[#111827] font-mono tabular-nums">
                          {formatCurrency(totals.totalMarketValue, currencySymbol)}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 uppercase text-[10px] mr-1 font-semibold tracking-wide">{t('addStock.summary.embeddedProfit')}</span>
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
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
